# Phase 04: Puntuació i rànquing final - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

En finalitzar la partida, cada equip rep una puntuació calculada automàticament comparant el seu treball (HTML/CSS/JS) amb la Plana Model, i totes les pantalles mostren un rànquing final ordenat. L'Admin, a més, veu un ranking parcial (nomès al seu panell) en tancar-se cada fase individual (HTML→CSS, CSS→JS), calculat amb el mateix motor de puntuació.

</domain>

<decisions>
## Implementation Decisions

### Model de puntuació per fase
- **D-01:** HTML es puntua per **proximitat parcial** (no tot-o-res): percentatge de peces/slots correctament col·locats respecte el total de la Plana Model (`src/shared/robotTemplate.js` PIECES/SLOTS).
- **D-02:** CSS es puntua per **distància normalitzada 0-100** per forat: colors amb distància RGB normalitzada, mides/sliders amb distància numèrica normalitzada pel rang min/max del forat (`CSS_HOLES` a `robotTemplate.js`); el score CSS de l'equip és la mitjana dels forats.
- **D-03:** JS **no té model de referència exacte** — cada equip proposa lliurement les regles que vulgui. El score JS es basa en **quantitat + varietat**: nombre de regles creades (fins al màxim de 6, D-11/D-12 de Fase 3) + nombre d'events/elements/accions ÚNICS utilitzats (evita inflar el score repetint la mateixa combinació).

### Pes relatiu de cada fase
- **D-04:** Pesos de la puntuació global: **HTML 30% / CSS 60% / JS 10%**. JS pesa poc perquè no té referència exacta per validar correcció; CSS pesa més perquè és la comparació més rica/objectiva disponible.

### Bonificació de temps
- **D-05:** El temps deixa de ser NOMÉS desempat (com deia SCORE-04 fins ara) i passa a ser una **petita bonificació dins del score** (màxim aproximat ±5 punts) — mai ha de dominar per sobre d'una diferència gran de precisió.
- **D-06:** Aquesta bonificació **només s'aplica a la Fase HTML**, via `team.doneAt.html` (l'únic timestamp de finalització que existirà — veure D-07/D-08). CSS i JS puntuen NOMÉS per proximitat/varietat, sense component de temps.

### Botó "Finalitzar" per fase (GAME-08 — retrofit)
- **D-07:** Fase **HTML**: el botó "Finalitzar" es manté PERÒ ara amb **gate de correcció 100%** — només s'habilita quan l'estructura coincideix exactament amb la Plana Model (retrofit ara, tal com deia GAME-08 des del principi; reutilitza el motor de comparació nou d'aquesta fase). És l'únic origen de bonificació de temps (D-06).
- **D-08:** Fase **CSS**: el botó "Finalitzar" que ja existia (sense gate, implementat commit `7fd2169`) s'ha d'**ELIMINAR**. L'equip no marca mai "acabat" a CSS — ara que la puntuació és per proximitat contínua, un botó de "fet" no té sentit (sempre es pot millorar una mica més).
- **D-09:** Fase **JS**: **sense botó de finalitzar** — mateix raonament que CSS (no hi ha referència exacta per validar, i el score és per quantitat/varietat acumulada durant tota la fase).

### Pantalla de resultats (equips)
- **D-10:** La pantalla de resultats final mostra a TOTS els equips el **ranking + percentatge global** de cada equip. El **detall de sub-checks** (quines peces HTML concretes, quins forats CSS concrets...) NOMÉS el veu cada equip a la seva pròpia pantalla — mai el detall d'un altre equip (evita exposar errors concrets d'un equip davant tota la classe).
- **D-11:** Cada equip veu NOMÉS el seu percentatge **global** final — sense desglossament per fase (HTML/CSS/JS) visible per l'equip.

### Ranking parcial de fi de fase (Admin)
- **D-12:** En tancar-se cada fase (HTML→CSS, CSS→JS), l'Admin veu un **mini-ranking al seu propi panell** (NOMÉS l'Admin — els equips no ho veuen). Els equips no veuen res d'aquest ranking parcial fins al resultat final.
- **D-13:** Aquest ranking parcial es calcula amb el **mateix motor de puntuació** que el ranking final (D-01 a D-04), amb les fases encara no jugades comptant com a **0** en el seu pes corresponent. No és un càlcul o vista diferent — és el mateix pipeline aplicat a l'estat parcial.

### Cerimònia de lliurament de premis
- **D-14:** Quan l'Admin prem el botó de transició de fase (el mateix que ja existeix per avançar HTML→CSS→JS) just després d'haver tancat la Fase JS, aquest esdevé el disparador d'ADMIN-07 ("Finalitzar i Mostrar Resultats"). En lloc de mostrar el rànquing a l'instant, totes les pantalles (equips + Admin) reprodueixen una **cerimònia d'entrega de premis** animada abans de revelar els resultats:
  1. **Compte enrere 5→0**, un número per segon (cadència d'1s), cada número centrat a la pantalla.
  2. Animació per número: **zoom + fade** com si el número vingués cap a l'espectador i sortís de pantalla (efecte "acostant-se i desapareixent").
  3. Cada número (5, 4, 3, 2, 1, 0) en un **color viu/"chillón" diferent**.
  4. En arribar a **0**, es manté estàtic (sense zoom) durant **3 segons**.
  5. Després, el 0 fa el mateix zoom + fade de sortida i apareix el **rànquing**, revelat **d'últim a primer classificat** (ordre invers, tipus "i el guanyador és...").
  6. Al final de la revelació, **confetti a pantalla completa**.
- Disposició i seqüència exactes de la revelació del rànquing (un per un amb pausa, tots alhora amb stagger, etc.) es deixen a discreció de disseny — veure Claude's Discretion.

### Claude's Discretion
- Fórmula exacta de la bonificació de temps HTML (D-05): el llindar concret d'±5 punts i com escalar-lo (p.ex. lineal vs. esglaonat) es decideix en planificar.
- Detall tècnic de la distància RGB normalitzada (D-02): quina fórmula de distància de color (Euclidiana simple vs. perceptual) — es decideix en planificar, prioritzant simplicitat.
- Format visual exacte del mini-ranking d'Admin (D-12): llista simple vs. barra de progrés per equip — decisió d'implementació, no de producte.
- Cadència i disposició exactes de la revelació del rànquing post-cerimònia (D-14): temps entre cada equip revelat, si hi ha stagger o pausa dramàtica creixent cap al primer lloc, tipografia/mida de cada fila revelada — es decideix en planificar/dissenyar, prioritzant impacte pedagògic (celebrar el moment) sense allargar-se en excés (sessió de 15-20 min).
- Implementació tècnica del confetti (CSS/canvas/llibreria mínima sense dependència pesada) i dels colors "chillons" del compte enrere — es decideix en planificar.

### Folded Todos
- **Temps de finalització en el ranking** (`.planning/todos/pending/2026-07-03-puntuacio-considerar-temps-de-finalitzacio.md`): pregunta original de si el rànquing hauria de considerar temps més enllà d'un desempat pur. Resolta via D-05/D-06 — bonificació petita, només a HTML.
- **Scoring per proximitat i rapidesa** (`.planning/todos/pending/2026-07-05-scoring-per-proximitat-i-rapidesa.md`): proposava puntuar CSS per distància numèrica i capturar rapidesa via `team.doneAt`. Resolta via D-01 a D-09 — inclou el gir important que JS no té referència exacta (D-03) i que el botó de finalitzar només té sentit a HTML (D-07 a D-09).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisits i abast
- `.planning/REQUIREMENTS.md` §Puntuació i resultats (SCORE-01 a SCORE-05), §ADMIN-07, §GAME-08 — atenció: la redacció actual de SCORE-01/02/03 (comparació exacta) i SCORE-04 (temps només desempat) queda SUPERSEDIDA per les decisions D-01 a D-09 d'aquest document; el planner ha de prioritzar aquest CONTEXT.md sobre la redacció literal de REQUIREMENTS.md en cas de conflicte.
- `.planning/ROADMAP.md` §Phase 4: Puntuació i rànquing final — objectiu i criteris d'èxit de la fase.

### Font de veritat (Plana Model)
- `src/shared/robotTemplate.js` — `PIECES`/`SLOTS` (referència HTML), `CSS_HOLES` (valors objectiu de color/mida per forat, comentari de capçalera).
- `src/shared/effects.js` — `ACTIONS`/`COMPOSITES` (vocabulari JS, per calcular varietat d'events/elements/accions únics).

### Estat de partida existent (a reutilitzar)
- `src/server/gameState.js` — `team.doneAt` (timestamps de finalització), `team.cssValues`, `team.jsRules`, `markPhaseDone`. Nou codi de scoring hauria de llegir d'aquí, mai duplicar estat.
- `src/server/socketHandlers.js` — patró `safeHandler` + `TEAM_MARK_DONE` (handler existent del botó Finalitzar, a modificar per D-07/D-08/D-09).

### Todos originals (folded, per traçabilitat)
- `.planning/todos/pending/2026-07-03-puntuacio-considerar-temps-de-finalitzacio.md`
- `.planning/todos/pending/2026-07-05-scoring-per-proximitat-i-rapidesa.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `robotTemplate.js` (`CSS_HOLES`, `PIECES`, `SLOTS`): ja és la font canònica de la Plana Model — el motor de comparació de la Fase 4 ha de llegir d'aquí, mai duplicar valors objectiu.
- `gameState.js` (`team.doneAt`, `team.cssValues`, `team.jsRules`): estat ja capturat per cada equip, llest per ser llegit pel motor de scoring sense necessitat de nova infraestructura de captura.
- `safeHandler` (`socketHandlers.js`): patró existent per embolcallar nous handlers (p.ex. `ADMIN_FINALIZE_GAME`) de forma consistent amb la resta del codi.

### Established Patterns
- Mutation-returns-bool + emissió dirigida `team:<id>` (Fases 1-3): seguir el mateix patró per qualsevol nou event de resultats.
- Identitat sempre de `socket.data.teamId`, mai del payload (V4, consistent a totes les fases anteriors).
- Vocabulari/estructures frozen (`Object.freeze`) per a qualsevol nova taula de referència (p.ex. pesos de fase si es representen com a constant).

### Integration Points
- El botó "Finalitzar" de la Fase HTML (`TEAM_MARK_DONE` handler) necessita ampliar-se amb la validació de correcció 100% (D-07) — punt d'integració directe amb el motor de comparació nou.
- El handler existent de CSS (mirror de HTML) s'ha d'ELIMINAR (D-08), no ampliar.
- El botó "Finalitzar i Mostrar Resultats" de l'Admin (ADMIN-07, encara no implementat) és el disparador que calcula el ranking final complet i el trasllada a totes les pantalles.
- El "ranking parcial" d'Admin (D-12/D-13) s'ha d'enganxar al mateix punt on avui es fa la transició de fase (admin:start-phase / nextPhase a `gameState.js`), calculant el motor de scoring amb 0 a les fases pendents.

</code_context>

<specifics>
## Specific Ideas

- "A la fase HTML el gate 100%, a la fase CSS no cal botó de finalitzar" — cita directa que defineix D-07/D-08.
- "A la pantalla de JS el problema és que no hi ha model de referència, cada equip pot proposar les accions que vulgui... la puntuació la basarem en un fet aleatori: quantes accions es proposen i la varietat" — cita directa que defineix D-03.
- "Apart de la pantalla de resultats a cada equip, a l'Admin també tinc que veure el ranking temporal en el moment que s'acaba cada fase i el ranking final" — cita directa que defineix D-12/D-13.
- "A l'admin (quan ja ha acabat la fase JS) el boto 'seguent fase' engega la 'cerimonia d'entrega de premis', que consisteix en un compte enrere animat: compte enrere des de 5 fins a 0, comença el 5 centrat al mig de la pantalla i es va passant de numero en numero (amb una cadencia d'un segon entre animacions) amb l'animació del numero que hi ha al mig en zoom i fade cap a 0 (com si el numero vingués cap a l'espectador i sortint de la pantalla). Cada numero en un color chillon diferent. Al final del compte enrere, el 0 es manté 3 segons sense zoom i finalment zoom i fade i apareix el ranking, començant per l'ultim i aixi fins al primer... i al final de tot omple pantalla de particules com si fos confetti" — cita directa que defineix D-14.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Preview CSS live code overlay** (`.planning/todos/pending/2026-07-04-preview-css-live-code-overlay.md`) — millora UI de la Fase CSS (mostrar codi CSS en directe mentre es toca un control), no relacionada amb scoring. Queda per a una futura fase d'UI/polish.
- **Botó per tornar a la fase anterior des de l'Admin** (`.planning/todos/pending/2026-07-05-boto-per-tornar-a-la-fase-anterior-des-de-admin.md`) — millora del panell Admin (control de flux de fases), no és scoring. Queda per a una futura fase d'Admin.
- **Reset de servidors des del panell Admin** (`.planning/todos/pending/2026-07-05-reset-de-servidors-des-del-panell-admin.md`) — millora operativa del panell Admin, no és scoring. Queda per a una futura fase d'Admin/Ops.

</deferred>

---

*Phase: 04-puntuaci-i-r-nquing-final*
*Context gathered: 2026-07-05*
