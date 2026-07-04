// Test pur (sense navegador ni jsdom) de l'intèrpret d'efectes JS (GAME-07/D-19):
// amb un doc stub que retorna sempre `null`/`[]`, cap acció sobre element absent
// (DOM incomplet) ha de llençar. Mirall del §Code Example 4 de 03-RESEARCH.
//
// Aquests casos FALLEN abans d'implementar src/shared/effects.js (RED): el mòdul
// encara no existeix, així que l'import llença.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, attachRule } from '../src/shared/effects.js';

// Stub mínim del contentDocument: mai troba res (robot buit / peça no col·locada).
const emptyDoc = { querySelector: () => null, querySelectorAll: () => [] };

test('GAME-07: applyAction simple sobre element absent és un no-op silenciós', () => {
  assert.doesNotThrow(() =>
    applyAction(emptyDoc, { origen: 'nas', desti: 'nas', accio: 'canviar-color' }));
});

test('GAME-07: applyAction composta (destí null) sobre DOM buit és un no-op silenciós', () => {
  assert.doesNotThrow(() =>
    applyAction(emptyDoc, { origen: 'nas', desti: null, accio: 'acluca-tanca' }));
});

test('GAME-07: attachRule sobre origen absent no llença ni registra listener', () => {
  assert.doesNotThrow(() =>
    attachRule(emptyDoc, { event: 'click', origen: 'nas', desti: 'nas', accio: 'girar' }));
});
