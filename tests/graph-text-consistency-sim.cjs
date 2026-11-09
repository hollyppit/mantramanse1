/* 그래프와 풀이가 같은 말을 하는지 검사:  node tests/graph-text-consistency-sim.cjs
   - '지금 대운'이 모든 곳(사주 데이터 · 풀이 그래프 · 타임라인 화면)에서 같은 대운이다(날짜 기준: 대운 시작일 ≤ 오늘 < 다음 대운 시작일).
   - 전성기 장이 고른 시기 = 그래프 "앞으로 힘이 실리는 시기 순위"의 위쪽과 같은 순서, 가장 강한 때 = 그래프 1위.
   - 교운기(지금 대운이 12개월 안에 끝나거나 시작된 지 12개월 미만)인 사람은 대운 풀이에 '교운기'와 바뀌는 대운 이름이 나온다.
   - 교운기로 곧 끝나는 대운은 전성기 순위와 그래프 순위 모두에서 빠진다.
   - 풀이 문장에 undefined·NaN 이 없다. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
vm.runInThisContext(fs.readFileSync(path.join(root,'engine.js'),'utf8'),{filename:'engine.js'});
globalThis.window=globalThis;
['ilju-data','saju-data','deep','deep-life','deep-time','deep-wealth','deep-love','reading-feature-data-1','reading-feature-data-2','reading-feature','reading-text','luck-reading','reading-peak','story-director'].forEach(f=>{try{vm.runInThisContext(fs.readFileSync(path.join(root,'report/v2',f+'.js'),'utf8'),{filename:f+'.js'});}catch(e){if(f!=='story-director')throw e;}});
const M=globalThis.Manse,R=globalThis.ReportV2,fails=[],ok=(c,m)=>{if(!c)fails.push(m);};
const now=Date.now(),strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
let n=0,shifts=0;
for(let y=1950;y<=2010;y+=3)for(const [m,d,h,g] of [[1,15,3,'M'],[4,9,11,'F'],[6,23,7,'M'],[9,2,18,'F'],[12,28,22,'M']]){
 const ch=M.compute({year:y,month:m,day:d,hour:h,minute:0,calendar:'solar',leap:false,gender:g,city:'서울'}),sd=R.SajuData.build(ch,{now}),tag=[y,m,d,h,g].join('-');n++;
 const cur=sd.currentDaewoon;if(!cur)continue;
 const rows=sd.daewoon.filter(p=>Number.isFinite(p.startYear)&&Number.isFinite(p.endYear)&&Number.isFinite(p.startAge)&&p.startAge<90);
 ok(R.ReadingText.currentIndex(rows,sd.nowYear)===rows.indexOf(cur),tag+' 그래프의 지금 대운 ≠ 사주 데이터의 지금 대운');
 if(R.StoryDirector&&R.StoryDirector.lifeMap){const lm=R.StoryDirector.lifeMap(M,ch,now).filter(x=>x.isCurrent);ok(lm.length===1&&lm[0].ganzhi===cur.ganzhi,tag+' 타임라인 화면의 지금 대운 '+lm.map(x=>x.ganzhi)+' ≠ '+cur.ganzhi);}
 const c=R.PeakReading.build(sd,'검사'),core=c.readingCore,txt=Object.values(core).join(' ');
 ok(!/undefined|NaN|\[object/.test(txt),tag+' 전성기 문장에 undefined/NaN');
 const ov=R.ReadingText.overview(c),rank=(strip(ov).match(/앞으로 힘이 실리는 시기 순위(.*)$/)||['',''])[1];
 const rankGz=[...rank.matchAll(/(\d)위 (\S+) 대운/g)].map(x=>x[2]);
 const picks=(c.readingVisualData.peakPicks||[]).map(sy=>sd.daewoon.find(p=>p.startYear===sy)).filter(Boolean);
 const shift=sd.daewoonShift;
 if(picks.length&&!/지나온 흐름/.test(core.title)){
  const top=sd.daewoon.find(p=>p.startYear===c.readingVisualData.peakSelected);
  ok(top&&rankGz[0]===top.ganzhi,tag+' 전성기 "가장 강한 때" '+(top&&top.ganzhi)+' ≠ 그래프 1위 '+rankGz[0]);
  ok(picks.every(p=>rankGz.slice(0,3).includes(p.ganzhi)||!rankGz.length),tag+' 전성기 시기 '+picks.map(p=>p.ganzhi)+' 가 그래프 순위 '+rankGz+' 밖');
  if(shift&&shift.phase==='ending'){ok(!picks.includes(cur),tag+' 곧 끝나는 대운이 전성기에 들어감');ok(!rankGz.includes(cur.ganzhi),tag+' 곧 끝나는 대운이 그래프 순위에 남음');}
 }
 if(shift){shifts++;const t=(globalThis.MantraLuckReading.context('timeline_self_20',sd)||{}).text||'';ok(/교운기/.test(t)&&t.includes(shift.to.ganzhi),tag+' 교운기인데 대운 풀이에 교운기 언급 없음');ok(!/undefined|NaN/.test(t),tag+' 대운 풀이에 undefined');}
 else{const t=(globalThis.MantraLuckReading.context('timeline_self_20',sd)||{}).text||'';ok(!/교운기/.test(t),tag+' 교운기가 아닌데 교운기 문장');}
 const tb=R.ReadingFeature.talentBlock({M,ch,sd,now,name:'검사',assets:{},videos:{}});ok(tb&&!/undefined|NaN/.test(strip(tb)),tag+' 타고난 강점 블록 오류');
}
console.log('사주 '+n+'개(교운기 '+shifts+'개) 검사');
if(fails.length){console.log('실패 '+fails.length+'건\n'+fails.slice(0,30).join('\n'));process.exit(1);}
console.log('모두 통과');
