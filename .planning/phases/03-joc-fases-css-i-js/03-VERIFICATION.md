---
phase: 03-joc-fases-css-i-js
verified: 2026-07-04T06:45:39Z
status: human_needed
score: 9/11 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "SC1 — Un equip omple el CSS foradat via color pickers/sliders sobre sintaxi CSS real i la preview reflecteix el canvi A L'INSTANT (sense parpelleig ni recàrrega de `/robot-fons.png`)"
    test: "A la pantalla d'equip, fase css activa: moure cada slider i triar cada color."
    expected: "El robot de la dreta canvia de forma/color en temps real, sense parpelleig visible ni re-decodificació del fons; amb els valors target arriba a l'aspecte Bender complet."
    why_human: "El codi aplica els valors via CSSOM setProperty (confirmat: applyCssHole/applyAllCssValues, sense reassignar srcdoc) i el round-trip de xarxa està cobert per test, però la percepció de 'instantani sense parpelleig' és un judici visual/de timing que cap assert automatitzat exercita."
  - truth: "SC2 — Un equip construeix una regla JS amb desplegables i, en prémer 'Veure', el robot de la preview reacciona a la interacció del ratolí"
    test: "Construir una regla completa (p.ex. click a nas → #robot-cap → Girar) i prémer 'Veure'."
    expected: "El robot reacciona visualment a la interacció definida (color, amagar, girar, créixer, o composta)."
    why_human: "`attachRule`/`applyAction` estan coberts per test pur amb doc stub (no-op sobre absent), i el round-trip de regles està cobert per test de xarxa, però l'efecte visual real sobre el DOM de l'iframe (reacció al `mouseover`/`click` real) no s'exercita per cap test automatitzat."
gaps: []
deferred: []
human_verification:
  - test: "Moure cada slider i triar cada color a la fase css"
    expected: "El robot canvia a l'instant sense parpelleig ni re-decode de /robot-fons.png; amb valors target arriba a l'aspecte Bender (visor fosc, ulls grocs, dents metàl·liques, cap gris-blau, antena)"
    why_human: "Percepció visual/timing — no verificable per grep/assert"
  - test: "Confirmar explícitament el tradeoff dels 4 forats ⚠ (antena-bg/cap-bg aplanen el gradient a color pla)"
    expected: "El professor/equip accepta que l'objectiu pedagògic ('l'alumne posa un valor CSS real i el veu') es manté tot i perdre el matís de gradient"
    why_human: "Judici de disseny/pedagògic explícitament deixat pendent pel pla (Task 4, 03-01-PLAN.md)"
  - test: "F5 a la pantalla d'equip durant la fase css"
    expected: "Els valors CSS es recuperen I el robot mostra les peces HTML prèviament col·locades (verificació visual de la correcció CR-01)"
    why_human: "El round-trip de xarxa (cssValues) ja és verd per test; la renderització real de l'iframe després del fix CR-01 no té test de navegador/jsdom"
  - test: "Divisió 50/50 exacta a les fases html i css (i js)"
    expected: "El panell d'acció i la preview ocupen visualment el mateix ample"
    why_human: "`grid-template-columns: 1fr 1fr` és confirmat estàticament, però la percepció visual final (paddings, scroll, etc.) és judici humà"
  - test: "Construir una regla completa i prémer 'Veure'"
    expected: "El robot reacciona a la interacció del ratolí definida per la regla"
    why_human: "Vegeu behavior_unverified_items — comportament d'iframe real no exercitat per cap test"
  - test: "Confirmar que una parella (event, origen) ja usada queda desactivada visualment a altres files, i que triar una acció composta desactiva visualment el desplegable destí"
    expected: "Els desplegables mostren `disabled` segons D-15/D-17"
    why_human: "La validació de dades està coberta per test de servidor (RULES-ANTIREPEAT-REJECT, COMPOSITE-DESTI-REJECT); l'estat `disabled` als `<select>` del DOM no té test de navegador"
  - test: "'Afegir JavaScript' arriba al límit de 5-6 files i llavors es desactiva"
    expected: "El botó queda `disabled` en arribar a JS_ROW_LIMIT (6)"
    why_human: "Comportament de UI en viu, no verificable per grep"
  - test: "Regla amb origen absent (peça HTML no col·locada) durant la fase js"
    expected: "Cap efecte, cap error de consola, la resta del panell segueix funcionant"
    why_human: "Cobert indirectament per effects.test.js (doc stub), però la confirmació 'cap error de consola al navegador real' és judici humà explícit del pla"
  - test: "F5 a la pantalla d'equip durant la fase js"
    expected: "Les regles construïdes es recuperen i es reflecteixen al panell (reseed)"
    why_human: "Round-trip de xarxa (jsRules) ja és verd per test; el reseed visual del panell (jsPanelRows) no té test de navegador"
  - test: "El card de l'Admin mostra només estat de connexió (sense comptador N/total) durant les fases css i js"
    expected: "Cap xifra de progrés visible al panell Admin fora de la fase html"
    why_human: "Confirmat per codi que `progress` és `null` fora de `html`, però la renderització final al panell Admin (admin.js, no revisat en aquesta fase) és judici visual"
---

# Phase 3: Joc — Fases CSS i JS Verification Report

**Phase Goal:** Els equips poden completar la Fase CSS i la Fase JS treballant sobre l'HTML produït a la fase anterior, encara que aquest hagi quedat incomplet
**Verified:** 2026-07-04T06:45:39Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 (ROADMAP): CSS foradat via color pickers/sliders sobre sintaxi CSS real, preview reflecteix el canvi a l'instant | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `CSS_HOLES` (16, `src/shared/robotTemplate.js`), `applyCssHole`/`applyAllCssValues` (`src/client/client.js:876-891`) usen `setProperty` CSSOM, mai reassignen `srcdoc`; round-trip verd (`cssPhase.test.js` SET-CSS-OK). Percepció visual "instantani/sense parpelleig" no exercitada per cap test — human-check explícit al pla |
| 2 | SC2 (ROADMAP): construir regles JS amb desplegables i veure l'efecte a la preview | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `renderJsPanel`, `previewSingleRule` (botó "Veure"), `rebuildJsPreview` (`src/client/client.js`); `effects.js` (`applyAction`/`attachRule`) provats purs; round-trip verd (`jsPhase.test.js` RULES-OK). Reacció visual real sobre l'iframe no exercitada per cap test — human-check explícit al pla |
| 3 | SC3 (ROADMAP): les fases CSS i JS operen sobre el DOM parcial (HTML incomplet) sense trencar-se | ✓ VERIFIED | `test/effects.test.js` (3 casos `assert.doesNotThrow` sobre doc stub buit) — **verd**. `applyCssHole` aplica `setProperty` sobre `documentElement` sense cap `querySelector` de l'element destí, per tant mai pot llençar sobre element absent (`src/client/client.js:876-887`) |
| 4 | El valor CSS triat sobreviu un F5/reconnexió: recuperat dirigit des del servidor (CORE-03) | ✓ VERIFIED | `F5-CSS-RECOVERY` a `cssPhase.test.js` (verd); **CR-01 confirmat corregit**: `rebuildCssPreview()` (`client.js:1218-1223`) cridat des de `renderActiveSplitScreen`'s branca css (línia 1356) I des del handler `TEAM_BOARD_STATE` quan `phase==='css'` (línia 1470-1475) — independentment de l'ordre d'arribada `team:board-state`/`team:css-state` |
| 5 | `CSS_HOLES` cobreix exactament 16 forats element per element (D-04/D-06/D-07), mai estructura fixa | ✓ VERIFIED | Script `Object.keys(CSS_HOLES).length === 16`; totes ben formades (`validate` funció, `var` comença per `--`) |
| 6 | El panell CSS reutilitza el mateix split 50/50 establert a la Fase HTML (D-20/D-21) | ✓ VERIFIED | `.active-split { grid-template-columns: 1fr 1fr }` a `client.css` (regex confirmat), branca `css` a `renderActiveSplitScreen` reutilitza `.action-panel`/`.preview-frame` |
| 7 | El card de l'Admin mostra només estat de connexió per a css/js, sense comptador N/total (D-22) | ✓ VERIFIED | `getPublicState().progress` és `null` quan `state.phase !== 'html'` (`src/server/gameState.js:79-82`), sense canvi de codi respecte Fase 2 |
| 8 | El catàleg JS és tancat: cap text lliure esdevé codi; sense eval/Function (GAME-06/D-11) | ✓ VERIFIED | `src/shared/effects.js` — cap `eval`/`Function`; `ACTIONS`/`COMPOSITES` `Object.freeze`; lookups amb `own()`/`hasOwnProperty` guard (evita resolució a `Object.prototype`) |
| 9 | Les regles JS sobreviuen un F5/reconnexió (CORE-03) | ✓ VERIFIED | `F5-JS-RECOVERY` a `jsPhase.test.js` (verd); handler `TEAM_JS_STATE` amb reseed de `jsPanelRows` (`client.js:1493-1503`) |
| 10 | No es pot repetir la mateixa parella (event, origen); límit 5-6 files; acció composta desactiva destí (D-15/D-12/D-17) | ✓ VERIFIED (dades) | `setJsRules` rebutja (retorna `false`, cap broadcast) anti-repeat/límit/composite⇒destí-no-null — confirmat per `RULES-ANTIREPEAT-REJECT`/`RULES-LIMIT-REJECT`/`COMPOSITE-DESTI-REJECT` (verds). La representació visual `disabled` als `<select>` és human-check |
| 11 | Correcció CR-01 (revisió de codi): preview CSS no perd les peces col·locades en F5/force-resync | ✓ VERIFIED | Codi llegit directament (no només el missatge de commit): `rebuildCssPreview` extreta i cridada des de dos punts d'entrada (vegeu #4) |

**Score:** 9/11 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/robotTemplate.js` | `CSS_HOLES` (16, frozen) + JS vocab (`JS_EVENTS`/`JS_ELEMENTS`/`JS_ACTION_KEYS`/`JS_COMPOSITE_KEYS`/`JS_ROW_LIMIT`) | ✓ VERIFIED | 16 CSS_HOLES confirmats; JS_EVENTS(4)/JS_ELEMENTS(8)/JS_ACTION_KEYS(4)/JS_COMPOSITE_KEYS(3)/JS_ROW_LIMIT(6) confirmats per script |
| `src/server/gameState.js` | `team.cssValues`/`setCssValue`/`getTeamStyle`; `team.jsRules`/`setJsRules`/`getTeamRules` | ✓ VERIFIED | Totes les funcions presents, registrades a l'export, mutation-returns-bool (excepte WR-01, vegeu Anti-Patterns) |
| `src/server/events.js` | `TEAM_SET_CSS`/`TEAM_CSS_STATE`/`TEAM_SET_RULES`/`TEAM_JS_STATE` | ✓ VERIFIED | Els 4 events presents amb noms literals correctes |
| `src/client/client.js` | `renderCssPanel`/`applyCssHole`/`applyAllCssValues`; `renderJsPanel`/`rebuildJsPreview`; `wrapPreview` amb ≥16 var() | ✓ VERIFIED | 34 referències `var(--` al srcdoc (>16 requerit); totes les funcions presents i cridades |
| `src/client/client.css` | `.css-forat-group`/`.css-forat`; `.js-rules`/`.js-rule`/`.js-add`; `.active-split` 1fr 1fr | ✓ VERIFIED | Confirmat per grep i regex |
| `src/shared/effects.js` | `ACTIONS`/`COMPOSITES`/`applyAction`/`attachRule` sense eval | ✓ VERIFIED | Llegit sencer; sense eval/Function; guards `own()` presents |
| `test/cssPhase.test.js`, `test/jsPhase.test.js`, `test/effects.test.js` | round-trip + no-op | ✓ VERIFIED | Suite completa executada: 56/56 tests verds (0 fallits) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| slider/color `input` | `applyCssHole` | CSSOM `setProperty` local | ✓ WIRED | Confirmat línies 899-944 |
| slider/color `change` | `TEAM_SET_CSS` → `setCssValue` → `TEAM_CSS_STATE` | socket.emit / socketHandlers.js:275-284 | ✓ WIRED | Round-trip verd |
| reconnexió (`connection`) | `TEAM_CSS_STATE` / `TEAM_JS_STATE` dirigits | `socketHandlers.js:96-99` | ✓ WIRED | Confirmat |
| `TEAM_BOARD_STATE` (css) | `rebuildCssPreview` | `client.js:1470-1475` | ✓ WIRED | CR-01 fix confirmat |
| `renderActiveSplitScreen` (css) | `rebuildCssPreview` | `client.js:1356` | ✓ WIRED | CR-01 fix confirmat |
| desplegables JS plens | `TEAM_SET_RULES` → `setJsRules` → `TEAM_JS_STATE` | socket.emit / socketHandlers.js:298-306 | ✓ WIRED | Round-trip verd |
| `TEAM_JS_STATE` | `rebuildJsPreview` (reattach) | `client.js:1493-1505` | ✓ WIRED | Confirmat rebuild-then-reattach |
| "Veure" (botó fila) | `previewSingleRule` → `rebuildJsPreview([regla])` | `client.js:1242-1245` | ✓ WIRED | Confirmat |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| GAME-07 no-op pur (applyAction/attachRule sobre doc stub buit) | `node --test test/effects.test.js` | 3/3 verds | ✓ PASS |
| Round-trip CSS complet (7 casos) | `node --test test/cssPhase.test.js` | verd (dins de 56/56) | ✓ PASS |
| Round-trip JS complet (8 casos) | `node --test test/jsPhase.test.js` | verd (dins de 56/56) | ✓ PASS |
| Cap regressió (placement/timer/monitoring/roundtrip/adminAuth) | `node --test` (suite completa) | 56/56 verds, 0 fallits | ✓ PASS |
| `CSS_HOLES` = 16 ben formades | `node --eval` script | count=16, malformed=0 | ✓ PASS |
| `wrapPreview` ≥16 `var(--` | `node --eval` script | count=34 | ✓ PASS |
| `.active-split` = `1fr 1fr` | `node --eval` regex | true | ✓ PASS |
| CR-01 fix wired (rebuildCssPreview) | Lectura directa de codi (`client.js:1218-1223, 1356, 1470-1475`) | present a ambdós punts d'entrada | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| GAME-04 | 03-01-PLAN.md | Fase CSS foradada, sintaxi real, valors controlats | ✓ SATISFIED | `CSS_HOLES` + round-trip + CSSOM apply — vegeu Truths #1,4,5,6 |
| GAME-05 | 03-02-PLAN.md | Constructor de regles JS amb desplegables | ✓ SATISFIED | Vocabulari frozen + `effects.js` + round-trip — vegeu Truths #2,8,9,10 |
| GAME-07 | 03-01-PLAN.md, 03-02-PLAN.md | Fases CSS/JS operen sobre DOM incomplet sense trencar-se | ✓ SATISFIED | `effects.test.js` (no-op pur) + arquitectura CSSOM sense lookup — Truth #3 |

Cap requirement orfe: la comparació de `.planning/REQUIREMENTS.md` (línies 93-95, mapa Phase 3) confirma que GAME-04/GAME-05/GAME-07 són exactament els 3 IDs mapejats a la Fase 3, els mateixos declarats a `requirements:` de tots dos PLAN.md. (Nota: les checkboxes `[ ]` a REQUIREMENTS.md no estan marcades — és un artefacte de tracking pendent d'actualitzar en tancar la fase, no evidència d'incompliment; la implementació ha estat verificada directament al codi.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/server/gameState.js` | 173-193 | `setJsRules` mai compara amb `team.jsRules` existent abans de mutar (contradiu el seu propi comentari "anti-storm, mutation-returns-bool") | ⚠️ Warning | Reenviar un ruleset idèntic ja emmagatzemat dispara un broadcast `TEAM_JS_STATE` + `SESSION_FULL_STATE` innecessari (a diferència de `setCssValue`, que sí fa no-op). No trenca cap must-have d'aquesta fase (el round-trip i les validacions de vocab/anti-repeat/límit funcionen correctament); documentat també a `03-REVIEW.md` (WR-01), no resolt post-review |

Cap marcador TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER trobat als fitxers modificats d'aquesta fase (`robotTemplate.js`, `effects.js`, `gameState.js`, `events.js`, `socketHandlers.js`, `client.js`, `client.css`). El comentari "ILLUSTRATIVE PLACEHOLDERS" a `robotTemplate.js:95` pertany a codi de la Fase 2 (`IMG_LABEL_SRC`, no modificat en aquesta fase) i descriu un valor `src` fals intencionat i documentat (mai fetched), no un stub.

Els warnings WR-02/WR-03/WR-04 del `03-REVIEW.md` (cap acumulatiu de `MAX_TEAMS`, comparació no constant-time del secret admin, `claimed` absent de `getPublicState()`) pertanyen a codi de fases anteriors (`registerTeams`, autenticació admin) no tocat pels fitxers d'aquesta fase — fora d'abast per aquesta verificació.

## Human Verification Required

Vegeu `human_verification` al frontmatter (9 ítems, harvats dels blocs `<human-check>` de 03-01-PLAN.md Task 4 i 03-02-PLAN.md Task 4, més els 2 truths de comportament no exercitats). Cap d'aquests ítems és automatitzable des d'aquest worktree (requereixen `npm run dev` + `npm run server` amb navegador real); tots dos SUMMARY.md ja els documenten com a "Pending Human Verification (end-of-phase, in-classroom)".

## Gaps Summary

No hi ha gaps bloquejants. Els 11 truths derivats (3 Success Criteria del ROADMAP + 8 must-haves específics dels dos plans, deduplicats) estan tots coberts per codi present i correctament cablejat; la suite completa de test (56/56) passa sense regressions. El hallazgo Critical del `03-REVIEW.md` (CR-01, preview CSS perdent peces en F5/force-resync) ha estat verificat directament al codi com a **corregit** (commit `2f9fd70`): `rebuildCssPreview()` es crida des dels dos punts d'entrada de reconnexió, no només des d'un.

Els 2 truths que resten en ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (SC1 i SC2) no són gaps — el codi que els sustenta existeix, està cablejat i (on és possible) provat purament (effects.test.js) o via round-trip de xarxa (cssPhase/jsPhase.test.js); el que resta és la confirmació visual/sensorial ("instantani sense parpelleig", "el robot reacciona") que només un humà davant l'aplicació en marxa pot jutjar — exactament el que ambdós plans ja preveien amb els seus blocs `<human-check>` explícits.

El warning WR-01 (`setJsRules` sense no-op anti-storm) és una divergència de comportament menor respecte el patró germà `setCssValue`, documentada tant al `03-REVIEW.md` com aquí; no bloqueja cap Success Criteria d'aquesta fase i queda com a follow-up recomanat (no obligatori) per a un pla futur.

---

_Verified: 2026-07-04T06:45:39Z_
_Verifier: Claude (gsd-verifier)_
