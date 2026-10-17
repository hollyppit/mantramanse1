const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const N=await import(pathToFileURL(path.resolve('functions/_rag-network.js')));let calls=0;
 global.fetch=async(url,init)=>{calls++;assert.equal(init.redirect,'manual');return Response.json({type:'search',query:{original:'no matching classical source'}});};
 assert.deepEqual(await N.searchWeb({BRAVE_SEARCH_API_KEY:'fake'},'query'),[]);assert.equal(calls,1);
 global.fetch=async()=>Response.json({error:'unexpected response'});await assert.rejects(N.searchWeb({BRAVE_SEARCH_API_KEY:'fake'},'query'),/invalid-search-response/);
 global.fetch=async()=>new Response('',{status:302,headers:{location:'https://unapproved.org'}});await assert.rejects(N.searchWeb({BRAVE_SEARCH_API_KEY:'fake'},'query'),/upstream-http-302/);
 console.log('valid empty search stops without fabricated evidence; malformed and redirect responses rejected');
})().catch(e=>{console.error(e);process.exitCode=1;});
