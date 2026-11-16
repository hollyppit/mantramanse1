// GET /api/community/audit?limit=50&action=community. — 관리자 감사 로그(admin_audit_log) 최근 기록. 관리자만.
//   action 은 앞부분 일치(예: 'community.' → 단계 변경·권한 주기/회수). 기록은 추가만 하고 고치거나 지우지 않는다.
import { json } from '../../_community.js';
import { need } from '../../_staff.js';
import { sbRest, supabaseReady } from '../../_commerce.js';

export async function onRequestGet({ request, env }) {
  const g = await need(request, env, 'audit'); if (g.res) return g.res;   // 관리자 비밀번호 또는 운영자 열쇠
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const u = new URL(request.url);
  const limit = Math.min(200, Math.max(1, +u.searchParams.get('limit') || 50));
  const act = String(u.searchParams.get('action') || '').replace(/[^a-z0-9._-]/gi, '').slice(0, 40);
  const rows = (await sbRest(env, `admin_audit_log?select=id,at,actor,action,target,detail&order=at.desc&limit=${limit}` + (act ? `&action=like.${encodeURIComponent(act)}*` : ''))) || [];
  return json({ items: rows });
}
