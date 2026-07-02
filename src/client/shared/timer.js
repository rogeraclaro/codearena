// Shared countdown renderer — imported by BOTH admin.js and client.js so
// every screen shows the exact same synchronized value (CORE-04). Derives
// `remaining` from the server's absolute phaseEndsAt on every animation
// frame (Pattern 3, 01-RESEARCH.md): self-correcting for drift/latency,
// NEVER a locally-accumulated decrement.

// Bumped on every renderCountdown() call so an in-flight requestAnimationFrame
// loop from a previous (possibly now-detached, since admin.js/client.js do a
// full DOM teardown+rebuild on every session:full-state) render can detect
// it has been superseded and stop rescheduling itself.
let renderGeneration = 0;

export function formatMs(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Urgency signalled by color/pulse only, never by changing the digits'
// meaning (UX-01). Critical pulse animation lives in tokens.css and
// respects prefers-reduced-motion there.
function applyUrgencyClass(el, remainingMs) {
  el.classList.remove('timer-warning', 'timer-critical');
  if (remainingMs <= 10000) {
    el.classList.add('timer-critical');
  } else if (remainingMs <= 60000) {
    el.classList.add('timer-warning');
  }
}

export function renderCountdown(el, state) {
  const myGeneration = ++renderGeneration;
  const { timerStatus, phaseEndsAt, remainingMsAtPause } = state;

  if (timerStatus === 'running' && typeof phaseEndsAt === 'number') {
    const tick = () => {
      if (myGeneration !== renderGeneration) return; // superat per un render mes nou
      const remaining = Math.max(0, phaseEndsAt - Date.now());
      el.textContent = formatMs(remaining);
      applyUrgencyClass(el, remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    };
    tick();
    return;
  }

  if (timerStatus === 'paused' && typeof remainingMsAtPause === 'number') {
    el.textContent = formatMs(remainingMsAtPause);
    applyUrgencyClass(el, remainingMsAtPause);
    return;
  }

  if (timerStatus === 'frozen') {
    // D-11: congelat a zero — es manté l'aspecte critic (acabat de caducar).
    el.textContent = formatMs(0);
    applyUrgencyClass(el, 0);
    return;
  }

  // idle: cap fase iniciada encara.
  el.textContent = formatMs(0);
  el.classList.remove('timer-warning', 'timer-critical');
}
