# Requirements — CodeArena

Microclasse gamificada d'HTML/CSS/JS per a equips en temps real.

## v1 Requirements

### Nucli temps real (CORE)

- [ ] **CORE-01**: El servidor manté l'estat autoritatiu de la partida en memòria (fase actual, timer, estat de cada equip); els clients només envien intents d'acció
- [ ] **CORE-02**: Cada equip s'identifica amb un token de sessió persistent (localStorage), mai lligat al `socket.id`
- [ ] **CORE-03**: Un equip que refresca la pàgina o reconnecta recupera exactament el seu estat (fase, blocs col·locats, valors CSS, regles JS)
- [ ] **CORE-04**: El timer global és autoritatiu al servidor (timestamp absolut de fi de fase) i es mostra sincronitzat a totes les pantalles
- [ ] **CORE-05**: Les transicions de fase les força l'admin i es propaguen immediatament a tots els equips

### Panell Admin (ADMIN)

- [ ] **ADMIN-01**: L'admin pot registrar els noms de 4-6 equips a l'inici de la sessió
- [ ] **ADMIN-02**: L'admin pot iniciar cada fase amb un compte enrere global que canvia les pantalles dels equips
- [ ] **ADMIN-03**: L'admin pot pausar i reprendre el timer
- [ ] **ADMIN-04**: L'admin pot sumar +1 minut al timer en marxa
- [ ] **ADMIN-05**: L'admin veu d'un cop d'ull l'estat, progrés i connexió de tots els equips
- [ ] **ADMIN-06**: L'admin pot forçar un resync d'un equip concret que s'hagi quedat penjat
- [ ] **ADMIN-07**: L'admin pot finalitzar la partida i mostrar els resultats a totes les pantalles

### Mecànica de joc (GAME)

- [ ] **GAME-01**: La pantalla d'equip està dividida: panell d'acció a l'esquerra, preview a la dreta
- [ ] **GAME-02**: La preview es re-renderitza en temps real a cada acció, dins un iframe aïllat (sandbox)
- [ ] **GAME-03**: Fase HTML: blocs drag & drop amb snap fort — un bloc deixat en lloc invàlid torna al calaix o encaixa a l'slot vàlid més proper
- [ ] **GAME-04**: Fase CSS: codi "foradat" amb sintaxi CSS real i valors controlats (color pickers, sliders)
- [ ] **GAME-05**: Fase JS: constructor de regles "Quan passi X → A l'element Y → Fes Z" amb desplegables
- [ ] **GAME-06**: Cap fase permet escriptura lliure de codi
- [ ] **GAME-07**: En esgotar-se el temps l'equip passa de fase tal com estigui; les fases CSS i JS operen sobre el DOM produït encara que sigui incomplet

### Puntuació i resultats (SCORE)

- [ ] **SCORE-01**: L'HTML es puntua comparant l'estructura del DOM parsejat amb la Plana Model (mai diff de text)
- [ ] **SCORE-02**: El CSS es puntua comparant valors `getComputedStyle` normalitzats (formats equivalents de color/mides puntuen igual)
- [ ] **SCORE-03**: El JS es puntua verificant semànticament la tripleta esdeveniment + element + acció
- [ ] **SCORE-04**: Cada equip rep un percentatge d'encert global i apareix en un rànquing ordenat
- [ ] **SCORE-05**: La pantalla de resultats mostra el detall de sub-checks superats per equip (per al debrief pedagògic)

### UX (UX)

- [ ] **UX-01**: Tota la interfície usa iconografia clara amb text reduït al mínim
- [ ] **UX-02**: Cada fase té una semàntica visual consistent (codificació de color HTML/CSS/JS a totes les pantalles)

### Desplegament (DEPL)

- [ ] **DEPL-01**: L'app funciona desplegada al VPS rere Nginx amb l'upgrade WebSocket configurat i verificat (no fallback silenciós a polling)
- [ ] **DEPL-02**: El procés Node el gestiona PM2 amb reinici automàtic

## v2 Requirements (deferred)

- **Exercicis parametritzables**: definir noves Planes Model i pools de blocs via fitxer JSON sense tocar codi — trigger: reutilitzar l'eina per a una segona lliçó
- **Export de resultats**: JSON/CSV per sessió — trigger: voler comparar cohorts al llarg del temps
- **Equips configurables més enllà de 4-6** — trigger: aules amb una altra distribució

## Out of Scope

- **Escriptura lliure de codi** — contradiu el requisit pedagògic central (zero errors de sintaxi, zero frustració) i dispara la complexitat del scoring
- **Editor d'exercicis configurable per l'admin** — explosió d'abast per a una microclasse d'un sol exercici; la v1 va hard-coded
- **Base de dades / persistència entre sessions** — l'estat viu en memòria durant els 15-20 min; afegir persistència implica migracions i PII de menors sense necessitat
- **Autenticació / comptes d'alumnes** — els equips s'identifiquen per nom registrat per l'admin, patró Kahoot
- **Redis / escalat multi-servidor** — 4-6 equips + 1 admin en un sol procés Node; complexitat prematura
- **Suport mòbil/tauleta** — es juga en ordinadors Windows d'aula idèntics
- **Comparació de codi per string** — diff literal produeix falsos negatius; es puntua per estructura parsejada, estil computat i comportament

## Traceability

<!-- Filled by roadmap creation. Maps REQ-IDs to phases. -->

| REQ-ID | Phase |
|--------|-------|
| CORE-01 | Phase 1 |
| CORE-02 | Phase 1 |
| CORE-03 | Phase 1 |
| CORE-04 | Phase 1 |
| CORE-05 | Phase 1 |
| ADMIN-01 | Phase 1 |
| ADMIN-02 | Phase 1 |
| ADMIN-03 | Phase 1 |
| ADMIN-04 | Phase 1 |
| ADMIN-05 | Phase 1 |
| ADMIN-06 | Phase 1 |
| GAME-01 | Phase 1 |
| GAME-02 | Phase 1 |
| UX-01 | Phase 1 |
| UX-02 | Phase 1 |
| GAME-03 | Phase 2 |
| GAME-06 | Phase 2 |
| GAME-04 | Phase 3 |
| GAME-05 | Phase 3 |
| GAME-07 | Phase 3 |
| SCORE-01 | Phase 4 |
| SCORE-02 | Phase 4 |
| SCORE-03 | Phase 4 |
| SCORE-04 | Phase 4 |
| SCORE-05 | Phase 4 |
| ADMIN-07 | Phase 4 |
| DEPL-01 | Phase 5 |
| DEPL-02 | Phase 5 |

**Coverage:** 28/28 v1 requirements mapped ✓

---
*Last updated: 2026-07-01 after roadmap creation*
