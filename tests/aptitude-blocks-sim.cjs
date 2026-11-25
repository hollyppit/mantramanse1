// 특기·적성 연결 블록이 실제 블록 조립 경로(reading-feature.js build)로 붙는지:  node tests/aptitude-blocks-sim.cjs
//  career_01(work)·wealth_02(money, 20세 미만 제외)·wealth_03(spend) — 스위치 꺼지면 없음, 켜지면 붙음, 빈 값 없음
const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.join(__dirname,'..');
vm.runInThisContext(fs.readFileSync(path.join(root,'engine.js'),'utf8'),{filename:'engine.js'});globalThis.window=globalThis;
['gyeok-structure','wealth-career-data','wealth-career-data-2','wealth-career-data-3','wealth-career-jobs','wealth-career','element-strategy','aptitude-data','aptitude'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),{filename:f}));
['ilju-data','saju-data','deep','deep-life','deep-time','deep-wealth','deep-love','reading-feature-data-1','reading-feature-data-2','reading-feature','reading-text','aptitude-chapters-data','aptitude-chapters'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,'report/v2',f+'.js'),'utf8'),{filename:f}));
const M=globalThis.Manse,R=globalThis.ReportV2,FEAT=R.ReadingFeature,now=Date.UTC(2026,10,25);
const wf=(c,H)=>{Object.defineProperty(c,'readingFeature',{value:H,writable:true,configurable:true,enumerable:false});return c;};
const ids=['timeline_career_01','timeline_wealth_02','timeline_wealth_03','timeline_self_27','timeline_love_04'];let bad=0,seen={};
for(const on of [false,true]){R.AptChapters.on=on;
 for(const b of [[1992,6,23,1,'M'],[1988,11,2,14,'F'],[2012,3,9,7,'M'],[1964,12,25,null,'F']]){const ch=M.compute({year:b[0],month:b[1],day:b[2],hour:b[3],minute:0,calendar:'solar',gender:b[4]}),sd=R.SajuData.build(ch,{now});
  ids.forEach(id=>{const o=FEAT.build(wf({id,editorialContractId:id},{M,ch,sd,now,name:'',assets:{},videos:{}}));const all=o?(o.lead||'')+(o.rest||''):'';const has=/dp-apt/.test(all);const kid=b[0]===2012;
   const expect=on&&!(kid&&(id==='timeline_wealth_02'||id==='timeline_love_04'));if(has!==expect){bad++;console.log('불일치',on,b.join('-'),id,has)};if(/undefined|NaN/.test(all.replace(/<[^>]+>/g,' '))){bad++;console.log('빈 값',id)};if(has)seen[id]=(seen[id]||0)+1;});}}
if(bad){console.log('실패',bad);process.exit(1);}console.log('특기·적성 블록 경로 통과','켜졌을 때 붙은 수',JSON.stringify(seen));
