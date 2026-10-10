/* HTTP browser acceptance: runtime audio-clock evidence, not subjective listening. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const only=(process.env.SOUND3_ONLY||'').split(',').filter(Boolean),RESULT_FILE=process.env.SOUND3_RESULT||'results.json';
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'_qa'),BASE=process.env.SOUND3_URL||'http://127.0.0.1:8766/sound3/';
const ids=['01-resonant-architecture','02-chord-loom','03-silence-cuts','04-sound-fossil','05-phase-tides','06-breath-portrait','07-echo-labyrinth','08-stored-energy'];
const moments=[12,19,13,33,82,15,29,16];fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function watch(page,errors){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400&&!/favicon/.test(r.url()))errors.push(r.status()+' '+r.url())})}
const snap=p=>p.evaluate(()=>Sound3.debug.snapshot());
const hash=p=>p.evaluate(()=>{const c=document.querySelector('canvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0;for(let i=0;i<a.length;i+=388)h=(h*31+a[i]+a[i+1]*7+a[i+2]*13)>>>0;return h});
async function representative(page,time){await page.waitForFunction(t=>Sound3.state.time>=t||Sound3.model.state.complete,time,{timeout:Math.max(20000,time*1000+20000)});}
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=user-gesture-required']}),results={date:new Date().toISOString(),browser:browser.version(),base:BASE,works:[],index:[],extra:{}};
 try{
 for(const device of ['desktop','mobile']){
 const context=await browser.newContext({viewport:device==='desktop'?{width:1440,height:900}:{width:390,height:844},deviceScaleFactor:1,isMobile:device==='mobile',hasTouch:device==='mobile',acceptDownloads:true});
 // One page at a time keeps measured audio scheduling from competing with seven artworks.
 for(let i=0;i<ids.length;i++){if(only.length&&!only.includes(ids[i]))continue;
  const page=await context.newPage(),errors=[],r={id:ids[i],device,checks:{}};watch(page,errors);const ok=(k,v,detail)=>r.checks[k]={pass:!!v,detail};
  await page.goto(BASE+ids[i]+'.html?seed=4172');await page.waitForFunction(()=>window.Sound3?.state.frames>0);const initial=await snap(page),h0=await hash(page);
  ok('silentInitial',!initial.playing&&initial.notes===0);ok('initialCanvas',h0!==0);await page.screenshot({path:path.join(OUT,'shots',`${device}-${ids[i]}-initial.png`),fullPage:device==='mobile'});
  ok('noOverflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#play').click();await page.waitForFunction(()=>Sound3.state.playing);let peak=0;for(let n=0;n<12;n++){await wait(150);peak=Math.max(peak,(await snap(page)).peak)}
  const started=await snap(page);ok('audioStarts',started.ctx==='running'&&started.notes>0);ok('signal',peak>1e-4&&peak<.99,{peak});
  await page.locator('#mute').click();await wait(180);const mt=(await snap(page)).time;await wait(250);const muted=await snap(page);ok('muteKeepsTime',muted.time>mt+.1&&muted.peak<.002);await page.locator('#mute').click();
  await page.locator('#volume').fill('0.3');ok('volume',await page.evaluate(()=>Sound3.state.volume===.3));await page.locator('#volume').fill('0.45');
  await page.locator('#play').click();await wait(100);const p1=await snap(page),hp=await hash(page);await wait(400);const p2=await snap(page);ok('pauseFreezes',p1.time===p2.time&&hp===await hash(page));
  await page.locator('#play').click();await wait(350);ok('resumeContinuous',(await snap(page)).time>p2.time+.15);
  // Every desktop work runs until its representative event; mobile mirrors the
  // fixed-step state to avoid pretending an accelerated inspection was real time.
  if(device==='desktop')await representative(page,moments[i]);else{await page.locator('#play').click();await page.evaluate(t=>Sound3.debug.stepTo(t),[12,19,13,32,40,14,25,16][i]);}
  r.representative=await snap(page);ok('evolved',h0!==await hash(page));ok('fixedStepFollowsClock',r.representative.maxLag<.04,{maxLag:r.representative.maxLag});
  if(device==='desktop'&&r.representative.playing)await page.locator('#play').click();
  await page.screenshot({path:path.join(OUT,'shots',`${device}-${ids[i]}-representative.png`),fullPage:device==='mobile'});
  if(device==='desktop'&&process.env.SOUND3_CAPTURE_PREVIEWS==='1')await page.locator('canvas').screenshot({path:path.join(ROOT,'assets','previews',ids[i]+'.png')});
  if(i===0){const before=await page.evaluate(()=>Sound3.model.state.arch.slice());await page.locator('#chord').selectOption('2');await page.locator('#play').click();await wait(1600);ok('chordChangesArchitecture',await page.evaluate(b=>Sound3.model.state.arch.some((v,k)=>Math.abs(v-b[k])>.1),before));await page.locator('#play').click();}
  if(i===1){await page.locator('[data-voice="1"]').click();ok('voiceToggle',await page.evaluate(()=>Sound3.params.voices[1]===false));await page.locator('#weave').selectOption('1');ok('weave',await page.evaluate(()=>Sound3.params.weave===1));}
  if(i===2){await page.locator('#space').selectOption('1');ok('silenceDepthControl',await page.evaluate(()=>Sound3.params.space===1));}
  if(i===3){const seed=await page.evaluate(()=>Sound3.state.seed);await page.locator('#regenerate').click();ok('newSpecimen',await page.evaluate(s=>Sound3.state.seed!==s,seed));}
  if(i===4){await page.locator('#delta').selectOption('2');ok('phaseDifference',await page.evaluate(()=>Sound3.params.delta===2));}
  if(i===5){await page.locator('#demo').selectOption('1');ok('demoAndGallery',await page.evaluate(()=>Sound3.params.demo===1&&Sound3.model.state.gallery.length>0));}
  if(i===6){const old=await page.evaluate(()=>Sound3.model.data.source.slice());await page.locator('#origin').selectOption('1');await page.waitForFunction(x=>JSON.stringify(Sound3.model.data.source)!==JSON.stringify(x),old);ok('originMovesSource',await page.evaluate(()=>Sound3.model.data.source[0]>0&&Sound3.params.manual));await page.locator('#ping').click();await wait(1100);ok('manualPing',await page.evaluate(()=>Sound3.audio.notes>0));await page.locator('#play').click();}
  if(i===7){await page.locator('#mode').selectOption('1');ok('energyThreshold',await page.evaluate(()=>Sound3.params.mode===1));}
  const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;ok('pngExport',file.suggestedFilename().endsWith('.png'));
  await page.locator('#replay').click();await wait(180);ok('replay',await page.evaluate(()=>Sound3.state.time<.5));if((await snap(page)).playing)await page.locator('#play').click();
  await page.locator('canvas').focus();await page.keyboard.press('Space');await wait(250);ok('keyboard',await page.evaluate(()=>Sound3.state.playing));await page.keyboard.press('Space');
  const links=await page.locator('.foot nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));ok('navigation',links.length===3&&links.every(x=>fs.existsSync(path.join(ROOT,x))));
  r.scheduling=await page.evaluate(()=>({nodes:Sound3.audio.nodes.size,maxNodes:Sound3.audio.maxNodes,logs:Sound3.audio.log.slice(-8),maxLate:Math.max(0,...Sound3.audio.log.map(e=>e.late))}));ok('scheduleOnAudioClock',r.scheduling.maxLate<.012,{maxLate:r.scheduling.maxLate});
  await page.evaluate(()=>Sound3.debug.cleanup());ok('cleanup',await page.evaluate(()=>!Sound3.state.playing&&Sound3.audio.nodes.size===0));r.errors=errors;ok('noErrors',errors.length===0,errors);results.works.push(r);fs.writeFileSync(path.join(OUT,RESULT_FILE),JSON.stringify(results,null,2));console.log(device,ids[i],Object.entries(r.checks).filter(([k,v])=>!v.pass).map(([k])=>k));await page.close();
 }
 // Index after previews exist; HTML does not load any audio or render loops.
 const page=await context.newPage(),errors=[];watch(page,errors);await page.goto(BASE);const links=await page.locator('.card').count();await page.screenshot({path:path.join(OUT,'shots',`${device}-index.png`),fullPage:true});results.index.push({device,links,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors});await page.close();await context.close();
 }
 // Failure / accessibility modes, explicitly simulated.
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await ctx.newPage();await p.addInitScript(()=>{Object.defineProperty(window,'AudioContext',{value:undefined});Object.defineProperty(window,'webkitAudioContext',{value:undefined});});await p.goto(BASE+ids[0]+'.html');await p.locator('#play').click();await wait(800);results.extra.noAudio={fallback:await p.evaluate(()=>Sound3.state.failed&&Sound3.state.time>.4),notice:await p.locator('#notice').textContent()};await p.close();await ctx.close();
 const deny=await browser.newContext(),mic=await deny.newPage();await mic.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))}})});await mic.goto(BASE+ids[5]+'.html');await mic.locator('#microphone').click();await wait(800);results.extra.microphoneDenied={fallback:await mic.evaluate(()=>Sound3.state.mode==='demo'&&Sound3.state.playing),notice:await mic.locator('#notice').textContent()};await mic.close();await deny.close();
 }finally{fs.writeFileSync(path.join(OUT,RESULT_FILE),JSON.stringify(results,null,2));await browser.close()}
 const fail=results.works.flatMap(r=>Object.entries(r.checks).filter(([k,v])=>!v.pass).map(([k])=>`${r.device}/${r.id}/${k}`));console.log(JSON.stringify({works:results.works.length,fail,index:results.index,extra:results.extra},null,2));if(fail.length)process.exitCode=1;
})();
