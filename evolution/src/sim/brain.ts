/**
 * Behavioural controller: fixed-topology feed-forward network.
 *   inputs (N_IN) + bias -> N_HID tanh units + bias -> N_OUT
 * All weights live in the genome; nothing is learned within a lifetime.
 *
 * Inputs (all in [0,1]):
 *   0..2  resource density sensed left / front / right
 *   3..5  biomass of other organisms sensed left / front / right
 *   6     resource density in own cell
 *   7     own energy / capacity
 * Outputs:
 *   0     turn   -> tanh    -> [-1, 1] * maxTurn
 *   1     thrust -> sigmoid -> [0, 1]  * maxSpeed trait
 */
export const N_IN = 8;
export const N_HID = 6;
export const N_OUT = 2;
export const BRAIN_WEIGHTS = (N_IN + 1) * N_HID + (N_HID + 1) * N_OUT;

const hid = new Float64Array(N_HID);

/** Writes outputs into `out` (length N_OUT). `g` is the genome, `off` the weight offset. */
export function think(g: Float64Array, off: number, inp: Float64Array, out: Float64Array): void {
  let k = off;
  for (let h = 0; h < N_HID; h++) {
    let s = g[k++]; // bias
    for (let i = 0; i < N_IN; i++) s += g[k++] * inp[i];
    hid[h] = Math.tanh(s);
  }
  for (let o = 0; o < N_OUT; o++) {
    let s = g[k++];
    for (let h = 0; h < N_HID; h++) s += g[k++] * hid[h];
    out[o] = s;
  }
  out[0] = Math.tanh(out[0]);
  out[1] = 1 / (1 + Math.exp(-out[1]));
}
