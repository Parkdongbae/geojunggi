// 거중기 시뮬레이션 — 순수 함수 모음 (모델·화면·테스트가 함께 씀)
// DOM·three 의존 금지: node에서 바로 테스트한다.
// 단위: mm, rad, N, kg. 근거: PLAN.md 1절 조사 결과 (의궤·Kim 2017·매일신문 1997)
//   척 환산 1척 = 303mm, 1근 = 600g, 도르래 8개(위4·아래4) = 줄 8가닥, 축바퀴 8배

export const CHEOK = 303;            // mm (1척 = 30.3cm, Kim 2017 부록)
export const GEUN = 0.6;             // kg (1근 = 600g, 12,000근 = 7.2t 환산과 맞춤)
export const G = 9.8;                // 중력가속도 N/kg
export const SEGMENTS = 8;           // 하유량을 받치는 줄 가닥 수 (좌 4 + 우 4)

// 기계 주요 치수 (PLAN 1-3절 「앱에서 쓰는 치수」)
export const R_AXLE = 75;            // 얼레축 반지름 (지름 150)
export const R_SPOKE = 600;          // 나무살 끝 반지름 (나무살 길이 1,200)
export const R_PULLEY = 95;          // 도르래(활차) 반지름 (지름 190 — 의궤 전도 비율, 가정값)
export const R_BIG = 350;            // 대활륜 반지름 (지름 700 — 의궤 전도 비율, 가정값)
export const R_END = 115;            // 횡량 끝 고정 도르래 반지름 (가정값)
export const END = { x: 900, z: 3950 };   // 횡량 끝 고정 도르래 중심 (의궤 전도: 횡량 양끝에 매단 도르래)
export const UPX = [-600, -200, 200, 600];   // 중유량(고정) 도르래 4개 중심 x
export const DNX = [-435, -145, 145, 435];   // 하유량(움직) 도르래 4개 중심 x — 같은 간격 290
// 소거 장강: 바깥 땅(x=3,375)에서 아래 단 좌우강 바깥면(x=866, z=2,632)에 기댄 12척 기둥 (의궤 전도, 위치=가정값)
export const POLE = { bx: 3375, tx: 866, tz: 2632, L: 3636 };
export const poleAt = t => [POLE.bx + (POLE.tx - POLE.bx) * t / POLE.L, POLE.tz * t / POLE.L];   // 밑동에서 t(mm) 올라간 점 [x, z]
export const LIFT_MAX = 1700;        // 하유량 최대 들림 (중유량 아래 400까지)
export const LOWER_Z0 = 1500;        // 하유량 도르래 중심 처음 높이
export const UPPER_Z = 3900;         // 중유량(고정) 도르래 중심 높이
export const HAM_Z = 3660;           // 함환(밧줄 묶는 고리) 바닥 높이
export const TILT_SPAN = 1350;       // 좌우 줄 받침 사이 거리 (기울기 계산용, 가정값)
export const TILT_WARN = 4 * Math.PI / 180;  // 기울기 경고 한계 (의궤: 좌우 같은 속도)
export const MO_T = 3300, HYEOP_T = 150;          // 모강·협강이 장강에 걸린 자리(밑동에서 장강을 따라 잰 길이)
export const BIG = { x: poleAt(MO_T - 606)[0], y: 0, z: poleAt(MO_T - 606)[1] };      // 대활륜 중심: 모강 아래 2척(606)
export const AXLE = { x: poleAt(HYEOP_T + 1818)[0], y: 0, z: poleAt(HYEOP_T + 1818)[1] };  // 얼레축 중심: 협강 위 6자(1,818)
export const MAX_WORKER_FORCE = 300; // N — 1인이 오래 당길 수 있는 힘(가정값), 넘으면 얼레가 안 돎

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = u => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };  // smoothstep

// ---------- 거중기 상태 ----------
// thL·thR: 좌·우 얼레 회전각(rad, 감는 쪽 +). massKg: 돌 무게. eff: 마찰 효율(0~1)
export function crane({ thL = 0, thR = 0, massKg = 729, eff = 1 } = {}) {
  // 한쪽 줄이 4가닥이므로 얼레가 감은 줄 = 4 × 들림 높이
  const hL = thL * R_AXLE / 4;       // 하유량 왼쪽 끝이 오른 높이(mm)
  const hR = thR * R_AXLE / 4;       // 하유량 오른쪽 끝이 오른 높이(mm)
  const lift = clamp((hL + hR) / 2, 0, LIFT_MAX);
  const tilt = Math.atan((hR - hL) / TILT_SPAN);   // 하유량·돌 기울기(rad)
  const ropeTension = massKg * G / SEGMENTS / eff; // 줄 1가닥 장력(N)
  const handForcePerSide = ropeTension * R_AXLE / R_SPOKE;  // 나무살 끝에서 필요한 힘(N, 한쪽 합계)
  const perWorker = n => { const f = handForcePerSide / Math.max(1, n); return { N: f, kgf: f / G, tooHeavy: f > MAX_WORKER_FORCE }; };
  const ropePulled = 8 * lift;       // 감긴 밧줄 길이(mm) — 일의 원리: 힘 1/8, 거리 8배
  // 도르래 회전각(rad): 줄이 지나간 길이 / 반지름. 위 도르래(줄이 위를 지남) +, 아래 도르래 −
  const sheaveAngles = [lift / R_PULLEY, lift / R_PULLEY, lift / R_PULLEY, lift / R_PULLEY,
    -lift / R_PULLEY, -lift / R_PULLEY, -lift / R_PULLEY, -lift / R_PULLEY];
  const bigWheelAngles = [4 * lift / R_BIG, 4 * lift / R_BIG];  // 줄 4가닥분이 지나감
  return {
    hL, hR, lift, tilt,
    warn: Math.abs(tilt) > TILT_WARN,
    ropeTension, handForcePerSide, perWorker, ropePulled,
    work: massKg * G * lift / 1000,  // 지금까지 한 일(J) = m·g·h
    sheaveAngles, bigWheelAngles,
    ropePath: ropePaths(hL, hR),
  };
}

// 밧줄 경로 (PLAN 3절): 함환 → 아래 도르래 밑 반바퀴 → 위 도르래 위 반바퀴 → … → 대활륜 → 얼레축
// 꼭짓점 목록 [x,y,z]; 줄은 도르래 홈이 있는 y=0 평면에 두고, 각 호는 8토막. 왼쪽 줄은 x 대칭.
function ropePaths(hL, hR) {
  return { L: ropeSide(-1, hL), R: ropeSide(1, hR) };
}
// 두 바퀴에 같은 줄이 걸릴 때의 접선. k = +1(시계 방향으로 감김), −1(반시계). [x, z] 평면.
function tangent(C1, r1, k1, C2, r2, k2) {
  const D = [C2[0] - C1[0], C2[1] - C1[1]], d = Math.hypot(D[0], D[1]), phi = Math.atan2(D[1], D[0]);
  const th = phi + Math.acos((k1 * r1 - k2 * r2) / d), n = [Math.cos(th), Math.sin(th)];
  return [[C1[0] + k1 * r1 * n[0], C1[1] + k1 * r1 * n[1]], [C2[0] + k2 * r2 * n[0], C2[1] + k2 * r2 * n[1]]];
}
const ang = (C, P) => Math.atan2(P[1] - C[1], P[0] - C[0]);
// C 둘레를 a0 → a1 (k=+1 시계: 각 감소, −1 반시계: 각 증가)로 도는 점들 — 줄은 언제나 바퀴 둘레(테)에 붙음
function arcPts(C, r, a0, a1, k, out) {
  let da = a1 - a0; if (k > 0) { while (da > 0) da -= 2 * Math.PI } else { while (da < 0) da += 2 * Math.PI }
  const n = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 12)));
  for (let i = 1; i <= n; i++) { const a = a0 + da * i / n; out.push([C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)]) }
}
// 오른쪽(s=+1) 기준으로 [x, z] 경로를 만든 뒤 s를 곱해 좌우를 맞춤
function ropeSide(s, h) {
  const zL = LOWER_Z0 + h, R = R_PULLEY;
  const [l1, l2] = [DNX[2], DNX[3]], [u1, u2] = [UPX[2], UPX[3]];
  const P = [[l1 - R, HAM_Z + 16], [l1 - R, zL]];          // 함환 고리에 묶인 끝 → 하유량 안쪽 도르래
  const under = cx => arcPts([cx, zL], R, Math.PI, 2 * Math.PI, -1, P);   // 움직 도르래 밑 반바퀴
  const over = cx => arcPts([cx, UPPER_Z], R, Math.PI, 0, 1, P);           // 고정 도르래 위 반바퀴
  under(l1); P.push([u1 - R, UPPER_Z]); over(u1);
  P.push([l2 - R, zL]); under(l2); P.push([u2 - R, UPPER_Z]);
  // 중유량 바깥 도르래(시계) → 횡량 끝 도르래(시계) → 대활륜(반시계: 안쪽으로 내려와 밑을 돌아 바깥으로) → 얼레축(시계: 위로 감김)
  const U = [u2, UPPER_Z], E = [END.x, END.z], W = [BIG.x, BIG.z], A = [AXLE.x, AXLE.z];
  const [t1, t2] = tangent(U, R, 1, E, R_END, 1);
  arcPts(U, R, Math.PI, ang(U, t1), 1, P); P.push(t2);
  const [t3, t4] = tangent(E, R_END, 1, W, R_BIG, -1);
  arcPts(E, R_END, ang(E, t2), ang(E, t3), 1, P); P.push(t4);
  const [t5, t6] = tangent(W, R_BIG, -1, A, R_AXLE, 1);
  arcPts(W, R_BIG, ang(W, t4), ang(W, t5), -1, P); P.push(t6);
  arcPts(A, R_AXLE, ang(A, t6), ang(A, t6) - Math.PI / 2, 1, P);
  return P.map(([x, z]) => [s * x, 0, z]);
}

// ---------- 과학 원리용 (그래프·SVG) ----------
// 교과서식: 움직도르래 n개 → 받치는 줄 max(1, 2n)가닥 → 줄 한 가닥 힘 = m·g/segments/eff
// 거중기(움직도르래 4개)는 8가닥 → 힘 1/8 (crane()의 SEGMENTS와 같음)
export function pulleyForce({ massKg = 100, movable = 0, wheelRatio = 1, eff = 1 } = {}) {
  const segments = Math.max(1, 2 * Math.max(0, movable));
  const force = massKg * G / segments / eff;      // 줄 한 가닥이 받는 힘(N)
  const hand = force / Math.max(wheelRatio, 1e-9); // 축바퀴(얼레)를 거친 손 힘(N)
  return { segments, force, hand, distanceRatio: segments };
}

// ---------- 화성 현장 장면 타임라인 (PLAN 7절, 총 60초) ----------
// 돌을 들어 올려 유형거(수레)에 싣는 장면. 유형거는 앞(−y)에서 거중기 아래 앞 가로대(전후강, 밑면 z≈1,152)
// 밑으로 들어와 돌 밑에 서고, 돌을 싣고 다시 앞으로 나간다. 그래서 짐틀을 낮게(침목 윗면 560) 잡고
// 돌 윗면(560+500=1,060)이 전후강 밑을 지나가게 했다. 모든 값은 가정값.
export const CART_TOP = 560;   // 유형거 침목 윗면 높이 = 돌 바닥이 놓이는 높이 (가정값)
export const STONE_BOT = 150;  // 받침목 위 돌 바닥 높이 (받침목 150)
export const CART_LIFT = CART_TOP - STONE_BOT;   // 410: 돌을 짐틀에 내려놓을 때의 들림 높이
export const RAISE_H = 650;    // 돌을 드는 높이(약 0.65m): 돌 바닥 800 > 침목 윗면 560 (수레가 밑으로 들어올 틈)
export const CART_IN = -6000;  // 유형거 대기 위치(y, 앞쪽)
export const CART_OUT = -4200; // 싣고 나간 뒤 위치(y)
export const CART_WALL = [6000, -2200];   // 성벽 앞 도착 위치 [x, y] (성벽 앞면 x≈7,800)
export const PHASES = [
  { name: 'chain', dur: 6,  caption: '받침목 위 돌 밑에 철강을 끼우고 쇠사슬을 건다' },
  { name: 'raise', dur: 14, caption: '좌우 30명이 같은 속도로 얼레를 감는다 → 돌이 약 0.65m 오른다' },
  { name: 'cart',  dur: 10, caption: '유형거가 앞 가로대 밑으로 들어와 돌 밑에 선다' },
  { name: 'lower', dur: 10, caption: '얼레를 천천히 풀어 돌을 유형거에 내려놓는다 (쿵)' },
  { name: 'out',   dur: 10, caption: '사슬과 철강을 빼고, 유형거가 돌을 싣고 성벽 쪽으로 간다' },
  { name: 'nokro', dur: 10, caption: '성벽 앞: 높은 곳은 녹로(높이 약 11m)로 올렸다' },
];
export const SCENE_TOTAL = PHASES.reduce((a, p) => a + p.dur, 0);

export function scene(t) {
  let rest = clamp(t, 0, SCENE_TOTAL), phaseIndex = PHASES.length - 1;
  for (let i = 0; i < PHASES.length; i++) { if (rest < PHASES[i].dur || i === PHASES.length - 1) { phaseIndex = i; break; } rest -= PHASES[i].dur; }
  const ph = PHASES[phaseIndex], u = clamp(rest / ph.dur, 0, 1), e = smooth(u);   // 마지막 순간(t = SCENE_TOTAL)은 u = 1
  let lift = 0, cartX = 0, cartY = CART_IN, chainsOn = true, stoneOn = 'ground';
  switch (ph.name) {
    case 'chain': break;
    case 'raise': lift = RAISE_H * e; stoneOn = 'hook'; break;
    case 'cart': lift = RAISE_H; cartY = CART_IN * (1 - e); stoneOn = 'hook'; break;
    case 'lower': lift = RAISE_H + (CART_LIFT - RAISE_H) * e; cartY = 0; stoneOn = u >= 1 ? 'cart' : 'hook'; break;
    case 'out': lift = CART_LIFT; cartY = CART_OUT * e; chainsOn = false; stoneOn = 'cart'; break;
    case 'nokro': lift = CART_LIFT; cartX = CART_WALL[0] * e; cartY = CART_OUT + (CART_WALL[1] - CART_OUT) * e; chainsOn = false; stoneOn = 'cart'; break;
  }
  const thL = lift * 4 / R_AXLE, thR = thL;  // 좌우 같은 속도로 감음 → crane({thL,thR}).lift === lift
  // 돌의 이동량(처음 자리 기준): 매달려 있으면 [0,0,lift], 실린 뒤에는 유형거와 함께
  const stoneOff = stoneOn === 'cart' ? [cartX, cartY, CART_LIFT] : [0, 0, lift];
  return { phase: ph.name, phaseIndex, lift, thL, thR, cartX, cartY, chainsOn, stoneOn, stoneOff, caption: ph.caption };
}
