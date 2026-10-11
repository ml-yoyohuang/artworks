# 聲音作品路徑遷移

日期：2026-10-12（Asia/Taipei）。本次修改將提交至 `main`，由 GitHub Pages 的 main 根目錄發布；部署結果以 GitHub Pages 工作流程與正式網址驗證為準。

| 原路徑 | 新路徑 | 正式作品數 |
| --- | --- | --- |
| `/sound1/`（原始資料夾為 `/sound/`） | `/rhythm/vol1/` | 16 |
| `/sound2/` | `/rhythm/vol2/` | 10 |
| `/sound3/` | `/sound/test1/` | 8 |
| `/sound4/` | `/sound/test2/` | 8 |

整組搬移 HTML、原始碼、樣式、圖片、音檔、樂譜、說明、工具及驗收資料。四組作品內部相對資源路徑維持原結構；跨展覽連結、canonical／Open Graph／Twitter 網址、測試預設網址、文件與共用樂譜來源改用新路徑。第一組 QA 伺服器的根目錄也已修正為 repository 根目錄。

根目錄 README 列出完整四組作品。兩份 reusable ZIP 已同步包入更新後的說明與檔案。`visualizer` 的原作讀取工具使用新資料夾；其 `sources/sound*`、`adapters/sound*.js`、預設 ID，以及作品原有 SOUND 品牌與 JavaScript API 名稱仍是內部識別，不是展覽網址。

舊 REPORT、QA_REPORT 及 JSON 紀錄中的檔案／網址已對照新路徑更新，測試日期與結果仍屬當時紀錄，不能當作新網址已部署的證據。`visualizer/_qa/original-hashes.json` 僅更新索引路徑，雜湊仍保留當時原始內容；本次刻意更新的文件與網址會被原作雜湊檢查列為差異。

本次驗證：

- Chromium 開啟四組作品與 visualizer 共 48 個入口頁，頁面錯誤與本機資源／連結 HTTP 錯誤皆為零。
- 掃描 HTML、Markdown、CSS 與模組參照；2,466 個既有參照沒有新增失效連結。
- 四組頁面產生器、古典樂譜匯入工具、visualizer prepare／adapt 共七個工具在獨立暫存副本執行成功，輸出入口使用新網址。
- 跨展覽樂譜測試通過：8 首曲目、3,580 次音符核對、27 處修正。
- Git 差異空白檢查通過。

本機預覽：在 repository 根目錄執行 `python3 -m http.server 8000`，再開啟上述新路徑。GitHub Pages 的網址前綴為 `https://ml-yoyohuang.github.io/artworks/`；推送部署後才會反映此次搬移。舊展覽路徑沒有新增轉址頁。
