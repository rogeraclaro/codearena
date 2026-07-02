---
phase: 02-joc-fase-html-blocs-drag-drop
plan: 02
subsystem: ui
tags: [socket.io, sortablejs, drag-and-drop, undo, distractors, vanilla-js]

# Dependency graph
requires:
  - phase: 02-joc-fase-html-blocs-drag-drop
    provides: "Plan 01 walking skeleton — placePiece authority + directed team:<id> emit, SortableJS calaix+tauler with sortables[] registry + freeze-disable already wired, remainingPieces() inventory derivation, TEAM_REMOVE_PIECE event already declared"
provides:
  - "Server removePiece(teamId, slotId) authority: mutation-returns-bool mirror of placePiece (no-op on empty/frozen/not-html), added to gameState export"
  - "Directed team:remove-piece handler (board->owner + N/8->admin, never session), identity from socket.data.teamId (V4)"
  - "Client drawer removal: calaix onAdd emits team:remove-piece when a piece returns from a slot (D-10, no confirmation)"
  - "Comic distractor chips (banana/roda/sabata) mixed into the drawer with native SortableJS revert + onEnd shake rebound (D-11)"
  - "Test coverage: REMOVE round-trip + no-op, INVENTORY cap, V4 forge negative, F5 board recovery"
affects: [Phase 3 CSS/JS phases (inherit the partial robot), Phase 4 scoring (compares the DOM this produces)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "removePiece mirrors placePiece exactly (same guards, same mutation-returns-bool, same directed-emit handler shape) — undo is symmetric with place, no new protocol"
    - "Distractor rebound is emergent, not coded: dataset.type matching no slot.accepts triggers SortableJS native revert; only the onEnd shake is added"
    - "Frozen visual cue driven by CSS :has(.frozen-overlay) — no extra JS state toggling; SortableJS option('disabled') (already wired in Plan 01) remains the functional gate"

key-files:
  created: []
  modified:
    - "src/server/gameState.js"
    - "src/server/socketHandlers.js"
    - "src/client/client.js"
    - "src/client/client.css"
    - "test/placement.test.js"

key-decisions:
  - "Distractors interleaved deterministically (one after every 2 good chips) rather than random-shuffled, so the drawer does not reorder on every board-state rebuild (cognitive-load / anti-jitter)"
  - "Shake amplitude uses var(--space-sm) (8px) instead of UI-SPEC's literal ±6px to honor the hard 'tokens-only, no px literals' CSS constraint (no 6px token exists, and tokens.css is out of this plan's file scope)"
  - "Frozen disabled-state visual implemented via CSS :has(.frozen-overlay) selector — zero JS changes, reuses the existing overlay as the single frozen signal"

patterns-established:
  - "Undo = symmetric mirror of the place operation (server guard + directed handler + client onAdd), not a bespoke mechanic"
  - "Decoy pieces get their 'wrongness' for free from the existing type-check put() + native revert; UX only adds a motion cue"

requirements-completed: [GAME-03, GAME-06]

coverage:
  - id: D5
    description: "Authoritative removePiece: an owner can retract a placed piece; server removes it from team.placement and the N/8 count drops, with no confirmation friction (D-10)"
    requirement: "GAME-03"
    verification:
      - kind: integration
        ref: "test/placement.test.js#REMOVE round-trip: treure una peça col·locada la retira del board (D-10)"
        status: pass
      - kind: integration
        ref: "test/placement.test.js#REMOVE no-op: treure un slot buit no emet board-state"
        status: pass
    human_judgment: false
  - id: D6
    description: "Inventory cap: no more pieces of a type than available can be placed (Pitfall 5)"
    requirement: "GAME-06"
    verification:
      - kind: integration
        ref: "test/placement.test.js#INVENTORY cap: no es poden col·locar més antenes de les disponibles"
        status: pass
    human_judgment: false
  - id: D7
    description: "Identity integrity: a team cannot mutate another team's board by forging teamId in the payload (T-02-04); handler derives identity from socket.data.teamId"
    requirement: "GAME-03"
    verification:
      - kind: integration
        ref: "test/placement.test.js#V4 forge: un equip no pot mutar el board d'un altre forjant teamId (T-02-04)"
        status: pass
    human_judgment: false
  - id: D8
    description: "F5 recovery: reconnecting with the team token re-emits team:board-state with the prior placement (CORE-03)"
    requirement: "GAME-03"
    verification:
      - kind: integration
        ref: "test/placement.test.js#F5 recovery: reconnectar amb el token recupera el placement previ (CORE-03)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Client undo interaction + comic distractors that always rebound with a shake, and true freeze-disables-drag (not just the visual overlay)"
    requirement: "GAME-03"
    verification:
      - kind: manual_procedural
        ref: "npm run build (bundles the drawer onAdd removal, distractor chips, shake keyframe) — pass; drag-to-remove feel, distractor rebound shake, and frozen cursor cue require a browser"
        status: pass
    human_judgment: true
    rationale: "Removal gesture (drag a placed piece back to the drawer), distractor shake-on-rebound, and the frozen disabled cursor are visual/gestural behaviors that need a browser — end-of-phase human-verify."

# Metrics
duration: 4min
completed: 2026-07-02
status: complete
---

# Phase 2 Plan 02: Undo + distractors + inventory + freeze polish Summary

**Frictionless undo (authoritative removePiece mirroring placePiece, directed emit) plus comic distractor chips that rebound-with-shake for free via SortableJS native revert — closing GAME-03's "strong snap" second half with no new protocol.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-02T21:46:15Z
- **Tasks:** 2 (Task 1 TDD: RED then GREEN)
- **Files modified:** 5 (0 created)

## Accomplishments
- **Server undo authority:** `gameState.removePiece(teamId, slotId)` as an exact mutation-returns-bool mirror of `placePiece` — no-op (no broadcast) when the team is unknown, the phase is not `html`, the timer is `frozen` (D-11), or the slot is already empty. Added to the export block.
- **Directed remove handler:** `TEAM_REMOVE_PIECE` in `socketHandlers.js`, a byte-for-byte-shaped copy of `team:place-piece` — identity from `socket.data.teamId` (V4, never the payload), `slotId` validated as a string (V5), and on a real removal it emits `team:<id>` board + `admin` N/8, **never** `io.to('session')` (Pitfall 1 / T-02-06).
- **Client undo:** the calaix `onAdd` emits `team:remove-piece` whenever a piece returns from a slot (`evt.from.dataset.slotId`); no confirmation dialog (undo-without-friction). The authoritative `team:board-state` reconciles the DOM.
- **Distractors (D-11):** banana/roda/sabata chips interleaved into the drawer with an emoji glyph and **no** code label — their `dataset.type` matches no `slot.accepts`, so SortableJS's existing type-checked `put()` bounces them via native revert; the only added code is an `onEnd` shake (motion-only, no error color or text).
- **Tests:** REMOVE round-trip + no-op, INVENTORY cap, V4 forge negative, and F5 board recovery added — `npm test` 30/30 green, `npm run build` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing tests for removePiece, inventory cap, V4 forge, F5 recovery** — `c4b61b5` (test)
2. **Task 1 (GREEN): authoritative removePiece + directed team:remove-piece handler** — `bfaed60` (feat)
3. **Task 2: drawer removal + comic distractors with shake rebound** — `bbb75ff` (feat)

_Task 1 followed TDD: `c4b61b5` is the RED gate (REMOVE round-trip + INVENTORY fail before implementation), `bfaed60` is the GREEN gate._

## Files Created/Modified
- `src/server/gameState.js` (modified) — `removePiece()` mirror + export
- `src/server/socketHandlers.js` (modified) — `TEAM_REMOVE_PIECE` directed handler
- `src/client/client.js` (modified) — drawer `onAdd` removal + `onEnd` distractor shake, `createDistractorChip()`, `fillDrawer()` (good pieces + interleaved distractors)
- `src/client/client.css` (modified) — `.piece-chip__glyph`, `piece-shake` keyframe (reduced-motion gated), frozen visual cue via `:has(.frozen-overlay)`; tokens-only
- `test/placement.test.js` (modified) — 5 new cases + `team1Token` capture in setup

## Decisions Made
- **Deterministic distractor interleave** (one after every 2 good chips) rather than a random shuffle — a shuffle would reorder the drawer on every `board-state` rebuild, adding cognitive noise for the exact adult-beginner audience the phase serves.
- **Shake amplitude = `var(--space-sm)` (8px)** instead of UI-SPEC's literal ±6px: the plan's hard constraint is "tokens-only, no px literals", no 6px token exists, and `tokens.css` is outside this plan's file scope. 8px reads identically as a rebound jitter.
- **Frozen disabled visual via CSS `:has(.frozen-overlay)`** — the functional gate (`option('disabled', true)`) was already wired across all three render paths in Plan 01; this adds only the cursor/opacity cue with zero new JS state.

## Deviations from Plan

**Scope narrowing (not a deviation, but worth recording):** Plan 02's Task 2 `<action>` also lists "freeze disables SortableJS" and "inventory-aware drawer" as work items, but **Plan 01 already implemented both** — `sortables.forEach((s) => s.option('disabled', frozen))` is present in `renderActiveSplitScreen`, `surgicalUpdate`, and `renderBoardAndDrawer`, and `remainingPieces()` already derives the drawer from `placement`. To avoid duplicating existing, tested behavior, Task 2 added only the genuinely-new pieces (drawer removal, distractors, shake, frozen visual cue) and verified the pre-existing freeze/inventory logic still holds. No functional gap: the must-have truths for freeze-disable and inventory are satisfied by the combined codebase and covered by the INVENTORY cap test.

## Issues Encountered
None. RED failed exactly the two removal-dependent tests (REMOVE round-trip + INVENTORY, the latter because the un-removed antena slot stays occupied without the handler); GREEN turned both green with the rest of the suite intact.

## Known Stubs
None introduced by this plan. (The placeholder `src/client/public/{antena,orella,fons}.svg` remain from Plan 01, documented there as Plan 03's explicit scope.)

## User Setup Required
None — no new dependencies, no external service configuration.

## Next Phase Readiness
- HTML-phase mechanics are now complete: place, remove (frictionless undo), inventory cap, comic distractors that rebound, and true freeze-disables-drag.
- Remaining Plan 03 scope: final robot art to replace the placeholder SVGs, and the Admin card N/8 fill.
- Recommend an end-of-phase browser human-verify for D9 (drag-to-remove gesture, distractor shake rebound, frozen cursor cue) — consistent with Plan 01's D3/D4 deferral.

## Self-Check: PASSED

- Files: all 5 modified files present on disk (gameState.js, socketHandlers.js, client.js, client.css, placement.test.js).
- Commits: `c4b61b5`, `bfaed60`, `bbb75ff` all present in git log.
- `npm test` 30/30 green; `npm run build` clean; place/remove handlers use directed `team:<id>`/`admin` emit (0 session broadcasts for board events); new client.css contains no hex/px literals.

---
*Phase: 02-joc-fase-html-blocs-drag-drop*
*Completed: 2026-07-02*
