/* Tone.js 15.0.4 adapter. Owns the global Tone.Transport; use one player at a time. */
(function(root){
 'use strict';
 class SoftScoresPlayer {
  constructor(Tone,library){this.Tone=Tone;this.library=library;this.nodes=[];this.parts=[];this.score=null;this.rate=1;this.playing=false;this.generation=0;}
  load(id,{wave='triangle',volume=-12,bassWave=null,onNote=null,instrumentFactory=null}={}){
   const score=this.library[id];if(!score)throw new Error('Unknown score: '+id);
   this.clear();const T=this.Tone,g=this.generation;this.score=score;this.id=id;this.rate=1;
   T.Transport.PPQ=score.ppq;T.Transport.bpm.value=score.bpm;
   this.output=new T.Gain(.6).toDestination();this.nodes.push(this.output);
   const instruments=score.voices.map((v,i)=>{
    if(instrumentFactory){const custom=instrumentFactory(T,v,i,volume);custom.connect(this.output);this.nodes.push(custom);return custom;}
    const canonBass=id==='canon'&&v.role==='bass';
    const node=v.role==='percussion'?new T.NoiseSynth({noise:{type:'pink'},envelope:{attack:.002,decay:.04,sustain:0},volume:volume-12}):new T.PolySynth(T.Synth,{oscillator:{type:v.role==='bass'?(bassWave||(id==='canon'?'triangle':'sine')):wave},envelope:{attack:.012,decay:.15,sustain:canonBass?.42:.28,release:canonBass?.28:.18},volume:volume+(v.role==='bass'?(canonBass?-2:-5):0)});
    if(v.role!=='percussion')node.maxPolyphony=32;
    node.connect(this.output);this.nodes.push(node);return node;
   });
   const part=new T.Part((time,event)=>{
    if(g!==this.generation)return;
    const [at,midi,duration,velocity,voice]=event,role=score.voices[voice].role;
    const seconds=T.Ticks(Math.max(1,duration*.88)).toSeconds();
    const crescendo=id==='bolero'?.3+.7*(.18+.82*at/score.totalTicks):1;
    const strength=Math.min(1,Math.max(.01,velocity/127))*crescendo;
    if(role==='percussion')instruments[voice].triggerAttackRelease(Math.min(.12,seconds),time,strength*.5);
    else instruments[voice].triggerAttackRelease(T.Frequency(midi,'midi').toNote(),seconds,time,strength*(role==='bass'?(id==='canon'?.55:.42):.65));
    if(onNote)T.Draw.schedule(()=>{if(g===this.generation&&this.playing)onNote({track:id,tick:at,midi,duration,velocity,voice,role});},time);
   },score.voices.flatMap((v,i)=>v.events.map(e=>[`${e[0]}i`,[...e,i]])));
   part.loop=true;part.loopEnd=`${score.totalTicks}i`;part.start(0);this.parts.push(part);
   const tempos=new T.Part((time,bpm)=>{if(g===this.generation)T.Transport.bpm.setValueAtTime(bpm*this.rate,time);},score.tempos.map(([at,bpm])=>[`${at}i`,bpm]));
   tempos.loop=true;tempos.loopEnd=`${score.totalTicks}i`;tempos.start(0);this.parts.push(tempos);
   return this;
  }
  async play(){if(!this.score)throw new Error('Load a score first');await this.Tone.start();this.playing=true;this.Tone.Transport.start('+0.1');}
  pause(){this.playing=false;this.Tone.Transport.pause();this.release();}
  stop(){this.playing=false;this.Tone.Transport.stop();this.release();}
  release(){for(const node of this.nodes)node.releaseAll?.();}
  setRate(rate){if(!Number.isFinite(rate)||rate<=0)throw new Error('Rate must be positive');this.rate=rate;if(this.score){const tick=this.Tone.Transport.ticks%this.score.totalTicks;let bpm=this.score.bpm;for(const [at,value] of this.score.tempos){if(at>tick)break;bpm=value;}this.Tone.Transport.bpm.value=bpm*rate;}}
  clear(){this.generation++;this.stop();for(const part of this.parts)part.dispose();for(const node of this.nodes)node.dispose();this.parts=[];this.nodes=[];this.score=null;}
  dispose(){this.clear();}
 }
 root.SoftScoresPlayer=SoftScoresPlayer;
})(globalThis);
