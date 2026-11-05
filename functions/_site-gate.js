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

// 잠금 대상이 아니면 null, 막아야 하면 Response 를 돌려준다.
export async function siteGate(request, env) {
  const pw = env && typeof env.SITE_GATE_PASSWORD === 'string' ? env.SITE_GATE_PASSWORD : '';
  if (!pw) return null;
  const url = new URL(request.url);
  const token = await tokenFor(pw);

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

  if (url.pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'site locked' }), { status: 401, headers: { ...HDR, 'content-type': 'application/json' } });
  return new Response(page(url.pathname + url.search, false), { status: 401, headers: { ...HDR, 'content-type': 'text/html; charset=utf-8' } });
}
