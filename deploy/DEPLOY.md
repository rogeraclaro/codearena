# CodeArena — Runbook de desplegament a producció (VPS + CloudPanel + Nginx + PM2)

Guia pas a pas per desplegar CodeArena a `classe.masellas.info` rere el reverse
proxy Nginx que gestiona CloudPanel, amb WebSocket real verificat i PM2 supervisant
el procés Node.

> **Punt crític:** l'app usa `transports: ['websocket']` (websocket-only, **sense
> fallback a polling**). Si al vhost hi falta una directiva d'upgrade WebSocket,
> l'app **no cau a polling — falla del tot**. Per això la verificació activa del
> `101 Switching Protocols` al navegador (secció 7) NO és opcional.

Totes les accions d'aquest runbook s'executen manualment via SSH al VPS i la UI de
CloudPanel. No hi ha CI/CD en aquesta fase (D-11).

> **Deviació de D-03 (decisió operativa presa durant el desplegament):** l'accés SSH
> disponible al VPS és només com a `root`, així que el codi es desplega directament
> sota `root` a `/root/codearena`, en comptes d'un usuari no-root dedicat. És una
> decisió conscient de l'operador (professor), acceptant el risc residual descrit
> més avall, no un descuit. Si en el futur es crea un usuari no-root, migra el
> directori i repeteix les seccions 2-6 amb la nova ruta.
>
> **Risc acceptat:** el procés Node (únic component exposat a Internet via el
> reverse proxy) corre amb privilegis totals del sistema; qualsevol compromís
> remot de l'app o d'una dependència npm tindria abast de `root` sobre tot el VPS
> (altres sites de CloudPanel inclosos), no només sobre el directori de l'app.
> Acceptable per a l'escala i durada d'aquesta microclasse (sessions curtes,
> sense dades sensibles), però a tenir en compte si el VPS allotja altres serveis.

---

## 1. Prerequisits

Abans de començar, confirma al VPS:

- [ ] **DNS** — `classe.masellas.info` apunta a la IP del VPS (D-01). Comprova-ho
      amb `dig +short classe.masellas.info` o `nslookup classe.masellas.info`.
      L'emissió de Let's Encrypt (secció 4) fallarà si el DNS encara no resol.
- [ ] **Accés root** — el codi es desplega directament com a `root`, a la ruta
      `/root/codearena` (deviació de D-03, veure nota més amunt).
- [ ] **Node LTS compatible** — `node --version` al VPS ha de mostrar una LTS recent
      (dev local és v22.17.0; el target del projecte és Node 24 LTS, A3). L'app no
      usa cap feature exòtica de Node, però verifica-ho igualment.
- [ ] **PM2 instal·lat globalment** — `pm2 --version`. Si no hi és:
      `npm install -g pm2`.

---

## 2. Crear el site a CloudPanel — tipus «Reverse Proxy» (D-04/D-05)

A **CloudPanel → Sites → Add Site**, crea el site com a tipus **«Reverse Proxy»**.

> ⚠️ **NO el creïs com a tipus «Node.js».** El tipus Node.js de CloudPanel porta el
> seu propi supervisor de procés, que entraria en conflicte amb PM2. El mecanisme de
> **Reset de l'Admin** (Fase 04.1) depèn que sigui **PM2** qui reviu el procés
> (`process.exit(0)` → PM2 el rearrenca). Un segon supervisor trencaria aquest
> contracte (D-04).

- **Domini:** `classe.masellas.info`
- **Destí del reverse proxy:** `http://127.0.0.1:8011` (D-05)

> El port **8011** és el que espera CloudPanel per a aquest site. Ha de coincidir
> exactament amb el `PORT` del `.env` de producció (secció 5). Contracte del Pla 01:
> `.env` és l'única font de PORT; no s'estableix enlloc més (ni a
> `ecosystem.config.cjs`).

---

## 3. Directives WebSocket al Vhost Editor (D-06)

Obre **CloudPanel → Site → Vhost Editor** i verifica que el bloc `location /` conté
les directives següents. **El generador del tipus «Reverse Proxy» pot NO incloure les
capçaleres d'upgrade per defecte** (a diferència del tipus Node.js) — cal
verificar-les i afegir-les si falten (Pitfall 5, A2).

```nginx
location / {
    proxy_pass http://127.0.0.1:8011;
    proxy_http_version 1.1;                          # OBLIGATÒRIA per a l'upgrade WS
    proxy_set_header Upgrade $http_upgrade;          # OBLIGATÒRIA
    proxy_set_header Connection "upgrade";           # OBLIGATÒRIA
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;                        # alt — evita tallar connexions idle a mig joc
    proxy_send_timeout 3600s;
    proxy_buffering off;                             # per D-06 (poc impacte en WS-only, inofensiu)
}
```

**Les tres directives OBLIGATÒRIES** — sense elles l'app websocket-only falla del tot:

1. `proxy_http_version 1.1;`
2. `proxy_set_header Upgrade $http_upgrade;`
3. `proxy_set_header Connection "upgrade";`

**Timeouts:** 900s ja seria suficient (el keepalive de Socket.io, ping ≈ 25s, manté
la connexió mai idle durant una sessió de 15-20 min, A1); 3600s és marge de seguretat
per D-06. `proxy_buffering off` importa per a long-polling HTTP, que aquesta app no
usa — s'inclou per D-06 però no és load-bearing aquí.

Després d'editar el vhost, aplica/desa els canvis a CloudPanel (recarrega Nginx).

---

## 4. HTTPS — certificat Let's Encrypt (D-08)

Un cop el DNS de `classe.masellas.info` apunti al VPS (secció 1), emet el certificat a
**CloudPanel → Site → SSL/TLS → Let's Encrypt**. CloudPanel ja té certbot instal·lat i
en gestiona l'emissió i la renovació. Activa la redirecció HTTP→HTTPS perquè el vhost
forci `https` (mitigació T-05-03: transport sense xifrar).

---

## 5. Secret i port — crear el `.env` de producció (D-09/D-10)

Al directori del repo al VPS (`/root/codearena`), crea el fitxer `.env`
basant-te en `.env.example`:

```bash
cp .env.example .env
# edita .env:
#   PORT=8011                              # ha de coincidir amb el destí del proxy (D-05)
#   ADMIN_SECRET=<un secret fort i únic>   # p.ex. `openssl rand -hex 32`
```

> - `ADMIN_SECRET` és **obligatori** en producció: sense ell, l'autenticació admin
>   queda DESHABILITADA i qualsevol client podria reclamar el rol admin
>   (T-05-02 / T-04.1-05).
> - `.env` **ja està a `.gitignore`** des del Pla 01 — **mai el versionis**. El
>   secret viu només al VPS.
> - `dotenv` carrega `.env` a l'arrencada (`import 'dotenv/config'` és el primer
>   import de `src/server/index.js`). Es llegeix des de `process.cwd()`, per això
>   PM2/l'script s'executen sempre des de l'arrel del repo (Pitfall 4; el Pla 01 ja
>   va afegir `cwd: __dirname` a `ecosystem.config.cjs`).

---

## 6. Desplegament: primer cop vs. subsegüents

### Primer desplegament (VPS net, encara no hi ha procés PM2)

```bash
mkdir -p /root/codearena && cd /root/codearena
git clone <url-del-repo> .        # o clona a la ruta i entra-hi
# crea el .env (secció 5) abans d'arrencar
npm ci                            # instal·la exactament el lockfile (dotenv 17.4.2)
npm run build                     # genera dist/ amb Vite
npm run server:pm2                # = pm2 start ecosystem.config.cjs
pm2 save                          # persisteix la llista de processos
pm2 startup                       # genera l'script d'arrencada en boot — com que ja ets root, executa directament la comanda que imprimeix (sense sudo)
```

`pm2 save` + `pm2 startup` fan que l'app sobrevisqui reinicis del VPS (i que el Reset
de l'Admin, que fa `process.exit(0)`, sigui revifat per PM2).

### Desplegaments subsegüents

```bash
cd /root/codearena
bash deploy/deploy.sh
```

`deploy/deploy.sh` (versionat, D-11) fa en ordre: `git pull` → `npm ci` →
`npm run build` → `pm2 reload codearena` (reload, no restart, a prova de futur per a
cluster mode; la breu caiguda de WS queda coberta per `connectionStateRecovery`).

---

## 7. Verificació WebSocket real (D-07 / DEPL-01) — OBLIGATÒRIA

Socket.io no revela sol si l'upgrade ha fallat, perquè aquí **no hi ha fallback a
polling** que ho emmascari. Cal comprovar-ho explícitament al navegador:

1. Obre `https://classe.masellas.info`.
2. DevTools → pestanya **Network** → filtre **WS**.
3. **Recarrega** la pàgina.
4. Confirma que la petició de Socket.io retorna **`101 Switching Protocols`** i que el
   transport és **`websocket`** (no `polling`).

**Si veus `400`/`200` repetits o intents de connexió fallits** → falten directives
d'upgrade al vhost. Torna a la secció 3, afegeix-les, recarrega Nginx i torna a
verificar (Pitfall 5).

---

## 8. Comprovació de tancament de T-04.1-05 — warning d'ADMIN_SECRET

Amb l'app arrencada, comprova els logs:

```bash
pm2 logs codearena
```

- ✅ Ha de mostrar l'escolta al port, p.ex. `listening on ...:8011`.
- ✅ **NO** ha d'aparèixer el warning `ADMIN_SECRET not set — admin authentication is
  DISABLED`.

Si el warning hi és, `dotenv` no ha trobat el `.env` (probablement PM2 arrencat des
d'un cwd que no és l'arrel del repo — Pitfall 4) o `ADMIN_SECRET` no està definit al
`.env`. Corregeix-ho i torna a arrencar (`pm2 reload codearena`).

---

## 9. Verificació de PM2 auto-restart (DEPL-02)

Confirma que PM2 reviu el procés si cau:

```bash
pm2 status                        # estat «online», anota el comptador de restarts
pm2 sendSignal SIGKILL codearena  # (o localitza el PID i `kill -9 <pid>`)
pm2 status                        # torna a «online», restarts +1
```

Alternativament, prem el botó **Reset** de l'Admin i confirma que el servei torna sol.

---

## 10. Verificació de sessió completa (Success Criteria #3)

Des del domini real `https://classe.masellas.info`:

1. Registra 4-6 equips des de l'Admin.
2. Juga les 3 fases: HTML (drag & drop), CSS, JS.
3. Arriba a la pantalla de resultats/rànquing, tot sense errors de connexió.
4. Prova una **recàrrega (F5)** d'un equip enmig d'una fase i confirma que recupera
   l'estat (`connectionStateRecovery`).

---

## Referència ràpida de decisions

| ID | Decisió |
|----|---------|
| D-01 | Subdomini de producció: `classe.masellas.info` |
| D-03 | *(deviat)* Desplegament com a `root` a `/root/codearena` — accés SSH disponible és només root; risc acceptat per l'operador (veure nota a l'inici) |
| D-04 | Site tipus «Reverse Proxy», NO «Node.js» |
| D-05 | Reverse proxy → `http://127.0.0.1:8011` |
| D-06 | Directives WS verificades/afegides al vhost (no es versiona cap `.conf`) |
| D-07 | Verificació obligatòria del `101 Switching Protocols` al navegador |
| D-08 | HTTPS via Let's Encrypt (CloudPanel) |
| D-09/D-10 | `.env` amb `ADMIN_SECRET` fort + `PORT=8011`, carregat per dotenv |
| D-11 | `deploy/deploy.sh` per a desplegaments repetibles |
