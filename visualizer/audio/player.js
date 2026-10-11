import {Features,emptyFeatures} from './features.js';
export class Player extends EventTarget {
  constructor() {
    super();this.audio=new Audio();this.audio.preload='metadata';this.audio.crossOrigin='anonymous';
    this.audio.volume=1;this.volume=.65;this.muted=false;this.title='尚未選擇音樂';this.url=null;this.loadId=0;
    for(const name of ['play','pause','ended','loadedmetadata','durationchange','seeking','seeked','waiting','playing','error'])this.audio.addEventListener(name,()=>{
      if(name==='seeked'||name==='ended')this.features?.reset();
      if(name==='playing'||name==='seeked'){this.pendingReset=true;this.warmUntil=(this.ctx?.currentTime||0)+.08;}
      this.dispatchEvent(new Event(name));
    });
  }
  async ensure() {
    if(!this.ctx) {
      this.ctx=new AudioContext();this.source=this.ctx.createMediaElementSource(this.audio);
      this.gain=this.ctx.createGain();this.gain.gain.value=this.muted?0:this.volume;
      this.source.connect(this.gain);this.gain.connect(this.ctx.destination);
      this.features=new Features(this.ctx,this.source);
    }
    await this.ctx.resume();
  }
  load(src,title,local=false) {
    this.audio.pause();if(this.url)URL.revokeObjectURL(this.url);this.url=local?src:null;
    this.title=title;this.audio.src=src;this.audio.load();this.loadId++;
    this.features?.reset();this.pendingReset=true;this.warmUntil=Infinity;this.dispatchEvent(new Event('trackchange'));
  }
  async play() {if(!this.audio.src)throw new Error('請先選擇一首音樂');await this.ensure();await this.audio.play();}
  pause() {this.audio.pause();}
  setVolume(v) {this.volume=v;this.gain?.gain.setTargetAtTime(this.muted?0:v,this.ctx.currentTime,.015);}
  setMuted(v) {this.muted=v;this.setVolume(this.volume);}
  get playing() {return !this.audio.paused&&!this.audio.ended&&!this.audio.seeking;}
  sample(dt,sensitivity,smoothing) {
    if(!this.playing||!this.features)return emptyFeatures();
    if(this.pendingReset){if(this.ctx.currentTime<this.warmUntil)return emptyFeatures();this.features.reset();this.pendingReset=false;}
    return this.features.sample(this.audio.currentTime,dt,sensitivity,smoothing);
  }
  dispose() {this.pause();this.features?.dispose();this.source?.disconnect();this.gain?.disconnect();if(this.url)URL.revokeObjectURL(this.url);void this.ctx?.close();}
}
