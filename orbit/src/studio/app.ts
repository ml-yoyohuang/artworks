import './studio.css';
import type { Stroke } from '../state';
import { download } from '../export';
import { align, DocumentHistory, duplicate, migrateClassic, parseProject, readLibrary, serialize, validateArtwork, writeLibrary } from './data';
import { surprise, variations } from './discovery';
import { exportPNG, exportSVG } from './export';
import { advanceTime } from './temporal';
import { ARTWORKS, artwork, GEOMETRIES, INK_PRESETS, MOTIONS, template } from './presets';
import { clone, defaultCurve, object, type Artwork, type ArtObject, type CurveKind } from './types';
import { escapeXML, renderSVG } from './render';
import { button, inspector, LABS, shell, type Lab } from './ui';

export class Studio {
  history = new DocumentHistory(artwork(0));
  selected: string[] = [this.history.art.objects[0].id];
  lab: Lab = 'home'; playing = false; active = false;
  private frame = 0; private strength = .5; private seed = 107; private original = clone(this.history.art);
  private candidates: Artwork[] = []; private preview: Artwork | null = null;
  private mutationSource = clone(this.art);
  private rangeBefore: Artwork | null = null;
  private drag: { id: number; x: number; y: number; before: Artwork } | null = null;
  private snap = true; private lastPaint = 0; private frameBudget = 1000 / 30;
  constructor(private root: HTMLElement, private returnClassic: () => void) {
    root.innerHTML = shell(); this.bind(); this.refresh(); this.gallery();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    window.addEventListener('blur', () => this.pause());
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { if (e.matches) this.pause(); });
  }
  get art(): Artwork { return this.history.art; }
  private $<T extends HTMLElement = HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  private get selectedObject(): ArtObject | undefined { return this.art.objects.find(o => this.selected.includes(o.id)); }
  show(strokes?: Stroke[]): void {
    if (strokes) { const imported = migrateClassic(strokes); this.history.commit(a => Object.assign(a, imported)); this.selected = imported.objects.map(o => o.id).slice(0, 1); this.lab = 'compose'; }
    this.active = true; this.refresh(); this.gallery();
  }
  hide(): void { this.pause(); this.active = false; }
  private status(message: string): void {
    this.$('#s-status').textContent = message;
    if (this.$<HTMLDialogElement>('#s-dialog').open) {
      let status = this.$('#s-dialog-status');
      if (!status) { status = document.createElement('p'); status.id = 's-dialog-status'; status.setAttribute('role', 'status'); this.$('#s-dialog-content').append(status); }
      status.textContent = message;
    }
  }
  private error(error: unknown): void { this.status(error instanceof Error ? error.message : '操作未完成；請再試一次。'); }
  private commit(change: (a: Artwork) => void, message = '已更新作品，可隨時復原。'): void {
    this.pause(); try { this.history.commit(change); this.refresh(); this.status(message); } catch (error) { this.error(error); this.refresh(); }
  }
  private edit(change: (o: ArtObject) => void): void {
    this.commit(a => a.objects.filter(o => this.selected.includes(o.id) && !o.locked).forEach(change));
  }
  private replace(a: Artwork): void { this.commit(target => Object.assign(target, clone(a)), '作品已開啟。所有幾何與材質仍可編輯。'); this.selected = a.objects.slice(0, 1).map(o => o.id); this.refresh(); }
  private navigate(lab: Lab): void {
    this.pause(); this.lab = lab;
    if (lab === 'discover') { this.original = clone(this.art); this.mutationSource = clone(this.art); this.seed = this.art.seed; this.candidates = variations(this.mutationSource, this.seed, this.strength); }
    this.refresh(); this.gallery();
  }
  private paint(quick = false): void {
    this.$('#s-art').innerHTML = renderSVG(this.art, { quick, interactive: true, guides: this.lab === 'compose' && this.snap, selected: this.lab === 'compose' ? this.selected : [] });
    this.$('#s-art-meta').textContent = `${this.art.artboard.width} × ${this.art.artboard.height} / ${this.art.objects.length} LAYERS`;
    this.$('#s-seed').textContent = `SEED / ${this.art.seed}`;
    this.$<HTMLInputElement>('#s-scrub').value = String(this.art.timeline.time);
    this.$('#s-time').textContent = `${this.art.timeline.time.toFixed(2)}s`;
  }
  private refresh(): void {
    const active = document.activeElement as HTMLElement | null;
    const focus = active?.closest('#s-controls') ? { id: active.id, group: active.dataset.group, key: active.dataset.key } : null;
    const openDetails = [...this.$('#s-controls').querySelectorAll('details[open] summary')].map(el => el.textContent);
    this.selected = this.selected.filter(id => this.art.objects.some(o => o.id === id));
    if (!this.selected.length && this.art.objects.length) this.selected = [this.art.objects[0].id];
    const lab = LABS.find(l => l.id === this.lab)!;
    this.$('#s-subtitle').textContent = lab.sub; this.$('#s-heading').textContent = lab.title; this.$('#s-description').textContent = lab.description;
    this.root.querySelectorAll<HTMLElement>('[data-lab]').forEach(b => b.setAttribute('aria-current', b.dataset.lab === this.lab ? 'page' : 'false'));
    this.$<HTMLInputElement>('#s-title').value = this.art.title;
    this.$('#s-statement').textContent = this.art.statement;
    this.$('#s-controls').innerHTML = inspector(this.lab, this.art, this.selectedObject, this.selected, this.strength);
    this.$('#s-controls').querySelectorAll('details').forEach(el => { el.open = openDetails.includes(el.querySelector('summary')?.textContent ?? ''); });
    this.$<HTMLInputElement>('#s-scrub').max = String(this.art.timeline.duration);
    this.$<HTMLSelectElement>('#s-speed').value = String(this.art.timeline.speed);
    this.$<HTMLInputElement>('#s-loop').checked = this.art.timeline.loop;
    this.$<HTMLButtonElement>('#s-undo').disabled = !this.history.undoStack.length;
    this.$<HTMLButtonElement>('#s-redo').disabled = !this.history.redoStack.length;
    if (this.$<HTMLInputElement>('#s-snap')) this.$<HTMLInputElement>('#s-snap').checked = this.snap;
    if (this.$<HTMLInputElement>('#s-discovery-seed')) this.$<HTMLInputElement>('#s-discovery-seed').value = String(this.seed);
    this.paint();
    if (focus) {
      const next = [...this.$('#s-controls').querySelectorAll<HTMLElement>('input,select')].find(el => focus.id ? el.id === focus.id : el.dataset.group === focus.group && el.dataset.key === focus.key);
      next?.focus({ preventScroll: true });
    }
  }
  private gallery(): void {
    const collection = this.lab === 'home' ? ARTWORKS : this.lab === 'discover' ? this.candidates : [];
    this.$('#s-gallery').innerHTML = collection.length ? `<div class="s-gallery-heading"><h2>${this.lab === 'home' ? 'Studies, not solutions.' : 'Choose a possibility.'}</h2><span class="s-kicker">${collection.length} ${this.lab === 'home' ? 'CURATED ARTWORKS' : 'SEEDED VARIATIONS'}</span></div><div class="s-artworks">${collection.map((a, i) => `<article><button class="s-thumbnail" data-preview="${i}" aria-label="預覽 ${escapeXML(a.title)}">${renderSVG(a, { quick: true })}</button><div class="s-work-label"><span>${String(i + 1).padStart(2, '0')}</span><div><h3>${escapeXML(a.title)}</h3><p>${escapeXML(a.statement)}</p></div><button data-apply="${i}" aria-label="開啟編輯 ${escapeXML(a.title)}">↗</button></div></article>`).join('')}</div>` : '';
  }
  private dialog(title: string, content: string): void {
    this.pause(); this.$('#s-dialog-title').textContent = title; this.$('#s-dialog-content').innerHTML = content;
    const dialog = this.$<HTMLDialogElement>('#s-dialog'); if (!dialog.open) dialog.showModal();
  }
  private library(): void {
    try {
      const saved = readLibrary(); this.dialog('Your collection.', `<p>本機收藏 · 最多 20 件。重要作品請另外匯出 JSON 備份。</p><div class="s-actions">${button('import', '匯入 Project JSON')}${button('json', '匯出目前 JSON')}</div>${saved.length ? saved.map(a => `<div class="s-saved"><input aria-label="收藏名稱" data-saved-name="${escapeXML(a.id)}" value="${escapeXML(a.title)}" maxlength="120"/><div>${['open', 'rename', 'copy', 'remove'].map((action, i) => button(`saved-${action}:${a.id}`, ['開啟', '重新命名', '複製', '刪除'][i])).join('')}</div></div>`).join('') : '<p>還沒有收藏。按「保存作品」收下第一件。</p>'}`);
    } catch (error) { this.error(error); }
  }
  private pause(): void { cancelAnimationFrame(this.frame); this.frame = 0; this.playing = false; if (this.$('#s-play')) this.$('#s-play').textContent = '▶ 播放'; }
  private play(): void {
    if (this.playing) { this.pause(); this.paint(); return; }
    if (!this.art.objects.some(o => o.visible && o.motion.kind !== 'still' && o.type !== 'text')) { this.status('先到 Motion 選擇動態配方，再播放這件作品。'); return; }
    if (this.art.timeline.time >= this.art.timeline.duration) this.art.timeline.time = 0;
    this.playing = true; this.$('#s-play').textContent = 'Ⅱ 暫停'; const start = performance.now(), time = this.art.timeline.time;
    this.frameBudget = 1000 / 30;
    const tick = (now: number) => {
      if (!this.playing || !this.active) return;
      this.art.timeline.time = advanceTime(time, (now - start) / 1000, this.art.timeline);
      if (now - this.lastPaint >= this.frameBudget) {
        const before = performance.now(); this.paint(true); this.lastPaint = now - ((now - this.lastPaint) % this.frameBudget);
        if (performance.now() - before > 26) this.frameBudget = 1000 / 15;
      }
      if (!this.art.timeline.loop && this.art.timeline.time >= this.art.timeline.duration) { this.pause(); this.paint(); return; }
      this.frame = requestAnimationFrame(tick);
    }; this.frame = requestAnimationFrame(tick);
  }
  private changeField(a: Artwork, target: HTMLInputElement | HTMLSelectElement): void {
    const { group, key } = target.dataset;
    const value = target instanceof HTMLInputElement && ['number', 'range'].includes(target.type) || ['direction', 'weight'].includes(key!) ? Number(target.value) : target.value;
    if (['paper', 'artboard', 'timeline'].includes(group!)) { Object.assign(a[group as 'paper' | 'artboard' | 'timeline'], { [key!]: value }); if (group === 'timeline') a.timeline.time = Math.min(a.timeline.time, a.timeline.duration); return; }
    for (const o of a.objects.filter(o => this.selected.includes(o.id) && !o.locked)) {
      if (group === 'palette') o.appearance.palette[Number(key)] = String(value);
      else if (group?.startsWith('term')) { const i = group === 'term' ? 1 : Number(group.slice(4)); if (o.geometry.terms[i]) Object.assign(o.geometry.terms[i], { [key!]: value }); }
      else if (['geometry', 'appearance', 'transform', 'motion', 'text'].includes(group!)) Object.assign(o[group as 'geometry' | 'appearance' | 'transform' | 'motion' | 'text'], { [key!]: value });
    }
  }
  private bind(): void {
    this.$('#back-classic').addEventListener('click', () => { this.hide(); this.returnClassic(); });
    this.root.addEventListener('click', e => {
      const target = (e.target as Element).closest<HTMLElement>('button'); if (!target || target.closest('fieldset[disabled]')) return;
      try {
        if (target.dataset.lab) this.navigate(target.dataset.lab as Lab);
        else if (target.dataset.select) { const id = target.dataset.select; this.selected = (e as MouseEvent).shiftKey ? this.selected.includes(id) ? this.selected.filter(v => v !== id) : [...this.selected, id] : [id]; this.refresh(); }
        else if (target.dataset.layerAction) this.commit(a => { const o = a.objects.find(o => o.id === target.dataset.id)!; if (target.dataset.layerAction === 'lock') o.locked = !o.locked; else o.visible = !o.visible; });
        else if (target.dataset.preview !== undefined || target.dataset.apply !== undefined) {
          const art = (this.lab === 'home' ? ARTWORKS : this.candidates)[Number(target.dataset.preview ?? target.dataset.apply)];
          if (target.dataset.apply !== undefined) this.replace(art);
          else { this.preview = art; this.dialog(art.title, `<div class="s-large-preview">${renderSVG(art)}</div><p>${escapeXML(art.statement)}</p>${button('apply-preview', '開啟並編輯 ↗', 'class="s-primary"')}`); }
        } else if (target.dataset.action) void this.action(target.dataset.action).catch(error => this.error(error));
      } catch (error) { this.error(error); }
    });
    this.root.addEventListener('input', e => {
      const input = e.target as HTMLInputElement;
      if (input.id === 's-scrub') { this.pause(); this.art.timeline.time = Number(input.value); this.paint(true); }
      else if (input.type === 'range' && input.dataset.group) {
        this.pause(); this.rangeBefore ||= clone(this.art);
        try { const next = clone(this.art); this.changeField(next, input); validateArtwork(next); this.history.art = next; input.nextElementSibling!.textContent = input.value; this.paint(true); } catch (error) { this.error(error); }
      }
    });
    this.root.addEventListener('change', e => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      try {
        if (target.dataset.group) {
          if (this.rangeBefore) { const before = this.rangeBefore; this.rangeBefore = null; this.history.art = before; }
          this.commit(a => this.changeField(a, target));
        } else if (target.id === 's-title') this.commit(a => a.title = target.value);
        else if (target.id === 's-object') { this.selected = [target.value]; this.refresh(); }
        else if (target.id === 's-ink-preset' && target.value) void this.action(`ink:${target.value}`);
        else if (target.id === 's-motion-preset' && target.value) void this.action(`motion:${target.value}`);
        else if (target.id === 's-speed') { this.pause(); this.art.timeline.speed = Number(target.value); }
        else if (target.id === 's-loop') this.art.timeline.loop = (target as HTMLInputElement).checked;
        else if (target.id === 's-board' && target.value) { const [width, height] = target.value.split(',').map(Number); this.commit(a => { a.artboard = { width, height }; }); }
        else if (target.id === 's-strength') this.strength = Number(target.value);
        else if (target.id === 's-discovery-seed') { const n = Number(target.value); if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295) throw new RangeError('Seed 必須是 0–4294967295 的整數。'); this.seed = n; }
        else if (target.id === 's-snap') { this.snap = (target as HTMLInputElement).checked; this.paint(); }
        else if (target.id === 's-scrub') this.paint();
      } catch (error) { this.error(error); }
    });
    this.$<HTMLInputElement>('#s-file').addEventListener('change', async e => {
      const input = e.target as HTMLInputElement, file = input.files?.[0]; if (!file) return;
      try { if (file.size > 2_000_000) throw new Error('JSON 超過 2 MB。'); this.replace(parseProject(await file.text())); this.$<HTMLDialogElement>('#s-dialog').close(); } catch (error) { this.error(error); } finally { input.value = ''; }
    });
    this.root.addEventListener('keydown', e => {
      const target = e.target as Element; if (target.matches('input,textarea,select') || target.closest('dialog')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.pause(); if (e.shiftKey) this.history.redo(); else this.history.undo(); this.refresh(); }
      if (target.closest('#s-art') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; this.edit(o => { o.transform.x += e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0; o.transform.y += e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0; }); }
    });
    const stage = this.$('#s-art');
    stage.addEventListener('pointerdown', e => {
      if (this.lab !== 'compose' || e.button !== 0) return;
      const id = (e.target as Element).closest<HTMLElement>('[data-object]')?.dataset.object;
      const o = this.art.objects.find(o => o.id === id); if (!o || o.locked) return;
      this.pause(); this.selected = [o.id]; this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, before: clone(this.art) }; stage.setPointerCapture(e.pointerId); stage.focus(); this.paint();
    });
    stage.addEventListener('pointermove', e => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const rect = stage.querySelector('svg')!.getBoundingClientRect(), sx = this.art.artboard.width / rect.width, sy = this.art.artboard.height / rect.height;
      const o = this.selectedObject!, initial = this.drag.before.objects.find(b => b.id === o.id)!;
      const snap = (n: number) => this.snap ? Math.round(n / 20) * 20 : n;
      o.transform.x = Math.max(-2400, Math.min(4800, snap(initial.transform.x + (e.clientX - this.drag.x) * sx)));
      o.transform.y = Math.max(-2400, Math.min(4800, snap(initial.transform.y + (e.clientY - this.drag.y) * sy))); this.paint(true);
    });
    const endDrag = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const next = clone(this.art), before = this.drag.before; this.drag = null; this.history.art = before;
      if (e.type !== 'pointercancel') this.history.commit(a => Object.assign(a, next)); this.refresh();
    };
    stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag); stage.addEventListener('lostpointercapture', endDrag);
  }
  private async action(action: string): Promise<void> {
    const [type, value] = action.split(':');
    if (type === 'begin') this.navigate('geometry');
    else if (type === 'undo' || type === 'redo') { this.pause(); this.history[type](); this.refresh(); }
    else if (type === 'geometry') this.edit(o => { o.geometry = clone(GEOMETRIES[Number(value)].geometry); o.name = GEOMETRIES[Number(value)].name; });
    else if (type === 'family') this.edit(o => { o.geometry = defaultCurve(value as CurveKind); });
    else if (type === 'ink') this.edit(o => { o.appearance = { ...clone(INK_PRESETS[Number(value)].appearance), seed: this.art.seed }; });
    else if (type === 'motion') this.edit(o => { o.motion = clone(MOTIONS[Number(value)].motion); });
    else if (type === 'paper') this.commit(a => { a.paper.kind = value as Artwork['paper']['kind']; });
    else if (type === 'template') this.replace(template(this.art, Number(value)));
    else if (type === 'align') this.commit(a => align(a, this.selected, value));
    else if (type === 'select-all') { this.selected = this.art.objects.filter(o => !o.locked).map(o => o.id); this.refresh(); }
    else if (type === 'reset-transform') this.edit(o => { o.transform = { x: this.art.artboard.width / 2, y: this.art.artboard.height / 2, scale: 1, rotation: 0 }; });
    else if (type === 'add' || type === 'text') {
      const o = object(crypto.randomUUID()); if (type === 'text') { o.type = 'text'; o.name = 'Annotation'; }
      o.transform.x = this.art.artboard.width / 2; o.transform.y = this.art.artboard.height / 2;
      this.commit(a => { if (a.objects.length >= 24) throw new Error('每件作品最多 24 個物件。'); a.objects.push(o); }); this.selected = [o.id]; this.refresh();
    } else if (type === 'duplicate') this.commit(a => { const ids: string[] = []; for (const id of this.selected) { const copy = duplicate(a, id); if (copy) ids.push(copy.id); } this.selected = ids; });
    else if (type === 'delete') this.commit(a => { a.objects = a.objects.filter(o => !this.selected.includes(o.id) || o.locked); });
    else if (type === 'up' || type === 'down') this.commit(a => {
      const items = type === 'up' ? [...a.objects].reverse() : [...a.objects];
      for (const o of items) { const i = a.objects.indexOf(o), j = i + (type === 'up' ? 1 : -1); if (this.selected.includes(o.id) && !o.locked && j >= 0 && j < a.objects.length) [a.objects[i], a.objects[j]] = [a.objects[j], a.objects[i]]; }
    });
    else if (type === 'play') this.play();
    else if (type === 'restart') { this.pause(); this.art.timeline.time = 0; this.paint(); }
    else if (type === 'variations' || type === 'mutate-current') { if (type === 'mutate-current') this.mutationSource = clone(this.art); this.candidates = variations(this.mutationSource, this.seed, this.strength); this.gallery(); this.status('六個變體已生成；點縮圖放大，或點箭頭開啟編輯。'); }
    else if (type === 'surprise') { this.seed = (this.seed + 997) >>> 0; this.replace(surprise(this.seed)); this.mutationSource = clone(this.art); this.candidates = variations(this.art, this.seed, this.strength); this.gallery(); }
    else if (type === 'original') { this.replace(this.original); this.mutationSource = clone(this.original); }
    else if (type === 'apply-preview' && this.preview) { this.replace(this.preview); this.$<HTMLDialogElement>('#s-dialog').close(); }
    else if (type === 'save') {
      const list = readLibrary(), next = clone(this.art), index = list.findIndex(a => a.id === next.id); if (index < 0) list.unshift(next); else list[index] = next;
      writeLibrary(list); this.status('作品已保存在這個瀏覽器。建議再匯出 JSON 備份。');
    } else if (type === 'library') this.library();
    else if (type.startsWith('saved-')) {
      const list = readLibrary(), i = list.findIndex(a => a.id === value); if (i < 0) return;
      if (type === 'saved-open') { this.replace(list[i]); this.$<HTMLDialogElement>('#s-dialog').close(); return; }
      if (type === 'saved-rename') list[i].title = [...this.root.querySelectorAll<HTMLInputElement>('[data-saved-name]')].find(input => input.dataset.savedName === value)!.value;
      if (type === 'saved-copy') { const copy = clone(list[i]); copy.id = crypto.randomUUID(); copy.title = copy.title.slice(0, 110) + ' copy'; list.push(copy); }
      if (type === 'saved-remove') { if (!confirm('刪除此本機收藏？目前工作紙不受影響。')) return; list.splice(i, 1); }
      writeLibrary(list); this.library();
    } else if (type === 'import') this.$<HTMLInputElement>('#s-file').click();
    else if (type === 'json') download(new Blob([serialize(this.art)], { type: 'application/json' }), 'json');
    else if (type === 'export') this.dialog('Take a piece of the atelier.', `<p>PNG 保留目前畫面與材質。SVG 保留向量幾何、程序化纖維、套印與嵌入的西文字體；不同設計軟體可能有混色差異。中文字體依開啟裝置而定。</p><label><input id="s-export-paper" type="checkbox" checked/>包含紙張背景</label><label class="s-field"><span>PNG 匯出倍率</span><select id="s-export-scale"><option value="1">1×</option><option value="2" selected>2×</option><option value="3">3×</option><option value="4">4×</option></select></label><p class="s-small">畫布 ${this.art.artboard.width} × ${this.art.artboard.height}。上限為長邊 4800px；尺寸為像素，印刷時請自行設定 DPI。時間點 ${this.art.timeline.time.toFixed(2)} 秒。</p><div class="s-actions">${button('png', '下載 PNG', 'class="s-primary"')}${button('svg', '下載 SVG')}${button('json', 'Project JSON')}</div>`);
    else if (type === 'png' || type === 'svg') {
      const controls = [...this.$('#s-dialog-content').querySelectorAll<HTMLButtonElement>('button')]; controls.forEach(b => b.disabled = true);
      try {
        const paper = this.$<HTMLInputElement>('#s-export-paper').checked;
        const blob = type === 'png' ? await exportPNG(this.art, paper, Number(this.$<HTMLSelectElement>('#s-export-scale').value)) : await exportSVG(this.art, paper);
        download(blob, type); this.status(`${type.toUpperCase()} 已匯出，保留目前構圖與時間點。`);
      } finally { controls.forEach(b => b.disabled = false); }
    }
  }
}
