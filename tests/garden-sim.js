// 인연의 정원(report/v2/garden.js) 검증:  node tests/garden-sim.js
// 60개 일주·엔진 값 일치 · 유형 필터/정렬 · 직접 입력(음양 불일치 거부) · 10년 애정 지수 · 배우자 자리 · 관계 이야기 · 단정 표현 없음
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'garden']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, G = R.Garden;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const BANNED = /(운명의 상대|반드시|무조건|결혼하게|이혼|헤어지|100%|확실히)/;
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M'], [2001, 8, 30, 12, 'F']].forEach(([y, mo, d, h, g], i) => {
  const ch = mk(y, mo, d, h, g), tag = '#' + (i + 1), sd = R.SajuData.build(ch, { now });
  ['opposite', 'any'].forEach(pt => {
    const m = G.model(M, ch, sd, now, pt), raw = M.compatAttraction(ch, pt);
    ok(m.pairs.length === 60 && new Set(m.pairs.map(p => p.s + ',' + p.b)).size === 60, tag + pt + ' 60개 일주');
    ok(m.pairs.every(p => p.s % 2 === p.b % 2), tag + pt + ' 존재하는 일주만');
    ok(m.pairs.every((p, k) => p.score === raw[k].score && p.type === raw[k].type), tag + pt + ' 엔진 값 일치');
    ok(m.pairs.every(p => p.toThem && p.toMe && p.mutual != null && p.parts.length >= 5), tag + pt + ' 끌림·구성 값');
  });
  const m = G.model(M, ch, sd, now, 'opposite');
  ok(m.love.length === 10 && m.love.every(w => w.score >= 0 && w.score <= 100 && w.parts.length === 3 && Math.abs(w.parts.reduce((s, x) => s + x.w, 0) - 100) <= 1), tag + ' 10년 애정 지수·비중 합');
  ok(m.love.filter(w => w.isNow).length === 1, tag + ' 올해 1개');
  const s0 = M.seunRange(ch, m.love[0].year, m.love[0].year)[0];
  ok(m.love[0].score === Math.round(M.evaluateDomainLuck(ch, s0, 'seun', { ms: s0.midMs }).love.score), tag + ' 애정 지수 엔진 일치');
  ok(m.spouse.group === (g === 'F' ? '관성' : '재성') && m.spouse.branchHan && m.spouse.note, tag + ' 배우자 자리');
  ok(Object.keys(m.stories).join() === 'love,marriage,relation' && Object.values(m.stories).every(s => s.head && s.real.length), tag + ' 관계 이야기 3종');
  // 화면
  const types = [...new Set(m.pairs.map(p => p.type))];
  const l1 = G.html(m, { tab: 'pair', type: types[0], sort: 'mutual', pick: m.pairs[0].i });
  const cnt = (l1.match(/data-gdk=/g) || []).length;
  ok(cnt === Math.min(12, m.pairs.filter(p => p.type === types[0]).length), tag + ' 유형 필터 개수 ' + cnt);
  ok(/조화 구성/.test(l1) && /일주\(일간\+일지\) 두 글자/.test(l1) && /예측·보장하지 않습니다/.test(l1), tag + ' 상세·한계 문구');
  const bad = G.html(m, { tab: 'pair', ps: 0, pb: 1 }), good = G.html(m, { tab: 'pair', ps: 0, pb: 0 });
  ok(/존재하지 않는 일주/.test(bad) && !/상대 일주 가정/.test(bad), tag + ' 음양 불일치 거부');
  ok(/상대 일주 가정 · 甲子/.test(good), tag + ' 직접 입력 상세');
  const lv = G.html(m, { tab: 'love', year: m.love[3].year, topic: 'marriage' });
  ok(/배우자 자리/.test(lv) && /애정 지수/.test(lv) && /결혼/.test(lv), tag + ' 사랑의 흐름 화면');
  [l1, bad, good, lv].forEach((h, k) => { ok(!/undefined|NaN|\[object/.test(h), tag + ' 깨진 값 없음 ' + k); ok(!BANNED.test(h), tag + ' 단정 표현 없음 ' + k); });
});
console.log('인연의 정원 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
