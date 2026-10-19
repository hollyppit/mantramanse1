const fs=require('node:fs');
for(const p of ['functions/_rag-network.js','functions/_rag-runner.js','functions/api/agentic-rag.js']){
 let s=fs.readFileSync(p,'utf8');
 if(p.endsWith('_rag-network.js'))s=s.replace("'Bearer '+env.OPENAI_API_KEY","'Bearer '+apiKey");
 else s=s.replaceAll('env.OPENAI_API_KEY','(env.RAG_OPENAI_API_KEY||env.OPENAI_API_KEY)');
 fs.writeFileSync(p,s);
}
