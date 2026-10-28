/**
 * Procedural ambient sound with WebAudio: no audio files, nothing to download.
 *   rain: filtered noise with a slow swell and sparse droplets
 *   cafe: low murmur (brown noise) and the odd cup clink
 *   lofi: soft jazzy chord loop through a warm low-pass, with vinyl crackle
 */
export const AMBIENT_SOUNDS = ['rain', 'cafe', 'lofi'] as const;
export type AmbientSound = (typeof AMBIENT_SOUNDS)[number];

interface Channel {
  gain: GainNode;
  stop: () => void;
}

function noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown', seconds = 3) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white') data[i] = white;
    else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

function loop(ctx: AudioContext, buffer: AudioBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

/** Short decaying tone, used for droplets, clinks and crackle. */
function blip(ctx: AudioContext, out: AudioNode, freq: number, level: number, decay: number, type: OscillatorType = 'sine') {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

const GENERATORS: Record<AmbientSound, (ctx: AudioContext, out: GainNode) => () => void> = {
  rain(ctx, out) {
    const src = loop(ctx, noiseBuffer(ctx, 'white'));
    const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 1400, Q: 0.6 });
    const swell = ctx.createGain();
    const lfo = new OscillatorNode(ctx, { frequency: 0.07 });
    const lfoDepth = new GainNode(ctx, { gain: 0.15 });
    swell.gain.value = 0.55;
    lfo.connect(lfoDepth).connect(swell.gain);
    src.connect(band).connect(swell).connect(out);
    src.start();
    lfo.start();
    const drops = setInterval(() => {
      if (Math.random() < 0.6) blip(ctx, out, 2500 + Math.random() * 3000, 0.05 * Math.random(), 0.04);
    }, 70);
    return () => {
      clearInterval(drops);
      src.stop();
      lfo.stop();
    };
  },

  cafe(ctx, out) {
    const src = loop(ctx, noiseBuffer(ctx, 'brown', 4));
    const low = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 700 });
    const murmur = new GainNode(ctx, { gain: 0.9 });
    src.connect(low).connect(murmur).connect(out);
    src.start();
    const clinks = setInterval(() => {
      if (Math.random() < 0.35) {
        const f = 2200 + Math.random() * 1600;
        blip(ctx, out, f, 0.06, 0.5);
        blip(ctx, out, f * 1.5, 0.025, 0.35);
      }
    }, 2500);
    return () => {
      clearInterval(clinks);
      src.stop();
    };
  },

  lofi(ctx, out) {
    const warm = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1100, Q: 0.4 });
    warm.connect(out);
    // Cmaj7 – Am7 – Fmaj7 – G7, voiced low and close
    const chords = [
      [130.8, 164.8, 196.0, 246.9],
      [110.0, 130.8, 164.8, 196.0],
      [87.3, 130.8, 174.6, 220.0],
      [98.0, 123.5, 146.8, 174.6],
    ];
    const BAR = 2.6;
    let step = 0;
    let next = ctx.currentTime + 0.05;
    const schedule = () => {
      while (next < ctx.currentTime + 0.4) {
        for (const f of chords[step % chords.length]!) {
          const osc = new OscillatorNode(ctx, { type: 'triangle', frequency: f, detune: (Math.random() - 0.5) * 8 });
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, next);
          g.gain.linearRampToValueAtTime(0.06, next + 0.35);
          g.gain.linearRampToValueAtTime(0.04, next + BAR * 0.7);
          g.gain.linearRampToValueAtTime(0, next + BAR + 0.3);
          osc.connect(g).connect(warm);
          osc.start(next);
          osc.stop(next + BAR + 0.4);
        }
        step++;
        next += BAR;
      }
    };
    schedule();
    const scheduler = setInterval(schedule, 150);
    const crackle = setInterval(() => {
      if (Math.random() < 0.5) blip(ctx, out, 3000 + Math.random() * 4000, 0.02 * Math.random(), 0.01, 'square');
    }, 90);
    return () => {
      clearInterval(scheduler);
      clearInterval(crackle);
      warm.disconnect();
    };
  },
};

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private channels = new Map<AmbientSound, Channel>();

  /** 0 turns the sound off; anything above starts it (must follow a user click). */
  setVolume(sound: AmbientSound, volume: number) {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      return; // no audio device
    }
    const ctx = this.ctx;
    let ch = this.channels.get(sound);
    if (volume <= 0) {
      if (!ch) return;
      ch.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      const done = ch;
      setTimeout(() => {
        done.stop();
        done.gain.disconnect();
      }, 800);
      this.channels.delete(sound);
      return;
    }
    if (!ch) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      ch = { gain, stop: GENERATORS[sound](ctx, gain) };
      this.channels.set(sound, ch);
    }
    ch.gain.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.25);
  }

  stopAll() {
    for (const s of [...this.channels.keys()]) this.setVolume(s, 0);
  }
}
