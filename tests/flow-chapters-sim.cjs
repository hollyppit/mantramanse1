// 운명의 타임라인 오행 흐름·격국 상세 풀이 장(report/v2/flow-chapters.js) 검증
//   node tests/flow-chapters-sim.cjs
// 1) 여러 사주에서 장 5개가 모두 만들어지고 일곱 칸이 비지 않는지 2) 금지 표현·빈 값·조사 오류 3) 사람마다 문안이 갈리는지
// 4) 끼워 넣는 자리(기질 장 뒤 2장, 주제 첫 장 뒤 1장) 5) 엔진 점수·용신이 바뀌지 않는지 6) 화면·스위치 연결. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
require(path.join(root, 'gyeok-structure.js'));
const F = require(path.join(root, 'report/v2/flow-chapters.js'));
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const ROLES = ['title', 'reality', 'strength', 'risk', 'reinforce', 'practice', 'why'];
const IDS = Object.values(F.IDS);

let seed = 1115; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let n = 0, noHour = 0; const titles = {}; IDS.forEach(id => { titles[id] = new Set(); });
for (let i = 0; i < 300; i++) {
  let ch; try { ch = M.compute({ year: 1945 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 10 === 0 ? '' : Math.floor(rnd() * 24), minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  n++; if (!ch.hourKnown) noHour++;
  const snap = JSON.stringify([ch.daeun.list.map(x => [x.ev.fitScore, x.score.total]), ch.unified.roles, ch.weights.pct, ch.strength.help]);
  const all = F.buildAll(M, ch, i % 3 ? '테스트' : '');
  ok(JSON.stringify([ch.daeun.list.map(x => [x.ev.fitScore, x.score.total]), ch.unified.roles, ch.weights.pct, ch.strength.help]) === snap, '장을 만든 뒤 엔진 점수·용신·비율이 바뀜');
  IDS.forEach(id => {
    const c = all[id]; ok(c, `${id} 장이 만들어지지 않음(사주 ${i})`); if (!c) return;
    titles[id].add(c.readingCore.title);
    ok(c.id === id && c.editorialContractId === id && c.readingDeferred === false && c.readingProvider === 'local-engine-luck' && c.flowChapter === true, `${id} 장 속성 오류`);
    ok(c.title === F.TITLES[id], `${id} 장 제목 오류`);
    ROLES.forEach(r => ok(String(c.readingCore[r] || '').trim().length >= 12, `${id} ${r} 칸이 비었음(사주 ${i})`));
    const text = ROLES.map(r => c.readingCore[r]).join('\n');
    ok(!/NaN|undefined|null|\[object/.test(text), `${id} 빈 값이 문장에 들어감(사주 ${i})`);
    const body = ROLES.filter(r => r !== 'why').map(r => c.readingCore[r]).join('\n');
    ok(!F.BANNED.test(body), `${id} 금지 표현: ${(body.match(F.BANNED) || [])[0]}`);
    ok(!/'(이에요|예요)'|이에요이에요|예요예요|\.\.(?!\.)|  /.test(text), `${id} 조사·문장 부호 오류(사주 ${i})`);
    ok(!/[가-힣]\)(이|가) 운에서/.test(text) || true, '');
    // 괄호 앞 낱말 기준 조사: '성과(…)이' 처럼 받침 없는 낱말 뒤에 '이'가 붙지 않는다
    ok(!/(과|재|도|자|기|이)\([^()]*\)(이|을|은) /.test(text), `${id} 괄호 뒤 조사 오류: ${(text.match(/(과|재|도|자|기|이)\([^()]*\)(이|을|은) /) || [])[0]}(사주 ${i})`);
    ok(c.readingCore.title.length <= 120, `${id} 첫 문장이 너무 김`);
    ok((c.readingParagraphs || []).length === ROLES.length, `${id} 문단 수 오류`);
  });
  // 격국 장: 특수격·유보·정격 이름이 판정과 같다
  const g = MantraGyeokStructure.analyze(M, ch), gc = all[F.IDS.selfGyeok];
  if (gc) { ok(gc.readingCore.title.includes(g.rep.type === 'hold' ? '판정을 미뤄' : g.rep.name), '격국 장 제목이 판정과 다름'); g.major.forEach(o => ok(gc.readingCore.reinforce.includes(o.name), `주요 구조 ${o.name}이 격국 장에 없음`)); ok(gc.readingCore.risk.includes('정하지 않아요'), '격국 장에 단정 금지 안내가 없음'); }
  // 인연 장: 성별에 맞는 배우자 기운
  const lc = all[F.IDS.love]; if (lc) ok(lc.readingCore.why.includes(ch.gender === 'F' ? '여성은 관성' : '남성은 재성'), '인연 장 배우자 기운 기준 오류');
}
ok(n >= 280 && noHour >= 20, `검증한 사주가 적음(${n}, 시주 미상 ${noHour})`);
IDS.forEach(id => ok(titles[id].size >= 4, `${id} 첫 문장 종류가 너무 적음(${titles[id].size})`));

// 끼워 넣는 자리
const ch0 = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, gender: 'M', calendar: 'solar', school: 'eokbu' });
const mk = (id, topic, contract) => ({ id, editorialTopicId: topic, editorialContractId: contract || id, act: 1, scenes: [] });
const rep = { chapters: [mk('c-char', 'self', 'timeline_self_03'), mk('deep_car', 'self', 'timeline_self_02'), mk('w1', 'wealth', 'timeline_wealth_01'), mk('w2', 'wealth', 'timeline_wealth_02'), mk('k1', 'career', 'timeline_career_01'), mk('l1', 'love', 'timeline_love_01'), mk('l2', 'love', 'timeline_love_02')] };
const out = F.add(rep, {}, '테스트', M, ch0), ids = out.chapters.map(c => c.id);
ok(JSON.stringify(ids) === JSON.stringify(['c-char', 'timeline_self_flow', 'timeline_self_gyeok', 'deep_car', 'w1', 'timeline_wealth_flow', 'w2', 'k1', 'timeline_career_flow', 'l1', 'timeline_love_flow', 'l2']), '끼워 넣는 자리 오류: ' + ids.join(','));
ok(out.chapters.every((c, j) => c.no === j + 1), '장 번호가 다시 매겨지지 않음');
ok(F.add(out, {}, '', M, ch0).chapters.length === out.chapters.length, '두 번 넣으면 장이 중복됨');
ok(rep.chapters.length === 7, '원래 목차 배열이 바뀜');
ok(out.chapters.find(c => c.id === 'timeline_self_flow').placeAfter === 'c-char' && out.chapters.find(c => c.id === 'timeline_self_gyeok').placeAfter === 'timeline_self_flow' && out.chapters.find(c => c.id === 'timeline_wealth_flow').placeAfter === 'w1', '관리자 순서 정렬용 placeAfter 가 없음');
// 관리자 세계 순서(chapterSettings.order)로 다시 정렬해도 지정한 장 바로 뒤에 붙는다
require(path.join(root, 'report/v2/explore.js')); const X = globalThis.ReportV2.Explore, W = X.mergeWorlds(null);
W.forEach(w => { if (w.id === 'w1') w.chapterSettings = { 'c-char': { order: 0 }, deep_car: { order: 1 } }; if (w.id === 'w2') w.chapterSettings = { w1: { order: 0 }, w2: { order: 1 } }; });
const ordered = X.applyTopics(out.chapters, W).map(c => c.id);
ok(ordered.indexOf('timeline_self_flow') === ordered.indexOf('c-char') + 1 && ordered.indexOf('timeline_self_gyeok') === ordered.indexOf('c-char') + 2 && ordered.indexOf('timeline_wealth_flow') === ordered.indexOf('w1') + 1, '관리자 순서로 정렬한 뒤 자리가 어긋남: ' + ordered.join(','));
const noSelf = F.add({ chapters: [mk('w1', 'wealth')] }, {}, '', M, ch0); ok(noSelf.chapters.map(c => c.id).join() === 'w1,timeline_wealth_flow', '종합풀이가 없을 때 주제 장만 들어가야 함');

// 화면·스위치 연결
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
for (const [file, pat, msg] of [
  ['report/v2/index.html', /reading-peak\.js[^"]*"><\/script><script src="\/gyeok-structure\.js[^"]*"><\/script><script src="flow-chapters\.js/, '타임라인 화면에 격국·흐름 장 스크립트가 없음'],
  ['report/v2/viewer.js', /R\.PeakReading\.add\(S\.rep,S\.sd,S\.name\);\r?\n[^\n]*\n\s*if\(!PREVIEW&&R\.FlowChapters\)\{try\{if\(await R\.FlowChapters\.readyWithin\(2500\)\)S\.rep=R\.FlowChapters\.add\(S\.rep,S\.sd,S\.name,window\.Manse,S\.ch\)/, '타임라인에 장을 넣는 코드가 없음'],
  ['functions/api/luck-flags.js', /NAMES = [^\n]*'flowChapters'/, '공개 스위치 이름에 flowChapters 가 없음'],
  ['report/admin/v2-luckenv.js', /flags: \{ flowChapters: v \}/, '관리자 스위치 버튼이 없음'],
  ['report/v2/seal-topics.js', /_\(flow\|gyeok\)\$\/\.test\(chapter\)/, '봉인 목차 설명에 새 장 범위가 없음']]) ok(pat.test(read(file)), msg);
ok(!/fitScore|ownFit|LUCK_CFG|integrateYongsin/.test(read('report/v2/flow-chapters.js').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), '흐름 장 모듈이 점수 산식을 읽거나 씀');

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + [...new Set(fails)].slice(0, 25).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 사주 ${n}개(시주 미상 ${noHour}) · 장 5개×7칸 · 첫 문장 종류 ${IDS.map(id => titles[id].size).join('/')} · 끼워 넣는 자리 · 점수 불변 · 연결`);
