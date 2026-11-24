// 신년운세(연도 상품) 공개·잠금 규칙 한 곳. 결제·회원·권한은 _commerce.js 를 그대로 쓴다(회원 × 사주 × 'tj'+연도).
// 공개 범위(관리자 설정, KV 'newyear:config'): closed(관리자만·기본값) | free(누구나 무료) | paid(구매 회원만, 맛보기는 누구나)
import { isAdmin } from './_lib.js';
import { kvOf } from './_store.js';
import { memberOf, sajuKey, ownedWorlds, markViewed, isMonitor, loadProducts, payReady, ANNUAL_WORLD } from './_commerce.js';

export const NEWYEAR_KEY = 'newyear:config';
export const VISIBILITY = ['closed', 'free', 'paid'];
export const DEFAULT_ENTRY = { show: true, kick: '', title: '', line: '', go: '' };   // 타임라인 입구 카드(빈 칸 = 기본 문구, entryOf 참고)
// 화면 꾸미기(관리자 › 신년운세 › 화면 꾸미기): 배경 이미지(PC·모바일), 진입 프롤로그(영상·이미지, 이미지 시간), 패널 이미지 섞기(미디어 라이브러리 panel-<오행>-<주제>)
export const DEFAULT_MEDIA = { bg: '', bgMobile: '', proOn: true, proVideo: '', proVideoMobile: '', proImage: '', proImageMobile: '', proSec: 6, panels: true };
const MEDIA_URL = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]{1,500})$/;
export function cleanMedia(m) {
  m = m && typeof m === 'object' ? m : {}; const u = v => (typeof v === 'string' && MEDIA_URL.test(v.trim()) ? v.trim() : ''), sec = Math.round(+m.proSec);
  return { bg: u(m.bg), bgMobile: u(m.bgMobile), proOn: m.proOn !== false, proVideo: u(m.proVideo), proVideoMobile: u(m.proVideoMobile), proImage: u(m.proImage), proImageMobile: u(m.proImageMobile), proSec: sec >= 2 && sec <= 30 ? sec : 6, panels: m.panels !== false };
}
export const DEFAULT_YEAR_CONFIG = { visibility: 'closed', teaser: ['open', 'total.core'], intro: '', contentMode: 'public', monthStyle: 'classic', entry: { ...DEFAULT_ENTRY }, media: { ...DEFAULT_MEDIA } };

export async function loadNewyearConfig(env) {
  let saved = null; try { const kv = kvOf(env); saved = kv ? await kv.get(NEWYEAR_KEY, 'json') : null; } catch { saved = null; }
  return cleanNewyearConfig(saved);
}
export function cleanNewyearConfig(raw) {
  const out = { years: {} };
  const ys = raw && raw.years && typeof raw.years === 'object' ? raw.years : {};
  for (const [y, v] of Object.entries(ys)) {
    if (!/^20\d\d$/.test(y) || !v || typeof v !== 'object') continue;
    const c = { ...DEFAULT_YEAR_CONFIG };
    if (VISIBILITY.includes(v.visibility)) c.visibility = v.visibility;
    if (Array.isArray(v.teaser)) c.teaser = v.teaser.filter(t => typeof t === 'string' && /^[a-z]+(\.[a-z]+)?$/.test(t)).slice(0, 6);
    if (typeof v.intro === 'string') c.intro = v.intro.slice(0, 600);
    if (v.contentMode === 'public' || v.contentMode === 'preview') c.contentMode = v.contentMode;
    if (v.monthStyle === 'premium' || v.monthStyle === 'classic') c.monthStyle = v.monthStyle;   // premium = 원문 중심 월별 심화 해설(2026-11-17, 관리자가 켜면 검수 전 해설도 공개)   // preview = 검수 전 문구도 보여 줌(운영에서는 쓰지 않는다)
    const e = v.entry && typeof v.entry === 'object' ? v.entry : {}, one = (x, n) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : '');
    c.entry = { show: e.show !== false, kick: one(e.kick, 40), title: one(e.title, 40), line: one(e.line, 120), go: one(e.go, 20) };
    c.media = cleanMedia(v.media);
    out.years[y] = c;
  }
  return out;
}
export const yearConfig = (cfg, y) => (cfg.years && cfg.years[y]) || { ...DEFAULT_YEAR_CONFIG, entry: { ...DEFAULT_ENTRY }, media: { ...DEFAULT_MEDIA } };

// 운명의 타임라인 입구 카드(report/hub/hub-timeline.js 가 /api/newyear/entry 로 받는다).
// 공개 범위가 비공개거나 관리자가 '카드 보이기'를 끄면 null. 여러 해가 공개 중이면 가장 늦은 해 하나만.
const STEMS = '갑을병정무기경신임계', BRANCHES = '자축인묘진사오미신유술해';
export const yearGz = y => STEMS[((y - 4) % 10 + 10) % 10] + BRANCHES[((y - 4) % 12 + 12) % 12];
export function entryOf(cfg, productOf) {
  const ys = Object.keys((cfg && cfg.years) || {}).map(Number).sort((a, b) => b - a);
  for (const y of ys) {
    const c = cfg.years[y], e = c.entry || DEFAULT_ENTRY;
    if (c.visibility === 'closed' || e.show === false) continue;
    const paid = c.visibility === 'paid', p = productOf ? productOf(y) : null;
    return {
      year: y, paid, price: paid && p && p.price > 0 ? p.price : 0,
      kick: e.kick || ('NEW YEAR · ' + y + ' ' + yearGz(y) + '년' + (paid ? '' : ' · 무료')),
      title: e.title || (y + ' 토정비결 신년운세'),
      line: e.line || '토정비결 괘와 내 사주로 읽는 한 해 · 총운·재물·직업·연애·건강·12개월',
      go: e.go || '신년운세 보기',
    };
  }
  return null;
}

// 사주 식별값: _commerce.sajuKey 와 같은 규칙(원국 네 기둥 한자 + 성별). 서버가 출생 입력으로 직접 계산한다.
export async function sajuKeyOfBirth(Manse, birth) {
  const inp = { year: birth.year, month: birth.month, day: birth.day, calendar: birth.calendar === 'lunar' ? 'lunar' : 'solar', leap: !!birth.leap };
  if (Number.isInteger(birth.hour)) { inp.hour = birth.hour; inp.minute = Number.isInteger(birth.minute) ? birth.minute : 0; }
  ['jasi', 'timeMode', 'lon', 'tz'].forEach(k => { if (birth[k] != null) inp[k] = birth[k]; });
  const ch = Manse.compute(inp);
  const P = ch.pillars, h = p => (p ? { hanja: Manse.gzName(p) } : null);
  return sajuKey({ pillars: { year: h(P.year), month: h(P.month), day: h(P.day), hour: ch.hourKnown ? h(P.hour) : null }, gender: birth.gender });
}

// 그해 신년운세를 열어도 되는가. 반환 { state: 'open'|'teaser'|'closed', reason, product, admin }
export async function newyearGate(request, env, { year, birth, Manse }) {
  const world = ANNUAL_WORLD(year);
  const products = await loadProducts(env), product = products.find(p => p.id === world) || null;
  const sale = product ? { id: product.id, name: product.name, price: product.price, active: product.active, onSale: !!(product.active && product.price > 0 && payReady(env)) } : null;
  if (isMonitor(request, env)) return { state: 'open', reason: 'monitor', product: sale };
  const admin = isAdmin(request, env), viewAsFree = admin && (request.headers.get('x-view-as') || '') === 'free';
  if (admin && !viewAsFree) return { state: 'open', reason: 'admin', product: sale, admin: true };
  const cfg = yearConfig(await loadNewyearConfig(env), year);
  if (cfg.visibility === 'closed') return { state: 'closed', reason: 'not-released', product: sale };
  if (cfg.visibility === 'free') return { state: 'open', reason: 'free', product: sale, teaser: cfg.teaser };
  // paid
  if (viewAsFree) return { state: 'teaser', reason: 'purchase', product: sale, teaser: cfg.teaser, viewAsFree: true };
  const member = await memberOf(request, env);
  if (!member) return { state: 'teaser', reason: 'login', product: sale, teaser: cfg.teaser };
  const key = await sajuKeyOfBirth(Manse, birth);
  let owned = []; try { owned = await ownedWorlds(env, member.id, key); } catch { return { state: 'teaser', reason: 'unavailable', product: sale, teaser: cfg.teaser }; }
  if (!owned.includes(world)) return { state: 'teaser', reason: 'purchase', product: sale, teaser: cfg.teaser, member: { id: member.id } };
  await markViewed(env, member.id, key, world);   // 처음 연 시각(환불 판단 근거: 7일 이내·미열람)
  return { state: 'open', reason: 'owned', product: sale, member: { id: member.id } };
}

// 맛보기: 정해진 장·절만 남기고 나머지는 제목만(본문 비움). 서버에서 잘라 보내므로 유료 문구가 브라우저로 가지 않는다.
export function teaserOf(reading, teaser) {
  const keep = new Set(teaser || DEFAULT_YEAR_CONFIG.teaser);
  return {
    ...reading,
    teaser: true,
    chapters: reading.chapters.map(c => {
      if (keep.has(c.id)) return c;
      const secs = (c.sections || []).filter(s => keep.has(c.id + '.' + s.id));
      return { id: c.id, title: c.title, locked: true, sections: secs.length ? secs : undefined, months: c.months ? c.months.map(m => ({ lunarMonth: m.lunarMonth, label: m.label, solar: m.solar, locked: true })) : undefined };
    }),
  };
}
