// 녹로(轆轤) 시뮬레이션 — 순수 함수 (DOM·three 의존 금지, node에서 테스트)
// 근거: 『화성성역의궤』 권수 도설 「녹로전도·분도」, 한국민족문화대백과사전 「녹로」(의궤 인용: 틀 세로 15척·높이 10척, 간목 35척,
//       여덟 사람이 둘로 나뉘어 좌우에서 감음), 김평원 2017(「정약용이 설계한 거중기와 녹로의 용도」, 『다산학』 30: 235–272).
// 단위: mm, rad, N, kg. 좌표: x = 앞(−, 짐 쪽) → 뒤(+), y = 좌우, z = 위.

export const CHEOK = 303;
export const G = 9.8;
export const FRAME_L = 15 * CHEOK;     // 틀(機) 세로 15척 = 4,545 (의궤)
export const FRAME_H = 10 * CHEOK;     // 틀 높이 10척 = 3,030 (의궤)
export const FRAME_W = 8 * CHEOK;      // 틀 가로 8척 = 2,424 (가정값 — 의궤 전도 비율)
export const POLE_L = 35 * CHEOK;      // 간목(竿) 길이 35척 = 10,605 (의궤)
export const POLE_BASE = { x: -2100, y: 500, z: 200 };     // 간목 밑동 (틀 앞 밑틀 위, 가정값)
export const POLE_LEAN = 1600;         // 간목 꼭대기가 앞으로 나간 거리 (의궤 전도: 짐 위로 기울어짐, 가정값)
export const POLE_TOP_Y = 150;         // 꼭대기에서 두 간목 사이 반 간격 (활차를 끼움)
const dz = Math.sqrt(POLE_L ** 2 - POLE_LEAN ** 2 - (POLE_BASE.y - POLE_TOP_Y) ** 2);
export const POLE_TOP = { x: POLE_BASE.x - POLE_LEAN, y: POLE_TOP_Y, z: POLE_BASE.z + dz };   // ≈ z 10,680
export const R_PULLEY = 200;           // 활차 반지름 (가정값)
export const PULLEY = { x: POLE_TOP.x + 50, z: POLE_TOP.z - 330 };   // 활차 중심 (두 간목 꼭대기 사이)
export const R_AXLE = 100;             // 축(軸) 반지름 — 줄이 감기는 북 (가정값)
export const R_WHEEL = 1000;           // 손바퀴(얼레) 반지름 (가정값). R:r = 10:1 — 기중가도설 「녹로 자루:기둥 = 10:1」과 같은 비
export const AXLE = { x: 800, z: 1500 };                    // 축 중심 (틀 뒤쪽, 가정값)
export const WHEEL_Y = 1450;           // 손바퀴 y 위치(좌우 양쪽, 틀 바깥)
export const WORKERS = 8;              // 여덟 사람이 둘로 나뉘어 좌우에서 감음 (의궤)
export const MAX_WORKER_FORCE = 300;   // N, 1인이 오래 낼 수 있는 힘 (가정값)
export const LOAD_H = 500;             // 짐(돌) 높이
export const HOOK_MIN = LOAD_H + 250;  // 짐이 바닥에 있을 때 갈고리 높이
export const HOOK_MAX = PULLEY.z - R_PULLEY - 700;          // 갈고리가 활차 밑 700까지
export const DROP_X = PULLEY.x - R_PULLEY;                  // 줄이 내려오는 x (활차 앞쪽)

// 넘어짐(무게중심): 녹로 각 부분의 무게와 x 위치 (나무 밀도 600kg/m³로 어림, 가정값)
const WOOD = 600e-9;   // kg/mm³
const box = (l, w, h) => l * w * h * WOOD;
export const PARTS = [
  { n: '밑틀', m: 2 * box(FRAME_L, 200, 200) + 3 * box(FRAME_W, 180, 180), x: 0 },
  { n: '틀 기둥·윗틀', m: 4 * box(180, 180, FRAME_H) + 2 * box(FRAME_L - 600, 150, 150) + 2 * box(FRAME_W, 150, 150), x: 0 },
  { n: '축·손바퀴', m: box(Math.PI * R_AXLE * R_AXLE / 100, 100, 3200) * 1 + 2 * 6 * box(R_WHEEL, 60, 60), x: AXLE.x },
  { n: '간목 2', m: 2 * box(220, 220, POLE_L), x: POLE_BASE.x - POLE_LEAN / 2 },
  { n: '버팀목·판·활차', m: 2 * box(150, 150, 2800) + 60, x: -1800 },
];
export const TIP_EDGE = -FRAME_L / 2;          // 앞으로 넘어질 때 도는 축(앞 밑틀 끝)
export const MACHINE_KG = PARTS.reduce((a, p) => a + p.m, 0);
export const MACHINE_COG = PARTS.reduce((a, p) => a + p.m * p.x, 0) / MACHINE_KG;
// 버티는 모멘트(뒤로) − 앞으로 쏠린 모멘트 → 짐이 이보다 무거우면 앞으로 넘어짐
export const RESIST = PARTS.reduce((a, p) => a + p.m * (p.x - TIP_EDGE), 0);   // kg·mm
export const MAX_SAFE_KG = RESIST / (TIP_EDGE - DROP_X);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = u => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };

// th: 축 회전각(rad, 감는 쪽 +), pull: 갈고리로 끈 거리(mm, 앞쪽 +), massKg: 짐 무게, eff: 효율
export function nokro({ th = 0, pull = 0, massKg = 300, eff = 1, workers = WORKERS } = {}) {
  const wound = th * R_AXLE;                                  // 감긴 줄 길이
  const hook = clamp(HOOK_MIN + wound, HOOK_MIN, HOOK_MAX);   // 고정 도르래 1개 → 감은 만큼 그대로 오름
  const lift = hook - HOOK_MIN;
  const W = massKg * G;
  const ropeTension = W / eff;                                // 고정 도르래: 힘의 크기는 그대로, 방향만 바뀜
  const wheelForce = ropeTension * R_AXLE / R_WHEEL;          // 손바퀴 둘레에서 필요한 힘 (축바퀴 10:1)
  const perWorker = wheelForce / Math.max(1, workers);
  const tooHeavy = perWorker > MAX_WORKER_FORCE;
  const loadX = DROP_X - pull;                                // 갈고리로 끌면 짐이 앞으로 나감
  const tipMoment = massKg * (TIP_EDGE - loadX);              // 짐이 앞으로 넘기려는 모멘트(kg·mm)
  const tipRatio = tipMoment / RESIST;                        // 1을 넘으면 넘어짐
  const pulleyAngle = wound / R_PULLEY;
  return {
    th, wound, hook, lift, pull, loadX, massKg, W, ropeTension, wheelForce, perWorker, tooHeavy,
    tipRatio, tipping: tipRatio >= 1, warnTip: tipRatio >= 0.8,
    wheelTravel: th * R_WHEEL,                                // 손바퀴 둘레가 움직인 거리 = 10 × 감은 줄
    work: W * lift / 1000,
    pulleyAngle, ropePath: ropePath(hook, loadX),
  };
}

// 두 바퀴(또는 점, r=0)에 같은 줄이 걸릴 때의 접선. k = +1 시계, −1 반시계로 감김. [x, z] 평면
function tangent(C1, r1, k1, C2, r2, k2) {
  const D = [C2[0] - C1[0], C2[1] - C1[1]], d = Math.hypot(D[0], D[1]), phi = Math.atan2(D[1], D[0]);
  const th = phi + Math.acos((k1 * r1 - k2 * r2) / d), n = [Math.cos(th), Math.sin(th)];
  return [[C1[0] + k1 * r1 * n[0], C1[1] + k1 * r1 * n[1]], [C2[0] + k2 * r2 * n[0], C2[1] + k2 * r2 * n[1]]];
}
// 줄: 축(북) 위에서 풀려 → 활차 뒤쪽으로 올라가 → 활차 위를 넘어(반시계) → 앞쪽으로 내려와 갈고리 [x, y, z]
export function ropePath(hook, loadX = DROP_X) {
  const A = [AXLE.x, AXLE.z], C = [PULLEY.x, PULLEY.z], H = [loadX, hook];
  const [t1, t2] = tangent(A, R_AXLE, -1, C, R_PULLEY, -1);
  const [t3] = tangent(C, R_PULLEY, -1, H, 0, -1);
  const P = [[t1[0], 0, t1[1]], [t2[0], 0, t2[1]]];
  let a0 = Math.atan2(t2[1] - C[1], t2[0] - C[0]), a1 = Math.atan2(t3[1] - C[1], t3[0] - C[0]);
  while (a1 < a0) a1 += 2 * Math.PI;                          // 반시계: 각이 늘어남
  for (let i = 1; i <= 12; i++) { const a = a0 + (a1 - a0) * i / 12; P.push([C[0] + R_PULLEY * Math.cos(a), 0, C[1] + R_PULLEY * Math.sin(a)]); }
  P.push([H[0], 0, H[1]]);
  return P;
}

// ---------- 화성 현장: 공심돈 위로 돌을 올리는 장면 ----------
export const TOWER = { x0: -4300, x1: -8300, top: 6000 };   // 공심돈(치성 위 단) 앞면 x, 뒷면 x, 윗면 높이 (가정값)
export const PULL_TO = 1300;                                // 갈고리로 끌어 공심돈 위로 (짐이 x −5,150쯤)
export const PHASES = [
  { name: 'tie', dur: 5, caption: '돌을 동아줄로 묶어 갈고리에 건다' },
  { name: 'raise', dur: 14, caption: '여덟 사람이 좌우에서 손바퀴를 돌려 돌을 공심돈보다 높이 올린다' },
  { name: 'pull', dur: 7, caption: '갈고리 줄로 돌을 끌어당겨 공심돈 위에 조준한다' },
  { name: 'lower', dur: 7, caption: '손바퀴를 천천히 풀어 돌을 공심돈 위에 내려놓는다' },
  { name: 'back', dur: 7, caption: '줄을 풀고 갈고리를 되돌린다 — 다음 돌 또는 목재를 올린다' },
];
export const SCENE_TOTAL = PHASES.reduce((a, p) => a + p.dur, 0);
export const HOOK_TOP = TOWER.top + 600 + LOAD_H + 250;      // 올린 뒤 갈고리 높이 (돌 바닥이 공심돈 윗면보다 600 높이)
const HOOK_SET = TOWER.top + LOAD_H + 250;                  // 공심돈 위에 내려놓았을 때 갈고리 높이
export function scene(t) {
  let rest = clamp(t, 0, SCENE_TOTAL), phaseIndex = PHASES.length - 1;
  for (let i = 0; i < PHASES.length; i++) { if (rest < PHASES[i].dur || i === PHASES.length - 1) { phaseIndex = i; break; } rest -= PHASES[i].dur; }
  const ph = PHASES[phaseIndex], e = smooth(rest / ph.dur);
  let hook = HOOK_MIN, pull = 0, stoneOn = 'ground';
  switch (ph.name) {
    case 'tie': break;
    case 'raise': hook = HOOK_MIN + (HOOK_TOP - HOOK_MIN) * e; stoneOn = 'hook'; break;
    case 'pull': hook = HOOK_TOP; pull = PULL_TO * e; stoneOn = 'hook'; break;
    case 'lower': hook = HOOK_TOP + (HOOK_SET - HOOK_TOP) * e; pull = PULL_TO; stoneOn = e >= 1 ? 'tower' : 'hook'; break;
    case 'back': hook = HOOK_SET + (HOOK_TOP - HOOK_SET) * e; pull = PULL_TO * (1 - e); stoneOn = 'tower'; break;
  }
  const th = (hook - HOOK_MIN) / R_AXLE;
  const loadX = DROP_X - pull;
  // 돌 위치(중심 x, 바닥 z): 매달리면 갈고리를 따르고, 공심돈 위에 놓이면 그 자리에 남음
  const stone = stoneOn === 'tower' ? [DROP_X - PULL_TO, TOWER.top] : [loadX, hook - 250 - LOAD_H];
  return { phase: ph.name, phaseIndex, hook, pull, th, loadX, stoneOn, stone, caption: ph.caption };
}
