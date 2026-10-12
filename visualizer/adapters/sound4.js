import {BeatClock} from '../audio/beat-clock.js';
import {forwardRoute} from '../runtime/maze-route.js';
import {MusicDipDetector} from '../audio/music-dip.js';
import {openAt,scarOf} from '../sources/sound4/models/cuts.js';
import {trace} from '../sources/sound4/models/echo.js';
import {EnergyModel} from '../sources/sound4/models/energy.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export async function create(preset,canvas,host) {
  const {createWork}=await import(preset.module),work=createWork(),i=preset.index;
  let time=0,age=0,acc=0,serial=0,features=null,prior=0,lastEvent=-99;
  const queue=[],dip=new MusicDipDetector(),beats=new BeatClock();
  let route=[],routeIndex=0,nextMove=0,routeHistory=[];
  function planRoute(){route=forwardRoute(work.maze,work.cell);routeIndex=0;nextMove=time;routeHistory=[work.cell.slice()];}
  const api={canvas,seed:'4172',get reduced(){return host.reduced},mobile:innerWidth<760,state:{started:false,playing:false},audible:false,engine:{ctx:null},rng:()=>()=>.5,
    status:()=>{},readout:()=>{},invalidate:()=>{},finish:()=>{},at:t=>t,soonest:()=>time,horizon:0,rewindTo:()=>{},setSeed:()=>{},replay:()=>{},play:async()=>{},pause:()=>{},exportPNG:()=>{},emit:e=>{queue.push(e);if(queue.length>100)queue.shift();}};
  work.init(api);
  if(i===4){work.clock={phaseA:()=>work.pa||0,phaseB:()=>work.pb||.04,sync:()=>.5+.5*Math.cos(((work.pb||.04)-(work.pa||0))*Math.PI*2),delta:()=>0,cycle:0};work.pa=0;work.pb=.04;}
  if(i===5){work.musicMode=true;work.auto=false;}
  if(i===6){work.vround=work.round;planRoute();}
  if(i===7)work.model=new EnergyModel('balanced',{beatGated:true});
  const updateOriginal=work.update?.bind(work);
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
      if(i===3)work.updateMusic(f,dt,api);
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
        // New maze only after the final movement has actually arrived.
        if(routeIndex===route.length-1&&time>=nextMove+1.2){
          work.round++;work.newMaze(api);work.vround=work.round;queue.length=0;planRoute();
        }
        const advance=routeIndex<route.length-1&&!f.quiet&&time>=nextMove&&(f.onset||time-lastEvent>1.5);
        if(advance){
          lastEvent=time;const src=work.maze.center(...work.cell),arr=trace(work.maze,src,time,4172+serial++);
          for(const a of arr)if(a.reveal)work.maze.segs[a.seg].revealAt=Math.min(work.maze.segs[a.seg].revealAt,a.t);
          work.onEvent({type:'ping',t:time,src,n:arr.length,refl:arr.filter(a=>a.bounces>0).length},api);
          for(const a of arr)queue.push({type:'echo',t:a.t,a,src,round:work.round});
          if(routeIndex<route.length-1){
            const step=route[++routeIndex];work.moves.push({t0:time,t1:time+.65,from:src,to:work.maze.center(...step)});work.cell=step.slice();routeHistory.push(step.slice());nextMove=time+.8;
            if(work.moves.length>12)work.moves.shift();
          }else nextMove=time+.8;
          if(queue.length>100)queue.splice(0,queue.length-100);
        }
        for(let q=queue.length-1;q>=0;q--)if(queue[q].t<=time){work.onEvent(queue[q],api);queue.splice(q,1);}updateOriginal(time,dt,api);
      }
      if(i===7){
        if(!work.model.locked())work.model.inject(f.energy*dt*3.7);
        for(const e of f.events){work.model.inject(e.strength*.25);work.onEvent({type:'hit',vel:e.strength,idx:e.band},api);}
        work.model.advance(time);
        if(beats.update(t,f)&&work.model.releaseOnBeat(time))work.onEvent({type:'release',t:time},api);
        updateOriginal(time,dt,api);
      }
    },
    render(){work.render(api);},
    reset(){
      time=0;age=0;acc=0;serial=0;prior=0;lastEvent=-99;queue.length=0;dip.reset();beats.reset();
      if(i===0){work.walls.forEach(x=>x.sustain=false);}
      if(i===1){work.rows=[];work.cur=null;work.rowCount=0;if(work.cctx)work.cctx.clearRect(0,0,work.g.cw,360*work.g.rowH);}
      if(i===2){work.cuts=[];work.active=null;work.inSound=false;work.mem.reset();work.t=0;}
      if(i===3)work.reset();
      if(i===4){work.pa=0;work.pb=.04;work.rA=[];work.rB=[];work.t=0;}
      if(i===5){if(work.active){work.scene.remove(work.active.mesh);work.active.mesh.geometry.dispose();work.active=null;}for(const it of work.items){work.scene.remove(it.mesh);it.mesh.geometry.dispose();it.mesh.material.dispose();}work.items=[];work.tip=null;work.t=0;}
      if(i===6){work.newMaze(api);work.vround=work.round;work.moves=[{t0:-1,t1:-1,from:work.maze.center(...work.cell),to:work.maze.center(...work.cell)}];planRoute();}
      if(i===7){work.model=new EnergyModel('balanced',{beatGated:true});work.s=null;work.t=0;work.lastN=0;work.preview=0;work.gores.forEach(g=>g.pulse=0);}
    },
    dispose(){work.dispose?.();},
    inspect(){return {time,...(work.inspect?.()||{}),rows:work.rows?.length,rings:work.visible,items:work.items?.length,cuts:work.cuts?.length,cutTriggers:dip.count,cutRest:dip.active,queue:queue.length,energy:work.model?.E,phase:work.model?.phase,ready:work.model?.ready,releases:work.model?.releases,releaseTime:work.model?.lastReleaseBeat,beats:beats.count,beatTime:beats.last,route: i===6?{round:work.round,index:routeIndex,length:route.length,cell:work.cell.slice(),position:work.posAt(time),goal:route.at(-1),visited:routeHistory.slice()}:undefined};}
  };
}
