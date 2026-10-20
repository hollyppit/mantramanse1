import { aiFetch } from './_ai-cost.js';
// 풀이 지식(IK)·풀이 자료(SRC) API 가 함께 쓰는 저장·AI 도우미. 파일명이 _로 시작해 라우트로 노출되지 않는다.
import { DOMAINS } from './_ik.js';
import { serviceItems } from './_rag-view.js';
import { readState, STATE_KEY } from './_rag-state.js';

export const MAX_PER_DOMAIN = 2000, MAX_BYTES = 20 * 1024 * 1024, TIMEOUT_MS = 40000;
export const dkey = d => 'ik:d:' + d;
export const loadDomain = async (kv, d) => (await kv.get(dkey(d), 'json')) || [];
export async function loadAll(kv, domains) { const ds = domains || Object.keys(DOMAINS); return (kv.getMany ? (await kv.getMany(ds.map(dkey),'json')).map(x=>x||[]) : await Promise.all(ds.map(d => loadDomain(kv, d)))).flat(); }
export async function loadServiceAll(kv,domains) {
 const state=await readState(kv).catch(()=>null);let required=domains?Object.keys(DOMAINS).filter(d=>domains.includes(d)):undefined;
 if(domains&&state&&!state.config.legacyOnly){
  const relevant=Object.values(state.active).map(id=>state.candidates[id]).filter(c=>c?.publication==='published'&&(domains.includes(c.next?.domain)||domains.includes(c.previous?.domain)));
  // Domain moves need their original records for the exact hash gate. A new rule needs a global collision check.
  required=relevant.some(c=>!c.previous||!DOMAINS[c.previous.domain])?undefined:Object.keys(DOMAINS).filter(d=>domains.includes(d)||relevant.some(c=>c.previous.domain===d));
 }
 const items=await serviceItems(kv,await loadAll(kv,required),state);
 return domains?items.filter(x=>domains.includes(x.domain)):items;
}
export async function loadServiceRules(kv,ids,domains) {
 if(!ids.length)return [];
 if(!kv.readingKnowledge)return (await loadServiceAll(kv,domains)).filter(x=>ids.includes(x.id));
 const state=await readState(kv).catch(()=>null),needed=[...new Set([...ids,...Object.keys(state?.active||{})])];
 if(needed.length>1000)return (await loadServiceAll(kv,domains)).filter(x=>ids.includes(x.id));
 const order=Object.keys(DOMAINS),originals=(await kv.readingKnowledge(needed)).slice().sort((a,b)=>order.indexOf(a.domain)-order.indexOf(b.domain)),items=await serviceItems(kv,originals,state);
 return items.filter(x=>ids.includes(x.id)&&(!domains||domains.includes(x.domain)));
}
export async function loadServiceDomain(kv, domain) {return loadServiceAll(kv,[domain]);}
export async function meta(kv) { const m=(await kv.get('ik:meta', 'json')) || { k: 'k0', d: 'd0', r: 'r0' };const s=await kv.get(STATE_KEY,'json').catch(()=>null);return s?{...m,research:s.config.legacyOnly?'legacy:'+(s.indexVersion||0):(s.indexVersion||0)}:m; }
export async function bump(kv, which) { const m = await meta(kv); m[which] = which + Date.now().toString(36); const stored={...m};delete stored.research;await kv.put('ik:meta', JSON.stringify(stored)); return m; }
export const scrub = sd => { if (!sd || typeof sd !== 'object') return sd; const c = { ...sd }; delete c.birth; delete c.name; delete c.ziwei; delete c.calculationProvenance; return c; }; // Legacy AI paths keep their existing data contract.
export function nextId(items, domain) { const re = new RegExp('^' + domain + '-(\\d+)$'); let mx = 0; for (const x of items) { const m = re.exec(x.id); if (m) mx = Math.max(mx, +m[1]); } return domain + '-' + ('0000' + (mx + 1)).slice(-4); }

// 풀이 자료 정책에 따라 production 에서 빼야 하는 자료 id (비활성 또는 "Production 풀이 사용" OFF)
export async function blockedDocs(kv) { const idx = (await kv.get('src:idx', 'json')) || []; return new Set(idx.filter(d => d.active === false || (d.policy && d.policy.production === false)).map(d => d.id)); }

// 실패 응답의 error.message 를 짧게 덧붙인다 (400 의 실제 원인을 관리자 화면에서 볼 수 있게)
async function errDetail(r) {
  try { const j = await r.json(); const m = (j && j.error && (j.error.message || j.error)) || ''; return m ? ': ' + String(m).slice(0, 200) : ''; } catch { return ''; }
}

export async function llm(env, system, user, maxTokens = 6000, timeoutMs = TIMEOUT_MS) {
  const errs = [];
  if (env.OPENAI_API_KEY) {
    try {
      const r = await aiFetch(env, 'ikstore', 'https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: system, input: user }) });
      if (!r.ok) throw new Error('openai ' + r.status + await errDetail(r));
      const d = await r.json(); return { text: typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join(''), provider: 'openai' };
    } catch (e) { errs.push(e.message); }
  }
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await aiFetch(env, 'ikstore', 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }) });
      if (!r.ok) throw new Error('anthropic ' + r.status + await errDetail(r));
      const d = await r.json(); return { text: (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), provider: 'anthropic', stop: d.stop_reason || '' };
    } catch (e) { errs.push(e.message); }
  }
  if (env.GEMINI_API_KEY) {
    try {
      const r = await aiFetch(env, 'ikstore', 'https://generativelanguage.googleapis.com/v1beta/models/' + (env.GEMINI_MODEL || 'gemini-2.5-flash') + ':generateContent', { method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { maxOutputTokens: maxTokens } }) });
      if (!r.ok) throw new Error('gemini ' + r.status + await errDetail(r));
      const d = await r.json(), c = (d.candidates || [])[0] || {};
      return { text: ((c.content && c.content.parts) || []).map(p => p.text || '').join(''), provider: 'gemini', stop: c.finishReason === 'MAX_TOKENS' ? 'max_tokens' : (c.finishReason || '') };
    } catch (e) { errs.push(e.message); }
  }
  throw new Error(errs.join(' / ') || 'AI 키가 없습니다');
}
