// MANTRA INTERPRETATION KNOWLEDGE SYSTEM — 순수 로직(외부 import 없음 → Node 테스트 가능). 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 계층: 계산(sd) → deriveFacts → retrieve(구조화 필터) → modifiers → conflicts → buildPackage → composePlain/AI Composer → qualityCheck
// 원칙: 새 명리 계산은 하지 않는다. sd(ReportV2.SajuData.build 결과)에 있는 값만 조건으로 쓴다. 없는 값은 UNSUPPORTED 로 표시하고 매칭에서 제외한다.
export const IK_VERSION = 'ik1';
export const COMPOSER_VERSION = 'cmp1';

export const DOMAINS = {
  SELF: '성격', MONEY: '재물', CAREER: '직업', LOVE: '연애', MARRIAGE: '결혼', RELATIONSHIP: '관계', TIMING: '시기', ACTION: '행동/개운',
};
export const STATUSES = ['draft', 'review', 'approved', 'published', 'archived'];
export const STATUS_KO = { draft: '임시저장', review: '검수 대기', approved: '검수 완료', published: '게시', archived: '보관' };
export const SOURCE_TYPES = ['expert', 'book', 'internal', 'research', 'AI_DRAFT'];
export const CONFIDENCE = ['high', 'mid', 'low'];
export const CONF_KO = { high: '높음', mid: '보통', low: '낮음' };
export const STANCES = ['positive', 'neutral', 'caution']; // 충돌 감지용: 같은 분야·세부분야에서 positive vs caution 이 함께 뽑히면 충돌
export const LEVELS = ['weak', 'mid', 'strong'];
export const LEVEL_KO = { weak: '약함', mid: '보통', strong: '강함' };
// 오행·십성군 강약 구간(%) — 표현용 기준이며 엔진 계산이 아니다(rules.js 의 HIGH/ZERO 와 같은 성격). 관리자 문서에 노출.
export const LEVEL_CUT = { weak: 12, strong: 28 };
export const levelOf = pct => (pct < LEVEL_CUT.weak ? 'weak' : pct >= LEVEL_CUT.strong ? 'strong' : 'mid');

export const ELEMENTS = ['목', '화', '토', '금', '수'];
export const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
export const SEASON_KO = { opportunity: '기회기', expansion: '확장기', harvest: '수확기', accumulation: '축적기', transition: '전환기', defense: '방어기' };
const BRANCH_SEASON = { 인: '봄', 묘: '봄', 진: '봄', 사: '여름', 오: '여름', 미: '여름', 신: '가을', 유: '가을', 술: '가을', 해: '겨울', 자: '겨울', 축: '겨울' };

// 조건 필드 → [표시 이름, 가중치(좁게 가리킬수록 큼), 종류]. 종류: list(값 목록 중 하나) | map(키별 강약)
export const COND_FIELDS = {
  dayPillar: ['일주', 8, 'list'], dayMaster: ['일간', 4, 'list'], strength: ['신강/신약', 3, 'list'], hasRoot: ['통근', 2, 'list'],
  monthBranch: ['월령(월지)', 3, 'list'], season: ['태어난 계절', 2, 'list'], dayBranch: ['일지', 2, 'list'],
  yongEl: ['용신 오행', 3, 'list'], pattern: ['격국·구조', 3, 'list'], star: ['신살', 2, 'list'], relation: ['합충형파해', 2, 'list'],
  daewoonSeason: ['현재 대운 흐름', 3, 'list'], seunSeason: ['올해 세운 흐름', 3, 'list'], monthSeason: ['이달 월운 흐름', 2, 'list'],
  futureSeason3: ['앞으로 3년 흐름(포함)', 2, 'list'], futureSeason5: ['앞으로 5년 흐름(포함)', 2, 'list'],
  el: ['오행 강약', 2, 'map'], group: ['십성군 강약', 3, 'map'], tenGod: ['십성 10종 강약', 3, 'map'],
};
// 아직 엔진이 주지 않아 지원하지 않는 조건(TODO) — 관리자 화면에 그대로 안내한다.
export const UNSUPPORTED = [
  ['지장간', '엔진이 지장간별 십성 비중을 sd 로 내보내지 않음'], ['조후', '조후 판정 값이 sd 에 없음'], ['십성 위치(년·월·일·시주별)', 'sd 는 십성 비중만 제공, 주별 위치 조건은 미지원'],
  ['형·파·해 세부 구분', 'sd.clashes 는 합과 충류를 두 갈래로만 나눔(유형명은 relation 조건으로 사용 가능)'], ['월운 12개월 전체 조건', '이달 한 달만 지원'],
];

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const strs = (v, n = 20, len = 200) => (Array.isArray(v) ? v.slice(0, n).map(x => str(x, len)).filter(Boolean) : []);
const ID_RE = /^[A-Za-z0-9_.\-]{3,60}$/;
export const isId = s => ID_RE.test(String(s || ''));

// ───────────── 조건 정리 ─────────────
// conditions: { 필드: [값…] }(list) | { 필드: { 키: 'weak'|'mid'|'strong' } }(map). 빈 필드는 버린다.
export function cleanConds(c) {
  const o = {}; if (!c || typeof c !== 'object') return o;
  for (const k of Object.keys(COND_FIELDS)) {
    const kind = COND_FIELDS[k][2], v = c[k]; if (v == null) continue;
    if (kind === 'list') { const a = strs(v, 30, 30); if (a.length) o[k] = a; }
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = k === 'el' ? ELEMENTS : k === 'group' ? GROUPS : Object.keys(v).filter(x => /^[가-힣]{1,4}$/.test(x)), m = {};
      for (const kk of keys) if (LEVELS.includes(v[kk])) m[kk] = v[kk];
      if (Object.keys(m).length) o[k] = m;
    }
  }
  return o;
}
export const MOD_EFFECTS = ['strengthen', 'soften', 'replace', 'exception'];
export const EFFECT_KO = { strengthen: '강화', soften: '완화', replace: '대체', exception: '예외' };
function cleanModifier(m, i) {
  if (!m || typeof m !== 'object') return null;
  const when = cleanConds(m.when); if (!Object.keys(when).length) return null;
  return { id: isId(m.id) ? m.id : 'm' + (i + 1), when, effect: MOD_EFFECTS.includes(m.effect) ? m.effect : 'strengthen', text: str(m.text, 600) };
}

export function cleanItem(b, prev) {
  if (!b || typeof b !== 'object' || !isId(b.id) || !DOMAINS[b.domain]) return null;
  const ex = b.realWorldExamples && typeof b.realWorldExamples === 'object' ? b.realWorldExamples : {};
  const now = new Date().toISOString();
  const conf = CONFIDENCE.includes(b.confidence) ? b.confidence : 'mid', sourceType = SOURCE_TYPES.includes(b.sourceType) ? b.sourceType : 'internal';
  let status = STATUSES.includes(b.status) ? b.status : 'draft', reviewed = !!b.reviewed;
  if (sourceType === 'AI_DRAFT' && !reviewed && (status === 'approved' || status === 'published')) status = 'draft'; // AI 초안은 검수 없이 게시 불가
  if (status === 'published' && !reviewed) status = 'review'; // 게시는 검수 완료가 전제
  return {
    id: b.id, title: str(b.title, 120), domain: b.domain, subDomain: str(b.subDomain, 40), status, priority: Math.max(0, Math.min(100, Math.round(+b.priority || 0))), stance: STANCES.includes(b.stance) ? b.stance : 'neutral',
    conditions: cleanConds(b.conditions), modifiers: (Array.isArray(b.modifiers) ? b.modifiers.slice(0, 20) : []).map(cleanModifier).filter(Boolean), exclusions: cleanConds(b.exclusions),
    principle: str(b.principle, 2000), interpretation: str(b.interpretation, 2000), strengths: strs(b.strengths, 12, 300), risks: strs(b.risks, 12, 300), behaviorPatterns: strs(b.behaviorPatterns, 12, 300), actions: strs(b.actions, 12, 300),
    realWorldExamples: { worker: str(ex.worker, 600), business: str(ex.business, 600), freelance: str(ex.freelance, 600), love: str(ex.love, 600) },
    sourceType, sourceReference: str(b.sourceReference, 200), sourceMemo: str(b.sourceMemo, 1000), confidence: conf, reviewed, reviewedAt: reviewed ? (str(b.reviewedAt, 40) || now) : '',
    tags: strs(b.tags, 20, 30), version: (prev && prev.version ? prev.version : 0), createdAt: (prev && prev.createdAt) || str(b.createdAt, 40) || now, updatedAt: now,
  };
}

// ───────────── 사실(facts) 추출: sd → 조건 평가용 평평한 값 ─────────────
// ext.future: [{ year, season }] — 클라이언트가 M.seunRange 로 얻은 앞으로 5년(엔진 값). 없으면 futureSeason 조건은 unsupported 처리.
export function deriveFacts(sd, ext) {
  if (!sd || !sd.dayMaster || !sd.dayPillar) throw new Error('sd 가 올바르지 않습니다');
  const f = { unsupportedNow: [] };
  f.dayMaster = sd.dayMaster.stem; f.dayPillar = sd.dayPillar.ko; f.strength = sd.strength && sd.strength.band;
  if (sd.roots) f.hasRoot = sd.roots.hasRoot ? '있음' : '없음'; f.rootLevel = sd.roots && sd.roots.level;
  const mb = sd.pillars && sd.pillars.month && sd.pillars.month.ko && sd.pillars.month.ko[1]; if (mb) { f.monthBranch = mb; f.season = BRANCH_SEASON[mb]; }
  f.dayBranch = sd.dayPillar.ko[1];
  if (sd.usefulElements) f.yongEl = sd.usefulElements.yong;
  f.pattern = (sd.patterns || []).map(p => p.name); f.star = (sd.specialStars || []).map(s => s.name);
  const rel = new Set(); [...(sd.combinations || []), ...(sd.clashes || [])].forEach(r => { if (r.type) rel.add(r.type); if (r.name) rel.add(r.name); }); f.relation = [...rel];
  f.el = {}; ELEMENTS.forEach(e => { const p = sd.fiveElements && sd.fiveElements[e]; if (p != null) f.el[e] = { pct: p, level: levelOf(p) }; });
  f.group = {}; GROUPS.forEach(g => { const p = sd.groups && sd.groups[g]; if (p != null) f.group[g] = { pct: p, level: levelOf(p) }; });
  f.tenGod = {}; Object.keys(sd.tenGods || {}).forEach(k => { f.tenGod[k] = { pct: sd.tenGods[k], level: levelOf(sd.tenGods[k] * 2) }; }); // 10종은 평균이 10% → 군 기준과 맞추려 2배
  if (sd.currentDaewoon && sd.currentDaewoon.season) f.daewoonSeason = SEASON_KO[sd.currentDaewoon.season];
  if (sd.sewoon && sd.sewoon.season) f.seunSeason = SEASON_KO[sd.sewoon.season];
  const m0 = (sd.monthlyLuck || [])[0]; if (m0 && m0.season) f.monthSeason = SEASON_KO[m0.season];
  const fut = ext && Array.isArray(ext.future) ? ext.future.filter(x => x && x.season) : [];
  if (fut.length) { f.futureSeason3 = [...new Set(fut.slice(0, 3).map(x => SEASON_KO[x.season]).filter(Boolean))]; f.futureSeason5 = [...new Set(fut.slice(0, 5).map(x => SEASON_KO[x.season]).filter(Boolean))]; f.futureYears = fut.slice(0, 5).map(x => ({ year: x.year, season: SEASON_KO[x.season] })); }
  f.nowYear = sd.nowYear || null; f.gender = sd.gender === 'F' ? '여' : '남';
  return f;
}

// ───────────── 조건 평가 ─────────────
// 반환: { match, spec, rows, missing }  rows: 조건별 { key, label, want, have, hit }  missing: facts 에 값이 없어 판정 못 한 필드
export function evalConds(conds, facts) {
  const rows = [], missing = []; let match = true, spec = 0;
  for (const k of Object.keys(conds || {})) {
    const def = COND_FIELDS[k]; if (!def) continue; const want = conds[k], w = def[1];
    if (def[2] === 'list') {
      const have = facts[k]; let hit = false;
      if (have == null) missing.push(k); else hit = Array.isArray(have) ? have.some(v => want.includes(v)) : want.includes(have);
      rows.push({ key: k, label: def[0], want, have: have == null ? null : have, hit }); if (hit) spec += w; else match = false;
    } else {
      const src = facts[k] || {};
      for (const kk of Object.keys(want)) {
        const have = src[kk]; let hit = false;
        if (!have) missing.push(k + '.' + kk); else hit = have.level === want[kk];
        rows.push({ key: k + '.' + kk, label: def[0] + ' · ' + kk, want: [LEVEL_KO[want[kk]]], have: have ? LEVEL_KO[have.level] + ' ' + Math.round(have.pct) + '%' : null, hit });
        if (hit) spec += w; else match = false;
      }
    }
  }
  return { match, spec, rows, missing };
}
const anyHit = (conds, facts) => { const e = evalConds(conds, facts); return Object.keys(conds || {}).length > 0 && e.rows.some(r => r.hit) && e.match; };

// ───────────── 검색(Structured Retrieval) ─────────────
// opts: { domain, includeDraft, sections }  production: status==='published' && reviewed && sourceType!=='AI_DRAFT'(검수 전)
export const isProduction = it => it.status === 'published' && it.reviewed && !(it.sourceType === 'AI_DRAFT' && !it.reviewed);
const CONF_W = { high: 3, mid: 2, low: 1 };
export function retrieve(items, facts, opts) {
  opts = opts || {}; const used = [], excluded = [];
  for (const it of items) {
    if (opts.domain && it.domain !== opts.domain) continue;
    if (it.status === 'archived') continue;
    if (!opts.includeDraft && !isProduction(it)) continue;
    const ev = evalConds(it.conditions, facts), cn = Object.keys(it.conditions || {}).length;
    const rec = { id: it.id, title: it.title, domain: it.domain, subDomain: it.subDomain, stance: it.stance, confidence: it.confidence, status: it.status, rows: ev.rows, spec: ev.spec, missing: ev.missing, general: cn === 0 };
    if (!ev.match) { if (ev.rows.some(r => r.hit) && !ev.missing.length) excluded.push({ ...rec, reason: 'unmatched' }); else if (ev.missing.length) excluded.push({ ...rec, reason: 'unsupported' }); continue; }
    if (Object.keys(it.exclusions || {}).length && anyHit(it.exclusions, facts)) { excluded.push({ ...rec, reason: 'excluded' }); continue; }
    used.push({ ...rec, score: ev.spec * 100 + (+it.priority || 0) * 1 + CONF_W[it.confidence] * 0.5, item: it });
  }
  used.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return { used, excluded };
}

// ───────────── 보정(Modifier) ─────────────
export function applyModifiers(rec, facts) {
  const hits = [];
  for (const m of rec.item.modifiers || []) { const e = evalConds(m.when, facts); if (e.match) hits.push({ knowledgeId: rec.id, id: m.id, effect: m.effect, text: m.text, rows: e.rows }); }
  const replaced = hits.filter(h => h.effect === 'replace' && h.text).pop();
  return { hits, interpretation: replaced ? replaced.text : rec.item.interpretation, replaced: !!replaced };
}

// ───────────── 충돌 감지 ─────────────
// 같은 domain+subDomain 안에서 positive vs caution 이 함께 뽑히면 충돌. 해결 순서: specificity → priority → confidence → (현재 흐름은 별도 항목이 이미 조건으로 반영). 동률이면 unresolved.
export function detectConflicts(used) {
  const groups = {}; used.forEach(u => { if (u.stance === 'neutral') return; (groups[u.domain + '/' + u.subDomain] = groups[u.domain + '/' + u.subDomain] || []).push(u); });
  const out = [];
  for (const key of Object.keys(groups)) {
    const pos = groups[key].filter(u => u.stance === 'positive'), neg = groups[key].filter(u => u.stance === 'caution');
    for (const p of pos) for (const n of neg) {
      const a = [p.spec, +p.item.priority || 0, CONF_W[p.confidence]], b = [n.spec, +n.item.priority || 0, CONF_W[n.confidence]];
      let win = null, by = '';
      for (let i = 0; i < 3 && !win; i++) if (a[i] !== b[i]) { win = a[i] > b[i] ? p : n; by = ['구체성(조건 수·가중치)', '우선순위', '신뢰도'][i]; }
      out.push({ key, a: p.id, b: n.id, resolved: !!win, winner: win ? win.id : null, loser: win ? (win === p ? n.id : p.id) : null, by, note: win ? `${win.id} 우선 (${by})` : '해결 불가 — 관리자 확인 필요' });
    }
  }
  return out;
}

// ───────────── 설계/규칙 기본값 ─────────────
const S = (id, title, extra) => Object.assign({ id, title, enabled: true, required: true }, extra || {});
export const DEFAULT_DESIGN = {
  MONEY: { required: ['일간 강약', '재성', '식상', '비겁', '합충', '대운', '세운'], optional: ['통근', '조후', '인성', '신살'],
    sections: [S('moneyStructure', '재물 구조 핵심'), S('earningStyle', '돈 버는 방식'), S('income', '수입 구조'), S('spendingRisk', '돈이 새는 패턴'), S('accumulation', '돈을 모으는 방식'), S('salary', '직장 소득', { required: false }), S('business', '사업/프리랜서', { required: false }),
      S('expansionRisk', '투자/확장 주의점', { required: false }), S('currentTiming', '현재 재물 흐름'), S('future3Years', '향후 3년'), S('future5Years', '향후 5년', { required: false }), S('opportunity', '기회 시기'), S('risk', '주의 시기'), S('action', '행동 전략')] },
  SELF: { required: ['일간', '신강/신약', '오행', '십성'], optional: ['통근', '합충'], sections: [S('personality', '성격'), S('temperament', '기질'), S('strength', '강점'), S('weakness', '약점'), S('behavior', '행동 패턴'), S('stress', '스트레스 패턴', { required: false })] },
  CAREER: { required: ['일간', '십성', '대운'], optional: ['격국', '신살'], sections: [S('aptitude', '직업/재능'), S('organization', '조직'), S('freelance', '프리랜서/창업', { required: false }), S('successStyle', '성공 방식'), S('careerChange', '직업 변화', { required: false }), S('currentTiming', '현재 흐름'), S('action', '행동 전략')] },
  LOVE: { required: ['일지', '재성/관성', '합충'], optional: ['신살'], sections: [S('attraction', '끌림'), S('pattern', '관계 패턴'), S('conflict', '갈등'), S('timing', '인연 시기', { required: false }), S('action', '행동 전략')] },
  MARRIAGE: { required: ['일지', '재성/관성', '합충'], optional: [], sections: [S('spouse', '배우자'), S('life', '결혼생활'), S('keeping', '관계 유지'), S('timing', '결혼 관련 시기', { required: false })] },
  RELATIONSHIP: { required: ['십성', '합충'], optional: ['신살'], sections: [S('social', '인간관계'), S('helper', '귀인'), S('rivalry', '경쟁'), S('family', '가족', { required: false })] },
  TIMING: { required: ['대운', '세운'], optional: ['월운'], sections: [S('daewoon', '대운'), S('seun', '세운'), S('wolun', '월운', { required: false }), S('opportunityPhase', '기회기·확장기'), S('defensePhase', '전환기·방어기'), S('recoveryPhase', '축적기·회복기', { required: false })] },
  ACTION: { required: ['용신', '신강/신약'], optional: [], sections: [S('strategy', '행동 전략'), S('riskManagement', '리스크 관리'), S('environment', '환경'), S('lifestyle', '생활 방식'), S('remedy', '개운 전략')] },
};
export const DEFAULT_RULES = {
  tone: 'easy', depth: 'standard', examples: 1, jargon: 'min', balance: true, actions: true,
  domainOverrides: { MONEY: '재물 풀이에서는 반드시 수입과 자산 축적을 구분한다. 사업 매출과 개인 자산을 동일하게 해석하지 않는다. 수입 증가와 돈이 남는 것을 구분한다.' },
  banned: [], // 추가 금지 표현
};
export const TONE_KO = { easy: '쉬운 현실형', pro: '전문형', story: '스토리형' };
export const DEPTH_KO = { brief: '간략', standard: '표준', detailed: '상세', max: '매우 상세' };
export const JARGON_KO = { min: '최소', normal: '보통', rich: '상세' };

export function cleanDesign(b) {
  const out = {}; if (!b || typeof b !== 'object') return out;
  for (const d of Object.keys(DOMAINS)) {
    const x = b[d]; if (!x || typeof x !== 'object') continue;
    const seen = new Set(), sections = [];
    for (const s of Array.isArray(x.sections) ? x.sections.slice(0, 40) : []) { if (!s || !/^[A-Za-z0-9_]{2,40}$/.test(s.id || '') || seen.has(s.id)) continue; seen.add(s.id); sections.push({ id: s.id, title: str(s.title, 40) || s.id, enabled: s.enabled !== false, required: s.required !== false }); }
    out[d] = { required: strs(x.required, 20, 30), optional: strs(x.optional, 20, 30), sections };
  }
  return out;
}
export function cleanRules(b) {
  if (!b || typeof b !== 'object') return JSON.parse(JSON.stringify(DEFAULT_RULES));
  const o = { tone: TONE_KO[b.tone] ? b.tone : 'easy', depth: DEPTH_KO[b.depth] ? b.depth : 'standard', examples: Math.max(0, Math.min(3, Math.round(+b.examples) || 0)), jargon: JARGON_KO[b.jargon] ? b.jargon : 'min', balance: b.balance !== false, actions: b.actions !== false, domainOverrides: {}, banned: strs(b.banned, 30, 30) };
  for (const d of Object.keys(DOMAINS)) if (b.domainOverrides && typeof b.domainOverrides[d] === 'string' && b.domainOverrides[d].trim()) o.domainOverrides[d] = b.domainOverrides[d].trim().slice(0, 1200);
  return o;
}
export const designFor = (design, domain) => (design && design[domain] && design[domain].sections && design[domain].sections.length ? design[domain] : DEFAULT_DESIGN[domain]);

// ───────────── Interpretation Package ─────────────
// design 의 활성 Section 마다 subDomain === section.id 인 지식(+ 그 Section 에 쓸 수 있는 '일반' 지식)을 모은다.
// 근거가 없는 Section 은 status:'insufficient' 로 두고 AI 가 억지로 채우지 않는다.
export function buildPackage(sd, ext, items, design, rules, opts) {
  opts = opts || {}; const domain = opts.domain; if (!DOMAINS[domain]) throw new Error('알 수 없는 분야');
  const facts = deriveFacts(sd, ext), dz = designFor(design, domain), rl = rules || DEFAULT_RULES;
  const { used, excluded } = retrieve(items, facts, { domain, includeDraft: !!opts.includeDraft });
  const conflicts = detectConflicts(used), loserIds = new Set(conflicts.filter(c => c.resolved).map(c => c.loser));
  const modifiers = [], appliedRules = [], sections = {}, order = [];
  const applied = new Map(); for (const u of used) { const m = applyModifiers(u, facts); applied.set(u.id, m); m.hits.forEach(h => modifiers.push(h)); }
  for (const sec of dz.sections) {
    if (sec.enabled === false) continue; order.push(sec.id);
    const here = used.filter(u => u.subDomain === sec.id && !loserIds.has(u.id));
    if (!here.length) { sections[sec.id] = { id: sec.id, title: sec.title, required: sec.required, status: 'insufficient', items: [], reason: '이 분야·사주에 맞는 검수된 풀이 지식이 없습니다' }; continue; }
    const max = ({ brief: 1, standard: 2, detailed: 4, max: 6 })[rl.depth] || 2, pick = here.slice(0, max);
    sections[sec.id] = { id: sec.id, title: sec.title, required: sec.required, status: 'ok', items: pick.map(u => {
      const a = applied.get(u.id), it = u.item;
      return { id: u.id, title: it.title, stance: it.stance, confidence: it.confidence, spec: u.spec, interpretation: a.interpretation, replaced: a.replaced, principle: it.principle, strengths: it.strengths, risks: it.risks, behaviorPatterns: it.behaviorPatterns, actions: it.actions, realWorldExamples: it.realWorldExamples,
        modifiers: a.hits.map(h => ({ id: h.id, effect: h.effect, text: h.text })), why: u.rows.filter(r => r.hit).map(r => r.label + ' = ' + (Array.isArray(r.have) ? r.have.join(',') : r.have)) };
    }) };
    pick.forEach(u => appliedRules.push({ rule: 'section:' + sec.id, knowledge: u.id, specificity: u.spec }));
  }
  const insufficient = order.filter(id => sections[id].status === 'insufficient');
  const pkg = { v: IK_VERSION, domain, domainName: DOMAINS[domain], order, facts: factSummary(facts), matchedKnowledge: used.map(u => ({ id: u.id, title: u.title, subDomain: u.subDomain, stance: u.stance, confidence: u.confidence, score: Math.round(u.score * 10) / 10, spec: u.spec, general: u.general, used: !!order.length && order.some(id => sections[id].items.some(i => i.id === u.id)), rows: u.rows })),
    excludedKnowledge: excluded.map(e => ({ id: e.id, title: e.title, subDomain: e.subDomain, reason: e.reason, missing: e.missing, rows: e.rows })), appliedRules, modifiers, conflicts, sections, insufficient, unsupported: UNSUPPORTED.map(u => u[0]) };
  pkg.confidence = packageConfidence(pkg);
  return pkg;
}
function factSummary(f) {
  const lv = o => Object.keys(o || {}).map(k => k + ' ' + Math.round(o[k].pct) + '%(' + LEVEL_KO[o[k].level] + ')').join(' · ');
  return { dayPillar: f.dayPillar, dayMaster: f.dayMaster, strength: f.strength, hasRoot: f.hasRoot, rootLevel: f.rootLevel, monthBranch: f.monthBranch, season: f.season, yongEl: f.yongEl, elements: lv(f.el), groups: lv(f.group), patterns: f.pattern, stars: f.star, relations: f.relation,
    daewoonSeason: f.daewoonSeason, seunSeason: f.seunSeason, monthSeason: f.monthSeason, future: f.futureYears || null, nowYear: f.nowYear };
}
function packageConfidence(p) {
  const ok = p.order.filter(id => p.sections[id].status === 'ok'); if (!ok.length) return 'LOW';
  const conf = ok.flatMap(id => p.sections[id].items.map(i => CONF_W[i.confidence])), avg = conf.reduce((a, b) => a + b, 0) / conf.length, miss = p.insufficient.filter(id => p.sections[id].required).length;
  return avg >= 2.5 && miss === 0 && !p.conflicts.some(c => !c.resolved) ? 'HIGH' : avg >= 1.8 && miss <= 2 ? 'MID' : 'LOW';
}

// ───────────── 안전한 표현 / 품질 검사 ─────────────
export const BANNED_RE = /(반드시|무조건|확정|100%|틀림없|사망|죽는|죽음|암에|질병에 걸|수익률|수익을 보장|임신한다|소송에서|범죄|이혼한다|파산한다|합격한다|결혼한다)/;
const EVENT_RE = /(20\d\d년[에는\s]*[^.。\n]{0,12}(결혼|이혼|사망|합격|임신|파산|사고)[^.。\n]{0,6}(한다|합니다|됩니다|된다|할 것))/;
const JARGON_RE = /(비겁|식상|재성|관성|인성|겁재|비견|식신|상관|편재|정재|편관|정관|편인|정인|신강|신약|통근|용신|격국|월령|지장간|조후)/g;

// text: sections 합성 결과 { sectionId: [ {text, refs:[ids]} ] }
export function qualityCheck(pkg, composed, rules) {
  const issues = [], add = (level, section, msg) => issues.push({ level, section, msg });
  const known = new Set((pkg.matchedKnowledge || []).map(m => m.id));
  const extraBanned = (rules && rules.banned) || [];
  const seen = new Map();
  for (const id of pkg.order) {
    const sec = pkg.sections[id], paras = (composed && composed[id]) || [], text = paras.map(p => p.text).join(' ');
    if (sec.status === 'insufficient') { if (text) add('FAIL', id, '근거 없는 Section 에 내용이 생성됨'); else if (sec.required) add('WARNING', id, '필수 Section 이 근거 부족으로 비어 있음'); continue; }
    if (!text.trim()) { add('FAIL', id, '빈 Section'); continue; }
    if (text.length < 60) add('WARNING', id, '지나치게 짧은 Section(' + text.length + '자)');
    if (BANNED_RE.test(text)) add('FAIL', id, '확정적·위험 표현: ' + (text.match(BANNED_RE) || [])[0]);
    if (EVENT_RE.test(text)) add('FAIL', id, '특정 연도 사건 확정 표현');
    for (const w of extraBanned) if (w && text.includes(w)) add('FAIL', id, '금지어: ' + w);
    const j = (text.match(JARGON_RE) || []).length; if (rules && rules.jargon === 'min' && j > 3) add('WARNING', id, '전문용어 과다(' + j + '회)');
    for (const p of paras) {
      if (!p.refs || !p.refs.length) add('WARNING', id, '근거(refs)가 없는 문단');
      else for (const r of p.refs) if (!known.has(r)) add('FAIL', id, '검색되지 않은 지식 인용: ' + r);
      const key = p.text.replace(/\s+/g, '').slice(0, 30); if (key.length >= 20) { if (seen.has(key)) add('WARNING', id, '다른 Section 과 같은 내용 반복(' + seen.get(key) + ')'); else seen.set(key, id); }
    }
    const nums = (text.match(/\d+(\.\d+)?/g) || []), base = JSON.stringify(pkg.facts) + JSON.stringify(pkg.sections[id]);
    for (const n of nums) if (!base.includes(n)) { add('WARNING', id, '패키지에 없는 숫자: ' + n); break; }
  }
  const status = issues.some(i => i.level === 'FAIL') ? 'FAIL' : issues.length ? 'WARNING' : 'PASS';
  return { status, issues };
}

// ───────────── 합성: 규칙 기반(AI 없이도 항상 동작) ─────────────
// 흐름: FACT → 해석 → 현실 번역 → 사례 → 리스크 → 행동. 각 문단에 refs(근거 지식 id)를 단다 → Trace.
export function composePlain(pkg, rules) {
  const rl = rules || DEFAULT_RULES, out = {}, nEx = rl.examples;
  const exLabel = { worker: '직장인이라면', business: '사업을 한다면', freelance: '프리랜서라면', love: '관계에서는' };
  for (const id of pkg.order) {
    const sec = pkg.sections[id]; if (sec.status !== 'ok') continue; const paras = [];
    sec.items.forEach(it => {
      const r = [it.id];
      if (it.interpretation) paras.push({ text: it.interpretation, refs: r, kind: 'interpretation' });
      if (it.behaviorPatterns.length) paras.push({ text: '현실에서는 ' + it.behaviorPatterns.slice(0, 3).join(' ') , refs: r, kind: 'reality' });
      const exs = Object.keys(exLabel).filter(k => it.realWorldExamples[k]).slice(0, nEx);
      exs.forEach(k => paras.push({ text: exLabel[k] + ' ' + it.realWorldExamples[k], refs: r, kind: 'example' }));
      if (rl.balance !== false && it.strengths.length) paras.push({ text: '강점: ' + it.strengths.slice(0, 3).join(' '), refs: r, kind: 'strength' });
      if (it.risks.length) paras.push({ text: '다만 ' + it.risks.slice(0, 3).join(' '), refs: r, kind: 'risk' });
      it.modifiers.filter(m => m.effect !== 'replace' && m.text).forEach(m => paras.push({ text: (m.effect === 'soften' ? '다만 이 경우에는 ' : m.effect === 'exception' ? '예외적으로 ' : '여기에 더해 ') + m.text, refs: r, kind: 'modifier:' + m.id }));
      if (rl.actions !== false && it.actions.length) paras.push({ text: '실천: ' + it.actions.slice(0, 3).join(' '), refs: r, kind: 'action' });
    });
    out[id] = paras;
  }
  return out;
}

// ───────────── 합성: AI Composer ─────────────
export function composerSystem(rules, domain) {
  const rl = rules || DEFAULT_RULES, ov = rl.domainOverrides && rl.domainOverrides[domain];
  return `너는 사주 풀이 "작성자"다. 입력으로 이미 계산되고 검수된 Interpretation Package(JSON)만 주어진다. 너의 일은 그 내용을 쉽고 풍부한 한국어로 옮겨 쓰는 것이다.
절대 규칙:
- Package 에 없는 사주 특징·점수·길흉·대운/세운·직업 적합도·사건을 만들지 마라. 숫자도 Package 에 있는 것만 쓴다.
- Section 의 status 가 "insufficient" 이면 그 Section 은 쓰지 말고 빈 배열로 둔다. 억지로 채우지 마라.
- 모든 문단은 근거가 된 knowledge id 를 refs 로 단다. Package 의 items[].id 만 쓸 수 있다.
- 사망·질병·사고·파산·범죄·임신·이혼·결혼·합격·투자수익을 확정하지 마라. "~할 수 있는 흐름", "~가능성이 상대적으로 커질 수 있다"처럼 경향으로 쓴다. "반드시·무조건·확정" 금지.
- 순서: 사실 → 해석 → 현실 번역 → 사례 → 리스크 → 행동.
- modifiers 의 effect 가 strengthen 이면 강화, soften 이면 완화, exception 이면 예외로 반영하고 replace 는 이미 interpretation 에 반영되어 있다.
- conflicts 가 해결되었으면 winner 쪽만 쓴다. 해결되지 않은 충돌은 단정하지 말고 양면을 조건부로 쓴다.
문체: ${TONE_KO[rl.tone]}. 설명 깊이: ${DEPTH_KO[rl.depth]}. 현실 사례는 Section 당 최대 ${rl.examples}개. 전문용어: ${JARGON_KO[rl.jargon]}(${rl.jargon === 'min' ? '비겁·식상·재성·관성·인성 같은 용어는 풀어서 쓴다' : '필요할 때 용어를 설명과 함께 쓴다'}). ${rl.balance !== false ? '장점과 리스크를 균형 있게 쓴다.' : ''} ${rl.actions !== false ? '행동 제안을 포함한다.' : '행동 제안은 쓰지 않는다.'}
${ov ? '이 분야의 추가 규칙: ' + ov : ''}
JSON 한 덩어리로만 답하라: {"sections":{"<sectionId>":[{"text":"문단","refs":["knowledgeId"]}]}}`;
}
export function composerUser(pkg) {
  const slim = { domain: pkg.domainName, facts: pkg.facts, conflicts: pkg.conflicts, sections: pkg.order.map(id => { const s = pkg.sections[id]; return { id, title: s.title, status: s.status, items: s.items }; }) };
  return '아래 Interpretation Package 만 근거로 풀이를 작성하라.\n' + JSON.stringify(slim);
}
// AI 응답 검증: 허용된 Section·id 만, 문단 길이·금지 표현 점검. 형식이 틀리면 null.
export function sanitizeComposed(text, pkg) {
  const a = String(text || '').indexOf('{'), z = String(text || '').lastIndexOf('}'); let d; try { d = JSON.parse(text.slice(a, z + 1)); } catch { return null; }
  if (!d || typeof d.sections !== 'object') return null;
  const out = {};
  for (const id of pkg.order) {
    if (pkg.sections[id].status !== 'ok') continue; const ids = new Set(pkg.sections[id].items.map(i => i.id)), arr = Array.isArray(d.sections[id]) ? d.sections[id] : [];
    const paras = arr.map(p => p && typeof p.text === 'string' ? { text: p.text.trim().slice(0, 1200), refs: (Array.isArray(p.refs) ? p.refs : []).filter(r => ids.has(r)), kind: 'ai' } : null).filter(p => p && p.text);
    if (paras.length) out[id] = paras;
  }
  return Object.keys(out).length ? out : null;
}

// 결정적 캐시 키 — 차트 + 지식/설계/규칙/합성기 버전 + 분석 연도
export function stable(o) { if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']'; if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'; return JSON.stringify(o); }
export async function cacheKey(parts) {
  const data = new TextEncoder().encode(stable(parts)), h = await crypto.subtle.digest('SHA-256', data);
  return 'ik:pkg:' + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
