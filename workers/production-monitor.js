import {samples,chapters} from './production-monitor-fixtures.js';
const DATASET='mantra_production_monitor',SLOT=300000;
export function point(env,kind,code,{status=200,ms=0,calls=0,valid=true,id='other'}={}){env.READING_MONITOR.writeDataPoint({indexes:['mantramanse/'+kind],blobs:[kind,'server',id,code],doubles:[status,ms,calls,valid?1:0]});}
export function validateProbe(data,status,monitorHeader){
 if(status!==200)return 'http-'+status;
 if(!data?.ok||data.provider!=='reviewed-library'||data.pending?.length||data.result?.paragraphs?.length!==8)return 'chapter-output-invalid';
 if(data.providerCallCount!==0||data.requestCostUSD!==0||data.generatedParagraphCount!==0||!data.aiSkipped||data.generation?.model!=='none')return 'visitor-ai-call';
 if(data.result.paragraphs.some(p=>typeof p.text!=='string'||p.text.length<30||p.text.length>1200||/〔[^〕]+〕/.test(p.text)))return 'chapter-text-invalid';
 if(monitorHeader!=='production-monitor-1')return 'request-telemetry-missing';
 return null;
}
export function probeJobs(slot){const start=slot%12*28;return Array.from({length:28},(_,i)=>{const n=(start+i)%336;return {chapter:chapters[n%84],sd:samples[Math.floor(n/84)]};});}
async function probe(env,job,fetcher=fetch){const begin=Date.now();try{const response=await fetcher(env.SERVICE_ORIGIN+'/api/movingtoon-reading',{method:'POST',headers:{'content-type':'application/json','x-mantra-monitor':'server-v1'},body:JSON.stringify({sd:job.sd,chapter:{id:job.chapter.id,title:job.chapter.title,paragraphs:['title','why','reality','strength','risk','reinforce','practice','evidence'].map((role,i)=>({id:String(i),role,text:'서버 상태를 확인하는 사전 계산 합성 명조의 검수 문안 요청입니다.'}))}}),signal:AbortSignal.timeout(12000)});let data;try{data=await response.json();}catch{return {chapter:job.chapter.id,status:response.status,ms:Date.now()-begin,error:'non-json-response'};}return {chapter:job.chapter.id,status:response.status,ms:Date.now()-begin,error:validateProbe(data,response.status,response.headers.get('x-mantra-monitor'))};}catch{return {chapter:job.chapter.id,status:0,ms:Date.now()-begin,error:'probe-timeout-or-network'};}}
async function api(env,path,body,graphql=false){const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{method:'POST',headers:{authorization:'Bearer '+env.CF_MONITOR_TOKEN,'content-type':graphql?'application/json':'text/plain'},body:graphql?JSON.stringify(body):body,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('metrics-api-'+r.status);return r.json();}
export async function metrics(env,now){const end=new Date(now-120000).toISOString(),start=new Date(now-720000).toISOString();const query=`query{viewer{accounts(filter:{accountTag:"${env.ACCOUNT_ID}"}){pagesFunctionsInvocationsAdaptiveGroups(limit:100,filter:{scriptName:"pages-worker--20160827-production",datetime_geq:"${start}",datetime_leq:"${end}"}){dimensions{status}sum{requests errors}}}}}`;const d=await api(env,'graphql',{query},true);if(d.errors?.length)throw Error('edge-metrics-unavailable');const rows=d.data?.viewer?.accounts?.[0]?.pagesFunctionsInvocationsAdaptiveGroups;if(!Array.isArray(rows))throw Error('edge-metrics-invalid');const errors=rows.reduce((n,r)=>n+Number(r.sum?.errors||0),0);if(errors)point(env,'incident','edge-runtime-errors',{status:503,calls:0});const q=`SELECT sum(_sample_interval) AS requests, quantileExactWeighted(0.95)(double2, _sample_interval) AS p95 FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '7' MINUTE AND timestamp < NOW() - INTERVAL '2' MINUTE AND blob2 = 'real' AND (blob1 = 'request' OR blob1 = 'incident') FORMAT JSON`;const a=await api(env,'accounts/'+env.ACCOUNT_ID+'/analytics_engine/sql',q);const row=a.data?.[0];if(!row)throw Error('request-metrics-unavailable');return {edgeRequests:rows.reduce((n,r)=>n+Number(r.sum?.requests||0),0),edgeErrors:errors,realRequests:Number(row.requests)||0,p95:Number(row.p95)||0};}
export async function run(env,{now=Date.now(),manual=false,fetcher=fetch,readMetrics=metrics}={}){
 const slot=Math.floor(now/SLOT),old=await env.MONITOR_STATE.get('state','json')||{};
 if(!manual&&old.slot>=slot)return {skipped:'already-checked'};
 const results=[],jobs=probeJobs(slot);let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<jobs.length){const result=await probe(env,jobs[cursor++],fetcher);results.push(result);if(result.error||result.ms>=10000)point(env,'incident',result.error||'synthetic-slow',{status:result.status,ms:result.ms,valid:!result.error,id:result.chapter});}}));
 let observations=null,metricError=null;try{observations=await readMetrics(env,now);}catch(e){metricError=e.message;point(env,'incident','monitor-metrics-unavailable',{status:503});}
 const slow=observations?.realRequests>=20&&observations.p95>=3000,streak=slow?(old.slowStreak||0)+1:0;if(streak>=2)point(env,'incident','real-p95-slow',{ms:observations.p95});
 const state={version:1,slot,at:new Date(now).toISOString(),source:'cloudflare-cron',manual,checked:results.length,failures:results.filter(x=>x.error||x.ms>=10000),observations,metricError,slowStreak:streak,coverage:{...old.coverage,...Object.fromEntries(results.map(r=>[r.chapter,{at:new Date(now).toISOString(),status:r.status,error:r.error,ms:r.ms}]))}};
 await env.MONITOR_STATE.put('state',JSON.stringify(state));point(env,'heartbeat','scheduled-complete',{valid:!state.failures.length&&!metricError});return state;
}
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(run(env));},
 async fetch(request,env){const url=new URL(request.url);if(!env.MONITOR_ADMIN_TOKEN||request.headers.get('authorization')!=='Bearer '+env.MONITOR_ADMIN_TOKEN)return new Response('Not found',{status:404});
 if(request.method==='GET'&&url.pathname==='/status')return Response.json(await env.MONITOR_STATE.get('state','json')||{pending:true});
 if(request.method==='POST'&&url.pathname==='/run')return Response.json(await run(env,{manual:true}));
 if(request.method==='POST'&&url.pathname==='/init'){point(env,'heartbeat','monitor-initialized');return Response.json({ok:true});}
 if(request.method==='POST'&&url.pathname==='/test-alert'){point(env,'incident','notification-delivery-test',{status:503,valid:false});return Response.json({ok:true,test:true});}
 return new Response('Not found',{status:404});
 }
};
