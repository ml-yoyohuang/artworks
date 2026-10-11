const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// A visual pace from unfurled onset intervals, not the global 75–170 BPM display.
export class GrowthRhythm {
  constructor(){this.reset();}
  reset(){this.time=0;this.hits=[];this.bpm=70;this.rate=.27;this.targetBpm=70;}
  update(f,dt){
    if(dt<=0)return 0;
    this.time+=dt;
    if(f.onset&&(this.hits.length===0||this.time-this.hits.at(-1)>.24))this.hits.push(this.time);
    this.hits=this.hits.filter(t=>this.time-t<=9).slice(-16);
    const gaps=this.hits.slice(1).map((t,i)=>t-this.hits[i]).filter(g=>g>=.28&&g<=3);
    if(gaps.length>=3){
      gaps.sort((a,b)=>a-b);const mid=Math.floor(gaps.length/2);
      const median=gaps.length%2?gaps[mid]:(gaps[mid-1]+gaps[mid])/2;
      this.targetBpm=clamp(60/median,40,180);
    }else this.targetBpm=70;
    // Sustained passages with few attacks grow gently, even if the audio is loud.
    const since=this.hits.length?this.time-this.hits.at(-1):this.time;
    if(since>2.5)this.targetBpm=Math.min(this.targetBpm,55);
    this.bpm+=(this.targetBpm-this.bpm)*(1-Math.exp(-dt/2));
    const target=.22*Math.pow(this.bpm/60,1.35)*(.95+.1*clamp(f.energy||0,0,1));
    this.rate+=(target-this.rate)*(1-Math.exp(-dt/1));
    return f.quiet||f.rms<.0015?0:this.rate;
  }
}
