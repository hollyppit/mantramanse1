// 토정비결 월별 심화 해설(시범 3괘, texts/tojeong-month-deep.js) 검증 + 전후 비교 문서
//   node tests/newyear-month-deep-sim.cjs [--report docs/파일.md]
//  · monthStyle 없으면 지금과 글자까지 같음(운영 경로 보존) · 시범 밖 괘는 monthStyle 을 줘도 같음 · 공개 모드에서 draft 해설 비노출
//  · 시범 괘: 12달 모두 원문 중심 카드, 후킹=원문 주제, 사주 월운은 별도 상자, 모두에게 같은 계절 문장 없음, 다음 달 잇는 줄, 금지 표현 없음
//  · 원문 결과 다음 달 연결 문장이 맞는지(밝음→조심이면 '조심'을 말함), 월 본문 글자 전후 비교
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
require('../report/newyear/node-loader.js');
const C = globalThis.NewyearCompose, Q = require('../report/newyear/quality.js'), DEEP = globalThis.TojeongMonthDeep.DEEP, MOD = globalThis.TojeongModern;
const PILOT = Object.keys(DEEP);
const repIdx = process.argv.indexOf('--report'), REPORT = repIdx > 0 ? process.argv[repIdx + 1] : null;
const BAN = /반드시|무조건|100%|틀림없이|대박|망한다|파산|이혼한다(?!면)|죽는|사망/;

// 시범 괘가 나오는 생일 찾기(2027)
const found = {}, others = [];
for (let i = 0; i < 3000 && (PILOT.some(g => !found[g] || found[g].length < 3) || others.length < 5); i++) {
  const b = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'F' : 'M', calendar: 'solar' };
  let r; try { r = C.compose({ birth: b, targetYear: 2027, mode: 'preview' }); } catch (e) { continue; }
  const g = String(r.tojeong.gua);
  if (PILOT.includes(g)) { (found[g] = found[g] || []).push(b); } else if (others.length < 5) others.push(b);
}
PILOT.forEach(g => assert.ok(found[g] && found[g].length, g + '괘가 나오는 생일을 못 찾음'));

// 1) 기본 경로 보존
for (const b of others) {
  const a = C.compose({ birth: b, targetYear: 2027, mode: 'preview' }), p = C.compose({ birth: b, targetYear: 2027, mode: 'preview', monthStyle: 'premium' });
  assert.equal(JSON.stringify(a), JSON.stringify(p), '시범 밖 괘인데 monthStyle 로 바뀜');
}
const b0 = found[PILOT[0]][0];
assert.equal(JSON.stringify(C.compose({ birth: b0, targetYear: 2027, mode: 'public', monthStyle: 'premium' })), JSON.stringify(C.compose({ birth: b0, targetYear: 2027, mode: 'public' })), '공개 모드에서 draft 해설이 나옴');

// 2) 시범 괘 카드 검사
const md = [], rows = [];
const allSeason = new Map();
for (const g of PILOT) for (const b of found[g]) {
  const before = C.compose({ birth: b, targetYear: 2027, mode: 'preview' }), after = C.compose({ birth: b, targetYear: 2027, mode: 'preview', monthStyle: 'premium' });
  const mb = before.chapters.find(c => c.id === 'months').months, ma = after.chapters.find(c => c.id === 'months').months;
  assert.equal(ma.length, mb.length);
  const chars = ms => Math.round(ms.reduce((s, m) => s + m.paras.reduce((x, p) => x + p.text.length, 0) + (m.hook || '').length, 0) / ms.length);
  const sajuChars = ms => Math.round(ms.reduce((s, m) => s + (m.saju ? m.saju.paras.reduce((x, p) => x + p.text.length, 0) : 0), 0) / ms.length);
  const tojeongShare = ms => { let t = 0, all = 0; ms.forEach(m => m.paras.forEach(p => { all += p.text.length; if (['tojeong', 'symbol', 'life', 'domain', 'do', 'avoid', 'next'].includes(p.role)) t += p.text.length; })); return Math.round(t / all * 100); };
  ma.forEach((m, k) => {
    const dm = DEEP[g].months[m.lunarMonth];
    if (!dm) return;
    assert.equal(m.style, 'premium'); assert.equal(m.hook, dm.theme, '후킹은 원문 주제');
    assert.ok(m.saju && m.saju.paras.length >= 2, '사주 월운 별도 상자');
    assert.ok(!m.paras.some(p => ['basis', 'situation', 'scene'].includes(p.role)), '본문에 사주 블록이 섞임');
    const next = m.paras.find(p => p.role === 'next'); assert.ok(next, '다음 달 잇는 줄');
    const nx = ma[k + 1], t0 = MOD[g].months[m.lunarMonth].tone, t1 = nx ? MOD[g].months[nx.lunarMonth].tone : null;
    if (nx && t0 === 'good' && /caution|burden/.test(t1)) assert.match(next.text, /조심/, `${g} ${m.lunarMonth}월 → 다음 달 조심인데 연결 문장이 안 맞음`);
    if (nx && /caution|burden/.test(t0) && t1 === 'good') assert.match(next.text, /밝아져/, `${g} ${m.lunarMonth}월 → 다음 달 밝음인데 연결 문장이 안 맞음`);
    for (const p of m.paras.concat(m.saju.paras)) { assert.ok(!BAN.test(p.text), `${g} ${m.lunarMonth}월 금지어 ${p.text}`); const q = Q.checkText(p.text, 'situation').filter(x => !/길|존댓말/.test(x)); assert.deepEqual(q, [], `${g} ${m.lunarMonth}월 ${p.role}: ${q.join(',')} — ${p.text}`); }
  });
  const total = after.chapters.find(c => c.id === 'total'), hv = total.sections.find(s => s.id === 'halves');
  assert.ok(hv && hv.timeline.length === 12 && hv.paras.length >= 3, '한 해의 흐름 섹션');
  rows.push({ gua: g, birth: `${b.year}-${b.month}-${b.day} ${b.hour}시 ${b.gender === 'F' ? '여' : '남'}`, monthBefore: chars(mb), monthAfter: chars(ma), sajuBox: sajuChars(ma), tojeongShareBefore: tojeongShare(mb), tojeongShareAfter: tojeongShare(ma) });
  if (b === found[g][0]) {
    const m0 = mb[3], m1 = ma[3];
    md.push(`### ${g}괘 — ${rows[rows.length - 1].birth} · ${m1.label}`, '', '**전(지금 운영)**', '', `- 후킹: ${m0.hook}`, ...m0.paras.map(p => `- (${p.role}) ${p.text}`), '', '**후(시범)**', '', `- 후킹(원문 주제): ${m1.hook}`, ...m1.paras.map(p => `- (${p.role}) ${p.text}`), '', `- **${m1.saju.title}**`, ...m1.saju.paras.map(p => `  - (${p.role}) ${p.text}`), '', '**한 해의 흐름(총운에 새로 붙는 칸)**', '', ...hv.paras.map(p => `- (${p.role}) ${p.text}`), '- 월별 결: ' + hv.timeline.map(t => t.m + '월 ' + ({ good: '밝음', neutral: '보통', caution: '조심', burden: '버팀' }[t.tone] || '-')).join(' · '), '');
  }
}
console.table(rows);
if (REPORT) {
  const head = ['# 토정비결 월별 심화 시범 — 전후 비교 (2026-11-17)', '', '`node tests/newyear-month-deep-sim.cjs --report ' + REPORT + '` 로 다시 만듭니다. 시범 3괘(2027년에 가장 자주 나오는 413·661·561), 해설은 draft(사람 검수 전).', '',
    '| 괘 | 생일 | 월 본문 글자(전→후) | 사주 별도 상자 글자 | 본문 중 토정 몫(전→후) |', '|---|---|---|---|---|', ...rows.map(r => `| ${r.gua} | ${r.birth} | ${r.monthBefore} → ${r.monthAfter} | ${r.sajuBox} | ${r.tojeongShareBefore}% → ${r.tojeongShareAfter}% |`), '',
    '바뀐 점: 월 본문은 원문 구절 → 옛 그림의 뜻 → 생활 장면 → 원문이 말한 분야(돈·일·사람)만 → 해 볼 것·조심할 것 → 다음 달로 잇는 줄. 사주 월운은 아래 별도 상자로 옮기고, 모두에게 같던 계절 달력 문장은 뺐습니다. 두 풀이가 같은 쪽을 가리켜도 "더 잘 맞는다"고 쓰지 않습니다.', '', '## 비교 샘플 (음력 4월)', ''];
  fs.writeFileSync(path.join(__dirname, '..', REPORT), head.concat(md).join('\n'));
  console.log('비교 문서 ' + REPORT);
}
console.log('newyear-month-deep-sim ok: 시범 괘 ' + PILOT.join('·') + ', 생일 ' + rows.length + '명, 기본 경로 보존 ' + others.length + '명');
