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

const GREENS: readonly Pigment[] = [{ h: 155, s: 39, l: 71 }, { h: 164, s: 43, l: 69 }, { h: 170, s: 40, l: 74 }, { h: 176, s: 46, l: 68 }];
const PINKS: readonly Pigment[] = [{ h: 331, s: 58, l: 76 }, { h: 339, s: 64, l: 73 }, { h: 346, s: 62, l: 78 }, { h: 353, s: 65, l: 74 }];

export const TYPE_COLOURS = ['#df884a', '#35999a', '#d87caa'];

export function coloursOf(traits: ArrayLike<number>, type = 0): { warm: Pigment; cool: Pigment } {
  if (type === 1) return { warm: pigment(GREENS, traits[T_MARKER_A]), cool: pigment(COOL_PIGMENTS, traits[T_MARKER_B]) };
  if (type === 2) return { warm: pigment(WARM_PIGMENTS, traits[T_MARKER_A]), cool: pigment(PINKS, traits[T_MARKER_B]) };
  return { warm: pigment(WARM_PIGMENTS, traits[T_MARKER_A]), cool: pigment(COOL_PIGMENTS, traits[T_MARKER_B]) };
}

export const pigmentCss = (p: Pigment) => `hsl(${p.h},${p.s}%,${p.l}%)`;
