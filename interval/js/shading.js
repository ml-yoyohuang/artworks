import * as T from '../../showroom/vendor/three/build/three.module.js';

// Display-referred architectural swatches: dark / main / light, all authored in sRGB.
// Artwork previews and the entrance's physical materials never use this palette.
export const PALETTE = {
  '#dadbd3':['#abb8b8','#e0e6e2','#edf0e9'],
  '#c9cfc8':['#a5b6b4','#cfdcd5','#e1e8e0'],
  '#c8c9c1':['#a3b1ad','#ced8d0','#e0e7dc'],
  '#d7d5cc':['#bbc8c7','#e1e5dd','#e9ece4'],
  '#c7bfac':['#a9bab5','#d8dfcf','#e6e9dc'],
  '#a8654b':['#a94f3d','#d67b56','#e99b72'],
  '#b8613f':['#a94f3d','#d67b56','#e99b72'],
  '#555b45':['#52624e','#758365','#91a17e'],
  '#7c8580':['#687d74','#96aba0','#b0c0af'],
  '#b5b3a7':['#a1afa5','#d1d8c8','#e1e5d6'],
  '#c8c9bc':['#a8b9b0','#dce3d2','#eaf0df'],
  '#d6c9b2':['#b6c1b5','#dce0ce','#e9eddd'],
  '#c6a88b':['#b5aa90','#d9c9a8','#e6d8bc'],
  '#2b393a':['#203437','#354f50','#476160'],
  '#263a3b':['#1c3237','#304d52','#426169'],
  '#172a2d':['#14262e','#263e45','#354e54'],
  '#394b49':['#30494b','#526d69','#70877c'],
  '#344447':['#2a4249','#47646b','#617b7d'],
  '#52625e':['#3b5354','#617b70','#7f9584'],
  '#263b39':['#203d42','#385653','#4f6e65'],
  '#64716b':['#4c6563','#809486','#9fac97'],
  '#4a4d51':['#323e51','#4c5c6d','#607082'],
  '#252936':['#1e293c','#303e55','#42546b'],
  '#222c35':['#1c2b3e','#2b3c52','#3c5267'],
  '#35454d':['#273d4d','#465f70','#5d7784'],
  '#45545c':['#344b5c','#57717f','#6d8994'],
  '#747e7e':['#516c77','#839eaa','#a1b5ba'],
  '#303c44':['#253c4b','#405b6a','#567380'],
  '#6b7071':['#435966','#637e89','#7d959e'],
  '#818b89':['#55727b','#809da4','#96afb0'],
  '#161b25':['#131f30','#202c40','#304158'],
  '#28343e':['#1c2e40','#30485d','#446177'],
  '#26333d':['#1d3042','#324b60','#476479'],
  '#afb7ae':['#799494','#abbfb2','#c8d3bf'],
  '#526263':['#3b5663','#627e85','#819b9c'],
  '#23211f':['#29313b','#38434c','#4a5960'],
  '#111b20':['#172632','#253643','#354957'],
  '#e7e8df':['#bfcdc8','#e3e9df','#f0f1e7'],
  '#676e76':['#3b4e5c','#566c7a','#6d8390'],
  '#102128':['#142c36','#24424b','#38565d'],
  '#242b36':['#1e3046','#324860','#486178']
};

export const GALLERY_LIGHT = [null,
  {sky:'#f0f6f4',ground:'#bdcdd0',sun:'#f7fcff',fog:[40,135]},
  {sky:'#f1f6ef',ground:'#c0d0cb',sun:'#fafff9',fog:[45,155]},
  {sky:'#c2d9df',ground:'#718e96',sun:'#e4f2f5',fog:[38,125]},
  {sky:'#c5d4e5',ground:'#748ba5',sun:'#e7efff',fog:[38,135]},
  {sky:'#c1d8e6',ground:'#7b94a6',sun:'#e6f3ff',fog:[42,140]}
];

export function architecturalMaterial(color, extra={}) {
  const swatches=PALETTE[color.toLowerCase()] || [color,color,color];
  const material=new T.MeshLambertMaterial({color:swatches[1],...extra,toneMapped:false});
  const uniforms={intervalDark:{value:new T.Color(swatches[0])},intervalMain:{value:new T.Color(swatches[1])},intervalLight:{value:new T.Color(swatches[2])}};
  material.userData.intervalPalette={source:color,swatches};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform vec3 intervalDark;
      uniform vec3 intervalMain;
      uniform vec3 intervalLight;`)
      .replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',`
        float facing = 0.5;
        #if NUM_DIR_LIGHTS > 0
          facing = dot(normal, directionalLights[0].direction) * 0.5 + 0.5;
        #endif
        // Broad middle plateau; narrow, smooth transitions on curved edges.
        vec3 cleanColor = mix(intervalDark, intervalMain, smoothstep(0.12, 0.38, facing));
        cleanColor = mix(cleanColor, intervalLight, smoothstep(0.80, 0.97, facing));
        // A coloured, bounded shadow preserves the authored hue and readable dark faces.
        vec3 outgoingLight = mix(cleanColor, intervalDark, (1.0-getShadowMask()) * 0.38);
      `);
  };
  material.customProgramCacheKey=()=> 'interval-clean-colour-v1';
  return material;
}
