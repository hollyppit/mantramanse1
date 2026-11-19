// 인연의 광장 크레딧 자동 충전(정기결제). 공용: functions/_autotopup.js · 표: supabase/migrations/20261119_credit_autotopup.sql
// 회원
//   GET                                              → { available, pay:{ storeId, channelKey }, packs, defaults, setting|null }   빌링키는 내려 보내지 않는다
//   POST { action:'register', billingKey, packId, threshold, monthlyLimit, agree:true }
//        화면이 포트원 빌링키 발급 창(PortOne.requestIssueBillingKey)으로 받은 키를 서버가 포트원에 다시 조회해 이 회원 것인지 확인한 뒤 저장.
//        예전 카드가 있으면 포트원에서 지운다. 지금 잔액이 기준 미만이면 바로 1회 충전한다(화면에 미리 알림).
//   POST { action:'update', packId, threshold, monthlyLimit, active }   카드는 그대로 두고 조건만 바꾸거나 잠시 끔/다시 켬
//   POST { action:'cancel' }                         해지: 포트원 빌링키 삭제 → 더 이상 결제하지 않음
// 관리자(Authorization: Bearer)
//   GET ?view=admin                                  → { ready, active, stopped, thisMonth:{ count, amount } }
import { json, isAdmin, sbRest, supabaseReady, viewer, readBody } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { verificationOf } from '../../_match.js';
import { loadPremium } from '../../_credits.js';
import { loadProducts } from '../../_commerce.js';
import { autoReady, loadAuto, usedThisMonth, publicAuto, cleanAuto, checkBillingKey, deleteBillingKey, maybeAutoTopup, kstMonthStart, AUTO_DEFAULT } from '../../_autotopup.js';
import { mailAutoTopup } from '../../_mail.js';
import { audit } from '../../_community.js';

const enc = encodeURIComponent;
const sellable = products => products.filter(p => p.kind === 'credits' && p.active && p.price > 0).map(p => ({ id: p.id, name: p.name, credits: p.credits, price: p.price }));
const mailInfo = (s, pack) => ({ card_label: s.card_label, packName: pack ? pack.name : s.pack_id, price: pack ? pack.price : 0, threshold: s.threshold, monthly_limit: s.monthly_limit, last_error: s.last_error });

export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  if (new URL(request.url).searchParams.get('view') === 'admin') {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    const rows = (await sbRest(env, 'cm_autotopup?select=active,billing_key,fail_count&limit=100000').catch(() => [])) || [];
    const paid = (await sbRest(env, `commerce_orders?auto_topup=is.true&status=eq.paid&is_test=is.false&paid_at=gte.${enc(kstMonthStart())}&select=amount`).catch(() => [])) || [];
    return json({ ready: autoReady(env), active: rows.filter(r => r.active && r.billing_key).length, stopped: rows.filter(r => !r.active && r.billing_key && r.fail_count >= 3).length, thisMonth: { count: paid.length, amount: paid.reduce((t, r) => t + (+r.amount || 0), 0) } });
  }
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const prem = await loadPremium(env);
  if (!prem.enabled || !autoReady(env)) return json({ available: false });
  const [s, products] = await Promise.all([loadAuto(env, me.id), loadProducts(env)]);
  const packs = sellable(products);
  return json({ available: packs.length > 0, pay: { storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_BILLING_CHANNEL_KEY }, customerId: me.id, packs, defaults: AUTO_DEFAULT, setting: publicAuto(s, s ? await usedThisMonth(env, me.id) : 0) });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  if (!autoReady(env)) return json({ error: '지금은 자동 충전을 쓸 수 없어요', need: 'not-ready' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const later = p => { const q = p.catch(() => null); if (typeof waitUntil === 'function') waitUntil(q); };

  if (b.action === 'cancel') {
    const s = await loadAuto(env, me.id); if (!s || !s.billing_key) return json({ ok: true, setting: publicAuto(s, 0) });
    const del = await deleteBillingKey(env, s.billing_key).catch(() => false);
    if (!del) return json({ error: '카드 정보를 지우지 못했어요. 잠시 후 다시 시도해 주세요' }, 502);
    const r = await sbRest(env, `cm_autotopup?user_id=eq.${enc(me.id)}`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ billing_key: null, active: false, charging_at: null, updated_at: new Date().toISOString() }) });
    const pack = (await loadProducts(env)).find(p => p.id === s.pack_id);
    later(mailAutoTopup(env, me.id, 'off', mailInfo(s, pack)));
    await audit(env, 'member', 'community.autotopup.cancel', me.id, {}).catch(() => null);
    return json({ ok: true, setting: publicAuto(Array.isArray(r) ? r[0] : null, 0) });
  }

  // 등록·변경은 크레딧을 살 수 있는 회원만(광장 유료 스위치 · 이용 동의 · 성인 본인확인 · 판매 중인 묶음)
  if (!(await loadPremium(env)).enabled) return json({ error: '지금은 이용할 수 없는 기능입니다', need: 'premium-off' }, 403);
  if (!requiredOk(await readConsents(env, me.id))) return json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409);
  if (!(await verificationOf(env, me.id))) return json({ error: '성인 본인확인이 먼저 필요합니다', need: 'verify' }, 403);
  const c = cleanAuto(b); if (!c) return json({ error: '충전 묶음·기준·한 달 횟수를 다시 골라 주세요' }, 400);
  const pack = sellable(await loadProducts(env)).find(p => p.id === c.packId); if (!pack) return json({ error: '지금 판매하지 않는 묶음이에요' }, 400);
  const now = new Date().toISOString();

  if (b.action === 'register') {
    if (b.agree !== true) return json({ error: '자동 결제에 동의해 주세요' }, 400);
    const chk = await checkBillingKey(env, b.billingKey, me.id).catch(() => ({ ok: false, error: 'portone' }));
    if (!chk.ok) return json({ error: chk.error === 'not-yours' ? '확인할 수 없는 카드 정보예요' : '카드 등록을 확인하지 못했어요. 다시 시도해 주세요' }, 400);
    const old = await loadAuto(env, me.id);
    const row = { user_id: me.id, billing_key: b.billingKey, card_label: chk.card, pack_id: c.packId, threshold: c.threshold, monthly_limit: c.monthlyLimit, active: true, fail_count: 0, last_error: null, charging_at: null, agreed_at: now, updated_at: now };
    const r = await sbRest(env, 'cm_autotopup?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(row) });
    if (old && old.billing_key && old.billing_key !== b.billingKey) later(deleteBillingKey(env, old.billing_key));   // 예전 카드는 포트원에서 지운다
    later(mailAutoTopup(env, me.id, 'on', mailInfo(row, pack)));
    await audit(env, 'member', 'community.autotopup.register', me.id, { pack: c.packId, threshold: c.threshold, monthlyLimit: c.monthlyLimit }).catch(() => null);
    const first = await maybeAutoTopup(env, me.id).catch(() => ({ failed: 'error' }));   // 지금 잔액이 기준 미만이면 바로 1회
    return json({ ok: true, charged: !!first.charged, failed: first.failed || null, setting: publicAuto(Array.isArray(r) ? r[0] : row, await usedThisMonth(env, me.id)) });
  }

  if (b.action === 'update') {
    const s = await loadAuto(env, me.id); if (!s || !s.billing_key) return json({ error: '먼저 카드를 등록해 주세요', need: 'register' }, 409);
    const active = b.active !== false;
    const fields = { pack_id: c.packId, threshold: c.threshold, monthly_limit: c.monthlyLimit, active, updated_at: now, ...(active && !s.active ? { fail_count: 0, last_error: null, agreed_at: now } : {}) };
    const r = await sbRest(env, `cm_autotopup?user_id=eq.${enc(me.id)}`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify(fields) });
    const next = Array.isArray(r) && r[0] ? r[0] : { ...s, ...fields };
    if (active) later(mailAutoTopup(env, me.id, 'on', mailInfo(next, pack)));
    await audit(env, 'member', 'community.autotopup.update', me.id, { pack: c.packId, threshold: c.threshold, monthlyLimit: c.monthlyLimit, active }).catch(() => null);
    const first = active ? await maybeAutoTopup(env, me.id).catch(() => ({ failed: 'error' })) : {};
    return json({ ok: true, charged: !!first.charged, setting: publicAuto(next, await usedThisMonth(env, me.id)) });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}
