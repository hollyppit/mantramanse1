// 운명의 광장 피드·글쓰기. 공용: functions/_plaza.js
// GET  ?tab=latest|popular &cat=wealth.. &group=ilju:갑자|ilgan:갑 &q=검색어 &tag=해시태그 &mine=1 &saved=1 &before=<글 id>(최신 이어 보기) &page=<n>(인기 이어 보기)
//      → { items:[{ id, category, title, excerpt, tags, group, likes, comments, at, edited, author, liked, saved }], more, next }
//      차단한 회원의 글은 빼고, 숨김·삭제된 글은 보이지 않는다. 인기 = 최근 14일 좋아요·댓글 순
// POST { title, body, category, group?:'ilju'|'ilgan', tags? } → { ok, id }
//      쓰기 조건(functions/_plaza.js writer) + 하루 10개 + 내용 검사(전화·이메일·외부 연락처·링크·주민번호)
//      group 은 내 프로필의 일주·일간으로만 쓸 수 있다
import { json, sbRest, supabaseReady, viewer, writer, blockedIds, authorsOf, authorView, badText, cleanTags, overLimit, readBody, CATS, ILJU, ILGAN } from '../../_plaza.js';

const PAGE = 20;
const enc = encodeURIComponent;
const excerpt = s => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > 140 ? t.slice(0, 140) + '…' : t; };

export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 글을 불러올 수 없습니다' }, 503);
  const u = new URL(request.url), sp = u.searchParams;
  const me = await viewer(request, env), myId = me && me.id;
  const tab = sp.get('tab') === 'popular' ? 'popular' : 'latest';
  const f = ['status=eq.visible', 'select=id,author_id,category,group_kind,group_key,title,body,hashtags,like_count,comment_count,created_at,edited_at'];
  const cat = sp.get('cat'); if (cat && CATS[cat]) f.push('category=eq.' + cat);
  const g = String(sp.get('group') || '').split(':');
  if (g[0] === 'ilju' && ILJU.includes(g[1])) f.push('group_kind=eq.ilju', 'group_key=eq.' + enc(g[1]));
  else if (g[0] === 'ilgan' && ILGAN.includes(g[1])) f.push('group_kind=eq.ilgan', 'group_key=eq.' + enc(g[1]));
  const tag = String(sp.get('tag') || '').replace(/^#/, ''); if (/^[가-힣a-zA-Z0-9_]{1,20}$/.test(tag)) f.push('hashtags=cs.' + enc('{' + tag + '}'));
  const q = String(sp.get('q') || '').replace(/[%*,()"\\:]/g, ' ').trim().slice(0, 30);
  if (q.length >= 2) f.push('or=' + enc(`(title.ilike.*${q}*,body.ilike.*${q}*)`));
  if (sp.get('mine') === '1') { if (!myId) return json({ error: '로그인이 필요합니다', need: 'login' }, 401); f.push('author_id=eq.' + enc(myId)); }
  if (sp.get('saved') === '1') {
    if (!myId) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
    const s = (await sbRest(env, `cm_reactions?user_id=eq.${enc(myId)}&kind=eq.bookmark&select=post_id&order=created_at.desc&limit=200`)) || [];
    if (!s.length) return json({ items: [], more: false });
    f.push('id=in.(' + s.map(x => x.post_id).join(',') + ')');
  }
  const blocked = await blockedIds(env, myId);
  if (blocked.length) f.push('or=' + enc('(author_id.is.null,author_id.not.in.(' + blocked.join(',') + '))'));
  let page = 0;
  if (tab === 'popular') {
    f.push('created_at=gte.' + new Date(Date.now() - 14 * 864e5).toISOString(), 'order=like_count.desc,comment_count.desc,id.desc');
    page = Math.min(20, Math.max(0, +sp.get('page') || 0)); f.push('offset=' + page * PAGE);
  } else {
    const before = sp.get('before'); if (/^\d{1,15}$/.test(before || '')) f.push('id=lt.' + before);
    f.push('order=id.desc');
  }
  f.push('limit=' + (PAGE + 1));
  // 같은 키(or)가 두 번 들어가면 PostgREST 가 하나만 쓰므로 and=() 로 묶는다
  const ors = f.filter(x => x.startsWith('or=')), rest = f.filter(x => !x.startsWith('or='));
  if (ors.length > 1) rest.push('and=' + enc('(' + ors.map(x => 'or' + decodeURIComponent(x.slice(3))).join(',') + ')')); else rest.push(...ors);
  const rows = (await sbRest(env, 'cm_posts?' + rest.join('&'))) || [];
  const more = rows.length > PAGE, list = rows.slice(0, PAGE);
  const authors = await authorsOf(env, list.map(r => r.author_id));
  let mine = { like: new Set(), bookmark: new Set() };
  if (myId && list.length) {
    const rx = (await sbRest(env, `cm_reactions?user_id=eq.${enc(myId)}&post_id=in.(${list.map(r => r.id).join(',')})&select=post_id,kind`)) || [];
    rx.forEach(x => mine[x.kind] && mine[x.kind].add(x.post_id));
  }
  return json({
    items: list.map(r => ({ id: r.id, category: r.category, catLabel: CATS[r.category], title: r.title, excerpt: excerpt(r.body), tags: r.hashtags || [], group: r.group_kind ? { kind: r.group_kind, key: r.group_key } : null, likes: r.like_count, comments: r.comment_count, at: r.created_at, edited: !!r.edited_at, author: authorView(authors, r.author_id, myId), liked: mine.like.has(r.id), saved: mine.bookmark.has(r.id) })),
    more, next: more ? (tab === 'popular' ? { page: page + 1 } : { before: list[list.length - 1].id }) : null,
  });
}

export function checkPost(b, profile) {
  const title = String(b.title || '').replace(/\s+/g, ' ').trim(), body = String(b.body || '').replace(/\r/g, '').trim();
  if (!CATS[b.category]) return { error: '게시판을 골라 주세요' };
  if (title.length < 2 || title.length > 60) return { error: '제목은 2~60자로 적어 주세요' };
  if (body.length < 2 || body.length > 5000) return { error: '내용은 2~5,000자로 적어 주세요' };
  const bad = badText(title + '\n' + body); if (bad) return { error: bad };
  let group_kind = null, group_key = null;
  if (b.group === 'ilju' || b.group === 'ilgan') {
    const key = profile && profile[b.group];
    if (!key) return { error: '모임에 올리려면 먼저 내 일주를 확인해 주세요', need: 'ilju' };
    group_kind = b.group; group_key = key;
  }
  return { row: { category: b.category, title, body, hashtags: cleanTags(b.tags, body), group_kind, group_key } };
}

export async function onRequestPost({ request, env }) {
  const w = await writer(request, env); if (w.res) return w.res;
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const c = checkPost(b, w.profile); if (c.error) return json({ error: c.error, need: c.need }, 400);
  if (await overLimit(env, 'post:' + w.member.id, 10)) return json({ error: '글은 하루 10개까지 쓸 수 있습니다' }, 429);
  const r = await sbRest(env, 'cm_posts?select=id', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({ ...c.row, author_id: w.member.id }) });
  const id = Array.isArray(r) && r[0] ? r[0].id : null;
  return json({ ok: true, id });
}
