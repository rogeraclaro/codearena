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
import {
  SLOTS,
  PIECES,
  CSS_HOLES,
  JS_EVENTS,
  JS_ELEMENTS,
  JS_ACTION_KEYS,
  JS_COMPOSITE_KEYS,
  JS_ROW_LIMIT,
} from '../shared/robotTemplate.js';
import { scoreHtml, scoreCss, scoreJs, computeGlobal, htmlTimeBonuses, isHtmlComplete } from '../shared/scoring.js';

const PHASE_ORDER = ['html', 'css', 'js'];

const state = {
  phase: null, // null | 'html' | 'css' | 'js'
  phaseEndsAt: null,
  timerStatus: 'idle', // 'idle' | 'running' | 'paused' | 'frozen'
  remainingMsAtPause: null,
  finished: false, // ADMIN-07: estat terminal un cop l'admin finalitza (A6: flag, no fase)
  finalRanking: null, // còpia CONGELADA del ranking final (F5 recovery, Pitfall 4)
  teams: new Map(), // teamId -> { id, name, claimed, connected, progress }
};

function registerTeams(names) {
  for (const name of names) {
    const id = randomUUID();
    // placement: mapa autoritatiu slot->tipus per equip (GAME-03). Es projecta
    // dirigit via getTeamBoard(); getPublicState() només en deriva el count N/7.
    // cssValues: mapa autoritatiu holeId->value per equip (GAME-04). Es projecta
    // dirigit via getTeamStyle(); getPublicState() no en deriva res (D-22).
    // jsRules: array autoritatiu de regles JS per equip (GAME-05). Es projecta
    // dirigit via getTeamRules(); getPublicState() no en deriva res (D-22).
    // doneAt: mapa autoritatiu phase->timestamp (epoch ms) de quan l'equip ha premut
    // "Finalitzar" per aquella fase. Es projecta dirigit via getTeamDoneState(); no
    // calcula cap puntuació — només desa el timestamp perquè la Fase 4 (scoring de
    // rapidesa) el pugui consumir més endavant.
    state.teams.set(id, { id, name, claimed: false, connected: false, placement: {}, cssValues: {}, jsRules: [], doneAt: {} });
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
    // ADMIN-07: estat terminal difusible. Quan finished, inclou el ranking congelat
    // (NOMÉS {id,name,globalPct} — MAI sub-checks d'altres equips, D-10). El client hi
    // salta a la branca de resultats a F5 (Pitfall 4). null mentre no s'ha finalitzat.
    finished: state.finished === true,
    finalRanking: state.finished && state.finalRanking ? state.finalRanking.map((r) => ({ ...r })) : null,
    teams: [...state.teams.values()].map(({ id, name, connected, placement }) => ({
      id,
      name,
      connected,
      // N/7 count derivat del board autoritatiu (D-15). Segur difondre (no revela
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

// Mirall de placePiece (D-10): retirar una peça col·locada perquè "desfer" sigui
// trivial i sense càstig. mutation-returns-bool → true només si ha mutat, així el
// caller emet el board dirigit únicament quan hi ha canvi real (anti-storm, T-02-06).
// No-op (false, sense broadcast) si l'equip no existeix, fora de la fase html,
// timer congelat (D-11 — no es toca el robot un cop congelat), o slot ja buit.
function removePiece(teamId, slotId) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'html' || state.timerStatus === 'frozen') return false; // GAME-07 / D-11
  if (!team.placement[slotId]) return false; // slot buit -> no-op
  delete team.placement[slotId];
  return true;
}

// Board privat de l'equip (mai a getPublicState, mai a 'session'). Còpia
// superficial — no filtra mai la referència viva.
function getTeamBoard(teamId) {
  const team = state.teams.get(teamId);
  if (!team) return { placement: {} };
  return { placement: { ...team.placement } };
}

// --- Fase CSS (GAME-04) ---
// Calcat de placePiece: mutation-returns-bool → true només si ha mutat, així el
// caller emet el TEAM_CSS_STATE dirigit únicament quan hi ha canvi real (anti-storm,
// T-03-03). No-op (false, sense broadcast) si l'equip no existeix, fora de la fase css,
// timer congelat (D-11), holeId desconegut (V5 enum), value invàlid (V5 validate), o
// value idèntic al ja emmagatzemat.
function setCssValue(teamId, holeId, value) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'css' || state.timerStatus === 'frozen') return false; // GAME-07 / D-11
  if (team.doneAt.css) return false; // D-15: equip congelat després de "Finalitzar" CSS — cap mutació
  const hole = CSS_HOLES[holeId]; // enum de la plantilla (V5)
  if (!hole) return false;
  if (!hole.validate(value)) return false; // hex regex O numèric-dins-rang (V5, Pitfall 5)
  if (team.cssValues[holeId] === value) return false; // no-op → cap re-broadcast
  team.cssValues[holeId] = value;
  return true;
}

// Estil privat de l'equip (mai a getPublicState, mai a 'session'). Còpia superficial —
// no filtra mai la referència viva (mirall de getTeamBoard).
function getTeamStyle(teamId) {
  const team = state.teams.get(teamId);
  if (!team) return { cssValues: {} };
  return { cssValues: { ...team.cssValues } };
}

// --- Fase JS (GAME-05) ---
// Consulta segura de propietat pròpia: evita que una clau com 'toString'/'__proto__'
// resolgui a un mètode heretat d'Object.prototype (defensa T-03-10).
function ownKey(obj, key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
}

// Calcat de setCssValue: mutation-returns-bool → true només si ha mutat, així el
// caller emet el TEAM_JS_STATE dirigit únicament quan hi ha canvi real (anti-storm,
// T-03-12). Whole-array replace (03-RESEARCH §Pattern 4): el ruleset sencer és
// minúscul (≤6 regles), així que substituir-lo tot evita bookkeeping d'ids.
// No-op (false, sense broadcast) si: l'equip no existeix, fora de la fase js, timer
// congelat (D-11), no és un array o supera el límit (D-11/D-12), o QUALSEVOL regla
// falla la validació de vocabulari frozen (V5), anti-repetició (event,origen) (D-15)
// o composite⇒destí-null (D-17).
function setJsRules(teamId, rules) {
  const team = state.teams.get(teamId);
  if (!team) return false;
  if (state.phase !== 'js' || state.timerStatus === 'frozen') return false; // GAME-07 / D-11
  if (team.doneAt.js) return false; // D-15: equip congelat després de "Finalitzar" JS — cap mutació
  if (!Array.isArray(rules) || rules.length > JS_ROW_LIMIT) return false; // ≤6 (D-11/D-12)
  const seen = new Set();
  for (const r of rules) {
    if (!r || typeof r !== 'object') return false;
    if (!ownKey(JS_EVENTS, r.event) || !ownKey(JS_ELEMENTS, r.origen)) return false; // vocab (V5)
    const isComposite = JS_COMPOSITE_KEYS.includes(r.accio);
    const isSimple = JS_ACTION_KEYS.includes(r.accio);
    if (!isComposite && !isSimple) return false; // acció desconeguda (V5)
    if (isSimple && !ownKey(JS_ELEMENTS, r.desti)) return false; // simple exigeix destí (V5)
    if (isComposite && r.desti != null) return false; // composta ⇒ destí null (D-17)
    const key = `${r.event}|${r.origen}`;
    if (seen.has(key)) return false; // anti-repetició de la parella (D-15)
    seen.add(key);
  }
  // Normalitza: només els 4 camps canònics, mai propietats extra del payload.
  team.jsRules = rules.map(({ event, origen, desti, accio }) => ({ event, origen, desti, accio }));
  return true;
}

// Regles privades de l'equip (mai a getPublicState, mai a 'session'). Còpia per regla —
// no filtra mai la referència viva (mirall de getTeamStyle/getTeamBoard).
function getTeamRules(teamId) {
  const team = state.teams.get(teamId);
  if (!team) return { jsRules: [] };
  return { jsRules: team.jsRules.map((r) => ({ ...r })) };
}

// Marca la fase ACTIVA (state.phase, mai un valor rebut del client — el caller li
// passa el mateix state.phase autoritatiu) com a finalitzada per aquest equip.
// mutation-returns-bool: true només la PRIMERA vegada per fase (idempotent — repetir
// el clic, o un re-emit accidental, no sobreescriu el timestamp ja desat).
// D-15 (SUPERSEDEIX D-08/D-09): CSS i JS tenen un "Finalitzar" VOLUNTARI, sense gate de
// correcció — accepten qualsevol fase de PHASE_ORDER i escriuen doneAt.css/doneAt.js només
// per CONGELAR l'equip (els mutadors setCssValue/setJsRules els respecten). Aquests
// timestamps MAI entren a la fórmula de score: htmlTimeBonuses llegeix NOMÉS doneAt.html, així
// que el bonus de temps segueix sent exclusiu de HTML (D-05/D-06 intactes). NOMÉS la fase
// 'html' conserva el gate de correcció 100% (isHtmlComplete, D-07); tota fase fora de
// PHASE_ORDER queda rebutjada (un payload forjat no pot registrar una fase inexistent).
function markPhaseDone(teamId, phase) {
  const team = state.teams.get(teamId);
  if (!team || !phase) return false;
  if (!PHASE_ORDER.includes(phase)) return false; // fase desconeguda rebutjada (payload forjat)
  if (phase === 'html' && !isHtmlComplete(team.placement)) return false; // gate D-07 (NOMÉS html)
  if (team.doneAt[phase]) return false; // ja marcat — no-op (idempotent, anti-storm)
  team.doneAt[phase] = Date.now();
  return true;
}

function getTeamDoneState(teamId) {
  const team = state.teams.get(teamId);
  if (!team) return { doneAt: {} };
  return { doneAt: { ...team.doneAt } };
}

// --- Fase 4: puntuació i rànquing (SCORE-01..05, ADMIN-07) ---

// Rànquing autoritatiu: per cada equip calcula els tres scores de fase, aplica el bonus
// de temps HTML rank-based (D-05/D-06) i combina amb els pesos (computeGlobal). El `mask`
// serveix el rànquing parcial del Pla 02 (fases no jugades = 0, D-13); aquí sempre
// complet. Retorna array {id, name, globalPct} ordenat DESCENDENT per globalPct — NOMÉS
// dades públiques (D-10: cap sub-check en el ranking difós).
function buildRanking(mask = { html: 1, css: 1, js: 1 }) {
  const teams = [...state.teams.values()];
  const bonuses = htmlTimeBonuses(teams); // teamId -> 0..5 ; absents = 0
  return teams
    .map((team) => {
      const html = scoreHtml(team.placement).pct;
      const css = scoreCss(team.cssValues).pct;
      const js = scoreJs(team.jsRules).pct;
      const bonus = bonuses.get(team.id) ?? 0;
      const globalPct = computeGlobal({ html, css, js }, mask, bonus);
      return { id: team.id, name: team.name, globalPct };
    })
    .sort((a, b) => b.globalPct - a.globalPct);
}

// D-13: context del rànquing parcial derivat de la fase ACTUAL (state.phase). La màscara
// marca com a jugades (1) totes les fases ANTERIORS a l'actual i com a no jugades (0)
// l'actual i les futures — és a dir, l'estat just DESPRÉS d'una transició nextPhase, on la
// fase que s'acaba de tancar és `closedPhase` (la immediatament anterior a l'actual). El
// caller (Pla 02) alimenta aquesta màscara al MATEIX buildRanking del rànquing final, no un
// càlcul paral·lel. `closedPhase` és null si no s'ha tancat cap fase (p.ex. fase inicial).
function getPartialContext() {
  const idx = PHASE_ORDER.indexOf(state.phase);
  const mask = {
    html: PHASE_ORDER.indexOf('html') < idx ? 1 : 0,
    css: PHASE_ORDER.indexOf('css') < idx ? 1 : 0,
    js: PHASE_ORDER.indexOf('js') < idx ? 1 : 0,
  };
  const closedPhase = idx > 0 ? PHASE_ORDER[idx - 1] : null;
  return { mask, closedPhase };
}

// ADMIN-07: mutation-returns-bool idempotent (còpia la forma de markPhaseDone). Retorna
// false si ja `state.finished` (segon finalize = no-op → mata la DoS de finalize-spam,
// T-04-04); si no, marca l'estat terminal, desa una còpia CONGELADA del ranking final
// (F5 recovery, Pitfall 4) i retorna true.
function finalizeGame() {
  if (state.finished) return false; // ja finalitzat — no-op (anti-storm)
  state.finished = true;
  state.finalRanking = buildRanking(); // snapshot congelat (complet)
  return true;
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

// Mirall de nextPhase (D-01/D-02/D-03): decrementa l'índex en lloc d'incrementar-lo.
// Reutilitzar startPhase satisfà D-02 (remainingMsAtPause=null, timer nou) i D-03 (mai
// toca team.doneAt) de franc — NO afegir cap lògica de recuperació de timer ni cap reset
// de doneAt en aquest camí. No-op (false) si ja és la primera fase o no hi ha cap fase
// activa (Pitfall 5).
function previousPhase(durationMs) {
  if (state.finished) return false; // WR-02: mai retrocedir un cop finalitzat (V4 — mirall del guard de finalizeGame)
  const currentIndex = state.phase ? PHASE_ORDER.indexOf(state.phase) : -1;
  const prevIndex = currentIndex - 1;
  if (prevIndex < 0) return false;
  return startPhase(PHASE_ORDER[prevIndex], durationMs);
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
  removePiece,
  getTeamBoard,
  setCssValue,
  getTeamStyle,
  setJsRules,
  getTeamRules,
  markPhaseDone,
  getTeamDoneState,
  buildRanking,
  getPartialContext,
  finalizeGame,
  startPhase,
  nextPhase,
  previousPhase,
  pauseTimer,
  resumeTimer,
  extendTimer,
  checkExpiry,
};
