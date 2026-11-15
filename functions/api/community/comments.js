// 운명의 광장 댓글·답글(한 단계까지). 공용: functions/_plaza.js
// GET    ?post=  → { items:[{ id, parent, body, at, author, deleted }] } — 지워진 댓글은 답글이 있을 때만 '삭제된 댓글입니다'로 자리만 남긴다
// POST   { post, parent?, body } → 쓰기 조건 + 하루 60개 + 내용 검사. 답글의 답글은 같은 댓글 아래로 붙인다
// DELETE ?id=  → 본인 댓글 지우기
import { json, sbRest, supabaseReady, viewer, writer, blockedIds, authorsOf, authorView, badText, overLimit, okId, readBody } from '../../_plaza.js';

const postOk = async (env, id) => { const r = await sbRest(env, `cm_posts?id=eq.${id}&status=eq.visible&select=id,author_id`); return Array.isArray(r) ? r[0] || null : null; };

export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 댓글을 불러올 수 없습니다' }, 503);
  const id = new URL(request.url).searchParams.get('post'); if (!okId(id)) return json({ items: [] });
  if (!(await postOk(env, id))) return json({ error: '삭제되었거나 볼 수 없는 글입니다' }, 404);
  const me = await viewer(request, env), myId = me && me.id, blocked = new Set(await blockedIds(env, myId));
  const rows = (await sbRest(env, `cm_comments?post_id=eq.${id}&status=neq.hidden&select=id,parent_id,author_id,body,status,created_at&order=id.asc&limit=500`)) || [];
  const hasChild = new Set(rows.filter(r => r.parent_id && r.status === 'visible').map(r => r.parent_id));
  const shown = rows.filter(r => (r.status === 'visible' || (r.status === 'deleted' && !r.parent_id && hasChild.has(r.id))) && !(r.author_id && blocked.has(r.author_id) && r.status === 'visible' && !hasChild.has(r.id)));
  const authors = await authorsOf(env, shown.map(r => r.author_id));
  return json({ items: shown.map(r => {
    const del = r.status === 'deleted', hid = r.author_id && blocked.has(r.author_id);
    return { id: r.id, parent: r.parent_id, at: r.created_at, deleted: del, blocked: !!hid && !del, body: del ? '삭제된 댓글입니다' : hid ? '차단한 회원의 댓글입니다' : r.body, author: del || hid ? { name: '' } : authorView(authors, r.author_id, myId) };
  }) });
}

export async function onRequestPost({ request, env }) {
  const w = await writer(request, env); if (w.res) return w.res;
  const b = await readBody(request); if (!b || !okId(b.post)) return json({ error: '잘못된 요청입니다' }, 400);
  const body = String(b.body || '').replace(/\r/g, '').trim();
  if (body.length < 1 || body.length > 1000) return json({ error: '댓글은 1~1,000자로 적어 주세요' }, 400);
  const bad = badText(body); if (bad) return json({ error: bad }, 400);
  const p = await postOk(env, b.post); if (!p) return json({ error: '삭제되었거나 볼 수 없는 글입니다' }, 404);
  if (p.author_id && (await blockedIds(env, p.author_id)).includes(w.member.id)) return json({ error: '이 글에는 댓글을 달 수 없습니다' }, 403);   // 글쓴이가 나를 차단한 경우
  let parent = null;
  if (b.parent != null) {
    if (!okId(b.parent)) return json({ error: '잘못된 요청입니다' }, 400);
    const r = await sbRest(env, `cm_comments?id=eq.${b.parent}&post_id=eq.${p.id}&select=id,parent_id`);
    const c = Array.isArray(r) ? r[0] : null; if (!c) return json({ error: '답글을 달 댓글을 찾을 수 없습니다' }, 404);
    parent = c.parent_id || c.id;
  }
  if (await overLimit(env, 'cmt:' + w.member.id, 60)) return json({ error: '댓글은 하루 60개까지 쓸 수 있습니다' }, 429);
  const r = await sbRest(env, 'cm_comments?select=id', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({ post_id: p.id, parent_id: parent, author_id: w.member.id, body }) });
  return json({ ok: true, id: Array.isArray(r) && r[0] ? r[0].id : null });
}

export async function onRequestDelete({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 지울 수 없습니다' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const id = new URL(request.url).searchParams.get('id'); if (!okId(id)) return json({ error: '잘못된 요청입니다' }, 400);
  const r = await sbRest(env, `cm_comments?id=eq.${id}&select=id,author_id,status`); const c = Array.isArray(r) ? r[0] : null;
  if (!c || c.status === 'deleted') return json({ ok: true });
  if (c.author_id !== me.id) return json({ error: '내가 쓴 댓글만 지울 수 있습니다' }, 403);
  await sbRest(env, `cm_comments?id=eq.${c.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted' }) });
  return json({ ok: true });
}
