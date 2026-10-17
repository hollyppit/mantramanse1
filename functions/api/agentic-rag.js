import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';
import { PREFIX, FLAGS, audit, plan, propose, withdraw } from '../_agentic-rag.js';
import { readState } from '../_rag-state.js';
import { saveConfig, startResearch, tickResearch, controlResearch, publishCandidate, rollbackCandidate, scheduledResearch } from '../_rag-runner.js';

export async function onRequest({ request, env }) {
  const action = new URL(request.url).searchParams.get('a') || 'dashboard';
  const scheduler=action==='scheduled'&&request.method==='POST'&&isAdmin(request,{ADMIN_PASSWORD:env.RAG_SCHEDULER_SECRET});
  if (!scheduler&&!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!['GET','POST'].includes(request.method)) return json({ error: '허용되지 않은 메서드' }, 405);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const kv = kvOf(env);
  try {
    if (request.method === 'GET' && action === 'dashboard') {
      const id = await kv.get(PREFIX + 'latest', 'json');
      const runtime=await readState(kv);
      return json({ flags: FLAGS, report: id ? await kv.get(PREFIX + 'audit:' + id, 'json') : null, runtime, capabilities: { audit: true, planner: true, search: !!env.BRAVE_SEARCH_API_KEY, extractor:!!(env.RAG_OPENAI_API_KEY||env.OPENAI_API_KEY), atomicStorage:!!kv.researchCAS, automaticPublication:true, appliedRollback:true }, preservation: '기존 자료·지식·승인·게시 상태 변경 없음' });
    }
    if (request.method === 'POST') {
      if (+(request.headers.get('content-length') || 0) > 65536) return json({ error: '요청이 너무 큽니다' }, 413);
      const raw = await request.text(); if (new TextEncoder().encode(raw).length > 65536) return json({ error: '요청이 너무 큽니다' }, 413);
      const input = JSON.parse(raw || '{}');
      if(action==='scheduled')return json(await scheduledResearch(kv,env));
      if(action==='settings')return json({config:await saveConfig(kv,input.config,input.expectRevision)});
      if(action==='start')return json(await startResearch(kv,env));
      if(action==='tick')return json(await tickResearch(kv,env));
      if(['stop','resume','recover'].includes(action))return json({event:await controlResearch(kv,action,input.id,input.reason)});
      if(action==='publish')return json({candidate:await publishCandidate(kv,input.id,input.expectRevision,input.reason)});
      if(action==='rollback')return json({event:await rollbackCandidate(kv,input.id,input.expectRevision,input.reason)});
      if (action === 'audit') return json({ report: await audit(kv) });
      if (action === 'plan') { const id = await kv.get(PREFIX + 'latest', 'json'); if (!id) return json({ error: '먼저 진단을 실행하세요' }, 409); return json({ tasks: await plan(kv, await kv.get(PREFIX + 'audit:' + id, 'json')) }); }
      if (action === 'propose') return json({ change: await propose(kv, input) });
      if (action === 'withdraw') return json({ event: await withdraw(kv, input.id) });
    }
    return json({ error: '지원하지 않는 작업입니다' }, 400);
  } catch (e) { return json({ error: e instanceof SyntaxError ? '잘못된 JSON입니다' : e.message }, 400); }
}
