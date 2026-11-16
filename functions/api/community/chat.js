// 1:1 대화(5단계, 서버 경유). 서로 인연을 이은 두 사람만. 설계: docs/MATCHING_CHAT_PLAN_2026-11-16.md
// GET  ?view=rooms           → { rooms:[{ id, name, avatar, last, lastAt, unread, open }] }
// GET  ?room=<id>&after=<id> → { room:{ id, name, avatar, open, ilju }, messages:[{ id, mine, body, at, flagged }], tip }  읽음 표시도 함께
// POST { action:'send', room, body }       → { ok, message, tip? }  연락처·송금 유도 같은 말은 막지 않고 경고(tip)를 붙인다
// POST { action:'leave', room }            → 대화 끝내기(상대에게서도 닫힘)
// POST { action:'report', room, message?, reason, detail? } → 신고(운영자가 최근 대화 일부를 볼 수 있다)
// POST { action:'block', room }            → 차단 + 대화 끝내기
// 조건: 로그인 + 필수 동의 + 성인 본인확인 + 그 방의 두 사람 중 하나 + 이용 정지 아님
import { featureGate } from '../../_features.js';
import { json, sbRest, supabaseReady, viewer, profileOf, activeSanction, blockedIds, avatarOf, posterMap, overLimit, readBody, okId, REASONS } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { verificationOf, flagOf, FLAG_TIP, MSG_PER_DAY } from '../../_match.js';

const enc = encodeURIComponent;
async function who(request, env) {
  if (!supabaseReady(env)) return { res: json({ error: '잠시 후 다시 시도해 주세요' }, 503) };
  const me = await viewer(request, env); if (!me) return { res: json({ error: '로그인이 필요합니다', need: 'login' }, 401) };
  if (!requiredOk(await readConsents(env, me.id))) return { res: json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409) };
  if (!(await verificationOf(env, me.id))) return { res: json({ error: '대화는 성인 본인확인 후 이용할 수 있습니다', need: 'verify' }, 403) };
  return { me };
}
async function roomOf(env, id, uid) {
  if (!okId(id)) return null;
  const r = await sbRest(env, `cm_rooms?id=eq.${id}&select=*`); const room = Array.isArray(r) ? r[0] : null;
  if (!room || (room.a_id !== uid && room.b_id !== uid)) return null;
  room.other = room.a_id === uid ? room.b_id : room.a_id; room.side = room.a_id === uid ? 'a' : 'b';
  return room;
}
async function names(env, ids) {
  const o = {}; ids = [...new Set(ids.filter(Boolean))]; if (!ids.length) return o;
  const [ps, posters] = await Promise.all([sbRest(env, `member_profiles?user_id=in.(${ids.map(enc).join(',')})&select=user_id,nickname,ilju,ilgan,show_ilju,show_ilgan,avatar_path,poster_gender`), posterMap(env)]);
  (ps || []).forEach(p => { const a = avatarOf(p, posters, true); o[p.user_id] = { name: p.nickname || '이름 없는 회원', avatar: a ? a.url : null, ilju: p.ilju || null }; });
  return o;
}

export async function onRequestGet({ request, env }) {
  { const off = await featureGate(request, env, 'chat'); if (off) return off; }   // 9단계 기능별 스위치(functions/_features.js)
  const w = await who(request, env); if (w.res) return w.res;
  const sp = new URL(request.url).searchParams, uid = w.me.id;
  if (sp.get('view') === 'rooms') {
    const rooms = (await sbRest(env, `cm_rooms?or=(a_id.eq.${enc(uid)},b_id.eq.${enc(uid)})&select=*&order=last_at.desc&limit=100`)) || [];
    const others = rooms.map(r => (r.a_id === uid ? r.b_id : r.a_id));
    const N = await names(env, others);
    const lastIds = rooms.map(r => r.last_id).filter(x => x > 0);
    const lasts = lastIds.length ? (await sbRest(env, `cm_messages?id=in.(${lastIds.join(',')})&select=id,sender_id,body`)) || [] : [];
    const L = Object.fromEntries(lasts.map(m => [m.id, m]));
    return json({ rooms: rooms.map(r => { const o = r.a_id === uid ? r.b_id : r.a_id, read = r.a_id === uid ? r.a_read : r.b_read, l = L[r.last_id]; return { id: r.id, name: o ? (N[o] || {}).name || '이름 없는 회원' : '떠난 회원', avatar: o ? (N[o] || {}).avatar || null : null, last: l ? (l.sender_id === uid ? '나: ' : '') + String(l.body).slice(0, 60) : '인연이 이어졌어요. 먼저 인사해 보세요', lastAt: r.last_at, unread: !!(l && l.sender_id !== uid && r.last_id > read), open: r.status === 'open' && !!o }; }) });
  }
  const room = await roomOf(env, sp.get('room'), uid); if (!room) return json({ error: '대화방을 찾을 수 없습니다' }, 404);
  const after = /^\d{1,15}$/.test(sp.get('after') || '') ? +sp.get('after') : 0;
  const msgs = (await sbRest(env, `cm_messages?room_id=eq.${room.id}&id=gt.${after}&select=id,sender_id,body,flagged,created_at&order=id.asc&limit=200`)) || [];
  const last = msgs.length ? msgs[msgs.length - 1].id : 0;
  if (last > (room.side === 'a' ? room.a_read : room.b_read)) await sbRest(env, `cm_rooms?id=eq.${room.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ [room.side + '_read']: last }) });
  const N = await names(env, [room.other]), o = N[room.other] || {};
  const otherRead = room.side === 'a' ? room.b_read : room.a_read;
  return json({ room: { id: room.id, name: room.other ? o.name || '이름 없는 회원' : '떠난 회원', avatar: o.avatar || null, ilju: o.ilju || null, open: room.status === 'open' && !!room.other, otherRead }, messages: msgs.map(m => ({ id: m.id, mine: m.sender_id === uid, body: m.body, at: m.created_at, flagged: m.flagged || null })), tips: FLAG_TIP });
}

export async function onRequestPost({ request, env }) {
  { const off = await featureGate(request, env, 'chat'); if (off) return off; }   // 9단계 기능별 스위치(functions/_features.js)
  const w = await who(request, env); if (w.res) return w.res;
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const uid = w.me.id, room = await roomOf(env, b.room, uid); if (!room) return json({ error: '대화방을 찾을 수 없습니다' }, 404);
  const now = new Date().toISOString();
  if (b.action === 'send') {
    if (room.status !== 'open' || !room.other) return json({ error: '끝난 대화입니다' }, 409);
    if (await activeSanction(env, uid)) return json({ error: '운영 정책 위반으로 지금은 메시지를 보낼 수 없습니다', need: 'sanction' }, 403);
    if ((await blockedIds(env, room.other)).includes(uid) || (await blockedIds(env, uid)).includes(room.other)) return json({ error: '메시지를 보낼 수 없습니다' }, 403);
    const body = String(b.body || '').replace(/\r/g, '').trim(); if (!body || body.length > 1000) return json({ error: '메시지는 1~1,000자로 보내 주세요' }, 400);
    if (await overLimit(env, 'msg:' + uid, MSG_PER_DAY)) return json({ error: '오늘은 메시지를 더 보낼 수 없어요' }, 429);
    const flagged = flagOf(body);
    const r = await sbRest(env, 'cm_messages?select=id,created_at', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({ room_id: room.id, sender_id: uid, body, flagged }) });
    const m = Array.isArray(r) && r[0]; if (!m) return json({ error: '보내지 못했습니다' }, 502);
    await sbRest(env, `cm_rooms?id=eq.${room.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ last_id: m.id, last_at: now, [room.side + '_read']: m.id }) });
    return json({ ok: true, message: { id: m.id, mine: true, body, at: m.created_at, flagged }, tip: flagged ? FLAG_TIP[flagged] : null });
  }
  if (b.action === 'leave' || b.action === 'block') {
    if (room.status === 'open') await sbRest(env, `cm_rooms?id=eq.${room.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'closed', closed_by: uid, closed_at: now }) });
    if (b.action === 'block' && room.other) await sbRest(env, 'cm_blocks?on_conflict=blocker_id,blocked_id', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ blocker_id: uid, blocked_id: room.other }) });
    return json({ ok: true });
  }
  if (b.action === 'report') {
    if (!REASONS[b.reason]) return json({ error: '신고 사유를 골라 주세요' }, 400);
    let target = null;
    if (okId(b.message)) { const r = await sbRest(env, `cm_messages?id=eq.${b.message}&room_id=eq.${room.id}&sender_id=neq.${enc(uid)}&select=id`); target = Array.isArray(r) && r[0] ? r[0].id : null; }
    if (!target) { const r = await sbRest(env, `cm_messages?room_id=eq.${room.id}&sender_id=eq.${enc(room.other)}&select=id&order=id.desc&limit=1`); target = Array.isArray(r) && r[0] ? r[0].id : null; }
    if (!target) return json({ error: '신고할 메시지가 없습니다' }, 400);
    const dup = await sbRest(env, `cm_reports?reporter_id=eq.${enc(uid)}&target_type=eq.message&target_id=eq.${target}&select=id`);
    if (!(Array.isArray(dup) && dup.length)) await sbRest(env, 'cm_reports', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ reporter_id: uid, target_type: 'message', target_id: target, target_author: room.other, reason: b.reason, detail: String(b.detail || '').trim().slice(0, 300) || null }) });
    return json({ ok: true });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}
