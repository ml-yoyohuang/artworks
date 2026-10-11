export async function create(preset,canvas,host) {
  const {createDefinition}=await import(preset.module),def=createDefinition();
  let w=1,h=1,dpr=1,beat=0,features={energy:0,low:0,mid:0,high:0,pulse:0,bands:Array(8).fill(0)};const history=[];
  const api={values:{},get reduced(){return host.reduced},safe:{t:70,r:24,b:90,l:24},seed:4172,quality:1,audioOn:false,
    get W(){return w},get H(){return h},get beat(){return beat},get bpm(){return features.tempo||110},
    get motion(){return (host.reduced?.3:1)*Math.min(1.3,.03+features.energy*1.2)},get level(){return features.energy},
    get features(){return features}, events:(a,b)=>history.filter(e=>e.b>=a&&e.b<b),userEvents:()=>{},toast:()=>{},crossfade:()=>{},nextBeat:()=>beat,add:()=>{}};
  for(const p of def.params||[])api.values[p.key]=p.value;
  const work=def.create(api),g=canvas.getContext('2d');
  work.seed?.(4172);for(const p of def.params||[])work.set?.(p.key,p.value);
  let serial=0,lastSustain=-99,pendingDT=0;
  function add(e){history.push(e);work.onEvent?.(e,beat);}
  return {
    bg:def.bg,fg:def.fg||'#26312c',
    resize(W,H,D){w=W;h=H;dpr=D;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);work.layout(w,h,api.safe);},
    update(t,dt,f){
      features=f;beat+=dt*f.tempo/60*(f.quiet?0:1);
      for(const e of f.events) {
        const band=Math.min(3,Math.floor(e.band/2)),type=band===0?'outer':band===1?'middle':'inner';
        add({b:beat,type,band,pos:.2+(serial++%7)/10,dur:.8,vel:e.strength,rib:band%2,deg:e.band,p:Math.floor(beat/16),i:band});
        add({b:beat,type:'short',band,pos:.2+(serial%7)/10,dur:.6,vel:e.strength,deg:e.band});
        add({b:beat,type:'note',rib:band%2,deg:e.band,end:false});
        if(preset.index===4)add({b:beat,type:'orn',rib:band%2,deg:e.band});
      }
      if(f.onset) {
        if(preset.index===0){add({b:beat,type:'catch',line:serial%5});add({b:beat,type:'launch',line:(serial+4)%5});}
        if(preset.index===3&&f.low>.5)add({b:beat,type:'meet'});
        if(preset.index===1)work.down?.(w*(.22+(serial%4)*.18),h*.5);
        if(preset.index===5)work.down?.(w*(.2+(serial%4)*.2),h*.4);
      }
      if(preset.index===2&&!f.quiet&&beat-lastSustain>1) {
        lastSustain=beat;[f.low,f.mid,f.high,f.high].forEach((v,band)=>{if(v>.35)add({b:beat,type:'long',band,dur:.6,vel:v});});
      }
      while(history.length&&history[0].b<beat-12)history.shift();if(history.length>400)history.splice(0,history.length-400);
      pendingDT+=dt;
    },
    render(){g.setTransform(dpr,0,0,dpr,0,0);work.draw(g,beat,pendingDT);pendingDT=0;},
    reset(){beat=0;history.length=0;lastSustain=-99;pendingDT=0;work.seed?.(4172);},
    dispose(){work.up?.();},
    inspect(){return {beat,eventHistory:history.length};}
  };
}
