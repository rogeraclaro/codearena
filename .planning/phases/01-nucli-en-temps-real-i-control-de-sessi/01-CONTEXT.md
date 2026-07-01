# Phase 1: Nucli en temps real i control de sessió - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Aquesta fase entrega el **nucli en temps real** de CodeArena: un servidor Node.js + Socket.io amb l'estat autoritatiu de la partida en memòria, identitat d'equip persistent, un timer global sincronitzat, transicions de fase controlades per l'admin, i les dues superfícies bàsiques (panell Admin de control + pantalla d'equip amb layout split) connectades i recuperables sense pèrdua d'estat.

**Dins d'abast:** registre d'equips per l'admin i tria a cada PC; connexió/reconnexió robusta per token; timer autoritatiu al servidor amb pausa/represa/+1min; graella de monitoratge de l'admin amb resync forçat; estructura de la pantalla d'equip (panell d'acció esquerra + preview dreta) i els seus estats d'espera/transició.

**Fora d'abast (altres fases):** el contingut real de joc de cada fase — blocs drag & drop HTML (Fase 2), CSS foradat i regles JS (Fase 3), motor de puntuació i rànquing (Fase 4), desplegament a VPS/Nginx/PM2 (Fase 5). La canonada de preview (iframe srcdoc) es dissenya aquí però només es omple de contingut a partir de la Fase 2.

</domain>

<decisions>
## Implementation Decisions

### Entrada i identitat d'equips
- **D-01:** Model d'entrada = **pre-registre + tria de llista**. L'admin escriu els noms dels 4-6 equips al panell abans de començar; cada PC obre l'app i tria de la llista quin equip és. No hi ha codis PIN ni URLs per repartir. (CORE-02, ADMIN-01)
- **D-02:** En triar equip, es persisteix un **token de sessió al localStorage**, mai lligat al `socket.id`. La reconnexió (F5, caiguda de xarxa) reassocia el PC al seu equip automàticament via el token, **sense tornar a demanar la tria**. (CORE-02, CORE-03)
- **D-03:** **Bloqueig fort** d'equips: un cop un PC agafa un equip, aquest desapareix de la llista de tria per als altres PCs. Evita duplicats de soca-rel.
- **D-04:** **Sense alliberament manual d'equips a la v1.** Si un PC mor definitivament (cas assumit com a rar, màquines idèntiques), es reinicia la sessió. No s'afegeix cap acció "Alliberar equip" al panell — manté el panell simple.

### Estats de la pantalla d'equip
- **D-05:** Abans que l'admin iniciï la primera fase, cada equip veu una **pantalla d'espera dedicada a pantalla completa** (nom de l'equip + "Connectat ✓, esperant el professor"). El layout split (panell + preview) només apareix quan arrenca la fase. Prioritza la calma cognitiva: deixa clar que encara no s'ha de tocar res.
- **D-06:** Entre fases (salts controlats per l'admin), la pantalla d'equip mostra un **interstici breu** ("Ara: Fase CSS", ~1-2s) abans d'activar el nou panell. Reforça el model mental HTML→CSS→JS.

### Model de fase i control de l'admin
- **D-07:** **La fase és un estat global i únic per a tota la sessió**, no per equip. L'admin mou tots els equips a la mateixa fase alhora (lockstep); no existeix un indicador de "fase actual" per equip perquè seria redundant. (CORE-05)
- **D-08:** El card de cada equip a la graella de l'admin mostra: **estat de connexió** (connectat/desconnectat, color+icona) i **progrés dins la fase actual**. El progrés no té contingut real a la Fase 1 (encara no hi ha joc), però es reserva l'espai al disseny del card per no refer-lo a la Fase 2. (ADMIN-05)
- **D-09:** **Resync forçat = recàrrega completa** de la pàgina del client. L'admin prem "Resync" sobre un equip penjat i el seu PC recarrega sencer, recuperant l'estat des del servidor via token. Més contundent que un re-render suau, però recupera de qualsevol estat corrupte. (ADMIN-06)

### Timer i transicions
- **D-10:** El timer és **autoritatiu al servidor** (timestamp absolut de fi de fase) i es mostra sincronitzat a totes les pantalles. (CORE-04)
- **D-11:** **A zero, els panells d'equip es congelen (la feina queda "tal com està") però NO es canvia de fase automàticament**: l'admin sempre prem "Següent fase" per avançar. Això **resol la contradicció** entre PROJECT.md ("si el temps s'esgota, passen de fase tal com estiguin") i CORE-05 a favor de CORE-05 — l'admin manté sempre el control del ritme. La part "tal com estiguin" es preserva com a congelació de l'estat, no com a auto-avanç.
- **D-12:** Pausa/represa i "+1 minut" es reflecteixen **a l'instant a totes les pantalles** alhora, coherent amb el timer autoritatiu al servidor. (ADMIN-03, ADMIN-04)

### Claude's Discretion
- **Senyalització visual d'urgència del timer** als últims segons (canvi de color, pols, etc.): a criteri d'UI/planner. L'usuari no té preferència forta; ha de respectar "iconogràfic, text mínim" (UX-01).
- **Patró concret de reconnexió** (ús de `connectionStateRecovery` de Socket.io vs. resync explícit de l'estat complet): a criteri del researcher/planner, sempre que satisfaci CORE-03 sense intervenció manual.
- **Mecànica exacta del "progrés dins la fase"** com a mètrica: es reserva l'espai al card però la definició concreta arriba amb el contingut de joc (Fase 2+).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visió i abast del projecte
- `.planning/PROJECT.md` — Descripció, Core Value, Context d'aula, Constraints i Key Decisions. Nota: la línia de Context "si el temps s'esgota, passen de fase tal com estiguin" queda matisada per D-11 (congelació sí, auto-avanç no).
- `.planning/REQUIREMENTS.md` §Nucli temps real (CORE-01..05), §Panell Admin (ADMIN-01..06), §Mecànica de joc (GAME-01, GAME-02), §UX (UX-01, UX-02) — requisits mapejats a la Fase 1.
- `.planning/ROADMAP.md` §Phase 1 — Goal i els 5 Success Criteria que aquesta fase ha de fer certs.

### Stack tècnic (decidit)
- `.claude/CLAUDE.md` (secció Technology Stack) — Node.js 24 LTS, Socket.io 4.8.x amb `connectionStateRecovery`, Express 4 (thin HTTP + static), Vite 7.x multi-page (admin.html + client.html), iconografia Lucide/Feather. Inclou la nota sobre `connectionStateRecovery` com a mecanisme de recuperació preferit i el patró d'estat en memòria (Maps/objectes JS, sense DB).

*No hi ha ADRs ni specs externs addicionals — les decisions queden capturades a la secció Implementation Decisions.*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Cap encara — projecte greenfield. No hi ha codi font ni mapes de codebase a `.planning/codebase/`.

### Established Patterns
- Cap patró de codi previ. Els patrons a seguir venen del stack documentat a `.claude/CLAUDE.md` (Socket.io rooms per sessió, estat autoritatiu al servidor, clients com a capa fina de render sobre esdeveniments).

### Integration Points
- Aquesta és la fase fundacional: estableix el servidor Socket.io, l'estat en memòria i la canonada de preview que **les Fases 2-4 reutilitzaran** ("reutilitzant la canonada de Fase 1" — ROADMAP §Phase 2). El disseny del card d'equip i de la preview ha de deixar espai per al contingut de joc futur.

</code_context>

<specifics>
## Specific Ideas

- Patró d'entrada **estil aula controlada, no estil Kahoot**: l'usuari va descartar explícitament el flux de PIN a favor del pre-registre + tria, per minimitzar passes i errors el primer minut de classe.
- **Sincronització total en lockstep**: idea explícita de l'usuari — tots els equips sempre a la mateixa fase, dirigits per l'admin. Aquest és un principi de disseny central de la Fase 1, no només una opció.
- Filosofia d'estats del client: "deixar clar que encara no toca res" (pantalla d'espera dedicada) — prioritza calma cognitiva per sobre de continuïtat visual.

</specifics>

<deferred>
## Deferred Ideas

None — la discussió es va mantenir dins l'abast de la Fase 1. Les capacitats de joc, puntuació i desplegament ja tenen les seves pròpies fases al roadmap.

</deferred>

---

*Phase: 1-Nucli en temps real i control de sessió*
*Context gathered: 2026-07-01*
