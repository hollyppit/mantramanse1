import { chapterPolicies } from './_chapter-policy.js';
import { DEFAULT_SETTINGS } from './_interpretation-engine.js';
import { readState } from './_rag-state.js';
export const SETTINGS_KEY = 'ik:engine:settings';
export async function loadSettings(kv) {
  const s = { ...DEFAULT_SETTINGS, ...(kv ? await kv.get(SETTINGS_KEY, 'json') : null) };
  return { ...s, chapters: chapterPolicies(s.chapters), semanticReview: s.semanticReview !== false, hookOverrides: s.hookOverrides || [] };
}
export async function loadSourceIndex(kv, items, blocked) {
  if (!kv) return new Map();
  const docs = (await kv.get('src:idx', 'json')) || [], ids = new Set(items.flatMap(it => (it.evidence || []).map(e => e.docId)));
  const selected=docs.filter(d=>ids.has(d.id)&&!blocked.has(d.id)), keys=selected.map(d=>'src:chunks:'+d.id);
  const chunks=kv.getMany ? await kv.getMany(keys,'json') : await Promise.all(keys.map(k=>kv.get(k,'json')));
  const entries=selected.map((d,i)=>[d.id,{...d,chunks:chunks[i] || []}]);
  // Source records are immutable research excerpts; originals remain in src:* unchanged.
  // Resolve active source versions against raw originals rather than effective overlay hashes.
  const state=await readState(kv).catch(()=>null);
  if(state&&!state.config.legacyOnly)for(const changeId of Object.values(state.active)){const c=state.candidates[changeId];if(c?.publication==='published'&&items.some(x=>(x.evidence||[]).some(e=>e.docId===c.source.id)))entries.push([c.source.id,c.source]);}
  return new Map(entries);
}
