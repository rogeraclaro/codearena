---
phase: quick
plan: 260707-otq
subsystem: deployment
tags: [deploy, hardening, security, socket.io, pm2]
status: complete
requires: []
provides:
  - atomic-dist-swap
  - admin-secret-preflight
  - startup-error-handling
affects:
  - deploy/deploy.sh
  - src/server/index.js
  - deploy/DEPLOY.md
tech-stack:
  added: []
  patterns:
    - "Atomic dist swap: build to dist.new, swap keeping dist.bak fallback"
    - "Fail-fast pre-flight guard on required env before mutating live state"
key-files:
  created: []
  modified:
    - deploy/deploy.sh
    - src/server/index.js
    - deploy/DEPLOY.md
decisions:
  - "DEPLOY.md WR-04 resolved via the 'reword runbook' branch (document fail-open) rather than changing code to fail-closed — matches plan scope."
metrics:
  duration: ~10m
  completed: 2026-07-07
  tasks: 3
  files: 3
---

# Phase quick Plan 260707-otq: Harden deploy.sh and related files Summary

Hardened the D-11 deployment path per 05-REVIEW.md: atomic dist swap with dist.bak rollback (CR-01), fail-fast ADMIN_SECRET pre-flight guard (WR-03), startup `.catch` on the direct entrypoint (WR-01), PORT-unset warning (WR-02), and DEPLOY.md fail-open wording correction (WR-04).

## What Was Built

**Task 1 — deploy/deploy.sh (CR-01 + WR-03):**
- Build now stages to `dist.new` via `npm run build -- --outDir ../../dist.new --emptyOutDir` (outDir resolves relative to Vite `root: 'src/client'`, landing at repo-root `dist.new`). On success: `rm -rf dist.bak`, `mv dist dist.bak` (tolerant of first-run absence via `[[ -d dist ]] &&`), `mv dist.new dist`. With `set -euo pipefail` a failed build aborts before the swap, leaving the live `dist/` intact.
- Pre-flight guard placed after `cd` and before the build: `[[ ! -f .env ]] || ! grep -Eq '^ADMIN_SECRET=.+' .env` → stderr error + `exit 1`. Anchored at line start with a required non-empty value so commented references and empty assignments do not satisfy it.

**Task 2 — src/server/index.js (WR-01 + WR-02):**
- `isMainModule` chain gained `.catch((err) => { console.error('[index.js] failed to start server:', err); process.exit(1); })`.
- PORT-unset `console.warn` (mirroring the socketHandlers.js ADMIN_SECRET pattern) emitted inside the `isMainModule` block guarded on `!process.env.PORT`, so it fires only on the direct entrypoint path and not when tests import `startServer(port)` with an explicit argument. `startServer` signature, socket.io config, expiry interval, and export unchanged.

**Task 3 — deploy/DEPLOY.md (WR-04):**
- Section 5 bullet reworded to state the server does NOT refuse to start without ADMIN_SECRET (fail-open): it starts with admin auth DISABLED, and the operator must always verify via section 8's `pm2 logs codearena` check. Catalan tone and T-05-02 / T-04.1-05 threat references preserved.

## Verification

- `bash -n deploy/deploy.sh` passes; staging/swap and ADMIN_SECRET guard present (dist.new, dist.bak, exit 1 confirmed).
- `node --check src/server/index.js` passes; `.catch`, `process.exit(1)`, and PORT warning present.
- `node --test test/*.test.js` → 94 tests, 94 pass, 0 fail (no regressions).
- DEPLOY.md contains both `DESHABILITADA` and `secció 8` references; no longer implies a hard "obligatori" guarantee.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: deploy/deploy.sh (commit ce92e9e)
- FOUND: src/server/index.js (commit fb5859c)
- FOUND: deploy/DEPLOY.md (commit 08df821)
