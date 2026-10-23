// Read-only diagnostic SQL: lists published passages whose text matches no known seed version.
//   node tools/diagnose-blunt-passages.cjs timeline_self_01
const fs=require('fs'),crypto=require('crypto'),id=process.argv[2]||'timeline_self_01',dir='output/blunt-copy-20261021',md5=s=>crypto.createHash('md5').update(s).digest('hex');
const known={};const add=(d)=>{for(const p of d.chapters[id]||[]){(known[p.id]=known[p.id]||new Set()).add(md5(p.text));}};
for(const f of fs.readdirSync(dir+'/baseline-dumps'))add(JSON.parse(fs.readFileSync(dir+'/baseline-dumps/'+f)));
const nw=JSON.parse(fs.readFileSync(dir+'/new.json'));const newIds=new Set(nw.chapters[id].map(p=>p.id));
const flat=Object.fromEntries(Object.entries(known).map(([k,v])=>[k,[...v]]));const q=s=>"'"+s.replace(/'/g,"''")+"'";
const sql=`-- read-only: published ${id} passages whose text is in no known seed version
with lib as (select value::jsonb v from public.kv where key=${q('ik:blocks:chapter:library.'+id)}),
k as (select key id, value hs from jsonb_each(${q(JSON.stringify(flat))}::jsonb)),
pub as (select p->>'id' id, p->>'text' t, p->>'role' role from lib, jsonb_array_elements(v->'published') p)
select 'header' as id, (select v->>'updatedAt' from lib) as role, (select v#>>'{review,actor}' from lib) as md5, (select string_agg(h->>'version',',') from lib, jsonb_array_elements(v->'history') h) as len, (select v#>>'{review,at}' from lib) as head
union all
select pub.id, pub.role, md5(pub.t), length(pub.t)::text, left(pub.t,70) from pub left join k on k.id=pub.id
where k.id is null or not (k.hs ? md5(pub.t));
`;
fs.writeFileSync(dir+'/diagnose-passages-'+id+'.sql',sql);console.log(sql.length);
