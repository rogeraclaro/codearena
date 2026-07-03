---
phase: 02-joc-fase-html-blocs-drag-drop
reviewed: 2026-07-03T11:36:56Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/client/admin.js
  - src/client/client.css
  - src/client/client.js
  - src/client/public/antena.svg
  - src/client/public/fons.svg
  - src/client/public/orella.svg
  - src/client/shared/tokens.css
  - src/server/events.js
  - src/server/gameState.js
  - src/server/socketHandlers.js
  - src/shared/robotTemplate.js
  - test/placement.test.js
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-03T11:36:56Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the Phase 02 "Fase HTML: blocs drag & drop" implementation — server-side game state and socket handlers, the shared robot template, the admin and team client apps, their styling, and the placement integration test. The drag/drop placement round-trip itself (server-side type/direction/inventory validation, directed board-state emission, F5 recovery) is solid and well covered by `test/placement.test.js`. Anti-XSS handling (`textContent`-only rendering, DOMPurify + restrictive `ALLOWED_ATTR`, sandboxed iframe without `allow-scripts`) is consistently applied.

Two blocker-level issues were found: an unauthenticated admin role escalation (any client can self-declare `role: 'admin'` in the socket handshake with zero credential check, gaining full session control), and a real data-loss bug in `admin.js` where the entire admin panel — including any in-progress, unsent team-name text the teacher is typing — is torn down and rebuilt from scratch on every `session:full-state` broadcast, which fires very frequently during active gameplay (once per team piece placement/removal). Several further warnings cover a missing cumulative team cap, silent validation failures, and drag/reconciliation race conditions.

## Critical Issues

### CR-01: Admin role is granted with zero authentication

**File:** `src/server/socketHandlers.js:39-56`
**Issue:** The Socket.io connection middleware grants full admin privileges purely based on a client-supplied handshake flag, with no credential check whatsoever:

```js
io.use((socket, next) => {
  try {
    const { token, role } = socket.handshake.auth || {};
    if (role === 'admin') {
      socket.data.isAdmin = true;
    }
    ...
```

Every `admin:*` handler downstream (`ADMIN_REGISTER_TEAMS`, `ADMIN_START_PHASE`, `ADMIN_NEXT_PHASE`, `ADMIN_TIMER_PAUSE/RESUME/EXTEND`, `ADMIN_FORCE_RESYNC`) only re-checks `socket.rooms.has('admin')` (socketHandlers.js:108, 128, 142, 154, 164, 174, 190) — which is joined purely as a consequence of `socket.data.isAdmin` being true. The comments describe this as "V4 Access Control" (never trust a client-sent role flag), but the flag *is* trusted: nothing on the server verifies the connecting client is actually the teacher. Any browser (a student's laptop on the classroom LAN, or anyone who can reach the deployed URL, per the project's own "VPS propi rere Nginx" deployment note) can open devtools and connect with `io(url, { auth: { role: 'admin' } })` to seize full control of the session — register/deregister teams, force every team's PC to reload, pause/extend the timer, etc.
**Fix:** Require a real credential — e.g. a shared session secret set via env var, verified against the handshake auth before granting `socket.data.isAdmin`:

```js
const ADMIN_SECRET = process.env.ADMIN_SECRET;

io.use((socket, next) => {
  try {
    const { token, role, adminSecret } = socket.handshake.auth || {};
    if (role === 'admin') {
      if (!ADMIN_SECRET || adminSecret !== ADMIN_SECRET) {
        return next(new Error('unauthorized'));
      }
      socket.data.isAdmin = true;
    }
    ...
```

### CR-02: Admin panel full re-render wipes in-progress team-name input (data loss)

**File:** `src/client/admin.js:372-399`
**Issue:** `renderAdmin()` is bound as the handler for *every* `session:full-state` event (line 398: `socket.on('session:full-state', (state) => renderAdmin(socket, state));`), and unconditionally does `app.textContent = ''` (line 374) before rebuilding the entire admin UI from scratch, including a brand-new `<textarea id="team-names-input">` inside `buildRegistrationBlock()` (admin.js:275-306).

`session:full-state` is broadcast to the `'admin'` room far more often than "an admin action" — in particular, `socketHandlers.js` emits it to `'admin'` on **every successful piece placement and removal** by *any* team during Phase 1 (`socketHandlers.js:215` and `:235`), which can fire dozens of times per minute while 4-6 teams are actively dragging pieces. Because the registration block is rendered unconditionally (not gated on team count or phase), any text the teacher has typed into the "Noms dels equips" textarea — e.g. adding a late-arriving team while the class is already playing — is silently discarded the instant any team places or removes a piece elsewhere. There is no debounce, no diffing, and no preservation of focused-input state across re-renders.
**Fix:** Either avoid full-DOM teardown on unrelated broadcasts, or explicitly preserve the textarea's live value/focus across re-renders, e.g.:

```js
function renderAdmin(socket, state) {
  const app = document.getElementById('app');
  const existingInput = document.getElementById('team-names-input');
  const preservedValue = existingInput ? existingInput.value : '';
  const hadFocus = document.activeElement === existingInput;

  app.textContent = '';
  // ...build as before...
  const newInput = document.getElementById('team-names-input');
  newInput.value = preservedValue;
  if (hadFocus) newInput.focus();
}
```
A more robust fix is to render the registration block once and only update the team grid/control bar on subsequent broadcasts (diff-based update) rather than rebuilding the whole `#app` subtree every time.

## Warnings

### WR-01: No cumulative cap on registered teams across multiple `admin:register-teams` calls

**File:** `src/server/socketHandlers.js:27-36`, `src/server/gameState.js:24-31`
**Issue:** `isValidTeamNamesPayload` (socketHandlers.js:27-36) enforces `names.length <= MAX_TEAMS` (6) *per call*, and `gameState.registerTeams` (gameState.js:24-31) unconditionally `.set()`s new team entries into `state.teams` with no check against the *existing* team count. Calling `admin:register-teams` a second time (e.g. the teacher adds one more late team via a second textarea submission) can push the total past the project's documented 4-6 team ceiling, with no server-side guard and no de-duplication of repeated names.
**Fix:** Validate against the cumulative count in `registerSocketHandlers` before calling `gameState.registerTeams`:
```js
if (!isValidTeamNamesPayload(names)) return;
if (gameState.getPublicState().teams.length + names.length > MAX_TEAMS) return;
```

### WR-02: Silent failure on invalid `admin:register-teams` payload

**File:** `src/server/socketHandlers.js:105-117`
**Issue:** When `isValidTeamNamesPayload(names)` returns `false` (e.g. the admin pastes more than 6 lines, or a name exceeds 40 characters), the handler simply `return`s — no error event is emitted back to the admin socket. The teacher clicks "Registrar", the textarea clears client-side regardless (admin.js:299, unconditional on click, not on a server ack), and nothing appears to have happened, with no indication of why.
**Fix:** Emit a rejection event the admin UI can surface, and/or don't clear the textarea until a success ack is received:
```js
if (!isValidTeamNamesPayload(names)) {
  socket.emit('admin:register-teams-rejected', { reason: 'invalid-payload' });
  return;
}
```

### WR-03: Reconciliation mid-drag can destroy the active SortableJS instance

**File:** `src/client/client.js:604-624, 678-684`
**Issue:** `mountGame()` unconditionally calls `destroySortables()` (line 605) and rebuilds the calaix/tauler DOM from scratch every time `renderBoardAndDrawer()` runs, which happens on every incoming `team:board-state` event for the same team (client.js:874-880) — i.e. after every one of that team's own placement/removal round-trips. If the team starts a second drag before the board-state response for the first drag has come back (plausible under classroom WiFi contention with 4-6 devices sharing the AP, even though LAN latency is usually low), the currently-active `Sortable` instance is destroyed while a drag gesture is in flight, which can abort the drag mid-gesture or throw from SortableJS's internal handlers referencing now-detached DOM nodes.
**Fix:** Guard the rebuild so it doesn't tear down a Sortable instance mid-interaction, e.g. skip/rebuild only after a small `requestAnimationFrame`/idle check, or track an `isDragging` flag set in `onStart`/cleared in `onEnd` and defer the incoming board-state's rebuild until the drag settles.

### WR-04: No client-side reconciliation when the server silently rejects a placement

**File:** `src/client/client.js:559-599`, `src/server/gameState.js:85-95`
**Issue:** SortableJS's `put` predicate on each slot (client.js:564-565) already visually accepts a drop (moving the DOM node) client-side before the server has validated anything. `gameState.placePiece` (gameState.js:85-95) is a "mutation-returns-bool" function: on rejection (e.g. a slot-occupancy or inventory race) it returns `false` and `socketHandlers.js` intentionally does **not** emit `team:board-state` in that case (by design, to avoid a broadcast storm — see socketHandlers.js:213-217). This means that in the rare case a client-side-accepted drop is rejected server-side, the client's DOM is left showing the piece as placed with no signal ever correcting it, until some *other* mutation happens to trigger a fresh board-state.
**Fix:** Have the server emit an explicit rejection event (targeted to the team) so the client can revert the optimistic DOM change, e.g. `socket.emit(EVENTS.TEAM_PLACE_REJECTED, { slotId })` and have the client re-request/re-render from the last known-good `latestPlacement` on receipt.

### WR-05: Full iframe `srcdoc` replacement on every single piece placement/removal

**File:** `src/client/client.js:629-673`
**Issue:** `assemblePreview()` calls `frame.setAttribute('srcdoc', wrapPreview(clean))` (line 672) on every placement and removal (up to 8 times per team during Phase 1), which forces the sandboxed iframe to fully reload — reparsing the whole document and re-fetching the external Unsplash background image (client.js:640) — instead of patching just the newly placed/removed element. This causes a visible preview flash/reset after every single drag, rather than a smooth incremental update.
**Fix:** Consider mutating the existing iframe document's DOM directly (via `contentDocument`, still same-origin per the `allow-same-origin` sandbox flag) instead of resetting `srcdoc` wholesale, reserving the full `srcdoc` rebuild for phase/screen transitions only.

## Info

### IN-01: Stale comment on `TEAM_REMOVE_PIECE` event constant

**File:** `src/server/events.js:17`
**Issue:** `TEAM_REMOVE_PIECE: 'team:remove-piece', // declarat aquí; s'implementa al Pla 02` — the comment describes the handler as not-yet-implemented ("gets implemented in Plan 02"), but it is fully implemented in this same phase's `socketHandlers.js:226-238` and covered by `test/placement.test.js`.
**Fix:** Update or remove the stale forward-reference comment now that the feature is shipped.

### IN-02: Dead default parameter in `extendTimer`

**File:** `src/server/gameState.js:156`
**Issue:** `function extendTimer(ms = 60000)` declares a default, but its only caller (`socketHandlers.js:175`, `const ms = Number.isFinite(payload?.ms) ? payload.ms : 60000;`) always resolves `ms` to a finite number before invoking `gameState.extendTimer(ms)`, so the function-level default is unreachable dead code.
**Fix:** Drop the default from `extendTimer`'s signature, or centralize the `60000` fallback constant in one place (e.g. export it from `gameState.js` and have `socketHandlers.js` import it) rather than duplicating the magic number in both files.

---

## Remediation

Both **critical** findings were fixed on 2026-07-03. The 5 warnings (WR-01…WR-05)
and 2 info items (IN-01, IN-02) are explicitly deferred and remain open — the
frontmatter `status: issues_found` is left unchanged to reflect that.

| Finding | Status | Commit | Summary |
| ------- | ------ | ------ | ------- |
| CR-01 | Fixed | `5c8f341` | Admin role now requires a server-verified shared secret (`ADMIN_SECRET`). Connection middleware fail-closes when the secret is configured; dev/test fall back to open with a loud startup warning. Teacher enters the secret via an inline login form (localStorage-persisted, `connect_error`-driven retry). Regression test added in `test/adminAuth.test.js`; `ADMIN_SECRET` documented in `.env.example`. |
| CR-02 | Fixed | `6b13157` | `renderAdmin()` now captures the `#team-names-input` value + focus/selection before its full teardown and restores them after rebuild, so frequent `session:full-state` broadcasts no longer silently discard in-progress team names. |

_Remediation verified: `npm test` (34 passing, incl. 3 new auth tests) and `npm run build` clean._

---

_Reviewed: 2026-07-03T11:36:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
