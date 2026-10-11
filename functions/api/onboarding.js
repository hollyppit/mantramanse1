// 온보딩(연구·유명인 사례 후킹 · 명리학 소개 · 무협 슬라이드 툰) 문구·사례 저장소와 단계 측정.
// GET  /api/onboarding            — 공개. { config|null, version }. 공개(published) 사례만 내려 간다. 관리자 인증이 있으면 전체 사례(초안·검토 포함)
// GET  /api/onboarding?stats=1    — 관리자. 단계별 건수·사례별 노출/클릭
// PUT  /api/onboarding            — 관리자. { honorific, weights, cases, intro, introLast, scenes, revealLines } 보낸 쪽만 교체
// POST /api/onboarding?ev=이름     — 공개. 단계 측정(개인정보·출생정보 없음). body { case?:사례id }
// 저장: GLOSSARY_KV 'free:onboard'(설정) · 'free:onbstat'(집계). 기본 문구는 report/hub/onboard-data.js — 여기엔 덮어쓴 값만 있다.
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';

const KEY = 'free:onboard', STAT = 'free:onbstat', MAX_BYTES = 512 * 1024;
const ID = /^[a-z0-9][a-z0-9_-]{1,40}$/, IMG = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]{1,500})$/;
const STATUS = ['draft', 'review', 'verified', 'published'], TYPES = ['research', 'celebrity'];
const FORBIDDEN = ['대공', '소협', '대협'];
// 측정 이벤트(허브 report/hub/hub-onboard.js 와 같은 이름). 이 목록 밖의 이름은 버린다.
const EVENTS = ['onboarding_view', 'onboarding_card_impression', 'onboarding_next_story_click', 'onboarding_source_click', 'onboarding_intro_complete', 'onboarding_skip', 'onboarding_other_case', 'onboarding_cta_click',
  'birth_input_start', 'birth_input_step_complete', 'birth_input_complete', 'calculation_success', 'calculation_failure', 'home_view', 'tarot_start', 'ilju_video_play', 'calendar_open',
  'movingtoon_preview_start', 'movingtoon_purchase_click'];

const s = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const arr = (v, n, len) => (Array.isArray(v) ? v.slice(0, n).map(x => s(x, len)).filter(Boolean) : []);
const img = v => { v = s(v, 600); return IMG.test(v) ? v : ''; };

function cleanCase(c) {
  if (!c || typeof c !== 'object' || !ID.test(String(c.id || ''))) return null;
  const src = c.source && typeof c.source === 'object' ? c.source : {};
  const url = s(src.url, 500), source = { label: s(src.label, 160), doi: s(src.doi, 120), url: /^https:\/\//.test(url) ? url : '' };
  let status = STATUS.includes(c.status) ? c.status : 'draft';
  if (status === 'published' && !(source.doi || source.url)) status = 'verified'; // 출처 없는 자료는 공개하지 않는다
  const o = {
    id: c.id, type: TYPES.includes(c.type) ? c.type : 'research', status, weight: Math.max(0.1, Math.min(10, +c.weight || 1)),
    title: s(c.title, 120), hook: s(c.hook, 160), body: arr(c.body, 6, 280), caveat: s(c.caveat, 300), who: s(c.who, 160), year: Math.max(0, Math.min(2100, +c.year || 0)),
    tags: arr(c.tags, 8, 20), source, verifiedNote: s(c.verifiedNote, 300), image: img(c.image), visual: s(c.visual, 20),
  };
  return o.title && o.body.length ? o : null;
}
const cleanLines = a => arr(a, 6, 120);
function clean(b) {
  const out = {};
  if (typeof b.forceOnboarding === 'boolean') out.forceOnboarding = b.forceOnboarding;
  if (typeof b.honorific === 'string') { const h = s(b.honorific, 8); out.honorific = h && !FORBIDDEN.includes(h) ? h : '귀인'; }
  if (b.weights && typeof b.weights === 'object') { const r = Math.max(0, Math.min(100, +b.weights.research || 0)), c = Math.max(0, Math.min(100, +b.weights.celebrity || 0)); if (r + c > 0) out.weights = { research: r, celebrity: c }; }
  if (Array.isArray(b.cases)) { const seen = new Set(); out.cases = b.cases.slice(0, 100).map(cleanCase).filter(c => c && !seen.has(c.id) && seen.add(c.id)); }
  if (Array.isArray(b.intro)) out.intro = b.intro.slice(0, 6).filter(x => x && ID.test(String(x.id || ''))).map(x => ({ id: x.id, title: s(x.title, 160), body: s(x.body, 400), sub: s(x.sub, 200), glyph: s(x.glyph, 2), image: img(x.image), video: img(x.video), enabled: x.enabled !== false }));
  if (b.introLast && typeof b.introLast === 'object') out.introLast = { line: s(b.introLast.line, 160), cta: s(b.introLast.cta, 30) };
  if (Array.isArray(b.scenes)) out.scenes = b.scenes.slice(0, 10).filter(x => x && ID.test(String(x.id || ''))).map(x => ({ id: x.id, title: s(x.title, 60), lines: cleanLines(x.lines), unknownLines: cleanLines(x.unknownLines), hint: s(x.hint, 240), button: s(x.button, 30), face: s(x.face, 12), image: img(x.image), bg: img(x.bg), enabled: x.enabled !== false }));
  if (Array.isArray(b.revealLines)) out.revealLines = cleanLines(b.revealLines);
  return out;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url), admin = isAdmin(request, env);
  if (url.searchParams.get('stats')) {
    if (!admin) return json({ error: '관리자 인증이 필요합니다' }, 401);
    return json({ stats: (env.GLOSSARY_KV && (await kvOf(env).get(STAT, 'json'))) || { total: {}, byCase: {}, days: {} } });
  }
  if (!env.GLOSSARY_KV) return json({ config: null, version: '' });
  const c = (await kvOf(env, { cache: true }).get(KEY, 'json')) || null;
  if (!c) return json({ config: null, version: '' });
  const { version, at, ...config } = c;
  if (!admin && Array.isArray(config.cases)) config.cases = config.cases.filter(x => x.status === 'published');
  return json({ config, version: version || '' });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: '잘못된 요청 형식입니다' }, 400);
  const kv = kvOf(env), next = { ...((await kv.get(KEY, 'json')) || {}), ...clean(b) };
  next.version = 'o' + Date.now().toString(36); next.at = new Date().toISOString();
  const text = JSON.stringify(next); if (text.length > MAX_BYTES) return json({ error: '콘텐츠가 너무 큽니다' }, 413);
  await kv.put(KEY, text);
  return json({ ok: true, version: next.version });
}

// 측정: 이벤트 이름과 사례 id(있을 때)만 센다. 값 하나 올리는 읽기-쓰기라 동시 요청에서는 약간 어긋날 수 있다(통계용).
export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ ok: false });
  const url = new URL(request.url), ev = url.searchParams.get('ev') || '';
  if (!EVENTS.includes(ev)) return json({ ok: false }, 400);
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  const cid = ID.test(String((b && b.case) || '')) ? b.case : '';
  try {
    const kv = kvOf(env), st = (await kv.get(STAT, 'json')) || { total: {}, byCase: {}, days: {} }, day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    st.total[ev] = (st.total[ev] || 0) + 1;
    if (cid) { const c = (st.byCase[cid] = st.byCase[cid] || {}); c[ev] = (c[ev] || 0) + 1; }
    const d = (st.days[day] = st.days[day] || {}); d[ev] = (d[ev] || 0) + 1;
    for (const k of Object.keys(st.days).sort().slice(0, -60)) delete st.days[k]; // 최근 60일만
    if (Object.keys(st.byCase).length <= 200) await kv.put(STAT, JSON.stringify(st));
  } catch { return json({ ok: false }); }
  return json({ ok: true });
}
