from pathlib import Path
import hashlib,json,sys
base=Path(__file__).resolve().parents[1];root=base.parent
expected=json.loads((base/'_qa/original-hashes.json').read_text())
changed=[name for name,digest in expected.items() if not (root/name).is_file() or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest]
(base/'_qa/original-verification.json').write_text(json.dumps({'files':len(expected),'changed':changed},indent=2))
print(f'Checked {len(expected)} original files; {len(changed)} changed.')
if changed: print('\n'.join(changed));sys.exit(1)
