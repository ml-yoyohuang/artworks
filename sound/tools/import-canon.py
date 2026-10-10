"""Convert the credited Mutopia score MIDI into dependency-free note events.
Usage: python3 sound/tools/import-canon.py sound/score/canon-original.mid
MIDI stores notation here, not a sampled or recorded audio performance.
"""
from pathlib import Path
import struct,json,sys
root=Path(__file__).resolve().parents[1]
data=Path(sys.argv[1]).read_bytes();assert data[:4]==b'MThd'
hlen=struct.unpack('>I',data[4:8])[0];fmt,ntracks,division=struct.unpack('>HHH',data[8:14]);assert not division&0x8000
pos=8+hlen;tracks=[];end=0
for ti in range(ntracks):
 assert data[pos:pos+4]==b'MTrk';length=int.from_bytes(data[pos+4:pos+8],'big');buf=data[pos+8:pos+8+length];pos+=8+length
 i=0;tick=0;running=None;active={};notes=[];name=''
 def vlq():
  global i
  value=0
  while True:
   byte=buf[i];i+=1;value=(value<<7)|(byte&127)
   if not byte&128:return value
 while i<len(buf):
  tick+=vlq();status=buf[i]
  if status&128:i+=1
  else:status=running;assert status is not None
  if status==0xff:
   kind=buf[i];i+=1;size=vlq();payload=buf[i:i+size];i+=size
   if kind==3:name=payload.decode('utf-8',errors='replace')
   continue
  if status in (0xf0,0xf7):size=vlq();i+=size;running=None;continue
  running=status;kind=status&0xf0;channel=status&15;size=1 if kind in(0xc0,0xd0) else 2;payload=buf[i:i+size];i+=size
  if kind==0x90 and payload[1]>0:active[(channel,payload[0])]=(tick,payload[1])
  elif kind==0x80 or(kind==0x90 and payload[1]==0):
   key=(channel,payload[0]);start,velocity=active.pop(key);notes.append([round(start*192/division),payload[0],round((tick-start)*192/division)])
 assert not active
 end=max(end,round(tick*192/division))
 if notes:tracks.append({'name':name,'events':sorted(notes)})
assert len(tracks)==4
# The full score's order is violin I, violin II, violin III, cello.
score={'title':'D 大調卡農','composer':'Johann Pachelbel','edition':'Mutopia-2015/09/02-2047','ppq':192,'totalTicks':((end+767)//768)*768,'voices':tracks}
(root/'score/canon.json').write_text(json.dumps(score,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'sourcePPQ':division,'totalQuarterNotes':end/192,'voices':[{'name':t['name'],'notes':len(t['events']),'first':t['events'][:8]} for t in tracks]},ensure_ascii=False,indent=2))
