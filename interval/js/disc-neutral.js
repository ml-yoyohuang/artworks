import * as T from '../../showroom/vendor/three/build/three.module.js';
import {architecturalMaterial} from './shading.js?v=colour-1';
// Authored cool-neutral tones keep light and dark faces free from the entrance's warm tint.
export function neutralMaterial(){
 const swatches=['#aebac3','#e1e6e8','#f0f2f2'];
 const material=architecturalMaterial('#d7d5cc',{side:T.DoubleSide});
 material.color.set(swatches[1]);material.userData.intervalPalette={source:'neutral-disc',swatches};
 const compile=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{compile(shader);for(const [i,name] of ['intervalDark','intervalMain','intervalLight'].entries())shader.uniforms[name].value.set(swatches[i]);};
 return material;
}
