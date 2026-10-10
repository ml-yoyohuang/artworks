import * as T from '../../showroom/vendor/three/build/three.module.js';

// Original procedural material study: no image, video or borrowed shader code.
// Inputs are authored sRGB swatches; Three.Color converts them to linear working values.
export function oilMaterial(){
  return new T.ShaderMaterial({toneMapped:false,uniforms:{
    uTime:{value:0},uDark:{value:new T.Color('#223040')},uMain:{value:new T.Color('#314457')},
    uPearl:{value:new T.Color('#7b91a1')},uTeal:{value:new T.Color('#668582')},uViolet:{value:new T.Color('#797990')}
  },vertexShader:`varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
    uniform float uTime;
    uniform vec3 uDark,uMain,uPearl,uTeal,uViolet;
    varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.0-15.0)+10.0);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
    float fbm(vec2 p,float t){float result=0.0,weight=0.57;
      for(int i=0;i<2;i++){float fi=float(i);p=turn(sin(t*0.09+fi*2.1)*0.21)*p;
        result+=weight*noise(p+vec2(sin(t*0.13+fi),cos(t*0.11-fi))*0.32);
        p=turn(0.63)*p*1.85+vec2(3.7,9.2);weight*=0.35;}
      return result/0.7695;}
    vec2 roll(vec2 p,vec2 center,float phase,float t){vec2 q=p-center;
      float influence=exp(-dot(q,q)*0.65);
      float angle=(sin(t*0.19+phase)*0.85+sin(t*0.073+phase*1.7)*0.48)*influence;
      return center+turn(angle)*q;}
    void main(){
      float t=uTime;vec2 p=(vUv-0.5)*3.6;
      p=roll(p,vec2(-0.7,0.65),0.2,t);
      p=roll(p,vec2(0.8,-0.55),2.6,t);
      vec2 q=vec2(fbm(p+vec2(0.0,2.7),t),fbm(p+vec2(5.8,1.3),t+8.0));
      vec2 r=vec2(fbm(p+q*0.65+vec2(1.7,3.2),t+2.0),fbm(p+q*0.65+vec2(6.2,8.5),t+11.0));
      float field=fbm(p+r*0.9,t);
      float band=(field-0.52)/0.115;
      float pearl=exp(-band*band);
      float edge=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y));
      float envelope=smoothstep(0.0,0.12,edge);
      vec3 color=mix(uDark,uMain,smoothstep(0.22,0.72,field));
      color=mix(color,uPearl,pearl*0.42);
      color=mix(color,uTeal,pearl*smoothstep(0.46,0.75,r.x)*0.19);
      color=mix(color,uViolet,pearl*smoothstep(0.50,0.77,r.y)*0.13);
      color=mix(uMain*0.78,color,envelope);
      gl_FragColor=vec4(color,1.0);
      #include <colorspace_fragment>
    }`});
}
