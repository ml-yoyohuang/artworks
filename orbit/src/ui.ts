import { GEARS, HOLES, INKS, RINGS } from './catalog';
import { gearMarkup } from './gears';
const icon = (name: string) => {
  const paths: Record<string, string> = {
    undo: '<path d="M8 5L3 10l5 5M3 10h10a6 6 0 010 12"/>',
    redo: '<path d="M16 5l5 5-5 5m5-5H11a6 6 0 000 12"/>',
    clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 10v8m4-8v8"/>',
    export: '<path d="M12 16V3m-5 5l5-5 5 5M4 15v6h16v-6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${paths[name]}</svg>`;
};
export function layout(): string {
  return `<a class="skip-link" href="#draw-button">跳至繪圖操作</a>
  <header class="masthead"><a href="./" class="wordmark" aria-label="ORBIT 首頁">O<span>R</span>BIT<span class="wordmark-dot">®</span></a><span class="masthead-center">AN EXERCISE IN WONDER</span><button id="about-button" class="text-button">關於工作室 <span aria-hidden="true">↗</span></button></header>
  <main>
    <section class="introduction" aria-labelledby="title">
      <div class="eyebrow"><span class="red-dot"></span> THE GEOMETRY OF PLAY <span class="edition">VOL. 01 / DIGITAL STATIONERY</span></div>
      <div class="title-row"><h1 id="title">A little turn.<br><em>Endless possibilities.</em></h1><div class="intro-note"><span class="vertical-rule"></span><p>齒輪、墨水，與幾何的詩。<br>讓一圈小小的轉動，<br>留下意想不到的花。</p><span class="micro">A SPIROGRAPH ATELIER</span></div></div>
    </section>
    <section class="atelier" aria-label="萬花尺工作桌">
      <div class="view-options"><span class="micro">PAPER / VIEW</span><div><button id="contrast-toggle" aria-pressed="false" title="加深畫面文字與筆跡；匯出保留原墨色">高對比配色 ◐</button><button id="focus-toggle" aria-pressed="false">全螢幕繪圖 ⛶</button></div></div>
      <div class="paper-column">
        <div class="paper-topline"><span class="micro">01 — THE DRAWING TABLE</span><div class="paper-actions"><button id="quick-draw" class="text-button">開始繪製 ↗</button><button id="tools-toggle" class="text-button" aria-pressed="true">隱藏齒輪 <span aria-hidden="true">◌</span></button></div></div>
        <div class="paper" id="paper">
          <span class="registration top-left" aria-hidden="true">+</span><span class="registration top-right" aria-hidden="true">+</span><span class="registration bottom-left" aria-hidden="true">+</span><span class="registration bottom-right" aria-hidden="true">+</span>
          <span class="paper-caption micro">ORBIT / STUDY IN CIRCULAR MOTION</span>
          <canvas id="completed-canvas" aria-hidden="true"></canvas><canvas id="active-canvas" aria-hidden="true"></canvas>
          <svg id="mechanism" viewBox="0 0 760 760" tabindex="0" role="group" aria-label="手動繪圖區。拖曳旋轉；鍵盤左右方向鍵轉動齒輪。" aria-describedby="drawing-hint"></svg>
          <div class="paper-bottom"><span id="paper-label">練習紙 Nº 001</span><span class="micro">ARCHIVAL IVORY · 760 × 760</span></div>
        </div>
        <div class="drawing-caption"><span id="drawing-hint">從一朵藍色蕾絲開始。試著疊上一筆朱紅。</span><span id="stroke-count" class="micro">01 STROKE</span></div>
      </div>
      <aside class="instruments" aria-label="文具與繪圖工具">
        <div class="tool-heading"><span class="micro">02 — THE INSTRUMENTS</span><span class="tiny-star" aria-hidden="true">✳</span></div>
        <div class="ring-control"><label for="ring-select">固定齒圈 <span class="micro">RING</span></label><select id="ring-select" aria-label="固定齒圈">${RINGS.map(n => `<option value="${n}" ${n === 120 ? 'selected' : ''}>${n} teeth</option>`).join('')}</select></div>
        <fieldset class="gear-collection"><legend>選一枚齒輪 <span class="micro">GEAR COLLECTION</span></legend><div class="gears-grid">${GEARS.map((g, i) => `<button class="gear-choice" data-gear="${g.teeth}" aria-label="${g.teeth} 齒 ${g.name}" aria-pressed="${g.teeth === 52}"><svg viewBox="-165 -165 330 330" aria-hidden="true">${gearMarkup(g.teeth, g.color, `choice-${i}`)}</svg><span><b class="micro">${String(i + 1).padStart(2, '0')}</b><span>${g.name}</span><small class="micro">${g.teeth}T</small></span></button>`).join('')}</div></fieldset>
        <fieldset class="hole-control"><legend>落筆的位置 <span class="micro">PEN HOLE</span></legend><div class="hole-buttons">${HOLES.map((_, i) => `<button data-hole-choice="${i}" aria-label="筆孔 ${i + 1}" aria-pressed="${i === 4}"><span class="hole-dot" style="--hole-size:${4 + i * 1.2}px"></span><span class="micro">0${i + 1}</span></button>`).join('')}</div></fieldset>
        <fieldset class="ink-station"><legend>今天的墨色 <span class="micro">INK LIBRARY</span></legend><div class="pens">${INKS.map((ink, i) => `<button class="pen-choice" data-ink="${i}" style="--ink:${ink.color}" aria-label="${ink.name}" aria-pressed="${i === 0}" title="${ink.name}"><span class="pen-object"><span class="pen-clip"></span><span class="pen-name">ORBIT · 0.3</span><span class="pen-tip"></span></span><span class="ink-dot"></span></button>`).join('')}</div><div class="ink-caption"><span id="ink-name">朱紅</span><span id="ink-english" class="micro">01 / VERMILION</span></div></fieldset>
        <div class="tool-note"><span aria-hidden="true">↖</span><p>每個孔位，都是另一種可能。<br><small>換一枚齒輪，看看會發生什麼。</small></p></div>
      </aside>
      <div class="control-strip">
        <div class="play-control"><button id="draw-button" class="draw-button"><span id="play-icon" aria-hidden="true">▶</span><span id="play-label">開始繪製</span></button><button id="stop-button" class="stop-button" aria-label="結束這一筆" title="結束這一筆">■</button></div>
        <div class="mode-speed"><div class="mode-switch" role="group" aria-label="繪圖方式"><button data-mode="auto" aria-pressed="true">自動</button><button data-mode="manual" aria-pressed="false">手動</button></div><label class="speed-label" for="speed">速度<select id="speed" title="10× 以上暫時收起滾動齒輪，保留完整筆跡"><option value=".5">½×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option><option value="10">10×</option><option value="20">20×</option></select></label></div>
        <div class="history-controls"><button id="undo" aria-label="復原上一筆" title="復原 · Ctrl Z">${icon('undo')}</button><button id="redo" aria-label="重做上一筆" title="重做 · Ctrl Shift Z">${icon('redo')}</button><button id="clear" aria-label="清空紙張" title="清空紙張">${icon('clear')}</button></div>
        <button id="export-button" class="export-button">收藏作品 ${icon('export')}</button>
      </div>
      <div class="technical-line"><span id="status-text">READY WHEN YOU ARE</span><div class="progress-track" role="progressbar" aria-label="曲線閉合進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="progress-fill"></span></div><span id="progress-text">00%</span><span id="geometry-info">120 : 52 / 13 REVOLUTIONS</span></div>
    </section>
    <section class="colophon"><span class="colophon-mark" aria-hidden="true">◎</span><p>The poetry of gears,<br><em>ink, and geometry.</em></p><div class="colophon-note">不必畫得完美。<br>只需要，好奇地開始。<span class="micro">MADE FOR THE JOY OF MAKING.</span></div><button id="new-paper" class="text-button">一張新紙，再試一次 <span aria-hidden="true">↗</span></button></section>
  </main><footer><span>ORBIT — A SPIROGRAPH ATELIER</span><span>DESIGNED TO GO AROUND.</span><span>PHASE 01 · 2026</span></footer>
  <p class="sr-only" id="announcement" role="status" aria-live="polite"></p><div id="toast" class="toast" aria-hidden="true"></div>
  <dialog id="export-dialog" aria-labelledby="export-title"><form method="dialog"><button class="dialog-close" aria-label="關閉">×</button></form><span class="micro">A LITTLE SOMETHING TO KEEP</span><h2 id="export-title">留住這一圈。</h2><p>匯出紙上的所有筆跡，包括尚未完成的部分。<br>齒輪與操作標記會留在工作桌上。</p><label class="paper-checkbox"><input id="include-paper" type="checkbox" checked /> 保留暖白紙張背景</label><div class="export-options"><button id="save-png"><strong>PNG <span>↗</span></strong><small>3200 × 3200 · 高解析圖片</small></button><button id="save-svg"><strong>SVG <span>↗</span></strong><small>可編輯的向量線條</small></button></div><p class="dialog-footnote">取消勾選背景，即可匯出透明作品。</p></dialog>
  <dialog id="clear-dialog" aria-labelledby="clear-title"><span class="micro">A FRESH BEGINNING</span><h2 id="clear-title">換一張新紙？</h2><p>目前的筆跡與復原紀錄將會清除。<br>喜歡這張作品的話，記得先收藏。</p><div class="dialog-actions"><button id="cancel-clear">留下這張</button><button id="confirm-clear" class="primary">換張新紙</button></div></dialog>
  <dialog id="about-dialog" aria-labelledby="about-title"><form method="dialog"><button class="dialog-close" aria-label="關閉">×</button></form><span class="micro">THE GEOMETRY OF PLAY</span><h2 id="about-title">小小齒輪，<br><em>無限軌跡。</em></h2><p>ORBIT 是一座數位萬花尺工作室。小齒輪沿著齒圈內緣滾動，筆孔留下的軌跡，稱為「內旋輪線」。</p><ol><li>選齒輪、筆孔與墨色。</li><li>按「開始繪製」，或在紙面拖曳轉圈。</li><li>換一種組合，疊出自己的風景。</li></ol><p>手動模式：聚焦紙面後，使用 ← → 轉動，Shift 加快。自動與手動可隨時接續；切換工具會保留上一筆，另起新線。</p><p class="dialog-footnote">鍵盤：空白鍵播放／暫停 · Ctrl / ⌘ Z 復原<br>本作的曲線運算與匯出皆在你的瀏覽器中完成。</p></dialog>`;
}
