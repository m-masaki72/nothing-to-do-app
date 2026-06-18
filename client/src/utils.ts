export interface HistoryEntry {
  task: string;
  micro_step: string;
  elapsedMs: number;
}

export const HISTORY_KEY = 'ntd_history';
export const MAX_HISTORY = 50;

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const millis = ms % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // QuotaExceededError 等は無視
  }
}

export function clampChallengerCount(current: number, delta: number): number {
  return Math.max(847, Math.min(2341, current + delta));
}
