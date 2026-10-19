# ORBIT — Play Mode（Phase 01.5）

**狀態：功能已實作，程式檢查通過；瀏覽器與兩輪視覺驗收待執行，尚未完成全部交付條件。**

本次从乾淨、已包含 Phase 02 的 `main`（`2a0564e`）建立 `feature/play-mode`。沒有複製 Phase 01、建立獨立網站、改動部署設定或合併 main。高對比配色依需求移除；原有全螢幕、10×／20×、手動／自動、復原／重做、匯出及 Studio 保留。

## 1. 功能摘要

- Classic 紙面上方「切換為簡易模式」進入 Play；返回「經典模式」保留 Classic 的作品與設定。
- Play 自備紙張、有效齒輪、筆孔與墨色；直接拖曳紙面畫圈，不需要選參數。可正轉、反轉、停止、接續，並提供鍵盤左右鍵與「幫我轉」。
- 真正幾何閉合後提示 1.2 秒，再準備新組合；不自動畫下一朵。手動「換一組」保留半成品。
- 六種紙色依序更換；「找回上一張紙」可交換當前與上一張。換紙轉場只是呈現，不決定資料是否保存。
- 「留下這張畫」沿用 PNG 匯出器，輸出 3200 × 3200，保留當前紙色與所有筆跡、不包含工具。

## 2. Rhythm 配色研究

實際讀取 `rhythm/vol1/tools/style.css`、`rhythm/vol2/assets/css/sound2.css`、`rhythm/vol2/assets/js/works/01-wave-relay.js`；並檢視既有截圖 `rhythm/vol1/_qa/round4-desktop-square-blocks.png`。

Vol.1 的 `#f6f1e7` 暖紙白與 `#303d36` 深灰綠構成基底，珊瑚 `#d96950` 是主要強調色；小幅芥黃 `#dfb344`、鼠尾草 `#64876d`、霧藍 `#6795a4`、紫 `#8a85af` 提供節奏。Vol.2 的紙色更偏灰、朱紅更集中；Wave Relay 使用深藍、金黃、森林綠、梅紫。不是所有元素同時高飽和，而是大面積暖中性色配有限、有明度層次的色塊。

版式繼承大留白、纖細分隔線、編號／等寬小標、襯線展示字與清晰無襯線操作。Play 延用 ORBIT 隨附的 Instrument Serif／DM Sans／IBM Plex Mono，沒有新增遠端字體。齒輪保留透明壓克力材質，背景裝飾限制在左側的小色票。

## 3. Design Tokens

介面 tokens 集中在 `src/play/play.css` 的 `.play-mode`，不改 Classic 的 root 變數。紙墨與齒輪材質集中在 `src/play/palette.ts`。

| 角色 | 色彩／值 |
| --- | --- |
| 桌面／文字／輔助文字 | `#ece8dc` / `#303d36` / `#62695e` |
| 珊瑚／芥黃／鼠尾草／霧藍／紫 | `#b84936` / `#dfb344` / `#64876d` / `#6795a4` / `#8a85af` |
| 奶油白／檸檬黃／蜜桃粉 | `#f8f1df` / `#efe4ae` / `#f1d7c9` |
| 薄荷綠／晴空藍／薰衣紫 | `#dce7ce` / `#dae6eb` / `#e7dded` |
| 焦點 | `#305c78`，2px 外框 |
| 短轉場／換紙 | 180ms / 420ms；reduced-motion 停用裝飾動態 |

八種墨色使用較深的珊瑚、藍、綠、梅紫、赭黃、靛紫、莓紅、藍綠。每紙具 preferred 與 secondary 名單；不在名單或對比低於 4:1 的墨色不進候選池。曲線寬 1.15 世界單位，比 Classic 的預設更適合辨識。數值對比已測試；細線在實際手機螢幕上的辨識度仍需視覺驗收。

## 4. Randomization Engine

`random.ts` 提取既有 Studio 的 Mulberry32；Studio 以 re-export 保持原路徑相容。Play 以 seed、sequence、paper、最近四組選擇重現下一組。

候選來自原有三種齒圈、六種齒輪與實際筆孔；齒輪比例限制 .25–.65，筆孔排除最內圈 .2，閉合最多八次公轉。權重降低近期相同比例、花瓣結構與筆孔的機率；墨色避開最近兩筆，優先配對取得雙倍抽樣權重。不是挑選幾張預製圖；每筆由共同幾何即時計算。

1,200 次確定性抽樣測試涵蓋重現性、多樣性、重複控制与紙墨相容。所有候選均以實際閉合端點驗證，曲線不超出紙面。

## 5. 完成與接續

共用 `Atelier.advance`、`closure`、`sampleSegment`。閉合週期是 `2π × gear / gcd(ring, gear)`；反轉保留轉折點。只有到達正向或反向完整週期才完成，不以時間或單圈替代。

完成時停止 rAF、釋放 pointer capture、保存筆跡、顯示提示，再等待 1.2 秒準備下一組。下一组為 ready，不啟動自動繪製。手動換組、換紙、離開、失焦皆取消待處理計時器。自動旋轉使用 2.4 rad/s；候選的正向完整週期約 2.6–21 秒，反覆反轉可能延長使用者的完成時間。

## 6. Paper System

只保留當前與上一張的向量快照，IndexedDB `orbit.play` / `papers` / `session`。寫入依序排隊，避免舊狀態覆蓋新紙；不累積高解析 Bitmap。換紙當下先在記憶體保留原 snapshot；IDB 不可用、逾時、quota 或資料格式錯誤時，當次遊玩仍可復原並顯示限制。

快照為 `{schemaVersion:1, strokes, play:{...}}`；每筆仍是既有 `Stroke version:1`，另保存紙色角色、工具、進度、activeId、seed、sequence 與近期選擇。Studio 現有 v1 parser 可讀 strokes；Play metadata 是附加資料，不改動筆跡格式。

保存上限為當前／上一張合計 4MB、每張最多 500 筆，每筆最多 20,000 個轉折點。超限不刪畫作，改為本次記憶體保存並提示。換紙動畫短暫複製兩層可見 Canvas 供移出效果，結束或取消即移除，不写入儲存。

## 7. Mode State Management

Classic 與 Play 擁有獨立 `Atelier` instance，共用類別、幾何、Canvas Renderer、Gear Renderer、Stroke schema 與 Export。Studio 仍然 lazy load。Play UI 與狀態位於 `src/play/`。

狀態包含 ready、drawing、completed、transitioning、changingPaper、paused；只維護一個 rAF 與一個轉場 timer。切換模式先停止 Classic，離開其全螢幕，清除拖曳；回來還原 scroll 與入口焦點。Play 離開時停止並保存，重新進入不啟動隱藏動畫。

## 8. Mobile Interaction

滿版固定工作桌與 `100dvh`，紙面 `touch-action:none`、pointer capture、取消與 lost capture 處理；操作區 `user-select:none`。紙面中心附近的角度不穩定區不畫線。resize 時中斷正在拖曳的手勢，使用共同世界座標重畫。直向將主要控制放紙下，橫向短視窗將控制放右側；按鈕至少 44px。reduced-motion 仍保留繪圖與狀態提示。

## 9. 驗證狀態

| 檢查 | 結果 |
| --- | --- |
| 單元測試 | 31/31 通過，含 8 項新增 Play 測試及既有 Classic／Studio 測試 |
| TypeScript strict | 通過 |
| ESLint src/tests | 通過 |
| Vite production build | 通過，41 modules |
| Play chunk | 15.27kB JS / gzip 6.07kB；9.69kB CSS / gzip 2.97kB |
| 瀏覽器功能與回歸 | **未執行成功**；新增 10 項 Play 案例、更新移除高對比的回歸預期，待執行 |
| 正式子路徑驗收 | **待執行**；腳本已加入 Play 操作檢查 |

本機瀏覽器執行的自動權限審查兩次逾時；in-app 預覽檢視回報審查模型容量不足。這是審查服務未完成，不是測試 assertion failure。沒有繞過審查，也沒有把未執行的檢查算為通過。

## 10. 視覺審查

**尚未完成要求的兩輪實際 Play 畫面審查。** 已實際檢視 rhythm 既有參考截圖，但不能把它當成 Play 驗收。已備妥 `scripts/review-play.ts`：使用 seed 42，透過實際 UI 自動旋轉，擷取 Classic、桌面 Play、繪圖中、完成提示、換組、四色疊圖、換紙、新紙、手機 Play／繪圖／疊圖，共 12 張。沒有製造假截圖或自評 9/10。

```sh
ORBIT_QA_DIR=qa/play/classic-regression npm run test:browser
npx tsx scripts/review-play.ts round-1
# 檢視並修改後再擷取 round-2
npm run test:production
```

Windows PowerShell 請改用 `$env:ORBIT_QA_DIR='qa/play/classic-regression'` 設定。瀏覽器 JSON 可透過 `PLAYWRIGHT_JSON_OUTPUT_FILE` 存至 `qa/play/browser-results.json`，避免覆寫前階段紀錄。

## 11. 已知限制

- 瀏覽器整合、Classic UI 回歸及視覺驗收仍待完成，目前不應視為可發布版本。
- IndexedDB 在異常關閉分頁前未完成的非同步寫入可能遺失最後一小段；它不是雲端備份。紙張不保存到無限歷史。
- Play 的紙色與進度 metadata 尚未在 Studio import 中轉換；沿用舊 importer 的 24 筆上限，不宣稱任意大張 Play 可直接帶入 Studio。
- 未實作 Phase 03 圖庫、Secret Flowers、Evolution Garden。未驗證實體手機、Safari、Firefox、螢幕閱讀器或正式 WCAG。
- 齒形沿用既有視覺近似，非製造級齒輪 CAD；細線的最終美感與手機辨識度仍需兩輪截圖檢查。

## 12. Git 交付

功能分支：`feature/play-mode`。提交編號見交付訊息或 `git log -1 feature/play-mode`。main 與遠端網站不變；瀏覽器驗收通過後才適合請使用者確認發布。
