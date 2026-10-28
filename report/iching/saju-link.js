/* 사주·주역 교차 해석 모듈. 사주 계산 결과(readingVisualData 와 같은 모양)를 읽기만 하고 고치지 않는다.
   입력 saju: { dayMaster:{stem,el}, strength:{band}, nowYear, daewoon:[{startYear,endYear,ganzhi,season}], annual?:{year,ganzhi} }
   사주에서 괘를 도출하지 않는다. 두 결과가 다르면 다르다고 적고 억지로 맞추지 않는다. 날짜·확률은 만들지 않는다. */
(function(root){'use strict';
var SEASON={opportunity:['새 일 꺼내기','go'],expansion:['해온 일 넓히기','go'],harvest:['대가 챙기기','go'],accumulation:['실력 쌓기','hold'],transition:['방향 바꾸기','turn'],defense:['생활 지키기','hold']};
var DIR_TEMPO={'실행 검토':'go','준비 우선':'hold','현상 유지':'hold','재검토':'hold','신중한 접근':'hold'};
var TEMPO_KO={go:'나서서 움직이는 쪽',hold:'준비하고 지키는 쪽',turn:'방향을 바꾸는 쪽'};
var TRAIT={
 general:{신강:'기운이 넉넉한 구조라 스스로 밀고 나가는 힘은 있는 편입니다. 다만 내 방식을 고집하기 쉽습니다.',신약:'기운이 여린 편이라 혼자 다 짊어지기보다 기댈 곳을 두는 쪽이 맞는 구조입니다.',중화:'기운이 비교적 고르게 섞여 상황에 맞춰 쓰는 힘이 있는 구조입니다.'},
 wealth:{신강:'재물에서도 직접 잡으러 가는 힘이 있지만 한 번에 크게 걸기 쉬운 구조입니다.',신약:'재물은 큰 판보다 지킬 수 있는 크기에서 안정적인 구조입니다.',중화:'재물 흐름을 무리 없이 조절하는 데 유리한 구조입니다.'},
 career:{신강:'책임 있는 자리를 맡아도 버티는 힘이 있지만 내 방식에 갇히기 쉬운 구조입니다.',신약:'좋은 사람과 팀 곁에서 실력이 커지는 구조입니다.',중화:'역할이 바뀌어도 적응이 빠른 구조입니다.'},
 love:{신강:'관계에서도 주도권을 쥐려는 마음이 커지기 쉬운 구조입니다.',신약:'상대에게 맞추다 내 마음을 놓치기 쉬운 구조입니다.',중화:'서로 속도를 맞추는 데 능한 구조입니다.'}
};
var CAT_KO={general:'전반',wealth:'재물',career:'커리어',love:'인연'};
function period(s){var d=(s.daewoon||[]).filter(function(p){return p.startYear<=s.nowYear&&s.nowYear<=p.endYear;})[0];return d||null;}
function valid(s){return !!(s&&s.dayMaster&&s.dayMaster.stem&&s.strength&&s.strength.band&&Number.isFinite(s.nowYear));}
// direction: 주역 판단 방향(없으면 null), category: general|wealth|career|love
function build(saju,category,direction){
 if(!valid(saju))return {status:'no-saju',note:'사주 연동 정보 없음'};
 var band=saju.strength.band,d=period(saju),se=d&&SEASON[d.season],common=[],divergent=[],facts={dayMaster:saju.dayMaster.stem,band:band,nowYear:saju.nowYear};
 var luck=[];
 if(d){facts.daewoon={ganzhi:d.ganzhi,startYear:d.startYear,endYear:d.endYear,season:d.season};luck.push('현재 대운은 '+d.ganzhi+' 대운('+d.startYear+'~'+d.endYear+'년)으로, 사주 쪽에서는 \''+(se?se[0]:d.season)+'\' 흐름의 구간으로 읽습니다.');}
 else luck.push('현재 연도에 해당하는 대운 정보가 없어 대운 해석은 생략합니다.');
 if(saju.annual&&saju.annual.ganzhi){facts.annual={year:saju.annual.year,ganzhi:saju.annual.ganzhi};luck.push(saju.annual.year+'년 세운은 '+saju.annual.ganzhi+'입니다.');}
 var traits=[saju.dayMaster.stem+(saju.dayMaster.el||'')+' 일간, '+band+' 구조입니다.',(TRAIT[category]||TRAIT.general)[band]||''].filter(Boolean);
 var dt=direction?DIR_TEMPO[direction]:null,st=se?se[1]:null;
 if(dt&&st){
  if(dt===st)common.push('주역은 \''+direction+'\'을, 사주의 현재 대운은 \''+se[0]+'\' 구간을 말해 둘 다 '+TEMPO_KO[dt]+'을 가리킵니다.');
  else divergent.push('주역은 \''+direction+'\'('+TEMPO_KO[dt]+')을 말하지만, 사주의 현재 대운은 \''+se[0]+'\'('+TEMPO_KO[st]+')을 가리켜 방향이 다릅니다.');
 }
 if(dt&&band==='신약'&&dt==='hold')common.push('기운이 여린 구조에서는 서두르지 않는 쪽이 부담이 적다는 점이 주역의 방향과 같습니다.');
 if(dt&&band==='신강'&&dt==='hold')divergent.push('스스로 밀고 나가는 힘이 강한 구조라 멈춰서 준비하는 시간이 답답하게 느껴질 수 있습니다. 이 점은 주역의 방향과 어긋납니다.');
 if(dt&&band==='신강'&&dt==='go')common.push('밀고 나가는 힘이 있는 구조라 나서도 된다는 주역의 방향과 겹칩니다.');
 if(dt&&band==='신약'&&dt==='go')divergent.push('기운이 여린 구조라, 나서더라도 체력과 자원을 함께 보강하는 쪽이 안전합니다. 주역의 방향보다 조심스러운 신호입니다.');
 var ref;
 if(dt&&st&&dt===st)ref='두 결과가 같은 방향을 가리키니 그 방향으로 준비를 진행하되, 아래 행동 처방의 확인 조건을 먼저 채우십시오.';
 else if(dt&&st)ref='두 결과의 방향이 다릅니다. 하나로 합치지 않고, 아래 행동 처방의 확인 조건을 채운 뒤 결정하십시오.';
 else ref='사주 정보와 주역 방향을 직접 비교하기 어려워, 각각 참고만 하십시오.';
 return {status:'ok',luck_context:luck,category_traits:traits,category:CAT_KO[category]||category,common:common,divergent:divergent,reference_judgment:ref,facts:facts};
}
var api={build:build,SEASON:SEASON,DIR_TEMPO:DIR_TEMPO};
root.IchingSajuLink=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
