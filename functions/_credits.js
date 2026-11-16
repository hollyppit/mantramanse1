// 인연의 광장 크레딧(6단계). 표·함수: supabase/migrations/20261116_credits_stage6.sql
//   · 유료 스위치 KV 'plaza:premium' — 기본 꺼짐. 꺼져 있으면 크레딧을 쓰는 기능은 화면에 나오지 않고 서버도 거절한다(유료 기능 무단 활성화 금지)
//   · 잔액 = 원장 합계. 사용은 DB 함수(cm_credit_spend)가 회원별 잠금 안에서 잔액 확인 후 차감 → 동시에 눌러도 마이너스가 되지 않는다
//   · 같은 요청은 멱등 키로 한 번만 처리(네트워크 재시도·두 번 누르기)
//   · 결제로 크레딧 사기(심층 분석 결제 모듈 연결)는 승인 후 다음 단계 — 지금은 관리자 지급(테스트)만
import { sbRest } from './_commerce.js';

export const PREMIUM_KEY = 'plaza:premium';
export const DEFAULT_PREMIUM = { enabled: false, prices: { morePicks: 3, extraLike: 1 }, morePicksCount: 3, morePicksPerDay: 2 };
const int = (v, lo, hi, d) => { v = Math.round(+v); return Number.isFinite(v) && v >= lo && v <= hi ? v : d; };
export function cleanPremium(c) {
  c = c && typeof c === 'object' ? c : {}; const p = c.prices || {};
  return { enabled: c.enabled === true, prices: { morePicks: int(p.morePicks, 1, 100, 3), extraLike: int(p.extraLike, 1, 100, 1) }, morePicksCount: int(c.morePicksCount, 1, 10, 3), morePicksPerDay: int(c.morePicksPerDay, 0, 10, 2) };
}
export async function loadPremium(env) {
  let d = null; try { d = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(PREMIUM_KEY, 'json') : null; } catch { d = null; }
  return cleanPremium(d || DEFAULT_PREMIUM);
}
export async function savePremium(env, c) { const v = cleanPremium(c); await env.GLOSSARY_KV.put(PREMIUM_KEY, JSON.stringify(v)); return v; }

export async function balanceOf(env, uid) { const r = await sbRest(env, 'rpc/cm_credit_balance', { method: 'POST', body: JSON.stringify({ p_user: uid }) }); return typeof r === 'number' ? r : +r || 0; }
// 반환 { ok, balance, dup } | { ok:false, error:'insufficient'|…, balance }
export async function spend(env, uid, amount, reason, ref, idem) { return (await sbRest(env, 'rpc/cm_credit_spend', { method: 'POST', body: JSON.stringify({ p_user: uid, p_amount: amount, p_reason: reason, p_ref: ref || null, p_idem: idem }) })) || { ok: false }; }
export async function grant(env, uid, amount, reason, ref, idem, by) { return (await sbRest(env, 'rpc/cm_credit_grant', { method: 'POST', body: JSON.stringify({ p_user: uid, p_amount: amount, p_reason: reason, p_ref: ref || null, p_idem: idem, p_by: by || null }) })) || { ok: false }; }
export const REASON_LABEL = { grant: '지급', purchase: '구매', refund: '환불', more_picks: '오늘의 인연 더 보기', extra_like: '추가 인연 잇기', adjust: '조정' };
export const okReq = v => /^[A-Za-z0-9_-]{8,64}$/.test(String(v || ''));   // 화면이 만든 요청 번호(멱등 키 재료)
