# Import note data only from the user-supplied Tone.js scores.
# Excerpt beat windows preserve the previous playback tempo conversion.
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rows={'canon':32,'prayer':20,'elise':26.5,'bolero':17.5,'can-can':25.5,'turkish':16.5,'tell':16.5,'hungarian':25}.items()
lookup={'can-can':'cancan','tell':'william'}; data={}; report=[]
corrections=json.loads((root/'assets/js/classical-corrections.json').read_text())
for id,total in rows:
 p=root.parent/'sound/reusable/tracks'/f'{lookup.get(id,id)}.json'; raw=p.read_bytes(); ref=json.loads(raw);ppq=ref['ppq']; groups={}
 for voiceIndex,voice in enumerate(ref['voices']):
  if voice['role']=='percussion':continue
  for tick,note,duration,velocity in voice['events']:
   if tick>=total*ppq:continue
   for correction in corrections:
    if correction['id']==id and correction['referenceVoice']==voiceIndex and correction['tick']==tick and correction['from']==note:note=correction['to']
   part='bass' if voice['role']=='bass' or (id=='prayer' and note<60) else 'melody'
   length=min(duration,total*ppq-tick); key=(tick,length,part)
   groups.setdefault(key,[]).append(note)
 events=[[tick,length,sorted(set(notes)),part] for (tick,length,part),notes in sorted(groups.items())]
 data[id]={'ppq':ppq,'beats':total,'events':events}
 report.append({'id':id,'reference':p.name,'sha256':hashlib.sha256(raw).hexdigest(),'ppq':ppq,'excerptBeats':total,'events':len(events),'referenceTempoImported':False,'referenceVelocityImported':False,'verifiedCorrections':[c for c in corrections if c['id']==id]})
(root/'assets/js/classical-notation.js').write_text('// User-supplied Tone.js notation excerpts. [start tick, duration ticks, MIDI notes, existing part].\n// Tempo, instrument, velocity and percussion settings are deliberately not imported.\nexport const notation = '+json.dumps(data,separators=(',',':'))+';\n')
(root/'_qa/notation-reference.json').write_text(json.dumps({'source':'User-supplied sound/reusable/tracks','policy':'Note pitches, onsets, durations and chords only; keep existing melody/bass/rhythm parts, synths, levels and duration-to-beat timing. Opening excerpts; not entire source tracks.','tracks':report},indent=2)+'\n')
print('Imported eight reference notation excerpts')
