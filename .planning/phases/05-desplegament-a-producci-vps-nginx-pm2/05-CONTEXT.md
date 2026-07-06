# Phase 5: Desplegament a producció (VPS + Nginx + PM2) - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fer que l'app funcioni de manera fiable al VPS de producció (`classe.masellas.info`), rere el reverse proxy Nginx que gestiona CloudPanel, amb WebSocket real verificat (no fallback a polling), PM2 supervisant el procés Node (ja construït a la Fase 04.1), i un procés de desplegament repetible. Fora d'abast: contingut de joc (ja tancat), provisioning del VPS/instal·lació d'Nginx/certbot (ja fets manualment via CloudPanel).

</domain>

<decisions>
## Implementation Decisions

### Domini i accés
- **D-01:** Subdomini de producció: `classe.masellas.info`.
- **D-02 [informational]:** El VPS ja existeix, amb CloudPanel instal·lat (Nginx i certbot ja gestionats per CloudPanel — no cal provisionar-los en aquesta fase). Constata un fet ja donat, no requereix cap tasca de pla pròpia.
- **D-03:** El codi es desplega sota un usuari no-root dedicat, a una ruta tipus `/home/<usuari>/codearena`.

### Tipus de site a CloudPanel
- **D-04:** Crear el site a CloudPanel com a **"Reverse Proxy"**, NO com a "Node.js" — el tipus "Node.js" de CloudPanel porta el seu propi supervisor de procés, que entraria en conflicte amb el PM2 + `ecosystem.config.cjs`/`server.cjs` ja construïts a la Fase 04.1 (el mecanisme de Reset de l'Admin depèn que sigui PM2 qui reviu el procés).
- **D-05:** El reverse proxy de CloudPanel apunta cap a `http://127.0.0.1:8011` — aquest és el port real assignat per CloudPanel per a aquest site, NO el `3000` per defecte d'`ecosystem.config.cjs`. Cal que el `.env` de producció defineixi `PORT=8011` (D-10) i que `ecosystem.config.cjs` en producció faci servir aquest valor (via el `.env`/`dotenv`, D-09) perquè el procés Node escolti al mateix port que CloudPanel espera.

### Nginx / WebSocket
- **D-06:** No es versiona cap fitxer `.conf` d'Nginx al repo — CloudPanel gestiona el vhost via la seva UI. En comptes d'això, el CONTEXT.md/documentació d'aquesta fase llista les directives clau que cal **verificar/afegir** al vhost generat per CloudPanel si no hi són per defecte: capçaleres `Upgrade`/`Connection` per l'upgrade WebSocket, `proxy_read_timeout`/`proxy_send_timeout` alts (per no tallar connexions idle durant una sessió de 15-20 min), i `proxy_buffering off`.
- **D-07:** Verificació obligatòria post-desplegament (Success Criteria #1 de la fase): amb les eines de xarxa del navegador, confirmar que Socket.io fa upgrade real a `websocket` i no cau silenciosament a `polling`.

### HTTPS/TLS
- **D-08:** Es desplega amb HTTPS (Let's Encrypt) des del principi — CloudPanel ja té certbot instal·lat i gestiona l'emissió/renovació del certificat per al subdomini via la seva UI un cop el DNS de `classe.masellas.info` apunti al VPS.

### Gestió de secrets (ADMIN_SECRET)
- **D-09:** S'afegeix la dependència `dotenv` al projecte i es crida `dotenv.config()` a l'arrencada (`server.cjs`/`src/server/index.js`), de manera que un fitxer `.env` real al VPS (basat en `.env.example`, mai versionat) sigui llegit automàticament sense canviar com `process.env` s'exposa a la resta del codi.
- **D-10:** Aquest `.env` de producció ha d'incloure com a mínim `ADMIN_SECRET` (obligatori — sense ell l'autenticació admin queda deshabilitada, T-04.1-05 transferit des de la Fase 04.1) i `PORT=8011` (obligatori en producció — ha de coincidir amb el port que espera el reverse proxy de CloudPanel, D-05).

### Procés de desplegament
- **D-11:** Es crea un script de desplegament versionat (p.ex. `deploy/deploy.sh`) que fa `git pull`, `npm ci`, `npm run build`, i `pm2 reload codearena` (reload, no restart, per minimitzar el tall si mai es fa servir amb usuaris connectats — encara que en la pràctica el desplegament es farà sempre fora d'hores de classe). S'executa manualment via SSH, no hi ha CI/CD en aquesta fase.

### Claude's Discretion
- Nom exacte i ubicació del script de desplegament dins de `deploy/` — l'estructura interna (variables, missatges de log) queda a criteri de la implementació, sempre que faci els 4 passos de D-11 en ordre.
- Format exacte de la llista de directives Nginx a verificar (D-06) — pot ser un bloc dins d'aquest mateix CONTEXT.md, un `RESEARCH.md`, o un petit doc de desplegament — el contingut (les 3 directives citades) és el que importa, no el fitxer exacte.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Estat previ de PM2 (Fase 04.1)
- `ecosystem.config.cjs` — configuració PM2 existent (port 3000, `autorestart`, `min_uptime`, `max_restarts`) que aquesta fase reutilitza sense canvis d'arquitectura.
- `server.cjs` — launcher CJS que arrenca `src/server/index.js` via PM2 (fallback CJS obligatori perquè PM2 en mode fork trenca el guard `isMainModule` d'ESM).
- `.planning/phases/04.1-millores-operatives-d-admin-tornar-fase-anterior-reset-servi/04.1-CONTEXT.md` §"Desplegament / PM2 (per D-06)" — decisions prèvies sobre PM2 com a mecanisme de restart, vàlides també en aquesta fase.
- `.planning/phases/04.1-millores-operatives-d-admin-tornar-fase-anterior-reset-servi/04.1-SECURITY.md` — amenaça T-04.1-05 (ADMIN_SECRET absent) transferida explícitament a aquesta fase.

### Requisits i abast
- `.planning/REQUIREMENTS.md` §"Desplegament (DEPL)" — DEPL-01 (WebSocket real rere Nginx), DEPL-02 (PM2 amb reinici automàtic, ja construït).
- `.planning/ROADMAP.md` §"Phase 5" — Success Criteria (3 punts): WebSocket real verificat, PM2 amb reinici automàtic, sessió completa jugable de cap a cap contra el desplegament real.
- `.planning/PROJECT.md` §"Constraints" i §"Key Decisions" — VPS propi rere Nginx, PM2 com a supervisor (dev i prod, mateix mecanisme).

### Configuració d'entorn
- `.env.example` — variables actuals (`PORT`, `ADMIN_SECRET`) i el comentari explícit "no dotenv" que aquesta fase substitueix (D-09).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ecosystem.config.cjs` i `server.cjs` (Fase 04.1): infraestructura PM2 completa i ja verificada (autorestart en viu) — aquesta fase només l'ha d'exposar correctament al VPS, no reconstruir-la.
- `src/server/index.js` — `startServer(port = process.env.PORT || 3000)` ja llegeix `PORT` de l'entorn i serveix `dist/` amb `express.static` — compatible directament amb un reverse proxy.

### Established Patterns
- Un sol procés Node, sense balanceig de càrrega ni sessions enganxoses (sticky sessions) — no cal per a l'escala de 4-6 equips + 1 admin, i el reverse proxy de CloudPanel no ho complica.
- Cap variable d'entorn es carrega actualment via `dotenv` — `.env.example` documenta explícitament que el servidor llegeix `process.env` directament; D-09 introdueix `dotenv` per primer cop al projecte.

### Integration Points
- El site "Reverse Proxy" de CloudPanel ja apunta a `http://127.0.0.1:8011` (configurat per l'usuari) — el `.env`/PM2 en producció ha de fer escoltar el procés Node en aquest mateix port (`PORT=8011`).
- El script de desplegament (D-11) opera dins la ruta on es clona el repo a l'usuari no-root (D-03), i assumeix que PM2 ja està arrencat allà amb `npm run server:pm2` (script ja existent a `package.json`).

</code_context>

<specifics>
## Specific Ideas

- CloudPanel gestiona Nginx i certbot: no cal documentar-ne la instal·lació ni el provisioning, només com integrar-hi aquesta app concreta (tipus de site, port, directives WS a revisar).
- La verificació de WebSocket real (D-07) s'ha de fer amb les eines de xarxa del navegador (Network tab, filtrar per WS), no només assumir-ho perquè Socket.io "funciona" — Socket.io fa fallback silenciós a polling si l'upgrade falla, i això passaria desapercebut sense comprovar-ho explícitament.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Desplegament a producció (VPS + Nginx + PM2)*
*Context gathered: 2026-07-06*
