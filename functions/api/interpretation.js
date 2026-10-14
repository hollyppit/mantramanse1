// Read-only analysis: no AI provider calls and no source/asset mutation.
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadAll, blockedDocs } from '../_ikstore.js';
import { analyze, renderReport, ENGINE_VERSION } from '../_interpretation-engine.js';
import { loadSourceIndex, loadSettings } from '../_interpretation-store.js';
import { onRequestPost as writeChapter } from './movingtoon-reading.js';
import { DOMAINS } from '../_ik.js';

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  let body;
  try { const raw = await request.text(); if (raw.length > 160000) return json({ ok: false, error: 'too-large' }, 413); body = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  try {
    if (body.compose === 'ai' && !DOMAINS[body.domain]) return json({ ok: false, error: 'domain-required-for-ai' }, 400);
    const kv = kvOf(env); if (!kv) return json({ ok: false, error: 'storage-unavailable' }, 503);
    const [items, blocked] = await Promise.all([loadAll(kv), blockedDocs(kv)]);
    const settings = await loadSettings(kv), sourceIndex = await loadSourceIndex(kv, items, blocked);
    const analysis = analyze(body.sd, items, { ...settings, sourceIndex, blockedDocs: blocked, domains: body.domain ? [body.domain] : undefined });
    const report = renderReport(analysis), generation = { mode: 'rules-only', batches: [], estimatedCost: 0 };
    if (body.compose === 'ai' && analysis.claims.length) {
      generation.mode = 'claim-bound-ai';
      const cards = report.chapters.flatMap(c => c.cards);
      for (let offset = 0; offset < cards.length; offset += 40) {
        const batch = cards.slice(offset, offset + 40);
        const chapter = { id: 'engine-' + offset, title: DOMAINS[body.domain] + ' ' + body.domain.toLowerCase(), paragraphs: batch.map((card,i) => ({ id: String(i), text: card.text, expected_claim_ids: card.claim_ids })) };
        const response = await writeChapter({ env: { ...env, INTERPRETATION_ENGINE_MODE: 'grounded' }, request: new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify({ sd: body.sd, chapter, outline: [] }) }) });
        const value = await response.json();
        const snapshotStable = value.ok && value.result.paragraphs.every(p => p.claim_ids.every(id => {
          const original = analysis.claims.find(c => c.claim_id === id), current = value.interpretation?.claims.find(c => c.claim_id === id);
          return original && current && JSON.stringify(original) === JSON.stringify(current);
        }));
        if (value.ok && !snapshotStable) { value.ok = false; value.error = 'knowledge-changed-during-generation'; }
        generation.batches.push({ offset, ok: !!value.ok, provider: value.provider || null, generation: value.generation || null, error: value.error || null, validation: value.validation || null, chapterQuality: value.chapterQuality || null, hook: value.hook || null, cached: !!value.cached });
        if (value.ok) value.result.paragraphs.forEach(p => { batch[Number(p.id)].text = p.text; batch[Number(p.id)].refs = p.refs; batch[Number(p.id)].claim_ids = p.claim_ids; });
      }
      report.chapters.forEach(c => { c.full_text = c.cards.map(card => card.text).join('\n\n'); });
      generation.estimatedCost = generation.batches.every(b => b.ok && b.generation?.estimatedCost != null) ? generation.batches.reduce((sum,b) => sum + (b.cached ? 0 : b.generation.estimatedCost),0) : null;
    }
    return json({ ok: true, analysis, report, engine: ENGINE_VERSION, generation });
  } catch (e) { return json({ ok: false, error: ['invalid-chart','unknown-hour-has-pillar','invalid-distribution'].includes(e.message) ? e.message : 'analysis-unavailable' }, 400); }
}
