// Test pur (sense navegador ni servidor) del motor de puntuació de la Fase 4
// (D-01..D-06, D-13). Mirall de test/effects.test.js: importa el mòdul compartit
// directament i afirma percentatges exactes per inputs coneguts. Aquests casos
// FALLEN abans d'implementar src/shared/scoring.js (RED): el mòdul encara no
// existeix, així que l'import llença.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, CSS_HOLES, CSS_TARGETS } from '../src/shared/robotTemplate.js';
import {
  WEIGHTS,
  scoreHtml,
  scoreCss,
  scoreJs,
  computeGlobal,
  htmlTimeBonuses,
  isHtmlComplete,
} from '../src/shared/scoring.js';

// --- CSS_TARGETS: derivat de l'objecte real, mai hardcodejat (Pitfall 1) ---

test('CSS_TARGETS té exactament una entrada per cada clau de CSS_HOLES', () => {
  const holeKeys = Object.keys(CSS_HOLES);
  const targetKeys = Object.keys(CSS_TARGETS);
  assert.equal(targetKeys.length, holeKeys.length, 'mateix nombre de claus (derivat, no hardcodejat 15/16)');
  for (const id of holeKeys) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(CSS_TARGETS, id),
      `CSS_TARGETS ha de tenir una entrada per '${id}'`,
    );
  }
});

// --- scoreHtml (D-01/SCORE-01): proximitat parcial ---

test('scoreHtml: placement buit → 0%', () => {
  const { pct, subchecks } = scoreHtml({});
  assert.equal(pct, 0);
  assert.equal(subchecks.length, SLOTS.length);
  assert.ok(subchecks.every((c) => c.passed === false));
});

test('scoreHtml: els 7 slots correctes → 100%', () => {
  const placement = {};
  for (const s of SLOTS) placement[s.id] = s.accepts;
  const { pct, subchecks } = scoreHtml(placement);
  assert.equal(pct, 100);
  assert.ok(subchecks.every((c) => c.passed === true));
});

test('scoreHtml: 3 de 7 slots → ≈42.857%', () => {
  const placement = {};
  SLOTS.slice(0, 3).forEach((s) => {
    placement[s.id] = s.accepts;
  });
  const { pct } = scoreHtml(placement);
  assert.ok(Math.abs(pct - (3 / 7) * 100) < 1e-9, `esperat ~42.857, obtingut ${pct}`);
});

// --- scoreCss (D-02/SCORE-02): distància normalitzada per forat ---

test('scoreCss: valors iguals als de CSS_TARGETS per tots els forats → 100%', () => {
  const perfect = { ...CSS_TARGETS };
  const { pct, subchecks } = scoreCss(perfect);
  assert.ok(Math.abs(pct - 100) < 1e-9, `esperat 100, obtingut ${pct}`);
  assert.equal(subchecks.length, Object.keys(CSS_HOLES).length);
  assert.ok(subchecks.every((c) => c.passed === true));
});

test('scoreCss: forats no tocats usen el default, mai undefined/NaN', () => {
  const { pct, subchecks } = scoreCss({}); // cap forat tocat
  assert.ok(Number.isFinite(pct), 'pct ha de ser finit');
  assert.ok(!Number.isNaN(pct), 'mai NaN');
  assert.ok(subchecks.every((c) => Number.isFinite(c.score)), 'cap sub-check amb score NaN');
  // La mitjana ha d'iterar sobre CSS_HOLES, no sobre les claus de cssValues (0 tocades)
  assert.equal(subchecks.length, Object.keys(CSS_HOLES).length);
});

test('scoreCss: cap NaN amb cssValues parcial', () => {
  const partial = { 'antena-bg': CSS_TARGETS['antena-bg'] };
  const { pct, subchecks } = scoreCss(partial);
  assert.ok(Number.isFinite(pct) && !Number.isNaN(pct));
  assert.ok(subchecks.every((c) => Number.isFinite(c.score) && !Number.isNaN(c.score)));
});

test('scoreCss: un color a distància màxima puntua ≈0 per aquell forat', () => {
  // antena-border target = #000000; #ffffff és la distància RGB màxima (sqrt(3)*255)
  const { subchecks } = scoreCss({ 'antena-border': '#ffffff' });
  const border = subchecks.find((c) => c.hole === 'antena-border');
  assert.ok(border, 'ha d\'existir el sub-check antena-border');
  assert.ok(border.score < 0.001, `esperat ~0, obtingut ${border.score}`);
});

// --- scoreJs (D-03/SCORE-03): quantitat + varietat ---

const MAX_VARIETY_RULES = [
  { event: 'click', origen: 'nas', desti: 'boca', accio: 'canviar-color' },
  { event: 'hover', origen: 'cap', desti: 'antena', accio: 'amagar-mostrar' },
  { event: 'mouseleave', origen: 'orella-esquerra', desti: 'orella-dreta', accio: 'girar' },
  { event: 'dblclick', origen: 'ull-esquerre', desti: 'ull-dret', accio: 'canviar-mida' },
  { event: 'click', origen: 'boca', desti: null, accio: 'acluca-tanca' },
  { event: 'hover', origen: 'nas', desti: null, accio: 'ulls-vermells-orelles-grosses' },
];

test('scoreJs: sense regles → 0%', () => {
  const { pct } = scoreJs([]);
  assert.equal(pct, 0);
});

test('scoreJs: 6 regles amb màxima varietat → alt i clampat a ≤100', () => {
  const { pct, subchecks } = scoreJs(MAX_VARIETY_RULES);
  assert.ok(pct >= 90, `esperat proper a 100, obtingut ${pct}`);
  assert.ok(pct <= 100, 'mai supera 100 (clamp)');
  const byLabel = Object.fromEntries(subchecks.map((s) => [s.label, s.value]));
  assert.equal(byLabel['regles'], 6);
  assert.equal(byLabel['events únics'], 4);
  assert.equal(byLabel['accions úniques'], 6);
  assert.equal(byLabel['elements únics'], 8);
});

test('scoreJs: repetir la mateixa combinació no infla el score', () => {
  const dup = Array.from({ length: 6 }, () => ({
    event: 'click', origen: 'nas', desti: 'boca', accio: 'canviar-color',
  }));
  const dupPct = scoreJs(dup).pct;
  const variedPct = scoreJs(MAX_VARIETY_RULES).pct;
  assert.ok(dupPct < variedPct, 'repetició ha de puntuar menys que varietat real');
  assert.ok(dupPct <= 100);
});

// --- computeGlobal (D-04/D-13): pesos 30/60/10 + màscara + bonus ---

test('computeGlobal: {100,100,100} amb mask complet i bonus 0 → 100', () => {
  const g = computeGlobal({ html: 100, css: 100, js: 100 }, { html: 1, css: 1, js: 1 }, 0);
  assert.ok(Math.abs(g - 100) < 1e-9, `esperat 100, obtingut ${g}`);
});

test('computeGlobal: mask {html:1,css:0,js:0} → només el component HTML (D-13)', () => {
  const g = computeGlobal({ html: 100, css: 100, js: 100 }, { html: 1, css: 0, js: 0 }, 0);
  assert.ok(Math.abs(g - 100 * WEIGHTS.html) < 1e-9, `esperat ${100 * WEIGHTS.html}, obtingut ${g}`);
});

test('computeGlobal: el bonus se suma i es clampa a 100', () => {
  const g = computeGlobal({ html: 100, css: 100, js: 100 }, { html: 1, css: 1, js: 1 }, 5);
  assert.equal(g, 100, 'bonus per sobre de 100 es clampa');
  const g2 = computeGlobal({ html: 50, css: 0, js: 0 }, { html: 1, css: 1, js: 1 }, 5);
  assert.ok(Math.abs(g2 - (50 * WEIGHTS.html + 5)) < 1e-9, `esperat ${50 * WEIGHTS.html + 5}, obtingut ${g2}`);
});

// --- htmlTimeBonuses (D-05/D-06): rank-based entre finishers ---

test('htmlTimeBonuses: el més ràpid rep 5, el més lent 0, escalat per rang', () => {
  const teams = [
    { id: 'slow', doneAt: { html: 3000 } },
    { id: 'fast', doneAt: { html: 1000 } },
    { id: 'mid', doneAt: { html: 2000 } },
  ];
  const bonus = htmlTimeBonuses(teams);
  assert.equal(bonus.get('fast'), 5);
  assert.equal(bonus.get('slow'), 0);
  assert.ok(bonus.get('mid') > 0 && bonus.get('mid') < 5);
});

test('htmlTimeBonuses: equips sense doneAt.html no apareixen al Map', () => {
  const teams = [
    { id: 'done', doneAt: { html: 1000 } },
    { id: 'unfinished', doneAt: {} },
  ];
  const bonus = htmlTimeBonuses(teams);
  assert.equal(bonus.get('done'), 5, 'únic finisher rep el màxim');
  assert.ok(!bonus.has('unfinished'), 'un no-finisher no ha d\'aparèixer al Map');
});

test('htmlTimeBonuses: només depèn de l\'ordre relatiu, no de temps absoluts (Pitfall 3)', () => {
  // Mateix ordre relatiu, timestamps molt diferents → mateix resultat.
  const a = htmlTimeBonuses([
    { id: 'x', doneAt: { html: 10 } },
    { id: 'y', doneAt: { html: 20 } },
  ]);
  const b = htmlTimeBonuses([
    { id: 'x', doneAt: { html: 1_000_000 } },
    { id: 'y', doneAt: { html: 9_000_000 } },
  ]);
  assert.equal(a.get('x'), b.get('x'));
  assert.equal(a.get('y'), b.get('y'));
});

// --- isHtmlComplete (D-07): gate de correcció 100% ---

test('isHtmlComplete: true només amb els 7 slots plens', () => {
  const full = {};
  for (const s of SLOTS) full[s.id] = s.accepts;
  assert.equal(isHtmlComplete(full), true);
  const partial = { [SLOTS[0].id]: SLOTS[0].accepts };
  assert.equal(isHtmlComplete(partial), false);
  assert.equal(isHtmlComplete({}), false);
});
