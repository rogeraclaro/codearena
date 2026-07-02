---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 1
current_phase_name: Nucli en temps real i control de sessió
status: executing
stopped_at: Phase 1 — tots els plans complets, verificació de fase pendent
last_updated: "2026-07-02T12:15:00.000Z"
last_activity: 2026-07-02
last_activity_desc: Plan 01-04 complete — pantalla d'equip (4 estats + split + preview aïllada); +1 min reviu fase congelada
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-01)

**Core value:** Que alumnes sense cap experiència entenguin els tres rols fonamentals del web (HTML = estructura, CSS = aparença, JS = comportament) manipulant-los directament, sense poder cometre errors de sintaxi i sense frustració.
**Current focus:** Phase 1 — Nucli en temps real i control de sessió

## Current Position

Phase: 1 of 5 (Nucli en temps real i control de sessió)
Plan: 4 of 4 complete in current phase (01-01, 01-02, 01-03, 01-04 ✓)
Status: Executing — verificació final de la Fase 1
Last activity: 2026-07-02 — Plan 01-04 complete (pantalla d'equip: 4 estats + split)

Progress: [██████████] 100% (plans de la fase)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Project init: CSS "codi foradat" (Opció A) triat sobre panell visual — més valor pedagògic
- Project init: JS "regles lògiques" (Opció A) triat sobre blocs prefabricats — ensenya el model esdeveniment→selector→acció
- Project init: estat de partida 100% en memòria al servidor, sense BD — sessions de 15-20 min no la necessiten
- Roadmap: fases seqüencials 1→5, ordenades per dependència tècnica real (nucli → HTML → CSS/JS → scoring → desplegament), no per capes horitzontals

### Pending Todos

None yet.

### Blockers/Concerns

- Research flag: Fase 3 (CSS/JS) necessitarà una passada de recerca dedicada sobre normalització d'estils (`getComputedStyle`, shorthand vs longhand) abans d'implementar el scoring corresponent a Fase 4
- Research flag: Fase 2 (HTML drag & drop) ha de validar l'API exacta de SortableJS (group/put/pull) per al snap fort abans d'escriure UI
- Pendent de confirmar: navegadors/hardware exactes de l'aula (assumit: escriptori evergreen, no tàctil) — verificar abans de planificar Fase 2

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Exercicis parametritzables (JSON) | Deferred to v2 | Project init |
| v2 | Export de resultats (JSON/CSV) | Deferred to v2 | Project init |
| v2 | Equips configurables més enllà de 4-6 | Deferred to v2 | Project init |

## Session Continuity

Last session: 2026-07-02T06:07:27.972Z
Stopped at: Phase 1 UI-SPEC approved
Resume file: .planning/phases/01-nucli-en-temps-real-i-control-de-sessi/01-UI-SPEC.md
