/* 종합풀이 심화 블록 검사:  node tests/reading-feature-sim.cjs
   - 12개 장이 여러 사주(남·여·시간 모름)에서 오류·undefined 없이 블록을 만든다.
   - 순위표(업·인연 장소·궁합 일주)는 점수 내림차순이고 이유·이미지 자리가 같이 있다.
   - 이미지 자산이 있으면 <img>, 없으면 한자 자리표시. 대표 이미지(lead)는 후킹 바로 아래, 나머지는 첫 풀이 문단 뒤에 붙는다.
   - 해당 없는 장은 아무것도 붙이지 않고, 원본 장 객체를 바꾸지 않는다. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
vm.runInThisContext(fs.readFileSync(path.join(root,'engine.js'),'utf8'),{filename:'engine.js'});
globalThis.window=globalThis;
['ilju-data','saju-data','deep','deep-life','deep-time','deep-wealth','deep-love','reading-feature-data-1','reading-feature-data-2','reading-feature','reading-text'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,'report/v2',f+'.js'),'utf8'),{filename:f+'.js'}));
const M=globalThis.Manse,R=globalThis.ReportV2,FEAT=R.ReadingFeature,T=R.ReadingText,fails=[],ok=(c,m)=>{if(!c)fails.push(m);};
const now=Date.UTC(2026,9,8),strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const births=[[1992,6,23,1,'M'],[1988,11,2,14,'F'],[1975,3,9,7,'M'],[2001,8,30,22,'F'],[1964,12,25,0,'F'],[1999,1,1,null,'F']];
const mk=(y,m,d,h,g)=>M.compute({year:y,month:m,day:d,hour:h,minute:0,calendar:'solar',leap:false,gender:g,city:'서울'});
const everyAsset=new Proxy({},{get:(t,k)=>typeof k==='string'?'/asset/'+encodeURIComponent(k)+'.webp':undefined,has:()=>true,ownKeys:()=>[]});
const withFeature=(c,H)=>{Object.defineProperty(c,'readingFeature',{value:H,writable:true,configurable:true,enumerable:false});return c;};
const ids=Object.keys(FEAT.SPEC);
ok(ids.length===65-2,'장 수 63: '+ids.length);

births.forEach(b=>{
 const ch=mk(...b),sd=R.SajuData.build(ch,{now}),tag=b.join('-');
 [{},everyAsset].forEach((assets,withImg)=>{
  const H={M,ch,sd,now,name:'백진우',assets,videos:{}};
  ids.forEach(id=>{
   const c=withFeature({id},H),o=FEAT.build(c);
   if(!o){if(!(/(self_34|love_11)$/.test(id)&&b[3]==null))fails.push(tag+' '+id+' 블록 없음');return;}
   const all=(o.lead||'')+(o.rest||''),txt=strip(all);
   ok(!/undefined|NaN|\[object|null/.test(txt),tag+' '+id+' 에 undefined/NaN');
   ok(txt.length>50,tag+' '+id+' 너무 짧음');
   ok(!/class="scene rv dp/.test(all),tag+' '+id+' 바깥 scene 래퍼 남음');
   if(withImg&&/self_(26|27|29|31|34)$/.test(id)&&!(/self_34$/.test(id)&&b[3]==null))ok(/<img /.test(all),tag+' '+id+' 이미지 자산이 있는데 <img> 없음');
   if(!withImg)ok(!/<img /.test(all),tag+' '+id+' 자산이 없는데 <img>');
   if(/self_(29|31|34)$/.test(id))ok(o.lead&&o.rest,tag+' '+id+' 대표 이미지(lead)와 본문(rest)이 나뉘어야 함');
   else ok(!o.lead&&o.rest,tag+' '+id+' lead 가 없어야 함');
  });
 });
});

// 장소 순위: 5곳, 점수 내림차순, 같은 장소 중복 없음, 이유 문장, 슬롯 이미지
{
 const ch=mk(1992,6,23,1,'M'),sd=R.SajuData.build(ch,{now}),H={M,ch,sd,now,name:'백진우',assets:everyAsset,videos:{}};
 const html=FEAT.placeRank(H),cards=html.split('dp-job"').slice(1),scores=cards.map(x=>+/인연 열림 <b>(\d+)점/.exec(x)[1]),slots=(html.match(/data-slot="place:(\w+)"/g)||[]).map(x=>x.replace(/\D*:/,''));
 ok(cards.length===5,'장소 5곳: '+cards.length);
 ok(scores.every((s,i)=>!i||scores[i-1]>=s),'장소 점수가 내림차순이 아님: '+scores);
 ok(new Set(slots).size===5,'장소 중복: '+slots);
 ok(cards.every(x=>/이 순위인 이유/.test(x)||/＋/.test(x)),'장소마다 이유가 있어야 함');
 ok(/1순위/.test(html)&&/5순위/.test(html),'순위 표기');
}
// 궁합 일주: 얼굴 이미지 슬롯(spouse:<일지>:<상대 성별>)과 쉬운 일주 설명, 점수
{
 const ch=mk(1992,6,23,1,'M'),sd=R.SajuData.build(ch,{now}),H={M,ch,sd,now,name:'',assets:everyAsset,videos:{}},o=FEAT.build(withFeature({id:'timeline_self_28'},H)),all=o.rest;
 ok((all.match(/data-slot="spouse:[^:]+:F"/g)||[]).length>=10,'궁합 일주마다 얼굴 이미지(여성) 슬롯');
 ok((all.match(/dp-idesc/g)||[]).length>=10,'일주 쉬운 설명');
 ok((strip(all).match(/\d+점/g)||[]).length>=10,'일주 점수');
}
// 장에 붙는 위치: lead 는 후킹 바로 아래, rest 는 첫 풀이 문단 뒤. 원본은 그대로.
{
 const ch=mk(1992,6,23,1,'M'),sd=R.SajuData.build(ch,{now}),H={M,ch,sd,now,name:'백진우',assets:everyAsset,videos:{}};
 const base={id:'timeline_self_29',editorialContractId:'timeline_self_29',title:'내 미래 배우자는?',readingVisualData:{name:'백진우',dayMaster:{stem:'경',el:'금'},strength:{band:'신약'},groups:sd.groups},readingCore:{title:'마음을 정하면 의리로 가는 편이에요. 서운한 건 칼같이 정리해요.',reality:'백진우님은 곁에서 든든히 받쳐 주는 사람에게 마음이 가요. 안정된 생활을 함께 만들어 가는 사람이 오래 맞아요.',risk:'속도가 다르면 서운함이 쌓일 수 있어요. 말로 한 번 확인하세요.',practice:'이번 주에 하고 싶은 말 한 가지를 먼저 꺼내 보세요.'}};
 const before=JSON.stringify(base),withF=T.html(withFeature({...base},H),0),without=T.html({...base},0);
 ok(JSON.stringify(base)===before,'원본 장 객체를 바꿈');
 ok(!/data-reading-feature/.test(without),'readingFeature 가 없으면 아무것도 안 붙어야 함');
 const iLead=withF.indexOf('reading-feature-lead'),iHook=withF.indexOf('reading-hook'),iBody=withF.indexOf('body_0'),iRest=withF.search(/class="reading-feature"/);
 ok(iHook>=0&&iLead>iHook&&(iBody<0||iLead<iBody),'대표 이미지는 후킹 바로 아래: hook '+iHook+' lead '+iLead+' body '+iBody);
 ok(iRest>iLead&&iRest>(iBody<0?0:iBody),'나머지 블록은 첫 풀이 문단 뒤');
 ok(/data-slot="spouse:오:F"/.test(withF)||/data-slot="spouse:[^"]+:F"/.test(withF),'배우자 인상 이미지 슬롯');
 const other=T.html(withFeature({...base,id:'timeline_self_36',editorialContractId:'timeline_self_36'},H),0);
 ok(!/data-reading-feature/.test(other),'대상이 아닌 장에는 붙지 않음');
}
// 순위·순서 블록(MantraFeatureData): 형식·점수·근거, 그리고 사주마다 순서가 달라지는지
{
 const DATA=globalThis.MantraFeatureData,keys=Object.keys(DATA),KEY=/^(b:(신강|신약|중화)|t:(비겁|식상|재성|관성|인성)|l:(비겁|식상|재성|관성|인성)|e:(목|화|토|금|수|[갑을병정무기경신임계])|g:[MF])$/;
 ok(keys.length===32,'순위 문안 장 수 32: '+keys.length);
 keys.forEach(k=>{const d=DATA[k];ok(d.title&&d.lead&&(d.mode==='rank'||d.mode==='steps'),k+' 제목·머리글·모드');ok(d.items.length>=4&&d.items.length<=5,k+' 항목 수 '+d.items.length);
  d.items.forEach(it=>{ok(it.n&&it.d&&it.t,k+' 항목 필드');ok(/(요|다).$/.test(it.d)&&/(요|다).$/.test(it.t),k+' 끝맺음: '+it.n);(it.w||[]).forEach(w=>{ok(KEY.test(w[0]),k+' 특징키 '+w[0]);ok(w[1]>0&&w[1]<=15,k+' 가산점');ok(/(서요|지만|서)$/.test(w[2]),k+' 근거 끝맺음: '+w[2]);});});});
 const orders={};keys.forEach(k=>orders[k]=new Set());let blocks=0;
 births.concat([[1985,5,5,10,'M'],[1996,2,14,18,'F'],[1980,9,30,3,'F'],[1970,7,7,12,'M']]).forEach(b=>{const ch=mk(...b),sd=R.SajuData.build(ch,{now}),H={M,ch,sd,now,name:'',assets:{},videos:{}};
  keys.forEach(k=>{const o=FEAT.build(withFeature({id:k},H));ok(o&&o.rest,k+' '+b.join('-')+' 블록 없음');if(!o)return;blocks++;const txt=strip(o.rest);ok(!/undefined|NaN/.test(txt),k+' undefined');
   const names=[...txt.matchAll(/(?:d순위|먼저 d) ([^ ].*?) (?:어울림|기질|[가-힣 ]*?d+점|[A-Z]|$)/g)];const order=DATA[k].items.map(i=>i.n).filter(n=>txt.includes(n)).sort((x,y)=>txt.indexOf(x)-txt.indexOf(y)).join('>');orders[k].add(order);
   ok(DATA[k].items.every(i=>txt.includes(i.n)),k+' 항목이 모두 보여야 함');ok(!/근거 ·|기본 순서로 놓았어요/.test(txt),k+' 순위 이유는 끝맺은 문장, 빈 안내 없음');
   if(DATA[k].mode==='rank'){const sc=[...txt.matchAll(/(d+)점/g)].map(m=>+m[1]);ok(sc.every((v,i)=>!i||sc[i-1]>=v),k+' 점수 내림차순: '+sc);}});});
 const varied=keys.filter(k=>orders[k].size>1).length;ok(varied>=keys.length*0.9,'사주마다 순서가 달라지는 장 '+varied+'/'+keys.length);
 console.log('순위 블록 '+keys.length+'장 × 10개 사주 = '+blocks+'개, 순서가 달라지는 장 '+varied);
}

if(fails.length){console.error(fails.slice(0,40).join('\n'));console.error('실패 '+fails.length+'건');process.exit(1);}
console.log('PASS reading-feature-sim: 29 chapters × '+births.length+' charts × (no assets / all assets), ranked places and 일주 with images and reasons, lead/rest placement, no mutation');
// 시기 순위·그래프(재물·일·인연): 해 10개 그래프 또는 상위 3개, 점수 0~100, 조각이 서로 겹치지 않는다
{
 const ch=mk(1992,6,23,1,'M'),sd=R.SajuData.build(ch,{now}),H={M,ch,sd,now,name:'',assets:{},videos:{}};
 const g=FEAT.timingRank(H,'wealth','chart'),y=FEAT.timingRank(H,'career','year'),m=FEAT.timingRank(H,'wealth','month');
 ok((g.match(/class="dp-bar[ "]/g)||[]).length===10,'10년 그래프 막대 10개');ok((g.match(/★ [0-9]/g)||[]).length===3,'상위 3개 ★');
 ok((y.match(/class="dp-bar[ "]/g)||[]).length===3&&/1순위/.test(y),'해 TOP3');ok(/월 ·/.test(m)&&(m.match(/class="dp-bar[ "]/g)||[]).length===3,'달 TOP3');
 ok(!/undefined|NaN/.test(g+y+m),'시기 조각 undefined');
 // 같은 사람의 한 리딩에서 같은 deep 조각이 두 장에 나오지 않는다(종합풀이·심화 장 분담).
 const seen=new Map();
 ids.forEach(id=>{const o=FEAT.build(withFeature({id},H));if(!o)return;(o.lead+o.rest).split(/(?=<section class="dp-embed)/).forEach(p=>{const k=strip(p).replace(/\s+/g,'').slice(0,60);if(k.length<20)return;if(seen.has(k)&&seen.get(k)!==id)fails.push('같은 조각이 두 장에: '+seen.get(k)+' / '+id+' : '+k);seen.set(k,id);});});
}
if(fails.length){console.error(fails.slice(0,40).join('\n'));console.error('실패 '+fails.length+'건');process.exit(1);}
console.log('PASS 시기 순위·그래프와 장 사이 조각 중복 없음');
