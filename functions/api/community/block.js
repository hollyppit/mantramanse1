// 운명의 광장 차단. 차단하면 그 회원의 글·댓글이 내게 보이지 않고, 그 회원은 내 글에 댓글을 달 수 없다.
// GET                         → { items:[{ handle, name, at }] }   handle = 차단 해제용 값(상대 회원 id 대신 만든 값)
// POST { post|comment: id }   → 그 글·댓글을 쓴 회원 차단(회원 id 를 화면에 내보내지 않으려고 글 번호로 받는다). 최대 300명
// DELETE ?handle=             → 차단 해제
import { json, sbRest, supabaseReady, viewer, authorsOf, okId, readBody } from '../../_plaza.js';

const enc = encodeURIComponent;
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const handleOf = async (me, other) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cm-block:' + me + ':' + other))).slice(0, 24);

export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const rows = (await sbRest(env, `cm_blocks?blocker_id=eq.${enc(me.id)}&select=blocked_id,created_at&order=created_at.desc`)) || [];
  const names = await authorsOf(env, rows.map(r => r.blocked_id));
  return json({ items: await Promise.all(rows.map(async r => ({ handle: await handleOf(me.id, r.blocked_id), name: (names[r.blocked_id] || {}).name || '이름 없는 회원', at: r.created_at }))) });
}

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청입니다' }, 400);
  const [tbl, id] = okId(b.post) ? ['cm_posts', b.post] : okId(b.comment) ? ['cm_comments', b.comment] : [];
  if (!tbl) return json({ error: '잘못된 요청입니다' }, 400);
  const r = await sbRest(env, `${tbl}?id=eq.${id}&select=author_id`); const who = Array.isArray(r) && r[0] ? r[0].author_id : null;
  if (!who) return json({ error: '차단할 회원을 찾을 수 없습니다' }, 404);
  if (who === me.id) return json({ error: '나 자신은 차단할 수 없습니다' }, 400);
  const n = (await sbRest(env, `cm_blocks?blocker_id=eq.${enc(me.id)}&select=blocked_id`)) || [];
  if (n.length >= 300 && !n.some(x => x.blocked_id === who)) return json({ error: '차단은 300명까지 할 수 있습니다' }, 400);
  await sbRest(env, 'cm_blocks?on_conflict=blocker_id,blocked_id', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ blocker_id: me.id, blocked_id: who }) });
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const h = new URL(request.url).searchParams.get('handle') || '';
  const rows = (await sbRest(env, `cm_blocks?blocker_id=eq.${enc(me.id)}&select=blocked_id`)) || [];
  for (const r of rows) if ((await handleOf(me.id, r.blocked_id)) === h) { await sbRest(env, `cm_blocks?blocker_id=eq.${enc(me.id)}&blocked_id=eq.${enc(r.blocked_id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } }); break; }
  return json({ ok: true });
}
