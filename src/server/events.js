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
});
