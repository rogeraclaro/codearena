// Integration test: exercises the real server's authoritative timer/phase
// control (CORE-04, CORE-05, ADMIN-02/03/04, D-11/D-12) over a real
// ephemeral-port HTTP listener, using socket.io-client — no mocks.
// Mirrors test/roundtrip.test.js's fixture/ordering conventions.

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

// Shared fixtures across the ordered A-F round-trip (node:test runs tests in
// declaration order within a single file, per roundtrip.test.js convention).
let adminSocket;
let observerSocket; // unclaimed socket in 'session' room — observes admin broadcasts
let resumedAfterPause;

test('Test A: iniciar fase (CORE-04, ADMIN-02) — broadcast unic, sense tick per segon', async () => {
  const admin = connectAndAwait({ role: 'admin' }, 'session:full-state');
  adminSocket = admin.socket;
  await admin.ready; // emet inicial de connexio admin

  const observer = connectAndAwait({}, 'team:available-list');
  observerSocket = observer.socket;
  await observer.ready; // emet inicial de connexio no reclamada

  const broadcasts = [];
  const onState = (state) => broadcasts.push(state);
  observerSocket.on('session:full-state', onState);

  const beforeStart = Date.now();
  adminSocket.emit('admin:start-phase', { phase: 'html', durationMs: 60000 });

  // Espera prou perque el checkExpiry() de servidor (interval 1s) tingui
  // temps de disparar-se erroniament si hi hagues un bug de tick per segon.
  await wait(2100);
  observerSocket.off('session:full-state', onState);

  assert.equal(
    broadcasts.length,
    1,
    'nomes hi ha dhaver un broadcast per accio, sense tick per segon a clients',
  );
  const state = broadcasts[0];
  assert.equal(state.phase, 'html');
  assert.equal(state.timerStatus, 'running');
  assert.ok(
    Math.abs(state.phaseEndsAt - (beforeStart + 60000)) < 1500,
    `phaseEndsAt hauria de ser ~60000ms al futur, diferencia: ${state.phaseEndsAt - beforeStart}`,
  );
});

test('Test B: pausa i represa (ADMIN-03, D-12)', async () => {
  const pausePromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-pause');
  const paused = await pausePromise;
  assert.equal(paused.timerStatus, 'paused');
  assert.ok(paused.remainingMsAtPause > 0, 'remainingMsAtPause ha de ser positiu en pausar');
  assert.equal(paused.phaseEndsAt, null);

  const resumePromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-resume');
  resumedAfterPause = await resumePromise;
  assert.equal(resumedAfterPause.timerStatus, 'running');
  assert.ok(resumedAfterPause.phaseEndsAt > Date.now(), 'phaseEndsAt nou ha de ser futur en reprendre');
});

test('Test C: +1 minut en marxa i en pausa (ADMIN-04)', async () => {
  const beforeEndsAt = resumedAfterPause.phaseEndsAt;
  const extendRunningPromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-extend', { ms: 60000 });
  const extendedRunning = await extendRunningPromise;
  assert.equal(extendedRunning.timerStatus, 'running');
  assert.ok(
    Math.abs(extendedRunning.phaseEndsAt - (beforeEndsAt + 60000)) < 200,
    'phaseEndsAt ha daugmentar ~60000ms en marxa',
  );

  const pausePromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-pause');
  const paused = await pausePromise;
  const beforeRemaining = paused.remainingMsAtPause;

  const extendPausedPromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-extend', { ms: 60000 });
  const extendedPaused = await extendPausedPromise;
  assert.equal(extendedPaused.timerStatus, 'paused');
  assert.ok(
    Math.abs(extendedPaused.remainingMsAtPause - (beforeRemaining + 60000)) < 200,
    'remainingMsAtPause ha daugmentar ~60000ms en pausa',
  );
});

test('Test D: freeze a zero sense auto-avanç (D-11)', async () => {
  const startPromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:start-phase', { phase: 'html', durationMs: 200 });
  const started = await startPromise;
  assert.equal(started.timerStatus, 'running');
  assert.equal(started.phase, 'html');

  const frozenPromise = once(observerSocket, 'session:full-state');
  const frozen = await frozenPromise; // el setInterval de servidor detecta el zero-crossing i broadcasteja
  assert.equal(frozen.timerStatus, 'frozen');
  assert.equal(frozen.phase, 'html', 'D-11: el freeze mai avança de fase automaticament');
});

test('Test D-bis: +1 minut reviu una fase congelada (ADMIN-04, D-11 preservat)', async () => {
  // Precondició: Test D ha deixat la fase 'html' en estat 'frozen'.
  const revivePromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-extend', { ms: 60000 });
  const revived = await revivePromise;
  assert.equal(revived.timerStatus, 'running', 'frozen + extend ha de tornar a running');
  assert.equal(revived.phase, 'html', 'extend mai avança de fase (D-11)');
  assert.ok(
    Math.abs(revived.phaseEndsAt - (Date.now() + 60000)) < 500,
    'phaseEndsAt ha de reiniciar-se a ~ara+60000ms des del freeze',
  );

  // Repetible: una segona extensió en marxa continua allargant.
  const beforeEndsAt = revived.phaseEndsAt;
  const secondPromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:timer-extend', { ms: 60000 });
  const second = await secondPromise;
  assert.equal(second.timerStatus, 'running');
  assert.ok(
    Math.abs(second.phaseEndsAt - (beforeEndsAt + 60000)) < 200,
    'la segona extensió suma ~60000ms addicionals',
  );
});

test('Test E: avanç de fase en lockstep (CORE-05)', async () => {
  const toCssPromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:next-phase', { durationMs: 60000 });
  const cssState = await toCssPromise;
  assert.equal(cssState.phase, 'css');
  assert.equal(cssState.timerStatus, 'running');

  const toJsPromise = once(observerSocket, 'session:full-state');
  adminSocket.emit('admin:next-phase', { durationMs: 60000 });
  const jsState = await toJsPromise;
  assert.equal(jsState.phase, 'js');

  let extraBroadcast = null;
  observerSocket.once('session:full-state', (state) => {
    extraBroadcast = state;
  });
  adminSocket.emit('admin:next-phase', { durationMs: 60000 });
  await wait(300);
  assert.equal(
    extraBroadcast,
    null,
    "next-phase a la darrera fase no crea cap fase inexistent ni broadcasteja",
  );
});

test('Test F: autoritzacio — socket no-admin no pot mutar timer/fase', async () => {
  let unauthorizedBroadcast = null;
  observerSocket.once('session:full-state', (state) => {
    unauthorizedBroadcast = state;
  });

  observerSocket.emit('admin:start-phase', { phase: 'html', durationMs: 5000 });
  await wait(300);

  assert.equal(unauthorizedBroadcast, null, 'un socket no-admin no pot mutar el timer/fase');
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  observerSocket?.close();
});
