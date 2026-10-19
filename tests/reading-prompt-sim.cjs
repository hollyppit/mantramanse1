const fs=require('fs'),assert=require('assert/strict'),{pathToFileURL}=require('url'),path=require('path');
(async()=>{
 const {compactPrompt}=await import(pathToFileURL(path.resolve('functions/_reading-prompt.js')).href);
 const decode=p=>{const d=JSON.parse(p);if(!d.encoding)return d;const expand=v=>{if(v&&typeof v==='object'&&Object.hasOwn(v,'$shared')){assert(Object.hasOwn(d.shared,v.$shared));return expand(d.shared[v.$shared]);}if(Array.isArray(v))return v.map(expand);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,expand(x)]));return v;};return expand(d.payload);};
 const retained={exceptions:['예외와 반대 조건을 빠짐없이 유지합니다.'.repeat(20)],counter_evidence:['독립된 반대 근거'],uncertainty:['계산된 사실은 실제 사건이 아닙니다.'],elements:[{path:'pillars.day',value:'甲子'}]};
 const fixture={claims:Array.from({length:9},(_,i)=>({claim_id:'claim-'+i,...retained})),previous:[{id:'locked',text:'승인된 문단을 변경하지 않습니다.'.repeat(20)}],result:{paragraphs:[{id:'new',text:'가정인 사례입니다.'}]},calculated:{a:retained,b:retained}};
 const raw=JSON.stringify(fixture),packed=compactPrompt(raw);assert.deepEqual(decode(packed),fixture);assert(packed.length<raw.length*.6);assert.equal(compactPrompt('not-json'),'not-json');assert.equal(compactPrompt('{"$shared":"untrusted"}'),'{"$shared":"untrusted"}');assert.equal(compactPrompt('{"small":true}'),'{"small":true}');
 const live=JSON.parse(fs.readFileSync('output/reading-block-release/measurement-hybrid-timeline_self_03-1792343341518.json')).measurement.result;
 const data={claims:live.interpretation.claims,result:live.result,policy:live.chapterPolicy,previous:[],hook:live.hook};const input=JSON.stringify(data),output=compactPrompt(input);assert.deepEqual(decode(output),data);
 console.log(JSON.stringify({passed:true,lossless:true,fixtureReduction:1-packed.length/raw.length,recordedReviewSubsetReduction:1-output.length/input.length,allClaimsAndExceptionsRetained:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
