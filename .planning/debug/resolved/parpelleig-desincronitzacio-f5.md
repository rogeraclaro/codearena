---
status: resolved
trigger: "Parpelleig de pantalla i desincronitzacio del panell despres d'un F5 (reconnexio) — .planning/todos/pending/2026-07-07-parpelleig-i-desincronitzacio-panell-en-reconnexio-f5.md"
created: 2026-07-07
updated: 2026-07-08
---

# Debug Session: parpelleig-desincronitzacio-f5

## Symptoms

**Expected behavior:** Quan un equip fa F5 (reconnexió), només la seva pròpia pantalla s'hauria de re-renderitzar per recuperar l'estat; els altres equips i l'admin no haurien de veure cap canvi visual. L'equip que ha fet F5 hauria de recuperar exactament l'últim valor que tenia (p.ex. un valor CSS en curs) sense que revertís en tornar-lo a manipular.

**Actual behavior (2 símptomes):**
1. Parpelleig creuat: quan un equip fa F5, la pantalla de **l'altre** equip (i possiblement l'admin) també parpelleja / es re-renderitza sencera, encara que el seu propi estat no hagi canviat.
2. Valor "perdut" després del reload: a l'equip que ha fet F5, l'última modificació (p.ex. un valor CSS) sembla no recuperar-se bé — quan es torna a manipular el mateix control, el resultat reverteix al valor anterior en comptes de partir del valor recuperat.

**Error messages:** Cap error de consola conegut — és un problema de renderitzat/UX, no un crash.

**Timeline:** Descobert 2026-07-07 durant la verificació manual de la Fase 05 (desplegament real contra `classe.masellas.info`, amb latència de xarxa real). Els tests automàtics locals no ho havien detectat. No introduït per la Fase 5 — és un bug de lògica de joc preexistent de fases anteriors, ara visible per primer cop amb latència real.

**Reproduction:** DATA_START
Confirmat per l'usuari: reproduïble sempre, no és un fet puntual. Passos coneguts (documentats al todo):
1. Obrir 2 equips en navegadors diferents al mateix ordinador (o dispositius diferents) connectats a la mateixa sessió.
2. Un dels equips fa F5 (reconnexió).
3. Observar: la pantalla de l'ALTRE equip (que no ha fet F5) també parpelleja/re-renderitza.
4. A l'equip que ha fet F5: manipular de nou el mateix control (p.ex. valor CSS) que s'estava editant abans del F5 — el resultat reverteix a un valor anterior en lloc de partir del valor recuperat.
DATA_END

## Hypothesis prèvia (no verificada pas a pas — punt de partida per al debugger)

DATA_START
- `socketHandlers.js` difon `EVENTS.SESSION_FULL_STATE` ('session:full-state') a TOTA la room `'session'` (equips + admin) en cada desconnexió individual (línia ~431: `io.to('session').emit(EVENTS.SESSION_FULL_STATE, ...)`) i en cada reconnexió individual (línia ~111: `socket.to('session').emit(EVENTS.SESSION_FULL_STATE, ...)`) — no només al client afectat.
- `client.js` (handler `socket.on('session:full-state', ...)` al voltant de la línia 1765) reacciona amb `renderScreenForState()` (o funció equivalent), que re-renderitza TOTA la pantalla de qualsevol client que el rebi — incloent equips als quals l'esdeveniment no els afecta. Això explicaria el parpelleig creuat.
- En la seqüència de reconnexió del propi equip, `session:full-state` s'emet ABANS que els canals privats (`team:css-state`, `team:js-state`, etc., línies ~90-102 de `socketHandlers.js`). El re-render general disparat pel primer sembla deixar el panell en un estat que no absorbeix bé el valor autoritatiu que arriba tot seguit pels canals privats — probablement una condició de carrera/ordre entre els dos re-renders, no una pèrdua de dades al servidor (el valor probablement sí que hi és guardat correctament).
- Cal determinar si el "valor perdut" és només un problema de renderitzat (el servidor té el valor bo) o si hi ha algun cas on la mutació en curs es perd de veritat abans d'arribar al servidor (p.ex. reload abans que l'`emit` surti) — aquest segon cas seria un límit conegut, no un bug.
DATA_END

**Fitxers relacionats (dels quals l'equip actual sospita):**
- `src/server/socketHandlers.js` (emissions de `SESSION_FULL_STATE` a la room `'session'` — múltiples punts: ~84, ~90, ~111, ~139, ~153, ~172, ~184, ~214, ~244, ~254, ~265, ~336, ~356, ~378, ~400, ~431)
- `src/client/client.js` (handler `session:full-state` ~1765, i les funcions de renderitzat que crida)

## Current Focus

hypothesis: El `disconnect` DIFERIT del socket vell (F5 obre un socket NOU amb token; el vell no dispara `disconnect` fins ~ping-timeout després, no a l'instant) executa `setConnected(teamId,false)` + `io.to('session').emit(SESSION_FULL_STATE)` (línia 431) TOT I que l'equip ja s'ha reconnectat. Aquest broadcast sobrant re-renderitza els equips espectadors (parpelleig) i, a l'equip que ha fet F5, dispara `renderActiveSplitScreen` que reconstrueix el panell CSS des de `latestCssValues`; amb latència real, si l'usuari està re-manipulant un control, `latestCssValues` encara té el valor PREVI (l'echo del canvi nou no ha tornat) → el control reverteix. La reconnexió (línia 111, `socket.to('session')`) també difon a tots els espectadors → parpelleig quan un equip torna.
test: Lectura estàtica del flux server (socketHandlers.js) + client (client.js). Confirmat: (a) fases css/js NO tenen camí surgical — tot SESSION_FULL_STATE de mateixa fase fa teardown+rebuild complet (renderActiveSplitScreen: destroySortables+clearApp); només html té surgicalUpdate (línia 1735). (b) el control CSS només viu al DOM; un rebuild el reseteja a latestCssValues. (c) connectionStateRecovery ON (2min) confirma que el socket vell es manté i el seu disconnect és diferit.
expecting: Enrutar els broadcasts de cicle-de-vida (disconnect 431, reconnect 111) NOMÉS a 'admin' + guardar el disconnect amb comprovació de mida de room (no marcar offline ni difondre si l'equip encara té un socket viu) elimina els dos símptomes sense afectar l'admin (que sí necessita l'estat de connexió).
next_action: verificació humana end-to-end (2 navegadors, endpoint desplegat amb latència real) — confirmar que el parpelleig creuat i el revert del control CSS post-F5 han desaparegut; després arxivar la sessió
reasoning_checkpoint:
  hypothesis: "El disconnect diferit del socket vell (post-F5) fa setConnected(false)+broadcast SESSION_FULL_STATE a tota la room 'session' tot i que l'equip ja s'ha reconnectat; a css/js el client no té camí surgical, així que qualsevol full-state reconstrueix el panell des de latestCssValues (stale amb latència) → parpelleig als espectadors i revert del control a l'equip reconnectat."
  confirming_evidence:
    - "socketHandlers.js:431 disconnect → io.to('session').emit(SESSION_FULL_STATE) (tots els equips + admin)"
    - "socketHandlers.js:111 reconnect → socket.to('session').emit(SESSION_FULL_STATE) (tots els espectadors)"
    - "client.js:1735 només html té surgicalUpdate; css/js cauen a renderActiveSplitScreen (destroySortables+clearApp+rebuild) a cada full-state de mateixa fase"
    - "client.js:1532 renderCssPanel(latestCssValues) — el rebuild reseteja els controls al darrer valor ASSENTAT; un input a mig round-trip (change emès, echo TEAM_CSS_STATE encara no rebut) es perd"
    - "index.js:18 connectionStateRecovery ON (maxDisconnectionDuration 2min) → el socket vell persisteix i el seu disconnect és diferit fins ping-timeout, coincidint amb la re-manipulació post-F5"
    - "El bug només apareix amb latència real (endpoint desplegat) — coherent amb una finestra de cursa entre l'echo del canvi de l'usuari i el broadcast diferit del disconnect"
  falsification_test: "Si després d'enrutar 111/431 a 'admin' + guard de room-size, un equip espectador ENCARA parpelleja quan un altre fa F5, o l'equip reconnectat encara reverteix un control re-manipulat amb latència, la hipòtesi és incompleta (hi hauria una segona font de full-state de cicle-de-vida)."
  fix_rationale: "Els equips espectadors mai necessiten l'estat de connexió d'un ALTRE equip (el render del client només pinta el propi equip + fase/timer); només l'admin ho necessita. Enrutar els broadcasts de connect/disconnect a 'admin' elimina els re-renders sobrants a tots els equips. El guard de room-size fa que el disconnect diferit del socket vell sigui un no-op quan ja hi ha un socket viu (arrel exacta del revert post-F5). Els broadcasts legítims de fase/timer segueixen anant a 'session' — els equips SÍ els necessiten."
  blind_spots: "Les accions d'admin (start/pause/resume/extend fase) segueixen difonent SESSION_FULL_STATE a 'session' i, com que css/js no tenen camí surgical, podrien causar un parpelleig menor durant aquestes accions. NO és el que reprodueix el bug (F5-driven) i és poc freqüent/intencionat. Ho deixo documentat com a concern residual separat (requeriria un camí surgical css/js al client, canvi més gran). El guard de room-size assumeix que el socket que es desconnecta ja ha sortit de la seva room quan es dispara 'disconnect' (semàntica Socket.io confirmada: rooms buidades a 'disconnect', poblades a 'disconnecting')."
tdd_checkpoint: null

## Evidence

- timestamp: 2026-07-07
  checked: src/server/socketHandlers.js (connection/disconnect lifecycle, línies 79-117, 426-434)
  found: "En reconnexió per token: línia 90 `socket.emit(SESSION_FULL_STATE)` (a si mateix) + línies 93-102 canals privats (board/css/js/done a si mateix) + línia 111 `socket.to('session').emit(SESSION_FULL_STATE)` (a TOTS els altres). En disconnect: línia 431 `io.to('session').emit(SESSION_FULL_STATE)` (a TOTS, admin+equips)."
  implication: "Cada connect/disconnect d'un equip difon full-state a TOTA la room 'session', incloent equips espectadors que no tenen cap canvi propi. Els espectadors només necessitarien fase/timer, no l'estat de connexió d'un altre equip."

- timestamp: 2026-07-07
  checked: src/server/index.js:15-22 (config Socket.io)
  found: "connectionStateRecovery ON amb maxDisconnectionDuration 2min. F5 obre un socket NOU amb el token de localStorage (context JS fresc → no és una recovery real); el socket VELL es manté i el seu `disconnect` és diferit fins al ping-timeout."
  implication: "Després d'un F5, hi ha una finestra (segons) on el socket vell encara viu; quan finalment dispara disconnect, l'equip JA s'ha reconnectat → setConnected(false) sobrant + broadcast sobrant, coincidint amb la re-manipulació de l'usuari."

- timestamp: 2026-07-07
  checked: src/client/client.js — handler session:full-state (1765), renderScreenForState (1689-1741), renderActiveSplitScreen (1498-1575), renderForatRow (1004-1071), renderCssPanel (1076), syncCssPanelInputs (1115)
  found: "renderScreenForState: només la fase 'html' amb boardMounted té camí surgical (línia 1735 → surgicalUpdate, no toca el tauler). Les fases css i js cauen SEMPRE a renderActiveSplitScreen, que fa destroySortables()+clearApp() i reconstrueix el panell sencer des de latestCssValues (css) / latestJsRules (js). El control CSS (range/color) NO té estat JS propi: el seu valor viu només al DOM (input.value/readout); un rebuild el reseteja al darrer valor ASSENTAT (latestCssValues)."
  implication: "Qualsevol SESSION_FULL_STATE de la MATEIXA fase css/js reconstrueix tot el panell → (a) parpelleig visible a l'espectador; (b) si l'usuari té un canvi a mig round-trip (change emès però echo TEAM_CSS_STATE encara no rebut per latència), el rebuild el clobbera amb el valor previ → 'revert'. Explica per què només es veu amb latència real."

- timestamp: 2026-07-07
  checked: test/monitoring.test.js (Test A disconnect, Test D reconnect) i test/roundtrip.test.js (reconnect)
  found: "Totes les assercions de cicle-de-vida es fan sobre el socket ADMIN (rep full-state en disconnect/claim) o sobre el propi socket que es reconnecta (rep el seu full-state via línia 90, self-emit). CAP test assereix que un equip ESPECTADOR rebi full-state per la (des)connexió d'un altre equip."
  implication: "Enrutar els broadcasts de línia 111 i 431 de 'session' → 'admin' NO trenca cap test: l'admin (dins la room 'admin') segueix rebent-los, i el self-emit de reconnexió (línia 90) queda intacte."

## Eliminated

- hypothesis: "El servidor perd el valor CSS en el F5 (pèrdua de dades real al gameState)"
  evidence: "El disconnect handler (431) i el connect handler no muten mai els valors CSS/board/rules; setCssValue només s'invoca via TEAM_SET_CSS. El valor es conserva correctament al servidor i s'emet via TEAM_CSS_STATE en reconnectar (línia 96). El 'revert' és de renderitzat (rebuild amb latestCssValues stale), no de dades."
  timestamp: 2026-07-07

## Resolution

root_cause: "Els broadcasts de SESSION_FULL_STATE lligats al cicle de vida de la connexió (disconnect socketHandlers.js:431 i reconnect :111) es difonen a TOTA la room 'session' (equips espectadors inclosos), i el client no té camí de render surgical per a les fases css/js (només html) — així que cada full-state de la mateixa fase fa un teardown+rebuild complet del panell. A més, amb connectionStateRecovery ON, el `disconnect` del socket vell post-F5 és DIFERIT i s'executa quan l'equip ja s'ha reconnectat, disparant un setConnected(false)+broadcast sobrant. Resultat: (1) parpelleig creuat als espectadors a cada F5; (2) el rebuild reconstrueix el panell CSS des de latestCssValues, que amb latència real encara conté el valor previ mentre l'echo del canvi de l'usuari viatja → el control reverteix."
fix: "src/server/socketHandlers.js — (1) disconnect handler: guard de room-size (si l'equip encara té un socket viu a `team:<id>`, no marcar offline ni difondre: el disconnect del socket vell post-F5 esdevé no-op) i, quan realment es desconnecta, difondre a 'admin' en lloc de 'session'. (2) reconnexió línia 111: difondre a 'admin' en lloc de 'session'. Els equips espectadors ja no reben mai l'estat de connexió d'un altre equip; l'admin (que sí el necessita) el segueix rebent. Els broadcasts de fase/timer resten intactes a 'session'."
verification: "Auto-verificat: suite completa 99/99 OK (95 previs intactes + 4 nous de regressió a test/reconnectSync.test.js). Els nous tests bloquegen: (a) un equip espectador NO rep session:full-state quan un altre es desconnecta (mentre l'admin SÍ), (b) el disconnect d'un socket vell amb un socket viu present NO marca l'equip offline (guard de solapament post-F5). Verificació humana end-to-end (2026-07-08): fix desplegat a classe.masellas.info (VPS, deploy.sh + pm2 reload); usuari ha provat amb 2 navegadors reals contra latència real i confirma que el parpelleig creuat i el revert del control CSS han desaparegut."
files_changed: ["src/server/socketHandlers.js", "test/reconnectSync.test.js"]
