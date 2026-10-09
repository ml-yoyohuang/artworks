// Post-processing that never touches the artworks.
//
// 1. The scene renders into an HDR target. Artwork materials write alpha = 0,
//    everything else alpha = 1, so the alpha channel is an exact artwork mask.
// 2. UnrealBloom extracts bright areas only where alpha = 1.
// 3. A final pass outputs artwork pixels untouched (linear → sRGB only, exactly
//    as when they are drawn without tone mapping) and gives the space ACES
//    tone mapping, bloom and a soft vignette.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { STYLE } from './style.config.js';
import { ART_MASK } from './artworks.js';

const COMPOSITE = {
  uniforms: {
    tScene: { value: null }, tBloom: { value: null },
    exposure: { value: 1 }, bloomGain: { value: 1 },
    vignette: { value: 0.2 }, vignetteSoftness: { value: 0.55 }, aspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
  fragmentShader: `
    uniform sampler2D tScene; uniform sampler2D tBloom;
    uniform float exposure; uniform float bloomGain; uniform float vignette; uniform float vignetteSoftness; uniform float aspect;
    varying vec2 vUv;
    // three.js ACESFilmicToneMapping (fitted)
    vec3 postRRTFit( vec3 v ) { vec3 a = v * ( v + 0.0245786 ) - 0.000090537; vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081; return a / b; }
    vec3 postAces( vec3 color ) {
      const mat3 postInMat = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
      const mat3 postOutMat = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
      color *= exposure / 0.6;
      color = postInMat * color; color = postRRTFit( color ); color = postOutMat * color;
      return clamp( color, 0.0, 1.0 );
    }
    vec3 toSRGB( vec3 c ) { c = clamp( c, 0.0, 1.0 ); return mix( c * 12.92, 1.055 * pow( c, vec3( 0.41666 ) ) - 0.055, step( 0.0031308, c ) ); }
    void main() {
      vec4 s = texture2D( tScene, vUv );
      vec3 env = postAces( s.rgb + texture2D( tBloom, vUv ).rgb * bloomGain );
      vec2 p = ( vUv - 0.5 ) * vec2( aspect, 1.0 );
      float v = 1.0 - vignette * smoothstep( 1.0 - vignetteSoftness, 1.25, length( p ) * 1.25 );
      env = toSRGB( env ) * v;
      vec3 art = toSRGB( s.rgb );
      gl_FragColor = vec4( mix( art, env, clamp( s.a, 0.0, 1.0 ) ), 1.0 );
    }`,
};

export class Post {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.quality = quality;
    this.enabled = quality.post;
    this.size = new THREE.Vector2();
    if (!this.enabled) return;
    const B = STYLE.bloom;
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality.msaa, depthBuffer: true, stencilBuffer: true });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), B.strength, B.radius, B.threshold);
    // bloom only from the space (alpha = 1), never from an artwork
    const hp = this.bloom.materialHighPassFilter;
    hp.fragmentShader = hp.fragmentShader.replace(
      'float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );',
      'float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v ) * clamp( texel.a, 0.0, 1.0 );');
    hp.needsUpdate = true;
    this.bloom.highPassUniforms.smoothWidth.value = B.smoothWidth;
    // we composite ourselves: neutralise the pass's own additive blend into its input
    this.bloom.copyUniforms.opacity.value = 0;
    this.composite = new THREE.ShaderMaterial({ ...COMPOSITE, uniforms: THREE.UniformsUtils.clone(COMPOSITE.uniforms), depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.composite);
  }

  resize() {
    if (!this.enabled) return;
    const v = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if (v.equals(this.size)) return;
    this.size.copy(v);
    this.target.setSize(v.x, v.y);
    const k = this.quality.bloomScale;
    this.bloom.setSize(Math.max(1, Math.round(v.x * k)), Math.max(1, Math.round(v.y * k)));
  }

  render(day) {
    const r = this.renderer;
    if (!this.enabled) { ART_MASK.value = 0; r.setRenderTarget(null); r.render(this.scene, this.camera); return; }
    this.resize();
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 1);
    r.clear();
    ART_MASK.value = 1;
    r.render(this.scene, this.camera);
    ART_MASK.value = 0;
    this.bloom.render(r, null, this.target, 0, false);
    const u = this.composite.uniforms, V = STYLE.vignette;
    u.tScene.value = this.target.texture;
    u.tBloom.value = this.bloom.renderTargetsHorizontal[0].texture;
    u.exposure.value = r.toneMappingExposure;
    u.vignette.value = V.strength + V.darkStrength * (1 - day);
    u.vignetteSoftness.value = V.softness;
    u.aspect.value = this.size.x / this.size.y;
    r.setRenderTarget(null);
    this.quad.render(r);
  }
}
