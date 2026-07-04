---
created: 2026-07-04T22:24:13.003Z
title: Preview CSS live code overlay
area: ui
files:
  - src/client/client.js (renderForatRow, applyCssHole)
---

## Problem

A la Fase CSS, quan un equip mou un slider o tria un color d'un forat, la
preview mostra el canvi visual en directe (via CSSOM), però l'equip no veu
enlloc el codi CSS real que s'està aplicant. L'usuari (propietari del
projecte) va demanar durant la UAT manual de la Fase 03 que, mentre es toca
un control, es mostri també el codi CSS corresponent — per reforçar la
connexió entre "moc aquest control" i "aquesta línia de CSS canvia".

## Solution

Idea proposada per l'usuari: un requadre petit amb fons blanc, ancorat a la
part inferior de la preview (per no tapar el robot), amb text petit/
monospace mostrant el codi CSS real (selector + propietat + valor actual)
del forat que s'està tocant en aquell moment. Apareixeria/desapareixeria
lligat a la interacció del control (input/focus), no permanentment visible.

TBD: decidir si es mostra només el forat actiu o tots els forats tocats
recentment; com formatar el bloc de codi (una línia `selector { prop: valor; }`
o el bloc CSS_HOLES sencer del grup); si cal alguna transició d'entrada/
sortida per no ser massa sobtat.
