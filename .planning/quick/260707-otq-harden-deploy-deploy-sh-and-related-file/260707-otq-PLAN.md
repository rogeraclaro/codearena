---
phase: quick
plan: 260707-otq
type: execute
wave: 1
depends_on: []
files_modified:
  - deploy/deploy.sh
  - src/server/index.js
  - deploy/DEPLOY.md
autonomous: true
requirements: [CR-01, WR-01, WR-02, WR-03, WR-04]
must_haves:
  truths:
    - "A failed or slow `npm run build` during deploy no longer leaves the live app with an empty dist/ — the previous build keeps serving until the new one is fully in place."
    - "A deploy against a VPS with a missing/empty ADMIN_SECRET in .env fails fast (exit 1) instead of shipping an insecure server."
    - "A direct/dev server startup failure (e.g. EADDRINUSE) logs a clear actionable error and exits 1 instead of producing an unhandled promise rejection."
    - "Starting the server with PORT unset logs a warning mirroring the ADMIN_SECRET pattern."
    - "DEPLOY.md accurately describes ADMIN_SECRET's fail-open behavior rather than implying the server refuses to start without it."
  artifacts:
    - deploy/deploy.sh
    - src/server/index.js
    - deploy/DEPLOY.md
  key_links:
    - "deploy.sh atomic swap ↔ vite.config.js emptyOutDir behavior (build must NOT wipe the live dist/)"
    - "deploy.sh ADMIN_SECRET pre-flight ↔ socketHandlers.js fail-open warning (script enforces what code only warns about)"
---

<objective>
Harden the D-11 deployment path per 05-REVIEW.md: fix the critical build-wipes-live-dist outage risk (CR-01), add a fail-fast ADMIN_SECRET pre-flight guard (WR-03), close the unhandled-rejection gap on the direct entrypoint (WR-01), add a PORT-unset warning (WR-02), and correct the DEPLOY.md ADMIN_SECRET wording to match the code's actual fail-open behavior (WR-04).

Purpose: The project constraint "no hi ha marge per repetir" makes a mid-session outage effectively unrecoverable; these changes remove the single critical outage path in the deploy script and align docs/behavior so operators do not under-verify.
Output: Hardened deploy/deploy.sh, src/server/index.js, and deploy/DEPLOY.md.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/05-desplegament-a-producci-vps-nginx-pm2/05-REVIEW.md
@deploy/deploy.sh
@src/server/index.js
@deploy/DEPLOY.md
@vite.config.js

# Interface notes for the executor:
# - vite.config.js sets `root: 'src/client'` and `build.outDir: '../../dist'` with `emptyOutDir: true`.
#   Vite CLI `--outDir` is resolved RELATIVE TO `root` (src/client), NOT the repo root. So to stage the
#   build at repo-root `dist.new`, the override must be `--outDir ../../dist.new` (plus `--emptyOutDir`
#   since the target is outside root, matching the existing config's intent).
# - socketHandlers.js already emits a `console.warn` (fail-open) when ADMIN_SECRET is unset — it does NOT
#   refuse to start. server.cjs (PM2 wrapper, out of scope) already has a .catch; index.js's direct
#   entrypoint does not.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Harden deploy.sh — atomic dist swap (CR-01) + ADMIN_SECRET pre-flight guard (WR-03)</name>
  <files>deploy/deploy.sh</files>
  <action>
Fix CR-01 (per 05-REVIEW.md:47-85): the current `npm run build` step empties the live dist/ before the new build succeeds while PM2 still serves it via express.static, with no rollback. Replace the `==> [3/4] npm run build` step so the build goes to a staging directory and is swapped in atomically only on success, keeping the prior build as a fallback.

Because vite.config.js uses `root: 'src/client'` and `outDir: '../../dist'`, the Vite CLI `--outDir` override resolves relative to `root` — so stage to `../../dist.new` (which lands at repo-root `dist.new`) and pass `--emptyOutDir` so Vite empties the out-of-root staging dir without prompting. After a successful build: remove any stale `dist.bak`, move the current `dist` to `dist.bak` (tolerating its absence on a first run), then move `dist.new` into place as `dist`. The npm build invocation must forward the extra args, e.g. `npm run build -- --outDir ../../dist.new --emptyOutDir`. With `set -euo pipefail`, a failed build aborts before the swap, so the live `dist/` (still being served) is left untouched.

Fix WR-03 (per 05-REVIEW.md:148-167): add a fail-fast pre-flight guard that refuses to deploy when `.env` is missing or has an empty/absent ADMIN_SECRET. Place it early in the script — after the `cd "$(dirname "$0")/.."` line and before the build step — so a missing secret never triggers a dist swap. Use a grep that requires a non-empty value, printing an error to stderr and `exit 1` on failure. Match ADMIN_SECRET only at the start of a line to avoid matching commented references (anchor with `^ADMIN_SECRET=` and require at least one following character).

Keep the existing step-numbering comment style ("==> [N/4] ...") coherent; the guard is a pre-flight check, not a numbered step. Do NOT touch git pull, npm ci, or the pm2 reload logic. Do NOT add the IN-01/IN-02/IN-03 informational suggestions — they are out of scope for this task.
  </action>
  <verify>
    <automated>bash -n deploy/deploy.sh && grep -q 'dist.new' deploy/deploy.sh && grep -q 'dist.bak' deploy/deploy.sh && grep -q 'ADMIN_SECRET' deploy/deploy.sh && grep -Eq 'exit 1' deploy/deploy.sh && echo OK</automated>
  </verify>
  <done>deploy/deploy.sh passes `bash -n` syntax check; the build stages to dist.new and swaps atomically keeping dist.bak; a pre-flight guard exits 1 when ADMIN_SECRET is missing/empty in .env, positioned before the build step.</done>
</task>

<task type="auto">
  <name>Task 2: Harden index.js entrypoint — .catch on startup (WR-01) + PORT-unset warning (WR-02)</name>
  <files>src/server/index.js</files>
  <action>
Fix WR-01 (per 05-REVIEW.md:89-124): the `isMainModule` block calls `startServer().then(...)` with no `.catch()`, so a listen failure (EADDRINUSE, privileged port, misconfigured PORT) becomes an unhandled promise rejection instead of a clear log. Add a `.catch((err) => { console.error('[index.js] failed to start server:', err); process.exit(1); })` to the existing chain. Keep the existing success `console.log` and its eslint-disable comment intact.

Fix WR-02 (per 05-REVIEW.md:126-146): `startServer(port = process.env.PORT || 3000)` silently defaults to 3000 with no signal, unlike the ADMIN_SECRET warning pattern in socketHandlers.js. Add a `console.warn` when `process.env.PORT` is unset, noting that in production it must match the Nginx reverse-proxy target (reference DEPLOY.md). Mirror the ADMIN_SECRET warning style. Place this warning so it fires on the actual startup path — emit it inside the `isMainModule` block (or at the top of startServer) before/at binding; do NOT emit it merely on module import in a way that would fire during tests that import startServer with an explicit port argument. Prefer guarding on `!process.env.PORT` at the point the direct entrypoint runs, consistent with how the port default is actually consumed.

Do NOT change the startServer signature, the socket.io config, the expiry interval, or the export. Surgical additions only.
  </action>
  <verify>
    <automated>node --check src/server/index.js && grep -q "failed to start server" src/server/index.js && grep -q "process.exit(1)" src/server/index.js && grep -q "PORT" src/server/index.js && node --test test/*.test.js 2>/dev/null; echo "exit:$?"</automated>
  </verify>
  <done>src/server/index.js passes `node --check`; the isMainModule chain has a `.catch` that logs and exits 1; a PORT-unset warning mirroring the ADMIN_SECRET pattern is present; existing tests still pass (or are unaffected).</done>
</task>

<task type="auto">
  <name>Task 3: Correct DEPLOY.md ADMIN_SECRET wording to match fail-open behavior (WR-04)</name>
  <files>deploy/DEPLOY.md</files>
  <action>
Fix WR-04 (per 05-REVIEW.md:169-185): DEPLOY.md:127-129 states `ADMIN_SECRET és obligatori en producció`, implying a hard guarantee, but socketHandlers.js fails open — it only logs a `console.warn` and continues, granting admin to any client declaring `role: 'admin'`. Reword the section 5 bullet (and any equivalent phrasing) to be explicit about the fail-open behavior: if ADMIN_SECRET is unset the server starts anyway with admin authentication DISABLED, and the operator must always verify via section 8's `pm2 logs codearena` check (looking for the ADMIN_SECRET-not-set warning). Keep it in Catalan, consistent with the document's tone, and keep the existing T-05-02 / T-04.1-05 threat references.

Do NOT change the code behavior — this task is documentation only (the "reword the runbook" branch of the reviewer's fix, not the "change code to fail closed" branch). Do NOT alter unrelated sections (IN-02's section 6/7 reminder is out of scope for this task).
  </action>
  <verify>
    <automated>grep -qi 'DESHABILITADA' deploy/DEPLOY.md && grep -qi 'secció 8' deploy/DEPLOY.md && echo OK</automated>
  </verify>
  <done>deploy/DEPLOY.md section 5's ADMIN_SECRET note explicitly describes the fail-open behavior (server starts with admin auth disabled if unset) and directs the operator to always verify via section 8's pm2 logs check, rather than implying a hard "obligatori" guarantee.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| operator→VPS deploy | Deploy script runs with root privileges; a botched deploy can silently disable admin auth or take the app down mid-session |
| client→admin role | socketHandlers.js grants admin on declared role when ADMIN_SECRET is unset (fail-open) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-Q-01 | Denial of Service | deploy/deploy.sh build step | critical | mitigate | Atomic dist swap keeps prior build serving on build failure (Task 1, CR-01) |
| T-Q-02 | Elevation of Privilege | ADMIN_SECRET fail-open | high | mitigate | Pre-flight guard refuses to deploy with missing/empty ADMIN_SECRET (Task 1, WR-03); DEPLOY.md documents residual fail-open so operator verifies (Task 3, WR-04) |
| T-Q-03 | Denial of Service | index.js startup failure | medium | mitigate | .catch logs actionable error + exits 1 instead of unhandled rejection (Task 2, WR-01) |
</threat_model>

<verification>
- `bash -n deploy/deploy.sh` passes; staging/swap and ADMIN_SECRET guard present.
- `node --check src/server/index.js` passes; `.catch` and PORT warning present.
- `node --test test/*.test.js` still passes (no regressions from index.js changes).
- DEPLOY.md no longer implies a hard ADMIN_SECRET guarantee; documents fail-open + section 8 verification.
</verification>

<success_criteria>
All five 05-REVIEW.md findings closed: CR-01 (atomic build swap + rollback), WR-01 (.catch on entrypoint), WR-02 (PORT-unset warning), WR-03 (ADMIN_SECRET pre-flight guard), WR-04 (DEPLOY.md fail-open wording). No unrelated files touched; existing tests green.
</success_criteria>

<output>
Create `.planning/quick/260707-otq-harden-deploy-deploy-sh-and-related-file/260707-otq-SUMMARY.md` when done.
</output>
