// 회원 프로필(2단계) — 인연의 광장에서 보이는 이름·소개·공개 범위. 표: member_profiles(supabase/migrations/20261116_member_stage2.sql)
// POST { action:'get' }  → { profile, requiredOk, communityOpen }
// POST { action:'save', nickname, bio, visibility, showIlgan, showIlju }
//   · 필수 동의(이용약관·개인정보)를 마친 회원만 저장할 수 있다
//   · 닉네임: 2~12자, 한글·영문·숫자·밑줄, 운영자로 오해할 이름 금지, 다른 회원과 겹치면 409
//   · 휴대폰 번호는 여기서 다루지 않는다(광고 수신 설정 functions/_consent.js 에서만)
//   · 일간·일주는 3단계에서 '나' 사주로 서버가 채운다(지금은 공개 여부 설정만)
import { json } from '../../_lib.js';
import { memberOf, supabaseReady, sbRest } from '../../_commerce.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { readStage, accessRoleOf, roleAllowed } from '../../_community.js';

const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,12}$/;
const BANNED = /(관리자|운영자|운영진|만트라|mantra|admin|moderator|공식|official)/i;
const VIS = ['public', 'members', 'private'];
const FIELDS = 'nickname,bio,visibility,show_ilgan,show_ilju,ilgan,ilju,updated_at';
const out = r => r ? { nickname: r.nickname || '', bio: r.bio || '', visibility: r.visibility || 'members', showIlgan: !!r.show_ilgan, showIlju: !!r.show_ilju, ilgan: r.ilgan || null, ilju: r.ilju || null, updatedAt: r.updated_at || null } : { nickname: '', bio: '', visibility: 'members', showIlgan: false, showIlju: false, ilgan: null, ilju: null, updatedAt: null };

export function checkProfile(b) {
  const nickname = String(b.nickname || '').trim(), bio = String(b.bio || '').replace(/\r/g, '').trim();
  if (!NICK_RE.test(nickname)) return { error: '닉네임은 2~12자의 한글·영문·숫자·밑줄(_)로 적어 주세요' };
  if (BANNED.test(nickname)) return { error: '운영자로 오해할 수 있는 닉네임은 쓸 수 없습니다' };
  if (bio.length > 160) return { error: '소개는 160자까지 적을 수 있습니다' };
  if (/(https?:\/\/|www\.|open\.kakao\.com|t\.me\/)/i.test(bio)) return { error: '소개에는 링크·오픈채팅 주소를 넣을 수 없습니다' };
  if (/01[016789][\s-]?\d{3,4}[\s-]?\d{4}/.test(bio)) return { error: '소개에는 전화번호를 넣을 수 없습니다' };
  const visibility = VIS.includes(b.visibility) ? b.visibility : 'members';
  return { row: { nickname, bio: bio || null, visibility, show_ilgan: b.showIlgan === true, show_ilju: b.showIlju === true } };
}

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 프로필을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body && typeof body === 'object' ? body : {};
  const id = encodeURIComponent(member.id);
  try {
    const consents = await readConsents(env, member.id), ok = requiredOk(consents);
    if (body.action === 'save') {
      if (!ok) return json({ error: '이용약관과 개인정보 수집·이용에 먼저 동의해 주세요', need: 'consent' }, 409);
      const c = checkProfile(body); if (c.error) return json({ error: c.error }, 400);
      const dup = await sbRest(env, `member_profiles?nickname=eq.${encodeURIComponent(c.row.nickname)}&user_id=neq.${id}&select=user_id`);
      if (Array.isArray(dup) && dup.length) return json({ error: '이미 쓰고 있는 닉네임입니다. 다른 이름을 골라 주세요', field: 'nickname' }, 409);
      const at = new Date().toISOString();
      try {
        await sbRest(env, 'member_profiles?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: member.id, ...c.row, updated_at: at }) });
      } catch (e) {
        if (/supabase-409/.test(String(e && e.message))) return json({ error: '이미 쓰고 있는 닉네임입니다. 다른 이름을 골라 주세요', field: 'nickname' }, 409);
        throw e;
      }
    }
    const rows = await sbRest(env, `member_profiles?user_id=eq.${id}&select=${FIELDS}`);
    const [{ stage }, role] = await Promise.all([readStage(env), accessRoleOf(env, member.id)]);
    return json({ ok: true, profile: out(Array.isArray(rows) ? rows[0] : null), requiredOk: ok, communityOpen: roleAllowed(role || 'member', stage) });
  } catch (e) {
    return json({ error: '잠시 후 다시 시도해 주세요' }, 502);
  }
}
