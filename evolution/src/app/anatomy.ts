import { T_MARKER_A, T_MARKER_B, type Organism } from '../sim';

/** Inherited neutral decoration. These dots do not add loci, sensors or functional organelles. */
export function particleCounts(o: Pick<Organism, 'type' | 'lobes' | 'ph'>): number[] {
  if (o.type !== 2) return [];
  const a = o.ph.traits[T_MARKER_A], b = o.ph.traits[T_MARKER_B];
  return Array.from({ length: o.lobes }, (_, i) => {
    const value = .5 + .5 * Math.sin(a * Math.PI * 2 + i * 1.7) + (b - .5) * .3;
    return Math.max(0, Math.min(3, Math.floor(value * 4)));
  });
}
