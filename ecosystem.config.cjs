// PM2 process config — extensió .cjs OBLIGATÒRIA (package.json té "type": "module";
// un .js seria tractat com ESM i PM2 fallaria amb ERR_REQUIRE_ESM).
// autorestart:true és el que permet que el Reset del servidor (Plan 03, D-04/D-06)
// funcioni: el handler fa process.exit(0) i PM2 reviu el procés net, tant en dev com en prod.
module.exports = {
  apps: [
    {
      name: 'codearena',
      script: 'src/server/index.js',
      autorestart: true,
      min_uptime: '5s',
      max_restarts: 30,
      env: {
        PORT: 3000,
      },
    },
  ],
};
