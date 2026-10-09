# 間隙美術館 INTERVAL — 本地驗證報告

日期：2026-10-09（Asia/Taipei）。交付範圍只有 `interval/`；既有作品集、雜誌與 showroom 保持原樣，沒有提交、推送或公開部署。

## 實測環境與證據

- macOS（darwin），Playwright 1.62.1，Chromium 151.0.7922.34（headless，SwiftShader 軟體繪圖）。
- 另以 Codex 內建瀏覽器實際開啟原作《門後還有門》《薄處有光》、入口與展場，觀看並操作。
- 桌機 1440×900；手機 **390×844，觸控／mobile emulation，DPR 1 與 2**。手機結果為模擬，沒有實體手機驗證。
- 補查 320×640、768×1024 與 1024×768 的排版、原作入口按鈕與水平溢出。
- 正常鏡頭模式與系統 `prefers-reduced-motion: reduce`；本地根路徑與 `/artworks/` 部署前綴。
- 原始結果：`qa-results.json`、`qa-failure-results.json`、`qa-extra-results.json`、`qa-size-results.json`。可重跑腳本在 `tools/`。

## 完整片段與畫面修正

先完成入口、風的測量室與《順風千行》的真實原作 iframe；實測進入、互動與返回，位置與朝向一致。其後才擴展其餘空間。

實際畫面檢查並修正了：首次 rAF 綁定導致空白展場、入口構圖與小螢幕文字對比、原作下緣被展具支架遮住、終章巨幅下緣低於地面、手機入口看不見完整展品、作品卡覆蓋桌機展品，以及手機導覽列遮住「進入作品」。預覽完成載入後才保存最終截圖，並另從第二輯原作擷取 1600×1000《薄處有光》完整停格。

五區的實際畫面與手機畫面均已檢視。截圖索引為 [screenshots/index.html](screenshots/index.html)，包含入口、五區、作品資訊、門後房間、手機原作互動、導覽及故障備援；不是設計示意圖。

## 已完成的操作驗證

| 檢查 | 實際方法 | 結果 |
| --- | --- | --- |
| 35 件盤點 | 實際 HTML 目錄與 manifest 集合相等；18 p5＋17 shader，ID 唯一 | 通過，沒有第一輯路徑、遺漏或重複 |
| 實際陳列 | 每件都有 placement、viewpoint、HTML 標籤、原始自述與原作入口 | 通過，五區共 5／10／7／8／5 件 |
| 逐件載入 | 每個原作在唯一 iframe 中啟動，確認 URL、畫布與失敗 UI | 35／35 通過 |
| p5 第一部控制 | 10 件重新生成新種子，確認種子與畫面改變 | 10／10 通過 |
| 幾何八件 | 逐件專用鍵盤、滑桿、鎖定／翻折／缺席位置／留群／遞迴進入／移位及重置 | 8／8 通過；各件操作後的畫布有變化 |
| shader 控制 | 17 件適用滑桿、參數按鈕與畫布操作；薄膜另查細看 | 17／17 通過，畫布有變化，無 fallback |
| 返回站位 | 每件關閉前後比較 section、position、yaw、pitch | 35／35 一致 |
| 原頁前後作品 | 原作品內「下一件」切換，在同一 iframe 置換 | 通過；回到最初開啟的展場站位 |
| 桌機完整路徑 | 從入口依觀看位置按鈕走完 35 件、五區及終點 | 通過 |
| 手機完整路徑 | 390×844、DPR2、觸控模擬，依序走完 35 站、終點與返回 | 通過，沒有水平溢出 |
| 手機原作 | 遞迴作品觸控、重置；薄膜細看、返回 | 通過 |
| 導覽 | 開始、暫停、跳過全部十站、退出；末站為《薄處有光》 | 通過 |
| 作品列表 | 搜尋、無結果、展區篩選、恢復全部、直接前往展品 | 通過 |
| 門後還有門 | 舒適轉場後，遠處色面成為周圍的陶土色房間；原作仍另有入口 | 通過 |
| 環顧與鍵盤 | 預設動態拖曳、方向鍵、W 站位移動 | 通過 |
| 重複進出 | 同作品連續 8 次；追蹤 iframe、gallery canvas、renderer 資源 | 0 殘留 iframe、1 展場畫布；紋理與幾何數量一致 |
| 減少動態 | 偵測系統設定並使用直接換位；原頁保留自己的 reduced-motion | 通過 |
| 無 WebGL | 注入 getContext=null，檢查完整 35 件列表、真實縮圖與 p5 入口 | 通過 |
| context 中斷 | 真正呼叫 WebGL_lose_context | 轉到備援，移除展場畫布 |
| 無 JavaScript | 關閉腳本，從 noscript 進入免 JS 目錄 | 35 件 HTML 資訊與原作入口完整 |
| 原作載入失敗 | 原頁回應 HTTP 404，檢查重試、原頁連結、返回及 iframe 釋放 | 通過 |
| 背景暫停 | 人工隱藏狀態＋visibilitychange，記錄 rAF 增量；另查原作薄膜 iframe | 隱藏後增量 0；恢復後繼續，不追趕鏡頭 |
| 子路徑 | 真正靜態伺服器掛在 `/artworks/interval/`；全部 35 預覽＋35 原頁 HTTP 檢查 | 70／70 HTTP200，ES modules／JSON 正常 |
| 子路徑互動 | 在前綴下進入原作《門後還有門》《薄處有光》並操作 | 通過 |

背景狀態是透過測試注入模擬，並非聲稱已測試各作業系統的真實背景凍結策略。HTTP404、無 WebGL 與 context 中斷也都是明確的故障注入。

## 35 件陳列與入口核對

「原作」欄直接連到第二輯原頁。完整原自述與觀看座標保存在 `exhibition.json`，免 JavaScript 目錄也保留自述。

| 展區 | 原名 | 系列與原頁 | 載入／操作／返回 |
| --- | --- | --- | --- |
| 01 風的測量室 | 順風千行 | [p5-demos2/flow-field](../p5-demos2/flow-field.html?seed=2024) | 通過 |
| 01 風的測量室 | 靜默測繪 | [p5-demos2/contour-topography](../p5-demos2/contour-topography.html?seed=4096) | 通過 |
| 01 風的測量室 | 黃昏群舞 | [p5-demos2/boids-flocking](../p5-demos2/boids-flocking.html?seed=8128) | 通過 |
| 01 風的測量室 | 字散 | [p5-demos2/generative-typography](../p5-demos2/generative-typography.html?seed=42) | 通過 |
| 01 風的測量室 | 銅版星圖 | [p5-demos2/voronoi-stippling](../p5-demos2/voronoi-stippling.html?seed=123457) | 通過 |
| 02 共處的平面 | 讓出一寸 | [p5-demos2/negotiated-territories](../p5-demos2/negotiated-territories.html?seed=161803) | 通過 |
| 02 共處的平面 | 三色未合 | [p5-demos2/registration-pending](../p5-demos2/registration-pending.html?seed=65537) | 通過 |
| 02 共處的平面 | 背面也是顏色 | [p5-demos2/reverse-of-a-plane](../p5-demos2/reverse-of-a-plane.html?seed=271828) | 通過 |
| 02 共處的平面 | 缺席者的散步 | [p5-demos2/moving-absence](../p5-demos2/moving-absence.html?seed=104729) | 通過 |
| 02 共處的平面 | 讀過的厚度 | [p5-demos2/chromatic-sediments](../p5-demos2/chromatic-sediments.html?seed=161803) | 通過 |
| 02 共處的平面 | 晚到的那幾位 | [p5-demos2/a-beat-behind](../p5-demos2/a-beat-behind.html?seed=161803) | 通過 |
| 02 共處的平面 | 門後還有門 | [p5-demos2/within-the-same-frame](../p5-demos2/within-the-same-frame.html?seed=104729) | 通過 |
| 02 共處的平面 | 它剛剛在這裡 | [p5-demos2/residual-geometry](../p5-demos2/residual-geometry.html?seed=271828) | 通過 |
| 02 共處的平面 | 切分的秩序 | [p5-demos2/recursive-subdivision](../p5-demos2/recursive-subdivision.html?seed=27182) | 通過 |
| 02 共處的平面 | 漆金結 | [p5-demos2/truchet-tiles](../p5-demos2/truchet-tiles.html?seed=2024) | 通過 |
| 03 慢物質花園 | 夜珊瑚 | [p5-demos2/differential-growth](../p5-demos2/differential-growth.html?seed=99991) | 通過 |
| 03 慢物質花園 | 藍曬葉脈 | [p5-demos2/space-colonization](../p5-demos2/space-colonization.html?seed=2024) | 通過 |
| 03 慢物質花園 | 細胞的禮貌 | [p5-demos2/circle-packing](../p5-demos2/circle-packing.html?seed=314) | 通過 |
| 03 慢物質花園 | 石上地衣 | [shader-demos2/organic-growth](../shader-demos2/organic-growth.html) | 通過 |
| 03 慢物質花園 | 石紋 | [shader-demos2/reaction-diffusion](../shader-demos2/reaction-diffusion.html) | 通過 |
| 03 慢物質花園 | 石中之水 | [shader-demos2/domain-warp-fbm](../shader-demos2/domain-warp-fbm.html) | 通過 |
| 03 慢物質花園 | 日光標本 | [shader-demos2/cyanotype](../shader-demos2/cyanotype.html) | 通過 |
| 04 記憶顯影室 | 兩卷底片 | [shader-demos2/noise-dissolve](../shader-demos2/noise-dissolve.html) | 通過 |
| 04 記憶顯影室 | 顯影 | [shader-demos2/darkroom-solarize](../shader-demos2/darkroom-solarize.html) | 通過 |
| 04 記憶顯影室 | 套色 | [shader-demos2/risograph-print](../shader-demos2/risograph-print.html) | 通過 |
| 04 記憶顯影室 | 殘光 | [shader-demos2/feedback-trails](../shader-demos2/feedback-trails.html) | 通過 |
| 04 記憶顯影室 | 北天曝光 | [shader-demos2/long-exposure](../shader-demos2/long-exposure.html) | 通過 |
| 04 記憶顯影室 | 斷訊 | [shader-demos2/pixel-sorting](../shader-demos2/pixel-sorting.html) | 通過 |
| 04 記憶顯影室 | 側臉與紅日 | [shader-demos2/dithering-halftone](../shader-demos2/dithering-halftone.html) | 通過 |
| 04 記憶顯影室 | 校樣之晨 | [shader-demos2/grain-gradient-mesh](../shader-demos2/grain-gradient-mesh.html) | 通過 |
| 05 薄處有光 | 薄處有光 | [shader-demos2/thin-film](../shader-demos2/thin-film.html) | 通過 |
| 05 薄處有光 | 隔著玻璃 | [shader-demos2/glass-refraction](../shader-demos2/glass-refraction.html) | 通過 |
| 05 薄處有光 | 午後泳池 | [shader-demos2/liquid-distortion](../shader-demos2/liquid-distortion.html) | 通過 |
| 05 薄處有光 | 紗上波紋 | [shader-demos2/textile-moire](../shader-demos2/textile-moire.html) | 通過 |
| 05 薄處有光 | 石膏習作 | [shader-demos2/raymarching-sdf](../shader-demos2/raymarching-sdf.html) | 通過 |

## 資源與已知限制

- 展場是單一 WebGL2 renderer；原作模式最多一個 iframe。只載入目前展區的 GPU 圖像，換區 dispose 材質、紋理、幾何與陰影。列表是靜態圖片，不啟動原作。
- 原作內可能有必要的離屏畫布（實測每件 1–5 個 canvas）；關閉 iframe 會連同該文件與資源釋放。8 次測試確認 DOM 與 renderer 資源數不增加，但沒有長時間完整 heap／GPU 記憶體剖析。
- 建築照明與原作色彩分離：sRGB 原作紋理、無光照材質、toneMapped=false、fog=false。35 張都是實際原作停格，互動模式才啟動原作品。沒有預錄影片或第一輯借圖。
- 沒有 Safari／Firefox、實體手機、真實 GPU 幀率或低階硬體量測。SwiftShader 的時間不能當作硬體效能保證。展場有解析度／陰影降低與平面模式；自動效能門檻是保守策略，未跨真實硬體校準。
- 三維空間需要 WebGL2；只有 WebGL1 的裝置會走完整平面目錄。GLSL 原作是否能互動仍依自身的 WebGL1 支援；無 WebGL 的裝置可以看停格與文字。
- 展場採受限觀看位置，沒有連續的任意 WASD 漫遊。跨不連續平台與長距離換位使用淡出，避免穿牆、墜落與快速飛行。
- 作品卡收起後可完整看展場；窄且矮的手機改成精簡資訊卡，自述仍可在原作或完整 HTML 目錄閱讀。
- 沒有音效。展覽敘事與建築意象另行創作；原作沒有被改寫。
- `interval/` 不是獨立內容包：部署須保留原作兩個資料夾與共用 Three.js vendor 的相對位置。

[入口與五展區實際畫面](screenshots/index.html)

## 操作與畫面修正回歸

- 移除展覽敘事中的製作署名；35 件資訊卡及完整 HTML 目錄逐一检查 HTML entity 的重複編碼與替代字元，修正《側臉與紅日》的英文標題。
- 當次將第二展區的「門後還有門」額外操作限制於該作品站位；2026-10-10 後續修正已完整移除額外按鈕，見下方「換站列簡化」。原作進出仍保留返回原位。
- 重複門框的兩側立柱與橫梁使用共同座標、水平接合，移除零件各自旋轉造成的錯位。
- 記憶顯影室的半透明展板改為上方懸吊並退至側邊，避免支柱與展板遮擋《校樣之晨》。實際檢視桌機及手機模擬畫面，作品完整可見。
- 終章最後一站的箭頭實際返回第一展區入口。桌機與手機模擬逐站走完五區／35 件作品後確認展區 01、站位 0；結尾面板清除。
- Chromium 151.0.7922.34／macOS／SwiftShader；桌機 1440×900、手機 390×844 DPR2 觸控模擬（未用實體手機）。回歸測試沒有頁面錯誤或 HTTP 載入錯誤，更新入口與五區實際截圖。
- 當次未修改出口設計；後續已依確認方案完成，見下方「下一廳的門洞」。

結果：`qa-corrections-results.json`；重跑：`tools/verify-corrections.cjs`（使用 README 所列的 Playwright 執行方式）。

## 下一廳的門洞

依確認方案，四個出口由不透明黑色面改為有深度的建築片段：陶土色面與懸板、深色門廊、交疊的半透明展板，以及黑色薄膜（後續修訂已移除枝狀平台與作品停格）。門內採柔和局部照明；前往站位會顯示下一展區名稱、引導句與具名按鈕。門洞可點擊，出口站位的 Enter 可前往下一廳，仍沿用舒適淡出及減少動態的直接換位。

- Chromium 151.0.7922.34／macOS／SwiftShader。1440×900 桌機使用一般動態設定，390×844 DPR2 手機模擬使用減少動態；未測實體手機。
- 四個出口各自確認景象、正確展區名稱、桌機／手機實際畫面與無水平溢出。修正手機門框裁切，以及側牆與門框共面造成的閃爍。
- 桌機實測門洞點擊、Enter、具名按鈕；手機模擬實測門洞 tap 與具名按鈕 tap。八次出口前往皆到達正確下一廳，換區後提示收起；終章返回第一區仍正常。
- 重跑 35 件資訊卡、原作進出返回、全館桌機／手機路徑的修正回歸檢查，無頁面或 HTTP 錯誤。
- 門內是下一廳的建築預示；完整展廳在換區時建立。後續修訂已取消鄰區真實停格，出口均為程序建築，不啟動鄰區即時作品、不新增 WebGL context。資源隨當區清除。

結果：`qa-thresholds-results.json`、`qa-corrections-results.json`。重跑：`tools/verify-thresholds.cjs`。桌機／手機的八張出口截圖已加入 [實際畫面](screenshots/index.html)。


## 黑色薄膜與出口簡化

- 保留門框、側牆、地面與深度照明。移除通往花園的出口枝狀平台；通往終廳的出口移除原作品停格、平台、座椅及虹彩條，改為一片浮動的黑色程序薄膜。原《薄處有光》仍完整陳列在第五展區。
- 薄膜由展場自己的單一幾何網格呈現，表面緩慢起伏，以高光呈現褶皺；沒有新增畫布、影片、作品 iframe 或 WebGL context，也不載入鄰區作品預覽。
- 桌機 1440×900 與手機 390×844 DPR2 觸控模擬（Chromium 151.0.7922.34／macOS／SwiftShader）確認動畫時間及畫面像素確實改變。實際檢視桌機與手機截圖。
- 模擬 visibilitychange 確認動畫時間與 RAF 完全停止，恢復後不補跑背景時間；「減少動態」確認時間與像素靜止，再關閉則恢復。離開出口觀看範圍停止更新，換區釋放網格。薄膜最多 30 fps 更新與繪製，靜態陰影只在場景建立時更新。
- 每個模擬裝置重複換區三次，畫布保持一個，renderer 紋理與幾何數量穩定；四個出口的點擊、Enter、具名按鈕與手機 tap 前往皆通過，無頁面錯誤。沒有實體手機與真實 GPU 效能測試。

結果：`qa-membrane-results.json`、`qa-thresholds-results.json`；重跑：`tools/verify-membrane.cjs`。更新的八張門洞截圖可從截圖目錄查看；`desktop-black-membrane.png` 與 `mobile-black-membrane.png` 為開啟動態時的實際截圖。

## 2026-10-10：全牆薄膜與介面動效

- 薄膜覆蓋門廊深處整面方形牆；四邊固定、內部緩慢向前起伏。桌機與手機的動畫、背景暫停、減少動態及重複換區資源檢查通過。
- 所有作品卡共用進退場動效。退場立即停止接收操作，完成後隱藏；快速關閉重開、Esc、換站及減少動態皆正常。
- 對應展品標籤以淺色底、減號及 aria-expanded 表示開啟，可再次點擊收起。手機實際發現資訊卡遮住標籤，已調整至資訊卡上方，並驗證 tap 收起。
- 按鈕加入 hover 微幅上移、active 輕微縮放及色彩回饋；桌機實測位移與縮放，手機實測 tap。減少動態取消卡片動畫、位移與縮放。
- 35 件資訊卡及完整五區路徑回歸通過。Chromium 151.0.7922.34／macOS／SwiftShader；桌機 1440×900、手機 390×844 DPR2 觸控模擬，未測實體手機。

結果：`qa-card-motion-results.json`、`qa-membrane-results.json`、`qa-corrections-results.json`。重跑：`tools/verify-card-motion.cjs`。實際截圖：`desktop-card-open.png`、`mobile-card-open.png`、`desktop-black-membrane.png`、`mobile-black-membrane.png`。

## 2026-10-10：換站列簡化

- 完整移除額外的 `#portal` 按鈕與其事件。包含《門後還有門》在內，換站列統一為上一站、站位名稱、下一站三個按鈕；原作品仍由資訊卡「進入作品」開啟。
- 桌機與手機樣式的左右 padding 均為 0，hover 底色貼齊控制列邊緣。
- Chromium 151.0.7922.34／macOS／SwiftShader：1440×900 桌機與 390×844 DPR2 手機觸控模擬，實測計算樣式左右 padding 皆為 0px；確認三個按鈕、完整五區換站及終章返回。35 件資訊卡無額外 portal，原作品進出返回原位，無頁面或載入錯誤。未使用實體手機。
- 已檢視桌機 hover 與手機實際截圖：`screenshots/desktop-door-controls.png`、`screenshots/mobile-door-controls.png`。結果：`qa-corrections-results.json`；重跑：`tools/verify-corrections.cjs`。

## 2026-10-10：說明按鈕與發布

- `#help-button` 固定為 44×44 px，移除內距並禁止 flex 壓縮，使其保持正圓。桌機 1440×900 與手機 390×844 觸控模擬皆確認實際尺寸 44×44，操作說明可正常開啟與關閉；已檢視手機截圖。Chromium／SwiftShader，未使用實體手機。
- 本次使用者已授權提交與發布；GitHub Pages 由 main 根目錄自動發布。僅提交 interval/，其他展間變更保留在工作區。

## 導覽列與面板動效調整

- 導覽列 gap 在所有尺寸為 0，三個導覽按鈕與入口「帶我逛展」左右 padding 為 12px；返回入口 hover 背景維持透明。
- 導覽面板淡入上移／淡出，關閉過程禁止操作；Esc、背景點擊、展區與展品入口使用相同關閉流程，取消動畫時避免過期回呼關閉新面板。
- 作品卡從右側滑入，保留原有退場與標籤開啟狀態。系統與手動減少動態均直接開關。
- Chromium 151.0.7922.34／macOS／SwiftShader：桌機 1440×900、手機 390×844 觸控模擬通過樣式、面板關閉及 Esc、展區選擇、作品進場、減少動態；作品卡快速重開、標籤切換及 hover／active 回歸通過，無頁面錯誤。已檢視 `desktop-nav-motion.png`、`mobile-nav-motion.png`；未使用實體手機。

## 入口主視覺收斂

- 移除重複支架、側平台、座椅及橫向刻度線，保留步道、單一偏心懸浮薄板及虹彩膜。手機重新取景，避免膜被裁切或與主標題重疊。
- 膜的內外輪廓固定，局部褶皺缓慢變形，光澤、低彩度色彩及虹彩膜厚同步細微擾動。圓周接縫法線合併，避免反射斷線；無強制旋轉或閃爍。
- Chromium 151.0.7922.34／macOS／SwiftShader：1440×900 桌機、390×844 DPR2 手機觸控模擬，實際檢視入口截圖；動畫時間及畫面像素改變，模擬背景時停止時間与 RAF，系統減少動態時停止更新。
- 每個模擬裝置重複進出入口三次，紋理、幾何及畫布數穩定（單一展場畫布），進入第一區即釋放入口動畫；沒有頁面錯誤。出口黑膜的暫停、恢復、像素變化及重複換區回歸通過。未使用實體手機或硬體 GPU 效能測試。

結果：`qa-entry-results.json`、`qa-membrane-results.json`；重跑：`tools/verify-entry.cjs`。實際截圖：`screenshots/desktop-entry.png`、`screenshots/mobile-entry.png`。

## 懸浮階梯與冷光螺旋

- 依使用者示意移除頂部薄板，入口改為四片向斜上方遞進的霧白階梯薄板，碟片置於最高處。保留間隙與薄邊，桌機形成向左上延伸的輪廓。
- 碟片恢復較明亮的青藍、冰紫及亮白螺旋色帶；降低金屬底色，螺旋緩慢流動，並維持局部形變。
- Chromium 151.0.7922.34／SwiftShader，1440×900 桌機與 390×844 DPR2 手機觸控模擬實際檢視通過。入口時間及像素持續改變，背景與減少動態停止；每個裝置重複進出三次資源數穩定、單一畫布，無頁面錯誤。未使用實體手機。
- 更新 `desktop-entry.png`、`mobile-entry.png`、`qa-entry-results.json`；重跑：`tools/verify-entry.cjs`。

## 入口間距與形變加強

- 階梯整組向後移 3 米，第一片前緣與道路末端保留 2.3 米間隙；碟片隨階梯退後並向上移 2 米，與最高階梯拉開距離。
- 膜面形變幅度約為上一版的 2.7 倍，增加外緣輕微伸縮，使輪廓與褶皺都能看出變化；保留冷色螺旋及舒適的緩慢節奏。
- Chromium 151.0.7922.34／SwiftShader：1440×900 桌機、390×844 DPR2 手機觸控模擬已檢視。動畫像素變化、背景暫停、減少動態及三次進出資源穩定皆通過，無頁面錯誤；未使用實體手機。更新入口截圖與 `qa-entry-results.json`。

## 首頁展覽標準字 C 動畫

- 正式首頁加入 C：尚未下移、齊打開細縫，約 760 ms 後靜止；每次頁面載入只播放一次，返回入口不重播。英文與其餘字固定，鏡頭保持穩定。完成／中斷後取消所有標題動畫，不持續執行 RAF。
- Chromium 151.0.7922.34／SwiftShader：桌機 1440×900、手機 390×844 觸控模擬，檢查完整初始字形、中途位移、完成切分與零活躍動畫；返回入口沒有重播，系統減少動態直接完成，平面模式仍有標題，無水平溢出與頁面錯誤。已檢視更新後桌機、手機入口截圖；未使用實體手機。
- Heading 以完整展名提供 accessible name，視覺拆字與複製筆畫不重複朗讀。

## 入口按鈕鏡頭回應

- 依使用者確認加入 hover／鍵盤焦點微幅前移、移開復位，以及按下後進一步靠近並淡出進館。鏡頭朝向不變，停留時不持續移動；手機只在按下時回應。
- Chromium 151.0.7922.34／SwiftShader，1440×900 桌機、390×844 手機觸控模擬：hover 前移／準確返回、键盤焦點、快速移入移出、按下後移開取消、按下推進、重複點擊、返回入口及減少動態通過。背景中斷可取消鏡頭與進館等待，恢復後可再次操作；原始站位與朝向保持不變，無頁面錯誤。未使用實體手機。
- 已檢視 `screenshots/desktop-entry-hover.png`；重跑：`tools/verify-entry-feedback.cjs`。

## 入口鏡頭幅度與節奏加強

- Hover 前移改為 1.8 米／1000 ms，移開以 800 ms 復位；按下推至 4.5 米／1250 ms，完成後停留 160 ms，再開始淡出。
- 桌機與手機模擬逐幀記錄偏移與淡出狀態，確認淡出前已到達 4.5 米，並保留至少 100 ms 的可見停留；點擊至淡出開始超過 1200 ms。取消、背景中斷、重複點擊、準確復位及減少動態回歸通過，無頁面錯誤。
- Chromium 151.0.7922.34／SwiftShader，1440×900 桌機、390×844 手機觸控模擬，未使用實體手機。更新 hover 與按下前移畫面，重跑：`tools/verify-entry-feedback.cjs`。

## 正式入口採用 B：同步前移與上仰

- 點擊「進入展覽」同步前移 4.5 米與上仰 3°，共用 1250 ms smoothstep；完成後停留 160 ms，再淡出進館。Hover／鍵盤焦點仍只前移，碟片不額外縮放。
- 視覺仰角與原始站位、朝向分開，返回入口、換區、面板與背景暫停清除；減少動態跳過。點擊啟動兩項動效，長按不提前推進，鍵盤原生 click 同樣有效。
- Chromium 151.0.7922.34／SwiftShader：1440×900 桌機、390×844 手機觸控模擬，逐幀確認首 400 ms 已同步前移／上仰，淡出時偏移 4.5 米、仰角 3°；停留、返回、背景取消、重複點擊、hover／焦點復位及減少動態通過，無頁面錯誤。已檢視桌機、手機完成構圖，未使用實體手機。
- 更新 `tools/verify-entry-feedback.cjs` 與 `screenshots/desktop-entry-press.png`；新增 `screenshots/mobile-entry-press.png`。
