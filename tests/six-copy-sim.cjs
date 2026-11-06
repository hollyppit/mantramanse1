// 타임라인 카드 첫머리 문안(luck-interpret.js SIX: 6분류 × 대운·세운·월운 × 첫 문장·설명·할 일·함정) 검증
//   node tests/six-copy-sim.cjs
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/luck6.js'), 'utf8'));
const L6 = globalThis.ReportV2.Luck6, LI = require(path.join(root, 'luck-interpret.js'));
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

// 관리자 게시 API(functions/api/luck-phrases.js validateText)와 같은 기준
const BAN = /반드시|확실히|틀림없이|무조건|100%|보장합니다|예언|재물운이 (좋아집니다|올라갑니다)/;
const polite = t => /(니다|세요|요)\.?$/.test(t.trim());
// 톤 기준(feedback: 명리 용어 없이 일상 장면으로)
const JARGON = /비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|용신|희신|기신|구신|한신|십성|신강|신약|대운|세운|월운|일진|합충|오행|(?<![가-힣])(천간|지지)(?![가-힣]*지[는도])/;   // "이어지지는" 같은 어미의 '지지'는 제외
const SCOPE = { daeun: /10년|시기/, seun: /올해|해예요|한 해/, wolun: /이번 달|달이에요|한 달/ };
const PARTS = ['hook', 'body', 'do', 'trap'];

let n = 0;
L6.NAMES.forEach(six => LI.SIX_LEVELS.forEach(lv => {
  const c = LI.sixCopy(six, lv), tag = six + '·' + lv;
  ok(c, tag + ' 문안 없음'); if (!c) return;
  ok(c.ids.length === 4 && c.ids.every(id => LI.PHRASES.some(p => p.id === id)), tag + ' 문구 ID가 DB에 없음');
  PARTS.forEach(part => {
    const t = c[part]; n++;
    ok(typeof t === 'string' && t.trim().length > 0 && t.length <= 200, `${tag}.${part} 길이 ${t && t.length}`);
    ok(!BAN.test(t), `${tag}.${part} 단정 표현`);
    ok(polite(t), `${tag}.${part} 존댓말 아님: …${t.slice(-15)}`);
    ok(!JARGON.test(t), `${tag}.${part} 명리 용어: ${(t.match(JARGON) || [])[0]}`);
  });
  ok(SCOPE[lv].test(c.hook), `${tag} 첫 문장에 시간 단위 표현 없음: ${c.hook}`);
  ok(c.hook.length <= 40, `${tag} 첫 문장이 제목으로 쓰기에 김(${c.hook.length}자)`);
  ok((c.body.match(/[.?!]/g) || []).length >= 2, `${tag} 설명이 두 문장 미만`);
}));
ok(n === L6.NAMES.length * 3 * 4, '문안 수 ' + n);
// 모르는 값은 null
ok(LI.sixCopy('없는분류', 'seun') === null && LI.sixCopy('기회기', 'ilun') === null, '알 수 없는 입력 처리');
// DB 전체 중복 없음(관리자 저장 시 중복 거부와 같은 기준)
const seen = {}; LI.PHRASES.forEach(p => { ok(!seen[p.text], '중복 문구: ' + p.id + ' = ' + seen[p.text]); seen[p.text] = p.id; });
// 게시본 교체가 sixCopy 에 반영되는지 (다른 테스트에 영향 없게 원래대로 되돌린다)
{ const id = 'six.기회기.seun.hook', orig = LI.PHRASES.find(p => p.id === id).text;
  LI.applyPublished({ [id]: '올해는 테스트 문장이에요.' }); ok(LI.sixCopy('기회기', 'seun').hook === '올해는 테스트 문장이에요.', '게시본 반영');
  const p = LI.PHRASES.find(x => x.id === id); p.text = orig; p.review = 'draft'; }

if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log(`모든 검증 통과 · 18칸 × 4 = ${n}문안 · 단정·존댓말·용어·시간 단위·중복·게시 반영`);
