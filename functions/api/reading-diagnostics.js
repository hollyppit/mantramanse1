import {json,isAdmin} from '../_lib.js';
import {kvOf} from '../_store.js';
import {summarizeReadings} from '../_reading-diagnostics.js';
export async function onRequestGet({request,env}) {
  if(!isAdmin(request,env))return json({error:'관리자 인증이 필요합니다'},401);
  const kv=kvOf(env);
  if(!kv)return json({error:'storage-unavailable'},503);
  // Bounded daily sample, newest day first. Explicitly report truncation rather than a misleading global rate.
  const records=[];let truncated=false;
  try {
    for(let day=0;day<7 && records.length<100;day++) {
      const date=new Date(Date.now()-day*86400000).toISOString().slice(0,10);
      const page=await kv.list({prefix:'err:reading:'+date+':',limit:101});
      const keys=page.keys || [];
      if(!page.list_complete || keys.length>100-records.length)truncated=true;
      const rows=await Promise.all(keys.slice(0,100-records.length).map(k=>kv.get(k.name,'json')));
      records.push(...rows.filter(Boolean));
    }
    if(records.length>=100)truncated=true;
    records.sort((a,b)=>b.at.localeCompare(a.at));
    return json({on:env.ERRLOG_ON==='1',windowDays:7,limit:100,truncated,summary:summarizeReadings(records),records});
  } catch {return json({error:'storage-unavailable'},503);}
}
