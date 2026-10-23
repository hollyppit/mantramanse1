// Local, file-backed store for the rebuild admin: edits, versions, approvals, releases and an audit log.
// Nothing here talks to the production database. State lives in <dataDir>/state.json (atomic writes). Release candidates are exported to <outputDir> only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {cleanConds} from '../../../functions/_ik.js';
import {validateEntry} from '../engine.mjs';
import {checkEntry} from './checks.mjs';

export const STATUSES=['draft','review','approved','retired'];
const TEXT=['core','basis','example','positive','negative','advice','timing'];
const APPS=['employee','business','freelance'];
export const sha=(x,n=16)=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex').slice(0,n);
const snapOf=e=>({core:e.core,basis:e.basis,example:e.example,positive:e.positive,negative:e.negative,advice:e.advice,timing:e.timing,priority:e.priority,
 when:structuredClone(e.when||{}),unless:structuredClone(e.unless||{}),conflicts:[...(e.conflicts||[])],applications:{...e.applications}});
const nowIso=()=>new Date().toISOString();
const sortKeys=o=>Array.isArray(o)?o.map(sortKeys):o&&typeof o==='object'?Object.fromEntries(Object.keys(o).sort().map(k=>[k,sortKeys(o[k])])):o;

export class AdminError extends Error{constructor(code,msg,status=400,extra){super(msg);this.code=code;this.status=status;this.extra=extra;}}

export function createStore({baseEntries,chapters,dataDir,outputDir,now=nowIso}){
 fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(outputDir,{recursive:true});
 const file=path.join(dataDir,'state.json'),base=new Map(baseEntries.map(e=>[e.id,e])),chapterById=new Map(chapters.map(c=>[c.id,c]));
 let state={schema:1,entries:{},releases:[],audit:[]};
 if(fs.existsSync(file)){try{state=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw new AdminError('state-corrupt','state.json을 읽을 수 없습니다. 백업을 확인하세요.',500);}}
 const persist=()=>{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state));fs.renameSync(tmp,file);};
 const log=(action,by,id,detail)=>{state.audit.push({at:now(),by:by||'unknown',action,id:id||null,detail:detail||null});if(state.audit.length>5000)state.audit.splice(0,state.audit.length-5000);};
 const rec=id=>state.entries[id]||(state.entries[id]={status:'draft',version:1,versions:[],approval:null});
 const requireBase=id=>{const b=base.get(id);if(!b)throw new AdminError('not-found','존재하지 않는 문안입니다: '+id,404);return b;};
 const ensureBaseVersion=id=>{const r=rec(id);if(!r.versions.length){const b=requireBase(id);r.versions.push({v:1,at:now(),by:'system',kind:'base',note:'초기 초안',snapshot:snapOf(b),hash:sha(snapOf(b))});r.version=1;}return r;};
 const effective=(id,{review=false}={})=>{
  const b=requireBase(id),r=state.entries[id];
  if(!r||!r.versions.length)return {...structuredClone(b),status:'draft',version:1,adminStatus:'draft'};
  const cur=r.versions.find(x=>x.v===r.version)||r.versions[r.versions.length-1];
  const e={...structuredClone(b),...structuredClone(cur.snapshot),applications:{...cur.snapshot.applications},status:'draft',version:cur.v,adminStatus:r.status};
  if(review&&r.status==='approved'){e.status='reviewed';e.review={reviewer:r.approval?.by||'admin',at:r.approval?.at||now(),source:'admin-approval',scenarios:'admin-checks'};}
  return e;
 };
 const ctxFor=e=>{const ch=chapterById.get(e.chapters[0])||{};return {topicId:ch.topicId,needsTimeJudgment:needsTime(ch)};};
 const needsTime=ch=>(ch.requiredEvidence||[]).some(x=>/승인 판단|시기 조건이 충족된/.test(x));
 const normalizeFields=(id,f)=>{
  const cur=effective(id),next=snapOf(cur);
  for(const k of TEXT){if(f[k]!==undefined){if(typeof f[k]!=='string'||f[k].length>3000)throw new AdminError('bad-field',`${k}는 3,000자 이하 문자열이어야 합니다.`);next[k]=f[k].trim();}}
  if(f.applications){for(const k of APPS)if(f.applications[k]!==undefined){if(typeof f.applications[k]!=='string'||f.applications[k].length>600)throw new AdminError('bad-field',`applications.${k}는 600자 이하여야 합니다.`);next.applications[k]=f.applications[k].trim();}}
  if(f.priority!==undefined){const p=Number(f.priority);if(!Number.isInteger(p)||p<0||p>200)throw new AdminError('bad-field','priority는 0~200 정수여야 합니다.');next.priority=p;}
  for(const k of ['when','unless']){if(f[k]!==undefined){if(!f[k]||typeof f[k]!=='object'||Array.isArray(f[k]))throw new AdminError('bad-condition',`${k}는 객체여야 합니다.`);const c=cleanConds(f[k]);if(JSON.stringify(sortKeys(c))!==JSON.stringify(sortKeys(f[k])))throw new AdminError('bad-condition',`${k}에 지원하지 않는 조건 필드나 값이 있습니다.`);next[k]=c;}}
  if(f.conflicts!==undefined){if(!Array.isArray(f.conflicts)||f.conflicts.some(x=>typeof x!=='string'||!base.has(x)||x===id))throw new AdminError('bad-field','conflicts는 존재하는 다른 문안 id 배열이어야 합니다.');next.conflicts=[...new Set(f.conflicts)];}
  return next;
 };
 const validateNext=(id,snap)=>{
  const e={...structuredClone(requireBase(id)),...structuredClone(snap),applications:{...snap.applications},status:'draft'};
  const issues=validateEntry(e);
  return {entry:e,issues};
 };
 const addVersion=(id,snap,{by,note,kind})=>{
  const r=ensureBaseVersion(id),v=Math.max(...r.versions.map(x=>x.v))+1;
  r.versions.push({v,at:now(),by:by||'unknown',kind,note:note||'',snapshot:snap,hash:sha(snap)});r.version=v;
  if(r.status==='approved'||r.status==='review'){log('approval-invalidated',by,id,{from:r.status,reason:'content changed'});}
  r.status='draft';r.approval=null;return r;
 };
 const api={
  chapters:()=>chapters,
  base:id=>requireBase(id),
  ids:()=>[...base.keys()],
  get:(id,opts)=>effective(id,opts),
  record:id=>{requireBase(id);const r=state.entries[id];return r?structuredClone(r):{status:'draft',version:1,versions:[],approval:null};},
  all:(opts)=>[...base.keys()].map(id=>effective(id,opts)),
  statusOf:id=>(state.entries[id]?.status)||'draft',
  needsTime:chapterId=>needsTime(chapterById.get(chapterId)||{}),
  save(id,fields,{by,note}={}){
   requireBase(id);if(!by)throw new AdminError('by-required','수정자 이름(by)이 필요합니다.');
   const next=normalizeFields(id,fields||{}),{issues}=validateNext(id,next);
   if(issues.length)throw new AdminError('invalid-entry','문안 계약을 만족하지 않아 저장하지 않았습니다: '+issues.join(', '),422,{issues});
   const cur=snapOf(effective(id));
   if(sha(cur)===sha(next))throw new AdminError('no-change','변경 사항이 없습니다.',409);
   const r=addVersion(id,next,{by,note,kind:'edit'});log('save',by,id,{version:r.version,note});persist();return effective(id);
  },
  restore(id,version,{by,note}={}){
   requireBase(id);if(!by)throw new AdminError('by-required','복원자 이름(by)이 필요합니다.');
   const r=ensureBaseVersion(id),src=r.versions.find(x=>x.v===Number(version));
   if(!src)throw new AdminError('version-not-found','복원할 버전이 없습니다.',404);
   const snap=structuredClone(src.snapshot),{issues}=validateNext(id,snap);
   if(issues.length)throw new AdminError('invalid-entry','복원할 버전이 현재 문안 계약을 만족하지 않습니다: '+issues.join(', '),422);
   const rr=addVersion(id,snap,{by,note:note||`v${src.v} 복원`,kind:'restore'});log('restore',by,id,{from:src.v,version:rr.version});persist();return effective(id);
  },
  setStatus(id,to,{by,note,timeJudgmentApproved=false}={}){
   requireBase(id);if(!by)throw new AdminError('by-required','처리자 이름(by)이 필요합니다.');
   if(!STATUSES.includes(to))throw new AdminError('bad-status','알 수 없는 상태입니다.');
   const r=ensureBaseVersion(id),from=r.status,e=effective(id),ctx=ctxFor(e);
   const allowed={draft:['review','retired'],review:['approved','draft','retired'],approved:['draft','retired'],retired:['draft']};
   if(!(allowed[from]||[]).includes(to))throw new AdminError('bad-transition',`${from} → ${to} 전환은 허용되지 않습니다.`,409);
   if(to==='review'||to==='approved'){
    const chk=checkEntry(e,ctx);
    if(!chk.pass)throw new AdminError('checks-failed','자동 검사 불합격 항목이 있어 진행할 수 없습니다.',422,{hard:chk.hard});
    if(to==='approved'){
     if(!note||note.trim().length<5)throw new AdminError('note-required','승인 사유(5자 이상)를 입력하세요.');
     if(ctx.needsTimeJudgment&&!timeJudgmentApproved)throw new AdminError('time-judgment-required','대운·세운을 쓰는 장입니다. "승인된 시기 판단"을 확인했다고 표시해야 승인할 수 있습니다.',422);
     r.approval={by,at:now(),note:note.trim(),version:r.version,hash:sha(snapOf(e)),timeJudgmentApproved:!!timeJudgmentApproved};
    }
   }
   if(to!=='approved')r.approval=null;
   r.status=to;log('status',by,id,{from,to,note:note||''});persist();return effective(id);
  },
  bulkReplace({find,replace,fields,chapterIds,preview=true,by,note,limit=200}){
   if(typeof find!=='string'||find.length<2)throw new AdminError('bad-field','찾을 문구는 2자 이상이어야 합니다.');
   if(typeof replace!=='string')throw new AdminError('bad-field','바꿀 문구가 필요합니다.');
   const fs_=(fields&&fields.length?fields:TEXT.slice(0,6)).filter(f=>TEXT.includes(f)||f.startsWith('applications.'));
   const hits=[];
   for(const id of base.keys()){
    const e=effective(id);if(chapterIds&&chapterIds.length&&!chapterIds.includes(e.chapters[0]))continue;
    if(state.entries[id]?.status==='retired')continue;
    const patch={};let changed=false;const detail=[];
    for(const f of fs_){
     if(f.startsWith('applications.')){const k=f.split('.')[1];const v=e.applications[k]||'';if(v.includes(find)){patch.applications={...(patch.applications||{}),[k]:v.split(find).join(replace)};changed=true;detail.push({field:f,count:v.split(find).length-1});}}
     else{const v=e[f]||'';if(v.includes(find)){patch[f]=v.split(find).join(replace);changed=true;detail.push({field:f,count:v.split(find).length-1});}}
    }
    if(changed)hits.push({id,patch,detail,before:fs_.map(f=>f.startsWith('applications.')?(e.applications[f.split('.')[1]]||''):(e[f]||'')).find(x=>x.includes(find))});
   }
   if(preview)return {preview:true,count:hits.length,hits:hits.slice(0,100).map(h=>({id:h.id,detail:h.detail,sample:(h.before||'').slice(0,160)}))};
   if(!by)throw new AdminError('by-required','실행자 이름(by)이 필요합니다.');
   if(hits.length>limit)throw new AdminError('too-many','영향 문안이 '+hits.length+'개로 한도('+limit+')를 넘습니다. 장을 나누어 실행하세요.',422);
   const applied=[],failed=[];
   for(const h of hits){
    try{const next=normalizeFields(h.id,h.patch),{issues}=validateNext(h.id,next);if(issues.length){failed.push({id:h.id,issues});continue;}
     addVersion(h.id,next,{by,note:note||`일괄 교체: ${find} → ${replace}`,kind:'bulk'});applied.push(h.id);}
    catch(e){failed.push({id:h.id,error:e.message});}
   }
   log('bulk-replace',by,null,{find,replace,fields:fs_,applied:applied.length,failed:failed.length,note});persist();
   return {preview:false,applied:applied.length,failed};
  },
  releases:()=>state.releases.map(r=>({id:r.id,at:r.at,by:r.by,note:r.note,count:r.count,manifestHash:r.manifestHash,file:r.file})),
  createRelease({by,note}={}){
   if(!by)throw new AdminError('by-required','릴리스 작성자 이름(by)이 필요합니다.');
   if(!note||note.trim().length<5)throw new AdminError('note-required','릴리스 설명(5자 이상)이 필요합니다.');
   const approved=[...base.keys()].filter(id=>state.entries[id]?.status==='approved');
   if(!approved.length)throw new AdminError('nothing-approved','승인된 문안이 없습니다.',409);
   const items={};for(const id of approved){const e=effective(id),chk=checkEntry(e,ctxFor(e));if(!chk.pass)throw new AdminError('checks-failed','승인된 문안 중 현재 검사에 실패한 항목이 있습니다: '+id,422,{id,hard:chk.hard});items[id]={version:e.version,hash:sha(snapOf(e)),snapshot:snapOf(e),approval:state.entries[id].approval};}
   const id='rc-'+now().replace(/[-:TZ.]/g,'').slice(0,14)+'-'+sha(Object.keys(items),4),manifestHash=sha(Object.fromEntries(Object.entries(items).map(([k,v])=>[k,v.hash])));
   const out={id,at:now(),by,note:note.trim(),count:approved.length,manifestHash,localOnly:true,publishedToProduction:false,entries:items};
   const fname=path.join(outputDir,id+'.json');fs.writeFileSync(fname,JSON.stringify(out,null,1));
   state.releases.push({id,at:out.at,by,note:out.note,count:out.count,manifestHash,file:fname,versions:Object.fromEntries(Object.entries(items).map(([k,v])=>[k,v.version]))});
   log('release',by,null,{id,count:out.count,manifestHash});persist();return {id,count:out.count,manifestHash,file:fname};
  },
  restoreRelease(releaseId,{by}={}){
   if(!by)throw new AdminError('by-required','복원자 이름(by)이 필요합니다.');
   const rel=state.releases.find(r=>r.id===releaseId);if(!rel)throw new AdminError('release-not-found','릴리스를 찾을 수 없습니다.',404);
   const data=JSON.parse(fs.readFileSync(rel.file,'utf8')),changed=[],reset=[];
   for(const [id,it] of Object.entries(data.entries)){
    if(!base.has(id))continue;
    const cur=effective(id);
    if(sha(snapOf(cur))!==it.hash){addVersion(id,structuredClone(it.snapshot),{by,note:`릴리스 ${releaseId} 복원`,kind:'restore'});changed.push(id);}
    const r=ensureBaseVersion(id);r.status='approved';r.approval={...(it.approval||{}),restoredFrom:releaseId,restoredBy:by,restoredAt:now()};
   }
   for(const id of base.keys()){if(!data.entries[id]&&state.entries[id]?.status==='approved'){state.entries[id].status='draft';state.entries[id].approval=null;reset.push(id);}}
   log('release-restore',by,null,{releaseId,restored:Object.keys(data.entries).length,contentRestored:changed.length,approvalsReset:reset.length});persist();
   return {releaseId,approved:Object.keys(data.entries).length,contentRestored:changed.length,approvalsReset:reset.length};
  },
  audit:(limit=200)=>state.audit.slice(-limit).reverse(),
  counts:()=>{const c={draft:0,review:0,approved:0,retired:0};for(const id of base.keys())c[(state.entries[id]?.status)||'draft']++;return c;},
  checkContext:ctxFor,
  stateFile:file,
 };
 return api;
}
