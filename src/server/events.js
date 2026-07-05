// Single source of truth for the Socket.io event-name protocol.
// No event-name literal string should appear anywhere else in the codebase —
// always import from here (server and client).

export const EVENTS = Object.freeze({
  // --- Client -> Server (intents, never trusted blindly) ---
  TEAM_SELECT: 'team:select',
  ADMIN_REGISTER_TEAMS: 'admin:register-teams',
  ADMIN_START_PHASE: 'admin:start-phase',
  ADMIN_NEXT_PHASE: 'admin:next-phase',
  ADMIN_TIMER_PAUSE: 'admin:timer-pause',
  ADMIN_TIMER_RESUME: 'admin:timer-resume',
  ADMIN_TIMER_EXTEND: 'admin:timer-extend',
  ADMIN_FORCE_RESYNC: 'admin:force-resync',
  // Fase HTML — intents de col·locació (identitat SEMPRE de socket.data.teamId, mai del payload).
  TEAM_PLACE_PIECE: 'team:place-piece',
  TEAM_REMOVE_PIECE: 'team:remove-piece', // declarat aquí; s'implementa al Pla 02
  // Fase CSS — intent de fixar un forat (identitat SEMPRE de socket.data.teamId, mai del payload).
  TEAM_SET_CSS: 'team:set-css',
  // Fase JS — intent de fixar el ruleset sencer (identitat SEMPRE de socket.data.teamId, mai del payload).
  TEAM_SET_RULES: 'team:set-rules',
  // Marca la fase ACTIVA com a finalitzada per aquest equip (botó "Finalitzar", per a
  // scoring futur de rapidesa a la Fase 4). Fase SEMPRE derivada de state.phase, mai del
  // payload (identitat de socket.data.teamId, mai del payload).
  TEAM_MARK_DONE: 'team:mark-done',
  // ADMIN-07 (D-14): l'admin finalitza la partida i dispara els resultats a totes les
  // pantalles. Admin-only (re-validat per pertinença a la room 'admin', T-04-01).
  ADMIN_FINALIZE_GAME: 'admin:finalize-game',

  // --- Server -> Client (authoritative broadcasts) ---
  SESSION_FULL_STATE: 'session:full-state',
  TEAM_CLAIMED: 'team:claimed',
  TEAM_AVAILABLE_LIST: 'team:available-list',
  TEAM_RELOAD: 'team:reload',
  // Fase HTML — board privat de l'equip, emès DIRIGIT a team:<id> (mai a 'session', Pitfall 1).
  TEAM_BOARD_STATE: 'team:board-state',
  // Fase CSS — estil privat de l'equip, emès DIRIGIT a team:<id> (mai a 'session', Pitfall 1).
  TEAM_CSS_STATE: 'team:css-state',
  // Fase JS — regles privades de l'equip, emès DIRIGIT a team:<id> (mai a 'session', Pitfall 1).
  TEAM_JS_STATE: 'team:js-state',
  // Estat de "finalitzat per fase" de l'equip, emès DIRIGIT a team:<id> (mai a 'session',
  // Pitfall 1) — F5 recovery del bloqueig un cop l'equip ha premut "Finalitzar".
  TEAM_DONE_STATE: 'team:done-state',
  // D-12/D-13: rànquing parcial en tancar-se cada fase (HTML→CSS, CSS→JS). Emès NOMÉS a
  // io.to('admin') — els equips no el veuen mai (T-04-06). Calculat amb el MATEIX
  // buildRanking(mask) que el rànquing final, amb les fases no jugades comptant 0 (D-13).
  ADMIN_PARTIAL_RANKING: 'admin:partial-ranking',
  // ADMIN-07/D-14: dispara la cerimònia + revelació de resultats a totes les pantalles.
  // Difós a tots, PERÒ amb payload FILTRAT per equip: el ranking (id/name/globalPct) va a
  // tothom; el detall privat de sub-checks (ownDetail) NOMÉS via team:<id> (D-10). El Pla
  // 03 interceptarà aquest event per animar la cerimònia abans de revelar.
  CEREMONY_START: 'game:ceremony-start',
  // F5 recovery després de finalitzar (CORE-03, Pitfall 4): emès DIRIGIT a l'owner en
  // reconnectar, amb el ranking final congelat + el seu ownDetail, sense re-reproduir la
  // cerimònia (mostra l'estat final directament).
  GAME_RESULTS: 'game:results',
});
