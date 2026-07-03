// Integration test: exercises the real server (Express + Socket.io) over a real
// ephemeral-port HTTP listener, using socket.io-client — no mocks. Copies the
// race-safe harness from roundtrip.test.js.
//
// Covers the placement round-trip of the HTML phase:
//   - PLACE-OK:            un place valid -> l'owner rep team:board-state (autoritatiu, GAME-03).
//   - PLACE-TYPE-REJECT:   un tipus incompatible NO produeix board-state (type-check server-side, D-07).
//   - PLACE-DIRECTION-REJECT: una orella esquerra al forat dret es rebutja (split direccional).
//   - ADMIN-COUNT:         un place OK projecta progress {placed, total:7} a l'admin; el token mai s'exposa.
//   - NO-SESSION-BROADCAST: un segon equip NO rep res del place del primer (emissio dirigida, Pitfall 1).
//   - REMOVE round-trip:   treure una peça col·locada la retira del board i baixa el comptador (D-10).
//   - REMOVE no-op:        treure un slot buit NO emet board-state (mutation-returns-bool).
//   - INVENTORY cap:       no es poden col·locar més peces d'un tipus de les disponibles (Pitfall 5).
//   - V4 forge:            un equip no pot mutar el board d'un altre forjant teamId al payload (T-02-04).
//   - F5 recovery:         reconnectar amb el token recupera el placement previ (CORE-03).
//
// Event names s'importen d'src/server/events.js — cap literal d'event-name al test.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';
import { EVENTS } from '../src/server/events.js';

let httpServer;
let baseUrl;

before(async () => {
  const started = await startServer(0); // port 0 = ephemeral, avoids collisions
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

// Race-safe: resolves with the payload if `event` fires within `ms`, or with
// `undefined` on timeout — so a genuinely-RED assertion FAILS fast instead of
// hanging the whole test file when the server has no handler yet.
function onceOrTimeout(socket, event, ms = 600) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// See roundtrip.test.js: register listeners in the same synchronous tick before
// any `await` yields, so the server's first synchronous emit is never missed.
function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

// Shared fixtures across the ordered round-trip (node:test runs tests in
// declaration order within a single file).
let adminSocket;
let teamClient1;
let teamClient2;
let team1Id;
let team2Id;
let team1Token;

test('setup: registra equips, dos equips trien, i s\'inicia la fase html', async () => {
  const admin = connectAndAwait({ role: 'admin' }, 'session:full-state');
  adminSocket = admin.socket;
  await admin.ready;

  const t1 = connectAndAwait({}, 'team:available-list');
  teamClient1 = t1.socket;
  await t1.ready;

  const listPromise = once(teamClient1, 'team:available-list');
  const adminRegisterBroadcast = once(adminSocket, 'session:full-state');
  adminSocket.emit('admin:register-teams', { names: ['A', 'B', 'C', 'D'] });
  const [list] = await Promise.all([listPromise, adminRegisterBroadcast]);
  team1Id = list.teams[0].id;
  team2Id = list.teams[1].id;

  const claimed1 = once(teamClient1, 'team:claimed');
  teamClient1.emit('team:select', { teamId: team1Id });
  const claim1 = await claimed1;
  team1Token = claim1.token; // per al cas F5 recovery

  const t2 = connectAndAwait({}, 'team:available-list');
  teamClient2 = t2.socket;
  await t2.ready;
  const claimed2 = once(teamClient2, 'team:claimed');
  teamClient2.emit('team:select', { teamId: team2Id });
  await claimed2;

  const started = once(adminSocket, 'session:full-state');
  adminSocket.emit('admin:start-phase', { phase: 'html', durationMs: 60000 });
  await started;
});

test('PLACE-OK: un place valid retorna team:board-state a l\'owner (GAME-03)', async () => {
  const boardPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 800);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'antena-esquerra', pieceType: 'antena-esquerra' });

  const board = await boardPromise;
  assert.ok(board, 'l\'owner ha de rebre team:board-state en un place valid');
  assert.equal(board.placement['antena-esquerra'], 'antena-esquerra');
});

test('PLACE-TYPE-REJECT: un tipus incompatible no produeix board-state (D-07)', async () => {
  const boardPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'nas', pieceType: 'antena-esquerra' });

  const board = await boardPromise;
  assert.equal(board, undefined, 'un tipus incompatible mai ha de produir board-state');
});

// Split direccional (orella-esquerra i orella-dreta son tipus DIFERENTS; el forat
// dret nomes accepta la peca dreta). Mirall de PLACE-TYPE-REJECT pero per la
// mecanica esquerra/dreta de les orelles. Estat en entrar: { antena-esquerra }
// col·locat, orella-dreta encara buit → el reject no muta res.
test('PLACE-DIRECTION-REJECT: una orella esquerra al forat dret es rebutja', async () => {
  const boardPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'orella-dreta', pieceType: 'orella-esquerra' });

  const board = await boardPromise;
  assert.equal(board, undefined, 'una orella-esquerra mai ha d\'encaixar al forat orella-dreta');
});

test('ADMIN-COUNT: un place OK projecta progress {placed, total:7} a l\'admin, sense token', async () => {
  const statePromise = onceOrTimeout(adminSocket, 'session:full-state', 800);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'orella-dreta', pieceType: 'orella-dreta' });

  const state = await statePromise;
  assert.ok(state, 'l\'admin ha de rebre session:full-state en un place OK');
  const team = state.teams.find((t) => t.id === team1Id);
  assert.ok(team.progress, 'progress ha d\'estar present durant la fase html');
  assert.equal(team.progress.total, 7);
  assert.ok(team.progress.placed >= 1, 'placed ha de comptar les peces col·locades');
  assert.equal(team.token, undefined, 'el token mai s\'ha d\'exposar a la projeccio');
});

test('NO-SESSION-BROADCAST: un segon equip no rep res del place del primer (Pitfall 1)', async () => {
  let team2GotBoard = false;
  let team2GotState = false;
  teamClient2.once(EVENTS.TEAM_BOARD_STATE, () => {
    team2GotBoard = true;
  });
  teamClient2.once('session:full-state', () => {
    team2GotState = true;
  });

  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'orella-esquerra', pieceType: 'orella-esquerra' });
  await wait(150);

  assert.equal(team2GotBoard, false, 'team2 no ha de rebre team:board-state del place de team1');
  assert.equal(team2GotState, false, 'team2 no ha de rebre session:full-state del place de team1');
});

// Estat de team1 en entrar aquí: { antena-esquerra, orella-dreta, orella-esquerra }.
test('REMOVE round-trip: treure una peça col·locada la retira del board (D-10)', async () => {
  const boardPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 800);
  const adminPromise = onceOrTimeout(adminSocket, 'session:full-state', 800);
  teamClient1.emit(EVENTS.TEAM_REMOVE_PIECE, { slotId: 'antena-esquerra' });

  const board = await boardPromise;
  assert.ok(board, 'l\'owner ha de rebre team:board-state en un remove valid');
  assert.equal(
    board.placement['antena-esquerra'],
    undefined,
    'l\'slot retirat ja no ha de constar al board autoritatiu',
  );

  const state = await adminPromise;
  assert.ok(state, 'l\'admin ha de rebre session:full-state en un remove OK');
  const team = state.teams.find((t) => t.id === team1Id);
  assert.equal(team.progress.total, 7);
});

test('REMOVE no-op: treure un slot buit no emet board-state (mutation-returns-bool)', async () => {
  // antena-esquerra ja s'ha retirat al test anterior → aquest remove és un no-op.
  const boardPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_REMOVE_PIECE, { slotId: 'antena-esquerra' });

  const board = await boardPromise;
  assert.equal(board, undefined, 'treure un slot buit no ha de produir cap board-state');
});

test('INVENTORY cap: no es poden col·locar més peces de les disponibles (Pitfall 5)', async () => {
  // Reomple antena-esquerra amb la seva peça direccional (count 1, encara no
  // col·locada perquè es va retirar al test REMOVE) — OK.
  const okBoard = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 800);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'antena-esquerra', pieceType: 'antena-esquerra' });
  const board = await okBoard;
  assert.ok(board, 'l\'antena-esquerra s\'ha de poder recol·locar');
  assert.equal(board.placement['antena-esquerra'], 'antena-esquerra');

  // orella-dreta ja està ocupat (test ADMIN-COUNT) → un segon intent al mateix
  // forat (slot ja ocupat / inventari direccional esgotat) es rebutja sense board.
  const rejected = onceOrTimeout(teamClient1, EVENTS.TEAM_BOARD_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_PLACE_PIECE, { slotId: 'orella-dreta', pieceType: 'orella-dreta' });
  const board2 = await rejected;
  assert.equal(board2, undefined, 'no es pot reomplir un forat ja ocupat (inventari direccional esgotat)');
});

test('V4 forge: un equip no pot mutar el board d\'un altre forjant teamId (T-02-04)', async () => {
  let team1GotBoard = false;
  teamClient1.once(EVENTS.TEAM_BOARD_STATE, () => {
    team1GotBoard = true;
  });

  // team2 forja el teamId de team1 al payload — el servidor deriva la identitat de
  // socket.data.teamId (team2), mai del payload, així que el board de team1 no es toca.
  teamClient2.emit(EVENTS.TEAM_PLACE_PIECE, { teamId: team1Id, slotId: 'boca', pieceType: 'boca' });
  await wait(150);

  assert.equal(team1GotBoard, false, 'team1 no ha de rebre cap board-state d\'un intent forjat per team2');
});

test('F5 recovery: reconnectar amb el token recupera el placement previ (CORE-03)', async () => {
  const reconnect = connectAndAwait({ token: team1Token }, EVENTS.TEAM_BOARD_STATE);
  const board = await reconnect.ready;
  assert.ok(board, 'la reconnexió per token ha de rebre team:board-state en connectar');
  assert.equal(
    board.placement['orella-dreta'],
    'orella-dreta',
    'el board recuperat ha de mantenir el placement col·locat abans de la reconnexió',
  );
  reconnect.socket.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
  teamClient2?.close();
});
