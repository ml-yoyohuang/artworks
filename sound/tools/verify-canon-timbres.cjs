const assert=require('assert'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(['error','warning'].includes(e.type()))errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+': '+r.status());});
 await page.goto('file://'+root+'/reusable/canon-timbres.html',{waitUntil:'networkidle'});
 assert(await page.evaluate(()=>!player));await page.locator('#play').click();await page.waitForFunction(()=>player?.playing);
 for(const id of ['piano','architecture','tides','breath','pluck','original']){
  await page.locator('#timbre').selectOption(id);await page.waitForFunction(()=>player?.playing);
  const positionBefore=await page.evaluate(()=>Tone.Transport.ticks);await page.locator('#pause').click();await page.locator('#play').click();await page.waitForFunction(()=>player?.playing);assert(await page.evaluate(n=>Tone.Transport.ticks>=n,positionBefore));
  const peaks=[];
  for(const tick of [0,18000]){
   await page.evaluate(t=>{Tone.Transport.ticks=t;},tick);
   peaks.push(await page.evaluate(async()=>{const a=new Tone.Analyser('waveform',1024);player.output.connect(a);let peak=0;for(let i=0;i<35;i++){peak=Math.max(peak,...Array.from(a.getValue(),Math.abs));await new Promise(r=>setTimeout(r,30));}a.dispose();return peak;}));
  }
  assert(peaks.every(p=>p>.00001&&p<.98),id+' peaks '+peaks);assert.equal(await page.evaluate(()=>player.score.voices.reduce((n,v)=>n+v.events.length,0)),1956);
  checks.push({id,peaks});
 }
 await page.evaluate(()=>{Tone.Transport.ticks=player.score.totalTicks-35;});await page.waitForFunction(()=>Tone.Transport.ticks>player.score.totalTicks);
 await page.locator('#pause').click();const pausedTick=await page.evaluate(()=>Tone.Transport.ticks%score.totalTicks);await page.locator('#timbre').selectOption('piano');assert(await page.evaluate(n=>!player.playing&&Math.abs(Tone.Transport.ticks-n)<2,pausedTick));
 await page.locator('#volume').fill('0');assert.equal(await page.evaluate(()=>Number(document.querySelector('#volume').value)),0);await page.locator('#volume').fill('60');
 await page.locator('#stop').click();assert.equal(await page.evaluate(()=>Tone.Transport.ticks),0);await page.locator('#play').click();await page.waitForFunction(()=>player?.playing);
 await page.screenshot({path:root+'/_qa/canon-timbres-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:root+'/_qa/canon-timbres-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.voice').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await page.evaluate(()=>player.dispose());assert(await page.evaluate(()=>!player.nodes.length&&!player.parts.length));await browser.close();assert.deepEqual(errors,[]);
 fs.writeFileSync(root+'/_qa/canon-timbres-results.json',JSON.stringify({checks,all1956NotesPreserved:true,loop:true,pauseResume:true,switchKeepsPosition:true,mobileOverflow:false,reducedMotion:true,dispose:true,errors},null,2));console.log('PASS six timbres: opening / dense section audio, complete score, switch, loop, pause, mobile and disposal');
})().catch(e=>{console.error(e);process.exit(1);});
