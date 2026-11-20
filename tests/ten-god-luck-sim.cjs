// 운 시기의 십신 표시(ten-god-luck.js, 2026-11-20) 검증 — node tests/ten-god-luck-sim.cjs [사주 수=60]
//  · 모듈: 십신 10 × 대운·세운·월운 × 4줄 문안이 모두 있고, 금지 표현·6분류 이름이 없다
//  · 엔진 값 그대로: 대운·세운·월운·일진 항목의 표시 십신 = 엔진 stemTG(천간)·branchTG(지지 본기). 점수·길흉은 이 모듈이 건드리지 않는다
//  · 타임라인 항목(report/v2/timeline.js)에 tg 가 붙고, 6분류 판정(six)은 그대로라 흐름 점수·상태도 그대로
//  · 화면 연결: 만세력(index.html)·타임라인·허브 캘린더에 6분류 이름을 그리는 코드가 남지 않는다
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 60, rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'ten-god-luck.js'].concat(['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'luck6', 'timeline'].map(n => 'report/v2/' + n + '.js'))) vm.runInContext(rd(f), ctx, { filename: f });
const M = ctx.Manse, T = ctx.MantraTenGodLuck, R = ctx.ReportV2;
const SIX = /기회기|확장기|수확기|축적기|변동기|방어기/, BAN = /반드시|무조건|100%|틀림없|확정|대박|대흉|망한다|undefined|NaN/;

// 1) 모듈
assert.equal(T.TG.length, 10);
T.TG.forEach(tg => {
  assert.ok(T.MEAN[tg] && T.DAY[tg], '뜻 ' + tg);
  T.LEVELS.forEach(lv => { const c = T.copy(tg, lv); assert.ok(c, tg + lv); T.PARTS.forEach(p => { assert.ok(c[p] && c[p].length >= 8, tg + lv + p); assert.ok(!BAN.test(c[p]) && !SIX.test(c[p]), '문안 ' + tg + lv + p + ': ' + c[p]); }); });
});
assert.equal(T.copy('편재', 'ilun'), null); assert.equal(T.copy('없음', 'seun'), null); assert.equal(T.of({ stemTG: '일간' }), null);
assert.equal(T.groupOf('상관'), '식상'); assert.equal(T.groupOf('정인'), '인성');
{ const hooks = new Set(); T.TG.forEach(tg => T.LEVELS.forEach(lv => hooks.add(T.copy(tg, lv).hook))); assert.equal(hooks.size, 30, '제목 30개 모두 다름'); }

// 2) 엔진 값 그대로
let n = 0, items = 0; const seen = new Set();
for (let i = 0; i < N; i++) {
  const ch = M.compute({ year: 1960 + (i * 7) % 50, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, calendar: 'solar', gender: i % 2 ? 'F' : 'M', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' });
  const d = ch.pillars.day.s, chk = x => { const t = T.of(x); assert.ok(t, 'of'); assert.equal(t.label, M.tenGod(d, x.s)); assert.equal(t.branch, x.branchTG); assert.ok(t.line.includes(t.label)); seen.add(t.label); items++; };
  ch.daeun.list.forEach(chk); M.seunRange(ch, 2026, 2027).forEach(chk); M.wolun(ch, 2026).forEach(chk); M.ilun(ch, 2026, 11).forEach(chk);
  // 타임라인 항목: tg 가 붙고, 옛 6분류 판정·점수는 그대로
  const now = Date.UTC(2026, 10, 20, 3), du = R.Timeline.daeun(M, ch, now).filter(x => !x.pre), ys = R.Timeline.years(M, ch, 2026, now), ms = R.Timeline.months(M, ch, 2026, now);
  du.forEach((it, k) => { const p = ch.daeun.list[it.idx]; assert.equal(it.tg.label, p.stemTG); assert.equal(it.six, R.Luck6.of(p.ev).label); assert.equal(it.scores.fit, Math.round(p.ev.fitScore)); });
  ys.concat(ms).forEach(it => { assert.ok(it.tg && T.TG.includes(it.tg.label), 'tg'); assert.ok(!SIX.test(R.Timeline.evidenceHtml(R.Timeline.evidence(M, ch, it))), '근거에 6분류 없음'); });
  const html = R.Timeline.html({ daeun: R.Timeline.daeun(M, ch, now), years: ys, months: ms, d: du[0].idx, y: 2026, m: ms[0].month }, s => s);
  assert.ok(!SIX.test(html), '타임라인 html 에 6분류 이름 없음'); assert.ok(html.includes(du[0].tg.label));
  n++;
}
assert.equal(seen.size, 10, '십신 10개가 모두 나옴');

// 3) 화면 연결 — 6분류 이름을 그리는 코드가 남지 않는다(주석 제외)
const code = f => rd(f).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const html = rd('index.html');
assert.ok(html.includes('<script src="ten-god-luck.js"></script>'), '만세력 스크립트');
assert.ok(!/flowTxt|m6Tag|MODE6_COL|dmCol\(|M\.flowLabel\(/.test(html), '만세력 6분류 표시 함수 제거');
assert.ok(!/'(기회기|확장기|수확기|축적기|변동기|방어기)'/.test(html), '만세력 용어·키에 6분류 이름 없음');
assert.ok(/const tgTag = x =>/.test(html) && /tg: tgOf\(d\)\.label/.test(html) && /tgCol\(x\)\}">\$\{esc\(tg\.label\)\}/.test(html), '만세력 그래프·타일·달력 십신');
const hub = code('report/hub/hub-timeline.js'), sj = code('report/hub/hub-saju.js'), tg = code('report/hub/timeline-graph.js'), tl = code('report/v2/timeline.js');
assert.ok(!/it\.six|L\.NAMES|L\.MEANING|sixCopy\(it|기회 · 확장|변동 · 방어|방어 신호/.test(hub), '타임라인 6분류 표시 제거');
assert.ok(/MantraTenGodLuck/.test(hub) && /TGM\.copy\(tg\.label, lvl\)/.test(hub), '타임라인 십신 문안');
assert.ok(rd('report/hub/index.html').includes('/ten-god-luck.js'), '허브 스크립트');
assert.ok(!/'기회'|'방어운'|방어 부담도|주 흐름|names\[assess|names\[state\.key/.test(sj) && /fk\(x\)/.test(sj), '허브 캘린더 십신(옛 6분류 이름표 names[key] 사용 없음)');
assert.ok(!/notes: note,\s*\/\//.test(rd('report/hub/free-core.js')), 'free-core 한 줄 중간 주석 없음(뒤 값이 지워짐)');
// 오늘의 운세 문장 조각(free-core DAILY_DEFAULTS): 키가 십신 10개, 옛 6분류 키 없음
{ const fc = { console }; fc.window = fc; vm.createContext(fc); vm.runInContext(rd('report/hub/free-core.js'), fc); const D = fc.FreeCore ? fc.FreeCore.DAILY_DEFAULTS : (Object.values(fc).find(v => v && v.DAILY_DEFAULTS) || {}).DAILY_DEFAULTS;
  assert.ok(D, 'DAILY_DEFAULTS');
  ['head', 'core', 'workMode', 'act', 'close'].forEach(k => { assert.equal(JSON.stringify(Object.keys(D[k]).sort()), JSON.stringify(T.TG.slice().sort()), '오늘 문장 키 ' + k); });
  T.TG.forEach(tg => ['go', 'steady', 'care'].forEach(tn => { assert.ok(D.head[tg][tn].length >= 2 && D.core[tg][tn].length >= 2, tg + tn); [...D.head[tg][tn], ...D.core[tg][tn]].forEach(x => assert.ok(!SIX.test(x) && !BAN.test(x), x)); }));
  assert.ok(/var PH = \['비견'/.test(rd('report/admin/v2-free.js')), '관리자 오늘 문장 편집 키 = 십신'); }
assert.ok(!/flowLabel/.test(tg), '자동차 비유 문장 십신');
assert.ok(!/E\(it\.six|L\(\)\.NAMES|분류는 이렇게/.test(tl), 'report/v2/timeline 6분류 표시 제거');
console.log(`ten-god-luck-sim ok · 사주 ${n}명 · 운 항목 ${items}개 · 십신 ${seen.size}종 · 문안 ${T.TG.length * 3 * 4}줄`);
