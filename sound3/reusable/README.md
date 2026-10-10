# SOUND / 3 可重用樂譜原碼

這是 2026-10-11 從實際展覽原碼另存的獨立版本：8 組展覽原創音源＋8 首歷史古典主題節選。沒有依賴展覽 HTML、Canvas、素材或第三方套件，不需要麥克風。保留新伴奏、合成音色與音符事件；不包含各作品對旋律額外施加的材質／回聲／相位改造。不是 MP3 或完整古典作品的演奏錄音。

## 包含什麼

- `classical-scores.js`：八首古典主題的原碼（音名、拍長、低音與伴奏規則）。原作者保留於 composer 欄位。
- `original-scores.js`：八組展覽原創作曲函式，從展覽原碼另存，保留選項與 seed。
- `scores/*.json`：16 首各自獨立的已展開樂譜，任何語言都能讀取。
- `library.js`、`catalog.js`：統一取譜介面及曲目清單；`catalog.json` 是跨語言曲目清單。
- `sound-engine.js`、`utils.js`：原展覽合成音引擎與獨立工具。
- `player.js`：具前瞻排程、暫停、續播、循環、停止的獨立播放器。
- `demo.html`：選曲、試聽、調長度／移調、下載 JSON 的範例。
- `CREDITS.md`：沿用展覽的曲目來源、署名與原創音源授權說明；不是把歷史曲目宣稱為本展原創。

## 最簡單的使用方式

整個資料夾複製到新作品內，保留檔案相對位置。例如放到 `music/`，在頁面的 module script 裡：

```js
import {ScorePlayer} from './music/player.js';
const player = new ScorePlayer({volume: 0.45});
// 必須放在觀眾的點按／按鍵事件裡，瀏覽器才允許發聲。
playButton.onclick = () => player.play('canon', {
  duration: 32,       // 秒數；改成 48 會放慢，不會截掉後半段
  transpose: 0,      // 半音，例如 +2 全曲升高一個全音
  loop: true
});
pauseButton.onclick = () => player.pause();
resumeButton.onclick = () => player.resume();
stopButton.onclick = () => player.stop();
window.addEventListener('pagehide', () => { void player.close(); });
```

試聽須用 HTTP，不能直接以 file:// 打開 ES modules：

```sh
cd sound3/reusable
python3 -m http.server 8771 --bind 127.0.0.1
# 開啟 http://127.0.0.1:8771/demo.html
```

## 只拿樂譜，用自己的音源與視覺引擎

```js
import {tracks, getScore} from './music/library.js';
const song = getScore('elise', {duration: 32, transpose: -12});
// 在同一個音訊時鐘排程 event.t，畫面也讀這個時鐘。
for (const event of song.events) {
  console.log(event.t, event.d, event.notes, event.v, event.voice);
}
// 原創音源：
const fossil = getScore('original-04-sound-fossil', {seed: 4172});
// 自訂原創作曲參數（保留現有原碼選項）：
const breath = getScore('original-06-breath-portrait', {params: {demo: 1}});
```

也可直接載入 `scores/elise.json`，不需執行 JavaScript 作曲函式。時間均以秒計；這些 JSON 是預設長度、seed 的完整事件快照。若改 JS 樂譜，既有 JSON 不會自動更新，需重新輸出。

|欄位|意思|
|---|---|
|`t`|相對歌曲開始的秒數|
|`d`|發聲／休止的持續秒數|
|`notes`|MIDI 音高陣列，例如 60＝中央 C，69＝A4；多個值可同時發聲|
|`v`|力度，0–1|
|`voice`|合成音色，例如 piano、bass、organ、drum、breath|
|`part`／`kind`|聲部或事件用途，可用於自己的視覺反應|

空音符陣列不一定是休止：`voice: 'breath'` 是氣音噪音；`kind: 'partition'` 是原回聲曲的視覺結構事件，不發聲。古典曲 `part: 'rest'` 才是明確休止。只用自己的樂器時可自行映射 voice。

古典原碼的 `E5:.5` 代表 E5 半拍，`F#5:2` 是 F♯5 兩拍，`R:1` 是一拍休止。`meter` 表示伴奏的每組拍數，`bass` 存 MIDI 低音。`duration` 改變整段的速度與時值，不是裁切長度。

## 曲目 ID

古典：`canon`、`prayer`、`elise`、`bolero`、`can-can`、`turkish`、`tell`、`hungarian`。

原創：`original-01-resonant-architecture`、`original-02-chord-loom`、`original-03-silence-cuts`、`original-04-sound-fossil`、`original-05-phase-tides`、`original-06-breath-portrait`、`original-07-echo-labyrinth`、`original-08-stored-energy`。

預設長度沿用原曲；化石為 16 秒、呼吸 14 秒、潮汐 240 秒，其餘 24／32 秒。古典主題預設 32 秒。duration 範圍 4–3600 秒；transpose 是 -36 至 +36 的整數半音。這個版本保持節選與程序生成音色，沒有承諾全曲、真實鋼琴取樣、五線譜或 MIDI 檔。
