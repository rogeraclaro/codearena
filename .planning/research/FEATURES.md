# Feature Research

**Domain:** Real-time gamified classroom webapp — team-based HTML/CSS/JS learning game with admin-paced phases and auto-scoring vs a model page
**Researched:** 2026-07-01
**Confidence:** MEDIUM (cross-checked web sources: official Kahoot/Quizizz support docs, official Socket.io docs, GitHub reference implementations, direct hands-on knowledge of Flexbox Froggy / code.org App Lab / Scratch-Blocks)

## Feature Landscape

Reference products surveyed: Kahoot!, Quizizz (live-quiz control panel + team play + reconnection), Scratch / Blockly / Scratch-Blocks (drag-and-drop block editors), code.org App Lab (split editor + live preview for zero-experience learners), Flexbox Froggy and CSS Battle (gamified real-syntax coding with instant visual feedback).

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or breaks the 15-20 min session.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Global countdown timer visible to all clients | Every live-quiz product (Kahoot, Quizizz) makes the timer the shared heartbeat of the session; without it, teams don't know the pace | LOW | Server is the single source of truth for time remaining; broadcast a tick or a target end-timestamp, never trust client clocks |
| Admin pause/resume timer | Kahoot's own support forum shows this is a top-requested control — a stalled team or a classroom interruption (question, technical issue) needs this or the whole game desyncs | LOW | Pause must freeze the *server* timer, not just hide it on client; resume recalculates remaining time from stored state |
| Admin "+1 minute" / add-time control | Standard host lever in Kahoot/Quizizz-style tools to compensate for scope misjudgment mid-session; without it, admin has no fine control besides full pause | LOW | Just adds delta to server-side end-timestamp and rebroadcasts |
| Real-time team status/progress overview (host dashboard) | Both Kahoot and Quizizz give the host a live glance at all players' progress (progress bars, per-player correct/incorrect counts) — an admin driving a 15-20 min session cannot tab through each team | MEDIUM | For 4-6 teams this is a simple grid/table, not a complex dashboard; needs per-team phase + rough completion signal, not exhaustive detail |
| Reconnection / state recovery after refresh | Kahoot's own reconnection UX (auto-reconnect preserves score) exists precisely because classroom Wi-Fi and accidental refreshes are common; project context explicitly calls this "critical" since there's no time to redo a 15-min session | MEDIUM | Server holds authoritative per-team state in memory; client identifies itself (e.g. team token in localStorage) and on reconnect the server replays current phase/state — this is Socket.io's built-in connection state recovery pattern, or a custom room-rejoin handshake |
| Drag-and-drop block editor with strong snap-to-valid-slot | Direct precedent: Scratch/Blockly's entire value proposition is constraint-based snapping that makes invalid assembly impossible, eliminating syntax errors — this is also the project's core pedagogical requirement | MEDIUM-HIGH | "Strong snap" (bad drop returns to tray or snaps to nearest valid slot) is a deliberate UX choice, not default library behavior — needs custom snap-distance/validity logic on top of a base drag library |
| Live preview pane synced to editor state | code.org App Lab and Flexbox Froggy both prove the split "you edit here, you see result there instantly" layout is the expected mental model for any code-adjacent learning tool | LOW-MEDIUM | Since there's no free-text code, preview re-render can be a deterministic function of the current block/rule state — no need for a live interpreter/sandbox of arbitrary code |
| End-of-game ranking/results screen | Every gamified quiz tool (Kahoot podium, Quizizz leaderboard) closes with a ranked results reveal — it's the payoff moment and expected by both students and teacher | LOW-MEDIUM | Percentage-based scoring per team, sorted descending; simple UI, high perceived value |
| Team identification without accounts | Kahoot/Quizizz nickname-based, no-login team joining is standard for one-off classroom sessions — matches project's explicit no-auth requirement | LOW | Admin registers team names once at session start; no persistence needed beyond the session |
| Admin-forced phase transitions | Kahoot/Quizizz hosts control when the group moves to the next question/round — self-paced student progression doesn't fit a synchronized classroom drill | LOW-MEDIUM | Server broadcasts a phase-change event that all clients must obey immediately, including teams still mid-task |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by genre precedent, but align with the project's specific pedagogical core value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Real syntax with constrained input (CSS "foradat" fill-in-the-blank) | Flexbox Froggy validates this exact pattern: real CSS property/value editing (not a fully visual abstraction) teaches transferable syntax literacy while a controlled input surface (color pickers, sliders) prevents typo-class errors — best of both worlds vs. pure-visual tools | MEDIUM | Requires mapping each controlled input (slider/picker) to the real CSS property it writes, and rendering the actual property:value pair visibly so students see genuine syntax |
| JS event→target→action rule builder ("Quan X → element Y → Fes Z") | No surveyed competitor targets absolute zero-experience learners with a natural-language-shaped rule constructor for JS specifically — this is a genuine gap-fill between Scratch-style block logic and code.org's more code-literal blocks | MEDIUM-HIGH | Teaches the event listener mental model explicitly as three dropdowns rather than nested blocks; scoring later must verify the *semantic* triple (event bound, correct target, correct action), not literal DOM/JS text |
| Automated per-phase scoring against a live model page (DOM diff, computed style diff, event-binding verification) | Table-stakes in code education platforms (Udacity js-grader precedent) but rare in classroom-game tools (Kahoot/Quizizz only grade multiple-choice); doing this for open-ended HTML/CSS/JS construction inside a *game* format is the product's unique combination | HIGH | This is the highest-complexity feature in the whole product — needs jsdom-style parsing of team's produced HTML, `getComputedStyle` reads on key elements for CSS, and functional verification (not text match) for JS; partial credit logic matters for a fair percentage score |
| Icon-driven, near-zero-text UI for absolute beginners | Table-stakes tools (Kahoot/Quizizz/code.org) still lean on text-heavy instructions and settings menus; minimizing text is a differentiator for a population with zero prior exposure to programming vocabulary and a hard 15-20 min clock where reading time is wasted time | MEDIUM | Requires strong icon/color semantics (e.g. consistent color-coding per HTML/CSS/JS phase) validated with real target-audience users, not just aesthetic choice |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this project's specific constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Free-text code editor (even as an "advanced" option) | Feels more "real" and is what most coding platforms (App Lab's text-mode toggle) eventually offer | Directly contradicts the core pedagogical requirement (zero syntax errors, zero frustration) and reintroduces the exact failure mode being designed around; also blows up auto-scoring complexity (arbitrary code, not comparable structures) | Keep 100% controlled input (blocks / foradat CSS / rule builder) — this is explicitly Out of Scope already in PROJECT.md |
| Configurable exercise editor for admin | Seems like an obvious v2 win and low-hanging "flexibility" feature | Adds a whole content-authoring UI and generalizes the scoring engine (which is currently hard-coded against one Model Page) — scope explosion for a single 15-20 min fixed exercise; already correctly flagged Out of Scope in PROJECT.md | Ship v1 hard-coded to one exercise/Model Page; parametrize only after the fixed version is validated |
| Full leaderboard/score persistence across sessions (accounts, history, DB) | Natural feature-creep once ranking exists — "why not save history/track class progress over time?" | Contradicts explicit constraint that state lives in memory only for a single 15-20 min session; adds a persistence layer, migrations, and privacy/PII concerns for minors with zero product need | If historical tracking is ever needed, export a single JSON/CSV per session rather than building a database layer |
| Redis/pub-sub or multi-server scaling infrastructure | Feels "production-grade" and future-proof | Solves a problem the project doesn't have (4-6 teams + 1 admin on one classroom VPS, single Node process) — pure premature complexity per the research on Socket.io architecture patterns (Redis only matters at multi-instance scale) | Single in-memory server process with Socket.io rooms is sufficient; revisit only if concurrent multi-classroom sessions become a real requirement |
| Exact-match / literal source-code comparison for scoring | Simplest-seeming grading approach ("just diff the HTML string") | Any whitespace, attribute-order, or class-order difference produces false negatives even when the team is functionally correct — this is a known failure mode in naive code-grading tools | Grade by parsed DOM structure / computed style / behavior verification (per Udacity js-grader precedent), not string diff |
| Letting teams self-advance through phases at their own pace | Feels more "student-centered" and reduces admin's coordination burden | Breaks the explicit synchronized classroom drill design (admin controls global timer/phase for all teams at once); mixed pacing would make the shared Model Page reveal and comparative scoring incoherent | Keep phase transitions strictly admin-triggered and global, exactly as scoped |

## Feature Dependencies

```
[Server-authoritative game state] (Node.js + Socket.io rooms)
    └──requires──> [Team registration by admin]
                       └──enables──> [Reconnection / state recovery]

[Global countdown timer]
    └──requires──> [Server-authoritative game state]
[Admin pause/resume]  ──requires──> [Global countdown timer]
[Admin +1 minute]     ──requires──> [Global countdown timer]

[Admin-forced phase transitions] ──requires──> [Server-authoritative game state]
    └──enables──> [Live team status/progress overview]

[Drag-and-drop block editor with strong snap] (Phase 1: HTML)
    └──enables──> [Live preview pane] (renders from block state)
[CSS foradat controlled inputs] (Phase 2)
    └──requires──> [Phase 1 output as base DOM]
    └──enables──> [Live preview pane] (applies styles to preview)
[JS event→target→action rule builder] (Phase 3)
    └──requires──> [Phase 1 + Phase 2 output as base DOM+CSS]
    └──enables──> [Live preview pane] (behavior demo)

[Automated per-phase scoring]
    └──requires──> [Model Page reference definition] (fixed exercise, hard-coded)
    └──requires──> [Live preview / produced DOM+CSS+JS state per team]
    └──enables──> [Ranking / results screen]

[Icon-driven minimal-text UI] ──enhances──> [all client-facing features] (not a dependency, a cross-cutting constraint)
```

### Dependency Notes

- **Reconnection requires server-authoritative state:** because the server (not the browser) is the single source of truth for phase, timer, and per-team progress, a refreshed/reconnected client can simply be handed the current snapshot — this only works because state never lived client-side to begin with.
- **Phase 2 and Phase 3 require prior phase output:** CSS styling operates on the HTML skeleton the team built in Phase 1; JS rules bind to elements/selectors that must already exist. If a team's Phase 1 was incomplete or scored poorly, Phase 2/3 should still proceed against whatever they produced (per the "phases end on timeout regardless of completion" rule already in PROJECT.md) — the scoring engine must handle partial/incorrect DOM gracefully rather than assuming a valid base.
- **Automated scoring requires a fixed Model Page:** the DOM-diff/computed-style/event-verification approach only works against a known-good reference; this is why "configurable exercise editor" is correctly out of scope for v1 — generalizing the grader to arbitrary exercises is a separate, much larger feature.
- **Icon-driven UI conflicts with nothing structurally** — it's a rendering/content constraint applied across every screen, not a discrete feature with its own dependency chain, but it does raise the design cost of every other feature (each control needs an icon-first affordance, not just a label).

## MVP Definition

### Launch With (v1)

Minimum viable product — matches PROJECT.md's Active requirements exactly; nothing here should be trimmed further without revisiting Core Value.

- [ ] Node.js + Socket.io server holding authoritative in-memory game state — everything else depends on this
- [ ] Admin panel: team registration, start-phase-with-countdown, pause/resume, +1 minute, live team status overview, "Finish & Show Results"
- [ ] Client team screen: split panel (action left / live preview right), reconnect-safe
- [ ] Phase 1 HTML: drag-and-drop blocks with strong snap (invalid drop returns to tray or snaps to nearest valid slot)
- [ ] Phase 2 CSS: real-syntax fill-in-the-blank with controlled inputs (color pickers, sliders)
- [ ] Phase 3 JS: event→target→action rule builder via dropdowns
- [ ] Auto-scoring: DOM structure diff (HTML), computed-style diff (CSS), event-binding+action verification (JS) against the fixed Model Page
- [ ] Ranking screen: percentage score per team, sorted
- [ ] Minimal-text, icon-driven UI throughout

### Add After Validation (v1.x)

Features to add once the core 15-20 min session is proven to work in a real classroom.

- [ ] Parametrizable exercise/Model Page (multiple exercises, admin-selectable) — trigger: teachers ask to reuse the tool for a second lesson topic
- [ ] Finer-grained partial credit / feedback detail per team (e.g. which specific sub-checks passed) — trigger: teachers want a debrief tool, not just a ranking
- [ ] Configurable team count beyond 4-6 — trigger: a classroom with a different team layout requests it

### Future Consideration (v2+)

Features to defer until the single-exercise MVP has been used in multiple real sessions.

- [ ] Session history/export (CSV/JSON of results) — defer until there's a real request to compare cohorts over time; don't build a database prematurely
- [ ] Multi-classroom concurrent sessions (would require Redis-backed state) — defer until actual multi-room concurrent demand exists; current scale (1 admin, 4-6 teams) doesn't need it
- [ ] Free-text/advanced code mode as an optional "expert" toggle for repeat users — only after the guided version has proven the pedagogy works, and only as a strictly separate, clearly-labeled mode never mixed into the beginner flow

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Server-authoritative real-time state (Socket.io) | HIGH | MEDIUM | P1 |
| Global timer + pause/resume/+1min | HIGH | LOW | P1 |
| Reconnection / state recovery | HIGH | MEDIUM | P1 |
| HTML drag-and-drop with strong snap | HIGH | MEDIUM-HIGH | P1 |
| CSS foradat controlled inputs | HIGH | MEDIUM | P1 |
| JS event→target→action rule builder | HIGH | MEDIUM-HIGH | P1 |
| Live preview pane | HIGH | LOW-MEDIUM | P1 |
| Admin team-status overview | MEDIUM | MEDIUM | P1 |
| Automated scoring engine (DOM/style/event) | HIGH | HIGH | P1 |
| Ranking/results screen | MEDIUM | LOW | P1 |
| Icon-driven minimal-text UI | MEDIUM | MEDIUM | P1 (cross-cutting) |
| Parametrizable exercises | MEDIUM | HIGH | P3 |
| Session history/export | LOW | MEDIUM | P3 |
| Multi-classroom scaling (Redis) | LOW | HIGH | P3 |
| Free-text "expert" code mode | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Kahoot/Quizizz | Scratch/Blockly/code.org | Flexbox Froggy/CSS Battle | Our Approach |
|---------|--------------|--------------|--------------|
| Timer control | Per-question timer, host-set 5s-4min, on/off toggle | Not timed (self-paced) | Not timed (self-paced, level-based) | Single global admin-controlled countdown per phase, with pause/resume/+1min — synchronized drill, not self-paced |
| Reconnection | Auto-reconnect preserves score on transient drop; manual refresh loses score | N/A (single-player, no session state to lose) | N/A | Server-side state snapshot replay on reconnect — must preserve progress even across refresh, stricter than Kahoot's own guarantee |
| Editing paradigm | N/A (multiple-choice only) | Full block-based visual programming (broad vocabulary) | Real syntax, narrow controlled scope (property/value only) | Hybrid: full block assembly for HTML (Scratch-like), controlled real-syntax for CSS (Frogg-like), rule-builder abstraction for JS (novel) |
| Feedback loop | End-of-question score reveal | Immediate run/test in same canvas | Instant live visual re-render per keystroke | Instant live preview pane synced to every edit, across all 3 phases |
| Scoring | Auto (multiple-choice correctness only) | None (no built-in grading) | Level-pass/fail (did the frog reach the lilypad) | Auto-scoring via structural/style/behavioral comparison to Model Page — most sophisticated of all surveyed tools, closest precedent is Udacity's js-grader, not a game platform |
| Host visibility | Live leaderboard + per-player progress bars | N/A | N/A | Compact 4-6 team status grid — same spirit, smaller scale, phase-aware rather than question-aware |

## Sources

- [Live game settings – Kahoot! Help & Resource Center](https://support.kahoot.com/hc/en-us/articles/115016055107-Live-game-settings)
- [Pause a Live Kahoot – Kahoot! Help & Resource Center](https://support.kahoot.com/hc/en-us/community/posts/31508888646941-Pause-a-Live-Kahoot)
- [How to control lesson dynamics with Kahoot!](https://kahoot.com/blog/2020/10/06/control-lesson-dynamics-with-kahoot/)
- [Class Quiz Games with Quizizz — Learning in Hand](https://learninginhand.com/blog/quizizz)
- [How to avoid connectivity issues – Kahoot! Help & Resource Center](https://support.kahoot.com/hc/en-us/articles/115003198708-How-to-avoid-connectivity-issues)
- [Team experience: How to play kahoot in groups – Kahoot! Help & Resource Center](https://support.kahoot.com/hc/en-us/articles/4408679135891-Kahoot-game-play-in-team-mode)
- [What happens if I get disconnected during a game? - Kahoot Join](https://kahootjoincode.com/what-happens-if-i-get-disconnected-during-a-game/)
- [Blockly — Grokipedia](https://grokipedia.com/page/Blockly)
- [What is Block Coding for Kids | Learning Resources UK](https://www.learningresources.co.uk/blog/what-is-block-coding-for-kids/)
- [Flexbox Froggy - A game for learning CSS flexbox](https://flexboxfroggy.com/)
- [GitHub - thomaspark/flexboxfroggy](https://github.com/thomaspark/flexboxfroggy/)
- [App Lab | Code.org](https://code.org/tools/applab)
- [Code.org Tool Documentation - Multi-Screen Apps](https://studio.code.org/docs/concepts/app-lab/multi-screen-apps/)
- [Connection state recovery | Socket.IO](https://socket.io/docs/v4/connection-state-recovery)
- [GitHub - udacity/js-grader](https://github.com/udacity/js-grader)
- [SortableJS](https://sortablejs.github.io/Sortable/)
- [draggable vs dragula vs interact.js vs sortablejs | npm trends](https://npmtrends.com/draggable-vs-dragula-vs-interact.js-vs-sortablejs)

---
*Feature research for: Real-time gamified classroom coding education webapp*
*Researched: 2026-07-01*
