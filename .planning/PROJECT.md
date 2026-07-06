# CodeArena — Microclasse gamificada d'HTML/CSS/JS

## What This Is

Webapp gamificada per impartir una microclasse introductòria d'HTML, CSS i JavaScript a alumnes de formació professional sense cap coneixement previ. Els alumnes, organitzats en 4-6 equips (cadascun en un ordinador Windows de l'aula), competeixen per reproduir una "Plana Model" projectada pel professor, en una dinàmica curta de 15-20 minuts dividida en 3 fases seqüencials. El professor controla el ritme des d'un panell Admin sincronitzat en temps real amb totes les pantalles d'equip.

## Core Value

Que alumnes sense cap experiència entenguin els tres rols fonamentals del web (HTML = estructura, CSS = aparença, JS = comportament) manipulant-los directament, sense poder cometre errors de sintaxi i sense frustració.

## Requirements

### Validated

- **GAME-03** (Phase 2): Fase HTML amb blocs drag & drop i snap fort — un bloc mal deixat torna al calaix o encaixa a l'slot vàlid més proper (magnet + rebound via SortableJS)
- **GAME-06** (Phase 2): Cap escriptura lliure de codi a la Fase HTML — totes les interaccions són blocs predefinits arrossegables, etiquetes read-only

### Active

**Nucli temps real**
- [ ] Servidor Node.js + Socket.io amb estat de partida en memòria al servidor
- [ ] Vista Admin i múltiples vistes Client sincronitzades en temps real
- [ ] Recuperació d'estat: si un equip refresca la pàgina, torna exactament on era

**Mecànica de joc (Client)**
- [ ] 3 fases seqüencials: Fase 1 HTML (esquelet), Fase 2 CSS (pell), Fase 3 JS (músculs)
- [ ] Pantalla d'equip dividida: panell d'acció (esquerra) + preview en temps real (dreta)
- [x] Fase HTML: blocs drag & drop estil Scratch amb snap fort (bloc mal deixat torna al calaix o encaixa a l'espai vàlid més proper) — validat Phase 2 (GAME-03)
- [ ] Fase CSS: codi "foradat" — sintaxi CSS real amb valors controlats (color pickers, sliders)
- [x] Fase CSS: overlay de codi CSS en directe a la preview en interactuar amb un forat (etiqueta HTML + bloc CSS sencer del grup, valor en viu, fade suau) — validat Phase 04.1
- [ ] Fase JS: constructor de regles lògiques "Quan passi X → A l'element Y → Fes Z" amb desplegables
- [ ] Cap escriptura lliure de codi en cap fase (validat per la Fase HTML a Phase 2; pendent per CSS/JS)

**Panell Admin**
- [ ] Registre de noms d'equips
- [ ] Iniciar fases amb compte enrere global que força el canvi a les pantalles dels equips
- [ ] Controls "+1 minut" i "Pausar/Reprendre" el temporitzador
- [ ] Vista d'estat/progrés general dels 4-6 equips d'un cop d'ull
- [ ] Botó "Finalitzar i Mostrar Resultats"
- [x] Botó "Fase anterior" amb confirmació, per corregir un avanç prematur sense reiniciar tot — validat Phase 04.1
- [x] Botó "Reset" — restart real del procés (process.exit + PM2 revive) com a eina d'emergència, amb confirmació destructiva — validat Phase 04.1

**Auto-scoring**
- [ ] Comparació HTML: estructura del DOM de l'equip vs Plana Model
- [ ] Comparació CSS: valors getComputedStyle d'elements clau
- [ ] Comparació JS: verificar esdeveniment lligat i acció correcta
- [ ] Percentatge d'encert per equip i rànquing final

**UX / Accessibilitat**
- [ ] Interfície amb mínim soroll visual: iconografia clara, text reduït al mínim
- [ ] 100% accessible per a alumnes sense experiència (càrrega cognitiva baixa)

### Out of Scope

- Escriptura lliure de codi — evitar errors de sintaxi és un requisit pedagògic central
- Editor d'exercicis configurable per l'admin — v1 té 1 exercici fix al codi; es pot parametritzar més endavant
- Persistència en base de dades — partides de 15-20 min, estat en memòria al servidor és suficient
- Comptes d'usuari / autenticació d'alumnes — els equips s'identifiquen per nom registrat per l'admin
- Suport mòbil — es juga en ordinadors Windows d'aula, tots idèntics
- Opció B de CSS (panell visual) i Opció B de JS (blocs prefabricats) — descartades a favor de les opcions A, amb més valor pedagògic

## Context

- **Entorn d'aula**: ordinadors Windows idèntics, un per equip, amb navegador Chrome, no tàctils (confirmat pel propietari 2026-07-06). El professor projecta la Plana Model a la pantalla de classe.
- **Dinàmica curta**: 15-20 minuts en total. Cada segon compta — la UI ha de ser immediata i sense fricció.
- **Els equips no avancen sols**: les transicions de fase depenen exclusivament de l'admin. Si el temps s'esgota, passen de fase tal com estiguin.
- **Desplegament**: VPS propi, possiblement sota domini tipus masellas.info, rere proxy invers Nginx. Codi preparat per a producció.
- **Públic**: alumnes de FP sense coneixements previs de programació.
- **PM2 en producció (Fase 5)**: cal injectar `ADMIN_SECRET` via `env` de l'ecosystem/secret manager — actualment el procés emet un `console.warn` si falta, però en dev l'autenticació admin queda deshabilitada sense ell (T-04.1-05, transferit a Fase 5 al `04.1-SECURITY.md`).

## Constraints

- **Tech stack**: Node.js + Socket.io per al backend en temps real — decisió del propietari del projecte
- **Desplegament**: VPS propi rere Nginx — el WebSocket ha de funcionar rere proxy invers
- **Temps de sessió**: dinàmica de 15-20 min — la robustesa (reconnexió, recuperació d'estat) és crítica perquè no hi ha marge per repetir
- **UX**: càrrega cognitiva mínima — icones sobre text, snap fort al drag & drop per evitar frustració
- **Escala**: 4-6 equips simultanis + 1 admin — no cal escalar més enllà d'una aula

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CSS Opció A: codi foradat | Els alumnes veuen sintaxi CSS real però només toquen valors controlats — més valor pedagògic que un panell visual | — Pending |
| JS Opció A: regles lògiques | El constructor "Quan X → element Y → Fes Z" ensenya el model mental esdeveniment→selector→acció | — Pending |
| 1 exercici fix al codi | Microclasse única de 15-20 min; configurabilitat és complexitat innecessària a la v1 | — Pending |
| Estat al servidor amb recuperació | Un F5 accidental no pot arruïnar una partida de 15 min; l'estat de cada equip viu en memòria al servidor | — Pending |
| Node.js + Socket.io | Sincronització en temps real admin↔equips; ecosistema madur, desplegament senzill a VPS | — Pending |
| PM2 com a supervisor de procés (dev i prod, mateix mecanisme) | El Reset real de l'Admin necessita que el procés Node pugui sortir net (`process.exit(0)`) i ser revivit automàticament — PM2 ho fa amb `autorestart` sense cap branca per NODE_ENV | ✓ Validat Phase 04.1 — `ecosystem.config.cjs` + `server.cjs` (fallback CJS obligatori: PM2 en mode fork trenca el guard `isMainModule` d'ESM) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-06 — Phase 04.1 (Millores operatives d'Admin) complete: botó «Fase anterior», Reset real via PM2, overlay CSS en directe validats*
