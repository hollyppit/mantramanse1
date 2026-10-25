// 정밀 보정 레이어(functions/_detail-reading*.js) 검사: 사전 완전성, 문체·금지어, 앵커 배치, 결정성, 실제 합성 경로 연결.
// AI·네트워크 호출 없음. 원국은 엔진으로 계산한 가상 명식이다.
const assert=require('node:assert');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');const imp=p=>import(pathToFileURL(path.join(ROOT,p)).href);
(async()=>{
 const D=await imp('functions/_detail-reading-data.js'),M=await imp('functions/_detail-reading.js');
 const STEMS='갑을병정무기경신임계'.split(''),BRANCHES='자축인묘진사오미신유술해'.split(''),ELS='목화토금수'.split('');
 const FORBID=/(반드시|무조건|확정|100%|틀림없|사망|질병|진단|치료|증상|파산|이혼한다|결혼한다|합격한다|수익을 보장)/;
 const REMEDY_BAN=/(구매|구입|사세요|색깔|색을|방위|방향으로|부적|향초|액세서리|팔찌)/;
 let sentences=0;
 const check=(dict,keys,name)=>{
  for(const k of keys){assert(dict[k],name+' 누락: '+k);
   for(const t of D.TOPICS){const rows=dict[k][t];assert(Array.isArray(rows)&&rows.length===M.DetailReading.variants,name+'.'+k+'.'+t+' 변형 수');
    for(const s of rows){sentences++;assert(s.length>=30&&s.length<=150,`${name}.${k}.${t} 길이 ${s.length}`);assert(/[.]$/.test(s)&&/(요|세요|해요)\.$/.test(s),`${name}.${k}.${t} 해요체 종결`);
     assert(!/[{}<>]/.test(s),`${name}.${k}.${t} 기호`);assert(!FORBID.test(s),`${name}.${k}.${t} 금지어: `+s);if(t==='remedy')assert(!REMEDY_BAN.test(s),`${name}.${k} 개운 구매·색·방위: `+s);}}}
 };
 check(D.DM,STEMS,'DM');check(D.MB,BRANCHES,'MB');check(D.YONG,ELS,'YONG');
 const all=[...Object.values(D.DM),...Object.values(D.MB),...Object.values(D.YONG)].flatMap(t=>D.TOPICS.flatMap(k=>t[k]));
 assert.equal(new Set(all).size,all.length,'사전 문장 중복');

 // 앵커: 주제마다 3×변형 수 장, 서로 다른 장, 축이 고르게 배분, 자동차 장 제외
 const COUNT={self:22,wealth:12,career:12,love:12,health:10,remedy:8};
 for(const [topic,n] of Object.entries(COUNT)){const a=M.anchors(topic);assert.equal(a.length,3*M.DetailReading.variants);
  assert.equal(new Set(a.map(x=>x.pos)).size,a.length,topic+' 앵커 중복');assert(a.every(x=>x.pos>=0&&x.pos<n),topic+' 범위');
  assert(!a.some(x=>topic==='self'&&x.pos===1),'자동차 장 제외');
  for(const ax of [0,1,2])assert(a.some(x=>x.axis===ax),topic+' 축 '+ax);}
 assert.equal(M.sentence('timeline_self_02',{}),'');assert.equal(M.sentence('timeline_creative_01',{}),'');assert.equal(M.sentence('bad',{}),'');

 // 실제 원국으로 결정성·차이 확인
 const V=await imp('editorial/rebuild-20261022/publish/verify.mjs');const sds=V.sampleCharts(200,ROOT);
 let withSentence=0;const seen=new Map();
 for(const topic of Object.keys(COUNT))for(const a of M.anchors(topic)){const id=`timeline_${topic}_${String(a.pos+1).padStart(2,'0')}`;const out=new Set();
  for(const sd of sds){const s=M.sentence(id,sd);assert.equal(s,M.sentence(id,sd),'결정성');if(s){withSentence++;out.add(s);}}
  const axisSize=[10,12,5][a.axis];assert(out.size>=Math.min(axisSize,4),`${id} 서로 다른 문장 ${out.size}`);seen.set(id,out.size);}
 assert(withSentence>0);
 // 앵커가 아닌 장에는 아무것도 붙지 않는다
 const anchorIds=new Set(Object.keys(COUNT).flatMap(t=>M.anchors(t).map(a=>`timeline_${t}_${String(a.pos+1).padStart(2,'0')}`)));
 for(const topic of Object.keys(COUNT))for(let i=1;i<=COUNT[topic];i++){const id=`timeline_${topic}_${String(i).padStart(2,'0')}`;if(!anchorIds.has(id))assert.equal(M.sentence(id,sds[0]),'',id);}

 // 합성 경로: 앵커 장의 reality 문단 끝에 붙고, 같은 조합이라도 일간이 다르면 본문이 달라진다.
 const C=await imp('editorial/rebuild-20261022/publish/convert.mjs');const {L,S,chapters}=await C.loadService();const entries=C.allEntries();
 const aid=`timeline_love_${String(M.anchors('love')[0].pos+1).padStart(2,'0')}`,contract=chapters.find(c=>c.id===aid),es=entries.filter(e=>e.chapters[0]===aid);
 const conv=await C.chapterPassages(contract,S.seedPassages(contract),es,{L});
 const render=sd=>L.composeReviewed({clean:{sd,chapter:{paragraphs:L.ROLES.map(role=>({id:role,role}))}},contract,analysis:{claims:[]},library:{version:1,published:conv.passages}}).result.paragraphs;
 const plain=sds.filter(sd=>M.sentence(aid,sd));assert(plain.length>100);
 const outs=new Set();for(const sd of plain){const ps=render(sd),reality=ps.find(p=>p.role==='reality').text;assert(reality.includes(M.sentence(aid,sd)),'reality 문단에 부착');
  for(const p of ps)if(p.role!=='reality')assert(!p.text.includes(M.sentence(aid,sd)),'다른 역할에는 붙지 않음');outs.add(ps.map(p=>p.role==='evidence'?'':p.text).join('|'));}
 const baseline=new Set();for(const sd of plain)baseline.add(render(sd).map(p=>p.role==='evidence'?'':p.role==='reality'?p.text.split('\n\n').slice(0,-1).join('\n\n'):p.text).join('|'));
 assert(outs.size>baseline.size,'정밀 보정 뒤 본문 종류가 늘어야 함 '+baseline.size+'→'+outs.size);
 console.log(`PASS: ${sentences} sentences (DM 10 / MB 12 / YONG 5 × 6 topics × ${M.DetailReading.variants}); anchors per topic ${3*M.DetailReading.variants}, no duplicates, 해요체·금지어·개운 제한 검사; non-anchor chapters untouched; ${aid}: ${baseline.size} → ${outs.size} distinct narrative bodies over ${plain.length} charts; AI/network 0`);
})().catch(e=>{console.error(e);process.exit(1);});
