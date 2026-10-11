// 05 相位潮汐：兩組節奏的相位都由同一個樂譜時間推導（分段線性，改變速度時保持連續）。
export const PA = 6.0;            // 鈷藍層一輪 6 秒、8 個音
export const NOTES = 8;
export const PATTERN = [62, 69, 65, 72, 69, 64, 67, 74];
export const FIRST_MEET = 14;     // 預設在第 14 秒第一次聚合

export class PhaseClock {
  constructor(cycle = 90, dir = 1) {
    this.cycle = cycle; this.dir = dir;
    // Δ(t) = Δ0 + t/T；令 Δ(14) = 0：起初幾乎同步、稍落後，14 秒追上
    this.anchorT = 0; this.anchorB = -FIRST_MEET / cycle;
    this.rateB = 1 / PA + dir / cycle;
  }
  phaseA(t) { return t / PA; }
  phaseB(t) { return this.anchorB + (t - this.anchorT) * this.rateB; }
  delta(t) { return this.phaseB(t) - this.phaseA(t); }            // 以「輪」為單位
  sync(t) { return 0.5 + 0.5 * Math.cos(2 * Math.PI * this.delta(t)); }
  // 從 t 起改用新的速度差；相位在 t 連續
  change(t, cycle = this.cycle, dir = this.dir) {
    this.anchorB = this.phaseB(t); this.anchorT = t;
    this.cycle = cycle; this.dir = dir; this.rateB = 1 / PA + dir / cycle;
  }
  // [from, to) 內兩層的音符時間
  notes(from, to) {
    const out = [];
    for (let n = Math.ceil(from / PA * NOTES - 1e-9); n / NOTES * PA < to; n++) out.push({ layer: 'A', t: n / NOTES * PA, n });
    const m0 = Math.ceil(this.phaseB(from) * NOTES - 1e-9);
    for (let m = m0; ; m++) {
      const t = this.anchorT + (m / NOTES - this.anchorB) / this.rateB;
      if (t >= to) break;
      if (t >= from) out.push({ layer: 'B', t, n: m });
    }
    return out.sort((a, b) => a.t - b.t);
  }
}
