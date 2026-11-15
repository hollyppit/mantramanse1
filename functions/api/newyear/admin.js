// /api/newyear/admin — 신년운세 관리자(관리자 비밀번호 필요).
// GET  ?year=2027            → 연도 목록·공개 설정·상품(가격은 결제·상품 화면에서)·검수 현황·괘/블록 목록·최근 이력
// GET  ?year=2027&gua=163    → 괘 하나: 원문(규장각본 또는 보충본)·현대어 초안·수정값·합친 결과·상태
// GET  ?block=total.stem.정관.up → 사주 블록 하나: 초안·수정값·상태
// POST { action:'config', year, visibility, teaser, intro, contentMode, entry?, media? }   (보낸 칸만 바뀐다)
// POST { action:'modern', gua, status?, edits?, rev }   (status: reviewed|draft, edits: null 이면 수정값 지움)
// POST { action:'block', id, status?, edits?, rev }
// POST { action:'bulk', kind:'modern'|'blocks', ids, status, rev }
// rev 는 마지막으로 읽은 저장 번호 — 그 사이 다른 사람이 저장했으면 409(덮어쓰기 방지).
import { json, isAdmin } from '../../_lib.js';
import { kvOf } from '../../_store.js';
import { loadProducts, ANNUAL_WORLD, payReady } from '../../_commerce.js';
import { NY, YEARS } from '../../_newyear-runtime.js';
import { NEWYEAR_KEY, loadNewyearConfig, cleanNewyearConfig, yearConfig } from '../../_newyear.js';
import { loadContent, saveContent, cleanModernEdits, cleanBlockEdits, applyContent, summary } from '../../_newyear-content.js';

const who = request => { try { return decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30) || 'admin'; } catch { return 'admin'; } };
function possibleGua(deps, year) {
  const t = deps.TojeongEngine.yearTable(year, deps.Manse), mids = [...new Set(Object.values(t.middle).map(v => v.value))], lows = [...new Set(Object.values(t.lower).flat())];
  const out = []; for (let u = 1; u <= 8; u++) for (const m of mids) for (const l of lows) out.push(u * 100 + m * 10 + l);
  return out.sort((a, b) => a - b);
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  const u = new URL(request.url), deps = NY(), content = await loadContent(env);
  const year = +(u.searchParams.get('year') || YEARS()[YEARS().length - 1]);
  if (u.searchParams.get('gua')) {
    const g = +u.searchParams.get('gua'), base = deps.TojeongModern[g];
    if (!base) return json({ error: 'unknown-gua' }, 404);
    const merged = applyContent(deps, content, 'preview').TojeongModern[g];
    return json({ gua: g, original: deps.TojeongText.gua[g] || null, supplement: (deps.TojeongSupplement.gua || {})[g] || null, draft: base, edits: (content.modern[g] || {}).edits || null, merged, status: (content.modern[g] || {}).status || 'draft', by: (content.modern[g] || {}).by || null, at: (content.modern[g] || {}).at || null, rev: content.rev });
  }
  if (u.searchParams.get('block')) {
    const id = u.searchParams.get('block'), b = deps.NewyearBlocks.find(x => x.id === id);
    if (!b) return json({ error: 'unknown-block' }, 404);
    const o = content.blocks[id] || {};
    return json({ id, draft: b, edits: o.edits || null, status: o.status || 'draft', by: o.by || null, at: o.at || null, rev: content.rev });
  }
  if (!YEARS().includes(year)) return json({ error: 'unknown-year', years: YEARS() }, 404);
  const cfg = await loadNewyearConfig(env), prods = await loadProducts(env), p = prods.find(x => x.id === ANNUAL_WORLD(year)) || null;
  const possible = possibleGua(deps, year);
  return json({
    years: YEARS(), year, config: yearConfig(cfg, year), pack: deps.NewyearPacks[year],
    product: p ? { id: p.id, name: p.name, price: p.price, active: p.active, onSale: !!(p.active && p.price > 0 && payReady(env)) } : null,
    summary: summary(deps, content, possible), possible,
    modern: Object.keys(deps.TojeongModern).map(Number).sort((a, b) => a - b).map(g => { const m = deps.TojeongModern[g], o = content.modern[g] || {}; return { gua: g, tone: (o.edits && o.edits.tone) || m.tone, theme: (o.edits && o.edits.theme) || m.theme, status: o.status || 'draft', edited: !!(o.edits && Object.keys(o.edits).length), inYear: possible.includes(g), source: deps.TojeongText.gua[g] ? 'kyu1077' : 'nl-supplement' }; }),
    blocks: deps.NewyearBlocks.map(b => { const o = content.blocks[b.id] || {}; return { id: b.id, section: b.section, hook: (o.edits && o.edits.hook) || b.hook || b.line || '', status: o.status || 'draft', edited: !!(o.edits && Object.keys(o.edits).length) }; }),
    rev: content.rev, updatedAt: content.updatedAt, by: content.by, history: content.history.slice(-20).reverse(),
  });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  const by = who(request), at = new Date().toISOString(), deps = NY(), Q = globalThis.NewyearQuality;
  if (body.action === 'config') {
    const year = String(body.year);
    if (!YEARS().includes(+year)) return json({ error: 'unknown-year' }, 404);
    const kv = kvOf(env); if (!kv) return json({ error: 'kv-unavailable' }, 503);
    const cur = await loadNewyearConfig(env);
    const next = cleanNewyearConfig({ years: { ...cur.years, [year]: { ...yearConfig(cur, year), ...pick(body, ['visibility', 'teaser', 'intro', 'contentMode', 'entry', 'media']) } } });
    await kv.put(NEWYEAR_KEY, JSON.stringify(next));
    return json({ ok: true, config: next.years[year] });
  }
  const content = await loadContent(env);
  if (body.rev != null && +body.rev !== content.rev) return json({ error: 'stale', rev: content.rev, message: '다른 화면에서 먼저 저장했습니다. 새로 불러온 뒤 다시 저장해 주세요.' }, 409);
  const status = body.status === 'reviewed' || body.status === 'draft' ? body.status : null;
  const note = [];
  try {
    if (body.action === 'modern') {
      const g = +body.gua; if (!deps.TojeongModern[g]) return json({ error: 'unknown-gua' }, 404);
      const o = content.modern[g] || {};
      if (body.edits === null) o.edits = {}; else if (body.edits) o.edits = cleanModernEdits(body.edits, Q);
      if (status) o.status = status; else if (body.edits !== undefined && o.status === 'reviewed') o.status = 'draft';   // 승인 뒤 고치면 다시 검수
      o.by = by; o.at = at; content.modern[g] = o; note.push({ kind: 'modern', target: g, action: status || 'edit' });
    } else if (body.action === 'block') {
      const id = String(body.id || ''); if (!deps.NewyearBlocks.some(b => b.id === id)) return json({ error: 'unknown-block' }, 404);
      const o = content.blocks[id] || {};
      if (body.edits === null) o.edits = {}; else if (body.edits) o.edits = cleanBlockEdits(body.edits, Q);
      if (status) o.status = status; else if (body.edits !== undefined && o.status === 'reviewed') o.status = 'draft';
      o.by = by; o.at = at; content.blocks[id] = o; note.push({ kind: 'block', target: id, action: status || 'edit' });
    } else if (body.action === 'bulk') {
      if (!status || !Array.isArray(body.ids) || body.ids.length > 400) return json({ error: 'bad-bulk' }, 400);
      const map = body.kind === 'modern' ? content.modern : body.kind === 'blocks' ? content.blocks : null;
      if (!map) return json({ error: 'bad-kind' }, 400);
      const valid = body.kind === 'modern' ? new Set(Object.keys(deps.TojeongModern)) : new Set(deps.NewyearBlocks.map(b => b.id));
      let n = 0; for (const id of body.ids) { const k = String(id); if (!valid.has(k)) continue; map[k] = { ...(map[k] || {}), status, by, at }; n++; }
      note.push({ kind: body.kind, target: n + '건', action: status });
    } else return json({ error: 'unknown-action' }, 400);
  } catch (e) {
    if (e && e.message === 'banned-text') return json({ error: 'banned-text', message: '쓸 수 없는 표현이 있습니다(확정 예언·의료/투자 지시·범용 문장 등): ' + e.detail }, 400);
    throw e;
  }
  content.rev += 1; content.updatedAt = at; content.by = by;
  content.history = content.history.concat(note.map(x => ({ ...x, by, at, rev: content.rev }))).slice(-50);
  await saveContent(env, content);
  return json({ ok: true, rev: content.rev });
}
const pick = (o, ks) => Object.fromEntries(ks.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
