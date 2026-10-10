"""Make review sheets without changing the original 1440×900 / 390×844 captures."""
from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
works=json.loads((root/'tools/works.json').read_text())
for device in ['desktop','mobile']:
 for group in range(4):
  subset=works[group*4:group*4+4]
  paths=[root/'_qa'/f'{device}-{w["slug"]}.png' for w in subset]
  if not all(p.exists() for p in paths):continue
  ims=[Image.open(p).convert('RGB') for p in paths]
  width=720 if device=='desktop' else 390
  ims=[im.resize((width,round(im.height*width/im.width))) for im in ims]
  h=max(im.height for im in ims)+28
  sheet=Image.new('RGB',(width*(2 if device=='desktop' else 4),h*(2 if device=='desktop' else 1)),'#f6f1e7');d=ImageDraw.Draw(sheet)
  for j,(w,im) in enumerate(zip(subset,ims)):
   x=(j%(2 if device=='desktop' else 4))*width;y=(j//2)*h if device=='desktop' else 0
   sheet.paste(im,(x,y+28));d.text((x+12,y+8),f'{group*4+j+1:02d} {w["slug"]} / {device}',fill='#303d36')
  sheet.save(root/'_qa'/f'review-{device}-{group+1}.jpg',quality=92)
