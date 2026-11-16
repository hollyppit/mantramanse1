// 관리자 권한 분리(7단계). 관리자 비밀번호(ADMIN_PASSWORD) 로그인은 그대로 두고(= owner, 전부 가능),
// 운영자에게는 역할별 열쇠('mts_' + 32자리 16진수)를 따로 준다. 열쇠 원문은 저장하지 않고 해시만 admin_staff 표에 둔다.
// 표: supabase/migrations/20261116_admin_stage7.sql · 열쇠 만들기·회수: /api/community/staff(관리자 비밀번호만)
//
// 역할과 권한
//   owner     — 전부(공개 단계·접근 권한·출시 알림·유료/크레딧·수동 본인확인·운영자 열쇠는 owner 만)
//   operator  — metrics(성과 지표) · members(회원 찾기) · mod(신고·제재) · audit(작업 기록) · content(운테크 문안)
//   moderator — mod · members · audit
//   analyst   — metrics
// 감사 로그의 작업자 이름: 운영자 열쇠면 열쇠에 붙인 이름(x-reviewer 헤더는 믿지 않는다), owner 면 x-reviewer(없으면 '관리자').
import { isAdmin, json } from './_lib.js';
import { sbRest, supabaseReady } from './_commerce.js';
// _community.js 가 이 파일을 불러 쓰므로(잠금 통과) 서로 부르지 않게 작업자 이름 읽기를 여기 따로 둔다
const reviewerOf = request => { try { return decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30); } catch { return ''; } };

export const ROLES = { moderator: '모더레이터', operator: '운영 매니저', analyst: '분석 담당' };
export const PERMS = {
  owner: ['metrics', 'members', 'mod', 'audit', 'content', 'staff'],
  operator: ['metrics', 'members', 'mod', 'audit', 'content'],
  moderator: ['mod', 'members', 'audit'],
  analyst: ['metrics'],
};
export const KEY_RE = /^mts_[0-9a-f]{32}$/;
const bearer = request => { const h = request.headers.get('authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : ''; };
export const looksStaff = request => KEY_RE.test(bearer(request));

function salt(env) {
  if (env && typeof env.COMMUNITY_SECRET === 'string' && env.COMMUNITY_SECRET.length >= 16) return 'cs:' + env.COMMUNITY_SECRET;
  if (env && typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD) return 'ap:' + env.ADMIN_PASSWORD;
  return '';
}
export async function hashKey(env, key) {
  const s = salt(env); if (!s) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mantra-staff-key:v1:' + s + ':' + key));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const newKey = () => 'mts_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');

// 열쇠 확인 결과를 60초 동안 기억한다(회수는 최대 60초 뒤에 반영 — 회수 API 는 같은 작업 공간의 기억을 바로 지운다)
const cache = new Map(); const TTL = 60000;
export const forgetStaff = () => cache.clear();

// 반환: { role, name, id? } 또는 null
export async function staffOf(request, env, now = Date.now()) {
  if (isAdmin(request, env)) return { role: 'owner', name: reviewerOf(request) || '관리자' };
  const key = bearer(request); if (!KEY_RE.test(key) || !supabaseReady(env)) return null;
  const h = await hashKey(env, key); if (!h) return null;
  const c = cache.get(h); if (c && now - c.at < TTL) return c.v;
  let v = null;
  try {
    const rows = await sbRest(env, `admin_staff?key_hash=eq.${h}&revoked_at=is.null&select=id,name,role`);
    const r = Array.isArray(rows) ? rows[0] : null;
    v = r && PERMS[r.role] ? { role: r.role, name: r.name, id: r.id } : null;
  } catch { return null; }   // 조회 실패는 기억하지 않는다
  if (cache.size > 200) cache.clear();
  cache.set(h, { at: now, v });
  return v;
}
export const can = (staff, perm) => !!(staff && PERMS[staff.role] && PERMS[staff.role].includes(perm));
// API 첫 줄에서 쓴다: 권한이 없으면 { res } (401/403), 있으면 { staff }
export async function need(request, env, perm) {
  const s = await staffOf(request, env);
  if (!s) return { res: json({ error: '관리자 인증이 필요합니다' }, 401) };
  if (!can(s, perm)) return { res: json({ error: '이 작업을 할 권한이 없습니다', role: s.role }, 403) };
  return { staff: s };
}
// 감사 로그에 적을 작업자 이름: 운영자는 '이름(역할)'
export const actorOf = s => !s ? '관리자' : s.role === 'owner' ? s.name : s.name + '(' + (ROLES[s.role] || s.role) + ')';
