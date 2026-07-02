// Singleton authoritative in-memory game state (CORE-01). Clients never
// compute or store canonical state themselves — they only render whatever
// getPublicState() projects to them.
//
// Timer/phase functions use an absolute end-timestamp (phaseEndsAt, epoch
// ms) per 01-RESEARCH.md Pattern 3: broadcast only on state-change events,
// never a per-second tick. checkExpiry() is internal server bookkeeping
// (polled by a 1s setInterval in index.js) — at zero it freezes the timer
// but NEVER advances the phase automatically (D-11).

import { randomUUID } from 'node:crypto';
import { SLOTS, PIECES } from '../shared/robotTemplate.js';

const PHASE_ORDER = ['html', 'css', 'js'];

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
    // placement: mapa autoritatiu slot->tipus per equip (GAME-03). Es projecta
    // dirigit via getTeamBoard(); getPublicState() només en deriva el count N/8.
    state.teams.set(id, { id, name, claimed: false, connected: false, placement: {} });
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
    teams: [...state.teams.values()].map(({ id, name, connected, placement }) => ({
      id,
      name,
      connected,
      // N/8 count derivat del board autoritatiu (D-15). Segur difondre (no revela
      // QUINS slots estan ocupats). null fora de la fase html.
      progress:
        state.phase === 'html'
          ? { placed: Object.keys(placement).length, total: SLOTS.length }
          : null,
    })),
  };
}

// Inventari disponible d'un tipus = count de PIECES menys les ocurrències ja
// col·locades (Pitfall 5: antena/orella/ull tenen count 2).
function countAvailable(team, type) {
  const piece = PIECES.find((p) => p.type === type);
  if (!piece) return 0;
  const used = Object.values(team.placement).filter((t) => t === type).length;
  return piece.count - used;
}

// mutation-returns-bool (com claimTeam/pauseTimer): true només si ha mutat, així
// el caller emet el board dirigit únicament quan hi ha canvi real (anti-storm).
function placePiece(teamId, slotId, pieceType) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'html' || state.timerStatus === 'frozen') return false; // GAME-07 / D-11
  const slot = SLOTS.find((s) => s.id === slotId); // enum de la plantilla (V5)
  if (!slot || slot.accepts !== pieceType) return false; // type-check server-side (D-07)
  if (team.placement[slotId]) return false; // slot ja ocupat -> no-op
  if (countAvailable(team, pieceType) <= 0) return false; // inventari esgotat
  team.placement[slotId] = pieceType;
  return true;
}

// Board privat de l'equip (mai a getPublicState, mai a 'session'). Còpia
// superficial — no filtra mai la referència viva.
function getTeamBoard(teamId) {
  const team = state.teams.get(teamId);
  if (!team) return { placement: {} };
  return { placement: { ...team.placement } };
}

// --- Timer/phase functions (all return true if they mutated state, so
// callers — socketHandlers.js, index.js's expiry poll — only broadcast
// session:full-state when something actually changed). ---

function startPhase(phase, durationMs) {
  if (!PHASE_ORDER.includes(phase)) return false;
  if (!(Number.isFinite(durationMs) && durationMs > 0)) return false;
  state.phase = phase;
  state.phaseEndsAt = Date.now() + durationMs;
  state.timerStatus = 'running';
  state.remainingMsAtPause = null;
  return true;
}

function nextPhase(durationMs) {
  const currentIndex = state.phase ? PHASE_ORDER.indexOf(state.phase) : -1;
  const nextIndex = currentIndex + 1;
  if (nextIndex >= PHASE_ORDER.length) return false; // ja és l'última fase, no fa res (CORE-05)
  return startPhase(PHASE_ORDER[nextIndex], durationMs);
}

function pauseTimer() {
  if (state.timerStatus !== 'running') return false;
  state.remainingMsAtPause = state.phaseEndsAt - Date.now();
  state.timerStatus = 'paused';
  state.phaseEndsAt = null;
  return true;
}

function resumeTimer() {
  if (state.timerStatus !== 'paused') return false;
  state.phaseEndsAt = Date.now() + state.remainingMsAtPause;
  state.timerStatus = 'running';
  state.remainingMsAtPause = null;
  return true;
}

function extendTimer(ms = 60000) {
  if (!Number.isFinite(ms)) return false;
  if (state.timerStatus === 'running') {
    state.phaseEndsAt += ms;
    return true;
  }
  if (state.timerStatus === 'paused') {
    state.remainingMsAtPause += ms;
    return true;
  }
  if (state.timerStatus === 'frozen') {
    // ADMIN-04: +1 minut reviu una fase congelada — l'admin dóna més temps
    // sense haver d'avançar de fase. Repetible: cada extensió reinicia el
    // compte enrere des d'ara. Mai auto-avança (D-11 preservat).
    state.phaseEndsAt = Date.now() + ms;
    state.timerStatus = 'running';
    return true;
  }
  return false; // idle: no hi ha cap fase activa a allargar
}

// D-11: at zero-crossing, freeze the timer but NEVER touch state.phase —
// freezing ≠ advancing. The admin always presses "Següent fase" explicitly.
function checkExpiry() {
  if (state.timerStatus === 'running' && state.phaseEndsAt !== null && Date.now() >= state.phaseEndsAt) {
    state.timerStatus = 'frozen';
    return true;
  }
  return false;
}

export const gameState = {
  registerTeams,
  claimTeam,
  setConnected,
  getUnclaimedTeams,
  getPublicState,
  placePiece,
  getTeamBoard,
  startPhase,
  nextPhase,
  pauseTimer,
  resumeTimer,
  extendTimer,
  checkExpiry,
};
