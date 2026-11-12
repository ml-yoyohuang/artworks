import { Simulation, expressPhenotype, type Organism, type Snapshot } from '../sim';
import { runExperiment, detectChanges, type ExperimentResult, type ExperimentManifest, type Discovery } from '../sim/research';
import { portrait } from './creatures';
import { confirmAction } from './dialog';
import { t, typeName, getLanguage } from './i18n';

const scenarioName=(name:string)=>t(({'A-rich':'藍食較多','B-rich':'綠食較多',mixed:'混合','no mutation':'無突變','default mutation':'一般突變',uniform:'均勻分布',patchy:'斑塊分布'} as Record<string,string>)[name]??name,name);
const discoveryNames:Record<string,string>={
  'extinction: positive population becomes zero':'全滅：現存數量由正數降至零',
  'population crash: >50% decline between recorded samples':'人口驟減：相鄰樣本間下降超過50%',
  'ecological type extinction: type population becomes zero':'類別退場：該類現存數量歸零',
  'trait diversity: raw gene variance falls >50% between samples':'特徵多樣性下降：相鄰樣本的基因變異數減少超過50%',
  'one founding lineage remains (not a new species)':'只剩一個起始家族（不表示形成新物種）',
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export function downloadJson(name: string, value: unknown): void {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 1)], { type: 'application/json' }));
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class Laboratory {
  private controller?: AbortController;
  private results: ExperimentResult[] = [];
  private checkpoints: Snapshot[] = [];
  private discoveries: Discovery[] = [];
  private lastSampleTick = -1;
  private lastWorld?: Simulation;
  private lineageKey = '';
  private status:()=>string=()=>t('準備就緒，尚未進行比較。','Ready. No experiments run yet.');
  languageChanged(selected?:Organism|null) {this.lineageKey='';this.renderCheckpoints();this.renderResults();$('lab-status').textContent=this.status();this.refresh(selected);}
  constructor(private getSim: () => Simulation, private replace: (sim: Simulation) => void, private select: (id: number) => void, private suspend: () => () => void) {
    $('lab-run').onclick = () => { void this.run(); };
    $('lab-cancel').onclick = () => this.controller?.abort();
    $('lab-export').onclick = () => downloadJson('evolution-experiments-v2.json', { results: this.results });
    $('checkpoint-add').onclick = () => {
      this.checkpoints.push(this.getSim().snapshot()); if (this.checkpoints.length > 3) this.checkpoints.shift(); this.renderCheckpoints();
    };
  }
  private renderCheckpoints() {
    $('checkpoints').replaceChildren();
    this.checkpoints.forEach(snap => {
      const b = document.createElement('button'); b.className = 'pill'; b.textContent = t(`種子 ${snap.cfg.seed} · 第 ${snap.tick} 步`,`Seed ${snap.cfg.seed} · tick ${snap.tick}`);
      b.onclick = async () => { if (await confirmAction({ title:t('回復這個觀察時點？','Restore this checkpoint?'),message:t(`將回到種子 ${snap.cfg.seed}、第 ${snap.tick} 步的完整狀態，目前未儲存的進度會被取代。`,`Replace the current state with seed ${snap.cfg.seed}, tick ${snap.tick}? Unsaved progress will be replaced.`),accept:t('回復狀態','Restore'),cancel:t('繼續觀察','Keep observing') })) this.replace(Simulation.restore(snap)); };
      $('checkpoints').append(b);
    });
  }
  private async run() {
    const ticks = Number($<HTMLInputElement>('lab-ticks').value), repeats = Number($<HTMLInputElement>('lab-replicates').value), seed = Number($<HTMLInputElement>('lab-seed').value);
    if (!Number.isInteger(ticks) || ticks < 100 || ticks > 1e6 || !Number.isInteger(repeats) || repeats < 1 || repeats > 8 || !Number.isSafeInteger(seed)) {this.status=()=>t('請填入100–1,000,000步、1–8次重複與整數種子。','Use 100–1,000,000 ticks, 1–8 replicates, and an integer seed.');$('lab-status').textContent=this.status();return;}
    const config = JSON.parse(JSON.stringify(this.getSim().cfg));
    if (config.model < 2) {this.status=()=>t('這些比較需要三類生物的觀察箱。請新開觀察箱；早期實驗仍可用 npm run exp 執行。','These comparisons need a three-type world. Start a new world to run them; legacy experiments remain available through npm run exp.');$('lab-status').textContent=this.status();return;}
    const resume = this.suspend(), abort = this.controller = new AbortController(); this.results = [];
    $<HTMLButtonElement>('lab-run').disabled = true; $<HTMLButtonElement>('lab-cancel').disabled = false; $<HTMLButtonElement>('lab-export').disabled = true;
    const scenario = $<HTMLSelectElement>('lab-scenario').value;
    const variants = scenario === 'resources' ? ['A-rich', 'B-rich', 'mixed'] : scenario === 'mutation' ? ['no mutation', 'default mutation'] : ['uniform', 'patchy'];
    try {
      for (const name of variants) for (let replicate = 0; replicate < repeats && !abort.signal.aborted; replicate++) {
        const cfg = JSON.parse(JSON.stringify(config)); cfg.seed = seed + replicate;
        if (scenario === 'resources') { const total = cfg.env.cellCapacity + cfg.resourceB.cellCapacity; cfg.env.cellCapacity = total * (name === 'A-rich' ? .8 : name === 'B-rich' ? .2 : .5); cfg.resourceB.cellCapacity = total - cfg.env.cellCapacity; }
        if (name === 'no mutation') { cfg.mutation.rate = 0; cfg.morph.corners.mutationRate = 0; cfg.morph.lobes.mutationRate = 0; }
        if (scenario === 'spatial') { cfg.patchiness = name === 'uniform' ? 0 : .8; cfg.resourceB.patchiness = cfg.patchiness; }
        const manifest: ExperimentManifest = { version: 1, name, config: cfg, ticks, interventions: [] };
        const r = await runExperiment(manifest, { signal: abort.signal, progress: (step, total) => {this.status=()=>t(`${scenarioName(name)}，種子 ${cfg.seed} · ${step.toLocaleString()}／${total.toLocaleString()} 步`,`${name}, seed ${cfg.seed} · ${step.toLocaleString()} / ${total.toLocaleString()} ticks`);$('lab-status').textContent=this.status();} });
        this.results.push(r); this.renderResults();
      }
      this.status=()=>t(`${abort.signal.aborted?'已取消，保留部分結果':'已完成'} · ${this.results.length} 次比較。匯出包含完整條件、讀數、校驗碼與觀察規則。`,`${abort.signal.aborted ? 'Cancelled; partial results retained' : 'Complete'} · ${this.results.length} runs. Export includes configurations, measurements, hashes and detection rules.`);$('lab-status').textContent=this.status();
    } catch (err) {this.status=()=>t(`實驗已停止：${err}`,`Experiment stopped: ${err}`);$('lab-status').textContent=this.status();}
    finally { this.controller = undefined; $<HTMLButtonElement>('lab-run').disabled = false; $<HTMLButtonElement>('lab-cancel').disabled = true; $<HTMLButtonElement>('lab-export').disabled = !this.results.length; resume(); }
  }
  private renderResults() {
    $('lab-results').replaceChildren();
    for (const r of this.results) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = t(`${scenarioName(r.manifest.name)}，種子 ${r.manifest.config.seed}：第 ${r.tick} 步${r.status==='complete'?'完成':'取消'} · 三群數量 ${r.final.typePop.join('／')} · 觀察末段持續存活 ${r.persistentTypes?'是':'否'} · 能量帳誤差 ${r.energyRelativeError.toExponential(1)} · 每秒 ${Math.round(r.performance.ticksPerSecond)} 步`,`${r.manifest.name}, seed ${r.manifest.config.seed}: ${r.status} at ${r.tick} ticks · populations ${r.final.typePop.join(' / ')} · persistence ${r.persistentTypes ? 'yes' : 'no'} · ledger error ${r.energyRelativeError.toExponential(1)} · ${Math.round(r.performance.ticksPerSecond)} ticks/s`); $('lab-results').append(p); }
  }
  refresh(selected?: Organism | null): void {
    const sim = this.getSim(), samples = sim.history, last = samples[samples.length - 1];
    if (sim !== this.lastWorld) { this.lastWorld = sim; this.lastSampleTick = last.tick; this.discoveries = []; this.lineageKey = ''; }
    else if (last.tick !== this.lastSampleTick) {
      const prev = samples[samples.length - 2]; if (prev) this.discoveries.push(...detectChanges(prev, last));
      this.discoveries = this.discoveries.slice(-50); this.lastSampleTick = last.tick;
    }
    $('discoveries').replaceChildren();
    for (const e of this.discoveries) { const li = document.createElement('li');const values=Object.entries(e.values).map(([key,value])=>`${t(({before:'先前',after:'目前',type:'類別'} as Record<string,string>)[key]??key,key)}：${Array.isArray(value)?value.join('／'):value}`).join('，');li.textContent = t(`第 ${e.tick} 步：${discoveryNames[e.rule]??e.rule}。${values}。樣本間的變化不等於因果、適應成功或新物種形成。`,`Tick ${e.tick}: ${e.rule}. ${JSON.stringify(e.values)}. ${e.limitation}`); $('discoveries').append(li); }
    if (!this.discoveries.length) { const li = document.createElement('li'); li.textContent = t('開啟這箱後，尚未遇到達到記錄門檻的變化。','No rule-triggered observations since opening this world.'); $('discoveries').append(li); }
    if (!selected || !$<HTMLDetailsElement>('ancestry').open) return;
    const chain = sim.lineage.chain(selected.id), key = `${getLanguage()}-${selected.id}-${chain.map(n => `${n.id}:${n.gap}:${n.children}`).join(',')}`;
    if (key === this.lineageKey) return; this.lineageKey = key;
    const ancestorCanvas = $<HTMLCanvasElement>('ancestor-portrait');
    ancestorCanvas.width = ancestorCanvas.width;
    $('lineage-list').replaceChildren(); $('ancestor-caption').textContent = t('點選保留紀錄的祖先預覽外形；過去的能量與行為不會被補寫。','Select a recorded ancestor for a morphology preview; historical energy and behaviour are not reconstructed.');
    const add = (id: number, label: string, action: () => void) => { const b = document.createElement('button'); b.className = 'link'; b.textContent = `${label} #${id}`; b.onclick = action; $('lineage-list').append(b, document.createElement('br')); };
    for (const node of chain.slice(0, 24)) add(node.id, t(`${node.deathTick<0?'仍在活動':'祖先'} · 生於第 ${node.birthTick} 步${node.gap?` · 親代之前缺 ${node.gap} 代`:''}`,`${node.deathTick < 0 ? 'Living' : 'Ancestor'} · born ${node.birthTick}${node.gap ? ` · ${node.gap} omitted before parent` : ''}`), () => {
      if (!node.genome || node.type < 0) { ancestorCanvas.width = ancestorCanvas.width; $('ancestor-caption').textContent = t(`#${node.id}：未留下基因／外形資料，無法預覽。`,`#${node.id}: genotype/morphology not recorded; no preview available.`); return; }
      const ph = expressPhenotype(node.genome, sim.cfg, node.type, node.corners, node.lobes);
      const preview = { ...selected, id: node.id, genome: node.genome, type: node.type, corners: node.corners, lobes: node.lobes, ph, speed: 0, energy: ph.capacity * .5 };
      portrait($<HTMLCanvasElement>('ancestor-portrait'), preview, sim.cfg.sensorAngle, 0);
      $('ancestor-caption').textContent = t(`#${node.id} · ${typeName(node.type)} · 角數 ${node.corners||'—'}、瓣數 ${node.lobes||'—'} · 依保留基因預覽；能量以50%呈現，不是當時的能量紀錄。`,`#${node.id} · ${sim.cfg.types[node.type].name} · corners ${node.corners || 'n/a'}, lobes ${node.lobes || 'n/a'} · recorded genotype preview; energy fixed at 50%, not an observed historical reserve.`);
    });
    for (const child of sim.lineage.childrenOf(selected.id).slice(0, 8)) if (sim.orgs.some(o => o.id === child.id)) add(child.id, t('仍在活動的子代','Living child'), () => this.select(child.id));
    $('lineage-status').textContent = t(`保留家族鏈 ${chain.length} 代（顯示前24代），現存後代 ${sim.lineage.livingDescendants(selected.id)}。已清除 ${sim.lineage.prunedCount} 個絕嗣節點，疏整 ${sim.lineage.thinnedCount} 個祖先節點。缺失分支不會補寫。${sim.migratedFrom?'早期祖先未留下基因資料。':''}`,`Recorded chain ${chain.length} (first 24 shown). Living descendants ${sim.lineage.livingDescendants(selected.id)}. Extinct nodes pruned ${sim.lineage.prunedCount}; ancestors thinned ${sim.lineage.thinnedCount}. Missing branches cannot be reconstructed.${sim.migratedFrom ? ' Legacy ancestor genes were not recorded.' : ''}`);
    $('spec-genome').textContent = `${t('連續基因（依序為特徵、行為權重）：','Continuous genes (traits first, then controller weights):')}\n${Array.from(selected.genome).map(v => v.toFixed(4)).join(', ')}`;
  }
}
