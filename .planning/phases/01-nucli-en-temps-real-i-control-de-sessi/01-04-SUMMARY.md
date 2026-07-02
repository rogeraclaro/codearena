---
phase: 01-nucli-en-temps-real-i-control-de-sessi
plan: 04
subsystem: ui
tags: [state-machine, iframe, sandbox, srcdoc, phase-color-coding, lucide]

# Dependency graph
requires:
  - phase: 01-01
    provides: "session:full-state, pantalla d'espera i identitat per token"
  - phase: 01-02
    provides: "timer sincronitzat (shared/timer.js) + phaseEndsAt/timerStatus"
provides:
  - "Màquina d'estats mútuament exclusius de la pantalla d'equip: waiting / interstitial / active-split / frozen"
  - "Layout split: panell d'acció (esquerra) + iframe de preview aïllada (sandbox + srcdoc buit) — closca reutilitzable per la Fase 2"
  - "Codificació de color de fase (HTML/CSS/JS) + iconografia Lucide + text mínim (UX-01/UX-02)"
  - "Overlay de bloqueig amb cadenat en estat congelat (D-11)"
affects: [02, fase-html, preview, dompurify]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render derivat exclusivament de session:full-state (single source of truth); estats de pantalla mútuament exclusius"
    - "iframe sandbox + srcdoc buit com a closca aïllada per a contingut futur (Fase 2 + DOMPurify)"
    - "Estil via var(--...) tokens; colors de fase --phase-html/css/js"

key-files:
  created:
    - src/client/client.css
  modified:
    - src/client/client.js
    - src/client/client.html

key-decisions:
  - "Interstici ~1.2s en canvi de fase (D-06) abans de revelar el split, per marcar clarament la transició"
  - "iframe amb srcdoc buit ara — la Fase 2 hi injectarà contingut (amb DOMPurify); la closca ja queda aïllada (sandbox)"
  - "Congelat = overlay translúcid + cadenat Lucide sense text sobre el split (D-11); la fase no avança sola"

patterns-established:
  - "Màquina d'estats de client: phase===null→waiting; canvi de phase→interstitial→active-split; timerStatus==='frozen'→overlay bloqueig"

requirements-completed: [GAME-01, GAME-02, UX-01, UX-02]

coverage:
  - id: D1
    description: "La pantalla d'equip té 4 estats mútuament exclusius (espera D-05, interstici D-06, split actiu, congelat D-11) derivats de session:full-state"
    requirement: "UX-02"
    verification:
      - kind: manual_procedural
        ref: "Verificació visual dels 4 estats i transicions (waiting→interstitial→split→frozen→next-phase) — aprovat pel propietari 2026-07-02"
        status: pass
    human_judgment: true
    rationale: "Correcció visual dels estats/transicions i coherència amb UI-SPEC només avaluable per un humà al navegador; el pla no defineix tests automàtics (test_note)"
  - id: D2
    description: "En fase activa la pantalla es divideix: panell d'acció esquerra + preview en iframe aïllat (sandbox) a la dreta"
    requirement: "GAME-01"
    verification:
      - kind: manual_procedural
        ref: "Split verificat visualment; sandbox + srcdoc presents (grep automàtic del pla) — aprovat 2026-07-02"
        status: pass
    human_judgment: true
    rationale: "Layout i aïllament visual verificats per humà; build verd confirma que compila"
  - id: D3
    description: "Llenguatge visual consistent: codificació de color de fase HTML/CSS/JS, iconografia Lucide, text mínim"
    requirement: "UX-01"
    verification:
      - kind: manual_procedural
        ref: "Coherència amb 01-UI-SPEC.md (Inter, colors de fase, Lucide) — aprovat 2026-07-02"
        status: pass
    human_judgment: true
    rationale: "Coherència estètica amb el contracte UI-SPEC requereix judici humà"

# Metrics
duration: ~10min
completed: 2026-07-02
status: complete
---

# Phase 01 · Plan 04: Màquina d'estats de la pantalla d'equip + split amb preview aïllada

**Pantalla d'equip amb 4 estats mútuament exclusius (espera/interstici/split actiu/congelat) i layout dividit amb iframe de preview aïllada, tot derivat de session:full-state i amb codificació de color de fase**

## Performance

- **Duration:** ~10 min (implementació) + verificació manual
- **Completed:** 2026-07-02
- **Tasks:** 2 (Task 1 implementació, Task 2 verificació visual aprovada)
- **Files modified:** 3

## Accomplishments
- Màquina d'estats de la pantalla d'equip: `waiting` (D-05), `interstitial` (D-06, ~1.2s), `active-split` (panell d'acció + preview), `frozen` (overlay + cadenat, D-11) — tots mútuament exclusius i derivats de `session:full-state`.
- Layout split: panell d'acció a l'esquerra (badge de fase + nom + timer sincronitzat) i **iframe de preview aïllada** (sandbox + srcdoc buit) a la dreta — closca reutilitzable per la Fase 2.
- Codificació de color de fase (`--phase-html`/`--phase-css`/`--phase-js`), iconografia Lucide i text mínim segons UI-SPEC.
- Recuperació F5 sense flicker: durant una fase activa, F5 torna directament al split de la fase actual (via token, sense re-tria ni repetir interstici).

## Task Commits

1. **Task 1: Màquina d'estats + split amb preview aïllada** - `e1dcb8f` (feat)

## Files Created/Modified
- `src/client/client.css` - Estils de la pantalla d'equip (estats, split, overlay de congelat) via tokens
- `src/client/client.js` - Màquina d'estats de pantalla (waiting/interstitial/active/frozen) + iframe preview
- `src/client/client.html` - Contenidor per al split

## Decisions Made
- Interstici ~1.2s abans de revelar el split (D-06) per marcar la transició de fase.
- iframe amb `srcdoc` buit ara; la Fase 2 hi injectarà contingut amb DOMPurify. La closca ja queda aïllada (`sandbox`).

## Deviations from Plan

### Millora sol·licitada durant la verificació

**1. [Suggeriment del propietari] +1 minut reviu una fase congelada (ADMIN-04)**
- **Found during:** Task 2 (verificació visual del congelat)
- **Issue:** En estat `frozen`, el botó +1 minut de l'admin no feia res (`extendTimer` retornava false), deixant l'admin sense poder allargar una fase esgotada — l'única opció era «Següent fase».
- **Fix:** `extendTimer` gestiona ara `frozen`: reinicia `phaseEndsAt = ara + ms` i torna a `running`, repetible. D-11 preservat (mai auto-avança).
- **Files modified:** `src/server/gameState.js`, `test/timer.test.js` (Test D-bis)
- **Verification:** Tests 19/19 verds; el botó del client ja es mostrava i era clicable en congelat.
- **Committed in:** `9a78c21` (commit separat a nivell de fase)

---

**Total deviations:** 1 (millora sol·licitada pel propietari, alineada amb ADMIN-04). Cap scope creep.

## Issues Encountered
None - implementació sense incidències; per verificar el congelat es va reduir temporalment `PHASE_DURATION_MS` a 20s (canvi no committat, revertit a 5 min abans de tancar).

## User Setup Required
None.

## Next Phase Readiness
- Fase 1 completa: nucli en temps real, timer/control de fase, monitoratge/resync i pantalla d'equip amb els 4 estats i la closca de preview aïllada.
- La Fase 2 (joc HTML amb blocs drag & drop) injectarà contingut a l'iframe `srcdoc` (amb DOMPurify) i afegirà el panell d'acció interactiu.

---
*Phase: 01-nucli-en-temps-real-i-control-de-sessi*
*Completed: 2026-07-02*
