"""Build only vol1; test1 and test2 are read-only inputs."""
from pathlib import Path
import hashlib
import html
import json
import shutil
from hybrid import build_hybrid, hybrid_page
from magazine import magazine
from work_pages import unify_page

OUT = Path(__file__).resolve().parent
SOUND = OUT.parent


def source_hashes():
    return {
        str(p.relative_to(SOUND)): hashlib.sha256(p.read_bytes()).hexdigest()
        for source in ('test1', 'test2')
        for p in sorted((SOUND / source).rglob('*')) if p.is_file()
    }


def build():
    baseline = json.loads((OUT / 'source-integrity.json').read_text())
    if source_hashes() != baseline:
        raise SystemExit('來源檔案與建立紀錄時不同；請先確認來源變動。未執行生成。')
    works = json.loads((OUT / 'selections.json').read_text())['works']
    expected = [
        '01-resonant-architecture.html', '02-chord-loom.html',
        '03-silence-cuts.html', '04-sound-fossil.html', '05-phase-tides.html',
        '06-breath-portrait.html', '07-echo-labyrinth.html', '08-stored-energy.html',
    ]
    if len(works) != 8 or [w['page'] for w in works] != expected:
        raise SystemExit('主題清單或頁面名稱不正確。')
    if any(w['source'] not in (None, 'test1', 'test2') for w in works):
        raise SystemExit('source 只能是 null、test1 或 test2。')
    hybrids = [w for w in works if w.get('variant') == 'hybrid']
    if any(w['id'] != '01' or w['source'] != 'test1' or w.get('audio_source') != 'test2' for w in hybrids):
        raise SystemExit('混合版僅支援 01：test1 建築＋test2 音樂。')
    for source in sorted({w['source'] for w in works if w['source']}):
        shutil.copytree(SOUND / source / 'assets', OUT / 'assets' / source,
                        dirs_exist_ok=True)
        shutil.copyfile(SOUND / source / 'MUSIC_CREDITS.md',
                        OUT / f'MUSIC_CREDITS-{source}.md')
    if hybrids:
        build_hybrid(OUT, SOUND)
    records = ['# SOUND / VOL. 1 選擇紀錄', '',
                         '| 主題 | 收錄來源 |', '| --- | --- |']
    for position, w in enumerate(works):
        source, page = w['source'], w['page']
        title = html.escape(w['title'])
        label = source or '待選'
        if w.get('variant') == 'hybrid':
            label = '混合版：test1 建築＋test2 音樂'
        if source:
            content = (SOUND / source / page).read_text()
            content = content.replace('assets/', f'assets/{source}/')
            content = content.replace('href="MUSIC_CREDITS.md"',
                                      f'href="MUSIC_CREDITS-{source}.md"')
            # Preserve original creator credits; update collection branding only.
            if source == 'test1':
                content = content.replace('SOUND / 3　聲音成為物質', 'SOUND / VOL. 1　聲音選集')
                content = content.replace('｜聲音成為物質 SOUND / 3', '｜聲音選集 SOUND / VOL. 1')
            else:
                content = content.replace('<b>SOUND / 4</b><span>聲音的居所</span>',
                                          '<b>SOUND / VOL. 1</b><span>聲音選集</span>')
                content = content.replace(' — SOUND / 4</title>', ' — SOUND / VOL. 1</title>')
            if w.get('variant') == 'hybrid':
                content = hybrid_page(content)
            content = unify_page(content, w, works, position)
        else:
            content = document(f'{title} · 待選',
                               f'<h1>{w["id"]} {title}</h1><p>尚未指定收錄版本。</p><p><a href="index.html">返回選集目錄</a></p>')
        (OUT / page).write_text(content)
        records.append(f'| {w["id"]} {w["title"]} | {label} |')
    count = sum(bool(w['source']) for w in works)
    (OUT / 'index.html').write_text(magazine(works))
    (OUT / 'SELECTIONS.md').write_text('\n'.join(records) + '\n')
    if source_hashes() != baseline:
        raise SystemExit('來源完整性檢查失敗。')
    print(f'vol1 已生成：{count}/8 件已選；test1、test2 全部來源檔案雜湊一致。')


def document(title, body):
    return f'''<!doctype html>
<html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>
body{{max-width:1100px;margin:0 auto;padding:40px 24px;background:#f4f1e9;color:#272727;font:16px/1.7 system-ui}}
header{{margin-bottom:40px}}h1{{font-size:42px}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}}
article{{border-top:1px solid #aaa;padding:20px 0}}img{{width:100%;aspect-ratio:16/10;object-fit:cover}}a{{color:inherit}}footer{{margin-top:40px}}
</style>{body}</html>'''


if __name__ == '__main__':
    build()
