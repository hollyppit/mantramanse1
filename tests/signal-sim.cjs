// 운세 흐름 탭 "신호등"(최고·좋음·무난·주의·부담) 기준 검증
//   node tests/signal-sim.cjs
// index.html의 기준 코드를 그대로 꺼내 실행해 경계값·사고수 반전·분포 비율·화면 연결을 단언한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

const a = html.indexOf('  const SIG = ['), b = html.indexOf('function domCol(key, v) { return sigMetric(key, v).c; }', a);
ok(a > 0 && b > a, 'index.html에서 신호등 정의를 찾지 못함');
const ctx = { M, Math, JSON }; vm.createContext(ctx);
vm.runInContext(html.slice(a, b + 'function domCol(key, v) { return sigMetric(key, v).c; }'.length) + ';this.SIG=SIG;this.SIG_CUTS=SIG_CUTS;this.sigFlow=sigFlow;this.sigMetric=sigMetric;this.domCol=domCol;', ctx);
const { SIG, SIG_CUTS, sigFlow, sigMetric, domCol } = ctx;

// 1. 단계 이름·색
ok(SIG.map(g => g.n).join() === '최고,좋음,무난,주의,부담', '단계 이름이 다름');
ok(new Set(SIG.map(g => g.c)).size === 5, '단계 색이 겹침');
ok(SIG.every((g, i) => g.i === i), '단계 번호가 순서와 다름');

// 2. 전체 흐름: 엔진의 상태 기준을 그대로 쓰고 +30 이상만 최고
const C = M.LUCK_CFG.condition;
ok(sigFlow(30).k === 'best' && sigFlow(29).k === 'good', '최고 경계(+30)가 다름');
ok(sigFlow(C.tailwind).k === 'good' && sigFlow(C.tailwind - 1).k === 'ok', `좋음 경계(+${C.tailwind})가 엔진의 순풍 기준과 다름`);
ok(sigFlow(C.caution + 1).k === 'ok' && sigFlow(C.caution).k === 'warn', `주의 경계(${C.caution})가 엔진 기준과 다름`);
ok(sigFlow(C.burden + 1).k === 'warn' && sigFlow(C.burden).k === 'bad', `부담 경계(${C.burden})가 엔진 기준과 다름`);
for (let v = -100; v < 100; v++) ok(sigFlow(v).i >= sigFlow(v + 1).i, `전체 흐름 단계가 점수에 대해 단조롭지 않음(${v})`);
// 엔진의 상태 이름과 맞는다: 순풍=좋음 이상, 보통=무난, 주의=주의, 부담=부담
for (let v = -100; v <= 100; v += 1) { const cond = M.conditionOf(v), g = sigFlow(v); ok((cond === '순풍' && g.i <= 1) || (cond === '보통' && g.k === 'ok') || (cond === '주의' && g.k === 'warn') || (cond === '부담' && g.k === 'bad'), `엔진 상태 ${cond}와 신호등 ${g.n}이 어긋남(${v})`); }

// 3. 분야별 지표: 모든 지표에 기준값이 있고, 사고수는 낮을수록 좋은 쪽이다
const KEYS = [...M.DOMAIN_KEYS, ...M.SUB_DOMAIN_KEYS];
for (const k of KEYS) { const c = SIG_CUTS[k]; ok(c && c.length === 4 && c.every((v, i) => i === 0 || v >= c[i - 1]), `${k}: 기준값이 없거나 정렬되지 않음`); }
for (const k of KEYS) { let prev = k === 'accident' ? -1 : 5; for (let v = 0; v <= 100; v++) { const i = sigMetric(k, v).i; if (k === 'accident') { ok(i >= prev || prev === -1, `사고수 단계가 점수가 오를수록 나빠지지 않음(${v})`); prev = i; } else { ok(i <= prev, `${k} 단계가 점수가 오를수록 좋아지지 않음(${v})`); prev = i; } } }
ok(sigMetric('accident', 5).k === 'best' && sigMetric('accident', 90).k === 'bad', '사고수 반전이 틀림');
ok(sigMetric('love', 90).k === 'best' && sigMetric('love', 10).k === 'bad', '연애운 양 끝 단계가 틀림');
ok(domCol('job', 90) === SIG[0].c && domCol('job', 10) === SIG[4].c, 'domCol이 신호등 색을 돌려주지 않음');

// 4. 분포 비율: 기준값 산출에 쓰지 않은 사주로 재어 보면 최고·부담은 약 10%, 좋음·주의는 약 20%, 무난은 약 40%여야 한다
let seed = 2026; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = []; while (charts.length < 70) { try { charts.push(M.compute({ year: 1945 + Math.floor(rnd() * 65), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' })); } catch (e) { } }
const cnt = {}; KEYS.forEach(k => cnt[k] = [0, 0, 0, 0, 0]); const fcnt = [0, 0, 0, 0, 0]; let n = 0;
for (const c of charts) {
  for (const x of M.seunRange(c, 2000, 2030)) { const r = M.evaluateDomainLuck(c, x, 'seun', { ms: x.midMs }); KEYS.forEach(k => cnt[k][sigMetric(k, r[k].score).i]++); fcnt[sigFlow(x.combined).i]++; n++; }
}
const TARGET = [10, 20, 40, 20, 10];
// 점수가 정수이고 지표마다 분포 폭이 좁아(표준편차 7~13) 기준값 근처에 같은 점수가 몰리므로 허용 오차는 ±11%p로 둔다
for (const k of KEYS) { const sh = cnt[k].map(v => 100 * v / n); sh.forEach((p, i) => ok(Math.abs(p - TARGET[i]) <= 11, `${k}: ${SIG[i].n} 비율 ${p.toFixed(0)}% (목표 ${TARGET[i]}% ±11)`)); }
const fsh = fcnt.map(v => 100 * v / n);
ok(fsh[2] >= 45 && fsh[2] <= 80, `전체 흐름의 무난 비율이 이상함(${fsh[2].toFixed(0)}%)`); ok(fsh[0] + fsh[1] >= 4 && fsh[3] + fsh[4] >= 8, '전체 흐름에 좋은 해·조심할 해가 너무 적음');
console.log('분야별 지표 단계 비율 평균(최고·좋음·무난·주의·부담): ' + TARGET.map((_, i) => (KEYS.reduce((s, k) => s + 100 * cnt[k][i] / n, 0) / KEYS.length).toFixed(0) + '%').join(' · '));
console.log('전체 흐름(세운) 단계 비율: ' + fsh.map(v => v.toFixed(0) + '%').join(' · '));

// 5. 화면 연결
for (const [pat, msg] of [
  [/const sg = sigFlow\(v\), col = sg\.c;/, '대운·월운 막대 색이 신호등이 아님'], [/const col = sigFlow\(v\)\.c;/, '연도별 막대 색이 신호등이 아님'],
  [/s \+= flowZones\(y, L, W - R, RG\);/, '전체 흐름 그래프에 배경 띠가 없음'], [/s \+= metricZones\(k, y, L, W - R\);/, '지표 그래프에 배경 띠가 없음'],
  [/\$\{sigLegend\(flowRule\(\)\)\}/, '전체 흐름 범례가 신호등이 아님'], [/\$\{sigLegend\(metricRule\(S\.metric\)\)\}/, '지표 범례가 신호등이 아님'],
  [/style="background:\$\{sgSoft\(sg\)\}"/, '달력 칸 배경이 신호등이 아님'], [/class="sgw"/, '달력 칸에 단계 글자가 없음'], [/class="sgbar"/, '달력에 이달 분포 띠가 없음'],
  [/<span class="k">좋은 날<\/span>/, '좋은 날 목록이 없음'], [/<span class="k">조심할 날<\/span>/, '조심할 날 목록이 없음'],
  [/sgVars\(tileSig\(x\)\)/, '대운·세운·월운 타일에 신호등 띠가 없음']]) ok(pat.test(html), msg);
ok(!/const col = it\.ph \? m6Col\(it\.ph\)/.test(html), '막대 색이 아직 주 흐름 색을 씀');
ok(/--sg-best:/.test(html) && /--sg-bad:/.test(html), '신호등 색 변수가 없음');

if (fails.length) { console.log('\n실패 ' + fails.length + '건\n - ' + fails.slice(0, 25).join('\n - ')); process.exit(1); }
console.log('\n모두 통과 · 지표 ' + KEYS.length + '개 기준값 · 전체 흐름 경계 · 사고수 반전 · 분포 비율 · 화면 연결');
