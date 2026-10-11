// Relative pauses for mastered music: use raw RMS, independent of visual gain.
// This detector belongs only to the cuts; other works retain absolute silence.
export class MusicDipDetector {
  constructor() { this.reset(); }
  reset() {
    this.time=0;this.level=0;this.mean=0;this.peak=0;this.audible=0;
    this.lowAge=0;this.recoveryAge=0;this.active=false;this.started=0;
    this.lastStart=-Infinity;this.count=0;this.threshold=0;
  }
  update(f,dt) {
    if(dt<=0)return {rest:this.active,opened:false,closed:false};
    this.time+=dt;
    const rms=Math.max(0,f.rms||0),audible=rms>.0015;
    if(!this.mean&&audible)this.level=this.mean=this.peak=rms;
    this.level+=(rms-this.level)*(1-Math.exp(-dt/.08));
    this.mean+=(this.level-this.mean)*(1-Math.exp(-dt/3));
    this.peak=Math.max(this.level,this.peak*Math.exp(-dt/4));
    if(audible)this.audible+=dt;
    this.threshold=Math.max(this.mean*.88,this.peak*.78);
    let opened=false,closed=false;
    if(this.active) {
      const recovered=audible&&this.level>Math.max(this.mean*.96,this.peak*.85);
      this.recoveryAge=recovered?this.recoveryAge+dt:0;
      if(this.time-this.started>=1.8&&this.recoveryAge>=.18) {
        this.active=false;this.lowAge=0;this.recoveryAge=0;closed=true;
      }
    } else {
      this.lowAge=this.level<this.threshold||f.quiet?this.lowAge+dt:0;
      // No openings during an empty intro, nor repeated openings on steady tones.
      if(this.audible>=.6&&this.lowAge>=.16&&this.time-this.lastStart>=3) {
        this.active=true;this.started=this.lastStart=this.time;this.count++;
        this.recoveryAge=0;opened=true;
      }
    }
    return {rest:this.active,opened,closed};
  }
}
