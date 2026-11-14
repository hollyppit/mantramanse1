// 챕터 고도화 1묶음 검증: 나이대 문장 걸러내기(report/v2/age-fit.js) + 서사 없는 장 근거 줄(reading-text.js chapterFacts)
//   node tests/age-fit-sim.cjs
// 하나라도 어기면 종료 코드 1. 전체 64장 수치는 node tools/timeline-chapter-audit.cjs 360 으로 다시 잰다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse; globalThis.window = globalThis;
const load = f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f });
['saju-data', 'age-fit', 'reading-text'].forEach(load);
const R = globalThis.ReportV2, AF = R.AgeFit, RT = R.ReadingText;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

// 1. 나이대 판정
const yr = new Date().getFullYear();
ok(AF.band({ birth: { solarY: yr - 15, solarM: 1, solarD: 1 } }) === 'young', '15세가 young 이 아님');
ok(AF.band({ birth: { solarY: yr - 40, solarM: 1, solarD: 1 } }) === '', '40세가 보통이 아님');
ok(AF.band({ birth: { solarY: yr - 70, solarM: 1, solarD: 1 } }) === 'senior', '70세가 senior 가 아님');
ok(AF.band({}) === '', '생년 없을 때 빈 값이어야 함');
AF.set({ birth: { solarY: yr - 12, solarM: 1, solarD: 1 } }); ok(AF.band({}) === 'young', 'viewer 가 정한 생년을 쓰지 않음'); AF.set(null);

// 2. 문장 걸러내기
const Y = [['실제 생활에서는 상사가 시키는 일을 먼저 해요.', true], ['평소 회사에서 동료와 잘 지내요.', true], ['연봉 협상에서 손해를 본 적이 있을 거예요.', true],
  ['앞으로 회사에 들어가면 동료와 잘 지낼 거예요.', false], ['배우자를 뜻하지 않습니다.', false], ['친구 사이에서 먼저 양보해요.', false]];
Y.forEach(([s, bad]) => ok(AF.odd(s, 'young') === bad, `young 판정 오류: ${s}`));
ok(AF.odd('회사 일보다 개인 작업에 열정이 생겨요.', 'young', true) && !AF.odd('회사 일보다 개인 작업에 열정이 생겨요.', 'young', false), '생활 장면(scene) 모드가 다르게 동작하지 않음');
const S = [['승진이나 이직 준비에 힘이 실려요.', true], ['첫 직장을 고를 때 기준을 세우세요.', true], ['모아 둔 것을 지키는 해예요.', false]];
S.forEach(([s, bad]) => ok(AF.odd(s, 'senior') === bad, `senior 판정 오류: ${s}`));
ok(AF.text('첫 문장이에요. 평소 회사에서 동료와 잘 지내요.\n\n둘째 문단이에요.', 'young') === '첫 문장이에요.\n\n둘째 문단이에요.', '문단·문장 남기기 오류');
ok(AF.text('그대로예요.', '') === '그대로예요.', '보통 나이는 그대로여야 함');
const f1 = AF.fill('young', 'wealth', '돈 이야기?'), f2 = AF.fill('young', 'wealth', '다른 장');
ok(f1 && f1 !== f2 && f1.includes('돈 이야기') && !AF.odd(f1, 'young'), '대체 문장이 장마다 다르지 않거나 다시 걸림');
ok(['self', 'wealth', 'career', 'love'].every(t => AF.fill('senior', t) && !AF.odd(AF.fill('senior', t), 'senior')), 'senior 대체 문장 오류');

// 3. 본문 조립: 20세 미만은 생활 장면의 어른 문장이 빠지고 비면 대체 문장, 65세 이상은 승진 문장이 빠짐, 핵심 문단은 비지 않음
const mkc = (vd, paras) => ({ id: 'timeline_wealth_04', editorialContractId: 'timeline_wealth_04', editorialTopicId: 'wealth', title: '월급형일까 사업형일까?', readingParagraphs: paras, readingVisualData: vd });
const paras = [{ role: 'title', text: '실제 생활에서는 회사 일보다 내 일에 마음이 가요.' }, { role: 'reality', text: '퇴근 뒤에 외주를 받으면 뿌듯해요.' }, { role: 'strength', text: '승진보다 내 일을 키우는 힘이 있어요. 끝까지 해내는 힘이 강점이에요.' }];
const young = RT.html(mkc({ birth: { solarY: yr - 14, solarM: 1, solarD: 1 } }, paras), 0), senior = RT.html(mkc({ birth: { solarY: yr - 72, solarM: 1, solarD: 1 } }, paras), 0), mid = RT.html(mkc({ birth: { solarY: yr - 35, solarM: 1, solarD: 1 } }, paras), 0);
ok(!/외주를 받으면/.test(young) && /지금 나이에 빗대 보면/.test(young), '20세 미만 생활 장면이 대체되지 않음');
ok(/회사 일보다 내 일에/.test(young), '핵심 문단이 통째로 사라짐');
ok(!/승진보다/.test(senior) && /끝까지 해내는 힘/.test(senior), '65세 이상 승진 문장이 빠지지 않음');
ok(/외주를 받으면/.test(mid) && /승진보다/.test(mid), '보통 나이 본문이 바뀜');

// 4. 서사 없는 장 근거 줄
let seed = 77; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; let n = 0;
for (let i = 0; i < 60; i++) {
  let ch; try { ch = M.compute({ year: 1950 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 7 ? Math.floor(rnd() * 24) : '', minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  const sd = R.SajuData.build(ch, { now: Date.now() }); n++;
  ['timeline_self_02', 'timeline_self_28', 'timeline_self_32', 'timeline_self_35'].forEach(id => {
    const h = RT.chapterFacts({ id, editorialContractId: id, readingVisualData: sd });
    ok((h.match(/class="reading-mine"/g) || []).length >= 2, `${id} 근거 줄이 2개 미만`);
    ok(!/undefined|NaN|null/.test(h) && /\d+%|[甲乙丙丁戊己庚辛壬癸]/.test(h), `${id} 근거 줄에 빈 값이 있거나 실제 값이 없음`);
  });
  ok(RT.chapterFacts({ id: 'timeline_self_03', readingVisualData: sd }) === '', '다른 장에는 근거 줄을 붙이지 않아야 함');
}
ok(n >= 50, '검증 사주 부족');

// 5. 연결
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
for (const [file, pat, msg] of [
  ['report/v2/index.html', /fact-once\.js[^"]*"><\/script><script src="age-fit\.js/, '타임라인 화면에 age-fit.js 가 없음'],
  ['report/v2/viewer.js', /if \(R\.AgeFit\) R\.AgeFit\.set\(sd\);/, 'viewer 가 독자 생년을 넘기지 않음'],
  ['report/v2/reading-depth.js', /R\.AgeFit,ab=AF\?AF\.band\(sd\)/, '깊이 풀이에 나이 걸러내기가 없음'],
  ['report/v2/reading-insight.js', /R\.AgeFit,ab=AF\?AF\.band\(sd\)/, '포인트 블록에 나이 걸러내기가 없음'],
  ['report/v2/reading-feature.js', /R\.AgeFit\.odd\(why,R\.AgeFit\.band\(H\.sd\)\)/, '일 흐름 TOP3 문구에 나이 걸러내기가 없음'],
  ['report/v2/fate-blocks-4.js', /function topicFor\(H, k\)/, '움직일 해 블록에 나이대 문구가 없음'],
  ['tools/timeline-chapter-audit.cjs', /'fact-once', 'age-fit'/, '감사 도구가 age-fit.js 를 불러오지 않음']]) ok(pat.test(read(file)), msg);
ok(!/fitScore|LUCK_CFG|evaluateLuck/.test(read('report/v2/age-fit.js')), 'age-fit 이 점수를 읽음');

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + [...new Set(fails)].slice(0, 20).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 나이 판정·문장 걸러내기·대체 문장·본문 조립(20세 미만/65세 이상/보통) · 근거 줄 4장×사주 ${n}명 · 연결`);
