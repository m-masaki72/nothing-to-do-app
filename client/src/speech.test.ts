import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { speak, stopSpeech } from './speech';

// jsdom には SpeechSynthesisUtterance / speechSynthesis が無いためモックする。
// コンストラクタ引数を保持する最小のスタブを用意する。
class FakeUtterance {
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

describe('speak', () => {
  let cancel: ReturnType<typeof vi.fn>;
  let speakFn: ReturnType<typeof vi.fn>;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    cancel = vi.fn(() => calls.push('cancel'));
    speakFn = vi.fn(() => calls.push('speak'));
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal('speechSynthesis', { cancel, speak: speakFn });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('cancel() が speak() より先に呼ばれる', () => {
    speak('やれ');
    expect(calls).toEqual(['cancel', 'speak']);
  });

  it('渡した utterance の lang が ja-JP', () => {
    speak('やれ');
    const utt = speakFn.mock.calls[0][0] as FakeUtterance;
    expect(utt.lang).toBe('ja-JP');
    expect(utt.text).toBe('やれ');
  });

  it('speechSynthesis が undefined でもクラッシュしない', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => speak('やれ')).not.toThrow();
  });
});

describe('stopSpeech', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cancel() を呼ぶ', () => {
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, speak: vi.fn() });
    stopSpeech();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('speechSynthesis が undefined でもクラッシュしない', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => stopSpeech()).not.toThrow();
  });
});
