/* 같은 사실을 한 리포트에서 한 번만 풀어 말하기.
   "가장 큰 기운은 관성이에요", "2016~2026년은 '정인'의 흐름이 들어와요" 같은 사실 소개 문장은 처음 보여 주는 장에서만 쓰고,
   다른 장은 소개 없이 그 장의 해석으로 바로 들어간다(reading-depth · reading-insight · luck-reading 이 쓴다).
   own(sd, key, chapterId): 이 장이 그 사실을 처음 말하는 장이면 true. 같은 장을 다시 그려도 true(소개가 사라지지 않게).
   다른 사람(사주)으로 바뀌면 기록을 새로 시작한다. 모듈이 없으면(테스트·옛 화면) 각 모듈은 늘 전체 문장을 쓴다. */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
// 사람 구분은 일간·강약·올해만으로 한다(모듈마다 넘기는 사주 객체의 모양이 조금씩 달라도 같은 사람이면 같은 기록을 쓰게).
var owners={};
function sig(sd){if(!sd)return '';var dm=sd.dayMaster||{};return [dm.stem||'',sd.strength&&sd.strength.band||'',sd.nowYear||''].join('|');}
function own(sd,key,chapterId){var s=sig(sd);if(!s||s==='||'||!key||!chapterId)return true;var o=owners[s]||(owners[s]={});
 if(!o[key]){o[key]=chapterId;return true;}return o[key]===chapterId;}
function reset(){owners={};}
// 문장 단위 안전망: 다른 장이 이미 보여 준 문장(14자 이상)을 뺀 글을 돌려준다. 다 빠지면 ''.
function uniq(sd,text,chapterId){var s=String(text||'');if(!chapterId)return s;
 return s.split(/\n{2,}/).map(function(para){return para.split(/(?<=[.!?])\s+/).filter(function(x){var t=x.trim();if(t.length<14)return true;return own(sd,'s:'+t.replace(/\s+/g,''),chapterId);}).join(' ').trim();}).filter(Boolean).join('\n\n');}
// 장 전체 안전망(2026-11-15 챕터 고도화 2묶음): 심화 블록·후킹·깊이 풀이가 장마다 다시 꺼내던 사실 소개 문형
// ("힘이 여린 사주라 ~", "가장 큰 기운 비겁", "지금 대운은 ~", "경금 일간이라 ~")은 처음 쓴 장에만 두고, 다른 장은 소개 구절을 걷고 결론만 남긴다.
// 근거 상자(풀이 디테일)는 호출하는 쪽에서 빼고 넘긴다. 문장 자체를 지우지 않고 앞 구절만 걷는다.
var INTRO=[
 ['band',/(?:내 )?(?:타고난 )?(?:기운|힘)이 (?:센|여린|강한|약한) (?:사주|편)(?:이)?라,? /g,''],
 ['band',/타고난 힘이 (?:약해서|강해서),? /g,''],
 ['top',/가장 큰 기운(?:이|은)? (?=(?:비겁|식상|재성|관성|인성))/g,''],
 ['luck',/지금(?:의)? 대운에서는 /g,'이 시기에는 '],
 ['luck',/지금(?:의)? (?:대운|10년)(?:은|는) /g,'이 10년은 '],
 ['day',/(?:갑|을|병|정|무|기|경|신|임|계)(?:목|화|토|금|수) 일간이라,? /g,'']
];
var nk=function(t){return 's:'+String(t).replace(/<[^>]*>/g,'').replace(/\s+/g,'');};
function trimIntro(sd,text,chapterId){var s=String(text||'');if(!chapterId||!sd)return s;var done={};
 INTRO.forEach(function(r){var k=r[0];r[1].lastIndex=0;if(done[k]===undefined){var hit=INTRO.some(function(x){x[1].lastIndex=0;return x[0]===k&&x[1].test(s);});done[k]=!hit||own(sd,'intro:'+k,chapterId);}if(done[k])return;
  // 소개 구절을 걷은 나머지 문장이 다른 장에 이미 있으면(걷고 나니 같은 문장이 됨) 그 문장은 통째로 뺀다
  var re=new RegExp(r[1].source+'([^<.!?]{6,}[.!?])(\\s*)','g');s=s.replace(re,function(m,rest,sp){var keep=rest.length<14||own(sd,nk(rest),chapterId);return keep?r[2]+rest+sp:'';});
  // 문장이 아닌 이름표(<em>가장 큰 기운 비겁</em> 등)는 구절만 걷는다
  r[1].lastIndex=0;s=s.replace(r[1],r[2]);});
 // 이 장의 문장을 기록해 둔다: 뒤 장에서 소개를 걷은 문장이 이 장 문장과 같아지면 위에서 빠진다
 s.replace(/<[^>]*>/g,' ').split(/(?<=[.!?])\s+/).forEach(function(t){t=t.trim();if(t.length>=14)own(sd,nk(t),chapterId);});
 return s;}
R.FactOnce={own:own,uniq:uniq,reset:reset,sig:sig,trimIntro:trimIntro,INTRO:INTRO};
})(typeof window!=='undefined'?window:globalThis);
