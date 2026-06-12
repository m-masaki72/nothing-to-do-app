export function speak(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP';
  utt.rate = 1.2;
  utt.pitch = 1.1;
  utt.volume = 1.0;
  window.speechSynthesis.speak(utt);
}

export function stopSpeech(): void {
  window.speechSynthesis?.cancel();
}
