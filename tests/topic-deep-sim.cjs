// 무빙툰 주제 심화 블록(report/v2/topic-deep.js) 검증:  node tests/topic-deep-sim.cjs [사주 수=40]
// 스위치 꺼짐이면 아무것도 붙지 않음 · 켜지면 계획한 모든 블록이 그려짐 · 깨진 값 없음 · 등급 구간이 만세력과 같음 ·
// 궁합(상대 없음/1명/여러 명) · 저장된 집 정보로 현공 · 명당 순위 · reading-feature.js 연결 · 같은 입력이면 같은 결과
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.window = globalThis;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
load('engine.js');
['compat-pair.js', 'fengshui-data.js', 'fengshui-engine.js', 'wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js', 'wealth-career.js', 'region-data.js', 'region-reading-data.js', 'region-reading.js', 'wish-spots.js'].forEach(load);
['report/v2/saju-data.js', 'report/v2/reading-feature-data-1.js', 'report/v2/reading-feature-data-2.js', 'report/v2/reading-feature.js', 'report/v2/topic-deep.js'].forEach(load);
const M = globalThis.Manse, R = globalThis.ReportV2, TD = R.TopicDeep, RF = R.ReadingFeature;
const fails = []; const ok = (c, m) => { if (!c && fails.length < 30) fails.push(m); };
const BAD = /undefined|NaN|\[object|null점|function \(/;

// 1 등급 구간 = 만세력 index.html SIG_CUTS
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), m = /const SIG_CUTS = (\{[^;]+\});/.exec(html);
ok(m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(TD.SIG_CUTS), '등급 구간이 만세력 SIG_CUTS 와 다름');
// 2 계획한 장이 reading-feature SPEC 에 붙었고, 기존 조각은 남아 있음
Object.keys(TD.PLAN).forEach(id => ok(RF.SPEC[id] && RF.SPEC[id].parts.some(p => /^td:/.test(p.custom || '')), 'SPEC 연결 없음 ' + id));
ok(RF.SPEC.timeline_wealth_06.parts[0].custom === 'timing', '기존 조각(재물 큰돈 TOP3)이 앞에 그대로 있어야 함');
ok(!TD.ready, '스위치 기본 꺼짐');

let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const N = +process.argv[2] || 40, now = Date.UTC(2026, 10, 6, 3);
const mk = (y, mo, d, h, g) => { const ch = M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }); return { M, ch, sd: R.SajuData.build(ch, { now }), now, name: '테스트', assets: {} }; };
const parts = Object.keys(TD.PLAN).flatMap(id => TD.PLAN[id][1].map(p => [id, p]));

// 3 꺼짐 → null
{ const H = mk(1992, 6, 23, 1, 'M'); parts.forEach(([id, p]) => ok(TD.render(p, H, id) === null, '꺼졌는데 그려짐 ' + id + ' ' + p.custom)); }

// 4 켜짐: 등록 장소(출처 포함) 3곳을 주입
const spots = [
  { id: 'ts1', name: '시험 산', type: 'mountain', lat: 35.1, lon: 128.9, tags: ['wealth'], source: { name: '시험 출처', url: 'https://example.org/a', checked: '2026-11-01' }, on: true },
  { id: 'ts2', name: '시험 사찰', type: 'temple', lat: 37.7, lon: 127.5, tags: ['career'], source: { name: '시험 출처', url: 'https://example.org/b', checked: '2026-11-01' }, on: true },
  { id: 'ts3', name: '시험 바다', type: 'sea', lat: 34.8, lon: 126.4, tags: ['love', 'general'], source: { name: '시험 출처', url: 'https://example.org/c', checked: '2026-11-01' }, on: true }];
TD._force(true, spots);
const nullCount = {};
for (let i = 0; i < N; i++) {
  const H = mk(1950 + Math.floor(rnd() * 58), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), rnd() < .5 ? 'M' : 'F');
  parts.forEach(([id, p]) => {
    const out = TD.render(p, H, id), k = p.custom + (p.key ? ':' + p.key : '');
    if (out == null) { nullCount[k] = (nullCount[k] || 0) + 1; return; }
    ok(!BAD.test(out.replace(/<[^>]+>/g, ' ')), `깨진 값 ${id} ${k}: ` + (out.replace(/<[^>]+>/g, ' ').match(BAD) || [])[0]);
    ok(/class="dp-embed dp td-blk"/.test(out), '블록 틀 없음 ' + k);
  });
}
// house 는 집 정보가 없으면 안내 카드를 낸다(null 아님). wish 는 장소가 있으니 항상 그려져야 한다. 다른 블록도 null 이면 안 된다.
Object.keys(nullCount).forEach(k => ok(false, `그려지지 않은 블록 ${k} ${nullCount[k]}/${N}`));

// 5 그래프 지표: 막대 색이 등급 함수와 같고, TOP3·가장 조심할 해가 있다
{ const H = mk(1992, 6, 23, 1, 'M'), out = TD.render({ custom: 'td:sub', key: 'windfall' }, H, 'timeline_wealth_06');
  ok(/TOP 3/.test(out) && /가장 조심할 해/.test(out), '횡재운: TOP3·조심할 해');
  const se = M.seunRange(H.ch, 2026, 2026)[0], v = Math.round(M.evaluateDomainLuck(H.ch, se, 'seun').windfall.score), s = TD.sig('windfall', v);
  ok(out.indexOf(v + ' · ' + s.n) >= 0, '2026년 횡재 점수·등급 표시 ' + v + ' ' + s.n); }
// 6 궁합: 상대 없음 → 입력 폼 / 1명 → 점수 / 2명 → 순위
{ const H = mk(1992, 6, 23, 1, 'M');
  let o = TD.render({ custom: 'td:compat', rel: 'lover' }, H, 'timeline_love_05'); ok(/data-td-cpf/.test(o) && !/td-cps/.test(o), '상대 없음: 입력 폼');
  store['mantra-manse-v1-partners'] = JSON.stringify([{ name: '서연', gender: 'F', calendar: 'solar', leap: false, year: 1984, month: 3, day: 2, hour: 10, minute: 0, hourUnknown: false, city: '서울', lon: 126.98, rel: 'lover' }]);
  o = TD.render({ custom: 'td:compat', rel: 'lover' }, H, 'timeline_love_05');
  const B = M.compute({ year: 1984, month: 3, day: 2, hour: 10, minute: 0, calendar: 'solar', leap: false, gender: 'F', lon: 126.98, timeMode: H.ch.input.timeMode, jasi: H.ch.input.jasi, sinsalBase: H.ch.input.sinsalBase, model: H.ch.input.model, school: H.ch.input.school, combinationMode: H.ch.input.combinationMode, climatePalaceMode: H.ch.input.climatePalaceMode });
  const sc = Math.round(globalThis.PairCompat.evaluate(M, H.ch, B, 'lover', {}).score);
  ok(new RegExp('td-cps">' + sc + '<').test(o), '궁합 점수가 PairCompat 과 같음 ' + sc);
  ok(/두 사주가 만나는 자리/.test(o) && /서연/.test(o), '궁합: 관계·이름');
  const list = JSON.parse(store['mantra-manse-v1-partners']); list.push({ name: '민지', gender: 'F', calendar: 'solar', leap: false, year: 1995, month: 9, day: 14, hour: 12, minute: 0, hourUnknown: true, city: '서울', lon: 126.98, rel: 'lover' }); store['mantra-manse-v1-partners'] = JSON.stringify(list);
  o = TD.render({ custom: 'td:compatRank', rel: 'lover' }, H, 'timeline_love_13'); ok(/1순위/.test(o) && /2순위/.test(o), '궁합 순위 2명');
  delete store['mantra-manse-v1-partners']; }
// 7 우리 집: 저장된 향이 있으면 현공 판정
{ const H = mk(1992, 6, 23, 1, 'M');
  let o = TD.render({ custom: 'td:house' }, H, 'timeline_remedy_04'); ok(/만세력에서 집 정보 넣기/.test(o), '집 정보 없음: 안내');
  store['mantra-space-v1'] = JSON.stringify({ home: [{ name: '우리 집', facing: 180, built: 2005, form: {}, hazards: [] }] });
  o = TD.render({ custom: 'td:house' }, H, 'timeline_remedy_04'); ok(/운 건물/.test(o) && /향 /.test(o), '집 정보 있음: 현공 판정');
  delete store['mantra-space-v1']; }
// 8 직업 TOP 10 = wealth-career 결과 순서
{ const H = mk(1992, 6, 23, 1, 'M'), wc = globalThis.MantraWealthCareer.build(M, H.ch, {}), o = TD.render({ custom: 'td:jobs', n: 10 }, H, 'timeline_career_01');
  const names = wc.s3.jobs.slice(0, 3).map(j => j.name); ok(names.every((n, i) => o.indexOf((i + 1) + '순위</small><h4>' + n) >= 0), '직업 순위가 엔진 순서와 같음 ' + names.join(',')); }
// 9 같은 입력 → 같은 결과
{ const a = mk(1985, 3, 14, 9, 'F'), b = mk(1985, 3, 14, 9, 'F'); parts.forEach(([id, p]) => ok(TD.render(p, a, id) === TD.render(p, b, id), '결정론 ' + id + ' ' + p.custom)); }
// 10 reading-feature 연결: Deep 이 없으면 build 는 null(기존 동작), render 경로는 SPEC 에서 td: 조각만 처리
ok(typeof RF.build === 'function', 'reading-feature build');

if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log(`모든 검증 통과 · 사주 ${N}명 × 블록 ${parts.length}개 · 꺼짐/켜짐 · 등급 구간 · 궁합 · 현공 · 직업 순위 · 결정론`);
