"""Reproducible overrides for 01 only; original source trees stay read-only."""
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent


def replace(path, old, new):
    text = path.read_text()
    if old not in text:
        raise ValueError(f'Hybrid patch target missing: {path.name}')
    path.write_text(text.replace(old, new))


def build_hybrid(out, sound):
    target = out / 'assets/hybrid1'
    shutil.copytree(sound / 'test1/assets', target, dirs_exist_ok=True)
    js = target / 'js'
    shutil.copyfile(js / 'audio.js', js / 'original-audio.js')
    for name in ('audio.js', 'score.js'):
        shutil.copyfile(HERE / 'hybrid' / name, js / name)
    model = js / 'model.js'
    replace(model, "import {adaptClassical}", "import {architectureScore,architectureChords} from './score.js';\nimport {adaptClassical}")
    replace(model, 'let e=[];let walls=null,source=null;',
            'if(index===0&&!p.soundtrack)return architectureScore(p);\n let e=[];let walls=null,source=null;')
    replace(model, "if(e.kind==='chord')s.chord=e.chord;",
            "if(e.kind==='chord'){s.chord=e.chord;s.chordNotes=e.chordNotes;s.chordName=e.chordName;}")
    replace(model, 'const c=CHORDS[s.chord];',
            'const c=params.soundtrack?CHORDS[s.chord%4]:architectureChords[s.chord].v;')
    replace(model, 'CHORDS[p.chord==null?k:Number(p.chord)]',
            'CHORDS[p.chord==null?k:Number(p.chord)%4]')
    # Keep test1's geometry within its designed bounds while following all voices.
    replace(model, '(c[k]-48)/12+', '(c[k]+(!params.soundtrack&&k===0?12:0)-48)/12+')
    replace(js / 'interactions.js', 'const base=[[48,55,60,64],[45,52,59,64],[41,53,57,60],[43,50,57,62]][model().state.chord]',
            'const base=model().state.chordNotes||[[48,55,60,64],[45,52,59,64],[41,53,57,60],[43,50,57,62]][model().state.chord%4]')
    replace(js / 'works.js', "['C · MAJOR','A · MINOR / 9','F · OPEN','G · SUSPENDED'][s.chord]",
            "s.chordName||['C · MAJOR','A · MINOR / 9','F · OPEN','G · SUSPENDED'][s.chord%4]")
    catalog = js / 'catalog.js'
    catalog.write_text(catalog.read_text().replace('duration:32,loop:true},', 'duration:64,loop:true},', 1))
    # Only work 01 is loaded from this isolated copy. Classical themes remain 32s.
    replace(js / 'core.js', "volume:.45", "volume:.6")
    replace(js / 'core.js', 'let model=createModel', 'audio.volume=.6;audition.volume=.6;\nlet model=createModel')
    replace(js / 'core.js', "model=createModel(index,state.seed,params);model.state.gallery=gallery;",
            "work.duration=params.soundtrack?32:64;model=createModel(index,state.seed,params);model.state.gallery=gallery;")
    replace(js / 'core.js', 'if(params.chord!=null)model.state.chord=params.chord;',
            'if(params.chord!=null){model.state.chord=params.chord;const chosen=model.data.events.find(e=>e.kind===\'chord\'&&e.chord===params.chord);model.state.chordNotes=chosen?.chordNotes;model.state.chordName=chosen?.chordName;}')
    replace(js / 'core.js', 'audio.ctx&&audio.voice({...e,t,d:params.short?1.1:3},audio.origin+t)',
            "if(audio.ctx){if(params.soundtrack)audio.voice({...e,t,d:params.short?1.1:3},audio.origin+t);else for(const pad of model.data.events.filter(p=>p.voice==='architecture-pad'&&p.t>=e.t&&p.t<e.t+2))audio.voice({...pad,t:t+pad.t-e.t},audio.origin+t+pad.t-e.t)}")


def hybrid_page(content):
    content = content.replace('assets/test1/', 'assets/hybrid1/')
    content = content.replace('value="0.45"', 'value="0.6"')
    content = content.replace('明亮 · C 大調', '中殿 · Cmaj7').replace('懸念 · A 小調九度', '中殿 · Am9')
    content = content.replace('開闊 · F 開放和弦', '中殿 · Fmaj7♯11').replace('未定 · G 掛留', '中殿 · G6sus')
    content = content.replace('</select><label class="sr-only" for="short">',
        '<option value="4">中殿 · Em7</option><option value="5">中殿 · Am7</option><option value="6">中殿 · Dm9</option><option value="7">中殿 · Gsus4</option></select><label class="sr-only" for="short">', 1)
    content = content.replace('原創程式作曲 · 按開始或親手操作才啟動聲音。',
        '建築取自 test1；自動展演音樂取自 test2。按開始或親手操作才啟動聲音。')
    content = content.replace('聲音與生成：SOUND / 3 ·',
        '建築：SOUND / 3 · 音樂：SOUND / 4 · <a href="MUSIC_CREDITS-test2.md">音樂來源</a> ·')
    content = content.replace('Canvas 2D 透視投影、Web Audio 合成、和弦與平滑包絡。',
        'Canvas 2D 透視投影、Web Audio 雙振盪器持續音、FM 鐘音與卷積殘響；音畫使用同一時鐘。')
    return content
