#!/usr/bin/env bash
#
# CodeArena — script de desplegament (D-11).
#
# Executa'l manualment via SSH al VPS des de dins del repo:
#   ./deploy/deploy.sh
#
# Fa els 4 passos de D-11 en ordre, situat sempre a l'arrel del repo (load-bearing:
# dotenv llegeix .env des de process.cwd() i PM2 recorda el cwd — Pitfall 4):
#   1. git pull            — porta l'últim codi
#   2. npm ci              — instal·la exactament el lockfile (sincronitzat amb dotenv 17.4.2)
#   3. npm run build       — genera dist/ amb Vite
#   4. pm2 reload codearena — recarrega el procés (breu caiguda de WS coberta per
#                             connectionStateRecovery; reload en comptes de restart
#                             per quedar a prova de futur si mai s'adopta cluster mode)
#
# PRIMER DESPLEGAMENT en un VPS net (encara no hi ha procés PM2): en lloc del
# `pm2 reload` d'aquest script, arrenca'l per primer cop amb:
#   npm run server:pm2   (= pm2 start ecosystem.config.cjs)
#   pm2 save             (persisteix la llista de processos)
#   pm2 startup          (genera l'script d'arrencada en boot; segueix la instrucció que imprimeix)
# A partir del segon desplegament, aquest script (pm2 reload) ja funciona.

set -euo pipefail

# Situa'ns a l'arrel del repo (un nivell per sobre de deploy/), sigui quin sigui
# el directori de treball des d'on s'invoqui l'script.
cd "$(dirname "$0")/.."

# Pre-flight (WR-03): refusa desplegar si .env no existeix o ADMIN_SECRET és buit/absent.
# socketHandlers.js només avisa (fail-open) i continua servint admin a qualsevol client;
# aquesta comprovació fa que un secret oblidat aturi el desplegament ABANS de tocar dist/,
# així un deploy insegur mai arriba a producció. Ancorat a inici de línia (^ADMIN_SECRET=)
# amb almenys un caràcter després per no fer match amb referències comentades ni valors buits.
if [[ ! -f .env ]] || ! grep -Eq '^ADMIN_SECRET=.+' .env; then
  echo "ERROR: .env no existeix o ADMIN_SECRET és buit/absent — desplegament avortat." >&2
  echo "       Defineix ADMIN_SECRET al .env abans de desplegar (secció 5 de DEPLOY.md)." >&2
  exit 1
fi

echo "==> [1/4] git pull"
git pull

echo "==> [2/4] npm ci"
npm ci

echo "==> [3/4] npm run build (atomic swap)"
# CR-01: no buidem el dist/ viu (servit per express.static via PM2) fins que el nou build
# sigui complet. Construïm a dist.new i, només si el build té èxit, fem el swap atòmic
# conservant el build anterior a dist.bak com a fallback. Amb `set -euo pipefail`, un build
# fallit avorta aquí i deixa el dist/ viu intacte.
#
# vite.config.js té `root: 'src/client'`, per tant el CLI `--outDir` es resol RELATIU a root:
# `../../dist.new` aterra a l'arrel del repo. `--emptyOutDir` cal perquè el destí és fora de
# root (Vite ho demanaria interactivament altrament), coherent amb el `emptyOutDir: true` del config.
npm run build -- --outDir ../../dist.new --emptyOutDir
rm -rf dist.bak
[[ -d dist ]] && mv dist dist.bak
mv dist.new dist

echo "==> [4/4] pm2 reload codearena"
pm2 reload codearena

echo "==> Desplegament complet."
