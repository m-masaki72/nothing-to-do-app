const LANG_KEY = 'ntd_lang';

function detectLang(): 'ja' | 'en' {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'ja' || saved === 'en') return saved;
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
}

export let lang: 'ja' | 'en' = detectLang();

export function toggleLang(): 'ja' | 'en' {
  lang = lang === 'ja' ? 'en' : 'ja';
  localStorage.setItem(LANG_KEY, lang);
  return lang;
}

const JA = {
  placeholder:   '今すぐやるべきことを入力...',
  commitLabel:   '何分でできますか？',
  submitBtn:     '今すぐやれ',
  analyzing:     'AIが叱咤文を生成中...',
  historyLabel:  (n: number) => `✅ 今日やったこと (${n}件)`,
  hesitationHints: ['迷ってる？とりあえず書いてEnterしろ', '完璧じゃなくていい。今すぐ送れ', '考えすぎだ。3秒で決めろ', 'まだ迷ってるのか。書いたやつで行け', 'もういい。送れ。今すぐ。'],
  pressureHint:  '送れ！！今すぐ！！',
  backspaceHint: '消すな！書いたやつで行け！',
  fallbackStep:  'とにかく今すぐ立ち上がれ。',
  fallbackSpeech: 'おい！何をぼーっとしてる！今すぐやれ！！',
  microStepLabel: 'まず、これだけやれ',
  socialProof:   (n: number) => `現在 <span id="challenger-count">${n}</span>人 が挑戦中`,
  elapsed:       '経過時間',
  doneBtn:       'やった！',
  remaining:     (m: number, s: string) => `残り ${m}:${s}`,
  remainingZero: '残り 0:00',
  coachMessages: ['逃げるな！お前ならできる！', '諦めるな！もう少しだ！', 'ここで逃げたら後悔するぞ！', '立ち止まるな！前を向け！', 'お前はもっとできる！今がチャンスだ！'],
  timeUp:        '時間切れだ！！',
  burningSub:    '諦めるな！やり遂げろ！',
  burningOk:     'やる！！',
  shareTitle:    'やり遂げた！！',
  shareTweet:    (task: string, elapsed: string) => `「${task}」を${elapsed}でやり遂げた！ #やること消えました`,
  shareBtn:      '𝕏 でシェア',
  shareSkip:     '次へ',
  beforeUnload:  '逃げるな！',
} as const;

const EN = {
  placeholder:   'Type what you must do right now...',
  commitLabel:   'How many minutes will it take?',
  submitBtn:     'DO IT NOW',
  analyzing:     'Generating your battle cry...',
  historyLabel:  (n: number) => `✅ Done today (${n})`,
  hesitationHints: ['Still thinking? Just type it and hit Enter', "It doesn't have to be perfect. Send it now.", 'Stop overthinking. Decide in 3 seconds.', 'Still hesitating? Go with what you wrote.', 'Enough. Send it. Right now.'],
  pressureHint:  'SEND IT!! RIGHT NOW!!',
  backspaceHint: "Don't delete it! Go with what you wrote!",
  fallbackStep:  'Get up and start right now.',
  fallbackSpeech: 'Hey! What are you doing?! Do it NOW!!',
  microStepLabel: 'Start with just this',
  socialProof:   (n: number) => `<span id="challenger-count">${n}</span> people are doing it right now`,
  elapsed:       'Elapsed',
  doneBtn:       'DONE!',
  remaining:     (m: number, s: string) => `${m}:${s} left`,
  remainingZero: '0:00 left',
  coachMessages: ["Don't run! You can do this!", "Don't give up! Almost there!", "If you quit now, you'll regret it!", "Don't stop! Keep going!", 'You can do better! This is your moment!'],
  timeUp:        "TIME'S UP!!",
  burningSub:    "Don't give up! Finish it!",
  burningOk:     "LET'S GO!!",
  shareTitle:    'CRUSHED IT!!',
  shareTweet:    (task: string, elapsed: string) => `Just crushed "${task}" in ${elapsed}! #NothingToDoApp`,
  shareBtn:      '𝕏 Share',
  shareSkip:     'Next',
  beforeUnload:  "Don't escape!",
} as const;

type Strings = typeof JA;

export const t: Strings = new Proxy({} as Strings, {
  get(_target, key: string) {
    const dict = lang === 'ja' ? JA : EN;
    return dict[key as keyof Strings];
  },
});
