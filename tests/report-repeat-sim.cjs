/* 한 리포트 안에서 같은 문장이 여러 장에 되풀이되지 않는지 검사:  node tests/report-repeat-sim.cjs
   사주 여러 개로 65장의 엔진 문단(서사·깊이·포인트·대운 설명·심화 블록)을 모아, 14자 이상 문장이 두 장 이상에 나오면 실패. (fact-once.js) */
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.join(__dirname,'..');
vm.runInThisContext(fs.readFileSync(path.join(root,'engine.js'),'utf8'));globalThis.window=globalThis;globalThis.MANTRA_FLAGS={lifeNarrative:true};
const dir=path.join(root,'report/v2');const load=f=>vm.runInThisContext(fs.readFileSync(path.join(dir,f+'.js'),'utf8'),{filename:f});
['fact-once','ilju-data','saju-data','deep','deep-life','deep-time','deep-wealth','deep-love','reading-feature-data-1','reading-feature-data-2','reading-feature','fate-blocks','fate-blocks-2','fate-blocks-3','fate-blocks-4','reading-text','luck-reading','reading-peak','life-narrative-data','life-narrative-data-self','life-narrative-data-self2','life-narrative-data-wealth','life-narrative-data-wealth2','life-narrative-data-love','life-narrative-data-love2','life-narrative-data-career','life-narrative-data-career2','life-narrative'].forEach(load);
fs.readdirSync(dir).filter(f=>/^reading-(depth|insight)(-data.*)?\.js$/.test(f)).sort((a,b)=>a.includes('data')?-1:1).forEach(f=>load(f.replace('.js','')));
const M=Manse,R=ReportV2,L=R.LifeNarrative;let total=0;const BIRTHS=[[1992,6,23,7,"M"],[1985,11,2,14,"F"],[1970,3,9,7,"M"],[2001,8,30,22,"F"],[1960,1,15,3,"F"],[2008,4,4,9,"M"]];
for(const [y,m,d,h,g] of BIRTHS){R.FactOnce.reset();
const ch=M.compute({year:y,month:m,day:d,hour:h,minute:0,calendar:'solar',leap:false,gender:g,city:'서울'}),now=Date.now(),sd=R.SajuData.build(ch,{now});
const vd=Object.assign({},sd,{name:'민준'});const H={M,ch,sd,now,name:'민준',assets:{},videos:{}};
const ids=[];['self','wealth','career','love'].forEach(t=>{for(let i=1;i<=40;i++)ids.push('timeline_'+t+'_'+String(i).padStart(2,'0'));});ids.splice(ids.indexOf('timeline_self_20')+1,0,'timeline_self_peak');
const seen=new Map(),reps=[];const sents=t=>String(t||'').replace(/<[^>]+>/g,' ').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>=14);
let chapters=0;
for(const id of ids){const c={id,editorialContractId:id,readingVisualData:vd};Object.defineProperty(c,'readingFeature',{value:H});const parts=[];
 const n=L.CHAPTERS[id]?L.compose(M,ch,now,id):null;if(n)n.rows.forEach(r=>parts.push(['narr',r.text]));
 R.ReadingDepth&&R.ReadingDepth.paragraphs(c,vd).forEach(p=>parts.push(['depth',p.text]));
 R.ReadingInsight&&R.ReadingInsight.paragraphs(c,vd).forEach(p=>parts.push(['insight',p.text]));
 try{const fb=R.ReadingFeature.build(c);if(fb)parts.push(['feature',(fb.lead||'')+' '+(fb.rest||'')]);}catch(e){}
 const lr=MantraLuckReading.context(id,sd);if(lr)parts.push(['luck',lr.text]);
 if(!parts.length)continue;chapters++;
 parts.forEach(([src,t])=>sents(t).forEach(s=>{const k=s.replace(/\s+/g,'');if(seen.has(k)&&seen.get(k).id!==id)reps.push(id+' ['+src+'] = '+seen.get(k).id+' ['+seen.get(k).src+']: '+s);else if(!seen.has(k))seen.set(k,{id,src});}));}
total+=reps.length;if(reps.length)console.log([y,m,d,h,g].join('-')+' 반복 '+reps.length+'\n'+reps.slice(0,5).join('\n'));}
if(total){console.log('실패: 반복 문장 '+total);process.exit(1);}console.log('PASS report-repeat-sim: 사주 '+BIRTHS.length+'개 × 65장, 장 사이 반복 문장 0');
