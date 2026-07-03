---
phase: quick-260703-uwn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/shared/robotTemplate.js
  - src/client/client.js
  - src/client/client.css
  - src/client/public/orella-esquerra.png
  - src/client/public/orella-dreta.png
  - src/client/public/antena.svg
  - src/client/public/orella.svg
  - test/placement.test.js
  - src/server/gameState.js
  - src/server/socketHandlers.js
autonomous: true
requirements: [GAME-03, GAME-06]
must_haves:
  truths:
    - "El robot té UNA sola antena centrada al cap (7 peces totals, no 8)"
    - "El comptador de progrés mostra N/7 arreu (no N/7 hardcoded — derivat de SLOTS.length)"
    - "La boca del robot es renderitza buida (sense text 'BEEP BEEP')"
    - "Les dues orelles usen imatges PNG reals distintes (esquerra ≠ dreta), sense mirall CSS"
    - "El preview del robot mostra la forma cilíndrica Bender amb cap/ulls/nas/boca/antena estilitzats"
    - "La suite de tests (node --test) passa amb el model de 7 peces"
  artifacts:
    - src/client/public/orella-esquerra.png
    - src/client/public/orella-dreta.png
  key_links:
    - "SLOTS.length (robotTemplate.js) → getPublicState().progress.total (gameState.js) → N/7 a l'admin"
    - "SLOTS[].html → assemblePreview() → DOMPurify.sanitize → srcdoc de l'iframe preview"
    - "wrapPreview() <style> → CSS que estilitza el markup assemblat des de SLOTS[].html"
---

<objective>
Port retroactiu del redisseny visual final del robot Bender (font de veritat:
`/Users/rogermasellas/Desktop/imparticio/index.html`) al codi real de la Fase 2
(drag & drop HTML), ja enviada i validada (GAME-03/GAME-06).

Canvis: antena única per CSS (7 peces en lloc de 8), boca sense text inicial,
dues orelles PNG reals distintes (sense mirall), i el CSS complet del
cap/ulls/nas/boca/antena portat al `<style>` del preview.

Purpose: la pantalla d'equip ha de mostrar el disseny final que el propietari ha
tancat, no els placeholders SVG genèrics.
Output: robotTemplate.js amb 7 peces, client.js amb el CSS Bender al preview,
assets PNG a public/, i tests actualitzats al model de 7 peces.

NO toca: scope de Fase 3 (CSS foradat / regles JS), scoring/Fase 4, desplegament/Fase 5.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/shared/robotTemplate.js
@src/server/gameState.js
@src/client/client.js
@src/client/client.css
@test/placement.test.js
@/Users/rogermasellas/Desktop/imparticio/index.html

# Notes de descoberta (confirmades llegint el codi real):
# - El CSS del cap/ulls/nas/boca/antena NO existeix enlloc actualment. El preview
#   del robot es dibuixa dins wrapPreview() (client.js), el <style> del qual només
#   té #robot-fons i #robot-contenidor{position:relative}. Aquest és el lloc on
#   s'ha d'AFEGIR el CSS Bender (client.css només estilitza el calaix/tauler del
#   panell esquerre, NO el preview).
# - NO hi ha cap transform:scaleX(-1) al codi actual (el "mirall d'orelles" que
#   descriu la tasca ja no existeix) → no cal eliminar-lo, només posar el CSS nou.
# - test/placement.test.js depèn fortament d'antena-dreta i afirma total:8 →
#   s'ha de reescriure al model de 7 peces o els tests trencaran.
</context>

<tasks>

<task type="auto">
  <name>Task 1: robotTemplate.js — model de 7 peces (font de veritat única)</name>
  <files>src/shared/robotTemplate.js</files>
  <action>
Actualitza la font de veritat única SLOTS/PIECES/IMG_LABEL_SRC segons el disseny
final (`/Users/rogermasellas/Desktop/imparticio/index.html`, línies 185-197):

1. ELIMINA completament el slot `antena-dreta` de SLOTS (línies 30-35). Queda
   NOMÉS un slot d'antena.
2. Canvia el slot `antena-esquerra`: el seu `html` passa de `<img src="/antena.svg" ...>`
   a un DIV dibuixat per CSS: `<div class="antena"></div>` (SENSE atribut `id` —
   decisió explícita de l'usuari: el CSS només referencia la classe `.antena`,
   mai un selector `#antena-esquerra`; la posició centrada ja ve fixada a la
   pròpia regla `.antena` amb `left:50%; transform:translateX(-50%)`, no cal cap
   selector per id). Manté `accepts: 'antena-esquerra'` i `parent: 'section'`
   sense canvis al SLOT (el camp `id` del SLOT és l'identificador intern per al
   matching de placement, no un atribut HTML — no es toca).
3. Canvia el `src` dels dos slots d'orella de `/orella.svg` a rutes PNG DIFERENTS
   per costat: `orella-esquerra` → `src="/orella-esquerra.png"`, `orella-dreta`
   → `src="/orella-dreta.png"`. Manté class/id/alt.
4. Buida la boca: el slot `boca` passa de `<output id="boca">BEEP BEEP</output>`
   a `<output id="boca"></output>`.
5. ELIMINA l'entrada `antena-dreta` de PIECES (línia 149). PIECES queda amb 6
   entrades (antena-esquerra, orella-esquerra, orella-dreta, ull count 2, nas, boca).
   Suma de peces: 1+1+1+2+1+1 = 7.
6. ELIMINA les DUES claus d'antena de IMG_LABEL_SRC (`antena-esquerra` i
   `antena-dreta`, línies 102-103): ara l'antena és un `<div>`, no un `<img>`, així
   que ja no passa per la branca `img` de pieceLabel() ni usa IMG_LABEL_SRC. Deixa
   les dues claus d'orella intactes (l'orella segueix sent `<img>`).
7. Actualitza els comentaris que diuen "N/8", "8 leaf pieces", "1+1+1+1+2+1+1 = 8"
   perquè reflecteixin 7 peces / 6 tipus. No inventis nova mecànica: només el recompte.

DECISIÓ CONFIRMADA (substitueix la suposició anterior del planner): l'etiqueta
(chip read-only) de l'antena ha de mostrar `<div class="antena">`, MAI per id
(l'usuari ho ha confirmat explícitament — el CSS només referencia la classe).
Revisa `pieceLabel()` a robotTemplate.js: la branca no-img actual mostra
l'atribut que identifica el TYPE (per a nas/boca és `id` perquè `value===type`).
Per a l'antena això ja NO és cert un cop el div no porta `id` — cal una branca
específica (o una condició `type === 'antena-esquerra'`) que retorni
`<div class="antena">` explícitament, en comptes de caure a la lògica genèrica
d'`id`. Verifica el resultat amb un test manual de `pieceLabel('antena-esquerra')`.

NO afegeixis persistència, ni canviïs CONTAINERS, ni toquis DISTRACTORS.
  </action>
  <verify>
    <automated>cd /Users/rogermasellas/AI/Impartició01 && grep -c "antena-dreta" src/shared/robotTemplate.js | grep -qx 0 && grep -Fq '<div class="antena"></div>' src/shared/robotTemplate.js && ! grep -q "BEEP" src/shared/robotTemplate.js && node --input-type=module -e "import('./src/shared/robotTemplate.js').then(m=>{if(m.SLOTS.length!==7)throw new Error('SLOTS='+m.SLOTS.length);if(m.PIECES.length!==6)throw new Error('PIECES='+m.PIECES.length);const b=m.SLOTS.find(s=>s.id==='boca');if(b.html.includes('BEEP'))throw new Error('BEEP');const lbl=m.pieceLabel('antena-esquerra');if(lbl!=='<div class=\"antena\">')throw new Error('label='+lbl);console.log('OK 7 slots / 6 tipus / label OK');})"</automated>
  </verify>
  <done>
SLOTS té 7 entrades (cap antena-dreta), PIECES 6 entrades sumant 7 peces,
antena-esquerra és un div, orelles apunten a PNG diferents per costat, boca buida,
IMG_LABEL_SRC sense claus d'antena. El comptador N/7 en deriva automàticament de SLOTS.length.
  </done>
</task>

<task type="auto">
  <name>Task 2: client.js preview + assets + tauler d'antena única</name>
  <files>src/client/client.js, src/client/public/orella-esquerra.png, src/client/public/orella-dreta.png, src/client/public/antena.svg, src/client/public/orella.svg</files>
  <action>
Tres sub-canvis a la capa client:

A) ASSETS (còpia + neteja de public/):
   - Copia `/Users/rogermasellas/Desktop/imparticio/orella_esquerre.png` →
     `src/client/public/orella-esquerra.png` (nom amb guió, coincidint amb el src
     de robotTemplate.js).
   - Copia `/Users/rogermasellas/Desktop/imparticio/orella_dreta.png` →
     `src/client/public/orella-dreta.png`.
   - Elimina els placeholders obsolets `src/client/public/antena.svg` (l'antena
     ara és un div CSS, ja no es referencia) i `src/client/public/orella.svg`
     (substituït pels dos PNG). NO toquis `fons.svg` (no referenciat aquí, fora d'abast).
   - NO copiïs antena.png: l'antena es dibuixa 100% per CSS, no és cap `<img>`.

B) TAULER (buildBoard, ~línia 443-446): elimina la línia que crea el segon slot
   d'antena `antenaRow.appendChild(createSlot(slotById('antena-dreta'), placement))`.
   Deixa NOMÉS el slot `antena-esquerra` a `antenaRow` (una antena única centrada).
   La resta de buildBoard (orelles, ulls, nas, boca) queda igual.

C) CSS DEL PREVIEW (wrapPreview, ~línia 629-650): AQUEST és el lloc on viu
   l'estil del robot renderitzat (l'iframe srcdoc), NO client.css. Substitueix el
   `<style>` actual (que només té #robot-fons i #robot-contenidor{position:relative})
   per un que FUSIONI:
   - La capa de fons #robot-fons existent (mantén-la EXACTA, inclosa la URL
     d'Unsplash i el background-blend).
   - Centrat del cos perquè el robot quedi centrat a l'iframe (equivalent al
     `body { display:flex; justify-content:center; align-items:center }` de la font).
   - TOTES les regles del robot copiades LITERALMENT de les línies 25-179 de
     `/Users/rogermasellas/Desktop/imparticio/index.html`: `#robot-contenidor`
     (width 300px, margin 160px auto, position relative), `#robot-cap` (gradient
     cilíndric, border-radius Bender, box-shadow, flex column), `.antena` +
     `.antena::before` (tija + bola brillant), `.orella`, `#orella-esquerra`,
     `#orella-dreta`, `.contenidor-ulls`, `.ull` + `.ull::before` (visor amb pupil·la),
     `#nas` + `#nas:hover`, `#boca`. Copia els valors EXACTES de la font — no
     n'inventis de nous.

Verifica que assemblePreview() (línia 652-673) segueix funcionant: el nou markup
d'antena és un `<div class="antena"></div>` (SENSE id, decisió confirmada — vegeu
Task 1). DOMPurify permet `div` per defecte i ALLOWED_ATTR ja inclou `class`,
així que el div sobreviu la sanitització sense cap canvi de config. NO modifiquis
ADD_TAGS/ALLOWED_ATTR (segueixen calent per a `<output>` i src/alt/class/id de
les orelles) — preserva la config de sanitització existent (T-04-01).

Actualitza el comentari de wrapPreview sobre "antena.svg" si el menciona.
NO toquis la resta de client.js (sons, sortables, màquina d'estats).
  </action>
  <verify>
    <automated>cd /Users/rogermasellas/AI/Impartició01 && test -f src/client/public/orella-esquerra.png && test -f src/client/public/orella-dreta.png && ! test -f src/client/public/antena.svg && ! test -f src/client/public/orella.svg && grep -q "#robot-cap" src/client/client.js && grep -q "antena::before" src/client/client.js && ! grep -q "antena-dreta" src/client/client.js && npm run build</automated>
  </verify>
  <done>
Els dos PNG d'orella són a public/, els SVG obsolets eliminats, el tauler mostra
una sola antena, i el <style> del preview (wrapPreview) conté totes les regles
Bender del cap/ulls/nas/boca/antena. `npm run build` passa sense errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Actualitza test/placement.test.js al model de 7 peces</name>
  <files>test/placement.test.js, src/server/gameState.js, src/server/socketHandlers.js, src/client/client.css</files>
  <action>
`test/placement.test.js` és una ronda ORDENADA (node:test executa en ordre de
declaració; l'estat de team1 s'acumula entre tests) que depèn d'`antena-dreta` i
afirma `total: 8`. En eliminar antena-dreta cal repivotar cap al split que ES
MANTÉ: l'orella (orella-esquerra / orella-dreta, encara dos tipus direccionals
count 1). Reescriu així, mantenint la mateixa intenció de cada test:

Traça d'estat objectiu de team1 (segueix-la exactament):
1. PLACE-OK: place antena-esquerra → {antena-esquerra}. (sense canvis)
2. PLACE-TYPE-REJECT: reject (nas amb peça antena-esquerra). (sense canvis)
3. PLACE-DIRECTION-REJECT: canvia el subjecte a l'orella — emet place
   `pieceType: 'orella-esquerra'` al `slotId: 'orella-dreta'` → rebutjat
   (accepts mismatch, split direccional). No muta res. Actualitza comentari/nom.
4. ADMIN-COUNT: canvia el place d'`antena-dreta` a `orella-dreta`
   (slotId 'orella-dreta', pieceType 'orella-dreta') i canvia l'asserció
   `progress.total` de 8 a 7. Estat → {antena-esquerra, orella-dreta}.
5. NO-SESSION-BROADCAST: place orella-esquerra → {antena-esquerra, orella-dreta,
   orella-esquerra}. (sense canvis)
6. REMOVE round-trip: remove antena-esquerra; canvia l'asserció `total` de 8 a 7;
   actualitza el comentari d'estat d'entrada a {antena-esquerra, orella-dreta,
   orella-esquerra}. Estat → {orella-dreta, orella-esquerra}.
7. REMOVE no-op: remove antena-esquerra (buit → no-op). (sense canvis)
8. INVENTORY cap: recol·loca antena-esquerra (OK); després intenta place
   `orella-dreta` de nou (slot ja ocupat / inventari direccional esgotat) → rebutjat.
   Actualitza comentaris. Estat → {antena-esquerra, orella-dreta, orella-esquerra}.
9. V4 forge: sense canvis (team2 forja teamId, team1 intacte).
10. F5 recovery: canvia l'asserció de `board.placement['antena-dreta'] === 'antena-dreta'`
    a `board.placement['orella-dreta'] === 'orella-dreta'` (segueix col·locat després
    de tota la ronda).

També actualitza el capçal del fitxer (línia 9) i el nom del test ADMIN-COUNT
(línia 140) que diuen `total:8` → `total:7`.

Escombrada de comentaris "N/8" → "N/7" (només text de comentari, cap canvi de
comportament — el total real ja ve de SLOTS.length): a `src/server/gameState.js`
(línies 28, 64), `src/server/socketHandlers.js` (línies 225, 245) i el comentari
`src/client/client.css` línia 96 ("Progrés propi N/8"). NO canviïs cap lògica en
aquests fitxers, només el text dels comentaris.

Confirma que la resta de la suite (adminAuth, timer, monitoring, roundtrip) no
referencia antena-dreta ni total:8 (ja verificat: no ho fan).
  </action>
  <verify>
    <automated>cd /Users/rogermasellas/AI/Impartició01 && ! grep -q "antena-dreta" test/placement.test.js && ! grep -rq "total: 8\|total:8\|total, 8" test/ && node --test test/</automated>
  </verify>
  <done>
`node --test test/` passa (inclosa placement.test.js reescrita al model de 7 peces),
cap referència a antena-dreta ni total:8 al directori test/, i els comentaris N/8
del servidor/client actualitzats a N/7.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SLOTS[].html → srcdoc de l'iframe | Markup estàtic de plantilla (mai text d'usuari, GAME-06) injectat al preview |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-uwn-01 | Injection | assemblePreview() → srcdoc | low | mitigate | Es preserva la sanitització DOMPurify existent (ADD_TAGS/ALLOWED_ATTR sense canvis); el nou `<div class="antena">` és tag default-allowed amb class/id ja permesos. El markup segueix sent plantilla estàtica de confiança, no entrada d'usuari. |
| T-uwn-02 | Tampering | assets PNG a public/ | low | accept | Assets estàtics locals copiats del disc del propietari; sense instal·lació de paquets, sense superfície de xarxa nova. |
</threat_model>

<verification>
- `node --input-type=module` confirma SLOTS.length===7 i PIECES.length===6.
- `npm run build` (Vite) construeix sense errors amb el nou CSS del preview.
- `node --test test/` passa tota la suite amb el model de 7 peces.
- Cap referència residual a `antena-dreta`, `BEEP`, `total:8` o `.svg` d'antena/orella al codi.
</verification>

<success_criteria>
- El robot mostra UNA antena centrada (7 peces, comptador N/7 automàtic via SLOTS.length).
- La boca es renderitza buida; les orelles usen dos PNG reals distints.
- El `<style>` del preview conté el disseny Bender complet copiat de la font de veritat.
- Tota la suite de tests passa; scope de Fase 3+ intacte.
</success_criteria>

<output>
Crea `.planning/quick/260703-uwn-aplica-el-redisseny-visual-final-del-ben/260703-uwn-SUMMARY.md` en acabar.
</output>