// 주역 점괘 — 사용자용 공개 API. 설계: docs/ICHING_REVIEW_ADMIN_DESIGN.md · 관리자 검수·게시는 /api/iching-review.
//   GET  ?a=status   → { open, categories }  서비스 개방 여부(관리자가 64괘 전체를 승인·게시한 뒤 켠다)
//   POST ?a=detail    { …interpret 와 같은 입력, consent:true } → { detail }  AI 보충 풀이(관리자가 켠 경우만, 동의·횟수 제한·검증 필요)
//   POST ?a=interpret { question, category, values:[6개 효 값 6·7·8·9], saju? } → { result }  게시된 문구로 8개 섹션 조합
// 개방 전에는 403 { error:'not-open' }. 질문·결과는 서버에 저장하지 않는다. 인증이 없는 공개 경로라 응답은 모두 no-store.
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { openState, interpret } from '../_iching-public.js';
import { aiPublicState, detail } from '../_iching-ai.js';

const reply = r => json(r, r && r.status ? r.status : 200);

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ open: false, categories: [] });
  try { const kv = kvOf(env), s = await openState(kv); return json({ ...s, ai: await aiPublicState(kv, env) }); } catch (e) { return json({ open: false, categories: [] }); }
}

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ ok: false, error: 'not-open' }, 403);
  let b; try { const raw = await request.text(); if (raw.length > 20000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const a = new URL(request.url).searchParams.get('a') || 'interpret';
  try { if (a === 'detail') return reply(await detail(kvOf(env), env, b, { ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '' })); return reply(await interpret(kvOf(env), b)); } catch (e) { return json({ ok: false, error: 'server-error' }, 500); }
}
