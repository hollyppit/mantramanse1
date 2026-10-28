// 주역 점괘 — 사용자용 공개 API. 설계: docs/ICHING_REVIEW_ADMIN_DESIGN.md · 관리자 검수·게시는 /api/iching-review.
//   GET  ?a=status   → { open, categories }  서비스 개방 여부(관리자가 64괘 전체를 승인·게시한 뒤 켠다)
//   POST ?a=interpret { question, category, values:[6개 효 값 6·7·8·9], saju? } → { result }  게시된 문구로 8개 섹션 조합
// 개방 전에는 403 { error:'not-open' }. 질문·결과는 서버에 저장하지 않는다. 인증이 없는 공개 경로라 응답은 모두 no-store.
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { openState, interpret } from '../_iching-public.js';

const reply = r => json(r, r && r.status ? r.status : 200);

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ open: false, categories: [] });
  try { return json(await openState(kvOf(env))); } catch (e) { return json({ open: false, categories: [] }); }
}

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ ok: false, error: 'not-open' }, 403);
  let b; try { const raw = await request.text(); if (raw.length > 20000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  try { return reply(await interpret(kvOf(env), b)); } catch (e) { return json({ ok: false, error: 'server-error' }, 500); }
}
