// 02 和弦織機：樂譜與織法規則（純函式，可在 Node 測試）。
import { clamp } from '../core/rng.js';

export const BPM = 92, STEP = 60 / BPM / 2, BAR = 8, LOOP = 16 * BAR; // 128 列一輪
export const MAXROWS = 360, HEADER = 14;

// ---- 樂譜（決定性）----
// 旋律以 [起始步, 長度(步), MIDI]；每 4 小節一個樂句。
export const A = [[0, 2, 74], [2, 1, 77], [3, 1, 81], [4, 2, 79], [6, 1, 77], [7, 1, 76], [8, 3, 74], [11, 1, 72], [12, 2, 74], [14, 2, 77], [16, 2, 76], [18, 1, 74], [19, 1, 72], [20, 2, 74], [22, 2, 69], [24, 3, 72], [27, 1, 74], [28, 4, 76]];
export const A2 = A.map(([s, d, m], i) => [s + 1, Math.max(1, d - (s + d + 1 > 32 ? 1 : 0)), i % 2 ? m + 3 : m]).filter(n => n[0] < 32);
export const B = [[0, 2, 81], [2, 2, 79], [4, 2, 77], [6, 2, 76], [8, 3, 74], [11, 1, 76], [12, 4, 74]];
export const CHORD_BASS = [[38, 45], [43, 50], [46, 53], [45, 52]]; // Dm7 G7 B♭maj7 A7sus（根音、五度）
export const FORM = ['A', 'A', 'A2', 'break', 'B'];

export function stepInfo(step) {
  const s = ((step % LOOP) + LOOP) % LOOP, bar = Math.floor(s / BAR), inBar = s % BAR;
  const section = bar < 4 ? 'A' : bar < 8 ? 'A' : bar < 12 ? 'A2' : bar < 14 ? 'break' : 'B';
  const phraseStep = section === 'B' ? s - 13 * BAR - BAR : section === 'break' ? s - 12 * BAR : s % 32;
  const mel = section === 'A' ? A : section === 'A2' ? A2 : section === 'B' ? B : [];
  const ps = section === 'B' ? s - 14 * BAR : s % 32;
  let note = null, onset = false;
  for (const [st, d, m] of mel) if (ps >= st && ps < st + d) { note = m; onset = ps === st; if (onset) note = m; break; }
  const durOf = () => { for (const [st, d] of mel) if (ps === st) return d; return 0; };
  const [root, fifth] = CHORD_BASS[bar % 4];
  // 低音：每小節 根音(4步) 五度(2步) 根音高八度(1步) 經過音(1步)
  let bass = null, bassOn = false, bassDur = 0;
  const bp = [[0, 4, root], [4, 2, fifth], [6, 1, root + 12], [7, 1, root + 2]];
  for (const [st, d, m] of bp) if (inBar >= st && inBar < st + d) { bass = m; bassOn = inBar === st; bassDur = d; }
  const brk = section === 'break';
  const kick = !brk && (inBar === 0 || inBar === 5), snare = !brk && inBar === 4, hat = inBar % 2 === 1;
  return { s, bar, inBar, root, section, phraseStep: ps, note, onset, noteDur: durOf(), bass, bassOn, bassDur, kick, snare, hat, pIndex: phraseStep };
}

// 色序：每個段落一組色彩，音域決定色階（低→深、高→淺）。
export const PAL = { A: ['#a3381f', '#d0702f', '#eba852'], A2: ['#1d5c6b', '#3f8c99', '#86c0bd'], B: ['#7a1f3d', '#b9475f', '#e58d8a'] };
export const tone = m => (m < 72 ? 0 : m <= 76 ? 1 : 2);
export const WEAVES = ['平織', '斜紋', '緞紋'];
export function warpOver(weave, j, r, off) {
  if (weave === 0) return ((j + r) & 1) === 0;
  if (weave === 1) return ((j + r + off) % 4 + 4) % 4 < 2;
  return ((j * 2 + r + off) % 5 + 5) % 5 === 0;
}

