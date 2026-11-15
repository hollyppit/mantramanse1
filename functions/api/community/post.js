// 인연의 광장 글 하나. 공용: functions/_plaza.js
// GET    ?id=  → { post:{ id, category, title, body, tags, group, likes, comments, at, edited, author, liked, saved } }
//        숨김·삭제된 글, 내가 차단한 회원의 글은 404(관리자는 볼 수 있음)
// PATCH  { id, title, body, category, tags } → 본인 글만, 모임은 바꾸지 않는다
// DELETE ?id=  → 본인 글을 지운다(status=deleted, 댓글은 함께 보이지 않음)
import { json, isAdmin, sbRest, supabaseReady, viewer, writer, blockedIds, authorsOf, authorView, okId, readBody, CATS } from '../../_plaza.js';
import { checkPost } from './posts.js';

const enc = encodeURIComponent;
const one = async (env, id) => { const r = await sbRest(env, `cm_posts?id=eq.${id}&select=*`); return Array.isArray(r) ? r[0] || null : null; };

export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 글을 불러올 수 없습니다' }, 503);
  const id = new URL(request.url).searchParams.get('id'); if (!okId(id)) return json({ error: '글을 찾을 수 없습니다' }, 404);
  const p = await one(env, id), admin = isAdmin(request, env);
  const me = await viewer(request, env), myId = me && me.id;
  if (!p || (p.status !== 'visible' && !admin)) return json({ error: '삭제되었거나 볼 수 없는 글입니다' }, 404);
  if (p.author_id && (await blockedIds(env, myId)).includes(p.author_id)) return json({ error: '차단한 회원의 글입니다', blocked: true }, 404);
  const authors = await authorsOf(env, [p.author_id]);
  let liked = false, saved = false;
  if (myId) { const rx = (await sbRest(env, `cm_reactions?user_id=eq.${enc(myId)}&post_id=eq.${p.id}&select=kind`)) || []; liked = rx.some(x => x.kind === 'like'); saved = rx.some(x => x.kind === 'bookmark'); }
  return json({ post: { id: p.id, category: p.category, catLabel: CATS[p.category], title: p.title, body: p.body, tags: p.hashtags || [], group: p.group_kind ? { kind: p.group_kind, key: p.group_key } : null, likes: p.like_count, comments: p.comment_count, at: p.created_at, edited: !!p.edited_at, status: admin ? p.status : undefined, author: authorView(authors, p.author_id, myId), liked, saved } });
}

export async function onRequestPatch({ request, env }) {
  const w = await writer(request, env); if (w.res) return w.res;
  const b = await readBody(request); if (!b || !okId(b.id)) return json({ error: '잘못된 요청입니다' }, 400);
  const p = await one(env, b.id);
  if (!p || p.status !== 'visible') return json({ error: '삭제되었거나 볼 수 없는 글입니다' }, 404);
  if (p.author_id !== w.member.id) return json({ error: '내가 쓴 글만 고칠 수 있습니다' }, 403);
  const c = checkPost({ ...b, group: null }, w.profile); if (c.error) return json({ error: c.error }, 400);
  const { group_kind, group_key, ...row } = c.row;
  await sbRest(env, `cm_posts?id=eq.${p.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ ...row, edited_at: new Date().toISOString() }) });
  return json({ ok: true, id: p.id });
}

export async function onRequestDelete({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 지울 수 없습니다' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const id = new URL(request.url).searchParams.get('id'); if (!okId(id)) return json({ error: '잘못된 요청입니다' }, 400);
  const p = await one(env, id);
  if (!p || p.status === 'deleted') return json({ ok: true });
  if (p.author_id !== me.id) return json({ error: '내가 쓴 글만 지울 수 있습니다' }, 403);
  await sbRest(env, `cm_posts?id=eq.${p.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted' }) });
  return json({ ok: true });
}
