// Motor de puntuació PUR de la Fase 4 (D-01..D-06, D-13). Mateix ètos que
// src/shared/effects.js: importa vocabulari/targets de robotTemplate.js, pren l'estat
// d'equip com a arguments, NO té socket, NO s'acobla a gameState, i NO crida Date.now()
// dins de la matemàtica de score (només llegeix team.doneAt.html, que ja és un timestamp
// desat). Això el fa testejable en aïllament (test/scoring.test.js) i reutilitzable tant
// pel rànquing final com pel parcial (Pla 02).
//
// Reduccions clau (verificades a 04-RESEARCH):
//  - HTML: `team.placement` ja està pre-validat correcte per placePiece (slot.accepts),
//    així que el score és literalment la fracció de slots plens (cap re-parsing de DOM).
//  - CSS: els valors ja es capturen normalitzats a l'origen (hex / <n>px|%), així que no
//    cal getComputedStyle — només distància numèrica contra CSS_TARGETS.
//  - JS: sense referència exacta (D-03) → quantitat + varietat sobre team.jsRules.

import { SLOTS, CSS_HOLES, CSS_TARGETS, JS_ROW_LIMIT } from './robotTemplate.js';

// Consulta segura de propietat pròpia (còpia d'effects.js:16): evita que una clau com
// 'toString'/'__proto__' resolgui a un mètode heretat d'Object.prototype.
const own = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);

// D-04: pesos globals frozen (mateix patró "constants module" que CSS_HOLES/events.js).
export const WEIGHTS = Object.freeze({ html: 0.30, css: 0.60, js: 0.10 });

// Vocabulari JS: mides per normalitzar la varietat (verificades a robotTemplate.js).
//   JS_EVENTS: 4 · accions: 4 simples + 3 compostes = 7 · JS_ELEMENTS: 8
const JS_EVENT_COUNT = 4;
const JS_ACTION_COUNT = 7;
const JS_TARGET_COUNT = 8;

// Distància RGB Euclidiana normalitzada (D-02 discretion → simplicitat, per A1 de
// RESEARCH). Màxim teòric = sqrt(3)·255 (de #000000 a #ffffff).
const RGB_MAX = Math.sqrt(3) * 255;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Score 0..100 d'un únic forat contra el seu target. Color → distància RGB; range →
// distància numèrica normalitzada pel span propi del forat. Mai retorna NaN: el caller
// garanteix `value` no-undefined (default fallback) i el target sempre existeix.
function holeScore(holeId, value) {
  const hole = CSS_HOLES[holeId];
  const target = CSS_TARGETS[holeId];
  if (hole.control === 'color') {
    const [r1, g1, b1] = hexToRgb(value);
    const [r2, g2, b2] = hexToRgb(target);
    const d = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    return (1 - d / RGB_MAX) * 100;
  }
  // range: normalitza per l'amplada min..max del propi forat.
  const teamN = parseInt(value, 10);
  const targetN = parseInt(target, 10);
  const span = hole.max - hole.min;
  const d = Math.abs(teamN - targetN);
  return Math.max(0, 1 - d / span) * 100;
}

// D-01 / SCORE-01: proximitat parcial. Cada placement emmagatzemat és correcte per
// construcció (placePiece rebutja tipus incorrectes), així que el score és la fracció de
// slots plens. subchecks[] duu un `passed` booleà per slot (debrief SCORE-05).
export function scoreHtml(placement = {}) {
  const subchecks = SLOTS.map((s) => ({
    slot: s.id,
    passed: placement[s.id] === s.accepts,
  }));
  const placed = subchecks.filter((c) => c.passed).length;
  return { pct: (placed / SLOTS.length) * 100, subchecks };
}

// D-07: el gate de correcció 100% == els 7 slots plens (consumit pel Pla 02).
export const isHtmlComplete = (placement = {}) => Object.keys(placement).length === SLOTS.length;

// D-02 / SCORE-02: mitjana de la distància normalitzada per forat. SEMPRE itera sobre
// Object.keys(CSS_HOLES) (mai sobre cssValues), amb fallback al `default` del forat per
// als no tocats (Pitfall 2 — mai undefined/NaN). El `default` és lluny del target →
// score baix, que és correcte (l'equip no el va arreglar).
export function scoreCss(cssValues = {}) {
  const ids = Object.keys(CSS_HOLES);
  const subchecks = ids.map((id) => {
    const value = own(cssValues, id) ? cssValues[id] : CSS_HOLES[id].default;
    const score = holeScore(id, value);
    return { hole: id, score, passed: score >= 90 }; // llindar d'icona verda (A4, debrief)
  });
  const mean = subchecks.reduce((a, c) => a + c.score, 0) / ids.length;
  return { pct: mean, subchecks };
}

// D-03 / SCORE-03: quantitat + varietat (sense referència exacta). Split 50/50 entre
// quantitat (N/6) i varietat (mitjana de events/accions/elements únics normalitzats),
// defaults defensables per A2 de RESEARCH. team.jsRules ja ve validat (vocabulari +
// anti-repetició + límit 6) des de gameState.setJsRules, així que aquí només comptem.
export function scoreJs(jsRules = []) {
  const N = jsRules.length; // 0..6
  const uniq = (arr) => new Set(arr).size;
  const events = uniq(jsRules.map((r) => r.event));
  const actions = uniq(jsRules.map((r) => r.accio));
  const targets = uniq(jsRules.flatMap((r) => [r.origen, r.desti].filter(Boolean)));

  const quantity = (N / JS_ROW_LIMIT) * 50;
  const variety =
    ((events / JS_EVENT_COUNT) + (actions / JS_ACTION_COUNT) + (targets / JS_TARGET_COUNT)) / 3 * 50;

  return {
    pct: Math.min(100, quantity + variety),
    subchecks: [
      { label: 'regles', value: N },
      { label: 'events únics', value: events },
      { label: 'accions úniques', value: actions },
      { label: 'elements únics', value: targets },
    ],
  };
}

// D-04 / D-13: puntuació global amb pesos 30/60/10. `mask` marca quines fases s'han
// jugat (per al rànquing parcial del Pla 02, fases no jugades = 0). `bonus` (petit, ≤5)
// se suma i es clampa a 100 perquè mai domini sobre la precisió (D-05).
export function computeGlobal({ html = 0, css = 0, js = 0 } = {}, mask = { html: 1, css: 1, js: 1 }, bonus = 0) {
  const base =
    html * WEIGHTS.html * mask.html +
    css * WEIGHTS.css * mask.css +
    js * WEIGHTS.js * mask.js;
  return Math.min(100, base + bonus);
}

// D-05 / D-06: bonificació de temps NOMÉS a HTML, rank-based entre finishers. Usa NOMÉS
// l'ordre relatiu de team.doneAt.html (mai temps absolut ni phaseStartedAt — Pitfall 3,
// robust a pause/resume/extend). El més ràpid rep 5, el més lent 0, escalat linealment
// pel rang. Els equips sense doneAt.html no apareixen al Map (tractats com 0 pel caller).
export function htmlTimeBonuses(teams = []) {
  const finishers = teams
    .filter((t) => t.doneAt?.html != null)
    .sort((a, b) => a.doneAt.html - b.doneAt.html);
  const F = finishers.length;
  const bonus = new Map();
  finishers.forEach((t, i) => {
    bonus.set(t.id, F <= 1 ? 5 : Math.round((5 * (F - 1 - i)) / (F - 1)));
  });
  return bonus;
}
