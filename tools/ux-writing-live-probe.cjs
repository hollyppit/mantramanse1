// Explicitly requested real AI connectivity check. Never prints credentials.
const fs=require('node:fs');
const {readConfig}=require('./check-rag-provider-connections.cjs');
(async()=>{
  const c=readConfig('output/protected-backup/api-probe.env');
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+c.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',store:false,max_output_tokens:40,instructions:'한국어 존댓말 문장 한 개만 답하세요.',input:'풀이 문체 검증 연결을 확인합니다.'}),signal:AbortSignal.timeout(30000)});
  const d=await r.json(),result={at:new Date().toISOString(),status:r.status,model:d.model,error:d.error?{code:d.error.code,type:d.error.type}:null,text:d.output_text||(d.output||[]).flatMap(o=>o.content||[]).map(x=>x.text||'').join(''),usage:d.usage?{input:d.usage.input_tokens,output:d.usage.output_tokens}:null};
  fs.mkdirSync('output/ux-writing',{recursive:true});fs.writeFileSync('output/ux-writing/provider-probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(JSON.stringify({error:e.name,message:e.message}));process.exitCode=1});
