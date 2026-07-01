# Stack Research

**Domain:** Real-time gamified classroom webapp (team-based drag & drop code-learning game, admin-controlled phases, live preview, auto-scoring)
**Researched:** 2026-07-01
**Confidence:** MEDIUM (versions and library maintenance status verified via multiple cross-checked web sources; no official Context7-indexed docs were fetched in this pass — treat exact version numbers as current-as-of-July-2026 and re-verify at `npm install` time)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.x (Active LTS) | Backend runtime | Current Active LTS as of mid-2026, supported through Apr 2028. Node 22 is now Maintenance-only LTS; Node 26 is "Current" and won't be LTS until Oct 2026 — too new for a production classroom tool that needs stability, not bleeding edge. |
| Socket.io | 4.8.x (server + client) | Real-time admin↔team sync, reconnection, room-based broadcast | Mature, battle-tested, and — critically for this project — ships a **built-in `connectionStateRecovery`** feature (since 4.6) that automatically restores a client's socket id, rooms, `socket.data`, and any packets missed during a disconnect. This directly satisfies the "F5 refresh must not lose state" requirement with near-zero custom code, instead of hand-rolling a reconnection protocol. |
| Vite | 7.x (prefer 7.3.x over bleeding-edge 8.x for a small production app) | Frontend dev server + build/bundle | Vite 8.1.x is newest (Rolldown bundler), but 7.3.x is the more battle-tested line still receiving security patches, with a simpler/slower-changing toolchain. For a project with a hard 15-20 min classroom deadline and no room for tooling surprises, prefer the boring, well-trodden minor. Either way, Vite is the de facto standard dev server/bundler for vanilla or lightly-framework'd frontends in 2026 — instant HMR, zero-config for plain JS/CSS/HTML, trivial multi-page setup (admin.html + client.html as separate Vite entry points). |
| Express | 4.x | Thin HTTP layer under Socket.io, serves built static frontend | Socket.io needs an `http.Server` to attach to; Express is the standard, minimal way to get one plus static file serving and any small REST needs (e.g. serving the built Vite assets). Do not reach for a heavier framework (Nest, Fastify-with-plugins) — this app has no REST API surface to speak of. |

### Frontend approach: Vanilla JS + Vite (no framework)

This is the single most consequential stack decision and deserves explicit justification, since the framework choice was left open.

**Recommendation: plain JavaScript (ES modules) + Vite, no React/Vue/Svelte.**

Rationale:
- The whole UI is a thin rendering layer over Socket.io events — `socket.on('phase:change', render)`, `socket.on('team:update', render)` — there is no complex client-side state graph, routing, or component tree that justifies a framework's overhead.
- Scope is fixed: 2 screens (Admin, Client), 3 phases, 1 exercise. A framework buys reusability and scale that this project will never need (CLAUDE.md's own simplicity mandate: "¿Se puede hacer esto en menos líneas?").
- Every framework evaluated forces a tradeoff the project doesn't need to take on:
  - **React** — largest ecosystem, but heaviest (42-45KB gzip baseline) and most ceremony (useState/useEffect/reconciliation) for what is fundamentally "receive socket event → update DOM". Its flagship drag & drop library (`dnd-kit`) is React-only, which would lock the drag & drop implementation to a React wrapper for no functional gain.
  - **Vue** — good docs, easy on-ramp, but still a full reactivity system + build-step SFCs for a 2-screen app.
  - **Svelte** — smallest bundle (3-12KB) and least boilerplate of the three frameworks, genuinely the best *framework* pick if one is wanted — but it's still a compiler/build layer solving a problem (component reactivity at scale) this project doesn't have.
  - **Vanilla + Vite** — Vite gives you the dev-server ergonomics (instant reload, ES module imports, asset bundling) *without* any framework's runtime or abstraction tax. Socket.io's event-driven model maps directly onto small, explicit `render()` functions — no virtual DOM needed for a handful of DOM nodes per screen.
- If mid-project the team discovers real componentization pain (unlikely at this scope), Svelte is the documented fallback — not React/Vue.

**Confidence: MEDIUM** — this is an opinionated architectural call informed by the project's explicit scope (2 screens, fixed exercise, 15-20 min session, cognitive-load-minimizing UI), not a universal truth about frontend frameworks.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SortableJS | 1.15.x | Drag & drop block editor (Fase 1 HTML) — dragging blocks from the "calaix" (drawer) into structure slots with snap-to-nearest-valid-slot / return-to-drawer-on-invalid-drop | Framework-agnostic (works with plain JS, no wrapper needed), actively maintained (30.9k GitHub stars, 1.1M weekly downloads), designed for exactly this "drag between grouped lists" shape via its `group`/`put`/`pull` options. The "snap back to drawer if invalid" behavior is a well-documented pattern: use `pull: 'clone'` for invalid target zones and remove the clone in `onEnd` if the drop landed outside a valid slot. This is a few lines of custom logic, not a missing feature. |
| DOMPurify | 3.x | Defense-in-depth sanitization of any HTML assembled from team block choices before it's serialized into the preview `srcdoc` | Even though block content is constrained (no free-text code entry per the Out-of-Scope list), sanitize server-generated/combined HTML before injecting into `srcdoc` as cheap insurance against an edge case in block data leaking a stray `<script>` or attribute-based handler. Low cost, meaningfully reduces XSS surface between teams' browsers. |
| Lucide (or Feather) icons | latest | Clean, minimal SVG iconography for the "mínim soroll visual" requirement | Static SVG icon set, no JS runtime, trivially inlined or imported per-icon via Vite — matches the "icons over text" cognitive-load requirement without pulling in an icon font or component library. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite (multi-page mode) | Bundles `admin.html` and `client.html` as separate entry points from one project | Configure `build.rollupOptions.input` with both HTML files; avoids needing a router or SPA framework for what is really 2 static pages. |
| PM2 | Process manager for the Node.js server on the VPS | Industry-standard for single-VPS Node deployments: auto-restart on crash, start-on-boot (`pm2 startup`), built-in log rotation, config-as-code via an ecosystem file. Chosen over raw systemd because it gives Node-specific ergonomics (zero-downtime `pm2 reload`, log management) with far less unit-file boilerplate — appropriate for a solo-maintained classroom tool where operational simplicity matters more than deep OS integration. |
| Nginx | Reverse proxy / TLS termination in front of the Node process | Required by the existing VPS constraint. See Version Compatibility below for the exact WebSocket-upgrade directives — this is the single most common way self-hosted Socket.io deployments break in production. |

## Installation

```bash
# Core
npm install express socket.io

# Frontend build tooling
npm install -D vite

# Drag & drop + sanitization + icons
npm install sortablejs dompurify lucide

# Process management (installed globally on the VPS, not a project dependency)
npm install -g pm2
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Vanilla JS + Vite | Svelte 5 (SvelteKit not needed — plain Svelte + Vite) | If the team-vs-admin UI grows enough distinct, reusable, stateful components that hand-rolled `render()` functions start duplicating logic — Svelte's near-zero runtime cost makes it the lowest-regret upgrade path. |
| Vanilla JS + Vite | React + dnd-kit | Only if the project scope expands drastically (e.g., becomes a multi-exercise authoring platform with a real admin content-editor UI) — dnd-kit's fine-grained collision detection APIs pay off at that scale, but requires committing to React everywhere. |
| SortableJS | dnd-kit | If the frontend is React (see above) — dnd-kit is the idiomatic, actively-maintained choice for React and has 3.1M weekly downloads, but it does not work outside React without a custom adapter. |
| PM2 | systemd unit file | If the deployment is already standardized on systemd/Ansible infra management, or if absolute minimal process overhead matters more than Node-specific tooling. Loses cluster mode, zero-downtime reload, and ecosystem-file config-as-code. |
| Express | Raw `http.createServer` | If you want to shave the one dependency — viable since this app has almost no REST surface, but Express's static-file serving (`express.static`) is one line vs. hand-rolling MIME-type handling; not worth the trade for a project this size. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| interact.js | Provides native drag-and-drop "snapping" modifiers which look like a perfect fit on paper, but the package (`interactjs`, 1.10.27) has **not been updated in ~2 years** — effectively unmaintained with 58 open issues. Not a bet worth making for a production tool, however small. | SortableJS (actively maintained, same "framework-agnostic" property) |
| React (as default choice) | Steepest learning curve and heaviest runtime (42-45KB+ gzip) of the evaluated frameworks, for an app whose entire client logic is "render DOM in response to socket events." Also drags in `dnd-kit`-as-React-only as a follow-on dependency, coupling the drag & drop layer to a framework choice this project doesn't need. | Vanilla JS + Vite (or Svelte if a framework is truly wanted) |
| Hand-rolled reconnection/state-recovery protocol | Socket.io 4.6+ already ships `connectionStateRecovery` (restores socket id, rooms, `socket.data`, and missed events on reconnect within a configurable window). Building a custom "resync full state on reconnect" RPC duplicates a feature that's already battle-tested and one config option away. | Socket.io's built-in `connectionStateRecovery` option, layered with an explicit "send full current phase/team state" fallback event for the rare case recovery fails (e.g., disconnect longer than `maxDisconnectionDuration`) |
| Default Nginx proxy timeouts (60s) | Idle WebSocket connections get dropped after 60s by default, which will silently disconnect a team's admin-controlled countdown mid-phase. This is the most common way self-hosted Socket.io apps break. | Explicit `proxy_read_timeout` / `proxy_send_timeout` set high (see Version Compatibility) plus Socket.io's own ping/pong keepalive |
| Database (Postgres/Mongo/SQLite) for game state | Explicitly out of scope per PROJECT.md — 15-20 min sessions don't need persistence, and adding a DB adds an operational dependency (connection pooling, migrations, backup) with zero payoff at this scale. | In-memory JS objects/Maps on the Node server, scoped to the process lifetime |

## Stack Patterns by Variant

**If the "1 exercici fix" constraint is relaxed in a future milestone (admin-configurable exercises):**
- Introduce a lightweight JSON exercise schema and a small validation layer (e.g., Zod) — still no database needed if exercises are authored as JSON files shipped with the app.
- Do NOT reach for a CMS or database at that point either; file-based config keeps ops simple as long as content changes require a deploy (acceptable for a teacher-authored tool).

**If team count ever exceeds a single classroom (multi-room / multi-session support):**
- Socket.io rooms/namespaces already model this correctly (one namespace or room per class session) — no infrastructure change needed until you outgrow a single Node process, which is far beyond the stated 4-6 teams + 1 admin scale.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| socket.io@4.8.x | Node.js 24.x, Vite 7.x/8.x (frontend build is independent of backend runtime) | No known incompatibilities; Socket.io's transport layer is framework-agnostic. |
| vite@7.3.x / 8.x | Node.js 20.19+ / 22.12+ (both satisfied by Node 24 LTS) | Confirm exact Node floor at install time — Vite's Node version floor has moved with recent majors. |
| Nginx reverse proxy ↔ socket.io | Requires: `proxy_http_version 1.1;` `proxy_set_header Upgrade $http_upgrade;` `proxy_set_header Connection "upgrade";` plus long `proxy_read_timeout`/`proxy_send_timeout` (e.g. 3600s+) and disabled proxy buffering (`proxy_buffering off;`) on the Socket.io location block. If running more than one Node process behind Nginx (not needed at this scale, but noted for completeness), enable sticky sessions (`ip_hash` or cookie-based) so the long-polling handshake and the eventual WS upgrade land on the same backend. | Single-process deployment (this project's scale) sidesteps the sticky-session concern entirely — one more reason a single Node + PM2 process is sufficient, no load balancer needed. |
| sortablejs@1.15.x | Any browser Vite targets by default (evergreen Chromium/Firefox/Safari) — classroom Windows PCs running a modern browser are well within support. | No framework adapter needed for vanilla usage. |

## Sources

- https://socket.io/docs/v3/reverse-proxy/ — Nginx reverse proxy configuration (official Socket.io docs) — MEDIUM confidence (web-verified, not Context7-fetched this pass)
- https://socket.io/docs/v4/connection-state-recovery — official docs on `connectionStateRecovery` — MEDIUM confidence
- https://www.npmjs.com/package/socket.io — version 4.8.3 confirmed current as of Dec 2025 — MEDIUM confidence
- https://endoflife.date/nodejs — Node.js 24 Active LTS status — MEDIUM confidence
- https://vite.dev/releases — Vite 8.1.x current, 7.3.x/6.4.x still patched — MEDIUM confidence
- https://github.com/SortableJS/Sortable — maintenance status, swap-threshold/group features — MEDIUM confidence
- https://github.com/taye/interact.js — confirms ~2 years since last release (1.10.27) — MEDIUM confidence
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc — srcdoc + sandbox isolation semantics — MEDIUM confidence
- npm trends comparison (dnd-kit vs SortableJS vs interact.js weekly downloads/stars) — MEDIUM confidence
- Cross-referenced framework comparison articles (Svelte/React/Vue bundle sizes, learning curve) — LOW-MEDIUM individually, MEDIUM as a cross-checked cluster (multiple independent sources agreed on relative bundle sizes and ceremony tradeoffs)

---
*Stack research for: Real-time gamified classroom webapp*
*Researched: 2026-07-01*
