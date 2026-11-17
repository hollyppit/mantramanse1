// 토정비결 월별 심화 해설(시범 3괘, texts/tojeong-month-deep.js) 검증 + 전후 비교 문서
//   node tests/newyear-month-deep-sim.cjs [--report docs/파일.md]
//  · monthStyle 없으면 지금과 글자까지 같음(운영 경로 보존) · 시범 밖 괘는 monthStyle 을 줘도 같음 · 공개 모드에서 draft 해설 비노출
//  · 시범 괘: 12달 모두 원문 중심 카드, 후킹=원문 주제, 사주 월운은 별도 상자, 모두에게 같은 계절 문장 없음, 다음 달 잇는 줄, 금지 표현 없음
//  · 원문 결과 다음 달 연결 문장이 맞는지(밝음→조심이면 '조심'을 말함), 월 본문 글자 전후 비교
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
require('../report/newyear/node-loader.js');
const C = globalThis.NewyearCompose, Q = require('../report/newyear/quality.js'), DEEP = globalThis.TojeongMonthDeep.DEEP, MOD = globalThis.TojeongModern;
const repIdx = process.argv.indexOf('--report'), REPORT = repIdx > 0 ? process.argv[repIdx + 1] : null;
const BAN = /반드시|무조건|100%|틀림없이|대박|망한다|파산|이혼한다(?!면)|죽는|사망/;
const E = globalThis.TojeongEngine, HAND = ['413', '661', '561'];   // 손으로 쓴 시범 3괘(나머지는 핵심어 조합 tojeong-month-motif.js)

// 2027년에 나올 수 있는 괘(엔진 표) 가운데 심화 해설이 있는 괘 = 검사 대상, 없는 괘(원문 달 구절 없는 보충본) = 기본 경로 보존 대상
const YT = E.yearTable(2027, globalThis.Manse), ALL27 = new Set();
for (let m = 1; m <= 12; m++) for (const lo of new Set(YT.lower[m])) for (const u of new Set(Object.values(YT.upper))) ALL27.add('' + u + YT.middle[m].value + lo);
const PILOT = [...ALL27].filter(g => DEEP[g]).sort(), NODEEP = [...ALL27].filter(g => !DEEP[g]);
// 괘마다 그 괘가 나오는 음력 생일 하나(가벼운 엔진 계산으로 찾고 compose 는 괘당 한 번만)
const found = {}, others = [];
for (let y = 1935; y <= 2020 && PILOT.concat(NODEEP).some(g => !found[g]); y += 1) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 29; d += 2) {
  const b = { year: y, month: m, day: d, hour: 12, minute: 0, gender: (y + d) % 2 ? 'F' : 'M', calendar: 'lunar' };
  let r; try { r = E.compute({ birth: b, targetYear: 2027 }, globalThis.Manse); } catch (e) { continue; }
  const g = String(r.gua); if (!found[g]) found[g] = [b];
}
NODEEP.forEach(g => { if (found[g]) others.push(found[g][0]); });
PILOT.forEach(g => assert.ok(found[g] && found[g].length, g + '괘가 나오는 생일을 못 찾음'));
console.log('2027 가능 괘 ' + ALL27.size + ' · 심화 해설 ' + PILOT.length + '(손 ' + HAND.filter(g => PILOT.includes(g)).length + ' · 핵심어 조합 ' + PILOT.filter(g => !HAND.includes(g)).length + ') · 해설 없음 ' + NODEEP.length + '(' + NODEEP.join('·') + ')');

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
  const filled = k => ma.filter(m => m.paras.some(x => x.role === k)).length, themes = new Set(ma.map(m => m.hook)).size;
  rows.push({ src: HAND.includes(g) ? '손' : '조합', doN: filled('do'), avoidN: filled('avoid'), domainN: Math.round(ma.reduce((a, m) => a + m.paras.filter(x => x.role === 'domain').length, 0) / ma.length * 10) / 10, themes, gua: g, birth: `${b.year}-${b.month}-${b.day} ${b.hour}시 ${b.gender === 'F' ? '여' : '남'}`, monthBefore: chars(mb), monthAfter: chars(ma), sajuBox: sajuChars(ma), tojeongShareBefore: tojeongShare(mb), tojeongShareAfter: tojeongShare(ma) });
  if (b === found[g][0] && (HAND.includes(g) || PILOT.filter(x => !HAND.includes(x)).slice(0, 4).includes(g))) {
    const m0 = mb[3], m1 = ma[3];
    md.push(`### ${g}괘 — ${rows[rows.length - 1].birth} · ${m1.label}`, '', '**전(지금 운영)**', '', `- 후킹: ${m0.hook}`, ...m0.paras.map(p => `- (${p.role}) ${p.text}`), '', '**후(시범)**', '', `- 후킹(원문 주제): ${m1.hook}`, ...m1.paras.map(p => `- (${p.role}) ${p.text}`), '', `- **${m1.saju.title}**`, ...m1.saju.paras.map(p => `  - (${p.role}) ${p.text}`), '', '**한 해의 흐름(총운에 새로 붙는 칸)**', '', ...hv.paras.map(p => `- (${p.role}) ${p.text}`), '- 월별 결: ' + hv.timeline.map(t => t.m + '월 ' + ({ good: '밝음', neutral: '보통', caution: '조심', burden: '버팀' }[t.tone] || '-')).join(' · '), '');
  }
}
const avgOf = (k, f) => { const a = rows.filter(f); return a.length ? Math.round(a.reduce((x, r) => x + r[k], 0) / a.length * 10) / 10 : 0; };
const SUM = ['손', '조합'].map(src => { const f = r => r.src === src; return { src, n: rows.filter(f).length, before: avgOf('monthBefore', f), after: avgOf('monthAfter', f), share: avgOf('tojeongShareAfter', f), doN: avgOf('doN', f), avoidN: avgOf('avoidN', f), domainN: avgOf('domainN', f), themes: avgOf('themes', f) }; });
console.table(SUM);
rows.forEach(r => { assert.ok(r.doN >= 8 && r.avoidN >= 8, r.gua + ' 해 볼 것·조심할 것이 빈 달이 많음 ' + r.doN + '/' + r.avoidN); assert.ok(r.themes >= 7, r.gua + ' 달 주제가 너무 겹침 ' + r.themes); });
if (REPORT) {
  const head = ['# 토정비결 월별 심화 시범 — 전후 비교 (2026-11-17)', '', '`node tests/newyear-month-deep-sim.cjs --report ' + REPORT + '` 로 다시 만듭니다. 2027년에 나올 수 있는 괘 ' + ALL27.size + '개 중 ' + PILOT.length + '괘(손 해설 3 + 핵심어 조합 ' + (PILOT.length - 3) + '), 해설은 모두 draft(사람 검수 전). 원문에 달 구절이 없는 보충본 ' + NODEEP.length + '괘(' + NODEEP.join('·') + ')는 기존 월 카드 그대로.', '', '| 방식 | 괘 | 월 본문 글자(전→후) | 본문 중 토정 몫(후) | 해 볼 것 있는 달 | 조심할 것 있는 달 | 달마다 분야 칸 | 12달 주제 종류 |', '|---|---|---|---|---|---|---|---|', ...SUM.map(x => '| ' + x.src + ' | ' + x.n + ' | ' + x.before + ' → ' + x.after + ' | ' + x.share + '% | ' + x.doN + ' | ' + x.avoidN + ' | ' + x.domainN + ' | ' + x.themes + ' |'), '', '## 괘별', '',
    '| 괘 | 방식 | 생일 | 월 본문 글자(전→후) | 사주 별도 상자 글자 | 본문 중 토정 몫(전→후) | 주제 종류 |', '|---|---|---|---|---|---|---|', ...rows.map(r => `| ${r.gua} | ${r.src} | ${r.birth} | ${r.monthBefore} → ${r.monthAfter} | ${r.sajuBox} | ${r.tojeongShareBefore}% → ${r.tojeongShareAfter}% | ${r.themes} |`), '',
    '바뀐 점: 월 본문은 원문 구절 → 옛 그림의 뜻 → 생활 장면 → 원문이 말한 분야(돈·일·사람)만 → 해 볼 것·조심할 것 → 다음 달로 잇는 줄. 사주 월운은 아래 별도 상자로 옮기고, 모두에게 같던 계절 달력 문장은 뺐습니다. 두 풀이가 같은 쪽을 가리켜도 "더 잘 맞는다"고 쓰지 않습니다.', '', '## 비교 샘플 (음력 4월, 손 해설 3괘 + 조합 4괘)', ''];
  fs.writeFileSync(path.join(__dirname, '..', REPORT), head.concat(md).join('\n'));
  console.log('비교 문서 ' + REPORT);
}
console.log('newyear-month-deep-sim ok: 심화 괘 ' + PILOT.length + ', 생일 ' + rows.length + '명, 기본 경로 보존 ' + others.length + '명');
