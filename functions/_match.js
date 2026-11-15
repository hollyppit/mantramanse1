// 인연 매칭·대화(5단계) 공용. 표: supabase/migrations/20261116_match_stage5.sql · 설계: docs/MATCHING_CHAT_PLAN_2026-11-16.md
//   · 성인 본인확인(포트원 본인인증 또는 관리자 수동 확인)을 마친 회원만 인연 프로필을 켜고, 오늘의 인연을 보고, 대화할 수 있다
//   · 오늘의 인연은 하루 PICKS 명으로 고정(무한 넘기기 없음). 서로 원하는 조건(목적·나이·성별·지역)이 맞는 사람만
//   · 궁합은 '명리 지표'(일주끼리: 천간 합·오행 생극, 일지 합·충)와 '생활 지표'(목적·나이·지역·관심사)를 나눠 보여 준다.
//     확률·점수로 말하지 않고 "잘 통할 만한 점 / 서로 조심할 점"으로만 말한다. 출생정보 원본은 쓰지 않는다(일주만)
//   · 다른 회원의 id 는 화면에 내보내지 않는다 → 보는 사람마다 다른 handle(HMAC)
import { sbRest } from './_commerce.js';
import { kstDay } from './_daily.js';

export const PICKS = 5, LIKE_PER_DAY = 10, MSG_PER_DAY = 300;
export const PURPOSES = { chat: '가벼운 대화', friend: '친구', love: '연애' };
export const REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '해외'];
export const INTERESTS = { saju: '사주·명리', tarot: '타로', career: '커리어', money: '재테크', travel: '여행', food: '맛집', music: '음악', movie: '영화·드라마', book: '책', exercise: '운동', game: '게임', pet: '반려동물', art: '예술·사진', selfdev: '자기계발' };
const enc = encodeURIComponent;

// 청소년보호법: 만 19세가 되는 해의 1월 1일을 맞은 사람부터 성인(연 나이 19세 이상)
export const thisYear = (now = Date.now()) => +kstDay(now).slice(0, 4);
export const isAdultYear = (y, now = Date.now()) => Number.isInteger(+y) && +y <= thisYear(now) - 19;
export const ageOf = (y, now = Date.now()) => thisYear(now) - +y;
export const ageBand = a => a < 20 ? '20세 미만' : (Math.floor(a / 10) * 10) + '대 ' + (a % 10 < 4 ? '초반' : a % 10 < 7 ? '중반' : '후반');

export async function verificationOf(env, userId) {
  const r = await sbRest(env, `adult_verifications?user_id=eq.${enc(userId)}&select=provider,birth_year,gender,verified_at`);
  const v = Array.isArray(r) ? r[0] : null;
  return v && isAdultYear(v.birth_year) ? v : null;
}

// 보는 사람마다 다른 상대 표시값(상대 id 를 숨긴다). 서버는 후보 목록 안에서 같은 값을 다시 계산해 찾는다
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export async function handleOf(env, viewer, other) {
  const secret = env.COMMUNITY_SECRET || env.ADMIN_PASSWORD || 'cm';
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cm-match:' + secret + ':' + viewer + ':' + other))).slice(0, 24);
}
export async function resolveHandle(env, viewer, handle, candidates) {
  if (!/^[0-9a-f]{24}$/.test(String(handle || ''))) return null;
  for (const c of candidates) if ((await handleOf(env, viewer, c)) === handle) return c;
  return null;
}

// ── 명리 지표: 일주 두 개(예: '갑자', '기축') ──
const STEMS = '갑을병정무기경신임계', BRS = '자축인묘진사오미신유술해';
const EL = ['목', '화', '토', '금', '수'];
const STEM_HAP = ['갑기', '을경', '병신', '정임', '무계'];
const BR_HAP = ['자축', '인해', '묘술', '진유', '사신', '오미'], BR_CHUNG = ['자오', '축미', '인신', '묘유', '진술', '사해'];
const pair = (list, a, b) => list.includes(a + b) || list.includes(b + a);
export function compat(a, b) {
  const good = [], care = [];
  if (!a || !b || a.length !== 2 || b.length !== 2) return { good, care, ready: false };
  const sa = STEMS.indexOf(a[0]), sb = STEMS.indexOf(b[0]); if (sa < 0 || sb < 0) return { good, care, ready: false };
  const ea = Math.floor(sa / 2), eb = Math.floor(sb / 2), d = (eb - ea + 5) % 5;
  if (pair(STEM_HAP, a[0], b[0])) good.push('천간합: 두 사람의 일간이 합을 이뤄 서로에게 자연스럽게 끌리고 마음이 잘 맞물리는 조합이에요.');
  if (d === 0) { good.push('같은 ' + EL[ea] + ' 기운: 생각의 결이 비슷해 처음부터 말이 잘 통해요.'); care.push('닮은 만큼 고집이 부딪칠 때 물러서기 어려울 수 있어요. 순서를 정해 말해 보세요.'); }
  else if (d === 1) good.push('내 ' + EL[ea] + ' 기운이 상대의 ' + EL[eb] + ' 기운을 북돋아요. 내가 챙겨 주고 상대가 꽃피우는 흐름이에요.');
  else if (d === 4) good.push('상대의 ' + EL[eb] + ' 기운이 내 ' + EL[ea] + ' 기운을 북돋아요. 곁에 있으면 힘을 얻는 관계예요.');
  else if (d === 2) care.push('내 ' + EL[ea] + ' 기운이 상대의 ' + EL[eb] + ' 기운을 누르는 관계예요. 내가 이끌기 쉬우니 상대의 속도를 존중해 주세요.');
  else if (d === 3) care.push('상대의 ' + EL[eb] + ' 기운이 내 ' + EL[ea] + ' 기운을 누르는 관계예요. 끌려가기보다 내 생각을 분명히 말하는 게 좋아요.');
  if (pair(BR_HAP, a[1], b[1])) good.push('일지 육합: 생활 리듬과 정서가 잘 맞물려 함께 있을 때 편안해요.');
  else if (pair(BR_CHUNG, a[1], b[1])) care.push('일지 충: 생활 방식이 달라 부딪칠 수 있지만, 서로를 깨워 주는 자극이 되기도 해요.');
  else if (a[1] === b[1]) good.push('일지가 같아 생활 습관과 감정 표현 방식이 닮았어요.');
  if (!good.length) good.push('두 일주 사이에 큰 충돌이 없어 천천히 알아가기 좋은 사이예요.');
  return { good, care, ready: true };
}

// ── 생활 지표·조건 맞추기 ──
const overlap = (a, b) => (a || []).filter(x => (b || []).includes(x));
export function eligible(me, mv, you, yv) {
  if (!me || !you || !me.active || !you.active || !mv || !yv) return false;
  const both = overlap(me.purposes, you.purposes); if (!both.length) return false;
  const ma = ageOf(mv.birth_year), ya = ageOf(yv.birth_year);
  if (ya < me.want_age_min || ya > me.want_age_max || ma < you.want_age_min || ma > you.want_age_max) return false;
  if (both.length === 1 && both[0] === 'love') {   // 연애만 겹치면 서로 원하는 성별이어야 한다
    if (!(me.want_gender || []).includes(yv.gender) || !(you.want_gender || []).includes(mv.gender)) return false;
  }
  if ((me.want_region === 'same' || you.want_region === 'same') && me.region !== you.region) return false;
  return true;
}
export function life(me, you, yv) {
  const p = overlap(me.purposes, you.purposes).map(x => PURPOSES[x]);
  const i = overlap(me.interests, you.interests).map(x => INTERESTS[x]).filter(Boolean);
  return { purposes: p, interests: i, sameRegion: !!(me.region && me.region === you.region), region: you.region || null, age: yv ? ageBand(ageOf(yv.birth_year)) : null };
}
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// 후보 중 오늘의 인연 고르기: 관심사·지역·목적이 겹칠수록 먼저, 같은 점수는 날짜별로 섞는다
export function pickToday(meId, me, cands, day) {
  return cands.map(c => ({ id: c.id, s: overlap(me.interests, c.profile.interests).length * 2 + (me.region === c.profile.region ? 2 : 0) + overlap(me.purposes, c.profile.purposes).length, r: hash(day + ':' + meId + ':' + c.id) }))
    .sort((a, b) => b.s - a.s || a.r - b.r).slice(0, PICKS).map(x => x.id);
}

// 대화 내용 경고(막지는 않는다): 연락처·외부 메신저·송금 유도
export function flagOf(s) {
  if (/(01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}|카톡\s*아이디|오픈\s*채팅|open\.kakao|텔레그램|t\.me\/|라인\s*아이디|인스타\s*(아이디|디엠|dm))/i.test(s)) return 'contact';
  if (/(송금|입금|계좌|코인|투자\s*(해|하자|방)|리딩방|대출|선물\s*거래|USDT|비트코인)/i.test(s)) return 'money';
  return null;
}
export const FLAG_TIP = { contact: '처음 만난 사이에서 외부 연락처로 옮기자는 대화는 사기일 수 있어요. 충분히 알아본 뒤 정해 주세요.', money: '돈·투자·송금 이야기가 나왔어요. 인연의 광장에서 만난 사람에게 돈을 보내지 마세요.' };
