// Admin panel: team registration + live monitoring grid.
// Renders from scratch on every session:full-state broadcast (single
// source of truth for what the admin sees, D-08 progress placeholder
// reserved but empty in Phase 1). No literal color/size — everything via
// var(--...) tokens from shared/tokens.css.

import { io } from 'socket.io-client';
import { createElement, CircleCheckBig, WifiOff } from 'lucide';

const STYLE_ID = 'admin-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-container {
      max-width: 960px;
      margin: 0 auto;
      padding: var(--space-xl);
      display: flex;
      flex-direction: column;
      gap: var(--space-2xl);
    }
    .registration-block {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .registration-block label {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
    }
    .registration-block textarea {
      font-family: var(--font-family);
      font-size: var(--font-size-body);
      padding: var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      resize: vertical;
    }
    .btn {
      min-height: var(--hit-target-min);
      padding: 0 var(--space-lg);
      border-radius: 6px;
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      align-self: flex-start;
    }
    .btn-accent {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-surface);
    }
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--space-lg);
    }
    .team-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .team-card-name {
      font-size: var(--font-size-heading);
      font-weight: var(--font-weight-heading);
      margin: 0;
    }
    .team-card-status {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }
    .team-card-status svg.status-connected {
      color: var(--status-connected);
    }
    .team-card-status svg.status-disconnected {
      color: var(--status-disconnected);
    }
    .team-card-progress {
      min-height: var(--space-lg);
    }
    .empty-state {
      text-align: center;
      padding: var(--space-3xl) var(--space-lg);
    }
    .empty-heading {
      font-size: var(--font-size-heading);
      font-weight: var(--font-weight-heading);
      margin: 0 0 var(--space-sm);
    }
    .empty-body {
      font-size: var(--font-size-body);
      color: var(--color-muted);
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

function statusIcon(connected) {
  const icon = createElement(connected ? CircleCheckBig : WifiOff);
  icon.setAttribute('width', '20');
  icon.setAttribute('height', '20');
  icon.classList.add(connected ? 'status-connected' : 'status-disconnected');
  return icon;
}

function buildRegistrationBlock(socket) {
  const block = document.createElement('section');
  block.className = 'registration-block';

  const label = document.createElement('label');
  label.setAttribute('for', 'team-names-input');
  label.textContent = 'Noms dels equips (4-6, un per línia)';

  const textarea = document.createElement('textarea');
  textarea.id = 'team-names-input';
  textarea.rows = 6;
  textarea.placeholder = 'Equip 1\nEquip 2\n…';

  const registerBtn = document.createElement('button');
  registerBtn.type = 'button';
  registerBtn.className = 'btn btn-accent';
  registerBtn.textContent = 'Registrar';
  registerBtn.addEventListener('click', () => {
    const names = textarea.value
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    if (names.length === 0) return;
    socket.emit('admin:register-teams', { names });
    textarea.value = '';
  });

  block.appendChild(label);
  block.appendChild(textarea);
  block.appendChild(registerBtn);
  return block;
}

function buildEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-state';

  const heading = document.createElement('p');
  heading.className = 'empty-heading';
  heading.textContent = 'Cap equip registrat';

  const body = document.createElement('p');
  body.className = 'empty-body';
  body.textContent = 'Afegeix 4-6 noms per començar la sessió.';

  empty.appendChild(heading);
  empty.appendChild(body);
  return empty;
}

function buildTeamCard(team) {
  const card = document.createElement('article');
  card.className = 'team-card';

  const nameEl = document.createElement('h3');
  nameEl.className = 'team-card-name';
  nameEl.textContent = team.name; // DOM text API only (V5 anti-XSS)

  const statusEl = document.createElement('div');
  statusEl.className = 'team-card-status';
  statusEl.appendChild(statusIcon(team.connected));

  const progressEl = document.createElement('div');
  progressEl.className = 'team-card-progress'; // reserved, empty in Phase 1 (D-08)

  card.appendChild(nameEl);
  card.appendChild(statusEl);
  card.appendChild(progressEl);
  return card;
}

function renderAdmin(socket, state) {
  const app = document.getElementById('app');
  app.textContent = '';

  const container = document.createElement('div');
  container.className = 'admin-container';
  container.appendChild(buildRegistrationBlock(socket));

  const grid = document.createElement('section');
  grid.className = 'team-grid';
  if (state.teams.length === 0) {
    grid.appendChild(buildEmptyState());
  } else {
    for (const team of state.teams) {
      grid.appendChild(buildTeamCard(team));
    }
  }
  container.appendChild(grid);

  app.appendChild(container);
}

function bootAdmin() {
  injectStyles();
  const socket = io({ auth: { role: 'admin' } });
  socket.on('session:full-state', (state) => renderAdmin(socket, state));
}

bootAdmin();
