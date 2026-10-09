// Picks a quality tier from the device, overridable with ?quality=low|medium|high.
export function detectQuality(gl) {
  const q = new URLSearchParams(location.search).get('quality');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  const mobile = coarse && small;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  let renderer = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) { /* ignore */ }
  const software = /swiftshader|llvmpipe|software/i.test(renderer);
  let tier = 'high';
  if (mobile) tier = cores >= 8 && mem >= 6 ? 'medium' : 'low';
  else if (software || cores <= 4 || mem <= 4) tier = 'medium';
  if (software) tier = 'low';
  if (['low', 'medium', 'high'].includes(q)) tier = q;
  const dpr = window.devicePixelRatio || 1;
  const T = {
    high:   { pixelRatio: Math.min(dpr, 2),   shadows: true,  shadowSize: 2048, areaLights: 6, maxVideos: 6, antialias: true,  minPixelRatio: 1 },
    medium: { pixelRatio: Math.min(dpr, 1.5), shadows: true,  shadowSize: 1024, areaLights: 4, maxVideos: 4, antialias: true,  minPixelRatio: 0.85 },
    low:    { pixelRatio: Math.min(dpr, 1),   shadows: false, shadowSize: 512,  areaLights: 2, maxVideos: 3, antialias: false, minPixelRatio: 0.5 },
  }[tier];
  return { tier, mobile, renderer, targetFps: mobile ? 30 : 55, ...T };
}
