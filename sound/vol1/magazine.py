"""Editorial index for the selected works; selection metadata stays in files."""
from html import escape
from pathlib import Path
from string import Template

HERE = Path(__file__).resolve().parent
EDITORIAL = [
    ('Resonant Architecture', '空氣有自己的骨架', '長音使薄壁凝聚，和弦改寫通道。走進一座由耳朵看見的建築。', '薄壁 / 拱門 / 持續音'),
    ('Chord Loom', '一首歌，被織成一匹布', '低音成為經線，旋律成為纖維。熟悉的樂句回來時，布面上的紋樣也跟著回來。', '纖維 / 紋樣 / 聲部'),
    ('Silence Cuts', '沉默把空間切開', '聲音繃緊紙面，劃開細縫；停下之後，沉默慢慢打開藏在深處的暖色。', '紙面 / 切口 / 留白'),
    ('Sound Fossil', '這首歌曾經存在', '一段旋律沉積成可被端詳的物件。最後一個音消失，生長停止，材料仍然記得。', '石灰 / 礦脈 / 記憶'),
    ('Phase Tides', '兩個幾乎同步的世界', '微小的速度差，逐漸成為一整片潮汐。兩層節奏慢慢錯開，再安靜地重新聚合。', '鈷藍 / 朱紅 / 相位'),
    ('Breath Portrait', '一口氣的肖像', '聲音開始，物件長出；聲音停下，留下氣息的輪廓。每一次停頓，都有自己的形狀。', '玻璃 / 孔隙 / 吐氣'),
    ('Echo Labyrinth', '房間是聲音走過的路', '每次回聲揭露一道牆。新出現的轉角，又讓下一個聲音走進原本看不見的通道。', '黑暗 / 轉角 / 回聲'),
    ('Stored Energy', '尚未發生的爆發', '細線繃緊，力量留下。越過臨界的那一個音，讓藏起來的顏色終於翻開。', '懸線 / 折殼 / 臨界'),
]


def card(work, position, featured=False):
    en, subtitle, invitation, materials = EDITORIAL[position]
    source = work['source']
    prefix = 'hybrid1' if work.get('variant') == 'hybrid' else source
    ext = 'webp' if source == 'test1' else 'jpg'
    image = f'assets/{prefix}/previews/{Path(work["page"]).stem}.{ext}'
    title = escape(work['title'])
    loading = 'eager' if featured else 'lazy'
    image_html = (f'<img src="{image}" alt="{title}的生成作品：{materials}" '
                  f'width="1280" height="800" loading="{loading}" decoding="async">') if source else '<span class="pending">作品準備中</span>'
    return f'''<article class="work{' featured' if featured else ''}">
      <a class="work-link" href="{work['page']}">
        <div class="work-image">{image_html}<span class="image-corner" aria-hidden="true">↗</span></div>
        <div class="work-copy">
          <p class="work-kicker"><span>{work['id']}</span> <span lang="en">{en}</span></p>
          <h{'2' if featured else '3'}>{title}</h{'2' if featured else '3'}>
          <p class="work-subtitle">《{subtitle}》</p>
          <p class="work-description">{invitation}</p>
          <p class="work-material">{materials}</p>
          {'<span class="read-work">走進作品 <span aria-hidden="true">→</span></span>' if featured else ''}
        </div>
      </a>
    </article>'''


def magazine(works):
    template = Template((HERE / 'templates/index.html').read_text())
    return template.substitute(
        feature=card(works[0], 0, True),
        gallery='\n'.join(card(w, i) for i, w in enumerate(works) if 1 <= i <= 4),
        finale='\n'.join(card(w, i) for i, w in enumerate(works) if i >= 5),
    )
