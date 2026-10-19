import { compactPrompt, PROMPT_VERSION } from '../_reading-prompt.js';
import { recordGap, recordCoverageGap, readingEnvironment } from '../_reading-block-store.js';
import { singleFlight, distributedFlight } from '../_reading-flight.js';
import { aiFetch, writeAIEvent } from '../_ai-cost.js';
import { blockKey, composeBlocks, mergeGenerated, digest, BLOCK_VERSION } from '../_reading-blocks.js';
import { inspectWriting, writingPlan, writingDirective } from '../_ux-writing.js';
import {Editorial,loadEditorial,contractFor,selectCases,behaviorPlans,contractDomains,applyContractPolicy} from '../_editorial.js';
import { diagnosticRecord, saveDiagnostic } from '../_reading-diagnostics.js';
import { writerSchema, reviewSchema, repairSchema } from '../_chapter-output-schema.js';
import { chapterPolicy, chapterInstruction, CHAPTER_DEFAULTS } from '../_chapter-policy.js';
import { CHAPTER_VERSION, selectChapterClaims, buildHook, chapterQuality, REVIEW_SYSTEM, reviewPayload, parseReview, validateHook, chartFingerprint, claimSignature } from '../_chapter-engine.js';
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadServiceAll as loadAll, blockedDocs, meta } from '../_ikstore.js';
import { VERSION, validate, sources, sanitize, allowedOutputNumbers, systemFor, domainsFor } from '../_movingtoon-reading.js';
import { loadStyle, styleFor } from '../_stylestore.js';
import { analyze, sourceGenderScope, missingSourceRules, ENGINE_VERSION, WRITER_SYSTEM, validateWritten } from '../_interpretation-engine.js';
import { loadSettings, loadSourceIndex } from '../_interpretation-store.js';
export async function generate(env, provider, input, SYSTEM, settings = {}) {
  const started = Date.now(), isOpen = provider === 'openai';
  if(settings.outputSchema)input=compactPrompt(input);
  const maxTokens = settings.maxOutputTokens || 14000;
  const body = isOpen ? { model: settings.openaiModel || env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: SYSTEM, input, max_output_tokens: maxTokens } : { model: settings.anthropicModel || env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content: input }] };
  if(!isOpen && settings.disableThinking)body.thinking={type:/^claude-sonnet-5\.5|^claude-sonnet-5-5/.test(body.model)?'between_tools':'disabled'};
  if(isOpen && settings.reasoningEffort && /^(?:gpt-[5-9]|o[134])/.test(body.model))body.reasoning={effort:settings.reasoningEffort};
  if(settings.outputSchema){
    if(isOpen)body.text={format:{type:'json_schema',name:'chapter_result',strict:true,schema:settings.outputSchema}};
    else body.output_config={format:{type:'json_schema',schema:settings.outputSchema}};
  }
  const headers = isOpen ? { authorization: 'Bearer ' + env.OPENAI_API_KEY } : { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' };
  const r = await aiFetch(env, settings.telemetryPurpose || 'reading-generate', isOpen ? 'https://api.openai.com/v1/responses' : 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(Math.max(1, Math.min(settings.longRequest ? 100000 : isOpen ? 40000 : 55000, settings.timeoutMs || (isOpen ? 40000 : 55000)))), headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { let detail;try{detail=(await r.json())?.error;}catch{} const known=['insufficient_quota','rate_limit_exceeded','billing_not_active','overloaded_error'].find(x=>x===detail?.code || x===detail?.type), message=String(detail?.message || '');const code=known || (/insufficient.quota|exceeded your current quota|billing hard limit/i.test(message)?'insufficient_quota':/rate limit|tokens per min|requests per min/i.test(message)?'rate_limit_exceeded':'');const error=Error('provider-http-'+r.status+(code?'-'+code:''));
    error.providerReason=/schema|output_config|response_format|text.format/i.test(message)?'schema-unsupported':/model/i.test(message)?'model-configuration':/credit|balance|billing/i.test(message)?'billing':/max.*token|token.*max/i.test(message)?'token-limit':'request-rejected';throw error; }
  const d = await r.json();
  const text = isOpen ? d.output_text || (d.output || []).flatMap(x => x.content || []).map(x => x.text || '').join('') : (d.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
  return { text, stopReason:['end_turn','max_tokens','tool_use','stop_sequence','refusal','pause_turn'].includes(d.stop_reason)?d.stop_reason:null, contentKinds:[...new Set((d.content||[]).map(x=>x.type).filter(x=>['text','thinking','redacted_thinking','tool_use'].includes(x)))], completionStatus: ['completed','incomplete','failed'].includes(d.status)?d.status:null, incompleteReason: ['max_output_tokens','content_filter'].includes(d.incomplete_details?.reason)?d.incomplete_details.reason:null, model: String(d.model || body.model).slice(0, 120), elapsedMs: Date.now() - started, usage: usageOf(d.usage) };
}
export function usageOf(u) {
  if (!u || typeof u !== 'object') return null;
  const n = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
  return { inputTokens: n(u.input_tokens), outputTokens: n(u.output_tokens), totalTokens: n(u.total_tokens), cachedInputTokens: n(u.input_tokens_details?.cached_tokens) };
}
export function analyzeChapter(sd,items,opts){
  const base=analyze(sd,items,opts);if(base.claims.length || !opts.domains?.length)return base;
  const cross=items.filter(r=>!opts.domains.includes(r.domain)&&opts.domains.some(d=>(r.tags || []).includes('also:'+d))).map(r=>{const domain=opts.domains.find(d=>r.tags.includes('also:'+d));return {...sourceGenderScope(r),domain,chapterRouting:{sourceDomain:r.domain,routedDomain:domain,crossTopicTag:'also:'+domain}};});
  if(!cross.length)return base;const routed=analyze(sd,cross,opts);return {...routed,claims:routed.claims.map(c=>({...c,routing:cross.find(r=>r.id===c.knowledge_id).chapterRouting}))};
}

async function handleReading({ request, env }, context) {
  let clean, original;
  try { const raw = await request.text(); if (raw.length > 160000) return json({ ok: false, error: 'too-large' }, 413); original = JSON.parse(raw); clean = validate(original); } catch { }
  if (!clean) return json({ ok: false, error: 'bad-payload' }, 400);
  context.chapter = clean.chapter.id;
  clean.guide = original.guide === 'female' ? 'female' : 'male'; // 캐시도 안내자별로 분리한다.
  const requestStarted=Date.now(),providerAttempts=[];
  let storageStage='rules';
  let kv, key, src, sty, analysis, settings, mode, policy, hook, hookDraft, previous = [], lastRejection = null, privateRequest=false, hybrid=null, editorial, contract, examples=[], userContext=Editorial.cleanContext(original.realityContext);
  try {
    // Rule/source deactivation must be observed before reusing any AI cache.
    kv = kvOf(env);
    const [items, blocked, version] = kv ? await Promise.all([loadAll(kv), blockedDocs(kv), meta(kv)]) : [[], new Set(), {}];
    storageStage='settings';settings = {...await loadSettings(kv),...(env.__READING_SETTINGS || {})};
    editorial=await loadEditorial(kv);contract=contractFor(editorial,clean.chapter);
    mode = env.INTERPRETATION_ENGINE_MODE || settings.mode;
    policy = chapterPolicy(clean.chapter, settings.chapters);
    if(contract){const kind=editorial.topics.find(t=>t.id===contract.topicId)?.policyKind || contract.topicId;policy=chapterPolicy({...clean.chapter,chapterKind:kind},settings.chapters)||policy;policy=applyContractPolicy(policy,editorial,contract);}
    privateRequest=Object.keys(userContext || {}).length>0 || (Array.isArray(original.previous)&&original.previous.length>0);
    previous = (Array.isArray(original.previous) ? original.previous : []).slice(-80).filter(p => p && typeof p.text === 'string' && p.text.length<=1200).map(p=>({id:String(p.id || '').slice(0,100),chapter:String(p.chapter || '').slice(0,80),title:String(p.title || '').slice(0,150),text:p.text}));
    if (!['legacy','shadow','grounded'].includes(mode)) return json({ ok: false, error: 'invalid-engine-mode' }, 503);

    if (mode !== 'legacy' || policy?.hook.enabled) {
      storageStage='source-index';const sourceIndex = await loadSourceIndex(kv, items, blocked);
      const missingSources=missingSourceRules(items,contract?.sourceRuleIds,sourceIndex,blocked);
      if(missingSources.length)await recordGap(kv,{chapter:clean.chapter.id,claims:missingSources.map(knowledge_id=>({knowledge_id})),missing:['source-evidence'],reason:'insufficient-evidence'});
      storageStage='grounding';analysis = analyzeChapter(original.sd, items, { ...settings, sourceIndex, blockedDocs: blocked, domains: contract?.state==='active'?contractDomains(editorial,contract):policy && ['timing','remedy'].includes(policy.key) ? undefined : domainsFor(clean.chapter) });
      if(contract?.state==='active'){
        const linked=new Set(contract.sourceRuleIds),terms=[contract.title,...contract.requiredEvidence].join(' ').split(/[\s·/()]+/).filter(x=>x.length>1);
        const score=c=>(linked.has(c.knowledge_id)?100:0)+terms.filter(t=>[c.judgment,...c.traditional_rules.map(r=>r.principle)].join(' ').includes(t)).length;
        analysis={...analysis,claims:analysis.claims.slice().sort((a,b)=>score(b)-score(a)).slice(0,18)};
      }
      analysis = selectChapterClaims(analysis, policy);
      examples=selectCases(editorial,contract,analysis.claims,userContext);
      hook = await buildHook(analysis, policy, settings);
      if(hook?.source === 'verified-rule'){hookDraft=hook;hook=null;}
      if (mode === 'grounded' && !analysis.claims.length) {await recordGap(kv,{chapter:clean.chapter.id,claims:(contract?.sourceRuleIds||[]).map(knowledge_id=>({knowledge_id})),reason:'insufficient-evidence'});return json({ ok: false, error: 'insufficient-evidence', engine: ENGINE_VERSION, engineMode: mode, warnings: analysis.warnings }, 422);}
    }
    src = sources(items, clean.sd, blocked, clean.chapter);
    // Explicitly authorized writer payload: excludes names and raw birth dates.
    if (mode === 'grounded') src = { chart: analysis.normalized.chart, facts: analysis.normalized.saju, knowledge: analysis.claims.map(c => ({ id: c.knowledge_id, interpretation: c.judgment })), claims: analysis.claims, cross_analysis: analysis.cross_analysis };
    storageStage='style';sty = styleFor(await loadStyle(kv), [contract && !Editorial.find(editorial,clean.chapter) ? contract.id : clean.chapter.id, ...domainsFor(clean.chapter)], { soft: src.knowledge.length < 2, consent: original.directnessConsent === 5 });
    if (hook && !inspectWriting([{id:'hook',text:hook.text},{id:'explanation',text:hook.explanation}],{...sty.writing,paragraphChars:500}).ok) {hookDraft=hook;hook=null;}
    // Runtime gates preserve the existing evidence and chapter quality contract.
    if(kv && mode==='grounded' && env.READING_BLOCK_MODE==='prefer' && !Object.keys(userContext || {}).length){
      const library=await kv.get(blockKey(clean.chapter.id),'json') || [];
      const assembled=await composeBlocks(library.filter(b=>!(env.__READING_OMIT_BLOCK_IDS||[]).includes(b.id)),{clean,analysis,styleSignature:sty.sig,previous,allowCandidates:env.__READING_ALLOW_CANDIDATES===true});
      if(assembled.result.paragraphs.length){
        const selectedClean={...clean,chapter:{...clean.chapter,paragraphs:clean.chapter.paragraphs.filter(p=>assembled.result.paragraphs.some(b=>b.id===p.id))}};
        const safe=sanitize(JSON.stringify(assembled.result),selectedClean,src,{deep:true});
        if(safe && validateWritten(safe,analysis,selectedClean).ok && inspectWriting(safe.paragraphs.map(p=>({...p,role:clean.chapter.paragraphs.find(s=>s.id===p.id)?.role})),sty.writing,{concept:/일간|일주/.test(clean.chapter.title),previous}).ok)hybrid=assembled;
      }
      if(assembled.missing.length)await recordGap(kv,{chapter:clean.chapter.id,claims:analysis.claims,missing:assembled.missing});
      if(assembled.hook && validateHook(assembled.hook,analysis,policy).ok)hook={...assembled.hook,fingerprint:await chartFingerprint(analysis)};
      if(assembled.ok){
        const result=sanitize(JSON.stringify(assembled.result),clean,src,{deep:true});
        const validation=result && validateWritten(result,analysis,clean);
        const blockHook=hook || (assembled.hook && validateHook(assembled.hook,analysis,policy).ok ? {...assembled.hook,fingerprint:await chartFingerprint(analysis)} : null) || (hookDraft && validateHook(hookDraft,analysis,policy).ok ? hookDraft : null);
        const writingQuality=result && inspectWriting(result.paragraphs.map(p=>({...p,role:clean.chapter.paragraphs.find(x=>x.id===p.id)?.role})),sty.writing,{concept:/일간|일주/.test(clean.chapter.title),previous});
        const quality=result && chapterQuality(result,analysis,policy,previous,blockHook);
        if(hybrid && quality && !quality.ok){
          const bad=new Set(quality.issues.map(i=>String(i.id)).filter(id=>clean.chapter.paragraphs.some(p=>p.id===id)));
          if(!bad.size && clean.chapter.paragraphs.length)bad.add(clean.chapter.paragraphs[0].id);
          hybrid={...hybrid,ok:false,missing:[...new Set([...hybrid.missing,...bad])],result:{paragraphs:hybrid.result.paragraphs.filter(p=>!bad.has(p.id))},blocks:hybrid.blocks.filter(b=>!bad.has(b.paragraphId))};
        }

        if(!assembled.provisional && result && validation?.ok && writingQuality?.ok && (!quality || quality.ok) && (!policy?.hook.enabled || blockHook) && (!blockHook || inspectWriting([{id:'hook',text:blockHook.text},{id:'explanation',text:blockHook.explanation}],{...sty.writing,paragraphChars:500}).ok)){
          return json({ok:true,blockStyleSignature:sty.sig,generatedParagraphCount:0,reusedBlocks:assembled.blocks,result,provider:'reading-blocks',cached:false,aiSkipped:true,blocks:assembled.blocks,chapterVersion:CHAPTER_VERSION,chapterPolicy:policy,chapterQuality:quality,hook:blockHook,writingQuality,knowledgeCount:src.knowledge.length,style:sty.meta,generation:{model:null,usage:null,estimatedCost:0,costScope:'no-provider-call',promptVersion:BLOCK_VERSION},interpretation:{version:analysis.version,mode,claims:analysis.claims,features:analysis.features,cross_analysis:analysis.cross_analysis,warnings:analysis.warnings,quality:analysis.quality,validation}});
        }
      }
    }
    storageStage='cache';const cacheMaterial={ promptTransport:PROMPT_VERSION, editorialVersion:editorial.version,contract,examples,userContext,chapterVersion: CHAPTER_VERSION, readingPipelineVersion: 'reading-block-hybrid-2', blockVersions:hybrid?.blocks || [], hook, hookDraft, version: VERSION, engine: ENGINE_VERSION, mode, settings, claims: analysis?.claims, db: version, style: sty.sig, clean, models: [env.OPENAI_MODEL, env.ANTHROPIC_MODEL] };
    const legacyHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(cacheMaterial,(k,v)=>k==='asOf'?undefined:v)));
    const legacyKey='ai:movingtoon:'+Array.from(new Uint8Array(legacyHash),x=>x.toString(16).padStart(2,'0')).join('');
    const routeHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(cacheMaterial,(k,v)=>['asOf','outline'].includes(k)?undefined:v)));
    const routeKey='ai:movingtoon:'+Array.from(new Uint8Array(routeHash),x=>x.toString(16).padStart(2,'0')).join('');
    if(contract)cacheMaterial.clean={...clean,chapter:{...clean.chapter,id:contract.id,base:'',paragraphs:clean.chapter.paragraphs.map(({id,role})=>({id,role}))}};
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(cacheMaterial,(k,v)=>['asOf','outline'].includes(k)?undefined:v)));
    key = 'ai:movingtoon:' + [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (kv) {
      const hit = privateRequest || env.__READING_BYPASS_CACHE ? null : await kv.get(key,'json') || await kv.get(routeKey,'json') || await kv.get(legacyKey,'json');
      const cachedWriting = hit && inspectWriting(hit.result.paragraphs.map(p=>({...p,role:clean.chapter.paragraphs.find(x=>x.id===p.id)?.role})),sty.writing,{concept:/일간|일주/.test(clean.chapter.title),previous:[]});
      if (hit && cachedWriting.ok && (!hit.hook || analysis && validateHook(hit.hook,analysis,policy).ok) && sanitize(JSON.stringify(hit.result), clean, src, { deep: mode === 'grounded' }) && (mode !== 'grounded' || validateWritten(hit.result, analysis, clean).ok)) {await kv.put(key,JSON.stringify(hit),{expirationTtl:604800});return json({ok:true,...hit,cached:true});}
      const hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10), ip = request.headers.get('cf-connecting-ip') || 'local';
      const hk = 'rl:movingtoon:' + ip + ':' + hour, dk = 'rl:movingtoon:day:' + day;
      const [h, d] = await Promise.all([kv.get(hk), kv.get(dk)]);
      if ((+h || 0) >= (+env.MOVINGTOON_HOURLY_LIMIT || 100) || (+d || 0) >= (+env.MOVINGTOON_DAILY_LIMIT || 6000)) return json({ ok: false, error: 'rate-limited', engineMode: mode }, 429);
      await Promise.all([kv.put(hk, String((+h || 0) + 1), { expirationTtl: 7200 }), kv.put(dk, String((+d || 0) + 1), { expirationTtl: 172800 })]);
    }
  } catch { return json({ ok: false, error: 'storage-unavailable', storageStage, engineMode: mode }, 503); }
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'no-ai', engineMode: mode }, 503);
  async function generateChapter(){
  const writerClean=hybrid?{...clean,chapter:{...clean.chapter,paragraphs:clean.chapter.paragraphs.filter(p=>hybrid.missing.includes(p.id))}}:clean;
  const allowedNumbers=allowedOutputNumbers(clean,src);
  const verifiedTimingClaimIds=(analysis?.claims || []).filter(c=>c.elements.some(r=>/daewoon|seun|monthSeason|futureSeason/.test(r.key))).map(c=>c.claim_id);
  const input = JSON.stringify({ requiredCoverage:policy?.required || [], ...(mode==='grounded'?writingPlan(analysis,clean):src), behaviorPlans:behaviorPlans(analysis?.claims,examples), realityContext:Editorial.contextLabels(userContext),examples,chapterContract:contract ? {...contract,sourceRuleIds:(analysis?.claims || []).map(c=>c.knowledge_id)} : null, allowedNumbers, verifiedTimingClaimIds, chapter: writerClean.chapter, reusedParagraphs:hybrid?.result.paragraphs || [],blockRepairIssues:env.__READING_REPAIR_ISSUES||[], outline: clean.outline, chapterPolicy: policy, previous, hookDraft: hookDraft ? {text:hookDraft.text,explanation:hookDraft.explanation,claim_id:hookDraft.claim_id}:null, hook: hook ? { text: hook.text, explanation: hook.explanation, claim_id: hook.claim_id } : null });
  let writerSystem = mode === 'grounded' ? WRITER_SYSTEM + '\n[표현 설정]\n' + (sty.directive || '') + '\n위 표현 설정은 판단·근거·불확실성을 변경하지 않는다.' : systemFor(sty);
  writerSystem += '\n'+Editorial.instruction(contract)+'\n[현실 정보 분리] realityContext는 사용자가 선택한 실제 상황이고 명리 근거가 아니다. 비어 있는 답변은 추정하지 않는다. examples는 검수된 가정 사례이며 사용자가 겪은 사실로 쓰지 않는다. 현실 답변은 사례·전략 선택에만 쓰고 원국·판단·계산은 변경하지 않는다.';
  writerSystem += '\n[안내자 공통 문체] 안내자 종류와 사용자 성별에 관계없이 풀이·후킹·사례 모두 자연스러운 존댓말로 작성한다. ~해보세요를 허용한다. 전생도 가정의 맥락을 유지하고 존댓말로 쓴다.';
  if (policy) writerSystem += '\n'+chapterInstruction(policy);
  writerSystem += '\n출력 숫자는 allowedNumbers에 있는 값만 사용한다. 현실 전략에도 새로운 기간·횟수·비율·금액·연도를 만들지 말고 숫자 없이 관찰 가능한 행동으로 설명한다. 문단은 최소 30자, 최대 길이는 챕터 정책을 따른다. 반드시·무조건·확정·수익률이라는 단어를 쓰지 않는다. 예측 한계는 전통 해석이며 실제 결과를 보장하지 않습니다처럼 설명한다. 기초 계산값이 존재하는데 계산값 자체가 없다고 말하지 않는다. 검수된 해석 규칙이 부족할 때는 계산표는 있으나 해당 작용을 해석할 규칙의 근거가 부족하다고 구분한다. verifiedTimingClaimIds가 비어 있으면 운의 간지·기간은 사실로 안내할 수 있지만 그 시기의 돈·관계·직업 작용을 만들지 않는다.';
  if (policy?.hook.enabled && analysis?.claims.length && !hook) writerSystem += '\n동일 JSON에 독립 hook 추가: '+JSON.stringify({text:'해당 주제의 가장 중요한 조건 한 가지. 최대 '+policy.hook.maxChars+'자',explanation:(policy.hook.explanationSentences===3?'2~3':'2')+'문장, 최대 '+policy.hook.explanationMaxChars+'자',claim_id:'검증된 단일 claim_id'})+'\n후킹 문체: '+policy.hook.style+'\nhookDraft가 있으면 그 판단 ID를 유지한다. 후킹에는 선택한 판단의 생활 속 결론을 쓰고 전문 용어와 계산 비중은 별도 근거에 남긴다. 누구나 원하는 인정·사랑·성공에 관한 문장을 단독 선언으로 쓰지 않는다. 후킹은 원문 소개나 일반적인 위로 대신 실제 계산 조건과 해당 주제의 결과·선택을 연결하는 간결한 선언으로 쓴다. 원문을 그대로 복사하지 않는다. 후킹을 먼저 작성한 뒤 본문에서 같은 핵심 선언을 반복하지 않는다. 본문은 적용 상황·구체 사례·대응 방법을 확장하고 후킹과 비슷한 문장을 다시 쓰지 않는다.\n새 명리 판단을 만들지 말고 선택한 판단의 조건과 예외를 보존한다. 한국어만 사용한다.';
  writerSystem += '\n본문의 각 문단은 생활의 판단이나 대응으로 시작한다. 검수된 판단·검수된 근거·검수된 규칙이라는 내부 처리 표현을 문단마다 반복하지 않는다. 근거가 부족한 경우에는 현재 자료만으로 해당 작용을 판단하기 어렵다고 짧게 설명한다. 불확실성을 유지하면서 실제 상황과 선택을 직접 설명한다. 원문이 경향·가능성을 말하면 조건문 뒤에도 마찰이 생긴다·손실로 이어진다·환경 변화가 따른다고 결과를 단정하지 말고 그럴 수 있다는 가능성을 유지한다. 행동 권유는 직접 쓰되 그 효과를 보장하지 않는다.';
  writerSystem += '\n[필수 항목 적용] requiredCoverage의 각 항목은 전달된 claims에서 근거를 찾고, 근거가 있으면 사용자 원국의 해당 사실과 생활 적용을 본문에 명시한다. 근거 문헌의 일반 소개만으로 대신하지 않는다. 근거가 없으면 해당 판단의 한계를 짧게 밝히고 새로운 해석을 만들지 않는다. 계산 수치·명리 용어는 evidence 역할에 필요한 만큼만 쓰고 생활 문단에서 반복하지 않는다.';
  if(hybrid)writerSystem+='\nreusedParagraphs는 이미 승인된 고정 본문입니다. 문맥 연결에 참고하되 수정하거나 다시 출력하지 마세요. chapter.paragraphs에 있는 부족한 id만 작성합니다. 빈 배열이면 paragraphs:[]와 필요한 hook만 출력합니다.';
  // UTF-8 bytes are a conservative token upper bound for budget reservation.
  const estimatedMaxCost = settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? ((new TextEncoder().encode(input + writerSystem).length + 512) * settings.inputPricePerMillion + settings.maxOutputTokens * settings.outputPricePerMillion) / 1e6 : null;
  if (settings.maxRequestCost != null && (estimatedMaxCost == null || estimatedMaxCost * (mode === 'grounded' && policy && settings.semanticReview ? 4 : 3) * ((env.OPENAI_API_KEY ? 2 : 0)+(env.ANTHROPIC_API_KEY ? 1 : 0)) > settings.maxRequestCost)) return json({ ok: false, error: 'cost-limit', estimatedMaxCost, engineMode: mode }, 429);
  const fixedHook=hook, deadline=requestStarted+165000;
  let lastCandidate=null, openaiUnavailable=false;
  const attempts=[['openai','OPENAI_API_KEY'],['openai','OPENAI_API_KEY'],['anthropic','ANTHROPIC_API_KEY']];
  for (let [attemptIndex, [provider, secret]] of attempts.entries()) {
    if(attemptIndex===2 && !openaiUnavailable && lastRejection && lastCandidate && env.OPENAI_API_KEY){provider='openai';secret='OPENAI_API_KEY';}
    if(attemptIndex===1 && openaiUnavailable){provider='anthropic';secret='ANTHROPIC_API_KEY';}
    else if(attemptIndex===1 && (!lastRejection || !lastCandidate))continue;
    if (!env[secret]) continue;
    if(Date.now()>=deadline)break;
    hook=fixedHook;
    try {
      const generation = hybrid && !writerClean.chapter.paragraphs.length && (!policy?.hook.enabled || hook) ? {text:JSON.stringify({paragraphs:[]}),model:'reading-blocks',elapsedMs:0,usage:{inputTokens:0,outputTokens:0,totalTokens:0,cachedInputTokens:0}} : await generate(env, provider, lastRejection ? input+'\n[검수 보완] 아래 이전 본문에서 지적된 누락·오류만 보완하고 나머지 유효한 설명과 근거를 유지한다. 필수 항목의 근거가 있으면 사용자 원국에 어떻게 적용되는지 명시한다. 근거가 없는 항목은 판단 한계를 설명한다. 원문 소개만 하고 사용자 적용을 생략하지 않는다. JSON 전체를 반환한다.\n'+JSON.stringify({previousCandidate:hybrid?{...lastCandidate,paragraphs:lastCandidate.paragraphs.filter(p=>hybrid.missing.includes(p.id))}:lastCandidate,issues:lastRejection.issues || [],coverage:lastRejection.coverage || []}) : input, writerSystem, {...settings,telemetryPurpose:lastRejection?'reading-retry':'reading-generate',outputSchema:mode === 'grounded' ? writerSchema(writerClean,src,!!(policy?.hook.enabled && analysis?.claims.length && !hook),hookDraft?.claim_id) : undefined,maxOutputTokens:Math.min(settings.maxOutputTokens || 14000,Math.max(6000,clean.chapter.paragraphs.length*850)),reasoningEffort:settings.reasoningEffort || 'low',longRequest:true,timeoutMs:Math.min(60000,deadline-Date.now())});
      if(hybrid)generation.text=JSON.stringify(mergeGenerated(clean,hybrid,JSON.parse(generation.text)));
      try{lastCandidate=JSON.parse(generation.text);}catch{lastCandidate=null;}
      providerAttempts.push({provider,status:'writer-returned',elapsedMs:generation.elapsedMs});
      const rejected=(stage,v)=>{lastRejection=v;providerAttempts.push({provider,status:'rejected',stage,issues:(v?.issues || []).map(x=>({code:x.code,id:x.id,reason:x.reason})),elapsedMs:Date.now()-requestStarted});};
      const diagnostics=[];
      const result = sanitize(generation.text, clean, src, { deep: mode === 'grounded',diagnostics }); if (!result) {rejected('writer-format',{issues:diagnostics});continue;}
      const roleMap = new Map(clean.chapter.paragraphs.map(p=>[p.id,p.role]));
      const inspect = paragraphs => inspectWriting(paragraphs.map(p=>({...p,role:roleMap.get(p.id)})),sty.writing,{concept:/일간|일주/.test(clean.chapter.title),previous});
      const writingQuality = inspect(result.paragraphs);
      if (!writingQuality.ok) {
        const badIds = new Set(writingQuality.issues.filter(x=>x.severity==='FAIL').map(x=>x.id));
        if (deadline-Date.now()<12000) {rejected('ux-writing',writingQuality);continue;}
        const repair = await generate(env,provider,JSON.stringify({source:JSON.parse(input),issues:writingQuality.issues,paragraphs:result.paragraphs.filter(p=>badIds.has(p.id))}),writingDirective(sty.writing)+'\n역술 판단을 새로 하지 않는 UX 문장 편집자입니다. 수정 대상으로 전달된 문단 id만 JSON의 paragraphs로 반환합니다. refs와 claim_ids는 원래 배열을 그대로 보존합니다. 지적된 전문 용어를 생활의 의미로 설명하고 나머지 조건·불확실성을 보존합니다. 문장 전체를 자연스러운 존댓말로 재작성하며 새 장점·약점·사건을 추가하지 않습니다.',{...settings,telemetryPurpose:'reading-writing-repair',maxOutputTokens:Math.min(settings.maxOutputTokens,4000),timeoutMs:deadline-Date.now()});
        let patches; try {patches=JSON.parse(repair.text).paragraphs;} catch {}
        if (!Array.isArray(patches) || patches.length!==badIds.size || new Set(patches.map(p=>p.id)).size!==badIds.size || patches.some(p=>!badIds.has(p.id))) {rejected('ux-repair-format',writingQuality);continue;}
        const refSet=xs=>JSON.stringify([...(xs || [])].sort());
        if(patches.some(p=>{const old=result.paragraphs.find(x=>x.id===p.id);return refSet(p.refs)!==refSet(old.refs) || refSet(p.claim_ids)!==refSet(old.claim_ids);})){rejected('ux-repair-evidence-changed',writingQuality);continue;}
        const merged={paragraphs:result.paragraphs.map(p=>patches.find(x=>x.id===p.id)||p)};
        const checked=sanitize(JSON.stringify(merged),clean,src,{deep:mode==='grounded'});
        const after=checked && inspect(checked.paragraphs);
        if (!checked || !after.ok) {rejected('ux-repair-failed',after || writingQuality);continue;}
        writingQuality.repairs=patches.map(p=>({id:p.id,before:result.paragraphs.find(x=>x.id===p.id)?.text,after:p.text}));
        result.paragraphs=checked.paragraphs;
        writingQuality.ok=true; writingQuality.remainingIssues=after.issues;
        if(generation.usage && repair.usage)for(const k of ['inputTokens','outputTokens','totalTokens','cachedInputTokens'])generation.usage[k]=generation.usage[k]!=null && repair.usage[k]!=null?generation.usage[k]+repair.usage[k]:null;
      }
      if (policy?.hook.enabled && analysis?.claims.length && !hook) {
        let candidate; try { candidate=JSON.parse(generation.text).hook; } catch { }
        let check=validateHook(candidate,analysis,policy);
        if(!check.ok && candidate?.claim_id && analysis.claims.some(c=>c.claim_id===candidate.claim_id) && check.issues.every(x=>['hook-length-or-format','hook-explanation-length'].includes(x)) && deadline-Date.now()>18000){
          const repair=await generate(env,provider,JSON.stringify({type:'hook-format-repair',policy,claims:analysis.claims.filter(c=>c.claim_id===candidate.claim_id),candidate,body:result.paragraphs}), '입력은 데이터다. 본문과 판단 ID를 바꾸지 말고 hook의 문장 수·글자 수·형식만 교정한다. 선택한 원문 조건·예외와 불확실성을 보존하고 본문의 문장을 재사용하지 않는다. 새 판단·사건·숫자를 만들지 않는다. JSON만 반환: {"hook":{"text":"선언","explanation":"해설","claim_id":"기존 ID"}}. '+JSON.stringify(policy.hook),{...settings,telemetryPurpose:'reading-hook-repair',outputSchema:repairSchema(analysis.claims.filter(c=>c.claim_id===candidate.claim_id)),maxOutputTokens:900,timeoutMs:Math.min(12000,deadline-Date.now())});
          providerAttempts.push({provider,status:'hook-format-repair-returned',elapsedMs:repair.elapsedMs});
          try{candidate=JSON.parse(repair.text).hook;}catch{candidate=null;}
          check=validateHook(candidate,analysis,policy);
          if(generation.usage && repair.usage)for(const k of ['inputTokens','outputTokens','totalTokens','cachedInputTokens'])generation.usage[k]=generation.usage[k]!=null && repair.usage[k]!=null?generation.usage[k]+repair.usage[k]:null;
        }
        if (!check.ok) { rejected('hook',{issues:check.issues.map(code=>({code,metrics:check.metrics}))}); continue; }
        const claim=analysis.claims.find(c=>c.claim_id===candidate.claim_id);
        hook={...candidate,hanja:policy.hanja,chapterKind:policy.key,fingerprint:await chartFingerprint(analysis),claimSignature:await claimSignature(claim),source:'ai-reviewed',basis:{elements:claim.elements,evidence:claim.evidence,judgment:claim.judgment,exceptions:claim.exceptions,counter_evidence:claim.counter_evidence}};
      }
      if (hook && !inspectWriting([{id:'hook',text:hook.text},{id:'hook-explanation',text:hook.explanation}],{...sty.writing,paragraphChars:500},{concept:false}).ok) { rejected('hook-ux-writing',{issues:[{code:'hook-writing-failed'}]});continue; }
      const validation = mode === 'grounded' ? validateWritten(result, analysis, clean) : null;
      if (validation && !validation.ok) { rejected('grounding',{...validation,issues:validation.warnings.map(code=>({code}))}); continue; }
      const quality = chapterQuality(result, analysis, policy, previous, hook);
      const semanticRequired=!!(policy && (mode === 'grounded' && settings.semanticReview || hook?.source === 'ai-reviewed'));
      const pendingRatio=!!(quality && !quality.ok && semanticRequired && quality.issues.every(x=>x.code==='temperament-ratio'));
      if (quality && !quality.ok && !pendingRatio) { rejected('chapter-quality',quality); continue; }
      let semantic = null, reviewUsage = null, reviewFormatRetries=0;
      if (semanticRequired) {
        for(let reviewAttempt=0;reviewAttempt<2;reviewAttempt++){
          if(deadline-Date.now()<5000)break;
          const review=await generate(env,provider,JSON.stringify({...JSON.parse(reviewPayload(result,analysis,policy,previous,hook)),realityContext:Editorial.contextLabels(userContext),examples,chapterContract:contract}),REVIEW_SYSTEM+'\n출력 스키마를 우선합니다. coverage는 policy.required의 원문 각각을 키로 하는 객체입니다. 각 키에 status와 claim_ids를 반환하세요. 같은 키를 반복하거나 누락하지 마세요. ok=true이면 issues는 빈 배열이어야 합니다.',{...settings,telemetryPurpose:reviewAttempt?'reading-review-retry':'reading-semantic-review',outputSchema:reviewSchema(policy,analysis.claims),maxOutputTokens:2500,reasoningEffort:settings.reasoningEffort||'low',timeoutMs:Math.max(1,Math.min(35000,deadline-Date.now()))});
          semantic=parseReview(review.text,policy);
          if(semantic?.coverage?.some(x=>x.claim_ids.some(id=>!analysis.claims.some(c=>c.claim_id===id))))semantic=null;
          if(review.usage){if(!reviewUsage)reviewUsage={...review.usage};else for(const k of ['inputTokens','outputTokens','totalTokens','cachedInputTokens'])reviewUsage[k]=reviewUsage[k]!=null && review.usage[k]!=null?reviewUsage[k]+review.usage[k]:null;}
          if(semantic)break;
          reviewFormatRetries++;
        }
        if(!semantic){rejected('semantic-review',{issues:[{code:'semantic-review-unavailable'}]});break;}
        await recordCoverageGap(kv,{chapter:clean.chapter.id,claims:analysis.claims,coverage:semantic.coverage||[]});
        if(!semantic.ok){rejected('semantic-review',semantic);continue;}
      }
      if (pendingRatio && semantic?.ok) {quality.localReviewIssues=quality.issues;quality.issues=[];quality.ok=true;quality.warnings.push('local-ratio-reviewed-in-context');}
      if (quality) { quality.reviewFormatRetries=reviewFormatRetries; quality.semanticReview = semantic; quality.semanticReviewStatus = semantic ? 'passed' : 'not-run'; quality.requiredCoverage=semantic?.coverage || []; quality.warnings.push(...(semantic?.coverage || []).filter(x=>x.status==='missing-evidence').map(x=>'required-evidence-missing:'+x.item)); }
      if (reviewUsage && generation.usage) { for(const k of ['inputTokens','outputTokens','totalTokens','cachedInputTokens'])generation.usage[k]=generation.usage[k]!=null && reviewUsage[k]!=null ? generation.usage[k]+reviewUsage[k] : null; }
      const cost = generation.usage && generation.usage.inputTokens != null && generation.usage.outputTokens != null && settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? (generation.usage.inputTokens * settings.inputPricePerMillion + generation.usage.outputTokens * settings.outputPricePerMillion) / 1e6 : null;
      const value = { reusedBlocks:hybrid?.blocks || [], generatedParagraphCount:writerClean.chapter.paragraphs.length, blockStyleSignature:sty.sig, result, writingQuality, provider, editorialVersion:editorial.version, chapterContractId:contract?.id || null, exampleIds:examples.map(c=>c.id), chapterVersion:CHAPTER_VERSION, chapterPolicy: policy, chapterQuality: quality, hook: hook || null, hookWarning: policy?.hook.enabled && !hook ? 'hook-evidence-or-length-missing' : null, generation: { model: generation.model, elapsedMs: generation.elapsedMs, usage: generation.usage, estimatedCost: cost, costScope: 'accepted-writer-repair-and-review-calls', priceSource: cost == null ? null : 'admin-configured', promptVersion: mode === 'grounded' ? ENGINE_VERSION : VERSION }, knowledgeCount: src.knowledge.length, style: sty.meta,
        ...(analysis ? { interpretation: { version: analysis.version, mode, claims: analysis.claims, behaviorPlans:behaviorPlans(analysis.claims,examples), features: analysis.features, cross_analysis: analysis.cross_analysis, warnings: analysis.warnings, quality: analysis.quality, validation } } : {}) };
      return json({ ok: true, ...value, cached: false });
    } catch(e){if(provider==='openai' && /insufficient_quota|billing_not_active/.test(e.message))openaiUnavailable=true; const error=/^provider-http-[0-9]{3}(?:-(?:insufficient_quota|rate_limit_exceeded|billing_not_active|overloaded_error))?$/.test(e?.message || '')?e.message:e?.name==='TimeoutError'?'provider-timeout':'provider-call-error';providerAttempts.push({provider,status:'provider-call-failed',error,elapsedMs:Date.now()-requestStarted}); }
  }
  return json({ ok: false, error: lastRejection ? 'chapter-validation-failed' : 'ai-unavailable', chapterVersion:CHAPTER_VERSION, validation: lastRejection, providerAttempts, elapsedMs:Date.now()-requestStarted, engineMode: mode }, 502);
  }
  if(!privateRequest && env.READING_DISTRIBUTED==='required' && !kv?.readingCAS)return json({ok:false,error:'reading-atomic-storage-required'},503);
  const response=await (!privateRequest && kv?.readingCAS && env.READING_DISTRIBUTED!=='off' ? distributedFlight(kv,{key,previous,experiment:env.__READING_EXPERIMENT||null},generateChapter) : generateChapter());
  // Only the fenced, committed generation may populate the durable content cache.
  if(response.ok && kv && !privateRequest && !env.__READING_BYPASS_CACHE){try{const accepted=await response.clone().json();if(accepted.ok){const {ok,cached,...value}=accepted;await kv.put(key,JSON.stringify(value),{expirationTtl:604800});}}catch{}}
  return response;
}

// Attach a fresh correlation ID even to cache hits. Never log input, chart, prose or provider messages.
export async function onRequestPost({request, env}) {
  try{env=await readingEnvironment(env);}catch{return json({ok:false,error:'storage-unavailable'},503);}
  const context = {requestId:crypto.randomUUID(), chapter:'', started:Date.now()},requestEvents=[];
  let response;
  try {
    const raw=await request.clone().text();let input;try{input=JSON.parse(raw);}catch{}
    context.chapter=typeof input?.chapter?.id==='string'?input.chapter.id:'';
    // Personal contexts have no authenticated user identity in this API; never pool them.
    const share=raw.length<=160000 && input && !Object.keys(input.realityContext||{}).length && !input.sd?.name && !input.sd?.birth && !(input.previous||[]).length;
    const scopedEnv={...env,__AI_COST_COLLECTOR:e=>{requestEvents.push(e);if(env.__AI_COST_COLLECTOR)env.__AI_COST_COLLECTOR(e);},__AI_CONTEXT:{requestId:context.requestId,chapter:/^(?:c\d{2}|c-char|deep_[a-z_]+|life_[a-zA-Z_]+|reading_[a-z_]+|timeline_[a-z_0-9]+)$/.test(context.chapter)?context.chapter:'other'}};
    response=share ? await singleFlight(env,await digest(raw),()=>handleReading({request,env:scopedEnv},context)) : await handleReading({request,env:scopedEnv},context);
  }
  catch { response = json({ok:false,error:'pipeline-unavailable'},503); }
  const body = await response.json();
  const diagnostic = diagnosticRecord(body, response.status, context);
  await saveDiagnostic(env, diagnostic);
  const requestCostUSD=requestEvents.every(e=>e.costUSD!=null)?requestEvents.reduce((n,e)=>n+e.costUSD,0):null;
  await writeAIEvent(env,{at:new Date().toISOString(),traffic:env.__READING_EXPERIMENT?'benchmark':env.__READING_BACKGROUND?'prebuild':'service',scope:'reading-outcome',requestId:context.requestId,model:'none',provider:'none',ok:body.ok===true,status:response.status,cached:body.cached===true,aiSkipped:body.aiSkipped===true,chapter:diagnostic.chapter,elapsedMs:Date.now()-context.started,usage:null,costUSD:requestCostUSD,providerCallCount:requestEvents.length,generatedParagraphCount:body.generatedParagraphCount??null,blockIds:(body.reusedBlocks||body.blocks||[]).map(b=>b.id).slice(0,60)});
  return json({...body,requestCostUSD,providerCallCount:requestEvents.length,requestId:context.requestId,...(!body.ok ? {failure:diagnostic} : {})},response.status);
}
