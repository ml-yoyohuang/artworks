export const MIN_ZOOM=1, MAX_ZOOM=8, ZOOM_STEP=1.5, INITIAL_ZOOM=MIN_ZOOM*ZOOM_STEP**3;
/** View transform: world units <-> CSS pixels. `x, y` is the world point at the screen centre. */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  fit = 1;
  vw = 1;
  vh = 1;
  private W = 1;
  private H = 1;

  /** CSS pixels per world unit */
  get s(): number {
    return this.fit * this.zoom;
  }

  resize(vw: number, vh: number, W: number, H: number): void {
    const first = this.W === 1;
    this.vw = vw;
    this.vh = vh;
    this.W = W;
    this.H = H;
    this.fit = Math.min(vw / W, vh / H) * (vw < 720 ? 0.98 : 0.9);
    if (first) this.reset();
    this.clamp();
  }

  toWorld(sx: number, sy: number): [number, number] {
    return [this.x + (sx - this.vw / 2) / this.s, this.y + (sy - this.vh / 2) / this.s];
  }

  zoomAt(sx: number, sy: number, zoom: number): void {
    const [wx, wy] = this.toWorld(sx, sy);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    this.x = wx - (sx - this.vw / 2) / this.s;
    this.y = wy - (sy - this.vh / 2) / this.s;
    this.clamp();
  }

  clamp(): void {
    const hw = this.vw / 2 / this.s, hh = this.vh / 2 / this.s;
    this.x = hw * 2 >= this.W ? this.W / 2 : Math.min(this.W - hw, Math.max(hw, this.x));
    this.y = hh * 2 >= this.H ? this.H / 2 : Math.min(this.H - hh, Math.max(hh, this.y));
  }

  /** Start close enough to see individuals, as through a microscope. */
  reset(): void {
    this.zoom = INITIAL_ZOOM;
    this.x = this.W / 2;
    this.y = this.H / 2;
  }
}
