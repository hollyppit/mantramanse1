// 검수 자료 내보내기와 일관성 점검 도구가 실제로 돌고, 기대한 형태의 결과를 남기는지 확인한다. AI·네트워크 호출 없음.
const assert=require('node:assert');const path=require('node:path');const fs=require('node:fs');const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const run=(args)=>execFileSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',timeout:600000}).trim().split('\n').pop();
const packet=JSON.parse(run(['tools/export-review-packet.mjs']));
assert(packet.entries>=900&&packet.detail>=680&&packet.chartLines>=400&&packet.signatureMap>=70&&packet.signatureText>=180,'검수 자료 행 수 '+JSON.stringify(packet));
const csv=fs.readFileSync(path.join(ROOT,'output/review-packet/3_element_lines.csv'),'utf8');
assert(csv.startsWith('﻿종류,요소,장,문장,판정(적합/수정/삭제),검수 의견'),'CSV 머리글과 BOM');assert(csv.includes('도화살(연살)'),'도화살 표기');
const audit=JSON.parse(run(['tools/audit-reading-consistency.mjs','5']));
assert.equal(audit.charts,5);assert(audit.chapters>=70,'장 수');assert(audit.avgSentences>200,'문장 수');assert(typeof audit.avgRepeated==='number');
assert(Object.keys(audit.oppositeShare).length>=6,'반대 경향 항목');
const md=fs.readFileSync(path.join(ROOT,'docs/READING_CONSISTENCY_AUDIT.md'),'utf8');assert(md.includes('서로 반대되는 경향')&&md.includes('여러 장에 반복된 문장'));
console.log(`PASS: review packet ${JSON.stringify(packet)}; consistency audit runs (${audit.chapters} chapters, avg ${audit.avgSentences} sentences, avg repeated ${audit.avgRepeated}); AI/network 0`);
