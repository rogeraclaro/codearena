// Integration test: exercises the real server (Express + Socket.io) over a real
// ephemeral-port HTTP listener, using socket.io-client — no mocks.
// Covers the walking-skeleton round-trip: registre -> tria -> estat autoritatiu
// -> reconnexio per token -> rebuig d'esdeveniments admin forjats.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';

let httpServer;
let baseUrl;

before(async () => {
  const started = await startServer(0); // port 0 = ephemeral, avoids collisions
  httpServer = started.httpServer;
  const { port } = started;
  baseUrl = `http://localhost:${port}`;
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

// Creates a raw socket and, in the SAME synchronous tick, attaches listeners
// for 'connect' plus whatever first event the caller expects — the server
// may emit its first event (session:full-state / team:available-list)
// synchronously right after the connection handshake, so the listener must
// be registered before any `await` yields back to the event loop, otherwise
// the event is missed (classic Socket.io test race condition).
function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

// Shared fixtures across the ordered A-E round-trip (node:test runs tests in
// declaration order within a single file by default).
let adminSocket;
let teamClient1;
let teamClient2;
let availableTeamsAfterRegister;
let claimedToken;
let claimedTeamId;
let adminFullStateAfterClaim;

test('Test A: admin registra equips, el client rep la llista disponible', async () => {
  const admin = connectAndAwait({ role: 'admin' }, 'session:full-state');
  adminSocket = admin.socket;
  await admin.ready; // initial emit on admin connect

  const team1 = connectAndAwait({}, 'team:available-list');
  teamClient1 = team1.socket;
  await team1.ready; // initial (empty) list on connect

  const listPromise = once(teamClient1, 'team:available-list');
  // Drain admin's own session:full-state broadcast triggered by this same
  // register-teams call here — otherwise it lingers as an unconsumed event
  // and a later once('session:full-state') listener (Test B) could catch
  // this stale in-flight packet instead of the one it actually expects.
  const adminRegisterBroadcast = once(adminSocket, 'session:full-state');
  adminSocket.emit('admin:register-teams', { names: ['A', 'B', 'C', 'D'] });

  const [payload] = await Promise.all([listPromise, adminRegisterBroadcast]);
  assert.equal(payload.teams.length, 4);
  availableTeamsAfterRegister = payload.teams;
});

test('Test B: tria equip + bloqueig fort (D-03)', async () => {
  const teamId = availableTeamsAfterRegister[0].id;

  const adminStatePromise = once(adminSocket, 'session:full-state');
  const claimedPromise = once(teamClient1, 'team:claimed');
  teamClient1.emit('team:select', { teamId });

  const claimed = await claimedPromise;
  assert.ok(claimed.token && claimed.token.length > 0);
  assert.equal(claimed.teamId, teamId);
  claimedToken = claimed.token;
  claimedTeamId = claimed.teamId;
  adminFullStateAfterClaim = adminStatePromise;

  const team2 = connectAndAwait({}, 'team:available-list');
  teamClient2 = team2.socket;
  const list2 = await team2.ready;
  assert.equal(list2.teams.length, 3);
  assert.ok(!list2.teams.some((t) => t.id === claimedTeamId));
});

test("Test C: l'estat autoritatiu reflecteix l'equip triat com a connectat", async () => {
  const state = await adminFullStateAfterClaim;
  const team = state.teams.find((t) => t.id === claimedTeamId);
  assert.ok(team, 'l\'equip triat ha de sortir a session:full-state');
  assert.equal(team.connected, true);
  assert.equal(team.progress, null);
  assert.equal(team.token, undefined, 'el token mai s\'ha d\'exposar a getPublicState()');
});

test('Test D: reconnexio per token (CORE-03) sense tornar a demanar tria', async () => {
  const reconnect = connectAndAwait({ token: claimedToken }, 'session:full-state');
  let sawAvailableList = false;
  reconnect.socket.once('team:available-list', () => {
    sawAvailableList = true;
  });

  const state = await reconnect.ready;
  const team = state.teams.find((t) => t.id === claimedTeamId);
  assert.ok(team, 'la reconnexio ha de rebre el mateix equip a session:full-state');
  assert.equal(team.connected, true);

  await wait(100);
  assert.equal(sawAvailableList, false, 'un socket reconnectat per token mai ha de rebre team:available-list');

  reconnect.socket.close();
});

test('Test E: un socket no-admin no pot mutar equips (V4 access control)', async () => {
  teamClient2.emit('admin:register-teams', { names: ['X', 'Y'] });
  await wait(150);

  const check = connectAndAwait({}, 'team:available-list');
  const list = await check.ready;
  assert.equal(list.teams.length, 3, 'admin:register-teams des dun socket no-admin no ha de mutar l\'estat');
  assert.ok(!list.teams.some((t) => t.name === 'X' || t.name === 'Y'));

  check.socket.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
  teamClient2?.close();
});
