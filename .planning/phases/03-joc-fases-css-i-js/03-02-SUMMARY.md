---
phase: 03-joc-fases-css-i-js
plan: 02
subsystem: Fase JS jugable (constructor de regles + intèrpret parent-driven sobre iframe scriptless)
tags: [js-rules, effect-interpreter, no-eval, socket-io, server-authoritative, dom-incomplete, scriptless-iframe]
requires:
  - "Pla 01 (Fase CSS): wrapPreview reescrit amb var(), assembleRobotMarkup, applyAllCssValues, latestCssValues, split 50/50"
  - "Fase 2 (HTML placement): TEAM_BOARD_STATE, latestPlacement, renderActiveSplitScreen split shell"
  - "gameState singleton (mutation-returns-bool), sessionStore token→teamId, safeHandler, identitat de socket.data.teamId"
provides:
  - "JS_EVENTS/JS_ELEMENTS/JS_ELEMENT_LABELS/JS_ACTION_KEYS/JS_COMPOSITE_KEYS/JS_ACTION_LABELS/JS_ROW_LIMIT (frozen) a src/shared/robotTemplate.js"
  - "src/shared/effects.js: ACTIONS/COMPOSITES/applyAction(doc,rule)/attachRule(doc,rule) (pur, sense eval, null-guardat)"
  - "team.jsRules + setJsRules (mutation-returns-bool, vocab/anti-repeat/límit/composite validation) + getTeamRules a gameState"
  - "events TEAM_SET_RULES (client→server) i TEAM_JS_STATE (server→client dirigit)"
  - "client: renderJsPanel + panell de regles + rebuildJsPreview (rebuild-then-reattach) + previewSingleRule (Veure) + handler TEAM_JS_STATE"
  - "client.css: .js-rules/.js-rule/.js-add + classes d'efecte .js-rotate/.js-scale/.js-squint/.js-boca-tanca/.js-vermell al srcdoc"
affects:
  - "Fase 4 (scoring): llegirà team.jsRules (cobertura d'events/elements + accions bonus, D-11)"
tech-stack:
  added: []
  patterns:
    - "Parent-driven effect interpreter: frozen dispatch tables keyed by closed vocab, no eval/Function; iframe stays scriptless (allow-same-origin, no allow-scripts)"
    - "Whole-array authoritative rule replace + directed team:<id> emit + F5 recovery on connect"
    - "Rebuild-then-reattach: build srcdoc once, re-attach all rules on load (avoids stale listeners, Pitfall 3)"
    - "Local working-copy panel state (jsPanelRows) decoupled from authoritative rules (latestJsRules) to avoid clobbering in-progress edits on unrelated re-renders"
key-files:
  created:
    - test/effects.test.js
    - test/jsPhase.test.js
    - src/shared/effects.js
  modified:
    - src/shared/robotTemplate.js
    - src/server/gameState.js
    - src/server/events.js
    - src/server/socketHandlers.js
    - src/client/client.js
    - src/client/client.css
decisions:
  - "Catàleg de 3 accions compostes (D-17, mínim 2): acluca-tanca, ulls-vermells-orelles-grosses, cap-gira-antena-creix — cadascuna una llista frozen [{sel,fn}]"
  - "hover (D-13) es materialitza com a l'event DOM real mouseover"
  - "Efectes via classList.toggle (reversibles) sobre classes del srcdoc; girar té fallback estàtic rotate(20deg) visible amb reduced-motion i gir continu sota no-preference"
  - "Vocabulari JS com a literal frozen keyed (mateixa disciplina 'derivat/creuat contra SLOTS/CONTAINERS' que CSS_HOLES del Pla 01), no derivació runtime — 1:1 no és possible (antena sense id, ulls via :nth-of-type, cap és contenidor)"
  - "Estat del panell = còpia de treball local jsPanelRows (files parcials permeses); s'emet TEAM_SET_RULES només amb files completes (whole-array)"
metrics:
  duration_min: 17
  tasks: 4
  files_created: 3
  files_modified: 6
  tests: 56
  completed: 2026-07-04
status: complete
---

# Phase 3 Plan 02: Fase JS jugable Summary

Fase JS jugable completa com a llesca vertical: sobre el robot Bender ja estilitzat (Pla 01), l'equip construeix regles obertes "Quan [event] a [origen] → a l'element [destí] → Fes [acció]" amb 4 desplegables tancats i, en prémer "Veure", el robot reacciona a la interacció del ratolí — tot amb un intèrpret parent-driven de taules frozen, SENSE eval/Function i amb l'iframe scriptless, tolerant a DOM incomplet (no-op silenciós), amb estat autoritatiu per equip i recuperació F5 dirigida.

## What Was Built

- **Vocabulari JS frozen** a `src/shared/robotTemplate.js`: `JS_EVENTS` (4, D-13: hover→mouseover), `JS_ELEMENTS` (8 → selector real, D-14; antena via classe, els dos ulls via `:nth-of-type` perquè els `<span class="ull">` no tenen id), `JS_ELEMENT_LABELS` (token mostrat: cap→`#robot-cap`), `JS_ACTION_KEYS` (4 simples, D-16), `JS_COMPOSITE_KEYS` (3 compostes, D-17), `JS_ACTION_LABELS` (noms catalans), `JS_ROW_LIMIT = 6`.
- **`src/shared/effects.js` (NOU)** — intèrpret pur parent-driven (03-RESEARCH §Pattern 2): `ACTIONS` (map clau simple → `(el)=>{}`), `COMPOSITES` (map clau composta → llista frozen `[{sel,fn}]`), `applyAction(doc,rule)` i `attachRule(doc,rule)`. CADA lookup null-guardat + `hasOwnProperty` (evita resolució a mètodes d'Object.prototype, T-03-07/T-03-10). Element absent / acció desconeguda = no-op silenciós (GAME-07/D-19). Muta només `style`/`classList`/`visibility`, mai innerHTML (T-03-11).
- **Estat autoritatiu per equip** a `gameState.js`: `team.jsRules: []`, `setJsRules(teamId, rules)` calcat de `setCssValue` (mutation-returns-bool: rebutja fora-de-fase-js/timer-frozen/no-array/>6-files/vocabulari-desconegut/anti-repeat-(event,origen)/composite-amb-destí-no-null), `getTeamRules(teamId)` (còpia per regla, mai la referència viva).
- **Events dirigits** a `events.js`: `TEAM_SET_RULES` (`team:set-rules`), `TEAM_JS_STATE` (`team:js-state`). Handler a `socketHandlers.js` calcat de `TEAM_SET_CSS` (identitat de `socket.data.teamId`, mai del payload; `safeHandler`; emissió `team:<id>` + admin connexió-només, MAI `io.to('session')`). Reconnexió emet `TEAM_JS_STATE` dirigit a l'owner (CORE-03).
- **Client** a `client.js`: `renderJsPanel` (pila de files de regla amb 4 desplegables natius poblats del vocabulari frozen; anti-repeat D-15 i composite-disables-destí D-17 comunicats NOMÉS amb estat disabled, cap error/vermell; "Afegir JavaScript" disabled al límit D-12; etiquetes read-only via `textContent`); `rebuildJsPreview` (rebuild-then-reattach, Pitfall 3); `previewSingleRule` (botó "Veure"); branca `js` a `renderActiveSplitScreen`; handler `TEAM_JS_STATE` amb reseed F5. Còpia de treball local `jsPanelRows` desacoblada de `latestJsRules` (no clobbera edicions a mig fer en un re-render aliè).
- **Estils** a `client.css`: `.js-rules`/`.js-rule`/`.js-add` tokenitzats (tira d'identitat `--phase-js`, controls neutres amb focus `--color-text` per contrast insuficient del mustard, ≥44px, motion slide-in sota `prefers-reduced-motion:no-preference`). Classes d'efecte al `<style>` del srcdoc de `wrapPreview`: `.js-rotate`/`.js-scale`/`.js-squint`/`.js-boca-tanca`/`.js-vermell`. Cap token nou.

## Key Flow

`desplegables plens` → `updateJsRow` → `emitJsRules` (només files completes, whole-array) → `TEAM_SET_RULES` → `setJsRules` (valida vocab frozen + anti-repeat + límit + composite⇒destí null) → `TEAM_JS_STATE` dirigit → client `rebuildJsPreview` (srcdoc UNA vegada + reattach de totes les regles a `load`). "Veure" = `previewSingleRule` reconstrueix i attacha NOMÉS aquella regla (client-only). `attachRule`/`applyAction` null-guarden cada `querySelector` → no-op natural sobre element absent. L'iframe roman scriptless (`allow-same-origin`, sense `allow-scripts`, T-03-08).

## Verification Results

- `node --test test/effects.test.js test/jsPhase.test.js` — **verd**: no-op GAME-07 pur (applyAction/attachRule sobre doc stub buit) + round-trip RULES-OK / ANTIREPEAT-REJECT / LIMIT-REJECT / VOCAB-REJECT / COMPOSITE-DESTI-REJECT / WRONG-PHASE / NO-SESSION-BROADCAST / F5-JS-RECOVERY.
- `node --test` sobre cssPhase/placement/timer/monitoring/roundtrip/adminAuth — **cap regressió** (56 tests totals, 0 fallits).
- Estàtic: `renderJsPanel` present; classes `.js-rotate`/`.js-scale`/`.js-squint` al srcdoc; effects no-op eval sobre doc stub no llença.
- `npm run build` (Vite) — **verd** (client bundle 98.36 kB, sense errors de sintaxi ni imports).
- **TDD gate**: commit `test(...)` RED (704450a) → commits `feat(...)` GREEN (759e91f, 92043ce, 442fdf1). Seqüència RED→GREEN respectada.

## TDD RED confirmation

El commit RED (704450a) va deixar `effects.test.js` fallant sencer (mòdul `effects.js` inexistent → l'import llença) i `RULES-OK`/`NO-SESSION-BROADCAST` fallant a `jsPhase.test.js` (events/mutador inexistents). Cap test va passar inesperadament abans de la implementació.

## Deviations from Plan

Cap desviació de fons. Ajustos menors dins de l'abast previst pel pla:

- **[Rule 2 - Seguretat] `hasOwnProperty` guards a effects.js i setJsRules**: les taules frozen hereten mètodes d'`Object.prototype`, així que una clau com `toString`/`__proto__` resoldria a una funció heretada (i `querySelector` d'un objecte llençaria). S'ha afegit un helper `own()`/`ownKey()` que exigeix propietat pròpia abans de qualsevol lookup (T-03-07/T-03-10). Cap canvi de comportament per a claus vàlides. Commits 759e91f/92043ce.
- **Preview plumbing (`rebuildJsPreview`/`previewSingleRule`) inclòs al commit de la Task 3** en comptes de la Task 4: el pla les situava a la Task 4, però incloure-les amb el panell manté cada commit intermedi carregable i funcional (el botó "Veure" no queda apuntant a una funció inexistent). La integració al cicle de fase (branca `renderActiveSplitScreen` + handler) queda a la Task 4 (442fdf1).

## Known Stubs

Cap. El panell està totalment cablejat al vocabulari frozen i al round-trip del servidor; no hi ha dades buides hardcoded ni placeholders que flueixin a la UI.

## Threat Surface

Cap superfície nova fora del `<threat_model>` del pla. Totes les mitigacions implementades: cap eval/Function + taula de despatx frozen keyed per vocabulari tancat (T-03-07); iframe scriptless `allow-same-origin` sense `allow-scripts` (T-03-08); identitat de `socket.data.teamId`, mai del payload (T-03-09); revalidació servidor de cada camp contra enums frozen + anti-repeat + límit + composite⇒destí null (T-03-10); efectes només `style`/`classList`/`visibility`, mai innerHTML (T-03-11); `safeHandler` + mutation-returns-bool + emissió dirigida `team:<id>` (T-03-12). Aquesta fase NO instal·la cap paquet extern (cap Package Legitimacy Gate).

## Pending Human Verification (end-of-phase, in-classroom)

El `<human-check>` de la Task 4 requereix l'app en marxa (`npm run dev` + `npm run server`) i **no es pot automatitzar en aquest worktree**. Pendents de confirmació manual:
1. Construir una regla completa i prémer "Veure" → el robot reacciona a aquella interacció del ratolí.
2. Una parella (event, origen) ja usada queda desactivada a altres files (D-15); triar una acció composta desactiva el destí (D-17).
3. "Afegir JavaScript" arriba al límit de 5-6 files i es desactiva (D-12).
4. Regla amb origen absent (peça HTML no col·locada) → cap efecte, cap error de consola, la resta del panell funciona (GAME-07/D-19). *(Guards implementats i coberts a effects.test.js sobre doc stub.)*
5. F5 a la pantalla d'equip → les regles construïdes es recuperen (round-trip cobert a jsPhase.test.js F5-JS-RECOVERY; falta confirmació visual del reseed del panell).
6. El card de l'Admin mostra només estat de connexió durant la fase js (D-22, `getPublicState().progress === null` fora de la fase html — comportament ja existent, sense canvis).

## Commits

- `704450a` test(03-02): failing JS-phase interpreter no-op + rule round-trip (RED)
- `759e91f` feat(03-02): JS vocab + parent-driven effects interpreter + authoritative jsRules (GREEN)
- `92043ce` feat(03-02): JS rule panel (renderJsPanel) + effect classes in srcdoc + preview plumbing
- `442fdf1` feat(03-02): wire JS split branch + srcdoc reattach + Veure + TEAM_JS_STATE handler

## Self-Check: PASSED

Tots els fitxers creats/modificats existeixen al disc; els 4 commits de tasca existeixen a l'historial.
