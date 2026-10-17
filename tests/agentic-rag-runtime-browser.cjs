const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.TASK_PLAYWRIGHT||'C:/Users/SOLCOM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const imp=f=>import(pathToFileURL(path.resolve(f))),{onRequest}=await imp('functions/api/agentic-rag.js'),K=await imp('functions/_ik.js'),S=await imp('functions/_rag-state.js'),V=await imp('functions/_rag-view.js');
  const original={...K.cleanItem({id:'SELF-0001',title:'보존 테스트 지식',domain:'SELF',subDomain:K.DEFAULT_DESIGN.SELF.sections[0].id,status:'published',reviewed:true,sourceType:'book',conditions:{dayMaster:['갑']},principle:'갑목의 조건부 전통 설명',interpretation:'해당 조건에서의 전통 해석',stance:'neutral'},null),version:3},baseline=JSON.stringify([original]),map=new Map([['ik:d:SELF',baseline]]);
  const kv={get:async(k,t)=>map.has(k)?t==='json'?JSON.parse(map.get(k)):map.get(k):null,put:async(k,v)=>{assert(k.startsWith('ik:agentic:'));map.set(k,v);},researchCAS:async(expected,next)=>{if((map.get(S.STATE_KEY)||null)!==expected)return false;map.set(S.STATE_KEY,next);return true;}};
  const env={ADMIN_PASSWORD:'test',GLOSSARY_KV:kv,BRAVE_SEARCH_API_KEY:'search-test',OPENAI_API_KEY:'ai-test'};
  global.fetch=async(url,init={})=>{
    if(String(url).startsWith('https://api.search.brave.com/'))return Response.json({web:{results:[{url:'https://library.org/book',title:'시험 문헌'}]}});
    if(url==='https://library.org/book')return new Response(original.principle+' '+original.interpretation,{headers:{'content-type':'text/plain'}});
    if(url==='https://api.openai.com/v1/responses'){const b=JSON.parse(init.body),t=JSON.parse(b.input).target;delete t.id;return Response.json({status:'completed',model:'test-model',usage:{input_tokens:100,output_tokens:100},output_text:JSON.stringify({kind:'evidence',sourceUrl:'https://library.org/book',quote:original.principle+' '+original.interpretation,item:t})});}
    throw Error('Unexpected provider URL');
  };
  const style=fs.readFileSync('report/admin/index.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
  const server=http.createServer(async(q,r)=>{try{
    if(q.url.startsWith('/api/agentic-rag')){let body='';for await(const p of q)body+=p;const response=await onRequest({request:new Request('http://test'+q.url,{method:q.method,headers:q.headers,...(q.method==='POST'?{body}:{})}),env});r.writeHead(response.status,{'content-type':'application/json'});r.end(await response.text());return;}
    if(q.url==='/panel.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(fs.readFileSync('report/admin/v2-agentic-rag.js'));return;}
    r.writeHead(200,{'content-type':'text/html;charset=utf-8'});r.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+style+'</style><div class="wrap"><div id="t-agentic"></div></div><script src="/panel.js"></script></html>');
  }catch(e){r.writeHead(500);r.end(e.message);}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>V2AgenticRag.open('test'));
    await page.getByText('자동 연구 설정 · 출처와 비용',{exact:true}).click();
    await page.locator('[name=enabled]').check();await page.locator('[name=autoPublish]').check();await page.locator('[name=model]').fill('test-model');
    for(const name of ['dailyBudget','monthlyBudget','taskBudget'])await page.locator('[name='+name+']').fill('10');for(const name of ['inputPrice','outputPrice'])await page.locator('[name='+name+']').fill('1');await page.locator('[name=searchPrice]').fill('0.01');
    await page.locator('[name=allowed]').fill(JSON.stringify([{origin:'https://library.org',grade:'A',author:'시험 문헌',license:'테스트 이용 허용',rightsUrl:'https://library.org/rights',commercial:true,quote:true,store:true,automaticSupport:true}]));
    await page.getByRole('button',{name:'설정 저장',exact:true}).click();await page.locator('#arRuntimeStatus').filter({hasText:'처리했습니다.'}).waitFor();
    await page.getByRole('button',{name:'수동 연구 시작',exact:true}).click();await page.locator('#arRuntimeStatus').filter({hasText:'처리했습니다.'}).waitFor();
    for(let i=0;i<8;i++){const before=(await S.readState(kv)).revision;await page.getByRole('button',{name:'연구 진행',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-action=tick]')&&!document.querySelector('[data-action=tick]').disabled);assert((await S.readState(kv)).revision>before);if(Object.keys((await S.readState(kv)).active).length)break;}
    assert.equal(Object.keys((await S.readState(kv)).active).length,1);assert.equal((await V.researchView(kv,[original])).items[0].evidence.length,1);assert.equal(map.get('ik:d:SELF'),baseline);
    const rollback=page.locator('[data-rollback]');await rollback.locator('xpath=ancestor::details').evaluate(e=>e.open=true);await page.locator('#arReason').fill('테스트에서 원래 지식 버전 복원');await rollback.click();await page.locator('#arRuntimeStatus').filter({hasText:'처리했습니다.'}).waitFor();
    assert.equal(Object.keys((await S.readState(kv)).active).length,0);assert.equal((await V.researchView(kv,[original])).items[0].version,3);assert.equal(map.get('ik:d:SELF'),baseline);
    await page.screenshot({path:'output/agentic-rag-runtime-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'output/agentic-rag-runtime-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
    console.log('agentic-rag-runtime-browser OK: settings, external research stages, automatic publication, cost display, individual rollback, desktop/mobile, original preservation');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
