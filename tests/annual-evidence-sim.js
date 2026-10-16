const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');global.window=globalThis;
for(const f of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
(async()=>{const {annualEvidence}=await import(pathToFileURL(path.resolve('functions/_annual-evidence.js'))),{onRequestPost}=await import(pathToFileURL(path.resolve('functions/api/interpretation.js')));
const now=Date.UTC(2026,9,16,3);let boundaries=0;
for(let i=0;i<30;i++){
 const ch=Manse.compute({year:1960+i,month:1+i%12,day:3+i%23,hour:i%3?12:null,minute:0,calendar:'solar',gender:i%2?'M':'F',city:'서울'}),before=JSON.stringify(ch),sd=ReportV2.SajuData.build(ch,{now}),periods=ReportV2.SajuData.annualPeriods(ch,{now}),engine=Manse.seunRange(ch,sd.nowYear,sd.nowYear+9);
 assert.equal(periods.length,10);assert.equal(JSON.stringify(ch),before);for(let j=0;j<10;j++){assert.equal(periods[j].sewoon.stemTG,engine[j].stemTG);assert.equal(periods[j].sewoon.branchTG,engine[j].branchTG);assert.equal(periods[j].year,sd.nowYear+j);}
 if(new Set(periods.map(p=>p.currentDaewoon?.ganzhi)).size>1)boundaries++;
 const base={domain:'TIMING',status:'published',reviewed:true,sourceType:'internal',principle:'검사 전용 원리',interpretation:'검사 전용 조건부 문장입니다.',evidence:[{docId:'fixture',chunkId:'c1',quote:'fixture'}]};
 const rules=[{...base,id:'TIME-TEST',conditions:{seunStemTG:[periods[0].sewoon.stemTG]}},{...base,id:'NO-TIME',conditions:{dayMaster:[sd.dayMaster.stem]}}];const opts={sourceIndex:new Map([['fixture',{chunks:[{id:'c1',text:'fixture'}]}]])};
 const a=annualEvidence(sd,periods,rules,opts);for(let j=0;j<10;j++){assert.equal(a[j].claims.length,periods[j].sewoon.stemTG===periods[0].sewoon.stemTG?1:0);for(const c of a[j].claims)assert.equal(c.time_basis.seunStemTG.year,sd.nowYear+j);assert(a[j].requiresExpertReview);}
 assert(annualEvidence(sd,periods,[],opts).every(r=>r.status==='missing-evidence'));
 const draft=rules.map(r=>({...r,status:'draft',reviewed:false}));assert(annualEvidence(sd,periods,draft,opts).every(r=>!r.claims.length));
 const bad=structuredClone(periods);bad[1].sewoon.year=bad[0].year;assert.throws(()=>annualEvidence(sd,bad,rules,opts),/invalid-annual/);
 const duplicate=[periods[0],periods[0]];assert.throws(()=>annualEvidence(sd,duplicate,rules,opts),/invalid-annual/);
 const wrongDW=structuredClone(periods);if(wrongDW[1].currentDaewoon){wrongDW[1].currentDaewoon.endYear=sd.nowYear;assert.throws(()=>annualEvidence(sd,wrongDW,rules,opts),/invalid-annual/);}
 assert.throws(()=>annualEvidence(sd,[...periods,periods[0]],rules,opts),/invalid-annual/);
 assert.throws(()=>ReportV2.SajuData.annualPeriods(ch,{now,count:11}),/invalid-annual-count/);
 if(i===0){const memory=new Map(),kv={get:async(k,t)=>memory.has(k)?t==='json'?JSON.parse(memory.get(k)):memory.get(k):null,list:async()=>({keys:[],list_complete:true})};const res=await onRequestPost({env:{ADMIN_PASSWORD:'test',GLOSSARY_KV:kv},request:new Request('http://test/api/interpretation',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({sd,editorialChapterId:'timing_07',annualPeriods:periods,compose:'plain'})})});assert.equal(res.status,200);const d=await res.json();assert.equal(d.editorialPreview.annual.length,10);assert(d.editorialPreview.annual.every(x=>x.status==='missing-evidence'));}
}
assert(boundaries>0);console.log('annual-evidence: 30 charts x 10 years; original engine unchanged; daeun transitions; per-year matching/provenance; draft isolation; stale/duplicate/oversize rejection; admin API PASS');})().catch(e=>{console.error(e);process.exitCode=1});
