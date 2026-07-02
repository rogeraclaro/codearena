# Phase 2: Joc — Fase HTML (blocs drag & drop) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 2-Joc — Fase HTML (blocs drag & drop)
**Areas discussed:** Contingut de l'exercici, Model d'encaix i snap, Feedback/preview, Representació dels blocs, Distractors, Layout del panell

---

## Contingut de l'exercici (Plana Model)

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| Targeta de presentació | Header + img + p + button + footer | |
| Mini landing | Header+nav / section hero / footer | |
| Tu ho decideixes | Claude proposa | ✓ (inicial) |

**User's choice:** L'usuari va descartar les propostes inicials i va **aportar la seva pròpia estructura**: primer una versió amb `div`s (cap de robot), després una versió més semàntica (`section`/`img`/`article`/`div`/`span`/`button`/`output`).
**Notes:** Element interactiu (botó) confirmat per a la Fase JS. Valoració de Claude: `<img>`+`alt`, `<button>`, `<output>` = encerts semàntics; **push-back sobre `<article id="robot-cap">`** (semànticament fals per a "cap") → l'usuari accepta canviar-lo a `<div>`. Fons fix no manipulable. Text "BEEP BEEP" fix.

---

## Nivell de complexitat (abast del muntatge)

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| A — Munta la cara | Contenidors pre-fets; alumne col·loca 8 peces fulla | ✓ |
| B — Munta el cap | Només `#robot-contenidor` pre-fet | |
| C — Arbre complet des de zero | Alumne munta tota la jerarquia (tria inicial, revisada) | |

**User's choice:** Tier A.
**Notes:** L'usuari va expressar preocupació que l'exercici fos massa complex per al públic (adults ~40 anys, ~10 min de xerrada). Claude va identificar que el driver de dificultat real és **construir la jerarquia abstracta de contenidors**, no el nombre de peces → recomanació Tier A, acceptada. Revisa la tria prèvia d'"arbre complet des de zero".

---

## Identitat dels elements repetits (esquerra/dreta)

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| Bloc genèric, id pel slot | El forat assigna id/class segons posició | ✓ |
| Blocs distints esq/dre | Dos blocs separats amb id fix | |

**User's choice:** Bloc genèric, id pel slot.
**Notes:** Garanteix ids correctes per a CSS/JS/scoring; evita confusió esquerra/dreta.

---

## Snap fort

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| Imant + rebot | A prop → entra sol; lluny/incorrecte → torna al calaix | ✓ |
| Només imant al vàlid més proper | Sempre salta al vàlid més proper | |
| Només rebot al calaix | Cal punteria; si no, torna al calaix | |

**User's choice:** Imant + rebot.
**Notes:** Combina les dues opcions admeses per GAME-03; màxim "sense frustració".

---

## Feedback / preview durant la fase HTML

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| Esquemàtic (contorns) | Diagrama de forats marcats | |
| Real (robot renderitzat) | Render iframe; ulls/nas invisibles fins CSS | ✓ |
| Híbrid | Real + placeholders als invisibles | |

**User's choice:** Real, **combinat amb** una idea aportada per l'usuari: mostrar el **tag+class HTML real** com a etiqueta descriptiva. Confirmat mantenir el robot renderitzat a la dreta i posar les etiquetes tag+class a l'esquerra (tauler).
**Notes:** Push-back de Claude: la sintaxi crua `< >` va contra el nucli anti-sintaxi; mitigació = etiqueta read-only (chip net o codi read-only, a discreció d'UI). L'asimetria d'elements invisibles la cobreix el tauler de l'esquerra.

---

## Distractors

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| Obvis / comics | Banana, roda, sabata… | ✓ (tipus) |
| Subtils / robot-ish | Tercer ull, barret… | |
| Barreja | | |
| Pocs (2-3) | | ✓ (quantitat) |
| Més (4+) | | |

**User's choice:** Distractors obvis, pocs (2-3). **Idea aportada per l'usuari.**
**Notes:** Sense forat vàlid → reboten sempre amb l'snap imant+rebot; cap mecànica nova. Aclariment de vocabulari calaix (origen) vs tauler (destí) durant aquesta discussió.

---

## Layout del panell d'acció

| Opció | Descripció | Selecció |
|--------|-------------|----------|
| Tauler esquerra + preview real dreta | Slots i calaix a l'esquerra; robot real a la dreta | ✓ |
| Arrossegar sobre la preview | Slots sobre la silueta de la dreta | |
| Miniatura d'objectiu | Referència local del robot final | (descartat) |
| Pista / animació inicial | Fletxa "peça → forat" que desapareix | ✓ |
| Progrés propi (N/8) | Comptador a la pantalla d'equip | ✓ |

**User's choice:** Tauler esquerra + preview real dreta; progrés propi N/8; pista/animació inicial. Miniatura d'objectiu descartada.
**Notes:** Progrés a l'Admin = N/8 peces (materialitza l'espai reservat a D-08 de Fase 1). Es permet **treure una peça col·locada** (torna al calaix; N/8 baixa).

---

## Claude's Discretion

- Detall visual de l'etiqueta tag+class (chip net vs tira de codi read-only).
- Estètica de peces/tauler, animació de snap i de la pista inicial (respectant UX-01).
- Detall visual dels distractors rebotant (shake, so, etc.).

## Deferred Ideas

- Miniatura d'objectiu a la pantalla d'equip (descartada aquesta fase; reconsiderable si projectar no basta a l'aula).
- Distractors subtils / més nombrosos (palanca de dificultat per a públic futur més avançat).
