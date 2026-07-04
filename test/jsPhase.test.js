// Integration test: exercises the real server (Express + Socket.io) over a real
// ephemeral-port HTTP listener, using socket.io-client — no mocks. Copies the
// race-safe harness from cssPhase.test.js/placement.test.js (startServer(0),
// once/onceOrTimeout/connectAndAwait, ordered round-trip).
//
// Covers the authoritative round-trip del constructor de regles JS (GAME-05, part
// JS de GAME-07):
//   - RULES-WRONG-PHASE:   un TEAM_SET_RULES mentre phase==='html' NO produeix
//                          TEAM_JS_STATE (guard state.phase !== 'js').
//   - RULES-OK:            un array d'1 regla vàlida retorna TEAM_JS_STATE dirigit
//                          a l'owner amb jsRules igual (GAME-05).
//   - RULES-ANTIREPEAT-REJECT: dues files amb la mateixa parella (event, origen) →
//                          cap TEAM_JS_STATE (D-15).
//   - RULES-LIMIT-REJECT:  un array de 7 regles → cap TEAM_JS_STATE (límit ≤6, D-11/D-12).
//   - RULES-VOCAB-REJECT:  event fora del vocabulari frozen → cap TEAM_JS_STATE (V5).
//   - COMPOSITE-DESTI-REJECT: una acció composta amb desti no null → cap TEAM_JS_STATE (D-17).
//   - NO-SESSION-BROADCAST: un segon equip NO rep res del TEAM_SET_RULES del primer
//                          (emissió dirigida team:<id>, Pitfall 1/2).
//   - F5-JS-RECOVERY:      reconnectar amb el token previ recupera els jsRules via un
//                          TEAM_JS_STATE dirigit en connectar (CORE-03).
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

// Register listeners in the same synchronous tick before any `await` yields, so
// the server's first synchronous emit is never missed.
function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

// Una regla vàlida de referència (event/origen/destí/acció dins del vocabulari frozen).
const OK_RULE = { event: 'click', origen: 'nas', desti: 'cap', accio: 'girar' };

// Shared fixtures across the ordered round-trip (node:test runs tests in
// declaration order within a single file).
let adminSocket;
let teamClient1;
let teamClient2;
let team1Id;
let team2Id;
let team1Token;

test('setup: registra equips i dos equips trien', async () => {
  const admin = connectAndAwait({ role: 'admin' }, EVENTS.SESSION_FULL_STATE);
  adminSocket = admin.socket;
  await admin.ready;

  const t1 = connectAndAwait({}, EVENTS.TEAM_AVAILABLE_LIST);
  teamClient1 = t1.socket;
  await t1.ready;

  const listPromise = once(teamClient1, EVENTS.TEAM_AVAILABLE_LIST);
  const adminRegisterBroadcast = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_REGISTER_TEAMS, { names: ['A', 'B', 'C', 'D'] });
  const [list] = await Promise.all([listPromise, adminRegisterBroadcast]);
  team1Id = list.teams[0].id;
  team2Id = list.teams[1].id;

  const claimed1 = once(teamClient1, EVENTS.TEAM_CLAIMED);
  teamClient1.emit(EVENTS.TEAM_SELECT, { teamId: team1Id });
  const claim1 = await claimed1;
  team1Token = claim1.token; // per al cas F5 recovery

  const t2 = connectAndAwait({}, EVENTS.TEAM_AVAILABLE_LIST);
  teamClient2 = t2.socket;
  await t2.ready;
  const claimed2 = once(teamClient2, EVENTS.TEAM_CLAIMED);
  teamClient2.emit(EVENTS.TEAM_SELECT, { teamId: team2Id });
  await claimed2;
});

test('RULES-WRONG-PHASE: durant la fase html, TEAM_SET_RULES no produeix TEAM_JS_STATE', async () => {
  const started = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_START_PHASE, { phase: 'html', durationMs: 60000 });
  await started;

  const jsPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_JS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_RULES, { rules: [OK_RULE] });

  const js = await jsPromise;
  assert.equal(js, undefined, 'un TEAM_SET_RULES fora de la fase js mai ha de produir TEAM_JS_STATE');
});

test('RULES-OK: un array d\'1 regla vàlida retorna TEAM_JS_STATE a l\'owner (GAME-05)', async () => {
  const started = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_START_PHASE, { phase: 'js', durationMs: 60000 });
  await started;

  const jsPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_JS_STATE, 800);
  teamClient1.emit(EVENTS.TEAM_SET_RULES, { rules: [OK_RULE] });

  const js = await jsPromise;
  assert.ok(js, "l'owner ha de rebre TEAM_JS_STATE en un set vàlid");
  assert.deepEqual(js.jsRules, [OK_RULE]);
});

test('RULES-ANTIREPEAT-REJECT: dues files amb la mateixa parella (event, origen) es rebutgen (D-15)', async () => {
  const jsPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_JS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_RULES, {
    rules: [
      { event: 'click', origen: 'nas', desti: 'cap', accio: 'girar' },
      { event: 'click', origen: 'nas', desti: 'boca', accio: 'canviar-color' },
    ],
  });

  const js = await jsPromise;
  assert.equal(js, undefined, 'repetir la parella (event, origen) mai ha de mutar ni difondre');
});

test('RULES-LIMIT-REJECT: un array de 7 regles supera el límit ≤6 (D-11/D-12)', async () => {
  const origens = ['nas', 'boca', 'cap', 'antena', 'orella-esquerra', 'orella-dreta', 'ull-esquerre'];
  const rules = origens.map((origen) => ({ event: 'click', origen, desti: 'cap', accio: 'girar' }));
  assert.equal(rules.length, 7);

  const jsPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_JS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_RULES, { rules });

  const js = await jsPromise;
  assert.equal(js, undefined, 'un array de 7 regles (>6) mai ha de mutar ni difondre');
});

test('RULES-VOCAB-REJECT: un event fora del vocabulari frozen es rebutja (V5)', async () => {
  const jsPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_JS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_RULES, {
    rules: [{ event: 'no-existeix', origen: 'nas', desti: 'cap', accio: 'girar' }],
  });

  const js = await jsPromise;
  assert.equal(js, undefined, 'un vocabulari desconegut mai ha de mutar ni difondre');
});

test('COMPOSITE-DESTI-REJECT: una acció composta amb desti no null es rebutja (D-17)', async () => {
  const jsPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_JS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_RULES, {
    rules: [{ event: 'dblclick', origen: 'boca', desti: 'cap', accio: 'acluca-tanca' }],
  });

  const js = await jsPromise;
  assert.equal(js, undefined, 'una composta ha de portar desti null; amb destí es rebutja');
});

test('NO-SESSION-BROADCAST: un segon equip no rep res del set del primer (Pitfall 1)', async () => {
  let team2GotJs = false;
  let team2GotState = false;
  teamClient2.once(EVENTS.TEAM_JS_STATE, () => {
    team2GotJs = true;
  });
  teamClient2.once(EVENTS.SESSION_FULL_STATE, () => {
    team2GotState = true;
  });

  // Un ruleset NOU i vàlid per team1 (diferent d'OK_RULE) perquè muti i difongui.
  teamClient1.emit(EVENTS.TEAM_SET_RULES, {
    rules: [{ event: 'mouseleave', origen: 'antena', desti: 'cap', accio: 'canviar-mida' }],
  });
  await wait(150);

  assert.equal(team2GotJs, false, 'team2 no ha de rebre TEAM_JS_STATE del set de team1');
  assert.equal(team2GotState, false, 'team2 no ha de rebre SESSION_FULL_STATE del set de team1');
});

test('F5-JS-RECOVERY: reconnectar amb el token recupera els jsRules (CORE-03)', async () => {
  const reconnect = connectAndAwait({ token: team1Token }, EVENTS.TEAM_JS_STATE);
  const js = await reconnect.ready;
  assert.ok(js, 'la reconnexió per token ha de rebre TEAM_JS_STATE en connectar');
  assert.deepEqual(
    js.jsRules,
    [{ event: 'mouseleave', origen: 'antena', desti: 'cap', accio: 'canviar-mida' }],
    'el js recuperat ha de mantenir l\'últim ruleset assentat abans de la reconnexió',
  );
  reconnect.socket.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
  teamClient2?.close();
});
