// Prepare-only: SQL that republishes the rewritten seed texts into the live reading libraries.
//   node tools/dump-seed-passages.cjs <HEAD copy> output/blunt-copy-20261021/old.json   (before the rewrite)
//   node tools/dump-seed-passages.cjs .           output/blunt-copy-20261021/new.json   (after)
//   node tools/prepare-blunt-copy-publication.cjs
// Per chapter, a passage is replaced only when its live published text still equals the old seed text.
// Passages edited in admin, unpublished drafts, or changed conditions abort/skip; nothing else is touched
// (ids, conditions, sources, scenarios). Previous edition is appended to history. Rollback SQL is generated too.
const fs=require('fs'),assert=require('assert/strict');
const dir='output/blunt-copy-20261021',old=JSON.parse(fs.readFileSync(dir+'/old.json')),next=JSON.parse(fs.readFileSync(dir+'/new.json'));
const q=x=>"'"+String(x).replace(/'/g,"''")+"'";
const meta=p=>JSON.stringify({id:p.id,role:p.role,kind:p.kind,ruleIds:p.ruleIds,when:p.when,unless:p.unless,adviceKey:p.adviceKey});
fs.mkdirSync(dir+'/sql',{recursive:true});fs.mkdirSync(dir+'/rollback',{recursive:true});
const body=(key,changes,seed,direction)=>`do $publish$ declare prior text; cur jsonb; ch jsonb:=${q(JSON.stringify(changes))}::jsonb; pub jsonb; nxt jsonb; replaced int; wanted int:=jsonb_array_length(ch); begin
select value into prior from public.kv where key=${q(key)} for update;
if prior is null then raise exception 'missing library';end if;
cur:=prior::jsonb;
if cur->'draft' is distinct from cur->'published' then raise exception 'unpublished admin edits; review required';end if;
select jsonb_agg(case when m.nw is not null and p->>'text'=m.od then p||jsonb_build_object('text',m.nw) else p end order by t.ord) into pub
 from jsonb_array_elements(cur->'published') with ordinality as t(p,ord)
 left join (select value->>'id' id,value->>'old' od,value->>'new' nw from jsonb_array_elements(ch)) m on m.id=p->>'id';
select count(*) into replaced from jsonb_array_elements(pub) with ordinality a(p,ord) join jsonb_array_elements(cur->'published') with ordinality b(p,ord) using(ord) where a.p is distinct from b.p;
if replaced=0 then raise exception 'nothing to replace: library already changed (% expected)',wanted;end if;
if replaced<>wanted then raise notice '% of % passages were edited in admin and kept as they are',wanted-replaced,wanted;end if;
nxt:=cur||jsonb_build_object('version',(cur->>'version')::int+1,'draft',pub,'published',pub,'updatedAt',clock_timestamp(),
 'review',coalesce(cur->'review','{}'::jsonb)||jsonb_build_object('seedVersion',${q(seed)},'editorialReviewed',true,'externalExpertApproved',false,'scope','plain-spoken-copy-no-new-fortune-rules','providerCalls',0),
 'history',jsonb_build_array(jsonb_build_object('version',(cur->>'version')::int,'draft',cur->'draft','published',cur->'published','scenarios',cur->'scenarios','review',cur->'review','at',clock_timestamp()))||coalesce(cur->'history','[]'::jsonb));
if not public.reading_compare_and_swap(${q(key)},prior,nxt::text,null) then raise exception 'concurrent edit';end if;
end $publish$;`;
const plan=[];let total=0;
for(const id of Object.keys(next.chapters)){
  const a=old.chapters[id],b=next.chapters[id];assert(a&&b,id);
  assert.equal(a.length,b.length,id+' passage count');
  const changes=[];
  a.forEach((p,i)=>{const n=b[i];assert.equal(meta(p),meta(n),id+' conditions changed at '+p.id);if(p.text!==n.text)changes.push({id:p.id,old:p.text,new:n.text});});
  if(!changes.length)continue;
  const key='ik:blocks:chapter:library.'+id;
  fs.writeFileSync(`${dir}/sql/${id}.sql`,body(key,changes,next.seedVersion));
  fs.writeFileSync(`${dir}/rollback/${id}.sql`,body(key,changes.map(c=>({id:c.id,old:c.new,new:c.old})),old.seedVersion));
  plan.push({chapter:id,changed:changes.length,of:a.length});total+=changes.length;
}
fs.writeFileSync(dir+'/sql/index.json',JSON.stringify(plan.map(p=>p.chapter+'.sql')));
fs.writeFileSync(dir+'/plan.json',JSON.stringify({from:old.seedVersion,to:next.seedVersion,chapters:plan},null,2));
console.log(JSON.stringify({chapters:plan.length,passages:total,from:old.seedVersion,to:next.seedVersion}));
