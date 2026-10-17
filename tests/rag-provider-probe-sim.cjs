const assert=require('node:assert/strict'),{probe}=require('../tools/check-rag-provider-connections.cjs');
(async()=>{
  let calls=[];const fetcher=async(url,init)=>{calls.push({url,init});assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert(!url.includes('/responses'));return Response.json({},{status:init.headers.authorization||init.headers['X-Subscription-Token']?200:401});};
  let result=await probe({},fetcher);assert.equal(result.searchQueries,0);assert.equal(result.inferenceRequests,0);assert(!result.providers.openai.authenticated);assert(calls.every(c=>!c.url.includes('?')));
  calls=[];result=await probe({OPENAI_API_KEY:'fixture-only',BRAVE_SEARCH_API_KEY:'fixture-only'},fetcher);assert(result.providers.openai.authenticated);assert(!result.providers.brave.authenticated);assert(!calls[1].init.headers['X-Subscription-Token']);assert(!JSON.stringify(result).includes('fixture-only'));
  calls=[];result=await probe({BRAVE_SEARCH_API_KEY:'fixture-only',BRAVE_FREE_QUERY_CONFIRMED:'true',BRAVE_FREE_QUERIES_REMAINING:'1'},fetcher);assert.equal(result.searchQueries,1);assert(result.providers.brave.authenticated);assert.equal(calls.length,2);assert(calls[1].url.includes('count=1'));
  for(const remaining of ['0','-1','NaN']){calls=[];result=await probe({BRAVE_SEARCH_API_KEY:'fixture-only',BRAVE_FREE_QUERY_CONFIRMED:'true',BRAVE_FREE_QUERIES_REMAINING:remaining},fetcher);assert.equal(result.searchQueries,0);assert(!calls[1].url.includes('?'));}
  console.log('provider probe: GET-only auth, zero inference, no secret logs, free-search gate and single request PASS');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
