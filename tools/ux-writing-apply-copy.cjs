// Apply only reviewed full-phrase edits to source literals; reject stale source offsets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const review=JSON.parse(fs.readFileSync('output/ux-writing/copy-review.json'));
const byFile=new Map();
for(const edit of review.edits)if(edit.after!==edit.text)for(const loc of edit.locations){const entries=byFile.get(loc.file)||[];entries.push({...loc,before:edit.text,after:edit.after,id:edit.id});byFile.set(loc.file,entries);}
const manifest={at:new Date().toISOString(),files:[],changes:0};
for(const [file,edits]of byFile){
 const absolute=path.resolve(file),root=path.resolve('report')+path.sep;if(!absolute.startsWith(root))throw Error('outside-report');
 const original=fs.readFileSync(file,'utf8');let source=original;
 for(const e of edits.slice().sort((a,b)=>b.start-a.start)){
  const raw=original.slice(e.start,e.end);let current;
  if(e.htmlText)current=raw;else if(e.template)current=raw;else try{current=vm.runInNewContext(raw);}catch{throw Error('invalid-literal-'+file+':'+e.line);}
  if(!e.template&&current!==e.before)throw Error('stale-copy-offset-'+file+':'+e.line);
  const replacement=e.htmlText?e.after:e.template?e.after.replace(/`/g,'\\`').replace(/\$\{/g,'\\${'):JSON.stringify(e.after);
  source=source.slice(0,e.start)+replacement+source.slice(e.end);
 }
 if(file.endsWith('.js'))new vm.Script(source,{filename:file});
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 fs.mkdirSync('output/ux-writing/copy-source-backups',{recursive:true});const backup='output/ux-writing/copy-source-backups/'+file.replace(/\//g,'__');fs.writeFileSync(backup,original);
 fs.writeFileSync(file,source);manifest.files.push({file,beforeHash:hash(original),afterHash:hash(source),changes:edits.length,backup});manifest.changes+=edits.length;
}
fs.writeFileSync('output/ux-writing/copy-applied.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify({files:manifest.files.length,changes:manifest.changes,unapplied:review.failures.length}));
