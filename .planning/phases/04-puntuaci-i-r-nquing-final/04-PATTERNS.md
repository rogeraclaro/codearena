# Phase 04: Puntuació i rànquing final - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 10 (3 new, 7 modified)
**Analogs found:** 10 / 10 (all have strong in-repo analogs — this is an additive phase over Phases 1-3 code)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shared/scoring.js` (NEW) | utility (pure module) | transform | `src/shared/effects.js` | role-match (pure shared module reading `robotTemplate.js`) |
| `src/shared/robotTemplate.js` (MOD: add `CSS_TARGETS`) | config/model | — (frozen data) | `CSS_HOLES` block in same file (lines 234-292) | exact (same-file sibling constant) |
| `src/server/gameState.js` (MOD: `buildRanking`/`htmlTimeBonuses`/`finalizeGame`, gate `markPhaseDone`) | model/store | CRUD/transform | `markPhaseDone`/`getPublicState` in same file | exact (same-file mutation-returns-bool convention) |
| `src/server/socketHandlers.js` (MOD: `ADMIN_FINALIZE_GAME`, partial ranking, D-07 gate, D-08/09 removal) | controller/route | event-driven (request-response) | `ADMIN_FORCE_RESYNC` + `TEAM_MARK_DONE` handlers | exact (same-file handler shape) |
| `src/server/events.js` (MOD: add event names) | config | — | existing `EVENTS` frozen block | exact (same-file) |
| `src/client/client.js` (MOD: results branch + ceremony; gate finish btn) | component | event-driven render | `renderScreenForState` + `renderFinishButton` + `socket.on(EVENTS.*)` handlers | exact (same-file render machine) |
| `src/client/admin.js` (MOD: mini-ranking + ceremony + finalize CTA) | component | event-driven render | `buildControlBar` (ctaBtn) + `showResyncConfirm` + `renderAdmin` | exact (same-file) |
| `src/client/client.css` (MOD: ceremony/results/confetti styles) | config/styles | — | `.finish-phase-btn` + `@keyframes js-rule-enter` + reduced-motion block | exact (same-file token discipline) |
| `test/scoring.test.js` (NEW) | test | unit (pure) | `test/effects.test.js` | exact (pure shared-module unit test) |
| `test/results.test.js` (NEW) | test | integration (event-driven) | `test/cssPhase.test.js` | exact (real-server socket round-trip harness) |

---

## Pattern Assignments

### `src/shared/scoring.js` (NEW — utility, transform)

**Analog:** `src/shared/effects.js` (pure module: imports vocab/targets from `robotTemplate.js`, no socket, no `gameState` coupling, `Object.freeze` tables, own-property guard).

**Imports pattern** (copy from `effects.js:12`, `robotTemplate.js:12-21`):
```javascript
import { SLOTS, CSS_HOLES, CSS_TARGETS, JS_EVENTS, JS_ELEMENTS, JS_ROW_LIMIT } from './robotTemplate.js';
```
Import only what you consume. RESEARCH §Code Examples already gives the exact `scoreHtml/scoreCss/scoreJs/computeGlobal/htmlTimeBonuses` bodies — copy those.

**Own-property / safe-lookup guard** (copy from `effects.js:16`, mirrored in `gameState.js:165-167`):
```javascript
const own = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
```
Use when reading `cssValues[holeId]`/vocab tables so a crafted key like `__proto__` can't resolve to an inherited method.

**Frozen constant tables** (copy `WEIGHTS` as `Object.freeze`, per code_context "Vocabulari/estructures frozen"):
```javascript
export const WEIGHTS = Object.freeze({ html: 0.30, css: 0.60, js: 0.10 });
```

**Purity contract** (from `effects.js` header + RESEARCH Pattern 1): no I/O, no socket, no `Date.now()` inside the score math except where RESEARCH explicitly reads `team.doneAt`. Functions take team state as arguments and return `{ pct, subchecks[] }`. This is what makes `scoring.test.js` a fast pure unit.

---

### `src/shared/robotTemplate.js` (MOD — add `CSS_TARGETS`, config/model)

**Analog:** the `CSS_HOLES` block in the same file (lines 234-292) and the target-values comment (lines 234-240).

**Pattern to copy** — the exact target values already exist as a comment at lines 237-240; promote them to a machine-readable frozen map beside `CSS_HOLES`:
```javascript
// lines 237-240 (existing comment — the single documented source of the correct values):
// antena-bg=#e3f7fe · antena-border=#000000 · orella-top=95px · ulls-bg=#e3f7fe ·
// ulls-top=-40px · ulls-width=132% · ull-radius=50px · cap-bg=#a9c5da ·
// cap-border-color=#000000 · cap-border-width=6px · nas-radius=0% · nas-size=14px ·
// boca-height=95px · boca-width=90% · boca-dents=#fffcd3
```
Add (mirror the `Object.freeze` keyed-by-holeId shape of `CSS_HOLES` at line 241):
```javascript
export const CSS_TARGETS = Object.freeze({
  'antena-bg': '#e3f7fe', 'antena-border': '#000000', /* …one entry per CSS_HOLES key… */
});
```
**Pitfall 1 (RESEARCH):** do NOT hand-copy into `scoring.js`; extract once here, update the comment to point at it. Cross-check `Object.keys(CSS_TARGETS).length === Object.keys(CSS_HOLES).length` in a test (the header says "16" but the object has 15 keys — Open Question 1).

---

### `src/server/gameState.js` (MOD — model/store, CRUD/transform)

**Analog:** `markPhaseDone` (lines 212-218) and `getPublicState` (lines 71-89), same file.

**Mutation-returns-bool + idempotence** (copy the `markPhaseDone` shape, lines 212-218) for `finalizeGame()`:
```javascript
function markPhaseDone(teamId, phase) {
  const team = state.teams.get(teamId);
  if (!team || !phase) return false;
  if (team.doneAt[phase]) return false; // ja marcat — no-op (anti-storm)
  team.doneAt[phase] = Date.now();
  return true;
}
```
`finalizeGame()` follows this exactly: returns `false` if already `state.finished` (idempotent — a second finalize is a no-op, kills the broadcast-storm DoS in RESEARCH §Security), sets the terminal flag + frozen ranking snapshot, returns `true`.

**D-07 gate — tighten `markPhaseDone`** (Pitfall 5): the current guard `if (state.phase !== 'html' …)` lives in the *callers* (`placePiece:105`), but `markPhaseDone` itself is phase-generic. Add an `html`-only + `isHtmlComplete(placement)` guard so no `doneAt.css`/`doneAt.js` can ever be written (D-08/D-09).

**Terminal state in the public projection** (copy `getPublicState` explicit-projection style, lines 71-89, Pitfall 3 "never broadcast raw state"): expose `finished: true` and the frozen final ranking so F5 during/after results replays cleanly (Pitfall 4, mirrors how `progress` is derived per-team at lines 83-86).

**Partial ranking hook** (D-13): `buildRanking(mask)` is called at the same `nextPhase` transition point (line 240) with unplayed phases masked to 0. Register all new functions in the exported `gameState` object (lines 294-315).

---

### `src/server/socketHandlers.js` (MOD — controller/route, event-driven)

**Analog:** `ADMIN_FORCE_RESYNC` (lines 217-226) for the admin-only + directed-emit shape; `TEAM_MARK_DONE` (lines 321-331) for the mutation-gated team emit; `TEAM_PLACE_PIECE` (lines 235-248) for per-team directed emission.

**Admin access-control + directed emit** (copy `ADMIN_FORCE_RESYNC`, lines 217-226) for `ADMIN_FINALIZE_GAME`:
```javascript
socket.on(
  EVENTS.ADMIN_FORCE_RESYNC,
  safeHandler((payload) => {
    if (!socket.rooms.has('admin')) return; // T-03-01: never trust a client-sent role flag
    const teamId = payload?.teamId;
    if (typeof teamId !== 'string' || !teamId) return;
    if (!gameState.getPublicState().teams.some((t) => t.id === teamId)) return;
    io.to(`team:${teamId}`).emit(EVENTS.TEAM_RELOAD);
  }),
);
```
For finalize: `if (!socket.rooms.has('admin')) return;` → `if (!gameState.finalizeGame()) return;` (mutation-returns-bool idempotent) → per-team filtered emit loop.

**D-10 privacy — per-team filtered emission** (copy the per-team directed emit from `TEAM_PLACE_PIECE:244` `io.to(\`team:${teamId}\`).emit(...)`). RESEARCH §Pattern 2 gives the exact loop: full ranking (id/name/globalPct) to everyone, `ownDetail` sub-checks only via `io.to('team:${row.id}')`. Never `io.to('session')` for sub-checks (Anti-Pattern in RESEARCH).

**Partial ranking on phase transition** (D-12/D-13): hook the same point as `ADMIN_NEXT_PHASE` (lines 169-179); emit the partial mini-ranking to `io.to('admin')` ONLY.

**D-07 gate at `TEAM_MARK_DONE`** (lines 321-331): the handler already derives phase from `getPublicState()` (never payload) — extend it to reject unless `isHtmlComplete`. **D-08/D-09:** the client stops rendering the CSS/JS finish button; the server-side hardening is the `markPhaseDone` `html`-only guard above.

**Every handler:** wrap in `safeHandler` (lines 16-25), identity from `socket.data.teamId` never payload (V4), admin re-check `socket.rooms.has('admin')` (V4).

---

### `src/server/events.js` (MOD — config)

**Analog:** the existing `EVENTS` frozen object (whole file). Add new names inside the same `Object.freeze({…})` block, grouped under the existing `// Server -> Client` comment. Follow the naming convention: `ADMIN_FINALIZE_GAME: 'admin:finalize-game'`, `CEREMONY_START: 'game:ceremony-start'`, `GAME_RESULTS: 'game:results'`, `ADMIN_PARTIAL_RANKING: 'admin:partial-ranking'`. Header rule: "No event-name literal string should appear anywhere else" — client and server both import from here.

---

### `src/client/client.js` (MOD — component, event-driven render)

**Analog:** `renderScreenForState` (lines 1519-1562), `renderActiveSplitScreen` (1424-1498), the `socket.on(EVENTS.*)` block (1597-1660), `renderFinishButton` (1373-1386).

**New results render branch** (copy the `if (!state.phase)` early-branch style in `renderScreenForState`, lines 1523-1528): add a terminal branch keyed on `state.finished` (or `state.phase === 'results'`) that tears down via `clearApp()` and renders the results screen. Consumes the authoritative payload only.

**New server->client listener** (copy `TEAM_DONE_STATE` handler shape, lines 1644-1660): a `socket.on(EVENTS.CEREMONY_START, …)` / `GAME_RESULTS` handler that stores the payload and drives the ceremony overlay. On F5 after finalize, `session:full-state` carries `finished` → skip ceremony, render final results directly (Pitfall 4).

**Ceremony driven by ONE broadcast** (Anti-Pattern: "Driving the ceremony from per-client timers"): the single `CEREMONY_START` payload starts a local `setTimeout` chain using the UI-SPEC ms table — do NOT let each client start an independent countdown.

**D-07 finish-button gate** (modify `renderFinishButton`, lines 1373-1386): current button is enabled unless `isPhaseDone`. Add `button.disabled = done || !isHtmlComplete(latestPlacement)`. Remove the `renderFinishButton('css')` call at line 1457 (D-08); never add one for JS (D-09 — already absent).
```javascript
// lines 1450-1458 (current — line 1457 is the D-08 removal target):
if (state.phase === 'html') {
  gameContainer = document.createElement('div');
  gameContainer.className = 'html-game';
  panel.appendChild(gameContainer);
  panel.appendChild(renderFinishButton('html'));   // KEEP + gate to 100%
} else if (state.phase === 'css') {
  panel.appendChild(renderCssPanel(latestCssValues));
  panel.appendChild(renderFinishButton('css'));     // DELETE (D-08)
}
```

**Confetti** (RESEARCH §Code Examples gives the exact dependency-free `fireConfetti` body): guard with `matchMedia('(prefers-reduced-motion: reduce)')`.

**Lucide icons** (copy import style, line 9 `import { createElement, Lock, MoveDown } from 'lucide'`): add `Trophy`, `Check`/`CircleCheckBig`, `Circle`/`Minus`; render via `createElement(Icon)` (see `updateFrozenOverlay:1398`).

---

### `src/client/admin.js` (MOD — component, event-driven render)

**Analog:** `buildControlBar` ctaBtn (lines 268-279), `showResyncConfirm` (204-243), `renderAdmin` (405-451), `buildTeamCard`/`team-grid` (358-436).

**Finalize CTA repurpose** (modify `buildControlBar`, lines 268-279): when `state.phase === 'js'` (last phase), change ctaBtn label to `"Finalitzar i Mostrar Resultats"` and emit the finalize event instead of `admin:next-phase`. Keep `.btn btn-accent`:
```javascript
const ctaBtn = document.createElement('button');
ctaBtn.type = 'button';
ctaBtn.className = 'btn btn-accent';
ctaBtn.textContent = state.phase ? 'Següent fase' : 'Iniciar Fase';
ctaBtn.addEventListener('click', () => {
  if (state.phase) socket.emit('admin:next-phase', { durationMs: PHASE_DURATION_MS });
  else socket.emit('admin:start-phase', { phase: 'html', durationMs: PHASE_DURATION_MS });
});
```

**Finalize confirmation** (copy `showResyncConfirm`, lines 204-243 — the `<dialog class="confirm-dialog">` promise pattern verbatim): message "Vols finalitzar la partida? Es mostraran els resultats a totes les pantalles." / confirm "Finalitzar" / cancel "Cancel·lar" (Copywriting Contract).

**Admin mini-ranking element** (copy `buildTeamCard`/`team-grid` DOM-building style, lines 358-436, and add to `renderAdmin`'s container assembly at lines 422-436): a `.admin-mini-rank` list-with-bar rendered on the partial-ranking broadcast, emitted admin-only.

**Ceremony overlay** (shared with client): same DOM/CSS as `client.js`, driven by the same `CEREMONY_START` broadcast so admin and teams stay in lockstep.

**F5-safe re-render** (note the `renderAdmin` input-preservation pattern, lines 414-450): the whole panel is torn down and rebuilt on every `session:full-state` — new surfaces must survive that, deriving purely from the latest broadcast.

---

### `src/client/client.css` (MOD — config/styles)

**Analog:** `.finish-phase-btn` (lines 312-330), `@keyframes js-rule-enter` + reduced-motion block (lines 544-557), `injectStyles` token discipline (`client.js:169-195`).

**Token-only rule** (file header line 2: "Nomes tokens de shared/tokens.css"): every new selector (`.results-screen`, `.rank-row`, `.rank-bar`, `.subcheck-group`, `.subcheck-item`, `.admin-mini-rank`) references `var(--*)`. **Single sanctioned exception:** the six chillón countdown colors live ONLY inside `.ceremony-overlay`, as literals, never added to `tokens.css` (UI-SPEC Color §exception + Containment invariant).

**Keyframe + reduced-motion wrapper** (copy the exact structure at lines 544-557):
```css
@keyframes js-rule-enter {
  from { opacity: 0; transform: translateY(calc(-1 * var(--space-sm))); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: no-preference) {
  .js-rule--enter { animation: js-rule-enter var(--motion-snap) var(--motion-ease); }
}
```
Wrap ALL ceremony motion (countdown zoom/fade, reveal stagger, confetti fall) in `@media (prefers-reduced-motion: no-preference)`; under reduced motion the ranking renders at final values instantly (UI-SPEC Motion §reduced motion).

**Disabled-button state** (copy `.finish-phase-btn:disabled`, lines 327-330 → `background: var(--color-muted)`): reuse for the gated HTML finish button (D-07) — no new error color.

---

## Shared Patterns

### `safeHandler` wrapper (all new socket handlers)
**Source:** `src/server/socketHandlers.js:16-25`
**Apply to:** `ADMIN_FINALIZE_GAME` and any new server-side listener.
```javascript
function safeHandler(fn) {
  return (...args) => {
    try { fn(...args); }
    catch (err) { console.error('[socketHandlers] handler error:', err); }
  };
}
```

### V4 access control + identity-from-socket (all new handlers)
**Source:** `src/server/socketHandlers.js:138` (admin) and `:238` (team)
**Apply to:** finalize (admin-room re-check), any team-scoped read (`socket.data.teamId`, never payload).
```javascript
if (!socket.rooms.has('admin')) return;      // admin handlers
const teamId = socket.data.teamId; if (!teamId) return;  // team handlers
```

### Mutation-returns-bool → emit only on real change (all new gameState mutators)
**Source:** `src/server/gameState.js:100-112` (`placePiece`), `:212-218` (`markPhaseDone`)
**Apply to:** `finalizeGame`, `markPhaseDone` gate. Caller emits only when the mutation returns `true` (anti-storm; also makes finalize-spam a no-op — DoS mitigation).

### Directed per-team emission for private data (D-10 privacy)
**Source:** `src/server/socketHandlers.js:244` (`io.to(\`team:${teamId}\`).emit(...)`)
**Apply to:** results payload — `ownDetail` sub-checks per `team:<id>`, ranking (names + global %) to all. Enforce at the emission layer, not the render (RESEARCH §Architecture: "data-shape contract").

### Frozen constants module (all new reference tables)
**Source:** `src/shared/robotTemplate.js:241` (`CSS_HOLES = Object.freeze(...)`), `events.js:5`
**Apply to:** `CSS_TARGETS`, `WEIGHTS`. Single source of truth; scoring derives, never duplicates (D-01 discipline; RESEARCH Pitfall 1).

### Real-server socket integration-test harness
**Source:** `test/cssPhase.test.js:23-71` (`startServer(0)`, `once`/`onceOrTimeout`/`connectAndAwait`, ordered round-trip)
**Apply to:** `test/results.test.js` — finalize round-trip, D-10 privacy (team B never receives team A `ownDetail`), partial ranking, F5 replay. `onceOrTimeout` makes a RED assertion fail fast instead of hanging.

### Pure-module unit test (no browser, no server)
**Source:** `test/effects.test.js` (whole file — `node:test` + `node:assert/strict`, imports the shared module directly)
**Apply to:** `test/scoring.test.js` — assert exact %s for known inputs (perfect Bender → 100% CSS; empty placement → 0% HTML; `CSS_TARGETS` count === `CSS_HOLES` count).

---

## No Analog Found

None. Every new file maps onto an existing in-repo pattern — this is an additive scoring/presentation phase over Phases 1-3, which already captured and validated every input the scoring engine needs (RESEARCH §Don't Hand-Roll "Key insight"). The one genuinely novel surface (the ceremony animation) has no behavioral analog but reuses the existing keyframe + reduced-motion CSS convention and the single-broadcast-drives-all-screens socket pattern.

## Metadata

**Analog search scope:** `src/shared/`, `src/server/`, `src/client/`, `test/`
**Files scanned:** 18 source + test files (full read: `events.js`, `gameState.js`, `socketHandlers.js`, `robotTemplate.js`, `effects.js`, `cssPhase.test.js`, `effects.test.js`; targeted read: `client.js`, `admin.js`, `client.css`)
**Pattern extraction date:** 2026-07-05
