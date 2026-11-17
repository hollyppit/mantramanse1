// POST /api/newyear/reading — 신년운세 풀이(서버 조합). AI 호출 없음.
// 요청: { birth: { year, month, day, calendar, leap, hour?, minute?, gender? }, year: 2027 } + 선택 헤더 x-member-token(회원), Authorization(관리자), x-view-as: free
// 응답: { ok, year, access: { state, reason }, product, reading } — state 'open' 이면 전체, 'teaser' 면 맛보기(잠긴 장은 제목만), 'closed' 면 reading 없음.
// 출생 입력은 저장하지 않는다(응답에도 되돌려 주지 않음).
import { json, isAdmin } from '../../_lib.js';
import { cleanBirth } from '../../_commerce.js';
import { NY, YEARS } from '../../_newyear-runtime.js';
import { newyearGate, teaserOf, loadNewyearConfig, yearConfig } from '../../_newyear.js';
import { loadContent, applyContent } from '../../_newyear-content.js';

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const birth = cleanBirth(body && body.birth);
  if (!birth) return json({ ok: false, error: 'invalid-birth' }, 400);
  const year = Number(body && body.year);
  if (!YEARS().includes(year)) return json({ ok: false, error: 'unknown-year', years: YEARS() }, 404);
  const deps = NY();
  let gate;
  try { gate = await newyearGate(request, env, { year, birth, Manse: deps.Manse }); }
  catch (e) { return json({ ok: false, error: 'invalid-birth', message: String((e && e.message) || e).slice(0, 120) }, 400); }
  const access = { state: gate.state, reason: gate.reason };
  if (gate.state === 'closed') return json({ ok: true, year, access, product: gate.product, reading: null }, 200);
  const cfg = yearConfig(await loadNewyearConfig(env), year);
  const mode = gate.admin && (request.headers.get('x-content-mode') || '') === 'preview' ? 'preview' : cfg.contentMode === 'preview' && gate.admin ? 'preview' : 'public';
  let reading;
  const live = applyContent(deps, await loadContent(env), mode);   // 관리자 검수·수정 반영(공개 모드는 승인한 문구만)
  try { reading = deps.NewyearCompose.compose({ birth, targetYear: year, mode, monthStyle: cfg.monthStyle === 'premium' ? 'premium' : undefined, deepApproved: cfg.monthStyle === 'premium' }, live); }
  catch (e) { return json({ ok: false, error: 'compose-failed', message: String((e && e.message) || e).slice(0, 160) }, 400); }
  if (gate.state === 'teaser') reading = teaserOf(reading, gate.teaser);
  return json({ ok: true, year, access, product: gate.product, intro: cfg.intro || '', reading, admin: isAdmin(request, env) ? { mode } : undefined }, 200);
}
