// 종합풀이 20장 개편을 운영 DB에 적용한다(Supabase Management API). 사용자가 직접 실행한다. 어시스턴트는 실행하지 않는다.
//   set SUPABASE_ACCESS_TOKEN=<personal access token>   (대시보드 > Account > Access Tokens, 채팅에 붙여 넣지 않는다)
//   (심화 장 묶음은 모든 명령 뒤에 --set deep)
//   node apply-overview-runner.mjs dry         읽기 전용 점검: 모든 파일이 DRYRUN-OK 로 끝나야 한다
//   node apply-overview-runner.mjs libraries   새 챕터 14개의 라이브러리 행만 만든다(화면에는 아직 영향 없음)
//   node apply-overview-runner.mjs catalog     게시 카탈로그를 바꾼다(이 순간부터 20장 구조가 보인다). 라이브러리가 먼저 있어야 한다
//   node apply-overview-runner.mjs rollback    카탈로그를 이전 값으로 되돌린다(라이브러리 행은 두어도 무해, --libraries 를 붙이면 행도 지운다)
// 쓰기 전에는 "apply" 를 직접 입력해야 한다.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
// --set deep: 재물·커리어·인연 심화 장 9개와 주제 이름 변경(prepare-overview.mjs --set deep 로 만든 파일)
const SET=process.argv.includes('deep')?'deep':'overview';
const OUT=path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),'output',SET==='deep'?'rebuild-publication-20261026-deep':'rebuild-publication-20261026-overview');
const NEW_IDS=SET==='deep'?['wealth','career','love'].flatMap(t=>[13,14,15].map(n=>`timeline_${t}_${n}`)):Array.from({length:14},(_,i)=>'timeline_self_'+(24+i));

const REF='devkslhggrkqtianjamj',mode=process.argv.slice(2).find(a=>['dry','libraries','catalog','rollback'].includes(a)),withLib=process.argv.includes('--libraries');
if(!['dry','libraries','catalog','rollback'].includes(mode)){console.error('usage: node apply-overview-runner.mjs dry|libraries|catalog|rollback');process.exit(1);}
const token=process.env.SUPABASE_ACCESS_TOKEN;if(!token){console.error('SUPABASE_ACCESS_TOKEN is not set');process.exit(1);}
const plan=JSON.parse(fs.readFileSync(path.join(OUT,'plan.json'),'utf8'));
async function query(sql){const r=await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});return {status:r.status,text:await r.text()};}
const HASH=x=>`(select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C")) from jsonb_array_elements(${x}) p)`;
const sqlOf=(dir,name)=>fs.readFileSync(path.join(OUT,'sql',dir,name+'.sql'),'utf8');
async function libState(id){const r=await query(`select (value::jsonb->>'version')::int v, ${HASH("value::jsonb->'published'")} h from public.kv where key='ik:blocks:chapter:library.${id}'`);try{return JSON.parse(r.text)[0]||null;}catch{throw new Error('state query failed '+id+': '+r.text.slice(0,200));}}
async function confirm(msg){const rl=readline.createInterface({input:process.stdin,output:process.stdout});const a=await rl.question(msg+' type "apply" to continue: ');rl.close();return a.trim()==='apply';}

if(mode==='dry'){
 for(const id of [...NEW_IDS,'catalog']){const r=await query(sqlOf('dry',id));if(r.text.includes('DRYRUN-OK'))console.log('ok   '+id+'  '+(r.text.match(/DRYRUN-OK[^"\\]*/)||[''])[0]);else{console.error('FAIL '+id+': '+r.status+' '+r.text.slice(0,400));process.exit(1);}}
 process.exit(0);
}
if(mode==='libraries'){
 const todo=[];for(const id of NEW_IDS){const s=await libState(id),p=plan.find(x=>x.chapter===id);if(s&&s.h===p.newHash){console.log('skip '+id+': already created');continue;}if(s){console.error('STOP '+id+': a library row already exists with different text');process.exit(1);}todo.push(id);}
 if(!todo.length)process.exit(0);if(!await confirm('CREATE '+todo.length+' library rows in production?')){console.log('cancelled');process.exit(0);}
 for(const id of todo){const r=await query(sqlOf('apply',id));if(r.status>=300){console.error('FAIL '+id+': '+r.text.slice(0,400));process.exit(1);}const s=await libState(id),p=plan.find(x=>x.chapter===id);console.log((s&&s.h===p.newHash?'created ':'MISMATCH ')+id+(s?' v'+s.v:''));if(!s||s.h!==p.newHash)process.exit(1);}
 process.exit(0);
}
if(mode==='catalog'){
 for(const id of NEW_IDS){const s=await libState(id),p=plan.find(x=>x.chapter===id);if(!s||s.h!==p.newHash){console.error('STOP: run "libraries" first ('+id+' missing or different)');process.exit(1);}}
 if(!await confirm('CHANGE the published catalog (20-chapter 종합풀이 goes live)?')){console.log('cancelled');process.exit(0);}
 const r=await query(sqlOf('apply','catalog'));if(r.status>=300){console.error('FAIL catalog: '+r.text.slice(0,400));process.exit(1);}
 const c=await query(`select value::jsonb->>'version' v, jsonb_array_length(value::jsonb->'chapters') n, (select count(*) from jsonb_array_elements(value::jsonb->'chapters') c where c->>'topicId'='self' and c->>'state'='active') self_active from public.kv where key='ik:editorial:published'`);console.log('catalog now: '+c.text);process.exit(0);
}
if(mode==='rollback'){
 if(!await confirm('ROLL BACK the published catalog'+(withLib?' and delete the 14 library rows':'')+'?'))process.exit(0);
 const r=await query(sqlOf('rollback','catalog'));if(r.status>=300){console.error('FAIL catalog rollback: '+r.text.slice(0,400));process.exit(1);}console.log('catalog restored');
 if(withLib)for(const id of NEW_IDS){const x=await query(sqlOf('rollback',id));console.log((x.status<300?'deleted ':'FAIL ')+id+(x.status<300?'':' '+x.text.slice(0,200)));}
}
