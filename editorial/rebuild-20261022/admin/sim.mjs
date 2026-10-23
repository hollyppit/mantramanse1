// Chart simulation, per-user selection tracing and the co-display conflict scan for the rebuild admin.
// Runs the real calculation engine locally (engine.js + report/v2/saju-data.js); no network, no AI, no database.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {deriveFacts,evalConds} from '../../../functions/_ik.js';
import {composeReport,composeChapter,luckVars} from '../compose.mjs';
import {simulate} from '../engine.mjs';
import {antonymHit} from './checks.mjs';
import {sha} from './store.mjs';

let engine=null;
export function loadEngine(root){
 if(engine)return engine;
 globalThis.window=globalThis;
 for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
 engine={Manse:globalThis.Manse,ReportV2:globalThis.ReportV2,MantraEditorial:globalThis.MantraEditorial};
 return engine;
}
export class SimError extends Error{constructor(msg,status=400){super(msg);this.status=status;}}
export function parseBirth(b){
 const n=(v,lo,hi,name)=>{const x=Number(v);if(!Number.isInteger(x)||x<lo||x>hi)throw new SimError(`${name}은(는) ${lo}~${hi} 범위의 정수여야 합니다.`);return x;};
 const year=n(b?.year,1900,2100,'연도'),month=n(b?.month,1,12,'월'),day=n(b?.day,1,31,'일');
 const hour=b?.hour===null||b?.hour===undefined||b?.hour===''?null:n(b.hour,0,23,'시'),minute=b?.minute===undefined||b?.minute===''||b?.minute===null?0:n(b.minute,0,59,'분');
 const gender=b?.gender==='F'||b?.gender==='여'?'F':b?.gender==='M'||b?.gender==='남'?'M':null;if(!gender)throw new SimError('성별(M/F)이 필요합니다.');
 const calendar=b?.calendar==='lunar'?'lunar':'solar';
 return {year,month,day,hour,minute,gender,calendar,city:'서울'};
}
export function buildSd(root,birth,asOf){
 const {Manse,ReportV2}=loadEngine(root),p=parseBirth(birth);
 let now=Date.now();if(asOf){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf);if(!m)throw new SimError('기준일은 YYYY-MM-DD 형식이어야 합니다.');now=Date.UTC(+m[1],+m[2]-1,+m[3],3);}
 const chart=Manse.compute(p);if(!chart)throw new SimError('원국을 계산하지 못했습니다. 입력을 확인하세요.');
 return {sd:ReportV2.SajuData.build(chart,{now}),params:p,now};
}
export function chartSummary(sd){
 const f=deriveFacts(sd);
 return {dayPillar:f.dayPillar,dayMaster:f.dayMaster,strength:f.strength,monthBranch:f.monthBranch,season:f.season,yongEl:f.yongEl||null,methodDifference:f.methodDifference||null,
  groups:Object.fromEntries(Object.entries(f.group||{}).map(([k,v])=>[k,{pct:Math.round(v.pct),level:v.level}])),
  pattern:(f.pattern||[]).filter(x=>!/일주$/.test(x)),gender:f.gender,nowYear:f.nowYear,
  daewoon:sd.currentDaewoon?{ganzhi:sd.currentDaewoon.ganzhi,start:sd.currentDaewoon.startYear,end:sd.currentDaewoon.endYear,season:f.daewoonSeason||null,stemTG:f.daewoonStemTG||null}:null,
  seun:sd.sewoon?{year:sd.sewoon.year,ganzhi:sd.sewoon.ganzhi,season:f.seunSeason||null,stemTG:f.seunStemTG||null}:null};
}
// mode "preview": every non-retired draft/review/approved entry may be shown. mode "approved": only approved entries, exactly what users would see after release.
export function entriesForMode(store,mode){
 const out=[];
 for(const id of store.ids()){const st=store.statusOf(id);
  if(mode==='approved'){if(st==='approved')out.push(store.get(id,{review:true}));}
  else if(st!=='retired')out.push(store.get(id));}
 return out;
}
export function runReport(store,sd,{mode='preview',chapters}={}){
 const ids=chapters||store.chapters().map(c=>c.id),entries=entriesForMode(store,mode);
 const rep=composeReport(entries,sd,ids,{preview:mode==='preview'});
 const byChapter=new Map(store.chapters().map(c=>[c.id,c]));
 return {mode,entryCount:entries.length,chapters:rep.chapters.map(c=>({chapter:c.chapter,title:byChapter.get(c.chapter)?.title||c.chapter,topicId:byChapter.get(c.chapter)?.topicId,coverage:c.coverage,
  picks:(c.picks||[]).map(p=>({id:p.id,role:p.role,version:store.get(p.id).version,status:store.statusOf(p.id),family:p.family,spec:p.spec,matched:p.matched})),
  suppressed:c.suppressed||[],candidates:c.candidates||0,sections:c.sections||[],text:c.text||''})),providerCalls:0};
}
// Why was/wasn't this entry chosen for this chart? Evaluates its conditions against the computed facts.
export function explainEntry(store,sd,id,{mode='preview'}={}){
 const e=store.get(id,{review:mode==='approved'}),facts=deriveFacts(sd),m=evalConds(e.when||{},facts),ex=Object.keys(e.unless||{}).length?evalConds(e.unless,facts):null;
 const reason=mode==='approved'&&store.statusOf(id)!=='approved'?'not-approved':store.statusOf(id)==='retired'?'retired':!m.match?'conditions-not-met':m.missing.length?'missing-facts':ex&&(ex.match||ex.missing.length)?'excluded':'matches';
 return {id,reason,rows:m.rows,missing:m.missing,exclusion:ex,chapter:e.chapters[0]};
}
// Trace log: records which entry (id+version) each chapter showed for a run. Raw birth data is NOT stored unless the admin explicitly asks.
export function createTraceLog(dataDir){
 const file=path.join(dataDir,'traces.jsonl');fs.mkdirSync(dataDir,{recursive:true});
 const read=()=>fs.existsSync(file)?fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
 return {
  add({label,birth,asOf,mode,report,summary,storeBirth=false,by}){
   const rec={id:'tr-'+Date.now().toString(36)+'-'+sha(Math.random()+label,4),at:new Date().toISOString(),by:by||'unknown',label:String(label||'').slice(0,60),mode,asOf:asOf||null,
    subject:sha({y:birth.year,m:birth.month,d:birth.day,h:birth.hour,mi:birth.minute,g:birth.gender,c:birth.calendar},12),
    ...(storeBirth?{birth}:{}),summary,
    chapters:report.chapters.map(c=>({chapter:c.chapter,coverage:c.coverage,picks:c.picks.map(p=>({id:p.id,version:p.version,status:p.status,role:p.role})),suppressed:c.suppressed.map(s=>({id:s.id,reason:s.reason}))}))};
   fs.appendFileSync(file,JSON.stringify(rec)+'\n');return rec;
  },
  list:({limit=100}={})=>read().reverse().slice(0,limit).map(r=>({id:r.id,at:r.at,label:r.label,mode:r.mode,subject:r.subject,by:r.by,asOf:r.asOf,dayPillar:r.summary?.dayPillar,picked:r.chapters.filter(c=>c.picks.length).length})),
  get:id=>read().find(r=>r.id===id)||null,
  // which saved traces displayed a given entry (optionally a specific version) — used to see who a text change affects
  usage:(entryId)=>read().filter(r=>r.chapters.some(c=>c.picks.some(p=>p.id===entryId))).map(r=>({trace:r.id,at:r.at,label:r.label,subject:r.subject,version:r.chapters.flatMap(c=>c.picks).find(p=>p.id===entryId)?.version})),
 };
}
// Co-display scan: over N deterministic charts, find entry pairs shown together in one chapter and flag opposing verdict candidates.
export function scanConflicts(root,store,{charts=60,mode='preview'}={}){
 loadEngine(root);const {Manse,ReportV2}=engine,entries=entriesForMode(store,mode),ids=store.chapters().map(c=>c.id),pairs=new Map(),declaredViolations=[];
 const byId=new Map(entries.map(e=>[e.id,e]));let shown=0;
 for(let i=0;i<charts;i++){
  const sd=ReportV2.SajuData.build(Manse.compute({year:1940+(i*7)%85,month:1+(i*7)%12,day:1+(i*11)%27,hour:i%7===0?null:(i*5)%24,minute:0,calendar:'solar',gender:i%2?'M':'F',city:'서울'}),{now:Date.UTC(2026,9,22,3)});
  for(const ch of ids){
   const r=composeChapter(entries,sd,ch,{preview:mode==='preview'});if(r.picks.length<2)continue;
   shown++;const [a,b]=r.picks.map(p=>byId.get(p.id));if(!a||!b)continue;
   const key=[a.id,b.id].sort().join('|'),cur=pairs.get(key)||{a:a.id,b:b.id,chapter:ch,count:0};cur.count++;pairs.set(key,cur);
   if((a.conflicts||[]).includes(b.id)||(b.conflicts||[]).includes(a.id))declaredViolations.push({chapter:ch,a:a.id,b:b.id});
  }
 }
 const candidates=[];
 for(const p of pairs.values()){const hit=antonymHit(byId.get(p.a),byId.get(p.b));if(hit)candidates.push({...p,words:hit,declared:(byId.get(p.a).conflicts||[]).includes(p.b)});}
 return {charts,mode,twoPickChapters:shown,distinctPairs:pairs.size,declaredViolations,unresolvedCandidates:candidates.filter(c=>!c.declared).sort((x,y)=>y.count-x.count).slice(0,50),topPairs:[...pairs.values()].sort((x,y)=>y.count-x.count).slice(0,20)};
}
