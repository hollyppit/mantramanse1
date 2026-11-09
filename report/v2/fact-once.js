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
R.FactOnce={own:own,uniq:uniq,reset:reset,sig:sig};
})(typeof window!=='undefined'?window:globalThis);
