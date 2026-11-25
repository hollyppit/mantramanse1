// 미리보기 배포 전용: 영상·이미지·프롤로그 설정을 운영에서 읽기 전용으로 가져온다.
// Cloudflare Pages 의 미리보기(브랜치) 배포는 운영과 별도의 빈 KV/R2 를 써서 영상이 하나도 안 뜬다. 그래서 미리보기 호스트에서만
// 아래 "공개 읽기(GET)" 경로를 운영 주소로 대신 요청한다. 쓰기(POST/PUT/DELETE)와 관리자 경로는 건드리지 않는다.
// 운영 호스트(mantramanse.pages.dev)와 그 외 호스트에서는 아무 일도 하지 않는다(요청을 그대로 통과).
import { siteGate } from './_site-gate.js';
import { communityGate } from './_community.js';
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
export function withSecurity(request, res) {
  let p; try { p = new URL(request.url).pathname.replace(/\/{2,}/g, '/'); } catch { return res; }
  if (!res || !SECURE_PATH.test(p)) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
}

// 배포에서 뺄 경로(2026-11-25): 저장소 루트를 그대로 배포하므로, 서비스가 아닌 연구 자료 폴더는 누구에게도(관리자 포함) 내보내지 않는다.
//   /validation/… = 유명인 생애 데이터 검증 시스템(validation/celebrity). 대소문자·중복 슬래시·%인코딩 우회도 막는다.
export const PRIVATE_PATH = /^\/validation(\/|$)/i;
export function isPrivatePath(rawUrl) {
  let p; try { p = new URL(rawUrl).pathname; } catch { return false; }
  try { p = decodeURIComponent(p); } catch { /* 잘못된 인코딩은 원래 경로로 판정 */ }
  return PRIVATE_PATH.test(p.replace(/\\/g, '/').replace(/\/{2,}/g, '/'));
}
const notFound = () => new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

export async function onRequest(ctx) { if (isPrivatePath(ctx.request.url)) return notFound(); return withSecurity(ctx.request, await route(ctx)); }
async function route(ctx) {
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
