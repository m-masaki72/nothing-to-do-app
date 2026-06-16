import './style.css';
import { analyzeTask, type AnalyzeResult } from './api';
import { speak, stopSpeech } from './speech';

type AppState = 'input' | 'screaming' | 'monitoring';

interface HistoryEntry {
  task: string;
  micro_step: string;
  elapsedMs: number;
}

const app = document.querySelector<HTMLDivElement>('#app')!;

let state: AppState = 'input';
let currentResult: AnalyzeResult | null = null;
let currentTask = '';
let screamTimer: ReturnType<typeof setInterval> | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let elapsedMs = 0;
let nagTimeout: ReturnType<typeof setTimeout> | null = null;

const history: HistoryEntry[] = [];

const NAG_MESSAGES = [
  'まだやってないの？いい加減にしろ！！',
  'おい！何してんの！？今すぐやれって言ったよな！？',
  '先延ばし野郎め……いい加減にしろ！JUST DO IT!!!',
];
let nagIndex = 0;

function render() {
  if (state === 'input') renderInput();
  else if (state === 'screaming') renderScreaming();
  else if (state === 'monitoring') renderMonitoring();
}

// ── State 1: Input ──────────────────────────────────────

const MAX_LEN = 200;

function renderInput() {
  const historyHtml = history.length === 0 ? '' : `
    <div class="history">
      <p class="history-label">✅ 今日やったこと (${history.length}件)</p>
      <ul class="history-list" id="history-list"></ul>
    </div>
  `;

  app.innerHTML = `
    <div class="state-input">
      <h1>THERE IS NOTHING TO STORE. DO IT NOW.</h1>
      <form id="task-form">
        <input
          id="task-input"
          type="text"
          placeholder="今すぐやるべきことを入力..."
          autocomplete="off"
          maxlength="${MAX_LEN}"
          autofocus
        />
        <span class="char-count" id="char-count">0 / ${MAX_LEN}</span>
        <button type="submit" id="submit-btn">今すぐやれ</button>
      </form>
      <p class="loading-hint" id="loading-hint"></p>
      ${historyHtml}
    </div>
  `;

  if (history.length > 0) {
    const list = document.getElementById('history-list')!;
    for (const entry of history) {
      const li = document.createElement('li');
      li.className = 'history-item';
      const elapsed = document.createElement('span');
      elapsed.className = 'history-elapsed';
      elapsed.textContent = formatElapsed(entry.elapsedMs);
      const text = document.createElement('span');
      text.textContent = entry.task;
      li.append(elapsed, text);
      list.appendChild(li);
    }
  }

  const form = document.getElementById('task-form')!;
  const input = document.getElementById('task-input') as HTMLInputElement;
  const btn = document.getElementById('submit-btn') as HTMLButtonElement;
  const hint = document.getElementById('loading-hint')!;
  const charCount = document.getElementById('char-count')!;

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = `${len} / ${MAX_LEN}`;
    charCount.classList.toggle('char-count--warn', len >= MAX_LEN * 0.9);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const task = input.value.trim();
    if (!task) return;

    currentTask = task;
    btn.disabled = true;
    hint.textContent = 'AIが叱咤文を生成中...';

    try {
      currentResult = await analyzeTask(task);
    } catch {
      currentResult = {
        micro_step: 'とにかく今すぐ立ち上がれ。',
        angry_speech: 'おい！何をぼーっとしてる！今すぐやれ！！',
        urgency_level: 2,
      };
    }

    transition('screaming');
  });
}

// ── State 2: Screaming ──────────────────────────────────

const URGENCY_BG: Record<number, string> = {
  1: 'linear-gradient(135deg, #1d4ed8, #0891b2)',
  2: 'linear-gradient(135deg, #b91c1c, #ea580c)',
  3: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
};
const URGENCY_PULSE_DURATION: Record<number, string> = {
  1: '1.2s',
  2: '0.8s',
  3: '0.4s',
};

function renderScreaming() {
  const result = currentResult!;
  const urgency = result.urgency_level ?? 2;
  const bg = URGENCY_BG[urgency] ?? URGENCY_BG[2];
  const pulseDuration = URGENCY_PULSE_DURATION[urgency] ?? URGENCY_PULSE_DURATION[2];

  app.innerHTML = `
    <div class="state-screaming" id="screaming-root" style="background:${bg};--pulse-duration:${pulseDuration}">
      <div class="flames" id="flames" aria-hidden="true"></div>
      <div class="countdown" id="countdown">5</div>
      <div class="micro-step">
        <div class="micro-step-label">まず、これだけやれ</div>
        <div id="micro-step-text"></div>
      </div>
    </div>
  `;
  document.getElementById('micro-step-text')!.textContent = result.micro_step;

  // 炎パーティクル生成（urgency が高いほど多い）
  const flameCount = urgency === 3 ? 18 : urgency === 2 ? 10 : 5;
  const flamesEl = document.getElementById('flames')!;
  for (let i = 0; i < flameCount; i++) {
    const f = document.createElement('div');
    f.className = 'flame';
    f.style.setProperty('--x', `${Math.random() * 100}%`);
    f.style.setProperty('--delay', `${(Math.random() * 1.5).toFixed(2)}s`);
    f.style.setProperty('--size', `${0.8 + Math.random() * 1.4}rem`);
    f.style.setProperty('--duration', `${(0.6 + Math.random() * 0.8).toFixed(2)}s`);
    f.textContent = urgency === 1 ? '💧' : '🔥';
    flamesEl.appendChild(f);
  }

  speak(result.angry_speech);

  let count = 5;
  const cd = document.getElementById('countdown')!;
  screamTimer = setInterval(() => {
    count--;
    cd.textContent = String(count);
    if (count <= 0) {
      clearScreamTimer();
      transition('monitoring');
    }
  }, 1000);
}

// ── State 3: Monitoring ─────────────────────────────────

function renderMonitoring() {
  stopSpeech();
  elapsedMs = 0;
  nagIndex = 0;

  app.innerHTML = `
    <div class="state-monitoring">
      <div class="monitoring-micro-step" id="monitoring-micro-step"></div>
      <p class="elapsed" id="elapsed">経過時間: 0:00.000</p>
      <button class="done-btn" id="done-btn">やった！<span class="done-hint">Enter</span></button>
    </div>
  `;
  document.getElementById('monitoring-micro-step')!.textContent = currentResult?.micro_step ?? '';

  document.getElementById('done-btn')!.addEventListener('click', completTask);

  const elapsedEl = document.getElementById('elapsed')!;
  const startTime = Date.now();
  elapsedTimer = setInterval(() => {
    elapsedMs = Date.now() - startTime;
    elapsedEl.textContent = `経過時間: ${formatElapsed(elapsedMs)}`;
  }, 100);

  scheduleNag(5 * 60 * 1000);

  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('keydown', onMonitoringKeydown);
  document.addEventListener('keydown', onMonitoringKeydown);
}

const MAX_HISTORY = 50;

function completTask() {
  if (currentResult && currentTask) {
    history.unshift({ task: currentTask, micro_step: currentResult.micro_step, elapsedMs });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  }
  transition('input');
}

function onMonitoringKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && state === 'monitoring') completTask();
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && state === 'monitoring') {
    showNagOverlay();
  }
}

function showNagOverlay() {
  if (document.getElementById('nag-overlay')) return;
  const msg = NAG_MESSAGES[nagIndex % NAG_MESSAGES.length];
  nagIndex++;

  const overlay = document.createElement('div');
  overlay.id = 'nag-overlay';
  overlay.className = 'nag-overlay';

  const p = document.createElement('p');
  p.textContent = msg;

  const btn = document.createElement('button');
  btn.textContent = 'わかった、やる！';
  btn.addEventListener('click', () => overlay.remove());

  overlay.append(p, btn);
  document.body.appendChild(overlay);
  speak(msg);
}

function scheduleNag(delayMs: number) {
  nagTimeout = setTimeout(() => {
    if (state === 'monitoring') {
      showNagOverlay();
      scheduleNag(Math.min(delayMs * 2, 60 * 60 * 1000));
    }
  }, delayMs);
}

function clearScreamTimer() {
  if (screamTimer) { clearInterval(screamTimer); screamTimer = null; }
}

function clearTimers() {
  clearScreamTimer();
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
  if (nagTimeout)   { clearTimeout(nagTimeout);    nagTimeout = null; }
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('keydown', onMonitoringKeydown);
  stopSpeech();
  document.getElementById('nag-overlay')?.remove();
}

// ── Helpers ─────────────────────────────────────────────

function transition(next: AppState) {
  if (state === 'monitoring' || state === 'screaming') clearTimers();
  state = next;
  render();
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const millis = ms % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

// ── Boot ─────────────────────────────────────────────────
render();
