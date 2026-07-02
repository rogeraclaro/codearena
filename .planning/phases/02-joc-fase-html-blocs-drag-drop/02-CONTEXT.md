# Phase 2: Joc — Fase HTML (blocs drag & drop) - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Aquesta fase entrega la **Fase HTML jugable** de CodeArena: els equips munten l'esquelet d'una **Plana Model = cap de robot** arrossegant peces predefinides des d'un **calaix** (safata d'origen) cap a un **tauler de slots niats** (estructura de destí), amb snap fort i **cap escriptura lliure de codi**. La preview de la dreta (canonada iframe de la Fase 1) es re-renderitza a l'instant amb cada peça.

**Dins d'abast:** l'exercici HTML fix del cap de robot; el calaix de peces (8 bones + 2-3 distractors); el tauler de slots pre-construït pel sistema; la mecànica drag & drop amb snap imant+rebot i treure peça; el render en viu a la preview; el progrés propi (N/8) a la pantalla d'equip i el progrés N/8 al card de l'Admin; la persistència de l'estat de col·locació al servidor per a recuperació (F5).

**Fora d'abast (altres fases):** Fase CSS (codi foradat, color pickers/sliders) i Fase JS (regles "Quan X → Y → Z") — Fase 3; motor de puntuació que compara el DOM de l'equip amb la Plana Model — Fase 4; desplegament — Fase 5. Aquesta fase **produeix** el DOM que CSS/JS estilaran i que Fase 4 puntuarà, però no implementa ni estil ni scoring.

**Requisits mapejats:** GAME-03 (snap fort), GAME-06 (cap escriptura lliure).

</domain>

<decisions>
## Implementation Decisions

### Plana Model canònica (l'exercici HTML fix)
- **D-01:** La Plana Model és un **cap de robot** amb aquesta estructura exacta (fixada al codi, igual per a tots els equips — 1 exercici fix, PROJECT.md):
  ```html
  <section id="robot-contenidor">
    <img src="antena.png" alt="Antena esquerra" class="antena" id="antena-esquerra">
    <img src="antena.png" alt="Antena dreta"    class="antena" id="antena-dreta">
    <img src="orella.png" alt="Orella esquerra" class="orella" id="orella-esquerra">
    <img src="orella.png" alt="Orella dreta"    class="orella" id="orella-dreta">
    <div id="robot-cap">
      <div class="contenidor-ulls">
        <span class="ull"></span>
        <span class="ull"></span>
      </div>
      <button id="nas"></button>
      <output id="boca">BEEP BEEP</output>
    </div>
  </section>
  ```
- **D-02:** `#robot-cap` és un **`<div>`**, no un `<article>` (canvi respecte a la proposta inicial): `<article>` significa contingut autònom/redistribuïble i seria semànticament fals per a "cap". La resta de tags es mantenen: `<img>`+`alt` (antenes/orelles), `<button>` (nas), `<output>` (boca) — aquest últim és un encert semàntic perquè a la Fase JS "clic al nas → actualitza la boca" i `<output>` = resultat d'una acció de l'usuari.
- **D-03:** Hi ha una **imatge de fons fixa** darrere del robot, proporcionada pel projecte. És una **capa del sistema dins la preview**, NO manipulable per l'alumne, NO és cap peça del calaix i NO puntua.
- **D-04:** El text intern és **fix i predefinit** ("BEEP BEEP" a `<output id="boca">`), coherent amb GAME-06 (cap text lliure). Els `src`/`alt` de les imatges també són predefinits.
- **D-05:** El **`<button id="nas">` és l'element interactiu** reservat per a la Fase JS (origen natural del clic "Quan es faci clic al nas → element Y → Fes Z"). Es fixa ja aquí per no reobrir l'estructura a la Fase 3.

### Abast del muntatge i model d'encaix
- **D-06:** **Nivell de complexitat = Tier A ("Munta la cara").** El sistema **pre-construeix** el fons fix i **tots els contenidors** (`section#robot-contenidor`, `div#robot-cap`, `div.contenidor-ulls`) com a **tauler de slots niats visibles**. L'alumne només col·loca les **8 peces fulla**: 2 antenes, 2 orelles, 2 ulls, nas, boca. *(Revisa la idea inicial d'"arbre complet des de zero", descartada per massa càrrega cognitiva per al públic: adults de ~40 anys sense cap experiència amb ~10 min de xerrada prèvia. El concepte car és construir la jerarquia abstracta "dins de… dins de…", no el nombre de peces.)*
- **D-07:** **Identitat pel slot.** Les peces del calaix són **genèriques per tipus** (una "antena", una "orella", un "ull"…). En encaixar en un slot, la peça **hereta l'id/class correcte** segons la posició (`antena-esquerra` vs `antena-dreta`, etc.). L'esquerra/dreta NO és decisió de l'alumne sinó del forat; garanteix ids correctes per a CSS/JS/scoring i evita que un principiant confongui esquerra/dreta.
- **D-08:** **Tots els slots visibles des de l'inici** (no revelat progressiu), perquè els contenidors ja venen pre-construïts (conseqüència de D-06).
- **D-09:** **Snap fort = imant + rebot** (satisfà GAME-03, que admet les dues opcions): si la peça es deixa A PROP del seu forat vàlid, hi entra sola (imant, perdona la punteria); si es deixa lluny o sobre un forat incorrecte, **torna suaument al calaix**. Mai queda mal col·locada → impossible muntar estructura mal formada.
- **D-10:** **Es pot treure una peça ja col·locada** (clic o arrossegar-la fora del forat → torna al calaix). El comptador N/8 baixa en conseqüència. Suport explícit al "sense frustració" (poder refer).

### Distractors (peces esquer)
- **D-11:** El calaix inclou, barrejades amb les 8 bones, **2-3 peces distractores obvies/comiques** (banana, roda, sabata…) clarament alienes a un robot. **No tenen cap forat vàlid** al tauler → amb l'snap imant+rebot **sempre reboten al calaix**, sense mecànica ni missatge d'error nous. Afegeixen una decisió mínima ("això no hi va") amb gràcia i sense frustració, dins del límit de "mínim soroll visual" (UX-01). Idea explícita de l'usuari.

### Representació i feedback
- **D-12:** L'etiqueta d'una peça/forat és el seu **tag+class real** (`antena`, `orella`, `ull`, `contenidor-ulls`, `nas`, `boca`), que ja és descriptiu → serveix de etiqueta per si mateix (unifica "nom amable" i "tag": una decisió menys). **Només lectura**, mai editable (respecta el nucli anti-sintaxi del projecte). El detall visual exacte (chip net sense puntuació `< >` vs. tira de codi read-only que "s'escriu sola") queda a discreció fina d'UI/planner; totes dues respecten "real, descriptiu, mai editable".
- **D-13:** **La preview de la dreta mostra el robot REAL renderitzat** (canonada iframe srcdoc de la Fase 1, reutilitzada — SC-2). Es descarta una preview esquemàtica. Conseqüència coneguda: antenes/orelles (imatges) i "BEEP BEEP" es veuen a l'instant, però `span.ull` i `button#nas` buits **no es veuen fins a la Fase CSS**. Aquesta asimetria la cobreix el tauler de slots de l'esquerra (D-14), on tota col·locació és sempre visible.

### Layout de la pantalla d'equip (sobre el split de Fase 1)
- **D-14:** **Esquerra (panell d'acció ~40%):** calaix (safata d'origen de peces) + tauler de slots niats (destí) + **progrés propi N/8** + **pista/animació inicial** (fletxa "peça → forat" o text molt curt la 1a vegada, que desapareix en col·locar la primera peça). **Dreta (~60%):** robot real renderitzat. **Sense** miniatura d'objectiu (el professor ja projecta la Plana Model; s'evita soroll extra).
- **D-15:** El **progrés de l'equip al card de l'Admin** durant la Fase HTML = **"N/8 peces"** (només les bones). Omple l'espai de "progrés dins la fase" **reservat a la Fase 1 (D-08 de Fase 1)** sense refer el disseny del card. Comparable d'un cop d'ull entre equips.

### Claude's Discretion
- **Detall visual de l'etiqueta** tag+class (chip vs codi read-only) — vegeu D-12.
- **Estètica concreta** de peces, tauler, animació de snap, i de la pista inicial: a criteri d'UI/planner, respectant "iconografia clara, text mínim" (UX-01) i coherència visual amb la Fase 1.
- **Detall de com es mostren els distractors rebotant** (petit shake, so, etc.): a criteri d'UI, sempre que quedi clar que "no hi van".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visió, requisits i abast de fase
- `.planning/PROJECT.md` — Core Value, Context d'aula (públic de FP sense experiència; adults ~40 anys amb ~10 min de xerrada prèvia — driver clau de la simplicitat, vegeu D-06), Constraints (UX de càrrega cognitiva mínima, snap fort), i Out of Scope (cap escriptura lliure; 1 exercici fix).
- `.planning/REQUIREMENTS.md` §Mecànica de joc — **GAME-03** (snap fort: bloc invàlid torna al calaix o encaixa al slot vàlid més proper) i **GAME-06** (cap escriptura lliure) són els requisits d'aquesta fase. Context útil: GAME-01/GAME-02 (Fase 1), GAME-04/05/07 (Fase 3, aigües avall).
- `.planning/ROADMAP.md` §Phase 2 — Goal i els 3 Success Criteria; nota clau "reutilitzant la canonada de Fase 1" (SC-2).

### Context de la Fase 1 (fonamental — aquesta fase omple la closca que va deixar)
- `.planning/phases/01-nucli-en-temps-real-i-control-de-sessi/01-CONTEXT.md` — decisions de Fase 1. Especialment: D-05/D-06 (estats de pantalla espera/interstici), **D-08 (espai de "progrés dins la fase" reservat al card d'Admin — aquesta fase el materialitza, vegeu D-15)**, D-11 (congelació a zero sense auto-avanç; el robot parcial queda "tal com està" i viatja a CSS/JS).

### Stack tècnic (decidit)
- `.claude/CLAUDE.md` §Technology Stack — **SortableJS 1.15.x** (drag & drop framework-agnostic; patró `group`/`put`/`pull` i "snap back to drawer if invalid" documentat com a exactament aquest cas d'ús), **DOMPurify 3.x** (sanejar l'HTML assemblat abans d'injectar-lo al `srcdoc`), iconografia **Lucide/Feather**. Nota: preview = iframe `sandbox` + `srcdoc`, patró d'estat en memòria al servidor (Maps/objectes JS, sense DB).

*No hi ha ADRs ni specs externs addicionals — les decisions queden capturades a la secció Implementation Decisions.*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/client/client.js` → `renderActiveSplitScreen()` — ja crea el split panell d'acció (esquerra) + `iframe.preview-frame` (`sandbox="allow-same-origin"`, `srcdoc` buit) a la dreta. **Aquesta és la closca a omplir**: la Fase 2 injecta l'HTML del robot al `srcdoc` (via DOMPurify) i construeix el calaix + tauler dins de `.action-panel`. El comentari del codi ja anticipa "les Fases 2-5 reutilitzaran omplint-la amb contingut real via DOMPurify".
- `src/client/client.js` → màquina d'estats derivada NOMÉS de `session:full-state` — la Fase 2 ha de mantenir aquest principi: **el client no decideix cap transició pel seu compte**; el render de peces col·locades es deriva de l'estat autoritatiu.
- `src/server/gameState.js` → `teams` Map amb camp **`progress` (avui `null`)** i projecció explícita `getPublicState()`. Aquest camp és l'espai reservat per al progrés N/8 (D-15) i, més important, per a l'estat de col·locació (vegeu Integration Points).
- `src/client/shared/tokens.css` + `client.css` — tokens de disseny (espais, colors, `--hit-target-min`) i estils del split ja establerts; reutilitzar-los per coherència visual.

### Established Patterns
- **Estat autoritatiu al servidor, client com a capa de render** (Fase 1). Tota mutació passa per un handler de socket que muta `gameState` i re-broadcast `session:full-state` només quan hi ha canvi real.
- **DOM text API only (anti-XSS)** — Fase 1 usa `textContent`/`createElement`, mai `innerHTML` amb dades. La Fase 2, en assemblar HTML per al `srcdoc`, ha de passar per **DOMPurify** (defense-in-depth, ja previst).
- **Projecció explícita** `getPublicState()` — mai s'emet l'estat intern cru ni el token.

### Integration Points
- **NOU estat autoritatiu de col·locació per equip:** quina peça ocupa quin slot ha de viure a `gameState` (per equip) i entrar a `getPublicState()`, perquè un **F5 / reconnexió recuperi el robot mig muntat** sense intervenció (CORE-03, principi central de Fase 1). Avui `teams[].progress` és `null` — cal decidir l'estructura (p.ex. un mapa slot→peça per equip) i el/s esdeveniment/s de socket per col·locar/treure peça. **Territori de research/planning.**
- **Canonada de preview:** l'HTML assemblat (contenidors pre-fets + peces col·locades) es serialitza al `srcdoc` de l'iframe existent, via DOMPurify. Els contenidors i el fons fix formen part del scaffold; les peces s'hi insereixen segons l'estat de col·locació.
- **Congelació (D-11 Fase 1):** a timer zero, l'overlay de congelat ja existent bloqueja el drag & drop; el robot parcial queda "tal com està" per a GAME-07 (Fase 3).

</code_context>

<specifics>
## Specific Ideas

- **Metàfora "Mr. Potato Head"**: muntar la cara del robot col·locant peces reconeixibles en forats — el que fa la fase intuïtiva i divertida sense ser un examen. Els forats type-checked + snap la converteixen en un trencaclosques guiat on **no pots equivocar-te d'estructura**.
- **Distractors com a gràcia pedagògica** (idea explícita de l'usuari): peces òbviament alienes (banana, roda…) que reboten sempre, per introduir la idea "no tot forma part d'aquesta estructura" amb humor i sense frustració.
- **Etiquetes = tag+class real** (idea explícita de l'usuari): aprofitar que els noms de class/id ja són descriptius per ensenyar "això és HTML de veritat" sense inventar vocabulari paral·lel.
- **Doble lectura estructura↔recompensa**: esquerra = noms HTML reals mentre muntes (estructura); dreta = el robot que pren forma (motivació).
- **Preocupació rectora del públic**: adults ~40 anys, sense res de base, ~10 min de xerrada. Cada decisió de complexitat s'ha resolt a favor de "sense frustració" (Tier A, snap indulgent, distractors obvis, poder desfer).

</specifics>

<deferred>
## Deferred Ideas

- **Miniatura d'objectiu a la pantalla d'equip** — considerada i **descartada** per aquesta fase (el professor ja projecta la Plana Model; s'evita soroll visual). Es podria reconsiderar si a l'aula real es detecta que projectar no basta.
- **Distractors subtils / més nombrosos** — descartats a favor de pocs i obvis per al públic actual; possible palanca de dificultat per a una versió futura amb públic més avançat.
- Cap capacitat nova fora d'abast: CSS foradat, regles JS, scoring i desplegament ja tenen les seves pròpies fases (3, 4, 5).

</deferred>

---

*Phase: 2-Joc — Fase HTML (blocs drag & drop)*
*Context gathered: 2026-07-02*
