// 특기·적성 장(report/v2/aptitude-chapters.js) 검증:  node tests/aptitude-chapters-sim.cjs [사주 수=300]
//  · 여러 사주에서 장 3개(종합풀이 1·커리어 2)가 빠짐없이 만들어지고, 문단 7칸이 비지 않는지
//  · 만세력 특기·적성 탭(MantraAptitude.build)·직업 적성(careerProfile)과 같은 값을 쓰는지(대표 특기·강점 분야·재충전 활동)
//  · 금지 표현(성공·수입 약속, 재능·실력 단정, 건강)·빈 값·틀린 조사('를를' 등)가 없는지
//  · 20세 미만은 진로·생활 말로 바뀌고 부업·업무 말이 나오지 않는지
//  · add(): 지정한 장 바로 뒤에 들어가고, 두 번 넣어도 중복이 없는지 · 연결 블록은 스위치가 켜졌을 때만
//  · 엔진 결과 불변 · 같은 명식 같은 결과
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 300;
const FILES = ['engine.js', 'gyeok-structure.js', 'wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js', 'wealth-career.js', 'element-strategy.js', 'aptitude-data.js', 'aptitude.js', 'report/v2/aptitude-chapters-data.js', 'report/v2/aptitude-chapters.js'];
const c = { console }; c.window = c; vm.createContext(c); FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f }));
const M = c.Manse, A = c.MantraAptitude, AC = c.ReportV2.AptChapters, D = c.ReportV2.AptChaptersData, J = x => JSON.stringify(x);
const BAN = /반드시|무조건|성공합니다|성공할 거예요|대박|보장|확정|틀림없|천재|재능이 (뛰어|없)|실력이 (뛰어|부족)|돈을 법니다|수익이 납니다|월 \d+만|건강해|부상|진단|undefined|NaN|null|\{a\}|\{b\}|\{work\}|\{apt\}/;
const BAD_JOSA = /를을|을를|은는 |는은 |(산책|식물|정원|관찰|텃밭|수조)를 |(드로잉|브이로그|레슨)를 /;   // 겹친 조사·받침 있는 활동 이름 뒤 '를'
const KEYS = ['title', 'reality', 'strength', 'risk', 'reinforce', 'practice', 'why'];
// 문안 파일 전체 금지 표현
(function scan(o, p) { if (typeof o === 'string') { assert.ok(!/반드시|무조건|성공합니다|대박|보장|천재|진단|부상/.test(o), '문안 금지 표현 ' + p + ': ' + o); return; } if (o && typeof o === 'object') Object.keys(o).forEach(k => scan(o[k], p + '.' + k)); })(D, 'DATA');
assert.equal(Object.keys(D.WORK).sort().join(), 'body,craft,expr,strat,study', '특기 5영역 문안');
Object.keys(D.WORK).forEach(k => { const w = D.WORK[k]; ['use', 'proof', 'kidProof', 'trap', 'grow', 'weapon'].forEach(f => assert.ok(w[f], k + '.' + f)); assert.equal(w.roles.length, 3); assert.equal(w.kidRoles.length, 3); assert.equal(Object.keys(D.COMBO_TAIL[k]).sort().join(), 'make,people,system,think', k + ' 무대 유형 4개'); });

// 재물 블록 문안: 돈 구조 = 부업 세부 분야 12개, 비용 유형 = 세부 분야 36개 전부
assert.equal(Object.keys(D.MONEY).sort().join(), Object.keys(D.SIDE).sort().join(), '돈 구조 12개 = 부업 세부 분야');
Object.keys(D.MONEY).forEach(k => ['model', 'cost', 'repeat', 'eff', 'caution'].forEach(x => assert.ok(D.MONEY[k][x], k + '.' + x)));
assert.equal(D.TYPE_CLAUSE.length, 5); assert.equal(Object.keys(D.TALENT_MONEY).sort().join(), 'body,craft,expr,strat,study');
let n = 0, kids = 0, side = 0, moneyN = 0, spendN = 0; const titles = {}, recharge = {};
const mockRep = () => ({ chapters: ['timeline_self_25', 'timeline_self_26', 'timeline_self_27', 'timeline_career_01', 'timeline_career_02', 'timeline_career_03', 'timeline_career_14', 'timeline_career_15'].map((id, i) => ({ id: 'c' + i, editorialContractId: id, editorialTopicId: /self/.test(id) ? 'self' : 'career', act: 1 })) });
for (let i = 0; i < N; i++) {
  const kid = i % 10 === 0;
  const inp = { year: kid ? 2008 + (i % 10) : 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 17 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), before = J({ w: ch.weights, s: ch.strength, u: ch.unified });
  const all = AC.buildAll(M, ch, i % 3 ? '' : '하늘'), all2 = AC.buildAll(M, ch, i % 3 ? '' : '하늘');
  assert.equal(J(Object.values(all).map(x => x.readingCore)), J(Object.values(all2).map(x => x.readingCore)), '같은 명식 같은 결과');
  assert.equal(J({ w: ch.weights, s: ch.strength, u: ch.unified }), before, '엔진 결과 불변');
  assert.equal(Object.keys(all).sort().join(), Object.values(AC.IDS).sort().join(), '장 3개');
  const r = A.build(M, ch), P = M.careerProfile(ch), age = new Date().getFullYear() - inp.year;
  Object.values(all).forEach(x => {
    assert.equal(x.title, AC.TITLES[x.id]); assert.ok(x.aptChapter && x.readingParagraphs.length >= 6, x.id + ' 문단');
    KEYS.forEach(k => assert.ok(x.readingCore[k] && x.readingCore[k].length > 10, x.id + ' 빈 칸 ' + k));
    KEYS.forEach(k => { const t = x.readingCore[k]; assert.ok(!BAN.test(t), x.id + '.' + k + ' 금지 표현: ' + (t.match(BAN) || [''])[0] + ' — ' + t.slice(0, 80)); assert.ok(!BAD_JOSA.test(t), x.id + '.' + k + ' 조사: ' + (t.match(BAD_JOSA) || [''])[0] + ' — ' + t.slice(Math.max(0, t.search(BAD_JOSA) - 40), t.search(BAD_JOSA) + 40)); });
    titles[x.readingCore.title] = 1;
  });
  // 값 일치: 대표 특기·강점 분야·재충전 활동
  const top = r.talents.filter(t => t.ok).sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : 1))[0];
  assert.ok(all.timeline_self_talent.readingCore.title.includes(top.name), '종합풀이 장 대표 특기 = 탭 대표 특기');
  assert.equal(all.timeline_career_talent.readingVisualData.talents[0], top.id, '커리어 장 대표 특기 = 탭 대표 특기');
  assert.equal(J(all.timeline_career_talent.readingVisualData.cats), J(P.top.slice(0, 3).map(x => x.category)), '강점 분야 = careerProfile.top');
  all.timeline_career_recharge.readingVisualData.recharge.forEach(id => { assert.ok(Object.values(r.details).some(d => d.subs.some(s => s.id === id && s.ok)), '재충전 활동은 실제 세부 분야: ' + id); recharge[id] = (recharge[id] || 0) + 1; });
  // 조합 문장: 같은 꼬리 문장이 두 번 나오지 않음
  const re = all.timeline_career_talent.readingCore.reality.split('\n\n'), tails = re.map(p => p.split('예요. ')[1]).filter(Boolean);
  assert.equal(new Set(tails).size, tails.length, '조합 꼬리 문장 중복');
  // 20세 미만
  const restAll = KEYS.map(k => all.timeline_career_recharge.readingCore[k]).join(' ');
  if (age < 20) { kids++; assert.ok(!/업무|부업|일하는 만큼/.test(restAll), '20세 미만 재충전 장에 어른 말: ' + (restAll.match(/업무|부업|일하는 만큼/) || [''])[0]); assert.ok(/진로/.test(all.timeline_career_talent.readingCore.title + all.timeline_career_talent.readingCore.reality), '20세 미만 진로 안내'); }
  else if (/부업·일로 넓히는 길/.test(restAll)) side++;
  // 재물 블록: 20세 미만은 돈 구조 없음, 활동 비용 유형은 추천 활동 그대로
  AC.on = true;
  const mb = AC.block({ M, ch }, 'money'), sb = AC.block({ M, ch }, 'spend');
  if (age < 20) assert.equal(mb, null, '20세 미만 돈 구조 블록 없음');
  else { assert.ok(mb && /특기가 돈이 되는 구조/.test(mb) && mb.includes(D.MONEY_NOTE), '돈 구조 블록'); const es = c.MantraElementStrategy.natal(M, ch); if (es && es.core) assert.ok(mb.includes(es.core.type), '핵심 수익 유형 = 오행별 실전 전략'); moneyN++; }
  assert.ok(sb && r.final.activities.some(a => sb.includes(a.name)), '취미 지출 블록은 추천 활동으로'); spendN++;
  [mb || '', sb].forEach(t => assert.ok(!BAN.test(t.replace(/<[^>]+>/g, ' ')), '재물 블록 금지 표현: ' + (t.match(BAN) || [''])[0]));
  AC.on = false;
  // add(): 자리·중복
  AC.on = false;
  const rep = AC.add(mockRep(), null, '', M, ch), ids = rep.chapters.map(x => x.editorialContractId), at = (a, b) => ids.indexOf(b) === ids.indexOf(a) + 1;
  assert.ok(at('timeline_self_26', 'timeline_self_talent') && at('timeline_career_02', 'timeline_career_talent') && at('timeline_career_14', 'timeline_career_recharge'), '자리: ' + ids.join(','));
  assert.equal(AC.add(rep, null, '', M, ch).chapters.length, rep.chapters.length, '두 번 넣어도 중복 없음');
  assert.ok(rep.chapters.every((x, k) => x.no === k + 1), '장 번호');
  n++;
}
// 두 사람 활동 궁합(pair·pairHtml): 공통 분야는 둘 다 '드러남' 이상, 함께 할 활동은 실제 세부 분야·혼자 하는 활동 제외, 역할·축은 실제 값
{ let pairs = 0, withActs = 0;
  for (let i = 0; i < 120; i++) {
    const a = M.compute({ year: 1960 + (i * 7) % 45, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: 'F', calendar: 'solar' });
    const b = M.compute({ year: 1958 + (i * 13) % 47, month: 1 + (i * 7) % 12, day: 1 + (i * 3) % 28, hour: i % 9 ? (i * 5) % 24 : null, minute: 0, gender: 'M', calendar: 'solar' });
    const p = AC.pair(M, a, b, '나', i % 2 ? '민준' : '서윤'), ra = A.build(M, a), rb = A.build(M, b);
    assert.ok(p && p.names[0] === '나', '두 사람 결과');
    p.common.forEach(cm => { const x = ra.fields.find(f => f.id === cm.id), y = rb.fields.find(f => f.id === cm.id); assert.ok(x.level !== 'lo' && y.level !== 'lo', '공통 분야는 둘 다 드러남 이상'); });
    assert.ok(p.acts.length <= 3 && p.acts.every(x => !D.PAIR_SKIP.includes(x.id)), '함께 할 활동 3개 이하·혼자 하는 활동 제외');
    p.roles.forEach(r => { const x = ra.talents.find(t => t.id === r.id), y = rb.talents.find(t => t.id === r.id); assert.ok((x.level === 'hi' && y.level === 'lo') || (y.level === 'hi' && x.level === 'lo'), '역할은 한쪽 뚜렷·한쪽 은은'); });
    p.axes.forEach(ax => assert.ok(!/\{|undefined/.test(ax.text), '축 문장 빈칸: ' + ax.text));
    const h = AC.pairHtml(M, a, b, '나', '민준'), t = h.replace(/<[^>]+>/g, ' ');
    assert.ok(/두 사람이 함께 하면 좋은 활동/.test(h) && h.includes(D.PAIR_NOTE), '카드');
    assert.ok(!BAN.test(t) && !/를을|을를|은는 |는은 /.test(t), '카드 금지 표현·조사: ' + ((t.match(BAN) || [''])[0]));
    pairs++; if (p.acts.length) withActs++;
  }
  assert.equal(AC.pair(M, null, null), null, '명식 없으면 null');
  console.log('두 사람 활동 궁합 ' + pairs + '쌍 통과(함께 할 활동 있음 ' + withActs + '쌍)');
}
// 연결 블록: 스위치 꺼짐이면 없음, 켜짐이면 장 제목으로 이어 줌
{ const ch = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', calendar: 'solar' });
  AC.on = false; assert.equal(AC.block({ M, ch }, 'work'), null, '꺼지면 블록 없음');
  AC.on = true; const w = AC.block({ M, ch }, 'work'), s = AC.block({ M, ch }, 'rest');
  assert.ok(w.includes(AC.TITLES.timeline_career_talent) && s.includes(AC.TITLES.timeline_career_recharge), '블록이 새 장으로 이어 줌');
  assert.ok(!/<script|undefined/.test(w + s)); AC.on = false; }
// 화면 연결: viewer·reading-feature·derived-chapters·스위치
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
assert.ok(/R\.AptChapters\.readyWithin\(2500\)\)S\.rep=R\.AptChapters\.add\(/.test(read('report/v2/viewer.js')), 'viewer 연결');
assert.ok(/custom==='apt'/.test(read('report/v2/reading-feature.js')) && /\['timeline_career_01',\{custom:'apt',kind:'work'\}\],\['timeline_wealth_02',\{custom:'apt',kind:'money'\}\],\['timeline_wealth_03',\{custom:'apt',kind:'spend'\}\],\['timeline_self_27',\{custom:'apt',kind:'meet'\}\]/.test(read('report/v2/reading-feature.js')), '연결 블록 자리');
assert.ok(/aptitude-chapters\.js\?v=/.test(read('report/v2/index.html')) && /\/aptitude\.js\?v=/.test(read('report/v2/index.html')), '사용자 화면이 모듈을 불러옴');
assert.ok(/'aptChapters'/.test(read('functions/api/luck-flags.js')) && /aptChapters: false/.test(read('feature-flags.js')) && /id="leAC"/.test(read('report/admin/v2-luckenv.js')), '스위치·관리자');
assert.ok(/aptPairCard\(Rr\) \+ evidence/.test(read('report/v2/love-compat.js')) && /S\.resInp = Object\.assign\(\{\}, i\)/.test(read('report/v2/love-compat.js')), '궁합 장 연결');
console.log('특기·적성 장 통과 — 사주 ' + n + '개(20세 미만 ' + kids + '개), 장 제목 문장 ' + Object.keys(titles).length + '종, 부업 문단 ' + side + '개, 재물 블록 돈 구조 ' + moneyN + '·지출 ' + spendN + '개');
console.log('재충전 활동 분포', Object.entries(recharge).sort((a, b) => b[1] - a[1]).map(x => x[0] + ' ' + x[1]).join(' · '));
