// Stylised surface materials: flat colours with soft gradients, and a sand
// shader with gentle noise relief and view-dependent sparkle.
import * as THREE from 'three';
import { STYLE } from './style.config.js';

/** A palette colour pulled toward grey, so warm light does not over-saturate it. */
export function albedo(hexColor, saturation = 1) {
  const c = new THREE.Color(hexColor);
  const hsl = {}; c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s * saturation, hsl.l);
}

const shaders = new Set();

/**
 * Sand: MeshStandardMaterial + world-space value-noise relief, a two-tone
 * colour drift between the two sand colours, and tiny glints that appear and
 * vanish as the viewing angle changes (no time dependence).
 */
export function sandMaterial({ aoMap = null, sparkle = true } = {}) {
  const G = STYLE.ground, P = STYLE.palette;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: G.roughness, metalness: 0, aoMap, aoMapIntensity: 1 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSandA = { value: albedo(P.groundLight, G.albedoSaturation).multiplyScalar(G.albedoBrightness) };
    shader.uniforms.uSandB = { value: albedo(P.groundDeep, G.albedoSaturation).multiplyScalar(G.albedoBrightness) };
    shader.uniforms.uGlint = { value: new THREE.Color(P.highlight) };
    shader.uniforms.uSparkle = { value: sparkle ? G.sparkleIntensity : 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSandPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSandPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vSandPos;
uniform vec3 uSandA; uniform vec3 uSandB; uniform vec3 uGlint; uniform float uSparkle;
float sHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float sNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( sHash( i ), sHash( i + vec2( 1, 0 ) ), u.x ), mix( sHash( i + vec2( 0, 1 ) ), sHash( i + vec2( 1, 1 ) ), u.x ), u.y );
}
float sFbm( vec2 p ) { return sNoise( p ) * 0.6 + sNoise( p * 2.07 + 3.1 ) * 0.28 + sNoise( p * 4.3 - 1.7 ) * 0.12; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float drift = smoothstep( 0.25, 0.85, sFbm( vSandPos.xz * ${G.driftScale.toFixed(4)} ) );
  diffuseColor.rgb *= mix( uSandA, uSandB, drift );
  // value layering: the ground near the viewer sits a step darker than the middle distance
  float nearD = length( cameraPosition.xz - vSandPos.xz );
  diffuseColor.rgb *= mix( ${G.foregroundShade.toFixed(3)}, 1.0, smoothstep( ${G.foregroundRange[0].toFixed(2)}, ${G.foregroundRange[1].toFixed(2)}, nearD ) );
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  // soft relief: tilt the (upward) surface normal by the noise gradient
  vec2 q = vSandPos.xz * ${G.reliefScale.toFixed(4)};
  float e = 0.15;
  float h0 = sFbm( q ), hx = sFbm( q + vec2( e, 0.0 ) ), hz = sFbm( q + vec2( 0.0, e ) );
  vec3 nW = normalize( vec3( -( hx - h0 ) / e * ${G.reliefStrength.toFixed(4)}, 1.0, -( hz - h0 ) / e * ${G.reliefStrength.toFixed(4)} ) );
  normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if ( uSparkle > 0.0 ) {
  // glints: one candidate per small cell; which ones light up depends on the view angle
  vec3 V = normalize( cameraPosition - vSandPos );
  float dist = length( cameraPosition - vSandPos );
  vec2 cellP = vSandPos.xz * ${G.sparkleDensity.toFixed(3)};
  vec2 cell = floor( cellP );
  vec2 viewKey = floor( V.xz * ${G.sparkleViewSteps.toFixed(2)} + V.y * 3.0 );
  float h = sHash( cell + viewKey * 17.13 );
  vec2 c = vec2( sHash( cell + 7.1 ), sHash( cell + 3.7 ) ) * 0.6 + 0.2;
  float r = length( fract( cellP ) - c );
  float dot_ = 1.0 - smoothstep( 0.06, 0.14, r );
  float on = step( 1.0 - ${G.sparkleProbability.toFixed(4)}, h );
  float fade = 1.0 - smoothstep( ${(G.sparkleRange * 0.5).toFixed(2)}, ${G.sparkleRange.toFixed(2)}, dist );
  totalEmissiveRadiance += uGlint * ( on * dot_ * fade * uSparkle );
}`);
    shader.sparkleEnabled = sparkle; mat.userData.shader = shader; shaders.add(shader);
  };
  mat.customProgramCacheKey = () => `sand-${sparkle ? 1 : 0}`;
  return mat;
}

/** Scale every sand glint (e.g. by the daylight factor). */
export function setSparkle(k) {
  for (const s of shaders) s.uniforms.uSparkle.value = s.sparkleEnabled ? STYLE.ground.sparkleIntensity * k : 0;
}

/** Flat wall material: one colour; the only gradient comes from the baked occlusion. */
export function wallMaterial(aoMap) {
  const W = STYLE.walls;
  return new THREE.MeshStandardMaterial({ color: albedo(W.color, W.albedoSaturation).multiplyScalar(W.albedoBrightness), aoMap, aoMapIntensity: W.aoStrength, roughness: 1 });
}
