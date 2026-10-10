"""Export current gallery notation, playback adapter and provenance as a portable ZIP."""
from pathlib import Path
import json,shutil,zipfile,subprocess,sys
root=Path(__file__).resolve().parents[1]
out=root/'reusable';out.mkdir(exist_ok=True)
shutil.copyfile(root/'tools/score_import.py',out/'score_import.py')
subprocess.run([sys.executable,'-B',str(out/'build-extra.py')],check=True)
data=json.loads((out/'library.json').read_text())
(out/'CREDITS.md').write_text((root/'CREDITS.md').read_text()+(out/'ADDITIONS.md').read_text())
archive=root/'soft-scores-reusable.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(out.rglob('*')):
  if p.is_file() and '__pycache__' not in p.parts:z.write(p,'soft-scores/'+str(p.relative_to(out)))
 for p in sorted((root/'score').rglob('*')):
  if p.is_file() and '__pycache__' not in p.parts:z.write(p,'soft-scores/sources/score/'+str(p.relative_to(root/'score')))
 for name in ['import-canon.py','build-scores.py','score_import.py']:
  z.write(root/'tools'/name,'soft-scores/sources/tools/'+name)
print(f'Exported {len(data)} scores to {archive}')
