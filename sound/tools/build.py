from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
# Each emitted page embeds its own stylesheet, runtime and scene; no shared local dependency.
WORKS=[
('jelly-wave','果凍波','Jelly, gently','把一條旋律，盛進會晃動的軟糖。','波形有了柔軟的皮膚，音符便在裡面來回翻身。它抵達邊緣時輕輕彈回，像一個不願結束的笑。','拖曳果凍，放開讓它彈回；左右移動改變音域。','#f6e7dc',['#e76946','#efaaac','#496d59','#e7bb3e'],94,'sine','soft',0),
('pendulum-swing','彩虹鞦韆','A chorus of arcs','各自的擺長，偶爾成為共同的風。','十二座鞦韆共享一根細線，卻保留十二種等待的長度。隊形在散開與相遇之間，慢慢寫出一首沒有指揮的歌。','左右移動牽引擺幅；點一下，送出一陣風。','#e7eddf',['#dd6148','#e0af3d','#6388b0','#9d75a0'],88,'triangle','soft',0),
('ribbon-dance','緞帶體操','A little flourish','旋律摺起、翻身，再散成一條緞帶。','緞帶沒有正面，也不急著交代去向。三種顏色在同一個空間裡穿梭，把聲音的尾巴繫成輕盈的結。','移動指尖改變緞帶弧度；點一下，讓音高翻身。','#f4eacc',['#d35157','#426cb6','#dd9e29','#407f69'],108,'triangle','soft',0),
('bubble-scale','泡泡音階','Notes in the air','把音符吹大，讓它們互相打招呼。','高音是小小的玻璃球，低音藏在圓潤的大泡泡裡。它們相遇時交換一點動量，沒有誰需要讓出整片天空。','點擊吹出新泡泡；左右位置決定音高與泡泡大小。','#e3ecec',['#458b98','#e58c64','#bf8dab','#b2bd54'],102,'sine','soft',0),
('beat-candy','節拍糖果','Sweet accumulation','一拍一顆，把時間堆成甜甜的小山。','糖果從看不見的口袋落下，逐漸堆成一座彩色的地形。重力讓每一拍有了重量，碰撞則留下一點不整齊的快樂。','點擊灑下糖果；拖動調整落點，滑桿改變節拍。','#f0e1df',['#d85d4f','#e5b637','#688aa9','#9880af'],116,'triangle','drum',1),
('tap-floor','踢踏地板','A floor that listens','腳步一亮，地板便記得你的節奏。','一片奶油色的地板，把鼓聲收進交錯的方格。每一次落腳都像蓋上一枚郵票，亮光卻會在下一拍之前溫柔退場。','點擊地板留下鼓點；移動位置改變下一拍的落腳。','#e9e7d3',['#477864','#eaa04b','#d5685a','#6379ae'],112,'square','drum',1),
('popcorn-rhythm','爆米花節奏','Small explosions','安靜的種子，也有突然起舞的時候。','橘紅色的盤子盛著一群等待起跳的小種子。節奏加快時，它們同時鬆開地面，把一個平凡的下午爆成慶典。','點擊催促一輪爆跳；提高節拍，讓更多種子一起起舞。','#f2e8cb',['#e4663d','#f5c44e','#718262','#f8f1df'],128,'triangle','drum',1),
('hopscotch','跳房子','One more square','球把每一拍，都當成下一個家。','一枚小球穿過錯落的格子，落地時留下一圈彩色的記號。路線沒有終點，只有一次比一次更熟悉的起跳。','點擊選擇下一個格子；左右移動改變小球的音域。','#e7e6ed',['#d96250','#5c809f','#b194be','#dbb645'],104,'sine','drum',1),
('flower-choir','合唱的花','A garden in tune','輪到自己的那一拍，就開一朵花。','五朵花把同一段旋律分成五個小小的角色。花瓣輪流張開，枝葉接住鄰居的搖擺，花園於是學會彼此聆聽。','點擊花朵邀它獨唱；移動指尖帶起枝葉的風。','#e9edda',['#d66753','#e4b337','#7a84bb','#dd9fba'],92,'sine','choir',2),
('canon-ripples','輪唱漣漪','After you, again','同一句旋律，從三處不同的時間出發。','三個聲部依次投下同一段旋律，水面把時間差攤成一圈圈色彩。漣漪追上彼此時，交會的地方便有了新的風景。','點擊移動最近的聲源；三個聲部會繼續錯開輪唱。','#e2e9df',['#427b79','#e07951','#a78ca6','#ccac44'],100,'sine','canon',2),
('metronome-party','節拍器派對','Finding the together','先各跳各的，再慢慢找到彼此。','六個節拍器帶著各自的脾氣走進派對。共同的脈搏逐漸拉近它們，整齊並非命令，而是一種越來越舒服的靠近。','點擊重新打散節拍；觀察它們在二十秒內逐漸同步。','#f0e1d5',['#c86448','#daae3f','#728cab','#9c7da0'],96,'triangle','metro',2),
('signal-band','交通號誌樂團','The crossing sings','城市暫停的地方，偷偷排練一首歌。','紅燈唱低音，黃燈留一個短短的停頓，綠燈把下一句送出去。路口的秩序變成一組輕快的和聲，等待也能成為跳舞的理由。','點擊讓樂團換一段節奏；左右移動替旋律轉調。','#e4e9e6',['#d6624c','#e7b43d','#4d896c','#7589b1'],110,'triangle','signal',2),
('square-blocks','方波積木','A place for a pulse','把硬硬的波，蓋成小小的家。','方波的轉角離開座標軸，成為一塊塊有重量的積木。門窗在節拍之間出現，聲音原來也能住進一座溫暖的房子。','點擊換一張建築樂譜；移動指尖改變積木的高度。','#eee5d5',['#d96d4d','#536f9d','#e2b642','#7f936d'],98,'square','soft',3),
('saw-hills','鋸齒山丘','Downhill, uphill','一條鋸齒，是一片可以滑行的風景。','陡峭的波峰變成奶油色天空下的山丘，小人順著旋律向下滑。抵達谷底的那一瞬間，又有一座新的山把它接起來。','移動指尖改變山勢；點擊讓滑行者輕輕躍起。','#f4e9ce',['#e17a50','#688d76','#dcb94a','#6f8cac'],106,'sawtooth','soft',3),
('crayon-wave','波形塗鴉','Please colour the sound','畫歪一點，聲音就更像你的字跡。','三支蠟筆在紙上練習同一條波形，卻怎麼也畫不成完全一致的線。抖動與留白讓旋律保留手的溫度，每一道偏差都是新的簽名。','拖曳畫下自己的蠟筆線；垂直位置改變旋律音域。','#f5ecde',['#d3664b','#4c8093','#c6a63e','#b17c9d'],90,'triangle','soft',3),
('spring-dancer','彈簧舞者','Stretch, then smile','伸長的等待，縮成一次開心的跳躍。','五位彈簧舞者把鼓點藏在自己的肚子裡。它們伸展、壓縮，再把儲存的力氣交給下一個伙伴，像一場不需要語言的接力。','點擊壓縮舞者；移動指尖改變隊形的彈性。','#e8e5ee',['#d96950','#d8ac39','#5c8d80','#8582b2'],118,'triangle','drum',3),
]
GROUPS=[('會跳舞的波形','DANCING WAVES','波形先鬆開座標，才找到身體。'),('節奏的遊戲感','PLAYFUL PULSES','每一拍，都是可以落腳的地方。'),('愉快的合奏','HAPPY ENSEMBLES','留一點時間差，讓彼此相遇。'),('波形的變身','SHAPESHIFTING SCORES','聲音離開線條，長成新的風景。')]
css=(ROOT/'tools/style.css').read_text()
runtime=(ROOT/'tools/runtime.js').read_text()
scenes=json.loads((ROOT/'tools/scenes.json').read_text())
head=lambda title,desc:f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="{desc}"><meta name="theme-color" content="#f6f1e7"><link rel="icon" href="data:,"><title>{title} — 小小聲音遊樂場</title><style>{css}</style></head>'''
for i,w in enumerate(WORKS):
 slug,title,en,short,desc,hint,bg,palette,bpm,osc,mode,group=w
 cfg=dict(id=i,slug=slug,title=title,en=en,bg=bg,palette=palette,bpm=bpm,osc=osc,mode=mode)
 page=head(title,short)+f'''<body style="--stage:{bg};--accent:{palette[0]}"><div class="shell"><header class="mast"><a href="index.html">← 小小聲音遊樂場</a><span>SOFT SCORES / {i+1:02d}—16</span></header><main class="exhibit"><section class="art-column" aria-label="{title}互動作品"><div class="stage"><div class="stage-label"><span>{GROUPS[group][1]}</span><span class="live-label">SILENT REHEARSAL</span></div><canvas id="art" tabindex="0" aria-label="{title}。{hint}"></canvas><div class="stage-bottom"><span class="dots" aria-hidden="true">● ● ● ●</span><span>{en.upper()}</span></div></div><div class="toolbar"><button id="start" class="primary">開始聆聽 <span>↗</span></button><button id="mute" disabled aria-pressed="false">靜音</button><button id="motion" aria-pressed="false">暫停動態</button><div class="tempo"><label for="tempo">節拍 <output id="bpm">{bpm}</output></label><input id="tempo" type="range" min="64" max="160" value="{bpm}" aria-label="每分鐘節拍"></div></div><p id="status" role="status">聲音等待你的邀請。畫面已開始輕輕呼吸。</p></section><aside class="label"><div class="work-no">{i+1:02d}<span> / {GROUPS[group][0]}</span></div><h1>{title}</h1><div class="english">{en}</div><p class="lede">{short}</p><p class="statement">{desc}</p><div class="hint"><span>一起玩 / PLAY</span><p>{hint}</p><small>畫布聚焦後：方向鍵改變位置，Enter 加入一拍。<br>空白鍵切換聲音。</small></div><div class="material">CANVAS 2D · LIVE SYNTHESIS<br>原創合成樂譜 / 不需要音檔</div></aside></main><nav class="neighbors" aria-label="前後作品"><a href="{WORKS[(i-1)%16][0]}.html">← {WORKS[(i-1)%16][1]}</a><a href="{WORKS[(i+1)%16][0]}.html">{WORKS[(i+1)%16][1]} →</a></nav><footer><span>聲音・波形・節奏 / 2026</span><a href="CREDITS.md">製作與聲音來源 ↗</a></footer></div><script src="https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js"></script><script>(()=>{{'use strict';const CONFIG={json.dumps(cfg,ensure_ascii=False)};{runtime}\n{scenes[slug]}\nboot(scene);}})();</script></body></html>'''
 (ROOT/(slug+'.html')).write_text(page)
index=head('聲音・波形・節奏','十六件愉快的生成式藝術，邀請你觸碰、聆聽與合奏。')+'''<body class="catalog"><div class="shell"><header class="mast"><span>一場可以用手指聆聽的展覽</span><span>COLLECTION / 2026</span></header><main><section class="hero"><div class="hero-copy"><div class="eyebrow">SOUND, SHAPE & A LITTLE JOY</div><h1>小小聲音<br>遊樂場<span class="asterisk">✳</span></h1><div class="hero-sub">聲音・波形・節奏</div></div><div class="hero-side"><div class="hero-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p>如果聲音有身體，它會怎麼跳舞？<br>十六件小作品，把看不見的旋律變成果凍、花朵與會彈跳的日常。請留一點時間，邀請它們一起玩。</p><span class="ticket">16 WORKS / 04 ROOMS / YOUR TEMPO</span></div></section><nav class="room-nav" aria-label="展覽分區">'''
for j,g in enumerate(GROUPS):index+=f'<a href="#room-{j+1}">{j+1:02d} {g[0]} ↘</a>'
index+='</nav>'
for j,g in enumerate(GROUPS):
 index+=f'<section id="room-{j+1}" class="room"><div class="room-heading"><div><span class="eyebrow">ROOM {j+1:02d} / {g[1]}</span><h2>{g[0]}</h2></div><p>{g[2]}</p></div><div class="grid">'
 for i,w in enumerate(WORKS):
  if w[-1]!=j:continue
  slug,title,en,short,desc,hint,bg,palette,*_=w
  index+=f'<a class="card" href="{slug}.html"><div class="preview" style="background:{bg}"><img src="thumbs/{slug}.webp" alt="{title}的生成式畫面" loading="lazy" width="800" height="560"><span class="card-number">{i+1:02d}</span><span class="card-arrow">↗</span></div><span class="card-en">{en.upper()}</span><h3>{title}</h3><p>{short}</p></a>'
 index+='</div></section>'
index+='''</main><footer><span>不必懂樂理。你已經在節奏裡。<br>原創生成藝術與即時合成 / 耳機與低音量推薦</span><div><a href="CREDITS.md">製作資訊 ↗</a><a href="REPORT.md">展覽製作紀錄 ↗</a></div></footer></div></body></html>'''
(ROOT/'index.html').write_text(index)
(ROOT/'tools/works.json').write_text(json.dumps([dict(slug=w[0],title=w[1],en=w[2],bpm=w[8],osc=w[9],mode=w[10]) for w in WORKS],ensure_ascii=False,indent=2))
print('Built 16 standalone artworks + index.')
