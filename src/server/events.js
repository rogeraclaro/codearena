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

  // --- Server -> Client (authoritative broadcasts) ---
  SESSION_FULL_STATE: 'session:full-state',
  TEAM_CLAIMED: 'team:claimed',
  TEAM_AVAILABLE_LIST: 'team:available-list',
  TEAM_RELOAD: 'team:reload',
});
