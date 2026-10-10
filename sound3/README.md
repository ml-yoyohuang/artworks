# 聲音成為物質 — SOUND / 3

八件聲音、空間與能量的生成藝術作品。介面為繁體中文；每件有獨立 HTML、生成規則、原創聲音、靜態預展與代表事件。不需要下載音樂、開啟麥克風、GPU 或 CDN。

正式目錄（僅在部署確認後才視為已發布）：https://ml-yoyohuang.github.io/artworks/sound3/

## 執行與發布

在 repository 根目錄啟動 HTTP：

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

瀏覽 http://127.0.0.1:8766/sound3/ 。ES modules 必須使用 HTTP；不以 file:// 驗收。這個專案沒有 package.json、建置或 lint pipeline。全部資產直接由 GitHub Pages 的 main 根目錄發布；沒有額外編譯產物或伺服器功能。

|頁面|作品與代表事件|聲音／材料規則|
|---|---|---|
|[01](01-resonant-architecture.html)|共振建築，8 秒和弦更換，約 3 秒內改造通道|四聲部和弦與鐘音；持續音凝聚，同一組拱門、折板保留與變形|
|[02](02-chord-loom.html)|和弦織機，8 秒樂句回返，16 秒變奏|低音粗經、旋律細緯、噪音短節點；交替上下遮擋；退出聲部留下疏鬆區|
|[03](03-silence-cuts.html)|休止符，3 秒短裂、11 秒長沉默|聲音力度記憶決定切口深度；只有樂譜中的 rest 開啟表面|
|[04](04-sound-fossil.html)|聲音化石，32 秒定型|固定 seed、樂譜與固定步長累積；節奏細層、長音脊線、樂句沿既有表面再次沉積|
|[05](05-phase-tides.html)|相位潮汐，約 10 秒交會，80 秒一輪|0.25 Hz 與 0.2625 Hz 的原創音型；畫面以同一時鐘與相位關係推導；可換 60／120 秒差值|
|[06](06-breath-portrait.html)|呼吸雕塑，14 秒定型|延伸、斷續、迴旋三種合成示範；已知有聲音高控制扭轉，氣音噪音控制孔隙；保留兩件先前標本|
|[07](07-echo-labyrinth.html)|回聲迷宮，第一回聲揭露牆面，4 秒後路徑改變|射線與已揭露牆相交；距離決定延遲與衰減；新牆參與下一輪路徑|
|[08](08-stored-energy.html)|能量蓄積，預設約 13.4 秒翻開|音符包絡隨固定步長積分減自然流失；臨界鎖定、5 秒恢復、鮮明背面保持可觀看|

## 操作

每頁「開始聆聽」才建立／恢復 AudioContext。播放／暫停也可用空白鍵。重播明確重新形成材料；化石與呼吸曲終不循環、不自動清空。靜音只改輸出增益，音畫時間與作品中的休止保持一致。音量以平滑增益調整，預設 45%，並有壓縮器限制峰值。

每件有少量專屬控制。化石與呼吸可拖曳或用左右方向鍵旋轉。存圖只匯出當前 Canvas PNG，不包含操作列；檔名記錄 seed 與秒數。作品頁提供目錄、上一件與下一件。

換和弦／織法／示範／起點／模式時，重啟該段演出，聲畫保持一致；建築保留構件座標並漸變。聲部開關立即停止持續聲音，保留已織歷史，新行記錄新的聲部狀態。呼吸示範切換留下前一件標本。

### 麥克風

僅按下「用我的聲音」才請求權限。分析在本機，沒有 MediaRecorder、上傳或持久保存聲音；只保留當頁輪廓資料。RMS 使用開／關門檻與 0.4 秒短停容忍，最長 14 秒。週期相關信度不足不產生音高，氣流用頻譜平坦度與能量表現。麥克風不輸出至喇叭，避免回授。拒絕、無裝置、不支援或不安全來源皆回到合成示範。定型、暫停、換頁皆停止串流。輪廓不代表個性、情緒、健康或身份。

## 聲音與同步

`model.js` 定義事件：開始時間、時值、力度、MIDI 音高、聲部、樂句、動作。`audio.js` 提前 180 ms 排程至 Web Audio 的 `currentTime`，以 25 ms timeout 補充短前瞻；timeout 只補佇列，不作為音樂主時鐘。

`core.js` 從同一 AudioContext 讀已播放時間，扣除可用的 outputLatency；每幀以 1/60 秒固定步長補齊材料狀態，只於真正到達樂譜時間時作用視覺。AudioContext suspend 暫停時鐘與已排定包絡，resume 保留相位與材料。requestAnimationFrame 只更新畫面。原生排程不依賴 Tone、混音分析或 FFT 和弦推測。

背景分頁自動暫停，返回後明確按繼續，避免失控補播。pagehide 取消排程、停止與斷開音訊節點、關閉 AudioContext 與麥克風。bfcache 返回時重新載入初始化。

## Seed、重現與限制

網址 `?seed=4172` 重新呈現同一樂譜與初始材料。「留下另一件標本」會更換並記入網址。固定 seed／參數／1/60 步長得到一致化石；`tools/model-tests.mjs` 直接比較材料陣列。沒有跳轉 UI，以免播放與累積歷史不一致。開發驗收 API `Sound3.debug.stepTo(t)` 只能在暫停時重算，不向觀眾提供；報告區分此固定步長檢查與真正等待的演化。

Canvas 以 2.5D 面片投影、前後排序、表面顆粒與受控光影表現材質，並非 WebGL 或物理模擬。建築是聲學啟發造形；回聲採用縮尺的創作性路徑模型（世界座標傳播速度 8 單位／秒），未測量真實房間。回聲最多三次反射，每次衰減，最多十道牆，所有距離有正下限。手動發聲另以已揭露牆中點的有限返回路徑生成，不是完整散射求解。

DPR 上限 1.6，畫面上限約 45 fps；減少動態偏好以 4 fps 保留生成歷史，潮汐僅留下慢包絡，蓄能使用靜態的蓄能／釋放構圖，預展始終靜止，觀眾仍須明確播放。手機有獨立布面高度、建築尺度與物件比例；所有控制可捲動抵達，沒有橫向溢出。數據上限：織物 96 行、節點 96、切口 8、化石 96 材料格及 96 層、呼吸 140 點與 2 件先前標本、回聲 24 條路徑／32 手動等待事件、能量 0–1.8、音訊節點約 90 個硬上限。音訊不可用時改為標示的無聲展演，仍可操作與存圖。

## 檔案與驗收

- `assets/js/catalog.js`：八件策展資料；`tools/pages.mjs` 產生九個真實 HTML。
- `assets/js/model.js`：決定性作曲、固定步長材料與回聲路徑。
- `assets/js/works.js`、`draw.js`：各自場景與投影／材料畫法。
- `assets/js/audio.js`、`core.js`：聲音、UI、生命週期、麥克風。
- `assets/previews/`：作品真實運行後擷取的代表畫面，WebP；不是代替實際作品的影片或圖像。
- `ART_DIRECTION.md`：創作方向與合理假設。
- `MUSIC_CREDITS.md`：實際使用的音源與授權。
- `QA_REPORT.md`、`_qa/results.json`、`_qa/shots/`：實際驗證結果、限制與截圖。

```sh
node sound3/tools/pages.mjs
node sound3/tools/model-tests.mjs
node sound3/tools/static-check.mjs
# 先啟動上述 HTTP，再執行（需要本機 Playwright 與 Chromium）：
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright node sound3/tools/verify.cjs
```

使用瀏覽器標準的官方參考：[AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)、[精確排程 start](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start)、[Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)。本展沒有需要固定版本的第三方執行套件。驗收瀏覽器版本與實際限制見 QA_REPORT。
