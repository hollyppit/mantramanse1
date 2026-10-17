// Restore an explicitly supplied export into a NEW in-memory DB only. No network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pg17=process.env.RAG_TEST_PG_MAJOR==='17';
const {PGlite}=require(pg17?'../output/rag-pg17-tools/node_modules/@electric-sql/pglite':'../output/rag-staging-tools/node_modules/@electric-sql/pglite');
const {compare}=require('./rag-backup-audit.cjs');
(async()=>{
  const file=process.argv[2];assert(file,'backup JSON path required');
  const buffer=fs.readFileSync(file),rows=JSON.parse(buffer);assert(Array.isArray(rows));
  assert(rows.every(r=>typeof r.key==='string'&&/^(ik:|src:)/.test(r.key)),'only authorized RAG rows accepted');
  const db=await PGlite.create();
  try{
    if(pg17)assert((await db.query('select version() as v')).rows[0].v.startsWith('PostgreSQL 17.'));
    await db.exec("set timezone='UTC'; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;");
    await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));
    await db.transaction(async tx=>{for(const r of rows)await tx.query('insert into public.kv(key,value,expires_at,updated_at) values($1,$2,$3,$4)',[r.key,r.value,r.expires_at,r.updated_at]);});
    const restored=(await db.query('select to_jsonb(t) as row from public.kv t order by key')).rows.map(x=>x.row);
    const result=compare(rows,restored);
    await db.exec('grant usage on schema public to service_role; grant select,insert,update on public.kv to service_role;');
    const migration=fs.readFileSync('supabase/migrations/20261017_rag_cas.sql','utf8');await db.exec(migration);await db.exec(migration);
    const {pathToFileURL}=require('node:url'),A=await import(pathToFileURL(path.resolve('functions/_agentic-rag.js')));
    const kv={get:async(k,type)=>{const value=(await db.query('select value from public.kv where key=$1',[k])).rows[0]?.value??null;return type==='json'&&value!==null?JSON.parse(value):value;},put:async(k,v)=>{assert(k.startsWith('ik:agentic:'),'original writes forbidden');await db.query('insert into public.kv(key,value) values($1,$2) on conflict(key) do update set value=excluded.value',[k,v]);}};
    const health=await A.audit(kv);
    const healthPath=path.join(path.dirname(file),'mantramanse1-health-private.json');fs.writeFileSync(healthPath,JSON.stringify(health,null,2)+'\n');
    const originalKeys=new Set(rows.map(r=>r.key)),after=(await db.query('select to_jsonb(t) as row from public.kv t order by key')).rows.map(x=>x.row).filter(r=>originalKeys.has(r.key));compare(rows,after);
    const report={checkedAt:new Date().toISOString(),scope:'Supabase RAG rows only',sourceProject:'mantramanse1',projectIsLiveSiteDatabase:'unconfirmed-secret-url',mode:'isolated-local-restore',engine:(await db.query('select version() as v')).rows[0].v,cloudWrites:0,externalAPICalls:0,backupFile:path.relative('.',file).replace(/\\/g,'/'),backupFileSHA256:crypto.createHash('sha256').update(buffer).digest('hex'),...result,excluded:['R2 original files','Cloudflare KV','non-RAG DB rows','database roles and database-wide configuration']};
    fs.writeFileSync(pg17?'docs/AGENTIC_RAG_REAL_BACKUP_RESTORE_PG17_2026-10-17.json':'docs/AGENTIC_RAG_REAL_BACKUP_RESTORE_2026-10-17.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
    const healthSummary={checkedAt:health.checkedAt,sourceProject:'mantramanse1',mode:'offline-audit-of-approved-backup',productionWrites:0,originalRowsUnchanged:true,localMigrationAppliedTwice:true,total:health.total,reviewed:health.reviewed,published:health.published,counts:health.counts,limitations:health.limitations,privateDetails:path.relative('.',healthPath).replace(/\\/g,'/')};fs.writeFileSync('docs/AGENTIC_RAG_REAL_HEALTH_2026-10-17.json',JSON.stringify(healthSummary,null,2)+'\n');console.log(JSON.stringify(healthSummary,null,2));
  }finally{await db.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
