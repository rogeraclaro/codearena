import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';

export function startServer(port = process.env.PORT || 3000) {
  const app = express();
  app.use(express.static('dist'));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  registerSocketHandlers(io);

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
  startServer().then(({ port }) => {
    // eslint-disable-next-line no-console
    console.log(`CodeArena server listening on http://localhost:${port}`);
  });
}
