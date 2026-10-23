// Composer QA over real computed charts plus synthetic edge cases. Offline: fetch is blocked, no DB, no AI.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const {bundles}=await import('../editorial/rebuild-20261022/index.mjs'),C=await import('../editorial/rebuild-20261022/compose.mjs');
 const entries=[...bundles.self,...bundles.self2,...bundles.self3,...bundles.self4,...bundles.wealth,...bundles.career,...bundles.love,...bundles.health,...bundles.creative,...bundles.remedy],chapters=[...new Set(entries.map(e=>e.chapters[0]))].sort();
 const old=global.fetch;global.fetch=()=>{throw Error('network-forbidden')};
 global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
 const dupSupp={},dupIds={},storyLines={};const N=+process.env.N||600,stat={},sigs={},repeats=[];let reports=0;
 for(const c of chapters){stat[c]={matched:0,two:0,len:[]};sigs[c]=new Set();}
 for(let i=0;i<N;i++){
  const sd=ReportV2.SajuData.build(Manse.compute({year:1940+i%85,month:1+(i*7)%12,day:1+(i*11)%27,hour:i%7===0?null:(i*5)%24,minute:0,calendar:'solar',gender:i%2?'M':'F',city:'서울'}),{now:Date.UTC(2026,9,22,3)});
  const a=C.composeReport(entries,sd,chapters,{preview:true}),b=C.composeReport(entries,structuredClone(sd),chapters,{preview:true});
  assert.deepEqual(a,b,'deterministic');assert.equal(a.providerCalls,0);reports++;
  const seenSent=new Map(),fams=new Set();
  {const cr=a.chapters.filter(c=>/_creative_/.test(c.chapter));const keys=cr.map(c=>c.picks[0]?c.picks[0].id.replace(/^cr[0-9]+-/,''):null);const present=keys.filter(Boolean);if(present.length){assert.equal(present.length,8,'story must be present in all 8 chapters');assert.equal(new Set(present).size,1,'one story line across the 8 chapters: '+[...new Set(present)]);cr.forEach(c=>{assert.equal(c.picks.length,1);assert(/창작/.test(c.text)&&/실제 전생이나 전생의 기억을 알아낸 것이 아닙니다/.test(c.text),'fiction notice');});storyLines[present[0]]=(storyLines[present[0]]||0)+1;}else cr.forEach(c=>assert.equal(c.coverage,'missing-evidence'));}
  for(const ch of a.chapters){
   const s=stat[ch.chapter];
   if(ch.coverage==='suppressed-duplicate'){dupSupp[ch.chapter]=(dupSupp[ch.chapter]||0)+1;(dupIds[ch.chapter]=dupIds[ch.chapter]||new Set()).add(ch.suppressed.map(x=>x.id+':'+x.reason).join(','));continue;}
   if(ch.coverage==='missing-evidence'){assert.equal(ch.text,'');assert.equal(ch.sections.length,0);continue;}
   s.matched++;assert(ch.picks.length>=1&&ch.picks.length<=2);if(ch.picks.length===2)s.two++;
   assert.equal(new Set(ch.picks.map(p=>p.family)).size,ch.picks.length,'family dup');
   for(const p of ch.picks){assert(p.matched.length>=2,'compound');assert(!fams.has(p.family),'report family dup');fams.add(p.family);}
   if(/_health_/.test(ch.chapter)){const clean=ch.text.replace(/이 해석은 전통 오행·십성 상징을[^]*?우선하세요./g,'');assert(!/(사망|죽음|수명|요절|당뇨|고혈압|뇌졸중|심장|신장|방광|대장|위장|간장|확률|사고가 납니다|사고가 발생|병에 걸)/.test(clean),'health forbidden term in composed text');assert(/의료기관/.test(ch.text),'health composed text must carry the medical-care note');}
   if(/_remedy_/.test(ch.chapter)){const clean=ch.text.replace(/개운법은 사주 해석을 생활 행동으로 옮긴 제안입니다[^]*?다룹니다./g,'');assert(!/(구매(하|를|해|비)|구입(하|을|해|비)|사세요|부적|팔찌|보석|액땜|행운의 (색|숫자|방위|물건|장소)|색이 운|물건이 운|운이 (바뀝|좋아집|트입|열립)|보장합니다|명품|고가|비싼)/.test(clean),'remedy forbidden term in composed text');assert(/보장하지 않습니다/.test(ch.text),'remedy composed text must carry the non-guarantee notice');}
   assert(!/undefined|\[object|NaN/.test(ch.text));assert(ch.sections[0].key==='core');
   s.len.push(ch.text.length);sigs[ch.chapter].add(ch.picks.map(p=>p.id).join('+'));
   for(const sec of ch.sections)for(const x of sec.text.split(/(?<=[.!?])\s+/))if(x.length>18){if(seenSent.has(x)&&!['core','notice','timing'].includes(sec.key))repeats.push([ch.chapter,x.slice(0,40)]);seenSent.set(x,1);}
  }
 }
 // synthetic edge cases
 const sd0=ReportV2.SajuData.build(Manse.compute({year:1990,month:5,day:17,hour:10,minute:0,calendar:'solar',gender:'M',city:'서울'}),{now:Date.UTC(2026,9,22,3)});
 const full=C.composeChapter(entries,sd0,'timeline_self_01',{preview:true});assert.equal(full.picks.length,1,'single-axis chapter shows one');
 assert.equal(C.composeChapter(entries,sd0,'timeline_self_01').coverage,'missing-evidence','draft is not served without preview');
 const a=entries.find(e=>e.chapters[0]==='timeline_self_06'),mk=(id,core,over={})=>({...structuredClone(a),id,core,meaningTags:['x.'+id+'.v'],...over});
 const fam1=C.pick([{e:mk('e1','알파 베타 감마 델타 입실론'),spec:5},{e:mk('e2','전혀 다른 문장입니다 새로운 정보',{meaningTags:['x.e1.v']}),spec:4},{e:mk('e3','완전히 별개의 설명 문단 하나',{conflicts:['e1']}),spec:3},{e:mk('e4','알파 베타 감마 델타 입실론 제타'),spec:2},{e:mk('e5','독립된 다섯번째 진단 문장 내용'),spec:1}],{max:2});
 assert.deepEqual(fam1.picks.map(p=>p.e.id),['e1','e5']);assert.deepEqual(fam1.suppressed.map(s=>s.reason),['same-meaning-family','declared-conflict','near-duplicate-core']);
 assert.equal(C.pick([{e:mk('f1','가나다라마바사'),spec:2},{e:mk('f2','아자차카타파하'),spec:1}],{max:1}).picks.length,1);
 {const cat=MantraEditorial.defaults().chapters.map(c=>c.id).sort();assert.deepEqual(chapters,cat.filter(id=>chapters.includes(id)));assert.equal(chapters.length,84,'all 84 catalog chapters must have authored entries');assert.deepEqual(chapters,cat,'bundle chapters must equal catalog chapters');}
 global.fetch=old;
 const out={charts:N,reports,chapters:Object.fromEntries(chapters.map(c=>{const s=stat[c],l=s.len.sort((x,y)=>x-y);return [c,{coverage:+(s.matched/N*100).toFixed(1)+'%',twoPicks:+(s.two/Math.max(1,s.matched)*100).toFixed(1)+'%',distinctOutputs:sigs[c].size,chars:l.length?{min:l[0],median:l[l.length>>1],max:l[l.length-1]}:null}]})),repeatedSentencesInReport:repeats.length,storyLines,suppressedAsDuplicateOfEarlierChapter:dupSupp,suppressedSamples:Object.fromEntries(Object.entries(dupIds).map(([k,v])=>[k,[...v].slice(0,4)])),repeatSamples:repeats.slice(0,5),checks:['deterministic','max-two','family-dedupe','report-family-dedupe','compound-conditions','sentence-dedupe','draft-not-served','missing-evidence-empty','conflict-honored','near-duplicate-suppressed','providerCalls-0']};
 fs.mkdirSync('output/rebuild-20261022',{recursive:true});fs.writeFileSync('output/rebuild-20261022/compose-tests.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
