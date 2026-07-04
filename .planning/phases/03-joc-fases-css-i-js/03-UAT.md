---
status: testing
phase: 03-joc-fases-css-i-js
source: [03-VERIFICATION.md]
started: 2026-07-04T06:47:42Z
updated: 2026-07-04T06:47:42Z
---

## Current Test

number: 1
name: Moure cada slider i triar cada color a la fase css
expected: |
  El robot canvia a l'instant sense parpelleig ni re-decode de /robot-fons.png;
  amb valors target arriba a l'aspecte Bender (visor fosc, ulls grocs, dents
  metàl·liques, cap gris-blau, antena)
awaiting: user response

## Tests

### 1. Moure cada slider i triar cada color a la fase css
expected: El robot canvia a l'instant sense parpelleig ni re-decode de /robot-fons.png; amb valors target arriba a l'aspecte Bender (visor fosc, ulls grocs, dents metàl·liques, cap gris-blau, antena)
result: [pending]

### 2. Confirmar explícitament el tradeoff dels 4 forats ⚠ (antena-bg/cap-bg aplanen el gradient a color pla)
expected: El professor/equip accepta que l'objectiu pedagògic ("l'alumne posa un valor CSS real i el veu") es manté tot i perdre el matís de gradient
result: [pending]

### 3. F5 a la pantalla d'equip durant la fase css
expected: Els valors CSS es recuperen I el robot mostra les peces HTML prèviament col·locades (verificació visual de la correcció CR-01)
result: [pending]

### 4. Divisió 50/50 exacta a les fases html i css (i js)
expected: El panell d'acció i la preview ocupen visualment el mateix ample
result: [pending]

### 5. Construir una regla completa i prémer "Veure"
expected: El robot reacciona a la interacció del ratolí definida per la regla
result: [pending]

### 6. Confirmar que una parella (event, origen) ja usada queda desactivada visualment a altres files, i que triar una acció composta desactiva visualment el desplegable destí
expected: Els desplegables mostren `disabled` segons D-15/D-17
result: [pending]

### 7. "Afegir JavaScript" arriba al límit de 5-6 files i llavors es desactiva
expected: El botó queda `disabled` en arribar a JS_ROW_LIMIT (6)
result: [pending]

### 8. Regla amb origen absent (peça HTML no col·locada) durant la fase js
expected: Cap efecte, cap error de consola, la resta del panell segueix funcionant
result: [pending]

### 9. F5 a la pantalla d'equip durant la fase js
expected: Les regles construïdes es recuperen i es reflecteixen al panell (reseed)
result: [pending]

### 10. El card de l'Admin mostra només estat de connexió (sense comptador N/total) durant les fases css i js
expected: Cap xifra de progrés visible al panell Admin fora de la fase html
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
