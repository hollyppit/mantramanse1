// 용어 "많을 때 · 적을 때 · 아예 없을 때" 보강(glossary-cases.js) 검증
//   node tests/glossary-cases-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const a = html.indexOf('var GLOSSARY = {'), b = html.indexOf('var GLOSSARY_DEFAULT', a);
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + ';this.GL=GLOSSARY;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'glossary-cases.js'), 'utf8'), ctx);
const GL = ctx.GL, C = ctx.window.GLOSSARY_CASES, BASIS = ctx.window.GLOSSARY_CASES_BASIS;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

const FIELDS = ctx.window.GLOSSARY_CASES_FIELDS, isCount = k => FIELDS.countBases.includes(C[k].basis);
const ALLF = ['many', 'few', 'one', 'two', 'none', 'fill'];
const keys = Object.keys(C);
ok(keys.length >= 45, `보강 용어가 너무 적음(${keys.length})`);
for (const k of keys) {
  ok(GL[k], `${k}: 용어 사전에 없는 용어`);
  const c = C[k];
  ok(BASIS[c.basis], `${k}: 알 수 없는 basis ${c.basis}`);
  const fields = ALLF.filter(f => c[f]);
  ok(fields.length >= 2, `${k}: 항목이 2개 미만`);
  for (const f of fields) { ok(c[f].length >= 20 && c[f].length <= 330, `${k}.${f}: 길이 ${c[f].length}`); ok(!/[\n]/.test(c[f]), `${k}.${f}: 줄바꿈 포함`); }
  if (isCount(k)) { ok(c.one && c.two && c.many && c.none, `${k}: 1개·2개·3개 이상·없을 때 중 빠진 항목`); ok(!c.few, `${k}: 개수 기준인데 few가 남음`); }
  else if (c.basis !== 'structure') { ok(c.many && c.few && c.none, `${k}: 많음·적음·없음 중 빠진 항목`); ok(!c.one && !c.two, `${k}: 많고 적음 기준인데 개수 항목이 있음`); }
}
// 십성 15개(묶음 5 + 개별 10)와 오행 5개는 반드시 있어야 한다
for (const k of ['비겁', '식상', '재성', '관성', '인성', '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '목 기운', '화 기운', '토 기운', '금 기운', '수 기운']) ok(C[k], `${k}: 필수 용어 누락`);

// 사용자가 이미 수정한 용어(운영 저장분) 30개가 모두 있는지 — 있으면 붙여 넣기 텍스트로 만들 수 있다
const EDITED = '인성 비겁 재성 관성 식상 식신 상관 비견 겁재 정재 편재 정관 편관 정인 편인 재살 양인살 장성살 반안살 천살 관대 건록 월덕귀인 연살 제왕 지살 육해살 현침살 월살 쇠'.split(' ');
for (const k of EDITED) ok(C[k], `${k}: 사용자 수정 용어인데 보강 내용이 없음`);

// 단정·의학 표현 금지
const FORBID = /반드시|틀림없|죽습니다|사망|암에|질병에 걸|진단|확정|100%|무조건/;
for (const k of keys) for (const f of ALLF) if (C[k][f]) ok(!FORBID.test(C[k][f]), `${k}.${f}: 단정·의학 표현`);
// 건강 이야기는 "참고"를 붙인다
for (const k of ['목 기운', '화 기운', '토 기운', '금 기운', '수 기운']) ok(/참고/.test(C[k].many), `${k}.many: 건강 언급에 "참고"가 없음`);
// 개수 기준 용어는 31개(신살·12신살·월덕귀인·12운성·관계)이고, 이들은 "1개일 때/2개일 때/3개 이상일 때"로 표시된다
ok(keys.filter(isCount).length === 31, `개수 기준 용어가 31개가 아님(${keys.filter(isCount).length})`);
ok(JSON.stringify(FIELDS.count.map(x => x[1])) === JSON.stringify(['1개일 때', '2개일 때', '3개 이상일 때', '없을 때', '운에서 올 때']), '개수 항목 이름이 다름');
ok(html.includes('glCaseLabel(c).filter(([f]) => c[f])') && html.includes('F.countBases.includes(c.basis) ? F.count : F.level'), '화면이 항목 이름을 기준별로 고르지 않음');
// 자리와 뿌리 줄: 월지>일지>시지>년지 순서를 말하고, 십성·오행에만 붙는다(신살·12운성·관계·구조에는 붙지 않는다)
const POS = ctx.window.GLOSSARY_CASES_POSITION;
ok(POS && /월지 > 일지 > 시지 > 년지/.test(POS.text) && /통근/.test(POS.text), '자리와 뿌리 설명이 없음');
ok(POS.bases.join() === 'group,single,element', '자리와 뿌리 적용 대상이 달라짐');
ok(keys.filter(k => POS.bases.includes(C[k].basis)).length === 21, '자리와 뿌리 줄이 붙는 용어 수가 21개가 아님');
ok(/GLOSSARY_CASES_POSITION/.test(html), 'index.html이 자리와 뿌리 줄을 쓰지 않음');
// 같은 용어 안에서 세 항목이 똑같지 않다
for (const k of keys) { const v = ['many', 'few', 'one', 'two', 'none'].map(f => C[k][f]).filter(Boolean); ok(new Set(v).size === v.length, `${k}: 항목 문장이 중복`); }

// 화면 연결: index.html이 스크립트를 읽고, 관리자 편집창은 원문만 쓰며, 같은 제목이 있으면 중복해서 붙이지 않는다
ok(/<script src="glossary-cases.js"><\/script>/.test(html), 'index.html이 glossary-cases.js를 읽지 않음');
ok(/glCasesText\(k, t\)/.test(html) && /glFull\(k, t\)/.test(html) && /glFull\(key, t\)/.test(html), '목록·상세에 자동 보강이 연결되지 않음');
ok(/<textarea id="gl-edit" aria-label="설명 문구">\$\{esc\(t\)\}<\/textarea>/.test(html), '관리자 편집창이 원문(t)이 아니게 바뀜');
ok(/String\(t\)\.includes\(GL_CASES_HEAD\)/.test(html), '제목 중복 방지가 없음');

// 붙여 넣기 스크립트: 4000자 한도, 제목 포함
const tmp = path.join(__dirname, '..', 'output'); fs.mkdirSync(tmp, { recursive: true });
const ovrFile = path.join(tmp, 'glossary-cases-test-ovr.json'), outFile = path.join(tmp, 'glossary-cases-test-out.txt');
fs.writeFileSync(ovrFile, JSON.stringify(Object.fromEntries(EDITED.map(k => [k, GL[k][1]]))));
const r = require('child_process').spawnSync(process.execPath, [path.join(root, 'tools', 'build-glossary-cases.cjs'), ovrFile, outFile], { encoding: 'utf8' });
ok(r.status === 0, '붙여 넣기 텍스트 생성 실패: ' + (r.stdout + r.stderr).slice(0, 200));
const out = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
ok((out.match(/^================ /gm) || []).length === EDITED.length, '붙여 넣기 텍스트의 용어 수가 다름');
ok((out.match(/■ 많고 적고 없고에 따라/g) || []).length >= EDITED.length + 1, '제목 누락');
// "자리와 뿌리" 줄은 "판단 기준" 바로 아래, "많을 때" 위에 있다
const ordered = (out.match(/-\. \(판단 기준\)[^\n]*\n-\. \(자리와 뿌리\)[^\n]*\n-\. \(많을 때\)/g) || []).length;
ok(ordered === EDITED.filter(k => POS.bases.includes(C[k].basis)).length && ordered === 15, `자리와 뿌리 줄 위치가 판단 기준 바로 아래가 아님(${ordered}곳)`);
ok(/'-\. \(판단 기준\) ' \+ window\.GLOSSARY_CASES_BASIS\[c\.basis\], \.\.\.\(P && P\.bases\.includes\(c\.basis\) \? \['-\. \(자리와 뿌리\) '/.test(html), '화면에서 자리와 뿌리 줄이 판단 기준 바로 아래에 있지 않음');
// 개수 기준 용어(재살·양인살 등)는 개수 이름으로, 십성은 많고 적음 이름으로 붙여 넣기 텍스트에 나온다
const sec = k => { const i = out.indexOf('================ ' + k + ' ================'); const j = out.indexOf('\n================ ', i + 1); return out.slice(i, j < 0 ? undefined : j); };
const has = (k, label) => sec(k).includes('-. (' + label + ')');
ok(has('양인살', '1개일 때') && has('양인살', '2개일 때') && has('양인살', '3개 이상일 때') && has('양인살', '없을 때') && !has('양인살', '적을 때'), '양인살이 개수 이름으로 나오지 않음');
ok(has('식상', '많을 때') && has('식상', '적을 때') && has('식상', '아예 없을 때') && !has('식상', '1개일 때'), '식상이 많고 적음 이름으로 나오지 않음');
fs.rmSync(ovrFile, { force: true }); fs.rmSync(outFile, { force: true });

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + fails.join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 보강 용어 ${keys.length}개 · 사용자 수정 ${EDITED.length}개 모두 포함`);
