// 사이트 전체 비밀번호 잠금(오픈 전용).
// Cloudflare Pages 환경변수 SITE_GATE_PASSWORD 가 있으면 잠기고, 없거나 비어 있으면 아무 일도 하지 않는다(= 오픈).
// 오픈할 때는 그 환경변수만 지우면 된다. 코드 변경·재배포 필요 없음(다음 요청부터 바로 적용).
const COOKIE = 'mantra_gate';
const MAX_AGE = 60 * 60 * 24 * 30;
const LOGIN_PATH = '/__gate';

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export const tokenFor = pw => sha('mantra-site-gate:v1:' + pw);
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const getCookie = (req, name) => { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')); return m ? m[1] : ''; };
const safeNext = n => (typeof n === 'string' && /^\/(?!\/|\\)/.test(n) && !n.startsWith(LOGIN_PATH)) ? n : '/';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const page = (next, bad) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>만트라 만세력</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f5f1;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1c1c1e}
form{background:#fff;border-radius:18px;padding:28px 24px;width:min(340px,88vw);box-shadow:0 6px 28px rgba(0,0,0,.08)}h1{font-size:19px;margin:0 0 6px}p{font-size:13.5px;color:#666;margin:0 0 16px;line-height:1.5}
input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d8d6ce;border-radius:10px;font-size:16px}button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:#1c1c1e;color:#fff;font-size:15px;font-weight:600}
.e{color:#c0392b;font-size:13px;margin-top:10px}@media(prefers-color-scheme:dark){body{background:#151515;color:#eee}form{background:#222}p{color:#aaa}input{background:#151515;color:#eee;border-color:#444}button{background:#eee;color:#111}}</style></head>
<body><form method="post" action="${LOGIN_PATH}"><h1>만트라 만세력</h1><p>오픈 준비 중입니다. 비밀번호를 입력해 주세요.</p>
<input type="hidden" name="next" value="${esc(next)}"><input type="password" name="pw" placeholder="비밀번호" autocomplete="current-password" autofocus required><button type="submit">들어가기</button>${bad ? '<div class="e">비밀번호가 맞지 않습니다.</div>' : ''}</form></body></html>`;

const HDR = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

// 무빙툰만 공개(2026-11-10): 환경변수 SITE_GATE_REPORT_PUBLIC=1 이면 비밀번호는 그대로 두고 아래만 연다.
//   열림: /report/ 페이지(관리자 /report/admin 제외), 모든 /api/*(관리자 쓰기는 각 API 가 관리자 토큰으로 따로 막는다), HTML 이 아닌 정적 파일(js·css·이미지·글꼴)
//   잠김: 만세력 화면(루트 / · /index.html · 그 밖의 .html)과 /report/admin — 쿠키 없는 방문자가 루트로 오면 /report/ 로 보낸다
// 변수를 지우면 다시 사이트 전체 잠금. 코드 배포 없이 Cloudflare 환경변수로만 켜고 끈다.
const reportPublicOn = env => !!(env && /^(1|true|on)$/i.test(String(env.SITE_GATE_REPORT_PUBLIC || '')));
export function publicPath(pathname) {
  const p = pathname.replace(/\/{2,}/g, '/');
  if (/^\/report\/admin(\/|$)/i.test(p)) return false;
  if (p === '/report' || p.startsWith('/report/')) return true;
  if (p.startsWith('/api/')) return true;
  if (p === '/' || /\.html?$/i.test(p) || !/\.[a-z0-9]+$/i.test(p)) return false;   // 루트·HTML·확장자 없는 경로(만세력 화면)는 잠금
  return true;   // 확장자가 있는 정적 파일(engine.js·feature-flags.js·이미지 등)은 무빙툰이 함께 쓴다
}

// 잠금 대상이 아니면 null, 막아야 하면 Response 를 돌려준다.
export async function siteGate(request, env) {
  const pw = env && typeof env.SITE_GATE_PASSWORD === 'string' ? env.SITE_GATE_PASSWORD : '';
  if (!pw) return null;
  const url = new URL(request.url);
  const token = await tokenFor(pw);
  const reportPublic = reportPublicOn(env);
  // 약관·개인정보처리방침·환불정책(/report/legal/)은 사이트가 잠겨 있어도 언제나 공개(결제사·로그인 심사가 볼 수 있게)
  if (/^\/report\/legal\/[\w.-]*$/.test(url.pathname)) return null;
  // 상품 안내 페이지가 가격을 읽는 공개 API(판매 상품·가격·설정 여부만 돌려준다)도 잠금 중 공개
  if (url.pathname === '/api/commerce/access' && request.method === 'POST') return null;
  if (reportPublic && url.pathname !== LOGIN_PATH && publicPath(url.pathname)) return null;

  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    let f; try { f = await request.formData(); } catch (e) { f = null; }
    const given = f ? String(f.get('pw') || '') : '', next = safeNext(f ? f.get('next') : '/');
    if (given && same(await tokenFor(given), token)) {
      const secure = url.protocol === 'https:' ? '; Secure' : '';
      return new Response(null, { status: 303, headers: { ...HDR, location: next, 'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}` } });
    }
    return new Response(page(next, true), { status: 401, headers: { ...HDR, 'content-type': 'text/html; charset=utf-8' } });
  }

  if (same(getCookie(request, COOKIE), token)) return null;

  // 무빙툰 공개 모드에서 쿠키 없이 만세력 첫 화면으로 온 방문자는 무빙툰으로 보낸다(관리자는 /__gate 로 들어오면 그대로 잠금 화면)
  if (reportPublic && request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return new Response(null, { status: 302, headers: { ...HDR, location: '/report/' } });

  if (url.pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'site locked' }), { status: 401, headers: { ...HDR, 'content-type': 'application/json' } });
  return new Response(page(url.pathname + url.search, false), { status: 401, headers: { ...HDR, 'content-type': 'text/html; charset=utf-8' } });
}
