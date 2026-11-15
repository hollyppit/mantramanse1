// 운명의 광장 운영(관리자만). 모든 처리는 감사 로그(admin_audit_log)에 작업자 이름과 함께 남긴다.
// GET  ?view=reports(기본)|hidden|sanctions
//      reports: 처리 안 된 신고를 대상별로 묶어 { target, reasons, count, preview, status }
// POST { action:'hide'|'restore'|'delete', type:'post'|'comment', id }       글·댓글 숨김/되살리기/삭제(관련 신고는 처리됨으로)
//      { action:'dismiss', type, id }                                         신고 기각(대상은 그대로)
//      { action:'sanction', type, id, kind:'warn'|'mute'|'ban', days?, reason }  그 글·댓글을 쓴 회원 제재(days 비우면 무기한)
//      { action:'lift', sanctionId }                                           제재 해제
//      { action:'avatar', type, id }                                           그 글·댓글을 쓴 회원의 프로필 사진을 지운다(기본 일간 포스터로)
import { json, isAdmin, sbRest, supabaseReady, authorsOf, okId, readBody, REASONS } from '../../_plaza.js';
import { audit, reviewerOf } from '../../_community.js';

const TBL = { post: 'cm_posts', comment: 'cm_comments', message: 'cm_messages' };   // message: 대화 신고(5단계) — 숨김·삭제 없이 기각·제재만
const rowOf = async (env, type, id) => { const r = await sbRest(env, type === 'message' ? `cm_messages?id=eq.${id}&select=id,author_id:sender_id,room_id` : `${TBL[type]}?id=eq.${id}&select=id,author_id,status`); return Array.isArray(r) ? r[0] || null : null; };
const snip = s => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > 120 ? t.slice(0, 120) + '…' : t; };

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const view = new URL(request.url).searchParams.get('view') || 'reports';
  if (view === 'sanctions') {
    const rows = (await sbRest(env, 'cm_sanctions?select=id,user_id,kind,reason,until,by_actor,created_at,lifted_at&order=created_at.desc&limit=100')) || [];
    const a = await authorsOf(env, rows.map(r => r.user_id));
    return json({ items: rows.map(r => ({ id: r.id, who: (a[r.user_id] || {}).name || '이름 없는 회원', kind: r.kind, reason: r.reason, until: r.until, by: r.by_actor, at: r.created_at, lifted: r.lifted_at })) });
  }
  if (view === 'hidden') {
    const [p, c] = await Promise.all([sbRest(env, 'cm_posts?status=eq.hidden&select=id,author_id,title,body,report_count,created_at&order=id.desc&limit=50'), sbRest(env, 'cm_comments?status=eq.hidden&select=id,post_id,author_id,body,report_count,created_at&order=id.desc&limit=50')]);
    const a = await authorsOf(env, [...(p || []), ...(c || [])].map(r => r.author_id));
    return json({ items: [...(p || []).map(r => ({ type: 'post', id: r.id, who: (a[r.author_id] || {}).name || '탈퇴한 회원', preview: snip(r.title + ' · ' + r.body), reports: r.report_count, at: r.created_at })), ...(c || []).map(r => ({ type: 'comment', id: r.id, post: r.post_id, who: (a[r.author_id] || {}).name || '탈퇴한 회원', preview: snip(r.body), reports: r.report_count, at: r.created_at }))] });
  }
  const rows = (await sbRest(env, 'cm_reports?status=eq.open&select=id,target_type,target_id,reason,detail,created_at&order=created_at.desc&limit=500')) || [];
  const groups = {};
  rows.forEach(r => { const k = r.target_type + ':' + r.target_id; const g = groups[k] || (groups[k] = { type: r.target_type, id: r.target_id, count: 0, reasons: {}, details: [], first: r.created_at }); g.count++; g.reasons[REASONS[r.reason] || r.reason] = (g.reasons[REASONS[r.reason] || r.reason] || 0) + 1; if (r.detail && g.details.length < 3) g.details.push(r.detail); if (r.created_at < g.first) g.first = r.created_at; });
  const list = Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 100);
  const pIds = list.filter(g => g.type === 'post').map(g => g.id), cIds = list.filter(g => g.type === 'comment').map(g => g.id);
  const [ps, cs] = await Promise.all([pIds.length ? sbRest(env, `cm_posts?id=in.(${pIds.join(',')})&select=id,author_id,title,body,status`) : [], cIds.length ? sbRest(env, `cm_comments?id=in.(${cIds.join(',')})&select=id,post_id,author_id,body,status`) : []]);
  const mIds = list.filter(g => g.type === 'message').map(g => g.id);
  const ms = mIds.length ? (await sbRest(env, `cm_messages?id=in.(${mIds.join(',')})&select=id,room_id,author_id:sender_id,body,created_at`)) || [] : [];
  // 대화 신고는 신고된 메시지 앞뒤 대화(최대 8개)를 함께 보여 준다(대화 맥락 확인용, 운영자만)
  const ctx = {}; for (const m of ms) { const r = (await sbRest(env, `cm_messages?room_id=eq.${m.room_id}&id=lte.${m.id + 4}&id=gte.${Math.max(0, m.id - 40)}&select=id,sender_id,body&order=id.desc&limit=8`)) || []; ctx[m.id] = r.reverse(); }
  const P = Object.fromEntries((ps || []).map(r => [r.id, r])), C = Object.fromEntries((cs || []).map(r => [r.id, r])), Mm = Object.fromEntries(ms.map(r => [r.id, r]));
  const a = await authorsOf(env, [...(ps || []), ...(cs || []), ...ms, ...Object.values(ctx).flat().map(x => ({ author_id: x.sender_id }))].map(r => r.author_id));
  return json({ items: list.map(g => { const t = g.type === 'post' ? P[g.id] : g.type === 'comment' ? C[g.id] : Mm[g.id]; return { ...g, post: t && t.post_id, status: t ? (t.status || 'visible') : 'missing', who: t ? ((a[t.author_id] || {}).name || '탈퇴한 회원') : '', preview: t ? snip(g.type === 'post' ? t.title + ' · ' + t.body : t.body) : '(찾을 수 없음)', context: g.type === 'message' ? (ctx[g.id] || []).map(x => ({ who: (a[x.sender_id] || {}).name || '탈퇴한 회원', body: snip(x.body), reported: x.id === g.id })) : undefined }; }) });
}

async function closeReports(env, type, id, status, by) {
  await sbRest(env, `cm_reports?target_type=eq.${type}&target_id=eq.${id}&status=eq.open`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status, handled_by: by, handled_at: new Date().toISOString() }) });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const by = reviewerOf(request) || '관리자';
  if (b.action === 'lift') {
    if (!okId(b.sanctionId)) return json({ error: '잘못된 요청입니다' }, 400);
    await sbRest(env, `cm_sanctions?id=eq.${b.sanctionId}&lifted_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ lifted_at: new Date().toISOString() }) });
    await audit(env, by, 'community.sanction.lift', String(b.sanctionId), {});
    return json({ ok: true });
  }
  const tbl = TBL[b.type]; if (!tbl || !okId(b.id)) return json({ error: '대상을 확인해 주세요' }, 400);
  const row = await rowOf(env, b.type, b.id);
  if (b.type === 'message' && !['dismiss', 'sanction', 'avatar'].includes(b.action)) return json({ error: '대화 신고는 기각·제재만 할 수 있습니다' }, 400);
  if (!row) return json({ error: '대상을 찾을 수 없습니다' }, 404);
  const target = b.type + ':' + b.id;
  if (['hide', 'restore', 'delete'].includes(b.action)) {
    const status = b.action === 'hide' ? 'hidden' : b.action === 'restore' ? 'visible' : 'deleted';
    await sbRest(env, `${tbl}?id=eq.${b.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status }) });
    await closeReports(env, b.type, b.id, b.action === 'restore' ? 'dismissed' : 'resolved', by);
    await audit(env, by, 'community.mod.' + b.action, target, { from: row.status, to: status });
    return json({ ok: true, status });
  }
  if (b.action === 'avatar') {
    if (!row.author_id) return json({ error: '탈퇴한 회원입니다' }, 400);
    const pr = await sbRest(env, `member_profiles?user_id=eq.${encodeURIComponent(row.author_id)}&select=avatar_path`); const k = Array.isArray(pr) && pr[0] && pr[0].avatar_path;
    if (k) { await sbRest(env, `member_profiles?user_id=eq.${encodeURIComponent(row.author_id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ avatar_path: null }) }); if (env.CLIPS_R2 && /^cm-av\//.test(k)) { try { await env.CLIPS_R2.delete(k); } catch { } } }
    await audit(env, by, 'community.mod.avatar', target, { had: !!k });
    return json({ ok: true, removed: !!k });
  }
  if (b.action === 'dismiss') {
    await closeReports(env, b.type, b.id, 'dismissed', by);
    await audit(env, by, 'community.mod.dismiss', target, {});
    return json({ ok: true });
  }
  if (b.action === 'sanction') {
    if (!['warn', 'mute', 'ban'].includes(b.kind)) return json({ error: '제재 종류를 골라 주세요' }, 400);
    const reason = String(b.reason || '').trim().slice(0, 200); if (!reason) return json({ error: '제재 사유를 적어 주세요(회원에게 안내됩니다)' }, 400);
    if (!row.author_id) return json({ error: '탈퇴한 회원은 제재할 수 없습니다' }, 400);
    const days = Number.isInteger(+b.days) && +b.days > 0 && +b.days <= 3650 ? +b.days : null;
    const until = b.kind === 'warn' ? null : days ? new Date(Date.now() + days * 864e5).toISOString() : null;
    await sbRest(env, 'cm_sanctions', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ user_id: row.author_id, kind: b.kind, reason, until, by_actor: by }) });
    await closeReports(env, b.type, b.id, 'resolved', by);
    await audit(env, by, 'community.sanction.' + b.kind, target, { days, reason });
    return json({ ok: true, until });
  }
  return json({ error: '알 수 없는 작업입니다' }, 400);
}
