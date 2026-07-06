---
phase: 05-desplegament-a-producci-vps-nginx-pm2
plan: 02
subsystem: deployment
tags: [runbook, cloudpanel, nginx, websocket, pm2, https, docs, production]
status: complete
requires:
  - "05-01: dotenv, PORT font única (.env), .env ignorat, deploy/deploy.sh"
provides:
  - "deploy/DEPLOY.md — runbook durador de desplegament al VPS (10 seccions)"
  - "CodeArena viu i verificat a https://classe.masellas.info (WebSocket real, PM2, HTTPS)"
affects:
  - deploy/DEPLOY.md
tech_stack:
  added: []
  patterns:
    - "Directives Nginx documentades al runbook (D-06), no versionades com a .conf"
    - "Desplegament manual (SSH + CloudPanel UI), sense CI/CD (D-11)"
key_files:
  created:
    - deploy/DEPLOY.md
  modified: []
decisions:
  - "D-06: les directives WebSocket viuen a deploy/DEPLOY.md (secció 3), no en cap .conf versionat — CloudPanel gestiona el vhost via UI"
  - "Runbook marca 3 directives com OBLIGATÒRIES (proxy_http_version 1.1, Upgrade, Connection) perquè l'app és websocket-only (transports:['websocket']) sense fallback a polling"
  - "Deviació D-03: desplegat com a root a /root/codearena (l'accés SSH del VPS és només root) — risc acceptat per l'operador, documentat a DEPLOY.md"
  - "Deviació T-05-02: ADMIN_SECRET feble ('kkdelavaka') triat pel professor sobre secret fort recomanat — risc acceptat conscientment per a sessió curta de baix risc"
metrics:
  duration_min: 3
  completed: "2026-07-06"
  tasks: 3
  tasks_total: 3
  files: 1
requirements: [DEPL-01, DEPL-02]
---

# Phase 05 Plan 02: Desplegament a producció (VPS + Nginx + PM2) Summary

CodeArena desplegat i verificat a producció (`https://classe.masellas.info`) rere el
reverse proxy Nginx de CloudPanel, amb WebSocket real (`101 Switching Protocols`)
confirmat al navegador, PM2 supervisant i reviant el procés Node, HTTPS actiu, i el
warning d'`ADMIN_SECRET` tancat. Les 3 tasques del pla completes: runbook durador
(Task 1) + provisió i primer deploy al VPS (Task 2, acció humana) + verificació
activa dels tres Success Criteria contra producció (Task 3, verificació humana).

## What Was Built

### Task 1 — Runbook de desplegament (deploy/DEPLOY.md) · commits ad1be06, e0375f8

Runbook durador de 10 seccions que el professor pot seguir pas a pas al VPS:

1. **Prerequisits** — DNS de `classe.masellas.info`, ruta del repo al VPS,
   `node --version` LTS (A3), PM2 global.
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
5. **`.env` de producció** — `ADMIN_SECRET` + `PORT=8011` (D-09/D-10), basat en
   `.env.example`, mai versionat (ja a `.gitignore` des del Pla 01).
6. **Primer desplegament vs. subsegüents** — primer cop: clone → `npm ci` →
   `npm run build` → `npm run server:pm2` → `pm2 save` + `pm2 startup`; després:
   `bash deploy/deploy.sh`.
7. **Verificació WebSocket real** (D-07) — Network tab, filtre WS, esperant `101
   Switching Protocols` i transport `websocket` (no polling).
8. **Tancament T-04.1-05** — `pm2 logs codearena` sense el warning d'`ADMIN_SECRET`.
9. **PM2 auto-restart** (DEPL-02) — kill forçat i confirmació de revifament.
10. **Sessió completa** (Success Criteria #3) — 4-6 equips, 3 fases, resultats, F5.

Inclou taula de referència ràpida de decisions (D-01…D-11). El commit e0375f8 hi va
afegir la nota de deviació de D-03 (desplegament com a root) amb el risc acceptat
documentat en un callout a l'inici i a la taula de decisions.

### Task 2 — Provisió VPS + .env + primer deploy · CHECKPOINT (human-action) — COMPLETAT

El professor va completar la provisió manualment al VPS (accions exclusivament
humanes: SSH + CloudPanel UI + DNS, fora de l'abast de l'executor):

- **Node** actualitzat a v22.23.1 (el VPS tenia v18, incompatible amb Vite 7 —
  actualitzat via NodeSource).
- **PM2** 6.0.14 instal·lat.
- **Repo** clonat a `/root/codearena` (corregit un clon inicial en directori niat).
- **`.env`** creat amb `PORT=8011` i `ADMIN_SECRET=kkdelavaka` (secret feble triat
  pel professor — veure deviació més avall).
- **Site CloudPanel** creat com a Reverse Proxy → `127.0.0.1:8011`; el vhost ja
  portava per defecte les 3 directives d'upgrade WebSocket (proxy_http_version 1.1,
  Upgrade, Connection) via la plantilla de CloudPanel — no calia canviar res.
- **HTTPS** emès (Let's Encrypt).
- **Primer deploy** fet: `npm ci`, `npm run build`, `npm run server:pm2`, `pm2 save`,
  `pm2 startup`. Confirmat via `pm2 logs codearena` mostrant «listening on ...:8011»
  SENSE warning d'`ADMIN_SECRET`.

### Task 3 — Verificació WebSocket real + PM2 restart + sessió completa · CHECKPOINT (human-verify) — COMPLETAT

Les tres verificacions actives contra producció, executades pel professor:

1. **WebSocket real (DEPL-01 / D-07):** confirmat a DevTools → Network → filtre WS —
   `wss://classe.masellas.info/socket.io/?EIO=4&transport=websocket` va retornar
   `101 Switching Protocols`. **PASSAT.**
2. **PM2 auto-restart (DEPL-02):** confirmat via `pm2 sendSignal SIGKILL codearena`
   seguit de `pm2 status` mostrant el procés de nou `online` amb el comptador de
   restarts incrementat. **PASSAT.**
3. **Sessió completa de cap a cap (Success Criteria #3):** registre d'equips, 3
   fases i resultats van funcionar. **PASSAT** amb un caveat conegut i no bloquejant
   detectat durant el test d'F5 (veure «Known Issues» més avall).

## Deviations from Plan

### Deviacions d'infraestructura acceptades per l'operador

**1. [D-03 deviat] Desplegament com a `root` a `/root/codearena`**
- **On:** Task 2 (provisió VPS).
- **Pla original:** usuari no-root dedicat a `/home/<usuari>/codearena`.
- **Realitat:** l'únic accés SSH disponible al VPS és com a `root`, així que el codi
  es desplega directament sota `root`. Decisió conscient de l'operador, no un
  descuit.
- **Risc acceptat:** el procés Node (únic component exposat via el reverse proxy)
  corre amb privilegis totals; un compromís remot tindria abast de root sobre tot el
  VPS. Acceptable per l'escala i durada de la microclasse (sessions curtes, sense
  dades sensibles).
- **Documentat a:** `deploy/DEPLOY.md` (callout a l'inici + taula de decisions).
- **Commit:** e0375f8.

**2. [T-05-02 risc acceptat] `ADMIN_SECRET` feble ('kkdelavaka')**
- **On:** Task 2 (creació del `.env` de producció).
- **Pla original / recomanació:** `ADMIN_SECRET` fort i únic (p.ex.
  `openssl rand -hex 32`).
- **Realitat:** el professor va triar explícitament un secret simple/feble
  ('kkdelavaka') després que se li flagués el tradeoff. Decisió final de l'usuari,
  no re-litigada.
- **Risc acceptat:** un secret feble redueix la barrera per reclamar el rol admin,
  però la mitigació clau de T-05-02 (que `ADMIN_SECRET` estigui *definit* perquè
  l'auth admin NO quedi deshabilitada) es compleix igualment — `pm2 logs` no mostra
  el warning. Risc de baix impacte per a una sessió curta d'aula.

Aquestes dues deviacions no van requerir canvis de codi ni del pla: són decisions
operatives del propietari/professor sobre la configuració del VPS.

## Known Issues (no bloquejants, seguits per separat)

**Parpelleig creuat i desincronització del panell en reconnexió (F5)**

Durant el test d'F5 de la Task 3, el professor va detectar que quan un equip fa F5,
la pantalla de l'altre equip també parpelleja, i el darrer valor editat de l'equip
que recarrega de vegades no es mostra bé fins a tornar-hi a interactuar.

- **Causa arrel (hipòtesi):** `socketHandlers.js` difon `session:full-state` a tota
  la room `'session'` en cada connect/disconnect individual d'un equip, i
  `client.js` re-renderitza tota la pantalla per a qualsevol client que ho rebi.
- **Abast:** és **lògica de joc de fases anteriors (03/04/04.1)**, NO res que la
  Fase 05 hagi introduït (la Fase 05 només toca fitxers de desplegament/config). Ha
  sortit ara per primer cop amb latència de xarxa real.
- **Decisió del professor:** tancar la Fase 05 ara; el bug es tracta per separat i
  NO bloqueja el sign-off del desplegament, perquè els criteris d'acceptació
  específics de desplegament (upgrade WebSocket, PM2 revive, HTTPS, tancament
  d'`ADMIN_SECRET`) van passar tots netament.
- **Seguit a:** `.planning/todos/pending/2026-07-07-parpelleig-i-desincronitzacio-panell-en-reconnexio-f5.md`
  (a resoldre amb `/gsd-debug` en una sessió dedicada).

## Threat Mitigations Applied

- **T-05-05** (DoS / vhost sense directives d'upgrade): les 3 directives OBLIGATÒRIES
  ja hi eren per defecte al vhost de CloudPanel; verificat via `101 Switching
  Protocols` al Network tab (Task 3). **MITIGAT.**
- **T-05-03** (transport sense xifrar): HTTPS Let's Encrypt actiu + redirecció
  HTTP→HTTPS (Task 2). **MITIGAT.**
- **T-05-02 / T-04.1-05** (ADMIN_SECRET absent → auth admin deshabilitada):
  `ADMIN_SECRET` definit al `.env`; `pm2 logs codearena` NO mostra el warning
  (Task 2/3). **MITIGAT** (amb la salvetat del secret feble, veure deviació 2).

## Verification

- `test -f deploy/DEPLOY.md` ✓
- `grep 'Reverse Proxy'` ✓ · `grep '8011'` ✓ · `grep 'proxy_http_version 1.1'` ✓ ·
  `grep 'Upgrade'` ✓ · `grep '101'` ✓ · `grep 'ADMIN_SECRET'` ✓ · `grep 'pm2'` ✓
- WebSocket real: `101 Switching Protocols`, transport `websocket` (DevTools) ✓ — DEPL-01
- PM2 auto-restart: procés reviu a «online» després de SIGKILL (`pm2 status`) ✓ — DEPL-02
- Sessió completa registre → 3 fases → resultats contra producció ✓ — Success Criteria #3
- `pm2 logs codearena` sense warning d'`ADMIN_SECRET` ✓ — tancament T-04.1-05

Els quatre Success Criteria de la fase queden TANCATS.

## Self-Check: PASSED

- `deploy/DEPLOY.md` existeix al repo ✓
- Commits de la Task 1 (ad1be06) i la deviació D-03 (e0375f8) són a l'historial ✓
- Les Tasks 2 i 3 (infraestructura/verificació humana) confirmades pel professor
  directament contra producció — no re-verificades per l'executor per disseny.
