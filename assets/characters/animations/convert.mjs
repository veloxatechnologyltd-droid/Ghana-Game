globalThis.self = globalThis;
import fs from 'fs';
import * as THREE from '../../../node_modules/three/build/three.module.js';
import {FBXLoader} from '../../../node_modules/three/examples/jsm/loaders/FBXLoader.js';
const [src, out] = process.argv.slice(2);
const BONES = ['Bip01','Pelvis','Spine','Spine1','Spine2','Neck','Head','L_Clavicle','L_UpperArm','L_Forearm','L_Hand','R_Clavicle','R_UpperArm','R_Forearm','R_Hand','L_Thigh','L_Calf','L_Foot','R_Thigh','R_Calf','R_Foot'].map(b => b === 'Bip01' ? b : 'Bip01_' + b);
const CLIPS = {walkM:['m_walk_neutral',30], runM:['m_run_neutral',30], walkF:['f_walk_neutral',30], runF:['f_run_neutral',30],
  idleM:['m_idle_breathe_01',15], idleF:['f_idle_breathe_01',15], talkM:['m_gestic_talk_neutral_01',15], talkF:['f_gestic_talk_neutral_01',15]};
const r3 = v => Math.round(v * 1000) / 1000, r1 = v => Math.round(v * 10) / 10;
const res = {};
for (const [key, [file, fps]] of Object.entries(CLIPS)) {
  const b = fs.readFileSync(src + '/' + file + '.fbx');
  const clip = new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '').animations[0];
  const tr = {}; for (const t of clip.tracks) tr[t.name] = t;
  const sample = (name, time) => {const t = tr[name], i = t.createInterpolant(); return Array.from(i.evaluate(time));};
  const qAt = time => BONES.map(n => new THREE.Quaternion().fromArray(sample(n + '.quaternion', time)));
  // Long gesture clips: cut where the pose best matches the first frame so the loop is seamless.
  let dur = clip.duration, t0 = 0;
  if (dur > 8) {const P = []; for (let t = 0; t < dur; t += 0.1) P.push(qAt(t)); let best = 1e9;
    for (let a = 0; a < P.length; a++) for (let b = a + 60; b < Math.min(P.length, a + 140); b++) {let e = 0; P[a].forEach((x, i) => {e += 1 - Math.abs(x.dot(P[b][i]));}); if (e < best) {best = e; t0 = a * 0.1; dur = (b - a) * 0.1;}}
    console.log(key, 'loop err', best.toFixed(4), 'from', t0.toFixed(1));}
  const n = Math.round(dur * fps) + 1, times = []; for (let i = 0; i < n; i++) times.push(Math.min(dur, i / fps));
  const at = t => t0 + t;
  const p0 = sample('Bip01.position', t0), p1 = sample('Bip01.position', t0 + dur);
  const stride = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
  const q = {}; for (const name of BONES) {const prev = new THREE.Quaternion(), arr = [];
    times.forEach((t, i) => {const x = new THREE.Quaternion().fromArray(sample(name + '.quaternion', at(t))); if (i && x.dot(prev) < 0) x.set(-x.x, -x.y, -x.z, -x.w); prev.copy(x); arr.push(...x.toArray().map(r3));});
    q[name] = arr;}
  // Root keeps its bob and sway; forward travel is removed so the clip plays in place.
  const root = []; times.forEach(t => {const p = sample('Bip01.position', at(t)), k = t / dur;
    root.push(r1(p[0] - p0[0] - (p1[0] - p0[0]) * k), r1(p[1]), r1(p[2] - p0[2] - (p1[2] - p0[2]) * k));});
  res[key] = {d: r3(dur), stride: stride > 20 ? r1(stride) : 0, t: times.map(r3), root, q};
  console.log(key, file, 'dur', dur.toFixed(2), 'of', clip.duration.toFixed(2), 'keys', n, 'stride', stride.toFixed(1));
}
// Run starts at the walk's footfall so the two blend without crossing legs.
for (const g of ['M', 'F']) {const w = res['walk' + g], r = res['run' + g], legs = ['Bip01_L_Thigh', 'Bip01_R_Thigh', 'Bip01_L_Calf', 'Bip01_R_Calf'], n = r.t.length - 1;
  let best = 1e9; for (let i = 0; i < n; i++) {let e = 0; for (const b of legs) for (let j = 0; j < 4; j++) e += Math.abs(Math.abs(w.q[b][j]) - Math.abs(r.q[b][i * 4 + j])); if (e < best) {best = e; r.off = r3(i / n);}}
  console.log('run' + g, 'off', r.off);}
fs.writeFileSync(out, JSON.stringify(res));
console.log(out, fs.statSync(out).size);
