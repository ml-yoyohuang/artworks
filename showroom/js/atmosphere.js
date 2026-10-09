// Sky dome and height fog for the daylight halls.
import * as THREE from 'three';
import { STYLE } from './style.config.js';
import { sandMaterial } from './materials.js';

let patched = false;
/**
 * Extends three's exponential-squared fog with extra density near the ground.
 * Must run before any material compiles. Effective density along a view ray is
 * density · (1 + boost · mean(e^(−y/falloff)) at the eye and the surface).
 */
export function installHeightFog() {
  if (patched) return; patched = true;
  const { heightBoost, heightFalloff } = STYLE.fog;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying float vFogWorldY;\n#endif';
  C.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogWorldY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;\n#endif';
  C.fog_pars_fragment = C.fog_pars_fragment.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying float vFogWorldY;');
  C.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogH = 0.5 * ( exp( - max( vFogWorldY, 0.0 ) / ${heightFalloff.toFixed(3)} ) + exp( - max( cameraPosition.y, 0.0 ) / ${heightFalloff.toFixed(3)} ) );
		float fogD = fogDensity * ( 1.0 + ${heightBoost.toFixed(3)} * fogH );
		float fogFactor = 1.0 - exp( - fogD * fogD * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	#ifdef FOG_AMOUNT
		fogFactor *= FOG_AMOUNT;
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
}

/** Large inverted sphere with a zenith → horizon gradient; follows the camera. */
export function createSky() {
  const P = STYLE.palette, S = STYLE.sky;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: true,
    uniforms: {
      top: { value: new THREE.Color(P.skyTop) },
      horizon: { value: new THREE.Color(P.skyHorizon) },
      softness: { value: S.horizonSoftness },
      power: { value: S.gradientPower },
      brightness: { value: 1 },
    },
    vertexShader: `varying vec3 vDir;
      void main() { vDir = normalize( position ); gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform float softness; uniform float power; uniform float brightness; varying vec3 vDir;
      void main() {
        float h = max( vDir.y, 0.0 );
        float t = pow( smoothstep( 0.0, 1.0, h / max( softness + 0.0001, 0.0001 ) * 0.5 + h * 0.5 ), power );
        gl_FragColor = vec4( mix( horizon, top, clamp( t, 0.0, 1.0 ) ) * brightness, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(S.radius, 48, 24), mat);
  sky.renderOrder = -10; sky.frustumCulled = false;
  return sky;
}

/** The sand plain that runs to the horizon, just below the room floors. */
export function createGround() {
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(STYLE.ground.size, STYLE.ground.size),
    sandMaterial(),
  );
  g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true;
  return g;
}

/**
 * Distant landmark: a plain monolith on an accent-coloured plinth, with a
 * vertical light pillar rising from it. The only saturated colour in the space.
 */
export function createLandmark() {
  const L = STYLE.landmark, P = STYLE.pillar, C = STYLE.palette;
  const group = new THREE.Group();
  group.position.set(L.x, 0, L.z);
  const fogged = (mat, k) => { mat.defines = { ...(mat.defines || {}), FOG_AMOUNT: k.toFixed(3) }; return mat; };
  const stone = new THREE.Mesh(new THREE.BoxGeometry(L.width, L.height, L.depth), fogged(new THREE.MeshStandardMaterial({ color: new THREE.Color(L.color), roughness: 1 }), L.fogAmount));
  stone.position.y = L.baseHeight + L.height / 2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(L.baseWidth, L.baseHeight, L.baseDepth), fogged(new THREE.MeshStandardMaterial({ color: new THREE.Color(C.accent), roughness: 0.9 }), L.baseFogAmount));
  base.position.y = L.baseHeight / 2;
  group.add(stone, base);

  // light pillar: one vertical billboard that turns to face the visitor; a soft
  // gaussian core plus a wide halo across its width, so it has no hard edge.
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: {
      color: { value: new THREE.Color(C.highlight) }, height: { value: P.height }, fadeIn: { value: P.fadeIn }, pulse: { value: 1 },
      core: { value: P.radius }, halo: { value: P.haloRadius }, coreOpacity: { value: P.coreOpacity }, haloOpacity: { value: P.haloOpacity }, hdr: { value: P.hdr },
    },
    vertexShader: `uniform float halo; varying vec2 vP;
      void main() {
        vec3 centre = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
        vec2 toCam = cameraPosition.xz - centre.xz;
        float l = length( toCam );
        vec2 f = l > 1e-3 ? toCam / l : vec2( 0.0, 1.0 );
        vec3 right = vec3( f.y, 0.0, -f.x );
        vP = vec2( position.x, position.y );            // x in metres across, y from the base
        vec3 w = centre + right * position.x + vec3( 0.0, position.y, 0.0 );
        gl_Position = projectionMatrix * viewMatrix * vec4( w, 1.0 );
      }`,
    fragmentShader: `uniform vec3 color; uniform float height; uniform float fadeIn; uniform float pulse;
      uniform float core; uniform float halo; uniform float coreOpacity; uniform float haloOpacity; uniform float hdr; varying vec2 vP;
      void main() {
        float x = abs( vP.x );
        float a = coreOpacity * exp( - x * x / ( core * core ) ) + haloOpacity * exp( - x * x / ( halo * halo * 0.35 ) );
        float y = vP.y;
        a *= smoothstep( 0.0, fadeIn, y ) * ( 1.0 - smoothstep( height * 0.2, height, y ) ) * pulse;
        a = clamp( a, 0.0, 4.0 );
        gl_FragColor = vec4( color * a * hdr, a );
      }`,
  });
  const geo = new THREE.PlaneGeometry(P.haloRadius * 2.4, P.height, 1, 1);
  geo.translate(0, P.height / 2, 0);
  const beam = new THREE.Mesh(geo, mat);
  beam.position.y = L.baseHeight; beam.renderOrder = 5; beam.frustumCulled = false;
  group.add(beam);
  group.userData.pillar = [beam];
  return group;
}

/** A thin, very slow cloud layer high above the plain. */
export function createClouds() {
  const M = STYLE.motion, P = STYLE.palette;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(P.highlight) }, opacity: { value: M.cloudOpacity }, scale: { value: M.cloudScale }, speed: { value: M.cloudSpeed } },
    vertexShader: 'varying vec2 vXZ; void main() { vec4 w = modelMatrix * vec4( position, 1.0 ); vXZ = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float time; uniform vec3 color; uniform float opacity; uniform float scale; uniform float speed; varying vec2 vXZ;
      float h( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
      float n( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f ); return mix( mix( h( i ), h( i + vec2( 1, 0 ) ), u.x ), mix( h( i + vec2( 0, 1 ) ), h( i + vec2( 1, 1 ) ), u.x ), u.y ); }
      void main() {
        vec2 p = vXZ * scale + vec2( time * speed, time * speed * 0.35 );
        float c = n( p ) * 0.55 + n( p * 2.1 + 5.2 ) * 0.3 + n( p * 4.3 - 2.0 ) * 0.15;
        c = smoothstep( 0.52, 0.85, c );
        float edge = 1.0 - smoothstep( 180.0, 520.0, length( vXZ - cameraPosition.xz ) );
        gl_FragColor = vec4( color, c * opacity * edge );
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat);
  m.rotation.x = Math.PI / 2; m.position.y = M.cloudHeight; m.renderOrder = -5; m.frustumCulled = false;
  return m;
}

/** Fine dust drifting around the visitor; wraps in a box that follows the camera. */
export function createDust(count) {
  const M = STYLE.motion;
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = Math.random(); pos[i * 3 + 1] = Math.random(); pos[i * 3 + 2] = Math.random(); seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { time: { value: 0 }, box: { value: M.dustBox }, size: { value: M.dustSize * Math.min(window.devicePixelRatio || 1, 2) }, color: { value: new THREE.Color(STYLE.palette.highlight) }, opacity: { value: 0 }, period: { value: M.dustPeriod } },
    vertexShader: `attribute float seed; uniform float time; uniform float box; uniform float size; uniform float period; varying float vA;
      void main() {
        float ph = 6.2831853 * ( time / ( period * ( 0.75 + seed * 0.5 ) ) + seed * 10.0 );
        vec3 drift = vec3( sin( ph ) * 0.6, sin( ph * 0.7 + seed * 3.0 ) * 0.25 + time * 0.03 * ( 0.5 + seed ), cos( ph * 0.8 ) * 0.6 );
        vec3 p = position * box + drift;
        vec3 c = cameraPosition - vec3( box * 0.5, 1.5, box * 0.5 );
        p = mod( p - c, vec3( box, 4.0, box ) ) + c;            // stay around the visitor
        vec4 mv = viewMatrix * vec4( p, 1.0 );
        float d = -mv.z;
        vA = smoothstep( 0.4, 1.4, d ) * ( 1.0 - smoothstep( box * 0.3, box * 0.5, d ) );
        gl_PointSize = size * ( 0.6 + seed * 0.8 ) / max( d, 0.5 ) * 8.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying float vA;
      void main() { float r = length( gl_PointCoord - 0.5 ); float a = ( 1.0 - smoothstep( 0.1, 0.5, r ) ) * vA * opacity; gl_FragColor = vec4( color * a, a ); }`,
  });
  // never over an artwork (artworks write stencil 1)
  Object.assign(mat, { stencilWrite: true, stencilWriteMask: 0x00, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 4;
  return pts;
}

/** Per-frame: advance slow motion (frozen under reduced motion), fade with daylight. */
export function updateAtmosphere({ clouds, dust, landmark }, t, day, reduced) {
  const M = STYLE.motion;
  const time = reduced ? 0 : t;
  if (clouds) { clouds.material.uniforms.time.value = time; clouds.position.x = 0; }
  if (dust) { dust.material.uniforms.time.value = time; dust.material.uniforms.opacity.value = M.dustOpacity * day; dust.visible = day > 0.02; }
  if (landmark) {
    const pulse = reduced ? 1 : 1 + M.pillarPulse * Math.sin((t / M.pillarPeriod) * Math.PI * 2);
    for (const m of landmark.userData.pillar) m.material.uniforms.pulse.value = pulse;
  }
}
