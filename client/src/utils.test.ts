import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  formatElapsed,
  loadHistory,
  saveHistory,
  clampChallengerCount,
  HISTORY_KEY,
  MAX_HISTORY,
  type HistoryEntry,
} from './utils';

// ── formatElapsed ────────────────────────────────────────

describe('formatElapsed', () => {
  it('0ms → 0:00.000', () => {
    expect(formatElapsed(0)).toBe('0:00.000');
  });

  it('999ms → 0:00.999', () => {
    expect(formatElapsed(999)).toBe('0:00.999');
  });

  it('1000ms → 0:01.000', () => {
    expect(formatElapsed(1000)).toBe('0:01.000');
  });

  it('59999ms → 0:59.999', () => {
    expect(formatElapsed(59999)).toBe('0:59.999');
  });

  it('60000ms → 1:00.000', () => {
    expect(formatElapsed(60000)).toBe('1:00.000');
  });

  it('90500ms → 1:30.500', () => {
    expect(formatElapsed(90500)).toBe('1:30.500');
  });

  it('3661234ms → 61:01.234', () => {
    expect(formatElapsed(3661234)).toBe('61:01.234');
  });

  it('秒は2桁ゼロ埋め', () => {
    expect(formatElapsed(5000)).toBe('0:05.000');
  });

  it('ミリ秒は3桁ゼロ埋め', () => {
    expect(formatElapsed(1001)).toBe('0:01.001');
  });
});

// ── clampChallengerCount ─────────────────────────────────

describe('clampChallengerCount', () => {
  it('範囲内の加算はそのまま返す', () => {
    expect(clampChallengerCount(1000, 3)).toBe(1003);
  });

  it('範囲内の減算はそのまま返す', () => {
    expect(clampChallengerCount(1000, -3)).toBe(997);
  });

  it('下限847を下回らない', () => {
    expect(clampChallengerCount(847, -1)).toBe(847);
    expect(clampChallengerCount(848, -10)).toBe(847);
  });

  it('上限2341を超えない', () => {
    expect(clampChallengerCount(2341, 1)).toBe(2341);
    expect(clampChallengerCount(2340, 10)).toBe(2341);
  });

  it('ちょうど下限', () => {
    expect(clampChallengerCount(850, -3)).toBe(847);
  });

  it('ちょうど上限', () => {
    expect(clampChallengerCount(2338, 3)).toBe(2341);
  });
});

// ── loadHistory / saveHistory ────────────────────────────

describe('loadHistory / saveHistory', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('未保存なら空配列を返す', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('不正なJSONでも空配列を返す（クラッシュしない）', () => {
    localStorage.setItem(HISTORY_KEY, 'not-json{{');
    expect(loadHistory()).toEqual([]);
  });

  it('有効なJSONだが配列でない場合も空配列を返す（nullリテラル）', () => {
    localStorage.setItem(HISTORY_KEY, 'null');
    expect(loadHistory()).toEqual([]);
  });

  it('有効なJSONだが配列でない場合も空配列を返す（オブジェクト）', () => {
    localStorage.setItem(HISTORY_KEY, '{"foo":"bar"}');
    expect(loadHistory()).toEqual([]);
  });

  it('保存した履歴をそのまま復元できる', () => {
    const entries: HistoryEntry[] = [
      { task: 'メール返信', micro_step: '件名を書く', elapsedMs: 12345 },
      { task: '資料作成', micro_step: '1ページ目だけ', elapsedMs: 67890 },
    ];
    saveHistory(entries);
    expect(loadHistory()).toEqual(entries);
  });

  it('空配列を保存してそのまま復元できる', () => {
    saveHistory([]);
    expect(loadHistory()).toEqual([]);
  });

  it('MAX_HISTORY件を超えてもsaveHistoryはそのまま保存する（切り詰めは呼び出し元の責務）', () => {
    const entries: HistoryEntry[] = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      task: `task-${i}`,
      micro_step: `step-${i}`,
      elapsedMs: i * 1000,
    }));
    saveHistory(entries);
    expect(loadHistory()).toHaveLength(MAX_HISTORY + 5);
  });

  it('上書き保存が正しく反映される', () => {
    const first: HistoryEntry[] = [{ task: '旧タスク', micro_step: '旧ステップ', elapsedMs: 0 }];
    const second: HistoryEntry[] = [{ task: '新タスク', micro_step: '新ステップ', elapsedMs: 1000 }];
    saveHistory(first);
    saveHistory(second);
    expect(loadHistory()).toEqual(second);
  });
});
