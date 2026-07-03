---
phase: quick-260703-uwn
plan: 01
subsystem: client-preview
status: complete
tags: [visual-redesign, robot-preview, css, drag-drop, tests]
requires:
  - src/shared/robotTemplate.js (single source of truth SLOTS/PIECES)
  - src/client/client.js (wrapPreview/buildBoard)
provides:
  - 7-piece robot model (single CSS antena, directional PNG ears)
  - Full Bender preview CSS in the srcdoc iframe
affects:
  - src/server/gameState.js (N/7 progress derived from SLOTS.length)
  - test/placement.test.js (7-piece round-trip)
tech-stack:
  added: []
  patterns: [css-drawn-piece, root-relative-srcdoc-assets, ordered-integration-test]
key-files:
  created:
    - src/client/public/orella-esquerra.png
    - src/client/public/orella-dreta.png
  modified:
    - src/shared/robotTemplate.js
    - src/client/client.js
    - src/client/client.css
    - src/server/gameState.js
    - src/server/socketHandlers.js
    - test/placement.test.js
  deleted:
    - src/client/public/antena.svg
    - src/client/public/orella.svg
decisions:
  - "Antena is a single CSS-drawn <div class=\"antena\"> (no id, no left/right split) — 7 pieces total, not 8"
  - "pieceLabel() gets a dedicated antena branch so the read-only chip shows <div class=\"antena\"> derived from slot.html, never the directional type"
  - "Progress total is derived from SLOTS.length everywhere (N/7 is automatic, never hardcoded)"
metrics:
  duration: 7m 25s
  tasks_completed: 3
  files_created: 2
  files_modified: 6
  files_deleted: 2
  completed: 2026-07-03
---

# Quick 260703-uwn: Redisseny visual final del robot Bender (Fase 2) Summary

Retroactive port of the owner's final robot design into the real Phase 2 code: the antena is now a single CSS-drawn piece (7 pieces, not 8), the mouth renders empty, the two ears use distinct real PNG art per side, and the full Bender head/eyes/nose/mouth/antena CSS lives in the preview iframe's `<style>`.

## What Was Built

- **7-piece model (Task 1):** Removed the `antena-dreta` slot and piece from `robotTemplate.js` — `SLOTS` went 8→7, `PIECES` 7→6 (sum 1+1+1+2+1+1 = 7). The antena slot's `html` is now `<div class="antena"></div>` (no `id`); ears point to distinct root-relative PNGs; the mouth is `<output id="boca"></output>` (no "BEEP BEEP"). `pieceLabel('antena-esquerra')` returns `<div class="antena">` via a dedicated branch. `IMG_LABEL_SRC` lost both antena keys (the antena is no longer an `<img>`).
- **Preview + assets + board (Task 2):** Copied `orella_esquerre.png`/`orella_dreta.png` into `public/` as `orella-esquerra.png`/`orella-dreta.png`; deleted the obsolete `antena.svg` and `orella.svg` placeholders (kept `fons.svg`, out of scope). `buildBoard()` now renders a single antena slot. `wrapPreview()`'s `<style>` merges the existing fixed `#robot-fons` layer (kept exact) with body centering and the complete robot ruleset copied literally from the source of truth (`#robot-cap`, `.antena`/`.antena::before`, `.orella`/`#orella-esquerra`/`#orella-dreta`, `.contenidor-ulls`, `.ull`/`.ull::before`, `#nas`/`#nas:hover`, `#boca`).
- **Tests + comment sweep (Task 3):** Rewrote the ordered `placement.test.js` round from the removed `antena-dreta` split onto the surviving `orella-esquerra`/`orella-dreta` directional split, keeping each test's intent; flipped `progress.total` assertions 8→7. Swept `N/8`→`N/7` comments in `gameState.js`, `socketHandlers.js`, and `client.css` (comment text only, no logic changes — the real total already derives from `SLOTS.length`).

## Deviations from Plan

### Verification-command adjustment (not a code change)

**1. [Rule 3 - Blocking] Plan's `node --test test/` verify command is unsupported on the local Node version**
- **Found during:** Task 3 verification
- **Issue:** The environment runs Node v22.17.0, where `node --test test/` treats `test/` as an entry module (`Cannot find module '.../test'`) instead of a directory glob.
- **Fix:** Ran the project's canonical test script `npm test` (`node --test test/*.test.js`) instead. All 34 tests pass, including the rewritten placement suite. No source or test code was changed to accommodate this — only the invocation used to verify.
- **Files modified:** none (verification only)

All other work executed exactly as written.

## Known Stubs

None. The mouth renders empty by design (final look), and the antena/ears are fully wired to real assets/CSS.

## Verification Evidence

- `node --input-type=module` confirms `SLOTS.length === 7`, `PIECES.length === 6`, `pieceLabel('antena-esquerra') === '<div class="antena">'`, `PIECES` count sum === 7.
- `npm run build` (Vite) builds with no errors; both ear PNGs land in `dist/`.
- `npm test`: 34/34 pass, 0 fail.
- Residual sweep across `src/` + `test/`: no `antena-dreta`, `BEEP`, `total:8`, or antena/orella `.svg` references remain.

## Commits

- `0d33dad` feat(quick-260703-uwn): model de robot de 7 peces (antena única CSS)
- `f5c1e1e` feat(quick-260703-uwn): CSS Bender al preview + assets orella + antena única al tauler
- `402bc16` test(quick-260703-uwn): placement suite al model de 7 peces

## Self-Check: PASSED

- FOUND: src/client/public/orella-esquerra.png
- FOUND: src/client/public/orella-dreta.png
- FOUND commit 0d33dad, f5c1e1e, 402bc16
- CONFIRMED deleted: src/client/public/antena.svg, src/client/public/orella.svg
