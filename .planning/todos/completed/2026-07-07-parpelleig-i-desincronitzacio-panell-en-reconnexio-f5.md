---
created: 2026-07-07T00:00:00.000Z
title: Parpelleig de pantalla i desincronització del panell després d'un F5 (reconnexió)
area: realtime
files:
  - src/server/socketHandlers.js
  - src/client/client.js
---

## Problem

Descobert durant la verificació manual de la Fase 05 (desplegament real contra
`classe.masellas.info`, amb latència de xarxa real — els tests automàtics locals
no ho havien detectat). Reproduït amb 2 equips en navegadors diferents al mateix
ordinador:

1. **Parpelleig creuat**: quan un equip fa F5 (reconnexió), la pantalla de
   **l'altre** equip també parpelleja, tot i que el seu estat no ha canviat.
2. **Valor "perdut" després del reload**: a l'equip que ha fet F5, l'última
   modificació (p.ex. un valor CSS) sembla no recuperar-se bé — quan es torna a
   manipular el mateix control, el resultat reverteix al valor anterior en
   comptes de partir del valor recuperat.

## Root Cause (hipòtesi, no verificada amb debugging pas a pas)

- `socketHandlers.js` difon `session:full-state` a **tota** la room `'session'`
  (equips + admin) en cada desconnexió (línia ~431) i reconnexió (línia ~111)
  d'un equip individual — no només a qui reconnecta.
- `client.js` (línia ~1785) reacciona a `session:full-state` amb
  `renderScreenForState()`, que **re-renderitza tota la pantalla** de qualsevol
  client que el rebi — incloent equips als quals l'esdeveniment no els afecta.
  Això explica el parpelleig creuat.
- En la seqüència de reconnexió del propi equip, `session:full-state` s'emet
  ABANS que els canals privats (`team:css-state`, `team:js-state`, etc.,
  línies ~90-102 de `socketHandlers.js`). El re-render general disparat pel
  primer sembla deixar el panell en un estat que no absorbeix bé el valor
  autoritatiu que arriba tot seguit pels canals privats — probablement una
  condició de carrera/ordre entre els dos re-renders, no una pèrdua de dades
  al servidor (el valor probablement sí que hi és guardat correctament).

## Solution

TBD — a investigar amb una sessió de debugging dedicada (`/gsd-debug`), no en
calent durant un checkpoint de producció:

- Opció A: deixar de difondre `session:full-state` complet a tota la sessió en
  cada connect/disconnect individual; substituir per un event lleuger només
  amb el delta de connexió (p.ex. `team:connection-changed {teamId, connected}`)
  que l'admin pugui usar per al seu indicador ADMIN-05 sense forçar un
  re-render complet a cada equip.
- Opció B: si `session:full-state` s'ha de mantenir global, fer que
  `renderScreenForState()` sigui idempotent/no destructiu quan l'estat rellevant
  per a aquell equip no ha canviat (evitar recrear DOM innecessàriament).
- Cal determinar si el "valor perdut" és només un problema de renderitzat
  (el servidor té el valor bo) o si hi ha algun cas on la mutació en curs es
  perd de veritat abans d'arribar al servidor (p.ex. reload abans que
  l'`emit` surti) — aquest segon cas seria un límit conegut, no un bug.

## Impact

No bloqueja el desplegament de la Fase 05 (WebSocket real, PM2, HTTPS i
`ADMIN_SECRET` verificats correctament). És un problema de la lògica de joc
de fases anteriors, ara visible per primer cop amb latència de xarxa real.
