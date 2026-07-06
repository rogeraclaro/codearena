// Fase 4 (D-14): cerimònia d'entrega de premis compartida per equips (client.js) i Admin
// (admin.js). Es dispara des d'UN sol broadcast CEREMONY_START (socketHandlers.js) → cada
// pantalla executa la MATEIXA cadena setTimeout scriptada (taula ms d'UI-SPEC), mai un
// temporitzador que cada client arrenqui pel seu compte (Anti-Pattern RESEARCH: lockstep
// per un únic broadcast, no per rellotges independents).
//
// Contenció (invariant D-14): els colors chillón viuen NOMÉS dins `.ceremony-overlay` i tot
// el node es desmunta en completar la revelació → cap color de cerimònia sobreviu al
// rànquing. L'overlay es munta a `document.body` (no a `#app`) perquè onComplete pugui
// renderitzar la vista de resultats a sota mentre l'overlay encara la tapa, i es reveli neta
// en retirar-lo.
//
// Reduced-motion: sota `prefers-reduced-motion: reduce` la cerimònia degrada a l'estat final
// sense cap animació — es salta tota la seqüència i es crida onComplete directament (la
// cerimònia és purament celebrativa, no perd cap informació).
//
// L'estil de la cerimònia s'injecta des d'AQUÍ (no a client.css) perquè admin.html NOMÉS
// carrega tokens.css — un únic <style id="ceremony-styles"> compartit garanteix que equips i
// Admin tenen exactament la mateixa presentació sense duplicar CSS (mirall de la resolució
// de `.admin-mini-rank` al Pla 02).

const STYLE_ID = 'ceremony-styles';

// Colors chillón per número (UI-SPEC §Award ceremony palette exception). Literals efímers,
// MAI tokens: no s'afegeixen a tokens.css ni a cap altra superfície (invariant de contenció).
const COUNT_COLORS = {
  5: '#FF1E56', // vivid pink-red
  4: '#FF9F1C', // vivid orange
  3: '#FFD60A', // vivid yellow
  2: '#2EC4B6', // vivid teal
  1: '#3A86FF', // vivid blue
  0: '#C77DFF', // vivid purple
};
const CHILLON = ['#FF1E56', '#FF9F1C', '#FFD60A', '#2EC4B6', '#3A86FF', '#C77DFF'];

// Taula ms EXACTA d'UI-SPEC §Award ceremony timing (dades de cerimònia, no motion tokens).
const STEP_MS = 1000; // cada número 5→1 (5000ms total)
const HOLD_MS = 3000; // el 0 estàtic
const ZERO_EXIT_MS = 800; // sortida del 0 (zoom+fade)
const STAGGER_MS = 600; // interval fix de la revelació invers
const WINNER_PAUSE_MS = 1200; // pausa dramàtica just abans del #1
const CONFETTI_TAIL_MS = 4000; // cua del confetti abans de retirar l'overlay

function ensureCeremonyStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ceremony-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      overflow: hidden;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ceremony-stage {
      width: 100%;
      max-width: 640px;
      padding: var(--space-xl);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .ceremony-count {
      font-size: var(--font-size-display);
      font-weight: var(--font-weight-heading);
      line-height: 1;
      font-variant-numeric: tabular-nums;
      transform: scale(1);
    }
    .ceremony-reveal {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    /* Files ocultes per defecte; es revelen d'última posició → #1 (last place first). */
    .ceremony-reveal__row {
      opacity: 0;
    }
    .ceremony-reveal__row--shown {
      opacity: 1;
    }
    .ceremony-confetti__piece {
      position: absolute;
      top: 0;
      width: 10px;
      height: 14px;
      border-radius: 2px;
      opacity: 0;
    }
    @keyframes ceremony-zoom {
      0% { transform: scale(0.6); opacity: 0; }
      20% { transform: scale(1); opacity: 1; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes ceremony-row-enter {
      from { opacity: 0; transform: translateY(var(--space-md)); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ceremony-fall {
      0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 1; }
    }
    /* TOTA la motion de cerimònia dins no-preference (mirall del patró de client.css:554).
       Sota reduced-motion la cerimònia ni tan sols es munta (es salta a JS), però ho
       embolcallem igualment perquè l'estil per si sol mai animi. */
    @media (prefers-reduced-motion: no-preference) {
      .ceremony-count--zoom {
        animation: ceremony-zoom ${STEP_MS}ms var(--motion-ease) forwards;
      }
      .ceremony-count--exit {
        animation: ceremony-zoom ${ZERO_EXIT_MS}ms var(--motion-ease) forwards;
      }
      .ceremony-reveal__row--shown {
        animation: ceremony-row-enter var(--motion-snap) var(--motion-ease);
      }
      .ceremony-confetti__piece {
        animation: ceremony-fall 4s linear forwards;
      }
    }
  `;
  document.head.appendChild(style);
}

// Confetti dependency-free (RESEARCH §Code Examples): dotzenes de divs posicionats
// absolutament amb left/background/animationDelay aleatoris del set chillón. Es netegen
// soles en retirar-se `.ceremony-overlay` (són fills seus). Guard reduced-motion.
function fireConfetti(container, count = 60) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'ceremony-confetti__piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CHILLON[i % CHILLON.length];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    container.appendChild(piece);
  }
}

function showCount(stage, n, animate) {
  stage.textContent = '';
  const el = document.createElement('div');
  el.className = animate ? 'ceremony-count ceremony-count--zoom' : 'ceremony-count';
  el.style.color = COUNT_COLORS[n];
  el.textContent = String(n);
  stage.appendChild(el);
}

// playCeremony({ ranking, buildRow, onComplete })
//  - ranking: [{ id, name, globalPct }] ordenat descendent (index 0 = #1 guanyador).
//  - buildRow(row, index): retorna el node de fila específic de la superfície (client:
//    .rank-row via buildRankRow; admin: .admin-final-rank__row) — estilitzat per la CSS ja
//    carregada d'aquella pàgina. La cerimònia només l'oculta/revela.
//  - onComplete(): renderitza la vista de resultats final de la superfície. Es crida un cop
//    JUST ABANS de retirar l'overlay perquè la vista quedi a sota i es reveli neta.
export function playCeremony({ ranking, buildRow, onComplete }) {
  ensureCeremonyStyles();

  const finish = typeof onComplete === 'function' ? onComplete : () => {};
  const list = Array.isArray(ranking) ? ranking : [];

  // Degradació reduced-motion (o ranking buit): salta directament a l'estat final.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || list.length === 0) {
    finish();
    return () => {};
  }

  const overlay = document.createElement('div');
  overlay.className = 'ceremony-overlay';
  const stage = document.createElement('div');
  stage.className = 'ceremony-stage';
  overlay.appendChild(stage);
  document.body.appendChild(overlay);

  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => {
    for (const t of timers) clearTimeout(t);
    timers.length = 0;
  };

  // 1) Compte enrere 5→1: un número per segon, zoom-in + fade-out (1000ms cadascun).
  [5, 4, 3, 2, 1].forEach((n, i) => {
    at(i * STEP_MS, () => showCount(stage, n, true));
  });
  // 2) 0 estàtic (sense zoom) durant 3000ms.
  at(5 * STEP_MS, () => showCount(stage, 0, false));
  // 3) 0 surt amb el mateix zoom+fade (800ms).
  at(5 * STEP_MS + HOLD_MS, () => {
    const el = stage.querySelector('.ceremony-count');
    if (el) el.classList.add('ceremony-count--exit');
  });

  // 4) Revelació invers (últim → #1). Es munten totes les files en ordre correcte (guanyador
  //    a dalt) ocultes, i es revelen de baix a dalt: last place first, pausa abans del #1.
  const revealStart = 5 * STEP_MS + HOLD_MS + ZERO_EXIT_MS; // 8800ms
  at(revealStart, () => {
    stage.textContent = '';
    const revealList = document.createElement('div');
    revealList.className = 'ceremony-reveal';
    const rows = list.map((row, index) => {
      const el = buildRow(row, index);
      el.classList.add('ceremony-reveal__row');
      revealList.appendChild(el);
      return el;
    });
    stage.appendChild(revealList);

    const N = list.length;
    // No-guanyadors (índexs N-1..1) revelats de baix a dalt cada STAGGER_MS.
    for (let j = 0; j <= N - 2; j++) {
      const idx = N - 1 - j;
      at(j * STAGGER_MS, () => rows[idx].classList.add('ceremony-reveal__row--shown'));
    }
    // #1 (índex 0) després d'una única pausa dramàtica; el seu aterratge dispara el confetti.
    const winnerDelay = N >= 2 ? (N - 2) * STAGGER_MS + WINNER_PAUSE_MS : 0;
    at(winnerDelay, () => {
      rows[0].classList.add('ceremony-reveal__row--shown');
      fireConfetti(overlay);
    });
    // 5) En acabar la cua del confetti: renderitza la vista de resultats a sota i retira
    //    l'overlay (invariant de contenció — cap color chillón sobreviu).
    at(winnerDelay + CONFETTI_TAIL_MS, () => {
      finish();
      overlay.remove();
      clearTimers();
    });
  });

  // Cancel·lador (per si la superfície necessita avortar; no s'usa en el flux normal).
  return () => {
    clearTimers();
    overlay.remove();
  };
}
