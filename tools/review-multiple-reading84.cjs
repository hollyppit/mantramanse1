// Reproducible anonymous calculations and full-book reviews; never calls an AI service.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.window=globalThis;
for(const file of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js','report/v2/plain-copy.js','report/v2/reading-text.js','report/v2/short-story.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const dir='output/multi-chart-review-20261020',roles=['title','why','reality','strength','risk','reinforce','practice','evidence'];
const read=async()=>{const L=await import('../functions/_reviewed-library.js'),S=await import('../functions/_reading-library-seed.js'),K=await import('../functions/_ik.js'),C=await import('../functions/_reading-compound-copy.js');return {L,S,K,C};};
const jsonb=x=>Array.isArray(x)?x.map(jsonb):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,jsonb(x[k])])):x;
const organize=(c,d)=>ReportV2.ReadingText.organize({id:c.id,title:c.title,editorialTopicId:c.topicId,readingParagraphs:d.result.paragraphs,readingCore:Object.fromEntries(d.result.paragraphs.map(p=>[p.role,p.text]))});
async function matrix(){
 const {L,S,K,C}=await read(),contract=MantraEditorial.defaults().chapters[0],passages=S.seedPassages(contract),required=passages.filter(C.isCompound),found=new Map(),seen=new Set(),candidates=[];
 for(let n=0;n<22000;n++){
  const input={year:1950+n%75,month:1+Math.floor(n/75)%12,day:1+Math.floor(n/900)%27,hour:n%11===0?null:n%24,minute:0,gender:n%2?'F':'M',calendar:'solar',city:'서울'};
  const sd=ReportV2.SajuData.build(Manse.compute(input),{now:Date.UTC(2026,9,20,3)});
  for(const k of ['birth','name','ziwei','calculationProvenance'])delete sd[k];
  const facts=K.deriveFacts(sd),key=facts.dayMaster+':'+facts.strength,ids=required.filter(p=>K.evalConds(p.when,facts).match).map(p=>p.id),fresh=ids.some(id=>!seen.has(id));
  const row={id:'synthetic-'+n,input,sd,stem:facts.dayMaster,strength:facts.strength,ids};
  if(!found.has(key)){found.set(key,row);candidates.push(row);}else if(fresh)candidates.push(row);
  ids.forEach(id=>seen.add(id));
  if(found.size===30&&seen.size===required.length&&candidates.some(s=>s.input.hour===null))break;
 }
 assert.equal(found.size,30,'all 10 stems by 3 strength bands');assert.equal(seen.size,required.length,'all supported profile conditions');
 const rows=[...found.values()],covered=new Set(rows.flatMap(s=>s.ids));
 for(const row of candidates)if(row.ids.some(id=>!covered.has(id))){rows.push(row);row.ids.forEach(id=>covered.add(id));}
 if(!rows.some(s=>s.input.hour===null))rows.push(candidates.find(s=>s.input.hour===null));
 const {BUNDLE_WHEN}=await import('../functions/_reading-coherent-bundles.js');let positives=0;
 for(let n=0;n<10000&&positives<2;n++){
 const input={year:1950+n%75,month:1+Math.floor(n/75)%12,day:1+Math.floor(n/900)%27,hour:n%24,minute:0,gender:n%2?'F':'M',calendar:'solar',city:'서울'},sd=ReportV2.SajuData.build(Manse.compute(input),{now:Date.UTC(2026,9,20,3)});for(const k of ['birth','name','ziwei','calculationProvenance'])delete sd[k];
 if(K.evalConds(BUNDLE_WHEN,K.deriveFacts(sd)).match)rows.push({id:'bundle-positive-'+positives++,input,sd,stem:sd.dayMaster.stem,strength:sd.strength.band,ids:required.filter(p=>K.evalConds(p.when,K.deriveFacts(sd)).match).map(p=>p.id)});
 }assert.equal(positives,2);
 const ids=new Set();for(const s of rows){assert(!ids.has(s.id));ids.add(s.id);}
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/matrix.json',JSON.stringify(rows,null,2));console.log(JSON.stringify({charts:rows.length,stemStrengthCombinations:found.size,profileConditions:covered.size,unknownTime:rows.some(s=>s.input.hour===null)}));
}
async function offline(){
 const {L,S,K}=await read(),oldL=fs.existsSync(dir+'/baseline-functions/_reviewed-library.js')?await import('../output/multi-chart-review-20261020/baseline-functions/_reviewed-library.js'):null,oldS=oldL?await import('../output/multi-chart-review-20261020/baseline-functions/_reading-library-seed.js'):null,charts=JSON.parse(fs.readFileSync(dir+'/matrix.json')),catalog=MantraEditorial.defaults().chapters,report=[],selected=new Set(),coverage=new Set(),examples=[];
 const libraries=new Map(catalog.map(c=>{const published=S.seedPassages(c);assert.deepEqual(L.validatePassages(published,c,[]),[],c.id);return [c.id,published];}));
 for(const sample of charts){const chapters=[],sentences=new Map(),actions=new Set();
  for(const c of catalog){const published=libraries.get(c.id);
   const d=L.composeReviewed({clean:{sd:sample.sd,chapter:{paragraphs:roles.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:10,published:jsonb(published)}}),view=organize(c,d);assert.equal(d.pending.length,0);assert.equal(view.rows.length,c.topicId==='creative'?1:6);
   const matched=new Set(L.selectPassages(published,c,{claims:[]},sample.sd).map(p=>p.id));
   for(const p of published.filter(p=>Object.keys(p.when).length))coverage.add(c.id+':'+p.id+':'+matched.has(p.id));
   for(const p of d.result.paragraphs){assert(!/[〔〕]|비중이 높은 편|규모를 판단하는 데|undefined/.test(p.text),c.id+' bad text');for(const component of p.components||[]){assert(K.evalConds(component.when,K.deriveFacts(sample.sd)).match);selected.add(component.id);}
    if(c.topicId!=='creative'&&!['why','evidence'].includes(p.role)){assert.equal(view.rows.find(r=>r.role===p.role).text,ReportV2.ReadingText.edit(p.text));for(const sentence of p.text.split(/(?<=[.!?])\s+/)){if(sentence.length<30)continue;if(!sentences.has(sentence))sentences.set(sentence,[]);sentences.get(sentence).push(c.id+':'+p.role);}if(['practice','reinforce'].includes(p.role)){assert(!actions.has(p.text),'duplicate action '+c.id);actions.add(p.text);}}
   }
   const inMemory=L.composeReviewed({clean:{sd:sample.sd,chapter:{paragraphs:roles.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:10,published}});assert.deepEqual(view.rows,organize(c,inMemory).rows,'JSONB serialization changed body '+sample.id+':'+c.id);const prior=oldL?.composeReviewed({clean:{sd:sample.sd,chapter:{paragraphs:roles.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:9,published:oldS?.seedPassages(c)}});const changedRoles=prior?d.result.paragraphs.filter(p=>p.text!==prior.result.paragraphs.find(x=>x.role===p.role)?.text).map(p=>p.role):[];
   chapters.push({changedRoles,id:c.id,title:c.title,topic:c.topicId,rows:view.rows,basis:view.basis,components:d.result.paragraphs.flatMap(p=>p.components||[])});
   if(sample===charts[0]||c.id==='timeline_self_01'||c.id==='timeline_wealth_01')examples.push({sample:sample.id,stem:sample.stem,strength:sample.strength,chapter:c.id,rows:view.rows});
  }
  const repeats=[...sentences].filter(([text,uses])=>new Set(uses.map(s=>s.split(':')[0])).size>1);assert.deepEqual(repeats,[],sample.id+' repeated whole sentences');
  fs.writeFileSync(dir+'/'+sample.id+'.json',JSON.stringify({sample,chapters},null,2));fs.writeFileSync(dir+'/'+sample.id+'.txt',chapters.map(c=>'\n## '+c.id+' '+c.title+'\n'+c.rows.map(p=>'['+p.role+'] '+p.text).join('\n')).join('\n'));report.push({id:sample.id,stem:sample.stem,strength:sample.strength,chapters:chapters.length,changedBodies:chapters.filter(c=>c.changedRoles.some(r=>['reality','strength','risk','reinforce','practice'].includes(r))).length,repeatedSentences:repeats.length});
 }
 // Every condition, including newly supported pairs, gets an actual positive and counterexample.
 for(const c of catalog)for(const p of S.seedPassages(c).filter(p=>Object.keys(p.when).length))for(const match of [true,false])assert(coverage.has(c.id+':'+p.id+':'+match),'uncovered '+c.id+':'+p.id+':'+match);
 fs.writeFileSync(dir+'/offline-summary.json',JSON.stringify({charts:charts.length,chapters:charts.length*84,stemStrengthCombinations:30,allConditionsMatched:true,jsonbOrderIndependent:true,repeatedLongSentences:0,zeroAI:true,report},null,2));fs.writeFileSync(dir+'/editorial-excerpts.json',JSON.stringify(examples,null,2));console.log(JSON.stringify({charts:charts.length,chapters:charts.length*84,allConditionsCovered:true,zeroAI:true}));
}
async function live(){
 const {L,S}=await read(),all=JSON.parse(fs.readFileSync(dir+'/matrix.json')),stems=[...new Set(all.map(s=>s.stem))],charts=stems.map((stem,i)=>all.find(s=>s.stem===stem&&s.strength===['신약','중화','신강'][i%3])),catalog=MantraEditorial.defaults().chapters,summary=[],transientErrors=[];
 for(const sample of charts){const file=dir+'/live-'+sample.id+'.json',prior=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null,rows=[];let cursor=0;
 if(process.argv.includes('--resume')&&prior)for(const row of prior.rows){const c=catalog.find(c=>c.id===row.id);if(!c)continue;const expected=L.composeReviewed({clean:{sd:sample.sd,chapter:{paragraphs:roles.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:10,published:S.seedPassages(c)}});if(JSON.stringify(row.view.rows)===JSON.stringify(organize(c,expected).rows)&&row.data.providerCallCount===0&&row.data.aiSkipped)rows.push(row);}
 const pending=catalog.filter(c=>!rows.some(r=>r.id===c.id)),persist=()=>fs.writeFileSync(file,JSON.stringify({sample,rows},null,2));
  await Promise.all(Array.from({length:2},async()=>{while(cursor<pending.length){const c=pending[cursor++];let response;for(let attempt=0;attempt<3;attempt++){response=await fetch('https://mantramanse.pages.dev/api/movingtoon-reading',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sd:sample.sd,chapter:{id:c.id,title:c.title,paragraphs:roles.map(role=>({id:role,role,text:'가상 명식으로 전체 풀이를 검수하는 요청입니다.'}))}})});if(response.ok||![429,502,503,504].includes(response.status))break;const error=await response.clone().json().catch(()=>({error:'upstream-unavailable'}));transientErrors.push({sample:sample.id,chapter:c.id,status:response.status,error:error.error||'upstream-unavailable',attempt:attempt+1,contentType:response.headers.get('content-type'),body:(await response.clone().text()).slice(0,900)});fs.writeFileSync(dir+'/live-transient-errors.json',JSON.stringify(transientErrors,null,2));persist();if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}assert.equal(response.status,200,sample.id+':'+c.id+' HTTP');const d=await response.json();assert(d.aiSkipped&&d.providerCallCount===0&&d.requestCostUSD===0);assert.equal(d.pending.length,0);const wanted=L.composeReviewed({clean:{sd:sample.sd,chapter:{paragraphs:roles.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:10,published:S.seedPassages(c)}}),view=organize(c,d),expected=organize(c,wanted);assert.deepEqual(view.rows,expected.rows,sample.id+':'+c.id+' live differs');rows.push({id:c.id,title:c.title,topic:c.topicId,view,data:d});if(rows.length%7===0)persist();}}));
  rows.sort((a,b)=>catalog.findIndex(c=>c.id===a.id)-catalog.findIndex(c=>c.id===b.id));fs.writeFileSync(dir+'/live-'+sample.id+'.json',JSON.stringify({sample,rows},null,2));summary.push({id:sample.id,stem:sample.stem,strength:sample.strength,chapters:rows.length,zeroAI:true});console.log(JSON.stringify(summary.at(-1)));
 }
 fs.writeFileSync(dir+'/live-summary.json',JSON.stringify({charts:summary.length,chapters:summary.length*84,providerCalls:0,costUSD:0,publicationBodiesMatch:true,transientErrors,summary},null,2));
}
({matrix,offline,live}[process.argv[2]]||(()=>{throw Error('choose matrix, offline or live');}))().catch(e=>{console.error(e);process.exitCode=1});
