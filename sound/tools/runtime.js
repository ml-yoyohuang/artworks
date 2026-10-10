const canvas=document.querySelector('#art'),ctx=canvas.getContext('2d',{alpha:false});
const C=CONFIG.palette,INK='#303d36',TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>1-Math.pow(1-clamp(p,0,1),3);
const rnd=(i)=>{const n=Math.sin(i*127.1+CONFIG.id*311.7)*43758.5453;return n-Math.floor(n);};
let SCORE=SCORES[CONFIG.recommended],generation=0,tempoPart;
const state={time:0,dt:0,beat:0,pulse:0,pulses:Array(24).fill(0),x:.5,y:.5,force:0,held:false,paused:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,playing:false,started:false,muted:false,frames:0,notes:0,interaction:0,lastNote:null,tempo:CONFIG.bpm,epoch:0,trackId:CONFIG.recommended,rate:1,baseTempo:SCORE.bpm,energy:.25,energyTarget:.25,phrasePulse:0,strong:false,musicalTick:0,scoreTitle:SCORE.title,scoreEvents:0,scoreVoices:SCORE.voices.map(()=>0)};
window.soundState=state;
let sceneRef,raf=0,last=0,previewBeat=-1,loop,synth,tapSynth,kick,hat,master,analyser,limiter,lastTapTime=0,scorePart,bassSynth;
const startButton=document.querySelector('#start'),muteButton=document.querySelector('#mute'),motionButton=document.querySelector('#motion'),status=document.querySelector('#status');
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function ellipse(x,y,rx,ry,color,rotation=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);ctx.fillStyle=color;ctx.fill();}
function text(str,x,y,size=12,color=INK,align='center'){ctx.fillStyle=color;ctx.font=`400 ${size}px DM, "Avenir Next", sans-serif`;ctx.textAlign=align;ctx.fillText(str,x,y);}
function dashed(points,color=INK+'35'){ctx.setLineDash([4,8]);line(points,color,1);ctx.setLineDash([]);}
function seedTexture(){ctx.fillStyle=INK+'09';for(let i=0;i<440;i++)ctx.fillRect(rnd(i+77)*1000,rnd(i+547)*700,1.5,1.5);}
function fire(index=state.beat){state.beat=index;if(state.reduced||state.paused)return;state.pulse=1;state.pulses[index%24]=1;sceneRef?.beat?.(index);requestDraw();}
// Musical time remains in ticks, so every track keeps its notation and tempo changes.
function energyAt(tick){return state.trackId==='bolero'?.18+.82*clamp(tick/SCORE.totalTicks,0,1):.5;}
function music(time){const n=state.notes++,g=generation;
 if(CONFIG.mode==='drum'&&state.trackId!=='bolero'){if(n%2===0)kick.triggerAttackRelease('C2','32n',time,.18);else hat.triggerAttackRelease('32n',time,.08);}
 Tone.Draw.schedule(()=>{if(g!==generation||!state.playing)return;state.musicalTick=Math.round(Tone.Transport.ticks)%SCORE.totalTicks;state.strong=n%(SCORE.meter*2)===0;state.energyTarget=energyAt(state.musicalTick);if(state.strong)state.phrasePulse=1;fire(n);},time);
}
function scoreNote(time,event){const [midi,duration,voice,velocity,at,g]=event;if(g!==generation)return;
 const role=SCORE.voices[voice].role;
 const axis=CONFIG.id===14?1-state.y:state.x,octave=Math.round((axis-.5)*2)*12+(state.shift||0);
 const pitch=Tone.Frequency(midi+(role==='lead'?octave:0),'midi').toNote();
 const length=Tone.Ticks(Math.max(12,duration*.88)).toSeconds(),energy=energyAt(at);
 const strength=clamp(velocity/127,.1,1)*(state.trackId==='bolero'?.3+.7*energy:1);
 if(role==='percussion')hat.triggerAttackRelease(Math.min(.12,length),time,strength*.5);
 else (role==='bass'?bassSynth:synth).triggerAttackRelease(pitch,length,time,strength*(role==='bass'?.42:.65));
 Tone.Draw.schedule(()=>{if(g!==generation||!state.playing)return;state.scoreEvents++;state.scoreVoices[voice]++;state.lastNote=pitch;state.musicalTick=at;state.energyTarget=state.trackId==='bolero'?energy:clamp(.25+velocity/170,.25,1);if(state.reduced||state.paused)return;state.pulses[voice]=1;
  if(role==='lead'){state.pulse=Math.max(state.pulse,.25+strength*.65);if(CONFIG.mode==='canon')sceneRef?.voice?.(voice%3);if(CONFIG.mode==='choir')sceneRef?.beat?.([0,1,2,3,4,3,2,1][midi%8]);sceneRef?.note?.(midi,strength,at);}
  requestDraw();},time);
}
function disposeScore(){generation++;if(!state.started)return;Tone.Transport.stop();Tone.Transport.clear(loop);scorePart?.dispose();tempoPart?.dispose();[synth,bassSynth,tapSynth,kick,hat].forEach(n=>n?.dispose());}
function prepareScore(){const g=generation;master.gain.cancelScheduledValues(0);master.gain.setValueAtTime(state.muted?0:.42,Tone.immediate());
 synth=new Tone.PolySynth(Tone.Synth,{oscillator:{type:CONFIG.osc},envelope:{attack:.012,decay:.15,sustain:.28,release:.18},volume:CONFIG.osc==='square'||CONFIG.osc==='sawtooth'?-22:-14}).connect(master);synth.maxPolyphony=32;
 bassSynth=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sine'},envelope:{attack:.02,decay:.15,sustain:.3,release:.18},volume:-17}).connect(master);bassSynth.maxPolyphony=32;
 tapSynth=new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:.005,decay:.16,sustain:0,release:.25},volume:-15}).connect(master);
 kick=new Tone.MembraneSynth({pitchDecay:.025,octaves:3,volume:-28}).connect(master);
 hat=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:.002,decay:.04,sustain:0},volume:-29}).connect(master);
 state.baseTempo=SCORE.bpm;state.tempo=SCORE.bpm*state.rate;Tone.Transport.bpm.value=state.tempo;
 const events=SCORE.voices.flatMap((v,voice)=>v.events.map(([at,midi,duration,velocity])=>[`${at}i`,[midi,duration,voice,velocity,at,g]]));
 scorePart=new Tone.Part(scoreNote,events);scorePart.loop=true;scorePart.loopEnd=`${SCORE.totalTicks}i`;scorePart.start(0);
 tempoPart=new Tone.Part((time,bpm)=>{if(g!==generation)return;Tone.Transport.bpm.setValueAtTime(bpm*state.rate,time);Tone.Draw.schedule(()=>{if(g!==generation)return;state.baseTempo=bpm;state.tempo=bpm*state.rate;},time);},SCORE.tempos.map(([at,bpm])=>[`${at}i`,bpm]));tempoPart.loop=true;tempoPart.loopEnd=`${SCORE.totalTicks}i`;tempoPart.start(0);
 loop=Tone.Transport.scheduleRepeat(music,'8n');
}
function playbackLabel(){startButton.innerHTML=state.playing?'暫停聲音 <span>Ⅱ</span>':state.started?'繼續聆聽 <span>↗</span>':'開始聆聽 <span>↗</span>';document.querySelector('.live-label').textContent=state.playing?'LIVE / YOUR TEMPO':'SILENT REHEARSAL';}
function musicStatus(){status.textContent=state.playing?`${state.muted?'靜音演奏':'正在演奏'}《${SCORE.title}》・${SCORE.detail}。`:state.started?'聲音休息中。畫面繼續安靜排練。':'聲音等待你的邀請。畫面已開始輕輕呼吸。';}
function selectTrack(id){if(!SCORES[id])return;disposeScore();SCORE=SCORES[id];state.trackId=id;state.scoreTitle=SCORE.title;state.scoreEvents=0;state.scoreVoices=SCORE.voices.map(()=>0);state.notes=0;state.beat=0;state.pulse=0;state.pulses.fill(0);state.phrasePulse=0;state.musicalTick=0;state.lastNote=null;state.baseTempo=SCORE.bpm;state.tempo=SCORE.bpm*state.rate;state.energyTarget=id==='bolero'?.18:.5;state.epoch=state.time;sceneRef?.reset?.();
 document.querySelector('#track').value=id;const material=document.querySelector('#track-material');material.replaceChildren(document.createTextNode(`${SCORE.title}・${SCORE.composer}`),document.createElement('br'),document.createTextNode(SCORE.detail));document.querySelector('#score-credit').setAttribute('href',`CREDITS.md#${id}`);document.querySelector('#recommend').disabled=id===CONFIG.recommended;
 if(state.started){prepareScore();if(state.playing)Tone.Transport.start('+0.1');}musicStatus();playbackLabel();requestDraw();
}
async function togglePlayback(){if(startButton.disabled)return;startButton.disabled=true;
 try{
  if(!window.Tone)throw new Error('CDN unavailable');await Tone.start();
  if(!state.started){limiter=new Tone.Limiter(-3).toDestination();master=new Tone.Gain(.42).connect(limiter);analyser=new Tone.Analyser('waveform',256);master.connect(analyser);window.soundAudio={analyser,master};prepareScore();state.started=true;}
  state.playing=!state.playing;if(state.playing)Tone.Transport.start('+0.1');else{Tone.Transport.pause();synth.releaseAll();bassSynth.releaseAll();tapSynth.triggerRelease();}
  musicStatus();playbackLabel();muteButton.disabled=false;state.audioContext=Tone.getContext().state;
 }catch(error){status.textContent='聲音暫時無法啟用，請確認網路後重試；仍可觸碰畫面。';state.audioError=error.message;}
 finally{startButton.disabled=false;requestDraw();}
}
function mute(){if(!state.started)return;state.muted=!state.muted;master.gain.rampTo(state.muted?0:.42,.08);muteButton.textContent=state.muted?'播放聲音':'靜音';muteButton.setAttribute('aria-pressed',String(state.muted));status.textContent=state.muted?'靜音中，節奏與畫面仍然繼續。':'聲音已恢復。';}
function interact(){state.force=1;state.interaction++;sceneRef?.tap?.();if(state.started&&state.playing){const voice=SCORE.voices.find(v=>v.role==='lead'),tick=Tone.Transport.ticks%SCORE.totalTicks;let event=voice.events[0];for(const e of voice.events){if(e[0]>tick)break;event=e;}lastTapTime=Math.max(Tone.now(),lastTapTime+.015);const octave=Math.round((state.x-.5)*2)*12;tapSynth.triggerAttackRelease(Tone.Frequency(event[1]+octave+(state.shift||0),'midi').toNote(),'16n',lastTapTime,.35);}requestDraw();}
function pointer(e){const r=canvas.getBoundingClientRect(),z=Math.min(r.width/1000,r.height/700);state.x=clamp((e.clientX-r.left-(r.width-1000*z)/2)/(1000*z),0,1);state.y=clamp((e.clientY-r.top-(r.height-700*z)/2)/(700*z),0,1);sceneRef?.move?.();requestDraw();}
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);state.held=true;pointer(e);interact();});
canvas.addEventListener('pointermove',e=>{pointer(e);});
canvas.addEventListener('pointerup',()=>{state.held=false;sceneRef?.release?.();requestDraw();});canvas.addEventListener('pointercancel',()=>{state.held=false;});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')state.x=clamp(state.x-.08,0,1);if(e.key==='ArrowRight')state.x=clamp(state.x+.08,0,1);if(e.key==='ArrowUp')state.y=clamp(state.y-.08,0,1);if(e.key==='ArrowDown')state.y=clamp(state.y+.08,0,1);if(e.key.startsWith('Arrow')){sceneRef?.move?.();requestDraw();}if(e.key==='Enter')interact();if(e.key===' ')togglePlayback();});
startButton.addEventListener('click',togglePlayback);muteButton.addEventListener('click',mute);
document.querySelector('#track').addEventListener('change',e=>selectTrack(e.target.value));
document.querySelector('#recommend').addEventListener('click',()=>selectTrack(CONFIG.recommended));document.querySelector('#recommend').disabled=true;
document.querySelector('#tempo').addEventListener('input',e=>{state.rate=+e.target.value;document.querySelector('#bpm').value='×'+state.rate.toFixed(2);state.tempo=state.baseTempo*state.rate;if(state.started)Tone.Transport.bpm.value=state.tempo;requestDraw();});
motionButton.addEventListener('click',()=>{state.paused=!state.paused;motionButton.textContent=state.paused?'繼續動態':'暫停動態';motionButton.setAttribute('aria-pressed',String(state.paused));if(state.paused){cancelAnimationFrame(raf);raf=0;}requestDraw();});
const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',()=>{state.reduced=media.matches;cancelAnimationFrame(raf);raf=0;last=0;requestDraw();});
function resize(){const box=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(box.width*d);canvas.height=Math.round(box.height*d);requestDraw();}
function render(ts){raf=0;if(document.hidden)return;const dt=last?Math.min((ts-last)/1000,.035):1/60;last=ts;const moving=!state.reduced&&!state.paused;
 state.dt=moving?dt:0;if(moving){state.time+=dt*(state.playing?state.tempo/SCORE.bpm:.65);state.energy=mix(state.energy,state.energyTarget,1-Math.exp(-dt*3));state.phrasePulse*=Math.exp(-dt*3);state.force*=Math.exp(-dt*3);state.pulse*=Math.exp(-dt*5);state.pulses=state.pulses.map(p=>p*Math.exp(-dt*4));if(!state.playing){const b=Math.floor(state.time*state.tempo/60*2);if(b!==previewBeat){previewBeat=b;fire(b);}}sceneRef.update?.(dt);}
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=CONFIG.bg;ctx.fillRect(0,0,canvas.width,canvas.height);const z=Math.min(canvas.width/1000,canvas.height/700);ctx.setTransform(z,0,0,z,(canvas.width-1000*z)/2,(canvas.height-700*z)/2);ctx.globalAlpha=1;ctx.lineWidth=2;seedTexture();sceneRef.draw(state);state.frames++;
 if(moving&&!raf)raf=requestAnimationFrame(render);
}
function requestDraw(){if(!raf&&!document.hidden)raf=requestAnimationFrame(render);}
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;if(document.hidden&&state.playing){Tone.Transport.pause();state.playing=false;startButton.innerHTML='繼續聆聽 <span>↗</span>';status.textContent='已離開頁面，聲音自動休息。';}if(!document.hidden)requestDraw();});
addEventListener('pagehide',()=>{cancelAnimationFrame(raf);if(state.started){Tone.Transport.stop();Tone.Transport.clear(loop);[scorePart,tempoPart,synth,bassSynth,tapSynth,kick,hat,master,analyser,limiter].forEach(n=>n?.dispose());}});
function boot(scene){sceneRef=scene;sceneRef.init?.();if(state.reduced)status.textContent='已依照減少動態偏好呈現停格；觸碰仍可改變畫面。';new ResizeObserver(resize).observe(canvas);resize();requestDraw();}
