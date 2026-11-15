// 신년운세 조합 검증: 장 구성·근거→상황→사례→조언 순서·금지 표현·사주별 차이(겹침률)·공개 모드 검수 게이트.
const assert = require('assert/strict');
require('../report/newyear/node-loader.js');
const C = globalThis.NewyearCompose, Q = require('../report/newyear/quality.js');
const BLOCKS = globalThis.NewyearBlocks, MOD = globalThis.TojeongModern || {};

// 1) 문구 DB 자체 검사: id 유일, 금지 표현 없음, 문장 길이
const ids = new Set();
for (const b of BLOCKS) {
  assert.ok(!ids.has(b.id), '블록 id 중복 ' + b.id); ids.add(b.id);
  for (const v of [b, b.alt].filter(Boolean)) for (const k of ['hook', 'situation', 'scene', 'advice', 'line']) if (v[k]) {
    const p = Q.checkText(v[k], k); assert.deepEqual(p, [], `${b.id}.${k}: ${p.join(',')} — ${v[k]}`);
  }
}
for (const [g, m] of Object.entries(MOD)) {
  assert.ok(['good', 'neutral', 'caution', 'burden'].includes(m.tone), g + ' tone');
  for (const t of [...(m.overview || []), ...(m.good || []), ...(m.caution || [])]) assert.deepEqual(Q.checkText(t, 'situation').filter(x => !/길|존댓말/.test(x)), [], `${g}: ${t}`);
}

// 2) 한 사람 풀이: 장 구성과 순서
const base = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar' };
const r = C.compose({ birth: base, targetYear: 2027, mode: 'preview' });
assert.deepEqual(r.chapters.map(c => c.id), ['open', 'total', 'wealth', 'career', 'love', 'health', 'months', 'peak', 'action']);
const total = r.chapters.find(c => c.id === 'total');
assert.deepEqual(total.sections.map(s => s.id), ['core', 'tojeong', 'compare', 'opportunity', 'change']);
const core = total.sections[0].paras.map(p => p.role);
const order = ['hook', 'basis', 'situation', 'scene', 'advice'].filter(x => core.includes(x));
assert.deepEqual(core.filter(x => order.includes(x)), order, '총운 핵심: 후킹 → 근거 → 상황 → 사례 → 조언 순서');
const months = r.chapters.find(c => c.id === 'months').months;
assert.equal(months.length, 12);
assert.ok(months.every(m => /^음력 \d+월$/.test(m.label) && /\d{4}-\d\d-\d\d ~ \d{4}-\d\d-\d\d/.test(m.solar)), '월마다 음력 이름 + 양력 기간');
assert.ok(r.chapters.find(c => c.id === 'health').note, '건강 장: 진료 우선 안내');

// 3) 금지 표현·반복 없음(50명), 사주별 차이
const people = [];
for (let i = 0; i < 50; i++) {
  const y = 1955 + (i * 7) % 55, m = 1 + (i * 5) % 12, d = 1 + (i * 11) % 28, h = (i * 3) % 24;
  people.push({ year: y, month: m, day: d, hour: h, minute: 0, gender: i % 2 ? 'F' : 'M', calendar: 'solar' });
}
const sets = [], gua = new Set();
let problems = [];
for (const b of people) {
  const x = C.compose({ birth: b, targetYear: 2027, mode: 'preview' });
  gua.add(x.tojeong.gua);
  const s = C.sentences(x);
  problems = problems.concat(Q.checkReading(s).map(p => ({ ...p, who: JSON.stringify(b) })));
  sets.push(new Set(s.filter(q => q.role !== 'note').map(q => q.text)));
}
assert.deepEqual(problems.slice(0, 5), [], `품질 문제 ${problems.length}건`);
let sum = 0, n = 0, max = 0;
for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
  const a = sets[i], b = sets[j]; let inter = 0; for (const t of a) if (b.has(t)) inter++;
  const jac = inter / (a.size + b.size - inter); sum += jac; n++; if (jac > max) max = jac;
}
const avg = sum / n;
assert.ok(gua.size >= 30, '50명 괘 종류 ' + gua.size);
assert.ok(avg < 0.2, `두 사람 풀이 문장 겹침률 평균 ${(avg * 100).toFixed(1)}%`);
assert.ok(max < 0.6, `가장 비슷한 두 사람 겹침률 ${(max * 100).toFixed(1)}%`);

// 4) 공개 모드: 검수 전(draft) 토정 현대어 풀이는 보이지 않고 원문만
const pub = C.compose({ birth: base, targetYear: 2027, mode: 'public' });
assert.equal(pub.tojeong.modernShown, false);
assert.ok(!C.sentences(pub).some(s => s.role === 'tojeong' && /[가-힣]{6,}/.test(s.text.replace(/^토정비결[^:]*:/, '').replace(/괘의 첫 글귀:/, ''))), '공개 모드에 draft 현대어 없음');

// 5) 보충 괘(863 등)도 조합된다
let supp = null;
for (let y = 1940; y < 2015 && !supp; y++) for (const m of [1, 4, 7, 10]) for (const d of [3, 17]) { const x = C.compose({ birth: { year: y, month: m, day: d, calendar: 'solar' }, targetYear: 2027, mode: 'preview' }); if (x.tojeong.source === 'nl-supplement') { supp = x; break; } }
assert.ok(supp, '보충 괘가 나오는 사람 존재'); assert.ok(C.sentences(supp).some(s => /보충본/.test(s.text)));

console.log(`newyear-compose-sim ok: 블록 ${BLOCKS.length}개, 현대어 ${Object.keys(MOD).length}괘, 50명 괘 ${gua.size}종, 겹침률 평균 ${(avg * 100).toFixed(1)}% 최대 ${(max * 100).toFixed(1)}%`);
