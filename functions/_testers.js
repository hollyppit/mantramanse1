// 관리자 테스트 회원(인연의 광장). 관리자 화면의 '인연의 광장' 버튼으로 들어가면 실제 회원과 똑같은 흐름을 이 계정으로 시험한다.
//   · A·B 두 명 — 인연 잇기·매칭·대화는 상대가 있어야 시험할 수 있어서. 서로 조건이 맞게(목적 셋 다·성별 둘 다·지역 상관없음) 만들어 둔다
//   · 처음 들어갈 때 준비(있으면 그대로): 회원 계정(내부 주소, 메일 안 감) · 필수 동의 · 광장 프로필(닉네임·일주) · 성인 확인(관리자 수동) ·
//     테스터 권한 · 인연 프로필 켜짐. 관리자가 테스트 중 바꾼 값(닉네임·프로필 등)은 덮어쓰지 않는다
//   · 실제 회원의 '오늘의 인연'에는 나오지 않는다(functions/_match.js candidatePool 이 KV 목록으로 거른다). 테스트 회원끼리는 서로 보인다
//   · 로그인: 서버가 세션을 만들어 1분짜리 일회용 코드로 맡겨 두고, /report/auth-return.html 이 코드로 받아 로그인 상태가 된다(/api/community/test-login)
import { sbRest, supabaseReady } from './_commerce.js';
import { DOCS } from './_consent.js';
import { sessionForEmail } from './_naver-login.js';

export const TESTERS_KEY = 'community:testers';
export const TESTERS = {
  a: { email: 'cm-tester-a@users.mantrafortune.com', label: '테스트 회원 A', nickname: '관리자테스트A', ilju: '갑자', ilgan: '갑', birth_year: 1990, gender: 'F', region: '서울' },
  b: { email: 'cm-tester-b@users.mantrafortune.com', label: '테스트 회원 B', nickname: '관리자테스트B', ilju: '기축', ilgan: '기', birth_year: 1992, gender: 'M', region: '서울' },
};
const base = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
const H = env => ({ apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' });
const upsert = (env, table, conflict, row, ignore) => sbRest(env, `${table}?on_conflict=${conflict}`, { method: 'POST', headers: { prefer: (ignore ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates') + ',return=minimal' }, body: JSON.stringify(row) });

export async function testerIds(env) {
  try { const d = env && env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(TESTERS_KEY, 'json') : null; return d && typeof d === 'object' ? d : {}; } catch { return {}; }
}
export async function isTester(env, uid) { const t = await testerIds(env); return !!uid && Object.values(t).includes(uid); }

async function userIdFor(env, t) {
  const found = await sbRest(env, 'rpc/community_user_by_email', { method: 'POST', body: JSON.stringify({ p_email: t.email }) }).catch(() => null);
  if (typeof found === 'string' && found) return found;
  const r = await fetch(base(env) + '/auth/v1/admin/users', { method: 'POST', headers: H(env), body: JSON.stringify({ email: t.email, email_confirm: true, user_metadata: { name: t.label, admin_tester: true } }), signal: AbortSignal.timeout(10000) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.id) throw new Error('tester-create:' + r.status);
  return j.id;
}

// 테스트 회원 준비(있으면 빠진 것만 채운다) → { id, slot, label }
export async function ensureTester(env, slot) {
  const t = TESTERS[slot]; if (!t || !supabaseReady(env)) throw new Error('bad-slot');
  const id = await userIdFor(env, t), now = new Date().toISOString();
  await Promise.all([
    ...['terms', 'privacy'].map(k => upsert(env, 'member_consents', 'user_id,kind', { user_id: id, kind: k, agreed: true, version: DOCS[k].version, granted_at: now })),
    upsert(env, 'member_profiles', 'user_id', { user_id: id, nickname: t.nickname, ilju: t.ilju, ilgan: t.ilgan, show_ilju: true, show_ilgan: true }, true),
    upsert(env, 'adult_verifications', 'user_id', { user_id: id, provider: 'manual', birth_year: t.birth_year, gender: t.gender, verified_by: '관리자 테스트 회원' }, true),
    upsert(env, 'community_access', 'user_id', { user_id: id, role: 'tester', note: t.label, granted_by: '관리자 테스트 회원' }, true),
    upsert(env, 'cm_match_profiles', 'user_id', { user_id: id, active: true, purposes: ['chat', 'friend', 'love'], intro: '관리자 테스트 계정입니다', region: t.region, interests: ['saju'], want_gender: ['M', 'F'], want_age_min: 19, want_age_max: 99, want_region: 'any' }, true),
  ]);
  if (env.GLOSSARY_KV) { const cur = await testerIds(env); if (cur[slot] !== id) await env.GLOSSARY_KV.put(TESTERS_KEY, JSON.stringify({ ...cur, [slot]: id })); }
  return { id, slot, label: t.label };
}

// 로그인 세션을 만들어 일회용 코드(1분)로 맡긴다
export const CLAIM_PREFIX = 'cm:testclaim:';
export async function testerLoginCode(env, slot) {
  const t = TESTERS[slot]; const s = await sessionForEmail(env, t.email);
  const code = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  await env.GLOSSARY_KV.put(CLAIM_PREFIX + code, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, slot }), { expirationTtl: 60 });
  return code;
}
export async function claimTesterLogin(env, code) {
  if (!/^[0-9a-f]{32}$/.test(String(code || '')) || !env.GLOSSARY_KV) return null;
  const k = CLAIM_PREFIX + code; let v = null;
  try { v = await env.GLOSSARY_KV.get(k, 'json'); } catch { v = null; }
  if (!v) return null;
  try { await env.GLOSSARY_KV.delete(k); } catch { }   // 한 번만
  return v;
}
