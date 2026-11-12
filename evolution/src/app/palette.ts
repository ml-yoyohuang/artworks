import { T_MARKER_A, T_MARKER_B } from '../sim';

export interface Pigment { h: number; s: number; l: number }

// Original orange / blue plus three neighbouring pigments per family.
// Interpolation keeps inherited mutations visually gradual rather than switching skins.
export const WARM_PIGMENTS: readonly Pigment[] = [
  { h: 18, s: 86, l: 67 }, // peach orange
  { h: 25, s: 88, l: 62 }, // original orange
  { h: 30, s: 86, l: 66 }, // apricot
  { h: 34, s: 84, l: 61 }, // soft amber
];
export const COOL_PIGMENTS: readonly Pigment[] = [
  { h: 192, s: 58, l: 74 }, // aqua blue
  { h: 204, s: 62, l: 71 }, // original blue
  { h: 212, s: 59, l: 76 }, // mist blue
  { h: 220, s: 56, l: 70 }, // cornflower blue
];

function pigment(stops: readonly Pigment[], marker: number): Pigment {
  const p = Math.max(0, Math.min(1, marker)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p)), t = p - i;
  const a = stops[i], b = stops[i + 1];
  return { h: a.h + (b.h - a.h) * t, s: a.s + (b.s - a.s) * t, l: a.l + (b.l - a.l) * t };
}

export function coloursOf(traits: ArrayLike<number>): { warm: Pigment; cool: Pigment } {
  return { warm: pigment(WARM_PIGMENTS, traits[T_MARKER_A]), cool: pigment(COOL_PIGMENTS, traits[T_MARKER_B]) };
}

export const pigmentCss = (p: Pigment) => `hsl(${p.h},${p.s}%,${p.l}%)`;
