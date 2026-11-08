import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { featureEdges } from './edges.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import { buildModel } from './model.js';
import * as sim from './sim.js';

const $ = id => document.getElementById(id);
const MODEL = buildModel();
const { G, steps } = MODEL;
const N = steps.length;

// ---------- 형상 만들기 (ref 골격: CSG) ----------
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
ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 10, 90000);
const pm = new THREE.PMREMGenerator(ren); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
sc.add(new THREE.HemisphereLight(0xfff6e8, 0x5d5040, 0.55));
const dl = new THREE.DirectionalLight(0xfff0dc, 2.2); dl.position.set(3500, 9000, 6500); dl.castShadow = true;
dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -9000, right: 9000, top: 9000, bottom: -9000, near: 1000, far: 24000 }); dl.shadow.bias = -0.0004; dl.shadow.normalBias = 2;
dl.target.position.set(0, 1500, 0); sc.add(dl, dl.target);
const dl2 = new THREE.DirectionalLight(0xdde8ff, .5); dl2.position.set(-6000, 3000, -7000); sc.add(dl2);
// 바닥: 흙
const tc = document.createElement('canvas'); tc.width = tc.height = 256; { const x = tc.getContext('2d'); x.fillStyle = '#96876f'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) { const v = 118 + Math.random() * 24 - 12; x.fillStyle = `rgb(${v + 8},${v},${v - 16})`; x.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 3 + Math.random() * 10) } }
const tt = new THREE.CanvasTexture(tc); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(26, 26); tt.colorSpace = THREE.SRGBColorSpace;
const gr = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tt, roughness: .95 })); gr.receiveShadow = true; gr.position.y = -1; sc.add(gr);
const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; sc.add(root);

// ---------- 재질 ----------
const MATP = { wood: { m: 0, r: .72 }, woodL: { m: 0, r: .6 }, iron: { m: .7, r: .45 }, ironB: { m: .85, r: .28 }, stone: { m: 0, r: .95 }, hemp: { m: 0, r: .9 } };

// ---------- 단계별 부재 ----------
const S = steps.map(s => ({ ...s, g: new THREE.Group(), objs: [], v: 0, ready: false }));
S.forEach(s => { s.g.visible = false; root.add(s.g) });
const MV = new Map();   // 움직이는 부재 id → [o...]
const ALL = [];
const ROPE = {};        // dyn 밧줄 id → o
const ropeKey = id => id.endsWith('L') ? 'L' : 'R';   // sim.ropePath 키
function ropeGeo(pts) {
  const path = new THREE.CurvePath();
  const v = pts.map(p => new THREE.Vector3(...p));
  for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]));
  return new THREE.TubeGeometry(path, 260, 15, 8, false);
}
function makeRope(m, i) {
  const st0 = sim.crane({});
  const mat = new THREE.MeshStandardMaterial({ color: m.col, metalness: 0, roughness: .9, transparent: true });
  const mesh = new THREE.Mesh(ropeGeo(st0.ropePath[ropeKey(m.dyn)]), mat); mesh.castShadow = true;
  const og = new THREE.Group(); og.add(mesh);
  const o = { dyn: m.dyn, g: og, mesh, mat, emat: null, label: m.label, step: i, mv: null, m, rest: [0, 0, 0], off: [0, 0, 0], ret: null };
  mesh.userData.o = o; ROPE[m.dyn] = o;
  return o;
}
function makeObj(m, i) {
  if (m.dyn) return makeRope(m, i);
  const g = memberGeo(m.node);
  const mp = MATP[m.mat] || MATP.wood;
  const mat = new THREE.MeshStandardMaterial({ color: m.col, metalness: mp.m, roughness: mp.r, transparent: true, side: THREE.DoubleSide, envMapIntensity: 1 });
  const og = new THREE.Group(); og.matrixAutoUpdate = false; const me = new THREE.Mesh(g, mat); me.castShadow = true; me.receiveShadow = true; og.add(me);
  const emat = new THREE.LineBasicMaterial({ color: 0x1c140c, transparent: true, opacity: .32 });
  const eg = new THREE.LineSegments(featureEdges(g, 28), emat); og.add(eg);
  const bb = g.boundingBox || (g.computeBoundingBox(), g.boundingBox); const rest = bb.getCenter(new THREE.Vector3());
  const o = { g: og, mesh: me, mat, emat, eg, label: m.label, step: i, mv: m.mv, spin: m.spin, spiv: m.spiv, sax: m.sax, m, rest: [rest.x, rest.y, rest.z], off: [0, 0, 0], ret: null };
  me.userData.o = o;
  if (m.mv) { if (!MV.has(m.mv)) MV.set(m.mv, []); MV.get(m.mv).push(o) }
  return o;
}
async function buildAll() {
  for (let i = 0; i < N; i++) {
    const s = S[i]; $('ld').textContent = '부재를 만드는 중… ' + (i + 1) + ' / ' + N + '  (' + s.label + ')';
    await new Promise(r => setTimeout(r, 0));
    for (const m of s.members) { CURL = m.label; const o = makeObj(m, i); s.objs.push(o); ALL.push(o); s.g.add(o.g) }
    s.ready = true; dirty = true;
  }
  $('ld').style.display = 'none'; ready = true; dirty = true;
}

// ---------- 일꾼 (직접 조작 탭) ----------
const WORKERG = new THREE.Group(); root.add(WORKERG); WORKERG.visible = false;
const WORKERS = [];
// 일꾼: 키 약 1,650 · 흰 무명 바지 + 베이지 저고리 + 허리띠 + 두건·상투 (가정 모습). 소거 바깥쪽에 3줄로 서서
// 나무살 끝에 매단 밧줄을 잡고 당기며(매일신문 1997), 얼레가 돌 때 몸을 뒤로 조금 기울인다.
const wMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
const wMatP = wMat(0xece6d6), wMatJ = wMat(0xd8c8a4), wMatBelt = wMat(0x6b4a2e), wMatS = wMat(0xc89a72), wMatHair = wMat(0x2a2522), wMatR = wMat(0xc2a26a);
const zc = g => g.rotateX(Math.PI / 2);   // 원기둥을 z축(위) 방향으로
const WG = { leg: zc(new THREE.CylinderGeometry(62, 70, 820, 10)), coat: zc(new THREE.CylinderGeometry(150, 185, 560, 14)),
  belt: zc(new THREE.CylinderGeometry(160, 160, 50, 14)), head: new THREE.SphereGeometry(105, 16, 12),
  band: zc(new THREE.CylinderGeometry(104, 104, 34, 16)), knot: new THREE.SphereGeometry(42, 10, 8),
  arm: new THREE.CylinderGeometry(48, 42, 520, 8).rotateZ(-Math.PI / 2), hand: new THREE.SphereGeometry(46, 10, 8) };
function segMesh(p0, p1, r, mat) {
  const d = new THREE.Vector3().subVectors(p1, p0), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), mat);
  m.position.copy(p0).addScaledVector(d, .5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  m.castShadow = true; return m;
}
const part = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m };
for (const s of [-1, 1]) for (let i = 0; i < 15; i++) {
  const row = Math.floor(i / 5), col = i % 5;
  const wx = s * (3750 + 520 * row), wy = -800 + 400 * col;   // 어깨너비(약 370)보다 넓게 400 간격
  const face = Math.atan2(-wy, s * sim.AXLE.x - wx);      // 얼레 축을 바라봄 (+x 쪽이 앞)
  const grp = new THREE.Group(); grp.position.set(wx, wy, 0); grp.rotation.z = face;
  [-90, 90].forEach(y => part(WG.leg, wMatP, 0, y, 410, grp));
  const torso = new THREE.Group(); torso.position.z = 820; grp.add(torso);   // 엉덩이를 축으로 기울임
  part(WG.coat, wMatJ, 0, 0, 280, torso); part(WG.belt, wMatBelt, 0, 0, 40, torso);
  part(WG.head, wMatS, 0, 0, 700, torso); part(WG.band, wMatP, 0, 0, 735, torso); part(WG.knot, wMatHair, -10, 0, 812, torso);
  const arms = [-165, 165].map(ay => {
    const arm = new THREE.Group(); arm.position.set(0, ay, 520); arm.rotation.y = -.55;
    part(WG.arm, wMatJ, 260, 0, 0, arm); part(WG.hand, wMatS, 540, 0, 0, arm);
    torso.add(arm); return arm;
  });
  const hx = wx + 470 * Math.cos(face), hy = wy + 470 * Math.sin(face);
  WORKERG.add(grp, segMesh(new THREE.Vector3(s * (sim.AXLE.x + 520), Math.max(-330, Math.min(330, wy)), sim.AXLE.z + 300), new THREE.Vector3(hx, hy, 1600), 18, wMatR));
  WORKERS.push({ grp, torso, arms, side: s, i });
}

// ---------- 카메라 ----------
let az = .55, el = .26, dist = 15000; const TGT = new THREE.Vector3(0, 2400, 0);
let camAnim = null;
const toW = (x, y, z) => new THREE.Vector3(x, z, -y);
function setCam() { cam.position.set(TGT.x + dist * Math.cos(el) * Math.sin(az), TGT.y + dist * Math.sin(el), TGT.z + dist * Math.cos(el) * Math.cos(az)); cam.lookAt(TGT); cam.updateProjectionMatrix(); dirty = true }
function size() { const w = cv.clientWidth, h = cv.clientHeight; ren.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true }
addEventListener('resize', size);
// 프리셋: 전체 / 도르래 / 얼레(소거) / 돌과 사슬
const PRESET = {
  all: [[0, 0, 2300], .55, .24, 15000],
  pulley: [[0, 0, 2900], .35, .14, 4400],
  winch: [[2800, 200, 2100], -.5, .18, 5600],
  stone: [[0, 0, 900], .5, .14, 4000],
  sciMov: [[0, 0, 1900], .4, .1, 4300],
  mars: [[2600, 0, 3300], -.95, .3, 16500],
};
function goCam(k) { const [t, a, e, d] = PRESET[k]; camAnim = { t0: performance.now(), from: [TGT.clone(), az, el, dist], to: [toW(...t), a, e, d] } }
window.__cam = (a, e, d, x, y, z) => { az = a; el = e; dist = d; if (x != null) TGT.copy(toW(x, y, z)); camAnim = null; setCam() };
window.__S = () => S;
// F5: 테스트용 JSON 안전 상태 (window.__S는 순환 구조라 JSON 변환이 안 됨)
let lastLift = 0, lastTilt = 0, marsPhase = '', quizScore = 0, marsChainsOn = true, lightMode = false, fpsNow = 60;
// 실제로 그려진 부재의 바운딩 박스(모델 좌표 mm: x=동, y=뒤, z=위)를 돌려줌 — 위치 검증용
const bboxOf = pred => { const o = ALL.find(pred); if (!o) return null; root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o.mesh), r = v => Math.round(v);
  return { min: [r(b.min.x), r(-b.max.z), r(b.min.y)], max: [r(b.max.x), r(-b.min.z), r(b.max.y)], visible: o.g.visible } };
window.__state = () => ({ tab: mode, step: cur, N, lift: Math.round(lastLift), thL: Math.round(ctrl.thL * 1e4) / 1e4, thR: Math.round(ctrl.thR * 1e4) / 1e4,
  stone: bboxOf(o => o.mv === 'stone'), lower: bboxOf(o => o.mv === 'lower' && /틀/.test(o.label)), bars: bboxOf(o => o.mv === 'bars'),
  cart: [Math.round(cartG.position.x), Math.round(cartG.position.y)], lightMode, fps: Math.round(fpsNow),
  tilt: Math.round(lastTilt * 1e5) / 1e5, massKg: ctrl.massKg, workers: ctrl.workers, scenePhase: marsPhase, quiz: { score: quizScore, total: QUIZ.length } });

// ---------- 조작: 돌리기 · 옮기기 · 부재 떼어 보기 (ref 그대로) ----------
let dr = null; const el2 = ren.domElement; let moveMode = false, drag = null, hoverO = null; const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayAt(e) { const r = el2.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(ndc, cam); return rc }
function pickObj(e) { const ms = []; S.forEach(s => { if (s.g.visible) s.objs.forEach(o => { if (o.mat.opacity > .05 && o.g.visible) ms.push(o.mesh) }) }); const h = rayAt(e).intersectObjects(ms, false)[0]; return h ? { o: h.object.userData.o, pt: h.point } : null }
const capEl = $('cap'); function cap(t) { capEl.textContent = t || ''; capEl.hidden = !t }
function nameOf(o) { const st = S[o.step]; const g = G[st.key]; return o.label + (g && g.n && !o.label.includes(g.n) ? ' · ' + g.n : '') }
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
  if (dr.pan) { const k = dist * .0011; const rgt = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1); TGT.addScaledVector(rgt, -dx * k).addScaledVector(up, dy * k) }
  else { az -= dx * .008; el = Math.max(-.05, Math.min(1.45, el + dy * .008)) } camAnim = null; setCam()
});
const pup = e => { if (drag && e.pointerId === drag.id) { const o = drag.o; drag = null; el2.style.cursor = ''; moveBack(o); setTimeout(() => { if (!drag) { hoverO = null; cap(''); dirty = true } }, 700); return } dr = null };
el2.addEventListener('pointerup', pup); el2.addEventListener('pointercancel', pup);
addEventListener('keyup', e => { if ((e.key === 'Control' || e.key === 'Meta') && !drag && !moveMode && hoverO) { hoverO = null; cap(''); el2.style.cursor = ''; dirty = true } });
let ghostAll = false;
$('ghostb').onclick = () => { ghostAll = !ghostAll; $('ghostb').classList.toggle('on', ghostAll); $('ghostb').setAttribute('aria-pressed', ghostAll); dirty = true };
$('moveb').onclick = () => { moveMode = !moveMode; $('moveb').classList.toggle('on', moveMode); $('moveb').setAttribute('aria-pressed', moveMode); if (!moveMode) { hoverO = null; cap('') } };
const zm = f => { dist = Math.max(500, Math.min(32000, dist * f)); camAnim = null; setCam() };
el2.addEventListener('wheel', e => { e.preventDefault(); zm(e.deltaY > 0 ? 1.08 : .93) }, { passive: false });
$('zi').onclick = () => zm(.85); $('zo').onclick = () => zm(1.18);

// ---------- 시공 순서 탭 (ref 조립 보기 방식) ----------
let mode = 'build', cur = N, timer = null, viewMode = 'all', intro = true; const sl = $('sl'); sl.max = N;
const gk = Object.keys(G);
let html = ''; gk.forEach((k, gi) => { const g = G[k]; html += '<div class="gh"><i class="sw" style="background:' + g.col + '"></i>' + (gi + 1) + '. ' + g.n + (g.hj ? ' <small>' + g.hj + '</small>' : '') + '</div><div class="gs">';
  S.forEach((s, i) => { if (s.key === k) html += '<button data-i="' + (i + 1) + '">' + (i + 1) + '. ' + s.label + '</button>' }); html += '</div>' });
$('list').innerHTML = html;
const nowBox = $('now');
function show(n) {
  cur = Math.max(0, Math.min(N, n)); sl.value = cur; $('cn').textContent = cur + ' / ' + N;
  document.querySelectorAll('#list button').forEach(b => { const on = +b.dataset.i === cur; b.classList.toggle('on', on && !intro); if (on && !intro) b.scrollIntoView({ block: 'nearest' }) });
  const s = S[cur - 1];
  if (!s || intro) { $('info').innerHTML = '<h2>거중기 시공 순서</h2><div class="d">받침돌 → 다리 4개 → 가로대 두 단 → 횡량 → 고정 도르래틀(중유량) → 움직 도르래틀(하유량)·사슬 → 얼레 틀(소거) → 도르래·얼레축 → 밧줄 → 돌 순서로 ' + N + '단계에 걸쳐 세웁니다. 모든 부재는 따로따로 만들어져 있어 Ctrl(⌘)+끌기로 하나씩 떼어 볼 수 있습니다.</div>';
    nowBox.querySelector('.t').innerHTML = '거중기 조립 · <b>' + N + '단계</b>'; nowBox.querySelector('.d').textContent = '재생 버튼을 누르면 부재가 위에서 내려오며 차례로 세워집니다.'; return }
  const g = G[s.key]; const cnt = s.members.length;
  $('info').innerHTML = '<div class="gn">' + g.n + (g.hj ? ' ' + g.hj : '') + '</div><h2>' + cur + '. ' + s.label + (cnt > 1 ? ' <small>×' + cnt + '</small>' : '') + '</h2><div class="d">' + g.desc + '</div><div class="m">치수: ' + g.dim + '</div>';
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
let edgeOn = true;
$('edg').onchange = () => { edgeOn = $('edg').checked; dirty = true };

// ---------- 직접 조작 탭 ----------
const ctrl = { thL: 0, thR: 0, massKg: 729, workers: 8, eff: 1 };
const WIND_RATE = 2.0, TH_MAX = 91;   // rad: 91×75/4 ≈ LIFT_MAX
const wind = { L: 0, R: 0 };          // -1 풀기 / +1 감기 / 0 정지
const holdBtn = (id, on, off) => { const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); audio(); on() });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, off)); };
holdBtn('wLu', () => wind.L = 1, () => wind.L = 0); holdBtn('wLd', () => wind.L = -1, () => wind.L = 0);
holdBtn('wRu', () => wind.R = 1, () => wind.R = 0); holdBtn('wRd', () => wind.R = -1, () => wind.R = 0);
holdBtn('wBu', () => { wind.L = 1; wind.R = 1 }, () => { wind.L = 0; wind.R = 0 });
holdBtn('wBd', () => { wind.L = -1; wind.R = -1 }, () => { wind.L = 0; wind.R = 0 });
const KEYS = { q: ['L', 1], a: ['L', -1], p: ['R', 1], l: ['R', -1], w: ['B', 1], s: ['B', -1] };
addEventListener('keydown', e => { const k = KEYS[e.key.toLowerCase()]; if (!k || e.repeat || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; audio(); if (k[0] === 'L') wind.L = k[1]; else if (k[0] === 'R') wind.R = k[1]; else { wind.L = k[1]; wind.R = k[1] } e.preventDefault() });
addEventListener('keyup', e => { const k = KEYS[e.key.toLowerCase()]; if (!k) return; wind.L = 0; wind.R = 0 });
$('wsl').oninput = () => { ctrl.massKg = +$('wsl').value * 1000; $('wsv').textContent = (+$('wsl').value).toFixed(2) + 't'; dirty = true };
$('nws').oninput = () => { ctrl.workers = +$('nws').value; $('nwv').textContent = ctrl.workers + '명'; dirty = true };
$('efs').oninput = () => { ctrl.eff = +$('efs').value / 100; $('efv').textContent = $('efs').value + '%'; dirty = true };
const fmtN = v => v >= 1000 ? (v / 1000).toFixed(2) + 'kN' : Math.round(v) + 'N';
function updReads(st, pw) {
  $('rh').textContent = (st.lift / 1000).toFixed(2) + 'm';
  $('rt').textContent = (st.tilt * 180 / Math.PI).toFixed(1) + '°';
  $('rf').textContent = fmtN(st.ropeTension);
  $('rp').textContent = pw.tooHeavy ? fmtN(pw.N) + ' (초과!)' : fmtN(pw.N) + ' · ' + pw.kgf.toFixed(1) + 'kg중';
  $('rr').textContent = (st.ropePulled / 1000).toFixed(1) + 'm';
  $('rw').textContent = Math.round(st.work).toLocaleString() + 'J';
  let w = '';
  if (pw.tooHeavy) w = '너무 무거워요! 일꾼을 늘려 보세요 (1인 ' + Math.round(pw.N) + 'N — 300N을 넘으면 얼레가 돌지 않아요)';
  if (st.warn) w += (w ? ' · ' : '') + '좌우 얼레를 같은 속도로! (의궤의 주의 사항)';
  $('warn').textContent = w; $('warn').hidden = !w;
}

// ---------- 소리 (WebAudio 합성, 외부 파일 없음) ----------
let AC = null, master = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination) } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC }
addEventListener('pointerdown', () => audio(), { once: true });
function creak() {
  if (!$('snd').checked || !audio()) return; const t0 = AC.currentTime;
  const b = AC.createBuffer(1, AC.sampleRate * .07, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  f.type = 'bandpass'; f.frequency.value = 320 + Math.random() * 380; f.Q.value = 6; g.gain.value = .16;
  s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t0);
}
function thud() {
  if (!$('snd').checked || !audio()) return; const t0 = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + .3);
  g.gain.setValueAtTime(.6, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .38);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + .42);
}

// ---------- 과학 원리 탭 (PLAN 5절: 카드 6 + 역사, SVG는 다크모드 토큰 색) ----------
const SCI_HI = {
  fixed: o => o.label.includes('중유량 도르래') || o.label.includes('대활륜(큰 도르래)') || o.label.includes('등자쇠'),
  mov: o => o.label.includes('하유량 도르래'),
  axle: o => o.label.includes('얼레축') || o.label.includes('나무살'),
};
let sciKey = null; const hiObjs = new Set();
function setSci(k) {
  sciKey = k; hiObjs.clear();
  if (k && SCI_HI[k]) ALL.forEach(o => { if (SCI_HI[k](o)) hiObjs.add(o) });
  if (k === 'fixed') goCam('pulley'); else if (k === 'mov') goCam('sciMov'); else if (k === 'axle') goCam('winch');
  document.querySelectorAll('#sciCards .sci').forEach(el => el.classList.toggle('on', el.dataset.k === k));
  dirty = true;
}
const circ = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--pn)" stroke="var(--fg)" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--fg)"/>`;
const arw = (x1, y1, x2, y2, col) => { const a = Math.atan2(y2 - y1, x2 - x1);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2.5"/><path d="M${x2},${y2} L${(x2 - 9 * Math.cos(a - .42)).toFixed(1)},${(y2 - 9 * Math.sin(a - .42)).toFixed(1)} L${(x2 - 9 * Math.cos(a + .42)).toFixed(1)},${(y2 - 9 * Math.sin(a + .42)).toFixed(1)} Z" fill="${col}"/>`; };
function pulleyPairSVG(kind) {
  const beam = `<rect x="18" y="30" width="234" height="8" fill="var(--bd)"/>`;
  if (kind === 'fixed') return `<svg viewBox="0 0 270 204">${beam}${circ(135, 54, 26)}
   <line x1="109" y1="54" x2="109" y2="140" stroke="var(--fg)" stroke-width="2"/><line x1="161" y1="54" x2="161" y2="140" stroke="var(--fg)" stroke-width="2"/>
   <rect x="80" y="140" width="58" height="34" fill="var(--mut)"/><text x="109" y="190" font-size="11.5" text-anchor="middle" fill="var(--fg)">무게 W</text>
   ${arw(161, 140, 161, 188, 'var(--ac)')}<text x="170" y="182" font-size="12" fill="var(--ac)" font-weight="700">F = W</text></svg>`;
  // 움직 도르래: 왼쪽 줄은 들보에 묶이고, 오른쪽 줄 끝을 위로 당긴다 → 두 가닥이 W를 나눠 받아 F = W/2
  return `<svg viewBox="0 0 270 204">${beam}
   <line x1="109" y1="38" x2="109" y2="122" stroke="var(--fg)" stroke-width="2"/>
   <line x1="161" y1="122" x2="161" y2="74" stroke="var(--fg)" stroke-width="2"/>${arw(161, 74, 161, 46, 'var(--ac)')}
   ${circ(135, 122, 26)}<line x1="135" y1="122" x2="135" y2="156" stroke="var(--fg)" stroke-width="2"/>
   <rect x="109" y="156" width="52" height="32" fill="var(--mut)"/>
   <text x="70" y="70" font-size="11.5" fill="var(--fg)" text-anchor="end">묶음</text><text x="172" y="64" font-size="12" fill="var(--ac)" font-weight="700">F = W/2 (위로)</text>
   <text x="172" y="178" font-size="11.5" fill="var(--fg)">무게 W</text></svg>`;
}
function compoundSVG(n) {
  const yT = 44, yB = 152; let s = `<rect x="18" y="${yT - 9}" width="234" height="8" fill="var(--bd)"/>`;
  if (!n) s += `<line x1="132" y1="${yT}" x2="132" y2="140" stroke="var(--fg)" stroke-width="2"/>` + circ(132, yT, 14)
    + `<rect x="106" y="140" width="52" height="30" fill="var(--mut)"/>` + arw(214, 150, 214, 188, 'var(--ac)')
    + `<text x="222" y="182" font-size="12" fill="var(--ac)" font-weight="700">F = 무게</text>`;
  else {
    const pts = [[28, yT - 16]];
    for (let i = 0; i < n; i++) { const mx = 64 + i * 42, fx = 85 + i * 42; pts.push([mx, yB + 14], [fx, yT - 16]); s += circ(mx, yB, 14) + circ(fx, yT, 14); }
    s += `<rect x="46" y="${yB}" width="${40 + (n - 1) * 42}" height="8" fill="var(--bd)"/>`
      + `<rect x="52" y="164" width="${28 + (n - 1) * 42}" height="24" fill="var(--mut)"/>`
      + `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--fg)" stroke-width="2"/>`
      + arw(85 + (n - 1) * 42, yT - 16, 248, yT - 50, 'var(--ac)')
      + `<text x="234" y="22" font-size="12.5" fill="var(--ac)" font-weight="700">F</text>`;
  }
  s += `<text x="12" y="198" font-size="12" fill="var(--fg)" font-weight="700">줄 ${Math.max(1, 2 * n)}가닥 · 힘 1/${Math.max(1, 2 * n)} · 거리 ${Math.max(1, 2 * n)}배${n === 4 ? ' — 거중기!' : ''}</text>`;
  return `<svg viewBox="0 0 270 204">${s}</svg>`;
}
function axleSVG(r) {
  const R = 62, ax = Math.max(6, R / r), cx = 82, cy = 108;
  return `<svg viewBox="0 0 270 204">${circ(cx, cy, R)}<circle cx="${cx}" cy="${cy}" r="${ax}" fill="var(--bd)" stroke="var(--fg)" stroke-width="2.5"/>
   <line x1="${cx + 30}" y1="${cy - 30}" x2="${cx - 30}" y2="${cy + 30}" stroke="var(--fg)" stroke-width="1.6" opacity=".55"/>
   <rect x="${cx - 11}" y="${cy + ax}" width="22" height="42" fill="var(--mut)"/>
   ${arw(cx + 11, cy + ax + 48, cx + 11, cy + ax + 74, 'var(--fg)')}
   ${arw(cx + R, cy - 34, cx + R + 44, cy - 34, 'var(--ac)')}
   <text x="${cx + R - 50}" y="${cy - 42}" font-size="12" fill="var(--ac)" font-weight="700">손 힘 F</text>
   <text x="${cx + 18}" y="${cy + ax + 66}" font-size="12" fill="var(--fg)">무게 W</text>
   <text x="12" y="30" font-size="12.5" fill="var(--fg)" font-weight="700">나무살 R=600 : 축 r=75 → ${r}:1, 힘 1/${r}</text>
   <text x="12" y="198" font-size="12" fill="var(--fg)">기중가도설: "자루:기둥 = 10:1" — 같은 축바퀴 원리</text></svg>`;
}
function workGraphSVG() {
  const data = [0, 1, 2, 3, 4].map(n => { const r = sim.pulleyForce({ massKg: 729, movable: n, wheelRatio: 1, eff: 1 }); return { n, f: r.force, d: r.distanceRatio }; });
  const fMax = data[0].f, x0 = 52, dx = 42, yB = 148;
  let s = '', prev = null;
  data.forEach((d, i) => {
    const x = x0 + i * dx, h = 96 * d.f / fMax;
    s += `<rect x="${x - 16}" y="${yB - h}" width="32" height="${h}" fill="var(--ac)" opacity=".85"/>`
      + `<text x="${x}" y="${yB - h - 5}" font-size="10.5" text-anchor="middle" fill="var(--fg)">${(d.f / 1000).toFixed(1)}kN</text>`
      + `<text x="${x}" y="${yB + 14}" font-size="11" text-anchor="middle" fill="var(--mut)">${d.n}</text>`;
    const py = yB - 6 - 96 * d.d / 8;
    s += (prev ? `<line x1="${prev.x}" y1="${prev.y}" x2="${x}" y2="${py}" stroke="var(--ok)" stroke-width="2"/>` : '')
      + `<circle cx="${x}" cy="${py}" r="3.5" fill="var(--ok)"/>`;
    prev = { x, y: py };
  });
  return `<svg viewBox="0 0 270 204">${s}
   <line x1="30" y1="148" x2="250" y2="148" stroke="var(--fg)" stroke-width="1.5"/>
   <text x="135" y="178" font-size="11.5" text-anchor="middle" fill="var(--mut)">움직 도르래 수(개)</text>
   <rect x="30" y="186" width="10" height="10" fill="var(--ac)"/><text x="44" y="195" font-size="11" fill="var(--fg)">필요한 힘(돌 729kg)</text>
   <circle cx="204" cy="191" r="4" fill="var(--ok)"/><text x="212" y="195" font-size="11" fill="var(--fg)">거리(배)</text></svg>`;
}
function balanceSVG() { return `<svg viewBox="0 0 270 204">
   <line x1="52" y1="86" x2="218" y2="86" stroke="var(--fg)" stroke-width="3"/>${circ(52, 58, 17)}${circ(218, 58, 17)}
   <line x1="35" y1="58" x2="69" y2="58" stroke="var(--fg)" stroke-width="1.6"/><line x1="201" y1="58" x2="235" y2="58" stroke="var(--fg)" stroke-width="1.6"/>
   ${arw(52, 36, 52, 14, 'var(--ac)')}${arw(218, 36, 218, 14, 'var(--ac)')}
   <text x="135" y="92" font-size="11.5" text-anchor="middle" fill="var(--fg)">같은 속도 → 수평 유지</text>
   <text x="52" y="118" font-size="11" text-anchor="middle" fill="var(--mut)">왼쪽 얼레</text><text x="218" y="118" font-size="11" text-anchor="middle" fill="var(--mut)">오른쪽 얼레</text>
   <text x="135" y="150" font-size="12" text-anchor="middle" fill="var(--fg)" id="balEff">마찰이 없으면 힘 = 이론값</text>
   <text x="135" y="172" font-size="11" text-anchor="middle" fill="var(--mut)">효율 슬라이더로 마찰을 바꾸어 보세요</text></svg>`; }
function histSVG() {
  const items = [['1627', '기기도설 간행', '테렌츠·왕징'], ['1792', '정조 하사', '정약용 연구'], ['1794–96', '화성 축성', '거중기 사용'], ['1801', '의궤 간행', '도설 수록']];
  return `<svg viewBox="0 0 270 204">${items.map(([y, t1, t2], i) => {
    const x = 12 + i * 64;
    return `<rect x="${x}" y="40" width="58" height="66" rx="7" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.6"/>
     <text x="${x + 29}" y="60" font-size="11" text-anchor="middle" fill="var(--ac)" font-weight="700">${y}</text>
     <text x="${x + 29}" y="78" font-size="10" text-anchor="middle" fill="var(--fg)">${t1}</text>
     <text x="${x + 29}" y="93" font-size="10" text-anchor="middle" fill="var(--fg)">${t2}</text>`
      + (i < 3 ? `<line x1="${x + 58}" y1="72" x2="${x + 64}" y2="72" stroke="var(--mut)" stroke-width="1.6"/>` : '');
  }).join('')}
   <text x="135" y="140" font-size="12" text-anchor="middle" fill="var(--fg)">경비 <tspan fill="var(--ac)" font-weight="700">4만 냥</tspan> 절약 — 자찬묘지명</text>
   <text x="135" y="162" font-size="11" text-anchor="middle" fill="var(--mut)">정약용: 평행 도르래 대신 수평 나열 도르래 선택(다리 4개)</text></svg>`;
}
const SCI_CARDS = [
  { k: 'fixed', t: '1. 고정 도르래(定滑車)', fx: '힘 = 무게 — 방향만 바뀜', tx: '도르래가 틀에 고정되어 있으면 힘의 크기는 그대로고 방향만 바뀝니다. 사람이 바닥에서 아래로 당겨 얼레를 감을 수 있습니다. 중유량 도르래 4개와 대활륜이 이 역할을 합니다.' },
  { k: 'mov', t: '2. 움직 도르래(動滑車)', fx: '힘 = 무게의 1/2 · 거리 2배', tx: '도르래가 짐과 함께 움직이면 줄 2가닥이 무게를 나누어 받습니다. 힘은 절반이 되지만 줄을 2배 당겨야 합니다. 하유량 도르래가 이 역할을 합니다.' },
  { k: 'com', t: '3. 복합 도르래 — 거중기', tx: '움직 도르래 수를 바꾸어 보세요. 움직 도르래 n개면 줄 2n가닥 → 힘 1/(2n). 거중기는 움직 도르래 4개라 힘 1/8!', slider: { id: 'sciN', min: 0, max: 4, val: 4, lb: '움직 도르래' } },
  { k: 'axle', t: '4. 축바퀴(얼레)', tx: '축 반지름 r과 나무살 반지름 R의 비만큼 힘이 더 줄어듭니다. 얼레축·나무살이 이 역할을 합니다.', slider: { id: 'sciR', min: 1, max: 10, val: 8, lb: '나무살:축' } },
  { k: 'work', t: '5. 일의 원리', fx: '힘 × 거리 = 일정', tx: '도르래로 힘이 1/8이 되면 대신 줄을 8배, 나무살 끝은 64배 당겨야 합니다. 힘은 줄어들지만 거리는 늘어납니다.' },
  { k: 'bal', t: '6. 좌우 균형과 마찰', fx: '실제 힘 = 이론값 ÷ 효율', tx: '좌우 얼레를 같은 속도로 감아야 돌이 수평으로 올라갑니다(의궤의 주의). 실제로는 마찰 때문에 효율 100%가 아닙니다.', slider: { id: 'sciE', min: 60, max: 100, val: 100, lb: '효율(가정)' } },
  { k: 'hist', t: '역사 — 기기도설에서 의궤까지', tx: '"성벽을 쌓았을까?"라는 쟁점도 있습니다: 들어 올릴 수 있는 높이 약 3m·바퀴 없음 → 채석장에서 돌을 수레에 싣는 고정 기중기 해석(Kim 2017). 높이 쌓을 때는 녹로(약 11m)를 썼습니다.' },
];
function renderSci() {
  $('sciCards').innerHTML = SCI_CARDS.map(c => `<div class="sci" data-k="${c.k}"><h3>${c.t}</h3>
    <div class="fig">${c.k === 'com' ? compoundSVG(4) : c.k === 'axle' ? axleSVG(8) : c.k === 'work' ? workGraphSVG() : c.k === 'bal' ? balanceSVG() : c.k === 'hist' ? histSVG() : pulleyPairSVG(c.k)}</div>
    ${c.fx ? `<div class="fx">${c.fx}</div>` : ''}<div class="tx">${c.tx}</div>
    ${c.slider ? `<div class="row"><span class="lb">${c.slider.lb}</span><input id="${c.slider.id}" type="range" min="${c.slider.min}" max="${c.slider.max}" step="1" value="${c.slider.val}"><span id="${c.slider.id}v" class="k"></span></div>` : ''}</div>`).join('');
  document.querySelectorAll('#sciCards .sci').forEach(el => {
    el.addEventListener('click', () => setSci(el.dataset.k === sciKey ? null : el.dataset.k));
    const sl = el.querySelector('input'); if (!sl) return;
    const upd = () => {
      if (sl.id === 'sciN') { const n = +sl.value; $('sciNv').textContent = n + '개'; el.querySelector('.fig').innerHTML = compoundSVG(n); }
      if (sl.id === 'sciR') { const r = +sl.value; $('sciRv').textContent = r + ':1'; el.querySelector('.fig').innerHTML = axleSVG(r); }
      if (sl.id === 'sciE') { const e = +sl.value; $('sciEv').textContent = e + '%';
        const f = sim.pulleyForce({ massKg: 729, movable: 4, wheelRatio: 8, eff: e / 100 });
        const t = sim.pulleyForce({ massKg: 729, movable: 4, wheelRatio: 8, eff: 1 });
        el.querySelector('#balEff').textContent = `효율 ${e}% → 나무살 끝 1인 힘 ${Math.round(f.hand / 8 / 15)}N (이론 ${Math.round(t.hand / 8 / 15)}N)`; }
    };
    sl.addEventListener('input', ev => { ev.stopPropagation(); upd(); });
    sl.addEventListener('click', ev => ev.stopPropagation());
    upd();
  });
}
renderSci();

// ---------- 화성 현장 (PLAN 7절: 성벽·유형거·녹로 화살표) ----------
const marsG = new THREE.Group(); root.add(marsG); marsG.visible = false;
const wallMat = new THREE.MeshStandardMaterial({ color: 0x93908a, roughness: .95 });
const earthMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5e, roughness: 1 });
const cartMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: .8 });
// 성벽 일부: 길이 6,000(y) · 높이 7,750(2장 5척) · 바깥 면석 쌓기 + 안쪽 흙 경사(내탁). 가정 치수.
const wallSkinGeos = [];
[[8500, 1400, 2900, 1450], [8700, 1200, 2550, 4225], [8900, 1000, 2300, 6600]].forEach(([cx, w, h, zc], L) => {
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, 6000, h), wallMat); core.position.set(cx, 0, zc);
  core.castShadow = core.receiveShadow = true; marsG.add(core);
  const ch = h / 5;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
    const g = new THREE.BoxGeometry(160, 940, ch - 24);
    g.translate(cx - w / 2 + 40, -3000 + 500 * c + 250 + (r % 2 ? 250 : 0), zc - h / 2 + (r + .5) * ch);
    wallSkinGeos.push(g);
  }
});
const wallSkin = new THREE.Mesh(mergeGeometries(wallSkinGeos), wallMat); wallSkin.castShadow = wallSkin.receiveShadow = true; marsG.add(wallSkin);
const tri = new THREE.Shape([new THREE.Vector2(9200, 7750), new THREE.Vector2(9200, 0), new THREE.Vector2(12400, 0)]);
const slopeGeo = new THREE.ExtrudeGeometry(tri, { depth: 6000, bevelEnabled: false }); slopeGeo.translate(0, 0, -3000); slopeGeo.rotateX(Math.PI / 2);
const slope = new THREE.Mesh(slopeGeo, earthMat); slope.receiveShadow = true; marsG.add(slope);
const arrowG = new THREE.Group(); arrowG.visible = false; marsG.add(arrowG);
const arrMat = new THREE.MeshStandardMaterial({ color: 0xd0614a, roughness: .5 });
const a0 = new THREE.Vector3(12300, 0, 400), a1 = new THREE.Vector3(9700, 0, 7300);
arrowG.add(segMesh(a0, a1, 60, arrMat));
{ const dir = a1.clone().sub(a0).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(190, 420, 12), arrMat);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  cone.position.copy(a1).addScaledVector(dir, 190); cone.castShadow = true; arrowG.add(cone); }
// 유형거(遊衡車): 앞뒤(y)로 다니는 바퀴 2개 수레. 거중기 앞 가로대(전후강) 밑을 지나도록 낮게 만듦.
// 바퀴 지름 600(축 높이 300), 짐틀 330~410, 침목 2개(x=±375, 윗면 560) — 돌 밑 철강이 침목 사이에 들어감. 가정 치수.
const cartG = new THREE.Group(); root.add(cartG); cartG.visible = false;
{ const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, cartMat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; cartG.add(m); return m };
  add(new THREE.BoxGeometry(900, 1800, 80), 0, 0, 370);                                  // 짐틀 바닥
  [-375, 375].forEach(x => add(new THREE.BoxGeometry(150, 1700, 150), x, 0, 485));       // 침목
  [-1, 1].forEach(sx => add(new THREE.BoxGeometry(70, 3000, 70), sx * 420, -1300, 360)); // 끌채(앞으로 긴 손잡이)
  add(new THREE.CylinderGeometry(25, 25, 1180, 10).rotateZ(Math.PI / 2), 0, 0, 300);     // 바퀴축
  [-540, 540].forEach(x => { const w = add(new THREE.CylinderGeometry(300, 300, 90, 24).rotateZ(Math.PI / 2), x, 0, 300);
    w.userData.wheel = true; }); }
const cartWheels = cartG.children.filter(m => m.userData.wheel);
// 재생 상태
let marsT = 0, marsPlaying = false, marsSpeed = 1, prevStoneOn = 'ground';
const setMars = t => { marsT = Math.max(0, Math.min(sim.SCENE_TOTAL, t)); };
const MPH = ['사슬 걸기', '감아 올리기', '유형거 진입', '내려놓기', '철수', '녹로 안내'];
function marsUI(st) {
  $('mPh').textContent = '단계 ' + (st.phaseIndex + 1) + '/6 · ' + MPH[st.phaseIndex];
  $('marsCap').textContent = st.caption;
  if (document.activeElement !== $('mSl')) $('mSl').value = Math.round(marsT);
  $('mPlay').textContent = marsPlaying ? '⏸ 정지' : '▶ 재생';
}
$('mPlay').onclick = () => { audio(); if (marsT >= sim.SCENE_TOTAL) { marsT = 0; prevStoneOn = 'ground'; } marsPlaying = !marsPlaying; dirty = true; };
$('mReset').onclick = () => { marsT = 0; prevStoneOn = 'ground'; dirty = true; };
$('mSpd').onchange = () => { marsSpeed = +$('mSpd').value; };
$('mSl').oninput = () => { marsT = Math.max(0, Math.min(sim.SCENE_TOTAL, +$('mSl').value)); dirty = true; };
$('mSl').max = sim.SCENE_TOTAL;

// ---------- 문제 풀기 (PLAN 8절: 8문항 객관식) ----------
const QUIZ = [
  { q: '거중기를 고안(설계)한 사람은 누구일까요?', ch: ['정조', '정약용', '장영실', '이천'], a: 1, ex: '정조가 『기기도설』을 내려 주자 정약용이 연구해 「기중가도설」을 썼습니다(『여유당전서』).' },
  { q: '정약용이 거중기를 연구할 때 참고한 책은?', ch: ['화성성역의궤', '동국여지승람', '기기도설', '천공개물'], a: 2, ex: '테렌츠·왕징의 『기기도설』(1627). 여기서 평행 도르래 대신 수평으로 늘어놓은 도르래를 택했습니다.' },
  { q: '거중기의 도르래(활차)는 모두 몇 개일까요?', ch: ['2개', '4개', '6개', '8개'], a: 3, ex: '중유량(고정) 4개 + 하유량(움직) 4개 = 8개. 그래서 줄이 8가닥으로 나뉩니다.' },
  { q: '움직 도르래 4개(줄 8가닥)면 드는 힘은 돌 무게의?', ch: ['1/2', '1/4', '1/8', '1/16'], a: 2, ex: '줄 8가닥이 나누어 받으므로 힘은 1/8. 대신 줄은 8배 길이 당깁니다(일의 원리).' },
  { q: '돌을 1m 들어 올리려면 밧줄을 몇 m 감아야 할까요?', ch: ['1m', '2m', '4m', '8m'], a: 3, ex: '힘이 1/8이 된 만큼 거리는 8배. 힘×거리(일)는 그대로입니다.' },
  { q: '얼레(축바퀴)의 역할은?', ch: ['줄의 방향만 바꾼다', '돌의 무게를 줄인다', '돌리는 힘을 더 줄인다', '줄을 짧게 만든다'], a: 2, ex: '축바퀴는 힘을 축 반지름 ÷ 나무살 길이(75:600 = 1/8)만큼 더 줄입니다. 돌의 무게 자체는 그대로입니다. 기중가도설의 "자루:기둥 10:1"이 같은 원리입니다.' },
  { q: '좌우 얼레를 같은 속도로 감아야 하는 까닭은?', ch: ['소리가 작아서', '돌이 수평을 유지해서', '줄을 아끼려고', '더 빨리 오르려고'], a: 1, ex: '한쪽만 감으면 돌이 기울어집니다. 의궤에도 좌우를 고르게 감으라는 주의가 기록되어 있습니다.' },
  { q: '"거중기로 경비 4만 냥을 아꼈다"는 기록이 나오는 글은?', ch: ['자찬묘지명', '기기도설', '화성성역의궤', '기중가도설'], a: 0, ex: '정약용이 자기 묘지명에 직접 써 두었습니다(총공사비 약 87만 냥의 약 4.6%).' },
];
let quizDone = [];
function renderQuiz() {
  const box = $('quizbox');
  box.innerHTML = '<b id="quizScore">문제 풀기 — ' + quizScore + ' / ' + QUIZ.length + '점</b><button id="qrerun" style="float:right">다시 풀기</button>'
    + QUIZ.map((q, i) => `<div class="qq" data-i="${i}"><b class="q">${i + 1}. ${q.q}</b><div class="ch">${q.ch.map((c, j) => `<button data-j="${j}">${'①②③④'[j]} ${c}</button>`).join('')}</div><div class="ex" hidden></div></div>`).join('');
  box.querySelectorAll('.qq').forEach(qq => {
    qq.querySelectorAll('.ch button').forEach(b => b.onclick = () => {
      const i = +qq.dataset.i, j = +b.dataset.j, q = QUIZ[i];
      if (quizDone[i]) return;
      quizDone[i] = true;
      qq.querySelectorAll('.ch button').forEach(x => { x.disabled = true; if (+x.dataset.j === q.a) x.classList.add('ok'); });
      if (j !== q.a) b.classList.add('no'); else quizScore++;
      const ex = qq.querySelector('.ex'); ex.hidden = false;
      ex.innerHTML = (j === q.a ? '<b>정답!</b> ' : '<b>아쉬워요 — 정답은 ' + '①②③④'[q.a] + '</b> ') + q.ex;
      $('quizScore').textContent = '문제 풀기 — ' + quizScore + ' / ' + QUIZ.length + '점' + (quizDone.filter(Boolean).length === QUIZ.length ? ` · 완료! ${quizScore === QUIZ.length ? '만점이에요!' : '다시 풀어 보세요'}` : '');
    });
  });
  box.querySelector('#qrerun').onclick = () => { quizScore = 0; quizDone = []; renderQuiz(); };
}
$('quizb').onclick = () => { const b = $('quizbox'); b.hidden = !b.hidden; $('quizb').classList.toggle('on', !b.hidden); if (!b.hidden && !quizDone.length) renderQuiz(); };

// ---------- 탭 ----------
const BOX_BUILD = ['buildbox', 'info', 'list'], TABS = { tBuild: 'build', tSci: 'sci', tCtrl: 'ctrl', tMars: 'mars' };
function setMode(m) {
  mode = m; stop();
  Object.keys(TABS).forEach(id => $(id).classList.toggle('on', TABS[id] === m));
  BOX_BUILD.forEach(id => $(id).hidden = m !== 'build');
  $('scibox').hidden = m !== 'sci'; $('ctrlbox').hidden = m !== 'ctrl'; $('marsbox').hidden = m !== 'mars';
  nowBox.hidden = m !== 'build'; $('mvhint').hidden = m !== 'build';
  WORKERG.visible = m === 'ctrl';
  marsG.visible = m === 'mars'; cartG.visible = m === 'mars'; arrowG.visible = false;
  if (m !== 'mars') ['chainL', 'chainR', 'bars'].forEach(k => (MV.get(k) || []).forEach(o => o.g.visible = true));
  if (m !== 'sci' && sciKey) setSci(null);
  if (m !== 'mars') marsPhase = '';
  if (m === 'ctrl') { intro = true; cur = N; show(N); camAnim = { t0: performance.now(), from: [TGT.clone(), az, el, dist], to: [toW(0, 0, 2400), 0, .18, 13000] }; dirty = true }
  if (m === 'mars') { intro = true; cur = N; show(N); goCam('mars'); marsUI(sim.scene(marsT)); }
  if (m === 'build') { viewMode = 'all'; document.querySelectorAll('#vm button').forEach(x => x.classList.toggle('on', x.dataset.m === 'all')); show(cur); dirty = true }
}
Object.keys(TABS).forEach(id => $(id).onclick = () => setMode(TABS[id]));

// ---------- 부재 배치 ----------
const tmpM = new THREE.Matrix4(), tmpR = new THREE.Matrix4(), tmpR2 = new THREE.Matrix4(), tmpV = new THREE.Vector3();
function placeAll(P, SP) {
  for (const o of ALL) {
    if (o.dyn) continue;
    const M = new THREE.Matrix4();
    const p = (mode === 'ctrl' || mode === 'mars') && o.mv ? P[o.mv] : null;
    if (p && p.ang) { tmpV.set(...p.ax).normalize();
      M.makeTranslation(p.piv[0], p.piv[1], p.piv[2]).multiply(tmpR.makeRotationAxis(tmpV, p.ang)).multiply(tmpM.makeTranslation(-p.piv[0], -p.piv[1], -p.piv[2])); }
    if (p && p.pos) M.premultiply(tmpM.makeTranslation(...p.pos));
    const sp = (mode === 'ctrl' || mode === 'mars') && o.spin ? SP[o.spin] : null;
    if (sp && sp.ang) { tmpV.set(...o.sax).normalize();
      M.multiply(tmpR2.makeTranslation(o.spiv[0], o.spiv[1], o.spiv[2])).multiply(tmpR.makeRotationAxis(tmpV, sp.ang)).multiply(tmpM.makeTranslation(-o.spiv[0], -o.spiv[1], -o.spiv[2])); }
    if (o.off[0] || o.off[1] || o.off[2]) M.premultiply(tmpM.makeTranslation(...o.off));
    o.g.matrix.copy(M); o.g.matrixWorldNeedsUpdate = true;
  }
}
let ropeSig = '';
function updRopes(st) {
  const sig = Math.round(st.lift) + '|' + Math.round(st.tilt * 1e5);
  if (sig === ropeSig) return; ropeSig = sig;
  for (const k of ['ropeL', 'ropeR']) { const o = ROPE[k]; if (!o) continue; o.mesh.geometry.dispose(); o.mesh.geometry = ropeGeo(st.ropePath[ropeKey(k)]) }
}

// ---------- 그리기 루프 ----------
const fpsAcc = { n: 0, t: 0 };
let last = performance.now(), dirty = true, ready = false, prevLift = 0, creakT = 0, armT = 0;
(function loop(t) {
  requestAnimationFrame(loop); const dt = Math.min(.25, Math.max(0, (t - last) / 1000)); last = t;   // 느린 PC에서도 실제 시간대로 진행
  // 가벼운 모드: 3초 평균이 20fps보다 낮으면 그림자를 끄고 해상도를 1배로
  fpsAcc.n++; fpsAcc.t += dt; if (fpsAcc.t >= 3) { fpsNow = fpsAcc.n / fpsAcc.t; fpsAcc.n = 0; fpsAcc.t = 0;
    if (!lightMode && ready && fpsNow < 20) { lightMode = true; ren.shadowMap.enabled = false; dl.castShadow = false; ren.setPixelRatio(1); size();
      sc.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true) }); $('lite').hidden = false; dirty = true } }
  if (camAnim) { const u = Math.min(1, (performance.now() - camAnim.t0) / 900), e = 1 - Math.pow(1 - u, 3); TGT.lerpVectors(camAnim.from[0], camAnim.to[0], e); az = camAnim.from[1] + (camAnim.to[1] - camAnim.from[1]) * e; el = camAnim.from[2] + (camAnim.to[2] - camAnim.from[2]) * e; dist = camAnim.from[3] + (camAnim.to[3] - camAnim.from[3]) * e; setCam(); if (u >= 1) camAnim = null }
  const now = performance.now(); for (let k = ret.length - 1; k >= 0; k--) { const o = ret[k]; if (!o.ret) { ret.splice(k, 1); continue } const u = Math.min(1, (now - o.ret.t0) / o.ret.dur), e = 1 - Math.pow(1 - u, 3); o.off = o.ret.from.map(v => v * (1 - e)); dirty = true; if (u >= 1) { o.ret = null; ret.splice(k, 1) } }

  let P = null, SP = null, st = null;
  if (mode === 'ctrl' && ready) {
    const canW = !sim.crane({ ...ctrl, thL: 0, thR: 0 }).perWorker(ctrl.workers).tooHeavy;
    if (canW) {
      if (wind.L) ctrl.thL = Math.max(0, Math.min(TH_MAX, ctrl.thL + wind.L * WIND_RATE * dt));
      if (wind.R) ctrl.thR = Math.max(0, Math.min(TH_MAX, ctrl.thR + wind.R * WIND_RATE * dt));
    }
    st = sim.crane(ctrl); P = {}; SP = {};
    lastLift = st.lift; lastTilt = st.tilt;
    const tiltAng = -st.tilt;
    P.lower = { pos: [0, 0, st.lift], ang: tiltAng, piv: [0, 0, sim.LOWER_Z0], ax: [0, 1, 0] };
    P.chainL = P.chainR = P.stone = P.bars = P.lower;
    // 왼쪽(x<0) 부재는 오른쪽의 거울상이라 반대 방향으로 돈다
    ['u0', 'u1', 'u2', 'u3'].forEach((k, i) => SP[k] = { ang: (i < 2 ? -1 : 1) * st.sheaveAngles[i] });
    ['d0', 'd1', 'd2', 'd3'].forEach((k, i) => SP[k] = { ang: (i < 2 ? -1 : 1) * st.sheaveAngles[4 + i] });
    SP.bw0 = { ang: st.bigWheelAngles[0] }; SP.bw1 = { ang: -st.bigWheelAngles[1] };
    SP.axL = { ang: -ctrl.thL }; SP.axR = { ang: ctrl.thR };
    updRopes(st);
    updReads(st, st.perWorker(ctrl.workers));
    const winding = canW && (wind.L || wind.R);
    if (winding) { creakT += dt; if (creakT > .16) { creak(); creakT = 0 } }
    if (st.lift < prevLift - 1 && st.lift <= .5 && prevLift > 40) thud();
    prevLift = st.lift;
    armT += dt;
    WORKERS.forEach(w => { w.grp.visible = w.i < ctrl.workers;
      w.torso.rotation.y = winding ? -.16 + Math.sin(armT * 3 + w.i * .8) * .05 : 0;
      w.arms.forEach(a => a.rotation.y = -.55 + (winding ? Math.sin(armT * 6 + w.i * 1.3) * .18 : 0)); });
    dirty = true;
  } else if (mode === 'mars' && ready) {
    if (marsPlaying) setMars(marsT + dt * marsSpeed);
    st = sim.scene(marsT); P = {}; SP = {};
    lastLift = st.lift; lastTilt = 0;
    const cst = sim.crane({ thL: st.thL, thR: st.thR });
    P.lower = { pos: [0, 0, st.lift] };
    P.chainL = P.chainR = P.bars = P.lower;
    P.stone = { pos: st.stoneOff, ang: st.stoneOn === 'cart' ? st.cartRot : 0, ax: [0, 0, 1], piv: [0, 0, 0] };   // 실린 돌은 유형거와 함께 돈다
    ['u0', 'u1', 'u2', 'u3'].forEach((k, i) => SP[k] = { ang: (i < 2 ? -1 : 1) * cst.sheaveAngles[i] });
    ['d0', 'd1', 'd2', 'd3'].forEach((k, i) => SP[k] = { ang: (i < 2 ? -1 : 1) * cst.sheaveAngles[4 + i] });
    SP.bw0 = { ang: cst.bigWheelAngles[0] }; SP.bw1 = { ang: -cst.bigWheelAngles[1] };
    SP.axL = { ang: -st.thL }; SP.axR = { ang: st.thR };
    updRopes(cst);
    cartG.position.set(st.cartX, st.cartY, 0); cartG.rotation.z = st.cartRot;
    cartWheels.forEach(w => w.rotation.x = st.cartDist / 300);
    arrowG.visible = st.phase === 'nokro';
    const chOn = st.chainsOn;
    marsChainsOn = chOn;
    if (st.stoneOn === 'cart' && prevStoneOn !== 'cart') thud();
    prevStoneOn = st.stoneOn;
    marsPhase = st.phase;
    const wShow = st.phaseIndex <= 3;
    WORKERG.visible = wShow;
    const winding = wShow && (st.phase === 'raise' || st.phase === 'lower');
    armT += dt;
    WORKERS.forEach(w => { w.grp.visible = true;
      w.torso.rotation.y = winding ? -.16 + Math.sin(armT * 3 + w.i * .8) * .05 : 0;
      w.arms.forEach(a => a.rotation.y = -.55 + (winding ? Math.sin(armT * 6 + w.i * 1.3) * .18 : 0)); });
    marsUI(st);
    dirty = true;
  }

  const moving = ret.length > 0 || !!drag || S.some((s, i) => s.v !== ((i < cur && s.ready) ? 1 : 0)) || (mode === 'ctrl' && ready) || (mode === 'mars' && ready);
  if (!dirty && !moving) return; dirty = false;
  placeAll(P, SP);
  S.forEach((s, i) => {
    const tgt = (s.ready && (mode === 'build' ? i < cur : true)) ? 1 : 0; s.v += (tgt - s.v) * Math.min(.12, .12 * 1300 / (timer ? spd() : 1300)); if (Math.abs(tgt - s.v) < .002) s.v = tgt;
    const isCur = mode === 'build' && i === cur - 1 && !intro; let op = Math.min(1, s.v * 1.5);
    if (mode === 'build' && viewMode === 'ghost' && !isCur) op *= .13;
    const vis = s.v > .01 && !(mode === 'build' && viewMode === 'solo' && !isCur && !intro); s.g.visible = vis;
    if (ghostAll) op *= .35;
    s.objs.forEach(o => { const hv = o === hoverO; let oo = hv ? Math.max(op, .92) : op;
      const hiO = mode === 'sci' && hiObjs.has(o);
      if (mode === 'sci' && hiObjs.size) oo = hiO ? 1 : .13;
      const isChain = o.mv === 'chainL' || o.mv === 'chainR' || o.mv === 'bars';
      o.g.visible = oo > .01 && !(mode === 'mars' && isChain && !marsChainsOn);
      o.mat.opacity = oo; o.mat.depthWrite = oo > .9; o.mesh.castShadow = oo > .9;
      o.mat.emissive.setHex(hv ? 0x6a3a00 : (hiO ? 0x8a5515 : (isCur && viewMode !== 'solo' ? 0x3a2200 : 0)));
      if (o.emat) { o.emat.visible = edgeOn; o.eg.visible = edgeOn && (oo > .5 || ghostAll && oo > .1) } });
    s.g.position.z = (1 - s.v) * 700;
  });
  ren.render(sc, cam);
})(performance.now());

size(); setCam(); setMode('build'); show(N);
buildAll();
