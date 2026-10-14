const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require(process.env.TASK_PLAYWRIGHT || 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const routed=[];
const BASE=process.env.TASK_CHAPTER_BASE || 'http://127.0.0.1:8793';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});const errors=[];
 try{
  const admin=await browser.newPage({viewport:{width:1280,height:960}});admin.on('pageerror',e=>errors.push('admin:'+e.message));
  await admin.goto(BASE+'/report/admin/');await admin.locator('#pw').fill('test');await admin.locator('#loginBtn').click();await admin.locator('#app:not(.hide)').waitFor();
  await admin.locator('#grpBar button[data-g="ai"]').click();await admin.locator('#subBar button[data-t="ikrules"]').click();await admin.locator('[data-chapter="wealth"]').waitFor();
  assert.equal(await admin.locator('[data-chapter]').count(),6);
  const wealth=admin.locator('[data-chapter="wealth"]');await wealth.locator('summary').click();await wealth.locator('[data-purpose]').fill('수입·회수·지출·축적을 구분해 답하는 재물 해석.');await wealth.locator('[data-hook-max]').fill('90');
  const savedResponse=admin.waitForResponse(r=>r.url().endsWith('/api/interpretation-settings')&&r.request().method()==='POST');await admin.locator('[data-save]').click();const saved=await(await savedResponse).json();assert(saved.ok,JSON.stringify(saved));assert.equal(saved.settings.chapters.wealth.hook.maxChars,90);
  await admin.locator('[data-chapter="wealth"]').waitFor();assert.equal(await admin.locator('[data-chapter="wealth"] [data-purpose]').inputValue(),'수입·회수·지출·축적을 구분해 답하는 재물 해석.');
  await admin.locator('button[data-t="iklab"]').click();await admin.locator('#lRun').click();await admin.locator('#lOut').getByText('계산·분석 중…',{exact:true}).waitFor({state:'hidden',timeout:15000});
  await admin.locator('button[data-t="ikrules"]').click();await admin.locator('[data-chapter="wealth"]').waitFor();await admin.locator('[data-chapter="wealth"] summary').click();
  const previewResponse=admin.waitForResponse(r=>r.url().endsWith('/api/chapter-hook'));await admin.locator('[data-chapter="wealth"] [data-hook-action="preview"]').click();const preview=await(await previewResponse).json();assert(preview.ok);assert.equal(preview.hook,null,'empty DB must not invent a hook');assert(await admin.locator('[data-chapter="wealth"] [data-hook-output]').innerText().then(t=>t.includes('근거가 부족')));
  await admin.screenshot({path:'output/chapter-admin-preview.png',fullPage:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push('viewer:'+e.message));
  const hook={text:'매출이 늘어도 회수와 지출 관리가 빠지면 돈이 남기 어렵습니다.',explanation:'검사 전용 후킹의 화면 연결을 확인합니다. 실제 미래 수익을 보장하는 해석이 아닙니다.',hanja:'財物運',claim_id:'saju:test',basis:{elements:[],evidence:[]},source:'fixture'};
  await page.route('**/api/movingtoon-reading',async route=>{
   const b=route.request().postDataJSON(),p=MantraPolicyForTest(b.chapter);routed.push({id:b.chapter.id,kind:p,rows:b.chapter.paragraphs.length});const paragraphs=b.chapter.paragraphs.map(x=>({id:x.id,text:x.text+(p==='wealth'&&x.role==='reality'?' 기본 기질은 본래의 나에서 확인합니다.':''),refs:['natal'],claim_ids:[]}));
   await route.fulfill({json:{ok:true,result:{paragraphs},provider:'fixture',hook:p==='wealth'?hook:null,interpretation:{mode:'grounded',claims:[]}}});
  });
  function MantraPolicyForTest(c){return c.chapterKind || (/재물/.test(c.title)?'wealth':'');}
  await page.addInitScript(()=>sessionStorage.setItem('mt_v2_input',JSON.stringify({name:'테스트귀인',inp:{year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}})));
  await page.goto(BASE+'/report/v2/?from=hub&flow=classic');await page.waitForSelector('#app[data-view="reader"]',{timeout:30000});
  await page.waitForFunction(()=>document.body.textContent.includes('매출이 늘어도 회수와 지출 관리'),undefined,{timeout:10000}).catch(async e=>{await page.screenshot({path:'output/chapter-browser-failure.png',fullPage:true});console.error(JSON.stringify({errors,routed,headlines:await page.locator('.rd-chead,.rd-mini').allTextContents()}));throw e;});
  assert(await page.locator('body').innerText().then(t=>t.includes('테스트귀인님, 매출이 늘어도')));assert(await page.locator('body').innerText().then(t=>t.includes('財物運')));assert(await page.locator('[data-reading-role]').count()>=120);
  const basisLink=page.locator('[data-basis-reference="self"]').first();assert(await basisLink.count());const target=await basisLink.getAttribute('href');assert(await page.locator(target).count(),'self reference must point to a real chapter');
  await page.locator('.rd-play').click();await page.locator('[data-reading-role=title]').first().scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const pdf=await page.evaluate(async fixture=>{
   const R=ReportV2,ch=Manse.compute({year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}),sd=R.SajuData.build(ch,{now:Date.UTC(2026,9,14,3)}),core=R.ReadingFlow.card(sd,5),chapter={id:'c08',base:'c08',title:'재물운',readingSection:6,readingCore:core,chapterHook:fixture,hookName:'테스트귀인',interpretationAnalysis:{mode:'grounded',claims:[]},readingParagraphs:Object.keys(core).map((key,i)=>({id:String(i),role:key,text:core[key],refs:[],claim_ids:[]}))},rep={chapters:[chapter],readingFlow:{future:[]}},html=R.Pdf.pages(rep,sd,{name:'테스트귀인'}).join('');
   document.body.insertAdjacentHTML('beforeend','<div id="chapter-pdf-test" style="position:absolute;top:0;left:0;z-index:10000"><style>'+R.Pdf.CSS+'</style>'+html+'</div>');
   return {hook:html.includes(fixture.text),name:html.includes('테스트귀인님'),explanation:html.includes(fixture.explanation),pages:document.querySelectorAll('.pg').length,overflow:[...document.querySelectorAll('.pg .in')].map(x=>x.getBoundingClientRect().height).filter(h=>h>1060)};
  },hook);
  assert(pdf.hook&&pdf.name&&pdf.explanation);assert.equal(pdf.overflow.length,0,JSON.stringify(pdf));await page.setViewportSize({width:820,height:1150});await page.locator('.pg').nth(2).screenshot({path:'output/chapter-pdf-hook.png'});
  const pendingPage=await browser.newPage({viewport:{width:390,height:844}});pendingPage.on('pageerror',e=>errors.push('pending:'+e.message));
  await pendingPage.route('**/api/movingtoon-reading',route=>route.fulfill({status:502,json:{ok:false,error:'chapter-validation-failed',engineMode:'grounded'}}));
  await pendingPage.addInitScript(()=>sessionStorage.setItem('mt_v2_input',JSON.stringify({name:'실패검수',inp:{year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}})));
  await pendingPage.goto(BASE+'/report/v2/?from=hub&flow=classic');await pendingPage.waitForSelector('#app[data-view="reader"]',{timeout:30000});
  await pendingPage.waitForFunction(()=>document.body.textContent.includes('개인별 풀이가 검수를 통과하지 못했습니다.'));
  const pendingText=await pendingPage.getByRole('article',{name:'재물과 사업',exact:true}).innerText();assert(pendingText.includes('일반 실천 점검:'));assert(pendingText.includes('고정비와 변동비'));assert(pendingText.includes('재성 0%'));
  const pendingPdf=await pendingPage.evaluate(()=>{const R=ReportV2,sd=R.SajuData.build(Manse.compute({year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'})),core=R.ReadingFlow.card(sd,5),c={id:'pending-wealth',base:'c08',title:'재물과 사업',readingSection:6,readingCore:core,readingDeferred:true,chapterHook:null};c.readingParagraphs=R.FullReading.deferredParagraphs({chapter:{paragraphs:['reality','reinforce','practice'].map((role,i)=>({id:String(i),role,text:core[role]}))}},c,sd);const html=R.Pdf.pages({chapters:[c],readingFlow:{future:[]}},sd,{name:'실패검수'}).join('');return {warning:html.includes('검수를 통과하지 못'),guidance:html.includes('일반 실천 점검:'),noHook:!html.includes('검사 전용 후킹')};});assert(pendingPdf.warning&&pendingPdf.guidance&&pendingPdf.noHook,JSON.stringify(pendingPdf));await pendingPage.close();
  assert.equal(errors.length,0,JSON.stringify(errors));fs.writeFileSync('output/CHAPTER_BROWSER_RESULTS.json',JSON.stringify({date:'2026-10-14',adminSettings:true,emptyDBPreview:true,mobileHook:true,autoScrollControls:true,pdf,pendingPdf,errors},null,2));console.log('chapter-browser PASS '+JSON.stringify(pdf));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
