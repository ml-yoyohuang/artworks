// The 3D gallery: renderer, input, focus on a work, render loop.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { installHeightFog, updateAtmosphere } from './atmosphere.js';
import { Post } from './post.js';
import { STYLE } from './style.config.js';
import { Artworks } from './artworks.js';
import { Navigator } from './navigation.js';
import { hang, START, ENTER_TARGET, isWalkable, clampWalkable, ROOMS, EYE } from './plan.js';
import { Card, PlanMap, WorkStrip, MiniMap, idleFade, openLayer, closeLayer, topLayer, closeTop, showHint } from './ui.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startApp({ ex, quality, viewer, reducedMotion, onProgress, openList }) {
  const stage = $('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance', stencil: true });
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  stage.append(renderer.domElement);

  installHeightFog();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 900);
  const fitFov = () => { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 70 : camera.aspect < 1.2 ? 62 : 55; camera.updateProjectionMatrix(); };
  fitFov();

  const world = buildWorld(scene, renderer, ex, quality);
  onProgress(0.55);
  const post = new Post(renderer, scene, camera, quality);
  const placements = hang(ex.works);
  const art = new Artworks(scene, ex, placements, quality);
  art.reducedMotion = reducedMotion;
  if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true;
  const index = new Map(ex.works.map((w, i) => [w.id, i + 1]));

  // ---------- transitions ----------
  const fadeEl = $('fade');
  async function fade(fn) {
    fadeEl.style.setProperty('--fade-color', world.day > 0.4 ? '#f2f0eb' : '#060606');
    fadeEl.classList.add('on'); await wait(reducedMotion ? 260 : 480);
    fn(); renderOnce();
    fadeEl.classList.remove('on'); await wait(reducedMotion ? 260 : 480);
  }
  const nav = new Navigator(camera, { reducedMotion, fade });
  nav.set(START.x, START.z, START.yaw, STYLE.camera.restPitch);

  // ---------- floor ring ----------
  const ring = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.225, 64), ringMat);
  const dotMat = ringMat.clone();
  const dotMesh = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), dotMat);
  ring.add(ringMesh, dotMesh); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006; ring.renderOrder = 3;
  scene.add(ring);
  let ringTarget = 0, ringHold = 0;

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const solids = [];
  world.group.traverse((o) => { if (o.isMesh) solids.push(o); });
  const pickTargets = [...solids, ...art.pickables];
  function pick(clientX, clientY) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    if (!hit) return null;
    if (hit.object.userData.workId) return { work: hit.object.userData.workId, point: hit.point };
    const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null;
    if (n && n.y > 0.5 && hit.point.y < 0.05 && hit.distance < 40) return { floor: hit.point };
    return { wall: hit.point };
  }

  // ---------- state ----------
  let mode = 'click';
  let focused = null;      // work id
  let returnPose = null;   // pose before focusing
  let entered = false;
  const offset = { x: 0, y: 0, tx: 0, ty: 0 };
  const card = new Card(ex);
  const map = new PlanMap(ex, placements, (w) => { closeLayer($('mapview')); focusWork(w.id, { teleport: true }); });

  function focusWork(id, { teleport = false } = {}) {
    const it = art.get(id); if (!it) return;
    if (!focused) returnPose = { x: nav.pos.x, z: nav.pos.z, yaw: nav.yaw, pitch: nav.pitch };
    focused = id; art.focusedId = id;
    if (document.pointerLockElement) document.exitPointerLock();
    card.show(it.work, index.get(id));
    requestAnimationFrame(() => {
      const occ = card.occupied();
      offset.tx = occ.right / 2; offset.ty = occ.bottom / 2;
      const f = nav.framing(it.place, innerWidth - occ.right, innerHeight - occ.bottom);
      nav.goTo(f.x, f.z, { yaw: f.yaw, pitch: f.pitch, fadeOver: teleport ? 12 : 34, speed: 1 });
    });
  }
  function dropFocus() {
    if (!focused) return;
    focused = null; art.focusedId = null; card.hide(); offset.tx = 0; offset.ty = 0;
  }
  /** Where 返回 / Esc takes you: the middle of the work's hall, looking along the route. */
  function hallHome(roomId) {
    const R = ROOMS[roomId] || ROOMS.garden;
    const p = clampWalkable((R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2, roomId);
    return { x: p.x, z: p.z, yaw: roomId === 'darkroom' ? Math.PI / 2 : 0 };
  }
  function leaveFocus() {
    if (!focused) return;
    const room = art.get(focused)?.place.room;
    dropFocus();
    const home = hallHome(room);
    nav.goTo(home.x, home.z, { yaw: home.yaw, pitch: STYLE.camera.restPitch });
    returnPose = null;
  }
  function step(dir) {
    if (!focused) return;
    const ids = ex.works.map((w) => w.id);
    const i = (ids.indexOf(focused) + dir + ids.length) % ids.length;
    focusWork(ids[i], { teleport: true });
  }
  card.onBack = () => { leaveFocus(); stage.focus?.(); };
  card.onStep = step;
  card.onEnter = (w) => viewer.open(w, index.get(w.id));

  let paused = false;
  viewer.onOpen = () => { paused = true; art.suspended = true; art.pauseAll(); };
  viewer.onClose = () => { paused = false; art.suspended = false; last = performance.now(); if (focused) $('card-enter').focus({ preventScroll: true }); };

  // ---------- modes ----------
  const modeBtn = $('btn-mode');
  const coarse = matchMedia('(pointer: coarse)').matches;
  let dismissHint = () => {};
  function setMode(m) {
    mode = m;
    modeBtn.setAttribute('aria-pressed', String(m === 'walk'));
    modeBtn.setAttribute('aria-label', m === 'walk' ? '移動方式：自由行走（切換為點擊移動）' : '移動方式：點擊移動（切換為自由行走）');
    $('joystick').hidden = !(m === 'walk' && coarse);
    document.body.classList.toggle('joy', m === 'walk' && coarse);
    if (m === 'click' && document.pointerLockElement) document.exitPointerLock();
    dismissHint();
    dismissHint = showHint(m === 'click' ? ex.ui.hintClick : coarse ? ex.ui.hintWalkTouch : ex.ui.hintWalk, `showroom.hint.${m}`);
  }
  modeBtn.addEventListener('click', () => setMode(mode === 'click' ? 'walk' : 'click'));
  const strip = new WorkStrip(ex, (id) => focusWork(id));
  const minimap = new MiniMap(() => openMap());
  $('btn-list').addEventListener('click', () => openList());
  function openMap() {
    map.setPose(nav.pos.x, nav.pos.z, nav.yaw);
    openLayer($('mapview'));
  }

  // ---------- pointer input ----------
  const drag = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false };
  let lastHover = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (!entered || topLayer()) return;
    if (e.target.closest('#joystick')) return;
    drag.id = e.pointerId; drag.x = drag.sx = e.clientX; drag.y = drag.sy = e.clientY; drag.t = performance.now(); drag.moved = false;
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!entered) return;
    if (document.pointerLockElement === stage) {
      nav.look(e.movementX * 0.0022, e.movementY * 0.0022);
      return;
    }
    if (drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; stage.classList.add('dragging'); }
      if (drag.moved) {
        const k = (e.pointerType === 'touch' ? 0.0042 : 0.0032) * (60 / camera.fov);
        nav.look(-dx * k, -dy * k);
        ringTarget = 0;
      }
      return;
    }
    if (e.pointerType === 'mouse' && performance.now() - lastHover > 45 && mode === 'click' && !nav.busy) {
      lastHover = performance.now();
      const h = pick(e.clientX, e.clientY);
      stage.classList.toggle('can-pick', !!h?.work);
      if (h?.floor && isWalkable(h.floor.x, h.floor.z)) { ring.position.x = h.floor.x; ring.position.z = h.floor.z; ringTarget = 0.55; }
      else ringTarget = 0;
    }
  });
  const endDrag = (e) => {
    if (drag.id !== e.pointerId) return;
    drag.id = null; stage.classList.remove('dragging');
    const quick = !drag.moved && performance.now() - drag.t < 600;
    if (quick && e.type === 'pointerup') tap(e.clientX, e.clientY, e.pointerType);
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', () => { if (drag.id === null) ringTarget = 0; });

  function requestLock() {
    // Some browsers refuse pointer lock (iframes, quick re-requests); walking still works by keys.
    try { const r = stage.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* ignore */ }
  }
  function tap(x, y, type) {
    dismissHint();
    if (mode === 'walk' && type === 'mouse' && !coarse) {
      if (document.pointerLockElement === stage) {
        const h = pick(innerWidth / 2, innerHeight / 2);
        if (h?.work) focusWork(h.work);
        return;
      }
      const h = pick(x, y);
      if (h?.work) { focusWork(h.work); return; }
      if (focused) dropFocus();
      requestLock();
      return;
    }
    const h = pick(x, y);
    if (!h) return;
    if (h.work) { if (h.work !== focused) focusWork(h.work); return; }
    if (h.floor) {
      if (focused) { dropFocus(); returnPose = null; }
      if (!isWalkable(h.floor.x, h.floor.z)) return;
      ring.position.x = h.floor.x; ring.position.z = h.floor.z; ringTarget = 0.7; ringHold = performance.now() + 900;
      nav.goTo(h.floor.x, h.floor.z, { fadeOver: 60 });
    }
  }
  document.addEventListener('pointerlockchange', () => {
    $('crosshair').hidden = document.pointerLockElement !== stage;
  });

  // ---------- joystick ----------
  const joy = $('joystick'); const knob = joy.querySelector('.knob');
  let joyId = null;
  const joyMove = (e) => {
    const r = joy.getBoundingClientRect(); const R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const l = Math.hypot(dx, dy); if (l > R * 0.62) { dx *= R * 0.62 / l; dy *= R * 0.62 / l; }
    nav.joy.set(dx / (R * 0.62), dy / (R * 0.62));
    joy.style.setProperty('--jx', `${dx}px`); joy.style.setProperty('--jy', `${dy}px`);
  };
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } if (focused) dropFocus(); joyMove(e); e.stopPropagation(); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; nav.joy.set(0, 0); joy.style.setProperty('--jx', '0px'); joy.style.setProperty('--jy', '0px'); };
  joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

  // ---------- keyboard ----------
  const MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (closeTop()) { e.preventDefault(); return; }
      if (focused) { e.preventDefault(); leaveFocus(); }
      return;
    }
    if (!entered || topLayer() || e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if (focused && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !onButton) { e.preventDefault(); step(e.code === 'ArrowLeft' ? -1 : 1); return; }
    if (e.code === 'KeyM') { openMap(); return; }
    if (e.code === 'KeyL') { openList(); return; }
    if (MOVE.has(e.code)) {
      if (onButton && (e.code.startsWith('Arrow'))) return; // let buttons keep arrow keys
      e.preventDefault();
      if (focused && !e.code.startsWith('Shift')) { dropFocus(); returnPose = null; }
      nav.keys.add(e.code); dismissHint();
    }
  });
  addEventListener('keyup', (e) => nav.keys.delete(e.code));
  addEventListener('blur', () => nav.keys.clear());

  // ---------- resize / visibility ----------
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight); fitFov();
    if (focused) { const id = focused; focused = null; const rp = returnPose; focusWork(id, { teleport: false }); returnPose = rp; }
  });
  let raf = 0, last = performance.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; art.pauseAll(); nav.keys.clear(); }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  });

  // ---------- loop ----------
  let currentRoom = null, stripTick = 0;
  const perf = { frames: 0, acc: 0, fps: 0, samples: [] };
  let pixelRatio = quality.pixelRatio;
  function renderOnce() {
    camera.updateMatrixWorld();
    post.render(world.day);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (paused) return;
    nav.update(dt, mode === 'walk');
    if (!nav.busy && focused && nav.keys.size === 0 && nav.joy.lengthSq() === 0) { /* steady on the work */ }

    // view offset so the work sits beside its label
    const k = 1 - Math.exp(-dt * 5);
    offset.x += (offset.tx - offset.x) * k; offset.y += (offset.ty - offset.y) * k;
    if (Math.abs(offset.x) > 0.5 || Math.abs(offset.y) > 0.5) camera.setViewOffset(innerWidth, innerHeight, offset.x, offset.y, innerWidth, innerHeight);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateMatrixWorld();

    const day = world.update(nav.pos, dt);
    document.body.classList.toggle('dark', day < 0.42);
    updateAtmosphere(world.atmosphere, now / 1000, day, reducedMotion);
    const ringCol = day > 0.5 ? 0x2c2b28 : 0xe8e4da;
    ringMat.color.setHex(ringCol); dotMat.color.setHex(ringCol);
    if (performance.now() > ringHold && ringHold && !nav.busy) { ringHold = 0; ringTarget = 0; }
    ringMat.opacity += (ringTarget - ringMat.opacity) * Math.min(1, dt * 8);
    dotMat.opacity = ringMat.opacity * 0.14;
    ring.visible = ringMat.opacity > 0.01;

    art.update(camera, dt, now);
    minimap.setPose(nav.pos.x, nav.pos.z, nav.yaw);
    if (now - stripTick > 250) {
      stripTick = now;
      let best = focused, bd = 7;
      if (!best) for (const it of art.items) if (it.place.room === nav.room && it.dist < bd && it.visible) { bd = it.dist; best = it.work.id; }
      strip.setActive(best);
    }
    const room = nav.room;
    if (room && room !== currentRoom) {
      strip.setHall(room);
      currentRoom = room;
    }
    post.render(day);

    // adaptive resolution: step down when sustained frame rate is below target
    perf.frames++; perf.acc += dt;
    if (perf.acc >= 2) {
      perf.fps = perf.frames / perf.acc; perf.samples.push({ t: now, fps: perf.fps, room: currentRoom, pr: pixelRatio });
      if (perf.samples.length > 120) perf.samples.shift();
      if (entered && perf.fps < quality.targetFps * 0.9 && pixelRatio > quality.minPixelRatio + 0.01) {
        pixelRatio = Math.max(quality.minPixelRatio, pixelRatio - 0.15); renderer.setPixelRatio(pixelRatio);
      }
      perf.frames = 0; perf.acc = 0;
    }
  }

  // ---------- loading ----------
  const early = ex.works.filter((w) => w.hall === 'garden').map((w) => w.id);
  await art.loadPosters(early, (d, n) => onProgress(0.55 + 0.45 * d / n));
  renderOnce();
  raf = requestAnimationFrame(loop);

  function enter() {
    if (entered) return;
    entered = true;
    $('lobby').classList.add('leaving');
    setTimeout(() => { $('lobby').hidden = true; }, 1400);
    $('corner').hidden = false; $('strip').hidden = false; $('minimap').hidden = false;
    idleFade();
    setMode('click');
    nav.goTo(ENTER_TARGET.x, ENTER_TARGET.z, { yaw: ENTER_TARGET.yaw, pitch: STYLE.camera.restPitch, speed: 0.75 });
    // later halls stream in once the visitor is inside
    const rest = ex.works.filter((w) => w.hall !== 'garden').map((w) => w.id);
    (window.requestIdleCallback || ((f) => setTimeout(f, 600)))(() => art.loadPosters(rest));
  }

  // test & debugging hooks (read-only use by the verification scripts)
  window.__showroom = {
    nav, art, world, camera, renderer, placements, perf, quality, post, scene,
    focusWork, leaveFocus, setMode, enter,
    get focused() { return focused; }, get mode() { return mode; }, get pixelRatio() { return pixelRatio; },
    tapScreen: (x, y) => tap(x, y, 'mouse'),
  };
  return { enter, focusWork: (id) => focusWork(id, { teleport: true }), get entered() { return entered; } };
}
