// One AudioContext for test2 music and test1's clock/interactive controls.
import { SoundEngine as OriginalEngine, estimatePitch } from './original-audio.js';
import { Engine } from '../../test2/js/core/audio.js';
export { estimatePitch };

export class SoundEngine extends OriginalEngine {
  constructor(seed) {
    super(seed);
    this.music = new Engine({ reverb: 3.4, reverbTone: 0.35, volume: this.volume });
  }
  async init() {
    await this.music.ensure();
    if (!this.ctx) {
      this.ctx = this.music.ctx;
      this.music.newSession(0.08);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.music.bus);
      this.analyser = this.music.analyser;
      this.noiseBuffer = this.music.noiseBuf;
      this.origin = this.ctx.currentTime + 0.08;
    }
    this.gain();
  }
  gain() {
    this.music.setVolume(this.volume);
    this.music.setMuted(this.muted);
  }
  voice(event, when) {
    if (event.voice !== 'architecture-pad' && event.voice !== 'architecture-bell') {
      super.voice(event, when);
      return;
    }
    const midi = event.notes[0];
    if (event.voice === 'architecture-pad') this.music.pad(when, midi, event.d, event.v, event.options);
    else this.music.bell(when, midi, event.v, event.options);
    this.notes++;
    this.maxNodes = Math.max(this.maxNodes, this.music.sources.size + this.nodes.size);
    this.log.push({ score: event.t, when, late: Math.max(0, this.ctx.currentTime - when), voice: event.voice });
    if (this.log.length > 128) this.log.shift();
  }
  stopNodes() {
    super.stopNodes();
    this.music.stopAll();
  }
}
