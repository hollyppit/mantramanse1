// No AI. Dry-run by default; produces a reversible, expected-value migration plan for the reviewed prose fields.
const fs=require('fs'),crypto=require('crypto'),Polite=require('../report/v2/polite-text.js');
const input=process.argv[2],out=process.argv[3];if(!input||!out)throw Error('usage: node tools/normalize-reading-copy.cjs snapshot.json output-directory');
const rows=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')),patches=[],byId=new Map(),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const summary={at:new Date().toISOString(),normalizer:Polite.VERSION,ruleCount:0,changedRules:0,changedRows:0,sourceQuotesPreserved:true,historicalBackupsPreserved:true};
for(const row of rows.filter(r=>/^ik:d:/.test(r.key))){
 const original=JSON.parse(row.value),next=Polite.content(original);
 next.forEach((r,i)=>{summary.ruleCount++;if(JSON.stringify(r)!==JSON.stringify(original[i])){r.version=(original[i].version||0)+1;r.updatedAt=summary.at;summary.changedRules++;}if(JSON.stringify(r.evidence)!==JSON.stringify(original[i].evidence))throw Error('source-quote-mutated');byId.set(r.id,r);});
 patches.push({key:row.key,before:row.value,after:JSON.stringify(next)});
}
for(const row of rows.filter(r=>!/^ik:d:/.test(r.key)&&!/:history$/.test(r.key))){
 let next=JSON.parse(row.value);
 if(row.key==='ik:agentic:runtime'){
  next=structuredClone(next);for(const c of Object.values(next.candidates||{})){c.next=Polite.content(c.next);const base=byId.get(c.knowledgeId);if(base){c.baseHash=hash(base);c.baseVersion=base.version;}}
  next.revision++;next.indexVersion=(next.indexVersion||0)+1;
 }else if(/^ik:editorial:|^ik:blocks:chapter:/.test(row.key))next=Polite.content(next);else continue;
 const after=JSON.stringify(next);if(after!==row.value)patches.push({key:row.key,before:row.value,after});
}
summary.changedRows=patches.length;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/migration-plan.json',JSON.stringify(patches));fs.writeFileSync(out+'/migration-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
