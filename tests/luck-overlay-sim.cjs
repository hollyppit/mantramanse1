// 운 겹쳐 보기(luck-overlay.js) 검증:  node tests/luck-overlay-sim.cjs [사주 수=300]
//  · 설명용 불변: 엔진 결과(원국 비중·대운 점수·통합 용신)를 바꾸지 않음, 같은 입력 같은 결과
//  · 셈법: 운 한 기둥 = 2점(천간 1 + 지장간 일수 비율 1), 층 무게만큼 더함, 비율 합 100, 층 없거나 무게 0 이면 원국 그대로
//  · 관계: 오행 관계(같음·생·극) 판정, 운 기둥끼리·원국과의 합충(엔진 relationsAmong) 검출, layersAt 이 대운·세운·월운 순서로 지금 기둥을 찾음
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-overlay.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, O = ctx.MantraLuckOverlay, N = +process.argv[2] || 300;
const near = (a, b, eps = 0.15) => Math.abs(a - b) <= eps;
const sum = a => a.reduce((x, y) => x + y, 0);

// 1) 오행 관계 판정
assert.equal(O.elRel(0, 0), 'same'); assert.equal(O.elRel(0, 1), 'gives'); assert.equal(O.elRel(1, 0), 'gets');
assert.equal(O.elRel(0, 2), 'hits'); assert.equal(O.elRel(2, 0), 'hit');
// 2) 운 한 기둥 = 2점, 지장간 일수 비율(申: 戊7 壬7 庚16 → 금 16/30)
for (let s = 0; s < 10; s++) for (let b = 0; b < 12; b++) assert.ok(near(sum(O.pillarVec(M, s, b)), 2, 1e-9), '기둥 2점');
const v = O.pillarVec(M, 6, 8); assert.ok(near(v[3], 1 + 16 / 30, 1e-9) && near(v[2], 7 / 30, 1e-9) && near(v[4], 7 / 30, 1e-9), '庚申 지장간 비율');

let n = 0, layerCount = 0, relLuck = 0, relNatal = 0; const allTexts = new Set(), tones = {};
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const before = JSON.stringify({ w: ch.weights.pct, d: ch.daeun.list.map(x => x.ev && x.ev.fitScore), u: ch.unified && ch.unified.roles });
  const t = Date.UTC(2026, 10, 18) + i * 86400000 * 37;
  const L = O.layersAt(M, ch, t);
  assert.equal(JSON.stringify(L.map(x => x.level)), JSON.stringify(['daeun', 'seun', 'wolun', 'ilun'].slice(0, L.length)), '층 순서');
  assert.ok(L.length === 4, '지금 시점 대운·세운·월운·일진 넷 다 찾음 ' + JSON.stringify(inp));
  const r = O.compute(M, ch, L), r2 = O.compute(M, ch, L);
  assert.equal(JSON.stringify(r), JSON.stringify(r2), '같은 입력 같은 결과');
  assert.equal(JSON.stringify({ w: ch.weights.pct, d: ch.daeun.list.map(x => x.ev && x.ev.fitScore), u: ch.unified && ch.unified.roles }), before, '엔진 결과 변경');
  assert.ok(near(sum(r.final.pct), 100, 0.3), '비율 합 100');
  r.layers.forEach((l, k) => {
    layerCount++;
    assert.ok(near(sum(l.add), 2 * r.weights[l.level], 0.05), '층 점수 = 2 × 무게');
    assert.ok(near(sum(l.pct), 100, 0.3) && near(sum(l.delta), 0, 0.3), '층마다 비율 합 100·변화 합 0');
    assert.ok(O.REL_K[l.relBelow.stem] && O.REL_K[l.relBelow.branch], '아래층 관계 판정');
    assert.equal(l.relBelow.to, k ? r.layers[k - 1].level : 'natal');
    if (l.withLuck.length) relLuck++; if (l.withNatal.length) relNatal++;
    l.withLuck.concat(l.withNatal).forEach(x => assert.ok(x.members.includes(l.level), '관계에 이 층이 들어감'));
  });
  // 층 없음·무게 0 → 원국 그대로
  const e0 = O.compute(M, ch, []); assert.equal(JSON.stringify(e0.final.pct), JSON.stringify(e0.natal.pct), '층 없음 = 원국');
  const z = O.compute(M, ch, L, { weights: { daeun: 0, seun: 0, wolun: 0, ilun: 0 } }); z.final.pct.forEach((p, e) => assert.ok(near(p, r.natal.pct[e], 0.11), '무게 0'));
  // 4단계 세 줄 풀이: 층마다 한 줄, 빈 줄·금지 표현·막연한 '아래층' 없음, 결이 숫자와 맞음, 용신을 채운다는 말은 용신이 실제로 늘 때만
  const ex = O.explain(r);
  assert.equal(ex.length, r.layers.length, '층마다 한 줄');
  ex.forEach((x, k) => {
    const l = r.layers[k]; allTexts.add(x.text); tones[x.tone] = (tones[x.tone] || 0) + 1;
    assert.ok(x.text.length > 40 && /요.$/.test(x.text), '풀이 문장 ' + x.text);
    assert.ok(!/반드시|무조건|100%|틀림없이|대박|망한다|아래층|undefined|null|NaN/.test(x.text), '금지 표현 ' + x.text);
    const T1 = (l.level === 'ilun' ? 0.3 : 0.8) - 0.051;   // 일진은 무게가 작아 문턱도 낮다(풀이 값은 소수 한 자리 반올림이라 0.05 여유)
    if (x.tone === 'good') assert.ok(x.good > T1 || x.bad < -T1, '좋음 결 근거');
    if (x.tone === 'bad') assert.ok(x.bad > T1 || x.good < -T1, '부담 결 근거');
    if (/필요한 기운인/.test(x.text)) assert.ok(r.yong && l.delta[r.yong.el] > 0.4, '용신이 늘 때만 채워진다고 말함');
    assert.ok(x.text.startsWith(l.levelK + ' ' + l.gz), '간지로 시작');
  });
  // 용신 변화 = 최종 - 원국
  if (r.yong) assert.ok(near(r.yong.delta, r.yong.now - r.yong.natal, 0.11));
}
// 3) 운 기둥끼리 합·충 검출(고정 예): 세운 甲子 + 월운 己午 → 甲己합·子午충
const ch0 = M.compute({ year: 1990, month: 5, day: 15, hour: 12, minute: 0, gender: 'M' });
const rr = O.compute(M, ch0, [{ level: 'seun', s: 0, b: 0 }, { level: 'wolun', s: 5, b: 6 }]);
const names = rr.layers[1].withLuck.map(x => x.type);
assert.ok(names.includes('천간합') && names.includes('충'), '운 기둥끼리 합·충 ' + names.join(','));
console.log(`luck-overlay-sim ok · 사주 ${n}명 · 층 ${layerCount}개 · 풀이 서로 다른 문장 ${allTexts.size} · 결 ${JSON.stringify(tones)} · 운끼리 관계 있는 층 ${relLuck} · 원국과 관계 있는 층 ${relNatal} · 엔진 결과 불변`);
// 2026-11-18 운의 합화: 조건(월령 지원·충 없음 등)이 맞을 때만 옮김, 전체 합 보존, 일간은 옮기지 않음, noHwa 는 예전과 같음
{ const fs2 = require('fs'), vm2 = require('vm'), c2 = { console }; c2.window = c2; vm2.createContext(c2);
  for (const f of ['engine.js', 'luck-overlay.js']) vm2.runInContext(fs2.readFileSync(require('path').join(__dirname, '..', f), 'utf8'), c2);
  const M2 = c2.Manse, O2 = c2.MantraLuckOverlay, A2 = require('assert/strict'); let ok2 = 0, cand2 = 0, n2 = 0;
  for (let i = 0; i < 150; i++) { let ch; try { ch = M2.compute({ year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' }); } catch (e) { continue; } n2++;
    const L = O2.layersAt(M2, ch, Date.UTC(2026, 10, 18, 3)), r = O2.compute(M2, ch, L), r0 = O2.compute(M2, ch, L, { noHwa: true });
    A2.ok(Math.abs(r.final.pct.reduce((a, b) => a + b, 0) - 100) < 0.6, '합화 뒤에도 전체 100%');
    r.layers.forEach((l, k) => { cand2 += l.hwa.length; l.hwa.forEach(h => { A2.ok(h.type !== '반합', '반합은 합화로 치지 않음'); if (h.ok) { ok2++; A2.ok(Math.abs(h.moved.reduce((a, b) => a + b, 0)) < 0.006, '옮긴 양 보존(반올림 오차 안)'); A2.ok(!(h.kind === 'stem' && h.parts.includes('day')), '일간은 옮기지 않음'); } else A2.ok(h.moved.every(x => x === 0), '조건이 안 되면 옮기지 않음'); }); A2.equal(r0.layers[k].hwa.length, 0, 'noHwa'); });
    if (!r.layers.some(l => l.hwa.some(h => h.ok))) A2.equal(JSON.stringify(r.final.pct), JSON.stringify(r0.final.pct), '합화가 없으면 예전과 같은 비율'); }
  A2.ok(ok2 > 0 && ok2 < cand2 * 0.5, '합화는 조건이 맞는 일부만 ' + ok2 + '/' + cand2);
  console.log(`합화 ok · 사주 ${n2}명 · 합 후보 ${cand2} · 합화 성립 ${ok2}`); }
