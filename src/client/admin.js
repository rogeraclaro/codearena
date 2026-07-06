// Admin panel: team registration + live monitoring grid.
// Renders from scratch on every session:full-state broadcast (single
// source of truth for what the admin sees, D-08 progress placeholder
// reserved but empty in Phase 1). No literal color/size — everything via
// var(--...) tokens from shared/tokens.css.

import { io } from 'socket.io-client';
import { createElement, CircleCheckBig, WifiOff, RefreshCw, Trophy } from 'lucide';
import { renderCountdown } from './shared/timer.js';
import { EVENTS } from '../server/events.js';
import { playCeremony, showThanks } from './shared/ceremony.js';

const STYLE_ID = 'admin-styles';

// Rànquing final rebut via CEREMONY_START (ADMIN-07). Es guarda a nivell de mòdul perquè
// el panell es reconstrueix sencer a cada session:full-state: el rànquing ha de derivar
// del darrer payload/estat, mai d'estat efímer perdut en el re-render (F5-safe).
let finalRanking = null;
let latestState = null;
// D-12/D-13: darrer rànquing parcial rebut en tancar-se una fase (NOMÉS l'admin el rep).
// Es guarda a nivell de mòdul perquè el panell es reconstrueix sencer a cada
// session:full-state; persisteix fins que arriba el rànquing final.
let partialRanking = null;
let partialClosedPhase = null;
// Durada provisional de cada fase; el contingut real de joc (Fase 2+)
// substituira aquest valor fix per una durada configurable per fase.
const PHASE_DURATION_MS = 5 * 60 * 1000;
// D-01: mapes locals per al botó «Fase anterior» — fase destí i etiqueta humana.
const PREV_OF = { css: 'html', js: 'css' };
const PHASE_LABELS = { html: 'HTML', css: 'CSS', js: 'JS' };

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
    .control-bar {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-lg);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-lg);
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
    .btn-destructive {
      color: var(--color-destructive);
      border-color: var(--color-destructive);
    }
    .team-card-actions {
      margin-top: auto;
    }
    .confirm-dialog {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-lg);
      max-width: 320px;
      background: var(--color-surface);
      color: var(--color-text);
      font-family: var(--font-family);
    }
    .confirm-dialog::backdrop {
      background: rgba(15, 23, 42, 0.4);
    }
    .confirm-message {
      font-size: var(--font-size-body);
      margin: 0 0 var(--space-lg);
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
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
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      color: var(--color-muted);
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
    .admin-login {
      max-width: 360px;
      margin: var(--space-3xl) auto;
      padding: var(--space-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .admin-login-heading {
      font-size: var(--font-size-heading);
      font-weight: var(--font-weight-heading);
      margin: 0;
    }
    .admin-login label {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
    }
    .admin-login input {
      font-family: var(--font-family);
      font-size: var(--font-size-body);
      min-height: var(--hit-target-min);
      padding: 0 var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: 4px;
    }
    .admin-login-error {
      font-size: var(--font-size-label);
      color: var(--color-destructive);
      margin: 0;
    }
    /* Rànquing final (ADMIN-07). Reutilitza el vocabulari de tokens de .team-card;
       cap literal de color, cap accent (reservat al CTA). */
    .admin-final-rank {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .admin-final-rank__caption {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      margin: 0;
    }
    .admin-final-rank__row {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) 0;
      border-top: 1px solid var(--color-border);
    }
    .admin-final-rank__num {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      min-width: var(--space-lg);
    }
    .admin-final-rank__row svg.rank-trophy {
      color: var(--color-text);
    }
    .admin-final-rank__name {
      flex: 1;
      font-size: var(--font-size-body);
    }
    .admin-final-rank__pct {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      font-variant-numeric: tabular-nums;
    }
    /* Rànquing parcial de fi de fase (D-12/D-13). Admin-only. Llista compacta amb barra
       fina per fila. NOMÉS var(--*): files --color-surface/--color-border, %/fill
       --color-muted ("provisional"); cap --color-accent (reservat al CTA). */
    .admin-mini-rank {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .admin-mini-rank__caption {
      font-size: var(--font-size-body);
      color: var(--color-muted);
      margin: 0 0 var(--space-xs) 0;
    }
    .admin-mini-rank__row {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    .admin-mini-rank__num {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      min-width: var(--space-lg);
    }
    .admin-mini-rank__name {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-label);
      min-width: 6rem;
    }
    .admin-mini-rank__bar {
      flex: 1;
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }
    .admin-mini-rank__fill {
      height: 100%;
      background: var(--color-muted);
    }
    .admin-mini-rank__pct {
      font-size: var(--font-size-body);
      color: var(--color-muted);
      font-variant-numeric: tabular-nums;
      min-width: 3rem;
      text-align: right;
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

// Confirmació genèrica abans d'una acció d'Admin (D-01/D-04, ADMIN-07). Uses a native
// <dialog> for modality (Escape/backdrop dismiss for free) — resolves true només si
// l'admin confirma explícitament. `destructive` tria l'estil del botó de confirmar
// (btn-destructive quan l'acció perd dades — p.ex. resincronitzar —, btn en cas
// contrari). Única font d'aquest patró: showResyncConfirm/showFinalizeConfirm hi
// deleguen, i el botó «Fase anterior» (D-01) també.
function showConfirm(message, confirmLabel, destructive) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';

    const messageEl = document.createElement('p');
    messageEl.className = 'confirm-message';
    messageEl.textContent = message;
    dialog.appendChild(messageEl);

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel·la';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = destructive ? 'btn btn-destructive' : 'btn';
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);
    document.body.appendChild(dialog);

    const settle = (result) => {
      dialog.close();
      dialog.remove();
      resolve(result);
    };
    cancelBtn.addEventListener('click', () => settle(false));
    confirmBtn.addEventListener('click', () => settle(true));
    dialog.addEventListener('cancel', () => settle(false)); // Escape key

    dialog.showModal();
  });
}

// Resync is the ONLY destructive-styled action in Phase 1 (D-04: no
// release/delete team action exists). Copy exacta del Copywriting Contract de la UI-SPEC.
function showResyncConfirm() {
  return showConfirm(
    'Resincronitzar equip? Recarregarà la seva pantalla immediatament.',
    'Sí, resincronitza',
    true,
  );
}

// ADMIN-07: confirmació lleugera abans de finalitzar (acció irreversible de FLUX, no de
// dades) — no es perd cap dada. Copy exacta del Copywriting Contract de la UI-SPEC.
function showFinalizeConfirm() {
  return showConfirm(
    'Vols finalitzar la partida? Es mostraran els resultats a totes les pantalles.',
    'Finalitzar',
    false,
  );
}

function buildPhaseBadge(phase) {
  const badge = document.createElement('span');
  badge.className = 'phase-badge';
  badge.dataset.phase = phase;
  badge.textContent = phase.toUpperCase();
  return badge;
}

// Timer display + primary CTA ("Iniciar Fase" / "Següent fase") + secondary
// controls (Pausar/Reprendre, +1 minut). Re-derived entirely from
// session:full-state on every broadcast (D-12: instant sync across screens).
function buildControlBar(socket, state) {
  const bar = document.createElement('section');
  bar.className = 'control-bar';

  const timerEl = document.createElement('div');
  timerEl.className = 'timer-display';
  bar.appendChild(timerEl);

  if (state.phase) {
    bar.appendChild(buildPhaseBadge(state.phase));
  }

  // ADMIN-07 (D-14): a l'última fase de joc (js) el CTA es repurposa a "Finalitzar i
  // Mostrar Resultats" i emet l'event de finalització (constant EVENTS, mai un literal)
  // després d'una confirmació. Fora d'aquesta fase manté el comportament d'avanç.
  // D-19: un cop finalitzada la partida, el mateix CTA esdevé el pas final explícit que
  // dispara "Moltes gràcies!!" a totes les pantalles (mateix patró de transició manual). El
  // rànquing ja és a la pantalla; és un beat de tancament, sense confirmació (no destructiu).
  // "finished" es deriva de finalRanking (mòdul, fixat a CEREMONY_START) o de state.finished
  // (F5) perquè finalitzar NO emet session:full-state.
  const isLastPhase = state.phase === 'js';
  const finished = state.finished || (Array.isArray(finalRanking) && finalRanking.length > 0);
  const ctaBtn = document.createElement('button');
  ctaBtn.type = 'button';
  ctaBtn.className = 'btn btn-accent';
  ctaBtn.textContent = finished
    ? 'Mostrar «Moltes gràcies!!»'
    : isLastPhase
      ? 'Finalitzar i Mostrar Resultats'
      : state.phase
        ? 'Següent fase'
        : 'Iniciar Fase';
  ctaBtn.addEventListener('click', async () => {
    if (finished) {
      socket.emit(EVENTS.ADMIN_SHOW_THANKS);
    } else if (isLastPhase) {
      const confirmed = await showFinalizeConfirm();
      if (confirmed) socket.emit(EVENTS.ADMIN_FINALIZE_GAME);
    } else if (state.phase) {
      socket.emit('admin:next-phase', { durationMs: PHASE_DURATION_MS });
    } else {
      socket.emit('admin:start-phase', { phase: 'html', durationMs: PHASE_DURATION_MS });
    }
  });
  bar.appendChild(ctaBtn);

  // D-01: botó «Fase anterior», simètric al CTA. Visible NOMÉS quan hi ha una fase
  // activa diferent de HTML i la partida encara no ha finalitzat (Pitfall 5 — mai
  // retrocedir per sota de la primera fase, mai un cop mostrats els resultats).
  if (state.phase && state.phase !== 'html' && !finished) {
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn';
    prevBtn.textContent = 'Fase anterior';
    prevBtn.addEventListener('click', async () => {
      const targetPhase = PREV_OF[state.phase];
      const confirmed = await showConfirm(
        `Segur que vols tornar a la Fase ${PHASE_LABELS[targetPhase]}?`,
        'Sí, torna enrere',
        false,
      );
      if (confirmed) {
        socket.emit(EVENTS.ADMIN_PREV_PHASE, { durationMs: PHASE_DURATION_MS });
      }
    });
    bar.appendChild(prevBtn);
  }

  // D-04/D-05: botó «Reset», eina d'emergència per reiniciar TOT el servidor durant una
  // classe real. Sempre disponible (mai limitat per fase, D-05) — no depèn de state.phase
  // ni de `finished`. Acció destructiva (perd tot l'estat en memòria): demana confirmació
  // (D-04, reutilitzant showConfirm amb destructive=true) i, si es confirma, emet
  // EVENTS.ADMIN_RESET_SERVER (constant, mai el literal). Sense segona confirmació ni
  // gestió manual de reconnexió — socket.io-client ja auto-reconnecta.
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn btn-destructive';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', async () => {
    const ok = await showConfirm('Segur que vols reiniciar el servidor?', 'Sí, reinicia', true);
    if (ok) {
      socket.emit(EVENTS.ADMIN_RESET_SERVER);
    }
  });
  bar.appendChild(resetBtn);

  if (state.phase) {
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'btn';
    const isPaused = state.timerStatus === 'paused';
    pauseBtn.textContent = isPaused ? 'Reprendre' : 'Pausar';
    pauseBtn.disabled = state.timerStatus === 'frozen';
    pauseBtn.addEventListener('click', () => {
      socket.emit(isPaused ? 'admin:timer-resume' : 'admin:timer-pause');
    });
    bar.appendChild(pauseBtn);

    const extendBtn = document.createElement('button');
    extendBtn.type = 'button';
    extendBtn.className = 'btn';
    extendBtn.textContent = '+1 minut';
    extendBtn.addEventListener('click', () => {
      socket.emit('admin:timer-extend', { ms: 60000 });
    });
    bar.appendChild(extendBtn);
  }

  renderCountdown(timerEl, state);

  return bar;
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
  const defaultTeamNames = [
    'Els primers no sempre tenen perquè ser els últims',
    'Segundas filas siempre fueron buenas',
    'Que siguem de tercera fila NO té perquè ser negatiu!',
    'Los ultimos de las filas',
  ];
  textarea.value = defaultTeamNames.join('\n');

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

function buildTeamCard(team, socket) {
  const card = document.createElement('article');
  card.className = 'team-card';

  const nameEl = document.createElement('h3');
  nameEl.className = 'team-card-name';
  nameEl.textContent = team.name; // DOM text API only (V5 anti-XSS)

  const statusEl = document.createElement('div');
  statusEl.className = 'team-card-status';
  statusEl.appendChild(statusIcon(team.connected));

  const progressEl = document.createElement('div');
  progressEl.className = 'team-card-progress'; // espai reservat a la Fase 1 (D-08)
  // D-15: durant la Fase HTML el servidor projecta team.progress {placed,total}
  // (getPublicState); fora d'aquesta fase és null i el card queda buit (Fase 1).
  // textContent (mai innerHTML) — comptador numèric del servidor, anti-XSS T-02-07.
  if (team.progress && typeof team.progress.placed === 'number') {
    progressEl.textContent = `${team.progress.placed}/${team.progress.total} peces`;
  }

  const actionsEl = document.createElement('div');
  actionsEl.className = 'team-card-actions';

  const resyncBtn = document.createElement('button');
  resyncBtn.type = 'button';
  resyncBtn.className = 'btn btn-destructive';
  const resyncIcon = createElement(RefreshCw);
  resyncIcon.setAttribute('width', '16');
  resyncIcon.setAttribute('height', '16');
  resyncBtn.appendChild(resyncIcon);
  resyncBtn.appendChild(document.createTextNode(' Resincronitza'));
  resyncBtn.addEventListener('click', async () => {
    const confirmed = await showResyncConfirm();
    if (confirmed) {
      socket.emit('admin:force-resync', { teamId: team.id });
    }
  });
  actionsEl.appendChild(resyncBtn);

  card.appendChild(nameEl);
  card.appendChild(statusEl);
  card.appendChild(progressEl);
  card.appendChild(actionsEl);
  return card;
}

// Rànquing final a l'Admin (ADMIN-07): llista ordenada nom + % (Trophy al #1). NOMÉS
// dades públiques ({id,name,globalPct}); cap detall privat d'equip (D-10). Deriva del
// darrer ranking rebut (finalRanking) — mai recalcula al client.
// Una fila del rànquing final (rank # + Trophy NOMÉS al #1 + nom + %). Extreta perquè la
// cerimònia D-14 (ceremony.js) reveli EXACTAMENT la mateixa fila que el rànquing final —
// una sola font, cap drift entre la revelació i la vista final.
function buildFinalRankRow(row, index) {
  const rowEl = document.createElement('div');
  rowEl.className = 'admin-final-rank__row';

  const num = document.createElement('span');
  num.className = 'admin-final-rank__num';
  num.textContent = String(index + 1);
  rowEl.appendChild(num);

  if (index === 0) {
    const trophy = createElement(Trophy);
    trophy.setAttribute('width', '18');
    trophy.setAttribute('height', '18');
    trophy.classList.add('rank-trophy');
    rowEl.appendChild(trophy);
  }

  const name = document.createElement('span');
  name.className = 'admin-final-rank__name';
  name.textContent = row.name; // DOM text API (V5 anti-XSS)
  rowEl.appendChild(name);

  const pct = document.createElement('span');
  pct.className = 'admin-final-rank__pct';
  pct.textContent = `${Math.round(row.globalPct)}%`;
  rowEl.appendChild(pct);

  return rowEl;
}

function buildFinalRanking(ranking) {
  const block = document.createElement('section');
  block.className = 'admin-final-rank';

  const caption = document.createElement('p');
  caption.className = 'admin-final-rank__caption';
  caption.textContent = 'Classificació final';
  block.appendChild(caption);

  ranking.forEach((row, index) => block.appendChild(buildFinalRankRow(row, index)));

  return block;
}

// D-12/D-13: mini-rànquing parcial (Admin-only) en tancar-se una fase. Format llista
// compacta amb barra fina per fila (nom — Label + barra + % en --color-muted "provisional"),
// ordre descendent. Deriva del darrer payload rebut (partialRanking) — mai recalcula al
// client. El caption identifica la fase acabada de tancar. Cap --color-accent.
function buildMiniRank(ranking, closedPhase) {
  const block = document.createElement('section');
  block.className = 'admin-mini-rank';

  const caption = document.createElement('p');
  caption.className = 'admin-mini-rank__caption';
  const phaseLabel = typeof closedPhase === 'string' ? closedPhase.toUpperCase() : '';
  caption.textContent = `Rànquing parcial — fase ${phaseLabel} tancada`;
  block.appendChild(caption);

  ranking.forEach((row, index) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'admin-mini-rank__row';

    const num = document.createElement('span');
    num.className = 'admin-mini-rank__num';
    num.textContent = String(index + 1);
    rowEl.appendChild(num);

    const name = document.createElement('span');
    name.className = 'admin-mini-rank__name';
    name.textContent = row.name; // DOM text API (V5 anti-XSS)
    rowEl.appendChild(name);

    const bar = document.createElement('div');
    bar.className = 'admin-mini-rank__bar';
    const fill = document.createElement('div');
    fill.className = 'admin-mini-rank__fill';
    fill.style.width = `${Math.max(0, Math.min(100, row.globalPct))}%`;
    bar.appendChild(fill);
    rowEl.appendChild(bar);

    const pct = document.createElement('span');
    pct.className = 'admin-mini-rank__pct';
    pct.textContent = `${Math.round(row.globalPct)}%`;
    rowEl.appendChild(pct);

    block.appendChild(rowEl);
  });

  return block;
}

function renderAdmin(socket, state) {
  const app = document.getElementById('app');

  // CR-02: session:full-state fires very frequently (every team's piece
  // placement/removal during the HTML phase), and this handler tears down and
  // rebuilds the whole panel — including a fresh #team-names-input textarea.
  // Capture the live value + focus/selection of any in-progress (unsent) text
  // BEFORE the teardown and restore it after, so the teacher never silently
  // loses a team name they were typing when an unrelated broadcast lands.
  const existingInput = document.getElementById('team-names-input');
  const preservedValue = existingInput ? existingInput.value : '';
  const hadFocus = existingInput ? document.activeElement === existingInput : false;
  const selStart = existingInput ? existingInput.selectionStart : null;
  const selEnd = existingInput ? existingInput.selectionEnd : null;

  app.textContent = '';

  const container = document.createElement('div');
  container.className = 'admin-container';
  container.appendChild(buildControlBar(socket, state));

  // ADMIN-07: rànquing final, quan existeix. Prefereix el darrer CEREMONY_START rebut
  // (finalRanking) i, en el seu defecte (F5), el ranking congelat de session:full-state.
  const ranking = finalRanking || (state.finished ? state.finalRanking : null);
  if (ranking && ranking.length) {
    container.appendChild(buildFinalRanking(ranking));
  } else if (partialRanking && partialRanking.length) {
    // D-12/D-13: mentre no hi ha rànquing final, mostra el parcial de l'última fase
    // tancada (persisteix a través de re-renders fins que arriba el final).
    container.appendChild(buildMiniRank(partialRanking, partialClosedPhase));
  }

  container.appendChild(buildRegistrationBlock(socket));

  const grid = document.createElement('section');
  grid.className = 'team-grid';
  if (state.teams.length === 0) {
    grid.appendChild(buildEmptyState());
  } else {
    for (const team of state.teams) {
      grid.appendChild(buildTeamCard(team, socket));
    }
  }
  container.appendChild(grid);

  app.appendChild(container);

  // Restore preserved input state now that the new textarea is in the document.
  const newInput = document.getElementById('team-names-input');
  if (newInput) {
    newInput.value = preservedValue;
    if (hadFocus) {
      newInput.focus();
      if (selStart !== null && selEnd !== null) {
        newInput.setSelectionRange(selStart, selEnd);
      }
    }
  }
}

// CR-01: the admin panel now needs a shared secret the teacher enters once.
// Persisted in localStorage (reasonable for the teacher's own reused machine —
// never logged or shown elsewhere) so an F5/reload doesn't force re-entry.
const ADMIN_SECRET_STORAGE_KEY = 'codearena:admin-secret';

function connectWithSecret(secret) {
  const socket = io({ transports: ['websocket'], auth: { role: 'admin', adminSecret: secret } });
  socket.on('session:full-state', (state) => {
    latestState = state;
    if (state.finished && state.finalRanking) finalRanking = state.finalRanking; // F5 recovery
    renderAdmin(socket, state);
  });
  // ADMIN-07/D-14: l'admin rep CEREMONY_START amb el ranking (sense ownDetail, D-10) i
  // reprodueix la MATEIXA cerimònia que els equips, disparada pel mateix broadcast → lockstep.
  // En acabar, onComplete reconstrueix el panell amb el rànquing final (finalitzar no emet
  // session:full-state, per això re-renderitzem amb l'últim state conegut).
  socket.on(EVENTS.CEREMONY_START, ({ ranking }) => {
    finalRanking = ranking || null;
    playCeremony({
      ranking: finalRanking || [],
      buildRow: (row, index) => buildFinalRankRow(row, index),
      onComplete: () => {
        if (latestState) renderAdmin(socket, latestState);
      },
    });
  });
  // D-12/D-13: rànquing parcial en tancar-se una fase (NOMÉS l'admin el rep). Desa el
  // darrer parcial i re-renderitza amb l'últim state conegut (l'esdeveniment no porta un
  // session:full-state associat). Els equips no reben mai aquest event (T-04-06).
  socket.on(EVENTS.ADMIN_PARTIAL_RANKING, ({ ranking, closedPhase }) => {
    partialRanking = ranking || null;
    partialClosedPhase = closedPhase || null;
    if (latestState) renderAdmin(socket, latestState);
  });
  // D-19: l'admin també veu "Moltes gràcies!!" (D-19: totes les pantalles), disparat pel
  // mateix broadcast que els equips → lockstep. Overlay persistent per sobre del panell.
  socket.on(EVENTS.THANKS_SHOW, () => showThanks());
  socket.on('connect_error', (err) => {
    // Only a rejected secret ('unauthorized' from the server middleware) should
    // clear the stored value and re-prompt. Transient network errors are left
    // to Socket.io's own reconnection, so a blip never logs the teacher out.
    if (err && err.message === 'unauthorized') {
      socket.close();
      try {
        localStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
      } catch {
        // localStorage unavailable (private mode) — nothing to clear.
      }
      showLogin('Contrasenya d\'administrador incorrecta. Torna-ho a provar.');
    }
  });
  return socket;
}

function showLogin(errorMessage) {
  const app = document.getElementById('app');
  app.textContent = '';

  const form = document.createElement('form');
  form.className = 'admin-login';

  const heading = document.createElement('h1');
  heading.className = 'admin-login-heading';
  heading.textContent = 'Accés Administrador';

  const label = document.createElement('label');
  label.setAttribute('for', 'admin-secret-input');
  label.textContent = 'Contrasenya de la sessió';

  const input = document.createElement('input');
  input.type = 'password';
  input.id = 'admin-secret-input';
  input.autocomplete = 'current-password';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-accent';
  submitBtn.textContent = 'Entrar';

  form.appendChild(heading);
  if (errorMessage) {
    const error = document.createElement('p');
    error.className = 'admin-login-error';
    error.textContent = errorMessage;
    form.appendChild(error);
  }
  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(submitBtn);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const secret = input.value.trim();
    if (!secret) return;
    try {
      localStorage.setItem(ADMIN_SECRET_STORAGE_KEY, secret);
    } catch {
      // localStorage unavailable — proceed without persistence.
    }
    connectWithSecret(secret);
  });

  app.appendChild(form);
  input.focus();
}

function bootAdmin() {
  injectStyles();
  let saved = null;
  try {
    saved = localStorage.getItem(ADMIN_SECRET_STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (saved) {
    connectWithSecret(saved);
  } else {
    showLogin();
  }
}

bootAdmin();
