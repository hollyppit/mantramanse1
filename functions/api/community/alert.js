// 커뮤니티(운명의 광장) 출시 알림 — 잠금 중에도 열려 있는 공개 API. 표: launch_alerts(supabase/migrations/20261115_community_stage1.sql)
// POST { consent:true, consentVersion, email?, source?, website } 신청
//        회원(x-member-token): 계정 이메일로 신청(email 무시) · 비회원: email 필수
//        website 는 봇 함정 칸(채워지면 성공한 척만 한다). 같은 IP 는 1시간 20회까지.
//        이미 신청한 주소도 같은 응답(가입 여부 노출 방지).
// 철회하면 행을 바로 지운다(개인정보처리방침 2번: 출시 알림 이메일은 철회할 때까지 보유).
// POST { action:'revoke', token }   메일 속 철회 링크(로그인 없이)
// POST { action:'revoke' }          회원 본인 철회(x-member-token)
// POST { action:'mine' }            회원 본인 신청 여부 { subscribed, at }
// GET                                관리자: 신청자 수·최근 신청(이메일 가림)
// 동의 문구 버전이 바뀌면 CONSENT_VERSION 과 게이트웨이(gate/gate.js)의 같은 값을 함께 올린다.
import { json, isAdmin } from '../../_community.js';
import { memberOf, sbRest, supabaseReady } from '../../_commerce.js';
import { mailLaunchAlert } from '../../_mail.js';

export const CONSENT_VERSION = 'launch-alert-2026-11-15';
const PURPOSE = 'community_launch';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const SITE = 'https://mantrafortune.com';
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const newToken = () => hex(crypto.getRandomValues(new Uint8Array(24)));
export const maskEmail = e => { const [u, d] = String(e || '').split('@'); if (!d) return '***'; return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '*'.repeat(Math.min(6, u.length - 2))) + '@' + d; };
const okEmail = e => typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e) && !/@users\.mantrafortune\.com$/i.test(e);

async function throttled(request, env) {
  const kv = env.GLOSSARY_KV; if (!kv) return false;
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  const key = 'cm:alert:ip:' + (await sha('cm-alert:' + ip)).slice(0, 24) + ':' + new Date().toISOString().slice(0, 13);
  try { const n = +(await kv.get(key)) || 0; if (n >= 20) return true; await kv.put(key, String(n + 1), { expirationTtl: 3700 }); } catch { }
  return false;
}
const rowOf = async (env, email) => { const r = await sbRest(env, `launch_alerts?purpose=eq.${PURPOSE}&email=eq.${encodeURIComponent(email)}&select=id,revoked_at,consented_at,history,user_id`); return Array.isArray(r) ? r[0] || null : null; };
const hist = (row, a, via) => (Array.isArray(row && row.history) ? row.history : []).concat([{ a, at: new Date().toISOString(), v: CONSENT_VERSION, via }]).slice(-30);

async function subscribe(request, env, body) {
  if (body.consent !== true) return json({ error: '출시 알림을 받기 위한 이메일 수집·이용에 동의해 주세요' }, 400);
  if (body.consentVersion !== CONSENT_VERSION) return json({ error: '안내 문구가 바뀌었습니다. 화면을 새로 고친 뒤 다시 신청해 주세요', consentVersion: CONSENT_VERSION }, 409);
  const member = await memberOf(request, env);
  const email = String(member ? member.email : body.email || '').trim().toLowerCase();
  if (!okEmail(email)) return json({ error: member ? '로그인 계정에 받을 수 있는 이메일이 없습니다. 이메일을 직접 입력해 주세요' : '이메일 형식을 확인해 주세요', needEmail: !!member }, 400);
  if (await throttled(request, env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429);
  const source = ['gate', 'community', 'mypage'].includes(body.source) ? body.source : 'gate';
  const token = newToken(), hash = await sha(token), at = new Date().toISOString();
  const row = await rowOf(env, email);
  let fresh = false;
  if (!row) {
    await sbRest(env, 'launch_alerts', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ purpose: PURPOSE, email, user_id: member ? member.id : null, consent_version: CONSENT_VERSION, consented_at: at, revoke_token_hash: hash, source, history: hist(null, 'grant', source) }) });
    fresh = true;
  } else if (row.revoked_at) {
    await sbRest(env, `launch_alerts?id=eq.${row.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: null, consent_version: CONSENT_VERSION, consented_at: at, revoke_token_hash: hash, source, user_id: row.user_id || (member ? member.id : null), history: hist(row, 'grant', source) }) });
    fresh = true;
  }
  // 새로 신청(또는 다시 신청)한 경우에만 확인 메일. 남의 주소를 넣었다면 그 주인이 링크로 바로 철회할 수 있다.
  if (fresh) await mailLaunchAlert(env, email, SITE + '/gate/?alert=revoke&t=' + token);
  return json({ ok: true, member: !!member, email: member ? maskEmail(email) : undefined });
}

async function revoke(request, env, body) {
  if (typeof body.token === 'string' && body.token) {
    if (!/^[0-9a-f]{48}$/.test(body.token)) return json({ error: '철회 링크가 올바르지 않습니다' }, 400);
    const r = await sbRest(env, `launch_alerts?revoke_token_hash=eq.${await sha(body.token)}&select=id`);
    const row = Array.isArray(r) ? r[0] : null;
    if (row) await sbRest(env, `launch_alerts?id=eq.${row.id}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    return json({ ok: true });   // 없는 토큰·이미 철회한 경우도 같은 응답
  }
  const member = await memberOf(request, env);
  if (!member) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const row = okEmail(member.email) ? await rowOf(env, String(member.email).toLowerCase()) : null;
  if (row) await sbRest(env, `launch_alerts?id=eq.${row.id}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 신청을 받을 수 없습니다. 잠시 후 다시 시도해 주세요' }, 503);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body && typeof body === 'object' ? body : {};
  if (body.website) return json({ ok: true });
  try {
    if (body.action === 'revoke') return await revoke(request, env, body);
    if (body.action === 'mine') {
      const m = await memberOf(request, env); if (!m) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
      const row = okEmail(m.email) ? await rowOf(env, String(m.email).toLowerCase()) : null;
      return json({ subscribed: !!(row && !row.revoked_at), at: row && !row.revoked_at ? row.consented_at : null, email: maskEmail(m.email) });
    }
    return await subscribe(request, env, body);
  } catch (e) {
    return json({ error: '잠시 후 다시 시도해 주세요' }, 502);
  }
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const rows = (await sbRest(env, `launch_alerts?purpose=eq.${PURPOSE}&select=id,email,user_id,source,consented_at,revoked_at&order=consented_at.desc&limit=10000`)) || [];
  const live = rows.filter(r => !r.revoked_at), week = Date.now() - 7 * 864e5;
  return json({
    consentVersion: CONSENT_VERSION,
    active: live.length, revoked: rows.length - live.length, members: live.filter(r => r.user_id).length, guests: live.filter(r => !r.user_id).length,
    last7days: live.filter(r => Date.parse(r.consented_at) >= week).length,
    bySource: live.reduce((o, r) => { o[r.source || 'gate'] = (o[r.source || 'gate'] || 0) + 1; return o; }, {}),
    recent: rows.slice(0, 50).map(r => ({ id: r.id, email: maskEmail(r.email), member: !!r.user_id, source: r.source, at: r.consented_at, revokedAt: r.revoked_at })),
  });
}
