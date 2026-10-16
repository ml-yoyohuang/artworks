# ORBIT — A Spirograph Atelier

齒輪、墨水與幾何的數位文具工作室。Phase 01，獨立於作品集其他頁面的 TypeScript 專案。

## 啟動

建議 Node.js 22.12 以上（本次驗證使用 24.19）與 npm。

```sh
cd orbit
npm ci
npm run dev -- --port 5174
```

開啟 http://127.0.0.1:5174/。正式靜態網站執行 `npm run build`，將 `dist/` 部署至任何靜態主機；相對資源路徑可支援子目錄。原始 TypeScript 頁面需透過開發伺服器開啟。

```sh
npm run typecheck
npm run lint
npm test
npm run test:browser  # 需先啟動 5174 預覽，以及 Playwright Chromium
npm run build
npm run test:production # 以 /artworks/orbit/ 子路徑驗證正式輸出
```

## GitHub Pages

正式網址為 https://ml-yoyohuang.github.io/artworks/orbit/。儲存庫的 Pages 發布來源使用 **GitHub Actions**；根目錄的 `.github/workflows/pages.yml` 在推送 `main` 時先保留原作品集的 Jekyll 建置，再把 ORBIT 的 `dist/` 放入發布成品的 `orbit/`。請勿直接發布 `orbit/index.html` 原始碼：其中的 TypeScript 入口必須先由 Vite 編譯。

部署前會驗證正式輸出在子目錄下的 JavaScript、樣式、字體與繪圖操作。也可用 `ORBIT_CHECK_URL` 指定已部署網址，執行相同檢查。這個流程與私人 Sites 網址分別部署。

## 操作

- 3 種齒圈、6 枚小齒輪、每枚 5 孔、6 色墨水。
- 點開始自動繪製；速度 ½× / 1× / 2× / 4× / 10× / 20×；可暫停、接續、結束這一筆。10× 以上運轉時收起小齒輪與筆尖標記，避免高速旋轉干擾；曲線仍以相同精度完整取樣，暫停時恢復工具顯示。
- 「全螢幕繪圖」固定紙面與控制列、鎖定背景捲動。支援原生全螢幕時一併使用；不支援或被嵌入頁面阻擋時使用滿版替代。離開按鈕或 Escape 可返回原捲動位置。手機橫向時，操作列移至紙面右方。要換齒輪或墨色時先離開全螢幕。
- 「高對比配色」加深文字、界線與螢幕筆跡，保留墨色差異；屬於顯示輔助，PNG／SVG 仍保留原始墨色與線寬。偏好保存在本機，未自行選擇時跟隨系統的提高對比設定。
- 紙面與工具區禁止文字誤選、圖片拖曳及觸控長按選取；介紹文字仍可正常選取。
- 在紙上環繞中心拖曳，直接切換至手動。滑鼠與觸控皆支援，正反向皆可。
- 聚焦紙面後，← / → 轉動；Shift 加大角度。空白鍵播放／暫停。
- 換工具會將未完的上一筆保留，從新工具的起點開始。單純切換手動／自動不重設進度。
- 復原以整筆為單位；未完成的筆跡也可整筆復原與重做，重做恢復原孔位和進度。
- Ctrl / ⌘ Z 復原，Ctrl / ⌘ Shift Z 重做。復原後畫新線會清除重做分支。
- 清紙前有輕量確認；清紙會清除所有歷史。開場藍色蕾絲是可復原、可匯出的真實範例筆跡。
- 「收藏作品」輸出 3200 × 3200 PNG 或真正 SVG 路徑。兩者皆可選紙色／透明背景，包含目前已畫部分，排除齒輪與 UI。

## 結構

```text
src/
  geometry.ts       純幾何、閉合、誤差受限取樣、參數化齒形
  catalog.ts        齒圈、齒輪、筆孔與墨色規格
  state.ts          工具、筆跡、正反向分段、復原與重做
  interaction.ts    觸控按鈕啟用、捲動取消與 click 去重
  view.ts           全螢幕／滿版、捲動鎖定與配色偏好
  contrast.ts       保留作品原色的顯示配色對照
  gears.ts          半透明齒輪與固定齒圈 SVG
  renderer.ts       完成筆跡快取、增量 Canvas、同步齒輪
  export.ts         向量 SVG、離線高解析 PNG
  ui.ts             語意化介面、工具組與對話框
  main.ts           Pointer Events、單一動畫時鐘、介面連接
  style.css         字體、設計變數、材質、響應式與減少動態
  view.css          全螢幕、高對比與操作區防誤選
public/fonts/       本機字體與 SIL OFL 授權
tests/              幾何／狀態測試、瀏覽器整合測試
qa/                 實際瀏覽器截圖與驗證結果
```

## 幾何與繪圖

固定世界座標為 760 × 760，原點在紙中心。同模數 `m=4`，節圓半徑 `R=N×m/2`、`r=n×m/2`。齒輪中心公轉 `t`，本體轉角 `−(R−r)t/r`；筆尖為齒輪中心加上同轉角的孔位向量。齒圈與筆跡均來自這個幾何狀態。

閉合終點 `2πn/gcd(N,n)`；不是轉一圈就結束。取樣使用二階導數上界 `(R−r)+d((R−r)/r)²` 約束線性插值誤差，與螢幕更新率分離；最大誤差 0.018 世界單位，3200px 匯出低於 0.08px。正反向的轉折參數保存在 `stops`，單調區間合併避免逐幀堆資料。

完成筆跡以 Path2D 快取；繪製中的筆跡增量畫到另一層 Canvas。Resize 時以相同幾何重畫，DPR 最高採 3。SVG 齒輪與筆尖每幀由同一個 t 更新；頁面隱藏或失焦會暫停。

參考：[Wolfram MathWorld — Hypotrochoid](https://mathworld.wolfram.com/Hypotrochoid.html)。可見齒形採節圓周圍的對稱齒頂／齒根近似，不是製造用漸開線 CAD。

## 設計與字體

暖白練習紙、灰綠工作桌、朱紅展示字、普魯士藍開場曲線；工具以有尺度差的透明齒輪與筆身呈現。Instrument Serif 用於展示字、DM Sans 用於功能介面、IBM Plex Mono 用於規格標註；中文使用作業系統黑體。三種西文字體皆隨專案提供 SIL Open Font License 1.1，詳見 `public/fonts/*-OFL.txt`。

## 邊界與後續

- 筆跡目前保存在分頁記憶體；重新整理前請匯出。沒有帳號、後端或雲端圖庫。
- 紙面材質僅用於工作桌呈現；含背景匯出採乾淨暖白色，方便印刷。
- 本次驗證為 Chromium 桌面與觸控模擬，尚未以實體 iPhone／Android、Safari、螢幕閱讀器進行完整驗證；不宣稱正式 WCAG 認證。
- Phase 02 優先可加 IndexedDB 作品保存、可重播的 stroke JSON，再擴充外旋輪線與可調齒數。維持 geometry/state/export 的分界。

視覺與測試紀錄見 [REPORT.md](REPORT.md)。
