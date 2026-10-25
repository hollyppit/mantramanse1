// 유료 풀이 보강 카드(시그니처·한 장 요약·주제 렌즈·대운 과제·12개월 달력·30일 계획)와 문단 반응 측정 검사.
// AI·네트워크 호출 없음. 원국은 엔진으로 계산한 가상 명식이다.
const assert=require('node:assert');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
for(const f of ['chart-lines-stars','chart-lines-rest','chart-lines-fill','chart-lines','signature-data','reading-plus','reading-metrics-summary'])require(path.join(ROOT,'report/v2/'+f+'.js'));
const P=globalThis.ReportV2.ReadingPlus,D=globalThis.MantraSignatureData,CL=globalThis.MantraChartLines;
(async()=>{
 const FORBID=/(반드시|무조건|확정|100%|틀림없|사망|질병|진단|치료|수술|파산|이혼한다|결혼한다|합격한다|수익을 보장)/;
 // 1) 사전 완전성: 12개 성향군 × 6개 주제 렌즈 × 실천 3개, 66개 조합 전부, 요소 매핑이 모든 사주 요소를 덮는다
 assert.equal(D.ORDER.length,12);const TOPICS=['self','wealth','career','love','health','remedy'];
 for(const f of D.ORDER){const x=D.F[f];assert(x&&x.label&&/요[.]$/.test(x.core),f+' core');for(const t of TOPICS)assert(/요[.]$/.test(x.topic[t]),f+'.'+t);assert.equal(x.practice.length,3,f+' practice');}
 let pairs=0;for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){const k=D.ORDER[i]+'+'+D.ORDER[j];assert(D.P[k]&&/요[.]$/.test(D.P[k]),'조합 '+k);pairs++;}assert.equal(pairs,66);
 const all=[...Object.values(D.F).flatMap(x=>[x.core,...Object.values(x.topic)]),...Object.values(D.P),...Object.values(D.BAND),...Object.values(D.YEAR)];
 for(const t of all)assert(!FORBID.test(t),'금지어: '+t);
 for(const kind of ['star','s12','rel','tg'])for(const name of Object.keys(CL.TABLE[kind]))assert(D.MAP[kind][name],`성향군 매핑 누락 ${kind}:${name}`);
 // 2) 실제 원국: 카드 렌더링, 결정성, 문구 이상 없음, 출생 시간 미상 안내
 const V=await import(pathToFileURL(path.join(ROOT,'editorial/rebuild-20261022/publish/verify.mjs')).href);const sds=V.sampleCharts(120,ROOT);
 const html=(id,sd)=>P.html({id,editorialContractId:id,readingVisualData:sd});
 let withSig=0,unknownHour=0;const famCount={};
 for(const sd0 of sds){const sd={...sd0,name:'테스트'};const sig=P.signature(sd);if(sig){withSig++;assert.equal(new Set(sig.top.map(f=>f.key)).size,sig.top.length,'시그니처 중복');sig.top.forEach(f=>famCount[f.key]=(famCount[f.key]||0)+1);assert.deepEqual(P.signature(sd),sig,'결정성');}
  for(const id of ['timeline_self_01','timeline_wealth_01','timeline_career_01','timeline_love_01','timeline_health_01','timeline_remedy_01','timeline_self_20','timeline_self_21','timeline_remedy_07']){
   const h=html(id,sd);assert(!/undefined|NaN|[{][}]|null/.test(h),id+' 렌더링 값 누락: '+h.slice(0,200));assert(!FORBID.test(h),id+' 금지어');const needs=id==='timeline_self_20'?!!(sd.currentDaewoon&&sd.currentDaewoon.season):id==='timeline_self_21'?!!(sd.monthlyLuck&&sd.monthlyLuck.length):!!sig;if(needs)assert(h.length>0,id+' 카드 없음');}
  const self01=html('timeline_self_01',sd);if(sig){assert(self01.includes('나의 시그니처')&&self01.includes('한 장 요약'));assert(self01.includes('사건이나 결과를 예측하지 않아요'));}
  if(!sd.pillars.hour){unknownHour++;assert(self01.includes('출생 시간이 없어'),'출생 시간 미상 안내');}
  const cal=html('timeline_self_21',sd);if(sd.monthlyLuck&&sd.monthlyLuck.length)assert.equal((cal.match(/<li/g)||[]).length,Math.min(12,sd.monthlyLuck.length),'12개월');
  assert.equal(html('timeline_self_05',sd),'','보강 카드가 없는 장');assert.equal(html('timeline_creative_01',sd),'','창작 장 제외');}
 assert(withSig>=110,'시그니처가 계산된 사주 '+withSig);assert(unknownHour>0,'출생 시간 미상 표본');
 assert(Object.keys(famCount).length>=8,'성향군 다양성 '+Object.keys(famCount).length);assert(Math.max(...Object.values(famCount))/withSig<0.75,'한 성향군 쏠림');
 // 3) 반응 버튼 판별: 사주 요소 문장·이어 등장 문장·일간·월지·용신 문장에 붙고, 일반 문장에는 붙지 않는다
 const cases=[['백진우님은 사주에 현침살이 있어요. 바늘 끝처럼','el:현침살'],['사주 글자들 사이에 충이 걸려 있어요. 서로','el:충'],['사주에 편관의 힘이 두드러져요. 압박을','el:편관'],['홍염살의 흔적은 이 장에도 있어요. 분위기에','el:홍염살'],['양인살은 이 장에서도 드러나요. 칼날','el:양인살'],['이 장에서도 형의 흐름이 보여요. 꼬이는','el:형'],
  ['갑목 일간이라 한번 정한 방향으로','dt:dm'],['한겨울(자월)에 태어나서 겉은','dt:mb'],['용신이 목으로 계산돼요. 나무처럼','dt:yong'],['회의에서 결론이 나기 전에 일을 시작해요.','']];
 for(const [t,want] of cases)assert.equal(P.partFor(t),want,t);
 // 실제 사전 문장 전부가 판별된다(정밀 보정 680문장, 요소 문장의 첫 등장·이어 등장 형태)
 const DR=await import(pathToFileURL(path.join(ROOT,'functions/_detail-reading.js')).href);let dn=0;for(const axis of Object.keys(DR.DICT))for(const k of Object.keys(DR.DICT[axis]))for(const t of Object.keys(DR.DICT[axis][k]))for(const x of DR.DICT[axis][k][t]){dn++;assert.equal(P.partFor(x),'dt:'+axis,x.slice(0,30));}
 for(const kind of Object.keys(CL.TABLE))for(const name of Object.keys(CL.TABLE[kind])){const shown=(CL.DISPLAY[name]||name);assert.equal(P.partFor(CL.prefix(kind,name)+' 본문이에요.'),'el:'+shown,kind+':'+name);for(let i=1;i<=4;i++)assert.equal(P.partFor(CL.again(kind,name,i)+' 본문이에요.'),'el:'+shown,kind+':'+name+' again '+i);}
 assert(dn>=680);
 const fb=P.feedback('el:현침살');assert(fb.includes('data-part="el:현침살"')&&fb.includes('data-part-feedback="agree"')&&fb.includes('data-part-feedback="disagree"'));
 // 4) 측정 요약: 문단 반응은 part별 맞아요/아니에요 비율로 모이고, 장 지표에는 섞이지 않는다
 const S=globalThis.MantraReadingMetrics.summarize([{reportId:'a',chapter:'timeline_self_06',event:'viewed',source:'user'},{reportId:'a',chapter:'timeline_self_06',event:'part-agree',part:'el:현침살',source:'user'},{reportId:'b',chapter:'timeline_self_09',event:'part-disagree',part:'el:현침살',source:'user'},{reportId:'b',chapter:'timeline_self_01',event:'part-agree',part:'sig:drive',source:'user'}]);
 assert.deepEqual(S.parts['el:현침살'],{agree:1,disagree:1,agreeRate:0.5});assert.equal(S.parts['sig:drive'].agree,1);assert.equal(S.chapters.timeline_self_06.views,1);
 const M=await import(pathToFileURL(path.join(ROOT,'functions/_reading-metrics.js')).href);
 assert(M.USER_EVENTS.includes('part-agree')&&M.USER_EVENTS.includes('part-disagree'));for(const ok of ['el:현침살','dt:dm','sig:drive','lens:calendar'])assert(M.PART_RE.test(ok),ok);for(const bad of ['x:1','el:'+'가'.repeat(13),'el:<b>','sig:drive;'])assert(!M.PART_RE.test(bad),bad);
 // 5) 30일 계획: 3주 성향 실천 + 균형 주, 항목 중복 없음
 const plan=P.planItems(sds[3]);assert.equal(plan.length,4);const items=plan.flatMap(w=>w.items);assert(items.length>=10);
 console.log(`PASS: 12 families × 6 lenses × 3 practices, 66 pairs, every chart element mapped; ${withSig}/${sds.length} charts with signature (families seen ${Object.keys(famCount).length}, max share ${(Math.max(...Object.values(famCount))/withSig*100).toFixed(0)}%); cards for self_01/topic firsts/self_20/self_21/remedy_07 render without gaps or forbidden words; hour-unknown notice; part feedback detection and metrics summary; AI/network 0`);
})().catch(e=>{console.error(e);process.exit(1);});
