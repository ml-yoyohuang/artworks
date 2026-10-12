// 麥克風：只在觀眾明確按下後才請求；本機分析、不錄音、不上傳、不接到喇叭。
export class Microphone {
  constructor(ctx) { this.ctx = ctx; }
  static get supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  async start() {
    if (!window.isSecureContext) throw Object.assign(new Error('insecure'), { name: 'InsecureContext' });
    if (!Microphone.supported) throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' });
    if (!this.ctx) throw Object.assign(new Error('no audio'), { name: 'NoAudio' });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.an.smoothingTimeConstant = 0;
    this.src.connect(this.an); // 刻意不連到 destination，避免回授
    this.td = new Float32Array(this.an.fftSize); this.fd = new Float32Array(this.an.frequencyBinCount);
    this.active = true;
  }

  features() {
    if (!this.active) return { rms: 0, centroid: 0, flatness: 0, pitch: null, clarity: 0 };
    const an = this.an, td = this.td, fd = this.fd, sr = this.ctx.sampleRate;
    an.getFloatTimeDomainData(td); an.getFloatFrequencyData(fd);
    let s = 0; for (const v of td) s += v * v;
    const rms = Math.sqrt(s / td.length);
    // 頻譜重心與平坦度（幾何平均／算術平均），限 80 Hz–8 kHz
    let num = 0, den = 0, logSum = 0, lin = 0, n = 0;
    const binHz = sr / an.fftSize;
    for (let i = Math.ceil(80 / binHz); i < Math.min(fd.length, 8000 / binHz); i++) {
      const p = Math.pow(10, fd[i] / 10) + 1e-12;
      num += p * i * binHz; den += p; logSum += Math.log(p); lin += p; n++;
    }
    const centroid = den > 0 ? num / den : 0;
    const flatness = n ? Math.exp(logSum / n) / (lin / n) : 0;
    const { pitch, clarity } = rms > 0.01 ? Microphone.pitch(td, sr) : { pitch: null, clarity: 0 };
    return { rms, centroid, flatness, pitch, clarity };
  }

  // 正規化自相關的音高估計；信度不足回傳 null。
  static pitch(buf, sr, lo = 70, hi = 700) {
    const N = 1024, minLag = Math.floor(sr / hi), maxLag = Math.min(Math.floor(sr / lo), buf.length - N - 1);
    let best = -1, bestLag = 0, prev = 0, rising = false;
    const r = lag => { let a = 0, e1 = 0, e2 = 0; for (let i = 0; i < N; i++) { const x = buf[i], y = buf[i + lag]; a += x * y; e1 += x * x; e2 += y * y; } return a / Math.sqrt(e1 * e2 + 1e-12); };
    const vals = new Float32Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag; lag++) { vals[lag] = r(lag); }
    let max = 0; for (let lag = minLag; lag <= maxLag; lag++) max = Math.max(max, vals[lag]);
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      const v = vals[lag];
      if (v > prev) rising = true;
      if (rising && v < prev && prev > 0.88 * max) { best = prev; bestLag = lag - 1; break; }
      prev = v;
    }
    if (best < 0.82 || !bestLag) return { pitch: null, clarity: Math.max(0, best) };
    const a = vals[bestLag - 1], b = vals[bestLag], c = vals[bestLag + 1];
    const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
    const f = sr / (bestLag + shift);
    return { pitch: 69 + 12 * Math.log2(f / 440), clarity: best };
  }

  stop() {
    this.active = false;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    try { this.src && this.src.disconnect(); } catch (e) { /* 已斷開 */ }
    this.stream = null;
  }

  static message(e) {
    const n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return '沒有取得麥克風權限。作品繼續使用示範聲音，隨時可以再試一次。';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return '找不到可用的麥克風。作品繼續使用示範聲音。';
    if (n === 'InsecureContext') return '麥克風只能在安全連線（https 或 localhost）使用。作品繼續使用示範聲音。';
    if (n === 'NotSupportedError') return '這個瀏覽器不支援麥克風輸入。作品繼續使用示範聲音。';
    if (n === 'NotReadableError') return '麥克風正被其他程式使用。作品繼續使用示範聲音。';
    if (n === 'NoAudio') return '目前無法啟動聲音系統，因此無法使用麥克風。';
    return '無法啟用麥克風。作品繼續使用示範聲音。';
  }
}
