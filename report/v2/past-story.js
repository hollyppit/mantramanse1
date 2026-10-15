/* 전생은 고정 줄거리를 바꿔 끼우지 않고 검토를 통과한 개인 원국 단편을 요청한다. */
(function(root){
 'use strict';var R=root.ReportV2=root.ReportV2||{};
 function payload(sd){var copy={};Object.keys(sd||{}).forEach(function(k){if(!['birth','name','ziwei','calculationProvenance'].includes(k))copy[k]=sd[k];});return {sd:copy};}
 function message(code){return code==='insufficient-evidence'?'이 사주에 연결된 풀이 근거가 부족해 전생 이야기를 아직 준비하지 못했습니다.':code==='rate-limited'||code==='cost-limit'?'지금은 요청이 많습니다. 잠시 후 다시 시도해 주세요.':'이야기를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요.';}
 async function load(sd,source,signal){
  var r=await fetch('/api/past-story',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload(sd)),signal:signal});
  var d;try{d=await r.json();}catch(e){throw Error(message('unavailable'));}if(!r.ok||!d.ok||!d.story||!Array.isArray(d.story.frames)||d.story.frames.length!==8)throw Error(message(d.error));
  var images=((source&&source.frames)||[]).filter(function(f){return f.img;});
  return Object.assign({},source||{},{id:'personal-past',slot:d.visual&&d.visual.slot||(source&&source.slot)||'',title:d.story.title,hero:d.story.title,sub:d.story.logline,personalized:true,cached:!!d.cached,
   notice:'사주 해석을 모티브로 한 창작 전생 단편입니다.',frames:d.story.frames.map(function(f,i){return {cap:f.cap,paras:f.paras.slice(),img:images.length?images[i%images.length].img:''};})});
 }
 R.PastStory={load:load,payload:payload};
})(typeof window!=='undefined'?window:globalThis);
