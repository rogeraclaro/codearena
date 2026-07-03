---
created: 2026-07-03T08:13:38.466Z
title: Puntuació — considerar temps de finalització (Fase 4)
area: planning
files:
  - .planning/REQUIREMENTS.md:35-41 (SCORE-01 a SCORE-05)
  - .planning/ROADMAP.md:97 (Phase 4: Puntuació i rànquing final)
---

## Problem

Actualment el rànquing final (SCORE-04) es basa **només** en el percentatge d'encert global de cada equip, comparant l'estructura del DOM/CSS/JS amb la Plana Model. No hi ha cap component de temps de finalització. L'usuari, durant la verificació del checkpoint de la Fase 2 (joc-fase-html-blocs-drag-drop), va preguntar si el rànquing hauria de tenir en compte també quin equip acaba en menys temps.

## Solution

TBD — a decidir quan es planifiqui la Fase 4. Possibles enfocaments a valorar:
- Bonificació de puntuació per acabar abans (afegida al percentatge d'encert).
- Desempat per temps quan dos equips empaten en percentatge d'encert.
- Mantenir-ho fora d'abast si es prioritza no penalitzar equips que van amb calma però amb més precisió (tensió pedagògica: velocitat vs. correcció).

Revisar juntament amb SCORE-04/SCORE-05 i el disseny de la pantalla de resultats (debrief pedagògic) quan es faci `/gsd-discuss-phase 4`.
