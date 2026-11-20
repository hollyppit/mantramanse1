// 운 공통 분석 층(luck-env.js) 검증 — node tests/luck-env-sim.cjs [사주 수=300]
//  · 엔진 1(외부 환경): 원국을 받지 않음 · 같은 간지면 누구에게나 같은 결과 · 길흉·용신 표현 없음 · 월령 왕상휴수사 표
//  · 엔진 2 보조(전환·상하위): 같은 운이라도 원국마다 판정이 다름 · 상위·하위 운 방향이 다를 때 구분해 설명
//  · 전환기를 부풀리지 않음(평소 교체가 대부분) · 엔진 점수 불변 · 화면은 스위치 뒤
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'ten-god-roles.js', 'luck-env.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, E = ctx.MantraLuckEnv, N = +process.argv[2] || 300, J = JSON.stringify;
const BAN = /반드시|무조건|100%|틀림없이|망한다|대박|대길|대흉|undefined|NaN|\[object/;
const ROLEW = /용신|희신|기신|구신|한신|신강|신약|좋은 운|나쁜 운|길하|흉하/;
const strs = o => J(o).match(/"[^"]*[가-힣][^"]*"/g) || [];

// 1) 외부 환경: 원국 인자가 없고, 같은 간지면 같은 결과
assert.equal(E.env.length, 3, 'env(M, layers, opt) — 원국을 받지 않음');
const L1 = [{ level: 'daeun', s: 1, b: 11 }, { level: 'seun', s: 2, b: 6 }, { level: 'wolun', s: 5, b: 11 }, { level: 'ilun', s: 2, b: 8 }];
const a1 = E.env(M, L1, { seasonB: 11 }), a2 = E.env(M, JSON.parse(J(L1)), { seasonB: 11 });
assert.equal(J(a1), J(a2));
// 2) 왕상휴수사: 寅월(목) 기준 목 왕 · 화 상(목생화) · 토 사(목극토) · 금 수(금극목) · 수 휴(수생목)
const st = el => E.stateOf(el, 0).name; assert.equal(J([0, 1, 2, 3, 4].map(st)), J(['왕', '상', '사', '수', '휴']), '왕상휴수사 표');
assert.equal(E.stateOf(1, 1).name, '왕'); assert.equal(E.stateOf(2, 1).name, '상'); assert.equal(E.stateOf(4, 1).name, '수'); assert.equal(E.stateOf(4, 2).name, '사');
// 간지 안 관계
assert.equal(E.pillarRel(1, 1).key, 'same'); assert.equal(E.pillarRel(1, 0).key, 'root'); assert.equal(E.pillarRel(0, 3).key, 'jeolgak'); assert.equal(E.pillarRel(3, 0).key, 'gaedu');

// 3) 사람마다
const T = Date.UTC(2026, 10, 18, 3), kinds = ['daeun', 'seun', 'wolun', 'ilun'];
const trLv = { daeun: {}, seun: {}, wolun: {}, ilun: {} }, trYear = {}, hiSide = {}, hiText = new Set(), envSeun = new Set();
let n = 0, differ = 0, sameDir = 0;
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const snap = J({ d: ch.daeun.list.map(x => x.ev.fitScore), u: ch.unified && ch.unified.roles });
  const du = M.daeunAt(ch, T), se = M.seunRange(ch, 2026, 2026)[0], wl = M.wolun(ch, 2026), wo = wl.filter(m => m.startMs <= T).pop(), il = M.ilun(ch, 2026, 11).filter(d => d.date[2] === 18)[0];
  const items = { daeun: du, seun: se, wolun: wo, ilun: il };
  // 월운 전환 분포는 그달 하나(2026-11 = 戌→亥)만 보면 특정 지지의 성격에 끌려가므로 2026년 열두 달 전환 전체로 본다(2026-11-20 亥 지장간 정정 뒤 亥월만 평소 교체 34%)
  for (let m = 1; m < wl.length; m++) { const t = E.transition(M, ch, wl[m - 1], wl[m], 'wolun', {}); if (t) trYear[t.level] = (trYear[t.level] || 0) + 1; }
  const layersOf = k => { const out = []; if (du) out.push({ level: 'daeun', s: du.s, b: du.b }); if (k === 'daeun') return out.slice(0, 1); out.push({ level: 'seun', s: se.s, b: se.b }); if (k === 'seun') return out; out.push({ level: 'wolun', s: wo.s, b: wo.b }); if (k === 'wolun') return out; out.push({ level: 'ilun', s: il.s, b: il.b }); return out; };
  for (const k of kinds) {
    const x = items[k]; if (!x) continue;
    const nb = E.neighbors(M, ch, x, k);
    const ev = E.env(M, layersOf(k), { prev: nb.prev, next: nb.next, seasonB: wo.b });
    // 외부 칸에는 원국 역할·강약·길흉 말이 없다(안내문 제외)
    strs(Object.assign({}, ev, { note: '', noTenGod: '' })).forEach(t => { assert.ok(!ROLEW.test(t), '외부 칸에 개인 판정 말: ' + t); assert.ok(!BAN.test(t), '금지 표현 ' + t); });
    if (k === 'wolun' || k === 'ilun') assert.ok(ev.season && ev.season.b === wo.b, k + ' 계절은 그 달 월지 기준'); else assert.equal(ev.season, null, k + '에는 계절 칸 없음');
    if (k === 'seun') envSeun.add(J(Object.assign({}, ev, { upper: null, prev: null, next: null })));
    if (nb.prev) {
      const t = E.transition(M, ch, nb.prev, x, k, {});
      trLv[k][t.level] = (trLv[k][t.level] || 0) + 1;
      t.signals.forEach(q => assert.ok(!BAN.test(q.text), '전환 금지 표현 ' + q.text));
      assert.ok(t.level !== 'high' || t.signals.some(q => /stemRole|branchRole|natal|tgr/.test(q.key)), '큰 전환은 구조 근거(역할·원국 충합·십성 구조)가 있어야 함');
    }
    if (k !== 'daeun') {
      const h = E.hierarchy(M, ch, layersOf(k));
      hiText.add(h.text); const me = h.rows[h.rows.length - 1]; hiSide[me.side] = (hiSide[me.side] || 0) + 1;
      if (h.differ) { differ++; assert.ok(/배경|중간/.test(h.text), '방향이 다를 때 두 층을 나눠 설명'); } else sameDir++;
      h.rows.forEach(r => assert.equal(r.stemRole, (ch.unified.roles[Math.floor(({ daeun: du, seun: se, wolun: wo, ilun: il })[r.level].s / 2)] || '중립'), '방향은 통합 용신 역할 그대로'));
      assert.ok(!BAN.test(h.text) && !/올해은|이달은은|오늘은은|와\(과\)|이\(가\)/.test(h.text), '조사 ' + h.text);
    }
  }
  assert.equal(J({ d: ch.daeun.list.map(x => x.ev.fitScore), u: ch.unified && ch.unified.roles }), snap, '엔진 결과 불변');
}
assert.equal(envSeun.size, 1, '같은 해 세운의 외부 환경은 모두에게 같음');
assert.ok(Object.keys(hiSide).length >= 4, '같은 시기라도 원국에 따라 방향이 다름 ' + J(hiSide));
assert.ok(differ > n * 0.3 && sameDir > n * 0.3, '상위·하위 방향이 같은 경우와 다른 경우가 모두 나옴');
for (const k of kinds) { const c = k === 'wolun' ? trYear : trLv[k], tot = Object.values(c).reduce((a, b) => a + b, 0) || 1; assert.ok((c.low || 0) / tot >= 0.4, k + ' 평소 교체가 너무 적음(전환기 과장) ' + J(c)); assert.ok((c.high || 0) / tot <= 0.3, k + ' 큰 전환이 너무 많음 ' + J(c)); }

// 4) 화면 연결
const rd = f => fs.readFileSync(path.join(root, f), 'utf8'), html = rd('index.html');
assert.ok(/<script src="luck-env\.js"><\/script>/.test(html), '스크립트');
assert.ok(/const leOn = \(\) => !!\(window\.MANTRA_FLAGS && window\.MANTRA_FLAGS\.luckEnv === true/.test(html), '화면은 스위치 뒤');
assert.ok(/luckEnv: false/.test(rd('feature-flags.js')), '기본 꺼짐');
assert.ok(/'luckEnv'/.test(rd('functions/api/luck-flags.js')) && /'luckEnv'(, '[a-zA-Z]+')*\]\.forEach/.test(html) && /F\.luckEnv/.test(html), '원격 스위치');
assert.ok(/id=\\?"leEV/.test(rd('report/admin/v2-luckenv.js')), '관리자 카드');
assert.ok(!/fitScore\s*=|LUCK_CFG|evaluateLuck\(/.test(rd('luck-env.js').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), '점수를 쓰지 않음(읽기만)');

console.log(`luck-env-sim ok · 사주 ${n}명 · 전환 판정 ${J(trLv)} · 상하위 방향 다름 ${differ} / 같음 ${sameDir} · 지금 운 방향 ${J(hiSide)} · 상하위 문장 ${hiText.size}종 · 외부 환경 공통 · 엔진 불변`);
