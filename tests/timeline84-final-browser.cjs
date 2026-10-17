const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('C:/Users/SOLCOM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:8796',D='output/timeline84-live';
(async()=>{
 const cat=JSON.parse(fs.readFileSync('output/timeline84-review/catalog-proposal.json')),live=JSON.parse(fs.readFileSync(D+'/final-reviewed-results.json')),fiction=JSON.parse(fs.readFileSync(D+'/fiction-results.json')),health=JSON.parse(fs.readFileSync('docs/TIMELINE84_HEALTH_SUPPLEMENT.json')),world={self:'w1',wealth:'w2',career:'w7',love:'w3',health:'w8',creative:'w5',remedy:'w6'},b=await chromium.launch({headless:true,channel:'msedge'}),results=[];
 try{for(const width of [360,390,430]){
  for(const c of cat.chapters.filter(c=>!process.argv.includes('--health-only')||health.chapters.some(h=>h.id===c.id))){
   const row=live.rows.find(r=>r.id===c.id),edu=health.chapters.find(r=>r.id===c.id),frame=fiction.chapters.find(r=>r.id===c.id),p=await b.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];let aiCalls=0;
   p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(base))return route.abort();if(url.endsWith('/api/reading-editorial'))return route.fulfill({json:{version:84,topics:cat.topics,chapters:[{...c,state:'active',legacyIds:[]}]}});if(url.endsWith('/api/past-story'))return route.fulfill({json:{ok:true,story:fiction.story}});if(url.endsWith('/api/movingtoon-reading')){aiCalls++;return row?route.fulfill({json:{ok:true,result:row.result,provider:'openai',chapterQuality:{ok:true},interpretation:{mode:'grounded',claims:row.claims}}}):route.fulfill({status:422,json:{ok:false,error:'insufficient-evidence'}});}return route.continue();});
   await p.addInitScript(birth=>sessionStorage.setItem('mt_v2_input',JSON.stringify({name:'가상원국검수',inp:birth})),row?.birth||{year:1994,month:7,day:24,hour:12,minute:0,calendar:'solar',gender:'F',city:'서울'});
   await p.goto(base+'/report/v2/?from=hub');await p.locator('#app[data-view="home"]').waitFor();await p.locator('[data-xw="'+world[c.topicId]+'"]').click();await p.locator('.xp-chapters button').first().click();await p.locator('#app[data-view="reader"]').waitFor();
   const expected=edu?edu.paragraphs.map(p=>p.text):row?row.result.paragraphs.map(p=>p.text):frame.frame.paras;
   const chapter=p.locator('#ch-'+c.id);await chapter.filter({hasText:expected[0]}).waitFor({timeout:15000});await chapter.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));const text=(await chapter.innerText()).replace(/\s+/g,'');
   for(const para of expected)assert(text.includes(para.replace(/\s+/g,'')),c.id+' missing exact text');
   if(edu){assert.equal(aiCalls,0,'education must bypass personal AI endpoint');assert(text.includes('개인의건강상태나사고를예측하는풀이가아닙니다.'));assert(await chapter.locator('details.reading-evidence').count());}
   if(frame)assert(text.includes('창작'));
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),c.id+' overflow '+width);assert.deepEqual(errors,[]);
   if(edu&&width===390){await chapter.scrollIntoViewIfNeeded();await p.screenshot({path:D+'/local-'+c.id+'-390.png'});}
   results.push({id:c.id,width,exactText:true,noOverflow:true,noPageErrors:true,mode:edu?'reviewed-education':row?'actual-ai-replay':'reviewed-fiction'});await p.close();
  }console.log('PASS '+width+'px: exact chapter text checks complete');
 }
 fs.writeFileSync(D+(process.argv.includes('--health-only')?'/local-health-mobile.json':'/final-mobile-84.json'),JSON.stringify({productionWrites:0,deployed:false,newProviderCalls:0,results},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
