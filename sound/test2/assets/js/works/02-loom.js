// 02 和弦織機《一首歌，被織成一匹布》
// 每一列 = 一個八分音符。低音 → 粗經線；旋律 → 有色細緯與提綜位移；打擊 → 結點與短緯。
import { runWork, radioGroup } from '../core/shell.js';
import { rng, clamp } from '../core/rng.js';
import { STEP, MAXROWS, HEADER, stepInfo, PAL, tone, WEAVES, warpOver } from '../models/loom.js';

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const work = {
  engine: { reverb: 2.2, reverbTone: 0.55 },
  weave: 1,
  voices: { bass: true, melody: true, drums: true },
  init(api) {
    const ctx = this.ctx = api.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas');
    this.rows = [];
    for (let i = 0; i < HEADER; i++) this.rows.push({ header: true, weave: 0, ps: i, r: i });
    this.rowCount = HEADER;
    this.cur = null;
    this.handles = [];
    this.bassGlow = 0; this.bassCol = null;
    radioGroup('[data-weave]', v => { this.weave = Number(v); api.status(`織法：${WEAVES[this.weave]}（新的一列開始生效，已織的布保持原樣）`); api.invalidate(); });
    document.querySelectorAll('[data-voice]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.voice, on = !this.voices[k];
      this.voices[k] = on; b.setAttribute('aria-pressed', String(on));
      if (api.state.playing && !on && k !== 'drums') this.handles.filter(h => h.voice === k).forEach(h => h.h && h.h.release(api.at(api.soonest(0.02)), 0.08));
      api.status(`${b.textContent}${on ? '回到' : '退出'}布面。`);
    }));
    document.getElementById('export').addEventListener('click', () => api.exportPNG(`chord-loom-${this.rowCount}rows`));
  },

  geom(w, h) {
    const m = w < 760;
    const pitch = m ? 8 : 11;
    const cw = Math.min(w * (m ? 0.9 : 0.74), 1180);
    const n = Math.floor(cw / pitch);
    const rowH = m ? 7 : 9;
    const top = h * (m ? 0.17 : 0.12), fell = h * (m ? 0.8 : 0.79);
    return { w, h, m, pitch, n, cw: n * pitch, x0: Math.round((w - n * pitch) / 2), rowH, top, fell };
  },

  resize(w, h, dpr) {
    const c = this.ctx.canvas;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    this.dpr = dpr; this.g = this.geom(w, h);
    this.makeSprites();
    // 布面快取：固定高度，新列畫在底部，舊列向上捲動。
    this.cloth = document.createElement('canvas');
    this.cloth.width = Math.round(this.g.cw * dpr); this.cloth.height = Math.round(MAXROWS * this.g.rowH * dpr);
    this.cctx = this.cloth.getContext('2d');
    this.cctx.scale(dpr, dpr);
    for (const row of this.rows) this.commit(row, false);
  },

  makeSprites() {
    const { pitch, rowH } = this.g, d = this.dpr;
    const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * d); c.height = Math.ceil(h * d); const x = c.getContext('2d'); x.scale(d, d); draw(x, w, h); return c; };
    const cyl = (x, w, h, base, vertical) => {
      const g = vertical ? x.createLinearGradient(0, 0, w, 0) : x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(base, -0.45)); g.addColorStop(0.3, shade(base, 0.18)); g.addColorStop(0.55, shade(base, 0.05)); g.addColorStop(1, shade(base, -0.55));
      x.fillStyle = g;
      if (vertical) { x.beginPath(); x.roundRect(0.6, 0, w - 1.2, h, 1.5); x.fill(); } else { x.beginPath(); x.roundRect(0, 0.5, w, h - 1, 2); x.fill(); }
    };
    const tw = document.createElement('canvas'); tw.width = 6; tw.height = 6; const tx = tw.getContext('2d');
    tx.strokeStyle = '#fff'; tx.lineWidth = 1; tx.beginPath(); tx.moveTo(0, 6); tx.lineTo(6, 0); tx.stroke();
    this.twist = this.ctx.createPattern(tw, 'repeat');
    this.warp = ['#d8cbb2', '#c6b598', '#9f8b6c'].map(c => mk(pitch * 0.82, rowH + 1, (x, w, h) => cyl(x, w, h, c, true)));
    this.cordSprite = ['#232a44', '#3b2434', '#1f383c'].map(c => mk(pitch * 1.9, rowH + 1, (x, w, h) => cyl(x, w, h, c, true)));
  },

  // 依當下聲部狀態組成一列（只在該八分音符實際響起時呼叫）。
  composeRow(info, v) {
    const r = this.rowCount;
    const row = { r, ps: info.phraseStep, weave: this.weave, section: info.section };
    if (v.melody && info.note != null) { row.mel = info.note; row.off = Math.round((info.note - 74) / 2); row.onset = info.onset; }
    if (v.bass && info.bass != null) { row.bass = info.bass; row.root = info.root; row.cords = info.bass === info.root ? 3 : info.bass === info.root + 12 ? 1 : 2; }
    if (v.drums) { row.kick = info.kick; row.snare = info.snare; }
    row.hat = v.drums && info.hat;
    return row;
  },

  bassColumn(midi) { const n = this.g.n; return Math.round(clamp((midi - 37) / 10) * (n - 20)) + 10; },

  drawRow(x, row, y, reveal = 1, dir = 1) {
    const { pitch, n, rowH } = this.g;
    const R = rng(`${row.section}:${row.ps}`), F = rng(`fiber${row.r % 997}`);
    const limit = Math.ceil(n * reveal);
    const inRange = j => dir > 0 ? j < limit : j >= n - limit;
    const mel = row.mel != null;
    const color = row.header ? '#e9dfcc' : mel ? shade(PAL[row.section === 'A2' ? 'A2' : row.section === 'B' ? 'B' : 'A'][tone(row.mel)], row.onset ? -0.12 : 0) : '#efe6d5';
    const thick = row.header ? 0.9 : mel ? 1 : 0.38;
    const wy = y + rowH * (1 - thick) / 2, wh = rowH * thick;
    const off = row.off || 0;
    const c0 = row.bass != null ? this.bassColumn(row.root ?? row.bass) : null;
    const cords = c0 == null ? [] : [c0 - 3, c0, c0 + 3].slice(0, row.cords || 3);
    const isCord = j => c0 != null && (j - c0 + 3) % 3 === 0 && Math.abs(j - c0) <= 3;
    const cordSprite = row.bass != null ? this.cordSprite[row.bass % 3] : null;
    const cordOver = c => ((row.ps + c) % 4 + 4) % 4 !== 0;
    const x1 = dir > 0 ? pitch * limit : this.g.cw, xs = dir > 0 ? 0 : this.g.cw - pitch * limit;
    // 粗經線在緯線下方
    for (const c of cords) if (!cordOver(c) && inRange(c)) x.drawImage(cordSprite, c * pitch - pitch * 0.45, y - 0.5, pitch * 1.9, rowH + 1);
    // 緯線（旋律缺席時只剩稀疏的細紗，透出背光）
    if (mel || row.header || row.r % 2 === 0) {
      const g = x.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, shade(color, -0.35)); g.addColorStop(0.35, shade(color, 0.22)); g.addColorStop(0.7, color); g.addColorStop(1, shade(color, -0.5));
      x.globalAlpha = mel || row.header ? 1 : 0.55;
      x.fillStyle = g; x.fillRect(xs, wy, x1 - xs, wh);
      if (this.twist && (mel || row.header)) { x.globalAlpha = 0.22; x.fillStyle = this.twist; x.fillRect(xs, wy, x1 - xs, wh); }
      x.globalAlpha = 1;
    }
    // 經線在上的位置
    for (let j = 0; j < n; j++) {
      if (!inRange(j) || isCord(j)) continue;
      const over = row.header ? ((j + row.r) & 1) === 0 : warpOver(row.weave, j, row.ps, off);
      const sp = this.warp[j % 9 === 0 ? 2 : j % 3 === 0 ? 1 : 0];
      if (over || (!mel && !row.header)) {
        x.globalAlpha = over ? 1 : 0.92;
        x.drawImage(sp, j * pitch + pitch * 0.09, y - 0.5, pitch * 0.82, rowH + 1);
      } else {
        // 經線從緯線下方穿過：留下兩道細影
        x.fillStyle = 'rgba(40,24,12,0.22)';
        x.fillRect(j * pitch + pitch * 0.12, wy, 0.8, wh); x.fillRect(j * pitch + pitch * 0.88, wy, 0.8, wh);
      }
    }
    x.globalAlpha = 1;
    for (const c of cords) if (cordOver(c) && inRange(c)) {
      x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 3; x.shadowOffsetY = 1.2;
      x.drawImage(cordSprite, c * pitch - pitch * 0.45, y - 0.5, pitch * 1.9, rowH + 1); x.restore();
    }
    // 軍鼓：一段亮色短緯浮在表面
    if (row.snare) {
      const c0 = Math.floor(R() * (n - 14)) + 2, len = 8 + Math.floor(R() * 5);
      if (inRange(c0)) {
        const g = x.createLinearGradient(0, y, 0, y + rowH); g.addColorStop(0, '#f6e3a3'); g.addColorStop(0.5, '#e9b949'); g.addColorStop(1, '#8c5b16');
        x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 2; x.shadowOffsetY = 1;
        x.fillStyle = g; x.beginPath(); x.roundRect(c0 * pitch, y + rowH * 0.12, len * pitch, rowH * 0.76, rowH * 0.38); x.fill(); x.restore();
      }
    }
    // 低鼓：大結；沙鈴：細小結點
    const knot = (cx, cy, rad, base) => {
      x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = rad; x.shadowOffsetY = rad * 0.4;
      const g = x.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
      g.addColorStop(0, shade(base, 0.45)); g.addColorStop(0.6, base); g.addColorStop(1, shade(base, -0.55));
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rad * 1.15, rad, 0, 0, Math.PI * 2); x.fill(); x.restore();
      x.strokeStyle = 'rgba(255,240,220,.35)'; x.lineWidth = 0.6; x.beginPath(); x.arc(cx, cy, rad * 0.62, 3.6, 5.4); x.stroke();
    };
    if (row.kick) { const c = Math.round(n * (0.22 + 0.56 * (((row.ps * 5) % 32) / 32))); if (inRange(c)) { knot(c * pitch + pitch / 2, y + rowH / 2, rowH * 0.85, '#5d2420'); knot(c * pitch + pitch * 1.4, y + rowH * 0.35, rowH * 0.5, '#7b3a2a'); } }
    if (row.hat) { const c = Math.floor(((row.ps * 11) % 32) / 32 * n); if (inRange(c)) knot(c * pitch + pitch / 2, y + rowH / 2, rowH * 0.34, '#2e3a4c'); }
    // 毛羽：少量逸出的纖維
    x.strokeStyle = mel ? shade(color, 0.3) : 'rgba(240,230,210,.6)'; x.lineWidth = 0.45; x.globalAlpha = 0.5;
    for (let k = 0; k < 3; k++) {
      const fx = F() * this.g.cw; if (!inRange(Math.floor(fx / pitch))) continue;
      x.beginPath(); x.moveTo(fx, y + F() * rowH); x.quadraticCurveTo(fx + F() * 6 - 3, y - 3 * F(), fx + F() * 10 - 5, y + F() * rowH - 2); x.stroke();
    }
    x.globalAlpha = 1;
  },

  commit(row, store = true) {
    const { rowH } = this.g, c = this.cloth, x = this.cctx, d = this.dpr;
    // 舊列上移一列
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'copy';
    x.drawImage(c, 0, -Math.round(rowH * d)); x.restore();
    x.clearRect(0, (MAXROWS - 1) * rowH - 0.5, this.g.cw, rowH + 1);
    this.drawRow(x, row, (MAXROWS - 1) * rowH, 1, 1);
    if (store) { this.rows.push(row); if (this.rows.length > MAXROWS) this.rows.shift(); }
  },

  schedule(from, to, api) {
    const e = api.engine, au = api.audible, v = this.voices;
    const s0 = Math.ceil(from / STEP - 1e-9), s1 = Math.ceil(to / STEP - 1e-9);
    this.handles = this.handles.filter(h => h.end > (e.ctx ? e.ctx.currentTime : 0));
    for (let s = s0; s < s1; s++) {
      const t = s * STEP, info = stepInfo(s), at = api.at(t);
      if (au) {
        if (v.melody && info.onset) {
          const h = e.mallet(at, info.note, 0.62, { decay: 0.5 + info.noteDur * 0.42, gain: 0.26, partials: [[1, 1, 1], [2.01, 0.12, 0.6], [5.4, 0.05, 0.18]], pan: 0.15, wet: 0.32 });
          this.handles.push({ voice: 'melody', h, end: at + info.noteDur * STEP + 0.6 });
        }
        if (v.bass && info.bassOn) {
          const h = e.bass(at, info.bass, info.bassDur * STEP * 0.92, 0.62, { gain: 0.36 });
          this.handles.push({ voice: 'bass', h, end: at + info.bassDur * STEP });
        }
        if (v.drums) {
          if (info.kick) e.kick(at, 0.55, { freq: 70, gain: 0.5 });
          if (info.snare) { e.noise(at, 0.06, 0.5, { freq: 1900, q: 0.9, gain: 0.32, r: 0.12, pan: -0.1 }); e.pluck(at, 62, 0.25, { decay: 0.12, bright: 3 }); }
        }
        if (v.drums && info.hat) e.noise(at, 0.025, 0.35 + (s % 4 === 3 ? 0.15 : 0), { type: 'highpass', freq: 6500, q: 0.6, gain: 0.16, r: 0.04, pan: 0.3 });
      }
      // 列的聲部狀態在實際響起時讀取（live 參照），開關聲部立即反映在下一列
      api.emit({ t, type: 'row', step: s, info, voices: v });
    }
  },

  onEvent(ev, api) {
    if (ev.type !== 'row') return;
    if (this.cur) this.commitCurrent();
    const row = this.composeRow(ev.info, ev.voices);
    this.cur = { row, t: ev.t, dir: ev.step % 2 ? -1 : 1 };
    if (row.bass != null && ev.info.bassOn) { this.bassGlow = 1; this.bassCol = this.bassColumn(row.root ?? row.bass); }
    if (ev.info.inBar === 0) api.readout(`${ev.info.section === 'A2' ? '變奏 A′' : ev.info.section === 'break' ? '旋律退場' : ev.info.section === 'B' ? '收束 B' : '樂句 A'} · 第 ${ev.info.bar + 1} 小節\n${WEAVES[this.weave]} · ${this.rowCount + 1} 列`);
  },

  commitCurrent() {
    this.commit(this.cur.row); this.rowCount++; this.cur = null;
  },

  update(t, dt) {
    this.t = t;
    this.bassGlow = Math.max(0, this.bassGlow - dt * 1.6);
    if (this.cur) this.cur.p = clamp((t - this.cur.t) / (STEP * 0.72));
  },

  render(api) {
    const x = this.ctx, g = this.g, d = this.dpr, t = this.t || 0;
    x.setTransform(d, 0, 0, d, 0, 0);
    // 室內：暖暗的木色，布面背後有一盞柔光（透光的地方會亮）
    const bg = x.createLinearGradient(0, 0, 0, g.h); bg.addColorStop(0, '#16120e'); bg.addColorStop(1, '#0d0b09');
    x.fillStyle = bg; x.fillRect(0, 0, g.w, g.h);
    const lb = x.createRadialGradient(g.w / 2, g.h * 0.45, 20, g.w / 2, g.h * 0.45, g.cw * 0.75);
    lb.addColorStop(0, '#f3d6a2'); lb.addColorStop(0.55, '#a77f4f'); lb.addColorStop(1, '#2a2016');
    x.fillStyle = lb; x.fillRect(g.x0, g.top, g.cw, g.fell + g.rowH - g.top);
    // 張好的經線（尚未織入的部分透著背光）
    for (let j = 0; j < g.n; j++) x.drawImage(this.warp[j % 9 === 0 ? 2 : j % 3 === 0 ? 1 : 0], g.x0 + j * g.pitch + g.pitch * 0.09, g.top, g.pitch * 0.82, g.fell + g.rowH - g.top);
    // 布面：織口處的新列逐漸升起，已織的布向上捲入布軸
    const p = this.cur ? (this.cur.p || 0) : 0, ease = p * p * (3 - 2 * p);
    const visRows = Math.ceil((g.fell - g.top) / g.rowH) + 2, srcRows = Math.min(MAXROWS, visRows);
    x.save(); x.beginPath(); x.rect(g.x0, g.top, g.cw, g.fell + g.rowH - g.top); x.clip();
    x.drawImage(this.cloth, 0, (MAXROWS - srcRows) * g.rowH * d, this.cloth.width, srcRows * g.rowH * d, g.x0, g.fell - ease * g.rowH - srcRows * g.rowH, g.cw, srcRows * g.rowH);
    if (this.cur) { x.save(); x.translate(g.x0, g.fell - ease * g.rowH); this.drawRow(x, this.cur.row, 0, clamp(p * 1.35), this.cur.dir); x.restore(); }
    // 布的垂墜：柔和的縱向明暗
    const fold = x.createLinearGradient(g.x0, 0, g.x0 + g.cw, 0);
    for (let i = 0; i <= 10; i++) fold.addColorStop(i / 10, `rgba(${i % 2 ? '255,238,210' : '18,10,4'},${i % 2 ? 0.07 : (i === 0 || i === 10 ? 0.4 : 0.16)})`);
    x.fillStyle = fold; x.fillRect(g.x0, g.top, g.cw, g.fell + g.rowH - g.top);
    const top = x.createLinearGradient(0, g.top, 0, g.top + 90); top.addColorStop(0, 'rgba(10,8,6,.85)'); top.addColorStop(1, 'rgba(10,8,6,0)');
    x.fillStyle = top; x.fillRect(g.x0, g.top, g.cw, 90);
    x.restore();
    // 布軸（上）
    const beam = x.createLinearGradient(0, g.top - 16, 0, g.top + 6);
    beam.addColorStop(0, '#2b1f15'); beam.addColorStop(0.45, '#6d4f33'); beam.addColorStop(1, '#1a130d');
    x.fillStyle = beam; x.beginPath(); x.roundRect(g.x0 - 26, g.top - 16, g.cw + 52, 22, 11); x.fill();
    // 織口與鋼筘
    x.fillStyle = 'rgba(255,226,170,.75)'; x.fillRect(g.x0, g.fell + g.rowH - 0.5, g.cw, 1.4);
    const reedY = g.fell + g.rowH + 13;
    const reed = x.createLinearGradient(0, reedY - 5, 0, reedY + 6); reed.addColorStop(0, '#8d7752'); reed.addColorStop(0.5, '#e7d3a3'); reed.addColorStop(1, '#4b3c27');
    // 未織的經線：向下收束
    const cx = g.w / 2, by = g.h + 4;
    for (let j = 0; j < g.n; j++) {
      const xa = g.x0 + j * g.pitch + g.pitch / 2, xb = cx + (xa - cx) * 0.8;
      const isCord = this.bassCol != null && Math.abs(j - this.bassCol) <= 3 && (j - this.bassCol + 3) % 3 === 0;
      const vib = isCord ? Math.sin(t * 60 + j) * this.bassGlow * 1.4 : 0;
      x.strokeStyle = isCord ? `rgba(70,80,120,${0.5 + this.bassGlow * 0.5})` : j % 9 === 0 ? 'rgba(190,172,146,.55)' : 'rgba(234,222,200,.42)';
      x.lineWidth = isCord ? 1.8 : 0.8;
      x.beginPath(); x.moveTo(xa, g.fell + g.rowH); x.quadraticCurveTo((xa + xb) / 2 + vib, (g.fell + by) / 2, xb, by); x.stroke();
    }
    x.fillStyle = reed; x.fillRect(g.x0 - 18, reedY - 5, g.cw + 36, 9);
    // 梭子：沿當前列移動
    if (this.cur && (this.cur.p || 0) * 1.35 < 1) {
      const pp = clamp((this.cur.p || 0) * 1.35), q = this.cur.dir > 0 ? pp : 1 - pp, sx = g.x0 + q * g.cw, syy = g.fell + g.rowH / 2;
      const sg = x.createLinearGradient(sx - 28, 0, sx + 28, 0); sg.addColorStop(0, 'rgba(120,80,40,0)'); sg.addColorStop(0.5, '#c79a5c'); sg.addColorStop(1, 'rgba(120,80,40,0)');
      x.fillStyle = sg; x.beginPath(); x.ellipse(sx, syy + 9, 30, 3.5, 0, 0, Math.PI * 2); x.fill();
    }
  },

  exportCanvas(api) {
    const rows = this.rows.length, g = this.g, d = this.dpr;
    const c = document.createElement('canvas'), pad = 40;
    c.width = Math.round((g.cw + pad * 2) * d); c.height = Math.round((rows * g.rowH + pad * 2) * d);
    const x = c.getContext('2d'); x.fillStyle = '#efe7d8'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(this.cloth, 0, (MAXROWS - rows) * g.rowH * d, this.cloth.width, rows * g.rowH * d, pad * d, pad * d, g.cw * d, rows * g.rowH * d);
    return c;
  },

  reset(api) {
    this.cur = null;
    this.handles.forEach(h => h.h && h.h.release(api.engine.ctx ? api.engine.ctx.currentTime : 0));
    this.handles = [];
    // 重播：在布面留一段起頭再繼續織，保留之前的歷史
    for (let i = 0; i < 4; i++) { const row = { header: true, weave: 0, ps: i, r: this.rowCount++ }; this.commit(row); }
  },
  dispose() { this.cloth = null; }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
