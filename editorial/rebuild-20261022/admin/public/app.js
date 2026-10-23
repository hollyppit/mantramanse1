// Rebuild admin UI. All text is inserted with textContent (no innerHTML) so stored copy can never inject markup.
const TOKEN=new URLSearchParams(location.hash.slice(1)).get('token')||sessionStorage.getItem('rb-token')||'';
if(TOKEN)sessionStorage.setItem('rb-token',TOKEN);
const $=s=>document.querySelector(s);
function h(tag,props,...kids){const el=document.createElement(tag);for(const [k,v] of Object.entries(props||{})){if(k==='class')el.className=v;else if(k==='on')for(const [ev,fn] of Object.entries(v))el.addEventListener(ev,fn);else if(v===true)el.setAttribute(k,'');else if(v!==false&&v!=null)el.setAttribute(k,v);}for(const k of kids.flat())if(k!=null&&k!==false)el.append(k.nodeType?k:document.createTextNode(String(k)));return el;}
async function api(path,opts={}){
 const r=await fetch('/api'+path,{method:opts.body?'POST':'GET',headers:{'x-admin-token':TOKEN,...(opts.body?{'content-type':'application/json'}:{})},body:opts.body?JSON.stringify(opts.body):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.message||j.error||r.statusText);e.detail=j.detail;e.code=j.error;throw e;}return j;
}
const by=()=>$('#by').value.trim();
function banner(msg,err){const b=$('#banner');b.hidden=!msg;b.className='banner'+(err?' err':'');b.textContent=msg||'';if(msg)setTimeout(()=>{if(b.textContent===msg)b.hidden=true;},err?9000:4000);}
async function guard(fn){try{return await fn();}catch(e){banner(e.message+(e.detail?.hard?' — '+e.detail.hard.map(x=>x.msg).join(' / '):''),true);}}
const status=s=>h('span',{class:'tag '+s},{draft:'초안',review:'검수중',approved:'승인',retired:'폐기'}[s]||s);
const SC={clarity:'직관',concreteness:'구체',candor:'솔직',accuracy:'명리',personalization:'개인화',density:'밀도',focus:'집중',consistency:'일관'};
const scores=s=>h('span',{},Object.entries(SC).map(([k,l])=>h('span',{class:'score '+(s[k]<=2?'bad':s[k]>=4?'ok':''),title:l},l+s[k])));
function diffWords(a,b){const A=String(a||'').split(/(\s+)/),B=String(b||'').split(/(\s+)/);if(A.length*B.length>400000)return [h('del',{},a),' → ',h('ins',{},b)];
 const m=A.length,n=B.length,L=Array.from({length:m+1},()=>new Uint16Array(n+1));for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)L[i][j]=A[i]===B[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 const out=[];let i=0,j=0;while(i<m&&j<n){if(A[i]===B[j]){out.push(A[i]);i++;j++;}else if(L[i+1][j]>=L[i][j+1]){out.push(h('del',{},A[i]));i++;}else{out.push(h('ins',{},B[j]));j++;}}
 while(i<m)out.push(h('del',{},A[i++]));while(j<n)out.push(h('ins',{},B[j++]));return out;}

const TABS=[['dash','대시보드'],['entries','문안·편집'],['checks','검사'],['sim','시뮬레이션'],['traces','추적'],['bulk','일괄 교체'],['release','릴리스·승인']];
let tab='dash',ctx={chapter:'',topic:'',status:'',q:'',cond:'',value:'',sel:null};
function renderTabs(){const n=$('#tabs');n.replaceChildren(...TABS.map(([id,l])=>h('button',{class:id===tab?'on':'',on:{click:()=>{tab=id;go();}}},l)));}
async function go(){renderTabs();const v=$('#view');v.replaceChildren(h('p',{class:'mut'},'불러오는 중…'));await guard(async()=>{v.replaceChildren(await VIEWS[tab]());});}

const VIEWS={
 async dash(){
  const [meta,chs]=await Promise.all([api('/meta'),api('/chapters')]);
  const root=h('div',{});
  root.append(h('div',{class:'card'},h('div',{class:'row'},h('b',{},`문안 ${meta.entries}개 · 장 ${meta.chapters}개`),status('draft'),meta.counts.draft,status('review'),meta.counts.review,status('approved'),meta.counts.approved,status('retired'),meta.counts.retired),
   h('div',{class:'mut'},meta.tools.note+' 상태 파일: '+meta.stateFile)));
  for(const t of meta.topics){
   const rows=chs.filter(c=>c.topicId===t.id);
   root.append(h('div',{class:'card'},h('b',{},`${t.title} (${t.chapters}개 장)`),h('table',{},h('tr',{},...['장','제목','문안','초안','검수중','승인','시기 승인 필요'].map(x=>h('th',{},x))),
    ...rows.map(c=>h('tr',{class:'click',on:{click:()=>{ctx.chapter=c.id;ctx.topic='';tab='entries';go();}}},h('td',{},c.id.replace('timeline_','')),h('td',{},c.title),h('td',{},c.entries),h('td',{},c.status.draft),h('td',{},c.status.review),h('td',{},c.status.approved),h('td',{},c.needsTimeJudgment?'예':''))))));
  }
  return root;
 },
 async entries(){
  const [chs,fields]=await Promise.all([api('/chapters'),api('/cond-fields')]);
  const root=h('div',{}),listBox=h('div',{class:'card'}),detail=h('div',{class:'card'},h('p',{class:'mut'},'왼쪽에서 문안을 선택하세요.'));
  const chSel=h('select',{on:{change:e=>{ctx.chapter=e.target.value;load();}}},h('option',{value:''},'모든 장'),...chs.map(c=>h('option',{value:c.id,selected:c.id===ctx.chapter},`${c.id.replace('timeline_','')} ${c.title}`)));
  const stSel=h('select',{on:{change:e=>{ctx.status=e.target.value;load();}}},...[['','모든 상태'],['draft','초안'],['review','검수중'],['approved','승인'],['retired','폐기']].map(([v,l])=>h('option',{value:v,selected:v===ctx.status},l)));
  const q=h('input',{placeholder:'문구·id 검색',value:ctx.q,on:{keydown:e=>{if(e.key==='Enter'){ctx.q=e.target.value;load();}}}});
  const cf=h('select',{on:{change:e=>{ctx.cond=e.target.value;vs.replaceChildren(h('option',{value:''},'(필드만)'),...(fields[ctx.cond]||[]).map(v=>h('option',{value:v},v)));load();}}},h('option',{value:''},'조건 필드'),...Object.keys(fields).map(k=>h('option',{value:k,selected:k===ctx.cond},k)));
  const vs=h('select',{on:{change:e=>{ctx.value=e.target.value;load();}}},h('option',{value:''},'(필드만)'),...(fields[ctx.cond]||[]).map(v=>h('option',{value:v,selected:v===ctx.value},v)));
  listBox.append(h('div',{class:'row'},chSel,stSel),h('div',{class:'row'},q,cf,vs));
  const table=h('div',{});listBox.append(table);
  async function load(){const p=new URLSearchParams({chapter:ctx.chapter,status:ctx.status,q:ctx.q,cond:ctx.cond,value:ctx.value,limit:'300'});
   await guard(async()=>{const r=await api('/entries?'+p);table.replaceChildren(h('div',{class:'mut'},`${r.total}개`),h('table',{},...r.items.map(e=>h('tr',{class:'click'+(e.id===ctx.sel?' sel':''),on:{click:()=>{ctx.sel=e.id;load();open(e.id);}}},h('td',{},status(e.status)),h('td',{},h('div',{},e.id),h('div',{class:'mut'},e.core))))));});}
  async function open(id){await guard(async()=>{detail.replaceChildren(await entryDetail(id,()=>{load();open(id);}));});}
  root.append(h('div',{class:'grid'},listBox,detail));load();if(ctx.sel)open(ctx.sel);return root;
 },
 async checks(){
  const root=h('div',{});const [c,d,cf]=await Promise.all([api('/checks?only=fail&limit=100'),api('/duplicates?threshold=0.6'),api('/conflicts')]);
  root.append(h('div',{class:'card'},h('b',{},`자동 검사: 합격 ${c.pass} / 불합격 ${c.fail} (총 ${c.total})`),h('div',{class:'mut'},c.scoresNote),
   h('div',{class:'kv'},...Object.entries(c.averageScores).flatMap(([k,v])=>[h('b',{},SC[k]||k),String(v)])),
   h('details',{},h('summary',{},'경고·불합격 유형별 건수'),h('table',{},...Object.entries(c.codes).sort((a,b)=>b[1]-a[1]).map(([k,v])=>h('tr',{},h('td',{},k),h('td',{},v))))),
   ...(c.results.length?[h('table',{},...c.results.map(r=>h('tr',{},h('td',{},r.id),h('td',{class:'bad'},r.hard.map(x=>x.msg).join(' / ')))))]:[h('p',{class:'ok'},'불합격 문안이 없습니다.')])));
  root.append(h('div',{class:'card'},h('b',{},`중복 후보 ${d.count}쌍 (유사도 상위 ${d.pairs.length})`),h('table',{},h('tr',{},...['A','B','유사도','범위'].map(x=>h('th',{},x))),...d.pairs.map(p=>h('tr',{class:'click',on:{click:()=>{ctx.sel=p.a;ctx.chapter='';tab='entries';go();}}},h('td',{},p.a),h('td',{},p.b),h('td',{},p.score),h('td',{},p.scope==='same-chapter'?'같은 장':'다른 장'))))));
  const scanBox=h('div',{});
  root.append(h('div',{class:'card'},h('b',{},'상충 검사'),h('div',{class:'mut'},'선언된 상충의 대칭성·존재 여부와, 한 원국에 함께 표시되는 문안 쌍 중 반대 판정 후보를 확인합니다.'),
   h('div',{},cf.declaredIssues.length?cf.declaredIssues.map(x=>h('div',{class:'bad'},x.id+': '+x.msg)):h('span',{class:'ok'},'선언된 상충 문제 없음')),
   h('div',{class:'row'},h('button',{class:'primary',on:{click:()=>guard(async()=>{banner('상충 스캔 중… (원국 60개 × 84개 장)');const r=await api('/conflicts?scan=1&charts=60');renderScan(scanBox,r.scan);banner('스캔 완료');})}},'원국 60개로 함께 표시 쌍 스캔'),scanBox)));
  if(cf.scan)renderScan(scanBox,cf.scan);
  return root;
 },
 async sim(){
  const root=h('div',{});const out=h('div',{});
  const f={year:h('input',{type:'number',value:'1990',style:'width:90px'}),month:h('input',{type:'number',value:'5',style:'width:60px'}),day:h('input',{type:'number',value:'17',style:'width:60px'}),hour:h('input',{type:'number',value:'10',placeholder:'시(모름=빈칸)',style:'width:110px'}),minute:h('input',{type:'number',value:'0',style:'width:60px'}),
   gender:h('select',{},h('option',{value:'M'},'남'),h('option',{value:'F'},'여')),calendar:h('select',{},h('option',{value:'solar'},'양력'),h('option',{value:'lunar'},'음력')),asOf:h('input',{type:'date',value:'2026-10-22'}),
   mode:h('select',{},h('option',{value:'preview'},'미리보기(초안 포함)'),h('option',{value:'approved'},'승인본만(사용자에게 보일 결과)')),label:h('input',{placeholder:'추적 라벨',value:'테스트'}),store:h('input',{type:'checkbox'})};
  root.append(h('div',{class:'card'},h('b',{},'생년월일시 시뮬레이션'),h('div',{class:'mut'},'입력한 생년월일시는 기본적으로 저장하지 않고 해시만 남깁니다. 로컬 엔진으로 계산하며 AI·네트워크 호출이 없습니다.'),
   h('div',{class:'row'},'연',f.year,'월',f.month,'일',f.day,'시',f.hour,'분',f.minute,f.gender,f.calendar),h('div',{class:'row'},'기준일',f.asOf,f.mode,f.label,h('label',{},f.store,' 생년월일 저장(로컬)')),
   h('button',{class:'primary',on:{click:()=>guard(async()=>{out.replaceChildren(h('p',{class:'mut'},'계산 중…'));const r=await api('/simulate',{body:{birth:{year:f.year.value,month:f.month.value,day:f.day.value,hour:f.hour.value,minute:f.minute.value,gender:f.gender.value,calendar:f.calendar.value},asOf:f.asOf.value,mode:f.mode.value,label:f.label.value,storeBirth:f.store.checked,by:by()}});renderSim(out,r,f);})}},'84개 장 리포트 생성')));
  root.append(out);return root;
 },
 async traces(){
  const list=await api('/traces'),root=h('div',{}),box=h('div',{class:'card'},h('p',{class:'mut'},'기록을 선택하면 장별로 실제 선택된 문안(id·버전·상태)과 제외된 후보를 볼 수 있습니다.'));
  root.append(h('div',{class:'grid'},h('div',{class:'card'},h('b',{},`추적 기록 ${list.length}건`),h('table',{},...list.map(t=>h('tr',{class:'click',on:{click:()=>guard(async()=>{const x=await api('/trace/'+t.id);box.replaceChildren(traceView(x));})}},h('td',{},new Date(t.at).toLocaleString()),h('td',{},t.label),h('td',{},t.dayPillar||''),h('td',{},t.mode==='approved'?'승인본':'미리보기'))))),box));
  return root;
 },
 async bulk(){
  const chs=await api('/chapters'),out=h('div',{});
  const find=h('input',{placeholder:'찾을 문구(2자 이상)',style:'width:260px'}),rep=h('input',{placeholder:'바꿀 문구',style:'width:260px'}),note=h('input',{placeholder:'변경 사유',style:'width:260px'}),chSel=h('select',{multiple:true,size:8,style:'min-width:260px'},...chs.map(c=>h('option',{value:c.id},`${c.id.replace('timeline_','')} ${c.title}`)));
  const fieldBoxes=['core','basis','example','positive','negative','advice','timing'].map(k=>[k,h('input',{type:'checkbox',checked:k!=='timing'&&k!=='basis'})]);
  const run=preview=>guard(async()=>{const r=await api('/bulk/replace',{body:{find:find.value,replace:rep.value,fields:fieldBoxes.filter(([,c])=>c.checked).map(([k])=>k),chapters:[...chSel.selectedOptions].map(o=>o.value),preview,by:by(),note:note.value}});
   out.replaceChildren(preview?h('div',{},h('b',{},`영향 문안 ${r.count}개(미리보기)`),h('table',{},...r.hits.map(x=>h('tr',{},h('td',{},x.id),h('td',{},x.detail.map(d=>d.field+'×'+d.count).join(', ')),h('td',{class:'mut'},x.sample))))):h('div',{},h('b',{},`적용 ${r.applied}개`),r.failed.length?h('div',{class:'bad'},`실패 ${r.failed.length}개: `+r.failed.map(f=>f.id).join(', ')):''));});
  return h('div',{class:'card'},h('b',{},'문구 일괄 교체 (모든 변경은 새 버전으로 기록, 상태는 초안으로 되돌림)'),h('div',{class:'row'},find,rep,note),h('div',{class:'row'},'대상 필드',...fieldBoxes.map(([k,c])=>h('label',{},c,' '+k))),h('div',{class:'row'},h('span',{class:'mut'},'장 선택(미선택=전체)'),chSel),h('div',{class:'row'},h('button',{on:{click:()=>run(true)}},'미리보기'),h('button',{class:'primary',on:{click:()=>{if(confirm('일괄 교체를 적용합니다. 계속할까요?'))run(false);}}},'적용')),out);
 },
 async release(){
  const r=await api('/releases'),log=await api('/audit'),root=h('div',{}),note=h('input',{placeholder:'릴리스 설명(5자 이상)',style:'width:340px'});
  root.append(h('div',{class:'card'},h('b',{},`승인된 문안 ${r.approved}개`),h('div',{class:'mut'},'릴리스 후보는 로컬 파일로만 내보냅니다. 운영 DB 게시는 이 도구에서 불가능하며 별도의 지문 확인·롤백 SQL·승인 절차가 필요합니다.'),
   h('div',{class:'row'},note,h('button',{class:'primary',on:{click:()=>guard(async()=>{const x=await api('/release',{body:{by:by(),note:note.value}});banner(`릴리스 후보 ${x.id} 생성(${x.count}개): ${x.file}`);go();})}},'릴리스 후보 만들기'),
   h('button',{class:'danger',on:{click:()=>guard(async()=>{await api('/publish',{body:{}});})}},'운영 게시 시도(항상 거부됨)'))));
  root.append(h('div',{class:'card'},h('b',{},'릴리스 후보'),h('table',{},h('tr',{},...['id','시각','작성자','문안','설명',''].map(x=>h('th',{},x))),...r.releases.map(x=>h('tr',{},h('td',{},x.id),h('td',{},new Date(x.at).toLocaleString()),h('td',{},x.by),h('td',{},x.count),h('td',{},x.note),h('td',{},h('button',{on:{click:()=>{if(confirm('이 릴리스 상태로 승인·내용을 복원합니다. 계속할까요?'))guard(async()=>{const y=await api(`/release/${x.id}/restore`,{body:{by:by()}});banner(`복원: 승인 ${y.approved}개, 내용 복원 ${y.contentRestored}개, 승인 해제 ${y.approvalsReset}개`);go();});}}},'이 상태로 복원')))))));
  root.append(h('div',{class:'card'},h('b',{},'감사 로그(최근 200건)'),h('table',{},...log.map(a=>h('tr',{},h('td',{},new Date(a.at).toLocaleString()),h('td',{},a.by),h('td',{},a.action),h('td',{},a.id||''),h('td',{class:'mut'},a.detail?JSON.stringify(a.detail).slice(0,120):''))))));
  return root;
 },
};

function renderScan(box,s){if(!s){box.replaceChildren();return;}
 box.replaceChildren(h('div',{},`원국 ${s.charts}개 · 두 문안이 함께 표시된 장 ${s.twoPickChapters}건 · 서로 다른 쌍 ${s.distinctPairs}개 · 선언된 상충 위반 ${s.declaredViolations.length}건`),
  h('b',{},'반대 판정 후보(선언되지 않음)'),s.unresolvedCandidates.length?h('table',{},...s.unresolvedCandidates.map(c=>h('tr',{},h('td',{},c.chapter.replace('timeline_','')),h('td',{},c.a+' ↔ '+c.b),h('td',{},c.words.join(' / ')),h('td',{},c.count+'회')))):h('div',{class:'ok'},'없음'));}

async function entryDetail(id,reload){
 const d=await api('/entry/'+encodeURIComponent(id)),e=d.entry,root=h('div',{});
 root.append(h('div',{class:'row'},h('b',{},e.id),status(d.status),h('span',{class:'mut'},`v${e.version} · ${d.chapter.title}${d.needsTimeJudgment?' · 시기 승인 필요':''}`)));
 root.append(h('div',{class:'kv'},h('b',{},'적용 조건(when)'),h('span',{},JSON.stringify(e.when)),h('b',{},'제외(unless)'),h('span',{},JSON.stringify(e.unless||{})),h('b',{},'상충 선언'),h('span',{},(e.conflicts||[]).join(', ')||'-'),h('b',{},'검사'),h('span',{},d.checks.pass?h('span',{class:'ok'},'합격 '):h('span',{class:'bad'},'불합격 '),scores(d.checks.scores),' 평균 '+d.checks.total)));
 if(d.checks.hard.length)root.append(h('div',{class:'bad'},d.checks.hard.map(x=>'✖ '+x.msg).join(' / ')));
 if(d.checks.soft.length)root.append(h('div',{class:'warn'},d.checks.soft.map(x=>'△ '+x.msg).join(' / ')));
 const ta={};const fieldsDef=[['core','핵심 진단'],['basis','명리적 이유'],['example','현실 사례'],['positive','긍정적 발현'],['negative','부정적 발현'],['advice','실천 방법'],['timing','시기']];
 for(const [k,l] of fieldsDef){ta[k]=h('textarea',{},e[k]||'');root.append(h('details',{open:k==='core'||k==='example'},h('summary',{},l),ta[k]));}
 const app={};for(const k of ['employee','business','freelance']){app[k]=h('textarea',{style:'min-height:44px'},e.applications[k]||'');}
 root.append(h('details',{},h('summary',{},'상황별 적용(직장·사업·프리랜서)'),...Object.entries(app).map(([k,v])=>h('div',{},h('b',{},{employee:'직장',business:'사업',freelance:'프리랜서'}[k]),v))));
 const whenTa=h('textarea',{style:'font-family:monospace'},JSON.stringify(e.when,null,1)),unlTa=h('textarea',{style:'font-family:monospace;min-height:44px'},JSON.stringify(e.unless||{},null,1)),pri=h('input',{type:'number',value:e.priority,style:'width:80px'});
 root.append(h('details',{},h('summary',{},'조건·우선순위 편집(JSON)'),'when',whenTa,'unless',unlTa,'priority ',pri));
 const note=h('input',{placeholder:'변경 사유',style:'width:260px'});
 root.append(h('div',{class:'row'},note,h('button',{class:'primary',on:{click:()=>guard(async()=>{const fields={priority:Number(pri.value),applications:Object.fromEntries(Object.entries(app).map(([k,v])=>[k,v.value]))};for(const [k] of fieldsDef)fields[k]=ta[k].value;
   try{fields.when=JSON.parse(whenTa.value);fields.unless=JSON.parse(unlTa.value);}catch{throw new Error('조건 JSON 형식이 올바르지 않습니다.');}
   await api('/entry/'+encodeURIComponent(id)+'/save',{body:{fields,by:by(),note:note.value}});banner('저장했습니다(새 버전, 상태는 초안으로 돌아갑니다).');reload();})}},'새 버전으로 저장')));
 // status workflow
 const sNote=h('input',{placeholder:'승인/전환 사유',style:'width:240px'}),tj=h('input',{type:'checkbox'});
 const tr=to=>guard(async()=>{await api('/entry/'+encodeURIComponent(id)+'/status',{body:{to,by:by(),note:sNote.value,timeJudgmentApproved:tj.checked}});banner('상태를 '+to+'(으)로 바꿨습니다.');reload();});
 root.append(h('div',{class:'card'},h('b',{},'상태 전환 · 승인'),d.approval?h('div',{class:'mut'},`승인: ${d.approval.by} · ${new Date(d.approval.at).toLocaleString()} · v${d.approval.version} · ${d.approval.note}`):'',
  h('div',{class:'row'},sNote,d.needsTimeJudgment?h('label',{},tj,' 승인된 시기 판단을 확인했습니다'):'',...['review','approved','draft','retired'].filter(s=>s!==d.status).map(s=>h('button',{class:s==='approved'?'primary':s==='retired'?'danger':'',on:{click:()=>tr(s)}},{review:'검수 요청',approved:'승인',draft:'초안으로',retired:'폐기'}[s])))));
 // versions
 const vbox=h('div',{});
 root.append(h('details',{open:d.versions.length>1},h('summary',{},`버전 이력 ${d.versions.length}개`),h('table',{},...d.versions.slice().reverse().map(v=>h('tr',{},h('td',{},'v'+v.v+(v.v===e.version?' (현재)':'')),h('td',{},new Date(v.at).toLocaleString()),h('td',{},v.by+' · '+v.kind),h('td',{class:'mut'},v.note),h('td',{},v.v!==e.version?h('span',{},h('button',{on:{click:()=>guard(async()=>{const x=await api(`/entry/${encodeURIComponent(id)}/version/${v.v}`);vbox.replaceChildren(h('div',{class:'diff text'},h('b',{},`v${v.v} → 현재 (핵심·사례)`),h('div',{},diffWords(x.snapshot.core,e.core)),h('div',{},diffWords(x.snapshot.example,e.example))));})}},'비교'),h('button',{on:{click:()=>{if(confirm(`v${v.v}로 복원합니다(새 버전이 만들어집니다).`))guard(async()=>{await api(`/entry/${encodeURIComponent(id)}/restore`,{body:{version:v.v,by:by(),note:note.value}});banner('복원했습니다.');reload();});}}},'복원')):'')))),vbox));
 // old vs new
 if(d.old.available)root.append(h('details',{},h('summary',{},`기존(현 운영 시드) 문구와 비교 — 같은 장 ${d.old.total}개 중 조건이 가까운 ${d.old.items.length}개`),...d.old.items.map(p=>h('div',{class:'card'},h('div',{class:'mut'},`${p.role} · ${p.id} · 공유 조건 필드 ${p.sharedConditionFields}개`),h('div',{class:'diff text'},diffWords(p.text,e.core))))));
 if(d.usedIn.length)root.append(h('details',{},h('summary',{},`이 문안이 표시된 추적 기록 ${d.usedIn.length}건`),h('table',{},...d.usedIn.map(u=>h('tr',{},h('td',{},new Date(u.at).toLocaleString()),h('td',{},u.label),h('td',{},'v'+u.version),h('td',{class:'mut'},u.subject))))));
 return root;
}
function traceView(t){
 return h('div',{},h('b',{},t.label+' · '+(t.mode==='approved'?'승인본':'미리보기')),h('div',{class:'mut'},`${new Date(t.at).toLocaleString()} · 대상 해시 ${t.subject} · ${t.summary?.dayPillar||''} ${t.summary?.strength||''}`),
  h('table',{},h('tr',{},...['장','결과','선택된 문안(버전·상태)','제외된 후보'].map(x=>h('th',{},x))),...t.chapters.map(c=>h('tr',{},h('td',{},c.chapter.replace('timeline_','')),h('td',{},c.coverage),h('td',{},c.picks.map(p=>`${p.id} v${p.version} ${p.status}`).join(' + ')||'-'),h('td',{class:'mut'},c.suppressed.map(s=>s.id+':'+s.reason).join(', ')||'-')))));
}
function renderSim(out,r,f){
 const s=r.summary;
 out.replaceChildren(h('div',{class:'card'},h('b',{},`${s.dayPillar}일주 · ${s.strength} · 월령 ${s.monthBranch}(${s.season}) · 용신 ${s.yongEl||'-'} · 성별 ${s.gender}`),
  h('div',{class:'mut'},`십성군: ${Object.entries(s.groups).map(([k,v])=>`${k} ${v.pct}%(${{weak:'약',mid:'중',strong:'강'}[v.level]})`).join(' · ')}`),
  h('div',{class:'mut'},`현재 대운 ${s.daewoon?`${s.daewoon.ganzhi} ${s.daewoon.start}~${s.daewoon.end}`:'-'} · 올해 세운 ${s.seun?`${s.seun.year} ${s.seun.ganzhi}`:'-'} · 추적 기록 ${r.trace}`),
  h('div',{class:'mut'},`대상 문안 ${r.report.entryCount}개 (${r.report.mode==='approved'?'승인본만':'초안 포함'}) · AI 호출 ${r.report.providerCalls}`)));
 const topics=[...new Set(r.report.chapters.map(c=>c.topicId))];
 for(const t of topics){
  const chs=r.report.chapters.filter(c=>c.topicId===t);
  out.append(h('div',{class:'card'},h('b',{},`${t} (${chs.filter(c=>c.picks.length).length}/${chs.length}개 장에 결과)`),...chs.map(c=>h('details',{},h('summary',{},`${c.chapter.replace('timeline_','')} ${c.title} — ${c.coverage==='matched'?c.picks.map(p=>p.id).join(' + '):'결과 없음(' + c.coverage + ')'}`),
   c.coverage==='matched'?h('div',{},h('div',{class:'text'},c.text),h('details',{},h('summary',{},'일치한 조건·제외된 후보'),...c.picks.map(p=>h('div',{},h('b',{},`${p.id} v${p.version} (${p.status}, 구체성 ${p.spec})`),h('table',{},...p.matched.map(m=>h('tr',{},h('td',{},m.label),h('td',{},JSON.stringify(m.want)),h('td',{},String(m.have))))))),h('div',{class:'mut'},'제외: '+(c.suppressed.map(s=>s.id+'('+s.reason+')').join(', ')||'-')))):h('div',{class:'mut'},'조건에 맞는 승인/초안 문안이 없습니다. 분량으로 채우지 않습니다.')))));
 }
 void f;
}

$('#by').value=localStorage.getItem('rb-by')||'';
$('#by').addEventListener('change',e=>localStorage.setItem('rb-by',e.target.value));
if(!TOKEN)$('#view').textContent='관리자 토큰이 없습니다. 서버 시작 시 출력된 주소(#token=…)로 접속하세요.';else go();
