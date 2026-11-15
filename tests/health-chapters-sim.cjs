// 챕터 고도화 4묶음 검증: 건강·사고수 상세 장 6개(report/v2/health-chapters.js)
//   node tests/health-chapters-sim.cjs
// 1) 여러 사주에서 장 6개×7칸이 비지 않음 2) 의학 진단·사고 예측·단정 표현 없음, 장마다 안내 문장 3) 엔진 값(지수·삼재·장면)과 일치
// 4) 끼워 넣는 자리 5) 점수 불변 6) 화면·스위치·관리자 연결. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
require(path.join(root, 'health-body.js')); require(path.join(root, 'accident-hint.js'));
const H = require(path.join(root, 'report/v2/health-chapters.js'));
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const ROLES = ['title', 'reality', 'risk', 'reinforce', 'practice', 'why'];
const NOW = Date.UTC(2026, 10, 15, 3), Y = M.yearPillarAt(NOW).sajuYear;

let seed = 3511; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let n = 0; const titles = {}; H.IDS.forEach(id => { titles[id] = new Set(); });
for (let i = 0; i < 200; i++) {
  let ch; try { ch = M.compute({ year: 1945 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 10 ? Math.floor(rnd() * 24) : '', minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  n++; const snap = JSON.stringify(ch.daeun.list.map(x => [x.ev.fitScore, x.score.total]));
  const all = H.buildAll(M, ch, i % 3 ? '테스트' : '', NOW);
  ok(JSON.stringify(ch.daeun.list.map(x => [x.ev.fitScore, x.score.total])) === snap, '장을 만든 뒤 점수가 바뀜');
  H.IDS.forEach(id => {
    const c = all[id]; ok(c, `${id} 장이 만들어지지 않음(사주 ${i})`); if (!c) return;
    titles[id].add(c.readingCore.title);
    ok(c.id === id && c.editorialTopicId === 'self' && c.readingDeferred === false && c.healthChapter === true && c.title === H.TITLES[id], `${id} 장 속성 오류`);
    ROLES.forEach(r => ok(String(c.readingCore[r] || '').trim().length >= 12, `${id} ${r} 칸이 비었음(사주 ${i})`));
    const text = Object.values(c.readingCore).join('\n'), body = Object.keys(c.readingCore).filter(k => k !== 'why').map(k => c.readingCore[k]).join('\n');
    ok(!/NaN|undefined|null|\[object/.test(text), `${id} 빈 값(사주 ${i})`);
    ok(!H.BANNED.test(body), `${id} 금지 표현: ${(body.match(H.BANNED) || [])[0]}`);
    ok(c.readingCore.risk.includes(id === 'timeline_self_h1' ? H.MED : id === 'timeline_self_h5' ? H.SAFE : H.NOTE[id]), `${id} 진단·예측이 아니라는 안내가 없음`);
    ok(!/(토|목|금|수|화)\([^)]*\)가라|로로|으로로|이에요이에요|'(이에요|예요)'|[의아해기]'이에요/.test(text), `${id} 조사 오류`);
  });
  // 엔진 값 일치: 올해 건강 지수·10년 사고 주의 지수 1위·삼재
  const x = M.seunRange(ch, Y, Y)[0], dh = M.evaluateDomainLuck(ch, x, 'seun', {});
  ok(all.timeline_self_h4.readingCore.why.includes(Y + '년 건강 균형 지수 ' + Math.round(dh.health.score)), '올해 건강 지수가 엔진과 다름');
  const xs = M.seunRange(ch, Y, Y + 9), sc = xs.map(s => ({ y: s.year, v: M.evaluateDomainLuck(ch, s, 'seun', {}).accident.score })), top = sc.slice().sort((a, b) => b.v - a.v || a.y - b.y)[0];
  ok(all.timeline_self_h6.readingCore.title.includes(top.y + '년'), '10년 사고 주의 1위 해가 제목에 없음');
  const sj = xs.filter(s => M.getSamjae(ch.pillars.year.b, s.year).active).map(s => s.year);
  ok(sj.length ? sj.every(y2 => all.timeline_self_h6.readingCore.risk.includes(y2 + '년')) : /삼재에 해당하는 해는 없어요/.test(all.timeline_self_h6.readingCore.risk), '삼재 연도가 엔진과 다름');
}
ok(n >= 190, `검증 사주 부족(${n})`);
H.IDS.forEach(id => ok(titles[id].size >= 3, `${id} 첫 문장 종류가 너무 적음(${titles[id].size})`));

// 끼워 넣는 자리: '건강 및 사고수'(self_35) 바로 뒤에 6장, 두 번 넣지 않음
const ch0 = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, gender: 'M', calendar: 'solar', school: 'eokbu' });
const mk = (id, contract) => ({ id, editorialTopicId: 'self', editorialContractId: contract, act: 1, scenes: [] });
const rep = { chapters: [mk('a', 'timeline_self_03'), mk('hx', 'timeline_self_35'), mk('b', 'timeline_self_36')] };
const out = H.add(rep, {}, '', M, ch0), ids = out.chapters.map(c => c.id);
ok(JSON.stringify(ids) === JSON.stringify(['a', 'hx'].concat(H.IDS, ['b'])), '끼워 넣는 자리 오류: ' + ids.join(','));
ok(out.chapters.find(c => c.id === 'timeline_self_h1').placeAfter === 'hx' && out.chapters.find(c => c.id === 'timeline_self_h6').placeAfter === 'timeline_self_h5', 'placeAfter 오류');
ok(H.add(out, {}, '', M, ch0).chapters.length === out.chapters.length && rep.chapters.length === 3, '중복으로 들어가거나 원래 목차가 바뀜');

const read = p => fs.readFileSync(path.join(root, p), 'utf8');
for (const [file, pat, msg] of [
  ['report/v2/index.html', /flow-chapters\.js[^"]*"><\/script><script src="\/health-body\.js[^"]*"><\/script><script src="\/accident-hint\.js[^"]*"><\/script><script src="health-chapters\.js/, '타임라인 화면에 건강 장 스크립트가 없음'],
  ['report/v2/viewer.js', /R\.HealthChapters\.readyWithin\(2500\)\)S\.rep=R\.HealthChapters\.add\(S\.rep,S\.sd,S\.name,window\.Manse,S\.ch\)/, '타임라인에 건강 장을 넣는 코드가 없음'],
  ['functions/api/luck-flags.js', /NAMES = [^\n]*'healthChapters'/, '공개 스위치 이름에 healthChapters 가 없음'],
  ['report/admin/v2-luckenv.js', /flags: \{ healthChapters: v \}/, '관리자 스위치 버튼이 없음'],
  ['report/admin/v2-timeline.js', /R\.HealthChapters\.add\(doc,sd,'',M,ch\)/, '관리자 타임라인 구성에 건강 장이 없음'],
  ['report/v2/seal-topics.js', /healthCh=\/\^timeline_self_h\[1-6\]\$\/\.test\(chapter\),scope=healthCh\?'health-reference'/, '봉인 목차 설명에 건강 장 범위가 없음']]) ok(pat.test(read(file)), msg);
ok(!/fitScore|ownFit|LUCK_CFG|integrateYongsin/.test(read('report/v2/health-chapters.js').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), '건강 장 모듈이 점수 산식을 읽음');

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + [...new Set(fails)].slice(0, 25).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 사주 ${n}명 · 장 6개×7칸 · 첫 문장 종류 ${H.IDS.map(id => titles[id].size).join('/')} · 지수·삼재 일치 · 안내 문장 · 자리 · 점수 불변 · 연결`);
