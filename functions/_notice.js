// 카카오 알림톡 거래 안내(정보성, 광고 아님). 2026-11-27  템플릿 문안: docs/KAKAO_ALIMTALK_TEMPLATES_2026-11-27.md
//   paid   구매 완료 — 결제가 '결제 완료'로 바뀐 그 한 번(구매 확인 메일과 같은 자리)
//   answer 1:1 문의 답변 등록 — 관리자가 답변을 저장할 때
//   expire 이용 기간 만료 30일 전 — 매일 한 번 /api/commerce/expiry-notice (Supabase pg_cron)
// 받는 번호: 회원이 마이페이지 '카카오톡 알림 받기'에 직접 적은 번호(member_profiles.notify_phone)만 쓴다.
//   결제창에 적은 번호·광고 수신용 번호(phone)는 쓰지 않는다(수집 목적이 다르다). 번호가 없으면 메일만 간다.
// 켜는 법: 공통 SOLAPI_* + 종류별 템플릿 ID Secret(SOLAPI_TPL_PAID·SOLAPI_TPL_ANSWER·SOLAPI_TPL_EXPIRE). 없는 종류는 조용히 건너뛴다.
// 알림톡 실패는 결제·답변 저장을 막지 않는다. 번호·문의 내용은 로그에 남기지 않는다.
import { sbRest, supabaseReady, accessUntil } from './_commerce.js';
import { solapiBaseReady, sendAlimtalk, normPhone } from './_solapi.js';

export const NOTICE_TPL = { paid: 'SOLAPI_TPL_PAID', answer: 'SOLAPI_TPL_ANSWER', expire: 'SOLAPI_TPL_EXPIRE' };
export const noticeReady = (env, kind) => solapiBaseReady(env) && !!(env && env[NOTICE_TPL[kind]]) && supabaseReady(env);
export const noticeAny = env => Object.keys(NOTICE_TPL).some(k => noticeReady(env, k));
const enc = encodeURIComponent;
const okUser = id => /^[0-9a-f-]{36}$/i.test(String(id || ''));
const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
const kday = t => { try { return new Date(t).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } };
const kmin = t => { try { return new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
// 템플릿 변수 값: 줄바꿈·변수 기호 제거, 길이 제한
const v = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f#{}]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || '-';

export async function noticePhone(env, userId) {
  if (!okUser(userId) || !supabaseReady(env)) return null;
  try { const r = await sbRest(env, `member_profiles?user_id=eq.${enc(userId)}&select=notify_phone`); return normPhone(r && r[0] && r[0].notify_phone); } catch { return null; }   // 열이 아직 없으면(마이그레이션 전) 조용히 없음
}
async function notify(env, kind, userId, vars) {
  if (!noticeReady(env, kind)) return false;
  const to = await noticePhone(env, userId); if (!to) return false;
  const r = await sendAlimtalk(env, to, vars, env[NOTICE_TPL[kind]]);
  if (!r.ok) console.log('[notice] ' + kind + ' failed ' + r.code);
  return r.ok;
}
export const paidVars = o => ({ '#{상품}': v(o.product_name, 40), '#{금액}': won(o.amount), '#{기한}': kday(accessUntil(o.paid_at || Date.now())) });
export const answerVars = q => ({ '#{제목}': v(q.subject, 40), '#{일시}': kmin(q.answered_at || Date.now()) });
export const expireVars = o => ({ '#{상품}': v(o.product_name, 40), '#{기한}': kday(accessUntil(o.paid_at)) });
export const noticePaid = (env, order) => notify(env, 'paid', order && order.user_id, paidVars(order)).catch(() => false);
export const noticeAnswer = (env, q) => notify(env, 'answer', q && q.user_id, answerVars(q)).catch(() => false);
export const noticeExpire = (env, order) => notify(env, 'expire', order && order.user_id, expireVars(order)).catch(() => false);
