// 용어 설명 보강(glossary-sections*.js) 검증: 빠진 항목(쓰임과 특징·운에서·자리별·다른 글자와)을 채운 데이터와 화면 연결
//   node tests/glossary-sections-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const a = html.indexOf('var GLOSSARY = {'), b = html.indexOf('var GLOSSARY_DEFAULT', a);
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + ';this.GL=GLOSSARY;', ctx);
for (const f of ['glossary-sections.js', 'glossary-sections-2.js', 'glossary-sections-3.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const GL = ctx.GL, SEC = ctx.window.GLOSSARY_SECTIONS;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

const DEF = [['use', /■ 쓰임과 특징/], ['luck', /■ 운에서|\(대운\)|\(운세 ?흐름상 들어왔다면\)/], ['pos', /■ 사주 속 자리별|\([년월일시][간지주]에 있다면\)/], ['combo', /■ 다른 글자와|와 같이 있을 때\)|와 함께 있을 때/]];
const keys = Object.keys(SEC);
ok(keys.length >= 60, `보강 용어가 너무 적음(${keys.length})`);
let rows = 0, short = 0;
for (const k of keys) {
  ok(GL[k], `${k}: 용어 사전에 없는 용어`);
  const s = SEC[k];
  for (const f of ['use', 'luck', 'pos', 'combo']) if (s[f]) {
    ok(Array.isArray(s[f].rows) && s[f].rows.length >= 2, `${k}.${f}: 줄이 2개 미만`);
    if (f === 'pos') ok(s[f].rows.length === 4 && s[f].intro, `${k}.pos: 년·월·일·시 4줄과 설명이 필요`);
    if (f === 'combo') ok((s[f].rows.length === 4 || s[f].rows.length === 5) && s[f].intro, `${k}.combo: 4~5줄과 설명이 필요`);
    if (f === 'luck') ok(s[f].rows.length === 2 && s[f].rows[0][0] === '대운' && s[f].rows[1][0] === '세운', `${k}.luck: 대운·세운 2줄이어야 함`);
    for (const [l, t] of s[f].rows) { rows++; ok(typeof t === 'string' && t.length >= 15 && t.length <= 300, `${k}.${f}: 문장 길이 ${String(t).length}`); ok(!/\n/.test(t), `${k}.${f}: 줄바꿈 포함`); if (t.length < 25) short++; }
  }
  ok(DEF.some(([f]) => s[f]), `${k}: 항목이 하나도 없음`);
}
// 십성 16개는 "다른 글자와 함께 있을 때"가 모두 채워져야 한다
for (const k of ['십성', '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '비겁', '식상', '재성', '관성', '인성']) ok(SEC[k] && SEC[k].combo, `${k}: 다른 글자와 항목 누락`);
// 오행 5개는 쓰임·운·자리별·조합이 모두 있어야 한다
for (const k of ['목 기운', '화 기운', '토 기운', '금 기운', '수 기운']) for (const f of ['use', 'luck', 'pos', 'combo']) ok(SEC[k] && SEC[k][f], `${k}.${f} 누락`);
// 격국 18개는 4항목이 모두 있어야 한다
for (const k of Object.keys(GL).filter(x => GL[x][0] === '격국')) for (const f of ['use', 'luck', 'pos', 'combo']) ok(SEC[k] && SEC[k][f], `${k}.${f} 누락(격국)`);
// 구조: 자리별 17개, 운·조합 12개
for (const k of ['관살혼잡', '상관견관', '식신제살', '효신탈식(도식)', '상관패인', '살인상생', '재다신약', '관살과다', '식상과다(설기)', '군겁쟁재', '인성과다', '무비겁', '무식상', '무재', '무관', '무인성', '오행 결핍']) ok(SEC[k] && SEC[k].pos, `${k}.pos 누락`);
for (const k of ['식신생재', '재생관', '관인상생', '상관생재', '비겁생식상', '탐재괴인', '양인합살', '식상생재', '재관쌍미', '신왕재왕', '살중신경', '식상혼잡']) ok(SEC[k] && SEC[k].luck && SEC[k].combo, `${k}: 운·조합 누락`);
// 관계: 주요 12개의 조합
for (const k of ['육합', '삼합', '반합', '방합', '천간합', '천간충', '충', '형', '파', '해', '원진', '귀문관']) ok(SEC[k] && SEC[k].combo, `${k}.combo 누락`);

// 단정·의학 표현 금지, 건강 이야기에는 "참고"
const FORBID = /반드시|틀림없|죽습니다|사망|암에|질병에 걸|진단합|확정|100%|무조건/;
for (const k of keys) for (const f of ['use', 'luck', 'pos', 'combo']) if (SEC[k][f]) for (const [, t] of SEC[k][f].rows) ok(!FORBID.test(t), `${k}.${f}: 단정·의학 표현 "${t.slice(0, 20)}"`);
for (const k of ['목 기운', '화 기운', '토 기운', '금 기운', '수 기운']) ok(SEC[k].use.rows.some(([, t]) => /진단이 아니라 참고/.test(t)), `${k}: 건강 언급에 "진단이 아니라 참고"가 없음`);
// 같은 용어 안에서 같은 문장이 중복되지 않는다
for (const k of keys) { const all = ['use', 'luck', 'pos', 'combo'].filter(f => SEC[k][f]).flatMap(f => SEC[k][f].rows.map(r => r[1])); ok(new Set(all).size === all.length, `${k}: 문장 중복`); }

// 화면 연결과 중복 방지(이미 같은 항목이 본문에 있으면 건너뜀) — index.html의 함수를 그대로 실행해 확인
const fn = html.slice(html.indexOf('const GL_SECTION_DEF'), html.indexOf('const glFull = '));
ok(fn.length > 100, 'index.html에서 glSectionsText를 찾지 못함');
const run = vm.runInContext('(function(window){' + fn + ';return glSectionsText;})', ctx)(ctx.window);
const sample = k => run(k, GL[k][1]);
ok(/■ 다른 글자와 함께 있을 때/.test(sample('비견')), '비견: 기본 문구에 없는 조합 항목이 붙지 않음');
const edited = '■ 쓰임과 특징\n-. a\n\n■ 운에서 들어올 때 (대운·세운)\n-. (대운) x\n\n■ 사주 속 자리별\n-. (년지에 있다면) x\n\n■ 다른 글자와 함께 있을 때\n-. (재성과 같이 있을 때) x';
ok(run('비견', edited) === '', '모든 항목이 이미 있는데도 보강이 붙음(중복)');
const part = run('목 기운', '■ 쓰임과 특징\n-. a');
ok(!/■ 쓰임과 특징/.test(part) && /■ 운에서/.test(part) && /■ 사주 속 자리별/.test(part) && /■ 다른 글자와/.test(part), '항목별 중복 방지가 작동하지 않음');
ok(/glSectionsText\(k, t\)/.test(html) && /glCasesText\(k, t \+ s\)/.test(html), '목록·상세에 보강이 연결되지 않음');
ok(['glossary-sections.js', 'glossary-sections-2.js', 'glossary-sections-3.js'].every(f => html.includes(`<script src="${f}"></script>`)), 'index.html이 보강 스크립트를 읽지 않음');
ok(/<textarea id="gl-edit" aria-label="설명 문구">\$\{esc\(t\)\}<\/textarea>/.test(html), '관리자 편집창이 원문(t)이 아니게 바뀜');

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + fails.slice(0, 30).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 보강 용어 ${keys.length}개 · 문장 ${rows}줄 (25자 미만 ${short}줄)`);
