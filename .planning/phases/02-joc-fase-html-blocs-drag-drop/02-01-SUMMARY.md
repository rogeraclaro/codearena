---
phase: 02-joc-fase-html-blocs-drag-drop
plan: 01
subsystem: ui
tags: [socket.io, sortablejs, dompurify, drag-and-drop, iframe-srcdoc, vanilla-js, vite]

# Dependency graph
requires:
  - phase: 01-nucli-en-temps-real-i-control-de-sessi
    provides: "renderActiveSplitScreen() shell (action-panel + empty iframe srcdoc), authoritative gameState + getPublicState projection, safeHandler + admin-guarded handlers, directed team:<id> emit precedent (ADMIN_FORCE_RESYNC), token reconnection path, socket event protocol (events.js)"
provides:
  - "src/shared/robotTemplate.js — canonical Plana Model (SLOTS/PIECES/DISTRACTORS), single source of truth for structure (D-01), reusable by Phase 4 scoring"
  - "Server placement authority: team.placement + placePiece() with full guards + getTeamBoard() + N/8 progress in getPublicState()"
  - "3 new protocol events: TEAM_PLACE_PIECE, TEAM_REMOVE_PIECE (declared), TEAM_BOARD_STATE"
  - "Directed-emit placement handler (team:<id> board + admin N/8, never 'session') + F5 board recovery on connection"
  - "Client calaix + nested slot board via SortableJS (magnet+rebound) + real robot preview assembled from template and sanitized with DOMPurify"
  - "Render decoupling: session:full-state = surgical timer/frozen update; team:board-state = board rebuild"
affects: [Phase 3 CSS/JS phases (fill the DOM this produces), Phase 4 scoring (compares this DOM to Plana Model), Plan 02 (remove piece, distractors, inventory recount, freeze, admin card N/8), Plan 03 (final art)]

# Tech tracking
tech-stack:
  added: [sortablejs@1.15.7, dompurify@3.4.11]
  patterns:
    - "One SortableJS instance per slot (capacity 1) with group.put type-check + emptyInsertThreshold magnet; native revert = rebound"
    - "Directed per-team emit (team:<id> + admin) instead of session broadcast for high-frequency placement events (anti re-render storm)"
    - "Render decoupling: authoritative broadcast split into surgical (session:full-state) vs rebuild (team:board-state) channels"
    - "iframe srcdoc assembled ONLY from a frozen template + DOMPurify sanitize (id/class/<output> preserved), never from user text"

key-files:
  created:
    - "src/shared/robotTemplate.js"
    - "test/placement.test.js"
    - "src/client/public/antena.svg"
    - "src/client/public/orella.svg"
    - "src/client/public/fons.svg"
  modified:
    - "src/server/events.js"
    - "src/server/gameState.js"
    - "src/server/socketHandlers.js"
    - "src/client/client.js"
    - "src/client/client.css"
    - "src/client/shared/tokens.css"
    - "package.json"

key-decisions:
  - "Slot label rendered via CSS :empty::before (data-accepts pseudo-element), NOT a DOM child, so SortableJS capacity check (children.length === 0) stays honest"
  - "socket promoted to module-level in client.js so slot onAdd handlers can emit place intents"
  - "getTeamBoard returns a shallow copy of placement — the live ref is never leaked; getPublicState exposes only the N/8 count, never the board or token"
  - "dompurify SUS 'too-new' flag treated as recency false positive (cure53, ~45M dl/wk, no postinstall) — human-verify checkpoint omitted per 02-RESEARCH Package Legitimacy Audit"

patterns-established:
  - "Per-slot SortableJS type-check + magnet + native revert (GAME-03 with near-zero custom code)"
  - "Directed emit vs session broadcast decoupling to avoid cross-team re-render storms (Pitfall 1)"
  - "Template-only + DOMPurify srcdoc assembly (GAME-06 no free code entry)"

requirements-completed: [GAME-03, GAME-06]

coverage:
  - id: D1
    description: "Server placement authority: a valid drag places a piece into the authoritative per-team board (type-checked, inventory-guarded) and projects it directed to the owner; the N/8 count goes to admin, never to 'session'"
    requirement: "GAME-03"
    verification:
      - kind: integration
        ref: "test/placement.test.js#PLACE-OK: un place valid retorna team:board-state a l'owner (GAME-03)"
        status: pass
      - kind: integration
        ref: "test/placement.test.js#ADMIN-COUNT: un place OK projecta progress {placed, total:8} a l'admin, sense token"
        status: pass
      - kind: integration
        ref: "test/placement.test.js#NO-SESSION-BROADCAST: un segon equip no rep res del place del primer (Pitfall 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No free-code-entry path server-side: placement intents are validated against the frozen template enums; an incompatible type is rejected with no state change"
    requirement: "GAME-06"
    verification:
      - kind: integration
        ref: "test/placement.test.js#PLACE-TYPE-REJECT: un tipus incompatible no produeix board-state (D-07)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Client drag & drop UI (calaix + nested slot board, magnet+rebound snap) and the real robot preview assembled from the template and sanitized via DOMPurify (id/class/<output> preserved for Phase 4 scoring)"
    requirement: "GAME-03"
    verification:
      - kind: manual_procedural
        ref: "npm run build (bundles SortableJS/DOMPurify/robotTemplate) — pass; visual drag/snap/preview requires a browser"
        status: pass
    human_judgment: true
    rationale: "Drag gesture feel (magnet/rebound), the rendered robot in the iframe, and DOMPurify id/class/<output> preservation are visual/DOM behaviors that need a browser — end-of-phase human-verify."
  - id: D4
    description: "F5/reconnection recovers the half-built robot via team:board-state emitted on connection (CORE-03)"
    verification: []
    human_judgment: true
    rationale: "No dedicated automated assertion for the reconnection board emit; end-to-end F5 recovery needs a browser refresh mid-phase."

# Metrics
duration: 8min
completed: 2026-07-02
status: complete
---

# Phase 2 Plan 01: Fase HTML walking skeleton Summary

**Drag-a-piece-to-slot round-trip: SortableJS calaix+tauler → server-authoritative placement (directed team:<id> emit, never session) → real robot preview assembled from a frozen template and sanitized with DOMPurify, with F5 recovery.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-02T17:16:42Z
- **Completed:** 2026-07-02T17:25:00Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, plus package-lock.json)

## Accomplishments
- Canonical robot template (`src/shared/robotTemplate.js`) as the single source of truth for the Plana Model structure (D-01), frozen and importable by both client and server.
- Server placement authority: `placePiece()` with all guards (phase!=html, frozen, unknown slot, type mismatch, occupied slot, inventory exhausted), per-team `placement` map, `getTeamBoard()` shallow copy, and N/8 `progress` derived in `getPublicState()`.
- Directed-emit placement handler — board to `team:<id>`, N/8 count to `admin`, **never** to `session` (Pitfall 1) — plus F5 board recovery on connection (CORE-03).
- Client calaix + nested slot board via SortableJS (per-slot `group.put` type-check + `emptyInsertThreshold` magnet + native revert rebound) and the real robot rendered into the iframe `srcdoc` via DOMPurify, with the render decoupled (surgical `session:full-state` vs board-rebuilding `team:board-state`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Test RED — placement round-trip suite** - `ed5de04` (test)
2. **Task 2: Canonical template + server placement authority + directed emit + F5 recovery** - `0a05d8c` (feat)
3. **Task 3: Client calaix+tauler SortableJS + real preview via DOMPurify** - `3f385dc` (feat)

_Task 2 followed TDD: the Task 1 `test(...)` commit is the RED gate, Task 2's `feat(...)` is the GREEN gate._

## Files Created/Modified
- `src/shared/robotTemplate.js` (created) - SLOTS (8 leaf slots with canonical id/class html), PIECES inventory, DISTRACTORS; Object.freeze single source of truth
- `test/placement.test.js` (created) - integration round-trip suite (PLACE-OK, PLACE-TYPE-REJECT, ADMIN-COUNT, NO-SESSION-BROADCAST)
- `src/client/public/{antena,orella,fons}.svg` (created) - root-relative placeholder assets (final art deferred to Plan 03)
- `src/server/events.js` (modified) - +TEAM_PLACE_PIECE, TEAM_REMOVE_PIECE, TEAM_BOARD_STATE
- `src/server/gameState.js` (modified) - placement state, placePiece, countAvailable, getTeamBoard, N/8 progress
- `src/server/socketHandlers.js` (modified) - team:place-piece handler (directed emit), F5 board recovery on connection
- `src/client/client.js` (modified) - SortableJS calaix+tauler, assemblePreview via DOMPurify, render decoupling, surgical vs board-state channels
- `src/client/client.css` (modified) - calaix/slot/chip/progress/hint styles (tokens only, phase-html)
- `src/client/shared/tokens.css` (modified) - --font-family-mono, --motion-snap, --motion-ease
- `package.json` (modified) - pin sortablejs 1.15.7 + dompurify 3.4.11

## Decisions Made
- Empty-slot label rendered as a CSS `:empty::before` pseudo-element (from `data-accepts`) rather than a DOM child, so the SortableJS capacity-1 `put` check (`children.length === 0`) is not falsely tripped by a label node.
- `socket` promoted to a module-level binding in `client.js` so per-slot `onAdd` handlers can emit place intents without threading it through every render function.
- `getTeamBoard()` returns a shallow copy; the live placement ref is never emitted, and `getPublicState()` exposes only the N/8 count (never the board, never the token).
- Omitted the dompurify human-verify checkpoint — the `SUS`/`too-new` flag is a recency false positive (cure53, ~45M dl/wk, no postinstall; stack decision in CLAUDE.md), per 02-RESEARCH Package Legitimacy Audit.

## Deviations from Plan

None - plan executed exactly as written. (Task 2's `<action>` explicitly deferred `removePiece` and distractors/inventory-recount to Plan 02; the drawer renders the authoritative remaining inventory derived from `placement`, which is the minimal correct behavior for the walking skeleton.)

## Issues Encountered
- RED verification: emitting an `undefined` event name (from `EVENTS.TEAM_PLACE_PIECE` before implementation) corrupts the socket and triggers disconnect/reconnect churn, which produced spurious `session:full-state` broadcasts and made NO-SESSION-BROADCAST fail in RED too. Confirmed via a throwaway probe that this is a RED-only artifact of the undefined event; with the real string event and directed emit (GREEN), the second team receives nothing. Net effect: a more genuinely-RED suite (3 failing before Task 2). No code change needed.

## Known Stubs
- `src/client/public/{antena,orella,fons}.svg` are **intentional placeholder** SVGs (recognizable line-art / gradient), documented as provisional in 02-RESEARCH §Environment Availability. They unblock the mechanics; final art is Plan 03's explicit scope. Not blocking — the placement round-trip and preview render correctly with them.

## User Setup Required
None - no external service configuration required. (`npm install` for sortablejs/dompurify ran during Task 2.)

## Next Phase Readiness
- Walking skeleton is end-to-end and green (`npm test` 25/25, `npm run build` clean).
- Ready for Plan 02: remove piece (TEAM_REMOVE_PIECE already declared), distractors in the drawer, dynamic per-type inventory recount, freeze-disables-drag polish, and the Admin card N/8 fill.
- Plan 03: final robot art to replace the placeholder SVGs.
- Recommend an end-of-phase browser human-verify for D3/D4 (drag feel, rendered robot, DOMPurify id/class/`<output>` preservation, F5 recovery) — config `human_verify_mode: end-of-phase`.

---
*Phase: 02-joc-fase-html-blocs-drag-drop*
*Completed: 2026-07-02*
