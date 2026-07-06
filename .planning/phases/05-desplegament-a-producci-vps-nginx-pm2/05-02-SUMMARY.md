---
phase: 05-desplegament-a-producci-vps-nginx-pm2
plan: 02
subsystem: deployment
tags: [runbook, cloudpanel, nginx, websocket, pm2, https, docs]
status: paused-at-checkpoint
requires:
  - "05-01: dotenv, PORT font única (.env), .env ignorat, deploy/deploy.sh"
provides:
  - "deploy/DEPLOY.md — runbook durador de desplegament al VPS (8+ seccions)"
affects:
  - deploy/DEPLOY.md
tech_stack:
  added: []
  patterns:
    - "Directives Nginx documentades al runbook (D-06), no versionades com a .conf"
key_files:
  created:
    - deploy/DEPLOY.md
  modified: []
decisions:
  - "D-06: les directives WebSocket viuen a deploy/DEPLOY.md (secció 3), no en cap .conf versionat — CloudPanel gestiona el vhost via UI"
  - "Runbook marca 3 directives com OBLIGATÒRIES (proxy_http_version 1.1, Upgrade, Connection) perquè l'app és websocket-only (transports:['websocket']) sense fallback a polling"
metrics:
  duration_min: 1
  completed: "2026-07-06"
  tasks: 1
  tasks_total: 3
  files: 1
requirements: [DEPL-01, DEPL-02]
---

# Phase 05 Plan 02: Desplegament a producció (VPS + Nginx + PM2) Summary

**PAUSAT EN CHECKPOINT.** Task 1 (runbook `deploy/DEPLOY.md`) completada i comesa.
Tasks 2 i 3 són checkpoints d'acció/verificació humana (gate="blocking") que
l'executor NO pot executar: requereixen SSH al VPS, la UI de CloudPanel, DNS i el
navegador de l'aula — cap accessible des de l'entorn de l'executor. El pla queda a
l'espera del senyal de represa humà.

## What Was Built

### Task 1 — Runbook de desplegament (deploy/DEPLOY.md) · commit ad1be06

Runbook durador de 10 seccions que el professor pot seguir pas a pas al VPS:

1. **Prerequisits** — DNS de `classe.masellas.info`, usuari no-root a
   `/home/<usuari>/codearena` (D-03), `node --version` LTS (A3), PM2 global sota
   l'usuari no-root.
2. **Site CloudPanel tipus «Reverse Proxy»** (D-04) — explícitament NO «Node.js»
   (evita el segon supervisor que xocaria amb PM2 del qual depèn el Reset de
   l'Admin), apuntant a `http://127.0.0.1:8011` (D-05).
3. **Directives WebSocket al Vhost Editor** (D-06) — bloc `location /` complet; les
   3 directives OBLIGATÒRIES (`proxy_http_version 1.1`, `Upgrade`, `Connection
   "upgrade"`) marcades com a load-bearing, amb l'avís que el generador «Reverse
   Proxy» pot no incloure-les (Pitfall 5, A2). Timeouts alts (3600s) i
   `proxy_buffering off` per D-06.
4. **HTTPS** — Let's Encrypt via CloudPanel un cop el DNS apunti (D-08), amb
   redirecció HTTP→HTTPS (mitiga T-05-03).
5. **`.env` de producció** — `ADMIN_SECRET` fort + `PORT=8011` (D-09/D-10), basat en
   `.env.example`, mai versionat (ja a `.gitignore` des del Pla 01).
6. **Primer desplegament vs. subsegüents** — primer cop: clone → `npm ci` →
   `npm run build` → `npm run server:pm2` → `pm2 save` + `pm2 startup`; després:
   `bash deploy/deploy.sh`.
7. **Verificació WebSocket real** (D-07) — Network tab, filtre WS, esperant `101
   Switching Protocols` i transport `websocket` (no polling).
8. **Tancament T-04.1-05** — `pm2 logs codearena` sense el warning d'`ADMIN_SECRET`.
9. **PM2 auto-restart** (DEPL-02) — kill forçat i confirmació de revifament.
10. **Sessió completa** (Success Criteria #3) — 4-6 equips, 3 fases, resultats, F5.

Inclou taula de referència ràpida de decisions (D-01…D-11).

### Task 2 — Provisió VPS + .env + primer deploy · CHECKPOINT (human-action, pendent)

No executable per l'executor (SSH + CloudPanel UI + DNS). Passos exactes al runbook
secció 2-6 i al checkpoint. Espera senyal "desplegat".

### Task 3 — Verificació WebSocket real + PM2 restart + sessió completa · CHECKPOINT (human-verify, pendent)

No executable per l'executor (navegador de l'aula + VPS). Passos al runbook seccions
7, 9, 10. Espera senyal "verificat".

## Deviations from Plan

Cap. La Task 1 s'ha executat exactament com estava escrita; les tasks 2 i 3 són
checkpoints humans per disseny del pla (infraestructura fora de l'abast de
l'executor).

## Threat Mitigations Applied (documentades al runbook, per aplicar al VPS)

- **T-05-05** (DoS / vhost sense directives d'upgrade): runbook secció 3 marca les 3
  directives com OBLIGATÒRIES + verificació `101` a la secció 7.
- **T-05-03** (transport sense xifrar): runbook secció 4, HTTPS + redirecció.
- **T-05-02 / T-04.1-05** (ADMIN_SECRET absent): runbook seccions 5 i 8.

## Verification

- `test -f deploy/DEPLOY.md` ✓
- `grep 'Reverse Proxy'` ✓ · `grep '8011'` ✓ · `grep 'proxy_http_version 1.1'` ✓ ·
  `grep 'Upgrade'` ✓ · `grep '101'` ✓ · `grep 'ADMIN_SECRET'` ✓ · `grep 'pm2'` ✓
- Verificació automàtica de la Task 1: **VERIFY PASS**

## Checkpoint Status

El pla està **pausat abans de la Task 2** (checkpoint:human-action, gate blocking).
Les verificacions actives contra producció (WebSocket `101`, PM2 restart, sessió
completa) NO estan fetes — depenen de l'acció humana al VPS. Per tant els Success
Criteria de la fase (DEPL-01 verificat, DEPL-02 verificat, sessió de cap a cap)
resten OBERTS fins que el professor completi els checkpoints i doni els senyals de
represa "desplegat" i "verificat".

## Self-Check: PASSED

Fitxer creat existeix (deploy/DEPLOY.md); el commit de la Task 1 (ad1be06) és a
l'historial.
