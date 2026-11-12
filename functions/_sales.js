// 매출 요약·CSV(관리자). 테스트 주문(is_test)은 기본으로 뺀다. 날짜는 한국 시간(KST) 기준.
// 매출 = 그 기간에 결제된 주문(지금 결제 완료든, 뒤에 환불됐든). 환불 = 그 기간에 취소된 주문. 실매출 = 매출 - 환불.
// 가격은 부가세 포함이라 CSV 에 공급가액(금액 ÷ 1.1, 반올림)·부가세(나머지)를 함께 적는다.
import { sbRest } from './_commerce.js';

const KST = 9 * 3600000;
// KST 의 오늘·이번 주(월요일부터)·이번 달 [시작, 다음 시작) 을 UTC ISO 로
export function kstRanges(now = Date.now()) {
  const k = new Date(now + KST), y = k.getUTCFullYear(), m = k.getUTCMonth(), d = k.getUTCDate(), wd = (k.getUTCDay() + 6) % 7;
  const at = (yy, mm, dd) => new Date(Date.UTC(yy, mm, dd) - KST).toISOString();
  return {
    today: { from: at(y, m, d), to: at(y, m, d + 1), label: '오늘' },
    week: { from: at(y, m, d - wd), to: at(y, m, d - wd + 7), label: '이번 주' },
    month: { from: at(y, m, 1), to: at(y, m + 1, 1), label: '이번 달' },
  };
}
// 'YYYY-MM-DD' (KST) → UTC ISO. to 는 그날 끝(다음 날 0시)
export function kstDay(s, end = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (end ? 1 : 0)) - KST).toISOString();
}
const enc = encodeURIComponent;
const FIELDS = 'order_id,product_id,product_name,amount,status,method,payment_key,saju_label,created_at,paid_at,canceled_at,cancel_reason,is_test';
async function paidIn(env, from, to, withTest) {
  return (await sbRest(env, `commerce_orders?select=${FIELDS}&paid_at=gte.${enc(from)}&paid_at=lt.${enc(to)}${withTest ? '' : '&is_test=eq.false'}&order=paid_at.asc&limit=5000`)) || [];
}
async function canceledIn(env, from, to, withTest) {
  return (await sbRest(env, `commerce_orders?select=${FIELDS}&canceled_at=gte.${enc(from)}&canceled_at=lt.${enc(to)}${withTest ? '' : '&is_test=eq.false'}&limit=5000`)) || [];
}
export async function summarize(env, from, to) {
  const [sold, refunded] = await Promise.all([paidIn(env, from, to, false), canceledIn(env, from, to, false)]);
  const products = {};
  for (const o of sold) { const p = products[o.product_id] = products[o.product_id] || { name: o.product_name, count: 0, amount: 0 }; p.count++; p.amount += o.amount; }
  const gross = sold.reduce((s, o) => s + o.amount, 0), refund = refunded.reduce((s, o) => s + o.amount, 0);
  return { orders: sold.length, gross, refunds: refunded.length, refundAmount: refund, net: gross - refund, products };
}
export async function summaryAll(env, now) {
  const r = kstRanges(now), out = {};
  for (const [k, v] of Object.entries(r)) out[k] = { label: v.label, ...(await summarize(env, v.from, v.to)) };
  return out;
}

const kstText = t => { if (!t) return ''; const d = new Date(Date.parse(t) + KST); return d.toISOString().slice(0, 19).replace('T', ' '); };
const STATUS = { paid: '결제 완료', canceled: '환불(취소)', partial_canceled: '부분 환불', pending: '결제 대기', failed: '실패' };
const cell = v => { const s = String(v == null ? '' : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
// 기간에 결제되었거나 환불된 주문(중복 없이) → CSV(엑셀용 BOM 포함)
export async function salesCsv(env, from, to, withTest = false) {
  const [sold, refunded] = await Promise.all([paidIn(env, from, to, withTest), canceledIn(env, from, to, withTest)]);
  const seen = new Set(), rows = [];
  for (const o of [...sold, ...refunded]) { if (seen.has(o.order_id)) continue; seen.add(o.order_id); rows.push(o); }
  rows.sort((a, b) => String(a.paid_at || a.created_at).localeCompare(String(b.paid_at || b.created_at)));
  const head = ['주문번호', '결제 일시(KST)', '상품', '결제 금액', '공급가액', '부가세', '상태', '환불 일시(KST)', '환불 사유', '결제 수단', '결제사', '사주 이름표', '테스트'];
  const lines = [head.join(',')];
  for (const o of rows) {
    const supply = Math.round(o.amount / 1.1), vat = o.amount - supply;
    lines.push([o.order_id, kstText(o.paid_at), o.product_name, o.amount, supply, vat, STATUS[o.status] || o.status, kstText(o.canceled_at), o.cancel_reason || '', o.method || '',
      String(o.payment_key || '').startsWith('portone:') ? '포트원' : o.payment_key ? '토스' : '', o.saju_label || '', o.is_test ? '예' : ''].map(cell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
