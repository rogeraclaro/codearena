# Phase 2: Joc — Fase HTML (blocs drag & drop) - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 9 (2 new, 6 modified, 1 new test) + package.json
**Analogs found:** 9 / 9 (every file has a same-repo analog — Phase 1 established every seam this phase fills)

> **Key fact for the planner:** this phase is almost entirely *self-analogous*. Nearly every file to touch already exists and already contains the exact pattern to extend (mutation-returns-bool in `gameState.js`, admin-guarded `safeHandler` handlers in `socketHandlers.js`, `clearApp()`+rebuild render in `client.js`, token-only `getPublicState()` projection). The genuinely new code is small: the shared robot template, 3 event names, 4 socket handlers, the SortableJS/DOMPurify glue in the client, and the CSS for the drawer/board. Copy the existing patterns verbatim; do not invent new architecture.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shared/robotTemplate.js` (NEW) | model / config (single source of truth) | transform (static schema) | `src/server/events.js` (frozen constants module) | role-match |
| `src/server/events.js` (MOD) | config (event protocol enum) | — | itself (lines 5-21) | exact (self) |
| `src/server/gameState.js` (MOD) | model / store | CRUD (per-team placement) | itself (`claimTeam`/`startPhase` + `getPublicState`) | exact (self) |
| `src/server/socketHandlers.js` (MOD) | controller / handler | request-response + event-driven | itself (`ADMIN_*` handlers + connection block) | exact (self) |
| `src/client/client.js` (MOD) | component / view (render layer) | event-driven (socket) + request-response (drag intents) | itself (`renderActiveSplitScreen`) + `admin.js` (grid rebuild) | exact (self) |
| `src/client/client.css` (MOD) | config / style | — | itself + `src/client/shared/tokens.css` | exact (self) |
| `src/client/shared/tokens.css` (MOD) | config / design tokens | — | itself (`:root` block lines 4-55) | exact (self) |
| `src/client/public/{antena,orella,fons}.png` (NEW) | asset | file-I/O (static served) | none (no `public/` dir exists) | **no analog** |
| `test/placement.test.js` (NEW) | test | event-driven (socket round-trip) | `test/roundtrip.test.js` | exact |
| `package.json` (MOD) | config (deps) | — | itself | exact (self) |

---

## Pattern Assignments

### `src/shared/robotTemplate.js` (NEW — model/config)

**Analog:** `src/server/events.js` — the repo's existing "single source of truth, frozen, imported everywhere" pattern.

The `src/shared/` directory does **not exist yet** (current shared code is `src/client/shared/`). This module must be importable by **both** the client (build via Vite) and, potentially, the server (Node ESM) — both are `"type": "module"`. RESEARCH.md §Recommended Project Structure places it at `src/shared/robotTemplate.js`.

**Constants-module pattern to copy** (`src/server/events.js` lines 1-21):
```javascript
// Single source of truth ... always import from here (server and client).
export const EVENTS = Object.freeze({ ... });
```
Apply the same shape: `export const SLOTS = [...]`, `export const PIECES = [...]`, `export const DISTRACTORS = [...]`. Consider `Object.freeze` on each for the same "canonical, never-mutated" guarantee. The exact contents are dictated by CONTEXT D-01/D-07 and are already drafted in `02-RESEARCH.md` §Code Examples (lines 349-368) — that draft is the authoritative structure.

**Critical field notes (from RESEARCH Pitfall 2/3 + D-07):**
- Each slot carries `id`, `accepts` (generic type), `parent` (which scaffold frame it nests in), and canonical `html` with the correct `id`/`class` per position — the client/server derives identity **from the slot**, never from the piece (D-07).
- Image `src` must be **root-relative** (`/antena.png`), not relative, because of `srcdoc` base-URL ambiguity (RESEARCH Pitfall 3, A5).

---

### `src/server/events.js` (MOD — config/enum)

**Analog:** itself (lines 5-21).

**Pattern to copy** — add three entries to the existing frozen object, keeping the two-section comment layout (Client→Server intents vs Server→Client broadcasts):
```javascript
// --- Client -> Server (intents, never trusted blindly) ---
TEAM_PLACE_PIECE: 'team:place-piece',
TEAM_REMOVE_PIECE: 'team:remove-piece',
// --- Server -> Client (authoritative broadcasts) ---
TEAM_BOARD_STATE: 'team:board-state',
```
Event-name literals appear **only** here (file header rule, line 2). Client and server both `import { EVENTS }`.

---

### `src/server/gameState.js` (MOD — model/store, CRUD)

**Analog:** itself — the whole file is the template.

**1. State shape** — extend the team record (line 20 comment + line 26 `registerTeams`):
```javascript
// current: { id, name, claimed, connected, progress }
state.teams.set(id, { id, name, claimed: false, connected: false, progress: null, placement: {} });
```
`placement` = `{}` map slot→type (RESEARCH Pattern 2, line 223).

**2. Mutation-returns-bool pattern** (copy exactly from `claimTeam` lines 30-36 / `startPhase` lines 70-78). Every mutator returns `true` only on a real change so callers broadcast only then (documented lines 66-68):
```javascript
function placePiece(teamId, slotId, pieceType) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'html' || state.timerStatus === 'frozen') return false; // D-11 / GAME-07
  const slot = SLOTS.find((s) => s.id === slotId);          // V5 enum validation
  if (!slot || slot.accepts !== pieceType) return false;    // server-side type-check (D-07)
  if (team.placement[slotId]) return false;                 // slot occupied → no-op
  if (countAvailable(team, pieceType) <= 0) return false;   // inventory (Pitfall 5)
  team.placement[slotId] = pieceType;
  return true;
}
```
`removePiece` mirrors it (return false if slot empty → no-op → no broadcast). This "return false on no-op" is the same anti-broadcast-storm guard the timer functions use (`pauseTimer` line 88: `if (state.timerStatus !== 'running') return false`).

**3. Explicit projection** — extend `getPublicState()` (lines 51-64). The N/8 count is safe to broadcast (does not reveal the board); the full board is NOT put here:
```javascript
// inside the teams.map(...) projection:
progress: state.phase === 'html'
  ? { placed: Object.keys(team.placement).length, total: SLOTS.length }
  : null,
```
Keep the destructure-and-map style (line 57) — never spread the raw team object (Pitfall 3 comment, lines 49-50; test asserts `token === undefined` and `progress` shape at `roundtrip.test.js:106`).

**4. Directed board getter** (new, mirrors the getUnclaimedTeams projection style, lines 43-47):
```javascript
function getTeamBoard(teamId) {
  const team = state.teams.get(teamId);
  return { placement: { ...team.placement } };   // shallow copy, never leak the live ref
}
```

**5. Export** — add `placePiece, removePiece, getTeamBoard` to the `export const gameState = { ... }` block (lines 134-146).

---

### `src/server/socketHandlers.js` (MOD — controller/handler)

**Analog:** itself — the `ADMIN_*` handler block (lines 122-193) and the connection block (lines 58-81).

**1. `safeHandler` + input-validation wrapper** — every new handler follows the exact `ADMIN_START_PHASE` shape (lines 122-134):
```javascript
socket.on(
  EVENTS.TEAM_PLACE_PIECE,
  safeHandler((payload) => {
    const teamId = socket.data.teamId;                 // V4: identity from socket, NEVER payload
    if (!teamId) return;
    const { slotId, pieceType } = payload || {};
    if (typeof slotId !== 'string' || typeof pieceType !== 'string') return; // V5
    if (gameState.placePiece(teamId, slotId, pieceType)) {
      io.to(`team:${teamId}`).emit(EVENTS.TEAM_BOARD_STATE, gameState.getTeamBoard(teamId));
      io.to('admin').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState()); // card N/8 (D-15)
      // ⚠️ NEVER io.to('session') for placements — RESEARCH Pitfall 1 (re-render storm)
    }
  }),
);
```

**Critical divergence from the admin analog:** admin handlers broadcast to `io.to('session')` (lines 131, 143, etc.). Placement handlers **must not** — they emit directed (`team:${teamId}` for the board, `admin` for the count). This is the single most important architectural rule of the phase (RESEARCH Pitfall 1 + Anti-Patterns). Copy the handler *structure*, change the *broadcast target*.

**2. Access-control pattern (V4):** admin handlers re-check `socket.rooms.has('admin')` (line 125). The team analog is: derive `teamId` from `socket.data.teamId` (set in the identity middleware, lines 45-51), **never** from the payload — so a team can only mutate its own board (RESEARCH Security V4, Threat "un equip muta el board d'un altre").

**3. Reconnection board emit (CORE-03, F5 recovery)** — extend the connection block's team branch (lines 64-70). After the existing `socket.emit(SESSION_FULL_STATE...)`, add:
```javascript
socket.emit(EVENTS.TEAM_BOARD_STATE, gameState.getTeamBoard(socket.data.teamId)); // F5 rebuilds robot
```
This reuses the existing token-reconnection path (lines 65-67) — no new resync protocol (RESEARCH "Don't Hand-Roll").

---

### `src/client/client.js` (MOD — component/view)

**Analog:** itself (`renderActiveSplitScreen`, lines 142-187) + `admin.js` grid-rebuild for the render-from-state discipline.

**1. The shell is already built.** `renderActiveSplitScreen` (lines 142-187) already creates `.action-panel` (left) and `iframe.preview-frame` with empty `srcdoc` (lines 166-170). The comment at lines 137-141 explicitly reserves this for Phases 2-5. This phase fills `.action-panel` with the calaix+tauler and populates the iframe `srcdoc`. **Do not rebuild the shell** — extend it when `state.phase === 'html'`.

**2. Lucide icon pattern** (lines 9, 178-181): `import { createElement, Lock } from 'lucide'` then `createElement(Icon)` + `setAttribute('width'/'height')`. Reuse for piece glyphs / hint arrow (`MoveRight`). Distractor glyphs use emoji per UI-SPEC (🍌🛞👟), not Lucide.

**3. DOM-text-only anti-XSS** (line 89 `btn.textContent = team.name; // DOM text API only`). All chip labels use `textContent`, never `innerHTML`. The **only** place HTML strings are used is the iframe `srcdoc`, and that path goes through DOMPurify (below).

**4. The render-decoupling — THE key new pattern (RESEARCH Pitfall 1 / Anti-Patterns).** Current `client.js` does full `clearApp()`+rebuild on every `session:full-state` (lines 67-71, 208-243). That teardown destroys live SortableJS instances. During the HTML phase:
- `session:full-state` → **surgical** update only (timer/frozen/N-8), no board teardown.
- new `team:board-state` handler → (re)build calaix+tauler + re-init SortableJS + re-assemble preview.

Add the board handler in `bootClient()` alongside the existing `socket.on('session:full-state', ...)` (lines 267-273):
```javascript
socket.on(EVENTS.TEAM_BOARD_STATE, ({ placement }) => {
  latestPlacement = placement;
  if (latestState?.phase === 'html') { renderBoardAndDrawer(placement); assemblePreview(placement); }
});
```
Note: `client.js` currently uses **string literals** for socket events (`'session:full-state'`, `'team:select'`, lines 253-277) while the server imports `EVENTS`. For new events, **import `EVENTS` from the shared module** (matches the events.js header rule; the string-literal usage in client is legacy and should not be extended for the new protocol).

**5. Frozen handling (D-11, RESEARCH Pitfall 4):** the overlay (lines 175-183) is `pointer-events: none` (visual only). When `state.timerStatus === 'frozen'`, additionally call `sortable.option('disabled', true)` on every instance — surgically inside the `session:full-state` handler, without board teardown.

**6. SortableJS init (GAME-03)** — new code, no repo analog; copy RESEARCH Pattern 1 (lines 176-212): one Sortable per slot (`group.put` type-check + `emptyInsertThreshold: 40` magnet), calaix as origin, native revert = rebound. Emit `TEAM_PLACE_PIECE`/`TEAM_REMOVE_PIECE` intents in `onAdd`.

**7. DOMPurify preview assembly (Pattern 3, Pitfall 2)** — new code. Assemble from `SLOTS[].html` only (never user text, GAME-06), sanitize with explicit `ALLOWED_ATTR: ['src','alt','class','id']` + `ADD_TAGS: ['output']` (ids/classes MUST survive for Phase 4 scoring), then `frame.setAttribute('srcdoc', ...)`. Iframe stays `sandbox="allow-same-origin"` (no `allow-scripts`, line 168 unchanged).

---

### `src/client/client.css` (MOD — style)

**Analog:** itself + `tokens.css`.

**Pattern to copy** (whole file, lines 1-84): tokens-only, no hex/px literals (header comment lines 1-3 mandate this; UI-SPEC §Token strategy). New classes (`.calaix`, `.slot`, `.slot-frame`, `.piece-chip`, `.piece-chip--distractor`, `.progress-pieces`, `.drag-hint`) reference `var(--*)` exclusively.

- **Phase-scoped color:** use `var(--phase-html)` for progress fill / valid-drop ring / accept pulse (UI-SPEC §Color). Same `[data-phase='html']` selector idiom already in `client.css:17-19` and `tokens.css:114-116`. **Never** use `--color-accent` on the team screen (reserved for admin CTA).
- **Hit target:** every chip/slot ≥ `var(--hit-target-min)` (44px) — same idiom as `.team-select-btn` (lines 52-53 in client.js styles) and `.btn` (admin.js:61).
- **Reduced-motion:** wrap accept-pulse / distractor-shake / hint-loop in `@media (prefers-reduced-motion: no-preference)` — copy the exact pattern from `tokens.css:97-101` (`.timer-display.timer-critical` pulse).

---

### `src/client/shared/tokens.css` (MOD — design tokens)

**Analog:** itself (`:root` block, lines 4-55).

**Pattern to copy** — add new custom properties inside `:root`, following the existing grouped-with-comment layout (e.g. the "Phase color-coding" group lines 47-51). UI-SPEC §Motion + §Typography specify exactly:
```css
--font-family-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
--motion-snap: 150ms;
--motion-ease: cubic-bezier(0.2, 0, 0.2, 1);
```
`--phase-html: #E44D26` already exists (line 48) — reuse, do not redeclare.

---

### `src/client/public/{antena,orella,fons}.png` (NEW — assets)

**No analog** — no `public/` directory exists (verified). Vite `root` is `src/client` (vite.config.js), so a `src/client/public/` dir is served at web root `/`. Assets referenced root-relative (`/antena.png`) per RESEARCH Pitfall 3 / A5. **Planner must create this as an explicit task**; provisional SVG/emoji placeholders are the documented fallback (RESEARCH §Environment Availability) so mechanics can be built before final art exists.

---

### `test/placement.test.js` (NEW — test)

**Analog:** `test/roundtrip.test.js` — copy its entire harness.

**Patterns to copy:**
- Real server on ephemeral port (`startServer(0)`, lines 14-19) + `before`/`after` teardown (lines 14-23).
- `connectAndAwait(auth, firstEvent)` race-safe connect helper (lines 39-45) — register listeners in the same sync tick before any `await` (comment lines 33-38 explains the Socket.io race).
- `once()`/`wait()` helpers (lines 25-31).
- **V4 negative test** idiom (Test E, lines 127-137): assert a team socket **cannot** mutate another team's board (forge `teamId` in payload → server ignores it, uses `socket.data.teamId`).
- **State-projection assertions** (Test C, lines 100-107): assert `progress` shape `{placed, total:8}` and that raw board is not leaked via `session:full-state`.

New assertions to add: place-piece round-trip emits `team:board-state` to the owner only (not to `session`); F5/reconnect re-emits the board (CORE-03); RESEARCH Assumptions A1 (SortableJS revert) and A2 (DOMPurify preserves `id`/`<output>`) get a quick manual/asserted check at Wave 0.

---

### `package.json` (MOD — deps)

**Analog:** itself (exact-pinned deps, all fixed versions, no ranges).

Add to `dependencies`, exact-pinned to match the existing style (`socket.io: "4.8.3"`, no `^`):
```
"sortablejs": "1.15.7",
"dompurify": "3.4.11"
```
Both verified on npm registry, no postinstall (RESEARCH §Package Legitimacy). DOMPurify's `SUS`/`too-new` flag is a false positive (cure53, ~45M dl/wk) — planner may skip `checkpoint:human-verify` but must record the reasoning in the PLAN (RESEARCH line 109).

---

## Shared Patterns

### Authoritative state on server, client renders only
**Source:** `src/server/gameState.js` (whole) + `src/client/client.js:1-6` header ("Tot es deriva EXCLUSIVAMENT de session:full-state — el client mai decideix una transicio pel seu compte").
**Apply to:** `gameState.js`, `socketHandlers.js`, `client.js`. The board is authoritative on the server; the client DOM after a drag is *optimistic* and reconciles against `team:board-state` (RESEARCH Anti-Pattern "Confiar en el DOM local").

### Mutation-returns-bool → broadcast-only-on-change
**Source:** `src/server/gameState.js` — `claimTeam` (30-36), `pauseTimer` (87-93), all return false on no-op. Callers broadcast only when `true` (socketHandlers.js:130, 142).
**Apply to:** `placePiece`/`removePiece` in `gameState.js` and their handlers. No-op place (slot occupied) / no-op remove (slot empty) → no broadcast → natural anti-storm guard.

### V4 access control — identity from socket, never payload
**Source:** `src/server/socketHandlers.js` — admin handlers re-check `socket.rooms.has('admin')` (line 105, 125, 139…); identity middleware sets `socket.data.teamId` (lines 45-51).
**Apply to:** every `team:*` handler — derive `teamId` from `socket.data.teamId`, ignore any payload `teamId` (RESEARCH Security V4).

### safeHandler wrapping (DoS guard on shared process)
**Source:** `src/server/socketHandlers.js:16-25` — wrap every handler so one thrown exception can't crash the shared Node process.
**Apply to:** both new handlers, exactly as the admin handlers do.

### Explicit token-free projection
**Source:** `src/server/gameState.js:49-64` (`getPublicState`) — destructure-and-map, never spread raw team, never emit token.
**Apply to:** the `progress` addition (broadcast-safe count) and the separate `getTeamBoard` (directed-only, never in `getPublicState`). Guarded by `roundtrip.test.js:106`.

### Directed emit vs session broadcast (anti re-render storm)
**Source:** `src/server/socketHandlers.js:184-193` (`ADMIN_FORCE_RESYNC`) already emits **only** to `team:${teamId}`, never session — the exact precedent for directed emits (comment lines 179-183).
**Apply to:** `team:board-state` (→ `team:${teamId}`) and the placement count (→ `admin`). **Never** `io.to('session')` for placements. This is RESEARCH's #1 pitfall.

### Tokens-only styling (no literals)
**Source:** `src/client/client.css:1-3` header + every rule; `src/client/shared/tokens.css` `:root`.
**Apply to:** all new CSS. New tokens declared in `tokens.css`, consumed via `var(--*)` in `client.css`.

### DOM-text-only anti-XSS (client)
**Source:** `src/client/client.js:89` + `admin.js:328` (`textContent`, "DOM text API only").
**Apply to:** all chip/label rendering. The sole HTML-string path (iframe `srcdoc`) is gated by DOMPurify (defense-in-depth; iframe has no `allow-scripts`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/client/public/{antena,orella,fons}.png` | asset | file-I/O | No `public/` dir exists; assets don't exist. Explicit create/placeholder task (RESEARCH §Environment Availability). |
| SortableJS init block (inside `client.js`) | glue | drag gesture | No drag & drop anywhere in the repo. Use RESEARCH Pattern 1 (lines 176-215) — near-1:1 config, minimal custom code. |
| DOMPurify assembly (inside `client.js`) | glue | transform | No HTML-assembly/sanitize path exists (Phase 1 iframe `srcdoc` was empty). Use RESEARCH Pattern 3 (lines 262-291); verify `id`/`<output>` survive (Pitfall 2 / A2). |

These three have **no code analog** but have complete, codebase-verified recipes in `02-RESEARCH.md`. The surrounding scaffolding (where they plug in) is fully analogous — the shell, the socket wiring, and the render loop all exist.

---

## Metadata

**Analog search scope:** `src/server/`, `src/client/`, `src/client/shared/`, `test/`, `vite.config.js`, `package.json`.
**Files scanned (read in full):** `client.js`, `admin.js`, `client.css`, `shared/tokens.css`, `gameState.js`, `socketHandlers.js`, `events.js`, `test/roundtrip.test.js`, `vite.config.js`, `package.json`.
**Pattern extraction date:** 2026-07-02
