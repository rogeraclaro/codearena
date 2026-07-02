// Integration test: exercises the real server's connection-status broadcast
// (ADMIN-05) and directed force-resync (ADMIN-06, D-09) over a real
// ephemeral-port HTTP listener, using socket.io-client — no mocks.
// Mirrors test/roundtrip.test.js and test/timer.test.js's
// fixture/ordering conventions.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';

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

// Attaches listeners for 'connect' plus the expected first event in the
// SAME synchronous tick (mirrors roundtrip.test.js's connectAndAwait): the
// server may emit its first event synchronously right after the connection
// handshake, so attaching the second listener only after `await`-ing
// 'connect' would miss it (classic Socket.io test race condition).
function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

// Shared fixtures across the ordered A-D round-trip (node:test runs tests in
// declaration order within a single file, per roundtrip.test.js convention).
let adminSocket;
let teamXSocket;
let teamYSocket;
let teamXId;
let teamYId;
let teamXToken;

test("Test A: estat de connexio en viu (ADMIN-05) — desconnexio d'un equip actualitza l'admin a l'instant", async () => {
  const admin = connectAndAwait({ role: 'admin' }, 'session:full-state');
  adminSocket = admin.socket;
  await admin.ready; // initial emit on admin connect

  const teamX = connectAndAwait({}, 'team:available-list');
  teamXSocket = teamX.socket;
  await teamX.ready; // initial (empty) list on connect

  const teamY = connectAndAwait({}, 'team:available-list');
  teamYSocket = teamY.socket;
  await teamY.ready;

  const listPromiseX = once(teamXSocket, 'team:available-list');
  const adminRegisterBroadcast = once(adminSocket, 'session:full-state');
  adminSocket.emit('admin:register-teams', { names: ['X', 'Y'] });
  const [availableList] = await Promise.all([listPromiseX, adminRegisterBroadcast]);
  assert.equal(availableList.teams.length, 2);

  const claimedPromise = once(teamXSocket, 'team:claimed');
  const adminStateAfterClaim = once(adminSocket, 'session:full-state');
  teamXSocket.emit('team:select', { teamId: availableList.teams[0].id });
  const claimed = await claimedPromise;
  teamXId = claimed.teamId;
  teamXToken = claimed.token;

  const stateAfterClaim = await adminStateAfterClaim;
  const teamAfterClaim = stateAfterClaim.teams.find((t) => t.id === teamXId);
  assert.ok(teamAfterClaim, "l'equip triat ha de sortir a session:full-state");
  assert.equal(teamAfterClaim.connected, true);

  const claimedY = once(teamYSocket, 'team:claimed');
  // Drain the admin's session:full-state broadcast triggered by this claim
  // here — otherwise it lingers as an unconsumed event and the disconnect
  // listener below could catch this stale in-flight packet instead of the
  // one it actually expects (same race guarded against in roundtrip.test.js).
  const adminStateAfterClaimY = once(adminSocket, 'session:full-state');
  teamYSocket.emit('team:select', { teamId: availableList.teams[1].id });
  const [claimedYPayload] = await Promise.all([claimedY, adminStateAfterClaimY]);
  teamYId = claimedYPayload.teamId;

  const disconnectStatePromise = once(adminSocket, 'session:full-state');
  teamXSocket.close();
  const stateAfterDisconnect = await disconnectStatePromise;
  const teamAfterDisconnect = stateAfterDisconnect.teams.find((t) => t.id === teamXId);
  assert.ok(teamAfterDisconnect, "l'equip desconnectat continua a session:full-state");
  assert.equal(teamAfterDisconnect.connected, false, 'la desconnexio ha de propagar-se a linstant a ladmin');
});

test('Test B: admin:force-resync (ADMIN-06) envia team:reload NOMES al room de lequip objectiu', async () => {
  const reconnected = connectAndAwait({ token: teamXToken }, 'session:full-state');
  teamXSocket = reconnected.socket;
  await reconnected.ready;

  let teamYGotReload = false;
  teamYSocket.once('team:reload', () => {
    teamYGotReload = true;
  });
  const teamXReloadPromise = once(teamXSocket, 'team:reload');

  adminSocket.emit('admin:force-resync', { teamId: teamXId });

  await teamXReloadPromise;
  await wait(200);
  assert.equal(teamYGotReload, false, "un equip que no es lobjectiu no ha de rebre team:reload");
});

test('Test C: autoritzacio — un socket dequip que emet admin:force-resync no dispara cap team:reload', async () => {
  let teamXGotReload = false;
  teamXSocket.once('team:reload', () => {
    teamXGotReload = true;
  });

  teamYSocket.emit('admin:force-resync', { teamId: teamXId });
  await wait(300);

  assert.equal(teamXGotReload, false, "un socket no-admin no pot forcar cap resync (guard room admin)");
});

test('Test D: recuperacio post-reload — reconnexio per token torna connected:true al full-state', async () => {
  teamXSocket.close();
  await wait(150);

  const reconnect = connectAndAwait({ token: teamXToken }, 'session:full-state');
  const state = await reconnect.ready;
  const team = state.teams.find((t) => t.id === teamXId);
  assert.ok(team, 'la reconnexio ha de rebre el mateix equip a session:full-state');
  assert.equal(team.connected, true, "la reconnexio per token ha de recuperar l'estat connectat");

  reconnect.socket.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamXSocket?.close();
  teamYSocket?.close();
});
