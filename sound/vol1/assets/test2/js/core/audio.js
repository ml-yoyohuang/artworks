// SOUND/4 音訊引擎：原生 Web Audio。
// - AudioContext 的 currentTime 是唯一的音樂主時鐘。
// - 排程器只「補排」前瞻視窗內的事件；視覺事件以實際播放時間對齊。
// - 暫停以 ctx.suspend() 凍結時鐘與已排程的包絡，恢復時相位不變。
import { mtof, clamp } from './rng.js';

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

export class Engine {
  constructor(opts = {}) {
    this.ctx = null;
    this.lookahead = opts.lookahead ?? 0.22;
    this.volume = opts.volume ?? 0.6;
    this.muted = false;
    this.maxVoices = opts.maxVoices ?? 56;
    this.voices = 0;
    this.sources = new Set();
    this.session = 0;
    this.t0 = 0;
    this.reverbSeconds = opts.reverb ?? 2.6;
    this.reverbTone = opts.reverbTone ?? 0.5;
  }
  static get supported() { return !!AC; }

  async ensure() {
    if (!AC) throw new Error('no-audio');
    if (!this.ctx) {
      const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = ctx.createGain(); this.master.gain.value = 0.8;
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.knee.value = 14; this.comp.ratio.value = 3.5;
      this.comp.attack.value = 0.006; this.comp.release.value = 0.25;
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024;
      this.vol = ctx.createGain(); this.vol.gain.value = this.curve(this.volume);
      this.mute = ctx.createGain(); this.mute.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.comp); this.comp.connect(this.analyser); this.analyser.connect(this.vol);
      this.vol.connect(this.mute); this.mute.connect(ctx.destination);
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.impulse(this.reverbSeconds, this.reverbTone);
      this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.9;
      this.reverb.connect(this.reverbGain); this.reverbGain.connect(this.master);
      this.noiseBuf = this.makeNoise(2);
      this._levelBuf = new Float32Array(this.analyser.fftSize);
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.ctx.state !== 'running') throw new Error('suspended');
    return this.ctx;
  }

  curve(v) { return Math.pow(clamp(v), 2) * 0.95; }
  setVolume(v) {
    this.volume = clamp(v);
    if (this.ctx) this.vol.gain.setTargetAtTime(this.curve(this.volume), this.ctx.currentTime, 0.04);
  }
  setMuted(m) {
    this.muted = !!m;
    if (this.ctx) this.mute.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.03);
  }

  // 開始新的一段展演：舊的匯流排淡出並斷開，避免點擊聲。
  newSession(delay = 0.1) {
    const ctx = this.ctx;
    this.stopAll();
    if (this.bus) {
      const old = this.bus, oldSend = this.send;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      oldSend.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      setTimeout(() => { try { old.disconnect(); oldSend.disconnect(); } catch (e) { /* 已斷開 */ } }, 400);
    }
    this.bus = ctx.createGain(); this.bus.connect(this.master);
    this.send = ctx.createGain(); this.send.connect(this.reverb);
    this.session++;
    this.t0 = ctx.currentTime + delay;
    return this.t0;
  }

  latency() {
    if (!this.ctx) return 0;
    return clamp((this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) * 0.5, 0, 0.12);
  }
  // 觀眾此刻實際聽見的樂譜時間。
  now() { return this.ctx ? this.ctx.currentTime - this.t0 - this.latency() : 0; }
  // 已可排程的最早樂譜時間（目前的音訊時間）。
  schedNow() { return this.ctx ? this.ctx.currentTime - this.t0 : 0; }
  at(t) { return this.t0 + t; }

  async suspend() { if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend(); }
  async resume() { if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume(); }

  level() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this._levelBuf);
    let s = 0; for (const v of this._levelBuf) s += v * v;
    return Math.sqrt(s / this._levelBuf.length);
  }

  stopAll() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const s of this.sources) { try { s.stop(now + 0.03); } catch (e) { /* 已停止 */ } }
    this.sources.clear();
    this.voices = 0;
  }

  async close() {
    this.stopAll();
    if (this.ctx) { try { await this.ctx.close(); } catch (e) { /* 已關閉 */ } }
    this.ctx = null;
  }

  makeNoise(seconds) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let x = 12345;
    for (let i = 0; i < len; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = x / 0x3fffffff - 1; }
    return b;
  }

  impulse(seconds, tone) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let x = 777 + c * 999, lp = 0;
      for (let i = 0; i < len; i++) {
        x = (x * 1664525 + 1013904223) >>> 0;
        const n = x / 2147483648 - 1, t = i / len;
        lp += (n - lp) * (0.08 + tone * 0.6 * (1 - t));
        d[i] = lp * Math.pow(1 - t, 2.4) * (i < 80 ? i / 80 : 1);
      }
    }
    return b;
  }

  // ---- 發聲：所有聲音都由此建立，計數並在結束時斷開節點 ----
  track(src, end, nodes) {
    this.sources.add(src); this.voices++;
    src.onended = () => {
      this.sources.delete(src); this.voices = Math.max(0, this.voices - 1);
      for (const n of nodes) { try { n.disconnect(); } catch (e) { /* 已斷開 */ } }
    };
    src.stop(end);
  }
  canPlay(t, priority = 1) {
    if (!this.ctx || !this.bus) return false;
    if (t < this.ctx.currentTime - 0.04) return false; // 過期事件只保留視覺
    return this.voices < this.maxVoices * (priority >= 1 ? 1 : 0.7);
  }
  out(gainNode, { pan = 0, wet = 0.25, dest } = {}) {
    const ctx = this.ctx, nodes = [];
    let last = gainNode;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); last.connect(p); last = p; nodes.push(p); }
    last.connect(dest || this.bus);
    if (wet > 0) { const w = ctx.createGain(); w.gain.value = wet; last.connect(w); w.connect(this.send); nodes.push(w); }
    return nodes;
  }
  env(param, t, { a = 0.01, peak = 1, d = 0.2, s = 0.5, dur = 0.3, r = 0.3 }) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.setTargetAtTime(peak * s, t + a, Math.max(0.005, d / 3));
    const rel = t + Math.max(a, dur);
    param.cancelScheduledValues(rel);
    param.setTargetAtTime(0, rel, Math.max(0.005, r / 4));
    return rel + r * 1.2;
  }

  // 柔和的持續音（兩支微失諧振盪器 + 低通），用於和弦與長音。
  pad(time, midi, dur, vel = 0.5, o = {}) {
    if (!this.canPlay(time)) return;
    const ctx = this.ctx, f = mtof(midi);
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.4;
    const bright = o.bright ?? 0.4;
    lp.frequency.setValueAtTime(f * (1.5 + bright * 2), time);
    lp.frequency.linearRampToValueAtTime(f * (2.2 + bright * 5), time + Math.min(dur, o.a ?? 1.2));
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o.wave || 'triangle'; o2.type = o.wave2 || 'sawtooth';
    o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = o.detune ?? 7;
    const g2 = ctx.createGain(); g2.gain.value = o.mix ?? 0.18;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
    const end = this.env(g.gain, time, { a: o.a ?? 1.0, peak: vel * 0.22, d: 0.8, s: 0.85, dur, r: o.r ?? 1.6 });
    const nodes = [g, lp, o1, o2, g2, ...this.out(g, o)];
    o1.start(time); o2.start(time); o2.stop(end);
    this.track(o1, end, nodes);
    return this.handle(g.gain, [o1, o2], time, end);
  }

  // 可提前釋放的聲部：以平滑包絡收掉，避免點擊聲。
  handle(param, oscs, start, end) {
    const ctx = this.ctx;
    return {
      start, end,
      release: (t, tau = 0.18) => {
        t = Math.max(t, ctx.currentTime);
        if (t >= end) return;
        if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else param.cancelScheduledValues(t);
        param.setTargetAtTime(0, t, tau);
        const stopAt = Math.max(t, start) + tau * 6;
        for (const o of oscs) { try { o.stop(stopAt); } catch (e) { /* 已停止 */ } }
      }
    };
  }

  // FM 鐘音：短而清透。
  bell(time, midi, vel = 0.5, o = {}) {
    if (!this.canPlay(time, 0.5)) return;
    const ctx = this.ctx, f = mtof(midi);
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f * (o.ratio ?? 3.5);
    mg.gain.setValueAtTime(f * (o.index ?? 1.6) * vel, time);
    mg.gain.setTargetAtTime(0, time, (o.decay ?? 1.6) / 5);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    const dec = o.decay ?? 1.6;
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vel * (o.gain ?? 0.16), time + 0.004);
    g.gain.setTargetAtTime(0, time + 0.004, dec / 4);
    const end = time + dec * 1.6;
    const nodes = [g, mg, car, mod, ...this.out(g, { wet: 0.35, ...o })];
    car.start(time); mod.start(time); mod.stop(end);
    this.track(car, end, nodes);
  }

  // 木質琴槌（馬林巴近似）：基音 + 4 倍、10 倍泛音快速衰減。
  mallet(time, midi, vel = 0.5, o = {}) {
    if (!this.canPlay(time, 0.6)) return;
    const ctx = this.ctx, f = mtof(midi), g = ctx.createGain();
    const parts = o.partials || [[1, 1, 1], [3.93, 0.32, 0.25], [9.8, 0.08, 0.08]];
    const oscs = [], nodes = [g];
    const dec = o.decay ?? 1.2;
    for (const [ratio, amp, dk] of parts) {
      const osc = ctx.createOscillator(), pg = ctx.createGain();
      osc.frequency.value = f * ratio; osc.type = 'sine';
      pg.gain.setValueAtTime(0, time); pg.gain.linearRampToValueAtTime(amp, time + 0.003);
      pg.gain.setTargetAtTime(0, time + 0.003, dec * dk / 3.5);
      osc.connect(pg); pg.connect(g); oscs.push(osc); nodes.push(osc, pg);
    }
    g.gain.value = vel * (o.gain ?? 0.2);
    const end = time + dec * 1.5;
    nodes.push(...this.out(g, o));
    oscs.forEach((osc, i) => { osc.start(time); if (i) osc.stop(end); });
    this.track(oscs[0], end, nodes);
  }

  // 撥弦：三角波＋低通掃頻。
  pluck(time, midi, vel = 0.5, o = {}) {
    if (!this.canPlay(time, 0.6)) return;
    const ctx = this.ctx, f = mtof(midi);
    const osc = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = o.wave || 'triangle'; osc.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = o.q ?? 2;
    lp.frequency.setValueAtTime(Math.min(16000, f * (o.bright ?? 8)), time);
    lp.frequency.setTargetAtTime(f * 1.2, time, (o.decay ?? 0.6) / 4);
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vel * (o.gain ?? 0.22), time + 0.004);
    g.gain.setTargetAtTime(0, time + 0.004, (o.decay ?? 0.6) / 4);
    osc.connect(lp); lp.connect(g);
    const end = time + (o.decay ?? 0.6) * 1.6;
    const nodes = [osc, lp, g, ...this.out(g, o)];
    osc.start(time);
    this.track(osc, end, nodes);
  }

  // 圓潤低音：正弦 + 低八度三角波。
  bass(time, midi, dur, vel = 0.5, o = {}) {
    if (!this.canPlay(time)) return;
    const ctx = this.ctx, f = mtof(midi);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f;
    g2.gain.value = 0.35; lp.type = 'lowpass'; lp.frequency.value = Math.min(900, f * 5); lp.Q.value = 0.6;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
    const end = this.env(g.gain, time, { a: o.a ?? 0.012, peak: vel * (o.gain ?? 0.34), d: 0.25, s: 0.7, dur, r: o.r ?? 0.18 });
    const nodes = [o1, o2, lp, g, g2, ...this.out(g, { wet: 0.08, ...o })];
    o1.start(time); o2.start(time); o2.stop(end);
    this.track(o1, end, nodes);
    return this.handle(g.gain, [o1, o2], time, end);
  }

  // 濾波雜訊：鼓刷、沙鈴、氣息與擦弦質地。
  noise(time, dur, vel = 0.5, o = {}) {
    if (!this.canPlay(time, o.priority ?? 0.5)) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = o.type || 'bandpass'; bp.frequency.value = o.freq ?? 2000; bp.Q.value = o.q ?? 1.2;
    if (o.sweep) { bp.frequency.setValueAtTime(o.freq, time); bp.frequency.linearRampToValueAtTime(o.sweep, time + dur); }
    src.connect(bp); bp.connect(g);
    const end = this.env(g.gain, time, { a: o.a ?? 0.002, peak: vel * (o.gain ?? 0.2), d: o.d ?? 0.05, s: o.s ?? 0.2, dur, r: o.r ?? 0.08 });
    const nodes = [src, bp, g, ...this.out(g, { wet: 0.12, ...o })];
    src.start(time, (time * 7.31) % 1.5);
    this.track(src, end, nodes);
  }

  // 柔軟的低鼓：正弦下滑。
  kick(time, vel = 0.5, o = {}) {
    if (!this.canPlay(time)) return;
    const ctx = this.ctx, osc = ctx.createOscillator(), g = ctx.createGain();
    const f = o.freq ?? 90;
    osc.frequency.setValueAtTime(f * 1.8, time); osc.frequency.exponentialRampToValueAtTime(f * 0.55, time + 0.18);
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vel * (o.gain ?? 0.5), time + 0.004);
    g.gain.setTargetAtTime(0, time + 0.004, 0.09);
    osc.connect(g);
    const end = time + 0.6;
    const nodes = [osc, g, ...this.out(g, { wet: 0.05, ...o })];
    osc.start(time);
    this.track(osc, end, nodes);
  }

  // 共振峰人聲：鋸齒波聲源經三個帶通共振峰 + 氣音雜訊。contour: [[t, midi, amp, air]...] 相對時間。
  voice(time, contour, o = {}) {
    if (!this.canPlay(time) || contour.length < 2) return;
    const ctx = this.ctx, last = contour[contour.length - 1][0];
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    vib.frequency.value = 5.2; vibG.gain.value = o.vibrato ?? 3; vib.connect(vibG); vibG.connect(src.detune);
    const voiced = ctx.createGain(), airG = ctx.createGain(), sum = ctx.createGain(), out = ctx.createGain();
    const nsrc = ctx.createBufferSource(); nsrc.buffer = this.noiseBuf; nsrc.loop = true;
    const nhp = ctx.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = 500;
    nsrc.connect(nhp); nhp.connect(airG);
    src.connect(voiced);
    const formants = o.formants || [[700, 1, 8], [1150, 0.5, 9], [2800, 0.18, 10]];
    const nodes = [src, vib, vibG, voiced, airG, sum, out, nsrc, nhp];
    for (const [fq, amp, q] of formants) {
      const bp = ctx.createBiquadFilter(), fg = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; fg.gain.value = amp * 2.4;
      voiced.connect(bp); airG.connect(bp); bp.connect(fg); fg.connect(sum); nodes.push(bp, fg);
    }
    const airDirect = ctx.createGain(); airDirect.gain.value = 0.35; airG.connect(airDirect); airDirect.connect(sum); nodes.push(airDirect);
    sum.connect(out);
    const gainScale = o.gain ?? 0.2;
    src.frequency.setValueAtTime(mtof(contour[0][1]), time);
    voiced.gain.setValueAtTime(0, time); airG.gain.setValueAtTime(0, time);
    for (const [t, midi, amp, air] of contour) {
      const at = time + t;
      src.frequency.linearRampToValueAtTime(mtof(midi), at);
      voiced.gain.linearRampToValueAtTime(amp * (1 - air) * gainScale, at);
      airG.gain.linearRampToValueAtTime(amp * air * gainScale * 0.9, at);
    }
    const end = time + last + 0.3;
    voiced.gain.linearRampToValueAtTime(0, end - 0.1); airG.gain.linearRampToValueAtTime(0, end - 0.1);
    nodes.push(...this.out(out, { wet: 0.3, ...o }));
    src.start(time); vib.start(time); nsrc.start(time); vib.stop(end); nsrc.stop(end);
    this.track(src, end, nodes);
    return this.handle(out.gain, [src, vib, nsrc], time, end);
  }
}

// 前瞻排程器：setInterval 只負責補排，不是音樂時鐘。
export class Scheduler {
  constructor(engine, fill, interval = 40) {
    this.engine = engine; this.fill = fill; this.interval = interval;
    this.until = 0; this.timer = null;
  }
  reset(t = 0) { this.until = t; }
  tick() {
    const e = this.engine;
    if (!e.ctx || e.ctx.state !== 'running') return;
    const horizon = e.schedNow() + e.lookahead;
    if (horizon <= this.until) return;
    // 過期的發聲由 canPlay 丟棄，視覺與狀態仍完整補齊，不會跳過樂譜。
    this.fill(this.until, horizon);
    this.until = horizon;
  }
  start() { this.stop(); this.timer = setInterval(() => this.tick(), this.interval); this.tick(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
