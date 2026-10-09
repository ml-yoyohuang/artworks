// Camera movement: click-to-glide and free walking share one body with
// wall collision. All automatic moves are eased; under reduced motion they
// become a short fade-through instead of a glide.
import * as THREE from 'three';
import { EYE, isWalkable, clampWalkable, route, roomAt, ROOMS } from './plan.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const PITCH_MIN = -0.62, PITCH_MAX = 0.5;

export class Navigator {
  constructor(camera, { reducedMotion, fade }) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, EYE, 0);
    this.yaw = 0; this.pitch = 0;          // rendered orientation
    this.tYaw = 0; this.tPitch = 0;        // look targets (drag / mouse), smoothed toward
    this.vel = new THREE.Vector2();
    this.keys = new Set();
    this.joy = new THREE.Vector2();        // virtual joystick (-1..1)
    this.anim = null;
    this.reducedMotion = reducedMotion;
    this.fade = fade;                      // async (fn) => fades out, runs fn, fades in
    this.onArrive = null;
    camera.rotation.order = 'YXZ';
  }

  set(x, z, yaw, pitch = 0) {
    this.pos.set(x, EYE, z); this.yaw = this.tYaw = yaw; this.pitch = this.tPitch = pitch; this.anim = null; this.apply();
  }

  get busy() { return !!this.anim; }
  get room() { return roomAt(this.pos.x, this.pos.z); }

  look(dx, dy) {
    if (this.anim && this.anim.lockLook) return;
    this.tYaw -= dx; this.tPitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.tPitch - dy));
  }

  cancel() { if (this.anim) { this.anim = null; this.tYaw = this.yaw; this.tPitch = this.pitch; } }

  /**
   * Glide to (x,z), optionally ending at a given yaw/pitch.
   * Routes through doors; long trips and reduced motion use a fade instead.
   */
  async goTo(x, z, { yaw = null, pitch = null, speed = 1, fadeOver = 34, onDone } = {}) {
    const dest = clampWalkable(x, z);
    const pts = route({ x: this.pos.x, z: this.pos.z }, dest);
    let length = 0; for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const endYaw = yaw ?? (pts.length > 2 ? Math.atan2(-(dest.x - pts[pts.length - 2].x), -(dest.z - pts[pts.length - 2].z)) : this.tYaw);
    const endPitch = pitch ?? 0;
    if (this.reducedMotion || length > fadeOver) {
      this.anim = { lockLook: true, fading: true };
      await this.fade(() => { this.set(dest.x, dest.z, endYaw, endPitch); });
      this.anim = null; onDone?.(); this.onArrive?.();
      return;
    }
    // sample the polyline into an arc-length table; corners are rounded with a short Catmull-Rom.
    let path;
    if (pts.length > 2) {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal', 0.3);
      const ok = curve.getSpacedPoints(Math.ceil(length * 6)).every((p) => isWalkable(p.x, p.z));
      path = ok ? curve : null;
    }
    if (!path) {
      const cp = new THREE.CurvePath();
      for (let i = 1; i < pts.length; i++) cp.add(new THREE.LineCurve3(new THREE.Vector3(pts[i - 1].x, 0, pts[i - 1].z), new THREE.Vector3(pts[i].x, 0, pts[i].z)));
      path = cp;
    }
    const duration = Math.min(7.5, Math.max(1.1, 0.9 + length * 0.34)) / speed;
    const multi = pts.length > 2;
    this.anim = {
      path, duration, t: 0, lockLook: yaw !== null || multi,
      yaw0: this.yaw, pitch0: this.pitch,
      yaw1: this.yaw + wrapAngle(endYaw - this.yaw), pitch1: endPitch,
      turn: yaw !== null || multi, multi, onDone,
    };
  }

  /** Step the body: automatic glide, or keys / joystick with collision. */
  update(dt, walkMode) {
    const a = this.anim;
    if (a && !a.fading) {
      a.t = Math.min(1, a.t + dt / a.duration);
      const e = easeInOut(a.t);
      const p = a.path.getPointAt(Math.min(1, e));
      this.pos.x = p.x; this.pos.z = p.z;
      if (a.turn) {
        if (a.multi) {
          // look along the path, then settle on the final heading
          const ahead = a.path.getPointAt(Math.min(1, e + 0.04));
          const dir = Math.hypot(ahead.x - p.x, ahead.z - p.z) > 1e-4 ? Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z)) : a.yaw1;
          const settle = Math.max(0, (a.t - 0.75) / 0.25);
          const along = this.yaw + wrapAngle(dir - this.yaw) * Math.min(1, dt * 3);
          this.yaw = along + wrapAngle(a.yaw1 - along) * easeOutSine(settle);
          this.pitch += (a.pitch1 * settle - this.pitch) * Math.min(1, dt * 4);
        } else {
          const k = easeInOut(Math.min(1, a.t * 1.15));
          this.yaw = a.yaw0 + (a.yaw1 - a.yaw0) * k;
          this.pitch = a.pitch0 + (a.pitch1 - a.pitch0) * k;
        }
        this.tYaw = this.yaw; this.tPitch = this.pitch;
      }
      if (a.t >= 1) { this.anim = null; this.tYaw = this.yaw; this.tPitch = this.pitch; a.onDone?.(); this.onArrive?.(); }
    }

    // smoothed look (drag / pointer lock / keyboard turning)
    if (!a || !a.turn) {
      const k = 1 - Math.exp(-dt * 14);
      this.yaw += wrapAngle(this.tYaw - this.yaw) * k;
      this.pitch += (this.tPitch - this.pitch) * k;
    }

    // keyboard / joystick locomotion (works in both modes)
    let fwd = 0, side = 0, turn = 0;
    const K = this.keys;
    if (K.has('KeyW') || K.has('ArrowUp')) fwd += 1;
    if (K.has('KeyS') || K.has('ArrowDown')) fwd -= 1;
    if (K.has('KeyA')) side -= 1;
    if (K.has('KeyD')) side += 1;
    if (K.has('ArrowLeft') || K.has('KeyQ')) turn += 1;
    if (K.has('ArrowRight') || K.has('KeyE')) turn -= 1;
    fwd += -this.joy.y; side += this.joy.x;
    if (turn && !a) this.tYaw += turn * dt * 1.5;
    const input = Math.hypot(fwd, side);
    if (input > 0.01 && a && !a.fading) this.cancel();
    const run = K.has('ShiftLeft') || K.has('ShiftRight') ? 1.7 : 1;
    const speed = (walkMode ? 1.55 : 1.4) * run;
    const tx = input > 1 ? fwd / input : fwd, ts = input > 1 ? side / input : side;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wantX = (-sin * tx + cos * ts) * speed, wantZ = (-cos * tx - sin * ts) * speed;
    const acc = 1 - Math.exp(-dt * (input > 0.01 ? 7 : 9));
    this.vel.x += (wantX - this.vel.x) * acc; this.vel.y += (wantZ - this.vel.y) * acc;
    if (!this.anim && this.vel.lengthSq() > 1e-6) this.moveBy(this.vel.x * dt, this.vel.y * dt);
    this.apply();
  }

  /** Move with wall sliding. Returns true if any movement happened. */
  moveBy(dx, dz) {
    const x = this.pos.x, z = this.pos.z;
    if (isWalkable(x + dx, z + dz)) { this.pos.x += dx; this.pos.z += dz; return true; }
    if (isWalkable(x + dx, z)) { this.pos.x += dx; this.vel.y *= 0.3; return true; }
    if (isWalkable(x, z + dz)) { this.pos.z += dz; this.vel.x *= 0.3; return true; }
    this.vel.set(0, 0); return false;
  }

  apply() {
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  /** Where to stand to frame a work, given the visible viewport fraction. */
  framing(place, viewW, viewH) {
    const cam = this.camera;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const aspect = viewW / viewH;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const margin = place.style === 'print' ? 1.55 : 1.32;
    const needW = (place.w + (place.style === 'print' ? 0.27 : 0.1)) * margin;
    const needH = (place.h + (place.style === 'print' ? 0.27 : 0.1)) * margin;
    let d = Math.max(needW / 2 / Math.tan(hfov / 2), needH / 2 / Math.tan(vfov / 2), 1.25);
    const room = ROOMS[place.room];
    const span = place.nx !== 0 ? room.x1 - room.x0 : room.z1 - room.z0;
    d = Math.min(d, span - 0.8);
    const x = place.x + place.nx * d, z = place.z + place.nz * d;
    const yaw = Math.atan2(place.nx, place.nz);
    const pitch = Math.atan2(place.y - EYE, d);
    return { x, z, yaw, pitch, d };
  }
}
