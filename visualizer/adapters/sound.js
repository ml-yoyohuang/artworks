export async function create(preset,canvas,host) {
  const {createScene}=await import(preset.module);
  const s={time:0,dt:0,beat:0,pulse:0,pulses:Array(24).fill(0),x:.5,y:.5,force:0,held:false,paused:false,reduced:host.reduced,playing:false,started:false,muted:false,tempo:110,epoch:0,trackId:'mp3',rate:1,baseTempo:110,energy:0,energyTarget:0,phrasePulse:0,strong:false,musicalTick:0,scoreVoices:Array(8).fill(0),shift:0,notes:0};
  const {scene,config}=createScene(canvas,s),ctx=canvas.getContext('2d');
  scene.init?.();let w=1,h=1,dpr=1,phase=0;
  return {
    bg:config.bg,fg:'#303d36',
    resize(W,H,D){w=W;h=H;dpr=D;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);},
    update(t,dt,f) {
      s.reduced=host.reduced;s.playing=dt>0;s.started=host.player.audio.currentTime>0;s.dt=dt;
      s.time+=dt*(f.quiet?0:.35+f.energy*.8);s.energy=f.energy;s.energyTarget=f.energy;s.tempo=f.tempo;
      phase+=dt*f.tempo/60;s.musicalTick=phase*192;
      s.pulse=Math.max(s.pulse*Math.exp(-dt*5),f.pulse);s.phrasePulse=Math.max(s.phrasePulse*Math.exp(-dt*4),f.pulse*.5);
      for(let i=0;i<24;i++)s.pulses[i]*=Math.exp(-dt*4);
      s.strong=f.onset&&f.low>.45;
      if(f.onset){s.beat++;s.notes++;scene.clock?.();scene.beat?.(s.beat);}
      for(const e of f.events){s.pulses[e.band]=e.strength;s.scoreVoices[e.band]++;scene.voice?.(Math.floor(e.band/3));scene.note?.(48+e.band*4,e.strength,phase*192);}
      scene.react?.(f,dt);
      scene.update?.(dt);
    },
    render(){
      s.reduced=host.reduced;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=config.bg;ctx.fillRect(0,0,w,h);
      const z=Math.min(w/1000,h/700);ctx.save();ctx.translate((w-1000*z)/2,(h-700*z)/2);ctx.scale(z,z);scene.draw();ctx.restore();
    },
    reset(){scene.reset?.();s.time=0;s.beat=0;s.pulse=0;s.pulses.fill(0);phase=0;},
    dispose(){scene.cancel?.();},
    inspect(){return scene.inspect?.()||{};}
  };
}
