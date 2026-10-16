# Phase 02 — 增量架構與資料契約

## Repository audit

基底為 `fd4e85e`（GitHub Pages 修復完成的 Phase 01）。開始前 `main...origin/main` 同步，工作目錄與暫存區皆無未提交變更。新增 `feature/phase-02`；不建立第二份應用、不搬移 Classic 原始碼、不修改 Pages 工作流程或線上發布來源。

## 保留與擴充

Classic 的 `geometry.ts / state.ts / renderer.ts / export.ts / interaction.ts / view.ts` 保持原行為。`main.ts` 只增加模式掛載與鍵盤事件的模式隔離。新增 `modes.ts` 懶載入 Studio，Classic DOM、模型與部分筆跡保留在記憶體，切回後可繼續繪製。

`src/studio/` 是同一個應用的功能模組，不是另一份專案。沿用 Vite、TypeScript、Playwright、字體、下載服務及 Phase 01 的幾何常數、點位型別、舊筆跡取樣器；沒有新增執行時框架。

| 模組 | 單一責任 |
| --- | --- |
| `types.ts` | Geometry、Appearance、Motion、Transform、Paper、Artwork 契約 |
| `geometry.ts` | 五類曲線、範圍驗證、有理數判斷、週期、誤差估計、取樣與有限快取 |
| `temporal.ts` | 純時間函式、幾何參數動畫、對應點 Morph、逐層展開 |
| `render.ts` | 六種 BrushRenderer、材質、程序化紙纖維、物件變換、圖層與 SVG 場景 |
| `data.ts` | 資料驗證、v1 migration、歷史快照、本機收藏、基本排列 |
| `discovery.ts / random.ts` | 有種子的亂數、受限變異、六候選、退化排除 |
| `presets.ts` | 12 幾何、18 墨水、8 動態、6 構圖模板、18 正式作品 |
| `export.ts` | 嵌入授權西文字體的 SVG，以及由相同 SVG 產生 PNG |
| `app.ts / ui.ts / studio.css` | 操作、模式內生命週期、編輯式介面與響應式樣式 |

## 數學與精度

- Hypotrochoid 沿用 Classic 的螢幕座標與反向自轉約定，Studio 將理論最大半徑正規化為 290 設計單位，再由 Composition 決定實際尺寸。Classic 匯入不經正規化。
- Epitrochoid 使用 `(R+r)cos(t)-d cos((R+r)t/r+phase)` 與相應正弦式。
- Rose 使用 `290 cos(k t+phase)(cos t,sin t)`。`k=p/q` 最簡分數時，p、q 同為奇數的週期為 πq，其餘為 2πq；整數奇數 k 有 k 瓣，偶數 k 有 2k 瓣。
- Harmonic 是最多四個受限振盪器的 x/y 諧波和；Nested 是最多四個圓周向量的端點和。兩者共用有限項表示法，Harmonic 使用可相異的 x/y 相位關係。
- 數值在分母 64 以內、誤差 1e-9 以內視為有理頻率。只自動完成不超過 32 圈的週期；近似無理數或更長週期依使用者指定的 0.25–32 圈取樣。不是宣稱浮點數能判定數學上的無理性。
- 取樣參考二階導數上界，正式品質誤差目標為 0.06 設計單位，互動為 0.3；分別最多 18,001 / 3,601 點。達到點數上限時是明確的品質降級，不能再保證原誤差目標。匯出與預覽使用相同參數域，沒有為了閉合而硬接尾端。
- 真實齒輪比例需整數半徑比例、合法內滾半徑與筆孔位於滾動圓內；其餘標示 Virtual Geometry。Studio 的曲線不偽裝成可製造的齒形 CAD。

參考：[MathWorld Hypotrochoid](https://mathworld.wolfram.com/Hypotrochoid.html)、[Epitrochoid](https://mathworld.wolfram.com/Epitrochoid.html)、[Rose Curve](https://mathworld.wolfram.com/RoseCurve.html)。

## 材質與輸出

六種筆刷共用 `BrushRenderer.draw(points, appearance, id, quick)`。幾何層完全不感知材質。

- Archival：清楚線芯與低透明度、較寬的吸墨近似。
- Thread：沿累積弧長分配色彩；線性光 RGB 與餘弦緩動插值，循環取有限色盤。
- Foil：依線段切線與固定光照方向計算窄高光，再疊細線芯；是二維方向性反射近似，不是環境貼圖或物理 PBR。
- Luminous：三個受控寬度的低透明度線層與清楚核心，不使用大面積模糊。
- Pigment：半透明雙色與 multiply 套印，是 alpha 合成近似，沒有光譜／Kubelka–Munk 混色宣稱。
- Particle：按弧長放置、固定 Seed 的微粒與低對比路徑骨架；互動最多 650、正式 1,800 顆／物件。
- Cotton / Washi：同 Seed 產生不同長度、分布與透明度的向量纖維。Riso 以有限雙色、可控錯位、密度與顆粒呈現。Screen 加厚可辨識的墨線。Emboss 依光向生成細緻的成對明暗輪廓，是紙面高度的二維近似。

所有效果以 SVG 向量 primitive 完成，不依賴 WebGL，也沒有假裝實作 WebGL Context Lost 或 Shader fallback。SVG 是此階段的跨平台路徑。PNG 用 Canvas 2D 將相同完整 SVG 轉成點陣，匯出時保留目前 timeline time、圖層順序、變換、opacity、blend 與文字。

SVG 內嵌隨附的 SIL OFL 西文字體；中文使用裝置字體、未轉外框。SVG 編輯軟體的 CSS blend mode 支援可能不同。PNG 是固定外觀的交付選項。紙張關閉時移除底色與纖維，保留墨水與壓印線條。沒有 CMYK、ICC 或實體 DPI 換算；尺寸明確標示像素。

## 時間、歷史與保存

Schema version **2**：作品 ID、title、statement、seed；artboard；paper；timeline（time / duration / speed / loop）；objects。每個物件分開保存 geometry、appearance、motion、transform、visibility、lock、text；Classic 物件另外保留未修改的 v1 Stroke。

`parseProject` 接受 v2、`{schemaVersion:1,strokes:[...]}` 或 v1 Stroke 陣列。Migration 不依賴目前畫面與時間；保留正反轉 stops、色彩與線寬。未知 schema、損壞 JSON、NaN／Infinity、極端數值和結構皆拒絕，在驗證成功前不替換現有作品。

時間以起始時刻與經過秒數推導，與實際 FPS 無關；速度改變先暫停。所有動畫預設靜止，尊重減少動態，使用者明確播放才運轉。切模式、失焦、背景分頁會暫停。Morph 在相同參數域與方向的對應點插值連續參數，不內插離散瓣數／齒數。Echo 是明確時間差取樣，不是影像殘留；Bloom 為每層相位錯開的重複展開。

歷史保存最多 40 個完整參數快照；單次拖曳／範圍調整合併成一次提交。保存採 `localStorage`，因為模型只保存小量參數而不保存像素。最多 20 件、合計 8 MB（實際瀏覽器 quota 可能更低）；超額或 storage 不可用時回報錯誤，仍可匯出 JSON。不存在帳號或雲端同步。

## 成本與已知邊界

- 每件 24 個物件、4 個諧波／軌道層、6 個 echo。JSON 檔案上限 2 MB。
- 畫布每邊 300–2400 單位；PNG 上限長邊 4800px、2000 萬像素。
- 幾何快取 40 項、物件 SVG 快取 80 項。靜態物件不因 timeline 改變重新產生幾何。
- 互動與動畫使用較低取樣品質，停下後重畫正式品質；預覽目標 30 次／秒，單次 render 超過 26ms 後降為 15 次／秒。時間仍連續，不因降頻而變慢。
- 對齊以曲線的標準外框和物件錨點為準；文字不是完整排版引擎。沒有多選框、自由路徑節點、文字換行排版或影片匯出。
- 作品與 Classic 的未保存工作紙存在分頁記憶體。重新整理會載入 Studio 預設作品；使用者可從「我的收藏」開啟已明確保存的作品。

Phase 03 可沿用 schema 加入 IndexedDB 自動草稿、作品圖鑑、字體轉外框、Worker 匯出與動畫錄製；不需重寫 Classic。
