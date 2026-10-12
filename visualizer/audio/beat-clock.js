// Beat phase without bar grouping: works equally for 3/4 and 4/4.
export class BeatClock {
  constructor(){this.reset();}
  reset(){this.period=60/110;this.last=-Infinity;this.next=null;this.count=0;}
  update(t,f){
    if(f.quiet)return false;
    const trusted=f.confidence>=.55;
    if(trusted){const target=60/Math.max(40,Math.min(200,f.tempo));this.period+=(target-this.period)*.08;}
    let beat=false;
    if(f.onset&&t-this.last>=this.period*.6){
      // Lock to a nearby audible attack; reject off-grid subdivisions once trusted.
      if(!trusted||this.next===null||Math.abs(t-this.next)<this.period*.25){beat=true;this.next=t+this.period;}
    }
    if(!beat&&trusted&&this.next!==null&&t>=this.next){beat=true;this.next+=this.period;if(this.next<=t)this.next=t+this.period;}
    if(beat){this.last=t;this.count++;}
    return beat;
  }
}
