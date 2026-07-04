// Team screen: identity resolution (token in localStorage, D-02), team
// selection prompt for unclaimed PCs (D-01), i la maquina d'estats de
// pantalla completa (D-05 espera / D-06 interstici / split actiu GAME-01,
// GAME-02 / D-11 congelat). Tot es deriva EXCLUSIVAMENT de
// `session:full-state` — el client mai decideix una transicio pel seu
// compte (estat autoritatiu al servidor, T-04-03).

import { io } from 'socket.io-client';
import { createElement, Lock, MoveDown } from 'lucide';
import Sortable from 'sortablejs';
import DOMPurify from 'dompurify';
import { renderCountdown } from './shared/timer.js';
import { EVENTS } from '../server/events.js';
import {
  SLOTS,
  PIECES,
  DISTRACTORS,
  CSS_HOLES,
  JS_EVENTS,
  JS_ELEMENTS,
  JS_ELEMENT_LABELS,
  JS_ACTION_KEYS,
  JS_COMPOSITE_KEYS,
  JS_ACTION_LABELS,
  JS_ROW_LIMIT,
  pieceLabel,
  containerLabel,
  containerClosingLabel,
} from '../shared/robotTemplate.js';
import { attachRule } from '../shared/effects.js';

const TOKEN_KEY = 'teamToken';
const TEAM_ID_KEY = 'teamId';
const STYLE_ID = 'client-styles';
const INTERSTITIAL_MS = 1200;
const PHASE_LABELS = { html: 'HTML', css: 'CSS', js: 'JS' };

// So curt sintetitzat in-browser (Web Audio, sense assets externs a servir/baixar).
// AudioContext únic, creat mandrosament al primer gest: l'autoplay-policy dels
// navegadors exigeix un gest d'usuari abans de reproduir àudio, i un drag ho és.
// Envelope de gain curt (attack ~10ms, decay ràpid) i volum baix perquè sigui un
// "blip" net i suau — no un to cru — amb 4-6 equips sonant alhora a l'aula.
let audioCtx = null;
function playTone(freq, durationMs) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const now = audioCtx.currentTime;
    const dur = durationMs / 1000;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01); // attack curt, volum baix
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur); // decay suau
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch {
    // El so és una millora, mai bloqueja el joc si Web Audio falla/està bloquejat.
  }
}
function playPickupSound() {
  playTone(440, 90); // to mitjà curt en agafar una peça
}
function playDropSound() {
  playTone(660, 110); // to més agut i lleugerament més llarg en col·locar-la bé
}

// So d'alerta tipus campana en equivocar-se (rebuig d'una peça). Dos parcials
// sinusoïdals inharmònics (fonamental + sobretò) barrejats per una sola envelope
// de gain amb decay llarg (~350ms) → es llegeix com un "ding" de campana, no com
// el "blip" curt de 90-110ms de pickup/drop. Reutilitza el mateix AudioContext
// mandrós (mai en crea un de nou), coherent amb playTone.
function playAlertSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const now = audioCtx.currentTime;
    const dur = 0.35; // decay llarg → campana, no blip
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01); // attack curt, volum baix
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur); // cua llarga de campana
    [880, 1480].forEach((freq) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + dur);
    });
    gain.connect(audioCtx.destination);
  } catch {
    // El so és una millora, mai bloqueja el joc si Web Audio falla/està bloquejat.
  }
}

// So d'arrossegament tipus "cremallera obrint-se poc a poc": en comptes d'una
// textura contínua de soroll filtrat (que sonava massa densa/gruixuda), és un TREN
// de clics curts i discrets a ritme pausat — cada clic = una "dent" de la cremallera
// que enganxa. Es manté exactament el que dura el drag i s'atura al mateix onEnd
// que abans (calaix i per-slot). Ritme ~115ms amb un jitter de ±18ms perquè no soni
// a metrònom rígid (les cremalleres reals no són perfectament regulars).
const ZIP_TICK_BASE_MS = 115;
const ZIP_TICK_JITTER_MS = 18;

// Un sol "clic" de dent: pols de soroll blanc molt breu (~14ms) passat per un
// highpass (talla els greus → sona a "tic" sec i brillant, no a "fsss") amb una
// envelope de gain d'atac immediat i decay ràpid (percussiu). Volum baix (aula,
// 4-6 equips alhora). Reutilitza el mateix AudioContext mandrós, com playTone.
function playZipTick() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const now = audioCtx.currentTime;
    const dur = 0.014; // ~14ms: prou curt per llegir-se com un clic, no una textura
    const bufLen = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buffer = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i += 1) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2600; // deixa passar només l'agut → "clic" sec de dent
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.06, now); // atac immediat, volum baix
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur); // decay ràpid (percussiu)
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start(now);
    src.stop(now + dur);
  } catch {
    // El so és una millora, mai bloqueja el drag si Web Audio falla/està bloquejat.
  }
}

// Arrenca el tren de clics i el manté fins a stopDragNoise. Primer clic immediat
// (el so comença alhora que agafes la peça) i els següents es reprogramen amb
// setTimeout + jitter. Timer únic (defensiu contra dobles starts: SortableJS només
// permet un drag, però mai deixem dos trens sonant alhora).
let dragTickTimer = null;
function startDragNoise() {
  stopDragNoise();
  const scheduleNext = () => {
    const delay = ZIP_TICK_BASE_MS + (Math.random() * 2 - 1) * ZIP_TICK_JITTER_MS;
    dragTickTimer = setTimeout(() => {
      playZipTick();
      scheduleNext();
    }, delay);
  };
  playZipTick(); // dent inicial immediata
  scheduleNext();
}

// Atura el tren de clics (idempotent). No cal fade: cada tick ja s'ha extingit;
// només deixem de programar-ne de nous.
function stopDragNoise() {
  if (dragTickTimer) {
    clearTimeout(dragTickTimer);
    dragTickTimer = null;
  }
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .fullscreen-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-lg);
      text-align: center;
      padding: var(--space-xl);
      box-sizing: border-box;
    }
    .selection-heading,
    .waiting-team-name {
      font-size: var(--font-size-heading);
      font-weight: var(--font-weight-heading);
      margin: 0;
    }
    .waiting-status {
      font-size: var(--font-size-body);
      color: var(--color-muted);
      margin: 0;
    }
    .team-select-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      width: 100%;
      max-width: 320px;
    }
    .team-select-btn {
      min-height: var(--hit-target-min);
      padding: 0 var(--space-lg);
      border-radius: 6px;
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function clearApp() {
  const app = document.getElementById('app');
  app.textContent = '';
  return app;
}

function renderSelectionPrompt(socket, teams) {
  const app = clearApp();
  const container = document.createElement('div');
  container.className = 'fullscreen-screen';

  const heading = document.createElement('h1');
  heading.className = 'selection-heading';
  heading.textContent = 'Quin equip sou?';
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'team-select-list';
  for (const team of teams) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'team-select-btn';
    btn.textContent = team.name; // DOM text API only (V5 anti-XSS)
    btn.addEventListener('click', () => {
      socket.emit('team:select', { teamId: team.id });
    });
    list.appendChild(btn);
  }
  container.appendChild(list);

  app.appendChild(container);
}

// D-05: pantalla d'espera dedicada a pantalla completa abans que l'admin
// iniciï la primera fase — prioritza calma cognitiva ("encara no toca res").
function renderWaitingScreen(team) {
  teardownBoard();
  const app = clearApp();
  const container = document.createElement('div');
  container.className = 'fullscreen-screen';

  const nameEl = document.createElement('h1');
  nameEl.className = 'waiting-team-name';
  nameEl.textContent = team.name;

  const statusEl = document.createElement('p');
  statusEl.className = 'waiting-status';
  statusEl.textContent = 'Connectat ✓, esperant el professor';

  container.appendChild(nameEl);
  container.appendChild(statusEl);
  app.appendChild(container);
}

// D-06: interstici breu (~1.2s) entre fases, amb el color de la fase com a
// accent (UX-02) — reforça el model mental HTML→CSS→JS abans de revelar el
// split actiu.
function renderInterstitialScreen(phase) {
  teardownBoard();
  const app = clearApp();
  const container = document.createElement('div');
  container.className = 'interstitial-screen';
  container.dataset.phase = phase;

  const label = document.createElement('p');
  label.className = 'interstitial-label';
  label.textContent = `Ara: Fase ${PHASE_LABELS[phase]}`;
  container.appendChild(label);

  app.appendChild(container);
}

// --- Fase HTML: calaix + tauler drag & drop (GAME-03) ---
// El board autoritatiu viu al servidor; el DOM local després d'un drag és
// optimista i es reconcilia amb team:board-state. latestPlacement guarda l'últim
// board rebut perquè un session:full-state (update quirúrgic) no el perdi.

let socket = null; // assignat a bootClient(); usat pels handlers de drag (onAdd)
let latestPlacement = {};
let latestCssValues = {}; // últim TEAM_CSS_STATE rebut (fase css); usat en render/F5
let latestJsRules = []; // últim TEAM_JS_STATE rebut (fase js); usat en preview/F5
let jsPanelRows = null; // còpia de treball LOCAL del panell de regles (permet files parcials)
let jsEnterIndex = -1; // índex de la fila a animar (slide-in), consumit a cada pinta
let sortables = []; // instàncies SortableJS actives (destruïdes en re-render/teardown)
let boardMounted = false;
// Ordre del calaix barrejat UN COP per càrrega de pàgina (checkpoint 02-03 round 4):
// l'usuari vol que les peces NO apareguin en ordre de declaració. Es calcula un
// ordre aleatori (Fisher-Yates) la primera vegada i es reutilitza tota la sessió,
// de manera que col·locar/treure peces només encongeix/creix el conjunt visible
// sense reordenar-lo — respecta el "mai un reshuffle a cada board-state" de
// fillDrawer (les peces no salten de posició). Només un F5 (nova càrrega de
// pàgina) en genera un de nou, cosa acceptable (nova sessió → nova barreja).
let pieceTypeOrder = null;

// Lazy-init: barreja els 7 tipus distints la primera crida i cacheja el resultat;
// les crides posteriors retornen sempre el mateix ordre (estabilitat mid-sessió).
function getPieceTypeOrder() {
  if (pieceTypeOrder) return pieceTypeOrder;
  const types = PIECES.map((p) => p.type);
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  pieceTypeOrder = types;
  return pieceTypeOrder;
}

function destroySortables() {
  sortables.forEach((s) => s.destroy());
  sortables = [];
}

// Es crida en sortir del split html (espera/interstici) — el tauler ja no existeix.
function teardownBoard() {
  destroySortables();
  boardMounted = false;
}

// Inventari restant = PIECES menys les peces ja col·locades (derivat del board
// autoritatiu, Pitfall 5). Retorna una llista plana de tipus per pintar al calaix,
// ordenada segons la barreja estable per sessió (getPieceTypeOrder) en comptes de
// l'ordre de declaració de PIECES — així el calaix es veu mesclat però NO es
// reordena a cada board-state (només encongeix/creix). Les peces del mateix tipus
// (p.ex. els 2 `ull`) són visualment idèntiques, així que el seu ordre relatiu
// intern és irrellevant; només importa l'ordre ENTRE tipus.
function remainingPieces(placement) {
  const placedCounts = {};
  for (const type of Object.values(placement)) {
    placedCounts[type] = (placedCounts[type] || 0) + 1;
  }
  const totalByType = {};
  for (const { type, count } of PIECES) totalByType[type] = count;
  const chips = [];
  for (const type of getPieceTypeOrder()) {
    const remaining = totalByType[type] - (placedCounts[type] || 0);
    for (let i = 0; i < remaining; i += 1) chips.push(type);
  }
  return chips;
}

// Chip read-only (D-12, checkpoint 02-03 round 2): NOMÉS el code label, cap icona
// ni thumbnail. L'etiqueta = el tag HTML literal real en monospace amb angle
// brackets (p.ex. `<img src="assets/aerial_left.png" class="antena">`, derivat de
// SLOTS via pieceLabel). data-type porta el tipus DIRECCIONAL complet (round 3,
// p.ex. `antena-esquerra`) perquè el put type-check de SortableJS rebutgi una peça
// esquerra sobre el forat dret. Cap camp editable (GAME-06).
function createChip(type) {
  const chip = document.createElement('div');
  chip.className = 'piece-chip';
  chip.dataset.type = type;

  const label = document.createElement('span');
  label.className = 'piece-chip__label';
  // textContent, no innerHTML: els `< >` són text pla, mai markup (V5 anti-XSS).
  label.textContent = pieceLabel(type);
  chip.appendChild(label);
  return chip;
}

// Distractor còmic (D-11, override checkpoint 02-03 round 2): ara SÍ mostra un
// code label literal com a gag d'HTML còmic ("si no no serveixen de res"), sense
// emoji. NOTA: per `sabata` la classe MOSTRADA és `sabatilla`, no `sabata` — és
// una cadena display-only volguda; la clau interna `type`/dataset.type es manté
// `sabata` (l'usa el revert-per-type-mismatch de SortableJS), NO és cap typo.
const DISTRACTOR_LABELS = {
  banana: '<p class="banana">',
  roda: '<h3 class="roda">',
  sabata: '<img src="assets/slipper.jpg" class="sabatilla">',
};
function createDistractorChip(type) {
  const chip = document.createElement('div');
  chip.className = 'piece-chip piece-chip--distractor';
  chip.dataset.type = type;
  const label = document.createElement('span');
  label.className = 'piece-chip__label';
  // textContent, no innerHTML: els `< >` són text pla, mai markup (V5 anti-XSS).
  label.textContent = DISTRACTOR_LABELS[type] || '';
  chip.appendChild(label);
  return chip;
}

// Ordre estable del calaix: peces bones restants amb els 3 distractors intercalats
// de forma determinista (barrejats visualment) — mai un shuffle aleatori, que
// reordenaria el calaix a cada board-state i afegiria soroll cognitiu.
function fillDrawer(calaix, placement) {
  const good = remainingPieces(placement);
  let di = 0;
  good.forEach((type, i) => {
    calaix.appendChild(createChip(type));
    if ((i + 1) % 2 === 0 && di < DISTRACTORS.length) {
      calaix.appendChild(createDistractorChip(DISTRACTORS[di]));
      di += 1;
    }
  });
  while (di < DISTRACTORS.length) {
    calaix.appendChild(createDistractorChip(DISTRACTORS[di]));
    di += 1;
  }
}

function createSlot(slot, placement) {
  const el = document.createElement('div');
  el.className = 'slot';
  el.dataset.slotId = slot.id;
  el.dataset.accepts = slot.accepts; // type-check de capacitat (SortableJS put)
  // Slot buit SENSE etiqueta (checkpoint 02-03 round 2): només fons vermell (CSS).
  const placed = placement[slot.id];
  if (placed) {
    el.classList.add('slot--filled');
    el.appendChild(createChip(placed)); // 1 fill real → capacitat consumida
  }
  return el;
}

// El frame del contenidor mostra ARA les etiquetes d'obertura I tancament
// (checkpoint 02-03 round 2): obertura a dalt-esquerra via CSS ::before,
// tancament a baix-esquerra via CSS ::after. Ambdues derivades de CONTAINERS.
function createFrame(name) {
  const frame = document.createElement('div');
  frame.className = 'slot-frame';
  frame.dataset.label = containerLabel(name); // tag d'obertura via CSS ::before
  frame.dataset.labelClose = containerClosingLabel(name); // tag de tancament via ::after
  return frame;
}

function slotById(id) {
  return SLOTS.find((s) => s.id === id);
}

// Tauler de slots niats que reflecteix vagament la disposició del robot
// (UI-SPEC §Layout) perquè esquerra i preview es corresponguin.
function buildBoard(placement) {
  const board = document.createElement('div');
  board.className = 'tauler';

  const section = createFrame('robot-contenidor');

  const antenaRow = document.createElement('div');
  antenaRow.className = 'slot-row';
  antenaRow.appendChild(createSlot(slotById('antena-esquerra'), placement));
  section.appendChild(antenaRow);

  const orellaRow = document.createElement('div');
  orellaRow.className = 'slot-row';
  orellaRow.appendChild(createSlot(slotById('orella-esquerra'), placement));
  orellaRow.appendChild(createSlot(slotById('orella-dreta'), placement));
  section.appendChild(orellaRow);

  const cap = createFrame('robot-cap');

  const ulls = createFrame('contenidor-ulls');
  const ullRow = document.createElement('div');
  ullRow.className = 'slot-row';
  ullRow.appendChild(createSlot(slotById('ull-1'), placement));
  ullRow.appendChild(createSlot(slotById('ull-2'), placement));
  ulls.appendChild(ullRow);
  cap.appendChild(ulls);

  cap.appendChild(createSlot(slotById('nas'), placement));
  cap.appendChild(createSlot(slotById('boca'), placement));
  section.appendChild(cap);

  board.appendChild(section);
  return board;
}

function buildProgress(placement) {
  const wrap = document.createElement('div');
  wrap.className = 'progress-pieces';
  const placed = Object.keys(placement).length;

  const label = document.createElement('span');
  label.className = 'progress-pieces__label';
  label.textContent = `${placed}/${SLOTS.length} peces`;
  wrap.appendChild(label);

  const pips = document.createElement('div');
  pips.className = 'progress-pieces__pips';
  for (let i = 0; i < SLOTS.length; i += 1) {
    const pip = document.createElement('span');
    pip.className = i < placed ? 'pip pip--filled' : 'pip';
    pips.appendChild(pip);
  }
  wrap.appendChild(pips);
  return wrap;
}

// Pista/separador PERMANENT calaix→tauler (checkpoint 02-03 round 5): fusiona en
// UN sol element l'antiga pista dismissible (D-14, buildHint) i el separador
// (round 3, buildDivider), que mostraven dos textos alhora. Ara: sempre visible
// (mai es descarta), fletxa MoveDown animada verticalment (el calaix queda a dalt,
// el tauler a baix → "cap aquí abaix") + text fix. ~50px d'aire a dalt i a baix
// ho fa el CSS (.drag-hint) via --space-2xl, cap literal.
function buildDragHint() {
  const hint = document.createElement('div');
  hint.className = 'drag-hint';
  const arrow = createElement(MoveDown);
  arrow.classList.add('drag-hint__arrow'); // objectiu del loop vertical ±4px (CSS)
  arrow.setAttribute('width', '20');
  arrow.setAttribute('height', '20');
  hint.appendChild(arrow);
  const txt = document.createElement('span');
  // textContent (no innerHTML): text pla, coherent amb la resta d'etiquetes (V5).
  txt.textContent = 'Arrossega les etiquetes cap aquí abaix';
  hint.appendChild(txt);
  return hint;
}

// SortableJS: un Sortable per slot (capacitat 1). group.put com a funció fa el
// type-check (D-07); emptyInsertThreshold és l'imant (D-09); el revert natiu és
// el rebot (D-09/D-11, distractors inclosos). onAdd emet l'intent al servidor.
function initSortables(calaixEl, slotEls) {
  const drawer = new Sortable(calaixEl, {
    group: { name: 'robot', pull: true, put: true },
    sort: false,
    animation: 150,
    emptyInsertThreshold: 40,
    onStart: () => {
      playPickupSound(); // so curt d'agafar quan el drag surt del calaix
      startDragNoise(); // tren de clics tipus cremallera mentre dura l'arrossegament
    },
    onAdd: (evt) => {
      // Una peça que torna des d'un slot cap al calaix = treure (D-10). El
      // board-state autoritatiu reconciliarà el DOM; cap diàleg de confirmació
      // (undo sense fricció, UI-SPEC §Copywriting).
      if (evt.from.dataset.slotId) {
        socket.emit(EVENTS.TEAM_REMOVE_PIECE, { slotId: evt.from.dataset.slotId });
      }
    },
    onEnd: (evt) => {
      stopDragNoise(); // atura el so d'arrossegament, sigui quin sigui el final del drag
      // ÚNIC lloc que dispara la campana de rebuig: un intent de COL·LOCACIÓ sempre
      // arrenca del calaix. Cap slot l'accepta → revert natiu al calaix (from===to)
      // → so d'alerta per a QUALSEVOL peça rebutjada: distractor O peça bona en slot
      // incorrecte (p.ex. antena-esquerra sobre el forat dret), NO només distractors
      // (broadening deliberat, checkpoint 02-03 round 6). Els drags que arrenquen
      // d'un slot (moure/treure) NO sonen la campana (vegeu el seu onEnd).
      if (evt.from === evt.to) {
        playAlertSound();
      }
      // Shake visual: es manté NOMÉS per a distractors (scope inalterat de rounds
      // previs) — només el so nou usa la condició més àmplia.
      if (evt.item.classList.contains('piece-chip--distractor') && evt.from === evt.to) {
        const el = evt.item;
        el.classList.remove('piece-chip--shake');
        void el.offsetWidth; // reflow → re-dispara l'animació en rebots repetits
        el.classList.add('piece-chip--shake');
        setTimeout(() => el.classList.remove('piece-chip--shake'), 320);
      }
    },
  });
  sortables.push(drawer);

  for (const slotEl of slotEls) {
    const s = new Sortable(slotEl, {
      group: {
        name: 'robot',
        pull: true,
        put: (to, _from, dragEl) =>
          to.el.children.length === 0 && dragEl.dataset.type === to.el.dataset.accepts,
      },
      sort: false,
      animation: 150,
      emptyInsertThreshold: 40,
      onStart: () => {
        playPickupSound(); // so curt d'agafar quan el drag surt d'un slot
        startDragNoise(); // tren de clics tipus cremallera mentre dura l'arrossegament
      },
      onAdd: (evt) => {
        playDropSound(); // col·locació correcta "a baix" al tauler (≠ revert al calaix)
        evt.to.classList.add('slot--filled', 'slot--accepting');
        setTimeout(() => evt.to.classList.remove('slot--accepting'), 250);
        socket.emit(EVENTS.TEAM_PLACE_PIECE, {
          slotId: evt.to.dataset.slotId,
          pieceType: evt.item.dataset.type,
        });
      },
      onEnd: () => {
        // NOMÉS atura el so d'arrossegament — cap so d'alerta aquí. Un drag que
        // ARRENCA d'un slot (reprendre una peça ja col·locada per moure-la o
        // treure-la) i acaba tornant al mateix slot (revert natiu, from===to) NO
        // és un error de col·locació: és un no-op o una retirada avortada. La
        // campana de rebuig queda ESTRICTAMENT per als intents de COL·LOCACIÓ
        // rebutjats, que sempre arrenquen del calaix i reverteixen al calaix
        // (drawer onEnd, únic lloc que la dispara). Abans, la campana per-slot es
        // disparava en reprendre una peça CORRECTA i deixar-la anar fora d'un
        // target vàlid: SortableJS la rebotava de tornada al seu slot (una
        // animació de "retorn" cap amunt) alhora que sonava l'alerta, cosa que es
        // llegia com un rebuig sobre una peça ja ben posada (fix checkpoint 02-03).
        stopDragNoise();
      },
    });
    sortables.push(s);
  }
}

// (Re)construeix calaix+tauler dins .html-game i re-inicialitza SortableJS.
// Idempotent: destrueix sempre les instàncies velles primer.
function mountGame(gameContainer, placement) {
  destroySortables();
  gameContainer.textContent = '';

  gameContainer.appendChild(buildProgress(placement));

  const calaix = document.createElement('div');
  calaix.className = 'calaix';
  fillDrawer(calaix, placement); // peces restants (Pitfall 5) + distractors (D-11)
  gameContainer.appendChild(calaix);

  // Pista/separador permanent a la costura calaix→tauler (round 5): un sol
  // element sempre visible amb fletxa avall + text.
  gameContainer.appendChild(buildDragHint());

  const board = buildBoard(placement);
  gameContainer.appendChild(board);

  initSortables(calaix, [...board.querySelectorAll('.slot')]);
  boardMounted = true;
}

// Assembla el robot real des de SLOTS[].html (mai text d'usuari, GAME-06),
// el saneja amb DOMPurify preservant id/class/src/alt i <output> (Pitfall 2),
// i l'injecta al srcdoc de l'iframe amb la capa de fons fix (D-03).
function wrapPreview(inner) {
  // Fons fix de la meitat dreta (D-03). Cadena estàtica de confiança (mai dades
  // d'usuari), segura per incrustar literalment. Asset local (src/client/public/
  // robot-fons.png, imatge Futurama) — substitueix l'antiga URL d'Unsplash, ja
  // no depèn de xarxa externa el dia de la sessió.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; height: 100%; }
    /* Centra el robot a l'iframe (equivalent al body flex de la font de veritat). */
    body {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    /* Capa de fons fixa (D-03) — asset local, sense dependència de xarxa. */
    #robot-fons {
      position: fixed;
      inset: 0;
      background-image: url('/robot-fons.png');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      background-repeat: no-repeat;
      background-color: rgba(30, 40, 50, 0.75);
      background-blend-mode: overlay;
    }

    /* --- Disseny final del robot Bender: copiat literalment de la font de veritat
       (/Users/rogermasellas/Desktop/imparticio/index.html, línies 25-179). Cada un
       dels 16 forats de la Fase CSS (CSS_HOLES) és un var(--nom, <default>): abans que
       l'equip toqui res el fallback reprodueix el Bender; els canvis viuen via CSSOM
       setProperty (Pitfall 1/5), MAI reassignant el srcdoc. Els fixos (D-02/D-03/D-05
       /D-06/D-07/D-08/D-09) es queden com a valors literals. --- */
    #robot-contenidor {
      position: relative;
      width: 300px;
      margin: 160px auto;
    }

    /* #robot-cap (D-09: bg APLANA el gradient metàl·lic, border color/width forats;
       border-radius el·líptic de 8 valors FIX). */
    #robot-cap {
      position: relative;
      z-index: 10;
      width: 100%;
      height: 420px;
      background: var(--cap-bg, linear-gradient(90deg, #7d8798 0%, #a7b1c2 18%, #dbe3ee 32%, #b0b9c9 50%, #8b96a8 72%, #6f7889 100%));
      border: var(--cap-border-width, 6px) solid var(--cap-border-color, #232c3a);
      border-radius: 50% 50% 38% 38% / 62% 62% 18% 18%;
      box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.35), inset 0 0 70px rgba(0, 0, 0, 0.2), 0 15px 35px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 34px;
      padding-top: 150px;
      box-sizing: border-box;
    }

    /* .antena (D-03: bg APLANA el radial-gradient de la bola, border s'AFEGEIX; tija
       /mida/posició FIX, D-02). La bola és .antena::before. */
    .antena {
      position: absolute;
      top: -55px;
      left: 50%;
      transform: translateX(-50%);
      width: 6px;
      height: 55px;
      z-index: 5;
      background: linear-gradient(90deg, #6f7889 0%, #cfd6e0 50%, #6f7889 100%);
      border-radius: 3px;
    }

    .antena::before {
      content: "";
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--antena-bg, radial-gradient(circle at 35% 30%, #e6ffff 0%, #7dfcff 45%, #17d8e0 80%));
      border: 2px solid var(--antena-border, transparent);
      box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
      box-sizing: border-box;
    }

    /* .orella (D-04: top, offset simètric left/right, width són forats). */
    .orella {
      position: absolute;
      top: var(--orella-top, 130px);
      width: var(--orella-width, 70px);
      z-index: 11;
      filter: grayscale(1) brightness(1.05) sepia(0.1) hue-rotate(175deg) saturate(1.2);
      opacity: 0.95;
    }

    #orella-esquerra {
      left: var(--orella-offset, -52px);
    }

    #orella-dreta {
      right: var(--orella-offset, -52px);
    }

    /* .contenidor-ulls (D-05: bg pla + top forats; CAL position:relative per al top —
       la font és un fill flex no posicionat. Resta FIX). */
    .contenidor-ulls {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 78%;
      height: 92px;
      background: var(--ulls-bg, #cfe1ee);
      border: 6px solid #1c2530;
      border-radius: 46px;
      box-sizing: border-box;
      padding: 8px;
      position: relative;
      top: var(--ulls-top, 0px);
      box-shadow: inset 0 3px 6px rgba(255, 255, 255, 0.6), inset 0 -4px 10px rgba(0, 0, 0, 0.15);
    }

    /* .ull (D-06: border-radius forat; color/mida/pupil·la FIX). */
    .ull {
      display: inline-block;
      position: relative;
      width: 58px;
      height: 64px;
      background: #f2e6a8;
      border-radius: var(--ull-radius, 50%);
      box-sizing: border-box;
      box-shadow: inset 0 0 0 3px #1c2530;
      margin: 0 -6px;
      transition: background 0.2s ease, box-shadow 0.2s ease;
    }

    .ull::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 12px;
      height: 12px;
      background: #1c1c1c;
      transform: translate(-50%, -50%);
    }

    /* #nas (D-07: border-radius + mida (width/height) forats; color negre FIX). */
    #nas {
      width: var(--nas-size, 22px);
      height: var(--nas-size, 22px);
      background: radial-gradient(circle at 35% 30%, #cfd6e0 0%, #8b95a5 60%, #5c6576 100%);
      border-radius: var(--nas-radius, 50%);
      border: 2px solid #232c3a;
      cursor: pointer;
      box-sizing: border-box;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.7);
      transition: filter 0.2s ease;
    }

    #nas:hover {
      filter: brightness(1.25);
    }

    /* #boca (D-08: height (CAL afegir, font padding-driven), width, dents-color forats;
       border-radius FIX. Target dents #fffcd3 locked; #f2e6a8 només fallback del var()). */
    #boca {
      display: block;
      width: var(--boca-width, 60%);
      height: var(--boca-height, auto);
      background: repeating-linear-gradient(180deg, var(--boca-dents, #f2e6a8) 0px, var(--boca-dents, #f2e6a8) 16px, #1c2530 16px, #1c2530 19px);
      color: #1c2530;
      font-family: 'Courier New', Courier, monospace;
      font-weight: bold;
      font-size: 18px;
      letter-spacing: 2px;
      padding: 14px 18px;
      border-radius: 0 0 40px 40px;
      border: 4px solid #1c2530;
      border-top: none;
      text-align: center;
      margin: 0 auto;
      box-sizing: border-box;
      box-shadow: inset 0 -6px 10px rgba(0, 0, 0, 0.2);
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
    }

    /* --- Fase JS: classes d'efecte que l'intèrpret PARENT commuta via classList
       (src/shared/effects.js ACTIONS/COMPOSITES). Viuen aquí al srcdoc; el pare mai
       injecta innerHTML (T-03-11). "Girar" té un fallback estàtic visible amb
       reduced-motion; sota no-preference gira en continu. La resta transiciona suau. */
    @keyframes js-rotate-kf { to { transform: rotate(360deg); } }
    .js-rotate { transform: rotate(20deg); }
    .js-scale { transform: scale(1.4); }
    .js-squint { transform: scaleY(0.2); }
    .js-boca-tanca { transform: scaleY(0.15); }
    .js-vermell { background-color: #e23b3b !important; }
    @media (prefers-reduced-motion: no-preference) {
      .js-rotate { transform: none; animation: js-rotate-kf 1.2s linear infinite; }
      .js-scale, .js-squint, .js-boca-tanca { transition: transform 0.2s ease; }
    }
  </style></head><body><div id="robot-fons"></div>${inner}</body></html>`;
}

// Assembla el markup net del robot (mai text d'usuari, GAME-06) i el saneja amb
// DOMPurify. Fn pura i reutilitzable: la fase html l'injecta via assemblePreview();
// la fase css el passa a wrapPreview() UNA vegada per entrada de fase (Pitfall 1).
function assembleRobotMarkup(placement) {
  const antenesOrelles = SLOTS.filter((s) => s.parent === 'section' && placement[s.id])
    .map((s) => s.html)
    .join('');
  const ulls = SLOTS.filter((s) => s.parent === 'contenidor-ulls' && placement[s.id])
    .map((s) => s.html)
    .join('');
  const nas = placement.nas ? slotById('nas').html : '';
  const boca = placement.boca ? slotById('boca').html : '';

  // Markup de render real (mai text d'usuari, GAME-06). Els contenidors reflecteixen
  // CONTAINERS de robotTemplate.js (D-01) — es manté inline i explícit per llegibilitat
  // de l'estructura niada; CONTAINERS n'és la definició canònica per a les etiquetes.
  const raw = `<section id="robot-contenidor">${antenesOrelles}<div id="robot-cap"><div class="contenidor-ulls">${ulls}</div>${nas}${boca}</div></section>`;
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['output'],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'id'],
  });
}

function assemblePreview(placement) {
  const frame = document.querySelector('.preview-frame');
  if (frame) frame.setAttribute('srcdoc', wrapPreview(assembleRobotMarkup(placement)));
}

// --- Fase CSS: aplicació en viu via CSSOM (GAME-04, Pitfall 1/5) ---
// Aplica un forat com a custom property sobre :root del contentDocument. NO-OP
// silenciós si l'iframe encara no és ready o el holeId és desconegut (GAME-07/D-19):
// setProperty sobre documentElement no fa cap lookup d'element, així que un forat
// sobre un element absent (DOM incomplet) mai llença. setProperty (mai text CSS
// concatenat) tanca el vector d'injecció (Pitfall 5).
function applyCssHole(holeId, value) {
  const doc = document.querySelector('.preview-frame')?.contentDocument;
  if (!doc) return;
  const cssVar = CSS_HOLES[holeId]?.var;
  if (!cssVar) return;
  doc.documentElement.style.setProperty(cssVar, value);
}

function applyAllCssValues(cssValues) {
  for (const [holeId, value] of Object.entries(cssValues)) applyCssHole(holeId, value);
}

// Ordre top→bottom dels grups de selector (lectura espacial del robot, UI-SPEC
// §Layout Contract). Els grups es deriven de CSS_HOLES[].group (single source).
const CSS_GROUP_ORDER = ['.antena', '.orella', '.contenidor-ulls', '.ull', '#robot-cap', '#nas', '#boca'];

// Construeix una fila de forat: etiqueta propietat monospace (read-only, GAME-06) +
// control natiu (color/range) + readout monospace del valor viu + `;`. El cablejat:
// `input` → applyCssHole local instantani (CSSOM, sense recàrrega); `change` →
// TEAM_SET_CSS al servidor (emissió només en valor assentat, anti-storm, Pitfall 2).
function renderForatRow(holeId, hole, storedValue, frozen) {
  const row = document.createElement('div');
  row.className = `css-forat css-forat--${hole.control}`;

  const propLabel = document.createElement('span');
  propLabel.className = 'css-forat__prop';
  propLabel.textContent = `${hole.prop}:`;
  row.appendChild(propLabel);

  const input = document.createElement('input');
  input.dataset.hole = holeId;
  input.disabled = frozen;

  const readout = document.createElement('span');
  readout.className = 'css-forat__value';

  if (hole.control === 'color') {
    input.type = 'color';
    input.className = 'css-forat__swatch';
    const initial = typeof storedValue === 'string' && /^#[0-9a-fA-F]{6}$/.test(storedValue)
      ? storedValue
      : hole.default;
    input.value = initial;
    readout.textContent = initial;
    input.addEventListener('input', (e) => {
      applyCssHole(holeId, e.target.value);
      readout.textContent = e.target.value;
    });
    input.addEventListener('change', (e) => {
      socket.emit(EVENTS.TEAM_SET_CSS, { holeId, value: e.target.value });
    });
  } else {
    input.type = 'range';
    input.className = 'css-forat__range';
    input.min = String(hole.min);
    input.max = String(hole.max);
    input.step = String(hole.step);
    const num = storedValue != null ? parseInt(storedValue, 10) : parseInt(hole.default, 10);
    input.value = String(num);
    const fmt = (n) => `${n}${hole.unit}`;
    readout.textContent = fmt(num);
    input.addEventListener('input', (e) => {
      const v = fmt(e.target.value);
      applyCssHole(holeId, v);
      readout.textContent = v;
    });
    input.addEventListener('change', (e) => {
      socket.emit(EVENTS.TEAM_SET_CSS, { holeId, value: fmt(e.target.value) });
    });
  }

  row.appendChild(input);
  row.appendChild(readout);

  const semi = document.createElement('span');
  semi.className = 'css-forat__punct';
  semi.textContent = ';';
  row.appendChild(semi);

  return row;
}

// Panell de forats CSS (GAME-04): un grup per element (CSS_HOLES[].group), cada
// grup un marc monospace `.selector {` … `}` amb les seves files de forat. Tot es
// deriva de CSS_HOLES — cap llista escrita a mà (single source, com SLOTS).
function renderCssPanel(cssValues) {
  const wrap = document.createElement('div');
  wrap.className = 'css-panel';
  const frozen = latestState?.timerStatus === 'frozen'; // D-11: congela els controls

  const byGroup = new Map();
  for (const [holeId, hole] of Object.entries(CSS_HOLES)) {
    if (!byGroup.has(hole.group)) byGroup.set(hole.group, []);
    byGroup.get(hole.group).push([holeId, hole]);
  }

  for (const group of CSS_GROUP_ORDER) {
    const holes = byGroup.get(group);
    if (!holes) continue;
    const groupEl = document.createElement('div');
    groupEl.className = 'css-forat-group';

    const open = document.createElement('div');
    open.className = 'css-forat-group__label';
    open.textContent = `${group} {`;
    groupEl.appendChild(open);

    for (const [holeId, hole] of holes) {
      groupEl.appendChild(renderForatRow(holeId, hole, cssValues[holeId], frozen));
    }

    const close = document.createElement('div');
    close.className = 'css-forat-group__label';
    close.textContent = '}';
    groupEl.appendChild(close);

    wrap.appendChild(groupEl);
  }
  return wrap;
}

// Reconciliació dels controls del panell amb l'estat autoritatiu (F5/TEAM_CSS_STATE):
// actualitza value + readout in situ, sense reconstruir el panell (no interromp cap
// interacció; els emits només passen en `change` assentat, mai a mig drag).
function syncCssPanelInputs(cssValues) {
  const panel = document.querySelector('.css-panel');
  if (!panel) return;
  for (const [holeId, value] of Object.entries(cssValues)) {
    const input = panel.querySelector(`[data-hole="${holeId}"]`);
    const hole = CSS_HOLES[holeId];
    if (!input || !hole) continue;
    const readout = input.parentElement.querySelector('.css-forat__value');
    input.value = hole.control === 'color' ? value : String(parseInt(value, 10));
    if (readout) readout.textContent = value;
  }
}

// --- Fase JS: constructor de regles + intèrpret parent-driven (GAME-05) ---
// latestJsRules = últim TEAM_JS_STATE autoritatiu (regles completes, usat en
// preview/F5). jsPanelRows = còpia de treball LOCAL del panell (permet files
// parcials a mig omplir); és la font de veritat del que es pinta. S'emet
// TEAM_SET_RULES només amb les files COMPLETES (whole-array). Seed inicial des de
// latestJsRules a l'entrada de fase / F5.

// Opcions dels desplegables derivades del vocabulari frozen (single source, com SLOTS).
const JS_EVENT_OPTIONS = Object.keys(JS_EVENTS).map((k) => ({ value: k, label: k }));
const JS_ELEMENT_OPTIONS = Object.keys(JS_ELEMENTS).map((k) => ({ value: k, label: JS_ELEMENT_LABELS[k] }));
const JS_ACTION_OPTIONS = [...JS_ACTION_KEYS, ...JS_COMPOSITE_KEYS].map((k) => ({ value: k, label: JS_ACTION_LABELS[k] }));

function emptyJsRow() {
  return { event: '', origen: '', desti: '', accio: '' };
}

function isCompositeAccio(accio) {
  return JS_COMPOSITE_KEYS.includes(accio);
}

// Una fila és completa si té event+origen+acció i (si simple) destí. Les compostes
// no necessiten destí (D-17).
function isJsRowComplete(row) {
  if (!row.event || !row.origen || !row.accio) return false;
  return isCompositeAccio(row.accio) ? true : !!row.desti;
}

function isJsRowStarted(row) {
  return !!(row.event || row.origen || row.desti || row.accio);
}

// Parelles (event,origen) ja usades per ALTRES files (D-15 anti-repetició).
function usedJsPairs(exceptIndex) {
  const set = new Set();
  jsPanelRows.forEach((r, i) => {
    if (i !== exceptIndex && r.event && r.origen) set.add(`${r.event}|${r.origen}`);
  });
  return set;
}

// Normalitza una fila completa al ruleset canònic (composta ⇒ destí null, D-17).
function normalizeJsRow(row) {
  return {
    event: row.event,
    origen: row.origen,
    desti: isCompositeAccio(row.accio) ? null : row.desti,
    accio: row.accio,
  };
}

// Emet el ruleset (només files COMPLETES, whole-array). El servidor revalida i fa
// l'echo via TEAM_JS_STATE.
function emitJsRules() {
  const rules = jsPanelRows.filter(isJsRowComplete).map(normalizeJsRow);
  socket.emit(EVENTS.TEAM_SET_RULES, { rules });
}

// Desplegable natiu amb placeholder `…` dimmed. Opcions read-only via textContent
// (GAME-06/V5, mai innerHTML). onChange rep el value triat.
function buildJsSelect(options, value, disabled, onChange) {
  const sel = document.createElement('select');
  sel.className = 'js-rule__select';
  sel.disabled = disabled;
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '…';
  ph.disabled = true;
  ph.selected = !value;
  sel.appendChild(ph);
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.disabled) o.disabled = true;
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', (e) => onChange(e.target.value));
  return sel;
}

function jsWord(text) {
  const span = document.createElement('span');
  span.className = 'js-rule__word';
  span.textContent = text; // text pla, coherent amb la resta d'etiquetes (V5)
  return span;
}

function updateJsRow(index, field, value) {
  const row = jsPanelRows[index];
  row[field] = value;
  if (field === 'accio' && isCompositeAccio(value)) row.desti = null; // D-17: composta desactiva destí
  emitJsRules();
  refreshJsPanel(); // rebuild → actualitza els estats disabled (anti-repeat/composite)
}

function addJsRow() {
  if (jsPanelRows.length >= JS_ROW_LIMIT) return; // D-12
  jsPanelRows.push(emptyJsRow());
  jsEnterIndex = jsPanelRows.length - 1; // anima NOMÉS la fila nova
  refreshJsPanel();
}

function removeJsRow(index) {
  jsPanelRows.splice(index, 1);
  if (jsPanelRows.length === 0) jsPanelRows.push(emptyJsRow()); // sempre ≥1 fila visible
  emitJsRules();
  refreshJsPanel();
}

// Fila = frase "Quan [event] a [origen] → a l'element [destí] → Fes [acció]" amb 4
// desplegables natius + "Veure" + retirar. Anti-repeat (D-15) i composite-disables-destí
// (D-17) es comuniquen NOMÉS amb estat disabled (cap error/vermell).
function buildJsRuleRow(row, index, frozen) {
  const el = document.createElement('div');
  el.className = 'js-rule';
  if (index === jsEnterIndex) el.classList.add('js-rule--enter');

  const used = usedJsPairs(index);
  const composite = isCompositeAccio(row.accio);

  el.appendChild(jsWord('Quan'));
  el.appendChild(buildJsSelect(
    JS_EVENT_OPTIONS.map((o) => ({ ...o, disabled: !!row.origen && used.has(`${o.value}|${row.origen}`) })),
    row.event, frozen, (v) => updateJsRow(index, 'event', v),
  ));

  el.appendChild(jsWord('a'));
  el.appendChild(buildJsSelect(
    JS_ELEMENT_OPTIONS.map((o) => ({ ...o, disabled: !!row.event && used.has(`${row.event}|${o.value}`) })),
    row.origen, frozen, (v) => updateJsRow(index, 'origen', v),
  ));

  el.appendChild(jsWord('→ a l\'element'));
  el.appendChild(buildJsSelect(
    JS_ELEMENT_OPTIONS,
    composite ? '' : row.desti, frozen || composite, (v) => updateJsRow(index, 'desti', v),
  ));

  el.appendChild(jsWord('→ Fes'));
  el.appendChild(buildJsSelect(JS_ACTION_OPTIONS, row.accio, frozen, (v) => updateJsRow(index, 'accio', v)));

  const veure = document.createElement('button');
  veure.type = 'button';
  veure.className = 'js-rule__veure';
  veure.textContent = 'Veure';
  veure.disabled = frozen || !isJsRowComplete(row);
  veure.addEventListener('click', () => previewSingleRule(row));
  el.appendChild(veure);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'js-rule__remove';
  remove.setAttribute('aria-label', 'Treure regla');
  remove.textContent = '×';
  remove.disabled = frozen;
  remove.addEventListener('click', () => removeJsRow(index));
  el.appendChild(remove);

  return el;
}

// Panell de regles JS (GAME-05): pila de files + "Afegir JavaScript". Seed de
// jsPanelRows des de les regles autoritatives la PRIMERA construcció / entrada de
// fase; les crides posteriors (refresh) reutilitzen la còpia de treball (no clobbera
// edicions a mig fer en un re-render per un session:full-state aliè).
function renderJsPanel(jsRules) {
  if (jsPanelRows === null) {
    jsPanelRows = (jsRules && jsRules.length)
      ? jsRules.map((r) => ({ event: r.event, origen: r.origen, desti: r.desti ?? '', accio: r.accio }))
      : [emptyJsRow()];
  }
  const frozen = latestState?.timerStatus === 'frozen'; // D-11: congela els controls
  const wrap = document.createElement('div');
  wrap.className = 'js-rules';
  jsPanelRows.forEach((row, i) => wrap.appendChild(buildJsRuleRow(row, i, frozen)));
  jsEnterIndex = -1; // consumit: només la primera pinta de la fila nova anima

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'js-add';
  add.textContent = 'Afegir JavaScript';
  add.disabled = frozen || jsPanelRows.length >= JS_ROW_LIMIT; // D-12: límit
  add.addEventListener('click', addJsRow);
  wrap.appendChild(add);
  return wrap;
}

// Reconstrueix el panell in situ des de la còpia de treball (jsPanelRows no és null).
function refreshJsPanel() {
  const existing = document.querySelector('.js-rules');
  if (!existing) return;
  existing.replaceWith(renderJsPanel());
}

// Rebuild-then-reattach (Pitfall 3): construeix el srcdoc UNA vegada (robot ja
// estilitzat, arrossegant el resultat CSS via latestCssValues) i, a `load`, aplica
// els valors CSS i re-attacha TOTES les regles → mai listeners obsolets. L'iframe
// roman scriptless (allow-same-origin, sense allow-scripts, T-03-08).
function rebuildJsPreview(rules) {
  const frame = document.querySelector('.preview-frame');
  if (!frame) return;
  frame.setAttribute('srcdoc', wrapPreview(assembleRobotMarkup(latestPlacement)));
  frame.addEventListener('load', () => {
    applyAllCssValues(latestCssValues);
    const doc = frame.contentDocument;
    if (doc) rules.forEach((r) => attachRule(doc, r));
  }, { once: true });
}

// "Veure" (D-12): preview client-only de NOMÉS aquesta regla (reconstrueix i attacha
// una sola regla). No toca l'estat del servidor.
function previewSingleRule(row) {
  if (!isJsRowComplete(row)) return;
  rebuildJsPreview([normalizeJsRow(row)]);
}

// Board-state autoritatiu (canal privat de l'equip): reconcilia el tauler i la
// preview. Si el tauler encara no està muntat, latestPlacement l'usarà el
// pròxim renderActiveSplitScreen (ordre F5: full-state → board-state).
function renderBoardAndDrawer(placement) {
  const gameContainer = document.querySelector('.html-game');
  if (!gameContainer) return;
  mountGame(gameContainer, placement);
  const frozen = latestState?.timerStatus === 'frozen';
  sortables.forEach((s) => s.option('disabled', frozen));
}

// Overlay de congelat gestionat dinàmicament (D-11) perquè un update quirúrgic
// el pugui afegir/treure sense reconstruir el tauler.
function updateFrozenOverlay(state) {
  const container = document.querySelector('.active-split');
  if (!container) return;
  const existing = container.querySelector('.frozen-overlay');
  if (state.timerStatus === 'frozen') {
    if (!existing) {
      const overlay = document.createElement('div');
      overlay.className = 'frozen-overlay';
      const lockIcon = createElement(Lock);
      lockIcon.setAttribute('width', '32');
      lockIcon.setAttribute('height', '32');
      overlay.appendChild(lockIcon);
      container.appendChild(overlay);
    }
  } else if (existing) {
    existing.remove();
  }
}

// Update QUIRÚRGIC durant la fase html: NOMÉS timer/frozen (i disabled de les
// instàncies SortableJS), MAI teardown del tauler (destruiria el drag en curs
// d'aquest equip). El (re)build del tauler el fa exclusivament team:board-state.
function surgicalUpdate(state) {
  const timerEl = document.querySelector('.timer-display');
  if (timerEl) renderCountdown(timerEl, state);
  updateFrozenOverlay(state);
  const frozen = state.timerStatus === 'frozen';
  sortables.forEach((s) => s.option('disabled', frozen));
}

// Estat actiu (GAME-01, GAME-02): split panell d'accio (esquerra, ~40%) +
// preview aïllada (dreta, ~60%). A la fase html omple .action-panel amb el
// calaix+tauler i injecta el robot real al srcdoc via DOMPurify (T-04-01). El
// bloqueig D-11 es sobreposa aqui mateix, sense canviar de fase.
function renderActiveSplitScreen(team, state) {
  destroySortables();
  const app = clearApp();

  const container = document.createElement('div');
  container.className = 'active-split';

  const panel = document.createElement('div');
  panel.className = 'action-panel';

  const badge = document.createElement('span');
  badge.className = 'phase-badge';
  badge.dataset.phase = state.phase;
  badge.textContent = state.phase.toUpperCase();
  panel.appendChild(badge);

  const nameEl = document.createElement('h1');
  nameEl.className = 'waiting-team-name';
  nameEl.textContent = team.name;
  panel.appendChild(nameEl);

  const timerEl = document.createElement('div');
  timerEl.className = 'timer-display';
  panel.appendChild(timerEl);

  let gameContainer = null;
  if (state.phase === 'html') {
    gameContainer = document.createElement('div');
    gameContainer.className = 'html-game';
    panel.appendChild(gameContainer);
  } else if (state.phase === 'css') {
    panel.appendChild(renderCssPanel(latestCssValues));
  } else if (state.phase === 'js') {
    // Seed del panell des de les regles autoritatives (jsPanelRows null a l'entrada
    // de fase / F5; renderJsPanel el pobla). No es força null aquí: un re-render per
    // un session:full-state aliè no ha de clobberar edicions a mig fer.
    panel.appendChild(renderJsPanel(latestJsRules));
  }

  const preview = document.createElement('iframe');
  preview.className = 'preview-frame';
  preview.setAttribute('sandbox', 'allow-same-origin'); // sense allow-scripts (T-02-01)
  preview.setAttribute('srcdoc', '');
  preview.setAttribute('title', 'Previsualització en directe');

  container.appendChild(panel);
  container.appendChild(preview);

  app.appendChild(container);
  renderCountdown(timerEl, state);
  updateFrozenOverlay(state);

  if (state.phase === 'html') {
    mountGame(gameContainer, latestPlacement);
    assemblePreview(latestPlacement);
    const frozen = state.timerStatus === 'frozen';
    sortables.forEach((s) => s.option('disabled', frozen));
  } else if (state.phase === 'css') {
    boardMounted = false;
    // srcdoc construït UNA vegada per entrada de fase / F5 (Pitfall 1); els valors
    // emmagatzemats s'apliquen a l'event `load`. L'iframe roman scriptless
    // (allow-same-origin, sense allow-scripts, T-03-04).
    preview.setAttribute('srcdoc', wrapPreview(assembleRobotMarkup(latestPlacement)));
    preview.addEventListener('load', () => applyAllCssValues(latestCssValues), { once: true });
  } else if (state.phase === 'js') {
    boardMounted = false;
    // srcdoc construït UNA vegada (robot ja estilitzat via latestCssValues) i totes
    // les regles reattachades a `load` (rebuild-then-reattach, Pitfall 3). Iframe
    // scriptless (allow-same-origin, sense allow-scripts, T-03-08).
    rebuildJsPreview(latestJsRules);
  } else {
    boardMounted = false;
  }
}

// Estat de la maquina de pantalla: `undefined` fins al primer
// session:full-state d'aquesta carrega de pagina (permet distingir un
// reconnect en fase activa d'un canvi de fase real).
let previousPhase;
let interstitialTimer = null;
let latestTeam = null;
let latestState = null;

function clearInterstitialTimer() {
  if (interstitialTimer) {
    clearTimeout(interstitialTimer);
    interstitialTimer = null;
  }
}

// Maquina d'estats de pantalla derivada NOMES de `session:full-state`:
// phase===null → waiting; canvi de phase → interstitial (~1.2s) → active
// split; mateixa phase (reconnect o re-broadcast per pausa/congelat) → va
// directe a active split sense repetir l'interstici (recuperacio neta).
function renderScreenForState(team, state) {
  latestTeam = team;
  latestState = state;

  if (!state.phase) {
    clearInterstitialTimer();
    previousPhase = null;
    renderWaitingScreen(team);
    return;
  }

  const isFirstStateThisLoad = previousPhase === undefined;
  const isPhaseChange = !isFirstStateThisLoad && previousPhase !== state.phase;

  if (isPhaseChange) {
    clearInterstitialTimer();
    previousPhase = state.phase;
    renderInterstitialScreen(state.phase);
    interstitialTimer = setTimeout(() => {
      interstitialTimer = null;
      renderActiveSplitScreen(latestTeam, latestState);
    }, INTERSTITIAL_MS);
    return;
  }

  previousPhase = state.phase;

  if (interstitialTimer) {
    // Interstici en curs per aquesta mateixa fase: no l'interrompem; quan
    // acabi es renderitzara amb l'estat mes recent (latestState, ja
    // actualitzat mes amunt).
    return;
  }

  // Desacoblament del render (Pitfall 1): amb el tauler html ja muntat, un
  // session:full-state NO reconstrueix (destruiria SortableJS a mig drag) —
  // fa un update quirúrgic. El (re)build el fa només team:board-state.
  if (state.phase === 'html' && boardMounted) {
    surgicalUpdate(state);
    return;
  }

  renderActiveSplitScreen(team, state);
}

function bootClient() {
  injectStyles();

  const token = localStorage.getItem(TOKEN_KEY);
  // WebSocket-only: evita el handshake per long-polling (fràgil rere Nginx) i
  // garanteix connexió directa via 101 Switching Protocols (must-have CORE-01).
  socket = io({ transports: ['websocket'], ...(token ? { auth: { token } } : {}) });

  socket.on('team:available-list', (payload) => {
    // Server no longer recognizes a stale token (e.g. process restart) —
    // clear it and fall back to the selection prompt rather than getting
    // stuck on an identity the server has forgotten.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TEAM_ID_KEY);
    renderSelectionPrompt(socket, payload.teams);
  });

  socket.on('team:claimed', ({ token: newToken, teamId }) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(TEAM_ID_KEY, teamId);
  });

  socket.on('session:full-state', (state) => {
    const teamId = localStorage.getItem(TEAM_ID_KEY);
    if (!teamId) return; // identity not resolved yet — awaiting team:available-list
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;
    renderScreenForState(team, state);
  });

  // Canal privat del board (dirigit a team:<id>): reconstrueix tauler + preview
  // real (F5 recupera el robot mig muntat, CORE-03). Desacoblat de
  // session:full-state per no destruir SortableJS en cada re-broadcast (Pitfall 1).
  socket.on(EVENTS.TEAM_BOARD_STATE, ({ placement }) => {
    latestPlacement = placement || {};
    if (latestState?.phase === 'html' && boardMounted) {
      renderBoardAndDrawer(latestPlacement);
      assemblePreview(latestPlacement);
    }
  });

  // Canal privat de l'estil CSS (dirigit a team:<id>): reconcilia tots els valors
  // autoritatius. Aplica via CSSOM sobre l'iframe i sincronitza els controls del
  // panell in situ (F5 recupera l'estil mig fet, CORE-03). Desacoblat de
  // session:full-state (Pitfall 1), mirall de TEAM_BOARD_STATE.
  socket.on(EVENTS.TEAM_CSS_STATE, ({ cssValues }) => {
    latestCssValues = cssValues || {};
    if (latestState?.phase !== 'css') return;
    applyAllCssValues(latestCssValues);
    syncCssPanelInputs(latestCssValues);
  });

  // Canal privat de les regles JS (dirigit a team:<id>): desa les regles autoritatives
  // i, si la fase activa és js, reconstrueix la preview (reattach net, Pitfall 3).
  // Desacoblat de session:full-state (Pitfall 1), mirall de TEAM_CSS_STATE.
  socket.on(EVENTS.TEAM_JS_STATE, ({ jsRules }) => {
    latestJsRules = jsRules || [];
    if (latestState?.phase !== 'js') return;
    // F5 recovery: si el panell mostra només la fila buida inicial, reseed des de les
    // regles recuperades. No clobbera cap edició en curs (una fila ja començada manté
    // la còpia de treball local).
    const panelExists = !!document.querySelector('.js-rules');
    const onlyEmptyStarter = jsPanelRows && jsPanelRows.length === 1 && !isJsRowStarted(jsPanelRows[0]);
    if (panelExists && onlyEmptyStarter && latestJsRules.length) {
      jsPanelRows = latestJsRules.map((r) => ({ event: r.event, origen: r.origen, desti: r.desti ?? '', accio: r.accio }));
      refreshJsPanel();
    }
    rebuildJsPreview(latestJsRules);
  });

  socket.on('team:reload', () => {
    location.reload();
  });
}

bootClient();
