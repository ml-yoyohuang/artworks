# coding: utf-8
import json,html
from pathlib import Path
r=Path(__file__).resolve().parents[1];e=json.loads((r/'exhibition.json').read_text());esc=html.escape
out='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>全部作品 — 間隙美術館 INTERVAL</title><style>body{margin:0;background:#1e2931;color:#eeece4;font:15px/1.9 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:40px 24px}h1,h2,h3{font-weight:400}h1{font-size:36px}a{color:inherit}section{margin:60px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:30px}img{width:100%;aspect-ratio:1.6;object-fit:contain}p{font-size:13px}article{border-bottom:1px solid #7d89864d;padding-bottom:24px}small{opacity:.65}h3{margin:12px 0}a:focus-visible{outline:2px solid #dac797}</style><main><a href="./">← 間隙美術館 INTERVAL</a><h1>世界尚未對齊</h1><p>A World Still Aligning ／ 完整作品目錄 · 35 件</p><p>形狀如何共處，規則如何產生秩序，材料如何留下時間？五個展廳各自遵守不同的空間規則。展場影像為原作停格；以下入口開啟真正的原作互動。本目錄不需要 JavaScript 或 WebGL。</p>'''
for s in e['sections']:
 out+=f'<section><h2>0{s["id"]} ｜ {s["name"]}</h2><p>{esc(s["text"])}</p><div class="grid">'
 for w in e['works']:
  if w['section']!=s['id']:continue
  out+=f'<article><a href="{w["entry"]}"><img src="{w["preview"]}" alt="{esc(w["name"])}的原作品停格" loading="lazy" width="720" height="450"></a><h3>{esc(w["name"])}</h3><small>{esc(w["en"])}</small><p>創作自述：{esc(w["selfStatement"])}</p><p>{esc(w["interaction"])}</p><a href="{w["entry"]}">進入原作品 ↗</a></article>'
 out+='</div></section>'
out+='</main></html>'; (r/'collection.html').write_text(out)
