// ================= 거중기(擧重機, 1792 정약용) =================
// 근거: 『화성성역의궤』 도설(1801), 정약용 「기중가도설」(『여유당전서』 문집 권10),
//       Kim 2017, 매일신문 1997.4.23 「하이테크 문화유산-거중기」, 위키원·수원시 자료 (PLAN.md 1절 정리)
// 1척 = 303mm. 근거 없는 치수는 // 가정값 표시.
import * as SM from './sim.js';
const { LOWER_Z0, UPPER_Z, HAM_Z, BIG, AXLE, R_PULLEY, R_BIG, R_END, END, UPX, DNX, POLE, poleAt, MO_T, HYEOP_T } = SM;

export function buildModel() {
  const G = {}, steps = [];
  const group = (key, info) => { G[key] = { key, ...info, members: [] } };
  const step = (key, label, members) => { steps.push({ key, label, members }); G[key].members.push(...members) };
  const mem = (label, col, node, x = {}) => ({ label, col, node, ...x });

  const WD = '#7a4a28', WD2 = '#8a5a35', WL = '#a67c4f', STN = '#9a958b', FE = '#3b3a3a', HEMP = '#c2a26a';

  // y축 방향 원통(도르래·축용), 다리 중심선: 아래(±1100,±900) → 위(±480,±450), 150→4322 (의궤 전도 비율: 위가 좁고 아래가 넓게 벌어짐)
  const cylY = (c, d, h, n = 32) => ({ p: 'C', d1: d, d2: d, h, n, M: mul(T(...c), Rx(90)) });
  const legAt = z => { const t = (z - 150) / 4172; return [1100 - 620 * t, 900 - 450 * t]; };
  const SIGNS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const nmS = (s, str) => (s > 0 ? '오른쪽 ' : '왼쪽 ') + str;

  // ===== 1. 터·받침돌 =====
  group('base', { n: '받침돌과 터', hj: '基石', col: STN, mat: 'stone',
    desc: '단단하게 다질 곳을 골라 터를 정하고, 다리 4개가 가라앉지 않도록 받침돌을 놓습니다. 거중기는 바퀴가 없어 한 자리에 고정된 기중기였으므로 터가 단단해야 했습니다.',
    dim: '받침돌 400×400×150 (가정값) — 의궤에 받침돌 기록은 없음' });
  step('base', '터 고르기·받침돌 4개', [mem('받침돌 4개(다리 밑)', STN,
    uni(...SIGNS.map(([sx, sy]) => box([sx * 1100, sy * 900, 75], [400, 400, 150]))), { mat: 'stone' })]);

  // ===== 2. 승량각(다리) =====
  group('leg', { n: '승량각(다리) 4개', hj: '承樑脚', col: WD, mat: 'wood',
    desc: '길이 14척(약 4.2m)짜리 다리 4개를 세웁니다. 다리가 바깥쪽으로 쓰러지지 않게 안쪽으로 조금 기울여 세우고, 위에서 매달리는 모든 무게를 땅으로 내려보냅니다.',
    dim: '길이 14척(4,242), 단면 180×180 — 길이=의궤, 단면·기울기=가정값(바닥 x±1,100·y±900 → 위 x±480·y±450, 의궤 전도 비율)' });
  // 장부구멍은 가로대 장부가 채워 겉에서 보이지 않으므로 다리는 통나무로 둔다.
  // (기울어진 다리에 상자 구멍을 CSG로 파면 면 일부가 빠져 면 위에 대각선이 생김)
  const TIERS = [{ za: 2500, zb: 2632 }, { za: 3150, zb: 3282 }];   // 가로대 두 단 높이 — 의궤 전도처럼 둘 다 위쪽 (가정값)
  const legs = SIGNS.map(([sx, sy]) => beam([sx * 1100, sy * 900, 150], [sx * 480, sy * 450, 4322], 180, 180));
  step('leg', '승량각 4개 세우기', legs.map(n => mem('승량각(다리) — 14척 4,242, 안쪽으로 기울임', WD, n, { mat: 'wood' })));

  // ===== 3·4. 전후강·좌우강 =====
  group('frame', { n: '전후강·좌우강(가로대)', hj: '前後杠·左右杠', col: WD2, mat: 'wood',
    desc: '다리를 앞뒤·좌우로 엮는 가로대를 두 단에 걸어 뼈대가 퍼지지 않게 합니다. 못 없이 장부(맞물림)로 끼우고 나무쐐기로만 고정했기 때문에 해체도 쉬웠습니다.',
    dim: '단면 120×120, 아래 단 높이 4척(1,212)·위 단 z 2,900 — 아래 단 높이=매일신문(나무쐐기 위치), 위 단·쐐기 위치=가정값' });
  const tierFrame = t => {
    const [xa, ya] = legAt(t.za), [xb, yb] = legAt(t.zb);
    const bars = [], wedges = [];
    for (const sy of [-1, 1]) {   // 전후강: x방향 (기둥 중심선 끼리, 장부 100을 밖으로 뻗음)
      bars.push(uni(box([0, sy * ya, t.za], [2 * xa, 120, 120]),
        box([-(xa + 50), sy * ya, t.za], [100, 40, 80]), box([xa + 50, sy * ya, t.za], [100, 40, 80])));
      wedges.push(box([-(xa + 92), sy * ya, t.za], [20, 160, 20]), box([xa + 92, sy * ya, t.za], [20, 160, 20]));
    }
    for (const sx of [-1, 1]) {   // 좌우강: y방향
      bars.push(uni(box([sx * xb, 0, t.zb], [120, 2 * yb, 120]),
        box([sx * xb, -(yb + 50), t.zb], [40, 100, 80]), box([sx * xb, yb + 50, t.zb], [40, 100, 80])));
      wedges.push(box([sx * xb, -(yb + 92), t.zb], [160, 20, 20]), box([sx * xb, yb + 92, t.zb], [160, 20, 20]));
    }
    return { bars, wedges };
  };
  const f1 = tierFrame(TIERS[0]);
  step('frame', '아래 단 전후강·좌우강 + 나무쐐기', [
    ...f1.bars.map((n, i) => mem(i < 2 ? '전후강(장부 맞춤)' : '좌우강(장부 맞춤)', WD2, n, { mat: 'wood' })),
    mem('나무쐐기 8개(장부 빠지지 않게)', WL, uni(...f1.wedges), { mat: 'woodL' })]);
  const f2 = tierFrame(TIERS[1]);
  step('frame', '위 단 전후강·좌우강', [
    ...f2.bars.map((n, i) => mem(i < 2 ? '전후강(장부 맞춤)' : '좌우강(장부 맞춤)', WD2, n, { mat: 'wood' })),
    mem('나무쐐기 8개', WL, uni(...f2.wedges), { mat: 'woodL' })]);

  // ===== 5. 횡량·괘정 =====
  group('crossbeam', { n: '횡량과 괘정', hj: '橫樑·掛正', col: WD, mat: 'wood',
    desc: '꼭대기 가로보(횡량)를 올리고 괘정(걸쇠) 4개로 다리에 걸어 고정합니다. 횡량은 도르래틀과 돌의 온 무게를 매다는 보입니다.',
    dim: '길이 2,000·단면 240×300, 윗면 z≈4,400 — 높이=Kim 2017(약 4.4m), 길이·단면=가정값 / 늑철 4(의궤) / 양끝 고정 도르래 2(지름 230, x=±900)=의궤 전도, 크기=가정값' });
  step('crossbeam', '횡량 올리기 + 괘정 4개', [
    mem('횡량(꼭대기 가로보)', WD, box([0, 0, 4250], [2000, 240, 300]), { mat: 'wood' }),
    mem('늑철 4(횡량 쇠테)', FE, uni(...[-760, -330, 330, 760].map(x => box([x, 0, 4250], [24, 280, 330]))), { mat: 'iron' }),
    // 횡량 양끝에 매단 고정 도르래: 중유량에서 나온 밧줄을 다리 바깥으로 내려 대활륜에 보냄 (의궤 전도)
    ...[-1, 1].map(s => mem(nmS(s, '횡량 끝 고정 도르래'), WL, diff(cylY([s * END.x, 0, END.z], 2 * R_END, 60), cylY([s * END.x, 0, END.z], 2 * R_END - 30, 26)),
      { mat: 'woodL', spin: s > 0 ? 'eR' : 'eL', spiv: [s * END.x, 0, END.z], sax: [0, 1, 0] })),
    ...[-1, 1].map(s => mem(nmS(s, '끝 도르래 등자쇠·축핀'), FE, uni(rod([s * END.x, -60, END.z], [s * END.x, 60, END.z], 20),
      ...[-40, 40].map(y => box([s * END.x, y, (END.z + 4100) / 2], [40, 10, 4100 - END.z]))), { mat: 'iron' })),
    mem('괘정(걸쇠) 4개 — 다리에 검', WD2, uni(...SIGNS.flatMap(([sx, sy]) => [
      beam([sx * 480, sy * 450, 4340], [sx * 330, sy * 130, 4340], 80, 80),
      box([sx * 330, sy * 130, 4260], [80, 80, 160])])), { mat: 'wood' })]);

  // ===== 6. 중유량(고정 도르래틀) =====
  // F1: 틀은 축 높이를 지나는 높이 80 띠 두 장 → 도르래 위·아래 절반이 드러남.
  //     도르래는 밝은 나무(woodL) + 둘레 홈(깊이 15·폭 30, 홈 바닥 r=105: 밧줄 반지름 120과 맞음)
  //     + 옆면 바퀴살 구멍 6개(회전이 보이게). 도르래마다 축핀(지름 20)과 등자쇠(ㄷ자 쇠).
  group('upper', { n: '중유량(고정 도르래틀)', hj: '中遊樑', col: WD2, mat: 'wood',
    desc: '고정 도르래 4개를 물린 중유량을 횡량에 매닮니다. 고정 도르래는 힘의 크기를 바꾸지 않고 방향만 바꾸어, 사람이 바닥에서 얼레를 감을 수 있게 합니다. 가운데 함환(고리)에 두 밧줄을 좌우로 하나씩 묶습니다.',
    dim: '길이 1,480, 도르래 4개 x=±600·±200(같은 간격 400), 도르래 중심 z=3,900 — 도르래 개수(위 4)=의궤, 크기(지름 190)·간격=의궤 전도 비율의 가정값 / 등자쇠(등철) 4·함환·늑철=의궤' });
  // 도르래(활차): 지름 240·두께 70, 가운데 폭 30·깊이 15 홈, 바퀴살 구멍 6개
  const pulleyNode = (x, z) => diff(cylY([x, 0, z], 2 * R_PULLEY, 70), cylY([x, 0, z], 2 * R_PULLEY - 30, 30),
    ...[0, 60, 120, 180, 240, 300].map(a => {
      const q = a * Math.PI / 180;
      return cylY([x + 0.6 * R_PULLEY * Math.cos(q), 0, z + 0.6 * R_PULLEY * Math.sin(q)], 20, 96);
    }));
  // 등자쇠(∩자 쇠) + 축핀: 쇠띠 2장이 도르래 양옆(y=±47)에서 축 끝을 잡고 도르래 위(z+165)에서
  // 좁은 가로쇠(폭 60)로 이어짐. 밧줄은 y=0 평면에서 도르래 좌우(x±120)로 오르내리므로 쇠와 겹치지 않음.
  // 축핀은 틀 띠(y=±90~120)까지 꿰어 도르래를 틀에 고정. (가정값)
  const yoke = (x, z) => uni(box([x, 0, z + 165], [60, 122, 24]),
    ...[-47, 47].map(y => box([x, y, z + 80], [40, 12, 194])),
    rod([x, -124, z], [x, 124, z], 20));
  step('upper', '중유량(고정 도르래 4) 달기', [
    mem('중유량 틀(도르래틀 띠)', WD2, uni(box([0, -105, UPPER_Z], [1480, 30, 80]), box([0, 105, UPPER_Z], [1480, 30, 80])), { mat: 'wood' }),
    ...UPX.map((x, k) => mem(`중유량 도르래(활차) ${k + 1}(고정)`, WL, pulleyNode(x, UPPER_Z),
      { mat: 'woodL', spin: 'u' + k, spiv: [x, 0, UPPER_Z], sax: [0, 1, 0] })),
    ...UPX.map((x, k) => mem(`중유량 도르래 등자쇠·축핀 ${k + 1}`, FE, yoke(x, UPPER_Z), { mat: 'iron' })),
    // 함환: 중유량 틀 띠(y=±105) 밑에서 비스듬한 쇠띠 2개로 매단 고리. 두 밧줄이 여기에 묶임 (모양·크기=가정값)
    // 밧줄 두 끝이 x=±50에서 고리를 지나도록 고리 지름 150(안 70) (가정값)
    mem('함환(밧줄 고리, 가운데)', FE, uni(diff(cyl([0, 0, 3672], 150, 150, 12), cyl([0, 0, 3672], 70, 70, 16)),
      rod([0, -60, 3676], [0, -105, UPPER_Z - 40], 14), rod([0, 60, 3676], [0, 105, UPPER_Z - 40], 14)), { mat: 'iron' }),
    mem('상철강(틀을 꿰는 쇠막대)', FE, rod([0, -160, 4060], [0, 160, 4060], 36), { mat: 'iron' }),
    mem('중유량 늑철(횡량에 매단 쇠)', FE, uni(rod([0, -105, 3940], [0, -105, 4102], 22), rod([0, 105, 3940], [0, 105, 4102], 22)), { mat: 'iron' })]);

  // ===== 7. 하유량(움직 도르래틀)·사슬 =====
  group('lower', { n: '하유량(움직 도르래틀)과 사슬', hj: '下遊樑·鐵索', col: WD2, mat: 'wood',
    desc: '움직 도르래 4개를 물린 하유량이 돌을 직접 떠받칩니다. 하유량을 받치는 줄은 좌우 합쳐 8가닥이라, 드는 힘이 돌 무게의 1/8로 줄어듭니다. 쇠사슬 2개는 하철강에서 돌 앞뒤로 내려가 돌 밑 철강에 평행하게 걸립니다.',
    dim: '길이 1,120, 도르래 4개 x=±435·±145 (같은 간격 290, 사이 틈 100), 처음 도르래 중심 z=1,500 — 도르래 개수(아래 4)=의궤, 크기·위치=가정값 / 하철강 2(앞뒤 방향, x=±150, z 1,330)·쇠사슬 2개(x=±150, 각각 돌 앞뒤 y=±360으로 내려감, 고리 지름 70)=가정값, 사슬 2가닥=의궤, 철강 연결=Kim 2017 그림 17·18 해석' });
  // 사슬: 지름 20 고리(링) 이어 붙이기. 고리 평면은 사슬축(z)을 포함하며 90°씩 번갈아 서고,
  // 위·아래 끝 고리는 (x, y, 90°회전)로 각각 하철강(x축 막대)과 철강(x축 막대) 끝을 감쌈 (S6)
  // 사슬 고리: 세워진 고리(축이 수평) 지름 70·굵기 15를 54mm 간격으로, 90°씩 번갈아 엇물림 (가정값)
  const RING = diff(cyl([0, 0, 0], 70, 70, 15), cyl([0, 0, 0], 40, 40, 24));
  const chainV = (x, y, zTop, zBot) => {
    const n = Math.max(3, Math.round((zTop - zBot) / 54)), links = [];
    for (let k = 0; k <= n; k++) {
      const z = zTop + (zBot - zTop) * k / n;
      const rot = k % 2 ? mul(T(x, y, z), mul(Rz(90), Rx(90))) : mul(T(x, y, z), Rx(90));
      links.push(xform(RING, rot));
    }
    return links;
  };
  // 사슬 자리: 쇠사슬 2개(x=±150)가 각각 하철강(앞뒤 방향)에서 돌(y ±300) 앞뒤 바깥 y=±360으로 내려가 돌 밑 철강 틀에 걸림.
  const CH_X = 150, CH_Y = 360, BAR_Z = 132, HCG_Z = 1330;   // 철강 중심 높이(돌 바닥 150에 닿음), 하철강 높이 (가정값)
  step('lower', '하유량(움직 도르래 4) + 쇠사슬 2가닥', [
    mem('하유량 틀(움직 도르래틀 띠)', WD2, uni(box([0, -105, LOWER_Z0], [1120, 30, 80]), box([0, 105, LOWER_Z0], [1120, 30, 80])), { mat: 'wood', mv: 'lower' }),
    ...DNX.map((x, k) => mem(`하유량 도르래(활차) ${k + 1}(움직)`, WL, pulleyNode(x, LOWER_Z0),
      { mat: 'woodL', mv: 'lower', spin: 'd' + k, spiv: [x, 0, LOWER_Z0], sax: [0, 1, 0] })),
    ...DNX.map((x, k) => mem(`하유량 도르래 등자쇠·축핀 ${k + 1}`, FE, yoke(x, LOWER_Z0), { mat: 'iron', mv: 'lower' })),
    // 하철강: 하유량 틀 띠(y=±105)에 매단 쇠고리 2개로 도르래 밑(z 1,330)에 y방향으로 걸린 쇠막대.
    // 밧줄은 도르래 밑(z≥1,365)을 돌므로 하철강(z 1,310~1,350)과 겹치지 않음.
    mem('하철강 2개(사슬 걸이 쇠막대)', FE, uni(...[-CH_X, CH_X].flatMap(x => [rod([x, -CH_Y - 40, HCG_Z], [x, CH_Y + 40, HCG_Z], 40),
      rod([x, -105, LOWER_Z0 - 40], [x, -105, HCG_Z], 20), rod([x, 105, LOWER_Z0 - 40], [x, 105, HCG_Z], 20)])), { mat: 'iron', mv: 'lower' }),
    mem('쇠사슬 왼쪽(앞뒤 고리)', FE, uni(...chainV(-CH_X, -CH_Y, HCG_Z, BAR_Z), ...chainV(-CH_X, CH_Y, HCG_Z, BAR_Z)), { mat: 'iron', mv: 'chainL' }),
    mem('쇠사슬 오른쪽(앞뒤 고리)', FE, uni(...chainV(CH_X, -CH_Y, HCG_Z, BAR_Z), ...chainV(CH_X, CH_Y, HCG_Z, BAR_Z)), { mat: 'iron', mv: 'chainR' })]);

  // ===== 8. 소거(얼레 틀) =====
  group('socgeo', { n: '소거(얼레 틀) 2', hj: '繅車', col: WD, mat: 'wood',
    desc: '거중기 양옆에 얼레 틀(소거)을 하나씩 비스듬히 세웁니다. 긴 기둥(장강) 2개의 밑동은 바깥 땅에 두고 윗끝은 아래 단 좌우강에 기대며, 위아래에 가로재(모강·협강)를 걸어 큰 도르래와 얼레축을 달 자리를 만듭니다.',
    dim: '장강 12척(3,636) 2개 + 단강 5척(1,515) 2개(모강·협강). 장강 밑동 x=±3,375, 윗끝은 아래 단 좌우강 바깥면(z 2,632)에 기댐(약 46°), 장강 간격 y=±460 — 길이=의궤(위키원), 기대는 방식=의궤 전도, 위치=가정값' });
  // 장강은 바깥 땅에서 아래 단 좌우강 바깥면에 기댐 (의궤 전도). 다리와 겹치지 않게 y=±460.
  const PY = 460;
  const socParts = [];
  for (const s of [-1, 1]) {
    const [mx, mz] = poleAt(MO_T), [hx, hz] = poleAt(HYEOP_T);
    socParts.push(
      mem(nmS(s, '장강 2개(12척 기둥, 좌우강에 기댐)'), WD, uni(...[-PY, PY].map(y => beam([s * POLE.bx, y, 0], [s * POLE.tx, y, POLE.tz], 150, 150))), { mat: 'wood' }),
      mem(nmS(s, '모강(위 가로재)'), WD2, box([s * mx, 0, mz], [150, 1515, 150]), { mat: 'wood' }),
      mem(nmS(s, '협강(아래 가로재)'), WD2, box([s * hx, 0, hz + 40], [150, 1515, 150]), { mat: 'wood' }));
  }
  step('socgeo', '소거 2틀을 좌우강에 기대어 세우기', socParts);

  // ===== 9. 대활륜·얼레축·나무살 =====
  group('wheel', { n: '대활륜과 얼레축', hj: '大滑輪·繅軸', col: WL, mat: 'wood',
    desc: '장강 사이 모강 아래에 큰 도르래(대활륜)를 축핀으로 걸고, 협강 위 얼레축에 나무살 6개를 끼운 뒤 나무살 끝을 밧줄로 이어 얼레 모양 바퀴를 만듭니다. 사람들이 나무살 끝 밧줄을 당기면 축이 돌면서 밧줄을 감습니다. 축바퀴는 힘을 축 반지름과 나무살 길이의 비(75:600 = 1/8)만큼 줄여 줍니다.',
    dim: '대활륜 지름 700(모강 아래 2척=606, 장강을 따라 잼), 얼레축 지름 150(협강 위 6자=1,818, 장강을 따라 잼), 나무살 6개×2(길이 1,200, 끝을 밧줄로 이음) — 위치=의궤·매일신문, 크기=의궤 전도 비율의 가정값' });
  const wheelParts = [], SPY = 330;
  for (const s of [-1, 1]) {
    const ax = s > 0 ? 'axR' : 'axL', bx = s * BIG.x, cx = s * AXLE.x;
    const tips = [0, 1, 2, 3, 4, 5].map(j => { const a = (90 + 60 * j) * Math.PI / 180; return [cx + Math.cos(a) * 600, AXLE.z + Math.sin(a) * 600] });
    wheelParts.push(
      mem(nmS(s, '대활륜(큰 도르래)'), WL, diff(cylY([bx, 0, BIG.z], 2 * R_BIG, 80), cylY([bx, 0, BIG.z], 2 * R_BIG - 40, 34)),
        { mat: 'wood', spin: s > 0 ? 'bw0' : 'bw1', spiv: [bx, 0, BIG.z], sax: [0, 1, 0] }),
      mem(nmS(s, '대활륜 축핀(장강에 꿴 쇠)'), FE, rod([bx, -PY - 90, BIG.z], [bx, PY + 90, BIG.z], 40), { mat: 'iron' }),
      mem(nmS(s, '얼레축(소축)'), WD2, rod([cx, -PY - 90, AXLE.z], [cx, PY + 90, AXLE.z], 150),
        { mat: 'wood', spin: ax, spiv: [cx, 0, AXLE.z], sax: [0, 1, 0] }),
      mem(nmS(s, '나무살 6개'), WL, uni(...[0, 1, 2].flatMap(k => [-SPY, SPY].map(y => {
        const a = (90 + 120 * k) * Math.PI / 180, dx = Math.cos(a) * 600, dz = Math.sin(a) * 600;
        return rod([cx - dx, y, AXLE.z - dz], [cx + dx, y, AXLE.z + dz], 60);
      }))), { mat: 'woodL', spin: ax, spiv: [cx, 0, AXLE.z], sax: [0, 1, 0] }),
      // 의궤 전도처럼 나무살 끝을 밧줄로 이어 얼레 모양으로 (가정값)
      mem(nmS(s, '나무살 끝을 잇는 밧줄'), HEMP, uni(...tips.flatMap((p, j) => {
        const q = tips[(j + 1) % 6];
        return [rod([p[0], -SPY, p[1]], [q[0], -SPY, q[1]], 16), rod([p[0], SPY, p[1]], [q[0], SPY, q[1]], 16), rod([p[0], -SPY, p[1]], [p[0], SPY, p[1]], 16)];
      })), { mat: 'hemp', spin: ax, spiv: [cx, 0, AXLE.z], sax: [0, 1, 0] }));
  }
  step('wheel', '대활륜·얼레축·나무살 끼우기', wheelParts);

  // ===== 10. 밧줄 =====
  group('rope', { n: '밧줄 2가닥', hj: '繩', col: HEMP, mat: 'hemp',
    desc: '밧줄 두 가닥을 함환에 묶어 좌우로 하나씩 걸고, 각 줄이 하유량·중유량 도르래를 번갈아 지나 대활륜을 넘어 얼레축에 감습니다. 좌우 얼레를 같은 속도로 감아야 하유량이 수평을 유지합니다.',
    dim: '지름 30, 마(麻) 색 (가정값) — 줄 거는 법=매일신문, 경로=sim.js(호는 8토막)' });
  step('rope', '밧줄 걸기(좌·우 1가닥씩)', [
    mem('밧줄(왼쪽)', HEMP, box([0, 0, HAM_Z], [1, 1, 1]), { mat: 'hemp', dyn: 'ropeL', mv: 'ropeL' }),
    mem('밧줄(오른쪽)', HEMP, box([0, 0, HAM_Z], [1, 1, 1]), { mat: 'hemp', dyn: 'ropeR', mv: 'ropeR' }),
    // 의궤 전도처럼 대활륜 둘레와 얼레축에 밧줄이 여러 번 감긴 모습 (감긴 수=가정값)
    ...[-1, 1].map(s => mem(nmS(s, '대활륜에 감긴 밧줄(3바퀴)'), HEMP, uni(...[-27, 0, 27].map(y =>
      diff(cylY([s * BIG.x, y, BIG.z], 2 * R_BIG + 60, 24, 48), cylY([s * BIG.x, y, BIG.z], 2 * R_BIG - 2, 30, 48)))), { mat: 'hemp' })),
    ...[-1, 1].map(s => mem(nmS(s, '얼레축에 감긴 밧줄(8바퀴)'), HEMP, uni(...Array.from({ length: 8 }, (_, k) => -210 + 60 * k).map(y =>
      diff(cylY([s * AXLE.x, y, AXLE.z], 212, 28, 32), cylY([s * AXLE.x, y, AXLE.z], 148, 34, 32)))), { mat: 'hemp' }))]);

  // ===== 11. 돌·받침목 =====
  group('stone', { n: '돌과 받침목', hj: '石·枋', col: STN, mat: 'stone',
    desc: '받침목 두 개 사이 틈에 철강 2개를 끼우고 그 위에 성돌을 올린 뒤, 쇠사슬 고리를 철강에 연결하면 완성! 돌의 무게는 줄 8가닥이 나누어 받습니다.',
    dim: '성돌 900×600×500(약 729kg, 밀도 2,700kg/m³) / 받침목 150×150×1,000 2개(x=±375, 앞뒤 방향) / 철강 2개(x=±240, 길이 800, 돌 너비보다 앞뒤로 100씩 김) + 양끝을 잇는 고리쇠 — Kim 2017 그림 17·18 해석, 크기=가정값' });
  step('stone', '돌에 철강 끼우고 사슬 걸기 — 완성', [
    mem('받침목 2개(철강을 끼울 틈)', WD2, uni(box([-375, 0, 75], [150, 1000, 150]), box([375, 0, 75], [150, 1000, 150])), { mat: 'wood' }),
    mem('철강 2개와 고리쇠(돌을 받치는 쇠막대, 사슬을 검)', FE, uni(
      rod([-240, -CH_Y - 40, BAR_Z], [-240, CH_Y + 40, BAR_Z], 36), rod([240, -CH_Y - 40, BAR_Z], [240, CH_Y + 40, BAR_Z], 36),
      rod([-258, -CH_Y, BAR_Z], [258, -CH_Y, BAR_Z], 30), rod([-258, CH_Y, BAR_Z], [258, CH_Y, BAR_Z], 30)), { mat: 'iron', mv: 'bars' }),
    mem('화강암 성돌(900×600×500, 약 729kg)', STN, box([0, 0, 400], [900, 600, 500]), { mat: 'stone', mv: 'stone' })]);

  return { G, steps };
}
