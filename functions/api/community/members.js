// 회원·프로필 찾기(7단계). 권한 members(관리자 비밀번호·운영 매니저·모더레이터). 읽기 전용 — 제재·사진 지우기는 광장 운영(/api/community/mod)에서.
// GET ?q=닉네임(2자 이상, 일부 일치) 또는 이메일(정확히 일치) → { items:[{ id, nickname, ilju, joined }] }   최대 20명
// GET ?id=<회원 id>                                         → 한 사람 요약
//     { nickname, email(가림), joined, ilju, ilgan, show, visibility, hasAvatar, hasPhone, consents:{ required, marketing:[…] },
//       adult:{ ageBand, provider, at } | null, access, sanctions:[…], counts:{ posts, comments, logs, reportsAgainst }, match:{ on, likesSent, rooms }, credits }
// 이메일 원문·전화번호·생년월일·출생 정보는 내보내지 않는다. 조회는 감사 로그에 남긴다(누가 어떤 회원을 봤는지).
import { json, sbRest, supabaseReady, okUuid } from '../../_plaza.js';
import { audit } from '../../_community.js';
import { need, actorOf } from '../../_staff.js';
import { readConsents, DOCS } from '../../_consent.js';
import { ageBand } from '../../_match.js';
import { balanceOf } from '../../_credits.js';

const enc = encodeURIComponent;
export const maskEmail = e => { const m = /^([^@]+)@(.+)$/.exec(String(e || '')); if (!m) return null; const u = m[1]; return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '*'.repeat(Math.min(6, u.length - 2))) + '@' + m[2]; };
// 개수: 한 열만 최대 1000줄 받아 센다(1000 이면 화면에 1000+ 로 보인다)
const count = async (env, path, col = 'id') => { const r = await sbRest(env, path + '&select=' + col + '&limit=1000').catch(() => null); return Array.isArray(r) ? r.length : 0; };
async function emailOf(env, id) {
  try {
    const r = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + '/auth/v1/admin/users/' + enc(id), { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null; const u = await r.json(), m = u.user_metadata || {};
    return { email: m.provider === 'naver' ? m.email || null : u.email || null, joined: u.created_at || null };
  } catch { return null; }
}

export async function onRequestGet({ request, env }) {
  const g = await need(request, env, 'members'); if (g.res) return g.res;
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const u = new URL(request.url), id = u.searchParams.get('id'), q = String(u.searchParams.get('q') || '').trim().slice(0, 254);
  if (id) {
    if (!okUuid(id)) return json({ error: '잘못된 회원 id 입니다' }, 400);
    const [pR, au, consents, vR, acR, sR, posts, comments, logs, against, mpR, likes, rooms, credits] = await Promise.all([
      sbRest(env, `member_profiles?user_id=eq.${enc(id)}&select=nickname,ilju,ilgan,show_ilju,show_ilgan,visibility,avatar_path,phone,created_at`),
      emailOf(env, id), readConsents(env, id),
      sbRest(env, `adult_verifications?user_id=eq.${enc(id)}&select=provider,birth_year,verified_at`),
      sbRest(env, `community_access?user_id=eq.${enc(id)}&revoked_at=is.null&select=role`),
      sbRest(env, `cm_sanctions?user_id=eq.${enc(id)}&select=id,kind,reason,until,by_actor,created_at,lifted_at&order=created_at.desc&limit=20`),
      count(env, `cm_posts?author_id=eq.${enc(id)}&status=neq.deleted`), count(env, `cm_comments?author_id=eq.${enc(id)}&status=neq.deleted`),
      count(env, `cm_logs?user_id=eq.${enc(id)}`, 'day'), count(env, `cm_reports?target_author=eq.${enc(id)}`),
      sbRest(env, `cm_match_profiles?user_id=eq.${enc(id)}&select=active`),
      count(env, `cm_likes?from_id=eq.${enc(id)}`, 'to_id'), count(env, `cm_rooms?or=(a_id.eq.${enc(id)},b_id.eq.${enc(id)})`),
      balanceOf(env, id).catch(() => null),
    ]);
    const p = Array.isArray(pR) ? pR[0] : null, v = Array.isArray(vR) ? vR[0] : null;
    if (!p && !au) return json({ error: '회원을 찾지 못했습니다' }, 404);
    const now = Date.now();
    await audit(env, actorOf(g.staff), 'community.member.view', id, {});
    return json({
      id, nickname: p && p.nickname || null, email: au ? maskEmail(au.email) : null, joined: au && au.joined || p && p.created_at || null,
      ilju: p && p.ilju || null, ilgan: p && p.ilgan || null, show: { ilju: !!(p && p.show_ilju), ilgan: !!(p && p.show_ilgan) }, visibility: p && p.visibility || null,
      hasAvatar: !!(p && p.avatar_path), hasPhone: !!(p && p.phone),
      consents: { required: ['terms', 'privacy'].every(k => consents[k] && consents[k].current), marketing: Object.keys(DOCS).filter(k => DOCS[k].channel && consents[k] && consents[k].agreed).map(k => DOCS[k].title), night: !!(consents.marketing_night && consents.marketing_night.agreed) },
      adult: v ? { ageBand: ageBand(new Date().getFullYear() - v.birth_year), provider: v.provider === 'manual' ? '관리자 수동 확인' : '휴대폰 본인인증', at: v.verified_at } : null,
      access: Array.isArray(acR) && acR[0] ? acR[0].role : null,
      sanctions: (sR || []).map(s => ({ id: s.id, kind: s.kind, reason: s.reason, until: s.until, by: s.by_actor, at: s.created_at, lifted: s.lifted_at, active: !s.lifted_at && s.kind !== 'warn' && (!s.until || Date.parse(s.until) > now) })),
      counts: { posts, comments, logs, reportsAgainst: against },
      match: { on: !!(Array.isArray(mpR) && mpR[0] && mpR[0].active), likesSent: likes, rooms },
      credits,
    });
  }
  let rows = [];
  if (q.includes('@')) {
    const uid = await sbRest(env, 'rpc/community_user_by_email', { method: 'POST', body: JSON.stringify({ p_email: q }) }).catch(() => null);
    if (typeof uid === 'string' && okUuid(uid)) { const r = await sbRest(env, `member_profiles?user_id=eq.${enc(uid)}&select=user_id,nickname,ilju,created_at`); rows = Array.isArray(r) && r.length ? r : [{ user_id: uid, nickname: null, ilju: null, created_at: null }]; }
  } else {
    if (q.length < 2) return json({ error: '닉네임은 2자 이상, 또는 가입 이메일 전체를 넣어 주세요' }, 400);
    const safe = q.replace(/[%*,().:\\]/g, '');
    if (safe.length < 2) return json({ error: '닉네임을 다시 확인해 주세요' }, 400);
    rows = (await sbRest(env, `member_profiles?nickname=ilike.*${enc(safe)}*&select=user_id,nickname,ilju,created_at&order=created_at.desc&limit=20`)) || [];
  }
  return json({ items: rows.slice(0, 20).map(r => ({ id: r.user_id, nickname: r.nickname, ilju: r.ilju, joined: r.created_at })) });
}
