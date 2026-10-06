// 무빙툰 자막 작성 AI (관리자 전용). Claude가 메인, 실패하면 GPT(OpenAI)로 한 번 더 시도한다.
// 필요한 설정: Secret ANTHROPIC_API_KEY, OPENAI_API_KEY (둘 중 있는 것만 써도 됨), ADMIN_PASSWORD
// 선택 변수: ANTHROPIC_MODEL (기본 claude-sonnet-5-5), OPENAI_MODEL (기본 gpt-6.1-sol), AI_DAILY_LIMIT (하루 호출 한도, 기본 300)
//
// POST /api/ai  { task, n?, tone?, ...작업별 값 } → { ok, provider, model, lines: [...], attempts: [...] }
//   task "script": 클립 조건에 맞는 자막 새로 쓰기   { chapter, title, cond: {항목: "값,값"}, existing? }
//   task "draft" : 대충 쓴 자막 초안을 자막 규칙에 맞게 다듬기 { text, n?(비우면 자동), chapter?, title?, cond? }
//   task "expand": 짧은 초안에 살을 붙여 보충하기 { text, tone?, chapter? }
//   task "split" : 전체 문장을 자막 줄로 나누기      { text }
//   task "polish": 이미 쓴 자막 다듬기              { lines: [...] }  (tone = 다듬는 방향)
//
// 폴백 규칙: 시간 초과·네트워크 오류·429·5xx(과부하 529 포함)·형식이 맞지 않는 답이면 다음 서비스로 넘어간다.
// 400/401/403/404 같은 설정·요청 오류는 폴백으로 덮지 않고 그대로 알린다(키·모델 이름 실수를 놓치지 않도록).
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';

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
- 따뜻하고 신비로운 문체로 쓰되, 질문이나 의문문을 한두 번 섞어 시청자가 이어서 보게 만든다.
- 길흉을 단정하는 예언, 공포 조장, 의학·법률·투자 조언, 특정 집단 비하는 쓰지 않는다. "~할 수 있어요", "~한 기질이에요"처럼 경향으로 말한다.
- 주어진 사주 조건(일간·일지·용신 등)의 전통적 의미(예: 갑목=큰 나무, 정화=촛불)를 비유로 활용하되, 모르는 용어를 지어내지 않는다.
- 같은 말을 반복하지 않는다. 번호·따옴표·이모지·해시태그는 붙이지 않는다.
출력은 반드시 JSON 한 덩어리만: {"lines":["첫째 줄","둘째 줄"]}  (설명이나 코드블록 없이)`;

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

// 작업별 사용자 프롬프트. 입력이 잘못되면 문자열 대신 { error } 를 돌려준다.
function buildPrompt(b) {
  const n = Math.max(1, Math.min(MAX_LINES, Math.round(+b.n) || 4)), tone = clip(b.tone, 300).trim();
  const toneLine = tone ? `\n추가 지시(말투·방향): ${tone}` : '';
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
  const prompt = buildPrompt(b || {});
  if (typeof prompt !== 'string') return json({ error: prompt.error }, 400);

  const order = [];
  if (env.ANTHROPIC_API_KEY) order.push(['anthropic', callClaude]);
  if (env.OPENAI_API_KEY) order.push(['openai', callOpenAI]);
  if (!order.length) return json({ error: 'AI 키가 없습니다. ANTHROPIC_API_KEY(메인) 또는 OPENAI_API_KEY(폴백)를 Secret으로 추가한 뒤 다시 배포하세요' }, 501);
  if (await overLimit(env)) return json({ error: `오늘 AI 호출 한도(${+env.AI_DAILY_LIMIT || 300}회)를 넘었습니다. 내일 다시 시도하거나 AI_DAILY_LIMIT을 올리세요` }, 429);

  const attempts = [];
  for (const [name, fn] of order) {
    try {
      const r = await fn(env, SYSTEM, prompt), lines = parseLines(r.text);
      if (!lines) throw new ProviderError(name, `${name} 답이 요청한 형식(JSON lines)이 아닙니다`, true, 200);
      attempts.push({ provider: name, ok: true });
      return json({ ok: true, provider: name, model: r.model, lines, attempts });
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError(name, `${name}: ${(e && e.message) || e}`, false, 0);
      attempts.push({ provider: name, ok: false, error: err.message, status: err.status });
      if (!err.retryable) return json({ error: err.message, attempts }, err.status >= 400 && err.status < 500 ? 502 : 500); // 설정·요청 오류는 폴백하지 않는다
    }
  }
  return json({ error: '모든 AI 서비스가 실패했습니다: ' + attempts.map(a => a.error).join(' / '), attempts }, 502);
}
