// Bundle QA: validity, forbidden phrases, per-chapter coverage over real computed charts, text uniqueness. No network, no DB.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bundle=process.argv[2]||'self';
(async()=>{
 const {bundles}=await import('../editorial/rebuild-20261022/index.mjs'),{simulate,validateEntry}=await import('../editorial/rebuild-20261022/engine.mjs');
 const entries=bundles[bundle];const old=global.fetch;global.fetch=()=>{throw Error('network-forbidden')};
 const FORBID=['기운이 조화를','새로운 가능성이 열립니다','자신만의 속도를 찾','균형을 유지하는 것이 중요','내면의 잠재력','삶의 방향을 정비','준비된 사람에게 기회','신뢰를 쌓는 것이 중요','마음을 열면 좋은 인연'];
 const DETERMINISTIC=/(반드시|틀림없이|100%|무조건)\s*(이혼|파산|사망|질병|사고|암)|이혼합니다|파산합니다|사망합니다/;
 const problems=[];
 for(const e of entries){
  const v=validateEntry(e);if(v.length)problems.push([e.id,'invalid',v.join(',')]);
  const all=[e.core,e.basis,e.example,e.positive,e.negative,e.advice,...Object.values(e.applications)].join(' ');
  FORBID.forEach(f=>all.includes(f)&&problems.push([e.id,'forbidden',f]));if(DETERMINISTIC.test(all))problems.push([e.id,'deterministic']);
 }
 // variant rule (bundles from self3): entries of the same family must differ in example/positive/negative/advice, not only in the core line
 if(process.env.STRICT_VARIANTS==='1'||(bundle!=='self'&&bundle!=='self2'&&bundle!=='pilot')){const fam=new Map();for(const e of entries){const k=e.meaningTags[0].split('.').slice(0,2).join('.');(fam.get(k)||fam.set(k,[]).get(k)).push(e);}for(const [k,list] of fam)for(const f of ['example','positive','negative','advice'])if(new Set(list.map(e=>e[f])).size<list.length)problems.push([k,'variant-shares-'+f]);}
 for(const e of entries){const t=[e.core,e.basis,e.example,e.positive,e.negative,e.advice,e.timing,...Object.values(e.applications)].join(' ');for(const m of t.match(/{[^}]*}/g)||[])if(!/^{(daewoon(Ganzhi|Start|End|NextGanzhi|NextStart|Season)|seun(Year|Ganzhi|Season))}$/.test(m))problems.push([e.id,'unknown-placeholder',m]);}
 for(const e of entries){const t=[e.basis,e.core].join(' ');if(/남성 명식|여성 명식|배우자성|자식성/.test(t)&&!/일지|시지|월지/.test(e.basis)&&!(e.when.gender&&e.when.gender.length===1))problems.push([e.id,'gender-condition-required']);}
 // health & accident chapters: no diagnosis, disease names, organ claims, probability or mortality language; must point to medical care
 const HEALTH_FORBID=/(사망|죽음|수명|요절|암에|암이|암 |당뇨|고혈압|뇌졸중|뇌경색|심근|심장병|불임|우울증|조현|치매|골절|입원|수술|장기 손상|병에 걸|질병이 생|질병이 발생|병이 납니다|다칩니다|사고가 납니다|사고가 발생|사고를 당|사고 확률|사고 위험이 높|심장|신장|방광|대장|위장|간장|폐암|확률)/;
 for(const e of entries){if(!/_health_/.test(e.chapters[0]))continue;const all=[e.core,e.basis,e.example,e.positive,e.negative,e.advice,e.timing,...Object.values(e.applications)].join(' ');const m=all.replace(/이 해석은 전통 오행·십성 상징을[^]*?우선하세요./g,'').match(HEALTH_FORBID);if(m)problems.push([e.id,'health-forbidden',m[0]]);if(!/의료기관/.test(e.basis))problems.push([e.id,'health-missing-medical-note']);if(!/(예측하지 않|진단하지 않|판정하지 않|예고하지 않)/.test(e.basis))problems.push([e.id,'health-missing-nonprediction-note']);}
 // creative (past-life experience) chapters: must be framed as fiction, never claim a real past life; one coherent story line across all 8 chapters
 const CREATIVE_FORBID=/(실제 전생은|전생이 확인|전생을 알아냈|전생을 읽어|전생이었습니다|당신의 전생은|틀림없이 전생|증명됩니다|사실입니다|기억이 되살|죽음|사망|살해|폭력|자살|질병|병으로|파산|이혼)/;
 const storyChapters=new Map();
 for(const e of entries){if(!/_creative_/.test(e.chapters[0]))continue;const all=[e.core,e.basis,e.example,e.positive,e.negative,e.advice,...Object.values(e.applications)].join(' ');const m=all.replace(/이 이야기는 사주의 상징을 모티브로 한 창작 체험이며[^]*?정하지 않습니다./g,'').match(CREATIVE_FORBID);if(m)problems.push([e.id,'creative-forbidden',m[0]]);if(!/창작/.test(e.basis))problems.push([e.id,'creative-missing-fiction-note']);if(!e.storyKey)problems.push([e.id,'creative-missing-storyKey']);if(!/이야기/.test(e.core))problems.push([e.id,'creative-core-not-framed-as-story']);(storyChapters.get(e.chapters[0])||storyChapters.set(e.chapters[0],new Set()).get(e.chapters[0])).add(e.storyKey);}
 if(storyChapters.size>1){const sets=[...storyChapters.values()].map(x=>[...x].sort().join('|'));if(new Set(sets).size>1)problems.push(['creative','story-lines-differ-between-chapters',[...storyChapters.keys()].join(',')]);}
 // remedy (개운법) chapters: real actions only; no claims that colors/objects/directions/places change fortune, no purchase or paid-service advice, no guarantees
 const REMEDY_FORBID=/(구매(하|를|해|비)|구입(하|을|해|비)|사세요|사야 |부적|팔찌|보석|액땜|굿을|제사|결제|명품|고가|비싼|행운의 (색|숫자|방위|물건|장소)|방위가 운|색이 운|색깔이 운|물건이 운|장소가 운을 바꾸|운이 (바뀝|좋아집|트입|열립)|운을 바꿔 줍|반드시 좋아|효과가 있|보장합니다|확실히|틀림없이)/;
 for(const e of entries){if(!/_remedy_/.test(e.chapters[0]))continue;const all=[e.core,e.basis,e.example,e.positive,e.negative,e.advice,...Object.values(e.applications)].join(' ');const m=all.replace(/개운법은 사주 해석을 생활 행동으로 옮긴 제안입니다[^]*?다룹니다./g,'').match(REMEDY_FORBID);if(m)problems.push([e.id,'remedy-forbidden',m[0]]);if(!/(단정하지 않|보장하지 않)/.test(e.basis))problems.push([e.id,'remedy-missing-nonguarantee-note']);if(!/(첫째|하루|매일|매주|한 달|두 가지|세 가지|상한|한도|기한|점검일|달력|주 [0-9]|월 [0-9]|[0-9]분|[0-9]회|[0-9]주|[0-9]시간|[0-9]문장)/.test(e.advice))problems.push([e.id,'remedy-advice-not-concrete']);}
 const ids=new Set(),cores=new Set();for(const e of entries){if(ids.has(e.id))problems.push([e.id,'dup-id']);ids.add(e.id);if(cores.has(e.core))problems.push([e.id,'dup-core']);cores.add(e.core);}
 const chapters=[...new Set(entries.flatMap(e=>e.chapters))].sort();
 global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
 const N=+process.env.N||1200,cov={},multi={},distinctCores={},used=new Set();
 for(const c of chapters){cov[c]=0;multi[c]=0;distinctCores[c]=new Set();}
 for(let i=0;i<N;i++){
  const sd=ReportV2.SajuData.build(Manse.compute({year:1940+i%85,month:1+(i*7)%12,day:1+(i*11)%27,hour:i%7===0?null:(i*5)%24,minute:0,calendar:'solar',gender:i%2?'M':'F',city:'서울'}),{now:Date.UTC(2026,9,22,3)});
  for(const c of chapters){const r=simulate(entries,sd,c,{preview:true});if(r.selected.length)cov[c]++;if(r.selected.length>1)multi[c]++;r.selected.forEach(e=>{used.add(e.id);distinctCores[c].add(e.core)});}
 }
 global.fetch=old;
 const out={bundle,entries:entries.length,charts:N,problems,chapters:Object.fromEntries(chapters.map(c=>[c,{entries:entries.filter(e=>e.chapters[0]===c).length,coverage:+(cov[c]/N*100).toFixed(1)+'%',multiMatch:+(multi[c]/N*100).toFixed(1)+'%',distinctSelected:distinctCores[c].size}])),neverSelected:entries.filter(e=>!used.has(e.id)).map(e=>e.id)};
 fs.mkdirSync('output/rebuild-20261022',{recursive:true});fs.writeFileSync(`output/rebuild-20261022/bundle-${bundle}.json`,JSON.stringify(out,null,1));
 console.log(JSON.stringify(out,null,1));if(problems.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
