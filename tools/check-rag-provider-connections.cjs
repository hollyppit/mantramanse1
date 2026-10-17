// No inference, paid search, model generation or production writes.
const fs=require('node:fs');
function readConfig(file){const config={OPENAI_API_KEY:process.env.OPENAI_API_KEY||'',BRAVE_SEARCH_API_KEY:process.env.BRAVE_SEARCH_API_KEY||''};if(file){for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^\s*(OPENAI_API_KEY|BRAVE_SEARCH_API_KEY|BRAVE_FREE_QUERY_CONFIRMED|BRAVE_FREE_QUERIES_REMAINING)\s*=\s*(.*?)\s*$/);if(m){let value=m[2];if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);config[m[1]]=value;}}}return config;}
async function probe(config,fetcher=fetch){
  const report={checkedAt:new Date().toISOString(),inferenceRequests:0,searchQueries:0,productionWrites:0,providers:{}};
  for(const [name,url]of [['openai','https://api.openai.com/v1/models'],['brave','https://api.search.brave.com/res/v1/web/search']]){
    const key=name==='openai'?config.OPENAI_API_KEY:config.BRAVE_SEARCH_API_KEY,freeSearch=name==='brave'&&!!key&&config.BRAVE_FREE_QUERY_CONFIRMED==='true'&&Number(config.BRAVE_FREE_QUERIES_REMAINING)>=1;
    const target=freeSearch?url+'?q='+encodeURIComponent('명리학 고전')+'&count=1':url,headers=name==='openai'&&key?{authorization:'Bearer '+key}:freeSearch?{'X-Subscription-Token':key}:{};
    if(freeSearch)report.searchQueries++;
    try{const r=await fetcher(target,{method:'GET',headers,signal:AbortSignal.timeout(15000),redirect:'error'});await r.arrayBuffer();report.providers[name]={tlsHTTPReachable:true,httpStatus:r.status,authenticated:!!key&&r.ok&&(name==='openai'||freeSearch),localCredentialAvailable:!!key,freeQuotaBasis:freeSearch?'user-confirmed dashboard allowance':null,fullResearchValidated:false};}
    catch{report.providers[name]={tlsHTTPReachable:false,authenticated:false,fullResearchValidated:false};}
  }
  report.limitations=['OpenAI GET /models does not run inference.','Brave search runs at most once only with an explicitly confirmed available free query; otherwise no token or query is sent.','Sealed production keys are not extracted. Authentication errors do not establish a working research pipeline.'];
  return report;
}
async function main(){const report=await probe(readConfig(process.argv[2]));
  fs.writeFileSync('docs/AGENTIC_RAG_PROVIDER_CONNECTIONS_2026-10-17.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
module.exports={readConfig,probe};
if(require.main===module)main().catch(()=>{console.error('provider-probe-failed');process.exitCode=1;});
