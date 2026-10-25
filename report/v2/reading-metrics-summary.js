(function(root){'use strict';
function summarizeMetrics(records){const reports=new Set(),chapters={},parts={},expert={accepted:0,revise:0};
 for(const r of records){if(r.source==='expert'){expert[r.event==='expert-accepted'?'accepted':'revise']++;continue;}
  reports.add(r.reportId);const c=chapters[r.chapter] || (chapters[r.chapter]={views:0,completed:0,incomplete:0,feedback:{helpful:0,specific:0,unclear:0}});
  if(r.part&&/^part-(agree|disagree)$/.test(r.event)){const k=r.part,q=parts[k]||(parts[k]={agree:0,disagree:0});q[r.event==='part-agree'?'agree':'disagree']++;continue;}
  if(r.event==='viewed')c.views++;else if(r.event==='completed')c.completed++;else if(r.event==='left-incomplete')c.incomplete++;else if(r.event in c.feedback)c.feedback[r.event]++;
 }
 Object.values(chapters).forEach(c=>{c.completionRate=c.views?c.completed/c.views:null;c.exitRate=c.views?c.incomplete/c.views:null;});
 Object.values(parts).forEach(q=>{const n=q.agree+q.disagree;q.agreeRate=n?q.agree/n:null;});
 return {reports:reports.size,records:records.length,chapters,parts,expert,note:'완독·미완료는 브라우저 관찰값입니다. 피드백과 전문가 검토는 해석의 예측 정확도를 입증하지 않습니다.'};
}

root.MantraReadingMetrics={summarize:summarizeMetrics};})(typeof window!=='undefined'?window:globalThis);
