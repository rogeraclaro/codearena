---
phase: 05-desplegament-a-producci-vps-nginx-pm2
plan: 01
subsystem: deployment
tags: [dotenv, pm2, config, env, deploy-script]
status: complete
requires: []
provides:
  - "dotenv carregat a l'arrencada (import 'dotenv/config' primer import de index.js)"
  - "PORT de font única via .env (cap font pre-estableix process.env.PORT)"
  - ".env ignorat per git (ADMIN_SECRET protegit)"
  - "deploy/deploy.sh executable amb els 4 passos de D-11"
affects:
  - src/server/index.js
  - ecosystem.config.cjs
tech_stack:
  added:
    - "dotenv 17.4.2 (fixat exacte)"
  patterns:
    - "Config des de .env via dotenv/config com a primer import ESM"
    - "PORT de font única: .env manana, res hardcoded a ecosystem env"
key_files:
  created:
    - deploy/deploy.sh
  modified:
    - package.json
    - package-lock.json
    - src/server/index.js
    - ecosystem.config.cjs
    - .gitignore
    - .env.example
decisions:
  - "D-09: import 'dotenv/config' a index.js (entrypoint compartit), NO a server.cjs (CJS, import ESM estàtic il·legal)"
  - "D-05/D-10: eliminada la clau PORT de ecosystem.config.cjs env perquè .env sigui l'única font (override:false de dotenv perdria davant valor hardcoded)"
  - "cwd: __dirname afegit a l'app PM2 perquè dotenv resolgui .env des de l'arrel del repo (Pitfall 4)"
  - "D-11: deploy.sh usa pm2 reload (no restart), a prova de futur per cluster mode; primer boot documentat via pm2 start+save+startup"
metrics:
  duration_min: 2
  completed: "2026-07-06"
  tasks: 3
  files: 7
requirements: [DEPL-01, DEPL-02]
---

# Phase 05 Plan 01: Producció-ready (dotenv + PORT font única + deploy script) Summary

Deixa CodeArena llest per a producció a nivell de codi i configuració sense tocar el VPS: `dotenv` 17.4.2 cablejat com a primer import de l'entrypoint, `PORT` amb `.env` com a única font, `ADMIN_SECRET` protegit de git, i un `deploy/deploy.sh` repetible amb els 4 passos de D-11.

## What Was Built

### Task 1 — dotenv a l'arrencada (D-09) · commit 30aab33
- `npm install dotenv@17.4.2` (fixat exacte, sense prefix de rang; package-lock.json sincronitzat per a `npm ci`).
- `import 'dotenv/config';` afegit com a PRIMERA línia de `src/server/index.js`, per sobre de l'import d'express. Exactament una línia afegida — `transports`, `connectionStateRecovery` i la signatura de `startServer` intactes (scope discipline).
- El timing és segur: PORT/ADMIN_SECRET es llegeixen a temps de crida, després que el graf d'imports ESM (inclòs dotenv) s'hagi executat. Cobreix el camí PM2 (server.cjs → import dinàmic d'index.js) i el directe (npm start).

### Task 2 — PORT font única + higiene del secret (D-05/D-10, Pitfall 1/2) · commit 9188a4e
- `ecosystem.config.cjs`: eliminada la clau `PORT` del bloc `env` (abans fixava 3000). Res pre-estableix `process.env.PORT`, així el `override:false` per defecte de dotenv no perd el 8011 de `.env`. Afegit `cwd: __dirname` (Pitfall 4). Conservats `name`, `script`, `autorestart`, `min_uptime`, `max_restarts` i la capçalera de comentaris.
- `.gitignore`: afegida l'entrada `.env` (tanca T-05-01 / T-04.1-05 abans de crear cap `.env` al VPS). `.env.example` segueix traçat.
- `.env.example`: substituïda la nota obsoleta «no dotenv» per l'explicació que dotenv carrega el fitxer a l'arrencada; documenta `PORT=8011` per a producció (destí del reverse proxy CloudPanel/Nginx) i `ADMIN_SECRET` com a obligatori.

### Task 3 — deploy script versionat (D-11) · commit c05587e
- `deploy/deploy.sh` nou i executable: shebang `#!/usr/bin/env bash`, `set -euo pipefail`, `cd "$(dirname "$0")/.."` a l'arrel del repo (load-bearing per al cwd de dotenv/PM2).
- 4 passos de D-11 en ordre: `git pull` → `npm ci` → `npm run build` → `pm2 reload codearena` (reload, no restart, per a cluster mode futur).
- Documentat que el primer boot en un VPS net usa `npm run server:pm2` + `pm2 save` + `pm2 startup`.

## Deviations from Plan

Cap desviació funcional. Nota menor: `npm install` va escriure `"dotenv": "^17.4.2"` (prefix de rang) a package.json; es va corregir a `"17.4.2"` (fixat exacte) i es va re-sincronitzar el lockfile per complir la convenció de versions del projecte i el criteri d'acceptació. No és una desviació de disseny.

## Threat Mitigations Applied

- **T-05-01 / T-04.1-05** (Information Disclosure): `.env` a `.gitignore` — `ADMIN_SECRET` no es podrà cometre mai.
- **T-05-04** (DoS / precedència de PORT): PORT eliminat de ecosystem env; `.env` font única.
- **T-05-SC** (Supply chain): dotenv 17.4.2 instal·lat directe (veredicte de legitimitat OK a RESEARCH: ~137M/setmana, sense postinstall, no deprecated).

## Verification

- `head -1 src/server/index.js` → `import 'dotenv/config';` ✓
- `require('./ecosystem.config.cjs').apps[0].env` → `{}` (sense PORT) ✓
- `.gitignore` ignora `.env`, no ignora `.env.example` ✓
- `bash -n deploy/deploy.sh` passa; conté els 4 passos de D-11 en ordre; `test -x` ✓
- `node --check src/server/index.js` passa ✓

## Notes for Next Plan (05-02)

- `PORT=8011` és el contracte amb el reverse proxy — el Pla 02 (infra VPS) ha de fer coincidir el destí de CloudPanel/Nginx amb 8011.
- Primer desplegament: `npm run server:pm2` + `pm2 save` + `pm2 startup` (documentat a deploy.sh); a partir del segon, `deploy/deploy.sh`.
- Cal crear `.env` al VPS amb un `ADMIN_SECRET` fort i `PORT=8011` (mai comès).

## Self-Check: PASSED

Tots els fitxers creats/modificats existeixen (7/7) i els 3 commits de tasca són a l'historial (30aab33, 9188a4e, c05587e).
