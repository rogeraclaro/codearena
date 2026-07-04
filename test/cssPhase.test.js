// Integration test: exercises the real server (Express + Socket.io) over a real
// ephemeral-port HTTP listener, using socket.io-client — no mocks. Copies the
// race-safe harness from placement.test.js (startServer(0), once/onceOrTimeout/
// connectAndAwait, ordered round-trip).
//
// Covers the authoritative round-trip of the CSS phase (GAME-04, part CSS de GAME-07):
//   - SET-CSS-WRONG-PHASE: un TEAM_SET_CSS mentre phase==='html' NO produeix TEAM_CSS_STATE
//                          (guard state.phase !== 'css').
//   - SET-CSS-OK:          un TEAM_SET_CSS valid (color hex) retorna TEAM_CSS_STATE dirigit
//                          a l'owner amb cssValues[holeId]===value (GAME-04).
//   - SET-CSS-NOOP:        reenviar el MATEIX value ja emmagatzemat NO produeix segon
//                          TEAM_CSS_STATE (mutation-returns-bool anti-storm).
//   - SET-CSS-INVALID:     un value hex invalid NO produeix TEAM_CSS_STATE (V5 rebuig servidor).
//   - NO-SESSION-BROADCAST: un segon equip NO rep res del TEAM_SET_CSS del primer
//                          (emissio dirigida team:<id>, Pitfall 1/2).
//   - V4-FORGE:            forjar teamId al payload no muta el board d'un altre equip
//                          (identitat de socket.data, no del payload).
//   - F5-CSS-RECOVERY:     reconnectar amb el token previ recupera els cssValues via un
//                          TEAM_CSS_STATE dirigit en connectar (CORE-03).
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

// Un forat de tipus color per als casos round-trip (identitat del hole, no valor).
const COLOR_HOLE = 'antena-bg';
const VALID_COLOR = '#8a9ba8';

// Shared fixtures across the ordered round-trip (node:test runs tests in
// declaration order within a single file).
let adminSocket;
let teamClient1;
let teamClient2;
let team1Id;
let team2Id;
let team1Token;

test("setup: registra equips i dos equips trien", async () => {
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

test('SET-CSS-WRONG-PHASE: durant la fase html, TEAM_SET_CSS no produeix TEAM_CSS_STATE', async () => {
  const started = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_START_PHASE, { phase: 'html', durationMs: 60000 });
  await started;

  const cssPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_CSS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_CSS, { holeId: COLOR_HOLE, value: VALID_COLOR });

  const css = await cssPromise;
  assert.equal(css, undefined, "un TEAM_SET_CSS fora de la fase css mai ha de produir TEAM_CSS_STATE");
});

test('SET-CSS-OK: un TEAM_SET_CSS valid retorna TEAM_CSS_STATE a l\'owner (GAME-04)', async () => {
  const started = once(adminSocket, EVENTS.SESSION_FULL_STATE);
  adminSocket.emit(EVENTS.ADMIN_START_PHASE, { phase: 'css', durationMs: 60000 });
  await started;

  const cssPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_CSS_STATE, 800);
  teamClient1.emit(EVENTS.TEAM_SET_CSS, { holeId: COLOR_HOLE, value: VALID_COLOR });

  const css = await cssPromise;
  assert.ok(css, "l'owner ha de rebre TEAM_CSS_STATE en un set valid");
  assert.equal(css.cssValues[COLOR_HOLE], VALID_COLOR);
});

test('SET-CSS-NOOP: reenviar el mateix value no emet segon TEAM_CSS_STATE (mutation-returns-bool)', async () => {
  const cssPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_CSS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_CSS, { holeId: COLOR_HOLE, value: VALID_COLOR });

  const css = await cssPromise;
  assert.equal(css, undefined, 'un value repetit no ha de produir cap re-broadcast (anti-storm)');
});

test('SET-CSS-INVALID: un value hex invalid no produeix TEAM_CSS_STATE (V5)', async () => {
  const cssPromise = onceOrTimeout(teamClient1, EVENTS.TEAM_CSS_STATE, 300);
  teamClient1.emit(EVENTS.TEAM_SET_CSS, { holeId: COLOR_HOLE, value: 'not-a-color' });

  const css = await cssPromise;
  assert.equal(css, undefined, 'un value invalid mai ha de mutar ni difondre estat');
});

test('NO-SESSION-BROADCAST: un segon equip no rep res del set del primer (Pitfall 1)', async () => {
  let team2GotCss = false;
  let team2GotState = false;
  teamClient2.once(EVENTS.TEAM_CSS_STATE, () => {
    team2GotCss = true;
  });
  teamClient2.once(EVENTS.SESSION_FULL_STATE, () => {
    team2GotState = true;
  });

  // Un value NOU per team1 (diferent de VALID_COLOR) perque muti i difongui.
  teamClient1.emit(EVENTS.TEAM_SET_CSS, { holeId: COLOR_HOLE, value: '#123456' });
  await wait(150);

  assert.equal(team2GotCss, false, 'team2 no ha de rebre TEAM_CSS_STATE del set de team1');
  assert.equal(team2GotState, false, 'team2 no ha de rebre SESSION_FULL_STATE del set de team1');
});

test('V4-FORGE: forjar teamId al payload no muta el board d\'un altre equip', async () => {
  let team1GotCss = false;
  teamClient1.once(EVENTS.TEAM_CSS_STATE, () => {
    team1GotCss = true;
  });

  // team2 forja el teamId de team1 — el servidor deriva la identitat de
  // socket.data.teamId (team2), mai del payload, aixi que el board de team1 no es toca.
  teamClient2.emit(EVENTS.TEAM_SET_CSS, { teamId: team1Id, holeId: COLOR_HOLE, value: '#abcdef' });
  await wait(150);

  assert.equal(team1GotCss, false, "team1 no ha de rebre cap TEAM_CSS_STATE d'un intent forjat per team2");
});

test('F5-CSS-RECOVERY: reconnectar amb el token recupera els cssValues (CORE-03)', async () => {
  const reconnect = connectAndAwait({ token: team1Token }, EVENTS.TEAM_CSS_STATE);
  const css = await reconnect.ready;
  assert.ok(css, 'la reconnexio per token ha de rebre TEAM_CSS_STATE en connectar');
  assert.equal(
    css.cssValues[COLOR_HOLE],
    '#123456',
    'el css recuperat ha de mantenir l\'ultim value assentat abans de la reconnexio',
  );
  reconnect.socket.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
  teamClient2?.close();
});
