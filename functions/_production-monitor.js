// Privacy-bounded synchronous Analytics Engine telemetry; never starts network I/O on the response path.
export const MONITOR_VERSION='production-monitor-1';
const chapter=id=>/^timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$/.test(id||'')?id:'other';
export function monitorPoint(env,{kind='request',source='real',id='',code='ok',status=200,ms=0,calls=0,valid=true}={}){
 try{if(!env?.READING_MONITOR)return false;env.READING_MONITOR.writeDataPoint({indexes:['mantramanse/'+kind],blobs:[kind,source,chapter(id),String(code).replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,100)],doubles:[status,Math.max(0,ms),Math.max(0,calls),valid?1:0]});return true;}catch{console.warn('reading-monitor-write-failed');return false;}
}
export function monitorReading(env,context,value,status,expected){
 const ps=value.result?.paragraphs,valid=status!==200||!!(value.ok&&Array.isArray(ps)&&ps.length===expected&&ps.every(p=>typeof p.text==='string'&&p.text.length>=30&&p.text.length<=1200&&!/〔[^〕]+〕/.test(p.text))&&!(value.pending||[]).length);
 const ms=Date.now()-context.started,calls=value.providerCallCount||0,code=status>=500?'http-'+status:calls?'visitor-ai-call':!valid?'chapter-output-invalid':ms>=10000?'request-timeout-risk':'ok';
 return monitorPoint(env,{kind:code==='ok'?'request':'incident',source:context.synthetic?'synthetic':'real',id:context.chapter,code,status,ms,calls,valid});
}
export function monitorProvider(env,scope){
 const reading=/^(reading-|compose$|life-ai$|past-story$|semantic)/.test(scope),source=env.__READING_ADMIN_GENERATION===true?'admin':reading?'public':'other';
 return monitorPoint(env,{kind:source==='public'?'incident':'provider',source,id:env.__AI_CONTEXT?.chapter,code:source==='public'?'visitor-ai-call':'provider-'+scope,status:0,calls:1});
}
