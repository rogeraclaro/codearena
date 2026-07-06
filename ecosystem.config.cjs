// PM2 process config — extensió .cjs OBLIGATÒRIA (package.json té "type": "module";
// un .js seria tractat com ESM i PM2 fallaria amb ERR_REQUIRE_ESM).
// autorestart:true és el que permet que el Reset del servidor (Plan 03, D-04/D-06)
// funcioni: el handler fa process.exit(0) i PM2 reviu el procés net, tant en dev com en prod.
//
// script: 'server.cjs' (fallback documentat a 04.1-RESEARCH.md Pitfall 1) — NO
// s'apunta directament a src/server/index.js perquè el checkpoint de boot
// (Task 3, 04.1-02-PLAN.md) va descobrir que PM2 fork mode reescriu
// process.argv[1] al seu propi wrapper, trencant en silenci el guard
// `isMainModule` de index.js (el procés queda "online" pero mai escolta el
// port). server.cjs evita el guard important el mòdul i cridant startServer()
// explícitament. Vegeu server.cjs per als detalls.
module.exports = {
  apps: [
    {
      name: 'codearena',
      script: 'server.cjs',
      // cwd fixat a l'arrel del repo perquè dotenv resolgui .env des de
      // process.cwd() sigui quin sigui el directori des d'on s'arrenca PM2 (Pitfall 4).
      cwd: __dirname,
      autorestart: true,
      min_uptime: '5s',
      max_restarts: 30,
      // Sense clau PORT aquí: si PM2 pre-establís process.env.PORT, el
      // override:false per defecte de dotenv faria perdre el 8011 de .env
      // davant el valor hardcoded (Pitfall 1). .env és l'única font de PORT en prod.
    },
  ],
};
