---
phase: 04-puntuaci-i-r-nquing-final
plan: 01
subsystem: scoring
tags: [scoring, ranking, socketio, results-screen, privacy-d10]
status: complete
requires:
  - "team.placement/cssValues/jsRules/doneAt (gameState, Fases 2-3)"
  - "CSS_HOLES + SLOTS + JS vocab (robotTemplate.js)"
  - "safeHandler + directed emission patterns (socketHandlers.js)"
provides:
  - "src/shared/scoring.js: scoreHtml/scoreCss/scoreJs/computeGlobal/htmlTimeBonuses/isHtmlComplete + WEIGHTS"
  - "CSS_TARGETS (robotTemplate.js) — font única machine-readable dels valors objectiu"
  - "gameState.finalizeGame/buildRanking/getTeamSubchecks + finished/finalRanking a getPublicState"
  - "EVENTS.ADMIN_FINALIZE_GAME/CEREMONY_START/GAME_RESULTS"
  - "pantalla de resultats d'equip + rànquing final d'Admin"
affects:
  - "Pla 02 (retrofit de botons + rànquing parcial) consumeix isHtmlComplete + buildRanking(mask)"
  - "Pla 03 (cerimònia) interceptarà CEREMONY_START abans del render de resultats"
tech-stack:
  added: []
  patterns:
    - "mòdul pur compartit (mirall d'effects.js): sense socket/I/O, testejable en aïllament"
    - "mutation-returns-bool idempotent per finalizeGame (mirall de markPhaseDone)"
    - "emissió dirigida per-equip io.to('team:<id>') per privacitat D-10 a la capa d'emissió"
    - "render client PUR sobre payload autoritatiu (cap càlcul de score al client)"
key-files:
  created:
    - src/shared/scoring.js
    - test/scoring.test.js
    - test/results.test.js
  modified:
    - src/shared/robotTemplate.js
    - src/server/events.js
    - src/server/gameState.js
    - src/server/socketHandlers.js
    - src/client/client.js
    - src/client/admin.js
    - src/client/client.css
decisions:
  - "Distància de color RGB Euclidiana normalitzada per sqrt(3)*255 (D-02 discretion → simplicitat, A1)"
  - "JS score split 50/50 quantitat/varietat (A2, default defensable de la discreció D-03)"
  - "Bonus de temps HTML rank-based entre finishers, no absolut (Pitfall 3 — no hi ha phaseStartedAt)"
  - "Estat terminal com a flag state.finished, no una fase 'results' a PHASE_ORDER (A6)"
  - "F5 post-finalize mostra resultats directes via GAME_RESULTS, sense re-reproduir cerimònia (A7)"
metrics:
  duration_min: 40
  tasks: 3
  files: 10
  tests_added: 24
  completed: 2026-07-05
---

# Phase 04 Plan 01: Puntuació i rànquing final (espina vertical) Summary

Motor de puntuació determinista pur (`scoring.js`) + finalització autoritativa al servidor amb emissió filtrada per-equip (privacitat D-10) + pantalla de resultats a equip i Admin, tot connectat end-to-end: l'Admin prem "Finalitzar i Mostrar Resultats" i totes les pantalles salten al rànquing global + detall privat propi, recuperable a F5.

## What Was Built

- **`src/shared/scoring.js` (nou, pur):** `WEIGHTS` (30/60/10), `scoreHtml` (proximitat parcial, D-01), `scoreCss` (distància RGB/numèrica normalitzada per forat, D-02), `scoreJs` (quantitat+varietat, D-03), `computeGlobal` (pesos + màscara D-13 + bonus clampat), `htmlTimeBonuses` (rank-based entre finishers, D-05/D-06), `isHtmlComplete` (gate D-07 per al Pla 02). Cap socket, cap acoblament a gameState, cap `Date.now()` dins la matemàtica.
- **`CSS_TARGETS` (robotTemplate.js):** font única machine-readable dels 17 valors objectiu (una entrada per clau de `CSS_HOLES`), reconciliats de les tres fonts històriques; comentari antic reemplaçat per una referència creuada (Pitfall 1).
- **Finalització al servidor:** `finalizeGame()` idempotent (mata la DoS de finalize-spam), `buildRanking(mask)`, `getTeamSubchecks(teamId)`, i `finished`/`finalRanking` a `getPublicState()`. Handler `ADMIN_FINALIZE_GAME` admin-only que difon `CEREMONY_START` amb ranking (`{id,name,globalPct}`) a tots i `ownDetail` NOMÉS dirigit a `team:<id>` (D-10). F5: `GAME_RESULTS` dirigit a l'owner en reconnectar.
- **Client:** branca terminal `state.finished` a `renderScreenForState` → `.results-screen` (rànquing global + Trophy al #1 + % propi en Display + detall privat per fase amb pass/miss neutres). Listeners `CEREMONY_START`/`GAME_RESULTS` (render directe en aquest pla). Admin: CTA repurposat a "Finalitzar i Mostrar Resultats" a la fase js amb diàleg de confirmació + rànquing final derivat del darrer payload (F5-safe).

## How to Verify

- `node --test test/scoring.test.js test/results.test.js` → verd (unitari pur + integració socket).
- `npm test` → 80/80 verds (cap regressió a Fases 1-3).
- `npm run build` → compila admin + client sense errors.
- Privacitat D-10 verificada per test: el payload de l'equip A mai conté sub-checks de l'equip B; l'Admin rep ranking sense `ownDetail`.
- `CSS_TARGETS` count === `CSS_HOLES` count (17), verificat per test (no hardcodejat).

## Key Decisions

- **RGB Euclidiana normalitzada** (`sqrt(3)*255`) per a la distància de color — simplicitat sobre precisió perceptual (D-02 discretion, RESEARCH A1).
- **JS 50/50 quantitat/varietat** — default defensable de la discreció oberta D-03 (RESEARCH A2). Documentat en comentari; el propietari pot re-sintonitzar.
- **Bonus de temps rank-based**, no per temps absolut — robust a pause/resume/extend perquè no existeix `phaseStartedAt` (Pitfall 3).
- **Estat terminal com a flag** `state.finished` (no una fase `results` nova) per no trencar els guards de `nextPhase`/`startPhase` (A6).
- **Retrofit de botons (D-07/D-08/D-09) i rànquing parcial d'Admin (D-12/D-13) NO s'implementen aquí** — pertanyen al Pla 02 segons l'objectiu del pla. Aquest pla deixa `renderFinishButton` intacte i exporta `isHtmlComplete`/`buildRanking(mask)` per consumir-los.

## Deviations from Plan

None — el pla s'ha executat exactament tal com estava escrit. Cap bug, cap funcionalitat crítica absent, cap bloqueig arquitectònic. Cap auth gate (l'ADMIN_SECRET reutilitza el handshake existent; el test suite corre sense secret, comportament ja establert a Fases 1-3).

## TDD Gate Compliance

Tasks 1 i 2 (`tdd="true"`): tests escrits PRIMER i confirmats RED abans d'implementar (scoring.test.js → import throws; results.test.js → round-trip falla per handler absent), després portats a GREEN. Com a executor seqüencial amb commits atòmics per tasca, RED i GREEN s'han combinat en un únic commit `feat(...)` per tasca (no dos commits separats), amb el mòdul de test i la implementació junts. La seqüència RED→GREEN es va exercitar en procés.

## Known Stubs

Cap. Tot el codi nou d'aquest pla està cablejat al payload autoritatiu real; no hi ha valors hardcodejats buits ni components sense font de dades. (Les dues coincidències de "placeholder" a client.js — línies 651/1176 — són pre-existents i alienes a aquest pla: visual de drag & drop i text `…` d'un desplegable.)

## Threat Surface Scan

Sense superfície nova fora del `<threat_model>` del pla. El nou event admin (`ADMIN_FINALIZE_GAME`) re-valida pertinença a la room 'admin' (T-04-01), la privacitat D-10 s'aplica a la capa d'emissió i es verifica per test (T-04-02), `finalizeGame` idempotent mata la DoS de finalize-spam (T-04-04) i el handler va envoltat de `safeHandler` (T-04-05). Cap `npm install` nou (T-04-SC accept).

## Self-Check: PASSED
