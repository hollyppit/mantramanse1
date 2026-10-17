// Presentation policy only: never writes saved chapters, assets or engine values.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var TITLES = ['나의 사주 핵심 요약','타고난 특징과 성향','나의 강점과 취약점','약점을 장점으로 승화하는 방법','직업과 적성','재물과 사업','연애와 결혼','인간관계와 궁합','건강과 생활 습관','전체 인생 흐름','대운 분석','향후 10년의 세운 분석','올해와 월별 운세','나에게 맞는 환경과 활동','개운 전략과 실천 계획'];
  var FIELDS = [['title','핵심 제목','interpretation'],['why','나에게 해당하는 이유','fact'],['reality','현실에서 나타날 수 있는 특징','interpretation'],['strength','장점으로 발휘되는 경우','interpretation'],['risk','약점으로 나타나는 경우','interpretation'],['reinforce','장점을 강화하는 방법','advice'],['practice','약점을 보완하는 실천 전략','advice'],['evidence','명리학적 근거와 예외 조건','model']];
  var MAP = [
    ['c00','life_here'], ['c01','c02','c03','life_self_who','life_tengods','life_stars','deep_car','deep_stages','life_ik_SELF'],
    ['c04','c05','deep_proscons'], ['reading_transform'],
    ['c06','c07','deep_jobs','life_career_style','life_career_timing','life_ik_CAREER'],
    ['c08','deep_wealth','life_money_nature','life_money_timing','life_ik_MONEY'],
    ['c09','c10','deep_love','deep_spouse','deep_marriage','deep_children','life_love_style','life_love_timing','life_marriage_who','life_marriage_timing','life_ik_LOVE','life_ik_MARRIAGE'],
    ['c11','c12','c13','deep_ilju','life_relation_style','life_relation_timing','life_ik_RELATIONSHIP','c14','deep_past'],
    ['deep_health'], ['life_prologue'], ['c15','c16','deep_daewoon'], ['life_future','deep_seun'],
    ['c17','c18','deep_wolun','life_ik_TIMING'], ['deep_places','deep_remedy'], ['c19','c20','life_action','life_actions','life_ik_ACTION']
  ];
  var TRAITS = {
    비겁: ['스스로 기준을 세우는 힘','협업에서 역할과 결정권을 먼저 확인하려는 모습','각자의 책임이 분명하면 독립성과 협동이 함께 살아납니다','결정권을 혼자 쥐면 다른 사람의 제안을 놓칠 수 있습니다','결정 기준을 공유하고 서로의 역할을 기록합니다'],
    식상: ['생각을 표현하고 결과물로 만드는 힘','설명과 시제품으로 생각을 확인하려는 모습','피드백을 받을 작은 결과물을 만들 때 재능이 드러납니다','아이디어를 동시에 늘리면 마무리가 밀릴 수 있습니다','완료 기준을 정하고 하나의 결과물을 먼저 끝냅니다'],
    재성: ['자원과 성과를 현실에 연결하는 힘','비용과 결과를 비교하며 선택하려는 모습','목표와 자원 범위가 분명할 때 현실 감각을 쓰기 좋습니다','성과만 추적하면 회복 시간과 관계를 뒤로 미룰 수 있습니다','성과와 함께 시간·비용·회복 부담을 기록합니다'],
    관성: ['책임과 기준을 지키는 힘','기준과 약속을 확인한 뒤 움직이려는 모습','권한과 책임이 맞을 때 신뢰를 쌓는 방향으로 발휘됩니다','책임의 범위가 모호하면 지나친 부담을 떠안을 수 있습니다','내 책임과 공동 책임을 나누고 수용 가능한 범위를 말합니다'],
    인성: ['배우고 맥락을 연결하는 힘','자료와 조언을 살핀 뒤 결정하려는 모습','학습을 실제 문제에 적용하면 깊이가 강점으로 드러납니다','검토만 이어지면 실행 시점을 놓칠 수 있습니다','자료 검토의 종료 시간을 정하고 작은 실험으로 확인합니다']
  };
  var CONTEXT = ['핵심 선택','일상 반응','강점과 부담','반복되는 어려움','업무 역할','자원 배분','가까운 관계','사람 사이 거리','생활 리듬','긴 시간의 변화','10년 단위 환경','해마다의 준비','올해의 일정','공간과 활동','지속 가능한 실천'];
  var TASKS = [
    '가장 공감하는 특징 하나와 맞지 않는 특징 하나를 기록해 다음 설명의 기준으로 삼습니다.',
    '최근 선택을 한 장면으로 적고, 원하는 결과와 실제 반응의 차이를 확인합니다.',
    '잘 풀린 상황과 부담이 커진 상황을 각각 기록하고 서로 다른 조건을 찾습니다.',
    '반복되는 어려움 하나를 골라 시작 신호와 중단 기준을 정하고 일주일 뒤 확인합니다.',
    '관심 직무의 실제 과제 하나를 수행해 몰입도·완성도·협업 부담을 비교합니다.',
    '수입을 예상하기보다 현재 비용과 감당 가능한 손실 범위를 적고 확장 전 중단 기준을 정합니다.',
    '가까운 사람에게 원하는 도움 하나와 부담스러운 행동 하나를 구체적인 말로 전달합니다.',
    '만남 뒤 편안했던 조건과 피로했던 조건을 기록하고 연락 빈도와 역할을 조정합니다.',
    '수면·활동·휴식의 실제 기록에서 부담이 커지는 시간대를 찾고 한 가지 일정만 조정합니다.',
    '지난 변화의 계기와 확보한 지원을 나란히 적어 운의 해석과 실제 환경을 비교합니다.',
    '현재 대운에서 필요한 지원과 맡을 책임을 정리하고 긴 목표를 작은 검토 구간으로 나눕니다.',
    '해별 흐름은 준비 목록으로 사용하고 매년 실제 자원과 목표를 다시 확인합니다.',
    '이번 달의 할 일과 미룰 일을 구분하고 다음 달 시작 때 결과와 부담을 점검합니다.',
    '현재 공간이나 활동을 하나만 바꾸고 집중·편안함·지속 가능성의 변화를 비교합니다.',
    '앞 장에서 고른 실천 하나에 시작일과 점검일을 정하고 결과에 따라 유지·수정·중단합니다.'
  ];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function sectionOf(c) { var b = c.base || c.id; for(var i=0;i<MAP.length;i++) if(MAP[i].indexOf(b)>=0 || MAP[i].indexOf(c.id)>=0) return i; return 7; }
  function profile(sd) {
    var g = sd.groups || {}, keys = Object.keys(g).sort(function(a,b){return g[b]-g[a];}), hi = sd.dominantGroup || keys[0], lo = sd.weakestGroup || keys[keys.length-1];
    return { hi:hi, lo:lo, trait:TRAITS[hi], band:sd.strength && sd.strength.band, roots:sd.roots, month:sd.pillars && sd.pillars.month && sd.pillars.month.ko };
  }
  function card(sd, i) {
    var p=profile(sd), t=p.trait, context=CONTEXT[i], unknown=!(sd.pillars && sd.pillars.hour);
    if (!t) return { title:TITLES[i], why:'설명에 필요한 십성 분포가 확인되지 않았습니다.', reality:'추가 계산 근거를 확인한 뒤 해석합니다.', strength:'근거 부족으로 강점 판단을 보류합니다.', risk:'근거 부족으로 취약점 판단을 보류합니다.', reinforce:TASKS[i], practice:TASKS[i], evidence:'누락된 값을 만들어 대신하지 않습니다.' };
    var support = p.band === '신약' ? '혼자 책임을 늘리기보다 확보한 지원과 역할을 함께 살펴야 합니다.' : p.band === '신강' ? '주도하는 힘이 실제 결과로 이어지려면 역할과 피드백의 경로가 필요합니다.' : '주도할 일과 도움받을 일을 상황에 맞게 나누는 방향을 살핍니다.';
    var rootNote = p.roots ? '원국 통근은 '+p.roots.level+'입니다. 근의 유무만으로 성격이나 성공을 판정하지 않습니다.' : '통근 자료가 없어 그 영향은 판단을 보류합니다.';
    var methods=sd.usefulElementMethods || {}, methodText=Object.keys(methods).filter(function(k){return methods[k].applicable && methods[k].yong;}).map(function(k){var m=methods[k];return ({eokbu:'강약 균형(억부)',johu:'한난조습(조후)',tonggwan:'대립 중재(통관)'}[k] || '해석 기준')+' 후보 '+m.yong+(m.reasons && m.reasons.length ? ' ('+m.reasons.join(' / ')+')':'');}).join(' · ');
    var c={
      title: context+'에서 '+t[0]+'을 어떻게 쓸까요?',
      why: context+'에서는 '+t[0]+'과 이를 받쳐 주는 지원 조건을 함께 살펴봅니다. 계산 근거로 원국에서 '+p.hi+' 비중은 '+Math.round(sd.groups[p.hi])+'%이고, 신강약 모델은 '+p.band+'으로 분류합니다. 월주는 '+(p.month || '확인 불가')+'입니다.',
      reality: context+'에서는 '+t[1]+'을 관찰해 볼 수 있습니다. '+support,
      strength: context+'의 조건이 맞을 때 '+t[2],
      risk: context+'에서 부담이 커지면 '+t[3]+' '+(p.lo ? p.lo+'의 낮은 비중은 능력 부재를 뜻하지 않으므로 실제 경험과 비교해야 합니다.':''),
      reinforce: context+'에 쓰는 힘을 강화하려면 '+t[4]+' '+(p.band==='신약'?'도움을 받을 경로와 맡을 범위를 함께 정합니다.':'결정 뒤 다른 관점의 피드백을 한 번 확인합니다.'),
      practice: TASKS[i],
      evidence: '모델 해석: 우세 십성군과 신강약·월주를 함께 읽은 조건부 풀이입니다. '+rootNote+' '+(unknown?'시간 미상이므로 시주·자녀궁·말년 해석의 확실성이 제한됩니다. ':'')+'실제 경험이 다르면 학습·환경·관계 조건을 먼저 확인합니다.'
    };
    if(i===4 && sd.career && sd.career.top && sd.career.top.length) { c.why+=' 직업 적성 모델의 상위 분야는 '+sd.career.top.slice(0,3).map(function(x){return x.name;}).join(', ')+'입니다.'; c.reality='상위 분야는 확정 직업이 아니라 실제 과제를 비교할 출발점입니다. '+t[1]+'을 그 업무에서 어떻게 활용하는지 확인합니다. '+support; }
    if(i===5) { c.why+=' 재성 '+Math.round(sd.groups.재성 || 0)+'%와 식상 '+Math.round(sd.groups.식상 || 0)+'%를 함께 확인합니다.'; c.reality='생각을 결과물로 옮기는 방식과 자원을 관리하는 방식을 나누어 봅니다. '+support; c.strength='결과물의 가치와 비용을 함께 확인할 때 '+t[0]+'을 자원 관리에 연결할 수 있습니다.'; c.risk='표현이나 판매 능력과 자금 관리 능력을 같은 것으로 보면 부족한 지원을 놓칠 수 있습니다.'; }
    if(i===6 || i===7) { c.why+=' 원국 관계에는 합 '+(sd.combinations || []).length+'개, 충·형 등 '+(sd.clashes || []).length+'개가 전달되어 있습니다.'; c.reality=context+'에서는 '+t[1]+'이 상대의 기대와 어떻게 만나는지 확인합니다. 합과 충의 개수만으로 관계의 결과를 결정하지 않습니다.'; }
    if(i===0) { c.title='타고난 바탕과 선택의 기준'; c.reality='타고난 반응과 현재 환경을 구분하며 읽습니다. 세부 성향은 다음 장, 실제 활용은 각 분야와 마지막 실천 계획에서 확인합니다.'; }
    if(i===3) { c.title='같은 힘에 조건을 붙이면 약점이 달라집니다'; c.reality=t[1]+'이 도움이 된 장면과 부담이 된 장면을 비교합니다. '+support; c.strength='어려움을 줄이는 기준이 생기면 '+t[0]+'을 필요한 상황에서 선택해 사용할 수 있습니다.'; c.risk='실제 원인을 확인하지 않고 성격을 모두 바꾸려 하면 기존의 강점까지 쓰기 어려울 수 있습니다.'; }
    if(i===8) { c.title='몸의 기록으로 생활 리듬을 조정합니다'; c.reality='사주로 질병이나 체력을 진단하지 않습니다. '+support+' 이 설명은 생활 부담을 돌아보는 참고 관점입니다.'; c.strength='원국의 특징을 생활 기록과 비교하면 자신에게 지속 가능한 일정과 휴식 방식을 찾는 데 쓸 수 있습니다.'; c.risk='오행이나 신살만으로 신체 증상을 설명하면 실제 원인을 놓칠 수 있습니다.'; c.reinforce='생활 기록을 기반으로 잘 유지된 일정의 조건을 반복합니다. 불편한 증상은 운세 해석으로 결론 내리지 않습니다.'; }
    if(i>=9 && i<=12) {
      c.title= i===9 ? '환경은 바뀌어도 원국과 운은 구분해 읽습니다' : i===10 ? '10년의 배경과 현재 선택을 함께 봅니다' : i===11 ? '해마다의 흐름을 준비 계획으로 바꿉니다' : '올해의 배경 안에서 달별 부담을 조정합니다';
      c.reality=(i===10 && sd.currentDaewoon ? '현재 대운은 '+sd.currentDaewoon.ganzhi+'입니다. ' : i===12 && sd.sewoon ? '올해 세운은 '+sd.sewoon.year+'년 '+sd.sewoon.ganzhi+'입니다. ' : '')+(['긴 시간의 흐름은 지원 환경의 변화와 함께 비교합니다.','대운의 배경은 해별 사건과 구분해 읽습니다.','향후 열 해는 각각의 세운과 겹치는 대운을 함께 확인합니다.','올해의 흐름 안에서 절기별 월운의 차이를 확인합니다.'][i-9])+' 같은 흐름도 원국의 지원과 실제 자원에 따라 다르게 활용됩니다.';
      c.strength=context+'에서는 환경 변화와 맡을 역할을 함께 검토하면 준비와 실행의 순서를 정하는 데 도움이 됩니다.';
      c.risk=context+'을 읽을 때 좋은 시기를 사건의 보장으로 읽거나 부담 신호를 실패로 단정하면 선택지가 좁아질 수 있습니다.';
      c.reinforce=context+'의 계획을 실행할 자원과 도움을 확인하고 시기의 설명을 실제 상황과 비교합니다.';
      c.evidence+=' 대운은 10년 배경, 세운은 해당 연도, 월운은 절기 구간입니다. 현재 운의 통근 보강이 원국 판정을 변경하지 않습니다.';
    }
    if(sd.reviewConditions && sd.reviewConditions.extremeStrength) c.evidence+=' 강약이 극단에 가까워 기본 보완 방향의 적용에는 추가 검토가 필요합니다. 다른 격국을 임의로 확정하지 않습니다.';
    if((i===13 || i===14) && sd.interpretationBasis) c.evidence+=' 조후 후보는 고전의 일간·월별 표를 그대로 계산한 결과가 아닌 한난조습 지표의 보완 방향입니다.';
    if(i===13 || i===14) c.evidence+=' 학파별 판단: '+(methodText || '용신 후보 확인 불가')+'. 후보가 다르면 조후와 억부의 목적을 구분하며, 색·물건을 확정적인 처방으로 제시하지 않습니다.';
    return subjectCard(sd,i) || c;
  }
  // Subject-specific factual drafts. Verified DB claims replace these through the writer.
  // These drafts never infer an event or a traditional structure from a single percentage.
  function subjectCard(sd,i) {
    var g=sd.groups || {}, pct=function(k){return Math.round(g[k] || 0)+'%';}, p=sd.pillars || {}, positions=function(groups){return ['year','month','day','hour'].filter(function(k){return p[k];}).map(function(k){var v=p[k];return ({year:'연주',month:'월주',day:'일주',hour:'시주'}[k])+': '+(v.stemTG || '천간 십성 미확인')+' / '+(v.branchTG || '지지 십성 미확인');}).join(' · ');};
    var note=!(p.hour)?' 시간 미상이므로 시주·자녀궁·말년 관련 판단은 보류합니다.':'';
    var base={title:'',why:'',reality:'',strength:'',risk:'',reinforce:'',practice:TASKS[i],evidence:''};
    if(i===4) Object.assign(base,{
      title:'직업 선택은 맡을 과제와 지원 조건부터 비교합니다.',
      why:'직업 관련 계산값은 관성 '+pct('관성')+', 인성 '+pct('인성')+', 식상 '+pct('식상')+', 재성 '+pct('재성')+'입니다. 위치별 십성은 '+positions()+'. 비중만으로 직종이나 조직 적합성을 확정하지 않습니다.',
      reality:'조직 안에서 맡는 업무와 독립적으로 납품하는 업무를 나누어 비교합니다. 전문·기술·창작·영업 직군은 실제 과제와 확보한 역량을 함께 확인해야 합니다.',
      strength:'업무에서 활용할 강점은 검수된 직업 판단의 적용 조건이 있어야 설명할 수 있습니다. 현재 계산값만으로 추진력이나 책임감을 대신 평가하지 않습니다.',
      risk:'사업에서는 매출과 이익, 역할과 권한을 혼동하면 운영 부담을 놓칩니다. 이직·확장에 유리한 시기라는 판단은 해당 대운·세운을 조건으로 가진 자료가 필요합니다.',
      reinforce:'직무별 작은 과제를 수행하고 완성도·소요 시간·고객 반응을 비교합니다. 사업 수익 모델은 가격·원가·반복 구매·납품 가능량을 숫자로 기록합니다.',
      evidence:'관성·인성·식상·재성의 비중과 위치는 계산 자료입니다. 조직 적합성·직군·사업 성취는 해당 조건에 맞는 검수된 직업 규칙이 확보된 뒤 조건부로 해석합니다.'+note});
    else if(i===5) Object.assign(base,{
      title:'돈을 버는 능력과 돈이 남는 구조를 나누어 봅니다.',
      why:'재물 관련 계산값은 재성 '+pct('재성')+', 식상 '+pct('식상')+', 비겁 '+pct('비겁')+'입니다. 위치별 십성은 '+positions()+'. 재성 비중이 재산 규모나 수익률을 뜻하지는 않습니다.',
      reality:'근로소득은 고정 수입과 생활비, 사업소득은 매출과 회수 기간, 투자소득은 원금과 감당할 손실을 나누어 확인합니다. 특정 소득원이 유리하다는 판단은 검수된 재물 근거가 필요합니다.',
      strength:'수입을 늘릴 수 있는 조건과 재물을 축적할 조건은 별도 판단입니다. 재성·식상·비겁의 관계에 맞는 자료가 부족하면 어느 수익 방식이 적합한지 단정하지 않습니다.',
      risk:'지출·고정비·미수금·과도한 투자는 서로 다른 손실 경로입니다. 재성 비중을 가난·파산의 예고로 바꾸지 않습니다.',
      reinforce:'월 수입에서 고정비와 변동비를 분리하고 실제로 남는 금액을 확인합니다. 수익화 전에는 판매 단가·원가·회수 기간과 최대 손실을 먼저 적습니다.',
      evidence:'재성의 강약·위치와 식상·비겁 분포를 근거로 확인합니다. 식상생재나 재물 손실 구조는 관계 조건이 충족된 규칙에서만 설명하고, 대운·세운의 수익을 보장하지 않습니다.'+note});
    else if(i===6) Object.assign(base,{
      title:'연애의 갈등과 결혼생활의 조율 조건을 구분합니다.',
      why:'배우자궁으로 살필 일지는 '+(p.day ? p.day.ko : '확인 불가')+'입니다. 일지의 십성은 '+(p.day && p.day.branchTG || '확인 불가')+'이며 원국의 합 '+(sd.combinations || []).length+'개, 충·형 등 '+(sd.clashes || []).length+'개가 전달되어 있습니다. 개수만으로 혼인 결과를 결정하지 않습니다.',
      reality:'연애에서는 연락과 애정 표현을, 결혼생활에서는 생활비·집안일·가족 경계를 조율하는 상황을 나누어 봅니다. 실제 상대와의 경험 없이 어떤 배우자를 만난다고 확정하지 않습니다.',
      strength:'잘 맞는 관계는 서로의 기대와 부담을 조율하는 구체적인 조건으로 설명합니다. 배우자성과 배우자궁에 맞는 검수 자료가 부족하면 관계 적합성 판단을 보류합니다.',
      risk:'갈등이 생기는 생활 장면과 관계 회복 방법을 함께 확인합니다. 원국의 충을 이혼으로, 합을 행복한 결혼으로 곧바로 바꾸어 해석하지 않습니다.',
      reinforce:'원하는 연락 빈도와 혼자 쉴 시간, 갈등 때 대화할 시간을 상대와 합의합니다. 결혼을 논의한다면 생활비 분담·거주·가족 경계를 항목별로 적습니다.',
      evidence:'배우자궁·십성·원국 관계는 계산 자료이며 배우자성은 기존 해석 기준과 자료를 함께 확인합니다. 혼인 시기는 실제 운 조건을 가진 검수 규칙이 있을 때만 조건부로 설명합니다.'+note});
    else if(i>=9 && i<=12) {
      var scope=['전체 인생 흐름','현재 대운','향후 세운','올해와 월운'][i-9];
      Object.assign(base,{title:scope+'은 변화의 조건과 준비할 일을 나누어 읽습니다.',
        why:scope+'의 계산 자료를 원국과 대조합니다. '+(i===10 && sd.currentDaewoon?'현재 대운은 '+sd.currentDaewoon.ganzhi+'입니다. ':i===12 && sd.sewoon?'올해 세운은 '+sd.sewoon.year+'년 '+sd.sewoon.ganzhi+'입니다. ':'시기별 간지는 아래 계산표에서 확인합니다. ')+'같은 운도 원국에 따라 작용이 달라지므로 검수된 시간 조건이 필요합니다.',
        reality:scope+'에서 재물은 수입·회수·지출, 직업은 역할·이직·확장, 관계는 만남·갈등·조율로 구분합니다. 변화를 성격 재소개로 대신하지 않습니다.',
        strength:scope+'의 기회는 어떤 원국 조건과 지원 환경이 만날 때 적용되는지 확인합니다. 계산 모델의 흐름 라벨만으로 부·승진·혼인을 예고하지 않습니다.',
        risk:scope+'의 위험은 해당 시기의 부담 조건과 감당할 자원을 함께 비교합니다. 근거 없는 해·월의 사건을 만들어 경고하지 않습니다.',
        reinforce:scope+'에 검토할 돈·업무·관계의 목표를 따로 적고 유지할 일과 미룰 일을 나눕니다. 실제 자원과 일정이 바뀌면 계획도 다시 점검합니다.',
        evidence:scope+' 판단은 대운·세운·월운이 실제 적용 조건으로 연결된 규칙만 사용합니다. 원국과 운을 구분하고 유리·불리한 방향의 근거가 함께 있으면 양쪽을 보존합니다.'+note});
    } else if(i===3 || i===13 || i===14) {
      var focus=i===3?'약점 보완 계획':i===13?'환경과 활동':'개운 실천 계획';
      Object.assign(base,{title:focus+'은 생활에서 실행하고 점검할 수 있어야 합니다.',
        why:focus+'에 쓸 계산 참고값은 학파별 용신 후보와 기존 안내입니다. 앞선 재물·직업·관계 분석에서 확인된 부담을 우선하고 새로운 기질 판단을 만들지 않습니다.',
        reality:focus+'에서는 운동·학습·직업 역량·수면·공간을 현실 행동으로 다룹니다. 색·방향·물건 등의 전통 상징은 행동 효과가 검증된 처방과 구분합니다.',
        strength:focus+'의 우선순위는 앞서 확인한 강점이 실제로 쓰이는 상황을 늘리는 것입니다. 설명과 실제 생활이 다르면 경험과 환경을 먼저 다시 확인합니다.',
        risk:focus+'을 바꿔도 결과가 보장되지는 않습니다. 상징적인 물건 구입이나 색 변경을 돈·관계·직업 문제의 해결로 단정하지 않습니다.',
        reinforce:focus+'에서 행동 하나를 고르고 시작일·점검일·관찰할 결과·중단 기준을 적습니다. 학습은 산출물, 운동은 유지 가능한 횟수, 업무는 완료 기준으로 점검합니다.',
        evidence:focus+'의 현실 전략은 앞선 검증된 분석을 종합한 조언이며 새로운 미래 예측이 아닙니다. 억부·조후·통관 후보가 다르면 목적과 예외를 구분하고 전통 상징은 상징으로 표시합니다.'+note});
    } else return null;
    if(sd.reviewConditions && sd.reviewConditions.extremeStrength)base.evidence+=' 극단적인 강약 모델은 추가 검토가 필요합니다.';
    if(sd.reviewConditions && sd.reviewConditions.methodDifference)base.evidence+=' 억부와 조후 후보가 다르므로 각각의 목적과 적용 조건을 확인합니다.';
    return base;
  }
  function scenes(c, id) { return FIELDS.map(function(f,n){ return { sceneId:id+'_guide_'+n, sceneType:'life', bg:'black', layout:'DATA', readingRole:f[0], readingLayer:f[2], html:'<section class="scene rv rd-prose" data-sc="'+esc(id+'_guide_'+n)+'">'+(['why','evidence'].indexOf(f[0])>=0?'<details class="reading-evidence"><summary>왜 이런 풀이가 나왔나요?</summary>':'')+'<div class="cap">'+esc(f[1])+' · '+({fact:'계산 모델의 출력',interpretation:'조건부 풀이',advice:'현실 실천 제안',model:'근거와 예외'}[f[2]])+'</div><p class="lead" data-reading-role="'+f[0]+'">'+esc(c[f[0]])+'</p>'+(['why','evidence'].indexOf(f[0])>=0?'</details>':'')+'</section>' }; }); }
  function build(rep, sd, H) {
    if(rep.readingFlow || rep.project && rep.project.id && rep.project.id !== 'full') return rep;
    var original=rep.chapters || [], buckets=TITLES.map(function(){return [];});
    original.forEach(function(c){buckets[sectionOf(c)].push(c);});
    var out=[], cards=[], future=[];
    if(H && H.M && H.ch) future=H.M.seunRange(H.ch,sd.nowYear,sd.nowYear+9).map(function(x){return {year:x.year,ganzhi:H.M.gzNameK(x),season:R.SajuData.seasonOf(x.ev)};});
    buckets.forEach(function(list,i){
      var preferred=['c00','c03','deep_proscons','reading_transform','c06','c08','c09','c11','deep_health','life_prologue','deep_daewoon','deep_seun','c17','deep_places','c20'][i];
      var pi=list.findIndex(function(c){return (c.base || c.id)===preferred;}); if(pi>0) list=[list[pi]].concat(list.slice(0,pi),list.slice(pi+1));
      var core=card(sd,i), first=list[0], id=first ? first.id : 'reading_section_'+(i+1);
      var template=null, templateId=null;
      list.some(function(c){if(c.lead && c.lead.readingCoreTemplate){template=c.lead.readingCoreTemplate;templateId=c.lead.id;return true;}return false;});
      if(template) Object.keys(template).forEach(function(k){if(['title','reality','strength','risk','reinforce','practice'].indexOf(k)<0 || typeof template[k]!=='string')return;
        var text=R.Rules.tpl(template[k],{dominantGroup:sd.dominantGroup,strengthZone:sd.strength.zone,dayMasterEl:sd.dayMaster.el,yongEl:sd.usefulElements && sd.usefulElements.yong});
        if(text.trim() && !/[{}<>]/.test(text) && !(R.Consistency && R.Consistency.checkAll(sd,text).length))core[k]=text;
      });
      cards.push({section:i+1,templateId:templateId,title:TITLES[i],core:core,sourceIds:list.map(function(c){return c.id;})});
      if(!first) first={id:id,base:i===3?'reading_transform':id,kind:'life',scenes:[],modules:[]};
      var primary=Object.assign({},first,{title:TITLES[i],originalTitle:first.title || '',no:out.length+1,act:i+1,readingSection:i+1,chapterKind:i<=2?'self':i===3?'remedy':i===4?'career':i===5?'wealth':i===6?'love':i>=9&&i<=12?'timing':i>=13?'remedy':'',aiEnabled:i!==8 && (list.find(function(c){return !c.deep;}) || {}).aiEnabled !== false,readingCore:core,readingRoles:FIELDS.map(function(f){return f[0];})});
      primary.scenes=[{sceneId:id+'_reading_header',sceneType:'chapterIntro',compact:true,subtitle:'이해 → 활용 → 근거',bg:'black'}].concat(scenes(core,id),(first.scenes || []).filter(function(s){return s.sceneType!=='chapterIntro' && !s.readingRole;}).map(function(s){return Object.assign({},s,{readingSupplementary:!(/^(chart|dataVisualization|timeline)$/.test(s.sceneType) || /<(svg|table)\b/.test(s.html || ''))});}));
      out.push(primary);
      list.slice(1).forEach(function(c){out.push(Object.assign({},c,{readingSupplementary:true,act:i+1,readingSection:i+1,no:out.length+1}));});
    });
    // Never discard custom chapters; unknown IDs stay in relationships as supplementary content.
    return Object.assign({},rep,{chapters:out,acts:TITLES.map(function(t,i){return {id:i+1,title:t,roman:'제'+(i+1)+'부',line:'',pdfDone:''};}),readingFlow:{version:2,sections:cards,future:future},legacyChapters:original});
  }
  function audit(rep) {
    var missing=[],duplicates=[],seen={};
    (rep.chapters || []).forEach(function(c){if(!c.readingCore)return; FIELDS.forEach(function(f){var t=c.readingCore[f[0]];if(typeof t!=='string'||!t.trim())missing.push({id:c.id,field:f[0]});if(typeof t==='string' && f[0]!=='evidence' && f[0]!=='why'){var k=t.replace(/\s+/g,'');if(seen[k])duplicates.push({id:c.id,field:f[0],other:seen[k]});else seen[k]=c.id;}});});
    return {sections:rep.readingFlow ? rep.readingFlow.sections.length : 0,missing:missing,duplicates:duplicates};
  }
  function evidenceScene(chapter) {
    var claims=(chapter.interpretationAnalysis || {}).claims || [];
    var body=claims.map(function(c){
      return '<article><h4>'+esc(c.judgment)+'</h4><p>'+esc((c.elements || []).map(function(x){return x.key+' '+JSON.stringify(x.value);}).join(' · '))+'</p><p>'+esc((c.traditional_rules || []).map(function(x){return x.principle;}).join(' · '))+'</p><p>'+esc((c.evidence || []).map(function(x){return (x.title || x.docId)+(x.pageStart?' '+x.pageStart+'쪽':'')+(x.heading?' · '+x.heading:'');}).join(' / '))+'</p><p>'+esc((c.uncertainty || {}).note || '전통 해석에 따른 가설이며 실제 경험과 다를 수 있습니다.')+'</p></article>';
    }).join('');
    if(!body)return null;
    return {sceneId:chapter.id+'_ux_sources',sceneType:'life',readingLayer:'model',bg:'black',html:'<section class="scene rd-prose"><details class="reading-evidence"><summary>왜 이런 풀이가 나왔나요?</summary>'+body+'</details></section>'};
  }
  R.ReadingFlow={evidenceScene:evidenceScene,scenes:scenes,TITLES:TITLES,FIELDS:FIELDS,MAP:MAP,card:card,build:build,audit:audit,sectionOf:sectionOf};
})(typeof window!=='undefined'?window:globalThis);
