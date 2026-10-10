import {SoundEngine} from './sound-engine.js';
import {getScore} from './library.js';
export class ScorePlayer{
 constructor({volume=.45,onTime=()=>{},onEnded=()=>{}}={}){this.engine=new SoundEngine(4172);this.engine.volume=volume;this.onTime=onTime;this.onEnded=onEnded;this.playing=false;this.timer=null;this.raf=null;this.cursor=0;this.cycle=0;this.generation=0;this.current=null;this.repeat=false}
 async play(id,options={}){const ticket=++this.generation;this.stop(false);this.current=getScore(id,options);this.repeat=options.loop??false;this.engine.seed=this.current.seed;await this.engine.init();if(ticket!==this.generation)return;this.engine.gain();this.engine.origin=this.engine.ctx.currentTime+.08;this.playing=true;this.cursor=0;this.cycle=0;this.schedule();this.frame()}
 schedule(){clearTimeout(this.timer);if(!this.playing)return;const end=this.engine.raw()+.18,events=this.current.events;while(true){if(this.cursor>=events.length){if(!this.repeat)break;this.cursor=0;this.cycle++}const e=events[this.cursor],t=e.t+this.cycle*this.current.duration;if(t>end)break;this.cursor++;if(e.t>=this.current.duration||t<this.engine.raw()-.05||e.v<=0||(!e.notes.length&&e.voice!=='breath'))continue;this.engine.voice({...e,t,d:Math.min(e.d,this.current.duration-e.t)},this.engine.origin+t)}this.timer=setTimeout(()=>this.schedule(),25)}
 frame(){if(!this.playing)return;const time=this.engine.clock();this.onTime(this.repeat?time%this.current.duration:Math.min(time,this.current.duration),this.current);if(!this.repeat&&time>=this.current.duration){this.stop();this.onEnded(this.current);return}this.raf=requestAnimationFrame(()=>this.frame())}
 async pause(){if(!this.playing)return;this.playing=false;clearTimeout(this.timer);cancelAnimationFrame(this.raf);await this.engine.ctx?.suspend()}
 async resume(){if(this.playing||!this.current)return;const ticket=++this.generation;await this.engine.init();if(ticket!==this.generation)return;this.playing=true;this.schedule();this.frame()}
 setVolume(volume){if(!Number.isFinite(volume)||volume<0||volume>1)throw new RangeError('volume must be 0–1');this.engine.volume=volume;this.engine.gain()}
 stop(cancelPending=true){if(cancelPending)this.generation++;this.playing=false;clearTimeout(this.timer);cancelAnimationFrame(this.raf);this.engine.stopNodes()}
 async close(){this.stop();await this.engine.close()}
}
