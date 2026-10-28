/* 주역 해석 조합기 — 계산 결과(engine.cast/resolve) + 질문 분야 + (선택) 사주 → 표준 8개 섹션 구조화 데이터.
   AI 를 호출하지 않는다. 검수된 모듈(content.js)을 규칙대로 이어 붙이고, 없는 모듈은 문장을 채우지 않고 missing[] 에 남긴다.
   mode: 'public'(검수 완료 문구만) | 'preview'(관리자 미리보기: draft 도 사용, result.preview=true). */
(function(root){'use strict';
var req=typeof require!=='undefined';
var H=root.IchingHexagrams||(req?require('./hexagrams.js'):null),E=root.Iching||(req?require('./engine.js'):null),K=root.IchingContent||(req?require('./content.js'):null),S=root.IchingSajuLink||(req?require('./saju-link.js'):null);
var DIRECTIONS=['실행 검토','준비 우선','현상 유지','재검토','신중한 접근'];
var POS_KO=['초효','이효','삼효','사효','오효','상효'];
function uniq(a){return a.filter(function(x,i){return x&&a.indexOf(x)===i;});}
function hexInfo(h){var up=H.trigram(h.upper),low=H.trigram(h.lower);return {num:h.num,ko:h.ko,hanja:h.hanja,upper:{id:up.id,ko:up.ko,hanja:up.hanja,image:up.image},lower:{id:low.id,ko:low.ko,hanja:low.hanja,image:low.image},lines:h.lines.slice()};}

function compose(input,opts){
 opts=opts||{};var mode=opts.mode==='preview'?'preview':'public',cat=input.category,sink={missing:[],used:[],draft:false};
 if(K.CATEGORIES.indexOf(cat)<0)throw new Error('invalid-category');
 var cast=input.cast,base=cast.hexagram,moved=cast.transformedHexagram,n=base.num;
 var classics=K.get('classics:'+n,mode,sink),modern=K.get('modern:'+n,mode,sink),pack=K.get('pack:'+n+':'+cat,mode,sink);
 var ch=cast.changingLines.map(function(c){return c.position;});
 var lineMods={};ch.forEach(function(p){lineMods[p]=K.get('pack:'+n+':line:'+p,mode,sink);});
 var primaryLine=null;(cast.reading||[]).forEach(function(r){if(!primaryLine&&r.role==='primary'&&r.kind==='yaoci'&&r.hexagram===n)primaryLine=r.line;});
 var r={result_id:opts.resultId||('r-'+(Date.now().toString(36))+Math.floor(Math.random()*1e6).toString(36)),question:String(input.question||''),question_category:cat,generated_at:opts.now||new Date().toISOString(),
  hexagram:Object.assign(hexInfo(H.byNum(n)),{values:cast.values.slice(),figure:cast.values.map(function(v,i){return {position:i+1,label:POS_KO[i],yang:v===7||v===9,changing:v===6||v===9};})}),
  changing_lines:cast.changingLines.map(function(c){return {position:c.position,label:POS_KO[c.position-1],value:c.value,from:c.from,to:c.to};}),
  transformed_hexagram:moved?hexInfo(H.byNum(moved.num)):null,
  interpretation_rule_version:cast.rule.id,content_version:(K.releaseVersion&&K.releaseVersion())||K.VERSION};

 // SECTION 01 핵심 결론
 var dir=pack?pack.direction:null;
 r.conclusion={title:'핵심 결론',question:r.question,direction:dir,direction_note:'행동 방향을 설명하기 위한 분류이며 길흉이나 성공 확률을 뜻하지 않습니다.',
  summary:pack?pack.summary:null,
  conditions:pack?uniq(pack.conditions.concat(primaryLine&&lineMods[primaryLine]?['변효가 가리키는 점: '+lineMods[primaryLine].check]:[])):[],
  note:pack?null:'이 괘와 분야의 검수된 해석이 아직 없어 결론을 만들지 않았습니다.'};

 // SECTION 02 본괘 해석
 var trig=function(t){return t.ko+'('+t.image+')';};
 r.hexagram_explanation={title:'본괘 해석',number:n,name:base.ko,hanja:base.hanja,upper_lower:'상괘 '+trig(r.hexagram.upper)+' · 하괘 '+trig(r.hexagram.lower),
  keywords:modern?modern.kw:[],core_meaning:modern?modern.core:null,
  guaci_original:classics?{text:classics.guaci,source:'classics:'+n}:null,guaci_modern:modern?{text:modern.guaci,source:'modern:'+n}:null,
  meaning_for_question:modern?K.CAT_KO[cat]+' 질문에서는 "'+modern.kw.join('", "')+'"의 관점으로 읽습니다.':null,
  details:classics?{tuan_original:classics.tuan,daexiang_original:classics.daexiang,note:'원문은 접어서 보여 주는 참고 자료입니다.'}:null};

 // SECTION 03 현재 상황 분석
 var cautions=pack?pack.errors.concat(primaryLine&&lineMods[primaryLine]?[lineMods[primaryLine].caution]:[]):[];
 r.situation_analysis={title:'현재 상황 분석',issue:pack?pack.issue:null,favorable:pack?pack.favorable:[],unfavorable:pack?pack.unfavorable:[],judgment_errors:uniq(cautions),improve_conditions:pack?pack.improve:[],
  note:'질문 원문은 기록용이며 의미를 분석하지 않았습니다. 선택한 분야('+K.CAT_KO[cat]+')와 검수된 해석을 기준으로 정리한 내용입니다.'};

 // SECTION 04 변효·변괘
 var items=(cast.reading||[]).map(function(x){
  var key='classics:'+x.hexagram,cl=K.get(key,mode,sink),md=K.get('modern:'+x.hexagram,mode,sink),it={kind:x.kind,hexagram:x.hexagram,role:x.role};
  if(x.kind==='yaoci'){var ln=cl&&cl.lines[x.line-1];it.position=x.line;it.label=ln?ln.label:POS_KO[x.line-1];it.original=ln?ln.yaoci:null;it.modern=md?md.lines[x.line-1]:null;}
  else if(x.kind==='guaci'){it.original=cl?cl.guaci:null;it.modern=md?md.guaci:null;}
  else{it.label=x.name;it.original=cl&&cl.yong?cl.yong.yaoci:null;it.modern=md?md.yong:null;}
  return it;});
 var mm=moved?K.get('modern:'+moved.num,mode,sink):null;
 r.transformation_analysis=cast.changingCount===0?
  {title:'변효 및 변괘 해석',status:'none',changing_count:0,positions:[],statement:'변효 없음',rule:cast.rule,readings:items,summary:'변하는 효가 없어 본괘('+base.ko+') 중심으로 읽습니다. 지금 상황의 성격이 크게 바뀌지 않고 이어지는 모습입니다.',relation:null}:
  {title:'변효 및 변괘 해석',status:cast.changingCount===1?'single':'multiple',changing_count:cast.changingCount,positions:ch.map(function(p){return POS_KO[p-1];}),statement:cast.changingCount===1?POS_KO[ch[0]-1]+' 하나가 변합니다. 이 효의 의미를 중심으로 읽습니다.':'변효가 '+cast.changingCount+'개입니다. 주희 본의의 변점 규칙에 따라 아래 항목을 중심으로 읽습니다.',
   rule:{id:cast.rule.id,name:cast.rule.name,source:cast.rule.source},readings:items,
   line_meanings:ch.map(function(p){var m=lineMods[p];return {position:p,label:POS_KO[p-1],meaning:m?m.meaning:null};}),
   transformed:{num:moved.num,name:moved.ko,hanja:moved.hanja},
   relation:{from:base.ko+'('+n+')',to:moved.ko+'('+moved.num+')',transformed_core:mm?mm.core:null,note:'변괘는 앞날을 정해 둔 것이 아니라, 지금 흐름이 바뀔 때 향할 수 있는 방향입니다.'}};

 // SECTION 05 사주 교차
 r.saju_cross_analysis=input.saju?S.build(input.saju,cat,dir):{status:'no-saju',note:'사주 연동 정보 없음'};
 if(r.saju_cross_analysis.status==='ok')r.saju_cross_analysis.title='사주·주역 교차 해석';

 // SECTION 06 시나리오
 r.scenarios={title:'최선·최악의 시나리오',disclaimer:'발생 확률이나 확정된 미래가 아니라, 조건에 따라 가능한 전개를 비교한 것입니다.',
  favorable:pack?{conditions:pack.good.conditions,actions:pack.good.actions}:null,unfavorable:pack?{gaps:pack.bad.gaps,repeats:pack.bad.repeats}:null};

 // SECTION 07 행동 처방
 r.action_plan={title:'현실적인 행동 처방',do:pack?pack.do:[],avoid:pack?pack.avoid:[],
  check_before:pack?uniq(pack.check.concat(ch.map(function(p){return lineMods[p]?lineMods[p].check:null;}))):[],review_criteria:pack?pack.review:[]};

 // SECTION 08 최종 한마디
 r.final_message={title:'최종 한마디',text:pack?pack.final:null};

 r.missing=sink.missing;r.content_refs=sink.used;r.preview=mode==='preview'&&sink.draft;
 r.publishable=mode==='public'&&sink.missing.length===0;
 return r;
}
var api={compose:compose,DIRECTIONS:DIRECTIONS};
root.IchingCompose=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
