// 05 相位潮汐《兩個幾乎同步的世界》
// 兩組節奏的相位直接成為兩層波場的相位；相位差決定大尺度的聚合與分離。
import { runWork, radioGroup } from '../core/shell.js';
import { createGL, GLSL_NOISE } from '../core/gl.js';
import { PhaseClock, PATTERN, NOTES, PA } from '../models/tides.js';

const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uPA, uPB, uSync, uT; uniform vec3 uRA[8]; uniform vec3 uRB[8];
${GLSL_NOISE}
const float TAU = 6.2831853;
float ripple(vec2 uv, vec3 r){ float d = length(uv - r.xy), a = r.z, f = a*.32;
  return sin((d - f)*34.)*exp(-a*1.1)*exp(-abs(d - f)*9.)*step(0., a); }
void main(){
  float m = min(uRes.x, uRes.y); vec2 uv = (gl_FragCoord.xy - .5*uRes)/m;
  float angA = .42, angB = mix(1.5, .42, pow(uSync, 2.2));
  vec2 dA = vec2(cos(angA), sin(angA)), dB = vec2(cos(angB), sin(angB));
  vec2 w = vec2(fbm(uv*1.1 + uT*.011), fbm(uv*1.1 + 7.3 - uT*.009)) - .5;
  float rA = 0., rB = 0.;
  for (int i = 0; i < 8; i++) { rA += ripple(uv, uRA[i]); rB += ripple(uv, uRB[i]); }
  float xA = TAU*(dot(uv + w*.36, dA)*1.35 - uPA) + rA*1.1, xB = TAU*(dot(uv + w.yx*.36, dB)*1.35 - uPB) + rB*1.1;
  float fA = (sin(xA) + .32*sin(2.*xA + .6))/1.2, fB = (sin(xB) + .32*sin(2.*xB + .6))/1.2;   // 潮汐般前緣陡、後緣緩
  float bA = smoothstep(-.45, .7, fA), bB = smoothstep(-.45, .7, fB);
  bA *= .55 + .45*fbm(uv*2.2 - uPA*.2); bB *= .55 + .45*fbm(uv*2.2 + 3. - uPB*.2);
  vec3 ground = vec3(.045,.055,.085), cobalt = vec3(.07,.2,.66), verm = vec3(.86,.2,.1), plum = vec3(.36,.1,.3), pale = vec3(.99,.94,.85);
  float tex = fbm(uv*vec2(5., 7.) + fA*.3)*.12;
  vec3 col = ground;
  col = mix(col, cobalt*(.85 + tex), bA*.88);
  col = mix(col, verm*(.88 + tex), bB*.82*(1. - .45*bA));
  float both = bA*bB;
  col = mix(col, plum, both*.4*(1. - uSync*.6));
  float crest = smoothstep(.72, .98, fA)*smoothstep(.72, .98, fB);
  col = mix(col, pale, crest*(.15 + .8*pow(uSync, 3.)));
  float eA = exp(-abs(fA + .02)*22.)*.18, eB = exp(-abs(fB + .02)*22.)*.16;
  col += vec3(.55,.68,1.)*eA*(1. - bB*.6) + vec3(1.,.72,.55)*eB*(1. - bA*.6);
  col += (hash(floor(gl_FragCoord.xy)) - .5)*.03;
  col *= smoothstep(1.6, .35, length(uv*vec2(.75, 1.)));
  gl_FragColor = vec4(col, 1.);
}`;

const work = {
  engine: { reverb: 3.2, reverbTone: 0.5 },
  init(api) {
    this.g = createGL(api.canvas, FRAG);
    this.clock = new PhaseClock(90, 1);
    this.rA = []; this.rB = [];
    this.t = 0;
    radioGroup('[data-cycle]', v => this.change(api, Number(v), this.clock.dir));
    radioGroup('[data-dir]', v => this.change(api, this.clock.cycle, Number(v)));
  },
  change(api, cycle, dir) {
    // 在已排程範圍的末端改變速度：兩層相位在該時刻連續，已排定的音不重複
    const t = api.state.started ? api.horizon : 0;
    this.clock.change(t, cycle, dir);
    api.status(`速度差：大約每 ${cycle} 秒一次完整的分離與聚合（${dir > 0 ? '朱紅層追上鈷藍層' : '朱紅層逐漸落後'}）。`);
    api.invalidate();
  },
  pos(layer, n) {
    // 每個音在自己波場的固定位置推出漣漪：音高決定沿波前的位置
    const midi = PATTERN[((n % NOTES) + NOTES) % NOTES], s = (midi - 68) / 7;
    return layer === 'A' ? [-0.25 + s * -0.35 * 0.42, -0.12 + s * 0.35 * 0.9] : [0.3 + s * 0.3, 0.16 - s * 0.25];
  },
  schedule(from, to, api) {
    const e = api.engine, au = api.audible;
    for (const nt of this.clock.notes(from, to)) {
      const midi = PATTERN[((nt.n % NOTES) + NOTES) % NOTES], at = api.at(nt.t);
      if (au) {
        if (nt.layer === 'A') {
          e.mallet(at, midi - 12, 0.55 + (nt.n % NOTES === 0 ? 0.12 : 0), { decay: 1.6, gain: 0.24, pan: -0.42, wet: 0.35 });
          if (nt.n % NOTES === 0) e.pad(at, 38, PA * 0.95, 0.18 + 0.32 * this.clock.sync(nt.t), { a: 1.8, r: 2, bright: 0.1, wave: 'sine', wave2: 'triangle', mix: 0.4, wet: 0.5 });
        } else e.bell(at, midi + 12, 0.42, { decay: 2.2, ratio: 2.76, index: 0.9, gain: 0.1, pan: 0.42, wet: 0.45 });
      }
      api.emit({ t: nt.t, type: 'note', layer: nt.layer, n: nt.n });
    }
  },
  onEvent(ev) {
    const list = ev.layer === 'A' ? this.rA : this.rB;
    list.push({ p: this.pos(ev.layer, ev.n), t: ev.t }); if (list.length > 8) list.shift();
  },
  update(t, dt, api) {
    this.t = t;
    const d = this.clock.delta(t), frac = ((d % 1) + 1.5) % 1 - 0.5;
    api.readout(`相位差 ${Math.round(frac * 360)}° · 同步 ${Math.round(this.clock.sync(t) * 100)}%\n每 ${this.clock.cycle} 秒一輪潮汐`);
  },
  render(api) {
    const g = this.g, t = this.t, c = this.clock;
    const pack = list => { const a = new Float32Array(24); list.forEach((r, i) => a.set([r.p[0], r.p[1], api.reduced ? 9 : t - r.t], i * 3)); for (let i = list.length; i < 8; i++) a[i * 3 + 2] = -1; return a; };
    g.f('uRes', this.w * this.dpr, this.h * this.dpr);
    g.f('uPA', c.phaseA(t)); g.f('uPB', c.phaseB(t)); g.f('uSync', c.sync(t)); g.f('uT', api.reduced ? 0 : t);
    g.v3('uRA', pack(this.rA));
    g.v3('uRB', pack(this.rB));
    g.draw();
  },
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = Math.min(dpr, 1.5); this.g.size(w, h, this.dpr); },
  reset() { this.clock = new PhaseClock(this.clock.cycle, this.clock.dir); this.rA = []; this.rB = []; this.t = 0; },
  dispose() { this.g.dispose(); }
};

if (typeof window !== 'undefined' && document.getElementById('art')) runWork(work);
