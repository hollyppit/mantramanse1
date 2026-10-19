const fs=require('node:fs');
for(const file of ['functions/_rag-network.js','workers/rag-scheduler.js']){
 const source=fs.readFileSync(file,'utf8');fs.writeFileSync(file,source.replaceAll("redirect:'error'","redirect:'manual'"));
}
