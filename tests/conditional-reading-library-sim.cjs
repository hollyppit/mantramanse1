const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.window=globalThis;
for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
(async()=>{
 const {build}=require('../tools/build-complete-reading-library.cjs'),pack=await build(),K=await import('../functions/_ik.js'),L=await import('../functions/_reviewed-library.js'),API=await import('../functions/api/movingtoon-reading.js'),{CONDITION_PLANS}=await import('../functions/_reading-conditional-copy.js');
 const original=global.fetch;global.fetch=()=>{throw Error('network forbidden');};let checks=0;
 const catalog=MantraEditorial.defaults(),roles=L.ROLES,body=(c,sd)=>({sd,chapter:{id:c.id,title:c.title,paragraphs:roles.map((role,i)=>({id:String(i),role,text:'계산 조건에 따른 문안 선택을 확인하는 가상 검증 요청입니다.'}))}});
 for(const c of catalog.chapters.filter(c=>c.topicId!=='creative')){
  const library=pack.libraries.find(l=>l.chapter===c.id),index=Number(c.id.split('_').at(-1))-1,group=CONDITION_PLANS[c.topicId][index][0],texts=new Set();
  // Simulate the existing database's unconditional 704-paragraph publication preceding the compiled new copy.
  const old=library.passages.filter(p=>!p.id.startsWith('condition-')),memory=new Map([[L.libraryKey(c.id),JSON.stringify({version:1,draft:old,published:old,history:[],scenarios:[]})]]),kv={get:async(k,t)=>memory.has(k)?t==='json'?JSON.parse(memory.get(k)):memory.get(k):null,put:async()=>{}};
  for(const band of ['weak','mid','strong']){
   const sample=pack.samples.find(s=>K.deriveFacts(s.sd).group[group].level===band);assert(sample);
   const r=await API.onRequestPost({env:{GLOSSARY_KV:kv,OPENAI_API_KEY:'unused'},request:new Request('https://test/api/movingtoon-reading',{method:'POST',body:JSON.stringify(body(c,sample.sd))})}),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert(d.aiSkipped&&d.providerCallCount===0);assert(d.conditionalParagraphCount>=2,c.id+' conditional coverage');assert(!/質問|질문별 참고 해설과 가상 사례/.test(d.scopeNotice));
   for(const p of d.result.paragraphs){assert.equal(p.refs.length,0);assert.equal(p.claim_ids.length,0);assert(!p.text.includes('확정'));}
   const matched=L.selectPassages(library.passages,c,{claims:[]},sample.sd).filter(p=>p.id.startsWith('condition-'));assert.equal(matched.length,3);assert(matched.every(p=>p.when.group[group]===band));
   texts.add(d.result.paragraphs.find(p=>p.role==='title').text);checks++;
  }
  assert.equal(texts.size,3,c.id+' must have three distinct questionspecific readings');
  const missing=structuredClone(pack.samples[0].sd);delete missing.groups;assert(!L.selectPassages(library.passages,c,{claims:[]},missing).some(p=>p.id.startsWith('condition-')),'missing facts must not match');
  const malformed={...library.passages[0],when:{group:{[group]:'imaginary'}}};assert(L.validatePassages([malformed],c,[]).some(x=>x.code==='invalid-when'));
 }
 // Nearby ranges must not be conflated; thresholds use the same condition evaluator as the database.
 for(const [pct,band] of [[0,'weak'],[11.999,'weak'],[12,'mid'],[27.999,'mid'],[28,'strong'],[100,'strong']])assert.equal(K.levelOf(pct),band);
 global.fetch=original;console.log('PASS: '+checks+' chapter-band checks; 76 questions × 3 actual calculated bands, old DB fallback precedence, no false personal refs, missing facts, exact boundaries, zero AI');
})().catch(e=>{console.error(e);process.exit(1)});
