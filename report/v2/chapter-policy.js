(function(root){
  'use strict';
  var COMMON_STYLE='핵심 판단 → 근거 → 유리한 조건 → 불리한 조건 → 가능한 생활 사례 → 대응 전략. 추상적인 칭찬을 쓰지 않고 전통 해석을 검증된 미래 예측처럼 표현하지 않는다.';
  var DATA={
    self:{title:'본래의 나',hanja:'本然之我',domains:['SELF','RELATIONSHIP'],purpose:'기질과 행동 패턴의 상세 설명을 이 챕터에서 완결한다.',required:['일간·일주','오행 강약','신강약·통근','십성 구조','장점·단점·모순','대인관계 반복 패턴','강점 활용·약점 보완'],excluded:['재물·혼인·취업의 확정 예고'],temperamentRatio:1},
    wealth:{title:'재물운',hanja:'財物運',domains:['MONEY'],purpose:'돈을 버는 구조와 남기는 구조를 구분하고 수익·지출·손실 조건에 답한다.',required:['재성 유무·강약·위치','식상생재·비겁과 재성','근로·사업·투자소득','수입 증가 조건','축적·지출·손실','대운·세운의 돈 관련 조건','돈 관리·수익화 전략'],excluded:['일간·일주 일반 소개','기질 장단점 나열','수익률·부자 되는 연도 확정'],temperamentRatio:0.05},
    love:{title:'연애·결혼운',hanja:'戀愛婚姻運',domains:['LOVE','MARRIAGE'],purpose:'관계에서의 행동·갈등·배우자궁·시기와 관계 유지 전략에 답한다.',required:['연애의 구체적인 양상','배우자성·배우자궁','유리한 조건·갈등','맞는 관계 특징','조건부 혼인 시기','결혼생활의 반복 문제','관계 유지 전략'],excluded:['일반 성격 소개','배우자 외모·직업·결혼 연도 확정'],temperamentRatio:0.05},
    career:{title:'일·사업운',hanja:'職業事業運',domains:['CAREER'],purpose:'직업 선택·조직과 독립활동·사업 운영·수익 모델의 조건에 답한다.',required:['관성·인성·식상·재성의 직업 작용','조직·독립활동','전문·기술·창작·영업 직군','사업 강점·취약점','성취 방해 구조·갈등','이직·확장의 시기 조건','수익 모델·일하는 방식'],excluded:['추진력·책임감 칭찬 반복','일간·일주 일반 소개','취업·성공 보장'],temperamentRatio:0.05},
    timing:{title:'운의 흐름',hanja:'運勢流轉',domains:['TIMING'],purpose:'원국과 실제 전달된 운의 조건을 연결하고 재물·직업·관계의 변화를 구분한다.',required:['대운·세운·월운','재물·직업·관계별 변화','변화의 원인','유리·불리한 조건','시기별 기회·위험'],excluded:['일반 기질 소개','없는 운 계산','특정 연도 사건 확정'],temperamentRatio:0},
    remedy:{title:'개운법',hanja:'開運法',domains:['ACTION'],purpose:'앞서 검증된 판단을 개인의 실행 계획으로 연결한다.',required:['앞선 분석의 종합','운동·학습·직업 역량','습관·환경 개선','상징적 전통법과 현실 행동 구분','시작·점검·중단 기준'],excluded:['일반 성격 재소개','색·물건으로 운 변경 보장'],temperamentRatio:0}
  };
  Object.keys(DATA).forEach(function(k){Object.assign(DATA[k],{style:COMMON_STYLE,maxParagraphChars:600,prompt:'',hook:{enabled:['wealth','love','career'].indexOf(k)>=0,style:'짧고 직설적인 조건부 핵심 진단. 장점과 취약점 모두 허용.',maxChars:100,explanationSentences:2,explanationMaxChars:420}});});
  var IDS={self:['c00','c01','c02','c03','c04','c05','deep_proscons','reading_transform','life_ik_SELF'],wealth:['c08','deep_wealth','life_ik_MONEY'],love:['c09','c10','deep_love','deep_marriage','deep_spouse','life_ik_LOVE','life_ik_MARRIAGE'],career:['c06','c07','deep_jobs','life_ik_CAREER'],timing:['c15','c16','c17','c18','deep_daewoon','deep_seun','deep_wolun','life_prologue','life_future','life_ik_TIMING'],remedy:['c19','c20','deep_places','deep_remedy','life_action','life_actions','life_ik_ACTION']};
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function kind(c){
    if(c && DATA[c.chapterKind])return c.chapterKind;
    var id=c && (c.base || c.id) || '', t=(c && c.title || '')+' '+id;
    if(/children|자녀|자식|health|건강|past|전생/.test(t))return null;
    var keys=Object.keys(IDS);for(var i=0;i<keys.length;i++)if(IDS[keys[i]].indexOf(id)>=0)return keys[i];
    if(/개운|실천|remedy|action|환경과 활동/.test(t))return 'remedy';
    if(/대운|세운|월운|운의 흐름|인생 흐름|올해|timing|seun|wolun|daewoon/.test(t))return 'timing';
    if(/재물|돈|wealth|money/.test(t))return 'wealth';
    if(/연애|결혼|배우자|love|marriage|spouse/.test(t))return 'love';
    if(/직업|적성|사업|일·|career|jobs/.test(t))return 'career';
    if(/본래의 나|기질|성향|타고난|강점과 취약|SELF|self/.test(t))return 'self';
    return null;
  }
  function policies(saved){var out=clone(DATA);Object.keys(out).forEach(function(k){var s=saved && saved[k] || {};Object.assign(out[k],s,{domains:DATA[k].domains,hook:Object.assign({},DATA[k].hook,s.hook || {})});});return out;}
  function policy(c,saved){var k=kind(c);return k?Object.assign({key:k},policies(saved)[k]):null;}
  var TOPIC={wealth:/돈|재물|재성|재물성|수입|수익|소득|투자|지출|자금|자산|현금|저축|손실|매출|재백/,love:/연애|결혼|배우자|애정|혼인|연인|부부|이별|관계|夫妻/,career:/직업|사업|직장|업무|직무|조직|독립활동|이직|창업|영업|전문직|기술직|창작|수익 모델|관록/};
  var TRAIT=/성격|기질|성향|추진력|책임감|주도적|독립적|꼼꼼|완벽주의|고집|신중|외향|내향|자존심|인내|공감|감정이|감수성/;
  function sentences(t){return String(t || '').split(/(?<=[.!?。])\s+|\n+/).map(function(x){return x.trim();}).filter(Boolean);}
  function generalTrait(t,k){return TRAIT.test(t) && !(TOPIC[k] && TOPIC[k].test(t));}
  function signature(t){
    var x=String(t).replace(/책임감(?:이|은)?\s*(?:강|높|뛰어나)|맡은 일을 끝까지|약속을 잘 지/gu,'책임지속').replace(/추진력(?:이|은)?\s*(?:강|높|뛰어나)|실행력|행동력이|실천력이/gu,'실행주도').replace(/꼼꼼|세심|면밀/gu,'세밀').replace(/고집|완고|자기 기준|자신의 기준/gu,'기준고수').replace(/신중|조심스럽|심사숙고/gu,'숙고');
    return x.replace(/당신|본인|귀인|습니다|입니다|합니다|있습니다|있어요|이에요|성향|성격|기질|[\s\p{P}\p{S}]/gu,'');
  }
  function similarity(a,b){a=signature(a);b=signature(b);if(!a || !b)return 0;if(a===b)return 1;var grams=function(t){var s=new Set();for(var i=0;i<t.length-2;i++)s.add(t.slice(i,i+3));return s;},x=grams(a),y=grams(b),n=0;x.forEach(function(v){if(y.has(v))n++;});return x.size+y.size?2*n/(x.size+y.size):0;}
  function duplicate(a,b){
    if(similarity(a,b)>=0.78)return true;
    var concepts=[/책임지속/,/실행주도/,/세밀/,/기준고수/,/숙고/],x=signature(a),y=signature(b);
    return TRAIT.test(a) && TRAIT.test(b) && concepts.some(function(r){return r.test(x)&&r.test(y);});
  }
  function inspect(result,p,previous,hook){
    var issues=[],chars=0,traits=0,rows=[];
    (result.paragraphs || []).forEach(function(row){sentences(row.text).forEach(function(t){chars+=t.length;if(generalTrait(t,p.key))traits+=t.length;rows.push({id:row.id,text:t,refs:row.refs || [],claim_ids:row.claim_ids || []});});if(row.text.length>p.maxParagraphChars)issues.push({code:'paragraph-length',id:row.id});});
    if(p.key!=='self' && chars && traits/chars>p.temperamentRatio)issues.push({code:'temperament-ratio',ratio:traits/chars,max:p.temperamentRatio});
    rows.forEach(function(row,i){
      rows.slice(0,i).concat(previous || []).forEach(function(old){
        // A shared calculation is legitimate in different subjects. General trait definitions are not.
        if(generalTrait(row.text,p.key) && TRAIT.test(old.text) && duplicate(row.text,old.text))issues.push({code:'semantic-trait-duplicate',id:row.id,other:old.id || old.chapter});
        else if(row.text.length>24 && similarity(row.text,old.text)>0.9)issues.push({code:'sentence-duplicate',id:row.id,other:old.id || old.chapter});
      });
      if(hook && similarity(row.text,hook.text)>0.78)issues.push({code:'hook-body-duplicate',id:row.id});
    });
    if(/무한한 가능성|노력한다면 무엇이든|좋은 기운이 당신을 감싸|반드시.{0,15}(부자|결혼|성공)|객관적으로 검증된.{0,10}예측/.test(rows.map(function(r){return r.text;}).join(' ')))issues.push({code:'prohibited-claim'});
    return {ok:issues.length===0,issues:issues,temperamentRatio:chars?traits/chars:0,method:'synonym-concepts-and-character-ngrams',note:'자동 검사이며 완전한 의미 판정을 보장하지 않습니다.'};
  }
  function instruction(p){return '[챕터 책임 '+p.title+']\n목적: '+p.purpose+'\n필수 검토: '+p.required.join(' / ')+'\n제외: '+p.excluded.join(' / ')+'\n일반 기질 설명은 글자 비율 '+Math.round(p.temperamentRatio*100)+'% 이내. 상세 정의는 본래의 나를 참조한다. 같은 원국 근거라도 이 주제에서의 작용만 설명한다.\n문체: '+p.style+'\n문단 최대 '+p.maxParagraphChars+'자.\n'+p.prompt+'\n근거 없는 필수 항목은 근거 부족으로 표시하고 추측으로 채우지 않는다. 후킹의 판단을 본문에서 다시 선언하지 말고 조건·사례·시기·전략으로 확장한다.';}
  root.MantraChapterPolicy={defaults:DATA,kind:kind,policies:policies,policy:policy,sentences:sentences,generalTrait:generalTrait,similarity:similarity,duplicate:duplicate,inspect:inspect,instruction:instruction};
})(typeof window!=='undefined'?window:globalThis);
