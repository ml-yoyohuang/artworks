
## Reusable 專區新增曲目（2026-10-11）

以下兩首只加入 reusable 套件，不加入 16 件藝術作品的選曲介面。MIDI 是可編輯的音符排譜，不是錄音；播放器以 Tone.js 即時合成。保留來源 MIDI 全部音符、音長與力度，不新增伴奏；轉換為 192 PPQ。MIDI 的踏板、樂器音色設定不轉入 JSON；合成器採短包絡，因此不宣稱與原鋼琴演奏或原譜所有記號完全一致。

<a id="elise"></a>

### 給愛麗絲 / Für Elise，WoO 59

- 作曲：Ludwig van Beethoven。
- 數位排譜／維護：Stelios Samelis，Mutopia-2015/08/18-931；參考版本 Breitkopf & Härtel，1888。
- 來源：[Mutopia 官方樂譜頁](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931)、[MIDI 原檔](https://www.mutopiaproject.org/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.mid)、[LilyPond 原檔](https://www.mutopiaproject.org/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.ly)。
- 來源標示 **Public Domain**；LilyPond 原檔亦載明由排譜者置於公共領域。保留來源署名以便追溯。
- `originals/elise-original.mid` 與 `originals/elise-source.ly` 保留原檔。左右手共 905 個音符事件，3/8 拍，四分音符 72 BPM；`meter=1.5` 表示每小節一又二分之一個四分音符拍，另有 `timeSignature=[3,8]`。

<a id="prayer"></a>

### 少女的祈禱 / A Maiden's Prayer，Op. 4

- 作曲：Tekla Bądarzewska-Baranowska。
- MIDI 製作／上傳者：Michael Bednarek。
- 來源：[Wikimedia Commons 原檔與授權頁](https://commons.wikimedia.org/wiki/File:A_Maiden%27s_Prayer.mid)、[MIDI 原檔](https://upload.wikimedia.org/wikipedia/commons/4/46/A_Maiden%27s_Prayer.mid)。
- 頁面標示 Own work，作者以 **PD-self** 將自己的 MIDI 製作置於公共領域；來源快照保存在 `originals/prayer-source.html`。此授權是公共領域釋出，不改稱 CC0 或 CC BY。
- `originals/prayer-original.mid` 保留原檔。單一鋼琴聲部共 1,546 個音符事件，4/4 拍；保留來源所有 tempo 事件。預設四分音符 83 BPM，包含自由速度與裝飾段的變速，並在 tick 0 補同一初速，讓循環重開時恢復原速。原始曲首空白亦保留，不另外切成左右手。

`build-extra.py` 可從隨包 MIDI 重建這兩首及八曲 library；JSON 包含來源 SHA-256，方便核對。六首既有歌曲的來源與授權仍依上面的各節。

### 卡農低音音色調整

Reusable 播放器的卡農低音改用三角波、較飽滿的 sustain 與稍高音量，改善小喇叭辨識；低音音高、節奏及原排譜資料保持一致。其他曲目的預設低音仍為正弦波，可透過 `bassWave` 選項自行指定。不新增外部音源或錄音。
