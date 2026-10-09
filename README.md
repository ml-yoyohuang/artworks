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
| [`p5-demos2/`](p5-demos2/p5-demo-list.html) | 規則之後 — p5.js 生成作品集（第二輯） | Claude |
| [`magazine2/`](magazine2/index.html) | 間物 BETWEEN MATTER — 介紹 `shader-demos2` 與 `p5-demos2` 作品的雜誌頁 | 排版：Codex |

## 觀看方式

作品頁與雜誌頁都是獨立的 HTML，可直接以瀏覽器開啟（`file://`）。

`showroom/` 使用 ES module，需要透過靜態伺服器開啟，並請在 repo 根目錄啟動，展間才能以相對路徑連到作品頁：

```bash
python3 -m http.server 8000
```

然後開啟 `http://localhost:8000/showroom/`。詳見 [`showroom/README.md`](showroom/README.md)。

## 製作報告

各資料夾內的 `REPORT.md` 記錄作品清單、創作自述與驗證過程。
