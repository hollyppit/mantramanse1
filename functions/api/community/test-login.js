// 관리자 테스트 회원으로 인연의 광장 들어가기. 공용: functions/_testers.js
// POST { as:'a'|'b' }  (관리자 비밀번호) → 테스트 회원 준비 + 관리자 입장 쿠키 + 일회용 로그인 코드
//                       → { ok, code, to:'/report/auth-return.html?to=/community/&admin_login=<code>', tester:{ slot, label } }
// POST { code }        (/report/auth-return.html 이 부름) → { access_token, refresh_token } — 코드는 1분·한 번만
import { json, readBody, isAdmin } from '../../_plaza.js';
import { audit, reviewerOf, makeCookie, setCookieHeader } from '../../_community.js';
import { TESTERS, ensureTester, testerLoginCode, claimTesterLogin } from '../../_testers.js';

export async function onRequestPost({ request, env }) {
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  if (b.code) {
    const s = await claimTesterLogin(env, b.code);
    if (!s) return json({ error: '로그인 코드가 지났거나 이미 썼습니다. 관리자 화면에서 다시 열어 주세요' }, 410);
    return json({ access_token: s.access_token, refresh_token: s.refresh_token, slot: s.slot });
  }
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!TESTERS[b.as]) return json({ error: "테스트 회원은 'a' 또는 'b' 입니다" }, 400);
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  let t, code;
  try { t = await ensureTester(env, b.as); code = await testerLoginCode(env, b.as); }
  catch (e) { return json({ error: '테스트 회원을 준비하지 못했습니다(' + String((e && e.message) || e).slice(0, 60) + ')' }, 502); }
  await audit(env, reviewerOf(request) || '관리자', 'community.tester.login', t.label, { slot: b.as });
  const cookie = await makeCookie(env, 'admin', 'admin'), secure = new URL(request.url).protocol === 'https:';
  const to = '/report/auth-return.html?to=' + encodeURIComponent('/community/') + '&admin_login=' + code;
  return new Response(JSON.stringify({ ok: true, code, to, tester: { slot: b.as, label: t.label } }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(cookie ? { 'set-cookie': setCookieHeader(cookie, secure) } : {}) } });
}
