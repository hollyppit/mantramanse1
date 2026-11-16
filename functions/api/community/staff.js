// 운영자 열쇠 관리(7단계 관리자 권한 분리). 공용: functions/_staff.js · 표: admin_staff
// GET  ?view=me                       → { role, name, perms }   (관리자 비밀번호 또는 운영자 열쇠 — 운영자 콘솔이 역할을 확인)
// GET                                  → { items:[{ id, name, role, createdAt, createdBy, revokedAt }] }   관리자 비밀번호만
// POST { action:'create', name, role } → { ok, key }   열쇠 원문은 이 응답에서 한 번만 보여 준다(저장은 해시만)
// POST { action:'revoke', id }         → { ok }
// 만들기·회수는 감사 로그에 남는다.
import { json, sbRest, supabaseReady, readBody, okId } from '../../_plaza.js';
import { audit } from '../../_community.js';
import { staffOf, need, PERMS, ROLES, hashKey, newKey, forgetStaff, actorOf } from '../../_staff.js';

export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.get('view') === 'me') {
    const s = await staffOf(request, env); if (!s) return json({ error: '열쇠를 확인하지 못했습니다' }, 401);
    return json({ role: s.role, name: s.name, label: s.role === 'owner' ? '관리자' : ROLES[s.role], perms: PERMS[s.role] });
  }
  const g = await need(request, env, 'staff'); if (g.res) return g.res;
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const rows = (await sbRest(env, 'admin_staff?select=id,name,role,created_by,created_at,revoked_at&order=id.desc&limit=100')) || [];
  return json({ roles: ROLES, items: rows.map(r => ({ id: r.id, name: r.name, role: r.role, createdBy: r.created_by, createdAt: r.created_at, revokedAt: r.revoked_at })) });
}

export async function onRequestPost({ request, env }) {
  const g = await need(request, env, 'staff'); if (g.res) return g.res;
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const by = actorOf(g.staff);
  if (b.action === 'create') {
    const name = String(b.name || '').trim();
    if (!name || name.length > 30 || /[<>"'`]/.test(name)) return json({ error: '이름은 1~30자로 적어 주세요(특수문자 < > " \' 제외)' }, 400);
    if (!ROLES[b.role]) return json({ error: '역할을 골라 주세요' }, 400);
    const key = newKey(), key_hash = await hashKey(env, key); if (!key_hash) return json({ error: '열쇠를 만들 비밀값이 없습니다' }, 503);
    try { await sbRest(env, 'admin_staff', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ name, role: b.role, key_hash, created_by: by }) }); }
    catch (e) { return json({ error: /409|23505|duplicate/.test(String(e && e.message)) ? '같은 이름의 운영자가 이미 있습니다' : '만들지 못했습니다' }, 409); }
    await audit(env, by, 'community.staff.create', name, { role: b.role });
    return json({ ok: true, key, name, role: b.role });
  }
  if (b.action === 'revoke') {
    if (!okId(b.id)) return json({ error: '잘못된 요청입니다' }, 400);
    const r = await sbRest(env, `admin_staff?id=eq.${b.id}&revoked_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
    forgetStaff();
    const row = Array.isArray(r) ? r[0] : null; if (!row) return json({ error: '이미 회수했거나 없는 열쇠입니다' }, 404);
    await audit(env, by, 'community.staff.revoke', row.name, { role: row.role });
    return json({ ok: true });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}
