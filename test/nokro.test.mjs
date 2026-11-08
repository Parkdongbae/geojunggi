import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../src/nokro/nk_sim.js';
const close = (a, b, t = 1e-6) => Math.abs(a - b) <= t * Math.max(1, Math.abs(b));

test('의궤 치수: 틀 세로 15척·높이 10척, 간목 35척', () => {
  assert.equal(N.FRAME_L, 4545); assert.equal(N.FRAME_H, 3030); assert.equal(N.POLE_L, 10605);
  const d = Math.hypot(N.POLE_TOP.x - N.POLE_BASE.x, N.POLE_TOP.y - N.POLE_BASE.y, N.POLE_TOP.z - N.POLE_BASE.z);
  assert.ok(close(d, N.POLE_L)); assert.ok(N.POLE_TOP.z > 10000 && N.POLE_TOP.z < 11500);   // 높이 약 10~11m
});

test('고정 도르래 1개: 줄 힘 = 짐 무게, 감은 만큼 오름', () => {
  const s = N.nokro({ th: 20, massKg: 300 });
  assert.ok(close(s.ropeTension, 300 * N.G)); assert.ok(close(s.lift, 20 * N.R_AXLE));
});

test('축바퀴 10:1 — 손바퀴 힘은 줄 힘의 1/10, 손바퀴 거리는 10배', () => {
  const s = N.nokro({ th: 10, massKg: 400 });
  assert.equal(N.R_WHEEL / N.R_AXLE, 10);
  assert.ok(close(s.wheelForce * 10, s.ropeTension)); assert.ok(close(s.wheelTravel, 10 * s.wound));
  assert.ok(close(s.perWorker * 8, s.wheelForce));
});

test('무게중심: 짐이 무겁거나 앞으로 끌수록 넘어짐에 가까워진다', () => {
  assert.ok(N.MAX_SAFE_KG > 300 && N.MAX_SAFE_KG < 2000);
  assert.equal(N.nokro({ massKg: 300 }).tipping, false);
  assert.equal(N.nokro({ massKg: Math.ceil(N.MAX_SAFE_KG) + 1 }).tipping, true);
  assert.ok(N.nokro({ massKg: 500, pull: 1500 }).tipRatio > N.nokro({ massKg: 500 }).tipRatio);
});

test('줄은 활차 둘레를 지나 갈고리로 내려온다 (활차 면을 가로지르지 않음)', () => {
  const P = N.nokro({ th: 30 }).ropePath, C = N.PULLEY, R = N.R_PULLEY;
  for (let i = 1; i < P.length; i++) for (let f = 0; f <= 1; f += .1) {
    const x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, z = P[i - 1][2] + (P[i][2] - P[i - 1][2]) * f;
    assert.ok(Math.hypot(x - C.x, z - C.z) > R * Math.cos(Math.PI / 24) - 1);
  }
  const last = P[P.length - 1]; assert.ok(close(last[0], N.DROP_X) && close(last[2], N.nokro({ th: 30 }).hook));
});

test('화성 현장: 돌이 공심돈보다 높이 오른 뒤 끌려가 공심돈 위에 놓인다', () => {
  const T0 = name => N.PHASES.slice(0, N.PHASES.findIndex(p => p.name === name)).reduce((a, p) => a + p.dur, 0);
  assert.equal(N.scene(1).stoneOn, 'ground');
  const p = N.scene(T0('pull') + 3); assert.ok(p.stone[1] > N.TOWER.top + 400);       // 끄는 동안 공심돈 윗면보다 높음
  const end = N.scene(N.SCENE_TOTAL); assert.equal(end.stoneOn, 'tower'); assert.equal(end.stone[1], N.TOWER.top);
  assert.ok(end.stone[0] - 400 < N.TOWER.x0 && end.stone[0] + 400 > N.TOWER.x1 && end.stone[0] + 400 < N.TOWER.x0);   // 돌 전체가 공심돈 위
  for (let t = 0; t < N.SCENE_TOTAL; t += .2) { const a = N.scene(t), b = N.scene(t + .2); assert.ok(Math.abs(a.hook - b.hook) < 400 && Math.abs(a.stone[0] - b.stone[0]) < 400) }
});
