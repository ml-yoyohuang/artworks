# STAGE 3 接手完成報告（2026-11-12）

後續使用者外觀／運動／播報需求已更新於 `EXPERIENCE_UPDATE.md`：新建世界預設 model 3，本文長期與 G 結果仍為模型 2，不自動套用到新運動規則；原生 confirm 已換成頁內元件，節能型／多瓣型改用內部構造。

## 完成範圍

保留前一位代理已寫的模型架構，完成與修正科學核心、驗證、三類外觀及研究工作流，沒有進入 Stage 4。

- 模型 2：A/B 兩資源與共享 intake 上限，三個穩定遺傳生態類別；取食、感測、代謝、移動、繁殖與形態成本由真實引擎運算。
- 節能型角數 3–8、多瓣型瓣數 3–6，各自可遺傳／±1 突變，類別不隨突變隨機跳換。range 是可設定的實作預設。更多角／瓣同時有利益與代價，不安排單向升級。
- 橘藍豆形、藍綠圓角多邊形、粉橘連通多瓣形；肖像與實際個體使用相同 genotype→geometry。角／瓣對應資料，不以顏色推測物種。
- 雙資源背景、分別調整 A/B、各類新人釋放與完整 clone（包含離散性狀）、每類人口／能量／取食／代謝、形態頻率及平均歷史。
- 可取消 headless runner，固定 tick 介入（環境及帶完整基因／離散性狀的釋放）、進度、完整 manifest、結果 JSON、界定規則與證據的 discovery log。手動釋放事件現在保留基因／座標／儲能，舊事件不倒填。
- 瀏覽器比較 A-rich/B-rich/mixed、mutation/control、uniform/patchy；多 seed、獨立世界、不變更目前實驗狀態，執行時觀察箱暫停。
- 譜系鏈與在世子代探索、原始基因、遺失／剪枝說明、已記錄祖先的造形比較（預覽能量為明示的 50% 佔位，不捏造歷史生理狀態）。
- 版本 2 快照、v1 legacy 語意遷移、錯誤格式拒絕；最多三個手動完整 checkpoint，runner 可選定期 checkpoint，能精確恢復捕捉的世界。
- legacyConfig 與舊實驗入口保留單資源模型 1，原 golden hashes 通過，不拿新模型結果取代舊實驗。

## 研究結果

全量執行而非 quick：G 與形態 **87 組 × 6000 ticks**；A–F 對照 **39 組 × 6000 ticks**；長期 **3 組 × 100000 ticks**。原始可重現設定與結果在 `experiments/results/stage3/{g,controls,long}.json`。

三類同時投入的 G 組，tick 6000 人口依序為 forager / grazer / generalist：

| 環境 | seed 1 | seed 2 | seed 3 | 三類有限期 persistence |
|---|---|---|---|---|
| A-rich | 75 / 10 / 0 | 29 / 0 / 0 | 14 / 0 / 0 | 0 / 3 |
| B-rich | 0 / 60 / 0 | 0 / 30 / 0 | 9 / 49 / 0 | 0 / 3 |
| mixed | 37 / 53 / 0 | 1 / 3 / 0 | 23 / 24 / 0 | 0 / 3 |

這些條件沒有支持三類長期共存；一般型在這 9 組三類競爭中都被淘汰。低代謝 grazer 常占優勢，但 A-rich 的部分種子只剩 forager。沒有添加補食、復活或人口配額。

形態 matched assays（同背景、單類、停用所有突變）的最終人口：

| 比較 | seed 1 / 2 / 3 |
|---|---|
| grazer 3 角 | 112 / 17 / 37 |
| grazer 8 角 | 83 / 0 / 27 |
| generalist 3 瓣 | 0 / 2 / 6 |
| generalist 6 瓣 | 12 / 0 / 0 |

沒有「角／瓣越多一定越強」的結果，也不據三個種子宣稱普遍最佳值。開啟 count mutation 的單類實驗可觀察角／瓣分布改變；這是已實作遺傳與變異的證據，變化是否為適應仍需更強的競爭／fitness assay。

A–F 包含資源量、容量匹配的均勻／斑塊對照、半程減少再生、marker paired control、突變敏感性與 identical repeat。F 的三組同 seed 重跑 hash 全相同。中性 marker 配對維持相同的生態人口／資源／形態軌跡，基因本身與含基因 hash 會不同，不能要求它們相等。一般型 intake 調為 .55，避免資源飽和時只靠 affinity 不足以保證專門型攝取優勢的模型漏洞；這不是從某次有利畫面反推平衡。

長期末端人口分別為 **66/51/0、0/132/0、0/160/0**。最大人口 156–165；最大 retained lineage nodes 485–543，末端歷史 251 samples（上限 256，持續壓縮）。全結果最大末端相對能量帳誤差 **7.60e-11**，小於執行中檢查門檻 1e-8。未發現數值爆炸；也沒有證明自然物種形成、永久共存或無限開放演化。

## 效能

Windows / Node v16.14.2，seed 123，模型 2 標準 960×640，100 warmup ticks、1000 measured ticks，單次觀察值，非跨機器保證：

| 初始 founder 數 | 量測起點 → 終點人口 | 1000 ticks 毫秒 | 約 ticks/s |
|---:|---:|---:|---:|
| 60 | 91 → 342 | 331.7 | 3014 |
| 240 | 361 → 524 | 387.3 | 2582 |
| 700 | 1058 → 1399 | 1073.7 | 931 |
| 1500 | 2201 → 1630 | 1485.5 | 673 |

原始 `benchmark.json` 另含 organism updates/s、heap 觀察與歷史／譜系大小。族群會自然變化，因此不是固定人口基準。小 arena 的長期組觀察約 11165–15400 ticks/s，不能與全尺寸 arena 混為一談。瀏覽器筆記顯示實際 tick rate 與 smoothed frame callback work；不把它當 GPU 完成時間或 FPS。

## 驗證與使用

自動檢查涵蓋 legacy golden、雙資源能量帳、公平分配、零容量、角／瓣真實出生遺傳與突變、快照延續、headless chunk 等價、精確 checkpoint 與取消。最新通過數量見 `STAGE3_VALIDATION.md`。

實際 Chromium 操作：三類畫布／角瓣 QA 世界、各類統計、3 組 100-tick browser batch 完成、100000-tick batch 取消並保留 partial、Save→Open v2 重新載入、完整 checkpoint 從 tick 1163 回到 tick 910，維持捕捉時 687 個體。祖先預覽與 390×844 研究表單檢查皆已完成，詳見 validation；當前頁面未記錄應用程式 console error。

交接截圖 `stage3-preview.jpg` 是標準 960×640 世界、seed 1、tick 4341 的真實狀態：三類人口 **147 / 834 / 473**，沒有為截圖額外釋放或補生。它與上述小 arena、固定十組背景重複的 headless G 實驗在尺寸、初始人口與基因組成不同，不能混為同一研究條件。它顯示三類在這個時點仍存活，仍非長期穩定共存證明。

`npm run dev` 後開啟 `http://localhost:5183/?seed=1`。開啟 Field notes；**Evolution laboratory** 執行／取消比較與匯出，**Morphology distributions** 讀角／瓣頻率，**Exact state checkpoints** 捕捉／回復。選個體後展開 **Lineage & genome**。Clone 保留 type/count，Release 可選類型；新 world 從模型 2 開始。`npm run exp` 與 `/diagnostic.html` 維持 legacy。

## 限制與 Stage 4 交接

- 三類為設計的生態型，沒有自然物種形成或生殖隔離。所測小 arena 競爭條件下一般型偏弱，不能直接外推所有世界；後續應以預先定義的新環境／tradeoff 實驗研究，不隱藏干預。
- 三個種子是小型研究樣本，G 6000 ticks 的 persistence 不是無限期共存證明；長期組也只涵蓋三個種子。
- 譜系採軟預算、剪枝與 thinning，無法完整回顧所有已滅絕分支；沒有無限歷史或兩 checkpoint 間的連續時間旅行。checkpoint 僅存記憶體，要持久保存需下載快照。
- 瀏覽器研究尚無 Worker，會與繪圖競爭；CLI throughput 與 browser FPS 分開解讀。
- 感測器是 affinity-weighted 合併訊號，無法獨立辨識同總訊號的 A/B 配比；不是新增智慧或規劃能力。
- A/B 名目 cellCapacity 相加固定不代表有限 fertility 地圖的初始總 stock 完全相同。CLI spatial assay 已配對初始總 stock；UI 簡易 uniform/patchy 明示亦改變豐度。
- 快照已有核心格式／數值／基因與 cycle 驗證，不宣稱是所有任意惡意 JSON 的完整 schema 認證。跨瀏覽器、真實觸控、完整讀屏驗收與長時間觀看品質留待 Stage 4，沒有新增 sound、捕食或任意 body-plan 引擎。

Stage 4 先延續已實作的 type/count 契約、提升細節與控制可讀性，保留全部科學測試及研究 manifest。任何新係數或資源規則應當作新的科學比較記錄，不能只為視覺熱鬧改變出生／死亡結果。
