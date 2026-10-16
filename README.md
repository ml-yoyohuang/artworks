# artworks

以 GLSL shader 與 p5.js 製作的生成藝術作品集，以及介紹這些作品的雜誌頁與線上展間。

作品分為兩輯，每一輯由不同的 AI 創作工具完成；介紹頁面的排版則交由另一個工具製作。

## 第一輯

| 資料夾 | 內容 | 創作工具 |
| --- | --- | --- |
| [`shader-demos/`](shader-demos/shader-demo-list.html) | 光與物質 — Shader Studies（GLSL） | Codex |
| [`p5-demos/`](p5-demos/p5-demo-list.html) | 規則的餘溫 — 生成式研究（p5.js） | Codex |
| [`magazine/`](magazine/index.html) | 對頁 — 介紹 `shader-demos` 與 `p5-demos` 作品的雜誌頁 | 排版：Claude |
| [`showroom/`](showroom/) | 從白晝走進暗房 — 介紹 `shader-demos` 與 `p5-demos` 作品的線上 3D 展間 | 排版：Claude |

## 第二輯

| 資料夾 | 內容 | 創作工具 |
| --- | --- | --- |
| [`shader-demos2/`](shader-demos2/shader-demo-list.html) | 慢物質 Slow Matter — GLSL 研究 | Claude |
| [`p5-demos2/`](p5-demos2/p5-demo-list.html) | 規則之後 — p5.js 生成作品集（第二輯）：十件生長式作品＋八件幾何互動作品「平面的八種禮節」 | Claude |
| [`magazine2/`](magazine2/index.html) | 間物 BETWEEN MATTER — 介紹 `shader-demos2` 與 `p5-demos2` 作品的雜誌頁 | 排版：Codex |

## 聲音

| 資料夾 | 內容 | 創作工具 |
| --- | --- | --- |
| [`rhythm/vol1/`](rhythm/vol1/) | 小小聲音遊樂場 — 十六件聲音、波形與節奏作品 | Codex |
| [`rhythm/vol2/`](rhythm/vol2/) | 接得剛剛好 Caught on the Beat — 十件節奏與波形作品 | Codex |
| [`sound/test1/`](sound/test1/) | 聲音成為物質 — 八件聲音、空間與能量作品（Canvas） | Codex |
| [`sound/test2/`](sound/test2/) | 聲音的居所 SOUND / 4 — 八件聲音、空間與能量的生成藝術作品（Web Audio 原創作曲、three.js／GLSL／Canvas） | Claude |
| [`sound/vol1/`](sound/vol1/) | 聲音選集 — 八個主題擇一收錄，共振建築含混合版 | 整合：Codex |
| [`visualizer/`](visualizer/) | 聲音放映室 — 34 個隨 MP3 律動的視覺預設 | 整合：Codex |

四組作品已搬至上列新路徑；詳細對照與驗證見 [路徑遷移紀錄](PATH_MIGRATION.md)。

## 幾何文具

| 資料夾 | 內容 | 創作工具 |
| --- | --- | --- |
| [`orbit/`](orbit/) | ORBIT — 可手動與自動繪製、疊圖及匯出 PNG／SVG 的數位萬花尺工作室 | Codex |

ORBIT 的啟動與建置方式見 [`orbit/README.md`](orbit/README.md)。

## 觀看方式

作品頁與雜誌頁都是獨立的 HTML，可直接以瀏覽器開啟（`file://`）。

`showroom/` 使用 ES module，需要透過靜態伺服器開啟，並請在 repo 根目錄啟動，展間才能以相對路徑連到作品頁：

```bash
python3 -m http.server 8000
```

然後開啟 `http://localhost:8000/showroom/`。詳見 [`showroom/README.md`](showroom/README.md)。

`sound/vol1/` 與 `visualizer/` 也需要 HTTP。播放器可開啟自己的 MP3；本機 `_incoming-assets/` 測試音檔不包含在 GitHub 版本。選擇紀錄見 [`visualizer/SELECTIONS.md`](visualizer/SELECTIONS.md)。

## 製作報告

各資料夾內的 `REPORT.md` 記錄作品清單、創作自述與驗證過程。
