/** Activate small instruments on a stationary touch release, with click deduplication.
 * Scrolling cancels the pointer; keyboard activation remains native. */
export function instrumentButton(button: HTMLButtonElement, action: () => void): void {
  let start: { id: number; x: number; y: number } | null = null;
  let lastTouch = -Infinity;
  button.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && e.isPrimary) start = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  button.addEventListener('pointercancel', () => { start = null; });
  button.addEventListener('pointerup', e => {
    const first = start; start = null;
    if (first?.id !== e.pointerId || Math.hypot(e.clientX - first.x, e.clientY - first.y) > 10) return;
    lastTouch = performance.now(); action();
  });
  button.addEventListener('click', e => {
    if (e.detail !== 0 && performance.now() - lastTouch < 700) return;
    action();
  });
}
