import type { Simulation } from '../sim';

/** An artistic mapping, completely separate from the scientific step and RNG. */
export function soundState(sim:Simulation) {
  const pop=sim.orgs.length;
  let speed=0;const types=[0,0,0];
  for(const o of sim.orgs) {speed+=o.speed;types[o.type]++;}
  let stock=0,capacity=0;
  for(let i=0;i<sim.resource.length;i++) {stock+=sim.resource[i]+sim.resourceB[i];capacity+=sim.fertility[i]*sim.env.cellCapacity+sim.fertilityB[i]*sim.envB.cellCapacity;}
  return {density:Math.min(1,pop/1800),movement:pop?Math.min(1,speed/pop/2):0,food:capacity?Math.max(0,Math.min(1,stock/capacity)):0,mix:types.map(n=>pop?n/pop:0)};
}
export class ChamberSound {
  private context?:AudioContext;
  private output?:GainNode;
  private filter?:BiquadFilterNode;
  private voices:{osc:OscillatorNode;gain:GainNode}[]=[];
  private enabled=false;
  private volume=.35;
  private blocked=true;
  get active() {return this.enabled;}
  get state() {return this.context?.state ?? 'off';}
  async setEnabled(on:boolean):Promise<void> {
    if(on && !this.context) {
      const ctx=this.context=new AudioContext();
      const output=this.output=ctx.createGain();output.gain.value=0;
      const filter=this.filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;filter.Q.value=.5;
      filter.connect(output);output.connect(ctx.destination);
      [1,1.5,2,2.5].forEach(ratio=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=130.8128*ratio;gain.gain.value=0;
        osc.connect(gain);gain.connect(filter);osc.start();this.voices.push({osc,gain});
      });
    }
    this.enabled=on;
    if(on) {try {await this.context!.resume();this.blocked=false;} catch(error) {this.enabled=false;throw error;} }
    else {this.silence();await this.context?.suspend();}
  }
  setVolume(value:number) {this.volume=Math.max(0,Math.min(1,value));if(!this.volume) this.silence();}
  private silence() {if(this.output&&this.context) this.output.gain.setTargetAtTime(0,this.context.currentTime,.15);}
  async suspend() {this.blocked=true;this.silence();await this.context?.suspend();}
  update(sim:Simulation,paused:boolean) {
    const ctx=this.context;if(!ctx||!this.enabled)return;
    if(paused||!sim.orgs.length||document.hidden) {if(!this.blocked){this.blocked=true;void this.suspend().catch(()=>{});}return;}
    if(this.blocked||ctx.state==='suspended') {this.blocked=false;void ctx.resume().catch(()=>{this.blocked=true;});}
    const s=soundState(sim),now=ctx.currentTime;
    // A quiet, fixed harmonic family. Food opens the filter; population and type share mix voices.
    this.output!.gain.setTargetAtTime(this.volume*.075,now,2);
    this.filter!.frequency.setTargetAtTime(280+s.food*500+s.movement*100,now,4);
    this.voices.forEach((v,i)=>{
      const weight=i===0?.2+s.density*.1:(s.mix[i-1]??0)*.16;
      v.gain.gain.setTargetAtTime(weight,now,4);
      v.osc.detune.setTargetAtTime(i===0?0:Math.sin(now*.018+i)*2.5,now,3);
    });
  }
  async dispose() {this.enabled=false;this.voices.forEach(v=>{v.osc.stop();v.osc.disconnect();v.gain.disconnect();});this.voices=[];await this.context?.close();this.context=undefined;}
}
