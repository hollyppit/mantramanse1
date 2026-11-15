// 커뮤니티 접근 권한(테스터·베타 회원) 관리 — 관리자 전용. 표: community_access
// GET                                  목록(회수 안 된 것 먼저, 이메일 가림)
// POST   { email | userId, role:'tester'|'beta', note? }  권한 주기(회수했던 회원이면 다시 줌)
// DELETE ?user=<uuid>                  권한 회수(행은 남기고 revoked_at 기록)
// 모든 변경은 감사 로그(admin_audit_log)에 남는다. 권한이 바뀌어도 이미 받은 입장 쿠키는 최대 12시간 유효하다
//   — 바로 막아야 하면 공개 단계를 낮추거나(베타 회원 쿠키 즉시 무효) 서버 열쇠(COMMUNITY_SECRET)를 바꾼다.
import { json, isAdmin, audit, reviewerOf } from '../../_community.js';
import { sbRest, supabaseReady } from '../../_commerce.js';
import { maskEmail } from './alert.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const base = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
async function emailOf(env, id) {
  try { const r = await fetch(base(env) + '/auth/v1/admin/users/' + id, { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(6000) }); if (!r.ok) return ''; const u = await r.json(); return (u.user_metadata && u.user_metadata.provider === 'naver' ? u.user_metadata.email : u.email) || ''; } catch { return ''; }
}
function guard(request, env) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  return null;
}

export async function onRequestGet({ request, env }) {
  const g = guard(request, env); if (g) return g;
  const rows = (await sbRest(env, 'community_access?select=user_id,role,note,granted_by,granted_at,revoked_at&order=granted_at.desc&limit=200')) || [];
  rows.sort((a, b) => (!!a.revoked_at) - (!!b.revoked_at));
  const out = [];
  for (const r of rows) out.push({ userId: r.user_id, email: maskEmail(await emailOf(env, r.user_id)), role: r.role, note: r.note, grantedBy: r.granted_by, grantedAt: r.granted_at, revokedAt: r.revoked_at });
  return json({ items: out, active: out.filter(x => !x.revokedAt).length });
}

export async function onRequestPost({ request, env }) {
  const g = guard(request, env); if (g) return g;
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  b = b || {};
  if (!['tester', 'beta'].includes(b.role)) return json({ error: "role 은 'tester' 또는 'beta' 여야 합니다" }, 400);
  let id = typeof b.userId === 'string' && UUID.test(b.userId) ? b.userId : null;
  if (!id && typeof b.email === 'string' && b.email.includes('@')) {
    const r = await sbRest(env, 'rpc/community_user_by_email', { method: 'POST', body: JSON.stringify({ p_email: b.email.slice(0, 254) }) });
    id = typeof r === 'string' && UUID.test(r) ? r : null;
  }
  if (!id) return json({ error: '그 이메일로 가입한 회원을 찾지 못했습니다. 먼저 로그인(가입)해야 권한을 줄 수 있습니다' }, 404);
  const by = reviewerOf(request) || '관리자', note = typeof b.note === 'string' ? b.note.slice(0, 80) : null;
  await sbRest(env, 'community_access?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: id, role: b.role, note, granted_by: by, granted_at: new Date().toISOString(), revoked_at: null }) });
  await audit(env, by, 'community.access.grant', id, { role: b.role, note });
  return json({ ok: true, userId: id, role: b.role });
}

export async function onRequestDelete({ request, env }) {
  const g = guard(request, env); if (g) return g;
  const id = new URL(request.url).searchParams.get('user') || '';
  if (!UUID.test(id)) return json({ error: '회원 id 가 올바르지 않습니다' }, 400);
  const by = reviewerOf(request) || '관리자';
  await sbRest(env, `community_access?user_id=eq.${id}&revoked_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
  await audit(env, by, 'community.access.revoke', id, {});
  return json({ ok: true });
}
