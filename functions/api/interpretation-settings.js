import { chapterPolicies, CHAPTER_DEFAULTS } from '../_chapter-policy.js';
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadSettings, SETTINGS_KEY } from '../_interpretation-store.js';
import { ENGINE_VERSION } from '../_interpretation-engine.js';
const HISTORY = 'ik:engine:history';
export async function onRequest({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  const kv = kvOf(env); if (!kv) return json({ error: 'storage-unavailable' }, 503);
  try {
    const settings = await loadSettings(kv), history = (await kv.get(HISTORY, 'json')) || [];
    if (request.method === 'GET') return json({ settings, history, effectiveMode: env.INTERPRETATION_ENGINE_MODE || settings.mode });
    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
    const raw = await request.text(); if (raw.length > 80000) return json({ error: 'too-large' }, 413);
    const body = JSON.parse(raw), s = body.settings;
    if (+body.expectVersion !== (settings.version || 0)) return json({ error: 'version-conflict', current: settings }, 409);
    if (!s || !['legacy','shadow','grounded'].includes(s.mode) || !Number.isInteger(s.maxClaims) || s.maxClaims < 1 || s.maxClaims > 90 || !Number.isInteger(s.maxOutputTokens) || s.maxOutputTokens < 1000 || s.maxOutputTokens > 16000 || !Array.isArray(s.disabledRules) || s.disabledRules.length > 500 || s.disabledRules.some(id => typeof id !== 'string' || !/^[\w.-]{3,60}$/.test(id))) return json({ error: 'invalid-settings' }, 400);
    for (const key of ['openaiModel','anthropicModel']) if (s[key] && !/^[\w.-]{1,120}$/.test(s[key])) return json({ error: 'invalid-model' }, 400);
    for (const key of ['inputPricePerMillion','outputPricePerMillion','maxRequestCost']) if (s[key] != null && (!Number.isFinite(s[key]) || s[key] < 0)) return json({ error: 'invalid-budget' }, 400);
    if (s.maxRequestCost != null && (s.inputPricePerMillion == null || s.outputPricePerMillion == null)) return json({ error: 'budget-needs-prices' }, 400);
    const chapters = chapterPolicies(s.chapters || settings.chapters);
    for (const [key, p] of Object.entries(chapters)) {
      if (typeof p.purpose !== 'string' || p.purpose.length > 1000 || !Array.isArray(p.required) || !Array.isArray(p.excluded) || [...p.required,...p.excluded].some(x=>typeof x!=='string'||x.length>300) || p.required.length>30 || p.excluded.length>30 || !Number.isFinite(p.temperamentRatio) || p.temperamentRatio<0 || p.temperamentRatio>CHAPTER_DEFAULTS[key].temperamentRatio || typeof p.style!=='string'||p.style.length>2000||typeof p.prompt!=='string'||p.prompt.length>4000 || !Number.isInteger(p.maxParagraphChars)||p.maxParagraphChars<100||p.maxParagraphChars>1200 || typeof p.hook.enabled!=='boolean'||typeof p.hook.style!=='string'||p.hook.style.length>1000||!Number.isInteger(p.hook.maxChars)||p.hook.maxChars<30||p.hook.maxChars>160||![2,3].includes(p.hook.explanationSentences)||!Number.isInteger(p.hook.explanationMaxChars)||p.hook.explanationMaxChars<100||p.hook.explanationMaxChars>600) return json({error:'invalid-chapter-policy',chapter:key},400);
    }
    if (s.semanticReview != null && typeof s.semanticReview !== 'boolean') return json({error:'invalid-semantic-review'},400);
    const next = { chapters, semanticReview: s.semanticReview !== false, hookOverrides: settings.hookOverrides || [], mode: s.mode, disabledRules: [...new Set(s.disabledRules)], maxClaims: s.maxClaims, maxOutputTokens: s.maxOutputTokens, openaiModel: s.openaiModel || '', anthropicModel: s.anthropicModel || '', promptVersion: ENGINE_VERSION, inputPricePerMillion: s.inputPricePerMillion ?? null, outputPricePerMillion: s.outputPricePerMillion ?? null, maxRequestCost: s.maxRequestCost ?? null, version: (settings.version || 0) + 1, updatedAt: new Date().toISOString() };
    // History first: preserves previous settings if the subsequent write fails.
    await kv.put(HISTORY, JSON.stringify([{ at: next.updatedAt, settings }, ...history].slice(0, 50)));
    await kv.put(SETTINGS_KEY, JSON.stringify(next));
    return json({ ok: true, settings: next });
  } catch { return json({ error: 'settings-unavailable' }, 503); }
}
