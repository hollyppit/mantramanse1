// '이 사주에서만 읽히는 포인트' 층 검사: 문안 사전의 완전성, 금지어·문장 형식, 가상 명식 표본에서의 배정(모든 장에 최소 한 문단, 한 리포트 안 중복 없음), 결정성, 읽기 화면 연결.
// AI·네트워크 호출 없음. 원국은 엔진으로 계산한 가상 명식이다.
const assert=require('node:assert');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
for(const f of ['reading-insight-data-1','reading-insight-data-2','reading-insight-data-3','reading-insight-data-4','reading-insight'])require(path.join(ROOT,'report/v2/'+f+'.js'));
const R=globalThis.ReportV2,D=R.ReadingInsightData,RI=R.ReadingInsight;
(async()=>{
 const FORBID=/(반드시|무조건|확정|100%|틀림없|사망|질병|진단|치료|수술|파산|이혼한다|결혼한다|합격한다|수익을 보장)/;
 const LENSES=['self','wealth','career','love'],GROUPS=['비겁','식상','재성','관성','인성'],TGS=['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
 const STAGES=['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'],PILLARS=['year','month','day','hour'];
 const PATS=['재다신약','관살과다','식상과다(설기)','군겁쟁재','인성과다','관살혼잡','상관견관','효신탈식(도식)','식신제살','상관패인','살인상생','무비겁','무식상','무재','무관','무인성'];
 const ROLES=['용신','희신','한신','구신','기신'],BANDS=['신강','중화','신약'],RELKEYS=['충','형','파','해','원진','귀문관','합','천간합','천간충'],SEUNKEYS=['충','형','파해','합','원진귀문'];
 const PAIRS=['year-month','year-day','year-hour','month-day','month-hour','day-hour'],CLIMS=['한습','한','열조','열','습','조','평'];
 // 1) 사전 완전성
 const need=(obj,keys,label)=>{for(const k of keys)assert(typeof obj[k]==='string'&&obj[k].length>=20,label+' 누락/짧음: '+k);};
 const all=[];const collect=v=>{if(typeof v==='string')all.push(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.entries(v).forEach(([k,x])=>{if(!['PLAIN','LABEL','ROLE','GLOSS'].includes(k))collect(x);});};
 for(const L of LENSES){
  need(D.PAIR[L],GROUPS.flatMap(s=>GROUPS.filter(w=>w!==s).map(w=>s+'|'+w)),'PAIR.'+L);
  need(D.PATTERN[L],PATS,'PATTERN.'+L);need(D.LACK[L],['목','화','토','금','수'],'LACK.'+L);need(D.CLIMATE[L],CLIMS,'CLIMATE.'+L);
  need(D.TG[L],TGS,'TG.'+L);need(D.STAGE[L],STAGES,'STAGE.'+L);need(D.RELPAIR[L],PAIRS,'RELPAIR.'+L);need(D.RELTYPE[L],RELKEYS,'RELTYPE.'+L);
  need(D.DWG[L],GROUPS.flatMap(g=>['same','fill','other'].map(s=>g+'|'+s)),'DWG.'+L);need(D.DWY[L],ROLES,'DWY.'+L);need(D.SEG[L],GROUPS,'SEG.'+L);
  need(D.SER.POS[L],['day','month'],'SER.POS.'+L);need(D.SER.TYPE[L],SEUNKEYS,'SER.TYPE.'+L);
  need(D.BANDG[L],BANDS.flatMap(b=>GROUPS.map(g=>b+'|'+g)),'BANDG.'+L);need(D.DWN[L],GROUPS,'DWN.'+L);need(D.SEN[L],GROUPS,'SEN.'+L);
  need(D.DWR.POS[L],['day','month'],'DWR.POS.'+L);need(D.DWR.TYPE[L],SEUNKEYS,'DWR.TYPE.'+L);
  for(const p of PILLARS){assert(Array.isArray(D.PILLAR[L][p])&&D.PILLAR[L][p].length===3,'PILLAR.'+L+'.'+p);assert.equal(new Set(D.PILLAR[L][p]).size,3,'PILLAR 변형 중복 '+L+'.'+p);}
 }
 assert.deepEqual(Object.keys(D.PATTERN.PLAIN).sort(),PATS.slice().sort());assert(Object.keys(D.ROLE||D.DWY.ROLE).length===5);
 [D.PAIR,D.PATTERN,D.LACK,D.CLIMATE,D.PILLAR,D.TG,D.STAGE,D.RELPAIR,D.RELTYPE,D.DWG,D.DWY,D.SEG,D.SER,D.BANDG,D.DWN,D.DWR,D.SEN].forEach(collect);
 for(const t of all){assert(!FORBID.test(t),'금지어: '+t);assert(/요[.]$/.test(t),'문장 끝: '+t);assert(!/\s{2,}|undefined|NaN|null|[{}]/.test(t),'형식: '+t);assert(!/[A-Za-z]{3,}/.test(t),'영문: '+t);}
 // 같은 관점 안에서 서로 다른 항목이 같은 문장을 쓰지 않는다
 for(const L of LENSES){const seen=new Map();const dup=[];for(const [name,tab] of Object.entries({PAIR:D.PAIR[L],PATTERN:D.PATTERN[L],LACK:D.LACK[L],CLIMATE:D.CLIMATE[L],TG:D.TG[L],STAGE:D.STAGE[L],RELPAIR:D.RELPAIR[L],RELTYPE:D.RELTYPE[L],DWG:D.DWG[L],DWY:D.DWY[L],SEG:D.SEG[L],BANDG:D.BANDG[L],DWN:D.DWN[L],SEN:D.SEN[L],SERTYPE:D.SER.TYPE[L],DWRTYPE:D.DWR.TYPE[L]}))for(const [k,t] of Object.entries(tab)){if(seen.has(t))dup.push(name+'.'+k+' = '+seen.get(t));else seen.set(t,name+'.'+k);}
  assert.equal(dup.length,0,L+' 중복 문장 '+dup.slice(0,3).join(' / '));}
 // 2) 가상 명식 표본
 const V=await import(pathToFileURL(path.join(ROOT,'editorial/rebuild-20261022/publish/verify.mjs')).href);const sds=V.sampleCharts(240,ROOT);
 const ids=RI.PLAN.map(p=>p[0]);assert.equal(new Set(ids).size,ids.length,'PLAN 장 중복');assert(ids.length>=60,'PLAN 장 수 '+ids.length);
 const cat=require('node:fs').readFileSync(path.join(ROOT,'report/v2/reading-catalog.js'),'utf8');
 for(const id of ids)assert(cat.includes('"'+id+'"')||id==='timeline_self_peak','카탈로그에 없는 장: '+id);
 let total=0,zero=0,noHour=0;const perChapter={};
 for(const sd of sds){const before=JSON.stringify(sd);const seen=new Set();let n=0;
  for(const id of ids){const ps=RI.paragraphs({id},sd);assert(ps.length<=2,id+' 문단 수');n+=ps.length;perChapter[id]=(perChapter[id]||0)+(ps.length?1:0);if(!ps.length)zero++;
   assert.equal(new Set(ps.map(p=>p.key)).size,ps.length,id+' 한 장 안 요소 중복');
   for(const p of ps){assert(p.text&&!/undefined|NaN|null|[{}]/.test(p.text),id+' 값 누락: '+p.text);assert(!FORBID.test(p.text),id+' 금지어');assert(!seen.has(p.text),'한 리포트 안 문단 중복: '+p.text.slice(0,40));seen.add(p.text);}}
  total+=n;assert.equal(JSON.stringify(sd),before,'명식 데이터를 바꿈');
  assert.deepEqual(RI.paragraphs({id:ids[5]},sd),RI.paragraphs({id:ids[5]},JSON.parse(before)),'결정성');
  if(!sd.pillars.hour)noHour++;}
 for(const id of ids)assert(perChapter[id]/sds.length>=0.97,id+' 문단 배정률 '+(perChapter[id]/sds.length).toFixed(2));
 assert(total/sds.length>=75,'리포트당 평균 문단 '+(total/sds.length).toFixed(1));assert(noHour>0,'출생 시간 미상 표본');
 // 3) 보관·창작·건강 장과 알 수 없는 장에는 붙지 않는다
 assert.deepEqual(RI.paragraphs({id:'timeline_health_01'},sds[0]),[]);assert.deepEqual(RI.paragraphs({id:'timeline_creative_01'},sds[0]),[]);assert.deepEqual(RI.paragraphs({id:'timeline_self_36'},sds[0]),[]);assert.deepEqual(RI.paragraphs({id:'timeline_wealth_03'},null),[]);
 // 4) 읽기 화면 연결: 장 화면에 '이 사주에서만 읽히는 포인트' 구역이 한 번 나온다
 const T=require(path.join(ROOT,'report/v2/reading-text.js'));
 const sd=sds[7];const c={id:'timeline_wealth_03',editorialContractId:'timeline_wealth_03',title:'돈이 들어와도 왜 남지 않을까?',readingVisualData:sd,readingCore:{title:'새는 돈을 먼저 막아야 하는 사람이에요. 들어오는 것보다 나가는 길이 많아요.',reality:'월급날 통장이 하루 만에 가벼워져요.',strength:'지출을 줄이기로 마음먹으면 바로 실행해요.',risk:'작은 지출이 쌓이면 큰돈이 새요.',reinforce:'고정비부터 점검하세요.',practice:'이번 달 새는 돈 세 가지를 적어 보세요.'}};
 const html=T.html(c,0);assert.equal((html.match(/이 사주에서만 읽히는 포인트/g)||[]).length,1,'구역 수');assert(html.includes('data-reading-role="insight"'));assert(!/undefined|NaN/.test(html));
 const none=T.html({...c,readingVisualData:null},0);assert(!none.includes('이 사주에서만 읽히는 포인트'));
 console.log('PASS: insight dictionary complete ('+all.length+' sentences), '+sds.length+' charts, avg '+(total/sds.length).toFixed(1)+' paragraphs per report, no duplicates, deterministic, wired into the reader');
})().catch(e=>{console.error(e);process.exit(1);});
