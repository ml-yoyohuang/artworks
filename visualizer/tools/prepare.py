from pathlib import Path
import shutil,re,json,hashlib
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'visualizer'
old=[p for d in ['sound','sound2','sound3','sound4','_incoming-assets'] for p in (ROOT/d).rglob('*') if p.is_file()]
if not (OUT/'_qa/original-hashes.json').exists():
    (OUT/'_qa/original-hashes.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in old},indent=2))
# Local, detached controls let original scene initialization run without its exhibition UI.
proxy='''const document = {createElement: (...a) => globalThis.document.createElement(...a), body: globalThis.document.createElement('div'), head: globalThis.document.createElement('div'), querySelectorAll: () => [], getElementById: () => globalThis.document.createElement('button'), querySelector: () => globalThis.document.createElement('button')};\n'''
registry=[]
html=(ROOT/'sound/index.html').read_text()
cards=re.findall(r'<a class="card" href="([^"/]+)\.html">(.*?)</a>',html)
runtime=(ROOT/'sound/tools/runtime.js').read_text(); helpers=runtime[runtime.index('function circle('):runtime.index('function fire(')]
for i,(slug,card) in enumerate(cards):
    page=(ROOT/f'sound/{slug}.html').read_text(); config=re.search(r'const CONFIG=(.*?);',page).group(1)
    name=re.search(r'<h3>(.*?)</h3>',card).group(1)
    scene=(ROOT/f'sound/tools/scenes/{slug}.js').read_text()
    dest=OUT/f'sources/sound/{slug}.js';dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text('export function createScene(canvas,state) {\n'+proxy+'const CONFIG='+config+';\nconst ctx=canvas.getContext("2d"),C=CONFIG.palette,INK="#303d36",TAU=Math.PI*2;\nconst clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,p)=>a+(b-a)*p,ease=p=>1-Math.pow(1-clamp(p,0,1),3);\nconst rnd=i=>{const n=Math.sin(i*127.1+CONFIG.id*311.7)*43758.5453;return n-Math.floor(n);};\nconst feedback=()=>{},userNote=()=>{},userPop=()=>{},userDrum=()=>{},requestDraw=()=>{},cancelPhrase=()=>{},playPhrase=()=>{},scaleNotes=()=>[48,50,52,55,57,60,62,64],scaleIndex=v=>Math.round(clamp(v,0,1)*7),noteName=m=>String(m),sceneRef=null;\n'+helpers+'\n'+scene+'\nreturn {scene,config:CONFIG};\n}\n')
    registry.append(dict(id='s1-'+slug,series=1,index=i,name=name,en=re.search(r'<span class="card-en">(.*?)</span>',card).group(1),module=f'../sources/sound/{slug}.js',renderer='Canvas 2D',mapping='頻段包絡 · 音樂起音',bg=json.loads(config)['bg']))
core=(ROOT/'sound2/assets/js/core.js').read_text();u=core[core.index('  var U = {};'):core.index('  var V =')]
p=OUT/'sources/sound2/utils.js';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(u+'\nexport {U};\n')
entries=re.findall(r"\{ id: '([^']+)', no: '[^']+', zh: '([^']+)', en: '([^']+)', kind:",core)
for i,(slug,name,en) in enumerate(entries):
    source=(ROOT/f'sound2/assets/js/works/{slug}.js').read_text()
    p=OUT/f'sources/sound2/{slug}.js';p.write_text('import {U} from "./utils.js";\nexport function createDefinition() {\n'+proxy+'let definition; const Sound2={U,V:{},start:def=>definition=def};\n'+source+'\nreturn definition;\n}\n')
    registry.append(dict(id='s2-'+slug,series=2,index=i,name=name,en=en,module=f'../sources/sound2/{slug}.js',renderer='Canvas 2D',mapping='包絡 · 起音 · 音樂相位',bg='#eae5d9'))
# Read-only copies; subsequent adaptations live exclusively in visualizer.
for series in [3,4]:
    src=ROOT/f'sound{series}/assets/js';dst=OUT/f'sources/sound{series}'
    shutil.copytree(src,dst,dirs_exist_ok=True)
# Renderer needs only phaseAt, not interaction audio.
p=OUT/'sources/sound3/works.js';s=p.read_text().replace("import {phaseAt} from './interaction-model.js';", "const phaseAt=(p,t)=>p.phaseBase||[t*.25,t*.26];");p.write_text(s)
shutil.copytree(ROOT/'sound4/assets/vendor/three',OUT/'vendor/three',dirs_exist_ok=True)
# Three helper originally imports vendor through its original directory hierarchy.
p=OUT/'sources/sound4/core/three-kit.js';p.write_text(p.read_text().replace("../../vendor/three/", "../../../vendor/three/"))
(OUT/'sources/sound4/core/shell.js').write_text('export const radioGroup=()=>{}; export const runWork=()=>{};\n')
for p in (OUT/'sources/sound4/works').glob('*.js'):
    s=p.read_text();s=re.sub(r"if \(typeof window !== 'undefined'.*?runWork\(work\);",'',s)
    p.write_text(proxy+s+'\nexport function createWork(){ return {...work}; }\n')
names=['共振建築','和弦織機','休止符','聲音化石','相位潮汐','呼吸雕塑','回聲迷宮','能量蓄積'];slugs=['architecture','loom','cuts','fossil','tides','breath','echo','energy'];ens=['RESONANT ARCHITECTURE','CHORD LOOM','SILENCE CUTS','SOUND FOSSIL','PHASE TIDES','BREATH PORTRAIT','ECHO LABYRINTH','STORED ENERGY'];bgs=['#e5e8eb','#eae4d7','#272825','#11100e','#101e27','#182621','#101920','#cec7bb']
for series in [3,4]:
    for i,(slug,name,en,bg) in enumerate(zip(slugs,names,ens,bgs)):
        registry.append(dict(id=f's{series}-{slug}',series=series,index=i,name=name,en=en,module=f'../sources/sound{series}/works/{i+1:02d}-{slug}.js' if series==4 else '',renderer=('GLSL' if i in [2,4] else 'Canvas 2D' if i==1 else 'Three.js') if series==4 else 'Canvas 2D · 2.5D',mapping='頻段 · 能量 · 有界材料歷史',bg=bg))
(OUT/'presets/registry.js').write_text('export const presets = '+json.dumps(registry,ensure_ascii=False,indent=2)+';\n')
tracks=[dict(title=p.stem,src='../'+str(p.relative_to(ROOT))) for p in sorted((ROOT/'_incoming-assets/free-mp3').glob('*.mp3'))]
(OUT/'audio/tracks.js').write_text('export const tracks = '+json.dumps(tracks,ensure_ascii=False,indent=2)+';\n')
print('Prepared',len(registry),'presets;',len(tracks),'local test tracks; hashed',len(old),'existing files.')
