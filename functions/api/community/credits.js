// 인연의 광장 크레딧(6단계). 공용: functions/_credits.js · 표: supabase/migrations/20261116_credits_stage6.sql
// 회원
//   GET                                   → { enabled, balance, prices, history:[{ at, delta, label }], packs:[{ id, name, credits, price }], pay }   유료 스위치가 꺼져 있으면 { enabled:false }
//                                           packs: 판매 중인 크레딧 묶음(관리자 결제·상품에서 가격을 넣은 것). 결제는 /api/commerce/order → 포트원 → /api/commerce/confirm(심층 분석과 같은 결제 모듈)
//   POST { action:'more-picks', req }     → 오늘의 인연을 더 본다(크레딧 차감, 하루 횟수 제한, 더 볼 사람이 없으면 차감하지 않음) → { ok, added, balance }
// 관리자(Authorization: Bearer)
//   GET  ?view=admin                      → { config, recent:[…], totals }
//   PUT  { enabled, prices:{ morePicks, extraLike }, morePicksCount, morePicksPerDay }   유료 스위치·가격(정식으로 켜려면 confirm:'유료 켜기')
//   POST { action:'grant', email, amount, note }   테스트·보상 지급(음수면 회수). 감사 로그
import { json, isAdmin, sbRest, supabaseReady, viewer, readBody } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { audit, reviewerOf } from '../../_community.js';
import { kstDay } from '../../_daily.js';
import { verificationOf, candidatePool, pickToday } from '../../_match.js';
import { loadPremium, savePremium, balanceOf, spend, grant, REASON_LABEL, okReq } from '../../_credits.js';
import { loadProducts, payReady, payProvider } from '../../_commerce.js';

const enc = encodeURIComponent;

export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const view = new URL(request.url).searchParams.get('view');
  if (view === 'admin') {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    const [config, rows] = await Promise.all([loadPremium(env), sbRest(env, 'cm_credit_ledger?select=id,user_id,delta,reason,ref,by_actor,created_at&order=id.desc&limit=50')]);
    const ids = [...new Set((rows || []).map(r => r.user_id))];
    const ps = ids.length ? (await sbRest(env, `member_profiles?user_id=in.(${ids.map(enc).join(',')})&select=user_id,nickname`)) || [] : [];
    const N = Object.fromEntries(ps.map(p => [p.user_id, p.nickname]));
    const all = (await sbRest(env, 'cm_credit_ledger?select=delta,reason&limit=100000')) || [];
    const totals = all.reduce((o, r) => { o[r.reason] = (o[r.reason] || 0) + r.delta; return o; }, {});
    return json({ config, totals, recent: (rows || []).map(r => ({ id: r.id, who: N[r.user_id] || '이름 없는 회원', delta: r.delta, label: REASON_LABEL[r.reason] || r.reason, ref: r.ref, by: r.by_actor, at: r.created_at })) });
  }
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const prem = await loadPremium(env);
  if (!prem.enabled) return json({ enabled: false });
  const [balance, rows, products] = await Promise.all([balanceOf(env, me.id), sbRest(env, `cm_credit_ledger?user_id=eq.${enc(me.id)}&select=delta,reason,created_at&order=id.desc&limit=30`), loadProducts(env)]);
  const provider = payReady(env) ? payProvider(env) : null;
  const packs = provider ? products.filter(p => p.kind === 'credits' && p.active && p.price > 0).map(p => ({ id: p.id, name: p.name, credits: p.credits, price: p.price })) : [];
  const pay = provider === 'portone' ? { provider, storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_CHANNEL_KEY } : null;   // 공개 값만(결제창용)
  return json({ enabled: true, balance, prices: prem.prices, morePicksCount: prem.morePicksCount, packs: pay ? packs : [], pay, history: (rows || []).map(r => ({ at: r.created_at, delta: r.delta, label: REASON_LABEL[r.reason] || r.reason })) });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const before = await loadPremium(env);
  if (b.enabled === true && !before.enabled && b.confirm !== '유료 켜기') return json({ error: '유료 기능을 켜려면 확인 문구 "유료 켜기"를 함께 보내 주세요' }, 400);
  const config = await savePremium(env, { ...before, ...b, prices: { ...before.prices, ...(b.prices || {}) } });
  await audit(env, reviewerOf(request) || '관리자', 'community.premium.config', null, { from: before, to: config });
  return json({ ok: true, config });
}

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  if (b.action === 'grant') {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    const amount = Math.round(+b.amount); if (!amount || Math.abs(amount) > 1000) return json({ error: '지급할 크레딧 수(1~1000, 회수는 음수)를 넣어 주세요' }, 400);
    const r = await sbRest(env, 'rpc/community_user_by_email', { method: 'POST', body: JSON.stringify({ p_email: String(b.email || '') }) });
    const uid = typeof r === 'string' ? r : null; if (!uid) return json({ error: '그 이메일로 가입한 회원을 찾지 못했습니다' }, 404);
    const by = reviewerOf(request) || '관리자', note = String(b.note || '').trim().slice(0, 60) || null;
    const g = await grant(env, uid, amount, amount > 0 ? 'grant' : 'adjust', note, 'admin:' + crypto.randomUUID(), by);
    if (!g.ok) return json({ error: '지급하지 못했습니다' }, 400);
    await audit(env, by, 'community.credit.grant', uid, { amount, note });
    return json({ ok: true, balance: g.balance });
  }
  if (b.action === 'more-picks') {
    const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
    if (!requiredOk(await readConsents(env, me.id))) return json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409);
    const prem = await loadPremium(env); if (!prem.enabled) return json({ error: '지금은 이용할 수 없는 기능입니다', need: 'premium-off' }, 403);
    if (!okReq(b.req)) return json({ error: '잘못된 요청입니다' }, 400);
    const v = await verificationOf(env, me.id); if (!v) return json({ error: '성인 본인확인이 먼저 필요합니다', need: 'verify' }, 403);
    const mpR = await sbRest(env, `cm_match_profiles?user_id=eq.${enc(me.id)}&select=*`); const mp = Array.isArray(mpR) ? mpR[0] : null;
    if (!mp || !mp.active) return json({ error: '인연 프로필을 먼저 켜 주세요', need: 'match-profile' }, 409);
    const day = kstDay(), idem = 'mp:' + me.id + ':' + b.req;
    // 같은 요청을 다시 보내면(재시도·두 번 누르기) 처음 결과 그대로 — 차감·추가 없이
    const seen = await sbRest(env, `cm_credit_ledger?idem_key=eq.${enc(idem)}&select=id`);
    if (Array.isArray(seen) && seen.length) return json({ ok: true, added: 0, dup: true, balance: await balanceOf(env, me.id) });
    const used =(await sbRest(env, `cm_credit_ledger?user_id=eq.${enc(me.id)}&reason=eq.more_picks&ref=eq.${day}&select=id`)) || [];
    if (used.length >= prem.morePicksPerDay) return json({ error: '오늘은 더 보기를 모두 썼어요. 내일 새로운 인연이 찾아와요' }, 429);
    const pk = await sbRest(env, `cm_daily_picks?user_id=eq.${enc(me.id)}&day=eq.${day}&select=picks`); const cur = Array.isArray(pk) && pk[0] ? pk[0].picks || [] : [];
    const extra = pickToday(me.id + ':more' + used.length, mp, await candidatePool(env, me.id, mp, v, cur), day).slice(0, prem.morePicksCount);
    if (!extra.length) return json({ error: '지금은 조건이 맞는 새 인연이 없어요. 크레딧은 쓰지 않았어요', added: 0 }, 409);
    const sp = await spend(env, me.id, prem.prices.morePicks, 'more_picks', day, idem);
    if (!sp.ok) return json({ error: sp.error === 'insufficient' ? '크레딧이 부족해요' : '잠시 후 다시 시도해 주세요', need: sp.error === 'insufficient' ? 'credit-buy' : undefined, balance: sp.balance }, 402);
    if (!sp.dup) await sbRest(env, 'cm_daily_picks?on_conflict=user_id,day', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: me.id, day, picks: [...cur, ...extra] }) });
    return json({ ok: true, added: sp.dup ? 0 : extra.length, balance: sp.balance });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}
