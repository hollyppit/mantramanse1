const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/rebuild-20261022');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function walk(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];}
(async()=>{
 process.chdir(root);fs.mkdirSync(out,{recursive:true});global.window=globalThis;
 vm.runInThisContext(fs.readFileSync('report/v2/reading-catalog.js','utf8'));
 const catalog=MantraEditorial.defaults(),{seedPassages,SEED_VERSION}=await import('../functions/_reading-library-seed.js');
 const sources=[...walk('functions'),...walk('report'),...walk('config'),...walk('supabase'),'engine.js','shared-core.js','index.html'].filter(f=>/\.(js|html|css|sql|json)$/.test(f)&&!/(secrets|credentials|node_modules)/i.test(f));
 const files=[],literals=[];
 for(const file of sources){const buf=fs.readFileSync(file);const dest=path.join(out,'source-backup',file);if(fs.existsSync(dest)&&hash(fs.readFileSync(dest))!==hash(buf))throw Error('immutable-backup-exists:'+file);fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest))fs.writeFileSync(dest,buf);files.push({file,bytes:buf.length,sha256:hash(buf)});
  buf.toString('utf8').split(/\r?\n/).forEach((line,i)=>{if(/[가-힣]/.test(line)&&/["'`]/.test(line))literals.push({file,line:i+1,characters:line.length,source:line.slice(0,400),truncated:line.length>400});});
 }
 const chapters=catalog.chapters.map(c=>({id:c.id,title:c.title,topic:c.topicId,question:c.question,requiredEvidence:c.requiredEvidence,sourceRuleIds:c.sourceRuleIds,passages:seedPassages(c)}));
 const rows=chapters.flatMap(c=>c.passages.map(p=>({...p,chapter:c.id}))),byText=new Map();
 for(const p of rows){const k=p.text.replace(/\s+/g,'');const xs=byText.get(k)||[];xs.push({chapter:p.chapter,id:p.id,role:p.role});byText.set(k,xs);}
 const repeated=[...byText].filter(([,xs])=>new Set(xs.map(x=>x.chapter)).size>1).map(([text,uses])=>({text,uses})).sort((a,b)=>b.uses.length-a.uses.length);
 const findings=rows.flatMap(p=>{
  const codes=[];if(!Object.keys(p.when||{}).length&&p.kind!=='fiction')codes.push('unconditional-guide-review');
  if(p.kind==='guide'&&!p.ruleIds.length)codes.push('guide-without-source-rule');
  if(/기운이|가능성을 열|균형을 찾|자신을 믿|잠재력/.test(p.text))codes.push('abstract-word-review');
  if(/반드시.*(?:성공|사고|질병|결혼)|무조건|확실히.*(?:부자|성공)/.test(p.text))codes.push('certainty-review');
  return codes.length?[{chapter:p.chapter,id:p.id,codes}]:[];
 });
 const result={at:'2026-10-22',scope:'Local source and seed inventory; not live DB or rendered-user-copy verification',seedVersion:SEED_VERSION,totals:{files:files.length,literalSourceLines:literals.length,chapters:chapters.length,passages:rows.length,repeatedAcrossChapters:repeated.length},files,chapters,findings,repeated};
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(out,'literal-source-index.json'),JSON.stringify(literals,null,2));
 fs.writeFileSync(path.join(out,'baseline-manifest.json'),JSON.stringify({files,seedVersion:SEED_VERSION},null,2));
 const {entries}=await import('../editorial/rebuild-20261022/content.mjs');fs.writeFileSync(path.join(out,'pilot.json'),JSON.stringify(entries,null,2));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cards=entries.map(e=>{const baseline=chapters.find(c=>e.chapters.includes(c.id));return '<article data-text="'+esc(JSON.stringify(e))+'"><h2>'+esc(baseline.title)+' · '+esc(e.id)+'</h2><p class="notice">검수 전 초안 · 조건부 생활 해설 · 운영 미적용</p><details><summary>적용 조건과 기존 문구 비교</summary><pre>'+esc(JSON.stringify(e.when,null,2))+'</pre><h3>기존 동일 조건 후보</h3>'+baseline.passages.filter(p=>p.role==='title'&&JSON.stringify(p.when)===JSON.stringify(e.when)).map(p=>'<p>'+esc(p.text)+'</p>').join('')+'</details>'+[['핵심 진단','core'],['명리 조건과 해석 범위','basis'],['생활 사례','example'],['유리한 상황','positive'],['불리한 상황','negative']].map(([label,k])=>'<h3>'+label+'</h3><p contenteditable="true" data-id="'+e.id+'" data-key="'+k+'">'+esc(e[k])+'</p>').join('')+'<h3>상황별 적용</h3>'+Object.entries(e.applications).map(([k,t])=>'<p><b>'+({employee:'직장인',business:'사업가',freelance:'프리랜서'}[k])+'</b> '+esc(t)+'</p>').join('')+'<h3>시기 변화의 근거 범위</h3><p>'+esc(e.timing)+'</p><h3>현실적인 행동 제안</h3><p contenteditable="true" data-id="'+e.id+'" data-key="advice">'+esc(e.advice)+'</p></article>';}).join('');
 fs.writeFileSync(path.join(out,'review.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>만트라 풀이 시범 검수</title><style>body{font:17px/1.85 system-ui;background:#f4f1ea;color:#24251f;max-width:850px;margin:32px auto;padding:18px}article{background:white;margin:32px 0;padding:28px;border-radius:16px}h2{font-size:23px}h3{font-size:16px;color:#686247;margin-bottom:4px}p{margin-top:5px}.notice{color:#8c4e20}input{padding:12px;width:70%}button{padding:12px}pre{white-space:pre-wrap}[contenteditable]{outline:1px dashed #bbb;padding:10px}</style><h1>대표 3개 장 시범 검수</h1><p>6개 조건별 초안입니다. 점선 문단은 수정 후 JSON으로 내려받을 수 있습니다. 파일을 다시 열면 원본으로 돌아갑니다. 이 화면의 수정은 운영 DB에 저장되지 않습니다.</p><input id="search" placeholder="챕터·조건·문구 검색"><button id="save">수정본 JSON 저장</button>'+cards+'<script>const entries='+JSON.stringify(entries).replace(/</g,'\u003c')+';document.querySelector("#search").oninput=e=>document.querySelectorAll("article").forEach(a=>a.hidden=!a.dataset.text.includes(e.target.value));document.querySelector("#save").onclick=()=>{document.querySelectorAll("[data-id]").forEach(p=>entries.find(e=>e.id===p.dataset.id)[p.dataset.key]=p.textContent);const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(entries,null,2)],{type:"application/json"}));a.download="mantra-pilot-review.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};</script></html>');
 console.log(JSON.stringify(result.totals));
})().catch(e=>{console.error(e);process.exitCode=1;});
