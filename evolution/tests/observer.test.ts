import { describe, it, expect } from 'vitest';
import { Simulation, makeConfig, GENOME_LEN, rawForTrait, T_SIZE } from '../src/sim';
import { ObservationJournal, type ObservedState } from '../src/app/observer';
import { observe } from '../src/app/observer-state';
import { ObserverEditorial } from '../src/app/observer-editorial';
import { LIVE_TEMPLATES, LiveNarrator, type LiveTopic } from '../src/app/observer-templates';

const state=(patch:Partial<ObservedState>={}):ObservedState=>({seed:1,tick:100,population:90,types:[30,30,30],resources:[.7,.6],births:100,corners:5,lobes:4,forms:[[5],[4]],...patch});

describe('observer voice grounded in evidence',()=>{
  it('provides six complete variations for every live topic with facts intact and no unfilled placeholders',()=>{
    const narrator=new LiveNarrator();
    const facts={reason:'開始觀察',tick:'100',population:'90',type:'藍綠節能型',rival:'橘藍游動型',milestone:'100',before:'200',environment:'藍色食物剩約40%。',food:'藍色食物',consumer:'橘藍游動型',amount:'12%',share:'60%',actor:'粉橘多瓣型的第 101 號',change:'親代的 4 瓣，到了子代變成 5 瓣',delta:'10',ranking:'目前數量首位：藍綠節能型。',births:'本段出生紀錄：20 次。',detail:'多瓣型平均 4.5 瓣',absentTypes:'藍綠節能型、粉橘多瓣型',presentTypes:'橘藍游動型'};
    for(const topic of Object.keys(LIVE_TEMPLATES) as LiveTopic[]) {
      expect(LIVE_TEMPLATES[topic].length).toBeGreaterThanOrEqual(6);
      const lines=Array.from({length:6},()=>narrator.next(topic,facts));
      expect(new Set(lines).size).toBe(6);expect(lines.join('')).not.toMatch(/\{\w+\}|undefined|NaN/);
      if(topic.startsWith('feature')||topic==='trait') for(const line of lines) {expect(line).toContain(facts.actor);expect(line).toContain(facts.change);}
      if(topic==='overtake') for(const line of lines) {expect(line).toContain(facts.type);expect(line).toContain(facts.rival);expect(line).toContain(facts.environment);}
      expect(narrator.next(topic,facts)).toBe(lines[0]);
    }
  });
  it('fills absent and surviving groups from the current observation rather than the template',()=>{
    const narrator=new LiveNarrator();
    for(let i=0;i<6;i++) {
      const text=narrator.next('morphologyAbsent',{absentTypes:'橘藍游動型',presentTypes:'藍綠節能型、粉橘多瓣型'});
      expect(text).toContain('橘藍游動型');expect(text).toContain('藍綠節能型、粉橘多瓣型');expect(text).not.toMatch(/\{|游動型的後代/);
    }
    const j=new ObservationJournal();j.interval=20;
    j.begin(state({types:[90,0,0],corners:null,lobes:null}),0);
    for(let i=1;i<=6;i++) j.update(state({tick:100+i,types:[90,0,0],corners:null,lobes:null}),i*20);
    const line=j.entries.at(-1)!;
    expect(line.kind).toBe('summary');expect(line.text).toContain('目前沒有藍綠節能型、粉橘多瓣型');expect(line.text).toContain('橘藍游動型的後代');
  });
  it('advances variations only for published lines, independent of the number of candidate births',()=>{
    const j=new ObservationJournal();j.interval=100000;j.begin(state(),0);
    for(let i=0;i<6;i++) {
      const features=Array.from({length:3},(_,k)=>({id:1000+i*3+k,parent:1,tick:101+i*10+k,type:2,feature:'lobes' as const,before:3,after:4}));
      j.update(state({tick:110+i*10,features}),(i+1)*50);
    }
    const lines=j.entries.filter(e=>e.kind==='event').map(e=>e.text.replace(/第 \d+ 號/g,'第 X 號'));
    expect(lines).toHaveLength(6);expect(new Set(lines).size).toBe(6);
  });
  it('interleaves measured summaries with science, guides, character wishes and existing chatter',()=>{
    const j=new ObservationJournal();j.interval=20;j.begin(state(),0);
    for(let i=1;i<=8;i++) j.update(state({tick:100+i}),i*20);
    expect(j.entries.slice(1).map(e=>e.kind)).toEqual(['summary','knowledge','summary','aside','guide','summary','reflection','knowledge']);
    expect(j.entries.find(e=>e.kind==='knowledge')?.text).toContain('橘藍游動型');
    expect(j.entries.find(e=>e.kind==='guide')?.text).toContain('個體面板');
    expect(j.entries.find(e=>e.kind==='reflection')?.text).toContain('我喜歡');
  });
  it('skips absent-type introductions and rotates each editorial category independently',()=>{
    const editorial=new ObserverEditorial(), s=state({types:[30,0,0]});
    const science=Array.from({length:6},()=>editorial.next('knowledge',s));
    expect(new Set(science).size).toBe(6);
    expect(science.join('')).not.toMatch(/認識.*藍綠節能型|粉橘多瓣型像|節能型細胞核|每一瓣|節能型沒有|多瓣型的瓣數/);
    expect(editorial.next('guide',s)).toContain('直接點牠');
    expect(editorial.next('reflection',s)).toContain('我喜歡');
  });
  it('reports a recorded newborn morphology without claiming adaptation or speciation',()=>{
    const j=new ObservationJournal();j.begin(state(),0);
    j.update(state({tick:110,features:[{id:101,parent:10,tick:105,type:2,feature:'lobes',before:4,after:5}]}),10);
    const entry=j.entries.at(-1)!;
    expect(entry.text).toContain('這次觀察還沒見過');expect(entry.text).toContain('4 瓣');expect(entry.text).toContain('5 瓣');
    expect(entry.text).toContain('粉橘多瓣型');expect(entry.text).toContain('出生時');
    expect(entry.tick).toBe(110);expect(entry.evidence.features?.[0].tick).toBe(105);
    expect(entry.text).not.toMatch(/適應成功|新物種|打敗/);
    j.update(state({tick:120,features:[{id:102,parent:10,tick:90,type:2,feature:'lobes',before:4,after:6}]}),20);
    expect(j.entries).toHaveLength(2);
  });
  it('describes an overtake as population ranking, with measured food conditions',()=>{
    const j=new ObservationJournal();j.begin(state({types:[40,30,20]}),0);
    j.update(state({tick:110,types:[30,40,20],resources:[.4,.3]}),10);
    expect(j.entries.at(-1)?.text).toContain('藍綠節能型在數量上超過橘藍游動型');
    expect(j.entries.at(-1)?.text).toContain('藍色食物剩約40%');
    expect(j.entries.at(-1)?.text).toContain('不能證明');
  });
  it('gives fictional asides their own kind and keeps the scheduled voice during events',()=>{
    const j=new ObservationJournal();j.interval=20;j.begin(state(),0);
    for(let i=1;i<=4;i++) j.update(state({tick:100+i}),i*20);
    expect(j.entries.at(-1)?.kind).toBe('aside');expect(j.entries.at(-1)?.text).toContain('咖啡又涼了');
    expect(j.entries.map(e=>e.text).join('')).not.toMatch(/tick|resource|generalist/i);
    const busy=new ObservationJournal();busy.interval=20;busy.begin(state(),0);
    busy.update(state({tick:101,features:[{id:101,parent:1,tick:101,type:2,feature:'lobes',before:4,after:5}]}),19);
    busy.update(state({tick:102}),28);
    expect(busy.entries.at(-1)?.kind).toBe('summary');
  });
  it('does not call a baseline shape newly seen and throttles ordinary mutation chatter',()=>{
    const j=new ObservationJournal();j.begin(state(),0);
    const feature={id:101,parent:1,tick:110,type:2,feature:'lobes' as const,before:3,after:4};
    j.update(state({tick:110,features:[feature]}),10);
    expect(j.entries.at(-1)?.text).not.toContain('還沒見過');
    j.update(state({tick:120,features:[{...feature,id:102,tick:120}]}),20);
    expect(j.entries).toHaveLength(2);
  });
});

describe('read-only newborn evidence collection',()=>{
  it('compares true recorded parents, excludes old births and missing ancestry',()=>{
    const sim=new Simulation(makeConfig({founders:{count:3}}));sim.tick=10;
    const g=new Float64Array(GENOME_LEN);
    sim.lineage.birth(10000,-1,0,2,0,4,g);
    sim.lineage.birth(10001,10000,5,2,0,5,g);
    sim.lineage.birth(10002,99999,6,2,0,6,g);
    const before=sim.stateHash();
    expect(observe(sim,0).features).toEqual([{id:10001,parent:10000,tick:5,type:2,feature:'lobes',before:4,after:5}]);
    expect(observe(sim).features).toEqual([]);
    sim.lineage.nodes.get(10001)!.gap=1;
    expect(observe(sim,0).features).toEqual([]);
    sim.lineage.nodes.get(10001)!.gap=0;
    expect(sim.stateHash()).toBe(before);
  });
  it('reports a substantial inherited continuous trait difference without counting decorative markers',()=>{
    const sim=new Simulation(makeConfig({founders:{count:3}}));sim.tick=10;
    const parent=new Float64Array(GENOME_LEN),child=parent.slice();
    parent[T_SIZE]=rawForTrait(T_SIZE,.8);child[T_SIZE]=rawForTrait(T_SIZE,1.2);
    sim.lineage.birth(10000,-1,0,0,0,0,parent);sim.lineage.birth(10001,10000,5,0,0,0,child);
    const before=sim.stateHash(), features=observe(sim,0).features!;
    expect(features[0].feature).toBe('size');expect(features[0].after/features[0].before).toBeCloseTo(1.5);
    expect(sim.stateHash()).toBe(before);
  });
});
