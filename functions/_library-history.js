// 검수 풀이 라이브러리의 이전 버전은 본 행(ik:blocks:chapter:library.<장>)이 아니라 별도 키(<본 키>:history)에 둔다.
//   · 본 행은 현재 초안·게시본·검증 사례만 담아 1MB 안팎으로 유지한다(행 한도 7.5MB, reading_compare_and_swap).
//   · 검증 사례(scenarios)는 버전마다 거의 같으므로 내용별로 한 번만 저장하고 항목은 참조(scenariosRef)만 가진다.
//   · 초안이 게시본과 같으면 draft 를 생략한다(펼칠 때 published 로 채운다).
//   · 예전 행처럼 본 행 안에 history 배열이 남아 있으면 읽을 때 합쳐서 보여 주고, 다음 저장 때 별도 키로 옮긴다.
export const HISTORY_FORMAT = 'library-history-2', HISTORY_CAP = 15, HISTORY_MAX_BYTES = 7000000;
export const historyKey = id => 'ik:blocks:chapter:library.' + id + ':history';
export const emptyHistory = () => ({ format: HISTORY_FORMAT, entries: [], scenarios: {} });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bytes = x => new TextEncoder().encode(JSON.stringify(x)).length;
function fnv(s) { let a = 0x811c9dc5, b = 0x01000193 ^ s.length; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822519) >>> 0; } return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'); }

function refFor(doc, scenarios) {
  const base = 'f' + fnv(JSON.stringify(scenarios));
  for (let i = 0; ; i++) { const r = i ? base + '-' + i : base; if (!doc.scenarios[r] || same(doc.scenarios[r], scenarios)) return r; }
}
// 한 버전의 상태(version·published·draft·scenarios·review·at)를 저장 형식으로 줄인다.
function pack(doc, state) {
  const published = state.published || [], out = { version: state.version, at: state.at || null, published };
  if (state.review !== undefined) out.review = state.review;
  if (state.draft && !same(state.draft, published)) out.draft = state.draft;
  const sc = state.scenarios || [], r = refFor(doc, sc); doc.scenarios[r] = sc; out.scenariosRef = r;
  return out;
}
function prune(doc) { const used = new Set(doc.entries.map(e => e.scenariosRef)); for (const k of Object.keys(doc.scenarios)) if (!used.has(k)) delete doc.scenarios[k]; return doc; }

// 저장된 값(새 형식 문서, 예전 배열, 없음)을 새 형식 문서로 읽는다. legacy 는 본 행에 남은 예전 history 배열.
export function parseHistory(stored, legacy) {
  let doc = emptyHistory();
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && Array.isArray(stored.entries)) doc = { format: HISTORY_FORMAT, entries: stored.entries.slice(), scenarios: { ...(stored.scenarios || {}) } };
  else if (Array.isArray(stored)) legacy = [...stored, ...(legacy || [])];
  const have = new Set(doc.entries.map(e => e.version));
  for (const e of Array.isArray(legacy) ? legacy : []) if (e && !have.has(e.version)) { doc.entries.push(pack(doc, e)); have.add(e.version); }
  doc.entries.sort((a, b) => b.version - a.version);
  return prune(doc);
}
// 맨 앞에 한 버전을 넣고(같은 버전이 있으면 바꾼다) 개수·크기 한도에 맞춰 오래된 것부터 뺀다.
export function pushHistory(doc, state, { cap = HISTORY_CAP, maxBytes = HISTORY_MAX_BYTES } = {}) {
  const next = { format: HISTORY_FORMAT, entries: doc.entries.filter(e => e.version !== state.version), scenarios: { ...doc.scenarios } };
  next.entries.unshift(pack(next, state)); next.entries = next.entries.slice(0, cap); prune(next);
  while (next.entries.length > 1 && bytes(next) > maxBytes) { next.entries.pop(); prune(next); }
  return next;
}
// 예전 화면·복원 코드가 쓰던 모양({version,at,published,draft,scenarios,review})으로 펼친다.
export function expandEntry(doc, e) { return e && { version: e.version, at: e.at, published: e.published || [], draft: e.draft || e.published || [], scenarios: doc.scenarios[e.scenariosRef] || [], ...(e.review !== undefined ? { review: e.review } : {}) }; }
export const findVersion = (doc, version) => expandEntry(doc, doc.entries.find(e => e.version === version));
// 관리자 화면에는 버전 목록만 보낸다.
export const historyList = doc => doc.entries.map(e => ({ version: e.version, at: e.at }));
