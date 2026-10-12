from pathlib import Path
import json
base=Path(__file__).resolve().parents[1]
choices=json.loads((base/'presets/selections.json').read_text())['themes']
p=base/'presets/registry.js'
s=p.read_text().split('export const presets = ',1)[1].split(';',1)[0]
registry=json.loads(s)
selected={c['presetId']:c for c in choices}
missing=set(selected)-{p['id'] for p in registry}
if missing: raise SystemExit('Missing selected presets: '+str(missing))
kept=[p for p in registry if p['series']<3]
for c in choices:
 p=next(p.copy() for p in registry if p['id']==c['presetId'])
 p['sourceChoice']=c['source'];p['theme']=c['theme'];kept.append(p)
redirects={c['retiredPresetId']:c['presetId'] for c in choices}
(base/'presets/registry.js').write_text('export const presets = '+json.dumps(kept,ensure_ascii=False,indent=2)+';\nexport const retiredPresetRedirects = '+json.dumps(redirects,ensure_ascii=False,indent=2)+';\n')
lines=['# 視覺化作品選擇','', '每個主題只收錄下列一版；原作僅供讀取，未修改 test1/test2。其他 rhythm 作品維持原選集。','', '| 主題 | 名稱 | 保留來源 | 淘汰的視覺預設 |','| --- | --- | --- | --- |']
for c in choices:lines.append(f"| {c['theme']:02d} | {c['name']} | `{c['source']}`（原 `{c['previousSource']}`） | `{c['retiredPresetId']}` |")
lines+=['','正式選擇紀錄：`presets/selections.json`。淘汰版不出現在清單、前後切換或自動輪播。舊預設連結轉到該主題保留版。共 34 個預設：rhythm/vol1 16 個、rhythm/vol2 10 個、主題選集 8 個。','', '共享轉接器的內部來源副本可保留，但不註冊為可用效果；WebGL 不可用時只替代為已選定的共振建築，不啟用淘汰版。']
(base/'SELECTIONS.md').write_text('\n'.join(lines)+'\n')
print('Selected',len(choices),'themes;',len(kept),'presets total')
