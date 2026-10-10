import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),pages=readdirSync(root).filter(x=>x.endsWith('.html'));if(pages.length!==9)throw new Error('Expected nine standalone HTML entries');
let assets=0;
for(const page of pages){const html=readFileSync(resolve(root,page),'utf8');if(!html.includes('lang="zh-Hant"'))throw new Error(page+' missing language');for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const url=m[1];if(/^(?:https?:|data:|#)/.test(url))continue;if(!existsSync(resolve(root,url.split('?')[0])))throw new Error(page+' broken link: '+url);assets++}}
for(const dir of ['assets/js','tools'])for(const f of readdirSync(resolve(root,dir)).filter(f=>/\.(m?js|cjs)$/.test(f)))execFileSync(process.execPath,['--check',resolve(root,dir,f)]);
console.log(JSON.stringify({pass:true,htmlEntries:pages.length,localLinks:assets,syntax:'all JS / MJS / CJS passed'},null,2));
