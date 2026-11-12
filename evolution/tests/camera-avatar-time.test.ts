import {it,expect} from 'vitest';
import {Camera,MIN_ZOOM,ZOOM_STEP,INITIAL_ZOOM} from '../src/app/camera';
import {avatarStyleAt} from '../src/app/avatar-time';
import {DEFAULT_AVATAR,renderResearcher} from '../src/app/researcher-avatar';

it('starts exactly three plus clicks from minimum on both screen sizes, and clamps zoom',()=>{
  for(const width of [390,1280]){
    const c=new Camera();c.resize(width,844,1600,1000);expect(c.zoom).toBe(3.375);
    c.zoomAt(width/2,422,MIN_ZOOM);
    for(let i=0;i<3;i++)c.zoomAt(width/2,422,c.zoom*ZOOM_STEP);
    expect(c.zoom).toBe(INITIAL_ZOOM);
    c.zoomAt(width/2,422,100);expect(c.zoom).toBe(8);
    c.zoomAt(width/2,422,0);expect(c.zoom).toBe(1);
    c.reset();expect(c.zoom).toBe(INITIAL_ZOOM);
  }
});
it('rotates accessories on minute boundaries, independently of simulation time',()=>{
  expect([0,59999,60000,120000,180000].map(t=>avatarStyleAt(t).accessoryType)).toEqual(['flask','flask','coffee','notebook','flask']);
});
it('uses local weekdays and resolves automatic choices to the same explicit SVG',()=>{
  const shapes=['round','rounded','angular','round','rounded','angular','round'];
  for(let i=0;i<7;i++){
    const timeMs=new Date(2026,10,9+i,12).getTime(),style=avatarStyleAt(timeMs);
    expect(style.glassesShape).toBe(shapes[i]);
    expect(renderResearcher(DEFAULT_AVATAR,{timeMs})).toBe(renderResearcher({...DEFAULT_AVATAR,...style}));
  }
  expect(DEFAULT_AVATAR.hairX).toBe(62);expect(DEFAULT_AVATAR.coatTie).toBe(false);
});
