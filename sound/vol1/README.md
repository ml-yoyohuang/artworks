# SOUND / VOL. 1 — 聲音選集

從同一套八個主題的 `../test1/`（以前的 sound3）與 `../test2/`（以前的 sound4）擇一收錄。

`selections.json` 是選擇的正式紀錄：每個主題的 `source` 為 `test1`、`test2` 或 `null`（待選）。`SELECTIONS.md` 是生成的可讀紀錄。尚未選擇的主題只有待選頁面，沒有預設收錄版本。

本輯已選定全部八件。01 使用 `source: test1`、`variant: hybrid`、`audio_source: test2`：保留 test1 的 Canvas 建築與互動；自動展演移植 test2「中殿」的完整八和弦、聲部進場、低音、FM 鐘音與卷積殘響，每 8 秒换和弦、64 秒循環。建築跟隨同一份事件與 AudioContext 時鐘；低音以提高一個八度的造形映射保留 test1 的建築比例。調音支點與通道互動維持 test1 的操作；手動聲部取自目前和弦。古典選曲仍保留原本的 32 秒主題改編。

混合版修改存於 `hybrid.py` 與 `hybrid/`，每次生成會套用至獨立的 `assets/hybrid1/`，不影響收錄自 test1 的 03、06，也不修改來源資料夾。

首頁採雜誌式編排：開篇作品、兩組主題章節、策展短語與聆聽引言。首頁不呈現來源或比較資訊；選擇仍保存在 `selections.json` 與 `SELECTIONS.md`。修改首頁使用 `templates/index.html`、`magazine.py` 與 `assets/css/volume.css`，再執行生成器，避免重新生成時覆蓋設計。

八頁作品共用 `work_pages.py` 的版型與 `assets/css/work.css`，並引用首頁的 `volume.css` 字體與配色。保留各原作的画布、控制元素、程式入口與音訊；統一作品標題、展演尺寸、播放／創作區、可展開說明及頁尾導覽。已檢查八頁 1440、390、320 px 版面、說明展開、手機播放／靜音／暫停，並重新通過混合版驗證。

更新選擇後，在 repository 根目錄執行：

```sh
python3 sound/vol1/build.py
```

生成器只寫入 `sound/vol1/`；來源檔案僅供讀取。選中的作品 HTML 與依賴素材會複製到本輯，素材依來源隔離於 `assets/test1/` 或 `assets/test2/`，保留各版本的程式、互動、聲音與授權。作品頁的目錄與上一件／下一件都留在 vol1，原作者署名保留。

`source-integrity.json` 保存初次整理時兩個來源資料夾的全部檔案 SHA-256。生成前後都會比對來源；若來源後續另有更新，生成器會停止，需先確認來源變動。

以 HTTP 開啟作品（ES modules 不使用 file://）：

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

瀏覽 `http://127.0.0.1:8766/sound/vol1/`。目錄中的比較連結會開啟原作；正式收錄作品本身使用本輯內的複製素材。

## 驗證

已在 Chromium 驗證八件作品的載入、播放與資源路徑。混合版另檢查實際第 8 秒的和弦變換、暫停、重播、指定和弦、手動／自動切換、古典選曲、靜音與手機版面。64 秒循環以固定步長模型驗證；不是實際等待完整 64 秒的播放驗證。

混合版的 40 個持續音及 32 個鐘音，包含時點、音高、時值、力度與音色參數，已直接對照 test2 原始排程器，全部一致。結果見 `_qa/verification.json`，桌面／手機畫面見 `_qa/01-hybrid-desktop.png`、`_qa/01-hybrid-mobile.png`。

啟動本機 HTTP 後可重新檢查（需 Playwright 與 Chromium）：

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node sound/vol1/verify.cjs
```
