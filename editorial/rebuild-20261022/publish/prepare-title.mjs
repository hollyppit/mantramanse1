// 운영 카탈로그에서 챕터 이름만 바꾸는 SQL을 만든다(읽기 전용 준비물). 현재: timeline_self_28 → '대인관계 궁합'.
//   node prepare-title.mjs [관찰한 카탈로그 md5]     → output/rebuild-publication-20261026-title/sql/{dry,apply,rollback}/catalog.sql
// 쓰기는 run-sql.mjs 를 사용자가 직접 실행한다(dry → apply). md5가 달라졌거나 미게시 초안이 있으면 멈춘다.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './convert.mjs';
const OUT=path.join(ROOT,'output','rebuild-publication-20261026-title');
const MD5=process.argv.find(a=>/^[a-f0-9]{32}$/.test(a))||'815d59b9ef57c613b8930716dfe1b187';
const RENAMES={timeline_self_28:'대인관계 궁합'};
const patch=Object.entries(RENAMES).map(([id,title])=>({id,title,question:title}));
for(const d of ['dry','apply','rollback'])fs.mkdirSync(path.join(OUT,'sql',d),{recursive:true});
const q=s=>'$j$'+s+'$j$';
const NOW="to_jsonb(to_char(clock_timestamp() at time zone 'utc','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'))";
const decl=`prior text; draftv text; old jsonb; patch jsonb:=${q(JSON.stringify(patch))}::jsonb; chs jsonb; next jsonb; stamp jsonb:=${NOW};`;
const body=`select value into prior from public.kv where key='ik:editorial:published' for update;
select value into draftv from public.kv where key='ik:editorial:draft' for update;
if prior is null or md5(prior)<>'${MD5}' then raise exception 'published catalog changed since the prepare';end if;
if draftv is distinct from prior then raise exception 'unpublished catalog draft exists';end if;
old:=prior::jsonb;
chs:=(select jsonb_agg(c||coalesce((select jsonb_build_object('title',p->>'title','question',p->>'question') from jsonb_array_elements(patch) p where p->>'id'=c->>'id'),'{}'::jsonb) order by n) from jsonb_array_elements(old->'chapters') with ordinality t(c,n));
if jsonb_array_length(chs)<>jsonb_array_length(old->'chapters') then raise exception 'chapter count';end if;
next:=old||jsonb_build_object('version',(old->>'version')::int+1,'chapters',chs,'updatedAt',stamp);
`;
fs.writeFileSync(path.join(OUT,'sql/dry/catalog.sql'),`-- catalog title: READ-ONLY DRY RUN\ndo $run$ declare ${decl}\nbegin\n${body}raise exception 'DRYRUN-OK catalog version % -> %, renamed %',(old->>'version'),(next->>'version'),jsonb_array_length(patch);\nend $run$;\n`);
fs.writeFileSync(path.join(OUT,'sql/apply/catalog.sql'),`-- catalog title: APPLY (draft and published together; old catalog kept in ik:editorial:history as action 'backup-before-title-20261026')\ndo $run$ declare ${decl} hist jsonb;\nbegin\n${body}select coalesce(value::jsonb,'[]'::jsonb) into hist from public.kv where key='ik:editorial:history';\nhist:=jsonb_build_array(jsonb_build_object('at',stamp#>>'{}','action','publish','catalog',next),jsonb_build_object('at',stamp#>>'{}','action','backup-before-title-20261026','catalog',old))||hist;\nupdate public.kv set value=next::text,updated_at=now() where key in ('ik:editorial:published','ik:editorial:draft');\nupdate public.kv set value=hist::text,updated_at=now() where key='ik:editorial:history';\nend $run$;\n`);
fs.writeFileSync(path.join(OUT,'sql/rollback/catalog.sql'),`-- catalog title: ROLLBACK\ndo $rb$ declare cur jsonb; hist jsonb; bk jsonb;\nbegin\nselect value::jsonb into cur from public.kv where key='ik:editorial:published' for update;\nselect value::jsonb into hist from public.kv where key='ik:editorial:history' for update;\nbk:=(select e->'catalog' from jsonb_array_elements(hist) e where e->>'action'='backup-before-title-20261026' limit 1);\nif bk is null then raise exception 'no backup entry';end if;\nif (cur->>'version')::int<>(bk->>'version')::int+1 then raise exception 'catalog changed after the title publish';end if;\nupdate public.kv set value=bk::text,updated_at=now() where key in ('ik:editorial:published','ik:editorial:draft');\nend $rb$;\n`);
console.log('prepared',OUT,'md5',MD5);
