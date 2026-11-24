// 상세풀이 패널 그림이 한 리포트 안에서 반복되지 않는지 검사(2026-11-24)
// 운영과 같은 모양의 가상 패널 목록(주제·오행·성별마다 일상·갈등·실천 장면 한 벌 + 주제 그림 + 장 전용 그림)으로 64장 리포트를 배정한다.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
global.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js', 'report/v2/reading-catalog.js', 'report/v2/reading-media.js', 'report/v2/seal-reader.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const R = globalThis.ReportV2, M = globalThis.Manse, RM = R.ReadingMedia;
assert.equal(typeof RM.planReport, 'function', 'planReport 있음');
const EL = ['wood', 'fire', 'earth', 'metal', 'water'], TOPICS = ['self', 'wealth', 'career', 'love'], PH = ['daily', 'conflict', 'practice'];
const pool = [];
for (const el of EL) for (const g of ['M', 'F']) for (const t of TOPICS) for (const ph of PH) pool.push({ id: `panel-${el}-${t}_${ph}-${g}`, type: 'image', url: `/clip/${el}-${t}-${ph}-${g}.webp`, posterUrl: `/clip/${el}-${t}-${ph}-${g}.webp`, enabled: true, tagsApproved: true, gender: g, elementTags: [el] });
['identity', 'talent', 'shadow', 'wealth', 'money', 'career', 'love', 'relationship', 'marriage', 'family', 'daewoon', 'sewoon', 'recovery'].forEach((tag, i) => pool.push({ id: 'theme-' + tag, type: 'image', url: '/clip/theme-' + tag + '.webp', posterUrl: '/clip/theme-' + tag + '.webp', enabled: true, tagsApproved: true, themeTags: [tag] }));
const chapters = globalThis.MantraEditorial.defaults().chapters.filter(c => c.state !== 'archived').sort((a, b) => (a.order || 0) - (b.order || 0)).map(c => ({ id: c.id, editorialContractId: c.id, editorialTopicId: c.topicId }));
assert.ok(chapters.length >= 60, '보이는 장 ' + chapters.length);
let charts = 0, panels = 0, before = 0;
for (const [y, mo, d, h, g] of [[1992, 6, 23, 7, 'M'], [1985, 11, 2, 14, 'F'], [1970, 3, 9, 7, 'M'], [2001, 8, 30, 22, 'F'], [1960, 1, 15, 3, 'F'], [1988, 7, 7, 11, 'M']]) {
  const sd = R.SajuData.build(M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), { now: Date.UTC(2026, 10, 24) });
  const full = pool.concat([{ id: 'reviewed-slot:car', type: 'image', url: '/clip/car.webp', posterUrl: '/clip/car.webp', chapters: ['timeline_self_02'], enabled: true, tagsApproved: true }]);
  // 예전 방식(장마다 따로)은 반복이 있었다 — 검사가 의미 있으려면 이 표본에서 반복이 나와야 한다
  const seenB = new Set(); chapters.forEach(c => RM.pick(full, c, sd, 3).forEach(m => { const k = RM.identity(m); if (seenB.has(k)) before++; seenB.add(k); }));
  const plan = RM.planReport(full, chapters, sd, 3, (c, used) => R.SealReader.media(full, c, sd, used));
  const seen = new Map();
  for (const c of chapters) for (const m of plan[c.id] || []) { const k = RM.identity(m); assert.ok(k, '그림 주소'); assert.ok(!seen.has(k), `같은 그림 반복: ${k} (${seen.get(k)} · ${c.id})`); seen.set(k, c.id); panels++; const phases = plan[c.id].map(x => x.phase); assert.equal(new Set(phases).size, phases.length, c.id + ' 한 장 안 같은 장면 칸 두 번'); }
  assert.ok((plan.timeline_self_02 || []).some(m => m.id === 'reviewed-slot:car'), '장 전용 그림(자동차)은 그 장에 남는다');
  // 주제마다 그림이 앞쪽 장에만 몰리지 않는다: 그림 있는 장이 주제 뒤쪽 절반에도 있다
  for (const t of TOPICS) { const list = chapters.filter(c => c.editorialTopicId === t), withPic = list.map((c, i) => (plan[c.id] || []).length ? i : -1).filter(i => i >= 0); if (withPic.length >= 2) assert.ok(withPic.some(i => i >= list.length / 2), t + ' 뒤쪽 장에도 그림'); }
  // 같은 입력이면 같은 배정
  assert.deepEqual(JSON.stringify(RM.planReport(full, chapters, sd, 3)), JSON.stringify(RM.planReport(full, chapters, sd, 3)), '결정성');
  charts++;
}
assert.ok(before > 0, '예전 방식 반복이 표본에 있어야 함');
console.log('PASS panel-repeat-sim: 사주 ' + charts + '명 × ' + chapters.length + '장 · 패널 ' + panels + '개 반복 0 (예전 방식 반복 ' + before + '개) · 장 전용 그림 유지 · 주제 안 고르게 · 결정성');
