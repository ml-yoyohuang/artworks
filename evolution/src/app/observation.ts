import type { SimEvent } from '../sim';

/** Zero is a valid deterministic seed; reject blank, fractional and non-finite inputs. */
export function parseSeed(value: string | null, fallback: () => number): number {
  if (value !== null && value.trim() !== '') {
    const seed = Number(value);
    if (Number.isSafeInteger(seed)) return seed;
  }
  return fallback();
}

export function tickPosition(tick: number, first: number, last: number): number {
  return (tick - first) / Math.max(1, last - first);
}

/** Events are bounded, so a restored empty world may have no retained extinction event. */
export function extinctionTick(events: readonly SimEvent[]): number | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'extinction') return events[i].tick;
  }
}
