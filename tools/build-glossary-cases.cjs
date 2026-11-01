// 용어 "많을 때 · 적을 때 · 아예 없을 때" 보강 문구를 관리자 화면에 붙여 넣을 텍스트로 만든다.
//   node tools/build-glossary-cases.cjs <수정된 용어 JSON(/api/glossary 응답)> [출력 경로]
// 사용자가 이미 수정한 용어만 대상으로 하며(그 용어는 코드 보강이 아니라 저장된 문구가 표시되므로), 기존 본문 맨 아래에 붙인다.
// 붙여 넣은 용어는 화면이 자동 보강 블록을 중복해서 붙이지 않는다(HEADING이 본문에 있으면 건너뜀).
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ovrFile = process.argv[2], outFile = process.argv[3] || path.join(root, 'docs', 'GLOSSARY_CASES_PASTE_2026-11-02.txt');
if (!ovrFile) { console.error('사용법: node tools/build-glossary-cases.cjs <overrides.json> [out.txt]'); process.exit(1); }
const ovr = JSON.parse(fs.readFileSync(ovrFile, 'utf8'));
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, 'glossary-cases.js'), 'utf8'), ctx);
const C = ctx.window.GLOSSARY_CASES, BASIS = ctx.window.GLOSSARY_CASES_BASIS;
const HEADING = '■ 많고 적고 없고에 따라';
const LABEL = [['many', '많을 때'], ['few', '적을 때'], ['none', '아예 없을 때'], ['fill', '운에서 채워질 때']];
const block = k => [HEADING + ' (더 자세히)', '-. (판단 기준) ' + BASIS[C[k].basis], ...LABEL.filter(([f]) => C[k][f]).map(([f, l]) => `-. (${l}) ${C[k][f]}`)].join('\n');

const terms = Object.keys(ovr), out = [], missing = [], over = [], dup = [];
out.push('용어 설명 "많고 적고 없고에 따라" — 관리자 화면 붙여 넣기용 (사용자가 수정한 용어 ' + terms.length + '개)');
out.push('사용법: 관리자 화면에서 용어를 눌러 편집창을 열고 → 기존 본문 맨 아래로 이동 → 빈 줄 한 줄 → 아래 해당 용어의 ■ 블록 전체를 붙여 넣고 저장.');
out.push('붙여 넣은 용어는 화면이 같은 내용을 자동으로 또 붙이지 않습니다. 본문에 "' + HEADING + '" 제목이 있으면 건너뜁니다.');
out.push('전통 해석을 쉬운 말로 풀어 쓴 참고 문구이며, 건강·사건을 단정하지 않습니다. 마음에 안 드는 문장은 붙여 넣기 전에 고쳐 쓰셔도 됩니다.');
out.push('');
for (const k of terms) {
  if (!C[k]) { missing.push(k); continue; }
  if (ovr[k].includes(HEADING)) { dup.push(k); continue; }
  const b = block(k), total = ovr[k].length + 2 + b.length;
  if (total > 4000) over.push(k + '(' + total + ')');
  out.push('================ ' + k + ' ================', b, '');
}
fs.writeFileSync(outFile, out.join('\n'));
console.log('작성', outFile);
console.log('대상', terms.length, '· 블록 작성', terms.length - missing.length - dup.length, '· 이미 포함', dup.length, '· 내용 없음', missing.length, missing.join(' '));
if (over.length) { console.log('4000자 초과:', over.join(' ')); process.exit(1); }
