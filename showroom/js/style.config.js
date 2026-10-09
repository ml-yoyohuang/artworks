// Atmospheric minimalism — every visual parameter of the space lives here.
// Artworks themselves are never affected by these values.
export const STYLE = {
  // ---- palette: 4 main colours + 1 accent ----
  palette: {
    groundLight: '#E2B5A0',   // sand / floor, near
    groundDeep: '#D4A08A',    // sand / floor, far and in shade
    skyTop: '#BFC8AE',        // zenith
    skyHorizon: '#E8E6D6',    // horizon = fog colour
    highlight: '#FFF5DE',     // light pillar, sun, sparkle
    accent: '#B8361F',        // used once: the half-buried clay jars
  },

  // ---- sky dome ----
  sky: {
    radius: 380,
    horizonSoftness: 0.22,    // 0 = hard band, 1 = gradient across the whole dome
    gradientPower: 0.85,      // <1 keeps more of the pale horizon colour
  },

  // ---- atmosphere ----
  fog: {
    density: 0.011,           // exponential-squared density in daylight areas
    heightBoost: 1.3,         // extra density close to the ground (0 = none)
    heightFalloff: 3.2,       // metres over which the ground fog thins out
    darkColor: '#000000',     // fog colour inside the darkroom (keeps it black)
  },

  // ---- light: one warm key light + sky/ground hemisphere ----
  light: {
    sunColor: '#FFE7C4',      // warm key light (a warmer shade of the highlight)
    sunIntensity: 1.55,
    sunElevation: 48,         // degrees above the horizon
    sunAzimuth: 132,          // degrees, 0 = toward −z (the main walking direction), clockwise from above
    shadowRadius: 9,          // PCF blur radius: large = very soft
    shadowIntensity: 0.38,    // 0 = no shadow, 1 = full
    hemiSky: '#E9EBDD',       // sky bounce (pale sky mixed with highlight)
    hemiGround: '#E7C2AE',    // warm sand bounce
    hemiIntensity: 1.7,
    envIntensity: 0.12,
  },

  // ---- half-buried clay jars (the single accent) ----
  jars: {
    x: 13, z: -70,            // on the sight line through the second hall's window
    fogAmount: 0.4,           // lower = the red stays clearer through the haze
    items: [                  // positions relative to the group; height in metres; sunk = share below the sand
      { x: 0, z: 0, height: 2.6, sunk: 0.34, tiltX: 0.14, tiltZ: -0.34, turn: 0 },
      { x: -3.3, z: -7.8, height: 1.6, sunk: 0.24, tiltX: 0.26, tiltZ: 1.25, turn: 0.9 },
    ],
  },

  // ---- wind: flowing trails of light across the sky ----
  windTrails: {
    count: 9,
    seed: 20261010,
    centre: [14, -45],        // x, z of the area the trails cross
    spread: 150,              // metres the trails are scattered over
    height: [30, 78],         // metres above the sand
    length: [170, 290],
    heading: 0.55,            // radians: the one wind direction every trail follows (0 = toward −z)
    headingSpread: 0.04,      // keep near 0: one wind, parallel trails
    sway: 7, lift: 5,         // gentle bends only, so trails stay nearly parallel
    width: 2.4,               // ribbon half-width in metres
    opacity: 0.7,
    hdr: 1.9,                 // >1 lets the bright heads bloom
    softness: 0.35,           // share of each streak spent fading in/out (soft at both ends, no 'head')
    pulses: [2, 4],           // streaks travelling along one ribbon
    windSpeed: 8,             // metres per second, the same for every trail (one wind)
  },

  ground: {
    size: 1800,               // the sand plain that runs to the horizon
    albedoSaturation: 0.55,   // palette colour → surface colour (warm light adds saturation back)
    albedoBrightness: 1.0,
    roughness: 0.92,
    driftScale: 0.045,        // size of the slow light/deep sand colour drift (1/metres)
    reliefScale: 0.55,        // size of the soft surface undulation (1/metres)
    reliefStrength: 0.22,     // 0 = flat, 0.5 = clearly rippled
    sparkleDensity: 14,       // glint cells per metre
    sparkleProbability: 0.012,// share of cells lit for a given view angle
    sparkleViewSteps: 16,     // how quickly glints change as you turn / move
    sparkleIntensity: 2.2,
    sparkleRange: 14,         // metres; glints fade out beyond this
    foregroundShade: 0.72,     // sand right at your feet is this much darker (value layering: near < mid < far)
    foregroundRange: [1.2, 16], // metres over which it returns to full brightness
  },
  walls: {
    color: '#E8E6D6',         // horizon colour: walls dissolve into the sky
    albedoSaturation: 0.8,
    albedoBrightness: 0.8,    // one value step below the sky, so walls read as the middle ground
    aoStrength: 0.9,
  },

  // ---- composition ----
  camera: {
    restPitch: 0.06,          // radians; slight upward look keeps the horizon low in frame
  },

  // ---- post-processing (never applied to artworks) ----
  bloom: {
    strength: 0.34,           // low
    radius: 0.6,
    threshold: 1.0,           // high: only the light pillar, glints and light boxes bloom
    smoothWidth: 0.2,
  },
  vignette: {
    strength: 0.16,           // in daylight
    darkStrength: 0.3,        // added toward the darkroom
    softness: 0.6,
  },

  // ---- slow motion (every period well above 4 s) ----
  motion: {
    cloudHeight: 150, cloudScale: 0.0085, cloudSpeed: 0.0045, cloudOpacity: 0.32,   // ≈ 220 s per noise cell
    dustBox: 14, dustSize: 1.1, dustOpacity: 0.55, dustPeriod: 14,                   // seconds per sway
  },

  // ---- the walk from daylight to darkroom (kept from the original concept) ----
  daylight: {
    exposure: 1.0,
    darkExposureBoost: 0.12,
  },
};

/** CSS-free helper: hex → THREE-compatible number */
export const hex = (s) => parseInt(s.replace('#', ''), 16);
