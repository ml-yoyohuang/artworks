# main 整合紀錄

日期：2026-10-12（Asia/Taipei）。

`codex/mp3-visualizer` 原為 MP3 播放器的功能分支。本次以保留歷史的 merge 合併到 main，合併提交 `883877a` 包含八主題擇一收錄提交 `2831b19`、持續生長化石與節奏速度調整，以及原有播放器全部檔案。

- visualizer：171 個追蹤檔案，34 個效果，其中八個主題各保留一版。選擇見 `visualizer/SELECTIONS.md`。
- sound/vol1：原本未追蹤的 137 個檔案全部保存於提交 `2b4da6c`，包含 HTML、素材、選擇紀錄、生成器、混合版與驗收資料。
- test1/test2：298 個原始檔案與本次整合前的 SHA-256 相同；沒有新增修改或刪除。
- `_incoming-assets/` 私人測試 MP3 維持本機檔案，不納入 Git。visualizer 產生的截圖與訊號音檔仍依既有 ignore 規則留在本機。

驗證：合併無衝突；main 的 visualizer 與已验收選集提交逐檔一致；137 個 vol1 檔案完整納入；34 個播放器效果、選集清單、舊連結、輪播、手機版及 WebGL 替代通過。vol1 八件作品的載入、播放、混合版和弦時鐘、64 秒循環模型、控制、古典選曲、靜音與手機版通過。重新驗收的畫面及 JSON 更新於 vol1/_qa。

main 推送確認成功後，移除本機與遠端的功能分支。GitHub Pages 設定為 main 根目錄發布。
