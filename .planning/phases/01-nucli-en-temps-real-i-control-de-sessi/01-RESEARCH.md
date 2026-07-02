# Phase 1: Nucli en temps real i control de sessió - Research

**Researched:** 2026-07-02
**Domain:** Real-time authoritative game-state server (Node.js + Socket.io), persistent client identity across reconnects, server-authoritative countdown timer, Vite multi-page frontend build
**Confidence:** MEDIUM (stack is locked and well-documented; specific game-shape event protocol and state model are this research's own synthesis, not lifted verbatim from a single source)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Entrada i identitat d'equips**
- **D-01:** Model d'entrada = pre-registre + tria de llista. L'admin escriu els noms dels 4-6 equips al panell abans de començar; cada PC obre l'app i tria de la llista quin equip és. No hi ha codis PIN ni URLs per repartir. (CORE-02, ADMIN-01)
- **D-02:** En triar equip, es persisteix un token de sessió al localStorage, mai lligat al `socket.id`. La reconnexió (F5, caiguda de xarxa) reassocia el PC al seu equip automàticament via el token, sense tornar a demanar la tria. (CORE-02, CORE-03)
- **D-03:** Bloqueig fort d'equips: un cop un PC agafa un equip, aquest desapareix de la llista de tria per als altres PCs. Evita duplicats de soca-rel.
- **D-04:** Sense alliberament manual d'equips a la v1. Si un PC mor definitivament (cas assumit com a rar, màquines idèntiques), es reinicia la sessió. No s'afegeix cap acció "Alliberar equip" al panell.

**Estats de la pantalla d'equip**
- **D-05:** Abans que l'admin iniciï la primera fase, cada equip veu una pantalla d'espera dedicada a pantalla completa (nom de l'equip + "Connectat ✓, esperant el professor"). El layout split només apareix quan arrenca la fase.
- **D-06:** Entre fases, la pantalla d'equip mostra un interstici breu ("Ara: Fase CSS", ~1-2s) abans d'activar el nou panell.

**Model de fase i control de l'admin**
- **D-07:** La fase és un estat global i únic per a tota la sessió, no per equip. L'admin mou tots els equips a la mateixa fase alhora (lockstep). (CORE-05)
- **D-08:** El card de cada equip a la graella de l'admin mostra: estat de connexió (connectat/desconnectat, color+icona) i progrés dins la fase actual. El progrés no té contingut real a la Fase 1 però es reserva l'espai al disseny del card per no refer-lo a la Fase 2. (ADMIN-05)
- **D-09:** Resync forçat = recàrrega completa de la pàgina del client. L'admin prem "Resync" sobre un equip penjat i el seu PC recarrega sencer, recuperant l'estat des del servidor via token. (ADMIN-06)

**Timer i transicions**
- **D-10:** El timer és autoritatiu al servidor (timestamp absolut de fi de fase) i es mostra sincronitzat a totes les pantalles. (CORE-04)
- **D-11:** A zero, els panells d'equip es congelen (la feina queda "tal com està") però NO es canvia de fase automàticament: l'admin sempre prem "Següent fase" per avançar. Resol la contradicció entre PROJECT.md i CORE-05 a favor de CORE-05.
- **D-12:** Pausa/represa i "+1 minut" es reflecteixen a l'instant a totes les pantalles alhora, coherent amb el timer autoritatiu al servidor. (ADMIN-03, ADMIN-04)

### Claude's Discretion
- Senyalització visual d'urgència del timer als últims segons (canvi de color, pols, etc.): a criteri d'UI/planner. Ha de respectar "iconogràfic, text mínim" (UX-01). *(Resolved by UI-SPEC: normal >60s = primary text; warning ≤60s = amber; critical ≤10s = red + gentle pulse, `prefers-reduced-motion` disables pulse.)*
- Patró concret de reconnexió (ús de `connectionStateRecovery` de Socket.io vs. resync explícit de l'estat complet): a criteri del researcher/planner, sempre que satisfaci CORE-03 sense intervenció manual. *(Resolved by this research: use BOTH, layered — see Architecture Patterns 1 & 2.)*
- Mecànica exacta del "progrés dins la fase" com a mètrica: es reserva l'espai al card però la definició concreta arriba amb el contingut de joc (Fase 2+). *(Left deferred — see Open Questions #2.)*

### Deferred Ideas (OUT OF SCOPE)
None — la discussió es va mantenir dins l'abast de la Fase 1. Les capacitats de joc, puntuació i desplegament ja tenen les seves pròpies fases al roadmap.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|--------------------|
| CORE-01 | El servidor manté l'estat autoritatiu de la partida en memòria (fase, timer, estat de cada equip); els clients només envien intents d'acció | Architectural Responsibility Map; recommended in-memory `gameState` shape in Architecture Patterns / Recommended Project Structure (`server/gameState.js`); event protocol enforces intent-only client emits (Code Examples). |
| CORE-02 | Cada equip s'identifica amb un token de sessió persistent (localStorage), mai lligat al `socket.id` | Pattern 1 (session-token reconnection) — full code example with `sessionStore` Map + `handshake.auth.token`. |
| CORE-03 | Un equip que refresca la pàgina o reconnecta recupera exactament el seu estat | Patterns 1 + 2 layered (session-token + `connectionStateRecovery`), plus `session:full-state` fallback event; Pitfall 2 explains why both are needed. |
| CORE-04 | El timer global és autoritatiu al servidor (timestamp absolut) i es mostra sincronitzat a totes les pantalles | Pattern 3 (absolute end-timestamp timer) — full server + client code examples. |
| CORE-05 | Les transicions de fase les força l'admin i es propaguen immediatament a tots els equips | Architectural Responsibility Map (admin control commands tier); event protocol `admin:next-phase`; D-07 lockstep model reaffirmed in Anti-Patterns. |
| ADMIN-01 | L'admin pot registrar els noms de 4-6 equips a l'inici de la sessió | Event protocol `admin:register-teams`; D-01 pre-registration model. |
| ADMIN-02 | L'admin pot iniciar cada fase amb un compte enrere global | Event protocol `admin:start-phase`; Pattern 3 `startPhase()`. |
| ADMIN-03 | L'admin pot pausar i reprendre el timer | Pattern 3 `pauseTimer()`/`resumeTimer()`; event protocol `admin:timer-pause`/`admin:timer-resume`. |
| ADMIN-04 | L'admin pot sumar +1 minut al timer en marxa | Pattern 3 `extendTimer()`; event protocol `admin:timer-extend`. |
| ADMIN-05 | L'admin veu d'un cop d'ull l'estat, progrés i connexió de tots els equips | `session:full-state` payload shape includes `teams: [{id,name,connected,progress}]`; D-08 progress placeholder addressed in Open Questions #2. |
| ADMIN-06 | L'admin pot forçar un resync d'un equip concret penjat | Event protocol `admin:force-resync` (targeted to `team:<id>` room only) → client `location.reload()` per D-09. |
| GAME-01 | La pantalla d'equip està dividida: panell d'acció a l'esquerra, preview a la dreta | Architectural Responsibility Map (preview rendering = Browser/Client tier); UI-SPEC Layout Contract governs exact split, not this research. |
| GAME-02 | La preview es re-renderitza en temps real dins un iframe aïllat (sandbox) | Architectural Responsibility Map; `srcdoc` sandbox shell noted as Phase 1 scope (empty shell, populated from Phase 2), DOMPurify flagged for that future work in Supporting Libraries. |
| UX-01 | Tota la interfície usa iconografia clara amb text reduït al mínim | Lucide icon package in Standard Stack/Supporting; timer urgency signalling resolved via UI-SPEC (icon/color-only, no text). |
| UX-02 | Cada fase té una semàntica visual consistent (codificació de color HTML/CSS/JS) | Out of direct scope for this research (owned by UI-SPEC's `--phase-html/css/js` tokens); noted so planner cross-references UI-SPEC, not duplicated here. |
</phase_requirements>

## Summary

Phase 1 is a real-time synchronization problem with two distinct identity concerns that must not be conflated: **team identity** (who is this browser tab, across F5/reconnect/tomorrow) and **socket identity** (which live TCP/WS connection is currently open). Socket.io ships two separate, complementary mechanisms for these: a custom **session-token pattern** (server-side session store keyed by a token the client persists in localStorage and resends via `socket.handshake.auth`) for team identity, and the built-in **`connectionStateRecovery`** feature for short-gap socket-level recovery (missed packets, room membership, `socket.data`) during brief network blips. CONTEXT.md correctly separates these as D-02 (token = team identity, never bound to `socket.id`) and leaves the "exact reconnection pattern" as Claude's discretion — this research resolves that discretion: **use both, layered**, because they solve different problems at different time scales.

The timer must be **absolute-end-timestamp based** (`phaseEndsAt` epoch ms), broadcast only on state-change events (start/pause/resume/+1min), never ticked every second from the server. Clients compute `remaining = phaseEndsAt - Date.now()` locally on a fast local interval — this is the industry-standard pattern for authoritative countdowns because it self-corrects for network latency/clock drift and requires zero special-case logic on reconnect (a reconnecting client just re-derives the same countdown from the same timestamp it would get from a normal state broadcast).

The single biggest operational risk in this stack combination is not Socket.io itself but the **Vite dev-server / Socket.io WebSocket-upgrade proxy boundary** — this is the most common way self-hosted Socket.io + separate frontend dev-server setups silently degrade to HTTP long-polling during development (and, per `.claude/CLAUDE.md`, the equivalent Nginx misconfiguration is the most common way this breaks in production too, though that's Phase 5's concern). Get `server.proxy['/socket.io'] = { target, ws: true }` right early and validate it visibly (browser Network tab shows a `101 Switching Protocols` request, not repeating XHR polling requests).

**Primary recommendation:** In-memory session store (`Map<token, TeamState>`) + Socket.io session-token reconnection pattern (industry standard from Socket.io's own official tutorial) layered with `connectionStateRecovery` for socket-level packet/room recovery, absolute-timestamp server-authoritative timer broadcast only on change, one Socket.io room per team + a shared `admin` room, and a single `session:full-state` event that both drives the initial screen render and IS the D-09 forced-resync payload (the client's full reload just re-requests it).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Team session identity (token issuance, lookup, reassociation) | API / Backend | Browser / Client (localStorage persistence) | Server is the source of truth for which token maps to which team; client only carries the token, never decides identity. |
| Authoritative game state (phase, timer, team roster, connection status) | API / Backend | — | CORE-01 requires all state to live server-side in memory; clients never compute or store canonical state, only render it. |
| Timer computation & broadcast | API / Backend | Browser / Client (local countdown rendering) | Server owns `phaseEndsAt`; each client independently derives the visible countdown from that one shared timestamp — division of labor keeps the wire protocol tiny (no per-second ticks). |
| Admin control commands (start/pause/resume/+1min/next-phase/resync) | API / Backend (validates + mutates state) | Browser / Client (Admin UI emits intents) | Server must re-validate every command server-side (never trust a client-side "I am admin" flag) — this is also a security control, see Security Domain below. |
| Connection recovery (short gaps) | API / Backend (Socket.io `connectionStateRecovery`) | Browser / Client (auto-handled by socket.io-client) | Built-in feature at the Socket.io transport layer; no app code needed beyond enabling it. |
| Full-state resync (long gaps, F5, forced resync) | API / Backend (serves `session:full-state`) | Browser / Client (requests it on `connect`, or via full reload per D-09) | This is the app-level fallback CONTEXT.md's "Claude's discretion" note explicitly calls for alongside `connectionStateRecovery`. |
| Live preview rendering (iframe `srcdoc`, sandboxed) | Browser / Client | — | GAME-02 preview logic is pure client-side DOM/iframe work; server never renders HTML, it only stores/forwards the data teams have selected (populated from Phase 2 onward). |
| Static asset serving (built `admin.html`/`client.html`, JS/CSS bundles) | API / Backend (Express `static`) | — | No CDN tier at this project's scale (single VPS, 4-6 teams); Express's `express.static` middleware is the whole "CDN" this app needs. |
| Session/game state persistence | Database / Storage (represented by in-memory `Map`s, no DB process) | — | Explicitly out of scope per REQUIREMENTS.md — the "storage tier" here is a JS object living in the Node process's memory, scoped to process lifetime. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| socket.io | 4.8.3 `[VERIFIED: npm registry]` | Real-time bidirectional server↔client transport, rooms, `connectionStateRecovery` | Already locked in `.claude/CLAUDE.md`; confirmed current on npm registry, 15M weekly downloads, no postinstall script, official repo `github.com/socketio/socket.io`. |
| socket.io-client | 4.8.3 `[VERIFIED: npm registry]` | Browser-side Socket.io client, bundled via Vite | Must match major.minor of server; 4.8.3 confirmed current, same repo/org as server package. |
| express | 4.22.2 `[VERIFIED: npm registry]` | Thin HTTP server for Socket.io's `http.Server` + static file serving | `.claude/CLAUDE.md` explicitly locks Express **4.x**, not 5.x (5.2.1 is npm's current "latest" tag, but the stack decision predates/overrides that — do not upgrade without discussion, see State of the Art below). 4.22.2 is the newest 4.x patch, 109M weekly downloads. |
| vite | 7.3.6 `[VERIFIED: npm registry]` (dev + build tool only, not a runtime dependency) | Dev server + build for two HTML entry points (`admin.html`, `client.html`) | `.claude/CLAUDE.md` explicitly prefers the 7.3.x line over bleeding-edge 8.x for production stability; 7.3.6 is the newest 7.x patch. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide | 1.23.0 `[ASSUMED — package-legitimacy flagged SUS, see audit below]` | SVG icon set for UX-01 "iconography over text" | Import individual icons (tree-shakeable) via `createElement()` or the `@lucide/icons` sibling package; used in both Admin and Team screens per UI-SPEC. |
| @fontsource/inter | latest (confirmed on registry, 1.75M weekly downloads) `[VERIFIED: npm registry]` | Self-hosted Inter font per UI-SPEC (no CDN, `font-display: swap`) | Bundle via Vite import in the shared `tokens.css`/entry JS; avoids a Google Fonts CDN network dependency during a live classroom session. |
| dompurify | 3.4.11 (Phase 2+ concern, not installed this phase) `[ASSUMED]` | Defense-in-depth HTML sanitization before injecting into preview `srcdoc` | Not needed until Phase 2 populates real block content into the preview pipeline — Phase 1's `srcdoc` is an empty shell. Listed here only so the planner doesn't accidentally install it early or forget it's coming. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `connectionStateRecovery` + session-token pattern (layered) | Session-token pattern alone (skip `connectionStateRecovery`) | Simpler mental model, but loses automatic re-delivery of missed packets during brief blips (e.g., admin pauses timer during the 2-3s a team's WiFi hiccups) — team would only catch up on the next full-state broadcast instead of instantly. Not recommended: the built-in feature is free, already in the locked stack doc, and requires ~3 lines of config. |
| Absolute end-timestamp timer | Server ticks every second and broadcasts remaining-seconds | Naive but common mistake: creates 1 message/sec × (teams+admin) sockets of pure waste, and a reconnecting client has to wait for the next tick instead of instantly deriving state from one broadcast. Rejected. |
| Express 4.x static serving | Fastify / raw `http.createServer` | Both viable at this scale but contradict the already-locked `.claude/CLAUDE.md` stack decision; not re-litigated here. |

**Installation:**
```bash
npm install express@4.22.2 socket.io@4.8.3
npm install socket.io-client lucide @fontsource/inter
npm install --save-dev vite@7.3.6
```

**Version verification:** confirmed via `npm view <pkg> version` and `npm view <pkg>@<major> version` against the live npm registry on 2026-07-02 (see Package Legitimacy Audit for full signal detail). Training-data version numbers were NOT trusted directly — every version cited above was re-checked this session.

## Package Legitimacy Audit

| Package | Registry | Age Signal | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|--------------|
| socket.io | npm | mature project (~10+ yrs), stable release cadence | 14.99M/wk | github.com/socketio/socket.io | OK | Approved |
| socket.io-client | npm | same project/org as socket.io | 13.76M/wk | github.com/socketio/socket.io | OK | Approved |
| express | npm | mature project (~14 yrs) | 109.2M/wk | github.com/expressjs/express | OK | Approved |
| vite | npm | latest *version* published 2026-07-02 (today) — automated check flags "too-new" based on **latest release date**, not package age; project itself is long-established with 140.98M weekly downloads and the official `vitejs` org repo | 140.98M/wk | github.com/vitejs/vite | SUS ("too-new" — release-cadence false positive) | Approved — planner should add a lightweight `checkpoint:human-verify` before `npm install vite@7.3.6` per protocol, but this is almost certainly a benign same-day patch release, not a supply-chain risk signal, given the download count and repo maturity. |
| lucide | npm | latest version published 2026-07-01 — same "too-new" release-cadence signal as vite; established icon-set org (`lucide-icons`) | 775.3K/wk | github.com/lucide-icons/lucide | SUS ("too-new" — release-cadence false positive) | Approved — planner should add a `checkpoint:human-verify` before install per protocol; low risk given repo/org maturity and download volume, but flagged as required by the legitimacy gate. |
| @fontsource/inter | npm | stable, infrequent releases (font packages) | 1.75M/wk | github.com/fontsource/font-files | OK | Approved |
| dompurify | npm (Phase 2+, not installed this phase) | mature (~10 yrs) | high (not queried this pass — deferred) | github.com/cure53/DOMPurify | Not checked this pass | Deferred to Phase 2 research |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `vite`, `lucide` — both flagged solely because the automated check's "too-new" signal reads the **latest version's publish timestamp**, not the package's first-publish date or track record. Both have overwhelming download counts (140M/wk and 775K/wk respectively) and long-established, verifiable GitHub organizations. The planner must still insert a `checkpoint:human-verify` task before these two `npm install` steps per the legitimacy protocol, but this note is here so that checkpoint isn't a surprise or read as a real red flag.

No package name in this research was sourced from unverified training-data guessing — every package above was checked against the live npm registry this session (`npm view <pkg> version`) and cross-checked for `postinstall` scripts (none found on any of the six packages).

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────┐
                     │        Node.js process (single)          │
                     │                                           │
  Team PC 1..6  ───► │  http.Server                              │
  (client.html)      │    ├─ Express: static(dist/) + health     │
       │  WS/HTTP     │    └─ Socket.io Server                    │
       │  (Socket.io) │         │                                 │
       ▼              │         ├─ io.use() session middleware     │
  [localStorage:      │         │    reads handshake.auth.token   │
   team session       │         │    looks up sessionStore (Map)  │
   token]              │         │    → attaches socket.data.teamId│
       │              │         │                                 │
       └────────────► │         ├─ Rooms:                          │
                       │         │    "session" (all teams+admin)  │
  Admin PC     ───────►│         │    "admin"   (admin socket only)│
  (admin.html)         │         │    "team:<id>" (1 per team)     │
       │  WS/HTTP      │         │                                 │
       ▼              │         ├─ In-memory authoritative state:  │
  [emits admin         │         │    gameState = {                │
   intents:            │         │      phase, phaseEndsAt,        │
   team:register,      │         │      timerStatus, teams: Map }  │
   phase:next,          │         │                                 │
   timer:pause/         │         ├─ On state mutation:             │
   resume/extend,       │         │    io.to("session").emit(       │
   team:resync]         │         │      "session:full-state", ...)│
                       │         │                                 │
                       │         └─ On socket connect/reconnect:    │
                       │              if !socket.recovered:         │
                       │                emit "session:full-state"   │
                       │              (fallback for cold reconnects,│
                       │               server restarts, F5)        │
                       └─────────────────────────────────────────┘
                                       │
                          Vite dev server (dev only)
                          proxies /socket.io/* (ws:true) ───► above
                          serves admin.html / client.html w/ HMR
```

Data flow for the primary use case (team reconnects after F5):
1. Browser loads `client.html`, JS boot reads `localStorage.getItem('teamToken')`.
2. `socket.auth = { token }` set before `io()` connects.
3. Server's `io.use()` middleware looks up `sessionStore.get(token)`; found → attaches `socket.data.teamId`, joins `team:<id>` and `session` rooms, calls `next()`.
4. Server emits `session:full-state` immediately on connect (belt-and-suspenders alongside whatever `connectionStateRecovery` already restored) — client renders exactly correct phase/timer/waiting-state with zero flicker.
5. Client-side interval computes `phaseEndsAt - Date.now()` for the visible countdown; no further server messages needed until the next admin action.

### Recommended Project Structure
```
src/
├── server/
│   ├── index.js            # http.Server + Express + Socket.io wiring
│   ├── gameState.js         # authoritative in-memory state module (singleton)
│   ├── sessionStore.js      # Map<token, {teamId, teamName}> + token minting
│   ├── socketHandlers.js    # io.on('connection', ...) event registrations
│   └── events.js            # shared event-name + payload-shape constants
├── client/
│   ├── admin.html           # Vite entry point 1
│   ├── admin.js             # admin UI render + socket.emit intents
│   ├── client.html          # Vite entry point 2
│   ├── client.js            # team UI render + socket.emit intents
│   └── shared/
│       ├── tokens.css       # design tokens from UI-SPEC (shared both entries)
│       └── timer.js         # shared "render countdown from phaseEndsAt" helper
├── vite.config.js
└── package.json
```

### Pattern 1: Session-token reconnection (team identity)
**What:** Server-side `Map<token, session>` keyed by a server-minted random token; client persists it in `localStorage` and resends via `socket.handshake.auth.token` on every connect attempt (including automatic reconnects).
**When to use:** Every team connection, from the very first tab load onward — this is CORE-02/CORE-03's core mechanism.
**Example:**
```javascript
// Source: Socket.io official private-messaging tutorial (adapted), https://socket.io/get-started/private-messaging-part-2/
// server/socketHandlers.js
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token && sessionStore.has(token)) {
    const session = sessionStore.get(token);
    socket.data.teamId = session.teamId;
    socket.data.token = token;
    return next();
  }
  // No valid token: this connection is an unclaimed PC awaiting team selection.
  // Do NOT mint a token here — team identity is only assigned on explicit
  // "team:select" (D-01: pre-registration + list choice, not auto-assignment).
  next();
});

io.on('connection', (socket) => {
  if (socket.data.teamId) {
    socket.join(`team:${socket.data.teamId}`);
    socket.join('session');
    socket.emit('session:full-state', gameState.getPublicState());
  } else {
    socket.join('session'); // still needs phase/timer awareness while choosing
    socket.emit('team:available-list', gameState.getUnclaimedTeams());
  }
});

// client.js
const existingToken = localStorage.getItem('teamToken');
const socket = io({ auth: existingToken ? { token: existingToken } : {} });

socket.on('team:claimed', ({ token, teamId }) => {
  localStorage.setItem('teamToken', token);
  // ... transition to waiting screen (D-05)
});
```

### Pattern 2: `connectionStateRecovery` (socket-level short-gap recovery)
**What:** Built-in Socket.io feature that transparently restores `socket.id`, room memberships, `socket.data`, and any packets missed during a brief disconnect (default window 2 minutes).
**When to use:** Always-on server config; it is a safety net layered UNDER the session-token pattern, not a replacement for it — it only helps within its window, and the token pattern is what actually re-establishes identity from scratch (page reload, browser restart, disconnect longer than the window).
**Example:**
```javascript
// Source: https://socket.io/docs/v4/connection-state-recovery
const io = new Server(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 min — sensible for brief WiFi blips
    skipMiddlewares: false, // re-run io.use() middleware even on recovery (safer default)
  }
});

io.on('connection', (socket) => {
  if (socket.recovered) {
    // Short-gap recovery succeeded: socket.data.teamId etc. already restored.
    // Still safe to also emit session:full-state as a cheap correctness belt-and-suspenders.
  } else {
    // New connection OR recovery window exceeded — session-token middleware
    // (Pattern 1) is what re-establishes team identity here, not this flag.
  }
});
```

### Pattern 3: Server-authoritative timer (absolute end-timestamp)
**What:** Server stores `phaseEndsAt` (epoch ms) and `timerStatus` (`running` | `paused`); on pause, stores `remainingMsAtPause` instead of continuing to compute against a moving `Date.now()`; on resume, recomputes a fresh `phaseEndsAt = Date.now() + remainingMsAtPause`.
**When to use:** All timer state — CORE-04, ADMIN-02/03/04, D-10/D-11/D-12.
**Example:**
```javascript
// Source: pattern synthesized from server-authoritative countdown best practices
// (see Sources — no single canonical doc, this is a well-established multiplayer-game pattern)
// server/gameState.js
function startPhase(durationMs) {
  state.phaseEndsAt = Date.now() + durationMs;
  state.timerStatus = 'running';
  broadcastState();
}
function pauseTimer() {
  state.remainingMsAtPause = state.phaseEndsAt - Date.now();
  state.timerStatus = 'paused';
  state.phaseEndsAt = null; // not meaningful while paused
  broadcastState();
}
function resumeTimer() {
  state.phaseEndsAt = Date.now() + state.remainingMsAtPause;
  state.timerStatus = 'running';
  broadcastState();
}
function extendTimer(ms = 60_000) {
  if (state.timerStatus === 'running') state.phaseEndsAt += ms;
  else state.remainingMsAtPause += ms;
  broadcastState();
}
function checkExpiry() {
  // D-11: freeze at zero, do NOT auto-advance phase.
  if (state.timerStatus === 'running' && Date.now() >= state.phaseEndsAt) {
    state.timerStatus = 'frozen';
    broadcastState();
  }
}
```
```javascript
// Source: pattern synthesized — client-side countdown render
// client/shared/timer.js
function renderCountdown(el, { phaseEndsAt, timerStatus, remainingMsAtPause }) {
  function tick() {
    if (timerStatus !== 'running') return; // frozen/paused: render last known value once, stop
    const remaining = Math.max(0, phaseEndsAt - Date.now());
    el.textContent = formatMs(remaining);
    if (remaining > 0) requestAnimationFrame(tick);
  }
  tick();
}
```
**Note on the "server does not tick" recommendation:** a single lightweight server-side `setInterval` (e.g., every 1s) checking `checkExpiry()` is still necessary so the server itself notices zero-crossing and can freeze/broadcast — the "no ticking" guidance applies to *not broadcasting a message every second to every client*, not to internal server bookkeeping.

### Anti-Patterns to Avoid
- **Binding team identity to `socket.id`:** explicitly forbidden by CORE-02/D-02 — `socket.id` changes on every reconnect by design; any code that uses it as a durable key will break on the very first F5.
- **Trusting a client-sent `isAdmin` boolean:** all control events (`timer:pause`, `phase:next`, etc.) must be validated server-side against which room/socket sent them, never against a flag in the payload.
- **Broadcasting a per-second timer tick event:** wastes bandwidth/CPU across teams+admin sockets and adds reconnect-sync complexity for no benefit over the absolute-timestamp approach.
- **Re-deriving phase content per-team:** D-07 requires phase to be a single global value; do not build a per-team phase field "just in case" — it directly contradicts the lockstep model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reconnect delivery of missed events during brief network blips | Custom "resend last N events" queue per socket | Socket.io's built-in `connectionStateRecovery` | Already battle-tested, one config object, restores `socket.data`/rooms/packets automatically — a hand-rolled version would need to solve the exact same problem Socket.io's own maintainers already solved. |
| Clock-drift-safe countdown across many clients | Client-side elapsed-time accumulation (`setInterval` decrementing a local counter) | Server-broadcast absolute `phaseEndsAt`, client recomputes from `Date.now()` each tick | Accumulating local decrements drifts over a 15-20 min session and desyncs across teams' machines; recomputing from a fixed absolute timestamp is self-correcting by construction. |
| WebSocket upgrade through a dev-time proxy | Custom dev-server / manual two-port juggling in browser code | Vite's `server.proxy` with `ws: true` | This is exactly what Vite's proxy option exists for; a hand-rolled solution risks silently falling back to polling with no clear error. |
| Random, unguessable session tokens | `Math.random()`-based string generation | `crypto.randomUUID()` (Node built-in since v14.17, no dependency) | `Math.random()` is not cryptographically secure and its output space is smaller/more predictable — irrelevant for pure functionality but relevant if a stray student tries to guess another team's token; costs nothing to do right (see Security Domain). |

**Key insight:** every "hard part" of this phase (reconnection semantics, clock-safe timers, WS proxying) already has a well-known, low-code, high-confidence solution baked into the locked stack. The temptation to hand-roll a bespoke reconnection protocol or a ticking timer server is exactly the kind of unnecessary complexity `.claude/CLAUDE.md`'s simplicity mandate warns against — resist it.

## Common Pitfalls

### Pitfall 1: Vite dev proxy silently falls back to polling instead of erroring
**What goes wrong:** Forgetting `ws: true` (or misconfiguring the proxy path) doesn't throw a clear error — Socket.io's client transport just falls back to HTTP long-polling, which *appears* to work in casual testing but behaves differently under load/latency and masks the real WS path that Phase 5's Nginx config must also get right.
**Why it happens:** Socket.io's client is deliberately resilient and transport-agnostic, so a broken WS upgrade is invisible unless you specifically check the transport.
**How to avoid:** After wiring the dev proxy, open browser DevTools → Network → filter `WS`, confirm a `101 Switching Protocols` entry exists (not repeating `polling` XHR requests). Add this as an explicit manual verification step in the plan, not just "it loaded."
**Warning signs:** Slight extra latency on every event, or `transport: "polling"` when logging `socket.io.engine.transport.name` in the browser console.

### Pitfall 2: Conflating `connectionStateRecovery`'s `socket.recovered` with "team identity restored"
**What goes wrong:** `socket.recovered === true` only means the transport-level state (rooms, `socket.data`, missed packets) survived a brief gap — it says nothing about whether this is the right team long-term, and it will be `false` after any server restart, any gap longer than `maxDisconnectionDuration`, or any deploy. Code that skips the session-token lookup "because recovery already handled it" will break the very first time the Node process restarts (which happens on every deploy and on any crash).
**Why it happens:** The two mechanisms sound similar (both about "coming back after a disconnect") but operate at different layers and time horizons.
**How to avoid:** Always run the session-token `io.use()` middleware regardless of `socket.recovered`; treat recovery as a pure optimization for uninterrupted event delivery, never as the source of truth for identity.
**Warning signs:** A test where you kill and restart the Node process mid-session and teams don't reconnect to their correct state — this is the actual acceptance test for CORE-03, not just an F5 refresh.

### Pitfall 3: Broadcasting the whole `gameState` object verbatim to every client
**What goes wrong:** The server's internal `gameState` will eventually need fields teams shouldn't see (e.g., other teams' private data in later phases, or internal bookkeeping like `sessionStore` tokens). Broadcasting the raw internal object couples the wire protocol to internal implementation and leaks data across team boundaries.
**Why it happens:** It's the path of least resistance to just `JSON.stringify` the whole state object during initial development.
**How to avoid:** Define an explicit `getPublicState(forTeamId)` projection function from day one, even though in Phase 1 it may look like an near-identity transform. This is the seam Phases 2-4 will need to extend (e.g., hiding other teams' in-progress block placements).
**Warning signs:** Any place a `Team` object accidentally includes its own `sessionStore` token, or one team's payload includes another team's private in-progress data.

### Pitfall 4: Admin panel has no access separation from team panels
**What goes wrong:** If `admin.html` is just a plain static route with no distinguishing check, any team PC on the same classroom network could navigate to it and gain full session control (pause everyone's timer, force resyncs, etc.) — either by accident (typo/curiosity) or if a URL leaks.
**Why it happens:** REQUIREMENTS.md's v1 scope explicitly has no user accounts/authentication (Kahoot-style pattern), and the phase's decisions don't mention admin-route protection — this is a genuine gap, not an oversight in this research (see Security Domain and Open Questions).
**How to avoid:** At minimum, keep the admin route path non-obvious and/or gate admin-only Socket.io events behind server-side verification that the emitting socket is actually in the `admin` room (never trust a client `role` field) — this stops the *technical* privilege escalation even if the *URL discovery* risk is accepted as low for a single-room classroom.
**Warning signs:** No task in the plan validates "does the server reject a `phase:next` event from a socket that's not in the admin room."

## Code Examples

### Vite multi-page config (admin.html + client.html)
```javascript
// Source: https://vite.dev/guide/build (multi-page section), verified against Vite 7.x current docs
// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'src/client',
  build: {
    outDir: '../../dist',
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'src/client/admin.html'),
        client: resolve(__dirname, 'src/client/client.html'),
      },
    },
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000', // the Node/Express/Socket.io backend
        ws: true,                        // REQUIRED for WebSocket upgrade — most common miss
        changeOrigin: true,
      },
    },
  },
});
```

### Express + Socket.io shared http.Server
```javascript
// Source: standard Express+Socket.io wiring pattern (Socket.io official get-started guide shape)
// server/index.js
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
app.use(express.static('dist')); // production: serve Vite's build output

const httpServer = createServer(app);
const io = new Server(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

httpServer.listen(3000);
```

### Event protocol (recommended minimal set — extensible for Phases 2-4)
```javascript
// Source: synthesized from CORE/ADMIN/GAME requirements + Socket.io rooms/broadcast patterns
// server/events.js — single source of truth for event names + payload shapes

// --- Client -> Server (intents, never trusted blindly) ---
// 'team:select'      { teamName: string }                          -> server mints token, joins team:<id> + session rooms
// 'admin:register-teams' { names: string[] }                       -> admin only; creates unclaimed team entries
// 'admin:start-phase'    { phase: 'html'|'css'|'js', durationMs }   -> admin only
// 'admin:next-phase'     {}                                        -> admin only (D-11: never automatic)
// 'admin:timer-pause'    {}                                        -> admin only
// 'admin:timer-resume'   {}                                        -> admin only
// 'admin:timer-extend'   { ms: 60000 }                              -> admin only
// 'admin:force-resync'   { teamId: string }                         -> admin only; triggers client-side location.reload()

// --- Server -> Client (authoritative broadcasts) ---
// 'session:full-state'   { phase, phaseEndsAt, timerStatus, remainingMsAtPause, teams: [{id,name,connected,progress}] }
//                          -> sent on every connect/reconnect AND after every mutating admin action (single source of truth)
// 'team:claimed'         { token, teamId }                          -> sent only to the socket that just claimed a team
// 'team:available-list'  { teams: [{id,name}] }                     -> sent to any not-yet-claimed socket
// 'admin:force-resync'   {}                                          -> targeted to team:<id> room only; client does location.reload()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Hand-rolled reconnection: client re-sends full state request, server replays event log | Socket.io `connectionStateRecovery` (opt-in server config) | Socket.io 4.6.0 (2023) | Removes the need for a custom "replay missed events" protocol for short gaps; still needs the app-level full-state fallback for long gaps, which this research recommends anyway. |
| Sending session/auth data via query string params | Sending via `socket.handshake.auth` object | Socket.io v3+ (auth option introduced) | Query strings are logged in server access logs and easier to leak; `auth` payload is not URL-visible. |
| Express 5.x is now npm's "latest" tag (5.2.1, promoted to default in late 2024) | This project stays on Express **4.x** (4.22.2) per locked `.claude/CLAUDE.md` decision | Ongoing — Express 5 became the npm default sometime after Nov 2024 | Not something to silently "fix" — flagging so the planner/human is aware the ecosystem default has moved, in case this is worth a discussion for a future milestone; Phase 1 should NOT unilaterally switch. |

**Deprecated/outdated:**
- Manually tracking reconnect attempts and replaying a hand-rolled event buffer: superseded by `connectionStateRecovery` for the common case.
- Binding any identity concept to `socket.id`: was arguably ever a valid pattern only for ephemeral, non-persistent-identity use cases; explicitly wrong for this project's requirements (CORE-02).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `lucide` npm package (vanilla-JS variant, not `@lucide/icons`) is the right icon package for tree-shakeable per-icon imports in a Vite + vanilla-JS project | Standard Stack / Package Legitimacy Audit | Low — both `lucide` and `@lucide/icons` are maintained by the same org; if the planner discovers `@lucide/icons` fits better (e.g., cleaner tree-shaking API), swapping is a same-day change with no architectural impact. |
| A2 | A 1-second server-side `setInterval` is sufficient granularity for detecting timer zero-crossing (D-11 freeze) without visible lag to users | Architecture Patterns / Pattern 3 | Low-medium — if 1s proves visibly laggy in playtesting (e.g., timer visually shows -1s before freezing), tightening to 250-500ms costs nothing; flag for a UAT check during execution. |
| A3 | No admin-route authentication/access-control is required in v1 beyond server-side validation of the admin Socket.io room membership (per Pitfall 4) | Common Pitfalls / Security Domain | Medium — if the classroom network is genuinely open/shared beyond trusted PCs, a curious student navigating to the admin URL could disrupt the whole session; REQUIREMENTS.md's explicit no-auth-accounts scope suggests this is accepted, but it was never explicitly discussed in CONTEXT.md's decisions, so flagging for confirmation. |
| A4 | `crypto.randomUUID()` (Node built-in) provides sufficient entropy for team session tokens without needing an external ID-generation library | Don't Hand-Roll / Security Domain | Low — this is a standard, well-documented Node API; only risk is if the planner reaches for `Math.random()` instead out of habit. |

**If this table is empty:** N/A — see above; all four items should be confirmed or explicitly accepted by the planner/human before being treated as locked.

## Open Questions

1. **Should the admin panel have any access gate at all (URL obscurity, shared PIN, or nothing)?**
   - What we know: REQUIREMENTS.md explicitly puts "Autenticació / comptes d'alumnes" out of scope, and CONTEXT.md's decisions never raise admin-route protection as a concern.
   - What's unclear: whether "no student accounts" was meant to also imply "no admin-route protection at all," or whether that simply wasn't considered.
   - Recommendation: treat as accepted risk for v1 (single trusted classroom network, single teacher-controlled admin PC) unless the human flags it during planning — but the server-side "validate admin room membership before processing admin:* events" control from Pitfall 4 should be built regardless, since it's near-zero cost and closes the *technical* escalation path even if URL discovery remains an accepted risk.

2. **Exact `progress` field shape on the team card (D-08) — deferred by CONTEXT.md itself.**
   - What we know: D-08 explicitly reserves layout space but defers the metric's definition to Phase 2+.
   - What's unclear: nothing to resolve now — CONTEXT.md already marks this correctly deferred.
   - Recommendation: Phase 1's `getPublicState()` projection should include a `progress: null` placeholder field per team so the wire shape doesn't change shape (only value) when Phase 2 populates it — avoids a breaking protocol change later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | ✓ | v22.17.0 (local dev machine) | `.claude/CLAUDE.md` targets Node 24.x LTS for production; 22.x is still within Socket.io/Vite/Express's supported engine ranges for local development, but recommend `nvm install 24 && nvm use 24` before Phase 5 deployment parity work. Not a blocker for Phase 1 planning/execution. |
| npm | Package management | ✓ | 11.8.0 | — |
| Docker | Not required this phase | ✓ (available but unused) | — | No containerization in this project's scope (single VPS + PM2 per `.claude/CLAUDE.md`); noted only for completeness. |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Node 24.x LTS (dev machine currently on 22.17.0 — works for development, upgrade recommended before Phase 5 production parity checks).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | Partial | No traditional user login (explicitly out of scope per REQUIREMENTS.md — Kahoot-style team-name identification, not accounts). The gap this leaves is admin-route access, tracked as Assumption A3 / Open Question 1. |
| V3 Session Management | Yes | Team session tokens must be generated with `crypto.randomUUID()` (or equivalent CSPRNG), never sequential/predictable IDs; stored in `localStorage` (acceptable here since there's no cross-site sensitive-data concern — see V6 note on why no signing/encryption is needed for this token). |
| V4 Access Control | Yes | Every `admin:*` Socket.io event handler must verify the emitting socket is a member of the `admin` room server-side before mutating `gameState` — never trust a client-supplied role/flag in the payload (Pitfall 4). |
| V5 Input Validation | Yes | Validate all client-emitted payloads server-side: team names (length bounds, strip/escape before any DOM insertion — render via `textContent`, never `innerHTML`, to avoid stored-XSS through a team's own chosen name), and structurally validate event payload shapes (e.g., a lightweight runtime check or `zod` schema) so a malformed/malicious payload can't crash the single shared Node process for every team. |
| V6 Cryptography | Partial | No encryption-at-rest or password hashing needed (no DB, no passwords). The one requirement is that session tokens use a cryptographically secure random source (`crypto.randomUUID()`) rather than `Math.random()`, purely to prevent a token-guessing attack that would let one PC hijack another team's session. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Team session-token guessing/hijacking (one PC steals another team's identity) | Spoofing | Use `crypto.randomUUID()` for token generation; tokens are never displayed/logged in a way another team's PC could observe. |
| Client emits `admin:*` events directly via browser devtools without being in the admin room | Elevation of Privilege | Server-side room-membership check on every admin-namespaced event handler, independent of any client-side UI restrictions. |
| Malformed/garbage Socket.io event payload crashes the shared Node process | Denial of Service | Validate every inbound payload shape server-side before use (schema check or manual guard clauses); wrap handlers so a thrown error inside one event doesn't take down the process (Node's default `uncaughtException` behavior would kill everyone's session). |
| Team name containing HTML/script content rendered unescaped in another team's/admin's DOM | Tampering / stored XSS | Insert team names via `textContent`/DOM APIs, never `innerHTML` string concatenation; Phase 1 has no rich-text fields so this is a small, easily-closed surface. |
| Admin panel reachable by any PC on the classroom network with no distinguishing check | Information Disclosure / Elevation of Privilege | Accepted risk per REQUIREMENTS.md's no-accounts scope (Open Question 1), mitigated at the technical layer by the V4 access-control check above (a team PC navigating to the admin URL still can't successfully mutate state without being recognized as the admin socket — though currently nothing prevents ANY socket from claiming that role since there's no login; flag for human confirmation whether a minimal shared secret is desired). |

## Sources

### Primary (HIGH confidence)
- None this pass — no Context7 MCP tool was available in this session; all fetches fell back to WebSearch/WebFetch against official documentation domains (see Secondary below).

### Secondary (MEDIUM confidence)
- [Connection state recovery | Socket.IO](https://socket.io/docs/v4/connection-state-recovery) — official docs, fetched directly via WebFetch; config options, restored state, `socket.recovered` usage.
- [Private messaging - Part II | Socket.IO](https://socket.io/get-started/private-messaging-part-2/) — official tutorial, fetched directly via WebFetch; session-token reconnection pattern code.
- [Rooms | Socket.IO](https://socket.io/docs/v3/rooms/) — official docs; room broadcast semantics (`io.to()` vs `socket.to()`, auto-join of socket.id room).
- [Building for Production | Vite](https://vite.dev/guide/build) — official docs; `rollupOptions.input` multi-page pattern.
- [Server Options | Vite](https://vite.dev/config/server-options) — official docs; `server.proxy` with `ws: true` for WebSocket proxying.
- [Server options | Socket.IO](https://socket.io/docs/v4/server-options/) — official docs; cross-referenced `connectionStateRecovery` option defaults.
- npm registry (`npm view <pkg> version`, live queries 2026-07-02) — confirmed socket.io 4.8.3, socket.io-client 4.8.3, express 4.22.2 (4.x line) / 5.2.1 (latest tag), vite 7.3.6 (7.x line) / 8.1.3 (latest tag), sortablejs 1.15.7, dompurify 3.4.11, lucide 1.23.0, @fontsource/inter (current).
- GitHub issues [#5282](https://github.com/socketio/socket.io/issues/5282), discussion [#5248](https://github.com/socketio/socket.io/discussions/5248), issue [#4652](https://github.com/socketio/socket.io/issues/4652), issue [#4880](https://github.com/socketio/socket.io/issues/4880) — `connectionStateRecovery` known limitations (long-lived connections, network-switch races, disconnect-reason-dependent recovery, clustered-adapter caveats).
- [Syncing Countdown Timers Across Multiple Clients — Medium](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a) — absolute end-timestamp countdown pattern rationale.
- [Lucide for Vanilla JavaScript](https://lucide.dev/guide/lucide/) and [@lucide/icons – Lucide](https://lucide.dev/guide/packages/icons) — vanilla-JS icon usage (`createIcons()`, `createElement()`, per-icon tree-shaken imports).

### Tertiary (LOW confidence)
- General WebSearch result summaries not independently fetched/re-verified via WebFetch (e.g., server-authoritative timer forum discussions, general Socket.io auth-pattern blog summaries) — used only to corroborate the Secondary-tier findings above, not as standalone sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against the live npm registry this session; the stack itself was already locked by `.claude/CLAUDE.md`, not re-litigated.
- Architecture (reconnection/timer/rooms patterns): MEDIUM — sourced from official Socket.io/Vite documentation pages fetched directly, but no Context7 MCP tool was available this session to cross-verify against a second authoritative channel.
- Pitfalls: MEDIUM — grounded in official docs' own stated limitations (GitHub issues linked from Socket.io's own repo) plus first-principles reasoning about this specific project's requirements.
- Security domain: MEDIUM-LOW — ASVS category mapping is standard practice reasoning, but the admin-access-control gap (Assumption A3) is a genuine unresolved scope question, not a verified requirement either way.

**Research date:** 2026-07-02
**Valid until:** ~30 days for the architecture/pattern guidance (stable ecosystem, slow-moving APIs); package version pins should be re-checked at execution time regardless, since `npm view` was only run once this session.
