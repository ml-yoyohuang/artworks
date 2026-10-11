const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};
// 03 休止符《沉默把空間切開》
// 聲音持續時表面繃緊；樂曲中的休止才會切開表面。開口寬度隨休止持續時間成長。
import { runWork, radioGroup } from '../core/shell.js';
import { createGL, GLSL_NOISE } from '../core/gl.js';
import { clamp, approach, mtof } from '../core/rng.js';
import { timeline, velAt, PhraseMemory, RestDetector, makeCut, openAt, scarOf } from '../models/cuts.js';
import { Microphone } from '../core/mic.js';

const MAXCUTS = 9;
const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime, uTension, uShiver; uniform vec4 uA[9]; uniform vec4 uB[9]; uniform int uN;
${GLSL_NOISE}
void main(){
  float m = min(uRes.x, uRes.y); vec2 uv = (gl_FragCoord.xy - .5*uRes)/m; float px = 1.2/m;
  vec2 L = normalize(vec2(-.55,.8));
  float f1 = fbm(uv*8.+3.1);
  float fib = fbm(vec2(uv.x*150., uv.y*24.) + f1*3.);
  float grain = hash(floor(gl_FragCoord.xy*.5));
  float s1 = sin((uv.x*.55 + uv.y)*170. + f1*18. + uTime*.4)*.5+.5;
  float sheen = pow(s1, 10.) * (uTension*.7 + uShiver*.5) * (.4 + .6*fbm(uv*2.5 + uTime*.03));
  vec3 col = vec3(.035,.033,.037) + vec3(.03,.028,.03)*fib + .012*grain;
  col *= .72 + .55*smoothstep(1.3, -.3, length(uv - vec2(-.6,.5)));
  col += vec3(.085,.08,.09)*sheen;
  float shadow = 0.;
  for (int i = 0; i < 9; i++) {
    if (i >= uN) break;
    vec4 A = uA[i], B = uB[i];
    vec2 d = uv - A.xy; float ca = cos(A.z), sa = sin(A.z);
    vec2 q = vec2(ca*d.x + sa*d.y, -sa*d.x + ca*d.y);
    float hl = A.w, s = q.x/hl, open = B.x, depth = B.y, bow = B.z, heal = B.w;
    if (abs(s) >= 1.06) continue;
    q.y -= bow*hl*(1. - s*s);
    float w = open*pow(max(0., 1. - s*s), .85);
    float jag = (noise(vec2(q.x*120., float(i)*13.)) - .5)*.0022*smoothstep(.0, .01, open);
    float ad = abs(q.y + jag);
    vec2 Ll = vec2(ca*L.x + sa*L.y, -sa*L.x + ca*L.y);
    float far = step(0., -q.y*Ll.y);          // 背向光源的那一側內壁會被照亮
    float o = smoothstep(.002, .02, open)*(1. - heal);
    float inside = 1. - smoothstep(w - px, w + px, ad);
    if (inside > 0.) {
      float k = ad/max(w, 1e-5);
      float core = smoothstep(w - .0065 - px, w - .0065 + px, ad);
      vec3 paper = mix(vec3(.42,.4,.39), vec3(.96,.94,.9), far);
      vec3 wall = mix(vec3(.012,.008,.009), mix(vec3(.07,.055,.055), vec3(.36,.33,.31), far), pow(k, 1.6));
      float red = depth*smoothstep(.4, .0, k)*smoothstep(.006, .04, open)*.85;
      vec3 rc = vec3(.62,.03,.06)*(.55 + .45*fbm(q*vec2(30.,90.) + uTime*.05));
      vec3 inner = mix(wall, rc, red);
      inner *= mix(1., .45, (1. - far)*smoothstep(.2, 1., k));
      col = mix(col, mix(inner, paper, core), inside*(1. - heal*.92));
    }
    float hair = (1. - smoothstep(0., px*1.4, ad))*(1. - step(px*1.6, w))*smoothstep(1., .82, abs(s));
    col = mix(col, mix(vec3(.82,.79,.75), vec3(.62,.07,.08), depth*.7), hair*.55*(1. - heal));
    float lip = (1. - smoothstep(0., .016 + w*.35, ad - w))*step(w, ad)*smoothstep(1., .7, abs(s));
    col += vec3(.17,.16,.15)*lip*(1. - far)*o;
    shadow += lip*far*o*.7;
  }
  col *= 1. - clamp(shadow, 0., .8)*.65;
  col *= smoothstep(1.55, .25, length(uv*vec2(.78, 1.)));
  gl_FragColor = vec4(col, 1.);
}`;

const work = {
  engine: { reverb: 1.1, reverbTone: 0.4, lookahead: 0.2 },
  space: 1,
  init(api) {
    this.g = createGL(api.canvas, FRAG);
    this.mem = new PhraseMemory();
    this.cuts = []; this.active = null; this.tension = 0; this.shiver = 0; this.seq = 0;
    this.offset = 0; this.tl = timeline(this.space);
    this.mode = 'score';
    radioGroup('[data-space]', v => {
      this.space = Number(v);
      const t = api.state.started ? api.soonest(0.05) : 0;
      // 從下一段聲音開始採用新的留白，現有的切口保留
      this.offset = t; this.tl = timeline(this.space);
      if (api.state.started) { this.releaseAll(api, t); api.rewindTo(t); }
      api.status(`留白：${{ 0.6: '少', 1: '中', 1.6: '多' }[v]}——休止的長度改變，切口的開合也跟著改變。`);
    });
    this.micBtn = document.getElementById('mic');
    this.micBtn.addEventListener('click', () => this.toggleMic(api));
    // 播放前的構圖：幾道舊疤與一道微開的縫，示意作品的語彙（不代表正在分析聲音）
    const seeds = [{ energy: 0.9, dur: 4, reg: 0.2 }, { energy: 0.35, dur: 1.5, reg: 0.85 }, { energy: 0.6, dur: 2.5, reg: 0.5 }];
    seeds.forEach((st, i) => { const c = makeCut(st, this.cuts, `pre${i}`, 1.6); c.open = c.maxOpen * [0.55, 0.06, 0.18][i]; c.heal = 0; c.pre = true; this.cuts.push(c); });
  },

  onStart(api) { this.cuts.forEach(c => { if (c.pre) c.healing = -4.5; }); },

  releaseAll(api, t) { (this.held || []).forEach(h => h && h.release(api.at(t), 0.03)); this.held = []; },

  // 擦弦群：鋸齒波 + 震音 LFO + 帶通，力度決定亮度與音量；結束時乾脆地停下。
  strings(api, at, p, dur) {
    const e = api.engine, ctx = e.ctx;
    if (!e.canPlay(at)) return;
    const base = p.reg < 0.33 ? 38 : p.reg < 0.66 ? 52 : 67;
    const cl = p.v1 > 0.7 ? [0, 1, 6, 7] : p.v1 > 0.45 ? [0, 1, 5] : [0, 7, 14];
    const out = ctx.createGain(); out.gain.value = 0;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 9 + p.dens * 0.4; lg.gain.value = 0.35;
    const trem = ctx.createGain(); trem.gain.value = 0.65; lfo.connect(lg); lg.connect(trem.gain);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(mtof(base) * (3 + p.v0 * 6), at); bp.frequency.linearRampToValueAtTime(mtof(base) * (3 + p.v1 * 8), at + dur);
    const nodes = [out, lfo, lg, trem, bp], oscs = [];
    cl.forEach((iv, k) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(base + iv); o.detune.value = (k - 1) * 6; o.connect(trem); nodes.push(o); oscs.push(o); });
    trem.connect(bp); bp.connect(out);
    const g = out.gain, v0 = 0.05 + p.v0 * 0.12, v1 = 0.05 + p.v1 * 0.12;
    g.setValueAtTime(0, at); g.linearRampToValueAtTime(v0, at + 0.035); g.linearRampToValueAtTime(v1, at + dur - 0.04); g.linearRampToValueAtTime(0, at + dur + 0.035);
    nodes.push(...e.out(out, { wet: 0.08, pan: (p.reg - 0.5) * 0.5 }));
    const end = at + dur + 0.08;
    lfo.start(at); oscs.forEach(o => { o.start(at); o.stop(end); });
    e.track(lfo, end, nodes);
    this.held.push(e.handle(g, [lfo, ...oscs], at, end));
  },

  schedule(from, to, api) {
    if (this.mode !== 'score') return;
    const e = api.engine, au = api.audible;
    this.held = (this.held || []).filter(h => h && h.end > (e.ctx ? e.ctx.currentTime : 0));
    for (const p of this.tl) {
      const ps = p.start + this.offset, pe = p.end + this.offset;
      if (ps >= to) break;
      if (p.restEnd + this.offset < from) continue;
      const P = { ...p, start: ps, end: pe };
      if (ps >= from && ps < to) {
        api.emit({ t: ps, type: 'sound', p: P });
        if (au) { this.strings(api, api.at(ps), p, p.dur); e.kick(api.at(ps), 0.35 + p.v0 * 0.5, { freq: 55, gain: 0.45 }); }
      }
      if (pe >= from && pe < to) api.emit({ t: pe, type: 'rest', p: P });
      // 脈衝：密度越高越急促；最後 0.1 秒不再有新脈衝，讓休止乾淨
      const step = 1 / p.dens;
      for (let k = Math.max(0, Math.ceil((from - ps) / step)); ; k++) {
        const t = ps + k * step; if (t >= to || t > pe - 0.1) break;
        const v = velAt(P, t);
        if (au) { e.noise(api.at(t), 0.03, v * 0.6, { freq: 900 + p.reg * 3000, q: 2, gain: 0.22, r: 0.05, pan: (k % 2 ? 0.3 : -0.3) }); if (k % 2 === 0) e.pluck(api.at(t), (p.reg < 0.33 ? 38 : 50) + (k % 4 === 0 ? 0 : 1), v * 0.5, { decay: 0.14, bright: 4, wet: 0.04 }); }
        api.emit({ t, type: 'pulse', v });
      }
    }
  },

  onEvent(ev, api) {
    if (ev.type === 'sound') this.soundStart(ev.t, ev.p.v0, api);
    else if (ev.type === 'rest') this.restStart(ev.t, ev.p.rest, api, { energy: (ev.p.v0 + ev.p.v1) / 2, dur: ev.p.dur, peak: Math.max(ev.p.v0, ev.p.v1), reg: ev.p.reg });
    else if (ev.type === 'pulse') this.shiver = Math.min(1, this.shiver + ev.v * 0.5);
  },

  soundStart(t, v, api) {
    if (this.active) { this.active.closeFrom = t; this.active.peakOpen = this.active.open; this.active = null; }
    this.mem.reset(); this.inSound = true; this.soundVel = v;
    api.readout('聲音・表面繃緊');
  },

  // 樂譜模式：前一段聲音的概況直接來自樂譜（與幀率無關）；麥克風模式：來自本機累積的音量記憶。
  restStart(t, restLen, api, known) {
    this.inSound = false;
    const st = known || this.mem.stats();
    if (st.dur < 0.15) return;
    const c = makeCut(st, this.cuts.filter(c => !c.dead), `${api.seed}:${this.seq++}`, this.aspect || 1.6);
    c.restStart = t; c.heal = 0; c.stats = st;
    this.cuts.push(c); this.active = c;
    // 超過上限時，最舊的切口開始癒合
    const live = this.cuts.filter(c => !c.healing);
    if (live.length > MAXCUTS - 2) live[0].healing = t;
    api.readout(`休止・前一段 ${st.dur.toFixed(1)} 秒，力度 ${Math.round(st.energy * 100)}`);
  },

  update(t, dt, api) {
    this.t = t;
    // 由樂譜（或麥克風）取得當下力度，作為張力與聲音記憶
    let level = 0, reg = 0.5;
    if (this.mode === 'score') {
      const st = t - this.offset;
      const p = this.tl.find(p => st >= p.start && st < p.restEnd);
      if (p && st < p.end) { level = velAt(p, st); reg = p.reg; }
    } else if (this.mic) {
      const f = this.mic.features();
      level = clamp(f.rms / 0.12); reg = clamp((f.centroid - 400) / 3000);
      const evn = this.detector.push(f.rms, dt);
      if (evn === 'sound-start') this.soundStart(t, level, api);
      if (evn === 'rest-start') this.restStart(t, 0, api);
      if (evn === 'rest-start-short') this.inSound = false;
    }
    if (this.inSound) this.mem.add(level, dt, reg);
    this.tension = approach(this.tension, this.inSound ? 0.35 + level * 0.65 : 0, dt, this.inSound ? 0.12 : 0.6);
    this.shiver = Math.max(0, this.shiver - dt * 3.5);
    for (const c of this.cuts) {
      if (c === this.active) c.open = openAt(c, t - c.restStart);
      else if (c.closeFrom != null) { const sc = scarOf(c); c.open = sc + (c.peakOpen - sc) * Math.exp(-(t - c.closeFrom) / 0.75); }
      if (c.healing != null) { c.heal = clamp((t - c.healing) / 6); if (c.heal >= 1) c.dead = true; }
    }
    this.cuts = this.cuts.filter(c => !c.dead).slice(-MAXCUTS);
  },

  idle() { return false; },

  render(api) {
    const g = this.g, A = new Float32Array(36), B = new Float32Array(36);
    this.cuts.forEach((c, i) => { A.set([c.x, c.y, c.angle, c.len], i * 4); B.set([c.open, c.depth, c.bow, c.heal || 0], i * 4); });
    g.f('uRes', this.w * this.dpr, this.h * this.dpr); g.f('uTime', api.reduced ? 0 : (this.t || 0)); g.f('uTension', this.tension); g.f('uShiver', api.reduced ? 0 : this.shiver);
    g.v4('uA', A); g.v4('uB', B); g.i('uN', this.cuts.length);
    g.draw();
  },

  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = Math.min(dpr, 1.5); this.aspect = w / h; this.g.size(w, h, this.dpr); },

  async toggleMic(api) {
    if (this.mode === 'mic') return this.stopMic(api, '已回到樂譜。');
    if (!api.state.started) await api.play();
    if (!api.state.playing) await api.play();
    this.micBtn.disabled = true;
    try {
      this.mic = new Microphone(api.engine.ctx);
      await this.mic.start();
      this.mode = 'mic'; this.detector = new RestDetector();
      this.releaseAll(api, api.soonest(0.02)); api.rewindTo(api.soonest(0.02));
      if (this.active) { this.active.closeFrom = this.t; this.active.peakOpen = this.active.open; this.active = null; }
      this.inSound = false;
      this.micBtn.setAttribute('aria-pressed', 'true'); this.micBtn.textContent = '回到樂譜';
      api.status('正在聆聽你的聲音（只在本機分析，不錄音、不上傳）。說一段話再停下來，停頓會切開表面。', 'sticky');
    } catch (e) {
      this.mic = null;
      api.status(Microphone.message(e), 'warn');
    }
    this.micBtn.disabled = false;
  },

  stopMic(api, msg) {
    if (this.mic) this.mic.stop(); this.mic = null;
    this.mode = 'score';
    this.micBtn.setAttribute('aria-pressed', 'false'); this.micBtn.textContent = '用我的聲音';
    const t = api.state.started ? api.soonest(0.05) : 0;
    this.offset = t; api.rewindTo(t);
    if (msg) api.status(msg);
  },

  onPlayState(playing, api) { if (!playing && this.mode === 'mic') this.stopMic(api, '暫停時已關閉麥克風。'); },

  reset(api) {
    if (this.mode === 'mic') this.stopMic(api);
    this.releaseAll(api, 0);
    this.offset = 0; this.active = null; this.inSound = false; this.mem.reset();
    this.cuts = []; // 重播：表面重新開始
    this.tension = 0;
  },
  dispose() { if (this.mic) this.mic.stop(); this.g.dispose(); }
};



export function createWork(){ return {...work}; }
