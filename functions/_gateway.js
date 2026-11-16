// 통합 첫 화면(게이트웨이 /gate/ — 심층 분석·인연의 광장 고르기) 열기·숨기기 스위치. 2026-11-16: 사용자가 쌓이고 인연의 광장 오픈 직전에 열기로 해 기본은 숨김.
// 저장: KV 'gateway:open' = { open, at, by } — 값이 없거나 읽기 실패면 숨김(open:false).
// 숨김일 때: 루트(/) 첫 방문은 /report/ 로(functions/_site-gate.js), /gate/ 를 직접 열어도 /report/ 로 보낸다.
//   예외(숨김이어도 첫 화면을 그대로 보여 준다): ?alert=…(출시 알림 메일의 철회 링크), ?community=…(광장 준비 중 안내), ?preview=1(관리자 미리 보기)
// 켜고 끄기: 관리자 → 커뮤니티 탭 ⓪ 처음 화면(/api/community/gateway PUT, 관리자 비밀번호만, 감사 로그)
export const GATEWAY_KEY = 'gateway:open';

export async function readGateway(env) {
  let d = null; try { d = env && env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(GATEWAY_KEY, 'json') : null; } catch { d = null; }
  return { open: !!(d && d.open === true), at: (d && d.at) || null, by: (d && d.by) || null };
}
export const gatewayOpen = async env => (await readGateway(env)).open;

const isGatePage = p => p === '/gate' || p === '/gate/' || p === '/gate/index.html';
// 미들웨어 첫 줄에서: 숨김이면 첫 화면 페이지 요청을 /report/ 로. 그 밖에는 null(통과)
export async function gatewayRedirect(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  let url; try { url = new URL(request.url); } catch { return null; }
  if (!isGatePage(url.pathname.replace(/\/{2,}/g, '/'))) return null;
  const q = url.searchParams;
  if (q.has('alert') || q.has('community') || q.get('preview') === '1') return null;
  if (await gatewayOpen(env)) return null;
  return new Response(null, { status: 302, headers: { 'cache-control': 'no-store', location: '/report/' } });
}
