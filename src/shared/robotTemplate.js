// Canonical robot template — the single source of truth for the Plana Model
// structure (D-01), shared by client (build drawer/board + assemble preview)
// and server (validate placements, derive N/8 progress). Reusable by Phase 4
// scoring. Same "frozen constants module" pattern as src/server/events.js.
//
// D-07 (partially overridden at the 02-03 checkpoint round 3, per an explicit
// user request): pieces stay GENERIC for symmetric types (ull/nas/boca), but
// antena/orella are now SPLIT into directional left/right variants
// (antena-esquerra/antena-dreta, orella-esquerra/orella-dreta). A left piece
// only fits the left slot — the student must aim the correct side; it's a REAL
// gameplay distinction, not a cosmetic src swap. This is NOT the Pitfall-5
// per-slot-id uniqueness bug (that one broke the 2nd slot of a SHARED-count
// type): here each directional type maps 1:1 to exactly one slot with count 1,
// so no slot is ever left unfillable. The slot.html still carries the SHARED
// class (class="antena") + the per-instance id — Phase 4 scoring reads the
// shared class (02-CONTEXT A2); only the id differs per side.
//
// Pitfall 3 / A5: image `src` is ROOT-relative (`/antena.svg`), not relative,
// because a srcdoc's base URL is ambiguous. Placeholders live in
// src/client/public/ (served at web root by Vite). The background (D-03) is a
// system layer, NOT a slot and NOT a piece.

export const SLOTS = Object.freeze([
  Object.freeze({
    id: 'antena-esquerra',
    accepts: 'antena-esquerra',
    parent: 'section',
    html: '<img src="/antena.svg" alt="Antena esquerra" class="antena" id="antena-esquerra">',
  }),
  Object.freeze({
    id: 'antena-dreta',
    accepts: 'antena-dreta',
    parent: 'section',
    html: '<img src="/antena.svg" alt="Antena dreta" class="antena" id="antena-dreta">',
  }),
  Object.freeze({
    id: 'orella-esquerra',
    accepts: 'orella-esquerra',
    parent: 'section',
    html: '<img src="/orella.svg" alt="Orella esquerra" class="orella" id="orella-esquerra">',
  }),
  Object.freeze({
    id: 'orella-dreta',
    accepts: 'orella-dreta',
    parent: 'section',
    html: '<img src="/orella.svg" alt="Orella dreta" class="orella" id="orella-dreta">',
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
    html: '<output id="boca">BEEP BEEP</output>',
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
// REAL literal HTML tag with angle brackets — e.g. `<img class="antena">` — not
// the bare class/type name. Derived from SLOTS[].html (single source, D-01/D-07),
// never hand-written. For non-img pieces (ull/nas/boca) the shown attribute is
// the one that identifies the TYPE (value === type): class for ull, id for
// nas/boca. For the directional <img> pieces (antena/orella, split round 3) the
// label shows the SHARED class straight from slot.html (`class="antena"`, NEVER
// the directional type `antena-esquerra` — that value exists nowhere in the real
// markup) plus a DIRECTION-SPECIFIC fake `src` so left/right read differently on
// the chip. Read-only text only (GAME-06/V5): the brackets are plain characters,
// never interpreted as markup.
// Fake, DISPLAY-ONLY `src` values for the directional <img> piece labels, keyed by
// the full directional type. These paths are ILLUSTRATIVE PLACEHOLDERS — never
// fetched, no such asset files exist yet. The user will swap these filenames for
// the real left/right art later; the directional SPLIT itself (not just the
// filename) is intentional and live NOW — dragging a left piece onto the right
// slot must be rejected like any other type mismatch.
const IMG_LABEL_SRC = Object.freeze({
  'antena-esquerra': 'assets/aerial_left.png',
  'antena-dreta': 'assets/aerial_right.png',
  'orella-esquerra': 'assets/ear_left.png',
  'orella-dreta': 'assets/ear_right.png',
});

export function pieceLabel(type) {
  const slot = SLOTS.find((s) => s.accepts === type);
  if (!slot) return type; // defensive fallback
  const tag = slot.html.match(/<(\w+)/)?.[1] ?? type;
  // <img> pieces (antena/orella): SHARED class from slot.html (can't drift from
  // the real markup) + a direction-specific fake `src` selected by full type.
  if (tag === 'img') {
    const cls = slot.html.match(/\bclass="([^"]*)"/)?.[1];
    const src = IMG_LABEL_SRC[type];
    return cls ? `<${tag} src="${src}" class="${cls}">` : `<${tag} src="${src}">`;
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

// Drawer inventory (good pieces). 8 leaf pieces total across 7 types after the
// round-3 directional split: antena/orella are now 4 distinct left/right types
// (count 1 each), ull stays a SHARED-count type with count 2 for its 2 symmetric
// slots (Pitfall 5: a shared-count type must have count === its slot count, else
// the 2nd slot can never be filled). Sum: 1+1+1+1+2+1+1 = 8 (GAME-03).
export const PIECES = Object.freeze([
  Object.freeze({ type: 'antena-esquerra', count: 1 }),
  Object.freeze({ type: 'antena-dreta', count: 1 }),
  Object.freeze({ type: 'orella-esquerra', count: 1 }),
  Object.freeze({ type: 'orella-dreta', count: 1 }),
  Object.freeze({ type: 'ull', count: 2 }),
  Object.freeze({ type: 'nas', count: 1 }),
  Object.freeze({ type: 'boca', count: 1 }),
]);

// D-11: obvious decoys with no matching slot → SortableJS native revert always
// bounces them back to the drawer, no special mechanic or error message.
export const DISTRACTORS = Object.freeze(['banana', 'roda', 'sabata']);
