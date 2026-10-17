const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
  const {kvOf}=await import(pathToFileURL(path.resolve('functions/_store.js'))),{STATE_KEY,updateState,readState}=await import(pathToFileURL(path.resolve('functions/_rag-state.js')));
  const rows=new Map([['ik:d:SELF','[{"id":"preserved"}]']]),baseline=rows.get('ik:d:SELF');let reads=0,rpc=0;
  global.fetch=async(url,init={})=>{
    const u=new URL(url);assert.equal(init.headers.authorization,'Bearer fake-service-secret');
    if(u.pathname.endsWith('/rpc/rag_compare_and_swap')){rpc++;const b=JSON.parse(init.body);assert.deepEqual(Object.keys(b).sort(),['p_expected','p_next']);await Promise.resolve();if((rows.get(STATE_KEY)||null)!==b.p_expected)return Response.json(false);rows.set(STATE_KEY,b.p_next);return Response.json(true);}
    if(u.pathname==='/rest/v1/kv'&&!init.method){reads++;const key=u.searchParams.get('key').slice(3),value=rows.get(key);return Response.json(value===undefined?[]:[{value,expires_at:null}]);}
    throw Error('unexpected storage request '+u.pathname);
  };
  const env={SUPABASE_URL:'https://db.org',SUPABASE_SERVICE_KEY:'fake-service-secret',GLOSSARY_KV:{get:async()=>null}},kv=kvOf(env,{cache:true});
  await Promise.all(Array.from({length:6},()=>updateState(kv,s=>{s.usage.test=(s.usage.test||0)+1;})));
  assert.equal((await readState(kv)).usage.test,6);assert(rpc>6);const count=reads;await readState(kv);await readState(kv);assert.equal(reads,count+2,'runtime must bypass 20-second memo');assert.equal(rows.get('ik:d:SELF'),baseline);
  assert.equal(await kv.researchCAS('stale','{}'),false);
  const sql=require('node:fs').readFileSync('supabase/migrations/20261017_rag_cas.sql','utf8');assert(sql.includes("key='ik:agentic:runtime' and value=p_expected"));assert(sql.includes('from public, anon, authenticated'));assert(!/drop\s+table|truncate|delete\s+from/i.test(sql));
  console.log('rag-store OK: Supabase RPC contract, concurrent CAS retries, original rows preserved, no runtime memo cache, restricted additive SQL (SQL not executed against PostgreSQL)');
})().catch(e=>{console.error(e);process.exitCode=1;});
