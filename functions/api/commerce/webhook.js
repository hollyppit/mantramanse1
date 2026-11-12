// POST /api/commerce/webhook — 포트원 결제 알림(웹훅). 포트원 관리자 콘솔 → 결제 연동 → 결제알림(Webhook) 관리에 이 주소를 넣는다.
// 사용자가 결제 직후 창을 닫아 복귀 확인을 못 해도, 포트원이 알려 주면 여기서 같은 방식으로 결제를 확인해 권한을 준다.
// 본문의 내용은 믿지 않는다: 결제 id(= 주문번호)만 꺼내 포트원 API 로 다시 조회한다(settlePortone).
// PORTONE_WEBHOOK_SECRET 이 있으면 서명도 확인한다(없으면 조회 방식만으로도 위조 결제는 통과하지 못한다).
import { json } from '../../_lib.js';
import { mailRefund, mailAdmin } from '../../_mail.js';
import { sbRest, supabaseReady, portoneReady, settlePortone, verifyPortoneWebhook, portoneCall, noteSignal } from '../../_commerce.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env) || !portoneReady(env)) return json({ error: 'not-configured' }, 503);
  const raw = await request.text(); if (raw.length > 20000) return json({ error: 'too-large' }, 413);
  const signed = env.PORTONE_WEBHOOK_SECRET ? await verifyPortoneWebhook(env.PORTONE_WEBHOOK_SECRET, request.headers, raw) : null;
  let b; try { b = JSON.parse(raw); } catch { b = null; }
  if (signed === false) return json({ error: 'bad-signature' }, 401);
  if (!b) return json({ error: 'bad-payload' }, 400);
  const paymentId = b && b.data && typeof b.data.paymentId === 'string' ? b.data.paymentId : '';
  // 우리 주문이 아닌 결제·결제 외 알림(빌링키 등)은 받았다고만 답한다(포트원이 재전송하지 않게)
  if (!/^mt\w{6,62}$/.test(paymentId) || !/^Transaction\./.test(String(b.type || ''))) return json({ ok: true, ignored: true });
  let order;
  try { order = (await sbRest(env, `commerce_orders?select=*&order_id=eq.${encodeURIComponent(paymentId)}`))[0]; } catch { return json({ error: 'commerce-unavailable' }, 503); }
  if (!order) return json({ ok: true, ignored: true });
  // 판매 준비 점검: 우리 주문에 대한 알림일 때만 '웹훅 수신'으로 기록(다른 요청으로 점검표가 속지 않게)
  await noteSignal(env, 'portone-webhook', { type: String(b.type || '').slice(0, 40) || null, signed });
  // 취소 알림: 관리자 화면 밖(포트원 콘솔)에서 취소한 결제도 권한을 회수한다
  if (b.type === 'Transaction.Cancelled' && order.status === 'paid') {
    const t = await portoneCall(env, `payments/${encodeURIComponent(paymentId)}?storeId=${encodeURIComponent(env.PORTONE_STORE_ID)}`);
    if (!t.ok || !t.data) return json({ error: 'portone-' + t.status }, 503);
    if (t.data.status !== 'CANCELLED') return json({ ok: true, ignored: true, status: t.data.status });   // 알림 본문이 아니라 포트원 조회 결과로 판단(부분 취소는 권한 유지)
    const at = new Date().toISOString();
    try {
      const changed = await sbRest(env, `commerce_orders?order_id=eq.${encodeURIComponent(paymentId)}&status=eq.paid`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ status: 'canceled', canceled_at: at, cancel_reason: '포트원 취소 알림' }) });
      if (Array.isArray(changed) && changed.length) { await mailRefund(env, order, at); await mailAdmin(env, 'refund', order, { reason: '포트원 취소 알림(콘솔 등 관리자 화면 밖에서 취소)' }); }
      await sbRest(env, `commerce_entitlements?order_id=eq.${encodeURIComponent(paymentId)}&revoked_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: at }) });
    } catch { return json({ error: 'commerce-unavailable' }, 503); }
    return json({ ok: true, canceled: true });
  }
  let r; try { r = await settlePortone(env, order); } catch { return json({ error: 'commerce-unavailable' }, 503); }
  // 일시 오류(포트원 조회 실패·기록 실패)만 5xx 로 돌려 포트원이 다시 보내게 한다
  if (!r.ok && (r.retry || r.error === 'grant-failed')) return json({ error: r.error }, 503);
  return json({ ok: true, result: r.ok ? 'paid' : r.error });
}
