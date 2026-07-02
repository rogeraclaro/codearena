# Roadmap: CodeArena — Microclasse gamificada d'HTML/CSS/JS

## Overview

CodeArena porta l'aula d'una pissarra en blanc a una partida en viu completa. Primer s'aixeca el nucli en temps real que permet a l'admin muntar una sessió i als equips connectar-s'hi sense por a perdre l'estat (Fase 1). Després es construeix, un darrere l'altre, cadascun dels tres reptes pedagògics que comparteixen la mateixa preview en viu: muntar l'HTML amb blocs drag & drop (Fase 2), i després vestir-lo de CSS i donar-li comportament amb regles JS (Fase 3), sempre operant sobre el DOM que l'equip hagi produït fins aleshores, encara que sigui incomplet. A continuació s'afegeix el motor de puntuació que compara objectivament el treball de cada equip amb la Plana Model i mostra el rànquing final (Fase 4). Tanca el cicle el desplegament al VPS de producció rere Nginx amb PM2, verificat perquè funcioni sense sorpreses el dia de la classe real (Fase 5).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Nucli en temps real i control de sessió** - Servidor amb estat autoritatiu, identitat persistent, timer sincronitzat i panell Admin de control/recuperació
- [ ] **Phase 2: Joc — Fase HTML (blocs drag & drop)** - Equips munten l'esquelet HTML amb blocs de snap fort, sense escriptura lliure
- [ ] **Phase 3: Joc — Fases CSS i JS** - Equips vesteixen l'HTML amb CSS foradat i li donen comportament amb regles JS
- [ ] **Phase 4: Puntuació i rànquing final** - Motor de scoring estructural/d'estil/de comportament i pantalla de resultats
- [ ] **Phase 5: Desplegament a producció (VPS + Nginx + PM2)** - App verificada en producció amb WebSocket real i reinici automàtic

## Phase Details

### Phase 1: Nucli en temps real i control de sessió

**Goal**: L'admin pot muntar i controlar una sessió en viu, i els equips es poden connectar de manera robusta sense perdre mai l'estat
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, GAME-01, GAME-02, UX-01, UX-02
**Success Criteria** (what must be TRUE):

  1. L'admin pot registrar 4-6 equips i veure'ls aparèixer connectats al panell d'un cop d'ull
  2. L'admin pot iniciar un compte enrere global, pausar/reprendre'l i sumar-hi +1 minut, i el canvi es reflecteix a l'instant a totes les pantalles d'equip
  3. Un equip que refresca la pàgina o pateix una desconnexió recupera exactament el mateix estat (fase, timer) sense cap intervenció manual
  4. L'admin pot forçar un resync d'un equip penjat i veure l'estat de connexió de tots els equips en tot moment
  5. Cada pantalla d'equip mostra el panell d'acció (esquerra) i la preview en temps real (dreta) amb un llenguatge visual consistent, iconografia clara i text mínim

**Plans**: 4 plans
**Wave 1**

- [x] 01-01-PLAN.md — Walking Skeleton: scaffold + round-trip registre→tria + identitat per token (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Timer autoritatiu sincronitzat + control de fase de l'admin (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Graella de monitoratge + resync forçat (Wave 3)
- [x] 01-04-PLAN.md — Estats de la pantalla d'equip (espera/interstici/split/congelat) + preview aïllada (Wave 3)

**UI hint**: yes

### Phase 2: Joc — Fase HTML (blocs drag & drop)

**Goal**: Els equips poden completar la Fase HTML del joc muntant l'esquelet de la pàgina amb blocs, sense poder escriure cap codi lliure
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: GAME-03, GAME-06
**Success Criteria** (what must be TRUE):

  1. Un equip pot arrossegar blocs HTML des del calaix i encaixar-los a l'estructura; un bloc deixat en un lloc invàlid torna al calaix o s'ajusta automàticament a l'slot vàlid més proper (snap fort)
  2. La preview de la dreta es re-renderitza a l'instant amb cada bloc col·locat, reutilitzant la canonada de Fase 1
  3. En cap moment de la fase HTML l'equip pot escriure text de codi lliure — totes les interaccions són blocs predefinits arrossegables

**Plans**: 3 plans

**Wave 1**

- [ ] 02-01-PLAN.md — Llesca vertical caminant: plantilla del robot + autoritat de col·locació + preview real (SortableJS/DOMPurify) (Wave 1)

**Wave 2** *(blocked on Wave 1)*

- [ ] 02-02-PLAN.md — Mecànica completa: treure peça, inventari, distractors, congelació (Wave 2)

**Wave 3** *(blocked on Wave 2)*

- [ ] 02-03-PLAN.md — Feedback: progrés N/8 (equip + Admin) + pista inicial + checkpoint visual (Wave 3)

**UI hint**: yes

### Phase 3: Joc — Fases CSS i JS

**Goal**: Els equips poden completar la Fase CSS i la Fase JS treballant sobre l'HTML produït a la fase anterior, encara que aquest hagi quedat incomplet
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: GAME-04, GAME-05, GAME-07
**Success Criteria** (what must be TRUE):

  1. Un equip pot omplir el CSS "foradat" mitjançant color pickers i sliders sobre sintaxi CSS real, i la preview reflecteix el canvi a l'instant
  2. Un equip pot construir regles JS amb desplegables ("Quan passi X → a l'element Y → Fes Z") i en veure l'efecte aplicat a la preview
  3. Si l'HTML de la fase anterior ha quedat incomplet en esgotar-se el temps, les fases CSS i JS funcionen igualment sobre el DOM parcial sense trencar-se

**Plans**: TBD
**UI hint**: yes

### Phase 4: Puntuació i rànquing final

**Goal**: En finalitzar la partida, cada equip rep una puntuació justa i comparable basada en l'estructura, l'estil i el comportament reals del seu treball, i tothom veu un rànquing final
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, ADMIN-07
**Success Criteria** (what must be TRUE):

  1. L'admin pot prémer "Finalitzar i Mostrar Resultats" i totes les pantalles canvien a la vista de resultats a l'instant
  2. La puntuació HTML compara l'estructura del DOM de l'equip amb la Plana Model (mai diff de text)
  3. La puntuació CSS compara valors `getComputedStyle` normalitzats, de manera que formats equivalents (hex/rgb/nom de color) puntuen igual
  4. La puntuació JS verifica que l'esdeveniment, l'element i l'acció triats coincideixen semànticament amb els de la Plana Model
  5. La pantalla de resultats mostra el percentatge d'encert i el rànquing de tots els equips, amb el detall de sub-checks superats per equip

**Plans**: TBD
**UI hint**: yes

### Phase 5: Desplegament a producció (VPS + Nginx + PM2)

**Goal**: L'aplicació funciona de manera fiable al VPS de producció, rere Nginx, preparada per a la sessió real a l'aula
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: DEPL-01, DEPL-02
**Success Criteria** (what must be TRUE):

  1. L'app desplegada al domini de producció manté la connexió Socket.io per WebSocket real (no fa fallback silenciós a polling), verificat amb les eines de xarxa del navegador
  2. El procés Node s'executa sota PM2 i es reinicia automàticament si cau
  3. Una sessió completa (registre d'equips, les 3 fases de joc, resultats) es pot jugar de cap a cap contra el desplegament real sense errors de connexió

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nucli en temps real i control de sessió | 0/4 | Planned | - |
| 2. Joc — Fase HTML (blocs drag & drop) | 0/3 | Planned | - |
| 3. Joc — Fases CSS i JS | 0/TBD | Not started | - |
| 4. Puntuació i rànquing final | 0/TBD | Not started | - |
| 5. Desplegament a producció (VPS + Nginx + PM2) | 0/TBD | Not started | - |
