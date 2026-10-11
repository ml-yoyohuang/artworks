/* Tone.js 15.0.4. Synthesized interpretations of sound3 timbres; no samples. */
(function(root){
 'use strict';
 const presets={
  piano:{title:'泛音鋼琴',description:'清亮的敲擊，帶一點木質的溫暖。保留 sound3 的八層泛音比例，讓四個聲部都有清楚的輪廓。'},
  architecture:{title:'建築・持續三角波',description:'柔軟的起音，音符像一根根柱子慢慢立起。較長的延續感讓和聲連成空間。'},
  tides:{title:'左右潮汐',description:'三條旋律分散在左、中、右方，像潮水互相靠近。戴耳機時，聲部的位置最容易辨認。'},
  breath:{title:'氣息・有音高的風',description:'溫柔的三角波帶著濾過的氣息噪音。保留旋律音高，讓風聲成為質地，而不是遮住整首歌。'},
  pluck:{title:'微下滑撥音',description:'圓潤的弦音，在每次撥動後滑下一點點。下滑不到一個半音的十分之一，帶出輕巧的彈性感。'}
 };
 function factory(id){
  if(!presets[id])throw Error('Unknown timbre: '+id);
  return (T,voice,index,volume)=>{
   const bass=voice.role==='bass',slow=['architecture','tides','breath'].includes(id);
   // Retain the more audible triangle bass in all versions.
   const oscillator=bass||id==='architecture'||id==='breath'?{type:'triangle'}:id==='piano'?{type:'custom',partials:[1,.38,.18,.1,.06,.035,.02,.012]}:{type:'sine'};
   const envelope={attack:bass?.012:slow?.09:.013,decay:id==='pluck'?.2:.15,sustain:bass?.42:id==='pluck'?.18:slow?.5:.34,release:bass?.28:slow?.35:.22};
   const synth=id==='pluck'&&!bass?new T.PolySynth(T.MembraneSynth,{oscillator,envelope,pitchDecay:.16,octaves:Math.log2(1/.995),volume}):new T.PolySynth(T.Synth,{oscillator,envelope,volume:volume+(bass?-2:0)});
   synth.maxPolyphony=32;
   const filter=new T.Filter(bass?1600:id==='breath'?1900:4000,'lowpass');filter.Q.value=.55;
   const pan=new T.Panner(id==='tides'&&!bass?[-.55,0,.55][index%3]:0);
   synth.connect(filter);filter.connect(pan);
   const nodes=[synth,filter,pan];let air,airFilter,airGain;
   if(id==='breath'&&!bass){
    air=new T.NoiseSynth({noise:{type:'pink'},envelope:{attack:.09,decay:.15,sustain:.25,release:.25},volume:volume-16});
    airFilter=new T.Filter(1300,'bandpass');airFilter.Q.value=.8;
    airGain=new T.Gain(1);air.connect(airFilter);airFilter.connect(airGain);airGain.connect(pan);nodes.push(air,airFilter,airGain);
   }
   return {
    connect(destination){pan.connect(destination);return this;},
    triggerAttackRelease(note,duration,time,velocity){synth.triggerAttackRelease(note,duration,time,velocity);if(air)air.triggerAttackRelease(duration,time,velocity*.5);},
    releaseAll(){synth.releaseAll();air?.triggerRelease();},
    dispose(){nodes.forEach(node=>node.dispose());}
   };
  };
 }
 root.SoftScoreTimbres={presets,factory};
})(globalThis);
