// Entry: loads the exhibition text, decides between the 3D room and the
// 2D list (no WebGL), and reports loading progress in the entrance hall.
import { renderList, Viewer, openLayer, closeLayer, grainTexture } from './ui.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setProgress(p, label) {
  const pct = Math.round(Math.min(1, p) * 100);
  $('progress-bar').style.width = `${pct}%`;
  $('progress-label').textContent = label || `${pct}%`;
  document.querySelector('.progress').setAttribute('aria-valuenow', String(pct));
}

function webgl() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return gl || null;
  } catch (e) { return null; }
}

async function boot() {
  if (location.protocol === 'file:') return;
  grainTexture();
  let ex;
  try {
    ex = await fetch('exhibition.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  } catch (e) {
    $('notice').textContent = '無法讀取 exhibition.json。請確認以靜態伺服器開啟 showroom/。'; $('notice').hidden = false;
    return;
  }
  // entrance text
  $('ex-title').textContent = ex.title;
  $('ex-title-en').textContent = ex.titleEn;
  $('ex-year').textContent = String(ex.year);
  $('ex-statement').textContent = ex.statement;
  document.title = `${ex.title} — 線上展間`;
  $('enter').textContent = ex.ui.enter;
  setProgress(0.1, ex.ui.loading);

  const viewer = new Viewer();
  const openWork = (w, i) => viewer.open(w, i);
  const listNode = $('listview');
  const openList = () => openLayer(listNode);

  const gl = webgl();
  if (!gl) {
    // No WebGL: the list *is* the exhibition.
    renderList(ex, { onEnter: openWork, standalone: true });
    $('lobby').hidden = true;
    listNode.querySelector('[data-close]').hidden = true;
    const note = document.createElement('p'); note.className = 'sheet-note'; note.style.padding = '18px max(24px, 6vw) 0'; note.textContent = ex.ui.noWebGL;
    listNode.insertBefore(note, $('list-body'));
    openLayer(listNode);
    return;
  }

  let app = null;
  renderList(ex, {
    onEnter: openWork,
    onGoTo: (w) => { closeLayer(listNode); if (app && !app.entered) $('enter').click(); setTimeout(() => app?.focusWork(w.id), app?.entered ? 0 : 400); },
  });
  $('lobby-list').addEventListener('click', openList);

  try {
    const [{ startApp }, { detectQuality }] = await Promise.all([import('./app.js'), import('./quality.js')]);
    setProgress(0.4, ex.ui.loading);
    const quality = detectQuality(gl);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    app = await startApp({ ex, quality, viewer, reducedMotion, openList, onProgress: (p) => setProgress(0.4 + 0.6 * p, `${ex.ui.loading}　${Math.round((0.4 + 0.6 * p) * 100)}%`) });
    setProgress(1, ex.ui.ready);
    const enter = $('enter');
    enter.disabled = false;
    enter.addEventListener('click', () => app.enter());
  } catch (err) {
    console.warn(err);
    $('notice').textContent = '3D 展間無法啟動，已改以作品列表呈現。';
    $('notice').hidden = false;
    renderList(ex, { onEnter: openWork, standalone: true });
    openList();
  }
}

boot();
