---
created: 2026-07-07T00:00:00.000Z
title: Endurir deploy/deploy.sh i src/server/index.js abans del proper desplegament real
area: deployment
files:
  - deploy/deploy.sh
  - src/server/index.js
  - deploy/DEPLOY.md
---

## Problem

La revisió de codi de la Fase 05 (`.planning/phases/05-desplegament-a-producci-vps-nginx-pm2/05-REVIEW.md`)
va trobar 1 crític i 4 warnings sobre el script de desplegament i l'arrencada del
servidor. No bloquegen el desplegament ja fet (el primer desplegament real ha
funcionat i està verificat), però **s'han d'arreglar abans d'executar
`deploy/deploy.sh` una altra vegada** contra producció.

## Solution

Veure el detall complet i els fixos suggerits a `05-REVIEW.md`. Resum:

1. **CR-01 (crític)** — `deploy/deploy.sh:36-40`: `npm run build` buida `dist/`
   abans que el build nou acabi (`emptyOutDir: true` de Vite), mentre PM2 encara
   serveix aquest mateix directori. Si el build falla, l'app queda trencada sense
   rollback. Fix suggerit: build a un directori temporal + swap atòmic (`mv`), o
   `emptyOutDir: false` + build a `dist.new` + intercanvi.
2. **WR-01** — `src/server/index.js:48-52`: falta `.catch()` a `startServer().then()`
   de l'entrypoint directe/dev (el wrapper PM2 `server.cjs` ja ho gestiona bé).
3. **WR-02** — `src/server/index.js:10`: `PORT` cau silenciosament a `3000` sense
   avís, a diferència del patró d'`ADMIN_SECRET`. Afegir `console.warn` equivalent.
4. **WR-03** — `deploy/deploy.sh`: no hi ha cap comprovació prèvia que `.env`/
   `ADMIN_SECRET` existeixi abans de desplegar. Afegir guard fail-fast.
5. **WR-04** — `deploy/DEPLOY.md:127-129`: diu que `ADMIN_SECRET` és "obligatori"
   però el codi falla obert (avisa i continua). Cal o bé re-redactar el runbook per
   reflectir el comportament real, o bé fer que el codi falli tancat en producció.

Informatius (IN-01/02/03, prioritat baixa): sense lock de concurrència a
`deploy.sh`, falta recordatori de reverificar WS en desplegaments subsegüents,
`git pull` sense comprovació de branca/HEAD.
