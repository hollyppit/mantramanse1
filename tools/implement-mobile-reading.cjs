const fs=require('fs');let p='report/v2/reading-text.js',s=fs.readFileSync(p,'utf8');
const helper=`
 // Copy edits are limited to owned reading prose. Quoted evidence never passes through this function.
 var shortCopy=[
 ['예를 들어, 동료가 “이것도 잠깐 해줄 수 있어요?”라고 물을 때 내 마감부터 떠올리는지, 상대가 곤란하겠다 싶어 바로 받아주는지 살펴보세요.','동료가 “이것도 잠깐 해줄 수 있어요?”라고 부탁하는 상황을 떠올려 보세요. 내 마감을 확인하는지, 곤란해 보여 바로 받아주는지 돌아보세요.'],
 ['예를 들어, 미용사가 머리 길이를 세밀하게 맞추거나 의료인이 정밀한 작업을 할 때처럼, 세부를 놓치지 않는 일이 장점이 될 수 있어요.','예를 들어, 미용사의 커트나 의료인의 정밀 작업을 떠올려 보세요. 작은 차이를 놓치지 않는 일이 장점이 될 수 있어요.'],
 ['예를 들어, 친구에게 앱 사용법을 알려줄 때 복잡한 기능을 쉽게 설명한다면 교육이나 고객 안내에서도 써볼 수 있는 능력이에요.','친구에게 복잡한 앱 기능을 쉽게 설명해 준 적이 있나요? 그런 설명 능력은 교육이나 고객 안내에서도 써볼 수 있어요.'],
 ['예를 들어, 늘 같은 시간에 연락했는데 상대의 일정이 바뀌자 관심이 줄었다고 느끼기 전에 새로운 연락 시간을 물어보는 거예요.','늘 같은 시간에 연락하다 상대의 일정이 바뀐 상황을 떠올려 보세요. 관심이 줄었다고 생각하기 전에 편한 연락 시간을 물어보는 거예요.'],
 ['두 방식의 장점만 기대하면 회사에서 맡아주던 영업·정산·업무 지원은 그대로 받고 결정만 자유롭게 하려는 계획이 될 수 있어요.','독립하면 회사가 맡던 영업·정산·업무 지원도 챙겨야 해요. 결정의 자유만 기대하고 이 부담을 빼놓지는 않았는지 보세요.']
 ];
 function concise(text){var value=String(text||'');shortCopy.forEach(function(pair){value=value.split(pair[0]).join(pair[1]);});return value.replace(/^(?:한 번의 결과보다 계속 남을 것을 생각해|내가 정할 부분이 있어야 편해서|충분히 이해한 뒤 움직이고 싶어서|정해진 몫과 약속을 함께 지키고 싶어서|직접 해보고 판단하는 쪽이 편해서|따르기 전에 그 기준의 이유를 알고 싶어서|고르기 전에 조건부터 확인하다 보면|겉으로 안 보이는 이유도 생각하며),\\s*/,'').replace(/하는 장면에 초점을 둘 수 있어요\\./g,'할 때를 살펴보세요.').replace(/하는 모습을 보이세요\\./g,'할 수 있어요.').replace(/하는 모습이 자연스러워요\\./g,'할 수 있어요.').replace(/하는 장면을 살펴볼 수 있어요\\./g,'할 때를 돌아보세요.').replace(/원래 사주와 함께 본 흐름에서는 /g,'원래 사주와 함께 보면, ').replace(/일하는 방식를/g,'일하는 방식을');}
 function readingParagraphs(text,shorten){var blocks=[];String(text||'').split(/\\n+/).filter(function(t){return t.trim();}).forEach(function(block){if(shorten)block=concise(block.trim());var group=[],size=0;sentences(block).forEach(function(sentence){var example=/^예를\\s*들[어면]/.test(sentence);if(group.length&&(example||group.length>=2||size+sentence.length>110)){blocks.push(group.join(' '));group=[];size=0;}group.push(sentence);size+=sentence.length+1;});if(group.length)blocks.push(group.join(' '));});return blocks;}
 function readingParagraphHtml(text,role,shorten){return readingParagraphs(text,shorten).map(function(t){return '<p class="lead'+(/^예를\\s*들[어면]/.test(t)?' reading-example':'')+'" data-reading-role="'+esc(role)+'">'+esc(t)+'</p>';}).join('');}
`;
const marker=' function section(c,ci,suffix,body,extra)';if(!s.includes(marker))throw Error('section insertion missing');s=s.replace(marker,helper+'\n'+marker);
s=s.replace(".replace(/하는 쪽이에요/g,'하는 특성을 갖고 있어요').replace(/한 쪽이에요/g,'한 특성을 갖고 있어요').replace(/하는 편이에요/g,'하는 특성을 갖고 있어요')",'');
s=s.replace("row.text.split(/\\n{2,}/).map(function(t){return '<p class=\"lead\" data-reading-role=\"'+row.role+'\">'+esc(t)+'</p>';}).join('')","readingParagraphHtml(row.text,row.role,!out.creative&&!out.education)");
s=s.replace("'<p data-reading-role=\"'+(b.reason==='why'?'why':'evidence')+'\">'+esc(b.text)+'</p>'","readingParagraphs(b.text,false).map(function(t){return '<p data-reading-role=\"'+(b.reason==='why'?'why':'evidence')+'\">'+esc(t)+'</p>';}).join('')");
s=s.replace('R.ReadingText={organize:organize,','R.ReadingText={concise:concise,readingParagraphs:readingParagraphs,organize:organize,');fs.writeFileSync(p,s);
p='report/v2/reader.css';s=fs.readFileSync(p,'utf8');s+='\n/* Small screens: short blocks, clear examples, and readable evidence. */\n.text-reading-section p.reading-example{border-left:2px solid #d5b97f70;padding-left:12px}\n@media(max-width:560px){.text-reading-section p.lead{line-height:1.85!important;margin-block:0 1em}.text-reading-section{padding-top:16px!important;padding-bottom:16px!important}.text-reading-basis p{margin:0 0 1em;word-break:keep-all}.text-reading-head h2{font-size:24px}.text-reading-section .reading-hook{font-size:22px;line-height:1.55}}\n';fs.writeFileSync(p,s);
p='tools/prepare-everyday-production.cjs';s=fs.readFileSync(p,'utf8').replace("new Set(['report/v2/everyday-reading.js'","new Set(['report/v2/reader.css','report/v2/everyday-reading.js'");fs.writeFileSync(p,s);
console.log('Mobile prose, paragraph rendering, evidence formatting and CSS prepared');
