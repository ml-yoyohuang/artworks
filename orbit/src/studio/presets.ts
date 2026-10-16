import { clone, defaultAppearance, defaultCurve, object, type Artwork, type Appearance, type BrushKind, type Curve, type Motion } from './types';

const curve = (kind: Curve['kind'], patch: Partial<Curve> = {}) => ({ ...defaultCurve(kind), ...patch });
export const GEOMETRIES = [
  { name: 'Stillwater', concept: '細密水紋，回到安靜的中心。', geometry: curve('hypo', { R: 120, r: 52, d: 44 }) },
  { name: 'Seed Cathedral', concept: '七瓣的植物性結構，保留呼吸的空間。', geometry: curve('rose', { k: 7, phase: .4 }) },
  { name: 'Tidal Knot', concept: '外側滾動的結，在空間中彼此穿越。', geometry: curve('epi', { R: 84, r: 32, d: 54 }) },
  { name: 'Counterpoint', concept: '三組諧波，像弦樂交錯的聲部。', geometry: curve('harmonic', { phase: .5 }) },
  { name: 'Small Satellites', concept: '一個軌道，搭載另一個軌道。', geometry: curve('nested', { terms: [{ amplitude: 1, frequency: 1, phase: 0 }, { amplitude: .32, frequency: 7, phase: 0 }, { amplitude: .12, frequency: -19, phase: .5 }] }) },
  { name: 'Eightfold Silence', concept: '八瓣留白，像折紙未完成的折線。', geometry: curve('rose', { k: 4 }) },
  { name: 'Long Return', concept: '十三次公轉，才重新遇到起點。', geometry: curve('hypo', { R: 112, r: 52, d: 24 }) },
  { name: 'Open Horizon', concept: '不強求閉合的軌跡，一段有界的時間。', geometry: curve('epi', { R: 100, r: 31.4159265359, d: 38, turns: 9 }) },
  { name: 'Paper Tide', concept: '開放的雙聲部，在頁面上緩慢起伏。', geometry: curve('harmonic', { phase: 1.2, terms: [{ amplitude: 1, frequency: 2, phase: 0 }, { amplitude: .65, frequency: 3, phase: .6 }] }) },
  { name: 'Lace Meridian', concept: '機械精度與織物密度，彼此平衡。', geometry: curve('hypo', { R: 144, r: 55, d: 50 }) },
  { name: 'Five Suns', concept: '幾個簡單圓周，形成天體的花冠。', geometry: curve('epi', { R: 100, r: 20, d: 22 }) },
  { name: 'Interrupted Clock', concept: '反向軌道切出不規則的韻律。', geometry: curve('nested', { phase: .8, terms: [{ amplitude: 1, frequency: 1, phase: 0 }, { amplitude: .58, frequency: -3, phase: .4 }, { amplitude: .23, frequency: 8, phase: 1.2 }, { amplitude: .09, frequency: -13, phase: 0 }] }) },
];
const ink = (name: string, brush: BrushKind, palette: string[], width: number, opacity: number, texture: number, cycles: number, blend: Appearance['blend'] = 'normal') => ({ name, appearance: { ...defaultAppearance(), brush, palette, width, opacity, texture, cycles, blend } });
export const INK_PRESETS = [
  ink('Prussian Hairline', 'archival', ['#244f63'], 1.2, .95, .1, 1),
  ink('Carbon Etching', 'archival', ['#393a37'], .95, .9, .35, 1),
  ink('Vermilion Seal', 'archival', ['#a84334'], 2.2, .9, .6, 1),
  ink('Tide & Clay', 'thread', ['#365a67', '#929886', '#b8674d'], 2.1, .95, .1, 1),
  ink('Botanical Silk', 'thread', ['#364f42', '#a18b57', '#796275'], 1.6, 1, .2, 3),
  ink('Dusk Weft', 'thread', ['#624c70', '#c29486', '#2c4c61'], 2.7, .88, .6, 2),
  ink('Champagne Leaf', 'foil', ['#796238', '#f5e4b8', '#ad8751'], 2, 1, .3, 1),
  ink('Silver Meridian', 'foil', ['#56636a', '#eaf1ef', '#8c9b9b'], 2.3, 1, .65, 2),
  ink('Copper Fault', 'foil', ['#733f31', '#e7b597', '#ac694c'], 3, .92, .8, 3),
  ink('Moonwire', 'luminous', ['#a4c9ce', '#ecf3e4'], 1.5, .95, .2, 1, 'screen'),
  ink('Amber Signal', 'luminous', ['#d4a16b', '#f3deba'], 1.4, .85, .5, 2, 'screen'),
  ink('Violet Afterimage', 'luminous', ['#a79aba', '#dfd6e8'], 1.3, .85, .75, 3, 'screen'),
  ink('Indigo Overprint', 'pigment', ['#385c76', '#b26a55'], 2.5, .42, .25, 1, 'multiply'),
  ink('Carmine Tissue', 'pigment', ['#b05468', '#ae995f'], 5, .28, .55, 2, 'multiply'),
  ink('Forest Plates', 'pigment', ['#4b6955', '#d0a365'], 1.3, .65, .8, 3, 'multiply'),
  ink('Graphite Dust', 'particle', ['#434e50', '#829392'], 1.4, .9, .22, 1),
  ink('Pollen Archive', 'particle', ['#9b7950', '#b35c3c'], 2.4, .9, .7, 2),
  ink('Mineral Veil', 'particle', ['#557d82', '#aaa58c'], 1.4, .85, 1, 3),
];
const motion = (name: string, kind: Motion['kind'], amplitude: number, period: number, phase = 0, echoes = 4) => ({ name, motion: { kind, amplitude, period, phase, echoes } });
export const MOTIONS = [
  motion('Petal respiration', 'breathe', .22, 12), motion('Tidal aperture', 'breathe', .45, 20, 1.2),
  motion('Sidereal drift', 'drift', .5, 24), motion('Pendulum field', 'drift', .9, 15, .8),
  motion('Fold / unfold', 'morph', .55, 16), motion('Tracing memory', 'echo', .3, 18, 0, 5),
  motion('Quiet interference', 'echo', .65, 26, .9, 3), motion('Sequential garden', 'bloom', .3, 14),
];
export const TEMPLATES = [
  { name: 'Botanical specimen', note: '單一主體，細小註記，讓留白成為展示櫃。' },
  { name: 'Geometric constellation', note: '三個尺度，斜向排列的視線。' },
  { name: 'Editorial cover', note: '字與曲線交錯，建立封面的視覺重量。' },
  { name: 'Repetition study', note: '九格重複，以相位留下微小差異。' },
  { name: 'Asymmetric balance', note: '偏心主體與小型對位，拉出張力。' },
  { name: 'Optical density', note: '微小錯位，層層加深的視覺重心。' },
];
export function blank(seed = 107): Artwork {
  return { schemaVersion: 2, id: `work-${seed}`, title: 'Stillwater / 靜水', statement: '一點墨水，在時間裡摺成水紋。', seed,
    artboard: { width: 1000, height: 1200 }, paper: { kind: 'cotton', color: '#f6f3e9', grain: .24, registration: 1.2, density: .75, light: 135 },
    timeline: { time: 0, duration: 24, speed: 1, loop: true }, objects: [object(`curve-${seed}`)] };
}
export function template(source: Artwork, index: number): Artwork {
  const art = clone(source), base = clone(art.objects.find(o => o.type !== 'text') || object('base'));
  art.artboard = index === 3 ? { width: 1200, height: 1000 } : { width: 1000, height: 1200 };
  const arrangements = [
    [[500, 560, 1.15, 0]], [[340, 400, .7, 0], [690, 620, .43, 22], [460, 900, .24, -16]],
    [[640, 590, 1.5, -12]], Array.from({ length: 9 }, (_, i) => [210 + i % 3 * 390, 220 + Math.floor(i / 3) * 290, .35, i * 7]),
    [[680, 460, 1.16, 18], [220, 860, .4, -28]], [[500, 570, 1.12, 0], [506, 574, 1.04, 12], [489, 580, .94, -12]],
  ][index];
  art.objects = arrangements.map(([x, y, scale, rotation], i) => ({ ...clone(base), id: `shape-${art.seed}-${i}`, name: `${base.name} ${i + 1}`, transform: { x, y, scale, rotation }, motion: { ...base.motion, phase: i * .5 } }));
  const label = object(`title-${art.seed}`); label.type = 'text'; label.name = 'Title'; label.text.content = art.title.split(' / ')[0];
  label.text.font = 'Instrument Serif'; label.text.size = index === 2 ? Math.min(114, 1680 / label.text.content.length) : 48; label.text.align = index === 2 || index === 4 ? 'start' : 'middle';
  label.transform = { x: index === 2 || index === 4 ? 70 : art.artboard.width / 2, y: index === 2 ? 190 : art.artboard.height - 150, scale: 1, rotation: 0 };
  label.appearance.palette = [art.paper.color === '#182329' ? '#e2dfcc' : '#353e3c']; art.objects.push(label);
  const note = clone(label); note.id = `note-${art.seed}`; note.name = 'Annotation'; note.text = { content: 'ORBIT  /  STUDIES IN GEOMETRY  /  02', font: 'IBM Plex Mono', size: 11, weight: 400, align: label.text.align }; note.transform.y += index === 2 ? 42 : 34; art.objects.push(note);
  return art;
}
const collection = [
  ['Stillwater / 靜水', '細密的靛藍回聲，被一張棉紙安靜收下。', 0, 0, 0, 'cotton'],
  ['Herbarium / 無名植物', '七瓣的形體，不為任何真實植物命名。', 1, 4, 0, 'washi'],
  ['Copper Atlas / 銅的地圖', '外旋輪的地形，被金屬高光逐一描出。', 2, 8, 4, 'cotton'],
  ['Counterpoint / 對位', '大小曲線如聲部，彼此隔著一段留白。', 3, 3, 1, 'cotton'],
  ['Satellites / 微小天體', '主軌道與衛星，分散成一個天文標本。', 4, 1, 1, 'cotton'],
  ['Eight Rooms / 八個房間', '八瓣花形反覆出現，像一份空間目錄。', 5, 2, 3, 'screen'],
  ['Long Return / 歸途', '十三次公轉後，時間終於接上自己。', 6, 6, 0, 'cotton'],
  ['Unclosed / 未閉合', '不必完成的軌跡，留給下一個時間點。', 7, 5, 2, 'cotton'],
  ['Paper Tide / 紙潮', '兩組諧波在紙面留下不同方向的潮汐。', 8, 12, 4, 'riso'],
  ['Lace Meridian / 緯線', '透明顏料逐層套印，重心浮出紙面。', 9, 14, 5, 'riso'],
  ['Five Suns / 五個太陽', '簡單而精準的五重結構，像印章般明確。', 10, 2, 0, 'screen'],
  ['Clock Without Hands / 無針鐘', '反向頻率切出時間的齒。', 11, 7, 2, 'cotton'],
  ['Moonwire / 月光絲', '有限的微光，留住線條而非吞沒黑夜。', 6, 9, 1, 'cotton'],
  ['Pollen Index / 花粉索引', '顆粒不是裝飾，是曲線留下的沉積。', 1, 16, 3, 'washi'],
  ['Blind Memory / 無墨的記憶', '紙面微小的起伏，讓光替墨水說話。', 0, 1, 0, 'emboss'],
  ['Mineral Weather / 礦物氣候', '嵌套軌道在礦物般的粒子中慢慢消散。', 11, 17, 4, 'washi'],
  ['Afterimage / 留光', '諧波過去的幾個瞬間，彼此錯身。', 3, 11, 5, 'cotton'],
  ['Carmine Register / 洋紅套版', '厚薄不同的半透明色版，形成新的邊界。', 2, 13, 2, 'riso'],
] as const;
export const ARTWORKS: Artwork[] = collection.map(([title, statement, geometry, inkIndex, layout, paper], i) => {
  let art = blank(107 + i * 997); art.title = title; art.statement = statement; art.paper.kind = paper;
  const o = art.objects[0]; o.geometry = clone(GEOMETRIES[geometry].geometry); o.name = GEOMETRIES[geometry].name;
  o.appearance = clone(INK_PRESETS[inkIndex].appearance); o.appearance.seed = art.seed;
  if ([12, 16].includes(i)) art.paper.color = '#182329';
  if (i === 16) o.motion = clone(MOTIONS[5].motion);
  if (i === 1) o.motion = clone(MOTIONS[0].motion);
  if (i === 4) o.motion = clone(MOTIONS[2].motion);
  art = template(art, layout);
  if (i === 1) {
    const inner = clone(art.objects[0]); inner.id += '-fold'; inner.geometry.phase += .3; inner.transform.scale *= .84; inner.appearance.palette.reverse(); art.objects.splice(1, 0, inner);
  }
  return art;
});
export function artwork(index: number): Artwork { return clone(ARTWORKS[index]); }
