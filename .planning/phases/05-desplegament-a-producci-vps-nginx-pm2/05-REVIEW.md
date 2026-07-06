---
phase: 05-desplegament-a-producci-vps-nginx-pm2
reviewed: 2026-07-06T23:51:20Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - deploy/deploy.sh
  - src/server/index.js
  - deploy/DEPLOY.md
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-06T23:51:20Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the D-11 deploy script (`deploy/deploy.sh`), the server entrypoint that now
loads `dotenv` at boot (`src/server/index.js`), and the operational runbook
(`deploy/DEPLOY.md`). The runbook itself is thorough and self-aware about several
real pitfalls (WebSocket-only failure mode, `root`-deployment risk, `cwd`
sensitivity for `dotenv`). However, the deploy script has a genuine data-loss/outage
risk baked into its happy path (`npm run build` unconditionally empties `dist/`
before the new build succeeds, with no atomic swap or rollback), and there are two
places where the code's actual fail-open/fail-silent behavior is weaker than what
the documentation promises (`ADMIN_SECRET` "obligatori" wording vs. warn-and-continue
code; `PORT`'s silent default vs. the single-source-of-truth contract). The
`isMainModule` boot path in `index.js` also has an unhandled-promise-rejection gap
that the PM2-facing `server.cjs` wrapper (out of scope, but referenced for context)
already fixed — the direct/dev entrypoint did not receive the same treatment.

None of these are exploitable by an external attacker directly, but several are
real robustness/outage risks for a tool whose own constraints document ("no hi ha
marge per repetir") make a mid-session outage effectively unrecoverable.

## Critical Issues

### CR-01: `npm run build` wipes production static assets before success is confirmed — no atomic swap or rollback

**File:** `deploy/deploy.sh:36-40`
**Issue:** `vite.config.js` sets `build.emptyOutDir: true` for the `dist/` output
directory. Vite empties `dist/` synchronously at the *start* of `vite build`,
before any bundling work happens, and only writes the new files at the end once
bundling succeeds. `deploy/deploy.sh` runs `npm run build` directly against the
live `dist/` directory that the still-running (pre-reload) PM2 process is serving
via `express.static('dist')` (`src/server/index.js:12`).

Consequence: from the moment the build step starts until it either completes or
fails, every static asset request (JS/CSS/HTML for any team reloading a page or
joining) 404s, because the files have already been deleted from disk. If the build
*fails* (transient `npm ci`/`npm run build` network hiccup, disk-full, a broken
commit that was `git pull`-ed, etc.), `set -e` correctly aborts the script *before*
`pm2 reload` — but `dist/` is left empty and the old PM2 process keeps running with
nothing to serve. There is no rollback: the script has no backup of the previous
`dist/`, and "Desplegament complet." is simply never printed, but the app is now
broken until someone manually re-runs a successful build.

Given the project's own explicit constraint ("Temps de sessió: dinàmica de 15-20
min — la robustesa ... és crítica perquè no hi ha marge per repetir"), a redeploy
attempted for a quick fix mid-session (or a redeploy whose `npm ci`/build happens to
fail) can turn a minor issue into a full-class outage with no built-in recovery
path.

**Fix:** Build to a staging directory and swap atomically only after a successful
build, and keep the previous `dist/` as a fallback:
```bash
echo "==> [3/4] npm run build"
npm run build -- --outDir dist.new
rm -rf dist.bak
mv dist dist.bak 2>/dev/null || true
mv dist.new dist
```
(or equivalently, set `emptyOutDir: false` in `vite.config.js` and build into a
versioned/staging directory, then `pm2 reload` only once the new `dist/` is fully in
place). At minimum, document that `deploy/deploy.sh` must never be run during an
active class session.

## Warnings

### WR-01: `startServer().then()` has no `.catch()` — unhandled rejection on startup failure

**File:** `src/server/index.js:48-52`
**Issue:**
```js
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  startServer().then(({ port }) => {
    console.log(`CodeArena server listening on http://localhost:${port}`);
  });
}
```
If `httpServer.listen(port)` fails (e.g. `EADDRINUSE`, insufficient permission on a
privileged port, or `PORT` misconfigured), the returned promise rejects via
`httpServer.once('error', reject)` (line 39), but nothing here catches it. This
produces an unhandled promise rejection with a generic stack trace instead of a
clear, actionable log line — and on modern Node (which crashes the process by
default on unhandled rejections) it's a hard crash with no diagnostic context about
*why* the port failed to bind. Note this path is only used for the
`npm run server` / `npm start` / direct-node entrypoints — the PM2 production path
(`server.cjs`) already wraps its own call with `.catch(err => { console.error(...);
process.exit(1); })`, so production is not directly exposed to this, but the file
under review still ships this gap on its own documented entrypoint.
**Fix:**
```js
if (isMainModule) {
  startServer()
    .then(({ port }) => {
      console.log(`CodeArena server listening on http://localhost:${port}`);
    })
    .catch((err) => {
      console.error('[index.js] failed to start server:', err);
      process.exit(1);
    });
}
```

### WR-02: `PORT` silently defaults to 3000 with no warning, despite being documented as the single source of truth

**File:** `src/server/index.js:10`
**Issue:** `export function startServer(port = process.env.PORT || 3000)` silently
falls back to `3000` if `process.env.PORT` is unset or `dotenv` fails to locate
`.env` (the exact "Pitfall 4" scenario `deploy/DEPLOY.md:132-135` and
`deploy/deploy.sh:8-9` both call out as a real, previously-encountered failure
mode). `deploy/DEPLOY.md:62-65` establishes `.env`'s `PORT` as the sole, contractual
source that must exactly match the Nginx reverse-proxy target (`8011`). Unlike
`ADMIN_SECRET`, which has an explicit `console.warn` when unset
(`src/server/socketHandlers.js:47-53`), there is no equivalent signal here — a
misconfigured `.env`/cwd silently produces a server listening on the wrong port,
diagnosable only by noticing the log line says `3000` instead of `8011` (easy to
miss during a rushed deploy).
**Fix:** Mirror the `ADMIN_SECRET` pattern:
```js
if (!process.env.PORT) {
  console.warn('[index.js] PORT not set in environment — defaulting to 3000. ' +
    'In production this must match the Nginx reverse-proxy target (see DEPLOY.md).');
}
```

### WR-03: No automated pre-flight check that `.env`/`ADMIN_SECRET` is present before deploying

**File:** `deploy/deploy.sh:24-42`
**Issue:** `deploy/DEPLOY.md:127-129` and `:187-201` treat a missing
`ADMIN_SECRET` as a serious, security-relevant misconfiguration (admin
authentication silently disabled, "qualsevol client podria reclamar el rol
admin"), but the *only* safeguard against shipping a deploy with this broken is a
human manually reading `pm2 logs codearena` after the fact (section 8 of the
runbook). `deploy/deploy.sh` does not check for `.env`'s existence or that
`ADMIN_SECRET` is set before proceeding, so a deploy that runs against a VPS where
`.env` was accidentally deleted/reset (e.g. wrong directory, botched restore) would
complete "successfully" (`pm2 reload` succeeds, since the app still starts, just
insecurely) with no automated signal.
**Fix:** Add a fail-fast guard before step 4:
```bash
if ! grep -q '^ADMIN_SECRET=.\+' .env 2>/dev/null; then
  echo "ERROR: ADMIN_SECRET missing or empty in .env — refusing to deploy." >&2
  exit 1
fi
```

### WR-04: DEPLOY.md overstates `ADMIN_SECRET` as "obligatori" when the code fails open, not closed

**File:** `deploy/DEPLOY.md:127-129`
**Issue:** The runbook states `ADMIN_SECRET és obligatori en producció` (is
mandatory), but the actual implementation in `src/server/socketHandlers.js:46-53`
does not enforce this — if unset, it only logs a `console.warn` and continues,
granting admin to any client that declares `role: 'admin'`. "Obligatori" reads as a
hard requirement/guarantee; the real behavior is "recommended, and if you forget,
the app will run anyway with the security control disabled." This mismatch between
documented guarantee and actual fail-open behavior can lead an operator to
under-verify (trusting the word "obligatori" to mean the server would refuse to
start otherwise).
**Fix:** Either reword the runbook to be explicit about the fail-open behavior
("si no s'estableix, el servidor arrenca igualment amb l'autenticació admin
DESHABILITADA — comprova-ho sempre a la secció 8"), or change the code to fail
closed in production (e.g. refuse to start when `NODE_ENV=production` and
`ADMIN_SECRET` is unset), and update the doc to match whichever behavior is chosen.

## Info

### IN-01: `deploy/deploy.sh` has no concurrency guard

**File:** `deploy/deploy.sh:24-42`
**Issue:** Nothing prevents two overlapping invocations of the script (e.g. two SSH
sessions run by different people) from racing on `npm ci` (which deletes and
reinstalls `node_modules`) and `npm run build` (which empties `dist/`, see CR-01),
which could corrupt either directory mid-install.
**Fix:** Add a simple lock, e.g. `flock -n /tmp/codearena-deploy.lock -c '...'` or a
PID-file guard at the top of the script.

### IN-02: Runbook doesn't reiterate mandatory WS verification for subsequent deploys

**File:** `deploy/DEPLOY.md:157-166`
**Issue:** Section 7's WebSocket verification is framed as "OBLIGATÒRIA," but that
framing appears attached to the initial deployment flow. Section 6's "Desplegaments
subsegüents" subsection only says to run `bash deploy/deploy.sh` and describes what
the script does — it does not repeat that section 7's verification should be
re-run after routine deploys too (e.g. if a change to the server's Socket.io setup
ships in a routine update).
**Fix:** Add a one-line reminder at the end of the "Desplegaments subsegüents"
subsection pointing back to section 7 whenever a deploy touches server-side code.

### IN-03: `git pull` has no branch/HEAD sanity check

**File:** `deploy/deploy.sh:30-31`
**Issue:** The script runs a bare `git pull` with no check that the VPS checkout is
on the expected branch (or not in a detached-HEAD state). If the VPS repo were ever
left on a different branch or a detached HEAD (e.g. from manual debugging via
`git checkout <sha>`), `git pull` could silently do the wrong thing (fail with a
generic message, or fast-forward a branch nobody intended to deploy from).
**Fix:** Add a guard, e.g.:
```bash
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "ERROR: expected to deploy from 'main', currently on '$branch'." >&2
  exit 1
fi
```

---

_Reviewed: 2026-07-06T23:51:20Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
