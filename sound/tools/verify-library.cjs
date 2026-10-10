/* Regression coverage for every artwork × every score and transport lifecycle. */
const fs=require('fs'),assert=require('assert'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),works=JSON.parse(fs.readFileSync(root+'/tools/works.json')),scores=JSON.parse(fs.readFileSync(root+'/score/library.json')),base=process.env.SOUND_URL||'http://127.0.0.1:8765/sound/';
(async()=>{const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']}),result={date:new Date().toISOString(),checks:[],errors:[]};
for(const work of works){const p=await browser.newPage();p.on('pageerror',e=>result.errors.push(work.slug+': '+e.message));p.on('console',e=>{if(e.type()==='error'||e.type()==='warning')result.errors.push(work.slug+': '+e.text());});await p.goto(base+work.slug+'.html',{waitUntil:'networkidle'});
 assert.equal(await p.locator('#track').inputValue(),work.recommended);
 // Choosing before the invitation must not initialize an AudioContext or start playback.
 await p.locator('#track').selectOption(work.recommended==='turkish'?'canon':'turkish');assert(await p.evaluate(()=>!soundState.started&&!soundState.playing));await p.locator('#recommend').click();await p.locator('#start').click();await p.waitForFunction(()=>soundState.started&&soundState.playing);
 for(const [id,score] of Object.entries(scores)){
  await p.locator('#track').selectOption(id);await p.waitForTimeout(700);
  const measure=await p.evaluate(async()=>{let peak=0;for(let j=0;j<8;j++){peak=Math.max(peak,...Array.from(soundAudio.analyser.getValue(),v=>Math.abs(v)));await new Promise(r=>setTimeout(r,55));}return{trackId:soundState.trackId,title:soundState.scoreTitle,events:soundState.scoreEvents,voices:soundState.scoreVoices,peak,playing:soundState.playing,tempo:soundState.tempo,rate:soundState.rate};});
  assert.equal(measure.trackId,id);assert.equal(measure.title,score.title);assert(measure.events>0);assert(measure.peak>0.00001);assert(measure.playing);
  result.checks.push({slug:work.slug,score:id,...measure});
 }
 // Muting must survive a switch, and a paused switch must remain paused.
 await p.locator('#mute').click();await p.locator('#track').selectOption('turkish');await p.waitForTimeout(400);assert(await p.evaluate(()=>soundState.muted&&soundState.playing&&Math.max(...Array.from(soundAudio.analyser.getValue(),v=>Math.abs(v)))<.00001));await p.locator('#mute').click();await p.locator('#start').click();await p.locator('#track').selectOption('cancan');await p.waitForTimeout(400);assert(await p.evaluate(()=>!soundState.playing&&Tone.Transport.state==='stopped'));await p.locator('#start').click();if(await p.locator('#recommend').isEnabled())await p.locator('#recommend').click();assert.equal(await p.locator('#track').inputValue(),work.recommended);
 // Rapid switches should dispose old voices and pending Draw callbacks.
 for(const id of ['canon','bolero','turkish','hungarian','william','cancan'])await p.locator('#track').selectOption(id);await p.waitForTimeout(900);assert(await p.evaluate(()=>soundState.trackId==='cancan'&&soundState.scoreVoices.length===2&&soundState.scoreEvents>0));
 console.log('PASS 6 scores + lifecycle '+work.slug);await p.close();}
const p=await browser.newPage();p.on('pageerror',e=>result.errors.push(e.message));await p.goto(base+'jelly-wave.html');await p.locator('#start').click();await p.waitForTimeout(300);
// Hungarian source accelerates at q128 and slows at q152; verify musical, not fixed BPM.
await p.evaluate(()=>Tone.Transport.ticks=127*192);await p.waitForTimeout(1300);assert.equal(await p.evaluate(()=>soundState.baseTempo),160);await p.locator('#tempo').fill('0.8');assert.equal(await p.evaluate(()=>soundState.tempo),128);await p.evaluate(()=>Tone.Transport.ticks=151*192);await p.waitForTimeout(1200);assert.equal(await p.evaluate(()=>soundState.baseTempo),69);
result.tempoChanges=true;await p.locator('#track').selectOption('bolero');await p.waitForTimeout(700);const low=await p.evaluate(()=>soundState.energyTarget);await p.evaluate(()=>Tone.Transport.ticks=190*192);await p.waitForTimeout(900);const high=await p.evaluate(()=>soundState.energyTarget);assert(high>low+.4);result.boleroCrescendo={low,high};
// Every part must repeat cleanly across its final bar, including the tempo reset.
result.loops=[];for(const [id,score]of Object.entries(scores)){await p.locator('#track').selectOption(id);await p.waitForTimeout(250);await p.evaluate(t=>{Tone.Transport.ticks=t-192;},score.totalTicks);await p.waitForTimeout(2300);assert(await p.evaluate(t=>Tone.Transport.ticks>t&&soundState.musicalTick<t/2,score.totalTicks));result.loops.push(id);}
await p.close();await browser.close();assert.deepEqual(result.errors,[]);fs.writeFileSync(root+'/_qa/library-results.json',JSON.stringify(result,null,2));console.log('PASS 96 score/artwork pairs, rapid switching, mute, pause, rubato, crescendo and 6 loops');})().catch(e=>{console.error(e);process.exit(1)});
