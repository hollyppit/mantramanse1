import {json,isAdmin} from '../_lib.js';
import {kvOf} from '../_store.js';
import {loadEditorial,Editorial} from '../_editorial.js';
import {USER_EVENTS,EXPERT_EVENTS,PART_RE,summarizeMetrics} from '../_reading-metrics.js';
const dateOf=n=>new Date(n).toISOString().slice(0,10),PREFIX='err:reading-metric:';
export async function onRequest({request,env}){
 const url=new URL(request.url),on=env.READING_METRICS_ON==='1',admin=isAdmin(request,env),kv=kvOf(env);
 if(request.method==='GET'&&url.searchParams.get('config')==='1')return json({on});
 if(request.method==='GET'){
  if(!admin)return json({error:'unauthorized'},401);if(!kv)return json({error:'storage-unavailable'},503);
  const today=dateOf(Date.now()),first=dateOf(Date.now()-6*86400000),date=url.searchParams.get('date') || today,cursor=url.searchParams.get('cursor') || '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<first||date>today||cursor.length>3000)return json({error:'invalid-range'},400);
  try{const page=await (kv.listReadingMetrics || kv.list).call(kv,{prefix:PREFIX+date+':',limit:100,cursor:cursor || undefined}),keys=page.keys.slice(0,100).map(k=>k.name),records=(kv.getMany?await kv.getMany(keys,'json'):await Promise.all(keys.map(k=>kv.get(k,'json')))).filter(Boolean);
   // Supabase adapter can return more keys than the requested limit; keep an explicit offset for that case.
   const excess=page.keys.length>100;
   if(excess)return json({error:'metrics-store-page-too-large'},503);
   const next=!page.list_complete?{date,cursor:page.cursor}:date>first?{date:dateOf(Date.parse(date+'T12:00:00Z')-86400000),cursor:''}:null;
   return json({on,records,summary:summarizeMetrics(records),next,windowDays:7});
  }catch{return json({error:'metrics-unavailable'},503);}
 }
 if(request.method!=='POST')return json({error:'method-not-allowed'},405);
 if(!on)return url.searchParams.get('expert')==='1'&&admin?json({error:'metrics-disabled'},409):new Response(null,{status:204});if(!kv)return json({error:'storage-unavailable'},503);
 const expert=url.searchParams.get('expert')==='1';if(expert&&!admin)return json({error:'unauthorized'},401);
 if(!expert){let origin='';try{origin=new URL(request.headers.get('origin') || request.headers.get('referer') || '').origin;}catch{}if(origin!==url.origin)return json({error:'origin-required'},403);}
 const raw=await request.text();if(raw.length>1200)return json({error:'too-large'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid-json'},400);}
 const allowed=expert?EXPERT_EVENTS:USER_EVENTS,isPart=/^part-/.test(body.event||'');if(isPart&&!PART_RE.test(body.part||''))return json({error:'invalid-part'},400);if(!allowed.includes(body.event)||!/^\w[\w.-]{1,79}$/.test(body.chapter || '')||!expert&&!/^[a-f0-9-]{36}$/.test(body.reportId || ''))return json({error:'invalid-event'},400);
 try{if(!expert){const hour=new Date().toISOString().slice(0,13),limitKey='rl:reading-metrics:'+(request.headers.get('cf-connecting-ip') || 'local')+':'+hour,used=Number(await kv.get(limitKey))||0;if(used>=600)return json({error:'rate-limited'},429);await kv.put(limitKey,String(used+1),{expirationTtl:7200});}
 const catalog=await loadEditorial(kv),ids=new Set([...Editorial.defaults().chapters,...catalog.chapters].flatMap(c=>[c.id,...c.legacyIds]));if(!ids.has(body.chapter))return json({error:'unknown-chapter'},400);
  const now=Date.now(),reportId=expert?crypto.randomUUID():body.reportId;
  const record={reportId,chapter:body.chapter,event:body.event,source:expert?'expert':'user',at:new Date(now).toISOString(),...(isPart?{part:body.part}:{})};
  await kv.put(PREFIX+dateOf(now)+':'+reportId+':'+body.chapter+':'+body.event+(isPart?':'+body.part:''),JSON.stringify(record),{expirationTtl:14*86400});
  return json({ok:true});
 }catch{return json({error:'metrics-unavailable'},503);}
}
