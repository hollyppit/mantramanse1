// 만세력 월운 그래프의 토정비결 월별 보조지표 검증 — node tests/tojeong-month-overlay-sim.cjs [사주 수=120]
//  · 기존 신년운세 풀이(compose)를 그대로 읽는다: 판정(tone)이 있는 달만 점, 없는 달은 점 없음(새 점수·풀이 만들지 않음)
//  · 음력 달은 양력 날짜 구간 그대로 시간축에 놓는다(절기월과 같은 달로 보지 않음): 점 위치 = 음력 달 가운데 날짜
//  · 겹침 날수·비교(같은 방향·정도 차이·반대·판단 안 함), 잠긴 맛보기·자료 없음 처리
//  · 화면 연결: 월운 막대 점수(luckV = fitScore)·막대 그리기는 그대로, 보조선은 drawDiv 의 overlay 자리에만
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 120;
const G = require(path.join(root, 'report/newyear/node-loader.js'));
const T = require(path.join(root, 'tojeong-month-overlay.js'));
const M = G.Manse, DAY = 86400000;
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 30) console.log('  ✗ ' + m); } };
const deps = { Manse: M, TojeongEngine: G.TojeongEngine, TojeongText: G.TojeongText, TojeongSupplement: G.TojeongSupplement, TojeongModern: G.TojeongModern, NewyearSajuLink: G.NewyearSajuLink, NewyearBlocks: G.NewyearBlocks, NewyearPacks: G.NewyearPacks, TojeongMonthDeep: G.TojeongMonthDeep };
const Y = 2027;
let pts = 0, toned = 0, kinds = {};
console.log('1. 사주 ' + N + '명 · ' + Y + '년');
for (let i = 0; i < N; i++) {
  const birth = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, calendar: 'solar', leap: false, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(birth); } catch (e) { continue; }
  for (const mode of ['preview', 'public']) {
    const rd = G.NewyearCompose.compose({ birth, targetYear: Y, mode }, deps);
    const p = T.parse(rd), src = rd.chapters.filter(c => Array.isArray(c.months))[0].months;
    ok(p.state === 'ok' && p.months.length === 12, '음력 12달 읽기 ' + i);
    p.months.forEach((m, k) => {
      ok(m.tone === (src[k].tojeongTone || null), '판정은 풀이 값 그대로(새로 만들지 않음) ' + i + '/' + k);
      ok(m.end > m.start && Math.round((m.end - m.start) / DAY) >= 29 && Math.round((m.end - m.start) / DAY) <= 30, '음력 달 길이 29~30일 ' + i + '/' + k);
      { const has = (src[k].paras || []).some(q => q.role === 'tojeong' && /^토정비결 \d+월/.test(q.text)); ok(has ? m.original && !/^토정비결/.test(m.original) : m.original === '', '원문 분리(월별 원문이 없는 괘는 비움) ' + i + '/' + k); }
    });
    if (mode === 'public') ok(p.months.every(m => !m.tone), '검수 전(draft) 판정은 공개 모드에서 점 없음 ' + i);
    const wol = M.wolun(ch, Y), next = M.wolun(ch, Y + 1)[0].startMs;
    const pl = T.place(p.months, wol, next);
    pl.forEach(q => { if (!q.inRange) return; pts++; const mid = (q.m.start + q.m.end) / 2, j = Math.floor(q.f), a = wol[j].startMs, b = wol[j + 1] ? wol[j + 1].startMs : next;
      ok(mid >= a && mid < b && Math.abs(q.f - j - (mid - a) / (b - a)) < 1e-9, '점 위치 = 음력 달 가운데 날짜의 시간축 자리 ' + i); });
    // 절기월마다 겹치는 음력 달 — 같은 달로 보지 않고 겹친 날수로
    wol.forEach((w, j) => { const b = wol[j + 1] ? wol[j + 1].startMs : next, ov = T.overlap(p.months, w.startMs, b);
      ok(ov.length >= 1 && ov.length <= 3 && ov.every(o => o.days > 0 && o.days <= 31), '절기월 겹침 ' + i + '/' + j);
      ov.forEach(o => { const gk = ['good', 'ok', 'care'][(i + j) % 3], c = T.compare(o.m.tone, gk); kinds[c.kind] = (kinds[c.kind] || 0) + 1; if (o.m.tone) toned++; ok(o.m.tone ? c.kind !== 'unknown' : c.kind === 'unknown', '비교 규칙 ' + i); }); });
    const svg = T.svg(pl, { L: 34, R: 6, W: 600, step: 46.67, y: v => 30 + (60 - v) / 120 * 174 });
    ok(/^<g class="tj-ov" style="pointer-events:none">/.test(svg) && !/NaN|undefined/.test(svg), '보조선 형식·클릭 통과 ' + i);
    ok((svg.match(/<path /g) || []).length === pl.filter(q => q.inRange && q.m.tone).length, '판정 있는 달만 점 ' + i);
  }
}
console.log('2. 비교 규칙·잠긴 맛보기·자료 없음');
ok(T.compare('good', 'good').kind === 'same' && T.compare('neutral', 'good').kind === 'near' && T.compare('burden', 'good').kind === 'opposite' && T.compare('caution', 'good').kind === 'opposite' && T.compare(null, 'ok').kind === 'unknown', '비교 규칙');
ok(T.parse({ chapters: [{ id: 'm', locked: true, months: [{ lunarMonth: 1, label: '음력 1월', solar: '2027-02-07 ~ 2027-03-07', locked: true }] }] }).state === 'locked', '맛보기 잠김');
ok(T.parse(null).state === 'none' && T.parse({ chapters: [{ id: 'x' }] }).state === 'none', '자료 없음');
console.log('3. 화면 연결');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(html.includes('<script src="tojeong-month-overlay.js"></script>'), '모듈 불러오기');
ok(html.includes("if (opt.overlay) { try { s += opt.overlay({ L, R, W, H, T, B, step, y }); } catch (e) { } }"), 'drawDiv 보조선 자리');
ok(html.includes("{ overlay: tjOverlay(ms) });") && html.includes("const luckV = x => x.ev ? x.ev.fitScore : 0"), '월운 막대 점수(fitScore)는 그대로, 보조선만 덧붙임');
ok(html.includes("api('/api/newyear/months', { method: 'POST', body: JSON.stringify({ birth: tjBirth(), year: Y }) })") && !/x-member-token/.test(html.slice(html.indexOf('function tjEnsure'), html.indexOf('function tjOverlay'))), '토정 월별 전용 API(모든 해 자동) · 회원 열쇠 안 보냄');
ok(html.includes('function drawDomainDiv(el, items, opt = {})') && html.includes('y: p => y(50 + p) }); } catch (e) { } }') && html.split('{ overlay: tjOverlay(ms) });').length === 3, '지표 선택 그래프에도 같은 보조선(0~100 축 가운데 기준)');
ok(html.includes('${chartLegend()}${tjLegend(Y)}') && html.includes("tjCompare(Y, sel.i)"), '범례·고른 달 비교 칸');
console.log('   점 ' + pts + ' · 판정 있는 겹침 ' + toned + ' · 비교 ' + JSON.stringify(kinds));
console.log(fail ? `\n✗ ${fail}/${n} 실패` : `\n✓ 토정비결 월별 보조지표 검증 ${n}항목 통과`);
process.exit(fail ? 1 : 0);
