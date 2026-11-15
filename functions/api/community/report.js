// 운명의 광장 신고. POST { type:'post'|'comment', id, reason, detail? } → { ok }
//   같은 사람이 같은 대상을 두 번 신고해도 같은 응답(한 건만 남음). 하루 20건.
//   서로 다른 회원 5명이 신고하면 관리자 확인 전까지 자동으로 숨긴다(관리자 화면에서 되살리거나 확정)
import { json, sbRest, supabaseReady, viewer, overLimit, okId, readBody, REASONS } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';

export const AUTO_HIDE = 5;

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  if (!requiredOk(await readConsents(env, me.id))) return json({ error: '이용 동의 후 신고할 수 있습니다', need: 'consent' }, 409);
  const b = await readBody(request); if (!b || !['post', 'comment'].includes(b.type) || !okId(b.id)) return json({ error: '잘못된 요청입니다' }, 400);
  if (!REASONS[b.reason]) return json({ error: '신고 사유를 골라 주세요' }, 400);
  const detail = String(b.detail || '').trim().slice(0, 300) || null;
  const tbl = b.type === 'post' ? 'cm_posts' : 'cm_comments';
  const t = await sbRest(env, `${tbl}?id=eq.${b.id}&select=id,author_id,status`); const row = Array.isArray(t) ? t[0] : null;
  if (!row || row.status === 'deleted') return json({ error: '삭제되었거나 볼 수 없는 글입니다' }, 404);
  if (row.author_id === me.id) return json({ error: '내 글은 신고할 수 없습니다' }, 400);
  const dup = await sbRest(env, `cm_reports?reporter_id=eq.${encodeURIComponent(me.id)}&target_type=eq.${b.type}&target_id=eq.${b.id}&select=id`);
  if (Array.isArray(dup) && dup.length) return json({ ok: true });
  if (await overLimit(env, 'report:' + me.id, 20)) return json({ error: '신고는 하루 20건까지 할 수 있습니다' }, 429);
  await sbRest(env, 'cm_reports', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ reporter_id: me.id, target_type: b.type, target_id: +b.id, target_author: row.author_id, reason: b.reason, detail }) });
  const open = await sbRest(env, `cm_reports?target_type=eq.${b.type}&target_id=eq.${b.id}&status=eq.open&select=reporter_id`);
  if (Array.isArray(open) && new Set(open.map(x => x.reporter_id)).size >= AUTO_HIDE && row.status === 'visible')
    await sbRest(env, `${tbl}?id=eq.${b.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'hidden' }) });
  return json({ ok: true });
}
