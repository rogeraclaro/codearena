// Canonical robot template — the single source of truth for the Plana Model
// structure (D-01), shared by client (build drawer/board + assemble preview)
// and server (validate placements, derive N/7 progress). Reusable by Phase 4
// scoring. Same "frozen constants module" pattern as src/server/events.js.
//
// D-07 (final redesign, quick-260703-uwn): pieces stay GENERIC for symmetric
// types (ull/nas/boca). The ANTENA is now a SINGLE centred piece drawn 100% by
// CSS (a `<div class="antena">`, no left/right split, no id). The ORELLA stays
// SPLIT into directional left/right variants (orella-esquerra/orella-dreta) with
// distinct real PNG art per side. A left orella only fits the left slot — the
// student must aim the correct side; it's a REAL gameplay distinction, not a
// cosmetic src swap. This is NOT the Pitfall-5 per-slot-id uniqueness bug (that
// one broke the 2nd slot of a SHARED-count type): each directional orella type
// maps 1:1 to exactly one slot with count 1, so no slot is ever left unfillable.
// The orella slot.html carries the SHARED class (class="orella") + the
// per-instance id — Phase 4 scoring reads the shared class (02-CONTEXT A2).
//
// Pitfall 3 / A5: image `src` is ROOT-relative (`/orella-esquerra.png`), not
// relative, because a srcdoc's base URL is ambiguous. Assets live in
// src/client/public/ (served at web root by Vite). The background (D-03) is a
// system layer, NOT a slot and NOT a piece.

export const SLOTS = Object.freeze([
  Object.freeze({
    id: 'antena-esquerra',
    accepts: 'antena-esquerra',
    parent: 'section',
    // Antena única centrada, dibuixada 100% per CSS (tija + bola). El div NO porta
    // id: el CSS només referencia la classe `.antena` (posició centrada via
    // left:50%/translateX). El camp `id` del SLOT segueix sent l'identificador
    // intern de placement/matching, no un atribut HTML.
    html: '<div class="antena"></div>',
  }),
  Object.freeze({
    id: 'orella-esquerra',
    accepts: 'orella-esquerra',
    parent: 'section',
    html: '<img src="/orella-esquerra.png" alt="Orella esquerra" class="orella" id="orella-esquerra">',
  }),
  Object.freeze({
    id: 'orella-dreta',
    accepts: 'orella-dreta',
    parent: 'section',
    html: '<img src="/orella-dreta.png" alt="Orella dreta" class="orella" id="orella-dreta">',
  }),
  Object.freeze({
    id: 'ull-1',
    accepts: 'ull',
    parent: 'contenidor-ulls',
    html: '<span class="ull"></span>',
  }),
  Object.freeze({
    id: 'ull-2',
    accepts: 'ull',
    parent: 'contenidor-ulls',
    html: '<span class="ull"></span>',
  }),
  Object.freeze({
    id: 'nas',
    accepts: 'nas',
    parent: 'robot-cap',
    html: '<button id="nas"></button>',
  }),
  Object.freeze({
    id: 'boca',
    accepts: 'boca',
    parent: 'robot-cap',
    html: '<output id="boca"></output>',
  }),
]);

// Container frames (D-06): the system pre-builds these; the student never drags
// them. Single source of truth for their tag+identity so the read-only frame
// labels (D-12) don't hand-duplicate tag knowledge. The ACTUAL nested markup is
// assembled in client.js assemblePreview() and mirrors these exactly (D-01).
export const CONTAINERS = Object.freeze([
  Object.freeze({ tag: 'section', attr: 'id', name: 'robot-contenidor' }),
  Object.freeze({ tag: 'div', attr: 'id', name: 'robot-cap' }),
  Object.freeze({ tag: 'div', attr: 'class', name: 'contenidor-ulls' }),
]);

// D-12 (override at the 02-03 checkpoint, 2026-07-03): a piece/slot label is the
// REAL literal HTML tag with angle brackets — e.g. `<img class="orella">` — not
// the bare class/type name. Derived from SLOTS[].html (single source, D-01/D-07),
// never hand-written. For non-img pieces (ull/nas/boca) the shown attribute is
// the one that identifies the TYPE (value === type): class for ull, id for
// nas/boca. The ANTENA (a CSS-drawn `<div class="antena">`, no id) has its own
// branch that shows the SHARED class straight from slot.html — NEVER the
// directional type `antena-esquerra`, which exists nowhere in the real markup.
// For the directional <img> ORELLA pieces the label shows the SHARED class from
// slot.html (`class="orella"`) plus a DIRECTION-SPECIFIC fake `src` so left/right
// read differently on the chip. Read-only text only (GAME-06/V5): the brackets
// are plain characters, never interpreted as markup.
// Fake, DISPLAY-ONLY `src` values for the directional <img> ORELLA piece labels,
// keyed by the full directional type. These paths are ILLUSTRATIVE PLACEHOLDERS —
// never fetched. The directional SPLIT itself (not just the filename) is
// intentional and live: dragging a left orella onto the right slot must be
// rejected like any other type mismatch.
const IMG_LABEL_SRC = Object.freeze({
  'orella-esquerra': 'assets/ear_left.png',
  'orella-dreta': 'assets/ear_right.png',
});

export function pieceLabel(type) {
  const slot = SLOTS.find((s) => s.accepts === type);
  if (!slot) return type; // defensive fallback
  const tag = slot.html.match(/<(\w+)/)?.[1] ?? type;
  // <img> pieces (orella): SHARED class from slot.html (can't drift from the real
  // markup) + a direction-specific fake `src` selected by full type.
  if (tag === 'img') {
    const cls = slot.html.match(/\bclass="([^"]*)"/)?.[1];
    const src = IMG_LABEL_SRC[type];
    return cls ? `<${tag} src="${src}" class="${cls}">` : `<${tag} src="${src}">`;
  }
  // Antena: div dibuixat per CSS amb classe compartida (`antena`), SENSE id
  // direccional. La classe ve directament de slot.html — mai deriva del type
  // direccional 'antena-esquerra', que no existeix enlloc del markup real. Cal una
  // branca pròpia perquè la lògica genèrica d'atribut (value===type) no casaria cap
  // atribut i cauria a `<div>` sense la classe.
  if (type === 'antena-esquerra') {
    const cls = slot.html.match(/\bclass="([^"]*)"/)?.[1];
    return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
  }
  // Non-img pieces: show whichever attribute identifies the TYPE (value === type).
  const attr = ['class', 'id'].find((a) => {
    const m = slot.html.match(new RegExp(`\\b${a}="([^"]*)"`));
    return m?.[1] === type;
  });
  return attr ? `<${tag} ${attr}="${type}">` : `<${tag}>`;
}

// Same literal-tag treatment for the pre-built container frames (D-12 override):
// `robot-contenidor` → `<section id="robot-contenidor">`, etc.
export function containerLabel(name) {
  const c = CONTAINERS.find((x) => x.name === name);
  return c ? `<${c.tag} ${c.attr}="${c.name}">` : name;
}

// Closing tag for the same pre-built container frames (checkpoint 02-03 round 2):
// `robot-contenidor` → `</section>`. Derived from the same CONTAINERS single
// source — never hand-writes the tag name a second time (D-01).
export function containerClosingLabel(name) {
  const c = CONTAINERS.find((x) => x.name === name);
  return c ? `</${c.tag}>` : name;
}

// Drawer inventory (good pieces). 7 leaf pieces total across 6 types after the
// final redesign: antena is now a SINGLE CSS-drawn div (count 1, no left/right
// split), orella stays 2 distinct left/right types (count 1 each), ull is a
// SHARED-count type with count 2 for its 2 symmetric slots (Pitfall 5: a
// shared-count type must have count === its slot count, else the 2nd slot can
// never be filled). Sum: 1+1+1+2+1+1 = 7 (GAME-03).
export const PIECES = Object.freeze([
  Object.freeze({ type: 'antena-esquerra', count: 1 }),
  Object.freeze({ type: 'orella-esquerra', count: 1 }),
  Object.freeze({ type: 'orella-dreta', count: 1 }),
  Object.freeze({ type: 'ull', count: 2 }),
  Object.freeze({ type: 'nas', count: 1 }),
  Object.freeze({ type: 'boca', count: 1 }),
]);

// D-11: obvious decoys with no matching slot → SortableJS native revert always
// bounces them back to the drawer, no special mechanic or error message.
export const DISTRACTORS = Object.freeze(['banana', 'roda', 'sabata']);

// --- Fase CSS (GAME-04): vocabulari FROZEN dels 16 forats "codi foradat" ---
//
// Cada forat és keyed per holeId i porta:
//   var      — custom property que el wrapPreview() del client mapeja al CSS del Bender
//   selector — element real de la font de veritat (només documentació/cross-check;
//              el client aplica sempre via CSSOM setProperty sobre :root, mai per
//              selector — Pitfall 5). Derivat/creuat contra SLOTS[].html i CONTAINERS.
//   group    — selector de grup que el panell client agrupa i mostra (`.antena {` …`}`)
//   prop     — nom real de la propietat CSS mostrada com a etiqueta monospace (GAME-06)
//   control  — 'color' | 'range' (native <input type>)
//   min/max/step/unit — (només range) rang tunable; els TARGETS són locked a UI-SPEC
//   validate — (V5) el servidor revalida ABANS d'emmagatzemar: color `^#[0-9a-fA-F]{6}$`,
//              range numèric-dins-de-rang amb la unitat esperada.
//   default  — valor inicial del control (sempre vàlid per al seu tipus). El fallback
//              del var() al srcdoc (que pot ser un gradient per antena-bg/cap-bg) viu al
//              CSS de wrapPreview(), no aquí — així el control sempre té un valor legal.
//
// Els forats que APLANEN un gradient (antena-bg D-03, cap-bg D-09) i els que CALEN
// afegir propietat inexistent a la font (antena-border D-03, ulls-top D-05) queden
// documentats a 03-RESEARCH §Forat→var() Mapping (files ⚠) i confirmats al human-check.

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function colorValidator(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

// Range: exigeix number (opcionalment negatiu) + la unitat esperada, dins [min,max].
// Rebutja qualsevol cosa amb `;`/`{`/`}` o no-numèrica (anti CSS-injection, Pitfall 5).
function rangeValidator(min, max, unit) {
  return (value) => {
    if (typeof value !== 'string') return false;
    const m = value.match(/^(-?\d+)(px|%)?$/);
    if (!m) return false;
    if (unit && m[2] !== unit) return false;
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= min && n <= max;
  };
}

function colorHole({ var: cssVar, selector, group, prop, def }) {
  return Object.freeze({
    var: cssVar,
    selector,
    group,
    prop,
    control: 'color',
    validate: colorValidator,
    default: def,
  });
}

function rangeHole({ var: cssVar, selector, group, prop, min, max, step, unit, def }) {
  return Object.freeze({
    var: cssVar,
    selector,
    group,
    prop,
    control: 'range',
    min,
    max,
    step,
    unit,
    validate: rangeValidator(min, max, unit),
    default: def,
  });
}

// Valors OBJECTIU (Bender correcte) de cada forat — documentats aquí perquè `default`
// (a sota) és deliberadament allunyat d'aquests per exigir esforç real de l'equip. Únic
// lloc on aquests valors "correctes" queden escrits explícitament fora de wrapPreview().
// antena-bg=#e3f7fe · antena-border=#000000 · orella-top=95px · ulls-bg=#e3f7fe ·
// ulls-top=-40px · ulls-width=132% · ull-radius=50px · cap-bg=#a9c5da ·
// cap-border-color=#000000 · cap-border-width=6px · nas-radius=0% · nas-size=14px ·
// boca-height=95px · boca-width=90% · boca-dents=#fffcd3
export const CSS_HOLES = Object.freeze({
  // .antena — bola dibuixada per `.antena` mateixa (D-03, referència final: bola=element,
  // tija=`.antena::before`). bg/border FORATS (color pla, no gradient — la referència
  // definitiva mai en va tenir). Fixos: mida/posició/tija (D-02/D-03). `default` allunyat
  // a propòsit del target #e3f7fe/#000000 (esforç real exigit, no "gairebé bé" de sortida).
  'antena-bg': colorHole({ var: '--antena-bg', selector: '.antena', group: '.antena', prop: 'background-color', def: '#ff00ff' }),
  'antena-border': colorHole({ var: '--antena-border', selector: '.antena', group: '.antena', prop: 'border-color', def: '#00ff00' }),

  // .orella — <img class="orella"> (SLOTS orella-esquerra/dreta). top/width sobre `.orella`;
  // offset simètric (una custom property → left a l'esquerra, right a la dreta). Target
  // Plana Model D-04: top 95px, offset -31px, width 40px. `.orella` és SEMPRE visible
  // (D-13, també a la Fase HTML, imatge real sense gating). `orella-top` ara SÍ s'allunya
  // del target (300px, per petició explícita) — a diferència d'offset/width, que es
  // mantenen correctes perquè les orelles no quedin trencades/fora de quadre abans que
  // comenci la Fase CSS.
  'orella-top': rangeHole({ var: '--orella-top', selector: '.orella', group: '.orella', prop: 'top', min: 60, max: 300, step: 1, unit: 'px', def: '300px' }),
  'orella-offset': rangeHole({ var: '--orella-offset', selector: '#orella-esquerra / #orella-dreta', group: '.orella', prop: 'left / right', min: -60, max: 0, step: 1, unit: 'px', def: '-31px' }),
  'orella-width': rangeHole({ var: '--orella-width', selector: '.orella', group: '.orella', prop: 'width', min: 20, max: 90, step: 1, unit: 'px', def: '40px' }),

  // .contenidor-ulls (CONTAINERS) — bg pla (D-05, mapping net) + top (CAL afegir
  // position:relative, la font és un fill flex no posicionat, D-05 ⚠) + width (nou forat).
  // `default` allunyat del target #e3f7fe/-40px/132%.
  'ulls-bg': colorHole({ var: '--ulls-bg', selector: '.contenidor-ulls', group: '.contenidor-ulls', prop: 'background-color', def: '#00ff00' }),
  'ulls-top': rangeHole({ var: '--ulls-top', selector: '.contenidor-ulls', group: '.contenidor-ulls', prop: 'top', min: -50, max: 40, step: 1, unit: 'px', def: '-50px' }),
  'ulls-width': rangeHole({ var: '--ulls-width', selector: '.contenidor-ulls', group: '.contenidor-ulls', prop: 'width', min: 70, max: 150, step: 1, unit: '%', def: '90%' }),

  // .ull — <span class="ull"> (SLOTS ull-1/ull-2). border-radius (D-06, en px a la
  // referència final — no %); color/mida fix. `default` allunyat del target 50px (ulls
  // quadrats en lloc d'arrodonits).
  'ull-radius': rangeHole({ var: '--ull-radius', selector: '.ull', group: '.ull', prop: 'border-radius', min: 0, max: 50, step: 1, unit: 'px', def: '0px' }),

  // #robot-cap (CONTAINERS) — bg color pla FORAT (D-09, la referència final mai va tenir
  // gradient) + border color/width (D-09, net un cop separat el shorthand). border-radius
  // asimètric (dipòsit Bender) fix. `default` allunyat del target #a9c5da/#000000/6px.
  'cap-bg': colorHole({ var: '--cap-bg', selector: '#robot-cap', group: '#robot-cap', prop: 'background-color', def: '#ff6600' }),
  'cap-border-color': colorHole({ var: '--cap-border-color', selector: '#robot-cap', group: '#robot-cap', prop: 'border-color', def: '#ff00ff' }),
  'cap-border-width': rangeHole({ var: '--cap-border-width', selector: '#robot-cap', group: '#robot-cap', prop: 'border-width', min: 0, max: 12, step: 1, unit: 'px', def: '0px' }),

  // #nas — <button id="nas"> (SLOTS nas). border-radius + mida (una custom property →
  // width i height) (D-07); color negre fix. Referència final: quadrat pla (radius 0).
  // `default` allunyat del target 0%/14px (nas rodó i gegant en lloc de quadrat i petit).
  'nas-radius': rangeHole({ var: '--nas-radius', selector: '#nas', group: '#nas', prop: 'border-radius', min: 0, max: 50, step: 1, unit: '%', def: '50%' }),
  'nas-size': rangeHole({ var: '--nas-size', selector: '#nas', group: '#nas', prop: 'width / height', min: 10, max: 40, step: 1, unit: 'px', def: '40px' }),

  // #boca — <output id="boca"> (SLOTS boca). height/width + dents-color (stops clars del
  // repeating-linear-gradient). Target dents D-08 locked #fffcd3. `default` allunyat del
  // target 95px/90%/#fffcd3.
  'boca-height': rangeHole({ var: '--boca-height', selector: '#boca', group: '#boca', prop: 'height', min: 10, max: 120, step: 1, unit: 'px', def: '10px' }),
  'boca-width': rangeHole({ var: '--boca-width', selector: '#boca', group: '#boca', prop: 'width', min: 20, max: 100, step: 1, unit: '%', def: '20%' }),
  'boca-dents': colorHole({ var: '--boca-dents', selector: '#boca', group: '#boca', prop: 'color', def: '#0000ff' }),
});

// --- Fase JS (GAME-05): vocabulari FROZEN del constructor de regles ---
//
// Model obert/variety-based (D-11): una regla = 4 buits
//   Quan [event] a [origen] → a l'element [destí] → Fes [acció]
// Tots els valors dels desplegables són CLAUS a taules frozen; una clau desconeguda
// és un no-op (mai codi, GAME-06/D-11). Cap eval/Function (03-RESEARCH §Pattern 2).
//
// Els selectors de JS_ELEMENTS es CREUEN contra SLOTS[].html / CONTAINERS (single
// source, D-01): #nas/#boca (SLOTS nas/boca), #robot-cap (CONTAINERS), .antena
// (SLOTS antena-esquerra: <div class="antena">, sense id → classe), #orella-esquerra
// /#orella-dreta (SLOTS, <img> amb id), i els dos .ull (SLOTS ull-1/ull-2:
// <span class="ull"> SENSE id → :nth-of-type). Mateixa disciplina "derivat/creuat"
// que CSS_HOLES.

// D-13: 4 events. "hover" es materialitza com a l'event DOM real `mouseover`.
export const JS_EVENTS = Object.freeze({
  click: 'click',
  hover: 'mouseover',
  mouseleave: 'mouseleave',
  dblclick: 'dblclick',
});

// D-14: 8 elements (origen i destí) → selector real dins de l'iframe.
export const JS_ELEMENTS = Object.freeze({
  nas: '#nas',
  boca: '#boca',
  cap: '#robot-cap',
  antena: '.antena',
  'orella-esquerra': '#orella-esquerra',
  'orella-dreta': '#orella-dreta',
  'ull-esquerre': '.contenidor-ulls .ull:nth-of-type(1)',
  'ull-dret': '.contenidor-ulls .ull:nth-of-type(2)',
});

// Etiqueta mostrada al desplegable (UI-SPEC §Copywriting: tokens reals). El 'cap'
// es mostra com a '#robot-cap'; la resta són la mateixa clau textual.
export const JS_ELEMENT_LABELS = Object.freeze({
  nas: 'nas',
  boca: 'boca',
  cap: '#robot-cap',
  antena: 'antena',
  'orella-esquerra': 'orella-esquerra',
  'orella-dreta': 'orella-dreta',
  'ull-esquerre': 'ull-esquerre',
  'ull-dret': 'ull-dret',
});

// D-16: accions simples (necessiten un destí). Claus per a la validació servidor;
// la implementació concreta viu a src/shared/effects.js (ACTIONS).
export const JS_ACTION_KEYS = Object.freeze(['canviar-color', 'amagar-mostrar', 'girar', 'canviar-mida']);

// D-17: accions compostes (multi-element predefinit). En triar-ne una, el destí es
// desactiva i ha de ser null. Mínim garantit 2 (D-17); n'oferim 3. La implementació
// concreta (llista [{sel, fn}]) viu a src/shared/effects.js (COMPOSITES).
export const JS_COMPOSITE_KEYS = Object.freeze([
  'acluca-tanca',
  'ulls-vermells-orelles-grosses',
  'cap-gira-antena-creix',
]);

// Etiquetes en català per als desplegables d'acció (D-16 simples + D-17 compostes,
// noms d'autor). Read-only (GAME-06), mai innerHTML.
export const JS_ACTION_LABELS = Object.freeze({
  'canviar-color': 'Canviar de color',
  'amagar-mostrar': 'Amagar/mostrar',
  girar: 'Girar',
  'canviar-mida': 'Canviar mida',
  'acluca-tanca': 'Acluca ulls + tanca boca',
  'ulls-vermells-orelles-grosses': 'Ulls vermells + orelles grosses',
  'cap-gira-antena-creix': 'Gira el cap + antena creix',
});

// D-11/D-12: límit de 5-6 files. 6 = màxim autoritzat.
export const JS_ROW_LIMIT = 6;
