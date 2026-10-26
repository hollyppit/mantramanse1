const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.window=globalThis;
for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-flow.js','report/v2/plain-copy.js','report/v2/reading-media.js','report/v2/reading-text.js','report/v2/reading-peak.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const R=ReportV2,chart=(y,m,d,h)=>R.SajuData.build(Manse.compute({year:y,month:m,day:d,hour:h,minute:0,gender:'M',calendar:'solar',city:'서울'}),{now:Date.UTC(2026,9,20)});
let checks=0;
for(const sd of [chart(1992,6,23,1),chart(1995,8,12,14),chart(2000,12,3,null)]){
 sd.name='가상검수';
 const charts=new Set();
 for(let n=1;n<=22;n++){const c={id:'timeline_self_'+String(n).padStart(2,'0'),title:'장점과 약점',readingVisualData:sd,readingCore:{title:'이유를 확인하고 내가 할 일을 정하세요. 맡은 일을 끝까지 챙기세요.',reality:'회의에서 정한 일이 바뀌면 마감부터 다시 물어보세요.'}};
 const h=R.ReadingText.html(c,n);assert(!h.includes('생활 속 예시는 가정한'));assert(!h.includes('능력 점수나 실제 재산'));assert(h.includes('reading-hook'));const kind=/data-chart-kind="([^"]+)"/.exec(h);assert(kind);charts.add(kind[1]);if(![3,20,21].includes(n))for(const value of Object.values(sd.groups))assert(h.includes((Math.round(value*10)/10)+'%'));checks++;}
 assert(charts.size>=4);
 const peak=R.PeakReading.build(sd,'가상검수');assert(peak.aiEnabled===false&&!peak.readingDeferred);assert(peak.readingCore.title.includes('가상검수님'));for(const p of peak.readingVisualData.peakPeriods)assert(sd.daewoon.some(x=>x.startYear===p.startYear&&x.endYear===p.endYear&&x.season===p.season));
 assert(R.ReadingText.html(peak,23).includes('reading-timing-rank'));
 peak.readingVisualData.name='가상생활';peak.readingCore.title='가상생활님이 힘을 써볼 시기는 2037~2046년이에요.';peak.readingParagraphs.find(p=>p.role==='title').text=peak.readingCore.title;assert(R.ReadingText.organize(peak).rows.some(r=>r.role==='title'),'a reader name containing 상생 must not hide the introduction');
 const rep={chapters:[{id:'x',editorialContractId:'timeline_self_21',editorialTopicId:'self',act:1}]};R.PeakReading.add(rep,sd,'가상검수');R.PeakReading.add(rep,sd,'가상검수');assert.equal(rep.chapters.length,2);
 const onlyVideo=R.ReadingMedia.fromAwakening({ilgan:{videoUrl:'/stem-only.mp4'},video:{videoUrl:'/day-only.mp4'}},sd);const onlySelected=R.ReadingMedia.pick(onlyVideo,{id:'rendered',editorialContractId:'timeline_self_03',editorialTopicId:'self'},sd,2);assert.equal(onlySelected.length,2);assert(onlySelected.every(m=>R.ReadingMedia.html(m).includes('<video')&&!R.ReadingMedia.html(m).includes('<img')));
 const pool=R.ReadingMedia.fromAwakening({ilgan:{posterUrl:'/stem.webp',videoUrl:'/stem.mp4'},video:{posterUrl:'/day.webp',videoUrl:'/day.mp4'}},sd);
 const selected=R.ReadingMedia.pick(pool,{id:'other',editorialContractId:'timeline_self_03',editorialTopicId:'self'},sd,2);assert.equal(selected.length,2);assert.deepEqual(new Set(selected.map(x=>x.video)),new Set(['/stem.mp4','/day.mp4']));
}
assert(!/쪽이에요|편이에요/.test(MantraPlainCopy.text('사람들의 기대를 빨리 알아차리는 편이에요.')));
assert(!MantraPlainCopy.text('막힐 때 버티는 힘만 쓰기보다 배워둔 방법과 믿을 만한 지원을 다시 꺼내 쓰는 쪽이 유리해요.').includes('지원'));
console.log('PASS: '+checks+' chapter charts across 3 actual charts, exact proportions, diverse shapes, 2 semantic day videos, named local peak timeline, idempotence, direct everyday copy; no fetch/provider used');
