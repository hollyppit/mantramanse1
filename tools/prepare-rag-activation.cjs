// Local preparation only. Owner approved $1/day and $1/month, 03:00 KST, changes auto-approved after grounding.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const S=await import(pathToFileURL(path.resolve('functions/_rag-state.js'))),R=await import(pathToFileURL(path.resolve('functions/_rag-runner.js')));
 const c=S.cleanConfig({...S.DEFAULTS,enabled:true,autoPublish:true,autoApproveChanges:true,legacyOnly:false,time:'03:00',dailyBudget:1,monthlyBudget:1,taskBudget:.05,maxTasks:1,maxSearches:1,maxDocs:1,retries:0,model:'gpt-4.1-mini-2025-04-14',inputPrice:.5,outputPrice:2,searchPrice:.005,allowed:[{origin:'https://zh.wikisource.org',grade:'B',author:'Wikisource contributors; 고전 원저자 및 문서 이력 참조',license:'Public-domain classical texts; CC BY-SA 4.0 attribution/share-alike where applicable',rightsUrl:'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',commercial:true,quote:true,store:true,automaticSupport:true}]});
 fs.mkdirSync('output/rag-activation',{recursive:true});fs.writeFileSync('output/rag-activation/config.json',JSON.stringify(c,null,2));
 const base='name = "mantra-rag-scheduler"\nmain = "../../workers/rag-scheduler.js"\ncompatibility_date = "2026-10-17"\nworkers_dev = false\n[vars]\nRAG_API_ORIGIN = "https://mantramanse.pages.dev"\n[triggers]\n';
 fs.writeFileSync('output/rag-activation/worker-off.toml',base+'crons = []\n');fs.writeFileSync('output/rag-activation/worker-on.toml',base+'crons = ["0 18 * * *"]\n');
 console.log(JSON.stringify({dailyBudget:c.dailyBudget,monthlyBudget:c.monthlyBudget,maxTasks:1,worstCasePerTask:R.taskCeiling(c),time:c.time,autoApproveChanges:true,model:c.model}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
