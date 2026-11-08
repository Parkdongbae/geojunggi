// ================= 녹로(轆轤) =================
// 근거: 『화성성역의궤』 권수 도설 「녹로전도·분도」(틀 세로 15척·높이 10척, 간목 35척 — 한국민족문화대백과사전 「녹로」 인용),
//       김평원 2017 『다산학』 30 (그림 19: 의궤 전도·분도, 간주·활차·동아줄·녹로·갈고리). 1척 = 303mm. 근거 없는 치수는 // 가정값.
// 좌표: x = 앞(−, 짐 쪽) → 뒤(+), y = 좌우, z = 위
import * as NS from './nk_sim.js';
const { FRAME_L, FRAME_H, FRAME_W, POLE_BASE, POLE_TOP, PULLEY, R_PULLEY, AXLE, R_AXLE, R_WHEEL, WHEEL_Y, DROP_X, HOOK_MIN, LOAD_H } = NS;

export function buildModel() {
  const G = {}, steps = [];
  const group = (key, info) => { G[key] = { key, ...info, members: [] } };
  const step = (key, label, members) => { steps.push({ key, label, members }); G[key].members.push(...members) };
  const mem = (label, col, node, x = {}) => ({ label, col, node, ...x });
  const WD = '#7a4a28', WD2 = '#8a5a35', WL = '#a67c4f', STN = '#9a958b', FE = '#3b3a3a', HEMP = '#c2a26a';
  const cylY = (c, d, h, n = 32) => ({ p: 'C', d1: d, d2: d, h, n, M: mul(T(...c), Rx(90)) });
  const HL = FRAME_L / 2, HW = FRAME_W / 2, FX = 1900;   // 틀 기둥 x 위치 (가정값)

  // ===== 1. 밑틀(機) =====
  group('base', { n: '밑틀(機)', hj: '機', col: WD, mat: 'wood',
    desc: '땅을 고르고 긴 밑틀 2개를 나란히 놓은 뒤 가로대 3개를 짜 맞춥니다. 녹로 전체의 무게와 짐의 무게를 이 밑틀이 땅에 나누어 전합니다. 바퀴가 없지만 부품이 적고 단순해 뜯어서 다른 공사장으로 옮겨 다시 짜기 쉬웠습니다.',
    dim: '세로 15척(4,545) — 의궤 / 가로 8척(2,424)·단면 200×200 — 가정값(의궤 전도 비율)' });
  step('base', '밑틀 2개와 가로대 3개 짜기', [
    mem('밑틀 2개(세로 15척)', WD, uni(box([0, -HW, 100], [FRAME_L, 200, 200]), box([0, HW, 100], [FRAME_L, 200, 200])), { mat: 'wood' }),
    mem('밑틀 가로대 3개', WD2, uni(...[-2100, 0, 2100].map(x => box([x, 0, 100], [180, FRAME_W - 200, 180]))), { mat: 'wood' })]);

  // ===== 2. 틀 기둥·윗틀 =====
  group('frame', { n: '틀 기둥과 윗틀', hj: '機柱', col: WD2, mat: 'wood',
    desc: '밑틀 네 귀에 기둥을 세우고 위를 윗틀로 이어 높이 10척의 네모난 틀을 만듭니다. 틀 뒤쪽에는 축을 받칠 받침 기둥을 세웁니다.',
    dim: '틀 높이 10척(3,030) — 의궤 / 기둥 단면 180×180, 축 받침 기둥(x 800) — 가정값' });
  step('frame', '틀 기둥 4개와 윗틀', [
    mem('틀 기둥 4개', WD2, uni(...[-FX, FX].flatMap(x => [-HW, HW].map(y => box([x, y, (200 + FRAME_H) / 2], [180, 180, FRAME_H - 200])))), { mat: 'wood' }),
    mem('윗틀(세로 2·가로 2)', WD, uni(box([0, -HW, FRAME_H - 75], [2 * FX + 300, 150, 150]), box([0, HW, FRAME_H - 75], [2 * FX + 300, 150, 150]),
      box([-FX, 0, FRAME_H - 75], [150, FRAME_W + 150, 150]), box([FX, 0, FRAME_H - 75], [150, FRAME_W + 150, 150])), { mat: 'wood' }),
    mem('축 받침 기둥 2개', WD2, uni(...[-HW, HW].map(y => diff(box([AXLE.x, y, (200 + AXLE.z + 250) / 2], [200, 200, AXLE.z + 50]), cylY([AXLE.x, y, AXLE.z], 2 * R_AXLE + 30, 260)))), { mat: 'wood' })]);

  // ===== 3. 축(녹로)·손바퀴 =====
  group('axle', { n: '축(녹로)과 손바퀴', hj: '軸', col: WL, mat: 'woodL',
    desc: '줄을 감는 축(이것이 본래의 녹로, 곧 "줄을 감는 기계"입니다)을 받침 기둥에 끼우고, 양끝에 나무살을 꽂아 손바퀴를 만듭니다. 여덟 사람이 넷씩 둘로 나뉘어 좌우 손바퀴를 돌립니다. 손바퀴 반지름이 축 반지름의 10배라 힘이 1/10로 줄어듭니다(축바퀴의 원리).',
    dim: '축 지름 200·길이 3,300, 손바퀴 반지름 1,000(나무살 3개×2, 끝을 밧줄로 이음) — 가정값 / R:r = 10:1은 기중가도설 「녹로 자루:기둥 = 10:1」과 같은 비' });
  const tips = y => [0, 1, 2, 3, 4, 5].map(j => { const a = (90 + 60 * j) * Math.PI / 180; return [AXLE.x + Math.cos(a) * R_WHEEL, y, AXLE.z + Math.sin(a) * R_WHEEL] });
  const SPIN = { spin: 'ax', spiv: [AXLE.x, 0, AXLE.z], sax: [0, 1, 0] };
  step('axle', '축 끼우고 손바퀴 만들기', [
    mem('축(軸, 줄을 감는 북)', WL, rod([AXLE.x, -WHEEL_Y - 200, AXLE.z], [AXLE.x, WHEEL_Y + 200, AXLE.z], 2 * R_AXLE, 24), { mat: 'woodL', ...SPIN }),
    mem('손바퀴 나무살 6개', WL, uni(...[-WHEEL_Y, WHEEL_Y].flatMap(y => [0, 1, 2].map(k => {
      const a = (90 + 60 * k) * Math.PI / 180, dx = Math.cos(a) * R_WHEEL, dz = Math.sin(a) * R_WHEEL;
      return rod([AXLE.x - dx, y, AXLE.z - dz], [AXLE.x + dx, y, AXLE.z + dz], 70);
    }))), { mat: 'woodL', ...SPIN }),
    mem('손바퀴 테(나무살 끝을 잇는 밧줄)', HEMP, uni(...[-WHEEL_Y, WHEEL_Y].flatMap(y => { const t = tips(y); return t.map((p, j) => rod(p, t[(j + 1) % 6], 22)) })), { mat: 'hemp', ...SPIN }),
    mem('목시(木矢, 축이 빠지지 않게 꽂는 나무못) 2개', WD, uni(...[-HW - 130, HW + 130].map(y => rod([AXLE.x, y, AXLE.z + 160], [AXLE.x, y, AXLE.z - 160], 30))), { mat: 'wood', ...SPIN })]);

  // ===== 4. 간목(竿) 2 =====
  group('pole', { n: '간목(竿) 2개와 판', hj: '竿木', col: WD, mat: 'wood',
    desc: '틀 앞쪽에 길이 35척(약 10.6m)의 간목 두 개를 짐 쪽으로 조금 기울여 세우고, 꼭대기와 중간을 판으로 묶습니다. 간목은 오늘날 크레인의 지브(jib)에 해당하지만 위아래로 눕히거나(기복) 돌릴(선회) 수는 없었습니다.',
    dim: '간목 길이 35척(10,605) — 의궤 / 단면 220×220, 앞으로 1,600 기울임(꼭대기 높이 약 10.7m) — 가정값(의궤 전도 비율) / 판 2(분도) — 크기 가정값' });
  const poleAt = (s, z) => { const u = (z - POLE_BASE.z) / (POLE_TOP.z - POLE_BASE.z); return [POLE_BASE.x + (POLE_TOP.x - POLE_BASE.x) * u, s * (POLE_BASE.y + (POLE_TOP.y - POLE_BASE.y) * u), z] };
  const ZT = PULLEY.z + 120, ZM = 3200;
  step('pole', '간목 2개 세우고 판으로 묶기', [
    mem('간목 2개(35척)', WD, uni(...[-1, 1].map(s => beam([POLE_BASE.x, s * POLE_BASE.y, POLE_BASE.z], [POLE_TOP.x, s * POLE_TOP.y, POLE_TOP.z], 220, 220))), { mat: 'wood' }),
    mem('꼭대기 판(두 간목을 묶음)', WD2, box([poleAt(1, ZT)[0], 0, ZT + 240], [260, 2 * POLE_TOP.y + 520, 90]), { mat: 'wood' }),
    mem('중간 판', WD2, box([poleAt(1, ZM)[0], 0, ZM], [240, 2 * poleAt(1, ZM)[1] + 520, 90]), { mat: 'wood' })]);

  // ===== 5. 버팀목(撑木) =====
  group('strut', { n: '버팀목(撑木)', hj: '撑木', col: WD2, mat: 'wood',
    desc: '틀 윗머리에서 간목 중간으로 버팀목 두 개를 비스듬히 대어, 긴 간목이 흔들리거나 넘어지지 않게 받칩니다.',
    dim: '단면 150×150, 틀 앞 윗머리 → 간목 높이 5,200 — 가정값(의궤 분도의 撑木)' });
  step('strut', '버팀목 2개 대기', [
    mem('버팀목 2개', WD2, uni(...[-1, 1].map(s => beam([-FX, s * HW, FRAME_H], poleAt(s, 5200), 150, 150))), { mat: 'wood' })]);

  // ===== 6. 활차 =====
  group('pulley', { n: '활차(滑車)', hj: '滑車', col: WL, mat: 'woodL',
    desc: '두 간목 꼭대기 사이에 쇠축을 꿰어 활차(도르래) 하나를 겁니다. 고정 도르래 하나라 힘이 줄지는 않고, 줄을 당기는 방향만 아래(축 쪽)로 바꿔 줍니다.',
    dim: '활차 지름 400·두께 90, 쇠축 — 가정값 / 개수 1(의궤 전도)' });
  step('pulley', '꼭대기에 활차 걸기', [
    mem('활차(고정 도르래 1개)', WL, diff(cylY([PULLEY.x, 0, PULLEY.z], 2 * R_PULLEY + 40, 90), cylY([PULLEY.x, 0, PULLEY.z], 2 * R_PULLEY - 10, 34)),
      { mat: 'woodL', spin: 'pu', spiv: [PULLEY.x, 0, PULLEY.z], sax: [0, 1, 0] }),
    mem('활차 쇠축과 쇠띠', FE, uni(rod([PULLEY.x, -POLE_TOP.y - 160, PULLEY.z], [PULLEY.x, POLE_TOP.y + 160, PULLEY.z], 40),
      ...[-1, 1].map(s => box([PULLEY.x, s * (POLE_TOP.y + 125), PULLEY.z + 80], [120, 12, 300]))), { mat: 'iron' })]);

  // ===== 7. 동아줄·갈고리 =====
  group('rope', { n: '동아줄과 갈고리', hj: '索', col: HEMP, mat: 'hemp',
    desc: '동아줄 한끝을 축에 감고, 활차 위로 넘겨 앞으로 늘어뜨린 끝에 쇠갈고리를 답니다. 짐을 올린 뒤에는 갈고리에 맨 줄을 끌어 짐을 원하는 자리 위로 조준하고, 축을 풀어 내려놓습니다.',
    dim: '동아줄 지름 30, 축에 감긴 줄, 쇠갈고리 — 가정값 / 사용법=의궤(김평원 2017 p.261 인용)' });
  step('rope', '동아줄 감고 갈고리 달기', [
    mem('동아줄', HEMP, box([DROP_X, 0, HOOK_MIN], [1, 1, 1]), { mat: 'hemp', dyn: 'rope' }),
    mem('축에 감긴 동아줄', HEMP, uni(...[-250, -170, -90, -10, 70, 150, 230].map(y => diff(cylY([AXLE.x, y, AXLE.z], 2 * R_AXLE + 56, 26, 32), cylY([AXLE.x, y, AXLE.z], 2 * R_AXLE - 4, 32, 32)))), { mat: 'hemp', ...SPIN }),
    mem('쇠갈고리', FE, uni(rod([DROP_X, 0, HOOK_MIN], [DROP_X, 0, HOOK_MIN - 120], 30),
      diff(cylY([DROP_X + 40, 0, HOOK_MIN - 190], 160, 26, 24), cylY([DROP_X + 40, 0, HOOK_MIN - 190], 96, 32, 24), box([DROP_X + 110, 0, HOOK_MIN - 150], [80, 60, 90]))), { mat: 'iron', mv: 'hook' })]);

  // ===== 8. 짐(돌) =====
  group('load', { n: '짐 — 돌', hj: '石', col: STN, mat: 'stone',
    desc: '돌을 동아줄로 열십자로 묶어 갈고리에 겁니다. 녹로는 무게중심이 간목 쪽(앞)으로 쏠리고 나무 활차가 견디는 무게에 한계가 있어, 작은 돌이나 목재를 높은 곳으로 올리는 데 썼습니다(김평원 2017).',
    dim: '돌 800×600×500(약 650kg 화강암은 무거워 조작 탭 기본값은 300kg) — 가정값' });
  const SZ = LOAD_H / 2;
  step('load', '돌 묶어 갈고리에 걸기', [
    mem('돌', STN, box([DROP_X, 0, SZ], [800, 600, LOAD_H]), { mat: 'stone', mv: 'stone' }),
    mem('돌을 묶은 줄', HEMP, uni(box([DROP_X, 0, SZ], [830, 40, LOAD_H + 30]), box([DROP_X, 0, SZ], [40, 630, LOAD_H + 30]),
      rod([DROP_X - 300, 0, LOAD_H + 10], [DROP_X, 0, HOOK_MIN - 230], 26), rod([DROP_X + 300, 0, LOAD_H + 10], [DROP_X, 0, HOOK_MIN - 230], 26)), { mat: 'hemp', mv: 'stone' })]);

  return { G, steps };
}
