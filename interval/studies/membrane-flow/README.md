# 薄膜光澤對照

從專案根目錄啟動靜態伺服器，開啟 `http://localhost:8000/interval/studies/membrane-flow/`。

- A：原先展間的深灰藍凹凸薄膜，沿用原材質與幾何擾動。
- B：接近平整的油膜光澤研究；多層噪聲扭曲色帶、兩處變向迴旋，灰藍／銀灰為主，少量灰青與灰紫。這是程序化的藝術性光澤演繹，不是物理油膜模擬。
- B 第二次調整：減少細碎噪聲與域扭曲強度、放大紋理尺度，以柔和的高斯亮帶取代較硬的等高線邊緣，讓轉折更圓潤；灰藍色票微增彩度，保留不規則變向迴旋。
- B 第三次調整：灰藍、灰青與灰紫色票再小幅提高彩度，亮度與動態參數維持原設定。
- 預設B，可切換、暫停及從頭觀看。兩版共用同一門廊、鏡頭與一個WebGL context，沒有同時跑兩個展間。
- 尊重減少動態，使用者可主動播放；背景暫停。WebGL失敗時顯示目前展間的真實截圖。
- 正式本地網站已採用確認的 B 版；研究頁仍保留 A／B 比較，尚未提交或發布。

`../../js/oil-material.js`集中B版色票與程序材質，研究頁的 `oil-material.js` 轉出同一份材質；`study.js`處理模式切換與資源管理。三色噪聲、局部旋轉與域扭曲程式為本研究撰寫，沒有使用影片或外部材質貼圖。域扭曲概念可參考[The Book of Shaders](https://thebookofshaders.com/13/)。

驗證：`node interval/tools/verify-membrane-study.cjs`，可用PLAYWRIGHT_MODULE指定Playwright、INTERVAL_STUDY_URL指定部署子路徑。Chromium151／macOS／SwiftShader，桌機1440×900與手機390×844觸控模擬，未使用實體手機。實際畫面存於 `interval/screenshots/*-oil-study-*.png`。

## 可用於溝通的技術名稱

這兩種外觀沒有唯一的標準品名，以下是準確的技術描述。

- A：程序化頂點位移薄膜（Procedural Vertex-Displaced Membrane）。以正弦波疊加改變網格頂點，重新計算法線，搭配 PBR 材質產生起伏表面上的高光。此處頂點由 JavaScript 更新，並非用凹凸貼圖或法線貼圖假造幾何起伏。
- B：域扭曲程序著色（Domain-Warped Procedural Shading）；外觀可描述為風格化油膜光澤（Stylized Oil-Sheen Effect）。平面上的 fBM 噪聲經域扭曲與局部變向旋轉，映射到柔和灰藍色帶。沒有使用物理薄膜干涉、真實流體模擬或基於視角的虹彩模型。
- A 溝通句：「我要一片緩慢起伏的膜面，用程序化頂點位移與柔和 PBR 高光，四周固定，避免規則的水波感。」
- B 溝通句：「我要平整表面的風格化油膜光澤，用域扭曲噪聲形成圓潤色帶，局部流向不規則變化，慢慢翻捲；以灰藍為主，少量青紫，不要固定方向平移。」

技術參考：[Three.js PBR 材質與頂點位移](https://threejs.org/docs/pages/MeshStandardMaterial.html)、[fBM 與域扭曲](https://thebookofshaders.com/13/)。
