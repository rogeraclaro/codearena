---
phase: 01-nucli-en-temps-real-i-control-de-sessi
plan: 03
subsystem: infra
tags: [socket.io, monitoring, force-resync, rooms, access-control]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Servidor autoritatiu, identitat per token, rooms per equip, session:full-state"
  - phase: 01-02
    provides: "Graella de monitoratge base + control bar a l'admin"
provides:
  - "Estat de connexió en viu de cada equip a la graella d'admin (connectat/desconnectat via disconnect handler)"
  - "Resync forçat dirigit (admin:force-resync → team:reload a la room team:<id> únicament)"
  - "Botó Resincronitza amb diàleg de confirmació modal (<dialog>) a cada card d'equip"
affects: [01-04, monitoratge, resync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Emit dirigit per room (io.to('team:<id>')) — mai broadcast global per accions per-equip (anti-DoS T-03-02)"
    - "Re-validació de pertinença a la room 'admin' server-side a cada handler admin:* (V4 access control)"

key-files:
  created:
    - test/monitoring.test.js
  modified:
    - src/server/socketHandlers.js
    - src/client/admin.js

key-decisions:
  - "Resync emès NOMÉS a la room team:<id> de l'equip objectiu, mai session/global (mitigació DoS per broadcast storm T-03-02)"
  - "location.reload() del client reutilitza el camí de reconnexió per token del Pla 01 — cap lògica de recuperació d'estat reimplementada"
  - "Confirmació via <dialog> modal natiu (no window.confirm) per no bloquejar l'event loop del navegador"

patterns-established:
  - "Handlers admin:* re-validen socket.rooms.has('admin') server-side; el flag de rol del client mai s'usa per autoritzar"

requirements-completed: [ADMIN-05, ADMIN-06]

coverage:
  - id: D1
    description: "L'admin veu l'estat de connexió (connectat/desconnectat) de tots els equips en viu, actualitzat en connectar/desconnectar"
    requirement: "ADMIN-05"
    verification:
      - kind: integration
        ref: "test/monitoring.test.js#estat de connexió es reflecteix en desconnectar"
        status: pass
      - kind: manual_procedural
        ref: "Card passa a desconnectat (WifiOff gris) en tancar pestanya i torna a connectat (CircleCheckBig verd) en reobrir — aprovat pel propietari 2026-07-02"
        status: pass
    human_judgment: false
  - id: D2
    description: "L'admin força un resync d'un equip penjat i NOMÉS el seu PC recarrega sencer, recuperant l'estat via token; els altres equips no es toquen"
    requirement: "ADMIN-06"
    verification:
      - kind: integration
        ref: "test/monitoring.test.js#force-resync dirigit + autorització (només equip objectiu rep team:reload)"
        status: pass
      - kind: manual_procedural
        ref: "Prova window.__probe: la variable desapareix després del resync → location.reload() confirmat; només l'equip objectiu recarrega — aprovat pel propietari 2026-07-02"
        status: pass
    human_judgment: false

# Metrics
duration: ~15min
completed: 2026-07-02
status: complete
---

# Phase 01 · Plan 03: Monitoratge de connexió en viu + resync forçat dirigit

**Graella d'admin amb estat de connexió en temps real per equip i resync forçat que recarrega només el PC de l'equip objectiu (emit dirigit per room), amb confirmació modal**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-02
- **Tasks:** 3 (Tasks 1-2 implementació, Task 3 verificació manual aprovada)
- **Files modified:** 3

## Accomplishments
- Estat de connexió en viu: el handler `disconnect` marca l'equip com a desconnectat i re-broadcast `session:full-state`; la graella d'admin ho reflecteix amb icones (CircleCheckBig verd / WifiOff gris).
- Resync forçat dirigit: `admin:force-resync {teamId}` → validació d'admin + existència del teamId → `io.to('team:<id>').emit('team:reload')` NOMÉS a l'equip objectiu.
- Botó «Resincronitza» a cada card amb diàleg de confirmació modal (`<dialog>`) segons el contracte de copywriting de l'UI-SPEC.
- El `location.reload()` del client reutilitza la reconnexió per token del Pla 01 (recuperació d'estat sense re-tria).

## Task Commits

1. **Task 1: Test RED (resync dirigit + estat de connexió)** - `cd44a87` (test)
2. **Task 1: Handler admin:force-resync (GREEN)** - `2fdd80d` (feat)
3. **Task 2: Botó Resync amb confirmació a la graella** - `afc0343` (feat)

## Files Created/Modified
- `test/monitoring.test.js` - Integració ADMIN-05 (estat de connexió) + ADMIN-06 (resync dirigit + autorització)
- `src/server/socketHandlers.js` - Handler `admin:force-resync` (emit dirigit per room) + `disconnect` (setConnected false)
- `src/client/admin.js` - Botó «Resincronitza» + diàleg de confirmació modal

## Decisions Made
- Resync emès només a la room de l'equip objectiu (mai global) per evitar broadcast storm (T-03-02).
- `<dialog>` modal en lloc de `window.confirm` per no bloquejar l'event loop.

## Deviations from Plan
None - plan executat tal com estava escrit.

## Issues Encountered
- Durant la verificació manual, el resync semblava «no recarregar» perquè el client torna a la mateixa pantalla d'espera (recuperació per token) → parpelleig imperceptible. Confirmat amb `window.__probe` (la variable desapareix després del reload): el `location.reload()` sí que s'executa. Comportament correcte, no bug.

## User Setup Required
None.

## Next Phase Readiness
- Monitoratge i recuperació de sessió complets: l'admin ja pot veure i rescatar equips penjats.
- Queda 01-04 (pantalla d'equip amb màquina d'estats + split) per completar la Fase 1.

---
*Phase: 01-nucli-en-temps-real-i-control-de-sessi*
*Completed: 2026-07-02*
