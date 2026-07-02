---
phase: 01-nucli-en-temps-real-i-control-de-sessi
verified: 2026-07-02T13:01:28Z
status: passed
score: 15/15 requeriments verificats (2 notes menors, sense bloquejants)
behavior_unverified: 0
overrides_applied: 0
re_verification: no — verificació inicial (goal-backward) sobre l'arbre de treball main
---

# Fase 1: Nucli en temps real i control de sessió — Informe de Verificació

**Objectiu de la Fase:** L'admin pot muntar i controlar una sessió en viu, i els equips es poden connectar de manera robusta sense perdre mai l'estat
**Verificat:** 2026-07-02T13:01:28Z
**Estat:** PASS
**Mètode:** Verificació goal-backward directa contra el codi de `main` (no es confia en les afirmacions de SUMMARY.md; cada requeriment es traça a codi concret i/o un test que passa).

**Nota de procés (no bloquejant):** ROADMAP.md marca aquesta fase amb `Mode: mvp`, però el text del `Goal` no segueix el format d'User Story ("Com a ... vull ... perquè ..."; `user-story.validate` retorna `false`). No s'ha aplicat el flux de verificació MVP-mode (Success Criteria en format user-flow) perquè el contracte d'aquesta fase ja és el ROADMAP Success Criteria + REQUIREMENTS.md tradicional, i és el que s'ha verificat. Recomanació: si futures fases usen `Mode: mvp`, cal que `/gsd mvp-phase` generi el `Goal` en format User Story perquè el verificador MVP pugui aplicar-se correctament.

## Re-execució de comandes de verificació

| Comanda | Resultat |
|---|---|
| `npm test` | **19/19 verds** (`test/roundtrip.test.js` 6, `test/timer.test.js` 8 incl. Test D-bis, `test/monitoring.test.js` 5) |
| `npm run build` | **Verd** — genera `dist/admin.html` + `dist/client.html` + assets, 0 errors |
| `git status --short` | Net (working tree clean, tot committed) |

## Goal Achievement — Success Criteria del ROADMAP

| # | Criteri (ROADMAP) | Estat | Evidència |
|---|---|---|---|
| 1 | Admin registra 4-6 equips i els veu connectats al panell d'un cop d'ull | ✓ VERIFIED | `gameState.registerTeams`, `admin:register-teams` guardat per room (`socketHandlers.js:103-114`); graella `team-grid`/`team-card` a `admin.js:322-361` amb icona d'estat de connexió; `test/roundtrip.test.js` Test A |
| 2 | Admin inicia compte enrere global, pausa/reprèn, suma +1min, reflectit a l'instant a totes les pantalles | ✓ VERIFIED | `gameState.js` `startPhase/pauseTimer/resumeTimer/extendTimer`; handlers guardats `socketHandlers.js:122-177`; `test/timer.test.js` Tests A-C, D-bis |
| 3 | Equip que refresca o desconnecta recupera exactament el mateix estat (fase, timer) sense intervenció manual | ✓ VERIFIED | Identitat per token (`sessionStore.js`) + reconnexió a `socketHandlers.js:64-70`; `test/roundtrip.test.js` Test D; `test/monitoring.test.js` Test D |
| 4 | Admin força resync d'un equip penjat i veu l'estat de connexió de tots els equips en tot moment | ✓ VERIFIED | `admin:force-resync` dirigit a `team:<id>` (`socketHandlers.js:184-193`); `disconnect`→`setConnected(false)`+broadcast (`socketHandlers.js:195-203`); `test/monitoring.test.js` Tests A-D |
| 5 | Pantalla d'equip amb panell d'acció (esquerra) + preview en temps real (dreta), llenguatge visual consistent, iconografia clara, text mínim | ✓ VERIFIED | `renderActiveSplitScreen` a `client.js:142-187`; grid `40%/60%` a `client.css:36-42`; iframe `sandbox="allow-same-origin"` + `srcdoc` (closca, contingut real a Fase 2); Lucide icons; codificació de color de fase a `tokens.css`/`client.css` |

**Puntuació:** 5/5 criteris del ROADMAP verificats.

## Cobertura de Requeriments (REQUIREMENTS.md, Phase 1)

| Requeriment | Descripció | Estat | Evidència |
|---|---|---|---|
| CORE-01 | Servidor manté estat autoritatiu en memòria; clients només emeten intents | ✓ SATISFIED | `gameState.js` singleton; tots els mutadors passen per funcions server-side; `test/roundtrip.test.js` Test E (no-admin no muta) |
| CORE-02 | Equip identificat per token persistent (localStorage), mai lligat a `socket.id` | ✓ SATISFIED | `sessionStore.js` `Map<token,teamId>` via `crypto.randomUUID()`; `socket.id` no s'usa mai com a identitat (grep confirmat) |
| CORE-03 | Refresc/reconnexió recupera exactament el seu estat (fase, blocs, CSS, JS) | ✓ SATISFIED *(abast Fase 1: fase+timer; blocs/CSS/JS encara no existeixen — Fases 2-3)* | `test/roundtrip.test.js` Test D; `test/monitoring.test.js` Test D; recuperació sense flicker a `client.js:204-243` (interstici saltat en reconnexió a la mateixa fase) |
| CORE-04 | Timer global autoritatiu (timestamp absolut), sincronitzat a totes les pantalles | ✓ SATISFIED | `phaseEndsAt` absolut a `gameState.js`; `shared/timer.js` deriva `remaining` via `requestAnimationFrame`, mai decrement local; `test/timer.test.js` Test A |
| CORE-05 | Transicions de fase forçades per l'admin, propagades immediatament | ✓ SATISFIED | `nextPhase` lockstep html→css→js; guard admin a tots els handlers; `test/timer.test.js` Test E, F |
| ADMIN-01 | Admin registra noms de 4-6 equips a l'inici | ✓ SATISFIED *(nota menor)* | `buildRegistrationBlock` (`admin.js:272-303`) + `isValidTeamNamesPayload` (`socketHandlers.js:27-36`). **Nota:** la validació server-side només imposa `1 ≤ n ≤ 6`, no un mínim de 4 (la UI ho suggereix via label/placeholder però no ho bloqueja). No hi ha cap must-have ni acceptance criteria del pla que exigeixi el mínim dur; no es considera un gap bloquejant. |
| ADMIN-02 | Admin inicia cada fase amb compte enrere global que canvia les pantalles | ✓ SATISFIED | `admin:start-phase`/`admin:next-phase`; `renderScreenForState` a `client.js` deriva waiting→interstitial→active-split |
| ADMIN-03 | Admin pot pausar i reprendre el timer | ✓ SATISFIED | `admin:timer-pause`/`admin:timer-resume`; `test/timer.test.js` Test B |
| ADMIN-04 | Admin pot sumar +1 minut al timer en marxa | ✓ SATISFIED *(millorat)* | `admin:timer-extend`; `test/timer.test.js` Test C i Test D-bis (extensió també reviu una fase `frozen`, millora sol·licitada pel propietari) |
| ADMIN-05 | Admin veu d'un cop d'ull estat, progrés i connexió de tots els equips | ✓ SATISFIED *(progrés = placeholder reservat, D-08, correcte per a l'abast de Fase 1)* | Icona `CircleCheckBig`/`WifiOff` derivada de `team.connected` a cada `session:full-state`; `test/monitoring.test.js` Test A. El camp `progress` existeix a l'estat i a la card (`team-card-progress`) però és sempre `null` fins que hi hagi mecànica de joc (Fase 2+) — coherent amb l'abast d'aquesta fase. |
| ADMIN-06 | Admin pot forçar un resync d'un equip concret penjat | ✓ SATISFIED | `admin:force-resync` dirigit NOMÉS a `team:<id>` (mai broadcast); confirmació `<dialog>` a `admin.js:168-207`; `test/monitoring.test.js` Test B, C |
| GAME-01 | Pantalla d'equip dividida: panell esquerra, preview dreta | ✓ SATISFIED | `active-split` grid `minmax(280px,40%) 1fr` (`client.css:36-42`) |
| GAME-02 | Preview re-renderitzada en temps real dins iframe aïllat (sandbox) | ✓ SATISFIED *(closca a Fase 1; el "re-render per acció" s'exercirà a Fase 2 amb contingut real, per disseny — key_link explícit del pla)* | `<iframe sandbox="allow-same-origin" srcdoc="">` a `client.js:166-170`; grep positiu `sandbox`+`srcdoc` |
| UX-01 | Iconografia clara, text reduït al mínim | ✓ SATISFIED | Lucide (`CircleCheckBig`, `WifiOff`, `RefreshCw`, `Lock`); còpies curtes segons UI-SPEC; overlay congelat sense text |
| UX-02 | Semàntica visual consistent (color HTML/CSS/JS) a totes les pantalles | ✓ SATISFIED | `--phase-html/css/js` a `tokens.css`, aplicats a `.phase-badge[data-phase]` (admin+client) i `.interstitial-screen[data-phase]` (client) |

**Cobertura:** 15/15 requeriments de la Fase 1 amb evidència de codi i/o test. Cap requeriment orfe (tots els de la taula de traçabilitat de REQUIREMENTS.md per a Phase 1 apareixen als 4 plans).

## Verificació d'Artefactes (3 nivells: existeix / substantiu / wired)

| Artefacte | Existeix | Substantiu | Wired | Estat |
|---|---|---|---|---|
| `src/server/events.js` | ✓ | ✓ (constants congelades, usades arreu) | ✓ | ✓ VERIFIED |
| `src/server/sessionStore.js` | ✓ | ✓ (`crypto.randomUUID`, no `Math.random`) | ✓ (importat a `socketHandlers.js`) | ✓ VERIFIED |
| `src/server/gameState.js` | ✓ | ✓ (10 funcions, totes amb lògica real) | ✓ (importat i cridat a `socketHandlers.js`/`index.js`) | ✓ VERIFIED |
| `src/server/socketHandlers.js` | ✓ | ✓ (9 handlers + middleware + guards) | ✓ (registrat a `index.js`) | ✓ VERIFIED |
| `src/server/index.js` | ✓ | ✓ (Express+Socket.io+setInterval expiry) | ✓ (arrencat per tests i `npm run server`) | ✓ VERIFIED |
| `src/client/admin.js` | ✓ | ✓ (registre, control bar, graella, resync) | ✓ (entry point Vite `admin.html`) | ✓ VERIFIED |
| `src/client/client.js` | ✓ | ✓ (màquina d'estats 4 estats) | ✓ (entry point Vite `client.html`) | ✓ VERIFIED |
| `src/client/shared/timer.js` | ✓ | ✓ (`formatMs`+`renderCountdown`, rAF, drift-correcting) | ✓ (importat per admin.js i client.js) | ✓ VERIFIED |
| `src/client/shared/tokens.css` | ✓ | ✓ (tots els tokens del UI-SPEC) | ✓ (importat a admin.html/client.html) | ✓ VERIFIED |
| `src/client/client.css` | ✓ | ✓ (estats interstici/split/frozen) | ✓ (importat a client.html) | ✓ VERIFIED |
| `test/roundtrip.test.js` | ✓ | ✓ (6 tests, servidor real, sense mocks) | ✓ (`npm test` l'executa) | ✓ VERIFIED |
| `test/timer.test.js` | ✓ | ✓ (8 tests incl. D-bis) | ✓ | ✓ VERIFIED |
| `test/monitoring.test.js` | ✓ | ✓ (5 tests) | ✓ | ✓ VERIFIED |

## Verificació de Key Links

| Des de | Cap a | Via | Estat |
|---|---|---|---|
| `io.use()` middleware | `sessionStore.resolve()` → `socket.data.teamId` → join rooms | `socketHandlers.js:39-56` | ✓ WIRED |
| `team:select` | `gameState.claimTeam()` + `sessionStore.mintToken()` → `team:claimed` → `localStorage.setItem` | `socketHandlers.js:82-100` + `client.js:262-265` | ✓ WIRED |
| `session:full-state` | Emès a cada connect/reconnect I després de cada mutació | Confirmat a tots els handlers (`io.to('session').emit(...)` només quan la mutació retorna `true`) | ✓ WIRED |
| `phaseEndsAt` absolut | Client deriva `remaining = phaseEndsAt - Date.now()` | `shared/timer.js:37-46`, mai un decrement local | ✓ WIRED |
| `setInterval(1s)` server | `checkExpiry()` → broadcast només en canvi | `index.js:30-34` | ✓ WIRED |
| `admin:force-resync` | `io.to('team:<id>').emit('team:reload')` → `location.reload()` → reconnexió per token | `socketHandlers.js:184-193` + `client.js:275-277` | ✓ WIRED |

## Anti-Patterns / Higiene de codi

| Comprovació | Resultat |
|---|---|
| `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` a `src/server/*.js`, `src/client/**/*.js` | Cap trobat |
| `innerHTML` a `src/client/*.js` | Cap trobat (0) — inserció de noms sempre via `textContent`/`createElement` |
| `Math.random()` a `sessionStore.js` | 0 (usa `crypto.randomUUID()`) |
| Literals de color hex fora de `tokens.css` (`admin.js`, `client.js`, `client.css`) | Cap trobat |
| `socket.id` usat com a identitat d'equip | Cap ús (només `sessionStore` token) |
| Transport WebSocket-only (`transports:['websocket']`) | Confirmat a `index.js`, `admin.js`, `client.js` |

## Ítems verificats per checkpoint humà (no re-verificats interactivament aquí, ja documentats i aprovats)

Aquests ítems requereixen navegador real i ja van ser aprovats explícitament pel propietari durant l'execució (documentat a cada SUMMARY.md amb `human_judgment: true` i confirmat pel context de l'orquestrador — "19/19 passing... WebSocket-only transport confirmed via DevTools; force-resync reload confirmed via window.__probe; the 4 team-screen states verified visually; +1 minut now revives a frozen phase"):

1. **Transport WebSocket real (101 Switching Protocols, sense polling)** — aprovat 2026-07-02 (01-01-SUMMARY.md D4).
2. **Bloqueig fort de tria d'equip + F5 sense re-tria** — aprovat 2026-07-02 (01-01-SUMMARY.md D1/D2).
3. **Graella de monitoratge en viu + resync dirigit (window.__probe)** — aprovat 2026-07-02 (01-03-SUMMARY.md D1/D2).
4. **Els 4 estats visuals de la pantalla d'equip (espera/interstici/split/congelat) + coherència amb UI-SPEC** — aprovat 2026-07-02 (01-04-SUMMARY.md D1/D2/D3).
5. **+1 minut reviu una fase congelada** — millora sol·licitada i verificada pel propietari, ara també coberta per test automàtic (Test D-bis).

Cap d'aquests ítems queda pendent de verificació humana; per tant no es genera una secció de `human_verification` nova.

## Observacions (no bloquejants)

1. **ADMIN-01 — mínim de 4 equips no forçat server-side**: la validació accepta d'1 a 6 noms; la UI etiqueta "4-6" però no bloqueja registrar-ne menys de 4. Cap acceptance criteria del pla ho exigia explícitament; es documenta com a observació per a un possible refinament futur, no com a gap.
2. **ADMIN-05 — camp "progrés" sempre `null`**: correcte per a l'abast de la Fase 1 (D-08, no hi ha mecànica de joc encara); l'espai queda reservat a la UI perquè la Fase 2 el pugui omplir sense re-flow.
3. **Mode `mvp` al ROADMAP sense `Goal` en format User Story**: nota de procés, no afecta el codi ni els requeriments verificats aquí.

## Resum

**Cap gap bloquejant.** Els 5 criteris d'èxit del ROADMAP i els 15 requeriments (`CORE-01..05`, `ADMIN-01..06`, `GAME-01..02`, `UX-01..02`) tenen evidència concreta de codi i/o test que passa, sense dependre de les afirmacions de SUMMARY.md — s'ha llegit i inspeccionat directament `gameState.js`, `socketHandlers.js`, `sessionStore.js`, `index.js`, `admin.js`, `client.js`, `timer.js`, `client.css`, `tokens.css` i els 3 fitxers de test (19 casos, tots contra un servidor Socket.io real, sense mocks). `npm test` (19/19) i `npm run build` s'han re-executat de forma independent i són verds. L'arbre de treball és net.

---

_Verificat: 2026-07-02T13:01:28Z_
_Verificador: Claude (gsd-verifier)_
