---
phase: quick-260706-hi0
plan: 01
type: summary
status: complete
commit: 6df1069e21d7c50a700174f933e0ab525b59e96b
files_modified:
  - src/client/admin.js
---

# Summary: Pre-omplir el textarea de noms d'equips

## What changed

A `buildRegistrationBlock` (src/client/admin.js), després d'assignar
`textarea.placeholder`, s'afegeix una constant local `defaultTeamNames`
(array dels 4 noms reals) i s'assigna `textarea.value = defaultTeamNames.join('\n')`.
En obrir l'Admin, el textarea `#team-names-input` ja mostra els 4 noms, un per
línia, editables abans de prémer Registrar.

Noms per defecte (ordre exacte):
1. Els primers no sempre tenen perquè ser els últims
2. Segundas filas siempre fueron buenas
3. Que siguem de tercera fila NO té perquè ser negatiu!
4. Los ultimos de las filas

## What was NOT touched

- El `placeholder` existent es manté intacte (serveix de guia si l'admin ho esborra tot).
- El handler del botó Registrar no s'ha modificat: continua fent
  `textarea.value.split('\n')`, filtra buits i emet `admin:register-teams`. El
  pre-omplert és compatible perquè l'admin pot editar el camp abans de registrar.

## Verification

Plan verification command (checks the 4 exact names present + `textarea.value =` assignment):

```
node -e "const s=require('fs').readFileSync('src/client/admin.js','utf8'); const names=[...]; const ok=names.every(n=>s.includes(n)) && /textarea\.value\s*=/.test(s); process.exit(ok?0:1)"
```

Result: PASS (exit 0).

## Commit

- `6df1069` — feat(admin): pre-fill team names textarea with default values
