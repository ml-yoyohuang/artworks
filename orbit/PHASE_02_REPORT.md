# ORBIT Phase 02 — Generative Geometry Atelier

## 交付範圍

Phase 02 在原 `orbit/` 應用內增量擴充。Classic 的幾何、筆跡、渲染、匯出、觸控與全螢幕核心沒有重寫；`main.ts` 只增加模式入口與鍵盤事件隔離。分支為 `feature/phase-02`，`main` 保持 `fd4e85e` 的穩定 Phase 01；本階段沒有合併、推送 main 或更新公開／私人網站。

## 六個實驗室

| 實驗室 | 完成內容 |
| --- | --- |
| Infinite Gear Laboratory | Hypotrochoid、Epitrochoid、Rose、Harmonic、Nested 五類；12 個預設；相位、方向、半徑比例、筆孔、諧波、開放軌跡範圍；Physical / Virtual 提示 |
| Experimental Ink | Archival、Thread、Foil、Luminous、Pigment、Particle 六種可實際套用的筆刷；18 個具不同線寬／材質／色盤的配方；opacity、blend、Seed |
| Living Geometry | Breathe、Drift、Morph、Echo、Bloom 五種模式與 8 個預設；播放、暫停、重啟、速度、循環、進度與 Scrub；確定性時間 |
| Printmaking | Cotton、Washi、Riso、Screen、Emboss；紙色、向量纖維、套版錯位、密度與光向；輸出保留材質或關閉紙背景 |
| Composition | 多物件、移動、比例、旋轉、複製、刪除、層級、鎖定、隱藏、透明度、混色、多選、基本對齊／等距、格線吸附；文字與 6 種真正不同的構圖模板 |
| Discovery | Surprise、三種變異強度、六候選、可重現 Seed、放大預覽、套用、以目前作品繼續變異、回到起始作品；排除退化曲線的基本檢查 |

所有實驗室編輯同一個 Artwork，不會因切換而重建作品。參數與物件操作有 Undo / Redo。手機可選預設、調整所有核心參數、使用保存匯出，且捲動編輯時保留縮小的預覽。

## 18 件作品選集

每件作品都有 statement、geometry、appearance、paper、composition、timeline、Seed，並在 Collection 中生成真正的縮圖，可預覽、編輯和匯出。前 12 件也提供各幾何預設的建議墨水與構圖。

| # | 作品 | 形體與藝術概念 | 墨水／紙張／構圖 |
| --- | --- | --- | --- |
| 01 | Stillwater / 靜水 | 內旋輪線，細密水紋與安靜中心 | Prussian Hairline／Cotton／標本 |
| 02 | Herbarium / 無名植物 | 七瓣玫瑰與相位錯開的內層，呼吸 | Botanical Silk／Washi／雙層植物標本 |
| 03 | Copper Atlas / 銅的地圖 | 外旋輪的連續地形 | Copper Fault／Cotton／非對稱 |
| 04 | Counterpoint / 對位 | 諧波的三個聲部與留白 | Tide & Clay／Cotton／星群 |
| 05 | Satellites / 微小天體 | 三重嵌套軌道，內部相位漂移 | Carbon Etching／Cotton／三個尺度 |
| 06 | Eight Rooms / 八個房間 | 八瓣結構的九格重複與旋轉 | Vermilion Seal／Screen／陣列 |
| 07 | Long Return / 歸途 | 十三公轉後重新閉合 | Champagne Leaf／Cotton／金屬標本 |
| 08 | Unclosed / 未閉合 | 非合理短週期軌跡，保留開放端 | Dusk Weft／Cotton／大字封面 |
| 09 | Paper Tide / 紙潮 | 雙聲部諧波的方向性潮汐 | Indigo Overprint／Riso／非對稱 |
| 10 | Lace Meridian / 緯線 | 不同尺度疊出光學密度 | Forest Plates／Riso／錯位疊層 |
| 11 | Five Suns / 五個太陽 | 五重外旋輪结构，印章般明確 | Vermilion Seal／Screen／單一主體 |
| 12 | Clock Without Hands / 無針鐘 | 四組反向頻率，切出機械韻律 | Silver Meridian／Cotton／封面 |
| 13 | Moonwire / 月光絲 | 深色紙上的細緻軌道與尺度對位 | Moonwire／深色 Cotton／星群 |
| 14 | Pollen Index / 花粉索引 | 沿曲線沉積的微粒 | Pollen Archive／Washi／植物陣列 |
| 15 | Blind Memory / 無墨的記憶 | 以光向與紙面輪廓替代墨色 | Blind Emboss／Cotton／留白標本 |
| 16 | Mineral Weather / 礦物氣候 | 嵌套軌道的顆粒與散逸 | Mineral Veil／Washi／非對稱 |
| 17 | Afterimage / 留光 | 諧波的離散時間殘影 | Violet Afterimage／深色 Cotton／動態疊層 |
| 18 | Carmine Register / 洋紅套版 | 半透明雙色，形成新的交疊邊界 | Carmine Tissue／Riso／編輯封面 |

## 架構、選型與資料

詳細的數學、取樣、Material Interface、輸出策略、v2 schema、Classic migration、安全限制及擴充點，見 [PHASE_02_ARCHITECTURE.md](PHASE_02_ARCHITECTURE.md)。

選擇延續 TypeScript + Vite，以 SVG 場景作為向量與材質共用輸出，再由 Canvas 產生 PNG。Studio 懶載入，不讓 Classic 首次載入承擔整套編輯器。沒有引入框架或 WebGL，也不聲稱提供並未實作的 Shader。

本機收藏支援 Save / Open / Rename / Duplicate / Delete。JSON 支援完整作品與舊 v1 筆跡。驗證先於替換，錯誤不會清掉目前畫面。所有使用者文字在 SVG 中逸出，顏色、字體、數值及資料容量有限制。

## 驗收紀錄

| 檢查 | 最終結果 |
| --- | --- |
| TypeScript | 通過，嚴格模式、無 emit |
| ESLint | 通過，涵蓋 src 與 tests |
| 單元測試 | 23 / 23；其中 10 項為 Phase 01，13 項為幾何、材質、時間、保存、相容性與匯出模型 |
| 瀏覽器測試 | 28 / 28；16 項 Classic 回歸、12 項 Studio，無跳過或重試後通過項目 |
| Production build | 通過，35 個模組；Classic 入口 31.88 kB（gzip 13.07），Studio 延後載入 53.56 kB（gzip 23.22） |
| 正式子路徑 | 以靜態伺服器掛載 `/artworks/orbit/`，Classic / Studio / 字體 / 操作皆通過；無 Vite 轉譯與 SPA fallback 掩蓋路徑錯誤 |
| Export | Classic 3200px PNG、真正 SVG 路徑；Studio PNG 1000×1200 實際下載與位元組尺寸、SVG 內嵌字體與物件變換，Project JSON roundtrip |
| 本機收藏 | Save / reload / open / rename / duplicate / delete / JSON download；損壞與未知版本匯入不覆蓋現有作品 |
| Responsive / input | Classic 六種尺寸與觸控；Studio 360、390、768、1440 寬，手機固定預覽、鍵盤连续調參、模式切換不改動 Classic 歷史 |

完整機器紀錄：[browser-results.json](qa/phase-02/browser-results.json)。初期一次回歸執行遇到 Windows 覆寫舊 PNG 的檔案錯誤；改用獨立 `classic-regression` 目錄後整套 28 項重新執行成功，原 Phase 01 截圖已還原。未將失敗執行描述為成功。

截圖由實際 Chromium 產生，沒有以靜態 mockup 代替功能畫面。

## 效能量測

本機 headless Chromium，桌面 1440×900 / DPR 1、手機尺寸 390×844 / DPR 3；每組記錄 120 個 requestAnimationFrame 間隔。手機為同一台電腦的模擬，不能視為實體手機成績。

| 情境 | rAF 中位數 / P95 | 預覽更新次數 / 約 2 秒 | >33.4ms 間隔 |
| --- | --- | --- | --- |
| Stillwater 呼吸，桌面 | 16.7 / 16.7 ms | 61 | 0 |
| Stillwater 呼吸，高 DPI 手機尺寸 | 16.7 / 16.7 ms | 61 | 0 |
| Afterimage 殘影，桌面 | 16.7 / 16.8 ms | 53 | 0 |
| Afterimage 殘影，高 DPI 手機尺寸 | 16.7 / 16.8 ms | 36 | 0 |

瀏覽器 rAF 約 60Hz，不代表場景每秒重畫 60 次。一般幾何預覽約 30 次／秒；多層殘影的 SVG 重建較昂貴，高 DPI 測試觸發適應性降頻，約 18 次／秒，仍使用確定性時間與較低取樣，停止後回到完整品質。這是已知的重負載限制，不宣稱所有作品均為 60 FPS。

原始數據：[performance.json](qa/phase-02/review/performance.json)。量測期間沒有並行執行其他瀏覽器測試；零 runtime error。後续若要提高複雜殘影的更新率，應優先對該 BrushRenderer 增加 Canvas layer cache／Worker，不必改動資料模型或 Classic。

## 視覺審查與實際修正

沒有用自評 9 分宣稱品質完成。以下是實際截圖中發現並修改的問題：

1. 首轮縮圖的細線与顆粒太淡，辨識性不足：重新調整 Archival／Thread／Particle／Luminous 的線芯、粒徑、透明度；Particle 保留低對比幾何骨架。第二輪縮圖可辨識主體，仍維持克制的紙上線條。
2. 長封面標題接近紙邊：標題字級依長度限制；非對稱構圖的小物件向上移，避免碰到標題。
3. 手機參數區位於紙面下方，操作時看不到結果：預覽縮至視窗高度的 32%，在編輯區捲動時保留。控制區仍可使用原生觸控、鍵盤與可讀標籤。
4. 改動參數會重建 inspector：保留 active field 焦點與已展開 details，讓鍵盤方向鍵連續調參及進階編輯不被打斷。
5. 候選比較需要能延伸探索：加入「以目前作品再變異」，並分開保留初始作品與新的變異來源。
6. 基本排列缺少吸附的視覺線索：Compose 顯示可關閉的 20px 格線；匯出不包含格線與選取框。

每個實驗室保留預設、調整後、作品三類畫面：`qa/phase-02/review/{geometry,ink,motion,print,compose,discover}-{default,adjusted,artwork}.png`。另有 Classic、Studio Home 與 360／390／768／844 寬的響應式截圖。時間模式另以播放／暫停／Scrub 測試驗證；未聲稱交付影片檔。

## 已知限制

- 目前是 Chromium 桌面與手機尺寸／觸控模擬驗收；尚未在實體 iPhone、Android、Safari、Firefox 或螢幕閱讀器完整驗收，也不宣稱 WCAG 認證。
- 光、箔、顏料與壓印均為二維材質近似，不是光譜混色、真實金屬反射或印刷分色打樣。
- 取樣有上限，極端頻率達上限後不保證原先的誤差目標；一般預設仍保留完整參數與週期。複雜多層動畫會降低預覽更新頻率。
- 本機收藏受瀏覽器 quota 限制，沒有自動草稿或雲端帳號；重要作品請另存 JSON。
- SVG 保留可編輯文字與嵌入西文字體，中文需系統字體；不同設計軟體對 blend mode 的支援可能不同。PNG 可固定呈現。沒有 CMYK／ICC、字體轉外框、影片或動畫 SVG 匯出。
- 文字為單行、有限字體與字重；構圖工具是幾何作品編輯器，不是完整排版／影像軟體。

## 啟動與 Git 交付

在 `feature/phase-02`：

```sh
cd orbit
npm ci
npm run dev -- --port 5174
```

開啟 `http://127.0.0.1:5174/`，按右上 **Studio ↗**。Node.js 建議 22.12 以上；本次使用隨環境提供的 Node 24.19。

驗證：`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:browser`（先啟動預覽）、`npm run build`、`npm run test:production`。`ORBIT_QA_DIR` 可指定 Classic 回歸截圖目錄，避免覆寫 Phase 01 參考圖；Studio 視覺與效能檢查使用 `node scripts/review-studio.mjs`。

最終 commit 由交付訊息提供；亦可用 `git log -1 feature/phase-02` 查詢。等待使用者確認前，不合併或推送 `main`，也不改動线上網站。

## Phase 03 建議

先增加 IndexedDB 自動草稿與作品圖鑑，接著提供字體轉外框、背景 Worker 匯出與動畫錄製。若實測出現 SVG 的效能瓶頸，再為相同 BrushRenderer 契約增加 Canvas／WebGL 實作，而不是提前重寫 Classic。
