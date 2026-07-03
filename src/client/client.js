// Team screen: identity resolution (token in localStorage, D-02), team
// selection prompt for unclaimed PCs (D-01), i la maquina d'estats de
// pantalla completa (D-05 espera / D-06 interstici / split actiu GAME-01,
// GAME-02 / D-11 congelat). Tot es deriva EXCLUSIVAMENT de
// `session:full-state` — el client mai decideix una transicio pel seu
// compte (estat autoritatiu al servidor, T-04-03).

import { io } from 'socket.io-client';
import { createElement, Lock, MoveRight } from 'lucide';
import Sortable from 'sortablejs';
import DOMPurify from 'dompurify';
import { renderCountdown } from './shared/timer.js';
import { EVENTS } from '../server/events.js';
import {
  SLOTS,
  PIECES,
  DISTRACTORS,
  pieceLabel,
  containerLabel,
  containerClosingLabel,
} from '../shared/robotTemplate.js';

const TOKEN_KEY = 'teamToken';
const TEAM_ID_KEY = 'teamId';
const STYLE_ID = 'client-styles';
const INTERSTITIAL_MS = 1200;
const PHASE_LABELS = { html: 'HTML', css: 'CSS', js: 'JS' };

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
let sortables = []; // instàncies SortableJS actives (destruïdes en re-render/teardown)
let boardMounted = false;
// Flag de sessió de pàgina (D-14): un cop es col·loca la primera peça la pista
// inicial desapareix PER SEMPRE aquesta càrrega — no reapareix ni quan el
// recompte torna a 0 (l'equip retira totes les peces). Es reinicia només amb F5.
let hintDismissed = false;

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
// autoritatiu, Pitfall 5). Retorna una llista plana de tipus per pintar al calaix.
function remainingPieces(placement) {
  const placedCounts = {};
  for (const type of Object.values(placement)) {
    placedCounts[type] = (placedCounts[type] || 0) + 1;
  }
  const chips = [];
  for (const { type, count } of PIECES) {
    const remaining = count - (placedCounts[type] || 0);
    for (let i = 0; i < remaining; i += 1) chips.push(type);
  }
  return chips;
}

// Chip read-only (D-12, checkpoint 02-03 round 2): NOMÉS el code label, cap icona
// ni thumbnail. L'etiqueta = el tag HTML literal real en monospace amb angle
// brackets (p.ex. `<img src="assets/aerial.png" class="antena">`, derivat de
// SLOTS via pieceLabel). data-type genèric (D-07). Cap camp editable (GAME-06).
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
  antenaRow.appendChild(createSlot(slotById('antena-dreta'), placement));
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

// Pista inicial (D-14): fletxa calaix→tauler + micro-copy. Es descarta
// permanentment quan es col·loca la primera peça.
function buildHint(placement) {
  // El primer placement (recompte 0→1) descarta la pista permanentment via
  // hintDismissed; un cop marcada, mai més es reconstrueix aquesta càrrega.
  if (Object.keys(placement).length > 0) hintDismissed = true;
  if (hintDismissed) return null;
  const hint = document.createElement('div');
  hint.className = 'drag-hint';
  const arrow = createElement(MoveRight);
  arrow.classList.add('drag-hint__arrow'); // objectiu del loop ±4px (CSS)
  arrow.setAttribute('width', '20');
  arrow.setAttribute('height', '20');
  hint.appendChild(arrow);
  const txt = document.createElement('span');
  txt.textContent = 'Arrossega les peces als forats';
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
    onAdd: (evt) => {
      // Una peça que torna des d'un slot cap al calaix = treure (D-10). El
      // board-state autoritatiu reconciliarà el DOM; cap diàleg de confirmació
      // (undo sense fricció, UI-SPEC §Copywriting).
      if (evt.from.dataset.slotId) {
        socket.emit(EVENTS.TEAM_REMOVE_PIECE, { slotId: evt.from.dataset.slotId });
      }
    },
    onEnd: (evt) => {
      // Distractor rebotat (cap slot l'accepta → revert natiu al calaix, from===to):
      // shake breu sense text ni color d'error (D-11, UI-SPEC §Motion).
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
      onAdd: (evt) => {
        evt.to.classList.add('slot--filled', 'slot--accepting');
        setTimeout(() => evt.to.classList.remove('slot--accepting'), 250);
        socket.emit(EVENTS.TEAM_PLACE_PIECE, {
          slotId: evt.to.dataset.slotId,
          pieceType: evt.item.dataset.type,
        });
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

  const hint = buildHint(placement);
  if (hint) gameContainer.appendChild(hint);

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
  // d'usuari), segura per incrustar literalment. NOTA: la foto ve del CDN
  // d'Unsplash → dependència de xarxa externa; si l'aula no té internet el dia de
  // la sessió, la foto no carregarà i quedarà només l'overlay `background-color`
  // (degradació elegant, sense trencar res).
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; height: 100%; }
    #robot-fons {
      position: fixed;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1080&h=1920&q=80&blur=10');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      background-repeat: no-repeat;
      background-color: rgba(30, 40, 50, 0.75);
      background-blend-mode: overlay;
    }
    #robot-contenidor { position: relative; }
  </style></head><body><div id="robot-fons"></div>${inner}</body></html>`;
}

function assemblePreview(placement) {
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
  const clean = DOMPurify.sanitize(raw, {
    ADD_TAGS: ['output'],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'id'],
  });

  const frame = document.querySelector('.preview-frame');
  if (frame) frame.setAttribute('srcdoc', wrapPreview(clean));
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

  if (gameContainer) {
    mountGame(gameContainer, latestPlacement);
    assemblePreview(latestPlacement);
    const frozen = state.timerStatus === 'frozen';
    sortables.forEach((s) => s.option('disabled', frozen));
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

  socket.on('team:reload', () => {
    location.reload();
  });
}

bootClient();
