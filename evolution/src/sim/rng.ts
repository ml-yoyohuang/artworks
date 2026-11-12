/**
 * Seeded PRNG (sfc32). The full state is four uint32, so it serialises
 * exactly and a restored simulation continues the identical stream.
 */
export type RngState = [number, number, number, number];

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number | RngState) {
    if (typeof seed === 'number') {
      // Expand the integer seed with splitmix32, then warm up.
      let s = seed >>> 0;
      const sm = () => {
        s = (s + 0x9e3779b9) >>> 0;
        let z = s;
        z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
        z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
        return (z ^ (z >>> 16)) >>> 0;
      };
      this.a = sm();
      this.b = sm();
      this.c = sm();
      this.d = 1;
      for (let i = 0; i < 12; i++) this.next();
    } else {
      [this.a, this.b, this.c, this.d] = seed;
    }
  }

  /** Uniform in [0, 1). */
  next(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Standard normal (Box–Muller, no cached spare so state stays 4 words). */
  gauss(): number {
    const u = 1 - this.next();
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v);
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  state(): RngState {
    return [this.a, this.b, this.c, this.d];
  }
}
