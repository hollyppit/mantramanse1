/* 용어 각주·시기표 카드·포인트 생활 먼저(2026-11-23):  node tests/term-notes-sim.cjs
   1) term-notes-data.js: 생성기와 같은 내용, 합니다체 없음, 주요 용어 포함
   2) TermNotes.mark: 괄호 뜻 걷기(값 든 괄호는 남김), 제목·단추·접힌 근거 처리, 낱말 속·동사 오탐 없음, 처음 한 번만
   3) LifeNarrative card: 서사 장마다 시기 칸 2개 이상, 나이·연도는 periods() 값, 지금 칸 하나, 빈 문장·undefined 없음, 한 리포트 안 같은 칸 문장 반복 없음
   4) ReadingText.html: 카드가 그려지고 카드가 다룬 대운 문단은 본문에서 빠짐
   5) ReadingInsight: 12운성·십성 문단이 용어로 시작하지 않음 */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),cp=require('child_process');
const root=path.join(__dirname,'..'),dir=path.join(root,'report/v2');
// 1) 사전 — 생성기를 다시 돌려도 파일이 같아야 한다
const dataFile=path.join(dir,'term-notes-data.js'),before=fs.readFileSync(dataFile,'utf8');
cp.execFileSync(process.execPath,[path.join(root,'tools/build-term-notes.cjs')],{stdio:'pipe'});
assert.equal(fs.readFileSync(dataFile,'utf8'),before,'term-notes-data.js 가 생성기 결과와 다름 — node tools/build-term-notes.cjs');
vm.runInThisContext(fs.readFileSync(path.join(root,'engine.js'),'utf8'));globalThis.window=globalThis;globalThis.MANTRA_FLAGS={lifeNarrative:true};
const load=f=>vm.runInThisContext(fs.readFileSync(path.join(dir,f+'.js'),'utf8'),{filename:f});
['terms','term-notes-data','term-notes'].forEach(load);
const D=globalThis.MantraTermNotesData,T=ReportV2.TermNotes;
for(const k of ['용신','대운','세운','십성','관성','재성','신약','일지','12운성','건록','원국','천간','지지','기신','교운기'])assert(D[k]&&D[k].p,'사전에 '+k+' 없음');
for(const [k,v] of Object.entries(D)){assert(!/니다/.test(v.p+(v.e||'')),k+' 합니다체');assert(v.p.length<=200,k+' 뜻이 너무 김');assert(!/이 앱|undefined/.test(v.p),k+' 앱 안내 문장');}
// 2) mark
const strip=h=>h.replace(/<button[^>]*data-tn="([^"]+)"[^>]*>([^<]*)<\/button>/g,'[$2]');
const m=h=>strip(T.mark(h,{}));
assert.equal(m('<p>현재 대운(10년 단위의 흐름) 천간의 십성(나와 다른 글자의 관계)이 재성(편재·정재) 쪽이에요.</p>'),'<p>현재 [대운] [천간]의 [십성]이 [재성] 쪽이에요.</p>');
assert.equal(m('<p>신약(나를 돕는 힘 38%)이라 기유 대운(2017~2027년)에는</p>'),'<p>[신약](나를 돕는 힘 38%)이라 기유 [대운](2017~2027년)에는</p>','값이 든 괄호는 남김');
assert.equal(m('<p>상관없이 무관해요, 열정인 사람, 관대한 사람, 지지해 주는 친구, 고지서.</p>'),'<p>상관없이 무관해요, 열정인 사람, 관대한 사람, 지지해 주는 친구, 고지서.</p>','일상어 오탐');
assert.equal(m('<h3>대운 이야기</h3><button>용신</button><summary>재성 보기</summary><p>대운과 대운</p>'),'<h3>대운 이야기</h3><button>용신</button><summary>재성 보기</summary><p>[대운]과 대운</p>','제목·단추 안은 그대로, 처음 한 번만');
assert.equal(m('<details><summary>근거</summary><p>대운 흐름, 용신(균형을 맞추는 기운)</p></details><p>대운이 바뀌어요.</p>'),'<details><summary>근거</summary><p>대운 흐름, [용신]</p></details><p>[대운]이 바뀌어요.</p>','접힌 근거는 괄호 걷은 자리만, 본문 첫 용어는 남김');
const n=T.note('대운',{currentDaewoon:{startYear:2017,ganzhi:'기유'}});assert(n.plain&&/2017/.test(n.here),'내 사주 한 줄');
// 3) 카드
['fact-once','ilju-data','saju-data','deep','deep-life','deep-time','deep-wealth','deep-love','reading-feature-data-1','reading-feature-data-2','reading-feature','fate-blocks','fate-blocks-2','fate-blocks-3','fate-blocks-4','luck-reading','reading-text','life-narrative-data','life-narrative-data-self','life-narrative-data-self2','life-narrative-data-wealth','life-narrative-data-wealth2','life-narrative-data-love','life-narrative-data-love2','life-narrative-data-career','life-narrative-data-career2','life-narrative-data-self3','life-narrative-data-wealth3','life-narrative-data-extra','life-narrative'].forEach(load);
fs.readdirSync(dir).filter(f=>/^reading-insight(-data.*)?\.js$/.test(f)).sort((a,b)=>a.includes('data')?-1:1).forEach(f=>load(f.replace('.js','')));
const L=ReportV2.LifeNarrative,BIRTHS=[[1992,6,23,7,'M'],[1985,11,2,14,'F'],[1970,3,9,7,'M'],[2001,8,30,22,'F'],[1960,1,15,3,'F'],[2010,4,4,9,'M'],[1950,9,9,9,'M']],now=Date.UTC(2026,10,23,3);
let cards=0,charts=0;
for(const [y,mo,d,h,g] of BIRTHS){
 const ch=Manse.compute({year:y,month:mo,day:d,hour:h,minute:0,calendar:'solar',leap:false,gender:g,city:'서울'}),ps=L.periods(Manse,ch,now),seen=new Map();charts++;
 for(const id of Object.keys(L.CHAPTERS)){const r=L.compose(Manse,ch,now,id);if(!r||!r.card)continue;cards++;const it=r.card.items;
  assert(it.length>=2,id+' 칸 2개 미만');assert(it.filter(x=>x.tense==='current').length<=1,id+' 지금 칸 여러 개');
  for(const x of it){const p=ps.find(q=>q.gz===x.gz&&q.year0===+x.years.slice(0,4));assert(p,id+' 엔진에 없는 시기 '+x.gz);assert.equal(x.tense,p.tense,id+' 시제');
   assert(x.text&&!/undefined|NaN|null/.test(x.text+x.age+x.years),id+' 빈 값');assert(/^만 \d+~\d+세$/.test(x.age)&&/^\d{4}~\d{4}년$/.test(x.years),id+' 나이·연도 형식 '+x.age+x.years);
   if(x.tense!=='past'&&id!=='timeline_self_20'){const k=x.text;if(seen.has(k)&&seen.get(k)!==id)assert.fail('카드 문장 반복 '+id+' = '+seen.get(k)+': '+k);seen.set(k,id);}}}
 // 4) 화면: 카드 + 대운 문단 빠짐
 const sd=ReportV2.SajuData.build(ch,{now}),vd=Object.assign({},sd,{name:'민준'});
 for(const id of ['timeline_wealth_06','timeline_career_01','timeline_self_20']){const c={id,editorialContractId:id,title:'t',readingVisualData:vd,readingParagraphs:[]};Object.defineProperty(c,'readingFeature',{value:{M:Manse,ch,sd,now,name:'민준',assets:{},videos:{}}});
  const r=L.compose(Manse,ch,now,id);if(!r||!r.card)continue;const html=ReportV2.ReadingText.html(c,0);
  assert(/class="rd-periods"/.test(html),id+' 카드 없음');assert(!/곧 들어올 만 \d|지금 지나는 만 \d|\d{4}년 무렵\(만 \d+~\d+세\)부터는/.test(html.replace(/<[^>]+>/g,'')),id+' 카드가 다룬 대운 문단이 본문에 남음');
  assert(/class="tn"/.test(html),id+' 용어 단추 없음');}
 // 5) 포인트: 12운성·십성 문단은 생활 모습으로 시작
 for(const id of ['timeline_self_22','timeline_love_09','timeline_career_06']){(ReportV2.ReadingInsight.paragraphs({id,editorialContractId:id},sd)||[]).forEach(p=>assert(!/^(?:[년월일시]주의 12운성은|[년월일시][간지]에 \S+ 놓여 있어요)/.test(p.text),id+' 용어로 시작: '+p.text.slice(0,40)));}
}
assert(cards>=charts*40,'카드가 너무 적음 '+cards);
console.log('PASS term-notes-sim: 사전 '+Object.keys(D).length+'개, 사주 '+charts+'개 × 서사 장 카드 '+cards+'개, 각주·카드·포인트 검사 통과');
