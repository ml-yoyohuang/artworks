/**
 * Maps real time to fixed logical ticks (pause / resume / variable speed).
 * The simulation itself never sees wall-clock time.
 */
export class Clock {
  paused = false;
  /** logical ticks per real second */
  ticksPerSecond: number;
  /** upper bound of ticks returned by one advance() call */
  maxTicksPerFrame: number;
  private acc = 0;

  constructor(ticksPerSecond = 60, maxTicksPerFrame = 200) {
    this.ticksPerSecond = ticksPerSecond;
    this.maxTicksPerFrame = maxTicksPerFrame;
  }

  /** Fraction (0..1) of the next tick already elapsed: use it to interpolate rendering. */
  get phase(): number {
    return this.acc;
  }

  /** Discard a previous world's interpolation phase when replacing it. */
  reset(): void { this.acc = 0; }

  /** Number of ticks to run for `dtSeconds` of real time. */
  advance(dtSeconds: number): number {
    if (this.paused) return 0;
    this.acc += dtSeconds * this.ticksPerSecond;
    let n = Math.floor(this.acc);
    this.acc -= n;
    if (n > this.maxTicksPerFrame) {
      n = this.maxTicksPerFrame;
      this.acc = 0; // drop backlog rather than spiral
    }
    return n;
  }
}
