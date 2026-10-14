// Offline corpus evaluation; no database writes or AI/provider requests.
// node tests/interpretation-quality.js <operations-backup.json> [output.json]
// Also accepts { items: [...], documents: [{ id, chunks: [...] }] }.
const fs = require('fs'), vm = require('vm'), path = require('path');
const { pathToFileURL } = require('url');
global.window = globalThis;
for (const f of ['engine.js','report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
function corpus(snapshot) {
  if (Array.isArray(snapshot.items) && Array.isArray(snapshot.documents)) return snapshot;
  if (!Array.isArray(snapshot.records)) throw Error('Provide an operations backup or {items,documents}.');
  const data = new Map();
  // Supabase records override historical KV copies of routed data.
  for (const record of snapshot.records.slice().sort((a,b)=>(a.store==='supabase')-(b.store==='supabase'))) {
    if(record.missing || record.value == null) continue;
    try { data.set(record.key,typeof record.value==='string'?JSON.parse(record.value):record.value); } catch {}
  }
  return {items:[...data.entries()].filter(([key])=>/^ik:d:/.test(key)).flatMap(([,value])=>Array.isArray(value)?value:[]),documents:(data.get('src:idx')||[]).map(doc=>({...doc,chunks:data.get('src:chunks:'+doc.id)||[]}))};
}
(async()=>{
  if(!process.argv[2]) throw Error('Usage: node tests/interpretation-quality.js <backup.json> [output.json]');
  const {analyze,renderReport,ENGINE_VERSION}=await import(pathToFileURL(path.resolve('functions/_interpretation-engine.js')).href);
  const input=corpus(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),blocked=new Set(input.documents.filter(d=>d.active===false || d.policy?.production===false).map(d=>d.id));
  const sourceIndex=new Map(input.documents.filter(d=>!blocked.has(d.id)).map(d=>[d.id,d]));
  const now=Date.UTC(2026,9,14,3),rows=[],sentences=new Map();
  const cases=Array.from({length:40},(_,i)=>({year:1954+i,month:i%12+1,day:i%25+1,hour:i%9===0?null:[0,1,11,12,22,23][i%6],minute:i%2?29:31,gender:i%2?'M':'F',calendar:'solar',city:'서울'}));
  // Explicit late-midnight and solar-term neighborhoods; these test rule choices, not event prediction.
  cases.push(...[{year:1992,month:6,day:23,hour:23,minute:29},{year:1992,month:6,day:23,hour:23,minute:31},{year:2020,month:2,day:4,hour:17,minute:0},{year:2020,month:2,day:4,hour:19,minute:0}].flatMap(b=>['jeong','ya'].map(jasi=>({...b,jasi,gender:'F',calendar:'solar',city:'서울'}))));
  for(const [index,birth] of cases.entries()) {
    const chart=Manse.compute(birth),sd=ReportV2.SajuData.build(chart,{now}),analysis=analyze(sd,input.items,{blockedDocs:blocked,sourceIndex}),report=renderReport(analysis);
    for(const claim of analysis.claims) for(const sentence of claim.judgment.split(/(?<=[.!?。])\s+/).filter(t=>t.length>24)) { const key=sentence.replace(/\s+/g,'');if(!sentences.has(key))sentences.set(key,new Set());sentences.get(key).add(index); }
    rows.push({case_id:'case-'+String(index+1).padStart(2,'0'),input:birth,pillars:Object.fromEntries(Object.entries(sd.pillars).map(([k,v])=>[k,v?.ko || null])),features:analysis.features.map(f=>f.feature_id),claims:analysis.claims.map(c=>({id:c.claim_id,system:c.system,topic:c.topic,sourceIds:c.db_material_ids,matchedConditions:c.elements})),cross_analysis:analysis.cross_analysis,warnings:analysis.warnings,chapterCharacters:report.chapters.map(c=>({topic:c.topic,characters:c.full_text.length,omitted:c.omitted}))});
  }
  const repeated=[...sentences.entries()].filter(([,ids])=>ids.size>1).map(([text,ids])=>({text,cases:[...ids].map(i=>rows[i].case_id)}));
  const result={version:ENGINE_VERSION,asOf:new Date(now).toISOString(),cases:rows.length,unknownTimeCases:rows.filter(r=>r.input.hour===null).length,methodDifferenceCases:rows.filter(r=>r.features.includes('method-difference')).length,groundedCases:rows.filter(r=>r.claims.length).length,ziweiGroundedCases:rows.filter(r=>r.claims.some(c=>c.system==='ziwei')).length,distinctMatchedClaimSets:new Set(rows.map(r=>r.claims.map(c=>c.id).sort().join('|'))).size,repeatedSentences:repeated,predictionAccuracy:null,traditionalRuleCorrectness:null,calculationAccuracy:null,notes:['Source traceability is checked against actual stored chunks.','Regressions and different outputs do not establish traditional-rule correctness or predictive validity.','This offline evaluation uses rule text; live AI depth, semantic validity and presentation require separate review.'],rows};
  const text=JSON.stringify(result,null,2);if(process.argv[3])fs.writeFileSync(process.argv[3],text);else process.stdout.write(text+'\n');
})().catch(e=>{console.error(e.message);process.exit(1);});
