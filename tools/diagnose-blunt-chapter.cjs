// Read-only diagnostic SQL: how does the published library of one chapter differ from every known seed version?
//   node tools/diagnose-blunt-chapter.cjs timeline_self_01
const fs=require('fs'),crypto=require('crypto'),id=process.argv[2]||'timeline_self_01',dir='output/blunt-copy-20261021',md5=s=>crypto.createHash('md5').update(s).digest('hex');
const maps={};for(const f of fs.readdirSync(dir+'/baseline-dumps')){const d=JSON.parse(fs.readFileSync(dir+'/baseline-dumps/'+f));const ps=d.chapters[id];if(ps)maps[f.replace(/^dump_|\.json$/g,'')+' ('+d.seedVersion+')']=Object.fromEntries(ps.map(p=>[p.id,md5(p.text)]));}
maps['NEW everyday-all-84-20261021-14']=Object.fromEntries(JSON.parse(fs.readFileSync(dir+'/new.json')).chapters[id].map(p=>[p.id,md5(p.text)]));
const q=s=>"'"+s.replace(/'/g,"''")+"'";
const sql=`-- read-only: compares the published ${id} library with each known seed version
with lib as (select value::jsonb v from public.kv where key=${q('ik:blocks:chapter:library.'+id)}),
pub as (select p->>'id' id, md5(p->>'text') h from lib, jsonb_array_elements(v->'published') p),
bases as (select key as name, value as m from jsonb_each(${q(JSON.stringify(maps))}::jsonb)),
cmp as (select b.name,
 (select count(*) from pub where b.m->>pub.id = pub.h) same_text,
 (select count(*) from pub where b.m ? pub.id and b.m->>pub.id <> pub.h) edited_text,
 (select count(*) from pub where not (b.m ? pub.id)) only_in_db,
 (select count(*) from jsonb_object_keys(b.m) k where not exists(select 1 from pub where pub.id=k)) only_in_seed,
 (select string_agg(id,', ') from (select id from pub where b.m ? pub.id and b.m->>pub.id <> pub.h limit 3) s) sample_edited
 from bases b)
select 'db' as name,(select v->>'version' from lib) as same_text,(select v#>>'{review,seedVersion}' from lib) as edited_text,(select count(*) from pub)::text as only_in_db,(select (v->'draft'=v->'published')::text from lib) as only_in_seed,'(version / seedVersion / published count / draft==published)' as sample_edited
union all select name,same_text::text,edited_text::text,only_in_db::text,only_in_seed::text,sample_edited from cmp;
`;
fs.writeFileSync(dir+'/diagnose-'+id+'.sql',sql);console.log(sql.length);
