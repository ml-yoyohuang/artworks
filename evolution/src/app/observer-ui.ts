import type { Simulation } from '../sim';
import { ObservationJournal } from './observer';
import { observe } from './observer-state';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export class ObserverPane {
  private journal = new ObservationJournal();
  private seconds = 0;
  private sinceSample = 0;
  private rendered = 0;
  private enabled = true;
  private sim?: Simulation;
  private sampledTick = 0;
  private readThrough = 0;
  get isOpen() { return !$('observer-panel').hidden; }
  constructor(private getSim: () => Simulation, private closeOtherPanel: () => void) {
    $('observer-toggle').onclick = () => this.setOpen(!this.isOpen);
    $('observer-close').onclick = () => this.setOpen(false);
    $('observer-enabled').onchange = () => {
      this.enabled = $<HTMLInputElement>('observer-enabled').checked;
      if (this.enabled) { const sim=this.getSim(); this.sampledTick=sim.tick; this.journal.begin(observe(sim),this.seconds,'重新開啟播報'); this.render(); }
      $('observer-status').textContent = this.enabled ? '正在觀察 · 只記錄本次瀏覽' : '播報已關閉 · 保留本次已有文字';
    };
    $('observer-interval').onchange = () => { this.journal.interval = Number($<HTMLSelectElement>('observer-interval').value); };
  }
  setOpen(open: boolean) {
    if (open) this.closeOtherPanel();
    $('observer-panel').hidden = !open; $('observer-toggle').setAttribute('aria-expanded',String(open));
    (open ? $('observer-close') : $('observer-toggle')).focus();
    if (open) this.render();
  }
  worldChanged(sim: Simulation) {
    const reason = this.sim ? '切換觀察箱／回復狀態' : '開始觀察';
    this.sim = sim; this.sinceSample = 0; this.sampledTick=sim.tick;
    this.journal.begin(observe(sim),this.seconds,reason,this.enabled); this.render();
  }
  frame(sim: Simulation, dt: number) {
    if (!this.enabled) return;
    if (this.sim !== sim) this.worldChanged(sim);
    this.seconds += dt; this.sinceSample += dt;
    if (this.sinceSample < 1) return;
    this.sinceSample = 0; this.journal.update(observe(sim,this.sampledTick),this.seconds); this.sampledTick=sim.tick; this.render();
  }
  private render() {
    const article = $('observer-article'), nearEnd = article.scrollHeight - article.scrollTop - article.clientHeight < 70;
    for (const entry of this.journal.entries) {
      if (entry.sequence <= this.rendered) continue;
      const paragraph = document.createElement('p'), time = document.createElement('span');
      const minutes = Math.floor(entry.seconds/60), seconds = Math.floor(entry.seconds%60).toString().padStart(2,'0');
      const label=entry.kind==='aside' ? '觀察員閒聊' : entry.kind==='knowledge' ? '生物小筆記' : entry.kind==='guide' ? '觀察箱導覽' : entry.kind==='reflection' ? '觀察員心聲' : '';
      time.className = 'observation-time'; time.textContent = `${minutes}:${seconds} · 觀察箱 ${entry.seed} · 模擬步 ${entry.tick.toLocaleString()}${label ? ` · ${label}` : ''}`;
      paragraph.append(time,document.createTextNode(entry.text)); article.append(paragraph);
      while (article.children.length > 200) article.firstElementChild?.remove(); this.rendered = entry.sequence;
    }
    if (nearEnd) article.scrollTop = article.scrollHeight;
    $('observer-count').textContent = String(this.journal.entries.length);
    if(this.isOpen) this.readThrough=this.rendered;
    const unread=this.rendered>this.readThrough;
    $('observer-unread').hidden=!unread;
    $('observer-toggle').setAttribute('aria-label',`觀察員紀錄${unread ? '，有未讀紀錄' : ''}，共 ${this.journal.entries.length} 則`);
  }
}
