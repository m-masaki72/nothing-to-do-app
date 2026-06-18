import './style.css';
import { analyzeTask, type AnalyzeResult } from './api';
import { URGENCY_BG, URGENCY_PULSE_DURATION, DONE_FLASH_MS } from './constants';
import { t, lang, toggleLang } from './i18n';
import {
  formatElapsed,
  loadHistory,
  saveHistory,
  clampChallengerCount,
  MAX_HISTORY,
  type HistoryEntry,
} from './utils';

type AppState = 'input' | 'screaming' | 'monitoring';

const app = document.querySelector<HTMLDivElement>('#app')!;
const ytFrame = document.getElementById('yt-bg') as HTMLIFrameElement;

const YT_SRC = `https://www.youtube.com/embed/ZXsQAXx_ao0?autoplay=1&mute=1&loop=1&playlist=ZXsQAXx_ao0&enablejsapi=1&origin=${window.location.origin}`;
let ytLoaded = false;

function setYtState(mode: 'hidden' | 'screaming' | 'monitoring') {
  ytFrame.classList.remove('yt-bg--screaming', 'yt-bg--monitoring');
  if (mode === 'hidden') {
    ytFrame.src = '';
    ytLoaded = false;
    return;
  }
  if (!ytLoaded) {
    ytLoaded = true;
    ytFrame.src = YT_SRC;
    // プレイヤー初期化後に mute/unMute を送る
    ytFrame.onload = () => {
      const cmd = mode === 'monitoring' ? 'unMute' : 'mute';
      ytFrame.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: cmd, args: [] }),
        '*'
      );
    };
  } else {
    const cmd = mode === 'monitoring' ? 'unMute' : 'mute';
    ytFrame.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args: [] }),
      '*'
    );
  }
  ytFrame.classList.add(`yt-bg--${mode}`);
}

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

const history: HistoryEntry[] = loadHistory();

let coachIndex = 0;

function render() {
  if (state === 'input') renderInput();
  else if (state === 'screaming') renderScreaming();
  else if (state === 'monitoring') renderMonitoring();
}

// ── State 1: Input ──────────────────────────────────────

const MAX_LEN = 200;

function renderInput() {
  let inputIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let inputPressureTimer: ReturnType<typeof setTimeout> | null = null;
  let hesitationLevel = 0;
  let backspaceCount = 0;

  function clearInputTimers() {
    if (inputIdleTimer)    { clearTimeout(inputIdleTimer);    inputIdleTimer = null; }
    if (inputPressureTimer){ clearTimeout(inputPressureTimer); inputPressureTimer = null; }
  }
  const historyHtml = history.length === 0 ? '' : `
    <div class="history">
      <p class="history-label">${t.historyLabel(history.length)}</p>
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
          placeholder="${t.placeholder}"
          autocomplete="off"
          maxlength="${MAX_LEN}"
          autofocus
        />
        <span class="char-count" id="char-count">0 / ${MAX_LEN}</span>
        <div class="commitment-selector" id="commitment-selector">
          <p class="commitment-label">${t.commitLabel}</p>
          <div class="commitment-options">
            <button type="button" class="commit-btn" data-min="1">1m</button>
            <button type="button" class="commit-btn" data-min="3">3m</button>
            <button type="button" class="commit-btn" data-min="5">5m</button>
            <button type="button" class="commit-btn" data-min="10">10m</button>
            <button type="button" class="commit-btn" data-min="15">15m</button>
            <button type="button" class="commit-btn" data-min="30">30m</button>
          </div>
        </div>
        <button type="submit" id="submit-btn">${t.submitBtn}</button>
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

  function showHint(msg: string) {
    hint.textContent = msg;
    hint.classList.add('loading-hint--nag');
    setTimeout(() => hint.classList.remove('loading-hint--nag'), 600);
  }

  function scheduleIdleNag() {
    if (inputIdleTimer) clearTimeout(inputIdleTimer);
    if (!input.value.trim()) return;
    inputIdleTimer = setTimeout(() => {
      if (state !== 'input') return;
      const hints = t.hesitationHints;
      const msg = hints[Math.min(hesitationLevel, hints.length - 1)];
      showHint(msg);
      if (hesitationLevel < hints.length - 1) hesitationLevel++;
      scheduleIdleNag();
    }, hesitationLevel === 0 ? 5000 : 8000);
  }

  function schedulePressure() {
    if (inputPressureTimer) clearTimeout(inputPressureTimer);
    inputPressureTimer = setTimeout(() => {
      if (state !== 'input') return;
      if (input.value.trim()) {
        btn.classList.add('submit-btn--shake');
        showHint(t.pressureHint);
        setTimeout(() => btn.classList.remove('submit-btn--shake'), 600);
      }
    }, 30_000);
  }

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = `${len} / ${MAX_LEN}`;
    charCount.classList.toggle('char-count--warn', len >= MAX_LEN * 0.9);
    hint.textContent = '';
    scheduleIdleNag();
    schedulePressure();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value.trim()) {
      backspaceCount++;
      if (backspaceCount >= 5) {
        showHint(t.backspaceHint);
        backspaceCount = 0;
      }
    }
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

    clearInputTimers();
    hesitationLevel = 0;
    backspaceCount = 0;
    currentTask = task;
    btn.disabled = true;
    hint.textContent = t.analyzing;

    try {
      currentResult = await analyzeTask(task);
    } catch {
      currentResult = {
        micro_step: t.fallbackStep,
        angry_speech: t.fallbackSpeech,
        urgency_level: 2,
      };
    }

    transition('screaming');
  });
}

// ── State 2: Screaming ──────────────────────────────────

function renderScreaming() {
  const result = currentResult!;
  const urgency = result.urgency_level ?? 2;
  const bg = URGENCY_BG[urgency] ?? URGENCY_BG[2];
  const pulseDuration = URGENCY_PULSE_DURATION[urgency] ?? URGENCY_PULSE_DURATION[2];

  document.body.style.background = bg;
  document.body.style.setProperty('--pulse-duration', pulseDuration);
  document.body.classList.add('state--screaming');
  app.innerHTML = `
    <div class="state-screaming" id="screaming-root">
      <div class="flames" id="flames" aria-hidden="true"></div>
      <div class="countdown" id="countdown">5</div>
      <div class="micro-step">
        <div class="micro-step-label">${t.microStepLabel}</div>
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
      <div class="eyes-container" aria-hidden="true">
        <div class="eye eye--tl"><div class="eyeball"><div class="pupil"></div></div></div>
        <div class="eye eye--tr"><div class="eyeball"><div class="pupil"></div></div></div>
        <div class="eye eye--bl"><div class="eyeball"><div class="pupil"></div></div></div>
      </div>
      <div class="monitoring-micro-step" id="monitoring-micro-step"></div>
      <div class="social-proof">${t.socialProof(challengerCount)}</div>
      <p class="elapsed" id="elapsed">${t.elapsed}: 0:00.000</p>
      <div class="ulysses-bar-wrap${commitmentMinutes ? '' : ' ulysses-bar-wrap--hidden'}" id="ulysses-bar-wrap">
        <div class="ulysses-bar" id="ulysses-bar"></div>
        <span class="ulysses-label" id="ulysses-label">${t.remaining(commitmentMinutes, '00')}</span>
      </div>
      <button class="done-btn" id="done-btn">${t.doneBtn}<span class="done-hint">Enter</span></button>
    </div>
  `;
  document.getElementById('monitoring-micro-step')!.textContent = currentResult?.micro_step ?? '';

  document.getElementById('done-btn')!.addEventListener('click', completTask);

  const elapsedEl = document.getElementById('elapsed')!;
  const startTime = Date.now();
  elapsedTimer = setInterval(() => {
    elapsedMs = Date.now() - startTime;
    elapsedEl.textContent = `${t.elapsed}: ${formatElapsed(elapsedMs)}`;
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
      label.textContent = t.remainingZero;
      wrap.classList.remove('ulysses--warn');
      wrap.classList.add('ulysses--danger');
      triggerBurning();
    } else {
      const m = Math.floor(remaining / 60_000);
      const s = Math.floor((remaining % 60_000) / 1000);
      label.textContent = t.remaining(m, String(s).padStart(2, '0'));
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
  const bMsg = document.createElement('div');
  bMsg.className = 'burning-message';
  const bP1 = document.createElement('p'); bP1.textContent = t.timeUp;
  const bP2 = document.createElement('p'); bP2.className = 'burning-sub'; bP2.textContent = t.burningSub;
  const bBtn = document.createElement('button'); bBtn.id = 'burning-ok'; bBtn.textContent = t.burningOk;
  bMsg.append(bP1, bP2, bBtn);
  overlay.appendChild(bMsg);
  document.body.appendChild(overlay);
  document.getElementById('burning-ok')!.addEventListener('click', () => overlay.remove());
}

function startSocialProof() {
  const el = document.getElementById('challenger-count');
  if (!el) return;

  socialProofTimer = setInterval(() => {
    const delta = Math.floor(Math.random() * 7) - 3;
    challengerCount = clampChallengerCount(challengerCount, delta);
    el.textContent = String(challengerCount);
  }, 2000 + Math.random() * 3000);
}

let completingTask = false;

function completTask() {
  if (completingTask) return;
  completingTask = true;
  setYtState('hidden');
  clearTimers();

  const btn = document.getElementById('done-btn') as HTMLButtonElement | null;
  if (btn) btn.disabled = true;

  if (currentResult && currentTask) {
    history.unshift({ task: currentTask, micro_step: currentResult.micro_step, elapsedMs });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory(history);
  }
  playDoneSound();
  animateDone(() => {
    completingTask = false;
    showShareModal(currentTask, formatElapsed(elapsedMs));
  });
}

function showShareModal(task: string, elapsed: string) {
  if (document.getElementById('share-modal')) return;

  const text = encodeURIComponent(t.shareTweet(task, elapsed));
  const url = encodeURIComponent('https://nothing-to-do-app.pages.dev/');
  const tweetUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;

  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.className = 'share-modal';

  const inner = document.createElement('div');
  inner.className = 'share-modal-inner';

  const title = document.createElement('p');
  title.className = 'share-title';
  title.textContent = t.shareTitle;

  const taskEl = document.createElement('p');
  taskEl.className = 'share-task';
  taskEl.textContent = task;

  const elapsedEl = document.createElement('p');
  elapsedEl.className = 'share-elapsed';
  elapsedEl.textContent = elapsed;

  function closeModal() {
    modal.remove();
    commitmentMinutes = 0;
    transition('input');
  }

  const shareBtn = document.createElement('a');
  shareBtn.className = 'share-x-btn';
  shareBtn.href = tweetUrl;
  shareBtn.target = '_blank';
  shareBtn.rel = 'noopener';
  shareBtn.textContent = t.shareBtn;
  shareBtn.addEventListener('click', () => setTimeout(closeModal, 300));

  const skipBtn = document.createElement('button');
  skipBtn.className = 'share-skip-btn';
  skipBtn.textContent = t.shareSkip;
  skipBtn.addEventListener('click', closeModal);

  inner.append(title, taskEl, elapsedEl, shareBtn, skipBtn);
  modal.appendChild(inner);
  document.body.appendChild(modal);
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
    e.returnValue = t.beforeUnload;
  }
}

function showCoachOverlay() {
  if (document.getElementById('coach-overlay')) return;
  const msg = t.coachMessages[coachIndex % t.coachMessages.length];
  coachIndex++;

  const overlay = document.createElement('div');
  overlay.id = 'coach-overlay';
  overlay.className = 'coach-overlay';

  const p = document.createElement('p');
  p.textContent = msg;

  const btn = document.createElement('button');
  btn.textContent = t.burningOk;
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

// ── Audio (モジュールスコープで1インスタンス再利用) ─────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function scheduleNote(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  gainValue: number,
  t: number,
  duration: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

// ── urgency=3 演出 ──────────────────────────────────────

function startUrgency3Effects() {
  document.body.classList.add('urgency3-shake');

  const ctx = getAudioContext();
  if (!ctx) return;
  [0, 0.18, 0.36].forEach(offset =>
    scheduleNote(ctx, 'square', 880, 0.18, ctx.currentTime + offset, 0.15),
  );
}

// ── 完了アニメーション ───────────────────────────────────

function playDoneSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) =>
    scheduleNote(ctx, 'sine', freq, 0.22, ctx.currentTime + i * 0.1, 0.35),
  );
}

function animateDone(onComplete: () => void) {
  const overlay = document.createElement('div');
  overlay.className = 'done-flash';
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    onComplete();
  }, DONE_FLASH_MS);
}

// ── Helpers ─────────────────────────────────────────────

function transition(next: AppState) {
  if (state === 'monitoring' || state === 'screaming') clearTimers();
  if (state === 'screaming') {
    document.body.style.background = '';
    document.body.style.removeProperty('--pulse-duration');
    document.body.classList.remove('state--screaming', 'urgency3-shake');
  }
  setYtState(next === 'screaming' || next === 'monitoring' ? next : 'hidden');
  state = next;
  render();
}


// ── 言語切り替えボタン ────────────────────────────────────

const langLabel = (l: 'ja' | 'en') => l === 'ja' ? 'EN' : 'JA';

function mountLangBtn() {
  const btn = document.createElement('button');
  btn.id = 'lang-btn';
  btn.className = 'lang-btn';
  btn.textContent = langLabel(lang);
  btn.addEventListener('click', () => {
    btn.textContent = langLabel(toggleLang());
    render();
  });
  document.body.appendChild(btn);
}

// ── Boot ─────────────────────────────────────────────────
setYtState('hidden');
mountLangBtn();
render();
