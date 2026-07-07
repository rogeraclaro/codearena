---
phase: quick-260707-uve
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/server/gameState.js
  - test/prevPhase.test.js
autonomous: true
requirements: [WR-02]
must_haves:
  truths:
    - "previousPhase() returns false and mutates nothing when state.finished is true"
    - "previousPhase() behaves exactly as before when state.finished is false"
  artifacts:
    - src/server/gameState.js
    - test/prevPhase.test.js
  key_links:
    - "previousPhase() finished-guard mirrors finalizeGame()'s idempotency guard (mutation-returns-bool convention)"
---

<objective>
Close WR-02 from the Phase 04.1 code review: `gameState.previousPhase()` never re-validates
`state.finished` server-side, so a stray/duplicate `admin:prev-phase` emit, a two-tab race, or a
modified client could move `state.phase` backward AFTER the game is finalized — silently re-enabling
team CSS/JS mutation even though a final ranking is already frozen and displayed.

Purpose: Enforce the "no going back after finalize" invariant server-side (V4 — never trust the
client), matching every other admin mutation in this codebase. Today it is enforced only by hiding
a button in `admin.js`.
Output: A one-line guard in `previousPhase()` plus a regression test proving the guard holds and
that non-finished behavior is unchanged.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/04.1-millores-operatives-d-admin-tornar-fase-anterior-reset-servi/04.1-REVIEW.md

# The mutation to fix + the pattern to mirror (finalizeGame idempotency guard):
@src/server/gameState.js
# Existing integration/model tests for previousPhase (mirror their conventions):
@test/prevPhase.test.js
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add finished-guard to previousPhase() and cover it with a regression test</name>
  <files>src/server/gameState.js, test/prevPhase.test.js</files>
  <behavior>
    - When state.finished is true, previousPhase(durationMs) returns false and does NOT change
      state.phase, state.phaseEndsAt, state.timerStatus, or state.remainingMsAtPause.
    - When state.finished is false, previousPhase() keeps its current behavior exactly (all existing
      prevPhase tests still pass unchanged).
  </behavior>
  <action>
    In src/server/gameState.js, add the guard as the FIRST statement inside previousPhase() (the
    function currently at ~lines 321-326, right below its existing doc comment), BEFORE the
    currentIndex/prevIndex computation: return false immediately when state.finished is truthy.
    This mirrors the idempotency guard already at the top of finalizeGame() (~line 289), and it
    preserves the mutation-returns-bool convention the whole file uses — callers only broadcast
    session:full-state when the function returns true, so a false return here means no broadcast and
    no state change. Reference: WR-02 in 04.1-REVIEW.md.

    Scope discipline: touch ONLY previousPhase(). Do NOT modify nextPhase(), startPhase(), or any
    admin handler in socketHandlers.js — the ADMIN_PREV_PHASE handler already broadcasts only on a
    true return, so the guard wires through with zero handler changes.

    Out-of-scope call-out (do NOT fix here, per WR-02 scope): nextPhase() has the same missing
    finished-guard — after finalize it would no-op only because 'js' is already the last phase, but
    it is not explicitly guarded either. This is a known-adjacent gap; flag it in the SUMMARY as a
    candidate future finding. Do not touch it in this plan.

    In test/prevPhase.test.js, add ONE regression test near the end of the file — after
    'PREV-INVALID-DURATION' and BEFORE the 'cleanup' test. Ordering matters: this test drives
    state.finished to true (via gameState.finalizeGame(), the same singleton the other tests mutate),
    which is a terminal state with no in-test reset, so it must run last so it cannot poison the
    earlier PREV tests that require finished=false. In the test: set a known phase with
    startPhase('css', 60000), call finalizeGame() and assert it returned true, snapshot
    getPublicState(), then assert previousPhase(60000) === false and that phase/phaseEndsAt/
    timerStatus/remainingMsAtPause are all unchanged versus the snapshot. First confirm finalizeGame
    is exported on the gameState object (the file already imports { gameState }); if it is not
    exported, prefer adding the test's finished state through the existing public export surface
    rather than reaching into internals.
  </action>
  <verify>
    <automated>node --test test/prevPhase.test.js</automated>
  </verify>
  <done>
    - previousPhase() returns false with zero state mutation when state.finished is true (new test passes).
    - All pre-existing prevPhase tests still pass (non-finished behavior unchanged).
    - Only previousPhase() changed in gameState.js; nextPhase()/startPhase()/socketHandlers.js untouched.
  </done>
</task>

</tasks>

<verification>
- Run `node --test test/prevPhase.test.js` — all tests green, including the new finished-guard test.
- Diff of src/server/gameState.js shows exactly one added guard line inside previousPhase() and no
  other logic changes.
- `git diff` touches only src/server/gameState.js and test/prevPhase.test.js.
</verification>

<success_criteria>
Calling previousPhase() when state.finished is true returns false and leaves state.phase,
state.phaseEndsAt, and state.timerStatus untouched; when state.finished is false, behavior is
byte-for-byte the prior behavior. nextPhase() left unchanged, with its adjacent gap noted for a
future finding.
</success_criteria>

<output>
Create `.planning/quick/260707-uve-afegeix-guard-server-side-finished-a-gam/260707-uve-SUMMARY.md` when done
</output>
