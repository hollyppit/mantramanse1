// 풀이 정합성(월령 vs 일지 상징) 회귀 테스트:  node tests/consistency-sim.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'); globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'));
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'consistency', 'ilju-data', 'char-intro', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'reading-answer', 'deep', 'deep-life', 'deep-time', 'deep-wealth', 'deep-love', 'life-doc', 'full-reading'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const R = ReportV2, M = Manse, now = Date.UTC(2026, 9, 9), C = R.Consistency, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const mk = (y, mo, d, h, g) => { const ch = M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar', gender: g || 'F', city: '서울', school: 'eokbu' }); return { ch, sd: R.SajuData.build(ch, { now }) }; };
const find = (pil, month, years) => { for (const y of years) for (let d = 1; d <= 28; d++) { const x = mk(y, month, d, 12); if (x.sd.dayPillar.ko === pil) return { ...x, y, mo: month, d }; } return null; };
const text = ch => ch.scenes.map(s => s.html || '').join(' ').replace(/<[^>]*>/g, ' ');
const run = (x, label) => {
  const H = { M, ch: x.ch, sd: x.sd, now, name: '테스트', assets: {} };
  const card = R.IntroText.ijuCard(x.sd.dayPillar.ko, '테스트', x.sd.gender), intro = R.CharIntro.chapter(x.sd, '테스트', {}, 1);
  const lib = R.Compose.library(null), cfg = R.Chapters.forProject(null, 'full'), rep = R.Compose.build(x.sd, lib, cfg, { name: H.name }); R.Deep.augment(rep, H);
  const doc = R.LifeDoc.build({ ...H, rep, soc: R.StoryDirector.social(M, x.ch, x.sd, now), plan: (rep.chapters.find(c => c.plan) || {}).plan });
  const all = [intro].concat(doc.chapters), v = C.checkDoc(x.sd, all).concat(C.check(x.sd, card.film));
  ok(v.length === 0, label + ' 위반: ' + JSON.stringify(v.slice(0, 3)));
  return { card, intro, bs: C.birthSeason(x.sd), chapters: all.length };
};
// 1) 7월 출생 신해일주(실제 사례)
const jul = find('신해', 7, [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003]);
ok(jul, '7월 신해일주 사례 날짜를 찾음');
if (jul) {
  const r = run(jul, '7월 신해'); console.log('[7월 신해] ' + jul.y + '-07-' + jul.d + ' 월지=' + r.bs.branch + ' (' + r.bs.name + ')\n  카드: ' + r.card.film);
  ok(r.bs.group === '여름', '7월 출생의 월령은 여름: ' + r.bs.name);
  const t = text(r.intro); ok(/태어난 계절\(월령\)/.test(t) && t.includes(r.bs.name) && /태어난 계절이나 자란 환경을 뜻하지 않습니다/.test(t), '월령 문단이 실제 계절과 일지 상징을 구분');
  ok(!/겨울 문턱의 큰 물 곁에서 자란/.test(t) && !/곁에서 자란/.test(r.card.film), '"곁에서 자란" 출생환경 문형 제거');
  // 변경 전 문장은 결정론 규칙이 잡아내야 한다
  const old = '겨울 문턱의 큰 물 곁에서 자란 신금 같은 기질을 타고난 여자입니다.', vv = C.check(jul.sd, old);
  ok(vv.length >= 1, '옛 문장(7월 출생인데 겨울에서 자란)을 위반으로 검출'); console.log('  옛 문장 검출: ' + JSON.stringify(vv.map(x => x.rule)));
}
// 2) 같은 신해일주, 겨울 출생: 같은 일주라도 월령 문단이 달라진다
const win = find('신해', 12, [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003]);
ok(win, '12월 신해일주 사례'); if (win && jul) { const a = run(win, '12월 신해'); ok(a.bs.group === '겨울' && text(a.intro).includes(a.bs.name) && text(a.intro) !== text(R.CharIntro.chapter(jul.sd, '테스트', {}, 1)), '같은 일주도 출생 계절별로 문단이 다름'); console.log('[12월 신해] 월지=' + a.bs.branch + ' (' + a.bs.name + ')'); }
// 3) 절입 전후(소서): 같은 날 낮 12시 vs 새벽 — 월지는 엔진의 절입 시각 기준
const before = mk(2024, 7, 6, 12), after = mk(2024, 7, 7, 12);
ok(C.monthBranchOf(before.sd) === '오' && C.monthBranchOf(after.sd) === '미', '소서(7/7) 전후 월지가 오→미로 바뀜');
console.log('[절입] 2024-07-06 12시 월지=' + C.monthBranchOf(before.sd) + ' / 2024-07-07 12시 월지=' + C.monthBranchOf(after.sd));
ok(C.birthSeason(before.sd).group === '여름' && C.birthSeason(after.sd).group === '여름', '소서 전후 모두 여름(오월→미월)');
const ib = mk(2024, 2, 3, 12), ia = mk(2024, 2, 5, 12); // 입춘(2/4) 전후: 겨울 → 봄
ok(C.birthSeason(ib.sd).group === '겨울' && C.birthSeason(ia.sd).group === '봄', '입춘 전후 계절이 겨울→봄으로 바뀜: ' + C.monthBranchOf(ib.sd) + '→' + C.monthBranchOf(ia.sd));
// 4) 월주·시주가 다른 같은 일주 + 오행 분포가 다른 사람: 문서 전체 검사 통과
[[1993, 3, 14, 5], [2001, 10, 2, 22], [1985, 12, 30, 3]].forEach(([y, m, d, h]) => { const x = mk(y, m, d, h, 'M'); run(x, y + '-' + m + '-' + d); });
// 5) 일반 문장 오탐 없음
ok(C.check(jul ? jul.sd : mk(1992, 7, 20, 12).sd, '한여름에 태어난 사람은 열기가 강합니다. 겨울 문턱의 큰 물은 일지의 상징입니다.').length === 0, '월령과 맞는 문장·상징 설명은 통과');
console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n정합성 검사 모두 통과'); process.exit(fails.length ? 1 : 0);
