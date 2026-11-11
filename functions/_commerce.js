// 무빙툰(/report/) 회원 결제 공용 모듈. 파일명이 _ 로 시작해 라우트로 노출되지 않는다.
// 계획: docs/PAYMENT_PLAN_2026-11-10.md · 테이블: supabase/migrations/20261110_commerce.sql
//
// 잠금 규칙(한 곳):
//   1) 세계(world)가 관리자 세계 설정에서 '유료'(access: 'paid')일 때만 잠근다. 저장본이 없거나 '무료'면 아무것도 잠그지 않는다.
//   2) 장 → 세계는 서버 카탈로그의 topicId 로 정한다(브라우저가 보낸 값은 믿지 않는다). TOPIC_WORLD 참고.
//   3) 각 세계의 무료 장 = 그 주제의 활성 장 중 order 가 가장 작은 장.
//   4) 관리자(Authorization: Bearer 관리자 비밀번호)는 잠금 없이 본다. 단 x-view-as: free 를 보내면 무료 사용자처럼 본다.
//   5) 회원은 x-member-token(Supabase 로그인 토큰)으로 확인하고, 회원 × 사주 × 세계 구매 권한이 있으면 연다.
//
// 필요한 환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY(서버 전용), SUPABASE_ANON_KEY(공개, 브라우저 로그인용),
//                 결제사 하나: 포트원(PORTONE_STORE_ID·PORTONE_CHANNEL_KEY·PORTONE_API_SECRET) 또는 토스(TOSS_SECRET_KEY·TOSS_CLIENT_KEY).
//                 PAY_PROVIDER 로 고르고, 비면 포트원 우선. 키가 없으면 결제 API 는 'not-configured' 를 돌려준다.
import { json, isAdmin } from './_lib.js';
import { kvOf } from './_store.js';
import { loadEditorial } from './_editorial.js';

export const TOPIC_WORLD = { self: 'w1', timing: 'w1', health: 'w1', creative: 'w1', remedy: 'w1', wealth: 'w2', career: 'w7', love: 'w3', relationships: 'w3' };
export const PRODUCTS_KEY = 'commerce:products';
export const WORLDS_KEY = 'worlds:config';
// 상품 기본값: 가격 0 은 '판매 안 함'. 관리자 화면에서 가격을 넣어야 판매된다.
export const DEFAULT_PRODUCTS = [
  { id: 'w1', name: '종합풀이', kind: 'world', worlds: ['w1'], price: 0, active: true, order: 1 },
  { id: 'w2', name: '재물운 심화', kind: 'world', worlds: ['w2'], price: 0, active: true, order: 2 },
  { id: 'w7', name: '커리어운 심화', kind: 'world', worlds: ['w7'], price: 0, active: true, order: 3 },
  { id: 'w3', name: '인연운 심화', kind: 'world', worlds: ['w3'], price: 0, active: true, order: 4 },
  { id: 'bundle', name: '전체 열기', kind: 'bundle', worlds: [], price: 0, active: true, order: 0 },   // worlds 는 구매 시점의 유료 세계로 채운다
];
const MAX_PRICE = 1000000;

// ── 사주 식별값: 원국 네 기둥(한자)·성별의 해시. 출생일·이름 원문은 쓰지 않는다. 시간을 모르면 시주 자리를 '-' 로 둔다.
export async function sajuKey(sd) {
  const p = sd && sd.pillars; if (!p || !p.year || !p.month || !p.day) return null;
  const pil = k => (p[k] && typeof p[k].hanja === 'string' && /^[一-鿿]{2}$/.test(p[k].hanja)) ? p[k].hanja : '-';
  if ([pil('year'), pil('month'), pil('day')].includes('-')) return null;
  const g = sd.gender === 'F' || sd.gender === 'female' || sd.gender === '여' ? 'F' : sd.gender === 'M' || sd.gender === 'male' || sd.gender === '남' ? 'M' : '-';
  const raw = `saju:v1:${pil('year')}|${pil('month')}|${pil('day')}|${pil('hour')}|${g}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return 'sj_' + [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Supabase
export const supabaseReady = env => !!(env && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
const base = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
export async function sbRest(env, path, init = {}) {
  const r = await fetch(base(env) + '/rest/v1/' + path, { ...init, signal: AbortSignal.timeout(10000), headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json', ...(init.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) throw new Error('supabase-' + r.status + ':' + txt.slice(0, 160));
  return txt ? JSON.parse(txt) : null;
}
// 회원 토큰 확인: Supabase 가 발급한 로그인 토큰을 Supabase 에 물어 사용자 id 를 받는다(서명 검증을 직접 하지 않는다).
export async function memberOf(request, env) {
  const tok = (request.headers.get('x-member-token') || '').trim();
  if (!tok || tok.length > 4096 || !supabaseReady(env)) return null;
  try {
    const r = await fetch(base(env) + '/auth/v1/user', { headers: { apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + tok }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || typeof u.id !== 'string') return null;
    const um = u.user_metadata || {}, naver = um.provider === 'naver';   // 네이버 회원은 내부용 주소 대신 네이버가 준 이메일을 보여 준다(functions/_naver-login.js)
    return { id: u.id, email: (naver ? um.email || um.name || '네이버 회원' : u.email) || '', provider: naver ? 'naver' : (u.app_metadata && u.app_metadata.provider) || '' };
  } catch { return null; }
}

// ── 세계 유료 여부 · 무료 장
export async function worldAccess(env) {
  const kv = kvOf(env); let saved = null;
  try { saved = kv ? await kv.get(WORLDS_KEY, 'json') : null; } catch { saved = null; }
  const out = {}; (saved && Array.isArray(saved.worlds) ? saved.worlds : []).forEach(w => { if (w && w.id) out[w.id] = { paid: w.access === 'paid', enabled: w.enabled !== false, name: w.name || '' }; });
  return out;
}
export async function freeChapters(env) {
  let catalog = null; try { catalog = await loadEditorial(kvOf(env)); } catch { catalog = null; }
  const first = {};
  for (const c of (catalog && catalog.chapters) || []) {
    if (c.state !== 'active' || !catalog.topics.some(t => t.id === c.topicId && t.enabled)) continue;
    const w = TOPIC_WORLD[c.topicId] || 'w1', o = Number.isFinite(+c.order) ? +c.order : 999;
    // 세계 하나에 주제가 여럿(w1·w3)일 수 있다: 세계 안에서 주제 순서 → 장 순서로 첫 장을 고른다
    const t = catalog.topics.findIndex(x => x.id === c.topicId), rank = t * 1000 + o;
    if (!first[w] || rank < first[w].rank) first[w] = { id: c.id, rank };
  }
  return Object.fromEntries(Object.entries(first).map(([w, v]) => [w, v.id]));
}

export async function ownedWorlds(env, userId, key) {
  if (!userId || !key || !supabaseReady(env)) return [];
  const rows = await sbRest(env, `commerce_entitlements?select=world&user_id=eq.${encodeURIComponent(userId)}&saju_key=eq.${encodeURIComponent(key)}&revoked_at=is.null`);
  return [...new Set((rows || []).map(r => r.world))];
}

// 운영 모니터(workers/production-monitor.js) 전용 열쇠: 헤더 x-monitor-key 가 환경변수 MONITOR_READING_KEY 와 같으면 잠금을 건너뛴다.
// 관리자 비밀번호를 모니터에 주지 않으려고 따로 둔 값이다(장 본문 읽기 외의 권한은 없다). 32자 미만이면 쓰지 않는다. 상수 시간 비교.
export function isMonitor(request, env) {
  const want = env && typeof env.MONITOR_READING_KEY === 'string' ? env.MONITOR_READING_KEY : '';
  if (want.length < 32) return false;
  const got = request.headers.get('x-monitor-key') || '';
  const a = new TextEncoder().encode(got), b = new TextEncoder().encode(want);
  let diff = a.length ^ b.length; for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}
// 장 하나를 열어도 되는가. 반환: { ok: true } 또는 { ok: false, world, reason: 'login'|'purchase', freeChapter }
export async function chapterGate(request, env, { topicId, chapterId, sd }) {
  const world = TOPIC_WORLD[topicId] || 'w1';
  if (isMonitor(request, env)) return { ok: true, world, monitor: true };
  const admin = isAdmin(request, env), viewAsFree = admin && (request.headers.get('x-view-as') || '') === 'free';
  if (admin && !viewAsFree) return { ok: true, world, admin: true };
  const access = await worldAccess(env);
  if (!access[world] || !access[world].paid) return { ok: true, world };
  const free = await freeChapters(env);
  if (free[world] === chapterId) return { ok: true, world, free: true };
  if (viewAsFree) return { ok: false, world, reason: 'purchase', freeChapter: free[world] || null, viewAsFree: true };
  const member = await memberOf(request, env);
  if (!member) return { ok: false, world, reason: 'login', freeChapter: free[world] || null };
  const key = await sajuKey(sd);
  let owned = []; try { owned = await ownedWorlds(env, member.id, key); } catch { return { ok: false, world, reason: 'unavailable' }; }
  if (!owned.includes(world)) return { ok: false, world, reason: 'purchase', freeChapter: free[world] || null };
  await markViewed(env, member.id, key, world);   // 유료 장을 처음 연 시각(환불 판단 근거)
  return { ok: true, world, owned: true };
}
export const lockedResponse = g => json({ ok: false, error: g.reason === 'unavailable' ? 'commerce-unavailable' : 'locked', locked: { world: g.world, reason: g.reason, freeChapter: g.freeChapter || null } }, g.reason === 'unavailable' ? 503 : g.reason === 'login' ? 401 : 402);

// ── 상품표 (KV): 관리자만 고친다
export function cleanProducts(list) {
  const by = Object.fromEntries(DEFAULT_PRODUCTS.map(p => [p.id, { ...p }]));
  for (const p of Array.isArray(list) ? list : []) {
    if (!p || !by[p.id]) continue;   // 상품 종류는 코드가 정한다(세계 4개 + 묶음). 이름·가격·판매 여부·순서만 고친다
    const b = by[p.id];
    if (typeof p.name === 'string' && p.name.trim()) b.name = p.name.trim().slice(0, 40);
    if (Number.isInteger(+p.price) && +p.price >= 0 && +p.price <= MAX_PRICE) b.price = +p.price;
    if (typeof p.active === 'boolean') b.active = p.active;
    if (Number.isFinite(+p.order)) b.order = Math.max(0, Math.min(99, Math.round(+p.order)));
  }
  return Object.values(by).sort((a, b) => a.order - b.order);
}
export async function loadProducts(env) {
  const kv = kvOf(env); let saved = null;
  try { saved = kv ? await kv.get(PRODUCTS_KEY, 'json') : null; } catch { saved = null; }
  return cleanProducts(saved && saved.products);
}
// 구매 시점에 이 상품이 여는 세계: 세계 상품은 자기 세계, 묶음은 지금 켜져 있고 유료인 세계 전부
export async function productWorlds(env, product) {
  if (product.kind === 'world') return product.worlds.slice();
  const access = await worldAccess(env);
  return Object.keys(access).filter(id => access[id].enabled && access[id].paid).sort();
}

// 주문 하나의 세계별 구매 권한을 넣는다(같은 주문·세계는 중복으로 넣지 않는다)
export async function grantOrder(env, order, by) {
  const rows = order.worlds.map(w => ({ user_id: order.user_id, saju_key: order.saju_key, world: w, order_id: order.order_id, granted_by: by }));
  await sbRest(env, 'commerce_entitlements?on_conflict=user_id,saju_key,world,order_id', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) });
  // 구매한 사주를 회원 계정에 저장(다른 기기에서 '이 사주로 바로 읽기'). 저장 실패는 구매를 막지 않는다
  if (order.birth && order.user_id) {
    try { await sbRest(env, 'member_sajus?on_conflict=user_id,saju_key', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ user_id: order.user_id, saju_key: order.saju_key, label: order.saju_label || null, birth: order.birth }]) }); } catch { }
  }
}

// ── 유료 장 열람 기록: 회원 × 사주 × 세계의 구매 권한 중 아직 열람 시각이 없는 것에만 첫 열람 시각을 적는다
//    (기억해 두고 건너뛰지 않는다: 같은 사주·주제를 취소 뒤 다시 사면 새 구매 권한에도 적어야 한다)
export async function markViewed(env, userId, key, world) {
  try {
    await sbRest(env, `commerce_entitlements?user_id=eq.${encodeURIComponent(userId)}&saju_key=eq.${encodeURIComponent(key)}&world=eq.${encodeURIComponent(world)}&revoked_at=is.null&first_viewed_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ first_viewed_at: new Date().toISOString() }) });
  } catch { }
}
// 주문별 첫 열람 시각(주문의 구매 권한 중 가장 이른 열람). 묶음은 하나라도 열면 열람
export async function viewedByOrder(env, orderIds) {
  const ids = [...new Set(orderIds.filter(id => /^mt\w{6,62}$/.test(id)))]; if (!ids.length) return {};
  const rows = await sbRest(env, `commerce_entitlements?select=order_id,first_viewed_at&first_viewed_at=not.is.null&order_id=in.(${ids.join(',')})`);
  const out = {}; for (const r of rows || []) if (!out[r.order_id] || r.first_viewed_at < out[r.order_id]) out[r.order_id] = r.first_viewed_at;
  return out;
}
// 출생 입력 정리: 만세력 계산에 쓰는 칸만, 타입을 확인해 남긴다(이름 등 다른 값은 버린다)
export function cleanBirth(b) {
  if (!b || typeof b !== 'object') return null;
  const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : undefined;
  const out = { year: int(b.year, 1800, 2200), month: int(b.month, 1, 12), day: int(b.day, 1, 31) };
  if (out.year === undefined || out.month === undefined || out.day === undefined) return null;
  const hour = int(b.hour, 0, 23), minute = int(b.minute, 0, 59); if (hour !== undefined) out.hour = hour; if (minute !== undefined) out.minute = minute;
  if (b.gender === 'M' || b.gender === 'F') out.gender = b.gender;
  if (b.calendar === 'solar' || b.calendar === 'lunar') out.calendar = b.calendar;
  if (typeof b.leap === 'boolean') out.leap = b.leap;
  if (b.jasi === 'jeong' || b.jasi === 'ya') out.jasi = b.jasi;
  if (typeof b.timeMode === 'string' && /^[a-z_]{1,20}$/i.test(b.timeMode)) out.timeMode = b.timeMode;
  if (typeof b.lon === 'number' && isFinite(b.lon) && Math.abs(b.lon) <= 180) out.lon = b.lon;
  if (b.hour === null) out.hour = null;   // 태어난 시각 모름
  return out;
}

// ── 토스페이먼츠
export const tossReady = env => !!(env && env.TOSS_SECRET_KEY);
export async function tossCall(env, path, body) {
  const auth = 'Basic ' + btoa(env.TOSS_SECRET_KEY + ':');
  const r = await fetch('https://api.tosspayments.com/v1/' + path, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  let d = null; try { d = await r.json(); } catch { d = null; }
  return { ok: r.ok, status: r.status, data: d };
}

// ── 포트원 V2 (결제대행사: 한국결제네트웍스 등. 어느 PG 로 결제할지는 채널 키가 정한다)
// 환경변수: PORTONE_STORE_ID·PORTONE_CHANNEL_KEY(공개, 결제창용), PORTONE_API_SECRET(서버 전용), PORTONE_WEBHOOK_SECRET(선택, 웹훅 서명 확인)
// 어느 결제사를 쓸지: PAY_PROVIDER=portone|toss. 비어 있으면 포트원 값이 다 있으면 포트원, 아니면 토스.
export const portoneReady = env => !!(env && env.PORTONE_STORE_ID && env.PORTONE_CHANNEL_KEY && env.PORTONE_API_SECRET);
export function payProvider(env) {
  const want = String((env && env.PAY_PROVIDER) || '').trim().toLowerCase();
  if (want === 'portone') return portoneReady(env) ? 'portone' : null;
  if (want === 'toss') return tossReady(env) && env.TOSS_CLIENT_KEY ? 'toss' : null;
  return portoneReady(env) ? 'portone' : tossReady(env) && env.TOSS_CLIENT_KEY ? 'toss' : null;
}
export const payReady = env => !!payProvider(env) && supabaseReady(env);
export async function portoneCall(env, path, init = {}) {
  const r = await fetch('https://api.portone.io/' + path, { ...init, headers: { authorization: 'PortOne ' + env.PORTONE_API_SECRET, 'content-type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  let d = null; try { d = await r.json(); } catch { d = null; }
  return { ok: r.ok, status: r.status, data: d };
}
// 주문의 결제 키: 토스는 paymentKey 그대로, 포트원은 'portone:' + 결제 id(= 주문번호)
export const PORTONE_PREFIX = 'portone:';
const encU = encodeURIComponent;
// 주문 상태는 '지금 상태(from)'일 때만 바꾼다: 복귀 확인·웹훅·정리가 동시에 와도 한 번만 바뀐다
const patchOrder = (env, orderId, fields, from = 'pending') => sbRest(env, `commerce_orders?order_id=eq.${encU(orderId)}&status=eq.${from}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(fields) });
// 오래된 '결제 대기' 주문을 정리할 때 붙이는 표시. 이 표시가 있는 실패 주문은 뒤늦게 결제가 확인되면 다시 살린다
export const EXPIRED = 'expired';
const revivable = o => o.status === 'failed' && o.failure === EXPIRED;
const methodOf = m => !m ? null : m.type === 'PaymentMethodEasyPay' ? '간편결제' + (m.provider ? '(' + m.provider + ')' : '') : m.type === 'PaymentMethodCard' ? '카드' : String(m.type || '').replace(/^PaymentMethod/, '') || null;
// 포트원 결제를 서버에서 조회해 주문을 정리한다(결제창 복귀·웹훅 공용). 브라우저가 보낸 금액·상태는 쓰지 않는다.
// 반환: { ok, already?, pending?, error?, worlds? }
export async function settlePortone(env, order) {
  if (order.status === 'paid') { try { await grantOrder(env, order, 'payment'); } catch { } return { ok: true, already: true, worlds: order.worlds }; }
  if (order.status !== 'pending' && !revivable(order)) return { ok: false, error: 'order-' + order.status };
  const from = order.status;   // 'pending', 또는 정리로 만료된 주문('failed' + expired)
  const t = await portoneCall(env, `payments/${encU(order.order_id)}?storeId=${encU(env.PORTONE_STORE_ID)}`);
  if (!t.ok || !t.data) return { ok: false, error: t.status === 404 ? 'payment-not-found' : 'portone-' + t.status, retry: true };
  const p = t.data;
  if (p.status === 'READY' || p.status === 'PAY_PENDING' || p.status === 'VIRTUAL_ACCOUNT_ISSUED') return { ok: false, pending: true, error: 'payment-pending' };
  if (p.status !== 'PAID') {
    if (from === 'pending') await patchOrder(env, order.order_id, { status: 'failed', failure: String('portone-' + p.status).slice(0, 80) }).catch(() => { });
    return { ok: false, error: 'payment-failed', code: p.status };
  }
  const total = p.amount && +p.amount.total, cur = p.currency;
  if (total !== order.amount || (cur && cur !== 'KRW') || (p.storeId && p.storeId !== env.PORTONE_STORE_ID)) {
    // 결제창 금액을 바꿔 치기한 결제: 돈은 돌려주고 주문은 실패로 남긴다
    const c = await portoneCall(env, `payments/${encU(order.order_id)}/cancel`, { method: 'POST', body: JSON.stringify({ storeId: env.PORTONE_STORE_ID, reason: '결제 금액 불일치' }) });
    await patchOrder(env, order.order_id, { status: 'failed', failure: 'amount-mismatch' + (c.ok ? '' : ':cancel-failed') }, from).catch(() => { });
    return { ok: false, error: 'amount-mismatch' };
  }
  try {
    await patchOrder(env, order.order_id, { status: 'paid', payment_key: PORTONE_PREFIX + order.order_id, method: methodOf(p.method), paid_at: p.paidAt || new Date().toISOString(), failure: null }, from);
    // 웹훅·복귀가 동시에 와도 '대기' 상태일 때만 바뀐다. 권한은 같은 주문·세계 중복을 막는다
    await grantOrder(env, order, 'payment');
  } catch { return { ok: false, error: 'grant-failed', orderId: order.order_id }; }
  return { ok: true, worlds: order.worlds };
}
// ── 오래된 '결제 대기' 주문 정리
// 결제창을 닫았거나 실패해 남은 대기 주문을 olderMin 분이 지나면 '실패(expired)'로 바꾼다.
// 포트원 주문(밑줄 없는 영문·숫자 주문번호)은 먼저 포트원에 물어 실제로 결제됐으면 결제 완료로 처리한다(웹훅을 놓친 경우 복구).
// 토스 주문(mt_…_…)은 승인 요청 없이 남은 결제를 토스가 자동 취소하므로 그대로 만료 처리한다.
export const isPortoneOrder = id => /^mt[a-z0-9]+$/i.test(String(id || ''));
export async function expirePending(env, { userId = null, olderMin = 30, limit = 20, now = Date.now() } = {}) {
  const out = { checked: 0, expired: 0, paid: 0, failed: 0, skipped: 0 };
  if (!supabaseReady(env)) return out;
  const cutoff = new Date(now - olderMin * 60000).toISOString();
  const rows = await sbRest(env, `commerce_orders?select=*&status=eq.pending&created_at=lt.${encU(cutoff)}${userId ? '&user_id=eq.' + encU(userId) : ''}&order=created_at.asc&limit=${Math.max(1, Math.min(50, limit))}`);
  for (const o of rows || []) {
    out.checked++;
    if (isPortoneOrder(o.order_id) && portoneReady(env)) {
      let r; try { r = await settlePortone(env, o); } catch { out.skipped++; continue; }
      if (r.ok) { out.paid++; continue; }
      if (!(r.pending || r.error === 'payment-not-found')) { if (r.retry || r.error === 'grant-failed') out.skipped++; else out.failed++; continue; }
    }
    try { await patchOrder(env, o.order_id, { status: 'failed', failure: EXPIRED }); out.expired++; } catch { out.skipped++; }
  }
  return out;
}
export async function cancelPortone(env, orderId, reason) {
  const t = await portoneCall(env, `payments/${encU(orderId)}/cancel`, { method: 'POST', body: JSON.stringify({ storeId: env.PORTONE_STORE_ID, reason }) });
  const st = t.data && t.data.cancellation && t.data.cancellation.status;
  return { ok: t.ok && st !== 'FAILED', message: (t.data && t.data.message) || (st === 'FAILED' ? '취소 실패' : '') || String(t.status) };
}
// 포트원 웹훅 서명(Standard Webhooks): v1,base64(HMAC-SHA256(시크릿, id.timestamp.body)). 5분 넘은 요청은 거절.
export async function verifyPortoneWebhook(secret, headers, body, now = Date.now()) {
  const id = headers.get('webhook-id'), ts = headers.get('webhook-timestamp'), sig = headers.get('webhook-signature') || '';
  if (!id || !ts || !sig || !/^\d+$/.test(ts) || Math.abs(now / 1000 - +ts) > 300) return false;
  let raw; try { raw = Uint8Array.from(atob(String(secret).replace(/^whsec_/, '')), c => c.charCodeAt(0)); } catch { raw = new TextEncoder().encode(String(secret)); }
  const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const want = btoa(String.fromCharCode(...mac));
  return sig.split(' ').some(s => { const v = s.startsWith('v1,') ? s.slice(3) : ''; if (v.length !== want.length) return false; let d = 0; for (let i = 0; i < v.length; i++) d |= v.charCodeAt(i) ^ want.charCodeAt(i); return d === 0; });
}
// 주문번호 = 포트원 결제 id: 포트원(KPN)은 영문·숫자만 받는다(밑줄 불가). 예전 토스 주문은 'mt_…_…' 형식으로 남아 있어 검사식은 둘 다 받는다
export const newOrderId = () => 'mt' + Date.now().toString(36) + [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
