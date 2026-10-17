// User-authorized OpenAI calls only; local persistent ledger enforces the USD 2 cap.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readConfig}=require('./check-rag-provider-connections.cjs');
const DIR='output/ux-writing',LEDGER=DIR+'/budget.json',MODEL='gpt-4.1-mini-2025-04-14';
const PRICE={input:.4,output:1.6,source:'https://developers.openai.com/api/docs/models/gpt-4.1-mini',checked:'2026-10-17'};
fs.mkdirSync(DIR,{recursive:true});
function ledger(){return fs.existsSync(LEDGER)?JSON.parse(fs.readFileSync(LEDGER)):{capUSD:2,reservedUSD:.0001,actualUSD:.0000412,calls:[],pricing:PRICE};}
function output(d){return d.output_text||(d.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('');}
async function generate(label,instructions,data,maxTokens=5000,schema=null,model=MODEL){
 const prices=model==='gpt-4.1-2025-04-14'?{input:2,output:8}:model===MODEL?PRICE:null;if(!prices)throw Error('unbudgeted-model');
 const input='Return JSON.\n'+JSON.stringify(data),id=crypto.createHash('sha256').update(model+'|'+instructions+'|'+input+'|'+maxTokens+'|'+JSON.stringify(schema)).digest('hex'),file=DIR+'/calls/'+id+'.json';
 if(fs.existsSync(file)){const d=JSON.parse(fs.readFileSync(file));if(d.ok)return d;}
 const l=ledger(),reservation=(Buffer.byteLength(instructions)+Buffer.byteLength(input)+4096)*prices.input/1e6+maxTokens*prices.output/1e6;
 if(l.reservedUSD+reservation>l.capUSD)throw Error('approved-api-budget-exhausted');
 l.reservedUSD+=reservation;l.calls.push({id,label,reservationUSD:reservation,state:'reserved',at:new Date().toISOString()});fs.writeFileSync(LEDGER,JSON.stringify(l,null,2));
 const cfg=readConfig('output/protected-backup/api-probe.env');
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+cfg.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model,store:false,max_output_tokens:maxTokens,instructions,input,text:{format:schema?{type:'json_schema',name:'ux_result',strict:true,schema}:{type:'json_object'}}}),signal:AbortSignal.timeout(90000)});
 const raw=await response.json(),result={id,label,ok:response.ok,at:new Date().toISOString(),model:raw.model,status:response.status,responseId:raw.id,text:output(raw),usage:raw.usage,error:raw.error?{code:raw.error.code,type:raw.error.type,param:raw.error.param,message:String(raw.error.message||'').replace(/sk-[\w-]+/g,'[redacted]').slice(0,400)}:null};
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2));
 const latest=ledger(),entry=latest.calls.find(x=>x.id===id);entry.state=response.ok?'complete':'failed';
 if(raw.usage){const cost=(raw.usage.input_tokens*prices.input+raw.usage.output_tokens*prices.output)/1e6;entry.actualUSD=cost;entry.model=model;entry.prices=prices;latest.actualUSD+=cost;latest.reservedUSD-=reservation-cost;}
 else if(!response.ok){entry.actualUSD=0;latest.reservedUSD-=reservation;}
 fs.writeFileSync(LEDGER,JSON.stringify(latest,null,2));
 if(!response.ok)throw Error('openai-http-'+response.status+'-'+(raw.error?.code||'unknown')+' '+result.error.message);
 return result;
}
module.exports={generate,ledger,MODEL,DIR};
