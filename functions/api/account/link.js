// POST /api/account/link — 로그인 방법 연결(헤더 x-member-token). 흐름: functions/_account-link.js
//   { action: 'start', provider: 'kakao'|'google'|'naver' } → { ticket }   (지금 회원 = 합칠 대상 A)
//   { action: 'finish', ticket }                         → { session: { access_token, refresh_token } }   (지금 회원 = 방금 로그인한 B)
import { json } from '../../_lib.js';
import { memberOf, supabaseReady } from '../../_commerce.js';
import { startLink, finishLink } from '../../_account-link.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  try {
    if (b && b.action === 'start') { const r = await startLink(env, member.id, b.provider); return json(r, r.ok ? 200 : 400); }
    if (b && b.action === 'finish') {
      const r = await finishLink(env, b.ticket, member.id);
      const res = json(r.ok ? { ok: true, same: !!r.same, session: r.session || null, moved: r.moved || null } : { error: r.error, provider: r.provider || null }, r.ok ? 200 : 409);
      res.headers.set('cache-control', 'no-store');
      return res;
    }
  } catch (e) { return json({ error: 'link-failed' }, 500); }
  return json({ error: 'bad-action' }, 400);
}
