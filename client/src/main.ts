import './style.css';
import { analyzeTask, type AnalyzeResult } from './api';

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

let commitmentMinutes = 0;
let ulyssesTimer: ReturnType<typeof setInterval> | null = null;

let socialProofTimer: ReturnType<typeof setInterval> | null = null;
let challengerCount = Math.floor(Math.random() * (2341 - 847 + 1)) + 847;

// ── History (localStorage永続化) ─────────────────────────
const HISTORY_KEY = 'ntd_history';
const MAX_HISTORY = 50;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

const history: HistoryEntry[] = loadHistory();

const COACH_MESSAGES = [
  '逃げるな！お前ならできる！',
  '諦めるな！もう少しだ！',
  'ここで逃げたら後悔するぞ！',
  '立ち止まるな！前を向け！',
  'お前はもっとできる！今がチャンスだ！',
];
let coachIndex = 0;

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
        <div class="commitment-selector" id="commitment-selector">
          <p class="commitment-label">何分でできますか？</p>
          <div class="commitment-options">
            <button type="button" class="commit-btn" data-min="1">1分</button>
            <button type="button" class="commit-btn" data-min="3">3分</button>
            <button type="button" class="commit-btn" data-min="5">5分</button>
            <button type="button" class="commit-btn" data-min="10">10分</button>
            <button type="button" class="commit-btn" data-min="15">15分</button>
            <button type="button" class="commit-btn" data-min="30">30分</button>
          </div>
        </div>
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

  const commitBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.commit-btn'));

  if (commitmentMinutes > 0) {
    document.querySelector<HTMLButtonElement>(`.commit-btn[data-min="${commitmentMinutes}"]`)
      ?.classList.add('commit-btn--active');
  }

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = `${len} / ${MAX_LEN}`;
    charCount.classList.toggle('char-count--warn', len >= MAX_LEN * 0.9);
  });

  commitBtns.forEach(b => {
    b.addEventListener('click', () => {
      commitmentMinutes = parseInt(b.dataset.min!);
      commitBtns.forEach(x => x.classList.remove('commit-btn--active'));
      b.classList.add('commit-btn--active');
    });
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
      <iframe
        id="yt-bg"
        class="yt-bg"
        src="https://www.youtube.com/embed/ZXsQAXx_ao0?autoplay=1&mute=1"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>
      <div class="flames" id="flames" aria-hidden="true"></div>
      <div class="countdown" id="countdown">5</div>
      <div class="micro-step">
        <div class="micro-step-label">まず、これだけやれ</div>
        <div id="micro-step-text"></div>
      </div>
    </div>
  `;
  document.getElementById('micro-step-text')!.textContent = result.micro_step;

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

  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('beforeunload', onBeforeUnload);

  if (urgency === 3) startUrgency3Effects();

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
  elapsedMs = 0;
  coachIndex = 0;

  app.innerHTML = `
    <div class="state-monitoring">
      <iframe
        id="yt-bg"
        class="yt-bg yt-bg--monitoring"
        src="https://www.youtube.com/embed/ZXsQAXx_ao0?autoplay=1&mute=0"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>
      <div class="eyes-container" aria-hidden="true">
        <div class="eye eye--tl"><div class="eyeball"><div class="pupil"></div></div></div>
        <div class="eye eye--tr"><div class="eyeball"><div class="pupil"></div></div></div>
        <div class="eye eye--bl"><div class="eyeball"><div class="pupil"></div></div></div>
      </div>
      <div class="monitoring-micro-step" id="monitoring-micro-step"></div>
      <div class="social-proof">現在 <span id="challenger-count">${challengerCount}</span>人 が挑戦中</div>
      <p class="elapsed" id="elapsed">経過時間: 0:00.000</p>
      <div class="ulysses-bar-wrap${commitmentMinutes ? '' : ' ulysses-bar-wrap--hidden'}" id="ulysses-bar-wrap">
        <div class="ulysses-bar" id="ulysses-bar"></div>
        <span class="ulysses-label" id="ulysses-label">残り ${commitmentMinutes}:00</span>
      </div>
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

  startUlyssesTimer();
  startSocialProof();
  scheduleNag(5 * 60 * 1000);

  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('keydown', onMonitoringKeydown);
  document.addEventListener('keydown', onMonitoringKeydown);
}

function startUlyssesTimer() {
  if (!commitmentMinutes) return;
  const deadline = Date.now() + commitmentMinutes * 60_000;
  const totalMs = commitmentMinutes * 60_000;

  const bar = document.getElementById('ulysses-bar') as HTMLDivElement;
  const label = document.getElementById('ulysses-label')!;
  const wrap = document.getElementById('ulysses-bar-wrap')!;

  ulyssesTimer = setInterval(() => {
    const remaining = deadline - Date.now();
    const pct = Math.min((totalMs - remaining) / totalMs, 1);

    bar.style.width = `${pct * 100}%`;

    if (remaining <= 0) {
      clearInterval(ulyssesTimer!);
      ulyssesTimer = null;
      label.textContent = '残り 0:00';
      wrap.classList.remove('ulysses--warn');
      wrap.classList.add('ulysses--danger');
      triggerBurning();
    } else {
      const m = Math.floor(remaining / 60_000);
      const s = Math.floor((remaining % 60_000) / 1000);
      label.textContent = `残り ${m}:${String(s).padStart(2, '0')}`;
      wrap.classList.toggle('ulysses--warn', pct >= 0.75 && pct < 0.90);
      wrap.classList.toggle('ulysses--danger', pct >= 0.90);
    }
  }, 500);
}

function triggerBurning() {
  if (document.getElementById('burning-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'burning-overlay';
  overlay.className = 'burning-overlay';
  overlay.innerHTML = `
    <div class="burning-message">
      <p>時間切れだ！！</p>
      <p class="burning-sub">諦めるな！やり遂げろ！</p>
      <button id="burning-ok">やる！！</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('burning-ok')!.addEventListener('click', () => overlay.remove());
}

function startSocialProof() {
  const el = document.getElementById('challenger-count');
  if (!el) return;

  socialProofTimer = setInterval(() => {
    const delta = Math.floor(Math.random() * 7) - 3;
    challengerCount = Math.max(847, Math.min(2341, challengerCount + delta));
    el.textContent = String(challengerCount);
  }, 2000 + Math.random() * 3000);
}

function completTask() {
  if (currentResult && currentTask) {
    history.unshift({ task: currentTask, micro_step: currentResult.micro_step, elapsedMs });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory(history);
  }
  playDoneSound();
  animateDone(() => {
    commitmentMinutes = 0;
    transition('input');
  });
}

function onMonitoringKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && state === 'monitoring') completTask();
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && state === 'monitoring') {
    showCoachOverlay();
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (state === 'screaming' || state === 'monitoring') {
    e.preventDefault();
    e.returnValue = '逃げるな！';
  }
}

function showCoachOverlay() {
  if (document.getElementById('coach-overlay')) return;
  const msg = COACH_MESSAGES[coachIndex % COACH_MESSAGES.length];
  coachIndex++;

  const overlay = document.createElement('div');
  overlay.id = 'coach-overlay';
  overlay.className = 'coach-overlay';

  const p = document.createElement('p');
  p.textContent = msg;

  const btn = document.createElement('button');
  btn.textContent = 'やる！！';
  btn.addEventListener('click', () => overlay.remove());

  overlay.append(p, btn);
  document.body.appendChild(overlay);
}

function scheduleNag(delayMs: number) {
  nagTimeout = setTimeout(() => {
    if (state === 'monitoring') {
      showCoachOverlay();
      scheduleNag(Math.min(delayMs * 2, 60 * 60 * 1000));
    }
  }, delayMs);
}

function clearScreamTimer() {
  if (screamTimer) { clearInterval(screamTimer); screamTimer = null; }
}

function clearTimers() {
  clearScreamTimer();
  if (elapsedTimer)     { clearInterval(elapsedTimer);     elapsedTimer = null; }
  if (nagTimeout)       { clearTimeout(nagTimeout);         nagTimeout = null; }
  if (ulyssesTimer)     { clearInterval(ulyssesTimer);      ulyssesTimer = null; }
  if (socialProofTimer) { clearInterval(socialProofTimer);  socialProofTimer = null; }
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('keydown', onMonitoringKeydown);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.getElementById('coach-overlay')?.remove();
  document.getElementById('burning-overlay')?.remove();
}

// ── urgency=3 演出 ──────────────────────────────────────

function startUrgency3Effects() {
  // 画面シェイク
  const root = document.getElementById('screaming-root');
  if (root) root.classList.add('urgency3-shake');

  // Web Audio でアラーム音
  try {
    const ctx = new AudioContext();
    const beepAt = (t: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    };
    [0, 0.18, 0.36].forEach(offset => beepAt(ctx.currentTime + offset, 880));
  } catch {
    // AudioContext 非対応ブラウザは無視
  }
}

// ── 完了アニメーション ───────────────────────────────────

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch {
    // 無視
  }
}

function animateDone(onComplete: () => void) {
  const overlay = document.createElement('div');
  overlay.className = 'done-flash';
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    onComplete();
  }, 600);
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
