"""Review actual walkthrough canvases before and after each gesture."""
from PIL import Image,ImageDraw
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
works=[w for w in json.loads((r/'tools/works.json').read_text()) if w['slug'] not in ['bubble-scale','saw-hills','crayon-wave','spring-dancer']]
for device in ['desktop','mobile']:
 for group in range(3):
  subset=works[group*4:group*4+4];width=400;height=400 if device=='mobile' else 280;row=height+30
  sheet=Image.new('RGB',(width*2,row*4),'#f6f1e7');draw=ImageDraw.Draw(sheet)
  for i,w in enumerate(subset):
   for j,phase in enumerate(['before','after']):
    p=r/'_qa'/f'audit-{device}-{w["slug"]}-{phase}.png';im=Image.open(p).convert('RGB').resize((width,height));sheet.paste(im,(j*width,i*row+30));draw.text((j*width+10,i*row+10),w['slug']+' / '+phase,fill='#303d36')
  sheet.save(r/'_qa'/f'review-audit-{device}-{group+1}.jpg',quality=92)
