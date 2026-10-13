const fs=require('fs'),assert=require('assert/strict'),{chromium}=require(process.env.TASK_PLAYWRIGHT);
(async()=>{const b=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await b.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('mt_v2_input',JSON.stringify({name:'귀인',inp:{year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}}));});
 await page.goto('http://127.0.0.1:8787/report/v2/?from=hub&flow=classic');
 await page.waitForSelector('#app[data-view="reader"]',{timeout:30000});
 const roles=await page.locator('[data-reading-role]').count();assert(roles>=120,roles); assert(await page.locator('details.reading-supplement').count()>0); const readTime=await page.locator('.rd-time').innerText(); assert(Number(readTime.split('/')[1].trim().split(':')[0])<90, readTime); assert.equal(await page.locator('details.reading-supplement[open]').count(),0);
 assert(await page.locator('body').innerText().then(t=>t.includes('약점을 장점으로 승화하는 방법')));
 await page.locator('.rd-play').click(); await page.locator('[data-reading-role=title]').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(700); assert(await page.locator('[data-reading-role=title]').first().isVisible()); assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)); await page.screenshot({path:'docs/reading-renewal-mobile.png'});
 const checked=await page.evaluate(()=>{
  const R=ReportV2,M=Manse,ch=M.compute({year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}),sd=R.SajuData.build(ch,{now:Date.UTC(2026,9,13,3)}),pack=R.Compose.fromSaved(null,[],'full'),rep=R.Compose.build(sd,pack.lib,pack.cfg,{});R.Deep.augment(rep,{M,ch,sd,now:Date.UTC(2026,9,13),assets:{}});const flow=R.ReadingFlow.build(rep,sd,{M,ch});
  // Browser DOM is necessary to check setters for HTML paragraphs and fixed fact layers.
  const primary=flow.chapters.find(c=>c.readingSection===4),job=R.FullReading.collect(primary,'');
  const fixed=primary.scenes.filter(s=>s.readingLayer==='fact'||s.readingLayer==='model').map(s=>s.html).join('');
  const ok=R.FullReading.apply(job,{paragraphs:job.chapter.paragraphs.map(p=>({id:p.id,text:'실제 상황에서 부담이 커지는 조건을 확인하고 작은 행동 하나를 바꾸어 결과를 비교합니다. 필요한 도움과 역할을 함께 기록합니다.'}))});
  const preserved=fixed===primary.scenes.filter(s=>s.readingLayer==='fact'||s.readingLayer==='model').map(s=>s.html).join('');
  const sync=primary.readingCore.practice.includes('실제 상황');
  const html=R.Pdf.pages(flow,sd,{name:'귀인'}).join('');document.body.insertAdjacentHTML('beforeend','<div id="pdf-test-host" style="position:absolute;top:0;left:0;z-index:10000"><style>'+R.Pdf.CSS+'</style>'+html+'</div>');
  const overflow=[...document.querySelectorAll('.pg')].map((p,i)=>({i,height:p.querySelector('.in').getBoundingClientRect().height})).filter(x=>x.height>1060);
  return {ok,preserved,sync,roles:job.chapter.paragraphs.map(p=>p.role),pages:document.querySelectorAll('.pg').length,overflow};
 });
 assert(checked.ok&&checked.preserved&&checked.sync,JSON.stringify(checked));assert.equal(checked.overflow.length,0,JSON.stringify(checked.overflow));
 await page.setViewportSize({width:820,height:1150});await page.locator('.pg').nth(2).screenshot({path:'docs/reading-renewal-pdf.png'});assert.equal(errors.length,0,JSON.stringify(errors));
 fs.writeFileSync('docs/MOVINGTOON_BROWSER_RESULTS.json',JSON.stringify({mobileRoles:roles,readTime,pageErrors:errors,...checked},null,2));console.log('Browser PASS '+JSON.stringify(checked));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
