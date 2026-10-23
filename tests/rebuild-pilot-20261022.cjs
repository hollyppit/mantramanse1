const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const {entries}=await import('../editorial/rebuild-20261022/content.mjs'),{simulate,validateEntry}=await import('../editorial/rebuild-20261022/engine.mjs');
 for(const e of entries)assert.deepEqual(validateEntry(e),[]);
 const oldFetch=global.fetch;global.fetch=()=>{throw Error('network-forbidden');};
 let computed=0,selected=0;const coverage=new Set();
 try{
  global.window=globalThis;for(const file of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
  for(let i=0;i<1200;i++){
   const sd=ReportV2.SajuData.build(Manse.compute({year:1960+i%65,month:1+(i*7)%12,day:1+(i*11)%27,hour:i%7===0?null:(i*5)%24,minute:0,calendar:'solar',gender:i%2?'M':'F',city:'서울'}),{now:Date.UTC(2026,9,22,3)});
   for(const chapter of ['timeline_self_01','timeline_wealth_02','timeline_career_01']){
    const a=simulate(entries,sd,chapter,{preview:true}),b=simulate(entries,structuredClone(sd),chapter,{preview:true});assert.deepEqual(a,b);assert.equal(a.providerCalls,0);assert.equal(simulate(entries,sd,chapter).selected.length,0);
    for(const e of a.selected){selected++;coverage.add(e.id);const trace=a.trace.find(t=>t.id===e.id);assert(trace.rows.every(r=>r.hit));assert(trace.rows.length>=4);}
   }computed++;
  }
  for(const e of entries){
   const sd={dayMaster:{stem:e.when.dayMaster[0]},dayPillar:{ko:e.when.dayMaster[0]+'子'},strength:{band:e.when.strength[0]},tenGods:Object.fromEntries(Object.keys(e.when.tenGod).map(k=>[k,25]))};
   const options={preview:true},chapter=e.chapters[0];assert(simulate([e],sd,chapter,options).selected.length);
   for(const field of ['dayMaster','strength','tenGods']){const missing=structuredClone(sd);if(field==='dayMaster')missing.dayMaster={};else delete missing[field];assert.equal(simulate([e],missing,chapter,options).selected.length,0);}
   const counter=structuredClone(sd);counter.strength.band='other';assert.equal(simulate([e],counter,chapter,options).selected.length,0);
   assert.equal(simulate([e],sd,chapter,{preview:true,previousTags:e.meaningTags}).selected.length,0);
   const duplicate={...structuredClone(e),id:e.id+'-duplicate',priority:99};assert.equal(simulate([e,duplicate],sd,chapter,options).selected.length,1);
   const conflict={...structuredClone(e),id:e.id+'-conflict',meaningTags:['other'],conflicts:[e.id],priority:99};assert.equal(simulate([conflict,e],sd,chapter,options).selected[0].id,e.id);
   assert(validateEntry({...e,status:'reviewed'}).includes('review-required'));
   assert(validateEntry({...e,when:{madeUp:['yes']}}).includes('invalid-condition'));
  }
 }finally{global.fetch=oldFetch;}
 const result={computedCharts:computed,chapterComparisons:computed*3,selectedMatches:selected,realChartCoveredEntries:[...coverage],entries:entries.length,providerCalls:0,checks:['deterministic','draft-not-served','positive-and-counterexample','missing-facts','meaning-dedup','conflict-priority','review-gate','unknown-condition'],limitations:['Real-chart coverage is reported separately from synthetic condition fixtures.','No production DB, medical claims, or traditional accuracy validation.']};
 fs.mkdirSync('output/rebuild-20261022',{recursive:true});fs.writeFileSync('output/rebuild-20261022/tests.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
