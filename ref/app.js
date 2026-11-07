import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { featureEdges } from './edges.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import { buildModel, SM, export_prof } from './model.js';
const { RAMP, VS, SS, LID, BM, PL, SB, IB, BOARD, TUBE, holeX, holeD, tbBall, RU, cw, dOf, CH, LV, SBOX, ARM, bw, BAY, S12, HM, WH, GK, TL, TR, YG, YJ, BIN, RATE, L0, SI, SIH, JEOLGI } = SM;

const $ = id => document.getElementById(id);
let jeolgi = 0;
let MODEL = buildModel({ jeolgi });
const { G, steps } = MODEL;
const N = steps.length;

// ---------- 형상 만들기 ----------
const ev = new Evaluator(); ev.attributes = ['position', 'normal']; ev.useGroups = false;
const m4 = M => new THREE.Matrix4().set(...M);
function clean(g) { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g }
// 회전체: 단면 모서리는 날카롭게, 둘레 방향은 매끄럽게 (평면 안 분할선이 윤곽선으로 나오지 않음)
function latheGeo(pts, n) {
  let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; }
  const sg = A > 0 ? 1 : -1, P = [], Nn = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]; const dr = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dr, dz); if (L < 1e-6) continue;
    const nr = sg * dz / L, nz = -sg * dr / L;
    for (let j = 0; j < n; j++) {
      const t0 = j / n * Math.PI * 2, t1 = (j + 1) / n * Math.PI * 2, c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      const va0 = [a[0] * c0, a[0] * s0, a[1]], vb0 = [b[0] * c0, b[0] * s0, b[1]], vb1 = [b[0] * c1, b[0] * s1, b[1]], va1 = [a[0] * c1, a[0] * s1, a[1]];
      const n0 = [nr * c0, nr * s0, nz], n1 = [nr * c1, nr * s1, nz];
      const tri = (p, q, r, np, nq, nn) => {
        const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
        const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const cl = Math.hypot(...c); if (cl < 1e-6) return;
        const m = [np[0] + nq[0] + nn[0], np[1] + nq[1] + nn[1], np[2] + nq[2] + nn[2]];
        if (c[0] * m[0] + c[1] * m[1] + c[2] * m[2] < 0) { P.push(...p, ...r, ...q); Nn.push(...np, ...nn, ...nq) } else { P.push(...p, ...q, ...r); Nn.push(...np, ...nq, ...nn) }
      };
      tri(va0, vb0, vb1, n0, n0, n1); tri(va0, vb1, va1, n0, n1, n1);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g;
}
function primGeo(n) {
  let g;
  switch (n.p) {
    case 'B': g = new THREE.BoxGeometry(...n.s); break;
    case 'C': g = new THREE.CylinderGeometry(n.d2 / 2, n.d1 / 2, n.h, n.n); g.rotateX(Math.PI / 2); break;
    case 'S': g = new THREE.SphereGeometry(n.r, 28, 18); break;
    case 'E': { const sh = new THREE.Shape(n.pts.map(p => new THREE.Vector2(p[0], p[1]))); g = new THREE.ExtrudeGeometry(sh, { depth: n.h, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -n.h / 2); break }
    case 'L': g = latheGeo(n.pts, n.n); break;
    case 'P': { const pos = []; for (const F of n.F) for (let i = 1; i < F.length - 1; i++) for (const v of [F[0], F[i], F[i + 1]]) pos.push(...n.V[v]);
      g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); break }
  }
  g = clean(g); g.applyMatrix4(m4(n.M)); g.computeBoundingBox(); return g
}
let solidC = new WeakMap(); let CURL = '';
function brushOf(g) { const b = new Brush(g); b.updateMatrixWorld(); return b }
function solid(n) {
  if (solidC.has(n)) return solidC.get(n); let r;
  if (!n.op) r = brushOf(primGeo(n));
  else if (n.op === 'uni') { r = solid(n.c[0]); for (let i = 1; i < n.c.length; i++) { try { r = ev.evaluate(r, solid(n.c[i]), ADDITION) } catch (e) { console.warn('CSG 건너뜀', CURL, e.message) } } }
  else { r = solid(n.a); const flat = []; const fl = c => c.op === 'uni' ? c.c.forEach(fl) : flat.push(c); n.b.forEach(fl);
    for (const c of flat) { const cb = solid(c); r.geometry.computeBoundingBox(); cb.geometry.computeBoundingBox();
      if (!r.geometry.boundingBox.intersectsBox(cb.geometry.boundingBox)) continue; try { r = ev.evaluate(r, cb, SUBTRACTION) } catch (e) { console.warn('CSG 건너뜀', CURL, e.message) } } }
  r.geometry = clean(r.geometry); r.geometry.computeBoundingBox(); solidC.set(n, r); return r
}
const hasDiff = n => n.op === 'diff' || (n.op === 'uni' && n.c.some(hasDiff));
function display(n) { if (!n.op) return [primGeo(n)]; if (n.op === 'uni') return n.c.flatMap(display); return [solid(n).geometry.clone()] }
const memberGeo = node => mergeGeometries(display(node).map(x => clean(x)), false);

// ---------- 장면 ----------
const cv = $('cv'), ren = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio)); cv.prepend(ren.domElement);
ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05; ren.outputColorSpace = THREE.SRGBColorSpace;
ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap; ren.localClippingEnabled = true;
const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 10, 90000);
const pm = new THREE.PMREMGenerator(ren); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
sc.add(new THREE.HemisphereLight(0xfff6e8, 0x5d5040, 0.55));
const dl = new THREE.DirectionalLight(0xfff0dc, 2.2); dl.position.set(3500, 9000, 6500); dl.castShadow = true;
dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -6000, right: 6000, top: 6000, bottom: -6000, near: 1000, far: 22000 }); dl.shadow.bias = -0.0004; dl.shadow.normalBias = 2;
dl.target.position.set(0, 1500, 0); sc.add(dl, dl.target);
const dl2 = new THREE.DirectionalLight(0xdde8ff, .5); dl2.position.set(-6000, 3000, -7000); sc.add(dl2);
// 바닥: 전돌
const tc = document.createElement('canvas'); tc.width = tc.height = 256; { const x = tc.getContext('2d'); x.fillStyle = '#8d877b'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 128 + Math.random() * 20 - 10; x.fillStyle = `rgb(${v + 10},${v + 4},${v - 8})`; x.fillRect(i * 128 + 3, j * 128 + 3, 122, 122) } }
const tt = new THREE.CanvasTexture(tc); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(30, 30); tt.colorSpace = THREE.SRGBColorSpace;
const gr = new THREE.Mesh(new THREE.PlaneGeometry(18000, 18000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tt, roughness: .95 })); gr.receiveShadow = true; gr.position.y = -1; sc.add(gr);
const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; sc.add(root);

// ---------- 재질 ----------
const MATP = { bronze: { m: .72, r: .48 }, copper: { m: .88, r: .3 }, copperB: { m: .92, r: .2 }, iron: { m: .7, r: .45 }, ironB: { m: .85, r: .28 }, wood: { m: 0, r: .72 }, woodL: { m: 0, r: .6 },
  lacquer: { m: 0, r: .38 }, paint: { m: 0, r: .6 }, stone: { m: 0, r: .95 }, roof: { m: .1, r: .75 }, drum: { m: 0, r: .55 }, plaque: { m: 0, r: .7 } };
const cutPlanes = { };
const planeFor = y => { const k = String(y); if (!cutPlanes[k]) cutPlanes[k] = new THREE.Plane(new THREE.Vector3(0, 0, -1), -y); return cutPlanes[k] };
const texOf = (t, s) => { const c = document.createElement('canvas'); c.width = 128; c.height = 208; const x = c.getContext('2d'); x.fillStyle = '#efe4c8'; x.fillRect(0, 0, 128, 208);
  x.strokeStyle = '#8e2a1e'; x.lineWidth = 8; x.strokeRect(6, 6, 116, 196); x.fillStyle = '#1f1a14'; x.font = '700 92px "Noto Serif KR","Gowun Batang",serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 64, 86);
  x.font = '700 28px "Noto Sans KR",sans-serif'; x.fillStyle = '#8e2a1e'; x.fillText(s, 64, 168); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx };

// ---------- 단계별 부재 ----------
const S = steps.map(s => ({ ...s, g: new THREE.Group(), objs: [], v: 0, ready: false }));
S.forEach(s => { s.g.visible = false; root.add(s.g) });
const MV = new Map();   // 움직이는 부재 id → [o...]
const ALL = [];
function makeObj(m, i) {
  const g = memberGeo(m.node);
  const mp = MATP[m.mat] || MATP.wood;
  const mat = new THREE.MeshStandardMaterial({ color: m.col, metalness: mp.m, roughness: mp.r, transparent: true, side: THREE.DoubleSide, envMapIntensity: 1 });
  const og = new THREE.Group(); og.matrixAutoUpdate = false; const me = new THREE.Mesh(g, mat); me.castShadow = true; me.receiveShadow = true; og.add(me);
  const emat = new THREE.LineBasicMaterial({ color: 0x1c140c, transparent: true, opacity: .32 });
  const eg = new THREE.LineSegments(featureEdges(g, 28), emat); og.add(eg);
  if (m.tex) { const pg = new THREE.PlaneGeometry(m.tex.w, m.tex.h); const pmat = new THREE.MeshStandardMaterial({ map: texOf(m.tex.t, m.tex.s), roughness: .7, transparent: true });
    const pl = new THREE.Mesh(pg, pmat); const n = new THREE.Vector3(...m.tex.n).normalize(), up = new THREE.Vector3(0, 0, 1), xa = up.clone().cross(n).normalize();
    pl.matrix.makeBasis(xa, up, n).setPosition(m.tex.c[0] + n.x * .6, m.tex.c[1] + n.y * .6, m.tex.c[2] + n.z * .6); pl.matrixAutoUpdate = false; og.add(pl); m._pm = pmat }
  const bb = g.boundingBox || (g.computeBoundingBox(), g.boundingBox); const rest = bb.getCenter(new THREE.Vector3());
  const hidB = v => m.label === v + ' 방목' || m.label === v + ' 방목 안 통로 칸막이(隔)';
  const hideKey = hidB('앞(남)') ? 'vA' : hidB('뒤(북)') ? 'vB' : steps[i].key === '12_bay' ? 'vBay' : null;
  const o = { hideKey, g: og, mesh: me, mat, emat, pmat: m._pm, label: m.label, step: i, mv: m.mv, piv: m.piv, ax: m.ax, cut: m.cut, seasonal: m.seasonal, m, rest: [rest.x, rest.y, rest.z], off: [0, 0, 0], ret: null, pose: null };
  me.userData.o = o;
  if (m.mv) { if (!MV.has(m.mv)) MV.set(m.mv, []); MV.get(m.mv).push(o) }
  return o;
}
async function buildAll() {
  for (let i = 0; i < N; i++) {
    const s = S[i]; $('ld').textContent = '부재를 만드는 중… ' + (i + 1) + ' / ' + N + '  (' + s.label + ')';
    await new Promise(r => setTimeout(r, 0));
    const t0 = performance.now(); for (const m of s.members) { CURL = m.label; const o = makeObj(m, i); s.objs.push(o); ALL.push(o); s.g.add(o.g) }
    s.ready = true; dirty = true; if (window.__dbg) console.log('STEP', s.label, Math.round(performance.now() - t0));
  }
  $('ld').style.display = 'none'; ready = true; applyCut(); dirty = true;
}
// 절기를 바꾸면 경점용 동판·걸쇠·구슬을 다시 만듦 (실제로도 절기마다 동판을 바꿔 끼움)
function rebuildSeasonal() {
  MODEL = buildModel({ jeolgi }); solidC = new WeakMap();
  const newMembers = MODEL.steps.flatMap(s => s.members).filter(m => m.seasonal);
  const olds = ALL.filter(o => o.seasonal);
  olds.forEach((o, i) => { const m = newMembers[i]; if (!m) return; const g = memberGeo(m.node); o.mesh.geometry.dispose(); o.mesh.geometry = g;
    const eg = o.g.children[1]; eg.geometry.dispose(); eg.geometry = featureEdges(g, 28); g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); o.rest = [c.x, c.y, c.z]; o.m = m; o.label = m.label });
  dirty = true;
}

// ---------- 물 ----------
const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x3f9fe6, emissive: 0x0b3a66, transparent: true, opacity: .62, roughness: .05, metalness: 0, depthWrite: false, side: THREE.DoubleSide });   // 물은 그릇보다 나중에 그려야(renderOrder) 그릇 안쪽 벽에 가려지지 않음
const WMATS = []; const wmat = y => { const m = waterMat.clone(); m.userData.cut = y; WMATS.push(m); return m };
const waterG = new THREE.Group(); root.add(waterG);
function jarWater(prof, wall, bot, level, c) { // 그릇 안쪽 단면으로 물 덩어리
  const rAt = z => { for (let i = 1; i < prof.length; i++) { const [a, b] = [prof[i - 1], prof[i]]; if (z >= a[1] && z <= b[1] && b[1] > a[1]) return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) } return prof[prof.length - 1][0] };
  const pts = [[0, bot + 1]]; for (let z = bot + 1; z < level; z += 20) pts.push([rAt(z) - wall - 2, z]); pts.push([rAt(level) - wall - 2, level], [0, level]);
  const m = new THREE.Mesh(latheGeo(pts, 48), wmat(c.y)); m.renderOrder = 5; m.position.set(c.x, c.y, c.z); waterG.add(m); return m }
const PP = export_prof.pos;
jarWater(export_prof.dae, 12, 18, 470, PP.dae); jarWater(export_prof.jung, 10, 15, 360, PP.jung); jarWater(export_prof.so, 8, 15, 135, PP.so); jarWater(export_prof.so, 8, 15, 70, PP.pye);
const susuW = VS.map(c => { const g = new THREE.CylinderGeometry(SS.od / 2 - SS.wall - 9, SS.od / 2 - SS.wall - 9, 1, 48); g.rotateX(Math.PI / 2); g.translate(0, 0, .5);
  const m = new THREE.Mesh(g, wmat(c.y)); m.renderOrder = 5; m.position.set(c.x, c.y, SS.zb + SS.bot); waterG.add(m); return m });
const streamMat = new THREE.MeshPhysicalMaterial({ color: 0x5ab0e0, transparent: true, opacity: .7, roughness: .05, depthWrite: false });
const stream = (x, y, z0) => { const g = new THREE.CylinderGeometry(4, 5, 1, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, -.5); const m = new THREE.Mesh(g, streamMat); m.renderOrder = 6; m.position.set(x, y, z0); waterG.add(m); return m };
[[stream(-2100, 0, 3628), PP.jung.z + 15 + 345], [stream(-1400, 0, 3018), PP.so.z + 135], [stream(-1300, -400, 413), 85]].forEach(([m, zt]) => m.scale.z = m.position.z - zt);
const stS = VS.map(c => stream(-770, c.y, SS.zt));
waterG.visible = false;

// ---------- 카메라 ----------
let az = .55, el = .26, dist = 12500; const TGT = new THREE.Vector3(150, 2300, 0);
let camAnim = null;
const toW = (x, y, z) => new THREE.Vector3(x, z, -y);
function setCam() { cam.position.set(TGT.x + dist * Math.cos(el) * Math.sin(az), TGT.y + dist * Math.sin(el), TGT.z + dist * Math.cos(el) * Math.cos(az)); cam.lookAt(TGT); cam.updateProjectionMatrix(); dirty = true }
function size() { const w = cv.clientWidth, h = cv.clientHeight; ren.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true }
addEventListener('resize', size);
const PRESET = { all: [[250, 0, 2100], .55, .26, 13500], water: [[-1700, 0, 2900], .62, .2, 5600], rod: [[-640, -330, 2950], 1.35, .12, 1100], ball: [[2700, 100, 2350], .3, .35, 2900], s12: [[2430, -250, 1150], .42, .12, 3300], gj: [[3250, 410, 1550], .12, .06, 2700], fig: [[2880, 600, 3050], .1, .14, 3000], wheel: [[2430, -865, 1350], .08, .18, 1900] };
function goCam(k) { if (k === 'ballcam') { setBallCam(!ballCam); return } setBallCam(false); const [t, a, e, d] = PRESET[k]; camAnim = { t0: performance.now(), from: [TGT.clone(), az, el, dist], to: [toW(...t), a, e, d] }; follow = false; $('fol').checked = false }
window.__cam = (a, e, d, x, y, z) => { az = a; el = e; dist = d; if (x != null) TGT.copy(toW(x, y, z)); setCam() };
window.__S = () => S;

// ---------- 조작: 돌리기 · 옮기기 · 부재 떼어 보기 ----------
let dr = null; const el2 = ren.domElement; let moveMode = false, drag = null, hoverO = null; const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayAt(e) { const r = el2.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(ndc, cam); return rc }
function pickObj(e) { const ms = []; S.forEach((s, i) => { if (s.g.visible) s.objs.forEach(o => { if (o.mat.opacity > .05 && o.g.visible) ms.push(o.mesh) }) }); const h = rayAt(e).intersectObjects(ms, false)[0]; return h ? { o: h.object.userData.o, pt: h.point } : null }
const capEl = $('cap'); function cap(t) { capEl.textContent = t || ''; capEl.hidden = !t }
function nameOf(o) { const st = S[o.step]; const g = G[st.key]; return o.label + (g && g.n && g.n.indexOf(o.label) < 0 ? ' · ' + g.n : '') }
const ret = []; function moveBack(o) { o.ret = { from: o.off.slice(), t0: performance.now(), dur: 500 }; if (!ret.includes(o)) ret.push(o) }
const wantMove = e => e.ctrlKey || e.metaKey || moveMode;
el2.addEventListener('contextmenu', e => e.preventDefault());
el2.addEventListener('pointerdown', e => {
  if (wantMove(e) && e.button === 0) { const h = pickObj(e); if (h) { el2.setPointerCapture(e.pointerId); const n = cam.getWorldDirection(new THREE.Vector3());
    h.o.ret = null; drag = { id: e.pointerId, o: h.o, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, h.pt), start: root.worldToLocal(h.pt.clone()), base: h.o.off.slice() };
    hoverO = h.o; cap('✋ ' + nameOf(h.o)); el2.style.cursor = 'grabbing'; dirty = true; return } }
  dr = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; el2.setPointerCapture(e.pointerId)
});
el2.addEventListener('pointermove', e => {
  if (drag && e.pointerId === drag.id) { const w = new THREE.Vector3(); if (rayAt(e).ray.intersectPlane(drag.plane, w)) { const l = root.worldToLocal(w); drag.o.off = drag.base.map((v, i) => v + [l.x - drag.start.x, l.y - drag.start.y, l.z - drag.start.z][i]); dirty = true } return }
  if (!dr) { if (wantMove(e)) { const h = pickObj(e), o = h ? h.o : null; if (o !== hoverO) { hoverO = o; cap(o ? nameOf(o) : ''); dirty = true } el2.style.cursor = o ? 'grab' : '' } else if (hoverO) { hoverO = null; cap(''); el2.style.cursor = ''; dirty = true } return }
  const dx = e.clientX - dr.x, dy = e.clientY - dr.y; dr.x = e.clientX; dr.y = e.clientY;
  if (dr.pan) { const k = dist * .0011; const rgt = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1); TGT.addScaledVector(rgt, -dx * k).addScaledVector(up, dy * k); follow = false; $('fol').checked = false }
  else { az -= dx * .008; el = Math.max(-.05, Math.min(1.45, el + dy * .008)) } camAnim = null; if (ballCam) setBallCam(false); setCam()
});
const pup = e => { if (drag && e.pointerId === drag.id) { const o = drag.o; drag = null; el2.style.cursor = ''; moveBack(o); setTimeout(() => { if (!drag) { hoverO = null; cap(''); dirty = true } }, 700); return } dr = null };
el2.addEventListener('pointerup', pup); el2.addEventListener('pointercancel', pup);
addEventListener('keyup', e => { if ((e.key === 'Control' || e.key === 'Meta') && !drag && !moveMode && hoverO) { hoverO = null; cap(''); el2.style.cursor = ''; dirty = true } });
let ghostAll = false, cutOn = true;
$('ghostb').onclick = () => { ghostAll = !ghostAll; $('ghostb').classList.toggle('on', ghostAll); $('ghostb').setAttribute('aria-pressed', ghostAll); dirty = true };
$('moveb').onclick = () => { moveMode = !moveMode; $('moveb').classList.toggle('on', moveMode); $('moveb').setAttribute('aria-pressed', moveMode); if (!moveMode) { hoverO = null; cap('') } };
function applyCut() { WMATS.forEach(m => { m.clippingPlanes = cutOn ? [planeFor(m.userData.cut)] : []; m.needsUpdate = true }); ALL.forEach(o => { const pl = cutOn && typeof o.cut === 'number' ? [planeFor(o.cut)] : []; o.mat.clippingPlanes = pl; o.emat.clippingPlanes = pl; o.mat.needsUpdate = true; o.emat.needsUpdate = true }); dirty = true }
$('cutb').onclick = () => { cutOn = !cutOn; $('cutb').classList.toggle('on', cutOn); $('cutb').setAttribute('aria-pressed', cutOn); applyCut() };
const zm = f => { if (ballCam) { bc.D = Math.max(120, Math.min(2500, bc.D * f)); dirty = true; return } dist = Math.max(500, Math.min(30000, dist * f)); camAnim = null; setCam() };
el2.addEventListener('wheel', e => { e.preventDefault(); zm(e.deltaY > 0 ? 1.08 : .93) }, { passive: false });
$('zi').onclick = () => zm(.85); $('zo').onclick = () => zm(1.18);

// ---------- 조립 보기 ----------
let mode = 'run', cur = N, timer = null, viewMode = 'all', intro = true; const sl = $('sl'); sl.max = N;
const gk = Object.keys(G);
let html = ''; gk.forEach((k, gi) => { const g = G[k]; html += '<div class="gh"><i class="sw" style="background:' + g.col + '"></i>' + (gi + 1) + '. ' + g.n + (g.hj ? ' <small>' + g.hj + '</small>' : '') + '</div><div class="gs">';
  S.forEach((s, i) => { if (s.key === k) html += '<button data-i="' + (i + 1) + '">' + (i + 1) + '. ' + s.label + '</button>' }); html += '</div>' });
$('list').innerHTML = html;
function show(n) {
  cur = Math.max(0, Math.min(N, n)); sl.value = cur; $('cn').textContent = cur + ' / ' + N;
  document.querySelectorAll('#list button').forEach(b => { const on = +b.dataset.i === cur; b.classList.toggle('on', on && !intro); if (on && !intro) b.scrollIntoView({ block: 'nearest' }) });
  const s = S[cur - 1];
  if (!s || intro) { $('info').innerHTML = '<h2>자격루 조립 순서</h2><div class="d">누대와 파수호(물 보내는 그릇) → 수수호(물 받는 그릇) → 부자·살대 → 방목과 동판 → 구슬 길 → 시보장치 상자 → 동통·숟가락 기·철환 → 원주 → 평륜과 12신 → 누각과 종·북·징 → 인형 순서로 ' + N + '단계에 걸쳐 쌓아 올립니다. 모든 부재는 따로따로 만들어져 있어 Ctrl(⌘)+끌기로 하나씩 떼어 볼 수 있습니다.</div>'; return }
  const g = G[s.key]; const cnt = s.members.length;
  $('info').innerHTML = '<div class="gn">' + g.n + (g.hj ? ' ' + g.hj : '') + '</div><h2>' + cur + '. ' + s.label + (cnt > 1 ? ' <small>×' + cnt + '</small>' : '') + '</h2><div class="d">' + g.desc + '</div><div class="m">치수: ' + g.dim + '</div>';
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
$('edg').onchange = () => { edgeOn = $('edg').checked; dirty = true }; let edgeOn = true;
function setMode(m) {
  mode = m; $('tAsm').classList.toggle('on', m === 'asm'); $('tRun').classList.toggle('on', m === 'run');
  ['asmbox', 'info', 'list'].forEach(id => $(id).hidden = m !== 'asm'); ['runbox', 'runinfo'].forEach(id => $(id).hidden = m !== 'run'); $('now').hidden = m !== 'run';
  if (m === 'asm') { anim = null; running = false; updPlay(); intro = true; show(N); waterG.visible = false } else { stop(); viewMode = 'all'; cur = N; waterG.visible = true }
  dirty = true;
}
$('tAsm').onclick = () => setMode('asm'); $('tRun').onclick = () => setMode('run');

// ---------- 작동 시뮬레이션 ----------
let simH = 12.9, simDay = 0, running = true, anim = null, follow = false, ready = false;
const absH = () => simDay * 24 + simH;
const AB = 'AB', VNAME = ['앞(남)', '뒤(북)'];
const jsel = $('jg'); JEOLGI.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n + (i === 0 ? ' (3월 하순)' : i === 6 ? ' (6월 하순)' : i === 12 ? ' (9월 하순)' : i === 18 ? ' (12월 하순)' : ''); jsel.appendChild(o) });
jsel.onchange = () => { jeolgi = +jsel.value; anim = null; rebuildSeasonal(); drawGraph(true) };
const wc = w => (w[0] + w[1]) / 2, D2R = Math.PI / 180;
const evOf = (t, k) => SM.runEvents(jeolgi).filter(e => t === 's' ? e.kind === 's' : e.kind !== 's')[k];
const sbRest = (v, t, k) => { const c = VS[v], p = PL[t]; return [c.x + p.u, c.y + p.vc, SM.holeZ(evOf(t, k).rise)] };
const levCfg = (t, k) => t === 's' ? LV.s : (k % 5 === 0 ? LV.g : LV.j);
const hdA = (t, k) => dOf(holeX(TUBE[t], k)), dS = dOf(RU.xs);
function sbOnSpoon(t, k, a) { const c = levCfg(t, k), dy = c.yh - c.yp, dz = 2.5 + SB.r, r = a * D2R; return cw(hdA(t, k), c.yp + dy * Math.cos(r) - dz * Math.sin(r), LV.h + dy * Math.sin(r) + dz * Math.cos(r)) }
const ORD = {}; const ordUpd = () => { SM.runEvents(jeolgi).slice().sort((a, b) => a.tau - b.tau).forEach((e, i) => ORD[(e.kind === 's' ? 's' : 'n') + e.i] = i) };
const sbBox = n => [SBOX.x + (n % 3 - 1) * 17, SBOX.y + (Math.floor(n / 3) % 4 - 1.5) * 16, SBOX.z - 37 + 8 + Math.floor(n / 12) * 15];
const ibRest = (t, k) => export_prof.ibRest(t, k);
const holdPos = a => { const dy = HM.yN - 22 - HM.yp, r = a * D2R; return [HM.x, HM.yp + dy * Math.cos(r), HM.zp + dy * Math.sin(r) + (HM.t / 2) / Math.cos(r) + IB.r] };
const binPos = (t, i) => t === 's' ? [BIN.s.x + (i % 4 - 1.5) * 46, BIN.s.y + (Math.floor(i / 4) % 4 - 1.5) * 46, 42.5] : [BIN.n.x + (i % 5 - 2) * 50, BIN.n.y + (Math.floor(i / 5) % 5 - 2) * 50, 42.5];
const stopG = n => [TR(n).x, YG, TR(n).z - 175 + IB.r + 1];
const stopJ = L => [TR(L).x, YJ, TR(L).z - 175 + IB.r + 1];
const poleOff = a => { const dy = WH.poleY - HM.yp, r = a * D2R; return [0, dy * Math.cos(r) - dy, dy * Math.sin(r)] };
const HMA = HM.tilt; const poleRel = a => { const p = poleOff(a), q = poleOff(HMA); return [0, 0, p[2] - q[2]] };   // 모델은 구슬이 없는 상태(+기울기)로 저장   // 횡목 기울기(도): +는 북쪽 끝이 올라감(구슬 없음), -는 북쪽 끝이 눌림
function basePose(h, v) {
  ordUpd();
  const d = SM.doneAt(jeolgi, h), rise = SM.riseAt(h), P = {};
  P['rod' + AB[v]] = { off: [0, 0, rise] }; P['rod' + AB[1 - v]] = { off: [0, 0, 0] };
  for (let w = 0; w < 2; w++) {
    for (let k = 0; k < 12; k++) { const dn = w === v && d.s.has(k); P['la' + AB[w] + 's_' + k] = { ang: dn ? -70 : 0 }; P['sb' + AB[w] + 's_' + k] = { pos: dn ? sbBox(ORD['s' + k]) : sbRest(w, 's', k) } }
    for (let k = 0; k < 25; k++) { const dn = w === v && d.n.has(k); P['la' + AB[w] + 'n_' + k] = { ang: dn ? 70 : 0 }; P['sb' + AB[w] + 'n_' + k] = { pos: dn ? sbBox(ORD['n' + k]) : sbRest(w, 'n', k) } }
  }
  const lastS = d.s.size ? Math.max(...d.s) : -1;
  for (let k = 0; k < 12; k++) { const dn = d.s.has(k); P['lev_s_' + k] = { ang: dn ? LV.s.ang : 0 }; P['ib_s_' + k] = { pos: !dn ? ibRest('s', k) : k === lastS ? holdPos(-HMA) : binPos('s', k) } }
  P.ib_hold = { pos: lastS < 0 ? holdPos(-HMA) : binPos('s', 12) };
  for (let k = 0; k < 25; k++) { const dn = d.n.has(k); P['lev_n_' + k] = { ang: dn ? levCfg('n', k).ang : 0 };
    let pos = ibRest('n', k); if (dn) { const g = Math.floor(k / 5), p = k % 5 + 1; pos = p === 1 ? stopG(g) : (p === 5 || d.n.has(5 * g + 4)) ? binPos('n', k) : stopJ(p - 1) } P['ib_n_' + k] = { pos } }
  P.hm = { ang: -2 * HMA }; P.pole = { off: poleRel(-HMA) };
  const c = SM.timeLabel(jeolgi, h).si; P.wheel = { ang: -30 * c }; for (let k = 0; k < 12; k++) P['doll' + k] = { ang: -30 * c, off: [0, 0, k === c ? WH.lift : 0] };
  return { P, d, rise };
}
// ---- 사건 연출(실시간 초 단위 타임라인) ----
const GRAV = 9810 * .55, PRE = 4.5;
const dst = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
function buildAnim(e, v) {
  const t = e.kind === 's' ? 's' : 'n', k = e.i, c = VS[v], p = PL[t];
  const A = { e, v, trk: {}, rot: [], off: [], snd: [], notes: [] }; let tt = PRE;
  A.notes.push({ t: 0, foc: 'water', title: '① 물이 차올라 잣대가 떠오름', txt: `소파수호에서 일정한 양의 물이 ${VNAME[v]} 수수호로 흘러들어 물높이가 1시간에 ${RATE.toFixed(1)}mm씩 오릅니다. 부표와 잣대가 함께 떠올라, 잣대 머리의 젓가락 모양 가로쇠가 곧 ${e.kind === 's' ? '왼쪽(12시)' : '오른쪽(경점)'} 동판의 ${e.i + 1}번째 걸쇠에 닿습니다. (화면에서는 1시간을 몇 초로 줄여 보여 줍니다)` });
  const K = id => A.trk[id] || (A.trk[id] = []);
  const at = (id, pos) => K(id).push({ t: tt, p: pos });
  const mv = (id, pos, sp = 700, fall = false) => { const L = K(id), a = L[L.length - 1].p, dd = dst(a, pos); tt += fall ? Math.max(.1, Math.sqrt(2 * dd / GRAV)) : Math.max(.06, dd / sp); L.push({ t: tt, p: pos, fall }) };
  const note = (txt, foc, title) => A.notes.push({ t: tt, txt, foc, title });
  const rot = (id, a0, a1, dur, t0 = tt) => A.rot.push({ id, t0, t1: t0 + dur, a0, a1 });
  const pulse = (id, a1, dur = .4, t0 = tt) => A.rot.push({ id, t0, t1: t0 + dur, a0: 0, a1, pulse: true });
  const off = (id, f, dur, t0 = tt) => A.off.push({ id, t0, t1: t0 + dur, f });
  const strike = (arm, link, s) => { pulse('arm_' + arm, ARM.ang, .42); off(link, u => [0, 0, ARM.lift * Math.sin(Math.PI * u)], .42); A.snd.push({ t: tt + .21, s }); tt += .55 };
  const sid = 'sb' + AB[v] + t + '_' + k, iid = 'ib_' + t + '_' + k; A.sid = sid; A.iid = iid;
  const P0 = sbRest(v, t, k), uCh = t === 's' ? -33 : 33;
  // ① 잣대 → 걸쇠 → 작은 구슬
  at(sid, P0);
  note(`${VNAME[v]} 수수호의 물이 ${Math.round(e.rise)}mm 차올라 잣대 머리의 가로쇠가 ${t === 's' ? '왼쪽(12시)' : '오른쪽(경점)'} 동판의 ${k + 1}번째 걸쇠를 밀어 올립니다. 걸쇠 위의 작은 구리구슬이 구멍을 지나 동판 ${t === 's' ? '뒤' : '앞'}의 통로(隔)로 떨어집니다. 물높이(아날로그)가 구슬 하나(디지털 신호)로 바뀌는 순간입니다.`, 'latch', '② 잣대가 걸쇠를 밀어 작은 구슬이 떨어짐');
  rot('la' + AB[v] + t + '_' + k, 0, t === 's' ? -70 : 70, .45); tt += .5; at(sid, P0);
  mv(sid, [c.x + uCh, c.y + p.vc, P0[2]], 120); mv(sid, [c.x + uCh, c.y + p.vc, BM.z0 + 30], 0, true);
  note('구슬은 방목 안 통로를 따라 내려와 바닥의 출구로 빠져나가 연잎 모양 구슬받이에 떨어진 뒤, 광판 위 구리 홈을 굴러 동쪽 칸 가운데 층 위의 ' + (t === 's' ? '12시 동통' : '경점 동통') + '으로 들어갑니다. 두 방목에서 오는 홈은 X자로 엇갈려 같은 동통으로 모입니다. 동통 안에서는 아직 열려 있는 첫 구멍(' + (k + 1) + '번째)으로 떨어집니다. 앞의 구멍들은 먼저 떨어진 구슬이 걸림판을 젖혀 이미 닫혀 있습니다.', 'route', '③ 작은 구슬이 광판 홈을 굴러 동통 구멍으로');
  mv(sid, [c.x + 70, c.y + p.vc, BM.z0 + 25], 300);
  export_prof.gpath(c, t).forEach(q => mv(sid, q, 900)); mv(sid, tbBall(TUBE[t], 0), 600); mv(sid, tbBall(TUBE[t], holeD(TUBE[t], k)), 900);
  mv(sid, sbOnSpoon(t, k, 0), 0, true);
  // ④ 횡기 → 쇠구슬
  const tp = t === 's' ? 's' : (k % 5 === 0 ? 'g' : 'j'), lane = { s: '①', g: '③', j: '④' }[tp];
  note(`작은 구슬이 횡기(橫機)의 머리를 누르자 반대쪽 손잡이가 들립니다. 손잡이에 막혀 있던 통로 ${lane}의 쇠구슬(지름 약 47mm)이 풀려나고, 들린 손잡이는 그대로 멈춰 뒤의 쇠구슬이 지나갈 길을 막지 않습니다. 가벼운 구슬로 무거운 구슬을 움직이는 「기계식 증폭」입니다. 작은 구슬은 통로 ②로 떨어져 서쪽 끝의 상자에 모입니다.`, 'spoon', '④ 횡기 손잡이가 들려 쇠구슬이 풀려남');
  const la = levCfg(t, k).ang; rot('lev_' + t + '_' + k, 0, la, .35); { const t0 = tt; for (let i = 1; i <= 6; i++) K(sid).push({ t: t0 + .35 * i / 6, p: sbOnSpoon(t, k, la * ease(i / 6)) }) } tt += .4; at(sid, sbOnSpoon(t, k, la)); const tS = tt; mv(sid, cw(hdA(t, k), CH.h, SB.r), 0, true); mv(sid, cw(dS + 17, CH.h, SB.r), 500); mv(sid, sbBox(ORD[(t === 's' ? 's' : 'n') + k]), 0, true); tt = tS;
  at(iid, ibRest(t, k)); mv(iid, cw(dS + 4, CH[tp], IB.r), 450);
  note(`쇠구슬이 통로 ${lane}를 따라 입구(서쪽) 쪽으로 굴러가, 궤의 모서리에서 한 단계(약 20cm) 떨어진 뒤 홈통을 타고 ${tp === 's' ? '시기(12시 타종기구)' : '경점기'}로 굴러갑니다.`, 'roll', '⑤ 쇠구슬이 통로를 굴러 시보장치로');
  mv(iid, export_prof.LP[tp][0], 0, true); export_prof.LP[tp].slice(1).forEach(q => mv(iid, q, 1000));
  if (tp === 's') {
    const prevId = e.i === 0 ? 'ib_hold' : 'ib_s_' + (e.i - 1), prevBin = e.i === 0 ? 12 : e.i - 1, cp = (e.si + 11) % 12;
    mv(iid, [S12.tubeX, S12.tubeY, S12.spoonZ + 6 + IB.r], 0, true);
    note('쇠구슬이 짧은 수직 원통으로 떨어져 출구를 가로막은 숟가락의 둥근 머리를 칩니다. 숟가락 꼬리가 들리며 둥근 기둥 속의 들림막대가 튀어 올라, 위층 마루 구멍을 지나 사시신의 팔꿈치 홈을 밀어 올립니다. 팔은 손과 팔꿈치 가운데의 축을 중심으로 돌아, 손에 쥔 채가 앞으로 내려와 종을 한 번 친 뒤 곧바로 제자리로 돌아갑니다.', 'fig_s', '⑥ 숟가락 → 들림막대 → 팔꿈치: 종 1번');
    pulse('sp12', 20, .5); strike('s', 'link_s', 'bell');
    note(`숟가락과 쇠줄로 이어진 작은 판이 열려, 횡목 북쪽 끝을 누르고 있던 앞 시의 쇠구슬이 빠져나갑니다. 횡목의 남쪽 끝과 그 위의 둥근 나무가 내려가, 창문에 보이던 ${SI[cp]}시 신을 받치던 힘이 사라집니다.`, 'wheel', '⑦ 앞 시의 구슬이 빠지고 둥근 나무가 내려감');
    rot('pan12', 0, 60, .3); const hp = holdPos(-HMA); at(prevId, hp); tt += .3;
    mv(prevId, [HM.x, HM.yN + 45, hp[2] - 5], 500); mv(prevId, binPos('s', prevBin), 0, true); const tFall = tt;
    tt -= .6; rot('hm', -2 * HMA, 0, .7); off('pole', u => poleRel(-HMA + 2 * HMA * ease(u)), .7); off('doll' + cp, u => [0, 0, WH.lift + (RAMP.dollOff(0) - WH.lift) * ease(u)], .7);
    tt = Math.max(tt + .7, tFall); rot('pan12', 60, 0, .3, tt - .2);
    note(`둥근 나무가 내려가자 창문에 보이던 ${SI[cp]}시 신이 제 무게로 내려오다가, 평륜 앞에 비스듬히 단 구리판에 막힙니다. 신의 발밑 쇠바퀴가 구리판을 타고 비스듬히 굴러 내려가는 동안, 신이 끼워진 쇠막대를 통해 평륜 전체가 한 칸(30°) 돕니다. 그 결과 ${SI[e.si]}시 신이 둥근 나무 위(올라갈 자리)로 옮겨 옵니다. ─ 물이나 다른 힘 없이 신의 무게만으로 바퀴를 돌리는 장치입니다.`, 'wheel', '⑧ 신이 구리판을 굴러 내려가며 평륜이 30° 돎');
    const a0 = -30 * cp; ['wheel', ...Array.from({ length: 12 }, (_, q) => 'doll' + q)].forEach(id => rot(id, a0, a0 - 30, 1.6)); off('doll' + cp, u => [0, 0, RAMP.dollOff(ease(u))], 1.6); tt += 1.7;
    note(`숟가락을 친 쇠구슬은 둥근 기둥에 붙은 통으로 떨어져 횡목의 북쪽 끝을 누릅니다. 횡목 남쪽 끝의 핀이 둥근 나무 아래 갈래의 홈을 밀어 둥근 나무가 올라가 ${SI[e.si]}시 신의 발을 떠받쳐, 신의 발밑 쇠바퀴가 구리판을 밀어 올려 열고 지나가면 구리판은 제 무게로 다시 닫히고, 신은 가운데 층으로 올라와 시패 「${SIH[e.si]}」를 보여 줍니다. 쇠구슬은 다음 시까지 횡목 위에 머뭅니다.`, 'wheel', '⑨ 횡목을 눌러 다음 신이 올라옴');
    mv(iid, holdPos(HMA), 0, true);
    rot('hm', 0, -2 * HMA, .9); off('pole', u => poleRel(HMA - 2 * HMA * ease(u)), .9); off('doll' + e.si, u => [0, 0, WH.lift * ease(u)], .9); rot('flap', 0, RAMP.open, .22, tt + .22); rot('flap', RAMP.open, 0, .2, tt + .5);
    off(iid, u => { const a = holdPos(HMA - 2 * HMA * ease(u)), b = holdPos(HMA); return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }, .9); tt += 1.1;
  } else if (tp === 'g') {
    const n = e.gyeong;
    mv(iid, [TL(0).x, GK.y, TL(0).z + 25], 0, true);
    note(`${n}경입니다. 경을 알리는 쇠구슬이 짧은 통을 지나 왼쪽 네모 기둥의 비스듬한 통(연잎 → 용의 입)을 차례로 내려가며, 사이사이의 숟가락을 ${n}개 누릅니다. 숟가락의 꼬리가 들릴 때마다 왼쪽 둥근 기둥(좌원주) 속 들림막대가 올라가 사경신의 팔꿈치를 밀어, 채가 북을 ${n}번 칩니다. 앞의 경 구슬들이 먼저 지나간 길은 닫혀 있어, 경이 늘어날수록 구슬이 더 아래까지 내려갑니다.`, 'fig_g', '⑥ 숟가락을 경의 수만큼 지나며 북을 침');
    for (let q = 0; q < n; q++) {
      pulse('spL_' + q, 12, .35); strike('g', 'link_g', 'drum');
      mv(iid, [TL(q).x, GK.y, TL(q).z - 31], 0, true);
      if (q < n - 1) { mv(iid, [TL(q + 1).x, GK.y, TL(q + 1).z + 40], 600); mv(iid, [TL(q + 1).x, GK.y, TL(q + 1).z + 25], 0, true) }
    }
    note('북을 친 쇠구슬은 가로통을 건너 오른쪽 수직 통으로 들어가 초점 장치(숟가락)를 누릅니다. 우원주 속 들림막대가 올라가 사점신의 팔꿈치를 밀어 징을 한 번 치고(초점), 구슬은 통 속에 멈춥니다. 다섯 경이 모두 끝난 뒤에야 빗장을 뽑아 구슬을 꺼냅니다.', 'fig_j', '⑦ 가로통을 건너 초점 징 1번, 멈춤');
    export_prof.hz(n - 1).forEach(q => mv(iid, q, 600));
    mv(iid, [TR(n - 1).x, YG, TR(n - 1).z - 120 + 26], 0, true); pulse('spC_' + (n - 1), 12, .35); strike('j', 'link_j', 'gong');
    mv(iid, stopG(n - 1), 0, true); tt += .3;
  } else {
    const pj = e.jeom, g = e.gyeong - 1;
    mv(iid, [TR(0).x, GK.y, TR(0).z + 25], 0, true);
    note(`${e.gyeong}경 ${pj}점입니다. 점을 알리는 쇠구슬이 오른쪽 네모 기둥의 비스듬한 통을 내려가며 숟가락을 ${pj}개 누를 때마다 우원주 속 들림막대가 사점신의 팔꿈치를 밀어 올려 징을 ${pj}번 칩니다. 먼저 온 점 구슬이 윗단의 멈춤통에 머물러 있어 다음 구슬은 한 단 더 내려가므로, 점마다 치는 수가 하나씩 늘어납니다.`, 'fig_j', '⑥ 숟가락을 점의 수만큼 지나며 징을 침');
    for (let q = 0; q < pj; q++) {
      pulse('spR_' + q, 12, .35); strike('j', 'link_j', 'gong');
      if (q < pj - 1) { mv(iid, [TR(q).x, GK.y, TR(q).z - 31], 0, true); mv(iid, [TR(q + 1).x, GK.y, TR(q + 1).z + 40], 600); mv(iid, [TR(q + 1).x, GK.y, TR(q + 1).z + 25], 0, true) }
    }
    if (pj < 5) { mv(iid, [TR(pj - 1).x, GK.y, TR(pj - 1).z - 31], 0, true); mv(iid, [TR(pj - 1).x, YJ, TR(pj - 1).z - 60], 400); mv(iid, stopJ(pj - 1), 0, true); tt += .3 }
    else {
      note('5점 구슬은 맨 아래 장치를 움직입니다. 장치에 이어진 쇠줄이 차례로 빗장을 뽑아, 멈춰 있던 2·3·4점 구슬과 함께 한꺼번에 아래로 떨어집니다. 이렇게 해서 다음 경에도 같은 순서로 점을 칠 수 있게 됩니다.', 'x', '⑦ 빗장이 풀려 2·3·4·5점 구슬이 떨어짐');
      mv(iid, [TR(4).x, GK.y, TR(4).z - 75 + 25], 0, true); pulse('spLow', 14, .4); tt += .25;
      const t0 = tt; [1, 2, 3].forEach(L => { const id = 'ib_n_' + (5 * g + L); tt = t0; at(id, stopJ(L)); mv(id, binPos('n', 5 * g + L), 0, true) });
      tt = t0; mv(iid, binPos('n', k), 0, true); tt += .5;
    }
  }
  A.dur = tt + .3; return A;
}
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
function kfAt(L, tau) { if (!L.length) return null; if (tau <= L[0].t) return L[0].p; for (let i = 1; i < L.length; i++) if (tau <= L[i].t) { const a = L[i - 1], b = L[i]; let u = (tau - a.t) / Math.max(1e-6, b.t - a.t); if (b.fall) u = u * u; return lerp3(a.p, b.p, u) } return L[L.length - 1].p }
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
function animPose(A, tau, P) {
  for (const id in A.trk) { const L = A.trk[id]; if (tau >= L[0].t || id === A.sid) P[id] = { pos: kfAt(L, tau) } }
  for (const r of A.rot) if (tau >= r.t0) { const u = Math.min(1, (tau - r.t0) / (r.t1 - r.t0)); const a = r.pulse ? r.a1 * Math.sin(Math.PI * u) : r.a0 + (r.a1 - r.a0) * ease(u); P[r.id] = { ...(P[r.id] || {}), ang: a } }
  if (A.wroll && tau >= A.wroll.t0) { const w = A.wroll, u = Math.min(1, (tau - w.t0) / (w.t1 - w.t0)), a = w.a0 - 30 * w.rl(u); for (const id of ['wheel', ...Array.from({ length: 12 }, (_, q) => 'doll' + q)]) P[id] = { ...(P[id] || {}), ang: a } }
  for (const o of A.off) if (tau >= o.t0) { const u = Math.min(1, (tau - o.t0) / (o.t1 - o.t0)); const d = o.f(u);
    const q = P[o.id] || {}; if (q.pos) P[o.id] = { pos: [q.pos[0] + d[0], q.pos[1] + d[1], q.pos[2] + d[2]] }; else P[o.id] = { ...q, off: d } }
  let nt = null; for (const n of A.notes) if (tau >= n.t) nt = n; return nt;
}
// ---- 소리 (WebAudio 합성) ----
let AC = null, master = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .55; master.connect(AC.destination) } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC }
addEventListener('pointerdown', () => audio(), { once: true });
function play(kind) {
  if (!$('snd').checked) return; const ac = audio(); if (!ac) return; const t0 = ac.currentTime;
  const tone = (f, g, d, type = 'sine', t = t0) => { const o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + .005); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a); a.connect(master); o.start(t); o.stop(t + d + .05); return o };
  if (kind === 'bell') { [[196, .5, 4.5], [392.8, .26, 3.2], [529, .2, 2.4], [663, .14, 1.8], [1027, .08, 1.1]].forEach(([f, g, d]) => tone(f, g, d)); tone(198.5, .25, 4.5) }
  else if (kind === 'drum') { const o = tone(90, .9, .55); o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + .4);
    const b = ac.createBuffer(1, ac.sampleRate * .2, ac.sampleRate), dd = b.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dd.length, 3);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = .5; s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t0) }
  else if (kind === 'gong') { [[220, .35, 3.6], [223.5, .3, 3.6], [341, .14, 2.4], [512, .1, 1.6], [745, .05, 1]].forEach(([f, g, d]) => tone(f, g, d, 'sine')); tone(660, .06, .3, 'triangle') }
}
// ---- 시간 흐름 ----
const evTimes = () => SM.runEvents(jeolgi).map(e => ({ e, hh: e.h })).sort((a, b) => a.hh - b.hh);
function nextEv(h) { const L = evTimes(); for (const x of L) if (x.hh > h + 1e-9) return x; return L[0] }
function startAnim(x) { if (x.hh < simH - 1e-9) simDay++; simH = x.hh; const v = SM.activeVessel(absH() - 1e-6); anim = { A: buildAnim(x.e, v), tau: 0, x, v, played: new Set(), stage: 0, hold: 0, loops: 0 }; if (!$('stepm').checked && anim.A.notes.length > 1) { anim.stage = 1; anim.tau = anim.A.notes[1].t } bc.reset = true; bc.id = null; buildPaths(); stageCam(); updStepUI(); dirty = true }
const stageB = (A, i) => [A.notes[i].t, i + 1 < A.notes.length ? A.notes[i + 1].t : A.dur];
function setStage(i) { if (!anim) return; if (i >= anim.A.notes.length) { finishAnim(); return } anim.stage = Math.max(0, i); anim.tau = stageB(anim.A, anim.stage)[0]; anim.hold = 0; anim.loops = 0; anim.played = new Set(); stageCam(); updStepUI(); dirty = true }
function updStepUI() { const on = !!anim; $('sprev').disabled = !on || anim.stage === 0; $('snext').disabled = !on;
  if (!on) { $('sinfo').textContent = '다음 시보가 시작되면 단계가 나옵니다'; $('snext').textContent = '다음 단계 ▶'; return }
  const n = anim.A.notes.length; $('snext').textContent = anim.stage === n - 1 ? '시보 끝 ▶' : '다음 단계 ▶';
  $('sinfo').textContent = `단계 ${anim.stage + 1} / ${n}` + ($('stepm').checked ? ' · 반복 재생 중' : '') }
$('snext').onclick = () => { audio(); if (anim) setStage(anim.stage + 1) }; $('sprev').onclick = () => { if (anim) setStage(anim.stage - 1) };
$('stepm').onchange = () => { $('stepbar').hidden = !$('stepm').checked; updStepUI() }; $('stepbar').hidden = !$('stepm').checked;
function goCamTo(t, a, e, d) { camAnim = { t0: performance.now(), from: [TGT.clone(), az, el, dist], to: [toW(...t), a, e, d] } }
function stageCam() { if (!anim || !$('autocam').checked || ballCam) return; const f = anim.A.notes[anim.stage].foc, c = VS[anim.v], e = anim.x.e, t = e.kind === 's' ? 's' : 'n';
  const sp = cw(hdA(t, e.i), CH.h, 60);
  const C = { water: [[c.x, c.y, 1900], .95, .1, 4600], latch: [[c.x, c.y, SM.holeZ(e.rise)], 1.32, .12, 1000], route: [[750, 0, 2500], .25, .62, 3000], spoon: [sp, .3, .42, 1000],
    roll: [[2500, 100, 2250], .3, .32, 2700], fig_s: [[2450, 560, 2750], .25, .1, 3000], wheel: [[WH.x, WH.y - 250, 1250], .22, .12, 2500],
    fig_g: [[2980, 560, 2650], .15, .08, 3300], fig_j: [[3420, 560, 2600], .1, .08, 3400], x: [[3520, 420, 1300], .12, .08, 2100] }[f];
  if (C) goCamTo(...C) }
// ---- 구슬 강조: 빛무리·지나갈 길·이름표 ----
const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(.25, 'rgba(255,190,60,.85)'); g.addColorStop(.6, 'rgba(255,140,20,.25)'); g.addColorStop(1, 'rgba(255,120,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })();
const halos = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true })); s.renderOrder = 20; s.visible = false; root.add(s); return s });
const pathG = new THREE.Group(); root.add(pathG);
const tags = Array.from({ length: 6 }, () => { const d = document.createElement('div'); d.className = 'btag'; d.hidden = true; cv.appendChild(d); return d });
function buildPaths() { pathG.clear(); if (!anim) return; for (const id in anim.A.trk) { const L = anim.A.trk[id]; if (L.length < 2) continue;
  const g = new THREE.BufferGeometry().setFromPoints(L.map(k => new THREE.Vector3(...k.p))); const isS = id.startsWith('sb');
  const ln = new THREE.Line(g, new THREE.LineDashedMaterial({ color: isS ? 0xffd040 : 0xff7a2a, dashSize: isS ? 25 : 45, gapSize: isS ? 15 : 25, depthTest: false, transparent: true, opacity: .85 })); ln.computeLineDistances(); ln.renderOrder = 19; pathG.add(ln) } }
const tagName = id => id.startsWith('sb') ? '작은 구리구슬' : id === 'ib_hold' || (anim && id !== anim.A.iid && id.startsWith('ib_s')) ? '앞 시의 쇠구슬' : id === anim?.A.iid ? '쇠구슬' : '멈춰 있던 점 구슬';
const pv = new THREE.Vector3();
function updGlow(P) { const on = $('glow').checked && mode === 'run' && anim; pathG.visible = !!on; let n = 0;
  if (on) { const w = cv.clientWidth, h = cv.clientHeight, pul = 1 + .18 * Math.sin(performance.now() / 160);
    for (const id in anim.A.trk) { const L = anim.A.trk[id]; if (!(anim.tau >= L[0].t - .05 || id === anim.A.sid) || !P[id] || !P[id].pos || n >= halos.length) continue;
      const p = P[id].pos, hs = halos[n], tg = tags[n]; hs.visible = true; hs.position.set(...p); const sz = (id.startsWith('sb') ? 120 : 230) * pul * (ballCam ? .45 : 1); hs.scale.set(sz, sz, 1);
      pv.set(...p); root.localToWorld(pv); pv.project(cam); if (pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1) { tg.hidden = false; tg.textContent = tagName(id); tg.className = 'btag' + (id.startsWith('sb') ? '' : ' ib'); tg.style.left = ((pv.x + 1) / 2 * w) + 'px'; tg.style.top = ((1 - pv.y) / 2 * h) + 'px' } else tg.hidden = true; n++ } }
  for (let i = n; i < halos.length; i++) { halos[i].visible = false; tags[i].hidden = true } }
function finishAnim() {
  const e = anim.x.e; const li = document.createElement('li');
  li.textContent = SM.fmtH(anim.x.hh) + '  ' + (e.kind === 's' ? `${SI[e.si]}시(${SIH[e.si]}) — 종 1번, ${SI[e.si]}시 신이 시패를 들고 올라옴` : e.kind === 'g' ? `${e.gyeong}경 초점 — 북 ${e.gyeong}번 · 징 1번` : `${e.gyeong}경 ${e.jeom}점 — 징 ${e.jeom}번`);
  $('log').prepend(li); while ($('log').children.length > 40) $('log').lastChild.remove();
  simH = anim.x.hh + 1e-5; anim = null; nowNote = null; pathG.clear(); updStepUI();
}
let nowNote = null;
function updPlay() { $('rpl').textContent = running ? '⏸ 멈춤' : '▶ 흐르게' }
$('rpl').onclick = () => { running = !running; updPlay(); audio() };
$('rnx').onclick = () => { audio(); if (anim) { finishAnim(); return } const x = nextEv(simH); let h = x.hh - 20 / 3600; if (h < simH) { if (h < 0) { h += 24 } else simDay++ } simH = h; running = true; updPlay() };
const tsl = $('tsl'); let tslDrag = false;
tsl.addEventListener('pointerdown', () => tslDrag = true); addEventListener('pointerup', () => tslDrag = false);
tsl.oninput = () => { anim = null; simH = +tsl.value / 60; dirty = true };
document.querySelectorAll('#cams button').forEach(b => b.onclick = () => goCam(b.dataset.c));
$('fol').onchange = () => { follow = $('fol').checked; if (follow) setBallCam(false) };
// ---- 구슬 시선: 움직이는 구슬 뒤에서 구르는 방향을 바라봄 ----
let ballCam = false; const bc = { id: null, prev: {}, dir: new THREE.Vector3(1, 0, 0), hd: new THREE.Vector3(1, 0, 0), D: 420, H: 150, reset: true, pos: null };
function setBallCam(on) { ballCam = on; bc.reset = true; $('bcb').classList.toggle('on', on); $('bcb').setAttribute('aria-pressed', on); if (on) { follow = false; $('fol').checked = false; camAnim = null; if (!anim) goCamTo(...PRESET.rod) } dirty = true }
function updBallCam(P) {
  if (!ballCam || !anim) { bc.prev = {}; return }
  let best = null, bd = 0; const cur = {};
  for (const id in anim.A.trk) { const p = P[id] && P[id].pos; if (!p) continue; cur[id] = p; const q = bc.prev[id]; if (!q) continue; const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d > 400) continue; if (d > bd) { bd = d; best = id } }
  const jumped = bc.id && cur[bc.id] && bc.prev[bc.id] && Math.hypot(...cur[bc.id].map((v, i) => v - bc.prev[bc.id][i])) > 400;
  if (best && bd > .3 && best !== bc.id) { bc.id = best; bc.reset = true }
  if (jumped) bc.reset = true;
  if (!bc.id || !cur[bc.id]) { bc.id = best || (cur[anim.A.sid] ? anim.A.sid : null); bc.reset = true; if (!bc.id) { bc.prev = cur; return } }
  const p = cur[bc.id], q = bc.prev[bc.id]; bc.prev = cur;
  if (q && !jumped) { const v = new THREE.Vector3(p[0] - q[0], p[1] - q[1], p[2] - q[2]), L = v.length();
    if (L > .3) { v.divideScalar(L); bc.dir.lerp(v, bc.reset ? 1 : .08).normalize(); const h = new THREE.Vector3(v.x, v.y, 0), hl = h.length(); if (hl > .35) bc.hd.lerp(h.divideScalar(hl), bc.reset ? 1 : .08).normalize() } }
  // 모델 좌표(z 위)에서 카메라 위치: 구슬 뒤(진행 반대쪽) + 조금 위. 거의 수직으로 떨어질 때는 수평 진행 방향을 씀
  const vert = Math.abs(bc.dir.z) > .8, back = vert ? bc.hd.clone() : bc.dir.clone();
  const look = new THREE.Vector3(p[0], p[1], p[2]).addScaledVector(bc.dir, bc.D * .45);
  const eye = new THREE.Vector3(p[0], p[1], p[2]).addScaledVector(back, -bc.D).add(new THREE.Vector3(0, 0, bc.H + (vert ? bc.D * .5 : 0)));
  const L3 = toW(look.x, look.y, look.z), E3 = toW(eye.x, eye.y, eye.z);
  if (bc.reset || !bc.pos) { bc.pos = E3.clone(); bc.look = L3.clone(); bc.reset = false } else { bc.pos.lerp(E3, .18); bc.look.lerp(L3, .25) }
  const d = bc.pos.clone().sub(bc.look); TGT.copy(bc.look); dist = Math.max(60, d.length()); el = Math.asin(Math.max(-1, Math.min(1, d.y / dist))); az = Math.atan2(d.x, d.z); setCam();
}
function stepSim(dt) {
  if (mode !== 'run' || !ready) return;
  if (anim) {
    const sp = +$('aspd').value, A = anim.A, step = $('stepm').checked;
    if (step) {
      const [a, b] = stageB(A, anim.stage);
      if (anim.hold > 0) { anim.hold -= dt; if (anim.hold <= 0) { anim.tau = a; anim.played = new Set(); anim.loops++ } dirty = true; return }
      anim.tau = Math.min(b, anim.tau + dt * sp); if (anim.tau >= b) anim.hold = 1.2;
    } else {
      anim.tau += dt * sp; let st = 0; A.notes.forEach((n, i) => { if (anim.tau >= n.t) st = i }); if (st !== anim.stage) { anim.stage = st; stageCam(); updStepUI() }
      if (anim.tau >= A.dur) { finishAnim(); dirty = true; return }
    }
    for (const s of A.snd) if (anim.tau >= s.t && !anim.played.has(s)) { anim.played.add(s); if (anim.tau - s.t < .3) play(s.s) }
    dirty = true; return
  }
  if (!running) return;
  const sp = +$('rsp').value, h1 = simH + dt * sp / 3600;
  const L = evTimes(); let hit = null;
  for (const x of L) if (x.hh > simH && x.hh <= h1) { hit = x; break }
  if (!hit && h1 >= 24) { for (const x of L) if (x.hh <= h1 - 24) { hit = x; break } }
  if (hit) { startAnim(hit); return }
  if (h1 >= 24) { simH = h1 - 24; simDay++ } else simH = h1; dirty = true;
}
// ---- 그래프 ----
const gcv = $('graph'); let gLast = -1;
function drawGraph(force) {
  const W = gcv.clientWidth, H = gcv.clientHeight; if (!W) return; const k = Math.round(simH * 60); if (!force && k === gLast) return; gLast = k;
  if (gcv.width !== W * 2) { gcv.width = W * 2; gcv.height = H * 2 } const x = gcv.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.body), fg = cs.getPropertyValue('--mut'), ac = cs.getPropertyValue('--ac'), wt = cs.getPropertyValue('--wt');
  const px = h => 22 + (W - 28) * h / 24, py = r => H - 16 - (H - 24) * r / 2000;
  x.strokeStyle = fg; x.globalAlpha = .35; x.lineWidth = 1; x.beginPath(); x.moveTo(px(0), py(0)); x.lineTo(px(24), py(0)); x.stroke(); x.globalAlpha = 1;
  x.fillStyle = fg; x.font = '10px "Noto Sans KR",sans-serif'; [0, 6, 12, 18, 24].forEach(h => x.fillText(String(h), px(h) - 4, H - 4)); x.fillText('2m', 0, py(2000) + 8); x.fillText('0', 8, py(0) + 3);
  x.setLineDash([2, 3]); x.globalAlpha = .35; for (const e of evTimes()) { x.strokeStyle = e.e.kind === 's' ? wt : '#d08a3a'; x.beginPath(); x.moveTo(px(e.hh), py(0)); x.lineTo(px(e.hh), py(2000)); x.stroke() } x.setLineDash([]); x.globalAlpha = 1;
  x.strokeStyle = wt; x.lineWidth = 2; x.beginPath(); let first = true, prev = 0; for (let h = 0; h <= 24.001; h += .05) { const r = SM.riseAt(h); if (first || r < prev - 50) x.moveTo(px(h), py(r)); else x.lineTo(px(h), py(r)); first = false; prev = r } x.stroke();
  x.strokeStyle = ac; x.lineWidth = 2; x.beginPath(); x.moveTo(px(simH), py(0)); x.lineTo(px(simH), py(2000)); x.stroke();
}
// ---- 출처 ----
$('src').innerHTML = `<details><summary><b>치수와 자료의 출처</b></summary>
<p><b>원전</b> — 「보루각기」(세종실록 16년 7월 1일): 파수호 4 · 수수호 2(번갈아 사용), 수수호 길이 11자 2치 · 지름 1자 8치, 잣대 10자 2치, 방목 길이 11자 4치 · 너비 6치 · 두께 8푼 · 깊이 4치, 왼쪽 동판 너비 2치 · 구멍 12, 오른쪽 동판 너비 2치 5푼 · 구멍 25(12판을 절기마다 교체), 가로쇠 4치 5푼, 광판 위 칸막이 4 · 쇠구슬 12 · 5 · 20, 동통 4자 5치 · 8자 · 지름 1치 5푼, 위층 3신과 짧은 통 · 둥근 기둥 2 · 네모 기둥 2(통 4개씩), 횡목 6자 6치 × 1치 5푼 × 1치 7푼, 둥근 나무 2자 2치, 평륜과 쇠 기둥, 기울어진 구리판. 1자 = 주척 20.7cm(남문현·한영호 1996).</p>
<p><b>해석</b> — 작동 순서와 경점기 구조는 남문현의 그림 3-1 · 3-2 · 3-6 · 3-7을 따랐습니다(경의 수만큼 북, 점의 수만큼 징). 방목은 김종성(2023) 「장영실의 자격루에 있어서 방목의 구조와 작동원리에 대한 새로운 가설」을 따라 단면 6치×6치, 두 동판의 엇갈린 배치, 방목 안 구슬 통로로 만들었습니다(남문현은 방목 양옆의 그릇으로 받는다고 봄). 4번째 파수호를 넘친 물을 받는 폐호로 본 것은 남문현의 해석입니다. 수위 2시간당 16.6cm는 남문현·한영호(1996)의 모의실험 값입니다.</p>
<p><b>복원품</b> — 서준(2007) 「자격루 복원과정과 의의」(『고궁문화』 창간호, 국립고궁박물관): 3층 궤(위층 종·북·징과 3신 / 가운데 층 철환 방출장치 / 아래층 경점기·12신), 광판의 X자 홈, 동통부와 4통로 철환 방출부(횡기 손잡이가 들린 채 멈춤, 통로는 입구 쪽으로 기울어짐), 쇠구슬 지름 약 47mm, 평륜(한 굴대에 위아래 두 바퀴 · 바퀴살 12개씩, 쇠막대마다 지신 인형, 창문 높이의 인형이 자기 무게로 내려가다 평륜 앞 비스듬한 구리판에 가로막혀 발밑 쇠바퀴가 굴러 내리는 동안 평륜 전체가 돎, 교체 3초 이내 — p.116), 3신 팔의 회전축(손과 팔꿈치 가운데)과 원주 속 들림막대(1,700mm), 종틀·북틀·징틀. 3신의 동서 순서는 이 앱의 배치(시·경·점)를 그대로 두었습니다(복원품은 사경신·사점신이 서쪽).</p>
<p><b>평륜이 도는 원리</b> — 「보루각기」: 바퀴 밖 작은 판(1자)에 살짝 기울어진 구리판을 걸쳐 여닫게 하고, 시가 끝나 돌아오는 신의 발끝 쇠바퀴가 구리판을 굴러 내려옴. 서준(2007): 내려오던 신이 평륜 앞 비스듬한 구리판에 가로막혀 쇠바퀴가 판을 굴러 내리는 동안 평륜 전체가 돎, 평륜은 한 굴대의 위·아래 바퀴(바퀴살 12개씩)를 쇠막대로 이음. 남문현(2002) 『장영실과 자격루』 그림(평륜 · 쇠막대 · 보시신 · 다음 시의 신 · 발밑 쇠바퀴 · 구리판 여닫이 · 둥근 나무). 1998년 문화재청 보고서는 기록의 묘사만으로는 평륜이 돌 수 없어 별도 회전 장치가 필요하다고 지적함(경석현, 「한국 근현대 자격루 연구 약사」, 『과학사와 과학유산』 학술대회 자료집, 2022).</p>
<p><b>유물</b> — 1536년 자격루(국보): 대파수호 지름 94 · 높이 71cm, 소파수호 지름 46.5 · 높이 40.5cm.</p>
<p><b>가정값</b> — 누대 · 동쪽 칸 · 광판 크기, 중파수호 · 폐호 크기, 관 지름, 부표, 잣대 단면, 작은 구슬 지름 16(8푼), 쇠구슬 지름 45, 숟가락 · 기둥 · 통 · 인형 크기, 평륜 앞 비스듬한 구리판의 크기 · 기울기(호 34° · 길이 약 280mm · 높이차 106mm · 약 22°, 「보루각기」의 「완만하게 기울여」를 따름), 평륜을 가운데 층 마루에 매단 방식, 수수호를 바꾸는 시각(오정, 정오), 교대 직후 물 깊이 205mm. 경점 시각은 서울(북위 37.57°)의 해돋이 · 해넘이로 혼(해진 뒤 2.5각)부터 신(해뜨기 전 2.5각)까지를 25점으로 나눴습니다(지방 태양시). 세종 때는 《수시력》의 북경 값을 썼습니다.</p></details>`;

// ---------- 그리기 ----------
let last = performance.now(), dirty = true;
const tmpM = new THREE.Matrix4(), tmpR = new THREE.Matrix4(), tmpV = new THREE.Vector3();
function placeAll(P, hotIds) {
  for (const o of ALL) {
    let M = new THREE.Matrix4();
    const p = mode === 'run' && o.mv ? P[o.mv] : null;
    if (p) {
      if (p.pos) M.makeTranslation(p.pos[0] - o.rest[0], p.pos[1] - o.rest[1], p.pos[2] - o.rest[2]);
      else {
        if (p.ang && o.piv) { const pv = o.piv; tmpR.makeRotationAxis(tmpV.set(...o.ax).normalize(), p.ang * Math.PI / 180); M.makeTranslation(pv[0], pv[1], pv[2]).multiply(tmpR).multiply(tmpM.makeTranslation(-pv[0], -pv[1], -pv[2])) }
        if (p.off) M.premultiply(tmpM.makeTranslation(...p.off));
      }
    }
    if (o.off[0] || o.off[1] || o.off[2]) M.premultiply(tmpM.makeTranslation(...o.off));
    o.g.matrix.copy(M); o.g.matrixWorldNeedsUpdate = true;
    o.hot = hotIds && o.mv && hotIds.has(o.mv);
  }
}
let followP = null;
(function loop(t) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (t - last) / 1000); last = t;
  stepSim(dt);
  if (camAnim) { const u = Math.min(1, (performance.now() - camAnim.t0) / 900), e = ease(u); TGT.lerpVectors(camAnim.from[0], camAnim.to[0], e); az = camAnim.from[1] + (camAnim.to[1] - camAnim.from[1]) * e; el = camAnim.from[2] + (camAnim.to[2] - camAnim.from[2]) * e; dist = camAnim.from[3] + (camAnim.to[3] - camAnim.from[3]) * e; setCam(); if (u >= 1) camAnim = null }
  const f = $('exs').value / 100;
  const now = performance.now(); for (let k = ret.length - 1; k >= 0; k--) { const o = ret[k]; if (!o.ret) { ret.splice(k, 1); continue } const u = Math.min(1, (now - o.ret.t0) / o.ret.dur), e = 1 - Math.pow(1 - u, 3); o.off = o.ret.from.map(v => v * (1 - e)); dirty = true; if (u >= 1) { o.ret = null; ret.splice(k, 1) } }
  const moving = ret.length > 0 || !!drag || S.some((s, i) => s.v !== ((i < cur && s.ready) ? 1 : 0)) || (mode === 'run' && (running || anim));
  if (!dirty && !moving) return; dirty = false;
  // 상태 계산
  let P = {}, hot = null;
  if (mode === 'run' && ready) {
    let hh = anim ? anim.x.hh - 1e-6 : simH; if (anim && anim.tau < PRE) hh = ((anim.x.hh - (1 - anim.tau / PRE)) % 24 + 24) % 24; const v = anim ? anim.v : SM.activeVessel(absH());
    const B = basePose(hh, v); P = B.P; const rise = B.rise;
    if (anim) { nowNote = animPose(anim.A, anim.tau, P) || nowNote; hot = new Set(Object.keys(anim.A.trk));
      if (nowNote) { const f = nowNote.foc; followP = f === 'latch' || f === 'route' ? P[anim.A.sid].pos : f === 'spoon' || f === 'roll' ? P[anim.A.iid]?.pos : f === 'wheel' ? [WH.x, WH.y - WH.R, 1300] : f === 'fig_s' ? [S12.tubeX, S12.tubeY, 2100] : f === 'fig_g' ? [GK.LF, GK.y, 1700] : f === 'fig_j' || f === 'x' ? [GK.RF, GK.y, 1500] : null } }
    else followP = null;
    susuW.forEach((m, i) => m.scale.z = L0 + (i === v ? rise : 0));
    stS.forEach((m, i) => { const top = SS.zb + SS.bot + L0 + rise; m.scale.z = Math.max(1, SS.zt - top); m.visible = i === v });
    const tl = SM.timeLabel(jeolgi, simH); $('ck').textContent = SM.fmtH(simH); $('cs').textContent = tl.txt; $('cng').textContent = tl.night ? '밤 ' + tl.night : '낮';
    if (!tslDrag) tsl.value = Math.round(simH * 60);
    const ni = SM.nightInfo(jeolgi);
    $('ckn').textContent = `지방 태양시 · ${JEOLGI[jeolgi]}: 해넘이 ${SM.fmtH(ni.set)} · 혼 ${SM.fmtH(ni.hon)} · 신 ${SM.fmtH(ni.sin)} · 해돋이 ${SM.fmtH(ni.rise)} · 오늘은 ${VNAME[v]} 수수호를 씀`;
    if (anim && nowNote) { const e = anim.x.e; const sn = anim.A.notes[anim.stage] || nowNote; nowNote = sn; $('now').querySelector('.t').innerHTML = '<span class="st">' + (anim.stage + 1) + ' / ' + anim.A.notes.length + '</span><b>' + (e.kind === 's' ? SI[e.si] + '시(' + SIH[e.si] + ')' : e.gyeong + '경 ' + e.jeom + '점') + '</b> · ' + sn.title; $('now').querySelector('.d').textContent = nowNote.txt }
    else { const nx = nextEv(simH); const e = nx.e; $('now').querySelector('.t').innerHTML = '물이 차오르는 중 · 다음 시보 <b>' + SM.fmtH(nx.hh) + ' ' + (e.kind === 's' ? SI[e.si] + '시' : e.gyeong + '경 ' + e.jeom + '점') + '</b>';
      $('now').querySelector('.d').textContent = `오정(낮 12시)에 물을 받기 시작한 ${VNAME[v]} 수수호의 물이 ${Math.round(rise)}mm 차올라 잣대도 그만큼 떠올랐습니다(2시간에 166mm). 다른 수수호는 물을 빼고 다음 날을 기다립니다. 횡목 위의 쇠구슬이 ${SI[tl.si]}시 신을 받치고 있습니다.` }
    drawGraph();
    if (follow && followP) { TGT.lerp(toW(...followP), .12); setCam() }
    updBallCam(P);
  }
  placeAll(P, hot); updGlow(P);
  S.forEach((s, i) => {
    const tgt = (i < cur && s.ready) ? 1 : 0; s.v += (tgt - s.v) * Math.min(.12, .12 * 1300 / spd()); if (Math.abs(tgt - s.v) < .002) s.v = tgt;
    const isCur = mode === 'asm' && i === cur - 1 && !intro; let op = Math.min(1, s.v * 1.5);
    if (mode === 'asm' && viewMode === 'ghost' && !isCur) op *= .13;
    const vis = s.v > .01 && !(mode === 'asm' && viewMode === 'solo' && !isCur && !intro); s.g.visible = vis;
    if (ghostAll) op *= .35;
    s.objs.forEach(o => { const hv = o === hoverO; let oo = hv ? Math.max(op, .92) : op; if (cutOn && o.cut === 'front') oo = Math.min(oo, mode === 'run' ? 0 : .18); if (o.hideKey && !$(o.hideKey).checked) oo = 0; o.g.visible = oo > .01;
      o.mat.opacity = oo; o.mat.depthWrite = oo > .9; o.mesh.castShadow = oo > .9; const glo = o.hot && $('glow').checked; o.mat.emissive.setHex(hv ? 0x6a3a00 : glo ? 0xff9a20 : o.hot ? 0x7a3c00 : (isCur && viewMode !== 'solo' ? 0x3a2200 : 0)); o.mat.emissiveIntensity = glo ? 1.4 : 1;
      o.emat.visible = edgeOn; o.g.children[1].visible = edgeOn && (oo > .5 || ghostAll && oo > .1); if (o.pmat) o.pmat.opacity = oo });
    s.g.position.z = (1 - s.v) * 700 + (mode === 'asm' ? f * i * 60 : 0);
  });
  ren.render(sc, cam);
})(performance.now());
window.__sim = { list: () => evTimes().map(x => [x.e.kind, x.e.i, +x.hh.toFixed(3)]), day: d => { simDay = d; dirty = true }, set: (h, j) => { if (j != null && j !== jeolgi) { jeolgi = j; jsel.value = j; rebuildSeasonal() } anim = null; simH = h; dirty = true }, run: v => { running = v; updPlay() }, ev: x => { const L = evTimes(); simH = L[x].hh; startAnim(L[x]) }, tau: v => { if (anim) anim.tau = v }, nt: () => anim && anim.A.notes.map(n => [+n.t.toFixed(2), n.title]), st: () => ({ simH, anim: anim && { tau: anim.tau, dur: anim.A.dur, e: anim.x.e, snd: anim.A.snd.map(s => s.t) }, ready }), mode: setMode, cam: goCam };
size(); setCam(); setMode('run'); show(N);
buildAll().then(() => { show(cur); drawGraph(true) });
