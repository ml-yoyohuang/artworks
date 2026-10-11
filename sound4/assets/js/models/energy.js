// 08 能量蓄積：固定步長積分、臨界觸發、鎖定與恢復（純函式，可在 Node 測試）。
export const MODES = {
  fragile: { name: '脆弱', threshold: 0.78, leak: 0.075, inject: 0.085 },
  balanced: { name: '平衡', threshold: 1.0, leak: 0.095, inject: 0.074 },
  stable: { name: '穩定', threshold: 1.22, leak: 0.11, inject: 0.08 }
};
export const PHASES = { release: 2.8, open: 6, reform: 3.5 };
export const STEP = 1 / 120, EMAX = 1.6;
export const EIGHTH = 60 / 84 / 2;

export class EnergyModel {
  constructor(mode = 'balanced') {
    this.mode = mode; this.E = 0; this.phase = 'charging'; this.phaseStart = 0; this.chargeStart = 0;
    this.t = 0; this.releases = 0; this.samples = []; this.lastSample = -1;
  }
  get p() { return MODES[this.mode]; }
  locked() { return this.phase !== 'charging'; }
  // 注入：鎖定期間無效
  inject(v) { if (this.locked()) return 0; const d = v * this.p.inject; this.E = Math.min(EMAX, this.E + d); return d; }
  // 推進到時間 t；跨越臨界時回呼 onRelease(tc)
  advance(t, onRelease) {
    while (this.t + STEP <= t + 1e-9) {
      this.t += STEP;
      const leak = this.locked() ? 0.9 : this.p.leak;
      this.E = Math.max(0, this.E - leak * this.E * STEP);
      if (this.phase === 'charging' && this.E >= this.p.threshold) {
        this.phase = 'release'; this.phaseStart = this.t; this.releases++;
        onRelease && onRelease(this.t);
      } else if (this.phase === 'release' && this.t - this.phaseStart >= PHASES.release) { this.phase = 'open'; this.phaseStart = this.t; }
      else if (this.phase === 'open' && this.t - this.phaseStart >= PHASES.open) { this.phase = 'reform'; this.phaseStart = this.t; }
      else if (this.phase === 'reform' && this.t - this.phaseStart >= PHASES.reform) { this.phase = 'charging'; this.phaseStart = this.t; this.chargeStart = this.t; }
      if (this.t - this.lastSample >= 1 / 30 - 1e-9) {
        this.lastSample = this.t;
        this.samples.push({ t: this.t, E: this.E, phase: this.phase, pt: this.t - this.phaseStart, n: this.releases });
        if (this.samples.length > 900) this.samples.splice(0, this.samples.length - 900);
      }
    }
  }
  at(t) {
    const s = this.samples; if (!s.length) return { t, E: this.E, phase: this.phase, pt: 0, n: this.releases };
    let lo = 0, hi = s.length - 1;
    if (t <= s[0].t) return s[0];
    if (t >= s[hi].t) return s[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m].t <= t) lo = m; else hi = m; }
    const a = s[lo], b = s[hi], u = (t - a.t) / (b.t - a.t);
    return { ...a, E: a.E + (b.E - a.E) * u, pt: a.phase === b.phase ? a.pt + (b.pt - a.pt) * u : a.pt };
  }
}

// 蓄能曲：依目前階段與已蓄能時間產生每個八分音符的事件（決定性）。
export function stepNotes(model, k) {
  const out = [];
  if (model.phase === 'charging') {
    const i = Math.max(0, Math.round((k * EIGHTH - model.chargeStart) / EIGHTH)), bar = Math.floor(i / 8), s = i % 8;
    if (bar === 2 || bar === 5 || (bar > 7 && bar % 3 === 1)) return out;   // 刻意的停頓：能量在安靜時流失
    const hits = Math.min(8, 2 + bar);
    const on = Math.floor(s * hits / 8) !== Math.floor((s - 1) * hits / 8) || s === 0;
    if (on) {
      const vel = Math.min(0.9, 0.38 + bar * 0.06);
      out.push({ kind: 'pulse', midi: s % 4 === 0 ? 40 : 47, vel });
      if (bar >= 3 && s % 2 === 0) out.push({ kind: 'rise', midi: 64 + Math.min(14, bar * 2) + [0, 3, 7, 10][(s / 2) % 4], vel: vel * 0.6 });
    }
  } else if (model.phase === 'open') {
    const i = Math.round((k * EIGHTH - model.phaseStart) / EIGHTH);
    if (i % 5 === 0) out.push({ kind: 'chime', midi: [76, 81, 83, 88][(i / 5) % 4], vel: 0.35 });
  } else if (model.phase === 'reform') {
    const i = Math.round((k * EIGHTH - model.phaseStart) / EIGHTH);
    if (i % 3 === 0) out.push({ kind: 'fall', midi: 71 - i, vel: 0.3 });
  }
  return out;
}
