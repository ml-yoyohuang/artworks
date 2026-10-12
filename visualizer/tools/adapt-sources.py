from pathlib import Path
import re
BASE=Path(__file__).resolve().parents[1]
def body_replace(s,name,body):
    m=re.search(r'function '+re.escape(name)+r'\s*\([^)]*\)\s*\{',s)
    if not m:return s
    start=m.end();depth=1;i=start;quote=None;comment=None
    while i<len(s) and depth:
        c=s[i];n=s[i:i+2]
        if comment=='line':
            if c=='\n':comment=None
        elif comment=='block':
            if n=='*/':comment=None;i+=1
        elif quote:
            if c=='\\':i+=1
            elif c==quote:quote=None
        elif n=='//':comment='line';i+=1
        elif n=='/*':comment='block';i+=1
        elif c in "\"'`":quote=c
        elif c=='{':depth+=1
        elif c=='}':depth-=1
        i+=1
    return s[:start]+'\n'+body+'\n'+s[i-1:]
for p in (BASE/'sources/sound2').glob('*.js'):
    if p.name=='utils.js':continue
    s=body_replace(p.read_text(),'events','return api.events(b0,b1);')
    if p.name.startswith('09-'):
        s=body_replace(s,'openness','return Math.min(1.1, .12 + [api.features.low,api.features.mid,api.features.high][Math.min(2,j)] * .75 + api.features.pulse * .2);')
    p.write_text(s)
# Original rendering, but MP3 analysis supplies the geometry history and growth features.
p=BASE/'sources/sound4/works/04-fossil.js';p.write_text(p.read_text().replace('this.sim = simulate(api.seed);','this.sim = api.fossilSimulation || simulate(api.seed);'))
p=BASE/'sources/sound4/works/06-breath.js';s=p.read_text().replace("const f = a.demo === 'mic' ?", "const f = api.musicFeatures ? api.musicFeatures : a.demo === 'mic' ?")
# Explicitly dispose the original preview when real material replaces it.
s=s.replace('this.items.splice(this.items.indexOf(pre), 1);','this.items.splice(this.items.indexOf(pre), 1); pre.mesh.geometry.dispose(); pre.mesh.material.dispose();')
p.write_text(s)
reactions={
'jelly-wave':'jelly.stretch += (f.low * .5 - jelly.stretch) * Math.min(1,dt*5); jelly.squash=Math.max(jelly.squash,f.pulse*.5);',
'pendulum-swing':'swings.forEach((s,i)=>{ s.v += (f.bands[i%8]-.3)*dt*.6; });',
'ribbon-dance':'flipTarget=f.brightness*.7; handles.forEach((p,i)=>{p.vy+=f.bands[i*2]*dt*35;});',
'bubble-scale':'for(const e of f.events) addBubble(180+e.band*90,530,e.band,Math.floor(state.time*20),e.strength);',
'flower-choir':'bloom.forEach((v,i)=>{bloom[i]=Math.max(v,f.bands[i]*.9);});',
'signal-band':'manualLights.forEach((v,i)=>{manualLights[i]=Math.max(v,[f.low,f.mid,f.high][i%3]*.85);});',
'square-blocks':'heights[0]=1+Math.round(f.low*5);heights[1]=1+Math.round(f.mid*5);heights[2]=1+Math.round(f.high*5);',
'saw-hills':'hill.target=110+f.low*170;',
'crayon-wave':'if(!f.quiet && (!marks.length || marks.at(-1).points.length>=180)){marks.push({points:[],notes:[],color:C[marks.length%4]});if(marks.length>8)marks.shift();} if(!f.quiet){const m=marks.at(-1),n=m.points.length; m.points.push({x:110+n*4.2,y:340+f.waveform[n%128]*170+(f.brightness-.5)*180});}',
'spring-dancer':'for(const e of f.events){const d=dancers[e.band%5];d.v-=e.strength*180;}',
}
for p in (BASE/'sources/sound').glob('*.js'):
    s=p.read_text();s=s.replace('function text(str,x,y,size=12,color=INK,align=\'center\'){','function text(str,x,y,size=12,color=INK,align=\'center\'){if(String(str).length>14)return;')
    if p.stem in reactions:s=s.replace('return {scene,config:CONFIG};','scene.react=(f,dt)=>{'+reactions[p.stem]+'};\nreturn {scene,config:CONFIG};')
    p.write_text(s)
# Copy only catalog poster images. These are static previews, never substituted for live rendering.
import json,shutil
registry=BASE/'presets/registry.js';data=json.loads(registry.read_text().split(' = ',1)[1].rstrip(';\n'))
for entry in data:
    series=entry['series'];slug=entry['id'].split('-',1)[1]
    if series==1:src=BASE.parent/f'rhythm/vol1/thumbs/{slug}.webp'
    elif series==2:src=BASE.parent/f'rhythm/vol2/assets/previews/{slug}.webp'
    else:
        names=['resonant-architecture','chord-loom','silence-cuts','sound-fossil','phase-tides','breath-portrait','echo-labyrinth','stored-energy']
        src=BASE.parent/f'sound/test{series-2}/assets/previews/{entry["index"]+1:02d}-{names[entry["index"]]}.{ "webp" if series==3 else "jpg"}'
    if not src.exists():
        matches=list(src.parent.glob(src.stem+'.*'));src=matches[0] if matches else None
    if src:
        dest=BASE/'previews'/f'{entry["id"]}{src.suffix}';dest.parent.mkdir(exist_ok=True);shutil.copyfile(src,dest);entry['preview']='./previews/'+dest.name
registry.write_text('export const presets = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
print('Adapted copies only; MP3 event inputs and bounded material growth.')
