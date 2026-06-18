const isJa = navigator.language.startsWith('ja');

export const t = {
  // input state
  headline:      isJa ? 'THERE IS NOTHING TO STORE. DO IT NOW.' : 'THERE IS NOTHING TO STORE. DO IT NOW.',
  placeholder:   isJa ? '今すぐやるべきことを入力...' : 'Type what you must do right now...',
  commitLabel:   isJa ? '何分でできますか？' : 'How many minutes will it take?',
  submitBtn:     isJa ? '今すぐやれ' : 'DO IT NOW',
  analyzing:     isJa ? 'AIが叱咤文を生成中...' : 'Generating your battle cry...',
  historyLabel:  (n: number) => isJa ? `✅ 今日やったこと (${n}件)` : `✅ Done today (${n})`,
  // hesitation hints
  hesitationHints: isJa
    ? ['迷ってる？とりあえず書いてEnterしろ', '完璧じゃなくていい。今すぐ送れ', '考えすぎだ。3秒で決めろ', 'まだ迷ってるのか。書いたやつで行け', 'もういい。送れ。今すぐ。']
    : ['Still thinking? Just type it and hit Enter', "It doesn't have to be perfect. Send it now.", 'Stop overthinking. Decide in 3 seconds.', 'Still hesitating? Go with what you wrote.', 'Enough. Send it. Right now.'],
  pressureHint:  isJa ? '送れ！！今すぐ！！' : 'SEND IT!! RIGHT NOW!!',
  backspaceHint: isJa ? '消すな！書いたやつで行け！' : "Don't delete it! Go with what you wrote!",
  fallbackStep:  isJa ? 'とにかく今すぐ立ち上がれ。' : 'Get up and start right now.',
  fallbackSpeech: isJa ? 'おい！何をぼーっとしてる！今すぐやれ！！' : 'Hey! What are you doing?! Do it NOW!!',
  // screaming state
  microStepLabel: isJa ? 'まず、これだけやれ' : 'Start with just this',
  // monitoring state
  socialProof:   (n: number) => isJa ? `現在 <span id="challenger-count">${n}</span>人 が挑戦中` : `<span id="challenger-count">${n}</span> people are doing it right now`,
  elapsed:       isJa ? '経過時間' : 'Elapsed',
  doneBtn:       isJa ? 'やった！' : 'DONE!',
  remaining:     (m: number, s: string) => isJa ? `残り ${m}:${s}` : `${m}:${s} left`,
  remainingZero: isJa ? '残り 0:00' : '0:00 left',
  // coach messages
  coachMessages: isJa
    ? ['逃げるな！お前ならできる！', '諦めるな！もう少しだ！', 'ここで逃げたら後悔するぞ！', '立ち止まるな！前を向け！', 'お前はもっとできる！今がチャンスだ！']
    : ["Don't run! You can do this!", "Don't give up! Almost there!", "If you quit now, you'll regret it!", "Don't stop! Keep going!", 'You can do better! This is your moment!'],
  // burning overlay
  timeUp:        isJa ? '時間切れだ！！' : "TIME'S UP!!",
  burningSub:    isJa ? '諦めるな！やり遂げろ！' : "Don't give up! Finish it!",
  burningOk:     isJa ? 'やる！！' : "LET'S GO!!",
  // share modal
  shareTitle:    isJa ? 'やり遂げた！！' : 'CRUSHED IT!!',
  shareTweet:    (task: string, elapsed: string) => isJa
    ? `「${task}」を${elapsed}でやり遂げた！ #やること消えました`
    : `Just crushed "${task}" in ${elapsed}! #NothingToDoApp`,
  shareBtn:      '𝕏 でシェア',
  shareSkip:     isJa ? '次へ' : 'Next',
  beforeUnload:  isJa ? '逃げるな！' : "Don't escape!",
};
