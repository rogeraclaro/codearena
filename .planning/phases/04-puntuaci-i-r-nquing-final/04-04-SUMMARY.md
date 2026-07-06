---
phase: 04-puntuaci-i-r-nquing-final
plan: 04
subsystem: scoring
tags: [socketio, freeze, gamestate, results, ranking, d15, d16, tdd]

# Dependency graph
requires:
  - phase: 04-01
    provides: "scoring.js (htmlTimeBonuses html-only) + buildRanking + finalizeGame + EVENTS.CEREMONY_START/GAME_RESULTS + renderResultsScreen"
  - phase: 04-02
    provides: "botons 'Finalitzar' per fase (D-07/D-08/D-09) + markPhaseDone + renderFinishButton"
  - phase: 04-03
    provides: "cerimònia D-14 (playCeremony) sobre el mateix broadcast CEREMONY_START — intacta"
provides:
  - "Congelació voluntària per-equip a CSS i JS (D-15): markPhaseDone escriu doneAt.css/js sense gate; setCssValue/setJsRules el respecten server-side (retornen false un cop congelat)"
  - "Scoring intacte: doneAt.css/js mai entren a htmlTimeBonuses (bonus de temps exclusiu de HTML) — scoring.js sense tocar"
  - "Pantalla de resultats sense detall de sub-checks per a ningú (D-16): CEREMONY_START/GAME_RESULTS emeten NOMÉS {ranking}; ownDetail retirat de tots els payloads"
  - "Botó 'Finalitzar' voluntari (sempre clicable) a CSS i JS al client + congelació de panell F5-safe (isPhaseDone)"
affects: [phase-05-desplegament]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Freeze autoritatiu al mutator (setCssValue/setJsRules), no al client: un payload forjat post-Finalitzar no pot descongelar (T-04-15)"
    - "Gate per fase dins un únic renderFinishButton(phase): HTML gated (D-07), CSS/JS voluntaris (D-15)"
    - "Un sol broadcast io.to('session') amb {ranking} públic idèntic → lockstep, cap fuita privada entre equips (D-16)"
    - "Executor seqüencial: test + implementació al mateix commit atòmic per tasca (patró heretat de 04-01/04-02)"

key-files:
  created: []
  modified:
    - src/server/gameState.js
    - src/server/socketHandlers.js
    - src/client/client.js
    - test/results.test.js

key-decisions:
  - "D-15 supersedeix D-08/D-09: CSS/JS recuperen un botó 'Finalitzar' voluntari sense gate de correcció; congela l'equip però mai puntua (doneAt.css/js inerts per al scoring)"
  - "D-16 supersedeix D-10/D-11: cap detall de sub-checks a NINGÚ (ni al propi equip); tothom veu NOMÉS rànquing + percentatge global"
  - "Freeze viu al mutator autoritatiu (server-side), no al client — resistent a payloads forjats després de 'Finalitzar'"
  - "scoring.js NO es toca: htmlTimeBonuses ja filtra doneAt.html, així doneAt.css/js mai inflen cap score"

patterns-established:
  - "Congelació voluntària: doneAt[phase] com a flag de freeze consultat pel mutator abans de mutar"
  - "Dead-code hygiene post-supersessió: getTeamSubchecks (server) + buildOwnDetail/buildSubcheckGroup/buildSubcheckItem/HTML_SLOT_LABELS (client) eliminats en retirar el detall privat"

requirements-completed: [ADMIN-07, SCORE-05]

coverage:
  - id: D1
    description: "markPhaseDone('css'/'js') escriu doneAt sense gate de correcció (voluntari); markPhaseDone('html') conserva el gate isHtmlComplete (D-07)"
    requirement: "ADMIN-07"
    verification:
      - kind: unit
        ref: "test/results.test.js#VOLUNTARY-FREEZE-D15"
        status: pass
    human_judgment: false
  - id: D2
    description: "Un cop congelat (doneAt.css/js), setCssValue/setJsRules retornen false i no muten — freeze server-side resistent a payload forjat (T-04-15)"
    requirement: "ADMIN-07"
    verification:
      - kind: unit
        ref: "test/results.test.js#VOLUNTARY-FREEZE-D15"
        status: pass
    human_judgment: false
  - id: D3
    description: "doneAt.css/js mai entren a htmlTimeBonuses: un equip amb doneAt.css/js però sense doneAt.html no rep bonus de temps (bonus html-only, scoring.js sense tocar)"
    requirement: "SCORE-05"
    verification:
      - kind: unit
        ref: "test/results.test.js#VOLUNTARY-FREEZE-D15"
        status: pass
      - kind: unit
        ref: "test/scoring.test.js (contracte html-only intacte, sense regressió)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cap payload de resultats (CEREMONY_START, GAME_RESULTS de reconnexió; equips + Admin) conté ownDetail — D-16"
    requirement: "SCORE-05"
    verification:
      - kind: unit
        ref: "test/results.test.js#FINALIZE-ROUNDTRIP-D16"
        status: pass
      - kind: unit
        ref: "test/results.test.js#F5-RECOVERY (GAME_RESULTS sense ownDetail)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Botó 'Finalitzar' voluntari (sempre clicable) a CSS i JS al client; en prémer-lo el panell corresponent queda congelat, F5-safe via isPhaseDone; la pantalla de resultats no pinta cap detall de sub-checks"
    verification:
      - kind: manual_procedural
        ref: "checkpoint humà Task 3 — end-to-end 2 equips: congelació per-equip sense afectar timer/altres equips + resultats nets a totes les pantalles"
        status: pass
    human_judgment: true
    rationale: "Congelació per-equip end-to-end, no-afectació del timer global/altres equips, i la neteja visual de la pantalla de resultats requereixen un judici humà sobre el comportament en viu amb múltiples clients — verificat i aprovat pel desenvolupador."

# Metrics
duration: 21min
completed: 2026-07-06
status: complete
---

# Phase 04 Plan 04: Congelació voluntària CSS/JS (D-15) + resultats sense detall (D-16) Summary

**Botó 'Finalitzar' voluntari sense gate a CSS i JS que congela l'equip server-side (doneAt.css/js, inert per al scoring) i pantalla de resultats reduïda a rànquing + percentatge global per a tothom, amb ownDetail retirat de tots els payloads — addendum de feedback en viu que supersedeix D-08/D-09 i D-10/D-11.**

## Performance

- **Duration:** 21 min (execució original de les dues tasques auto, commits 03:28→03:31 CEST)
- **Started:** 2026-07-06T01:28:38Z
- **Completed:** 2026-07-06T01:49:09Z
- **Tasks:** 3 (2 auto + 1 checkpoint humà aprovat)
- **Files modified:** 4

## Accomplishments
- **D-15 congelació voluntària:** `markPhaseDone` afluixa el gate — accepta `css`/`js` sense comprovació de correcció (voluntari), manté el gate HTML `isHtmlComplete` (D-07) i rebutja fases fora de `PHASE_ORDER`. Un cop marcat, `setCssValue`/`setJsRules` retornen `false` (freeze autoritatiu al mutator, no al client → resistent a payload forjat, T-04-15). El timer global i la resta d'equips no es veuen afectats.
- **Scoring intacte:** `doneAt.css`/`doneAt.js` mai entren a `htmlTimeBonuses` (segueix llegint NOMÉS `doneAt.html`); `scoring.js` sense tocar. El bonus de temps continua sent exclusiu de HTML (D-05/D-06 intactes).
- **D-16 resultats sense detall:** `ADMIN_FINALIZE_GAME` passa d'un bucle per-equip amb `{ranking, ownDetail}` a un únic `io.to('session')` amb NOMÉS `{ranking}`; la reconnexió post-finalize (`GAME_RESULTS`) també deixa NOMÉS `{ranking}`. Cap pantalla (equips + Admin) veu detall de sub-checks; es conserva rànquing + percentatge global propi.
- **Client:** botó 'Finalitzar' sempre clicable a CSS i JS (gate NOMÉS a HTML); `renderJsPanel` inclou `isPhaseDone('js')` al càlcul de `frozen` (F5-safe); listener `TEAM_DONE_STATE` bloqueja selects/botons de `.js-rules`; `renderResultsScreen` sense el bloc "El teu detall".
- **Dead-code hygiene:** eliminats `getTeamSubchecks` (server) i `buildOwnDetail`/`buildSubcheckGroup`/`buildSubcheckItem`/`HTML_SLOT_LABELS` + icones `Check`/`Circle` (client), tots sense consumidor després de la supersessió. `client.css` sense tocar.

## Task Commits

Cada tasca es va committejar atòmicament (executor seqüencial, test + implementació al mateix commit per tasca):

1. **Task 1: Congelació server-side D-15 + eliminació d'ownDetail D-16 (test-first)** - `16f17a7` (feat) — gameState.js, socketHandlers.js, test/results.test.js
2. **Task 2: Botó 'Finalitzar' voluntari CSS/JS + congelació de panell + retirada del detall (client)** - `add2d1a` (feat) — client.js
3. **Task 3: Checkpoint humà — congelació voluntària (D-15) + resultats sense detall (D-16)** - verificat end-to-end i **aprovat** pel desenvolupador (sense issues dins l'abast del checkpoint)

**Plan metadata:** _(aquest commit de tancament)_

_Note: la tasca 1 és TDD però l'executor seqüencial va agrupar RED+GREEN en un sol commit atòmic (patró heretat de 04-01/04-02), amb els tests `VOLUNTARY-FREEZE-D15` substituint `HARDEN-D08/D09`._

## Files Created/Modified
- `src/server/gameState.js` - `markPhaseDone` afluixat (CSS/JS voluntaris, gate HTML intacte); guards de freeze a `setCssValue`/`setJsRules`; `getTeamSubchecks` eliminada de l'objecte exportat.
- `src/server/socketHandlers.js` - `ADMIN_FINALIZE_GAME` → un sol broadcast `{ranking}`; bloc de reconnexió post-finalize `GAME_RESULTS` → NOMÉS `{ranking}`.
- `src/client/client.js` - `renderFinishButton` gate per fase; botó afegit a les branques CSS/JS de `renderActiveSplitScreen`; `renderJsPanel` frozen inclou `isPhaseDone('js')`; branca JS al listener `TEAM_DONE_STATE`; `renderResultsScreen` sense detall; funcions/constants/imports orfes eliminats.
- `test/results.test.js` - `VOLUNTARY-FREEZE-D15` (substitueix `HARDEN-D08/D09`), `FINALIZE-ROUNDTRIP-D16` i `F5-RECOVERY` asserten absència d'`ownDetail`.

## Decisions Made
- **D-15 supersedeix D-08/D-09:** CSS/JS recuperen el botó voluntari sense gate; congela l'equip però és inert per al scoring. Freeze al mutator autoritatiu server-side, no al client.
- **D-16 supersedeix D-10/D-11:** cap detall de sub-checks a NINGÚ; broadcast públic idèntic per a tothom (lockstep, sense superfície de fuita entre equips).
- **`scoring.js` no es toca:** `htmlTimeBonuses` ja filtra `doneAt.html`, així `doneAt.css/js` no poden inflar cap score — el freeze es limita a congelar l'edició.

## Deviations from Plan

None - plan executed exactly as written. Cap bug auto-corregit, cap funcionalitat crítica absent, cap bloqueig arquitectònic, cap auth gate. Les mitigacions del `<threat_model>` (T-04-15 freeze al mutator, T-04-16 fase derivada de `state.phase`, T-04-17 retirada d'ownDetail) es van implementar tal com estaven especificades i queden cobertes pels tests `VOLUNTARY-FREEZE-D15` i `FINALIZE-ROUNDTRIP-D16`.

## Issues Encountered
None.

## Known Stubs
Cap. Tots els botons i panells estan cablejats a events/estat reals; cap valor hardcodejat buit ni component sense font de dades.

## Threat Surface Scan
Sense superfície nova fora del `<threat_model>` del pla. El freeze viu al mutator autoritatiu (T-04-15), la fase es deriva de `state.phase` mai del payload (T-04-16), i el broadcast de resultats deixa de dur dades privades (T-04-17). Cap `npm install` nou (lògica pura + render, T-04-SC accept).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fase 04 completa (4/4 plans): motor de scoring, botons de fase, cerimònia i addendum de congelació/resultats tancats.
- Res pendent per a la Fase 5 (Desplegament VPS + Nginx + PM2); el contracte de temps real Socket.io i l'estat en memòria romanen sense canvis estructurals.

## Self-Check: PASSED

---
*Phase: 04-puntuaci-i-r-nquing-final*
*Completed: 2026-07-06*
