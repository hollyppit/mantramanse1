// 이용 기간 만료 30일 전 알림톡. 2026-11-27  POST /api/commerce/expiry-notice
// 부르는 쪽: Supabase pg_cron(매일 10시) — 머리말 x-cron-key = Secret CRON_SECRET. 관리자 Bearer 도 된다(수동 실행).
// 대상: 결제 완료 주문 중 이용 기간(결제일 + 12개월)이 30일 안에 끝나고 아직 안 알린 것. 먼저 expiry_noticed_at 을 찍고(한 번만) 번호가 있으면 보낸다.
import { json, isAdmin } from '../../_lib.js';
import { sbRest, supabaseReady, accessSince } from '../../_commerce.js';
import { noticeReady, noticeExpire } from '../../_notice.js';

const BEFORE_DAYS = 30, LIMIT = 100;
const sameKey = async (a, b) => {
  if (!a || !b) return false;
  const h = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))));
  const [x, y] = await Promise.all([h(a), h(b)]); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0;
};

export async function onRequestPost({ request, env }) {
  const cron = String(env.CRON_SECRET || '');
  if (!isAdmin(request, env) && !(cron.length >= 24 && await sameKey(request.headers.get('x-cron-key'), cron))) return json({ error: 'unauthorized' }, 401);
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  if (!noticeReady(env, 'expire')) return json({ ok: true, skipped: 'template-not-set', checked: 0, sent: 0 });
  const now = Date.now();
  const from = accessSince(now), to = accessSince(now + BEFORE_DAYS * 864e5);   // 결제일이 이 사이면 만료가 지금~30일 뒤
  const rows = (await sbRest(env, `commerce_orders?select=order_id,user_id,product_name,paid_at&status=eq.paid&expiry_noticed_at=is.null&paid_at=gt.${encodeURIComponent(from)}&paid_at=lte.${encodeURIComponent(to)}&order=paid_at.asc&limit=${LIMIT}`)) || [];
  let sent = 0, marked = 0;
  for (const o of rows) {
    const got = await sbRest(env, `commerce_orders?order_id=eq.${encodeURIComponent(o.order_id)}&expiry_noticed_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ expiry_noticed_at: new Date().toISOString() }) });
    if (!Array.isArray(got) || !got.length) continue;   // 다른 실행이 먼저 찍었다
    marked++;
    if (await noticeExpire(env, o)) sent++;
  }
  return json({ ok: true, checked: rows.length, marked, sent });
}
