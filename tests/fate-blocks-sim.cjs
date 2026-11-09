// 구성 다양화 블록(report/v2/fate-blocks.js) + 운명 기록 카드(deep-life.js dossier_*) 검사.
// 여러 사주에서 빈 값·조사 오류가 없는지, 11개 장 + 2개 장의 화면 블록에 실제로 붙는지 본다.
const vm = require('vm'), fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'report/v2/saju-data.js', 'report/v2/deep.js', 'report/v2/deep-life.js', 'report/v2/deep-love.js', 'report/v2/reading-feature-data-1.js', 'report/v2/reading-feature-data-2.js', 'report/v2/reading-feature.js', 'report/v2/fate-blocks.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, R = ctx.ReportV2, FEAT = R.ReadingFeature; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗', m); } };
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const TARGET = { timeline_wealth_11: 'fx', timeline_career_11: 'fx', timeline_love_12: 'fx', timeline_wealth_13: 'fx', timeline_career_13: 'fx', timeline_love_13: 'fx', timeline_wealth_15: 'fx', timeline_career_15: 'fx', timeline_love_15: 'fx', timeline_self_37: 'fx', timeline_self_22: 'fx', timeline_self_29: 'fd', timeline_self_36: 'fd' };
const births = [[1992, 6, 23, 7, 'M', '백진우'], [1985, 1, 5, 22, 'F', ''], [1970, 9, 27, 10, 'F', '지수'], [2001, 3, 3, null, 'M', ''], [1964, 12, 25, 0, 'F', ''], [1999, 1, 1, null, 'F', '하늘'], [1955, 7, 7, 12, 'M', ''], [2010, 10, 10, 15, 'F', '']];
for (const b of births) {
  const ch = M.compute({ year: b[0], month: b[1], day: b[2], hour: b[3], minute: 0, calendar: 'solar', gender: b[4] }), sd = R.SajuData.build(ch, { now: Date.parse('2026-11-09') });
  const H = { M, ch, sd, now: Date.parse('2026-11-09'), name: b[5], assets: {}, videos: {} }, tag = b.join('-');
  for (const id of Object.keys(TARGET)) {
    const c = { id, editorialContractId: id }; Object.defineProperty(c, 'readingFeature', { value: H, enumerable: false });
    const o = FEAT.build(c), all = o ? (o.lead || '') + (o.rest || '') : '', t = strip(all);
    ok(new RegExp('class="(dp-embed dp )?' + TARGET[id]).test(all) || all.indexOf('class="' + TARGET[id] + '"') >= 0 || all.indexOf(' ' + TARGET[id] + '"') >= 0, tag + ' ' + id + ' 블록이 붙어야 함');
    ok(!/undefined|NaN|null|\(\)/.test(t), tag + ' ' + id + ' 빈 값: ' + (t.match(/.{20}(undefined|NaN|null|\(\)).{10}/) || [''])[0]);
    ok(!/일를 |일가 |을를|를을|입니다\.는|\(火\)이야|\(土\)이야|\(水\)이야|\(木\)야|\(金\)야/.test(t), tag + ' ' + id + ' 조사 오류');
  }
}
console.log(fail ? '실패 ' + fail + '건' : 'PASS fate-blocks-sim: 13개 장 × ' + births.length + '개 사주 · 블록 연결 · 빈 값 없음 · 조사');
process.exitCode = fail ? 1 : 0;
