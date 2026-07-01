# Architecture Research

**Domain:** Real-time gamified classroom webapp (single admin + 4-6 team clients, Node.js + Socket.io, in-memory state, phase-based drag/fill-in game with auto-scoring)
**Researched:** 2026-07-01
**Confidence:** MEDIUM (well-established patterns from Socket.io official docs, MDN, nginx.org, and multiple cross-checked community sources; no single project matches this exact combination so synthesis is opinionated)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         BROWSER CLIENTS (LAN)                          │
│  ┌────────────────┐   ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │  Admin Client   │   │ Team 1     │ │ Team 2..N  │ │ (Projector │    │
│  │  (control panel│   │ Client     │ │ Clients    │ │  = Admin   │    │
│  │  + live scores) │   │(action+prev│ │            │ │  screen)   │    │
│  └────────┬────────┘   └─────┬──────┘ └─────┬──────┘ └────────────┘    │
│           │  socket.io-client │              │                         │
├───────────┴──────────────────┴──────────────┴─────────────────────────┤
│                     Nginx (reverse proxy, WS upgrade, TLS)              │
├─────────────────────────────────────────────────────────────────────── │
│                    NODE.JS PROCESS (PM2-managed, single instance)       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    Socket.io Server                              │   │
│  │  namespace "/admin"          namespace "/team" (rooms per team)  │   │
│  └───────────────────────────┬────────────────────────────────────┘   │
│  ┌───────────────────────────┴────────────────────────────────────┐   │
│  │                  Game Session Controller                        │   │
│  │  (single instance — one classroom session at a time)             │   │
│  │  - Phase state machine (lobby→html→css→js→results)                │   │
│  │  - Server-side countdown timer (setInterval, broadcast tick)      │   │
│  │  - Team registry (id → name, socket id, connection status)        │   │
│  └───────┬───────────────────────────┬───────────────────┬─────────┘   │
│          │                           │                   │             │
│  ┌───────┴────────┐   ┌──────────────┴─────────┐  ┌──────┴─────────┐  │
│  │ In-memory Game │   │ Scoring Engine           │  │ Model Page    │  │
│  │ State (per team│   │ (DOM diff, getComputed-  │  │ Definition    │  │
│  │ DOM/CSS/JS repr)│   │  Style compare, event   │  │ (static config│  │
│  │                │   │  binding verification)   │  │  in code)     │  │
│  └────────────────┘   └──────────────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Nginx reverse proxy | TLS termination, HTTP→WS upgrade forwarding, single public entrypoint | `proxy_pass` to `127.0.0.1:PORT` with `Upgrade`/`Connection` headers, long `proxy_read_timeout` |
| Socket.io server | Transport layer, namespace/room routing, connection lifecycle events | One `io` instance; `/admin` namespace for the teacher, default (or `/team`) namespace with one room per team |
| Game Session Controller | Single source of truth for game state; owns the phase state machine and timer; the only thing allowed to mutate state | Plain JS class/module holding one in-memory object graph, no DB |
| Team Client State | Per-team snapshot of what the team has built so far (DOM tree, CSS rule values, JS logic rules) | Plain JS objects keyed by team id, held inside Game Session Controller |
| Scoring Engine | Pure function(s) that compare a team's built page against the Model Page definition and produce a score | Runs server-side (never trust client-reported completion), invoked once at "Finalitzar" |
| Model Page Definition | The canonical target structure/style/behavior teams are trying to reproduce | Hard-coded config object/JSON in the repo (v1: one fixed exercise) |
| Admin Client (browser) | Renders control panel, sends control commands, displays live team progress | Vanilla JS/HTML/CSS or lightweight framework; talks only through `/admin` namespace |
| Team Client (browser) | Renders phase-appropriate action panel (drag/drop, sliders, rule builder) + live iframe preview | Vanilla JS; the iframe is a sandboxed `srcdoc` render of the team's current DOM/CSS/JS state, entirely reconstructed by the server-known state (not by executing team-authored free-text) |

## Recommended Project Structure

```
server/
├── index.js                 # bootstrap: http server, nginx-facing port, PM2 entry
├── socket/
│   ├── adminNamespace.js    # /admin socket handlers (start phase, pause, +1min, finish)
│   └── teamNamespace.js     # team socket handlers (join, action events, reconnect)
├── game/
│   ├── GameSession.js       # the state machine: phase transitions, timer, team registry
│   ├── phases.js            # phase definitions/order/config (durations, allowed actions)
│   └── teamState.js         # per-team state shape + mutation helpers
├── scoring/
│   ├── scoreHtml.js         # DOM tree diff vs model
│   ├── scoreCss.js          # getComputedStyle comparison vs model
│   ├── scoreJs.js           # event-binding + action verification vs model
│   └── index.js             # aggregate percentage + ranking
├── content/
│   └── modelPage.js         # the fixed exercise: target HTML/CSS/JS definition
└── package.json

public/
├── admin/                   # admin control panel SPA (vanilla or lightweight)
├── team/                    # team client SPA: action panel + iframe preview
└── shared/                  # shared constants, socket event names

deploy/
├── ecosystem.config.js      # PM2 process config
└── nginx.conf.sample        # reverse proxy config template
```

### Structure Rationale

- **`game/` is isolated from `socket/`:** Socket handlers only translate wire events into calls on `GameSession`; they never contain game logic directly. This means the state machine and timer can be unit-tested without spinning up Socket.io at all.
- **`scoring/` is pure and isolated from both:** scoring functions take (teamState, modelPage) → score and have no socket/timer dependency, so they can be tested in isolation against fixtures before wiring them into the "Finalitzar" flow.
- **`content/modelPage.js` is a single hard-coded module (per Out of Scope: no editor UI in v1):** keeping it as one file/object makes the "1 exercici fix" decision explicit and trivially swappable later without inventing a config system prematurely.
- **`public/admin/` and `public/team/` are separate bundles:** admin and team have very different UIs and no reason to ship one's code to the other's browser; this also naturally maps to the two Socket.io namespaces.

## Architectural Patterns

### Pattern 1: Server-Authoritative State Machine (single session)

**What:** The server owns one `GameSession` object representing the entire classroom game (phase, timer, all teams' progress). All client actions are *intents* sent to the server; the server validates/applies them and *broadcasts the resulting state*, never trusting a client's local computation of "my score" or "my current phase."
**When to use:** Always, for this project — it directly satisfies the "F5 refresh must restore exact state" and "auto-scoring must be trustworthy" requirements. A client-authoritative model would let a team fake completion or manipulate their own score.
**Trade-offs:** Slightly more server code (server must model every state transition), but eliminates an entire class of cheating/desync bugs. For 4-6 teams this has zero performance cost — it's the right level of complexity, not overkill (frameworks like Colyseus would be overkill for a single fixed room).

**Example:**
```javascript
// game/GameSession.js
class GameSession {
  constructor(modelPage) {
    this.phase = 'lobby'; // lobby | html | css | js | results
    this.teams = new Map(); // teamId -> { name, socketId, connected, state }
    this.timer = null;
    this.modelPage = modelPage;
  }

  startPhase(phaseName, durationSec) {
    this.phase = phaseName;
    this.startTimer(durationSec);
    this.broadcast('phase:changed', this.getPublicState());
  }

  applyTeamAction(teamId, action) {
    const team = this.teams.get(teamId);
    if (!team || this.phase === 'lobby' || this.phase === 'results') return;
    // mutate team.state based on action, validated against current phase's allowed actions
    this.broadcastToTeam(teamId, 'state:update', team.state);
    this.broadcastToAdmin('team:progress', { teamId, summary: summarize(team.state) });
  }
}
```

### Pattern 2: Namespace-per-role, Room-per-team

**What:** Use two Socket.io namespaces (`/admin`, default/`/team`) to hard-separate the teacher's control channel from student channels, and one Socket.io *room* per team inside the team namespace so team-specific broadcasts (their own state updates) never leak to other teams.
**When to use:** Always here — it maps directly onto the two real actors (1 admin, N teams) and gives free isolation: a bug in team-event handling cannot accidentally emit to the admin namespace, and `io.to(teamRoomId).emit(...)` cannot leak to other teams.
**Trade-offs:** None significant at this scale; the only cost is naming discipline (team room id must equal team id consistently).

**Example:**
```javascript
const adminNsp = io.of('/admin');
const teamNsp = io.of('/team');

teamNsp.on('connection', (socket) => {
  const teamId = socket.handshake.auth.teamId; // from localStorage-persisted token, no real auth
  socket.join(teamId); // room = teamId
  socket.on('action', (payload) => gameSession.applyTeamAction(teamId, payload));
});

adminNsp.on('connection', (socket) => {
  socket.on('startPhase', ({ phase, durationSec }) => gameSession.startPhase(phase, durationSec));
  socket.on('pauseTimer', () => gameSession.pauseTimer());
  socket.on('addMinute', () => gameSession.addTime(60));
});
```

### Pattern 3: Identity-without-auth via persisted client token + server-side reconnection mapping

**What:** Since there's no user login (Out of Scope), give each team browser a random token generated on first load and stored in `localStorage`. On connect/reconnect, the client sends this token as `handshake.auth.teamId` (or a server-issued team-token after the admin registers the team name). The server's `GameSession.teams` map is keyed by this stable token, not by `socket.id` (which changes on every reconnect). On disconnect, mark `team.connected = false` but *keep the team's state*; on reconnect with the same token, rejoin the room and immediately push the full current state back down.
**When to use:** This is the core mechanism for the "F5 must restore exact state" requirement. Socket.io's built-in Connection State Recovery (v4+) is a *complementary* optimization for brief network blips but should not be relied on alone — it is scoped to the socket transport layer, has a bounded recovery window, and is wiped on server restart. The explicit token+state-map approach survives everything short of a full server restart (which is an accepted risk per Out of Scope: no persistence).
**Trade-offs:** Slightly more code than trusting Socket.io's native recovery, but it is fully within the app's control, testable, and doesn't silently fail after `maxDisconnectionDuration` expires (which would otherwise strand a team with no state on a slow reconnect, e.g., a stuck Windows lab machine).

**Example:**
```javascript
// team client, on load:
let teamToken = localStorage.getItem('teamToken');
if (!teamToken) {
  teamToken = crypto.randomUUID();
  localStorage.setItem('teamToken', teamToken);
}
const socket = io('/team', { auth: { teamToken } });

// server:
teamNsp.on('connection', (socket) => {
  const { teamToken } = socket.handshake.auth;
  const team = gameSession.teams.get(teamToken) ?? gameSession.registerPendingTeam(teamToken);
  team.connected = true;
  socket.join(teamToken);
  socket.emit('state:full', gameSession.getStateFor(teamToken)); // full resync on every (re)connect
});
```

## Data Flow

### Control Flow (Admin → Teams)

```
Admin clicks "Start Phase 2 / +1 min / Pause"
    ↓
Admin client emits socket event on /admin namespace
    ↓
GameSession Controller validates + mutates central state (phase, timer)
    ↓
Broadcast to ALL team rooms + admin: phase:changed / timer:tick / timer:paused
    ↓
Every team client re-renders action panel + timer UI from broadcast payload
```

### Action Flow (Team → Server → Team's own preview)

```
Student drags a block / drags a slider / builds a rule
    ↓
Team client emits 'action' event with structured payload (never raw code)
    ↓
Server validates against current phase + applies to that team's in-memory state
    ↓
Server reconstructs that team's DOM/CSS/JS representation → serializes to HTML string
    ↓
Server emits 'state:update' back to that team's room only
    ↓
Team client injects the HTML string into <iframe sandbox="allow-scripts" srcdoc="...">
    ↓
(separately) Server emits a lightweight progress summary to /admin for the status overview
```

### Scoring Flow (Admin → Results)

```
Admin clicks "Finalitzar i Mostrar Resultats"
    ↓
GameSession transitions phase → 'results', stops timer
    ↓
For each team: Scoring Engine runs scoreHtml + scoreCss + scoreJs against Model Page
    ↓
Aggregate percentage + ranking computed server-side
    ↓
Broadcast 'results:final' to admin + all teams with final scores/ranking
```

### Key Data Flows

1. **State is always server → client, never client → client.** Teams never see each other's in-progress state; only the admin sees an aggregated progress overview. This keeps the "one source of truth" property and prevents any team from inferring the model answer by inspecting another team's DOM.
2. **The live preview iframe is a *rendering* of server-confirmed state, not a sandbox where the student's raw code executes freely.** Because there's no free-text code entry (Out of Scope), the server can safely reconstruct the exact HTML to preview after every action — this is a meaningfully different (and easier/safer) case than a general "run untrusted student JS" sandbox.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 4-6 teams, 1 classroom (this project) | Single Node process, single in-memory `GameSession`, no DB, no clustering. This is the entire target scope — do not build for more. |
| Multiple simultaneous classrooms (hypothetical future) | Would need a `Map<sessionId, GameSession>` and an admin "create session" flow, plus Socket.io namespace/room keyed by session id — not needed for v1 per PROJECT.md (single fixed exercise, single session) |
| Beyond one VPS | Would require a Socket.io adapter (Redis) for cross-instance broadcast and sticky sessions at the load balancer — explicitly out of scope; flag only if a future milestone adds multi-classroom concurrent use |

### Scaling Priorities

1. **Not a real concern at this scale.** The realistic "first bottleneck" is not load, it's *robustness of a single 15-20 minute session* — i.e., a Windows lab machine reconnecting, or the teacher's laptop reloading the admin page. Architecture should optimize for **fast full-state resync on reconnect**, not for concurrent throughput.
2. **Second-order concern:** if the classroom Wi-Fi is flaky, Socket.io's automatic reconnection + the explicit token-based state recovery (Pattern 3) matters far more than any horizontal scaling concern.

## Anti-Patterns

### Anti-Pattern 1: Trusting the client-reported score or client-reported "I finished phase X"

**What people do:** Compute the score or completion status in the browser and just send the final number to the server.
**Why it's wrong:** Any student (or accidental DevTools poke) can then claim 100% instantly; also breaks the "server recovers team state exactly on reconnect" requirement because the source of truth would be split between client and server.
**Do this instead:** Server holds the only copy of team state and runs all scoring; client only sends granular action intents ("dropped block X into slot Y", "set color-picker value Z").

### Anti-Pattern 2: Letting the team's iframe execute genuinely arbitrary/free-typed script

**What people do:** Treat the "JS phase" like a general code playground (Monaco editor + `eval`/`new Function` on raw student text) and sandbox it like CodePen/JSFiddle.
**Why it's wrong:** This project explicitly excludes free-text code (Out of Scope) specifically to avoid syntax-error frustration; building general-purpose arbitrary-code sandboxing (with all its escape-vector concerns) would be solving a harder, unnecessary problem. It would also reintroduce the exact frustration/error surface the pedagogy is designed to avoid.
**Do this instead:** The "JS phase" produces a structured rule ("when click on #button → for element .box → do addClass('active')"); the server (or client, deterministically, since it's not truly arbitrary) compiles that rule into a small fixed snippet of generated JS that is embedded in the `srcdoc` alongside the reconstructed HTML/CSS. Still use `sandbox="allow-scripts"` (without `allow-same-origin`) on the iframe as defense-in-depth, but the content being sandboxed is app-generated, not student-typed.

### Anti-Pattern 3: One `GameSession` mixed directly into Socket.io handlers

**What people do:** Put `if (this.phase === 'html') { ... }` logic and timer `setInterval` calls directly inside `socket.on('event', ...)` callbacks.
**Why it's wrong:** Makes the state machine untestable without a running Socket.io server, and makes it easy to accidentally scope a mutation to only the currently-connected socket instead of the shared session — a classic source of "works for the first team, breaks for the rest" bugs.
**Do this instead:** Keep `GameSession` as a plain, socket-agnostic class (Pattern 1) with an internal `EventEmitter` or explicit broadcast callback list; socket handlers are a thin translation layer only.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Nginx (reverse proxy) | `proxy_pass` to the Node process on localhost, with `Upgrade`/`Connection` headers forwarded and long `proxy_read_timeout`/`proxy_send_timeout` (e.g. 86400s) so idle WS/long-poll connections aren't killed by nginx's 60s default | No sticky-session (`ip_hash`) needed at single-process scale; only relevant if PM2 cluster mode is ever introduced |
| PM2 (process manager) | `pm2 start ecosystem.config.js`, `pm2 startup` + `pm2 save` for boot persistence | Chosen over bare systemd for this project because of the operational convenience (`pm2 logs`, `pm2 monit`, quick restart) during live classroom sessions where fast diagnosis matters more than shaving process overhead; systemd is a reasonable simpler alternative if fewer dependencies are preferred |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Admin client ↔ Server | Socket.io `/admin` namespace, small imperative event set (`startPhase`, `pauseTimer`, `addMinute`, `finish`) plus inbound broadcasts (`phase:changed`, `timer:tick`, `team:progress`) | Admin never receives another team's raw state, only summarized progress |
| Team client ↔ Server | Socket.io team room (one per team), `action` events in, `state:update`/`state:full` events out | `state:full` is sent on every (re)connect regardless of whether Socket.io's native Connection State Recovery kicked in, to guarantee correctness |
| GameSession ↔ Scoring Engine | Direct in-process function calls (`scoreTeam(team.state, modelPage)`), no socket/network hop | Scoring only needs to run once per team at "Finalitzar", not per-action, so it stays out of the hot broadcast path |
| Server ↔ Team iframe preview | One-way: server-confirmed state → serialized HTML string → `iframe.srcdoc` | Iframe uses `sandbox="allow-scripts"` without `allow-same-origin`; no `postMessage` channel needed back from iframe to parent since the iframe never needs to report anything (all state changes originate from the action panel, not the preview itself) |

## Suggested Build Order (dependency-driven)

1. **Socket.io skeleton: namespaces + rooms + connection/reconnection with token identity** — everything else depends on having a working admin↔team channel and knowing which team a message belongs to.
2. **GameSession state machine (phase transitions + server-side timer with pause/+time), socket-agnostic and unit-testable** — the core authority; UI and scoring both consume its state.
3. **Admin control panel UI wired to GameSession** (start phase, pause/+1min, team registry, progress overview) — validates the state machine end-to-end from the control side before building the more complex team UI.
4. **Team client shell: action panel scaffold + iframe preview wired to `state:update`/`state:full`** — proves the reconnect/full-resync flow (F5 test) before building phase-specific interaction widgets.
5. **Phase 1 (HTML drag&drop), Phase 2 (CSS fill-in), Phase 3 (JS rule builder)** built one at a time against the same action→state→preview pipeline — each is a vertical slice reusing the same wiring from step 4.
6. **Scoring Engine (HTML DOM diff → CSS getComputedStyle → JS event/action verification) against the fixed Model Page** — can be developed and unit-tested independently once team state shapes from step 5 are stable, then wired to the admin's "Finalitzar" button.
7. **Nginx + PM2 production deployment config** — last, since it only matters once the app works locally; but WS-upgrade behavior should be smoke-tested behind nginx before the first real classroom run, not left until the day of the trial.

## Sources

- [Rooms | Socket.IO](https://socket.io/docs/v3/rooms/) — official docs, room semantics
- [Namespaces | Socket.IO](https://socket.io/docs/v3/namespaces/) — official docs, namespace vs room usage
- [Connection state recovery | Socket.IO](https://socket.io/docs/v4/connection-state-recovery) — official docs on built-in reconnection state recovery, its config and limits
- [Behind a reverse proxy | Socket.IO](https://socket.io/docs/v3/reverse-proxy/) — official guidance on nginx/reverse proxy setup
- [WebSocket proxying — nginx.org](https://nginx.org/en/docs/http/websocket.html) — official nginx docs on `Upgrade`/`Connection` header forwarding
- [NGINX WebSocket Proxy: HTTP Upgrade & WSS Guide](https://www.getpagespeed.com/server-setup/nginx/nginx-websocket-proxy) — practical config example (timeouts, buffering)
- [HTMLIFrameElement: srcdoc — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc) — srcdoc security notes
- [`<iframe>` — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) — sandbox attribute values and their effects
- [Building a Secure Code Sandbox: iframe isolation and postMessage](https://medium.com/@muyiwamighty/building-a-secure-code-sandbox-what-i-learned-about-iframe-isolation-and-postmessage-a6e1c45966df) — practical sandboxing lessons, cross-checked against MDN
- [A scalable, realtime quiz framework to build EdTech apps — Ably](https://ably.com/blog/a-scalable-realtime-quiz-framework-to-build-edtech-apps) — server-authoritative pattern for classroom-scale realtime apps
- [Colyseus — Multiplayer Framework for Node.js](https://colyseus.io/) — reference for server-authoritative state-sync pattern (used here only as a pattern reference, not as a recommended dependency at this project's scale)
- [Architecture of a Node.js multiplayer game — Michał Męciński](https://medium.com/@MichalMecinski/architecture-of-a-node-js-multiplayer-game-a9365356cb9) — server-as-state-machine framing
- [PM2 vs systemd process manager comparison](https://oxmgr.empellio.com/blog/process-manager-comparison) — cross-checked against DigitalOcean's PM2 tutorial and a systemd-vs-PM2 community writeup

---
*Architecture research for: Real-time gamified classroom webapp (Node.js + Socket.io)*
*Researched: 2026-07-01*
