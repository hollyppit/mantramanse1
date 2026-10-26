// 종합풀이 20장 개편 준비: 새 챕터 14개의 라이브러리 행 생성 SQL + 게시 카탈로그 변경 SQL을 만든다. 파일만 쓰고 운영 DB에는 아무것도 쓰지 않는다.
//   node prepare-overview.mjs <observedCatalogMd5>
// 출력: output/rebuild-publication-20261026-overview/ {payload, sql/dry, sql/apply, sql/rollback, plan.json}
// 적용은 apply-overview-runner.mjs 로 사용자가 직접(토큰 필요, 입력 확인 있음). 순서: 라이브러리 행 → 카탈로그.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,allEntries,chapterPassages,loadService} from './convert.mjs';
import {textHash,MAX_SCENARIOS,chartPool,chooseScenarios} from './prepare.mjs';

export const OUT=path.join(ROOT,'output','rebuild-publication-20261026-overview');
export const NEW_IDS=Array.from({length:14},(_,i)=>'timeline_self_'+(24+i));
const CATALOG_MD5=/^[a-f0-9]{32}$/.test(process.argv[2]||'')?process.argv[2]:'b23da0b36c95c6689fb7ae8c0414b405';
const q=s=>"$j$"+s+"$j$";
const HASH=x=>`(select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C")) from jsonb_array_elements(${x}) p)`;
const NOW="to_jsonb(to_char(clock_timestamp() at time zone 'utc','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'))";

const {L,S,chapters}=await loadService();
const all=allEntries();
for(const d of ['payload','sql/dry','sql/apply','sql/rollback'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
const pool0=chartPool(3000),plan=[];
for(const id of NEW_IDS){
 const c=chapters.find(x=>x.id===id),es=all.filter(e=>e.chapters[0]===id);
 if(!c||!es.length)throw new Error('missing chapter or entries: '+id);
 const conv=await chapterPassages(c,S.seedPassages(c),es,{L});let passages=L.normalizePassages(conv.passages);
 const pools=[pool0,()=>chartPool(9000,1),()=>[0,1,2,3,4,5].flatMap(k=>chartPool(7000,10+k))];
 let sc=chooseScenarios(L,c,passages,pools);const unreachable=sc.missing.slice();
 if(unreachable.length){passages=passages.filter(p=>!unreachable.includes(p.id));sc=chooseScenarios(L,c,passages,pools);}
 const issues=L.validatePassages(passages,c,[]);
 const scenarios=sc.chosen.map(s=>({sampleId:s.id,sd:s.sd,expectedPassageIds:[...s.ids]}));
 const incoming={passages,scenarios,title:c.title,review:{actor:'claude-editorial',source:'rebuild-20261022-drafts',seedVersion:'rebuild-20261022-drafts-1',engine:L.LIBRARY_VERSION,editorialReviewed:false,human:false,externalExpertApproved:false,providerCalls:0,note:'Unreviewed drafts for the 20-chapter overview (timeline_self_24~37).'}};
 const newHash=textHash(passages),key='ik:blocks:chapter:library.'+id;
 fs.writeFileSync(path.join(OUT,'payload',id+'.json'),JSON.stringify(incoming));
 const guard=`incoming jsonb:=${q(JSON.stringify(incoming))}::jsonb; passages jsonb:=incoming->'passages'; scenarios jsonb;`;
 const checks=`if exists(select 1 from public.kv where key='${key}') then raise exception 'library already exists';end if;
scenarios:=(select jsonb_agg(s||jsonb_build_object('forbiddenPassageIds',(select coalesce(jsonb_agg(p->>'id'),'[]'::jsonb) from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and not ((s->'expectedPassageIds') ? (p->>'id')))) order by n) from jsonb_array_elements(incoming->'scenarios') with ordinality t(s,n));
if jsonb_array_length(scenarios)<2 or jsonb_array_length(scenarios)>${MAX_SCENARIOS} then raise exception 'scenario count';end if;
if exists(select 1 from jsonb_array_elements(scenarios) s where s->'sd' ? 'birth' or s->'sd' ? 'name') then raise exception 'scenario is not anonymous';end if;
if exists(select 1 from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and (not exists(select 1 from jsonb_array_elements(scenarios) s where (s->'expectedPassageIds') ? (p->>'id')) or not exists(select 1 from jsonb_array_elements(scenarios) s where (s->'forbiddenPassageIds') ? (p->>'id')))) then raise exception 'missing positive or counterexample';end if;
`;
 fs.writeFileSync(path.join(OUT,'sql/dry',id+'.sql'),`-- ${id}: READ-ONLY DRY RUN (no write statement)\ndo $run$ declare ${guard}\nbegin\n${checks}raise exception 'DRYRUN-OK % passages %, scenarios %',${q(id)},jsonb_array_length(passages),jsonb_array_length(scenarios);\nend $run$;\n`);
 fs.writeFileSync(path.join(OUT,'sql/apply',id+'.sql'),`-- ${id}: APPLY (creates a new library row; refuses if the key already exists)\ndo $run$ declare ${guard} stamp jsonb:=${NOW}; next jsonb;\nbegin\n${checks}next:=jsonb_build_object('title',${q(c.title)},'version',1,'draft',passages,'published',passages,'scenarios',scenarios,'review',(incoming->'review')||jsonb_build_object('at',stamp),'updatedAt',stamp,'seedVersion','rebuild-20261022-drafts-1','history','[]'::jsonb);\nif not public.reading_compare_and_swap('${key}',null,next::text,null) then raise exception 'concurrent edit';end if;\nend $run$;\n`);
 fs.writeFileSync(path.join(OUT,'sql/rollback',id+'.sql'),`-- ${id}: ROLLBACK (deletes the row only if it is still the version created by this prepare)\ndo $rb$ declare old jsonb;\nbegin\nselect value::jsonb into old from public.kv where key='${key}' for update;\nif old is null then raise exception 'library missing';end if;\nif (old->>'version')::int<>1 or ${HASH("old->'published'")}<>'${newHash}' then raise exception 'changed after creation';end if;\ndelete from public.kv where key='${key}';\nend $rb$;\n`);
 plan.push({chapter:id,kind:'create',entries:es.length,passages:passages.length,validatorIssues:issues.length,droppedForDuplicate:conv.log.droppedForDuplicate.length,prefixed:conv.log.prefixed,scenarios:scenarios.length,uncoveredConditionalPassages:sc.missing.length,droppedUnreachable:unreachable,newHash});
}

// ── 카탈로그: 코드 기본값(seed)의 바뀐 줄만 운영 카탈로그에 덮어쓴다. 새 챕터는 추가, 합친 주제 3개는 끈다. 운영 값이 준비 당시와 다르면(md5) 중단한다.
const seed=globalThis.MantraEditorial.defaults();
const slotIds=new Set(seed.chapters.filter(c=>c.topicId==='self'&&c.state!=='archived').map(c=>c.id));
const folded=new Set(['self','health','creative','remedy']);
const patch=seed.chapters.filter(c=>slotIds.has(c.id)||(c.state==='archived'&&folded.has(c.topicId))).map(c=>({...c,state:c.state==='archived'?'archived':'active'}));
fs.writeFileSync(path.join(OUT,'payload','catalog-patch.json'),JSON.stringify(patch,null,1));
const expectActive=seed.chapters.filter(c=>c.state!=='archived').length,expectAll=seed.chapters.length+0;
const catalogCommon=`prior text; draftv text; old jsonb; patch jsonb:=${q(JSON.stringify(patch))}::jsonb; chs jsonb; tps jsonb; next jsonb; stamp jsonb:=${NOW};`;
const catalogBody=`select value into prior from public.kv where key='ik:editorial:published' for update;
select value into draftv from public.kv where key='ik:editorial:draft' for update;
if prior is null or md5(prior)<>'${CATALOG_MD5}' then raise exception 'published catalog changed since the prepare';end if;
if draftv is distinct from prior then raise exception 'unpublished catalog draft exists';end if;
old:=prior::jsonb;
chs:=(select jsonb_agg(coalesce(c||(select p from jsonb_array_elements(patch) p where p->>'id'=c->>'id'),c) order by n) from jsonb_array_elements(old->'chapters') with ordinality t(c,n))||(select coalesce(jsonb_agg(p),'[]'::jsonb) from jsonb_array_elements(patch) p where not exists(select 1 from jsonb_array_elements(old->'chapters') c where c->>'id'=p->>'id'));
tps:=(select jsonb_agg(case when t->>'id' in ('health','creative','remedy') then t||'{"enabled":false}'::jsonb else t end order by n) from jsonb_array_elements(old->'topics') with ordinality x(t,n));
next:=old||jsonb_build_object('version',(old->>'version')::int+1,'topics',tps,'chapters',chs,'updatedAt',stamp);
if jsonb_array_length(chs)<>jsonb_array_length(old->'chapters')+${NEW_IDS.length} then raise exception 'chapter count';end if;
if (select count(*) from jsonb_array_elements(chs) c where c->>'topicId'='self' and c->>'state'='active')<>${slotIds.size} then raise exception 'self active count';end if;
if exists(select 1 from jsonb_array_elements(chs) c where c->>'topicId' in ('health','creative','remedy') and c->>'state'<>'archived') then raise exception 'folded topic still has live chapters';end if;
if exists(select l from jsonb_array_elements(chs) c, jsonb_array_elements_text(c->'legacyIds') l where c->>'state'<>'archived' group by l having count(*)>1) then raise exception 'duplicate legacy mapping';end if;
`;
fs.writeFileSync(path.join(OUT,'sql/dry','catalog.sql'),`-- catalog: READ-ONLY DRY RUN\ndo $run$ declare ${catalogCommon}\nbegin\n${catalogBody}raise exception 'DRYRUN-OK catalog version % -> %, chapters %, active self %',(old->>'version'),(next->>'version'),jsonb_array_length(chs),(select count(*) from jsonb_array_elements(chs) c where c->>'topicId'='self' and c->>'state'='active');\nend $run$;\n`);
fs.writeFileSync(path.join(OUT,'sql/apply','catalog.sql'),`-- catalog: APPLY (draft and published together; the old catalog is kept in ik:editorial:history as action 'backup-before-overview')\ndo $run$ declare ${catalogCommon} hist jsonb;\nbegin\n${catalogBody}select coalesce(value::jsonb,'[]'::jsonb) into hist from public.kv where key='ik:editorial:history';\nhist:=jsonb_build_array(jsonb_build_object('at',stamp#>>'{}','action','publish','catalog',next),jsonb_build_object('at',stamp#>>'{}','action','backup-before-overview','catalog',old))||hist;\nupdate public.kv set value=next::text,updated_at=now() where key in ('ik:editorial:published','ik:editorial:draft');\nupdate public.kv set value=hist::text,updated_at=now() where key='ik:editorial:history';\nend $run$;\n`);
fs.writeFileSync(path.join(OUT,'sql/rollback','catalog.sql'),`-- catalog: ROLLBACK (restores the catalog saved by the apply; aborts if the catalog changed after it)\ndo $rb$ declare cur jsonb; hist jsonb; bk jsonb;\nbegin\nselect value::jsonb into cur from public.kv where key='ik:editorial:published' for update;\nselect value::jsonb into hist from public.kv where key='ik:editorial:history' for update;\nbk:=(select e->'catalog' from jsonb_array_elements(hist) e where e->>'action'='backup-before-overview' limit 1);\nif bk is null then raise exception 'no backup entry';end if;\nif (cur->>'version')::int<>(bk->>'version')::int+1 then raise exception 'catalog changed after the overview publish';end if;\nupdate public.kv set value=bk::text,updated_at=now() where key in ('ik:editorial:published','ik:editorial:draft');\nend $rb$;\n`);
plan.push({chapter:'catalog',kind:'catalog',patchRows:patch.length,expectedActive:expectActive,expectedTotal:expectAll,observedCatalogMd5:CATALOG_MD5});
fs.writeFileSync(path.join(OUT,'plan.json'),JSON.stringify(plan,null,1));
console.log(JSON.stringify(plan.map(p=>p.kind==='create'?{c:p.chapter,pass:p.passages,sc:p.scenarios,iss:p.validatorIssues,unc:p.uncoveredConditionalPassages,drop:p.droppedUnreachable.length,pre:p.prefixed,dup:p.droppedForDuplicate}:p)));
