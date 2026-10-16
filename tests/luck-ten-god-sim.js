const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{pathToFileURL}=require('url'),path=require('path');
global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
(async()=>{const K=await import(pathToFileURL(path.resolve('functions/_ik.js'))),E=await import(pathToFileURL(path.resolve('functions/_interpretation-engine.js'))),C=await import(pathToFileURL(path.resolve('functions/_chapter-engine.js'))),P=await import(pathToFileURL(path.resolve('functions/_chapter-policy.js')));
for(let i=0;i<40;i++){
 const ch=Manse.compute({year:1960+i,month:1+i%12,day:3+i%23,hour:i%5?12:null,minute:0,gender:i%2?'M':'F',calendar:'solar',city:'서울'}),before=JSON.stringify(ch),sd=ReportV2.SajuData.build(ch,{now:Date.UTC(2026,9,16,3)}),f=K.deriveFacts(sd);
 assert.equal(JSON.stringify(ch),before);assert.equal(f.seunStemTG,sd.sewoon.stemTG);assert.equal(f.seunBranchTG,sd.sewoon.branchTG);
 const dw=sd.currentDaewoon;if(dw&&dw.startYear<=sd.nowYear&&sd.nowYear<=dw.endYear){assert.equal(f.daewoonStemTG,dw.stemTG);assert.equal(f.daewoonBranchTG,dw.branchTG);}
 assert(K.evalConds({seunStemTG:[sd.sewoon.stemTG]},f).match);assert(!K.evalConds({seunStemTG:['INVALID']},f).match);
 const bad=structuredClone(sd);bad.sewoon.year--;assert.equal(K.deriveFacts(bad).seunStemTG,undefined);
 const absent=structuredClone(sd);delete absent.sewoon;delete absent.currentDaewoon;const af=K.deriveFacts(absent);assert(!K.evalConds({seunStemTG:[sd.sewoon.stemTG]},af).match);assert.equal(af.daewoonStemTG,undefined);
 const stale=structuredClone(sd);if(stale.currentDaewoon){stale.currentDaewoon.endYear=sd.nowYear-1;assert.equal(K.deriveFacts(stale).daewoonStemTG,undefined);}
 const invalid=structuredClone(sd);invalid.sewoon.stemTG='INVALID';assert.equal(K.deriveFacts(invalid).seunStemTG,undefined);
 const rule={id:'TIMING-TEST',domain:'TIMING',status:'published',reviewed:true,sourceType:'internal',title:'검사 전용 픽스처',principle:'검사 전용 픽스처',interpretation:'검사 전용 조건부 판단입니다.',conditions:{seunStemTG:[sd.sewoon.stemTG]},evidence:[{docId:'fixture',chunkId:'c1',quote:'fixture'}],confidence:'low',priority:10};
 const a=E.analyze(sd,[rule],{sourceIndex:new Map([['fixture',{chunks:[{id:'c1',text:'fixture'}]}]])});assert.equal(a.claims.length,1);assert.equal(a.claims[0].time_basis.seunStemTG.year,sd.nowYear);assert.equal(a.claims[0].time_basis.seunStemTG.part,'stem');assert.equal(C.selectChapterClaims(a,P.chapterPolicy({chapterKind:'timing'})).claims.length,1);
 assert.equal(E.analyze(bad,[rule],{sourceIndex:new Map([['fixture',{chunks:[{id:'c1',text:'fixture'}]}]])}).claims.length,0);
}
assert.deepEqual(K.cleanConds({seunStemTG:['정재'],daewoonBranchTG:['식신']}),{daewoonBranchTG:['식신'],seunStemTG:['정재']});
console.log('luck-ten-god: 40 charts; exact engine values; missing/stale/invalid rejection; separate scopes; source-bound time provenance PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
