// Test d'integració: exercita el servidor real (Express + Socket.io) sobre un port
// efímer, amb socket.io-client — sense mocks. Copia el harness race-safe de
// cssPhase.test.js (startServer(0), once/onceOrTimeout/connectAndAwait, round-trip
// ordenat). Cobreix la finalització de la partida (ADMIN-07, D-15, D-16, SCORE-05):
//   - NON-ADMIN-REJECT: un socket no-admin que emet admin:finalize-game NO finalitza
//                       ni difon res (V4/T-04-01).
//   - FINALIZE-ROUNDTRIP-D16: admin emet ADMIN_FINALIZE_GAME; TOTHOM (equips + Admin) rep
//                       CEREMONY_START amb NOMÉS {ranking ({id,name,globalPct})} — cap
//                       ownDetail per a ningú (D-16, un sol broadcast a 'session').
//   - IDEMPOTENT: un segon ADMIN_FINALIZE_GAME no re-emet (finalizeGame → false).
//   - F5-RECOVERY: reconnectar amb el token després de finalitzar rep GAME_RESULTS
//                  amb NOMÉS el ranking (sense ownDetail, D-16), sense dependre del
//                  broadcast original (CORE-03, Pitfall 4).
//
// Event names s'importen d'src/server/events.js — cap literal d'event-name al test.
// Aquests casos FALLEN abans d'implementar el handler de finalització (RED).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';
import { EVENTS } from '../src/server/events.js';
import { gameState } from '../src/server/gameState.js';
import { htmlTimeBonuses } from '../src/shared/scoring.js';
import { SLOTS, CSS_HOLES } from '../src/shared/robotTemplate.js';

let httpServer;
let baseUrl;

before(async () => {
  const started = await startServer(0);
  httpServer = started.httpServer;
  baseUrl = `http://localhost:${started.port}`;
});

after(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
});

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceOrTimeout(socket, event, ms = 600) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// Per esdeveniments sense payload (p.ex. THANKS_SHOW, D-19): distingeix "rebut" de "timeout".
function receivedWithin(socket, event, ms = 400) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    socket.once(event, () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

let adminSocket;
let teamClient1;
let teamClient2;
let team1Id;
let team2Id;
let team1Token;

test('setup: registra 2 equips, ambdós trien, i team1 munta l\'estructura sencera', async () => {
  const admin = connectAndAwait({ role: 'admin' }, EVENTS.SESSION_FULL_STATE);
  adminSocket = admin.socket;
  await admin.ready;

  const t1 = connectAndAwait({}, EVENTS.TEAM_AVAILABLE_LIST);
  teamClient1 = t1.socket;
  await t1.ready;

  const listPromise = once(teamClient1, EVENTS.TEAM_AVAILABLE_LIST);
  const adminBroadcast = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_REGISTER_TEAMS, { names: ['Alfa', 'Bravo'] });
  const [list] = await Promise.all([listPromise, adminBroadcast]);
  team1Id = list.teams[0].id;
  team2Id = list.teams[1].id;

  const claimed1 = once(teamClient1, EVENTS.TEAM_CLAIMED);
  teamClient1.emit(EVENTS.TEAM_SELECT, { teamId: team1Id });
  team1Token = (await claimed1).token;

  const t2 = connectAndAwait({}, EVENTS.TEAM_AVAILABLE_LIST);
  teamClient2 = t2.socket;
  await t2.ready;
  const claimed2 = once(teamClient2, EVENTS.TEAM_CLAIMED);
  teamClient2.emit(EVENTS.TEAM_SELECT, { teamId: team2Id });
  await claimed2;

  // Fase HTML + team1 col·loca els 7 slots → HTML 100 (rank per sobre de team2 buit).
  const started = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_START_PHASE, { phase: 'html', durationMs: 60000 });
  await started;
  for (const s of SLOTS) {
    teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: s.id, pieceType: s.accepts });
  }
  await wait(200);
});

test('GATE-D07: el botó HTML només marca fet a estructura 100% (placement incomplet rebutjat)', async () => {
  // team2 té 0 slots (incomplet): TEAM_MARK_DONE NO escriu doneAt.html → cap TEAM_DONE_STATE.
  const noDone = onceOrTimeout(teamClient2, EVENTS.TEAM_DONE_STATE, 300);
  teamClient2.emit(EVENTS.TEAM_MARK_DONE, {});
  assert.equal(await noDone, undefined, 'placement incomplet no es pot marcar fet (D-07)');

  // team1 té els 7 slots plens: SÍ escriu doneAt.html → rep TEAM_DONE_STATE amb el timestamp.
  const done = onceOrTimeout(teamClient1, EVENTS.TEAM_DONE_STATE, 600);
  teamClient1.emit(EVENTS.TEAM_MARK_DONE, {});
  const doneState = await done;
  assert.ok(doneState?.doneAt?.html != null, 'placement 100% pot marcar-se fet (D-07)');
});

test('VOLUNTARY-FREEZE-D15: markPhaseDone CSS/JS és voluntari (sense gate) i congela l\'equip', () => {
  // D-15 SUPERSEDEIX D-08/D-09: CSS i JS recuperen un "Finalitzar" VOLUNTARI (sense gate de
  // correcció). markPhaseDone no llegeix state.phase (el caller li passa la fase activa); el
  // que canvia el comportament dels mutadors és state.phase. Exercitem la congelació amb la
  // fase corresponent activa via startPhase (mateix gameState-directe que la resta de tests
  // unitaris d'aquest fitxer) i restaurem html al final per no trencar els tests PARTIAL
  // posteriors (que transicionen html→css→js per socket). team2 té placement buit.

  // --- (a) CSS: voluntari + congela ---
  assert.equal(gameState.startPhase('css', 60000), true);
  const [cssHole] = Object.entries(CSS_HOLES).find(([, h]) => h.control === 'color');
  // editable ABANS de finalitzar (prova que hole+valor són vàlids i el panell és mutable).
  assert.equal(gameState.setCssValue(team2Id, cssHole, '#123456'), true, 'CSS editable abans de Finalitzar');
  // marcar "fet" a CSS és voluntari: cap gate de correcció (D-15).
  assert.equal(gameState.markPhaseDone(team2Id, 'css'), true, 'CSS es marca fet voluntàriament (D-15)');
  assert.ok(gameState.getTeamDoneState(team2Id).doneAt.css != null, 'doneAt.css escrit');
  // congelat: tota mutació CSS posterior és no-op (freeze server-side). Valor DIFERENT per
  // descartar el no-op de valor-idèntic → el false ve NOMÉS del guard de congelació.
  assert.equal(gameState.setCssValue(team2Id, cssHole, '#654321'), false, 'CSS congelat després de Finalitzar (D-15)');

  // --- (b) JS: voluntari + congela ---
  assert.equal(gameState.startPhase('js', 60000), true);
  const rule1 = { event: 'click', origen: 'nas', desti: 'boca', accio: 'canviar-color' };
  const rule2 = { event: 'hover', origen: 'cap', desti: 'antena', accio: 'girar' };
  assert.equal(gameState.setJsRules(team2Id, [rule1]), true, 'JS editable abans de Finalitzar');
  assert.equal(gameState.markPhaseDone(team2Id, 'js'), true, 'JS es marca fet voluntàriament (D-15)');
  assert.ok(gameState.getTeamDoneState(team2Id).doneAt.js != null, 'doneAt.js escrit');
  assert.equal(gameState.setJsRules(team2Id, [rule1, rule2]), false, 'JS congelat després de Finalitzar (D-15)');

  // --- (c) scoring html-only intacte (D-05/D-06): un equip amb doneAt.css/js però SENSE
  // doneAt.html NO entra al Map de htmlTimeBonuses; el bonus segueix sent exclusiu de HTML.
  const bonuses = htmlTimeBonuses([
    { id: 'nomes-css-js', doneAt: { css: 1, js: 2 } },
    { id: 'te-html', doneAt: { html: 100 } },
  ]);
  assert.equal(bonuses.has('nomes-css-js'), false, 'doneAt.css/js no dona cap bonus (html-only)');
  assert.equal(bonuses.has('te-html'), true, 'NOMÉS doneAt.html entra al bonus de temps');

  // --- gate D-07 HTML intacte: placement incomplet no es pot marcar fet (team2 buit) ---
  assert.equal(gameState.markPhaseDone(team2Id, 'html'), false, 'placement HTML incomplet rebutjat (gate D-07)');
  // fase fora de PHASE_ORDER rebutjada.
  assert.equal(gameState.markPhaseDone(team2Id, 'results'), false, 'fase desconeguda rebutjada');

  // restaura la fase html per als tests PARTIAL posteriors (transició html→css→js per socket).
  assert.equal(gameState.startPhase('html', 60000), true);
});

test('PARTIAL-D12/D13: en tancar HTML, NOMÉS l\'admin rep el parcial amb màscara html-only', async () => {
  const adminPartial = onceOrTimeout(adminSocket, EVENTS.ADMIN_PARTIAL_RANKING, 800);
  const t1Partial = onceOrTimeout(teamClient1, EVENTS.ADMIN_PARTIAL_RANKING, 400);
  const t2Partial = onceOrTimeout(teamClient2, EVENTS.ADMIN_PARTIAL_RANKING, 400);
  adminSocket.emit(EVENTS.ADMIN_NEXT_PHASE, { durationMs: 60000 }); // html → css
  const [pa, pt1, pt2] = await Promise.all([adminPartial, t1Partial, t2Partial]);

  assert.ok(pa, 'l\'admin rep el rànquing parcial en tancar HTML (D-12)');
  assert.equal(pt1, undefined, 'cap equip rep el parcial (D-12/T-04-06)');
  assert.equal(pt2, undefined, 'cap equip rep el parcial (D-12/T-04-06)');

  assert.equal(pa.closedPhase, 'html', 'closedPhase identifica la fase tancada (caption)');
  assert.ok(Array.isArray(pa.ranking) && pa.ranking.length === 2);
  assert.equal(pa.ranking[0].id, team1Id, 'team1 (estructura 100%) encapçala el parcial');

  // D-13: MATEIX pipeline que el final — buildRanking amb mask html-only (css/js = 0).
  const expected = gameState.buildRanking({ html: 1, css: 0, js: 0 });
  assert.deepEqual(pa.ranking, expected, 'el parcial usa buildRanking amb mask html-only (D-13)');
  // Cada fila NOMÉS duu dades públiques (cap sub-check filtrat).
  for (const row of pa.ranking) {
    assert.deepEqual(Object.keys(row).sort(), ['globalPct', 'id', 'name']);
  }
});

test('PARTIAL-CSS: en tancar CSS, l\'admin rep el parcial amb màscara html+css', async () => {
  const adminPartial = onceOrTimeout(adminSocket, EVENTS.ADMIN_PARTIAL_RANKING, 800);
  const t1Partial = onceOrTimeout(teamClient1, EVENTS.ADMIN_PARTIAL_RANKING, 400);
  adminSocket.emit(EVENTS.ADMIN_NEXT_PHASE, { durationMs: 60000 }); // css → js
  const [pa, pt1] = await Promise.all([adminPartial, t1Partial]);

  assert.ok(pa, 'l\'admin rep el parcial en tancar CSS');
  assert.equal(pt1, undefined, 'cap equip rep el parcial (D-12)');
  assert.equal(pa.closedPhase, 'css', 'closedPhase = css');

  const expected = gameState.buildRanking({ html: 1, css: 1, js: 0 });
  assert.deepEqual(pa.ranking, expected, 'mask html+css, js encara 0 (D-13)');
});

test('NON-ADMIN-REJECT: un equip que emet admin:finalize-game no finalitza ni difon (V4)', async () => {
  const c1 = onceOrTimeout(teamClient1, EVENTS.CEREMONY_START, 300);
  const c2 = onceOrTimeout(teamClient2, EVENTS.CEREMONY_START, 300);
  teamClient1.emit(EVENTS.ADMIN_FINALIZE_GAME);
  const [p1, p2] = await Promise.all([c1, c2]);
  assert.equal(p1, undefined, 'un no-admin no pot disparar la cerimònia');
  assert.equal(p2, undefined, 'cap equip rep res d\'un finalize forjat');
});

test('FINALIZE-ROUNDTRIP-D16: tots (equips + Admin) reben NOMÉS el ranking, sense ownDetail', async () => {
  const c1 = onceOrTimeout(teamClient1, EVENTS.CEREMONY_START, 800);
  const c2 = onceOrTimeout(teamClient2, EVENTS.CEREMONY_START, 800);
  const ca = onceOrTimeout(adminSocket, EVENTS.CEREMONY_START, 800);
  adminSocket.emit(EVENTS.ADMIN_FINALIZE_GAME);
  const [p1, p2, pa] = await Promise.all([c1, c2, ca]);

  assert.ok(p1 && p2 && pa, 'tots (equips + admin) reben CEREMONY_START');

  // ranking: array ordenat descendent per globalPct, {id,name,globalPct} de TOTS.
  assert.ok(Array.isArray(p1.ranking));
  assert.equal(p1.ranking.length, 2);
  assert.ok(
    p1.ranking[0].globalPct >= p1.ranking[1].globalPct,
    'ranking ordenat descendent per globalPct',
  );
  assert.equal(p1.ranking[0].id, team1Id, 'team1 (estructura completa) encapçala');
  for (const row of p1.ranking) {
    assert.deepEqual(
      Object.keys(row).sort(),
      ['globalPct', 'id', 'name'],
      'cada fila del ranking difós NOMÉS duu id/name/globalPct',
    );
  }

  // D-16: cap payload duu ownDetail — ni equips ni Admin. El ranking públic és idèntic per
  // a tothom (un sol broadcast a 'session'), sense cap detall privat de sub-checks.
  assert.equal(p1.ownDetail, undefined, 'team1 no rep ownDetail (D-16)');
  assert.equal(p2.ownDetail, undefined, 'team2 no rep ownDetail (D-16)');
  assert.equal(pa.ownDetail, undefined, 'l\'admin no rep ownDetail (D-16)');
  // El ranking difós no filtra cap sub-check a ningú.
  assert.ok(!JSON.stringify(p1.ranking).includes('subchecks'), 'el ranking difós no filtra sub-checks');
});

test('IDEMPOTENT: un segon ADMIN_FINALIZE_GAME no re-emet (anti-storm)', async () => {
  const c1 = onceOrTimeout(teamClient1, EVENTS.CEREMONY_START, 300);
  adminSocket.emit(EVENTS.ADMIN_FINALIZE_GAME);
  assert.equal(await c1, undefined, 'finalitzar dues vegades no re-difon la cerimònia');
});

test('F5-RECOVERY: reconnectar amb el token després de finalitzar rep GAME_RESULTS (CORE-03)', async () => {
  const reconnect = connectAndAwait({ token: team1Token }, EVENTS.GAME_RESULTS);
  const results = await reconnect.ready;
  assert.ok(results, 'la reconnexió després de finalitzar ha de rebre GAME_RESULTS');
  assert.ok(Array.isArray(results.ranking) && results.ranking.length === 2, 'ranking final recuperat');
  assert.equal(results.ownDetail, undefined, 'F5 post-finalize no duu ownDetail (D-16)');
  assert.equal(results.ranking[0].id, team1Id, 'ranking final congelat manté l\'ordre');
  reconnect.socket.close();
});

test('THANKS-NON-ADMIN-REJECT (D-19): un equip que emet admin:show-thanks no difon res (V4)', async () => {
  const t1 = receivedWithin(teamClient1, EVENTS.THANKS_SHOW, 300);
  const ta = receivedWithin(adminSocket, EVENTS.THANKS_SHOW, 300);
  teamClient1.emit(EVENTS.ADMIN_SHOW_THANKS);
  const [got1, gotA] = await Promise.all([t1, ta]);
  assert.equal(got1, false, 'un no-admin no pot disparar la pantalla de gràcies');
  assert.equal(gotA, false, 'cap pantalla rep THANKS_SHOW d\'un show-thanks forjat');
});

test('THANKS-ROUNDTRIP (D-19): l\'admin difon THANKS_SHOW a totes les pantalles (equips + Admin)', async () => {
  const t1 = receivedWithin(teamClient1, EVENTS.THANKS_SHOW, 600);
  const t2 = receivedWithin(teamClient2, EVENTS.THANKS_SHOW, 600);
  const ta = receivedWithin(adminSocket, EVENTS.THANKS_SHOW, 600);
  adminSocket.emit(EVENTS.ADMIN_SHOW_THANKS);
  const [got1, got2, gotA] = await Promise.all([t1, t2, ta]);
  assert.ok(got1 && got2 && gotA, 'tots (equips + admin) reben THANKS_SHOW des d\'un sol broadcast');
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
  teamClient2?.close();
});
