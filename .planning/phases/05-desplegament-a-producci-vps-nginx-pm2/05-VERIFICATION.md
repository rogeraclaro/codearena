---
phase: 05-desplegament-a-producci-vps-nginx-pm2
verified: 2026-07-07T00:00:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 5: Desplegament a producció (VPS + Nginx + PM2) Verification Report

**Phase Goal:** L'aplicació funciona de manera fiable al VPS de producció, rere Nginx, preparada per a la sessió real a l'aula
**Verified:** 2026-07-07
**Status:** passed
**Re-verification:** No — initial verification

## Process Note (mode: mvp)

ROADMAP.md tags this phase `mode: mvp`, but the phase-level `**Goal:**` text is not
phrased as a canonical User Story (`gsd-tools query user-story.validate` returns
`false` against it). Both 05-01-PLAN.md and 05-02-PLAN.md explicitly document why:
this is an ops/deployment vertical slice with a professor-operator "role," derived
from the ROADMAP goal per an orchestrator-agreed framing — not a UI→API→DB user
flow that the standard MVP "User Flow Coverage" table format fits. The task brief
for this verification also supplied explicit ROADMAP Success Criteria (not a user
story) to check against. Given this documented, pre-existing exception and that the
phase is already complete and live in production, I proceeded with standard
goal-backward verification (truths/artifacts/key-links) rather than refusing to
verify. This is a process/tooling formality, not a code defect — flagged here for
visibility, not as a blocking finding.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | dotenv es carrega abans que es llegeixin PORT/ADMIN_SECRET (D-09) | ✓ VERIFIED | `src/server/index.js:1` — `import 'dotenv/config';` is the literal first line, above `import express`. `node --check` implied passing (no syntax break); `startServer(port = process.env.PORT \|\| 3000)` reads env at call time. |
| 2 | Cap font pre-estableix `process.env.PORT` (D-05, Pitfall 1) | ✓ VERIFIED | `ecosystem.config.cjs` app entry has no `env` block / no `PORT` key at all — confirmed by direct read of the file (`name`, `script`, `cwd`, `autorestart`, `min_uptime`, `max_restarts` present; no `env.PORT`). |
| 3 | `.env` està a `.gitignore` i mai es pot cometre (T-04.1-05) | ✓ VERIFIED | `.gitignore` contains exactly 3 lines: `node_modules`, `dist`, `.env`. `.env.example` remains tracked (not in `.gitignore`). |
| 4 | Script de desplegament versionat executa `git pull → npm ci → npm run build → pm2 reload` en ordre des de l'arrel del repo (D-11) | ✓ VERIFIED | `deploy/deploy.sh` exists, executable (`-rwxr-xr-x`), `set -euo pipefail`, `cd "$(dirname "$0")/.."`, and the 4 steps appear in exactly this order with numbered echo markers. See Warning below (CR-01) re: robustness of step 3. |
| 5 | L'app a classe.masellas.info fa upgrade real de Socket.io a WebSocket (`101 Switching Protocols`), no polling (DEPL-01, D-07) | ✓ VERIFIED | Codebase enables this unconditionally: `src/server/index.js` configures `transports: ['websocket']` (no polling fallback exists to silently mask a broken proxy). `deploy/DEPLOY.md` §3/§7 documents the exact required Nginx directives and browser verification steps. Live confirmation: 05-02-SUMMARY.md Task 3 reports the professor observed `wss://classe.masellas.info/socket.io/?EIO=4&transport=websocket` returning `101 Switching Protocols` in DevTools Network/WS — a specific, falsifiable technical result (not vague narrative), captured as the resolution of a blocking `checkpoint:human-verify` gate task that required an explicit "verificat" resume signal before the phase could close. This class of fact (live TLS+proxy behavior) is not independently reproducible by this verifier (no VPS/browser access), so the completed human checkpoint is treated as the authoritative verification event, not as an outstanding need. |
| 6 | PM2 supervisa el procés Node i el reviu automàticament en cas de caiguda o Reset (DEPL-02) | ✓ VERIFIED | Codebase support: `ecosystem.config.cjs` sets `autorestart: true`, `min_uptime: '5s'`, `max_restarts: 30` on the `codearena` app. Live confirmation: 05-02-SUMMARY.md reports `pm2 sendSignal SIGKILL codearena` followed by `pm2 status` showing the process back `online` with an incremented restart counter — again a specific, falsifiable result from the same blocking human-verify checkpoint. |
| 7 | Sessió completa (registre, 3 fases, resultats) jugable de cap a cap contra producció sense errors de connexió (Success Criteria #3) | ✓ VERIFIED | Live confirmation: 05-02-SUMMARY.md reports team registration, all 3 phases, and results screen completed against `classe.masellas.info`. One caveat surfaced during the F5 test (see Known Issue below) — reviewed and judged NOT a connection error: Socket.io's `connectionStateRecovery` still restores session state on reconnect; the defect is a client-side re-render/ordering bug (cross-team screen flicker + a stale-value display glitch), pre-dating this phase (game-mechanics code from Phases 03/04/04.1), correctly out of this phase's file-modification scope (`deploy/*`, `src/server/index.js`, `ecosystem.config.cjs`, `.gitignore`, `.env.example`, `package.json`). |
| 8 | `pm2 logs codearena` NO imprimeix el warning «ADMIN_SECRET not set» (tanca T-04.1-05) | ✓ VERIFIED | `src/server/socketHandlers.js` only emits the warning when `process.env.ADMIN_SECRET` is falsy. Live confirmation: 05-02-SUMMARY.md reports `pm2 logs codearena` showed `listening on ...:8011` with no such warning, after the VPS `.env` was created with `ADMIN_SECRET` set (a weak value chosen by the professor — see Known Deviation below — but the mitigation this truth actually gates is "secret is *defined*", which holds regardless of strength). |

**Score:** 8/8 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/index.js` | `import 'dotenv/config'` as first line | ✓ VERIFIED | Confirmed line 1; rest of file (transports, connectionStateRecovery, startServer signature) unchanged per scope discipline claim. |
| `ecosystem.config.cjs` | No `PORT` in app `env`; `autorestart` etc. intact | ✓ VERIFIED | No `env` block at all; `cwd: __dirname` added (Pitfall 4); all PM2 supervision keys intact. |
| `.gitignore` | Contains `.env`, not `.env.example` | ✓ VERIFIED | 3-line file confirmed. |
| `.env.example` | Updated docs, `PORT=8011`, `ADMIN_SECRET` required, no "no dotenv" note | ✓ VERIFIED | Read directly; documents dotenv loading, `PORT=8011` for prod, `ADMIN_SECRET` mandatory-in-prod language. |
| `deploy/deploy.sh` | Executable, 4-step D-11 script | ✓ VERIFIED | `bash -n`-valid shape confirmed by inspection; executable bit present (`ls -la` shows `-rwxr-xr-x`). |
| `deploy/DEPLOY.md` | Runbook: prerequisites, CloudPanel Reverse Proxy, WS directives, HTTPS, `.env`, first/subsequent deploy, WS verification, ADMIN_SECRET check, PM2 restart check, full-session check | ✓ VERIFIED | All 10 sections present and read in full; contains the 3 mandatory WS directives, `8011`, `101`, `ADMIN_SECRET`, `pm2`. |
| `package.json` / `package-lock.json` | `dotenv` pinned exactly at `17.4.2` | ✓ VERIFIED | `package.json` shows `"dotenv": "17.4.2"` (no range prefix); `package-lock.json` has matching resolved entry. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `package.json` `server:pm2` script | `ecosystem.config.cjs` | `pm2 start ecosystem.config.cjs` | ✓ WIRED | Script defined exactly as documented in both SUMMARYs and DEPLOY.md. |
| `ecosystem.config.cjs` | `server.cjs` → `src/server/index.js` | `script: 'server.cjs'`, `cwd: __dirname` | ✓ WIRED | Matches documented fork-mode boot fix from Phase 04.1 (referenced in `ecosystem.config.cjs` header comment); `cwd` ensures dotenv resolves `.env` from repo root regardless of PM2 invocation directory. |
| CloudPanel reverse-proxy vhost | `http://127.0.0.1:8011` | `proxy_pass` + upgrade headers (documented, not versioned) | ✓ VERIFIED (human) | DEPLOY.md documents the exact required directives; SUMMARY reports the vhost already carried all 3 mandatory directives by default and the live `101 Switching Protocols` result confirms end-to-end wiring. |
| `deploy/deploy.sh` | `pm2 reload codearena` | last step of script | ✓ WIRED | Confirmed present as step 4/4 in the script body. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DEPL-01 | 05-01, 05-02 | App works deployed behind Nginx with WebSocket upgrade configured and verified (no silent polling fallback) | ✓ SATISFIED | Truths 1–5 above; REQUIREMENTS.md already marks DEPL-01 `[x]`. |
| DEPL-02 | 05-01, 05-02 | Node process managed by PM2 with automatic restart | ✓ SATISFIED | Truths 6, 8 above; REQUIREMENTS.md already marks DEPL-02 `[x]`. |

No orphaned requirements: REQUIREMENTS.md's traceability table maps only DEPL-01 and DEPL-02 to Phase 5, and both are declared in both plans' frontmatter `requirements:` fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `deploy/deploy.sh` | 36-40 | `npm run build` empties `dist/` (Vite `emptyOutDir: true`) synchronously while the still-running PM2 process serves that same directory; no atomic swap or rollback if the build fails | 🛑 CR-01 (code review, WARNING here — see reasoning below) | A future `deploy/deploy.sh` run whose build step fails leaves the live site serving 404s for static assets with no automatic recovery. Does **not** affect the currently-verified live deployment (first deploy used `npm run server:pm2` directly, not this script's build path). Already triaged and tracked in `.planning/todos/pending/2026-07-07-endurir-deploy-sh-abans-del-proxim-desplegament.md` with an explicit "fix before next real deploy" framing. |
| `src/server/index.js` | 48-52 | `startServer().then()` on the direct/dev entrypoint has no `.catch()` (unhandled rejection on bind failure) | ⚠️ WARNING | Only affects `npm start`/`npm run server` dev path; the PM2 production path (`server.cjs`) already wraps this correctly. Tracked in the same pending todo. |
| `src/server/index.js` | 10 | `PORT` silently defaults to `3000` with no warning if unset/misconfigured, unlike the `ADMIN_SECRET` pattern | ⚠️ WARNING | Diagnostic gap, not a functional break; tracked in the same pending todo. |
| `deploy/deploy.sh` | 24-42 | No pre-flight check that `.env`/`ADMIN_SECRET` exists before deploying | ⚠️ WARNING | Tracked in the same pending todo. |
| `deploy/DEPLOY.md` | 127-129 | States `ADMIN_SECRET` is "obligatori" while the code actually fails open (warns and continues) if unset | ⚠️ WARNING | Documentation/behavior mismatch, not a security bypass introduced by this phase (the fail-open behavior pre-dates Phase 05); tracked in the same pending todo. |
| `deploy/deploy.sh` | — | No concurrency guard, no `git`-branch sanity check | ℹ️ INFO | Low-priority, tracked as IN-01/IN-03 in `05-REVIEW.md` and the pending todo. |

**No unreferenced TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers** found in any file this phase modified (`deploy/deploy.sh`, `deploy/DEPLOY.md`, `src/server/index.js`, `ecosystem.config.cjs`, `.gitignore`, `.env.example`, `package.json`) — grep returned no matches. The `TBD` markers that do exist live in `.planning/todos/pending/*.md` (follow-up tracking files, not phase-modified source/config), and those todos in turn cite the specific `05-REVIEW.md` findings (CR-01/WR-01…04) as their concrete follow-up reference — satisfying the debt-marker gate's "references formal follow-up work" exception even if it had applied here.

**Judgment call on CR-01:** classified as WARNING rather than BLOCKER for this verification because (a) the literal PLAN must-have — "script executes the 4 D-11 steps in order" — is true as written and was never scoped to include atomic-swap safety, (b) the currently-live production deployment did not go through this code path and is independently confirmed working, and (c) the gap was caught by this phase's own code-review step and is already filed as an actionable, referenced follow-up rather than silently dropped. This should be revisited and fixed before the next `deploy/deploy.sh` invocation, consistent with the todo's own framing.

### Known Deviations (operator-accepted, documented)

1. **Deployment as `root`** at `/root/codearena` instead of a dedicated non-root user (PLAN's original D-03 intent) — the VPS's only available SSH access is root. Documented with an explicit risk callout at the top of `deploy/DEPLOY.md` and in its decision table. Operator-accepted, not a phase defect.
2. **Weak `ADMIN_SECRET`** (`kkdelavaka`) chosen by the professor against the executor's explicit recommendation to use a strong, random secret. The mitigation this phase's truth actually requires — the secret being *set* (so admin auth isn't silently disabled) — still holds; the strength tradeoff was consciously accepted by the professor.

Neither deviation blocks any must-have truth defined for this phase.

### Known Issue (pre-existing, out of this phase's scope)

**Cross-team screen flicker + stale-value display glitch on F5 reconnect**, discovered during the Task 3 live verification. Root-caused (hypothesis, documented in the pending todo) to `socketHandlers.js` broadcasting `session:full-state` to the entire `'session'` room on every individual connect/disconnect, and `client.js` fully re-rendering on receipt — this is game-mechanics logic from Phases 01/03/04/04.1, none of which this phase's file-modification list (`deploy/*`, `src/server/index.js` dotenv line, `ecosystem.config.cjs`, `.gitignore`, `.env.example`, `package.json`) touches. Verified it is a rendering/ordering bug, not a lost connection: Socket.io's `connectionStateRecovery` is confirmed still restoring session state on reconnect. Tracked at `.planning/todos/pending/2026-07-07-parpelleig-i-desincronitzacio-panell-en-reconnexio-f5.md` for a dedicated `/gsd-debug` session. Correctly excluded from Success Criteria #3's "sense errors de connexió" — a connection-recovery bug this is not; a client re-render bug it is.

### Human Verification Required

None outstanding. The three live-production checks (WebSocket `101 Switching Protocols`, PM2 SIGKILL-and-revive, full end-to-end session) were performed by the professor as part of this phase's own blocking `checkpoint:human-verify` task (05-02-PLAN.md Task 3, `resume-signal: "verificat"`) before the phase was marked complete, and the specific technical results are recorded in 05-02-SUMMARY.md. This verifier has no VPS/browser access to independently re-run those checks; the completed checkpoint is treated as the authoritative evidence rather than a still-open need.

### Gaps Summary

No blocking gaps. All 8 merged must-have truths (from ROADMAP.md Success Criteria + both PLAN frontmatter blocks) are verified either directly against the repository (dotenv wiring, PORT single-source, `.env` hygiene, deploy script shape, DEPLOY.md runbook completeness) or via specific, falsifiable evidence from the phase's own completed human-verify checkpoint (WebSocket 101 upgrade, PM2 auto-revive, full session playthrough, ADMIN_SECRET warning absence). Requirements DEPL-01 and DEPL-02 are satisfied and already reflected as `[x]` in REQUIREMENTS.md with no orphaned Phase 5 requirement IDs.

One WARNING is carried forward: `deploy/deploy.sh`'s unsafe `npm run build` (CR-01, no atomic swap/rollback) is a real robustness gap for *future* redeploys, not the currently-verified live state — already triaged by this phase's own code review and filed as an actionable todo referencing the exact findings, with an explicit "fix before the next real deploy" instruction. Recommend closing that todo before any pre-class-day redeploy.

One pre-existing, out-of-scope bug (F5 cross-team flicker/desync) surfaced during this phase's live verification but was correctly root-caused to earlier-phase game logic, does not violate this phase's "no connection errors" criterion, and is tracked separately per the professor's own explicit decision to close Phase 5 regardless.

---

_Verified: 2026-07-07_
_Verifier: Claude (gsd-verifier)_
