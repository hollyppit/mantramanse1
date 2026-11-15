// 오늘의 운테크 + 오늘 기록 + 같은 일주·일간 익명 통계(4단계). 공용: functions/_daily.js, functions/_plaza.js
// GET  → { day, card, log, stats:{ ilju, ilgan } }  — 회원 + 필수 동의 + 일주 확인이 필요(없으면 need)
//        stats 는 20명 이상 기록한 날만 열리고, 10명 미만 칸은 숨기고, 비율은 5% 단위(functions/_daily.js groupStats)
// POST { mood:1~5, tags?:[], note? } → 오늘 기록 저장(하루 한 번, 다시 보내면 고침). 기록은 본인만 본다
import { json, sbRest, supabaseReady, viewer, profileOf, badText, readBody } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { todayCard, kstDay, groupStats, LOG_TAGS } from '../../_daily.js';

const enc = encodeURIComponent;
async function who(request, env) {
  if (!supabaseReady(env)) return { res: json({ error: '잠시 후 다시 시도해 주세요' }, 503) };
  const me = await viewer(request, env); if (!me) return { res: json({ error: '로그인이 필요합니다', need: 'login' }, 401) };
  if (!requiredOk(await readConsents(env, me.id))) return { res: json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409) };
  const p = await profileOf(env, me.id);
  if (!p || !p.ilju) return { res: json({ error: '내 일주를 먼저 확인해 주세요', need: 'ilju' }, 409) };
  return { me, p };
}

export async function onRequestGet({ request, env }) {
  const w = await who(request, env); if (w.res) return w.res;
  const day = kstDay(), card = todayCard(w.p.ilju, day);
  const [mine, a, b] = await Promise.all([
    sbRest(env, `cm_logs?user_id=eq.${enc(w.me.id)}&day=eq.${day}&select=mood,tags,note,updated_at`),
    sbRest(env, `cm_logs?day=eq.${day}&ilju=eq.${enc(w.p.ilju)}&select=mood,tags&limit=5000`),
    sbRest(env, `cm_logs?day=eq.${day}&ilgan=eq.${enc(w.p.ilgan)}&select=mood,tags&limit=5000`),
  ]);
  const log = Array.isArray(mine) && mine[0] ? { mood: mine[0].mood, tags: mine[0].tags || [], note: mine[0].note || '', at: mine[0].updated_at } : null;
  return json({ day, card, log, tags: LOG_TAGS, stats: { ilju: { key: w.p.ilju, ...groupStats(a || []) }, ilgan: { key: w.p.ilgan, ...groupStats(b || []) } } });
}

export async function onRequestPost({ request, env }) {
  const w = await who(request, env); if (w.res) return w.res;
  const body = await readBody(request); if (!body) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const mood = +body.mood; if (!Number.isInteger(mood) || mood < 1 || mood > 5) return json({ error: '오늘 기분을 골라 주세요' }, 400);
  const tags = [...new Set((Array.isArray(body.tags) ? body.tags : []).filter(t => LOG_TAGS[t]))].slice(0, 4);
  const note = String(body.note || '').replace(/\r/g, '').trim().slice(0, 500) || null;
  if (note) { const bad = badText(note); if (bad && !/링크/.test(bad)) return json({ error: bad.replace('올릴 수 없습니다', '적지 말아 주세요') }, 400); }   // 나만 보는 기록이라 링크는 허용, 개인정보는 막는다
  const day = kstDay(), card = todayCard(w.p.ilju, day), at = new Date().toISOString();
  await sbRest(env, 'cm_logs?on_conflict=user_id,day', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: w.me.id, day, mood, tags, note, ilju: w.p.ilju, ilgan: w.p.ilgan, ten_god: card ? card.tenGod : null, updated_at: at }) });
  return json({ ok: true, day });
}
