const object = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const string = {type:'string'};
const strings = values => ({type:'array',items:values.length?{type:'string',enum:[...new Set(values)]}:string,...(!values.length?{description:'No verified IDs are available. Return an empty array.'}:{})});
export function hookSchema(claims){return object({text:string,explanation:string,claim_id:{type:'string',enum:claims.map(c=>c.claim_id)}});}
export function writerSchema(clean,src,includeHook,hookClaimId){
 const properties={paragraphs:{type:'array',items:object({id:{type:'string',enum:clean.chapter.paragraphs.map(p=>p.id)},text:string,refs:strings(src.knowledge.map(x=>x.id)),claim_ids:strings((src.claims || []).map(x=>x.claim_id))})}};
 if(includeHook)properties.hook=hookSchema(hookClaimId ? src.claims.filter(c=>c.claim_id===hookClaimId) : src.claims);
 return object(properties);
}
export function reviewSchema(policy,claims){return object({ok:{type:'boolean'},issues:{type:'array',items:object({code:{type:'string',enum:['unsupported-claim','calculation-mismatch','semantic-duplicate','temperament-ratio','hook-body-duplicate','unsupported-timing','chapter-topic-mismatch','not-covered']},id:string,reason:string})},temperamentRatio:{type:'number',minimum:0,maximum:1,description:'Fraction from zero through one; application validation enforces the permitted chapter ratio.'},coverage:object(Object.fromEntries(policy.required.map(item=>[item,{anyOf:[object({status:{type:'string',enum:['covered']},claim_ids:{...strings(claims.map(c=>c.claim_id)),minItems:1}}),object({status:{type:'string',enum:['missing-evidence','not-covered']},claim_ids:strings(claims.map(c=>c.claim_id))})]}])))});}
export const repairSchema=claims=>object({hook:hookSchema(claims)});
