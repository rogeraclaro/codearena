# Phase 5: Desplegament a producció (VPS + Nginx + PM2) - Research

**Researched:** 2026-07-06
**Domain:** Deployment / ops — CloudPanel reverse proxy, Nginx WebSocket upgrade, PM2 process supervision, dotenv secret loading
**Confidence:** HIGH (repo facts verified by reading; CloudPanel default vhost MEDIUM — reverse-proxy template not in public repo, must verify on the actual VPS)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Subdomini de producció: `classe.masellas.info`.
- **D-02:** El VPS ja existeix, amb CloudPanel instal·lat (Nginx i certbot ja gestionats per CloudPanel — no cal provisionar-los en aquesta fase).
- **D-03:** El codi es desplega sota un usuari no-root dedicat, a una ruta tipus `/home/<usuari>/codearena`.
- **D-04:** Crear el site a CloudPanel com a **"Reverse Proxy"**, NO com a "Node.js" — el tipus "Node.js" porta el seu propi supervisor de procés que entraria en conflicte amb el PM2 + `ecosystem.config.cjs`/`server.cjs` ja construïts a la Fase 04.1 (el Reset de l'Admin depèn que sigui PM2 qui reviu el procés).
- **D-05:** El reverse proxy de CloudPanel apunta cap a `http://127.0.0.1:8011` — port real assignat per CloudPanel per aquest site, NO el `3000` per defecte d'`ecosystem.config.cjs`. El `.env` de producció ha de definir `PORT=8011` (D-10) i el procés Node ha d'escoltar en aquest port.
- **D-06:** No es versiona cap fitxer `.conf` d'Nginx al repo — CloudPanel gestiona el vhost via UI. Cal **verificar/afegir** al vhost generat: capçaleres `Upgrade`/`Connection`, `proxy_read_timeout`/`proxy_send_timeout` alts, i `proxy_buffering off`.
- **D-07:** Verificació obligatòria post-desplegament (Success Criteria #1): amb les eines de xarxa del navegador, confirmar que Socket.io fa upgrade real a `websocket` i no cau silenciosament a `polling`.
- **D-08:** Es desplega amb HTTPS (Let's Encrypt) des del principi — CloudPanel gestiona el certificat via UI un cop el DNS apunti al VPS.
- **D-09:** S'afegeix `dotenv` i es crida `dotenv.config()` a l'arrencada (`server.cjs`/`src/server/index.js`), de manera que un `.env` real al VPS (basat en `.env.example`, mai versionat) sigui llegit automàticament sense canviar com `process.env` s'exposa a la resta del codi.
- **D-10:** Aquest `.env` ha d'incloure com a mínim `ADMIN_SECRET` (obligatori — T-04.1-05 transferit) i `PORT=8011` (obligatori — ha de coincidir amb el port del reverse proxy, D-05).
- **D-11:** Es crea un script de desplegament versionat (p.ex. `deploy/deploy.sh`) que fa `git pull`, `npm ci`, `npm run build`, i `pm2 reload codearena`. S'executa manualment via SSH, no hi ha CI/CD en aquesta fase.

### Claude's Discretion
- Nom exacte i ubicació del script de desplegament dins de `deploy/` — l'estructura interna (variables, missatges de log) queda a criteri de la implementació, sempre que faci els 4 passos de D-11 en ordre.
- Format exacte de la llista de directives Nginx a verificar (D-06) — pot ser un bloc dins del CONTEXT.md, un RESEARCH.md, o un petit doc de desplegament. El contingut (les 3 directives) és el que importa, no el fitxer.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPL-01 | L'app funciona desplegada al VPS rere Nginx amb l'upgrade WebSocket configurat i verificat (no fallback silenciós a polling) | Nginx/CloudPanel section — Upgrade/Connection headers + `proxy_http_version 1.1`; app is **websocket-only** (`transports: ['websocket']`) so there is *no* polling fallback path — a broken upgrade = total connection failure, made visible via browser Network tab (101 Switching Protocols). |
| DEPL-02 | El procés Node el gestiona PM2 amb reinici automàtic | Already built in Phase 04.1 (`ecosystem.config.cjs` + `server.cjs`, `autorestart:true`). This phase exposes it correctly on the VPS (`.env`/PORT wiring, deploy script) — no rebuild. |
</phase_requirements>

## Summary

This is an **operations/deployment phase**, not a feature phase. Nearly all the runtime code (Socket.io server, PM2 supervision via `server.cjs`, `ecosystem.config.cjs`) already exists and is verified from Phase 04.1. The phase adds exactly one npm dependency (`dotenv`), one `.gitignore` entry, one deploy script, and requires verifying/adjusting the CloudPanel-generated Nginx vhost. The risk is concentrated in three small config seams where a wrong assumption silently breaks the whole deploy.

The three seams, each verified this session:
1. **PORT precedence conflict (critical).** `ecosystem.config.cjs` hardcodes `env: { PORT: 3000 }`. PM2 injects that into `process.env` *before* app code runs. `dotenv` by default (`override: false`) **will not overwrite an already-set variable**, so a production `.env` with `PORT=8011` would be silently ignored — the server would listen on 3000 while CloudPanel proxies to 8011 → total outage. Fix: remove `PORT` from the ecosystem `env` block (or call `dotenv.config({ override: true })`).
2. **`.env` is not gitignored.** `.gitignore` currently contains only `node_modules` and `dist`. The production secret (`ADMIN_SECRET`) would be committed if `.env` is created without adding it to `.gitignore` first. This is the concrete mitigation that closes transferred threat **T-04.1-05**.
3. **CloudPanel Reverse-Proxy vhost WebSocket headers.** CloudPanel's *Node.js* site template already ships `proxy_http_version 1.1` + `Upgrade`/`Connection "Upgrade"` + 900s timeouts. The *Reverse Proxy* site type (the one chosen, D-04) generates its vhost from CloudPanel core, not the public template repo — so its exact contents **must be verified in the Vhost Editor**, not assumed.

**Primary recommendation:** Load env via `import 'dotenv/config';` as the **first line of `src/server/index.js`** (covers both the PM2 entrypoint through `server.cjs` and the direct `npm start` path); remove the hardcoded `PORT` from the ecosystem `env` block; add `.env` to `.gitignore`; verify the reverse-proxy vhost carries the WebSocket upgrade headers in the browser Network tab (D-07); ship a 4-step `deploy/deploy.sh`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TLS termination + HTTP→HTTPS + WebSocket upgrade | CDN/Edge (Nginx via CloudPanel) | — | CloudPanel owns the vhost; the Node app never sees TLS, only plain HTTP on 127.0.0.1:8011. |
| Reverse proxy 443 → 127.0.0.1:8011 | Nginx (CloudPanel) | — | Single-process app; no load balancer, no sticky sessions needed. |
| Process supervision / auto-restart | PM2 (fork mode) | OS user session | `autorestart:true` already verified; PM2 revives the process on crash and on the Admin Reset (`process.exit(0)`). |
| Secret + port config loading | Node app (`dotenv` at startup) | `.env` file on disk | `.env` is the single source of truth for `PORT` and `ADMIN_SECRET` in production. |
| Serving built frontend (`dist/`) | Node/Express (`express.static`) | — | Already implemented in `index.js`; no CDN offload at this scale. |
| Deploy orchestration | Shell script over SSH (`deploy/deploy.sh`) | git + npm + PM2 | Manual, no CI/CD this phase (D-11). |

## Standard Stack

### Core (already present — no change)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| socket.io | 4.8.3 | Real-time transport | Already installed; `connectionStateRecovery` (2-min window) already configured — handles the reconnection after a PM2 reload/restart drop. [VERIFIED: package.json] |
| express | 4.22.2 | HTTP + static serving of `dist/` | Already installed; `express.static('dist')` present. [VERIFIED: src/server/index.js] |
| pm2 | 7.0.3 | Process supervisor (installed on VPS, not a project dep) | Legitimacy already vetted in Phase 04.1 (T-04.1-SC closed). [VERIFIED: 04.1-SECURITY.md] |

### Supporting (new this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | 17.4.2 | Load `.env` into `process.env` at startup | Add as a project dependency (D-09). Current latest confirmed on npm. [VERIFIED: npm registry] |

**Installation:**
```bash
npm install dotenv@17.4.2
```

**Version verification (this session):**
- `npm view dotenv version` → `17.4.2` (published 2026-04-12). [VERIFIED: npm registry]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `dotenv` + `.env` | PM2 `env`/`env_file` block only | Keeps secrets out of the repo too, but D-09 explicitly chose `dotenv` so `process.env` access stays unchanged app-wide. Following the locked decision. |
| `import 'dotenv/config'` in index.js | `node_args: '-r dotenv/config'` in ecosystem | Both work; the `-r` flag only helps the PM2 path and not `npm start`. In-code import covers both entrypoints — simpler, one place. |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| dotenv | npm | published 2026-04-12 (mature, 10+ yrs of history) | ~137M/week | git://github.com/motdotla/dotenv.git | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`gsd-tools query package-legitimacy check --ecosystem npm dotenv` → `verdict: OK`, `postinstall: null`, `deprecated: false`. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
                         Internet (HTTPS, classe.masellas.info)
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │  Nginx vhost  (CloudPanel "Reverse Proxy" site type)  │
        │  • Let's Encrypt TLS termination (D-08)               │
        │  • HTTP→HTTPS redirect                                 │
        │  • WebSocket upgrade: proxy_http_version 1.1;          │
        │      Upgrade $http_upgrade; Connection "Upgrade"       │  ◄── D-06/D-07: VERIFY these
        │  • proxy_read_timeout / proxy_send_timeout (high)      │      exist in the generated vhost
        │  • proxy_pass http://127.0.0.1:8011                    │
        └─────────────────────────────────────────────────────┘
                                      │  plain HTTP, loopback
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │  PM2 (fork mode)  →  server.cjs  →  startServer()      │
        │  • autorestart:true (revives on crash / Admin Reset)  │
        │  • listens on PORT=8011 (from .env via dotenv)         │
        │                                                       │
        │   Node process:                                       │
        │   • express.static('dist')  → built frontend          │
        │   • Socket.io  transports:['websocket'] ONLY          │  ◄── no polling fallback exists
        │   • connectionStateRecovery (2-min reconnect window)  │
        │   • reads ADMIN_SECRET from process.env (via .env)     │  ◄── closes T-04.1-05
        └─────────────────────────────────────────────────────┘
                                      ▲
                     .env (on VPS, gitignored, never committed)
                     PORT=8011 · ADMIN_SECRET=<strong secret>
```

### Recommended Project Structure (additions only)
```
codearena/
├── .env                 # VPS only, gitignored — PORT=8011, ADMIN_SECRET=...
├── .env.example         # updated: remove "no dotenv" note; document PORT=8011 in prod
├── .gitignore           # ADD: .env
├── deploy/
│   └── deploy.sh        # git pull && npm ci && npm run build && pm2 reload codearena
├── ecosystem.config.cjs # EDIT: drop hardcoded PORT from env block (see Pitfall 1)
└── src/server/index.js  # EDIT: `import 'dotenv/config';` as FIRST line
```

### Pattern 1: Load dotenv at the single shared entrypoint
**What:** Put dotenv at the top of `src/server/index.js`, not in `server.cjs`, because both the PM2 path (`server.cjs` → dynamic `import('./src/server/index.js')`) and the direct path (`npm start` / `npm run server` → `node src/server/index.js`) funnel through `index.js`. One import covers both.
**When to use:** Always, here — avoids a second dotenv call and the CJS/ESM mismatch (`server.cjs` is CommonJS; a static `import` there is illegal, would need `require('dotenv').config()`).
**Example:**
```javascript
// src/server/index.js — FIRST line, before any other import
import 'dotenv/config';
import express from 'express';
// ... rest unchanged
```
Timing is safe: `ADMIN_SECRET` is read inside `registerSocketHandlers()` (line 46) and `PORT` inside the `startServer()` default param — both evaluated at call time, which is after the ESM import graph (including `dotenv/config`) has fully run. [VERIFIED: read of index.js + socketHandlers.js]

### Pattern 2: Let `.env` be the single source of PORT
**What:** Remove `PORT` from the `ecosystem.config.cjs` `env` block so nothing pre-sets `process.env.PORT`, letting `dotenv` populate it from `.env`.
**When to use:** Required to avoid the precedence trap (Pitfall 1). In dev with no `.env`, `startServer(port = process.env.PORT || 3000)` falls back to 3000 — behavior unchanged.

### Anti-Patterns to Avoid
- **Calling `dotenv.config()` after `startServer()`** — env would load too late; `PORT`/`ADMIN_SECRET` already read. Load at import time.
- **Keeping `PORT: 3000` in ecosystem env AND expecting `.env`'s `PORT=8011` to win** — dotenv's default `override:false` makes `.env` lose. Silent 3000-vs-8011 outage.
- **Committing `.env`** — `.gitignore` must be updated first. The whole point of `dotenv` here is a secret that never enters git.
- **Expecting `pm2 reload` to be zero-downtime in fork mode** — it is not (see Pitfall 3); it falls back to a restart with a brief WS drop.
- **Adding `proxy_buffering off` and assuming it matters for this app** — the app is websocket-only; buffering affects HTTP/long-polling bodies, not the upgraded WS tunnel. Harmless to add per D-06, but not the thing that makes/breaks the deploy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading `.env` into `process.env` | Custom file parser | `dotenv` | Handles quoting, comments, multiline, `override` semantics; 137M weekly downloads. |
| Reconnect/state-resync after a deploy restart | Custom resync RPC | Socket.io `connectionStateRecovery` (already configured, 2-min window) + existing `SESSION_FULL_STATE` fallback | Already built and verified in earlier phases. |
| Process restart on crash | Custom watchdog | PM2 `autorestart` (already configured) | Built in Phase 04.1; the Admin Reset depends on it. |
| TLS cert issuance/renewal | certbot scripting | CloudPanel UI (D-08) | CloudPanel manages Let's Encrypt end-to-end. |

**Key insight:** This phase's job is *wiring already-built pieces correctly*, not building. Every "component" here exists; the failure modes are all in the seams between them.

## Common Pitfalls

### Pitfall 1: PM2 `env` block silently overrides `.env` PORT (CRITICAL)
**What goes wrong:** `ecosystem.config.cjs` sets `env: { PORT: 3000 }`. PM2 injects `PORT=3000` into `process.env` at spawn. `dotenv.config()` with its default `override: false` sees `PORT` already set and **skips** the `.env` value `8011`. The server listens on 3000; CloudPanel proxies to 8011; every connection fails. No error is logged.
**Why it happens:** PM2 env injection precedes app code; dotenv by design never overwrites an existing env var. [VERIFIED: PM2 docs + dotenv docs, cross-checked]
**How to avoid:** Remove `PORT` from the ecosystem `env` block (recommended — makes `.env` the single source), OR call `dotenv.config({ override: true })`. Removing is cleaner because it also stops the dev default (3000) from masking a missing prod `.env`.
**Warning signs:** `pm2 logs codearena` shows "listening on ...:3000" while the site 502s; browser Network shows the WS request never reaching a live upstream.

### Pitfall 2: `.env` committed to git (leaks ADMIN_SECRET)
**What goes wrong:** `.gitignore` has only `node_modules` and `dist`. Creating `.env` on the VPS and running the deploy from a clone that `git add .`-es would commit the production secret. [VERIFIED: read of .gitignore]
**Why it happens:** `.env` isn't ignored by default; the repo never needed it before this phase.
**How to avoid:** Add `.env` to `.gitignore` **before** creating any `.env`. This is the concrete closure of transferred threat T-04.1-05 (get the secret in, keep it out of the repo).
**Warning signs:** `git status` shows `.env` as untracked-but-addable rather than ignored; `git ls-files | grep '\.env$'`.

### Pitfall 3: `pm2 reload` is not zero-downtime in fork mode
**What goes wrong:** D-11 uses `pm2 reload codearena` expecting a graceful, no-drop swap. In **fork mode** (the current config — `ecosystem.config.cjs` has no `exec_mode: 'cluster'`), PM2 auto-falls-back to a plain restart: the old process is killed and a new one started, briefly dropping all WebSocket connections. [VERIFIED: PM2 docs, cross-checked; ecosystem.config.cjs read confirms fork mode]
**Why it happens:** Rolling reload requires multiple cluster workers; a single fork-mode instance has nothing to roll to.
**How to avoid:** Accept it — D-11 already notes deploys happen outside class hours, and `reload` has no downside vs `restart` in fork mode (it just aliases to restart). Keep `reload` in the script (future-proof if cluster mode is ever adopted). Socket.io's `connectionStateRecovery` (2-min window, already on) means any client connected during a deploy reconnects and restores state automatically.
**Warning signs:** Expecting "0s downtime" in logs; instead PM2 prints a restart. This is normal, not a bug.

### Pitfall 4: dotenv reads `.env` from `process.cwd()`, not the file's directory
**What goes wrong:** `dotenv` resolves `.env` relative to the process working directory. If PM2 was started from a different directory than the repo root, `.env` isn't found and prod silently runs with no `ADMIN_SECRET`/`PORT`.
**Why it happens:** PM2 remembers the cwd from `pm2 start`; a reload reuses it. The deploy script must run from the repo root.
**How to avoid:** Ensure `pm2 start` / the deploy script run from `/home/<user>/codearena`. For robustness, optionally add `cwd: __dirname` to the app entry in `ecosystem.config.cjs` so PM2 always uses the repo root regardless of where the command is invoked.
**Warning signs:** The startup `console.warn('ADMIN_SECRET not set — admin authentication is DISABLED')` appears in `pm2 logs` in production.

### Pitfall 5: Assuming the Reverse-Proxy vhost has WebSocket headers
**What goes wrong:** Assuming CloudPanel's *Reverse Proxy* site type generates the same WebSocket-ready block as its *Node.js* template. The Node.js template does include `proxy_http_version 1.1` + `Upgrade`/`Connection "Upgrade"` + 900s timeouts [VERIFIED: cloudpanel-io/vhost-templates repo], but the Reverse Proxy vhost is generated by CloudPanel core and is not in that repo — its default may or may not include the upgrade headers.
**Why it happens:** Different site types, different generators; the app being websocket-only means a missing header = total failure, not graceful degradation.
**How to avoid:** Open the vhost in CloudPanel's Vhost Editor and confirm the proxy `location` block contains `proxy_http_version 1.1;`, `proxy_set_header Upgrade $http_upgrade;`, and `proxy_set_header Connection "upgrade";`. Add them if absent. Then verify per D-07 in the browser.
**Warning signs:** Browser Network tab shows the Socket.io request returning `400`/`200` instead of `101 Switching Protocols`; repeated failed connection attempts (no polling fallback to mask it).

## Nginx / CloudPanel WebSocket Directives (D-06 checklist)

The proxy `location` block for `classe.masellas.info` must contain, at minimum:

```nginx
location / {
    proxy_pass http://127.0.0.1:8011;
    proxy_http_version 1.1;                          # REQUIRED for WS upgrade
    proxy_set_header Upgrade $http_upgrade;          # REQUIRED
    proxy_set_header Connection "upgrade";           # REQUIRED
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;                        # high — avoid idle drop mid-session
    proxy_send_timeout 3600s;
    proxy_buffering off;                             # per D-06 (low impact for WS-only, harmless)
}
```

Notes verified this session:
- CloudPanel's **Node.js** template already provides `proxy_http_version 1.1`, `Upgrade $http_upgrade`, `Connection "Upgrade"`, and `proxy_read_timeout 900` / `proxy_send_timeout 900`. [VERIFIED: cloudpanel-io/vhost-templates/v2/Nodejs]
- **900s (15 min) idle timeout is actually sufficient** given Socket.io's default keepalive (`pingInterval` ≈ 25s) keeps the connection non-idle throughout a 15-20 min session. Raising to `3600s` is a safety margin per D-06, not a strict requirement. [ASSUMED — based on Socket.io default ping behavior]
- `proxy_buffering off` matters for HTTP long-polling, which this app does **not** use (`transports: ['websocket']`); include it per D-06 but it is not load-bearing here. [VERIFIED: src/server/index.js transports config]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.env.example` says "no dotenv; read process.env directly" | `dotenv` loads `.env` at startup (D-09) | This phase | `.env.example`'s "no dotenv" comment must be updated to avoid contradicting the new setup. |
| PORT hardcoded in `ecosystem.config.cjs` env block | PORT sourced from `.env` (prod 8011) | This phase | Ecosystem env `PORT: 3000` must be removed to avoid the override trap. |

**Deprecated/outdated:**
- The `.env.example` comment block "The server reads these straight from the process environment (no dotenv)" is now stale — update it (still fine to keep documenting `ADMIN_SECRET` and `PORT`, but note prod uses `PORT=8011`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Socket.io default keepalive (~25s ping) keeps the connection non-idle, so a 900s Nginx read timeout won't drop a 15-20 min session | Nginx checklist | Low — if wrong and pings are disabled/longer, raising to 3600s (already recommended) fully covers it. |
| A2 | CloudPanel's Reverse-Proxy site type may NOT include WebSocket upgrade headers by default (unverifiable from public repo) | Pitfall 5 | Medium — this is why D-07 mandates a browser-level verification; the plan must include an explicit "inspect and, if needed, edit the vhost" step rather than assuming. |
| A3 | The VPS Node.js version is a recent LTS compatible with the app (local dev is v22.17.0; CLAUDE.md targets Node 24 LTS) | Environment Availability | Low — verify on VPS; app has no exotic Node feature needs. |

## Open Questions

1. **Does the CloudPanel Reverse-Proxy vhost already carry `Upgrade`/`Connection`/`proxy_http_version 1.1`?**
   - What we know: the Node.js template does; the Reverse-Proxy generator is separate and not public.
   - What's unclear: the exact default block for the reverse-proxy site type on this CloudPanel version.
   - Recommendation: plan a task to open the Vhost Editor, confirm/add the three directives, then verify via D-07 (browser Network tab, WS filter, expect `101`).

2. **What Node.js version runs on the VPS?**
   - What we know: local dev is v22.17.0; project recommends Node 24 Active LTS.
   - What's unclear: the VPS-installed version under the non-root user (nvm? system node? CloudPanel-managed?).
   - Recommendation: `node --version` on the VPS during the first deploy dry-run; ensure `npm ci` resolves against a compatible engine.

## Environment Availability

| Dependency | Required By | Available (this machine) | Version | Fallback |
|------------|------------|--------------------------|---------|----------|
| Node.js | Runtime | ✓ (dev) | 22.17.0 | VPS version to be confirmed |
| npm | `npm ci` / build | ✓ | 11.8.0 | — |
| git | `git pull` in deploy | ✓ | 2.41.0 | — |
| pm2 | Process supervision | ✓ (dev has 7.0.3) | 7.0.3 | Must be installed globally on the VPS under the non-root user |
| package-lock.json | `npm ci` (fails without it) | ✓ tracked | — | — |
| CloudPanel / Nginx / certbot | Reverse proxy + TLS | n/a (on VPS) | — | Provisioned already (D-02) |

**Missing dependencies with no fallback:**
- On the **VPS**: confirm `pm2` is installed globally under the non-root user and that a prior `npm run server:pm2` (or `pm2 start ecosystem.config.cjs`) has registered the `codearena` app so `pm2 reload codearena` in the deploy script resolves. If it was never started there, the first deploy must `pm2 start` (not `reload`).

**Missing dependencies with fallback:**
- None on this dev machine — all deploy tooling present. VPS-side checks are deferred to first deploy.

## Deploy Script Shape (D-11 reference, discretion on details)

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."          # repo root, so dotenv & PM2 cwd are correct (Pitfall 4)
git pull
npm ci                           # lockfile present & tracked — verified
npm run build                    # produces dist/ served by express.static
pm2 reload codearena             # fork-mode: aliases to restart (Pitfall 3); brief WS drop OK
```
- Runs manually over SSH under the non-root user (D-03), from `/home/<user>/codearena`.
- First-ever deploy on a fresh VPS: replace `pm2 reload` with `npm run server:pm2` (i.e. `pm2 start ecosystem.config.cjs`) once, then `pm2 save` + `pm2 startup` so it survives reboot; subsequent deploys use `reload`.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high` (config.json). Included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `ADMIN_SECRET` handshake check (existing, `socketHandlers.js`); this phase ensures the secret is actually present in prod via `.env` (closes T-04.1-05). |
| V3 Session Management | no | Team identity is localStorage token (Kahoot pattern); no auth sessions to manage server-side beyond socket rooms. |
| V4 Access Control | yes | Every `admin:*` handler re-checks `socket.rooms.has('admin')` server-side (existing, verified in 04.1-SECURITY). Unchanged this phase. |
| V5 Input Validation | not-new | Existing `safeHandler` + payload validators; no new input surface added by deployment. |
| V6 Cryptography | delegated | TLS via CloudPanel/Let's Encrypt (D-08); no app-level crypto. Never hand-roll. |
| V7 Secrets Management | yes | `.env` (gitignored) is the secret store; `dotenv` loads it. `.gitignore` update is the control (Pitfall 2). |

### Known Threat Patterns for this deploy

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `ADMIN_SECRET` absent after PM2 restart → admin auth disabled (T-04.1-05, transferred) | Elevation of Privilege | `.env` on VPS provides `ADMIN_SECRET`; `dotenv` loads it before `registerSocketHandlers` reads it; startup `console.warn` surfaces a missing secret in `pm2 logs`. |
| Production secret committed to git | Information Disclosure | Add `.env` to `.gitignore` **before** creating `.env` (Pitfall 2). |
| Unencrypted transport | Information Disclosure / Tampering | HTTPS-only + HTTP→HTTPS redirect via CloudPanel (D-08); Nginx template already forces `rewrite ^ https://...`. |
| Wrong port → silent outage (not a security issue but a reliability one) | Denial of Service (availability) | Single-source PORT via `.env` (Pitfall 1). |

### T-04.1-05 Closure (transferred threat — what this phase must do)
1. Add `dotenv` and load it at startup (D-09) — done via `import 'dotenv/config'` in `index.js`.
2. Create `/home/<user>/codearena/.env` on the VPS with a strong `ADMIN_SECRET` and `PORT=8011`.
3. Add `.env` to `.gitignore` so the secret is never committed.
4. Verify at deploy time that `pm2 logs codearena` does **not** print the "ADMIN_SECRET not set" warning.

After these, T-04.1-05 moves from `transfer` to `closed`.

## Sources

### Primary (HIGH confidence)
- Repo files read directly this session: `src/server/index.js` (transports websocket-only, `connectionStateRecovery`, PORT default), `src/server/socketHandlers.js:46` (ADMIN_SECRET read timing), `ecosystem.config.cjs` (fork mode, `env: {PORT:3000}`), `server.cjs` (PM2 launcher), `package.json` (scripts/deps), `.gitignore` (only node_modules/dist), `.env.example`, `04.1-SECURITY.md` (T-04.1-05).
- `github.com/cloudpanel-io/vhost-templates/v2/Nodejs` — CloudPanel Node.js proxy vhost (Upgrade/Connection/900s timeouts). [VERIFIED via raw GitHub]
- `npm view dotenv version` → 17.4.2; `package-legitimacy check` → OK. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- PM2 docs — reload auto-falls-back to restart outside cluster mode; env block overrides process.env. (pm2.keymetrics.io, pm2.io)
- dotenv docs / issue tracker — default `override:false` never overwrites set vars. (github.com/motdotla/dotenv)
- nginx.org WebSocket proxying — Upgrade/Connection hop-by-hop header requirements.

### Tertiary (LOW confidence)
- CloudPanel Reverse-Proxy *site type* exact default vhost — not in public repo; must be verified in Vhost Editor on the VPS (A2).

## Metadata

**Confidence breakdown:**
- Standard stack (dotenv): HIGH — single, well-known dep verified on registry.
- Config seams (PORT precedence, .gitignore, dotenv timing): HIGH — verified by reading the actual repo files + cross-checked docs.
- CloudPanel reverse-proxy vhost: MEDIUM — Node.js template verified, reverse-proxy generator unverifiable remotely; D-07 browser verification is the safety net.
- PM2 reload semantics: HIGH — fork mode confirmed in ecosystem file + PM2 docs.

**Research date:** 2026-07-06
**Valid until:** ~2026-08-05 (30 days; dotenv/PM2/CloudPanel are stable). Re-verify the CloudPanel vhost on the actual VPS regardless of date.
</content>
</invoke>
