// MANTRA INTERPRETATION KNOWLEDGE SYSTEM API. 로직은 ../_ik.js(순수 함수). 저장은 GLOSSARY_KV 의 'ik:' 접두어 키만 쓴다(기존 키는 건드리지 않음).
//   ik:d:<DOMAIN>  분야별 풀이 지식 배열 | ik:hist:<id> 변경 이력(최근 20) | ik:design 풀이 설계 | ik:rules AI 규칙 | ik:meta 버전 | ik:pkg:<hash> 합성 결과 캐시
// 관리자(Bearer ADMIN_PASSWORD): GET ?a=meta|list|get|hist|stats  POST ?a=save|status|delete|design|rules|lab|draft|import
// 공개: POST ?a=deep { sd, ext, domains } — 서비스(무빙툰·상세 리포트)에 싣는 "검수된 풀이 지식 기반 심화 풀이". 게시+검수 완료된 지식만, AI 호출 없음, 개발용 ID 없음, IP 시간당 한도
// 관리자: POST ?a=package { sd, ext, domain } → 게시+검수된 지식만으로 만든 Interpretation Package (AI 호출 없음, 생년월일은 서버에서 버린다)
import { json, isAdmin, configError } from '../_lib.js';
import * as IK from '../_ik.js';

const MAX_PER_DOMAIN = 2000, MAX_BYTES = 20 * 1024 * 1024, TIMEOUT_MS = 40000;
const dkey = d => 'ik:d:' + d;
const loadDomain = async (kv, d) => (await kv.get(dkey(d), 'json')) || [];
async function loadAll(kv, domains) { const ds = domains || Object.keys(IK.DOMAINS); return (await Promise.all(ds.map(d => loadDomain(kv, d)))).flat(); }
async function meta(kv) { return (await kv.get('ik:meta', 'json')) || { k: 'k0', d: 'd0', r: 'r0' }; }
async function bump(kv, which) { const m = await meta(kv); m[which] = which + Date.now().toString(36); await kv.put('ik:meta', JSON.stringify(m)); return m; }
const scrub = sd => { if (!sd || typeof sd !== 'object') return sd; const c = { ...sd }; delete c.birth; return c; }; // 생년월일·출생시는 풀이 계층에 필요 없다

async function llm(env, system, user, maxTokens = 6000) {
  const errs = [];
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, temperature: 0.3, system, messages: [{ role: 'user', content: user }] }) });
      if (!r.ok) throw new Error('anthropic ' + r.status);
      const d = await r.json(); return { text: (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), provider: 'anthropic' };
    } catch (e) { errs.push(e.message); }
  }
  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: system, input: user }) });
      if (!r.ok) throw new Error('openai ' + r.status);
      const d = await r.json(); return { text: typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join(''), provider: 'openai' };
    } catch (e) { errs.push(e.message); }
  }
  throw new Error(errs.join(' / ') || 'AI 키가 없습니다');
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url), a = url.searchParams.get('a') || '', post = request.method === 'POST';
  const kv = env.GLOSSARY_KV;
  if (a === 'deep' && post) return deepForService(request, env);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (a === 'package' && post) return publicPackage(request, env); // P0: 관리자 전용. 서비스(무빙툰·리포트·PDF) 연결 시 서버 간 호출로 쓴다
  let b = {}; if (post) { try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); } }

  if (a === 'meta' && !post) {
    const [m, design, rules] = await Promise.all([meta(kv), kv.get('ik:design', 'json'), kv.get('ik:rules', 'json')]);
    return json({ version: IK.IK_VERSION, meta: m, design: design || null, defaultDesign: IK.DEFAULT_DESIGN, rules: rules || IK.DEFAULT_RULES, domains: IK.DOMAINS, unsupported: IK.UNSUPPORTED, levelCut: IK.LEVEL_CUT, aiAvailable: !!(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY) });
  }
  if (a === 'list' && !post) { // 전체 항목(가벼운 요약 + 조건). 본문은 get 으로.
    const d = url.searchParams.get('domain'), items = await loadAll(kv, IK.DOMAINS[d] ? [d] : null);
    return json({ items: items.map(it => ({ id: it.id, title: it.title, domain: it.domain, subDomain: it.subDomain, status: it.status, stance: it.stance, priority: it.priority, conditions: it.conditions, confidence: it.confidence, reviewed: it.reviewed, sourceType: it.sourceType, tags: it.tags, version: it.version, updatedAt: it.updatedAt, hasMods: (it.modifiers || []).length, text: (it.title + ' ' + it.principle + ' ' + it.interpretation + ' ' + (it.tags || []).join(' ')).slice(0, 600) })) });
  }
  if (a === 'get' && !post) {
    const d = url.searchParams.get('domain'), id = url.searchParams.get('id'); if (!IK.DOMAINS[d]) return json({ error: '분야가 필요합니다' }, 400);
    const it = (await loadDomain(kv, d)).find(x => x.id === id); return it ? json({ item: it }) : json({ error: '없는 항목입니다' }, 404);
  }
  if (a === 'stats' && !post) { const [items, design] = await Promise.all([loadAll(kv), kv.get('ik:design', 'json')]); const total = items.length, prod = items.filter(IK.isProduction).length;
    return json({ total, published: items.filter(x => x.status === 'published').length, reviewed: items.filter(x => x.reviewed).length, needReview: items.filter(x => x.status !== 'archived' && !x.reviewed).length, aiDraft: items.filter(x => x.sourceType === 'AI_DRAFT' && !x.reviewed).length, production: prod, coverage: IK.coverageStats(items, design) }); }
  if (a === 'import' && post) { // 기존 해석 모듈 → "검수 필요" 초안. 이미 가져온 것(sourceReference)은 건너뛴다. 게시는 하지 않는다.
    const mods = Array.isArray(b.modules) ? b.modules.slice(0, 1500) : [], all = await loadAll(kv), have = new Set(all.map(x => x.sourceReference)), cnt = {}, add = {}; let skipped = 0, bad = 0;
    for (const x of all) { const m = /-L(\d+)$/.exec(x.id); if (m) cnt[x.domain] = Math.max(cnt[x.domain] || 0, +m[1]); }
    for (const m of mods) { if (!m || have.has('legacy:' + m.id)) { skipped++; continue; } const dom = (IK.fromLegacyModule(m, 1) || {}).domain; if (!dom) { bad++; continue; } cnt[dom] = (cnt[dom] || 0) + 1; const it = IK.fromLegacyModule(m, cnt[dom]); if (!it) { bad++; continue; } it.version = 1; (add[dom] = add[dom] || []).push(it); }
    let n = 0; for (const d of Object.keys(add)) { const list = (await loadDomain(kv, d)).concat(add[d]).slice(0, MAX_PER_DOMAIN); await kv.put(dkey(d), JSON.stringify(list)); n += add[d].length; }
    return json({ ok: true, imported: n, skipped, unsupported: bad, meta: n ? await bump(kv, 'k') : await meta(kv) }); }
  if (a === 'draft' && post) { // AI 로 풀이 지식 초안 만들기. 항상 임시저장·AI 초안·검수 전 — 게시는 관리자가 검수한 뒤에만 가능
    const text = String(b.text || '').trim().slice(0, 8000); if (text.length < 30) return json({ error: '전문 자료를 30자 이상 붙여 넣어 주세요' }, 400);
    if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) return json({ error: 'AI 키가 설정되어 있지 않습니다(ANTHROPIC_API_KEY 또는 OPENAI_API_KEY)' }, 501);
    let r; try { r = await llm(env, IK.draftSystem(), '아래 자료를 풀이 지식 초안 하나로 구조화하라.\n\n' + text, 3000); } catch (e) { return json({ error: 'AI 호출 실패: ' + e.message }, 502); }
    const all = await loadAll(kv), probe = IK.sanitizeDraft(r.text, 'DRAFT-0000'); if (!probe) return json({ error: 'AI 답이 풀이 지식 형식이 아닙니다. 자료를 나눠서 다시 시도해 보세요' }, 502);
    let mx = 0; const re = new RegExp('^' + probe.domain + '-(\\d+)$'); for (const x of all) { const m = re.exec(x.id); if (m) mx = Math.max(mx, +m[1]); }
    const item = IK.sanitizeDraft(r.text, probe.domain + '-' + ('0000' + (mx + 1)).slice(-4)); item.version = 1;
    await kv.put(dkey(item.domain), JSON.stringify((await loadDomain(kv, item.domain)).concat(item))); return json({ ok: true, item, provider: r.provider, meta: await bump(kv, 'k') }); }
  if (a === 'hist' && !post) { const id = url.searchParams.get('id'); return IK.isId(id) ? json({ history: (await kv.get('ik:hist:' + id, 'json')) || [] }) : json({ error: 'id 가 필요합니다' }, 400); }

  if (a === 'save' && post) {
    const src = b.item || {}, d0 = src.domain; if (!IK.DOMAINS[d0]) return json({ error: '분야가 필요합니다' }, 400);
    const all = await loadAll(kv), at = all.find(x => x.id === src.id), prev = at || null;
    if (b.isNew && prev) return json({ error: '이미 같은 id 가 있습니다: ' + src.id }, 409);
    if (prev && +b.expectVersion !== prev.version) return json({ error: '다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요 (현재 버전 ' + prev.version + ')', current: prev }, 409);
    const item = IK.cleanItem(src, prev); if (!item) return json({ error: 'id(영문·숫자·_-.)와 분야를 확인하세요' }, 400);
    if (!item.title) return json({ error: '풀이 이름이 필요합니다' }, 400);
    item.version = (prev ? prev.version : 0) + 1;
    const list = (await loadDomain(kv, item.domain)).filter(x => x.id !== item.id);
    if (prev && prev.domain !== item.domain) { const old = (await loadDomain(kv, prev.domain)).filter(x => x.id !== item.id); await kv.put(dkey(prev.domain), JSON.stringify(old)); }
    if (list.length >= MAX_PER_DOMAIN) return json({ error: '분야당 최대 ' + MAX_PER_DOMAIN + '개입니다' }, 413);
    list.push(item); const text = JSON.stringify(list); if (text.length > MAX_BYTES) return json({ error: '분야 데이터가 너무 큽니다' }, 413);
    await kv.put(dkey(item.domain), text);
    if (prev) { const h = (await kv.get('ik:hist:' + item.id, 'json')) || []; h.unshift({ at: new Date().toISOString(), version: prev.version, item: prev }); await kv.put('ik:hist:' + item.id, JSON.stringify(h.slice(0, 20))); }
    const m = await bump(kv, 'k'); return json({ ok: true, item, meta: m });
  }
  if (a === 'status' && post) { // 상태·검수 변경. 같은 검증(cleanItem)을 거친다
    const all = await loadAll(kv), it = all.find(x => x.id === b.id); if (!it) return json({ error: '없는 항목입니다' }, 404);
    const next = IK.cleanItem({ ...it, status: b.status, reviewed: b.reviewed != null ? !!b.reviewed : it.reviewed, reviewedAt: b.reviewed === false ? '' : it.reviewedAt }, it); next.version = it.version + 1;
    if (b.status === 'published' && next.status !== 'published') return json({ error: '게시하려면 먼저 "검수 완료"로 표시하세요 (AI 초안은 검수 후에만 게시됩니다)' }, 400);
    const list = (await loadDomain(kv, it.domain)).filter(x => x.id !== it.id); list.push(next); await kv.put(dkey(it.domain), JSON.stringify(list));
    const h = (await kv.get('ik:hist:' + it.id, 'json')) || []; h.unshift({ at: new Date().toISOString(), version: it.version, item: it }); await kv.put('ik:hist:' + it.id, JSON.stringify(h.slice(0, 20)));
    return json({ ok: true, item: next, meta: await bump(kv, 'k') });
  }
  if (a === 'delete' && post) {
    const all = await loadAll(kv), it = all.find(x => x.id === b.id); if (!it) return json({ error: '없는 항목입니다' }, 404);
    if (it.status === 'published') return json({ error: '게시 중인 풀이는 삭제할 수 없습니다. 먼저 "보관"으로 바꾸세요' }, 400);
    await kv.put(dkey(it.domain), JSON.stringify((await loadDomain(kv, it.domain)).filter(x => x.id !== it.id)));
    const h = (await kv.get('ik:hist:' + it.id, 'json')) || []; h.unshift({ at: new Date().toISOString(), version: it.version, item: it, deleted: true }); await kv.put('ik:hist:' + it.id, JSON.stringify(h.slice(0, 20)));
    return json({ ok: true, meta: await bump(kv, 'k') });
  }
  if (a === 'design' && post) { const d = IK.cleanDesign(b.design); await kv.put('ik:design', JSON.stringify(d)); return json({ ok: true, design: d, meta: await bump(kv, 'd') }); }
  if (a === 'rules' && post) { const r = IK.cleanRules(b.rules); await kv.put('ik:rules', JSON.stringify(r)); return json({ ok: true, rules: r, meta: await bump(kv, 'r') }); }

  if (a === 'lab' && post) { // 풀이 실험실: 초안 포함 여부 선택, 합성 방식 선택(plain | ai)
    if (!IK.DOMAINS[b.domain]) return json({ error: '분야가 필요합니다' }, 400);
    try {
      const [items, design, rules, m] = await Promise.all([loadAll(kv, [b.domain]), kv.get('ik:design', 'json'), kv.get('ik:rules', 'json'), meta(kv)]);
      const rl0 = rules || IK.DEFAULT_RULES, rl = IK.DEPTH_CAP[b.depth] ? { ...rl0, depth: b.depth } : rl0, fi = b.focus ? IK.cleanItem({ ...b.focus, status: 'published', reviewed: true }) : null; // 편집 중(저장 전) 풀이를 이번 실행에만 포함
      const pool = fi ? items.filter(x => x.id !== fi.id).concat(fi) : items, pkg = IK.buildPackage(scrub(b.sd), b.ext, pool, design, rl, { domain: b.domain, includeDraft: !!b.includeDraft });
      pkg.versions = { knowledge: m.k, design: m.d, rules: m.r, composer: IK.COMPOSER_VERSION };
      let composed = IK.composePlain(pkg, rl), mode = 'plain', provider = null, cached = false, aiError = null;
      if (b.compose === 'ai') {
        const key = await IK.cacheKey({ sd: scrub(b.sd), ext: b.ext, domain: b.domain, d: !!b.includeDraft, v: pkg.versions, rl, y: pkg.facts.nowYear });
        const hit = !b.force && await kv.get(key, 'json');
        if (hit) { composed = hit.composed; mode = 'ai'; provider = hit.provider; cached = true; }
        else {
          try { const r = await llm(env, IK.composerSystem(rl, b.domain), IK.composerUser(pkg)), c = IK.sanitizeComposed(r.text, pkg); if (!c) throw new Error('AI 답이 형식에 맞지 않습니다'); composed = c; mode = 'ai'; provider = r.provider; await kv.put(key, JSON.stringify({ composed, provider }), { expirationTtl: 60 * 60 * 24 * 30 }); }
          catch (e) { aiError = e.message; }
        }
      }
      const allItems = b.scan ? await loadAll(kv) : null, pool2 = fi && allItems ? allItems.filter(x => x.id !== fi.id).concat(fi) : allItems, scan = [];
      if (b.scan) for (const d of Object.keys(IK.DOMAINS)) { const p = IK.buildPackage(scrub(b.sd), b.ext, pool2, design, rl, { domain: d, includeDraft: !!b.includeDraft }), ids = p.order, ok = ids.filter(i => p.sections[i].status === 'ok'), lack = ids.filter(i => p.sections[i].status === 'insufficient'); scan.push({ domain: d, name: IK.DOMAINS[d], ok: ok.length, lacking: lack.length, lackingRequired: lack.filter(i => p.sections[i].required).length, lackSections: lack.map(i => ({ id: i, title: p.sections[i].title, required: p.sections[i].required })) }); }
      return json({ ok: true, package: pkg, composed, mode, provider, cached, aiError, quality: IK.qualityCheck(pkg, composed, rl), diagnosis: IK.diagnose(pkg, composed), scan: b.scan ? scan : null, depth: rl.depth });
    } catch (e) { return json({ error: e.message || '실패' }, 400); }
  }
  return json({ error: '알 수 없는 요청입니다' }, 404);
}

async function publicPackage(request, env) {
  const kv = env.GLOSSARY_KV; if (!kv) return json({ ok: false, error: 'no-kv' });
  let b; try { if (+request.headers.get('content-length') > 200 * 1024) return json({ ok: false, error: 'too-large' }, 413); b = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  if (!IK.DOMAINS[b.domain]) return json({ ok: false, error: 'bad-domain' }, 400);
  try {
    const [items, design, rules, m] = await Promise.all([loadAll(kv, [b.domain]), kv.get('ik:design', 'json'), kv.get('ik:rules', 'json'), meta(kv)]);
    const pkg = IK.buildPackage(scrub(b.sd), b.ext, items, design, rules || IK.DEFAULT_RULES, { domain: b.domain, includeDraft: false });
    pkg.versions = { knowledge: m.k, design: m.d, rules: m.r, composer: IK.COMPOSER_VERSION };
    return json({ ok: true, package: pkg });
  } catch (e) { return json({ ok: false, error: 'bad-input' }, 400); }
}

// 서비스(무빙툰·상세 리포트)가 부르는 공개 엔드포인트. 게시+검수 완료 지식만 쓰고 AI 를 부르지 않는다. 관리자가 "AI 작성 설정"에서 서비스 연결을 끄면 빈 결과.
async function deepForService(request, env) {
  const kv = env.GLOSSARY_KV; if (!kv) return json({ ok: false, error: 'no-kv' });
  let b; try { if (+request.headers.get('content-length') > 200 * 1024) return json({ ok: false, error: 'too-large' }, 413); b = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  const doms = (Array.isArray(b.domains) ? b.domains : []).filter(d => IK.DOMAINS[d]).slice(0, 8); if (!doms.length) return json({ ok: false, error: 'bad-domain' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || 'x', hk = 'rl:ikdeep:' + ip + ':' + new Date().toISOString().slice(0, 13), used = +(await kv.get(hk)) || 0;
  if (used >= (+env.IK_DEEP_HOURLY_LIMIT || 20)) return json({ ok: false, error: 'rate-limited' }, 429);
  await kv.put(hk, String(used + 1), { expirationTtl: 7200 });
  try {
    const [design, rules] = await Promise.all([kv.get('ik:design', 'json'), kv.get('ik:rules', 'json')]), rl = rules || IK.DEFAULT_RULES;
    if (rl.serviceEnabled === false) return json({ ok: true, enabled: false, domains: {} });
    const out = {};
    for (const d of doms) { const items = await loadDomain(kv, d), pkg = IK.buildPackage(scrub(b.sd), b.ext, items, design, rl, { domain: d, includeDraft: false }), v = IK.deepView(pkg, IK.composePlain(pkg, rl)); if (v.sections.length) out[d] = v; }
    return json({ ok: true, enabled: true, domains: out, v: (await meta(kv)).k });
  } catch (e) { return json({ ok: false, error: 'bad-input' }, 400); }
}
