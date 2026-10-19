// Rhythm: warm paper, botanical darks, coral / mustard / sage / blue / violet.
export const PLAY_INKS = ['#b34538', '#305c78', '#416b52', '#895277', '#926022', '#4e5290', '#a13b62', '#276a6a'] as const;
export const GEAR_MATERIALS = ['#c27165', '#5e9da6', '#9caa61', '#bf9449', '#9481ad'] as const;
export const PAPERS = [
  { name: '奶油白', english: 'CREAM', color: '#f8f1df', preferred: [0, 1, 2, 3], secondary: [4, 5, 6, 7] },
  { name: '檸檬黃', english: 'LEMON', color: '#efe4ae', preferred: [1, 3, 6, 7], secondary: [0, 2, 5] },
  { name: '蜜桃粉', english: 'PEACH', color: '#f1d7c9', preferred: [1, 2, 5, 7], secondary: [0, 3, 6] },
  { name: '薄荷綠', english: 'MINT', color: '#dce7ce', preferred: [0, 3, 5, 6], secondary: [1, 2, 4] },
  { name: '晴空藍', english: 'SKY', color: '#dae6eb', preferred: [0, 3, 4, 6], secondary: [1, 2, 5] },
  { name: '薰衣紫', english: 'LILAC', color: '#e7dded', preferred: [0, 2, 4, 7], secondary: [1, 3, 5] },
] as const;
const luminance = (hex: string) => {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
export function contrast(a: string, b: string): number { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function compatibleInks(paper: number): number[] {
  const p = PAPERS[paper];
  return [...p.preferred, ...p.secondary].filter(i => contrast(p.color, PLAY_INKS[i]) >= 4);
}
