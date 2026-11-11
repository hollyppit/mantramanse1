// POST /api/account/logins — 지금 회원의 로그인 방법과 안내(헤더 x-member-token).
// 응답: { current, linked: ['kakao','google','naver' 중 연결된 것], hasPurchases, suggest: { provider, hasPurchases } | null }
//   suggest: 구매 내역이 없는데 같은 이메일로 다른 방법에 가입한 회원이 있으면 그 방법(합치려면 그 방법으로 로그인해 연결)
import { json } from '../../_lib.js';
import { memberOf, supabaseReady } from '../../_commerce.js';
import { adminUser, loginsOf, hasPurchases, suggestionFor } from '../../_account-link.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  const user = await adminUser(env, member.id); if (!user) return json({ error: 'member-missing' }, 404);
  const [linked, purchases] = await Promise.all([loginsOf(env, user), hasPurchases(env, user.id)]);
  const suggest = purchases ? null : await suggestionFor(env, user);
  return json({ current: member.provider || linked[0] || null, linked, hasPurchases: purchases, suggest });
}
