const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
async function fixtures(){
 global.window=globalThis;
 for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
 const I=await import('../functions/_ikstore.js'),T=await import('../functions/_interpretation-store.js'),E=await import('../functions/_interpretation-engine.js');
 const rows=JSON.parse(fs.readFileSync('output/protected-backup/mantramanse1-rag-20261017.json')),digests=JSON.parse(fs.readFileSync('output/ux-writing/live-db-digests.json'));
 for(const d of digests.rows){const r=rows.find(x=>x.key===d.key);if(!r||crypto.createHash('md5').update(String(r.value)).digest('hex')!==d.digest)throw Error('knowledge-snapshot-mismatch');}
 const map=new Map(rows.map(r=>[r.key,r.value]));
 const kv={get:async(k,t)=>{const v=map.get(k);return v==null?null:t==='json'&&typeof v==='string'?JSON.parse(v):v;}};
 const items=await I.loadServiceAll(kv),blocked=await I.blockedDocs(kv),sourceIndex=await T.loadSourceIndex(kv,items,blocked);
 return {items,blocked,sourceIndex,kv,engine:E,digests};
}
module.exports={fixtures};
if(require.main===module)(async()=>{const f=await fixtures(),out=[];for(let i=0;i<120;i++){const year=1970+i%45,month=1+i%12,day=1+(i*7)%27,hour=i%6===0?null:(i*3)%24,gender=i%2?'M':'F',sd=ReportV2.SajuData.build(Manse.compute({year,month,day,hour,minute:0,calendar:'solar',gender,city:'서울'}),{now:Date.UTC(2026,9,17,3)}),a=f.engine.analyze(sd,f.items,{sourceIndex:f.sourceIndex,blockedDocs:f.blocked,maxClaims:45,disabledRules:[]});out.push({id:'synthetic-'+i,input:{year,month,day,hour,minute:0,calendar:'solar',gender,city:'서울'},pillar:sd.dayPillar.ko,claims:a.claims.length,money:a.claims.filter(c=>c.domain==='MONEY').length,self:a.claims.filter(c=>c.domain==='SELF').length,dominant:sd.dominantGroup});}fs.writeFileSync('output/ux-writing/chart-selection.json',JSON.stringify(out,null,2));console.log(JSON.stringify({moneyCharts:out.filter(x=>x.money>0).length,best:out.slice().sort((a,b)=>b.money-a.money||b.self-a.self).slice(0,12)},null,2));})();
