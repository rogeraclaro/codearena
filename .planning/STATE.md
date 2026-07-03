---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
current_phase_name: Joc — Fases CSS i JS
status: executing
stopped_at: Phase 2 UI-SPEC approved
last_updated: "2026-07-03T15:49:00.586Z"
last_activity: 2026-07-03
last_activity_desc: Phase 02 complete, transitioned to Phase 3
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-01)

**Core value:** Que alumnes sense cap experiència entenguin els tres rols fonamentals del web (HTML = estructura, CSS = aparença, JS = comportament) manipulant-los directament, sense poder cometre errors de sintaxi i sense frustració.
**Current focus:** Phase 02 — joc-fase-html-blocs-drag-drop

## Current Position

Phase: 3 — Joc — Fases CSS i JS
Plan: Not started
Status: Ready to execute
Last activity: 2026-07-03 — Phase 02 complete, transitioned to Phase 3

Progress: [██████████] 100% (Fase 1 completa)

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 02 P02 | 4 | 2 tasks | 5 files |
| Phase 02 P03 | 10h | 3 tasks | 4 files |

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260703-uwn | Aplica el redisseny visual final del Bender al codi real de la Fase 2 (HTML drag drop): antena unica per CSS (7 peces en lloc de 8), boca sense text inicial, sense mirall CSS a les orelles, CSS complet del cap/ulls/nas/boca | 2026-07-03 | 402bc16 | [260703-uwn-aplica-el-redisseny-visual-final-del-ben](./quick/260703-uwn-aplica-el-redisseny-visual-final-del-ben/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Exercicis parametritzables (JSON) | Deferred to v2 | Project init |
| v2 | Export de resultats (JSON/CSV) | Deferred to v2 | Project init |
| v2 | Equips configurables més enllà de 4-6 | Deferred to v2 | Project init |

## Session Continuity

Last session: 2026-07-03T08:21:15.247Z
Stopped at: Phase 2 UI-SPEC approved
Resume file: .planning/phases/02-joc-fase-html-blocs-drag-drop/02-UI-SPEC.md

Last activity: 2026-07-03 - Completed quick task 260703-uwn: Aplica el redisseny visual final del Bender al codi real de la Fase 2
