// Run with a local HTTP server on 8768 and Playwright installed.
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER || "msedge"});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{Date.now=()=>Date.UTC(2026,9,9,3);localStorage.setItem('mantra-manse-v1',JSON.stringify({name:'검증',year:1992,month:6,day:23,hour:1,minute:30,gender:'M',lon:127.15}));});
await page.goto((process.env.CALENDAR_TEST_URL || 'http://127.0.0.1:8768') + '/report/hub/#/today');
await page.waitForSelector('.mc-day');
console.log('days',await page.locator('.mc-day').count(),'bars',await page.locator('.mc-bar').count());
await page.locator('[data-date="2026-10-14"]').click();
await page.waitForFunction(()=>document.querySelector('.tscore h2').textContent==='선택한 날의 운 지수');
await page.selectOption('#mc-purpose','move');
await page.waitForSelector('.mc-pick');
console.log('recommendations',await page.locator('.mc-pick').count());
await page.selectOption('#mc-range','90');
await page.selectOption('#mc-weekday','weekend');
await page.waitForTimeout(400);
await page.locator('.mc-pick').first().click();
await page.waitForTimeout(400);
await page.click('#mc-today');
await page.waitForFunction(()=>document.querySelector('.tscore h2').textContent==='오늘의 운 지수');if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile overflow');
await page.click('[data-nav="1"]');
await page.waitForFunction(()=>document.querySelectorAll('.mc-day').length===30);
await page.click('[data-year="-1"]');
await page.waitForTimeout(300);
await page.click('#mc-today');
await page.waitForFunction(()=>document.querySelectorAll('.mc-day').length===31);
console.log('PASS calendar interactions');
await browser.close();if(errors.length)process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});


