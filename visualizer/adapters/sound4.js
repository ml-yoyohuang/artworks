import {MusicDipDetector} from '../audio/music-dip.js';
import {openAt,scarOf} from '../sources/sound4/models/cuts.js';
import {trace,nextCell,revealedFraction} from '../sources/sound4/models/echo.js';
import {EnergyModel} from '../sources/sound4/models/energy.js';
import * as THREE from 'three';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export async function create(preset,canvas,host) {
  const {createWork}=await import(preset.module),work=createWork(),i=preset.index;
  let time=0,age=0,acc=0,serial=0,features=null,prior=0,lastEvent=-99,normalSerial=-1;
  const queue=[],dip=new MusicDipDetector();
  const api={canvas,seed:'4172',get reduced(){return host.reduced},mobile:innerWidth<760,state:{started:false,playing:false},audible:false,engine:{ctx:null},rng:()=>()=>.5,
    status:()=>{},readout:()=>{},invalidate:()=>{},finish:()=>{},at:t=>t,soonest:()=>time,horizon:0,rewindTo:()=>{},setSeed:()=>{},replay:()=>{},play:async()=>{},pause:()=>{},exportPNG:()=>{},emit:e=>{queue.push(e);if(queue.length>100)queue.shift();}};
  if(i===3)api.fossilSimulation={params:{b:.135,k:.4,turns:2.8,slot:0,palette:0},rings:Array.from({length:320},(_,k)=>({t:k*.14,rib:0,suture:false,energy:0,H:new Float32Array(48),M:new Float32Array(48)})),score:{events:[],end:45},end:45};
  work.init(api);
  if(i===3){work.visible=work.N;work.setVisible(work.N);work.cap.visible=false;}
  if(i===4){work.clock={phaseA:()=>work.pa||0,phaseB:()=>work.pb||.04,sync:()=>.5+.5*Math.cos(((work.pb||.04)-(work.pa||0))*Math.PI*2),delta:()=>0,cycle:0};work.pa=0;work.pb=.04;}
  if(i===5){work.musicMode=true;work.auto=false;}
  if(i===6){work.vround=work.round;}
  function fossilRing(index,f){
    const fr=work.frames[index],sim=work.sim,ring=sim.rings[index],g=work.mesh.geometry,pos=g.attributes.position,col=g.attributes.color;
    ring.energy=f.energy;ring.rib=f.pulse;ring.suture=f.quiet;
    for(let k=0;k<=48;k++){
      const kk=k%48,band=Math.floor(kk/6),ph=k/48*Math.PI*2;
      ring.H[kk]=f.bands[band]*.7;
      const rho=fr.rho*(1+ring.H[kk]*.24+f.pulse*.12),p=fr.c.clone().addScaledVector(fr.nrm,Math.cos(ph)*rho);p.z+=Math.sin(ph)*rho*.8;
      const j=index*49+k;pos.setXYZ(j,p.x,p.y,p.z);
      const color=new THREE.Color('#d6c9ad').lerp(new THREE.Color('#a88d64'),f.pulse*.7).lerp(new THREE.Color('#f3eee2'),ring.H[kk]*.7);if(f.quiet)color.multiplyScalar(.6);col.setXYZ(j,color.r,color.g,color.b);
    }
    pos.needsUpdate=true;col.needsUpdate=true;
  }
  const updateOriginal=work.update.bind(work);
  return {
    bg:preset.bg,fg:[0,7].includes(i)?'#343a32':'#e9e5dc',
    resize(w,h,d){work.resize(w,h,Math.min(d,i===3||i===5?1.25:1.5),api);},
    update(t,dt,f){
      features=f;time+=dt;age+=dt;acc+=dt;api.state.started=host.player.audio.currentTime>0;api.state.playing=dt>0;api.horizon=time;
      if(i===0){
        if(time-lastEvent>.5){lastEvent=time;const v=[38,50,60,69].map((n,k)=>n+Math.round(f.bands[k*2]*8));work.applyChord({v,name:'音樂頻段'},false);}
        work.walls.forEach((p,k)=>{p.sustain=f.bands[k*2]>.1;p.ptarget=.3+f.bands[k*2]*.7;});updateOriginal(time,dt,api);
      }
      if(i===1){
        while(acc>=.28){acc-=.28;const k=serial++;const info={phraseStep:k%16,section:'MP3',note:f.mid>.06?62+Math.round(f.brightness*22):null,bass:f.low>.08?37+Math.round(f.low*10):null,root:37+Math.round(f.low*10),onset:f.pulse>.3,kick:f.low>.5,snare:f.mid>.55,hat:f.high>.4,inBar:k%8,bar:Math.floor(k/8),bassOn:f.onset};work.onEvent({type:'row',t:time,step:k,info,voices:{bass:true,melody:true,drums:true}},api);}
        updateOriginal(time,dt,api);
      }
      if(i===2){
        work.t=time;const pause=dip.update(f,dt);
        if(!pause.rest){if(!work.inSound)work.soundStart(time,f.energy,api);prior+=dt;work.mem.add(f.energy,dt,f.brightness);}
        if(pause.opened&&work.inSound){work.restStart(time,0,api,{dur:prior,energy:work.mem.stats().energy||.4,peak:.8,reg:f.brightness});prior=0;}
        work.tension+=(f.energy-work.tension)*(1-Math.exp(-dt*4));work.shiver=Math.max(f.pulse*.35,work.shiver-dt*3.5);
        for(const c of work.cuts){if(c===work.active)c.open=openAt(c,time-c.restStart);else if(c.closeFrom!=null)c.open=scarOf(c)+(c.peakOpen-scarOf(c))*Math.exp(-(time-c.closeFrom)/.75);if(c.healing!=null){c.heal=clamp((time-c.healing)/6);if(c.heal>=1)c.dead=true;}}work.cuts=work.cuts.filter(c=>!c.dead).slice(-9);
      }
      if(i===3){
        work.t=time;
        if(!work.musicStarted){work.musicStarted=true;work.visible=work.N;work.setVisible(work.N);}
        if(age>44){age=0;serial=0;work.visible=work.N;work.complete=false;work.specimen=0;work.setVisible(work.N);}
        while(acc>=.14){acc-=.14;if(f.quiet)continue;const n=Math.min(319,6+serial++);fossilRing(n,f);work.visible=work.N;work.setVisible(work.N);}
        if(serial!==normalSerial&&serial%4===0){work.mesh.geometry.computeVertexNormals();normalSerial=serial;}
      }
      if(i===4){
        work.t=time;work.pa+=dt*(.14+f.low*.25);work.pb+=dt*(.14+f.high*.25);
        for(const e of f.events)work.onEvent({layer:e.band<4?'A':'B',n:e.band,t:time});
      }
      if(i===5){
        api.musicFeatures={amp:f.quiet?0:f.energy*.55,midi:45+f.brightness*24,voiced:!f.quiet,air:f.flatness};
        if(!work.active&&(!f.quiet||work.items.length===0))work.beginBreath(api,time,'soft');
        updateOriginal(time,dt,api);
      }
      if(i===6){
        if(f.onset&&time-lastEvent>.8){lastEvent=time;const src=work.maze.center(...work.cell),arr=trace(work.maze,src,time,4172+serial++);work.onEvent({type:'ping',t:time,src,n:arr.length,refl:arr.filter(a=>a.bounces>0).length},api);for(const a of arr)queue.push({type:'echo',t:a.t,a,src,round:work.round});const step=nextCell(work.maze,work.cell,time);if(step){work.moves.push({t0:time+.2,t1:time+.8,from:src,to:work.maze.center(...step)});work.cell=step;if(work.moves.length>12)work.moves.shift();}if(revealedFraction(work.maze,time)>.95){work.newMaze(api);work.vround=work.round;}if(queue.length>100)queue.splice(0,queue.length-100);}
        for(let q=queue.length-1;q>=0;q--)if(queue[q].t<=time){work.onEvent(queue[q],api);queue.splice(q,1);}updateOriginal(time,dt,api);
      }
      if(i===7){
        if(!work.model.locked())work.model.inject(f.energy*dt*3.7);
        for(const e of f.events){work.model.inject(e.strength*.25);work.onEvent({type:'hit',vel:e.strength,idx:e.band},api);}
        work.model.advance(time);updateOriginal(time,dt,api);
      }
    },
    render(){work.render(api);},
    reset(){
      time=0;age=0;acc=0;serial=0;prior=0;lastEvent=-99;queue.length=0;dip.reset();
      if(i===0){work.walls.forEach(x=>x.sustain=false);}
      if(i===1){work.rows=[];work.cur=null;work.rowCount=0;if(work.cctx)work.cctx.clearRect(0,0,work.g.cw,360*work.g.rowH);}
      if(i===2){work.cuts=[];work.active=null;work.inSound=false;work.mem.reset();work.t=0;}
      if(i===3){work.visible=work.N;work.musicStarted=false;work.complete=false;work.setVisible(work.N);}
      if(i===4){work.pa=0;work.pb=.04;work.rA=[];work.rB=[];work.t=0;}
      if(i===5){if(work.active){work.scene.remove(work.active.mesh);work.active.mesh.geometry.dispose();work.active=null;}for(const it of work.items){work.scene.remove(it.mesh);it.mesh.geometry.dispose();it.mesh.material.dispose();}work.items=[];work.tip=null;work.t=0;}
      if(i===6){work.newMaze(api);work.vround=work.round;work.moves=[{t0:-1,t1:-1,from:work.maze.center(...work.cell),to:work.maze.center(...work.cell)}];}
      if(i===7){work.model=new EnergyModel('balanced');work.s=null;work.t=0;work.lastN=0;work.preview=0;work.gores.forEach(g=>g.pulse=0);}
    },
    dispose(){work.dispose?.();},
    inspect(){return {time,rows:work.rows?.length,rings:work.visible,items:work.items?.length,cuts:work.cuts?.length,cutTriggers:dip.count,cutRest:dip.active,queue:queue.length,energy:work.model?.E,phase:work.model?.phase};}
  };
}
