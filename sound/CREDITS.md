# 聲音・波形・節奏 / 製作與來源

展覽名稱：**小小聲音遊樂場 / Soft Scores**。16 件作品的圖形、互動與繁體中文策展文字為本專案製作；全系列以瀏覽器即時合成演奏六首古典樂譜，沒有外部圖片、錄音或取樣音源。

<a id="canon"></a>

## 卡農樂譜

- 作曲：**Johann Pachelbel（帕海貝爾）**，*Canon per 3 Violini e Basso*；原作已進入公共領域。
- 數位排譜：**Michael Fischer v. Mollard**，版本 **Mutopia-2015/09/02-2047**。
- 來源：[Mutopia Project 樂譜頁](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047)、[MIDI 樂譜資料](https://www.mutopiaproject.org/ftp/PachelbelJ/Canon_per_3_Violini_e_Basso/Canon_per_3_Violini_e_Basso-mids.zip)、[LilyPond 排譜原始檔](https://www.mutopiaproject.org/ftp/PachelbelJ/Canon_per_3_Violini_e_Basso/Canon_per_3_Violini_e_Basso-lys.zip)。
- 排譜授權：[Creative Commons Attribution 4.0 International（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/)。
- 本專案改編：將完整 MIDI 樂譜轉為內嵌音高／起音／時值事件，以正弦、三角、方波或鋸齒合成器代替弦樂；可調速度、互動八度與短音包絡，節奏作品另加輕量合成鼓點。保留原樂譜的音高、節奏、四聲部與進場關係；這是互動合成演奏，不是原版錄音。

完整樂譜含三個旋律聲部與反覆低音，共 **1,956 個音符事件**；循環長度為 **57 小節 / 228 個四分音符拍**（含結尾休止）。`score/canon-original.mid` 僅是可重製的樂譜資料；`score/canon.json` 由 `tools/import-canon.py` 產生，再由製作工具內嵌到每個 HTML。播放時不讀取 MIDI、JSON 或音檔。

<a id="turkish"></a>

## 土耳其進行曲

- 作曲：Wolfgang Amadeus Mozart，KV 331 第三樂章 *Rondo alla Turca*。
- 排譜：Rune Zedeler、Chris Sawer；**Mutopia-2015/08/13-108**，來源標示 Public Domain。
- [Mutopia 樂譜頁](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=108)、[MIDI 樂譜](https://www.mutopiaproject.org/ftp/MozartWA/KV331/KV331_3_RondoAllaTurca/KV331_3_RondoAllaTurca.mid)。
- 保留完整左右手 1,614 個音符事件；合成改編採四分音符 126 BPM，短包絡取代鋼琴延音。原始 MIDI 在 `score/turkish-original.mid`。

<a id="hungarian"></a>

## 匈牙利舞曲第 5 號

- 作曲：Johannes Brahms。資料集中的編排名稱：*Hungarian Dances No.5 YG*。
- 來源：[PDMX 官方資料集 v1](https://zenodo.org/records/15571083)、[PDMX 專案](https://github.com/pnlong/PDMX)。排譜授權為 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，`license_conflict=False`，屬 `no_license_conflict` 子集。
- 資料 ID：`QmbJa5HqbaFuEtEwdk1os8vzKmJnx1APtawGNE15ZWbfnj`。原始 MIDI 在 `score/hungarian-original.mid`；保留全曲時間軸，選取旋律、鋼琴和弦與低音三軌，共 1,332 個音符事件，省略同音重複配器。
- 保留來源 69／126／160 BPM 的段落速度變化；介面倍率乘在這些原速上，不會將全曲壓成固定速度。

<a id="cancan"></a>

## 天堂與地獄序曲・康康舞段（選段）

- 作曲：Jacques Offenbach，*Orphée aux enfers*。
- 來源同為 PDMX v1，排譜名稱 *Can can*，ID `QmbZXPGEUdTSXBqe53jb8yeT8TnKAJSUp5NCSAc8czDZUm`，授權 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，`license_conflict=False`，屬 `no_license_conflict` 子集。
- 110 個長笛旋律音符、31 個 2/4 小節；本專案另編 124 個伴奏音，使用 144 BPM。頁面明確標示主題選段，不宣稱演奏完整序曲。原始 MIDI 在 `score/cancan-original.mid`。
- 兩筆 PDMX 來源記錄在 `score/pdmx-sources.json`。資料集研究：[Long et al., PDMX](https://arxiv.org/abs/2409.10831)。

<a id="bolero"></a>

## 波萊羅舞曲（主題選段・漸強改編）

- 作曲：Maurice Ravel。
- 排譜：Nicolas Sceaux，[Ravel_Bolero 原始排譜](https://github.com/nsceaux/Ravel_Bolero/tree/e46e0da5b2518ac9c2521308351ce02c30a4b0da)，固定 commit `e46e0da5b2518ac9c2521308351ce02c30a4b0da`；排譜作者以 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) 釋出。
- `score/bolero-source/` 保留 `common.ily`（A、B 主題）、`tambour.ily`（兩小節小鼓固定節奏）與原始 LICENSE。
- 本專案轉錄 A／A／B／B 四次主題，18 小節一段，補休止銜接；添加簡約低音，將原曲漫長的配器漸強濃縮到這個 72 小節循環。共 1,456 個音符／小鼓事件，72 BPM；不是完整管弦樂曲或錄音。

<a id="william"></a>

## 威廉泰爾序曲・終曲快板（選段）

- 作曲：Gioachino Rossini。
- 校對來源：Charles Arthur Rawlings 鋼琴編排，London: W. Paxton and Co., **1899**，Plate W.P.C 1,330。IMSLP 標示 Public Domain。
- [IMSLP 作品與版本頁](https://imslp.org/wiki/Guillaume_Tell_(Rossini,_Gioachino)#For_Piano_.28Rawlings.29)、[來源譜版本 #594963](https://imslp.org/wiki/Special:ReverseLookup/594963)。掃描譜保留在 `score/william-source.pdf`。
- 參照第 4–5 頁快板的奔馳主題，選取並整理為 D 大調 16 小節旋律，另編簡約伴奏，共 163 個音符事件。144 BPM；保留奔馳的附點／十六分音符語彙，省略原鋼琴版的和弦加倍與部分連線，結尾整理為可循環樂句，不宣稱原譜逐音完整再現。

## 可重製的改編資料

`tools/build-scores.py` 與 `tools/score_import.py` 將上述樂譜編成 `score/library.json`；`tools/build.py` 再將整個六曲庫內嵌到每件作品。瀏覽器不讀取這些來源檔。以上新增伴奏、速度、音色、漸強與選段整理均為本專案的合成改編；來源樂譜與改編範圍分開標示。

## 聲音引擎

Tone.js **15.0.4** 提供 Web Audio 樂器、節拍時鐘、音量控制及繪圖排程。預設安靜，按下「開始聆聽」才啟用聲音。

- [Tone.js 專案與 MIT 授權](https://github.com/Tonejs/Tone.js)
- [鎖定版本的 CDN](https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js)
- [PolySynth 15.0.4 官方文件](https://tonejs.github.io/docs/15.0.4/classes/PolySynth.html)

沒有使用外部音樂錄音；沒有需補下載的曲目、音樂版或音檔下載按鈕，不需要 `/sound/audio/` 或 `MUSIC_TODO.md`。

## 字體與畫面

- Latin：**DM Sans**，Fontsource **5.2.6** 的固定版本 WOFF2。DM Sans 採 [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)；[字體檔](https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.2.6/files/dm-sans-latin-400-normal.woff2)。
- 繁體中文標題：平台的宋體字族（Songti TC / Noto Serif CJK TC / PMingLiU）；內文：PingFang TC / Microsoft JhengHei。沒有另行散布系統字體檔。字體 CDN 失效時仍可使用平台替代字體。
- 所有畫面均由原生 Canvas 2D 程式繪製；目錄 WebP 縮圖擷取自本系列的實際畫面。

作品 HTML 的 CSS 與 JavaScript 全部內嵌。唯一外部程式函式庫為上述鎖定版本的 Tone.js。

## 直接奏音的互動改編

泡泡音階、鋸齒山丘、波形塗鴉、彈簧舞者使用獨立的即時合成樂器；操作不再移動古典伴奏的八度。伴奏預設音量 45%，可獨立降至 0%。參與音階取八個音：卡農／威廉泰爾採 D 大調，匈牙利舞曲採 G 自然小調，其餘採 C 大調白鍵音階。這是供觀眾試奏的簡化安排，並非逐和弦配音或原曲所有轉調的分析；原曲樂譜與上述來源署名保留。

第二輪將相同的獨立聲音與伴奏控制延伸至踢踏地板、跳房子、合唱的花與節拍器派對。踢踏地板的低鼓、小鼓、沙鈴以 MembraneSynth／白噪音／粉紅噪音即時合成；其餘使用上述參與音階。花朵的八拍獨唱與節拍器重新散開只調整畫面表演，保留原曲音符及播放進度。

第三輪延伸至輪唱漣漪、交通號誌、緞帶體操與爆米花節奏。前三件以參與音階即時奏音；爆米花以 NoiseSynth 的短粉紅噪音合成「啪」聲，力度隨按壓蓄力增加。沒有增加外部錄音、音樂曲目或授權來源；聲源位置、燈光編排、緞帶翻圈與粒子蓄力均不改寫原曲音符。

第四輪延伸至彩虹鞦韆、方波積木、節拍糖果與果凍波，全系列現皆有獨立參與聲音及伴奏音量控制。鞦韆風力、積木樓高、糖果落點與果凍位置以參與音階奏音，古典伴奏不因手勢轉調。四種屋形只改建築外觀；清盤、送風與抓取亦不改寫樂譜。沒有新增外部音檔或授權來源。

文案核對補充：花朵的八拍目前是視覺聚焦，點下只奏一次固定參與單音；沒有將古典樂譜切成五位花朵的聲音獨唱。緞帶翻圈附加單音、積木放開奏一次，也沒有改寫或重播古典樂譜；各頁 material 已明確標示這些範圍。

## 六件音樂互動擴充（2026-10-10）

花朵的八拍短句、緞帶四音琶音、房子三音與休止、彈簧八度尾音皆是本系列以參與音階生成的原創互動編排，不是新增錄音或原曲原譜的聲部抽取。古典樂譜的來源、完整／選段標示保持原樣。花朵獨唱暫時降低整段古典伴奏；房子可切只聽房子。爆米花仍為即時合成粉紅噪音，果凍表情為程式繪製；沒有新增外部音檔、素材或音樂授權來源。
