# SOUND / 3 音源與授權

所有實際使用的預設音源均為此展原創的程式作曲與聲音合成，作者標示為 **SOUND / 3 — Codex for ml-yoyohuang, 2026**。音符、時值、力度、樂句、聲部與素材定義位於 `assets/js/model.js`；振盪器、決定性噪音、濾波與包絡位於 `assets/js/audio.js`。

|作品|原創聲音|來源／檔案|處理|
|---|---|---|---|
|共振建築|四種和弦的長音、短鐘音|`model.js` score 0；organ / bell|即時合成；沒有外部錄音|
|和弦織機|低音、纖維旋律、短噪音節點三聲部|score 1；bass / fiber / drum|各聲部明確可追蹤；不是混音分離|
|休止符|不同力度的含短／長休止和弦|score 2；dark|休止由樂譜定義，不把靜音當休止|
|聲音化石|礦物鐘音、長低音與重複樂句|score 3；mineral / bass|固定 seed 決定材料與力度|
|相位潮汐|左右兩套近似循環柔和音型|score 4；tideA / tideB|同一音訊時鐘，左右分布|
|呼吸雕塑|延伸、斷續、迴旋三套合成氣息|score 5；voice / breath|三角波有聲、濾波噪音氣流；不是人聲錄音|
|回聲迷宮|原始鐘聲與距離／反射衰減返回|score 6；bell / echo|有限路徑，沒有無界音訊回授|
|能量蓄積|逐步加強的撥音與低音|score 7；pluck / bass|力度積分驅動翻面，事件時不額外提高音量|

這些原創樂譜、聲音合成定義，以及由它們生成的聲音，隨本任務交付給 repository 擁有者；原創聲音採 **CC0 1.0 Universal** 公有領域貢獻。授權說明：https://creativecommons.org/publicdomain/zero/1.0/ 。無必須署名的外部曲目；仍在每頁保留原創署名。

**沒有使用第三方演奏錄音、熱連、取樣庫或現代商業編曲。** 本版不需要任何 MP3/WAV。新增古典主題由 `assets/js/classical.js` 即時合成；音符排譜依使用者提供的 `sound/reusable/tracks/*.json` 修正，開頭選段存於 `assets/js/classical-notation.js`。原譜僅供旋律核對，不隨網站散布掃描件。上面的原創音源 CC0 聲明僅涵蓋本展有權授權的新程式與原創素材，不把歷史原作冒稱為本展原創。

觀眾選用麥克風時，聲音只在當前瀏覽器分析，不錄音、不上傳，不把其聲音當作本展可再散布素材。PNG 僅包含生成的形態與表面，不包含音訊。

## 八首可選古典主題

以下全部加入八頁聲音選單。編排為 **主題節選／程式改編**：採用使用者提供的參考譜音高、起音、時值與和弦，保留現有音色、聲部分類、力度與播放速度換算；不套用參考譜 BPM 或速度變化；並非全曲或原編制演奏。原創音源仍為預設。

|選單|原作者／作品|部分與原譜來源|
|---|---|---|
|卡農|Johann Pachelbel・Canon in D|旋律、固定低音；[歷史譜目](https://imslp.org/wiki/Canon_and_Gigue_in_D_major,_P.37_(Pachelbel,_Johann))|
|少女的祈禱|Tekla Bądarzewska-Baranowska・Op.4|開頭選段，含前奏與裝飾音；歷史參照 [C. F. Peters 歷史印本第 1 頁](https://vmirror.imslp.org/files/imglnks/usimg/b/b7/IMSLP32596-PMLP51317-Salonalbum_Peters_1_Badarzewska_La_Priere_d_une_Vierge.pdf)|
|給愛麗絲|Ludwig van Beethoven・WoO 59|開頭迴旋主題；[原作譜目](https://imslp.org/wiki/F%C3%BCr_Elise,_WoO_59_(Beethoven,_Ludwig_van))|
|波萊羅舞曲|Maurice Ravel・Boléro, M.81|第一主題選段、既有三拍節奏；[1929 原版譜目](https://imslp.org/wiki/Bol%C3%A9ro_(Ravel,_Maurice))|
|天堂與地獄序曲|Jacques Offenbach・Orphée aux enfers|地獄加洛普／康康主題；[原作與序曲譜目](https://imslp.org/wiki/Orph%C3%A9e_aux_enfers_(Offenbach,_Jacques))。常見序曲由 Carl Binder 編整，此處取原作舞曲旋律，排譜參考使用者提供的 cancan.json|
|莫札特—土耳其進行曲|Wolfgang Amadeus Mozart・K.331|第三樂章 Alla turca 開頭；[原作譜目](https://imslp.org/wiki/Piano_Sonata_No.11,_K.331_(Mozart,_Wolfgang_Amadeus))|
|威廉泰爾序曲|Gioachino Rossini・Guillaume Tell|序曲終曲快板主題；[原作譜目](https://imslp.org/wiki/Guillaume_Tell_(Rossini,_Gioacchino))|
|匈牙利舞曲第 5 號|Johannes Brahms・WoO 1, No.5|開頭主題選段；[歷史鋼琴譜](https://imslp.org/wiki/21_Hungarian_Dances_(Piano),_WoO_1_(Brahms,_Johannes))。主題來源包含 Béla Kéler 的 Bártfai emlék|

歷史作品的權利與當代錄音、現代編曲不同；本版只使用歷史旋律重新編寫，不對外部演奏、現代譜面或全球各司法轄區作 CC0 聲明。每頁音源署名連結可查看以上曲目。

選曲作用於自動展演；手動調音、織行、按住發聲、敲擊與探路仍使用作品原有回饋音源。潮汐以兩個時間演奏同一主題，休止符保留真正無聲的樂句間隙。切換歌曲會重新生成材料；化石的回聽使用目前選曲實際沉積的音符。

排譜校訂：參考 JSON 並非正確性保證。《天堂與地獄》起音 tick 2592 的 G4 經 [Trala 公開樂譜](https://sheetmusic.trala.com/pdf/CanCan.pdf) 第一行第四小節核對（D 大調移至目前 C 大調），修正為 A4；音色、聲部分類、力度及速度不變。記錄位於 `assets/js/classical-corrections.json`。其他曲目的匯入音高已核對參考資料，但不將此檢查冒稱為全曲逐音原譜校訂。

《威廉泰爾序曲》目前選段的手工參考譜亦有錯音，已依 [Flutetunes 五線譜](https://www.flutetunes.com/tunes/rossini-william-tell-overture.pdf) 第 1 頁第 27–35 小節與同站 MIDI 校訂，包含約 12.55 秒 B3 → C♯4。保持開頭 A3 與 D 大調（原譜 E 大調整體降低 26 半音）、現有音色與分部；只修正音高，未替換起音、時值、演奏速度。原參考譜的重複起音與原譜連結線不完全相同，此次保留既有播放節奏。
