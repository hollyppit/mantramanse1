const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require(process.env.TASK_PLAYWRIGHT || 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[],base=process.env.TASK_CHAPTER_BASE || 'http://127.0.0.1:8793';
 try{
  const page=await browser.newPage({viewport:{width:1280,height:960}});page.on('pageerror',e=>errors.push(e.message));
  const bad=await page.request.post(base+'/api/movingtoon-reading',{data:{}});assert.equal(bad.status(),400);const failure=await bad.json();assert(failure.requestId);
  const denied=await page.request.get(base+'/api/reading-diagnostics');assert.equal(denied.status(),401);
  await page.goto(base+'/report/admin/');await page.locator('#pw').fill('test');await page.locator('#loginBtn').click();await page.locator('#app:not(.hide)').waitFor();
  await page.locator('#grpBar [data-g="qa"]').click();await page.locator('#subBar [data-t="v2quality"]').click();await page.locator('#qaGo').click();
  await page.getByText('풀이 생성 진단 · 최근 7일 최대 100건',{exact:true}).waitFor();
  const card=page.locator('.card').filter({hasText:'풀이 생성 진단 · 최근 7일 최대 100건'});const text=await card.innerText();assert(text.includes(failure.requestId));assert(text.includes('CALCULATION_INPUT'));assert(text.includes('수집 켜짐'));assert(!text.includes('NaN'));
  await card.screenshot({path:'output/reading-diagnostics-admin.png'});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile admin must not overflow');assert.equal(errors.length,0,JSON.stringify(errors));
  fs.writeFileSync('output/READING_DIAGNOSTICS_BROWSER.json',JSON.stringify({adminAuth:true,requestCorrelation:true,codesVisible:true,mobileNoOverflow:true,errors},null,2));console.log('reading-diagnostics-browser: actual API record, auth, admin row, mobile width PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
