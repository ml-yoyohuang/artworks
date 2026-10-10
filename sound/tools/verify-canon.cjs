const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),score=JSON.parse(fs.readFileSync(root+'/score/canon.json'));
assert.deepEqual(score.voices.map(v=>v.events.length),[593,577,561,225]);
assert.deepEqual(score.voices.map(v=>v.events[0][0]/192),[8,16,24,0]);
assert.deepEqual(score.voices[0].events.slice(0,8).map(e=>e[1]),[78,76,74,73,71,69,71,73]);
assert.deepEqual(score.voices[3].events.slice(0,8).map(e=>e[1]),[50,45,47,42,43,38,43,45]);
assert.equal(score.totalTicks/192,228);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(['error','warning'].includes(e.type())&&!e.text().includes('Tone.js'))errors.push(e.text());});
 await page.goto((process.env.SOUND_URL||'http://127.0.0.1:8765/sound/')+'canon-ripples.html',{waitUntil:'networkidle'});
 await page.locator('#tempo').fill('160');await page.locator('#start').click();await page.waitForFunction(()=>soundState.started);
 await page.waitForTimeout(12500);
 const entry=await page.evaluate(()=>({voices:[...soundState.scoreVoices],ticks:Tone.Transport.ticks,title:soundState.scoreTitle}));assert(entry.voices.every(n=>n>0),'all four voices entered');
 // Seek to the intricate variation, then through the final rest and loop boundary.
 await page.locator('#start').click();await page.evaluate(()=>Tone.Transport.ticks=80*192);await page.waitForTimeout(300);await page.locator('#start').click();await page.waitForTimeout(3000);
 const variation=await page.evaluate(()=>({voices:[...soundState.scoreVoices],peak:Math.max(...Array.from(soundAudio.analyser.getValue(),v=>Math.abs(v)))}));assert(variation.peak>.00001);
 await page.locator('#start').click();await page.evaluate(()=>Tone.Transport.ticks=224*192);await page.waitForTimeout(300);await page.locator('#start').click();await page.waitForTimeout(5000);
 const loop=await page.evaluate(()=>({voices:[...soundState.scoreVoices],ticks:Tone.Transport.ticks,events:soundState.scoreEvents,peak:Math.max(...Array.from(soundAudio.analyser.getValue(),v=>Math.abs(v)))}));assert(loop.ticks>score.totalTicks);assert(loop.voices[3]>variation.voices[3]);assert(loop.voices[0]>variation.voices[0]);assert(loop.peak>.00001);assert.deepEqual(errors,[]);
 fs.writeFileSync(root+'/_qa/canon-results.json',JSON.stringify({date:new Date().toISOString(),notes:1956,quarterBeats:228,voiceEntries:[8,16,24,0],entry,variation,loop,errors},null,2));await browser.close();console.log('PASS full-score source, four voices, intricate variation, final rest and repeat');
})().catch(e=>{console.error(e);process.exit(1)});
