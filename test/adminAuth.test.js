// Regression test for CR-01: the admin role must be backed by a real
// server-verified shared secret, not just a client-declared handshake flag.
//
// This suite sets ADMIN_SECRET *before* startServer so the connection
// middleware enforces it (fail-closed). node --test runs each test file in its
// own process, so this env var never leaks into the other suites (which connect
// as admin without a secret and rely on the dev-mode fallback).
//
//   AUTH-OK:      role:'admin' + correct secret  -> granted (session:full-state).
//   AUTH-WRONG:   role:'admin' + wrong secret    -> rejected (connect_error).
//   AUTH-MISSING: role:'admin' + no secret       -> rejected (connect_error).

process.env.ADMIN_SECRET = 'test-secret-123';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { startServer } from '../src/server/index.js';

let httpServer;
let baseUrl;

before(async () => {
  const started = await startServer(0); // ephemeral port
  httpServer = started.httpServer;
  baseUrl = `http://localhost:${started.port}`;
});

after(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
});

// Resolves { ok, socket } — ok:true if the socket connects and receives the
// admin-only session:full-state, ok:false (with reason) on connect_error.
function tryAdminConnect(auth, ms = 1500) {
  return new Promise((resolve) => {
    const socket = ioClient(baseUrl, { auth, forceNew: true, transports: ['websocket'], reconnection: false });
    const timer = setTimeout(() => resolve({ ok: false, reason: 'timeout', socket }), ms);
    socket.on('session:full-state', () => {
      clearTimeout(timer);
      resolve({ ok: true, socket });
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, reason: err?.message, socket });
    });
  });
}

test('AUTH-OK: role admin with the correct secret is granted admin access', async () => {
  const result = await tryAdminConnect({ role: 'admin', adminSecret: 'test-secret-123' });
  assert.equal(result.ok, true, 'el secret correcte ha de concedir accés admin (session:full-state)');
  result.socket.close();
});

test('AUTH-WRONG: role admin with a wrong secret is rejected', async () => {
  const result = await tryAdminConnect({ role: 'admin', adminSecret: 'nope' });
  assert.equal(result.ok, false, 'un secret incorrecte no ha de concedir accés admin');
  assert.equal(result.reason, 'unauthorized', 'el middleware ha de rebutjar amb "unauthorized"');
  result.socket.close();
});

test('AUTH-MISSING: role admin with no secret is rejected when a secret is configured', async () => {
  const result = await tryAdminConnect({ role: 'admin' });
  assert.equal(result.ok, false, 'declarar role admin sense secret no ha de concedir accés');
  assert.equal(result.reason, 'unauthorized', 'el middleware ha de rebutjar amb "unauthorized"');
  result.socket.close();
});
