// Socket.io event wiring: identity middleware + connection lifecycle +
// per-event handlers. Every admin:* handler re-validates room membership
// server-side (V4 Access Control / Pitfall 4) — a client-sent role flag is
// never trusted for authorization, only for the initial room join.

import { EVENTS } from './events.js';
import { gameState } from './gameState.js';
import * as sessionStore from './sessionStore.js';

const MAX_TEAMS = 6;
const MAX_TEAM_NAME_LENGTH = 40;

// Wrap every handler so a thrown exception inside one event never crashes
// the shared Node process for every team (V5 / Pitfall: DoS via malformed
// payload).
function safeHandler(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[socketHandlers] handler error:', err);
    }
  };
}

function isValidTeamNamesPayload(names) {
  return (
    Array.isArray(names) &&
    names.length > 0 &&
    names.length <= MAX_TEAMS &&
    names.every(
      (name) => typeof name === 'string' && name.trim().length > 0 && name.length <= MAX_TEAM_NAME_LENGTH,
    )
  );
}

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const { token, role } = socket.handshake.auth || {};
      if (role === 'admin') {
        socket.data.isAdmin = true;
      }
      if (typeof token === 'string' && token) {
        const teamId = sessionStore.resolve(token);
        if (teamId) {
          socket.data.teamId = teamId;
          socket.data.token = token;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    try {
      if (socket.data.isAdmin) {
        socket.join('admin');
        socket.join('session');
        socket.emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
      } else if (socket.data.teamId) {
        // Reconnection by token (CORE-03): reassociate without re-asking selection.
        gameState.setConnected(socket.data.teamId, true);
        socket.join(`team:${socket.data.teamId}`);
        socket.join('session');
        socket.emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        socket.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
      } else {
        // Unclaimed PC awaiting selection (D-01) — no token minted yet.
        socket.join('session');
        socket.join('unclaimed');
        socket.emit(EVENTS.TEAM_AVAILABLE_LIST, { teams: gameState.getUnclaimedTeams() });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[socketHandlers] connection handler error:', err);
    }

    socket.on(
      EVENTS.TEAM_SELECT,
      safeHandler((payload) => {
        const teamId = payload?.teamId;
        if (typeof teamId !== 'string' || !teamId) return;

        const claimed = gameState.claimTeam(teamId); // false if already claimed (D-03 bloqueig fort)
        if (!claimed) return;

        const token = sessionStore.mintToken(teamId);
        socket.data.teamId = teamId;
        socket.leave('unclaimed');
        socket.join(`team:${teamId}`);

        socket.emit(EVENTS.TEAM_CLAIMED, { token, teamId });
        io.to('unclaimed').emit(EVENTS.TEAM_AVAILABLE_LIST, { teams: gameState.getUnclaimedTeams() });
        io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
      }),
    );

    socket.on(
      EVENTS.ADMIN_REGISTER_TEAMS,
      safeHandler((payload) => {
        if (!socket.rooms.has('admin')) return; // V4: never trust a client-sent role flag

        const names = payload?.names;
        if (!isValidTeamNamesPayload(names)) return;

        gameState.registerTeams(names);
        io.to('unclaimed').emit(EVENTS.TEAM_AVAILABLE_LIST, { teams: gameState.getUnclaimedTeams() });
        io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
      }),
    );

    // --- Timer/phase control (CORE-04, CORE-05, ADMIN-02/03/04) ---
    // Every handler re-checks admin-room membership server-side (V4 Access
    // Control / Pitfall 4) — never trust the client. Broadcasts only fire
    // when the mutation actually changed something (gameState.* return
    // true/false), which is also what keeps Test A's "one broadcast per
    // action, no per-second tick" guarantee honest.
    socket.on(
      EVENTS.ADMIN_START_PHASE,
      safeHandler((payload) => {
        if (!socket.rooms.has('admin')) return;
        const phase = payload?.phase;
        const durationMs = payload?.durationMs;
        if (!['html', 'css', 'js'].includes(phase)) return;
        if (!(Number.isFinite(durationMs) && durationMs > 0)) return;
        if (gameState.startPhase(phase, durationMs)) {
          io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        }
      }),
    );

    socket.on(
      EVENTS.ADMIN_NEXT_PHASE,
      safeHandler((payload) => {
        if (!socket.rooms.has('admin')) return;
        const durationMs = payload?.durationMs;
        if (!(Number.isFinite(durationMs) && durationMs > 0)) return;
        if (gameState.nextPhase(durationMs)) {
          io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        }
      }),
    );

    socket.on(
      EVENTS.ADMIN_TIMER_PAUSE,
      safeHandler(() => {
        if (!socket.rooms.has('admin')) return;
        if (gameState.pauseTimer()) {
          io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        }
      }),
    );

    socket.on(
      EVENTS.ADMIN_TIMER_RESUME,
      safeHandler(() => {
        if (!socket.rooms.has('admin')) return;
        if (gameState.resumeTimer()) {
          io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        }
      }),
    );

    socket.on(
      EVENTS.ADMIN_TIMER_EXTEND,
      safeHandler((payload) => {
        if (!socket.rooms.has('admin')) return;
        const ms = Number.isFinite(payload?.ms) ? payload.ms : 60000;
        if (gameState.extendTimer(ms)) {
          io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        }
      }),
    );

    // Directed force-resync (ADMIN-06, D-09): admin forces a full page reload
    // on a single hung team's PC. Emits ONLY to that team's room — never a
    // session/global broadcast (T-03-02 DoS via broadcast storm). The client
    // reload triggers the existing token-based reconnection path (Pla 01),
    // so no state-recovery logic is reimplemented here.
    socket.on(
      EVENTS.ADMIN_FORCE_RESYNC,
      safeHandler((payload) => {
        if (!socket.rooms.has('admin')) return; // T-03-01: never trust a client-sent role flag
        const teamId = payload?.teamId;
        if (typeof teamId !== 'string' || !teamId) return;
        if (!gameState.getPublicState().teams.some((t) => t.id === teamId)) return; // T-03-02: teamId must exist
        io.to(`team:${teamId}`).emit(EVENTS.TEAM_RELOAD);
      }),
    );

    socket.on(
      'disconnect',
      safeHandler(() => {
        if (socket.data.teamId) {
          gameState.setConnected(socket.data.teamId, false);
          io.to('session').emit(EVENTS.SESSION_FULL_STATE, gameState.getPublicState());
        }
      }),
    );
  });
}
