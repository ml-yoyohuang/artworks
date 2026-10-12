const {chromium} = require(process.env.PLAYWRIGHT_MODULE);
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:8766/sound/vol1/';
const output = path.join(__dirname, '_qa');
fs.mkdirSync(output, {recursive:true});

(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    const works = JSON.parse(fs.readFileSync(path.join(__dirname, 'selections.json'))).works;
    for (const w of works) {
      const page = await browser.newPage({viewport:{width:1440,height:1000}});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => {if(r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);});
      await page.goto(base+w.page);
      await page.waitForFunction(() => !!(window.Sound3 || window.Sound4));
      const before = await page.evaluate(() => {
        const s = window.Sound3 || window.Sound4;
        return {ctx:!!(s.audio || s.engine).ctx, overflow:document.documentElement.scrollWidth > innerWidth};
      });
      assert.equal(before.ctx,false);
      assert.equal(before.overflow,false);
      await page.locator(w.source==='test2'?'#start':'#play').click();
      await page.waitForFunction(() => (window.Sound3 || window.Sound4).state.playing);
      await page.waitForTimeout(w.id==='01'?9100:500);
      const playing = await page.evaluate(() => {
        const s = window.Sound3 || window.Sound4, engine=s.audio || s.engine;
        return {time:s.state.time, context:engine.ctx?.state, level:engine.level()};
      });
      assert.equal(playing.context,'running');
      assert.ok(playing.time > 0);
      if (w.id==='01') {
        assert.ok(playing.level > 0,'hybrid audio output');
        assert.equal(await page.evaluate(()=>Sound3.model.state.chordName),'Am9');
        await page.screenshot({path:path.join(output,'01-hybrid-desktop.png'),fullPage:true});
        await page.locator('#play').click();
        const paused = await page.evaluate(()=>Sound3.state.time);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(()=>Sound3.state.time),paused);
        const model = await page.evaluate(async () => {
          const {architectureScore,architectureDuration} = await import('./assets/hybrid1/js/score.js');
          const events=architectureScore().events;
          Sound3.debug.stepTo(56.2);
          const last=Sound3.model.state.chordName;
          Sound3.debug.stepTo(64.2);
          return {duration:architectureDuration,pads:events.filter(e=>e.voice==='architecture-pad').length,
            bells:events.filter(e=>e.voice==='architecture-bell').length,last,loop:Sound3.model.state.chordName,
            arch:Sound3.model.state.arch};
        });
        assert.equal(model.duration,64); assert.equal(model.pads,40); assert.equal(model.bells,32);
        assert.equal(model.last,'Gsus4'); assert.equal(model.loop,'Cmaj7');
        assert.ok(model.arch.every(Number.isFinite));
        // Compare migrated music against test2's actual scheduler, not a duplicate fixture.
        const exactScore = await page.evaluate(async () => {
          const original = await (await fetch('../test2/assets/js/works/01-architecture.js')).text();
          const {BAR,SETS} = await import('../test2/assets/js/models/architecture.js');
          const {architectureScore} = await import('./assets/hybrid1/js/score.js');
          const scheduler = original.slice(original.indexOf('  schedule(from, to, api) {'),
                                           original.indexOf('  onEvent(ev, api) {'));
          const chordAt=(tl,k)=>SETS[tl.set].chords[(tl.idx+k)%SETS[tl.set].chords.length];
          const reference=Function('BAR','SETS','ENTRY','BELLS','chordAt',`return ({${scheduler}})`)
            (BAR,SETS,[0,0.45,0.95,1.5],[[2.6,2],[3.2,3],[3.8,1],[5.6,3],[6.2,2]],chordAt);
          const expected=[];
          reference.timeline={start:0,set:0,idx:0};
          reference.schedule(0,64,{audible:true,at:t=>t,emit:()=>{},engine:{
            pad:(t,midi,dur,vel,options)=>{expected.push({type:'pad',t,midi,dur,vel,options});return {end:Infinity};},
            bell:(t,midi,vel,options)=>expected.push({type:'bell',t,midi,vel,options})
          }});
          const actual=architectureScore().events.filter(e=>e.v>0).map(e=>e.voice==='architecture-pad'?
            {type:'pad',t:e.t,midi:e.notes[0],dur:e.d,vel:e.v,options:e.options}:
            {type:'bell',t:e.t,midi:e.notes[0],vel:e.v,options:e.options});
          const sorted=a=>a.sort((x,y)=>x.t-y.t);
          return JSON.stringify(sorted(expected))===JSON.stringify(sorted(actual));
        });
        assert.equal(exactScore,true,'all migrated notes, envelopes and timbres match test2 scheduler');
        await page.locator('#replay').click();
        await page.waitForFunction(()=>Sound3.state.playing);
        await page.locator('#chord').selectOption('7');
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(()=>Sound3.model.state.chordName),'Gsus4');
        await page.locator('[data-passage="1"]').click();
        assert.equal(await page.evaluate(()=>Sound3.params.manual),true);
        await page.locator('#auto-mode').click();
        assert.equal(await page.evaluate(()=>Sound3.params.manual),false);
        await page.locator('#soundtrack').selectOption('canon');
        await page.waitForTimeout(250);
        assert.ok(await page.evaluate(()=>Sound3.model.state.arch.every(Number.isFinite)));
        await page.locator('#soundtrack').selectOption('');
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(()=>Sound3.model.state.chordName),'Gsus4');
        await page.locator('#mute').click();
        assert.equal(await page.evaluate(()=>Sound3.audio.music.muted),true);
        await page.locator('#mute').click();
        results.push({id:w.id,source:'hybrid',playing,model,exactScore});
      } else results.push({id:w.id,source:w.source,playing});
      assert.deepEqual(errors,[],w.page);
      await page.close();
    }
    const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.goto(base+works[0].page);
    await mobile.waitForFunction(()=>window.Sound3);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await mobile.screenshot({path:path.join(output,'01-hybrid-mobile.png'),fullPage:true});
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({pass:true,results},null,2)+'\n');
    console.log('PASS: eight works load/play; hybrid chord clock, 64s loop, controls, classical selection, mute and mobile layout.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
