// Offline only: authoring inputs are repository-owned copy and synthetic calculations. No provider calls.
const fs=require('fs'),vm=require('vm'),path=require('path');global.window=globalThis;
for(const file of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
async function build(){
 const {seedPassages,SEED_VERSION}=await import('../functions/_reading-library-seed.js'),{validatePassages,selectPassages,LIBRARY_VERSION}=await import('../functions/_reviewed-library.js');
 const calc=(year,month,day,hour,gender)=>{const sd=ReportV2.SajuData.build(Manse.compute({year,month,day,hour,minute:0,gender,calendar:'solar',city:'서울'}),{now:Date.UTC(2026,9,20,3)});delete sd.birth;delete sd.name;delete sd.ziwei;delete sd.calculationProvenance;return sd;};
 const samples=Array.from({length:10},(_,i)=>({id:'stem-'+i,synthetic:true,sd:calc(1992,6,i+1,9,i%2?'F':'M')}));samples.push({id:'unknown-hour',synthetic:true,sd:calc(2000,12,3,null,'M')});
 const chapters=MantraEditorial.defaults().chapters,checks=[],libraries=[];
 for(const c of chapters){const passages=seedPassages(c),issues=validatePassages(passages,c,[]);if(issues.length)throw Error(c.id+': '+JSON.stringify(issues));const scenarios=(c.topicId==='creative'?samples:samples.filter((s,i)=>i===0||s.id==='unknown-hour')).map(s=>{const matched=selectPassages(passages,c,{claims:[]},s.sd).map(p=>p.id);checks.push({chapter:c.id,sample:s.id,matched:matched.length});return {sampleId:s.id,sd:s.sd,expectedPassageIds:matched,forbiddenPassageIds:passages.filter(p=>Object.keys(p.when).length&&!matched.includes(p.id)).map(p=>p.id)};});
  libraries.push({chapter:c.id,title:c.title,passages,scenarios,review:{at:new Date().toISOString(),actor:'codex-editorial',seedVersion:SEED_VERSION,engine:LIBRARY_VERSION,editorialReviewed:true,externalExpertApproved:false,scope:c.topicId==='creative'?'fiction-not-biography':'question-guide-not-personal-evidence',checks:scenarios.map(s=>({sampleId:s.sampleId,positive:s.expectedPassageIds.length,negative:s.forbiddenPassageIds.length}))}});
 }
 return {seedVersion:SEED_VERSION,samples,libraries,checks};
}
module.exports={build};
if(require.main===module)build().then(pack=>{const dir=process.argv[2]||'output/complete84-20261020';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'library-pack.json'),JSON.stringify(pack));console.log(JSON.stringify({chapters:pack.libraries.length,passages:pack.libraries.reduce((n,l)=>n+l.passages.length,0),syntheticChecks:pack.checks.length,seedVersion:pack.seedVersion}));}).catch(e=>{console.error(e.message);process.exitCode=1});
