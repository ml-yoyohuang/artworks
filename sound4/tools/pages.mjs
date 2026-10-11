// 產生 sound4 的九個 HTML 入口：node sound4/tools/pages.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exhibition, works } from './catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const preview = w => `assets/previews/${w.file.replace('.html', '.jpg')}`;
const head = (title, desc, extra = '') => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#111213">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/sound4.css">
${extra}</head>`;

works.forEach((w, i) => {
  const prev = works[(i + works.length - 1) % works.length], next = works[(i + 1) % works.length];
  const li = arr => arr.map(x => `<li>${esc(x)}</li>`).join('');
  const html = `${head(`${w.no} ${w.title}｜${w.subtitle} — SOUND / 4`, `${w.title}《${w.subtitle}》：${w.invite}`, `<meta property="og:image" content="${preview(w)}">
<script type="importmap">{"imports":{"three":"./assets/vendor/three/three.module.min.js"}}</script>
`)}
<body class="work-page" data-work="${w.no}" style="--accent:${w.accent}">
<a class="skip" href="#controls">跳到播放控制</a>
<header class="topbar">
  <a class="brand" href="index.html"><b>SOUND / 4</b><span>${esc(exhibition.title)}</span></a>
  <nav class="worknav" aria-label="作品導覽"><a href="${prev.file}" rel="prev" aria-label="上一件：${esc(prev.title)}">← 上一件</a><span aria-label="第 ${Number(w.no)} 件，共 8 件">${w.no} / 08</span><a href="${next.file}" rel="next" aria-label="下一件：${esc(next.title)}">下一件 →</a></nav>
</header>
<main>
  <section id="stage" class="stage ${w.theme}" aria-label="作品展演場域">
    <canvas id="art" tabindex="0" role="img" aria-label="${esc(w.canvasLabel)}"></canvas>
    <img id="poster" class="poster" src="${preview(w)}" alt="${esc(w.title)}實際運行時擷取的畫面" hidden>
    <div class="title-block"><p class="no">${w.no} · ${esc(w.en.toUpperCase())}</p><h1>${esc(w.title)}</h1><p class="sub">《${esc(w.subtitle)}》</p></div>
    <p id="readout" class="readout"></p>
    <div id="start-overlay" class="start-overlay"><button id="start" class="start">開始聆聽</button><p>按下後才會發出聲音・建議音量適中</p></div>
    <p id="status" class="status" role="status" aria-live="polite"></p>
  </section>
  <section id="controls" class="controls" aria-label="播放控制">
    <div class="transport">
      <button id="play" class="primary" aria-pressed="false">開始</button>
      <button id="replay">重播</button>
      <button id="mute" aria-pressed="false">靜音</button>
      <label class="volume">音量 <input id="volume" type="range" min="0" max="100" value="60"></label>
      <span id="time" class="time" aria-label="播放時間">00:00</span>
    </div>
    <div class="special" aria-label="作品操作">${w.controls}</div>
  </section>
  <article class="notes">
    <div>
      <p class="eyebrow">${w.no} · ${esc(w.en.toUpperCase())}</p>
      <h2>${esc(w.title)}《${esc(w.subtitle)}》</h2>
      <p class="statement">${esc(w.statement)}</p>
    </div>
    <div class="cols">
      <section><h3>代表時刻</h3><p class="moment">${esc(w.moment)}</p></section>
      <section><h3>如何觀看</h3><ul>${li(w.view)}</ul></section>
      <section><h3>生成規則</h3><ul>${li(w.rules)}</ul></section>
      <section><h3>聲音與技術</h3><p>${esc(w.tech)}</p><p class="small">聲音：原創程式作曲，作者 SOUND / 4，以 CC0 釋出；不使用外部錄音。詳見 <a href="MUSIC_CREDITS.md">MUSIC_CREDITS.md</a>。</p><p class="small">鍵盤：空白鍵播放／暫停，M 靜音。</p></section>
    </div>
  </article>
</main>
<footer class="pager">
  <nav aria-label="作品間導覽"><a href="${prev.file}">← ${prev.no} ${esc(prev.title)}</a><a href="index.html">展覽目錄</a><a href="${next.file}">${next.no} ${esc(next.title)} →</a></nav>
  <p>SOUND / 4 · ${esc(exhibition.title)}</p>
</footer>
<script type="module" src="assets/js/works/${w.js}"></script>
</body>
</html>
`;
  writeFileSync(join(root, w.file), html);
});

const cards = works.map(w => `    <li><a class="card" href="${w.file}" style="--accent:${w.accent}">
      <div class="frame"><img src="${preview(w)}" alt="${esc(w.title)}的實際畫面：${esc(w.canvasLabel)}" width="1280" height="800" loading="eager" decoding="async"></div>
      <div class="row"><span class="num">${w.no}</span><h2>${esc(w.title)}</h2><span class="en">${esc(w.en)}</span></div>
      <p class="subtitle">《${esc(w.subtitle)}》</p>
      <p class="invite">${esc(w.invite)}</p>
    </a></li>`).join('\n');

const index = `${head(`${exhibition.title} — SOUND / 4`, `${exhibition.theme}：八件聲音生成藝術作品。`, `<meta property="og:image" content="${preview(works[0])}">
`)}
<body class="index-page">
<a class="skip" href="#works">跳到作品列表</a>
<header class="topbar">
  <a class="brand" href="./"><b>SOUND / 4</b><span>${esc(exhibition.title)}</span></a>
  <nav class="worknav" aria-label="其他展區"><a href="../sound3/">SOUND / 3</a><a href="${works[0].file}">從 01 開始 →</a></nav>
</header>
<main>
  <section class="index-hero">
    <div>
      <p class="kicker">${esc(exhibition.en)}</p>
      <h1>${esc(exhibition.title)}<small>${esc(exhibition.theme)}</small></h1>
    </div>
    <div>
      ${exhibition.intro.map(p => `<p class="intro">${esc(p)}</p>`).join('\n      ')}
      <p class="meta">八件作品・各自獨立的生成規則與原創聲音・不需下載、不需麥克風即可完整觀看</p>
    </div>
  </section>
  <ol id="works" class="works" aria-label="八件作品">
${cards}
  </ol>
  <section class="visit" aria-label="觀展須知">
    <div><h3>聆聽</h3><p>每件作品進入後按「開始聆聽」才會發聲。建議耳機或喇叭、音量適中；切換作品時上一件的聲音會停止。靜音觀看時，畫面仍依樂譜同步。</p></div>
    <div><h3>操作</h3><p>空白鍵播放／暫停，M 靜音。每件作品有少量自己的操作：換和弦、換織法、留白程度、重新生成、示範聲音、發出一個聲音、蓄能模式。</p></div>
    <div><h3>關於規則</h3><p>畫面不是錄好的影片：每一件都由同一份樂譜同時產生聲音與圖像。建築與回聲是聲學啟發的創作模型，並非精確的聲學模擬。</p></div>
  </section>
</main>
<footer class="index-foot">
  <p>SOUND / 4 · 2026 · 聲音均為原創程式作曲（CC0）。<a href="README.md">README</a> · <a href="MUSIC_CREDITS.md">音源與授權</a> · <a href="QA_REPORT.md">驗證報告</a></p>
  <p><a href="../">artworks</a></p>
</footer>
</body>
</html>
`;
writeFileSync(join(root, 'index.html'), index);
console.log('wrote 9 pages');
