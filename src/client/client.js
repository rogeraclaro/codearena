// Team screen: identity resolution (token in localStorage, D-02), team
// selection prompt for unclaimed PCs (D-01), i la maquina d'estats de
// pantalla completa (D-05 espera / D-06 interstici / split actiu GAME-01,
// GAME-02 / D-11 congelat). Tot es deriva EXCLUSIVAMENT de
// `session:full-state` — el client mai decideix una transicio pel seu
// compte (estat autoritatiu al servidor, T-04-03).

import { io } from 'socket.io-client';
import { createElement, Lock } from 'lucide';
import { renderCountdown } from './shared/timer.js';

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

// Estat actiu (GAME-01, GAME-02): split panell d'accio (esquerra, ~40%) +
// preview aïllada (dreta, ~60%). La preview es una closca buida a la Fase 1
// (iframe sandbox + srcdoc buit) que les Fases 2-5 reutilitzaran omplint-la
// amb contingut real via DOMPurify (T-04-01). El bloqueig D-11 es sobreposa
// aqui mateix, sense canviar de fase ni amagar la feina existent.
function renderActiveSplitScreen(team, state) {
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

  const preview = document.createElement('iframe');
  preview.className = 'preview-frame';
  preview.setAttribute('sandbox', 'allow-same-origin');
  preview.setAttribute('srcdoc', ''); // closca buida a la Fase 1
  preview.setAttribute('title', 'Previsualització en directe');

  container.appendChild(panel);
  container.appendChild(preview);

  if (state.timerStatus === 'frozen') {
    const overlay = document.createElement('div');
    overlay.className = 'frozen-overlay';
    const lockIcon = createElement(Lock);
    lockIcon.setAttribute('width', '32');
    lockIcon.setAttribute('height', '32');
    overlay.appendChild(lockIcon);
    container.appendChild(overlay);
  }

  app.appendChild(container);
  renderCountdown(timerEl, state);
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

  renderActiveSplitScreen(team, state);
}

function bootClient() {
  injectStyles();

  const token = localStorage.getItem(TOKEN_KEY);
  // WebSocket-only: evita el handshake per long-polling (fràgil rere Nginx) i
  // garanteix connexió directa via 101 Switching Protocols (must-have CORE-01).
  const socket = io({ transports: ['websocket'], ...(token ? { auth: { token } } : {}) });

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

  socket.on('team:reload', () => {
    location.reload();
  });
}

bootClient();
