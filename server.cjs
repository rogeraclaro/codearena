// Fallback CJS launcher per a PM2 (obertura A1 de 04.1-RESEARCH.md, Pitfall 1).
//
// Causa real trobada al checkpoint de boot (Task 3, 04.1-02-PLAN.md): PM2 en
// fork mode NO llança `ERR_REQUIRE_ESM` (com anticipava la recerca), sinó que
// reescriu `process.argv[1]` al seu propi wrapper intern
// (`.../pm2/lib/ProcessContainerFork.js`). Això trenca en silenci el guard
// `isMainModule` de src/server/index.js (`process.argv[1] ===
// fileURLToPath(import.meta.url)`), que mai és cert sota PM2 — el procés queda
// "online" a `pm2 status` pero `startServer()` NO s'executa mai i el port mai
// escolta (cap error, cap log). Aquest launcher evita el guard del tot:
// importa el mòdul dinàmicament i crida `startServer()` explícitament.
import('./src/server/index.js')
  .then(({ startServer }) => startServer())
  .then(({ port }) => {
    // eslint-disable-next-line no-console
    console.log(`CodeArena server listening on http://localhost:${port} (via PM2/server.cjs)`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[server.cjs] failed to start:', err);
    process.exit(1);
  });
