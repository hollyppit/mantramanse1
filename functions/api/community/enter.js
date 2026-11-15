// POST   /api/community/enter — 커뮤니티 입장 쿠키 발급. 관리자(Authorization) 또는 회원(x-member-token)만.
//   통과: { ok, role, to:'/community/' } + Set-Cookie mt_cm(HttpOnly, 12시간)
//   로그인 필요: 401 { need:'login' } · 초대되지 않음: 403 { stage, reason:'not-invited' }
//   필수 동의 전(회원): 409 { need:'consent', docs } → 화면에서 이용약관·개인정보 동의 후 다시 요청(2단계, functions/_consent.js)
// DELETE /api/community/enter — 입장 쿠키 지우기(나가기)
import { readConsents, requiredOk, docsPublic } from '../../_consent.js';
import { json, readStage, requesterRole, roleAllowed, makeCookie, setCookieHeader, clearCookieHeader, STAGE_LABEL } from '../../_community.js';

export async function onRequestPost({ request, env }) {
  const { stage } = await readStage(env);
  const who = await requesterRole(request, env);
  if (!who) return json({ error: '로그인이 필요합니다', need: 'login', stage }, 401);
  if (!roleAllowed(who.role, stage)) return json({ error: `커뮤니티는 지금 ${STAGE_LABEL[stage]} 단계라 초대된 분만 들어갈 수 있습니다`, stage, reason: 'not-invited' }, 403);
  if (who.role !== 'admin') {
    let ok = false; try { ok = requiredOk(await readConsents(env, who.who)); } catch { ok = false; }
    if (!ok) return json({ error: '운명의 광장을 이용하려면 이용약관과 개인정보 수집·이용에 동의해 주세요', need: 'consent', stage, docs: docsPublic().filter(d => d.required) }, 409);
  }
  const value = await makeCookie(env, who.role, who.who);
  if (!value) return json({ error: '입장 열쇠를 만들 수 없습니다(서버 설정 확인 필요)' }, 500);
  const secure = new URL(request.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true, role: who.role, stage, to: '/community/' }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': setCookieHeader(value, secure) } });
}

export async function onRequestDelete({ request }) {
  const secure = new URL(request.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': clearCookieHeader(secure) } });
}
