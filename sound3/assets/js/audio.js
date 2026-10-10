import {noise,clamp} from './model.js';
export class SoundEngine{
 constructor(seed){this.seed=seed;this.ctx=null;this.nodes=new Set();this.maxNodes=0;this.notes=0;this.log=[];this.volume=.45;this.muted=false}
 async init(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('音訊不可用');this.ctx=new AC({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=this.volume*.42;this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-16;this.limiter.knee.value=9;this.limiter.ratio.value=5;this.limiter.attack.value=.006;this.limiter.release.value=.22;this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=1024;this.master.connect(this.limiter);this.limiter.connect(this.analyser);this.analyser.connect(this.ctx.destination);this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate*4,this.ctx.sampleRate);const arr=this.noiseBuffer.getChannelData(0);let smooth=0;for(let i=0;i<arr.length;i++){smooth=smooth*.58+(noise(i,this.seed)*2-1)*.42;arr[i]=smooth}this.origin=this.ctx.currentTime+.08}await this.ctx.resume();if(this.ctx.state!=='running')throw new Error('音訊未啟動')}
 raw(){return this.ctx?Math.max(0,this.ctx.currentTime-this.origin):0}
 clock(){if(!this.ctx)return 0;return Math.max(0,this.ctx.currentTime-this.origin-(this.ctx.outputLatency||0))}
 level(){if(!this.analyser)return 0;const a=new Float32Array(1024);this.analyser.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs))}
 gain(){if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume*.42,this.ctx.currentTime,.025)}
 voice(e,when){if(!e.notes.length&&e.voice!=='breath')return;if(this.nodes.size>90)return;const ctx=this.ctx,noiseVoice=['breath','drum'].includes(e.voice),notes=noiseVoice?[null]:e.notes;
  for(let i=0;i<notes.length;i++){if(this.nodes.size>=90)break;
   const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner();let source;
   const attack=['organ','dark','voice','breath','tideA','tideB'].includes(e.voice)?Math.min(.24,e.d*.2):.013;
   const level=clamp(e.v)*(['bass','organ','dark'].includes(e.voice)?.31:.42)/Math.sqrt(notes.length);
   gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+attack);gain.gain.setValueAtTime(level*.62,when+Math.max(attack,e.d*.45));gain.gain.exponentialRampToValueAtTime(.0001,when+e.d);gain.gain.setValueAtTime(0,when+e.d+.01);
   filter.type=noiseVoice?'bandpass':'lowpass';filter.frequency.setValueAtTime(e.voice==='drum'?2100:e.voice==='breath'?1300:e.voice==='bass'?800:e.voice==='voice'?1900:4000,when);filter.Q.value=noiseVoice?.8:.55;
   pan.pan.value=e.voice==='tideA'?-.55:e.voice==='tideB'?.55:(i-(notes.length-1)/2)*.14;
   if(noiseVoice){source=ctx.createBufferSource();source.buffer=this.noiseBuffer;source.loop=true}else{source=ctx.createOscillator();source.type=['bass','organ','voice','dark'].includes(e.voice)?'triangle':'sine';source.frequency.setValueAtTime(440*2**((notes[i]-69)/12),when);if(e.voice==='pluck')source.frequency.exponentialRampToValueAtTime(440*2**((notes[i]-69)/12)*.995,when+e.d)}
   source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.master);const entry={source,filter,gain,pan,when};this.nodes.add(entry);this.maxNodes=Math.max(this.maxNodes,this.nodes.size);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();this.nodes.delete(entry)};source.start(when);source.stop(when+e.d+.04);
  }
  this.notes++;this.log.push({score:e.t,when,late:Math.max(0,this.ctx.currentTime-when),voice:e.voice});if(this.log.length>128)this.log.shift();
 }
 startTone(notes,{level=.18,cutoff=1800,pan=0,airy=false}={}){
  if(!this.ctx||this.nodes.size+notes.length>90)return null;const ctx=this.ctx,entries=[];
  for(const pitch of notes){const source=airy?ctx.createBufferSource():ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),panner=ctx.createStereoPanner();if(airy){source.buffer=this.noiseBuffer;source.loop=true}else{source.type='triangle';source.frequency.value=440*2**((pitch-69)/12)}filter.type=airy?'bandpass':'lowpass';filter.frequency.value=cutoff;panner.pan.value=pan;gain.gain.value=0;gain.gain.setTargetAtTime(level/Math.sqrt(notes.length),ctx.currentTime,.04);source.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(this.master);const entry={source,filter,gain,pan:panner};this.nodes.add(entry);entries.push(entry);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();panner.disconnect();this.nodes.delete(entry)};source.start();}
  this.maxNodes=Math.max(this.maxNodes,this.nodes.size);this.notes++;
  return {set:(pitches,tone=cutoff,position=pan)=>entries.forEach((e,i)=>{if(!this.nodes.has(e))return;if(!airy)e.source.frequency.setTargetAtTime(440*2**((pitches[i]-69)/12),ctx.currentTime,.07);e.filter.frequency.setTargetAtTime(tone,ctx.currentTime,.08);e.pan.pan.setTargetAtTime(position,ctx.currentTime,.08)}),stop:()=>entries.forEach(e=>{if(!this.nodes.has(e))return;e.gain.gain.setTargetAtTime(0,ctx.currentTime,.025);try{e.source.stop(ctx.currentTime+.16)}catch{}})};
 }
 stopFuture(){if(!this.ctx)return;for(const n of this.nodes){if(n.when>this.ctx.currentTime+.005){try{n.source.stop()}catch{}n.source.disconnect();n.filter.disconnect();n.gain.disconnect();n.pan.disconnect();this.nodes.delete(n)}}}
 stopNodes(){for(const n of this.nodes){try{n.source.stop()}catch{}n.source.disconnect();n.filter.disconnect();n.gain.disconnect();n.pan.disconnect()}this.nodes.clear()}
 async close(){this.stopNodes();if(this.ctx&&this.ctx.state!=='closed')await this.ctx.close()}
}
// Microphone analysis stays in the page; no recorder or network request exists.
// Autocorrelation only returns a pitch when the periodicity is sufficiently high.
export function estimatePitch(samples,sampleRate){
 let sum=0;for(const x of samples)sum+=x*x;const rms=Math.sqrt(sum/samples.length);if(rms<.016)return {rms,pitch:null,confidence:0};
 let best=0,bestLag=0;const correlations=[];const min=Math.floor(sampleRate/650),max=Math.min(Math.floor(sampleRate/85),samples.length/2);
 for(let lag=min;lag<=max;lag++){let cross=0,aa=0,bb=0;for(let i=0;i<samples.length-max;i++){const a=samples[i],b=samples[i+lag];cross+=a*b;aa+=a*a;bb+=b*b}const corr=cross/Math.sqrt(aa*bb+1e-12);correlations[lag]=corr;if(corr>best){best=corr;bestLag=lag}}
 for(let lag=min+1;lag<max;lag++){if(correlations[lag]>best*.97&&correlations[lag]>.78&&correlations[lag]>=correlations[lag-1]&&correlations[lag]>=correlations[lag+1]){bestLag=lag;break}}
 return {rms,pitch:best>.78?69+12*Math.log2(sampleRate/bestLag/440):null,confidence:best};
}
