import { Simulation, expressPhenotype, type Organism, type Snapshot } from '../sim';
import { runExperiment, detectChanges, type ExperimentResult, type ExperimentManifest, type Discovery } from '../sim/research';
import { portrait } from './creatures';
import { confirmAction } from './dialog';

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
      const b = document.createElement('button'); b.className = 'pill'; b.textContent = `Seed ${snap.cfg.seed} · tick ${snap.tick}`;
      b.onclick = async () => { if (await confirmAction({ title: '回復這個觀察時點？', message: `將回到種子 ${snap.cfg.seed}、tick ${snap.tick} 的完整狀態，目前未儲存的進度會被取代。`, accept: '回復狀態', cancel: '繼續觀察' })) this.replace(Simulation.restore(snap)); };
      $('checkpoints').append(b);
    });
  }
  private async run() {
    const ticks = Number($<HTMLInputElement>('lab-ticks').value), repeats = Number($<HTMLInputElement>('lab-replicates').value), seed = Number($<HTMLInputElement>('lab-seed').value);
    if (!Number.isInteger(ticks) || ticks < 100 || ticks > 1e6 || !Number.isInteger(repeats) || repeats < 1 || repeats > 8 || !Number.isSafeInteger(seed)) { $('lab-status').textContent = 'Use 100–1,000,000 ticks, 1–8 replicates, and an integer seed.'; return; }
    const config = JSON.parse(JSON.stringify(this.getSim().cfg));
    if (config.model < 2) { $('lab-status').textContent = 'These comparisons need a three-type world. Start a new world to run them; legacy experiments remain available through npm run exp.'; return; }
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
        const r = await runExperiment(manifest, { signal: abort.signal, progress: (t, total) => { $('lab-status').textContent = `${name}, seed ${cfg.seed} · ${t.toLocaleString()} / ${total.toLocaleString()} ticks`; } });
        this.results.push(r); this.renderResults();
      }
      $('lab-status').textContent = `${abort.signal.aborted ? 'Cancelled; partial results retained' : 'Complete'} · ${this.results.length} runs. Export includes configurations, measurements, hashes and detection rules.`;
    } catch (err) { $('lab-status').textContent = `Experiment stopped: ${err}`; }
    finally { this.controller = undefined; $<HTMLButtonElement>('lab-run').disabled = false; $<HTMLButtonElement>('lab-cancel').disabled = true; $<HTMLButtonElement>('lab-export').disabled = !this.results.length; resume(); }
  }
  private renderResults() {
    $('lab-results').replaceChildren();
    for (const r of this.results) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = `${r.manifest.name}, seed ${r.manifest.config.seed}: ${r.status} at ${r.tick} ticks · populations ${r.final.typePop.join(' / ')} · persistence ${r.persistentTypes ? 'yes' : 'no'} · ledger error ${r.energyRelativeError.toExponential(1)} · ${Math.round(r.performance.ticksPerSecond)} ticks/s`; $('lab-results').append(p); }
  }
  refresh(selected?: Organism | null): void {
    const sim = this.getSim(), samples = sim.history, last = samples[samples.length - 1];
    if (sim !== this.lastWorld) { this.lastWorld = sim; this.lastSampleTick = last.tick; this.discoveries = []; this.lineageKey = ''; }
    else if (last.tick !== this.lastSampleTick) {
      const prev = samples[samples.length - 2]; if (prev) this.discoveries.push(...detectChanges(prev, last));
      this.discoveries = this.discoveries.slice(-50); this.lastSampleTick = last.tick;
    }
    $('discoveries').replaceChildren();
    for (const e of this.discoveries) { const li = document.createElement('li'); li.textContent = `Tick ${e.tick}: ${e.rule}. ${JSON.stringify(e.values)}. ${e.limitation}`; $('discoveries').append(li); }
    if (!this.discoveries.length) { const li = document.createElement('li'); li.textContent = 'No rule-triggered observations since opening this world.'; $('discoveries').append(li); }
    if (!selected || !$<HTMLDetailsElement>('ancestry').open) return;
    const chain = sim.lineage.chain(selected.id), key = `${selected.id}-${chain.map(n => `${n.id}:${n.gap}:${n.children}`).join(',')}`;
    if (key === this.lineageKey) return; this.lineageKey = key;
    const ancestorCanvas = $<HTMLCanvasElement>('ancestor-portrait');
    ancestorCanvas.width = ancestorCanvas.width;
    $('lineage-list').replaceChildren(); $('ancestor-caption').textContent = 'Select a recorded ancestor for a morphology preview; historical energy and behaviour are not reconstructed.';
    const add = (id: number, label: string, action: () => void) => { const b = document.createElement('button'); b.className = 'link'; b.textContent = `${label} #${id}`; b.onclick = action; $('lineage-list').append(b, document.createElement('br')); };
    for (const node of chain.slice(0, 24)) add(node.id, `${node.deathTick < 0 ? 'Living' : 'Ancestor'} · born ${node.birthTick}${node.gap ? ` · ${node.gap} omitted before parent` : ''}`, () => {
      if (!node.genome || node.type < 0) { ancestorCanvas.width = ancestorCanvas.width; $('ancestor-caption').textContent = `#${node.id}: genotype/morphology not recorded; no preview available.`; return; }
      const ph = expressPhenotype(node.genome, sim.cfg, node.type, node.corners, node.lobes);
      const preview = { ...selected, id: node.id, genome: node.genome, type: node.type, corners: node.corners, lobes: node.lobes, ph, speed: 0, energy: ph.capacity * .5 };
      portrait($<HTMLCanvasElement>('ancestor-portrait'), preview, sim.cfg.sensorAngle, 0);
      $('ancestor-caption').textContent = `#${node.id} · ${sim.cfg.types[node.type].name} · corners ${node.corners || 'n/a'}, lobes ${node.lobes || 'n/a'} · recorded genotype preview; energy fixed at 50%, not an observed historical reserve.`;
    });
    for (const child of sim.lineage.childrenOf(selected.id).slice(0, 8)) if (sim.orgs.some(o => o.id === child.id)) add(child.id, 'Living child', () => this.select(child.id));
    $('lineage-status').textContent = `Recorded chain ${chain.length} (first 24 shown). Living descendants ${sim.lineage.livingDescendants(selected.id)}. Extinct nodes pruned ${sim.lineage.prunedCount}; ancestors thinned ${sim.lineage.thinnedCount}. Missing branches cannot be reconstructed.${sim.migratedFrom ? ' Legacy ancestor genes were not recorded.' : ''}`;
    $('spec-genome').textContent = `Continuous genes (traits first, then controller weights):\n${Array.from(selected.genome).map(v => v.toFixed(4)).join(', ')}`;
  }
}
