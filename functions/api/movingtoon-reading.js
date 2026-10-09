import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadAll, blockedDocs, meta } from '../_ikstore.js';
import { VERSION, SYSTEM, validate, sources, sanitize } from '../_movingtoon-reading.js';
async function generate(env, provider, input) {
  const isOpen = provider === 'openai';
  const body = isOpen ? { model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: SYSTEM, input, max_output_tokens: 14000 } : { model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 14000, system: SYSTEM, messages: [{ role: 'user', content: input }] };
  const headers = isOpen ? { authorization: 'Bearer ' + env.OPENAI_API_KEY } : { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' };
  const r = await fetch(isOpen ? 'https://api.openai.com/v1/responses' : 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(40000), headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw Error('provider');
  const d = await r.json();
  return isOpen ? d.output_text || (d.output || []).flatMap(x => x.content || []).map(x => x.text || '').join('') : (d.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
}
export async function onRequestPost({ request, env }) {
  let clean;
  try { const raw = await request.text(); if (raw.length > 160000) return json({ ok: false, error: 'too-large' }, 413); clean = validate(JSON.parse(raw)); } catch { }
  if (!clean) return json({ ok: false, error: 'bad-payload' }, 400);
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'no-ai' }, 503);
  let kv, key, src;
  try {
    kv = kvOf(env, { cache: true });
    const [items, blocked, version] = kv ? await Promise.all([loadAll(kv), blockedDocs(kv), meta(kv)]) : [[], new Set(), {}];
    src = sources(items, clean.sd, blocked, clean.chapter);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ version: VERSION, db: version, clean, models: [env.OPENAI_MODEL, env.ANTHROPIC_MODEL] })));
    key = 'ai:movingtoon:' + [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (kv) {
      const hit = await kv.get(key, 'json');
      if (hit && sanitize(JSON.stringify(hit.result), clean, src)) return json({ ok: true, ...hit, cached: true });
      const hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10), ip = request.headers.get('cf-connecting-ip') || 'local';
      const hk = 'rl:movingtoon:' + ip + ':' + hour, dk = 'rl:movingtoon:day:' + day;
      const [h, d] = await Promise.all([kv.get(hk), kv.get(dk)]);
      if ((+h || 0) >= (+env.MOVINGTOON_HOURLY_LIMIT || 100) || (+d || 0) >= (+env.MOVINGTOON_DAILY_LIMIT || 6000)) return json({ ok: false, error: 'rate-limited' }, 429);
      await Promise.all([kv.put(hk, String((+h || 0) + 1), { expirationTtl: 7200 }), kv.put(dk, String((+d || 0) + 1), { expirationTtl: 172800 })]);
    }
  } catch { return json({ ok: false, error: 'storage-unavailable' }, 503); }
  const input = JSON.stringify({ ...src, chapter: clean.chapter, outline: clean.outline });
  for (const [provider, secret] of [['openai', 'OPENAI_API_KEY'], ['anthropic', 'ANTHROPIC_API_KEY']]) {
    if (!env[secret]) continue;
    try {
      const result = sanitize(await generate(env, provider, input), clean, src); if (!result) continue;
      const value = { result, provider, knowledgeCount: src.knowledge.length };
      if (kv) { try { await kv.put(key, JSON.stringify(value), { expirationTtl: 604800 }); } catch { } }
      return json({ ok: true, ...value, cached: false });
    } catch { }
  }
  return json({ ok: false, error: 'ai-unavailable' }, 502);
}
