// Additive research sidecar. Never writes ik:d:*, src:* or approval/publication fields.
import { loadAll } from './_ikstore.js';
import { isProduction, cleanConds, sectionMap } from './_ik.js';
import { researchView } from './_rag-view.js';

export const PREFIX = 'ik:agentic:';
export const FLAGS = { evidence: '근거 부족', source: '출처 불명확', conditions: '적용 조건 부족', conflict: '해석 충돌 후보', duplicate: '중복 후보', chapter: '챕터 미연결', usage: '실제 풀이에서 미사용', usageUnknown: '사용 이력 미측정' };
const canonical = v => JSON.stringify(sort(v));
function sort(v) { return Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v; }
const fold = v => String(v || '').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const claim = x => fold([x.principle, x.interpretation].join(' '));
export async function fingerprint(v) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(v))); return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join(''); }

export function diagnose(items, docs, design, usage = null, now = new Date().toISOString(), chunks = null) {
  const sources = new Map(docs.map(d => [d.id, d])), sections = sectionMap(design), duplicates = new Map(), conflicts = new Map();
  for (const x of items) {
    const c = claim(x); if (c) { const key = canonical([x.domain, x.conditions || {}, x.exclusions || {}, x.alsoWhen || [], x.modifiers || [], x.theory || [], c]); duplicates.set(key, [...(duplicates.get(key) || []), x.id]); }
    // Only flag same-condition opposite stance as a candidate; never assert a semantic contradiction.
    const key = canonical([x.domain, x.subDomain, x.conditions || {}, x.exclusions || {}, x.alsoWhen || [], x.theory || []]);
    conflicts.set(key, [...(conflicts.get(key) || []), x]);
  }
  const rows = items.map(x => {
    const flags = [], ev = x.evidence || [];
    const verifiedEvidence = chunks ? ev.filter(e => e.quote && e.chunkId && sources.has(e.docId) && (chunks.get(e.docId) || []).some(c => c.id === e.chunkId && String(c.text || '').normalize('NFKC').includes(String(e.quote).normalize('NFKC')))) : [];
    if (!verifiedEvidence.length) flags.push('evidence');
    if (!ev.length || ev.some(e => !sources.has(e.docId)) || (!x.sourceReference && !ev.length)) flags.push('source');
    if (!Object.keys(cleanConds(x.conditions)).length && !(x.ziweiConditions || []).length) flags.push('conditions');
    if (!x.subDomain || !Object.hasOwn(sections[x.domain] || {}, x.subDomain)) flags.push('chapter');
    const duplicateIds = duplicates.get(canonical([x.domain, x.conditions || {}, x.exclusions || {}, x.alsoWhen || [], x.modifiers || [], x.theory || [], claim(x)])) || [];
    if (duplicateIds.length > 1) flags.push('duplicate');
    const conflictIds = (conflicts.get(canonical([x.domain, x.subDomain, x.conditions || {}, x.exclusions || {}, x.alsoWhen || [], x.theory || []])) || []).filter(y => y.id !== x.id && ['positive', 'caution'].includes(x.stance) && ['positive', 'caution'].includes(y.stance) && x.stance !== y.stance).map(y => y.id);
    if (conflictIds.length) flags.push('conflict');
    // Absence of telemetry is not evidence of non-use.
    const measured = usage && usage.complete === true && usage.since && usage.until && usage.counts && Object.hasOwn(usage.counts, x.id);
    if (isProduction(x)) { if (!measured) flags.push('usageUnknown'); else if (usage.counts[x.id] === 0) flags.push('usage'); }
    return { id: x.id, domain: x.domain, title: x.title, version: x.version, approval: { status: x.status, reviewed: x.reviewed }, aiValidation: 'not_validated', verifiedQuoteCount: verifiedEvidence.length, flags, duplicateIds: duplicateIds.filter(id => id !== x.id), conflictIds, priority: (flags.includes('conflict') ? 100 : 0) + (flags.includes('evidence') ? 80 : 0) + (flags.includes('source') ? 40 : 0), checkedAt: now };
  });
  return { schemaVersion: 1, checkedAt: now, total: items.length, sources: docs.length, reviewed: items.filter(x => x.reviewed).length, published: items.filter(x => x.status === 'published').length, production: items.filter(isProduction).length, counts: Object.fromEntries(Object.keys(FLAGS).map(k => [k, rows.filter(x => x.flags.includes(k)).length])), rows, limitations: ['충돌·중복은 규칙 기반 검토 후보입니다.', chunks ? '인용은 저장 원문과 대조했습니다. 이용 권한·주장의 타당성은 별도 검증 대상입니다.' : '원문 대조 미실행: 근거 충분으로 판정하지 않습니다.', '챕터 연결은 기존 풀이 구성의 subDomain 기준입니다.', '사용 이력 미측정은 실제 미사용으로 판정하지 않습니다.'] };
}

export async function audit(kv) {
  const [original, originalDocs, design] = await Promise.all([loadAll(kv), kv.get('src:idx', 'json'), kv.get('ik:design', 'json')]);
  const view=await researchView(kv,original),items=view.items,docs=[...(originalDocs||[]),...view.docs];
  const chunks = new Map(view.docs.map(d=>[d.id,d.chunks])), docIds = [...new Set(items.flatMap(x => (x.evidence || []).map(e => e.docId)))].filter(id => (originalDocs || []).some(d => d.id === id));
  for (let i = 0; i < docIds.length; i += 20) {
    const batch = docIds.slice(i, i + 20);
    const keys=batch.map(id=>'src:chunks:'+id);
    const texts = kv.getMany ? await kv.getMany(keys,'json') : await Promise.all(keys.map(key => kv.get(key, 'json')));
    batch.forEach((id, j) => chunks.set(id, texts[j] || []));
  }
  const report = diagnose(items, docs || [], design, null, new Date().toISOString(), chunks);
  report.originalTotal=original.length;report.researchVersion=view.version;
  // Immutable snapshot first; pointer last. No schema migration or original writes.
  const id = crypto.randomUUID();
  await kv.put(PREFIX + 'audit:' + id, JSON.stringify({ ...report, id, inventoryHash: await fingerprint({ items:original, docs:originalDocs, design }) }));
  await kv.put(PREFIX + 'latest', JSON.stringify(id));
  return { ...report, id };
}

export async function plan(kv, report, now = Date.now()) {
  const tasks = [];
  for (const row of report.rows.filter(r => r.flags.some(f => ['evidence', 'source', 'conflict', 'conditions'].includes(f))).sort((a,b) => b.priority-a.priority).slice(0,10)) {
    const key = PREFIX + 'task:' + await fingerprint([row.id, row.version, row.flags]);
    const existing = await kv.get(key, 'json');
    if (existing && now - Date.parse(existing.createdAt) < 30 * 86400000) { tasks.push(existing); continue; }
    const task = { id: crypto.randomUUID(), knowledgeId: row.id, baseVersion: row.version, priority: row.priority, question: row.title + ': ' + row.flags.filter(f => FLAGS[f]).map(f => FLAGS[f]).join(', ') + '의 원문 근거와 예외 조건 확인', state: 'blocked_search_not_configured', createdAt: new Date(now).toISOString(), cost: 0, sources: [], auditId: report.id };
    await kv.put(key, JSON.stringify(task)); tasks.push(task);
  }
  return tasks;
}

// Changes are immutable proposed versions. No client-provided verification can publish a change.
export async function propose(kv, input) {
  const current = (await loadAll(kv)).find(x => x.id === input.knowledgeId);
  if (!current) throw Error('지식을 찾을 수 없습니다');
  if (current.version !== input.expectVersion) throw Error('기존 버전이 변경되었습니다');
  if (!['evidence', 'conditions', 'exception', 'interpretation'].includes(input.kind)) throw Error('변경 종류를 확인하세요');
  if (typeof input.reason !== 'string' || !input.reason.trim()) throw Error('변경 이유가 필요합니다');
  const record = { id: crypto.randomUUID(), knowledgeId: current.id, previousVersion: current.version, previous: current, proposed: input.proposed, kind: input.kind, reason: input.reason.slice(0,2000), sources: input.sources || [], actor: 'admin', at: new Date().toISOString(), state: 'review_required', aiValidation: 'not_validated', automaticApproval: false, automaticPublication: false };
  if (!record.proposed || typeof record.proposed !== 'object' || Array.isArray(record.proposed)) throw Error('후보 변경 내용이 필요합니다');
  await kv.put(PREFIX + 'change:' + record.id, JSON.stringify(record));
  return record;
}

export async function withdraw(kv, id) {
  if (!/^[a-f0-9-]{36}$/.test(id || '')) throw Error('후보 ID가 필요합니다');
  const change = await kv.get(PREFIX + 'change:' + id, 'json');
  if (!change) throw Error('후보가 없습니다');
  // Append withdrawal event. Preserve both original knowledge and proposal history.
  const event = { id: crypto.randomUUID(), changeId: id, knowledgeId: change.knowledgeId, previousVersion: change.previousVersion, previous: change, next: { state: 'withdrawn' }, reason: '관리자 후보 철회', actor: 'admin', at: new Date().toISOString() };
  await kv.put(PREFIX + 'event:' + event.id, JSON.stringify(event));
  await kv.put(PREFIX + 'withdrawn:' + id, JSON.stringify(event.id));
  return event;
}
