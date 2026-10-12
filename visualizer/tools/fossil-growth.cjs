const {chromium}=require('/Users/yoyohuang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1440,height:1060}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.VISUALIZER_URL||'http://127.0.0.1:8788/visualizer/')+'?preset=s4-fossil');await p.waitForFunction(()=>window.Visualizer?.host.current);
 const initial=await p.evaluate(()=>Visualizer.snapshot());assert.equal(initial.materials.totalRings,0);assert.equal(initial.materials.drawCount,0);
 await p.locator('#stage').screenshot({path:'visualizer/_qa/fossil-empty.png'});
 await p.locator('#play').click();await p.waitForTimeout(10500);
 const live=await p.evaluate(()=>Visualizer.snapshot());assert(live.materials.totalRings>20);assert(live.materials.drawCount>0);assert.equal(live.errors.length,0);
 await p.locator('#stage').screenshot({path:'visualizer/_qa/fossil-growing.png'});
 const image=await p.evaluate(()=>document.querySelector('#canvas-host canvas').toDataURL('image/jpeg',.92).split(',')[1]);fs.writeFileSync('visualizer/previews/s4-fossil.jpg',Buffer.from(image,'base64'));
 await p.locator('#play').click();await p.waitForTimeout(100);const paused=await p.evaluate(()=>Visualizer.snapshot());await p.waitForTimeout(400);assert.deepEqual((await p.evaluate(()=>Visualizer.snapshot())).materials,paused.materials);
 const simulated=await p.evaluate(()=>{
  const w=Visualizer.host.current;w.reset();const f={time:0,rms:.12,energy:.75,bands:[.7,.2,.4,.8,.5,.3,.9,.4],pulse:.6,quiet:false,events:[]};
  const checkpoints=[];for(let t=.25;t<=900;t+=.25){w.update(t,.25,f);if([30,60,300,900].includes(t)){w.render();checkpoints.push(w.inspect());}}
  const c=checkpoints.at(-1);w.update(901,1,{...f,quiet:true,rms:0});const quiet=w.inspect();w.update(901,0,f);const frozen=w.inspect();return {checkpoints,quiet,frozen};
 });
 assert(simulated.checkpoints.every((s,i,a)=>s.totalRings>(i?a[i-1].totalRings:0)&&s.rings<=s.budget));assert.equal(simulated.quiet.totalRings,simulated.checkpoints.at(-1).totalRings);assert.deepEqual(simulated.quiet,simulated.frozen);
 await p.locator('#stage').screenshot({path:'visualizer/_qa/fossil-15min-simulation.png'});
 await p.evaluate(()=>Visualizer.host.current.reset());assert.equal((await p.evaluate(()=>Visualizer.snapshot())).materials.totalRings,0);
 // Adapter refactor also preserves the other seven selected themes.
 for(const id of ['s3-architecture','s4-loom','s3-cuts','s4-tides','s3-breath','s4-echo','s4-energy']){await p.evaluate(id=>Visualizer.select(id),id);await p.waitForTimeout(250);assert.equal((await p.evaluate(()=>Visualizer.snapshot())).errors.length,0);}
 assert.deepEqual(errors,[]);fs.writeFileSync('visualizer/_qa/fossil-growth.json',JSON.stringify({initial,live,simulated,errors},null,2));await b.close();console.log('PASS empty start, MP3 growth, pause, silence, reset, 15-minute bounded geometry, all selected themes');
})().catch(e=>{console.error(e);process.exit(1)});
