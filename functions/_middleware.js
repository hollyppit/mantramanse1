// 미리보기 배포 전용: 영상·이미지·프롤로그 설정을 운영에서 읽기 전용으로 가져온다.
// Cloudflare Pages 의 미리보기(브랜치) 배포는 운영과 별도의 빈 KV/R2 를 써서 영상이 하나도 안 뜬다. 그래서 미리보기 호스트에서만
// 아래 "공개 읽기(GET)" 경로를 운영 주소로 대신 요청한다. 쓰기(POST/PUT/DELETE)와 관리자 경로는 건드리지 않는다.
// 운영 호스트(mantramanse.pages.dev)와 그 외 호스트에서는 아무 일도 하지 않는다(요청을 그대로 통과).
import { siteGate } from './_site-gate.js';
import { communityGate, authThrottle } from './_community.js';
import { gatewayRedirect } from './_gateway.js';

const PROD = 'https://mantramanse.pages.dev';
const PREVIEW_HOST = /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i;
// /api/worlds 는 일부러 뺐다(운영에 아직 없고, 미리보기 관리자 저장본을 확인해야 하므로).
const READ_ONLY = /^\/api\/(prologue|awakening|assets|clipfile|media|report-content|story|intro|clips)$/;
const PASS = ['content-type', 'content-range', 'accept-ranges', 'content-length', 'cache-control', 'etag', 'last-modified'];

export const proxiesToProd = (host, method, pathname) => method === 'GET' && PREVIEW_HOST.test(host) && READ_ONLY.test(pathname);

// 9단계 보안 머리말: 인연의 광장·처음 화면·관리자·회원 API 응답에만 붙인다(심층 분석 /report/ 화면은 그대로 — 기존 서비스 영향 없음).
//   다른 사이트가 틀(iframe)로 감싸 클릭을 가로채지 못하게(같은 사이트 틀은 허용 — 관리자 화면이 자기 미리보기를 틀로 띄운다), 파일 형식을 추측하지 않게, 다른 사이트로 주소 전체를 넘기지 않게, 카메라·마이크·위치 사용 막기
export const SECURE_PATH = /^\/(community(\/|$)|gate(\/|$)|report\/admin\/|api\/(community|account)\/)/;
export const SECURITY_HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': "frame-ancestors 'self'", 'permissions-policy': 'camera=(), microphone=(), geolocation=()' };
// 2026-11-26 보안 2차: 위 머리말을 모든 응답(/report/ 결제 화면 포함)에 붙이고, https 에는 HSTS(항상 https 로만 접속, 180일 — 하위 도메인은 건드리지 않음)도 붙인다.
//   SECURE_PATH 는 예전 범위 기록·테스트용으로 남긴다. 응답이 이미 같은 머리말을 정했으면(아바타 sandbox CSP 등) 덮어쓰지 않는다.
export const HSTS = 'max-age=15552000';
export function withSecurity(request, res) {
  let u; try { u = new URL(request.url); } catch { return res; }
  if (!res || res.status === 101 || res.webSocket) return res;
  let out; try { out = new Response(res.body, res); } catch { return res; }
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  if (u.protocol === 'https:' && !out.headers.has('strict-transport-security')) out.headers.set('strict-transport-security', HSTS);
  return out;
}

// 배포에서 뺄 경로(2026-11-25): 저장소 루트를 그대로 배포하므로, 서비스가 아닌 연구 자료 폴더는 누구에게도(관리자 포함) 내보내지 않는다.
//   /validation/… = 유명인 생애 데이터 검증 시스템(validation/celebrity). 대소문자·중복 슬래시·%인코딩 우회도 막는다.
// 2026-11-26 보안 점검: 저장소 루트 배포라 내부 폴더(유료 원고 editorial·문서·도구·테스트·DB 구조·설정)와 설명 문서(.md)·서버 전용 스크립트(.mjs·.cjs·.sql)도
//   그대로 열렸다 → 모두 404. 서비스 화면(report·community·gate·루트 js)은 이 폴더·확장자를 쓰지 않는다(grep 확인).
export const PRIVATE_PATH = /^\/(?:(?:validation|docs|editorial|tools|tests|supabase|config|output|workers|functions|node_modules|외부툴_프롬프트|\.(?!well-known(?:\/|$))[^/]*)(?:\/|$)|.*\.(?:md|mjs|cjs|sql|zip|map|ts|log|bak)$)/i;
export function isPrivatePath(rawUrl) {
  let p; try { p = new URL(rawUrl).pathname; } catch { return false; }
  try { p = decodeURIComponent(p); } catch { /* 잘못된 인코딩은 원래 경로로 판정 */ }
  return PRIVATE_PATH.test(p.replace(/\\/g, '/').replace(/\/{2,}/g, '/'));
}
const notFound = () => new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

// 2026-11-26 보안 2차: Cloudflare 함수 경로는 대소문자를 가리지 않아 /api/Community/… 가 커뮤니티 API 를 실행하면서 잠금 검사(소문자 비교)를 건너뛰었다.
//   API 파일 이름은 모두 소문자이므로 /api/ 경로에 대문자가 있으면 404(검색어 ?… 는 상관없음). %인코딩 우회도 디코딩해서 본다.
export function isOddApiPath(rawUrl) {
  let p; try { p = new URL(rawUrl).pathname; } catch { return false; }
  try { p = decodeURIComponent(p); } catch { return /^\/+api\//i.test(p); }
  return /^\/+api(\/|$)/i.test(p) && (/[A-Z]/.test(p) || /%/.test(new URL(rawUrl).pathname));
}
export async function onRequest(ctx) { if (isPrivatePath(ctx.request.url) || isOddApiPath(ctx.request.url)) return withSecurity(ctx.request, notFound()); return withSecurity(ctx.request, await route(ctx)); }
async function route(ctx) {
  // 2026-11-26 보안 점검: 관리자 비밀번호(Bearer) 대입 막기를 모든 /api/* 로 넓힌다(예전엔 /api/admin·/api/community/* 만 막고 나머지 약 70곳은 무제한).
  //   같은 IP(IPv6 는 /64)에서 1시간에 20번 틀리면 그 시간 동안 Bearer 요청을 429. 커뮤니티 API 는 communityGate 안에서 같은 검사를 하므로 여기서는 건너뛴다(두 번 세지 않게).
  { const p = new URL(ctx.request.url).pathname.replace(/\/{2,}/g, '/'); if (p.toLowerCase().startsWith('/api/') && !p.startsWith('/api/community/')) { const t = await authThrottle(ctx.request, ctx.env); if (t) return t; } }
  const hidden = await gatewayRedirect(ctx.request, ctx.env);   // 통합 첫 화면 숨김(기본) — /gate/ 를 /report/ 로
  if (hidden) return hidden;
  const locked = await siteGate(ctx.request, ctx.env);
  if (locked) return locked;
  const closed = await communityGate(ctx.request, ctx.env);   // 커뮤니티 공개 단계 잠금(사이트 비밀번호와 별개)
  if (closed) return closed;
  const url = new URL(ctx.request.url);
  if (!proxiesToProd(url.hostname, ctx.request.method, url.pathname)) return ctx.next();
  try {
    const h = {}; const range = ctx.request.headers.get('range'); if (range) h.range = range;
    const up = await fetch(PROD + url.pathname + url.search, { headers: h });
    const out = new Headers(); PASS.forEach(k => { const v = up.headers.get(k); if (v) out.set(k, v); });
    out.set('x-preview-proxy', 'prod-readonly');
    return new Response(up.body, { status: up.status, headers: out });
  } catch (e) {
    return ctx.next(); // 운영에 닿지 못하면 미리보기 자체 응답(빈 데이터)으로 계속
  }
}
