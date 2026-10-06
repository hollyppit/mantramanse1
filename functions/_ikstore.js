// 풀이 지식(IK)·풀이 자료(SRC) API 가 함께 쓰는 저장·AI 도우미. 파일명이 _로 시작해 라우트로 노출되지 않는다.
import { DOMAINS } from './_ik.js';

export const MAX_PER_DOMAIN = 2000, MAX_BYTES = 20 * 1024 * 1024, TIMEOUT_MS = 40000;
export const dkey = d => 'ik:d:' + d;
export const loadDomain = async (kv, d) => (await kv.get(dkey(d), 'json')) || [];
export async function loadAll(kv, domains) { const ds = domains || Object.keys(DOMAINS); return (await Promise.all(ds.map(d => loadDomain(kv, d)))).flat(); }
export async function meta(kv) { return (await kv.get('ik:meta', 'json')) || { k: 'k0', d: 'd0', r: 'r0' }; }
export async function bump(kv, which) { const m = await meta(kv); m[which] = which + Date.now().toString(36); await kv.put('ik:meta', JSON.stringify(m)); return m; }
export const scrub = sd => { if (!sd || typeof sd !== 'object') return sd; const c = { ...sd }; delete c.birth; return c; }; // 생년월일·출생시는 풀이 계층에 필요 없다
export function nextId(items, domain) { const re = new RegExp('^' + domain + '-(\\d+)$'); let mx = 0; for (const x of items) { const m = re.exec(x.id); if (m) mx = Math.max(mx, +m[1]); } return domain + '-' + ('0000' + (mx + 1)).slice(-4); }

// 풀이 자료 정책에 따라 production 에서 빼야 하는 자료 id (비활성 또는 "Production 풀이 사용" OFF)
export async function blockedDocs(kv) { const idx = (await kv.get('src:idx', 'json')) || []; return new Set(idx.filter(d => d.active === false || (d.policy && d.policy.production === false)).map(d => d.id)); }

// 실패 응답의 error.message 를 짧게 덧붙인다 (400 의 실제 원인을 관리자 화면에서 볼 수 있게)
async function errDetail(r) {
  try { const j = await r.json(); const m = (j && j.error && (j.error.message || j.error)) || ''; return m ? ': ' + String(m).slice(0, 200) : ''; } catch { return ''; }
}

export async function llm(env, system, user, maxTokens = 6000, timeoutMs = TIMEOUT_MS) {
  const errs = [];
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }) });
      if (!r.ok) throw new Error('anthropic ' + r.status + await errDetail(r));
      const d = await r.json(); return { text: (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), provider: 'anthropic', stop: d.stop_reason || '' };
    } catch (e) { errs.push(e.message); }
  }
  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(timeoutMs), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: system, input: user }) });
      if (!r.ok) throw new Error('openai ' + r.status + await errDetail(r));
      const d = await r.json(); return { text: typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join(''), provider: 'openai' };
    } catch (e) { errs.push(e.message); }
  }
  throw new Error(errs.join(' / ') || 'AI 키가 없습니다');
}
