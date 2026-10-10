# 接得剛剛好 Caught on the Beat — /sound2

十件關於「時間差」的視聽生成作品：接力、等待、差一點、追上，與剛好一起。每件作品的聲音與畫面讀同一份樂譜。

- 線上：https://ml-yoyohuang.github.io/artworks/sound2/
- 本機：在 repo 根目錄執行 `python3 -m http.server 8765`，開啟 http://localhost:8765/sound2/

純靜態，不需要建置。GitHub Pages 直接從 `main` 的 repo 根目錄發布，所以 `sound2/` 就是網址的 `/sound2/`。所有路徑都是相對路徑；Tone.js 已放在專案內，正式頁面不依賴任何 CDN。

## 作品

| # | 檔案 | 作品 | 概念 | 最值得看的瞬間 |
|---|---|---|---|---|
| 01 | `01-wave-relay.html` | 快樂傳到下一個 *Pass It On* | 五條線像五線譜，一個隆起帶著朱紅光點沿線前進，到尾端縮緊、彈出，下一條線往下一沉接住，才出發 | 每第四圈：五條線依序一起起跑的卡農接力 |
| 02 | `02-color-surfers.html` | 今天的浪剛剛好 *The Wave Is Just Right* | 圓（會滾）、方塊（穩、會壓扁）、三角（愛翻身）、小圓點乘著三層套色浪；浪的週期是一小節 | 第 16 小節：四個形體分別起跳，在同一個下拍一起落地 |
| 03 | `03-elastic-ensemble.html` | 聲音有彈性 *Sound Has Give* | 四條釘在黃銅釘之間的厚橡皮帶（阻尼弦模擬），短音局部收緊、長音整條撐開、重音拉開後回彈 | 第 8 小節的重音：所有帶子被拉開，依各自重量先後彈回 |
| 04 | `04-occasional-unison.html` | 這一拍，我們一起 *This Beat, Together* | 三片扇形分別以 2／3／4 拍回到中心；外圈的點就是樂譜 | 第 12 拍：三片拼成完整圓盤，停留半拍並送出波紋 |
| 05 | `05-phrase-bows.html` | 把旋律打個結 *Tie the Tune* | 兩條 2.5D 緞帶隨兩段旋律靠近、繞行、成結、停留、鬆開；結形輪替：蝴蝶結、心形結、雙圈結 | 第 11 拍的終止式：結收緊 |
| 06 | `06-beat-pages.html` | 每一拍都有另一面 *Every Beat Has a Back* | 中軸鉸接的紙片牆；背面永遠是下一幅構圖，細碎節奏先偷翻幾張 | 第 7 小節：翻頁波掃過整面牆，換成新的畫 |
| 07 | `07-wave-dialogue.html` | 你唱一句，我回一句 *You Sing, I Answer* | 左右兩條波形角色，以短彈、長伸、捲曲、上揚對話；回答保留節奏、改變結尾、加一個裝飾 | 第四次問答後，兩條在中央接成一條完整的波 |
| 08 | `08-late-wave.html` | 等一下，我也要！ *Wait, Me Too!* | 一排直立小波整齊起跳，其中一條分心、慢半拍，再用兩個十六分音符的小跳追上 | 大家剛落地，它才跳起來（開啟後約 2.5 秒就會發生） |
| 09 | `09-rhythm-rosette.html` | 這一拍，開花 *Bloom on the Beat* | 多層紙瓣花，外圈踩重拍、中圈踩反拍、內圈十六分顫動；每兩小節趁收合換花形 | 每四小節的下拍：由外而內全開，露出中心顏色 |
| 10 | `10-swing-waves.html` | 走路也可以是一首歌 *A Walk Is a Song* | 色帶以尺蠖步散步：長的半拍拱起、短的半拍伸出；鏡頭跟著隊伍，地面流過 | 停步後領頭回頭，其他依序模仿，再一起轉回前方 |

每件作品在動手前寫過藝術草案：[`ART_NOTES.md`](ART_NOTES.md)。

## 結構

```
sound2/
  index.html                 目錄（靜態，預覽圖，不載入音訊）
  01-…10-*.html              十個作品入口（由 tools/pages.py 產生，內容只有 meta 與四個 script/style）
  assets/css/sound2.css      展覽外殼與目錄樣式
  assets/js/core.js          共用核心：時鐘、排程、外殼 UI、匯出、外部音源、生命週期
  assets/js/works/*.js       每件作品的樂譜、繪圖與聲音
  assets/js/vendor/          Tone.js 15.0.4（MIT）與授權
  assets/audio/              兩首 CC BY 4.0 曲目（見 MUSIC_CREDITS.md）
  assets/previews/           目錄預覽圖（作品實際畫面）
  assets/og-image.png        目錄頁社群預覽圖（1200×630，由 tools/og.html 經 tools/og.cjs 產生）
  tools/pages.py             重新產生十個 HTML 入口
  tools/verify.cjs           Playwright 驗收腳本
  _qa/                       驗收結果與截圖聯絡表
```

技術選擇：所有作品使用原生 Canvas 2D（2.5D 緞帶與紙片以深度排序的四邊形自行投影），聲音使用 Tone.js。評估過 p5.js、Three.js 與 Tonal：十件作品都不需要 WebGL 的大量面片，而 Canvas 2D 讓匯出 PNG、品質降階與體積都最單純；和聲在每件作品內以 MIDI 數字直接寫出，不需要 Tonal。

## 音畫核心

一份樂譜，兩個讀者。

1. 每件作品提供 `events(b0, b1)`：給定拍子區間，回傳該區間的事件（拍點、聲部、音高、時值、力度、動作類型、樂句位置）。它是 seed 決定的純函式，同一個 seed 一定得到同一首曲子與同一個構圖。
2. **聲音**：`Tone.Transport` 每個十六分音符呼叫一次排程器，讀取下一個十六分音符的事件，把每個事件精確的音訊時間（`time + (e.b − b0) × 每拍秒數`）交給該作品的樂器。排程永遠只往前看一個十六分音符加 Tone 的 lookAhead（80 ms）。
3. **畫面**：每一幀從音訊時鐘讀拍子——`Transport.getTicksAtTime(AudioContext.currentTime − outputLatency)`——再用同一個 `events()` 找出「這一幀越過了哪些事件」，交給作品的 `onEvent`。連續形態（浪、波、相位）直接是拍子的函數。因此畫面事件會在聲音實際被排定的時間點之後的第一幀出現，而不是在排程 callback 提早執行的時候。
4. 沒有聲音時，拍子由單一的視覺時鐘推進；按下「開啟聲音」時，Transport 從目前的拍子（對齊到十六分音符）接手，畫面不跳。
5. `requestAnimationFrame` 只負責繪圖；沒有任何 `setInterval` 負責節拍。

暫停會暫停 Transport 並釋放所有聲部；靜音只把主增益平滑降到 0，時間照常走。換 seed、換參數、改變視窗大小時，核心會把上一幀做 0.7 秒淡出，讓構圖變化連續。頁面隱藏時自動暫停，回來時恢復；離開頁面時清除排程並釋放所有音訊節點。

### 追加新作品

1. 在 `assets/js/core.js` 的 `WORKS` 加一筆（id、編號、中文名、英文名、類別）。
2. 新增 `assets/js/works/<id>.js`，呼叫 `Sound2.start({...})`，至少實作 `layout`、`seed`、`events`、`draw`、`audio`；需要物理或一次性反應時實作 `onEvent`，需要觸控時實作 `down/move/up`。
3. 在 `tools/pages.py` 加一筆後執行 `python3 sound2/tools/pages.py`，再把卡片加入 `index.html`。

## 使用方式

- **開啟聲音**：頁面載入時安靜地預覽，按「開啟聲音」才啟動音訊；之後同一個按鈕是聲音開／關（只影響輸出）。
- **暫停／繼續**（空白鍵）、**音量**、**換一個**（R，重新產生 seed）、**調整**（每件 1–3 個參數與「還原預設」）、**存圖**（S，輸出目前畫面為 PNG，檔名含作品與 seed）、**關於**、**專心看**（H，隱藏介面）。
- **seed**：網址加上 `?seed=1234` 可以重現一個版本；按「換一個」時網址會自動記下新 seed。
- **減少動態**：系統開啟「減少動態」時，作品以靜止構圖開始，按「繼續」後以約 45% 的動作幅度播放。
- **音源**：「關於 → 音源」可以在原創生成樂譜、Carefree、Electrodoodle 與本地音檔之間切換。外部曲目原樣播放；授權與署名見 [`MUSIC_CREDITS.md`](MUSIC_CREDITS.md)。要替換外部曲目，把檔案放進 `assets/audio/`，在 `core.js` 的 `TRACKS` 修改 `src`、`title`、`bpm` 與 `page`，並更新 MUSIC_CREDITS。

## 驗收

見 [`QA_REPORT.md`](QA_REPORT.md)。重跑：

```bash
cd /path/to/artworks && python3 -m http.server 8765 --bind 127.0.0.1 &
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node sound2/tools/verify.cjs
```
