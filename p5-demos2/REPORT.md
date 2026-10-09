# 規則之後 — p5.js 生成作品集（第二輯）交付報告

完成日期：2026-10-09（Asia/Taipei）。從 [`p5-demo-list.html`](p5-demo-list.html) 進入；直接雙擊檔案（file://）即可觀看，不需要伺服器或網路。

## 作品、規則自述與推薦種子

目錄頁的連結直接帶入推薦種子，縮圖也取自同一個種子的實測截圖。

| # | 頁面 | 規則自述 | 推薦種子 |
| --- | --- | --- | --- |
| 01 | [順風千行](flow-field.html?seed=2024) `flow-field.html` | 一千條線從左側出發，順著看不見的風前進，一碰到彼此，就安靜地停下。 | 2024 |
| 02 | [靜默測繪](contour-topography.html?seed=4096) `contour-topography.html` | 一座不存在的山被切成等距的薄片，每一片的邊緣，化成一條永不交錯的線。 | 4096 |
| 03 | [切分的秩序](recursive-subdivision.html?seed=27182) `recursive-subdivision.html` | 一個矩形被切成兩半，每一半再決定要不要繼續切，直到每個房間都剛好夠住。 | 27182 |
| 04 | [細胞的禮貌](circle-packing.html?seed=314) `circle-packing.html` | 每個圓從一點開始長大，碰到鄰居就停下，於是擁擠也有了禮貌。 | 314 |
| 05 | [漆金結](truchet-tiles.html?seed=2024) `truchet-tiles.html` | 每塊磚只能選擇轉或不轉，金線卻因此再也找不到起點與終點。 | 2024 |
| 06 | [夜珊瑚](differential-growth.html?seed=99991) `differential-growth.html` | 一條閉合的線，相鄰的點牽著手，稍遠的點互相推開；線無處可去，只好向外起皺。 | 99991 |
| 07 | [藍曬葉脈](space-colonization.html?seed=2024) `space-colonization.html` | 看不見的養分散在葉形之中，枝條朝最近的那些生長，抵達之處，便把它們收下。 | 2024 |
| 08 | [銅版星圖](voronoi-stippling.html?seed=123457) `voronoi-stippling.html` | 幾千枚墨點一次次移向自己領地中最暗的重心，直到明暗只剩疏密在說話。 | 123457 |
| 09 | [黃昏群舞](boids-flocking.html?seed=8128) `boids-flocking.html` | 每隻鳥只看身旁幾隻鄰居：靠近、對齊、別相撞。沒有領袖，形狀卻自己浮現。 | 8128 |
| 10 | [字散](generative-typography.html?seed=42) `generative-typography.html` | 一個字被拆成上千枚細筆，左邊還記得自己的形狀，右邊已隨風離開。 | 42 |

十頁的色帶與氣質：石墨與普魯士藍的繪圖機筆跡、墨綠底琥珀色的測繪螢幕、混凝土灰配鈷藍的構成、蘇木精紫與伊紅粉的染色切片、漆黑朱砂與金、夜色中的骨白珊瑚、奶油紙上的藍曬、棕褐銅版、黃昏天空的鳥群、黑底骨白與朱紅的字。筆式繪圖機版畫氣質：01、03、08（另外 02 的測繪線也採用同樣的語彙）。

## p5.js

- 版本：**p5.js 1.11.13**（npm `p5@1.11.13`，2026-04-08 發布），放在 `lib/p5.min.js`，授權全文在 `lib/LICENSE.txt`（LGPL 2.1），來源與 SHA-256 記錄在 `lib/README.md`。
- 所有頁面都以相對路徑 `lib/p5.min.js` 載入，不使用 CDN、外部字型或外部圖片。

## 驗證結果

**全部 11 個頁面都經過瀏覽器實測**，沒有只做靜態檢查的頁面。環境：Playwright 1.56.1、Chromium（headless）、macOS，以 `file://` 開啟。

| 頁面 | 結果 | 生長完成時間（桌機） | 備註 |
| --- | --- | --- | --- |
| flow-field | 通過 | 約 18 秒 | |
| contour-topography | 通過 | 約 15 秒 | |
| recursive-subdivision | 通過 | 約 20 秒 | |
| circle-packing | 通過 | 約 18 秒 | |
| truchet-tiles | 通過 | 約 13 秒 | |
| differential-growth | 通過 | 約 24 秒 | |
| space-colonization | 通過 | 約 19 秒 | |
| voronoi-stippling | 通過 | 約 19 秒 | |
| boids-flocking | 通過 | 持續動畫 | 實測 **60.1–60.3 fps**（1440×900 與 390×844，各 3 個種子） |
| generative-typography | 通過 | 約 21 秒 | |
| p5-demo-list | 通過 | — | 11 個連結全部指向存在的檔案；10 張縮圖正常載入 |

測試內容：

1. **正式矩陣**：每頁 × 種子 7、2024、58133 × 1440×900 與 390×844（手機模擬含觸控與 DPR 2），共 60 次。全數完成生長（最多 25 秒，低於 35 秒上限）、沒有 console error 或 pageerror。畫布取樣 529 點後都有 6 組以上的量化色彩，亮度範圍大於 30。
2. **減少動態（prefers-reduced-motion）**：每頁在 390×844 另測一次，全部直接顯示完成後的靜態畫面。
3. **策展檢查**：每頁以 10 個種子（11、42、314、2024、4096、8128、27182、58133、99991、123457）在 1440×900 產生完成圖，排成總表逐張檢視後調參，直到沒有難看的結果。過程中修正的問題包括：紙張雲紋出現圓斑、大房間被排線塞滿、細胞團塊被版心切平、差異生長在手機上太小、點描暗部不夠沉、葉脈缺少主脈、鳥的造型太粗。
4. **其他**：p5 載入失敗時會顯示說明文字（移除 lib 後實測）；全域命名空間除了 p5 函式庫本身的 `p5`，以及打包內附的 `regeneratorRuntime`，沒有新增任何變數。
5. 完整尺寸截圖、總表與測試腳本都放在 repo 外的暫存目錄，沒有提交。只有 `thumbs/*.jpg`（720×450，24–121 KB）進入 repo。

## 重要決定與理由

- **p5 用 1.11.13 而不是 2.x**：1.x 是持續維護的穩定線，instance mode、`createGraphics`、`saveCanvas` 等 API 在既有範例與文件中最成熟。2.x 有 API 變動，風險較高。
- **建立新的資料夾，不沿用 `p5-demos/`**：repo 裡已有第一輯 `p5-demos/`。第二輯完全重寫，標題、色帶、構圖都刻意與第一輯不同，也沒有改動第一輯。
- **時間決定進度，種子決定結果**：生長節奏以經過的時間計算，但構圖只取決於種子：幾何先依序算好，或用固定步數模擬，細節使用以種子衍生的獨立亂數序列。因此不論影格率高低，同一個種子都畫出同一張圖（boids 與指標互動除外）。
- **減少動態的做法**：計算仍分批在多個影格完成以免卡住主執行緒，但過程不顯示，只顯示一行「正在安靜地完成畫面」，完成後一次呈現靜態結果。
- **每頁共用骨架**：頁面以共用樣板產生，但產出的每個 HTML 都是自足的單一檔案（CSS 與 JS 內嵌）。控制項只有「重新生成」與「下載 PNG」兩個，外觀依每頁氣質調整。
- **縮圖格式**：環境沒有 WebP 編碼工具，改用 macOS `sips` 輸出 JPEG（品質 72）。
- **參照**：只列出確定的文獻（Truchet 1704 / Smith 1987、Reynolds 1987、Secord 2002、Runions 等 2005、Anna Atkins 1843、Tyler Hobbs〈Flow Fields〉、Anders Hoff〈Differential Line〉、Mondrian）。等高線、圓形填充與字體頁沒有確定的參照，所以不寫。

## 已知限制

- 實測只用 Chromium，沒有在 Safari / Firefox 或實體手機上測試；手機效能是以 390×844 模擬與降低後的元素數量推估。
- `history.replaceState` 在部分瀏覽器的 file:// 下可能被拒絕（已捕捉例外）。此時網址不會更新種子，但畫面角落仍會顯示種子。
- 生成式字體使用系統字體（宋體／明體優先）。不同作業系統的字形不同；沒有中文字型的環境會顯示替代字形。
- 視窗大小改變時，靜態作品會以同一個種子從頭重新生長；手機網址列伸縮（高度變化小於 120px）不會觸發重排。
- 減少動態模式下，鳥群只顯示模擬數百步後的一格靜態畫面，指標互動停用。
- 目錄頁縮圖使用 `loading="lazy"`。

## 推送

- 分支：`main`（`git push origin main`）
- 主要 commit：見下方（由後續的 docs commit 記錄）

## CLAUDE.md

repo 根目錄不存在 CLAUDE.md，也不存在 CONTRIBUTING.md，因此沒有額外規範需要遵守；本任務的 git 規則（只加入 `p5-demos2/`、不 force push）已遵守。
