// 성인 본인확인(5단계) — 포트원 V2 본인인증. 인연 매칭·대화를 쓰려면 필요하다.
// 환경변수: PORTONE_STORE_ID·PORTONE_API_SECRET(결제와 같은 값) + PORTONE_IDV_CHANNEL_KEY(본인인증 채널 키: 포트원 콘솔에서 다날·KG이니시스 등 본인인증 채널을 추가해 받은 값)
// GET                          → { verified, provider, birthYear, gender, configured }
// POST { action:'start' }      → { storeId, channelKey, identityVerificationId } — 화면이 포트원 본인인증 창을 연다(이 회원 것으로 30분 기억)
// POST { action:'confirm', id } → 서버가 포트원에 직접 결과를 물어 VERIFIED·만 19세 기준(연 나이 19세 이상)·중복 가입을 확인하고 요약만 저장
//        저장: 출생 연도·성별·CI 해시(같은 사람이 여러 계정으로 인증하지 못하게). 이름·전화번호·생년월일 전체·CI 원문은 저장하지 않는다
// POST { action:'manual', email, birthYear, gender } — 관리자 전용(테스트 계정 수동 확인, 본인인증 채널 연결 전). 감사 로그
import { featureGate } from '../../_features.js';
import { json, isAdmin, sbRest, supabaseReady, viewer, readBody, overLimit } from '../../_plaza.js';
import { portoneCall } from '../../_commerce.js';
import { readConsents, requiredOk } from '../../_consent.js';
import { audit, reviewerOf } from '../../_community.js';
import { isAdultYear } from '../../_match.js';

const enc = encodeURIComponent;
export const idvReady = env => !!(env.PORTONE_STORE_ID && env.PORTONE_API_SECRET && env.PORTONE_IDV_CHANNEL_KEY);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const ciHash = async (env, ci) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cm-ci:' + (env.COMMUNITY_SECRET || env.ADMIN_PASSWORD || '') + ':' + ci)));
const KV_TTL = 1800;

async function current(env, uid) {
  const r = await sbRest(env, `adult_verifications?user_id=eq.${enc(uid)}&select=provider,birth_year,gender,verified_at`);
  return Array.isArray(r) ? r[0] || null : null;
}

export async function onRequestGet({ request, env }) {
  { const off = await featureGate(request, env, 'match'); if (off) return off; }   // 9단계 기능별 스위치(functions/_features.js)
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const v = await current(env, me.id);
  return json({ verified: !!(v && isAdultYear(v.birth_year)), provider: v ? v.provider : null, birthYear: v ? v.birth_year : null, gender: v ? v.gender : null, configured: idvReady(env) });
}

export async function onRequestPost({ request, env }) {
  { const off = await featureGate(request, env, 'match'); if (off) return off; }   // 9단계 기능별 스위치(functions/_features.js)
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  if (b.action === 'manual') return manual(request, env, b);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  if (!requiredOk(await readConsents(env, me.id))) return json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409);
  const have = await current(env, me.id);
  if (have && isAdultYear(have.birth_year)) return json({ ok: true, verified: true });
  if (await overLimit(env, 'idv:' + me.id, 20)) return json({ error: '본인인증 시도는 하루 20번까지예요. 내일 다시 해 주세요' }, 429);   // 9단계 도배·봇 방지(하루 한도)
  if (b.action === 'start') {
    if (!idvReady(env)) return json({ error: '본인인증을 준비하고 있습니다. 조금만 기다려 주세요', configured: false }, 503);
    const id = 'idv-' + hex(crypto.getRandomValues(new Uint8Array(12)));
    if (env.GLOSSARY_KV) await env.GLOSSARY_KV.put('cm:idv:' + id, me.id, { expirationTtl: KV_TTL });
    return json({ storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_IDV_CHANNEL_KEY, identityVerificationId: id });
  }
  if (b.action === 'confirm') {
    const id = String(b.id || '');
    if (!/^idv-[0-9a-f]{24}$/.test(id)) return json({ error: '본인인증 정보가 올바르지 않습니다' }, 400);
    const owner = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get('cm:idv:' + id) : null;
    if (owner !== me.id) return json({ error: '본인인증 시간이 지났거나 다른 계정의 인증입니다. 다시 시도해 주세요' }, 409);
    const r = await portoneCall(env, `identity-verifications/${enc(id)}?storeId=${enc(env.PORTONE_STORE_ID)}`);
    const d = r.data || {};
    if (!r.ok || d.status !== 'VERIFIED' || !d.verifiedCustomer) return json({ error: '본인인증이 완료되지 않았습니다' }, 400);
    const c = d.verifiedCustomer, by = +(String(c.birthDate || '').slice(0, 4));
    if (!isAdultYear(by)) { await env.GLOSSARY_KV.delete('cm:idv:' + id); return json({ error: '인연 찾기는 성인(만 19세 이상)만 이용할 수 있습니다', reason: 'minor' }, 403); }
    const gender = c.gender === 'MALE' ? 'M' : c.gender === 'FEMALE' ? 'F' : null;
    const h = c.ci ? await ciHash(env, c.ci) : null;
    if (h) { const dup = await sbRest(env, `adult_verifications?ci_hash=eq.${h}&user_id=neq.${enc(me.id)}&select=user_id`); if (Array.isArray(dup) && dup.length) return json({ error: '이미 다른 계정에서 본인인증에 쓰인 정보입니다. 한 사람은 한 계정만 쓸 수 있습니다', reason: 'duplicate' }, 409); }
    await sbRest(env, 'adult_verifications?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: me.id, provider: 'portone', birth_year: by, gender, ci_hash: h, verified_at: new Date().toISOString(), verified_by: null }) });
    await env.GLOSSARY_KV.delete('cm:idv:' + id);
    return json({ ok: true, verified: true, gender });
  }
  return json({ error: '잘못된 요청입니다' }, 400);
}

async function manual(request, env, b) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const by = +b.birthYear, gender = b.gender === 'M' || b.gender === 'F' ? b.gender : null;
  if (!isAdultYear(by)) return json({ error: '성인(연 나이 19세 이상) 출생 연도를 넣어 주세요' }, 400);
  if (!gender) return json({ error: '성별을 골라 주세요' }, 400);
  let uid = /^[0-9a-f-]{36}$/i.test(String(b.userId || '')) ? b.userId : null;
  if (!uid && b.email) { const r = await sbRest(env, 'rpc/community_user_by_email', { method: 'POST', body: JSON.stringify({ p_email: String(b.email) }) }); uid = typeof r === 'string' ? r : null; }
  if (!uid) return json({ error: '그 이메일로 가입한 회원을 찾지 못했습니다' }, 404);
  const actor = reviewerOf(request) || '관리자';
  await sbRest(env, 'adult_verifications?on_conflict=user_id', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, provider: 'manual', birth_year: by, gender, ci_hash: null, verified_at: new Date().toISOString(), verified_by: actor }) });
  await audit(env, actor, 'community.verify.manual', uid, { birthYear: by, gender });
  return json({ ok: true });
}
