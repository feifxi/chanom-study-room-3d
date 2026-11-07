/** Soft two-note bell made with WebAudio, so no audio files are needed. */
let ctx: AudioContext | null = null;

export function playChime(kind: 'focus' | 'break' | 'idle') {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const notes = kind === 'break' ? [784, 659] : [659, 988];
    notes.forEach((freq, i) => {
      const t = ctx!.currentTime + i * 0.22;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  } catch {
    // Audio can be unavailable (no device, blocked); the visual change still happens.
  }
}
