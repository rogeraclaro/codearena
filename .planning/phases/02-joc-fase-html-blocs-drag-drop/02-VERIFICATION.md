---
phase: 02-joc-fase-html-blocs-drag-drop
verified: 2026-07-03T12:00:00Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 2: Joc — Fase HTML (blocs drag & drop) Verification Report

**Phase Goal:** Els equips poden completar la Fase HTML del joc muntant l'esquelet de la pàgina amb blocs, sense poder escriure cap codi lliure
**Verified:** 2026-07-03T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Note on MVP mode / User Story format

ROADMAP.md marks Phase 2 `Mode: mvp`, but its `**Goal:**` line is written as a
capability statement, not `As a … I want to … so that …`. Verified with
`gsd_run query user-story.validate` — the literal ROADMAP goal returns
`valid:false`; the equivalent story hand-derived in `02-01-PLAN.md`'s
`<objective>` ("As a equip d'alumnes sense experiència prèvia, I want to
muntar l'esquelet HTML … so that entenc que l'HTML és l'estructura …") does
validate `true`. This is a pre-existing, explicitly-documented, non-blocking
gap (the plan itself calls it out and points to `/gsd mvp-phase 2` as the
fix). It does not affect the substance of this verification — the ROADMAP
Success Criteria (the authoritative contract per Step 2a) are verified below
regardless of goal-string formatting.

## Goal Achievement

### Observable Truths

Merged from ROADMAP §Phase 2 Success Criteria (authoritative) + PLAN
`must_haves.truths` across 02-01/02-02/02-03.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un equip pot arrossegar blocs HTML des del calaix i encaixar-los a l'estructura; un lloc invàlid torna al calaix o s'ajusta al slot vàlid més proper (snap fort) — ROADMAP SC-1 | ✓ VERIFIED | Server type/direction-check: `gameState.js:85-95 placePiece()` rejects unknown slot / type mismatch / occupied / exhausted inventory; `test/placement.test.js` PLACE-OK, PLACE-TYPE-REJECT, PLACE-DIRECTION-REJECT all pass (34/34 `npm test`). Client magnet+revert: `client.js:517-556` per-slot `Sortable` with `group.put` as a type-check function + `emptyInsertThreshold:40` (magnet) and native SortableJS revert (rebound) — no custom "invalid" code path needed. Gesture feel was closed by the **executed and approved** blocking checkpoint `02-03-PLAN.md` Task 3 (steps 4-6), recorded in `02-03-SUMMARY.md` coverage item D4 as "approved". |
| 2 | La preview de la dreta es re-renderitza a l'instant amb cada bloc col·locat, reutilitzant la canonada de Fase 1 — ROADMAP SC-2 | ✓ VERIFIED | `client.js:652-673 assemblePreview()` called from the `TEAM_BOARD_STATE` handler (`client.js:874-880`) on every placement/removal; reuses the Phase-1 `iframe.preview-frame` (`renderActiveSplitScreen`, `client.js:722-775`) unmodified in shape. `DOMPurify.sanitize(raw, {ADD_TAGS:['output'], ALLOWED_ATTR:['src','alt','class','id']})` preserves identity. Human-confirmed identity in DevTools at checkpoint step 12 (D3, "approved"). |
| 3 | En cap moment de la fase HTML l'equip pot escriure text de codi lliure — totes les interaccions són blocs predefinits arrossegables — ROADMAP SC-3 / GAME-06 | ✓ VERIFIED | `assemblePreview()` builds `raw` HTML **exclusively** from `SLOTS[].html` (frozen template, `robotTemplate.js:23-72`) keyed by `placement`, never from user text. Chips are read-only: `createChip`/`createDistractorChip` use `label.textContent = pieceLabel(type)` (never `innerHTML`), no editable inputs exist anywhere in the HTML-phase UI. No free-text field in `client.js` for the html phase. |
| 4 | robotTemplate.js is the single frozen source of truth: 8 leaf SLOTS, PIECES inventory, DISTRACTORS enum (D-01) | ✓ VERIFIED | `src/shared/robotTemplate.js:23-159` — `SLOTS` has exactly 8 `Object.freeze`d entries (verified by direct read: antena-esquerra/dreta, orella-esquerra/dreta, ull-1/2, nas, boca); `PIECES` sums to 8 (1+1+1+1+2+1+1); `DISTRACTORS = ['banana','roda','sabata']`; outer array and every entry `Object.freeze`d. |
| 5 | Server placement authority: `placePiece()` validates and persists to `team.placement`, projects directed board to owner + N/8 to admin, never to `session` (Pitfall 1) | ✓ VERIFIED | `gameState.js:85-95`; `socketHandlers.js:226-239` (`TEAM_PLACE_PIECE` handler emits only `io.to(team:<id>)` + `io.to('admin')`); grep confirms 0 occurrences of `session` inside the place/remove handler bodies. `test/placement.test.js` NO-SESSION-BROADCAST passes. |
| 6 | F5/reconnexió recupera el robot mig muntat via `team:board-state` en connectar (CORE-03), sense protocol de resync nou | ✓ VERIFIED | `socketHandlers.js:91-93` emits `TEAM_BOARD_STATE` on the team's reconnection branch of `io.on('connection')`. `test/placement.test.js` F5 recovery test passes: reconnecting with the stored token returns the prior placement. |
| 7 | Un equip pot treure una peça col·locada (arrossegar-la fora del slot); el servidor la retira i el comptador N/8 baixa, sense fricció (D-10) | ✓ VERIFIED | `gameState.js:102-109 removePiece()` mirrors `placePiece` (mutation-returns-bool, no-op on empty slot); `socketHandlers.js:247-259` directed handler, never `session`. `test/placement.test.js` REMOVE round-trip + REMOVE no-op pass. Client: `client.js:527-533` calaix `onAdd` emits `TEAM_REMOVE_PIECE` when `evt.from.dataset.slotId` is set, no confirmation dialog. |
| 8 | El calaix reflecteix l'inventari restant (Pitfall 5); mai es poden col·locar més peces d'un tipus de les disponibles | ✓ VERIFIED | `gameState.js:76-81 countAvailable()` guards server-side; `client.js:330-343 remainingPieces()` derives the drawer visually from `PIECES` minus `placement`. `test/placement.test.js` INVENTORY cap passes (directional antena/orella, count 1 each, cannot be over-filled). |
| 9 | Els distractors (banana/roda/sabata) no tenen cap slot que els accepti → sempre reboten al calaix sense mecànica/missatge d'error nou (D-11) | ✓ VERIFIED | `DISTRACTORS` types appear in no `SLOTS[].accepts` value (verified by inspection of both arrays); `initSortables` `put` predicate (`client.js:564-565`) rejects any type mismatch → SortableJS native revert. Shake-only feedback added at `onEnd` (`client.js:546-554`), no error text/color. Human-confirmed at checkpoint step 6 (approved). |
| 10 | A `timerStatus==='frozen'` totes les instàncies SortableJS es desactiven (`option('disabled', true)`), no només l'overlay visual (D-11/Pitfall 4) | ✓ VERIFIED | `client.js:682-684 renderBoardAndDrawer` and `client.js:710-716 surgicalUpdate` both call `sortables.forEach((s) => s.option('disabled', frozen))` keyed off `state.timerStatus === 'frozen'` — this is the functional gate, distinct from the pre-existing visual overlay (`updateFrozenOverlay`). Human-confirmed at checkpoint step 11 (approved). This closes REVIEW.md's own T-02-05 mitigation claim by direct code inspection (not just the review's say-so). |
| 11 | Un equip no pot mutar el board d'un altre forjant `teamId` al payload (V4) | ✓ VERIFIED | `socketHandlers.js:229-230,250-251` derive `teamId` **exclusively** from `socket.data.teamId` (middleware-assigned), never `payload?.teamId`, for both `TEAM_PLACE_PIECE` and `TEAM_REMOVE_PIECE`. `test/placement.test.js` V4 forge test passes: team2 forging team1's id in the payload produces no effect on team1's board. |
| 12 | Progrés N/8 (pips) + pista inicial a la pantalla d'equip (D-14), i N/8 al card de l'Admin (D-15) | ✓ VERIFIED | `client.js:472-491 buildProgress()` derives pip count from `Object.keys(placement).length` (never a shadow counter); `client.js:499-512 buildDragHint()` present as the (evolved, per checkpoint round 5) permanent guidance element. `admin.js:370-377` fills the D-08-reserved `.team-card-progress` via `textContent` from `team.progress`. Human-confirmed at checkpoint steps 3, 10 (D1/D2, approved). |

**Score:** 12/12 truths verified (0 present-but-behavior-unverified — the gesture/visual truths that would otherwise require browser-based behavioral evidence were closed by an **executed, approved, blocking** `checkpoint:human-verify` task (`02-03-PLAN.md` Task 3), not merely claimed in a SUMMARY narrative — the resulting code changes from that checkpoint's 8 refinement rounds were independently re-read from disk for this verification, not taken on trust.)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/robotTemplate.js` | SLOTS/PIECES/DISTRACTORS frozen single source of truth | ✓ VERIFIED | 8 SLOTS, 7 PIECE types summing to 8, 3 DISTRACTORS; all `Object.freeze`d |
| `src/server/events.js` | +TEAM_PLACE_PIECE, TEAM_REMOVE_PIECE, TEAM_BOARD_STATE | ✓ VERIFIED | All 3 present, frozen object, no other file defines these strings inline |
| `src/server/gameState.js` | placement state + placePiece/removePiece/getTeamBoard + progress projection | ✓ VERIFIED | All functions present, guarded, exported |
| `src/server/socketHandlers.js` | directed handlers for place/remove, F5 board emit on connection, CR-01 admin auth | ✓ VERIFIED | Present; `ADMIN_SECRET` fail-closed middleware confirmed |
| `src/client/client.js` | calaix+tauler SortableJS, assemblePreview via DOMPurify, render decoupling, progress/hint, audio feedback | ✓ VERIFIED | 887 lines, all features present and wired |
| `src/client/client.css` | tokens-only styles for chips/slots/progress/hint/distractor/frozen | ✓ VERIFIED | `.progress-pieces`, `.drag-hint`, `.piece-chip--distractor`, frozen `:has()` selector all present |
| `src/client/admin.js` | team-card-progress filled with N/8, CR-02 textarea-preservation fix | ✓ VERIFIED | `buildTeamCard` line 370-377; `renderAdmin` lines 408-450 preserve/restore textarea value+focus+selection across every full re-render |
| `test/placement.test.js` | round-trip + remove + inventory + V4 + F5 test suite | ✓ VERIFIED | 12 tests present (setup + 10 assertions + cleanup), all pass |
| `src/client/public/{antena,orella,fons}.svg` | placeholder art (final art deferred by owner choice) | ✓ VERIFIED (documented stub) | 3 files present; SUMMARY explicitly documents these as an accepted, non-blocking placeholder — the mechanic is correct with them, only the visual art is provisional |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `client.js` slot `onAdd` | `socketHandlers.js` TEAM_PLACE_PIECE handler | `socket.emit(EVENTS.TEAM_PLACE_PIECE, {slotId, pieceType})` | ✓ WIRED | `client.js:578-581` |
| `socketHandlers.js` TEAM_PLACE_PIECE handler | `gameState.placePiece` → directed emit | `io.to(team:<id>).emit(TEAM_BOARD_STATE)` + `io.to('admin').emit(SESSION_FULL_STATE)`, never `session` | ✓ WIRED | `socketHandlers.js:234-237`; confirmed via grep (0 `session` references in handler body) and NO-SESSION-BROADCAST test |
| `client.js` calaix `onAdd` (from slot) | `socketHandlers.js` TEAM_REMOVE_PIECE handler | `socket.emit(EVENTS.TEAM_REMOVE_PIECE, {slotId})` | ✓ WIRED | `client.js:527-533` |
| `team:board-state` | `renderBoardAndDrawer` + `assemblePreview` | iframe `.preview-frame` srcdoc via DOMPurify | ✓ WIRED | `client.js:874-880` |
| `io.on('connection')` team branch | F5 board recovery | `socket.emit(TEAM_BOARD_STATE, getTeamBoard(...))` | ✓ WIRED | `socketHandlers.js:91-93` |
| `admin.js` `buildTeamCard` | `getPublicState().teams[].progress` | `progressEl.textContent` | ✓ WIRED | `admin.js:375-377` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full placement.test.js suite passes | `npm test` | 34/34 pass, 0 fail | ✓ PASS |
| Production build succeeds with new deps (SortableJS/DOMPurify/robotTemplate) | `npm run build` | Built in 729ms, no errors | ✓ PASS |
| Named test: PLACE-OK / PLACE-DIRECTION-REJECT / NO-SESSION-BROADCAST / V4 forge / F5 recovery | included in the `npm test` run above | all pass | ✓ PASS |
| CR-01 regression: unauthenticated admin escalation is closed | `test/adminAuth.test.js` (AUTH-OK/AUTH-WRONG/AUTH-MISSING, part of `npm test`) | 3/3 pass | ✓ PASS |

### CR-01 / CR-02 Remediation — Independently Re-Verified

Per the verification instructions, the REVIEW.md's claim that both critical
findings were fixed was **not** taken on trust — both fixes were read directly
from the current `src/server/socketHandlers.js` and `src/client/admin.js`:

- **CR-01 (unauthenticated admin escalation):** `socketHandlers.js:46-77` — an
  `ADMIN_SECRET` env var is read once at wire-up; if set, the `io.use()`
  connection middleware fail-closes (`next(new Error('unauthorized'))`) any
  handshake with `role:'admin'` that doesn't present a matching
  `adminSecret`. `admin.js:453-543` — the admin client now requires entering
  a secret via a login form before connecting, persisted in `localStorage`,
  with a `connect_error`-driven re-prompt on rejection. Regression-tested by
  `test/adminAuth.test.js` (3 tests, all pass).
- **CR-02 (admin panel data loss on re-render):** `admin.js:405-450`
  `renderAdmin()` now captures `#team-names-input`'s value, focus state, and
  selection range **before** the unconditional `app.textContent = ''`
  teardown, and restores all three after the rebuild — so a
  `session:full-state` broadcast fired mid-typing (which happens on every
  placement/removal during Phase HTML, per the review's own finding) no
  longer silently discards in-progress text.

Both fixes are present, correctly wired, and covered by the full green test
suite (34/34).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GAME-03 | 02-01, 02-02, 02-03 | Fase HTML: blocs drag & drop amb snap fort — invàlid torna al calaix o encaixa al vàlid més proper | ✓ SATISFIED | Server type/direction-check + client SortableJS magnet/revert, tested + human-checkpoint-approved (see Truths 1, 7-11) |
| GAME-06 | 02-01, 02-02, 02-03 | Cap fase permet escriptura lliure de codi | ✓ SATISFIED | srcdoc assembled exclusively from frozen template; all chip labels `textContent`; no editable input anywhere in the html-phase UI (see Truth 3) |

No orphaned requirements: REQUIREMENTS.md maps only GAME-03 and GAME-06 to
Phase 2, both are declared in every plan's `requirements:` frontmatter and
both are marked `[x]` in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/shared/robotTemplate.js` | 96 | Comment contains the word "PLACEHOLDER" | ℹ️ Info | Refers to intentional, documented display-only fake `src` filenames for chip labels (never fetched) — not a functional stub, no follow-up needed |
| `src/client/public/{antena,orella,fons}.svg` | — | Placeholder art assets | ℹ️ Info | Explicitly documented in `02-01-SUMMARY.md`/`02-03-SUMMARY.md` as an accepted, non-blocking deviation (owner opted to keep placeholders); mechanic is correct with them |

No `TBD`/`FIXME`/`XXX` debt markers found in any file modified by this phase.

The code review (`02-REVIEW.md`) additionally documents 5 warnings (WR-01…WR-05)
and 2 info items (IN-01, IN-02) that remain **explicitly deferred** (not
fixed) — none of them map to a Phase 2 must-have truth or ROADMAP success
criterion:
- WR-01/WR-02 concern `admin:register-teams` (Phase 1 / ADMIN-01 territory, not GAME-03/GAME-06).
- WR-03 (mid-drag reconciliation race) and WR-04 (no rejection signal to reconcile an optimistic DOM change) are edge-case robustness concerns under network contention, not correctness failures of the core mechanic — the server remains authoritative and self-heals on the next real board-state.
- WR-05 (full srcdoc replacement per placement) is a smoothness/performance nit, not a functional gap.
- IN-01/IN-02 are stale-comment/dead-code cleanliness items.

These are legitimate follow-up items but do not block the Phase 2 goal as
scoped by GAME-03/GAME-06 and the ROADMAP success criteria.

### Human Verification Required

None outstanding. The phase's own `checkpoint:human-verify` gate
(`02-03-PLAN.md` Task 3) already executed and was approved before this
verification ran; its resulting code changes (8 refinement rounds) were
independently re-read from the current on-disk source for this report rather
than accepted from `02-03-SUMMARY.md`'s narrative.

### Gaps Summary

No gaps. All ROADMAP Success Criteria and all PLAN must-have truths across
02-01/02-02/02-03 are verified against the current on-disk code, the full
test suite is green (34/34), the production build is clean, and both
critical code-review findings (CR-01 admin escalation, CR-02 admin data
loss) are independently confirmed fixed and regression-tested. The only
open items are pre-existing, explicitly-deferred code-review warnings that
do not map to this phase's required truths.

---

_Verified: 2026-07-03T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
