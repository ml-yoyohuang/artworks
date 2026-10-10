"""Reproducible score library. MIDI supplies notation, never recorded audio."""
from pathlib import Path
import json, math
from score_import import midi, italian_absolute
ROOT=Path(__file__).resolve().parents[1]; P=192
library={}
def add(id,title,composer,bpm,meter,total,voices,tempos=None,detail='完整樂譜・合成演奏'):
 library[id]=dict(title=title,composer=composer,bpm=bpm,meter=meter,ppq=P,totalTicks=total,voices=voices,tempos=tempos or [[0,bpm]],detail=detail)
def voice(name,role,events):return dict(name=name,role=role,events=events)
c=json.loads((ROOT/'score/canon.json').read_text())
add('canon',c['title'],c['composer'],96,4,c['totalTicks'],[voice(v['name'],'bass' if i==3 else 'lead',[e+[76 if i==0 else 62] for e in v['events']]) for i,v in enumerate(c['voices'])])
t,end,_,_=midi(ROOT/'score/turkish-original.mid')
add('turkish','土耳其進行曲','Wolfgang Amadeus Mozart',126,2,math.ceil(end/(2*P))*2*P,[voice('右手','lead',t[0]['events']),voice('左手','bass',t[1]['events'])])
t,end,tempos,_=midi(ROOT/'score/hungarian-original.mid')
add('hungarian','匈牙利舞曲第 5 號','Johannes Brahms',126,2,math.ceil(end/(2*P))*2*P,[voice('旋律','lead',t[0]['events']),voice('和弦','bass',t[3]['events']),voice('低音','bass',t[4]['events'])],tempos,detail='完整排譜・三聲部合成改編')
t,end,_,_=midi(ROOT/'score/cancan-original.mid');total=math.ceil(end/(2*P))*2*P
# A simple, newly arranged C-major oom-pah accompaniment follows the source melody.
bass=[]
for bar in range(total//(2*P)):
 root=43 if bar%8 in (3,6,7) else 48
 bass.append([bar*2*P,root,80,65]);bass.extend([[bar*2*P+P,n,76,54] for n in ([55,59,62] if root==43 else [55,60,64])])
add('cancan','天堂與地獄序曲・康康舞段（選段）','Jacques Offenbach',144,2,total,[voice('長笛主題','lead',t[0]['events']),voice('新編伴奏','bass',bass)],detail='主題選段・新編伴奏')
source=(ROOT/'score/bolero-source/common.ily').read_text()
def snippet(name):return italian_absolute(source.split(name+' = {',1)[1].split('\n}',1)[0])
a,ae=snippet('themeA');b1,be=snippet('themeBI');b2,b2e=snippet('themeBII');b=b1+[[at+be,n,d,v] for at,n,d,v in b2]
# Four authentic theme statements A/A/B/B, padded to 18 bars each.
lead=[];bass=[];drum=[];section=54*P;total=4*section
for i,theme in enumerate([a,a,b,b]):lead.extend([[at+i*section,n,d,60+12*i] for at,n,d,v in theme])
for bar in range(total//(3*P)):
 for beat in range(3):bass.append([bar*3*P+beat*P,48 if beat==0 else 55,150,42+bar//4])
 # Ravel's two-bar snare ostinato: eighths and sixteenth triplets.
 lengths=([96,32,32,32,96,32,32,32,96,96] if bar%2==0 else [96,32,32,32,96]+[32]*9)
 at=bar*3*P
 for j,d in enumerate(lengths):drum.append([at,38,d,35+bar//2+(12 if j==0 else 0)]);at+=d
 assert at==(bar+1)*3*P
add('bolero','波萊羅舞曲（主題選段）','Maurice Ravel',72,3,total,[voice('A／B 主題','lead',lead),voice('新編低音','bass',bass),voice('小鼓固定節奏','percussion',drum)],detail='A／A／B／B 主題選段・漸強改編')
# Rawlings (1899), pp.4–5: galloping main theme, D-major piano arrangement.
# Each line below is one 2/4 bar: note name, duration in sixteenth-note units.
# This is a selected melody plus our own accompaniment, not the entire overture.
bars=[
'A3:2 A3:1 A3:1 A3:2 A3:2','D4:2 E4:2 F#4:2 A3:1 A3:1',
'A3:2 A3:1 A3:1 D4:2 F#4:1 F#4:1','E4:2 B3:2 G3:2 G3:1 G3:1',
'G3:2 G3:1 G3:1 G3:2 G3:1 G3:1','C#4:2 D4:2 E4:2 C#4:1 E4:1',
'G4:4 G4:1 F#4:1 E4:1 D4:1','C#4:2 E4:2 C#4:2 G4:1 G4:1',
'A4:2 A4:1 A4:1 A4:2 A4:1 A4:1','D5:2 E5:2 F#5:2 A4:1 A4:1',
'A4:2 A4:1 A4:1 D5:2 F#5:1 F#5:1','E5:2 C#5:2 A4:2 A4:1 A4:1',
'A4:2 A4:1 A4:1 A4:2 A4:1 A4:1','D5:2 E5:2 F#5:2 D5:1 F#5:1',
'A5:4 A5:1 G5:1 F#5:1 E5:1','D5:2 F#5:2 D5:2 R:2']
lead=[];bass=[]
def pitch(name):return 12*(int(name[-1])+1)+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[name[0]]+('#' in name)
for i,bar in enumerate(bars):
 at=i*2*P
 for token in bar.split():
  n,d=token.split(':');d=int(d)*48
  if n!='R':lead.append([at,pitch(n),d,92 if at%(2*P)==0 else 76])
  at+=d
 assert at==(i+1)*2*P
 root=45 if i in (3,4,5,6,7,11) else 50
 for beat in range(2):bass.extend([[i*2*P+beat*P,n,72,58] for n in ([root,root+7] if beat==0 else [root+7,root+12,root+16])])
add('william','威廉泰爾序曲・終曲快板（選段）','Gioachino Rossini',144,2,len(bars)*2*P,[voice('手工轉錄主題','lead',lead),voice('新編伴奏','bass',bass)],detail='16 小節主題選段・新編伴奏')
for id,s in library.items():
 for v in s['voices']:
  assert all(0<=a<s['totalTicks'] and d>0 and 0<=n<=127 for a,n,d,velocity in v['events'])
 print(id,sum(len(v['events']) for v in s['voices']),s['totalTicks']/P)
(ROOT/'score/library.json').write_text(json.dumps(library,ensure_ascii=False,separators=(',',':')))
