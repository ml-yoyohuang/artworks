const {chromium}=require('/Users/yoyohuang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text().slice(0,400));});
 await page.goto('http://127.0.0.1:8788/visualizer/');await page.waitForFunction(()=>!!window.Visualizer);console.log('INITIAL',await page.evaluate(()=>Visualizer.snapshot()));
 await page.locator('#play').click();await page.waitForTimeout(2500);console.log('AUDIO',await page.evaluate(()=>Visualizer.snapshot()));
 const presets=await page.evaluate(()=>Visualizer.presets.map(p=>({id:p.id,series:p.series}))),results=[];
 for(const p of presets){await page.evaluate(id=>Visualizer.select(id),p.id);await page.waitForTimeout(p.series===4?1200:500);const snap=await page.evaluate(()=>Visualizer.snapshot());results.push(snap);console.log('PRESET',p.id, 'actual:',snap.preset,'errors:',JSON.stringify(snap.errors),'status:',await page.locator('#status').textContent());if(snap.preset!==p.id)console.log('MISMATCH',p.id);if(!snap.playing)await page.locator('#play').click();}
 await page.evaluate(()=>Visualizer.select('s2-03-elastic-ensemble'));await page.waitForTimeout(1200);await page.screenshot({path:'visualizer/_qa/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await page.screenshot({path:'visualizer/_qa/mobile.png',fullPage:true});
 console.log('OVERFLOW',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 fs.writeFileSync('visualizer/_qa/results.json',JSON.stringify({errors,results},null,2));await browser.close();assert.equal(results.filter(s=>s.errors.length).length,0,'Preset errors');assert.equal(errors.length,0,'Browser errors');
})().catch(e=>{console.error(e);process.exit(1)});
