# Project Research Summary

**Project:** Impartició01 — real-time gamified classroom coding webapp
**Domain:** Real-time, single-classroom, admin-paced, team-based HTML/CSS/JS learning game with drag/fill-in editors, live preview, and automated scoring against a fixed model page
**Researched:** 2026-07-01
**Confidence:** MEDIUM

## Executive Summary

This is a purpose-built, single-session live classroom tool: one teacher (admin) drives 4-6 teams through three timed phases (HTML block assembly, CSS fill-in-the-blank, JS rule building), each team seeing a live preview of their work, culminating in automated scoring against a fixed "model page" and a results/ranking screen. The closest precedents are Kahoot/Quizizz for the live-hosted, timer-driven, reconnection-critical session model, and Scratch/Blockly/Flexbox Froggy for the constrained drag-and-drop/fill-in editing paradigm that eliminates syntax-error frustration for zero-experience learners. No single existing product combines "hosted synchronized game" with "structural auto-grading of student-built HTML/CSS/JS" — that combination is this project's real product risk and its differentiator.

The recommended approach is deliberately boring and small: Node.js + Socket.io + Express on the backend (server-authoritative, in-memory game state, no database), vanilla JS + Vite on the frontend (no framework — the UI is a thin renderer over socket events for exactly 2 screens), SortableJS for drag-and-drop, and PM2 + Nginx for VPS deployment. Every "obvious" production pattern that doesn't fit this scale — a database, auth, Redis-backed multi-instance scaling, a configurable exercise editor — is explicitly rejected; PITFALLS.md calls overengineering out as its own top-level risk (Pitfall 9) precisely because this project's real risk is under-investing in session robustness, not scale.

The dominant risk category is not features or stack choice — it's live-session robustness with zero margin for error, since a broken 15-20 minute classroom session cannot be repeated. The critical path of pitfalls (team identity keyed by durable session token not `socket.id`, server-authoritative absolute-endtime timer, no duplicate/zombie sockets, verified WebSocket upgrade behind Nginx before the live day, normalized style comparison for fair scoring, real iframe sandboxing, and explicit teacher recovery controls) must be solved as foundational plumbing before any phase-specific UI is built. Getting this "boring" layer right is the actual hard part of the project; the drag-and-drop/fill-in/rule-builder UIs are comparatively low-risk once that foundation exists.

## Key Findings

### Recommended Stack

Node.js 24 (Active LTS) + Express + Socket.io 4.8.x on the backend, serving an in-memory-only game state (no DB — explicitly out of scope and correctly so at this scale). Frontend is vanilla JS + Vite (no React/Vue/Svelte) built as two entry points (`admin.html`, `client.html`) — the UI is simple enough that a framework would add abstraction cost with zero payoff. SortableJS handles the HTML block drag-and-drop (chosen over the unmaintained `interact.js` and over React-only `dnd-kit`). DOMPurify sanitizes any assembled HTML before it's injected into the preview `srcdoc` as defense-in-depth. PM2 + Nginx handle process management and reverse-proxying on the existing VPS, with explicit WebSocket-upgrade and long-timeout configuration required (this is the single most common way self-hosted Socket.io deployments silently degrade).

**Core technologies:**
- Node.js 24.x + Express: backend runtime and thin HTTP layer for Socket.io's `http.Server` and static asset serving
- Socket.io 4.8.x: real-time admin↔team sync; ships built-in `connectionStateRecovery` as a complementary (not sole) reconnection aid
- Vanilla JS + Vite (multi-page): frontend build with zero framework runtime tax, matching the fixed 2-screen/3-phase scope
- SortableJS: framework-agnostic, actively maintained drag-and-drop for the HTML block editor with native support for group/snap-back patterns

### Expected Features

The MVP is fully specified by PROJECT.md's active requirements and closely tracks the FEATURES.md table stakes derived from Kahoot/Quizizz/Scratch/Flexbox Froggy precedent: a server-authoritative timer with admin pause/resume/+1min, a live team status overview, refresh-safe reconnection, three phase-specific editors (HTML drag-and-drop, CSS fill-in with controlled inputs, JS event→target→action rule builder), a live preview pane, automated structural/style/behavioral scoring against the model page, and a ranking screen. The scoring engine (DOM diff + computed-style diff + event-binding verification) is the single highest-complexity, most differentiating feature — no surveyed competitor (Kahoot/Quizizz grade multiple-choice only) does open-ended structural grading inside a live game format.

**Must have (table stakes):**
- Server-authoritative countdown timer with pause/resume/+1min — every reviewed live-quiz tool treats this as core
- Reconnection/state recovery on refresh — explicitly "critical" per project constraints; no time to redo a session
- Strong snap-to-valid-slot drag-and-drop (Phase 1 HTML) — direct Scratch/Blockly precedent, non-negotiable per pedagogy
- Live preview pane synced to editor state across all 3 phases
- Automated per-phase scoring vs. the fixed model page + ranking/results screen

**Should have (competitive differentiators):**
- Real-syntax constrained CSS input (foradat) — Flexbox Froggy pattern, teaches transferable syntax literacy
- JS event→target→action rule builder — a genuine gap-fill vs. Scratch/code.org precedent
- Icon-driven, near-zero-text UI — differentiator for absolute-beginner audience under time pressure

**Defer (v2+):**
- Configurable/parametrizable exercises (admin-authored, multiple model pages)
- Session history/export, multi-classroom concurrent sessions (Redis-backed scaling)
- Any free-text/"expert" code mode

### Architecture Approach

Single Node.js process (PM2-managed) behind Nginx, hosting one Socket.io server with two namespaces (`/admin`, `/team`) and one room per team inside the team namespace. A single in-memory `GameSession` object is the sole source of truth for phase, timer, and all team state; all client actions are intents validated and applied server-side, never trusted client-side computations. Team identity is established via a durable session token (not `socket.id`) persisted in `localStorage`, enabling exact state resync on reconnect. The scoring engine is a pure, socket-agnostic module invoked once at "Finalitzar." The live preview iframe renders server-reconstructed HTML/CSS/JS via `srcdoc`, sandboxed with `allow-scripts` only (never combined with `allow-same-origin`).

**Major components:**
1. **Game Session Controller** — socket-agnostic state machine (phase transitions, server-side timer, team registry); the sole component allowed to mutate state
2. **Socket.io transport layer** — namespace-per-role (`/admin`, `/team`), room-per-team, thin translation layer only (no game logic in handlers)
3. **Scoring Engine** — pure functions comparing team state to the model page (DOM diff, computed-style diff, event-binding verification), invoked once at finish
4. **Team/Admin browser clients** — vanilla JS renderers reacting to socket events; team client also hosts the sandboxed preview iframe

### Critical Pitfalls

1. **Team identity tied to `socket.id` instead of a durable session token** — key all state by an app-level token in `localStorage`/`auth` payload; `socket.id` regenerates on every reconnect/refresh.
2. **Client-side decrementing countdown instead of server-broadcast absolute `phaseEndsAt`** — server owns time; clients compute `remaining = phaseEndsAt - Date.now()` so drift self-corrects and pause/+1min are trivial server-side edits.
3. **Duplicate/zombie sockets per team after reconnect** — server must forcibly disconnect any prior socket for a team token before registering the new one; treat join as replace, not append.
4. **WebSocket upgrade silently degrading to long-polling behind Nginx** — requires explicit `Upgrade`/`Connection` headers and long `proxy_read_timeout`/`proxy_send_timeout`; must be verified against the real deployed domain before the live class, not just localhost.
5. **Naive string-equality scoring (e.g., `red` vs `#ff0000` vs `rgb(255,0,0)`)** — normalize every compared value (parse colors to RGBA, numeric spacing) with unit-tested comparator functions per property type; this is a fairness bug, not a cosmetic one.

Two additional pitfalls carry equal weight for phase planning: **unsandboxed preview iframe** (never combine `allow-scripts` with `allow-same-origin`) and **no teacher-facing recovery controls** (per-team resend-state, force-rebroadcast-phase, and visible connection-status indicators are first-class admin panel requirements, not stretch goals, given the zero-margin-for-error constraint).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Real-time core (identity, timer, connection lifecycle)
**Rationale:** Every subsequent phase's client assumes identity persistence and server-authoritative timing; this is the foundational plumbing PITFALLS.md flags as needing to be solved before any phase mechanics are built.
**Delivers:** Socket.io skeleton with `/admin` and `/team` namespaces, room-per-team, session-token-based identity surviving refresh, server-authoritative `phaseEndsAt` timer with pause/resume/+1min, duplicate-socket prevention.
**Addresses:** "Reconnection/state recovery," "Global countdown timer," "Admin pause/resume/+1min" table-stakes features.
**Avoids:** Pitfalls 1 (socket.id identity), 2 (client-side countdown), 3 (duplicate sockets).

### Phase 2: Admin control panel
**Rationale:** Validates the Phase 1 state machine end-to-end from the control side before building the more complex team UI; also where teacher-recovery controls must be designed in from the start, not retrofitted.
**Delivers:** Team registration, start-phase-with-countdown, pause/resume/+1min UI, live team status/connection overview, per-team "resend state" and "force phase rebroadcast" recovery actions, "Finish & Show Results" trigger.
**Uses:** Socket.io `/admin` namespace, GameSession from Phase 1.
**Implements:** Admin Client component; addresses Pitfall 8 (no recovery mechanism) explicitly at design time.

### Phase 3: Team client shell + live preview pipeline
**Rationale:** Proves the reconnect/full-resync flow (the "F5 test") and the sandboxed preview rendering pipeline before building phase-specific interaction widgets — a vertical slice that phases 4-6 reuse.
**Delivers:** Team client scaffold (action panel + iframe preview wired to `state:update`/`state:full`), properly sandboxed (`allow-scripts` only, no `allow-same-origin`).
**Addresses:** "Live preview pane," "Team identification without accounts."
**Avoids:** Pitfall 7 (iframe sandbox escape).

### Phase 4: Phase 1 gameplay — HTML drag-and-drop block editor
**Rationale:** First vertical content slice; SortableJS choice must be locked in before UI code, since retrofitting a different DnD library later is a rewrite.
**Delivers:** Drag-and-drop block editor with strong snap-to-valid-slot / return-to-drawer behavior, wired to the action→state→preview pipeline from Phase 3.
**Addresses:** "Drag-and-drop block editor" table stake and differentiator.
**Avoids:** Pitfall 6 (native HTML5 DnD API inconsistency).

### Phase 5: Phase 2 & 3 gameplay — CSS fill-in and JS rule builder
**Rationale:** Both operate on the Phase 4 HTML output as their base DOM; sequenced together since they share the controlled-input UI pattern and reuse the same action→state→preview wiring.
**Delivers:** CSS real-syntax controlled inputs (color pickers/sliders) and JS event→target→action rule builder (dropdowns), each updating the live preview.
**Addresses:** CSS foradat and JS rule builder differentiators.

### Phase 6: Automated scoring engine + results screen
**Rationale:** Can be developed and unit-tested independently once team state shapes from Phases 4-5 are stable, then wired to the admin's "Finalitzar" button; this is the highest-complexity feature and needs its own dedicated, carefully tested phase.
**Delivers:** DOM structure diff (HTML), normalized computed-style diff (CSS), event-binding/action verification (JS) against the model page; percentage scoring and ranking screen.
**Addresses:** "Automated per-phase scoring," "Ranking/results screen."
**Avoids:** Pitfall 5 (naive string-comparison scoring) — explicit acceptance criterion: equivalent-but-differently-formatted values (hex/rgb/named color) must score identically.

### Phase 7: Production deployment (Nginx + PM2)
**Rationale:** Only matters once the app works locally, but WebSocket-upgrade behavior must be smoke-tested behind Nginx well before the first live classroom run — zero margin to debug this live.
**Delivers:** Nginx reverse-proxy config (Upgrade/Connection headers, long timeouts), PM2 ecosystem config, verified `transport=websocket` in production (not just localhost).
**Avoids:** Pitfall 4 (WebSocket-to-polling silent fallback).

### Phase Ordering Rationale

- Real-time core comes first because identity/timer/connection-lifecycle bugs compound into every later phase — fixing them after phase-specific UI exists means touching every screen twice.
- Admin panel precedes the team client because it's the simpler surface to validate the state machine against, and recovery controls need to be load-bearing from the start rather than bolted on.
- The three gameplay phases are sequenced by their explicit data dependency (HTML → CSS → JS all build on the same DOM), matching FEATURES.md's dependency graph.
- Scoring is deliberately last among functional work — it depends on stable team-state shapes from all three gameplay phases and is independently unit-testable against fixtures.
- Deployment is last because it only exposes integration issues (Nginx/WebSocket) that are cheap to fix early via smoke-testing but expensive to discover live.
- A cross-cutting constraint applies to every phase's plan: single in-memory Node process, no DB, no auth, one hardcoded exercise (Pitfall 9) — each phase should explicitly restate this to prevent scope creep during execution.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Scoring engine):** Style/DOM normalization edge cases (shorthand vs. longhand CSS properties, inherited/default values, `getComputedStyle` quirks) are non-trivial and under-documented for this exact use case — worth a focused research pass before implementation.
- **Phase 4 (HTML drag-and-drop):** SortableJS's exact API for "snap to nearest valid slot vs. return to drawer" (group/put/pull options) should be verified against current docs at implementation time, not assumed from this research pass.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Real-time core):** Socket.io identity/room/namespace patterns are officially documented and well-established; the token-based identity approach is a known, simple pattern.
- **Phase 7 (Deployment):** Nginx WebSocket-proxy configuration is a well-documented, mechanical fix (specific header/timeout directives), not a research problem.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versions cross-checked across multiple web sources (npm, endoflife.date, official release pages) but no Context7-indexed docs fetched this pass; re-verify exact versions at `npm install` time. |
| Features | MEDIUM | Grounded in official Kahoot/Quizizz support docs and well-known reference implementations (Scratch, Flexbox Froggy, code.org App Lab); no single precedent combines this exact feature set, so the synthesis is opinionated. |
| Architecture | MEDIUM | Patterns (namespaces/rooms, server-authoritative state, token-based identity) are backed by official Socket.io docs and MDN; the specific combination is synthesized, not copied from one reference architecture. |
| Pitfalls | MEDIUM | Cross-checked against official Socket.io docs, MDN, and multiple community sources (GitHub issues, dev.to writeups); no curated domain-specific pitfalls doc exists for this exact stack combination. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Exact SortableJS API usage for the strong-snap requirement** (group/put/pull, clone-and-remove-on-invalid-drop) should be validated hands-on early in Phase 4 rather than assumed from research.
- **Precise set of CSS properties to score and their normalization rules** (which shorthand/longhand pairs, which default/inherited-value edge cases matter for this specific model page) can't be fully resolved until the model page content itself is authored — flag for Phase 6 planning.
- **Classroom hardware/browser specifics** (are any classroom machines touch-capable? which browsers are guaranteed?) were assumed as "evergreen desktop browsers" — confirm this assumption before Phase 4, since it affects whether Pointer Events-based DnD libraries fully suffice.
- **Vite version pin (7.x vs 8.x)** was a judgment call favoring stability over newest features — confirm no blocking reason to prefer 8.x at implementation time.

## Sources

### Primary (HIGH confidence)
- None fetched via Context7 this pass — no primary/HIGH-confidence sources in this research round; see Secondary below for the closest equivalents (official docs, web-verified).

### Secondary (MEDIUM confidence)
- Socket.io official docs — rooms, namespaces, connection state recovery, reverse-proxy guidance (https://socket.io/docs/v3/rooms/, /docs/v3/namespaces/, /docs/v4/connection-state-recovery, /docs/v3/reverse-proxy/, /docs/v4/troubleshooting-connection-issues/, /docs/v4/memory-usage/)
- Nginx official docs — WebSocket proxying (https://nginx.org/en/docs/http/websocket.html)
- MDN — `HTMLIFrameElement.srcdoc`, `<iframe>` sandbox attribute, HTML Drag and Drop API (https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc, /docs/Web/HTML/Reference/Elements/iframe, /docs/Web/API/HTML_Drag_and_Drop_API)
- Kahoot! Help Center — live game settings, pause, reconnection UX (https://support.kahoot.com/hc/en-us/articles/115016055107, /articles/115003198708, /articles/4408679135891)
- npm/GitHub — SortableJS, interact.js maintenance status, dnd-kit comparison (https://github.com/SortableJS/Sortable, https://github.com/taye/interact.js, https://npmtrends.com/draggable-vs-dragula-vs-interact.js-vs-sortablejs)
- endoflife.date/nodejs, vite.dev/releases — version/support lifecycle confirmation
- GitHub udacity/js-grader — auto-scoring precedent
- GitHub issues (socketio/socket.io#430, #2844) — duplicate socket / reconnection bug reports informing Pitfall 3

### Tertiary (LOW confidence)
- Individual blog/Medium posts on countdown timer sync, iframe sandboxing security, PM2 vs. systemd comparisons — each LOW individually, treated as MEDIUM only where cross-checked against 2+ independent sources agreeing on the same conclusion

---
*Research completed: 2026-07-01*
*Ready for roadmap: yes*
