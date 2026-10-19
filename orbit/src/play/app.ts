import './play.css';
import { Renderer } from '../renderer';
import { angleDelta } from '../geometry';
import { createPNG, download } from '../export';
import { PlayModel, type PlaySnapshot } from './model';
import { GEAR_MATERIALS, PAPERS, PLAY_INKS } from './palette';
import { PaperStore } from './storage';
export type PlayPhase = 'ready' | 'drawing' | 'completed' | 'transitioning' | 'changingPaper' | 'paused';
export class Play {
  readonly model = new PlayModel(crypto.getRandomValues(new Uint32Array(1))[0]);
  private renderer: Renderer;
  private store = new PaperStore();
  private previous: PlaySnapshot | null = null;
  private phase: PlayPhase = 'ready';
  private frame = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private drag: { id: number; angle: number } | null = null;
  private active = false;
  private storageWarning = false;
  private departingPaper: HTMLElement | null = null;
  private svg: SVGSVGElement;
  private saveButton: HTMLButtonElement;
  private $ = <T extends Element = HTMLElement>(selector: string): T => this.root.querySelector<T>(selector)!;
  constructor(private root: HTMLElement, private back: () => void) {
    root.className = 'play-mode';
    root.tabIndex = -1;
    root.innerHTML = `<header class="p-header"><a class="p-brand" href="#" aria-label="返回經典模式">ORBIT<span>THE PLAY ROOM</span></a><span class="p-edition">A LITTLE TURN. A LITTLE WONDER.</span><button id="p-back">經典模式 <span aria-hidden="true">↗</span></button></header>
      <section class="p-workspace" aria-label="簡易遊玩模式">
        <div class="p-intro"><span class="p-eyebrow">NO SETTINGS. JUST CURIOSITY.</span><h1>Just turn<br>&amp; <em>draw.</em><span class="p-punctuation" aria-hidden="true">✳</span></h1><p>一圈又一圈，<br>讓驚喜留在紙上。</p><div class="p-swatch" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span class="p-side-note">YOUR HANDS. ENDLESS POSSIBILITIES.</span></div>
        <div class="p-table"><div class="p-paper-meta"><span id="p-paper-name"></span><span>ONE OF A KIND / <b id="p-count">00</b></span></div>
          <div id="p-paper"><span class="p-corner p-tl" aria-hidden="true">+</span><span class="p-corner p-br" aria-hidden="true">+</span><span class="p-paper-caption">ORBIT · A PAPER FULL OF POSSIBILITIES</span>
            <canvas id="p-done" aria-hidden="true"></canvas><canvas id="p-active" aria-hidden="true"></canvas><svg id="p-mechanism" viewBox="0 0 760 760" tabindex="0" role="application" aria-label="轉圈繪圖。拖曳紙面，或使用左右方向鍵；空白鍵自動旋轉。"></svg>
            <div class="p-completion" aria-hidden="true">完成啦！<small>ONE MORE LITTLE WONDER.</small></div><span class="p-paper-signature">a study in play.</span>
          </div>
          <div class="p-feedback"><span id="p-status" role="status" aria-live="polite">轉轉看！</span><button id="p-auto" aria-pressed="false">幫我轉 <span aria-hidden="true">↻</span></button></div>
          <div class="p-actions"><button id="p-next"><span class="p-action-symbol" aria-hidden="true">↻</span><span>換一組<small>A NEW SURPRISE</small></span></button><button id="p-new"><span class="p-action-symbol" aria-hidden="true">▱</span><span>換張紙<small>A FRESH START</small></span></button></div>
        </div>
      </section><footer class="p-footer"><span id="p-storage-note">JUST TURN &amp; DRAW.</span><div><button id="p-restore" disabled>找回上一張紙 ↶</button><button id="p-save" disabled>留下這張畫 ↓</button></div></footer>`;
    this.svg = this.$('#p-mechanism'); this.saveButton = this.$('#p-save');
    this.renderer = new Renderer(this.$('#p-done'), this.$('#p-active'), this.svg, this.model.drawing, () => ({ ink: PLAY_INKS[this.model.choice.ink], gear: GEAR_MATERIALS[this.model.choice.material] }));
    this.$('#p-next').addEventListener('click', () => this.next());
    this.$('#p-new').addEventListener('click', () => this.changePaper());
    this.$('#p-restore').addEventListener('click', () => this.restorePaper());
    this.$('#p-auto').addEventListener('click', () => this.auto());
    const leave = () => { this.hide(); this.back(); };
    this.$('#p-back').addEventListener('click', leave);
    this.$('.p-brand').addEventListener('click', e => { e.preventDefault(); leave(); });
    this.saveButton.addEventListener('click', () => void this.export());
    this.svg.addEventListener('pointerdown', e => {
      if (!this.active || this.busy || this.drag || e.button !== 0) return;
      if (this.model.drawing.progress >= 1) { this.next(); return; }
      e.preventDefault(); this.pause(); this.drag = { id: e.pointerId, angle: this.angle(e) };
      this.svg.setPointerCapture(e.pointerId); this.svg.focus({ preventScroll: true }); this.setPhase('drawing');
    });
    this.svg.addEventListener('pointermove', e => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const angle = this.angle(e), delta = angleDelta(this.drag.angle, angle); this.drag.angle = angle;
      const box = this.svg.getBoundingClientRect();
      if (Math.hypot(e.clientX - box.x - box.width / 2, e.clientY - box.y - box.height / 2) >= box.width * .06) this.advance(delta);
    });
    const end = (e: PointerEvent) => { if (e.pointerId === this.drag?.id) { this.release(); this.setPhase('paused'); this.persist(); } };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.svg.addEventListener(type, end as EventListener);
    this.svg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); if (this.busy || this.model.drawing.progress >= 1) return;
        this.pause(); this.setPhase('drawing'); this.advance((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? .3 : .09));
      } else if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.auto(); }
    });
    this.svg.addEventListener('keyup', e => { if (e.key.startsWith('Arrow') && this.phase === 'drawing' && !this.model.drawing.running) { this.setPhase('paused'); this.persist(); } });
    window.addEventListener('blur', () => { if (this.active) this.pause(); });
    window.addEventListener('resize', () => { if (this.drag) this.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.active) this.pause(); });
    window.addEventListener('pagehide', () => { if (this.active) this.pause(); });
  }
  async init(): Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const papers = await Promise.race([this.store.read(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Storage timeout')), 1500); })]);
      if (papers) { this.model.restore(papers.current); this.previous = papers.previous; }
    } catch { this.storageWarning = true; }
    finally { clearTimeout(timeout); }
  }
  show(): void {
    this.active = true; this.root.hidden = false; document.documentElement.classList.add('play-active');
    this.setPhase(this.model.drawing.progress >= 1 ? 'completed' : this.model.drawing.hasInk ? 'paused' : 'ready');
    this.render(); this.root.focus({ preventScroll: true });
  }
  hide(): void { this.pause(); this.active = false; this.root.hidden = true; document.documentElement.classList.remove('play-active'); }
  private get busy(): boolean { return this.phase === 'changingPaper' || this.phase === 'transitioning'; }
  private release(): void {
    const id = this.drag?.id; this.drag = null;
    if (id !== undefined && this.svg.hasPointerCapture(id)) this.svg.releasePointerCapture(id);
  }
  private cancel(): void { clearTimeout(this.timer); this.timer = undefined; cancelAnimationFrame(this.frame); this.frame = 0; this.model.drawing.running = false; this.release(); this.departingPaper?.remove(); this.departingPaper = null; }
  private pause(): void {
    const paperPending = this.phase === 'changingPaper'; this.cancel();
    // Paper replacement is committed synchronously before its decorative transition.
    this.setPhase(this.model.drawing.progress >= 1 ? 'completed' : this.model.drawing.hasInk ? 'paused' : 'ready');
    if (paperPending) this.render(); this.persist();
  }
  private setPhase(phase: PlayPhase): void {
    this.phase = phase; this.root.dataset.phase = phase;
    this.$('#p-status').textContent = phase === 'completed' ? '完成啦！再畫一朵。' : phase === 'drawing' ? '慢慢轉，花正在綻放。' : phase === 'changingPaper' ? '一張新的可能。' : phase === 'transitioning' ? '新的驚喜，就位。' : phase === 'paused' ? '停一下也沒關係，接著轉。' : '轉轉看！沿著紙面畫圈。';
    this.$('#p-auto').setAttribute('aria-pressed', String(this.model.drawing.running));
    this.$('#p-auto').innerHTML = this.model.drawing.running ? '停一下 <span aria-hidden="true">Ⅱ</span>' : '幫我轉 <span aria-hidden="true">↻</span>';
    for (const id of ['p-next', 'p-new', 'p-auto']) this.$<HTMLButtonElement>(`#${id}`).disabled = phase === 'changingPaper';
    this.$<HTMLButtonElement>('#p-restore').disabled = !this.previous;
    this.saveButton.disabled = !this.model.drawing.hasInk;
    this.$('#p-count').textContent = String(this.model.drawing.all.filter(s => s.stops.length > 1).length).padStart(2, '0');
  }
  private render(): void {
    const paper = PAPERS[this.model.paper]; this.root.style.setProperty('--p-paper', paper.color);
    this.root.style.setProperty('--p-current-ink', PLAY_INKS[this.model.choice.ink]);
    this.$('#p-paper-name').textContent = `${paper.english} / ${paper.name}`;
    this.$('#p-storage-note').textContent = this.storageWarning ? '暫存不可用；上一張紙仍可在本次遊玩找回。' : 'JUST TURN & DRAW.';
    this.renderer.resize();
  }
  private angle(e: PointerEvent): number { const b = this.svg.getBoundingClientRect(); return Math.atan2(e.clientY - b.y - b.height / 2, e.clientX - b.x - b.width / 2); }
  private advance(delta: number): void {
    const result = this.model.advance(delta);
    if (result) this.renderer.segment(result.stroke, result.from, result.to);
    if (this.model.drawing.progress >= 1) {
      this.cancel(); this.setPhase('completed'); this.persist();
      this.timer = setTimeout(() => { if (this.active) this.next(); }, 1200);
    } else {
      this.saveButton.disabled = !this.model.drawing.hasInk;
      this.$('#p-count').textContent = String(this.model.drawing.all.length).padStart(2, '0');
    }
  }
  private next(): void {
    if (!this.active || this.phase === 'changingPaper') return;
    this.cancel(); this.model.next(); this.setPhase('transitioning'); this.render(); this.persist();
    this.timer = setTimeout(() => { this.setPhase('ready'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
  }
  private changePaper(): void {
    if (this.phase === 'changingPaper') return;
    this.cancel(); this.previous = this.model.snapshot();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      const paper = this.$('#p-paper'), box = paper.getBoundingClientRect(), ghost = document.createElement('div');
      ghost.className = 'p-departing-paper'; ghost.setAttribute('aria-hidden', 'true');
      Object.assign(ghost.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px`, background: PAPERS[this.model.paper].color });
      for (const original of paper.querySelectorAll('canvas')) {
        const copy = document.createElement('canvas'); copy.width = original.width; copy.height = original.height;
        copy.getContext('2d')!.drawImage(original, 0, 0); ghost.append(copy);
      }
      this.root.append(ghost); this.departingPaper = ghost;
    }
    this.model.newPaper(); this.setPhase('changingPaper'); this.render(); this.persist();
    this.timer = setTimeout(() => { this.departingPaper?.remove(); this.departingPaper = null; this.setPhase('ready'); }, reduced ? 0 : 420);
  }
  private restorePaper(): void {
    if (!this.previous) return;
    this.cancel(); const current = this.model.snapshot(); this.model.restore(this.previous); this.previous = current;
    this.setPhase(this.model.drawing.progress >= 1 ? 'completed' : 'paused'); this.render(); this.persist(); this.svg.focus({ preventScroll: true });
  }
  private auto(): void {
    if (this.busy || !this.active) return;
    if (this.model.drawing.running) { this.pause(); return; }
    if (this.model.drawing.progress >= 1) { this.next(); return; }
    this.cancel(); this.model.drawing.running = true; this.setPhase('drawing');
    let last = performance.now();
    const tick = (time: number) => {
      if (!this.active || !this.model.drawing.running) return;
      const dt = Math.min(.08, (time - last) / 1000); last = time;
      // A gentle fixed rotation, with bounded candidates: 2.6–21 seconds per flower.
      this.advance(dt * 2.4);
      if (this.model.drawing.running) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  private persist(): void {
    void this.store.write({ current: this.model.snapshot(), previous: this.previous }).catch(() => { this.storageWarning = true; this.$('#p-storage-note').textContent = '暫存不可用；上一張紙仍可在本次遊玩找回。'; });
  }
  private async export(): Promise<void> {
    this.pause(); this.saveButton.disabled = true;
    const strokes = structuredClone(this.model.drawing.all), paper = PAPERS[this.model.paper].color;
    try { download(await createPNG(strokes, true, paper), 'png'); }
    catch { this.$('#p-status').textContent = '下載未完成，畫作仍留在這裡。請再試一次。'; }
    finally { this.saveButton.disabled = !this.model.drawing.hasInk; }
  }
}
