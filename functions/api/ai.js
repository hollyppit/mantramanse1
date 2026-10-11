// 무빙툰 자막 작성 AI (관리자 전용). OpenAI가 메인, 실패하면 Claude로 한 번 더 시도한다.
// 필요한 설정: Secret ANTHROPIC_API_KEY, OPENAI_API_KEY (둘 중 있는 것만 써도 됨), ADMIN_PASSWORD
// 선택 변수: ANTHROPIC_MODEL (기본 claude-sonnet-5-5), OPENAI_MODEL (기본 gpt-6.1-sol), AI_DAILY_LIMIT (하루 호출 한도, 기본 300)
//
// POST /api/ai  { task, n?, tone?, ...작업별 값 } → { ok, provider, model, lines: [...], attempts: [...] }
//   task "script": 클립 조건에 맞는 자막 새로 쓰기   { chapter, title, cond: {항목: "값,값"}, existing? }
//   task "draft" : 대충 쓴 자막 초안을 자막 규칙에 맞게 다듬기 { text, n?(비우면 자동), chapter?, title?, cond? }
//   task "expand": 짧은 초안에 살을 붙여 보충하기 { text, tone?, chapter? }
//   task "split" : 전체 문장을 자막 줄로 나누기      { text }
//   task "polish": 이미 쓴 자막 다듬기              { lines: [...] }  (tone = 다듬는 방향)
//   task "verify-rules": 일괄 규칙 검사(AI·한도 없음)   { items: [{id, headline, summary, detail}] ≤400 } → { results: [{id, verdict, issues}] }
//   task "verify": 모듈 자체 검증(규칙 + 다른 AI)        { category, conds, conditions, headline, summary, detail } → { verdict: pass|revise|fail, issues[], revised? }
//   task "module": 해석 모듈 풀이 작성(촌철살인)    { category, conditions(문장), headline?, summary?, detail?, mode?("new"), tone? } → { module: {headline, summary, detail} }
//
// 폴백 규칙: 시간 초과·네트워크 오류·429·5xx(과부하 529 포함)·형식이 맞지 않는 답이면 다음 서비스로 넘어간다.
// 400/401/403/404 같은 설정·요청 오류는 폴백으로 덮지 않고 그대로 알린다(키·모델 이름 실수를 놓치지 않도록).
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import * as IK from '../_ik.js';
import { loadDomain } from '../_ikstore.js';

const DEFAULT_MODEL = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-6.1-sol' };
const TIMEOUT_MS = 40000;
const MAX_LINES = 12, MAX_LINE_CHARS = 80;

class ProviderError extends Error {
  constructor(provider, message, retryable, status) { super(message); this.provider = provider; this.retryable = retryable; this.status = status; }
}
const retryableStatus = s => s === 408 || s === 429 || s >= 500;

async function failFrom(provider, r) {
  let msg = '';
  try { const d = await r.json(); msg = (d.error && (d.error.message || d.error.type)) || ''; } catch { /* JSON 아님 */ }
  return new ProviderError(provider, `${provider} 오류 ${r.status}${msg ? ': ' + String(msg).slice(0, 200) : ''}`, retryableStatus(r.status), r.status);
}
async function post(provider, url, headers, body) {
  try {
    return await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) { // 네트워크 오류·시간 초과
    throw new ProviderError(provider, `${provider} 연결 실패: ${e && e.name === 'TimeoutError' ? '시간 초과' : (e && e.message) || e}`, true, 0);
  }
}

async function callClaude(env, system, user) {
  const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL.anthropic;
  const r = await post('anthropic', 'https://api.anthropic.com/v1/messages', { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    { model, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] });
  if (!r.ok) throw await failFrom('anthropic', r);
  const d = await r.json();
  return { text: (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), model: d.model || model };
}

async function callOpenAI(env, system, user) {
  const model = env.OPENAI_MODEL || DEFAULT_MODEL.openai;
  const r = await post('openai', 'https://api.openai.com/v1/responses', { authorization: 'Bearer ' + env.OPENAI_API_KEY }, { model, instructions: system, input: user });
  if (!r.ok) throw await failFrom('openai', r);
  const d = await r.json();
  const text = typeof d.output_text === 'string' ? d.output_text
    : (d.output || []).flatMap(o => o.content || []).filter(c => c.type === 'output_text' || c.type === 'text').map(c => c.text).join('');
  return { text, model: d.model || model };
}

// 답에서 { "lines": [...] } 를 꺼낸다. 형식이 틀리면 null.
function parseLines(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let d; try { d = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!d || !Array.isArray(d.lines)) return null;
  const lines = d.lines.map(x => String(x == null ? '' : x).trim().slice(0, MAX_LINE_CHARS)).filter(Boolean).slice(0, MAX_LINES);
  return lines.length ? lines : null;
}

const SYSTEM = `너는 한국어 사주 콘텐츠 "무빙툰"의 작가다. 무빙툰은 동양 판타지풍 짧은 영상이고, 자막이 영상 위에 한 줄씩 나타났다 사라진다.
규칙:
- 한 줄은 공백 포함 12~28자를 기본으로 하고 40자를 넘기지 않는다. 한 줄에 한 호흡만 담는다.
- 차분하고 솔직한 상담체(~습니다·~입니다)로 통일한다. 반말·해요체·신비로운 수사·빈 칭찬을 섞지 않는다. 질문은 내용상 필요한 경우에만 쓴다.
- 길흉을 단정하는 예언, 공포 조장, 의학·법률·투자 조언, 특정 집단 비하는 쓰지 않는다. "~할 수 있습니다", "~하기 쉬운 구조입니다"처럼 적용 조건을 드러낸다.
- 주어진 사주 조건(일간·일지·용신 등)의 전통적 의미(예: 갑목=큰 나무, 정화=촛불)를 비유로 활용하되, 모르는 용어를 지어내지 않는다.
- 사주 조건만으로 실제 재산·체력·가족사·사건을 지어내지 않는다. 가장 약한 오행을 용신으로 간주하지 않는다. 자막을 새로 쓸 때 충분한 줄 수가 있으면 강점 → 그 힘의 부작용 → 주어진 근거와 맞는 보완 방향 → 실천 순으로 잇는다. 근거가 없는 처방은 억지로 채우지 않는다. 다듬기·나누기 작업은 원문 범위만 지킨다.
- 같은 말을 반복하지 않는다. 번호·따옴표·이모지·해시태그는 붙이지 않는다.
출력은 반드시 JSON 한 덩어리만: {"lines":["첫째 줄","둘째 줄"]}  (설명이나 코드블록 없이)`;

// ── 해석 모듈(풀이 문장) 작성: 두루뭉술한 덕담이 아니라 촌철살인으로. 안전 원칙(사건·건강·투자 단정 금지)은 그대로 둔다.
const MODULE_SYSTEM = `너는 한국어 사주 해석 작가다. 목표는 두루뭉술한 덕담이 아니라, 읽는 사람이 "정곡이다" 하고 찔리거나 무릎을 칠 만한 촌철살인의 풀이다.
규칙:
- headline: 한두 문장, 60자 안팎. 한 방이 있어야 한다. 대조·역설·구체적인 행동 묘사로 쓴다. "~한 사람입니다"식의 평범한 요약, 사전 같은 정의는 쓰지 않는다.
- summary: 2~3문장. 이 구조가 만드는 반복 패턴과 그 대가를 구체적인 장면(회의, 연애, 돈 쓸 때, 혼자 있을 때 등)으로 보여 준다.
- detail: 4~6문장. ① 강점이 어떻게 약점이 되는지 ② 이 사람이 자주 쓰는 합리화 한 가지 ③ 바로 해 볼 수 있는 행동 한 가지 순서로 쓴다.
- 쓰지 않는 말: "다양한", "균형", "노력하면", "잠재력", "긍정적", "조화" 같은 빈말, 칭찬으로 분량 채우기, 누구에게나 해당되는 말(바넘 문장).
- 날카롭되 사람을 모욕하지 않는다. 사람이 아니라 "구조와 경향"을 찌른다. "~하기 쉽습니다", "~하는 쪽으로 기웁니다"처럼 적용 조건은 남기되 문장을 흐리지 않는다.
- 질병·사망·사고·이혼·파산 같은 사건 단정, 투자 수익·의학·법률 조언, 특정 집단 비하, 공포 조장은 쓰지 않는다. "반드시·무조건·확정"도 쓰지 않는다.
- 프롬프트에 "참고 DB 자료"가 있으면 그것이 1순위 근거다. 거기 적힌 원리·강점·약점·행동 패턴을 구체적인 장면으로 바꿔 쓰고, DB와 모순되거나 DB에 없는 단정은 하지 않는다.
- 주어진 조건(일간·오행·신강약·카테고리)과 그 전통적 의미(예: 갑목=큰 나무, 정화=촛불)만 근거로 쓴다. 모르는 용어나 실제 사건·재산·가족사는 지어내지 않는다.
- 기존 글에 {dayMasterEl} {yongEl} {el.인성} 같은 치환 자리가 있으면 그대로 살려 쓴다. 합쇼체(~습니다)로 통일하고 이모지·번호·따옴표는 붙이지 않는다.
출력은 반드시 JSON 한 덩어리만: {"headline":"...","summary":"...","detail":"..."}  (설명이나 코드블록 없이)`;
function parseModule(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b <= a) return null;
  let d; try { d = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!d || typeof d.headline !== 'string' || !d.headline.trim()) return null;
  const c = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  return { headline: c(d.headline, 160), summary: c(d.summary, 600), detail: c(d.detail, 1500) };
}

// ── DB(풀이 지식 IK) 참고 자료: 이 모듈의 카테고리·조건과 맞는 항목을 골라 프롬프트 근거로 넣는다. 못 찾거나 DB 오류면 조용히 건너뛴다.
const DB_REFS = 6;
function refScore(it, base, subDomain) {
  const c = it.conditions || {}; let hit = 0, miss = 0;
  for (const k of Object.keys(c)) {
    const a = c[k], b = base[k]; if (!b) continue;
    if (Array.isArray(a) && Array.isArray(b)) { if (a.some(v => b.indexOf(v) >= 0)) hit += 2; else miss++; }
    else if (a && b && typeof a === 'object' && typeof b === 'object') { for (const x of Object.keys(a)) { if (b[x] === undefined) continue; if (b[x] === a[x]) hit += 2; else miss++; } }
  }
  if (miss) return -1; // 조건이 서로 어긋나는 항목은 근거로 쓰지 않는다
  return hit + (it.reviewed ? 2 : 0) + (it.status === 'published' ? 1 : 0) + (subDomain && it.subDomain === subDomain ? 1 : 0) + (it.priority || 0) / 100 + (Object.keys(c).length ? 0 : 0.3) - (/legacy/.test((it.tags || []).join()) ? 1.5 : 0);
}
async function dbRefs(env, b) {
  try {
    if (!env.GLOSSARY_KV) return [];
    const m = IK.fromLegacyModule({ category: String(b.category || ''), conditions: b.conds && typeof b.conds === 'object' ? b.conds : {}, headline: 'x', priority: 0 }, 0); if (!m) return [];
    const list = await loadDomain(kvOf(env), m.domain), base = m.conditions || {};
    return list.filter(it => it && it.status !== 'archived' && !(it.sourceType === 'AI_DRAFT' && !it.reviewed))
      .map(it => ({ it, sc: refScore(it, base, m.subDomain) })).filter(x => x.sc > 0).sort((a, z) => z.sc - a.sc).slice(0, DB_REFS)
      .map(({ it }) => ({ id: it.id, title: it.title, reviewed: !!it.reviewed, status: it.status, text: [it.principle, it.interpretation].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 420),
        strengths: (it.strengths || []).slice(0, 3), risks: (it.risks || []).slice(0, 3), behavior: (it.behaviorPatterns || []).slice(0, 3), actions: (it.actions || []).slice(0, 2) }));
  } catch { return []; }
}
const refBlock = refs => refs.length ? '\n\n참고 DB 자료(검수·관리 중인 풀이 지식. 이 안의 원리와 주장 범위 안에서만 쓰고, 자료에 없는 내용을 단정하지 마라. 문장을 그대로 베끼지 말고 더 날카롭게 재표현하라. 자료끼리 어긋나면 검수 완료·게시된 쪽을 따른다):\n' +
  refs.map((r, i) => (i + 1) + '. [' + r.id + '] ' + r.title + (r.reviewed ? ' (검수 완료)' : ' (검수 전)') + '\n   ' + r.text + (r.strengths.length ? '\n   강점: ' + r.strengths.join(' / ') : '') + (r.risks.length ? '\n   위험·약점: ' + r.risks.join(' / ') : '') +
    (r.behavior.length ? '\n   행동 패턴: ' + r.behavior.join(' / ') : '') + (r.actions.length ? '\n   행동 제안: ' + r.actions.join(' / ') : '')).join('\n') : '\n\n(참고할 DB 자료가 없습니다. 조건과 전통적 의미만으로 쓰되 사실을 지어내지 마라.)';

// ── 모듈 자체 검증: 규칙 검사(확정 표현·남은 {…} 자리) + 다른 AI 의 점검(근거 이탈·바넘 문장·조건 밖 사실·둔한 문장). AI 검증은 "검수 완료"가 아니다 — 사람이 읽고 저장해야 한다.
const VERIFY_SYSTEM = `너는 사주 풀이 문장의 엄격한 검수자다. 주어진 풀이(headline·summary·detail)를 카테고리·적용 조건·참고 DB 자료와 대조해 점검한다. 작성자를 봐주지 마라.
점검 항목(type):
- grounding: DB 자료·적용 조건에 없는 사실·원리·사건을 주장하거나 DB와 모순된다.
- overclaim: 사건·건강·재산·결혼·이혼 등을 단정하거나 공포를 조장한다. 조건 표현(경향·구조) 없이 "~된다"로 확정한다.
- barnum: 누구에게나 해당되는 말이다("노력하면", "균형이 중요", "양면이 있다" 등 빈말 포함).
- dull: 구체적 장면·대가·행동이 없어 두루뭉술하다. 촌철살인이 아니다.
- tone: 사람을 모욕·비하하거나 합쇼체(~습니다)를 깨뜨린다.
- dup: 세 칸(headline·summary·detail)이 같은 말을 반복한다.
판정(verdict): fail = grounding·overclaim 이 하나라도 있다 / revise = 고치면 좋아질 점이 있다(barnum·dull·tone·dup) / pass = 문제가 없다.
issues 는 최대 6개, 각 항목은 {type, quote(문제 문장 일부 40자 이내), why(한 문장), fix(고치는 방향 한 문장)}.
revised 는 verdict 가 fail 또는 revise 일 때만, 문제를 고친 {headline, summary, detail} 을 준다(DB 자료 범위 안에서, 촌철살인 문체 유지). pass 면 null.
출력은 반드시 JSON 한 덩어리만: {"verdict":"pass|revise|fail","issues":[...],"revised":{...}|null}  (설명이나 코드블록 없이)`;
const VERIFY_TYPES = ['grounding', 'overclaim', 'barnum', 'dull', 'tone', 'dup'];
function parseVerify(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b <= a) return null;
  let d; try { d = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!d || !['pass', 'revise', 'fail'].includes(d.verdict)) return null;
  const c = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const issues = (Array.isArray(d.issues) ? d.issues : []).slice(0, 6).map(x => ({ type: VERIFY_TYPES.includes(x && x.type) ? x.type : 'dull', quote: c(x && x.quote, 60), why: c(x && x.why, 200), fix: c(x && x.fix, 200) }));
  const rv = d.revised && typeof d.revised === 'object' && typeof d.revised.headline === 'string' && d.revised.headline.trim() ? { headline: c(d.revised.headline, 160), summary: c(d.revised.summary, 600), detail: c(d.revised.detail, 1500) } : null;
  return { verdict: d.verdict, issues, revised: d.verdict === 'pass' ? null : rv };
}
const BARNUM_RE = /(다양한|균형(이|을|잡)|노력하면|잠재력|긍정적|조화(롭|를)|양면|누구에게나)/;
// 규칙 검사: 확정·위험 표현, 채울 수 없는 {…} 자리. AI 가 놓쳐도 여기서 잡는다.
function ruleIssues(m) {
  const out = [], all = [m.headline, m.summary, m.detail].join(' ');
  const bad = all.match(IK.BANNED_RE); if (bad) out.push({ type: 'overclaim', quote: bad[0], why: '확정적이거나 위험한 표현이 들어 있습니다(규칙 검사).', fix: '"~하기 쉽습니다", "~하는 경향이 있습니다"처럼 조건과 경향으로 바꾸세요.' });
  const left = all.replace(IK.KNOWN_VAR, '').match(/\{[^{}]{1,24}\}/g); if (left) out.push({ type: 'grounding', quote: left[0], why: '엔진이 채울 수 없는 {…} 자리가 남아 있습니다(규칙 검사).', fix: '지원되는 자리({dayMasterEl}, {yongEl} 등)만 쓰거나 문장으로 바꾸세요.' });
  return out;
}

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

// 작업별 사용자 프롬프트. 입력이 잘못되면 문자열 대신 { error } 를 돌려준다.
function buildPrompt(b, refs) {
  const n = Math.max(1, Math.min(MAX_LINES, Math.round(+b.n) || 4)), tone = clip(b.tone, 300).trim();
  const toneLine = tone ? `\n추가 지시(말투·방향): ${tone}` : '';
  if (b.task === 'verify') {
    const h = clip(b.headline, 300).trim(), sm = clip(b.summary, 800).trim(), dt = clip(b.detail, 1800).trim(); if (!h && !sm && !dt) return { error: '검증할 풀이가 비어 있습니다' };
    return `다음 사주 해석 모듈을 점검하라.\n카테고리: ${clip(b.category, 60) || '미정'}\n적용 조건: ${clip(b.conditions, 300).trim() || '(조건 없음: 누구에게나 걸리는 폴백)'}\n\n풀이:\n핵심 문장: ${h || '(없음)'}\n짧은 설명: ${sm || '(없음)'}\n상세 풀이: ${dt || '(없음)'}` + refBlock(refs || []);
  }
  if (b.task === 'module') {
    const cat = clip(b.category, 60) || '미정', cond = clip(b.conditions, 300).trim() || '(조건 없음: 누구에게나 걸리는 폴백)', h = clip(b.headline, 300).trim(), sm = clip(b.summary, 800).trim(), dt = clip(b.detail, 1800).trim();
    const has = h || sm || dt;
    return `다음 사주 해석 모듈의 풀이를 ${has && b.mode !== 'new' ? '더 날카롭게 다시 써라(뜻과 방향은 살리되 두루뭉술한 표현을 걷어내고 구체적 장면과 대가를 넣어라)' : '새로 써라'}.
카테고리: ${cat}
적용 조건: ${cond}` +
      (has ? `

현재 글:
핵심 문장: ${h || '(없음)'}
짧은 설명: ${sm || '(없음)'}
상세 풀이: ${dt || '(없음)'}` : '') + refBlock(refs || []) + toneLine;
  }
  if (b.task === 'script') {
    const cond = b.cond && typeof b.cond === 'object' ? Object.entries(b.cond).slice(0, 10).map(([k, v]) => `- ${clip(k, 20)}: ${clip(v, 80)}`).join('\n') : '';
    const existing = clip(b.existing, 600).trim();
    return `다음 무빙툰 클립의 자막을 ${n}줄로 써라.\n장(章): ${clip(b.chapter, 60) || '미정'}\n클립 제목: ${clip(b.title, 80) || '미정'}\n이 클립이 보여질 사주 조건:\n${cond || '- (조건 없음: 누구에게나 맞는 공통 내용)'}` +
      (existing ? `\n참고용 기존 자막(그대로 베끼지 말고 더 나은 표현으로):\n${existing}` : '') + toneLine;
  }
  if (b.task === 'draft') {
    const text = clip(b.text, 1500).trim(); if (!text) return { error: '다듬을 초안이 비어 있습니다' };
    const fixed = Math.round(+b.n) > 0 ? Math.min(MAX_LINES, Math.round(+b.n)) : 0;
    const cond = b.cond && typeof b.cond === 'object' ? Object.entries(b.cond).slice(0, 10).map(([k, v]) => `- ${clip(k, 20)}: ${clip(v, 80)}`).join('\n') : '';
    const ctx = (b.chapter || b.title || cond) ? `\n\n참고 정보(내용을 새로 지어내는 데 쓰지 말고 어조·소재를 맞추는 데만 써라):\n장(章): ${clip(b.chapter, 60) || '미정'} / 클립 제목: ${clip(b.title, 80) || '미정'}\n사주 조건:\n${cond || '- (조건 없음)'}` : '';
    return `아래는 작가가 대충 써 둔 자막 초안이다. 뜻과 핵심 표현은 살리면서 자막 규칙에 맞게 매끄럽게 다듬어라. 초안에 없는 새로운 사실이나 주장은 덧붙이지 마라. ${fixed ? `줄 수는 정확히 ${fixed}줄로 맞춰라.` : `줄 수는 호흡 단위에 맞게 알아서 정하라(최대 ${MAX_LINES}줄).`}\n\n초안:\n${text}${ctx}` + toneLine;
  }
  if (b.task === 'expand') {
    const text = clip(b.text, 1500).trim(); if (!text) return { error: '보충할 초안이 비어 있습니다' };
    return `아래는 작가가 써 둔 짧은 초안이다. 초안의 뜻과 어조를 유지하면서 비유·감정·한 호흡의 설명을 보태 조금 더 풍성하게 보충해라. 초안에 없는 구체적 사실(수치·사건·예언)은 지어내지 마라. 줄 수는 호흡 단위에 맞게 알아서 정하라(최대 ${MAX_LINES}줄).${clip(b.chapter, 60) ? `\n자막 위치: ${clip(b.chapter, 60)}` : ''}\n\n초안:\n${text}` + toneLine;
  }
  if (b.task === 'split') {
    const text = clip(b.text, 1500).trim(); if (!text) return { error: '나눌 문장이 비어 있습니다' };
    return `아래 글을 자막 줄로 나눠라. 뜻과 표현은 최대한 그대로 두고, 한 호흡 단위로만 끊어라(줄 수 제한 없음, 최대 ${MAX_LINES}줄).\n\n${text}` + toneLine;
  }
  if (b.task === 'polish') {
    const lines = Array.isArray(b.lines) ? b.lines.slice(0, MAX_LINES).map(x => clip(x, 120).trim()).filter(Boolean) : [];
    if (!lines.length) return { error: '다듬을 자막이 비어 있습니다' };
    return `아래 자막을 같은 줄 수(${lines.length}줄)로 다듬어라. 의미는 유지하고 문장을 더 자연스럽고 매끄럽게 하라.\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}` + toneLine;
  }
  return { error: '알 수 없는 작업입니다' };
}

// 하루 호출 한도 (KV가 있을 때만). 남용·키 노출 시 요금이 새는 것을 막는다.
async function overLimit(env) {
  if (!env.GLOSSARY_KV) return false;
  const kv = kvOf(env), key = 'ai:usage:' + new Date().toISOString().slice(0, 10), used = +(await kv.get(key)) || 0, limit = +env.AI_DAILY_LIMIT || 300;
  if (used >= limit) return true;
  await kv.put(key, String(used + 1), { expirationTtl: 172800 });
  return false;
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (b && b.task === 'verify-rules') { // 일괄 규칙 검사: AI 호출 없음 · 하루 한도에 포함되지 않음. 한 번에 최대 400개
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 400), res = items.map(x => {
      x = x && typeof x === 'object' ? x : {};
      const m = { headline: clip(x.headline, 300), summary: clip(x.summary, 800), detail: clip(x.detail, 1800) }, issues = ruleIssues(m), all = [m.headline, m.summary, m.detail].join(' ');
      const bn = all.match(BARNUM_RE); if (bn) issues.push({ type: 'barnum', quote: bn[0], why: '누구에게나 해당되는 빈말일 수 있습니다(규칙 검사).', fix: '구체적 장면·대가·행동으로 바꾸세요.' });
      if (!m.headline.trim() || !m.summary.trim()) issues.push({ type: 'dull', quote: '', why: '핵심 문장 또는 짧은 설명이 비어 있습니다.', fix: '두 칸을 채우세요.' });
      else if (m.summary.trim().length < 25) issues.push({ type: 'dull', quote: m.summary.trim().slice(0, 30), why: '짧은 설명이 너무 짧아 구체성이 부족합니다.', fix: '장면과 대가가 보이게 2~3문장으로 쓰세요.' });
      const verdict = issues.some(i => i.type === 'overclaim' || i.type === 'grounding') ? 'fail' : issues.length ? 'revise' : 'pass';
      return { id: clip(x.id, 80), verdict, issues };
    });
    return json({ ok: true, results: res, count: res.length });
  }
  const refs = b && (b.task === 'module' || b.task === 'verify') ? await dbRefs(env, b) : [];
  const prompt = buildPrompt(b || {}, refs);
  if (typeof prompt !== 'string') return json({ error: prompt.error }, 400);

  const order = [];
  if (env.OPENAI_API_KEY) order.push(['openai', callOpenAI]);
  if (env.ANTHROPIC_API_KEY) order.push(['anthropic', callClaude]);
  if (b && b.task === 'verify') order.reverse(); // 작성(OpenAI 우선)과 다른 모델이 점검하도록 Claude 를 먼저 쓴다
  if (!order.length) return json({ error: 'AI 키가 없습니다. OPENAI_API_KEY(메인) 또는 ANTHROPIC_API_KEY(폴백)를 Secret으로 추가한 뒤 다시 배포하세요' }, 501);
  if (await overLimit(env)) return json({ error: `오늘 AI 호출 한도(${+env.AI_DAILY_LIMIT || 300}회)를 넘었습니다. 내일 다시 시도하거나 AI_DAILY_LIMIT을 올리세요` }, 429);

  const isMod = b.task === 'module', isVer = b.task === 'verify', system = isVer ? VERIFY_SYSTEM : isMod ? MODULE_SYSTEM : SYSTEM, attempts = [];
  for (const [name, fn] of order) {
    try {
      const r = await fn(env, system, prompt), lines = isVer ? parseVerify(r.text) : isMod ? parseModule(r.text) : parseLines(r.text);
      if (!lines) throw new ProviderError(name, `${name} 답이 요청한 형식(${isVer ? 'JSON verdict/issues/revised' : isMod ? 'JSON headline/summary/detail' : 'JSON lines'})이 아닙니다`, true, 200);
      attempts.push({ provider: name, ok: true });
      if (isVer) { // 규칙 검사 결과를 합친다. 규칙에서 걸리면 AI 가 pass 라도 fail/revise 로 올린다.
        const ri = ruleIssues({ headline: clip(b.headline, 300), summary: clip(b.summary, 800), detail: clip(b.detail, 1800) }), v = lines;
        const verdict = ri.some(x => x.type === 'overclaim' || x.type === 'grounding') ? 'fail' : v.verdict;
        return json({ ok: true, provider: name, model: r.model, verdict, issues: ri.concat(v.issues).slice(0, 8), revised: verdict === 'pass' ? null : v.revised, refs: refs.map(x => ({ id: x.id, title: x.title, reviewed: x.reviewed })), attempts });
      }
      return json(isMod ? { ok: true, provider: name, model: r.model, module: lines, refs: refs.map(x => ({ id: x.id, title: x.title, reviewed: x.reviewed })), attempts } : { ok: true, provider: name, model: r.model, lines, attempts });
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError(name, `${name}: ${(e && e.message) || e}`, false, 0);
      attempts.push({ provider: name, ok: false, error: err.message, status: err.status });
      if (!err.retryable) return json({ error: err.message, attempts }, err.status >= 400 && err.status < 500 ? 502 : 500); // 설정·요청 오류는 폴백하지 않는다
    }
  }
  return json({ error: '모든 AI 서비스가 실패했습니다: ' + attempts.map(a => a.error).join(' / '), attempts }, 502);
}
