
// ================= 자격루(自擊漏, 1434 세종) =================
// 근거: 「보루각기」(세종실록 16년 7월 1일) — 주척 1자 = 20.7cm 환산(남문현·한영호 1996)
// 기구 해석: 남문현 『장영실과 자격루』의 그림 3-1~3-8, 김종성(2023) 「방목의 구조와 작동원리에 대한 새로운 가설」
// 물그릇 모양·크기: 1536년 유물 / 나머지는 교육용 가정값 (앱의 「치수와 자료의 출처」에 구분)
import * as SM from './sim.js';
const { VS, SS, LID, BM, PL, ROD, CROSS, FLOAT, L0, SB, IB, BOARD, GZ, TUBE, holeD, holeX, tubeP, RU, cw, dOf, CH, CWALL, LV, FINGER, SBOX, ARM, bw, BAY, S12, HM, WH, GK, TL, TR, YG, YJ, FIG, INST, BIN, RAMP, rodTop0, holeZ, runEvents, SIH, SI, JEOLGI } = SM;
export { SM };
export const export_prof = {};

export function buildModel(opt = {}) {
const jeolgi = opt.jeolgi ?? 0;
const G = {}, steps = [];
const group = (key, info) => { G[key] = { key, ...info, members: [] } };
const step = (key, label, members) => { steps.push({ key, label, members }); G[key].members.push(...members) };
const mem = (label, col, node, x = {}) => ({ label, col, node, ...x });
const WD = '#6b3a22', WD2 = '#7a4428', WL = '#9a6a43', STN = '#8f8a80', BR = '#7a6b48', CU = '#b8743c', FE = '#3b3a3a', RED = '#8e2a1e', GRN = '#2f5a4a';
const th = BOARD.th, MB = mul(T(BOARD.x0, 0, BOARD.z0), Ry(th));
const onB = n => xform(n, MB);                         // 광판 국소좌표 → 세계

// ===== 1. 누대 =====
group('01_nudae', { n: '누대(다락)', hj: '樓', col: WD, mat: 'wood',
  desc: '「보루각기」: 가운데 칸에 다락(樓)을 설치하여 위에는 파수호를 벌여 놓고 아래에는 수수호를 둔다. 물이 높은 곳에서 낮은 곳으로 차례로 흐르도록 대·중·소 파수호를 계단식으로 올려놓습니다.',
  dim: '마루 높이 2,600 · 너비 2,300 × 깊이 1,600, 대파수호 받침 높이 1,100, 중파수호 받침 높이 500 (가정값)' });
const NX0 = -3350, NX1 = -1050, NY = 800, DZ = 2600;
// 짜맞춤 도우미: 두 기둥 면 사이에 거는 가로재 + 양 끝 장부(tenon), 기둥에 팔 장부구멍(mortise, 1mm 여유)
const tenonBeam = (axis, a, b, c, z0, z1, w, L) => { const h = z1 - z0, tw = Math.max(20, Math.round(w / 3)), th = h - 2 * Math.round(h / 6), zc = (z0 + z1) / 2;
  const B = (u0, u1, ww, hh) => axis === 'x' ? box([(u0 + u1) / 2, c, zc], [u1 - u0, ww, hh]) : box([c, (u0 + u1) / 2, zc], [ww, u1 - u0, hh]);
  return { beam: uni(B(a, b, w, h), B(a - L, a, tw, th), B(b, b + L, tw, th)), mort: [B(a - L - 1, a + 1, tw + 2, th + 2), B(b - 1, b + L + 1, tw + 2, th + 2)] } };
const PX = [NX0 + 75, -2200, NX1 - 75], PY = [-NY + 75, NY - 75], PH = DZ - 280;
const nuBeams = [], nuMort = [];
for (const y of PY) for (const [a, b] of [[PX[0] + 75, PX[1] - 75], [PX[1] + 75, PX[2] - 75]]) for (const [z0, z1, w] of [[DZ - 460, DZ - 280, 120], [300, 450, 100]]) { const t = tenonBeam('x', a, b, y, z0, z1, w, 50); nuBeams.push([z0 > 1000 ? '누대 창방(장부 맞춤)' : '누대 하인방(장부 맞춤)', t.beam]); nuMort.push(...t.mort) }
const topTenon = (x, y) => box([x, y, PH + 45], [60, 60, 90]), topMort = (x, y) => box([x, y, PH + 45], [62, 62, 92]);
const posts = []; for (const x of PX) for (const y of PY) posts.push(uni(diff(box([x, y, PH / 2], [150, 150, PH]), ...nuMort), topTenon(x, y)));
step('01_nudae', '기둥', posts.map(n => mem('누대 기둥(위에 장부, 옆에 장부구멍)', WD, n, { mat: 'wood' })));
step('01_nudae', '창방·하인방', nuBeams.map(([l, n]) => mem(l, WD2, n, { mat: 'wood' })));
step('01_nudae', '보', PX.map(x => mem('누대 보(기둥 장부를 받는 장부구멍)', WD2, diff(box([x, 0, DZ - 190], [150, 2 * NY, 180]), ...PY.map(y => topMort(x, y))), { mat: 'wood' })));
step('01_nudae', '마루널', Array.from({ length: 8 }, (_, i) => mem('누대 마루널', WL, box([(NX0 + NX1) / 2, -NY + 100 + 200 * i, DZ - 50], [NX1 - NX0, 198, 100]), { mat: 'wood' })));
const P_DAE = { x: -2825, y: 0, z: 3700 }, P_JUNG = { x: -2025, y: 0, z: 3100 }, P_SO = { x: -1350, y: 0, z: DZ }, P_PYE = { x: -1300, y: -400, z: 0 };
step('01_nudae', '파수호 받침대', [
  mem('대파수호 받침대', WD2, box([-2840, 0, (DZ + P_DAE.z) / 2], [980, 1000, P_DAE.z - DZ]), { mat: 'wood' }),
  mem('중파수호 받침대', WD2, box([-2025, 0, (DZ + P_JUNG.z) / 2], [650, 700, P_JUNG.z - DZ]), { mat: 'wood' })]);

// ===== 2. 파수호 4개 =====
group('02_pasu', { n: '파수호 4개', hj: '播水壺', col: BR, mat: 'bronze',
  desc: '물을 「보내는」 그릇입니다. 「보루각기」에는 크기가 다른 파수호가 4개라고 했습니다. 대파수호 → 중파수호 → 소파수호로 차례로 물을 흘려보내는 동안 소파수호의 물높이가 일정해져 수수호로 늘 같은 양의 물이 들어갑니다. 정해진 물높이를 넘는 물은 옆의 폐호(감수앙)로 넘쳐 빠지게 하는 「일류(溢流)」 방식으로 봅니다(남문현). 소파수호의 물높이를 바닥에서 12cm로 두면 수수호 물이 2시간에 16.6cm씩 올랐습니다(남문현·한영호 1996 모의실험).',
  dim: '대파수호 최대 지름 940 · 높이 710, 소파수호 최대 지름 465 · 높이 405 (1536년 유물) / 중파수호 지름 600 · 높이 520, 폐호는 소파수호와 같은 크기 (가정값). 4번째 그릇을 폐호로 보는 것은 남문현의 해석이며 다른 견해(김종성 2023)도 있습니다.' });
const smooth = (P, n = 6) => { const out = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
  for (let s = 1; s <= n; s++) { const t = s / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))) } } return out.map(([r, z]) => [Math.round(r * 10) / 10, Math.round(z * 10) / 10]) };
const jarO = (rb, rm, rt, H) => [...smooth([[rb, 0], [rb * 1.12, H * .08], [rm * .93, H * .3], [rm, H * .52], [rm * .95, H * .72], [rt * 1.04, H * .9], [rt, H * .96]]), [rt * 1.08, H]];
const PDAE = jarO(270, 470, 395, 710), PJUNG = jarO(170, 300, 250, 520), PSO = jarO(135, 232.5, 195, 405);
export_prof.dae = PDAE; export_prof.jung = PJUNG; export_prof.so = PSO;
export_prof.pos = { dae: P_DAE, jung: P_JUNG, so: P_SO, pye: P_PYE };
step('02_pasu', '대파수호', [mem('대파수호', BR, lat([P_DAE.x, P_DAE.y, P_DAE.z], jarPts(PDAE, 12, 18), 64), { mat: 'bronze', cut: 0 })]);
step('02_pasu', '중파수호', [mem('중파수호', BR, lat([P_JUNG.x, 0, P_JUNG.z], jarPts(PJUNG, 10, 15), 64), { mat: 'bronze', cut: 0 })]);
step('02_pasu', '소파수호', [mem('소파수호', BR, lat([P_SO.x, P_SO.y, P_SO.z], jarPts(PSO, 8, 15), 64), { mat: 'bronze', cut: 0 })]);
step('02_pasu', '폐호(넘친 물 받는 그릇)', [mem('폐호(감수앙)', BR, lat([P_PYE.x, P_PYE.y, P_PYE.z], jarPts(PSO, 8, 15), 64), { mat: 'bronze', cut: P_PYE.y })]);

// ===== 3. 물길 관 =====
group('03_gwan', { n: '물길 관', hj: '注水管', col: CU, mat: 'copper',
  desc: '파수호 사이와 소파수호에서 수수호로 물을 보내는 관입니다. 「보루각기」에는 물이 나오는 주둥이를 용 모양으로 장식했다고 했습니다. 소파수호에서 두 수수호로 가는 관이 있어 하루씩 번갈아 물을 넣고, 넘치는 물은 넘침관으로 폐호에 떨어집니다.',
  dim: '바깥지름 24 (가정값) — 관은 유물로 남아 있지 않음' });
const pipe = (pts, d = 24) => uni(...pts.slice(1).map((q, i) => rod(pts[i], q, d, 16)), ...pts.slice(1, -1).map(p => sph(p, d / 2)));
step('03_gwan', '물길 관', [
  mem('대파수호 → 중파수호 관', CU, pipe([[-2445, 0, 3760], [-2120, 0, 3700], [-2100, 0, 3640]]), { mat: 'copper' }),
  mem('중파수호 → 소파수호 관', CU, pipe([[-1740, 0, 3150], [-1420, 0, 3060], [-1400, 0, 3030]]), { mat: 'copper' }),
  mem('소파수호 → 앞 수수호 관', CU, pipe([[-1160, -60, 2665], [-780, -330, 2580], [-770, -330, 2520]]), { mat: 'copper' }),
  mem('소파수호 → 뒤 수수호 관', CU, pipe([[-1160, 60, 2665], [-780, 330, 2580], [-770, 330, 2520]]), { mat: 'copper' }),
  mem('넘침관(소파수호 → 폐호)', CU, pipe([[-1160, -120, 2735], [-1010, -120, 2705], [-1010, -120, 520], [-1300, -400, 425]], 20), { mat: 'copper' })]);

// ===== 4. 수수호 =====
group('04_susu', { n: '수수호 2개', hj: '受水壺', col: BR, mat: 'bronze',
  desc: '물을 「받는」 원통 그릇입니다. 「보루각기」: 몸체에 용을 새긴 수수호는 2개로, 물을 바꿀 때 번갈아 사용한다. 일정한 양의 물이 들어오므로 물높이가 시간에 비례해 올라갑니다. 하나로 하루(24시간)를 재는 동안 다른 하나는 물을 빼고(사이펀) 다음 날을 준비합니다.',
  dim: '길이 11자 2치(2,318) · 지름 1자 8치(373) (보루각기) / 벽 15 · 받침돌 600×600×200 (가정값)' });
const vessel = c => lat([c.x, c.y, SS.zb], jarPts([[SS.od / 2, 0], [SS.od / 2 + 8, 0], [SS.od / 2 + 8, 70], [SS.od / 2, 70], [SS.od / 2, SS.H - 70], [SS.od / 2 + 8, SS.H - 70], [SS.od / 2 + 8, SS.H]], SS.wall + 8, SS.bot), 64);
const VN = ['앞(남)', '뒤(북)'];
step('04_susu', '받침돌', VS.map((c, i) => mem(VN[i] + ' 수수호 받침돌', STN, diff(box([c.x, c.y, 100], [600, 600, 200]), cyl([c.x, c.y, 195], SS.od + 30, SS.od + 30, 12, 48)), { mat: 'stone' })));
step('04_susu', '수수호', VS.map((c, i) => mem(VN[i] + ' 수수호', BR, vessel(c), { mat: 'bronze', cut: c.y })));
const lid = c => diff(cyl([c.x, c.y, SS.zt + LID.t / 2], SS.od + 20, SS.od + 20, LID.t, 64),
  box([c.x, c.y, SS.zt + LID.t / 2], [ROD.s + 10, ROD.s + 10, LID.t + 4]), cyl([-770, c.y, SS.zt + LID.t / 2], 30, 30, LID.t + 4, 16));
step('04_susu', '뚜껑', VS.map((c, i) => mem(VN[i] + ' 수수호 뚜껑', BR, lid(c), { mat: 'bronze', cut: c.y })));

// ===== 5. 부표와 잣대 =====
group('05_jeon', { n: '부표·잣대·가로쇠', hj: '浮箭 · 橫鐵', col: '#c8a878', mat: 'wood',
  desc: '수수호 물에 띄운 부표에 잣대(살대)를 꽂았습니다. 「보루각기」: 잣대 머리 위에 젓가락처럼 생긴 가로쇠(橫鐵)를 붙이는데 길이는 4치 5푼이다. 가로쇠 길이는 두 동판 너비의 합(2치 + 2치 5푼)과 같아서, 가로쇠 하나가 왼쪽(12시) 동판과 오른쪽(경점) 동판의 걸쇠를 모두 밀 수 있습니다(김종성 2023). 가로쇠 두 끝은 방목 벽의 홈(隔)에 끼워져 잣대가 기울지 않고 곧게 오르내립니다(국역 주석).',
  dim: '잣대 길이 10자 2치(2,111), 가로쇠 4치 5푼(93) (보루각기) / 잣대 단면 20×20, 부표 지름 270 · 높이 150 (가정값)' });
const fz0 = SS.zb + SS.bot + L0 - FLOAT.draft;
VS.forEach((c, i) => {
  const id = 'AB'[i];
  step('05_jeon', VN[i] + ' 부표·잣대', [
    mem(VN[i] + ' 부표', '#a58a5c', cyl([c.x, c.y, fz0 + FLOAT.h / 2], FLOAT.d, FLOAT.d - 20, FLOAT.h, 48), { mat: 'wood', mv: 'rod' + id, cut: c.y }),
    mem(VN[i] + ' 잣대(12시·경점 눈금)', '#d9c08f', box([c.x, c.y, rodTop0 - ROD.L / 2], [ROD.s, ROD.s, ROD.L]), { mat: 'woodL', mv: 'rod' + id }),
    mem(VN[i] + ' 가로쇠(젓가락 모양)', FE, box([c.x, c.y, rodTop0 - CROSS.h / 2], [CROSS.t, CROSS.L, CROSS.h]), { mat: 'iron', mv: 'rod' + id })]);
});

// ===== 6. 방목·동판 =====
group('06_bangmok', { n: '방목과 동판 2개', hj: '方木 · 銅板', col: WD, mat: 'wood',
  desc: '「보루각기」: 수수호 위에 방목을 세우는데 속은 비어 있고 표면을 틔운다(中空面虛). 빈 공간에 隔을 두는데 표면으로부터 1치쯤 들어가 있다. 왼쪽 동판(너비 2치, 구멍 12)은 12시를, 오른쪽 동판(너비 2치 5푼, 구멍 25)은 경·점을 맡고, 구멍마다 여닫는 장치가 있다. 경점 동판은 절기에 따라 12개를 바꿔 쓴다. — 이 앱은 김종성(2023)의 가설대로 두 동판을 엇갈리게(12시 동판은 왼쪽 뒤, 경점 동판은 오른쪽 앞) 두고, 떨어진 작은 구슬이 동판 바깥쪽 통로(隔)를 따라 방목 안에서 내려와 아래로 빠져나가게 했습니다. 방목 밖에 구슬을 받는 바구니는 두지 않았습니다.',
  dim: '길이 11자 4치(2,360) · 너비 6치(124) · 두께 8푼(17), 동판 너비 2치(41) · 2치 5푼(52) (보루각기) / 단면 6치×6치와 「깊이 4치」=수수호에 꽂힌 깊이로 읽은 것은 김종성(2023)의 해석, 동판 두께 2.5 · 구멍 지름 19 (가정값)' });
const RE = runEvents(jeolgi);
const zS = RE.filter(e => e.kind === 's').map(e => holeZ(e.rise)), zN = RE.filter(e => e.kind !== 's').map(e => holeZ(e.rise));
const bmBody = c => { const h = BM.L, zc = (BM.z0 + BM.z1) / 2, W = BM.w, t = BM.t;
  return diff(box([c.x, c.y, zc], [W, W, h]),
    box([c.x + t / 2 + 1, c.y, zc + 30], [W - t + 2 + 4, W - 2 * t, h + 70]),                                  // 속(앞면=동쪽 열림)
    box([c.x, c.y + W / 2 - t + 2, zc], [CROSS.t + 4, 8, h + 10]), box([c.x, c.y - W / 2 + t - 2, zc], [CROSS.t + 4, 8, h + 10])) }; // 가로쇠 홈(隔)
const plateN = (c, p, zs) => { const w = p.v1 - p.v0;
  return diff(box([c.x + p.u, c.y + (p.v0 + p.v1) / 2, (BM.z0 + 60 + BM.z1 - 10) / 2], [2.5, w, BM.z1 - BM.z0 - 70]),
    ...zs.map(z => { const n = cyl([0, 0, 0], 19, 19, 8, 16); n.M = mul(T(c.x + p.u, c.y + p.vc, z), Ry(90)); return n })) };
const sheetN = (c, p) => { const out = p.dir < 0 ? [-45, -22] : [22, 45]; const sv = p.dir < 0 ? p.v0 - 2 : p.v1 + 2;
  return uni(box([c.x + (out[0] + out[1]) / 2, c.y + sv, (BM.z0 + 50 + BM.z1 - 10) / 2], [out[1] - out[0], 2, BM.z1 - BM.z0 - 60]),
    p.dir > 0 ? box([c.x + 46, c.y + (p.v0 + p.v1) / 2, (BM.z0 + 50 + BM.z1 - 10) / 2], [2, p.v1 - p.v0 + 4, BM.z1 - BM.z0 - 60]) : null) };
const chuteN = (c, p) => { const u0 = p.dir < 0 ? -45 : 22; return prof([[u0, BM.z0 + 26], [62, BM.z0 + 14], [62, BM.z0 + 18], [u0, BM.z0 + 30]], 18, [c.x, c.y + p.vc, 0], [1, 0, 0], [0, 0, 1]) };
VS.forEach((c, i) => {
  const id = 'AB'[i];
  step('06_bangmok', VN[i] + ' 방목', [mem(VN[i] + ' 방목', WD, bmBody(c), { mat: 'wood', cut: c.y - 47 }),
    mem(VN[i] + ' 방목 안 통로 칸막이(隔)', CU, uni(sheetN(c, PL.s), sheetN(c, PL.n)), { mat: 'copper' }),
    mem(VN[i] + ' 방목 바닥 구슬 길', CU, uni(chuteN(c, PL.s), chuteN(c, PL.n)), { mat: 'copper' })]);
  step('06_bangmok', VN[i] + ' 12시 동판', [mem(VN[i] + ' 12시 동판(왼쪽, 구멍 12)', CU, plateN(c, PL.s, zS), { mat: 'copper' })]);
  step('06_bangmok', VN[i] + ' 경점 동판', [mem(VN[i] + ' 경점 동판(오른쪽, 구멍 25 · ' + JEOLGI[jeolgi] + ')', CU, plateN(c, PL.n, zN), { mat: 'copper', seasonal: true })]);
  const latch = (p, z, k, t) => { const u0 = p.u - p.dir * 1.25, u1 = -p.dir * 4; return mem(VN[i] + (t === 's' ? ' 12시' : ' 경점') + ' 걸쇠 ' + (k + 1), CU,
    box([c.x + (u0 + u1) / 2, c.y + p.vc, z - SB.r - 1.5], [Math.abs(u1 - u0), 10, 3]),
    { mat: 'copper', mv: 'la' + id + t + '_' + k, piv: [c.x + u0, c.y + p.vc, z - SB.r - 1.5], ax: [0, 1, 0], seasonal: t === 'n' }) };
  step('06_bangmok', VN[i] + ' 걸쇠', [...zS.map((z, k) => latch(PL.s, z, k, 's')), ...zN.map((z, k) => latch(PL.n, z, k, 'n'))]);
});

// ===== 7. 작은 구리구슬 =====
group('07_sball', { n: '작은 구리구슬', hj: '銅小丸', col: '#d39a5a', mat: 'copperB',
  desc: '「보루각기」: 탄환만 한 크기의 작은 구리구슬. 동판 구멍마다 하나씩 놓여 있다가 잣대의 가로쇠가 걸쇠를 젖히면 떨어집니다. 물높이(아날로그)가 구슬 하나(디지털 신호)로 바뀌는 순간입니다. 두 수수호의 방목에 각각 37개(12+25)가 들어 있습니다.',
  dim: '방목마다 12시용 12개 · 경점용 25개 (보루각기) / 지름 16(8푼, 김종성 2023의 가정)' });
VS.forEach((c, i) => { const id = 'AB'[i];
  step('07_sball', VN[i] + ' 방목 구슬', [...zS.map((z, k) => mem('작은 구슬 · ' + SI[RE[k].si] + '시', '#d39a5a', sph([c.x + PL.s.u, c.y + PL.s.vc, z], SB.r), { mat: 'copperB', mv: 'sb' + id + 's_' + k })),
    ...zN.map((z, k) => mem('작은 구슬 · ' + (Math.floor(k / 5) + 1) + '경 ' + (k % 5 + 1) + '점', '#d39a5a', sph([c.x + PL.n.u, c.y + PL.n.vc, z], SB.r), { mat: 'copperB', mv: 'sb' + id + 'n_' + k, seasonal: true }))]);
});

// ===== 8. 광판과 구리 홈 =====
group('08_gwangpan', { n: '구슬받이(陷)와 광판(넓은 판)', hj: '陷 · 廣板', col: WL, mat: 'wood',
  desc: '「보루각기」: 수수호 앞에 구슬받이(陷)를 두고 넓은 판(광판)을 비스듬히 설치하는데, 위쪽은 방목 밑에 닿고 아래쪽은 동쪽 칸의 자리에 이른다. 2007년 복원품(서준)은 광판을 수수호 위에서 시보장치 궤의 가운데 층 위까지 걸치고, 연잎 모양 구슬받이에서 굴러 나온 작은 구리구슬이 광판의 홈을 타고 궤 안의 동통으로 들어가게 했습니다. 두 방목(하루씩 번갈아 씀)에서 12시 동통과 경점 동통으로 나뉘어 들어가도록 홈이 X자로 엇갈립니다.',
  dim: '길이 2,420 · 너비 880 · 두께 50, 기울기 2° (가정값) / 홈 안지름 18' });
const inv = ([x, y, z]) => { const c = Math.cos(th * Math.PI / 180), s = Math.sin(th * Math.PI / 180); return [(x - BOARD.x0) * c - (z - BOARD.z0) * s, y, (x - BOARD.x0) * s + (z - BOARD.z0) * c] };
const brd = box([BOARD.L / 2, 0, -BOARD.t / 2], [BOARD.L, BOARD.y1 - BOARD.y0, BOARD.t]);
step('08_gwangpan', '광판', [mem('광판(넓은 판)', WL, onB(brd), { mat: 'wood' }),
  mem('광판 받침 기둥', WD2, uni(...[500, 1350, 2200].flatMap(xl => [-400, 400].map(y => { const p = bw(xl, y, -BOARD.t); return box([p[0], y, p[2] / 2], [60, 60, p[2]]) }))), { mat: 'wood' })]);
const UPROF = [[-11, -11], [11, -11], [11, 4], [9, 4], [9, -9], [-9, -9], [-9, 4], [-11, 4]];
export_prof.outlet = (c, p) => [c.x + 70, c.y + p.vc, BM.z0 + 25];
const xl = x => (x - BOARD.x0) / Math.cos(th * Math.PI / 180);
// 홈 길(광판 국소): 출구 → (X자로 엇갈림) → 합류점 → 동통 입구
const gLocal = (c, t) => { const o = inv(export_prof.outlet(c, PL[t])), yt = TUBE[t].y; return [[o[0] - 8, o[1], GZ], [xl(1700), yt, GZ], [xl(2004), yt, GZ]] };
export_prof.gpath = (c, t) => gLocal(c, t).map(p => bw(...p));
const lotus = p => lat([p[0], p[1], p[2] - 13], [[0, 0], [12, 0], [34, 22], [31, 24], [10, 3], [0, 3]], 24);
// 홈은 바깥 몸통을 모두 합친 뒤 구슬 길(안쪽)을 한꺼번에 파냄 → X자로 엇갈리는 곳·합류하는 곳에 벽이 남지 않음
const UOUT = [[-11, -11], [11, -11], [11, 4], [-11, 4]], UIN = [[-9, -9], [9, -9], [9, 12], [-9, 12]];
const ext = (p, q, e) => { const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d), u = d.map(v => v / L); return [p.map((v, i) => v - u[i] * e), q.map((v, i) => v + u[i] * e)] };
const gOut = [], gIn = [], gLot = [];
VS.forEach(c => ['s', 'n'].forEach(t => { const g = gLocal(c, t);
  gOut.push(sweep(UOUT, g[0], g[1]), sweep(UOUT, ...ext(g[1], g[2], 0)), cyl([g[1][0], g[1][1], g[1][2] - 3.5], 22, 22, 15, 20));
  gIn.push(sweep(UIN, ...ext(g[0], g[1], 6)), sweep(UIN, ...ext(g[1], g[2], 6)), cyl([g[1][0], g[1][1], g[1][2] + 1.5], 18, 18, 21, 20));
  gLot.push(lotus(bw(xl(-555), c.y + PL[t].vc, GZ))) }));
step('08_gwangpan', '구슬받이·구리 홈', [mem('연잎 모양 구슬받이 4개', CU, uni(...gLot), { mat: 'copper' }), mem('X자로 엇갈린 구리 홈(엇갈리는 곳은 위가 트여 구슬이 지나감)', CU, onB(diff(uni(...gOut), ...gIn)), { mat: 'copper' })]);

// ===== 9. 철환 방출장치: 동통부와 통로 =====
group('09_dongtong', { n: '철환 방출장치(동통·통로)', hj: '銅筒 · 隔', col: CU, mat: 'copper',
  desc: '「보루각기」: 용도(甬道)처럼 4개의 칸막이(隔)를 만들고 달걀 크기의 쇠구슬을 놓으며, 구리통 2개를 그 위에 비스듬히 설치한다. 왼쪽 통(4자 5치)은 12시를 맡아 구멍 12개, 오른쪽 통(8자)은 경점을 맡아 구멍 25개. 2007년 복원품(서준)은 이 장치를 동쪽 칸(궤)의 가운데 층 위에 두었습니다. 동통은 입구에서 뒤로 갈수록 약간 내려가, 구슬이 너무 빨리 지나치지도 막히지도 않게 합니다. 처음 들어온 구슬은 첫 구멍으로 떨어지며 걸림판을 젖혀 그 구멍을 닫고, 다음 구슬은 그 위를 지나 두 번째 구멍으로 떨어집니다. 동통 아래 철환 방출부는 격벽으로 나뉜 통로 4줄입니다: ① 12시 쇠구슬 ② 횡기 머리(작은 구슬이 떨어지는 곳) ③ 경·초점 쇠구슬 ④ 점 쇠구슬. 모든 통로는 입구 쪽으로 내려가게 기울어 있습니다.',
  dim: '동통 4자 5치(932)·8자(1,656), 지름 1치 5푼(31) (보루각기) / 통로 길이 1,690, 기울기 0.7°, 동통 기울기 1° (가정값)' });
const onC = n => xform(n, mul(T(RU.x0, 0, RU.z0), Ry(-RU.a)));          // 통로 국소(x=d, z=h) → 세계
const dS = dOf(RU.xs), dE = dOf(RU.xe), dL = dE - dS;
const wallH = (y0, y1, h) => box([(dS + dE) / 2, (y0 + y1) / 2, h / 2], [dL, y1 - y0, h]);
step('09_dongtong', '통로 바닥과 격벽 5장', [mem('철환 방출부 바닥판(구슬 상자 구멍)', WD, onC(diff(box([(dS + dE) / 2, (CWALL[0][1] + CWALL[4][0]) / 2, -RU.base / 2], [dL, CWALL[0][1] - CWALL[4][0], RU.base]), box([dS + 17, CH.h, -RU.base / 2], [18, 70, RU.base + 4]))), { mat: 'wood' }),
  ...CWALL.map((w, i) => mem('격벽(隔) ' + (i + 1) + (i === 1 || i === 2 ? ' — 횡기 축 받침' : ''), WD2, onC(wallH(w[0], w[1], i === 1 || i === 2 ? LV.h - 12 : RU.wall)), { mat: 'wood' })),
  mem('통로 ② 서쪽 막음판', WD2, onC(box([dS + 4, CH.h, RU.wall / 2], [8, CWALL[1][0] - CWALL[2][1], RU.wall])), { mat: 'wood' }),
  mem('작은 구슬 받는 상자', WD, diff(box([SBOX.x, SBOX.y, SBOX.z], [70, 80, 90]), box([SBOX.x, SBOX.y, SBOX.z + 8], [56, 66, 90])), { mat: 'wood' }),
  mem('철환 방출부 매다는 막대', FE, uni(...[2120, 2900, 3650].flatMap(x => [250, -100].map(y => { const p = cw(dOf(x), y, RU.wall); return rod(p, [p[0], y, BAY.up], 10, 8) })), rod(cw(dS + 2, CH.h - 30, -RU.base), [SBOX.x, CH.h - 30, SBOX.z + 45], 6, 8), rod(cw(dS + 2, CH.h + 30, -RU.base), [SBOX.x, CH.h + 30, SBOX.z + 45], 6, 8)), { mat: 'iron' })]);
const ring = (x0, x1, ro, ri) => { const n = lat([0, 0, 0], [[ri, 0], [ro, 0], [ro, x1 - x0], [ri, x1 - x0]], 24); n.M = mul(T(x0, 0, 0), Ry(90)); return n };
const tubeN = tb => { const ro = TUBE.od / 2, ri = ro - 3, hw = 12, parts = []; let x = 0;
  for (let k = 0; k < tb.n; k++) { const hx = holeD(tb, k); parts.push(ring(x, hx - hw, ro, ri)); parts.push(diff(ring(hx - hw, hx + hw, ro, ri), cyl([hx, 0, -ro + 2], 18, 18, 10, 16))); x = hx + hw }
  parts.push(ring(x, tb.L, ro, ri)); parts.push(ring(tb.L, tb.L + 3, ro, 0.5)); return xform(uni(...parts), mul(T(tb.x0, tb.y, TUBE.z0), Ry(TUBE.a))) };
const tubeHang = tb => uni(...[0.08, 0.5, 0.92].map(f => { const p = tubeP(tb, tb.L * f, TUBE.od / 2); return rod(p, [p[0], tb.y, BAY.up], 8, 8) }));
step('09_dongtong', '12시 동통', [mem('12시 동통(구멍 12, 4자 5치)', CU, tubeN(TUBE.s), { mat: 'copper' }), mem('12시 동통 매다는 막대', FE, tubeHang(TUBE.s), { mat: 'iron' })]);
step('09_dongtong', '경점 동통', [mem('경점 동통(구멍 25, 8자)', CU, tubeN(TUBE.n), { mat: 'copper' }), mem('경점 동통 매다는 막대', FE, tubeHang(TUBE.n), { mat: 'iron' })]);

// ===== 10. 횡기(橫機) =====
group('10_sutgarak', { n: '횡기(橫機): 숟가락 모양 장치', hj: '橫機 · 匙機', col: FE, mat: 'iron',
  desc: '「보루각기」: 가로로 된 장치(機)의 모양이 숟가락과 비슷하다. 한쪽 끝은 둥글어 구슬을 받고, 가운데 허리에 둥근 축이 있어 오르내린다. 2007년 복원품(서준): 통로 ② 바로 위에서 두 동통의 구멍으로 떨어지는 작은 구슬을 횡기의 머리가 차례로 받는다. 머리가 내려가면 손잡이가 들려 그 앞에 막혀 있던 쇠구슬이 입구 쪽으로 굴러 나가고, 들린 손잡이는 그대로 멈춰 다음 쇠구슬이 굴러 나가는 데 방해가 되지 않는다. — 가벼운 작은 구슬로 무거운 쇠구슬을 풀어 주는 「기계식 증폭」이자 「순서 제어기」입니다.',
  dim: '머리 지름 22 · 팔 너비 8 · 두께 5 · 축 지름 8 (가정값)' });
const levL = (d, c) => { const sg = Math.sign(c.yk - c.yh), y0 = Math.min(c.yh, c.yk), y1 = Math.max(c.yh, c.yk), fx = d - FINGER;
  return diff(uni(box([d, (y0 + y1) / 2, LV.h], [8, y1 - y0, 5]), cyl([d, c.yh, LV.h + 2.5], 22, 22, 5, 20), box([(d + fx) / 2, c.yk, LV.h], [d - fx + 4, 8, 5]),
    box([fx, c.yk, (LV.h + 26) / 2], [5, 24, LV.h - 26]), rod([d - 7, c.yp, LV.h], [d + 7, c.yp, LV.h], 16, 16)), rod([d - 9, c.yp, LV.h], [d + 9, c.yp, LV.h], 10, 12)) };
const hd = (t, k) => dOf(holeX(TUBE[t], k));
const levPiv = (t, k, c) => cw(hd(t, k), c.yp, LV.h), levAx = [Math.cos(RU.a * Math.PI / 180), 0, Math.sin(RU.a * Math.PI / 180)];
step('10_sutgarak', '12시 횡기', Array.from({ length: 12 }, (_, k) => mem('12시 횡기 ' + (k + 1), FE, onC(levL(hd('s', k), LV.s)), { mat: 'iron', mv: 'lev_s_' + k, piv: levPiv('s', k, LV.s), ax: levAx })));
step('10_sutgarak', '경점 횡기', Array.from({ length: 25 }, (_, k) => { const c = k % 5 === 0 ? LV.g : LV.j; return mem('경점 횡기 ' + (k + 1) + (k % 5 === 0 ? ' (경·초점, 손잡이 ③)' : ' (점, 손잡이 ④)'), FE, onC(levL(hd('n', k), c)), { mat: 'iron', mv: 'lev_n_' + k, piv: levPiv('n', k, c), ax: levAx }) }));
const axSup = (t, yp) => { const ds = Array.from({ length: TUBE[t].n }, (_, k) => hd(t, k)), m = [ds[0] - 32, ...ds.slice(0, -1).map((d, k) => (d + ds[k + 1]) / 2), ds[ds.length - 1] + 32]; return uni(...m.map(d => box([d, yp, LV.h - 8], [10, 10, 8]))) };
step('10_sutgarak', '횡기 축', [mem('횡기 축 받침', WD2, onC(uni(axSup('s', LV.s.yp), axSup('n', LV.g.yp))), { mat: 'wood' }), mem('12시 횡기 축(격벽 2 위)', FE, onC(rod([hd('s', 0) - 40, LV.s.yp, LV.h], [hd('s', 11) + 40, LV.s.yp, LV.h], 8, 12)), { mat: 'iron' }), mem('경점 횡기 축(격벽 3 위)', FE, onC(rod([hd('n', 0) - 40, LV.g.yp, LV.h], [hd('n', 24) + 40, LV.g.yp, LV.h], 8, 12)), { mat: 'iron' })]);

// ===== 11. 쇠구슬 =====
group('11_cheolhwan', { n: '쇠구슬(철환)', hj: '鐵丸', col: FE, mat: 'ironB',
  desc: '「보루각기」: 달걀 크기의 쇠구슬 — 12개는 시를, 5개는 경과 매 경의 초점을, 20개는 점(2점~5점)을 주관한다. 2007년 복원품(서준): 지름 약 47mm, 통로 ①에 12시 쇠구슬, ③에 경·초점 쇠구슬, ④에 점 쇠구슬이 각 횡기의 손잡이 사이에 장전된다. 풀려난 쇠구슬은 입구 쪽으로 굴러가 궤의 모서리에서 한 단계(약 20cm) 떨어진 뒤 시기(종·12신)와 경점기로 굴러갑니다.',
  dim: '12개 · 5개 · 20개 (보루각기) / 지름 47 (서준 2007)' });
export_prof.ibRest = (t, k) => { const tp = t === 's' ? 's' : (k % 5 === 0 ? 'g' : 'j'); return cw(hd(t, k), CH[tp], IB.r) };
step('11_cheolhwan', '시 쇠구슬', Array.from({ length: 12 }, (_, k) => mem('쇠구슬 · ' + SI[RE[k].si] + '시', FE, sph(export_prof.ibRest('s', k), IB.r), { mat: 'ironB', mv: 'ib_s_' + k })));
step('11_cheolhwan', '경 쇠구슬', Array.from({ length: 25 }, (_, k) => k % 5 ? null : mem('쇠구슬 · ' + (k / 5 + 1) + '경', FE, sph(export_prof.ibRest('n', k), IB.r), { mat: 'ironB', mv: 'ib_n_' + k })).filter(Boolean));
step('11_cheolhwan', '점 쇠구슬', Array.from({ length: 25 }, (_, k) => k % 5 === 0 ? null : mem('쇠구슬 · ' + (Math.floor(k / 5) + 1) + '경 ' + (k % 5 + 1) + '점', FE, sph(export_prof.ibRest('n', k), IB.r), { mat: 'ironB', mv: 'ib_n_' + k })).filter(Boolean));
step('11_cheolhwan', '횡목 위 쇠구슬', [mem('쇠구슬 · 앞 수수호 차례의 마지막 시(오시)', FE, sph([HM.x, HM.yN - 22, 840], IB.r), { mat: 'ironB', mv: 'ib_hold' })]);

// ===== 12. 동쪽 칸 =====
group('12_bay', { n: '동쪽 칸의 2층 자리', hj: '東楹 座', col: RED, mat: 'lacquer',
  desc: '「보루각기」: 전각 3칸을 짓고 동쪽 칸에 2층 자리를 만든다. 위층에는 시·경·점을 맡은 3신이 종·북·징을 울리고, 가운데 층 아래에는 가로로 돌아가는 바퀴(평륜)와 12신이 숨어 있다가 때에 맞춰 차례로 올라온다. 모든 기계 장치는 감춰져 드러나지 않고 보이는 것은 관대를 갖춘 목인뿐이다.',
  dim: '가로 2,000 · 세로 2,200 · 가운데 층 1,700 · 위층 2,600 · 지붕 3,500 (가정값, 남문현의 2m×2m×4m 추정 참고)' });
const bx0 = BAY.x0, bx1 = BAY.x1, by0 = BAY.y0, by1 = BAY.y1;
const BPX = [bx0 + 60, bx1 - 60], BPY = [by0 + 60, by1 - 60], LVB = [[0, 120, '하인방'], [1580, 1700, '중인방'], [2480, 2600, '귀틀'], [BAY.roof - 120, BAY.roof, '창방']];
const bBeams = [], bMort = [], panGroove = [];
for (const [z0, z1, nm] of LVB) {
  for (const y of BPY) { const t = tenonBeam('x', BPX[0] + 60, BPX[1] - 60, y, z0, z1, 90, 40); bBeams.push([nm, t.beam, y]); bMort.push(...t.mort) }
  for (const x of BPX) { const t = tenonBeam('y', BPY[0] + 60, BPY[1] - 60, x, z0, z1, 90, 40); bBeams.push([nm, t.beam, x]); bMort.push(...t.mort) } }
// 판벽은 기둥의 홈(32×17)에 끼움
for (const x of BPX) for (const y of BPY) { const sx = Math.sign((bx0 + bx1) / 2 - x), sy = Math.sign(-y);
  panGroove.push(box([x + sx * 52, y, 1300], [17, 32, 2480 - 120]), box([x, y + sy * 52, 1300], [32, 17, 2480 - 120])) }
step('12_bay', '기둥', BPX.flatMap(x => BPY.map(y => mem('동쪽 칸 기둥(장부구멍·판벽 홈)', RED, diff(box([x, y, BAY.roof / 2], [120, 120, BAY.roof]), ...bMort, ...panGroove), { mat: 'lacquer' }))));
// 지붕 창방 사이에 거는 종·징 매다는 보 (창방에 장부 맞춤)
const jgMortW = box([BPX[0] + 45 - 20, 300, 1640], [42, 32, 82]);
step('12_bay', '하인방·중인방·귀틀·창방', bBeams.map(([nm, n]) => mem('동쪽 칸 ' + nm + '(장부 맞춤)', nm === '창방' ? GRN : WD2, nm === '중인방' ? diff(n, jgMortW) : n, { mat: nm === '창방' ? 'paint' : 'wood' })));
const panel = (axis, c, a, b, z0, z1) => axis === 'x' ? box([(a + b) / 2, c, (z0 + z1) / 2], [b - a, 30, z1 - z0]) : box([c, (a + b) / 2, (z0 + z1) / 2], [30, b - a, z1 - z0]);
const pa = BPX[0] + 60 - 15, pb = BPX[1] - 60 + 15, qa = BPY[0] + 60 - 15, qb = BPY[1] - 60 + 15;
step('12_bay', '판벽', [
  mem('앞(남) 판벽 아래', RED, panel('x', BPY[0], pa, pb, 120, 1580), { mat: 'lacquer', cut: 'front' }),
  mem('앞(남) 판벽 위 — 12신이 보이는 창', RED, diff(panel('x', BPY[0], pa, pb, 1700, 2480), box([WH.x, BPY[0], 1900], [300, 60, 300])), { mat: 'lacquer', cut: 'front' }),
  mem('서쪽 판벽 아래', RED, panel('y', BPX[0], qa, qb, 120, 1580), { mat: 'lacquer' }),
  mem('서쪽 판벽 위 — 광판이 들어오는 틈', RED, diff(panel('y', BPX[0], qa, qb, 1700, 2480), box([BPX[0], 0, 2445], [60, 940, 80])), { mat: 'lacquer' }),
  mem('동쪽 판벽', RED, uni(panel('y', BPX[1], qa, qb, 120, 1580), panel('y', BPX[1], qa, qb, 1700, 2480)), { mat: 'lacquer' }),
  mem('뒤(북) 판벽', RED, uni(panel('x', BPY[1], pa, pb, 120, 1580), panel('x', BPY[1], pa, pb, 1700, 2480)), { mat: 'lacquer' })]);
const jgT = tenonBeam('x', BPX[0] + 45, 2995, 300, 1580, 1700, 90, 40), jgBeam = diff(uni(jgT.beam.c[0], jgT.beam.c[1]), box([2950, 300, 1610], [42, 42, 62]));
step('12_bay', '가운데 층', [mem('가운데 층 장귀틀(서쪽 중인방에 장부)', WD2, jgBeam, { mat: 'wood' }), mem('동자기둥(장귀틀을 장부로 받침)', WD2, uni(box([2950, 300, 790], [90, 90, 1580]), box([2950, 300, 1610], [40, 40, 60])), { mat: 'wood' }),
  mem('가운데 층 마루(12신이 올라오는 자리)', WL, diff(box([(1975 + 2995) / 2, (-1025 + 345) / 2, BAY.mid + BAY.ft / 2], [1020, 1370, BAY.ft]), box([WH.x, WH.y - WH.R, BAY.mid + 20], [170, 170, BAY.ft + 10]), cyl([WH.x, WH.y, BAY.mid + 20], 52, 52, BAY.ft + 10, 20), box([BPX[0], BPY[0], BAY.mid + 20], [122, 122, BAY.ft + 10])), { mat: 'wood' })]);
step('12_bay', '위층 마루', Array.from({ length: 10 }, (_, i) => { const w = (BPY[1] - BPY[0] + 90) / 10; return mem('위층 마루널(3신이 서는 자리)', WL, diff(box([(bx0 + bx1) / 2, BPY[0] - 45 + w * (i + .5), BAY.up + BAY.ft / 2], [bx1 - bx0 - 240, w - 2, BAY.ft]), ...[INST.s, INST.g, INST.j].map(x => cyl([x, 410, BAY.up + BAY.ft / 2], 26, 26, BAY.ft + 10, 20))), { mat: 'wood' }) }));
step('12_bay', '지붕', [mem('지붕', '#3c3a38', uni(frustum([(bx0 + bx1) / 2, 0, BAY.roof + 150], [bx1 - bx0 + 500, by1 - by0 + 500], [bx1 - bx0 - 400, 300], 300), box([(bx0 + bx1) / 2, 0, BAY.roof + 330], [bx1 - bx0 - 300, 120, 60])), { mat: 'roof' })]);

// ===== 13. 쇠구슬 길(동쪽 칸 안) =====
group('13_gil', { n: '쇠구슬 길과 짧은 통', hj: '短筒', col: CU, mat: 'copper',
  desc: '철환 방출부의 통로 ①·③·④에서 풀려난 쇠구슬은 입구 쪽 모서리에서 한 단계(약 20cm) 떨어져 홈통을 타고 시기(12시 타종기구)와 경점기로 굴러갑니다(서준 2007). 「보루각기」: 위층 아래 왼쪽에 짧은 통 2개를 매다는데 하나는 구슬을 받고 다른 하나에는 숟가락 장치가 있다. 오른쪽 네모 기둥 위에도 따로 짧은 통 둘을 매다는데 하나는 경 구슬을, 다른 하나는 점 구슬을 받는다.',
  dim: '홈통 폭 60, 짧은 통 지름 50 (가정값)' });
const LP = { s: [[2020, CH.s, 2120], [S12.tubeX, CH.s, 2100], [S12.tubeX, S12.tubeY, 2090]], g: [[2020, CH.g, 2120], [2990, CH.g, 2088], [2990, GK.y, 2082]], j: [[2020, CH.j, 2120], [3470, CH.j, 2068], [3470, GK.y, 2062]] };
export_prof.LP = LP;
const UPI = [[-30, -25], [30, -25], [30, 6], [26, 6], [26, -22], [-26, -22], [-26, 6], [-30, 6]];
const gutter = pts => uni(...pts.slice(1).map((q, i) => sweep(UPI, pts[i], q)));
const hollowV = (x, y, z0, z1, d, w = 5) => diff(cyl([x, y, (z0 + z1) / 2], d, d, z1 - z0, 24), cyl([x, y, (z0 + z1) / 2], d - 2 * w, d - 2 * w, z1 - z0 + 4, 24));
const hang = (x, y, z) => { const inRU = x > RU.xs && x < RU.xe && y > CWALL[4][0] && y < CWALL[0][1]; return rod([x, y, z], [x, y, inRU ? cw(dOf(x), y, -RU.base)[2] : BAY.up], 8, 8) };
step('13_gil', '쇠구슬 홈통', [mem('시 구슬 홈통', CU, gutter(LP.s), { mat: 'copper' }), mem('경 구슬 홈통', CU, gutter(LP.g), { mat: 'copper' }), mem('점 구슬 홈통', CU, gutter(LP.j), { mat: 'copper' }),
  mem('홈통 매다는 막대', FE, uni(...[[2300, CH.s, 2104], [2700, CH.g, 2098], [3200, CH.j, 2080], [2990, 300, 2084], [3470, 250, 2064], [S12.tubeX, 350, 2094]].map(p => hang(p[0], p[1], p[2] + 6))), { mat: 'iron' })]);
step('13_gil', '짧은 통', [mem('시 구슬 받는 짧은 통(主時大丸墜注短筒)', CU, uni(hollowV(S12.tubeX, S12.tubeY, S12.tubeZ0, S12.tubeZ1, 54), hang(S12.tubeX, S12.tubeY + 31, S12.tubeZ1 - 20)), { mat: 'copper' }),
  mem('경 구슬 받는 짧은 통', CU, uni(hollowV(2990, GK.y, 1990, 2055, 54), hang(2990, GK.y + 31, 2050)), { mat: 'copper' }),
  mem('점 구슬 받는 짧은 통', CU, uni(hollowV(3470, GK.y, 1960, 2025, 54), hang(3470, GK.y + 31, 2020)), { mat: 'copper' })]);

// ===== 14. 12시 시보 장치 =====
group('14_s12', { n: '12시 장치: 숟가락·횡목·둥근 나무', hj: '橫木', col: WD2, mat: 'wood',
  desc: '「보루각기」: 시를 주관하는 큰 구슬이 짧은 통으로 떨어져 숟가락 장치를 움직이면, 장치의 다른 끝이 통 안에서 올라가 시를 맡은 신의 팔뚝을 건드려 종을 울린다. 구슬은 둥근 기둥에 붙은 통으로 떨어져 횡목의 북쪽 끝을 누른다. 횡목(길이 6자 6치, 너비 1치 5푼, 두께 1치 7푼)은 가운데 짧은 기둥의 둥근 축에 걸려 오르내리고, 남쪽 끝에 세운 손가락 같은 둥근 나무(길이 2자 2치)가 시를 알리는 신의 발밑에 닿아, 북쪽 끝이 눌리면 남쪽 끝이 올라가 신을 가운데 층으로 올려 준다. 북쪽 끝 너머의 작은 판은 쇠줄로 숟가락과 이어져, 다음 시에 숟가락이 움직이면 판이 열려 앞의 구슬이 빠지고 앞 시의 신이 바퀴로 돌아온다.',
  dim: '횡목 6자 6치(1,366) × 1치 5푼(31) × 1치 7푼(35), 둥근 나무 길이 2자 2치(455) (보루각기) / 둥근 나무 지름 30, 기둥 지름 90 (가정값)' });
step('14_s12', '둥근 기둥·통', [mem('12시 둥근 기둥(숟가락 장치가 든 통)', CU, diff(hollowV(S12.colX, S12.y, 0, BAY.up, 90, 6), box([S12.colX + 40, S12.y + 30, S12.spoonZ], [40, 40, 14])), { mat: 'copper' }),
  mem('둥근 기둥에 붙은 통(구슬이 횡목으로 떨어지는 길)', CU, uni(hollowV(S12.tubeX, S12.tubeY, 880, 1795, 54), ...[1000, 1600].map(z => box([S12.colX + 60, 452, z], [40, 12, 20]))), { mat: 'copper' })]);
const sp12 = uni(box([(S12.colX + S12.tubeX) / 2 - 10, (S12.y + S12.tubeY) / 2 - 5, S12.spoonZ], [125, 12, 6]), cyl([S12.tubeX, S12.tubeY, S12.spoonZ + 3], 30, 30, 6, 20));
const sp12f = (() => { const a = [S12.colX, S12.y, S12.spoonZ], b = [S12.tubeX, S12.tubeY, S12.spoonZ]; return uni(beam(a, [b[0] - 12, b[1] - 9, b[2]], 12, 6), cyl([S12.tubeX, S12.tubeY, S12.spoonZ + 3], 30, 30, 6, 20)) })();
step('14_s12', '숟가락·쇠줄', [mem('12시 숟가락 장치(撥匙)', FE, sp12f, { mat: 'iron', mv: 'sp12', piv: [S12.colX, S12.y, S12.spoonZ], ax: [-(S12.tubeY - S12.y), S12.tubeX - S12.colX, 0] }),
  mem('들림막대(사시신 팔꿈치로)', FE, uni(rod([S12.colX, S12.y, S12.spoonZ + 10], [S12.colX, S12.y, BAY.up + BAY.ft + ARM.E[2] - 24], 14, 10), sph([S12.colX, S12.y, BAY.up + BAY.ft + ARM.E[2] - 24], 9)), { mat: 'iron', mv: 'link_s' }),
  mem('작은 판을 여는 쇠줄', FE, uni(rod([HM.x - 30, HM.yN + 1, 516], [HM.x - 30, 455, S12.spoonZ - 10], 5, 6), box([HM.x - 30, HM.yN + 3, 512], [6, 10, 8])), { mat: 'iron' })]);
// 횡목 남쪽 끝 가까이(굴대에서 668)에 핀을 박고, 둥근 나무 아래 갈래(긴 홈)에 끼움 — 횡목이 기울어도 핀이 홈을 따라 미끄러지며 둥근 나무를 곧게 밀어 올림
const PIN_D = HM.yp - WH.poleY;
const hmN = uni(diff(box([HM.x, HM.yp, HM.zp], [HM.w, HM.L, HM.t]), rod([HM.x - 20, HM.yp, HM.zp], [HM.x + 20, HM.yp, HM.zp], 21, 16)), rod([HM.x - 25, HM.yp - PIN_D, HM.zp], [HM.x + 25, HM.yp - PIN_D, HM.zp], 8, 12));
const HMR = mul(mul(T(HM.x, HM.yp, HM.zp), Rx(HM.tilt)), T(-HM.x, -HM.yp, -HM.zp)); const poleDZ = (WH.poleY - HM.yp) * Math.sin(HM.tilt * Math.PI / 180), poleDY = (WH.poleY - HM.yp) * (Math.cos(HM.tilt * Math.PI / 180) - 1);
step('14_s12', '횡목', [mem('횡목(橫木)', WD2, xform(hmN, HMR), { mat: 'wood', mv: 'hm', piv: [HM.x, HM.yp, HM.zp], ax: [1, 0, 0] }),
  mem('횡목 짧은 기둥과 둥근 축', WD, uni(diff(box([HM.x - 24, HM.yp, 310], [14, 70, 620]), rod([HM.x - 35, HM.yp, HM.zp], [HM.x - 15, HM.yp, HM.zp], 21, 16)), diff(box([HM.x + 24, HM.yp, 310], [14, 70, 620]), rod([HM.x + 15, HM.yp, HM.zp], [HM.x + 35, HM.yp, HM.zp], 21, 16)), rod([HM.x - 31, HM.yp, HM.zp], [HM.x + 31, HM.yp, HM.zp], 20, 16)), { mat: 'wood' }),
  (() => { const pz = HM.zp + poleDZ, fy0 = WH.poleY - 25, fy1 = WH.poleY + 40, fc = (fy0 + fy1) / 2, top = WH.ring;   // pz = 핀 높이(모형 자세), 둥근 나무 꼭대기 = 쉬는 신의 발바닥
    const plate = sx => diff(box([HM.x + sx * 20.5, fc, pz + 2], [6, fy1 - fy0, 44]), box([HM.x + sx * 20.5, WH.poleY + 10, pz], [10, 50, 10]));
    return mem('둥근 나무(손가락 모양, 2자 2치)와 아래 갈래(핀이 미끄러지는 긴 홈)', '#c9a77a', uni(cyl([HM.x, WH.poleY, (pz + 30 + top) / 2], 30, 30, top - pz - 30, 16), plate(-1), plate(1), box([HM.x, fc, pz + 26], [47, fy1 - fy0, 8])), { mat: 'woodL', mv: 'pole' }) })()]);
step('14_s12', '작은 판·받는 그릇', [mem('작은 판(小板, 여닫이)', WD, box([HM.x, HM.yN + 12, 470], [90, 8, 110]), { mat: 'wood', mv: 'pan12', piv: [HM.x, HM.yN + 12, 525], ax: [1, 0, 0] }),
  mem('작은 판 문틀', WD, uni(box([HM.x - 55, HM.yN + 12, 280], [14, 14, 560]), box([HM.x + 55, HM.yN + 12, 280], [14, 14, 560]), box([HM.x, HM.yN + 12, 532], [124, 14, 14])), { mat: 'wood' }),
  mem('쇠구슬 받는 그릇(12시)', WD2, diff(box([BIN.s.x, BIN.s.y, 75], [220, 220, 150]), box([BIN.s.x, BIN.s.y, 95], [190, 190, 150])), { mat: 'wood' })]);

// ===== 15. 평륜·12신 =====
group('15_pyeongryun', { n: '평륜과 12신', hj: '平輪 · 十二神', col: '#a3713e', mat: 'wood',
  desc: '「보루각기」: 가운데 층 아래에 가로로 돌아가는 바퀴(평륜)를 설치하고 바퀴를 따라 12신을 벌여 세우되, 각 신은 굵은 쇠막대(鐵條)를 기둥 삼아 오르내리며 시패를 들고 번갈아 시를 알린다. 바퀴 바깥에 1자쯤 되는 작은 판을 두고 살짝 기울어진 구리판을 걸쳐 여닫게 하여, 신의 발이 구리판 아래에 있다가 올라가면 판이 열리고 지나간 뒤 다시 닫힌다. ─ 2007년 복원품(서준): 평륜은 한 축에 위·아래 두 바퀴(바퀴살 12개씩)를 쇠막대로 이은 것이고, 쇠막대 2개마다 지신 인형이 하나씩 끼워져 있다. 앞 시의 쇠구슬이 빠지면 둥근 나무가 내려가고 창문에 보이던 신이 제 무게로 내려오다가, 평륜 앞에 비스듬히 단 구리판에 막혀 발밑 쇠바퀴가 이 판을 타고 굴러 내린다. 신이 비스듬히 내려가는 동안 신이 끼워진 평륜 전체가 따라서 한 칸(30°) 돌고, 이번 시의 신이 둥근 나무 위로 옮겨 온다(남문현 2002 그림 3-6과 같은 원리). 1998년 문화재청 보고서는 기록의 묘사만으로는 평륜이 돌 수 없어 별도의 회전 장치가 필요하다고 보았는데, 이 비스듬한 구리판이 그 장치입니다.',
  dim: '평륜 바깥지름 960, 위·아래 바퀴살 12개씩, 쇠막대 지름 10 × 24개, 축 지름 50, 구리판 길이 280 · 기울기 약 22°, 작은 판 1자(약 200), 신 높이 약 680(시패 포함) (가정값)' });
const holesW = Array.from({ length: 12 }, (_, k) => { const a = (-90 + 30 * k) * Math.PI / 180; return cyl([WH.x + WH.R * Math.cos(a), WH.y + WH.R * Math.sin(a), WH.ring - 10], 46, 46, 26, 16) });
const pol = (r, deg, z) => { const a = deg * Math.PI / 180; return [WH.x + r * Math.cos(a), WH.y + r * Math.sin(a), z] };
const spokes = (z, r0, r1, w, h) => Array.from({ length: 12 }, (_, k) => beam(pol(r0, -75 + 30 * k, z), pol(r1, -75 + 30 * k, z), w, h));
// 아래 바퀴: 바퀴살 12개 + 테(신이 서는 자리, 둥근 나무가 지나는 구멍) / 위 바퀴: 바퀴살 12개 + 테 / 쇠막대(鐵條) 2개씩 12쌍 / 가운데 축
const lowW = uni(diff(lat([WH.x, WH.y, WH.ring - 20], [[300, 0], [480, 0], [480, 20], [300, 20]], 72), ...holesW), ...spokes(WH.ring - 10, 45, 302, 30, 20), cyl([WH.x, WH.y, WH.ring - 15], 100, 100, 50, 24));
const upW = uni(lat([WH.x, WH.y, WH.top - 10], [[322, 0], [362, 0], [362, 20], [322, 20]], 72), ...spokes(WH.top, 45, 324, 24, 16), cyl([WH.x, WH.y, WH.top], 90, 90, 40, 24));
const rodsW = Array.from({ length: 12 }, (_, k) => { const a = (-90 + 30 * k) * Math.PI / 180, cx = WH.x + WH.rodR * Math.cos(a), cy = WH.y + WH.rodR * Math.sin(a);
  return [-1, 1].map(s => rod([cx - s * 22 * Math.sin(a), cy + s * 22 * Math.cos(a), WH.ring], [cx - s * 22 * Math.sin(a), cy + s * 22 * Math.cos(a), WH.top - 10], 10, 8)) }).flat();
const shaftW = uni(cyl([WH.x, WH.y, (WH.ring - 40 + BAY.mid + BAY.ft) / 2], 50, 50, BAY.mid + BAY.ft - (WH.ring - 40), 20), cyl([WH.x, WH.y, BAY.mid + BAY.ft + 8], 140, 140, 16, 32));   // 굴대는 가운데 층 마루에 매닮(머리 원판)
step('15_pyeongryun', '평륜(가로 바퀴)', [mem('평륜: 한 축에 위·아래 바퀴(바퀴살 12개씩)와 쇠막대(鐵條) 12쌍', '#7a5a3a', uni(lowW, upW, ...rodsW, shaftW), { mat: 'wood', mv: 'wheel', piv: [WH.x, WH.y, 0], ax: [0, 0, 1] })]);
// 바퀴 바깥 작은 판(1자)과 그 끝에 걸친 비스듬한 구리판(낮은 쪽 끝에 경첩)
const rP = (deg, z) => pol(RAMP.r, deg, z), NS = 8;
const arcN = (r, d0, d1, z0, z1, w, t) => uni(...Array.from({ length: NS }, (_, i) => { const a = d0 + (d1 - d0) * i / NS, b = d0 + (d1 - d0) * (i + 1) / NS, za = z0 + (z1 - z0) * i / NS, zb = z0 + (z1 - z0) * (i + 1) / NS;
  const e = (d1 - d0) / NS * .08; return beam(pol(r, a - e, za - t / 2), pol(r, b + e, zb - t / 2), w, t) }));
const rampN = arcN(RAMP.r, RAMP.th0, RAMP.th1, RAMP.z0 - (RAMP.z0 - RAMP.z1) * .0, RAMP.z1, RAMP.w, RAMP.t), pLo = rP(RAMP.th1, RAMP.z1 - RAMP.t / 2);
const bTop = RAMP.z0 - RAMP.t, bMid = (RAMP.board[0] + RAMP.board[1]) / 2, post = pol(RAMP.r + 57, bMid, 0), bm = pol(RAMP.r + 5, bMid, 0);
const boardN = uni(arcN(RAMP.r + 5, RAMP.board[0], RAMP.board[1], bTop, bTop, 50, 15), box([post[0], post[1], (bTop - 15) / 2], [26, 26, bTop - 15]), beam([post[0], post[1], bTop - 25], [bm[0], bm[1], bTop - 25], 20, 20));
const hingeP = pol(RAMP.r + 40, RAMP.th1, 0);
const rampAx = (() => { const a = RAMP.th1 * Math.PI / 180; return [Math.cos(a), Math.sin(a), 0] })();
step('15_pyeongryun', '작은 판과 비스듬한 구리판', [mem('바퀴 바깥 작은 판(1자) — 구리판의 높은 끝을 받침', WD, boardN, { mat: 'wood' }),
  mem('경첩 받침(구리판 낮은 끝)', WD, uni(box([hingeP[0], hingeP[1], (RAMP.z1 - RAMP.t - 6) / 2], [26, 26, RAMP.z1 - RAMP.t - 6]), beam([hingeP[0], hingeP[1], RAMP.z1 - RAMP.t - 9], [pLo[0], pLo[1], RAMP.z1 - RAMP.t - 9], 20, 6)), { mat: 'wood' }),
  mem('비스듬한 구리판(여닫이) — 내려오는 신의 쇠바퀴가 굴러 평륜을 돌림', CU, rampN, { mat: 'copper', mv: 'flap', piv: pLo, ax: [rampAx[0], rampAx[1], 0] })]);
// 12신 인형(국소: 바깥쪽 = -y)
const dollL = () => uni(cyl([0, 0, 20], 60, 70, 40, 20), lat([0, 0, 40], [[0, 0], [52, 0], [40, 150], [30, 190], [0, 190]], 20), sph([0, 0, 255], 32), cyl([0, 0, 292], 46, 40, 20, 20),
  rod([0, -14, 180], [0, -30, 560], 10, 8), (() => { const n = cyl([0, 0, 0], 20, 20, 8, 16); n.M = mul(T(0, -78, 15), Rx(90)); return n })(), rod([0, -30, 15], [0, -74, 15], 6, 8),
  ...[-22, 22].map(x => diff(cyl([x, WH.R - WH.rodR, 300], 24, 24, 40, 16), cyl([x, WH.R - WH.rodR, 300], 14, 14, 44, 12))), box([0, 36, 300], [70, 32, 12]));
const DOLLC = ['#3f5d8a', '#7c5a3a', '#8a3a2e', '#5a7a4a', '#4a6a7a', '#8a6a2e', '#8a2e3a', '#6a5a8a', '#5a5a5a', '#8a7a4e', '#3a6a5a', '#6a3a5a'];
const dollM = k => { const a = -90 + 30 * k; return mul(T(WH.x + WH.R * Math.cos(a * Math.PI / 180), WH.y + WH.R * Math.sin(a * Math.PI / 180), WH.ring), Rz(a + 90)) };
step('15_pyeongryun', '12신 인형', Array.from({ length: 12 }, (_, k) => mem(SI[k] + '시 신(' + SIH[k] + ')', DOLLC[k], xform(dollL(), dollM(k)), { mat: 'paint', mv: 'doll' + k, piv: [WH.x, WH.y, 0], ax: [0, 0, 1] })));
step('15_pyeongryun', '시패', Array.from({ length: 12 }, (_, k) => mem(SI[k] + '시 시패', '#e8dcc0', xform(box([0, -30, 620], [70, 10, 110]), dollM(k)), { mat: 'plaque', mv: 'doll' + k, piv: [WH.x, WH.y, 0], ax: [0, 0, 1],
  tex: { t: SIH[k], s: SI[k] + '시', c: tpt(dollM(k), [0, -35.5, 620]), n: tpt(Rz(-90 + 30 * k + 90), [0, -1, 0]), w: 64, h: 104 } })));

// ===== 16. 경점기 =====
group('16_gyeongjeom', { n: '경점기: 원기둥 2 · 네모 기둥 2', hj: '圓柱 · 方柱', col: CU, mat: 'copper',
  desc: '「보루각기」: 오른쪽에 둥근 기둥과 네모난 기둥을 각 2개씩 세운다. 둥근 기둥은 속이 비어 있고 숟가락 모양 장치가 반은 나오고 반은 들어가 있는데, 왼쪽 기둥에 5개, 오른쪽 기둥에 10개가 있다. 네모난 기둥에는 작은 통 4개가 비스듬히 관통하는데 한쪽 끝은 연잎(구슬을 받음), 다른 끝은 용의 입(구슬을 내보냄)이고 위아래로 맞닿아 있다. 숟가락의 둥근 끝은 용의 입과 연잎 사이에 놓여 있어, 구슬이 지나갈 때마다 숟가락을 눌러 기둥 안에서 다른 끝이 올라가 인형의 팔뚝을 친다. — 경 구슬은 경의 수만큼 왼쪽 숟가락을 지나 북을 치고, 가로통을 건너 초점 장치를 눌러 징을 한 번 친 뒤 멈춘다. 점 구슬은 점의 수만큼 오른쪽 숟가락을 지나 징을 치고 멈추며, 5점 구슬은 맨 아래 장치를 움직여 쇠줄이 빗장을 뽑아 앞의 2·3·4점 구슬과 함께 떨어진다.',
  dim: '원기둥 지름 90, 네모 기둥 80×80, 작은 통 지름 36, 숟가락 자리 간격 210 (가정값) — 배치는 남문현의 그림 3-6을 따름' });
const sq = (x, tubes) => diff(box([x, GK.y, (GK.z0 + BAY.up) / 2], [80, 80, BAY.up - GK.z0]), ...tubes);
const zz = (Tf) => Array.from({ length: 4 }, (_, k) => { const a = Tf(k), b = Tf(k + 1); return [[a.x, GK.y, a.z - 40], [b.x, GK.y, b.z + 40]] });
const zzL = zz(TL), zzR = zz(TR);
const tubeD = (a, b) => { const o = rod(a, b, 36, 16), i = rod(a, b, 26, 12); i.h += 20; return diff(o, i) };
const cup = (p) => lat([p[0], p[1], p[2] - 18], [[0, 0], [14, 0], [30, 30], [26, 30], [10, 4], [0, 4]], 24);
const mouth = (p) => lat([p[0], p[1], p[2] - 4], [[12, 0], [24, 0], [20, 26], [12, 26]], 16);
const slotX = (cx, p, z) => { const east = p.x > cx + 200; return box([cx + 30, east ? 455 : GK.y, z], [60, 14, 12]) };
const slotsL = [0, 1, 2, 3, 4].map(k => slotX(GK.LC, TL(k), TL(k).z));
const slotsR = [...[0, 1, 2, 3, 4].map(k => slotX(GK.RC, TR(k), TR(k).z)), ...[0, 1, 2, 3, 4].map(k => box([GK.RC, GK.y + 40, TR(k).z - 120], [14, 40, 12])), box([GK.RC + 30, GK.y, TR(4).z - 75], [60, 14, 12])];
step('16_gyeongjeom', '원기둥', [mem('왼쪽 둥근 기둥(경, 숟가락 5)', CU, diff(hollowV(GK.LC, GK.y, GK.z0, BAY.up, 90, 6), ...slotsL), { mat: 'copper' }), mem('오른쪽 둥근 기둥(점, 숟가락 10)', CU, diff(hollowV(GK.RC, GK.y, GK.z0, BAY.up, 90, 6), ...slotsR), { mat: 'copper' })]);
step('16_gyeongjeom', '네모 기둥', [mem('왼쪽 네모 기둥(경)', WD, sq(GK.LF, zzL.map(([a, b]) => rod(a, b, 37, 16))), { mat: 'lacquer' }), mem('오른쪽 네모 기둥(점)', WD, sq(GK.RF, zzR.map(([a, b]) => rod(a, b, 37, 16))), { mat: 'lacquer' })]);
step('16_gyeongjeom', '연잎·용의 입 통', [mem('왼쪽 비스듬한 통 4(연잎→용의 입)', CU, uni(...zzL.flatMap(([a, b]) => [tubeD(a, b), cup(a), mouth(b)]), cup([TL(4).x, GK.y, TL(4).z - 40])), { mat: 'copper' }),
  mem('오른쪽 비스듬한 통 4(연잎→용의 입)', CU, uni(...zzR.flatMap(([a, b]) => [tubeD(a, b), cup(a), mouth(b)])), { mat: 'copper' })]);
const hz = (k) => [[TL(k).x, GK.y + 30, TL(k).z - 50], [TL(k).x, YG, TL(k).z - 55], [TR(k).x, YG, TR(k).z - 75]];
export_prof.hz = hz;
step('16_gyeongjeom', '가로통·멈춤통', [mem('경 구슬 가로통 5(橫筒)', CU, uni(...[0, 1, 2, 3, 4].flatMap(k => { const p = hz(k); return [tubeD(p[0], p[1]), tubeD(p[1], p[2]), sph(p[1], 18)] })), { mat: 'copper' }),
  mem('경 구슬 멈춤통 5(수직 짧은 통, 초점 장치)', CU, uni(...[0, 1, 2, 3, 4].map(k => diff(hollowV(TR(k).x, YG, TR(k).z - 175, TR(k).z - 90, 52, 4), box([TR(k).x - 24, YG, TR(k).z - 120], [14, 14, 12])))), { mat: 'copper' }),
  mem('점 구슬 멈춤통 3(수직 짧은 통)', CU, uni(...[1, 2, 3].flatMap(k => [hollowV(TR(k).x, YJ, TR(k).z - 175, TR(k).z - 60, 52, 4), tubeD([TR(k).x, GK.y - 20, TR(k).z - 45], [TR(k).x, YJ + 20, TR(k).z - 58])])), { mat: 'copper' }),
  mem('빗장(扃)과 쇠줄(連機鐵繩)', FE, uni(...[1, 2, 3].map(k => box([TR(k).x, YJ, TR(k).z - 178], [60, 10, 6])), ...[0, 1, 2, 3, 4].map(k => box([TR(k).x, YG, TR(k).z - 178], [60, 10, 6])), rod([3540, YJ - 30, TR(4).z - 70], [3540, YJ - 30, TR(1).z - 175], 5, 6)), { mat: 'iron' })]);
// 숟가락: 둥근 기둥 안 축에서 숟가락 자리까지 (동쪽 자리는 기둥 뒤로 돌아감)
const spoonArm = (cx, p, z) => { const east = p.x > cx + 200; const yb = east ? 455 : GK.y; return uni(beam([cx, yb, z], [p.x - (east ? 0 : 12), yb, z], 10, 6), east ? beam([p.x, yb, z], [p.x, GK.y + 14, z], 10, 6) : null, cyl([p.x, GK.y, z], 24, 24, 5, 16)) };
step('16_gyeongjeom', '숟가락(경 5)', [0, 1, 2, 3, 4].map(k => mem('왼쪽 기둥 숟가락 ' + (k + 1) + '(북)', FE, spoonArm(GK.LC, TL(k), TL(k).z), { mat: 'iron', mv: 'spL_' + k, piv: [GK.LC, GK.y, TL(k).z], ax: [0, 1, 0] })));
step('16_gyeongjeom', '숟가락(점 5 · 초점 5)', [...[0, 1, 2, 3, 4].map(k => mem('오른쪽 기둥 숟가락 ' + (k + 1) + '(점 징)', FE, spoonArm(GK.RC, TR(k), TR(k).z), { mat: 'iron', mv: 'spR_' + k, piv: [GK.RC, GK.y, TR(k).z], ax: [0, 1, 0] })),
  ...[0, 1, 2, 3, 4].map(k => mem('초점 숟가락 ' + (k + 1) + '(경 멈춤통 안)', FE, uni(beam([GK.RC, GK.y, TR(k).z - 120], [GK.RC, YG, TR(k).z - 120], 10, 6), beam([GK.RC, YG, TR(k).z - 120], [TR(k).x - 10, YG, TR(k).z - 120], 10, 6)), { mat: 'iron', mv: 'spC_' + k, piv: [GK.RC, GK.y, TR(k).z - 120], ax: [0, 1, 0] })),
  mem('맨 아래 장치(最下之機)', FE, uni(beam([GK.RC, GK.y, TR(4).z - 75], [TR(4).x - 10, GK.y, TR(4).z - 75], 10, 6), cyl([TR(4).x, GK.y, TR(4).z - 75], 24, 24, 5, 16)), { mat: 'iron', mv: 'spLow', piv: [GK.RC, GK.y, TR(4).z - 75], ax: [0, 1, 0] })]);
step('16_gyeongjeom', '연결 막대·받는 그릇', [mem('좌원주 들림막대(사경신 팔꿈치로)', FE, uni(rod([GK.LC, GK.y, 2000], [GK.LC, GK.y, BAY.up + BAY.ft + ARM.E[2] - 24], 14, 10), sph([GK.LC, GK.y, BAY.up + BAY.ft + ARM.E[2] - 24], 9)), { mat: 'iron', mv: 'link_g' }),
  mem('우원주 들림막대(사점신 팔꿈치로)', FE, uni(rod([GK.RC, GK.y, 1980], [GK.RC, GK.y, BAY.up + BAY.ft + ARM.E[2] - 24], 14, 10), sph([GK.RC, GK.y, BAY.up + BAY.ft + ARM.E[2] - 24], 9)), { mat: 'iron', mv: 'link_j' }),
  mem('쇠구슬 받는 그릇(경점)', WD2, diff(box([BIN.n.x, BIN.n.y, 75], [300, 300, 150]), box([BIN.n.x, BIN.n.y, 95], [270, 270, 150])), { mat: 'wood' })]);

// ===== 17. 종·북·징 =====
group('17_akgi', { n: '종 · 북 · 징과 틀', hj: '鐘 · 鼓 · 鉦', col: BR, mat: 'bronze',
  desc: '시(時)에는 종, 경(更)에는 북, 점(點)에는 징을 칩니다. 2007년 복원품(서준): 종은 조선 초기 범종을 본뜬 보시종(報時鐘)을 종틀에 매달고, 북은 조선 초기의 작은 용고(龍鼓)를 북틀에 걸며, 징(대금)도 징틀에 매답니다. 인형이 서서 채로 악기를 칩니다. 밤에는 경회루 남문 → 월화문 → 근정문 → 광화문으로 목인의 북·징 소리를 차례로 이어받아 쳤습니다(세종실록 같은 날 기사).',
  dim: '종 높이 220 · 지름 200, 북 지름 264 · 길이 180, 징 지름 240, 틀 높이 820 (가정값)' });
const FZ = BAY.up + BAY.ft, TOPZ = FZ + 780;
const frame = (x, y, hw, nm) => uni(box([x, y, FZ + 20], [2 * hw + 80, 110, 40]), ...[-1, 1].map(s => box([x + s * hw, y, (FZ + 40 + TOPZ) / 2], [40, 40, TOPZ - FZ - 40])), box([x, y, TOPZ + 20], [2 * hw + 80, 44, 40]));
const bellY = INST.hy + 91, bellZ = INST.hz - 60;
step('17_akgi', '종과 종틀', [mem('보시종(報時鐘)', BR, uni(lat([INST.s, bellY, bellZ], [[86, 0], [100, 0], [96, 30], [82, 120], [70, 200], [40, 220], [0, 220], [0, 200], [60, 195], [74, 120], [88, 30], [86, 0]], 48), cyl([INST.s, bellY, bellZ + 240], 30, 30, 40, 16)), { mat: 'bronze' }),
  mem('종고리', FE, rod([INST.s, bellY, bellZ + 258], [INST.s, bellY, TOPZ], 16, 10), { mat: 'iron' }),
  mem('종틀(받침·기둥 2·보)', RED, frame(INST.s, bellY, 150), { mat: 'lacquer' })]);
const drumY = INST.hy + 90;
const drum = (() => { const n = lat([0, 0, 0], [[0, -90], [120, -90], [130, -40], [132, 0], [130, 40], [120, 90], [0, 90]], 48); n.M = mul(T(INST.g, drumY, INST.hz), Rx(-90)); return n })();
step('17_akgi', '북과 북틀', [mem('용고(龍鼓) — 북', '#9a2a1e', drum, { mat: 'drum' }),
  mem('북 고리', FE, rod([INST.g, drumY, INST.hz + 130], [INST.g, drumY, TOPZ], 16, 10), { mat: 'iron' }),
  mem('북틀(받침·기둥 2·보)', RED, frame(INST.g, drumY, 175), { mat: 'lacquer' })]);
const gong = (() => { const n = lat([0, 0, 0], [[0, 0], [120, 0], [120, 40], [112, 40], [112, 6], [0, 6]], 48); n.M = mul(T(INST.j, INST.hy, INST.hz), Rx(-90)); return n })();
step('17_akgi', '징과 징틀', [mem('징(鉦, 대금)', '#a88a4a', gong, { mat: 'bronze' }),
  mem('징 끈', '#6a4a2a', uni(...[-1, 1].map(s => rod([INST.j + s * 60, INST.hy + 25, INST.hz + 100], [INST.j + s * 60, INST.hy + 25, TOPZ], 8, 8))), { mat: 'wood' }),
  mem('징틀(받침·기둥 2·보)', RED, frame(INST.j, INST.hy + 25, 165), { mat: 'lacquer' })]);

// ===== 18. 위층 3신 =====
group('18_inhyeong', { n: '위층의 3신(목인)과 팔', hj: '三神', col: '#2c4a6e', mat: 'paint',
  desc: '「보루각기」: 위층에 3신을 세우는데 하나는 시를 맡아 종을, 하나는 경을 맡아 북을, 다른 하나는 점을 맡아 징을 울린다. 2007년 복원품(서준): 팔의 회전축은 손과 팔꿈치의 가운데에 두고, 팔꿈치에 넉넉한 홈을 내어 원주(둥근 기둥) 속에서 올라오는 들림막대의 머리와 맞물리게 했다. 들림막대가 올라가면 팔꿈치가 들리고 손에 쥔 채가 앞으로 내려와 악기를 친 뒤, 막대가 내려가면 채가 곧바로 제자리로 돌아가 악기 면에서 떨어진다. 사시신은 붉은색, 사경신은 녹색, 사점신은 청색 옷(복원품 사진).',
  dim: '인형 높이 약 650, 팔(팔꿈치~손) 140, 채 길이 200, 회전각 35°, 들림막대 오르내림 40 (가정값)' });
const figL = () => uni(box([0, 0, 20], [150, 150, 40]), lat([0, 0, 40], [[0, 0], [72, 0], [60, 260], [46, 330], [0, 330]], 24), cyl([0, 0, 400], 90, 96, 100, 24), sph([0, 0, 500], 52), cyl([0, 0, 560], 70, 80, 50, 24), cyl([0, 0, 540], 150, 150, 6, 32),
  rod([0, -40, 455], [ARM.E[0] - 4, ARM.E[1] + 8, ARM.E[2] + 50], 28, 12), rod([25, -30, ARM.P[2]], [ARM.P[0], ARM.P[1] + 20, ARM.P[2]], 10, 8), rod([ARM.P[0], ARM.P[1] + 20, ARM.P[2]], [ARM.P[0], ARM.P[1] - 18, ARM.P[2]], 8, 8));
const armL = () => { const [E, P, H, M] = [ARM.E, ARM.P, ARM.H, ARM.M];
  return diff(uni(rod(E, H, 26, 12), box([E[0], E[1], E[2]], [30, 26, 24]), rod([P[0], P[1] - 13, P[2]], [P[0], P[1] + 13, P[2]], 22, 16), sph(H, 15), rod(H, M, 14, 10), sph(M, 22)),
    box([E[0], E[1], E[2] - 8], [12, 30, 10]), rod([P[0], P[1] - 20, P[2]], [P[0], P[1] + 20, P[2]], 10, 12)) };
[['s', '사시신(司時神) — 시·종', '#a8322a'], ['g', '사경신(司更神) — 경·북', '#3d7a4a'], ['j', '사점신(司點神) — 점·징', '#2f4f86']].forEach(([k, nm, col]) => {
  const M0 = mul(T(FIG[k], FIG.y, FIG.z), Rz(90)), Pw = tpt(M0, ARM.P);
  step('18_inhyeong', nm.split(' ')[0], [mem(nm, col, xform(figL(), M0), { mat: 'paint' }),
    mem(nm.split(' ')[0] + ' 팔과 채(팔꿈치에 들림막대 홈)', '#c9a77a', xform(armL(), M0), { mat: 'woodL', mv: 'arm_' + k, piv: Pw, ax: [-1, 0, 0] })]);
});
return { G, steps };
}
