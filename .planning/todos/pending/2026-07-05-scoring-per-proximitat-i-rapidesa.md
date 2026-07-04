---
created: 2026-07-05T00:00:00.000Z
title: Scoring per proximitat i rapidesa (Fase 4)
area: planning
files:
  - src/server/gameState.js (team.doneAt, markPhaseDone)
  - src/shared/robotTemplate.js (CSS_HOLES target values, comentari capçalera)
---

## Problem

Durant la UAT manual de la Fase 03 (joc-fases-css-i-js), el propietari del
projecte va demanar un botó "Finalitzar" a les fases HTML i CSS (ja
implementat — vegeu commit 7fd2169) i va aclarir com hauria de funcionar la
puntuació d'aquestes pantalles: **proximitat al resultat correcte + rapidesa**.

Ja existeix la infraestructura mínima per capturar el timestamp de rapidesa
(`team.doneAt[phase]`, poblat via `TEAM_MARK_DONE`/`markPhaseDone`), però
NO hi ha cap lògica de puntuació — això és feina de la Fase 4
("Puntuació i rànquing final") segons el ROADMAP, encara no planificada.

## Solution

TBD — a decidir durant `/gsd-plan-phase 4` o una discussió prèvia
(`/gsd-discuss-phase 4`):

- **Proximitat (CSS)**: comparar `team.cssValues` contra els valors OBJECTIU
  documentats a la capçalera de `CSS_HOLES` a `robotTemplate.js` (antena-bg,
  cap-bg, etc.). Possible mètrica: distància numèrica normalitzada per
  propietat (colors: distància RGB; mides: distància numèrica normalitzada
  pel rang min/max de cada forat), agregada en un score 0-100.
- **Proximitat (JS)**: pendent de definir què significa "proximitat" per a
  regles JS (potser: nombre de regles correctes respecte un ruleset de
  referència, o cobertura de comportaments esperats).
- **Rapidesa**: usar `team.doneAt.html`/`.css`/`.js` (timestamp epoch ms) vs.
  `phaseEndsAt`/`phaseStartedAt` per calcular temps invertit per fase.
- Decidir pes relatiu proximitat vs. rapidesa en el score final.
- Pantalla de resultats/rànquing (ja prevista al ROADMAP per la Fase 4).
