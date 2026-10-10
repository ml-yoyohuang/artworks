from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
works=json.loads((root/'tools/works.json').read_text())
sheet=Image.new('RGB',(1600,1280),'#f6f1e7');d=ImageDraw.Draw(sheet)
for i,w in enumerate(works):
 im=Image.open(root/'_qa'/f'{w["slug"]}-canvas.png').convert('RGB')
 im=ImageOps.fit(im,(800,560));im.save(root/'thumbs'/f'{w["slug"]}.webp',quality=86)
 im.thumbnail((390,273));x=(i%4)*400;y=(i//4)*320;sheet.paste(im,(x,y));d.text((x+12,y+279),f'{i+1:02d} {w["slug"]}',fill='#303d36')
sheet.save(root/'_qa'/'scene-contact.jpg',quality=90)
