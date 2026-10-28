// 주역 콘텐츠 검수·승인·게시 API (관리자 전용). 규칙: report/iching/review-core.js, 저장: functions/_iching-review.js. 설계: docs/ICHING_REVIEW_ADMIN_DESIGN.md
//   GET  ?a=state | grid | hex | items | item | log | releases | preview
//   POST ?a=review | edit | revert | publish | rollback | flags     (JSON 본문)
// 모든 호출에 Authorization: Bearer <관리자 비밀번호>가 필요하다. 사용자 서비스 API 가 아니므로 공개 경로가 없다.
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';
import * as S from '../_iching-review.js';

const reply = r => json(r, r && r.status ? r.status : (r && r.ok === false ? 400 : 200));
const guard = ({ request, env }) => {
  const err = configError(env); if (err) return json({ ok: false, error: err }, 500);
  if (!isAdmin(request, env)) return json({ ok: false, error: '관리자 인증이 필요합니다' }, 401);
  return null;
};

export async function onRequestGet(ctx) {
  const g = guard(ctx); if (g) return g;
  const q = new URL(ctx.request.url).searchParams, a = q.get('a') || 'state', kv = kvOf(ctx.env), o = Object.fromEntries(q);
  try {
    if (a === 'state') return reply(await S.getState(kv));
    if (a === 'items') return reply(await S.listItems(kv, o));
    if (a === 'item') return reply(await S.getItem(kv, o.key || ''));
    if (a === 'hex') return reply(await S.getHex(kv, o.num));
    if (a === 'grid') return reply(await S.getGrid(kv));
    if (a === 'log') return reply({ ok: true, log: await S.readLog(kv, { key: o.key, limit: Math.min(200, +o.limit || 50) }) });
    if (a === 'releases') return reply(await S.listReleases(kv));
    if (a === 'preview') return reply(await S.preview(kv, o));
    return json({ ok: false, error: 'unknown-action' }, 400);
  } catch (e) { return json({ ok: false, error: 'server-error' }, 500); }
}

export async function onRequestPost(ctx) {
  const g = guard(ctx); if (g) return g;
  const a = new URL(ctx.request.url).searchParams.get('a') || '', kv = kvOf(ctx.env), by = ctx.request.headers.get('x-reviewer');
  let b; try { const raw = await ctx.request.text(); if (raw.length > 200000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const dec = v => { try { return decodeURIComponent(v); } catch { return ''; } }; // 헤더는 ASCII 만 되므로 검수자 이름은 URL 인코딩해서 보낸다
  const who = 'admin' + (by ? ':' + dec(by).replace(/[^\w가-힣 .@-]/g, '').slice(0, 30) : '');
  try {
    if (a === 'review') return reply(await S.review(kv, b, who));
    if (a === 'edit') return reply(await S.edit(kv, b, who));
    if (a === 'revert') return reply(await S.revert(kv, b, who));
    if (a === 'publish') return reply(await S.publish(kv, b, who));
    if (a === 'rollback') return reply(await S.rollback(kv, b, who));
    if (a === 'flags') return reply(await S.setFlags(kv, b, who));
    return json({ ok: false, error: 'unknown-action' }, 400);
  } catch (e) { return json({ ok: false, error: 'server-error' }, 500); }
}
