import './style.css';
import { layout } from './ui';
import { Atelier } from './state';
import { Renderer } from './renderer';
import { angleDelta, TAU } from './geometry';
import { INKS } from './catalog';
import { createPNG, createSVG, download } from './export';
import { instrumentButton } from './interaction';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = layout();
const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const model = new Atelier(); model.example();
const mechanism = $<SVGSVGElement>('#mechanism');
const renderer = new Renderer($('#completed-canvas'), $('#active-canvas'), mechanism, model);
let toastTimer: ReturnType<typeof setTimeout>;
let dragging: { id: number; angle: number; travel: number } | null = null;
let frame = 0;
function announce(text: string): void {
  $('#announcement').textContent = text; $('#toast').textContent = text;
  $('#toast').classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}
function update(): void {
  const progress = Math.round(model.progress * 100);
  $('#play-label').textContent = model.running ? '暫停一下' : model.active ? '繼續繪製' : '開始繪製';
  $('#play-icon').textContent = model.running ? 'Ⅱ' : '▶';
  $('#quick-draw').textContent = model.running ? '暫停 Ⅱ' : model.active ? '繼續繪製 ↗' : '開始繪製 ↗';
  $('#draw-button').setAttribute('aria-label', model.running ? '暫停繪製' : model.active ? '繼續繪製' : '開始繪製');
  $('#status-text').textContent = model.running ? 'DRAWING IN PROGRESS' : model.progress >= 1 ? 'A LITTLE ORBIT, COMPLETE' : model.active ? 'TAKE YOUR TIME · PAUSED' : 'READY WHEN YOU ARE';
  $('#progress-fill').style.width = `${progress}%`;
  $('.progress-track').setAttribute('aria-valuenow', String(progress));
  $('#progress-text').textContent = `${String(progress).padStart(2, '0')}%`;
  $('#geometry-info').textContent = `${model.tool.ring} : ${model.tool.gear} / ${Math.round(model.end / TAU)} REVOLUTIONS`;
  $('#stroke-count').textContent = `${String(model.all.filter(s => s.stops.length > 1).length).padStart(2, '0')} STROKES`;
  $<HTMLButtonElement>('#undo').disabled = !model.hasInk;
  $<HTMLButtonElement>('#redo').disabled = !model.redoStack.length;
  $<HTMLButtonElement>('#clear').disabled = !model.hasInk;
  $<HTMLButtonElement>('#export-button').disabled = !model.hasInk;
  $<HTMLButtonElement>('#stop-button').disabled = !model.active && !model.running;
  $<HTMLSelectElement>('#ring-select').value = String(model.tool.ring);
  document.querySelectorAll<HTMLButtonElement>('[data-gear]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.gear) === model.tool.gear)));
  document.querySelectorAll<HTMLButtonElement>('[data-hole-choice]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.holeChoice) === model.tool.hole)));
  document.querySelectorAll<HTMLButtonElement>('[data-ink]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.ink) === model.tool.ink)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === model.mode)));
  $('#ink-name').textContent = INKS[model.tool.ink].name;
  $('#ink-english').textContent = `${String(model.tool.ink + 1).padStart(2, '0')} / ${INKS[model.tool.ink].english}`;
}
function pause(): void { model.running = false; cancelAnimationFrame(frame); frame = 0; update(); }
function advance(delta: number): void {
  const segment = model.advance(delta);
  if (segment) renderer.segment(segment.stroke, segment.from, segment.to);
  if (model.progress >= 1) {
    announce('一圈又一圈，一朵花完成了。換個墨色，再疊一筆。');
    $('#drawing-hint').textContent = '這朵花完成了。換個齒輪或墨色，繼續疊圖。';
  }
  update();
}
function play(): void {
  if (model.running) { pause(); announce('已暫停。美好的事，可以慢慢來。'); return; }
  model.mode = 'auto'; model.begin(); model.running = true;
  $('#drawing-hint').textContent = '沿著齒圈慢慢滾動，每一筆都來自同一個軌跡。';
  let last = performance.now();
  const tick = (now: number) => {
    if (!model.running) return;
    // Cap background-tab jumps; each visible interval still receives exact sampling.
    const dt = Math.min((now - last) / 1000, .1); last = now;
    advance(dt * model.speed * 2.4);
    if (model.running) frame = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); update();
}
function changed(patch: Parameters<Atelier['select']>[0], message: string): void {
  pause(); dragging = null; model.select(patch); renderer.redraw(); update(); announce(message);
  $('#drawing-hint').textContent = '按下開始，或直接在紙面拖曳。上一筆已保留。';
}
$('#draw-button').addEventListener('click', play);
$('#quick-draw').addEventListener('click', play);
$('#stop-button').addEventListener('click', () => { pause(); model.stop(); renderer.redraw(); update(); announce('這一筆已收好。下一筆，重新開始。'); });
$('#ring-select').addEventListener('change', e => changed({ ring: Number((e.target as HTMLSelectElement).value) }, '齒圈已更換。原有筆跡留在紙上。'));
document.querySelectorAll<HTMLButtonElement>('[data-gear]').forEach(b => instrumentButton(b, () => changed({ gear: Number(b.dataset.gear) }, `已選擇 ${b.dataset.gear} 齒齒輪。`)));
document.querySelectorAll<HTMLButtonElement>('[data-hole-choice]').forEach(b => instrumentButton(b, () => changed({ hole: Number(b.dataset.holeChoice) }, `筆尖放入第 ${Number(b.dataset.holeChoice) + 1} 孔。`)));
document.querySelectorAll<HTMLButtonElement>('[data-ink]').forEach(b => instrumentButton(b, () => changed({ ink: Number(b.dataset.ink) }, `換上${INKS[Number(b.dataset.ink)].name}。`)));
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => {
  pause(); model.mode = b.dataset.mode as 'manual' | 'auto'; update();
  $('#drawing-hint').textContent = model.mode === 'manual' ? '沿著紙面轉圈拖曳；也可聚焦紙面，用 ← → 轉動。' : '按下開始，接續目前的軌跡。';
  announce(model.mode === 'manual' ? '手動模式。拖曳或使用左右方向鍵轉動。' : '自動模式。按開始即可接續。');
}));
$('#speed').addEventListener('change', e => { model.speed = Number((e.target as HTMLSelectElement).value); });
function undo(): void { pause(); if (model.undo()) { renderer.redraw(); update(); announce('已復原一筆。可按重做恢復。'); } }
function redo(): void { pause(); if (model.redo()) { renderer.redraw(); update(); announce('筆跡已恢復。未完成的部分可以接續。'); } }
$('#undo').addEventListener('click', undo); $('#redo').addEventListener('click', redo);
const openClear = () => { pause(); $<HTMLDialogElement>('#clear-dialog').showModal(); };
$('#clear').addEventListener('click', openClear); $('#new-paper').addEventListener('click', openClear);
$('#cancel-clear').addEventListener('click', () => $<HTMLDialogElement>('#clear-dialog').close());
$('#confirm-clear').addEventListener('click', () => {
  model.clear(); renderer.redraw(); update(); $<HTMLDialogElement>('#clear-dialog').close();
  $('#drawing-hint').textContent = '空白是一個好的開始。選個墨色，畫下第一圈。'; announce('一張新紙，準備好了。');
});
$('#about-button').addEventListener('click', () => { pause(); $<HTMLDialogElement>('#about-dialog').showModal(); });
$('#tools-toggle').addEventListener('click', () => {
  const hidden = $('#paper').classList.toggle('tools-hidden');
  $('#tools-toggle').setAttribute('aria-pressed', String(!hidden));
  $('#tools-toggle').innerHTML = `${hidden ? '顯示齒輪' : '隱藏齒輪'} <span aria-hidden="true">◌</span>`;
  mechanism.setAttribute('tabindex', hidden ? '-1' : '0');
  mechanism.setAttribute('aria-hidden', String(hidden));
});
function pointerAngle(e: PointerEvent): number {
  const rect = mechanism.getBoundingClientRect();
  return Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2);
}
mechanism.addEventListener('pointerdown', e => {
  if (dragging || e.button !== 0) return;
  const hole = (e.target as Element).closest<SVGGElement>('[data-hole]');
  if (hole && Number(hole.dataset.hole) !== model.tool.hole) {
    changed({ hole: Number(hole.dataset.hole) }, `筆尖放入第 ${Number(hole.dataset.hole) + 1} 孔。`); return;
  }
  pause(); model.mode = 'manual';
  dragging = { id: e.pointerId, angle: pointerAngle(e), travel: 0 };
  mechanism.setPointerCapture(e.pointerId); update();
});
mechanism.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== dragging.id) return;
  const rect = mechanism.getBoundingClientRect();
  // Ignore the ill-conditioned center zone without losing the pointer reference.
  const angle = pointerAngle(e), delta = angleDelta(dragging.angle, angle); dragging.angle = angle;
  if (Math.hypot(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2) < rect.width * .06) return;
  dragging.travel += Math.abs(delta);
  if (dragging.travel > .006) advance(delta);
});
const endPointer = (e: PointerEvent) => { if (dragging?.id === e.pointerId) { dragging = null; update(); } };
mechanism.addEventListener('pointerup', endPointer); mechanism.addEventListener('pointercancel', endPointer); mechanism.addEventListener('lostpointercapture', endPointer);
mechanism.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); pause(); model.mode = 'manual'; advance((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? .3 : .07));
  }
});
document.addEventListener('keydown', e => {
  const target = e.target as Element;
  if (document.querySelector('dialog[open]') || target.matches('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  else if (e.code === 'Space' && (target === document.body || target === mechanism)) { e.preventDefault(); play(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { dragging = null; pause(); } });
window.addEventListener('blur', () => { dragging = null; pause(); });
$('#export-button').addEventListener('click', () => { pause(); $<HTMLDialogElement>('#export-dialog').showModal(); });
for (const format of ['png', 'svg'] as const) {
  $(`#save-${format}`).addEventListener('click', async () => {
    const buttons = [$<HTMLButtonElement>('#save-png'), $<HTMLButtonElement>('#save-svg')];
    buttons.forEach(b => b.disabled = true);
    try {
      const paper = $<HTMLInputElement>('#include-paper').checked;
      const blob = format === 'png' ? await createPNG(model.all, paper) : new Blob([createSVG(model.all, paper)], { type: 'image/svg+xml' });
      download(blob, format); $<HTMLDialogElement>('#export-dialog').close(); announce(`${format.toUpperCase()} 已準備好，作品已送往下載。`);
    } catch { announce('匯出未完成，請再試一次。紙上的作品仍然保留。'); }
    finally { buttons.forEach(b => b.disabled = false); }
  });
}
update();
