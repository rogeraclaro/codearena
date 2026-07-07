// Regression test for the F5 reconnection bug ("parpelleig i desincronitzacio
// del panell"): lifecycle-driven SESSION_FULL_STATE must reach ONLY the admin
// (which paints per-team connection status), never bystander teams — and the
// deferred 'disconnect' of an old socket after an F5 must NOT mark a team
// offline while a live socket for that team still exists (overlapping-socket
// guard). Both are the exact triggers of the cross-flicker + value-revert.
// Real ephemeral-port server + socket.io-client, no mocks (mirrors
// monitoring.test.js conventions).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';

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

function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

let adminSocket;
let teamXSocket;
let teamYSocket;
let teamXId;
let teamXToken;

test('setup: admin registra 2 equips i tots dos els reclamen', async () => {
  const admin = connectAndAwait({ role: 'admin' }, 'session:full-state');
  adminSocket = admin.socket;
  await admin.ready;

  const teamX = connectAndAwait({}, 'team:available-list');
  teamXSocket = teamX.socket;
  await teamX.ready;

  const teamY = connectAndAwait({}, 'team:available-list');
  teamYSocket = teamY.socket;
  await teamY.ready;

  const listX = once(teamXSocket, 'team:available-list');
  const adminReg = once(adminSocket, 'session:full-state');
  adminSocket.emit('admin:register-teams', { names: ['X', 'Y'] });
  const [list] = await Promise.all([listX, adminReg]);

  const claimedX = once(teamXSocket, 'team:claimed');
  const adminClaimX = once(adminSocket, 'session:full-state');
  teamXSocket.emit('team:select', { teamId: list.teams[0].id });
  const cx = await claimedX;
  await adminClaimX;
  teamXId = cx.teamId;
  teamXToken = cx.token;

  const claimedY = once(teamYSocket, 'team:claimed');
  const adminClaimY = once(adminSocket, 'session:full-state');
  teamYSocket.emit('team:select', { teamId: list.teams[1].id });
  await Promise.all([claimedY, adminClaimY]);
});

test("un equip espectador NO rep session:full-state quan un ALTRE equip es desconnecta (anti-parpelleig)", async () => {
  // Deixa assentar qualsevol full-state en vol del setup (teamY rep la seva
  // propia copia dels broadcasts de claim via 'session', com passa a la vida
  // real) abans d'attachar el comptador — mateixa cautela de drenatge que la
  // resta de tests d'integracio Socket.io.
  await wait(150);

  let teamYGotState = false;
  const spy = () => {
    teamYGotState = true;
  };
  teamYSocket.on('session:full-state', spy);
  const adminGotState = once(adminSocket, 'session:full-state');

  teamXSocket.close();

  // L'admin SÍ ha de rebre l'actualitzacio de connexio (desconnexio real, cap
  // socket viu de teamX): confirma que el broadcast segueix funcionant per a qui
  // el necessita.
  const state = await adminGotState;
  const tx = state.teams.find((t) => t.id === teamXId);
  assert.equal(tx.connected, false, "l'admin ha de veure teamX desconnectat");

  // ...pero l'equip espectador (teamY) NO ha de rebre cap re-render: abans del fix
  // aquest full-state arribava a tota la room 'session' i re-renderitzava teamY
  // (parpelleig creuat) i clobberava edicions a mig fer.
  await wait(200);
  teamYSocket.off('session:full-state', spy);
  assert.equal(teamYGotState, false, "teamY (espectador) mai ha de rebre full-state per la desconnexio d'un altre equip");
});

test("disconnect diferit d'un socket vell NO marca l'equip offline si encara te un socket viu (guard de solapament post-F5)", async () => {
  // Simula l'F5: obre un socket NOU per teamX (mateix token) mentre el "vell"
  // encara existira breument, despres tanca el vell. El guard de room-size ha de
  // fer que el disconnect del vell sigui un no-op perque el nou ja es viu.
  const oldSock = ioClient(baseUrl, { auth: { token: teamXToken }, forceNew: true, transports: ['websocket'] });
  await once(oldSock, 'session:full-state');

  const newSock = ioClient(baseUrl, { auth: { token: teamXToken }, forceNew: true, transports: ['websocket'] });
  await once(newSock, 'session:full-state');

  // Cap dels dos sockets de teamX ni l'admin no haurien de rebre un
  // connected:false quan es tanca el vell (guard actiu).
  let sawOffline = false;
  const offlineWatcher = (state) => {
    const tx = state.teams.find((t) => t.id === teamXId);
    if (tx && tx.connected === false) sawOffline = true;
  };
  adminSocket.on('session:full-state', offlineWatcher);

  oldSock.close();
  await wait(300);
  adminSocket.off('session:full-state', offlineWatcher);

  assert.equal(sawOffline, false, 'amb un socket viu, el disconnect del vell no ha de marcar teamX offline');

  // Confirma l'estat autoritatiu: un admin fresc ha de veure teamX connectat.
  const admin2 = connectAndAwait({ role: 'admin' }, 'session:full-state');
  const state = await admin2.ready;
  const tx = state.teams.find((t) => t.id === teamXId);
  assert.equal(tx.connected, true, "teamX ha de continuar connected:true (el socket nou el mante viu)");

  admin2.socket.close();
  newSock.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamYSocket?.close();
});
