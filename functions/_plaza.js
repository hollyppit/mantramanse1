// 인연의 광장(3단계) 서버 공용. 표: supabase/migrations/20261116_plaza_stage3.sql
//   · 모든 /api/community/* (status·alert·enter 제외)는 미들웨어의 커뮤니티 잠금(functions/_community.js)을 먼저 통과한 요청만 온다
//   · 쓰기(글·댓글·반응·신고·차단)는 로그인 회원 + 필수 동의 + 닉네임(프로필) + 제재 없음
//   · 작성자 표시: 닉네임, 그리고 본인이 공개를 켠 경우에만 일간·일주. 탈퇴한 회원은 '탈퇴한 회원'
//   · 일주·일간: 회원이 보낸 출생 입력으로 서버가 직접 계산해 값만 저장한다(출생 입력은 저장하지 않음)
//   · 프로필 사진: 직접 올린 사진(R2 'cm-av/…', /api/community/avatar) 또는 기본 = 내 일간 포스터(관리자 '일간·일주 영상'의 일간 포스터, 10일간 × 성별)
//     남에게는 일간·일주를 공개한 회원만 일간 포스터가 보인다(포스터가 곧 일간을 드러내므로). 공개하지 않으면 닉네임 첫 글자
import '../engine.js';
import { json, isAdmin } from './_lib.js';
import { memberOf, sbRest, supabaseReady } from './_commerce.js';
import { readConsents, requiredOk } from './_consent.js';
import { cleanPublicBase, publicUrl } from './_media.js';

export { json, isAdmin, sbRest, supabaseReady, memberOf };
export const CATS = { wealth: '재물', love: '연애', work: '직장', people: '인간관계', daily: '일상' };
export const REASONS = { spam: '광고·도배', abuse: '욕설·비방', sexual: '음란·불쾌', privacy: '개인정보 노출', scam: '사기·금전 요구', etc: '기타' };
const STEM = { '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계' };
const BRANCH = { '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해' };
const STEM_EL = { '갑': '목', '을': '목', '병': '화', '정': '화', '무': '토', '기': '토', '경': '금', '신': '금', '임': '수', '계': '수' };
export const ILGAN = Object.values(STEM);
export const ILJU = (() => { const s = Object.values(STEM), b = Object.values(BRANCH), out = []; for (let i = 0; i < 60; i++) out.push(s[i % 10] + b[i % 12]); return out; })();
export const ilganLabel = g => g + STEM_EL[g];          // 갑 → 갑목
export const MIN_GROUP = 5;                              // 모임 인원이 이보다 적으면 모임 글을 전체 피드에서만 보여 준다(모임 화면에 '아직 모이는 중')
const enc = encodeURIComponent;
export const okId = v => /^\d{1,15}$/.test(String(v || ''));
export const okUuid = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));

// 출생 입력 → { ilju:'갑자', ilgan:'갑' }. 계산이 안 되면 null
export function iljuOfBirth(birth) {
  const M = globalThis.Manse; if (!M || !birth || typeof birth !== 'object') return null;
  const y = +birth.year, mo = +birth.month, d = +birth.day;
  if (!Number.isInteger(y) || y < 1900 || y > 2100 || !Number.isInteger(mo) || mo < 1 || mo > 12 || !Number.isInteger(d) || d < 1 || d > 31) return null;
  const inp = { year: y, month: mo, day: d, calendar: birth.calendar === 'lunar' ? 'lunar' : 'solar', leap: !!birth.leap };
  if (Number.isInteger(birth.hour) && birth.hour >= 0 && birth.hour <= 23) { inp.hour = birth.hour; inp.minute = Number.isInteger(birth.minute) ? birth.minute : 0; }
  ['jasi', 'timeMode'].forEach(k => { if (typeof birth[k] === 'string') inp[k] = birth[k]; });
  try {
    const ch = M.compute(inp), hz = M.gzName(ch.pillars.day) || '';
    const g = STEM[hz[0]], b = BRANCH[hz[1]];
    return g && b ? { ilju: g + b, ilgan: g } : null;
  } catch { return null; }
}

// 글·댓글 내용 검사(개인정보·외부 연락 유도·외부 링크). 문제가 있으면 안내 문구, 없으면 null
export function badText(s) {
  if (/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/.test(s)) return '전화번호는 올릴 수 없습니다. 개인정보는 인연의 광장에서 주고받지 말아 주세요';
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(s)) return '이메일 주소는 올릴 수 없습니다';
  if (/(open\.kakao\.com|t\.me\/|카톡\s*아이디|오픈\s*채팅|텔레그램|라인\s*아이디)/i.test(s)) return '외부 연락처·오픈채팅 안내는 올릴 수 없습니다';
  if (/(https?:\/\/|www\.)\S+/i.test(s)) return '지금은 링크를 올릴 수 없습니다';
  if (/(\d{6}[\s-]?[1-4]\d{6})/.test(s)) return '주민등록번호처럼 보이는 숫자는 올릴 수 없습니다';
  return null;
}
export const cleanTags = (tags, body) => {
  const set = new Set();
  (Array.isArray(tags) ? tags : []).concat(String(body || '').match(/#[가-힣a-zA-Z0-9_]{1,20}/g) || []).forEach(t => { const x = String(t).replace(/^#/, '').trim(); if (/^[가-힣a-zA-Z0-9_]{1,20}$/.test(x)) set.add(x); });
  return [...set].slice(0, 5);
};

// 하루 횟수 제한(KV). 넘으면 true
export async function overLimit(env, key, max) {
  const kv = env.GLOSSARY_KV; if (!kv) return false;
  const k = 'cm:rate:' + key + ':' + new Date().toISOString().slice(0, 10);
  try { const n = +(await kv.get(k)) || 0; if (n >= max) return true; await kv.put(k, String(n + 1), { expirationTtl: 90000 }); } catch { }
  return false;
}

export async function profileOf(env, userId) {
  const r = await sbRest(env, `member_profiles?user_id=eq.${enc(userId)}&select=user_id,nickname,ilju,ilgan,show_ilju,show_ilgan,visibility,avatar_path,poster_gender`);
  return Array.isArray(r) ? r[0] || null : null;
}
export async function activeSanction(env, userId) {
  const r = (await sbRest(env, `cm_sanctions?user_id=eq.${enc(userId)}&lifted_at=is.null&kind=in.(mute,ban)&select=kind,until,reason&order=created_at.desc`)) || [];
  const now = Date.now();
  return r.find(s => !s.until || Date.parse(s.until) > now) || null;
}

// 요청한 회원(읽기용): 없으면 null. 관리자 쿠키로만 들어온 경우에도 읽기는 된다
export async function viewer(request, env) {
  const m = await memberOf(request, env); if (!m) return null;
  return m;
}
// 쓰기 가능한 회원인지. 반환 { ok, member, profile } 또는 { res: Response }
export async function writer(request, env) {
  if (!supabaseReady(env)) return { res: json({ error: '지금은 글을 쓸 수 없습니다. 잠시 후 다시 시도해 주세요' }, 503) };
  const member = await memberOf(request, env);
  if (!member) return { res: json({ error: '로그인이 필요합니다', need: 'login' }, 401) };
  if (!requiredOk(await readConsents(env, member.id))) return { res: json({ error: '이용약관과 개인정보 수집·이용에 먼저 동의해 주세요', need: 'consent' }, 409) };
  const profile = await profileOf(env, member.id);
  if (!profile || !profile.nickname) return { res: json({ error: '먼저 닉네임을 정해 주세요', need: 'profile' }, 409) };
  const s = await activeSanction(env, member.id);
  if (s) return { res: json({ error: s.kind === 'ban' ? '운영 정책 위반으로 이용이 정지된 계정입니다' : '운영 정책 위반으로 ' + (s.until ? new Date(s.until).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) + '까지 ' : '') + '글·댓글을 쓸 수 없습니다', need: 'sanction', until: s.until }, 403) };
  return { ok: true, member, profile };
}

export async function blockedIds(env, userId) {
  if (!userId) return [];
  const r = (await sbRest(env, `cm_blocks?blocker_id=eq.${enc(userId)}&select=blocked_id`)) || [];
  return r.map(x => x.blocked_id);
}

// 일간 포스터 { '갑:M': url, … } — 관리자 화면 '일간·일주 영상'에 저장된 값(KV awakening:index 의 ilgan). 공개 도메인이 설정돼 있으면 그 주소로
export async function posterMap(env) {
  const out = {}; if (!env.GLOSSARY_KV) return out;
  let d = null; try { d = await env.GLOSSARY_KV.get('awakening:index', 'json'); } catch { d = null; }
  const base = cleanPublicBase(d && d.publicBase);
  ((d && d.ilgan) || []).forEach(x => { if (x && x.enabled !== false && x.stem && (x.gender === 'M' || x.gender === 'F') && typeof x.posterUrl === 'string' && /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]{1,300})$/.test(x.posterUrl)) out[x.stem + ':' + x.gender] = publicUrl(base, x.posterUrl); });
  return out;
}
// 회원 한 명의 사진 주소. self=true 는 본인 화면(공개 여부와 상관없이 내 포스터를 보여 준다)
export function avatarOf(p, posters, self) {
  if (!p) return null;
  if (p.avatar_path && /^cm-av\/[0-9a-f]{32}\.(webp|jpg|png)$/.test(p.avatar_path)) return { kind: 'photo', url: '/api/community/avatar?k=' + encodeURIComponent(p.avatar_path) };
  if (!p.ilgan || !(self || p.show_ilgan || p.show_ilju)) return null;
  const g = p.poster_gender === 'F' ? 'F' : p.poster_gender === 'M' ? 'M' : null;
  const url = (g && posters[p.ilgan + ':' + g]) || posters[p.ilgan + ':M'] || posters[p.ilgan + ':F'] || null;
  return url ? { kind: 'poster', url } : null;
}
// 작성자 표시용 { id: { name, ilju?, ilgan?, avatar? } }
export async function authorsOf(env, ids) {
  const uniq = [...new Set(ids.filter(okUuid))]; const out = {};
  if (!uniq.length) return out;
  const [r, posters] = await Promise.all([sbRest(env, `member_profiles?user_id=in.(${uniq.map(enc).join(',')})&select=user_id,nickname,ilju,ilgan,show_ilju,show_ilgan,avatar_path,poster_gender`), posterMap(env)]);
  (r || []).forEach(p => { const a = avatarOf(p, posters); out[p.user_id] = { name: p.nickname || '이름 없는 회원', ilju: p.show_ilju && p.ilju ? p.ilju : null, ilgan: p.show_ilgan && p.ilgan ? ilganLabel(p.ilgan) : null, avatar: a ? a.url : null }; });
  return out;
}
export const authorView = (map, id, me) => id ? { ...(map[id] || { name: '이름 없는 회원' }), mine: !!(me && me === id) } : { name: '탈퇴한 회원', gone: true, mine: false };

export async function groupSize(env, kind, key) {
  const col = kind === 'ilju' ? 'ilju' : 'ilgan';
  const r = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + `/rest/v1/member_profiles?${col}=eq.${enc(key)}&select=user_id`, { method: 'HEAD', headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, prefer: 'count=exact' }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  const m = r && (r.headers.get('content-range') || '').match(/\/(\d+)$/);
  return m ? +m[1] : 0;
}
export async function readBody(request) { try { const b = await request.json(); return b && typeof b === 'object' ? b : {}; } catch { return null; } }
