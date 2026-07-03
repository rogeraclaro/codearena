# Phase 3: Joc — Fases CSS i JS - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 3-Joc — Fases CSS i JS
**Areas discussed:** Abast del CSS foradat, Catàleg de regles JS, DOM incomplet (GAME-07), Layout i progrés Admin

---

## Abast del CSS foradat

| Option | Description | Selected |
|--------|-------------|----------|
| Només la implementació concreta | Mantenir "codi foradat" com a principi (ja tancat a PROJECT.md), explorar l'aspecte concret | ✓ |
| Reobrir la decisió en si | Tornar a valorar Opció A vs Opció B (panell visual) | |

**Notes:** L'usuari va aportar el CSS definitiu real del Bender (estil Futurama, pastat literalment durant la discussió) i es va discutir element per element quines propietats són forats interactius i quines fixes. Taula completa a `03-CONTEXT.md` D-01 a D-10.

Elements coberts en ordre: `#robot-contenidor`+cassoleta (tot fix) → `.antena` (color+border color) → `.orella` (posició+mida) → `.contenidor-ulls`/`.ull` (color visor+top, border-radius ull) → `#nas` (border-radius+mida) → `#boca` (mida+color dents) → `#robot-cap` (color+border color+border width). El fons de pàgina reutilitza el codi existent (`robot-fons.png`), no és forat.

---

## Catàleg de regles JS

| Option | Description | Selected |
|--------|-------------|----------|
| Una única forma correcta | Comparar contra una Plana Model JS fixa (patró SCORE-03 actual) | |
| Obert/variety-based | L'equip decideix quantes/quines interaccions construeix, puntuació per cobertura + bonus ocult | ✓ |

**Notes:** L'usuari va explicar el seu propi disseny abans de triar entre opcions predefinides: files "Quan X → Y → Z" afegibles amb botó "Veure" (test individual) + "Afegir JavaScript" (nova fila), màxim 5-6, sense repetir parella (event, origen). Puntuació basada en varietat + 1-2 accions bonus secretes (a l'alumne no se li diu quines donen punts extra).

Es va discutir explícitament si una interacció pot afectar múltiples elements: es van valorar 3 nivells (1:1 amb destí diferent / 1:múltiple lliure / seqüències temporals) i es va descartar el multi-destí lliure i les seqüències per complexitat, adoptant en el seu lloc **accions compostes predefinides pel dissenyador** (destí fix incorporat a l'acció) com a via per obtenir efectes multi-element sense exposar selecció múltiple a l'alumne.

Events triats: click, hover, mouseleave, dblclick. Elements: nas, boca, cap, antena, orella-esquerra, orella-dreta, ull-esquerre, ull-dret. Accions simples: color, amagar/mostrar, girar, mida. Accions compostes: catàleg obert a discreció del planner, amb 2 exemples mínims garantits.

---

## DOM incomplet (GAME-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Control no fa res visible (no-op natural) | Cap tractament especial; selector/JS sobre element absent simplement no té efecte | ✓ |
| Control es desactiva amb avís | Detectar peça absent i grisar el forat corresponent | |
| Forat s'amaga del tot | Només mostrar forats de peces presents | |

**Notes:** L'usuari va aclarir que la Fase HTML amb snap fort garanteix estructura sempre correcta (mai incorrecta, com a molt incompleta), i que ell mateix gestiona el ritme/supervisió manual dels equips. Conclusió: no cal cap disseny especial — és un no-op natural de la plataforma. Únic requisit: QA ha de verificar que no hi hagi errors de consola ni bloqueig del panell.

---

## Layout i progrés Admin

| Option | Description | Selected |
|--------|-------------|----------|
| Mateix split reutilitzat (HTML/CSS/JS) | Coherència visual total, només canvia contingut del panell | ✓ (amb matís) |
| Layout diferent per CSS/JS | Explorar proporcions diferents | |
| CSS = N/9, JS = N regles | Comptador numèric per a les 2 fases | |
| Només connexió, sense progrés numèric | Sense comptador N/total per CSS/JS | ✓ |

**Notes:** L'usuari va confirmar reutilitzar el split, però va assenyalar que l'actual no és exactament 50/50 — cal corregir-ho (aplica a les 3 fases, no només CSS/JS). Pel progrés a l'Admin, es va triar NOMÉS estat de connexió per CSS/JS (sense comptador), perquè CSS té valors continus sense "total" net i JS és obert sense objectiu fix.

---

## Claude's Discretion

- Catàleg exacte d'accions compostes JS (més enllà dels 2 exemples mínims garantits).
- Detall visual concret dels controls CSS i de les files de regles JS.
- Durada del temporitzador de CSS i JS (l'usuari ho decidirà després de proves amb persones reals).

## Deferred Ideas

- SCORE-03 (`REQUIREMENTS.md`) necessita revisió/matís a Fase 4 per reflectir el model variety-based + bonus ocult (contradiu parcialment la redacció actual de "tripleta única").
- Botó "Llest!" per a CSS/JS (GAME-08) — ja constava com a diferit; no reobert aquí.
