---
status: complete
quick_id: 260707-uve
date: 2026-07-07
commit: e87e3bd
---

# Quick Task 260707-uve: Guard server-side `finished` a `previousPhase()` (WR-02)

## Fet

Afegit `if (state.finished) return false;` com a primera instrucció de
`previousPhase()` a `src/server/gameState.js`, seguint el mateix patró que ja
usa `finalizeGame()` per idempotència. Com que `ADMIN_PREV_PHASE`
(`socketHandlers.js`) només difon `session:full-state` quan la funció retorna
`true`, el guard es propaga sense tocar cap handler.

Afegit el test de regressió `PREV-FINISHED-GUARD` a `test/prevPhase.test.js`
(situat l'últim de la suite, perquè `finalizeGame()` deixa `state.finished`
en un estat terminal sobre el singleton compartit i no es pot revertir dins
del test). Flux RED→GREEN verificat: el test fallava abans del fix (8/9),
passa després (9/9).

## Verificació

- `node --test test/prevPhase.test.js` → 9 pass / 0 fail
- `git diff c901d91..HEAD --stat` → només `src/server/gameState.js` (+1) i
  `test/prevPhase.test.js` (+25)

## Fora d'abast (no tocat)

`nextPhase()` té el mateix buit (no revalida `finished` explícitament), però
avui és inofensiu perquè `'js'` ja és l'última fase de `PHASE_ORDER` — l'índex
fora de rang fa que la funció ja retorni `false`. Es deixa com a possible
finding futur si l'ordre de fases canvia mai.

## Nota d'execució

L'executor va detectar que el worktree partia 4 commits per darrere de la
`main` esperada (desincronització de worktree coneguda). Va verificar que els
dos fitxers tocats eren idèntics entre l'`HEAD` del worktree i el commit
esperat abans de continuar, per garantir que el merge seria equivalent. El
merge posterior a `main` (`b2c7267`) confirma un diff net de només els 2
fitxers previstos.
