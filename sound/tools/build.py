from pathlib import Path
import json
from html import escape
ROOT=Path(__file__).resolve().parents[1]
# Each emitted page embeds its own stylesheet, runtime and scene; no shared local dependency.
WORKS=[
('jelly-wave','果凍波','Jelly, gently','把一條旋律，盛進會晃動的軟糖。','波形有了柔軟的皮膚，音符便在裡面來回翻身。它抵達邊緣時輕輕彈回，像一個不願結束的笑。','拖曳果凍，放開讓它彈回；左右移動改變音域。','#f6e7dc',['#e76946','#efaaac','#496d59','#e7bb3e'],94,'sine','soft',0),
('pendulum-swing','彩虹鞦韆','A chorus of arcs','各自的擺長，偶爾成為共同的風。','十二座鞦韆共享一根細線，卻保留十二種等待的長度。隊形在散開與相遇之間，慢慢寫出一首沒有指揮的歌。','左右移動牽引擺幅；點一下，送出一陣風。','#e7eddf',['#dd6148','#e0af3d','#6388b0','#9d75a0'],88,'triangle','soft',0),
('ribbon-dance','緞帶體操','A little flourish','旋律摺起、翻身，再散成一條緞帶。','緞帶沒有正面，也不急著交代去向。三種顏色在同一個空間裡穿梭，把聲音的尾巴繫成輕盈的結。','移動指尖改變緞帶弧度；點一下，讓音高翻身。','#f4eacc',['#d35157','#426cb6','#dd9e29','#407f69'],108,'triangle','soft',0),
('bubble-scale','泡泡音階','Notes in the air','把音符吹大，讓它們互相打招呼。','高音是小小的玻璃球，低音藏在圓潤的大泡泡裡。它們相遇時交換一點動量，沒有誰需要讓出整片天空。','點擊吹出新泡泡；左右位置決定音高與泡泡大小。','#F4F0DE',['#397B9B','#D97B45','#9577B2','#899545'],102,'sine','soft',0),
('beat-candy','節拍糖果','Sweet accumulation','一拍一顆，把時間堆成甜甜的小山。','糖果從看不見的口袋落下，逐漸堆成一座彩色的地形。重力讓每一拍有了重量，碰撞則留下一點不整齊的快樂。','點擊灑下糖果；拖動調整落點，滑桿改變節拍。','#f0e1df',['#d85d4f','#e5b637','#688aa9','#9880af'],116,'triangle','drum',1),
('tap-floor','踢踏地板','A floor that listens','腳步一亮，地板便記得你的節奏。','一片奶油色的地板，把鼓聲收進交錯的方格。每一次落腳都像蓋上一枚郵票，亮光卻會在下一拍之前溫柔退場。','點擊地板留下鼓點；移動位置改變下一拍的落腳。','#e9e7d3',['#477864','#eaa04b','#d5685a','#6379ae'],112,'square','drum',1),
('popcorn-rhythm','爆米花節奏','Small explosions','安靜的種子，也有突然起舞的時候。','橘紅色的盤子盛著一群等待起跳的小種子。節奏加快時，它們同時鬆開地面，把一個平凡的下午爆成慶典。','點擊催促一輪爆跳；提高節拍，讓更多種子一起起舞。','#f2e8cb',['#e4663d','#f5c44e','#718262','#f8f1df'],128,'triangle','drum',1),
('hopscotch','跳房子','One more square','球把每一拍，都當成下一個家。','一枚小球穿過錯落的格子，落地時留下一圈彩色的記號。路線沒有終點，只有一次比一次更熟悉的起跳。','點擊選擇下一個格子；左右移動改變小球的音域。','#e7e6ed',['#d96250','#5c809f','#b194be','#dbb645'],104,'sine','drum',1),
('flower-choir','合唱的花','A garden in tune','輪到自己的那一拍，就開一朵花。','五朵花把同一段旋律分成五個小小的角色。花瓣輪流張開，枝葉接住鄰居的搖擺，花園於是學會彼此聆聽。','點擊花朵邀它獨唱；移動指尖帶起枝葉的風。','#e9edda',['#d66753','#e4b337','#7a84bb','#dd9fba'],92,'sine','choir',2),
('canon-ripples','輪唱漣漪','After you, again','同一句旋律，從三處不同的時間出發。','三個聲部依次投下同一段旋律，水面把時間差攤成一圈圈色彩。漣漪追上彼此時，交會的地方便有了新的風景。','點擊移動最近的聲源；三個聲部會繼續錯開輪唱。','#e2e9df',['#427b79','#e07951','#a78ca6','#ccac44'],100,'sine','canon',2),
('metronome-party','節拍器派對','Finding the together','先各跳各的，再慢慢找到彼此。','六個節拍器帶著各自的脾氣走進派對。共同的脈搏逐漸拉近它們，整齊並非命令，而是一種越來越舒服的靠近。','點擊重新打散節拍；觀察它們在二十秒內逐漸同步。','#f0e1d5',['#c86448','#daae3f','#728cab','#9c7da0'],96,'triangle','metro',2),
('signal-band','交通號誌樂團','The crossing sings','城市暫停的地方，偷偷排練一首歌。','紅燈唱低音，黃燈輕敲中間的台階，綠燈把高音送出去。路口的秩序變成一組輕快的和聲，等待也能成為跳舞的理由。','點擊更換燈光編排；左右移動改變旋律音域。','#e4e9e6',['#d6624c','#e7b43d','#4d896c','#7589b1'],110,'triangle','signal',2),
('square-blocks','方波積木','A place for a pulse','把硬硬的波，蓋成小小的家。','方波的轉角離開座標軸，成為一塊塊有重量的積木。門窗在節拍之間出現，聲音原來也能住進一座溫暖的房子。','點擊換一張建築樂譜；移動指尖改變積木的高度。','#eee5d5',['#d96d4d','#536f9d','#e2b642','#7f936d'],98,'square','soft',3),
('saw-hills','鋸齒山丘','Downhill, uphill','一條鋸齒，是一片可以滑行的風景。','陡峭的波峰變成奶油色天空下的山丘，小人順著旋律向下滑。抵達谷底的那一瞬間，又有一座新的山把它接起來。','移動指尖改變山勢；點擊讓滑行者輕輕躍起。','#f4e9ce',['#e17a50','#688d76','#dcb94a','#6f8cac'],106,'sawtooth','soft',3),
('crayon-wave','波形塗鴉','Please colour the sound','畫歪一點，聲音就更像你的字跡。','三支蠟筆在紙上練習同一條波形，卻怎麼也畫不成完全一致的線。抖動與留白讓旋律保留手的溫度，每一道偏差都是新的簽名。','拖曳畫下自己的蠟筆線；垂直位置改變旋律音域。','#f5ecde',['#d3664b','#4c8093','#c6a63e','#b17c9d'],90,'triangle','soft',3),
('spring-dancer','彈簧舞者','Stretch, then smile','伸長的等待，縮成一次開心的跳躍。','五位彈簧舞者把鼓點藏在自己的肚子裡。它們伸展、壓縮，再把儲存的力氣交給下一個伙伴，像一場不需要語言的接力。','點擊壓縮舞者；移動指尖改變隊形的彈性。','#e8e5ee',['#d96950','#d8ac39','#5c8d80','#8582b2'],118,'triangle','drum',3),
]
GROUPS=[('會跳舞的波形','DANCING WAVES','波形先鬆開座標，才找到身體。'),('節奏的遊戲感','PLAYFUL PULSES','每一拍，都是可以落腳的地方。'),('愉快的合奏','HAPPY ENSEMBLES','留一點時間差，讓彼此相遇。'),('波形的變身','SHAPESHIFTING SCORES','聲音離開線條，長成新的風景。')]
css=(ROOT/'tools/style.css').read_text()
runtime=(ROOT/'tools/runtime.js').read_text()
scenes=json.loads((ROOT/'tools/scenes.json').read_text())
score=(ROOT/'score/library.json').read_text().strip()
library=json.loads(score)
recommendations=['hungarian','canon','hungarian','turkish','bolero','cancan','cancan','william','canon','canon','bolero','bolero','turkish','william','hungarian','cancan']
pairings=['急緩交替，讓果凍收縮與彈回。','錯開的聲部，陪鞦韆散開再相遇。','旋律轉折，讓緞帶縮起再舒展。','輕巧裝飾音，像檸檬汽水裡的小泡泡。','固定節奏逐漸長大，糖果也越落越熱鬧。','鮮明重音，邀請整片地板一起踢踏。','快板帶動一群種子的爆跳。','奔馳的節奏，陪小球跨過下一格。','輪流進場的聲部，像花朵互相接唱。','原本的輪唱結構，在水面留下時間差。','穩定小鼓與漸強，讓派對逐步聚攏。','反覆節奏漸強，路口逐層亮起。','俐落音符與方波轉角，搭出輕快的小房子。','奔馳主題，讓滑行更有向前的動力。','忽快忽慢，讓蠟筆留下有呼吸的字跡。','強拍一起蓄力，彈簧跳成小小的舞隊。']
DIRECT={
 'jelly-wave':('抓住果凍或白圈拖曳，左低右高；碰到邊界擠扁，放開帶著慣性彈回；抓住張嘴，碰撞皺眉。','白圈是抓取點；抓住時 o 嘴，碰撞時皺眉；伴奏維持原調。'),
 'pendulum-swing':('點彩色擺錘推一下，鄰座會回應；拖下方白圈控制向左、向右的風。','箭頭標出風向；離中心越遠，風力越強，放開保留風力。'),
 'beat-candy':('按住連續撒糖果，左右移動換落點與音高；放開就停，白邊是你的糖果。','下方清盤可重新堆疊；最多保留 72 顆，自動糖果隨音樂繼續。'),
 'square-blocks':('抓每棟最上層的白框上下拖曳；上方加高、下方降低，放開落定並奏音；按播放房子旋律，循環三音與休止。','每棟 1–5 層，越高唱越高；按播放房子旋律，依 BPM 播放三棟與一拍休止。'),
 'canon-ripples':('抓住三個圓點拖曳聲源；點空白水面，立即奏一滴水，左低右高。','聲源跟著指尖；舊漣漪留在出發的位置。'),
 'signal-band':('直接點紅、黃、綠燈奏低、中、高音；按住滑過燈號也能連奏。','白圈是你點亮的燈；用下方按鈕切換燈光編排。'),
 'ribbon-dance':('抓白圈端點拖曳，左低右高，放開回彈；短點畫布或按翻一圈，奏四音琶音，上行與下行交替。','拖曳左低右高；每圈四音短句；新一圈取代上一句，長拖牽引緞帶。'),
 'popcorn-rhythm':('點粒子後放開爆跳；按住約 1.2 秒蓄滿力、放開跳更高；滿力飛出畫布再落回，彩色圈標出自己的粒子。','可點盤裡或空中的粒子；自己的爆花短暫避開自動群跳。'),
 'tap-floor':('指向亮框的菱形格子，點哪格就敲哪格；按住拖曳連續踢踏。','三種鼓聲：低鼓、小鼓、沙鈴；白圈指出自己的腳步。'),
 'hopscotch':('點有號碼的格子，小球會完成這次跳躍；落地時奏出那格的音。','紅框是你的目標；落地後才交回自動路線。'),
 'flower-choir':('點花瓣獨唱八拍短句，伴奏自動降低；八拍後恢復，或按全員合奏。','每朵花唱不同音域的短句；圈線與倒數標出正在獨唱的花。'),
 'metronome-party':('點一台節拍器，邀它先跳散；動態運行二十秒後同步，音樂繼續。','全隊散開可重新開始派對；進度不受速度倍率影響。'),
'bubble-scale':('點一下奏音，按住拖曳連吹泡泡；左低右高，大泡泡唱低音。','左右八個音階位置；新泡泡顯示實際音名。'),
'saw-hills':('上下拖曳：上方山高、音高，下方山低、音低；點一下讓小人跳起來。','拖曳時立即奏音，古典伴奏維持原調。'),
'crayon-wave':('按住畫線：上高下低；放開後，光點沿著這一筆重播。','每筆最多 8 秒，可重播這一筆或清空紙面。'),
'spring-dancer':('抓住舞者的頭或身體往下壓，放開讓它彈起來；壓得越深，跳得越高、聲音越長；滿力有八度尾音。','移到舞者身上會亮框；每位舞者有固定主音；音長約 0.15–1 秒，滿力再唱高八度。')
}
MATERIALS={
 'jelly-wave':'互動：果凍位置奏單音；抓取／碰撞切換表情，不改伴奏調性。',
 'pendulum-swing':'互動：點擺錘奏固定音；風力位置選音。',
 'ribbon-dance':'互動：拖曳選音；翻圈奏四音琶音，與 BPM 同步，不改伴奏。',
 'bubble-scale':'互動：八音階單音；低音大泡泡、高音小泡泡。',
 'beat-candy':'互動：落點選音；長按連續撒糖與奏音。',
 'tap-floor':'互動：低鼓、小鼓、沙鈴，皆為即時合成聲。',
 'popcorn-rhythm':'互動：合成噪音啪聲；蓄力控制力度，滿力越過畫布上緣再回盤。',
 'hopscotch':'互動：手動落地奏所選格的固定音。',
 'flower-choir':'互動：花朵唱八拍原創短句，獨唱時降低伴奏，結束恢復。',
 'canon-ripples':'互動：聲源固定音、水面依左右選音；伴奏完整播放。',
 'metronome-party':'互動：點台奏音、重設視覺相位；伴奏不重啟。',
 'signal-band':'互動：紅／黃／綠奏低／中／高音；編排只改燈光。',
 'square-blocks':'互動：樓高選音；可依 BPM 循環三音＋休止，並切換只聽房子。',
 'saw-hills':'互動：山高選音、點按跳躍；不即時轉調伴奏。',
 'crayon-wave':'互動：高度選音、記錄與重播這筆奏音；每筆最多八秒。',
 'spring-dancer':'互動：舞者固定主音；壓縮決定力度與 0.15–1 秒音長，滿力加八度尾音。'
}
BASE_URL='https://ml-yoyohuang.github.io/artworks/sound/'
def social_meta(title,desc,slug='index'):
 url=BASE_URL+('' if slug=='index' else slug+'.html')
 image=BASE_URL+'assets/og/'+slug+'.jpg'
 full_title=title+' — 小小聲音遊樂場' if slug!='index' else '小小聲音遊樂場 — 聲音・波形・節奏'
 alt=title+'：聲音・波形・節奏生成藝術分享封面'
 tags={'og:type':'website','og:locale':'zh_TW','og:site_name':'小小聲音遊樂場','og:title':full_title,'og:description':desc,'og:url':url,'og:image':image,'og:image:type':'image/jpeg','og:image:width':'1200','og:image:height':'630','og:image:alt':alt}
 twitter={'twitter:card':'summary_large_image','twitter:title':full_title,'twitter:description':desc,'twitter:image':image,'twitter:image:alt':alt}
 return f'<link rel="canonical" href="{url}">'+''.join(f'<meta property="{key}" content="{escape(value,quote=True)}">' for key,value in tags.items())+''.join(f'<meta name="{key}" content="{escape(value,quote=True)}">' for key,value in twitter.items())
head=lambda title,desc,slug='index':f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="{desc}"><meta name="theme-color" content="#f6f1e7"><link rel="icon" href="data:,"><title>{title} — 小小聲音遊樂場</title>{social_meta(title,desc,slug)}<style>{css}</style></head>'''
for i,w in enumerate(WORKS):
 slug,title,en,short,desc,hint,bg,palette,bpm,osc,mode,group=w
 recommended=recommendations[i]; chosen=library[recommended]; bpm=chosen['bpm']
 cfg=dict(id=i,slug=slug,title=title,en=en,bg=bg,palette=palette,bpm=bpm,osc=osc,mode=mode,recommended=recommended,directInteraction=slug in DIRECT)
 if slug in DIRECT:hint=DIRECT[slug][0]
 play_ui=(f'<div class="play-guide"><p>{DIRECT[slug][0]}</p><output id="play-feedback" aria-live="polite">{DIRECT[slug][1]} 先按「開始聆聽」即可奏音。</output></div>' if slug in DIRECT else '')
 extras=('<div class="gesture-tools"><button id="replay" disabled>重播這一筆</button><button id="clear-ink">清空紙面</button></div>' if slug=='crayon-wave' else '')
 if slug=='pendulum-swing':extras='<div class="gesture-tools"><button id="calm-wind">讓風停下</button></div>'
 if slug=='beat-candy':extras='<div class="gesture-tools"><button id="clear-candy">清空糖果盤</button></div>'
 if slug=='square-blocks':extras='<div class="gesture-tools"><button id="building-plan">建築方案：1 / 4</button><button id="house-play">播放房子旋律</button><button id="house-only">只聽房子</button></div>'
 if slug=='canon-ripples':extras='<div class="gesture-tools"><button id="reset-water">聲源回到原位</button></div>'
 if slug=='signal-band':extras='<div class="gesture-tools"><button id="pattern">燈光編排：接力</button></div>'
 if slug=='ribbon-dance':extras='<div class="gesture-tools"><button id="flip-ribbon">翻一圈</button></div>'
 if slug=='flower-choir':extras='<div class="gesture-tools"><button id="all-flowers" disabled>全員合奏</button></div>'
 if slug=='metronome-party':extras='<div class="gesture-tools"><button id="scatter">全隊散開</button></div>'
 balance=('<div class="backing-control"><label for="backing">伴奏音量 <output id="backing-value">45%</output></label><input id="backing" type="range" min="0" max="100" value="45" aria-label="古典伴奏音量"><span>自己的奏音會更清楚</span></div>' if slug in DIRECT else '')
 keys=('方向鍵移動操作位置，Enter 模擬點按；拖曳請用滑鼠／觸控。空白鍵播放／暫停。' if slug in DIRECT else '方向鍵改變位置，Enter 加入一拍；空白鍵切換聲音。')
 options=''.join(f'<option value="{key}"{" selected" if key==recommended else ""}>{v["title"]}{" · 策展推薦" if key==recommended else ""}</option>' for key,v in library.items())
 page=head(title,short,slug)+f'''<body style="--stage:{bg};--accent:{palette[0]}"><div class="shell"><header class="mast"><a href="index.html">← 小小聲音遊樂場</a><span>SOFT SCORES / {i+1:02d}—16</span></header><main class="exhibit"><section class="art-column" aria-label="{title}互動作品"><div class="stage"><div class="stage-label"><span>{GROUPS[group][1]}</span><span class="live-label">SILENT REHEARSAL</span></div><canvas id="art" tabindex="0" aria-label="{title}。{hint}"></canvas><div class="stage-bottom"><span class="dots" aria-hidden="true">● ● ● ●</span><span>{en.upper()}</span></div></div>{play_ui}{extras}<div class="music-picker"><div class="picker-label"><label for="track">今天，讓它跟著哪首歌？</label><button id="recommend">回到推薦曲</button></div><select id="track" aria-describedby="pairing">{options}</select><p id="pairing">策展推薦｜{pairings[i]}</p></div><div class="toolbar"><button id="start" class="primary">開始聆聽 <span>↗</span></button><button id="mute" disabled aria-pressed="false">靜音</button><button id="motion" aria-pressed="false">暫停動態</button><div class="tempo"><label for="tempo">速度 <output id="bpm">×1.00</output></label><input id="tempo" type="range" min="0.6" max="1.4" step="0.01" value="1" aria-label="演奏速度倍率"></div></div>{balance}<p id="status" role="status">聲音等待你的邀請。畫面已開始輕輕呼吸。</p></section><aside class="label"><div class="work-no">{i+1:02d}<span> / {GROUPS[group][0]}</span></div><h1>{title}</h1><div class="english">{en}</div><p class="lede">{short}</p><p class="statement">{desc}</p><div class="hint"><span>一起玩 / PLAY</span><p>{hint}</p><small>畫布聚焦後：{keys}</small></div><div class="material">CANVAS 2D · LIVE SYNTHESIS<br><span id="track-material">{chosen["title"]}・{chosen["composer"]}<br>{chosen["detail"]}</span><br>古典樂譜伴奏＋獨立互動合成聲<br>{MATERIALS[slug]}<br>不需要音檔<br><a id="score-credit" href="CREDITS.md#{recommended}">排譜來源與授權 ↗</a></div></aside></main><nav class="neighbors" aria-label="前後作品"><a href="{WORKS[(i-1)%16][0]}.html">← {WORKS[(i-1)%16][1]}</a><a href="{WORKS[(i+1)%16][0]}.html">{WORKS[(i+1)%16][1]} →</a></nav><footer><span>聲音・波形・節奏 / 2026</span><a href="CREDITS.md">製作與聲音來源 ↗</a></footer></div><script src="https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js"></script><script>(()=>{{'use strict';const CONFIG={json.dumps(cfg,ensure_ascii=False)};const SCORES={score};{runtime}\n{scenes[slug]}\nboot(scene);}})();</script></body></html>'''
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
index+='''</main><footer><span>不必懂樂理。你已經在節奏裡。<br>原創生成藝術 / 六首古典樂譜・自由選曲 / 耳機與低音量推薦</span><div><a href="CREDITS.md">製作資訊 ↗</a></div></footer></div></body></html>'''
(ROOT/'index.html').write_text(index)
(ROOT/'tools/works.json').write_text(json.dumps([dict(slug=w[0],title=w[1],en=w[2],bpm=library[recommendations[i]]['bpm'],osc=w[9],mode=w[10],recommended=recommendations[i]) for i,w in enumerate(WORKS)],ensure_ascii=False,indent=2))
print('Built 16 standalone artworks + index.')

face_lab=(ROOT/'tools/jelly-face-lab.template.html').read_text().replace('__SOCIAL_META__',social_meta('果凍表情工作室','拖動參數，並排比較原版與調整版，細緻調整果凍的碰撞表情。','jelly-face-lab')).replace('__BASE_CSS__',css).replace('__FACE_RENDERER__',(ROOT/'tools/jelly-face.js').read_text())
(ROOT/'jelly-face-lab.html').write_text(face_lab)

og_manifest=[dict(slug=w[0],title=w[1],en=w[2],description=w[3],bg=w[6],accent=w[7][0],group=GROUPS[w[-1]][0],number=i+1) for i,w in enumerate(WORKS)]
og_manifest += [dict(slug='index',title='小小聲音遊樂場',description='十六件愉快的生成式藝術，邀請你觸碰、聆聽與合奏。'),dict(slug='jelly-face-lab',title='果凍表情工作室',description='一點點，更可愛。拖動參數，細緻調整果凍的碰撞表情。')]
(ROOT/'tools/og-manifest.json').write_text(json.dumps(og_manifest,ensure_ascii=False,indent=2))
