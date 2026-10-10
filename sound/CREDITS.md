# 聲音・波形・節奏 / 製作與來源

展覽名稱：**小小聲音遊樂場 / Soft Scores**。16 件作品的圖形、互動、繁體中文策展文字與合成樂譜，均為本專案新製作；沒有使用外部圖片、音檔或取樣音源。

## 聲音

全部使用瀏覽器即時合成。Tone.js **15.0.4** 提供 Web Audio 樂器、節拍時鐘、音量控制及繪圖排程；以五聲音階、短音包絡、低音鼓與粉紅噪音組成不同樂譜。預設安靜，按下「開始聆聽」才啟用聲音。

- [Tone.js 專案與 MIT 授權](https://github.com/Tonejs/Tone.js)
- [鎖定版本的 CDN](https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js)
- [PolySynth 15.0.4 官方文件](https://tonejs.github.io/docs/15.0.4/classes/PolySynth.html)

沒有使用真實音樂；沒有需補下載的曲目、音樂版或音檔下載按鈕，也不需要 `/sound/audio/` 或 `MUSIC_TODO.md`。

## 字體與畫面

- Latin：**DM Sans**，Fontsource **5.2.6** 的固定版本 WOFF2。DM Sans 採 [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)；[字體檔](https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.2.6/files/dm-sans-latin-400-normal.woff2)。
- 繁體中文標題：平台的宋體字族（Songti TC / Noto Serif CJK TC / PMingLiU）；內文：PingFang TC / Microsoft JhengHei。沒有另行散布系統字體檔。字體 CDN 失效時仍可使用平台替代字體。
- 所有畫面均由原生 Canvas 2D 程式繪製；目錄 WebP 縮圖擷取自本系列的實際畫面。

作品 HTML 的 CSS 與 JavaScript 全部內嵌。唯一外部程式函式庫為上述鎖定版本的 Tone.js。
