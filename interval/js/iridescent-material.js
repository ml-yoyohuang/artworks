import * as T from '../../showroom/vendor/three/build/three.module.js';
import {oilMaterial} from './oil-material.js?v=1';
export function colourMaterial(){
  const m=oilMaterial();m.side=T.DoubleSide;
  Object.assign(m.uniforms,{uVariant:{value:3},uView:{value:new T.Vector2()},uIce:{value:new T.Color('#9bbfb5')},uLavender:{value:new T.Color('#aaa0c6')},uCyan:{value:new T.Color('#7ccbd1')},uPurple:{value:new T.Color('#9992cf')},uPink:{value:new T.Color('#cb91bb')},uGold:{value:new T.Color('#cdbd85')}});
  m.fragmentShader=m.fragmentShader.replace('uniform float uTime;',`uniform float uTime,uVariant;
    uniform vec2 uView;
    uniform vec3 uIce,uLavender,uCyan,uPurple,uPink,uGold;`);
  const start=m.fragmentShader.indexOf('      float band='),end=m.fragmentShader.indexOf('      gl_FragColor');
  m.fragmentShader=m.fragmentShader.slice(0,start)+`
      float edge=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y));
      float envelope=smoothstep(0.0,0.12,edge);
      vec3 color=mix(uDark,uMain,smoothstep(0.22,0.72,field));
      if(uVariant<1.5){
        float band=(field-0.52)/0.115;
        float glow=exp(-band*band);
        float violet=smoothstep(0.48,0.74,r.y)*0.42;
        vec3 sheen=mix(uIce,uLavender,violet);
        color=mix(color,sheen,glow*0.52);
      }else{
        float band=(field-0.52)/0.053;
        float glow=exp(-band*band);
        float angle=uVariant>2.5?uView.x*1.4+uView.y*0.7:0.0;
        float phase=(field-0.52)*13.0+r.x*1.6+r.y*0.7+0.18*sin(t*0.12)+angle;
        float spectral=0.5+0.5*sin(phase*3.14159265);
        vec3 sheen=mix(uCyan,uPurple,smoothstep(0.12,0.62,spectral));
        sheen=mix(sheen,uPink,smoothstep(0.65,0.95,spectral)*0.65);
        float gold=smoothstep(0.67,0.83,r.y)*smoothstep(0.64,0.8,r.x);
        sheen=mix(sheen,uGold,gold*0.65);
        color=mix(color,sheen,glow*0.72);
      }
      color=mix(uMain*0.78,color,envelope);
`+m.fragmentShader.slice(end);
  return m;
}
