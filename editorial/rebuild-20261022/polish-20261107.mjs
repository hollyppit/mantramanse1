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
  /엔진(?:의 계산 결과| ?값)/, /^이 해석은 /, /이 해석은 엔진/, /조건이라 함께 확인했어요/,
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
export function applyPolish(entries) {
  return entries.map(e => {
    const o = { ...e };
    FIELDS.forEach(f => { if (typeof o[f] === 'string') o[f] = polishText(o[f]); });
    if (o.applications && typeof o.applications === 'object') o.applications = Object.fromEntries(Object.entries(o.applications).map(([k, v]) => [k, typeof v === 'string' ? polishText(v) : v]));
    return o;
  });
}
export const POLISH_VERSION = 'polish-20261107-3';
export { polishText, rewrite };
