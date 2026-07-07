import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { EVENTS } from './events.js';
import { gameState } from './gameState.js';

export function startServer(port = process.env.PORT || 3000) {
  const app = express();
  app.use(express.static('dist'));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    // WebSocket-only: sense fallback a long-polling (must-have CORE-01, robustesa rere Nginx).
    transports: ['websocket'],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  registerSocketHandlers(io);

  // D-11: internal server bookkeeping only — polls for the timer's
  // zero-crossing every 1s and freezes it (never advances phase). This is
  // NOT a per-client tick: it only broadcasts when checkExpiry() reports an
  // actual state change (01-RESEARCH.md Anti-Patterns — no per-second
  // broadcast to clients).
  const expiryInterval = setInterval(() => {
    if (gameState.checkExpiry()) {
      io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
    }
  }, 1000);
  httpServer.once('close', () => clearInterval(expiryInterval));

  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, () => {
      const address = httpServer.address();
      resolve({ httpServer, io, port: address.port });
    });
  });
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  if (!process.env.PORT) {
    // eslint-disable-next-line no-console
    console.warn(
      '[index.js] PORT not set — defaulting to 3000. ' +
        'In production it MUST match the Nginx reverse-proxy target (see deploy/DEPLOY.md secció 5).',
    );
  }
  startServer()
    .then(({ port }) => {
      // eslint-disable-next-line no-console
      console.log(`CodeArena server listening on http://localhost:${port}`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[index.js] failed to start server:', err);
      process.exit(1);
    });
}
