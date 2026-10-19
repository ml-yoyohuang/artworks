import { GEARS, HOLES, RINGS } from '../catalog';
import { closure, gcd, TAU } from '../geometry';
import { random } from '../random';
import { compatibleInks, GEAR_MATERIALS, PAPERS } from './palette';
export type Choice = { ring: number; gear: number; hole: number; ink: number; material: number };
export const CANDIDATES = RINGS.flatMap(ring => GEARS.flatMap(({ teeth: gear }) =>
  HOLES.flatMap((hole, index) => gear / ring >= .25 && gear / ring <= .65 && hole >= .36 && closure({ ring, gear, hole }) <= 8 * TAU
    ? [{ ring, gear, hole: index }] : [])));
export function choose(seed: number, sequence: number, paper: number, recent: Choice[]): Choice {
  const rng = random((seed + Math.imul(sequence + 1, 0x9e3779b9)) >>> 0);
  const weights = CANDIDATES.map(c => recent.reduce((w, prev, i) => {
    const age = 1 / (i + 1), sameRatio = c.gear * prev.ring === prev.gear * c.ring;
    const samePetals = c.ring / gcd(c.ring, c.gear) === prev.ring / gcd(prev.ring, prev.gear);
    return w * (sameRatio ? .015 / age : samePetals ? .25 : 1) * (c.hole === prev.hole ? .55 : 1);
  }, 1));
  let pick = rng() * weights.reduce((a, b) => a + b, 0), index = weights.length - 1;
  for (let i = 0; i < weights.length; i++) { pick -= weights[i]; if (pick <= 0) { index = i; break; } }
  let inks = compatibleInks(paper).filter(i => i !== recent[0]?.ink && i !== recent[1]?.ink);
  if (!inks.length) inks = compatibleInks(paper);
  // Preferred pairings get two tickets, secondary pairings get one.
  const tickets = inks.flatMap(i => (PAPERS[paper].preferred as readonly number[]).includes(i) ? [i, i] : [i]);
  return { ...CANDIDATES[index], ink: tickets[Math.floor(rng() * tickets.length)], material: Math.floor(rng() * GEAR_MATERIALS.length) };
}
