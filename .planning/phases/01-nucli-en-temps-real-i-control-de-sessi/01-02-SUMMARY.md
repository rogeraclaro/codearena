---
phase: 01-nucli-en-temps-real-i-control-de-sessi
plan: 02
subsystem: infra
tags: [socket.io, timer, requestAnimationFrame, absolute-timestamp, phase-control]

# Dependency graph
requires:
  - phase: 01-nucli-en-temps-real-i-control-de-sessi (Pla 01)
    provides: "Servidor Socket.io autoritatiu (gameState, socketHandlers, index), events.js amb noms admin:start-phase/next-phase/timer-*, projeccio session:full-state, rooms admin/session/team:<id>"
provides:
  - "Timer autoritatiu al servidor amb timestamp absolut (phaseEndsAt): startPhase, nextPhase, pauseTimer, resumeTimer, extendTimer, checkExpiry"
  - "Handlers admin:start-phase/next-phase/timer-pause/resume/extend guardats per room admin, broadcast NOMES en canvi d'estat real"
  - "setInterval(1s) intern de bookkeeping al servidor (checkExpiry) — mai un tick per client"
  - "src/client/shared/timer.js (formatMs + renderCountdown) compartit per admin.js i client.js"
  - "Barra de control a l'admin: Display timer, CTA Iniciar Fase/Següent fase, Pausar/Reprendre, +1 minut, badge de fase"
  - "Pantalla de fase activa al client: timer sincronitzat + badge de fase (previa al layout complet del Pla 04)"
affects: [01-03, 01-04, monitoratge, pantalla-equip]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timer amb timestamp absolut (phaseEndsAt epoch ms), mai un decrement local; clients deriven remaining = phaseEndsAt - Date.now() via requestAnimationFrame"
    - "Funcions de mutacio de gameState retornen boolean (canviat/no) — els handlers i el poll d'expiry nomes broadcastegen quan hi ha hagut una mutacio real"
    - "Contador de generacio a renderCountdown() per cancel·lar bucles rAF obsolets quan un re-render complet substitueix l'element DOM"

key-files:
  created:
    - src/client/shared/timer.js
    - test/timer.test.js
  modified:
    - src/server/gameState.js
    - src/server/socketHandlers.js
    - src/server/index.js
    - src/client/admin.js
    - src/client/client.js
    - src/client/shared/tokens.css

key-decisions:
  - "Totes les funcions de timer/fase a gameState.js retornen true/false segons si han mutat l'estat; handlers i el poll d'expiry nomes fan broadcast quan es true — aixo garanteix el 'un broadcast per accio, mai un tick per segon' exigit pel Test A i evita que next-phase a la darrera fase generi un broadcast buit"
  - "renderCountdown() usa un comptador de generacio global (no WeakMap per element) per aturar bucles requestAnimationFrame obsolets — admin.js/client.js fan un re-render complet del DOM a cada session:full-state, així que l'element del timer es nou a cada broadcast i cal invalidar el bucle anterior explícitament"
  - "Durada de fase provisional fixa (5 minuts, PHASE_DURATION_MS a admin.js) — el contingut real de joc (Fase 2+) decidira si cal una durada configurable per fase"

patterns-established:
  - "Broadcast condicional basat en retorn boolean de la mutacio (evita broadcasts buits/redundants)"
  - "shared/timer.js com a unica font de veritat del compte enrere, importat per totes dues pantalles"

requirements-completed: [CORE-04, CORE-05, ADMIN-02, ADMIN-03, ADMIN-04, UX-02]

coverage:
  - id: D1
    description: "Timer autoritatiu al servidor amb timestamp absolut: iniciar fase amb compte enrere, propagat a l'instant a totes les pantalles, sense tick per segon"
    requirement: "CORE-04"
    verification:
      - kind: integration
        ref: "test/timer.test.js#Test A: iniciar fase (CORE-04, ADMIN-02) — broadcast unic, sense tick per segon"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pausa/represa i +1 minut es reflecteixen a l'instant a totes les pantalles (D-12)"
    requirement: "ADMIN-03"
    verification:
      - kind: integration
        ref: "test/timer.test.js#Test B: pausa i represa (ADMIN-03, D-12)"
        status: pass
      - kind: integration
        ref: "test/timer.test.js#Test C: +1 minut en marxa i en pausa (ADMIN-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A zero, el timer es congela sense avançar de fase automaticament (D-11)"
    requirement: "CORE-05"
    verification:
      - kind: integration
        ref: "test/timer.test.js#Test D: freeze a zero sense auto-avanç (D-11)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Les transicions de fase les força l'admin en lockstep (html→css→js), sense crear fases inexistents al final"
    requirement: "CORE-05"
    verification:
      - kind: integration
        ref: "test/timer.test.js#Test E: avanç de fase en lockstep (CORE-05)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Els handlers admin:start-phase/next-phase/timer-* estan guardats per room admin — un socket no-admin no pot mutar el timer/fase"
    requirement: "ADMIN-02"
    verification:
      - kind: integration
        ref: "test/timer.test.js#Test F: autoritzacio — socket no-admin no pot mutar timer/fase"
        status: pass
    human_judgment: false
  - id: D6
    description: "L'admin i el client renderitzen el mateix compte enrere sincronitzat (mòdul shared/timer.js), amb senyalització d'urgència per color/pols i badge de fase per color, respectant prefers-reduced-motion"
    requirement: "UX-02"
    verification:
      - kind: other
        ref: "npm run build verd; grep positiu de requestAnimationFrame a timer.js i de prefers-reduced-motion a tokens.css"
        status: pass
    human_judgment: true
    rationale: "La sincronitzacio visual del compte enrere entre dues pestanyes de navegador i l'aparença de la pols/urgencia nomes son observables executant l'app real; no cobert per test automatic en aquest pla"

# Metrics
duration: ~25min
completed: 2026-07-02
status: complete
---

# Phase 01 · Plan 02: Timer autoritatiu + control de fase de l'admin

**Timer amb timestamp absolut (phaseEndsAt) controlat pel servidor, amb pausa/represa/+1min i avanç de fase en lockstep, renderitzat de forma idèntica a admin i client via un mòdul shared/timer.js amb requestAnimationFrame**

## Performance

- **Duration:** ~25 min (inclou una desviació de depuració d'una race condition classica de test amb socket.io)
- **Completed:** 2026-07-02
- **Tasks:** 2 (Task 1 servidor RED→GREEN, Task 2 client)
- **Files modified:** 8 (2 nous, 6 modificats)

## Accomplishments
- Timer autoritatiu al servidor amb timestamp absolut: `startPhase`, `nextPhase`, `pauseTimer`, `resumeTimer`, `extendTimer`, `checkExpiry` a `gameState.js`, totes retornant si han mutat l'estat.
- `setInterval(1s)` intern al servidor (`index.js`) que sondeja `checkExpiry()` i nomes fa broadcast quan hi ha hagut un canvi real — mai un tick per segon cap als clients.
- Handlers `admin:start-phase`/`admin:next-phase`/`admin:timer-pause`/`admin:timer-resume`/`admin:timer-extend` guardats pel mateix control de room `admin` del Pla 01.
- Congelacio a zero sense auto-avanç de fase (D-11): `checkExpiry()` mai toca `state.phase`.
- Avanç de fase en lockstep (html→css→js); a la darrera fase, `next-phase` no fa res (ni broadcast) enlloc de crear una fase inexistent.
- `src/client/shared/timer.js`: `formatMs` + `renderCountdown` amb `requestAnimationFrame`, comptador de generacio per invalidar bucles obsolets, urgencia per color (`--timer-warning`/`--timer-critical`) sense canviar el text.
- Barra de control a l'admin (Display timer, CTA "Iniciar Fase"/"Següent fase", Pausar/Reprendre, +1 minut, badge de fase) i pantalla de fase activa al client amb el mateix compte enrere sincronitzat.
- `test/timer.test.js`: 6 casos A-F d'integracio real (RED→GREEN) contra el servidor amb `socket.io-client`.

## Task Commits

Cada tasca es va comprometre atomicament:

1. **Task 1: Timer autoritatiu al servidor + control de fase (lockstep, freeze)** - `1affcaa` (feat, inclou RED→GREEN del test)
2. **Task 2: Render del compte enrere sincronitzat + controls de timer/fase a l'admin** - `22d86f1` (feat)

**Plan metadata:** (pendent, aquest commit de tancament)

## Files Created/Modified
- `src/server/gameState.js` - Funcions de timer/fase amb timestamp absolut; totes retornen boolean de mutacio
- `src/server/socketHandlers.js` - 5 handlers nous `admin:start-phase/next-phase/timer-pause/resume/extend`, guardats per room admin
- `src/server/index.js` - `setInterval(1s)` intern que sondeja `checkExpiry()` i broadcasteja nomes en canvi
- `src/client/shared/timer.js` - `formatMs` + `renderCountdown` (rAF, comptador de generacio, urgencia per classe CSS)
- `src/client/admin.js` - Barra de control (timer, CTA, pausar/reprendre, +1min, badge de fase)
- `src/client/client.js` - Pantalla de fase activa (timer + badge) quan `state.phase` no es null
- `src/client/shared/tokens.css` - `.timer-display`, `.timer-warning`/`.timer-critical` (amb `@media (prefers-reduced-motion: no-preference)`), `.phase-badge[data-phase]`
- `test/timer.test.js` - 6 casos d'integracio A-F (start, pausa/represa, +1min, freeze, lockstep, autoritzacio)

## Decisions Made
- **Broadcast condicional per retorn boolean:** cada funcio de `gameState.js` (`startPhase`, `nextPhase`, `pauseTimer`, `resumeTimer`, `extendTimer`, `checkExpiry`) retorna `true` nomes si ha mutat l'estat; els handlers i el poll d'expiry nomes broadcastegen quan es `true`. Aixo evita broadcasts buits quan `next-phase` s'invoca a la darrera fase, i garanteix el "un unic broadcast per accio" exigit pel Test A.
- **Comptador de generacio a `renderCountdown()`** en lloc d'un `WeakMap` per element: com que `admin.js`/`client.js` fan un re-render complet del DOM a cada `session:full-state`, cada crida crea un element de timer nou; un comptador global simple invalida qualsevol bucle `requestAnimationFrame` anterior sense necessitat de rastrejar elements DOM despenjats.
- **Durada de fase provisional fixa** (`PHASE_DURATION_MS = 5 * 60 * 1000` a `admin.js`): el pla no especificava una durada exacta ni una UI per configurar-la; una durada fixa desbloqueja el control de fase ara, i el contingut real de joc (Fase 2+) decidira si cal fer-la configurable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Race condition classica de socket.io al test d'integracio (no al codi de producció)**
- **Found during:** Task 1, primera execucio de `npm test` (RED→GREEN)
- **Issue:** El primer redactat de `test/timer.test.js` feia `await once(socket, 'connect')` abans d'adjuntar el listener de `session:full-state`. Com que el servidor emet `session:full-state` de manera sincrona just despres de la connexio (dins del mateix handler `io.on('connection', ...)`), l'esdeveniment es perdia si el listener s'adjuntava despres de l'`await` — exactament la race condition ja documentada al comentari de `connectAndAwait()` a `test/roundtrip.test.js`. El test es va quedar penjat indefinidament esperant un esdeveniment que mai arribava.
- **Fix:** Es va substituir la seqüencia d'`await`s independents per la mateixa funcio `connectAndAwait(auth, firstEvent)` que `roundtrip.test.js` ja fa servir: adjunta els listeners de `'connect'` i del primer esdeveniment esperat en el mateix tick sincron via `Promise.all`.
- **Verification:** `npm test` verd, 13/13 casos (5 de `roundtrip.test.js` + 6 de `timer.test.js` + 2 de neteja).
- **Committed in:** `1affcaa` (part del commit de Task 1, ja que el test encara no s'havia comprometut per separat)

---

**Total deviations:** 1 auto-fixat (Rule 1 - bug al test, no al codi de producció)
**Impact on plan:** Cap impacte negatiu; el bug era exclusivament al test d'integracio nou, no al servidor. Sense aquest fix el pla no s'hauria pogut verificar.

## Issues Encountered
Durant la depuració de la race condition anterior, diverses invocacions de `node --test` es van quedar penjades i van deixar processos node orfes (fills del test runner que no es van tancar en matar el proces pare). Es van netejar manualment abans de la re-execucio final. No hi ha cap impacte en el codi ni en els tests finals.

## User Setup Required
None - no cal configuracio de serveis externs.

## Next Phase Readiness
- Control complet de sessio en viu des de l'admin (iniciar, pausar, reprendre, +1min, avançar de fase) reflectit a l'instant a totes les pantalles, sobre la base autoritativa del Pla 01.
- `session:full-state` ara inclou `phase`/`phaseEndsAt`/`timerStatus`/`remainingMsAtPause` totalment funcionals — el Pla 04 (layout complet panell/preview de l'equip) pot construir directament sobre `renderActivePhaseScreen` sense canviar el contracte de wire.
- El card de fase activa al client es nomes un placeholder minim (timer + badge); el layout panell d'accio + preview (GAME-01) queda per al Pla 04, tal com preveia l'objectiu del pla.
- La graella de monitoratge de l'admin (resync forçat, ADMIN-06) i el progres per equip (D-08) segueixen pendents per al Pla 03.

---
*Phase: 01-nucli-en-temps-real-i-control-de-sessi*
*Completed: 2026-07-02*

## Self-Check: PASSED
- Tots els fitxers referenciats (creats i modificats) existeixen al disc.
- Commits `1affcaa` (Task 1) i `22d86f1` (Task 2) verificats a `git log`.
