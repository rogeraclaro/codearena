# Phase 04: Puntuació i rànquing final - Research

**Researched:** 2026-07-05
**Domain:** Deterministic scoring engine over existing authoritative game state + client-side award-ceremony animation (Vanilla JS + Vite, Socket.io)
**Confidence:** HIGH (algorithms derive directly from verified codebase state; formula tuning is design discretion, flagged as such)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** HTML es puntua per **proximitat parcial** (no tot-o-res): percentatge de peces/slots correctament col·locats respecte el total de la Plana Model (`PIECES`/`SLOTS`).
- **D-02:** CSS es puntua per **distància normalitzada 0-100** per forat: colors amb distància RGB normalitzada, mides/sliders amb distància numèrica normalitzada pel rang min/max del forat (`CSS_HOLES`); el score CSS de l'equip és la **mitjana dels forats**.
- **D-03:** JS **no té model de referència exacte**. Score per **quantitat + varietat**: nombre de regles (fins a 6) + nombre d'events/elements/accions ÚNICS (evita inflar repetint la mateixa combinació).
- **D-04:** Pesos globals: **HTML 30% / CSS 60% / JS 10%**.
- **D-05:** El temps passa a ser una **petita bonificació dins del score** (màx aprox ±5 punts) — mai domina sobre una diferència gran de precisió.
- **D-06:** La bonificació **només s'aplica a la Fase HTML**, via `team.doneAt.html`. CSS i JS puntuen NOMÉS per proximitat/varietat.
- **D-07:** Fase HTML: botó "Finalitzar" es manté amb **gate de correcció 100%** (retrofit GAME-08, reutilitza el motor de comparació nou). Únic origen de bonificació de temps.
- **D-08:** Fase CSS: el botó "Finalitzar" existent (commit `7fd2169`) s'ha d'**ELIMINAR**.
- **D-09:** Fase JS: **sense botó de finalitzar**.
- **D-10:** Pantalla de resultats mostra a TOTS el **ranking + percentatge global** de cada equip. El **detall de sub-checks** NOMÉS el veu cada equip a la seva pròpia pantalla — mai el d'un altre equip.
- **D-11:** Cada equip veu NOMÉS el seu percentatge **global** final — sense desglossament per fase visible.
- **D-12:** En tancar-se cada fase (HTML→CSS, CSS→JS), l'Admin veu un **mini-ranking al seu propi panell** (NOMÉS l'Admin).
- **D-13:** El ranking parcial usa el **mateix motor de puntuació**, amb les fases no jugades comptant com a **0** en el seu pes. Mateix pipeline aplicat a l'estat parcial.
- **D-14:** El botó de transició de fase després de tancar JS dispara ADMIN-07: **cerimònia d'entrega de premis** (compte enrere 5→0, zoom+fade per número, color chillón diferent per número, hold 3s a 0, revelació invers últim→primer, confetti final) abans de revelar resultats. Timing exacte a UI-SPEC.

### Claude's Discretion
- Fórmula exacta de la bonificació de temps HTML (D-05): llindar ±5 i escalat (lineal vs esglaonat).
- Fórmula de distància de color (D-02): Euclidiana simple vs perceptual — **prioritzant simplicitat**.
- Format visual del mini-ranking d'Admin (D-12): resolt a UI-SPEC → llista amb barra fina.
- Cadència/disposició de la revelació post-cerimònia (D-14): resolt a UI-SPEC → stagger 600ms + pausa 1200ms abans del #1.
- Implementació tècnica del confetti i colors chillón: dependency-free.

### Deferred Ideas (OUT OF SCOPE)
- Preview CSS live code overlay — futura fase UI/polish.
- Botó tornar a fase anterior des d'Admin — futura fase Admin.
- Reset de servidors des del panell Admin — futura fase Admin/Ops.
- (v2, project-level) Exercicis parametritzables JSON, export de resultats, equips >6.
- Base de dades / persistència — l'estat viu en memòria.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCORE-01 | HTML es puntua comparant l'estructura del DOM parsejat amb la Plana Model (mai diff de text) | §Q1 — `team.placement` JA és la comparació estructural: cada placement està pre-validat correcte (`placePiece` rebutja tipus incorrectes), score = `placats/7`. Cap re-parsing de DOM. |
| SCORE-02 | CSS es puntua comparant valors normalitzats (formats equivalents puntuen igual) | §Q2 — valors ja capturats normalitzats a l'origen (`#rrggbb`, `<n>px/%`). Cal extreure `CSS_TARGETS` (avui només en comentari). Euclidiana RGB normalitzada + distància numèrica per rang. **getComputedStyle NO cal** (resol el research flag de STATE.md). |
| SCORE-03 | JS es puntua verificant la tripleta event+element+acció | §Q3 — SUPERSEDED per D-03: JS no té referència exacta; score per quantitat+varietat sobre `team.jsRules` (ja validat vocabulari + anti-repetició). |
| SCORE-04 | Percentatge global + rànquing ordenat; temps desempata | SUPERSEDED per D-04/D-05: pesos 30/60/10, temps = bonificació ±5 només a HTML (§Q4), no mer desempat. |
| SCORE-05 | Pantalla de resultats mostra detall de sub-checks per equip (debrief) | §Architecture — el motor emet sub-checks per fase; privacy per-team (D-10) via emissió dirigida `team:<id>`. |
| ADMIN-07 | Admin finalitza i mostra resultats a totes les pantalles | §Architecture — nou event `ADMIN_FINALIZE_GAME` + estat terminal `finished`; dispara la cerimònia D-14 en lockstep via un únic broadcast. |

*Nota: la redacció literal de SCORE-01..04 a REQUIREMENTS.md queda superseded per D-01..D-09 (confirmat a CONTEXT.md §canonical_refs). Aquest document i CONTEXT.md manen en cas de conflicte.*
</phase_requirements>

## Summary

Aquesta fase NO introdueix cap dependència externa ni cap tecnologia nova. És una fase de **lògica pura sobre estat ja existent i autoritatiu**: un motor de puntuació determinista que llegeix `team.placement`, `team.cssValues`, `team.jsRules` i `team.doneAt` (tots ja capturats i validats a `gameState.js`) i en deriva un percentatge global + rànquing, més una **cerimònia d'animació client-side** (compte enrere + confetti) sense llibreries.

El descobriment estructural més important: **l'estat ja capturat fa gran part de la feina de scoring trivial**. HTML no necessita re-parsejar cap DOM — `placePiece()` ja rebutja qualsevol peça a un slot que no l'accepta (`slot.accepts !== pieceType`), així que `team.placement` només conté col·locacions correctes per construcció; el score HTML és literalment `Object.keys(placement).length / SLOTS.length`. CSS compara valors ja normalitzats a l'origen (color-picker→hex, slider→`<n>px/%`), de manera que **`getComputedStyle` no cal en absolut** — això resol directament el "research flag" que STATE.md arrossegava des de la Fase 3 sobre normalització de computed styles.

L'única bretxa de dades real: els **valors OBJECTIU dels forats CSS viuen només en un comentari** de `robotTemplate.js` (línies 237-240) i com a literals dispersos dins `wrapPreview()` del client. El motor de scoring necessita un mapa `CSS_TARGETS` machine-readable. Aquesta és la peça d'infraestructura que el planner ha d'afegir abans de qualsevol càlcul CSS.

**Primary recommendation:** Crear un mòdul pur nou `src/shared/scoring.js` (funcions `scoreHtml/scoreCss/scoreJs/computeGlobal/buildRanking`) que llegeixi de `robotTemplate.js` (incloent un nou `CSS_TARGETS` frozen) i de l'estat d'equip; connectar-lo a `gameState.js` (rànquing final + parcial) i a `socketHandlers.js` (nou event `ADMIN_FINALIZE_GAME` + emissió per-team filtrada per privacitat D-10); mantenir tota l'animació de cerimònia al client, disparada per un únic broadcast del servidor.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Càlcul de puntuació (HTML/CSS/JS/global) | API / Backend (servidor Node, mòdul pur `scoring.js`) | — | Autoritatiu (CORE-01): els clients mai computen estat canònic. Determinista i testejable en aïllament. |
| Rànquing final + parcial | API / Backend (`gameState.js`) | — | Ordenació sobre estat autoritatiu; el parcial es calcula al mateix punt de transició de fase. |
| Filtratge de privacitat sub-checks (D-10) | API / Backend (emissió dirigida `team:<id>`) | — | Contracte de forma de dades: el client d'un equip mai ha de **rebre** el detall d'un altre. Enforçat a la capa d'emissió, no al render. |
| Trigger de finalització (ADMIN-07) | API / Backend (nou handler admin) | — | Re-valida pertinença a room 'admin' (V4); un únic broadcast garanteix lockstep. |
| Cerimònia (compte enrere, revelació, confetti) | Browser / Client (`client.js` + `admin.js`) | — | Animació decorativa amb timeline fix (UI-SPEC). El servidor només dispara; cada pantalla executa la mateixa seqüència scriptada. |
| Render pantalla de resultats + mini-ranking | Browser / Client | — | Nova branca a `renderScreenForState`; element nou a `admin.js`. Pur render sobre payload autoritatiu. |
| Gate 100% del botó "Finalitzar" HTML (D-07) | API / Backend (guard a mark-done) + Browser (enable/disable) | Browser | El servidor és l'autoritat del gate (reutilitza `scoreHtml===100`); el client només reflecteix l'habilitació (pips N/7 ja existents). |

## Standard Stack

### Core
Aquesta fase **no afegeix cap paquet**. Tota la implementació usa el runtime i les dependències ja instal·lades.

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| socket.io / socket.io-client | 4.8.3 | Nous events de finalització + broadcast de cerimònia/resultats | Ja és la columna vertebral de temps real; reutilitza rooms `team:<id>`/`admin`/`session` existents [VERIFIED: package.json]. |
| Node.js (built-in) | runtime del projecte | Mòdul de scoring pur (aritmètica, `Math.sqrt`) | Cap dependència: color distance i normalització són aritmètica bàsica [VERIFIED: codebase]. |
| Vanilla JS + CSS keyframes | — | Cerimònia + confetti dependency-free | UI-SPEC ho mandata explícitament; consistent amb l'ètos "no heavy dependency" del projecte [CITED: 04-UI-SPEC.md §Motion Contract]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide | 1.23.0 | Icones `Trophy` (#1), `Check`/`Circle` (sub-checks) | Ja instal·lat i usat a Fases 1-3; import per-icona [VERIFIED: package.json]. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Confetti CSS/canvas fet a mà | `canvas-confetti` (npm) | Afegeix dependència per a un efecte de ~4s d'un sol ús — contradiu D-14 discretion ("sense dependència pesada") i l'ètos del projecte. **Rebutjat.** |
| Euclidiana RGB (D-02) | CIE76 / CIEDE2000 (Lab perceptual) | Més precisió perceptual, però CONTEXT.md steereja explícitament cap a **simplicitat**; per a un joc de classe amb color-pickers, l'Euclidiana és més que suficient. **Rebutjat per sobre-enginyeria.** |
| GSAP (disponible com a skill) | animació de cerimònia amb GSAP timeline | Llibreria potent però és una dependència pesada per a una timeline fixa de 12s que es fa amb `@keyframes` + `setTimeout`. **Rebutjat.** |

**Installation:** cap. `npm install` no canvia.

## Package Legitimacy Audit

> **N/A — aquesta fase no instal·la cap paquet extern.** El confetti és dependency-free (D-14). No hi ha cap `npm install` nou, per tant no hi ha superfície de slopsquatting a auditar.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
                         │  robotTemplate.js  (SINGLE SOURCE OF TRUTH)   │
                         │  SLOTS · PIECES · CSS_HOLES · CSS_TARGETS(new)│
                         │  JS_EVENTS · JS_ELEMENTS · action/composite   │
                         └───────────────┬───────────────────────────────┘
                                         │ reads targets/vocab
                                         ▼
   team.placement ─┐          ┌──────────────────────────┐
   team.cssValues ─┼──reads──►│  scoring.js (NEW, PURE)   │
   team.jsRules  ──┤          │  scoreHtml(placement)     │──► { pct, subchecks[] }
   team.doneAt    ─┘          │  scoreCss(cssValues)      │──► { pct, subchecks[] }
                              │  scoreJs(jsRules)         │──► { pct, subchecks[] }
                              │  computeGlobal(h,c,j,bonus)│──► globalPct
                              └────────────┬──────────────┘
                                           │ called by
                                           ▼
                    ┌──────────────────────────────────────────┐
                    │  gameState.js                             │
                    │  buildRanking(phaseMask) ─ unplayed = 0   │  (D-13)
                    │  htmlTimeBonus(teams)     ─ rank finishers │  (D-05/06)
                    │  finalizeGame()           ─ state.finished │  (ADMIN-07)
                    └───────────┬──────────────────┬─────────────┘
             partial (admin)    │                  │  final (all)
                                ▼                  ▼
                    ┌───────────────────┐   ┌────────────────────────────┐
                    │ phase-transition  │   │ ADMIN_FINALIZE_GAME handler │
                    │ (nextPhase point) │   │  ── per-team filtered emit ─│  (D-10 privacy)
                    │  emit → 'admin'   │   │  team:<id> ► {ranking,      │
                    │  only (D-12)      │   │              ownDetail}     │
                    └───────────────────┘   │  admin ► {ranking}          │
                                            └────────────┬───────────────┘
                                                         │ one broadcast → lockstep
                                                         ▼
                              ┌───────────────────────────────────────────┐
                              │ client.js / admin.js                       │
                              │  ceremony timeline (5→0, hold, reveal,      │
                              │  confetti) ── then ── results/mini-ranking  │
                              └───────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/shared/
├── robotTemplate.js   # ADD: export const CSS_TARGETS (holeId -> target value)
└── scoring.js         # NEW: pure scoring functions (no I/O, no socket, testable)

src/server/
├── gameState.js       # ADD: buildRanking(), htmlTimeBonus(), finalizeGame(); modify markPhaseDone gate
├── socketHandlers.js  # ADD: ADMIN_FINALIZE_GAME handler; partial-ranking on phase transition; D-07 gate; D-08/09 removal
└── events.js          # ADD: ADMIN_FINALIZE_GAME, GAME_RESULTS/CEREMONY_START, ADMIN_PARTIAL_RANKING

src/client/
├── client.js          # ADD: results render branch + ceremony overlay; MODIFY finish-button (D-07/08/09)
├── admin.js           # ADD: mini-ranking element + ceremony overlay + finalize CTA
└── client.css         # ADD: .ceremony-overlay, .results-screen, .rank-row, .rank-bar, confetti keyframes

test/
└── scoring.test.js    # NEW: pure unit tests of scoring.js (fast, no server)
└── results.test.js    # NEW: integration — finalize round-trip + D-10 privacy + partial ranking
```

### Pattern 1: Pure scoring module reading from the single source of truth
**What:** All scoring is pure functions in `src/shared/scoring.js`, importing targets/vocab from `robotTemplate.js` and taking team state as arguments. No socket, no `gameState` coupling → unit-testable in isolation and reusable by both the final and partial rankings.
**When to use:** Every score computation (HTML, CSS, JS, global, partial).

### Pattern 2: Mutation-returns-bool + directed emission (existing project convention)
**What:** New handlers follow the established `safeHandler` wrapper; identity always from `socket.data.teamId` (never payload, V4); admin handlers re-check `socket.rooms.has('admin')` (V4). Results are emitted **directed per team** (`io.to('team:<id>')`) so each team receives only its own sub-check detail (D-10 is a data-shape contract, not just a render rule).
**When to use:** The finalize handler and the partial-ranking emission.
**Example:**
```javascript
// Source: pattern mirrored from socketHandlers.js TEAM_MARK_DONE + ADMIN_FORCE_RESYNC (VERIFIED codebase)
socket.on(EVENTS.ADMIN_FINALIZE_GAME, safeHandler(() => {
  if (!socket.rooms.has('admin')) return;            // V4 access control
  if (!gameState.finalizeGame()) return;             // mutation-returns-bool (idempotent)
  const ranking = gameState.buildRanking();          // full ranking: names + global %
  // D-10 privacy: per-team payload — ownDetail ONLY for that team
  for (const row of ranking) {
    io.to(`team:${row.id}`).emit(EVENTS.CEREMONY_START, {
      ranking: ranking.map(({ id, name, globalPct }) => ({ id, name, globalPct })),
      ownDetail: gameState.getTeamSubchecks(row.id), // sub-checks for THIS team only
    });
  }
  io.to('admin').emit(EVENTS.CEREMONY_START, {
    ranking: ranking.map(({ id, name, globalPct }) => ({ id, name, globalPct })),
  });
}));
```

### Anti-Patterns to Avoid
- **Re-parsing the preview DOM to score HTML.** The authoritative `placement` map already encodes the structure and is pre-validated correct. Parsing srcdoc/iframe would re-derive what you already have and re-introduce the very text-diff fragility SCORE-01 forbids.
- **Using `getComputedStyle` for CSS scoring.** Values are already captured normalized at the control (hex, `<n>px/%`). `getComputedStyle` would add a browser dependency to server-authoritative scoring and reintroduce shorthand/longhand/rgb-vs-hex normalization pain that the capture design already avoided.
- **Broadcasting everyone's sub-check detail to `io.to('session')`.** Violates D-10 privacy. The final results must be per-team filtered.
- **Duplicating CSS target values.** Do not hand-copy the targets from the comment into `scoring.js`. Extract one frozen `CSS_TARGETS` and have both scoring and (ideally) `wrapPreview` reference it — mirrors the existing "derived, single source" discipline (D-01).
- **Driving the ceremony from per-client timers.** UI-SPEC mandates one server broadcast → all screens run the same scripted timeline in lockstep. Do not let each client start its own countdown independently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML structural comparison | A DOM parser / tree-diff of the preview | `Object.keys(team.placement).length / SLOTS.length` | Placement is pre-validated correct by `placePiece`; the ratio IS the structural score. |
| CSS value normalization | A `getComputedStyle` normalizer (shorthand/longhand, rgb↔hex) | Direct compare of already-normalized stored control values against `CSS_TARGETS` | Values are captured normalized at source; no parsing needed. |
| Confetti | An npm confetti library | ~40 lines of CSS `@keyframes` particles OR a tiny one-shot `<canvas>` rAF | 4s single-use effect; a dependency is disproportionate (D-14). |
| Ceremony sequencing | An animation library (GSAP) | CSS `@keyframes` + a small `setTimeout` chain driven by the UI-SPEC ms table | Fixed 12s timeline, no interactivity, no scrubbing. |
| Reconnection during results | A new resync protocol | Existing token reconnection + include `finished`/final ranking in `getPublicState()` snapshot | CORE-03 already solved reconnection; results must be replayable on F5. |

**Key insight:** The heavy lifting was done in Phases 2-3 — every input the scoring engine needs is already captured, validated, and reconnection-safe. Phase 4 is mostly arithmetic over that state, plus one presentation layer.

## Common Pitfalls

### Pitfall 1: CSS target values only exist in a comment
**What goes wrong:** The scoring engine has no machine-readable target to compare against; a developer hand-copies the 15 target values from the comment (lines 237-240 of `robotTemplate.js`) and they silently drift from `wrapPreview`'s real rendering.
**Why it happens:** The correct values live as (a) a documentation comment and (b) scattered literals in `wrapPreview()`; the `var(--x, fallback)` fallbacks in `wrapPreview` are the deliberately-WRONG defaults, not the targets.
**How to avoid:** Add `export const CSS_TARGETS = Object.freeze({...})` to `robotTemplate.js` as the single source; update the comment to point at it. Cross-check target count === `Object.keys(CSS_HOLES).length` (15 holes note: `CSS_HOLES` has 15 keys, header comment says "16" — verify the exact count in a test).
**Warning signs:** A team that perfectly matches the Bender scores <100% on CSS → target map is wrong.

### Pitfall 2: Untouched CSS holes have no stored value
**What goes wrong:** `team.cssValues` only contains holes the team actually changed; scoring `undefined` yields `NaN` and poisons the mean.
**Why it happens:** `setCssValue` only writes on change; a team that never touched a control has no entry.
**How to avoid:** For each hole in `CSS_HOLES`, score `team.cssValues[holeId] ?? hole.default`. The default is deliberately far from target → low score, which is correct (they didn't fix it). Iterate over `CSS_HOLES` keys, never over `team.cssValues` keys.
**Warning signs:** `NaN%` on any results screen; mean varies with how many controls were touched rather than how correct they are.

### Pitfall 3: Time bonus has no reliable phase-start timestamp
**What goes wrong:** Computing "seconds into the phase" needs the phase start, but `gameState` only stores `phaseEndsAt`, which is mutated by pause/resume/extend — an absolute-elapsed bonus becomes non-deterministic.
**Why it happens:** The timer model is end-timestamp based (01-RESEARCH Pattern 3); there is no stored `phaseStartedAt`.
**How to avoid:** Make the HTML time bonus **rank-based among finishers**, using only the relative order of `team.doneAt.html` timestamps (earlier = more bonus). This is robust to pause/extend and needs no phase-start. Non-finishers (no `doneAt.html`) get 0 bonus. See §Q4.
**Warning signs:** Bonus changes when the admin pauses the timer; teams that never hit 100% receive a bonus.

### Pitfall 4: The finalize/ceremony trigger must survive F5 (CORE-03)
**What goes wrong:** A team PC that refreshes during or after the ceremony loses the results and is stuck.
**Why it happens:** The ceremony is triggered by a one-time broadcast; a reconnecting socket wasn't in the room when it fired.
**How to avoid:** On `finalizeGame()`, store the frozen final ranking snapshot in state and expose `finished: true` in `getPublicState()`. On reconnection, if `finished`, emit the results directly (skip the ceremony replay — show final state). Mirrors how board/css/js state is re-emitted on reconnect today.
**Warning signs:** Refreshing a team screen after results shows a blank/waiting screen.

### Pitfall 5: D-08 removal leaves a live CSS mark-done path
**What goes wrong:** Removing the CSS finish button from the client but leaving `TEAM_MARK_DONE` accepting `phase === 'css'` means a crafted payload (or leftover client code) can still record a CSS `doneAt`.
**Why it happens:** `markPhaseDone` derives phase from `state.phase` generically; it currently accepts any active phase.
**How to avoid:** Tighten `markPhaseDone` (or the handler) to accept **only `phase === 'html'`** going forward (D-07 is the only surviving finish affordance). Remove/repurpose the CSS button render (D-08) and never render it for JS (D-09).
**Warning signs:** `team.doneAt.css` or `team.doneAt.js` ever becomes non-empty.

## Code Examples

Concrete, verified-against-state reference implementations. Formula tuning (weights within variety, bonus curve) is design discretion — flagged `[ASSUMED]`.

### HTML score (D-01, SCORE-01) — placement is pre-validated correct
```javascript
// Source: derived from gameState.placePiece() guard `slot.accepts !== pieceType` (VERIFIED codebase)
// Every stored placement is correct by construction, so score = fill ratio.
import { SLOTS } from './robotTemplate.js';

export function scoreHtml(placement) {
  const total = SLOTS.length;                    // 7
  const subchecks = SLOTS.map((s) => ({
    slot: s.id,
    passed: placement[s.id] === s.accepts,       // always true if present
  }));
  const placed = subchecks.filter((c) => c.passed).length;
  return { pct: (placed / total) * 100, subchecks };
}

// D-07 gate: 100% correctness == all slots filled
export const isHtmlComplete = (placement) => Object.keys(placement).length === SLOTS.length;
```

### CSS score (D-02, SCORE-02) — normalized distance per hole, Euclidean RGB [ASSUMED: formula is discretion]
```javascript
// Source: RGB Euclidean distance is standard; max distance = sqrt(3)*255 ≈ 441.673 (ASSUMED, standard math)
import { CSS_HOLES, CSS_TARGETS } from './robotTemplate.js';

const RGB_MAX = Math.sqrt(3) * 255; // 441.6729...

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function holeScore(holeId, value) {
  const hole = CSS_HOLES[holeId];
  const target = CSS_TARGETS[holeId];
  if (hole.control === 'color') {
    const [r1, g1, b1] = hexToRgb(value);
    const [r2, g2, b2] = hexToRgb(target);
    const d = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    return (1 - d / RGB_MAX) * 100;
  }
  // range: normalize by the hole's own min..max span
  const teamN = parseInt(value, 10);
  const targetN = parseInt(target, 10);
  const span = hole.max - hole.min;
  const d = Math.abs(teamN - targetN);
  return Math.max(0, 1 - d / span) * 100;
}

export function scoreCss(cssValues) {
  const ids = Object.keys(CSS_HOLES);
  const subchecks = ids.map((id) => {
    const value = cssValues[id] ?? CSS_HOLES[id].default; // Pitfall 2: untouched -> default
    const s = holeScore(id, value);
    return { hole: id, score: s, passed: s >= 90 }; // "passed" threshold for the debrief icon (ASSUMED tuning)
  });
  const mean = subchecks.reduce((a, c) => a + c.score, 0) / ids.length;
  return { pct: mean, subchecks };
}
```

### JS score (D-03, SCORE-03) — quantity + variety [ASSUMED: weighting is discretion]
```javascript
// Source: D-03 (quantity + unique variety). Vocabulary sizes from robotTemplate.js (VERIFIED):
//   JS_EVENTS: 4 · JS_ELEMENTS: 8 · actions: 4 simple + 3 composite = 7
import { JS_EVENTS, JS_ELEMENTS } from './robotTemplate.js';
import { JS_ROW_LIMIT } from './robotTemplate.js'; // 6

export function scoreJs(jsRules) {
  const N = jsRules.length;                              // 0..6, already anti-repeat validated
  const uniq = (arr) => new Set(arr).size;
  const events  = uniq(jsRules.map((r) => r.event));                    // /4
  const actions = uniq(jsRules.map((r) => r.accio));                    // /7
  const targets = uniq(jsRules.flatMap((r) => [r.origen, r.desti].filter(Boolean))); // /8

  // Half weight quantity, half weight variety (ASSUMED split — tunable in planning)
  const quantity = (N / JS_ROW_LIMIT) * 50;
  const variety  = ((events / 4) + (actions / 7) + (targets / 8)) / 3 * 50;
  return { pct: Math.min(100, quantity + variety), subchecks: [
    { label: 'regles', value: N },
    { label: 'events únics', value: events },
    { label: 'accions úniques', value: actions },
    { label: 'elements únics', value: targets },
  ]};
}
```

### Global score + weights + HTML time bonus (D-04, D-05, D-06) [ASSUMED: bonus curve is discretion]
```javascript
// Source: D-04 weights 30/60/10 (VERIFIED CONTEXT.md); rank-based bonus avoids the no-phase-start pitfall
export const WEIGHTS = Object.freeze({ html: 0.30, css: 0.60, js: 0.10 });

// mask: which phases have been played (for partial ranking D-13, unplayed count as 0)
export function computeGlobal({ html, css, js }, mask = { html: 1, css: 1, js: 1 }, bonus = 0) {
  const base =
    html * WEIGHTS.html * mask.html +
    css  * WEIGHTS.css  * mask.css  +
    js   * WEIGHTS.js   * mask.js;
  return Math.min(100, base + bonus); // bonus is small (<=5), clamp so it never exceeds 100
}

// HTML time bonus (D-05/D-06): rank finishers by doneAt.html ascending. Fastest +5 -> slowest +0.
// Non-finishers (no doneAt.html) get 0. Small enough it never dominates precision (D-05).
export function htmlTimeBonuses(teams) {
  const finishers = teams
    .filter((t) => t.doneAt?.html != null)
    .sort((a, b) => a.doneAt.html - b.doneAt.html);
  const F = finishers.length;
  const bonus = new Map();
  finishers.forEach((t, i) => {
    bonus.set(t.id, F <= 1 ? 5 : Math.round(5 * (F - 1 - i) / (F - 1)));
  });
  return bonus; // teamId -> 0..5 ; absent teams -> undefined (treat as 0)
}
```

### Confetti (D-14) — dependency-free CSS keyframe shower
```javascript
// Source: 04-UI-SPEC.md §Motion Contract confetti note (CITED). Auto-cleans when .ceremony-overlay unmounts.
const CHILLON = ['#FF1E56', '#FF9F1C', '#FFD60A', '#2EC4B6', '#3A86FF', '#C77DFF'];
function fireConfetti(container, count = 60) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // skip motion
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'ceremony-confetti__piece';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = CHILLON[i % CHILLON.length];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    container.appendChild(p);
  }
  // pieces removed when the overlay is torn down at reveal-complete (containment invariant)
}
```
```css
/* @keyframes fall: translateY(-10vh -> 110vh) + rotate; ~4s; in @media (prefers-reduced-motion: no-preference) */
```

## Runtime State Inventory

> This is largely a greenfield-additive phase, but D-08 removes an existing affordance and D-07 tightens one. Inventory of what the change touches beyond source files:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | In-memory only: `team.placement`, `team.cssValues`, `team.jsRules`, `team.doneAt` (per-process Maps). No datastore. `team.doneAt.css` may exist from the pre-D-08 CSS finish button (commit `7fd2169`) in a running session — irrelevant across the 15-20 min session lifetime (memory reset on restart). | Code edit only. Tighten `markPhaseDone` to `html`-only so no new `doneAt.css`/`doneAt.js` is written. No data migration (state is ephemeral). |
| Live service config | None — no external service holds phase state. | None. |
| OS-registered state | None (PM2 process name unaffected; that's Phase 5). | None. |
| Secrets/env vars | `ADMIN_SECRET` gates the finalize handler (admin room) — no new secret. | None. |
| Build artifacts | None — no package/version rename; no `npm install`. | None. |

**Nothing found requiring data migration** — all game state is in-memory and reset per process (verified: `gameState.js` uses in-process `Map`s, no persistence, out-of-scope per REQUIREMENTS.md).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SCORE-01/02/03 "compare parsed DOM / getComputedStyle / semantic triplet" (exact reference match) | Proximity-partial (HTML fill ratio), normalized distance mean (CSS), quantity+variety (JS) | CONTEXT.md D-01..D-03 (2026-07-05) | Simpler, uses already-captured state; JS explicitly has no exact reference. |
| SCORE-04 "time is tie-breaker only" | Time is a small ±5 bonus, HTML-only, rank-based | CONTEXT.md D-05/D-06 | No secondary sort needed; bonus folds into the global %. |
| GAME-08 "botó Llest freezes team + registers time" (Phase 1 stub, timestamp only) | HTML finish gated to 100% correctness; sole bonus source | CONTEXT.md D-07 | Reuses the new comparison engine for the gate. |
| CSS/JS finish buttons | Removed (D-08) / never added (D-09) | CONTEXT.md D-08/D-09 | Continuous scoring makes "done" meaningless outside HTML. |

**Deprecated/outdated:**
- The STATE.md "Research flag" about `getComputedStyle` normalization for Fase 4 scoring is **resolved/obsolete**: the capture design stores pre-normalized control values, so no computed-style normalization is needed at all.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Euclidean RGB distance (norm by 441.673) is sufficient for CSS color scoring | §Q2 / CSS example | Low — CONTEXT.md explicitly steers to simplicity; worst case colors score slightly less perceptually-fair. Tunable. |
| A2 | JS score = 50% quantity (N/6) + 50% variety (events/4 + actions/7 + targets/8)/3 | §Q3 / JS example | Medium — D-03 leaves the exact formula open; this is a defensible default but the planner/owner may want a different quantity:variety split. Flag for confirmation. |
| A3 | HTML time bonus = rank-based among finishers, fastest +5 → slowest +0, added post-weight, clamped to 100 | §Q4 / global example | Medium — D-05 leaves curve to planning; rank-based chosen because no reliable phase-start timestamp exists (Pitfall 3). Owner may prefer absolute thresholds (would require storing phaseStartedAt). |
| A4 | A CSS sub-check "passes" (green icon) at score ≥ 90 | CSS example | Low — purely the debrief icon threshold (SCORE-05 pedagogical), no effect on the numeric %. Tunable. |
| A5 | `CSS_HOLES` has 15 holes (header comment says "16") | Pitfall 1 | Low — count must be verified in a test; affects only the CSS mean denominator, not correctness of the approach. |
| A6 | Terminal state modeled as `state.finished = true` (not adding `'results'` to `PHASE_ORDER`) | §Pitfall 4 / architecture | Low — avoids breaking `nextPhase`/`startPhase` guards; alternative is a new phase value. Design choice. |
| A7 | On F5 after finalize, show final results directly (skip ceremony replay) | Pitfall 4 | Low — reasonable UX; owner could want ceremony replay but that's costlier and less desirable. |

**These `[ASSUMED]` items (esp. A2, A3) should be confirmed by the owner during planning** — they are the D-03/D-05 "Claude's Discretion" formula choices, defensible defaults but not locked facts.

## Open Questions

1. **Exact CSS hole count (15 vs 16).**
   - What we know: `CSS_HOLES` object literal contains 15 keys; the header comment says "16 forats".
   - What's unclear: whether one hole was consolidated (e.g. `nas-size` maps `width/height`, `orella-offset` maps `left/right` — several vars drive two properties).
   - Recommendation: add a test asserting `Object.keys(CSS_HOLES).length === Object.keys(CSS_TARGETS).length` and use that count as the mean denominator; don't hard-code 15 or 16.

2. **Does pressing HTML "Finalitzar" freeze the team (original GAME-08) or only record the timestamp?**
   - What we know: current `markPhaseDone` only stores a timestamp; original GAME-08 wording said "congela NOMÉS aquell equip". At 100% all 7 slots are filled, so there's nothing left to place.
   - What's unclear: whether the team should be locked out of removing pieces after finishing (to protect the recorded time).
   - Recommendation: freeze-that-team is low-value at HTML 100% (board is complete); simplest is timestamp-only + client disables the board on done. Confirm with owner if strict freeze is wanted.

3. **Quantity:variety split and whether composites should count toward "targets" variety (A2).**
   - What we know: composites have `desti = null` and touch multiple predefined elements; a composite rewards variety differently than a simple rule.
   - Recommendation: confirm the 50/50 split; treat composite selection as its own "action variety" contribution (already counted via unique `accio`), do not try to expand composite internal selectors into target variety.

## Environment Availability

> SKIPPED — no new external dependencies. Runtime (Node) and all libraries (socket.io 4.8.3, lucide, vite) are already installed and exercised by Phases 1-3 [VERIFIED: package.json]. Confetti and ceremony are dependency-free.

## Security Domain

> `security_enforcement: true`, ASVS Level 1. This phase adds one admin-triggered event and per-team result payloads.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Finalize is admin-only: reuse `ADMIN_SECRET` handshake + `socket.rooms.has('admin')` re-check in the handler (existing pattern). |
| V3 Session Management | no | No new sessions; reuses team token / admin secret. |
| V4 Access Control | **yes (primary)** | Finalize handler MUST re-validate admin room membership (V4/Pitfall 4 pattern). Identity for any team-scoped read is `socket.data.teamId`, never payload. |
| V5 Input Validation | yes (low surface) | The finalize event carries no client-supplied scoring input — all inputs are server-held state. Sub-check payloads are server-generated. |
| V6 Cryptography | no | No crypto in scope. |

### Known Threat Patterns for {Socket.io + in-memory state}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-admin client emits `admin:finalize-game` to end the session early | Elevation of Privilege | Re-check `socket.rooms.has('admin')` server-side in the handler (never trust a client role flag). |
| Team A receives Team B's sub-check detail (info leak, breaks D-10) | Information Disclosure | Per-team directed emission: full ranking (names + global %) to all, `ownDetail` only via `io.to('team:<id>')`. Enforce at emission, verify with an integration test. |
| Crafted `team:mark-done` records a fake fast HTML time / marks CSS/JS done | Tampering | Gate `markPhaseDone` to `phase==='html'` AND `isHtmlComplete(placement)` (D-07); phase derived from `state.phase`, never payload. |
| Broadcast storm via finalize spam | Denial of Service | `finalizeGame()` is mutation-returns-bool (idempotent) — a second finalize is a no-op, no re-broadcast. |
| Malformed payload crashes shared process | Denial of Service | New handlers wrapped in existing `safeHandler`. |

## Sources

### Primary (HIGH confidence)
- `src/server/gameState.js` — `team.placement/cssValues/jsRules/doneAt`, `placePiece` type-guard, `markPhaseDone`, `getPublicState`, `PHASE_ORDER`, timer model [VERIFIED: codebase read]
- `src/server/socketHandlers.js` — `safeHandler`, `TEAM_MARK_DONE`, V4 identity/admin patterns, directed emission [VERIFIED: codebase read]
- `src/shared/robotTemplate.js` — `SLOTS`(7), `PIECES`(sum 7), `CSS_HOLES`, CSS target comment (l.237-240), JS vocab sizes [VERIFIED: codebase read]
- `src/shared/effects.js` — `ACTIONS`(4)/`COMPOSITES`(3) vocabulary for variety [VERIFIED: codebase read]
- `src/client/client.js` — `wrapPreview` target literals, `renderScreenForState`, `assemblePreview` [VERIFIED: codebase read]
- `.planning/phases/04-.../04-CONTEXT.md` — D-01..D-14 locked decisions [VERIFIED]
- `.planning/phases/04-.../04-UI-SPEC.md` — ceremony ms timing, chillón palette, results contract, confetti dependency-free note [VERIFIED]

### Secondary (MEDIUM confidence)
- `test/placement.test.js`, `test/cssPhase.test.js` — integration harness pattern (`startServer(0)`, `once/onceOrTimeout`) to mirror for `results.test.js` [VERIFIED: codebase read]

### Tertiary (LOW confidence)
- Euclidean RGB distance normalization (max = √3·255 ≈ 441.673) — standard math, training knowledge [ASSUMED]
- JS quantity/variety weighting and HTML time-bonus curve — design defaults for open D-03/D-05 discretion items [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all deps verified in package.json.
- Architecture: HIGH — derives directly from verified existing patterns and state.
- Scoring algorithms (structure): HIGH — HTML/CSS/JS inputs verified in codebase; the reduction (placement pre-validated, values pre-normalized) is a verified property.
- Formula tuning (JS weights, time-bonus curve): MEDIUM — defensible defaults, but D-03/D-05 leave them to planning/owner confirmation (see Assumptions A2/A3).
- Pitfalls: HIGH — each traced to a specific line/behavior in the current code.

**Research date:** 2026-07-05
**Valid until:** stable (internal-logic phase, no fast-moving external deps) — revisit only if CONTEXT.md decisions change.
