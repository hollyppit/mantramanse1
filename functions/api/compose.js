// AI Composer (공개 엔드포인트). 리포트의 이미 선택된 해석 문장을 매끄럽게 잇고 미디어 후보 중에서 고른다. AI 는 선택 기능이며, 실패하면 { ok:false } 만 돌려주고 클라이언트는 원본 문장으로 계속한다.
// POST /api/compose  { payload: ReportV2.Compose.aiPayload(rep), media: ReportV2.Compose.mediaPayload(rep, lib) } → { ok, result:{chapters:[{id,headline?,lead?}], media:{sceneId:assetId}}, cached }
// 보내는 데이터에는 생년월일·이름이 없다(해석 문장과 계산 근거 요약만).
// 같은 입력은 KV 에 캐시되어(30일) 같은 결과가 나온다. 남용 방지: IP 당 시간당 호출 수 + 하루 전체 한도.
// 필요한 설정: Secret OPENAI_API_KEY(메인) / ANTHROPIC_API_KEY(폴백), KV GLOSSARY_KV. 선택: ANTHROPIC_MODEL, OPENAI_MODEL, COMPOSE_HOURLY_LIMIT(기본 12), COMPOSE_DAILY_LIMIT(기본 3000)
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { runCompose } from '../_compose.js';

const TIMEOUT_MS = 30000;
async function claude(env, system, user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 3500, system, messages: [{ role: 'user', content: user }] }) });
  if (!r.ok) throw new Error('anthropic ' + r.status);
  const d = await r.json(); return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}
async function openai(env, system, user) {
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: system, input: user }) });
  if (!r.ok) throw new Error('openai ' + r.status);
  const d = await r.json(); return typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join('');
}

async function overLimit(env, request) {
  if (!env.GLOSSARY_KV) return false;
  const ip = request.headers.get('cf-connecting-ip') || 'x', hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10);
  const hk = 'rl:compose:' + ip + ':' + hour, dk = 'rl:compose:day:' + day;
  const kv = kvOf(env), [h, d] = await Promise.all([kv.get(hk), kv.get(dk)]);
  if ((+h || 0) >= (+env.COMPOSE_HOURLY_LIMIT || 12) || (+d || 0) >= (+env.COMPOSE_DAILY_LIMIT || 3000)) return true;
  await Promise.all([kv.put(hk, String((+h || 0) + 1), { expirationTtl: 7200 }), kv.put(dk, String((+d || 0) + 1), { expirationTtl: 172800 })]);
  return false;
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) return json({ ok: false, error: 'no-ai' });
  let body; try { if (+request.headers.get('content-length') > 40 * 1024) return json({ ok: false, error: 'too-large' }, 413); body = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  const kv = kvOf(env), ttl = { expirationTtl: 60 * 60 * 24 * 30 };
  const llm = async (system, user) => {
    if (await overLimit(env, request)) throw new Error('rate-limited'); // 캐시 적중은 한도에 포함하지 않는다(llm 호출 직전에만 센다)
    const errs = [];
    for (const [name, fn] of [['openai', openai], ['anthropic', claude]]) { if (!env[name === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY']) continue; try { return await fn(env, system, user); } catch (e) { errs.push(e.message); } }
    throw new Error(errs.join(' / ') || 'no-provider');
  };
  const r = await runCompose(body, { kvGet: kv ? k => kv.get(k, 'json') : null, kvPut: kv ? (k, v) => kv.put(k, JSON.stringify(v), ttl) : null, llm });
  return json(r.ok ? r : { ok: false, error: r.error }, 200);
}
