# 從白晝走進暗房 — 線上 3D 展間

一間以 three.js 建造的線上美術館：入口大廳 → 第一廳「規則的花園」（p5.js 線條作品）→ 第二廳「幾何之間」（p5.js 色面作品）→ 光線逐步退去的長廊 → 第三廳「暗房」（GLSL 作品）→ 終點作品。

## 本地開啟

展間使用 ES module 與 import map，**無法以 `file://` 直接雙擊開啟**，請透過任何靜態伺服器提供。
因為「進入作品」會以相對路徑開啟 `../p5-demos/` 與 `../shader-demos/` 的原始頁面，請在 **repo 根目錄** 啟動伺服器：

```bash
npx serve .
```

或

```bash
python3 -m http.server 8000
```

然後開啟 `http://localhost:3000/showroom/`（serve）或 `http://localhost:8000/showroom/`（Python）。
GitHub Pages 發布整個 repo 時，網址為 `…/artworks/showroom/`。

## 檔案

| 路徑 | 內容 |
| --- | --- |
| `index.html` | 入口、介面標記與 import map |
| `exhibition.json` | **所有展覽文字與作品清單**（標題、論述、廳名、廳介紹、作品說明、藝術家名稱） |
| `js/style.config.js` | **所有空間風格參數**（色盤、霧、光、材質、構圖、後製、動態），見下方說明 |
| `js/plan.js` | 平面圖：房間、門、取景窗、碰撞範圍、作品懸掛位置 |
| `js/world.js` `js/textures.js` | 建築幾何、牆面烘焙遮蔽、光線與長廊明暗 |
| `js/atmosphere.js` `js/materials.js` | 天空、高度霧、遠方地標與光柱、雲與浮塵；沙地 shader 與單色牆面 |
| `js/post.js` | 後製（bloom、色調映射、暈影），以遮罩保證作品像素不被改動 |
| `js/artworks.js` | 畫框／燈箱、影片延遲載入與播放、以作品色彩驅動的面光源 |
| `js/navigation.js` `js/app.js` | 鏡頭移動、碰撞、點擊移動／自由行走、作品推近 |
| `js/ui.js` | 說明卡、導覽圖、作品列表、全螢幕作品檢視 |
| `media/` | 每件作品的循環短片（`.webm` VP9、`.mp4` H.264 備援）與海報圖（`.webp`） |
| `vendor/three/` | three.js r186（0.186.1）與所需 addons，附 MIT 授權 |

## 修改展覽內容

- 文字：直接編輯 `exhibition.json`。藝術家名稱目前為佔位文字「（藝術家名稱）」，修改 `artist` 欄位即可同步到大廳、牆面標籤、說明卡與作品列表。
- 作品順序：調整 `works` 陣列的順序；同一廳內的懸掛位置由 `js/plan.js` 的 `hang()` 依順序自動計算。`finale: true` 的作品陳列在暗房最深處。
- 替換作品短片：以相同檔名放入 `media/<id>.webm`、`media/<id>.mp4`、`media/<id>.webp`。p5 作品的畫面比例寫在 `aspect` 欄位。

## 操作

- 點擊移動（預設）：點擊地面滑行、拖曳環顧、點擊作品推近。
- 自由行走：WASD／方向鍵行走（Shift 加速），Q／E 或 ←／→ 轉向；桌機點擊畫面後以滑鼠環顧（Esc 釋放）；手機以左下搖桿行走。
- 鍵盤：Tab 依序到達角落工具與說明卡；M 開啟導覽圖，L 開啟作品列表；檢視作品時 ←／→ 切換上一件／下一件；Esc 返回。
- 網址參數 `?quality=low|medium|high` 可強制品質等級。

## 風格參數（`js/style.config.js`）

空間採用「大氣極簡主義」：遼闊、柔和、高明度、低對比。所有參數集中在這一個檔案，改完重新整理即可。**作品本身（影片畫面）永遠不受這些參數影響。**

| 區塊 | 主要參數 | 作用 |
| --- | --- | --- |
| `palette` | `groundLight` `groundDeep` `skyTop` `skyHorizon` `highlight` `accent` | 4 主色＋強調色。強調色只用在遠方地標的底座 |
| `sky` | `horizonSoftness` `gradientPower` | 天頂→地平線漸層的柔和度 |
| `fog` | `density` `heightBoost` `heightFalloff` `darkColor` | 指數霧濃度、貼地高度霧的強度與厚度；`darkColor` 讓暗房保持全黑 |
| `light` | `sunColor` `sunIntensity` `sunElevation` `sunAzimuth` `shadowRadius` `shadowIntensity` `hemiSky` `hemiGround` `hemiIntensity` `envIntensity` | 一盞暖色主光（方向、強度、極柔陰影）與天空／地面半球光 |
| `landmark` | `x` `z` `width` `height` `depth` `color` `baseWidth` `baseHeight` `baseDepth` `fogAmount` `baseFogAmount` | 遠方石碑與紅色底座；`fogAmount` 越低越能穿透霧 |
| `pillar` | `radius` `haloRadius` `height` `coreOpacity` `haloOpacity` `hdr` `fadeIn` | 垂直光柱的核心、外暈、亮度（`hdr` 決定進入 bloom 的程度） |
| `ground` | `albedoSaturation` `albedoBrightness` `roughness` `driftScale` `reliefScale` `reliefStrength` `sparkle*` `foregroundShade` `foregroundRange` | 沙地顏色、緩慢色彩漂移、表面起伏、視角閃爍亮點、近景明度（前中遠分層） |
| `walls` | `color` `albedoSaturation` `albedoBrightness` `aoStrength` | 單色牆面；亮度決定牆在中景的明度層 |
| `camera` | `restPitch` | 預設微仰角，讓地平線落在畫面低處 |
| `bloom` | `strength` `radius` `threshold` `smoothWidth` | 柔和 bloom：高門檻、低強度 |
| `vignette` | `strength` `darkStrength` `softness` | 暈影（只作用在空間，不覆蓋作品） |
| `motion` | `cloud*` `dust*` `pillarPulse` `pillarPeriod` | 高空雲層、浮塵、光柱呼吸；所有週期都大於 4 秒，減少動態時靜止 |
| `daylight` | `exposure` `darkExposureBoost` | 白晝→暗房的曝光變化 |

建築本身（牆高、取景窗位置）在 `js/plan.js` 的 `ROOMS` 與 `WINDOWS`。
