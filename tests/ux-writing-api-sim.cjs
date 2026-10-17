const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const f of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
(async()=>{
  const API=await import('../functions/api/movingtoon-reading.js');
  const M=Manse,ch=M.compute({year:1990,month:5,day:15,hour:14,minute:30,calendar:'solar',gender:'M',city:'서울'}),sd=ReportV2.SajuData.build(ch,{now:Date.UTC(2026,9,17)});
  const mem=new Map(),kv={get:async(k,t)=>mem.has(k)?t==='json'?JSON.parse(mem.get(k)):mem.get(k):null,put:async(k,v)=>mem.set(k,v),list:async()=>({keys:[]})};
  const env={GLOSSARY_KV:kv,OPENAI_API_KEY:'mock',INTERPRETATION_ENGINE_MODE:'legacy'};
  const unchanged='결과가 걱정된다면 맡길 범위를 먼저 합의해보세요. 확인할 기준을 함께 정리하면 같은 일을 다시 확인하는 부담을 줄이는 데 도움이 될 수 있습니다.';
  const bad='결과를 전부 직접 확인하려 한다. 남에게 맡긴 일까지 다시 손대면 혼자 일을 떠안는 상황이 반복될 수 있다.';
  const fixed='결과를 전부 직접 확인하려는 상황을 가정해볼 수 있습니다. 맡긴 일을 다시 손댄다면 자신의 업무가 밀릴 수 있으니 확인할 범위를 먼저 합의해보세요.';
  const body={sd,chapter:{id:'personality',title:'나는 왜 이렇게 행동할까?',paragraphs:[{id:'0',text:unchanged,role:'practice'},{id:'1',text:bad,role:'risk'}]}};
  let calls=0,failRepair=false;const original=global.fetch;
  global.fetch=async(url,o)=>{
    calls++;const payload=JSON.parse(JSON.parse(o.body).input);
    if(payload.issues){
      assert.deepEqual(payload.paragraphs.map(p=>p.id),['1']);
      return new Response(JSON.stringify({output_text:JSON.stringify({paragraphs:[{id:'1',text:failRepair?bad:fixed,refs:['natal']}]})}));
    }
    return new Response(JSON.stringify({output_text:JSON.stringify({paragraphs:[{id:'0',text:unchanged,refs:['natal']},{id:'1',text:bad,refs:['natal']}]})}));
  };
  try{
    const run=async data=>{const r=await API.onRequestPost({env,request:new Request('http://local/api/movingtoon-reading',{method:'POST',body:JSON.stringify(data)})});return {status:r.status,data:await r.json()};};
    const a=await run(body);assert.equal(a.status,200,JSON.stringify(a.data));assert.equal(calls,2);
    assert.equal(a.data.result.paragraphs[0].text,unchanged);assert.equal(a.data.result.paragraphs[1].text,fixed);
    assert.equal(a.data.writingQuality.repairs[0].before,bad);assert.equal(a.data.writingQuality.repairs[0].after,fixed);
    assert.equal(a.data.writingQuality.ok,true);
    const hit=await run(body);assert(hit.data.cached);assert.equal(calls,2);
    failRepair=true;const b=await run({...body,chapter:{...body.chapter,id:'personality-2'}});
    assert.equal(b.status,502);assert.equal(b.data.error,'chapter-validation-failed');assert.equal(b.data.validation.ok,false);
    console.log('UX API: isolated paragraph repair; valid prose and refs preserved; before/after; cache; failed repair rejected PASS');
  }finally{global.fetch=original;}
})().catch(e=>{console.error(e);process.exit(1)});
