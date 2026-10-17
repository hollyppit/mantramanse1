const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.TASK_PLAYWRIGHT||'C:/Users/SOLCOM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const {onRequest}=await import(pathToFileURL(path.resolve('functions/api/agentic-rag.js')));
  const db=new Map([['ik:d:SELF',JSON.stringify([{id:'SELF-0001',domain:'SELF',title:'기존 지식 <script>잘못된 태그</script>',status:'published',reviewed:true,version:1,conditions:{},principle:'기존 근거',interpretation:'기존 결론'}])]]);
  const initial=db.get('ik:d:SELF');
  const env={ADMIN_PASSWORD:'test',GLOSSARY_KV:{get:async(k,t)=>db.has(k)?t==='json'?JSON.parse(db.get(k)):db.get(k):null,put:async(k,v)=>{assert(k.startsWith('ik:agentic:'));db.set(k,v);}}};
  const style=fs.readFileSync('report/admin/index.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
  const server=http.createServer(async(q,r)=>{
    if(q.url.startsWith('/api/agentic-rag')){let body='';for await(const part of q)body+=part;const response=await onRequest({request:new Request('http://test'+q.url,{method:q.method,headers:q.headers,...(q.method==='POST'?{body}:{} )}),env});r.writeHead(response.status,{'content-type':'application/json'});r.end(await response.text());return;}
    if(q.url==='/panel.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(fs.readFileSync('report/admin/v2-agentic-rag.js'));return;}
    r.writeHead(200,{'content-type':'text/html;charset=utf-8'});r.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+style+'</style><div class="wrap"><div id="t-agentic"></div></div><script src="/panel.js"></script></html>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>V2AgenticRag.open('test'));
    await page.getByText('아직 진단 결과가 없습니다. 전체 지식 진단을 실행하세요.',{exact:true}).waitFor();assert(await page.locator('#arPlan').isDisabled());
    await page.locator('#arAudit').click();await page.locator('#arRows tr').waitFor();assert.equal(await page.locator('#arRows tr').count(),1);assert((await page.locator('#arRows').innerText()).includes('<script>잘못된 태그</script>'));assert.equal(await page.locator('#arRows script').count(),0);
    await page.locator('#arFilter').selectOption('usage');assert.equal(await page.locator('#arRows tr').count(),0);await page.locator('#arFilter').selectOption('usageUnknown');assert.equal(await page.locator('#arRows tr').count(),1);
    await page.locator('#arPlan').click();await page.getByText('1건 · 외부 검색 미연결로 대기 중 (비용 0)',{exact:true}).waitFor();
    await page.screenshot({path:'output/agentic-rag-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'output/agentic-rag-mobile.png',fullPage:true});
    await page.evaluate(()=>V2AgenticRag.open('wrong'));await page.getByText('관리자 인증이 필요합니다',{exact:true}).waitFor();assert.equal(await page.locator('#arRows').count(),0);
    assert.equal(db.get('ik:d:SELF'),initial);assert.deepEqual(errors,[]);console.log('agentic-rag-browser OK: empty state, audit, filters, task blocking, escaping, mobile, auth, original preservation');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
