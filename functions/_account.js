// 회원 탈퇴 공용(직접 탈퇴·카카오 연결 해제 알림). 테이블 변경: supabase/migrations/20261111_account_withdraw.sql
// 처리 순서:
//   1) 주문·결제 기록은 지우지 않고 회원과의 연결만 끊는다(user_id → 비움, withdrawn_at 기록). 전자상거래법: 계약·결제 기록 5년 보관
//   2) Supabase 회원을 지운다 → 구매 권한·저장한 사주는 함께 지워진다(on delete cascade), 소셜 로그인 연결 정보도 지워진다
//   3) 카카오로 가입한 회원이면 카카오 쪽 연결도 끊는다(KAKAO_ADMIN_KEY 가 있을 때, 실패해도 탈퇴는 끝난 것으로 본다)
// 환경변수: SUPABASE_URL·SUPABASE_SERVICE_KEY, 선택 KAKAO_ADMIN_KEY(카카오 앱 '어드민 키')
import { sbRest, supabaseReady } from './_commerce.js';

const base = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
export async function identitiesOf(env, userId) {
  try { return (await sbRest(env, 'rpc/commerce_identities', { method: 'POST', body: JSON.stringify({ p_user: userId }) })) || []; } catch { return []; }
}
export async function userByIdentity(env, provider, providerId) {
  const r = await sbRest(env, 'rpc/commerce_user_by_identity', { method: 'POST', body: JSON.stringify({ p_provider: provider, p_provider_id: String(providerId) }) });
  return typeof r === 'string' && /^[0-9a-f-]{36}$/i.test(r) ? r : null;
}
export async function kakaoUnlink(env, kakaoUserId) {
  if (!env.KAKAO_ADMIN_KEY || !/^\d+$/.test(String(kakaoUserId || ''))) return false;
  try {
    const r = await fetch('https://kapi.kakao.com/v1/user/unlink', { method: 'POST', headers: { authorization: 'KakaoAK ' + env.KAKAO_ADMIN_KEY, 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams({ target_id_type: 'user_id', target_id: String(kakaoUserId) }), signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch { return false; }
}
// 반환: { ok, orders(연결을 끊은 주문 수), kakaoUnlinked }
export async function withdraw(env, userId, { unlinkKakao = true } = {}) {
  if (!supabaseReady(env) || !/^[0-9a-f-]{36}$/i.test(String(userId || ''))) return { ok: false, error: 'bad-user' };
  const ids = unlinkKakao ? await identitiesOf(env, userId) : [];
  const enc = encodeURIComponent(userId), at = new Date().toISOString();
  // 1) 주문 기록 분리(결제 대기 주문은 실패로 닫는다: 탈퇴 뒤 결제가 이어지지 않게)
  await sbRest(env, `commerce_orders?user_id=eq.${enc}&status=eq.pending`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', failure: 'withdrawn' }) });
  const moved = await sbRest(env, `commerce_orders?user_id=eq.${enc}`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ user_id: null, withdrawn_at: at, birth: null }) });
  // 1-1) 회원 계정으로 신청한 커뮤니티 출시 알림은 지운다(2026-11-15, 표가 아직 없으면 건너뜀). 커뮤니티 접근 권한은 아래 회원 삭제 때 cascade
  try { await sbRest(env, `launch_alerts?user_id=eq.${enc}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } }); } catch { }
  // 1-2) 운명의 광장 글·댓글은 지운 상태로 바꾼다(다른 회원에게 보이지 않음, 답글 흐름만 '삭제된 댓글입니다'로 남음). 반응·차단·제재는 회원 삭제 때 cascade
  for (const t of ['cm_posts', 'cm_comments']) { try { await sbRest(env, `${t}?author_id=eq.${enc}&status=neq.deleted`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted' }) }); } catch { } }
  // 1-3) 운명의 광장 프로필 사진(R2) 지우기 — 프로필 행은 회원 삭제 때 cascade 로 지워지지만 사진 파일은 따로 지워야 한다
  try { const pr = await sbRest(env, `member_profiles?user_id=eq.${enc}&select=avatar_path`); const k = Array.isArray(pr) && pr[0] && pr[0].avatar_path; if (k && /^cm-av\/[0-9a-f]{32}\.(webp|jpg|png)$/.test(k) && env.CLIPS_R2) await env.CLIPS_R2.delete(k); } catch { }
  // 2) 회원 삭제(구매 권한·저장한 사주는 cascade 로 함께 삭제)
  const d = await fetch(base(env) + '/auth/v1/admin/users/' + enc, { method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(10000) });
  if (!d.ok && d.status !== 404) return { ok: false, error: 'delete-failed:' + d.status };
  // 3) 카카오 연결 끊기
  const kakao = ids.find(i => i.provider === 'kakao');
  const kakaoUnlinked = kakao ? await kakaoUnlink(env, kakao.provider_id) : false;
  return { ok: true, orders: Array.isArray(moved) ? moved.length : 0, kakaoUnlinked };
}
// 카카오 연결 해제 알림의 Authorization: 'KakaoAK <대표 어드민 키>' 와 같은지(상수 시간 비교)
export function kakaoAuthOk(request, env) {
  const want = env && env.KAKAO_ADMIN_KEY ? 'KakaoAK ' + env.KAKAO_ADMIN_KEY : '';
  const got = request.headers.get('authorization') || '';
  if (!want || got.length !== want.length) return false;
  let d = 0; for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}
