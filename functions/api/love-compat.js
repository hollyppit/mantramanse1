// POST /api/love-compat — 인연운 심화 마지막 장 '그 사람과 나의 궁합'(report/v2/love-compat.js)
//   { a: 'status', me, device }                         → { ok, access: { ok, reason }, quota: { left, limit } | null }
//   { a: 'run', me, name, partner, partnerName, device } → { ok, result, quota }   (잠김 401·402 · 횟수 초과 429)
//   me: 내 출생 입력(년·월·일·시·분·달력·성별·경도 + 계산 기준 설정) — 서버가 원국을 다시 계산해 결제 권한(사주 해시)을 확인한다.
//   partner: 상대 출생 입력(시간 모름 가능). 둘 다 서버에 저장하지 않는다. 계산·횟수 규칙은 functions/_love-compat.js 참고.
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import { chapterGate, lockedResponse, memberOf } from '../_commerce.js';
import { CHAPTER_ID, TOPIC_ID, cleanBirth, settingsOf, chartOf, sdOf, evaluateAll, quotaLeft, quotaCheck, quotaCommit } from '../_love-compat.js';

const ipOf = request => request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
const ERR = { 'bad-input': '입력을 확인해 주세요.', 'bad-date': '생년월일을 확인해 주세요.', 'bad-time': '태어난 시각을 확인해 주세요.', 'bad-gender': '성별을 골라 주세요.' };
async function dayCompatOn(env) { try { const d = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get('luckenv:flags', 'json') : null; return !!(d && d.dayCompat === true); } catch { return false; } }

export async function onRequestPost({ request, env }) {
  let b; try { const raw = await request.text(); if (raw.length > 8000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const a = b && b.a;
  if (a !== 'status' && a !== 'run') return json({ ok: false, error: 'bad-action' }, 400);
  const me = cleanBirth(b.me);
  if (me.error) return json({ ok: false, error: 'bad-me', message: '내 사주 정보를 다시 입력해 주세요.' }, 400);
  let chA; try { chA = chartOf(me, settingsOf(b.me)); } catch { return json({ ok: false, error: 'bad-me', message: '내 사주 정보를 다시 입력해 주세요.' }, 400); }
  const gate = await chapterGate(request, env, { topicId: TOPIC_ID, chapterId: CHAPTER_ID, sd: sdOf(chA) });
  const unlimited = !!(gate.ok && (gate.admin || gate.monitor));
  const kv = env.GLOSSARY_KV ? kvOf(env) : null;
  const member = gate.ok && !unlimited ? await memberOf(request, env) : null;
  const ctx = { memberId: member && member.id, device: b.device, ip: ipOf(request) };

  if (a === 'status') {
    let quota = null;
    if (unlimited) quota = { left: null, limit: null, unlimited: true };
    else if (kv) { try { quota = await quotaLeft(kv, ctx); } catch { quota = null; } }
    return json({ ok: true, access: { ok: !!gate.ok, reason: gate.ok ? null : gate.reason }, quota, admin: isAdmin(request, env) || undefined });
  }

  if (!gate.ok) return lockedResponse(gate);
  const partner = cleanBirth(b.partner);
  if (partner.error) return json({ ok: false, error: partner.error, message: ERR[partner.error] || ERR['bad-input'] }, 400);
  let slot = null;
  if (!unlimited) {
    if (!kv) return json({ ok: false, error: 'unavailable', message: '지금은 궁합을 볼 수 없어요. 잠시 후 다시 시도해 주세요.' }, 503);
    slot = await quotaCheck(kv, ctx);
    if (!slot.ok) return json({ ok: false, error: slot.error, quota: { left: slot.left, limit: slot.limit } }, 429);
  }
  let result;
  try {
    const chB = chartOf(partner, settingsOf(b.me));   // 시간 계산 기준은 내 사주와 같게(만세력 궁합 탭과 같음)
    result = evaluateAll(chA, chB, { a: b.name, b: b.partnerName }, { dayCompat: await dayCompatOn(env) });
  } catch (e) { return json({ ok: false, error: 'compute-failed', message: '궁합을 계산하지 못했어요. 입력을 확인해 주세요.' }, 400); }
  const quota = slot ? await quotaCommit(kv, slot) : { left: null, limit: null, unlimited: true };
  return json({ ok: true, result, quota });
}
