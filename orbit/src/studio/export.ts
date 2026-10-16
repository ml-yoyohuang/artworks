import { renderSVG } from './render';
import { validateArtwork } from './data';
import type { Artwork } from './types';
import sans from '../../public/fonts/font-0.ttf?url';
import sansMedium from '../../public/fonts/font-1.ttf?url';
import sansBold from '../../public/fonts/font-2.ttf?url';
import mono from '../../public/fonts/font-3.ttf?url';
import monoMedium from '../../public/fonts/font-4.ttf?url';
import serif from '../../public/fonts/font-6.ttf?url';

const fonts = { 'DM Sans': [[400, sans], [500, sansMedium], [600, sansBold]], 'IBM Plex Mono': [[400, mono], [500, monoMedium]], 'Instrument Serif': [[400, serif]] } as const;
const embedded = new Map<string, string>();
async function fontCSS(a: Artwork): Promise<string> {
  const families = [...new Set(a.objects.filter(o => o.visible && o.type === 'text').map(o => o.text.font))];
  return (await Promise.all(families.map(async family => {
    if (!embedded.has(family)) {
      const css = await Promise.all(fonts[family].map(async ([weight, url]) => {
        const response = await fetch(url); if (!response.ok) throw new Error('字體未載入，請稍後再匯出。');
        const data = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (const byte of data) binary += String.fromCharCode(byte);
        return `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${btoa(binary)}) format('truetype');font-weight:${weight};}`;
      }));
      embedded.set(family, css.join(''));
    } return embedded.get(family)!;
  }))).join('');
}
export async function exportSVG(a: Artwork, paper: boolean): Promise<Blob> {
  validateArtwork(a); return new Blob([renderSVG(a, { paper, fonts: await fontCSS(a) })], { type: 'image/svg+xml' });
}
export async function exportPNG(a: Artwork, paper: boolean, scale: number): Promise<Blob> {
  validateArtwork(a);
  if (!Number.isFinite(scale) || scale < .5 || scale > 4 || Math.max(a.artboard.width, a.artboard.height) * scale > 4800 || a.artboard.width * a.artboard.height * scale * scale > 20_000_000) throw new RangeError('匯出上限為長邊 4800px、2000 萬像素，請降低倍率。');
  const source = await exportSVG(a, paper), url = URL.createObjectURL(source), img = new Image();
  try {
    img.src = url; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = Math.round(a.artboard.width * scale); canvas.height = Math.round(a.artboard.height * scale);
    const context = canvas.getContext('2d'); if (!context) throw new Error('此瀏覽器無法建立匯出畫布。');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 編碼失敗')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
