// 리포트 일관성 점검: 가상 명식마다 84개 장(창작 제외)을 실제 합성 경로로 만든 뒤
//  ① 한 리포트 안에서 같은 문장이 되풀이되는지, ② 서로 반대되는 경향 문장이 함께 나오는지를 센다.
// 반대 경향이 함께 나온다고 틀린 풀이는 아니다(사람은 양면이 있다). 편집자가 맥락을 확인할 목록을 만드는 도구다.
// 사용: node tools/audit-reading-consistency.mjs [명식 수=30]   결과: docs/READING_CONSISTENCY_AUDIT.md, output/consistency-audit/report.json
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const imp=p=>import(pathToFileURL(path.join(ROOT,p)).href);
const N=Math.max(5,Math.min(200,Number(process.argv[2])||30));
const {allEntries,chapterPassages,loadService}=await imp('editorial/rebuild-20261022/publish/convert.mjs');
const {sampleCharts}=await imp('editorial/rebuild-20261022/publish/verify.mjs');
const {L,S,chapters}=await loadService();const entries=allEntries();
// 반대 경향 사전: [이름, A, B]
export const OPPOSITES=[
 ['결정 속도',/(결단이 빠르|결정이 빠르|판단이 빠르|결정은 빠르)/,/(결정을 못|결정이 늦|결정이 오래 걸|판단이 오래 걸|결정을 미루)/],
 ['말의 양',/(말수가 적|말을 아끼|말이 적)/,/(말이 앞서|말이 많|말부터 나가)/],
 ['혼자/사람',/(혼자 있는 시간이 (힘|편|에너지)|혼자 일하는 시간|혼자 쉬는 시간이 곧)/,/(사람을 만나야 힘|사람들 앞에서 에너지|분위기를 이끄는|사람 앞에 서서)/],
 ['시작 속도',/(시작이 늦|시작을 미루|출발이 늦|출발 날짜를 자꾸 미뤄)/,/(시작이 빠르|출발이 빠르|먼저 움직|몸이 먼저 나가)/],
 ['돈 쓰기',/(아끼며 지키|알뜰하게|씀씀이를 줄이|큰돈은 잘 안 쓰)/,/(크게 쓰|통이 크|시원하게 쓰)/],
 ['감정 표현',/(감정을 드러내지 않|속으로 삼키|티 내지 않|표정이 크게 변하지 않)/,/(표정에 마음이 그대로|감정이 그대로 실려|표정과 말에 마음이 그대로)/]
];
const sentences=t=>String(t||'').split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>x.length>=12);
const norm=t=>t.replace(/[\s\p{P}\p{S}]/gu,'');
const libs=[];
for(const c of chapters){if(c.topicId==='creative')continue;const es=entries.filter(e=>e.chapters[0]===c.id);if(!es.length)continue;const conv=await chapterPassages(c,S.seedPassages(c),es,{L});libs.push([c,conv.passages]);}
const sds=sampleCharts(N,ROOT),rows=[],repeatTop=new Map(),oppTotals=Object.fromEntries(OPPOSITES.map(o=>[o[0],0])),oppExamples=Object.fromEntries(OPPOSITES.map(o=>[o[0],[]]));
for(const [k,sd] of sds.entries()){
 const seen=new Map(),texts=[];
 for(const [c,published] of libs){let out;try{out=L.composeReviewed({clean:{sd,chapter:{paragraphs:L.ROLES.map(role=>({id:role,role}))}},contract:c,analysis:{claims:[]},library:{version:1,published}});}catch{continue;}
  for(const p of out.result.paragraphs){if(['evidence','why'].includes(p.role))continue;for(const s of sentences(p.text)){const n=norm(s);texts.push([c.id,s]);(seen.get(n)||seen.set(n,{s,chapters:new Set()}).get(n)).chapters.add(c.id);}}}
 let repeated=0;for(const v of seen.values())if(v.chapters.size>1){repeated++;repeatTop.set(v.s,(repeatTop.get(v.s)||0)+1);}
 const opp={};for(const [name,A,B] of OPPOSITES){const a=texts.filter(([,s])=>A.test(s)),b=texts.filter(([,s])=>B.test(s));if(a.length&&b.length){opp[name]=1;oppTotals[name]++;if(oppExamples[name].length<3)oppExamples[name].push({chart:k,a:a[0][0]+': '+a[0][1],b:b[0][0]+': '+b[0][1]});}}
 rows.push({chart:k,sentences:texts.length,repeatedAcrossChapters:repeated,opposites:Object.keys(opp)});
}
const top=[...repeatTop].sort((a,b)=>b[1]-a[1]).slice(0,25);
const report={generatedAt:new Date().toISOString(),charts:N,chapters:libs.length,avgSentences:Math.round(rows.reduce((x,r)=>x+r.sentences,0)/rows.length),avgRepeated:+(rows.reduce((x,r)=>x+r.repeatedAcrossChapters,0)/rows.length).toFixed(1),oppositeShare:Object.fromEntries(Object.entries(oppTotals).map(([k,v])=>[k,+(v/N).toFixed(2)])),topRepeated:top,oppositeExamples:oppExamples,rows};
fs.mkdirSync(path.join(ROOT,'output/consistency-audit'),{recursive:true});fs.writeFileSync(path.join(ROOT,'output/consistency-audit/report.json'),JSON.stringify(report,null,1));
const md=[`# 리포트 일관성 점검 (${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})})`,'',`가상 명식 ${N}명 × ${libs.length}개 장(창작 제외)을 실제 합성 경로로 만들어 점검했어요. AI·네트워크 호출은 없어요.`,'',
 `- 한 리포트의 평균 문장 수: ${report.avgSentences}`,`- 한 리포트 안에서 두 장 이상에 같은 문장이 나온 수(평균): ${report.avgRepeated}`,'',
 '## 서로 반대되는 경향이 함께 나온 리포트 비율','','| 항목 | 비율 |','|---|---|',...Object.entries(report.oppositeShare).map(([k,v])=>`| ${k} | ${Math.round(v*100)}% |`),'',
 '반대 경향이 함께 나온다고 틀린 풀이는 아니에요. 장마다 다른 상황(일·관계·돈)을 말하는지, 같은 상황에서 정반대로 말하는지를 편집자가 확인해야 해요.','',
 '## 반대 경향 예시','',...Object.entries(oppExamples).flatMap(([k,xs])=>xs.length?[`### ${k}`,...xs.map(x=>`- 명식 ${x.chart}: ${x.a} ↔ ${x.b}`),'']:[]),
 '## 여러 장에 반복된 문장 상위 25','','| 문장 | 반복된 리포트 수 |','|---|---|',...top.map(([s,n])=>`| ${s.replace(/[|]/g,'/')} | ${n} |`),''].join('\n');
fs.writeFileSync(path.join(ROOT,'docs/READING_CONSISTENCY_AUDIT.md'),md);
console.log(JSON.stringify({charts:N,chapters:libs.length,avgSentences:report.avgSentences,avgRepeated:report.avgRepeated,oppositeShare:report.oppositeShare}));
