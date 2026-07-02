// Singleton authoritative in-memory game state (CORE-01). Clients never
// compute or store canonical state themselves — they only render whatever
// getPublicState() projects to them.
//
// Timer/phase mutation functions (startPhase, nextPhase, pauseTimer,
// resumeTimer, extendTimer, checkExpiry) are stubs in Phase 1 — Plan 02
// implements the real countdown logic. getPublicState() already exposes
// the shape so the wire protocol never needs a breaking change later.

import { randomUUID } from 'node:crypto';

const state = {
  phase: null, // null | 'html' | 'css' | 'js'
  phaseEndsAt: null,
  timerStatus: 'idle', // 'idle' | 'running' | 'paused' | 'frozen'
  remainingMsAtPause: null,
  teams: new Map(), // teamId -> { id, name, claimed, connected, progress }
};

function registerTeams(names) {
  for (const name of names) {
    const id = randomUUID();
    state.teams.set(id, { id, name, claimed: false, connected: false, progress: null });
  }
}

function claimTeam(teamId) {
  const team = state.teams.get(teamId);
  if (!team || team.claimed) return false; // bloqueig fort D-03
  team.claimed = true;
  team.connected = true;
  return true;
}

function setConnected(teamId, connected) {
  const team = state.teams.get(teamId);
  if (team) team.connected = connected;
}

function getUnclaimedTeams() {
  return [...state.teams.values()]
    .filter((t) => !t.claimed)
    .map(({ id, name }) => ({ id, name }));
}

// Explicit projection — never broadcasts the raw internal state object
// (Pitfall 3). Never includes the session token.
function getPublicState() {
  return {
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    timerStatus: state.timerStatus,
    remainingMsAtPause: state.remainingMsAtPause,
    teams: [...state.teams.values()].map(({ id, name, connected, progress }) => ({
      id,
      name,
      connected,
      progress,
    })),
  };
}

// --- Timer/phase stubs (Plan 02 implements the real behavior) ---
function startPhase(_phase, _durationMs) {}
function nextPhase(_durationMs) {}
function pauseTimer() {}
function resumeTimer() {}
function extendTimer(_ms) {}
function checkExpiry() {}

export const gameState = {
  registerTeams,
  claimTeam,
  setConnected,
  getUnclaimedTeams,
  getPublicState,
  startPhase,
  nextPhase,
  pauseTimer,
  resumeTimer,
  extendTimer,
  checkExpiry,
};
