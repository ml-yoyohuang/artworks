import * as T from '../../showroom/vendor/three/build/three.module.js';
export const DISC_PALETTES={
 b:{name:'冷光螺旋',text:'明亮青藍、青紫，少量洋紅與香檳金；接近目前確認的冷光虹彩。',colors:['#90dce0','#aaa4e7','#d8a2ce','#dccba0','#b2e5e6']},
 // D–G rotate B's whole HSL palette, retaining its ~62° primary hue span and S/L.
 d:{name:'檸金嫩綠',text:'檸金流向嫩綠，少量冰青點綴；沿用 B 的跨色色相距離、彩度與明度，呈現輕盈的暖光。',colors:['#e0e090','#a4e7a7','#a2d1d8','#c8a0dc','#e6e4b2']},
 e:{name:'翡翠冰藍',text:'翡翠綠流向冰藍，少量霧紫點綴；沿用 B 的跨色色相距離、彩度與明度，呈現清澈的極光感。',colors:['#90e09d','#a4d9e7','#b2a2d8','#dca0aa','#b2e6b9']},
 f:{name:'鈷藍洋紫',text:'鈷藍流向洋紫，少量玫瑰光點綴；沿用 B 的跨色色相距離、彩度與明度，呈現冷冽的異質感。',colors:['#909de0','#dea4e7','#d8a2a4','#bedca0','#b2bce6']},
 g:{name:'玫瑰蜜橘',text:'玫瑰粉流向蜜橘，少量嫩綠點綴；沿用 B 的跨色色相距離、彩度與明度，呈現柔暖的珍珠感。',colors:['#e090bf','#e7c3a4','#bad8a2','#a0d7dc','#e6b2d2']},
 h:{name:'藍莓乳霜',text:'藍莓靛紫流向淡莓紫，少量冷調乳霜光澤；像藍莓果醬拌入冰淇淋，比 F 更濃郁、柔和。',colors:['#7374ba','#bda1d6','#d0aad4','#c3b8df','#ddd4ee']}
};
const palettes=Object.fromEntries(Object.entries(DISC_PALETTES).map(([key,p])=>[key,p.colors.map(hex=>new T.Color(hex))])),color=new T.Color();
// Same angular/radial spiral and geometry; only authored spectrum and slight view phase change.
export function tintDisc(film,time,view,key='b'){const [cyan,purple,pink,gold,pearl]=palettes[key]||palettes.b;const {mesh,segments,rows}=film,colors=mesh.geometry.attributes.color;
 for(let i=0;i<colors.count;i++){const u=Math.floor(i/(segments+1))/rows,a=(i%(segments+1))/segments*Math.PI*2;
  const spiral=a+u*11-time*.2,phase=spiral+view*.22,band=.5+.5*Math.sin(phase),highlight=Math.pow(.5+.5*Math.sin(spiral+.8),5);
  color.copy(cyan).lerp(purple,T.MathUtils.smoothstep(band,.12,.82));
  const accent=T.MathUtils.smoothstep(band,.82,.99)*(.25+.15*Math.sin(a-time*.09));color.lerp(pink,accent);
  const warm=T.MathUtils.smoothstep(.5+.5*Math.sin(a-u*4+time*.12),.91,.99)*T.MathUtils.smoothstep(band,.75,.98);color.lerp(gold,warm*.32);
  color.lerp(pearl,highlight*.16);colors.setXYZ(i,color.r,color.g,color.b);
 }colors.needsUpdate=true;
}
