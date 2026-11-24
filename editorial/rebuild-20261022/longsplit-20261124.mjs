// 2026-11-24 긴 근거 문장 나누기. index.mjs 조립의 맨 끝(consistency 뒤)에 적용한다.
// 근거(basis) 문장은 '조건, 강약이라 중간 해석해서, 결론 쪽이에요.'처럼 한 문장에 세 단계가 이어져 길어진다(화면 기준 90자 초과 약 300개).
// 화면에서 걷히는 괄호 뜻풀이를 뺀 길이가 90자를 넘는 문장만, 정해진 자리에서 두 문장으로 나눈다. 말은 바꾸지 않고 끊는 자리의 어미만 맞춘다.
//   1) 마지막 '…서, ' 자리: '…약해서, 결론' → '…약해요. 그래서 결론'
//   2) '…이고, 내 힘이/일간을 돕는 힘이 …' 자리: '…이고' → '…이에요/예요.'
// 판정·조건(when/unless)은 건드리지 않는다.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
// 화면 용어 각주 사전(괄호 뜻풀이를 걷는 기준) — 화면 길이를 재는 데만 쓴다
let GLOSS = null;
function glossRe() {
  if (GLOSS !== null) return GLOSS;
  try {
    const src = fs.readFileSync(path.join(here, '../../report/v2/term-notes-data.js'), 'utf8');
    const g = {}; new Function('window', src)(g);
    const D = g.MantraTermNotesData || {};
    const keys = Object.keys(D).filter(k => k.length >= 2).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    GLOSS = keys.length ? new RegExp('(' + keys.join('|') + ')\\(([^()%~]{1,40})\\)', 'g') : false;
  } catch (e) { GLOSS = false; }
  return GLOSS;
}
const screenLen = s => { const re = glossRe(); return (re ? s.replace(re, (m, k, g) => /[가-힣]/.test(g) ? k : m) : s).length; };
const LIMIT = 90;
const hasBatchim = ch => { const c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
const lastHangul = s => { const t = s.replace(/\([^()]*\)\s*$/, ''); const m = t.match(/[가-힣](?=[^가-힣]*$)/); return m ? m[0] : ''; };
const copula = s => (hasBatchim(lastHangul(s)) ? '이에요' : '예요');
// 라서: 동사(모자라다·자라다·다르다…)면 '라요', 명사+(이)라서면 '이에요/예요'
const VERB_RA = /(?:모자라|자라|달라|몰라|골라|빨라|올라|불러|길러|흘러|갈라|따라|바라)$/;
function endHere(left) {
  // left 는 '…서'로 끝난다
  const stem = left.slice(0, -1);
  if (/이라$/.test(stem)) { const n = stem.slice(0, -2); return n + copula(n) + '.'; }
  if (/라$/.test(stem) && !VERB_RA.test(stem)) { const n = stem.slice(0, -1); return n + copula(n) + '.'; }
  if (/이어$/.test(stem)) { const n = stem.slice(0, -2); return n + '이에요.'; }
  if (/여$/.test(stem) && !/하여$/.test(stem)) { return stem.slice(0, -1) + '예요.'; }
  return stem + '요.';
}
const SPLITS = [];
function splitOne(s) {
  if (screenLen(s) <= LIMIT) return null;
  // 1) 마지막 '…서, '
  const re1 = /(?<!에|로|부터|에게|한테|으로|께)(?<=[가-힣])서, /g;   // '…에서, ' 같은 조사는 빼고 동사·형용사 연결형 '…서, '만
  let m, at = -1, mlen = 0;
  while ((m = re1.exec(s))) { at = m.index; mlen = m[0].length; }
  if (at > 0) {
    const left = s.slice(0, at + mlen - 2), right = s.slice(at + mlen);
    if (screenLen(left) >= 25 && right.replace(/[.!?]$/, '').length >= 12 && !/^(?:그래서|그러니|그만큼)/.test(right)) return endHere(left) + ' 그래서 ' + right;
  }
  // 1-2) '…상징이라, …' 처럼 '(이)라, '
  const m3 = s.match(/^(.{25,})(이라|라), (.{12,})$/);
  if (m3 && !/^(?:그래서|그러니)/.test(m3[3])) { const isI = m3[2] === '이라' || /이$/.test(m3[1]), n = m3[2] === '라' && /이$/.test(m3[1]) ? m3[1].slice(0, -1) : m3[1]; if (isI || !VERB_RA.test(m3[1] + '라')) return n + copula(n) + '. 그래서 ' + m3[3]; }
  // 2) '…이고, 내 힘이/일간을 돕는 힘이/일간의 힘이 …' — 앞 조각 끝을 '…이에요/어요'로
  const m2 = s.match(/^(.{25,}?)(,? )((?:내 힘이|일간(?:\([^()]*\))?을 돕는 힘이|일간(?:\([^()]*\))?의 힘이|일간(?:\([^()]*\))?이) .{12,})$/);
  if (m2) { const end = closeClause(m2[1]); if (end) return end + ' ' + m2[3]; }
  // 3) 직업 계열: 'A 결은 …계열, B 결은 …계열(…)으로 읽는 전통 분류의 상징 예시예요.'
  const m5 = s.match(/^(.+? 결은 .+? 계열), (.+? 결은 .+?)(?:으로|로) 읽는 전통 분류의 상징 예시예요\.$/);
  if (m5) return m5[1] + '이에요. ' + m5[2] + copula(m5[2]) + '. 전통 분류로 든 예시예요.';
  // 4) '…원국에서 …' 앞의 '…이고, '
  const m6 = s.match(/^(.{20,}?이고), (원국(?:\([^()]*\))?에서 .{12,})$/);
  if (m6) { const end = closeClause(m6[1]); if (end) return end + ' ' + m6[2]; }
  // 5) 마지막 '…고, ' (맺을 수 있는 연결형만)
  const re7 = /고, /g; let m7, at7 = -1; while ((m7 = re7.exec(s))) at7 = m7.index;
  if (at7 > 0) { const left = s.slice(0, at7 + 1), right = s.slice(at7 + 3); if (screenLen(left) >= 25 && right.replace(/[.!?]$/, '').length >= 12) { const end = closeClause(left); if (end) return end + ' ' + right; } }
  return null;
}
// 연결형(…이고 / …고 / …했고 / …있고 / …하고 / …되고 / …인데)으로 끝나는 앞 조각을 맺는다. 못 맺으면 null
function closeClause(a) {
  let m;
  if ((m = a.match(/^(.*)이고$/))) return m[1] + copula(m[1]) + '.';
  if ((m = a.match(/^(.*\))고$/))) return m[1] + copula(m[1]) + '.';
  if ((m = a.match(/^(.*[가-힣])인데$/))) return m[1] + copula(m[1]) + '.';
  if ((m = a.match(/^(.*\))인데$/))) return m[1] + copula(m[1]) + '.';
  if ((m = a.match(/^(.*)(었|았|했|였)고$/))) return m[1] + m[2] + '어요.';
  if ((m = a.match(/^(.*)있고$/))) return m[1] + '있어요.';
  if ((m = a.match(/^(.*)없고$/))) return m[1] + '없어요.';
  if ((m = a.match(/^(.*)하고$/))) return m[1] + '해요.';
  if ((m = a.match(/^(.*)되고$/))) return m[1] + '돼요.';
  const V = { 올라오고: '올라와요.', 잃고: '잃어요.', 눌리고: '눌려요.', 오르고: '올라요.', 나고: '나요.', 커지고: '커져요.', 늘고: '늘어요.', 쌓이고: '쌓여요.' };
  for (const k of Object.keys(V)) if (a.endsWith(' ' + k) || a.endsWith(k) && a.length > k.length) return a.slice(0, -k.length) + V[k];
  return null;
}
function splitDeep(s, depth) {
  const r = splitOne(s); if (!r) return s;
  if (depth >= 2) return r;
  return r.split(/(?<=[.!?])\s+/).map(p => splitDeep(p, depth + 1)).join(' ');
}
function fixText(t) {
  if (typeof t !== 'string' || t.length <= LIMIT) return t;
  return t.split(/(?<=[.!?])(\s+)/).map(part => { if (/^\s+$/.test(part)) return part; const r = splitDeep(part, 0); if (r !== part) SPLITS.push([part, r]); return r; }).join('');
}
const FIELDS = new Set(['basis']);
// 본문(장면·조언) 쪽 긴 문장은 사람이 직접 두 문장으로 나눴다. 원문이 바뀌어 대상이 없으면 checkLongSplitUsed 가 멈춘다.
const MANUAL = [
  ['멘토가 붙고 교육 과정이 있는 신입 프로그램에서는 몇 달 만에 눈에 띄게 늘지만, 아무도 가르쳐 주지 않는 작은 조직에서 모든 걸 혼자 파악해야 하면 불안이 먼저 올라와서 일이 더뎌요.', '멘토가 붙고 교육 과정이 있는 신입 프로그램에서는 몇 달 만에 눈에 띄게 늘어요. 반대로 아무도 가르쳐 주지 않는 작은 조직에서 모든 걸 혼자 파악해야 하면, 불안이 먼저 올라와서 일이 더뎌요.'],
  ['월세, 장보기, 청소, 병원 예약 같은 일을 누가 맡는지 정하면 불만이 막연한 감정이 아니라 조정할 수 있는 문제가 되고, 한 달에 한 번 점검하면 다시 쏠리는 것도 막을 수 있어요.', '월세, 장보기, 청소, 병원 예약 같은 일을 누가 맡는지 정하면, 불만이 막연한 감정이 아니라 조정할 수 있는 문제가 돼요. 한 달에 한 번 점검하면 다시 한쪽으로 쏠리는 것도 막을 수 있어요.'],
  ['부업 이야기를 꺼냈을 때 "그럼 이번 달에 하나만 올려 봐"라고 말해 주는 친구와 있으면 실제로 첫 판매까지 가고, 걱정만 늘어놓는 사람과 있으면 계획이 메모장에 남아요.', '부업 이야기를 꺼냈을 때 "그럼 이번 달에 하나만 올려 봐"라고 말해 주는 친구와 있으면 실제로 첫 판매까지 가요. 걱정만 늘어놓는 사람과 있으면 계획이 메모장에만 남고요.'],
  ['이 이야기를 현실에 옮길 때는 내가 본 것을 혼자 간직하다 사고가 난 뒤에야 이야기하게 되는 아쉬움과, 지도를 서랍에 넣어 두며 쌓이는 자기 의심의 비용을 조심해야 해요.', '이 이야기를 현실에 옮기면, 내가 본 것을 혼자 간직하다 일이 터진 뒤에야 말하게 되는 아쉬움을 조심해야 해요. 지도를 서랍에 넣어 둔 채 쌓이는 자기 의심도요.'],
  ['글, 디자인, 강의, 제작, 상담처럼 내 결과물이 곧 상품이 되는 일에서 수입이 만들어지고, 영업과 홍보를 따로 하지 않으면 실력에 비해 알려지지 않아서 수입이 정체돼요.', '글, 디자인, 강의, 제작, 상담처럼 내 결과물이 곧 상품이 되는 일에서 수입이 만들어져요. 다만 영업과 홍보를 따로 하지 않으면 실력에 비해 덜 알려져서 수입이 정체돼요.'],
  ['월급날 자동이체로 저축 몫을 먼저 빼고, 한 달에 한 번 잔액을 훑어보고, 계약서를 볼 때 쓰는 체크리스트를 세 가지로 만들어 두면 신경을 덜 쓰고도 새는 곳이 막혀요.', '월급날 자동이체로 저축 몫을 먼저 빼고, 한 달에 한 번 잔액을 훑어보세요. 계약서를 볼 때 확인할 것도 세 가지로 정해 두면, 신경을 덜 쓰고도 새는 곳이 막혀요.'],
  ['모임에서 분위기를 살피고 다정한 말 한마디로 사람들을 편하게 해 주는데, 일정이 연달아 이어진 주에는 갑자기 연락을 끊고 약속을 취소해서 주변이 이유를 몰라 당황해요.', '모임에서 분위기를 살피고 다정한 말 한마디로 사람들을 편하게 해 줘요. 그런데 일정이 연달아 이어진 주에는 갑자기 연락을 끊고 약속을 취소해서, 주변이 이유를 몰라 당황해요.'],
  ['날이 풀리면 약속과 운동을 한꺼번에 늘리고 아침 일찍 일어나려 무리하다가, 3주쯤 지나 아침 피로와 머리가 무거운 느낌 같은 컨디션 저하를 느끼고 일정을 줄이게 돼요.', '날이 풀리면 약속과 운동을 한꺼번에 늘리고 아침 일찍 일어나려 무리해요. 그러다 3주쯤 지나 아침 피로와 머리가 무거운 느낌이 오면 그제야 일정을 줄이게 돼요.'],
  ['"이 부분은 좋고, 이건 다시 해 보자"라고 말해 주는 팀장 덕분에 반년 만에 결과물이 달라지고, 평가 기준이 매번 바뀌는 사람과는 무엇을 고쳐야 할지 몰라 지쳐요.', '"이 부분은 좋고, 이건 다시 해 보자"라고 말해 주는 팀장 덕분에 반년 만에 결과물이 달라져요. 반대로 평가 기준이 매번 바뀌는 사람과는 무엇을 고쳐야 할지 몰라 지쳐요.'],
  ['이 이야기에서 당신의 빛은 훗날 다른 학자가 같은 해석을 발표했을 때 내 생각도 틀리지 않았다는 걸 확인하고, 한솔의 아쉬움에서 말하는 일의 가치를 배우는 점이에요.', '이 이야기에서 당신의 빛은, 훗날 다른 학자가 같은 해석을 발표했을 때 내 생각도 틀리지 않았다는 걸 확인하는 순간이에요. 한솔의 아쉬움에서 말하는 일의 가치를 배우는 것도요.'],
  ['같은 기질이 어떤 조건에서는 돈에 휘둘리지 않고 일의 가치에 집중해서 늦게 크게 쌓는 힘이 되고, 어떤 조건에서는 돈 관리를 외면해서 새는 곳을 방치하는 힘이 돼요.', '같은 기질이 어떤 때는 돈에 휘둘리지 않고 일의 가치에 집중해서 늦게 크게 쌓는 힘이 돼요. 어떤 때는 돈 관리를 외면해서 새는 곳을 그냥 두는 쪽으로 가요.'],
  ['지인의 제안으로 공동 프로젝트를 맡아 일이 늘어도, 비용을 누가 먼저 내고 대금은 언제 나누는지 정하지 않으면 바쁘게 일한 뒤 정산에서 불편함이 생길 수 있습니다.', '지인의 제안으로 공동 프로젝트를 맡아 일이 늘 수 있어요. 이때 비용을 누가 먼저 내고 대금은 언제 나누는지 정하지 않으면, 바쁘게 일한 뒤 정산에서 서로 불편해져요.'],
  ['사고수는 전통 운세에서 주의가 필요한 영역을 가리키는 개념이고, 실제 사고의 가능성이나 발생을 말하지 않으며 부주의가 생기기 쉬운 생활 장면과 예방 행동만 다뤄요.', '사고수는 전통 운세에서 주의가 필요한 영역을 가리키는 말이에요. 실제 사고가 난다는 뜻이 아니라, 부주의가 생기기 쉬운 생활 장면과 예방 행동만 다뤄요.'],
  ['"우리 2년 뒤엔 어떻게 살고 싶어?" 같은 진지한 이야기를 나눌 수 있는 연인에게 믿음이 가고, 미래 얘기만 나오면 "그건 나중에"로 넘기는 상대에게는 실망해요.', '"우리 2년 뒤엔 어떻게 살고 싶어?" 같은 진지한 이야기를 나눌 수 있는 연인에게 믿음이 가요. 미래 얘기만 나오면 "그건 나중에"로 넘기는 상대에게는 실망하고요.'],
  ['목(뻗고 긴장하는 기운)이 높고 토(안정·소화 리듬의 기운)가 낮음 조합이라 전통에서는 목을 근육의 긴장이나 눈의 피로, 토를 식사 리듬과 연결한 상징으로 읽어서, ', '목(뻗고 긴장하는 기운)은 많고 토(안정·소화 리듬의 기운)는 적은 조합이에요. 전통에서는 목을 근육의 긴장이나 눈의 피로와, 토를 식사 리듬과 연결해 읽어요. 그래서 '],
  ['타고난 바탕에서 돈 기운의 그릇이 작게 계산돼서 돈 자체에 대한 집중이 약하지만, 힘은 충분해서 마음먹고 돈을 다루기 시작하면 방식에 따라 크게 달라질 수 있어요.', '타고난 바탕에서 돈 기운의 그릇이 작은 편이라 돈 자체에 대한 집중은 약해요. 대신 힘은 충분해서, 마음먹고 돈을 다루기 시작하면 방식에 따라 크게 달라질 수 있어요.'],
];
const MANUAL_USED = MANUAL.map(() => 0);
function manual(t) { let v = t; MANUAL.forEach(([a, b], i) => { if (v.includes(a)) { MANUAL_USED[i]++; v = v.split(a).join(b); } }); return v; }
export function checkLongSplitUsed() { const miss = MANUAL.filter((m, i) => !MANUAL_USED[i]).map(m => m[0]); if (miss.length) throw new Error('longsplit-20261124: 원문을 찾지 못한 줄 ' + miss.length + '개 — ' + miss.slice(0, 2).join(' | ')); }
function walk(o, key) {
  if (typeof o === 'string') { const v = manual(o); return FIELDS.has(key) ? fixText(v) : v; }
  if (Array.isArray(o)) return o.map(x => walk(x, key));
  if (o && typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] = (k === 'when' || k === 'unless') ? o[k] : walk(o[k], k); return out; }
  return o;
}
export function applyLongSplit(list) { return list.map(e => walk(e, '')); }
export const LONG_SPLITS = SPLITS;
