// 靜態檢查：九個入口存在、引用的本地資產與連結都能解析、沒有外部執行期依賴。
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', '01-resonant-architecture.html', '02-chord-loom.html', '03-silence-cuts.html', '04-sound-fossil.html', '05-phase-tides.html', '06-breath-portrait.html', '07-echo-labyrinth.html', '08-stored-energy.html'];
let checked = 0;
for (const p of pages) {
  const html = readFileSync(join(root, p), 'utf8');
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (/^https?:/.test(ref)) { assert.ok(!/\.js$/.test(ref), `${p}: external script ${ref}`); continue; }
    const target = resolve(root, ref.split('?')[0]);
    assert.ok(existsSync(target), `${p}: missing ${ref}`); checked++;
  }
  if (p !== 'index.html') {
    for (const id of ['stage', 'art', 'poster', 'start', 'play', 'replay', 'mute', 'volume', 'status', 'readout']) assert.ok(html.includes(`id="${id}"`), `${p}: #${id}`);
    const map = JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/)[1]);
    assert.ok(existsSync(resolve(root, map.imports.three)), 'three import map target');
  }
}
// JS 模組的相對 import 都存在
const walk = d => readdirSync(d).flatMap(f => { const x = join(d, f); return statSync(x).isDirectory() ? walk(x) : [x]; });
for (const f of walk(join(root, 'assets/js'))) {
  const src = readFileSync(f, 'utf8');
  for (const [, ref] of src.matchAll(/from '(\.[^']+)'/g)) { assert.ok(existsSync(resolve(dirname(f), ref)), `${f}: import ${ref}`); checked++; }
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(src.replace(/\/\/.*$/gm, '')), `${f}: no network URLs in runtime code`);
}
console.log(`static check ok: ${pages.length} pages, ${checked} references`);
