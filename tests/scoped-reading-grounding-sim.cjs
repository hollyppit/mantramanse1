// Scoped reads must preserve research publication, cross-domain moves, collisions and withdrawals.
const assert=require('assert/strict');
(async()=>{
 const I=await import('../functions/_ikstore.js'),V=await import('../functions/_rag-view.js'),R=await import('../functions/_rag-state.js'),K=await import('../functions/_ik.js');
 const originalFetch=global.fetch;global.fetch=()=>{throw Error('No AI or external requests');};
 const base={id:'SELF-01',domain:'SELF',status:'published',reviewed:true,version:1,title:'검수된 원래 규칙'},other={id:'CAREER-01',domain:'CAREER',status:'published',reviewed:true,version:1};
 let state=R.initialState(),domains={SELF:[base],MONEY:[],CAREER:[other]},reads=[];
 state.config.allowed=[{origin:'https://example.org',commercial:true,quote:true,store:true,license:'test license',rightsUrl:'https://example.org/rights',author:'test author',aiGenerated:false}];
 const kv={get:async(key,type)=>{reads.push(key);if(key===R.STATE_KEY)return structuredClone(state);if(key.startsWith('ik:d:'))return structuredClone(domains[key.slice(5)]||[]);return null;},getMany:async(keys,type)=>Promise.all(keys.map(k=>kv.get(k,type)))};
 async function compare(wanted){const full=(await V.serviceItems(kv,Object.values(domains).flat())).filter(x=>wanted.includes(x.domain));reads=[];const scoped=await I.loadServiceAll(kv,wanted);assert.deepEqual(scoped,full);assert.equal(reads.filter(k=>k===R.STATE_KEY).length,1);return reads.slice();}
 let used=await compare(['MONEY']);assert(!used.includes('ik:d:SELF')&&!used.includes('ik:d:CAREER'));
 const candidate={id:'move',knowledgeId:base.id,previous:base,next:{...base,domain:'MONEY',version:2},baseHash:await V.recordHash(base),publication:'published',sources:[{url:'https://example.org/source'}],source:{id:'source'}};
 state.candidates.move=candidate;state.active[base.id]='move';used=await compare(['MONEY']);assert(used.includes('ik:d:SELF'));assert(!used.includes('ik:d:CAREER'));assert.equal((await I.loadServiceAll(kv,['MONEY']))[0].version,2);await compare(['SELF']);
 domains.SELF[0]={...base,version:3};assert.equal((await I.loadServiceAll(kv,['MONEY'])).length,0,'concurrent legacy edit invalidates overlay');await compare(['MONEY']);domains.SELF[0]=base;
 state.config.blocked=['example.org'];await compare(['MONEY']);assert.equal((await I.loadServiceAll(kv,['MONEY'])).length,0);state.config.blocked=[];
 state.candidates.move.publication='rolled_back';await compare(['SELF']);assert.equal((await I.loadServiceAll(kv,['SELF']))[0].version,1);
 state.candidates.move={...candidate,publication:'published',previous:null,baseHash:await V.recordHash(null),next:{...candidate.next,id:other.id}};state.active={[other.id]:'move'};used=await compare(['MONEY']);assert(used.includes('ik:d:CAREER'),'new overlay still checks global ID collision');assert.equal((await I.loadServiceAll(kv,['MONEY'])).length,0);
 state.config.legacyOnly=true;used=await compare(['SELF']);assert(!used.includes('ik:d:CAREER'));assert.equal((await I.loadServiceAll(kv,['SELF']))[0].version,1);
 global.fetch=originalFetch;console.log('PASS scoped grounding: identical published rules, domain moves, global collisions, hash invalidation, blocked sources, rollback and fresh state; no AI');
})().catch(e=>{console.error(e);process.exitCode=1});
