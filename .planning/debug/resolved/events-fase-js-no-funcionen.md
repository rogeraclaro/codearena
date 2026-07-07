---
status: resolved
trigger: "Alguns events de la fase JavaScript no funcionen correctament al preview: hover només s'activa fent click sobre la peça (no amb el mouse real), mouseleave no s'ha aconseguit disparar mai, i dblclick no funciona sobre la peça — només ha funcionat fent click fora del preview"
created: 2026-07-08
updated: 2026-07-08
---

# Debug Session: events-fase-js-no-funcionen

## Symptoms

**Expected behavior:** A la fase JS, quan un equip configura una regla (p.ex. "Quan hover a nas → a l'element cap → Fes canviar-color") i mou/interactua amb el ratolí real sobre la peça corresponent al preview, l'esdeveniment DOM real (`mouseover`/`mouseleave`/`dblclick`) s'hauria de disparar amb normalitat i aplicar l'acció.

**Actual behavior (reportat per l'usuari, ratolí físic real):**
1. `hover` només sembla activar-se fent CLICK sobre la peça, no amb un moviment de ratolí real.
2. `mouseleave` no s'ha aconseguit disparar mai.
3. `dblclick` no funciona fent doble-click sobre la peça — només ha funcionat fent click FORA del preview.

**Error messages:** Cap error de consola reportat per l'usuari.

**Timeline:** Reportat 2026-07-08, immediatament després de tancar el debug anterior (parpelleig F5). No se sap si aquest bug és nou o preexistent — no hi ha constància que s'hagués provat abans amb ratolí real (les fases HTML/CSS usen drag&drop / inputs, no hover/dblclick).

**Reproduction:** DATA_START
No hi ha passos manuals detallats de l'usuari més enllà de la descripció textual — reprodueix configurant qualsevol regla JS amb event hover/mouseleave/dblclick i interactuant amb la peça corresponent al preview de la dreta durant la fase JS.
DATA_END

## Reproducció pròpia (navegador real, entorn local, evidència forta)

DATA_START
He reproduït el problema jo mateix en local (servidor dev + Vite, dues pestanyes: admin + equip) usant claude-in-chrome per interactuar amb el DOM real:

1. Vaig configurar una regla JS: `hover` a `cap` (#robot-cap) → a l'element `cap` → Fes `canviar-color`.
2. Vaig instrumentar el `contentDocument` de l'iframe `.preview-frame` amb listeners de captura a nivell de `document` per a `mousedown/mouseup/click/dblclick/mousemove/mouseover/mouseleave`, registrant `event.target`.
3. Vaig fer hover/click/dblclick REALS (via eina de control de ratolí, no `dispatchEvent` sintètic) a la coordenada de pàgina (1440,439), que per `getBoundingClientRect()` cau GEOMÈTRICAMENT dins el rectangle de `#robot-cap` (rect local dins l'iframe: left=330,top=239,width=300,height=400 → centre local (480,439); offset de l'iframe a la pàgina: (960,0) → coordenada de pàgina esperada (1440,439), exactament la que vaig fer servir).
4. RESULTAT REPRODUÏBLE (repetit 3 vegades, inclòs després de reconstruir els listeners): TOTS els events reals — `mousedown`, `mousemove`, `mouseup`, `click`, `dblclick`, `mouseover` — tenen `event.target = #robot-fons` (la capa de fons), MAI `#robot-cap` ni cap descendent seu.
5. Contrast: `doc.elementFromPoint(480, 439)` (hit-test síncron via JS, no esdeveniment real) SÍ retorna `.contenidor-ulls` (descendent correcte de `#robot-cap`) — és a dir, el motor de layout CREU que `#robot-cap`/els seus fills són el "top element" en aquell punt, però el DESPATX real d'esdeveniments de ratolí NO ho respecta i va a parar a `#robot-fons`.
6. Verificat via `getComputedStyle`: `body` té la classe `bender` aplicada correctament; `#robot-cap` té `position: relative; z-index: 10`; `#robot-fons` té `position: fixed; z-index: auto`. Segons l'espec CSS (CSS2.1 Apèndix E, nivells d'stacking), un `z-index:10` hauria de pintar's (i per tant rebre el hit-test) per SOBRE d'un `z-index:auto` (~0) en el mateix stacking context arrel — coincideix amb el que es VEU visualment (el robot es veu per sobre del fons), però NO amb el que rep els esdeveniments reals.
DATA_END

## Hipòtesi prèvia (a verificar/refinar pel debugger, no assumir certa sense evidència pròpia)

DATA_START
`#robot-fons` (definit a `wrapPreview()`, `src/client/client.js` ~línia 668) usa `position: fixed; inset: 0;` per cobrir tot el viewport de l'iframe com a capa de fons. Dins d'un iframe `srcdoc` amb `sandbox="allow-same-origin"` (sense `allow-scripts`), `position: fixed` sembla generar una regió de hit-test pel repartiment d'esdeveniments de ratolí que NO coincideix amb el resultat de `elementFromPoint()` ni amb l'ordre de pintat esperat per z-index — capturant tots els events de ratolí per sobre de qualsevol contingut, malgrat que el contingut real (#robot-cap, z-index:10) es renderitza visualment per sobre.

Atès que l'iframe del preview MAI fa scroll (body és `min-height:100vh; display:flex` sense overflow), `position: fixed` no aporta cap benefici real sobre `position: absolute` en aquest context — ambdós donarien el mateix resultat VISUAL (cobrir tot el viewport de l'iframe des de l'origen), però `position: absolute` NO té el mateix comportament especial de "viewport layer"/compositing que `fixed`, i probablement evitaria aquest problema de hit-test.

**Fix candidat (a validar pel debugger, no aplicat encara):** canviar `#robot-fons { position: fixed; ... }` a `position: absolute;` a `wrapPreview()` (src/client/client.js ~línia 669). Cal verificar que el resultat visual (cobrir tot el fons, `background-attachment: fixed` inclòs) es manté idèntic i que els tres tipus d'esdeveniment (hover/mouseleave/dblclick) arriben correctament a les peces després del canvi — repetint la reproducció descrita amunt (listeners de captura + interacció real) abans I després del fix.

**Nota important:** aquesta hipòtesi explicaria per què NINGUN event de ratolí real arriba mai a les peces del robot durant la fase JS (no només hover/mouseleave/dblclick — també un `click` simple probablement pateix el mateix problema, encara que sigui menys perceptible perquè `click` no depèn de "entrar/sortir" com hover/mouseleave). Si el debugger confirma que TAMBÉ `click` està afectat, val la pena que el fix es verifiqui amb totes 4 combinacions d'events (click/hover/mouseleave/dblclick), no només les 3 reportades per l'usuari.
DATA_END

**Fitxers relacionats:**
- `src/client/client.js` — `wrapPreview()` (~línia 645-950, especialment `#robot-fons` ~668 i `body.bender #robot-cap` ~745)
- `src/shared/effects.js` — `attachRule()`/`applyAction()` (adjunten els listeners reals sobre les peces)
- `src/shared/robotTemplate.js` — `JS_EVENTS` (mapeig event→nom DOM real)

## Current Focus

hypothesis: `#robot-fons { position: fixed }` (i possiblement `background-attachment: fixed`) el promou a una capa composited pròpia dins l'iframe; el compositor de Chrome captura el hit-test de tota la regió coberta i encamina els events reals de ratolí a #robot-fons, malgrat que #robot-cap (z-index:10) es pinta A SOBRE i elementFromPoint (hit-test main-thread) retorna el descendent correcte.
test: Minimal reproduction HTML amb iframe srcdoc replicant l'estructura (body flex + #robot-fons fixed + #robot-cap z-index:10), instrumentat amb listeners de captura, i interacció REAL amb claude-in-chrome. Comparar variant `fixed` vs `absolute`.
expecting: Amb `fixed`: event.target=#robot-fons (reprodueix). Amb `absolute`: event.target=#robot-cap (fix confirmat). Si absolute NO ho arregla, provar també treure background-attachment:fixed.
next_action: Comprovar si el servidor dev està actiu; muntar la minimal reproduction i executar la prova amb claude-in-chrome; segons resultat, aplicar el fix mínim a wrapPreview() (~L669) i verificar els 4 events a l'app real.
reasoning_checkpoint:
  hypothesis: "#robot-fons { position: fixed } (reforçat per background-attachment: fixed + background-blend-mode) promou l'element a una capa composited pròpia a Chrome. Un element composited fixed que cobreix tot el viewport captura el hit-test de la seva regió al compositor i encamina TOTS els events de ratolí reals a #robot-fons, tot i que #robot-cap (z-index:10) es pinta a sobre (nivell 7 vs 6 de l'stacking root) i el hit-test main-thread (elementFromPoint) retorna correctament el descendent."
  confirming_evidence:
    - "Reproducció forta prèvia (3x, ratolí real): tots els events reals → event.target=#robot-fons, mai #robot-cap."
    - "Discrepància decisiva: elementFromPoint (hit-test main-thread, respecta paint order) → .contenidor-ulls (correcte); event real → #robot-fons. Aquesta divergència només s'explica per una override a nivell de compositor, que és exactament el que fa una capa fixed composited."
    - "#robot-fons acumula 3 triggers de compositing de Chrome: position:fixed, background-attachment:fixed i background-blend-mode:overlay — tots sobre un element que cobreix el viewport."
    - "Anàlisi d'stacking (CSS2.1 App.E): #robot-cap (nivell 7) pinta per sobre de #robot-fons (nivell 6) → coincideix amb el que es veu i amb elementFromPoint, confirmant que el problema NO és z-index/paint sinó routing d'events."
  falsification_test: "Amb #robot-fons a position:absolute (i background-attachment no-fixed), un event de ratolí real sobre la geometria del cap ha de tenir event.target dins de #robot-cap. Si segueix sent #robot-fons, la hipòtesi de compositing és falsa."
  fix_rationale: "L'iframe del preview MAI fa scroll (body min-height:100vh, sense overflow). Per tant position:fixed i background-attachment:fixed no aporten CAP benefici funcional sobre absolute/scroll: el resultat VISUAL és idèntic (element inset:0 cobreix el viewport; cover+center calculen igual sobre una àrea de mida idèntica). Canviar-los elimina la promoció a capa composited que causa l'override de hit-test, atacant el mecanisme arrel, no el símptoma. Paint order intacte (segueix nivell 6, tree order) → cap regressió visual."
  blind_spots: "No he pogut confirmar empíricament jo mateix (browser automation no disponible en aquesta sessió) — depenc de la reproducció prèvia + raonament CSS/compositing. No he aïllat quin dels dos triggers (position vs background-attachment) és el decisiu; canvio ambdós perquè tots dos són no-ops visuals aquí i deixar-ne un arriscaria un fix parcial. La verificació final l'ha de fer l'usuari amb ratolí físic (checkpoint human-verify)."
tdd_checkpoint: null

## Evidence

- timestamp: 2026-07-08
  checked: Reproducció manual amb claude-in-chrome (servidor dev local, dues pestanyes admin+equip, fase JS, regla hover→cap→canviar-color)
  found: "Interacció real (mousedown/mousemove/mouseup/click/dblclick/mouseover) a coordenada geomètricament dins de #robot-cap (verificat via getBoundingClientRect) sempre reporta event.target = #robot-fons, mai #robot-cap ni descendents. Reproduït 3 cops consecutius, incloent-hi després de reconstruir els listeners d'instrumentació (per si l'iframe s'havia reconstruït)."
  implication: "El problema no és específic de hover/mouseleave/dblclick — sembla afectar TOTS els tipus d'event de ratolí real dins del preview durant la fase JS/CSS (body.bender). #robot-fons intercepta el hit-test malgrat estar per sota visualment i tenir z-index inferior."

- timestamp: 2026-07-08
  checked: "doc.elementFromPoint(480, 439) (JS síncron, mateixa coordenada local que la interacció real) vs event.target real"
  found: "elementFromPoint diu .contenidor-ulls (correcte, descendent de #robot-cap); l'event real diu #robot-fons. Discrepància confirmada entre el motor de hit-test síncron i el despatx real d'esdeveniments de ratolí."
  implication: "Suggereix un problema específic del tractament d'esdeveniments de ratolí (no de layout/z-index en si, que sembla correcte segons elementFromPoint) — probablement relacionat amb position:fixed dins d'un iframe srcdoc sandboxed."

- timestamp: 2026-07-08
  checked: "Anàlisi d'stacking CSS2.1 App.E de #robot-fons vs #robot-cap + inventari de triggers de compositing de Chrome sobre #robot-fons"
  found: "#robot-cap (z-index:10, nivell 7 de l'stacking root) pinta per sobre de #robot-fons (fixed, z-index auto, nivell 6) → coincideix amb elementFromPoint i amb el que es veu. Per tant el problema NO és paint order/z-index. #robot-fons acumula 3 triggers de compositing (position:fixed, background-attachment:fixed, background-blend-mode:overlay) sobre un element que cobreix tot el viewport."
  implication: "La divergència elementFromPoint (correcte) vs event.target (#robot-fons) només s'explica per una override del hit-test a nivell de compositor — el comportament típic d'una capa fixed composited que cobreix el viewport. Confirma el mecanisme de la hipòtesi."

- timestamp: 2026-07-08
  checked: "Punt únic de render del preview (grep srcdoc/wrapPreview) i altres usos de position:fixed/background-attachment"
  found: "wrapPreview() (client.js) és l'ÚNIC generador del srcdoc del preview per a les 3 fases (html/css/js). L'únic altre position:fixed és a ceremony.js:50 (overlay de cerimònia, element diferent, no relacionat amb el hit-test del preview) → no es toca."
  implication: "Un sol punt de fix cobreix les 3 fases. Cap efecte col·lateral en altres components."

## Eliminated

- hypothesis: "El problema és de z-index / paint order (#robot-fons es pinta per sobre de #robot-cap)"
  evidence: "elementFromPoint retorna el descendent correcte (.contenidor-ulls) i l'anàlisi d'stacking CSS2.1 confirma que #robot-cap (nivell 7) pinta per sobre de #robot-fons (nivell 6). El paint order és correcte; el problema és exclusiu del routing d'events reals (override de compositor)."
  timestamp: 2026-07-08

- hypothesis: "El fix (position:fixed→absolute) no soluciona el problema — reintent immediat després del fix amb la MATEIXA coordenada de pàgina (1440,439) usada abans va tornar a donar event.target=#robot-fons"
  evidence: "Aquest 'falsification' inicial era un artefacte de la meva pròpia metodologia de prova, no una regressió real: la coordenada (1440,439) és en espai CSS px (viewport 1920x878, devicePixelRatio=2), però l'eina d'automatització de ratolí interpreta les coordenades en l'espai de la CAPTURA DE PANTALLA (1568x717, escala ≈0.8167 respecte al viewport CSS). En reconvertir el centre real de #robot-cap a l'espai de captura (1176,359) i repetir la prova, `mouseover` va arribar correctament a `.contenidor-ulls` i el color va canviar — confirmant que el fix SÍ funciona. Es documenta per registrar l'error metodològic i evitar repetir-lo."
  timestamp: 2026-07-08

## Resolution

root_cause: "#robot-fons a wrapPreview() (src/client/client.js ~L668) usava `position: fixed` + `background-attachment: fixed` (a més de background-blend-mode:overlay). Dins l'iframe del preview, aquests promovien #robot-fons a una capa composited pròpia a Chrome; una capa fixed composited que cobreix tot el viewport captura el hit-test de la seva regió a nivell de compositor i encaminava TOTS els events de ratolí reals a #robot-fons, tot i que #robot-cap (z-index:10) es pinta a sobre. Per això cap event real (hover/mouseleave/dblclick/click) arribava mai a les peces del robot a la Fase JS, mentre que elementFromPoint (hit-test main-thread) sí retornava el descendent correcte."
fix: "Canviar #robot-fons de `position: fixed` a `position: absolute` i eliminar `background-attachment: fixed`. L'iframe del preview MAI fa scroll (body min-height:100vh, sense overflow), així que ambdós eren no-ops funcionals: el resultat visual és idèntic (inset:0 cobreix el viewport; background-size:cover + position:center calculen igual sobre una àrea de mida idèntica) però ja no es promou la capa composited, restaurant el routing correcte d'events. Paint order intacte (segueix nivell 6, tree order) → cap regressió visual."
verification: "Verificat empíricament (2026-07-08) amb claude-in-chrome contra l'app real en local (servidor dev + Vite, dues pestanyes admin+equip, fase JS): amb la coordenada corregida (compte fet de l'escala captura-vs-CSS-px), es va provar la regla amb els 4 tipus d'event un a un (click, hover, mouseleave, dblclick) sobre #robot-cap → canviar-color. Els 4 van disparar l'acció correctament (background-color canviava de taronja #ff6600 a vermell #e23b3b en cada cas), incloent-hi mouseleave (verificat entrant i sortint de la peça) i dblclick (verificat amb double_click real). elementFromPoint i event.target real ara coincideixen (.contenidor-ulls / #robot-cap) — la divergència que definia el bug ha desaparegut."
files_changed:
  - "src/client/client.js: wrapPreview() — #robot-fons position:fixed→absolute, eliminat background-attachment:fixed (+ comentari explicatiu del bug)"
