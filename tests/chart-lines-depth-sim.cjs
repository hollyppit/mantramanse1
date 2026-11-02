// 사주 요소 풀이 "깊이 층" 검사: 모든 요소에 원리 문장이 있고, 금지어·개운 제한을 지키며, 처음 나올 때 한 번만 붙고, 사주에 실제 놓인 자리만 말한다.
const assert=require('node:assert');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
for(const f of ['chart-lines-stars','chart-lines-rest','chart-lines-fill','chart-lines-depth'])require(path.join(ROOT,'report/v2/'+f+'.js'));
const CL=require(path.join(ROOT,'report/v2/chart-lines.js'));require(path.join(ROOT,'report/v2/everyday-reading.js'));
const E=globalThis.MantraEverydayReading,DEP=require(path.join(ROOT,'report/v2/chart-lines-depth.js'));
const FORBID=/(반드시|무조건|확정|100%|틀림없|사망|죽|질병|진단|치료|증상|수술|파산|이혼한다|결혼한다|합격한다|수익을 보장|암에)/,REMEDY_BAN=/(구매|구입|사세요|색깔|색을|방위|방향으로|부적|향초|액세서리|팔찌)/;
(async()=>{
 const NEED={star:5,s12:5,rel:2,tg:1};let rows=0;
 for(const kind of Object.keys(CL.TABLE))for(const name of Object.keys(CL.TABLE[kind])){const r=DEP.D[kind][name];assert(r,`${kind}.${name} 깊이 문장 없음`);assert.equal(r.length,NEED[kind],`${name} 칸 수`);
  r.forEach(t=>{rows++;assert(/요[.]$/.test(t),`${name} 해요체: ${t}`);assert(!FORBID.test(t),`${name} 금지어: ${t}`);assert(!REMEDY_BAN.test(t),`${name} 개운 제한: ${t}`);assert(t.length<=110,`${name} 길이 ${t.length}`);});}
 const V=await import(pathToFileURL(path.join(ROOT,'editorial/rebuild-20261022/publish/verify.mjs')).href);const sds=V.sampleCharts(120,ROOT);
 let withDepth=0,total=0;
 for(const sd of sds){const seen={};
  for(const [t,c] of Object.entries({self:22,wealth:12,career:12,love:12,health:10,remedy:8}))for(let i=1;i<=c;i++){const x=E.starExample(sd,`timeline_${t}_${String(i).padStart(2,'0')}`);if(!x)continue;total++;
   assert(!FORBID.test(x),'금지어: '+x);if(t==='remedy')assert(!REMEDY_BAN.test(x),'개운 제한: '+x);
   if(/내 사주에서는/.test(x)){withDepth++;const m=/^사주(?: 글자들 사이)?에 ([가-힣]+?)(?:이|가|의)/.exec(x);assert(m,'첫 등장 문장 형식');seen[m[1]]=(seen[m[1]]||0)+1;assert.equal(seen[m[1]],1,m[1]+' 깊이 층은 한 리포트에 한 번');}
   assert(x.length<=420,'너무 긺 '+x.length);}}
 // 자리: 사주에 없는 자리는 말하지 않는다.
 const sd=JSON.parse(JSON.stringify(sds[0]));sd.specialStars=[{name:'현침살',pillar:'month'}];sd.sinsal12={};
 assert(/월주/.test(CL.depth('star','현침살',sd))&&!/일주/.test(CL.depth('star','현침살',sd)));
 sd.specialStars=[];assert(!/내 사주에서는/.test(CL.depth('star','현침살',sd)),'자리 없으면 원리만');
 console.log(`PASS: ${rows} depth sentences, every element covered, ${withDepth}/${total} chapter lines carry a depth layer over 120 charts, once per element per report, positions follow the chart, no forbidden words`);
})().catch(e=>{console.error(e);process.exit(1)});
