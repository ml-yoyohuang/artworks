# 從白晝走進暗房 — 線上 3D 展間

一間以 three.js 建造的線上美術館：入口大廳 → 第一廳「規則的花園」（p5.js 作品）→ 光線逐步退去的長廊 → 第二廳「暗房」（GLSL 作品）→ 終點作品。

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
| `js/plan.js` | 平面圖：房間、門、碰撞範圍、作品懸掛位置 |
| `js/world.js` `js/textures.js` | 建築幾何、程序生成材質、光線與長廊明暗 |
| `js/artworks.js` | 畫框／燈箱、影片延遲載入與播放、以作品色彩驅動的面光源 |
| `js/navigation.js` `js/app.js` | 鏡頭移動、碰撞、點擊移動／自由行走、作品推近 |
| `js/ui.js` | 說明卡、導覽圖、作品列表、全螢幕作品檢視 |
| `media/` | 每件作品的循環短片（`.webm` VP9、`.mp4` H.264 備援）與海報圖（`.webp`） |
| `vendor/three/` | three.js r186（0.186.1），附 MIT 授權 |

## 修改展覽內容

- 文字：直接編輯 `exhibition.json`。藝術家名稱目前為佔位文字「（藝術家名稱）」，修改 `artist` 欄位即可同步到大廳、牆面標籤、說明卡與作品列表。
- 作品順序：調整 `works` 陣列的順序；同一廳內的懸掛位置由 `js/plan.js` 的 `hang()` 依順序自動計算。`finale: true` 的作品陳列在暗房最深處。
- 替換作品短片：以相同檔名放入 `media/<id>.webm`、`media/<id>.mp4`、`media/<id>.webp`。p5 作品的畫面比例寫在 `aspect` 欄位。

## 操作

- 點擊移動（預設）：點擊地面滑行、拖曳環顧、點擊作品推近。
- 自由行走：WASD／方向鍵行走（Shift 加速），Q／E 或 ←／→ 轉向；桌機點擊畫面後以滑鼠環顧（Esc 釋放）；手機以左下搖桿行走。
- 鍵盤：Tab 依序到達角落工具與說明卡；M 開啟導覽圖，L 開啟作品列表；檢視作品時 ←／→ 切換上一件／下一件；Esc 返回。
- 網址參數 `?quality=low|medium|high` 可強制品質等級。
