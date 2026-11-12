/**
 * The resource field, rendered as a watercolour landscape (WebGL, one fragment shader).
 * Everything comes from simulation data:
 *   water (blue)        resource present, darker where fuller; edge at ~30 % of cell capacity
 *   sediment (peach)    fertile ground where the resource has been grazed down
 *   paper (cream)       barren ground
 *   motes               food particles; their density is the local resource level
 * The domain warp only bends the shorelines a little; it adds no structure of its own.
 */
import type { Simulation } from '../sim';
import type { Camera } from './camera';

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FS = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uWorld, uCells, uView;
uniform vec3 uCam;
uniform float uTime;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
}
vec3 tap(vec2 uv){ return texture2D(uTex, uv).rgb; }
vec3 field(vec2 w){
  // 5x5 tent-weighted blur over the cell grid: hides the grid, keeps the data
  vec2 uv = w / uWorld, d = .75 / uCells;
  vec3 s = vec3(0.); float tw = 0.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    float wt = (3. - abs(float(i))) * (3. - abs(float(j)));
    s += tap(uv + vec2(float(i), float(j)) * d) * wt; tw += wt;
  }
  return s / tw;
}
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  vec2 w = uCam.xy + (frag - uView * .5) / uCam.z;
  float px = 1. / uCam.z;
  vec3 paper = vec3(.969, .941, .894);

  vec2 q = w + (vec2(noise(w * .03 + uTime * .015), noise(w * .03 + 17.3 - uTime * .015)) - .5) * 16.
         + (vec2(noise(w * .13), noise(w * .13 + 5.1)) - .5) * 4.;
  vec3 f = field(q);
  float r = f.r, fert = f.g;
  float blendB = f.b / max(.001, f.r + f.b);

  float sed = smoothstep(.35, .8, fert);
  vec3 peach = mix(vec3(.976, .874, .768), vec3(.953, .757, .588), smoothstep(.65, 1., fert) * .8);
  vec3 col = mix(paper, peach, sed * .9);
  col = mix(col, col * vec3(1.02, .99, .97), smoothstep(.5, .9, noise(w * .05)) * sed);

  float edge = .3;
  float water = smoothstep(edge - .015, edge + .015, r);
  float halo = smoothstep(edge - .11, edge - .02, r) * (1. - water);
  col = mix(col, vec3(.95, .975, .965), halo * .85);
  vec3 wc = mix(vec3(.690, .878, .914), vec3(.420, .757, .855), smoothstep(.42, .95, r));
  wc = mix(wc, vec3(.53, .80, .88), (1. - smoothstep(edge, edge + .05, r)) * .45);
  wc *= 1. + (noise(w * .09 + 3.) - .5) * .06;
  wc = mix(wc, vec3(.57, .80, .71), blendB * .5);
  col = mix(col, wc, water);
  col = mix(col, vec3(.80,.88,.78), smoothstep(.3,.8,f.b) * (1. - water) * .4);

  vec2 g = w / 6., id = floor(g);
  vec2 c = id + .2 + .6 * vec2(hash(id), hash(id + 3.1));
  c += .12 * vec2(sin(uTime * .7 + hash(id) * 6.28), cos(uTime * .6 + hash(id + 1.) * 6.28));
  float d = length(g - c) * 6.;
  vec3 localData = tap((id * 6. + 3.) / uWorld);
  float local = max(localData.r, localData.b);
  float show = step(hash(id + 7.7), local * .5);
  float rad = .3 + hash(id + 9.) * .4;
  float dotm = (1. - smoothstep(rad - px, rad + px, d)) * show;
  vec3 mc = hash(id + 5.) < .55 ? vec3(.94, .57, .29) : vec3(.35, .64, .80);
  col = mix(col, mc, dotm * .6);

  vec2 o = max(-w, w - uWorld);
  float out_ = max(o.x, o.y);
  col = mix(col, paper, smoothstep(-24., 4., out_));
  col += (hash(floor(gl_FragCoord.xy)) - .5) * .028;
  gl_FragColor = vec4(col, 1.);
}`;

export class Field {
  private gl: WebGLRenderingContext | null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private prog!: WebGLProgram;
  private tex!: WebGLTexture;
  private data = new Uint8Array(0);
  private u: Record<string, WebGLUniformLocation | null> = {};
  private cols = 0;
  private rows = 0;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackImage: ImageData | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!this.gl) { this.ctx2d = canvas.getContext('2d'); return; }
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    this.prog = gl.createProgram()!;
    gl.attachShader(this.prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(this.prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(this.prog);
    gl.useProgram(this.prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uTex', 'uWorld', 'uCells', 'uView', 'uCam', 'uTime']) this.u[n] = gl.getUniformLocation(this.prog, n);
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u.uTex, 0);
  }

  render(sim: Simulation, cam: Camera, time: number, dpr: number): void {
    // The field is soft by nature: render it at CSS resolution and let the browser upscale.
    const fs = Math.min(1, dpr);
    const w = Math.round(cam.vw * fs), h = Math.round(cam.vh * fs);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    const n = sim.cols * sim.rows;
    if (this.data.length !== n * 4) this.data = new Uint8Array(n * 4);
    const cap = sim.env.cellCapacity, d = this.data;
    for (let i = 0; i < n; i++) {
      d[i * 4] = cap > 0 ? Math.min(255, (sim.resource[i] / cap) * 255) : 0;
      d[i * 4 + 1] = sim.fertility[i] * 255;
      d[i * 4 + 2] = sim.envB.cellCapacity > 0 ? Math.min(255, sim.resourceB[i] / sim.envB.cellCapacity * 255) : 0;
      d[i * 4 + 3] = 255;
    }
    if (!this.gl) return this.fallback(sim, cam, fs);
    const gl = this.gl;
    gl.viewport(0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (this.cols !== sim.cols || this.rows !== sim.rows) {
      this.cols = sim.cols;
      this.rows = sim.rows;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sim.cols, sim.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sim.cols, sim.rows, gl.RGBA, gl.UNSIGNED_BYTE, d);
    }
    gl.uniform2f(this.u.uWorld, sim.cfg.width, sim.cfg.height);
    gl.uniform2f(this.u.uCells, sim.cols, sim.rows);
    gl.uniform2f(this.u.uView, w, h);
    gl.uniform3f(this.u.uCam, cam.x, cam.y, cam.s * fs);
    gl.uniform1f(this.u.uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Plain 2D rendition for browsers without WebGL. */
  private fallback(sim: Simulation, cam: Camera, dpr: number): void {
    const ctx = this.ctx2d!;
    if (!this.fallbackImage || this.fallbackImage.width !== sim.cols || this.fallbackImage.height !== sim.rows) {
      this.fallbackImage = new ImageData(sim.cols, sim.rows);
      this.fallbackCanvas = document.createElement('canvas');
      this.fallbackCanvas.width = sim.cols;
      this.fallbackCanvas.height = sim.rows;
    }
    const img = this.fallbackImage;
    for (let i = 0; i < sim.cols * sim.rows; i++) {
      const b = this.data[i * 4 + 2] / 255, a = this.data[i * 4] / 255;
      const r = Math.max(a, b), f = this.data[i * 4 + 1] / 255, wtr = r > 0.3 ? 1 : 0;
      img.data[i * 4] = wtr ? 150 : 247 - 6 * f;
      img.data[i * 4 + 1] = wtr ? 213 : 240 - 40 * f;
      img.data[i * 4 + 2] = wtr ? (b > a ? 190 : 228) : 228 - 70 * f;
      img.data[i * 4 + 3] = 255;
    }
    const tmp = this.fallbackCanvas!;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    const k = cam.s * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f7f0e4';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, (dpr * cam.vw) / 2 - cam.x * k, (dpr * cam.vh) / 2 - cam.y * k);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, sim.cfg.width, sim.cfg.height);
  }
}
