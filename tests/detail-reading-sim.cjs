// 정밀 보정 레이어(functions/_detail-reading*.js) 검사: 사전 완전성, 문체·금지어, 전 장 앵커 배치, 결정성, 실제 합성 경로 연결.
// AI·네트워크 호출 없음. 원국은 엔진으로 계산한 가상 명식이다.
const assert=require('node:assert');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');const imp=p=>import(pathToFileURL(path.join(ROOT,p)).href);
(async()=>{
 const D=await imp('functions/_detail-reading-data.js'),M=await imp('functions/_detail-reading.js');
 const STEMS='갑을병정무기경신임계'.split(''),BRANCHES='자축인묘진사오미신유술해'.split(''),ELS='목화토금수'.split('');
 const KEYS={dm:STEMS,mb:BRANCHES,yong:ELS};
 const FORBID=/(반드시|무조건|확정|100%|틀림없|사망|질병|진단|치료|증상|파산|이혼한다|결혼한다|합격한다|수익을 보장)/;
 const REMEDY_BAN=/(구매|구입|사세요|색깔|색을|방위|방향으로|부적|향초|액세서리|팔찌)/;
 // 1) 모든 문장: 길이·해요체·기호·금지어·개운 제한, 중복 없음
 let sentences=0;const all=[];
 for(const axis of M.AXES)for(const k of KEYS[axis]){assert(M.DICT[axis][k],axis+' 누락: '+k);
  for(const t of D.TOPICS){const rows=M.DICT[axis][k][t];assert(Array.isArray(rows)&&rows.length>=1,`${axis}.${k}.${t}`);
   for(const s of rows){sentences++;all.push(s);assert(s.length>=30&&s.length<=170,`${axis}.${k}.${t} 길이 ${s.length}: ${s}`);assert(/요\.$/.test(s),`${axis}.${k}.${t} 해요체 종결: ${s}`);
    assert(!/[{}<>]/.test(s),`${axis}.${k}.${t} 기호`);assert(!FORBID.test(s),`${axis}.${k}.${t} 금지어: `+s);if(t==='remedy')assert(!REMEDY_BAN.test(s),`${axis}.${k} 개운 구매·색·방위: `+s);}}}
 assert.equal(new Set(all).size,all.length,'사전 문장 중복');

 // 2) 앵커: 자격 있는 모든 장에 하나씩, (축,변형) 칸이 장마다 다르고, 칸마다 모든 키에 문장이 있다. 자동차 장은 제외.
 const COUNT=M.COUNT;let covered=0,total=0;
 for(const [topic,n] of Object.entries(COUNT)){const a=M.anchors(topic);const nums=a.map(x=>x.number);
  assert.equal(new Set(nums).size,nums.length,topic+' 앵커 장 중복');
  assert.equal(new Set(a.map(x=>x.axis+':'+x.variant)).size,a.length,topic+' (축,변형) 칸 중복');
  assert(!(topic==='self'&&nums.includes(2)),'자동차 장 제외');
  assert.equal(a.length,n-(topic==='self'?1:0),topic+' 모든 자격 장에 앵커');covered+=a.length;total+=n;
  for(const x of a){const axis=M.AXES[x.axis];for(const k of KEYS[axis])assert(M.DICT[axis][k][topic][x.variant],`${topic} ${x.number} ${axis} ${k} 변형 ${x.variant} 없음`);}}
 assert.equal(M.sentence('timeline_self_02',{}),'');assert.equal(M.sentence('timeline_creative_01',{}),'');assert.equal(M.sentence('bad',{}),'');

 // 3) 실제 원국: 결정성, 한 리포트(한 원국)에서 장마다 서로 다른 문장, 같은 칸에서 키가 다르면 문장이 달라진다.
 const V=await imp('editorial/rebuild-20261022/publish/verify.mjs');const sds=V.sampleCharts(200,ROOT);
 const id=(t,n)=>`timeline_${t}_${String(n).padStart(2,'0')}`;
 for(const sd of sds.slice(0,60)){const seen=new Set();let n=0;
  for(const [topic,cnt] of Object.entries(COUNT))for(let i=1;i<=cnt;i++){const s=M.sentence(id(topic,i),sd);assert.equal(s,M.sentence(id(topic,i),sd),'결정성');if(s){n++;assert(!seen.has(s),'한 리포트에서 같은 문장 반복: '+s);seen.add(s);}}
  assert(n>=60,'한 원국에 붙는 문장 수 '+n);}
 for(const [topic] of Object.entries(COUNT))for(const x of M.anchors(topic)){const out=new Set(sds.map(sd=>M.sentence(id(topic,x.number),sd)).filter(Boolean));
  assert(out.size>=Math.min(4,KEYS[M.AXES[x.axis]].length),`${id(topic,x.number)} 서로 다른 문장 ${out.size}`);}

 // 4) 합성 경로: 앵커 장의 reality 문단에 붙고 다른 역할에는 붙지 않으며, 본문 종류가 늘어난다.
 const C=await imp('editorial/rebuild-20261022/publish/convert.mjs');const {L,S,chapters}=await C.loadService();const entries=C.allEntries();
 const aid=id('love',M.anchors('love')[0].number),contract=chapters.find(c=>c.id===aid),es=entries.filter(e=>e.chapters[0]===aid);
 const conv=await C.chapterPassages(contract,S.seedPassages(contract),es,{L});
 const render=sd=>L.composeReviewed({clean:{sd,chapter:{paragraphs:L.ROLES.map(role=>({id:role,role}))}},contract,analysis:{claims:[]},library:{version:1,published:conv.passages}}).result.paragraphs;
 const plain=sds.filter(sd=>M.sentence(aid,sd));assert(plain.length>100);
 const outs=new Set(),baseline=new Set();
 for(const sd of plain){const s=M.sentence(aid,sd),ps=render(sd),reality=ps.find(p=>p.role==='reality').text;assert(reality.includes(s),'reality 문단에 부착');
  for(const p of ps)if(p.role!=='reality')assert(!p.text.includes(s),'다른 역할에는 붙지 않음');
  outs.add(ps.map(p=>p.role==='evidence'?'':p.text).join('|'));
  baseline.add(ps.map(p=>p.role==='evidence'?'':p.role==='reality'?p.text.split('\n\n').filter(x=>x.trim()!==s).join('\n\n'):p.text).join('|'));}
 assert(outs.size>baseline.size,'정밀 보정 뒤 본문 종류가 늘어야 함 '+baseline.size+'→'+outs.size);
 console.log(`PASS: ${sentences} sentences, no duplicates, 해요체·금지어·개운 제한; anchors cover ${covered}/${total} chapters (자동차 장 제외 전부), unique axis×variant per chapter, no repeated sentence within one chart's report; ${aid}: ${baseline.size} → ${outs.size} distinct narrative bodies over ${plain.length} charts; AI/network 0`);
})().catch(e=>{console.error(e);process.exit(1);});
