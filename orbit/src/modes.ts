import type { Stroke } from './state';
import type { Studio } from './studio/app';
import type { Play } from './play/app';

export function mountModes(pauseClassic: () => void, strokes: () => Stroke[]): void {
  const classic = document.querySelector<HTMLElement>('#app')!;
  const studioRoot = document.createElement('div'); studioRoot.id = 'studio-root'; studioRoot.hidden = true; document.body.append(studioRoot);
  const button = document.createElement('button'); button.id = 'enter-studio'; button.className = 'text-button'; button.textContent = 'Studio ↗';
  classic.querySelector('.masthead')!.insertBefore(button, classic.querySelector('#about-button'));
  const transfer = document.createElement('button'); transfer.id = 'classic-to-studio'; transfer.className = 'text-button'; transfer.textContent = '帶入 Studio ↗';
  classic.querySelector('.colophon')!.append(transfer);
  let studio: Studio | undefined, loading = false; let scroll = 0;
  const back = () => { studioRoot.hidden = true; classic.hidden = false; window.scrollTo({ top: scroll, behavior: 'instant' }); button.focus({ preventScroll: true }); };
  async function open(importStrokes: boolean) {
    if (loading) return; loading = true; pauseClassic(); scroll = window.scrollY; button.disabled = true;
    try {
      if (!studio) { const { Studio } = await import('./studio/app'); studio = new Studio(studioRoot, back); }
      studio.show(importStrokes ? strokes() : undefined); classic.hidden = true; studioRoot.hidden = false; window.scrollTo(0, 0); studioRoot.querySelector<HTMLElement>('#back-classic')?.focus();
    } catch (error) { console.error(error); button.textContent = 'Studio 載入失敗，重試 ↗'; }
    finally { loading = false; button.disabled = false; }
  }
  button.addEventListener('click', () => void open(false)); transfer.addEventListener('click', () => void open(true));
  const playButton = classic.querySelector<HTMLButtonElement>('#enter-play')!;
  let play: Play | undefined;
  playButton.addEventListener('click', async () => {
    if (loading) return;
    loading = true; playButton.disabled = true; pauseClassic(); const previousScroll = window.scrollY;
    try {
      if (!play) {
        const { Play } = await import('./play/app');
        const root = document.createElement('div'); root.id = 'play-root'; root.hidden = true; document.body.append(root);
        play = new Play(root, () => {
          classic.hidden = false; window.scrollTo({ top: scroll, behavior: 'instant' }); playButton.focus({ preventScroll: true });
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) classic.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 180 });
        });
        await play.init();
      }
      scroll = previousScroll; classic.hidden = true; play.show();
    } catch (error) { console.error(error); playButton.textContent = '簡易模式載入失敗，重試 ↗'; }
    finally { loading = false; playButton.disabled = false; }
  });
}
