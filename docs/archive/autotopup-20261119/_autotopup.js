// 인연의 광장 크레딧 자동 충전(정기결제). 표: supabase/migrations/20261119_credit_autotopup.sql · API: functions/api/community/autotopup.js
//   · 회원이 카드를 등록(포트원 빌링키 발급)하고 묶음·기준·월 한도를 고른다. 잔액이 기준 '미만'이 되면 그 묶음을 자동 결제한다.
//   · 결제는 기존 주문 흐름 그대로: commerce_orders(auto_topup=true) → 포트원 빌링키 결제 → settlePortone(서버 재조회·금액 확인·크레딧 지급·구매 메일)
//   · 안전장치: 광장 유료 스위치 꺼짐·묶음 판매 중지면 결제 안 함 · 한 달(KST) 최대 횟수 · 겹쳐 결제 방지 잠금(3분) · 연속 3번 실패하면 멈추고 메일
//   · 환경변수: PORTONE_BILLING_CHANNEL_KEY(정기결제용 채널 키, 공개 값). 없으면 자동 충전 기능 자체가 안 보인다.
//   · 빌링키는 서버에만 둔다(화면에 내려 보내지 않음). 해지·탈퇴하면 포트원에서도 지운다.
import { sbRest, supabaseReady, portoneReady, portoneCall, loadProducts, newOrderId, settlePortone, CREDIT_SAJU, CREDIT_PACKS } from './_commerce.js';
import { loadPremium, balanceOf } from './_credits.js';
import { mailAutoTopup } from './_mail.js';

const enc = encodeURIComponent;
export const AUTO_LOCK_MS = 3 * 60000, AUTO_MAX_FAILS = 3;
export const AUTO_DEFAULT = { packId: 'cr10', threshold: 3, monthlyLimit: 2 };
export const autoReady = env => !!(supabaseReady(env) && portoneReady(env) && env.PORTONE_BILLING_CHANNEL_KEY);

const int = (v, lo, hi) => { v = Math.round(+v); return Number.isFinite(v) && v >= lo && v <= hi ? v : null; };
// 화면이 보낸 설정 정리. 반환 null 이면 잘못된 값
export function cleanAuto(b) {
  if (!b || typeof b !== 'object') return null;
  const packId = CREDIT_PACKS[b.packId] ? b.packId : null, threshold = int(b.threshold, 0, 100), monthlyLimit = int(b.monthlyLimit, 1, 10);
  return packId && threshold != null && monthlyLimit != null ? { packId, threshold, monthlyLimit } : null;
}
// 이번 달(한국 시각) 1일 0시의 UTC ISO
export function kstMonthStart(now = Date.now()) {
  const k = new Date(now + 9 * 3600000);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - 9 * 3600000).toISOString();
}
export async function loadAuto(env, uid) {
  const r = await sbRest(env, `cm_autotopup?user_id=eq.${enc(uid)}&select=*`);
  return Array.isArray(r) && r[0] ? r[0] : null;
}
// 이번 달 자동 결제 횟수(실패·만료는 세지 않는다)
export async function usedThisMonth(env, uid, now = Date.now()) {
  const r = await sbRest(env, `commerce_orders?user_id=eq.${enc(uid)}&auto_topup=is.true&status=in.(pending,paid,canceled,partial_canceled)&created_at=gte.${enc(kstMonthStart(now))}&select=order_id`);
  return Array.isArray(r) ? r.length : 0;
}
// 회원 화면용(빌링키는 빼고)
export function publicAuto(s, used) {
  if (!s) return null;
  return { active: !!(s.active && s.billing_key), registered: !!s.billing_key, card: s.card_label || '등록한 카드', packId: s.pack_id, threshold: s.threshold, monthlyLimit: s.monthly_limit, usedThisMonth: used || 0, lastChargedAt: s.last_charged_at || null, stopped: !s.active && !!s.billing_key && s.fail_count >= AUTO_MAX_FAILS, lastError: s.last_error || null };
}

// ── 포트원 빌링키
// 발급된 빌링키가 이 회원 것인지 포트원에 다시 묻는다(화면이 보낸 값을 그대로 믿지 않는다)
export async function checkBillingKey(env, billingKey, uid) {
  if (!/^[\w-]{8,200}$/.test(String(billingKey || ''))) return { ok: false, error: 'bad-key' };
  const t = await portoneCall(env, `billing-keys/${enc(billingKey)}?storeId=${enc(env.PORTONE_STORE_ID)}`);
  if (!t.ok || !t.data) return { ok: false, error: t.status === 404 ? 'not-found' : 'portone-' + t.status };
  const d = t.data, cid = d.customer && d.customer.id;
  if (d.status && d.status !== 'ISSUED') return { ok: false, error: 'not-issued' };
  if (cid !== uid) return { ok: false, error: 'not-yours' };
  if (d.storeId && d.storeId !== env.PORTONE_STORE_ID) return { ok: false, error: 'not-yours' };
  return { ok: true, card: cardLabel(d) };
}
export function cardLabel(d) {
  const m = (d && Array.isArray(d.methods) ? d.methods : []).find(x => x && x.card) || null, c = m && m.card;
  if (!c) return '등록한 카드';
  const last = String(c.number || '').replace(/[^0-9]/g, '').slice(-4);
  return String(c.name || c.publisher || c.issuer || '카드').slice(0, 20) + (last.length === 4 ? ' ····' + last : '');
}
export async function deleteBillingKey(env, billingKey) {
  if (!billingKey) return true;
  const t = await portoneCall(env, `billing-keys/${enc(billingKey)}?storeId=${enc(env.PORTONE_STORE_ID)}`, { method: 'DELETE' });
  return t.ok || t.status === 404 || (t.data && /ALREADY_DELETED|NOT_FOUND/.test(String(t.data.type || '')));
}

const patchAuto = (env, uid, fields, cond = '') => sbRest(env, `cm_autotopup?user_id=eq.${enc(uid)}${cond}`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }) });

// ── 잔액이 기준 아래면 한 번 자동 결제. 크레딧을 쓴 직후(waitUntil)·등록 직후에 부른다.
// 반환 { charged:true, orderId } | { skipped:'이유' } | { failed:'이유' }
export async function maybeAutoTopup(env, uid, { now = Date.now() } = {}) {
  if (!autoReady(env) || !uid) return { skipped: 'not-ready' };
  let s = await loadAuto(env, uid);
  if (!s || !s.active || !s.billing_key) return { skipped: 'off' };
  if (!(await loadPremium(env)).enabled) return { skipped: 'premium-off' };
  const pack = (await loadProducts(env)).find(p => p.id === s.pack_id && p.kind === 'credits');
  if (!pack || !pack.active || !(pack.price > 0)) return { skipped: 'pack-off' };
  if ((await balanceOf(env, uid)) >= s.threshold) return { skipped: 'enough' };
  if ((await usedThisMonth(env, uid, now)) >= s.monthly_limit) return { skipped: 'limit' };
  // 잠금: 결제 중 표시가 없거나 3분 넘은 것일 때만 내가 잡는다(크레딧을 거의 동시에 두 번 써도 결제는 한 번)
  const lockAt = new Date(now).toISOString(), stale = new Date(now - AUTO_LOCK_MS).toISOString();
  const got = await patchAuto(env, uid, { charging_at: lockAt }, `&active=is.true&or=(charging_at.is.null,charging_at.lt.${enc(stale)})`);
  if (!Array.isArray(got) || !got.length) return { skipped: 'busy' };
  s = got[0];
  const release = fields => patchAuto(env, uid, { charging_at: null, ...fields }).catch(() => null);
  try {
    // 잠금을 잡은 뒤 다시 확인(방금 다른 요청이 충전을 끝냈을 수 있다)
    if ((await balanceOf(env, uid)) >= s.threshold) { await release({}); return { skipped: 'enough' }; }
    if ((await usedThisMonth(env, uid, now)) >= s.monthly_limit) { await release({}); return { skipped: 'limit' }; }
    const orderId = newOrderId();
    const order = { order_id: orderId, user_id: uid, saju_key: CREDIT_SAJU, saju_label: null, product_id: pack.id, product_name: pack.name + ' (자동 충전)', worlds: [], amount: pack.price, birth: null, auto_topup: true };
    await sbRest(env, 'commerce_orders', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(order) });
    const t = await portoneCall(env, `payments/${enc(orderId)}/billing-key`, { method: 'POST', body: JSON.stringify({ storeId: env.PORTONE_STORE_ID, billingKey: s.billing_key, orderName: order.product_name, customer: { id: uid }, amount: { total: pack.price }, currency: 'KRW' }) });
    if (!t.ok) {
      const why = String((t.data && (t.data.message || t.data.type)) || 'portone-' + t.status).slice(0, 120);
      await sbRest(env, `commerce_orders?order_id=eq.${enc(orderId)}&status=eq.pending`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', failure: ('billing:' + why).slice(0, 80) }) }).catch(() => null);
      const fails = (s.fail_count || 0) + 1, stop = fails >= AUTO_MAX_FAILS;
      await release({ fail_count: fails, last_error: why, ...(stop ? { active: false } : {}) });
      if (stop) await mailAutoTopup(env, uid, 'stopped', { ...s, last_error: why, price: pack.price, packName: pack.name }).catch(() => null);
      return { failed: why, stopped: stop };
    }
    const r = await settlePortone(env, { ...order, status: 'pending', created_at: lockAt });   // 서버 재조회 → 금액 확인 → 크레딧 지급·구매 메일
    await release(r.ok || r.pending ? { fail_count: 0, last_error: null, last_charged_at: lockAt } : { last_error: String(r.error || 'settle').slice(0, 120) });
    return r.ok ? { charged: true, orderId } : r.pending ? { charged: true, pending: true, orderId } : { failed: r.error };
  } catch (e) {
    await release({ last_error: String((e && e.message) || e).slice(0, 120) });
    return { failed: 'error' };
  }
}
// 크레딧을 쓴 뒤 응답과 따로 돌린다(실패해도 사용 요청에는 영향 없음)
export function afterSpend(env, uid, waitUntil) {
  if (!autoReady(env)) return;
  const p = maybeAutoTopup(env, uid).catch(() => null);
  if (typeof waitUntil === 'function') waitUntil(p);
}
