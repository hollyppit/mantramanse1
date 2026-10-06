// 풀이 자료(Source) 학습 — 순수 로직(외부 import 는 _ik.js 뿐 → Node 테스트 가능). 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 흐름: 자료 등록 → 원문 보존 → 구조 단위 분할(chunk) → AI 후보 추출 → 기존 풀이 지식과 중복·충돌 검사 → 검증 → 관리자 승인 → 풀이 지식 + 근거 자료(SourceEvidence).
// AI 는 "이 이론이 참인가"를 판정하지 않는다. 원문의 주장·조건·해석을 구조화할 뿐이며, 원문(sourceClaim)과 AI 정리(suggested)는 따로 저장한다.
import { DOMAINS, COND_FIELDS, cleanConds, cleanModifier, BANNED_RE, STANCES, isProduction } from './_ik.js';

export const THEORY = ['억부', '조후', '격국', '십성', '일주론', '신살', '궁성론', '대운', '세운', '기타'];
export const GRADES = ['A', 'B', 'C', '미평가'];
export const KINDS = { book: '서적', expert: '전문가 자료', internal: '내부 정리', research: '연구·논문' };
export const FILE_TYPES = ['pdf', 'md', 'txt', 'text'];
export const MAX_TEXT = 3 * 1024 * 1024, MAX_CHUNKS = 1500, CHUNK_CHARS = 3200, MIN_CHUNK = 200;
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const strs = (v, n = 12, len = 300) => (Array.isArray(v) ? v.slice(0, n).map(x => str(x, len)).filter(Boolean) : []);

// ───────────── 글 정리 · 비교 도우미 ─────────────
export const clean = s => String(s == null ? '' : s).replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[​-‍﻿]/g, '');
// 따옴표·공백·문장부호 차이를 무시하고 비교하기 위한 형태(한글·한자·영문·숫자만 남김)
export const fold = s => clean(s).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
export function dice(a, b) { // 문자 bigram Dice 계수 0~1
  a = fold(a); b = fold(b); if (a.length < 2 || b.length < 2) return a && a === b ? 1 : 0;
  const m = new Map(); for (let i = 0; i < a.length - 1; i++) { const g = a.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); }
  let hit = 0; for (let i = 0; i < b.length - 1; i++) { const g = b.slice(i, i + 2), c = m.get(g); if (c) { hit++; m.set(g, c - 1); } }
  return 2 * hit / (a.length + b.length - 2);
}
export async function sha256(text) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }

// ───────────── 분할(Chunking): 문서 구조 우선, 글자 수는 상한일 뿐 ─────────────
// pages: [{ page, text }] (PDF) — 연속 쪽을 상한까지 묶고, 한 쪽이 너무 길면 문단으로 나눈다. text: MD/TXT — 제목(#)·번호 제목 단위로 묶고 줄 번호를 보존한다.
const MD_HEAD = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const TXT_HEAD = /^(제\s?\d+\s?[장절편부]|[0-9]{1,2}[.)]\s+\S|[一二三四五六七八九十]{1,3}[.、]\s*\S|[IVX]{1,5}[.)]\s+\S|【.+】|\[.+\])/;
function splitParas(lines, base) { // lines: [{n, t}] → 문단(빈 줄 기준) [{ ls, le, text }]
  const out = []; let cur = []; const flush = () => { if (cur.length) { out.push({ ls: cur[0].n, le: cur[cur.length - 1].n, text: cur.map(x => x.t).join('\n') }); cur = []; } };
  for (const l of lines) { if (!l.t.trim()) flush(); else cur.push(l); } flush(); void base; return out;
}
export function chunkSource({ text, pages, fileType }) {
  const chunks = []; const push = c => { c.text = c.text.trim(); if (c.text) chunks.push(c); };
  const packParas = (paras, mk) => { // 문단들을 상한까지 묶는다
    let buf = [], len = 0; const flush = () => { if (buf.length) { push(mk(buf)); buf = []; len = 0; } };
    for (const p of paras) {
      if (p.text.length > CHUNK_CHARS) { flush(); for (let i = 0; i < p.text.length; i += CHUNK_CHARS) push(mk([{ ...p, text: p.text.slice(i, i + CHUNK_CHARS) }])); continue; }
      if (len + p.text.length > CHUNK_CHARS) flush(); buf.push(p); len += p.text.length + 2;
    } flush();
  };
  if (Array.isArray(pages)) {
    let buf = [], len = 0; const flush = () => { if (!buf.length) return; const first = buf[0].text.split('\n').map(x => x.trim()).filter(Boolean)[0] || ''; push({ pageStart: buf[0].page, pageEnd: buf[buf.length - 1].page, heading: first.length <= 60 ? first : '', lineStart: 0, lineEnd: 0, text: buf.map(x => (buf.length > 1 ? '[' + x.page + '쪽]\n' : '') + x.text).join('\n\n') }); buf = []; len = 0; };
    for (const p of pages) {
      const t = clean(p.text).trim(); if (!t) continue; const pg = Math.max(1, Math.round(+p.page) || 1);
      if (t.length > CHUNK_CHARS) { flush(); const paras = splitParas(t.split('\n').map((x, i) => ({ n: i + 1, t: x }))); packParas(paras, g => ({ pageStart: pg, pageEnd: pg, heading: '', lineStart: g[0].ls, lineEnd: g[g.length - 1].le, text: g.map(x => x.text).join('\n\n') })); continue; }
      if (len + t.length > CHUNK_CHARS) flush(); buf.push({ page: pg, text: t }); len += t.length;
    } flush();
  } else {
    const lines = clean(text).split('\n').map((t, i) => ({ n: i + 1, t })), md = fileType === 'md';
    // 제목 단위 구간
    const secs = []; let cur = { heading: '', path: [], lines: [] }, path = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], m = md ? MD_HEAD.exec(l.t) : null; let head = '', lvl = 0;
      if (m) { head = m[2].trim(); lvl = m[1].length; }
      else if (!md && l.t.trim() && l.t.trim().length <= 40 && TXT_HEAD.test(l.t.trim()) && (!lines[i + 1] || !lines[i + 1].t.trim() || true)) { head = l.t.trim(); lvl = 1; }
      if (head) { if (cur.lines.length) secs.push(cur); path = path.slice(0, lvl - 1); path[lvl - 1] = head; cur = { heading: path.filter(Boolean).join(' > '), lines: [l] }; } else cur.lines.push(l);
    }
    if (cur.lines.length) secs.push(cur);
    // 작은 구간은 이웃과 합치되, 합친 청크의 제목은 첫 구간 제목
    let acc = null; const flushAcc = () => { if (!acc) return; const paras = splitParas(acc.lines); packParas(paras, g => ({ pageStart: 0, pageEnd: 0, heading: acc.heading, lineStart: g[0].ls, lineEnd: g[g.length - 1].le, text: g.map(x => x.text).join('\n\n') })); acc = null; };
    for (const sc of secs) { const len = sc.lines.reduce((a, l) => a + l.t.length + 1, 0); if (acc && acc.len + len <= CHUNK_CHARS && (acc.len < MIN_CHUNK || len < MIN_CHUNK)) { acc.lines = acc.lines.concat(sc.lines); acc.len += len; } else { flushAcc(); acc = { heading: sc.heading, lines: sc.lines.slice(), len }; } }
    flushAcc();
  }
  return chunks.slice(0, MAX_CHUNKS).map((c, i) => ({ id: 'c' + (i + 1), idx: i + 1, status: 'pending', cands: 0, error: '', ...c }));
}
export const locLabel = c => (c.pageStart ? (c.pageEnd && c.pageEnd !== c.pageStart ? c.pageStart + '~' + c.pageEnd + '쪽' : c.pageStart + '쪽') : (c.lineStart ? c.lineStart + '~' + c.lineEnd + '줄' : '')) + (c.heading ? (c.pageStart || c.lineStart ? ' · ' : '') + c.heading : '');

// ───────────── AI 후보 추출 ─────────────
export function extractSystem() {
  return `너는 명리학 자료를 "풀이 지식 후보"로 구조화하는 편집 보조자다. 이 명리 이론이 참인지 판정하지 않는다. 원문이 무엇을 말하는지 정확히 옮기는 것이 전부다.
원칙(반드시 지킨다):
1. 원문에 없는 명리 이론·조건·결과를 추가하지 마라.
2. 원문의 주장을 현대 명리학 일반론으로 고쳐 쓰지 마라. 학파가 다르다고 보이면 통합하지 말고 ambiguity 에 적어라.
3. 조건이 불분명하면 추측하지 마라. conditions 를 비우고 unclearConditions 를 true 로 하고 ambiguity 에 "조건 불명확"을 적어라.
4. sourceClaim 은 원문에서 그대로 옮긴 문장(80~400자)이다. 요약·번역하지 말고 글자 그대로 복사하라(원문에 없는 문장은 금지).
5. interpretation·behaviorPatterns·strengths·risks·actions·realWorldExamples 는 "AI 정리"다. 사용자 친화적 현실 언어로 쓰되 원문이 말한 범위를 넘지 마라. 현실 사례는 원문의 주장이 아니라 AI 설명이다.
6. 사망·중병·사고·범죄·파산·임신·이혼·결혼·합격·투자수익을 확정하는 표현은 AI 정리에 쓰지 마라(경향·가능성으로 바꿔 쓰고, 원문이 단정했다면 ambiguity 에 "원문이 단정적 표현을 씀"을 적어라).
7. 독립적으로 쓸 수 있는 해석 단위만 후보로 뽑아라(한 번에 최대 4개, 가장 뚜렷한 것부터). 모든 필드는 간결하게 쓴다: principle·interpretation 은 각 200자 안팎, 배열 항목은 짧은 한 문장, realWorldExamples 는 해당 없으면 빈 문자열. 해석 단위가 없는 글(머리말·목차·일반 서술)은 빈 배열을 돌려라.
conditions 는 아래 형식만 쓴다(그 밖의 키는 버려진다):
  dayMaster:["경"] (갑을병정무기경신임계) · strength:["신강"|"신약"|"중화"] · hasRoot:["있음"|"없음"] · monthBranch:["자"…"해"] · season:["봄"|"여름"|"가을"|"겨울"] · yongEl:["목"|"화"|"토"|"금"|"수"] · pattern:["격국·구조 이름"] · star:["신살 이름"] · relation:["합"|"충"|"형"|"파"|"해"…]
  el:{"목":"weak|mid|strong"} (목화토금수) · group:{"관성":"strong"} (비겁 식상 재성 관성 인성) · tenGod:{"편관":"strong"} · daewoonSeason/seunSeason/monthSeason:["기회기"|"확장기"|"수확기"|"축적기"|"전환기"|"방어기"]
domains 는 SELF MONEY CAREER LOVE MARRIAGE RELATIONSHIP TIMING ACTION 중 해당하는 것(첫 번째가 주 분야). stance: positive(유리) / caution(주의) / neutral. extractionConfidence: HIGH|MID|LOW — "원문 의미를 정확히 구조화했는가"에 대한 네 판단이며 이론의 진위가 아니다. theoryTags 는 억부 조후 격국 십성 일주론 신살 궁성론 대운 세운 기타 중에서.
modifiers: 원문에 "이런 경우 강해진다/완화된다/예외"가 있을 때만 [{"when":{조건},"effect":"strengthen|soften|replace|exception","text":"..."}]. exclusions: 원문에 "이 경우는 해당하지 않는다"가 있을 때만.
JSON 한 덩어리로만 답하라: {"candidates":[{"sourceClaim":"","title":"","domains":[],"subDomain":"","stance":"","conditions":{},"unclearConditions":false,"principle":"","interpretation":"","behaviorPatterns":[],"strengths":[],"risks":[],"actions":[],"realWorldExamples":{"worker":"","business":"","freelance":"","love":""},"modifiers":[],"exclusions":{},"theoryTags":[],"extractionConfidence":"","ambiguity":[]}]}`;
}
export function extractUser(doc, chunk) {
  return `자료: ${doc.title}${doc.author ? ' / ' + doc.author : ''}${doc.theoryTags && doc.theoryTags.length ? ' / 해석 체계: ' + doc.theoryTags.join(', ') : ''}\n위치: ${locLabel(chunk) || '구간 ' + chunk.idx}\n아래 [원문] 에서 풀이 지식 후보를 뽑아라.\n[원문]\n${chunk.text}\n[원문 끝]`;
}
const CONF = { HIGH: 'high', MID: 'mid', LOW: 'low' };
// AI 답 → 후보 배열. 원문 인용이 실제로 청크 안에 있는지(claimVerified) 확인한다. 형식이 틀리면 null.
export function parseCandidates(text, chunk) {
  const a = String(text || '').indexOf('{'), z = String(text || '').lastIndexOf('}'); let d; try { d = JSON.parse(text.slice(a, z + 1)); } catch { return null; }
  if (!d || !Array.isArray(d.candidates)) return null; const hay = fold(chunk.text), out = [];
  for (const x of d.candidates.slice(0, 8)) {
    if (!x || typeof x !== 'object') continue; const claim = str(x.sourceClaim, 600); if (claim.length < 8) continue;
    const domains = (Array.isArray(x.domains) ? x.domains : []).filter(k => DOMAINS[k]).filter((k, i, a2) => a2.indexOf(k) === i).slice(0, 4);
    const rawKeys = x.conditions && typeof x.conditions === 'object' ? Object.keys(x.conditions) : [], conds = cleanConds(x.conditions), dropped = rawKeys.filter(k => !conds[k]);
    const mods = (Array.isArray(x.modifiers) ? x.modifiers.slice(0, 10) : []).map(cleanModifier).filter(Boolean), ex = x.realWorldExamples && typeof x.realWorldExamples === 'object' ? x.realWorldExamples : {};
    out.push({
      sourceClaim: claim, claimVerified: fold(claim).length >= 6 && hay.includes(fold(claim)),
      suggested: { title: str(x.title, 120), domains, subDomain: str(x.subDomain, 40), stance: STANCES.includes(x.stance) ? x.stance : 'neutral', conditions: conds, exclusions: cleanConds(x.exclusions), modifiers: mods,
        principle: str(x.principle, 2000), interpretation: str(x.interpretation, 2000), behaviorPatterns: strs(x.behaviorPatterns), strengths: strs(x.strengths), risks: strs(x.risks), actions: strs(x.actions),
        realWorldExamples: { worker: str(ex.worker, 600), business: str(ex.business, 600), freelance: str(ex.freelance, 600), love: str(ex.love, 600) }, theoryTags: strs(x.theoryTags, 10, 20).filter(t => THEORY.includes(t)) },
      extractionConfidence: CONF[String(x.extractionConfidence).toUpperCase()] || 'low', ambiguity: strs(x.ambiguity, 8, 200), unclearConditions: x.unclearConditions === true || (!Object.keys(conds).length && rawKeys.length > 0), dropped,
    });
  }
  return out;
}

// ───────────── 기존 풀이 지식과 비교: 중복 · 유사 · 보강 · 충돌 ─────────────
function tokens(c) { const t = new Set(); for (const k of Object.keys(c || {})) { const v = c[k]; if (Array.isArray(v)) v.forEach(x => t.add(k + ':' + x)); else if (v && typeof v === 'object') Object.keys(v).forEach(kk => t.add(k + '.' + kk + ':' + v[kk])); } return t; }
const jacc = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; a.forEach(x => { if (b.has(x)) i++; }); return i / (a.size + b.size - i); };
const superset = (a, b) => { if (!b.size || a.size <= b.size) return false; let ok = true; b.forEach(x => { if (!a.has(x)) ok = false; }); return ok; };
// cand: { suggested }  items: 기존 풀이 지식 배열(전체). 같은 주 분야만 본다.
export function compareCandidate(cand, items) {
  const s = cand.suggested, dom = s.domains[0], ct = tokens(s.conditions), text = s.interpretation + ' ' + s.principle, rows = [];
  for (const it of items) {
    if (it.status === 'archived' || it.domain !== dom) continue; const it_t = tokens(it.conditions), jac = jacc(ct, it_t), dc = dice(text, it.interpretation + ' ' + it.principle), score = 0.6 * jac + 0.4 * dc;
    let kind = ''; if (jac >= 0.99 && dc >= 0.4) kind = 'identical'; else if (score >= 0.5) kind = 'similar'; else if ((superset(ct, it_t) || superset(it_t, ct)) && dc >= 0.25) kind = 'reinforce';
    const opposite = s.stance !== 'neutral' && it.stance !== 'neutral' && s.stance !== it.stance && jac >= 0.6;
    if (kind || opposite) rows.push({ id: it.id, title: it.title, status: it.status, stance: it.stance, score: Math.round(score * 100) / 100, jac: Math.round(jac * 100) / 100, dice: Math.round(dc * 100) / 100, kind, conflict: opposite, published: isProduction(it) });
  }
  rows.sort((a, b) => b.score - a.score);
  const order = ['identical', 'similar', 'reinforce'], status = order.find(k => rows.some(r => r.kind === k)) || 'new';
  return { status, matches: rows.slice(0, 5), conflicts: rows.filter(r => r.conflict).slice(0, 5), conflict: rows.some(r => r.conflict) };
}
export const COMPARE_KO = { new: '새로운 풀이', similar: '유사 풀이 있음', identical: '거의 동일', reinforce: '기존 풀이 보강 가능' };

// ───────────── 승인 전 검증: PASS / WARNING / FAIL ─────────────
const TERMS = [['비겁', '比劫', '比肩', '劫財'], ['식상', '食傷', '食神', '傷官'], ['재성', '財星', '偏財', '正財'], ['관성', '官星', '官殺', '官杀', '偏官', '正官', '七殺'], ['인성', '印星', '印綬', '偏印', '正印'], ['신강', '身強', '身旺', '身强'], ['신약', '身弱'], ['용신', '用神'], ['통근', '通根'], ['조후', '調候'], ['격국', '格局'], ['천을귀인', '天乙貴人'], ['도화살', '桃花'], ['역마살', '驛馬'], ['화개살', '華蓋']];
export function unsupportedTerms(textOut, chunkText) {
  const src = clean(chunkText), out = []; for (const t of TERMS) { if (!t.some(x => textOut.includes(x))) continue; if (!t.some(x => src.includes(x))) out.push(t[0]); } return out;
}
// cand: 후보 (suggested 를 수정한 뒤 다시 검증해도 된다)  ctx: { doc, chunk, items }
export function validateCandidate(cand, ctx) {
  const s = cand.suggested, checks = [], add = (key, label, level, msg) => checks.push({ key, label, level, msg });
  add('domain', '적용 분야', s.domains.length ? 'PASS' : 'FAIL', s.domains.length ? s.domains.map(d => DOMAINS[d]).join('·') : '분야가 없습니다');
  add('meaning', '핵심 해석', s.interpretation.trim().length >= 10 ? 'PASS' : 'FAIL', s.interpretation.trim().length >= 10 ? '있음' : '핵심 해석이 비어 있습니다');
  add('source', '출처 · 원문 위치', ctx.doc && ctx.chunk ? 'PASS' : 'FAIL', ctx.doc && ctx.chunk ? (ctx.doc.title + ' ' + locLabel(ctx.chunk)).trim() : '출처를 찾을 수 없습니다');
  add('claim', '원문 인용', !cand.sourceClaim ? 'FAIL' : cand.claimVerified ? 'PASS' : 'WARNING', !cand.sourceClaim ? '원문 인용이 없습니다' : cand.claimVerified ? '원문에서 확인됨' : '원문 인용이 자료에서 그대로 확인되지 않습니다 — 원문을 열어 대조하세요');
  const nc = Object.keys(s.conditions).length;
  add('cond', '적용 조건', cand.unclearConditions ? 'WARNING' : cand.dropped.length ? 'WARNING' : 'PASS', cand.unclearConditions ? '조건이 불명확합니다(조건 없이 등록하면 모든 사주에 쓰이는 일반 풀이가 됩니다)' : cand.dropped.length ? '지원되지 않는 조건을 뺐습니다: ' + cand.dropped.join(', ') : nc ? nc + '개 조건' : '조건 없음(일반 풀이)');
  const user = [s.interpretation, s.principle, ...s.strengths, ...s.risks, ...s.behaviorPatterns, ...s.actions, ...Object.values(s.realWorldExamples), ...s.modifiers.map(m => m.text)].join('\n');
  add('safe', '확정적 표현', BANNED_RE.test(user) ? 'WARNING' : 'PASS', BANNED_RE.test(user) ? '확정 표현이 들어 있습니다(자료 등록은 가능하지만 공개 전에 경향·가능성 표현으로 고쳐야 합니다): ' + (user.match(BANNED_RE) || [])[0] : '없음');
  const un = ctx.chunk ? unsupportedTerms(user, ctx.chunk.text) : []; add('extra', '원문에 없는 내용', un.length ? 'WARNING' : 'PASS', un.length ? 'AI 정리에 있으나 원문에는 없는 명리 용어: ' + un.join(', ') : '확인되지 않음');
  if (cand.compare) { const c = cand.compare; add('dup', '기존 풀이와 중복', c.status === 'identical' ? 'WARNING' : c.status === 'similar' ? 'WARNING' : 'PASS', c.status === 'new' ? '새로운 풀이' : COMPARE_KO[c.status] + ' ' + c.matches.filter(m => m.kind).length + '건'); add('conflict', '기존 풀이와 해석 차이', c.conflict ? 'WARNING' : 'PASS', c.conflict ? '반대 방향의 기존 풀이 ' + c.conflicts.length + '건' : '없음'); }
  const status = checks.some(c => c.level === 'FAIL') ? 'FAIL' : checks.some(c => c.level === 'WARNING') ? 'WARNING' : 'PASS';
  return { status, checks };
}

// 후보 → 풀이 지식 입력(cleanItem 에 넘길 값). 승인할 때만 만든다.
export function candidateToItem(cand, doc, chunk, id, opts) {
  const s = cand.suggested, ev = { docId: doc.id, title: doc.title, chunkId: chunk.id, pageStart: chunk.pageStart || 0, pageEnd: chunk.pageEnd || 0, heading: chunk.heading || '', quote: cand.sourceClaim, addedAt: new Date().toISOString() };
  return { id, title: s.title || (doc.title + ' ' + locLabel(chunk)).slice(0, 100), domain: s.domains[0], subDomain: s.subDomain, stance: s.stance, priority: 10, conditions: s.conditions, exclusions: s.exclusions, modifiers: s.modifiers, principle: s.principle, interpretation: s.interpretation,
    strengths: s.strengths, risks: s.risks, behaviorPatterns: s.behaviorPatterns, actions: s.actions, realWorldExamples: s.realWorldExamples, sourceType: Object.keys(KINDS).includes(doc.sourceKind) ? doc.sourceKind : 'book', sourceReference: (doc.title + ' ' + locLabel(chunk)).trim().slice(0, 200),
    sourceMemo: '풀이 자료 AI 분석 후 관리자 승인' + (cand.ambiguity.length ? ' · 확인 사항: ' + cand.ambiguity.join(' / ') : ''), confidence: cand.extractionConfidence, reviewed: true, status: opts && opts.publish ? 'published' : 'approved', tags: [...s.domains.slice(1).map(d => 'also:' + d), 'source'], theory: [...new Set([...(s.theoryTags || []), ...(doc.theoryTags || [])])].slice(0, 10), evidence: [ev] };
}
export const evidenceOf = (cand, doc, chunk) => candidateToItem(cand, doc, chunk, 'x', {}).evidence[0];

// ───────────── 문서 집계 ─────────────
export function recount(chunks, cands) {
  const c = { chunks: chunks.length, done: chunks.filter(x => x.status === 'done').length, failed: chunks.filter(x => x.status === 'failed').length, pending: chunks.filter(x => x.status === 'pending').length, cands: { new: 0, held: 0, approved: 0, discarded: 0, merged: 0 }, conflict: 0, similar: 0, unsure: 0 };
  for (const x of cands) { c.cands[x.status] = (c.cands[x.status] || 0) + 1; if (x.status === 'new' || x.status === 'held') { if (x.compare && x.compare.conflict) c.conflict++; if (x.compare && (x.compare.status === 'similar' || x.compare.status === 'identical' || x.compare.status === 'reinforce')) c.similar++; if (x.extractionConfidence === 'low' || x.unclearConditions || !x.claimVerified) c.unsure++; } }
  return c;
}
// 화면 필터용 상태: 분석 필요 / 분석 완료 / 검수 중 / 완료
export function docStatus(c) {
  const total = Object.values(c.cands).reduce((a, b) => a + b, 0), decided = c.cands.approved + c.cands.discarded + c.cands.merged;
  if (c.done < c.chunks) return 'need';
  if (c.cands.new + c.cands.held === 0) return 'done';
  return decided > 0 || c.cands.held > 0 ? 'review' : (total ? 'analyzed' : 'done');
}
export const STATUS_KO = { need: '분석 필요', analyzed: '분석 완료', review: '검수 중', done: '완료' };
