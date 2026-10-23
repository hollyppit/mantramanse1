// Local verification of converted libraries: production validators plus a real render through composeReviewed on deterministic charts.
import {allEntries,chapterPassages,loadService} from './convert.mjs';
import {loadEngine} from '../admin/sim.mjs';
import {composeChapter} from '../compose.mjs';
import {bundles} from '../index.mjs';

export const TOPIC_NOTICE={health:'의료기관',creative:'창작',remedy:'보장'};
const FORBID=/(사망|죽는|죽음|암에 걸|질병에 걸|파산한다|이혼한다|결혼한다|합격한다|반드시|무조건|100%)/;

export function sampleCharts(n,root){
 const {Manse,ReportV2}=loadEngine(root),out=[];
 for(let i=0;i<n;i++){
  const birth={year:1940+(i*7)%85,month:1+(i*7)%12,day:1+(i*11)%27,hour:i%7===0?null:(i*5)%24,minute:0,calendar:'solar',gender:i%2?'M':'F',city:'서울'};
  out.push(ReportV2.SajuData.build(Manse.compute(birth),{now:Date.UTC(2026,9,22,3)}));
 }
 return out;
}
const entryOf=id=>/^rb-(.+)-(title|why|reality|strength|risk|reinforce|practice)$/.exec(id)?.[1]||null;

export async function verifyAll({root,charts=120,only=null}={}){
 const {L,S,chapters}=await loadService(),all=allEntries(),sds=sampleCharts(charts,root),entriesAll=Object.entries(bundles).filter(([b])=>b!=='pilot').flatMap(([,l])=>l);
 const report=[],problems=[];
 for(const c of chapters){
  const es=all.filter(e=>e.chapters[0]===c.id);if(!es.length||(only&&!only.includes(c.id)))continue;
  const seed=S.seedPassages(c),conv=await chapterPassages(c,seed,es,{L}),issues=L.validatePassages(conv.passages,c,[]);
  const row={chapter:c.id,entries:es.length,passages:conv.passages.length,authored:conv.authored.length,validatorIssues:issues.length,dropped:conv.log.droppedForDuplicate.length,prefixed:conv.log.prefixed,matched:0,fallback:0,mixed:0,pending:0,agree:0,noticeMissing:0,forbidden:0,charts:sds.length};
  if(issues.length)problems.push({chapter:c.id,issues:issues.slice(0,5)});
  const topic=c.topicId,needNotice=TOPIC_NOTICE[topic];
  for(const sd of sds){
   const args={clean:{sd,chapter:{paragraphs:L.ROLES.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:1,published:conv.passages}};
   let out;try{out=L.composeReviewed(args);}catch(e){problems.push({chapter:c.id,error:String(e.message).slice(0,160)});continue;}
   const used=new Set(out.blocks.map(b=>entryOf(b.id)).filter(Boolean));
   if(out.pending.length)row.pending++;
   if(used.size===0)row.fallback++;else if(used.size>1){row.mixed++;if(problems.length<30)problems.push({chapter:c.id,mixed:[...used]});}else row.matched++;
   const text=out.result.paragraphs.map(p=>p.text).join('\n');
   if(FORBID.test(text)){row.forbidden++;}
   if(needNotice&&used.size&&!text.includes(needNotice)){row.noticeMissing++;if(problems.length<30)problems.push({chapter:c.id,noticeMissing:[...used][0]});}
   // agreement with the local composer's first pick (service picks one entry per role; composer may add a second)
   const mine=composeChapter(entriesAll,sd,c.id,{preview:true});
   if(mine.picks?.[0]&&used.has(mine.picks[0].id))row.agree++;
   else if(!mine.picks?.length&&used.size===0)row.agree++;
  }
  report.push(row);
 }
 return {report,problems};
}
