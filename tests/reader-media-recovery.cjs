const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 global.window=globalThis;
 for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-flow.js','report/v2/reading-catalog.js','report/v2/char-intro.js'])vm.runInThisContext(read(f));
 const R=ReportV2,sd=R.SajuData.build(Manse.compute({year:1992,month:6,day:23,hour:12,minute:0,calendar:'solar',gender:'M',city:'서울'}));
 const original=R.CharIntro.chapter(sd,'검사',{ilgan:{videoUrl:'/ilgan.mp4'},video:{videoUrl:'/ilju.mp4'}},1);
 const catalog=MantraEditorial.defaults();catalog.version=1;catalog.chapters=catalog.chapters.filter(c=>c.id==='timeline_self_03').map(c=>({...c,state:'active'}));
 const rep=MantraEditorial.prepare({chapters:[original],acts:[]},catalog,sd),ch=rep.chapters[0];
 assert.equal(ch.scenes.filter(s=>s.readingInline&&/ci-v[12]/.test(s.sceneId)).length,2);
 assert(ch.scenes.filter(s=>/^ci-/.test(s.sceneId)).every(s=>s.readingInline&&s.readingSupplementary));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage();await page.setContent('<main id="chapter"><section class="rd-sec" data-ch="0"><p>생성 대기 중인 본문</p></section><section class="rd-sec" data-ch="1"><p>다음 장의 본문</p></section></main>');
 await page.addScriptTag({content:read('report/v2/reader.js')});
 const result=await page.evaluate(()=>{let blocked=true;const reader=ReportV2.Reading.mount(document.querySelector('main'),{reduce:true,flow:{auto:false},canAdvance:()=>!blocked});reader.play();const waiting=reader.state();blocked=false;reader.measure();reader.readingReady();const ready=reader.state();reader.pause();reader.readingReady();const manual=reader.state();reader.destroy();return {waiting,ready,manual};});
 assert.equal(result.waiting,'PAUSED');assert.equal(result.ready,'PLAYING');assert.equal(result.manual,'PAUSED');
 // Exercise the production panel planner and wrapper against the promoted character chapter.
 const src=read('report/v2/viewer.js');const fn=(name,next)=>src.slice(src.indexOf('  function '+name+'('),src.indexOf('  function '+next+'('));
 const html=await page.evaluate(({ch,planner,wrap,panel,panelHtml})=>{const S={pv:{},media:[{id:'panel-water-identity-M',type:'image',url:'/panel.webp',themeTags:['identity']}],sd:{gender:'M',dayMaster:{el:'water'}},bg:[]},R={Director:{pickMedia:(_,lib)=>lib[0]},Scenes:{panelThemes:()=>['identity']}};const themeOf=()=> 'identity',esc=s=>s,layoutOf=()=> 'TEXT',BG_BLACK=-1,BG_PH=-2,EL_COLOR={};eval(panel);eval(panelHtml);eval(wrap);eval(planner);planPanels({chapters:[ch]});const head=ch.scenes.find(s=>s.sceneType==='chapterIntro');return secWrap('<section class="reading-pending">대기</section>',head,ch,0);},{ch,planner:fn('planPanels','buildDoc'),wrap:src.slice(src.indexOf('  function secWrap('),src.indexOf('  // 패널:')),panel:fn('panelOf','panelHtml'),panelHtml:fn('panelHtml','layoutOf')});
 assert(html.includes('/panel.webp'));
 await page.setContent(html+ch.scenes.filter(s=>s.readingInline).map(s=>s.html).join(''));
 assert.equal(await page.locator('video').count(),2);assert.equal(await page.locator('details video').count(),0);assert.equal(await page.locator('img').count(),1);
 vm.runInThisContext(read('report/v2/full-reading.js'));
 const realTimeout=global.setTimeout;global.setTimeout=(fn,ms,...args)=>realTimeout(fn,ms===90000?0:ms,...args);global.fetch=()=>new Promise(()=>{});
 try{const stalled={id:'timeout',scenes:[{body:'응답 본문도 도착하지 않는 요청이 무한히 대기하지 않는지 확인하기 위한 테스트 전용 충분한 길이의 문장입니다.'}]};let settled;const done=new Promise(ok=>settled=ok);ReportV2.FullReading.prepare({chapters:[stalled]}, {}, '',settled);ReportV2.FullReading.prioritize('timeout');await done;assert.equal(stalled.readingWarning,'server-timeout');assert(!stalled.scenes[0].body);}finally{global.setTimeout=realTimeout;}
 console.log('reader-media-recovery: inline character videos, pending panel DOM, automatic recovery and manual pause PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
