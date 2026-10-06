// 인생 지도 AI 추정(공개 엔드포인트): 인간관계 · 결혼(인연) 시기 활성도. 엔진에 전용 모델이 없는 두 분야만 AI 가 추정한다.
// POST /api/life-ai  { gender, natal:{pillars,strength,dayBranchTG}, decades:[{a,g,s,b,r}], years:[{y,a,g,s,b,r}] } → { ok, result:{relation,marriage}, cached, source:'ai' }
// 보내는 데이터에는 생년월일·이름이 없다(간지·십성·합충 요약만). 같은 입력은 KV 에 30일 캐시. 실패하면 { ok:false } — 클라이언트가 규칙 추정을 그대로 쓴다.
// 설정: Secret ANTHROPIC_API_KEY(메인) / OPENAI_API_KEY(폴백), KV GLOSSARY_KV. 선택: ANTHROPIC_MODEL, OPENAI_MODEL, LIFEAI_HOURLY_LIMIT(기본 6), LIFEAI_DAILY_LIMIT(기본 2000)
import { json } from '../_lib.js';
import { validate, SYSTEM, buildUser, sanitize, cacheKey } from '../_lifeai.js';

const TIMEOUT_MS = 30000;
async function claude(env, system, user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 3500, temperature: 0.2, system, messages: [{ role: 'user', content: user }] }) });
  if (!r.ok) throw new Error('anthropic ' + r.status);
  const d = await r.json(); return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}
async function openai(env, system, user) {
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
    body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4.1', instructions: system, input: user, max_output_tokens: 3500 }) });
  if (!r.ok) throw new Error('openai ' + r.status);
  const d = await r.json(); return typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join('');
}
async function overLimit(env, request) {
  if (!env.GLOSSARY_KV) return false;
  const ip = request.headers.get('cf-connecting-ip') || 'x', hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10), hk = 'rl:lifeai:' + ip + ':' + hour, dk = 'rl:lifeai:day:' + day;
  const [h, d] = await Promise.all([env.GLOSSARY_KV.get(hk), env.GLOSSARY_KV.get(dk)]);
  if ((+h || 0) >= (+env.LIFEAI_HOURLY_LIMIT || 6) || (+d || 0) >= (+env.LIFEAI_DAILY_LIMIT || 2000)) return true;
  await Promise.all([env.GLOSSARY_KV.put(hk, String((+h || 0) + 1), { expirationTtl: 7200 }), env.GLOSSARY_KV.put(dk, String((+d || 0) + 1), { expirationTtl: 172800 })]);
  return false;
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) return json({ ok: false, error: 'no-ai' });
  let body; try { if (+request.headers.get('content-length') > 40 * 1024) return json({ ok: false, error: 'too-large' }, 413); body = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  const clean = validate(body); if (!clean) return json({ ok: false, error: 'bad-payload' }, 400);
  const kv = env.GLOSSARY_KV, key = await cacheKey(clean), nowYear = new Date().getUTCFullYear();
  if (kv) { const hit = await kv.get(key, 'json'); if (hit) return json({ ok: true, result: hit, cached: true, source: 'ai' }); }
  if (await overLimit(env, request)) return json({ ok: false, error: 'rate-limited' });
  const user = buildUser(clean, nowYear), errs = []; let result = null;
  for (const [name, fn] of [['anthropic', claude], ['openai', openai]]) {
    if (!env[name === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY']) continue;
    try { result = sanitize(await fn(env, SYSTEM, user), clean, nowYear); if (result) break; errs.push(name + ' bad-output'); } catch (e) { errs.push(e.message); }
  }
  if (!result) return json({ ok: false, error: errs.join(' / ') || 'no-result' });
  if (kv) await kv.put(key, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 30 });
  return json({ ok: true, result, cached: false, source: 'ai' });
}
