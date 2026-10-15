// Deliberately stores only bounded machine metadata; never accepts input text as a log field.
import {kvOf} from './_store.js';
const ISSUE_CODES = new Set(['unsupported-claim','semantic-review-unavailable','temperament-ratio','semantic-trait-duplicate','sentence-duplicate','hook-body-duplicate','paragraph-length','prohibited-claim','hook-evidence-missing','hook-length-or-format','hook-explanation-length','hook-unsafe-or-inconsistent','hook-generic-trait','hook-counter-evidence-omitted','missing-claim-reference','unknown-claim-reference','unknown-ref','invalid-json','paragraph-count','paragraph-id','paragraph-text','chapter-evidence-missing']);
const STAGES = ['writer-format','hook','grounding','chapter-quality','semantic-review'];
export const ERROR_TYPES = {
  'bad-payload':['CALCULATION_INPUT','calculation'],
  'too-large':['CALCULATION_INPUT','calculation'],
  'insufficient-evidence':['EVIDENCE_INSUFFICIENT','grounding'],
  'storage-unavailable':['KNOWLEDGE_UNAVAILABLE','knowledge'],
  'chapter-validation-failed':['CONSISTENCY_REJECTED','validation'],
  'ai-unavailable':['AI_GENERATION_FAILED','generation'],
  'no-ai':['AI_CONFIGURATION','generation'],
  'rate-limited':['SERVER_RATE_LIMIT','communication'],
  'cost-limit':['AI_COST_LIMIT','generation'],
  'pipeline-unavailable':['COMPOSITION_FAILED','composition'],
  'invalid-engine-mode':['COMPOSITION_CONFIGURATION','composition']
};
export function diagnosticRecord(body,status,ctx) {
  const type=ERROR_TYPES[body.error] || ['COMPOSITION_FAILED','composition'];
  const attempts=(body.providerAttempts || []).slice(0,8).map(a=>({
    provider:['openai','anthropic'].includes(a.provider)?a.provider:'unknown',
    status:['writer-returned','rejected','provider-call-failed','hook-format-repair-returned'].includes(a.status)?a.status:'unknown',
    stage:STAGES.includes(a.stage)?a.stage:null,
    error:/^provider-http-\d{3}(?:-(?:insufficient_quota|rate_limit_exceeded|billing_not_active|overloaded_error))?$/.test(a.error || '')?a.error:['provider-timeout','provider-call-error'].includes(a.error)?a.error:null
  }));
  const chapter=/^(?:c\d{2}|c-char|deep_[a-z_]+|life_[a-zA-Z_]+|reading_[a-z_]+)$/.test(ctx.chapter || '')?ctx.chapter:'other';
  return {requestId:ctx.requestId,at:new Date(ctx.started).toISOString(),chapter,
    ok:body.ok===true,cached:body.cached===true,status,code:body.ok?'OK':type[0],
    module:'movingtoon-reading',stage:body.ok?'complete':type[1],
    storageStage:['rules','settings','source-index','grounding','style','cache'].includes(body.storageStage)?body.storageStage:null,
    reproduction:body.ok?'accepted':type[0],
    issueCodes:[...new Set((body.validation?.issues || []).slice(0,30).map(x=>ISSUE_CODES.has(x.code)?x.code:'other-validation-issue'))],attempts,
    elapsedMs:Math.max(0,Date.now()-ctx.started)};
}
export async function saveDiagnostic(env,record) {
  // Same explicit collection switch as the existing viewer error log.
  if(env?.ERRLOG_ON!=='1')return;
  try { const kv=kvOf(env);if(kv)await kv.put('err:reading:'+record.at.slice(0,10)+':'+record.requestId,JSON.stringify(record),{expirationTtl:14*86400}); } catch { /* Logging cannot fail a reading. */ }
}
export function summarizeReadings(records) {
  const s={total:records.length,accepted:0,failed:0,cached:0,codes:{},chapters:{},validationAttempts:0,rejectedAttempts:0};
  records.forEach(r=>{s[r.ok?'accepted':'failed']++;if(r.cached)s.cached++;s.codes[r.code]=(s.codes[r.code]||0)+1;
    const c=s.chapters[r.chapter] || (s.chapters[r.chapter]={total:0,failed:0});c.total++;if(!r.ok)c.failed++;
    (r.attempts || []).forEach(a=>{if(a.status==='writer-returned')s.validationAttempts++;if(a.status==='rejected')s.rejectedAttempts++;});});
  s.successRate=s.total?s.accepted/s.total:null;
  return s;
}
