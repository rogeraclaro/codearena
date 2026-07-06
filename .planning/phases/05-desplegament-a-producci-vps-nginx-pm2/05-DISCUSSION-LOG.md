# Phase 5: Desplegament a producció (VPS + Nginx + PM2) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 5-Desplegament a producció (VPS + Nginx + PM2)
**Areas discussed:** VPS/Domini, Config Nginx, Secrets prod, HTTPS, Domini+TLS, .env loading, Flux deploy, Nom domini, Estat VPS, Ruta VPS, Nginx+CloudPanel

---

## VPS/Domini

| Option | Description | Selected |
|--------|-------------|----------|
| Ja tinc VPS i domini llestos | VPS actiu + domini apuntant-hi, dades concretes disponibles | |
| Tinc VPS però encara sense domini definitiu | VPS amb SSH, sense domini decidit — desplegament provisional per IP/subdomini | ✓ |
| Encara no tinc ni VPS ni domini | Caldria incloure provisioning bàsic | |

**User's choice:** Tinc VPS però encara sense domini definitiu
**Notes:** Resolt més endavant amb el nom exacte `classe.masellas.info`.

---

## Config Nginx

| Option | Description | Selected |
|--------|-------------|----------|
| Versionar-la al repo (deploy/nginx/*.conf) | Fitxer .conf versionat com a font de veritat | ✓ (inicial) |
| Només documentar els passos, config manual al servidor | Sense còpia al repo | |

**User's choice:** Versionar-la al repo (elecció inicial)
**Notes:** Revertit posteriorment quan es va descobrir que el VPS usa CloudPanel (veure secció "Nginx+CloudPanel" més avall) — decisió final: NO versionar `.conf`, només documentar directives clau.

---

## Secrets prod

| Option | Description | Selected |
|--------|-------------|----------|
| Fitxer .env al servidor + env_file a PM2 | .env real al VPS, llegit per l'ecosystem | ✓ |
| Variables directes al bloc `env` de l'ecosystem.config.cjs | Hardcoded al fitxer de config | |

**User's choice:** Fitxer .env al servidor + env_file a PM2
**Notes:** Implica afegir `dotenv` com a dependència (veure secció ".env loading").

---

## HTTPS

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, HTTPS amb Let's Encrypt/certbot | TLS des del principi | ✓ |
| No, HTTP n'hi ha prou per ara | Sense certificat, per ara | |

**User's choice:** Sí, HTTPS amb Let's Encrypt/certbot
**Notes:** Va requerir aclarir el conflicte amb "sense domini definitiu" (veure "Domini+TLS").

---

## Domini+TLS

| Option | Description | Selected |
|--------|-------------|----------|
| Aquesta fase inclou triar/configurar un subdomini | Es decideix ara un subdomini i s'apunta DNS | ✓ |
| Desplegar primer sense TLS, deixar HTTPS per després | Contradeia la resposta anterior sobre HTTPS | |

**User's choice:** Aquesta fase inclou triar/configurar un subdomini
**Notes:** Subdomini final: `classe.masellas.info`.

---

## .env loading

| Option | Description | Selected |
|--------|-------------|----------|
| Afegir dotenv com a dependència i carregar-lo a l'arrencada | Paquet `dotenv` + `.config()` a l'inici | ✓ |
| Exportar les variables via el shell/systemd abans d'aixecar PM2 | Sense dependència nova | |

**User's choice:** Afegir dotenv com a dependència i carregar-lo a l'arrencada

---

## Flux deploy

| Option | Description | Selected |
|--------|-------------|----------|
| Script simple de desplegament versionat | deploy/deploy.sh amb git pull + npm ci + build + pm2 reload | ✓ |
| Només passos manuals documentats, sense script | Sense script | |

**User's choice:** Script simple de desplegament versionat

---

## Nom domini

**User's choice:** `classe.masellas.info` (especificat directament pel usuari després de descartar "codearena.masellas.info" i l'opció genèrica "Un altre").

---

## Estat VPS

| Option | Description | Selected |
|--------|-------------|----------|
| Ja tinc Nginx instal·lat, certbot no | Cal instal·lar certbot | |
| Ni Nginx ni certbot instal·lats encara | Cal documentar/provisionar tot | |
| Ja tinc Nginx i certbot instal·lats | Només cal afegir el server block | |

**User's choice:** Resposta lliure — "ja tinc el nginx i certbot instal·lats [...] perquè tinc Cloudpanel instal·lat al VPS. Per cert, al panell de cloudpanel que tinc que crear? reverse proxy o node.js site?"
**Notes:** Va introduir informació nova (CloudPanel) que va canviar la resta de l'anàlisi — resposta de Claude: usar tipus de site **"Reverse Proxy"**, no "Node.js" (per no entrar en conflicte amb PM2 ja construït a la Fase 04.1). Aquesta resposta es va incorporar a CONTEXT.md com a D-04/D-05.

---

## Ruta VPS

| Option | Description | Selected |
|--------|-------------|----------|
| Usuari no-root dedicat, p.ex. /home/<usuari>/codearena | Pràctica estàndard de seguretat | ✓ |
| Ho decideixo jo / ho especifico ara | Usuari/ruta ja pensats | |

**User's choice:** Usuari no-root dedicat, p.ex. /home/<usuari>/codearena

---

## Nginx+CloudPanel

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, només documentar directives clau | Llista curta de directives a verificar al vhost de CloudPanel, sense .conf versionat | ✓ |
| Igualment vull un .conf de referència versionat | .conf d'exemple al repo tot i no aplicar-se directament | |

**User's choice:** Sí, només documentar directives clau
**Notes:** Aquesta resposta reemplaça la decisió inicial de "Config Nginx" (versionar .conf) amb el nou context de CloudPanel.

---

## Port del reverse proxy (correcció post-log)

**User's choice:** "el reverse proxy apunta cap a http://127.0.0.1:8011"
**Notes:** Corregeix la suposició inicial (port `3000` per defecte d'`ecosystem.config.cjs`) — el port real que CloudPanel espera és `8011`. Incorporat a CONTEXT.md com a D-05/D-10 actualitzats: `PORT=8011` és obligatori al `.env` de producció.

---

## Claude's Discretion

- Nom exacte i ubicació del script de desplegament dins de `deploy/`.
- Format exacte de la llista de directives Nginx a verificar (bloc dins CONTEXT.md, RESEARCH.md, o doc de desplegament separat).

## Deferred Ideas

None — discussion stayed within phase scope.
