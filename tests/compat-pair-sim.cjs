// 두 사람 궁합(compat-pair.js) 검증:  node tests/compat-pair-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'compat-pair.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const M = ctx.Manse, P = ctx.PairCompat;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const mk = (y, m, d, h, mi, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: mi, calendar: 'solar', leap: false, gender: g, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu', combinationMode: 'auto', climatePalaceMode: 'auto' });
const people = [[1992, 6, 23, 1, 45, 'M'], [1990, 3, 15, 14, 30, 'F'], [1985, 11, 2, null, 0, 'F'], [2001, 1, 31, 23, 59, 'M'], [1975, 8, 8, 8, 8, 'M'], [1999, 12, 25, 12, 0, 'F']].map(p => mk(...p));
let n = 0; const scores = [];
for (const rel of Object.keys(P.REL_TYPES)) for (const A of people) for (const B of people) {
  const r = P.evaluate(M, A, B, rel); n++;
  ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, `점수 범위 ${r.score}`);
  ok(r.parts.reduce((s, p) => s + p.weight, 0) === 100, '가중치 합 100');
  ok(r.parts.every(p => p.score >= 0 && p.score <= 100), '항목 점수 범위');
  ok(r.grade && r.grade.name, '등급');
  ok(r.relations.every(x => P.REL_TXT[x.type]), '관계 문구');
  scores.push(r.score);
}
// 같은 입력은 같은 결과
const x1 = P.evaluate(M, people[0], people[1], 'lover'), x2 = P.evaluate(M, people[0], people[1], 'lover');
ok(JSON.stringify(x1) === JSON.stringify(x2), '결정적');
// 시간 모름(시주 없음)도 계산된다
ok(P.evaluate(M, people[0], people[2], 'work').relations.every(x => x.bPos !== 'hour'), '시주 없는 상대');
// 점수가 한쪽으로 쏠리지 않는다(변별력)
const mn = Math.min(...scores), mx = Math.max(...scores);
ok(mx - mn >= 25, `점수 분포가 너무 좁음 ${mn}~${mx}`);
const grades = new Set(scores.map(s => P.gradeOf(s).name));
ok(grades.size >= 4, `등급이 ${grades.size}종류뿐`);
console.log(`쌍 ${n}개 · 점수 ${mn}~${mx} · 등급 ${[...grades].join('/')}`);
console.log('예시 1992남×1990여 연인:', x1.score, x1.grade.name, x1.parts.map(p => p.label + p.score).join(' '));
if (fails.length) { console.log('FAIL', [...new Set(fails)].slice(0, 10)); process.exit(1); } else console.log('OK');
