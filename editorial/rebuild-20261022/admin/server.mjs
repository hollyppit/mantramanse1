// Local rebuild admin server. Binds to 127.0.0.1, requires a per-start token, never talks to production, and cannot publish.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bundles} from '../index.mjs';
import {createStore,AdminError,sha} from './store.mjs';
import {checkEntry,findDuplicates,auditDeclaredConflicts,TEXT_FIELDS} from './checks.mjs';
import {loadEngine,buildSd,chartSummary,runReport,explainEntry,createTraceLog,scanConflicts,SimError} from './sim.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),PUBLIC=path.join(here,'public');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const TOPIC_TITLES={self:'종합풀이',wealth:'재물운',career:'커리어운',love:'인연운',health:'건강 및 사고수',creative:'전생 체험',remedy:'개운법'};

export function loadBaseEntries(){
 const out=[];for(const [bundle,list] of Object.entries(bundles)){if(bundle==='pilot')continue;for(const e of list)out.push({...e,bundle});}
 return out;
}
export function createAdmin({root,dataDir,outputDir,token=crypto.randomBytes(16).toString('hex'),baseEntries}={}){
 const eng=loadEngine(root),cat=eng.MantraEditorial.defaults();
 const chapters=cat.chapters.map(c=>({id:c.id,topicId:c.topicId,title:c.title,order:c.order,requiredEvidence:c.requiredEvidence||[]})).sort((a,b)=>a.id<b.id?-1:1);
 const entries=baseEntries||loadBaseEntries();
 const store=createStore({baseEntries:entries,chapters,dataDir,outputDir}),traces=createTraceLog(dataDir);
 const caches={checks:null,dups:null,conflicts:null};
 const hashAll=()=>sha(store.all().map(e=>[e.id,e.version,e.adminStatus]));
 const chapterMeta=id=>chapters.find(c=>c.id===id);
 const light=e=>({id:e.id,chapter:e.chapters[0],bundle:entries.find(x=>x.id===e.id)?.bundle,status:store.statusOf(e.id),version:e.version,core:e.core.slice(0,90),when:e.when,priority:e.priority,storyKey:e.storyKey||null});
 const condMatch=(e,field,val)=>{const w=e.when?.[field];if(w===undefined)return false;if(val===''||val===undefined)return true;if(Array.isArray(w))return w.includes(val);if(w&&typeof w==='object')return Object.entries(w).some(([k,v])=>`${k}:${v}`===val||k===val);return false;};
 const runChecks=()=>{const key=hashAll();if(caches.checks?.key===key)return caches.checks.value;
  const all=store.all(),conflictsBy=new Map();
  const res=all.map(e=>checkEntry(e,{...store.checkContext(e),conflictCount:conflictsBy.get(e.id)||0}));
  const value={total:all.length,pass:res.filter(r=>r.pass).length,fail:res.filter(r=>!r.pass).length,results:res};caches.checks={key,value};return value;};
 const sendJson=(res,status,body)=>{const s=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(s);};
 const readBody=req=>new Promise((resolve,reject)=>{let n=0;const ch=[];req.on('data',c=>{n+=c.length;if(n>2_000_000){reject(new AdminError('too-large','요청이 너무 큽니다.',413));req.destroy();}else ch.push(c);}).on('end',()=>{try{resolve(ch.length?JSON.parse(Buffer.concat(ch).toString('utf8')):{});}catch{reject(new AdminError('bad-json','JSON을 해석할 수 없습니다.'));}}).on('error',reject);});
 const tokenOk=req=>{const t=String(req.headers['x-admin-token']||'');return t.length===token.length&&crypto.timingSafeEqual(Buffer.from(t),Buffer.from(token));};
 const hostOk=req=>/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(String(req.headers.host||''));

 const routes=[];
 const route=(method,pattern,handler)=>routes.push({method,re:new RegExp('^'+pattern.replace(/:[a-zA-Z]+/g,'([^/]+)')+'$'),handler});
 route('GET','/api/meta',async()=>({counts:store.counts(),entries:store.ids().length,chapters:chapters.length,topics:Object.entries(TOPIC_TITLES).map(([id,title])=>({id,title,chapters:chapters.filter(c=>c.topicId===id).length})),
  tools:{publishToProduction:false,note:'이 도구는 로컬 초안 관리 전용이며 운영 DB에 게시하지 않습니다.'},stateFile:path.relative(root,store.stateFile)}));
 route('GET','/api/chapters',async()=>chapters.map(c=>{const list=store.all().filter(e=>e.chapters[0]===c.id),st={draft:0,review:0,approved:0,retired:0};list.forEach(e=>st[store.statusOf(e.id)]++);return {...c,topicTitle:TOPIC_TITLES[c.topicId],entries:list.length,status:st,needsTimeJudgment:store.needsTime(c.id)};}));
 route('GET','/api/entries',async(req,q)=>{
  let list=store.all();const ch=q.get('chapter'),topic=q.get('topic'),st=q.get('status'),text=q.get('q'),cf=q.get('cond'),cv=q.get('value'),bundle=q.get('bundle');
  if(ch)list=list.filter(e=>e.chapters[0]===ch);
  if(topic)list=list.filter(e=>chapterMeta(e.chapters[0])?.topicId===topic);
  if(st)list=list.filter(e=>store.statusOf(e.id)===st);
  if(bundle)list=list.filter(e=>entries.find(x=>x.id===e.id)?.bundle===bundle);
  if(text){const t=text.toLowerCase();list=list.filter(e=>[e.id,e.core,e.example,e.positive,e.negative,e.advice,e.basis].join(' ').toLowerCase().includes(t));}
  if(cf)list=list.filter(e=>condMatch(e,cf,cv));
  const total=list.length,limit=Math.min(Number(q.get('limit')||200),500),offset=Number(q.get('offset')||0);
  return {total,items:list.slice(offset,offset+limit).map(light)};
 });
 route('GET','/api/cond-fields',async()=>{const m={};for(const e of store.all())for(const [k,v] of Object.entries(e.when||{})){const s=m[k]||(m[k]=new Set());if(Array.isArray(v))v.forEach(x=>s.add(x));else Object.entries(v).forEach(([a,b])=>s.add(`${a}:${b}`));}return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,[...v].sort()]));});
 route('GET','/api/entry/:id',async(req,q,[id])=>{
  const e=store.get(id),r=store.record(id),chk=checkEntry(e,store.checkContext(e)),b=store.base(id),old=oldPassages(e.chapters[0],e);
  return {entry:e,status:r.status,approval:r.approval,versions:r.versions.map(v=>({v:v.v,at:v.at,by:v.by,kind:v.kind,note:v.note,hash:v.hash})),checks:chk,needsTimeJudgment:store.needsTime(e.chapters[0]),
   chapter:chapterMeta(e.chapters[0]),old,usedIn:traces.usage(id),baseHash:sha(b.core)};
 });
 route('GET','/api/entry/:id/version/:v',async(req,q,[id,v])=>{const r=store.record(id),x=r.versions.find(z=>z.v===Number(v));if(!x)throw new AdminError('version-not-found','버전을 찾을 수 없습니다.',404);return x;});
 route('POST','/api/entry/:id/save',async(req,q,[id],body)=>({entry:store.save(id,body.fields,{by:body.by,note:body.note})}));
 route('POST','/api/entry/:id/restore',async(req,q,[id],body)=>({entry:store.restore(id,body.version,{by:body.by,note:body.note})}));
 route('POST','/api/entry/:id/status',async(req,q,[id],body)=>({entry:store.setStatus(id,body.to,{by:body.by,note:body.note,timeJudgmentApproved:body.timeJudgmentApproved})}));
 route('POST','/api/bulk/replace',async(req,q,_,body)=>store.bulkReplace({find:body.find,replace:body.replace,fields:body.fields,chapterIds:body.chapters,preview:body.preview!==false,by:body.by,note:body.note}));
 route('GET','/api/checks',async(req,q)=>{
  const v=runChecks(),ch=q.get('chapter'),only=q.get('only');let rs=v.results;if(ch)rs=rs.filter(r=>r.chapter===ch);if(only==='fail')rs=rs.filter(r=>!r.pass);
  const codes={};v.results.forEach(r=>[...r.hard,...r.soft].forEach(h=>codes[h.code]=(codes[h.code]||0)+1));
  const avg={};for(const k of Object.keys(v.results[0].scores))avg[k]=+(v.results.reduce((n,r)=>n+r.scores[k],0)/v.results.length).toFixed(2);
  return {total:v.total,pass:v.pass,fail:v.fail,codes,averageScores:avg,scoresNote:'점수는 문안 품질 지표이며 운세 예측의 정확도를 뜻하지 않습니다. 명리 조건 오류는 문체 점수와 무관하게 불합격입니다.',results:rs.slice(0,Number(q.get('limit')||300)).map(r=>({id:r.id,chapter:r.chapter,pass:r.pass,total:r.total,scores:r.scores,hard:r.hard,soft:r.soft}))};
 });
 route('GET','/api/duplicates',async(req,q)=>{const th=Number(q.get('threshold')||0.6),key=hashAll()+th;if(caches.dups?.key!==key)caches.dups={key,value:findDuplicates(store.all(),{threshold:th,crossThreshold:Math.max(th-0.1,0.4)})};return caches.dups.value;});
 route('GET','/api/conflicts',async(req,q)=>{const declared=auditDeclaredConflicts(store.all());if(q.get('scan')==='1'){const n=Math.min(Number(q.get('charts')||60),300),key=hashAll()+n;if(caches.conflicts?.key!==key)caches.conflicts={key,value:scanConflicts(root,store,{charts:n})};return {declaredIssues:declared,scan:caches.conflicts.value};}return {declaredIssues:declared,scan:caches.conflicts?.value||null};});
 route('POST','/api/simulate',async(req,q,_,body)=>{
  const mode=body.mode==='approved'?'approved':'preview',{sd,params}=buildSd(root,body.birth,body.asOf),summary=chartSummary(sd),report=runReport(store,sd,{mode,chapters:body.chapters});
  const trace=traces.add({label:body.label||'수동 시뮬레이션',birth:params,asOf:body.asOf,mode,report,summary,storeBirth:!!body.storeBirth,by:body.by});
  return {trace:trace.id,summary,report};
 });
 route('POST','/api/explain',async(req,q,_,body)=>{const {sd}=buildSd(root,body.birth,body.asOf);return explainEntry(store,sd,body.id,{mode:body.mode});});
 route('GET','/api/traces',async()=>traces.list());
 route('GET','/api/trace/:id',async(req,q,[id])=>{const t=traces.get(id);if(!t)throw new AdminError('trace-not-found','추적 기록을 찾을 수 없습니다.',404);return t;});
 route('GET','/api/releases',async()=>({releases:store.releases(),approved:store.counts().approved}));
 route('POST','/api/release',async(req,q,_,body)=>store.createRelease({by:body.by,note:body.note}));
 route('POST','/api/release/:id/restore',async(req,q,[id],body)=>store.restoreRelease(id,{by:body.by}));
 route('POST','/api/publish',async()=>{throw new AdminError('publish-disabled','운영 게시는 이 도구에서 지원하지 않습니다. 릴리스 후보 파일을 만든 뒤 별도의 승인·지문 확인·롤백 SQL 절차로만 게시할 수 있습니다.',403);});
 route('GET','/api/audit',async()=>store.audit(200));

 // old (currently deployed seed) passages for comparison: loaded lazily from the local audit file
 let oldIndex=null;
 function oldPassages(chapterId,e){
  if(!oldIndex){const f=path.join(root,'output/rebuild-20261022/audit.json');oldIndex=new Map();if(fs.existsSync(f)){try{const a=JSON.parse(fs.readFileSync(f,'utf8'));for(const c of a.chapters)oldIndex.set(c.id,c.passages||[]);}catch{}}}
  const list=oldIndex.get(chapterId)||[];if(!list.length)return {available:false,items:[]};
  const keys=Object.keys(e.when||{});
  const scored=list.map(p=>({p,s:keys.filter(k=>p.when&&p.when[k]!==undefined).length})).sort((a,b)=>b.s-a.s||(b.p.text.length-a.p.text.length));
  return {available:true,total:list.length,items:scored.slice(0,5).map(x=>({id:x.p.id,role:x.p.role,when:x.p.when,text:x.p.text,sharedConditionFields:x.s}))};
 }

 const server=http.createServer(async(req,res)=>{
  try{
   if(!hostOk(req)){res.writeHead(403);return res.end('forbidden host');}
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname.startsWith('/api/')){
    if(!tokenOk(req))return sendJson(res,401,{error:'unauthorized',message:'관리자 토큰이 필요합니다.'});
    for(const r of routes){if(r.method!==req.method)continue;const m=r.re.exec(url.pathname);if(!m)continue;
     const body=req.method==='POST'?await readBody(req):null;
     return sendJson(res,200,await r.handler(req,url.searchParams,m.slice(1).map(decodeURIComponent),body));}
    return sendJson(res,404,{error:'not-found'});
   }
   const rel=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');
   const f=path.join(PUBLIC,rel);
   if(!f.startsWith(PUBLIC)||!fs.existsSync(f)||!MIME[path.extname(f)]){res.writeHead(404);return res.end('not found');}
   res.writeHead(200,{'content-type':MIME[path.extname(f)],'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:"});
   res.end(fs.readFileSync(f));
  }catch(e){
   const status=e instanceof AdminError||e instanceof SimError?e.status:500;
   if(status===500)console.error(e);
   sendJson(res,status,{error:e.code||'error',message:status===500?'서버 오류가 발생했습니다.':e.message,detail:e.extra||null});
  }
 });
 return {server,store,token,traces,listen:(port=0)=>new Promise(r=>server.listen(port,'127.0.0.1',()=>r(server.address().port))),close:()=>new Promise(r=>server.close(r))};
}
