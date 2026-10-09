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
 * Red clay jars, half sunk into low sand mounds: the only saturated colour in
 * the space. Profiles are lathed from a few points, so the forms stay minimal.
 */
export function createJars() {
  const J = STYLE.jars, P = STYLE.palette;
  const group = new THREE.Group();
  group.position.set(J.x, 0, J.z);
  // radius, height (normalised): round belly, short neck, thin lip
  const profile = [[0, 0], [0.3, 0.015], [0.47, 0.16], [0.53, 0.42], [0.47, 0.68], [0.3, 0.86], [0.19, 0.93], [0.19, 0.99], [0.215, 1.0], [0.2, 1.02], [0.17, 1.0]];
  const clay = new THREE.MeshStandardMaterial({ color: new THREE.Color(P.accent), roughness: 0.92, side: THREE.DoubleSide });
  clay.defines = { FOG_AMOUNT: J.fogAmount.toFixed(3) };
  const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color(P.groundDeep).lerp(new THREE.Color(P.groundLight), 0.5), roughness: 1 });
  for (const j of J.items) {
    const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * j.height * 0.82, y * j.height)), 48);
    const jar = new THREE.Mesh(geo, clay);
    jar.position.set(j.x, -j.height * j.sunk, j.z);
    jar.rotation.set(j.tiltX, j.turn, j.tiltZ);
    jar.castShadow = true;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), sand);
    mound.scale.set(j.height * 0.95, j.height * 0.22, j.height * 0.95);
    mound.position.set(j.x, -0.01, j.z);
    mound.receiveShadow = true;
    group.add(jar, mound);
  }
  return group;
}

/**
 * Wind trails: long ribbons arcing across the sky. Bright heads with long tails
 * flow along each ribbon; the ribbon always turns its face toward the viewer.
 */
export function createWindTrails() {
  const W = STYLE.windTrails, P = STYLE.palette;
  let seed = W.seed;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const group = new THREE.Group();
  for (let k = 0; k < W.count; k++) {
    const heading = W.heading + (rnd() - 0.5) * W.headingSpread;           // direction the wind blows
    const dir = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const centre = new THREE.Vector3(W.centre[0] + (rnd() - 0.5) * W.spread, W.height[0] + rnd() * (W.height[1] - W.height[0]), W.centre[1] + (rnd() - 0.5) * W.spread);
    const len = W.length[0] + rnd() * (W.length[1] - W.length[0]);
    const amp = W.sway * (0.5 + rnd()), lift = W.lift * (rnd() - 0.5), ph = rnd() * 6.28;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6 - 0.5;
      pts.push(centre.clone().addScaledVector(dir, t * len).addScaledVector(side, Math.sin(t * 2.6 + ph) * amp).add(new THREE.Vector3(0, Math.sin(t * 2.0 + ph) * lift, 0)));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const N = 160, pos = [], tan = [], sideA = [], u = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const p = curve.getPointAt(i / N), tg = curve.getTangentAt(i / N);
      for (const sgn of [-1, 1]) { pos.push(p.x, p.y, p.z); tan.push(tg.x, tg.y, tg.z); sideA.push(sgn); u.push(i / N); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aTangent', new THREE.Float32BufferAttribute(tan, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(sideA, 1));
    g.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1));
    g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      uniforms: {
        time: { value: 0 }, color: { value: new THREE.Color(P.highlight) }, width: { value: W.width * (0.6 + rnd() * 0.8) },
        opacity: { value: W.opacity * (0.55 + rnd() * 0.45) }, hdr: { value: W.hdr },
        pulses: { value: 0 }, rate: { value: 0 }, offset: { value: rnd() }, softness: { value: W.softness }, fade: { value: 1 },
      },
      vertexShader: `attribute vec3 aTangent; attribute float aSide; attribute float aU; uniform float width; varying float vSide; varying float vU;
        void main() {
          vec3 toCam = normalize( cameraPosition - position );
          vec3 off = cross( aTangent, toCam );
          float l = length( off ); off = l > 1e-4 ? off / l : vec3( 0.0, 1.0, 0.0 );
          float taper = sin( 3.14159 * aU );
          vSide = aSide; vU = aU;
          gl_Position = projectionMatrix * viewMatrix * vec4( position + off * width * taper * aSide, 1.0 );
        }`,
      fragmentShader: `uniform float time; uniform vec3 color; uniform float opacity; uniform float hdr; uniform float rate; uniform float pulses; uniform float offset; uniform float softness; uniform float fade; varying float vSide; varying float vU;
        void main() {
          float across = 1.0 - smoothstep( 0.15, 1.0, abs( vSide ) );
          float f = fract( vU * pulses - time * rate + offset );
          // a soft elongated dash: fades in and out symmetrically, no bright head
          float streak = smoothstep( 0.0, softness, f ) * ( 1.0 - smoothstep( 1.0 - softness, 1.0, f ) ) * 0.85;
          float ends = smoothstep( 0.0, 0.18, vU ) * ( 1.0 - smoothstep( 0.82, 1.0, vU ) );
          float a = clamp( across * ( 0.12 + streak ) * ends * opacity * fade, 0.0, 2.0 );
          gl_FragColor = vec4( color * a * hdr, a );
        }`,
    });
    // one wind: every streak moves at the same speed in metres per second
    const pulses = Math.round(W.pulses[0] + rnd() * (W.pulses[1] - W.pulses[0]));
    mat.uniforms.pulses.value = pulses;
    mat.uniforms.rate.value = W.windSpeed * pulses / curve.getLength();
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -4;
    group.add(m);
  }
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
export function updateAtmosphere({ clouds, dust, trails }, t, day, reduced) {
  const M = STYLE.motion;
  const time = reduced ? 0 : t;
  if (clouds) clouds.material.uniforms.time.value = time;
  if (dust) { dust.material.uniforms.time.value = time; dust.material.uniforms.opacity.value = M.dustOpacity * day; dust.visible = day > 0.02; }
  if (trails) for (const m of trails.children) { m.material.uniforms.time.value = time; m.material.uniforms.fade.value = day; }
  if (trails) trails.visible = day > 0.01;
}
