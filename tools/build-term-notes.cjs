// 상세풀이 용어 각주 사전 만들기:  node tools/build-term-notes.cjs  → report/v2/term-notes-data.js
// 출처: 만세력 앱(index.html)의 GLOSSARY(관리자 용어 사전과 같은 기본 문구) 중 명리 분야만. 자미두수·택일은 뺀다.
// 각 용어: e = "쉽게 읽기" 한 줄(있으면), p = 본문 첫 한두 문장(해요체로 바꿈, 120자 안팎). 앱 안내 문장("이 앱은…")은 뺀다.
// report/v2/terms.js 의 쉬운 뜻(plain)이 있으면 그것을 p 로 우선한다(이미 해요체로 다듬은 문장).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const L = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n');
const start = L.findIndex(l => /^var GLOSSARY = \{/.test(l));
let end = -1; for (let i = L.length - 1; i > start; i--) if (/^\}\)\(GLOSSARY\);/.test(L[i]) && i < start + 4000) { end = i; break; }
if (start < 0 || end < 0) throw Error('GLOSSARY 범위를 찾지 못함');
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(L.slice(start, end + 1).join('\n').replace(/^var GLOSSARY/, 'globalThis.GLOSSARY'), ctx);
const G = ctx.GLOSSARY;
const tctx = { console }; tctx.globalThis = tctx; tctx.window = tctx; vm.createContext(tctx);
vm.runInContext(fs.readFileSync(path.join(root, 'report/v2/terms.js'), 'utf8'), tctx);
const TERMS = tctx.ReportV2.Terms;

const KEEP = new Set(['기초', '자리', '십성', '지장간', '12운성', '12신살', '공망', '관계', '신살', '운', '강약', '용신', '구조', '운의 시기', '일간', '격국', '오행', '고전']);
// 일상어와 겹치거나 화면에서 용어로 쓰이지 않는 키
const SKIP = new Set(['사주', '만세력', '절기', '시간', '주의', '실행', '정기', '여기', '중기', '목욕', '활용', '변동성', '보통', '기회', '등급', '회피', '상태', '안정성', '흐름 점수', '활성도', '판정 순서', '실행 등급', '상문', '조객', '운의 근', '보강 근', '진태양시', '평균태양시', '균시차', '서머타임', '자시', '정자시', '야자시', '봉법', '좌법', '손 없는 날', '시진', '음양', '간지', '입춘', '절입', '사령', '해공', '12건제', '택일', '십악대패일', '물상', '개운법', '기회 활성도', '근 안정성', '상태 보통', '운의 근 보강', '시주 미상', '윤달', '음력', '양간', '음간', '태', '양', '쇠', '병', '사', '묘', '절', '형', '파', '해', '충', '합']);
// 합니다체 → 해요체. 문장 끝뿐 아니라 괄호·공백 앞도 바꾼다. 목록에 없는 어미가 남으면 생성기가 실패한다.
const END = '(?=[.(\\s,]|$)';
const PAIRS = [['합니다', '해요'], ['됩니다', '돼요'], ['봅니다', '봐요'], ['읽습니다', '읽어요'], ['씁니다', '써요'], ['납니다', '나요'], ['있습니다', '있어요'], ['없습니다', '없어요'],
  ['집니다', '져요'], ['줍니다', '줘요'], ['옵니다', '와요'], ['갑니다', '가요'], ['냅니다', '내요'], ['춥니다', '춰요'], ['릅니다', '라요'], ['깁니다', '겨요'], ['웁니다', '워요'],
  ['뉩니다', '뉘어요'], ['칩니다', '쳐요'], ['킵니다', '켜요'], ['립니다', '려요'], ['풉니다', '풀어요'], ['이룹니다', '이뤄요'], ['뀝니다', '뀌어요'], ['모읍니다', '모아요'],
  ['깁니다', '겨요'], ['섭니다', '서요'], ['굽니다', '굽어요'], ['엽니다', '열어요'], ['뵙니다', '봬요'], ['둡니다', '둬요'], ['맞습니다', '맞아요'], ['좋습니다', '좋아요'],
  ['같습니다', '같아요'], ['많습니다', '많아요'], ['않습니다', '않아요'], ['받습니다', '받아요'], ['약합니다', '약해요'], ['강합니다', '강해요'], ['깊습니다', '깊어요'], ['높습니다', '높아요'], ['낮습니다', '낮아요'],
  ['작습니다', '작아요'], ['적습니다', '적어요'], ['큽니다', '커요'], ['쉽습니다', '쉬워요'], ['어렵습니다', '어려워요'], ['가깝습니다', '가까워요'], ['맡습니다', '맡아요'], ['얻습니다', '얻어요'], ['넣습니다', '넣어요'], ['놓습니다', '놓아요'], ['낳습니다', '낳아요'], ['붙습니다', '붙어요'], ['남습니다', '남아요'], ['삼습니다', '삼아요'], ['찾습니다', '찾아요'], ['먹습니다', '먹어요'], ['막습니다', '막아요'], ['묶습니다', '묶어요'], ['섞습니다', '섞어요'], ['겪습니다', '겪어요'], ['잃습니다', '잃어요'], ['끊습니다', '끊어요'], ['했습니다', '했어요'], ['아닙니다', '아니에요'], ['힙니다', '혀요'], ['만듭니다', '만들어요']];
const haeyo = s => {
  let t = String(s).replace(new RegExp('([가-힣])([)"”]*)입니다' + END, 'g'), (m, ch, q) => ch + q + (((ch.charCodeAt(0) - 0xac00) % 28) ? '이에요' : '예요')).replace(new RegExp('([가-힣])입니다' + END, 'g'), (m, ch) => ch + (((ch.charCodeAt(0) - 0xac00) % 28) ? '이에요' : '예요'));
  for (const [a, b] of PAIRS) t = t.replace(new RegExp(a + END, 'g'), b);
  return t;
};
const sents = t => t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const out = {};
for (const [k, v] of Object.entries(G)) {
  if (!Array.isArray(v) || !KEEP.has(v[0]) || SKIP.has(k) || k.length < 2 || /[()]/.test(k)) continue;
  const text = String(v[1] || ''), [main, ...rest] = text.split(/\n\s*\n/);
  const easyLine = (text.match(/쉽게 (?:읽기|말해)\)?[:：]?\s*([^\n]+)/) || [])[1] || '';
  let p = '';
  for (const s of sents(main.replace(/^💡 쉽게 말해[^.]*\.\s*/, ''))) {
    if (/이 앱|앱은|앱에서|학파를 고르/.test(s)) continue;
    if (p && (p + ' ' + s).length > 130) break;
    p = p ? p + ' ' + s : s;
    if (p.length >= 70) break;
  }
  const plain = TERMS.explain(k, {}) ? TERMS.explain(k, {}).plain : '';
  const e = haeyo((((easyLine.match(/"/g)||[]).length%2)?easyLine.replace(/"/g,''):easyLine).split(/(?<=[.])\s/)[0].trim()).replace(/\.$/, '');
  out[k] = { c: v[0], ...(e ? { e } : {}), p: plain || haeyo(p) };
}
// 사전에 없는 화면 용어: terms.js 쉬운 뜻으로 채운다
for (const k of TERMS.KEYS) if (!out[k] && k.length >= 2) { const x = TERMS.explain(k, {}); if (x && x.plain) out[k] = { c: '기초', p: x.plain }; }
// 화면에서 자주 쓰는 묶음 이름
out['배우자궁'] = out['배우자궁'] || { c: '자리', p: '태어난 날의 아래 글자(일지)를 가리키는 말이에요. 가까운 관계와 배우자의 모습을 읽는 자리예요.' };
const keys = Object.keys(out).sort();
const left = keys.filter(k => /니다/.test(out[k].p + (out[k].e || '')));
if (left.length) throw Error('합니다체가 남은 용어: ' + left.join(', ') + ' — PAIRS 에 어미를 더하세요');
const body = '// 자동 생성: node tools/build-term-notes.cjs (출처: index.html GLOSSARY 명리 분야 + report/v2/terms.js). 직접 고치지 말고 생성기를 다시 돌린다.\n'
  + '(function(root){root.MantraTermNotesData=' + JSON.stringify(Object.fromEntries(keys.map(k => [k, out[k]]))) + ';})(typeof window!=="undefined"?window:globalThis);\n';
fs.writeFileSync(path.join(root, 'report/v2/term-notes-data.js'), body);
console.log('용어 ' + keys.length + '개 → report/v2/term-notes-data.js (' + Math.round(body.length / 1024) + 'KB)');
