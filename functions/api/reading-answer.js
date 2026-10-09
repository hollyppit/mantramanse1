// 공개 POST /api/reading-answer — 선택에 대한 추가 풀이. OpenAI 우선 → Claude 폴백.
// Secrets: OPENAI_API_KEY / ANTHROPIC_API_KEY. 기존 모델 변수 사용. 캐시 7일, IP 시간당 기본 12회.
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { validate, SYSTEM, buildUser, sanitize, cacheKey } from '../_reading-answer.js';
const TIMEOUT_MS = 25000;
async function openai(env, input) {
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: SYSTEM, input, max_output_tokens: 2200 }) });
  if (!r.ok) throw new Error('provider-error');
  const d = await r.json(); return typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).filter(c => c.type === 'output_text' || c.type === 'text').map(c => c.text || '').join('');
}
async function claude(env, input) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 2200, system: SYSTEM, messages: [{ role: 'user', content: input }] }) });
  if (!r.ok) throw new Error('provider-error');
  const d = await r.json(); return (d.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('');
}
async function overLimit(kv, env, request) {
  if (!kv) return false;
  const hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10), ip = request.headers.get('cf-connecting-ip') || 'local';
  const hk = 'rl:reading-answer:' + ip + ':' + hour, dk = 'rl:reading-answer:day:' + day;
  const [h, d] = await Promise.all([kv.get(hk), kv.get(dk)]);
  if ((+h || 0) >= (+env.READING_ANSWER_HOURLY_LIMIT || 12) || (+d || 0) >= (+env.READING_ANSWER_DAILY_LIMIT || 2000)) return true;
  await Promise.all([kv.put(hk, String((+h || 0) + 1), { expirationTtl: 7200 }), kv.put(dk, String((+d || 0) + 1), { expirationTtl: 172800 })]); return false;
}
export async function onRequestPost({ request, env }) {
  let b; try { const raw = await request.text(); if (raw.length > 12000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  const clean = validate(b); if (!clean) return json({ ok: false, error: 'bad-payload' }, 400);
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'no-ai' }, 503);
  // 저장소 오류가 나면 AI 호출을 중단하고, 클라이언트는 기존 본문을 계속 읽는다.
  let kv, key;
  try {
    kv = kvOf(env, { cache: true }); key = await cacheKey(clean);
    if (kv) { const hit = await kv.get(key, 'json'); if (hit && sanitize(JSON.stringify(hit.result), clean)) return json({ ok: true, result: hit.result, cached: true, provider: hit.provider }); }
    if (await overLimit(kv, env, request)) return json({ ok: false, error: 'rate-limited' }, 429);
  } catch { return json({ ok: false, error: 'temporarily-unavailable' }, 503); }
  const input = buildUser(clean);
  for (const [provider, fn, secret] of [['openai', openai, 'OPENAI_API_KEY'], ['anthropic', claude, 'ANTHROPIC_API_KEY']]) {
    if (!env[secret]) continue;
    try {
      const result = sanitize(await fn(env, input), clean); if (!result) continue;
      if (kv) { try { await kv.put(key, JSON.stringify({ result, provider }), { expirationTtl: 604800 }); } catch { /* 답변은 저장 실패와 무관하게 반환 */ } }
      return json({ ok: true, result, cached: false, provider });
    } catch { /* 오류·시간 초과·형식 오류는 다음 공급자로 */ }
  }
  return json({ ok: false, error: 'ai-unavailable' }, 502);
}