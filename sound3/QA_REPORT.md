# SOUND / 3 實際驗收報告

本文件保留先前驗收紀錄；目前八件互動改造的結果見末節「八件互動改造最終驗收」與 [_qa/interactive-acceptance.json](_qa/interactive-acceptance.json)。

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

沿用 GitHub Pages legacy 部署；已確認來源為 main 根目錄。最終內容 commit `5d921316be114a59e0559bc1b417d40f4846933e` 已正常推送 main；[Pages CI](https://github.com/ml-yoyohuang/artworks/actions/runs/38052411791) completed / success，Pages builds API 同一 SHA 為 built。正式目錄：https://ml-yoyohuang.github.io/artworks/sound3/ 。九個 HTML 與全部 25 個入口／素材逐一下載至記憶體比對，皆與該 commit 的本機位元內容一致；三份 Markdown 文件 HTTP 200。正式站八頁另以瀏覽器逐一啟動音訊、取得非零訊號並操作旋轉，全部通過。見 [部署紀錄](_qa/deployment.json)、[位元比對](_qa/production-assets.json)、[正式站瀏覽器](_qa/production-smoke.json)。隨後的驗收紀錄提交僅補入這些證據，不變更已驗證的展演程式或預覽圖。

## 環境限制與已知問題

- 未主觀聆聽、未使用真實麥克風、未做手機實機或 Safari／Firefox 驗證。
- 2.5D 材料、建築與回聲均為創作性模型；不是物理聲場求解、真實房間量測或個人特質識別。
- 原創音源為所有預設；無外部音樂授權／下載依賴。功能與目前驗收範圍沒有未修復的已知失敗；以上未做項目保留為明確限制。

## 2026-10-10 玩法說明與互動檢查更新

八件作品新增原生 details／summary 的「How to play 玩法說明」，預設收合；每件列出實際操作、觀察時刻與機制限制。目錄 footer 移除「展覽說明」連結，保留音源授權與其他展區導覽。修正說明聚焦時空白鍵被播放快捷鍵攔截的問題。

本次 [收合操作結果](_qa/disclosure.json) 檢查八件 × 桌面 1440×900／手機模擬 390×844，16 組全部通過：滑鼠點擊、Enter／空白鍵展開收合、不誤啟 AudioContext、播放中不重置或暫停、暫停中不改時間、畫布聚焦時原空白鍵播放仍有效、無水平溢出、作品導覽保留；目錄移除指定連結且保留授權連結。console／pageerror 無錯誤。已實際開圖檢視 [桌面](_qa/shots/desktop-how-to-play.png) 與 [手機模擬](_qa/shots/mobile-how-to-play.png) 展開版面。

靜態檢查九個入口、94 個本地連結與全部程式語法通過；53 項模型檢查通過。本次沒有修改材料模型或作曲，也沒有重做先前完整時長的八件展演驗收。互動品質評估依目前程式與操作因果，見 [互動檢查與提案](INTERACTION_REVIEW.md)；所列改造尚未實作，尚需後續實際觀眾試玩與主觀聆聽。

## 八件互動改造最終驗收（2026-10-10）

八件專屬互動全部實作：建築連續調音與三視點；織物完整穿梭織行；休止按住發聲／放開留白；化石局部挖掘與原樂句回聽；潮汐雙場偏移與連續相位；呼吸分段創作與明確定型；迷宮移動聲源與幾何反射門；懸線敲擊蓄能。所有 How to play 已更新，原創自動展演保留。休止符以四個留白區域、曲面切口與單一內折面取代交錯碎線，色盤改暖炭灰／陶土／暖砂。

- [主操作](_qa/interactive-results.json)：八件 × 桌面 1440×900／手機觸控瀏覽器模擬 390×844，16 組通過。驗證專屬輸入確實造成聲音、材料、相位、路徑或能量變更；參數切換保留歷史、keyboard、收合說明不誤播放、無水平溢出、暫停凍結。化石桌面真實等待 32 秒；手機則明確以暫停後固定步長重算定型。
- [完整展演回歸](_qa/full-interactive-regression.json) 與 [最後建築回歸](_qa/architecture-clock-regression.json) 依作品／裝置合併後 **16 組、308 項皆通過**，見 [彙總](_qa/interactive-acceptance.json)。桌面全部正常速度等待代表事件，潮汐超過 82 秒；音訊啟動與訊號、靜音、音量、暫停、續播、重播、PNG、導覽、生命週期與無 console／pageerror 皆通過。
- 首輪完整回歸有一項手機建築失敗：開發用 `debug.stepTo()` 重算材料後沒有對齊音訊 origin，續播回到重算前的時刻，使換和弦在等待窗內不演化。已修正重算時鐘與排程，最後建築桌面／手機所有檢查通過。保留首輪失敗記錄，不以刪除結果掩蓋；此功能沒有提供給觀眾。
- [模型原生 assert](_qa/model-results.json) 53 項與 [互動 assert](_qa/interaction-model-results.json) 44 項，**97 項皆通過**。涵蓋手動不偷灌入自動材料、舊行織法與聲部保留、有界歷史、切口位置和張力、局部挖掘不改原沉積、相位連續、轉門／移源確實改距離、節奏蓄能／流失／恢復、氣音與停頓。
- [邊界案例](_qa/interaction-edge.json) 八類通過：實際 dispatch touch 梭子穿越、按住中暫停不造切口、手動轉門後回自動仍使用當下幾何、挖掘改畫面且回聽不改主時間、合成麥克風保留 850 ms 停頓、明確定型停止串流、14 秒上限停止串流、拒絕麥克風從手動創作回有聲示範、無 AudioContext／減少動態仍可改材料（相關檢查依工具分組）。
- [手機點按／滑動](_qa/interaction-touch.json)：迷宮與蓄能畫布經過滑動不啟動音訊，完成 touch 點按才移動聲源或注入一次能量。
- [八件自動聲音](_qa/interaction-smoke.json)：全部 AudioContext running、非零訊號，化石／呼吸旋轉仍正常。沒有主觀聆聽。
- [靜態檢查](_qa/static-results.json)：九個 HTML、94 個本地連結與全部 JS／MJS／CJS 語法通過。沒有適用的 npm build／lint pipeline。

已檢視 [八件原生渲染聯絡表](_qa/interactive-contact.webp)、[休止符桌面](_qa/shots/desktop-silence-new.png)、[手機](_qa/shots/mobile-silence-new.png) 與 [挖掘表面](_qa/shots/fossil-excavated.png)。目錄八張 1100×650 縮圖使用相同模型與 Canvas 渲染器產生代表狀態，不以縮圖生成冒稱完成實時操作。自動與手動材料歷史皆有上限，詳見 INTERACTION_REVIEW.md。

本次限制：手機為 Chromium 模擬與實際 touch 事件，未做手機實機、Safari／Firefox、人體麥克風或主觀聆聽；麥克風驗收為 MediaStream 合成訊號。互動樂趣的主觀評價留待真人試玩。

## 按住視覺、16 秒化石、古典選曲與技術說明更新

休止符新增按住期間的臨時切口，長度與開口隨時間平滑增加；放開後接續加深，取消／暫停不新增永久切口。聲音化石以 16 秒播放全部原創事件，進度條及剩餘秒數可見；固定步長比較確認材料陣列與先前 32 秒版本完全一致。八頁均新增八首古典主題節選，並在 How to play 下方列出使用技術。麥克風擴充僅作逐頁評估，見 MICROPHONE_REVIEW.md。

- [純模型](_qa/classical-model-results.json)：267 項 assert，含八首 × 八件 64 組事件有效性、有限時長、定型與挖掘、原創 16 秒完整材料一致、給愛麗絲開頭音符，以及各古典主題依音符當下已出現牆面計算的回聲路徑／時間。
- [本次操作與音源](_qa/request-results.json)：68 組通過。桌面／手機模擬按住時兩個不同時刻畫面確實改變，取消不留永久切口；兩裝置均正常速度實際等待 16 秒完成，倒數／進度在暫停時凍結，定型後可挖掘。八首 × 八頁均觀察到非零音訊訊號、初次選曲不啟動 AudioContext、技術說明存在、手機無溢出、無 pageerror。
- [八件手動回歸](_qa/interactive-results.json)：桌面／手機 16 組全部通過。首輪手機紙面點按腳本在操作列捲動後使用了螢幕外座標；已在點紙面前捲回畫布，完整重跑通過，保留 [首輪記錄](_qa/request-interaction-first.json)。
- [古典曲目專屬控制](_qa/classical-controls.json)：建築／織機 × 八首 16 組通過，驗證選曲後和弦設定、短音比例及三聲部節點仍有效，並檢視新版手機選單與技術說明留白。
- [播放回歸](_qa/request-playback.json)：休止符與化石 × 兩裝置全部通過，含開始、暫停、續播、靜音、音量、重播、PNG、導覽、退出清理、音訊缺失與麥克風拒絕備援。
- [邊界回歸](_qa/interaction-edge.json)：八類全部通過，包含按住取消、挖掘獨立回聽、手動轉門後自動幾何、合成麥克風停頓／14 秒上限／權限拒絕及無 AudioContext。
- 既有 53 項模型、44 項手動互動模型、九入口／94 本地連結／全部程式語法均通過。原生 Canvas 預覽圖同步更新；實際檢視按住與定型截圖後修正選曲、技術說明的手機留白。

古典曲目是手動編寫、簡化裝飾音與伴奏的主題節選，沒有使用現代演奏錄音；來源與署名見 MUSIC_CREDITS.md。音訊驗收為程式訊號與排程檢查，未做主觀聆聽或專業演奏校訂。手機仍為 Chromium 模擬，沒有新增實機、Safari／Firefox或真人麥克風測試。
