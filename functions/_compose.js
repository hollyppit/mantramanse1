// AI Composer 서버 로직(순수 함수). 파일명이 _로 시작해 라우트로 노출되지 않는다. import 없음 → Node 테스트 가능.
// AI 는 "편집자"다: 이미 선택된 해석 모듈 문장을 매끄럽게 잇고(핵심 문장·연결 문장), 시스템이 준 후보 중에서만 미디어를 고른다.
// 명리 규칙·숫자·직업·행동을 새로 만들 수 없고, 응답은 아래 sanitize 를 통과한 것만 쓰인다. 실패하면 호출 쪽이 원본 모듈 문장을 그대로 쓴다.
import { GUARD_PROMPT } from './_guard.js';
export const PROMPT_VERSION = 'p5';
const MAX_CH = 40, MAX_FIELD = 420, MAX_BYTES = 32 * 1024;
// 단정 표현 + 건강·사망·질병·투자수익·임신·법률 단정
export const BANNED = /(반드시|무조건|확정|100%|틀림없|사망|죽음|암에|질병에 걸|수익률|수익을 보장|임신|소송|범죄|이혼한다|파산)/;

export const SYSTEM = `너는 사주 운로(運路) 리포트의 "편집자"다. 입력으로 이미 사람이 작성한 해석 문장(선택된 모듈)과 계산 근거(fact)가 주어진다.
할 일: 챕터마다 (1) 핵심 문장 headline 1개(40자 안팎, 1문장), (2) 이어 읽기 좋은 lead 1~2문장(120자 안팎)을 다듬어 쓴다. 장면 미디어는 주어진 후보 assetId 중에서만 고른다.
엄격한 규칙:
- 입력 문장에 없는 새로운 명리 규칙·용어·수치·직업·행동·시기를 만들지 마라. 의미를 바꾸지 말고 표현만 매끄럽게 하라.
- 풀이(headline·lead)는 차분한 상담체(~습니다·~입니다)로 쓴다. headline은 간결한 명사형도 허용한다. 사용자는 "이 사람·주인공·이 인물·캐릭터·이 이야기"라고 부르지 마라. 이름 자리표시자 {hero}·{hero은는}·{hero이가}·{hero을를}·{hero의}로만 부르고 이 토큰을 그대로 둔다(이름을 짐작해 쓰지 마라). 한국어의 주어 생략을 살려 이름을 문장마다 반복하지 말고, 챕터 첫머리·핵심 성향·반전·현재 시점에서만 쓴다. "당신"·반말·해요체를 섞지 않는다. 입력에 없는 행동 지시는 쓰지 않는다. 챕터 사이 중복 표현을 줄이고 문체를 하나로 통일하라.
- 비겁·식상·재성·관성·인성·신강·신약 같은 교과서 용어는 화면 문장(headline·lead)에 쓰지 마라. 사람의 행동과 일상의 한 장면으로 옮겨 써라(예: "식상이 강하다" → "머릿속에 떠오른 것을 바깥으로 꺼내는 힘이 크다"). 근거(fact)의 사실은 바꾸지 않는다.
- "반드시·무조건·확정" 같은 단정, 건강·사망·질병·투자수익·임신·법률 예측을 쓰지 마라. 전생은 상징적 이야기로만 다뤄라. 길흉을 말하지 말고("흉한 날" 금지) "밀어붙이기보다 정리·확인에 유리한 흐름"처럼 조건으로 말하라. 순서는 현실 공감 → 의미 → 필요할 때만 명리 근거다. 명리 결과를 곧바로 판타지 설정("금이 많으니 검객")으로 바꾸지 마라.
- 미디어는 candidates 에 있는 assetId 만 쓴다. 새 URL/ID를 만들지 마라. 마땅한 것이 없으면 그 scene 은 생략한다.
총평(c00)은 verdict 의 discover(발견)·blocked(막힘)·evidence(증거) 문장만 다듬는다. 첫 문장(headline)과 advice 는 고정이라 건드리지 않는다.
- 같은 십성의 성향을 모든 챕터에 다시 쓰지 마라. 자기이해는 판단 습관, 직업은 업무 수행, 재물은 거래·관리, 연애는 감정 전달, 결혼은 생활과 역할, 인간관계는 경계와 협력에 초점을 둔다. 다음 챕터에는 앞서 말한 내용을 새로 요약하지 말고 새로운 적용 장면을 보여 준다.
- 약점 뒤에는 입력에 있는 보완 방향과 행동을 연결한다. 근거가 없는 해결책은 만들지 말고, 단점과 해결책의 인과관계가 끊어지지 않게 쓴다. 오행·십성의 비중을 능력의 유무·실제 재산·체력·인격과 동일시하지 않는다. 가장 약한 기운을 무조건 보충하라고 하지 않는다.
- 칭찬만 하지 마라. blocked 의 지적을 약하게 바꾸거나 길이를 크게 줄이지 마라(원문 길이의 절반 미만이면 버려진다). 말투는 차분한 상담체(~습니다)로 통일하고 강점과 약점을 조건과 함께 솔직하게 짚는다. 한 문장에 한 메시지만 담는다. 점쟁이·신령·예언자·수호신·안내자 같은 존재나 말투는 쓰지 않는다.
JSON 한 덩어리로만 답하라(총평은 {"id":"c00","verdict":{"discover":"...","blocked":"...","evidence":"..."}} 형태): {"chapters":[{"id":"c01","headline":"...","lead":"..."}],"media":{"<sceneId>":"<assetId>"}}` + GUARD_PROMPT;

const isStr = v => typeof v === 'string';
// 풀이 본문 문체: '당신'·해요체·새 명령형이 있거나 허용 밖 {자리표시자}가 있으면 그 챕터는 원본(template) 유지 (클라이언트 narrator.js 와 같은 규칙)
export const NARR_BAD = /당신|(?:이에요|예요|해요|있어요|없어요|거든요|잖아요|볼게요|세요)(?=[.!?…\s"'”’)]|$)/;
const HERO_KEYS = ['hero', 'hero은는', 'hero이가', 'hero을를', 'hero의'];
export const narrativeOk = v => !NARR_BAD.test(String(v || '')) && (String(v || '').match(/{[^{}]*}/g) || []).every(t => HERO_KEYS.includes(t.slice(1, -1)));
const cut = (v, n) => (isStr(v) ? v.slice(0, n) : '');

// 클라이언트가 보낸 payload 를 검증·정리한다. 모양이 이상하면 null.
export function validatePayload(b) {
  if (!b || typeof b !== 'object' || !b.payload || !Array.isArray(b.payload.chapters)) return null;
  const chapters = b.payload.chapters.slice(0, MAX_CH).map(c => c && /^[\w.-]{1,20}$/.test(c.id || '') ? { id: c.id, title: cut(c.title, 60), fact: cut(c.fact, MAX_FIELD), headline: cut(c.headline, MAX_FIELD), interpretation: cut(c.interpretation, MAX_FIELD), meaning: cut(c.meaning, MAX_FIELD * 2), action: Array.isArray(c.action) ? c.action.slice(0, 6).map(x => cut(x, 100)) : [], ...(c.verdict && typeof c.verdict === 'object' ? { verdict: { discover: cut(c.verdict.discover, 300), blocked: cut(c.verdict.blocked, 400), evidence: cut(c.verdict.evidence, 300) } } : {}) } : null).filter(Boolean);
  if (!chapters.length) return null;
  const mm = b.media && typeof b.media === 'object' ? b.media : {}, assets = {};
  for (const id of Object.keys(mm.assets || {}).slice(0, 200)) { if (!/^[\w.-]{1,80}$/.test(id)) continue; const a = mm.assets[id] || {}; assets[id] = { title: cut(a.title, 60), description: cut(a.description, 160), tags: Array.isArray(a.tags) ? a.tags.slice(0, 10).map(t => cut(t, 24)) : [] }; }
  const media = (Array.isArray(mm.scenes) ? mm.scenes : []).slice(0, 40).map(s => s && /^[\w.-]{1,40}$/.test(s.sceneId || '') ? { sceneId: s.sceneId, sceneType: cut(s.sceneType, 24), message: cut(s.message, 160), candidates: (Array.isArray(s.candidates) ? s.candidates : []).slice(0, 5).filter(c => Array.isArray(c) && assets[c[0]]).map(c => ({ assetId: c[0], score: +c[1] || 0 })) } : null).filter(s => s && s.candidates.length);
  const clean = { chapters, media, assets: Object.fromEntries([...new Set(media.flatMap(s => s.candidates.map(c => c.assetId)))].map(id => [id, assets[id]])) };
  return JSON.stringify(clean).length > MAX_BYTES ? null : clean;
}

// 결정적 해시(SHA-256 hex). 캐시 키 = 정리된 payload 내용 + 프롬프트 버전 → 같은 입력은 같은 결과, 남이 다른 내용으로 캐시를 오염시킬 수 없다.
export async function cacheKey(clean) {
  const data = new TextEncoder().encode(PROMPT_VERSION + '|' + JSON.stringify(clean)), h = await crypto.subtle.digest('SHA-256', data);
  return 'compose:' + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

export function buildUser(clean) {
  return '아래 챕터 문장을 편집하고, media 후보에서 장면 미디어를 골라라.\n' + JSON.stringify({ chapters: clean.chapters.map(c => ({ id: c.id, title: c.title, fact: c.fact, headline: c.headline, interpretation: c.interpretation, meaning: c.meaning, action: c.action, ...(c.verdict ? { verdict: c.verdict } : {}) })), media: clean.media, assets: clean.assets });
}

// AI 응답 → 검증된 결과. 숫자는 원문에 있던 것만, 단정 표현·길이 위반이면 그 항목은 버린다(원본 유지).
export function sanitize(text, clean) {
  const a = String(text || '').indexOf('{'), z = String(text || '').lastIndexOf('}'); let d = null;
  try { d = JSON.parse(text.slice(a, z + 1)); } catch { return null; }
  if (!d || typeof d !== 'object') return null;
  const src = new Map(clean.chapters.map(c => [c.id, c.fact + ' ' + c.headline + ' ' + c.interpretation + ' ' + c.meaning + ' ' + c.title + (c.verdict ? ' ' + c.verdict.discover + ' ' + c.verdict.blocked + ' ' + c.verdict.evidence : '')]));
  const vbase = new Map(clean.chapters.filter(c => c.verdict).map(c => [c.id, c.verdict]));
  const nums = s => (String(s).match(/\d+/g) || []);
  const out = { chapters: [], media: {} };
  for (const c of Array.isArray(d.chapters) ? d.chapters : []) {
    if (!c || !src.has(c.id)) continue;
    const base = src.get(c.id), baseNums = new Set(nums(base)), item = { id: c.id };
    const good = (v, min, max) => isStr(v) && v.trim().length >= min && v.length <= max && !BANNED.test(v) && nums(v).every(n => baseNums.has(n));
    const vb = vbase.get(c.id);
    if (vb) { // 총평: 발견·막힘·증거만. 막힘은 템플릿 길이의 50% 이상일 때만 채택, 첫 문장·조언은 고정
      const v = c.verdict && typeof c.verdict === 'object' ? c.verdict : {}, vi = {};
      if (good(v.discover, 8, 300)) vi.discover = v.discover.trim();
      if (good(v.blocked, 8, 400) && v.blocked.trim().length >= vb.blocked.length * 0.5) vi.blocked = v.blocked.trim();
      if (vb.evidence && good(v.evidence, 8, 300)) vi.evidence = v.evidence.trim();
      if (Object.keys(vi).length) out.chapters.push({ id: c.id, verdict: vi });
      continue;
    }
    if ((c.headline != null && !narrativeOk(c.headline)) || (c.lead != null && !narrativeOk(c.lead))) continue;
    if (good(c.headline, 4, 80)) item.headline = c.headline.trim();
    if (good(c.lead, 8, 300)) item.lead = c.lead.trim();
    if (item.headline || item.lead) out.chapters.push(item);
  }
  const used = new Set();
  for (const s of clean.media) { const id = d.media && d.media[s.sceneId]; if (isStr(id) && !used.has(id) && s.candidates.some(c => c.assetId === id)) { out.media[s.sceneId] = id; used.add(id); } }
  return out.chapters.length || Object.keys(out.media).length ? out : null;
}

// llm: async (system, user) => text. 실패하면 throw. 반환: { ok, result, cached }
export async function runCompose(body, deps) { // deps: { kvGet, kvPut, llm }
  const clean = validatePayload(body); if (!clean) return { ok: false, error: 'bad-payload' };
  const key = await cacheKey(clean);
  if (deps.kvGet) { const hit = await deps.kvGet(key); if (hit) return { ok: true, result: hit, cached: true }; }
  let text; try { text = await deps.llm(SYSTEM, buildUser(clean)); } catch (e) { return { ok: false, error: 'llm-failed', detail: String((e && e.message) || e).slice(0, 160) }; }
  const result = sanitize(text, clean); if (!result) return { ok: false, error: 'bad-answer' };
  if (deps.kvPut) await deps.kvPut(key, result);
  return { ok: true, result, cached: false };
}
