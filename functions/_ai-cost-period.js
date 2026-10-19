export function costPeriod(period,timeZone='Asia/Seoul'){
 if(!/^\d{4}-\d{2}(?:-\d{2})?$/.test(period)||!['Asia/Seoul','UTC'].includes(timeZone))throw Error('invalid-period');
 const [year,month,day]=period.split('-').map(Number),offset=timeZone==='Asia/Seoul'?9*3600000:0;
 if(month<1||month>12||day!=null&&(day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()))throw Error('invalid-period');
 const start=Date.UTC(year,month-1,day||1)-offset,end=(day?Date.UTC(year,month-1,day+1):Date.UTC(year,month,1))-offset;
 const first=new Date(start).toISOString().slice(0,10),last=new Date(end-1).toISOString().slice(0,10);
 const segments=day?[...new Set([first,last])]:first.slice(0,7)===period?[period]:[first,period];
 return {start,end,segments,timeZone};
}
export async function readCostPage(kv,{period,kind='cost',cursor=null,timeZone='Asia/Seoul'}){
 const range=costPeriod(period,timeZone);let state=cursor?JSON.parse(cursor):{segment:0,index:null};
 if(!Number.isInteger(state.segment)||state.segment<0||state.segment>=range.segments.length)throw Error('invalid-cost-cursor');
 const prefix='ai:'+kind+':'+range.segments[state.segment],page=await(kv.listAICost?kv.listAICost({prefix,cursor:state.index||undefined}):kv.list({prefix,cursor:state.index||undefined,limit:100}));
 const keys=page.keys.map(k=>k.name),rows=(kv.getMany?await kv.getMany(keys,'json'):await Promise.all(keys.map(k=>kv.get(k,'json')))).filter(Boolean).filter(e=>Date.parse(e.at)>=range.start&&Date.parse(e.at)<range.end);
 if(page.list_complete)state={segment:state.segment+1,index:null};else state.index=page.cursor;
 const complete=state.segment>=range.segments.length;
 return {events:rows,complete,cursor:complete?null:JSON.stringify(state),timeZone};
}
