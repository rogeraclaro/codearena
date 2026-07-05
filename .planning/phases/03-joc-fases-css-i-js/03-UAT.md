---
status: testing
phase: 03-joc-fases-css-i-js
source: [03-VERIFICATION.md]
started: 2026-07-04T06:47:42Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

number: 3
name: F5 a la pantalla d'equip durant la fase css
expected: |
  Els valors CSS es recuperen I el robot mostra les peces HTML prèviament
  col·locades (verificació visual de la correcció CR-01)
awaiting: user response

## Tests

### 1. Moure cada slider i triar cada color a la fase css
expected: El robot canvia a l'instant sense parpelleig ni re-decode de /robot-fons.png; amb valors target arriba a l'aspecte Bender (visor fosc, ulls grocs, dents metàl·liques, cap gris-blau, antena)
result: pass
note: 5 regressions/fixes found and resolved during this test — D-13 asymmetry leak (Bender CSS visible in HTML phase), draft CSS replaced with definitive reference, CSS-hole defaults exaggerated per request, orella-top/offset overlap fixed, stale dev servers restarted. User confirmed "ara si" / "correcte" after fixes.

### 2. Confirmar explícitament el tradeoff dels 4 forats ⚠ (antena-bg/cap-bg aplanen el gradient a color pla)
expected: El professor/equip accepta que l'objectiu pedagògic ("l'alumne posa un valor CSS real i el veu") es manté tot i perdre el matís de gradient
result: skipped
reason: Tradeoff no aplicable amb el disseny definitiu — antena-bg/cap-bg són colors plans des del principi (mai gradient), confirmat per l'usuari.

### 3. F5 a la pantalla d'equip durant la fase css
expected: Els valors CSS es recuperen I el robot mostra les peces HTML prèviament col·locades (verificació visual de la correcció CR-01)
result: [pending]

### 4. Divisió 50/50 exacta a les fases html i css (i js)
expected: El panell d'acció i la preview ocupen visualment el mateix ample
result: [pending]

### 5. Construir una regla completa i prémer "Veure"
expected: El robot reacciona a la interacció del ratolí definida per la regla
result: pass
note: "Veure" no disparava l'acció immediatament — corregit (commit ec42388): ara dispara l'acció un cop a l'instant i manté el listener per interacció real.

### 6. Confirmar que una parella (event, origen) ja usada queda desactivada visualment a altres files, i que triar una acció composta desactiva visualment el desplegable destí
expected: Els desplegables mostren `disabled` segons D-15/D-17
result: pass

### 7. "Afegir JavaScript" arriba al límit de 5-6 files i llavors es desactiva
expected: El botó queda `disabled` en arribar a JS_ROW_LIMIT (6)
result: pass

### 8. Regla amb origen absent (peça HTML no col·locada) durant la fase js
expected: Cap efecte, cap error de consola, la resta del panell segueix funcionant
result: pass

### 9. F5 a la pantalla d'equip durant la fase js
expected: Les regles construïdes es recuperen i es reflecteixen al panell (reseed)
result: pass

### 10. El card de l'Admin mostra només estat de connexió (sense comptador N/total) durant les fases css i js
expected: Cap xifra de progrés visible al panell Admin fora de la fase html
result: [pending]

## Summary

total: 10
passed: 6
issues: 0
pending: 3
skipped: 1
blocked: 0

## Issues Found & Fixed (during this UAT session, not part of the original 10 checks)

- CR-01-adjacent regression: `#robot-cap` CSS leaked into the HTML phase (D-13 asymmetry broken) — fixed.
- Wave-1 draft Bender CSS didn't match the user's definitive reference — replaced.
- CSS-hole defaults were too close to target — exaggerated per request (feat, not bug).
- `orella-top` exaggeration caused ears to overlap ulls/boca visually — fixed (moved offset direction).
- "Girar cap" composite left antena/orelles behind when rotating — fixed to rotate `#robot-contenidor`.
- "Veure" button did nothing until manual preview interaction — fixed to fire immediately.
- Added "Finalitzar" button (HTML + CSS phases) with server-side per-team/phase timestamp — new feature, not a bug fix. Scoring logic deferred to Phase 4 (captured as todo).

## Gaps
