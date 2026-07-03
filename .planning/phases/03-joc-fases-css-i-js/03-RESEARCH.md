# Phase 3: Joc — Fases CSS i JS - Research

**Researched:** 2026-07-04
**Domain:** Real-time server-authoritative state sync + safe declarative effect interpreter over a sandboxed same-origin `srcdoc` iframe (Vanilla JS + Socket.io)
**Confidence:** HIGH (all findings grounded in this repo's code + MDN-verified iframe semantics)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Abast del "CSS foradat" (element per element)**
- **D-01:** Principi "codi foradat" (sintaxi CSS real, valors via controls tancats, mai text lliure) — tancat, no es reobre. Aquesta fase només concreta la implementació.
- **D-02:** `#robot-contenidor` i la cassoleta d'antena (`::before`) **100% fixos** (estructura pre-construïda).
- **D-03:** `.antena` (bola): forats = **background-color** i **border-color**. Fixos: mida, posició, tija (`::before`).
- **D-04:** `.orella`: forats = **top**, **left/right** (posició), **width** (mida), tots sliders. Target Plana Model: `top: 95px`, `left: -31px`/`right: -31px`, `width: 40px`.
- **D-05:** `.contenidor-ulls`: forats = **background-color** i **top**. Fixos: `border-radius`, `width`/`height`, `border`, `::before`.
- **D-06:** `.ull`: forat = **border-radius**. Fix: color, mida, pseudo-elements.
- **D-07:** `#nas`: forats = **border-radius** i **mida** (width/height). Fix: color (negre).
- **D-08:** `#boca`: forats = **height**, **width**, **color de les dents** (stop clar del `repeating-linear-gradient`, avui `#fffcd3`). Fix: `border-radius`.
- **D-09:** `#robot-cap`: forats = **background-color**, **border-color**, **border-width**. Fix: `border-radius` (el·líptic de 8 valors).
- **D-10:** Fons de pàgina **NO** és forat — reutilitza `wrapPreview()` (`/robot-fons.png` + overlay), no el `background-color` pla del CSS pastat.

**Catàleg de regles JS (GAME-05)**
- **D-11:** Model **obert/variety-based** (no compara amb Plana Model). L'equip decideix quantes/quines interaccions (màx 5-6). Puntuació (Fase 4) = cobertura d'events/elements + 1-2 accions "bonus" ocultes.
- **D-12:** Cada regla = **4 buits**: `Quan [event] a [origen] → a l'element [destí] → Fes [acció]`. UI: botó **"Veure"** per fila + botó **"Afegir JavaScript"**. Límit **5-6 files**.
- **D-13:** Events: **click, hover/mouseover, mouseleave, dblclick** (4).
- **D-14:** Elements (origen i destí): **nas, boca, cap sencer (`#robot-cap`), antena, orella-esquerra, orella-dreta, ull-esquerre, ull-dret** (8).
- **D-15:** Anti-repetició: no es pot repetir la mateixa parella **(event, origen)** en dues files.
- **D-16:** Accions simples: **Canviar de color** (paleta tancada), **Amagar/mostrar** (toggle), **Girar** (rotate), **Canviar mida** (scale).
- **D-17:** Accions compostes (multi-element predefinit). En triar-ne una, el desplegable **"element destí" es desactiva**.
- **D-18:** Multi-destí triable i seqüències temporals **descartades**. Només 1 origen → 1 destí (o composta amb destins fixos).

**DOM incomplet (GAME-07)**
- **D-19:** **Cap tractament especial d'UI**. Selector CSS / `querySelector` / listener sobre element inexistent = no-op natural. Únic requisit: verificar (QA/tests) que cap acció sobre element absent llenci error de consola ni bloquegi el panell.

**Layout i progrés Admin**
- **D-20:** CSS i JS **reutilitzen el split de Fase 2** (panell esquerra + preview dreta), canviant només el contingut de `.action-panel`.
- **D-21:** Corregir el split a **divisió exacta 50/50** (aplica a les 3 fases).
- **D-22:** Progrés Admin per CSS/JS = **només estat de connexió**, **sense comptador N/total** (`getPublicState().progress === null`).

### Claude's Discretion
- **Catàleg exacte d'accions compostes JS** — el planner pot ampliar-lo; els 2 exemples de D-17 són el mínim garantit.
- **Detall visual concret** dels controls CSS i de les files de regles JS — a criteri d'UI/planner, respectant UX-01 i coherència amb Fase 2.
- **Durada del temporitzador CSS/JS** — la decidirà l'usuari després; no bloqueja (timer ja configurable des de l'Admin).
- **Ordre top→bottom dels selector groups** al panell CSS (UI-SPEC).
- **`min`/`max`/`step`** dels sliders (UI-SPEC: target values locked, ranges tunable).

### Deferred Ideas (OUT OF SCOPE)
- **SCORE-03** re-redacció (assumeix tripleta única, contradiu D-11) → Fase 4, no aquí.
- **Botó "Llest!" per CSS/JS** (GAME-08) → diferit, no es reobre.
- **Motor de puntuació real** (SCORE-01/02/03) → Fase 4. **Desplegament** → Fase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAME-04 | Fase CSS: codi "foradat" amb sintaxi CSS real i valors controlats (color pickers, sliders) | §Architecture Pattern 1 (CSS custom-property injection) + §Forat→var() Mapping table + §Pattern 3 (server-authoritative CSS state, emit-on-`change`) |
| GAME-05 | Fase JS: constructor de regles "Quan X → Y → Z" amb desplegables | §Architecture Pattern 2 (parent-driven effect interpreter, no eval) + §Pattern 4 (server-authoritative rule storage + closed-vocab validation) + §JS element→selector map |
| GAME-07 | Fases CSS/JS operen sobre DOM incomplet sense trencar-se | §Architecture Pattern 5 (no-op guards) + §Pitfall 4 + §Code Example 4 (cheap verification via null-returning querySelector + CSSOM setProperty tolerance) |
</phase_requirements>

## Summary

Phase 3 adds **two new play subsystems** on top of the fully-working Phase-1/2 real-time shell: a **CSS "forat" panel** (9 selectors, 16 closed controls) and a **JS rule builder** (up to 6 declarative rows). No new libraries are needed — everything is already installed (`socket.io` 4.8.3, `dompurify` 3.4.11, `lucide`, native form elements). The whole phase is an application of patterns this codebase already proves: **server-authoritative in-memory state**, **`mutation-returns-bool` mutators**, **directed private per-team broadcasts** (never `io.to('session')` for a single team's work), **F5 recovery via a directed state emit on connection**, and **DOM-text-only / DOMPurify** discipline.

The single most important technical decision is **how the preview iframe applies changes**. The current pipeline reassigns the *entire* `srcdoc` string on every change (`assemblePreview()` → `setAttribute('srcdoc', …)`), which fully reloads the iframe. That is fine for discrete drag-drops but **catastrophic for continuous slider drags** (flicker, refetch, lost animation state) and unnecessary for JS interactivity. The recommended architecture instead: **build the styled `srcdoc` ONCE per phase entry** with the definitive Bender CSS rewritten so each of the 9 holes is a `var(--hole-name, default)`, then drive live changes by reaching into the same-origin `contentDocument` from the trusted parent — `documentElement.style.setProperty('--x', value)` for CSS holes, and `contentDocument.querySelector(sel).addEventListener(...)` for JS rules. **MDN confirms** that `sandbox="allow-same-origin"` (the iframe's *current* setting, with **no** `allow-scripts`) lets the parent read and manipulate the iframe DOM, while native events still fire on parent-attached listeners. This means the JS phase runs with **zero script execution inside the iframe and zero `eval`/`Function`** — the interpreter is a frozen dispatch table in parent code.

There is one class of work the planner must resolve before implementation: **several locked holes (D-03, D-05, D-08, D-09) do not map cleanly onto the actual source-of-truth Bender CSS** (the ball is a `::before` radial-gradient, the visor is a flex child with no `top`, the cap background is a multi-stop metallic gradient, the mouth "teeth" live inside a `repeating-linear-gradient`). The *existence* of these holes is locked and not up for debate; only *how to express each as a `var()`* needs a micro-decision. Concrete recommendations and the exact discrepancies are in §Open Questions and the §Forat→var() Mapping table.

**Primary recommendation:** Keep the iframe **scriptless** (`sandbox="allow-same-origin"` only). Build `srcdoc` once per phase; drive CSS holes via **CSSOM `setProperty` of custom properties** and JS rules via a **frozen parent-side dispatch table attached to `contentDocument`**. Add `cssValues: {}` and `jsRules: []` to each team, mutate them through `mutation-returns-bool` functions that validate against frozen enums, emit CSS on `change` only (no per-frame storm — no remote observer exists), and recover both on connection via directed events — exactly mirroring `placement`/`getTeamBoard`/`TEAM_BOARD_STATE`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canonical CSS values (9 holes) & JS rules (≤6) | **API/Backend** (`gameState.js` team objects) | — | CORE-01: server owns all authoritative state; client is a render layer. Mirrors `placement`. |
| Input validation (hole ids, hex colors, numeric ranges, rule vocab, anti-repeat, row limit) | **API/Backend** (mutators) | Client (UX pre-filtering only) | V5: never trust the client. Server re-validates against frozen enums like `placePiece` re-checks `SLOTS`. |
| Live preview rendering (custom-property update, listener attach) | **Browser/Client** (parent code → `contentDocument`) | — | The iframe is a pure render surface; the parent is trusted code driving it. |
| Effect execution (color/show-hide/rotate/scale/composite) | **Browser/Client** (frozen dispatch table) | — | No server involvement per-effect; effects are deterministic DOM ops on existing nodes. |
| F5 / reconnection recovery of CSS+JS state | **API/Backend** (directed emit on connection) | Client (rebuild `srcdoc` + apply) | CORE-03. Reuses the exact `TEAM_BOARD_STATE`-on-connect pattern. |
| Admin visibility for CSS/JS | **API/Backend** (`getPublicState`, connection-only) | Admin client | D-22: `progress` stays `null` outside `html`; already the code's behavior. |

## Standard Stack

### Core (all already installed — verified in `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| socket.io / socket.io-client | 4.8.3 | Directed per-team state sync + F5 recovery | Already the transport for `placement`; `connectionStateRecovery` already configured in `index.js`. [VERIFIED: package.json] |
| dompurify | 3.4.11 | Sanitize assembled robot HTML before `srcdoc` | Already used in `assemblePreview()`. Unchanged for Phase 3. [VERIFIED: package.json] |
| lucide | 1.23.0 | Icons (UX-01) | Already used for Lock/MoveDown. [VERIFIED: package.json] |
| — native `<input type="color">` / `<input type="range">` / `<select>` | platform | Closed CSS/JS controls | UI-SPEC mandates native controls; no library. Native color input always yields `#rrggbb` (validation-friendly). [CITED: UI-SPEC §Design System] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | — | **No new supporting libraries.** SortableJS (1.15.7) is HTML-phase only and is not used by CSS/JS. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Parent-driven interpreter over scriptless iframe | `sandbox="allow-scripts allow-same-origin"` + injected `<script>` reading a JSON rule island | **Rejected.** Combining `allow-scripts` + `allow-same-origin` lets framed content remove its own sandbox — MDN explicitly warns against it. Adds an in-iframe script surface for zero benefit; the parent already has full DOM access. |
| CSS custom properties | Full `srcdoc` reassembly per change | **Rejected for sliders.** Full reassembly reloads the iframe every frame → flicker, `/robot-fons.png` re-decode, lost `transition` state. Keep reassembly ONLY for structural changes (phase entry / F5). |
| Emit CSS value on every `input` | Emit throttled (rAF/80ms) | Throttling is a valid fallback, but **unnecessary**: no other client observes a team's CSS preview (admin is connection-only, D-22), so emit only on `change` (settled value) — simplest and lowest-traffic. |

**Installation:** none — `npm install` already satisfied.

**Version verification:** `npm view socket.io version` → 4.8.x line current; project pins 4.8.3. No upgrade required for this phase. [VERIFIED: package.json pins]

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** All dependencies (`socket.io`, `socket.io-client`, `dompurify`, `lucide`, `@fontsource/inter`, `sortablejs`, `vite`) are already present and were vetted in prior phases.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
CSS PHASE (state.phase === 'css')
──────────────────────────────────
 [student drags slider / picks color]
        │  input  (live, local)                 change (commit)
        ▼                                              │
 parent: contentDocument.documentElement                │ socket.emit(TEAM_SET_CSS,{holeId,value})
   .style.setProperty('--hole', value) ──► iframe        ▼
   (instant, no reload, GPU-cheap)         (scriptless   gameState.setCssValue(teamId,holeId,value)
        │                                    render)        │  validate holeId∈HOLES, hex/numeric range
        │                                                   │  mutation-returns-bool
        ▼                                                   ▼ (true only if changed)
   robot visibly acquires Bender look          io.to(`team:<id>`).emit(TEAM_CSS_STATE,{cssValues})
                                               io.to('admin').emit(SESSION_FULL_STATE)  // conn-only, progress=null
        ▲                                                   │
        └──────────── reconcile: apply all cssValues ◄──────┘

JS PHASE (state.phase === 'js')
──────────────────────────────────
 [student fills 4 dropdowns] ──► socket.emit(TEAM_SET_RULES,{rules})
        │                               ▼
        │                        gameState.setJsRules(...) validate vocab, anti-repeat(D-15),
        │                        limit≤6, composite⇒desti=null; mutation-returns-bool
        │                               ▼
        │                   io.to(`team:<id>`).emit(TEAM_JS_STATE,{jsRules})
        ▼                               │
 ["Veure" = client-only preview]        ▼
 parent: for each rule → contentDocument.querySelector(originSel)
          .addEventListener(eventMap[event], () => applyAction(doc, targetSel, actionKey))
          (guard: if element null → skip = natural no-op, GAME-07/D-19)

F5 / RECONNECT (both phases)
──────────────────────────────────
 socket connects (token) → connection handler emits, DIRECTED to owner:
   TEAM_CSS_STATE {cssValues}  and/or  TEAM_JS_STATE {jsRules}
 client rebuilds srcdoc ONCE, applies stored values / re-attaches rules  (CORE-03)
```

### Recommended Project Structure (extends existing files — no new dirs)
```
src/shared/robotTemplate.js   # + CSS_HOLES (frozen), JS_ELEMENTS (frozen selector map),
                              #   JS_EVENTS/JS_ACTIONS/JS_COMPOSITE_ACTIONS (frozen vocab)
src/server/gameState.js       # + team.cssValues{}, team.jsRules[]; setCssValue/setJsRules
                              #   (mutation-returns-bool); getTeamStyle/getTeamRules projections
src/server/events.js          # + TEAM_SET_CSS, TEAM_SET_RULES, TEAM_CSS_STATE, TEAM_JS_STATE
src/server/socketHandlers.js  # + handlers (identity from socket.data.teamId, V5 validate);
                              #   connection handler emits css/js state on reconnect
src/client/client.js          # + renderCssPanel(), renderJsPanel(), buildStyledSrcdoc(),
                              #   applyCssHole(), attachRule()/applyAction(); wrapPreview() rewrite
src/client/client.css         # + .css-forat-group/.css-forat/.js-rule tokenized styles;
                              #   .active-split → grid-template-columns: 1fr 1fr (D-21)
```

### Pattern 1 — CSS holes as live custom properties (GAME-04)

**What:** Rewrite the definitive Bender CSS inside `wrapPreview()` so every hole is `var(--name, <default>)`. Build the `srcdoc` once on phase entry; update a single custom property per interaction without touching `srcdoc`.

**When to use:** All 16 CSS controls. This is the recommended replacement for the current per-change full `srcdoc` reassembly.

**Why:** No iframe reload → no flicker, no `/robot-fons.png` re-decode, `transition` on `.ull`/`#nas` preserved. Setting a custom property on `documentElement` when the target element is absent is a pure no-op (GAME-07). Applying via **CSSOM `setProperty`** (not string interpolation) closes the CSS-injection vector (V5).

```js
// parent code (client.js) — instant local feedback on slider `input`
function applyCssHole(holeId, value) {
  const doc = document.querySelector('.preview-frame')?.contentDocument;
  if (!doc) return;                              // iframe not ready → no-op
  const cssVar = CSS_HOLES[holeId]?.var;         // frozen map, unknown id → no-op (V5)
  if (!cssVar) return;
  // CSSOM setter: rejects invalid values, never injects raw CSS text (V5 anti-injection)
  doc.documentElement.style.setProperty(cssVar, value);
}
// reconcile on authoritative TEAM_CSS_STATE / F5: apply every stored value
function applyAllCssValues(cssValues) {
  for (const [holeId, value] of Object.entries(cssValues)) applyCssHole(holeId, value);
}
```

**srcdoc CSS rewrite (illustrative — clean-mapping holes):**
```css
.contenidor-ulls { background: var(--ulls-bg, #cfe1ee); }
.ull  { border-radius: var(--ull-radius, 50%); }
#nas  { width: var(--nas-size, 22px); height: var(--nas-size, 22px);
        border-radius: var(--nas-radius, 50%); }
#robot-cap { border: var(--cap-border-width, 6px) solid var(--cap-border-color, #232c3a); }
/* boca teeth: replace BOTH light stops of the repeating gradient */
#boca { background: repeating-linear-gradient(180deg,
          var(--boca-dents, #f2e6a8) 0px, var(--boca-dents, #f2e6a8) 16px,
          #1c2530 16px, #1c2530 19px); }
```
See the §Forat→var() Mapping table for the 4 non-clean holes (D-03 ball, D-05 visor `top`, D-09 cap background, and the D-08 dents-color discrepancy).

### Pattern 2 — JS rules as a parent-driven effect interpreter (GAME-05, no eval)

**What:** A closed-vocabulary dispatcher in trusted parent code. Event names, element keys, and action keys are all keys into **frozen objects**; an unknown key is a no-op. No `eval`, no `Function`, no student text ever becomes code (GAME-06). The iframe stays scriptless.

**When to use:** Applying rules and the per-row "Veure" preview.

**Why safe:** [VERIFIED: MDN iframe docs] — with `sandbox="allow-same-origin"` (no `allow-scripts`) "a same-origin parent document can still access and interact with the iframe's DOM… `allow-scripts` only controls script execution within the embedded browsing context." Native mouse events fire on parent-attached listeners regardless of `allow-scripts`. Effects only toggle `style`/`classList`/`visibility` on existing nodes — never `innerHTML` — so there is **no new HTML-injection surface** through the DOMPurify+`srcdoc` pipeline.

```js
// frozen vocab (src/shared/robotTemplate.js) — single source of truth
export const JS_EVENTS = Object.freeze({ click:'click', hover:'mouseover',
  mouseleave:'mouseleave', dblclick:'dblclick' });
export const JS_ELEMENTS = Object.freeze({            // D-14 → selector
  nas:'#nas', boca:'#boca', 'cap':'#robot-cap', antena:'.antena',
  'orella-esquerra':'#orella-esquerra', 'orella-dreta':'#orella-dreta',
  'ull-esquerre':'.contenidor-ulls .ull:nth-of-type(1)',   // spans have NO id
  'ull-dret':'.contenidor-ulls .ull:nth-of-type(2)' });
export const JS_ACTIONS = Object.freeze({             // D-16 simple actions
  'canviar-color': (el) => { el.style.backgroundColor = '#e23b3b'; },
  'amagar-mostrar':(el) => { el.style.visibility = el.style.visibility==='hidden'?'visible':'hidden'; },
  'girar':         (el) => { el.classList.toggle('js-rotate'); },   // CSS keyframes in srcdoc
  'canviar-mida':  (el) => { el.classList.toggle('js-scale'); } });
export const JS_COMPOSITE_ACTIONS = Object.freeze({   // D-17 designer-authored, destí ignored
  'acluca-tanca': [ {sel:'.ull', fn:(el)=>el.classList.add('js-squint')},
                    {sel:'#boca', fn:(el)=>el.style.height='4px'} ] });

// parent code (client.js): attach one rule to contentDocument (guarded = GAME-07)
function attachRule(doc, rule) {
  const origin = doc.querySelector(JS_ELEMENTS[rule.origen]);
  if (!origin) return;                                  // absent origin → no-op (D-19)
  origin.addEventListener(JS_EVENTS[rule.event], () => applyAction(doc, rule));
}
function applyAction(doc, rule) {
  const composite = JS_COMPOSITE_ACTIONS[rule.accio];
  if (composite) { composite.forEach(({sel, fn}) =>
      doc.querySelectorAll(sel).forEach(fn)); return; } // empty NodeList → no-op
  const target = doc.querySelector(JS_ELEMENTS[rule.desti]);
  const fn = JS_ACTIONS[rule.accio];
  if (target && fn) fn(target);                          // absent target OR unknown action → no-op
}
```
Re-attaching on rule change: rebuild the styled `srcdoc` once (fresh DOM, no stale listeners) and re-attach all rules on the iframe `load` event, OR keep a live handle list and detach before re-attaching. Rebuilding-on-`load` is simpler and matches the "re-render on accepted change" idiom.

### Pattern 3 — Server-authoritative CSS state, emit on `change` (anti-storm)

**What:** Add `cssValues` to each team; mutate via `setCssValue` returning bool; emit directed `TEAM_CSS_STATE` only when changed.

**Why:** Exact mirror of `placePiece`/`removePiece`. Because **no remote client observes a team's CSS preview** (D-22 admin = connection-only), the client renders locally on `input` and emits to the server only on `change` (settled value) — the value that matters for recovery (CORE-03) and future scoring (SCORE-02, Fase 4). `mutation-returns-bool` suppresses re-broadcast when the value is unchanged.

```js
// gameState.js — mirrors placePiece (validate against frozen enum, return bool)
function setCssValue(teamId, holeId, value) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'css' || state.timerStatus === 'frozen') return false; // GAME-07/D-11
  const hole = CSS_HOLES[holeId];                        // enum from template (V5)
  if (!hole) return false;
  if (!hole.validate(value)) return false;               // hex regex OR numeric-in-range
  if (team.cssValues[holeId] === value) return false;    // no-op → no re-broadcast
  team.cssValues[holeId] = value;
  return true;
}
```

### Pattern 4 — Server-authoritative JS rules, closed-vocab validation

**What:** Add `jsRules: []`; validate every field against frozen sets, enforce anti-repeat (D-15), 5-6 row limit (D-11/D-12), and composite⇒`desti=null` (D-17).

```js
function setJsRules(teamId, rules) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'js' || state.timerStatus === 'frozen') return false;
  if (!Array.isArray(rules) || rules.length > JS_ROW_LIMIT) return false;      // ≤6
  const seen = new Set();
  for (const r of rules) {
    if (!(r.event in JS_EVENTS) || !(r.origen in JS_ELEMENTS)) return false;   // vocab (V5)
    const isComposite = r.accio in JS_COMPOSITE_ACTIONS;
    const isSimple = r.accio in JS_ACTIONS;
    if (!isComposite && !isSimple) return false;
    if (isSimple && !(r.desti in JS_ELEMENTS)) return false;
    if (isComposite && r.desti != null) return false;                          // D-17
    const key = `${r.event}|${r.origen}`;
    if (seen.has(key)) return false;                                           // D-15 anti-repeat
    seen.add(key);
  }
  team.jsRules = rules.map(({event, origen, desti, accio}) => ({event, origen, desti, accio}));
  return true;
}
```
Granularity is the planner's call: a single `TEAM_SET_RULES` carrying the whole array (simplest; the whole rule set is tiny) vs. granular add/update/remove events. Whole-array-replace is recommended — it sidesteps id bookkeeping and matches the "authoritative snapshot" model.

### Pattern 5 — DOM-incomplete guards (GAME-07 / D-19)

**What:** Every DOM access null-checks. CSSOM `setProperty` on `documentElement` is inherently safe (no target lookup). `querySelector` returns `null` for absent elements → guard `if (!el) return;`. `querySelectorAll` returns an empty NodeList → `forEach` is a natural no-op.

**Why cheap to verify:** the guard logic is pure and testable without a browser (see §Code Example 4). No special-case UI, exactly per D-19.

### Anti-Patterns to Avoid
- **Reassembling `srcdoc` on every slider `input`** — full iframe reload, flicker, refetch. Reassemble only on phase entry / F5 / structural change.
- **Adding `allow-scripts` to the preview iframe** — reintroduces an in-iframe script surface and (with `allow-same-origin`) lets content unsandbox itself. The parent already has full DOM access; keep it scriptless.
- **String-interpolating hole values into a `<style>` tag** — CSS-injection vector. Use CSSOM `setProperty`.
- **`eval` / `new Function` / building code from dropdown values** — the entire point of D-11..D-18 is a closed interpreter. Dropdown values are *keys into frozen tables*, never code.
- **Broadcasting a team's CSS/JS change to `io.to('session')`** — Pitfall 1 (re-render storm). Directed `team:<id>` only; admin gets connection-only `SESSION_FULL_STATE`.
- **Hand-listing the 8 JS elements or 9 CSS holes in client code** — derive from the frozen `robotTemplate.js` maps (single source of truth), like `SLOTS`/`CONTAINERS`.

## Forat → `var()` Mapping (game data — 16 controls, derived from D-03…D-09 + source-of-truth CSS)

Source of truth for the definitive Bender CSS: `/Users/rogermasellas/Desktop/imparticio/index.html` (lines 25-179), referenced by the existing `wrapPreview()` comment. **Read this file when implementing** — it carries the exact fixed values. ⚠ = needs a design micro-decision (see §Open Questions); the hole's *existence* is locked, only the `var()` expression is open.

| # | Hole (CONTEXT) | Selector | Source property & value | Recommended `var()` strategy | Flag |
|---|----------------|----------|-------------------------|------------------------------|------|
| 1 | antena background-color (D-03) | `.antena::before` (the ball) | `background: radial-gradient(...)` | `background: var(--antena-bg, <radial default>)` | ⚠ ball is `::before`, source uses radial-gradient not flat color |
| 2 | antena border-color (D-03) | `.antena::before` | none (box-shadow glow only) | add `border: 2px solid var(--antena-border, transparent)` | ⚠ no border exists in source; must add |
| 3 | orella top (D-04) | `.orella` | `top: 130px` (target 95px) | `top: var(--orella-top, 130px)` | target 95px; range 60–130 |
| 4 | orella left/right (D-04) | `#orella-esquerra`/`#orella-dreta` | `left/right: -52px` (target -31px) | one slider → set BOTH `left`/`right` from `var(--orella-offset)` | symmetric single control |
| 5 | orella width (D-04) | `.orella` | `width: 70px` (target 40px) | `width: var(--orella-width, 70px)` | range 20–90 |
| 6 | ulls background-color (D-05) | `.contenidor-ulls` | `background: #cfe1ee` | `background: var(--ulls-bg, #cfe1ee)` | clean |
| 7 | ulls top (D-05) | `.contenidor-ulls` | none (flex child, not positioned) | add `position: relative; top: var(--ulls-top, 0)` | ⚠ not positioned in source; must add `position` |
| 8 | ull border-radius (D-06) | `.ull` | `border-radius: 50% / 55%` | `border-radius: var(--ull-radius, 50%)` | single-value approximation of 2-value |
| 9 | nas border-radius (D-07) | `#nas` | `border-radius: 50%` | `border-radius: var(--nas-radius, 50%)` | clean; range 0–50% |
| 10 | nas size (D-07) | `#nas` | `width/height: 22px` | `width/height: var(--nas-size, 22px)` | one slider both dims |
| 11 | boca height (D-08) | `#boca` | none explicit (padding-driven) | add `height: var(--boca-height, auto)` | ⚠ no explicit height in source |
| 12 | boca width (D-08) | `#boca` | `width: 60%` | `width: var(--boca-width, 60%)` | pick px or keep % |
| 13 | boca dents color (D-08) | `#boca` | light stops of `repeating-linear-gradient` = `#f2e6a8` | replace both light stops with `var(--boca-dents, #f2e6a8)` | ⚠ D-08 states target `#fffcd3`, source has `#f2e6a8` |
| 14 | cap background-color (D-09) | `#robot-cap` | `background: linear-gradient(6-stop metallic)` | `background: var(--cap-bg, <gradient default>)` | ⚠ flat color flattens the metallic gradient |
| 15 | cap border-color (D-09) | `#robot-cap` | `border: 6px solid #232c3a` | split → `var(--cap-border-color, #232c3a)` | clean once split |
| 16 | cap border-width (D-09) | `#robot-cap` | `border: 6px …` | split → `var(--cap-border-width, 6px)` | range 0–12 |

**Fixed (never a forat), from source CSS:** `#robot-contenidor` + antenna cradle (D-02); `.antena` stem geometry (D-03); `.contenidor-ulls` border-radius/size/border/`::before` (D-05); `.ull` color/size/`::before` pupil (D-06); `#nas` color/gradient (D-07); `#boca` border-radius (D-08); `#robot-cap` `border-radius` 8-value ellipse (D-09); page background = `wrapPreview()`'s `/robot-fons.png` (D-10).

## JS Element → Selector Map (game data, derived for D-14)

| Dropdown key (D-14) | Selector | Source | Note |
|---------------------|----------|--------|------|
| nas | `#nas` | SLOTS `nas` | `<button id="nas">` |
| boca | `#boca` | SLOTS `boca` | `<output id="boca">` |
| cap sencer | `#robot-cap` | CONTAINERS `robot-cap` | container, not a slot |
| antena | `.antena` | SLOTS `antena-esquerra` html | `<div class="antena">`, **no id** |
| orella-esquerra | `#orella-esquerra` | SLOTS | `<img id="orella-esquerra">` |
| orella-dreta | `#orella-dreta` | SLOTS | `<img id="orella-dreta">` |
| ull-esquerre | `.contenidor-ulls .ull:nth-of-type(1)` | SLOTS `ull-1` | ⚠ both `<span class="ull">` share the class, **no id** → must use `:nth-of-type` |
| ull-dret | `.contenidor-ulls .ull:nth-of-type(2)` | SLOTS `ull-2` | same |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Run student "JS" safely | An `eval`/`Function` sandbox, a mini-parser, or a Web Worker VM | Frozen dispatch table keyed by closed dropdown values | Vocabulary is fixed (4 events × 8 elements × N actions); a lookup table is complete, safe, and ~30 lines. |
| Interactive iframe behavior | `allow-scripts` + injected interpreter script | Parent code driving `contentDocument` (MDN-confirmed) | Keeps iframe scriptless; no unsandboxing risk; reuses the existing `allow-same-origin` sandbox. |
| Live style updates | Per-frame `srcdoc` rebuild or a CSS-in-JS lib | Native CSS custom properties + CSSOM `setProperty` | Zero deps, GPU-cheap, no reload, injection-safe. |
| Per-team state sync + F5 recovery | A new resync/RPC protocol | Copy `placement`→`getTeamBoard`→`TEAM_BOARD_STATE`-on-connect | Already proven for HTML placement; `connectionStateRecovery` already on. |
| Color validation | Custom parser | Native `<input type=color>` (always `#rrggbb`) + server hex regex | Native control constrains output; server enforces the invariant. |

**Key insight:** every "new" capability in this phase is a re-application of an existing, tested pattern in this repo. The risk is not the framework — it's (a) the iframe update strategy and (b) resolving the 4 hole↔source-CSS mismatches. Both are addressed above.

## Common Pitfalls

### Pitfall 1: Full `srcdoc` reassembly on continuous slider input
**What goes wrong:** iframe reloads every frame → flicker, `/robot-fons.png` re-decode, `.ull`/`#nas` `transition` state lost, janky feel on classroom Windows PCs.
**Why it happens:** copying the HTML-phase `assemblePreview()` habit (which reassigns `srcdoc`) into the CSS phase.
**How to avoid:** build `srcdoc` once per phase entry; update custom properties via CSSOM. Reassemble only on phase entry / F5 / structural change.
**Warning signs:** visible flash on slider drag; background image flicker; DevTools shows repeated document loads.

### Pitfall 2: Re-render storm via `io.to('session')`
**What goes wrong:** every CSS tweak / rule edit of one team re-renders all clients.
**Why it happens:** using the admin-handler broadcast shape for team-scoped mutations.
**How to avoid:** directed `io.to(\`team:<id>\`)` for the owner's state; `io.to('admin')` connection-only. Never `io.to('session')` for a single team's work (matches `TEAM_PLACE_PIECE`).
**Warning signs:** other teams' previews flicker when one team acts.

### Pitfall 3: Stale JS listeners accumulate
**What goes wrong:** editing a rule attaches a new listener without removing the old → an element fires multiple/contradictory effects.
**Why it happens:** attaching on rule change without teardown.
**How to avoid:** rebuild the `srcdoc` once on rule change and re-attach all rules on `load` (fresh DOM = no stale listeners), OR keep handles and `removeEventListener` before re-attaching. Prefer the rebuild.
**Warning signs:** a single click triggers an effect N times after N edits.

### Pitfall 4: Assuming absent elements throw (GAME-07)
**What goes wrong:** `doc.querySelector('#nas').addEventListener(...)` throws `TypeError` when `#nas` was never placed, blocking the rest of the panel.
**Why it happens:** no null guard before use.
**How to avoid:** `const el = doc.querySelector(sel); if (!el) return;` everywhere; prefer `querySelectorAll(...).forEach` for class targets (empty = no-op). CSSOM `setProperty` needs no guard.
**Warning signs:** console `TypeError: Cannot read properties of null`; a missing piece breaks unrelated rules.

### Pitfall 5: CSS injection through a hole value
**What goes wrong:** a forged `TEAM_SET_CSS` value like `red;} body{display:none}` breaks out if interpolated into a `<style>` string.
**Why it happens:** building CSS text by concatenation.
**How to avoid:** apply values only via `element.style.setProperty()` (CSSOM rejects invalid values, no text-context escape); server validates color as `^#[0-9a-fA-F]{6}$` and sliders as clamped numbers before storing.
**Warning signs:** hole value contains `;`, `{`, `}`, or non-hex characters and still reaches the DOM.

## Code Examples

### Example 1 — Build the styled srcdoc ONCE (phase entry / F5), then live-update
```js
// client.js — called on entering css/js phase and on F5 rebuild
function renderStyledPreview(placement, cssValues) {
  const frame = document.querySelector('.preview-frame');
  if (!frame) return;
  frame.setAttribute('srcdoc', wrapPreview(assembleRobotMarkup(placement))); // Bender CSS w/ var()
  frame.addEventListener('load', () => {
    applyAllCssValues(cssValues);                 // set every stored custom property
    if (latestState.phase === 'js') latestRules.forEach((r) => attachRule(frame.contentDocument, r));
  }, { once: true });
}
```

### Example 2 — Slider: local live render + emit on commit only
```js
slider.addEventListener('input',  (e) => applyCssHole(holeId, `${e.target.value}px`)); // local, instant
slider.addEventListener('change', (e) => socket.emit(EVENTS.TEAM_SET_CSS,               // commit → server
  { holeId, value: `${e.target.value}px` }));
colorInput.addEventListener('input',  (e) => applyCssHole(holeId, e.target.value));      // #rrggbb
colorInput.addEventListener('change', (e) => socket.emit(EVENTS.TEAM_SET_CSS, { holeId, value: e.target.value }));
```

### Example 3 — Server handler (mirror of TEAM_PLACE_PIECE, identity from socket.data)
```js
socket.on(EVENTS.TEAM_SET_CSS, safeHandler((payload) => {
  const teamId = socket.data.teamId;                          // V4: never from payload
  if (!teamId) return;
  const { holeId, value } = payload || {};
  if (typeof holeId !== 'string' || typeof value !== 'string') return;   // V5
  if (gameState.setCssValue(teamId, holeId, value)) {
    io.to(`team:${teamId}`).emit(EVENTS.TEAM_CSS_STATE, gameState.getTeamStyle(teamId));
    io.to('admin').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState()); // conn-only
  }
}));
```

### Example 4 — Cheap DOM-incomplete verification (no browser/jsdom needed)
```js
// test/effects.test.js — pure guard logic with a stub doc; asserts no throw on absent elements
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { applyAction } from '../src/shared/effects.js';   // extract pure fn for testability
const emptyDoc = { querySelector: () => null, querySelectorAll: () => [] };
test('GAME-07: action on absent element is a silent no-op', () => {
  assert.doesNotThrow(() => applyAction(emptyDoc, { desti: 'nas', accio: 'canviar-color' }));
  assert.doesNotThrow(() => applyAction(emptyDoc, { desti: null, accio: 'acluca-tanca' }));
});
```
The connection handler recovery + `mutation-returns-bool` mutators are covered by the existing integration harness style (`test/placement.test.js`) — add `SET-CSS-OK`, `SET-CSS-NOOP` (unchanged value → no broadcast), `SET-CSS-INVALID` (bad hex → no broadcast), `RULES-ANTIREPEAT-REJECT`, `RULES-LIMIT-REJECT`, `F5-CSS-JS-RECOVERY` cases.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reassign whole `srcdoc` per change (HTML phase) | Build once + CSSOM custom-property updates | This phase (for continuous inputs) | Smooth slider feedback; keep reassembly for structural/F5 |
| `sandbox="allow-scripts allow-same-origin"` for interactive iframes | Scriptless `allow-same-origin` + parent-driven DOM | Long-standing best practice | No unsandboxing risk; MDN-endorsed |

**Deprecated/outdated:** none relevant. The stack is current (socket.io 4.8.3, Node 24 LTS per CLAUDE.md).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The definitive Bender CSS at `/Users/rogermasellas/Desktop/imparticio/index.html` (read this session) is the exact target for the 9 holes | Forat→var() Mapping | If the user has a newer version, fixed values/defaults differ; re-confirm before hardcoding defaults. [ASSUMED — file exists & read, but it lives outside the repo and may drift] |
| A2 | Emitting CSS only on `change` (not throttled `input`) is acceptable because no remote client observes a team's preview | Pattern 3 | If a future requirement mirrors a team's live preview to the admin, throttled `input` emits would be needed. Low risk (D-22 = connection-only). |
| A3 | Whole-array `TEAM_SET_RULES` replace (vs granular add/update/remove) is the intended granularity | Pattern 4 | If concurrency/large rule sets mattered it wouldn't scale — but ≤6 tiny rules make this a non-issue. |
| A4 | `#robot-cap` background-color hole (D-09) may flatten the metallic gradient; simple-color intent assumed | Open Q1, Mapping #14 | If the user wants the gradient preserved, the hole must control one stop or a tint layer instead. |
| A5 | `ull-esquerre`/`ull-dret` map to `.ull:nth-of-type(1|2)` (spans have no id) | JS Element Map | If Phase-4 scoring expects ids, spans may need ids added in `robotTemplate.js`. |

## Open Questions

1. **Holes that don't map cleanly to the source CSS (locked existence, open expression).**
   - What we know: D-03/D-05/D-08/D-09 assume simple properties, but the source uses a `::before` radial-gradient ball (D-03), a non-positioned flex visor (D-05 `top`), a `repeating-linear-gradient` for teeth (D-08), and a 6-stop metallic `linear-gradient` cap background (D-09).
   - What's unclear: exactly how each hole's `var()` should be expressed (e.g. does the cap `background-color` hole *replace* the metallic gradient with a flat color, or tint it? Does the antena ball's `background-color` replace the radial-gradient?).
   - Recommendation: planner adds a short **`checkpoint:human-verify`** (or resolves via UI-SPEC discretion, D-Claude) presenting the 4 ⚠ rows and the proposed `var()` strategy. Default proposal: holes flatten to the controllable property (accept losing the gradient nuance) since the pedagogical goal is "student sets a real CSS value and sees it," not pixel-perfect Bender fidelity. **Do not silently choose** — surface the 4 rows.

2. **D-08 dents color target: `#fffcd3` (decision) vs `#f2e6a8` (source CSS).**
   - What we know: D-08 explicitly says "avui `#fffcd3`"; the source file's light stops are `#f2e6a8`.
   - Recommendation: treat `#fffcd3` as the locked target (D-08 is a decision), use `#f2e6a8` only as the `var()` fallback default; confirm with user in the same checkpoint.

3. **Composite-action catalog beyond the 2 examples (D-17, Claude's discretion).**
   - Recommendation: planner authors 3-5 named composites in `JS_COMPOSITE_ACTIONS`; the 2 D-17 examples are the guaranteed minimum. Keep each as a fixed `[{sel, fn}]` list.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js runtime | server | ✓ | project targets 24 LTS (CLAUDE.md) | — |
| npm deps (socket.io, dompurify, lucide, vite) | whole phase | ✓ | installed (package.json) | — |
| Definitive Bender CSS file | CSS hole implementation | ✓ | `/Users/rogermasellas/Desktop/imparticio/index.html` (read) | already partially inlined in `wrapPreview()` |
| Evergreen desktop browsers (CSS custom props, `contentDocument` access) | preview pipeline | ✓ | classroom Windows PCs (CLAUDE.md) | — (baseline features, universally supported) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — the source-of-truth CSS is outside the repo (A1); recommend copying the needed rules into `wrapPreview()` (as already started) so the phase is self-contained.

## Security Domain

`security_enforcement: true`, ASVS L1. This phase introduces two new client→server intent channels and new DOM manipulation of the preview.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | inherited (token/adminSecret, unchanged) |
| V3 Session Management | yes | reuse token→teamId; identity from `socket.data.teamId`, never payload (existing middleware) |
| V4 Access Control | yes | team can only mutate its own `cssValues`/`jsRules` (identity from `socket.data`, not payload) — mirror `TEAM_PLACE_PIECE` |
| V5 Input Validation | **yes (primary)** | server validates `holeId`∈`CSS_HOLES`, color `^#[0-9a-fA-F]{6}$`, slider numeric-in-range, rule fields ∈ frozen vocab, anti-repeat, ≤6 rows |
| V6 Cryptography | no | none |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSS injection via forged hole value | Tampering | CSSOM `setProperty` (no text context) + server hex/numeric validation (Pitfall 5) |
| Code execution via "JS" rules | Elevation | No `eval`/`Function`; frozen dispatch tables keyed by closed vocab; unknown key = no-op |
| XSS via assembled preview markup | Tampering | DOMPurify unchanged; effects use `style`/`classList` only, never `innerHTML` |
| Cross-team state tampering (forged `teamId`) | Spoofing/Tampering | identity from `socket.data.teamId`; server ignores payload identity (existing pattern) |
| Broadcast-storm DoS | DoS | `mutation-returns-bool` + directed `team:<id>` emits; emit-on-`change` (Pitfall 2) |
| Iframe unsandboxing | Elevation | keep `sandbox="allow-same-origin"` only — never add `allow-scripts` |
| Malformed payload crashing shared process | DoS | wrap handlers in existing `safeHandler` |

## Project Constraints (from CLAUDE.md)

- **Stack locked:** Node.js + Socket.io backend; Vanilla JS + Vite frontend (no React/Svelte/framework); Express thin layer; in-memory state, **no database**. Phase 3 adds no deviation.
- **DOMPurify 3.x** sanitizes any assembled preview markup before `srcdoc` — unchanged.
- **`connectionStateRecovery`** already configured — reuse for F5, don't hand-roll resync.
- **No free-text code entry (GAME-06):** all CSS/JS controls are closed (native color/range/select); labels are read-only `textContent`, never editable, never `innerHTML`.
- **UX-01 minimal cognitive load / icons-over-text; UX-02 phase color-coding** (`--phase-css` blue, `--phase-js` mustard) — reuse existing tokens, no new tokens (UI-SPEC).
- **GSD workflow:** all edits go through the planned phase execution, not ad-hoc.
- **Simplicity mandate (CLAUDE.md core):** prefer the boring lookup-table/custom-property solution over any cleverness; the interpreter is ~30 lines, not a VM.

## Sources

### Primary (HIGH confidence)
- This repo (read this session): `src/client/client.js` (`wrapPreview`/`assemblePreview`/`renderActiveSplitScreen`, sandbox setting), `src/server/gameState.js` (`placePiece`/`removePiece`/`getPublicState`/`getTeamBoard`, `mutation-returns-bool`), `src/server/socketHandlers.js` (identity middleware, directed emits, `safeHandler`), `src/server/events.js`, `src/server/index.js` (`connectionStateRecovery`), `src/shared/robotTemplate.js` (`SLOTS`/`CONTAINERS`/`PIECES`), `src/client/admin.js` (progress card), `package.json`, `.planning/config.json`. [VERIFIED]
- `/Users/rogermasellas/Desktop/imparticio/index.html` — definitive Bender CSS (fixed values + hole source). [VERIFIED: read]
- MDN `<iframe>` element docs — `allow-same-origin` grants parent DOM access without `allow-scripts`; `allow-scripts` gates only in-iframe script execution; `about:srcdoc` uses parent URL as base. [VERIFIED: WebFetch, this session]

### Secondary (MEDIUM confidence)
- MDN CSS custom properties + CSSOM `setProperty` live-update behavior (well-established platform semantics). [CITED]

### Tertiary (LOW confidence)
- none.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps, all verified in `package.json`.
- Architecture (custom-property injection + parent-driven interpreter): HIGH — grounded in existing patterns + MDN-verified iframe semantics.
- CSS hole→source mapping: HIGH on mechanics, MEDIUM on 4 flagged holes (design micro-decision pending, §Open Questions).
- Pitfalls & security: HIGH — derived from this repo's proven anti-storm/anti-XSS patterns.

**Research date:** 2026-07-04
**Valid until:** 2026-08-03 (stable stack; re-verify only if the source-of-truth Bender CSS changes — A1)
