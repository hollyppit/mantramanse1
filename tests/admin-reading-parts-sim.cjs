// 관리자 "서비스 점검"의 읽기 지표 카드에 문단별 반응 표가 나오는지 확인한다. DOM·네트워크 없이 해당 함수만 떼어 실행한다.
const assert=require('node:assert');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const ctx={window:{},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'report/v2/reading-metrics-summary.js'),'utf8').replace(/typeof window!=='undefined'[?]window:globalThis/,'window'),ctx);
const src=fs.readFileSync(path.join(ROOT,'report/admin/v2-quality.js'),'utf8');
const start=src.indexOf('  // 문단별 반응(맞아요/아니에요)'),end=src.indexOf('  function readingDiagnosticsSection');
assert(start>0&&end>start,'문단별 반응 코드 위치');
vm.runInContext("var esc=function(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c];});};\n"+src.slice(start,end)+'\nthis.engagementSection=engagementSection;this.partLabel=partLabel;',ctx);
const rec=(event,part,chapter='timeline_self_06',reportId='r')=>({reportId,chapter,event,source:'user',...(part?{part}:{})});
const records=[rec('viewed'),rec('helpful'),
 ...Array.from({length:4},(_,i)=>rec('part-agree','el:현침살','timeline_self_06','a'+i)),rec('part-disagree','el:현침살','timeline_self_09','b'),
 ...Array.from({length:2},(_,i)=>rec('part-agree','dt:yong','timeline_wealth_02','c'+i)),...Array.from({length:4},(_,i)=>rec('part-disagree','dt:yong','timeline_wealth_02','d'+i)),
 rec('part-agree','sig:drive','timeline_self_01','e'),rec('part-agree','lens:calendar','timeline_self_21','f'),rec('part-disagree','el:<b>','timeline_self_06','g')];
const html=ctx.engagementSection({engagement:{records,on:true,truncated:false}});
assert(html.includes('문단별 반응 (내 얘기 같나요?)'),'표 제목');
assert(html.includes('<td>현침살</td><td>사주 요소 문장</td><td>4</td><td>1</td><td>5</td><td>80%</td>'),'현침살 행: '+html.slice(html.indexOf('현침살')-20,html.indexOf('현침살')+120));
assert(/<tr style="background:#c0392b14"><td>용신 문장<[/]td><td>정밀 보정 문장<[/]td><td>2<[/]td><td>4<[/]td><td>6<[/]td><td>33% · 검토 필요/.test(html),'낮은 동의율 표시');
assert(html.includes('시그니처 · 밀고 나가는 힘')&&html.includes('12개월 테마 달력')&&html.includes('표본 적음'),'라벨·표본 안내');
assert(!html.includes('<b>')||html.indexOf('el:<b>')<0,'이스케이프');assert(html.includes('&lt;b&gt;'),'이스케이프된 키');
assert(html.indexOf('현침살')<html.indexOf('시그니처 · 밀고'),'응답 많은 순서');
const empty=ctx.engagementSection({engagement:{records:[rec('viewed')],on:true,truncated:false}});assert(empty.includes('아직 기록이 없습니다'),'빈 상태');
assert(html.includes('<th>도움 / 구체적 / 설명 부족</th>')&&html.includes('별도 전문가 검토'),'기존 장별 표 유지');
console.log('PASS: admin quality card shows per-paragraph agree/disagree table (labels, counts, agree rate, review flag at n>=5 & <50%, small-sample note, escaping, ordering) while keeping the chapter table');
