// 주역 점괘 사용자 서비스. 관리자가 승인·게시한 문구(최신 게시본)만 쓰고, 서비스 개방 플래그가 꺼져 있으면 아무것도 내주지 않는다.
// 계산은 report/iching/engine.js(동전 점법 결과 6·7·8·9 → 본괘·변효·변괘), 문구 조합은 compose.js(mode 'public'). AI 호출·질문 저장·로그 없음 — 질문 원문은 응답에 되돌려 줄 뿐 서버에 남기지 않는다.
// 사주 입력(선택)은 만세력 화면이 이미 계산한 결과(일간·강약·대운)를 받아 형식만 검사해 교차 해석에 쓴다. 서버는 사주를 다시 계산하지도 고치지도 않는다.
import { Ic } from './_iching-runtime.js';
import { load } from './_iching-review.js';

const SEASONS = ['opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense'];
const STEM_KO = '갑을병정무기경신임계', EL_KO = '목화토금수', BANDS = ['신강', '신약', '중화'];

export async function openState(kv) {
  const { flags } = await load(kv);
  return { open: !!flags.enabled, categories: flags.enabled ? flags.categories : [] };
}

// 사주 입력 정리: 허용된 모양의 값만 통과시킨다(그 밖의 필드는 버린다). 이상하면 null → "사주 연동 정보 없음"으로 처리.
export function cleanSaju(s) {
  if (!s || typeof s !== 'object') return null;
  const dm = s.dayMaster, band = s.strength && s.strength.band, y = +s.nowYear;
  if (!dm || !STEM_KO.includes(String(dm.stem)) || String(dm.stem).length !== 1 || !BANDS.includes(band) || !Number.isInteger(y) || y < 1900 || y > 2100) return null;
  const out = { dayMaster: { stem: dm.stem, el: EL_KO.includes(String(dm.el)) && String(dm.el).length === 1 ? dm.el : '' }, strength: { band }, nowYear: y, daewoon: [] };
  for (const d of (Array.isArray(s.daewoon) ? s.daewoon : []).slice(0, 12)) {
    if (!d || !Number.isInteger(+d.startYear) || !Number.isInteger(+d.endYear) || !/^[가-힣]{2}$/.test(String(d.ganzhi)) || !SEASONS.includes(d.season)) continue;
    out.daewoon.push({ startYear: +d.startYear, endYear: +d.endYear, ganzhi: d.ganzhi, season: d.season });
  }
  if (s.annual && Number.isInteger(+s.annual.year) && /^[가-힣]{2}$/.test(String(s.annual.ganzhi))) out.annual = { year: +s.annual.year, ganzhi: s.annual.ganzhi };
  return out;
}

export async function interpret(kv, body) {
  const { Content: K, Review: R, Engine: E, Compose, Schema } = Ic();
  const store = await load(kv);
  if (!store.flags.enabled) return { ok: false, error: 'not-open', status: 403 };
  const cat = body && body.category;
  if (!K.CATEGORIES.includes(cat) || !store.flags.categories.includes(cat)) return { ok: false, error: 'category-closed', status: 403 };
  const values = body.values;
  if (!Array.isArray(values) || values.length !== 6 || !values.every(E.isLineValue)) return { ok: false, error: 'invalid-values', status: 400 };
  R.hydrate(store); // 항상 게시본 기준
  const question = String(body.question == null ? '' : body.question).slice(0, 200);
  const cast = E.resolve(values), saju = cleanSaju(body.saju);
  const result = Compose.compose({ question, category: cat, cast, saju }, { mode: 'public' });
  const v = Schema.validate(result);
  // 일부라도 게시되지 않은 문구가 필요하면 반쪽짜리 해석을 내주지 않는다(개방 점검이 막지만 마지막 방어선).
  if (!result.publishable || !v.ok) return { ok: false, error: 'not-ready', status: 503 };
  return { ok: true, result };
}
