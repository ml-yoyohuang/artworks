# 薄膜色光三版對照

從專案根目錄啟動靜態伺服器，開啟 `http://localhost:8000/interval/studies/membrane-colour/`。

1. 冰青綠為主、霧紫為輔：沿用圓潤寬光帶，局部灰紫滲入冰青綠。
2. 雷射窄光帶：保留大面積深灰藍，窄帶依序呈現青藍、青紫與少量洋紅，局部少量香檳金。色彩保持柔和，不加 bloom。
3. 視角虹彩：與 02 同一配色和形狀，拖曳或方向鍵改變朝向時，光譜相位隨之偏移。這是風格化視角反應，用於示意，並非物理 CD 繞射或薄膜干涉模型。

三版共享正式版的噪聲、域扭曲和局部變向迴旋，僅改色帶映射與寬度。切換時從相同時間點重播，保留視角；可按「重設視角」回到正面。03 建議先暫停流動再拖曳，以分辨視角變色。朝向限制在原觀看方向附近，避免轉出門廊；支援滑鼠、觸控與方向鍵，沒有自動旋轉。

`material.js` 擴充正式 `js/oil-material.js`，`study.js` 建立一個 MuseumWorld、單一薄膜材質並切換 uniform，不並行建立三個展間。只建立一個 WebGL context。尊重減少動態，背景暫停，離頁釋放；無 WebGL 時提供正式出口的真實截圖與返回入口。

正式本地網站已採用確認的 03 版；首頁碟片維持原樣。此次更新尚未提交或公開發布。

驗證：`node interval/tools/verify-membrane-colour.cjs`，可指定 `PLAYWRIGHT_MODULE` 與 `INTERVAL_STUDY_URL`。桌機 1440×900、手機 390×844 觸控模擬，Chromium151／macOS／SwiftShader，沒有實體手機驗證。測試版本切換、動畫、拖曳與鍵盤視角、相同朝向的 02／03 像素差異、暫停、重播、背景暫停、減少動態、資源穩定、溢出和 WebGL 備援。結果位於 `qa-membrane-colour-results.json`，實際截圖位於 `screenshots/*-membrane-colour-*.png`。
