// 인연의 광장 좋아요·북마크. POST { post, kind:'like'|'bookmark', on:true|false } → { ok, on, likes }
//   좋아요 수는 DB 트리거가 맞춘다(supabase/migrations/20261116_plaza_stage3.sql). 제재 중이어도 북마크는 된다(남에게 보이지 않음)
import { json, sbRest, supabaseReady, viewer, writer, okId, readBody } from '../../_plaza.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const b = await readBody(request); if (!b || !okId(b.post) || !['like', 'bookmark'].includes(b.kind) || typeof b.on !== 'boolean') return json({ error: '잘못된 요청입니다' }, 400);
  let uid;
  if (b.kind === 'like') { const w = await writer(request, env); if (w.res) return w.res; uid = w.member.id; }
  else { const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401); uid = me.id; }
  const p = await sbRest(env, `cm_posts?id=eq.${b.post}&status=eq.visible&select=id,author_id`);
  if (!Array.isArray(p) || !p[0]) return json({ error: '삭제되었거나 볼 수 없는 글입니다' }, 404);
  if (b.kind === 'like' && p[0].author_id === uid) return json({ error: '내 글에는 좋아요를 누를 수 없습니다' }, 400);
  const key = `cm_reactions?user_id=eq.${encodeURIComponent(uid)}&post_id=eq.${b.post}&kind=eq.${b.kind}`;
  const had = await sbRest(env, key + '&select=post_id');
  if (b.on && !(Array.isArray(had) && had.length)) await sbRest(env, 'cm_reactions?on_conflict=user_id,post_id,kind', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, post_id: +b.post, kind: b.kind }) });
  if (!b.on && Array.isArray(had) && had.length) await sbRest(env, key, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
  const now = await sbRest(env, `cm_posts?id=eq.${b.post}&select=like_count`);
  return json({ ok: true, on: b.on, likes: Array.isArray(now) && now[0] ? now[0].like_count : null });
}
