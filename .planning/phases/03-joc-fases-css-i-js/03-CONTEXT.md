# Phase 3: Joc — Fases CSS i JS - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Aquesta fase entrega la **Fase CSS** i la **Fase JS** jugables de CodeArena: sobre l'HTML del robot Bender muntat a la Fase 2 (potencialment incomplet si el temps s'ha esgotat), l'equip primer **fora dat** un subconjunt controlat de propietats CSS reals (color pickers/sliders, mai text lliure) fins arribar al disseny definitiu del Bender, i després construeix **regles JS obertes** ("Quan passi X a l'element Y → a l'element Z → Fes W") que reaccionen a interaccions del ratolí sobre el robot, sense un únic resultat "correcte".

**Dins d'abast:** l'abast exacte (element per element) de quines propietats CSS són forats interactius i quines són fixes/pre-construïdes; el catàleg de regles JS (events, elements, accions simples i compostes) i la seva mecànica d'UI (files afegibles, botó "Veure"); el comportament (sense tractament especial) quan el DOM de partida està incomplet (GAME-07); la reutilització del split de pantalla ja establert a Fase 2, amb un ajust a divisió exacta 50/50; el progrés (o absència d'aquest) al card de l'Admin per a aquestes 2 fases.

**Fora d'abast (altres fases):** el motor de puntuació real que compararà els valors CSS/`getComputedStyle` i la cobertura de regles JS contra objectius (SCORE-01/02/03) — Fase 4; el botó "Llest!" per a CSS/JS (GAME-08 el té ja implementat a HTML/Fase 1; per a CSS/JS queda explícitament diferit, com ja constava a `REQUIREMENTS.md`); desplegament — Fase 5.

**Requisits mapejats:** GAME-04 (CSS foradat), GAME-05 (regles JS), GAME-07 (DOM incomplet).

</domain>

<decisions>
## Implementation Decisions

### Abast del "CSS foradat" (element per element, sobre el CSS definitiu del Bender que l'usuari ha proporcionat)
- **D-01 [informational]:** El principi "codi foradat" (sintaxi CSS real, valors via controls tancats, mai text lliure) es manté sense reobrir-se — ja estava tancat a `PROJECT.md` Key Decisions (Opció A triada sobre panell visual, Opció B). Aquesta fase només concreta la seva implementació. No és un objectiu de construcció propi d'aquesta fase (és un principi ja tancat a un altre document), per això no es cita als `must_haves` dels plans.
- **D-02 [informational]:** `#robot-contenidor` i la seva cassoleta d'antena (`::before`) queden **100% fixos** — són estructura pre-construïda del joc, no peces HTML de l'alumne. És una decisió de frontera negativa ("això no es toca"), no un objectiu de construcció positiu; per això no es cita als `must_haves` dels plans.
- **D-03:** `.antena` (bola): forats = **background-color** i **border-color**. Fixos: mida, posició, tija (`::before`).
- **D-04:** `.orella`: forats = **top**, **left/right** (posició) i **width** (mida), tots via sliders. Valors objectiu de la Plana Model: `top: 95px`, `left: -31px` (esquerra) / `right: -31px` (dreta), `width: 40px`.
- **D-05:** `.contenidor-ulls` (visor): forats = **background-color** i **top** (posició vertical). Fixos: `border-radius`, `width`/`height`, `border`, pseudo-element `::before` (pantalla fosca).
- **D-06:** `.ull` (pupil·la): forat = **border-radius**. Fix: `background-color`, mida, pseudo-elements (`::before` pupil·la, `::after` cella).
- **D-07:** `#nas`: forats = **border-radius** i **mida** (width/height). Fix: color (sempre negre — Bender).
- **D-08:** `#boca`: forats = **height**, **width**, i **color de les dents** (el color "clar" del `repeating-linear-gradient`, avui `#fffcd3`). Fix: `border-radius`.
- **D-09:** `#robot-cap`: forats = **background-color**, **border-color**, **border-width**. Fix: `border-radius` (expressió el·líptica de 8 valors, massa complexa per convertir en control simple).
- **D-10:** El fons de pàgina (`background` de `body`) **NO** és un forat de l'exercici — reutilitza el codi ja existent a `wrapPreview()` (`src/client/client.js`, imatge `/robot-fons.png` amb overlay), no el `background-color: #ffffff` pla del CSS definitiu que l'usuari va pastar (aquell valor era només un placeholder de la font original).

### Catàleg de regles JS (GAME-05)
- **D-11:** **Model de puntuació obert/variety-based** — desviació explícita del patró "compara amb la Plana Model" d'HTML/CSS. No hi ha una única resposta correcta: l'equip decideix lliurement quantes i quines interaccions construeix (màxim 5-6 regles). La puntuació real (detall a definir a Fase 4) es basarà en cobertura de events/elements diferents + 1-2 accions "bonus" secretes que donen punts extra sense que l'alumne en sàpiga la identitat.
- **D-12:** Estructura de cada regla = **4 buits**: `Quan [event] a [origen] → a l'element [destí] → Fes [acció]`. Cada fila és una regla independent. UI: botó **"Veure"** per fila (preview en viu només d'aquella regla) + botó final **"Afegir JavaScript"** que afegeix una nova fila buida. Límit: **5-6 files màxim**.
- **D-13:** Events disponibles: **click, hover/mouseover, mouseleave, dblclick** (4 tipus).
- **D-14:** Elements disponibles (tant per a origen com per a destí): **nas, boca, cap sencer (`#robot-cap`), antena, orella-esquerra, orella-dreta, ull-esquerre, ull-dret** (8 elements) → 4×8 = 32 combinacions possibles, marge ampli respecte al límit de 5-6 regles.
- **D-15:** Restricció anti-repetició: no es pot repetir la mateixa parella **(event, origen)** dues vegades a files diferents. P.ex. si `(click, nas)` ja existeix, no es pot triar `(click, nas)` altre cop, però `(click, ull)` sí.
- **D-16:** Accions simples (actuen sobre l'element destí triat): **Canviar de color** (background-color, paleta tancada, mai picker lliure), **Amagar/mostrar** (toggle visibility), **Girar** (rotate animation), **Canviar mida** (scale).
- **D-17:** Accions compostes: el desplegable "Fes Z" inclou també accions predefinides pel dissenyador que afecten **diversos elements/propietats alhora** (p.ex. "Acluca ulls + tanca boca", "Ulls vermells + orelles grosses + dents vermelles"). Quan es tria una acció composta, el desplegable "element destí" es **desactiva** (els elements afectats ja venen incorporats a la definició de l'acció, no els tria l'alumne).
- **D-18:** Multi-destí triable per l'alumne (una sola regla afectant diversos elements a la seva elecció) i seqüències/cadenes temporals (Z1 després Z2) queden **explícitament descartades** — massa complexitat/càrrega cognitiva pel públic i el temps de sessió disponible. Només 1 origen → 1 destí (o acció composta amb destins fixos) per regla.

### DOM incomplet (GAME-07)
- **D-19:** **No cal cap tractament especial d'UI** per a peces HTML absents en arribar a CSS/JS. Justificació: el snap fort de la Fase HTML garanteix que cap equip tindrà estructura *incorrecta*, com a molt *incompleta* (menys peces, mai mal col·locades), i l'admin gestiona el ritme/temps manualment supervisant els equips. Un selector CSS o `querySelector`/listener JS sobre un element inexistent és un no-op natural de la plataforma — zero enginyeria addicional. Únic requisit de qualitat: verificar (QA/tests) que cap acció CSS/JS sobre un element absent llenci error de consola ni bloquegi la resta del panell.

### Layout i progrés Admin
- **D-20:** Les fases CSS i JS **reutilitzen el mateix split de pantalla** establert a la Fase HTML (Fase 2) — panell d'acció esquerra + preview robot dreta —, només canviant el contingut de `.action-panel` (forats CSS / files de regles JS en lloc del calaix+tauler).
- **D-21:** **Ajust transversal al split existent** (aplica a les 3 fases, no només CSS/JS): avui la divisió no és exactament al 50%; cal corregir-la a una **divisió exacta 50/50** per coherència visual.
- **D-22:** Progrés al card de l'Admin per a CSS i JS: **només estat de connexió**, **sense comptador numèric N/total** (a diferència d'HTML, que mostra N/7). Motiu: CSS té valors continus sense un "total" net comparable, i JS és obert/variety-based sense un objectiu fix a comptar.

### Claude's Discretion
- **Catàleg exacte d'accions compostes JS** — el planner pot ampliar-lo durant la implementació; els 2 exemples de D-17 són el mínim garantit, no la llista tancada.
- **Detall visual concret** dels controls CSS (aspecte del slider/color picker, disposició dels "forats" dins del panell) i de les files de regles JS (aspecte de cada fila, animació del botó "Veure"): a criteri d'UI/planner, respectant "iconografia clara, text mínim" (UX-01) i coherència amb l'estètica ja establerta a Fase 2.
- **Durada del temporitzador de CSS i JS** — l'usuari decidirà després de fer proves amb persones reals; no bloqueja la implementació (el timer ja és configurable des de l'Admin, patró heretat de Fase 1).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visió, requisits i abast de fase
- `.planning/PROJECT.md` — Core Value, Key Decisions (CSS Opció A "codi foradat" i JS Opció A "regles lògiques", ambdues ja tancades i confirmades aquí), Context d'aula.
- `.planning/REQUIREMENTS.md` §Mecànica de joc — **GAME-04** (CSS foradat), **GAME-05** (regles JS), **GAME-07** (DOM incomplet); §Puntuació — **SCORE-03** (nota: redactat pensant en un match contra tripleta única; cal matisar-lo a Fase 4, vegeu `<deferred>`); **GAME-08** (botó "Llest!", explícitament diferit per a CSS/JS, no es reobre aquí).
- `.planning/ROADMAP.md` §Phase 3 — Goal i els 3 Success Criteria.

### Context de fases prèvies (fonamental — aquesta fase construeix directament sobre el DOM/CSS que van deixar)
- `.planning/phases/02-joc-fase-html-blocs-drag-drop/02-CONTEXT.md` — decisions de Fase 2, especialment D-01/D-02 (estructura exacta del robot i per què `#robot-cap` és `<div>`), D-05 (`#nas` és `<button>`, origen natural del clic per a JS), D-13 (placeholder vermell actual a substituir pel CSS real), D-09/D-10 (snap fort — per què GAME-07 no necessita tractament especial, D-19).
- `.planning/phases/01-nucli-en-temps-real-i-control-de-sessi/01-CONTEXT.md` — D-11 (congelació sense auto-avanç: el DOM parcial viatja "tal com està" a aquesta fase).

### Stack tècnic (decidit)
- `.claude/CLAUDE.md` §Technology Stack — DOMPurify 3.x (sanejar l'HTML/CSS assemblat abans d'injectar-lo al `srcdoc`), patró d'estat en memòria al servidor.

*No hi ha ADRs ni specs externs addicionals — les decisions queden capturades a la secció Implementation Decisions.*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/client/client.js` → `wrapPreview()` — conté el **CSS placeholder actual** (`.antena, .ull, #nas, #boca { border: 2px solid red; ... }`, comentat com "D-13, 02-CONTEXT.md") que aquesta fase ha de **substituir pel CSS definitiu del Bender** proporcionat per l'usuari durant la discussió (bola d'antena, orelles PNG, visor+ulls, nas, boca amb dents), aplicant els forats de D-01 a D-10 com a valors controlats en lloc de valors fixos.
- `src/client/client.js` → `assemblePreview()` / `renderActiveSplitScreen()` — la canonada `srcdoc` + DOMPurify ja construïda a Fase 2; aquesta fase hi injecta els valors CSS controlats de l'equip en lloc (o a més) de l'HTML estàtic de placement.
- `src/server/gameState.js` → `teams` Map amb `placement` (Fase HTML). Necessitarà **nous camps autoritatius per equip**: valors CSS triats (per als 9 forats de D-01 a D-10) i regles JS construïdes (array de fins a 5-6 objectes `{event, origen, desti, accio}`, D-11 a D-18) — territori de research/planning per decidir estructura exacta i events de socket.
- `src/shared/robotTemplate.js` — `SLOTS`/`CONTAINERS` són la font única de veritat dels elements HTML disponibles; els 8 elements interactuables de JS (D-14) i els 9 elements amb forats CSS haurien de derivar-se'n, no duplicar-se a mà.

### Established Patterns
- **Estat autoritatiu al servidor, client com a capa de render** (Fase 1/2) — es manté: cap mutació CSS/JS es decideix al client sense passar per un handler de socket i re-broadcast.
- **DOM text API only / DOMPurify al `srcdoc`** (anti-XSS, Fase 2) — es manté per a qualsevol contingut assemblat dinàmicament.
- **mutation-returns-bool** (`placePiece`/`removePiece` a `gameState.js`) — patró a replicar per als nous mutadors CSS/JS perquè el caller només emeti board dirigit quan hi ha canvi real (anti-storm).

### Integration Points
- **Nou estat autoritatiu per equip**: valors CSS (per forat) i regles JS (array de files), amb el mateix principi de recuperació F5/reconnexió que `placement` (CORE-03).
- **Reutilització i correcció del split** (`renderActiveSplitScreen`, D-20/D-21): ajustar el layout existent a 50/50 exacte, i condicionar el contingut de `.action-panel` segons `state.phase` (`css` → panell de forats, `js` → panell de regles).
- **Progrés a `getPublicState()`** (`gameState.js`): avui `progress` només es calcula per a `state.phase === 'html'`; segons D-22, per a `css`/`js` aquest camp ha de quedar `null` (mateix comportament que fases no-html avui) — no cal ampliar-lo.

</code_context>

<specifics>
## Specific Ideas

- **CSS definitiu del Bender proporcionat literalment per l'usuari** durant la discussió (estil Futurama: cap gris blavós el·líptic, visor fosc amb ulls grocs de pupil·la negra i cella enfadada, boca de dents metàl·liques amb `repeating-linear-gradient`, antena rodona amb tija) — és la Plana Model CSS objectiu, capturat íntegrament a les decisions D-01 a D-10.
- **Metàfora de la frase JS llegible**: "Quan [event] a [origen] → a l'element [destí] → Fes [acció]" es llegeix com llenguatge natural, seguint el mateix esperit "sense sintaxi lliure, però real" que el CSS foradat i els blocs HTML.
- **Accions compostes amb nom** com a manera d'oferir efectes visuals rics (multi-element) sense exposar complexitat de selecció múltiple a l'alumne — la complexitat viu a la definició de l'acció, no a la interacció de l'alumne.
- **Puntuació "de tresor amagat"**: 1-2 accions bonus que l'alumne no coneix incentiven l'exploració real en lloc de fer l'estratègia òbvia (omplir totes les combinacions mecànicament).

</specifics>

<deferred>
## Deferred Ideas

- **SCORE-03** (`REQUIREMENTS.md`) està redactat assumint un match contra una única tripleta objectiu ("verificar semànticament la tripleta esdeveniment + element + acció"). El model decidit aquí (D-11: obert/variety-based + bonus ocult) el contradiu parcialment — cal revisar/matisar la redacció de SCORE-03 quan es faci `/gsd-discuss-phase 4`, no en aquesta fase.
- **Botó "Llest!" per a CSS/JS** (GAME-08) — ja constava com a idea explícitament diferida a `REQUIREMENTS.md` ("es deixa com a idea diferida fins veure com funciona a HTML"); no s'ha reobert en aquesta discussió.
- Cap capacitat nova fora d'abast: el motor de puntuació real (Fase 4) i el desplegament (Fase 5) ja tenen les seves pròpies fases.

</deferred>

---

*Phase: 3-Joc — Fases CSS i JS*
*Context gathered: 2026-07-04*
