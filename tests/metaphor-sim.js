const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.window=globalThis;
for(const f of ['engine.js','report/v2/saju-data.js','report/v2/deep.js','report/v2/deep-wealth.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const R=ReportV2,signatures=new Set(),now=Date.UTC(2026,9,16,3);
for(let i=0;i<40;i++){
 const ch=Manse.compute({year:1960+i,month:1+i%12,day:3+i%23,hour:i%7===0?null:i%24,minute:0,calendar:'solar',gender:i%2?'F':'M',city:'서울'}),sd=R.SajuData.build(ch,{now}),before=JSON.stringify(ch),H={M:Manse,ch,sd,now,name:'테스트',assets:{}};
 const car=R.Deep.SECTIONS.deep_car(H),wealth=R.Deep.SECTIONS.deep_wealth(H),a=car.scenes.map(s=>s.html).join(''),b=wealth.scenes.map(s=>s.html).join('');
 assert(a.includes('교육용 비유'));assert(a.includes('강약과 통근은 다른 기준'));assert(a.includes('당일 세부 조건(일진)'));assert(a.includes('개인의 선택'));assert(a.includes('운세 계산 공식으로 사용하지 않습니다'));
 assert(b.includes('실제 재산 규모·소득 상한·투자 수익률을 뜻하지 않습니다'));assert(b.includes('서비스 내부 지표'));assert(b.includes('가격·납기·회수일'));assert(b.includes('고정비·부채·비상 지출'));
 assert(!/큰 돈도 들고 갈 힘|큰 돈 앞에서는 쉽게 지쳐|많이 담을 수 있는 크기/.test(b));assert(!/undefined|NaN/.test(a+b));assert.equal(JSON.stringify(ch),before);
 const profile=R.DeepWealth.profile(sd),gauges=R.DeepWealth.gauges(profile);assert(gauges.every(g=>Number.isFinite(g.v)&&g.v>=0&&g.v<=100));signatures.add(wealth.vessel+':'+wealth.route);
}
assert(signatures.size>=5);console.log('metaphor: 40 charts; varying vessel/route; car and wealth limits; engine unchanged PASS');
