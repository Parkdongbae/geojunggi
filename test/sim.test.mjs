// 거중기 시뮬레이션 단위 테스트 (node --test test/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { crane, pulleyForce, scene, PHASES, SCENE_TOTAL, SEGMENTS, LIFT_MAX, G, GEUN, R_AXLE, R_SPOKE, MAX_WORKER_FORCE, RAISE_H, CART_LIFT, CART_TOP, STONE_BOT } from '../src/sim.js';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ---- lift: thL=thR일 때 각도에 비례·단조 증가 ----
test('lift는 얼레 각도에 비례한다 (thL=thR)', () => {
  const a = crane({ thL: 1, thR: 1 });
  const b = crane({ thL: 2, thR: 2 });
  assert.ok(close(a.lift, R_AXLE / 4));
  assert.ok(close(b.lift, 2 * a.lift));           // 비례
  assert.ok(b.lift > a.lift);                      // 단조 증가
});

test('lift는 LIFT_MAX에서 clamp된다', () => {
  const big = crane({ thL: 1000, thR: 1000 });
  assert.equal(big.lift, LIFT_MAX);
  assert.equal(crane({ thL: -50, thR: -50 }).lift, 0);   // 아래로 clamp
});

// ---- tilt: 부호와 경고 ----
test('tilt 부호: 오른쪽을 더 감으면 양수', () => {
  assert.ok(crane({ thL: 0, thR: 2 }).tilt > 0);
  assert.ok(crane({ thL: 2, thR: 0 }).tilt < 0);
  assert.equal(crane({ thL: 1, thR: 1 }).tilt, 0);
});

test('tilt가 4°를 넘으면 warn', () => {
  // 좌우 높이 차 = (thR−thL)·75/4. 4° 한계는 차 ≈ 94mm → 각도 차 약 5rad
  assert.ok(!crane({ thL: 0.5, thR: 0.5 + 0.2 }).warn);   // 3.75mm 차
  assert.ok(!crane({ thL: 0, thR: 2 }).warn);              // 37.5mm 차 (약 1.6°)
  assert.ok(crane({ thL: 0, thR: 6 }).warn);               // 112.5mm 차 (약 4.8°)
});

// ---- 장력·일 보존 ----
test('줄 장력 × 8 = m·g (eff=1)', () => {
  const m = 729;
  const st = crane({ thL: 1, thR: 1, massKg: m });
  assert.ok(close(st.ropeTension * SEGMENTS, m * G));
});

test('일 보존: 줄 힘 × 감은 거리 = m·g·lift (eff=1)', () => {
  const m = 900, st = crane({ thL: 3, thR: 3, massKg: m });
  assert.ok(close(st.ropeTension * st.ropePulled, m * G * st.lift, 1e-4));
});

test('축바퀴: 나무살 끝 힘 × (rSpoke/rAxle) = 줄 장력', () => {
  const st = crane({ thL: 1, thR: 1, massKg: 729 });
  assert.ok(close(st.handForcePerSide * R_SPOKE / R_AXLE, st.ropeTension));
});

test('효율 50%면 줄 장력이 2배', () => {
  const a = crane({ thL: 1, thR: 1, massKg: 729, eff: 1 });
  const b = crane({ thL: 1, thR: 1, massKg: 729, eff: 0.5 });
  assert.ok(close(b.ropeTension, 2 * a.ropeTension));
});

// ---- 기록과의 대조: 7.2t, 15명이면 1인 73.5N ----
test('7.2t를 15명이 당기면 1인 약 73.5N (기록: 1인 240kg 몫과 같은 이야기)', () => {
  const st = crane({ thL: 1, thR: 1, massKg: 7200 });
  const p = st.perWorker(15);
  assert.ok(close(p.N, 73.5, 0.2));
  assert.ok(close(p.kgf, 7.5, 0.05));
});

test('일꾼이 적으면 1인 힘이 한계(300N)를 넘어 tooHeavy', () => {
  const st = crane({ thL: 1, thR: 1, massKg: 7200 });
  assert.ok(st.perWorker(15).N <= MAX_WORKER_FORCE && !st.perWorker(15).tooHeavy);
  assert.ok(st.perWorker(2).N > MAX_WORKER_FORCE && st.perWorker(2).tooHeavy);
});

test('ropePulled = 8 × lift (일의 원리)', () => {
  const st = crane({ thL: 2, thR: 1.4 });
  assert.ok(close(st.ropePulled, 8 * st.lift));
});

// ---- pulleyForce: 교과서식 복합도르래 ----
test('움직도르래 4개 → 줄 8가닥, 힘 1/8 (SEGMENTS와 일치)', () => {
  const r = pulleyForce({ massKg: 100, movable: 4, wheelRatio: 1, eff: 1 });
  assert.equal(r.segments, SEGMENTS);
  assert.equal(r.distanceRatio, 8);
  assert.ok(close(r.force, 100 * G / 8));
});

test('pulleyForce(1000근, 움직 4, 축바퀴 10배)는 기중가도설(40근/1000근)과 같은 자릿수', () => {
  const r = pulleyForce({ massKg: 1000 * GEUN, movable: 4, wheelRatio: 10, eff: 1 });
  const forceGeun = r.hand / (GEUN * G);   // 손 힘을 근으로 환산
  assert.ok(forceGeun > 5 && forceGeun < 200, `forceGeun=${forceGeun}`);
});

test('움직도르래 수에 따라 segments·distanceRatio가 바뀐다', () => {
  assert.equal(pulleyForce({ movable: 0 }).segments, 1);
  assert.equal(pulleyForce({ movable: 1 }).segments, 2);
  assert.equal(pulleyForce({ movable: 3 }).distanceRatio, 6);
});

// ---- scene(t): 위상 순서·연속성 ----
test('PHASES는 이름이 서로 다르고 총 길이가 0보다 크다', () => {
  const names = PHASES.map(p => p.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(SCENE_TOTAL >= 50);                       // 약 60초
  assert.ok(PHASES.every(p => p.caption && p.dur > 0));
});

test('scene(t)는 위상 순서대로 진행된다', () => {
  const order = PHASES.map(p => p.name);
  let seen = [];
  for (let t = 0; t <= SCENE_TOTAL; t += 0.1) {
    const s = scene(t);
    if (!seen.length || seen[seen.length - 1] !== s.phase) seen.push(s.phase);
    assert.ok(order.indexOf(s.phase) >= 0);
    assert.equal(s.phase, order[s.phaseIndex]);
  }
  assert.deepEqual(seen, order);
});

test('scene(t)의 lift·th·유형거·돌 위치는 연속이다 (점프 없음)', () => {
  let prev = scene(0);
  for (let t = 0.05; t <= SCENE_TOTAL; t += 0.05) {
    const s = scene(t);
    assert.ok(Math.abs(s.lift - prev.lift) < 8, `lift jump at t=${t}: ${prev.lift}→${s.lift}`);
    assert.ok(Math.abs(s.thL - prev.thL) < 0.6, `thL jump at t=${t}`);
    assert.ok(Math.abs(s.cartX - prev.cartX) < 80 && Math.abs(s.cartY - prev.cartY) < 80, `cart jump at t=${t}`);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(s.stoneOff[k] - prev.stoneOff[k]) < 80, `stone jump at t=${t} axis ${k}`);
    assert.ok(s.lift >= 0 && s.lift <= RAISE_H + 1e-9);
    prev = s;
  }
});

const T0 = name => PHASES.slice(0, PHASES.findIndex(p => p.name === name)).reduce((a, p) => a + p.dur, 0);
const TE = name => T0(name) + PHASES.find(p => p.name === name).dur;

test('scene(t): 돌은 바닥 → 갈고리 → 수레 순서로 옮겨 가고, 사슬은 내려놓은 뒤 풀린다', () => {
  const at = d => scene(d).stoneOn;
  assert.equal(at(T0('chain') + 1), 'ground');
  assert.equal(at(T0('raise') + 2), 'hook');
  assert.equal(at(T0('lower') + 2), 'hook');
  assert.equal(at(T0('out') + 2), 'cart');
  assert.equal(at(SCENE_TOTAL), 'cart');
  assert.equal(scene(T0('out') + 2).chainsOn, false);
  assert.equal(scene(1).chainsOn, true);
});

test('scene(t)의 얼레 각도는 모든 t에서 crane()의 lift와 맞다', () => {
  for (let t = 0; t <= SCENE_TOTAL; t += 0.5) {
    const s = scene(t), c = crane({ thL: s.thL, thR: s.thR });
    assert.ok(close(c.lift, s.lift, 1e-6), `t=${t}`);
  }
});

test('유형거가 들어올 때 돌 바닥이 침목보다 높고, 내려놓으면 침목 위(CART_TOP)에 앉는다', () => {
  for (let t = T0('cart'); t <= TE('cart'); t += 0.25) assert.ok(STONE_BOT + scene(t).lift > CART_TOP + 100);
  const end = scene(TE('lower') - 0.001);
  assert.ok(close(STONE_BOT + end.lift, CART_TOP, 0.5));
  assert.equal(scene(T0('out') + 1).lift, CART_LIFT);
});

test('돌을 싣고 나갈 때 돌 윗면(1,060)이 앞 가로대(전후강) 밑면(약 1,152)보다 낮다', () => {
  const topOnCart = CART_TOP + 500;            // 돌 높이 500
  const crossBottom = 1212 - 60;               // 아래 단 전후강 중심 1,212, 단면 120
  assert.ok(topOnCart < crossBottom);
});

test('실린 뒤 돌의 위치는 유형거 위치와 같다', () => {
  for (const t of [T0('out') + 3, T0('nokro') + 5, SCENE_TOTAL]) {
    const s = scene(t);
    assert.deepEqual(s.stoneOff, [s.cartX, s.cartY, CART_LIFT]);
  }
});

test('scene(t)는 끝 시각(SCENE_TOTAL)에서 마지막 위상의 끝 상태다 (처음으로 튀지 않음)', () => {
  const end = scene(SCENE_TOTAL), before = scene(SCENE_TOTAL - 0.01);
  assert.equal(end.phase, 'nokro');
  assert.ok(Math.abs(end.cartX - before.cartX) < 5 && Math.abs(end.cartY - before.cartY) < 5);
});

test('scene(t) 범위 밖은 clamp된다', () => {
  assert.equal(scene(-5).lift, 0);
  assert.deepEqual(scene(SCENE_TOTAL + 100).phase, 'nokro');
});

// ---- 모델 스모크 테스트: npm run build가 만든 src/model.js가 node에서 오류 없이 도는지 ----
test('buildModel()이 11단계·부재 노드와 함께 도는지 (빌드 산물이 있을 때)', async t => {
  let mod;
  try { mod = await import('../src/model.js'); }
  catch { t.skip('src/model.js가 없습니다 — npm run build 후 검사됩니다'); return; }
  const { G, steps } = mod.buildModel();
  assert.equal(steps.length, 11);                       // 11단계 시공 순서
  assert.ok(Object.keys(G).length >= 5);
  for (const s of steps) {
    assert.ok(s.label && s.members.length > 0, `단계 "${s.label}"에 부재가 없습니다`);
    for (const m of s.members) assert.ok(m.node && m.label && m.col, `부재 "${m.label}"가 불완전합니다`);
  }
  const mvIds = steps.flatMap(s => s.members).map(m => m.mv).filter(Boolean);
  assert.ok(mvIds.includes('lower'));                   // 움직이는 부재 mv id
  assert.ok(mvIds.includes('stone'));
  assert.ok(mvIds.filter(id => id.startsWith('rope')).length >= 2);   // 밧줄 2가닥
  assert.ok(steps.flatMap(s => s.members).some(m => m.spin));         // 도는 부재(도르래·얼레축)
});

// ---- F1·F2·F4 모델 검증 ----
test('F1: 도르래는 woodL 재질에 홈(diff)이 있고 등자쇠·축핀 부재가 있다', async t => {
  let mod;
  try { mod = await import('../src/model.js'); }
  catch { t.skip('src/model.js가 없습니다 — npm run build 후 검사됩니다'); return; }
  const { G, steps } = mod.buildModel();
  const labels = steps.flatMap(s => s.members).map(m => m.label);
  assert.ok(labels.filter(l => l.includes('등자쇠')).length >= 8, '등자쇠(위 4 + 아래 4)');
  const up = steps.flatMap(s => s.members).find(m => m.label.includes('중유량 도르래'));
  assert.equal(up.mat, 'woodL');
  assert.equal(up.node.op, 'diff');                     // 둘레 홈 + 바퀴살 구멍
  assert.ok(labels.filter(l => l.includes('도르래틀 띠')).length >= 2);
});

test('F2: "활차 8촌=의궤" 표기가 없고 도르래 개수만 의궤 근거다', async t => {
  let mod;
  try { mod = await import('../src/model.js'); }
  catch { t.skip('src/model.js가 없습니다 — npm run build 후 검사됩니다'); return; }
  const { G } = mod.buildModel();
  const dims = Object.values(G).map(g => g.dim || '').join('\n');
  assert.ok(!dims.includes('8촌=의궤'));
  assert.ok(!dims.includes('활차 8촌'));
  assert.ok(G.upper.dim.includes('개수(위 4)=의궤'));
});

test('F4: 쇠사슬 2가닥(고리)과 철강 2개 부재가 있다', async t => {
  let mod;
  try { mod = await import('../src/model.js'); }
  catch { t.skip('src/model.js가 없습니다 — npm run build 후 검사됩니다'); return; }
  const { steps } = mod.buildModel();
  const labels = steps.flatMap(s => s.members).map(m => m.label);
  assert.ok(labels.filter(l => l.includes('쇠사슬 앞쪽')).length === 1);
  assert.ok(labels.filter(l => l.includes('쇠사슬 뒤쪽')).length === 1);
  assert.ok(labels.some(l => l.includes('철강 2개')));
  const chain = steps.flatMap(s => s.members).find(m => m.label.includes('쇠사슬 앞쪽'));
  // 사슬 고리는 모두 돌(y ±300) 바깥에 있어야 함: 고리 중심 |y| − 고리 반지름 35 > 300
  const ys = chain.node.c.map(r => Math.abs(r.a.M[7]));
  assert.ok(ys.every(y => y - 35 > 300), 'chain links intersect stone');
  assert.equal(chain.node.op, 'uni');                   // 고리(링) 이어 붙이기
});
