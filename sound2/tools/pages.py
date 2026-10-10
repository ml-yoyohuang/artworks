#!/usr/bin/env python3
"""Generate the ten work entry pages for /sound2.

Each page is a thin, directly openable HTML entry: metadata, the shared
stylesheet, the vendored Tone.js, the shared core and the work's own script.
Run from anywhere:  python3 sound2/tools/pages.py
"""
import html
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

WORKS = [
    ("01-wave-relay", "快樂傳到下一個", "Pass It On", "#ebe5d8",
     "五條線接力：隆起沿線前進，到尾端彈出光點，下一條線接住後才出發。"),
    ("02-color-surfers", "今天的浪剛剛好", "The Wave Is Just Right", "#f1e6d2",
     "圓、方、三角乘著寬大的套色浪面滑行、蓄勢、騰空，在同一拍落地。"),
    ("03-elastic-ensemble", "聲音有彈性", "Sound Has Give", "#2a1f2d",
     "釘在支點間的厚橡皮帶：短音收緊、長音展開、重音拉開後回彈。"),
    ("04-occasional-unison", "這一拍，我們一起", "This Beat, Together", "#e9e6df",
     "三片扇形各以自己的週期靠攏，每十二拍恰好一起拼成完整圓盤。"),
    ("05-phrase-bows", "把旋律打個結", "Tie the Tune", "#dfe5dc",
     "兩條緞帶隨旋律靠近、繞行，在樂句尾端打成蝴蝶結，再慢慢鬆開。"),
    ("06-beat-pages", "每一拍都有另一面", "Every Beat Has a Back", "#d8d2c6",
     "一整面以中軸鉸接的紙片，隨節奏翻面，揭露背面的另一幅構圖。"),
    ("07-wave-dialogue", "你唱一句，我回一句", "You Sing, I Answer", "#17332b",
     "左右兩條波形角色一問一答，留白之後回應，句尾在中央接成一條。"),
    ("08-late-wave", "等一下，我也要！", "Wait, Me Too!", "#f3ecd6",
     "一排整齊起伏的小波裡，總有一個慢半拍，再用兩個小跳追上隊伍。"),
    ("09-rhythm-rosette", "這一拍，開花", "Bloom on the Beat", "#121a35",
     "多層紙感波緣花瓣輪流張合，樂句尾完整綻放，露出中心的顏色。"),
    ("10-swing-waves", "走路也可以是一首歌", "A Walk Is a Song", "#f3e2d6",
     "幾條色帶以長短交替的搖擺步伐散步、停下、回頭，再一起出發。"),
]

TEMPLATE = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{no} {zh} — 接得剛剛好</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="{bg}">
<meta property="og:title" content="{no} {zh} · {en}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="assets/previews/{id}.webp">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="assets/css/sound2.css">
<style>html,body{{background:{bg}}}</style>
</head>
<body>
<noscript><p style="padding:28px;font:14px/1.8 sans-serif">《{zh}》需要 JavaScript 才能即時生成畫面與聲音。<a href="./">回到目錄</a></p></noscript>
<script src="assets/js/vendor/tone-15.0.4.min.js" defer></script>
<script src="assets/js/core.js" defer></script>
<script src="assets/js/works/{id}.js" defer></script>
</body>
</html>
"""


def main():
    for wid, zh, en, bg, desc in WORKS:
        page = TEMPLATE.format(id=wid, no=wid[:2], zh=html.escape(zh), en=html.escape(en), bg=bg, desc=html.escape(desc))
        (ROOT / f"{wid}.html").write_text(page, encoding="utf-8")
        print("wrote", wid)


if __name__ == "__main__":
    main()
