// Test d'integració: exercita el servidor real (Express + Socket.io) sobre un port
// efímer, amb socket.io-client — sense mocks. Copia el harness race-safe de
// cssPhase.test.js (startServer(0), once/onceOrTimeout/connectAndAwait, round-trip
// ordenat). Cobreix la finalització de la partida (ADMIN-07, D-10, SCORE-05):
//   - NON-ADMIN-REJECT: un socket no-admin que emet admin:finalize-game NO finalitza
//                       ni difon res (V4/T-04-01).
//   - FINALIZE-ROUNDTRIP + D-10: admin emet ADMIN_FINALIZE_GAME; cada equip rep
//                       CEREMONY_START amb {ranking (tots, {id,name,globalPct}),
//                       ownDetail (NOMÉS els seus sub-checks)}; l'admin rep ranking
//                       sense ownDetail.
//   - IDEMPOTENT: un segon ADMIN_FINALIZE_GAME no re-emet (finalizeGame → false).
//   - F5-RECOVERY: reconnectar amb el token després de finalitzar rep GAME_RESULTS
//                  amb ranking + ownDetail, sense dependre del broadcast original
//                  (CORE-03, Pitfall 4).
//
// Event names s'importen d'src/server/events.js — cap literal d'event-name al test.
// Aquests casos FALLEN abans d'implementar el handler de finalització (RED).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';
import { EVENTS } from '../src/server/events.js';
import { SLOTS } from '../src/shared/robotTemplate.js';

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

test('NON-ADMIN-REJECT: un equip que emet admin:finalize-game no finalitza ni difon (V4)', async () => {
  const c1 = onceOrTimeout(teamClient1, EVENTS.CEREMONY_START, 300);
  const c2 = onceOrTimeout(teamClient2, EVENTS.CEREMONY_START, 300);
  teamClient1.emit(EVENTS.ADMIN_FINALIZE_GAME);
  const [p1, p2] = await Promise.all([c1, c2]);
  assert.equal(p1, undefined, 'un no-admin no pot disparar la cerimònia');
  assert.equal(p2, undefined, 'cap equip rep res d\'un finalize forjat');
});

test('FINALIZE-ROUNDTRIP + D-10: cada equip rep ranking global + ownDetail propi', async () => {
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

  // D-10: ownDetail present i NOMÉS del propi equip (mai sub-checks d'un altre).
  assert.ok(p1.ownDetail, 'team1 rep el seu ownDetail');
  assert.ok(p1.ownDetail.html && p1.ownDetail.css && p1.ownDetail.js, 'ownDetail agrupat per fase');
  assert.ok(Array.isArray(p1.ownDetail.html.subchecks), 'ownDetail duu sub-checks per fase');
  // El payload de team1 no ha de contenir el detall de team2 enlloc.
  assert.ok(!JSON.stringify(p1.ranking).includes('subchecks'), 'el ranking difós no filtra sub-checks');

  // L'admin rep ranking però CAP ownDetail (D-10).
  assert.ok(Array.isArray(pa.ranking));
  assert.equal(pa.ownDetail, undefined, 'l\'admin no rep detall privat de cap equip');
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
  assert.ok(results.ownDetail && results.ownDetail.html, 'ownDetail propi recuperat a F5');
  assert.equal(results.ranking[0].id, team1Id, 'ranking final congelat manté l\'ordre');
  reconnect.socket.close();
});

test('cleanup: tanca sockets restants', () => {
  adminSocket?.close();
  teamClient1?.close();
  teamClient2?.close();
});
