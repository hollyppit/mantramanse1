// 인연의 광장 '나'. 공용: functions/_plaza.js
// GET  → { member, requiredOk, profile:{ nickname, ilju, ilgan, ilganLabel, showIlju, showIlgan, visibility, avatar, avatarKind, posterGender }, groups:{ ilju:{ key, size, gathering }, ilgan:{…} }, sanction }
//        avatar = 내 사진(직접 올린 것) 또는 내 일간 포스터(본인 화면이라 공개 여부와 상관없이)
//        gathering = 모임 인원이 MIN_GROUP 명보다 적다(모임 화면에 '아직 모이는 중' 안내, 글은 전체 피드에도 보인다)
// POST { action:'gender', gender:'M'|'F' }  일간 포스터를 남·녀 중 어느 그림으로 보일지
// POST { action:'ilju', birth:{ year, month, day, calendar, leap, hour?, minute?, jasi?, timeMode? }, gender?:'M'|'F' }
//        → 서버가 만세력으로 일주를 계산해 일주·일간 값만 저장한다(출생 입력은 저장하지 않는다). { ok, ilju, ilgan }
import { json, sbRest, supabaseReady, viewer, profileOf, activeSanction, iljuOfBirth, groupSize, ilganLabel, overLimit, readBody, MIN_GROUP, avatarOf, posterMap } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { touchLater } from '../../_activity.js';
import { readFeatures, cleanFeatures } from '../../_features.js';

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const features = cleanFeatures(await readFeatures(env));   // 9단계: 꺼진 기능은 화면에서 탭을 숨긴다
  const me = await viewer(request, env); if (!me) return json({ member: false, features });
  const tl = touchLater(ctx, env, me.id, 'community');   // 이용 기록(날짜·영역만, 7단계 지표)
  const [consents, p, s, posters] = await Promise.all([readConsents(env, me.id), profileOf(env, me.id), activeSanction(env, me.id), posterMap(env)]);
  const av = avatarOf(p, posters, true);
  if (tl) await tl;   // waitUntil 이 없는 환경(테스트)만 기다린다
  const groups = {};
  if (p && p.ilju) { const n = await groupSize(env, 'ilju', p.ilju); groups.ilju = { key: p.ilju, size: n, gathering: n < MIN_GROUP }; }
  if (p && p.ilgan) { const n = await groupSize(env, 'ilgan', p.ilgan); groups.ilgan = { key: p.ilgan, label: ilganLabel(p.ilgan), size: n, gathering: n < MIN_GROUP }; }
  return json({
    member: true, requiredOk: requiredOk(consents), features,
    profile: p ? { nickname: p.nickname || '', ilju: p.ilju || null, ilgan: p.ilgan || null, ilganLabel: p.ilgan ? ilganLabel(p.ilgan) : null, showIlju: !!p.show_ilju, showIlgan: !!p.show_ilgan, visibility: p.visibility, avatar: av ? av.url : null, avatarKind: av ? av.kind : null, posterGender: p.poster_gender || null } : null,
    groups, sanction: s ? { kind: s.kind, until: s.until } : null, minGroup: MIN_GROUP,
  });
}

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  if (!requiredOk(await readConsents(env, me.id))) return json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409);
  const b = await readBody(request); if (!b || (b.action !== 'ilju' && b.action !== 'gender')) return json({ error: '잘못된 요청입니다' }, 400);
  const gender = b.gender === 'M' || b.gender === 'F' ? b.gender : null;
  if (b.action === 'gender') {
    if (!gender) return json({ error: '남·여 중에서 골라 주세요' }, 400);
    await sbRest(env, 'member_profiles?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: me.id, poster_gender: gender, updated_at: new Date().toISOString() }) });
    return json({ ok: true, posterGender: gender });
  }
  if (await overLimit(env, 'ilju:' + me.id, 10)) return json({ error: '일주 확인은 하루 10번까지 할 수 있습니다' }, 429);
  const r = iljuOfBirth(b.birth); if (!r) return json({ error: '생년월일을 다시 확인해 주세요' }, 400);
  await sbRest(env, 'member_profiles?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: me.id, ilju: r.ilju, ilgan: r.ilgan, ...(gender ? { poster_gender: gender } : {}), updated_at: new Date().toISOString() }) });
  return json({ ok: true, ilju: r.ilju, ilgan: r.ilgan, ilganLabel: ilganLabel(r.ilgan) });
}
