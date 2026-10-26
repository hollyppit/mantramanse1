// 명리 전문가 검수 자료 내보내기: 풀이에 쓰는 모든 사전 문안을 "무엇을 근거로 어떤 문장이 나가는지" 표(CSV, 엑셀에서 바로 열림)로 만든다.
// 검수자는 판정 열(적합/수정/삭제)과 의견 열만 채워 돌려주면 된다. 운영 DB·네트워크에 접근하지 않는다.
// 사용: node tools/export-review-packet.mjs   결과: output/review-packet/*.csv (+ 요약 summary.json)
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'output/review-packet');
const req=createRequire(path.join(ROOT,'x.js')),imp=p=>import(pathToFileURL(path.join(ROOT,p)).href);
for(const f of ['chart-lines-stars','chart-lines-rest','chart-lines-fill','chart-lines','signature-data'])req(path.join(ROOT,'report/v2/'+f+'.js'));
const CL=globalThis.MantraChartLines,SIG=globalThis.MantraSignatureData;
const {allEntries}=await imp('editorial/rebuild-20261022/index.mjs');const DR=await imp('functions/_detail-reading.js');
const cell=v=>{const t=String(v==null?'':v);return /[",\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;};
const write=(name,head,rows)=>{fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,name),'﻿'+[head,...rows].map(r=>r.map(cell).join(',')).join('\r\n'));return rows.length;};
const REVIEW=['판정(적합/수정/삭제)','검수 의견'];
const conds=c=>Object.entries(c||{}).map(([k,v])=>k+'='+(Array.isArray(v)?v.join('|'):Object.entries(v).map(([a,b])=>a+':'+b).join('|'))).join('; ');
const counts={};
// 1) 장별 본문 문안(조건 → 핵심·근거·사례·장단점·실천)
counts.entries=write('1_chapter_entries.csv',['id','장','조건(when)','제외(unless)','핵심(후킹)','근거','생활 사례','강점','약점','실천',...REVIEW],
 allEntries.filter(e=>!e.id.startsWith('pilot')).map(e=>[e.id,e.chapters[0],conds(e.when),conds(e.unless),e.core,e.basis,e.example,e.positive,e.negative,e.advice,'','']));
// 2) 정밀 보정 문장(일간·월지·용신 × 주제 × 변형)
const dr=[];for(const axis of Object.keys(DR.DICT))for(const k of Object.keys(DR.DICT[axis]))for(const t of Object.keys(DR.DICT[axis][k]))DR.DICT[axis][k][t].forEach((x,i)=>dr.push([{dm:'일간',mb:'월지',yong:'용신'}[axis],k,t,i+1,x,'','']));
counts.detail=write('2_detail_sentences.csv',['축','값','주제','변형','문장',...REVIEW],dr);
// 3) 사주 요소 풀이(신살·12신살·관계·십성 × 장)
const cl=[];for(const kind of Object.keys(CL.TABLE))for(const name of Object.keys(CL.TABLE[kind]))for(const [key,body] of Object.entries(CL.TABLE[kind][name]))cl.push([{star:'신살',s12:'12신살',rel:'글자 관계',tg:'십성(20% 이상)'}[kind],(CL.DISPLAY[name]||name)+(CL.DISPLAY[name]?'('+name+')':''),'timeline_'+key,CL.prefix(kind,name)+' '+body,'','']);
counts.chartLines=write('3_element_lines.csv',['종류','요소','장','문장',...REVIEW],cl);
// 4) 시그니처: 요소→성향군 매핑, 성향군 문장, 조합 문장
const map=[];for(const kind of Object.keys(SIG.MAP))for(const [name,fam] of Object.entries(SIG.MAP[kind]))map.push([kind,name,fam,SIG.F[fam].label,'','']);
counts.signatureMap=write('4_signature_mapping.csv',['종류','요소','성향군','성향군 이름',...REVIEW],map);
const fam=[];for(const f of SIG.ORDER){const x=SIG.F[f];fam.push([f,x.label,'핵심',x.core,'','']);for(const [t,v] of Object.entries(x.topic))fam.push([f,x.label,'주제:'+t,v,'','']);x.practice.forEach((v,i)=>fam.push([f,x.label,'실천'+(i+1),v,'','']));}
for(const [k,v] of Object.entries(SIG.P))fam.push([k,'조합','조합',v,'','']);
counts.signatureText=write('5_signature_text.csv',['성향군','이름','구분','문장',...REVIEW],fam);
// 6) 이 사주에서만 읽히는 포인트(교차 통찰) 문장: 관점(자기·재물·일·인연)별로 어떤 사주 값에서 어떤 문장이 나가는지
for(const f of ['reading-insight-data-1','reading-insight-data-2','reading-insight-data-3','reading-insight-data-4'])req(path.join(ROOT,'report/v2/'+f+'.js'));
{const ID=globalThis.ReportV2.ReadingInsightData,LENS={self:'성향·삶',wealth:'재물',career:'일',love:'인연'},rows=[];
 const walk=(table,path,lens)=>{for(const [k,v] of Object.entries(table)){if(typeof v==='string')rows.push([path,LENS[lens],k,v,'','']);else if(Array.isArray(v))v.forEach((x,i)=>rows.push([path,LENS[lens],k+'#'+(i+1),x,'','']));else if(v&&typeof v==='object')walk(v,path,lens);}};
 for(const [name,tab] of Object.entries(ID))for(const lens of Object.keys(LENS)){if(tab[lens])walk(tab[lens],name,lens);if(tab.POS&&tab.POS[lens])walk(tab.POS[lens],name+'.POS',lens);if(tab.TYPE&&tab.TYPE[lens])walk(tab.TYPE[lens],name+'.TYPE',lens);}
 counts.insight=write('6_insight_text.csv',['사전','관점','키','문장',...REVIEW],rows);}
fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({generatedAt:new Date().toISOString(),counts},null,1));
console.log(JSON.stringify(counts));
