// 녹로(轆轤) 3D — 거중기 앱과 같은 골격(시공 순서·과학 원리·직접 조작·화성 현장·문제 풀기)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { featureEdges } from '../edges.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import { buildModel } from './nk_model.js';
import * as sim from './nk_sim.js';

const $ = id => document.getElementById(id);
const { G, steps } = buildModel();
const N = steps.length;

// ---------- 형상 (CSG) ----------
const ev = new Evaluator(); ev.attributes = ['position', 'normal']; ev.useGroups = false;
const m4 = M => new THREE.Matrix4().set(...M);
function clean(g) { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g }
function primGeo(n) {
  let g;
  switch (n.p) {
    case 'B': g = new THREE.BoxGeometry(...n.s); break;
    case 'C': g = new THREE.CylinderGeometry(n.d2 / 2, n.d1 / 2, n.h, n.n); g.rotateX(Math.PI / 2); break;
    case 'S': g = new THREE.SphereGeometry(n.r, 28, 18); break;
    case 'E': { const sh = new THREE.Shape(n.pts.map(p => new THREE.Vector2(p[0], p[1]))); g = new THREE.ExtrudeGeometry(sh, { depth: n.h, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -n.h / 2); break }
    case 'P': { const pos = []; for (const F of n.F) for (let i = 1; i < F.length - 1; i++) for (const v of [F[0], F[i], F[i + 1]]) pos.push(...n.V[v]);
      g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); break }
  }
  g = clean(g); g.applyMatrix4(m4(n.M)); g.computeBoundingBox(); return g
}
const solidC = new WeakMap();
function brushOf(g) { const b = new Brush(g); b.updateMatrixWorld(); return b }
function solid(n) {
  if (solidC.has(n)) return solidC.get(n); let r;
  if (!n.op) r = brushOf(primGeo(n));
  else if (n.op === 'uni') { r = solid(n.c[0]); for (let i = 1; i < n.c.length; i++) { try { r = ev.evaluate(r, solid(n.c[i]), ADDITION) } catch (e) { } } }
  else { r = solid(n.a); const flat = []; const fl = c => c.op === 'uni' ? c.c.forEach(fl) : flat.push(c); n.b.forEach(fl);
    for (const c of flat) { const cb = solid(c); r.geometry.computeBoundingBox(); cb.geometry.computeBoundingBox();
      if (!r.geometry.boundingBox.intersectsBox(cb.geometry.boundingBox)) continue; try { r = ev.evaluate(r, cb, SUBTRACTION) } catch (e) { } } }
  r.geometry = clean(r.geometry); r.geometry.computeBoundingBox(); solidC.set(n, r); return r
}
function display(n) { if (!n.op) return [primGeo(n)]; if (n.op === 'uni') return n.c.flatMap(display); return [solid(n).geometry.clone()] }
const memberGeo = node => mergeGeometries(display(node).map(x => clean(x)), false);

// ---------- 장면 ----------
const cv = $('cv'), ren = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio)); cv.prepend(ren.domElement);
ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05; ren.outputColorSpace = THREE.SRGBColorSpace;
ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 10, 120000);
const pm = new THREE.PMREMGenerator(ren); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
sc.add(new THREE.HemisphereLight(0xfff6e8, 0x5d5040, 0.55));
const dl = new THREE.DirectionalLight(0xfff0dc, 2.2); dl.position.set(5000, 14000, 8000); dl.castShadow = true;
dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -12000, right: 12000, top: 12000, bottom: -12000, near: 1000, far: 36000 }); dl.shadow.bias = -0.0004; dl.shadow.normalBias = 2;
dl.target.position.set(-2000, 3000, 0); sc.add(dl, dl.target);
{ const d2 = new THREE.DirectionalLight(0xdde8ff, .5); d2.position.set(-6000, 3000, -7000); sc.add(d2) }
const tc = document.createElement('canvas'); tc.width = tc.height = 256; { const x = tc.getContext('2d'); x.fillStyle = '#96876f'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) { const v = 118 + Math.random() * 24 - 12; x.fillStyle = `rgb(${v + 8},${v},${v - 16})`; x.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 3 + Math.random() * 10) } }
const tt = new THREE.CanvasTexture(tc); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(30, 30); tt.colorSpace = THREE.SRGBColorSpace;
const gr = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tt, roughness: .95 })); gr.receiveShadow = true; gr.position.y = -1; sc.add(gr);
const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; sc.add(root);
const MATP = { wood: { m: 0, r: .72 }, woodL: { m: 0, r: .6 }, iron: { m: .7, r: .45 }, stone: { m: 0, r: .95 }, hemp: { m: 0, r: .9 } };

// ---------- 부재 ----------
const S = steps.map(s => ({ ...s, g: new THREE.Group(), objs: [], v: 0, ready: false }));
S.forEach(s => { s.g.visible = false; root.add(s.g) });
const ALL = []; let ROPE = null;
function ropeGeo(pts) { const path = new THREE.CurvePath(); const v = pts.map(p => new THREE.Vector3(...p));
  for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1])); return new THREE.TubeGeometry(path, 200, 15, 8, false) }
function makeObj(m, i) {
  if (m.dyn) { const mat = new THREE.MeshStandardMaterial({ color: m.col, roughness: .9, transparent: true });
    const mesh = new THREE.Mesh(ropeGeo(sim.ropePath(sim.HOOK_MIN)), mat); mesh.castShadow = true; const og = new THREE.Group(); og.add(mesh);
    const o = { dyn: m.dyn, g: og, mesh, mat, emat: null, label: m.label, step: i, m, off: [0, 0, 0] }; mesh.userData.o = o; ROPE = o; return o }
  const g = memberGeo(m.node), mp = MATP[m.mat] || MATP.wood;
  const mat = new THREE.MeshStandardMaterial({ color: m.col, metalness: mp.m, roughness: mp.r, transparent: true, side: THREE.DoubleSide });
  const og = new THREE.Group(); og.matrixAutoUpdate = false; const me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; og.add(me);
  const emat = new THREE.LineBasicMaterial({ color: 0x1c140c, transparent: true, opacity: .32 }); const eg = new THREE.LineSegments(featureEdges(g, 28), emat); og.add(eg);
  const o = { g: og, mesh: me, mat, emat, eg, label: m.label, step: i, mv: m.mv, spin: m.spin, spiv: m.spiv, sax: m.sax, m, off: [0, 0, 0] };
  me.userData.o = o; return o;
}
let dirty = true, ready = false;
async function buildAll() {
  for (let i = 0; i < N; i++) { const s = S[i]; $('ld').textContent = '부재를 만드는 중… ' + (i + 1) + ' / ' + N + '  (' + s.label + ')';
    await new Promise(r => setTimeout(r, 0));
    for (const m of s.members) { const o = makeObj(m, i); s.objs.push(o); ALL.push(o); s.g.add(o.g) }
    s.ready = true; dirty = true; }
  $('ld').style.display = 'none'; ready = true; dirty = true;
}

// ---------- 일꾼 8명 (좌우 4명씩 손바퀴를 돌림) ----------
const WORKERG = new THREE.Group(); root.add(WORKERG); WORKERG.visible = false; const WORKERS = [];
const wMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
const wMatP = wMat(0xece6d6), wMatJ = wMat(0xd8c8a4), wMatBelt = wMat(0x6b4a2e), wMatS = wMat(0xc89a72), wMatHair = wMat(0x2a2522);
const zc = g => g.rotateX(Math.PI / 2);
const WG = { leg: zc(new THREE.CylinderGeometry(62, 70, 820, 10)), coat: zc(new THREE.CylinderGeometry(150, 185, 560, 14)), belt: zc(new THREE.CylinderGeometry(160, 160, 50, 14)),
  head: new THREE.SphereGeometry(105, 16, 12), band: zc(new THREE.CylinderGeometry(104, 104, 34, 16)), knot: new THREE.SphereGeometry(42, 10, 8),
  arm: new THREE.CylinderGeometry(48, 42, 520, 8).rotateZ(-Math.PI / 2), hand: new THREE.SphereGeometry(46, 10, 8) };
const part = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m };
for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
  const wx = sim.AXLE.x - 900 + 600 * i, wy = s * (sim.WHEEL_Y + 650);   // 손바퀴 바깥에 서서 테를 잡음
  const grp = new THREE.Group(); grp.position.set(wx, wy, 0); grp.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
  [-90, 90].forEach(y => part(WG.leg, wMatP, 0, y, 410, grp));
  const torso = new THREE.Group(); torso.position.z = 820; grp.add(torso);
  part(WG.coat, wMatJ, 0, 0, 280, torso); part(WG.belt, wMatBelt, 0, 0, 40, torso);
  part(WG.head, wMatS, 0, 0, 700, torso); part(WG.band, wMatP, 0, 0, 735, torso); part(WG.knot, wMatHair, -10, 0, 812, torso);
  const arms = [-165, 165].map(ay => { const arm = new THREE.Group(); arm.position.set(0, ay, 520); arm.rotation.y = -.35;
    part(WG.arm, wMatJ, 260, 0, 0, arm); part(WG.hand, wMatS, 540, 0, 0, arm); torso.add(arm); return arm });
  WORKERG.add(grp); WORKERS.push({ grp, torso, arms, i: WORKERS.length });
}

// ---------- 카메라·조작 ----------
let az = .9, el = .2, dist = 24000; const TGT = new THREE.Vector3(-1500, 4500, 0); let camAnim = null;
const toW = (x, y, z) => new THREE.Vector3(x, z, -y);
function setCam() { cam.position.set(TGT.x + dist * Math.cos(el) * Math.sin(az), TGT.y + dist * Math.sin(el), TGT.z + dist * Math.cos(el) * Math.cos(az)); cam.lookAt(TGT); cam.updateProjectionMatrix(); dirty = true }
function size() { const w = cv.clientWidth, h = cv.clientHeight; ren.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true }
addEventListener('resize', size);
const PRESET = {
  all: [[-1500, 0, 4800], .9, .2, 24000],
  top: [[-3650, 0, 10000], .55, .1, 4200],
  axle: [[800, 0, 1500], .95, .15, 7000],
  side: [[-1200, 0, 4500], 0, .05, 21000],
  tip: [[-1800, 0, 3000], 0, .04, 15000],
  mars: [[-3800, 0, 4200], .45, .22, 27000],
};
function goCam(k) { const [t, a, e, d] = PRESET[k]; camAnim = { t0: performance.now(), from: [TGT.clone(), az, el, dist], to: [toW(...t), a, e, d] } }
window.__cam = (a, e, d, x, y, z) => { az = a; el = e; dist = d; if (x != null) TGT.copy(toW(x, y, z)); camAnim = null; setCam() };
let dr = null; const el2 = ren.domElement; let moveMode = false, drag = null, hoverO = null; const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayAt(e) { const r = el2.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(ndc, cam); return rc }
function pickObj(e) { const ms = []; S.forEach(s => { if (s.g.visible) s.objs.forEach(o => { if (o.mat.opacity > .05 && o.g.visible) ms.push(o.mesh) }) }); const h = rayAt(e).intersectObjects(ms, false)[0]; return h ? { o: h.object.userData.o, pt: h.point } : null }
const capEl = $('cap'); function cap(t) { capEl.textContent = t || ''; capEl.hidden = !t }
const nameOf = o => { const g = G[S[o.step].key]; return o.label + (g && !o.label.includes(g.n) ? ' · ' + g.n : '') };
const ret = []; function moveBack(o) { o.ret = { from: o.off.slice(), t0: performance.now(), dur: 500 }; if (!ret.includes(o)) ret.push(o) }
const wantMove = e => e.ctrlKey || e.metaKey || moveMode;
el2.addEventListener('contextmenu', e => e.preventDefault());
el2.addEventListener('pointerdown', e => {
  if (wantMove(e) && e.button === 0) { const h = pickObj(e); if (h) { el2.setPointerCapture(e.pointerId); const n = cam.getWorldDirection(new THREE.Vector3());
    h.o.ret = null; drag = { id: e.pointerId, o: h.o, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, h.pt), start: root.worldToLocal(h.pt.clone()), base: h.o.off.slice() };
    hoverO = h.o; cap('✋ ' + nameOf(h.o)); dirty = true; return } }
  dr = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; el2.setPointerCapture(e.pointerId)
});
el2.addEventListener('pointermove', e => {
  if (drag && e.pointerId === drag.id) { const w = new THREE.Vector3(); if (rayAt(e).ray.intersectPlane(drag.plane, w)) { const l = root.worldToLocal(w); drag.o.off = drag.base.map((v, i) => v + [l.x - drag.start.x, l.y - drag.start.y, l.z - drag.start.z][i]); dirty = true } return }
  if (!dr) { if (wantMove(e)) { const h = pickObj(e), o = h ? h.o : null; if (o !== hoverO) { hoverO = o; cap(o ? nameOf(o) : ''); dirty = true } } else if (hoverO) { hoverO = null; cap(''); dirty = true } return }
  const dx = e.clientX - dr.x, dy = e.clientY - dr.y; dr.x = e.clientX; dr.y = e.clientY;
  if (dr.pan) { const k = dist * .0011; const rgt = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1); TGT.addScaledVector(rgt, -dx * k).addScaledVector(up, dy * k) }
  else { az -= dx * .008; el = Math.max(-.05, Math.min(1.45, el + dy * .008)) } camAnim = null; setCam()
});
const pup = e => { if (drag && e.pointerId === drag.id) { const o = drag.o; drag = null; moveBack(o); setTimeout(() => { if (!drag) { hoverO = null; cap(''); dirty = true } }, 700); return } dr = null };
el2.addEventListener('pointerup', pup); el2.addEventListener('pointercancel', pup);
let ghostAll = false;
$('ghostb').onclick = () => { ghostAll = !ghostAll; $('ghostb').classList.toggle('on', ghostAll); dirty = true };
$('moveb').onclick = () => { moveMode = !moveMode; $('moveb').classList.toggle('on', moveMode); if (!moveMode) { hoverO = null; cap('') } };
const zm = f => { dist = Math.max(500, Math.min(45000, dist * f)); camAnim = null; setCam() };
el2.addEventListener('wheel', e => { e.preventDefault(); zm(e.deltaY > 0 ? 1.08 : .93) }, { passive: false });
$('zi').onclick = () => zm(.85); $('zo').onclick = () => zm(1.18);

// ---------- 시공 순서 ----------
let mode = 'build', cur = N, timer = null, viewMode = 'all', intro = true; const sl = $('sl'); sl.max = N;
let html = ''; Object.keys(G).forEach((k, gi) => { const g = G[k]; html += '<div class="gh"><i class="sw" style="background:' + g.col + '"></i>' + (gi + 1) + '. ' + g.n + (g.hj ? ' <small>' + g.hj + '</small>' : '') + '</div><div class="gs">';
  S.forEach((s, i) => { if (s.key === k) html += '<button data-i="' + (i + 1) + '">' + (i + 1) + '. ' + s.label + '</button>' }); html += '</div>' });
$('list').innerHTML = html;
const nowBox = $('now');
function show(n) {
  cur = Math.max(0, Math.min(N, n)); sl.value = cur; $('cn').textContent = cur + ' / ' + N;
  document.querySelectorAll('#list button').forEach(b => { const on = +b.dataset.i === cur; b.classList.toggle('on', on && !intro) });
  const s = S[cur - 1];
  if (!s || intro) { $('info').innerHTML = '<h2>녹로 시공 순서</h2><div class="d">밑틀 → 틀 기둥·윗틀 → 축(녹로)·손바퀴 → 간목 2개 → 버팀목 → 활차 → 동아줄·갈고리 → 짐 순서로 ' + N + '단계에 걸쳐 세웁니다. 『화성성역의궤』는 녹로를 "간주와 도르래를 묶은 부품 말고는 모듈이 없을 만큼 간단한 구조"로 그렸습니다(김평원 2017). Ctrl(⌘)+끌기로 부재를 떼어 볼 수 있습니다.</div>';
    nowBox.querySelector('.t').innerHTML = '녹로 조립 · <b>' + N + '단계</b>'; nowBox.querySelector('.d').textContent = '재생 버튼을 누르면 부재가 위에서 내려오며 차례로 세워집니다.'; return }
  const g = G[s.key];
  $('info').innerHTML = '<div class="gn">' + g.n + ' ' + g.hj + '</div><h2>' + cur + '. ' + s.label + '</h2><div class="d">' + g.desc + '</div><div class="m">치수: ' + g.dim + '</div>';
  nowBox.querySelector('.t').innerHTML = '<span class="st">' + cur + ' / ' + N + '</span><b>' + s.label + '</b>'; nowBox.querySelector('.d').textContent = g.desc;
}
const go = n => { intro = false; show(n) };
$('list').onclick = e => { const b = e.target.closest('button'); if (b) go(+b.dataset.i) };
$('bn').onclick = () => go(cur + 1); $('bp').onclick = () => go(cur - 1); sl.oninput = () => go(+sl.value);
const spd = () => +$('spd').value;
function stop() { clearTimeout(timer); timer = null; $('pl').textContent = '▶ 재생' }
function tick() { if (cur >= N) { stop(); return } go(cur + 1); timer = setTimeout(tick, spd()) }
$('pl').onclick = () => { if (timer) { stop(); return } if (cur >= N || intro) go(0); $('pl').textContent = '⏸ 정지'; timer = setTimeout(tick, 200) };
$('all').onclick = () => { stop(); intro = true; show(N) };
document.querySelectorAll('#vm button').forEach(b => b.onclick = () => { viewMode = b.dataset.m; document.querySelectorAll('#vm button').forEach(x => x.classList.toggle('on', x === b)); dirty = true });
let edgeOn = true; $('edg').onchange = () => { edgeOn = $('edg').checked; dirty = true };

// ---------- 소리 ----------
let AC = null, master = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination) } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC }
function creak() { if (!$('snd').checked || !audio()) return; const t0 = AC.currentTime; const b = AC.createBuffer(1, AC.sampleRate * .07, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'bandpass'; f.frequency.value = 300 + Math.random() * 300; f.Q.value = 6; g.gain.value = .16;
  s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t0) }
function thud() { if (!$('snd').checked || !audio()) return; const t0 = AC.currentTime; const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + .3); g.gain.setValueAtTime(.6, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .38);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + .42) }

// ---------- 직접 조작 ----------
const ctrl = { th: 0, pull: 0, massKg: 300, eff: 1 };
const WIND_RATE = 1.6, TH_MAX = (sim.HOOK_MAX - sim.HOOK_MIN) / sim.R_AXLE;
let wind = 0;
const holdBtn = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); audio(); on() }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, off)) };
holdBtn('wUp', () => wind = 1, () => wind = 0); holdBtn('wDn', () => wind = -1, () => wind = 0);
addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.repeat) return; const k = e.key.toLowerCase(); if (k === 'w') wind = 1; else if (k === 's') wind = -1; else return; audio(); e.preventDefault() });
addEventListener('keyup', e => { if ('ws'.includes(e.key.toLowerCase())) wind = 0 });
$('pullS').oninput = () => { ctrl.pull = +$('pullS').value; $('pullV').textContent = (ctrl.pull / 1000).toFixed(1) + 'm'; dirty = true };
$('wsl').oninput = () => { ctrl.massKg = +$('wsl').value; $('wsv').textContent = ctrl.massKg + 'kg'; dirty = true };
$('efs').oninput = () => { ctrl.eff = +$('efs').value / 100; $('efv').textContent = $('efs').value + '%'; dirty = true };
const fmtN = v => v >= 1000 ? (v / 1000).toFixed(2) + 'kN' : Math.round(v) + 'N';
function updReads(st) {
  $('rh').textContent = (st.lift / 1000).toFixed(2) + 'm'; $('rf').textContent = fmtN(st.ropeTension);
  $('rwf').textContent = fmtN(st.wheelForce); $('rp').textContent = fmtN(st.perWorker) + ' · ' + (st.perWorker / sim.G).toFixed(1) + 'kg중';
  $('rr').textContent = (st.wound / 1000).toFixed(2) + 'm'; $('rt').textContent = Math.round(st.tipRatio * 100) + '%';
  let w = '';
  if (st.tipping) w = '넘어져요! 짐이 너무 무겁거나 너무 앞으로 끌었어요. 녹로는 무게중심이 앞(간목 쪽)으로 쏠려 있어 작은 짐만 올렸습니다.';
  else if (st.warnTip) w = '위험해요 — 앞으로 넘어지려는 힘이 버티는 힘의 ' + Math.round(st.tipRatio * 100) + '%예요.';
  if (st.tooHeavy) w += (w ? ' · ' : '') + '1인 힘이 300N을 넘어 손바퀴가 돌지 않아요.';
  $('warn').textContent = w; $('warn').hidden = !w;
}

// ---------- 과학 원리 (왼쪽 3D에 화살표·글자판) ----------
const sciG = new THREE.Group(); root.add(sciG);
const sciMats = {}; const sciMat = c => sciMats[c] || (sciMats[c] = new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true }));
function clearSciG() { sciG.children.slice().forEach(o => { sciG.remove(o); o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material && c.material.map) { c.material.map.dispose(); c.material.dispose() } }) }) }
function arrow3(a, b, col, r = 30) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(); if (L < 1) return;
  const head = Math.min(L * .45, r * 6), g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L - head, 10), sciMat(col)); sh.position.y = (L - head) / 2;
  const cn = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, head, 14), sciMat(col)); cn.position.y = L - head / 2;
  g.add(sh, cn); g.position.copy(A); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); sh.renderOrder = cn.renderOrder = 10; sciG.add(g) }
function label3(text, p, col = '#1c140c', size = 1) { const lines = text.split('\n'), fs = 44, c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = `700 ${fs}px sans-serif`; const w = Math.max(...lines.map(l => x.measureText(l).width)) + 36, h = lines.length * fs * 1.25 + 24;
  c.width = w; c.height = h; x.font = `700 ${fs}px sans-serif`; x.fillStyle = 'rgba(255,253,246,.92)'; x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); x.roundRect(3, 3, w - 6, h - 6, 16); x.fill(); x.stroke();
  x.fillStyle = col; x.textBaseline = 'top'; lines.forEach((l, i) => x.fillText(l, 18, 14 + i * fs * 1.25));
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true }));
  const k = 3.2 * size; sp.scale.set(w * k, h * k, 1); sp.position.set(...p); sp.renderOrder = 11; sciG.add(sp) }
const COL = { load: 0xc0392b, rope: 0x1f6fd1, hand: 0x1e8e3e, dist: 0x8e44ad, tip: 0xd35400 };
const NN = n => Math.round(n) + 'N';
const SCI_CARDS = [
  { k: 'fixed', t: '1. 고정 도르래(활차) 하나', fx: '줄 힘 = 짐 무게 — 방향만 바뀜', cam: 'top', tx: '간목 꼭대기의 활차는 고정 도르래 하나입니다. 짐을 위로 끌어 올리는 줄을, 땅에서 축으로 감을 수 있도록 방향만 바꿔 줍니다. 거중기처럼 움직 도르래가 없어 힘은 줄지 않습니다.' },
  { k: 'axle', t: '2. 축바퀴(녹로) — 10:1', fx: '손바퀴 힘 = 줄 힘 × r/R = 1/10', cam: 'axle', tx: '줄은 반지름 r=100인 축에 감기고, 사람은 반지름 R=1,000인 손바퀴 테를 돌립니다. 그래서 필요한 힘은 1/10. 기중가도설의 「녹로 자루:기둥 = 10:1」과 같은 원리입니다. 여덟 사람이 나누면 한 사람 몫은 1/80입니다.' },
  { k: 'work', t: '3. 일의 원리', fx: '힘 1/10 → 거리 10배', cam: 'all', tx: '짐이 h만큼 오르면 축에는 줄이 h만큼 감기고, 손바퀴 테는 10h를 돕니다. 힘은 줄어도 그만큼 많이 돌려야 합니다.' },
  { k: 'tip', t: '4. 무게중심과 넘어짐', fx: '짐 × 팔 길이 < 녹로 무게 × 팔 길이', cam: 'tip', tx: '짐은 밑틀 앞끝보다 더 앞에 매달려 녹로를 앞으로 넘기려 합니다(지레). 녹로 자체의 무게가 뒤에서 버팁니다. 무게중심이 앞으로 쏠리고 이를 바로잡을 장치가 없어, 작은 돌이나 목재만 올렸습니다(김평원 2017).' },
  { k: 'cmp', t: '5. 거중기와 비교', cam: 'all', tx: '거중기: 움직 도르래 4개(1/8) × 얼레(1/8) ≈ 1/64의 힘, 들 수 있는 높이 약 3m — 무거운 돌을 수레에 싣는 기계. 녹로: 고정 도르래 1개 × 축바퀴(1/10) = 1/10의 힘, 높이 약 10m — 가벼운 짐을 높은 곳에 올리는 기계.' },
  { k: 'hist', t: '역사 — 녹로는 어디에 썼을까?', cam: 'all', tx: '화성 축성에는 녹로 2좌가 쓰였습니다(『화성성역의궤』). 성벽은 바깥만 돌로 쌓고 안은 흙으로 채워(외축 내탁) 높이 들어 올릴 일이 적었고, 녹로는 성문 누각(4곳)과 공심돈(3곳) 같은 높은 건물 공사에 쓰였을 것으로 봅니다. 뒤에 1803년 창덕궁 인정전 재건 때도 다시 쓰였습니다(김평원 2017).' },
];
let sciKey = null, sciT = 0, sciSig = '';
function setSci(k) { sciKey = k; sciT = 0; sciSig = ''; clearSciG(); const c = SCI_CARDS.find(c => c.k === k); if (c && c.cam) goCam(c.cam);
  document.querySelectorAll('#sciCards .sci').forEach(el => el.classList.toggle('on', el.dataset.k === k)); dirty = true }
$('sciCards').innerHTML = SCI_CARDS.map(c => `<div class="sci" data-k="${c.k}"><h3>${c.t}</h3>${c.fx ? `<div class="fx">${c.fx}</div>` : ''}<div class="tx">${c.tx}</div>
  ${c.k === 'tip' ? '<div class="row"><span class="lb">짐 무게</span><input id="sciM" type="range" min="100" max="1400" step="50" value="300"><span id="sciMv" class="k">300kg</span></div>' : ''}</div>`).join('');
document.querySelectorAll('#sciCards .sci').forEach(el => el.addEventListener('click', () => setSci(el.dataset.k === sciKey ? null : el.dataset.k)));
$('sciM').addEventListener('click', e => e.stopPropagation()); $('sciM').addEventListener('input', e => { e.stopPropagation(); $('sciMv').textContent = $('sciM').value + 'kg'; sciSig = ''; dirty = true });
function sciOverlay(st, k) {
  const sig = k + '|' + Math.round(st.hook / 20) + '|' + ($('sciM') ? $('sciM').value : ''); if (sig === sciSig) return; clearSciG(); sciSig = sig;
  if (!k || k === 'hist') return;
  const P = sim.PULLEY, R = sim.R_PULLEY, A = sim.AXLE, X = sim.DROP_X, T = st.ropeTension;
  if (k === 'fixed') {
    arrow3([X - 200, 0, st.hook - 300], [X - 200, 0, st.hook - 1300], COL.load); label3(`짐 무게 W = ${NN(st.W)}`, [X - 1400, 0, st.hook - 900], '#c0392b');
    arrow3([X, 0, P.z - 900], [X, 0, P.z - 300], COL.rope); label3(`줄 힘 T = ${NN(T)}`, [X - 1300, 0, P.z - 700], '#1f6fd1');
    const r = st.ropePath, a = r[0], b = r[1], d = [b[0] - a[0], b[2] - a[2]], L = Math.hypot(...d), m = [a[0] + d[0] * .7, a[2] + d[1] * .7];
    arrow3([m[0], 0, m[1]], [m[0] - d[0] / L * 900, 0, m[1] - d[1] / L * 900], COL.rope); label3(`축 쪽 줄 힘도 T = ${NN(T)}\n(크기 같음, 방향만 바뀜)`, [m[0] + 900, 0, m[1] + 200], '#1f6fd1');
  } else if (k === 'axle') {
    arrow3([A.x - 60, 0, A.z + sim.R_AXLE + 40], [A.x - 900, 0, A.z + sim.R_AXLE + 40 + 640], COL.rope, 26); label3(`축의 줄 힘 T = ${NN(T)}\n(축 반지름 r = 100)`, [A.x - 1500, 0, A.z + 1400], '#1f6fd1');
    const ty = sim.WHEEL_Y; arrow3([A.x, ty, A.z + sim.R_WHEEL], [A.x - 600, ty, A.z + sim.R_WHEEL], COL.hand, 24);
    label3(`손바퀴 테 힘 F = T × r/R = ${NN(st.wheelForce)}\n(R = 1,000, 10:1)\n8명이 나누면 1인 ${NN(st.wheelForce / 8)}`, [A.x + 1400, ty, A.z + sim.R_WHEEL + 700], '#1e8e3e');
  } else if (k === 'work') {
    arrow3([X - 700, 0, st.hook - 750 - Math.max(80, st.lift)], [X - 700, 0, st.hook - 750], COL.dist, 30);
    label3(`짐이 오른 높이 h = ${(st.lift / 1000).toFixed(2)}m · 힘 W`, [X - 2600, 0, st.hook - 400], '#8e44ad');
    label3(`축에 감긴 줄 = h = ${(st.wound / 1000).toFixed(2)}m · 힘 T = W`, [A.x, 0, A.z + 1800], '#1f6fd1');
    label3(`손바퀴 테가 돈 거리 = 10h = ${(st.wheelTravel / 1000).toFixed(1)}m · 힘 W/10`, [A.x + 600, 0, A.z - 1500], '#1e8e3e');
    label3('힘 × 거리 = 일정 (일의 원리)', [-1500, 0, 11800], '#1c140c', 1.2);
  } else if (k === 'tip') {
    const m = +$('sciM').value, e = sim.TIP_EDGE, cg = sim.MACHINE_COG, ratio = m * (e - X) / sim.RESIST;
    arrow3([X, -900, st.hook - 750], [X, -900, st.hook - 1750], COL.load, 40); label3(`짐 ${m}kg`, [X - 900, -900, st.hook - 1200], '#c0392b');
    arrow3([cg, -900, 2600], [cg, -900, 1600], COL.tip, 40); label3(`녹로 무게 약 ${Math.round(sim.MACHINE_KG)}kg\n(무게중심 x ${Math.round(cg)})`, [cg + 900, -900, 3200], '#d35400');
    arrow3([e, -900, 300], [e, -900, 0], 0x1c140c, 50); label3('넘어지는 축(밑틀 앞끝)', [e + 300, -900, -500], '#1c140c');
    label3(ratio >= 1 ? `앞으로 넘어짐! (${Math.round(ratio * 100)}%)` : `버팀 — 넘기려는 힘 ${Math.round(ratio * 100)}%\n최대 약 ${Math.round(sim.MAX_SAFE_KG)}kg`, [-1500, -900, 6500], ratio >= 1 ? '#c0392b' : '#1e8e3e', 1.2);
  } else if (k === 'cmp') {
    label3('녹로: 힘 1/10 · 높이 약 10m\n→ 가벼운 짐을 높은 곳으로', [-1500, 0, 12000], '#1f6fd1', 1.1);
    label3('거중기: 힘 약 1/64 · 높이 약 3m\n→ 무거운 돌을 수레에 싣기', [-1500, 0, 6800], '#8e44ad', 1.1);
  }
}

// ---------- 화성 현장 (공심돈) ----------
const marsG = new THREE.Group(); root.add(marsG); marsG.visible = false;
{ const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb7ae9c, roughness: .95 }), brickMat = new THREE.MeshStandardMaterial({ color: 0x8d8478, roughness: .9 }), wood = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: .8 });
  const T = sim.TOWER, w = T.x0 - T.x1;
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 5000, T.top), stoneMat); base.position.set((T.x0 + T.x1) / 2, 0, T.top / 2); base.castShadow = base.receiveShadow = true; marsG.add(base);
  // 성돌 줄눈
  const lines = []; for (let z = 500; z < T.top; z += 500) { const g = new THREE.BoxGeometry(w + 20, 5020, 18); g.translate((T.x0 + T.x1) / 2, 0, z); lines.push(g) }
  const jm = new THREE.Mesh(mergeGeometries(lines), new THREE.MeshStandardMaterial({ color: 0x8f8778 })); marsG.add(jm);
  // 위 단 벽돌 벽(쌓는 중) 일부
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w - 1400, 400, 1400), brickMat); wall.position.set((T.x0 + T.x1) / 2 - 300, -2200, T.top + 700); wall.castShadow = true; marsG.add(wall);
  const wall2 = wall.clone(); wall2.position.y = 2200; marsG.add(wall2);
  // 공심돈 위 일꾼 자리 표시(나무 비계 기둥)
  for (const y of [-2600, 2600]) for (const x of [T.x0 - 200, T.x1 + 200]) { const p = new THREE.Mesh(new THREE.BoxGeometry(120, 120, T.top + 1600), wood); p.position.set(x, y, (T.top + 1600) / 2); p.castShadow = true; marsG.add(p) }
}
const pullRope = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xc2a26a, roughness: .9 })); marsG.add(pullRope);
let marsT = 0, marsPlaying = false, marsSpeed = 1, prevOn = 'ground';
const MPH = ['돌 묶기', '감아 올리기', '갈고리로 끌기', '내려놓기', '되돌리기'];
$('mPlay').onclick = () => { audio(); if (marsT >= sim.SCENE_TOTAL) { marsT = 0; prevOn = 'ground' } marsPlaying = !marsPlaying; dirty = true };
$('mReset').onclick = () => { marsT = 0; prevOn = 'ground'; dirty = true };
$('mSpd').onchange = () => { marsSpeed = +$('mSpd').value };
$('mSl').max = sim.SCENE_TOTAL; $('mSl').oninput = () => { marsT = +$('mSl').value; dirty = true };

// ---------- 문제 풀기 ----------
const QUIZ = [
  { q: '녹로(轆轤)라는 이름은 본래 무엇을 뜻할까요?', ch: ['높은 기둥', '줄을 감는 장치', '큰 수레', '돌을 깎는 도구'], a: 1, ex: '녹로는 줄을 감는 장치를 두루 이르는 말입니다. 장비의 일부(줄 감는 축)가 장비 전체의 이름이 되었습니다(김평원 2017).' },
  { q: '『화성성역의궤』에 적힌 녹로 간목(竿木)의 길이는?', ch: ['15척', '20척', '35척', '50척'], a: 2, ex: '간목 35척(약 10.6m), 틀은 세로 15척·높이 10척입니다.' },
  { q: '녹로 꼭대기 활차는 어떤 도르래일까요?', ch: ['움직 도르래', '고정 도르래', '복합 도르래 8개', '도르래가 없다'], a: 1, ex: '고정 도르래 하나 — 힘의 크기는 그대로, 방향만 바뀝니다.' },
  { q: '손바퀴 반지름이 축 반지름의 10배라면 필요한 힘은?', ch: ['10배', '그대로', '1/2', '1/10'], a: 3, ex: '축바퀴의 원리: 힘은 r/R = 1/10. 대신 손바퀴는 10배 더 돌려야 합니다.' },
  { q: '녹로로 무거운 돌을 올리기 어려웠던 까닭으로 알맞은 것은?', ch: ['바퀴가 너무 커서', '무게중심이 앞으로 쏠리고 나무 활차가 약해서', '사람이 너무 많아서', '줄이 너무 짧아서'], a: 1, ex: '짐이 밑틀보다 앞에 매달려 앞으로 넘어지려 하고, 이를 바로잡을 장치가 없었습니다(김평원 2017).' },
  { q: '화성 축성에서 녹로를 주로 썼을 것으로 보는 곳은?', ch: ['성벽 기초', '성문 누각과 공심돈', '채석장', '해자'], a: 1, ex: '성문 누각 4곳과 공심돈 3곳처럼 높은 건물 공사에 녹로 2좌를 번갈아 썼을 것으로 봅니다(김평원 2017).' },
];
let quizScore = 0, quizDone = [];
function renderQuiz() { const box = $('quizbox');
  box.innerHTML = '<b id="quizScore">문제 풀기 — ' + quizScore + ' / ' + QUIZ.length + '점</b><button id="qrerun" style="float:right">다시 풀기</button>'
    + QUIZ.map((q, i) => `<div class="qq" data-i="${i}"><b class="q">${i + 1}. ${q.q}</b><div class="ch">${q.ch.map((c, j) => `<button data-j="${j}">${'①②③④'[j]} ${c}</button>`).join('')}</div><div class="ex" hidden></div></div>`).join('');
  box.querySelectorAll('.qq').forEach(qq => qq.querySelectorAll('.ch button').forEach(b => b.onclick = () => {
    const i = +qq.dataset.i, j = +b.dataset.j, q = QUIZ[i]; if (quizDone[i]) return; quizDone[i] = true;
    qq.querySelectorAll('.ch button').forEach(x => { x.disabled = true; if (+x.dataset.j === q.a) x.classList.add('ok') });
    if (j !== q.a) b.classList.add('no'); else quizScore++;
    const ex = qq.querySelector('.ex'); ex.hidden = false; ex.innerHTML = (j === q.a ? '<b>정답!</b> ' : '<b>아쉬워요 — 정답은 ' + '①②③④'[q.a] + '</b> ') + q.ex;
    $('quizScore').textContent = '문제 풀기 — ' + quizScore + ' / ' + QUIZ.length + '점' + (quizDone.filter(Boolean).length === QUIZ.length ? ' · 완료!' : '');
  }));
  box.querySelector('#qrerun').onclick = () => { quizScore = 0; quizDone = []; renderQuiz() } }
$('quizb').onclick = () => { const b = $('quizbox'); b.hidden = !b.hidden; $('quizb').classList.toggle('on', !b.hidden); if (!b.hidden && !quizDone.length) renderQuiz() };

// ---------- 탭 ----------
const TABS = { tBuild: 'build', tSci: 'sci', tCtrl: 'ctrl', tMars: 'mars' };
function setMode(m) {
  mode = m; stop(); Object.keys(TABS).forEach(id => $(id).classList.toggle('on', TABS[id] === m));
  ['buildbox', 'info', 'list'].forEach(id => $(id).hidden = m !== 'build');
  $('scibox').hidden = m !== 'sci'; $('ctrlbox').hidden = m !== 'ctrl'; $('marsbox').hidden = m !== 'mars';
  nowBox.hidden = m !== 'build'; $('mvhint').hidden = m !== 'build';
  WORKERG.visible = m === 'ctrl' || m === 'mars'; marsG.visible = m === 'mars';
  if (m !== 'sci') { setSci(null); clearSciG() }
  if (m !== 'build') { intro = true; cur = N; show(N) }
  if (m === 'ctrl') goCam('all'); if (m === 'mars') goCam('mars');
  if (m === 'build') { viewMode = 'all'; document.querySelectorAll('#vm button').forEach(x => x.classList.toggle('on', x.dataset.m === 'all')); show(cur) }
  dirty = true;
}
Object.keys(TABS).forEach(id => $(id).onclick = () => setMode(TABS[id]));

// ---------- 배치 ----------
const tmpM = new THREE.Matrix4(), tmpR = new THREE.Matrix4(), tmpV = new THREE.Vector3();
let stoneOff = [0, 0, 0], hookOff = [0, 0, 0], axAng = 0, puAng = 0;
function placeAll() {
  const live = mode !== 'build';
  for (const o of ALL) { if (o.dyn) continue; const M = new THREE.Matrix4();
    if (live && o.mv === 'stone') M.makeTranslation(...stoneOff); if (live && o.mv === 'hook') M.makeTranslation(...hookOff);
    const ang = live ? (o.spin === 'ax' ? axAng : o.spin === 'pu' ? puAng : 0) : 0;
    if (ang) { tmpV.set(...o.sax).normalize(); M.multiply(tmpM.makeTranslation(...o.spiv)).multiply(tmpR.makeRotationAxis(tmpV, ang)).multiply(new THREE.Matrix4().makeTranslation(-o.spiv[0], -o.spiv[1], -o.spiv[2])) }
    if (o.off[0] || o.off[1] || o.off[2]) M.premultiply(tmpM.makeTranslation(...o.off));
    o.g.matrix.copy(M); o.g.matrixWorldNeedsUpdate = true }
}
let ropeSig = '';
function updRope(hook, loadX) { if (!ROPE) return; const sig = Math.round(hook) + '|' + Math.round(loadX); if (sig === ropeSig) return; ropeSig = sig;
  ROPE.mesh.geometry.dispose(); ROPE.mesh.geometry = ropeGeo(live() ? sim.ropePath(hook, loadX) : sim.ropePath(sim.HOOK_MIN)) }
const live = () => mode !== 'build';
let lastState = null;
window.__state = () => ({ tab: mode, ready, step: cur, N, hook: lastState && Math.round(lastState.hook), pull: lastState && Math.round(lastState.pull || 0), tip: lastState && lastState.tipRatio, phase: lastState && lastState.phase, stone: stoneOff.map(Math.round) });

// ---------- 루프 ----------
let last = performance.now(), creakT = 0, armT = 0;
(function loop(t) {
  requestAnimationFrame(loop); const dt = Math.min(.25, Math.max(0, (t - last) / 1000)); last = t;
  if (camAnim) { const u = Math.min(1, (performance.now() - camAnim.t0) / 900), e = 1 - Math.pow(1 - u, 3); TGT.lerpVectors(camAnim.from[0], camAnim.to[0], e); az = camAnim.from[1] + (camAnim.to[1] - camAnim.from[1]) * e; el = camAnim.from[2] + (camAnim.to[2] - camAnim.from[2]) * e; dist = camAnim.from[3] + (camAnim.to[3] - camAnim.from[3]) * e; setCam(); if (u >= 1) camAnim = null }
  const now = performance.now(); for (let k = ret.length - 1; k >= 0; k--) { const o = ret[k]; const u = Math.min(1, (now - o.ret.t0) / o.ret.dur), e = 1 - Math.pow(1 - u, 3); o.off = o.ret.from.map(v => v * (1 - e)); dirty = true; if (u >= 1) { o.ret = null; ret.splice(k, 1) } }
  let winding = false;
  if (ready && mode === 'ctrl') {
    const pre = sim.nokro({ ...ctrl });
    if (wind && !(wind > 0 && (pre.tooHeavy || pre.tipping))) ctrl.th = Math.max(0, Math.min(TH_MAX, ctrl.th + wind * WIND_RATE * dt));
    const st = sim.nokro({ ...ctrl }); lastState = st; updReads(st); winding = !!wind && !(wind > 0 && (pre.tooHeavy || pre.tipping));
    axAng = -st.th; puAng = st.pulleyAngle; hookOff = [st.loadX - sim.DROP_X, 0, st.hook - sim.HOOK_MIN]; stoneOff = hookOff.slice();
    updRope(st.hook, st.loadX); dirty = true;
  } else if (ready && mode === 'sci') {
    sciT += dt; const h = 3500 * (1 - Math.cos(sciT * .5)) / 2;
    const m = sciKey === 'tip' ? +$('sciM').value : 300;
    const st = sim.nokro({ th: h / sim.R_AXLE, massKg: m }); lastState = st;
    axAng = -st.th; puAng = st.pulleyAngle; hookOff = [0, 0, st.hook - sim.HOOK_MIN]; stoneOff = hookOff.slice();
    updRope(st.hook, st.loadX); sciOverlay(st, sciKey); dirty = true;
  } else if (ready && mode === 'mars') {
    if (marsPlaying) marsT = Math.min(sim.SCENE_TOTAL, marsT + dt * marsSpeed); if (marsT >= sim.SCENE_TOTAL) marsPlaying = false;
    const st = sim.scene(marsT); lastState = st;
    axAng = -st.th; puAng = st.th * sim.R_AXLE / sim.R_PULLEY; hookOff = [st.loadX - sim.DROP_X, 0, st.hook - sim.HOOK_MIN];
    stoneOff = [st.stone[0] - sim.DROP_X, 0, st.stone[1]];
    winding = marsPlaying && (st.phase === 'raise' || st.phase === 'lower' || st.phase === 'back');
    if (st.stoneOn === 'tower' && prevOn !== 'tower') thud(); prevOn = st.stoneOn;
    updRope(st.hook, st.loadX);
    // 갈고리 줄: 공심돈 위 일꾼 쪽으로 당김
    if (st.pull > 1 && st.phase !== 'back') { const a = new THREE.Vector3(st.loadX, 0, st.hook - 150), b = new THREE.Vector3(sim.TOWER.x0 - 2600, 0, sim.TOWER.top + 900);
      pullRope.geometry.dispose(); pullRope.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 4, 12, 6, false); pullRope.visible = true } else pullRope.visible = false;
    $('mPh').textContent = '단계 ' + (st.phaseIndex + 1) + '/' + sim.PHASES.length + ' · ' + MPH[st.phaseIndex]; $('marsCap').textContent = st.caption;
    if (document.activeElement !== $('mSl')) $('mSl').value = Math.round(marsT); $('mPlay').textContent = marsPlaying ? '⏸ 정지' : '▶ 재생';
    dirty = true;
  } else { axAng = 0; puAng = 0; stoneOff = [0, 0, 0]; hookOff = [0, 0, 0]; updRope(sim.HOOK_MIN, sim.DROP_X) }
  if (winding) { creakT += dt; if (creakT > .18) { creak(); creakT = 0 } }
  armT += dt; WORKERS.forEach(w => { w.torso.rotation.y = winding ? -.12 + Math.sin(armT * 3 + w.i) * .05 : 0; w.arms.forEach(a => a.rotation.y = -.35 + (winding ? Math.sin(armT * 5 + w.i * 1.3) * .3 : 0)) });
  const moving = ret.length > 0 || !!drag || S.some((s, i) => s.v !== ((i < cur && s.ready) ? 1 : 0)) || (ready && mode !== 'build');
  if (!dirty && !moving) return; dirty = false;
  placeAll();
  S.forEach((s, i) => {
    const tgt = (s.ready && (mode === 'build' ? i < cur : true)) ? 1 : 0; s.v += (tgt - s.v) * Math.min(.12, .12 * 1300 / (timer ? spd() : 1300)); if (Math.abs(tgt - s.v) < .002) s.v = tgt;
    const isCur = mode === 'build' && i === cur - 1 && !intro; let op = Math.min(1, s.v * 1.5);
    if (mode === 'build' && viewMode === 'ghost' && !isCur) op *= .13;
    s.g.visible = s.v > .01 && !(mode === 'build' && viewMode === 'solo' && !isCur && !intro);
    if (ghostAll) op *= .35;
    s.objs.forEach(o => { const hv = o === hoverO, oo = hv ? Math.max(op, .92) : op; o.g.visible = oo > .01; o.mat.opacity = oo; o.mat.depthWrite = oo > .9;
      if (o.mat.emissive) o.mat.emissive.setHex(hv ? 0x6a3a00 : (isCur && viewMode !== 'solo' ? 0x3a2200 : 0));
      if (o.emat) { o.emat.visible = edgeOn; o.eg.visible = edgeOn && oo > .5 } });
    s.g.position.z = (1 - s.v) * 900;
  });
  ren.render(sc, cam);
})(performance.now());

size(); setCam(); setMode('build'); show(N); buildAll();
