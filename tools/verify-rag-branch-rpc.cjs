// Actual hosted PostgREST/RPC via JWT + expiring-token relay. Synthetic rows only.
const fs=require('node:fs'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const c=JSON.parse(fs.readFileSync('output/protected-backup/branch-rpc.json'));assert.equal(c.branchRef,'xovunlsvhpthkhjsnhzt');assert(!c.url.includes('devkslhggrkqtianjamj'));
 const realFetch=fetch,checks={},headers={apikey:c.anon,authorization:'Bearer '+c.anon,'x-rag-relay-token':c.token,'content-type':'application/json'};
 const relay=async(route,init={})=>{const r=await realFetch(c.url+route,{...init,headers:{...headers,...init.headers}});if(!r.ok)throw Error('relay-http-'+r.status+':'+(await r.text()).slice(0,100));const text=await r.text();return text?JSON.parse(text):null;};
 const before=await relay('/rest/v1/kv?select=key,value');assert.deepEqual(before,[],'branch must start empty');checks.noProductionDataCopied=true;
 const value='[{"id":"SELF-0001","reviewed":true,"status":"published","version":7}]';await relay('/rest/v1/kv',{method:'POST',body:JSON.stringify([{key:'ik:d:SELF',value}])});
 const {kvOf}=await import(pathToFileURL(path.resolve('functions/_store.js'))),{updateState,readState}=await import(pathToFileURL(path.resolve('functions/_rag-state.js')));
 global.fetch=(url,init={})=>{assert(String(url).startsWith(c.url+'/rest/v1/'));return realFetch(url,{...init,headers:{...init.headers,'x-rag-relay-token':c.token}});};
 try{const env={SUPABASE_URL:c.url,SUPABASE_SERVICE_KEY:c.anon,GLOSSARY_KV:{get:async()=>null}},kv=kvOf(env);await Promise.all(Array.from({length:4},()=>updateState(kv,s=>{s.usage.hosted=(s.usage.hosted||0)+1;})));assert.equal((await readState(kv)).usage.hosted,4);checks.actualAdapterHTTPRPC=true;checks.concurrentCAS=true;assert.equal(await kv.researchCAS('stale','{}'),false);checks.staleCASRejected=true;assert.equal(await kv.get('ik:d:SELF'),value);checks.approvalPublicationOriginalUnchanged=true;
 const anon=await realFetch('https://'+c.branchRef+'.supabase.co/rest/v1/rpc/rag_compare_and_swap',{method:'POST',headers:{apikey:c.anon,authorization:'Bearer '+c.anon,'content-type':'application/json'},body:'{"p_expected":null,"p_next":"{}"}'});assert([401,403].includes(anon.status));checks.directAnonymousRPCDenied=true;
 const missing=await realFetch(c.url+'/rest/v1/kv');assert([401,403].includes(missing.status));checks.relayAuthenticationRequired=true;
 const report={checkedAt:new Date().toISOString(),branchRef:c.branchRef,productionWrites:0,transport:'HTTPS Edge relay -> hosted PostgREST -> SQL function; service key stays inside branch',checks,passed:true};fs.writeFileSync('docs/AGENTIC_RAG_HOSTED_RPC_2026-10-17.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{global.fetch=realFetch;}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
