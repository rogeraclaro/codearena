---
phase: 04-puntuaci-i-r-nquing-final
plan: 02
subsystem: scoring
tags: [scoring, ranking, finish-button-gate, partial-ranking, privacy-d12, socketio]
status: complete
requires:
  - "src/shared/scoring.js: isHtmlComplete + buildRanking(mask) (Pla 01)"
  - "gameState.markPhaseDone/nextPhase/buildRanking (Fases 1-3 + Pla 01)"
  - "socketHandlers TEAM_MARK_DONE + ADMIN_NEXT_PHASE (Fases 1-3)"
  - "admin.js injectStyles + buildFinalRanking (Pla 01)"
provides:
  - "gameState.markPhaseDone endurit: NOMÉS phase='html' I isHtmlComplete → doneAt html-only (D-07/D-08/D-09)"
  - "gameState.getPartialContext: { mask, closedPhase } derivat de state.phase (D-13)"
  - "EVENTS.ADMIN_PARTIAL_RANKING (admin-only)"
  - "client.js: botó HTML gated a 100% + updateFinishGate; botó CSS eliminat"
  - "admin.js: .admin-mini-rank (llista amb barra fina) + listener ADMIN_PARTIAL_RANKING"
affects:
  - "Pla 03 (cerimònia) hereta el botó HTML gated i el doneAt html-only com a font de la bonificació de temps"
tech-stack:
  added: []
  patterns:
    - "gate de correcció al mutator del servidor (markPhaseDone) — la font de veritat, no el client"
    - "emissió dirigida io.to('admin') per privacitat D-12 a la capa d'emissió (mirall de la privacitat D-10 del Pla 01)"
    - "mateix pipeline buildRanking(mask) per al parcial i el final (D-13) — cap càlcul paral·lel"
    - "re-avaluació quirúrgica del gate del botó (updateFinishGate) sense reconstruir el panell"
key-files:
  created: []
  modified:
    - src/server/events.js
    - src/server/gameState.js
    - src/server/socketHandlers.js
    - src/client/client.js
    - src/client/admin.js
    - test/results.test.js
decisions:
  - "màscara de fases jugades = fases estrictament ANTERIORS a state.phase (post-nextPhase), closedPhase = la immediatament anterior"
  - "gate D-08/D-09 intrínsec: markPhaseDone rebutja tota fase != 'html', així un payload forjat mai escriu doneAt.css/js"
  - ".admin-mini-rank CSS a admin.js injectStyles (no client.css) — admin.html no carrega client.css (deviació documentada)"
metrics:
  duration_min: 18
  tasks: 2
  files: 6
  tests_added: 4
  completed: 2026-07-05
---

# Phase 04 Plan 02: Retrofit botons "Finalitzar" + rànquing parcial d'Admin Summary

Enduriment del flux DURANT el joc: el botó "Finalitzar" queda com a única afordança de finalització, gated a estructura HTML 100% (D-07), amb el servidor garantint que `doneAt` només pot existir per HTML (D-08/D-09) — la font única i correcta de la bonificació de temps; i el professor obté un mini-rànquing parcial privat a cada tancament de fase, calculat amb el mateix motor que el rànquing final amb les fases pendents comptant 0.

## What Was Built

- **Enduriment servidor (`gameState.markPhaseDone`):** ara rebutja (retorna false) llevat que `phase === 'html'` I `isHtmlComplete(team.placement)`. Conseqüència: cap `doneAt.css`/`doneAt.js` no es pot escriure MAI (D-08/D-09, Pitfall 5) — ni tan sols amb un payload forjat, perquè el handler `TEAM_MARK_DONE` deriva la fase de `state.phase`, mai del payload; i `doneAt.html` només es registra a correcció total (D-07). Idempotència existent preservada.
- **Botó HTML gated (`client.js`):** `renderFinishButton('html')` neix `disabled` fins que `isHtmlComplete(latestPlacement)` és true; el click no envia si està bloquejat. Nou `updateFinishGate()` re-avalua el gate a cada `TEAM_BOARD_STATE` sense reconstruir el panell. Sense text d'error — els pips N/7 (`.progress-pieces`) ja comuniquen la proximitat (ètos sense-error).
- **Botó CSS eliminat (`client.js`, D-08):** la crida `renderFinishButton('css')` al bloc `state.phase === 'css'` s'ha suprimit. JS mai va tenir botó (D-09 — ja absent).
- **Rànquing parcial d'Admin (`events.js` + `gameState.js` + `socketHandlers.js`):** nou `EVENTS.ADMIN_PARTIAL_RANKING`; `gameState.getPartialContext()` deriva `{ mask, closedPhase }` de `state.phase` (fases anteriors a l'actual = 1, actual i futures = 0, D-13); el handler `ADMIN_NEXT_PHASE`, després de transicionar, emet el parcial NOMÉS a `io.to('admin')` via `buildRanking(mask)` — MAI a `'session'` (T-04-06, els equips no ho veuen).
- **Component mini-rànquing (`admin.js`):** `buildMiniRank()` renderitza `.admin-mini-rank` (llista compacta amb barra fina per fila: `[#] [nom] [barra] [% en --color-muted]`), caption "Rànquing parcial — fase {HTML/CSS} tancada", ordre descendent. Listener `ADMIN_PARTIAL_RANKING` desa el darrer parcial i persisteix fins al rànquing final. Cap `--color-accent` (reservat al CTA); `--color-border` track + `--color-muted` fill/%.

## How to Verify

- `node --test test/results.test.js` → 10/10 verds (inclou GATE-D07, HARDEN-D08/D09, PARTIAL-D12/D13, PARTIAL-CSS).
- `npm test` → 84/84 verds (cap regressió; era 80 abans del pla, +4 casos nous).
- `npm run build` → compila admin + client sense errors.
- Privacitat D-12 verificada per test: `teamClient1`/`teamClient2` mai reben `ADMIN_PARTIAL_RANKING` (onceOrTimeout → undefined); NOMÉS `adminSocket`.
- D-13 verificat per test: `pa.ranking` === `gameState.buildRanking({html:1,css:0,js:0})` en tancar HTML, i `{html:1,css:1,js:0}` en tancar CSS — mateix pipeline, no un càlcul paral·lel.
- Enduriment D-08/D-09 verificat: `gameState.markPhaseDone(id, 'css'|'js')` sempre false; `doneAt` de team1 conté NOMÉS `html`.

## Key Decisions

- **Màscara de fases jugades** = fases estrictament anteriors a `state.phase` (l'estat just després de `nextPhase`), amb `closedPhase = PHASE_ORDER[idx-1]`. Així tancar HTML→CSS dona `{html:1,css:0,js:0}` i CSS→JS dona `{html:1,css:1,js:0}`, exactament la semàntica de D-13.
- **Gate D-08/D-09 intrínsec**, no un `if` separat per fase: com que `markPhaseDone` només accepta `'html'`, tota fase css/js queda rebutjada per construcció — un payload forjat que arribés a la funció no pot saltar-lo.
- **`updateFinishGate` quirúrgic** en lloc de re-renderitzar el panell a cada board-state (preserva SortableJS / no destrueix el drag en curs, coherent amb `surgicalUpdate`).

## Deviations from Plan

### Auto-fixed / Adjusted

**1. [Rule 3 - Blocking] `.admin-mini-rank` CSS a `admin.js` injectStyles, no a `client.css`**
- **Found during:** Task 2.
- **Issue:** El pla llista `src/client/client.css` per als selectors `.admin-mini-rank*`. Però `admin.html` NOMÉS carrega `tokens.css` + `admin.js` — mai `client.css`. Posar-hi els estils seria CSS mort (el panell Admin no els carregaria).
- **Fix:** Els estils van a `admin.js` `injectStyles()`, exactament com l'analog `.admin-final-rank` del Pla 01. `client.css` NO s'ha tocat en tot el pla.
- **Files modified:** src/client/admin.js (en lloc de src/client/client.css).
- **Commit:** 2b8e55e.

**2. [Plan-permitted] `client.css` no tocat a Task 1**
- El pla ja preveia treure `client.css` de `files` si l'estat `disabled` no calia ajustar-se. Es reutilitza `.finish-phase-btn:disabled` (`--color-muted`) existent sense canvis.

## TDD Gate Compliance

Tasks 1 i 2 (`tdd="true"`): tests escrits a `test/results.test.js` i confirmats en verd contra la implementació. Com a executor seqüencial amb commits atòmics per tasca, RED i GREEN s'han combinat en un únic commit `feat(...)` per tasca (test + implementació junts), no dos commits separats — mateix patró documentat al Pla 01. La lògica de gate es va validar amb els casos incomplet(false)/complet(true) i css/js(sempre false).

## Known Stubs

Cap. Tot el codi nou està cablejat al payload/estat autoritatiu real. El mini-rànquing deriva del payload `ADMIN_PARTIAL_RANKING`, el gate del botó deriva de `latestPlacement` real via `isHtmlComplete`.

## Threat Surface Scan

Sense superfície nova fora del `<threat_model>` del pla. `ADMIN_PARTIAL_RANKING` s'emet NOMÉS a `io.to('admin')` (T-04-06 mitigat a la capa d'emissió, verificat per test), el handler viu dins `safeHandler` existent (T-04-05), i l'enduriment de `markPhaseDone` mitiga T-04-03 (Tampering: cap `doneAt` fals ni fase forjada). Cap `npm install` nou (T-04-SC accept).

## Self-Check: PASSED
