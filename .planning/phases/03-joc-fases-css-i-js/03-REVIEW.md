---
phase: 03-joc-fases-css-i-js
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - test/cssPhase.test.js
  - src/shared/robotTemplate.js
  - src/server/gameState.js
  - src/server/events.js
  - src/server/socketHandlers.js
  - src/client/client.js
  - src/client/client.css
  - test/effects.test.js
  - test/jsPhase.test.js
  - src/shared/effects.js
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the CSS-phase and JS-phase vertical slices (server state, socket wiring,
shared vocab/effects modules, client rendering, and the accompanying integration
tests). The server-side validation for CSS holes and JS rules is solid — enum
checks, hex/range validators, anti-repeat, composite⇒null-destí, and the
directed-broadcast (never `io.to('session')`) discipline are all correctly
implemented and covered by the round-trip tests.

The one Critical finding is a real regression against the project's core
robustness requirement ("F5 no ha de perdre estat"): on an F5 reload or an
`admin:force-resync` while a team is already in the **CSS phase**, the preview
iframe is built from a stale, empty `placement` because the client processes
`session:full-state` (which eagerly bakes the robot markup into `srcdoc`)
*before* it has received/processed the directed `team:board-state` event that
carries the real, previously-placed pieces. The analogous recovery path exists
and works correctly for the HTML phase (`team:board-state` handler rebuilds the
board+preview when phase is `html`) and for the JS phase (its `team:js-state`
handler unconditionally rebuilds the whole preview via `rebuildJsPreview`), but
no equivalent rebuild exists for the CSS phase's `team:css-state` handler — it
only applies CSSOM custom properties and syncs panel inputs, assuming the DOM
elements they target already exist. They don't, because the markup was
assembled from an empty placement. This is exactly the reconnection scenario
(`CORE-03`) and the documented `ADMIN_FORCE_RESYNC` use case (`ADMIN-06`,
comment in `socketHandlers.js`) that the project explicitly calls out as
critical given the hard 15-20 minute session with no room to repeat.

A second, lower-severity but concrete bug: `setJsRules` in `gameState.js` is
documented ("mutation-returns-bool ... anti-storm, T-03-12") to only return
`true` when the ruleset actually changed, mirroring `setCssValue`/`placePiece`.
The implementation never compares against the previously-stored `jsRules` and
always returns `true` on any validation pass — so resending an identical,
already-stored ruleset still triggers a directed broadcast, unlike CSS/HTML.
`test/jsPhase.test.js` has no `RULES-NOOP` test (its sibling `cssPhase.test.js`
does have `SET-CSS-NOOP`), which is why this wasn't caught.

## Critical Issues

### CR-01: CSS-phase preview loses all placed pieces on F5 reconnect / force-resync

**File:** `src/client/client.js:1339-1345` (build), `src/client/client.js:1454-1460` (board-state handler, html-only), `src/client/client.js:1466-1471` (css-state handler never rebuilds markup)

**Issue:**
On a fresh page load while the authoritative phase is already `'css'` (F5
reload mid-session, or the admin's `ADMIN_FORCE_RESYNC` → `team:reload` →
`location.reload()` path, which is explicitly documented to rely on this exact
recovery flow), the client's `session:full-state` handler synchronously calls
`renderScreenForState` → `renderActiveSplitScreen`, whose `css` branch runs:

```js
} else if (state.phase === 'css') {
  boardMounted = false;
  preview.setAttribute('srcdoc', wrapPreview(assembleRobotMarkup(latestPlacement)));
  preview.addEventListener('load', () => applyAllCssValues(latestCssValues), { once: true });
}
```

At this point `latestPlacement` is still its module-init value `{}` (line
296), because the directed `team:board-state` event — which is emitted by the
server *after* `session:full-state` in the same reconnection burst
(`socketHandlers.js:90-99`) — has not been received/processed by the client
yet. `assembleRobotMarkup({})` therefore renders a robot with **none** of the
antena/orelles/ulls/nas/boca pieces present in the DOM (only the always-present
`#robot-cap`/`.contenidor-ulls` containers), and that markup is baked into the
iframe's `srcdoc` string immediately — it cannot be "fixed later".

When `team:board-state` subsequently arrives, its handler only rebuilds the
board+preview when `latestState?.phase === 'html'`:

```js
socket.on(EVENTS.TEAM_BOARD_STATE, ({ placement }) => {
  latestPlacement = placement || {};
  if (latestState?.phase === 'html' && boardMounted) {
    renderBoardAndDrawer(latestPlacement);
    assemblePreview(latestPlacement);
  }
});
```

Since phase is `'css'`, this branch is skipped — `latestPlacement` is corrected
in memory but the already-built `srcdoc` is never regenerated. And `team:css-state`'s
handler never touches the markup at all:

```js
socket.on(EVENTS.TEAM_CSS_STATE, ({ cssValues }) => {
  latestCssValues = cssValues || {};
  if (latestState?.phase !== 'css') return;
  applyAllCssValues(latestCssValues);   // CSSOM setProperty on :root — safe no-op if target absent
  syncCssPanelInputs(latestCssValues);  // only updates the left-hand controls, not the preview DOM
});
```

Net effect: a team that reconnects (or is force-resynced by the admin) while
in the CSS phase permanently sees a robot preview missing every placed piece
for the rest of that phase — the color/range controls on the left still work,
but they visibly do nothing, because the elements they target
(`.antena`, `.orella`, `.ull`, `#nas`, `#boca`) don't exist in that iframe's
document. This directly breaks `CORE-03` and the `ADMIN-06` force-resync
contract for exactly the phase where it matters (F5/crash mid-session, no time
to redo the HTML phase). Confirmed by tracing that `assemblePreview` is only
ever invoked from the HTML-phase branch and the HTML-only `team:board-state`
handler — there is no equivalent call reachable from the CSS-phase code path.
The JS phase does **not** have this bug: its `team:js-state` handler
unconditionally calls `rebuildJsPreview(latestJsRules)` (which re-derives the
full markup from `latestPlacement`), and since `team:board-state` is delivered
before `team:js-state` in the same reconnection burst, `latestPlacement` is
already correct by the time that rebuild runs. The CSS phase has no equivalent
"always rebuild markup" call in its `team:css-state` handler — this looks like
a straightforward oversight rather than an intentional asymmetry.

**Fix:** Give the CSS phase the same self-healing rebuild the JS phase already
has, e.g. rebuild the preview from `team:board-state` when the active phase is
`css` (mirroring the existing `html` branch), or simplest — always rebuild the
srcdoc from `team:css-state` too:

```js
socket.on(EVENTS.TEAM_BOARD_STATE, ({ placement }) => {
  latestPlacement = placement || {};
  if (latestState?.phase === 'html' && boardMounted) {
    renderBoardAndDrawer(latestPlacement);
    assemblePreview(latestPlacement);
  } else if (latestState?.phase === 'css') {
    // F5/force-resync recovery: session:full-state may already have baked the
    // css srcdoc from a stale (pre-board-state) placement — rebuild it now
    // that the authoritative placement has arrived (mirrors the js-phase fix
    // via rebuildJsPreview).
    const frame = document.querySelector('.preview-frame');
    if (frame) {
      frame.setAttribute('srcdoc', wrapPreview(assembleRobotMarkup(latestPlacement)));
      frame.addEventListener('load', () => applyAllCssValues(latestCssValues), { once: true });
    }
  }
});
```

Note this is a client-only rendering bug — it is invisible to the current test
suite because `cssPhase.test.js`'s `F5-CSS-RECOVERY` test only asserts on the
socket-level `TEAM_CSS_STATE` payload (`cssValues`), not on the rendered DOM/
iframe. Consider adding a browser-level (jsdom/Playwright) test for this
recovery path if one doesn't already exist elsewhere in the suite.

## Warnings

### WR-01: `setJsRules` never checks for a no-op resend, contradicting its own anti-storm documentation

**File:** `src/server/gameState.js:165-194`

**Issue:** The comment directly above `setJsRules` states: "Calcat de
setCssValue: mutation-returns-bool → true només si ha mutat, així el caller
emet el TEAM_JS_STATE dirigit únicament quan hi ha canvi real (anti-storm,
T-03-12)." The sibling function `setCssValue` actually implements this via
`if (team.cssValues[holeId] === value) return false;` (line 145). `setJsRules`
has no equivalent check — it validates and then unconditionally does:

```js
team.jsRules = rules.map(({ event, origen, desti, accio }) => ({ event, origen, desti, accio }));
return true;
```

Resending an already-stored, unchanged ruleset (e.g. a client re-emitting
`team:set-rules` for any reason — retry logic, double-click, etc.) will
therefore still trigger a directed `team:js-state` + `admin` `session:full-state`
broadcast every time, unlike the CSS/placement paths, which correctly no-op.
`test/jsPhase.test.js` has no `RULES-NOOP` test mirroring `cssPhase.test.js`'s
`SET-CSS-NOOP`, which is why this gap wasn't caught.

**Fix:** Add a deep-equality guard before mutating, e.g.:

```js
const normalized = rules.map(({ event, origen, desti, accio }) => ({ event, origen, desti, accio }));
if (JSON.stringify(normalized) === JSON.stringify(team.jsRules)) return false; // no-op, anti-storm
team.jsRules = normalized;
return true;
```

### WR-02: `ADMIN_REGISTER_TEAMS`'s `MAX_TEAMS` cap is per-call, not cumulative

**File:** `src/server/gameState.js:33-44` (`registerTeams`), `src/server/socketHandlers.js:132-144` (handler)

**Issue:** `isValidTeamNamesPayload` caps a single payload at `MAX_TEAMS = 6`
names, but `registerTeams` is purely additive (`state.teams.set(randomUUID(), ...)`
for every name, every call) — it never clears or replaces existing teams and
never checks the *cumulative* team count. A second `admin:register-teams` call
(e.g. an accidental double-submit from the admin UI, or a legitimate "register
more teams later" action) silently adds more entries on top of whatever is
already registered, with no de-duplication and no enforcement of the "4-6
teams" classroom constraint beyond the first call. Given the project's stated
scale (4-6 teams, single admin), an admin who reloads the registration screen
or double-clicks "register" ends up with duplicate/ghost team entries with no
server-side guard.

**Fix:** Either reject `ADMIN_REGISTER_TEAMS` if `state.teams.size > 0` (single
registration per session, matching the stated fixed-dynamic-15-20-min-session
model), or enforce the cap cumulatively:

```js
function registerTeams(names) {
  if (state.teams.size + names.length > MAX_TEAMS) return false; // cumulative cap
  for (const name of names) { ... }
  return true;
}
```

and check the return value in the handler before broadcasting.

### WR-03: Admin secret comparison is not constant-time

**File:** `src/server/socketHandlers.js:61`

**Issue:** `adminSecret !== ADMIN_SECRET` is a standard JS string comparison,
which short-circuits on the first differing character — a textbook timing
side-channel. Low real-world risk in a single-classroom deployment, but since
this is the sole gate protecting the admin role (`CR-01` in the code's own
comments), it's worth doing properly, especially since the fix is cheap.

**Fix:** Use a constant-time comparison, e.g. Node's
`crypto.timingSafeEqual` (after padding/hashing both sides to equal length, since
`timingSafeEqual` throws on length mismatch):

```js
import { timingSafeEqual, createHash } from 'node:crypto';
function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}
// ...
if (ADMIN_SECRET && !safeEqual(adminSecret ?? '', ADMIN_SECRET)) return next(new Error('unauthorized'));
```

### WR-04: `getPublicState()` drops `claimed`, making unclaimed and disconnected-after-claim teams indistinguishable to the admin

**File:** `src/server/gameState.js:67-85`

**Issue:** Internally each team tracks `claimed` (line 42), but the public
projection only exposes `{ id, name, connected, progress }` — `claimed` is
dropped. A never-claimed team and a claimed-then-disconnected team both show
`connected: false` in `session:full-state`, with no other field to
distinguish them. `admin.js` (not in this review's file list, but checked for
context) never references `claimed` at all, so there is currently no way for
the admin panel to tell "nobody has picked this team yet" apart from "team A
picked this PC and then dropped/crashed" — which matters for deciding whether
to use `ADMIN_FORCE_RESYNC` or troubleshoot a different PC.

**Fix:** Include `claimed` in the `getPublicState()` projection so the admin
UI can render the distinction:

```js
teams: [...state.teams.values()].map(({ id, name, connected, claimed, placement }) => ({
  id, name, connected, claimed, progress: ...,
})),
```

## Info

### IN-01: Hex-color regex duplicated instead of reused

**File:** `src/client/client.js:920`, `src/shared/robotTemplate.js:187`

**Issue:** `robotTemplate.js` defines `const HEX_RE = /^#[0-9a-fA-F]{6}$/;` for
`colorValidator` but doesn't export it. `client.js` re-declares the identical
pattern inline (`/^#[0-9a-fA-F]{6}$/.test(storedValue)`) to decide whether a
recovered `storedValue` is safe to use as the initial swatch value. Two
copies of the same regex can silently drift.

**Fix:** Export `HEX_RE` from `robotTemplate.js` (or expose a `isValidHex`
helper alongside `colorValidator`) and import it in `client.js`.

### IN-02: Repeated Web Audio boilerplate across the four sound-effect functions

**File:** `src/client/client.js:44-140`

**Issue:** `playTone`, `playAlertSound`, and `playZipTick` each repeat the same
`AudioContext`/`Ctx` guard-and-lazy-init boilerplate (`window.AudioContext ||
window.webkitAudioContext`, `if (!audioCtx) audioCtx = new Ctx()`, wrapped in
an identical try/catch). Not a correctness issue, but a small extraction
(`getAudioContext()`) would remove the duplication.

**Fix:** Factor the shared lazy-init/guard logic into one helper function
reused by all four sound functions.

### IN-03: Stale comment on `TEAM_REMOVE_PIECE`

**File:** `src/server/events.js:17`

**Issue:** The inline comment `// declarat aquí; s'implementa al Pla 02` reads
as "not yet implemented", but the handler is fully implemented in
`socketHandlers.js` (`TEAM_REMOVE_PIECE` handler, lines 253-265) and covered
by tests. Harmless but slightly misleading to a future reader.

**Fix:** Drop or update the comment now that Pla 02 has landed.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
