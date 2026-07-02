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
