// 인생 지도 "관계 · 결혼 시기" AI 추정 서버 로직(순수 함수, import 없음 → Node 테스트 가능). 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 엔진에 인간관계·결혼 전용 시간축 점수 모델이 없어서, 이 두 가지만 AI 가 "엔진이 계산한 대운·세운(십성·합충)"을 근거로 추정한다.
// 결과는 항상 source:'ai' 로 표시되고, 생년월일·이름은 보내지 않는다. 응답은 sanitize 를 통과한 것만 쓰이며, 실패하면 클라이언트가 규칙 추정(rule-estimate)을 그대로 쓴다.
export const PROMPT_VERSION = 'l2';
export const BANNED = /(반드시|무조건|확정|100%|틀림없|결혼한다|결혼합니다|이혼|파산|사망|임신|소송|범죄|대박)/;
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : null);
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const TG = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

// 클라이언트 입력 검증·정리. 모양이 이상하면 null.
export function validate(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.decades) || !Array.isArray(b.years)) return null;
  const g = b.gender === 'F' ? 'F' : 'M';
  const row = x => x && /^[가-힣]{2}$/.test(x.g || '') && TG.includes(x.s) && TG.includes(x.b) ? { g: x.g, s: x.s, b: x.b, r: (Array.isArray(x.r) ? x.r : []).slice(0, 6).map(t => str(t, 24)) } : null;
  const decades = b.decades.slice(0, 12).map((x, i) => { const r = row(x); return r && { i, a: num(x.a, 0, 120), ...r }; }).filter(x => x && x.a != null);
  const years = b.years.slice(0, 100).map(x => { const r = row(x); const y = num(x && x.y, 1850, 2200); return r && y != null ? { y, a: num(x.a, 0, 130), ...r } : null; }).filter(Boolean);
  if (decades.length < 3 || years.length < 5) return null;
  const n = b.natal || {};
  const natal = { pillars: (Array.isArray(n.pillars) ? n.pillars : []).slice(0, 4).map(p => str(p, 4)), strength: str(n.strength, 8), spouseStars: g === 'M' ? '재성(정재·편재)' : '관성(정관·편관)', dayBranchTG: TG.includes(n.dayBranchTG) ? n.dayBranchTG : '' };
  return { gender: g, natal, decades, years };
}

export const SYSTEM = `너는 명리학 해석가다. 입력은 이미 만세력 엔진이 계산한 한 사람의 원국 요약과 대운(10년)·세운(해마다)의 십성(stemTG=천간, branchTG=지지)과 합충형(r, 괄호 안은 원국의 어느 기둥과 만났는지: day=일지·배우자궁, month=월지·사회, year=년지, hour=시지·자녀궁)이다.
할 일: 두 가지 "시기별 활성도"(0~100)를 추정한다. 이것은 좋고 나쁨이 아니라 그 분야의 움직임·변화가 얼마나 커질 수 있는 시기인가이다.
1) relation = 인간관계(사람 사이의 변화·만남·갈등·조력이 두드러지는 정도). 비겁·관성·인성 십성, 월지·년지와의 합충, 일지와의 합충을 근거로 본다.
2) marriage = 인연·결혼 관련 움직임. 남자는 재성, 여자는 관성이 천간·지지에 들어오는 시기, 일지(배우자궁)와의 합·충·형, 일간과의 천간합을 근거로 본다. 18세 미만 해는 점수를 매기지 마라.
규칙: 입력에 없는 간지·십성을 지어내지 마라. 점수는 대운·세운 전체 안에서 상대적으로 높낮이가 보이도록 분포시켜라(대부분 35~65, 두드러진 곳만 70 이상). 사건을 단정하지 마라("결혼한다", "이혼", 파산, 질병 등 금지). note는 차분한 상담체(~습니다·~입니다)의 한 문장(60자 이내)으로 쓴다. 전문용어 없이 어떤 움직임을 살필 시기인지 설명하고, 활성도가 높다는 것을 좋은 관계·결혼의 성공으로 바꾸지 않는다.
marriage.windows 는 앞으로 15년 안에서 움직임이 가장 커질 수 있는 구간 최대 3개({from,to,note}). 두드러진 곳이 없으면 빈 배열.
JSON 한 덩어리로만 답하라: {"relation":{"decades":{"<i>":점수},"years":{"<y>":점수},"note":"..."},"marriage":{"decades":{"<i>":점수},"years":{"<y>":점수},"windows":[{"from":2029,"to":2031,"note":"..."}],"note":"..."}}`;

export function buildUser(clean, nowYear) {
  const l = x => `${x.g}(${x.s}/${x.b}${x.r.length ? ' ' + x.r.join(',') : ''})`;
  return `성별:${clean.gender === 'F' ? '여' : '남'} · 원국:${clean.natal.pillars.join(' ')} · 신강약:${clean.natal.strength} · 일지십성:${clean.natal.dayBranchTG} · 배우자성:${clean.natal.spouseStars} · 현재:${nowYear}년\n` +
    '대운(i, 나이범위, 간지(천간십성/지지십성 합충)):\n' + clean.decades.map(x => `${x.i}, ${x.a}~${x.a + 9}세, ${l(x)}`).join('\n') +
    '\n세운(년, 나이, 간지(...)):\n' + clean.years.map(x => `${x.y}, ${x.a}세, ${l(x)}`).join('\n');
}

// AI 응답 → 정리된 결과. 허용된 키·범위·문장만 남긴다. 쓸 수 있는 값이 하나도 없으면 null.
export function sanitize(text, clean, nowYear) {
  let o; try { const m = /\{[\s\S]*\}/.exec(String(text || '')); o = JSON.parse(m ? m[0] : ''); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const dKeys = new Set(clean.decades.map(d => String(d.i))), yKeys = new Set(clean.years.map(y => String(y.y)));
  const adult = new Set(clean.years.filter(y => y.a >= 18).map(y => String(y.y)));
  const note = v => { const t = str(v, 80).trim(); return t && !BANNED.test(t) ? t : ''; };
  const pick = (m, keys) => { const out = {}; for (const k of Object.keys(m && typeof m === 'object' ? m : {})) { if (!keys.has(k)) continue; const n = num(m[k], 0, 100); if (n != null) out[k] = n; } return out; };
  const rel = o.relation || {}, mar = o.marriage || {};
  const r = { decades: pick(rel.decades, dKeys), years: pick(rel.years, yKeys), note: note(rel.note) };
  const m = { decades: pick(mar.decades, dKeys), years: pick(mar.years, adult), note: note(mar.note), windows: [] };
  for (const w of (Array.isArray(mar.windows) ? mar.windows : []).slice(0, 3)) {
    const f = num(w && w.from, nowYear - 1, nowYear + 40), t = num(w && w.to, nowYear - 1, nowYear + 40), n = note(w && w.note);
    if (f != null && t != null && t >= f && t - f <= 6 && n) m.windows.push({ from: f, to: t, note: n });
  }
  const has = Object.keys(r.decades).length + Object.keys(r.years).length + Object.keys(m.decades).length + Object.keys(m.years).length;
  return has >= 5 ? { relation: r, marriage: m } : null;
}

export async function cacheKey(clean) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(PROMPT_VERSION + JSON.stringify(clean)));
  return 'lifeai:' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}
