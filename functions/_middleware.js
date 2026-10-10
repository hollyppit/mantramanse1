// 미리보기 배포 전용: 영상·이미지·프롤로그 설정을 운영에서 읽기 전용으로 가져온다.
// Cloudflare Pages 의 미리보기(브랜치) 배포는 운영과 별도의 빈 KV/R2 를 써서 영상이 하나도 안 뜬다. 그래서 미리보기 호스트에서만
// 아래 "공개 읽기(GET)" 경로를 운영 주소로 대신 요청한다. 쓰기(POST/PUT/DELETE)와 관리자 경로는 건드리지 않는다.
// 운영 호스트(mantramanse.pages.dev)와 그 외 호스트에서는 아무 일도 하지 않는다(요청을 그대로 통과).
const PROD = 'https://mantramanse.pages.dev';
const PREVIEW_HOST = /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i;
// /api/worlds 는 일부러 뺐다(운영에 아직 없고, 미리보기 관리자 저장본을 확인해야 하므로).
const READ_ONLY = /^\/api\/(prologue|awakening|assets|clipfile|media|report-content|story|intro|clips)$/;
const PASS = ['content-type', 'content-range', 'accept-ranges', 'content-length', 'cache-control', 'etag', 'last-modified'];

export const proxiesToProd = (host, method, pathname) => method === 'GET' && PREVIEW_HOST.test(host) && READ_ONLY.test(pathname);

export async function onRequest(ctx) {
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
