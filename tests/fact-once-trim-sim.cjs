// 챕터 고도화 2묶음 검증: 장 사이 사실 소개 반복 걷기(report/v2/fact-once.js trimIntro)
//   node tests/fact-once-trim-sim.cjs
// 전체 64장 수치는 node tools/timeline-chapter-audit.cjs 360 의 factSpread·repeat 로 다시 잰다.
const path = require('path'), fs = require('fs');
require(path.join(__dirname, '..', 'report/v2/fact-once.js'));
const F = globalThis.ReportV2.FactOnce, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const sd = { dayMaster: { stem: '경' }, strength: { band: '신약' }, nowYear: 2026 };

F.reset();
// 1. 처음 소개하는 장은 그대로, 같은 장을 다시 그려도 그대로
const a1 = '<p>힘이 여린 사주라 상대에게 맞추기 쉬워요. 지금 대운은 표현이 늘어나는 10년이에요.</p>';
ok(F.trimIntro(sd, a1, 'A') === a1, '첫 장에서 소개가 걷힘');
ok(F.trimIntro(sd, a1, 'A') === a1, '같은 장을 다시 그리면 소개가 사라짐');
// 2. 다른 장은 소개 구절만 걷고 결론은 남김
const b = F.trimIntro(sd, '<p>힘이 여린 편이라 계절의 영향을 크게 느끼는 편이에요. 지금 대운에서는 시도와 표현이 늘어나요.</p>', 'B');
ok(b === '<p>계절의 영향을 크게 느끼는 편이에요. 이 시기에는 시도와 표현이 늘어나요.</p>', '다른 장 소개 걷기 오류: ' + b);
// 3. 이름표(문장이 아닌 곳)도 걷음, 처음 소개하는 장은 남김
const c1 = F.trimIntro(sd, '<em>가장 큰 기운 비겁</em> 경금 일간이라 결단이 빨라요.', 'C');
ok(c1 === '<em>가장 큰 기운 비겁</em> 경금 일간이라 결단이 빨라요.', '이 장이 처음 소개하는 장인데 걷힘');
const d1 = F.trimIntro(sd, '<em>가장 큰 기운 비겁</em> 경금 일간이라 말이 칼날처럼 나가는 편이에요.', 'D');
ok(d1 === '<em>비겁</em> 말이 칼날처럼 나가는 편이에요.', '이름표·일간 소개 걷기 오류: ' + d1);
// 4. 걷고 나니 앞 장 문장과 같아지면 그 문장은 통째로 뺌(장 사이 반복 0)
F.trimIntro(sd, '<p>따뜻하고 안정감을 주는 사람이 맞아요.</p>', 'E');
const f1 = F.trimIntro(sd, '<p>힘이 여린 사주라 따뜻하고 안정감을 주는 사람이 맞아요. 다른 문장은 남아요.</p>', 'F');
ok(f1 === '<p>다른 문장은 남아요.</p>', '걷은 뒤 같아진 문장이 남음: ' + f1);
// 5. 다른 사람(사주)은 기록을 새로 시작
const sd2 = { dayMaster: { stem: '갑' }, strength: { band: '신강' }, nowYear: 2026 };
const g = '<p>힘이 센 사주라 앞에서 끌어가요.</p>'; ok(F.trimIntro(sd2, g, 'B') === g, '다른 사람인데 소개가 걷힘');
// 6. 사주 정보가 없거나 장 id 가 없으면 그대로
ok(F.trimIntro(null, a1, 'Z') === a1 && F.trimIntro(sd, a1, '') === a1, '정보가 없을 때 글이 바뀜');
// 7. 연결: 근거 상자 앞에서 부르고, 창작·교육 장은 건드리지 않음
const rt = fs.readFileSync(path.join(__dirname, '..', 'report/v2/reading-text.js'), 'utf8');
ok(/if\(R\.FactOnce&&R\.FactOnce\.trimIntro&&!out\.creative&&!out\.education\)h=R\.FactOnce\.trimIntro\(c\.readingVisualData,h,c\.editorialContractId\|\|c\.id\);\s*\n\s*var body=chapterFacts\(c\)\+basisGroup\('evidence'\);/.test(rt), 'reading-text 에 trimIntro 연결이 없거나 근거 상자 뒤에 있음');

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('모두 통과 · 첫 장 유지·다시 그리기·소개 걷기·이름표·같아진 문장 빼기·사람별 기록·연결');
