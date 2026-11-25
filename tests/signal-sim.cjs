// 운세 흐름 탭 신호 등급(좋음·무난·조심, 2026-11-20 3단계) 기준 검증 — 공용 기준 luck-grade.js 와 index.html 연결
//   node tests/signal-sim.cjs
// index.html의 기준 코드를 그대로 꺼내 실행해 경계값·사고수 반전·분포 비율·화면 연결을 단언한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

const LG = require(path.join(root, 'luck-grade.js'));
const a = html.indexOf('  const LG = window.MantraLuckGrade;'), b = html.indexOf('function domCol(key, v) { return sigMetric(key, v).c; }', a);
ok(a > 0 && b > a, 'index.html에서 신호 등급 정의를 찾지 못함');
const ctx = { M, Math, JSON, window: { MantraLuckGrade: LG } }; vm.createContext(ctx);
vm.runInContext(html.slice(a, b + 'function domCol(key, v) { return sigMetric(key, v).c; }'.length) + ';this.SIG=SIG;this.SIG_CUTS=SIG_CUTS;this.sigFlow=sigFlow;this.sigMetric=sigMetric;this.domCol=domCol;', ctx);
const { SIG, SIG_CUTS, sigFlow, sigMetric, domCol } = ctx;

// 1. 등급 이름·색: 3단계, 옛 이름(최고·주의·부담)은 남지 않는다
ok(SIG.map(g => g.n).join() === '좋음,무난,조심', '등급 이름이 다름');
ok(SIG.map(g => g.k).join() === 'good,ok,care', '등급 키가 다름');
ok(new Set(SIG.map(g => g.c)).size === 3, '등급 색이 겹침');
ok(SIG.every((g, i) => g.i === i), '등급 번호가 순서와 다름');
ok(LG.GRADES.map(g => g.n).join() === '좋음,무난,조심', '공용 모듈 등급 이름이 다름');

// 2. 전체 흐름: 엔진의 상태 기준 그대로(+18 이상 좋음 · −12 이하 조심)
const C = M.LUCK_CFG.condition;
ok(C.tailwind === 18 && C.caution === -12, '엔진 경계값이 바뀜(+18·−12)');
ok(sigFlow(100).k === 'good' && sigFlow(30).k === 'good', '옛 최고 구간(+30 이상)이 좋음으로 합쳐지지 않음');
ok(sigFlow(C.tailwind).k === 'good' && sigFlow(C.tailwind - 1).k === 'ok', `좋음 경계(+${C.tailwind})가 엔진의 순풍 기준과 다름`);
ok(sigFlow(C.caution + 1).k === 'ok' && sigFlow(C.caution).k === 'care', `조심 경계(${C.caution})가 엔진 기준과 다름`);
ok(sigFlow(C.burden).k === 'care' && sigFlow(-100).k === 'care', '옛 부담 구간이 조심으로 합쳐지지 않음');
for (let v = -100; v < 100; v++) ok(sigFlow(v).i >= sigFlow(v + 1).i, `전체 흐름 등급이 점수에 대해 단조롭지 않음(${v})`);
// 엔진의 상태 이름과 맞는다: 순풍=좋음, 보통=무난, 주의·부담=조심
for (let v = -100; v <= 100; v += 1) { const cond = M.conditionOf(v), g = sigFlow(v); ok((cond === '순풍' && g.k === 'good') || (cond === '보통' && g.k === 'ok') || ((cond === '주의' || cond === '부담') && g.k === 'care'), `엔진 상태 ${cond}와 등급 ${g.n}이 어긋남(${v})`); }
// 분포 끝 표시(굵은 글씨·알림용, 등급 이름 없음): 흐름 +30 이상 top, 부담 기준 이하 bottom
ok(LG.flowExtreme(30, M) === 'top' && LG.flowExtreme(29, M) === null && LG.flowExtreme(C.burden, M) === 'bottom' && LG.flowExtreme(C.burden + 1, M) === null, '흐름 분포 끝 판정이 다름');

// 3. 분야별 지표: 모든 지표에 기준값이 있고, 사고수는 낮을수록 좋은 쪽이다
const KEYS = [...M.DOMAIN_KEYS, ...M.SUB_DOMAIN_KEYS];
for (const k of KEYS) { const c = SIG_CUTS[k]; ok(c && c.length === 4 && c.every((v, i) => i === 0 || v >= c[i - 1]), `${k}: 기준값이 없거나 정렬되지 않음`); }
for (const k of KEYS) { let prev = k === 'accident' ? -1 : 2; for (let v = 0; v <= 100; v++) { const i = sigMetric(k, v).i; if (k === 'accident') { ok(i >= prev || prev === -1, `사고수 단계가 점수가 오를수록 나빠지지 않음(${v})`); prev = i; } else { ok(i <= prev, `${k} 단계가 점수가 오를수록 좋아지지 않음(${v})`); prev = i; } } }
ok(sigMetric('accident', 5).k === 'good' && sigMetric('accident', 90).k === 'care', '사고수 반전이 틀림');
ok(sigMetric('love', 90).k === 'good' && sigMetric('love', 10).k === 'care', '연애운 양 끝 등급이 틀림');
// 2026-11-25: 경계값은 무난(초과·미만) — 경계값과 같으면 무난, 넘어야 좋음·조심. 사고수는 방향 반대
ok(sigMetric('love', SIG_CUTS.love[2]).k === 'ok' && sigMetric('love', SIG_CUTS.love[2] + 1).k === 'good' && sigMetric('love', SIG_CUTS.love[1]).k === 'ok' && sigMetric('love', SIG_CUTS.love[1] - 1).k === 'care', '연애운 경계(상위·하위 30%, 초과·미만)가 다름');
ok(sigMetric('accident', SIG_CUTS.accident[1]).k === 'ok' && sigMetric('accident', SIG_CUTS.accident[1] - 1).k === 'good' && sigMetric('accident', SIG_CUTS.accident[2]).k === 'ok' && sigMetric('accident', SIG_CUTS.accident[2] + 1).k === 'care', '사고수 경계(초과·미만, 반전)가 다름');
ok(LG.extreme('love', 90) === 'top' && LG.extreme('love', 10) === 'bottom' && LG.extreme('love', 55) === null, '지표 분포 끝 판정이 다름');
ok(domCol('job', 90) === SIG[0].c && domCol('job', 10) === SIG[2].c, 'domCol이 등급 색을 돌려주지 않음');

// 4. 분포 비율: 기준값 산출에 쓰지 않은 사주로 재어 보면 좋음·조심은 약 30%, 무난은 약 40%여야 한다
let seed = 2026; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = []; while (charts.length < 70) { try { charts.push(M.compute({ year: 1945 + Math.floor(rnd() * 65), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' })); } catch (e) { } }
const cnt = {}; KEYS.forEach(k => cnt[k] = [0, 0, 0]); const fcnt = [0, 0, 0]; let n = 0;
for (const c of charts) {
  for (const x of M.seunRange(c, 2000, 2030)) { const r = M.evaluateDomainLuck(c, x, 'seun', { ms: x.midMs }); KEYS.forEach(k => cnt[k][sigMetric(k, r[k].score).i]++); fcnt[sigFlow(x.combined).i]++; n++; }
}
const TARGET = [30, 40, 30];
// 점수가 정수이고 지표마다 분포 폭이 좁아(표준편차 7~13) 기준값 근처에 같은 점수가 몰리므로 허용 오차는 ±11%p로 둔다
for (const k of KEYS) { const sh = cnt[k].map(v => 100 * v / n); sh.forEach((p, i) => ok(Math.abs(p - TARGET[i]) <= 11, `${k}: ${SIG[i].n} 비율 ${p.toFixed(0)}% (목표 ${TARGET[i]}% ±11)`)); }
const fsh = fcnt.map(v => 100 * v / n);
ok(fsh[1] >= 45 && fsh[1] <= 80, `전체 흐름의 무난 비율이 이상함(${fsh[1].toFixed(0)}%)`); ok(fsh[0] >= 4 && fsh[2] >= 8, '전체 흐름에 좋은 해·조심할 해가 너무 적음');
console.log('분야별 지표 등급 비율 평균(좋음·무난·조심): ' + TARGET.map((_, i) => (KEYS.reduce((s, k) => s + 100 * cnt[k][i] / n, 0) / KEYS.length).toFixed(0) + '%').join(' · '));
console.log('전체 흐름(세운) 단계 비율: ' + fsh.map(v => v.toFixed(0) + '%').join(' · '));

// 5. 화면 연결
for (const [pat, msg] of [
  [/const sg = sigFlow\(v\), col = it\.el != null \? elFill\(it\.el\) : sg\.c;/, '대운·월운 막대 색이 오행(없으면 등급)이 아님'], [/col = de != null \? elFill\(de\) : sigFlow\(v\)\.c;/, '연도별 막대 색이 오행(없으면 등급)이 아님'],
  [/s \+= flowZones\(y, L, W - R, RG\);/, '전체 흐름 그래프에 배경 띠가 없음'], [/s \+= metricZones\(k, y, L, W - R\);/, '지표 그래프에 배경 띠가 없음'],
  [/sigLegend\('보조 표시 · '/, '전체 흐름 등급 범례가 보조 표시가 아님'], [/<script src="luck-element-theme\.js"><\/script>/, '오행 테마 모듈을 불러오지 않음'], [/\$\{themeBox\(x, kind\)\}/, '상세에 오행 테마 상자가 없음'], [/sigLegend\(elDomOn\(\) \? '보조 표시 · ' \+ metricRule\(S\.metric\)\.replace\('색 = ', ''\) : metricRule\(S\.metric\)\)/, '지표 범례가 보조 표시(오행 모드)·신호등(오행 없을 때)이 아님'], [/fill:\$\{it\.el != null \? elFill\(it\.el\) : domCol\(k, it\.v\)\}/, '지표 막대 색이 오행(없으면 등급)이 아님'],
  [/color-mix\(in srgb, \$\{elFill\(ce\)\} 20%, var\(--surface\)\)` : sgSoft\(sg\)/, '달력 칸 배경이 오행(없으면 등급)이 아님(2026-11-25)'], [/class="sgw"/, '달력 칸에 단계 글자가 없음'], [/class="sgbar"/, '달력에 이달 분포 띠가 없음'],
  [/<span class="k">좋은 날<\/span>/, '좋은 날 목록이 없음'], [/<span class="k">조심할 날<\/span>/, '조심할 날 목록이 없음'],
  [/sgVars\(tileSig\(x\)\)/, '대운·세운·월운 타일에 신호등 띠가 없음']]) ok(pat.test(html), msg);
ok(!/const col = it\.ph \? m6Col\(it\.ph\)/.test(html), '막대 색이 아직 주 흐름 색을 씀');
ok((html.match(/\$\{elLegendBar\(\)\}<div class="chart" data-chart="(daeun|life|wolun)">/g) || []).length === 3, '대운·연도·월운 그래프 위에 오행 범례가 없음(2026-11-25)');
ok(/--sg-good:/.test(html) && /--sg-ok:/.test(html) && /--sg-care:/.test(html), '등급 색 변수가 없음');
ok(!/--sg-(best|warn|bad)\b/.test(html), '옛 5단계 색 변수가 남아 있음');
ok(/<script src="luck-grade\.js(\?v=[^"]*)?"><\/script>/.test(html), 'index.html이 luck-grade.js를 불러오지 않음');
ok(!/최고·좋음·무난·주의·부담/.test(html), '옛 5단계 안내 문구가 남아 있음');
ok(html.includes('${LG.flowRule(M)}') && LG.flowRule(M) === '흐름 점수 +18 이상 좋음 · -12 이하 조심 · 그 사이 무난', '범례 문구가 3단계 기준이 아님');
// 엔진 4단계 상태 글자(순풍·보통·주의·부담)를 등급 대신 띄우던 자리
ok(!/pill\(x\.ev\.condition\)|condTag\(e\.condition\)|condTag\(x\.condition\)/.test(html), '운 타일·상세에 엔진 4단계 상태 글자가 남아 있음');
// 달력 집계·막대는 3단계 SIG를 그대로 돈다
ok(/const counts = SIG\.map/.test(html) && html.includes('${SIG.map((g, i) => `<span>${g.n} <b>${counts[i]}일</b></span>`)'), '달력 집계가 등급 목록을 돌지 않음');

if (fails.length) { console.log('\n실패 ' + fails.length + '건\n - ' + fails.slice(0, 25).join('\n - ')); process.exit(1); }
console.log('\n모두 통과 · 지표 ' + KEYS.length + '개 기준값 · 3단계 등급 · 전체 흐름 경계 · 사고수 반전 · 분포 비율 · 화면 연결');
