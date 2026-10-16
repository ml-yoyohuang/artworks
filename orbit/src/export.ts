import { pathData } from './geometry';
import type { Stroke } from './state';
import { PAPER_SIZE } from './renderer';
export function createSVG(strokes: Stroke[], paper: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAPER_SIZE}" height="${PAPER_SIZE}" viewBox="0 0 ${PAPER_SIZE} ${PAPER_SIZE}"><title>ORBIT — A study in circular motion</title>${paper ? `<rect width="100%" height="100%" fill="#faf9f2"/>` : ''}<g transform="translate(380 380)" fill="none" stroke-linecap="round" stroke-linejoin="round">${strokes.filter(s => s.stops.length > 1).map(s => `<path stroke="${s.color}" stroke-width="${s.width}" d="${pathData(s.geometry, s.stops)}"/>`).join('')}</g></svg>`;
}
export async function createPNG(strokes: Stroke[], paper: boolean): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 3200;
  const c = canvas.getContext('2d'); if (!c) throw new Error('Canvas unavailable');
  if (paper) { c.fillStyle = '#faf9f2'; c.fillRect(0, 0, 3200, 3200); }
  c.translate(1600, 1600); c.scale(3200 / PAPER_SIZE, 3200 / PAPER_SIZE);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const s of strokes) {
    c.strokeStyle = s.color; c.lineWidth = s.width; c.stroke(new Path2D(pathData(s.geometry, s.stops)));
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}
let sequence = 1;
export function download(blob: Blob, extension: string): void {
  const date = new Date(), day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = `orbit-${day}-${String(sequence++).padStart(3, '0')}.${extension}`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
