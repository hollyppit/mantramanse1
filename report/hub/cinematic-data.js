(function(root){
'use strict';
var titles=['운이라는 것','나의 이야기','사주를 공부한 이유','사주명리학이란?','사주를 바라보는 관점','만트라를 만든 이유','당신의 운을 펼치다'];
var scripts=[
['성공한 사람들이 종종 이런 말을 하잖아요.','"운이 좋았을 뿐입니다."','저는 그 말을 들을 때마다 궁금했습니다.','운이라는 건 정말 특별한 사람들에게만 찾아오는 걸까요?'],
['저는 가난한 집에서 자랐습니다.','우리 가족 모두 나름대로 열심히 살았지만, 형편은 좀처럼 나아지지 않았어요.','도대체 뭐가 문제일까.','이것도 타고난 운명인 걸까.'],
['그 답을 찾고 싶어 사주를 공부하기 시작했습니다.','그런데 공부할수록 미래보다 제 자신에 대해 더 많이 생각하게 되더라고요.','내가 어떤 사람인지도 제대로 모르고 살아왔다는 생각이 들었습니다.'],
['사주명리는 타고난 기질과 운의 흐름을 읽는 오래된 학문입니다.','조선에서는 관상감이 \'명과학\'이라는 이름으로 다뤘습니다.','흔히 \'동양의 MBTI\'라 부르지만, 사주는 성격만이 아니라 \'때\'를 함께 봅니다.'],
['그렇다고 사주가 정해진 결말을 알려주는 건 아닙니다.','같은 사주를 갖고 태어났어도 누구는 사기꾼이 되고, 누구는 위대한 학자가 될 수도 있으니까요.','저는 사주가 내일의 날씨를 살펴보는 것과 비슷하다고 생각합니다.','강점은 키우고 약점은 대비하며, 나아갈 때와 준비할 때를 생각해 보는 거죠.'],
['그래서 만트라를 만들었습니다.','사주팔자의 구조와 오행의 관계, 대운과 세운의 흐름을 함께 살펴보고, 왜 그런 해석이 나오는지 쉽게 설명하고 싶었어요.','그저 좋은 말만 늘어놓기보다, 장점도 약점도 솔직하게 짚어주는 풀이를 만들고 싶었습니다.','그 내용을 누구나 이해할 수 있도록 한 편의 무빙툰에 담았습니다.'],
['운은 특혜가 아니라, 읽고 준비할 수 있는 흐름입니다.','저는 만트라가 자신의 가능성을 돌아보고, 앞으로의 선택을 고민하는 데 작은 참고가 되었으면 합니다.','이제 당신의 명(命)과 운(運)을 펼쳐 보세요.']];
var images=['office','courtyard','archive','archive','paths','papers','gate'];
var defaults={enabled:true,button:'봉인을 풀어 내 운 확인하기',seal:'',skipRepeat:true,scenes:titles.map(function(t,i){return {id:'cinema-'+(i+1),title:t,enabled:true,image:'/report/hub/quest/'+images[i]+'.webp',imageMobile:'',video:'',videoMobile:'',foreground:'',motion:'zoom-in',transition:'dissolve',transitionMs:650,segments:scripts[i].map(function(t){return {text:t,seconds:0}})}})};
var old=root.Onboard.merge;
root.Onboard.merge=function(base,ov){var out=old(base,ov);out.renewal.cinematic=JSON.parse(JSON.stringify(ov&&ov.renewal&&ov.renewal.cinematic||defaults));return out};
root.Onboard.DEFAULTS.renewal.cinematic=defaults;
root.Cinematic={defaults:defaults,duration:function(s){return s.seconds>0?Math.max(2,Math.min(60,+s.seconds)):Math.max(3,Array.from(s.text||'').length/10)}};
})(typeof window!=='undefined'?window:globalThis);
