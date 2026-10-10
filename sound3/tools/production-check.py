#!/usr/bin/env python3
"""Verify published byte content without saving remote media."""
import hashlib,json,pathlib,urllib.request,urllib.error,datetime,subprocess,os
root=pathlib.Path(__file__).resolve().parents[1]
base='https://ml-yoyohuang.github.io/artworks/sound3/'
sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
files=[p for p in root.glob('*.html')]+list((root/'assets/js').glob('*.js'))+list((root/'assets/css').glob('*.css'))+list((root/'assets/previews').glob('*.webp'))+[root/'assets/favicon.svg']
result={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'contentCommit':sha,'base':base,'files':[],'documents':[]}
for p in files:
 rel=p.relative_to(root).as_posix()
 try:
  req=urllib.request.Request(base+rel+'?verify='+sha[:12],headers={'Cache-Control':'no-cache'})
  with urllib.request.urlopen(req,timeout=30) as response:data=response.read();status=response.status
  item={'file':rel,'status':status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'matchesLocal':data==p.read_bytes()}
 except Exception as ex:item={'file':rel,'error':str(ex),'matchesLocal':False}
 result['files'].append(item)
for rel in ['README.md','MUSIC_CREDITS.md','QA_REPORT.md']:
 try:
  with urllib.request.urlopen(base+rel,timeout=20) as response:item={'file':rel,'status':response.status,'contentType':response.headers.get('content-type')}
 except urllib.error.HTTPError as ex:item={'file':rel,'status':ex.code}
 result['documents'].append(item)
pathlib.Path(os.environ.get('SOUND3_PRODUCTION_RESULT',str(root/'_qa/production-assets.json'))).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'files':len(result['files']),'mismatch':[r for r in result['files'] if not r['matchesLocal']],'documents':result['documents']},indent=2))
raise SystemExit(0 if all(r['matchesLocal'] for r in result['files']) else 1)
