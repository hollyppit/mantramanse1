// 인연운 심화 마지막 장 '그 사람과 나의 궁합'(2026-11-20) — 서버 계산·하루 횟수.
//   · 계산은 만세력 궁합 탭과 같은 엔진: engine.js(Manse.compute) → compat-pair.js(PairCompat.evaluate)
//     · compat-day.js(일주 적합도, 관리자 스위치 dayCompat 를 따른다) · amhap.js(MantraAmhap.compat, 숨은 인연 — 암합). 새 산식 없음.
//   · 보유 확인은 결제 공용 모듈(_commerce.js chapterGate: 인연운 세계 w3 구매 권한 · 받은 날부터 12개월)을 그대로 쓴다.
//   · 하루 횟수: 사용자당 하루 LIMIT 회(한국 시간 자정 초기화). 회원은 회원 id, 비회원(인연운이 무료 세계일 때)은 기기 ID(없으면 IP) 해시로 센다.
//     같은 IP 하루 IP_LIMIT 회는 남용 방지용. 결과를 실제로 내줬을 때만 줄어든다(실패·잠금은 차감 없음). 관리자·운영 모니터는 세지 않는다.
//   · 생년월일·이름은 서버에 저장하지 않는다(KV 에는 해시 키와 횟수만, 이틀 뒤 자동 삭제).
import '../engine.js';
import '../compat-pair.js';
import '../compat-day.js';
import '../amhap.js';
import '../luck-grade.js';
import '../luck-element-theme.js';
import '../compat-group.js';
import { kstDay, cleanDevice } from './_deep-quota.js';

export const CHAPTER_ID = 'timeline_love_compat';
export const TOPIC_ID = 'love';
export const LIMIT = 10;
export const IP_LIMIT = 40;
export const RELS = ['lover', 'work', 'friend', 'family'];
const TTL = { expirationTtl: 172800 };
const G = globalThis;
export const engines = () => ({ M: G.Manse, Pair: G.PairCompat, Day: G.MantraDayCompat, Amhap: G.MantraAmhap });

// ── 입력 정리: 숫자·고정 값만 받는다(나머지는 버림)
const int = (v, lo, hi) => { const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const pick = (v, list, d) => (list.includes(v) ? v : d);
const str = (v, n) => (typeof v === 'string' ? v.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, n) : '');
// 계산 기준 설정(진태양시·자시 등)은 화면이 쓰는 값을 그대로 넘기되, 짧은 영문 낱말만 허용한다
const opt = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(v) ? v : undefined);
export function cleanBirth(b, { needGender = true } = {}) {
  if (!b || typeof b !== 'object') return { error: 'bad-input' };
  const { M } = engines();
  const year = int(b.year, M.MIN_Y, M.MAX_Y - 1), month = int(b.month, 1, 12), day = int(b.day, 1, 31);
  if (year == null || month == null || day == null) return { error: 'bad-date' };
  const hourUnknown = b.hourUnknown === true || b.hour == null || b.hour === '';
  const hour = hourUnknown ? null : int(b.hour, 0, 23), minute = hourUnknown ? 0 : (int(b.minute == null ? 0 : b.minute, 0, 59));
  if (!hourUnknown && (hour == null || minute == null)) return { error: 'bad-time' };
  const gender = b.gender === 'F' || b.gender === 'M' ? b.gender : null;
  if (needGender && !gender) return { error: 'bad-gender' };
  const tz = typeof b.tz === 'string' && b.tz !== 'Asia/Seoul' && /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){1,2}$/.test(b.tz) ? b.tz : undefined;   // 해외 출생지 시간대(IANA)
  const lon = tz ? (Number.isFinite(+b.lon) && Math.abs(+b.lon) <= 180 ? +b.lon : 126.98) : (Number.isFinite(+b.lon) && +b.lon >= 120 && +b.lon <= 135 ? +b.lon : 126.98);
  return { year, month, day, hour, minute, hourUnknown, calendar: pick(b.calendar, ['solar', 'lunar'], 'solar'), leap: b.leap === true, gender, lon, tz };
}
const SETTING_KEYS = ['timeMode', 'jasi', 'sinsalBase', 'model', 'school', 'combinationMode', 'climatePalaceMode'];
export function settingsOf(me) { const o = {}; SETTING_KEYS.forEach(k => { const v = opt(me && me[k]); if (v !== undefined) o[k] = v; }); return o; }
export function chartOf(b, settings) {
  const { M } = engines();
  return M.compute(Object.assign({ year: b.year, month: b.month, day: b.day, hour: b.hourUnknown ? null : b.hour, minute: b.minute || 0, calendar: b.calendar, leap: b.leap, gender: b.gender, lon: b.lon, tz: b.tz }, settings || {}));
}
// 결제 확인용 사주 정보(_commerce.js sajuKey 와 같은 모양: 네 기둥 한자 + 성별). 브라우저 sd 대신 서버가 계산한 원국으로 만든다
export function sdOf(ch) {
  const { M } = engines(), p = {};
  ['year', 'month', 'day', 'hour'].forEach(k => { p[k] = ch.pillars[k] ? { hanja: M.gzName(ch.pillars[k]) } : null; });
  return { pillars: p, gender: ch.gender === 'F' ? 'F' : 'M' };
}

// ── 궁합 계산: 관계 네 가지를 한 번에(관계 단추를 바꿔도 횟수를 다시 쓰지 않게)
const gz = p => { const { M } = engines(); return M.STEM[p.s] + M.BR[p.b]; };
export function evaluateAll(chA, chB, names, { dayCompat = false } = {}) {
  const { M, Pair, Amhap } = engines();
  const nm = { a: str(names && names.a, 12) || '나', b: str(names && names.b, 12) || '상대' };
  const views = {}; RELS.forEach(rel => { views[rel] = JSON.parse(JSON.stringify(Pair.evaluate(M, chA, chB, rel, nm))); });
  let amhap = []; try { amhap = Amhap.compat(M, chA, chB, { nameA: nm.a, nameB: nm.b }).filter(r => r.isValid); } catch (e) { amhap = []; }
  // 상대 일주 적합도: 내 원국 기준 60일주 순위(compat-day.js 가 켜져 있으면 2판, 아니면 엔진 1판 — 만세력 궁합 일주 탭과 같은 함수)
  let day = null;
  try {
    const prev = G.MANTRA_FLAGS; G.MANTRA_FLAGS = Object.assign({}, prev || {}, { dayCompat: !!dayCompat });
    try {
      const list = M.compatDayPillars(chA), d = chB.pillars.day, at = list.findIndex(x => x.s === d.s && x.b === d.b);
      if (at >= 0) { const x = list[at]; day = { rank: at + 1, of: list.length, score: x.score, type: x.type || '', condition: x.condition || '', reasons: (x.reasons || []).slice(0, 2), cautions: (x.cautions || []).slice(0, 2), version: dayCompat ? 2 : 1 }; }
    } finally { G.MANTRA_FLAGS = prev; }
  } catch (e) { day = null; }
  return { names: nm, gz: { a: gz(chA.pillars.day), b: gz(chB.pillars.day) }, hourKnown: { a: !!chA.pillars.hour, b: !!chB.pillars.hour }, views, partPlain: Pair.PART_PLAIN || {}, amhap, amhapNote: Amhap.NOTE, day };
}

// ── 여러 명 궁합(2026-11-25, compat-group.js — 만세력 궁합 탭 '여러 명'과 같은 계산). 관계 네 가지를 한 번에 돌려 관계를 바꿔도 횟수를 다시 쓰지 않는다.
//   people: [{ ch, name, role }] (나를 넣으면 me:true). 달별 흐름은 관계와 무관해 한 번만 돌려준다. 스위치 loveGroup(KV luckenv:flags, 기본 꺼짐)
export const GROUP_MIN = 3, GROUP_MAX = 6;
export function cleanGroupMeta(p) { const roles = (G.GroupCompat && G.GroupCompat.ROLES) || {}; return { name: str(p && p.name, 12), role: p && typeof p.role === 'string' && Object.prototype.hasOwnProperty.call(roles, p.role) ? p.role : '' }; }
export function evaluateGroup(people, { now = Date.now() } = {}) {
  const { M } = engines(), GC = G.GroupCompat;
  const views = {}; let months = null;
  RELS.forEach(rel => {
    const r = GC.evaluate(M, people, rel, { now });
    if (!r.ok) throw Object.assign(new Error(r.error), { code: 'group-input' });
    const o = JSON.parse(JSON.stringify(r));   // pairResult(함수)는 빠진다
    if (!months) months = o.months; delete o.months;
    views[rel] = o;
  });
  return { version: GC.VERSION, views, months, band: GC.BAND, arrowCap: GC.ARROW.cap };
}

// ── 하루 횟수(사용자당 LIMIT)
async function h(salt, v) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('love-compat|' + salt + '|' + v)); return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function quotaKeys(ctx, now = Date.now()) {
  const day = kstDay(now), ip = await h('ip', (ctx && ctx.ip) || 'unknown');
  const who = ctx && ctx.memberId ? 'm-' + await h('member', ctx.memberId) : cleanDevice(ctx && ctx.device) ? 'd-' + await h('dev', cleanDevice(ctx.device)) : 'ip-' + ip;
  return { user: 'rl:love-compat:' + day + ':u:' + who, ip: 'rl:love-compat:' + day + ':ip:' + ip };
}
const rd = async (kv, k) => { const v = await kv.get(k); return +v || 0; };
export async function quotaLeft(kv, ctx, now) { const k = await quotaKeys(ctx, now); return { left: Math.max(0, LIMIT - await rd(kv, k.user)), limit: LIMIT }; }
export async function quotaCheck(kv, ctx, now) {
  const k = await quotaKeys(ctx, now), used = await rd(kv, k.user), ipN = await rd(kv, k.ip);
  if (used >= LIMIT) return { ok: false, error: 'daily-limit', left: 0, limit: LIMIT };
  if (!ctx.memberId && ipN >= IP_LIMIT) return { ok: false, error: 'ip-limit', left: Math.max(0, LIMIT - used), limit: LIMIT };
  return { ok: true, k, used, ipN };
}
export async function quotaCommit(kv, slot) {
  await kv.put(slot.k.user, String(slot.used + 1), TTL); await kv.put(slot.k.ip, String(slot.ipN + 1), TTL);
  return { left: Math.max(0, LIMIT - slot.used - 1), limit: LIMIT };
}
