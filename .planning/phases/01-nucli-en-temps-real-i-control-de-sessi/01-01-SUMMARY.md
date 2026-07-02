---
phase: 01-nucli-en-temps-real-i-control-de-sessi
plan: 01
subsystem: infra
tags: [socket.io, express, vite, websocket, connection-state-recovery, in-memory-state]

# Dependency graph
requires: []
provides:
  - "Servidor Socket.io autoritatiu en memòria (events, gameState, sessionStore, socketHandlers, index)"
  - "Identitat per token persistit a localStorage amb recuperació en F5/reconnexió (D-02)"
  - "Bloqueig fort de tria d'equip (D-03) — l'equip triat desapareix de la llista dels altres PCs"
  - "Projecció session:full-state emesa a cada connect/reconnect i després de cada mutació"
  - "Scaffold Vite multi-pàgina (admin.html + client.html) amb tokens de disseny"
  - "Transport WebSocket-only (101 Switching Protocols, sense fallback a polling)"
affects: [01-02, 01-03, 01-04, timer, monitoratge, pantalla-equip]

# Tech tracking
tech-stack:
  added: [socket.io@4.8.3, socket.io-client@4.8.3, express@4.x, vite@7.3.6, "@fontsource/inter", lucide]
  patterns:
    - "Estat autoritatiu al servidor; clients només emeten intents"
    - "io.use() middleware: handshake.auth.token → sessionStore.resolve() → socket.data.teamId → join rooms"
    - "Projecció getPublicState() re-broadcast a cada mutació"
    - "Transport WebSocket-only a client i servidor"

key-files:
  created:
    - src/server/index.js
    - src/server/socketHandlers.js
    - src/server/gameState.js
    - src/server/sessionStore.js
    - src/server/events.js
    - src/client/admin.js
    - src/client/client.js
    - src/client/shared/tokens.css
    - test/roundtrip.test.js
    - vite.config.js
  modified:
    - package.json

key-decisions:
  - "Transport WebSocket-only (transports:['websocket']) a client+servidor — decisió del propietari durant el checkpoint, per complir el must-have CORE-01 al peu de la lletra i eliminar la fragilitat del handshake polling rere Nginx"
  - "Tokens de sessió via crypto.randomUUID() (CSPRNG), persistits a localStorage"
  - "connectionStateRecovery amb maxDisconnectionDuration 2 min com a xarxa de seguretat, complementada per session:full-state explícit"

patterns-established:
  - "Servidor autoritatiu + intents del client: cap estat de joc al client"
  - "Round-trip verificat amb socket.io-client real contra servidor a port efímer (sense mocks)"

requirements-completed: [CORE-01, CORE-02, CORE-03, ADMIN-01, UX-01]

coverage:
  - id: D1
    description: "Registre d'equips per l'admin i tria per part del client amb bloqueig fort (l'equip triat desapareix de la llista dels altres)"
    requirement: "ADMIN-01"
    verification:
      - kind: integration
        ref: "test/roundtrip.test.js#Test B: la tria d'un equip el treu de la llista disponible"
        status: pass
      - kind: manual_procedural
        ref: "Verificació manual round-trip (admin registra 4 equips, client tria, 3a pestanya no veu l'equip triat) — aprovat pel propietari 2026-07-02"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recuperació d'identitat i estat en F5/reconnexió via token sense tornar a triar (D-02)"
    requirement: "CORE-03"
    verification:
      - kind: integration
        ref: "test/roundtrip.test.js#Test D: un socket reconnectat per token recupera estat i no rep team:available-list"
        status: pass
      - kind: manual_procedural
        ref: "F5 a la pestanya d'equip torna a l'espera sense re-tria — aprovat pel propietari 2026-07-02"
        status: pass
    human_judgment: false
  - id: D3
    description: "Estat autoritatiu al servidor; clients només emeten intents (control d'accés: no-admin no pot mutar equips)"
    requirement: "CORE-01"
    verification:
      - kind: integration
        ref: "test/roundtrip.test.js#Test E: un socket no-admin no pot mutar equips"
        status: pass
    human_judgment: false
  - id: D4
    description: "Connexió Socket.io per WebSocket real (101 Switching Protocols), sense long-polling"
    requirement: "CORE-01"
    verification:
      - kind: manual_procedural
        ref: "DevTools Network WS: només socket.io transport=websocket amb 101, cap transport=polling — verificat pel propietari 2026-07-02"
        status: pass
    human_judgment: true
    rationale: "El transport real només és observable executant l'app al navegador amb DevTools; no cobert per test automàtic en aquest pla"

# Metrics
duration: ~35min
completed: 2026-07-02
status: complete
---

# Phase 01 · Plan 01: Nucli servidor autoritatiu + skeleton de clients

**Servidor Socket.io autoritatiu en memòria amb identitat per token (recuperació F5/reconnexió), bloqueig fort de tria d'equip i transport WebSocket-only, més scaffold Vite multi-pàgina admin/client**

## Performance

- **Duration:** ~35 min (inclou checkpoint humà + ajust de transport)
- **Completed:** 2026-07-02
- **Tasks:** 5 (Task 1 gate aprovat, Tasks 2-4 implementació, Task 5 verificació manual aprovada)
- **Files modified:** 15

## Accomplishments
- Servidor Socket.io autoritatiu: `events`, `gameState`, `sessionStore`, `socketHandlers`, `index` — tot l'estat de joc viu al servidor, els clients només emeten intents.
- Identitat per token (`crypto.randomUUID()`) persistit a localStorage amb recuperació completa en F5/reconnexió via `session:full-state` (D-02).
- Bloqueig fort de tria d'equip (D-03): en triar un equip, aquest desapareix de la llista disponible de la resta de PCs.
- Scaffold Vite multi-pàgina (`admin.html` + `client.html`) amb `tokens.css` de disseny.
- Test d'integració round-trip amb `socket.io-client` real contra el servidor (5 casos A-E), sense mocks.
- Transport WebSocket-only: connexió directa via `101 Switching Protocols`, sense handshake per polling.

## Task Commits

1. **Task 2: Scaffold projecte + tokens + entry points** - `1f7b2a9` (feat)
2. **Task 3: Nucli del servidor (RED → GREEN)** - `e36e869` (test RED), `4bb684b` (feat GREEN)
3. **Task 4: UI de registre (admin) i tria + espera (client)** - `525e9bc` (feat)
4. **Ajust post-checkpoint: transport WebSocket-only** - `5e89e95` (fix)

## Files Created/Modified
- `src/server/index.js` - Arrencada Express + Socket.io (WebSocket-only, connectionStateRecovery)
- `src/server/socketHandlers.js` - Middleware d'identitat per token + handlers d'intents
- `src/server/gameState.js` - Estat autoritatiu en memòria + claimTeam + getPublicState
- `src/server/sessionStore.js` - mintToken/resolve (crypto.randomUUID)
- `src/server/events.js` - Constants de noms d'esdeveniments
- `src/client/admin.js` - UI de registre d'equips + render de session:full-state
- `src/client/client.js` - Tria d'equip, persistència de token, pantalla d'espera
- `src/client/shared/tokens.css` - Tokens de disseny compartits
- `test/roundtrip.test.js` - Integració socket.io-client (5 casos)
- `vite.config.js` - Multi-pàgina + proxy WebSocket
- `package.json` - Deps fixades + scripts

## Decisions Made
- **Transport WebSocket-only** (`transports:['websocket']` a client i servidor): decisió del propietari al checkpoint de Task 5. El comportament per defecte (polling→upgrade) complia el 101 però iniciava per long-polling; forçar WebSocket compleix el must-have CORE-01 literalment i evita el punt de trencament nº1 rere Nginx (avís de RESEARCH).
- Tokens via `crypto.randomUUID()` persistits a localStorage; el client neteja el token si el servidor ja no el reconeix (reinici de procés).

## Deviations from Plan

### Auto-fixed Issues

**1. [Decisió de propietari al checkpoint] Forçar transport WebSocket-only**
- **Found during:** Task 5 (verificació manual del transport)
- **Issue:** La configuració per defecte iniciava la connexió per long-polling abans de pujar a WebSocket; el must-have CORE-01 demana establir la connexió per WebSocket «no per long-polling», i RESEARCH avisa de la fragilitat del polling rere Nginx.
- **Fix:** `transports:['websocket']` a `src/client/client.js`, `src/client/admin.js` i `src/server/index.js`.
- **Verification:** Tests 6/6 verds, build verd; DevTools confirma només `transport=websocket` (101) sense cap `transport=polling`.
- **Committed in:** `5e89e95`

---

**Total deviations:** 1 (decisió de propietari al checkpoint, no scope creep)
**Impact on plan:** Reforça el must-have CORE-01 i la robustesa de desplegament. Cap impacte negatiu.

## Issues Encountered
None - les tasques planificades es van executar sense incidències; el test de round-trip va passar de RED a GREEN a la primera.

## User Setup Required
None - no cal configuració de serveis externs. Els paquets `vite` i `lucide` es van verificar com a legítims al checkpoint de Task 1 (fals positiu del check «too-new»).

## Next Phase Readiness
- Base en temps real llesta: `session:full-state`, rooms per equip i admin, i mutacions autoritatives estableixen el contracte que la Wave 2 (timer/fases) estendrà amb `phaseEndsAt` i handlers `admin:*`.
- L'iframe de preview i la màquina d'estats de pantalla (01-04) construiran sobre la pantalla d'espera del client.

---
*Phase: 01-nucli-en-temps-real-i-control-de-sessi*
*Completed: 2026-07-02*
