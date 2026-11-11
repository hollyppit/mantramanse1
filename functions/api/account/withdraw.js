// POST /api/account/withdraw — 로그인한 회원이 직접 탈퇴한다(헤더 x-member-token, 본문 { confirm: '탈퇴' }).
// 처리 내용: functions/_account.js withdraw()
import { json } from '../../_lib.js';
import { memberOf, supabaseReady } from '../../_commerce.js';
import { withdraw } from '../../_account.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let b; try { b = await request.json(); } catch { b = null; }
  if (!b || b.confirm !== '탈퇴') return json({ error: 'confirm-required' }, 400);   // 화면에서 확인 문구를 받은 요청만
  let r; try { r = await withdraw(env, member.id); } catch { return json({ error: 'withdraw-failed' }, 500); }
  if (!r.ok) return json({ error: 'withdraw-failed' }, 500);
  return json({ ok: true, orders: r.orders });
}
