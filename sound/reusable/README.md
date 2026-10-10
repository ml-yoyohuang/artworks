# Soft Scores：可重用的古典樂譜程式資料

這不是錄音檔，也不是八首新作曲。原曲由古典作曲家創作；本專案轉換已有排譜、轉錄選段、加入部分伴奏，再由 Tone.js 即時合成演奏。請將 CREDITS.md 的對應來源與授權一併帶到新作品。

## 帶去另一個作品

最少複製 `library.js`、`player.js`、`CREDITS.md`。`demo.html` 是可直接打開的使用範例，只需連網載入固定版本 Tone.js，不需建置工具、伺服器或音檔。

```html
<script src="https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js"></script>
<script src="library.js"></script>
<script src="player.js"></script>
<button id="start">播放卡農</button>
<script>
const player = new SoftScoresPlayer(Tone, SoftScores);
document.querySelector('#start').onclick = async () => {
  await Tone.start();
  if (!player.score) player.load('canon', {
    wave: 'triangle', // sine / triangle / square / sawtooth
    bassWave: 'triangle', // 選配：指定低音音色
    onNote(note) {
      // 用這個回呼驅動畫面：音高、聲部、力度、樂譜位置
      console.log(note.midi, note.voice, note.velocity, note.tick);
    }
  });
  await player.play();
};
// player.pause() 暫停；player.play() 繼續
// player.stop() 回開頭；player.setRate(1.2) 速度倍率
// player.load('bolero') 停止舊曲並載入新曲，再呼叫 play()
// 離開作品時 player.dispose()
</script>
```

播放程式獨占 Tone.Transport，全頁一次使用一個播放器；若作品已有自己的 Transport 排程，請只取歌曲資料整合進既有引擎。`load()` 重設速度倍率為 1，並清除本播放器自己的聲部；它不會刻意清除其他程式的排程，但全域時鐘的停止／PPQ／速度仍會影響其他音樂程式。play() 必須由按鈕等使用者操作啟動。

卡農低音預設柔和三角波，加上較飽滿的延續音與稍高音量，讓小喇叭更容易聽見。其餘曲目的低音預設正弦波；`bassWave` 可自行指定低音波形。這個小播放器保留音符資料、聲部、速度變化、循環以及波萊羅漸強；音色與包絡為通用範例，不包含各藝術頁的遊戲、合成鼓加拍或互動短句。

## 八首曲目

| ID | 曲目 | 保存範圍 |
|---|---|---|
| canon | D 大調卡農 | 四聲部完整排譜 |
| turkish | 土耳其進行曲 | 完整左右手 |
| hungarian | 匈牙利舞曲第 5 號 | 完整時間軸，旋律／和弦／低音三聲部 |
| cancan | 天堂與地獄序曲・康康舞段 | 主題選段＋新編伴奏 |
| bolero | 波萊羅舞曲 | A／A／B／B 主題選段、低音與小鼓、漸強改編 |
| william | 威廉泰爾序曲・終曲快板 | D 大調 16 小節主題選段＋新編伴奏 |
| elise | 給愛麗絲 | 來源 MIDI 全部音符、左右手 |
| prayer | 少女的祈禱 | 來源 MIDI 全部音符、鋼琴聲部與速度變化 |

## 資料格式與其他引擎

`library.js` 在瀏覽器提供全域 `SoftScores`，亦可用 CommonJS `require('./library.js')`。`library.json` 是相同資料；`tracks/` 有八首各自的 JSON。新增曲目 ID 為 `elise`、`prayer`，例如 `player.load('prayer')`。任何語言、Web Audio、p5.js、Three.js 或其他音樂引擎都可讀 JSON，不必使用本播放器。

每首曲目包含 `title`、`composer`、`detail`、`bpm`、`meter`（每小節四分音符拍數；給愛麗絲 3/8 拍為 1.5）、`ppq`、`totalTicks`、`tempos`、`voices`。

每個聲部有 `name`、`role`（lead／bass／percussion）與 `events`。每個事件為：

```js
[startTick, midiPitch, durationTicks, velocity]
// 例如 [0, 62, 192, 76]：第一拍開始，D4，持續一拍，力度 76。
```

PPQ = 192，192 ticks 等於一個四分音符拍；MIDI 60 是 C4，62 是 D4。力度 1–127；休止用事件之間的空隙表示，同時間的多個事件是和音。`tempos` 是 `[tick, BPM]` 陣列。固定速度時秒數 = ticks / ppq × 60 / BPM；匈牙利舞曲與少女的祈禱有速度變化，換成秒時須分段累加，不能全曲都乘同一 BPM。

## 原始排譜與轉換程式

ZIP 裡的 `sources/score/` 保存原始 MIDI、卡農轉換 JSON、波萊羅 LilyPond `.ily` 排譜與 LICENSE、威廉泰爾參考 PDF，以及來源記錄。`sources/tools/` 保存實際使用的三個 Python 轉換工具。

原始 MIDI 可用支援 MIDI 的音樂軟體匯入；它們與網站合成版可能有不同聲部分配、速度或伴奏。六首網站版加兩首 reusable 新曲的共同資料檔是 `library.json`。不是每首都有原版 MIDI：波萊羅來源是 LilyPond，威廉泰爾是 PDF 參考譜與 build-scores.py 中的手工音符。

解壓縮後可重建網站版資料（Python 3，無額外套件）：

```sh
python3 sources/tools/import-canon.py sources/score/canon-original.mid
python3 sources/tools/build-scores.py
python3 build-extra.py
```

第一階段六曲輸出在 `sources/score/library.json`；第二階段加兩首後輸出 `library.json`、`library.js` 與八個 `tracks/*.json`。`originals/` 保留新增兩首原始 MIDI、給愛麗絲 LilyPond 與少女的祈禱來源／授權快照。卡農數位排譜為 CC BY 4.0，須保留原排譜作者與來源署名；其他曲目的具體來源、授權及改編範圍請讀 CREDITS.md。本包未把不同來源的樂譜重新宣稱為統一授權。

## 完整卡農・音色試聽室

開啟 `canon-timbres.html`（或從 demo.html 的試聽連結進入），可以在同一份完整四聲部卡農上切換五種合成音色，另有目前 reusable 預設音色作為比較。音符、力度、速度和樂譜長度保持一致；播放中或暫停中切換都保留位置。全部使用 Tone.js 15.0.4 即時合成，沒有錄音檔。

`timbres.js` 是可攜式音色原檔。這些是對 sound3 聲音配置的 Tone.js 詮釋，不是錄製音色，也不聲稱與 sound3 完全相同：泛音鋼琴採相同八層泛音比例 `[1,.38,.18,.1,.06,.035,.02,.012]`；建築為較柔和起音、延續較長的三角波；潮汐旋律採正弦波左右聲像；氣息版混合有音高的三角波及較輕的粉紅噪音，保留完整旋律；撥音以約 8.7 音分的微小下降增加彈性感。五版均保留較容易在電腦喇叭聽見的三角波低音。

帶到另一個作品時，加載 `timbres.js`，在原播放器使用選配的音色工廠：

```js
player.load('canon', {
  instrumentFactory: SoftScoreTimbres.factory('piano'),
  onNote(note) { /* 仍可使用相同的音符回呼 */ }
});
// piano / architecture / tides / breath / pluck
```

未提供 `instrumentFactory` 時，原播放器預設行為保持原樣。自訂工廠接受 `(Tone, voice, index, volume)`，回傳實作 `connect()`、`triggerAttackRelease()`、`releaseAll()`、`dispose()` 的物件。本輪只新增 reusable 試聽功能，未套用到 16 件展覽作品。
