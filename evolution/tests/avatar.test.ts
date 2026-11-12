import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {AVATAR_FIELDS,DEFAULT_AVATAR,avatarDocument,parseAvatar,renderResearcher,type AvatarKey,type AvatarField} from '../src/app/researcher-avatar';

describe('researcher hand-authored geometry and parameter exchange',()=>{
  it('round-trips every editable value and matches the actual shipped mascot',()=>{
    const parameters={...DEFAULT_AVATAR,hairX:70,hairWidth:142,glassesShape:'angular',mouthWidth:20,accessoryType:'coffee',coatPockets:false};
    expect(parseAvatar(JSON.parse(JSON.stringify(avatarDocument(parameters))))).toEqual(parameters);
    expect(renderResearcher(parseAvatar(avatarDocument(parameters)))).toBe(renderResearcher(parameters));
    expect(readFileSync('public/observer.svg','utf8').trim()).toBe(renderResearcher(DEFAULT_AVATAR));
    expect(DEFAULT_AVATAR.mouthCurve).toBe(0);expect(DEFAULT_AVATAR.mouthShape).toBe('line');
    expect(renderResearcher()).not.toMatch(/<image|<script|data-part=|fill-opacity/);
  });
  it('rejects unknown, incomplete, nonfinite or injectable values before preview replacement',()=>{
    for(const patch of [{hairX:NaN},{hairWidth:9999},{lensColour:'url(https://example.com)'},{glassesShape:'<script>'},{hairCurls:3.5},{unknown:1}]) {
      expect(()=>parseAvatar({...avatarDocument(DEFAULT_AVATAR),parameters:{...DEFAULT_AVATAR,...patch}})).toThrow();
    }
    expect(()=>parseAvatar({schema:'evolution-researcher',version:1,parameters:{}})).toThrow();
    const input=JSON.parse(JSON.stringify(avatarDocument(DEFAULT_AVATAR)));Object.defineProperty(input.parameters,'__proto__',{value:{bad:true},enumerable:true});
    expect(()=>parseAvatar(input)).toThrow(/不認識/);
  });
  it('renders all supported extremes and shapes as finite self-contained vectors',()=>{
    for(const [key,raw] of Object.entries(AVATAR_FIELDS)) {
      const field=raw as AvatarField;
      const values=typeof field.value==='number'?[field.min!,field.max!]:field.choices??[field.value];
      for(const value of values) {
        const doc=avatarDocument({...DEFAULT_AVATAR,[key as AvatarKey]:value});
        const svg=renderResearcher(parseAvatar(doc),{prefix:'test'});
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);expect(svg).toContain('id="test-title"');
      }
    }
    const edited=renderResearcher(DEFAULT_AVATAR,{editable:true,prefix:'large'}),small=renderResearcher(DEFAULT_AVATAR,{prefix:'small'});
    expect(edited).toContain('data-part="glasses"');expect(small).not.toContain('data-part=');
    expect(edited).toContain('id="large-lenses"');expect(small).toContain('id="small-lenses"');
  });
});
