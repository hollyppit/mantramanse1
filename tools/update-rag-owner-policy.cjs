const fs=require('node:fs'),assert=require('node:assert/strict');
function edit(p,fn){const s=fs.readFileSync(p,'utf8'),n=fn(s);assert.notEqual(s,n);fs.writeFileSync(p,n);}
edit('functions/_rag-state.js',s=>s.replace('autoPublish:false, legacyOnly','autoPublish:false, autoApproveChanges:false, legacyOnly'));
edit('functions/_rag-runner.js',s=>s.replace('&&s.config.enabled&&j.state','&&s.config.enabled&&(!candidate.validation.changeAuthorized||s.config.autoApproveChanges)&&j.state'));
edit('report/admin/v2-agentic-rag.js',s=>{
 s=s.replaceAll('저위험 자동 게시','검증 통과 자동 게시').replaceAll('검증된 저위험 지식 자동 게시','검증 통과 지식 자동 게시').replace("['enabled','autoPublish','legacyOnly']","['enabled','autoPublish','autoApproveChanges','legacyOnly']");
 const needle='<label><input type="checkbox" name="legacyOnly"';assert(s.includes(needle));
 return s.replace(needle,`<label><input type="checkbox" name="autoApproveChanges" '+(c.autoApproveChanges?'checked':'')+'> 근거 검증을 통과한 기존 결론 변경도 자동 승인</label> `+needle);
});
