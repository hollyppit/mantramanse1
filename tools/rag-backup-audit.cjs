// Offline comparison only. Accepts JSON arrays of exported public.kv rows.
// Never connects to a database or restores into an existing database.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));return x;}
function audit(rows){
  assert(Array.isArray(rows),'export must be an array');const keys=new Set(),ids=new Set(),counts={rows:rows.length,knowledge:0,published:0,reviewed:0,sourceRows:0};
  const records=rows.map(row=>{assert(row&&typeof row.key==='string','row key required');assert(!keys.has(row.key),'duplicate row key');keys.add(row.key);
    if(/^src:/.test(row.key))counts.sourceRows++;
    if(/^ik:d:/.test(row.key)&&row.value!==null){const items=typeof row.value==='string'?JSON.parse(row.value):row.value;assert(Array.isArray(items),'knowledge domain must be an array');for(const item of items){assert(typeof item.id==='string'&&!ids.has(item.id),'missing or duplicate knowledge id');ids.add(item.id);counts.knowledge++;if(item.status==='published')counts.published++;if(item.reviewed===true)counts.reviewed++;}}
    return {key:row.key,sha256:crypto.createHash('sha256').update(JSON.stringify(stable(row))).digest('hex')};
  }).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  return {counts,sha256:crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex'),records};
}
function compare(before,after){const a=audit(before),b=audit(after);assert.equal(b.sha256,a.sha256,'backup restore differs: row values or metadata changed');return {matched:true,counts:a.counts,sha256:a.sha256};}
module.exports={audit,compare};
if(require.main===module){try{const [before,after]=process.argv.slice(2);assert(before&&after,'usage: node tools/rag-backup-audit.cjs before.json restored.json');console.log(JSON.stringify(compare(JSON.parse(fs.readFileSync(before,'utf8')),JSON.parse(fs.readFileSync(after,'utf8'))),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
