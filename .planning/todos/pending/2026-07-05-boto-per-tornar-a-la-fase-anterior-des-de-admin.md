---
created: 2026-07-05T00:00:00.000Z
title: Botó per tornar a la fase anterior des de l'Admin
area: ui
files:
  - src/client/admin.js
  - src/server/gameState.js (nextPhase/startPhase, PHASE_ORDER)
  - src/server/socketHandlers.js (ADMIN_NEXT_PHASE)
---

## Problem

El panell d'Admin només té "Següent fase" (avança html→css→js). Si l'admin
prem "Següent fase" per error (com li ha passat a l'usuari durant la UAT
manual de la Fase 03), no hi ha manera de tornar enrere sense sortir a un
terminal i cridar `admin:start-phase` manualment amb la fase anterior.

## Solution

TBD — a decidir:

- Afegir un botó "Fase anterior" simètric a "Següent fase", que faci
  `admin:start-phase` amb `PHASE_ORDER[currentIndex - 1]`.
- Decidir si retrocedir reinicia el timer de la fase anterior (temps nou) o
  intenta recuperar `remainingMsAtPause` d'abans (probablement massa complex,
  segurament n'hi ha prou amb un timer nou).
- Decidir si cal alguna confirmació ("Segur que vols tornar a la Fase X?")
  per evitar prémer-lo per error també.
- Considerar la interacció amb el botó "Finalitzar" (ja implementat a HTML/
  CSS, commit 7fd2169): tornar enrere hauria de desbloquejar els controls
  d'un equip que ja havia premut "Finalitzar" per aquella fase? O el
  `doneAt` es manté igual (és només un timestamp de referència)?
