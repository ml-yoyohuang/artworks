# 聲音・波形・節奏 / 製作與來源

展覽名稱：**小小聲音遊樂場 / Soft Scores**。16 件作品的圖形、互動與繁體中文策展文字為本專案製作；全系列以瀏覽器即時合成演奏《D 大調卡農》，沒有外部圖片、錄音或取樣音源。

<a id="canon"></a>

## 卡農樂譜

- 作曲：**Johann Pachelbel（帕海貝爾）**，*Canon per 3 Violini e Basso*；原作已進入公共領域。
- 數位排譜：**Michael Fischer v. Mollard**，版本 **Mutopia-2015/09/02-2047**。
- 來源：[Mutopia Project 樂譜頁](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047)、[MIDI 樂譜資料](https://www.mutopiaproject.org/ftp/PachelbelJ/Canon_per_3_Violini_e_Basso/Canon_per_3_Violini_e_Basso-mids.zip)、[LilyPond 排譜原始檔](https://www.mutopiaproject.org/ftp/PachelbelJ/Canon_per_3_Violini_e_Basso/Canon_per_3_Violini_e_Basso-lys.zip)。
- 排譜授權：[Creative Commons Attribution 4.0 International（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/)。
- 本專案改編：將完整 MIDI 樂譜轉為內嵌音高／起音／時值事件，以正弦、三角、方波或鋸齒合成器代替弦樂；可調速度、互動八度與短音包絡，節奏作品另加輕量合成鼓點。保留原樂譜的音高、節奏、四聲部與進場關係；這是互動合成演奏，不是原版錄音。

完整樂譜含三個旋律聲部與反覆低音，共 **1,956 個音符事件**；循環長度為 **57 小節 / 228 個四分音符拍**（含結尾休止）。`score/canon-original.mid` 僅是可重製的樂譜資料；`score/canon.json` 由 `tools/import-canon.py` 產生，再由製作工具內嵌到每個 HTML。播放時不讀取 MIDI、JSON 或音檔。

## 聲音引擎

Tone.js **15.0.4** 提供 Web Audio 樂器、節拍時鐘、音量控制及繪圖排程。預設安靜，按下「開始聆聽」才啟用聲音。

- [Tone.js 專案與 MIT 授權](https://github.com/Tonejs/Tone.js)
- [鎖定版本的 CDN](https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js)
- [PolySynth 15.0.4 官方文件](https://tonejs.github.io/docs/15.0.4/classes/PolySynth.html)

沒有使用外部音樂錄音；沒有需補下載的曲目、音樂版或音檔下載按鈕，不需要 `/sound/audio/` 或 `MUSIC_TODO.md`。

## 字體與畫面

- Latin：**DM Sans**，Fontsource **5.2.6** 的固定版本 WOFF2。DM Sans 採 [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)；[字體檔](https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.2.6/files/dm-sans-latin-400-normal.woff2)。
- 繁體中文標題：平台的宋體字族（Songti TC / Noto Serif CJK TC / PMingLiU）；內文：PingFang TC / Microsoft JhengHei。沒有另行散布系統字體檔。字體 CDN 失效時仍可使用平台替代字體。
- 所有畫面均由原生 Canvas 2D 程式繪製；目錄 WebP 縮圖擷取自本系列的實際畫面。

作品 HTML 的 CSS 與 JavaScript 全部內嵌。唯一外部程式函式庫為上述鎖定版本的 Tone.js。
