// Integration test: exercises the real server's authoritative "Fase anterior"
// control (D-01/D-02/D-03, T-04.1-01/02) mirroring test/timer.test.js's
// fixture/ordering conventions. previousPhase()/D-02/D-03 model-level
// assertions call gameState directly (same pattern as test/results.test.js —
// same-process singleton, no extra socket round-trip needed); the admin-only
// enforcement of the ADMIN_PREV_PHASE handler is exercised over a real
// socket.io-client connection (mirrors timer.test.js Test F).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';
import { gameState } from '../src/server/gameState.js';
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

// Register listeners in the same synchronous tick before any `await` yields, so
// the server's first synchronous emit is never missed.
function connectAndAwait(auth, firstEvent) {
  const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'] });
  const ready = Promise.all([once(socket, 'connect'), once(socket, firstEvent)]).then(
    ([, payload]) => payload,
  );
  return { socket, ready };
}

let adminSocket;
let teamClient1;
let team1Id;

test('setup: registra equips i un equip tria', async () => {
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

  const claimed1 = once(teamClient1, EVENTS.TEAM_CLAIMED);
  teamClient1.emit(EVENTS.TEAM_SELECT, { teamId: team1Id });
  await claimed1;

  // Drain the SESSION_FULL_STATE that TEAM_SELECT's handler broadcasts to 'session'
  // right after claiming (no listener attached for it above) — without this wait, the
  // remaining tests below make several *synchronous* gameState calls with no `await` in
  // between, which never yields the event loop back to process that already-in-flight
  // packet; it would otherwise surface later as a stray/misleading event once the first
  // real `await` (a socket-based test) finally lets the event loop catch up.
  await wait(50);
});

test('PREV-NOOP-HTML: previousPhase a HTML retorna false i no muta res (Pitfall 5)', () => {
  assert.equal(gameState.startPhase('html', 60000), true);
  const before = gameState.getPublicState();
  assert.equal(gameState.previousPhase(60000), false, 'a HTML, previousPhase ha de ser no-op');
  const after = gameState.getPublicState();
  assert.equal(after.phase, 'html');
  assert.equal(after.phaseEndsAt, before.phaseEndsAt, 'no ha de tocar el timer en el no-op');
});

test('PREV-TIMER-NOU: previousPhase de css a html reinicia el timer (D-02)', () => {
  assert.equal(gameState.nextPhase(60000), true); // html -> css
  assert.equal(gameState.getPublicState().phase, 'css');

  const beforePrev = Date.now();
  assert.equal(gameState.previousPhase(45000), true);
  const state = gameState.getPublicState();
  assert.equal(state.phase, 'html');
  assert.equal(state.timerStatus, 'running');
  assert.equal(state.remainingMsAtPause, null, 'D-02: timer nou, mai recupera pausa anterior');
  assert.ok(
    Math.abs(state.phaseEndsAt - (beforePrev + 45000)) < 1000,
    'phaseEndsAt ha de ser ~45000ms al futur (timer nou), no un valor recuperat',
  );
});

test('PREV-DONEAT-PRESERVAT: previousPhase de js a css NO reinicia doneAt.css (D-03)', () => {
  assert.equal(gameState.nextPhase(60000), true); // html -> css
  assert.equal(gameState.getPublicState().phase, 'css');
  assert.equal(gameState.markPhaseDone(team1Id, 'css'), true, "l'equip marca Finalitzar a CSS");
  const doneAtBefore = gameState.getTeamDoneState(team1Id).doneAt.css;
  assert.ok(doneAtBefore, 'doneAt.css ha de quedar fixat');

  assert.equal(gameState.nextPhase(60000), true); // css -> js
  assert.equal(gameState.getPublicState().phase, 'js');

  assert.equal(gameState.previousPhase(60000), true); // js -> css
  assert.equal(gameState.getPublicState().phase, 'css');

  const doneAtAfter = gameState.getTeamDoneState(team1Id).doneAt.css;
  assert.equal(
    doneAtAfter,
    doneAtBefore,
    "D-03: doneAt.css NO s'ha de reiniciar en retrocedir de fase — l'equip continua congelat",
  );
  assert.equal(
    gameState.setCssValue(team1Id, 'antena-bg', '#123456'),
    false,
    "D-03: l'equip continua congelat (doneAt.css fixat) fins i tot despres de retrocedir",
  );
});

test('PREV-ADMIN-ONLY: un socket no-admin no pot fer retrocedir la fase (T-04.1-01)', async () => {
  assert.equal(gameState.getPublicState().phase, 'css'); // precondicio del test anterior

  let unauthorizedBroadcast = null;
  teamClient1.once(EVENTS.SESSION_FULL_STATE, (state) => {
    unauthorizedBroadcast = state;
  });
  teamClient1.emit(EVENTS.ADMIN_PREV_PHASE, { durationMs: 60000 });
  await wait(300);
  assert.equal(unauthorizedBroadcast, null, 'un socket no-admin no pot mutar la fase via ADMIN_PREV_PHASE');
  assert.equal(gameState.getPublicState().phase, 'css', 'la fase no ha davançat/retrocedit');
});

test('PREV-ADMIN-OK: un admin fa retrocedir la fase via el socket i totes les pantalles ho reben (D-02)', async () => {
  const prevPromise = once(teamClient1, EVENTS.SESSION_FULL_STATE);
  const beforeEmit = Date.now();
  adminSocket.emit(EVENTS.ADMIN_PREV_PHASE, { durationMs: 30000 });
  const state = await prevPromise;
  assert.equal(state.phase, 'html');
  assert.equal(state.timerStatus, 'running');
  assert.equal(state.remainingMsAtPause, null);
  assert.ok(Math.abs(state.phaseEndsAt - (beforeEmit + 30000)) < 1000);
});

test('PREV-INVALID-DURATION: un durationMs invalid no muta ni difon (V5, T-04.1-02)', async () => {
  let sawBroadcast = false;
  teamClient1.once(EVENTS.SESSION_FULL_STATE, () => {
    sawBroadcast = true;
  });
  const phaseBefore = gameState.getPublicState().phase;
  adminSocket.emit(EVENTS.ADMIN_PREV_PHASE, { durationMs: -5 });
  await wait(300);
  assert.equal(sawBroadcast, false, 'durationMs invalid no ha de produir cap broadcast');
  assert.equal(gameState.getPublicState().phase, phaseBefore);
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
});
