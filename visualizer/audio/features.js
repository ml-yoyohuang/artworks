const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b,v));
export class Features {
  constructor(context, source) {
    this.ctx=context; this.an=context.createAnalyser(); this.an.fftSize=2048;
    this.an.smoothingTimeConstant=0;
    this.right=context.createAnalyser();this.right.fftSize=2048;this.right.smoothingTimeConstant=0;
    this.split=context.createChannelSplitter(2);source.connect(this.split);this.split.connect(this.an,0);this.split.connect(this.right,1);
    this.rightWave=new Float32Array(2048);this.rightDB=new Float32Array(1024);
    this.wave=new Float32Array(this.an.fftSize); this.db=new Float32Array(this.an.frequencyBinCount);
    this.limits=[30,100,220,500,1000,2200,4500,8500,Math.min(16000,context.sampleRate/2)];
    this.reset();
  }
  reset() {
    this.prev=new Float32Array(8); this.peaks=new Float32Array(8).fill(.005);
    this.smooth=new Float32Array(8); this.mean=new Float32Array(8); this.dev=new Float32Array(8).fill(.002);
    this.lastHit=new Float64Array(8).fill(-100); this.hits=[]; this.lastBass=-100;
    this.rmsPeak=.08; this.energy=0; this.pulse=0; this.tempo=110; this.confidence=0; this.serial=0;
  }
  sample(time,dt,sensitivity=1,smoothing=.45) {
    this.an.getFloatTimeDomainData(this.wave); this.an.getFloatFrequencyData(this.db);
    this.right.getFloatTimeDomainData(this.rightWave);this.right.getFloatFrequencyData(this.rightDB);
    let power=0,leftPower=0,rightPower=0;for(let i=0;i<this.wave.length;i++){leftPower+=this.wave[i]**2;rightPower+=this.rightWave[i]**2;}power=(leftPower+rightPower)*.5;
    const rms=Math.sqrt(power/this.wave.length),quiet=rms<.0015;
    this.rmsPeak=Math.max(.015,rms,this.rmsPeak*Math.exp(-dt/8));
    const target=quiet?0:clamp(rms/this.rmsPeak*sensitivity);
    this.energy+=(target-this.energy)*(1-Math.exp(-dt/(target>this.energy?.035:.12+smoothing*.45)));
    const raw=new Float32Array(8); let sum=0,weighted=0,logs=0,bins=0;
    const hz=this.ctx.sampleRate/this.an.fftSize;
    for(let i=1;i<this.db.length;i++) {
      const freq=i*hz,p=(10**(this.db[i]/10)+10**(this.rightDB[i]/10))*.5; if(!Number.isFinite(p))continue;
      sum+=p;weighted+=p*freq;logs+=Math.log(p+1e-15);bins++;
      for(let k=0;k<8;k++) if(freq>=this.limits[k]&&freq<this.limits[k+1]) {raw[k]+=p;break;}
    }
    const events=[];
    for(let k=0;k<8;k++) {
      const amp=Math.sqrt(raw[k]),rise=Math.max(0,amp-this.prev[k]);this.prev[k]=amp;
      const oldMean=this.mean[k],oldDev=this.dev[k];
      this.mean[k]+=(rise-oldMean)*(1-Math.exp(-dt/1.3));
      this.dev[k]+=(Math.abs(rise-oldMean)-oldDev)*(1-Math.exp(-dt/1.3));
      this.peaks[k]=Math.max(.002,amp,this.peaks[k]*Math.exp(-dt/7));
      const value=quiet?0:clamp(amp/this.peaks[k]*sensitivity);
      this.smooth[k]+=(value-this.smooth[k])*(1-Math.exp(-dt/(value>this.smooth[k]?.025:.1+smoothing*.3)));
      if(!quiet&&rise>Math.max(.0018,(oldMean+oldDev*2.1)/sensitivity)&&time-this.lastHit[k]>.16) {
        this.lastHit[k]=time;
        events.push({id:++this.serial,time,band:k,strength:clamp(rise/Math.max(.004,this.peaks[k])+.25),type:'onset'});
      }
    }
    const bass=events.find(e=>e.band<2)||events.find(e=>e.band<4);
    let onset=false;
    if(bass&&time-this.lastBass>.22) {
      onset=true;this.lastBass=time;this.hits.push(time);if(this.hits.length>24)this.hits.shift();this.pulse=1;
      if(this.hits.length>=8) {
        const intervals=this.hits.slice(1).map((t,i)=>t-this.hits[i]).filter(v=>v>.25&&v<1.5);
        if(intervals.length>=6) {
          const sorted=intervals.slice().sort((a,b)=>a-b),med=sorted[Math.floor(sorted.length/2)];
          let bpm=60/med;while(bpm<75)bpm*=2;while(bpm>170)bpm/=2;
          const error=intervals.reduce((s,v)=>s+Math.min(Math.abs(v-med),Math.abs(v-2*med),Math.abs(v-med/2))/med,0)/intervals.length;
          this.confidence=clamp(1-error*3.5);if(this.confidence>.55)this.tempo+=(bpm-this.tempo)*.15;
        }
      }
    }
    this.pulse*=Math.exp(-dt*6);
    if(quiet)this.confidence*=Math.exp(-dt/2);
    const centroid=sum>1e-12?weighted/sum:0;
    const flatness=bins&&sum>1e-12?Math.exp(logs/bins)/(sum/bins):0;
    const waveform=new Float32Array(128);for(let i=0;i<128;i++)waveform[i]=(rightPower>leftPower?this.rightWave:this.wave)[i*16];
    return {time,rms,energy:this.energy,bands:Array.from(this.smooth),low:(this.smooth[0]+this.smooth[1])/2,mid:(this.smooth[2]+this.smooth[3]+this.smooth[4])/3,high:(this.smooth[5]+this.smooth[6]+this.smooth[7])/3,brightness:clamp(centroid/6500),flatness:clamp(flatness*4),quiet,pulse:this.pulse,onset,events,tempo:this.tempo,confidence:this.confidence,waveform};
  }
  dispose() {this.an.disconnect();this.right.disconnect();this.split.disconnect();}
}
export const emptyFeatures=()=>({time:0,rms:0,energy:0,bands:Array(8).fill(0),low:0,mid:0,high:0,brightness:0,flatness:0,quiet:true,pulse:0,onset:false,events:[],tempo:110,confidence:0,waveform:new Float32Array(128)});
