import {MusicDipDetector} from '../audio/music-dip.js';
import {createModel} from '../sources/sound3/model.js';
import {render} from '../sources/sound3/works.js';
import {echoScore} from '../sources/sound3/model.js';
export async function create(preset,canvas,host) {
  const i=preset.index,params={rotation:.3,fossilDuration:32,voices:[true,true,true],phaseBase:[0,.1],passage:0,weave:0};
  let model=createModel(i,4172,params),s=model.state,w=1,h=1,dpr=1,time=0,age=0,row=0,acc=0,lastSound=0;
  const g=canvas.getContext('2d');s.arch=[.2,.65,1,.85];s.stability=.8;
  const pending=[],dip=new MusicDipDetector();
  function reset(){model=createModel(i,4172,params);s=model.state;s.arch=[.2,.65,1,.85];s.stability=.8;time=0;age=0;row=0;acc=0;lastSound=0;pending.length=0;dip.reset();}
  return {
    bg:preset.bg,fg:[0,1].includes(i)?'#303d36':'#ece8db',
    resize(W,H,D){w=W;h=H;dpr=D;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);},
    update(t,dt,f) {
      time+=dt;s.time=time;s.active=f.energy;s.reduced=host.reduced;age+=dt;acc+=dt;
      if(i===0){for(let k=0;k<4;k++)s.arch[k]+=(f.bands[k*2]*1.6-s.arch[k])*(1-Math.exp(-dt*2));s.stability=f.energy;s.chord=Math.min(3,Math.floor(f.brightness*4));}
      if(i===1){while(acc>=.25){acc-=.25;const key=row++;s.rows.push({notes:[48+Math.round(f.brightness*24)],pos:key%16,phrase:Math.floor(key/16),row:key,key,voices:[f.low>.12,f.mid>.12,f.high>.3],variant:f.brightness>.45,weave:params.weave,spacing:.35+f.energy*.5});if(f.high>.4)s.knots.push(key);if(s.rows.length>96)s.rows.shift();if(s.knots.length>96)s.knots.shift();}}
      if(i===2){
        const pause=dip.update(f,dt);
        if(!pause.rest)lastSound=Math.max(lastSound,f.energy);
        if(pause.opened){s.cuts.push({start:time,d:99,prior:lastSound,axis:s.cutSerial++%4,depth:.35+lastSound,openEnded:true});if(s.cuts.length>4)s.cuts.shift();}
        if(pause.closed){for(const c of s.cuts)if(c.openEnded){c.d=time-c.start;c.openEnded=false;}}
        if(!pause.rest)lastSound*=Math.exp(-dt/2);
      }
      if(i===3){if(age>32){s.material.fill(0);s.layers=[];age=0;}s.time=Math.max(.001,age);for(const e of f.events){const center=e.band*12;for(let k=0;k<96;k++)s.material[k]=Math.min(1.6,s.material[k]+Math.exp(-(((k-center)/8)**2))*e.strength*.035);s.layers.push({t:age,kind:e.band<2?'ridge':'grain',pitch:48+e.band*4,v:e.strength});}if(s.layers.length>96)s.layers.splice(0,s.layers.length-96);}
      if(i===4){params.phaseBase[0]+=dt*(.15+f.low*.22);params.phaseBase[1]+=dt*(.15+f.high*.22);}
      if(i===5){if(age>12){s.gallery.push({samples:s.breath.map(x=>({...x})),seed:s.seed++});if(s.gallery.length>2)s.gallery.shift();s.breath=[];age=0;}while(acc>=.1){acc-=.1;s.breath.push({y:age/12,r:f.quiet?.018:f.energy*.5,twist:f.brightness*2,airy:f.flatness});if(s.breath.length>140)s.breath.shift();}}
      if(i===6){if(f.onset){const seq=echoScore(4172+row++);s.reveal=s.reveal.map(x=>Math.max(.12,x*.95));for(const e of seq.events.filter(e=>e.kind==='echo'&&e.t<3)){pending.push({...e,t:time+e.t});}if(pending.length>60)pending.splice(0,pending.length-60);}for(let j=pending.length-1;j>=0;j--)if(pending[j].t<=time){model.onEvent(pending[j],pending[j].t);pending.splice(j,1);}s.paths=s.paths.filter(p=>time-p.start<5);}
      if(i===7){if(s.locked&&time-s.releaseTime>5){s.locked=false;s.energy=.12;}if(!s.locked){s.energy=Math.max(0,Math.min(1.8,s.energy+dt*(f.energy*.32-.07)+(f.onset?.035:0)));if(s.energy>.95){s.locked=true;s.releaseTime=time;s.releases++;s.energy=.2;}}}
    },
    render(){g.setTransform(dpr,0,0,dpr,0,0);render(g,w,h,model,preset.bg);},
    reset,dispose(){pending.length=0;},inspect(){return {cuts:s.cuts.length,cutTriggers:dip.count,cutRest:dip.active,rows:s.rows.length,layers:s.layers.length,breath:s.breath.length,paths:s.paths.length,energy:s.energy};}
  };
}
