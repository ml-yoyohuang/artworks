# 聲音的居所 — SOUND / 4

八件聲音生成藝術作品：聲音如何形成空間、材料、記憶與事件。介面為繁體中文；每件有自己的 HTML 入口、生成規則、原創程式作曲、材質與代表事件。**不需要下載音樂、不需要麥克風、不需要建置步驟**即可完整展演。

正式網址（GitHub Pages，main 分支根目錄）：https://ml-yoyohuang.github.io/artworks/sound4/

## 本地執行

在 repository 根目錄啟動任一靜態 HTTP 伺服器（ES modules 與 import map 需要 HTTP，不以 `file://` 驗收）：

```sh
python3 -m http.server 8777 --bind 127.0.0.1
```

開啟 http://127.0.0.1:8777/sound4/ 。

本專案沒有 package.json 與打包流程；GitHub Pages 直接發布 main 根目錄。唯一的第三方執行期依賴 three.js r180（MIT）已本地化於 `assets/vendor/three/`，以 import map 指向，不依賴 CDN。

## 路由

| 路徑 | 作品 | 技術 |
|---|---|---|
| `index.html` | 展覽目錄 | 靜態頁；卡片使用實際運行擷取的 JPEG，不在目錄頁同時跑 WebGL |
| `01-resonant-architecture.html` | 共振建築《空氣有自己的骨架》 | three.js、VSM 柔和陰影、霧 |
| `02-chord-loom.html` | 和弦織機《一首歌，被織成一匹布》 | Canvas 2D 逐列繪製 |
| `03-silence-cuts.html` | 休止符《沉默把空間切開》 | 自寫 GLSL 片段著色器 |
| `04-sound-fossil.html` | 聲音化石《這首歌曾經存在》 | three.js、自訂頂點屬性控制礦化 |
| `05-phase-tides.html` | 相位潮汐《兩個幾乎同步的世界》 | 自寫 GLSL 片段著色器 |
| `06-breath-portrait.html` | 呼吸雕塑《一口氣的肖像》 | three.js、MeshPhysicalMaterial 透射 |
| `07-echo-labyrinth.html` | 回聲迷宮《房間是聲音走過的路》 | three.js、局部點光源 |
| `08-stored-energy.html` | 能量蓄積《尚未發生的爆發》 | three.js、虹彩內側 |

九個 HTML 由 `tools/pages.mjs` 依 `tools/catalog.mjs`（策展文字、操作、配色）產生，皆為真實存在的獨立頁面。修改文字後重新執行：

```sh
node sound4/tools/pages.mjs
```

## 八件作品與音畫規則

| 作品 | 代表時刻 | 規則（聲音 → 圖像） |
|---|---|---|
| 01 共振建築 | 第 8 秒起每 8 秒換和弦，空間在約 3 秒內被推成另一種建築 | 四聲部 = 四道牆；音高 → 平面位置；音程 → 通道寬與拱門跨度；持續音 → 穩定度（長音站穩、短鐘音只留下晃動的懸掛片）；緊張音程 → 牆體偏轉；七和弦 → 夾層。構件保持身分，以臨界阻尼彈簧移動。 |
| 02 和弦織機 | 第 10 秒樂句重複（同一紋樣回來）、第 21 秒變奏推偏、第 31 秒旋律退場留下透光薄紗 | 每列 = 一個八分音符；低音 → 粗經線區帶（隨和弦根音移動）；旋律 → 有色緯線與斜紋位移；打擊 → 結點與短緯。最多保留 360 列。 |
| 03 休止符 | 第 7 秒強音後 3.5 秒的休止打開第一道深縫；第 22 秒 5 秒長休止開出最大切口 | 前一段聲音的力度、長度、音域 → 切口方向、長度、深度、最大開口；開口隨休止已持續的時間成長；聲音回來時收合成疤。 |
| 04 聲音化石 | 約 47 秒曲終，燈光轉為標本光並開始自轉 | 對數螺旋沉積；節奏 → 環肋；長音 → 固定角位的連續脊線；休止 → 縫合線；重複樂句 → 沿舊脊線再沉積並礦化。 |
| 05 相位潮汐 | 第 14 秒第一次聚合；第 59 秒最大分離；第 104 秒再聚合 | 兩組 8 音音型（6 秒與約 5.63 秒一輪）由同一音訊時鐘推導相位；相位差 → 兩層波前夾角與干涉帶。 |
| 06 呼吸雕塑 | 第 6 秒與第 11 秒：同一句話輕緩／急促留下兩件不同物件 | 音高 → 扭轉；力度 → 厚度；氣息 → 孔隙與材質（玻璃／陶瓷／石膏）；停頓 → 細頸；長停頓 → 分成部件。 |
| 07 回聲迷宮 | 第一聲後不到 1 秒照亮最近的牆；之後回聲沿已揭露的牆反射，照亮新走道 | 射線路徑；延遲 = 路徑 ÷ 9 單位／秒；未揭露的牆吸收並在抵達時揭露；已揭露的牆鏡面反射（最多 3 次）。 |
| 08 能量蓄積 | 平衡模式約第 21 秒第一次翻開 | 能量固定步長積分減流失；蓄能 → 線張力、瓣片鼓起、縫隙透色；越過臨界 → 翻開、停留、重組（鎖定期間注入無效）。 |

建築與回聲是**聲學啟發的創作模型**，並未求解真實聲場，也沒有測量真實房間。

## 聲音與同步

- 全部聲音為原創程式作曲，以原生 Web Audio 即時合成（振盪器、濾波、雜訊、FM、共振峰），見 [MUSIC_CREDITS.md](MUSIC_CREDITS.md)。
- 每件作品的樂譜（時間、音高、時值、力度、聲部、樂句、休止）同時驅動聲音與視覺；不使用混音分析冒充已知樂譜。
- `assets/js/core/audio.js`：AudioContext 的 `currentTime` 是唯一主時鐘；`setInterval` 只補排 0.16–0.22 秒前瞻視窗。視覺事件以「實際播放時間」（扣除 outputLatency）在 `requestAnimationFrame` 中觸發。
- 暫停 = `ctx.suspend()`（凍結時鐘與包絡）；重播建立新的匯流排並淡出舊聲音；靜音只改輸出增益，畫面照樣依樂譜進行，不冒充作品裡的休止。
- 主輸出：主增益 → 壓縮器（-16 dB 起壓）→ 音量（平方曲線，預設 60%）→ 靜音；所有聲部有包絡與上限（約 56–64 個同時發聲）。
- 只有按下「開始聆聽」（或作品操作）才建立／恢復 AudioContext。分頁進入背景時自動暫停，返回後按「繼續」，不會一次補播過期事件。`pagehide` 時停止排程、關閉 AudioContext、麥克風與 WebGL context。

## 操作

- 共通：開始／暫停／繼續、重播、靜音、音量、上一件／下一件／目錄。鍵盤：空白鍵播放／暫停，M 靜音；01、04、06、08 可拖曳或左右方向鍵轉動視角；07 方向鍵移動聲源。
- 01 和弦組（中殿／迴廊／高塔）、空間（縱向廊道／環形中庭）
- 02 織法（平織／斜紋／緞紋）、聲部開關、匯出整匹布 PNG
- 03 留白（少／中／多）、用我的聲音（麥克風）
- 04 重新生成（新 seed）、匯出 PNG
- 05 速度差（150／90／45 秒一輪）、靠近／離開
- 06 四種示範、用我的聲音、匯出 PNG
- 07 發出一個聲音、換一個起點、點擊地面移動
- 08 脆弱／平衡／穩定、注入一次

## Seed 與重現

`?seed=4172`（預設）決定 04 化石的樂譜變奏、螺旋參數與色系，也影響 03 切口位置與 07 迷宮。04 以 1/120 秒固定步長模擬整首樂譜，同一 seed 得到逐值相同的標本（`tools/model-tests.mjs` 以指紋比對）；「重新生成」更換 seed 並寫入網址。04 沒有跳轉功能，以確保播放時間與材料歷史一致。

## 麥克風（03、06）

只有按下「用我的聲音」才請求權限。分析在本機（RMS、頻譜重心與平坦度、正規化自相關音高；信度不足不產生音高）；不錄音、不上傳、不保存、不接到喇叭。拒絕、找不到裝置、不安全來源或不支援時，顯示說明並維持示範。暫停或換頁即停止串流。作品不從聲音推斷個性、情緒、健康或身份。

## 效能與替代模式

- devicePixelRatio 上限：桌面 1.75、手機 1.5（著色器作品 1.5）；持續慢於約 25 fps 時自動降低解析度。
- 有界資料：織物 360 列、切口 9 道、化石 420 環 × 48 角位、呼吸 360 截面 × 5 件、回聲每聲 18 道／3 次反射、事件佇列 4000 上限、能量取樣 900 筆。
- `prefers-reduced-motion`：畫面更新降到 15 fps、停止鏡頭漂移與表面顫動，作品核心事件保留。
- 無 WebGL：顯示該作品實際運行擷取的畫面與說明，聲音仍可播放（可用 `?nowebgl=1` 檢驗）。無 Web Audio：以標示的無聲模式依樂譜時間展演。

## 檔案

```
assets/css/sound4.css           展場樣式
assets/js/core/                 audio.js 音訊引擎、shell.js 頁面外殼、three-kit.js、gl.js、mic.js、rng.js
assets/js/models/               各作品的純規則（可在 Node 測試）
assets/js/works/                八件作品的場景與聲音
assets/vendor/three/            three.js r180（MIT，含 LICENSE）
assets/previews/                由實際畫面擷取的目錄預覽
assets/audio/                   不含外部音檔（見其中 README）
tools/                          頁面產生、模型測試、瀏覽器驗收與擷取腳本
_qa/                            驗收結果與截圖
```

## 驗收指令

```sh
node sound4/tools/model-tests.mjs           # Node 18+
# 以下需要本機 Playwright 與 Chromium，並先啟動上方 HTTP 伺服器
PLAYWRIGHT_MODULE=/abs/path/node_modules/playwright node sound4/tools/qa.cjs
PLAYWRIGHT_MODULE=/abs/path/node_modules/playwright node sound4/tools/capture.cjs both
PLAYWRIGHT_MODULE=/abs/path/node_modules/playwright node sound4/tools/longrun.cjs
```

設計決策與合理假設見 [ART_DIRECTION.md](ART_DIRECTION.md)；實際驗證結果見 [QA_REPORT.md](QA_REPORT.md)。
