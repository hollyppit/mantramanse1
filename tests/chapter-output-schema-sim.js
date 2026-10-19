const assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{
 const S=await import(pathToFileURL(path.resolve('functions/_chapter-output-schema.js')).href),API=await import(pathToFileURL(path.resolve('functions/api/movingtoon-reading.js')).href);
 const clean={chapter:{paragraphs:[{id:'0'},{id:'1'}]}},src={knowledge:[{id:'MONEY-0012'}],claims:[{claim_id:'saju:MONEY-0012'}]},policy={required:['재물 구조','시기']};
 const schema=S.writerSchema(clean,src,true);
 assert.deepEqual(schema.properties.paragraphs.items.properties.refs.items.enum,['MONEY-0012']);
 assert.deepEqual(schema.properties.paragraphs.items.properties.claim_ids.items.enum,['saju:MONEY-0012']);
 assert.deepEqual(schema.properties.paragraphs.items.properties.id.enum,['0','1']);
 assert(!schema.properties.paragraphs.items.properties.refs.items.enum.includes('saju:MONEY-0012'));assert(!schema.properties.paragraphs.items.properties.refs.items.enum.includes('natal'));assert(!schema.properties.paragraphs.items.properties.refs.items.enum.includes('draft'));
 assert.deepEqual(schema.properties.hook.properties.claim_id.enum,['saju:MONEY-0012']);
 assert(!S.writerSchema(clean,src,false).properties.hook);const more={...src,claims:[...src.claims,{claim_id:'saju:MONEY-other'}]};assert.deepEqual(S.writerSchema(clean,more,true,'saju:MONEY-0012').properties.hook.properties.claim_id.enum,['saju:MONEY-0012'],'retain the ranked grounded hook basis while independently writing the body');
 const review=S.reviewSchema(policy,src.claims);assert.deepEqual(review.properties.coverage.required,policy.required);assert.equal(review.properties.coverage.additionalProperties,false);assert(review.properties.issues.items.properties.code.enum.includes('unsupported-claim'));
 assert.equal(review.properties.temperamentRatio.minimum,0);assert.equal(review.properties.temperamentRatio.maximum,1);for(const slot of Object.values(review.properties.coverage.properties)){assert.equal(slot.anyOf[0].properties.claim_ids.minItems,1);assert.deepEqual(slot.anyOf[0].properties.status.enum,['covered']);}
 assert.deepEqual(S.repairSchema(src.claims).required,['hook']);
 const check=s=>{if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));Object.values(s.properties).forEach(check);}if(s.items)check(s.items);if(s.anyOf)s.anyOf.forEach(check);};check(schema);check(review);check(S.repairSchema(src.claims));
 const old=global.fetch;let body;
 try{
  global.fetch=async(url,init)=>{body=JSON.parse(init.body);return new Response(JSON.stringify(url.includes('openai')?{output:[{content:[{type:'output_text',text:'{"paragraphs":[]}'}]}]}:{content:[{type:'text',text:'{"paragraphs":[]}'}]}));};
  const settings={outputSchema:schema,openaiModel:'configured-openai',anthropicModel:'configured-anthropic'};
  assert.equal((await API.generate({OPENAI_API_KEY:'fixture'},'openai','fixture','fixture',settings)).text,'{"paragraphs":[]}');
  assert.equal(body.model,'configured-openai');assert.deepEqual(body.text.format.schema,schema);assert.equal(body.text.format.strict,true);assert(!body.output_config);
  assert.equal((await API.generate({ANTHROPIC_API_KEY:'fixture'},'anthropic','fixture','fixture',settings)).text,'{"paragraphs":[]}');
  assert.equal(body.model,'configured-anthropic');assert.deepEqual(body.output_config.format.schema,schema);assert(!body.tools);assert(!body.text);
  await API.generate({OPENAI_API_KEY:'fixture'},'openai','fixture','fixture',{});assert(!body.text,'legacy responses retain their format');
 }finally{global.fetch=old;}
 console.log('chapter-output-schema: provider contracts, configured models, exact allowed IDs, closed objects, writer/review/repair and legacy compatibility PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
