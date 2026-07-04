---
phase: 03-joc-fases-css-i-js
plan: 01
subsystem: Fase CSS jugable (codi foradat sobre el robot Bender)
tags: [css-holes, socket-io, cssom, custom-properties, server-authoritative, dom-incomplete]
requires:
  - "Fase 2 (HTML placement): wrapPreview/assemblePreview, TEAM_BOARD_STATE, split shell"
  - "gameState singleton (mutation-returns-bool), sessionStore token→teamId, safeHandler"
provides:
  - "CSS_HOLES (frozen, 16 forats color/range amb validate) a src/shared/robotTemplate.js"
  - "team.cssValues + setCssValue (mutation-returns-bool) + getTeamStyle a gameState"
  - "events TEAM_SET_CSS (client→server) i TEAM_CSS_STATE (server→client dirigit)"
  - "client: renderCssPanel/applyCssHole/applyAllCssValues/syncCssPanelInputs; wrapPreview amb 16 var()"
  - "split 50/50 (.active-split 1fr 1fr, D-21) a totes 3 fases"
affects:
  - "Pla 02 (Fase JS): es construeix sobre el robot ja estilitzat i el mateix split"
tech-stack:
  added: []
  patterns:
    - "CSS custom-property injection via CSSOM setProperty (build srcdoc once, no reload)"
    - "server-authoritative per-team state + directed team:<id> emit + F5 recovery on connect"
key-files:
  created:
    - test/cssPhase.test.js
  modified:
    - src/shared/robotTemplate.js
    - src/server/gameState.js
    - src/server/events.js
    - src/server/socketHandlers.js
    - src/client/client.js
    - src/client/client.css
decisions:
  - "4 forats ⚠ (antena-bg/cap-bg aplanen gradient; antena-border/ulls-top afegeixen propietat) resolts amb defaults documentats — pendents de confirmació visual al human-check"
  - "D-08 dents: target locked #fffcd3 com a default del control; #f2e6a8 (font) només fallback del var() al srcdoc"
  - "Emissió només en `change` (valor assentat), mai en `input` continu (anti-storm; cap observador remot, D-22)"
metrics:
  duration_min: 19
  tasks: 4
  files_created: 1
  files_modified: 6
  tests: 43
  completed: 2026-07-04
status: complete
---

# Phase 3 Plan 01: Fase CSS jugable Summary

Fase CSS jugable completa: sobre l'HTML del robot Bender (potencialment incomplet), l'equip omple 16 forats de CSS real (6 color pickers + 10 sliders) i veu el robot adquirir el seu aspecte Bender a l'instant via CSSOM custom properties, amb estat autoritatiu per equip i recuperació F5 dirigida — sense text lliure, sense errors de sintaxi, sense trencar-se sobre DOM incomplet.

## What Was Built

- **`CSS_HOLES` (frozen, 16 entrades)** a `src/shared/robotTemplate.js`: keyed per holeId, cada forat porta `var`/`selector`/`group`/`prop`/`control`/`validate`/`default` (+ `min`/`max`/`step`/`unit` per als range). Validadors: color `^#[0-9a-fA-F]{6}$`; range numèric-dins-de-rang amb unitat esperada (rebutja `;`/`{`/`}`, anti-injecció Pitfall 5). Selectors creuats contra `SLOTS[].html`/`CONTAINERS`.
- **Estat autoritatiu per equip**: `team.cssValues: {}`, `setCssValue(teamId, holeId, value)` calcat de `placePiece` (mutation-returns-bool: no-op sobre value repetit/invàlid/holeId desconegut/fora-de-fase-css/timer-frozen), `getTeamStyle(teamId)` (còpia superficial, mai la referència viva).
- **Events dirigits**: `TEAM_SET_CSS` (`team:set-css`), `TEAM_CSS_STATE` (`team:css-state`). Handler calcat de `TEAM_PLACE_PIECE` (identitat de `socket.data.teamId`, mai del payload; `safeHandler`; emissió `team:<id>` + `admin` connexió-només, MAI `io.to('session')`). Reconnexió emet `TEAM_CSS_STATE` dirigit a l'owner (CORE-03).
- **Client**: `wrapPreview` reescrit amb el CSS definitiu del Bender on cada un dels 16 forats és `var(--nom, <default>)` (la capa `#robot-fons` intacta, D-10); `assembleRobotMarkup` extret com a fn pura reutilitzable; `applyCssHole`/`applyAllCssValues` (CSSOM setProperty, no-op silenciós sobre element absent); `renderCssPanel`/`renderForatRow` derivats de `CSS_HOLES`; `syncCssPanelInputs` per reconciliar controls in situ; handler `TEAM_CSS_STATE`.
- **Layout**: `.active-split` corregit a `grid-template-columns: 1fr 1fr` (D-21, exacte 50/50 a les 3 fases); `.action-panel` amb scroll vertical per panells densos; estils tokenitzats `.css-forat-group`/`.css-forat`/`--color`/`--range` (només tokens existents, cap token nou).

## Key Flow

`slider input` → `applyCssHole` (CSSOM setProperty local, instantani, sense recàrrega d'iframe) → `slider change` → `TEAM_SET_CSS` → `setCssValue` → `TEAM_CSS_STATE` dirigit → `applyAllCssValues` + `syncCssPanelInputs`. El srcdoc es construeix UNA vegada per entrada de fase; els canvis viuen via custom properties (Pitfall 1). L'iframe roman scriptless (`allow-same-origin`, sense `allow-scripts`, T-03-04).

## Verification Results

- `node --test test/cssPhase.test.js` — **verd**: SET-CSS-OK / NOOP / INVALID / WRONG-PHASE / NO-SESSION-BROADCAST / V4-FORGE / F5-CSS-RECOVERY.
- `node --test test/{placement,timer,monitoring,roundtrip,adminAuth}.test.js` — **cap regressió** (43 tests totals, 0 fallits).
- Estàtic: `CSS_HOLES` = 16 forats ben formats (validate function, var comença per `--`); `wrapPreview` conté ≥16 `var(--`; `.active-split` = `1fr 1fr`.
- **TDD gate**: commit `test(...)` RED (ca4725f) → commits `feat(...)` GREEN (7c9cf8e, 1973977, 25e5c3f). Seqüència RED→GREEN respectada.

## TDD RED confirmation

El commit RED (ca4725f) va deixar SET-CSS-OK i F5-CSS-RECOVERY fallant (events/mutador inexistents); els casos "no broadcast" passaven trivialment (asserten `undefined`). Cap test va passar inesperadament abans de la implementació.

## Deviations from Plan

Cap desviació de fons. Ajustos menors dins de l'abast previst pel pla:

- **[Rule 3 - Blocking] Refactor `assemblePreview` → `assembleRobotMarkup`**: el pla (Task 4) demanava `wrapPreview(assembleRobotMarkup(latestPlacement))` però el codi tenia `assemblePreview` monolític. Extret `assembleRobotMarkup` (fn pura sanejada amb DOMPurify) i `assemblePreview` ara la reutilitza — canvi mínim, cap canvi de comportament a la fase html. Commit 1973977.
- **`renderActiveSplitScreen`**: el bloc final de branca `if (gameContainer)` es va convertir en `if/else if (css)/else` explícit per fase, per no dependre de `gameContainer` (null a css). Commit 25e5c3f.

## 4 forats ⚠ (resolts amb defaults documentats)

- `antena-bg` (D-03): color pla que APLANA el radial-gradient cian (var() fallback = radial original). Default control `#7dfcff`.
- `antena-border` (D-03): border AFEGIT a `.antena::before` (fallback `transparent`). Default control `#17d8e0`.
- `ulls-top` (D-05): `position: relative` AFEGIT + `top: var(--ulls-top, 0px)`.
- `cap-bg` (D-09): color pla que APLANA el linear-gradient metàl·lic (var() fallback = gradient original). Default control `#a7b1c2`.

## Pending Human Verification (end-of-phase, in-classroom)

El `<human-check>` de la Task 4 és una verificació visual/funcional que requereix l'app en marxa a l'aula (`npm run dev` + `npm run server`) i **no es pot automatitzar en aquest worktree**. Pendents de confirmació manual:
1. Cada slider/color canvia el robot a l'instant sense parpelleig ni re-decode de `/robot-fons.png`.
2. Amb els valors target el robot arriba a l'aspecte Bender (visor fosc, ulls grocs, dents metàl·liques, cap gris-blau, antena).
3. **Confirmació explícita del tradeoff dels 4 forats ⚠** (aplanament de gradients antena-bg/cap-bg) — acceptable per a l'objectiu pedagògic?
4. F5 recupera els valors CSS.
5. Divisió 50/50 exacta a html i css.

Els guards de no-op sobre element absent (GAME-07/D-19) estan implementats i coberts indirectament (CSSOM setProperty sobre `documentElement` no fa lookup; `applyCssHole` retorna abans si l'iframe no és ready o el holeId és desconegut).

## Known Stubs

Cap. El panell està totalment cablejat a `CSS_HOLES` i al round-trip del servidor; no hi ha dades buides hardcoded ni placeholders que flueixin a la UI.

## Threat Surface

Cap superfície nova fora del `<threat_model>` del pla. Totes les mitigacions (T-03-01…06) implementades: validació servidor + CSSOM setProperty (T-03-01), identitat de `socket.data` (T-03-02), mutation-returns-bool + emissió dirigida + emit-on-change (T-03-03), iframe scriptless (T-03-04), DOMPurify sense canvis + només `style`/custom properties (T-03-05), `safeHandler` (T-03-06).

## Commits

- `ca4725f` test(03-01): failing CSS-phase round-trip test (RED)
- `7c9cf8e` feat(03-01): CSS_HOLES + authoritative cssValues state + directed events (GREEN)
- `1973977` feat(03-01): rewrite wrapPreview with Bender CSS + 16 var() holes + CSSOM apply
- `25e5c3f` feat(03-01): CSS forat panel + 50/50 split + TEAM_CSS_STATE handler

## Self-Check: PASSED

Tots els fitxers creats/modificats existeixen al disc; els 4 commits de tasca existeixen a l'historial.
