---
phase: 04-puntuaci-i-r-nquing-final
plan: 03
subsystem: ceremony
tags: [ceremony, award, confetti, reduced-motion, socketio, d14, d17, d18, d19]
status: complete
requires:
  - "EVENTS.CEREMONY_START/GAME_RESULTS + finalizeGame/buildRanking (Pla 01)"
  - "buildRankRow (client.js) + buildFinalRankRow (admin.js) — files reutilitzades a la revelació"
  - "tokens heretats (--font-size-display, --motion-snap/ease, --color-bg/text) — cap token nou"
provides:
  - "src/client/shared/ceremony.js: playCeremony({ranking,buildRow,onComplete}) + showThanks(message)"
  - "EVENTS.ADMIN_SHOW_THANKS (intent admin) + EVENTS.THANKS_SHOW (broadcast a 'session')"
  - "cerimònia D-14 sincronitzada (compte enrere 5→0 + revelació invers + confetti) a equips + Admin"
  - "pantalla final «Moltes gràcies!!» (D-19) disparada per un pas Admin explícit"
affects:
  - "cap pla posterior d'aquesta fase; tanca el refinament de presentació de la Fase 4"
tech-stack:
  added: []
  patterns:
    - "un sol broadcast → cadena setTimeout idèntica per pantalla (lockstep, no rellotges per-client)"
    - "estil de cerimònia injectat des del mòdul JS (admin.html només carrega tokens.css)"
    - "overlay efímer auto-desmuntat (cerimònia) vs. overlay persistent (thanks) — contenció de colors"
    - "pas Admin explícit repetit (finalize → ceremony, then show-thanks → thanks): mateix patró de transició manual"
key-files:
  created:
    - src/client/shared/ceremony.js
  modified:
    - src/client/client.js
    - src/client/admin.js
    - src/server/events.js
    - src/server/socketHandlers.js
    - test/results.test.js
decisions:
  - "Estils de cerimònia a ceremony.js (no client.css): admin.html només carrega tokens.css → un sol <style> compartit evita duplicar CSS i garanteix presentació idèntica"
  - "D-17: mida del compte enrere max(2×Display, 18vmin) + zoom terminal scale(10) (fly-out complet del viewport)"
  - "D-18: confetti 60 → 240 peces, delays dins de CONFETTI_TAIL_MS perquè cap peça es talli"
  - "D-19: THANKS efímer sense estat de servidor persistit (mirall de la cerimònia) — F5 post-thanks torna a resultats, acceptable per a una sessió de 15-20 min"
  - "D-19: mida de «Moltes gràcies!!» = max(1.6×Display, 12vmin), paleta NEUTRA (--color-text) — més petita que el compte enrere (2×) a propòsit: beat de tancament calmat, no la festa del countdown"
  - "D-19 finished derivat de finalRanking (mòdul) o state.finished — finalitzar no emet session:full-state"
metrics:
  duration_min: 35
  tasks: 3
  files: 6
  tests_added: 2
  completed: 2026-07-06
---

# Phase 04 Plan 03: Cerimònia d'entrega de premis (D-14) + amenaments D-17/D-18/D-19 Summary

Cerimònia D-14 compartida i sincronitzada (compte enrere 5→0 amb zoom+fade i colors chillón, hold de 3s, revelació del rànquing en ordre invers, confetti dependency-free) disparada per un sol `CEREMONY_START` a totes les pantalles (equips + Admin), més els tres amenaments post-implementació sol·licitats en viu: números el doble de grans amb zoom fly-out (D-17), molt més confetti (D-18) i una pantalla final «Moltes gràcies!!» disparada per un pas Admin explícit (D-19).

## What Was Built

### Tasks 1-2 (agent previ, commit `f6d37db`)
- **`src/client/shared/ceremony.js` (nou):** mòdul compartit `playCeremony({ ranking, buildRow, onComplete })` — overlay full-viewport a `document.body`, compte enrere 5→0 (zoom+fade, un color chillón per número), 0 estàtic 3s, sortida 800ms, revelació invers (últim→#1) amb stagger 600ms + pausa 1200ms abans del #1, `fireConfetti` dependency-free. Tota la motion dins `@media (prefers-reduced-motion: no-preference)`; sota `reduce` salta a l'estat final via `onComplete`. Colors chillón NOMÉS dins `.ceremony-overlay` (invariant de contenció); cap token nou.
- **`client.js` / `admin.js`:** `CEREMONY_START` intercepta el render i anima abans dels resultats; `GAME_RESULTS` (F5) render directe sense cerimònia. Admin reutilitza la mateixa cerimònia amb `buildFinalRankRow` (una sola font de fila → cap drift entre revelació i vista final).

### Aquesta continuació — amenaments (commits `cda1b4a`, `03ce5c2`)
- **D-17 (`cda1b4a`):** `.ceremony-count` a `max(calc(var(--font-size-display) * 2), 18vmin)` — ≥ el doble, amb terra viewport-relatiu per llegir-se des del fons de l'aula. Keyframe `ceremony-zoom` re-corbat: `scale(0.3)→1→1.6→10` amb el número visible més estona i sortint completament del viewport cap a l'espectador (no un zoom subtil).
- **D-18 (`cda1b4a`):** `fireConfetti` default 60 → 240 peces; els delays segueixen ≤ `CONFETTI_TAIL_MS` perquè cap peça es talli en retirar l'overlay.
- **D-19 (`03ce5c2`):**
  - **Servidor:** `EVENTS.ADMIN_SHOW_THANKS` (intent admin) + `EVENTS.THANKS_SHOW` (broadcast). Handler admin-only re-validat server-side (T-04-01), envoltat de `safeHandler` (T-04-05), amb guard d'ordre (`getPublicState().finished`) perquè no es pugui saltar per davant del rànquing. Difós a `io.to('session')` (equips + Admin hi són tots) → lockstep, sense estat de servidor persistit (mirall efímer de la cerimònia).
  - **`ceremony.js`:** `showThanks(message = 'Moltes gràcies!!')` — overlay `.ceremony-overlay` PERSISTENT (estat de repòs final; es retira sol només en recarregar), text `.thanks-text` a `max(1.6×Display, 12vmin)` en paleta NEUTRA (`--color-text` sobre `--color-bg`, cap chillón → contenció intacta), fade-in dins `no-preference`. Idempotent: una segona crida reemplaça l'overlay en lloc d'apilar-lo.
  - **`admin.js`:** un cop finalitzada la partida, el CTA de la barra de control esdevé el pas final explícit **«Mostrar «Moltes gràcies!!»»** que emet `ADMIN_SHOW_THANKS` (mateix patró de transició manual que finalize→cerimònia; sense confirmació, no és destructiu). `finished` es deriva de `finalRanking` (mòdul, fixat a `CEREMONY_START`) o `state.finished` (F5) perquè finalitzar no emet `session:full-state`.
  - **`client.js` + `admin.js`:** listener `THANKS_SHOW → showThanks()` a totes les pantalles.

## How to Verify

- `npm run build` → compila admin + client + ceremony sense errors.
- `node --test test/*.test.js` → **86/86 verds** (84 baseline + 2 nous de D-19; cap regressió a Fases 1-3 ni al contracte de scoring).
- Verificació visual (checkpoint humà D-14, ja aprovat amb les esmenes): arrenca l'app, finalitza a la fase JS, comprova el compte enrere gran amb zoom fly-out, el confetti dens, i el nou pas Admin «Mostrar Moltes gràcies!!» que porta totes les pantalles a la pantalla final.

## Key Decisions

- **Estils a `ceremony.js`, no `client.css`** (heretat del disseny de Tasks 1-2): `admin.html` només carrega `tokens.css`; un únic `<style id="ceremony-styles">` compartit garanteix presentació idèntica a equips i Admin sense duplicar CSS. Per això la desviació respecte a `files_modified: client.css` del PLAN (veure Deviations).
- **D-19 THANKS efímer** (sense flag nou a `gameState`): la pantalla de gràcies és purament celebrativa, igual que la cerimònia, i cap de les dues es persisteix ni es re-reprodueix a F5. Un F5 post-thanks torna a la pantalla de resultats — acceptable i consistent per a una sessió d'aula de 15-20 min; evita tocar `gameState.js` i afegir superfície d'estat.
- **Mida tipogràfica D-19** (discreció oberta a CONTEXT.md): `max(1.6×Display, 12vmin)`, deliberadament més petita que el compte enrere (`2×`/`18vmin`) — el countdown és el beat sorollós, el «Moltes gràcies!!» és el tancament calmat en paleta neutra.

## Deviations from Plan

### [Rule 3 - Design/Scope] Els fitxers reals difereixen del `files_modified` del PLAN
- **Trobat durant:** tota l'execució del pla.
- **Motiu:** el PLAN (escrit abans dels amenaments) llistava `client.js`, `admin.js`, `client.css`. La implementació (a) va posar tota la CSS de cerimònia dins un mòdul compartit `src/client/shared/ceremony.js` en lloc de `client.css` (perquè `admin.html` no carrega `client.css`, només `tokens.css`), i (b) D-19 va requerir NOUS events de servidor (`events.js` + `socketHandlers.js`) no previstos en l'abast original del pla — aquests provenen de les esmenes D-17/D-18/D-19 (CONTEXT.md §Esmenes post-implementació) afegides en viu durant l'execució, que amplien D-14.
- **Impacte:** cap regressió; `client.css` no s'ha tocat. La contenció de colors chillón i la degradació reduced-motion es mantenen dins `ceremony.js`.

### Cap altre desviament
Cap bug auto-corregit, cap funcionalitat crítica absent, cap bloqueig arquitectònic, cap auth gate nou (`ADMIN_SHOW_THANKS` reutilitza el mateix handshake/room 'admin' que la resta d'events admin).

## Known Stubs

Cap. `showThanks` i tots els listeners nous estan cablejats a events reals; cap valor hardcodejat buit ni component sense font de dades.

## Threat Surface Scan

Sense superfície nova fora del `<threat_model>` del pla. El nou event admin `ADMIN_SHOW_THANKS` re-valida pertinença a la room 'admin' server-side (mateix patró T-04-01 que `ADMIN_FINALIZE_GAME`), té guard d'ordre (`finished`) i va envoltat de `safeHandler` (T-04-05). `THANKS_SHOW` no duu payload ni dades d'equip (cap risc de divulgació, D-10 no aplica). Cap `npm install` nou (dependency-free, T-04-SC accept).

## Self-Check: PASSED
