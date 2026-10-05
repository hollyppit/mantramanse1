// 챕터별 주제 카드(topics.js)·쉬운 용어 풀이(terms.js) 검증:  node tests/topics-sim.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'cinema', 'translator', 'content', 'content-pro', 'content-pro2', 'topics', 'terms', 'verdict', 'remedy', 'media', 'scenes', 'director', 'compose', 'charts', 'pdf'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const lib = R.Compose.library(null), cfg = R.Chapters.forProject(null, 'full'), now = Date.UTC(2026, 9, 5);
const BAN = /(반드시|무조건|확정|100%|틀림없|사망|질병|수익률|임신|이혼한다|파산)/, DANG = /당신|이 사람|주인공/;

console.log('1. 주제 슬롯·모듈');
ok(R.Topics.SLOTS.length >= 38, '슬롯 38개 이상 ' + R.Topics.SLOTS.length);
const topicMods = lib.modules.filter(m => /^t_/.test(m.category));
ok(topicMods.length >= 200, '주제 모듈 200개 이상 ' + topicMods.length);
ok(topicMods.every(m => !BAN.test(m.headline + m.summary) && !DANG.test(m.headline + m.summary) && m.headline && m.summary), '단정·금지 호칭 없음');
ok(R.Topics.SLOTS.every(s => topicMods.some(m => m.category === 't_' + s.id && !Object.keys(m.conditions).length)), '슬롯마다 조건 없는 폴백 있음');

console.log('2. 20명 샘플 × 챕터');
const people = [[1990, 5, 15, 14, 'M'], [1985, 11, 23, 7, 'F'], [2000, 2, 29, 22, 'M'], [1978, 8, 8, 3, 'F'], [1964, 1, 15, 11, 'M'], [1992, 6, 23, 1, 'M'], [1974, 9, 3, 23, 'F'], [2003, 12, 25, 12, 'F']];
let withTopics = 0, termShown = 0;
people.forEach(p => {
  const sd = R.SajuData.build(mk.apply(null, p), { now }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' });
  rep.chapters.forEach(c => {
    const slots = (R.Topics.OF[c.base] || []).length;
    ok((c.topics || []).length === slots, p + ' ' + c.id + ' 주제 카드 ' + (c.topics || []).length + '/' + slots);
    if (c.topics.length) { withTopics++; ok(c.scenes.some(s => s.sceneType === 'topics' && s.cards.length === c.topics.length), c.id + ' topics 장면'); }
    (c.terms || []).forEach(t => { termShown++; ok(t.term && t.plain && (t.here === '' || /^여기서 /.test(t.here)), c.id + ' 용어 문장 형식 ' + t.term); ok(!/\{[^}]*\}/.test(t.here + t.plain), '미치환 자리표시자'); });
    ok(c.topics.every(t => !/\{[^}]*\}/.test(t.headline + t.summary)), c.id + ' 주제 카드 자리표시자 치환');
    if (c.terms.length) ok(c.scenes.some(s => s.sceneType === 'terms'), c.id + ' terms 장면');
  });
  const c06 = rep.chapters.find(c => c.base === 'c06'); ok(c06.topics.length === 3, 'c06 카드 3개');
});
ok(withTopics > 40 && termShown > 40, '카드·용어가 충분히 나옴 ' + withTopics + '/' + termShown);

console.log('3. 용어 풀이 문장(개인화)');
const sd1 = R.SajuData.build(mk(1990, 5, 15, 14, 'M'), { now }), T = R.Terms;
const g = T.explain('관성', sd1); ok(/^여기서 관성은 [나무불흙쇠물]\([木火土金水]\) 기운을 말해요\. 내 사주에는 이 기운이 \d+%로, /.test(g.here), '관성 풀이: ' + g.here);
ok(T.explain('식상', sd1).here.startsWith('여기서 식상은 '), '식상 풀이 조사');
ok(T.explain('용신', sd1).here.includes('기운이에요'), '용신 풀이');
ok(T.explain('대운', sd1).here.includes('대운이에요'), '대운 풀이');
['비겁', '식상', '재성', '관성', '인성'].forEach(k => ok(sd1.groupEl[k] && T.explain(k, sd1).here.includes({ '목': '나무', '화': '불', '토': '흙', '금': '쇠', '수': '물' }[sd1.groupEl[k]]), k + ' 오행 일치'));
console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n') : '\n주제 카드·용어 풀이 검증 모두 통과');
process.exit(fails.length ? 1 : 0);
