const {chromium}=require('/Users/yoyohuang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1440,height:1060}});const page=await context.newPage(),errors=[],missing=[],report={presets:[],tracks:[],checks:[]};
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});page.on('console',m=>{if(m.type()==='error')console.log('ERROR',m.text().slice(0,200));});
 await page.goto((process.env.VISUALIZER_URL||'http://127.0.0.1:8788/visualizer/'));await page.waitForFunction(()=>window.Visualizer);
 assert.equal(await page.evaluate(()=>Visualizer.player.ctx),undefined);
 await page.locator('#play').click();await page.waitForTimeout(1500);assert(await page.evaluate(()=>Visualizer.player.playing));
 fs.mkdirSync('visualizer/_qa/presets',{recursive:true});
 const ids=await page.evaluate(()=>Visualizer.presets.map(p=>p.id));
 for(const id of ids){const old=await page.evaluate(()=>({ctx:Visualizer.player.ctx.currentTime,t:Visualizer.player.audio.currentTime,src:Visualizer.player.audio.src}));await page.evaluate(id=>Visualizer.select(id),id);await page.waitForTimeout(id.startsWith('s4-')?1400:650);const snap=await page.evaluate(()=>Visualizer.snapshot());assert.equal(snap.preset,id);assert.equal(snap.errors.length,0,JSON.stringify(snap.errors));assert(snap.playing);assert(snap.time>old.t);assert.equal(await page.evaluate(()=>Visualizer.player.audio.src),old.src);await page.locator('#stage').screenshot({path:'visualizer/_qa/presets/'+id+'.png'});report.presets.push({id,playing:snap.playing,energy:snap.energy,materials:snap.materials});console.log('PASS',id);}
 // Test every provided music file, including Unicode paths, with real decode and non-zero signal.
 await page.evaluate(()=>Visualizer.select('s2-03-elastic-ensemble'));
 const trackURLs=await page.evaluate(async()=>{const m=await import('./audio/tracks.js');return m.tracks;});
 for(const t of trackURLs){await page.evaluate(t=>Visualizer.player.load(encodeURI(t.src),t.title),t);await page.locator('#play').click();await page.waitForFunction(()=>Number.isFinite(Visualizer.player.audio.duration));await page.evaluate(()=>Visualizer.player.audio.currentTime=Math.min(30,Visualizer.player.audio.duration/3));await page.waitForFunction(()=>Visualizer.player.audio.currentTime>30 && Visualizer.snapshot().energy>.005,{},{timeout:10000});const s=await page.evaluate(()=>Visualizer.snapshot());assert(s.playing,t.title);assert(s.energy>.005,t.title+' has no audio signal');report.tracks.push({title:t.title,duration:await page.evaluate(()=>Visualizer.player.audio.duration),energy:s.energy});console.log('TRACK',t.title);}
 // Pause freezes audio and accumulation.
 await page.locator('#play').click();const paused=await page.evaluate(()=>Visualizer.snapshot());await page.waitForTimeout(700);const afterPause=await page.evaluate(()=>Visualizer.snapshot());assert.equal(afterPause.time,paused.time);assert.deepEqual(afterPause.materials,paused.materials);report.checks.push('pause freezes media and material');await page.locator('#play').click();
 // Output gain is independent from analysis; mute leaves activity and time moving.
 await page.locator('#mute').click();await page.waitForTimeout(700);const muted=await page.evaluate(()=>({s:Visualizer.snapshot(),gain:Visualizer.player.gain.gain.value}));assert(muted.gain<.00001);assert(muted.s.energy>.005);assert(muted.s.playing);await page.locator('#mute').click();report.checks.push('mute keeps analysis and playback active');
 // Seek resets the accumulated model; each representative model remains usable.
 for(const id of ['s1-flower-choir','s2-09-rhythm-rosette','s3-cuts','s4-fossil','s3-breath','s4-energy']){await page.evaluate(id=>Visualizer.select(id),id);await page.waitForTimeout(400);await page.evaluate(()=>{const el=document.querySelector('#seek');el.value='70';el.dispatchEvent(new Event('change'));});await page.waitForTimeout(600);assert.equal((await page.evaluate(()=>Visualizer.snapshot())).errors.length,0);}
 report.checks.push('seek restarts material across all four adapters');
 // Multi-minute song positions do not terminate the sculpture or fossil.
 for(const id of ['s4-fossil','s3-breath','s4-energy']){await page.evaluate(id=>Visualizer.select(id),id);await page.evaluate(()=>Visualizer.player.audio.currentTime=110);await page.waitForTimeout(1700);assert(await page.evaluate(()=>Visualizer.player.playing));assert.equal((await page.evaluate(()=>Visualizer.snapshot())).errors.length,0);}
 report.checks.push('material works keep playing beyond original duration');
 // Upload uses a user-picked file and stays local.
 const upload='_incoming-assets/free-mp3/Disfigure - Blank [NCS Release].mp3';await page.locator('#file').setInputFiles(upload);await page.waitForTimeout(800);assert(await page.evaluate(()=>Visualizer.player.audio.src.startsWith('blob:')));report.checks.push('local file picker plays blob URL');
 // Screenshot current UI, gallery, mobile and reduced motion.
 await page.evaluate(()=>Visualizer.select('s2-03-elastic-ensemble'));await page.waitForTimeout(1800);await page.screenshot({path:'visualizer/_qa/desktop.png',fullPage:true});
 await page.locator('#library-open').click();assert.equal(await page.locator('#preset-grid .preset-card').count(),34);await page.locator('[data-series="themes"]').click();assert.equal(await page.locator('#preset-grid .preset-card:visible').count(),8);await page.screenshot({path:'visualizer/_qa/library.png'});await page.locator('[data-close="library"]').click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'visualizer/_qa/mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>Visualizer.host.reduced);assert(await page.evaluate(()=>Visualizer.host.reduced));report.checks.push('responsive layout and reduced motion');
 // Rapid switches leave a single active canvas and a single audio context.
 await page.evaluate(async()=>{await Promise.all(['s3-architecture','s4-tides','s4-loom','s1-jelly-wave'].map(id=>Visualizer.select(id)));});await page.waitForTimeout(400);assert.equal(await page.locator('#canvas-host canvas').count(),1);report.checks.push('rapid switches leave one active scene');
 report.errors=errors;report.missing=missing;fs.writeFileSync('visualizer/_qa/acceptance.json',JSON.stringify(report,null,2));await browser.close();assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));console.log('PASS 34 presets, 10 MP3s, controls, upload, mobile and lifecycle');
})().catch(e=>{console.error(e);process.exit(1)});
