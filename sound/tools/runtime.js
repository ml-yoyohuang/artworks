const canvas=document.querySelector('#art'),ctx=canvas.getContext('2d',{alpha:false});
const C=CONFIG.palette,INK='#303d36',TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>1-Math.pow(1-clamp(p,0,1),3);
const rnd=(i)=>{const n=Math.sin(i*127.1+CONFIG.id*311.7)*43758.5453;return n-Math.floor(n);};
const state={time:0,dt:0,beat:0,pulse:0,pulses:Array(24).fill(0),x:.5,y:.5,force:0,held:false,paused:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,playing:false,started:false,muted:false,frames:0,notes:0,interaction:0,lastNote:null,tempo:CONFIG.bpm,epoch:0};
window.soundState=state;
let sceneRef,raf=0,last=0,previewBeat=-1,loop,synth,tapSynth,kick,hat,master,analyser,limiter,lastTapTime=0;
const startButton=document.querySelector('#start'),muteButton=document.querySelector('#mute'),motionButton=document.querySelector('#motion'),status=document.querySelector('#status');
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function ellipse(x,y,rx,ry,color,rotation=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);ctx.fillStyle=color;ctx.fill();}
function text(str,x,y,size=12,color=INK,align='center'){ctx.fillStyle=color;ctx.font=`400 ${size}px DM, "Avenir Next", sans-serif`;ctx.textAlign=align;ctx.fillText(str,x,y);}
function dashed(points,color=INK+'35'){ctx.setLineDash([4,8]);line(points,color,1);ctx.setLineDash([]);}
function seedTexture(){ctx.fillStyle=INK+'09';for(let i=0;i<440;i++)ctx.fillRect(rnd(i+77)*1000,rnd(i+547)*700,1.5,1.5);}
function fire(index=state.beat){state.beat=index;if(state.reduced||state.paused)return;state.pulse=1;state.pulses[index%24]=1;sceneRef?.beat?.(index);requestDraw();}
function music(time){const n=state.notes++,scale=['C4','D4','E4','G4','A4','G4','E4','D4'],pattern=[0,2,4,2,3,1,4,3,2,0,1,3,4,2,1,0];
 const transpose=Math.round(((CONFIG.id===14?1-state.y:state.x)-.5)*12)+(CONFIG.id%3-1)*2+(state.shift||0);
 const note=(step,oct=0)=>Tone.Frequency(scale[((step%8)+8)%8]).transpose(transpose+oct).toNote();
 const play=(pitch,when,vel=.45,dur='16n')=>{synth.triggerAttackRelease(pitch,dur,when,vel);state.lastNote=pitch;};
 if(CONFIG.mode==='canon'){
  for(let v=0;v<3;v++){if(n>=v*4){play(note(pattern[(n-v*4)%16],v===2?-12:0),time,.29,'8n');Tone.Draw.schedule(()=>{if(state.reduced||state.paused)return;state.pulses[v]=1;sceneRef?.voice?.(v,n);requestDraw();},time);}}
 }else if(CONFIG.mode==='metro'){
  const spread=Math.max(0,1-Tone.Transport.seconds/20),step=60/state.tempo/2;
  for(let v=0;v<6;v++){const delay=spread*rnd(v+12)*step*.8;play(note(v,v%2?-12:0),time+delay,.23,'32n');Tone.Draw.schedule(()=>{if(state.reduced||state.paused)return;state.pulses[v]=1;requestDraw();},time+delay);}
 }else if(CONFIG.mode==='drum'){
  if(n%2===0)kick.triggerAttackRelease('C2','16n',time,.55);else hat.triggerAttackRelease('32n',time,.23);
  if(n%4!==3)play(note(pattern[n%16],-12),time,.35,'16n');
 }else if(CONFIG.mode==='signal'){play(note([0,2,4,3,1,4,2,3][n%8],n%3===0?-12:0),time,.4,'8n');}
 else if(CONFIG.mode==='choir'){play(note([0,1,2,3,4,3,2,1][n%8]),time,.45,'8n');}
 else{if(n%8!==7)play(note(pattern[n%16]),time,.4,CONFIG.osc==='sawtooth'?'16n':'8n');}
 Tone.Draw.schedule(()=>fire(n),time);
}
async function togglePlayback(){if(startButton.disabled)return;startButton.disabled=true;
 try{
  if(!window.Tone)throw new Error('CDN unavailable');
  await Tone.start();
  if(!state.started){
   limiter=new Tone.Limiter(-3).toDestination();master=new Tone.Gain(.42).connect(limiter);analyser=new Tone.Analyser('waveform',256);master.connect(analyser);window.soundAudio={analyser};
   synth=new Tone.PolySynth(Tone.Synth,{oscillator:{type:CONFIG.osc},envelope:{attack:.012,decay:.17,sustain:.08,release:.45},volume:CONFIG.osc==='square'||CONFIG.osc==='sawtooth'?-15:-9}).connect(master);synth.maxPolyphony=18;
   tapSynth=new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:.005,decay:.16,sustain:0,release:.25},volume:-15}).connect(master);
   kick=new Tone.MembraneSynth({pitchDecay:.025,octaves:3,volume:-17}).connect(master);
   hat=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:.002,decay:.04,sustain:0},volume:-24}).connect(master);
   Tone.Transport.bpm.value=state.tempo;loop=Tone.Transport.scheduleRepeat(music,'8n');state.started=true;
  }
  state.playing=!state.playing;
  if(state.playing){Tone.Transport.start();status.textContent='正在即時合成。觸碰畫面，加入自己的聲音。';}
  else{Tone.Transport.pause();synth.releaseAll();status.textContent='聲音休息中。畫面繼續安靜排練。';}
  startButton.innerHTML=state.playing?'暫停聲音 <span>Ⅱ</span>':'繼續聆聽 <span>↗</span>';
  muteButton.disabled=false;document.querySelector('.live-label').textContent=state.playing?'LIVE / YOUR TEMPO':'SILENT REHEARSAL';
  state.audioContext=Tone.getContext().state;
 }catch(error){status.textContent='聲音暫時無法啟用，請確認網路後重試；仍可觸碰畫面。';state.audioError=error.message;}
 finally{startButton.disabled=false;requestDraw();}
}
function mute(){if(!state.started)return;state.muted=!state.muted;master.gain.rampTo(state.muted?0:.42,.08);muteButton.textContent=state.muted?'播放聲音':'靜音';muteButton.setAttribute('aria-pressed',String(state.muted));status.textContent=state.muted?'靜音中，節奏與畫面仍然繼續。':'聲音已恢復。';}
function interact(){state.force=1;state.interaction++;sceneRef?.tap?.();if(state.started&&state.playing){const notes=['C4','D4','E4','G4','A4'];lastTapTime=Math.max(Tone.now(),lastTapTime+.015);tapSynth.triggerAttackRelease(Tone.Frequency(notes[Math.min(4,Math.floor((CONFIG.id===14?1-state.y:state.x)*5))]).transpose(state.shift||0).toNote(),'16n',lastTapTime,.5);}requestDraw();}
function pointer(e){const r=canvas.getBoundingClientRect(),z=Math.min(r.width/1000,r.height/700);state.x=clamp((e.clientX-r.left-(r.width-1000*z)/2)/(1000*z),0,1);state.y=clamp((e.clientY-r.top-(r.height-700*z)/2)/(700*z),0,1);sceneRef?.move?.();requestDraw();}
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);state.held=true;pointer(e);interact();});
canvas.addEventListener('pointermove',e=>{pointer(e);});
canvas.addEventListener('pointerup',()=>{state.held=false;sceneRef?.release?.();requestDraw();});canvas.addEventListener('pointercancel',()=>{state.held=false;});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')state.x=clamp(state.x-.08,0,1);if(e.key==='ArrowRight')state.x=clamp(state.x+.08,0,1);if(e.key==='ArrowUp')state.y=clamp(state.y-.08,0,1);if(e.key==='ArrowDown')state.y=clamp(state.y+.08,0,1);if(e.key.startsWith('Arrow')){sceneRef?.move?.();requestDraw();}if(e.key==='Enter')interact();if(e.key===' ')togglePlayback();});
startButton.addEventListener('click',togglePlayback);muteButton.addEventListener('click',mute);
document.querySelector('#tempo').addEventListener('input',e=>{state.tempo=+e.target.value;document.querySelector('#bpm').value=state.tempo;if(state.started)Tone.Transport.bpm.rampTo(state.tempo,.2);requestDraw();});
motionButton.addEventListener('click',()=>{state.paused=!state.paused;motionButton.textContent=state.paused?'繼續動態':'暫停動態';motionButton.setAttribute('aria-pressed',String(state.paused));if(state.paused){cancelAnimationFrame(raf);raf=0;}requestDraw();});
const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',()=>{state.reduced=media.matches;cancelAnimationFrame(raf);raf=0;last=0;requestDraw();});
function resize(){const box=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(box.width*d);canvas.height=Math.round(box.height*d);requestDraw();}
function render(ts){raf=0;if(document.hidden)return;const dt=last?Math.min((ts-last)/1000,.035):1/60;last=ts;const moving=!state.reduced&&!state.paused;
 state.dt=moving?dt:0;if(moving){state.time+=dt*(state.playing?1:.65);state.force*=Math.exp(-dt*3);state.pulse*=Math.exp(-dt*5);state.pulses=state.pulses.map(p=>p*Math.exp(-dt*4));if(!state.playing){const b=Math.floor(state.time*state.tempo/60*2);if(b!==previewBeat){previewBeat=b;fire(b);}}sceneRef.update?.(dt);}
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=CONFIG.bg;ctx.fillRect(0,0,canvas.width,canvas.height);const z=Math.min(canvas.width/1000,canvas.height/700);ctx.setTransform(z,0,0,z,(canvas.width-1000*z)/2,(canvas.height-700*z)/2);ctx.globalAlpha=1;ctx.lineWidth=2;seedTexture();sceneRef.draw(state);state.frames++;
 if(moving&&!raf)raf=requestAnimationFrame(render);
}
function requestDraw(){if(!raf&&!document.hidden)raf=requestAnimationFrame(render);}
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;if(document.hidden&&state.playing){Tone.Transport.pause();state.playing=false;startButton.innerHTML='繼續聆聽 <span>↗</span>';status.textContent='已離開頁面，聲音自動休息。';}if(!document.hidden)requestDraw();});
addEventListener('pagehide',()=>{cancelAnimationFrame(raf);if(state.started){Tone.Transport.stop();Tone.Transport.clear(loop);[synth,tapSynth,kick,hat,master,analyser,limiter].forEach(n=>n?.dispose());}});
function boot(scene){sceneRef=scene;sceneRef.init?.();if(state.reduced)status.textContent='已依照減少動態偏好呈現停格；觸碰仍可改變畫面。';new ResizeObserver(resize).observe(canvas);resize();requestDraw();}
