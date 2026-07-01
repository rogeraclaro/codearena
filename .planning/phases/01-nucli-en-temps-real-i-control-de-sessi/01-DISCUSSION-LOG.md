# Phase 1: Nucli en temps real i control de sessió - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 1-Nucli en temps real i control de sessió
**Areas discussed:** Entrada d'equips, Espera i lobby client, Monitoratge admin, Timer i transicions

---

## Entrada d'equips

### Q1 — Com entren els equips a la partida el primer minut de classe?

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-registre + tria de llista | Admin escriu els noms; cada PC tria de la llista; token al localStorage | ✓ |
| Codi de sessió (Kahoot) | Admin obté un PIN; cada equip entra el PIN i escriu el seu nom | |
| Enllaços per equip | Admin genera 4-6 enllaços amb nom assignat i en reparteix un a cada PC | |

**User's choice:** Pre-registre + tria de llista

### Q2 — Com gestionem col·lisions / reconnexió?

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueig fort | Un cop agafat, l'equip desapareix de la llista; reconnexió automàtica per token | ✓ |
| Permet reprendre | Un altre PC pot recórrer l'equip fent fora la connexió anterior | |
| You decide | Deixar el patró al researcher/planner | |

**User's choice:** Bloqueig fort

### Q3 — Si un PC mor definitivament, com allibera l'admin l'equip?

| Option | Description | Selected |
|--------|-------------|----------|
| Botó 'Alliberar equip' al panell | Torna l'equip a la llista disponible conservant el nom | |
| No cal (fora d'abast v1) | Màquines idèntiques; si passa, es reinicia la sessió | ✓ |
| You decide | Criteri del planner | |

**User's choice:** No cal (fora d'abast v1)

---

## Espera i lobby client

### Q1 — Què veu la pantalla d'equip abans que l'admin iniciï la primera fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Espera dedicada a pantalla completa | Nom d'equip + 'Connectat ✓, esperant'; split només en arrencar | ✓ |
| Split ja visible, bloquejat | Layout split amb panell i preview buits + rètol 'Esperant inici' | |
| You decide | Criteri d'UI/planner | |

**User's choice:** Espera dedicada a pantalla completa

### Q2 — Com transiciona la pantalla d'equip en els salts de fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Interstici breu | Missatge curt 'Ara: Fase X' d'1-2s abans d'activar el nou panell | ✓ |
| Canvi instantani | El panell canvia a l'instant sense interstici | |
| You decide | Criteri d'UI/planner | |

**User's choice:** Interstici breu

---

## Monitoratge admin

### Q1 — Quins senyals per equip a la graella de l'admin? (multiselect)

| Option | Description | Selected |
|--------|-------------|----------|
| Estat de connexió | Connectat/desconnectat, color+icona | ✓ |
| Fase actual de l'equip | En quina fase està cada equip | (descartat) |
| Progrés dins la fase | Barra/comptador de progrés | ✓ |
| Alerta de 'penjat' | Marca quan un equip porta X segons desconnectat | |

**User's choice:** Estat de connexió + Progrés dins la fase.
**Notes:** L'usuari va clarificar que **l'admin sincronitza les 3 fases** — tots els equips a la mateixa fase alhora (lockstep). Per tant l'indicador de "fase actual per equip" és redundant i es descarta: hi ha un únic estat de fase global.

### Q2 — Com funciona el resync forçat (ADMIN-06)?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-sync suau (re-render) | El client refà l'estat sense recarregar; parpelleig breu | |
| Recàrrega completa | Força un reload de la pàgina del client | ✓ |
| You decide | Criteri del planner | |

**User's choice:** Recàrrega completa

---

## Timer i transicions

### Q1 — Quan el compte enrere global arriba a zero, què passa?

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueja i espera l'admin | Panells congelats a zero; el canvi de fase el prem l'admin | ✓ |
| Auto-avanç a zero | Tots els equips salten automàticament a la fase següent | |
| You decide | Criteri del planner | |

**User's choice:** Bloqueja i espera l'admin
**Notes:** Resol la contradicció PROJECT.md ("si el temps s'esgota, passen de fase tal com estiguin") vs CORE-05 a favor de CORE-05. La feina es congela "tal com està", però l'avanç de fase és sempre manual de l'admin.

### Q2 — Senyalització d'urgència de temps als últims segons?

| Option | Description | Selected |
|--------|-------------|----------|
| Canvi de color + pols visual | Timer canvia de color i fa pols els últims ~10-15s | |
| Només el número | Comptador sense efectes | |
| You decide | Criteri d'UI/planner | ✓ |

**User's choice:** You decide

---

## Claude's Discretion

- Senyalització visual d'urgència del timer (últims segons) — a criteri d'UI, respectant "iconogràfic, text mínim".
- Patró concret de reconnexió (`connectionStateRecovery` vs resync explícit) — a criteri del researcher/planner, sempre que compleixi CORE-03.
- Definició concreta de la mètrica de "progrés dins la fase" — es reserva l'espai al card; la definició arriba amb el contingut de joc (Fase 2+).

## Deferred Ideas

None — la discussió es va mantenir dins l'abast de la Fase 1.
