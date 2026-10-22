// Offline-only editorial candidate: no DB, provider, deployment or publication access.
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const OUT='output/life-action-candidate-20261022',BASE='output/overhaul-review-20261021/candidate.json';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 const {ACTIONS,EDITION}=await import('../editorial/life-action-candidate.js'),{Editorial}=await import('../functions/_editorial.js'),L=await import('../functions/_reviewed-library.js'),{samples}=await import('../workers/production-monitor-fixtures.js');
 const baseline=JSON.parse(fs.readFileSync(BASE,'utf8')),chapters=Editorial.defaults().chapters;
 const candidate={edition:EDITION,seedVersion:baseline.seedVersion,approval:'pending-admin-review',baseline:{file:BASE,sha256:crypto.createHash('sha256').update(fs.readFileSync(BASE)).digest('hex'),liveDatabaseRefreshed:false},chapters:structuredClone(baseline.chapters)},changes=[],comparisons=[];
 let network=0;const original=global.fetch;global.fetch=async()=>{network++;throw Error('network-forbidden');};
 try{for(const c of chapters){const n=Number(c.id.split('_').at(-1))-1,action=ACTIONS[c.topicId]?.[n];assert(action&&action.length>=50,c.id+' missing chapter-specific action');
  const before=baseline.chapters[c.id],after=candidate.chapters[c.id];assert(before&&after,c.id+' missing approved baseline');
  for(let i=0;i<after.length;i++){const p=after[i];if(p.role!=='practice')continue;
   // Retain the authored condition-dependent advice, then add an observable task.
   p.text=p.text+'\n\n'+action;assert(p.text.length<=1000,p.id+' exceeds stored text limit');
   changes.push({chapter:c.id,id:p.id,role:p.role,from:before[i].text,to:p.text,addedAction:action,when:p.when,unless:p.unless,reason:'chapter-specific task and review criterion; original conditional guidance retained'});
  }
  assert.deepEqual(L.validatePassages(after,c,[]),[],c.id+' passage validation');
  for(let i=0;i<after.length;i++){const {text:a,...ma}=after[i],{text:b,...mb}=before[i];assert.deepEqual(ma,mb,'condition/priority/evidence changed '+after[i].id);}
  for(const [i,sd]of samples.entries()){
   const render=ps=>L.composeReviewed({clean:{sd,chapter:{paragraphs:L.ROLES.map((role,n)=>({id:String(n),role}))}},contract:c,analysis:{claims:[]},library:{version:0,published:ps}}),a=render(before),b=render(after);
   assert.equal(b.result.paragraphs.length,8,c.id);assert.equal(b.pending.length,0,c.id+' pending');
   const practice=b.result.paragraphs.find(p=>p.role==='practice');assert(practice.text.includes(action.split(/(?<=。|\.)\s/)[0]),c.id+' selected practice missing action');
   for(const p of b.result.paragraphs){assert(p.text.length<=1200,c.id+' client text limit');assert(!/〔[^〕]+〕/.test(p.text),c.id+' unresolved flow token');}
   for(const p of a.result.paragraphs.filter(p=>p.role!=='practice'))assert.equal(b.result.paragraphs.find(q=>q.role===p.role).text,p.text,c.id+' unrelated role changed');
   comparisons.push({chapter:c.id,title:c.title,topic:c.topicId,sample:i,hourUnknown:!!sd.reviewConditions?.hourUnknown,before:a.result.paragraphs,after:b.result.paragraphs});
  }
 }}finally{global.fetch=original;}
 assert.equal(new Set(changes.map(c=>c.chapter)).size,84);assert.equal(new Set(Object.values(ACTIONS).flat()).size,84);assert.equal(network,0);
 fs.mkdirSync(OUT,{recursive:true});const summary={edition:EDITION,approval:'pending-admin-review',chapters:84,distinctActions:84,changedPassages:changes.length,renderedComparisons:comparisons.length,paragraphsChecked:comparisons.length*8,conditionsChanged:0,otherRolesChanged:0,networkCalls:network,providerCalls:0,databaseWrites:0,publication:false,notes:['Actions are optional examples, not confirmed personal events or predictions.','No external expert approval claimed.','Baseline is the saved approved edition, not a fresh operational DB dump.']};
 for(const [name,data]of Object.entries({'candidate.json':candidate,'changes.json':changes,'comparisons.json':comparisons,'summary.json':summary}))fs.writeFileSync(OUT+'/'+name,JSON.stringify(data,null,2));
 let html='<!doctype html><html lang="ko"><meta charset="utf-8"><title>무빙툰 실행안 고도화 후보</title><style>body{font:16px/1.75 system-ui;margin:32px auto;max-width:1200px;padding:0 24px;color:#25323e}details{border:1px solid #cbd5df;border-radius:8px;padding:14px;margin:16px 0}summary{cursor:pointer;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}p{white-space:pre-wrap}pre{white-space:pre-wrap}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style><h1>무빙툰 84챕터 · 행동 제안 고도화 후보</h1><p>관리자 미승인. 운영 게시본과 계산·조건은 변경하지 않았습니다. 아래 비교는 저장된 승인판과 신규 후보를 실제 조합 엔진으로 렌더링한 결과입니다. 현재 DB를 새로 덤프한 비교는 아닙니다.</p><pre>'+esc(JSON.stringify(summary,null,2))+'</pre>';
 for(const c of chapters){html+='<details><summary>'+esc(c.title+' · '+c.id)+'</summary>';const action=ACTIONS[c.topicId][Number(c.id.split('_').at(-1))-1];html+='<h2>새 실행안</h2><p>'+esc(action)+'</p>';for(const row of comparisons.filter(r=>r.chapter===c.id)){html+='<details><summary>명조 '+(row.sample+1)+(row.hourUnknown?' · 시각 미상':'')+'</summary><div class="grid"><div><h3>승인판 행동 제안</h3><p>'+esc(row.before.find(p=>p.role==='practice').text)+'</p></div><div><h3>후보 행동 제안</h3><p>'+esc(row.after.find(p=>p.role==='practice').text)+'</p></div></div><details><summary>후보 전체 8문단</summary>'+row.after.map(p=>'<h3>'+esc(p.role)+'</h3><p>'+esc(p.text)+'</p>').join('')+'</details></details>';}html+='</details>';}
 fs.writeFileSync(OUT+'/review.html',html+'</html>');console.log(JSON.stringify(summary));
})().catch(e=>{console.error(e);process.exitCode=1;});
