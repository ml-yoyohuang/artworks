"""Rebuild the eight-score reusable library from six gallery scores + two source MIDIs."""
from pathlib import Path
import json,hashlib
from score_import import midi
here=Path(__file__).resolve().parent
base=here.parent/'score/library.json'
if not base.exists():base=here/'sources/score/library.json'
library=json.loads(base.read_text())
config={
 'elise':dict(title='給愛麗絲',composer='Ludwig van Beethoven',meter=1.5,timeSignature=[3,8],bpm=72,detail='來源 MIDI 全部音符・左右手合成演奏'),
 'prayer':dict(title='少女的祈禱',composer='Tekla Bądarzewska-Baranowska',meter=4,timeSignature=[4,4],bpm=83,detail='來源 MIDI 全部音符・鋼琴聲部與速度變化')
}
for id,info in config.items():
 file=here/'originals'/f'{id}-original.mid'
 tracks,end,tempos,meters=midi(file)
 assert tracks and end>0
 tempo_events=[list(t) for t in tempos]
 if not tempo_events or tempo_events[0][0]>0:tempo_events.insert(0,[0,info['bpm']])
 voices=[dict(name=t['name'] or f'鋼琴聲部 {i+1}',role='bass' if id=='elise' and i==1 else 'lead',events=t['events']) for i,t in enumerate(tracks)]
 for v in voices:
  assert all(0<=at<end and 0<=pitch<=127 and duration>0 and at+duration<=end and 0<velocity<=127 for at,pitch,duration,velocity in v['events'])
 library[id]=dict(**info,ppq=192,totalTicks=end,voices=voices,tempos=tempo_events,sourceSHA256=hashlib.sha256(file.read_bytes()).hexdigest(),sourceMeters=[list(m) for m in meters])
(here/'library.json').write_text(json.dumps(library,ensure_ascii=False,separators=(',',':'))+'\n')
(here/'library.js').write_text('/* Classical notation: keep CREDITS.md with any reuse. */\n(function(root){const scores='+json.dumps(library,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=scores;else root.SoftScores=scores;})(globalThis);\n')
(here/'tracks').mkdir(exist_ok=True)
for id,score in library.items():(here/'tracks'/f'{id}.json').write_text(json.dumps(score,ensure_ascii=False,indent=2)+'\n')
print('Rebuilt reusable scores:',', '.join(library))
