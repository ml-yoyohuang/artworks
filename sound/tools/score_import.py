"""Small, dependency-free notation readers. No sound recordings are loaded."""
from pathlib import Path
from collections import defaultdict
import struct,re
PPQ=192

def midi(path):
 data=Path(path).read_bytes();assert data[:4]==b'MThd'
 hlen=int.from_bytes(data[4:8],'big');fmt,ntracks,division=struct.unpack('>HHH',data[8:14]);assert not division&0x8000
 pos=8+hlen;tracks=[];tempos=[];meters=[];end=0
 for _ in range(ntracks):
  assert data[pos:pos+4]==b'MTrk';length=int.from_bytes(data[pos+4:pos+8],'big');buf=data[pos+8:pos+8+length];pos+=8+length
  i=0;tick=0;running=None;active=defaultdict(list);notes=[];name=''
  def vlq():
   nonlocal i
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
    if kind==0x51:tempos.append([round(tick*PPQ/division),round(60000000/int.from_bytes(payload,'big'),3)])
    if kind==0x58:meters.append([round(tick*PPQ/division),payload[0],2**payload[1]])
    continue
   if status in (0xf0,0xf7):size=vlq();i+=size;running=None;continue
   running=status;kind=status&0xf0;channel=status&15;size=1 if kind in(0xc0,0xd0) else 2;payload=buf[i:i+size];i+=size
   if kind==0x90 and payload[1]>0:active[(channel,payload[0])].append((tick,payload[1]))
   elif kind==0x80 or(kind==0x90 and payload[1]==0):
    key=(channel,payload[0]);assert active[key];start,velocity=active[key].pop(0);notes.append([round(start*PPQ/division),payload[0],max(1,round((tick-start)*PPQ/division)),velocity])
  assert not any(active.values())
  end=max(end,round(tick*PPQ/division))
  if notes:tracks.append({'name':name,'events':sorted(notes)})
 return tracks,end,sorted(set(map(tuple,tempos))),sorted(set(map(tuple,meters)))

def italian_absolute(source):
 """Parse the bounded, absolute-pitch Boléro theme snippets retained in sources.
 Supports inherited durations, dotted notes, rests, ties and tuplet 3/2 groups.
 No generic LilyPond compiler is claimed.
 """
 source=re.sub(r'%[^\n]*','',source);source=re.sub(r'\\once\\override[^\n]*','',source)
 matches=list(re.finditer(r'\\tuplet\s+3/2\s*\{|[{}]|(?<![A-Za-z\\])(do|re|mi|fa|sol|la|si|r)([bd]?)([\',]*)([!?]?)(\d*)(\.*)|~',source))
 at=0;den=4;dots=0;factor=1;events=[];tied=False
 for m in matches:
  tok=m.group(0)
  if tok.startswith('\\tuplet'):factor=2/3;continue
  if tok=='}':factor=1;continue
  if tok=='{':continue
  if tok=='~':tied=True;continue
  name,acc,octave,_,number,dot=m.groups()
  if number:den=int(number);dots=len(dot)
  elif dot:dots=len(dot)
  duration=PPQ*4/den*(2-2**(-dots))*factor
  if name!='r':
   note=48+{'do':0,'re':2,'mi':4,'fa':5,'sol':7,'la':9,'si':11}[name]+(octave.count("'")-octave.count(','))*12+{'':0,'b':-1,'d':1}[acc]
   if tied and events and events[-1][1]==note:events[-1][2]+=duration
   else:events.append([at,note,duration,80])
  tied=False;at+=duration
 return [[round(a),n,round(d),v] for a,n,d,v in events],round(at)
