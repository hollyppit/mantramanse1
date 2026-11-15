// 회원 동의 공용(2단계, 2026-11-16). 표: supabase/migrations/20261116_member_stage2.sql
//   · 필수: 이용약관·개인정보 수집·이용 → 인연의 광장 입장 조건(심층 분석 이용에는 묻지 않는다: 기존 서비스 흐름을 바꾸지 않음)
//   · 선택(광고성 정보): 이메일·문자·카카오톡 채널별 따로, 기본은 모두 '동의 안 함'. 야간(21~08시) 수신은 별도 동의
//   · 바뀔 때마다 consent_events 에 추가만 하고, 회원 이메일로 처리 결과를 알린다(정보통신망법 제50조: 수신 동의·철회 처리 결과 통지)
//   · 문자·카카오톡 수신에는 휴대폰 번호가 필요하다. 두 동의를 모두 철회하면 번호를 지운다
//   · 카카오톡 채널 '친구 추가'는 광고 수신 동의가 아니다(따로 저장하지 않는다). 발송 기능은 아직 없다(발송 대행사 선정 후)
// 문서 버전을 바꾸면 이 DOCS 와 consent_documents 표(새 행 추가)를 함께 바꾼다.
import { sbRest, supabaseReady } from './_commerce.js';

export const DOCS = {
  terms:           { version: '2026-11-10', title: '이용약관', required: true },
  privacy:         { version: '2026-11-10', title: '개인정보 수집·이용', required: true },
  marketing_email: { version: 'mkt-2026-11-16', title: '이메일로 혜택·소식 받기', channel: 'email' },
  marketing_sms:   { version: 'mkt-2026-11-16', title: '문자로 혜택·소식 받기', channel: 'sms', phone: true },
  marketing_kakao: { version: 'mkt-2026-11-16', title: '카카오톡으로 혜택·소식 받기', channel: 'kakao', phone: true },
  marketing_night: { version: 'mkt-2026-11-16', title: '밤 9시~아침 8시에도 받기', night: true },
};
export const KINDS = Object.keys(DOCS);
export const REQUIRED = KINDS.filter(k => DOCS[k].required);
export const CHANNELS = KINDS.filter(k => DOCS[k].channel);
export const VIA = ['mypage', 'community', 'gate', 'signup', 'admin', 'system'];
export const PHONE_RE = /^01[016789][0-9]{7,8}$/;
export const cleanPhone = p => String(p || '').replace(/[\s-]/g, '');
const okUser = id => /^[0-9a-f-]{36}$/i.test(String(id || ''));
const enc = encodeURIComponent;

// { kind: { agreed, version, grantedAt, current } } — 행이 없는 종류는 agreed:false. current = 지금 문서 버전에 동의했는지
export async function readConsents(env, userId) {
  const out = {}; KINDS.forEach(k => { out[k] = { agreed: false, version: null, grantedAt: null, current: false }; });
  if (!supabaseReady(env) || !okUser(userId)) return out;
  const rows = (await sbRest(env, `member_consents?user_id=eq.${enc(userId)}&select=kind,agreed,version,granted_at`)) || [];
  rows.forEach(r => { if (!out[r.kind]) return; out[r.kind] = { agreed: !!r.agreed, version: r.version, grantedAt: r.granted_at, current: !!r.agreed && r.version === DOCS[r.kind].version }; });
  return out;
}
export const requiredOk = state => REQUIRED.every(k => state[k] && state[k].current);
export const anyChannel = state => CHANNELS.some(k => state[k] && state[k].agreed);

// changes: { kind: true|false } · versions: 화면이 보여 준 문서 버전({kind: version}) — 다르면 거절(문구가 바뀐 뒤 옛 화면에서 동의하는 일 방지)
// 반환: { ok, state, changed:[{kind, action}], error?, status? }
export async function setConsents(env, userId, changes, { versions = {}, via = 'mypage', phone } = {}) {
  if (!okUser(userId)) return { ok: false, status: 400, error: '회원 정보를 확인할 수 없습니다' };
  if (!changes || typeof changes !== 'object') return { ok: false, status: 400, error: '바꿀 항목이 없습니다' };
  via = VIA.includes(via) ? via : 'mypage';
  const want = {};
  for (const [k, v] of Object.entries(changes)) {
    if (!DOCS[k]) return { ok: false, status: 400, error: '알 수 없는 동의 항목입니다' };
    if (typeof v !== 'boolean') return { ok: false, status: 400, error: '동의 값은 예/아니오로만 보낼 수 있습니다' };
    if (v && versions[k] !== DOCS[k].version) return { ok: false, status: 409, error: '안내 문구가 바뀌었습니다. 화면을 새로 고친 뒤 다시 선택해 주세요', docs: docsPublic() };
    want[k] = v;
  }
  // 필수 동의는 마이페이지에서 철회할 수 없다(철회 = 탈퇴 또는 커뮤니티 이용 중단) — 끄려는 요청은 거절
  for (const k of REQUIRED) if (want[k] === false) return { ok: false, status: 400, error: '필수 동의는 철회할 수 없습니다. 서비스를 그만 쓰시려면 회원 탈퇴를 이용해 주세요' };
  const before = await readConsents(env, userId);
  const after = JSON.parse(JSON.stringify(before));
  Object.entries(want).forEach(([k, v]) => { after[k].agreed = v; });
  // 야간 수신은 받을 채널이 하나라도 있을 때만 의미가 있다 → 채널 없이 켜려 하면 거절, 채널을 모두 끄면 같이 끈다
  if (want.marketing_night === true && !anyChannel(after)) return { ok: false, status: 400, error: '밤 시간 수신은 받을 방법(이메일·문자·카카오톡)을 하나 이상 고른 뒤 선택할 수 있습니다' };
  if (!anyChannel(after) && after.marketing_night.agreed) { after.marketing_night.agreed = false; want.marketing_night = false; }
  const needPhone = CHANNELS.some(k => DOCS[k].phone && after[k].agreed);
  const phoneGranted = CHANNELS.some(k => DOCS[k].phone && want[k] === true && !before[k].agreed);
  let phoneVal;
  // 이미 저장된 번호가 있으면(문자 동의 중 카카오톡 추가 등) 다시 적지 않아도 된다
  const saved = phoneGranted && (phone === undefined || phone === '') ? await phoneOf(env, userId) : null;
  if (saved && (phone === undefined || phone === '')) phone = undefined;
  else if (phoneGranted || (needPhone && phone !== undefined && phone !== '')) {
    const p = cleanPhone(phone);
    if (!PHONE_RE.test(p)) return { ok: false, status: 400, error: '문자·카카오톡으로 받으려면 휴대폰 번호(010으로 시작)를 정확히 적어 주세요', needPhone: true };
    phoneVal = p;
  }
  const at = new Date().toISOString(), changed = [], rows = [], events = [];
  for (const [k, v] of Object.entries(want)) {
    const was = before[k];
    const same = v ? was.agreed && was.version === DOCS[k].version : !was.agreed;
    if (same) continue;
    rows.push({ user_id: userId, kind: k, agreed: v, version: v ? DOCS[k].version : was.version, granted_at: v ? at : was.grantedAt, updated_at: at });
    events.push({ user_id: userId, kind: k, action: v ? 'grant' : 'revoke', version: DOCS[k].version, at, via });
    changed.push({ kind: k, action: v ? 'grant' : 'revoke' });
  }
  if (rows.length) {
    await sbRest(env, 'member_consents?on_conflict=user_id,kind', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
    await sbRest(env, 'consent_events', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(events) });
  }
  // 휴대폰 번호: 필요하면 저장, 필요 없어지면 지운다
  if (phoneVal !== undefined || !needPhone) await setPhone(env, userId, needPhone ? phoneVal : null);
  const state = await readConsents(env, userId);
  return { ok: true, state, changed, at };
}

async function setPhone(env, userId, phone) {
  if (phone === undefined) return;
  const rows = await sbRest(env, `member_profiles?user_id=eq.${enc(userId)}&select=user_id,phone`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row && phone == null) return;
  if (row && (row.phone || null) === (phone || null)) return;
  if (row) await sbRest(env, `member_profiles?user_id=eq.${enc(userId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ phone, updated_at: new Date().toISOString() }) });
  else await sbRest(env, 'member_profiles', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ user_id: userId, phone }) });
}
export async function phoneOf(env, userId) {
  if (!supabaseReady(env) || !okUser(userId)) return null;
  const rows = await sbRest(env, `member_profiles?user_id=eq.${enc(userId)}&select=phone`);
  return (Array.isArray(rows) && rows[0] && rows[0].phone) || null;
}
export const maskPhone = p => p ? p.slice(0, 3) + '-****-' + p.slice(-4) : null;
export const docsPublic = () => KINDS.map(k => ({ kind: k, version: DOCS[k].version, title: DOCS[k].title, required: !!DOCS[k].required, channel: DOCS[k].channel || null, phone: !!DOCS[k].phone, night: !!DOCS[k].night }));
export const stateBrief = state => Object.fromEntries(KINDS.map(k => [k, { agreed: state[k].agreed, current: state[k].current, at: state[k].grantedAt }]));
