// test2's original architecture score, adapted to test1's shared event clock.
import { BAR, SETS } from '../../test2/js/models/architecture.js';
const ENTRY = [0, 0.45, 0.95, 1.5];
const BELLS = [[2.6, 2], [3.2, 3], [3.8, 1], [5.6, 3], [6.2, 2]];
export const architectureChords = SETS[0].chords;
export const architectureDuration = BAR * architectureChords.length;

export function architectureScore(params = {}) {
  const events = [];
  for (let k = 0; k < architectureChords.length; k++) {
    const chord = params.chord == null ? k : Number(params.chord);
    const ch = architectureChords[chord], start = k * BAR;
    events.push({ t: start, d: 0, notes: [], v: 0, kind: 'chord', chord,
                  chordNotes: ch.v, chordName: ch.name });
    ch.v.forEach((n, i) => {
      const dur = params.short ? 1.1 : (i === 3 && k % 4 === 3 ? 2.4 : BAR - ENTRY[i] + 0.5);
      events.push({ t: start + ENTRY[i], d: dur, notes: [n + (i === 0 ? 12 : 0)],
        v: i === 0 ? 0.62 : 0.42, voice: 'architecture-pad',
        options: { a: 1.1, r: 1.8, bright: 0.25 + i * 0.08, pan: (i - 1.5) * 0.28, wet: 0.45 } });
      if (i === 0) events.push({ t: start, d: dur, notes: [n], v: 0.5,
        voice: 'architecture-pad', options: { a: 1.4, r: 2, bright: 0.05,
          wave: 'sine', wave2: 'triangle', mix: 0.3, wet: 0.2 } });
    });
    const sorted = ch.v.slice(1).sort((a, b) => a - b);
    BELLS.forEach(([dt, idx], j) => {
      if (k % 2 === 1 && j > 2) return;
      const midi = sorted[idx % 3] + 12 + (idx === 3 ? 7 : 0);
      events.push({ t: start + dt, d: 1.8, notes: [midi], v: 0.42 - j * 0.03,
        voice: 'architecture-bell', options: { decay: 1.8, ratio: 3.01, index: 1.1,
          gain: 0.11, pan: ((midi % 7) - 3) * 0.15 } });
    });
  }
  return { events: events.sort((a, b) => a.t - b.t), walls: null, source: null };
}
