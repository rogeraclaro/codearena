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

  // --- Server -> Client (authoritative broadcasts) ---
  SESSION_FULL_STATE: 'session:full-state',
  TEAM_CLAIMED: 'team:claimed',
  TEAM_AVAILABLE_LIST: 'team:available-list',
  TEAM_RELOAD: 'team:reload',
  // Fase HTML — board privat de l'equip, emès DIRIGIT a team:<id> (mai a 'session', Pitfall 1).
  TEAM_BOARD_STATE: 'team:board-state',
});
