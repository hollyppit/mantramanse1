// 깊이 읽기 AI — 사용자용 공개 API (주제별 풀이 끝의 "마지막 질문" 카드).
//   GET  ?a=status&device=…  → { tarot:{enabled}, iching:{ai}, left, limit }  타로 탭·AI 버튼을 보일지, 오늘 남은 깊이 읽기 횟수
//   POST ?a=tarot { mode, spread, picks:[{id,rev}], question?, saju?, device, consent:true } → { detail, quota }  타로 깊이 읽기(AI)
// 주역 AI 상세 풀이는 /api/iching?a=detail 이며, 같은 하루 횟수(_deep-quota.js)를 함께 쓴다. 질문·결과는 서버에 저장하지 않는다. 응답은 모두 no-store.
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadDeepConfig, providerOf, remaining } from '../_deep-quota.js';
import { tarotDetail } from '../_tarot-deep.js';

const reply = r => json(r, r && r.status ? r.status : 200);
const ipOf = request => request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';

export async function onRequestGet({ request, env }) {
  const off = { tarot: { enabled: false }, iching: { ai: false }, left: 0, limit: 0 };
  if (!env.GLOSSARY_KV) return json(off);
  try {
    const kv = kvOf(env), cfg = await loadDeepConfig(kv), p = !!providerOf(env), dev = new URL(request.url).searchParams.get('device') || '';
    const q = await remaining(kv, cfg, { ip: ipOf(request), device: dev });
    return json({ tarot: { enabled: !!cfg.tarotEnabled && p }, iching: { ai: !!cfg.enabled && p }, left: q.left, limit: q.limit });
  } catch (e) { return json(off); }
}

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ ok: false, error: 'ai-off' }, 403);
  let b; try { const raw = await request.text(); if (raw.length > 20000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const a = new URL(request.url).searchParams.get('a') || '';
  if (a !== 'tarot') return json({ ok: false, error: 'bad-action' }, 400);
  try { return reply(await tarotDetail(kvOf(env), env, b, { ip: ipOf(request), device: b.device })); } catch (e) { return json({ ok: false, error: 'server-error' }, 500); }
}
