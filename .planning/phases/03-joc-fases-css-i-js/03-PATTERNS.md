# Phase 3: Joc — Fases CSS i JS - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 8 (6 modified, 1 new test, 1 optional new pure module)
**Analogs found:** 8 / 8 — every file extends an existing sibling in the same repo

> Key insight (echoing RESEARCH.md): **every "new" capability here is a re-application of a tested pattern already in this repo.** There are no green-field files. `cssValues`/`jsRules` mirror `placement`; `setCssValue`/`setJsRules` mirror `placePiece`/`removePiece`; `TEAM_SET_CSS`/`TEAM_CSS_STATE` mirror `TEAM_PLACE_PIECE`/`TEAM_BOARD_STATE`; the CSS/JS panels mirror the HTML `mountGame` branch inside `renderActiveSplitScreen`. Planner should treat the analogs below as copy-from templates, not loose inspiration.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shared/robotTemplate.js` | model / config (frozen vocab) | transform (lookup tables) | `SLOTS`/`PIECES`/`CONTAINERS` in same file | exact (same module, same `Object.freeze` idiom) |
| `src/server/gameState.js` | store (authoritative state + mutators) | CRUD | `placePiece`/`removePiece`/`getTeamBoard` in same file | exact |
| `src/server/events.js` | config (event-name enum) | event-driven | `TEAM_PLACE_PIECE`/`TEAM_BOARD_STATE` in same file | exact |
| `src/server/socketHandlers.js` | controller (socket handlers) | request-response + event-driven | `TEAM_PLACE_PIECE` handler + connection block | exact |
| `src/client/client.js` | component (render + interpreter) | event-driven + streaming (live slider) | `renderActiveSplitScreen`/`assemblePreview`/`wrapPreview` | role-match (new sub-branch of existing split) |
| `src/client/client.css` | config (styles) | — | `.active-split`/`.action-panel` block | exact (extend existing tokens) |
| `src/client/admin.js` | component (progress card) | request-response | `buildTeamCard` progress branch | exact (D-22 = no change needed, verify only) |
| `test/effects.test.js` (+ cases in placement-style harness) | test | — | `test/placement.test.js` | exact (copy harness) |

---

## Pattern Assignments

### `src/shared/robotTemplate.js` (model / frozen vocab, transform)

**Analog:** the existing `SLOTS`, `PIECES`, `CONTAINERS`, `DISTRACTORS` exports in the same file.

**Frozen-constants pattern to copy** (`robotTemplate.js` lines 23-33, 153-164):
```js
export const SLOTS = Object.freeze([
  Object.freeze({ id: 'antena-esquerra', accepts: 'antena-esquerra', parent: 'section',
    html: '<div class="antena"></div>' }),
  // ...
]);
export const PIECES = Object.freeze([
  Object.freeze({ type: 'ull', count: 2 }),
  // ...
]);
```

**What to add (derive, never hand-duplicate — anti-pattern from RESEARCH §Anti-Patterns):**
- `CSS_HOLES` — frozen map `holeId -> { var, selector, validate(value)->bool, default }`. The `validate` fn is what `setCssValue` calls server-side (V5), analogous to how `placePiece` re-checks `slot.accepts`. Color holes validate `^#[0-9a-fA-F]{6}$`; slider holes validate numeric-in-range.
- `JS_EVENTS` / `JS_ELEMENTS` / `JS_ACTIONS` / `JS_COMPOSITE_ACTIONS` — frozen vocab keyed by closed dropdown values. Selector map from RESEARCH §JS Element→Selector Map (note `ull-esquerre`/`ull-dret` have **no id** → `.contenidor-ulls .ull:nth-of-type(1|2)`, and `.antena` has **no id** → class selector; this is already documented in the `SLOTS` html strings, so derive from them).

**Selector source-of-truth note:** the 8 JS elements (D-14) and 9 CSS holes must be **derived from / cross-checked against `SLOTS[].html` and `CONTAINERS`**, exactly as `pieceLabel()` (lines 104-130) already parses `slot.html` with regex rather than re-writing tag/class knowledge. Do not hand-list selectors that could drift from the real markup.

---

### `src/server/gameState.js` (store, CRUD)

**Analog:** `placePiece` (lines 85-95) + `removePiece` (lines 102-109) + `getTeamBoard` (lines 113-117) + team init (line 29) + `getPublicState` (lines 54-72).

**Team-init pattern** (line 29) — add the two new authoritative fields alongside `placement`:
```js
state.teams.set(id, { id, name, claimed: false, connected: false, placement: {} });
// → becomes: { ..., placement: {}, cssValues: {}, jsRules: [] }
```

**`mutation-returns-bool` mutator to copy** (`placePiece`, lines 85-95) — the exact shape `setCssValue`/`setJsRules` must follow (guard clauses → validate against frozen enum → no-op-if-unchanged → mutate → return true):
```js
function placePiece(teamId, slotId, pieceType) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'html' || state.timerStatus === 'frozen') return false; // GAME-07 / D-11
  const slot = SLOTS.find((s) => s.id === slotId);        // enum de la plantilla (V5)
  if (!slot || slot.accepts !== pieceType) return false;  // type-check server-side
  if (team.placement[slotId]) return false;               // no-op → no re-broadcast
  team.placement[slotId] = pieceType;
  return true;
}
```
`setCssValue` swaps `state.phase !== 'html'` for `!== 'css'`, `SLOTS.find` for `CSS_HOLES[holeId]`, and adds `if (team.cssValues[holeId] === value) return false;` as the no-op guard (RESEARCH Pattern 3). `setJsRules` swaps for `!== 'js'`, whole-array replace with the anti-repeat `Set` + `≤6` limit + composite⇒`desti=null` checks (RESEARCH Pattern 4).

**Private projection to copy** (`getTeamBoard`, lines 113-117) — shallow copy, never leak the live reference:
```js
function getTeamBoard(teamId) {
  const team = state.teams.get(teamId);
  if (!team) return { placement: {} };
  return { placement: { ...team.placement } };
}
```
Add `getTeamStyle(teamId) → { cssValues: {...} }` and `getTeamRules(teamId) → { jsRules: [...] }` in the same shape. Register all new functions in the `export const gameState = { ... }` object (lines 187-202).

**`getPublicState` progress — D-22 needs NO change** (lines 60-71): `progress` is already ternary `state.phase === 'html' ? {...} : null`, so for `css`/`js` it already returns `null`. Verify only; do not extend.

---

### `src/server/events.js` (config, event-driven enum)

**Analog:** the existing `TEAM_PLACE_PIECE`/`TEAM_REMOVE_PIECE` (client→server) and `TEAM_BOARD_STATE` (server→client) entries.

**Pattern to copy** (`events.js` lines 16-25) — add to the frozen `EVENTS` object, keeping the client→server vs server→client grouping and the "no literal event-name string anywhere else" rule:
```js
// --- Client -> Server (intents, never trusted blindly) ---
TEAM_PLACE_PIECE: 'team:place-piece',
// + TEAM_SET_CSS: 'team:set-css',
// + TEAM_SET_RULES: 'team:set-rules',

// --- Server -> Client (authoritative broadcasts, DIRECTED to team:<id>) ---
TEAM_BOARD_STATE: 'team:board-state',
// + TEAM_CSS_STATE: 'team:css-state',
// + TEAM_JS_STATE: 'team:js-state',
```

---

### `src/server/socketHandlers.js` (controller, request-response + event-driven)

**Analog:** `TEAM_PLACE_PIECE` handler (lines 226-239) + the connection recovery block (lines 85-94).

**Team-intent handler to copy** (lines 226-239) — identity from `socket.data.teamId` (V4, never payload), string-validate payload (V5), directed emit to owner + connection-only `SESSION_FULL_STATE` to admin (never `io.to('session')`, Pitfall 1):
```js
socket.on(
  EVENTS.TEAM_PLACE_PIECE,
  safeHandler((payload) => {
    const teamId = socket.data.teamId;                 // V4: identitat mai del payload
    if (!teamId) return;
    const slotId = payload?.slotId;
    const pieceType = payload?.pieceType;
    if (typeof slotId !== 'string' || typeof pieceType !== 'string') return;  // V5
    if (gameState.placePiece(teamId, slotId, pieceType)) {                    // mutation-returns-bool
      io.to(`team:${teamId}`).emit(EVENTS.TEAM_BOARD_STATE, gameState.getTeamBoard(teamId));
      io.to('admin').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState()); // conn-only
    }
  }),
);
```
`TEAM_SET_CSS` swaps `{slotId, pieceType}` for `{holeId, value}` (both strings), `placePiece`→`setCssValue`, `getTeamBoard`→`getTeamStyle`, `TEAM_BOARD_STATE`→`TEAM_CSS_STATE`. `TEAM_SET_RULES` takes `{rules}` (array, whole-array replace per RESEARCH A3), `setJsRules`, `getTeamRules`, `TEAM_JS_STATE`. Wrap both in `safeHandler` (lines 16-25).

**F5/reconnect recovery to copy** (connection block, lines 85-94) — the directed board emit on connection is the template for emitting `TEAM_CSS_STATE`/`TEAM_JS_STATE` on reconnect (CORE-03):
```js
} else if (socket.data.teamId) {
  gameState.setConnected(socket.data.teamId, true);
  socket.join(`team:${socket.data.teamId}`);
  socket.join('session');
  socket.emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
  socket.emit(EVENTS.TEAM_BOARD_STATE, gameState.getTeamBoard(socket.data.teamId));
  // + socket.emit(EVENTS.TEAM_CSS_STATE, gameState.getTeamStyle(socket.data.teamId));
  // + socket.emit(EVENTS.TEAM_JS_STATE, gameState.getTeamRules(socket.data.teamId));
  socket.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
}
```
Note: these three directed emits can fire on every reconnect regardless of phase — the client applies whichever is relevant to the active phase (harmless empty payloads otherwise).

---

### `src/client/client.js` (component, event-driven + streaming live slider)

**Analog:** `renderActiveSplitScreen` (lines 775-828) + `assemblePreview` (lines 705-726) + `wrapPreview` (lines 628-703) + the `socket.on(TEAM_BOARD_STATE)` handler (lines 927-933).

**Split-screen phase branch to extend** (lines 800-827) — today only `state.phase === 'html'` mounts a panel body; add `css` and `js` branches that fill `.action-panel` with `renderCssPanel()` / `renderJsPanel()` instead of `mountGame`:
```js
let gameContainer = null;
if (state.phase === 'html') {
  gameContainer = document.createElement('div');
  gameContainer.className = 'html-game';
  panel.appendChild(gameContainer);
}
// + else if (state.phase === 'css') panel.appendChild(renderCssPanel(...));
// + else if (state.phase === 'js')  panel.appendChild(renderJsPanel(...));
```

**Iframe is already scriptless and correct — do NOT touch the sandbox** (line 809). This is the single most security-load-bearing line for GAME-05/D-19; RESEARCH forbids adding `allow-scripts`:
```js
preview.setAttribute('sandbox', 'allow-same-origin'); // sense allow-scripts (T-02-01)
```

**srcdoc-once + live-update rewrite (Pattern 1 / Pitfall 1).** Today `assemblePreview` reassigns the whole `srcdoc` on every change (lines 724-725):
```js
const frame = document.querySelector('.preview-frame');
if (frame) frame.setAttribute('srcdoc', wrapPreview(clean));
```
For CSS this must become **build-once-per-phase-entry, then drive live via CSSOM** (RESEARCH Example 1/2). Slider `input` → local `applyCssHole` via `contentDocument.documentElement.style.setProperty(cssVar, value)` (instant, no reload); slider `change` → `socket.emit(TEAM_SET_CSS, ...)`. Keep full `srcdoc` reassembly ONLY for phase entry / F5 / structural change.

**`wrapPreview` CSS rewrite** (lines 628-703): the placeholder red-border block (lines 692-701, commented "D-13") is what this phase **replaces** with the definitive Bender CSS, every hole expressed as `var(--name, default)` (RESEARCH §Forat→var() Mapping, 16 controls). Source-of-truth fixed values live at `/Users/rogermasellas/Desktop/imparticio/index.html` lines 25-179 (read when implementing; 4 holes ⚠ need the micro-decision in RESEARCH §Open Questions). The `#robot-fons` background layer (lines 642-653) stays as-is (D-10 — the page background is NOT a hole).

**DOMPurify pipeline — unchanged** (`assemblePreview`, lines 719-722): still sanitize assembled markup before `srcdoc`; JS effects only touch `style`/`classList`/`visibility`, never `innerHTML`, so no new XSS surface.

**Directed-state client handler to copy** (`socket.on(TEAM_BOARD_STATE)`, lines 927-933) — the template for new `TEAM_CSS_STATE`/`TEAM_JS_STATE` listeners (store latest, apply if the phase is active):
```js
socket.on(EVENTS.TEAM_BOARD_STATE, ({ placement }) => {
  latestPlacement = placement || {};
  if (latestState?.phase === 'html' && boardMounted) {
    renderBoardAndDrawer(latestPlacement);
    assemblePreview(latestPlacement);
  }
});
```
New `TEAM_CSS_STATE` handler stores `cssValues`, and if `latestState?.phase === 'css'` calls `applyAllCssValues(cssValues)` (RESEARCH Example 1, applies on iframe `load`). `TEAM_JS_STATE` stores `jsRules` and re-attaches all rules on a fresh `srcdoc` rebuild (Pitfall 3 — rebuild-then-reattach avoids stale listeners).

**JS interpreter (Pattern 2, no eval).** `attachRule(doc, rule)` / `applyAction(doc, rule)` are new pure-ish functions keyed by the frozen `JS_ELEMENTS`/`JS_EVENTS`/`JS_ACTIONS`/`JS_COMPOSITE_ACTIONS`. Every DOM lookup null-guards (`if (!el) return;`) → GAME-07/D-19 no-op. Consider extracting `applyAction` to a pure module (e.g. `src/shared/effects.js`) so it is unit-testable without a browser (RESEARCH Example 4).

---

### `src/client/client.css` (config, styles)

**Analog:** `.active-split` / `.action-panel` / `.preview-frame` block (lines 36-61).

**D-21 exact 50/50 split — one-line change** (line 40):
```css
.active-split {
  grid-template-columns: minmax(280px, 40%) 1fr;   /* today: NOT 50/50 */
  /* → D-21: grid-template-columns: 1fr 1fr;  (exact 50/50, applies to ALL 3 phases) */
}
```
⚠ Cross-cutting: this changes HTML/Fase 2 layout too (D-21 says intentional). Flag for QA against the existing HTML phase.

**New tokenized styles to add** (follow the existing `--space-*`/`--color-*` token usage, lines 44-61): `.css-forat-group`, `.css-forat` (label + native `<input type=color|range>`), `.js-rule` (row of 4 `<select>` + "Veure" button), reusing `--phase-css`/`--phase-js` color tokens (UX-02, already in `tokens.css`). No new design tokens (RESEARCH §Project Constraints).

---

### `src/client/admin.js` (component, progress card) — VERIFY-ONLY per D-22

**Analog:** `buildTeamCard` progress branch (lines 370-377).

**Existing pattern already satisfies D-22** (lines 370-377) — progress renders only when `team.progress` is a non-null object, and `getPublicState` returns `null` for `css`/`js`, so the card automatically shows connection-only with no counter:
```js
const progressEl = document.createElement('div');
progressEl.className = 'team-card-progress';
if (team.progress && typeof team.progress.placed === 'number') {
  progressEl.textContent = `${team.progress.placed}/${team.progress.total} peces`;  // html only
}
```
**No code change expected.** Connection status (`statusIcon`, lines 192-197 / 366-368) already renders every phase. Add a QA assertion that during `css`/`js` the counter is absent but the status icon is present.

---

### `test/effects.test.js` + integration cases (test)

**Analog:** `test/placement.test.js` — the whole real-server, ephemeral-port, no-mocks harness (lines 19-67) and the ordered round-trip cases (lines 78-138).

**Harness to copy verbatim** (lines 19-67): `startServer(0)` in `before`, `httpServer.close` in `after`, `once`/`onceOrTimeout`/`connectAndAwait` helpers. `onceOrTimeout` (lines 49-57) is the key idiom for asserting a **no-broadcast** case (resolves `undefined` on timeout → RED fails fast).

**Round-trip case shape to copy** (lines 111-126) — OK case asserts the directed state event arrives; REJECT case asserts `onceOrTimeout` returns `undefined`:
```js
test('PLACE-OK: un place valid retorna team:board-state a l\'owner', async () => {
  const boardPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 800);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'antena-esquerra', pieceType: 'antena-esquerra' });
  const board = await boardPromise;
  assert.ok(board);
  assert.equal(board.placement['antena-esquerra'], 'antena-esquerra');
});
```
**New cases to author** (RESEARCH Example 4 + §Code Examples note): `SET-CSS-OK`, `SET-CSS-NOOP` (unchanged value → no broadcast), `SET-CSS-INVALID` (bad hex → no broadcast), `RULES-ANTIREPEAT-REJECT` (D-15), `RULES-LIMIT-REJECT` (≤6), `COMPOSITE-DESTI-NULL-REJECT` (D-17), `F5-CSS-JS-RECOVERY` (reconnect with token recovers `cssValues`/`jsRules`), plus the pure `effects.test.js` GAME-07 no-op tests using a stub `{ querySelector: () => null, querySelectorAll: () => [] }` doc.

---

## Shared Patterns

### `mutation-returns-bool` (anti-storm)
**Source:** `src/server/gameState.js` — `placePiece`/`removePiece` (lines 85-109), documented lines 83-84.
**Apply to:** `setCssValue`, `setJsRules`.
Return `true` only when state actually changed (including a `=== value` no-op guard for CSS). The socket handler emits **only** when the mutator returns `true`, which is what keeps the "one broadcast per real change" guarantee honest and prevents re-render storms.

### V4 identity + V5 validation
**Source:** `src/server/socketHandlers.js` — `TEAM_PLACE_PIECE` (lines 229-233).
**Apply to:** `TEAM_SET_CSS`, `TEAM_SET_RULES`.
```js
const teamId = socket.data.teamId;   // V4: NEVER from payload
if (!teamId) return;
if (typeof holeId !== 'string' || typeof value !== 'string') return;  // V5 typeof gate
```
The server then re-validates against frozen enums (`CSS_HOLES`, `JS_EVENTS`/`JS_ELEMENTS`/`JS_ACTIONS`) — never trust closed-vocab keys from the client (mirrors `SLOTS.find`/`slot.accepts`).

### Directed per-team emit (never `io.to('session')` for one team's work)
**Source:** `src/server/socketHandlers.js` — lines 234-237 (place) and 92-94 (connection recovery).
**Apply to:** all CSS/JS state broadcasts.
```js
io.to(`team:${teamId}`).emit(EVENTS.TEAM_CSS_STATE, gameState.getTeamStyle(teamId)); // owner only
io.to('admin').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());          // conn-only
```
Pitfall 2: a single team's CSS tweak must not re-render every other client.

### `safeHandler` wrapping (DoS via malformed payload)
**Source:** `src/server/socketHandlers.js` — `safeHandler` (lines 16-25).
**Apply to:** every new `socket.on(...)` handler. Wrap so a throw in one team's event never crashes the shared process.

### DOM-text-only / DOMPurify anti-XSS
**Source:** `src/client/client.js` `assemblePreview` (lines 719-722); `src/client/admin.js` `textContent` (line 364, 376).
**Apply to:** all CSS/JS panel labels (read-only `textContent`, never `innerHTML`, GAME-06) and any assembled preview markup. JS effects mutate `style`/`classList`/`visibility` only.

### Frozen-constants single-source-of-truth
**Source:** `src/server/events.js` (line 5), `src/shared/robotTemplate.js` (`Object.freeze` throughout).
**Apply to:** `CSS_HOLES`, `JS_*` vocab, new `EVENTS` entries. Derive selectors/elements from `SLOTS`/`CONTAINERS`, never hand-duplicate (like `pieceLabel()`).

---

## No Analog Found

None. Every file to be created or modified extends a directly-analogous sibling in this repo. The two areas with the *least* direct analog are still covered:

| Concern | Nearest analog | Note |
|---------|----------------|------|
| Live CSSOM `setProperty` on iframe `contentDocument` (streaming slider) | `assemblePreview` `srcdoc` reassign (lines 724-725) | Same iframe handle; the *strategy* changes (build-once + custom-property update) but the DOM entry point (`document.querySelector('.preview-frame')`) is identical. Not a missing pattern — a deliberate upgrade (RESEARCH Pitfall 1). |
| Parent-driven JS effect interpreter (frozen dispatch table) | `JS_ACTIONS` frozen map (new, RESEARCH Pattern 2) | No prior interpreter exists, but it is pure lookup-table code (~30 lines) with no eval; testable via the `placement.test.js` harness + a stub doc. |

---

## Metadata

**Analog search scope:** `src/shared/`, `src/server/`, `src/client/`, `test/`
**Files scanned:** `robotTemplate.js`, `gameState.js`, `events.js`, `socketHandlers.js`, `client.js`, `client.css`, `admin.js`, `placement.test.js` (all read this session)
**Out-of-repo reference (read when implementing, not this session):** `/Users/rogermasellas/Desktop/imparticio/index.html` lines 25-179 — definitive Bender CSS fixed values (RESEARCH A1: lives outside repo, may drift; copy needed rules into `wrapPreview()` to keep the phase self-contained)
**Pattern extraction date:** 2026-07-04
