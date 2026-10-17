// Explicit editorial sentences, applied after provider review and before source edits.
const fs=require('node:fs'),file='output/ux-writing/copy-review.json',d=JSON.parse(fs.readFileSync(file));
const sentences={
 '3af1089efa4edc5d':'좋아하는 사람을 보호하고 책임지는 방식으로 마음을 표현할 수 있습니다. 다만 감정을 직접 말하지 않으면 상대가 무심하게 느낄 수 있습니다. 비슷하게 주도권을 원할 때 어떤 결정부터 함께 정할지 이야기해보세요.',
 '69c66d4651690080':'남의 방식을 따르기보다 스스로 방법을 정하려는 모습으로 읽을 수 있습니다.',
 '4b3b86c8a72e5f07':'머릿속의 생각을 실제 결과물로 옮기려는 모습으로 읽을 수 있습니다.',
 'ae4f0c7e7231aa25':'떠오른 생각을 말이나 결과물로 표현하려는 편으로 해석됩니다.',
 'ee2bbbbbac3b34ad':'다정하게 배려하면서도 작은 반응을 세밀하게 살피는 모습',
 '5dd772efb19f430f':'목표를 크게 잡고 자신의 힘을 시험해보려는 모습',
 'f53c94a2e8da2af7':'주변의 차이를 세밀하게 살피고 생각을 정리하는 모습',
 '7dd7c0aa43ecf31a':'확인할 시간이 필요해 속마음을 쉽게 드러내지 않는 모습',
 '756ddf7e97212861':'자신의 생각과 관심을 솔직하게 표현하는 모습',
 'e9110bc4d0817a8d':'마음이 앞서 반응의 속도를 조절할 필요가 있는 모습',
 'af43d45f0b07c71d':'편안한 분위기에서 정을 나누려는 모습',
 '66a8b1af983a2349':'생각난 방법을 빠르게 시도해보려는 모습',
 '420469c2bf37e736':'일을 정리하고 약속한 기준을 지키려는 모습',
 '83a0c0f8d70eb06b':'가까운 사람과의 약속을 중요하게 여기는 모습',
 '1063f2a381035c70':'다른 사람의 생각을 받아들이며 가능성을 살피려는 모습',
 '28a075f02de74a99':'편안함에 머무를 때 할 일과 경계가 흐려질 수 있는 모습',
 'a21c413035ab8004':'한참 뒤 질문을 바꿨습니다. “저는 오늘 함께 이야기하고 싶었어요. 오늘은 어땠나요?” 상대의 마음을 짐작하기보다 자신의 마음을 먼저 작은 문장으로 꺼냈습니다.',
 '2eadfcb628322943':'모든 사람에게는,<br>자신에게 맞는 때가 있습니다.',
 'cf32364e7e13d018':'개의 챕터를 살펴봤습니다.<br>타고난 특징부터 운의 흐름,<br>일상에서 시도할 행동까지 정리했습니다.</p>',
 '9b437e066bc5bf54':'밤에 윤은 계산기 옆 포스트잇에 목표를 적었습니다. 이 계약을 끝내고 가게를 한 단계 키워보겠다는 계획이었습니다. {신념}',
 'f98bc291e4e5dd39':'{약점} 윤은 대답 대신 계산기를 다시 켰습니다. 전기료와 포장비, 다시 만든 음료 비용을 적었습니다. 매출 아래 숨어 있던 항목이 하나둘 늘어났습니다.',
 '88f1c05efb1ff4bf':'{각성} 합계 칸의 숫자는 처음으로 마이너스였습니다. 윤은 그 숫자가 처음으로 현실을 제대로 보여준다고 느꼈습니다.',
 '561b42e0e7e58c25':'사귄 지 이 년이 지났습니다. 싸운 적은 거의 없었습니다. 윤은 그것을 잘 지내는 증거라고 믿었지만, 한편으로는 말하지 않은 이야기가 그만큼 쌓였다는 뜻이기도 했습니다.',
 'b60d78a7b4eaf61d':'약속까지 오 분이 남았는데 지갑이 보이지 않았습니다. 가방을 뒤집자 서랍에서 챙겨 넣었던 물건이 바닥에 흩어졌습니다.'
};
for(const f of d.failures)if(sentences[f.id])d.edits.push({...f,after:sentences[f.id],humanReviewed:true,reason:'구조·자리표시자·숫자 표기를 보존한 직접 문장 편집입니다.'});
d.failures=d.failures.filter(f=>!sentences[f.id]);
for(const edit of d.edits)if(sentences[edit.id]){edit.after=sentences[edit.id];edit.reason='과도한 높임과 능력·인격 단정을 줄이고 원문의 장면·관계 맥락을 유지한 직접 편집입니다.';edit.humanReviewed=true;}
fs.writeFileSync(file,JSON.stringify(d,null,2));console.log(JSON.stringify({humanRewrites:d.edits.filter(x=>x.humanReviewed).length}));
