# Walking Skeleton — CodeArena

**Phase:** 1
**Generated:** 2026-07-02

## Capability Proven End-to-End

L'admin registra 4-6 equips al panell; cada PC obre la pàgina de client, tria el seu equip de la llista, i tant l'admin (card "connectat") com el PC de l'equip (pantalla d'espera amb el nom) veuen el resultat a l'instant — servit per l'app real (Express) sobre Socket.io, amb l'estat viu al servidor i el token d'equip persistit a localStorage. En refrescar (F5) el PC recupera el seu equip sense tornar a triar.

Aquest únic recorregut exercita tota la pila: Express estàtic → connexió Socket.io (WebSocket) → middleware d'identitat → estat autoritatiu en memòria → rooms/broadcast → render de client → persistència localStorage → recuperació en reconnexió.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend runtime | Node.js 24.x LTS (dev accepta 22.17.0) | Locked a `.claude/CLAUDE.md`; recuperació + estabilitat per a eina d'aula |
| Transport temps real | Socket.io 4.8.3 (server + client) amb `connectionStateRecovery` (2 min) | Locked; recuperació de curta durada gratuïta + patró session-token per identitat llarga |
| HTTP layer | Express 4.22.2 (`express.static` + servir `dist/`) | Locked a 4.x (no 5.x); superfície REST mínima |
| Build / dev server | Vite 7.3.6 multi-page (`admin.html` + `client.html`) amb proxy `/socket.io` `ws:true` | Locked; dos entry points sense framework |
| Frontend | Vanilla JS + CSS custom properties (tokens.css), icones Lucide, font Inter (`@fontsource/inter`, no CDN) | Locked; render fi sobre esdeveniments socket |
| Estat / persistència | 100% en memòria al servidor (objecte `gameState` + `Map`s); token d'equip a localStorage del client | REQUIREMENTS: sense BD; sessions de 15-20 min |
| Identitat d'equip | Token `crypto.randomUUID()` a `sessionStore` (Map<token, teamId>), mai lligat a `socket.id` | CORE-02/D-02; CSPRNG contra robatori de token |
| Autorització admin | Sockets admin s'uneixen al room `admin` via `handshake.auth.role==='admin'`; cada handler `admin:*` verifica pertinença al room server-side | V4 Access Control; tanca l'escalada tècnica des d'un PC d'equip (residual URL = risc acceptat, Open Q1) |
| Directory layout | `src/server/*` (index, gameState, sessionStore, socketHandlers, events) + `src/client/{admin,client}.{html,js}` + `src/client/shared/{tokens.css,timer.js}` | Estructura recomanada a RESEARCH.md |

## Stack Touched in Phase 1

- [x] Project scaffold (package.json, vite.config.js multi-page, npm scripts, .gitignore)
- [x] Routing — dos entry points estàtics (`admin.html`, `client.html`) servits per Express des de `dist/`
- [x] "Database" — estat autoritatiu en memòria: escriptura real (registre d'equips, mint de token) i lectura real (`getPublicState()` broadcast)
- [x] UI — interacció real cablejada al servidor: admin registra equips + client tria equip via `socket.emit`
- [x] Run — comanda documentada de dev full-stack (`npm run dev` + `npm run server`) i build de producció (`npm run build` + `npm start`)

## Artifacts This Phase Produces (seam per a Fases 2-5)

### Socket.io — protocol d'esdeveniments (`src/server/events.js`, single source of truth)

**Client → Server (intents, mai confiats cegament):**
- `team:select` `{ teamId }` — tria d'equip; el servidor encunya token
- `admin:register-teams` `{ names: string[] }` — només admin
- `admin:start-phase` `{ phase: 'html'|'css'|'js', durationMs: number }` — només admin
- `admin:next-phase` `{ durationMs: number }` — només admin (D-11: mai automàtic)
- `admin:timer-pause` `{}` — només admin
- `admin:timer-resume` `{}` — només admin
- `admin:timer-extend` `{ ms: number }` — només admin (defecte 60000)
- `admin:force-resync` `{ teamId: string }` — només admin

**Server → Client (broadcasts autoritatius):**
- `session:full-state` `{ phase, phaseEndsAt, timerStatus, remainingMsAtPause, teams: [{ id, name, connected, progress }] }` — a cada connect/reconnect I després de cada mutació
- `team:claimed` `{ token, teamId }` — només al socket que acaba de triar
- `team:available-list` `{ teams: [{ id, name }] }` — a sockets no reclamats
- `team:reload` `{}` — dirigit al room `team:<id>`; el client fa `location.reload()`

### Estat del servidor (`src/server/gameState.js`)

`gameState` singleton: `{ phase, phaseEndsAt, timerStatus, remainingMsAtPause, teams: Map<teamId, {id,name,claimed,connected,progress}> }`.
Funcions: `registerTeams(names)`, `claimTeam(teamId)`, `setConnected(teamId, bool)`, `startPhase(phase, durationMs)`, `nextPhase(durationMs)`, `pauseTimer()`, `resumeTimer()`, `extendTimer(ms)`, `checkExpiry()`, `getPublicState()`, `getUnclaimedTeams()`.

`timerStatus` ∈ `'idle' | 'running' | 'paused' | 'frozen'`. `phase` ∈ `null | 'html' | 'css' | 'js'`. `progress` sempre `null` a la Fase 1 (espai reservat, D-08).

### Identitat (`src/server/sessionStore.js`)

`sessionStore`: `Map<token, teamId>`. `mintToken(teamId)` → `crypto.randomUUID()`. `resolve(token)` → `teamId | undefined`.

### Client (funcions clau)

- `src/client/shared/timer.js` — `renderCountdown(el, state)`, `formatMs(ms)` (compartit admin+client)
- `src/client/admin.js` — `renderAdmin(state)`, controls de registre + timer + graella + resync
- `src/client/client.js` — `bootClient()`, gestió de token localStorage, estats waiting/interstitial/active/frozen
- `src/client/shared/tokens.css` — tots els CSS custom properties del UI-SPEC (`--space-*`, `--color-*`, `--phase-html/css/js`, tipografia)

## Out of Scope (Deferred to Later Slices)

- Contingut real de joc: blocs drag & drop HTML (Fase 2), CSS foradat + regles JS (Fase 3) — la preview `iframe srcdoc` és una closca buida a la Fase 1
- Motor de puntuació i rànquing + `admin:end-game` (Fase 4)
- DOMPurify (només quan la preview rep contingut real, Fase 2+)
- Desplegament VPS/Nginx/PM2 (Fase 5)
- La mètrica concreta de `progress` al card (D-08; reservat com a `null`)
- Alliberament/esborrat manual d'equips (D-04, mai a v1)
- Autenticació d'admin amb contrasenya/secret compartit (risc residual acceptat, Open Q1)

## Subsequent Slice Plan

- **Fase 2:** els equips munten l'HTML amb blocs drag & drop (snap fort), reutilitzant `session:full-state` + la canonada de preview
- **Fase 3:** CSS foradat (pickers/sliders) + regles JS (desplegables) sobre el DOM parcial
- **Fase 4:** scoring estructural/estil/comportament + `admin:end-game` + pantalla de resultats/rànquing
- **Fase 5:** desplegament a VPS rere Nginx (upgrade WS verificat) amb PM2
