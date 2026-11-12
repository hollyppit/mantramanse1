// 로그인 방법 연결: 같은 사람이 카카오·구글·네이버로 따로 가입한 회원을 하나로 합친다. 테이블: supabase/migrations/20261111_account_link.sql
//
// 연결 흐름(본인이 두 계정 모두에 직접 로그인해야만 합쳐진다 — 이메일만으로 남의 계정에 들어가지 못하게):
//   1) 회원 A 로 로그인한 화면에서 '연결하기' → POST /api/account/link {action:'start', provider} → 10분짜리 연결표(ticket)
//   2) 그 방법(B)으로 로그인 → 돌아온 화면이 POST /api/account/link {action:'finish', ticket} (B 의 로그인 토큰으로)
//   3) 서버가 B 의 로그인·주문·구매 권한·저장한 사주를 A 로 옮기고 B 를 지운 뒤, A 의 세션을 돌려준다
// 자동 연결: 구글·카카오가 같은 '인증된 이메일'이면 Supabase 가 처음부터 한 회원으로 만든다(기본 동작). 네이버 이메일은 인증 보장이 없어
//           자동으로 합치지 않고 안내(같은 이메일의 회원이 있어요 → 그 방법으로 로그인해 합치기)만 한다.
import { sbRest, supabaseReady } from './_commerce.js';
import { kvOf } from './_store.js';
import { sessionForEmail } from './_naver-login.js';
import { identitiesOf } from './_account.js';

export const PROVIDERS = ['kakao', 'google', 'naver'];
const TICKET_PREFIX = 'linkticket:', TICKET_TTL = 600;
const base = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
const authAdmin = (env, path, init = {}) => fetch(base(env) + '/auth/v1/admin/' + path, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' }, signal: AbortSignal.timeout(10000) });
const enc = encodeURIComponent;
const NAVER_EMAIL = /^naver-([0-9a-f]{32})@users\.mantrafortune\.com$/;

export async function adminUser(env, id) {
  const r = await authAdmin(env, 'users/' + enc(id));
  return r.ok ? r.json() : null;
}
// 이 회원으로 들어올 수 있는 로그인 방법들
export async function loginsOf(env, user) {
  const out = new Set();
  for (const i of await identitiesOf(env, user.id)) if (i.provider === 'kakao' || i.provider === 'google') out.add(i.provider);
  try { if (((await sbRest(env, `member_google_links?select=google_sub&user_id=eq.${enc(user.id)}&limit=1`)) || []).length) out.add('google'); } catch { }   // 서버 구글 로그인 회원
  if (NAVER_EMAIL.test(user.email || '') || (user.user_metadata && user.user_metadata.provider === 'naver')) out.add('naver');
  else {
    try { if (((await sbRest(env, `member_naver_links?select=naver_key&user_id=eq.${enc(user.id)}&limit=1`)) || []).length) out.add('naver'); } catch { }
  }
  return PROVIDERS.filter(p => out.has(p));
}
export async function hasPurchases(env, userId) {
  try { return ((await sbRest(env, `commerce_entitlements?select=world&user_id=eq.${enc(userId)}&revoked_at=is.null&limit=1`)) || []).length > 0; } catch { return false; }
}
// 화면 표시용 이메일: 네이버 회원은 내부 주소 대신 네이버 이메일
export const displayEmail = u => (u && u.user_metadata && u.user_metadata.provider === 'naver' ? u.user_metadata.email : u && u.email) || '';

// 안내: 구매 내역이 없는 회원에게 '같은 이메일의 다른 회원(구매 있음)'을 알려 준다. 합치기는 본인이 그 방법으로 로그인해야 된다
export async function suggestionFor(env, user) {
  const email = displayEmail(user); if (!email || NAVER_EMAIL.test(email)) return null;
  let rows = []; try { rows = (await sbRest(env, 'rpc/commerce_members_by_email', { method: 'POST', body: JSON.stringify({ p_email: email }) })) || []; } catch { return null; }
  for (const r of rows) {
    if (r.user_id === user.id) continue;
    const provider = (r.providers && r.providers[0]) || (r.naver ? 'naver' : null);
    if (!provider) continue;
    return { provider, hasPurchases: await hasPurchases(env, r.user_id) };
  }
  return null;
}

export async function startLink(env, userId, provider) {
  if (!PROVIDERS.includes(provider)) return { ok: false, error: 'bad-provider' };
  const kv = kvOf(env); if (!kv) return { ok: false, error: 'kv-missing' };
  const ticket = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
  await kv.put(TICKET_PREFIX + ticket, JSON.stringify({ userId, provider, at: Date.now() }), { expirationTtl: TICKET_TTL });
  return { ok: true, ticket };
}

// B(from)의 모든 것을 A(to)로 옮기고 B 를 지운다. 같은 회사 로그인이 양쪽에 있으면 합치지 않는다
export async function mergeMembers(env, fromUser, toUser) {
  const from = fromUser.id, to = toUser.id;
  const [fromLogins, toLogins] = await Promise.all([loginsOf(env, fromUser), loginsOf(env, toUser)]);
  const clash = fromLogins.filter(p => toLogins.includes(p));
  if (clash.length) return { ok: false, error: 'same-provider', provider: clash[0] };
  // 1) 로그인: 카카오·구글은 로그인 정보를 옮기고, 네이버는 연결표를 A 로
  await sbRest(env, 'rpc/commerce_move_identities', { method: 'POST', body: JSON.stringify({ p_from: from, p_to: to }) });
  const m = NAVER_EMAIL.exec(fromUser.email || '');
  if (m) await sbRest(env, 'member_naver_links?on_conflict=naver_key', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ naver_key: m[1], user_id: to }]) });
  await sbRest(env, `member_naver_links?user_id=eq.${enc(from)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ user_id: to }) });
  await sbRest(env, `member_google_links?user_id=eq.${enc(from)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ user_id: to }) });
  // 2) 주문·구매 권한·저장한 사주
  await sbRest(env, `commerce_orders?user_id=eq.${enc(from)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ user_id: to }) });
  const ents = (await sbRest(env, `commerce_entitlements?select=saju_key,world,order_id,granted_at,granted_by,revoked_at&user_id=eq.${enc(from)}`)) || [];
  if (ents.length) await sbRest(env, 'commerce_entitlements?on_conflict=user_id,saju_key,world,order_id', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(ents.map(e => ({ ...e, user_id: to, granted_by: e.granted_by || 'merge' }))) });
  const sajus = (await sbRest(env, `member_sajus?select=saju_key,label,birth&user_id=eq.${enc(from)}`)) || [];
  if (sajus.length) await sbRest(env, 'member_sajus?on_conflict=user_id,saju_key', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(sajus.map(s => ({ ...s, user_id: to }))) });
  // 3) B 삭제(남은 권한·사주는 이미 옮겼다)
  const d = await authAdmin(env, 'users/' + enc(from), { method: 'DELETE' });
  if (!d.ok && d.status !== 404) return { ok: false, error: 'delete-failed' };
  return { ok: true, moved: { logins: fromLogins, entitlements: ents.length, sajus: sajus.length } };
}

// 연결 마무리: 지금 로그인한 회원(B)을 연결표의 회원(A)에 합치고 A 의 세션을 돌려준다
export async function finishLink(env, ticket, currentUserId) {
  if (!supabaseReady(env) || !/^[0-9a-f]{48}$/.test(ticket || '')) return { ok: false, error: 'bad-ticket' };
  const kv = kvOf(env); if (!kv) return { ok: false, error: 'kv-missing' };
  const t = await kv.get(TICKET_PREFIX + ticket, 'json');
  if (!t || Date.now() - t.at > TICKET_TTL * 1000) return { ok: false, error: 'expired' };
  await kv.delete(TICKET_PREFIX + ticket);   // 한 번만 쓴다
  if (t.userId === currentUserId) return { ok: true, same: true };   // 이미 같은 회원(자동 연결된 경우 등)
  const [a, b] = await Promise.all([adminUser(env, t.userId), adminUser(env, currentUserId)]);
  if (!a || !b) return { ok: false, error: 'member-missing' };
  const r = await mergeMembers(env, b, a);
  if (!r.ok) return r;
  if (!a.email) return { ok: false, error: 'no-email' };
  const session = await sessionForEmail(env, a.email);
  return { ok: true, session, moved: r.moved };
}
