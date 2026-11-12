# STAGE 3 實驗設計

## 先定義規則（接手後、修改核心前）

模型 2 的 A、B 使用相同能量單位，獨立網格儲存與 logistic regrowth。感測器維持原本八個輸入，食物訊號為 affinity 歸一後加權的 A/capA 與 B/capB；無法分辨同總訊號的不同資源組合。容量為零的池貢獻零。

對每個體，sA=affA·RA、sB=affB·RB；qk=intakeMax·sk/(sA+sB+halfSaturation)/(1+(speed/feedSpeed)²)。總請求再受儲能空間／assimilation 限制。每格各池按 total demand 比例分配；未用到另一池的餘額不在同 tick 重分配。共享 intake 上限，沒有一般型雙份免費食量。

type 固定遺傳。forager affinity=[1,.15]；grazer=[.15,1]，intake=.75、basal=.6、vmax=.5 倍；generalist=[.6,.6]、intake=.55、vmax=.85 倍。一般型即使 6 瓣 intake=.715，仍低於專門型最低 intake=.75，避免高濃度時 affinity 飽和讓一般型取得免費單資源優勢。比較須控制基因、速度與 count。其餘參數見完整 manifest，不宣稱這些預設必然平衡。

角數 3–8、瓣數 3–6，為實作選擇而非使用者指定。各自每次繁殖以 .02 機率 ±1，等機率，越界則留原值。continuous mutation 與兩項 count mutation 各自可停用。d=count-min；corners 的 intake/basal/build 倍率為 1+.06d / 1+.07d / 1+.04d；lobes 為 1+.1d / 1+.08d / 1+.06d，vmax 為 max(.05,1-.06d)。mass=size²、capacity 不隨 count 改變。只在子代出生時計算變化，不隨年齡解鎖。這些係數皆為待檢驗假設。

總能量=A+B+reserves=外部注入+regrowthA+regrowthB−metabolism−assimilationLoss−birthCost−corpseDissipation。繁殖先從親代扣 transfer，再支付子代 build，超出子代容量的部分退回親代；若不足以建造則耗散 transfer。模型 1 保留原本屍體回收與數值更新順序。

## 比較設計

使用固定 manifest、模型版本、seed、起始族群／基因、介入 tick、終止 tick、採樣間隔。對照同 seed、固定總 founder 數與初始能量預算（同基因／size；type/morph 不更改 capacity），不把環境總容量翻倍當作單一 affinity 效果。

Manifest 的介入可以是 `{tick, resource: 'A'|'B', patch}`，或 `{tick, introduction: {genome, x, y, energyFrac, type, corners, lobes}}`。同 tick 介入維持設定順序；釋放必須提供真正基因與離散性狀，不能只記一個隨機種子或事後個體 ID。主介面的新釋放事件也保留這些已觀測資料；較舊事件沒有的欄位不倒填。

Experiment G：A-rich、B-rich、mixed，每個環境跑 3 個單類、3 組配對、1 組三類，至少三個種子。A/B 總 capacity 保持相同，比例 16/4、4/16、10/10。初始全部類別至少一個體。有限期 persistence 定義：最後 20% 所有採樣中，所有投入的類別都至少 1 個體。任何一類到零表示該類滅絕，不補生。報告通過比例，不能稱為無限期穩定共存。

另對角數與瓣數分別固定其他基因、相同單類、相同儲能／密度，對照低／高 count，停用所有突變；再比較可突變與不可突變的角／瓣頻率。此 assay 評估指定背景的相對表現，不據此宣稱普遍最佳值。

補充模型 2 A–F：資源總量、均勻／斑塊、指定 tick 環境改變、中性 marker paired control、突變率敏感性及同 seed 控制。CLI 的均勻組按同 seed 斑塊場的平均 fertility 調整各池 capacity，以匹配各池初始總 stock／總 carrying capacity；不能把均勻地圖免費增加的食物解釋成空間策略優勢。瀏覽器的簡易 uniform/patchy 比較不做此校正，介面須提醒豐度也會變動。A-rich/B-rich 固定名目 A+B cellCapacity，但互補 fertility 的有限地圖可能讓實際總 stock 不完全相等，須由 manifest 重建並揭露此限制。長期組至少三個 seed，記錄族群、cap hits、lineage/history 大小、finite 與 ledger error。實際期間與樣本數寫入結果；快速 smoke 不能冒充長期研究。

## 效能與取消

頭端實驗分段執行、讓出事件迴圈，支援進度、AbortSignal/SIGINT 與部分結果。每次執行使用相同 tick 規則，wall time 與模擬 tick 分開。性能輸出 tick/s、organism updates/s、heap 與 lineage/history；heap 是量測點值，不是保證峰值。不同初始人口需記錄量測期間實際人口變動。
