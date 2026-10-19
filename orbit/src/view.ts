/** A fixed drawing surface also works where the browser Fullscreen API is unavailable. */
export class FocusView {
  active = false;
  private scrollY = 0;
  private ownedFullscreen = false;
  private previousFocus: HTMLElement | null = null;
  constructor(private atelier: HTMLElement, private button: HTMLButtonElement, private onChange: () => void) {
    button.addEventListener('click', () => { if (this.active) this.exit(); else this.enter(); });
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.ownedFullscreen = this.active;
        if (!this.active) void document.exitFullscreen().catch(() => {});
      } else if (this.ownedFullscreen) {
        this.ownedFullscreen = false;
        this.leave();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.active && !document.querySelector('dialog[open]')) {
        e.preventDefault(); this.exit();
      }
    });
    const preventBackgroundScroll = (e: Event) => {
      if (this.active && !(e.target as Element).closest('dialog') && e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
  }
  enter(): void {
    if (this.active) return;
    this.scrollY = window.scrollY;
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.active = true;
    document.body.style.top = `-${this.scrollY}px`;
    document.documentElement.classList.add('focus-active');
    this.atelier.classList.add('is-focused');
    this.sync();
    // Fullscreen the root so export dialogs remain in the native fullscreen tree.
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {
        // The fixed, scroll-locked view is already functional (e.g. embedded pages / iOS).
      });
    }
  }
  exit(): void {
    const shouldExitNative = this.ownedFullscreen;
    this.ownedFullscreen = false;
    this.leave();
    if (shouldExitNative && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }
  private leave(): void {
    if (!this.active) return;
    this.active = false;
    this.atelier.classList.remove('is-focused');
    document.documentElement.classList.remove('focus-active');
    document.body.style.top = '';
    window.scrollTo({ top: this.scrollY, behavior: 'instant' });
    this.sync();
    this.previousFocus?.focus({ preventScroll: true });
  }
  private sync(): void {
    this.button.setAttribute('aria-pressed', String(this.active));
    this.button.textContent = this.active ? '離開全螢幕 ↙' : '全螢幕繪圖 ⛶';
    this.onChange();
  }
}
