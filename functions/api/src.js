// 풀이 자료(Source) 학습 API — 관리자 전용. 로직은 ../_src.js, 풀이 지식 저장은 ../_ikstore.js(풀이 지식 API 와 같은 저장소).
// 저장(GLOSSARY_KV): src:idx 자료 목록·정책·집계 | src:chunks:<id> 원문 청크 | src:cand:<id> 풀이 후보.  원본 파일: R2(CLIPS_R2) 'src/<id>' (없으면 추출된 텍스트만 보존)
// 흐름: add → (file) → analyze(청크 몇 개씩 반복 호출) → cands/cand → decide(approve · approveEdited · hold · discard · addEvidence · merge) → 풀이 지식 + 근거 자료.
// 승인 전에는 풀이 지식 DB 에 아무것도 쓰지 않는다. 후보는 production 검색에 쓰이지 않는다.
import { json, isAdmin, configError } from '../_lib.js';
import * as IK from '../_ik.js';
import * as S from '../_src.js';
import { MAX_PER_DOMAIN, dkey, loadDomain, loadAll, meta, bump, nextId, llm } from '../_ikstore.js';

const IDX = 'src:idx', ck = id => 'src:chunks:' + id, ak = id => 'src:cand:' + id, ID = /^d[a-z0-9]{3,24}$/, CID = /^[\w.-]{1,40}$/;
const STR = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const loadIdx = async kv => (await kv.get(IDX, 'json')) || [];
const saveIdx = (kv, idx) => kv.put(IDX, JSON.stringify(idx));
const loadChunks = async (kv, id) => (await kv.get(ck(id), 'json')) || [];
const loadCands = async (kv, id) => (await kv.get(ak(id), 'json')) || [];
const pubDoc = d => d; // 자료 목록 항목은 그대로 내려 줘도 되는 메타뿐이다(원문은 별도 키)
const MAX_UPLOAD = 40 * 1024 * 1024;

function refreshDoc(d, chunks, cands) { d.counts = S.recount(chunks, cands); d.status = S.docStatus(d.counts); d.updatedAt = new Date().toISOString(); return d; }
function cleanMeta(b) {
  return { author: STR(b.author, 60), publisher: STR(b.publisher, 60), publishedYear: Math.max(0, Math.min(2100, Math.round(+b.publishedYear) || 0)) || '', sourceMemo: STR(b.sourceMemo, 1000), theoryTags: (Array.isArray(b.theoryTags) ? b.theoryTags : []).filter(t => S.THEORY.includes(t)).slice(0, 10),
    sourceKind: Object.keys(S.KINDS).includes(b.sourceKind) ? b.sourceKind : 'book', grade: S.GRADES.includes(b.grade) ? b.grade : '미평가' };
}
const cleanPolicy = p => ({ production: !p || p.production !== false, extract: !p || p.extract !== false, reference: !p || p.reference !== false });

export async function onRequest({ request, env }) {
  const url = new URL(request.url), a = url.searchParams.get('a') || '', post = request.method === 'POST', kv = env.GLOSSARY_KV, id = url.searchParams.get('id') || '';
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (id && !ID.test(id)) return json({ error: '잘못된 자료 id' }, 400);

  // 원본 파일 업로드/내려받기(본문이 파일 원본이라 JSON 파싱 전에 처리)
  if (a === 'file' && post) {
    if (!env.CLIPS_R2) return json({ error: 'R2(CLIPS_R2)가 연결되어 있지 않아 원본 파일은 보관하지 못합니다(추출된 텍스트는 저장됩니다)' }, 501);
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404);
    const buf = await request.arrayBuffer(); if (buf.byteLength > MAX_UPLOAD) return json({ error: '파일이 너무 큽니다(40MB 이하)' }, 413);
    await env.CLIPS_R2.put('src/' + id, buf, { httpMetadata: { contentType: d.fileType === 'pdf' ? 'application/pdf' : 'text/plain; charset=utf-8' } }); d.hasFile = true; d.size = buf.byteLength; await saveIdx(kv, idx); return json({ ok: true });
  }
  if (a === 'file' && !post) {
    if (!env.CLIPS_R2) return json({ error: 'R2 없음' }, 501); const o = await env.CLIPS_R2.get('src/' + id); if (!o) return json({ error: '원본 파일이 없습니다' }, 404);
    return new Response(o.body, { headers: { 'content-type': (o.httpMetadata && o.httpMetadata.contentType) || 'application/octet-stream', 'cache-control': 'private, no-store' } });
  }
  let b = {}; if (post) { try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); } }

  /* ───── 조회 ───── */
  if (a === 'list' && !post) { const idx = await loadIdx(kv); return json({ docs: idx.map(pubDoc), stats: await stats(kv, idx) }); }
  if (a === 'doc' && !post) {
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404);
    const ch = await loadChunks(kv, id); return json({ doc: d, chunks: ch.map(c => ({ id: c.id, idx: c.idx, pageStart: c.pageStart, pageEnd: c.pageEnd, heading: c.heading, lineStart: c.lineStart, lineEnd: c.lineEnd, status: c.status, cands: c.cands, error: c.error, len: c.text.length })), impact: await impact(kv, id) });
  }
  if (a === 'chunk' && !post) { // 원문 보기
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404); const c = (await loadChunks(kv, id)).find(x => x.id === url.searchParams.get('c')); if (!c) return json({ error: '없는 구간' }, 404);
    return json({ doc: d, chunk: { ...c, label: S.locLabel(c) } });
  }
  if (a === 'cands' && !post) {
    const idx = await loadIdx(kv), ids = id ? [id] : idx.filter(d => d.counts && (d.counts.cands.new + d.counts.cands.held) > 0).slice(0, 30).map(d => d.id), out = [];
    for (const did of ids) { const d = idx.find(x => x.id === did); for (const c of await loadCands(kv, did)) out.push({ id: c.id, docId: did, docTitle: d ? d.title : '', status: c.status, title: c.suggested.title, domains: c.suggested.domains, subDomain: c.suggested.subDomain, conds: c.suggested.conditions, claim: c.sourceClaim.slice(0, 120), loc: c.location, confidence: c.extractionConfidence, compare: c.compare ? c.compare.status : 'new', conflict: !!(c.compare && c.compare.conflict), unsure: c.extractionConfidence === 'low' || c.unclearConditions || !c.claimVerified, validation: c.validation && c.validation.status, knowledgeId: c.knowledgeId || '' }); }
    return json({ cands: out });
  }
  if (a === 'cand' && !post) {
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404); const cands = await loadCands(kv, id), c = cands.find(x => x.id === url.searchParams.get('c')); if (!c) return json({ error: '없는 후보' }, 404);
    const chunk = (await loadChunks(kv, id)).find(x => x.id === c.chunkId), items = await loadAll(kv); if (c.status === 'new' || c.status === 'held') { c.compare = S.compareCandidate(c, items); c.validation = S.validateCandidate(c, { doc: d, chunk, items }); }
    return json({ cand: c, doc: d, chunk: chunk ? { ...chunk, label: S.locLabel(chunk) } : null });
  }
  if (a === 'search' && !post) { // 자료 원문 + 후보 + 승인된 풀이 지식을 한 번에
    const toks = STR(url.searchParams.get('q'), 100).toLowerCase().split(/\s+/).filter(Boolean); if (!toks.length) return json({ hits: [], cands: [], knowledge: [] });
    const idx = await loadIdx(kv), hits = [], cs = []; const all = await loadAll(kv);
    for (const d of idx.slice(0, 40)) {
      if (d.policy && d.policy.reference === false) continue;
      for (const c of await loadChunks(kv, d.id)) { const t = c.text.toLowerCase(); if (toks.every(k => t.includes(k) || (d.title + ' ' + c.heading).toLowerCase().includes(k))) { const i = Math.max(0, t.indexOf(toks[0]) - 40); hits.push({ docId: d.id, docTitle: d.title, chunkId: c.id, label: S.locLabel(c), snippet: c.text.slice(i, i + 160).replace(/\s+/g, ' ') }); } if (hits.length >= 40) break; }
      for (const c of await loadCands(kv, d.id)) { const t = (c.suggested.title + ' ' + c.sourceClaim + ' ' + c.suggested.interpretation).toLowerCase(); if (toks.every(k => t.includes(k))) cs.push({ docId: d.id, docTitle: d.title, id: c.id, title: c.suggested.title, status: c.status }); }
      if (hits.length >= 40) break;
    }
    const kn = all.filter(x => toks.every(k => (x.title + ' ' + x.interpretation + ' ' + x.principle).toLowerCase().includes(k))).slice(0, 20).map(x => ({ id: x.id, title: x.title, domain: x.domain, status: x.status, evidence: (x.evidence || []).length }));
    return json({ hits: hits.slice(0, 40), cands: cs.slice(0, 30), knowledge: kn });
  }
  if (a === 'itemdraft' && !post) { // "수정 후 승인": 후보를 풀이 지식 편집기에 채워 줄 초안(저장하지 않음)
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404); const c = (await loadCands(kv, id)).find(x => x.id === url.searchParams.get('c')); if (!c) return json({ error: '없는 후보' }, 404);
    const chunk = (await loadChunks(kv, id)).find(x => x.id === c.chunkId), all = await loadAll(kv); return json({ item: S.candidateToItem(c, d, chunk, nextId(all, c.suggested.domains[0] || 'SELF'), { publish: false }) });
  }
  if (a === 'impact' && !post) { const idx = await loadIdx(kv); if (!idx.find(x => x.id === id)) return json({ error: '없는 자료' }, 404); return json(await impact(kv, id)); }
  if (a === 'gaps' && !post) return json(await gaps(kv));

  /* ───── 자료 등록 ───── */
  if (a === 'add' && post) {
    const title = STR(b.title, 120); if (!title) return json({ error: '자료명을 입력하세요' }, 400);
    const fileType = S.FILE_TYPES.includes(b.fileType) ? b.fileType : 'text', pages = Array.isArray(b.pages) ? b.pages.slice(0, 3000).map(p => ({ page: +p.page, text: S.clean(p.text) })) : null;
    const text = pages ? pages.map(p => '[' + p.page + '쪽]\n' + p.text).join('\n\n') : S.clean(b.text);
    if (text.trim().length < 20) return json({ error: '텍스트를 추출하지 못했습니다(스캔 이미지 PDF 이거나 비어 있음). 텍스트가 있는 자료를 올려 주세요' }, 400);
    if (text.length > S.MAX_TEXT) return json({ error: '자료가 너무 깁니다(텍스트 3MB 이하). 나눠서 올려 주세요' }, 413);
    const hash = await S.sha256(pages ? JSON.stringify(pages.map(p => [p.page, p.text])) : text), idx = await loadIdx(kv), dup = idx.find(x => x.hash === hash);
    if (dup) return json({ error: '이미 등록된 자료입니다: ' + dup.title, duplicate: dup.id }, 409);
    const chunks = S.chunkSource({ text: pages ? null : text, pages, fileType }); if (!chunks.length) return json({ error: '분할할 내용이 없습니다' }, 400);
    const doc = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title, fileName: STR(b.fileName, 200), fileType, hash, size: text.length, ...cleanMeta(b), policy: cleanPolicy(b.policy), active: true, hasFile: false, pageCount: pages ? pages.length : 0, candSeq: 0, createdAt: new Date().toISOString(), updatedAt: '' };
    refreshDoc(doc, chunks, []); await kv.put(ck(doc.id), JSON.stringify(chunks)); idx.unshift(doc); await saveIdx(kv, idx); return json({ ok: true, doc });
  }
  if (a === 'update' && post) {
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404); const p = b.patch || {};
    if (p.title !== undefined) d.title = STR(p.title, 120) || d.title; Object.assign(d, cleanMeta({ ...d, ...p })); if (p.policy) d.policy = cleanPolicy({ ...d.policy, ...p.policy }); if (p.active !== undefined) d.active = !!p.active; d.updatedAt = new Date().toISOString();
    await saveIdx(kv, idx); await bump(kv, 'k'); return json({ ok: true, doc: d });
  }

  /* ───── AI 분석: 청크 몇 개씩 반복 호출 → 진행 상태·재시도 ───── */
  if (a === 'analyze' && post) {
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404);
    if (d.policy && d.policy.extract === false) return json({ error: '이 자료는 “AI 학습 후보 추출”이 꺼져 있습니다' }, 403);
    if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.GEMINI_API_KEY) return json({ error: 'AI 키가 설정되어 있지 않습니다(ANTHROPIC_API_KEY · OPENAI_API_KEY · GEMINI_API_KEY 중 하나)' }, 501);
    const chunks = await loadChunks(kv, id), cands = await loadCands(kv, id), items = await loadAll(kv), want = Math.max(1, Math.min(4, Math.round(+b.limit) || 2));
    if (b.retryFailed) chunks.forEach(c => { if (c.status === 'failed') { c.status = 'pending'; c.error = ''; } }); // 실패한 구간만 다시 대기로(이미 분석된 구간은 건드리지 않는다)
    const todo = chunks.filter(c => c.status === 'pending').slice(0, want); let added = 0, failed = 0, provider = '';
    for (const c of todo) {
      try {
        const r = await llm(env, S.extractSystem(), S.extractUser(d, c), 8000, 100000); provider = r.provider; const got = S.parseCandidates(r.text, c); if (!got) { const t = String(r.text || '').replace(/\s+/g, ' '); throw new Error('AI 답이 후보 형식이 아닙니다 (중단: ' + (r.stop || '?') + ', ' + t.length + '자) ' + t.slice(0, 60) + ' … ' + t.slice(-60)); }
        for (const x of got) { d.candSeq = (d.candSeq || 0) + 1; const cand = { id: 'k' + d.candSeq, chunkId: c.id, location: { pageStart: c.pageStart, pageEnd: c.pageEnd, heading: c.heading, lineStart: c.lineStart, lineEnd: c.lineEnd }, status: 'new', createdAt: new Date().toISOString(), ...x }; cand.compare = S.compareCandidate(cand, items); cand.validation = S.validateCandidate(cand, { doc: d, chunk: c, items }); cands.push(cand); added++; }
        c.status = 'done'; c.cands = got.length; c.error = '';
      } catch (e) { c.status = 'failed'; c.error = String(e.message || e).slice(0, 200); failed++; }
    }
    refreshDoc(d, chunks, cands); await Promise.all([kv.put(ck(id), JSON.stringify(chunks)), kv.put(ak(id), JSON.stringify(cands)), saveIdx(kv, idx)]);
    return json({ ok: true, processed: todo.length, added, failed, provider, counts: d.counts, status: d.status, finished: !chunks.some(c => c.status === 'pending'), impact: d.counts.done === d.counts.chunks ? await impactCoverage(kv, cands) : null });
  }

  /* ───── 후보 결정 ───── */
  if (a === 'decide' && post) { const r = await decide(kv, id, b.c, b); return json(r.body, r.status); }
  if (a === 'batch' && post) { // 일괄: 충돌·추출 불확실·조건 누락·검증 FAIL/원문 불일치·중복은 승인하지 않고 이유를 알려 준다
    const out = { done: 0, skipped: [] }; const act = b.action;
    if (!['approve', 'hold', 'discard'].includes(act)) return json({ error: '알 수 없는 작업' }, 400);
    for (const t of (Array.isArray(b.ids) ? b.ids : []).slice(0, 200)) {
      if (act === 'approve') { const guard = await batchGuard(kv, t.id, t.c); if (guard) { out.skipped.push({ id: t.id, c: t.c, why: guard }); continue; } }
      const r = await decide(kv, t.id, t.c, { action: act, publish: !!b.publish }); if (r.status === 200) out.done++; else out.skipped.push({ id: t.id, c: t.c, why: r.body.error });
    }
    return json({ ok: true, ...out });
  }

  /* ───── 자료 삭제: 연결된 풀이 지식을 지우지 않는다 ───── */
  if (a === 'delete' && post) {
    const idx = await loadIdx(kv), d = idx.find(x => x.id === id); if (!d) return json({ error: '없는 자료' }, 404); const im = await impact(kv, id), mode = b.mode;
    if (mode === 'deactivate') { d.active = false; }
    else if (mode === 'unlink') { d.policy = { ...d.policy, production: false }; }
    else if (mode === 'delete') {
      if (b.confirm !== d.title) return json({ error: '확인을 위해 자료명을 정확히 입력하세요', impact: im }, 400);
      await Promise.all([kv.put(ck(id), JSON.stringify([])), kv.put(ak(id), JSON.stringify([]))]); if (env.CLIPS_R2) { try { await env.CLIPS_R2.delete('src/' + id); } catch { /* 원본 파일이 없으면 무시 */ } }
      idx.splice(idx.indexOf(d), 1); await saveIdx(kv, idx); return json({ ok: true, deleted: true, impact: im, note: im.knowledge ? '연결된 풀이 지식 ' + im.knowledge + '개는 삭제하지 않았고, 근거 자료의 원본만 사라졌습니다' : '' });
    } else return json({ error: '삭제 방식을 고르세요' }, 400);
    d.updatedAt = new Date().toISOString(); await saveIdx(kv, idx); await bump(kv, 'k'); return json({ ok: true, doc: d, impact: im });
  }
  return json({ error: '알 수 없는 요청입니다' }, 404);
}

/* ═════ 집계 · 보조 ═════ */
async function impact(kv, id) { const items = (await loadAll(kv)).filter(x => (x.evidence || []).some(e => e.docId === id)); return { knowledge: items.length, published: items.filter(x => x.status === 'published').length, items: items.slice(0, 50).map(x => ({ id: x.id, title: x.title, domain: x.domain, status: x.status, onlyThis: x.evidence.every(e => e.docId === id) })) }; }
async function stats(kv, idx) {
  const items = await loadAll(kv), by = { need: 0, analyzed: 0, review: 0, done: 0 }; let queue = 0, conflict = 0, unsure = 0;
  for (const d of idx) { by[d.status] = (by[d.status] || 0) + 1; if (d.counts) { queue += d.counts.cands.new + d.counts.cands.held; conflict += d.counts.conflict; unsure += d.counts.unsure; } }
  const prod = items.filter(x => x.status === 'approved' || x.status === 'published');
  return { docs: idx.length, by, queue, conflict, unsure, knowledge: prod.length, twoEvidence: prod.filter(x => (x.evidence || []).length >= 2).length, noEvidence: prod.filter(x => !(x.evidence || []).length).length };
}
// 새 자료 후보가 메워 줄 수 있는 "지금 근거가 없는" 항목 — 실제 커버리지에서만 계산한다
async function impactCoverage(kv, cands) {
  const [items, design] = await Promise.all([loadAll(kv), kv.get('ik:design', 'json')]), cov = IK.coverageStats(items, design), byDomain = {}, fills = [];
  for (const c of cands.filter(x => x.status === 'new' || x.status === 'held')) { const d = c.suggested.domains[0]; if (!d) continue; byDomain[d] = (byDomain[d] || 0) + 1; }
  for (const d of Object.keys(cov)) for (const s of cov[d].sections) if (!s.published) { const n = cands.filter(x => (x.status === 'new' || x.status === 'held') && x.suggested.domains[0] === d && x.suggested.subDomain === s.id).length; if (n) fills.push({ domain: d, name: cov[d].name, section: s.id, title: s.title, candidates: n }); }
  return { byDomain: Object.entries(byDomain).map(([d, n]) => ({ domain: d, name: IK.DOMAINS[d], candidates: n })), fills };
}
async function gaps(kv) { // 풀이 구성에서 켜 둔 항목 중 공개된 풀이가 없는 것 + 관련 자료·후보 수
  const [items, design, idx] = await Promise.all([loadAll(kv), kv.get('ik:design', 'json'), loadIdx(kv)]), cov = IK.coverageStats(items, design), cands = [];
  for (const d of idx.slice(0, 30)) for (const c of await loadCands(kv, d.id)) if (c.status === 'new' || c.status === 'held') cands.push({ ...c, docId: d.id });
  const out = []; for (const d of Object.keys(cov)) for (const s of cov[d].sections) if (!s.published) { const rel = cands.filter(c => c.suggested.domains[0] === d && c.suggested.subDomain === s.id); out.push({ domain: d, name: cov[d].name, section: s.id, title: s.title, required: s.required, pending: s.pending, candidates: rel.length, docs: [...new Set(rel.map(c => c.docId))].length }); }
  return { gaps: out, coverage: Object.fromEntries(Object.entries(cov).map(([k, v]) => [k, { name: v.name, pct: v.pct, label: v.label }])) };
}
async function batchGuard(kv, docId, cid) {
  const idx = await loadIdx(kv), d = idx.find(x => x.id === docId); if (!d) return '없는 자료'; const c = (await loadCands(kv, docId)).find(x => x.id === cid); if (!c) return '없는 후보';
  const chunk = (await loadChunks(kv, docId)).find(x => x.id === c.chunkId), items = await loadAll(kv); c.compare = S.compareCandidate(c, items); const v = S.validateCandidate(c, { doc: d, chunk, items });
  if (v.status === 'FAIL') return '검증 실패: ' + v.checks.filter(x => x.level === 'FAIL').map(x => x.label).join(', ');
  if (c.compare.conflict) return '기존 풀이와 해석 차이(충돌)가 있어 개별 검수가 필요합니다'; if (c.compare.status === 'identical' || c.compare.status === 'similar') return '기존 풀이와 중복·유사 — 근거 추가·병합을 고르세요';
  if (c.extractionConfidence === 'low') return '추출 확실도가 낮습니다'; if (c.unclearConditions) return '조건이 불명확합니다'; if (!c.claimVerified) return '원문 인용이 확인되지 않습니다'; if (!Object.keys(c.suggested.conditions).length) return '중요한 조건이 누락되었습니다'; return '';
}

async function decide(kv, docId, cid, b) {
  const idx = await loadIdx(kv), d = idx.find(x => x.id === docId); if (!d) return { status: 404, body: { error: '없는 자료' } };
  const chunks = await loadChunks(kv, docId), cands = await loadCands(kv, docId), c = cands.find(x => x.id === cid); if (!c) return { status: 404, body: { error: '없는 후보' } };
  const chunk = chunks.find(x => x.id === c.chunkId), act = b.action, now = new Date().toISOString(); let item = null;
  const done = async (extra) => { Object.assign(c, { decidedAt: now }, extra); refreshDoc(d, chunks, cands); await Promise.all([kv.put(ak(docId), JSON.stringify(cands)), saveIdx(kv, idx)]); return { status: 200, body: { ok: true, cand: c, item, counts: d.counts, status: d.status } }; };
  if (act === 'hold') return done({ status: 'held' });
  if (act === 'discard') return done({ status: 'discarded' });
  if (!['approve', 'approveEdited', 'addEvidence', 'merge'].includes(act)) return { status: 400, body: { error: '알 수 없는 작업' } };
  if (c.status === 'approved' || c.status === 'merged' || c.status === 'discarded') return { status: 409, body: { error: '이미 처리된 후보입니다' } };
  const all = await loadAll(kv); c.compare = S.compareCandidate(c, all);
  if (act === 'addEvidence' || act === 'merge') { // 같은 해석이 다른 자료에도 있을 때: 풀이 지식을 새로 만들지 않고 근거만 더한다(병합은 비어 있는 칸만 채우고 기존 문장은 덮어쓰지 않음)
    const tgt = all.find(x => x.id === b.knowledgeId); if (!tgt) return { status: 404, body: { error: '연결할 풀이 지식을 찾을 수 없습니다' } };
    const ev = S.evidenceOf(c, d, chunk), next = IK.cleanItem({ ...tgt, evidence: [...(tgt.evidence || []), ev] }, tgt);
    if (act === 'merge') { const s = c.suggested, add = (a1, a2) => [...a1, ...a2.filter(x => !a1.includes(x))].slice(0, 12); next.principle = tgt.principle || s.principle; next.interpretation = tgt.interpretation || s.interpretation; next.strengths = add(tgt.strengths, s.strengths); next.risks = add(tgt.risks, s.risks); next.behaviorPatterns = add(tgt.behaviorPatterns, s.behaviorPatterns); next.actions = add(tgt.actions, s.actions); next.theory = [...new Set([...(tgt.theory || []), ...(s.theoryTags || [])])].slice(0, 10); }
    next.version = tgt.version + 1; next.status = tgt.status; next.reviewed = tgt.reviewed; next.reviewedAt = tgt.reviewedAt; next.createdAt = tgt.createdAt;
    const list = (await loadDomain(kv, tgt.domain)).filter(x => x.id !== tgt.id); list.push(next); await kv.put(dkey(tgt.domain), JSON.stringify(list));
    const h = (await kv.get('ik:hist:' + tgt.id, 'json')) || []; h.unshift({ at: now, version: tgt.version, item: tgt, by: 'source:' + act }); await kv.put('ik:hist:' + tgt.id, JSON.stringify(h.slice(0, 20))); await bump(kv, 'k'); item = next;
    return done({ status: 'merged', knowledgeId: tgt.id, mergeMode: act });
  }
  const v = S.validateCandidate(c, { doc: d, chunk, items: all }); c.validation = v;
  if (act === 'approveEdited') { // 관리자가 풀이 지식 편집기에서 고쳐 저장한 항목을 이 후보의 결과로 인정한다
    const it = all.find(x => x.id === b.knowledgeId); if (!it || !(it.evidence || []).some(e => e.docId === docId)) return { status: 400, body: { error: '수정한 풀이 지식을 찾을 수 없거나 이 자료의 근거가 연결되어 있지 않습니다' } };
    if (!it.interpretation || !it.reviewed) return { status: 400, body: { error: '핵심 해석과 검수 완료 표시가 필요합니다' } }; item = it; return done({ status: 'approved', knowledgeId: it.id, edited: true });
  }
  if (v.status === 'FAIL') return { status: 400, body: { error: '검증을 통과하지 못했습니다: ' + v.checks.filter(x => x.level === 'FAIL').map(x => x.label + ' — ' + x.msg).join(' / '), validation: v } };
  if (c.compare.status === 'identical' && !b.force) return { status: 409, body: { error: '기존 풀이와 거의 같습니다. 새로 만들지 말고 “근거 추가”나 “병합”을 쓰세요(그래도 새로 만들려면 확인 필요)', duplicate: true, matches: c.compare.matches } };
  if (c.compare.conflict && !b.force) return { status: 409, body: { error: '기존 풀이와 해석 차이(충돌)가 있습니다. 비교를 확인하고 결정하세요', conflict: true, conflicts: c.compare.conflicts } };
  const publish = !!b.publish && d.active !== false && !(d.policy && d.policy.production === false), nid = nextId(all, c.suggested.domains[0]);
  item = IK.cleanItem(S.candidateToItem(c, d, chunk, nid, { publish }), null); if (!item) return { status: 400, body: { error: '풀이 지식 형식이 올바르지 않습니다' } };
  item.version = 1; const list = await loadDomain(kv, item.domain); if (list.length >= MAX_PER_DOMAIN) return { status: 413, body: { error: '분야당 최대 ' + MAX_PER_DOMAIN + '개입니다' } };
  list.push(item); await kv.put(dkey(item.domain), JSON.stringify(list)); await bump(kv, 'k');
  return done({ status: 'approved', knowledgeId: item.id, publishedNow: item.status === 'published', note: b.publish && !publish ? '이 자료는 Production 사용이 꺼져 있어 비공개로 등록했습니다' : '' });
}
