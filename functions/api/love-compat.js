// POST /api/love-compat — 인연운 심화 마지막 장 '그 사람과 나의 궁합'(report/v2/love-compat.js)
//   { a: 'status', me, device }                         → { ok, access: { ok, reason }, quota: { left, limit } | null }
//   { a: 'run', me, name, partner, partnerName, device } → { ok, result, quota }   (잠김 401·402 · 횟수 초과 429)
//   me: 내 출생 입력(년·월·일·시·분·달력·성별·경도 + 계산 기준 설정) — 서버가 원국을 다시 계산해 결제 권한(사주 해시)을 확인한다.
//   partner: 상대 출생 입력(시간 모름 가능). 둘 다 서버에 저장하지 않는다. 계산·횟수 규칙은 functions/_love-compat.js 참고.
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import { chapterGate, lockedResponse, memberOf } from '../_commerce.js';
//   { a: 'group', me, name, includeMe, people: [{ ...출생 입력, name, role }], device } → { ok, result, quota }   (여러 명 궁합, 스위치 loveGroup — 꺼져 있으면 403)
//     나를 넣으면(includeMe) 나 + 다른 사람 2~5명, 빼면 3~6명. 한 번 보면 하루 횟수 1회만 줄어든다. 관계 네 가지를 한 번에 계산해 돌려준다.
import { CHAPTER_ID, TOPIC_ID, cleanBirth, settingsOf, chartOf, sdOf, evaluateAll, evaluateGroup, cleanGroupMeta, GROUP_MIN, GROUP_MAX, quotaLeft, quotaCheck, quotaCommit } from '../_love-compat.js';

const ipOf = request => request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
const ERR = { 'bad-input': '입력을 확인해 주세요.', 'bad-date': '생년월일을 확인해 주세요.', 'bad-time': '태어난 시각을 확인해 주세요.', 'bad-gender': '성별을 골라 주세요.' };
async function flagOn(env, k) { try { const d = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get('luckenv:flags', 'json') : null; return !!(d && d[k] === true); } catch { return false; } }
const dayCompatOn = env => flagOn(env, 'dayCompat');

export async function onRequestPost({ request, env }) {
  let b; try { const raw = await request.text(); if (raw.length > 8000) return json({ ok: false, error: 'too-large' }, 413); b = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const a = b && b.a;
  if (a !== 'status' && a !== 'run' && a !== 'group') return json({ ok: false, error: 'bad-action' }, 400);
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
    return json({ ok: true, access: { ok: !!gate.ok, reason: gate.ok ? null : gate.reason }, quota, admin: isAdmin(request, env) || undefined, group: unlimited || await flagOn(env, 'loveGroup') });
  }

  if (!gate.ok) return lockedResponse(gate);
  if (a === 'group') {
    if (!unlimited && !await flagOn(env, 'loveGroup')) return json({ ok: false, error: 'group-off', message: '여러 명 궁합은 아직 열리지 않았어요.' }, 403);
    const list = Array.isArray(b.people) ? b.people : null, withMe = b.includeMe !== false;
    const total = (list ? list.length : 0) + (withMe ? 1 : 0);
    if (!list || total < GROUP_MIN || total > GROUP_MAX) return json({ ok: false, error: 'group-size', message: `${GROUP_MIN}~${GROUP_MAX}명을 골라 주세요.` }, 400);
    const people = withMe ? [{ ch: chA, name: (typeof b.name === 'string' && b.name.trim().slice(0, 12)) || '나', me: true, id: 'me' }] : [];
    for (let k = 0; k < list.length; k++) {
      const birth = cleanBirth(list[k]);
      if (birth.error) return json({ ok: false, error: birth.error, message: `${k + 1 + (withMe ? 1 : 0)}번째 사람: ${ERR[birth.error] || ERR['bad-input']}` }, 400);
      let ch; try { ch = chartOf(birth, settingsOf(b.me)); } catch { return json({ ok: false, error: 'bad-date', message: ERR['bad-date'] }, 400); }
      const meta = cleanGroupMeta(list[k]);
      people.push({ ch, name: meta.name, role: meta.role, id: 'p' + k });
    }
    let slot = null;
    if (!unlimited) {
      if (!kv) return json({ ok: false, error: 'unavailable', message: '지금은 궁합을 볼 수 없어요. 잠시 후 다시 시도해 주세요.' }, 503);
      slot = await quotaCheck(kv, ctx);
      if (!slot.ok) return json({ ok: false, error: slot.error, quota: { left: slot.left, limit: slot.limit } }, 429);
    }
    let result;
    try { result = evaluateGroup(people); } catch (e) { return json({ ok: false, error: 'compute-failed', message: '여러 명 궁합을 계산하지 못했어요. 입력을 확인해 주세요.' }, 400); }
    const quota = slot ? await quotaCommit(kv, slot) : { left: null, limit: null, unlimited: true };
    return json({ ok: true, result, quota });
  }
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
