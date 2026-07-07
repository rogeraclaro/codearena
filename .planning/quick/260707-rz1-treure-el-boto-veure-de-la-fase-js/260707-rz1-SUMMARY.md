---
phase: quick-260707-rz1
plan: 01
subsystem: client
tags: [cleanup, dead-code, fase-js, ui]
status: complete
requires: []
provides:
  - "Fase JS rule builder without the 'Veure' single-rule preview button"
affects:
  - src/client/client.js
  - src/client/client.css
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/client/client.js
    - src/client/client.css
decisions: []
metrics:
  duration: ~5 min
  completed: 2026-07-07
  tasks: 2
  files: 2
---

# Phase quick-260707-rz1 Plan 01: Treure el botó "Veure" de la Fase JS — Summary

Removed the "Veure" single-rule preview button from the CodeArena Fase JS rule builder and deleted every code/CSS/comment fragment that became unreachable as a direct consequence — no behavior change to the full JS preview flow.

## What Was Done

### Task 1 — client.js (commit 4c84771)
- Deleted the `veure` button creation block inside `buildJsRuleRow` (button element, className, disabled state, click listener, appendChild).
- Removed the now-orphaned `previewSingleRule(row)` function and its `// "Veure" (D-12)...` header comment — its only caller was the deleted button.
- Cleaned the dead `immediate` parameter from `rebuildJsPreview`:
  - Signature `rebuildJsPreview(rules, { immediate = false } = {})` → `rebuildJsPreview(rules)`.
  - Deleted the `if (immediate) rules.forEach((r) => applyAction(doc, r));` line.
  - Removed only the comment paragraph describing `immediate=true`; kept the Rebuild-then-reattach / Pitfall 3 / scriptless-iframe explanation (still current).
- Untouched: `isJsRowComplete`, `normalizeJsRow` (still live via the `jsPanelRows.filter(...).map(...)` at ~1243), and the two full-refresh `rebuildJsPreview(latestJsRules)` calls (~1591, ~1837) which now call the single-arg default behavior.

### Task 2 — client.css (commit 0ecba28)
- Deleted the three `.js-rule__veure` rule blocks (base, `:focus-visible`, `:disabled`) and their leading comment.
- Removed the `"Veure"` mentions from the two neighbouring comments (rule-panel header comment ~444 and rule-row comment ~459) without rewriting the rest of the text.
- Untouched: `.js-rules`, `.js-rule`, `.js-rule__word`, `.js-rule__select` (+ states), `.js-rule__remove`.

## Verification

| Check | Result |
| ----- | ------ |
| `grep -c "previewSingleRule\|js-rule__veure\|immediate" src/client/client.js` | 0 |
| `grep -ci "veure" src/client/client.css` | 0 |
| `npm run build` (Vite) after Task 1 | ✓ built, no errors |
| `npm run build` (Vite) after Task 2 | ✓ built, no errors |
| Full JS preview flow (`rebuildJsPreview` from ~1591/~1837) | Unchanged — default single-arg call path preserved |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
- FOUND: src/client/client.js (modified, committed 4c84771)
- FOUND: src/client/client.css (modified, committed 0ecba28)
- FOUND commit: 4c84771
- FOUND commit: 0ecba28
