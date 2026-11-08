// 2026-11-07 문안 다듬기 — 전수 검사(tools/rebuild-audit.mjs)에서 걸린 "내부 설명"을 사용자 말로 바꾼다.
// 원본 파일(self-*.mjs 등)은 그대로 두고, index.mjs 에서 마지막 단계로 적용한다(enrich 다음). 안전 안내(notice)는 건드리지 않는다.
//  ① 지우기: 계산 방식·검수 범위·면책을 다시 설명하는 문장(엔진이 계산한…, …단정하지 않아요, 이 장은… 등)
//  ② 바꾸기: "…로 계산됐고 / …쪽으로 읽어요 / …로 풀어요" 같은 해석 과정 말투 → 그냥 그 사람에 대한 말("…쪽이에요")
//  지운 뒤 비거나 너무 짧아지면(15자 미만) 원문을 그대로 둔다. 같은 입력이면 같은 결과(결정론). 검사: node tests/rebuild-polish-sim.mjs
const FIELDS = ['core', 'basis', 'example', 'positive', 'negative', 'advice'];
const DROP = [
  /엔진이 계산한/, /만세력 엔진/, /단정하지(?:는)? 않/, /예고하지 않/, /정해지는 것은 아니에요/, /고정된 순서로 한 가지 줄기만/,
  /서로 다른 조건이라 함께 확인했어요/, /^이 장은 /, /^이 장에서는 /, /기준이 같은 (?:용신 )?오행을 가리킬 때만 쓰는 풀이/, /(?:으로|로) 읽는 (?:경향|성향|틀)이(?:에요|고)/,
  /둘로 나눠 풀었어요/, /겉과 속의 차이로 풀었어요/, /전통적인 (?:주제 )?읽기예요/, /원국에 아예 없는 경우와는 구분해요/, /비용이 들지 않는 기록과 소규모 실행으로만 구성했어요/,
  /상대적 분류/, /높고 낮음은 원국 글자 비중/, /^최고와 최악은 /, /운을 지킨다는 말은/,
  // 2차(2026-11-07): 근거 문단에 남은 엔진·계산 범위 설명
  /엔진(?:의 계산 결과| ?값)/, /^이 해석은 /, /이 해석은 엔진/, /조건이라 함께 확인했어요/, /(?:시점|사건)[^.]*말하지 않아요/, /서로 다른 조건이에요/,
];
// 받침 유무로 "이에요/예요"를 고른다. 단어 끝이 한글이 아니면(괄호 등) "이에요".
const batchim = w => { const ch = String(w).slice(-1), c = ch.charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return true; return c % 28 !== 0; };
const copula = w => w + (batchim(w) ? '이에요' : '예요');
// "X으로/X로 + 동사" 에서 X 를 정확히 떼어 낸다: X 가 받침으로 끝나면 '으로', 아니면 '로'(ㄹ받침은 '로').
const STEM = /([가-힣A-Za-z)]+?)(으로|로) /;
function nounBefore(word, particle) { return particle === '으로' || !batchim(word) || /[ㄹ]$/.test(word) ? word : word; }
// 2차 규칙: 근거 문단의 "…계산됐어요/계산돼서" 틀을 "…있어요/…이라"로. 1차 규칙보다 먼저 적용한다.
function rewrite2(s) {
  let t = s;
  t = t.replace(/^통근 모델 구간이 (.+?)(?:으로|로) 계산돼서, 위기에서 버티는 방식을 (.+?) 쪽으로 따로 풀었어요\./, (m, band, way) => `땅에 내린 뿌리(통근)가 ${/약한|없/.test(band) ? '얕은' : '단단한'} 편이라, 위기에서 ${way} 쪽으로 버텨요.`);
  t = t.replace(/올해 세운 흐름을 엔진이 ([가-힣]+?)으?로 분류했고 /g, '올해는 $1에 해당하고 ');
  t = t.replace(/(?:으로|로) 엔진에서 계산됐고,?/g, '이고,').replace(/엔진 기준으로 /g, '');
  t = t.replace(/이라는 점을 함께 봤고,/g, '이고,');
  t = t.replace(/(았|었)다고 계산됐어요\./g, '$1어요.');
  t = t.replace(/(은|는|이|가) (높게|낮게) 계산됐어요\./g, (m, p, h) => `${p} ${h === '높게' ? '높은' : '낮은'} 편이에요.`);
  t = t.replace(/(은|는|이|가) (높게|낮게) 계산됐고,?/g, (m, p, h) => `${p} ${h === '높게' ? '높은' : '낮은'} 편이고,`);
  t = t.replace(/모두 높게 계산됐고,?/g, '모두 큰 편이고,');
  t = t.replace(/(이|가) (높게|낮게) 계산돼서/g, (m, p, h) => `${p} ${h === '높게' ? '높은' : '낮은'} 편이라서`);
  t = t.replace(/(이|가) 높게, /g, '$1 높고 ');
  t = t.replace(/^원국에서 (.+?)(이|가) 계산됐/, '원국에 $1$2 있');
  t = t.replace(/ 유형이 계산됐어요\./g, '이 있어요.');
  t = t.replace(/(이|가) 계산됐어요\./g, '$1 있어요.').replace(/(이|가) 계산됐고,?/g, '$1 있고,');
  t = t.replace(/(?:으로|로) 계산돼서,?/g, '이라');
  // 조사: 받침 없는 말 뒤 "으로" → "로", 나열 끝 "편재이 있" → "편재가 있"
  t = t.replace(/([가-힣])으로/g, (m, c) => batchim(c) ? m : c + '로');
  t = t.replace(/(·[가-힣]+?)이 (있|없)/g, (m, w, v) => batchim(w) ? m : w + '가 ' + v);
  return t;
}
function rewrite(s) {
  let t = rewrite2(s);
  t = t.replace(/^\[(.+?)\] 조합으로 계산됐고,\s*/, (m, a) => a + ' 조합이라 ');
  t = t.replace(/의 세력이 높게 계산됐고,?/g, '의 힘이 큰 편이고,').replace(/의 세력이 낮게 계산됐고,?/g, '의 힘이 약한 편이고,');
  t = t.replace(/세력이 높게 계산됐/g, '힘이 큰 편이었').replace(/세력이 낮게 계산됐/g, '힘이 약한 편이었');
  t = t.replace(/에 해당하는 것으로 계산됐고,?/g, '에 해당하고,');
  // 같은 절 안에 목적어(…을/를)가 있으면 "…을 …으로 풀었어요"처럼 동사가 필요하므로 바꾸지 않는다.
  //  단, "…하는 쪽/구조/구도/모습/상징/흐름/편/사람"처럼 꾸밈을 받는 명사로 끝나면 목적어는 꾸밈말 안에 있으므로 언제나 바꿔도 된다.
  const HEAD = /(?:쪽|구조|구도|모습|상징|흐름|편|사람|경향|성향|단계|자리|타입|유형|인물|조합|해|구간|시기|시점)$/;
  const hasObject = (str, at, w) => { if (HEAD.test(w || '')) return false; const clause = str.slice(0, at).split(/[,·]/).pop(); return /[가-힣][을를]\s|(?:^|\s)[그이저]?걸\s/.test(clause); };
  t = t.replace(/([가-힣A-Za-z)]+?)(으로|로) 계산됐어요\./g, (m, w, p, at, str) => hasObject(str, at, w) ? m : copula(nounBefore(w, p)) + '.');
  t = t.replace(/(?:으로|로) 계산됐고,?/g, '이고,');
  // "…쪽으로/구도로/구조로/모습으로/상징으로 읽어요·풀어요·풀었어요." → "…쪽이에요."
  t = t.replace(/([가-힣]+?)(으로|로) (?:읽어요|풀어요|풀었어요)\./g, (m, w, p, at, str) => hasObject(str, at, w) ? m : copula(nounBefore(w, p)) + '.');
  // "엔진이 방어기로 분류한 해" → "방어기에 해당하는 해"
  t = t.replace(/엔진이 ([^,.]{1,24}?)(?:으로|로) 분류한 /g, '$1에 해당하는 ');
  // 남은 "…로 읽어요." 는 "…로 봐요." (해석 과정을 말하는 말투를 줄이되, 목적어가 있는 문장도 자연스럽게)
  t = t.replace(/(으로|로) 읽어요\./g, '$1 봐요.');
  t = t.replace(/\s{2,}/g, ' ').replace(/,\s*\./g, '.').trim();
  return t;
}
function polishText(text) {
  const src = String(text || '');
  if (!src.trim()) return src;
  const sents = src.split(/(?<=[.!?])\s+/), kept = sents.filter(s => !DROP.some(re => re.test(s))).map(rewrite).filter(Boolean);
  const out = kept.join(' ').trim();
  if (out.length >= 15) return out;
  // 지우고 나면 너무 짧은 문단은 지우지 않고 말투만 바꾼다(2차). 그래도 짧으면 원문.
  const soft = sents.map(rewrite).join(' ').replace(/\s{2,}/g, ' ').trim();
  return soft.length >= 15 ? soft : src;
}
// 3차(2026-11-08): 근거·제목 문단에서 명리 용어가 처음 나올 때만 괄호로 쉬운 뜻을 붙인다(문단당 최대 5개).
//  이미 바로 뒤에 괄호 설명이 있으면 건드리지 않는다(멱등). 일반 단어와 겹치는 지지·천간·충·상관없이 등은 붙이지 않는다.
export const GLOSS = [
  ['일간', "태어난 날의 글자, '나'"], ['원국', '타고난 사주 여덟 글자'], ['신강', '나를 돕는 힘이 큰 편'], ['신약', '나를 돕는 힘이 약한 편'], ['중화', '힘이 고른 편'],
  ['오행', '나무·불·흙·쇠·물'], ['십성', '나와 다른 글자의 관계'], ['비겁', '나와 같은 기운, 동료·경쟁'], ['식상', '표현·재주의 기운'], ['재성', '돈·재물의 기운'],
  ['관성', '직장·책임의 기운'], ['인성', '배움·도움의 기운'], ['비견', '나란히 서는 동료'], ['겁재', '경쟁하며 나누는 사람'], ['식신', '꾸준한 재주와 여유'],
  ['상관', '날카로운 표현과 반발'], ['편재', '크게 오가는 돈'], ['정재', '꾸준히 들어오는 돈'], ['편관', '나를 다그치는 압박'], ['정관', '규칙과 책임'],
  ['편인', '독특한 직관과 생각'], ['정인', '배움과 보살핌'], ['대운', '10년 단위의 흐름'], ['세운', '그해의 흐름'], ['월운', '그달의 흐름'],
  ['용신', '균형을 채워 주는 기운'], ['일지', '태어난 날의 아래 글자'], ['월지', '태어난 달의 아래 글자'], ['시지', '태어난 시의 아래 글자'], ['통근', '땅에 뿌리를 내림'],
  ['억부', '넘치면 덜고 모자라면 채우는 기준'], ['조후', '계절의 춥고 더움을 맞추는 기준'], ['지장간', '지지 속에 숨은 글자'],
];
const GLOSS_FIELDS = new Set(['basis']);
// '세운'은 "스스로 세운 기준"처럼 동사로도 쓰여서, 뒤에 조사나 운세 낱말이 올 때만 용어로 본다.
const NOUN_SEUN = '(?=이|은|의|에|과|도| 흐름| 천간| 십성| 분류)';
const insideParens = (t, at) => { let d = 0; for (let i = 0; i < at; i++) { if (t[i] === '(') d++; else if (t[i] === ')') d--; } return d > 0; };
function glossTerms(text, max = 5) {
  let t = String(text || '');
  // 이미 붙어 있는 설명도 한도에 센다(두 번 돌려도 결과가 같게).
  let n = GLOSS.filter(([term]) => new RegExp(`${term}\\(`).test(t)).length;
  for (const [term, plain] of GLOSS) {
    if (n >= max) break;
    // 이미 같은 용어에 괄호 설명이 붙어 있으면 건너뛴다(멱등).
    if (new RegExp(`${term}\\(`).test(t)) continue;
    // 단어 경계: 앞이 한글이 아니고(복합어 안쪽 제외), 뒤가 '없'(상관없이)·'군'이 아니며, 괄호 안이 아닌 첫 자리.
    const tail = term === '세운' ? NOUN_SEUN : '(?!없|이 없|군)';
    const re = new RegExp(`(^|[^가-힣])${term}${tail}`, 'g');
    let m, at = -1;
    while ((m = re.exec(t))) { const p = m.index + m[1].length; if (!insideParens(t, p)) { at = p; break; } }
    if (at < 0) continue;
    t = t.slice(0, at + term.length) + `(${plain})` + t.slice(at + term.length);
    n++;
  }
  return t;
}
// 제목(core)은 화면에 크게 보이는 문장이라 괄호 대신 쉬운 말로 바꾼다. 조사는 바뀐 말의 받침에 맞춘다.
const PARTICLES = [['이에요', '예요'], ['이라서', '라서'], ['이라', '라'], ['이고', '고'], ['이', '가'], ['은', '는'], ['을', '를'], ['과', '와'], ['으로', '로']];
const ALL_P = PARTICLES.flat().sort((a, b) => b.length - a.length);
function swapWord(t, term, plain) {
  const b = batchim(plain), rieul = /[을를릴물불]$/.test(plain) || ((plain.slice(-1).charCodeAt(0) - 0xAC00) % 28 === 8);
  const noun = term === '세운' ? NOUN_SEUN : '';
  const re = new RegExp(`(^|[^가-힣])${term}${noun}(${ALL_P.join('|')})?(?![가-힣]*\\))`, 'g');
  return t.replace(re, (m, pre, p) => {
    if (!p) return pre + plain;
    const pair = PARTICLES.find(x => x.includes(p));
    if (pair[0] === '으로') return pre + plain + (b && !rieul ? '으로' : '로');
    return pre + plain + (b ? pair[0] : pair[1]);
  });
}
const ELEM = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
const CORE_PLAIN = [
  ['신강', '타고난 힘이 센 편'], ['중화', '타고난 힘이 고른 편'], ['신약', '타고난 힘이 약한 편'], ['세운', '올해 흐름'], ['월운', '이달 흐름'], ['대운', '10년 흐름'],
  ['원국', '타고난 바탕'], ['재성', '돈 기운'], ['관성', '일·책임 기운'], ['식상', '표현 기운'], ['인성', '배움 기운'], ['비겁', '동료·경쟁 기운'],
  ['편재', '큰돈 기운'], ['정재', '꾸준한 돈 기운'], ['편관', '압박하는 기운'], ['정관', '규칙의 기운'], ['식신', '재주의 기운'], ['상관', '날 선 표현 기운'],
  ['편인', '독특한 생각 기운'], ['정인', '배움과 보살핌 기운'], ['비견', '동료 기운'], ['겁재', '경쟁 기운'], ['용신', '균형을 채워 주는 기운'], ['오행', '다섯 기운'],
  ['십성', '기운'], ['일지', '배우자 자리'], ['일간', '타고난 기질'],
];
function plainCore(text) {
  let t = String(text || '');
  t = t.replace(/일간의 힘이 (신강|중화|신약)(?:이)?라/g, (m, s) => `타고난 힘이 ${{ 신강: '센', 중화: '고른', 신약: '약한' }[s]} 편이라`);
  t = t.replace(/([가-힣]+) 기운의 일간은/g, '$1 기운을 타고난 사람은');
  t = t.replace(/올해 세운/g, '올해 흐름').replace(/일간의 힘이/g, '타고난 힘이').replace(/일간을 돕는/g, '나를 돕는').replace(/원국(?:의)? 일지/g, '타고난 배우자 자리');
  t = t.replace(/용신이 (목|화|토|금|수)(?:\([^)]*\))?(?:이)?라서/g, (m, e) => `균형을 채워 주는 기운이 ${ELEM[e]}${batchim(ELEM[e]) ? '이라서' : '라서'}`);
  for (const [term, plain] of CORE_PLAIN) t = swapWord(t, term, plain);
  return t;
}
export function applyPolish(entries) {
  return entries.map(e => {
    const o = { ...e };
    FIELDS.forEach(f => { if (typeof o[f] === 'string') { o[f] = polishText(o[f]); if (GLOSS_FIELDS.has(f)) o[f] = glossTerms(o[f]); if (f === 'core') o[f] = plainCore(o[f]); } });
    if (o.applications && typeof o.applications === 'object') o.applications = Object.fromEntries(Object.entries(o.applications).map(([k, v]) => [k, typeof v === 'string' ? polishText(v) : v]));
    return o;
  });
}
export const POLISH_VERSION = 'polish-20261107-4';
export { polishText, rewrite, glossTerms, plainCore };
