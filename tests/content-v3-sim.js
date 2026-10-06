// 해석 모듈 문체 재작성(content-v3) 검증:  node tests/content-v3-sim.js
// 고친 모듈 수 · 조건/id/extra 보존 · 전문용어·단정·공포 문구 없음 · 길이 · 모든 사주에서 20챕터가 정상 조립되는지 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', f + '.js'), 'utf8'), { filename: f + '.js' });
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer'].forEach(load);
const R = globalThis.ReportV2, M = globalThis.Manse, C = R.Content;
// 재작성 전 스냅샷(id → 조건·우선순위·extra·이미지 태그)
const before = {}; C.modules.forEach(m => { before[m.id] = JSON.stringify([m.conditions, m.priority, m.extra, m.imageTags, m.category, m.layer]); });
const beforeText = {}; C.modules.forEach(m => { beforeText[m.id] = m.headline + m.summary + m.detail; });
const total = C.modules.length;
load('content-v3'); load('verdict'); load('remedy'); load('media'); load('scenes'); load('compose');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const BANNED = /(반드시|무조건|확정|100%|틀림없|운명이|우주의|특별한 사람|무한한 가능성|곧 좋은 일|파산|이혼|사망|죽음|질병)/;
const JARGON = /(비겁|식상|재성|관성|인성|편관|정관|편재|정재|식신|상관|편인|정인|신강|신약|용신|통근|십성|(?<![가-힣])일지|(?<![가-힣])월지|건록|원국)/;
const strip = s => String(s || '').replace(/\{[^{}]*\}/g, '');
const changed = C.modules.filter(m => m.v3);
console.log(`전체 ${total}개 중 ${changed.length}개 재작성 (${C.version})`);
ok(C.modules.length === total, '모듈 개수 변화 없음');
ok(changed.length >= 180 && changed.length === C.v3Count, '재작성 수 ' + changed.length);
changed.forEach(m => {
  ok(before[m.id] === JSON.stringify([m.conditions, m.priority, m.extra, m.imageTags, m.category, m.layer]), m.id + ': 조건·우선순위·extra 보존');
  const t = strip(m.headline + ' ' + m.summary + ' ' + m.detail);
  ok(!BANNED.test(t), `${m.id}: 금지 문구 ${BANNED.exec(t) && BANNED.exec(t)[0]}`);
  ok(!JARGON.test(strip(m.headline + ' ' + m.summary)), `${m.id}: 본문 전문용어 ${JARGON.exec(strip(m.headline + ' ' + m.summary)) && JARGON.exec(strip(m.headline + ' ' + m.summary))[0]} → ${m.summary.slice(0, 40)}`);
  ok(m.headline.length >= 6 && m.headline.length <= 46, `${m.id}: 결론 길이 ${m.headline.length}`);
  ok(m.summary.length >= 20 && m.summary.length <= 190, `${m.id}: 현실 길이 ${m.summary.length}`);
  ok(m.detail.length <= 260, `${m.id}: 상세 길이 ${m.detail.length}`);
  ok(!/undefined|NaN|\[object/.test(t), m.id + ': 빈 값');
  ok(beforeText[m.id] !== m.headline + m.summary + m.detail, m.id + ': 바뀌지 않음');
});
// 일주 60 · 월지 120 이 모두 서로 다른 문장인지
const ids = p => changed.filter(m => p.test(m.id));
const iju = ids(/^pro2?_iju_/), mon = ids(/^(pro2_m_|pro_gap_m_)/);
ok(iju.length === 60 && new Set(iju.map(m => m.headline + m.summary)).size === 60, '일주 60개 모두 다른 문장: ' + iju.length);
ok(mon.length === 120 && new Set(mon.map(m => m.headline + m.summary)).size === 120, '월지×일간 120개 모두 다른 문장: ' + mon.length);
// 전 사주 조립: 20챕터가 비지 않고 새 문장이 실제로 쓰인다
const cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; let used = 0, n = 0;
while (n < 60) {
  let ch; try { ch = M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', leap: false, city: '서울' }); } catch (e) { continue; }
  const sd = R.SajuData.build(ch, { now: Date.UTC(2026, 9, 6) }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' }); n++;
  ok(rep.chapters.length === 21, '챕터 수 ' + rep.chapters.length);
  const txt = JSON.stringify(rep.chapters.map(c => [c.lead, c.meaning, c.details])); ok(!/undefined|NaN/.test(txt) && !/\{[a-zA-Z가-힣.]+\}/.test(txt.replace(/\{hero[^}]*\}/g, '')), '치환되지 않은 자리표시자/빈 값');
  rep.chapters.forEach(c => { [(c.lead && c.lead.id), ...(c.details || []).map(d => d.id)].forEach(id => { if (id && byIdV3(id)) used++; }); });
}
function byIdV3(id) { const m = C.modules.find(x => x.id === id); return m && m.v3; }
ok(used > 60 * 8, '새 문장이 실제 리포트에 쓰임: ' + used);
console.log(`60명 × 21챕터 조립 · 새 문장 사용 ${used}회`);
const ex = id => { const m = C.modules.find(x => x.id === id); console.log(`  [${id}]\n   ${m.headline}\n   ${m.summary}\n   ${m.detail}`); };
['pro2_iju_경오', 'pro2_m_을_자', 'career_grp_관성', 'elements_lack_화', 'sewoon_transition', 'marriage_str_신강'].forEach(ex);
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); [...new Set(fails)].slice(0, 30).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
