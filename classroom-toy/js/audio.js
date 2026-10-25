// Shared Web Audio synthesis. Every sound is generated on the fly; there are no audio files.

const MUTE_KEY = 'classroom-toy:muted';

let ctx = null;
let master = null;
let noise = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch {}

/**
 * Creates and resumes the AudioContext. Browsers only allow this inside a user
 * activation — and a touch counts only when the finger lifts (pointerup / touchend),
 * not on pointerdown — so it is retried on every gesture until audio is running.
 */
export function unlock() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (muted || !Ctx) return Promise.resolve();
  if (!ctx) {
    // Let sounds play even with the iPhone ring/silent switch on; the mute button is the off switch.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    ctx = new Ctx();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    limiter.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(limiter);
    const len = Math.floor(ctx.sampleRate * 1);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // A silent tick primes the output path on Safari.
    const prime = ctx.createBufferSource();
    prime.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    prime.connect(ctx.destination);
    prime.start();
  }
  return ctx.state === 'running' ? Promise.resolve() : ctx.resume().catch(() => {});
}
for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
  document.addEventListener(type, unlock, { capture: true, passive: true });
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
  if (muted) return ctx?.suspend();
  return unlock();
}

/** The running AudioContext, or null while muted or still locked. */
export function audio() {
  return !muted && ctx && ctx.state === 'running' ? ctx : null;
}

/**
 * A per-game output. stop() fades it out and cuts it from the speakers, so nothing a
 * game scheduled can still be heard after it unmounts.
 */
export function createBus() {
  let gain = null;
  return {
    get node() {
      if (!audio()) return null;
      if (!gain) {
        gain = ctx.createGain();
        gain.connect(master);
      }
      return gain;
    },
    stop() {
      fadeOut(gain);
      gain = null;
    },
  };
}

/** Quickly fades a GainNode to silence and disconnects it. */
export function fadeOut(node) {
  if (!node) return;
  try { node.gain.setTargetAtTime(0, ctx.currentTime, 0.01); } catch {}
  setTimeout(() => node.disconnect(), 120);
}

/** A filtered burst of noise with an exponential decay. */
export function noiseBurst(bus, { dur = 0.04, type = 'bandpass', freq = 2500, q = 1, gain = 0.4, attack = 0.002, rate = 1, at = 0 } = {}) {
  const out = bus.node;
  if (!out) return;
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = rate;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  src.connect(filter).connect(env).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + attack + dur + 0.02);
}

/**
 * Endless filtered noise for continuous sounds (wind, rumble). Starts silent; the
 * caller sets `gain.gain` and `filter.frequency`, and calls stop() when done.
 */
export function noiseLoop(bus, { type = 'bandpass', freq = 800, q = 1 } = {}) {
  const out = bus.node;
  if (!out) return null;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(out);
  src.start();
  return {
    filter, gain, ctx,
    stop() {
      fadeOut(gain);
      try { src.stop(ctx.currentTime + 0.2); } catch {}
    },
  };
}

/** An oscillator gliding from f0 to f1 with a short attack and exponential decay. */
export function tone(bus, { type = 'sine', f0 = 440, f1 = f0, dur = 0.1, gain = 0.3, attack = 0.003, at = 0 } = {}) {
  const out = bus.node;
  if (!out) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + attack + dur + 0.02);
}
