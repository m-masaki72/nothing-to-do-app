import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeTask, type AnalyzeResult } from './api';

// jsdom 環境では import.meta.env.VITE_API_BASE_URL は undefined のため
// デフォルトの http://localhost:3001 にフォールバックする。
const EXPECTED_URL = 'http://localhost:3001/api/analyze';

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('analyzeTask', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('正常系: 200 + 正しいJSONで AnalyzeResult を返す', async () => {
    const result: AnalyzeResult = {
      micro_step: '件名を書く',
      angry_speech: '早くしろ',
      urgency_level: 2,
    };
    const fetchMock = vi.fn(async () => mockResponse(result));
    vi.stubGlobal('fetch', fetchMock);

    await expect(analyzeTask('メール返信')).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      EXPECTED_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'メール返信' }),
      }),
    );
  });

  it('HTTPエラー: 500 のとき Error をスローする', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse(null, false, 500)));
    await expect(analyzeTask('タスク')).rejects.toThrow('API error: 500');
  });

  it('ネットワークエラー: fetch が reject したらエラーが伝播する', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Failed to fetch');
    }));
    await expect(analyzeTask('タスク')).rejects.toThrow('Failed to fetch');
  });

  it.each([1, 2, 3] as const)('urgency_level=%i が正しくパースされる', async level => {
    const result: AnalyzeResult = {
      micro_step: 'step',
      angry_speech: 'speech',
      urgency_level: level,
    };
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse(result)));
    const got = await analyzeTask('タスク');
    expect(got.urgency_level).toBe(level);
  });
});

describe('analyzeTask タイムアウト', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('8秒経過で AbortError がスローされる', async () => {
    // fetch は signal が abort されたら reject する挙動を模倣する。
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal!;
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    }));

    const promise = analyzeTask('タスク');
    const assertion = expect(promise).rejects.toThrow('The operation was aborted.');
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
});
