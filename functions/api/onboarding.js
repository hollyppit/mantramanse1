// 랜딩 온보딩(연구·유명인 사례 후킹 · 명리학 소개 · 서비스 소개 · 무협 슬라이드 툰) 문구·사례 저장소와 단계 측정.
// 방문자에게 보이는 것은 "공개본(live)" 하나이고, 관리자는 "초안(draft)" 을 편집한다. 초안은 게시(publish) 해야 방문자에게 반영된다.
//
// GET  /api/onboarding               — 공개. { config|null, version }. 공개본에서 공개(visible)+검증 완료 사례만 내려 간다. 관리자 인증이 있으면 공개본 전체 사례
// GET  /api/onboarding?draft=1       — 관리자. { config(초안 없으면 공개본), version, liveVersion, hasDraft, dirty, draftAt, liveAt }
// GET  /api/onboarding?hist=1        — 관리자. 게시 이력 [{ id, at, version, note }]      ?hist=<id> 는 그 시점 설정 전체
// GET  /api/onboarding?stats=1       — 관리자. 이벤트·사례·섹션·기기별 건수
// PUT  /api/onboarding               — 관리자. 보낸 항목만 "초안"에 반영(공개본 불변)
// POST /api/onboarding?action=publish|unpublish|discard|restore&id=…  — 관리자. 게시 / 공개 중지(공개본 제거 → 기본 문구) / 초안 버리기 / 이력 복원(초안으로)
// POST /api/onboarding?ev=이름&d=m|d — 공개. 단계 측정(개인정보·출생정보 없음). body { case?:사례·섹션 id }
//
// 저장: GLOSSARY_KV(또는 Supabase kv) 'free:onboard'(공개본·예전과 같은 키) · 'free:onboard:draft' · 'free:onboard:hist'(+ 'free:onboard:h:<id>') · 'free:onbstat'.
// 기본 문구는 report/hub/onboard-data.js — 여기엔 덮어쓴 값만 있다. 배포 전 저장본은 그대로 공개본이므로 이전 설정은 사라지지 않는다(초안이 없으면 공개본을 편집 시작점으로 쓴다).
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';

const KEY = 'free:onboard', DRAFT = 'free:onboard:draft', HIST = 'free:onboard:hist', HKEY = 'free:onboard:h:', STAT = 'free:onbstat', MAX_BYTES = 512 * 1024, MAX_HIST = 20;
const ID = /^[a-z0-9][a-z0-9_-]{1,40}$/, IMG = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]{1,500})$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
const VSTATE = ['draft', 'review', 'verified', 'hold', 'rejected'];
const KINDS = ['study', 'experiment', 'history', 'celebrity', 'classic', 'other'];
const RELATION = ['direct', 'birth_correlation', 'belief', 'cultural', 'none'];
const SECTION_TYPES = ['research', 'myeongri', 'service', 'story', 'final'];
const EFFECTS = ['none', 'fade', 'rise', 'parallax', 'crossfade'];
const NATURE = ['history', 'tradition', 'science', 'limit'];
const FORBIDDEN = ['대공', '소협', '대협'];
// 측정 이벤트(허브 report/hub/hub-onboard.js 와 같은 이름). 이 목록 밖의 이름은 버린다.
const EVENTS = ['onboarding_view', 'onboarding_card_impression', 'onboarding_next_story_click', 'onboarding_source_click', 'onboarding_intro_complete', 'onboarding_skip', 'onboarding_other_case', 'onboarding_cta_click',
  'birth_input_start', 'birth_input_step_complete', 'birth_input_complete', 'calculation_success', 'calculation_failure', 'home_view', 'tarot_start', 'ilju_video_play', 'calendar_open',
  'movingtoon_preview_start', 'movingtoon_purchase_click',
  // 랜딩 개편 지표
  'landing_view', 'landing_cta_click', 'research_section_view', 'research_detail_open', 'research_source_click', 'myeongri_section_view', 'service_section_view', 'movingtoon_preview_view',
  'free_content_click', 'paid_report_view', 'purchase_complete'];

const s = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const arr = (v, n, len) => (Array.isArray(v) ? v.slice(0, n).map(x => s(x, len)).filter(Boolean) : []);
const img = v => { v = s(v, 600); return IMG.test(v) ? v : ''; };
const link = v => { v = s(v, 300); return /^(\/[\w\-./?=&#%]*|#\/[\w\-./?=&%]*|https:\/\/[^\s"'<>]+)$/.test(v) ? v : ''; };
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const flat = (o, keys, n) => { const r = {}; o = o && typeof o === 'object' ? o : {}; for (const k of keys) r[k] = s(o[k], n); return r; };

// 사례 하나를 정리한다. notes 에는 서버가 바꾼 내용(공개 취소·검증 취소)을 담아 관리자에게 돌려준다.
function cleanCase(c, notes) {
  if (!c || typeof c !== 'object' || !ID.test(String(c.id || ''))) return null;
  const src = c.source && typeof c.source === 'object' ? c.source : {};
  const url = s(src.url, 500), source = { label: s(src.label, 160), doi: s(src.doi, 120), url: /^https:\/\//.test(url) ? url : '' };
  // 검증 상태 ≠ 공개 여부. 옛 클라이언트(status 만 보냄)도 받아 준다.
  const st = c.status, vin = c.verification && typeof c.verification === 'object' ? c.verification : null, legacyOk = st === 'published' || st === 'verified';
  let state = vin ? (VSTATE.includes(vin.state) ? vin.state : 'draft') : (legacyOk ? 'verified' : st === 'review' ? 'review' : 'draft');
  let reviewedAt = vin ? s(vin.reviewedAt, 10) : (/\d{4}-\d{2}-\d{2}/.exec(String(c.verifiedNote || '')) || [''])[0];
  if (!DATE.test(reviewedAt)) reviewedAt = '';
  const basis = vin ? s(vin.basis, 400) : (s(c.verifiedNote, 400) || (legacyOk ? '이전 버전에서 검증·공개된 사례(검토 근거 미기록)' : ''));
  let visible = bool(c.visible, st === 'published');
  if (state === 'verified') {
    if (!basis) { state = 'review'; notes.push(`${c.id}: 검토 근거가 없어 "검토 중"으로 두었습니다`); }
    else if (!reviewedAt && vin) reviewedAt = today(); // 새 형식으로 "검증 완료"를 선택한 날을 검토일로 남긴다(옛 데이터의 날짜는 지어내지 않는다)
  }
  if (visible && !(state === 'verified' && (source.doi || source.url))) {
    visible = false; notes.push(`${c.id}: ${state !== 'verified' ? '검증 완료 전에는 공개할 수 없어' : '출처(DOI·URL)가 없어'} 비공개로 두었습니다`);
  }
  const kind = KINDS.includes(c.kind) ? c.kind : (c.type === 'celebrity' ? 'celebrity' : 'study');
  const study = flat(c.study, ['name', 'org', 'researchers', 'journal', 'doi', 'subject', 'sample', 'method', 'result', 'stats', 'limits', 'scope'], 400);
  study.year = Math.max(0, Math.min(2100, +(c.study && c.study.year) || +c.year || 0));
  const su = s(c.study && c.study.url, 500); study.url = /^https:\/\//.test(su) ? su : '';
  study.relation = c.study && RELATION.includes(c.study.relation) ? c.study.relation : 'none';
  const m = c.media && typeof c.media === 'object' ? c.media : {};
  const media = { image: img(m.image || c.image), mobileImage: img(m.mobileImage), bg: img(m.bg), video: img(m.video), alt: s(m.alt, 160), credit: s(m.credit, 160), license: s(m.license, 160) };
  const d = c.display && typeof c.display === 'object' ? c.display : {};
  const display = { order: Math.max(-50, Math.min(50, Math.round(+d.order || 0))), featured: bool(d.featured, false), showTitle: bool(d.showTitle, true), showSummary: bool(d.showSummary, true), showSource: bool(d.showSource, true), detail: bool(d.detail, true),
    mobileLayout: ['stack', 'compact'].includes(d.mobileLayout) ? d.mobileLayout : 'stack', design: ['plain', 'gold', 'glass'].includes(d.design) ? d.design : 'plain' };
  const o = {
    id: c.id, kind, type: kind === 'celebrity' ? 'celebrity' : 'research', group: c.group === 'birth' ? 'birth' : 'story',
    verification: { state, reviewedAt, basis }, visible, status: visible && state === 'verified' ? 'published' : state === 'verified' ? 'verified' : state === 'review' ? 'review' : 'draft',
    weight: Math.max(0.1, Math.min(10, +c.weight || 1)),
    title: s(c.title, 160), hook: s(c.hook, 160), body: arr(c.body, 6, 280), story: arr(c.story, 8, 420), takeaway: s(c.takeaway, 200), caveat: s(c.caveat, 400), who: s(c.who, 160), year: Math.max(0, Math.min(2100, +c.year || 0)),
    tags: arr(c.tags, 8, 20), source, verifiedNote: s(c.verifiedNote, 300), image: media.image, visual: s(c.visual, 20), study, media, display,
  };
  return o.title && (o.body.length || o.story.length) ? o : null;
}
const cleanLines = a => arr(a, 6, 120);
const cleanCta = c => ({ show: !!(c && c.show), text: s(c && c.text, 30) });
function clean(b, notes) {
  const out = {};
  if (typeof b.forceOnboarding === 'boolean') out.forceOnboarding = b.forceOnboarding;
  if (b.bridge && typeof b.bridge === 'object') out.bridge = { toCelebrity: s(b.bridge.toCelebrity, 240), toIntro: s(b.bridge.toIntro, 240) };
  if (typeof b.honorific === 'string') { const h = s(b.honorific, 8); out.honorific = h && !FORBIDDEN.includes(h) ? h : '귀인'; }
  if (b.weights && typeof b.weights === 'object') { const r = Math.max(0, Math.min(100, +b.weights.research || 0)), c = Math.max(0, Math.min(100, +b.weights.celebrity || 0)); if (r + c > 0) out.weights = { research: r, celebrity: c }; }
  if (Array.isArray(b.cases)) { const seen = new Set(); out.cases = b.cases.slice(0, 100).map(c => cleanCase(c, notes)).filter(c => c && !seen.has(c.id) && seen.add(c.id)); }
  if (Array.isArray(b.removedCases)) out.removedCases = b.removedCases.slice(0, 50).map(x => String(x)).filter(x => ID.test(x));
  if (Array.isArray(b.intro)) out.intro = b.intro.slice(0, 6).filter(x => x && ID.test(String(x.id || ''))).map(x => ({ id: x.id, title: s(x.title, 160), body: s(x.body, 400), sub: s(x.sub, 200), glyph: s(x.glyph, 2), image: img(x.image), video: img(x.video), enabled: x.enabled !== false }));
  if (b.introLast && typeof b.introLast === 'object') out.introLast = { line: s(b.introLast.line, 160), cta: s(b.introLast.cta, 30) };
  if (Array.isArray(b.scenes)) out.scenes = b.scenes.slice(0, 10).filter(x => x && ID.test(String(x.id || ''))).map(x => ({ id: x.id, title: s(x.title, 60), lines: cleanLines(x.lines), unknownLines: cleanLines(x.unknownLines), hint: s(x.hint, 240), button: s(x.button, 30), face: s(x.face, 12), image: img(x.image), bg: img(x.bg), bubble: ['glass', 'ink'].includes(x.bubble) ? x.bubble : '', enabled: x.enabled !== false }));
  if (typeof b.progressLabel === 'string' && b.progressLabel.trim()) out.progressLabel = s(b.progressLabel, 60);
  if (b.afterDone === 'home' || b.afterDone === 'reveal') out.afterDone = b.afterDone;
  if (Array.isArray(b.revealLines)) out.revealLines = cleanLines(b.revealLines);
  // 랜딩 섹션(순서 = 배열 순서). 종류(type)는 코드가 아는 것만.
  if (Array.isArray(b.sections)) {
    const seen = new Set();
    out.sections = b.sections.slice(0, 12).filter(x => x && SECTION_TYPES.includes(x.type) && ID.test(String(x.id || '')) && !seen.has(x.id) && seen.add(x.id)).map(x => ({
      id: x.id, type: x.type, enabled: x.enabled !== false, effect: EFFECTS.includes(x.effect) ? x.effect : 'fade', kicker: s(x.kicker, 60), title: s(x.title, 200), sub: s(x.sub, 400), notice: s(x.notice, 400), bridge: s(x.bridge, 300), topics: x.topics === true,
      bg: img(x.bg), bgMobile: img(x.bgMobile), cta: cleanCta(x.cta) }));
  }
  if (Array.isArray(b.services)) {
    const seen = new Set();
    out.services = b.services.slice(0, 16).filter(x => x && ID.test(String(x.id || '')) && !seen.has(x.id) && seen.add(x.id)).map(x => ({
      id: x.id, title: s(x.title, 80), desc: s(x.desc, 300), glyph: s(x.glyph, 2), status: x.status === 'soon' ? 'soon' : 'live', visible: x.visible !== false, image: img(x.image), video: img(x.video), link: link(x.link) })).filter(x => x.title);
  }
  if (Array.isArray(b.topics)) {
    const seen = new Set();
    out.topics = b.topics.slice(0, 20).filter(x => x && ID.test(String(x.id || '')) && !seen.has(x.id) && seen.add(x.id)).map(x => ({
      id: x.id, enabled: x.enabled !== false, nature: NATURE.includes(x.nature) ? x.nature : 'tradition', title: s(x.title, 80), sub: s(x.sub, 160), summary: s(x.summary, 400), detail: s(x.detail, 1200), analogy: s(x.analogy, 300),
      term: s(x.term, 40), termEasy: s(x.termEasy, 300), image: img(x.image), image2: img(x.image2), video: img(x.video), anim: EFFECTS.includes(x.anim) ? x.anim : 'fade', refs: s(x.refs, 400) })).filter(x => x.title);
  }
  return out;
}

const split = c => { const { version, at, publishedAt, ...config } = c; return { config, version: version || '' }; };

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url), admin = isAdmin(request, env), q = k => url.searchParams.get(k);
  if (q('stats') || q('draft') || q('hist')) {
    if (!admin) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩(GLOSSARY_KV)이 설정되지 않았습니다' }, 501);
    const kv = kvOf(env);
    if (q('stats')) return json({ stats: (await kv.get(STAT, 'json')) || { total: {}, byCase: {}, days: {} } });
    if (q('draft')) {
      const live = (await kv.get(KEY, 'json')) || null, dr = (await kv.get(DRAFT, 'json')) || null, base = dr || live;
      if (!base) return json({ config: null, version: '', liveVersion: '', hasDraft: false, dirty: false });
      const { config, version } = split(base);
      return json({ config, version, liveVersion: live ? live.version || '' : '', hasDraft: !!dr, dirty: !!dr && (!live || dr.version !== live.version), draftAt: dr ? dr.at || '' : '', liveAt: live ? live.publishedAt || live.at || '' : '' });
    }
    const id = q('hist');
    if (id !== '1') { if (!/^[a-z0-9]{3,20}$/.test(id)) return json({ error: '잘못된 이력 id' }, 400); const h = await kv.get(HKEY + id, 'json'); return h ? json({ id, ...split(h) }) : json({ error: '이력을 찾을 수 없습니다' }, 404); }
    return json({ hist: (await kv.get(HIST, 'json')) || [] });
  }
  if (!env.GLOSSARY_KV) return json({ config: null, version: '' });
  const c = (await kvOf(env, { cache: true }).get(KEY, 'json')) || null;
  if (!c) return json({ config: null, version: '' });
  const { config, version } = split(c);
  if (!admin && Array.isArray(config.cases)) config.cases = config.cases.filter(x => x.visible === true || (x.visible === undefined && x.status === 'published')).filter(x => !x.verification || x.verification.state === 'verified');
  return json({ config, version });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: '잘못된 요청 형식입니다' }, 400);
  const kv = kvOf(env), notes = [], base = (await kv.get(DRAFT, 'json')) || (await kv.get(KEY, 'json')) || {}, next = { ...base, ...clean(b, notes) };
  next.version = 'o' + Date.now().toString(36); next.at = new Date().toISOString(); delete next.publishedAt;
  const text = JSON.stringify(next); if (text.length > MAX_BYTES) return json({ error: '콘텐츠가 너무 큽니다' }, 413);
  await kv.put(DRAFT, text);
  return json({ ok: true, version: next.version, draft: true, notes });
}

async function snapshot(kv, live, note) {
  if (!live) return;
  const hist = (await kv.get(HIST, 'json')) || [], id = Date.now().toString(36);
  await kv.put(HKEY + id, JSON.stringify(live));
  hist.unshift({ id, at: new Date().toISOString(), version: live.version || '', note });
  for (const old of hist.splice(MAX_HIST)) { try { await kv.delete(HKEY + old.id); } catch { /* 이력 정리 실패는 무시 */ } }
  await kv.put(HIST, JSON.stringify(hist));
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url), action = url.searchParams.get('action') || '';
  if (action) { // 관리자 게시 관리
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    const ce = configError(env); if (ce) return json({ error: ce }, 501);
    const kv = kvOf(env), live = (await kv.get(KEY, 'json')) || null, dr = (await kv.get(DRAFT, 'json')) || null;
    if (action === 'publish') {
      if (!dr) return json({ error: '게시할 초안이 없습니다' }, 400);
      const missing = Array.isArray(dr.cases) ? dr.cases.filter(c => c.visible && !(c.verification && c.verification.state === 'verified')).map(c => c.id) : [];
      if (missing.length) return json({ error: '검증 완료 전 사례가 공개로 되어 있습니다: ' + missing.join(', ') }, 400);
      await snapshot(kv, live, '게시 직전 공개본');
      const pub = { ...dr, publishedAt: new Date().toISOString() };
      await kv.put(KEY, JSON.stringify(pub)); // 공개본과 초안은 같은 version 을 가진다 → dirty=false
      return json({ ok: true, version: pub.version });
    }
    if (action === 'unpublish') {
      if (!live) return json({ ok: true, version: '' });
      await snapshot(kv, live, '공개 중지 직전 공개본'); await kv.delete(KEY);
      return json({ ok: true, version: '' });
    }
    if (action === 'discard') { await kv.delete(DRAFT); return json({ ok: true }); }
    if (action === 'restore') {
      const id = url.searchParams.get('id') || ''; if (!/^[a-z0-9]{3,20}$/.test(id)) return json({ error: '잘못된 이력 id' }, 400);
      const h = await kv.get(HKEY + id, 'json'); if (!h) return json({ error: '이력을 찾을 수 없습니다' }, 404);
      const next = { ...h, version: 'o' + Date.now().toString(36), at: new Date().toISOString() }; delete next.publishedAt;
      await kv.put(DRAFT, JSON.stringify(next));
      return json({ ok: true, version: next.version });
    }
    return json({ error: '알 수 없는 동작입니다' }, 400);
  }
  return track(request, env, url);
}

// 측정: 이벤트 이름과 사례/섹션 id(있을 때)·기기(m|d)만 센다. 값 하나 올리는 읽기-쓰기라 동시 요청에서는 약간 어긋날 수 있다(통계용).
// total/days 는 "이벤트 건수"다. landing_view 등 세션당 1회 보내는 이벤트는 화면에서 "세션 수"로 읽는다(방문자 수와 다름).
async function track(request, env, url) {
  if (!env.GLOSSARY_KV) return json({ ok: false });
  const ev = url.searchParams.get('ev') || '';
  if (!EVENTS.includes(ev)) return json({ ok: false }, 400);
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  const cid = ID.test(String((b && b.case) || '')) ? b.case : '', dev = url.searchParams.get('d') === 'm' ? 'm' : url.searchParams.get('d') === 'd' ? 'd' : '';
  try {
    const kv = kvOf(env), st = (await kv.get(STAT, 'json')) || { total: {}, byCase: {}, days: {} }, day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    st.total[ev] = (st.total[ev] || 0) + 1;
    if (cid) { const c = (st.byCase[cid] = st.byCase[cid] || {}); c[ev] = (c[ev] || 0) + 1; }
    if (dev) { st.byDev = st.byDev || { m: {}, d: {} }; st.byDev[dev][ev] = (st.byDev[dev][ev] || 0) + 1; }
    const d = (st.days[day] = st.days[day] || {}); d[ev] = (d[ev] || 0) + 1;
    if (dev) { const dd = (st.daysDev = st.daysDev || {}); const x = (dd[day] = dd[day] || { m: {}, d: {} }); x[dev][ev] = (x[dev][ev] || 0) + 1; for (const k of Object.keys(dd).sort().slice(0, -60)) delete dd[k]; }
    for (const k of Object.keys(st.days).sort().slice(0, -60)) delete st.days[k]; // 최근 60일만
    if (Object.keys(st.byCase).length <= 200) await kv.put(STAT, JSON.stringify(st));
  } catch { return json({ ok: false }); }
  return json({ ok: true });
}
