// 마이페이지 '카카오톡 알림 받기'(구매 완료·문의 답변·이용 기간 만료 안내 — 정보성, 광고 아님). 2026-11-27
// POST { action:'get' }                    → { available, on, phone(가림), kinds }
// POST { action:'set', phone:'010…' }      → 번호 저장(켜기)
// POST { action:'off' }                    → 번호 지움(끄기)
// 번호는 member_profiles.notify_phone 에만 둔다(광고 수신용 phone 과 따로). 표: supabase/migrations/20261127_kakao_notice.sql
import { json } from '../../_lib.js';
import { memberOf, supabaseReady, sbRest } from '../../_commerce.js';
import { maskPhone } from '../../_consent.js';
import { normPhone } from '../../_solapi.js';
import { noticeAny, noticeReady, NOTICE_TPL } from '../../_notice.js';
import { rateAdd } from '../../_rate.js';

const enc = encodeURIComponent;
async function read(env, userId) {
  const r = await sbRest(env, `member_profiles?user_id=eq.${enc(userId)}&select=user_id,notify_phone`);
  return r && r[0] ? r[0] : null;
}
const view = (env, row) => ({ available: noticeAny(env), on: !!(row && row.notify_phone), phone: maskPhone(row && row.notify_phone), kinds: Object.keys(NOTICE_TPL).filter(k => noticeReady(env, k)) });

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 설정을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const action = b && b.action;
  try {
    if (action === 'set' || action === 'off') {
      const n = await rateAdd(env, 'notify-set:' + member.id, 1, 3600);
      if (n != null && n > 20) return json({ error: '잠시 후 다시 시도해 주세요' }, 429);
      let phone = null;
      if (action === 'set') { phone = normPhone(b.phone); if (!phone) return json({ error: '휴대폰 번호를 확인해 주세요(010으로 시작하는 번호)', field: 'phone' }, 400); }
      const row = await read(env, member.id);
      const body = JSON.stringify(row ? { notify_phone: phone, notify_at: phone ? new Date().toISOString() : null } : { user_id: member.id, notify_phone: phone, notify_at: phone ? new Date().toISOString() : null });
      if (row) await sbRest(env, `member_profiles?user_id=eq.${enc(member.id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body });
      else if (phone) await sbRest(env, 'member_profiles', { method: 'POST', headers: { prefer: 'return=minimal' }, body });
      return json({ ok: true, ...view(env, { notify_phone: phone }) });
    }
    return json(view(env, await read(env, member.id)));
  } catch (e) {
    return json({ error: '잠시 후 다시 시도해 주세요' }, 502);
  }
}
