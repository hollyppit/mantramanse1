// 인연 매칭(5단계). 공용: functions/_match.js · 설계: docs/MATCHING_CHAT_PLAN_2026-11-16.md
// GET  ?view=profile → { verified, verification, profile, options }           내 인연 프로필(없으면 기본값, 꺼짐)
// GET  ?view=today   → { day, cards:[{ handle, name, avatar, ilju, age, region, intro, purposes, interests, compat:{good,care}, life, sent }] }
// GET  ?view=inbox   → { received:[카드], sent:[{ handle, name, avatar, at }], matches:[{ room, handle, name, avatar }] }
// POST { action:'profile', active, purposes, intro, region, interests, wantGender, wantAgeMin, wantAgeMax, wantRegion }
// POST { action:'like', handle, note?, useCredit?, req? }  인연 잇기(오늘의 인연 또는 나에게 온 관심만). 서로 이으면 대화방이 열린다 → { ok, matched, room }
//        하루 한도를 넘으면 429 { need:'credit', price } — 유료 스위치가 켜져 있고 useCredit:true 면 크레딧으로 잇는다(6단계)
// POST { action:'pass', handle }         넘기기(조용히, 상대에게 알리지 않음)
// POST { action:'withdraw', handle }     보낸 관심 거두기
// 조건: 로그인 + 필수 동의 + 닉네임 + 일주 확인 + 성인 본인확인 + 이용 제재 없음
import { json, sbRest, supabaseReady, viewer, profileOf, activeSanction, blockedIds, avatarOf, posterMap, badText, overLimit, readBody, ilganLabel } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { kstDay } from '../../_daily.js';
import { PURPOSES, REGIONS, INTERESTS, LIKE_PER_DAY, verificationOf, handleOf, resolveHandle, compat, life, pickToday, ageOf, ageBand, candidatePool } from '../../_match.js';
import { loadPremium, spend, okReq } from '../../_credits.js';

const enc = encodeURIComponent;
const pick = (a, allowed, max) => [...new Set((Array.isArray(a) ? a : []).filter(x => allowed.includes(x)))].slice(0, max);
const mpOf = async (env, uid) => { const r = await sbRest(env, `cm_match_profiles?user_id=eq.${enc(uid)}&select=*`); return Array.isArray(r) ? r[0] || null : null; };
const DEF = { active: false, purposes: [], intro: '', region: null, interests: [], want_gender: [], want_age_min: 19, want_age_max: 99, want_region: 'any' };
const out = p => ({ active: !!p.active, purposes: p.purposes || [], intro: p.intro || '', region: p.region || null, interests: p.interests || [], wantGender: p.want_gender || [], wantAgeMin: p.want_age_min, wantAgeMax: p.want_age_max, wantRegion: p.want_region });

async function who(request, env, need = true) {
  if (!supabaseReady(env)) return { res: json({ error: '잠시 후 다시 시도해 주세요' }, 503) };
  const me = await viewer(request, env); if (!me) return { res: json({ error: '로그인이 필요합니다', need: 'login' }, 401) };
  if (!requiredOk(await readConsents(env, me.id))) return { res: json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409) };
  const [p, v, s] = await Promise.all([profileOf(env, me.id), verificationOf(env, me.id), activeSanction(env, me.id)]);
  if (!need) return { me, p, v, s };
  if (!p || !p.nickname) return { res: json({ error: '먼저 닉네임을 정해 주세요', need: 'profile' }, 409) };
  if (!p.ilju) return { res: json({ error: '내 일주를 먼저 확인해 주세요', need: 'ilju' }, 409) };
  if (!v) return { res: json({ error: '인연 찾기는 성인 본인확인 후 이용할 수 있습니다', need: 'verify' }, 403) };
  if (s) return { res: json({ error: '운영 정책 위반으로 지금은 인연 찾기를 이용할 수 없습니다', need: 'sanction' }, 403) };
  return { me, p, v, s };
}

// 상대 여러 명의 카드 재료를 한 번에
async function people(env, ids) {
  if (!ids.length) return {};
  const list = ids.map(enc).join(',');
  const [ps, ms, vs, posters] = await Promise.all([
    sbRest(env, `member_profiles?user_id=in.(${list})&select=user_id,nickname,ilju,ilgan,show_ilju,show_ilgan,avatar_path,poster_gender`),
    sbRest(env, `cm_match_profiles?user_id=in.(${list})&select=*`),
    sbRest(env, `adult_verifications?user_id=in.(${list})&select=user_id,birth_year,gender`),
    posterMap(env),
  ]);
  const o = {}; ids.forEach(id => { o[id] = {}; });
  (ps || []).forEach(x => { if (o[x.user_id]) o[x.user_id].p = x; });
  (ms || []).forEach(x => { if (o[x.user_id]) o[x.user_id].m = x; });
  (vs || []).forEach(x => { if (o[x.user_id]) o[x.user_id].v = x; });
  Object.values(o).forEach(x => { x.avatar = x.p ? avatarOf(x.p, posters, true) : null; });   // 인연 프로필을 켠 사람은 인연 카드에 사진·일간 포스터가 보인다(켤 때 안내)
  return o;
}
async function card(env, viewerId, me, id, x, extra = {}) {
  const m = x.m || DEF, c = compat(me.p.ilju, x.p && x.p.ilju);
  return { handle: await handleOf(env, viewerId, id), name: (x.p && x.p.nickname) || '이름 없는 회원', avatar: x.avatar ? x.avatar.url : null, ilju: x.p && x.p.ilju || null, ilgan: x.p && x.p.ilgan ? ilganLabel(x.p.ilgan) : null, age: x.v ? ageBand(ageOf(x.v.birth_year)) : null, region: m.region || null, intro: m.intro || '', purposes: (m.purposes || []).map(k => PURPOSES[k]), interests: (m.interests || []).map(k => INTERESTS[k]).filter(Boolean), compat: c, life: life(me.m || DEF, m, x.v), ...extra };
}

export async function onRequestGet({ request, env }) {
  const view = new URL(request.url).searchParams.get('view') || 'profile';
  if (view === 'profile') {
    const w = await who(request, env, false); if (w.res) return w.res;
    const mp = await mpOf(env, w.me.id);
    return json({ verified: !!w.v, verification: w.v ? { provider: w.v.provider, gender: w.v.gender, age: ageBand(ageOf(w.v.birth_year)) } : null, ready: { nickname: !!(w.p && w.p.nickname), ilju: !!(w.p && w.p.ilju) }, profile: out(mp || DEF), options: { purposes: PURPOSES, regions: REGIONS, interests: INTERESTS } });
  }
  const w = await who(request, env); if (w.res) return w.res;
  const me = { p: w.p, m: await mpOf(env, w.me.id), v: w.v };
  if (view === 'today') {
    if (!me.m || !me.m.active) return json({ error: '인연 프로필을 먼저 켜 주세요', need: 'match-profile' }, 409);
    const day = kstDay();
    let row = await sbRest(env, `cm_daily_picks?user_id=eq.${enc(w.me.id)}&day=eq.${day}&select=picks`);
    let ids = Array.isArray(row) && row[0] ? row[0].picks || [] : null;
    if (!ids) {
      ids = pickToday(w.me.id, me.m, await candidatePool(env, w.me.id, me.m, w.v), day);
      await sbRest(env, 'cm_daily_picks?on_conflict=user_id,day', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: w.me.id, day, picks: ids }) });
    }
    const blocked = new Set(await blockedIds(env, w.me.id));
    const sent = new Set(((await sbRest(env, `cm_likes?from_id=eq.${enc(w.me.id)}&select=to_id,status`)) || []).map(x => x.to_id + ':' + x.status));
    const P = await people(env, ids.filter(id => !blocked.has(id)));
    const cards = [];
    for (const id of Object.keys(P)) if (P[id].p && P[id].m && P[id].m.active) cards.push(await card(env, w.me.id, me, id, P[id], { sent: sent.has(id + ':pending') || sent.has(id + ':matched'), passed: sent.has(id + ':passed') }));
    return json({ day, cards });
  }
  if (view === 'inbox') {
    const [recv, sent, rooms] = await Promise.all([
      sbRest(env, `cm_likes?to_id=eq.${enc(w.me.id)}&status=eq.pending&select=from_id,note,created_at&order=created_at.desc&limit=50`),
      sbRest(env, `cm_likes?from_id=eq.${enc(w.me.id)}&status=eq.pending&select=to_id,created_at&order=created_at.desc&limit=50`),
      sbRest(env, `cm_rooms?or=(a_id.eq.${enc(w.me.id)},b_id.eq.${enc(w.me.id)})&status=eq.open&select=id,a_id,b_id,last_at&order=last_at.desc&limit=100`),
    ]);
    const blocked = new Set(await blockedIds(env, w.me.id));
    const rIds = (recv || []).map(x => x.from_id).filter(id => !blocked.has(id)), sIds = (sent || []).map(x => x.to_id), mIds = (rooms || []).map(r => r.a_id === w.me.id ? r.b_id : r.a_id).filter(Boolean);
    const P = await people(env, [...new Set([...rIds, ...sIds, ...mIds])]);
    const received = []; for (const x of recv || []) if (P[x.from_id] && P[x.from_id].p && !blocked.has(x.from_id)) received.push(await card(env, w.me.id, me, x.from_id, P[x.from_id], { note: x.note || '', at: x.created_at }));
    const sentOut = []; for (const x of sent || []) if (P[x.to_id] && P[x.to_id].p) sentOut.push({ handle: await handleOf(env, w.me.id, x.to_id), name: P[x.to_id].p.nickname, avatar: P[x.to_id].avatar ? P[x.to_id].avatar.url : null, at: x.created_at });
    const matches = []; for (const r of rooms || []) { const o = r.a_id === w.me.id ? r.b_id : r.a_id; if (P[o] && P[o].p) matches.push({ room: r.id, handle: await handleOf(env, w.me.id, o), name: P[o].p.nickname, avatar: P[o].avatar ? P[o].avatar.url : null, at: r.last_at }); }
    return json({ received, sent: sentOut, matches });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}

export async function onRequestPost({ request, env }) {
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  if (b.action === 'profile') {
    const w = await who(request, env, false); if (w.res) return w.res;
    if (b.active === true) {
      if (!w.p || !w.p.nickname) return json({ error: '먼저 닉네임을 정해 주세요', need: 'profile' }, 409);
      if (!w.p.ilju) return json({ error: '내 일주를 먼저 확인해 주세요', need: 'ilju' }, 409);
      if (!w.v) return json({ error: '성인 본인확인을 먼저 해 주세요', need: 'verify' }, 403);
      if (w.s) return json({ error: '운영 정책 위반으로 지금은 켤 수 없습니다', need: 'sanction' }, 403);
    }
    const purposes = pick(b.purposes, Object.keys(PURPOSES), 3);
    if (b.active === true && !purposes.length) return json({ error: '만나고 싶은 목적을 하나 이상 골라 주세요' }, 400);
    const intro = String(b.intro || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (intro) { const bad = badText(intro); if (bad) return json({ error: bad }, 400); }
    const region = REGIONS.includes(b.region) ? b.region : null;
    if (b.active === true && !region) return json({ error: '활동 지역(시·도)을 골라 주세요' }, 400);
    const wantGender = pick(b.wantGender, ['M', 'F'], 2);
    if (b.active === true && purposes.includes('love') && !wantGender.length) return json({ error: '연애 목적이면 만나고 싶은 성별을 골라 주세요' }, 400);
    let lo = Math.max(19, Math.min(99, +b.wantAgeMin || 19)), hi = Math.max(19, Math.min(99, +b.wantAgeMax || 99)); if (lo > hi) [lo, hi] = [hi, lo];
    const row = { user_id: w.me.id, active: b.active === true, purposes, intro: intro || null, region, interests: pick(b.interests, Object.keys(INTERESTS), 6), want_gender: wantGender, want_age_min: lo, want_age_max: hi, want_region: b.wantRegion === 'same' ? 'same' : 'any', updated_at: new Date().toISOString() };
    await sbRest(env, 'cm_match_profiles?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
    if (row.active) await sbRest(env, `cm_daily_picks?user_id=eq.${enc(w.me.id)}&day=eq.${kstDay()}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });   // 조건을 바꾸면 오늘의 인연을 다시 고른다
    return json({ ok: true, profile: out(row) });
  }
  const w = await who(request, env); if (w.res) return w.res;
  const mp = await mpOf(env, w.me.id); if (!mp || !mp.active) return json({ error: '인연 프로필을 먼저 켜 주세요', need: 'match-profile' }, 409);
  // 상대 찾기: 오늘의 인연 + 나에게 관심을 보낸 사람 + 내가 관심을 보낸 사람 안에서만
  const day = kstDay();
  const [pk, recv, sent] = await Promise.all([
    sbRest(env, `cm_daily_picks?user_id=eq.${enc(w.me.id)}&day=eq.${day}&select=picks`),
    sbRest(env, `cm_likes?to_id=eq.${enc(w.me.id)}&status=eq.pending&select=from_id`),
    sbRest(env, `cm_likes?from_id=eq.${enc(w.me.id)}&select=to_id,status`),
  ]);
  const picks = Array.isArray(pk) && pk[0] ? pk[0].picks || [] : [];
  const cands = [...new Set([...picks, ...(recv || []).map(x => x.from_id), ...(sent || []).map(x => x.to_id)])];
  const other = await resolveHandle(env, w.me.id, b.handle, cands);
  if (!other) return json({ error: '지금은 이 분에게 인연을 이을 수 없습니다' }, 404);
  const blocked = new Set([...(await blockedIds(env, w.me.id)), ...(await blockedIds(env, other))]);
  if (blocked.has(other) || blocked.has(w.me.id)) return json({ error: '지금은 이 분에게 인연을 이을 수 없습니다' }, 403);
  const now = new Date().toISOString(), mine = (sent || []).find(x => x.to_id === other);
  if (b.action === 'withdraw') {
    if (mine && mine.status === 'pending') await sbRest(env, `cm_likes?from_id=eq.${enc(w.me.id)}&to_id=eq.${enc(other)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'withdrawn', updated_at: now }) });
    return json({ ok: true });
  }
  if (b.action === 'pass') {
    if ((recv || []).some(x => x.from_id === other)) await sbRest(env, `cm_likes?from_id=eq.${enc(other)}&to_id=eq.${enc(w.me.id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'passed', updated_at: now }) });
    if (!mine) await sbRest(env, 'cm_likes', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ from_id: w.me.id, to_id: other, status: 'passed' }) });
    return json({ ok: true });
  }
  if (b.action === 'like') {
    if (mine && (mine.status === 'pending' || mine.status === 'matched')) return json({ ok: true, matched: mine.status === 'matched' });
    const note = String(b.note || '').replace(/\s+/g, ' ').trim().slice(0, 100) || null;
    if (note) { const bad = badText(note); if (bad) return json({ error: bad }, 400); }
    if (await overLimit(env, 'like:' + w.me.id, LIKE_PER_DAY)) {
      const prem = await loadPremium(env);
      if (!prem.enabled) return json({ error: '인연 잇기는 하루 ' + LIKE_PER_DAY + '번까지 할 수 있어요' }, 429);
      if (b.useCredit !== true || !okReq(b.req)) return json({ error: '오늘 인연 잇기를 모두 썼어요. 크레딧 ' + prem.prices.extraLike + '개로 더 이을 수 있어요', need: 'credit', price: prem.prices.extraLike }, 429);
      const sp = await spend(env, w.me.id, prem.prices.extraLike, 'extra_like', day, 'xl:' + w.me.id + ':' + b.req);
      if (!sp.ok) return json({ error: sp.error === 'insufficient' ? '크레딧이 부족해요' : '잠시 후 다시 시도해 주세요', need: sp.error === 'insufficient' ? 'credit-buy' : undefined, balance: sp.balance }, 402);
    }
    const theirs = (recv || []).some(x => x.from_id === other);
    const st = theirs ? 'matched' : 'pending';
    await sbRest(env, 'cm_likes?on_conflict=from_id,to_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ from_id: w.me.id, to_id: other, note, status: st, updated_at: now }) });
    if (!theirs) return json({ ok: true, matched: false });
    await sbRest(env, `cm_likes?from_id=eq.${enc(other)}&to_id=eq.${enc(w.me.id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'matched', updated_at: now }) });
    const [a, c] = [w.me.id, other].sort();
    const ex = await sbRest(env, `cm_rooms?a_id=eq.${enc(a)}&b_id=eq.${enc(c)}&select=id,status`);
    let room = Array.isArray(ex) && ex[0] ? ex[0].id : null;
    if (room) await sbRest(env, `cm_rooms?id=eq.${room}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'open', closed_by: null, closed_at: null, last_at: now }) });
    else { const r = await sbRest(env, 'cm_rooms?select=id', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({ a_id: a, b_id: c, last_at: now }) }); room = Array.isArray(r) && r[0] ? r[0].id : null; }
    return json({ ok: true, matched: true, room });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}
