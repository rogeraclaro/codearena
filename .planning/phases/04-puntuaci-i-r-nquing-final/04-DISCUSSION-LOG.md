# Phase 04: Puntuació i rànquing final - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 04-puntuaci-i-r-nquing-final
**Areas discussed:** Model de puntuació CSS/JS, Pes del temps en el ranking, Botó "Llest!" (GAME-08) — gate de correcció, Detall de la pantalla de resultats

---

## Model de puntuació CSS/JS

| Option | Description | Selected |
|--------|-------------|----------|
| Distància normalitzada 0-100 | Colors: distància RGB normalitzada; mides: distància numèrica normalitzada pel rang min/max | ✓ (CSS) |
| Llindar de tolerància (tot o res per forat) | Cada forat puntua 100 si dins d'un marge, sinó 0 | |
| Proximitat parcial (HTML) | Coherent amb CSS: cada peça/slot correcte suma punts | ✓ |
| Tot o res (SCORE-01 literal) | Només 100% si l'estructura sencera coincideix exactament | |
| Percentatge de regles correctes (JS) | Cada regla de referència que l'equip també té compta com a encert | |
| Tot o res per regla exacta (JS) | Només compta si TOTES les regles hi són exactament | |

**User's choice:** CSS per distància normalitzada 0-100. HTML per proximitat parcial. JS: **no hi ha model de referència** — cada equip proposa lliurement les seves accions; la puntuació JS es basa en quantitat + varietat d'accions/events/elements únics, no en correcció respecte una referència.

**Notes:** Aquest últim punt és un gir important respecte la redacció original de SCORE-03 (que assumia una comparació semàntica amb la Plana Model). L'usuari va aclarir explícitament que a la pantalla JS "cada equip pot proposar les accions que vulgui" i per tant no hi ha referència exacta a comparar.

Pes relatiu de fases:

| Option | Description | Selected |
|--------|-------------|----------|
| HTML 40% / CSS 40% / JS 20% | Recomanat inicial | |
| HTML 33% / CSS 33% / JS 33% | Pes igual | |
| Tu decideixes els percentatges | | |
| **HTML 30% / CSS 60% / JS 10%** | Elecció final de l'usuari | ✓ |

**User's choice:** HTML 30% / CSS 60% / JS 10%.

---

## Pes del temps en el ranking

| Option | Description | Selected |
|--------|-------------|----------|
| Només desempat (manté SCORE-04 actual) | El % d'encert mana sempre; temps només decideix empats exactes | |
| Bonificació petita dins del score | ±5 punts màx sobre el score de precisió | ✓ |
| Tu decideixes la fórmula | | |

**User's choice:** Bonificació petita dins del score.

| Option | Description | Selected |
|--------|-------------|----------|
| Per fase | Cada fase té el seu propi bònus de rapidesa | ✓ |
| Només temps total | Un únic bònus global basat en l'última fase | |

**User's choice:** Per fase.

| Option | Description | Selected |
|--------|-------------|----------|
| Sense bònus de temps a CSS/JS | Només HTML té bònus (únic amb botó Finalitzar/doneAt) | ✓ |
| Usar el final del timer global per CSS/JS | Timer global és igual per a tots els equips — no diferenciaria | |

**User's choice:** Sense bònus de temps a CSS/JS.

**Notes:** Aquesta última pregunta va sorgir com a conseqüència directa de la decisió de l'àrea "Botó Llest!" (CSS/JS perden el botó de finalitzar, per tant perden també el timestamp `doneAt` necessari per calcular el bònus).

---

## Botó "Llest!" (GAME-08) — gate de correcció

| Option | Description | Selected |
|--------|-------------|----------|
| Deixar-lo com està (sense gate) | Coherent amb scoring per proximitat — exigir 100% no encaixa | |
| Retrofit: gate de correcció 100% | Implementar validació en viu contra la Plana Model | ✓ (només HTML) |
| Gate parcial: llindar (≥90%) | Punt intermedi | |

**User's choice (free text):** "a la fase HTML el gate 100% a la fase CSS no cal botó de finalitzar"

**Notes:** Resposta lliure que va requerir una pregunta de confirmació: HTML manté el botó amb gate 100% (retrofit ara); CSS elimina el botó Finalitzar existent (commit `7fd2169`) per complet. Confirmat explícitament per l'usuari ("Sí, correcte").

| Option | Description | Selected |
|--------|-------------|----------|
| Sense botó (com CSS) | JS tampoc té referència exacta per validar | ✓ |
| Amb botó sense gate | Es manté un botó només per registrar timestamp | |

**User's choice:** Sense botó (com CSS).

---

## Detall de la pantalla de resultats

| Option | Description | Selected |
|--------|-------------|----------|
| Només ranking + percentatge global de tots | Detall de sub-checks només visible per al propi equip | ✓ |
| Detall complet de tots els equips visible | Màxim valor de debrief però exposa errors concrets d'altres | |
| Tu decideixes | | |

**User's choice:** Només ranking + percentatge global de tots.

| Option | Description | Selected |
|--------|-------------|----------|
| Mostra el desglossament per fase | Cada equip veu % HTML, % CSS, % JS per separat | |
| Només el percentatge global | Un únic número final, sense desglossar | ✓ |

**User's choice:** Només el percentatge global.

**Notes (afegit lliure de l'usuari):** A més de la pantalla de resultats per equip, l'Admin necessita veure un ranking temporal en acabar cada fase (HTML→CSS, CSS→JS) i el ranking final. Es va explorar amb dues preguntes de seguiment:

| Option | Description | Selected |
|--------|-------------|----------|
| Només l'Admin | Mini-ranking al panell d'Admin; equips no ho veuen | ✓ |
| També a les pantalles dels equips | Ranking parcial visible per tothom a cada fi de fase | |

**User's choice:** Només l'Admin.

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, mateix motor amb 0 a les fases pendents | Reutilitza exactament la mateixa lògica de scoring | ✓ |
| Només ranking de la fase que acaba de tancar-se | Sense barrejar amb el pes global | |

**User's choice:** Sí, mateix motor amb 0 a les fases pendents.

---

## Claude's Discretion

- Fórmula exacta de la bonificació de temps HTML (llindar concret d'±5 punts, escalat lineal vs. esglaonat).
- Fórmula de distància de color per al score CSS (Euclidiana simple vs. perceptual).
- Format visual del mini-ranking d'Admin (llista simple vs. barra de progrés).

## Deferred Ideas

- Preview CSS live code overlay (millora UI Fase CSS) — futura fase d'UI/polish.
- Botó per tornar a la fase anterior des de l'Admin — futura fase d'Admin.
- Reset de servidors des del panell Admin — futura fase d'Admin/Ops.
