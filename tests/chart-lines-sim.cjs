// 사주 요소 풀이 사전(신살·12신살·글자 사이 관계·십성) 검사: 사전 완전성, 문체·금지어, 요소별·장별 커버리지, 사주에 없는 요소는 말하지 않음, 결정성, 합성 경로 연결.
// AI·네트워크 호출 없음. 원국은 엔진으로 계산한 가상 명식이다.
const assert=require('node:assert');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
require(path.join(ROOT,'report/v2/chart-lines-stars.js'));require(path.join(ROOT,'report/v2/chart-lines-rest.js'));require(path.join(ROOT,'report/v2/chart-lines-fill.js'));
const CL=require(path.join(ROOT,'report/v2/chart-lines.js'));require(path.join(ROOT,'report/v2/everyday-reading.js'));
const E=globalThis.MantraEverydayReading;
(async()=>{
 const COUNT={self:22,wealth:12,career:12,love:12,health:10,remedy:8};
 const FORBID=/(반드시|무조건|확정|100%|틀림없|사망|죽|질병|진단|치료|증상|수술|파산|이혼한다|결혼한다|합격한다|수익을 보장|암에)/;
 const REMEDY_BAN=/(구매|구입|사세요|색깔|색을|방위|방향으로|부적|향초|액세서리|팔찌)/;
 const STARS='현침살 홍염살 괴강살 양인살 천을귀인 문창귀인 학당귀인 금여록 태극귀인 천문성 복성귀인 공망 급각살 백호대살 월덕귀인 천복귀인 탕화살 천덕귀인 암록 건록 낙정관살 천주귀인 천관귀인 고신살 조객살 과숙살 상문살 천의성 음양차착살 십악대패일 효신살 천라지망 금신살 고란살 삼기귀인'.split(' ');
 const S12='겁살 재살 천살 지살 연살 월살 망신살 장성살 반안살 역마살 육해살 화개살'.split(' ');
 const REL='충 형 파 해 원진 귀문관 육합 반합 삼합 방합 천간합 천간충'.split(' ');
 const TG='비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인'.split(' ');
 // 1) 문장: 장 키 유효성, 해요체, 길이, 금지어, 개운 제한, 중복 없음
 let lines=0;const seenText=new Set(),chap=new Set();
 for(const kind of Object.keys(CL.TABLE))for(const name of Object.keys(CL.TABLE[kind]))for(const [key,text] of Object.entries(CL.TABLE[kind][name])){
  lines++;const m=/^([a-z]+)_(\d{2})$/.exec(key);assert(m&&COUNT[m[1]]&&Number(m[2])>=1&&Number(m[2])<=COUNT[m[1]],`${kind}.${name}.${key} 장 키`);chap.add(key);
  const full=CL.prefix(kind,name)+' '+text;assert(/요[.]$/.test(text),`${name}.${key} 해요체 종결`);assert(text.length>=30&&text.length<=260,`${name}.${key} 길이 ${text.length}`);
  assert(!/[{}<>]/.test(text),`${name}.${key} 기호`);assert(!FORBID.test(full),`${name}.${key} 금지어: ${text}`);if(m[1]==='remedy')assert(!REMEDY_BAN.test(text),`${name}.${key} 개운 제한`);
  assert(!seenText.has(text),`${name}.${key} 문장 중복`);seenText.add(text);}
 // 2) 요소별: 모든 신살·12신살·관계·십성에 최소 한 장의 풀이가 있다(먼저 있던 7종은 기존 starLines까지 합쳐서 본다).
 const legacy=new Set(STARS.slice(0,7));
 for(const [kind,list] of [['star',STARS],['s12',S12],['rel',REL],['tg',TG]])for(const n of list){const rows=CL.TABLE[kind][n]||{};assert(Object.keys(rows).length>=(kind==='star'&&legacy.has(n)?1:2)||kind!=='star'&&Object.keys(rows).length>=2,`${kind}:${n} 풀이 장 수 ${Object.keys(rows).length}`);}
 assert.equal(CL.prefix('s12','연살'),'사주에 도화살이 있어요.');assert.equal(CL.prefix('star','금여록'),'사주에 금여록이 있어요.');
 // 3) 실제 원국: 사주에 없는 요소는 말하지 않음, 한 리포트에서 같은 문장 반복 없음, 한 요소는 5개 장 이하, 결정성, 장별·사주별 커버리지
 const V=await import(pathToFileURL(path.join(ROOT,'editorial/rebuild-20261022/publish/verify.mjs')).href);const sds=V.sampleCharts(300,ROOT);
 const SKIP=new Set(['self_02','self_03','self_20','self_21','wealth_06','wealth_10','career_08','career_12','love_08','health_06','health_07']);
 const LEGACY_TIMING=new Set(['wealth_10','career_08']); // 먼저 있던 천을귀인 문장(사건이 아닌 사람 인연 경향)만 이 두 장에 있다.
 const FIRST=[/^사주에 ([가-힣]+)(?:이|가) 있어요[.]/,/^사주 글자들 사이에 ([가-힣]+)(?:이|가) 걸려 있어요[.]/,/^사주에 ([가-힣]+)의 힘이 두드러져요[.]/];
 const AGAINS=[/^([가-힣]+?)(?:은|는) 이 장에서도 (?:드러나요|한몫해요)[.]/,/^([가-힣]+)의 (?:결이 여기서도 이어져요|흔적은 이 장에도 있어요|영향이 여기서도 보여요|결은 이 장에도 이어져요|힘은 이 장에서도 이어져요|기운이 여기서도 눈에 띄어요|결은 이 장에도 나타나요)[.]/,/^이 장에서도 ([가-힣]+)의 (?:영향을 빼놓을 수 없어요|흐름이 보여요|힘이 한몫해요)[.]/];
 const elementOf=text=>{for(const re of [...FIRST,...AGAINS]){const m=re.exec(text);if(m)return {name:m[1]==='도화살'?'연살':m[1],first:FIRST.includes(re)};}return null;};
 const holds=(sd,name)=>new Set([...(sd.specialStars||[]).map(x=>x.name),...Object.values(sd.sinsal12||{}),...[...(sd.combinations||[]),...(sd.clashes||[])].map(r=>r.type),...Object.entries(sd.tenGods||{}).filter(([,v])=>Number(v)>=20).map(([k])=>k)]).has(name);
 const per={};let totalLines=0,perChart=[];
 for(const sd of sds){const firstSentences=new Set(),use={};let n=0;
  for(const [t,cnt] of Object.entries(COUNT))for(let i=1;i<=cnt;i++){const key=t+'_'+String(i).padStart(2,'0'),id='timeline_'+key,text=E.starExample(sd,id);assert.equal(text,E.starExample(sd,id),'결정성');
   if(!text)continue;n++;totalLines++;per[key]=(per[key]||0)+1;const first=text.split(/(?<=[.])s/)[0];assert(!firstSentences.has(first),'한 리포트에서 같은 문장 반복: '+first);firstSentences.add(first);
   const el=elementOf(text);assert(el,key+': 알 수 없는 문장 형식 '+text.slice(0,30));assert(holds(sd,el.name),key+': 사주에 없는 요소 '+el.name);use[el.name]=(use[el.name]||0)+1;assert(use[el.name]<=5,el.name+' 한 요소는 5개 장 이하');
   if(SKIP.has(key)&&!LEGACY_TIMING.has(key))assert.fail(key+' 시기·특수 장에는 새 사전이 붙지 않음');if(LEGACY_TIMING.has(key))assert.equal(el.name,'천을귀인',key+' 기존 천을귀인 문장만 허용');}
  perChart.push(n);}
 const low=[];for(const [t,cnt] of Object.entries(COUNT))for(let i=1;i<=cnt;i++){const key=t+'_'+String(i).padStart(2,'0');if(!SKIP.has(key)&&(per[key]||0)/sds.length<0.4)low.push(key+':'+Math.round(100*(per[key]||0)/sds.length));}
 assert.deepEqual(low,[],'장별 커버리지 40% 미만: '+low.join(' '));const avg=perChart.reduce((x,y)=>x+y,0)/perChart.length;assert(avg>=45,'사주당 평균 풀이 장 수 '+avg.toFixed(1));assert(Math.min(...perChart)>=25,'가장 적은 사주의 풀이 장 수 '+Math.min(...perChart));
 // 4) 드문 요소를 먼저 고른다: 후보 순서가 빈도 오름차순이다.
 let multi=0;for(const sd of sds.slice(0,80))for(const key of ['self_07','career_07','love_06','wealth_09']){const cs=CL.candidates(sd,'timeline_'+key);if(cs.length>1){multi++;for(let i=1;i<cs.length;i++)assert(cs[i-1].rank<=cs[i].rank,'드문 순서');}}
 assert(multi>20,'후보가 여러 개인 경우 표본 '+multi);
 // 5) 이름 붙이기와 apply 멱등성
 const sd0=sds.find(sd=>/^사주에 /.test(E.starExample(sd,'timeline_career_07'))||/^사주 글자들/.test(E.starExample(sd,'timeline_career_07')));const base='기본 문단이에요.';const once=E.apply(base,'timeline_career_07','reality',sd0);const twice=E.apply(once,'timeline_career_07','reality',sd0);
 assert(once.includes(E.starExample(sd0,'timeline_career_07')),'reality에 부착');assert.equal(twice,once,'apply 멱등');
 assert(E.personalize(E.starExample(sd0,'timeline_career_07'),'백진우').startsWith('백진우님은 '),'이름 붙이기');
 console.log(`PASS: ${lines} lines over ${chap.size} chapter keys; every star(35)/12-sinsal/relation(12)/ten-god(10) has lines; ${totalLines} picks over ${sds.length} charts all name elements the chart really has, no repeated sentence per report, <=5 chapters per element, avg ${avg.toFixed(1)} chapters per chart, every non-timing chapter >=40%; rarest-first, deterministic, apply idempotent; AI/network 0`);
})().catch(e=>{console.error(e);process.exit(1);});
