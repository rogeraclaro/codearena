# Phase 2: Joc — Fase HTML (blocs drag & drop) - Research

**Researched:** 2026-07-02
**Domain:** Client-side drag & drop (SortableJS) + authoritative per-team placement state over Socket.io + sanitized iframe `srcdoc` preview
**Confidence:** HIGH (codebase-grounded), MEDIUM (SortableJS/DOMPurify exact option behavior — verified on registry, API tagged where training-derived)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Plana Model = **cap de robot**, estructura HTML EXACTA (fixada al codi, igual per a tots): `section#robot-contenidor` amb 2 `img.antena` (`#antena-esquerra`/`#antena-dreta`), 2 `img.orella` (`#orella-esquerra`/`#orella-dreta`), `div#robot-cap` que conté `div.contenidor-ulls` amb 2 `span.ull`, `button#nas`, i `output#boca` amb text "BEEP BEEP".
- **D-02:** `#robot-cap` és un **`<div>`** (no `<article>`). Resta de tags es mantenen: `<img>`+`alt`, `<button>` (nas), `<output>` (boca).
- **D-03:** Imatge de **fons fixa** darrere el robot, capa del sistema dins la preview, NO manipulable, NO és peça del calaix, NO puntua.
- **D-04:** Text intern **fix i predefinit** ("BEEP BEEP"); `src`/`alt` predefinits (coherent GAME-06).
- **D-05:** `button#nas` és l'element interactiu reservat per a la Fase JS; es fixa ja aquí.
- **D-06:** **Tier A ("Munta la cara").** El sistema PRE-CONSTRUEIX fons + TOTS els contenidors (`section#robot-contenidor`, `div#robot-cap`, `div.contenidor-ulls`) com a tauler de slots niats visibles. L'alumne només col·loca les **8 peces fulla**: 2 antenes, 2 orelles, 2 ulls, nas, boca.
- **D-07:** **Identitat pel slot.** Peces del calaix són **genèriques per tipus**; en encaixar hereten l'id/class correcte segons posició. Esquerra/dreta el decideix el forat, no l'alumne.
- **D-08:** **Tots els slots visibles des de l'inici** (no revelat progressiu).
- **D-09:** **Snap fort = imant + rebot.** A prop d'un forat vàlid → hi entra sol (imant); lluny o sobre forat incorrecte → torna suaument al calaix. Mai queda mal col·locada.
- **D-10:** **Es pot treure una peça col·locada** (clic o arrossegar fora → torna al calaix); N/8 baixa.
- **D-11:** Calaix inclou **2-3 distractors obvis** (banana, roda, sabata…) SENSE cap forat vàlid → sempre reboten al calaix, sense mecànica ni missatge d'error nous.
- **D-12:** L'etiqueta d'una peça/forat = el seu **tag+class real** (`antena`, `orella`, `ull`, `contenidor-ulls`, `nas`, `boca`). **Només lectura, mai editable.** Detall visual (chip vs codi read-only) a discreció d'UI.
- **D-13:** Preview de la dreta mostra el **robot REAL renderitzat** (canonada iframe `srcdoc` de Fase 1, reutilitzada, SC-2). Conseqüència: `span.ull` i `button#nas` buits NO es veuen fins a Fase CSS; ho cobreix el tauler de l'esquerra.
- **D-14:** **Esquerra (~40%):** calaix + tauler de slots niats + progrés propi N/8 + pista/animació inicial (desapareix en col·locar la 1a peça). **Dreta (~60%):** robot real. **Sense** miniatura d'objectiu.
- **D-15:** Progrés al card d'Admin durant Fase HTML = **"N/8 peces"** (només les bones). Omple l'espai reservat a Fase 1 (D-08 de Fase 1) sense refer el disseny del card.

### Claude's Discretion
- Detall visual de l'etiqueta tag+class (chip vs codi read-only) — D-12.
- Estètica concreta de peces, tauler, animació de snap, pista inicial (respectant UX-01 "iconografia clara, text mínim" i coherència amb Fase 1).
- Detall de com es mostren els distractors rebotant (shake, so, etc.) — sempre que quedi clar que "no hi van".

### Deferred Ideas (OUT OF SCOPE)
- Miniatura d'objectiu a la pantalla d'equip — descartada aquesta fase.
- Distractors subtils / més nombrosos — descartats a favor de pocs i obvis.
- Cap capacitat nova fora d'abast: CSS foradat, regles JS, scoring, desplegament → Fases 3, 4, 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAME-03 | Fase HTML: blocs drag & drop amb snap fort — un bloc en lloc invàlid torna al calaix o encaixa a l'slot vàlid més proper | SortableJS `group.put` (funció de type-check per slot) + `emptyInsertThreshold` (imant) + revert natiu quan cap llista accepta (rebot). Pattern 1 + Code Examples. |
| GAME-06 | Cap fase permet escriptura lliure de codi | Totes les interaccions són chips predefinits arrossegables; cap `<input>`/`contenteditable`; contingut de peça 100% fix (D-04). Preview assemblada des d'una taula-plantilla fixa slot→element, mai des de text d'usuari. Anti-Pattern "input lliure". |
</phase_requirements>

## Summary

Aquesta fase omple la closca que va deixar la Fase 1: `renderActiveSplitScreen()` a `src/client/client.js` ja crea el split (panell d'acció ~40% esquerra + `iframe.preview-frame` amb `srcdoc` buit a la dreta). La Fase 2 hi construeix, dins `.action-panel`, un **calaix** (llista d'origen SortableJS) + un **tauler de 8 slots niats type-checked** (cada slot una micro-llista SortableJS amb capacitat 1), i injecta el robot real al `srcdoc` via **DOMPurify** a partir d'una taula-plantilla fixa slot→element.

La mecànica GAME-03 (imant+rebot) es mapeja gairebé 1:1 a opcions natives de SortableJS: `group.put` com a **funció** fa el type-check per slot (un slot només accepta el seu tipus i només si és buit), `emptyInsertThreshold` fa l'**imant** (agafa la peça des de més lluny d'un slot buit), i el **revert natiu** de SortableJS (quan cap llista accepta el drop la peça torna a la seva posició d'origen al calaix) és exactament el **rebot** — inclosos els distractors (D-11), que amb un `data-type` que cap slot accepta reboten sols, sense codi especial ni missatge d'error.

El punt arquitectònic crític és l'**estat autoritatiu de col·locació per equip** i com evitar una **tempesta de re-render entre equips**: avui el client fa teardown+rebuild COMPLET a cada `session:full-state`, i aquest esdeveniment es difon a tota la room `session`. Si les col·locacions es difonguessin a `session`, cada peça que col·loca l'Equip B destruiria i recrearia les instàncies SortableJS de l'Equip A a mig drag. La recomanació: la placa (mapa slot→tipus) viu al servidor per equip, es projecta **dirigida NOMÉS a la room de l'equip** (event nou `team:board-state`) i **a l'admin** (per al N/8), MAI a tota la `session`. Cap equip sap res dels altres → zero tempesta.

**Primary recommendation:** Modela cada slot com una instància SortableJS pròpia (capacitat 1) amb `group.put` de type-check + `emptyInsertThreshold` per l'imant; deixa el rebot al revert natiu; guarda `team.placement` (slot→tipus) al servidor i difon-lo dirigit via `team:board-state` a la room de l'equip + `session:full-state` (amb el count N/8) NOMÉS a l'admin; assembla el `srcdoc` al client des d'una taula-plantilla fixa passada per DOMPurify. **No difonguis mai les col·locacions a tota la `session`, i no facis teardown del tauler a `session:full-state`.**

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gest de drag & drop (imant, rebot, type-check visual) | Browser / Client (SortableJS) | — | És pura interacció de punter sobre el DOM; SortableJS és client-only. El servidor no participa en el gest. |
| Autoritat de col·locació (quina peça a quin slot) | API / Backend (`gameState.js`) | — | Principi central de Fase 1: estat autoritatiu al servidor; el client emet intents. F5/reconnexió reconstrueix des d'aquí (CORE-03). |
| Validació del place/remove (enum de slot/tipus, fase, congelat) | API / Backend (`socketHandlers.js`) | — | V5 (validació d'entrada) + V4 (mai confiar en el client); coherent amb els handlers admin existents. |
| Progrés N/8 (comptador) | API / Backend (deriva de `placement`) | Client / Admin (render) | El count és autoritatiu (deriva del mapa al servidor); client i admin només el pinten. |
| Assemblatge + sanejament del preview HTML | Browser / Client (`client.js` + DOMPurify) | — | D-13/SC-2: reutilitza la canonada iframe de client. El servidor no renderitza HTML aquesta fase (només guarda slot→tipus). |
| Plantilla canònica slot→element | Shared module (importat pel client; disponible per Fase 4) | — | Font única de la veritat de l'estructura (D-01). Fase 4 la reutilitzarà per puntuar server-side. |
| Congelació del drag a timer zero | Browser / Client (deriva de `session:full-state`) | — | D-11 Fase 1: `timerStatus==='frozen'` → desactiva SortableJS; l'overlay ja existeix. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sortablejs | 1.15.7 | Drag & drop del calaix→slots amb type-check i imant | Decidit a `.claude/CLAUDE.md`. Framework-agnostic (import ESM directe, sense adaptador), ~4.0M descàrregues/setmana, repo `SortableJS/Sortable`. `group`/`put`/`pull` + `emptyInsertThreshold` mapegen GAME-03 gairebé sense codi custom. [VERIFIED: npm registry] |
| dompurify | 3.4.11 | Sanejar l'HTML assemblat abans d'injectar-lo al `srcdoc` (defense-in-depth) | Decidit a `.claude/CLAUDE.md`. Sanitizer de referència (mantingut per cure53), ~45M descàrregues/setmana, repo `cure53/DOMPurify`. [VERIFIED: npm registry] — vegeu Package Legitimacy Audit (flag "too-new" = fals positiu de recència de versió). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide | 1.23.0 (ja instal·lat) | Iconografia de peces/pista (UX-01) | Ja al `package.json` i usat a `admin.js`/`client.js` via `createElement(Icon)`. Reutilitza per a icones de peça o de la pista inicial. Nota: pot no tenir icones exactes per banana/roda/sabata → per als distractors, considera emoji o SVG inline (discreció UI). [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SortableJS | interact.js | `.claude/CLAUDE.md` §What NOT to Use el descarta explícitament (sense manteniment ~2 anys). NO usar. |
| SortableJS (múltiples slots) | 1 sol Sortable amb lògica custom de zones | Perdria el type-check natiu per llista i el revert natiu; més codi, més fràgil. Un Sortable per slot és el patró idiomàtic per a "una peça per forat". |
| DOMPurify | Assemblatge amb DOM API segura (createElement/textContent) sense sanitizer | Vàlid tècnicament (el contingut és 100% controlat), però CLAUDE.md ha decidit DOMPurify com a defense-in-depth. Segueix la decisió. |

**Installation:**
```bash
npm install sortablejs@1.15.7 dompurify@3.4.11
```
(Fixa versions exactes; ambdues verificades al registre npm el 2026-07-02.)

**Version verification (executat aquesta sessió):**
- `npm view sortablejs version` → `1.15.7` (modificat 2026-02-11) [VERIFIED: npm registry]
- `npm view dompurify version` → `3.4.11` (modificat 2026-06-17) [VERIFIED: npm registry]
- Cap `postinstall` en cap dels dos paquets. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| sortablejs | npm | 2026-02-11 | ~4.0M/wk | github.com/SortableJS/Sortable | OK | Approved |
| dompurify | npm | 2026-06-17 | ~45.7M/wk | github.com/cure53/DOMPurify | SUS ("too-new") | Approved amb nota — vegeu sota |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `dompurify` — la seam el marca `SUS` amb l'única raó `too-new`, que reflecteix la **data de publicació de la versió més recent (3.4.11, jun 2026)**, no l'edat del paquet. DOMPurify és un projecte de molts anys, mantingut per cure53, amb ~45.7M descàrregues/setmana i repo font públic — no és cap slopsquat. És un **fals positiu de la heurística de recència**. Recomanació: instal·la fixant la versió exacta `3.4.11` (o l'última verificada al moment de planificar). El planner **pot ometre el `checkpoint:human-verify`** per a aquest paquet donada l'evidència (downloads massius + cure53 + decisió de stack a CLAUDE.md), però ha de deixar constància del raonament al PLAN.

## Architecture Patterns

### System Architecture Diagram

```
  ┌─────────────────────────── CLIENT (team browser) ───────────────────────────┐
  │                                                                              │
  │  .action-panel (esquerra ~40%)                    iframe.preview-frame (~60%)│
  │  ┌────────────────────────────────┐               ┌─────────────────────────┐│
  │  │ CALAIX (Sortable, origen)      │  drag/drop    │ srcdoc = DOMPurify(      ││
  │  │  [antena][antena][orella]...   │◄──────────────┤   plantilla fixa +      ││
  │  │  [banana][roda]  (distractors) │   gest local  │   peces col·locades)    ││
  │  ├────────────────────────────────┤   (SortableJS)│  → robot REAL renderitzat││
  │  │ TAULER (8 slots niats)         │               └─────────────────────────┘│
  │  │  cada slot = Sortable cap.1    │                          ▲                │
  │  │  group.put = type-check        │                          │ re-assembla    │
  │  │  emptyInsertThreshold = imant  │                          │ des de board   │
  │  │ N/8 progrés propi              │                          │                │
  │  └───────────┬────────────────────┘                          │                │
  │              │ onAdd/onRemove/click                           │                │
  │              │ emet INTENT                       team:board-state (dirigit)    │
  └──────────────┼────────────────────────────────────────────────▲──────────────┘
                 │ team:place-piece {slotId,pieceType}             │
                 │ team:remove-piece {slotId}                      │ (nomes a
                 ▼                                                 │  team:${id})
  ┌─────────────────────────── SERVER (Node + Socket.io) ─────────┼──────────────┐
  │  socketHandlers.js  ──valida (fase html? no frozen? slot      │              │
  │   enum? tipus? slot buit?)──►  gameState.js                    │              │
  │                                 team.placement = {slot: type}  │              │
  │                                 (AUTORITATIU, per equip)       │              │
  │                                        │                       │              │
  │                    ┌───────────────────┴────────────────┐      │              │
  │                    ▼ team:board-state → team:${id} ──────┘      │              │
  │                    ▼ session:full-state → NOMÉS 'admin'  (card N/8, D-15)      │
  │   getPublicState(): teams[].progress = {placed, total:8}                      │
  │   Reconnexió (io.on connection): emet team:board-state a l'equip → F5 recupera│
  │                                  el robot mig muntat (CORE-03)                 │
  └──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── shared/
│   └── robotTemplate.js   # NOU — plantilla canònica: SLOTS[] (id, accepts, canonical element factory),
│                          #        PIECES[] (tipus + counts del calaix), DISTRACTORS[].
│                          #        Importat pel client (assemblar preview + construir calaix/tauler).
│                          #        Reutilitzable per Fase 4 (scoring) i pel servidor si mai cal.
├── client/
│   ├── client.js          # amplia renderActiveSplitScreen(): construeix calaix+tauler dins .action-panel
│   │                      #   quan phase==='html', inicialitza SortableJS, assembla srcdoc via DOMPurify.
│   │                      #   Desacobla: session:full-state → update lleuger (timer/frozen/N-8);
│   │                      #              team:board-state → (re)render del tauler+calaix.
│   ├── client.css         # estils del calaix, slots, chips tag+class, pista, animació de snap
│   └── shared/…           # (tokens.css, timer.js — reutilitzats)
└── server/
    ├── gameState.js       # team.placement (Map/obj), placePiece/removePiece, progress a getPublicState()
    ├── socketHandlers.js  # handlers team:place-piece / team:remove-piece + emissió dirigida board-state
    └── events.js          # +TEAM_PLACE_PIECE, TEAM_REMOVE_PIECE, TEAM_BOARD_STATE
```

### Pattern 1: Un Sortable per slot amb type-check natiu + imant + rebot (GAME-03)
**What:** Cada forat del tauler és una instància SortableJS pròpia amb capacitat 1. El calaix és una instància origen. El type-check, l'imant i el rebot són opcions natives.
**When to use:** Sempre per a aquesta fase — és el patró idiomàtic "una peça per forat amb validació de tipus".
**Example:**
```javascript
// [CITED: https://github.com/SortableJS/Sortable#options] group.put com a funció,
// emptyInsertThreshold, animation. Comportament de revert = natiu quan cap llista accepta.
import Sortable from 'sortablejs';

// CALAIX (origen): pot donar peces; accepta el retorn de peces (D-10).
new Sortable(calaixEl, {
  group: { name: 'robot', pull: true, put: true },
  sort: false,
  animation: 150,                 // snap suau (D-09 "torna suaument")
  emptyInsertThreshold: 40,       // imant també per tornar al calaix
  onAdd: (evt) => {
    // Una peça ha tornat al calaix des d'un slot → treure-la (D-10).
    const fromSlot = evt.from?.dataset?.slotId;
    if (fromSlot) socket.emit(EVENTS.TEAM_REMOVE_PIECE, { slotId: fromSlot });
  },
});

// SLOT (destí): accepta NOMÉS el seu tipus i NOMÉS si és buit.
new Sortable(slotEl, {          // slotEl.dataset.slotId, slotEl.dataset.accepts
  group: {
    name: 'robot',
    pull: true,                  // permet treure la peça un cop col·locada (D-10)
    put: (to, _from, dragEl) =>
      to.el.children.length === 0 &&                       // capacitat 1
      dragEl.dataset.type === to.el.dataset.accepts,       // type-check (D-07)
  },
  sort: false,
  animation: 150,
  emptyInsertThreshold: 40,       // IMANT (D-09): agafa la peça des de ~40px lluny del slot buit
  onAdd: (evt) => {
    socket.emit(EVENTS.TEAM_PLACE_PIECE, {
      slotId: evt.to.dataset.slotId,
      pieceType: evt.item.dataset.type,
    });
  },
});
```
- **Imant (D-09):** `emptyInsertThreshold` (px) és el radi amb què un slot BUIT "agafa" la peça — puja'l (ex. 40) per "perdonar la punteria". [CITED: SortableJS options]
- **Rebot (D-09/D-11):** quan cap slot accepta el drop (tipus incorrecte, slot ple, o distractor sense forat), SortableJS **reverteix** la peça a la seva posició d'origen al calaix, sense codi custom. Els distractors tenen `data-type` (ex. `banana`) que cap `data-accepts` iguala → sempre reboten. [ASSUMED — revert-on-reject és el comportament documentat; verifica-ho amb un test manual ràpid a Wave 0]
- **Identitat pel slot (D-07):** el chip del calaix porta `data-type` genèric (`antena`); el servidor, en rebre `place-piece`, deriva l'element canònic (id/class) des de la plantilla del `slotId` (ex. `antena-esquerra`). El client mai decideix esquerra/dreta.

### Pattern 2: Placa autoritativa per equip + projecció DIRIGIDA (evita la tempesta de re-render)
**What:** El mapa slot→tipus viu al servidor per equip; es projecta dirigit a la room de l'equip (board complet) i a l'admin (només el count), MAI a tota la `session`.
**When to use:** Sempre — és el que fa segur reutilitzar el patró de Fase 1 sense que els equips es trepitgin.
**Example:**
```javascript
// gameState.js — estat autoritatiu (afegir a l'objecte team i a getPublicState)
// team = { id, name, claimed, connected, placement: {} }   // {} = slot→tipus
function placePiece(teamId, slotId, pieceType) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'html' || state.timerStatus === 'frozen') return false; // GAME-07/D-11
  const slot = SLOTS.find((s) => s.id === slotId);            // enum de la plantilla (V5)
  if (!slot || slot.accepts !== pieceType) return false;      // type-check server-side
  if (team.placement[slotId]) return false;                   // slot ja ocupat
  if (countAvailable(team, pieceType) <= 0) return false;     // inventari (2 antenes màx, etc.)
  team.placement[slotId] = pieceType;
  return true;
}

// getPublicState(): progress = comptador N/8 (segur difondre a tothom — no revela el board)
progress: state.phase === 'html'
  ? { placed: Object.keys(team.placement).length, total: SLOTS.length } // SLOTS.length === 8
  : null,

// projecció dirigida del board (NOMÉS a l'owner) — mai a 'session'
function getTeamBoard(teamId) {
  const team = state.teams.get(teamId);
  return { placement: { ...team.placement } };
}
```
```javascript
// socketHandlers.js — en un place/remove reeixit:
if (gameState.placePiece(teamId, slotId, pieceType)) {
  io.to(`team:${teamId}`).emit(EVENTS.TEAM_BOARD_STATE, gameState.getTeamBoard(teamId)); // board privat
  io.to('admin').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());            // card N/8 (D-15)
  // ⚠️ MAI io.to('session') per a col·locacions → evita destruir el drag d'altres equips
}

// En connexió/reconnexió d'un equip (dins io.on('connection')), afegir:
if (socket.data.teamId) {
  socket.emit(EVENTS.TEAM_BOARD_STATE, gameState.getTeamBoard(socket.data.teamId)); // F5 recupera el robot (CORE-03)
}
```

### Pattern 3: Assemblatge del preview des de plantilla fixa + DOMPurify (D-13, GAME-06)
**What:** El client construeix l'string HTML del robot des de la plantilla canònica (contenidors + fons fix + peces col·locades segons el board), el passa per DOMPurify i el posa a `srcdoc`.
**When to use:** A cada `team:board-state` (i en entrar a la fase). Reutilitza l'`iframe.preview-frame` existent.
**Example:**
```javascript
// [CITED: https://github.com/cure53/DOMPurify#can-i-configure-dompurify]
import DOMPurify from 'dompurify';

function assemblePreview(placement) {
  const inner = SLOTS.map((s) => placement[s.id] ? s.html : '').join('');
  const raw = `
    <section id="robot-contenidor">
      ${topLevelPieces(placement)}     <!-- antenes/orelles (fills directes de section) -->
      <div id="robot-cap">
        <div class="contenidor-ulls">${eyePieces(placement)}</div>
        ${placement.nas ? '<button id="nas"></button>' : ''}
        ${placement.boca ? '<output id="boca">BEEP BEEP</output>' : ''}
      </div>
    </section>`;
  const clean = DOMPurify.sanitize(raw, {
    ADD_TAGS: ['output'],                 // [ASSUMED] verifica si 'output' cau del perfil per defecte
    ALLOWED_ATTR: ['src', 'alt', 'class', 'id'], // ids/classes HAN de sobreviure (scoring Fase 4)
  });
  const frame = document.querySelector('.preview-frame');
  frame.setAttribute('srcdoc', wrapWithBackgroundAndStyles(clean)); // fons fix D-03 = capa de sistema
}
```
- El fons fix (D-03) i qualsevol CSS d'estructura formen part del scaffold que envolta `clean` — NO passen pel board ni puntuen.
- La preview és `sandbox="allow-same-origin"` **sense `allow-scripts`** (estat actual del codi) → cap script s'executaria encara que sobrevisqués; DOMPurify és defense-in-depth (coherent amb la decisió de CLAUDE.md).
- **GAME-06:** `srcdoc` s'assembla EXCLUSIVAMENT des de `SLOTS[].html` (plantilla fixa) + el mapa d'enums; mai des de text d'usuari. No hi ha cap camí per on entri codi lliure.

### Anti-Patterns to Avoid
- **Difondre col·locacions a `io.to('session')`:** provoca que TOTS els equips facin teardown+rebuild del seu tauler (i destrueixin SortableJS a mig drag) cada cop que QUALSEVOL equip col·loca una peça. Usa emissió dirigida (Pattern 2).
- **Teardown complet del tauler a cada `session:full-state`:** el patró actual de `client.js` (clearApp + rebuild total) és correcte per a Fase 1 però destrueix instàncies SortableJS. A la fase HTML activa, `session:full-state` ha d'actualitzar NOMÉS timer/frozen/N-8 de forma quirúrgica; el tauler es (re)construeix només a `team:board-state`.
- **Decidir esquerra/dreta al client / peces amb identitat fixa:** viola D-07. La identitat la dona el slot, derivada server-side des de la plantilla.
- **Qualsevol `<input>`, `contenteditable`, o text editable de peça:** viola GAME-06. Els chips són read-only (D-12).
- **Confiar en el DOM local com a font de veritat després del drag:** el servidor és autoritatiu; el board local és optimista i es reconcilia amb `team:board-state`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag & drop amb hit-testing i snap | Listeners `pointerdown`/`move`/`up` + càlcul de proximitat manual | SortableJS `group.put` + `emptyInsertThreshold` + revert natiu | Casos límit (touch, autoscroll, ghost, cancel·lació) ja resolts; l'imant i el rebot són opcions, no codi. |
| Rebot de peça invàlida al calaix | Lògica custom "si drop dolent, anima tornada" | Revert natiu de SortableJS (cap llista accepta → torna a origen) | Zero codi; cobreix distractors (D-11) i tipus incorrecte igual. |
| Sanejament HTML per al `srcdoc` | Regex / escapat manual / strip de tags | DOMPurify | El sanejament HTML segur és notòriament subtil; DOMPurify (cure53) és l'estàndard. |
| Recuperació d'estat a F5 | Protocol custom de resync | `team:board-state` emès a la connexió (autoritatiu) + `connectionStateRecovery` ja configurat (Fase 1) | Fase 1 ja va establir el patró; només cal projectar el board a l'owner en connectar. |
| Comptador N/8 sincronitzat | Càlcul al client difós entre equips | Derivar del `team.placement` al servidor i posar-lo a `getPublicState().progress` | Autoritatiu, un sol lloc, sense divergència. |

**Key insight:** Gairebé tota la mecànica GAME-03 (type-check, imant, rebot, distractors) es redueix a **configurar** SortableJS, no a programar-la. El codi "propi" real d'aquesta fase és petit: la plantilla canònica del robot, els 4 handlers de socket (place/remove + projecció dirigida), i el desacoblament del render client (session:full-state lleuger vs board-state que reconstrueix).

## Common Pitfalls

### Pitfall 1: Tempesta de re-render entre equips (el més important)
**What goes wrong:** Difondre col·locacions a `session` + el teardown total del client a cada `session:full-state` fa que l'acció d'un equip destrueixi les instàncies SortableJS de tots els altres, potencialment a mig drag → drags cancel·lats, jank, peces "enganxades".
**Why it happens:** Fase 1 difon TOT a `session` i el client reconstrueix tot; era correcte perquè els events eren infreqüents (fase/timer). Les col·locacions són freqüents i per equip.
**How to avoid:** Emissió dirigida (`team:board-state` a la room de l'equip; `session:full-state` de col·locació NOMÉS a l'admin). El client no fa teardown del tauler a `session:full-state` durant la fase HTML.
**Warning signs:** Un equip veu la seva peça "saltar" o el drag es talla quan un altre equip actua.

### Pitfall 2: DOMPurify elimina `id`/`class`/`output` → trenca la preview i el futur scoring
**What goes wrong:** Si la config de DOMPurify no preserva `id` i `class`, el robot es renderitza sense identitat i Fase 4 (scoring per estructura de DOM) fallarà; si `<output>` cau del perfil, la boca desapareix.
**Why it happens:** Els perfils per defecte i les proteccions anti-DOM-clobbering poden afectar `id` i tags menys comuns segons versió.
**How to avoid:** Configura explícitament `ALLOWED_ATTR` incloent `id`,`class`,`src`,`alt` i verifica `<output>` (usa `ADD_TAGS:['output']` si cal). Afegeix un test manual ràpid que assereixi que l'HTML sanejat conté `id="antena-esquerra"` i `<output id="boca">`.
**Warning signs:** Preview sense antenes amb id, o boca desapareguda; en Fase 4, scoring 0 tot i estructura visualment correcta.

### Pitfall 3: Imatges del robot que no carreguen dins el `srcdoc`
**What goes wrong:** `src="antena.png"` (relatiu) dins un `srcdoc` resol contra la base URL del document pare, no contra una carpeta d'assets; si els assets no existeixen o el path és ambigu, es veuen icones trencades.
**Why it happens:** `srcdoc` té base URL heretada del pare (`about:srcdoc`); els paths relatius són ambigus. A més, **els assets `antena.png`/`orella.png` i el fons encara NO existeixen al repo** (no hi ha `public/`).
**How to avoid:** Col·loca els assets a `src/client/public/` (Vite els serveix a l'arrel) i referencia'ls amb path **arrel-relatiu** `/antena.png`. Crea/aconsegueix les imatges (2 parts + fons) com a tasca explícita.
**Warning signs:** Icones d'imatge trencada a la preview; 404 a `/antena.png`.

### Pitfall 4: SortableJS segueix actiu quan el timer es congela (D-11)
**What goes wrong:** L'overlay de congelat té `pointer-events: none`, així que les peces de sota encara es poden arrossegar tot i estar "congelat".
**Why it happens:** L'overlay és només visual; no desactiva SortableJS.
**How to avoid:** Quan `timerStatus === 'frozen'`, crida `sortable.option('disabled', true)` a totes les instàncies (o inicialitza-les amb `disabled: true`). El robot parcial queda "tal com està" (viatja a Fase 3, GAME-07). Fes-ho de forma quirúrgica al handler de `session:full-state` (sense teardown del tauler).
**Warning signs:** Es poden moure peces amb el cadenat visible.

### Pitfall 5: Inventari de peces mal comptat (2 antenes, 2 orelles, 2 ulls)
**What goes wrong:** Si el calaix tracta cada tipus com a únic, col·locar la primera antena buida el tipus i el segon slot d'antena queda sense peça.
**Why it happens:** Hi ha 8 slots però només 5 TIPUS; antena/orella/ull tenen count 2.
**How to avoid:** Modela l'inventari amb comptadors per tipus (antena×2, orella×2, ull×2, nas×1, boca×1). El calaix = inventari inicial − peces col·locades (derivat del `placement`). El servidor valida `countAvailable` abans d'acceptar un place.
**Warning signs:** Un slot d'antena/orella/ull no es pot omplir mai; o es poden col·locar 3 antenes.

## Code Examples

### Plantilla canònica del robot (shared module — font única de la veritat, D-01)
```javascript
// src/shared/robotTemplate.js  [derivat de D-01, estructura EXACTA]
export const SLOTS = [
  { id: 'antena-esquerra', accepts: 'antena', parent: 'section',
    html: '<img src="/antena.png" alt="Antena esquerra" class="antena" id="antena-esquerra">' },
  { id: 'antena-dreta',    accepts: 'antena', parent: 'section',
    html: '<img src="/antena.png" alt="Antena dreta" class="antena" id="antena-dreta">' },
  { id: 'orella-esquerra', accepts: 'orella', parent: 'section',
    html: '<img src="/orella.png" alt="Orella esquerra" class="orella" id="orella-esquerra">' },
  { id: 'orella-dreta',    accepts: 'orella', parent: 'section',
    html: '<img src="/orella.png" alt="Orella dreta" class="orella" id="orella-dreta">' },
  { id: 'ull-1', accepts: 'ull', parent: 'contenidor-ulls', html: '<span class="ull"></span>' },
  { id: 'ull-2', accepts: 'ull', parent: 'contenidor-ulls', html: '<span class="ull"></span>' },
  { id: 'nas',  accepts: 'nas',  parent: 'robot-cap', html: '<button id="nas"></button>' },
  { id: 'boca', accepts: 'boca', parent: 'robot-cap', html: '<output id="boca">BEEP BEEP</output>' },
];
export const PIECES = [ // inventari del calaix (peces bones, genèriques per tipus)
  { type: 'antena', count: 2 }, { type: 'orella', count: 2 },
  { type: 'ull', count: 2 }, { type: 'nas', count: 1 }, { type: 'boca', count: 1 },
];
export const DISTRACTORS = ['banana', 'roda', 'sabata']; // D-11: cap 'accepts' els iguala → reboten
```

### Desacoblament del render al client (evita destruir SortableJS)
```javascript
// client.js — dins bootClient(), afegir el canal privat del board:
socket.on(EVENTS.TEAM_BOARD_STATE, ({ placement }) => {
  latestPlacement = placement;
  if (latestState?.phase === 'html') {
    renderBoardAndDrawer(placement);   // (re)construeix calaix+tauler + re-init SortableJS
    assemblePreview(placement);        // re-assembla srcdoc (Pattern 3)
  }
});
// session:full-state durant fase HTML: NOMÉS timer/frozen/N-8, sense teardown del tauler.
```

## Runtime State Inventory

> No aplica com a fase de rename/refactor. Aquesta fase INTRODUEIX estat nou (no en migra). Per completesa, l'únic estat runtime nou és:
- **Stored data:** `team.placement` (mapa slot→tipus, en memòria al procés Node, per equip). Cap datastore extern (sense DB per decisió de projecte). Es perd en reiniciar el procés — acceptable (sessions de 15-20 min, sense persistència entre sessions, Out of Scope de REQUIREMENTS).
- **Cap altre:** sense estat OS-registrat, sense secrets nous, sense artefactes de build persistents (verificat: no hi ha `public/` ni assets encara — cal crear-los, vegeu Environment Availability).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| sortablejs (npm) | Drag & drop (GAME-03) | ✗ (a instal·lar) | 1.15.7 al registre | — (bloqueja; `npm install`) |
| dompurify (npm) | Sanejament srcdoc (D-13) | ✗ (a instal·lar) | 3.4.11 al registre | Assemblatge amb DOM API segura (menys preferit) |
| Node 24 / Vite 7 / socket.io 4.8 | tot | ✓ (ja al package.json) | — | — |
| Assets d'imatge: `antena.png`, `orella.png`, imatge de **fons** (D-03) | Preview real del robot (D-13) | ✗ (NO existeixen; no hi ha `public/`) | — | Placeholder SVG/emoji temporal fins tenir art definitiu |

**Missing dependencies with no fallback:**
- `sortablejs` — instal·lació trivial (`npm install`).

**Missing dependencies with fallback:**
- `dompurify` — fallback a DOM API segura si calgués (però decisió = usar-lo).
- **Assets d'imatge del robot** — cal crear/aconseguir 2 parts (`antena.png`, `orella.png`) + 1 fons. Fallback provisional: placeholders (SVG/emoji) perquè la mecànica es pugui desenvolupar i provar abans de tenir l'art final. **Tasca explícita del planner.**

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` → secció inclosa.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Sense canvis; identitat per token de Fase 1 (no s'amplia). |
| V3 Session Management | no | Reutilitza el token/room de Fase 1. |
| V4 Access Control | yes | `team:place-piece`/`remove-piece` han d'actuar NOMÉS sobre l'equip del socket emissor (`socket.data.teamId`), mai sobre un `teamId` del payload. Cap equip pot mutar el board d'un altre. |
| V5 Input Validation | yes | `slotId` i `pieceType` validats contra els enums de la plantilla (`SLOTS`/`PIECES`) server-side; place rebutjat si fase≠html, frozen, slot ocupat, tipus no coincident, o inventari esgotat. `safeHandler` ja embolcalla els handlers. |
| V6 Cryptography | no | No hi ha nou material criptogràfic. |

### Known Threat Patterns for {SortableJS client + srcdoc preview + Socket.io intents}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via HTML injectat al `srcdoc` | Tampering / Elevation | Contingut 100% des de plantilla fixa (cap text d'usuari, GAME-06) + DOMPurify + iframe `sandbox` sense `allow-scripts`. |
| Un equip muta el board d'un altre (forjant `teamId`) | Spoofing / Tampering | Derivar el `teamId` de `socket.data.teamId` (establert al middleware d'identitat), MAI del payload. Patró V4 idèntic als handlers admin existents. |
| Payload de col·locació malformat que crasheja el procés compartit | DoS | `safeHandler` (ja existent) + validació estricta d'enums abans de mutar. |
| Broadcast storm provocat per un client (spam de place/remove) | DoS | Emissió dirigida (no `session`) limita el radi; validació rebutja no-ops (slot ja ocupat / buit) → no re-broadcast en canvis nuls, com el patró "return true si ha mutat" existent. |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| interact.js per a snap/drag | SortableJS (`emptyInsertThreshold` + `group.put`) | Decisió de projecte (CLAUDE.md) | interact.js sense manteniment; SortableJS actiu i idiomàtic. |
| Protocol de resync custom | `team:board-state` dirigit + `connectionStateRecovery` (Fase 1) | Fase 1 | Menys codi, recuperació F5 consistent. |

**Deprecated/outdated:**
- No usar `interactjs` (explícitament vetat a CLAUDE.md §What NOT to Use).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | El revert natiu de SortableJS (peça torna a l'origen quan cap llista accepta el drop) implementa el "rebot" de D-09/D-11 sense codi custom | Pattern 1 | Si el revert no és fiable en drops sobre espai buit, cal `onEnd` que reposicioni manualment; petit afegit, no canvia l'arquitectura. Verificar amb test manual a Wave 0. |
| A2 | DOMPurify per defecte pot eliminar `<output>` i/o `id` segons perfil/versió | Pattern 3 / Pitfall 2 | Si no es configura `ALLOWED_ATTR`/`ADD_TAGS`, la preview perd identitat i Fase 4 no puntua. Mitigat amb config explícita + test d'asserció. |
| A3 | `emptyInsertThreshold` és el knob correcte per a l'imant sobre slots buits (D-09) | Pattern 1 | Si el comportament no és prou "imant", combinar amb àrea de hit més gran (`--hit-target-min`) i `swapThreshold`. Discreció UI. |
| A4 | Lucide pot no tenir icones exactes per banana/roda/sabata | Standard Stack (Supporting) | Cap risc funcional; fallback a emoji/SVG inline (discreció UI). |
| A5 | Paths relatius dins `srcdoc` són ambigus; cal path arrel-relatiu `/antena.png` des de `public/` | Pitfall 3 | Si es deixessin relatius, imatges trencades; mitigat amb `public/` + `/`-prefix. |

## Open Questions

1. **Assets d'imatge del robot (antena, orella, fons)**
   - What we know: D-01/D-03 els exigeixen; no existeixen al repo.
   - What's unclear: qui els proporciona i en quin format/estil.
   - Recommendation: tasca explícita "crear/aconseguir assets"; usar placeholders SVG mentrestant per no bloquejar la mecànica.
2. **Detall visual de l'etiqueta (chip vs codi read-only) i de la pista inicial**
   - What we know: D-12/D-14 + Claude's Discretion els deixen a UI.
   - What's unclear: la forma exacta.
   - Recommendation: decidir a la fase de disseny UI (`/gsd-ui-phase` si s'activa), respectant "real, descriptiu, mai editable" i UX-01.
3. **Durada de la fase HTML**
   - What we know: `admin.js` usa `PHASE_DURATION_MS = 5 min` provisional.
   - What's unclear: si aquesta fase l'ha de fer configurable.
   - Recommendation: fora d'abast d'aquesta fase (mecànica de joc, no timer); deixar el valor provisional.

## Sources

### Primary (HIGH confidence)
- Codebase directe (llegit aquesta sessió): `src/server/{gameState,socketHandlers,events,index,sessionStore}.js`, `src/client/{client,admin}.js`, `src/client/{client.css,shared/tokens.css,shared/timer.js}`, `vite.config.js`, `package.json`, `test/*.test.js`, `.planning/config.json`.
- `npm view sortablejs` / `npm view dompurify` (versions, repos, absència de postinstall) — 2026-07-02.
- `gsd-tools query package-legitimacy check` — verdictes OK/SUS amb signals.

### Secondary (MEDIUM confidence)
- `.claude/CLAUDE.md` §Technology Stack — decisions de stack (SortableJS 1.15.x, DOMPurify 3.x, patró group/put/pull, srcdoc+sandbox).
- CONTEXT.md D-01…D-15, Fase 1 CONTEXT D-08/D-11.

### Tertiary (LOW confidence)
- API exacta de SortableJS (`group.put` com a funció, `emptyInsertThreshold`, `animation`, revert-on-reject) i config de DOMPurify (`ADD_TAGS`, `ALLOWED_ATTR`) — coneixement d'entrenament, NO fetch de docs aquesta sessió (tots els proveïdors de recerca desactivats a config). Verificar puntualment amb un test a Wave 0 (vegeu Assumptions A1, A2).

## Metadata

**Confidence breakdown:**
- Integració amb codebase existent (funcions, events, getPublicState, render): HIGH — llegit directament.
- Arquitectura d'estat + projecció dirigida (evitar tempesta): HIGH — deriva d'invariants observats al codi de Fase 1.
- API exacta de SortableJS i config DOMPurify: MEDIUM — paquets verificats al registre; opcions concretes tagged ASSUMED, a confirmar amb un test ràpid.
- Package legitimacy: HIGH — verificat via seam + npm registry.

**Research date:** 2026-07-02
**Valid until:** ~2026-08-02 (stack estable; re-verifica versions npm si es planifica més tard)
