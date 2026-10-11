import {emptyFeatures} from '../audio/features.js';
export class PresetHost {
  constructor(container,player,onChange) {
    this.container=container;this.player=player;this.onChange=onChange;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.token=0;this.current=null;this.preset=null;this.last=performance.now();this.lastRender=0;this.dirty=true;this.lastSong=player.audio.currentTime;this.frames=0;this.errors=[];
    this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
    this.motionQuery.addEventListener('change',e=>{this.reduced=e.matches;this.dirty=true;});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);
  }
  async select(preset) {
    const token=++this.token;
    try {this.current?.dispose();} catch(e) {console.warn("Scene cleanup",e);} this.current=null;this.container.replaceChildren();
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',preset.name+'，依目前歌曲的頻段與起音變化');canvas.tabIndex=0;
    this.container.appendChild(canvas);
    const adapters=['sound','sound2','sound3','sound4'];
    try {
      const mod=await import('../adapters/'+adapters[preset.series-1]+'.js');if(token!==this.token)return;
      let work;
      try {work=await mod.create(preset,canvas,this);}catch(error){if(token!==this.token)return;throw error;}
      if(token!==this.token){work.dispose();canvas.remove();return;}
      this.canvas=canvas;this.current=work;this.preset=preset;this.resize();work.render();
      this.onChange(preset,work);this.dirty=true;
    } catch(error) {
      if(token!==this.token)return;
      this.errors.push({id:preset.id,error:String(error)});console.error('[visualizer]',preset.id,error);
      this.container.replaceChildren();
      // A labelled, live Canvas version keeps the music running on devices without WebGL.
      if(preset.series===4&&preset.index!==1) {
        const fallbackCanvas=document.createElement('canvas');this.container.appendChild(fallbackCanvas);
        const mod=await import('../adapters/sound3.js');const work=await mod.create({...preset,series:3},fallbackCanvas,this);
        if(token!==this.token){work.dispose();return;}
        this.canvas=fallbackCanvas;this.current=work;this.preset=preset;this.resize();work.render();this.onChange(preset,work,'目前使用 Canvas 替代視覺');this.dirty=true;
      } else throw error;
    }
  }
  resize(){if(!this.current)return;const r=this.container.getBoundingClientRect();this.current.resize(r.width,r.height,Math.min(devicePixelRatio||1,1.5));this.dirty=true;}
  reset(){this.current?.reset();this.lastSong=this.player.audio.currentTime;this.dirty=true;}
  tick(now,settings) {
    const dt=Math.min(.065,Math.max(0,(now-this.last)/1000));this.last=now;
    const songNow=this.player.audio.currentTime,audioDT=Math.min(.065,Math.max(0,songNow-this.lastSong));this.lastSong=songNow;
    let f=emptyFeatures();
    if(this.player.playing) {
      f=this.player.sample(dt,settings.sensitivity,settings.smoothing);
      if(settings.tempo)f.tempo=settings.tempo;
      this.current?.update(this.player.audio.currentTime,audioDT,f);this.dirty=true;
    }
    if(this.current&&this.dirty&&now-this.lastRender>1000/(this.reduced?15:45)) {
      this.current.render();this.frames++;this.lastRender=now;this.dirty=false;
    }
    return f;
  }
  dispose(){this.token++;this.current?.dispose();this.observer.disconnect();}
}
