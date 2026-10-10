const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SOUND3_URL||'http://127.0.0.1:8766/sound3/';
(async()=>{const browser=await chromium.launch();const result={date:new Date().toISOString(),base,scope:'Disclosure UI and playback isolation; mobile is browser emulation',pages:[]};try{
 for(const [device,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})){
 const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(base);assert.equal(await page.locator('.index-foot a').filter({hasText:'展覽說明'}).count(),0);assert.equal(await page.locator('.index-foot a').filter({hasText:'音源與授權'}).count(),1);const links=await page.locator('.card').evaluateAll(a=>a.map(x=>x.getAttribute('href')));assert.equal(links.length,8);
 for(const file of links){await page.goto(base+file);await page.waitForFunction(()=>window.Sound3);const details=page.locator('.how-to-play'),summary=details.locator('summary');assert.equal(await details.count(),1);assert.equal(await details.evaluate(d=>d.open),false);
 await summary.click();assert.equal(await details.evaluate(d=>d.open),true);assert.ok(await details.locator('li').count()>=2);await details.locator('li').first().waitFor({state:'visible'});
 await summary.press('Space');assert.equal(await details.evaluate(d=>d.open),false);await summary.press('Enter');assert.equal(await details.evaluate(d=>d.open),true);assert.equal(await page.evaluate(()=>Sound3.state.started||!!Sound3.audio.ctx),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(file.startsWith('01-'))await page.screenshot({path:path.resolve(__dirname,'../_qa/shots',`${device}-how-to-play.png`),fullPage:true});
 await page.locator('#play').click();await page.waitForFunction(()=>Sound3.state.playing&&Sound3.state.time>.4);const before=await page.evaluate(()=>Sound3.state.time);
 await summary.focus();await summary.press('Space');assert.equal(await details.evaluate(d=>d.open),false);await summary.press('Enter');assert.equal(await details.evaluate(d=>d.open),true);await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>Sound3.state.playing),true);assert.ok(await page.evaluate(()=>Sound3.state.time)>=before);await page.locator('#play').click();const paused=await page.evaluate(()=>Sound3.state.time);await summary.click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>Sound3.state.playing),false);assert.equal(await page.evaluate(()=>Sound3.state.time),paused);
 // The global shortcut still works when focus is on the artwork.
 await page.locator('canvas').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>Sound3.state.playing);await page.keyboard.press('Space');await page.waitForFunction(()=>!Sound3.state.playing);
 assert.equal(await page.locator('.foot nav a').count(),3);result.pages.push({device,file,defaultClosed:true,pointer:true,keyboard:true,noAudioOnDisclosure:true,playbackPreserved:true,pausePreserved:true,globalShortcut:true,noOverflow:true,pass:true});
 }assert.deepEqual(errors,[]);await page.close();
 }result.pass=true;console.log(JSON.stringify({pass:true,pages:result.pages.length,footerLinkRemoved:true}));
 }catch(e){result.pass=false;result.error=e.stack;throw e}finally{fs.writeFileSync(path.resolve(__dirname,'../_qa/disclosure.json'),JSON.stringify(result,null,2)+'\n');await browser.close()}
})();
