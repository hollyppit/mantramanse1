// POST /api/commerce/funnel { step, vid } — 구매 전환 단계 기록(로그인 불필요, 개인정보 없음). 응답은 항상 짧게(204).
// 같은 사이트에서 온 요청만 받는다. IP 는 쓰지 않는다. 같은 방문자·날짜·단계는 DB 기본 키로 한 줄만 남아 반복 요청으로 숫자가 늘지 않는다.
import { json } from '../../_lib.js';
import { supabaseReady } from '../../_commerce.js';
import { validEvent, recordStep } from '../../_funnel.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return new Response(null, { status: 204 });
  const url = new URL(request.url);
  let origin = ''; try { origin = new URL(request.headers.get('origin') || request.headers.get('referer') || '').origin; } catch { }
  if (origin !== url.origin) return json({ error: 'origin-required' }, 403);
  const raw = await request.text(); if (raw.length > 300) return json({ error: 'too-large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad-payload' }, 400); }
  if (!validEvent(b)) return json({ error: 'bad-event' }, 400);
  try { await recordStep(env, b.step, b.vid); } catch { return json({ error: 'unavailable' }, 503); }
  return new Response(null, { status: 204 });
}
