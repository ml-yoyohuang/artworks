/** Session-only commentary. Biological claims are measured; fictional character asides are labeled. */
import { ObserverEditorial } from './observer-editorial';
import { LiveNarrator, type LiveTopic } from './observer-templates';
export interface BirthFeature { id: number; parent: number; tick: number; type: number; feature: 'corners' | 'lobes' | 'size' | 'speed' | 'sense'; before: number; after: number }
export interface ObservedState {
  seed: number; tick: number; population: number; types: number[];
  resources: [number | null, number | null]; births: number;
  corners: number | null; lobes: number | null;
  features?: BirthFeature[];
  forms?: [number[], number[]];
}
export interface ObservationEntry { sequence: number; seconds: number; seed: number; tick: number; text: string; kind: 'start' | 'summary' | 'event' | 'aside' | 'knowledge' | 'guide' | 'reflection'; evidence: ObservedState }
export const TYPE_NAMES = ['橘藍游動型', '藍綠節能型', '粉橘多瓣型'];
const pct = (v: number) => `${Math.round(v * 100)}%`;
const FOOD = ['藍色食物', '綠色食物'];
const ASIDES = [
  '我原本只打算看一眼，結果咖啡又涼了。你也有偷偷替某一群加油嗎？我先不說我押誰。',
  '同事說「再看一分鐘就下班」，我已經替這句話畫了三條底線。這句話比細胞還會繁殖。',
  '我的觀察筆記有一頁專門記「看起來很有前途的傢伙」。目前最常出現的批註是：先別急著下結論。',
  '有人提議替每一顆細胞取名字。我看了看出生速度，默默把命名簿換成了厚一點的。',
  '今天提醒自己：長得可愛不代表比較會生存。但如果你問我有沒有偏心……我可能需要再喝一口咖啡。',
  '每次以為摸清這個小世界，它就換個樣子給我看。這大概就是我一直捨不得關燈的原因。',
];

export class ObservationJournal {
  entries: ObservationEntry[] = [];
  interval = 60;
  private sequence = 0;
  private previous?: ObservedState;
  private anchor?: ObservedState;
  private lastLine = 0;
  private lastSummary = 0;
  private topic = 0;
  private pending = new Map<string, { state: ObservedState; seconds: number; topic: LiveTopic; facts: Record<string,string|number> }>();
  private milestones = new Set<number>();
  private scarce = [false, false];
  private dominant = -1;
  private aside = 0;
  private lastFeatureAt = -Infinity;
  private seenForms = [new Set<number>(), new Set<number>()];
  private editorial = new ObserverEditorial();
  private narrator = new LiveNarrator();

  begin(state: ObservedState, seconds: number, reason = '開始觀察', record = true): void {
    this.previous = state; this.anchor = state; this.pending.clear(); this.milestones.clear();
    this.scarce = state.resources.map(v => v !== null && v < .15);
    this.dominant = this.leader(state); this.lastLine = seconds; this.lastSummary=seconds;
    this.seenForms = (state.forms ?? [[], []]).map(values => new Set(values)); this.topic = 0; this.lastFeatureAt=seconds-45;
    if (record) this.add(state, seconds, this.narrator.next('start',{reason,tick:state.tick.toLocaleString(),population:state.population.toLocaleString()}), 'start');
  }
  private leader(s: ObservedState): number { return s.population ? s.types.findIndex(n => n / s.population > .55) : -1; }
  private add(state: ObservedState, seconds: number, text: string, kind: ObservationEntry['kind']) {
    this.entries.push({ sequence: ++this.sequence, seconds, seed: state.seed, tick: state.tick, text, kind, evidence: { ...state, types: state.types.slice(), resources: [...state.resources], features: state.features?.map(f=>({...f})), forms: state.forms?.map(a=>a.slice()) as ObservedState['forms'] } });
    if (this.entries.length > 200) this.entries.shift();
  }
  update(state: ObservedState, seconds: number): void {
    if (!this.previous || !this.anchor) { this.begin(state, seconds); return; }
    const prev = this.previous, anchor = this.anchor;
    // A backward clock is an explicit observation boundary, not a historical event to narrate.
    if (state.seed !== prev.seed || state.tick < prev.tick) { this.begin(state, seconds, '切換觀察時點'); return; }
    if (state.tick === prev.tick) return;
    const event = (key: string, topic: LiveTopic, facts: Record<string,string|number>) => { if (!this.pending.has(key)) this.pending.set(key, { state, seconds, topic, facts }); };
    if (prev.population > 0 && state.population === 0) {
      this.add(state, seconds, this.narrator.next('extinction',{}), 'event');
      this.pending.clear(); this.lastLine = seconds; this.anchor = state;
    } else {
      for (const f of state.features ?? []) {
        if (f.tick <= prev.tick || f.tick > state.tick) continue;
        const discrete = f.feature === 'corners' || f.feature === 'lobes';
        const index = f.feature === 'corners' ? 0 : 1;
        const fresh = discrete && !this.seenForms[index].has(f.after);
        if (discrete) this.seenForms[index].add(f.after);
        if (!fresh && seconds-this.lastFeatureAt<45) continue;
        const label = f.feature === 'corners' ? '角' : '瓣';
        const change = discrete ? `親代的 ${f.before} ${label}，到了子代變成 ${f.after} ${label}` : `${f.feature === 'size' ? '體型' : f.feature === 'speed' ? '最高游速' : '感知範圍'}比親代${f.after > f.before ? '增加' : '減少'}了約 ${pct(Math.abs(f.after/f.before-1))}`;
        const topic: LiveTopic=discrete ? fresh?'featureNew':'featureKnown' : 'trait';
        const facts={actor:`${TYPE_NAMES[f.type]}的第 ${f.id} 號`,change};
        if (!this.pending.has('feature') || fresh) this.pending.set('feature', {state: {...state,features:[f]},seconds,topic,facts});
      }
      state.forms?.forEach((values,i)=>values.forEach(value=>this.seenForms[i].add(value)));
      for (let i = 0; i < 3; i++) if (prev.types[i] > 0 && state.types[i] === 0) event(`type-${i}`, 'typeExtinction',{type:TYPE_NAMES[i]});
      for (const n of [100, 500, 1000, 2000]) if (prev.population < n && state.population >= n && !this.milestones.has(n)) { this.milestones.add(n); event('milestone','milestone',{milestone:n.toLocaleString(),population:state.population.toLocaleString()}); }
      if (anchor.population >= 20 && state.population < anchor.population * .6) event('crash','crash',{before:anchor.population,population:state.population,environment:this.environment(state)});
      for (let i = 0; i < 2; i++) {
        const value = state.resources[i]; if (value === null) continue;
        if (!this.scarce[i] && value < .15) { this.scarce[i] = true; event(`resource-${i}`,'scarcity',{food:FOOD[i],amount:pct(value),consumer:i===0?'偏愛這份食物的橘藍游動型':'主要吃這份食物的藍綠節能型'}); }
        else if (this.scarce[i] && value > .35) { this.scarce[i] = false; event(`resource-${i}`,'recovery',{food:FOOD[i],amount:pct(value)}); }
      }
      const leader = this.leader(state);
      if (leader >= 0 && leader !== this.dominant) { this.dominant = leader; event('leader','leader',{type:TYPE_NAMES[leader],share:pct(state.types[leader]/state.population),environment:this.environment(state)}); }
      const front = this.front(state), oldFront = this.front(prev);
      if (front >= 0 && oldFront >= 0 && front !== oldFront && prev.types[oldFront] > 0 && state.types[oldFront] > 0 && state.types[front] >= 10)
        event('overtake','overtake',{type:TYPE_NAMES[front],rival:TYPE_NAMES[oldFront],environment:this.environment(state)});
      const summaryDue=seconds-this.lastSummary>=this.interval && state.population>0;
      if (this.pending.size && seconds - this.lastLine >= 8 && !summaryDue) {
        const [key, line] = this.pending.entries().next().value!;
        this.pending.delete(key); this.add(line.state, line.seconds, this.narrator.next(line.topic,line.facts), 'event'); this.lastLine = seconds; this.anchor = state;
        if(key==='feature') this.lastFeatureAt=seconds;
      } else if (summaryDue && seconds-this.lastLine>=8) {
        const topic = this.topic++ % 8;
        const kind: ObservationEntry['kind'] = topic===1 || topic===7 ? 'knowledge' : topic===3 ? 'aside' : topic===4 ? 'guide' : topic===6 ? 'reflection' : 'summary';
        const text = kind==='aside' ? ASIDES[this.aside++ % ASIDES.length] : kind==='knowledge' || kind==='guide' || kind==='reflection' ? this.editorial.next(kind,state) : this.summary(state,anchor,topic===0?0:topic===2?1:2);
        this.add(state, seconds, text, kind); this.lastLine = seconds; this.lastSummary=seconds; this.anchor = state;
      }
    }
    this.previous = state;
  }
  private front(s: ObservedState): number {
    const max = Math.max(...s.types); return max > 0 && s.types.filter(n=>n===max).length === 1 ? s.types.indexOf(max) : -1;
  }
  private environment(s: ObservedState): string {
    const active = s.resources.flatMap((v,i)=>v === null ? [] : [{v,name:FOOD[i]}]);
    return active.length ? `食物存量：${active.map(r=>`${r.name}剩約${pct(r.v)}${r.v<.15?'（稀少）':''}`).join('、')}。` : '兩類食物目前都沒有供應。';
  }
  private summary(s: ObservedState, a: ObservedState, topic: number): string {
    if (topic === 0) {
      const delta = s.population-a.population, front = this.front(s);
      return this.narrator.next(delta>0?'grow':delta<0?'fall':'steady',{delta:Math.abs(delta),population:s.population,ranking:front>=0?`目前數量首位：${TYPE_NAMES[front]}。`:'目前首位並列。',births:Number.isFinite(s.births)&&Number.isFinite(a.births)?`本段出生紀錄：${Math.max(0,s.births-a.births)} 次。`:'本段出生次數未完整記錄。'});
    }
    if (topic === 1) return this.narrator.next('resource',{environment:this.environment(s)});
    const detail = ([['節能型',s.corners,a.corners,'角'],['多瓣型',s.lobes,a.lobes,'瓣']] as const).flatMap(([name,now,old,unit])=>now===null?[]:[`${name}平均 ${now.toFixed(1)} ${unit}${old!==null&&Math.abs(now-old)>=.15 ? `，比上一段偏向${now>old ? '更多' : '更少'}${unit}的外形` : ''}`]);
    return this.narrator.next(detail.length?'morphology':'morphologyAbsent',{
      detail:detail.join('；'),
      absentTypes:TYPE_NAMES.filter((_,i)=>s.types[i]===0).join('、'),
      presentTypes:TYPE_NAMES.filter((_,i)=>s.types[i]>0).join('、'),
    });
  }
}
