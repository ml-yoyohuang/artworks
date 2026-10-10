# 音樂與第三方資源署名

## 1. 原創生成配樂（每件作品的預設音源）

十件作品的預設聲音全部是本展的原創樂譜程式，在瀏覽器裡以 Tone.js 即時合成。每件作品有自己的調性、和聲進行、節奏規則與休止，與畫面共用同一份事件資料（見 README「音畫核心」）。沒有使用任何取樣音檔。

- 合成函式庫：Tone.js 15.0.4，MIT License，© Yotam Mann。檔案：`assets/js/vendor/tone-15.0.4.min.js`（npm 套件 `tone@15.0.4` 的 `build/Tone.js`，只移除了指向不存在檔案的 `sourceMappingURL` 註解）。授權全文：`assets/js/vendor/TONE_LICENSE.md`。

## 2. 外部曲目（可選音源，原樣播放）

兩首曲目放在每件作品的「關於 → 音源」裡，可以切換。播放速率固定為 1，沒有剪輯、變調或重新編曲；畫面依瀏覽器端估測的節拍格線運動，聲音輸出只經過一般的音量增益與限制器。

| 曲名 | 作者 | 曲目頁 | 直接下載來源 | 授權 | 下載日期 | 專案檔名 | 使用頁面 |
|---|---|---|---|---|---|---|---|
| Carefree | Kevin MacLeod (incompetech.com) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3 | Creative Commons: By Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/ | 2026-10-10 | `assets/audio/carefree-kevin-macleod.mp3` | 01–10 全部作品頁（可選音源） |
| Electrodoodle | Kevin MacLeod (incompetech.com) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200079 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Electrodoodle.mp3 | Creative Commons: By Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/ | 2026-10-10 | `assets/audio/electrodoodle-kevin-macleod.mp3` | 01–10 全部作品頁（可選音源） |

依作者 FAQ（https://incompetech.com/music/royalty-free/faq.html ，2026-10-10 查閱）要求的署名格式：

```
Carefree Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/

Electrodoodle Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

每個作品頁的「關於」面板都以這個格式列出兩首曲目與授權連結；目錄頁頁尾也有署名說明。

### 檔案驗證

| 檔案 | 位元組 | SHA-256 | 實測格式 |
|---|---|---|---|
| carefree-kevin-macleod.mp3 | 6,566,713 | 8433b770a630d9b1594fd484442c677907ece899a4d149954cd2e74fd733e311 | MPEG layer III, 256 kbps, 44.1 kHz stereo, 205.1 s（`file`、`afinfo`；Chromium `decodeAudioData` 解碼成功） |
| electrodoodle-kevin-macleod.mp3 | 5,005,207 | 75227ad153780ee0c57ae529caa7f8a891877a46596ff8800a16c90b34b6d18c | MPEG layer III, 320 kbps, 44.1 kHz stereo, 166.1 s（同上） |

### 節拍資料（實際核對，非憑空填寫）

| 曲目 | 目錄 BPM（incompetech `pieces.json` 的 `bpm` 欄位） | 瀏覽器端估測 BPM | 估測第一拍位置 |
|---|---|---|---|
| Carefree | 96 | 97.0 | 0.029 s |
| Electrodoodle | 120 | 119.7 | 0.403 s |

畫面使用目錄 BPM，第一拍位置使用估測值。估測方法是逐幀能量上升（全頻＋低頻）的自相關與梳狀相位搜尋，只是節拍格線的估計，不理解曲子的樂句或和聲；樂句型的畫面事件（例如第 05 件的成結、第 09 件的綻放）在外部曲目模式下仍依作品自己的 16 拍樂句計數，不一定落在原曲的段落交界。因此外部曲目是額外的欣賞模式，作品的品質基準是原創樂譜模式。

## 3. 本地音檔（使用者自選）

「關於 → 音源 → 本地音檔…」可以選擇自己電腦裡的音檔。檔案只在瀏覽器內解碼與分析、原樣播放，不會上傳到任何服務，也不會被保存。

## 4. 字體與圖像

沒有載入外部字體；介面使用系統字體（宋體／Songti TC、Noto Serif TC 等，及系統無襯線字）。目錄預覽圖全部是作品本身的即時畫面截取，沒有使用外部圖片。
