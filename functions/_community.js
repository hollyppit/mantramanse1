// 커뮤니티(운명의 광장) 공개 단계와 접근 잠금 — 한 곳에서만 판단한다.
// 계획: docs/PLATFORM_EXPANSION_PLAN_2026-11-15.md · 테이블: supabase/migrations/20261115_community_stage1.sql
//
// 공개 단계(KV 'community:stage' 의 stage):
//   dev    개발 중   — 관리자·테스터(community_access.role='tester')만
//   beta   비공개 베타 — 위 + 베타 회원(role='beta')
//   public 정식 공개 — 모든 방문자(글쓰기 등은 각 API 가 로그인 회원인지 따로 확인)
//   값이 없거나, 모르는 값이거나, 읽기에 실패하면 dev 로 본다(= 닫힘).
//
// 잠그는 경로: /community 와 그 아래 모든 파일(HTML·JS·CSS·이미지), /api/community/* 중 PUBLIC_API 를 뺀 전부.
// 들어가는 열쇠: 서버가 서명한 쿠키(mt_cm). /api/community/enter 가 관리자 비밀번호 또는 회원 토큰 + 접근 권한을 확인한 뒤에만 발급한다.
//   쿠키 = v1.<역할>.<회원 id 또는 admin>.<만료 초>.<서명>. 서명 열쇠 = COMMUNITY_SECRET(없으면 ADMIN_PASSWORD 에서 파생). 열쇠가 하나도 없으면 아무도 못 들어간다.
//   쿠키를 받은 뒤 단계가 낮아지면(예: beta → dev) 베타 회원 쿠키는 바로 무효가 된다(역할을 쿠키에 적어 두고 요청마다 지금 단계와 비교).
import { json, isAdmin } from './_lib.js';
import { memberOf, sbRest, supabaseReady } from './_commerce.js';

export const STAGES = ['dev', 'beta', 'public'];
export const STAGE_LABEL = { dev: '개발 중', beta: '비공개 베타', public: '정식 공개' };
export const STAGE_KEY = 'community:stage';
export const COOKIE = 'mt_cm';
const MAX_AGE = 60 * 60 * 12;   // 12시간
const ROLES = ['admin', 'tester', 'beta', 'member'];
// 잠금 중에도 열어 두는 API: 단계 확인(준비 중 표시), 출시 알림 신청·철회, 입장 쿠키 발급(안에서 권한을 따로 확인)
export const PUBLIC_API = /^\/api\/community\/(status|alert|enter)$/;

export const isCommunityPath = p => p === '/community' || p.startsWith('/community/');
export const isCommunityApi = p => p.startsWith('/api/community/');

export function cleanStage(doc) {
  const s = doc && typeof doc.stage === 'string' ? doc.stage : '';
  return STAGES.includes(s) ? s : 'dev';
}
export async function readStage(env) {
  try { const d = env && env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(STAGE_KEY, 'json') : null; return { stage: cleanStage(d), doc: d || null }; }
  catch { return { stage: 'dev', doc: null }; }
}

// 역할이 지금 단계에서 들어갈 수 있는가
export function roleAllowed(role, stage) {
  if (role === 'admin' || role === 'tester') return true;
  if (role === 'beta') return stage === 'beta' || stage === 'public';
  if (role === 'member') return stage === 'public';
  return false;
}

// ── 서명 쿠키
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function secretOf(env) {
  if (env && typeof env.COMMUNITY_SECRET === 'string' && env.COMMUNITY_SECRET.length >= 16) return 'cs:' + env.COMMUNITY_SECRET;
  if (env && typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD) return 'ap:mantra-community-cookie:v1:' + env.ADMIN_PASSWORD;
  return '';
}
async function hmac(env, msg) {
  const s = secretOf(env); if (!s) return '';
  const k = await crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const same = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export async function makeCookie(env, role, who, now = Date.now()) {
  if (!ROLES.includes(role) || !/^(admin|[0-9a-f-]{36})$/i.test(String(who || ''))) return '';
  const exp = Math.floor(now / 1000) + MAX_AGE, body = `v1.${role}.${who}.${exp}`, sig = await hmac(env, body);
  return sig ? body + '.' + sig : '';
}
export async function readCookie(request, env, now = Date.now()) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]*)'));
  if (!m) return null;
  const parts = m[1].split('.');
  if (parts.length !== 5 || parts[0] !== 'v1' || !ROLES.includes(parts[1])) return null;
  const exp = +parts[3]; if (!Number.isInteger(exp) || exp * 1000 < now) return null;
  const want = await hmac(env, parts.slice(0, 4).join('.'));
  if (!want || !same(want, parts[4])) return null;
  return { role: parts[1], who: parts[2], exp };
}
export const setCookieHeader = (value, secure) => `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
export const clearCookieHeader = secure => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;

// ── 회원의 커뮤니티 역할(community_access, 회수되지 않은 행)
export async function accessRoleOf(env, userId) {
  if (!supabaseReady(env) || !/^[0-9a-f-]{36}$/i.test(String(userId || ''))) return null;
  try {
    const rows = await sbRest(env, `community_access?user_id=eq.${encodeURIComponent(userId)}&revoked_at=is.null&select=role`);
    const r = Array.isArray(rows) && rows[0] && rows[0].role;
    return r === 'tester' || r === 'beta' || r === 'moderator' ? (r === 'moderator' ? 'tester' : r) : null;
  } catch { return null; }
}

// 요청한 사람의 역할(관리자 > 접근 권한 > 일반 회원). 입장 쿠키 발급에만 쓴다.
export async function requesterRole(request, env) {
  if (isAdmin(request, env)) return { role: 'admin', who: 'admin' };
  const m = await memberOf(request, env); if (!m) return null;
  const r = await accessRoleOf(env, m.id);
  return { role: r || 'member', who: m.id, email: m.email };
}

const HDR = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };
const closedPage = () => new Response(null, { status: 302, headers: { ...HDR, location: '/gate/?community=closed' } });

// 미들웨어에서 부른다: 커뮤니티 경로가 아니면 null(통과), 막아야 하면 Response.
export async function communityGate(request, env, now = Date.now()) {
  const url = new URL(request.url), p = url.pathname.replace(/\/{2,}/g, '/');
  const page = isCommunityPath(p), api = isCommunityApi(p);
  if (!page && !api) return null;
  if (api && PUBLIC_API.test(p)) return null;
  const { stage } = await readStage(env);
  if (stage === 'public') return null;
  // API 는 관리자 비밀번호로도 바로 들어간다(관리자 화면·테스트)
  if (api && isAdmin(request, env)) return null;
  const c = await readCookie(request, env, now);
  if (c && roleAllowed(c.role, stage)) return null;
  if (api) return new Response(JSON.stringify({ error: 'community-closed', stage }), { status: 403, headers: { ...HDR, 'content-type': 'application/json; charset=utf-8' } });
  return closedPage();
}

// ── 관리자 감사 로그(Supabase admin_audit_log). 실패해도 본 작업은 막지 않는다.
export async function audit(env, actor, action, target, detail) {
  if (!supabaseReady(env)) return false;
  try {
    await sbRest(env, 'admin_audit_log', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ actor: String(actor || '관리자').slice(0, 40), action: String(action).slice(0, 60), target: target == null ? null : String(target).slice(0, 120), detail: detail || {} }) });
    return true;
  } catch { return false; }
}
export const reviewerOf = request => { try { return decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30); } catch { return ''; } };
export { json, isAdmin };
