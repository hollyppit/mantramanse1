import { chapterPolicy, chapterInstruction, CHAPTER_DEFAULTS } from '../_chapter-policy.js';
import { CHAPTER_VERSION, selectChapterClaims, buildHook, chapterQuality, REVIEW_SYSTEM, reviewPayload, parseReview, validateHook, chartFingerprint, claimSignature } from '../_chapter-engine.js';
import { json } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadAll, blockedDocs, meta } from '../_ikstore.js';
import { VERSION, validate, sources, sanitize, allowedOutputNumbers, systemFor, domainsFor } from '../_movingtoon-reading.js';
import { loadStyle, styleFor } from '../_stylestore.js';
import { analyze, ENGINE_VERSION, WRITER_SYSTEM, validateWritten } from '../_interpretation-engine.js';
import { loadSettings, loadSourceIndex } from '../_interpretation-store.js';
export async function generate(env, provider, input, SYSTEM, settings = {}) {
  const started = Date.now(), isOpen = provider === 'openai';
  const maxTokens = settings.maxOutputTokens || 14000;
  const body = isOpen ? { model: settings.openaiModel || env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: SYSTEM, input, max_output_tokens: maxTokens } : { model: settings.anthropicModel || env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content: input }] };
  const headers = isOpen ? { authorization: 'Bearer ' + env.OPENAI_API_KEY } : { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' };
  const r = await fetch(isOpen ? 'https://api.openai.com/v1/responses' : 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(Math.max(1, Math.min(isOpen ? 40000 : 55000, settings.timeoutMs || (isOpen ? 40000 : 55000)))), headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { let detail;try{detail=(await r.json())?.error;}catch{} const known=['insufficient_quota','rate_limit_exceeded','billing_not_active','overloaded_error'].find(x=>x===detail?.code || x===detail?.type), message=String(detail?.message || '');const code=known || (/insufficient.quota|exceeded your current quota|billing hard limit/i.test(message)?'insufficient_quota':/rate limit|tokens per min|requests per min/i.test(message)?'rate_limit_exceeded':'');throw Error('provider-http-'+r.status+(code?'-'+code:'')); }
  const d = await r.json();
  const text = isOpen ? d.output_text || (d.output || []).flatMap(x => x.content || []).map(x => x.text || '').join('') : (d.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
  return { text, model: String(d.model || body.model).slice(0, 120), elapsedMs: Date.now() - started, usage: usageOf(d.usage) };
}
export function usageOf(u) {
  if (!u || typeof u !== 'object') return null;
  const n = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
  return { inputTokens: n(u.input_tokens), outputTokens: n(u.output_tokens), totalTokens: n(u.total_tokens), cachedInputTokens: n(u.input_tokens_details?.cached_tokens) };
}
export async function onRequestPost({ request, env }) {
  let clean, original;
  try { const raw = await request.text(); if (raw.length > 160000) return json({ ok: false, error: 'too-large' }, 413); original = JSON.parse(raw); clean = validate(original); } catch { }
  if (!clean) return json({ ok: false, error: 'bad-payload' }, 400);
  const requestStarted=Date.now(),providerAttempts=[];
  let storageStage='rules';
  let kv, key, src, sty, analysis, settings, mode, policy, hook, hookDraft, previous = [], lastRejection = null;
  try {
    // Rule/source deactivation must be observed before reusing any AI cache.
    kv = kvOf(env);
    const [items, blocked, version] = kv ? await Promise.all([loadAll(kv), blockedDocs(kv), meta(kv)]) : [[], new Set(), {}];
    storageStage='settings';settings = await loadSettings(kv);
    mode = env.INTERPRETATION_ENGINE_MODE || settings.mode;
    policy = chapterPolicy(clean.chapter, settings.chapters);
    previous = (Array.isArray(original.previous) ? original.previous : []).slice(-80).filter(p => p && typeof p.text === 'string' && p.text.length<=1200).map(p=>({id:String(p.id || '').slice(0,100),chapter:String(p.chapter || '').slice(0,80),text:p.text}));
    if (!['legacy','shadow','grounded'].includes(mode)) return json({ ok: false, error: 'invalid-engine-mode' }, 503);
    if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'no-ai', engineMode: mode }, 503);
    if (mode !== 'legacy' || policy?.hook.enabled) {
      storageStage='source-index';const sourceIndex = await loadSourceIndex(kv, items, blocked);
      storageStage='grounding';analysis = analyze(original.sd, items, { ...settings, sourceIndex, blockedDocs: blocked, domains: policy && ['timing','remedy'].includes(policy.key) ? undefined : domainsFor(clean.chapter) });
      analysis = selectChapterClaims(analysis, policy);
      hook = await buildHook(analysis, policy, settings);
      if(hook?.source === 'verified-rule'){hookDraft=hook;hook=null;}
      if (mode === 'grounded' && !analysis.claims.length) return json({ ok: false, error: 'insufficient-evidence', engine: ENGINE_VERSION, engineMode: mode, warnings: analysis.warnings }, 422);
    }
    src = sources(items, clean.sd, blocked, clean.chapter);
    // Explicitly authorized writer payload: excludes names and raw birth dates.
    if (mode === 'grounded') src = { chart: analysis.normalized.chart, facts: analysis.normalized.saju, knowledge: analysis.claims.map(c => ({ id: c.knowledge_id, interpretation: c.judgment })), claims: analysis.claims, cross_analysis: analysis.cross_analysis };
    storageStage='style';sty = styleFor(await loadStyle(kv), [clean.chapter.id, ...domainsFor(clean.chapter)], { soft: src.knowledge.length < 2 });
    storageStage='cache';const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ chapterVersion: CHAPTER_VERSION, previous, hook, hookDraft, version: VERSION, engine: ENGINE_VERSION, mode, settings, claims: analysis?.claims, db: version, style: sty.sig, clean, models: [env.OPENAI_MODEL, env.ANTHROPIC_MODEL] })));
    key = 'ai:movingtoon:' + [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (kv) {
      const hit = await kv.get(key, 'json');
      if (hit && (!hit.hook || analysis && validateHook(hit.hook,analysis,policy).ok) && sanitize(JSON.stringify(hit.result), clean, src, { deep: mode === 'grounded' }) && (mode !== 'grounded' || validateWritten(hit.result, analysis, clean).ok)) return json({ ok: true, ...hit, cached: true });
      const hour = new Date().toISOString().slice(0, 13), day = hour.slice(0, 10), ip = request.headers.get('cf-connecting-ip') || 'local';
      const hk = 'rl:movingtoon:' + ip + ':' + hour, dk = 'rl:movingtoon:day:' + day;
      const [h, d] = await Promise.all([kv.get(hk), kv.get(dk)]);
      if ((+h || 0) >= (+env.MOVINGTOON_HOURLY_LIMIT || 100) || (+d || 0) >= (+env.MOVINGTOON_DAILY_LIMIT || 6000)) return json({ ok: false, error: 'rate-limited', engineMode: mode }, 429);
      await Promise.all([kv.put(hk, String((+h || 0) + 1), { expirationTtl: 7200 }), kv.put(dk, String((+d || 0) + 1), { expirationTtl: 172800 })]);
    }
  } catch { return json({ ok: false, error: 'storage-unavailable', storageStage, engineMode: mode }, 503); }
  const allowedNumbers=allowedOutputNumbers(clean,src);
  const verifiedTimingClaimIds=(analysis?.claims || []).filter(c=>c.elements.some(r=>/daewoon|seun|monthSeason|futureSeason/.test(r.key))).map(c=>c.claim_id);
  const input = JSON.stringify({ ...src, allowedNumbers, verifiedTimingClaimIds, chapter: clean.chapter, outline: clean.outline, chapterPolicy: policy, previous, hookDraft: hookDraft ? {text:hookDraft.text,explanation:hookDraft.explanation,claim_id:hookDraft.claim_id}:null, hook: hook ? { text: hook.text, explanation: hook.explanation, claim_id: hook.claim_id } : null });
  let writerSystem = mode === 'grounded' ? WRITER_SYSTEM + '\n[표현 설정]\n' + (sty.directive || '') + '\n위 표현 설정은 판단·근거·불확실성을 변경하지 않는다.' : systemFor(sty);
  if (policy) writerSystem += '\n'+chapterInstruction(policy);
  writerSystem += '\n출력 숫자는 allowedNumbers에 있는 값만 사용한다. 현실 전략에도 새로운 기간·횟수·비율·금액·연도를 만들지 말고 숫자 없이 관찰 가능한 행동으로 설명한다. 문단은 최소 30자, 최대 길이는 챕터 정책을 따른다. 반드시·무조건·확정·수익률이라는 단어를 쓰지 않는다. 예측 한계는 전통 해석이며 실제 결과를 보장하지 않습니다처럼 설명한다. 기초 계산값이 존재하는데 계산값 자체가 없다고 말하지 않는다. 검수된 해석 규칙이 부족할 때는 계산표는 있으나 해당 작용을 해석할 규칙의 근거가 부족하다고 구분한다. verifiedTimingClaimIds가 비어 있으면 운의 간지·기간은 사실로 안내할 수 있지만 그 시기의 돈·관계·직업 작용을 만들지 않는다.';
  if (policy?.hook.enabled && analysis?.claims.length && !hook) writerSystem += '\n동일 JSON에 독립 hook 추가: '+JSON.stringify({text:'해당 주제의 가장 중요한 조건 한 가지. 최대 '+policy.hook.maxChars+'자',explanation:(policy.hook.explanationSentences===3?'2~3':'2')+'문장, 최대 '+policy.hook.explanationMaxChars+'자',claim_id:'검증된 단일 claim_id'})+'\n후킹 문체: '+policy.hook.style+'\n후킹은 원문 소개나 일반적인 위로 대신 실제 계산 조건과 해당 주제의 결과·선택을 연결하는 간결한 선언으로 쓴다. 원문을 그대로 복사하지 않는다. 후킹을 먼저 작성한 뒤 본문에서 같은 핵심 선언을 반복하지 않는다. 본문은 적용 상황·구체 사례·대응 방법을 확장하고 후킹과 비슷한 문장을 다시 쓰지 않는다.\n새 명리 판단을 만들지 말고 선택한 판단의 조건과 예외를 보존한다. 한국어만 사용한다.';
  // UTF-8 bytes are a conservative token upper bound for budget reservation.
  const estimatedMaxCost = settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? ((new TextEncoder().encode(input + writerSystem).length + 512) * settings.inputPricePerMillion + settings.maxOutputTokens * settings.outputPricePerMillion) / 1e6 : null;
  if (settings.maxRequestCost != null && (estimatedMaxCost == null || estimatedMaxCost * (mode === 'grounded' && policy && settings.semanticReview ? 3 : 1) * [env.OPENAI_API_KEY, env.ANTHROPIC_API_KEY].filter(Boolean).length > settings.maxRequestCost)) return json({ ok: false, error: 'cost-limit', estimatedMaxCost, engineMode: mode }, 429);
  const fixedHook=hook, deadline=requestStarted+78000;
  for (const [provider, secret] of [['openai', 'OPENAI_API_KEY'], ['anthropic', 'ANTHROPIC_API_KEY']]) {
    if (!env[secret]) continue;
    if(Date.now()>=deadline)break;
    hook=fixedHook;
    try {
      const generation = await generate(env, provider, lastRejection ? input+'\n이전 후보는 다음 검증에서 거부되었다. 같은 오류를 반복하지 말고 원국·판단 근거를 그대로 유지하여 다시 작성한다: '+JSON.stringify(lastRejection.issues || []) : input, writerSystem, {...settings,timeoutMs:deadline-Date.now()});
      providerAttempts.push({provider,status:'writer-returned',elapsedMs:generation.elapsedMs});
      const rejected=(stage,v)=>{lastRejection=v;providerAttempts.push({provider,status:'rejected',stage,issues:(v?.issues || []).map(x=>({code:x.code,id:x.id,reason:x.reason})),elapsedMs:Date.now()-requestStarted});};
      const diagnostics=[];
      const result = sanitize(generation.text, clean, src, { deep: mode === 'grounded',diagnostics }); if (!result) {rejected('writer-format',{issues:diagnostics});continue;}
      if (policy?.hook.enabled && analysis?.claims.length && !hook) {
        let candidate; try { candidate=JSON.parse(generation.text).hook; } catch { }
        const check=validateHook(candidate,analysis,policy);
        if (!check.ok) { rejected('hook',{issues:check.issues.map(code=>({code,metrics:check.metrics}))}); continue; }
        const claim=analysis.claims.find(c=>c.claim_id===candidate.claim_id);
        hook={...candidate,hanja:policy.hanja,chapterKind:policy.key,fingerprint:await chartFingerprint(analysis),claimSignature:await claimSignature(claim),source:'ai-reviewed',basis:{elements:claim.elements,evidence:claim.evidence,judgment:claim.judgment,exceptions:claim.exceptions,counter_evidence:claim.counter_evidence}};
      }
      const validation = mode === 'grounded' ? validateWritten(result, analysis, clean) : null;
      if (validation && !validation.ok) { rejected('grounding',validation); continue; }
      const quality = chapterQuality(result, analysis, policy, previous, hook);
      const semanticRequired=!!(policy && (mode === 'grounded' && settings.semanticReview || hook?.source === 'ai-reviewed'));
      const pendingRatio=!!(quality && !quality.ok && semanticRequired && quality.issues.every(x=>x.code==='temperament-ratio'));
      if (quality && !quality.ok && !pendingRatio) { rejected('chapter-quality',quality); continue; }
      let semantic = null, reviewUsage = null;
      if (semanticRequired) {
        const review = await generate(env, provider, reviewPayload(result,analysis,policy,previous,hook), REVIEW_SYSTEM, { ...settings, maxOutputTokens: 4000,timeoutMs:Math.max(1,deadline-Date.now()) });
        semantic = parseReview(review.text,policy); reviewUsage = review.usage;
        if (semantic?.coverage?.some(x=>x.claim_ids.some(id=>!analysis.claims.some(c=>c.claim_id===id))))semantic=null;
        if (!semantic || !semantic.ok) { rejected('semantic-review',semantic || {issues:[{code:'semantic-review-unavailable'}]}); continue; }
      }
      if (pendingRatio && semantic?.ok) {quality.localReviewIssues=quality.issues;quality.issues=[];quality.ok=true;quality.warnings.push('local-ratio-reviewed-in-context');}
      if (quality) { quality.semanticReview = semantic; quality.semanticReviewStatus = semantic ? 'passed' : 'not-run'; quality.requiredCoverage=semantic?.coverage || []; quality.warnings.push(...(semantic?.coverage || []).filter(x=>x.status==='missing-evidence').map(x=>'required-evidence-missing:'+x.item)); }
      if (reviewUsage && generation.usage) { for(const k of ['inputTokens','outputTokens','totalTokens','cachedInputTokens'])generation.usage[k]=generation.usage[k]!=null && reviewUsage[k]!=null ? generation.usage[k]+reviewUsage[k] : null; }
      const cost = generation.usage && generation.usage.inputTokens != null && generation.usage.outputTokens != null && settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? (generation.usage.inputTokens * settings.inputPricePerMillion + generation.usage.outputTokens * settings.outputPricePerMillion) / 1e6 : null;
      const value = { result, provider, chapterPolicy: policy, chapterQuality: quality, hook: hook || null, hookWarning: policy?.hook.enabled && !hook ? 'hook-evidence-or-length-missing' : null, generation: { model: generation.model, elapsedMs: generation.elapsedMs, usage: generation.usage, estimatedCost: cost, costScope: 'accepted-writer-and-review-calls', priceSource: cost == null ? null : 'admin-configured', promptVersion: mode === 'grounded' ? ENGINE_VERSION : VERSION }, knowledgeCount: src.knowledge.length, style: sty.meta,
        ...(analysis ? { interpretation: { version: analysis.version, mode, claims: analysis.claims, features: analysis.features, cross_analysis: analysis.cross_analysis, warnings: analysis.warnings, quality: analysis.quality, validation } } : {}) };
      if (kv) { try { await kv.put(key, JSON.stringify(value), { expirationTtl: 604800 }); } catch { } }
      return json({ ok: true, ...value, cached: false });
    } catch (e) { const error=/^provider-http-[0-9]{3}(?:-(?:insufficient_quota|rate_limit_exceeded|billing_not_active|overloaded_error))?$/.test(e?.message || '')?e.message:e?.name==='TimeoutError'?'provider-timeout':'provider-call-error';providerAttempts.push({provider,status:'provider-call-failed',error,elapsedMs:Date.now()-requestStarted}); }
  }
  return json({ ok: false, error: lastRejection ? 'chapter-validation-failed' : 'ai-unavailable', validation: lastRejection, providerAttempts, elapsedMs:Date.now()-requestStarted, engineMode: mode }, 502);
}
