# SOUND / 3 實際驗收報告

驗收日期：2026-10-10，Asia/Taipei。瀏覽器：Playwright Chromium 151.0.7922.34。HTTP：http://127.0.0.1:8766/sound3/ 。沒有以 file:// 或檔案存在取代運行驗收。

## 九個入口

桌面 1440×900；手機為 **390×844 瀏覽器模擬**，非實機。每頁初始畫面靜止、沒有音訊節點，實際按下開始才播放。桌面逐件以正常速度等待代表時刻；相位潮汐觀察超過 82 秒。手機先實際播放、測試控制，再在暫停後以相同 1/60 固定步長重算代表時刻，擷取構圖；未將手機重算冒稱為完整實時播放。

|頁面|實際驗證的專屬因果／代表事件|桌面 / 手機|音訊與操作|代表截圖|
|---|---|---|---|---|
|00 目錄|八個真實可點擊入口、八張實際作品預覽、無音訊或高成本動畫|通過 / 通過|八連結、資產、文字與無橫向溢出通過|[桌面](_qa/shots/desktop-index.png) / [手機模擬](_qa/shots/mobile-index.png)|
|01 共振建築|8 秒換和弦；固定座標慢慢轉換、長／短音穩定程度不同|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-01-resonant-architecture-representative.png) / [手機模擬](_qa/shots/mobile-01-resonant-architecture-representative.png)|
|02 和弦織機|8 秒樂句回返、16 秒變奏；聲部退出形成疏鬆新行|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-02-chord-loom-representative.png) / [手機模擬](_qa/shots/mobile-02-chord-loom-representative.png)|
|03 休止符|3 秒短裂、11 秒長開口；實際累積前段能量影響深度|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-03-silence-cuts-representative.png) / [手機模擬](_qa/shots/mobile-03-silence-cuts-representative.png)|
|04 聲音化石|32 秒定型、旋轉、換 seed；相同 seed 材料一致|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-04-sound-fossil-representative.png) / [手機模擬](_qa/shots/mobile-04-sound-fossil-representative.png)|
|05 相位潮汐|實際觀看超過 82 秒；速度差控制與相位連續|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-05-phase-tides-representative.png) / [手機模擬](_qa/shots/mobile-05-phase-tides-representative.png)|
|06 呼吸雕塑|14 秒定型，切換示範保留先前標本；三種輪廓不同|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-06-breath-portrait-representative.png) / [手機模擬](_qa/shots/mobile-06-breath-portrait-representative.png)|
|07 回聲迷宮|實際觀看至 29 秒；牆面／起點改變往返時間與路徑|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-07-echo-labyrinth-representative.png) / [手機模擬](_qa/shots/mobile-07-echo-labyrinth-representative.png)|
|08 能量蓄積|約 13.4 秒翻開；歷史能量、流失、臨界與恢復期|通過 / 通過|啟動、訊號、暫停、恢復、靜音、音量、重播、匯出、專屬操作皆通過|[桌面](_qa/shots/desktop-08-stored-energy-representative.png) / [手機模擬](_qa/shots/mobile-08-stored-energy-representative.png)|

16 個裝置／作品組合的最終有效檢查合計 **308 項通過**。完整第二輪結果在 [_qa/results.json](_qa/results.json)；建築與織物的最後回歸覆蓋在 [focused.json](_qa/focused.json)；休止、化石、呼吸與回聲的最後回歸覆蓋在 [final-regression.json](_qa/final-regression.json)。這些記錄按作品／裝置合併後沒有失敗項。最後同步稽核另外修正了織物節點：以真正的打擊事件到達時才留下節點，並以跨循環唯一的行 key 保留歷史；新增 0.2／0.3 秒與跨循環邊界檢查（[瀏覽器證據](_qa/knot-timing.json)），避免提前 250 ms 顯示。

已打開並檢視全部八件桌面與手機代表圖，以及目錄圖。聯絡表：[桌面](_qa/desktop-contact.webp)、[手機模擬](_qa/mobile-contact.webp)。各作品均做過一次材質／構圖修正：建築補切邊反光；織物改成真正逐行保存、保留未織經線；休止增加紙面陰影與實際前段能量記憶；化石加強細層與不規則脊；潮汐加強薄邊與速度差下的連續排程；呼吸平滑頸部、降低不透明度並增加扭轉截面與高光；迷宮加強牆頂反光並使用往返回程距離；懸線改為連到折殼頂點、釋放後平滑恢復。

## 聲音與同步證據

所有頁面 AudioContext 實際啟動、排定音符，分析器測得非零訊號；初始 1.8 秒內抽樣峰值約 0.027–0.052（浮點全幅為 1）。靜音後增益降至近零，但時間繼續；暫停後時間及畫面雜湊不變；恢復不中斷既有相位；重播從新時間原點開始。排程以 AudioContext 時間指定，記錄中最大晚排時間 **0.0 ms**。固定步長模型落後音訊時鐘最多 **16.0 ms**；畫面顯示另受 rAF 更新頻率影響，這不是喇叭／螢幕端到端延遲測量。

方向鍵與拖曳旋轉另以 [smoke.json](_qa/smoke.json) 逐件實際驗證。目錄縮圖明確等待圖片 decode，以檢查延遲載入的資產。

聲部關閉的額外因果驗證與外部檔案／麥克風不可用驗證見 [causal.json](_qa/causal.json)。聲部恢復測試曾因單次抽樣落在音符尾端而誤判；改為觀察一個完整音符時間窗的峰值，沒有以降低標準掩蓋錯誤。

**未完成主觀聆聽。** 此環境使用 headless 音訊訊號檢查，沒有把分析器數值當成聽過作品。也未測量硬體喇叭、耳機或手機輸出延遲。

## 邏輯、效能與錯誤處理

- [model-results.json](_qa/model-results.json)：53 次原生 assert 通過。相同 seed 化石、不同 seed 差異、1/30 與 1/60 材料一致；樂句重複與變奏、聲部退出、短／長休止及強弱記憶、三種呼吸、回聲距離與衰減、能量臨界與恢復、600 秒固定步長有界狀態。
- [static-results.json](_qa/static-results.json)：九個 HTML、95 個本地連結與所有 JS/MJS/CJS 語法通過。專案為純靜態，沒有適用的 build／lint pipeline，不將其寫成已執行的 npm build。
- [extended.json](_qa/extended.json)：織物、回聲、蓄能 **實際運行約 121 秒**，不是快轉。織物最多 96 行、回聲最多 24 路徑、能量保持 0–1.8；每件觀察到最高 4 個存活聲部，測試後節點清理通過。另有 600 秒純模型檢查。Chromium heap 數值為粗粒度估計，不據此宣稱完成長期記憶體分析。
- 合成麥克風持續 220 Hz 與 180 ms 短停頓：兩者皆在約 14 秒定型，最多 139 筆輪廓，回到示範並關閉串流。這是 MediaStream 合成測試，**不是人體發聲或硬體麥克風實測**。
- 麥克風拒絕／不可用回到示範；AudioContext 缺失回到有明確提示的無聲展演；沒有外部歌曲時仍正常發聲。外部檔案模式未提供，不宣稱通過不存在的上傳／解碼功能。
- 頁面隱藏自動暫停、重載不播放、1440→390 縮放無溢出、減少動態偏好（另見 [reduced.json](_qa/reduced.json)；慢潮汐與靜態釋放構圖已開圖檢視）、空白鍵、方向鍵旋轉、PNG 下載與導覽通過。退出頁面停止排程、斷開／停止節點；麥克風於定型與暫停停止。
- 最後回歸的 console / pageerror / HTTP 資產錯誤均為零。原先 sound/REPORT.md 未提交修改保留且不納入提交。

## 發布紀錄

沿用 GitHub Pages legacy 部署；已確認來源為 main 根目錄。Git 提交、推送、Pages 建置 SHA 與正式網址檢查將在完成後記錄於 [_qa/deployment.json](_qa/deployment.json)。此份驗收不以成功推送推論部署成功。

## 環境限制與已知問題

- 未主觀聆聽、未使用真實麥克風、未做手機實機或 Safari／Firefox 驗證。
- 2.5D 材料、建築與回聲均為創作性模型；不是物理聲場求解、真實房間量測或個人特質識別。
- 原創音源為所有預設；無外部音樂授權／下載依賴。功能與目前驗收範圍沒有未修復的已知失敗；以上未做項目保留為明確限制。
