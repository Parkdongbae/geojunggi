// 자격루 시뮬레이션 — 시간을 넣으면 상태를 돌려주는 순수 함수 모음 (모델·화면이 함께 씀)
// 단위 mm, 시간은 시(h). 근거: 「보루각기」(세종실록 16년 7월 1일), 남문현, 김종성(2023)
export const CHEOK = 207;               // 주척 1자 = 20.7cm (남문현·한영호 1996)
export const RATE = 165.6 / 2;          // 수수호 수위 상승 mm/시간 (2시간당 16.6cm, 남문현·한영호 1996 실험값)

// ---------- 물시계(가운데 칸) ----------
export const VS = [{ x: -650, y: -330 }, { x: -650, y: 330 }];          // 수수호 2개: 하루씩 번갈아 사용(보루각기)
export const SS = { zb: 200, H: 2318, od: 373, wall: 15, bot: 20 };     // 11자2치 × 지름 1자8치
SS.zt = SS.zb + SS.H;
export const LID = { t: 20 };
// 방목: 너비 6치(124). 단면은 6치×6치로 봄(깊이 4치는 수수호에 꽂힌 깊이, 김종성 2023), 두께 8푼(17), 길이 11자4치
export const BM = { z0: SS.zt + LID.t, L: 2360, w: 124, t: 17 };
BM.z1 = BM.z0 + BM.L;
// 방목 안 배치 (u: +x 열린 면 쪽, v: +y 쪽) — 12시 동판은 왼쪽(v+) 뒤, 경점 동판은 오른쪽(v-) 앞 (김종성 2023의 엇갈린 배치)
export const PL = { s: { u: -20.75, v0: 4, v1: 45, vc: 24.5, dir: -1 }, n: { u: 20.75, v0: -45, v1: 7, vc: -19, dir: 1 } };
export const ROD = { L: 2111, s: 20, ins: 41 };                          // 잣대 10자2치
export const CROSS = { L: 93, t: 8, h: 10 };                             // 가로쇠 4치5푼 (젓가락 모양)
export const FLOAT = { d: 270, h: 150, draft: 60 };                      // 부표(가정)
export const L0 = 205;                                                   // 교대 직후 수수호 물 깊이(가정)
const zInner = SS.zb + SS.bot;
export const rodTop0 = zInner + L0 - FLOAT.draft + FLOAT.h - ROD.ins + ROD.L;
export const LATCH_DZ = 8;                                               // 가로쇠가 걸쇠를 미는 높이 = 구슬 바닥
export const SB = { r: 8 }, IB = { r: 23.5 };                            // 작은 구리구슬(탄환, 8푼) · 쇠구슬(지름 47mm, 서준 2007)

// ---------- 광판(廣板): 수수호 위에서 동쪽 칸 가운데 층 위까지 거의 수평으로 비스듬히 (서준 2007) ----------
// 광판에는 작은 구슬이 굴러가는 구리 홈만 있음. 두 방목에서 오는 홈이 X자로 엇갈려 12시 동통·경점 동통으로 갈라짐
export const BOARD = { x0: -430, z0: 2547.1, th: 2, L: 2420, y0: -440, y1: 440, t: 50 };
const th = BOARD.th * Math.PI / 180, cth = Math.cos(th), sth = Math.sin(th);
export const bw = (xl, y, zl) => [BOARD.x0 + xl * cth + zl * sth, y, BOARD.z0 - xl * sth + zl * cth];   // 광판 국소 → 세계
export const GZ = 11;                                                    // 광판 위 홈 속 구슬 중심 높이(국소)
// ---------- 철환 방출장치(鐵丸 放出裝置): 동쪽 칸 가운데 층 위 (서준 2007, 국립고궁박물관 복원품) ----------
// 동통부: 12시 동통(4자5치)·경점 동통(8자)을 나란히, 입구(서쪽)에서 동쪽으로 갈수록 약간 내려감
export const TUBE = { s: { x0: 2010, L: 932, y: 145, n: 12 }, n: { x0: 2010, L: 1656, y: 95, n: 25 }, od: 31, z0: 2470, a: 1.03 };
const ta = TUBE.a * Math.PI / 180;
export const holeD = (tb, k) => tb.L * (k + 1) / (tb.n + 1);
export const tubeP = (tb, d, dz = 0) => [tb.x0 + d * Math.cos(ta), tb.y, TUBE.z0 - d * Math.sin(ta) + dz];   // 동통 축 위 점
export const holeX = (tb, k) => tubeP(tb, holeD(tb, k))[0];
export const tbBall = (tb, d) => tubeP(tb, d, -(TUBE.od / 2 - 3) + SB.r);                                  // 동통 속 작은 구슬 중심
// 철환 방출부: 통로 4줄(격벽 5장), 입구(서쪽) 쪽으로 내려가는 기울기 — 들린 손잡이 아래로 쇠구슬이 서쪽으로 굴러 나감
export const RU = { x0: 2000, z0: 2300, a: 0.7, xs: 2030, xe: 3720, base: 20, wall: 70 };
const ca = RU.a * Math.PI / 180;
export const cw = (d, y, h) => [RU.x0 + d * Math.cos(ca) - h * Math.sin(ca), y, RU.z0 + d * Math.sin(ca) + h * Math.cos(ca)];   // 통로 국소(d: 서→동, h: 바닥 위) → 세계
export const dOf = x => (x - RU.x0) / Math.cos(ca);
export const CH = { s: 210, h: 120, g: 25, j: -60 };                  // 통로 중심 y: ①12시 쇠구슬 ②횡기 머리(작은 구슬) ③경·초점 쇠구슬 ④점 쇠구슬
export const CWALL = [[245, 255], [165, 175], [65, 75], [-25, -15], [-105, -95]];
// 횡기(橫機): 머리는 동통 구멍 아래(②), 손잡이는 쇠구슬 앞(서쪽)을 막음. 머리가 눌리면 손잡이가 들려 그대로 멈춤
export const LV = { h: 78, s: { yp: 170, yh: 145, yk: 210, ang: 40 }, g: { yp: 70, yh: 95, yk: 25, ang: -35 }, j: { yp: 70, yh: 95, yk: -60, ang: -13 } };
export const FINGER = IB.r + 4;                                          // 손잡이 막대가 쇠구슬 중심에서 서쪽으로 떨어진 거리
export const SBOX = { x: 2035, y: 120, z: 2205 };                         // 작은 구슬 받는 상자(통로 ② 서쪽 끝 아래)
// ---------- 동쪽 칸(시보 장치) ----------
export const BAY = { x0: 1900, x1: 3900, y0: -1100, y1: 1100, mid: 1700, up: 2600, ft: 40, roof: 3500 };
export const S12 = { colX: 2370, y: 410, tubeX: 2470, tubeY: 486, tubeZ0: 1830, tubeZ1: 2065, spoonZ: 1805 };
export const HM = { x: 2470, yN: 486, yS: -880, zp: 600, tilt: 17, L: 1366, w: 31, t: 35 };   // 횡목 6자6치 × 1치5푼 × 1치7푼
HM.yp = (HM.yN + HM.yS) / 2; HM.half = HM.L / 2; HM.dz = HM.half * Math.sin(HM.tilt * Math.PI / 180);
export const WH = { x: 2470, y: -465, R: 400, ring: 877, top: 1650, rodR: 340, poleY: -865 }; WH.lift = 2 * (WH.poleY - HM.yp) * -Math.sin(HM.tilt * Math.PI / 180);  // 평륜(가로 바퀴), 12신은 쇠 기둥(鐵條)을 따라 오르내림
// 평륜 앞 비스듬한 구리판(서준 2007, 남문현 2002 그림): 보이던 신이 내려오다 발밑 쇠바퀴가 이 판에 막혀 굴러 내려가며 평륜을 30° 돌림
// 각도(도)는 평륜 중심 기준(-90 = 남쪽 = 신이 올라가는 자리), r = 발밑 쇠바퀴가 지나는 반지름, z = 판 윗면
export const RAMP = { r: 478, th0: -84, th1: -118, z0: 990, z1: 884, w: 36, t: 4, wheelZ: 882, open: 40, board: [-60, -84] };
RAMP.zAt = th => RAMP.z0 + (RAMP.z1 - RAMP.z0) * (th - RAMP.th0) / (RAMP.th1 - RAMP.th0);
// 신이 평륜과 함께 -90°에서 -120°로 도는 동안(u = 0→1) 구리판을 따라 내려가는 높이(쉬는 자리 기준)
RAMP.dollOff = u => { const th = -90 - 30 * u; return th >= RAMP.th1 ? RAMP.zAt(th) - RAMP.wheelZ : Math.max(0, (RAMP.z1 - RAMP.wheelZ) * (th + 120) / (RAMP.th1 + 120)) }; WH.lift = 2 * (WH.poleY - HM.yp) * -Math.sin(HM.tilt * Math.PI / 180);  // 평륜(가로 바퀴), 12신은 쇠 기둥(鐵條)을 따라 오르내림
export const GK = { LC: 2900, LF: 3060, RC: 3380, RF: 3540, y: 410, z0: 900 };           // 경점기: 좌원주·좌방주·우원주·우방주
export const TL = k => ({ x: k % 2 === 0 ? GK.LF - 70 : GK.LF + 70, z: 1960 - 210 * k });   // 왼쪽(경) 숟가락 자리 k=0..4
export const TR = k => ({ x: k % 2 === 0 ? GK.RF - 70 : GK.RF + 70, z: 1930 - 210 * k });   // 오른쪽(점) 숟가락 자리
export const YG = 485, YJ = 340;                                          // 가로통·경 멈춤통 y / 점 멈춤통 y
// 위층 3신: 팔꿈치가 들림막대(둥근 기둥 속에서 올라옴) 바로 위에 오도록 세움. 인형 국소좌표(앞 = +x)를 z축으로 90° 돌려 북쪽(악기)을 봄
export const ARM = { E: [10, -92, 380], P: [80, -92, 400], H: [150, -92, 420], M: [130, -92, 620], ang: 35, lift: 40 };   // 팔꿈치·회전축·손·채 머리(국소)
export const FIG = { s: S12.colX - 92, g: GK.LC - 92, j: GK.RC - 92, y: 410 - 10, z: BAY.up + BAY.ft };
export const INST = { s: S12.colX, g: GK.LC, j: GK.RC, hy: 410 + 259, hz: BAY.up + BAY.ft + 551.5 };   // 채 머리가 악기에 닿는 점(세계)
export const BIN = { s: { x: 2470, y: 690 }, n: { x: 3510, y: 420 } };

// ---------- 시각 ----------
export const SI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const SIH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const JEOLGI = ['춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한', '입춘', '우수', '경칩'];
export const SWAP = 12;   // 수수호를 바꾸는 시각(오정, 가정) — 하루 37개 구슬이 모두 한 수수호 안에서 떨어지도록
const LAT = 37.57 * Math.PI / 180, EPS = 23.44 * Math.PI / 180;
export function sunTimes(j) {
  const lam = j * 15 * Math.PI / 180, dec = Math.asin(Math.sin(EPS) * Math.sin(lam));
  const c = (Math.sin(-0.833 * Math.PI / 180) - Math.sin(LAT) * Math.sin(dec)) / (Math.cos(LAT) * Math.cos(dec));
  const H = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI / 15;
  return { rise: 12 - H, set: 12 + H };
}
export function nightInfo(j) { const { rise, set } = sunTimes(j), hon = set + 0.6, sin = rise - 0.6 + 24; return { rise, set, hon, sin, L: sin - hon } }
// 한 번의 수수호 사용(오정부터 다음날 오정까지) 동안의 사건. tau = 교대 후 지난 시간
export function runEvents(j) {
  const E = [];
  for (let i = 0; i < 12; i++) { const tau = 1 + 2 * i, h = (SWAP + tau) % 24; E.push({ kind: 's', i, si: Math.floor(((h + 1) % 24) / 2), tau, h, rise: RATE * tau }); }
  const N = nightInfo(j);
  for (let k = 0; k < 25; k++) { const t = N.hon + k * N.L / 25, tau = t - SWAP; E.push({ kind: k % 5 === 0 ? 'g' : 'j', i: k, gyeong: Math.floor(k / 5) + 1, jeom: k % 5 + 1, tau, h: t % 24, rise: RATE * tau }); }
  return E;
}
export const holeZ = rise => rodTop0 + rise + LATCH_DZ + SB.r;            // 동판 구멍(구슬 중심) 높이
export const tauOf = h => ((h - SWAP) % 24 + 24) % 24;
export const activeVessel = absH => Math.floor((absH - SWAP) / 24) & 1;  // 0: 앞(남) 수수호, 1: 뒤(북) 수수호
export function doneAt(j, h) { const tau = tauOf(h), out = { s: new Set(), n: new Set() }; for (const e of runEvents(j)) if (e.tau <= tau) (e.kind === 's' ? out.s : out.n).add(e.i); return out }
export const riseAt = h => RATE * tauOf(h);
export function timeLabel(j, h) {
  const si = Math.floor(((h + 1) % 24) / 2), within = ((h + 1) % 24) - si * 2;
  const chojeong = within < 1 ? '초' : '정', gak = Math.floor((within % 1) * 60 / 14.4);
  const N = nightInfo(j); let night = ''; const hh = h < N.sin - 24 ? h + 24 : h;
  if (hh >= N.hon && hh < N.sin) { const k = Math.floor((hh - N.hon) / (N.L / 25)); night = (Math.floor(k / 5) + 1) + '경 ' + (k % 5 + 1) + '점'; }
  return { si, txt: SI[si] + '시 ' + chojeong + ' ' + gak + '각', night };
}
export const fmtH = h => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
