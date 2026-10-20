import { readState, sourcePolicy } from './_rag-state.js';
// Hash the exact original record: a concurrent legacy edit automatically invalidates its overlay.
export async function recordHash(x) {const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function researchView(kv,original,snapshot) {
  let s;try{s=snapshot===undefined?await readState(kv):snapshot;if(!s)throw Error('unavailable');}catch{return {items:original,docs:[],version:'research-unavailable'};}
  if(s.config.legacyOnly)return {items:original,docs:[],version:'legacy-only:'+(s.indexVersion||0)};
  const items=original.slice(),docs=[],byId=new Map(original.map((x,i)=>[x.id,i]));
  for(const [id,changeId] of Object.entries(s.active)) {
    const c=s.candidates[changeId];if(!c||c.publication!=='published')continue;
    try{sourcePolicy(c.sources[0].url,s.config);}catch{continue;}
    const index=byId.get(id),base=index===undefined?null:original[index];
    if(c.baseHash!==await recordHash(base))continue;
    // Legacy approval & publication changes always take precedence over research versions.
    if(base&&(base.status!==c.previous.status||base.reviewed!==c.previous.reviewed))continue;
    const next={...(base?{...base,...c.next,id:base.id,status:base.status,reviewed:base.reviewed,reviewedAt:base.reviewedAt}:c.next),researchChangeId:c.id};
    if(index===undefined)items.push(next);else items[index]=next;
    docs.push(c.source);
  }
  return {items,docs,version:'research:'+(s.indexVersion||0)};
}
export async function serviceItems(kv,original,snapshot) {return (await researchView(kv,original,snapshot)).items;}
