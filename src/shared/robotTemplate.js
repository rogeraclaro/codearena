// Canonical robot template — the single source of truth for the Plana Model
// structure (D-01), shared by client (build drawer/board + assemble preview)
// and server (validate placements, derive N/8 progress). Reusable by Phase 4
// scoring. Same "frozen constants module" pattern as src/server/events.js.
//
// D-07: pieces in the drawer are GENERIC per type; identity (id/class,
// esquerra/dreta) is dictated by the SLOT, never the piece. Each slot.html
// therefore carries the canonical id/class for its position.
//
// Pitfall 3 / A5: image `src` is ROOT-relative (`/antena.svg`), not relative,
// because a srcdoc's base URL is ambiguous. Placeholders live in
// src/client/public/ (served at web root by Vite). The background (D-03) is a
// system layer, NOT a slot and NOT a piece.

export const SLOTS = Object.freeze([
  Object.freeze({
    id: 'antena-esquerra',
    accepts: 'antena',
    parent: 'section',
    html: '<img src="/antena.svg" alt="Antena esquerra" class="antena" id="antena-esquerra">',
  }),
  Object.freeze({
    id: 'antena-dreta',
    accepts: 'antena',
    parent: 'section',
    html: '<img src="/antena.svg" alt="Antena dreta" class="antena" id="antena-dreta">',
  }),
  Object.freeze({
    id: 'orella-esquerra',
    accepts: 'orella',
    parent: 'section',
    html: '<img src="/orella.svg" alt="Orella esquerra" class="orella" id="orella-esquerra">',
  }),
  Object.freeze({
    id: 'orella-dreta',
    accepts: 'orella',
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
// never hand-written. The shown attribute is the one that identifies the TYPE
// (value === type): class for antena/orella/ull, id for nas/boca. The per-slot
// id (`antena-esquerra`) is per-INSTANCE and deliberately not shown — a type has
// 2 slots but one label. Read-only text only (GAME-06/V5): the brackets are plain
// characters, never interpreted as markup.
// Fake, DISPLAY-ONLY `src` values for the <img> piece labels (antena/orella), so
// the chip shows the full realistic tag shape `<img src="..." class="...">`
// (checkpoint 02-03 round 2). These paths are ILLUSTRATIVE ONLY — never fetched,
// no such asset files exist. FUTURE WORK (the user will provide the art later):
// real per-INSTANCE directional images `aerial_left.png`/`aerial_right.png` and
// `ear_left.png`/`ear_right.png`; at that point the type system may need to split
// antena/orella into left/right variants so students learn to aim the correct
// side. That split is intentionally OUT OF SCOPE for this round — do not add it now.
const IMG_LABEL_SRC = Object.freeze({ antena: 'assets/aerial.png', orella: 'assets/ear.png' });

export function pieceLabel(type) {
  const slot = SLOTS.find((s) => s.accepts === type);
  if (!slot) return type; // defensive fallback
  const tag = slot.html.match(/<(\w+)/)?.[1] ?? type;
  const attr = ['class', 'id'].find((a) => {
    const m = slot.html.match(new RegExp(`\\b${a}="([^"]*)"`));
    return m?.[1] === type;
  });
  // <img> pieces (antena/orella) also show a fake `src` so the tag looks real.
  if (tag === 'img') {
    const src = IMG_LABEL_SRC[type];
    return attr ? `<${tag} src="${src}" ${attr}="${type}">` : `<${tag} src="${src}">`;
  }
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

// Drawer inventory (good pieces, generic per type). 8 leaf pieces total across
// 5 types — antena/orella/ull have count 2 (Pitfall 5: don't treat each type as
// unique or the second slot can never be filled).
export const PIECES = Object.freeze([
  Object.freeze({ type: 'antena', count: 2 }),
  Object.freeze({ type: 'orella', count: 2 }),
  Object.freeze({ type: 'ull', count: 2 }),
  Object.freeze({ type: 'nas', count: 1 }),
  Object.freeze({ type: 'boca', count: 1 }),
]);

// D-11: obvious decoys with no matching slot → SortableJS native revert always
// bounces them back to the drawer, no special mechanic or error message.
export const DISTRACTORS = Object.freeze(['banana', 'roda', 'sabata']);
