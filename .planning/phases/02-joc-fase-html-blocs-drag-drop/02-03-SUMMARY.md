---
phase: 02-joc-fase-html-blocs-drag-drop
plan: 03
subsystem: ui
tags: [socket.io, sortablejs, web-audio, lucide, drag-and-drop, vanilla-js, feedback, human-verify]

# Dependency graph
requires:
  - phase: 02-joc-fase-html-blocs-drag-drop
    provides: "Plan 01 walking skeleton (robotTemplate.js single source of truth, server placement authority + N/8 progress in getPublicState(), directed team:<id> emit, DOMPurify srcdoc preview, SortableJS calaix+tauler) + Plan 02 full mechanics (removePiece, inventory recount, distractors with shake, freeze-disables-drag)"
provides:
  - "Team screen self-progress: .progress-pieces N/8 pip row filled in --phase-html, derived from the authoritative latestPlacement (never a divergent local counter)"
  - "Permanent calaix→tauler guidance element (merged D-14 hint + zone divider) with an animated MoveDown arrow, prefers-reduced-motion aware"
  - "Admin card N/8 fill: buildTeamCard materializes the D-08-reserved .team-card-progress via textContent (anti-XSS) from getPublicState().teams[].progress"
  - "Web Audio feedback layer: pickup/drop blips, zipper-tick drag sound, bell alert scoped to genuine drawer-origin placement rejections"
  - "Directional gameplay: antena/orella split into left/right piece types (real type-check enforcement, not cosmetic) — closes the checkpoint design arc for Phase 4 scoring identity"
  - "Human-verified Fase HTML: magnet/rebound/shake, F5 recovery, no cross-team re-render, srcdoc id/class/<output> identity, freeze-disables-drag — all confirmed visually (closes A1/A2)"
affects: [Phase 3 CSS/JS phases (build on this DOM + progress UI), Phase 4 scoring (reads the srcdoc identity confirmed here; directional ids antena-esquerra/antena-dreta now live)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Progress derived from the authoritative placement (Object.keys(latestPlacement).length), never a parallel local counter that can drift"
    - "Session-scoped one-shot flag to permanently dismiss the initial hint on the 0→1 placement transition (survives later re-renders)"
    - "Fisher-Yates drawer shuffle computed ONCE per page session and reused, never re-shuffled on every board-state (stable UX)"
    - "Lazy single AudioContext created on first user gesture (autoplay policy), reused by all sound helpers"
    - "Bell/rejection sound gated to drawer-origin drops only (from.el is the calaix), read directly from SortableJS 1.15.7 evt.from — not fired on moving/removing an already-placed piece"

key-files:
  created: []
  modified:
    - "src/client/client.js"
    - "src/client/client.css"
    - "src/client/admin.js"
    - "src/shared/robotTemplate.js"

key-decisions:
  - "D-12 REVERSED (checkpoint round 1-2, explicit user override): piece/slot/container labels now show the REAL literal HTML tag WITH angle brackets (e.g. `<img class=\"antena\">`, `<section id=\"robot-contenidor\">`, `</section>`) instead of the bracket-free class/type name the original UI-SPEC resolution locked. Labels are still derived from SLOTS[].html (single source, D-01), never hand-written; brackets are read-only plain text (GAME-06/V5 preserved)."
  - "D-07 EXTENDED (checkpoint round 3, explicit user request): antena/orella split into directional left/right types (antena-esquerra/antena-dreta/orella-esquerra/orella-dreta), each count 1 mapping 1:1 to one slot. A left piece is REJECTED on the right slot — real gameplay, not a cosmetic src swap. slot.html keeps the SHARED class (class=\"antena\") + per-instance id, so Phase 4 scoring reads the shared class unchanged; only the id differs per side. Not the Pitfall-5 unfillable-slot bug (each directional type has count === its 1 slot)."
  - "Initial hint + zone divider MERGED (round 5) into one single permanent element with a downward MoveDown arrow, instead of a dismissible hint plus a separate permanent divider."
  - "Empty slots rendered blank with a red (--color-destructive) background as the visual 'falta omplir' cue (round 2), container frames show opening+closing tags, distractor chips carry code-style labels instead of emoji, preview background swapped to a photo + dark overlay."

patterns-established:
  - "Authoritative-derived progress UI (pips from placement, not a shadow counter)"
  - "One-shot session flag for permanent hint dismissal"
  - "Lazy-single-AudioContext Web Audio feedback with event-origin-gated alerts"

requirements-completed: [GAME-03, GAME-06]

coverage:
  - id: D1
    description: "Team screen shows own N/8 progress (pip row in --phase-html) derived from the authoritative placement; the initial hint dismisses permanently on first placement"
    requirement: "GAME-03"
    verification:
      - kind: manual_procedural
        ref: "npm run build (bundles pips + hint + Lucide MoveDown) — pass; visual pip fill / hint dismiss confirmed at the human-verify checkpoint (Task 3, approved)"
        status: pass
    human_judgment: true
    rationale: "Pip fill color, hint animation, and dismiss-on-first-placement are visual behaviors requiring a browser; confirmed at the approved checkpoint."
  - id: D2
    description: "Admin card shows per-team N/8 during the HTML phase via textContent (anti-XSS), from getPublicState().teams[].progress"
    requirement: "GAME-03"
    verification:
      - kind: manual_procedural
        ref: "buildTeamCard progressEl.textContent = `${placed}/${total} peces` (admin.js:342-343); N/8 coherence + no cross-team re-render confirmed at checkpoint step 10 (approved)"
        status: pass
    human_judgment: true
    rationale: "Cross-team no-re-render and coherent N/8 display are runtime multi-client behaviors; confirmed visually at the approved checkpoint."
  - id: D3
    description: "Rendered robot identity intact: srcdoc <img> preserve id (incl. directional antena-esquerra/antena-dreta) + class, and <output id=\"boca\">BEEP BEEP</output> exists (A2 — needed for Phase 4 scoring)"
    requirement: "GAME-06"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint step 12 DevTools srcdoc inspection — id/class/<output> confirmed (approved)"
        status: pass
    human_judgment: true
    rationale: "DOM identity in the sandboxed iframe srcdoc requires DevTools inspection in a browser; confirmed at the approved checkpoint (closes A2)."
  - id: D4
    description: "Gesture reads as the UI contract: magnet snap, rebound on invalid, distractor shake, F5 recovery, freeze-disables-drag (closes A1)"
    requirement: "GAME-03"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint steps 4-11 — magnet/rebound/shake/F5/freeze all confirmed (approved)"
        status: pass
    human_judgment: true
    rationale: "Drag feel, F5 mid-phase recovery, and freeze behavior are end-to-end browser behaviors; confirmed at the approved checkpoint (closes A1)."

# Metrics
duration: ~10h wall (mostly human-in-the-loop checkpoint refinement; ~8 rounds)
completed: 2026-07-03
status: complete
---

# Phase 2 Plan 03: Feedback + human-verify checkpoint Summary

**Self-progress N/8 pips + a permanent calaix→tauler guidance arrow on the team screen, N/8 per-team on the Admin card, and a Web Audio feedback layer — then an 8-round human-verify checkpoint that reshaped the labels, slot visuals, directional pieces, drawer order and sounds, and caught two real bugs, closing the Fase HTML with the visual/interactive confirmation that cannot be automated.**

## Performance

- **Duration:** ~10h wall clock, but almost entirely human-in-the-loop. The two planned `type="auto"` tasks were quick; the bulk was the `checkpoint:human-verify` (Task 3) round-tripping through ~8 rounds of user-driven design refinement.
- **Started:** 2026-07-02T23:56:29+0200 (first plan commit)
- **Completed:** 2026-07-03T10:05:40+0200 (last plan commit)
- **Tasks (as planned):** 3 (2 auto + 1 checkpoint) — but see Deviations: the final behavior was shaped far beyond the original plan text by checkpoint feedback.
- **Files modified:** 4 (`client.js`, `client.css`, `admin.js`, `robotTemplate.js`) — 422 insertions, 83 deletions across the plan's commits.

## Accomplishments

- **Team screen N/8 progress (D-14):** a `.progress-pieces` label + 8-pip row, filled count = `Object.keys(latestPlacement).length` in `var(--phase-html)`, updated from the authoritative board-state (never a divergent local counter).
- **Initial guidance (D-14, evolved):** an initial "drag to the slots" hint with a Lucide `MoveDown` arrow — merged (round 5) into a single PERMANENT calaix→tauler divider element, animated within `prefers-reduced-motion: no-preference`, static otherwise.
- **Admin card N/8 (D-15):** `buildTeamCard` now fills the D-08-reserved `.team-card-progress` via `textContent` (anti-XSS, mitigates T-02-07) with `${placed}/${total} peces` from `getPublicState().teams[].progress`; left blank outside the HTML phase. No new structural card element.
- **Web Audio feedback layer:** lazy single `AudioContext` (created on first gesture per autoplay policy) driving pickup/drop blips, a zipper-tick drag sound, and a bell alert on genuine placement rejections.
- **Directional gameplay (D-07 extended):** antena/orella split into left/right piece types with real per-slot type-check enforcement — this also makes the srcdoc carry distinct `id="antena-esquerra"` / `id="antena-dreta"` while keeping the shared `class="antena"` for Phase 4 scoring.
- **Human-verify checkpoint approved:** magnet/rebound/shake, F5 recovery, no cross-team re-render, srcdoc id/class/`<output>` identity, and freeze-disables-drag all confirmed visually — closing assumptions A1 (revert feel) and A2 (DOMPurify preserves id/`<output>`).

## Task Commits

The two auto tasks committed cleanly; the checkpoint then produced 8 rounds of refinement commits (this is expected GSD behavior — the checkpoint doing its job, not scope creep).

**Planned auto tasks:**
1. **Task 1: Team N/8 pips + initial hint (D-14)** — `06106a9` (feat)
2. **Task 2: Admin card N/8 per team (D-15)** — `e99616c` (feat)

**Checkpoint refinement rounds (Task 3 human-verify):**
- **r1 — literal tag labels:** `8f29202` + `6cb7b49` — piece/slot/container labels became the real literal HTML tag WITH `< >` (reverses D-12's bracket-free resolution, explicit user override; commit `6cb7b49` records the override in robotTemplate.js).
- **r2 — visual refinement:** `dbac894` — removed chip icons for full `<img src=...>` labels; empty slots blank + red (`--color-destructive`) background; container frames show opening + closing tags; distractor chips get code-style labels instead of emoji; preview background → photo + dark overlay.
- **r3 — directional pieces:** `d5f1ba6` + `c1c563f` — antena/orella split into directional left/right types (real gameplay enforcement) + permanent divider text between drawer and board.
- **r4 — stable drawer order:** `b678afe` — drawer piece order shuffled once per page session (Fisher-Yates), stable afterward (not re-shuffled on every board-state).
- **r5 — merged hint + divider:** `cf8d2a9` + `f8aea2e` — merged the dismissible D-14 hint and the permanent divider into ONE permanent element with an animated `MoveDown` arrow; added Web Audio pickup/drop blips.
- **r6 — richer audio:** `1fa1658` — continuous drag-loop scrape sound + bell-like mistake alert (broadened beyond distractors to any rejected placement).
- **r7 — audio artifact fix:** `d66b20a` — fixed a "creck creck" clicking artifact in the drag-loop noise buffer (longer buffer + edge fade).
- **r8 — two fixes:** `1953aab` + `025641b` — fixed a real bug (bell misfiring when moving/removing an ALREADY-PLACED piece, found by reading SortableJS 1.15.7 source directly) and, per explicit user request ("massa dens"), replaced the continuous noise-loop drag sound with a zipper-style train of discrete clicks.

_Separately committed during this window but OUT of this plan's scope (do not attribute to 02-03): `45dfa3d` — a Phase 4 todo noting the user's idea that scoring/ranking could factor in completion time._

## Files Created/Modified

- `src/client/client.js` (modified, +316/−...) — `.progress-pieces` pip row derived from `latestPlacement`; merged permanent `.drag-hint` divider with `MoveDown` arrow; one-shot session dismissal flag; Fisher-Yates once-per-session drawer shuffle; lazy single `AudioContext` + pickup/drop/zipper-tick/bell helpers; bell gated to drawer-origin rejections via SortableJS `evt.from`.
- `src/client/client.css` (modified) — `.progress-pieces`/`.pip`/`.pip--filled` (tokens-only, `--phase-html`), `.drag-hint` + `drag-hint-nudge` keyframe inside `prefers-reduced-motion: no-preference`, empty-slot `--color-destructive` background.
- `src/client/admin.js` (modified) — `buildTeamCard` fills `.team-card-progress` via `textContent` from `team.progress`.
- `src/shared/robotTemplate.js` (modified) — directional antena/orella SLOTS + PIECES (count 1 each, sum still 8); `pieceLabel`/`containerLabel`/`containerClosingLabel` producing literal-tag labels with angle brackets, derived from `SLOTS[].html`/`CONTAINERS` (never hand-written); `IMG_LABEL_SRC` display-only fake srcs for directional chips.

## Decisions Made

- **D-12 reversed → literal tags with angle brackets** (rounds 1-2): labels show the real HTML tag (`<img class="antena">`, `<section id="robot-contenidor">`, `</section>`), still derived from the single-source template, read-only plain text. A future reader of 02-UI-SPEC.md will see the original "no brackets" resolution — this is the pointer that it was deliberately overridden by the user at the checkpoint.
- **D-07 extended → directional antena/orella** (round 3): left/right are distinct types with real rejection on the wrong side. A future reader of 02-CONTEXT.md will see the original generic-type assumption — this is the pointer that it was deliberately split. Shared `class` unchanged, so Phase 4 scoring identity (A2) is unaffected; only per-instance ids differ.
- Merged hint + divider into a single permanent guidance element; drawer order shuffled once per session (not per board-state); empty slots use a red background as the "needs filling" cue; preview background is a photo + dark overlay.

## Deviations from Plan

The plan's `<objective>` (progress N/8 on team + admin, initial hint, human validation closing A1/A2) was achieved in full. HOWEVER — honestly, for future-you — a large share of the FINAL behavior was shaped by the human-verify checkpoint, not by the original plan text:

- The original plan described a **dismissible** hint; it became a **permanent merged** divider+arrow (round 5).
- The original plan (and D-12) said labels should be **bracket-free class/type names**; they became **literal HTML tags with angle brackets** (rounds 1-2, user override).
- The original template had **generic** antena/orella types; they became **directional left/right** with real enforcement (round 3).
- The plan mentioned **no audio at all**; four distinct Web Audio effects were added (rounds 5-8) at user request.
- Slot/chip/frame/background visuals were substantially reworked (round 2).

This is expected/correct GSD behavior: the checkpoint is where human perception reshapes what automation cannot pre-specify. Recording it here so the SUMMARY reflects what is actually on disk, not just what was originally planned.

## Issues Encountered

Two GENUINE defects were caught by human verification during the checkpoint (not preference tweaks — real bugs):

1. **Per-slot bell misfiring on placed-piece moves** (fixed in `1953aab`): the bell/rejection sound was firing when a user MOVED or REMOVED an already-placed piece, not only on genuine placement rejections. Root-caused by reading the SortableJS 1.15.7 source directly to understand the `onEnd`/`from`/`to` semantics; fixed by gating the bell to drawer-origin drops (`evt.from` is the calaix).
2. **Noise-buffer loop-seam click** (fixed in `d66b20a`): the continuous drag-loop scrape sound had an audible "creck creck" artifact at the buffer loop seam; fixed with a longer buffer + edge fade. (Later superseded in r8 by the zipper-tick approach per user preference, but the fix was a real audio-engineering defect.)

## Known Stubs

- `src/client/public/{antena,orella,fons}.svg` remain **intentional placeholder** art from Plan 01 (final art was Plan 03's nominal scope per the user_setup entry, but the owner opted to keep placeholders — the mechanic is complete and correct with them). The directional split means the eventual real art will need distinct left/right antena and orella assets; the `IMG_LABEL_SRC` fake filenames (`aerial_left.png` etc.) are DISPLAY-ONLY chip labels and are never fetched.
- Not blocking: placement, preview, progress, and scoring-relevant srcdoc identity all work correctly with the placeholders.

## Next Phase Readiness

- Fase HTML is complete, human-approved, and green (`npm test` 31/31, `npm run build` clean).
- Phase 3 (CSS/JS) builds on this DOM and can reuse the same N/8 progress + directed-emit patterns; the srcdoc identity (id/class/`<output>`) that Phase 4 scoring depends on is now human-confirmed, including the new directional `antena-esquerra`/`antena-dreta` ids.
- Carry-forward for Phase 4: the user's idea (captured in `45dfa3d`) to let scoring factor in completion time.
- Carry-forward for whoever authors final art: distinct left/right antena + orella assets are now required (directional split is live).

## Self-Check: PASSED

All 4 modified source files present on disk; all 14 plan commits (2 auto + 12 checkpoint-refinement) found in git history.

---
*Phase: 02-joc-fase-html-blocs-drag-drop*
*Completed: 2026-07-03*
