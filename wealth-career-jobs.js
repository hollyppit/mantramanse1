/* 직업·활동 적성 고도화 — 데이터 계층 4/4: 직업 DB.
   · 직업은 오행 하나로 고정하지 않는다. els(쓰이는 오행의 비중, 여러 개) · cats(엔진의 12개 활동 분야 비중) · types(수익 유형 연결) · env(선호하는 업무 환경 범주)를 겹쳐서 정의한다.
   · barrier 는 명리상 적합과 별개인 ‘현실적 진입 조건’이다: license 자격·면허 / experience 경력·포트폴리오 / open 자유 진입.
   · path 는 일반적으로 알려진 자격·경로만 적는다(최신 요건은 시행 기관 확인). 확실하지 않으면 비워 둔다.
   · 관리자 화면에서 직업을 추가·수정·비활성화할 수 있다(functions/api/wealth-career.js). */
(function (G) {
  'use strict';
  var D = G.MantraWealthCareerData; if (!D) throw new Error('wealth-career-data.js 를 먼저 불러오세요');
  var J = function (id, name, grp, o) {
    D.JOBS.push({ id: id, name: name, grp: grp, els: o.els, cats: o.cats, types: o.types, env: o.env || {}, exposes: o.exposes || [], barrier: o.barrier, how: o.how, income: o.income, caution: o.caution, path: o.path || '', v: 1, on: true });
  };
  // 기술·설비
  J('electric', '전기설비 기술자', 'tech', { els: { 화: .5, 금: .3, 수: .2 }, cats: { technical: 1, research: .3, management: .2 }, types: { tech: 1, org: .4 }, env: { role: 'tech', stab: 'stable' }, exposes: ['multitask'], barrier: 'license',
    how: '설비 점검, 시공, 고장 대응을 맡아 현장에서 원인을 찾고 바로잡는 방식으로 일합니다.', income: '자격 수당과 경력에 따른 연봉, 개인 도급·유지보수 계약으로 수익을 만듭니다.', caution: '사고 대응 책임이 따르고 야간·비상 호출이 있을 수 있어 체력과 안전 수칙 관리가 중요합니다.', path: '전기기능사·전기산업기사·전기기사 등 국가기술자격과 현장 경력이 일반적인 경로입니다.' });
  J('hvac', '냉동공조·기계설비 기술자', 'tech', { els: { 수: .4, 금: .4, 화: .2 }, cats: { technical: 1, management: .3 }, types: { tech: 1, org: .4, biz: .2 }, env: { role: 'tech', team: 'mix' }, exposes: ['multitask'], barrier: 'license',
    how: '냉난방·공조·배관 설비를 설치하고 정비하며, 고장 원인을 진단해 해결하는 방식으로 일합니다.', income: '자격과 경력에 따른 연봉, 정비·유지보수 계약, 숙련 후 개인 사업으로 단가를 높이는 방식이 있습니다.', caution: '계절 성수기에 일이 몰리고 현장 환경이 거칠 수 있어 체력과 일정 관리가 중요합니다.', path: '공조냉동기계 관련 국가기술자격(기능사·산업기사·기사)과 현장 경력이 일반적인 경로입니다.' });
  J('facility', '시설관리·설비 유지보수', 'tech', { els: { 토: .4, 금: .3, 화: .3 }, cats: { technical: .8, management: .6, organization: .4 }, types: { tech: .8, org: .7 }, env: { org: 'org', stab: 'stable' }, exposes: ['repetitive'], barrier: 'license',
    how: '건물과 설비를 점검하고 유지·보수하며 사고를 예방하는 일을 맡습니다.', income: '월급제 중심이며 보유 자격에 따른 수당과 경력에 따른 승급으로 커집니다.', caution: '평소엔 조용하다가 사고 때 책임이 집중되는 구조라, 점검 기록을 꼼꼼히 남기는 습관이 필요합니다.', path: '전기·소방·기계 등 관련 국가기술자격을 함께 갖추는 경우가 많습니다.' });
  J('construct', '건축·토목 시공관리', 'tech', { els: { 토: .5, 목: .3, 금: .2 }, cats: { technical: .8, management: .7, planning: .4 }, types: { tech: .8, org: .5, biz: .3 }, env: { role: 'tech', team: 'team' }, exposes: ['multitask', 'hierarchy'], barrier: 'license',
    how: '공정과 안전, 품질을 관리하며 현장의 여러 팀을 조율합니다.', income: '현장 경력과 직급에 따른 연봉, 프로젝트 성과 수당, 숙련 후 시공 사업으로 확장하는 방식이 있습니다.', caution: '책임과 지시가 겹치기 쉬운 환경이라 역할과 보고 체계를 문서로 확인해 두어야 합니다.', path: '건축기사·토목기사 등 국가기술자격과 현장 경력이 일반적인 경로입니다.' });
  J('dev', '소프트웨어 개발자', 'tech', { els: { 수: .4, 금: .3, 화: .3 }, cats: { technical: 1, research: .5, planning: .3 }, types: { tech: 1, prod: .5, edu: .2 }, env: { role: 'tech', work: 'create' }, exposes: ['isolated'], barrier: 'experience',
    how: '요구사항을 설계해 코드로 구현하고 오류를 찾아 개선하는 방식으로 일합니다.', income: '경력에 따른 연봉, 프로젝트 외주, 직접 만든 서비스의 구독·판매 수익으로 확장할 수 있습니다.', caution: '기술 변화가 빠르고 몰입 시간이 길어 학습 시간과 휴식을 일정에 포함해야 합니다.', path: '포트폴리오와 실무 경력이 가장 중요하며, 정보처리기사 같은 자격은 보조 수단으로 쓰입니다.' });
  J('qa', '품질관리·검사', 'tech', { els: { 금: .5, 토: .3, 수: .2 }, cats: { organization: .6, technical: .7, research: .4 }, types: { tech: .7, org: .7 }, env: { org: 'org', work: 'repeat' }, exposes: ['repetitive'], barrier: 'experience',
    how: '기준에 맞는지 측정하고 검사해 불량의 원인을 찾아 개선하는 일을 맡습니다.', income: '월급제와 숙련도에 따른 승급, 품질 컨설팅·감사로 확장하는 방식이 있습니다.', caution: '지적이 일이라 관계가 껄끄러워질 수 있으니 근거 자료와 전달 방식에 신경 써야 합니다.', path: '품질경영기사 등 관련 국가기술자격이 도움이 되는 경우가 있습니다.' });
  J('safety', '산업안전·보건 관리', 'tech', { els: { 금: .4, 토: .4, 수: .2 }, cats: { organization: .7, public: .4, technical: .5 }, types: { org: .8, tech: .6 }, env: { org: 'org', stab: 'stable' }, exposes: ['hierarchy'], barrier: 'license',
    how: '현장의 위험 요인을 점검하고 규정에 맞게 교육·개선하는 일을 맡습니다.', income: '월급제와 자격 수당, 안전 컨설팅·교육으로 확장하는 방식이 있습니다.', caution: '사고가 났을 때 책임이 집중될 수 있어 점검과 교육 기록을 남겨 두어야 합니다.', path: '산업안전 관련 국가기술자격(산업안전기사 등)이 일반적인 경로입니다.' });
  J('craft', '정밀 제작·기능 장인', 'tech', { els: { 금: .5, 목: .2, 토: .3 }, cats: { technical: 1, creative: .4 }, types: { tech: .9, prod: .6 }, env: { team: 'solo', work: 'repeat' }, exposes: ['isolated'], barrier: 'experience',
    how: '손기술과 도구를 다루어 정밀한 결과물을 만들고 숙련도를 장기간 쌓습니다.', income: '제작 단가, 주문 제작 판매, 수리·복원 서비스, 기술 전수·강의로 수익을 만듭니다.', caution: '숙련에 시간이 오래 걸리고 판매 경로가 약하면 수입이 불규칙해질 수 있습니다.', path: '' });
  J('data', '데이터 분석가', 'tech', { els: { 수: .5, 금: .3, 화: .2 }, cats: { research: 1, technical: .5, planning: .4 }, types: { tech: .7, edu: .4, org: .3 }, env: { team: 'solo', role: 'plan' }, exposes: ['isolated'], barrier: 'experience',
    how: '자료를 모으고 정리해 패턴을 찾아내고, 의사결정에 쓸 근거로 설명합니다.', income: '기업 소속 연봉, 분석 용역, 교육·컨설팅으로 확장하는 방식이 있습니다.', caution: '분석 결과를 사람들에게 설명하고 설득하는 힘이 부족하면 가치가 덜 드러날 수 있습니다.', path: '통계·데이터베이스 실력과 분석 포트폴리오가 중요하며, 사회조사분석사 같은 자격이 보조가 될 수 있습니다.' });
  // 전문직
  J('cpa', '회계사·세무사', 'pro', { els: { 금: .5, 수: .3, 토: .2 }, cats: { asset: 1, organization: .5, research: .4 }, types: { tech: .6, org: .7, edu: .3 }, env: { stab: 'stable', work: 'repeat' }, exposes: ['repetitive', 'slowPayoff'], barrier: 'license',
    how: '회계·세무 자료를 검토하고 신고·감사·자문을 맡아 정확성과 신뢰로 일합니다.', income: '법인 소속 연봉, 개업 후 기장·신고 대행 수수료, 자문료로 수익을 만듭니다.', caution: '신고 시즌에 일이 몰리고 실수의 책임이 무겁습니다. 개업 시 영업 경로가 필요합니다.', path: '공인회계사·세무사 등 국가 전문자격 시험을 통과해야 하며 준비 기간이 깁니다.' });
  J('labor', '공인노무사', 'pro', { els: { 금: .4, 토: .3, 수: .3 }, cats: { public: .6, organization: .7, communication: .4, research: .3 }, types: { org: .6, tech: .6, edu: .4 }, env: { role: 'plan' }, exposes: ['emotional'], barrier: 'license',
    how: '노동 관련 법령을 바탕으로 사건을 검토하고 기업과 근로자의 문제를 자문·대리합니다.', income: '법인 소속 연봉, 개업 후 자문료와 사건 수임료로 수익을 만듭니다.', caution: '갈등 상황의 당사자를 계속 마주하므로 감정 소모 관리가 필요합니다.', path: '공인노무사 국가 전문자격 시험을 통과해야 합니다.' });
  J('patent', '변리사·지식재산 전문가', 'pro', { els: { 금: .4, 수: .4, 화: .2 }, cats: { research: .8, technical: .5, public: .4 }, types: { tech: .8, edu: .4 }, env: { team: 'solo', work: 'repeat' }, exposes: ['slowPayoff', 'isolated'], barrier: 'license',
    how: '기술과 법률을 함께 이해해 특허·상표 출원과 분쟁을 다룹니다.', income: '특허 법인 소속 연봉, 개업 후 출원 대리 수수료와 자문료로 수익을 만듭니다.', caution: '준비 기간이 길고 기술 분야 이해와 문서 작업 부담이 큽니다.', path: '변리사 국가 전문자격 시험을 통과해야 하며 이공계 지식이 도움이 됩니다.' });
  J('appraisal', '감정평가·손해사정', 'pro', { els: { 토: .4, 금: .4, 수: .2 }, cats: { asset: .8, research: .6, public: .3 }, types: { tech: .6, org: .5 }, env: { role: 'plan', work: 'repeat' }, exposes: ['repetitive'], barrier: 'license',
    how: '자산 가치나 손해액을 근거 자료로 산정해 평가서·보고서로 정리합니다.', income: '소속 법인 연봉, 개업 후 평가·사정 수수료로 수익을 만듭니다.', caution: '의뢰인과 이해관계가 엇갈릴 수 있어 객관적인 근거와 기록이 중요합니다.', path: '감정평가사·손해사정사 등 관련 자격이 필요합니다.' });
  J('legal', '법무·컴플라이언스', 'pro', { els: { 금: .5, 토: .3, 수: .2 }, cats: { organization: .8, public: .6, research: .3 }, types: { org: .8, tech: .4 }, env: { org: 'org', role: 'plan' }, exposes: ['hierarchy'], barrier: 'experience',
    how: '규정과 계약을 검토하고 위험을 사전에 점검하는 일을 맡습니다.', income: '기업 소속 연봉과 직급, 외부 자문으로 확장하는 방식이 있습니다.', caution: '“안 된다”를 말하는 역할이 많아 의견 전달 방식과 근거 자료가 중요합니다.', path: '' });
  // 조직·관리
  J('civil', '공무원·공공기관 행정', 'org', { els: { 토: .5, 금: .3, 화: .2 }, cats: { public: 1, organization: .8 }, types: { org: 1, edu: .2 }, env: { org: 'org', stab: 'stable', work: 'repeat' }, exposes: ['hierarchy', 'repetitive'], barrier: 'license',
    how: '법과 규정에 따라 행정 업무를 처리하고 정책과 서비스를 운영합니다.', income: '직급·호봉 체계에 따른 월급, 연금과 안정적인 복지로 수입이 쌓이는 방식입니다.', caution: '변화가 느리고 순환 보직이 있어 자율성과 새로움을 원할 때 답답할 수 있습니다.', path: '공개경쟁 채용시험(공무원 시험, 공공기관 채용 전형) 준비가 일반적인 경로입니다.' });
  J('hr', '총무·인사', 'org', { els: { 토: .5, 금: .3, 수: .2 }, cats: { management: .7, organization: .7, communication: .4 }, types: { org: .9, net: .3 }, env: { org: 'org', team: 'team' }, exposes: ['emotional', 'multitask'], barrier: 'experience',
    how: '사람과 제도, 비용을 조율하며 조직이 돌아가도록 지원합니다.', income: '월급제와 직급 상승, 인사·노무 전문가로 성장해 자문 역할로 확장하는 방식이 있습니다.', caution: '양쪽 입장 사이에서 감정 소모가 크고 공은 드러나지 않는 일이 많습니다.', path: '' });
  J('pm', '프로젝트 매니저', 'org', { els: { 토: .4, 화: .3, 목: .3 }, cats: { management: .9, planning: .8, communication: .5 }, types: { org: .7, net: .5, biz: .3 }, env: { role: 'plan', team: 'team' }, exposes: ['multitask'], barrier: 'experience',
    how: '일정·예산·인력을 조율해 프로젝트가 목표대로 끝나도록 이끕니다.', income: '기업 소속 연봉과 직급, 프리랜서 PM 계약으로 확장하는 방식이 있습니다.', caution: '책임은 큰데 권한이 모호한 경우가 많아 역할과 의사결정 범위를 먼저 정해 두어야 합니다.', path: 'PMP 같은 민간 자격이 도움이 될 수 있으나 필수는 아닙니다.' });
  J('corpfin', '기업 재무·회계 실무', 'org', { els: { 금: .5, 수: .3, 토: .2 }, cats: { asset: 1, organization: .6 }, types: { org: .8, tech: .4 }, env: { org: 'org', stab: 'stable', work: 'repeat' }, exposes: ['repetitive'], barrier: 'experience',
    how: '기업의 수입·지출을 기록하고 결산·예산을 관리하며 자금 흐름을 점검합니다.', income: '월급제와 직급 상승, 전문 자격 취득 후 이직·자문으로 확장하는 방식이 있습니다.', caution: '결산 시기에 업무가 몰리고 작은 오류가 큰 문제로 이어질 수 있습니다.', path: '전산회계·전산세무 같은 단계별 자격이 있고, 상위 단계로 공인회계사 등이 있습니다.' });
  J('ops', '운영·물류 관리', 'org', { els: { 토: .5, 금: .3, 수: .2 }, cats: { management: 1, organization: .4 }, types: { org: .6, biz: .5 }, env: { role: 'plan', team: 'team' }, exposes: ['multitask'], barrier: 'experience',
    how: '재고·인력·일정을 조율해 현장이 막힘없이 돌아가도록 운영합니다.', income: '월급제와 책임자 승진, 운영 노하우로 독립 운영사업을 여는 방식이 있습니다.', caution: '동시에 여러 일이 터지는 환경이라 우선순위 기준을 미리 정해 두어야 합니다.', path: '' });
  // 지식·교육
  J('teacher', '교사·교육 공무원', 'edu', { els: { 목: .4, 토: .3, 화: .3 }, cats: { education: 1, public: .6, communication: .5 }, types: { edu: .9, org: .7 }, env: { org: 'org', stab: 'stable' }, exposes: ['emotional'], barrier: 'license',
    how: '정해진 교육과정 안에서 학생을 가르치고 성장을 돕는 일을 맡습니다.', income: '호봉제 월급과 안정적인 복지로 수입이 쌓이는 방식입니다.', caution: '감정 노동과 행정 업무가 겹치기 쉬워 지치지 않게 경계를 정하는 것이 중요합니다.', path: '교원 자격(정교사)을 취득하고 임용 과정을 거치는 경로가 일반적입니다.' });
  J('instructor', '학원·온라인 강사', 'edu', { els: { 목: .4, 화: .4, 수: .2 }, cats: { education: 1, communication: .7, creative: .3 }, types: { edu: 1, net: .4, biz: .3 }, env: { org: 'ind', team: 'team' }, exposes: ['competition', 'emotional'], barrier: 'experience',
    how: '내용을 구조화해 쉽게 전달하고, 수강생의 이해와 결과를 이끌어 냅니다.', income: '강의료·성과 배분, 온라인 강의·교재 판매로 수익을 확장할 수 있습니다.', caution: '수강생 수에 수입이 좌우되어 변동이 크고, 인기에 대한 부담이 따를 수 있습니다.', path: '' });
  J('edu-content', '교육 콘텐츠·교재 개발', 'edu', { els: { 목: .5, 수: .3, 화: .2 }, cats: { education: .8, creative: .7, research: .4 }, types: { edu: .9, prod: .6 }, env: { team: 'solo', work: 'create' }, exposes: ['slowPayoff'], barrier: 'experience',
    how: '지식을 학습 순서에 맞게 설계해 교재·영상·문제집으로 만듭니다.', income: '원고료·인세, 콘텐츠 판매, 구독·강의 수익으로 만듭니다.', caution: '결과물이 팔리기까지 시간이 걸려 수입이 늦게 반영됩니다.', path: '' });
  J('researcher', '연구원', 'edu', { els: { 수: .5, 금: .3, 목: .2 }, cats: { research: 1, education: .4 }, types: { edu: .6, tech: .7 }, env: { team: 'solo', work: 'repeat' }, exposes: ['slowPayoff', 'isolated'], barrier: 'experience',
    how: '자료와 실험으로 가설을 검증하고 결과를 논문·보고서로 정리합니다.', income: '연구기관·기업 연구소 소속 연봉, 연구비·특허 수익으로 구성됩니다.', caution: '성과가 늦게 확인되고 평가가 연구비에 묶이기 쉬워 장기 호흡이 필요합니다.', path: '석·박사 학위와 연구 실적이 중요합니다.' });
  J('counselor', '상담사·코치', 'edu', { els: { 수: .4, 목: .3, 토: .3 }, cats: { communication: 1, education: .6 }, types: { edu: .7, net: .5 }, env: { team: 'mix', org: 'ind' }, exposes: ['emotional'], barrier: 'license',
    how: '사람의 이야기를 듣고 정리해 스스로 방향을 찾도록 돕는 일을 맡습니다.', income: '기관 소속 연봉, 개인 상담료, 강연·교육 프로그램으로 수익을 만듭니다.', caution: '감정 소모가 크고 내담자와의 경계 설정이 중요합니다. 개업 초기에는 고객 확보가 과제입니다.', path: '청소년상담사·직업상담사·임상심리사 등 관련 국가자격이 있으며 분야별 요건이 다릅니다.' });
  J('consultant', '컨설턴트', 'edu', { els: { 수: .4, 금: .3, 화: .3 }, cats: { planning: .9, education: .5, communication: .6, research: .5 }, types: { edu: .8, net: .5, tech: .4 }, env: { org: 'ind', role: 'plan' }, exposes: ['competition'], barrier: 'experience',
    how: '문제를 진단해 해법을 정리하고 고객이 실행하도록 돕습니다.', income: '프로젝트 단위 컨설팅료, 월 자문료, 교육·진단 상품으로 수익을 만듭니다.', caution: '신뢰와 실적이 없으면 의뢰가 들어오지 않아 초기 사례를 쌓는 과정이 필요합니다.', path: '' });
  // 창작
  J('writer', '작가·카피라이터', 'creative', { els: { 목: .5, 수: .3, 화: .2 }, cats: { creative: 1, communication: .4 }, types: { prod: 1, edu: .4 }, env: { team: 'solo', org: 'ind', work: 'create' }, exposes: ['slowPayoff'], barrier: 'open',
    how: '글로 생각과 이야기를 정리해 책·칼럼·광고 문구 같은 결과물로 만듭니다.', income: '원고료·인세, 외주 계약, 뉴스레터·콘텐츠 구독 수익으로 만듭니다.', caution: '수입 편차가 크고 반응이 늦게 오기 쉬워 꾸준한 발행과 판매 경로를 함께 설계해야 합니다.', path: '' });
  J('designer', '디자이너', 'creative', { els: { 목: .4, 화: .3, 금: .3 }, cats: { creative: .9, technical: .6, planning: .3 }, types: { prod: 1, net: .3 }, env: { work: 'create' }, exposes: ['competition'], barrier: 'experience',
    how: '아이디어를 시각 결과물로 만들고 고객의 요구에 맞게 다듬습니다.', income: '소속 연봉, 외주 프로젝트 단가, 템플릿·디자인 소스 판매로 만듭니다.', caution: '수정 요구가 잦고 단가가 낮아지기 쉬워 범위와 횟수를 계약에 명시해야 합니다.', path: '컬러리스트기사·시각디자인기사 같은 자격이 있으나 포트폴리오가 더 중시됩니다.' });
  J('creator', '영상·콘텐츠 크리에이터', 'creative', { els: { 화: .5, 목: .3, 수: .2 }, cats: { creative: 1, technical: .6, communication: .4 }, types: { prod: 1, net: .4, biz: .3 }, env: { org: 'ind', stab: 'change' }, exposes: ['speculation', 'competition'], barrier: 'open',
    how: '기획·촬영·편집을 직접 해서 꾸준히 콘텐츠를 올리고 시청자를 모읍니다.', income: '광고·협찬, 구독·후원, 자체 상품 판매로 수익을 만듭니다.', caution: '수입이 조회수와 알고리즘에 좌우되어 변동이 크고, 꾸준함이 지치기 쉽습니다.', path: '' });
  J('webtoon', '웹툰·일러스트', 'creative', { els: { 목: .5, 화: .3, 수: .2 }, cats: { creative: 1, technical: .5 }, types: { prod: 1, edu: .2 }, env: { team: 'solo', org: 'ind' }, exposes: ['slowPayoff', 'isolated'], barrier: 'open',
    how: '이야기를 구성하고 그림으로 연재하거나 의뢰받아 일러스트를 제작합니다.', income: '연재 원고료, 외주 일러스트, 굿즈·IP 수익으로 만듭니다.', caution: '마감 압박과 장시간 작업으로 건강을 해치기 쉬우며, 수입이 불규칙합니다.', path: '' });
  J('chef', '요리사·제과제빵', 'creative', { els: { 화: .5, 토: .3, 금: .2 }, cats: { technical: .8, creative: .6, business: .3 }, types: { prod: .8, tech: .5, biz: .4 }, env: { role: 'tech', work: 'repeat' }, exposes: ['multitask'], barrier: 'experience',
    how: '재료와 불을 다루어 맛과 모양을 만들고, 숙련할수록 완성도가 높아집니다.', income: '주방 소속 급여, 자기 가게 운영, 클래스·밀키트 판매로 수익을 만듭니다.', caution: '근무 강도가 높고 창업 시 재고·임대료 등 고정비 부담이 큽니다.', path: '조리·제과제빵 관련 국가기술자격이 있으며 현장 경력이 중시됩니다.' });
  // 사업·유통
  J('store', '온라인 스토어 운영', 'biz', { els: { 금: .3, 수: .4, 토: .3 }, cats: { business: .9, sales: .6, management: .5, creative: .3 }, types: { biz: 1, prod: .4, net: .3 }, env: { org: 'ind', stab: 'change' }, exposes: ['speculation', 'competition'], barrier: 'open',
    how: '상품 소싱, 가격, 마케팅, 고객 응대를 직접 운영하며 마진을 만듭니다.', income: '판매 마진, 자체 브랜드 상품, 광고·제휴 수익으로 만듭니다.', caution: '재고와 광고비로 현금이 묶이기 쉬우니 작은 규모로 시험한 뒤 확장해야 합니다.', path: '' });
  J('retail', '도소매·매장 창업', 'biz', { els: { 토: .4, 금: .3, 수: .3 }, cats: { business: 1, management: .6, sales: .5 }, types: { biz: 1, net: .4 }, env: { org: 'ind' }, exposes: ['speculation'], barrier: 'open',
    how: '상품과 입지를 정해 직접 사고팔며 단골을 모으는 방식으로 일합니다.', income: '판매 마진과 재방문 매출, 가맹·온라인 병행으로 수익을 만듭니다.', caution: '임대료·인건비 같은 고정비가 커서 현금흐름 관리가 핵심입니다.', path: '' });
  J('mdtrade', '무역·MD(상품기획)', 'biz', { els: { 금: .4, 수: .4, 토: .2 }, cats: { sales: .8, planning: .6, asset: .4, business: .5 }, types: { biz: .9, net: .5, org: .4 }, env: { stab: 'change', team: 'team' }, exposes: ['competition', 'multitask'], barrier: 'experience',
    how: '시장의 수요를 읽어 상품을 고르고 가격과 조건을 협상해 들여오거나 기획합니다.', income: '기업 소속 연봉과 성과급, 독립 후 무역·유통 마진으로 수익을 만듭니다.', caution: '환율·재고 변동에 노출되어 큰 거래일수록 계약 조건과 위험 관리가 중요합니다.', path: '' });
  J('realty', '공인중개사', 'biz', { els: { 토: .5, 금: .3, 수: .2 }, cats: { sales: .7, business: .7, communication: .5 }, types: { biz: .9, net: .7 }, env: { org: 'ind', team: 'team' }, exposes: ['competition', 'emotional'], barrier: 'license',
    how: '부동산 거래를 중개하며 조건을 조율하고 계약이 안전하게 이뤄지도록 돕습니다.', income: '중개 수수료가 중심이며 거래 건수와 지역 신뢰에 따라 편차가 큽니다.', caution: '거래 성사 여부에 수입이 좌우되고 분쟁 책임이 따르므로 서류 확인을 철저히 해야 합니다.', path: '공인중개사 자격시험 합격 후 등록 절차를 거쳐야 합니다.' });
  J('restaurant', '요식업 창업', 'biz', { els: { 화: .4, 토: .4, 수: .2 }, cats: { business: .8, management: .7, technical: .3 }, types: { biz: .9, prod: .4, net: .4 }, env: { org: 'ind', team: 'team' }, exposes: ['multitask', 'speculation'], barrier: 'open',
    how: '메뉴와 입지를 정해 직접 운영하며 단골과 입소문으로 매출을 키웁니다.', income: '매장 매출, 배달·밀키트·가맹으로 수익을 확장할 수 있습니다.', caution: '임대료·식자재·인건비 등 고정비 비중이 높아 시작 규모와 비상금을 신중히 정해야 합니다.', path: '' });
  J('marketer', '마케터', 'biz', { els: { 화: .4, 목: .3, 수: .3 }, cats: { sales: .5, planning: .7, creative: .6, communication: .6 }, types: { net: .6, prod: .5, biz: .5 }, env: { team: 'team', work: 'create' }, exposes: ['competition', 'multitask'], barrier: 'experience',
    how: '시장과 고객을 읽어 메시지와 채널을 설계하고 성과를 측정해 개선합니다.', income: '기업 소속 연봉, 대행 계약, 직접 운영하는 상품·브랜드 수익으로 만듭니다.', caution: '성과 지표에 압박을 받기 쉬워 장기 브랜드 작업과 단기 성과의 균형이 필요합니다.', path: '' });
  // 협업·네트워크
  J('b2b', '법인 영업(B2B)', 'net', { els: { 화: .4, 금: .3, 토: .3 }, cats: { sales: 1, communication: .7 }, types: { net: 1, biz: .7 }, env: { team: 'team', stab: 'change' }, exposes: ['competition'], barrier: 'experience',
    how: '기업 고객의 필요를 파악해 제안하고 협상해 계약을 이끌어 냅니다.', income: '기본급과 성과 수수료, 장기 거래처 확보에 따른 반복 매출로 커집니다.', caution: '실적 압박이 크고 거절이 잦아 관계 관리와 지속 가능한 목표 설정이 중요합니다.', path: '' });
  J('event', '행사·커뮤니티 기획', 'net', { els: { 화: .4, 목: .4, 토: .2 }, cats: { planning: .6, communication: .8, management: .6 }, types: { net: 1, prod: .4 }, env: { team: 'team', stab: 'change' }, exposes: ['multitask', 'emotional'], barrier: 'experience',
    how: '사람을 모으고 프로그램을 설계해 현장에서 운영합니다.', income: '기획·운영 대행료, 참가비·후원, 멤버십 수익으로 만듭니다.', caution: '준비와 당일 변수가 많아 체력 소모가 크고, 사람 관계에 시간이 많이 쓰입니다.', path: '' });
  J('planner', '보험·금융 상담', 'net', { els: { 금: .4, 수: .3, 토: .3 }, cats: { sales: .8, asset: .6, communication: .7 }, types: { net: .8, biz: .6 }, env: { team: 'team', org: 'ind' }, exposes: ['competition', 'emotional'], barrier: 'license',
    how: '고객의 재무 상황을 듣고 상품과 계획을 설명해 장기 관계를 이어 갑니다.', income: '상품 판매 수수료와 유지 수수료, 소개로 이어지는 고객 기반으로 수익을 만듭니다.', caution: '초기엔 수입이 불안정하고 설명 책임이 따르므로 고객 이익 중심의 신뢰 관리가 핵심입니다.', path: '보험설계사·투자자산운용사 등 금융 관련 자격 시험을 거쳐 등록·종사하는 경로가 있습니다.' });
  J('agency', '에이전시·제휴 파트너', 'net', { els: { 화: .4, 수: .3, 금: .3 }, cats: { sales: .7, planning: .5, communication: .7 }, types: { net: .9, biz: .5 }, env: { org: 'ind', team: 'team' }, exposes: ['competition'], barrier: 'experience',
    how: '사람과 기업을 연결하고 제휴를 설계해 중개·대행으로 가치를 만듭니다.', income: '대행 수수료, 제휴 수익 배분, 소개 보상으로 만듭니다.', caution: '관계가 수입의 전부라 계약과 수익 배분을 문서로 남기는 것이 필수입니다.', path: '' });
  J('welfare', '사회복지사', 'net', { els: { 토: .4, 수: .3, 목: .3 }, cats: { communication: .8, public: .7, education: .3 }, types: { edu: .5, org: .6, net: .4 }, env: { org: 'org', team: 'team' }, exposes: ['emotional'], barrier: 'license',
    how: '필요한 사람과 지원 자원을 연결하고 지속적으로 돌보는 일을 맡습니다.', income: '기관 소속 월급제가 중심이며 경력과 자격에 따른 승급이 있습니다.', caution: '업무 강도에 비해 보상이 낮을 수 있고 감정 소모가 커서 경계 설정이 중요합니다.', path: '사회복지사 자격(관련 교과목 이수와 국가시험 요건)을 갖추는 경로가 일반적입니다.' });
  // ───── 2026-11-15 확장: 41 → 92개(돌봄·서비스·공공·금융·IT·예술·운송 분류 추가, 기존 분류 보강) ─────
  // 돌봄·보건
  J('nurse', '간호사', 'care', { els: { 수: .4, 목: .3, 토: .3 }, cats: { public: .6, communication: .7, technical: .5 }, types: { tech: .7, org: .6, net: .3 }, env: { org: 'org', team: 'team', stab: 'stable' }, exposes: ['emotional', 'multitask'], barrier: 'license',
    how: '환자 상태를 살피고 처치·투약·기록을 맡아 의료진과 환자 사이를 잇는 방식으로 일합니다.', income: '병원 소속 월급과 교대 수당이 중심이고, 전문 분야 경력이 쌓이면 이직·전담 직무로 보수를 높입니다.', caution: '교대 근무와 감정 소모가 커서 수면 습관과 쉬는 날 지키기가 오래 일하는 힘이 됩니다.', path: '간호학과 졸업 후 간호사 국가시험에 합격하는 경로가 일반적입니다.' });
  J('physio', '물리치료사·재활 전문가', 'care', { els: { 목: .4, 토: .3, 금: .3 }, cats: { technical: .8, communication: .6, education: .3 }, types: { tech: .9, net: .3 }, env: { role: 'tech', team: 'team' }, exposes: ['repetitive'], barrier: 'license',
    how: '몸의 움직임을 평가하고 운동·도수 치료로 회복 계획을 세워 꾸준히 따라가 주는 방식으로 일합니다.', income: '병원·센터 월급이 중심이고, 경력이 쌓이면 전문 센터 운영이나 개인 프로그램으로 단가를 올립니다.', caution: '같은 동작을 오래 반복해 내 몸도 상하기 쉬워서, 자세 관리와 체력 관리가 일의 일부입니다.', path: '물리치료학과 졸업 후 물리치료사 국가시험을 거치는 경로가 일반적입니다.' });
  J('caregiver', '요양보호·돌봄 서비스', 'care', { els: { 토: .5, 수: .3, 목: .2 }, cats: { public: .7, communication: .7 }, types: { org: .4, net: .6, prod: .2 }, env: { team: 'team', stab: 'stable' }, exposes: ['emotional', 'repetitive'], barrier: 'license',
    how: '어르신이나 도움이 필요한 사람의 일상을 곁에서 챙기며 생활을 이어 가도록 돕습니다.', income: '시설·방문 기관의 시급·월급이 중심이고, 경력이 쌓이면 센터 운영이나 관리 직무로 넓힙니다.', caution: '몸과 마음을 함께 쓰는 일이라, 혼자 떠안지 말고 기관과 나눠 맡는 선을 정해 두는 편이 좋습니다.', path: '요양보호사 교육 이수와 자격시험을 거치는 경로가 일반적입니다.' });
  J('pharma', '약사·약국 운영', 'care', { els: { 수: .4, 토: .3, 금: .3 }, cats: { technical: .8, research: .5, business: .4 }, types: { tech: 1, biz: .4 }, env: { stab: 'stable', work: 'repeat' }, exposes: ['repetitive'], barrier: 'license',
    how: '처방을 확인해 약을 짓고 복용법을 설명하며, 약국을 열면 재고와 손님 관리까지 맡습니다.', income: '근무 약사 급여나 약국 운영 수익으로 만들고, 상담·건강기능식품 같은 부가 매출을 더합니다.', caution: '실수가 바로 건강 문제로 이어져서 확인 절차를 습관으로 만드는 것이 중요합니다.', path: '약학대학 졸업 후 약사 국가시험을 거치는 경로가 일반적입니다.' });
  J('nutrition', '영양사·식단 관리', 'care', { els: { 토: .5, 화: .3, 목: .2 }, cats: { research: .5, technical: .5, education: .5 }, types: { tech: .7, edu: .5 }, env: { stab: 'stable' }, exposes: ['repetitive'], barrier: 'license',
    how: '대상에 맞는 식단을 짜고 급식·식품 위생을 관리하며, 필요하면 식습관 상담까지 맡습니다.', income: '학교·병원·기업 급식 소속 월급이 중심이고, 상담·콘텐츠·식단 서비스로 부수입을 만들 수 있습니다.', caution: '정해진 예산과 일정 안에서 매일 반복하는 일이 많아, 작은 개선 목표를 두는 편이 지루함을 줄입니다.', path: '식품영양 관련 학과 이수 후 영양사 국가시험을 거치는 경로가 일반적입니다.' });
  J('petcare', '반려동물 관리·미용', 'care', { els: { 목: .4, 수: .3, 토: .3 }, cats: { technical: .6, communication: .5, business: .3 }, types: { tech: .6, net: .4, biz: .3 }, env: { role: 'tech' }, exposes: ['emotional'], barrier: 'experience',
    how: '반려동물의 미용·위생·훈련·돌봄을 맡고, 보호자와 상태를 나누며 꾸준한 손님을 만듭니다.', income: '샵·병원 소속 급여나 개인 샵 운영, 방문 돌봄 서비스 단가로 수익을 만듭니다.', caution: '동물 상태가 예측하기 어려워 안전 수칙과 보호자 동의 절차를 꼼꼼히 챙기는 편이 좋습니다.', path: '민간 자격과 현장 실습으로 시작하는 경우가 많고, 수의 분야는 별도 면허가 필요합니다.' });
  J('fitness', '운동 지도·퍼스널 트레이너', 'care', { els: { 화: .4, 목: .4, 금: .2 }, cats: { education: .7, communication: .7, sales: .4 }, types: { edu: .6, net: .6, biz: .4 }, env: { org: 'ind', team: 'solo' }, exposes: ['competition', 'emotional'], barrier: 'experience',
    how: '회원의 몸 상태와 목표에 맞춰 운동을 짜고, 함께 기록을 보며 꾸준히 이어 가게 돕습니다.', income: '센터 기본급과 수업 수당, 개인 레슨·온라인 프로그램으로 수익을 만듭니다.', caution: '회원 수가 수입을 좌우해서 재등록을 부르는 기록 관리와 소개 관리가 중요합니다.', path: '생활스포츠지도사 같은 체육 지도 자격을 갖추고 현장 경력을 쌓는 경로가 일반적입니다.' });
  // 서비스·생활
  J('beauty', '미용·헤어·메이크업', 'service', { els: { 화: .4, 목: .3, 금: .3 }, cats: { creative: .8, communication: .6, business: .4 }, types: { prod: .7, biz: .5, net: .4 }, env: { org: 'ind', work: 'create' }, exposes: ['competition', 'repetitive'], barrier: 'license',
    how: '손님에게 어울리는 스타일을 제안하고 손기술로 바로 결과를 보여 주며 단골을 만듭니다.', income: '샵 소속 급여와 매출 배분, 숙련 후 개인 샵 운영으로 단가와 손님 수를 함께 키웁니다.', caution: '오래 서서 일하고 손목을 많이 써서, 몸 관리와 예약 간격 조절이 오래 일하는 힘이 됩니다.', path: '미용사(일반·피부·네일·메이크업) 국가기술자격을 갖추는 경로가 일반적입니다.' });
  J('interior', '인테리어·공간 시공', 'service', { els: { 목: .4, 토: .4, 화: .2 }, cats: { creative: .6, technical: .7, management: .4 }, types: { prod: .6, tech: .6, biz: .4 }, env: { role: 'mix' }, exposes: ['multitask'], barrier: 'experience',
    how: '공간을 보고 쓰임에 맞게 설계를 제안한 뒤, 자재와 공정을 맞춰 실제 공간으로 바꿔 냅니다.', income: '공사 단가와 설계·감리비로 만들고, 시공 사진이 쌓이면 소개와 포트폴리오로 일감을 늘립니다.', caution: '공정이 밀리면 비용이 바로 늘어서, 견적·일정·추가 비용 조건을 계약서에 남기는 것이 중요합니다.', path: '실내건축 관련 자격이나 현장 경력으로 시작하며, 일정 규모 이상 공사는 업 등록이 필요합니다.' });
  J('travel', '여행 기획·가이드', 'service', { els: { 화: .4, 수: .4, 목: .2 }, cats: { planning: .7, communication: .8, sales: .4 }, types: { net: .8, biz: .5 }, env: { stab: 'change' }, exposes: ['multitask', 'emotional'], barrier: 'experience',
    how: '일정과 동선을 짜고 현지에서 사람들을 이끌며, 예상 밖 상황을 그 자리에서 풀어냅니다.', income: '여행사 급여와 행사 수당, 개인 상품 기획·인솔 수수료로 수익을 만듭니다.', caution: '계절과 경기에 따라 일감이 크게 흔들려서, 비수기에 쓸 다른 수입원을 하나 두는 편이 좋습니다.', path: '국외여행인솔자·관광통역안내사 같은 자격이 있으면 일의 폭이 넓어집니다.' });
  J('hotel', '호텔·서비스 운영', 'service', { els: { 토: .4, 화: .3, 금: .3 }, cats: { management: .6, communication: .8, organization: .5 }, types: { org: .8, net: .5 }, env: { org: 'org', team: 'team' }, exposes: ['emotional', 'hierarchy'], barrier: 'experience',
    how: '손님 응대와 객실·시설 운영을 맡아, 정해진 기준대로 서비스가 돌아가게 관리합니다.', income: '소속 급여와 직급 승진이 중심이고, 운영 경력이 쌓이면 관리직이나 위탁 운영으로 넓힙니다.', caution: '손님 불만을 직접 받는 자리라, 감정을 다음 날까지 가져가지 않는 마무리 습관이 중요합니다.', path: '' });
  J('cafe', '카페·음료 창업', 'service', { els: { 화: .4, 토: .4, 목: .2 }, cats: { creative: .5, business: .7, sales: .5 }, types: { biz: .8, prod: .5 }, env: { org: 'ind' }, exposes: ['competition', 'repetitive'], barrier: 'open',
    how: '메뉴와 공간 분위기를 만들고 매일 같은 품질로 손님을 맞으며 동네 단골을 만듭니다.', income: '음료·디저트 매출에서 임대료·재료비·인건비를 뺀 몫이 수입이 됩니다.', caution: '시작은 쉽지만 경쟁이 많아서, 열기 전에 하루 손님 수와 고정비로 손익을 먼저 계산해 보는 편이 좋습니다.', path: '' });
  J('homeservice', '생활 수리·정리 수납 서비스', 'service', { els: { 토: .5, 금: .3, 목: .2 }, cats: { technical: .6, business: .5, communication: .4 }, types: { biz: .6, tech: .5, prod: .3 }, env: { org: 'ind', team: 'solo' }, exposes: ['repetitive'], barrier: 'open',
    how: '집 안의 고장·정리·청소 같은 생활 문제를 직접 찾아가 해결해 주며 후기를 쌓습니다.', income: '건당 출장비와 작업비, 정기 관리 계약으로 수익을 만듭니다.', caution: '몸이 곧 장비라 하루 일정 수를 무리하게 늘리지 않는 것이 오래 버티는 방법입니다.', path: '' });
  J('wedding', '웨딩·파티 플래너', 'service', { els: { 화: .5, 목: .3, 토: .2 }, cats: { planning: .8, creative: .5, communication: .7 }, types: { net: .7, biz: .5, prod: .3 }, env: { stab: 'change' }, exposes: ['emotional', 'multitask'], barrier: 'experience',
    how: '고객의 바람을 듣고 장소·업체·일정을 엮어 하루의 행사를 처음부터 끝까지 설계합니다.', income: '기획 수수료와 업체 제휴 수익, 패키지 상품으로 수입을 만듭니다.', caution: '고객 기대가 큰 일이라, 바뀐 요청을 그때그때 글로 확인받아 두는 습관이 다툼을 줄입니다.', path: '' });
  // 공공·안전
  J('police', '경찰·경호', 'public', { els: { 금: .5, 화: .3, 토: .2 }, cats: { public: .9, organization: .7, management: .3 }, types: { org: 1, tech: .3 }, env: { org: 'org', stab: 'stable' }, exposes: ['hierarchy', 'multitask'], barrier: 'license',
    how: '정해진 규칙으로 현장을 지키고, 사건이 생기면 빠르게 판단해 사람과 상황을 정리합니다.', income: '공무원 보수와 수당, 계급 승진으로 수입이 오르고 연금이 뒤를 받칩니다.', caution: '위계가 분명하고 긴장된 현장이 많아, 쉬는 시간에 몸과 마음을 내려놓는 방법이 필요합니다.', path: '경찰공무원 채용 시험이나 경호 관련 자격·교육을 거치는 경로가 일반적입니다.' });
  J('firefighter', '소방·응급구조', 'public', { els: { 수: .4, 금: .4, 화: .2 }, cats: { public: .9, technical: .6 }, types: { org: .9, tech: .5 }, env: { org: 'org', team: 'team' }, exposes: ['hierarchy', 'multitask'], barrier: 'license',
    how: '화재·사고 현장에서 팀으로 움직이며 사람을 구하고 위험을 줄이는 일을 맡습니다.', income: '공무원 보수와 위험·출동 수당, 계급 승진으로 수입이 오릅니다.', caution: '몸과 마음에 충격이 쌓이기 쉬워서, 동료와 나누는 시간과 전문 상담을 가까이 두는 편이 좋습니다.', path: '소방공무원 채용 시험이나 응급구조사 자격을 거치는 경로가 일반적입니다.' });
  J('military', '군 간부·부사관', 'public', { els: { 금: .5, 토: .3, 화: .2 }, cats: { organization: .9, public: .7, management: .5 }, types: { org: 1 }, env: { org: 'org', stab: 'stable' }, exposes: ['hierarchy'], barrier: 'license',
    how: '조직의 규칙과 명령 체계 안에서 사람과 장비를 관리하고, 맡은 임무를 끝까지 책임집니다.', income: '군인 보수와 수당, 진급과 복무 기간에 따른 연금으로 수입을 만듭니다.', caution: '근무지 이동과 위계가 생활을 크게 정해서, 가족과 미리 생활 계획을 맞춰 두는 편이 좋습니다.', path: '사관학교·학군·부사관 선발 같은 임관 경로가 있습니다.' });
  J('urban', '도시계획·환경 관리', 'public', { els: { 목: .4, 토: .4, 수: .2 }, cats: { planning: .7, research: .6, public: .6 }, types: { org: .6, tech: .6, edu: .2 }, env: { org: 'org', role: 'plan' }, exposes: ['slowPayoff', 'hierarchy'], barrier: 'license',
    how: '지역의 땅·교통·환경 자료를 모아 앞으로 몇 년의 그림을 그리고 규정에 맞게 다듬습니다.', income: '공공기관·엔지니어링 회사 소속 급여가 중심이고, 기술사급 경력이 쌓이면 자문료가 붙습니다.', caution: '결과가 나오기까지 몇 년이 걸리는 일이라, 중간 성과를 스스로 기록해 두는 편이 버티기 쉽습니다.', path: '도시계획·환경 관련 기사 자격과 공공기관 채용을 거치는 경로가 일반적입니다.' });
  J('audit', '법원·검찰 직렬·공공 감사', 'public', { els: { 금: .5, 수: .3, 토: .2 }, cats: { public: .8, research: .5, organization: .6 }, types: { org: .9, tech: .3 }, env: { org: 'org', work: 'repeat' }, exposes: ['hierarchy', 'repetitive'], barrier: 'license',
    how: '서류와 절차를 꼼꼼히 확인해 규정에 맞는지 가려내고, 공적인 판단이 바로 서도록 돕습니다.', income: '공무원 보수와 직급 승진이 중심이고, 경력은 법무·감사 분야 이직으로도 이어집니다.', caution: '같은 형식의 서류를 오래 보는 일이라, 집중이 떨어지는 시간대를 알고 일을 나누는 편이 좋습니다.', path: '법원·검찰·감사 직렬 공무원 채용 시험을 거치는 경로가 일반적입니다.' });
  // 금융·투자
  J('banker', '은행원·여신 심사', 'finance', { els: { 금: .5, 토: .3, 수: .2 }, cats: { asset: .8, organization: .6, sales: .4 }, types: { org: .8, tech: .3, net: .3 }, env: { org: 'org', stab: 'stable' }, exposes: ['hierarchy', 'repetitive'], barrier: 'experience',
    how: '고객의 돈 흐름을 보고 대출·예금·자산 상품을 연결하며, 위험을 따져 승인 여부를 가립니다.', income: '안정된 연봉과 성과급이 중심이고, 직급과 전문 분야에 따라 보수 폭이 커집니다.', caution: '실적 목표와 규정 사이에서 압박이 생기기 쉬워서, 기준을 지키는 기록을 남기는 습관이 몸을 지킵니다.', path: '은행 공채와 금융 관련 자격(신용분석사·자산관리사 등)을 함께 준비하는 경로가 일반적입니다.' });
  J('analyst', '증권 애널리스트·리서치', 'finance', { els: { 수: .5, 금: .3, 화: .2 }, cats: { research: .9, asset: .8, communication: .4 }, types: { tech: .7, edu: .5 }, env: { role: 'plan', work: 'create' }, exposes: ['competition', 'isolated'], barrier: 'license',
    how: '산업과 기업의 숫자를 파고들어 전망을 세우고, 그 근거를 보고서와 발표로 전합니다.', income: '증권사·운용사 연봉과 성과급으로 만들고, 평판이 쌓이면 보수가 크게 오릅니다.', caution: '전망이 빗나가면 평판이 흔들려서, 근거와 한계를 함께 적어 두는 습관이 오래 일하는 힘이 됩니다.', path: '금융투자분석사 같은 자격과 리서치 보조 경력을 거치는 경로가 일반적입니다.' });
  J('fundmgr', '자산운용·투자 관리', 'finance', { els: { 수: .4, 금: .4, 화: .2 }, cats: { asset: 1, research: .7, planning: .5 }, types: { tech: .6, biz: .5 }, env: { role: 'plan' }, exposes: ['competition', 'speculation'], barrier: 'license',
    how: '맡긴 돈을 어디에 얼마나 나눠 둘지 정하고, 시장이 바뀔 때마다 비중을 고쳐 갑니다.', income: '운용 보수와 성과 보수로 만들고, 운용 규모가 커질수록 수입도 커집니다.', caution: '수익률이 곧 평가라 마음이 크게 흔들리기 쉬워서, 정해 둔 원칙을 지키는 기록이 중요합니다.', path: '투자자산운용사 같은 자격과 운용사 경력을 거치는 경로가 일반적입니다.' });
  J('actuary', '보험 계리·리스크 관리', 'finance', { els: { 금: .5, 수: .4, 토: .1 }, cats: { research: .8, asset: .6, technical: .5 }, types: { tech: .9, org: .4 }, env: { role: 'tech', stab: 'stable' }, exposes: ['isolated', 'slowPayoff'], barrier: 'license',
    how: '사고·질병·손실이 일어날 확률을 계산해 상품 가격과 회사의 위험 한도를 정합니다.', income: '전문 자격에 따른 높은 연봉과 수당으로 만들고, 경력이 쌓이면 임원·자문으로 넓힙니다.', caution: '자격 준비 기간이 길어서, 중간 단계 시험마다 작은 보상을 정해 두는 편이 버티기 쉽습니다.', path: '보험계리사 자격과 보험사·컨설팅 경력을 거치는 경로가 일반적입니다.' });
  J('bookkeeping', '기장·경리 대행', 'finance', { els: { 토: .4, 금: .4, 수: .2 }, cats: { organization: .7, asset: .5, technical: .4 }, types: { tech: .5, org: .6, biz: .3 }, env: { work: 'repeat', stab: 'stable' }, exposes: ['repetitive'], barrier: 'experience',
    how: '작은 회사와 가게의 장부·세금 신고·급여 정산을 대신 맡아 돈 흐름을 정리해 줍니다.', income: '사무소 급여나 거래처별 월 기장료로 만들고, 거래처가 늘수록 수입이 안정됩니다.', caution: '신고 기한이 몰리는 달에 일이 한꺼번에 쌓여서, 미리 자료를 받는 일정표가 중요합니다.', path: '전산회계·세무 관련 민간·국가 자격과 사무소 실무 경력을 거치는 경로가 일반적입니다.' });
  J('propdev', '부동산 개발·자산 관리', 'finance', { els: { 토: .6, 금: .2, 화: .2 }, cats: { asset: .9, business: .7, planning: .6 }, types: { biz: .9, org: .3 }, env: { role: 'plan' }, exposes: ['speculation', 'slowPayoff'], barrier: 'experience',
    how: '땅과 건물의 쓰임을 다시 설계하고, 자금·인허가·임대를 엮어 자산의 가치를 키웁니다.', income: '개발 이익과 임대 수익, 자산 관리 보수로 만들고 규모에 따라 수입 폭이 큽니다.', caution: '돈이 오래 묶이고 금리·규제에 크게 흔들려서, 버틸 수 있는 자금 기간을 먼저 정해 두는 편이 좋습니다.', path: '' });
  // IT·디지털
  J('security', '정보보안 전문가', 'digital', { els: { 금: .5, 수: .4, 화: .1 }, cats: { technical: 1, research: .6 }, types: { tech: 1, org: .3 }, env: { role: 'tech' }, exposes: ['isolated', 'multitask'], barrier: 'experience',
    how: '시스템의 약한 곳을 먼저 찾아 막고, 사고가 나면 흔적을 따라 원인을 밝혀냅니다.', income: '기업·보안 회사 연봉과 자격 수당으로 만들고, 전문성이 쌓이면 진단·자문 계약이 붙습니다.', caution: '사고는 밤낮을 가리지 않아서, 대응 순번과 쉬는 날을 팀과 분명히 나눠 두는 편이 좋습니다.', path: '정보보안기사 같은 자격과 실무 경력을 함께 쌓는 경로가 일반적입니다.' });
  J('uxui', 'UX·UI 기획자', 'digital', { els: { 목: .4, 화: .4, 수: .2 }, cats: { creative: .6, planning: .8, research: .5 }, types: { prod: .6, tech: .5, org: .3 }, env: { role: 'plan', work: 'create' }, exposes: ['multitask'], barrier: 'experience',
    how: '사용자가 어디서 막히는지 관찰하고 화면 흐름을 다시 설계해 쓰기 쉬운 서비스로 만듭니다.', income: '회사 연봉이 중심이고, 포트폴리오가 쌓이면 프리랜서 프로젝트 단가로 넓힙니다.', caution: '의견이 많은 자리라, 결정 근거를 자료로 남겨 두면 같은 논쟁을 반복하지 않습니다.', path: '' });
  J('aiml', 'AI·머신러닝 엔지니어', 'digital', { els: { 수: .5, 금: .3, 화: .2 }, cats: { technical: .9, research: .9 }, types: { tech: 1, edu: .3 }, env: { role: 'tech', work: 'create' }, exposes: ['isolated', 'competition'], barrier: 'experience',
    how: '데이터를 모아 모델을 만들고 시험해, 실제 서비스에서 쓸 수 있는 기능으로 다듬습니다.', income: '높은 연봉과 성과급이 중심이고, 전문 분야가 생기면 자문·강의 수입이 붙습니다.', caution: '기술이 빠르게 바뀌어서, 배우는 시간을 일정에 넣어 두지 않으면 금방 뒤처진 느낌이 듭니다.', path: '' });
  J('cloud', '인프라·클라우드 운영', 'digital', { els: { 금: .4, 수: .4, 화: .2 }, cats: { technical: .9, management: .5 }, types: { tech: .9, org: .5 }, env: { stab: 'stable', work: 'repeat' }, exposes: ['multitask'], barrier: 'experience',
    how: '서버와 네트워크가 멈추지 않게 지키고, 반복 작업은 자동으로 돌아가게 만들어 둡니다.', income: '회사 연봉과 자격 수당이 중심이고, 운영 경력이 쌓이면 설계·컨설팅으로 단가를 올립니다.', caution: '장애 대응이 몰릴 때가 있어서, 평소에 기록과 자동화를 쌓아 두는 것이 내 시간을 지킵니다.', path: '클라우드 사업자 자격과 운영 실무 경력을 거치는 경로가 일반적입니다.' });
  J('gamedev', '게임 기획·개발', 'digital', { els: { 화: .4, 수: .4, 목: .2 }, cats: { creative: .8, technical: .7, planning: .5 }, types: { prod: .8, tech: .6 }, env: { work: 'create', team: 'team' }, exposes: ['slowPayoff', 'competition'], barrier: 'experience',
    how: '놀이의 규칙과 세계를 설계하고, 개발·아트와 맞춰 실제로 플레이되는 게임으로 만듭니다.', income: '회사 연봉과 프로젝트 성과급이 중심이고, 개인·소규모 개발은 판매 수익으로 돌아옵니다.', caution: '출시 전까지 성과가 늦게 보여서, 작은 시제품으로 반응을 먼저 보는 습관이 도움이 됩니다.', path: '' });
  J('po', '서비스 기획·프로덕트 매니저', 'digital', { els: { 목: .4, 화: .3, 금: .3 }, cats: { planning: .9, management: .6, communication: .6 }, types: { org: .7, tech: .4, net: .4 }, env: { role: 'plan', team: 'team' }, exposes: ['multitask', 'hierarchy'], barrier: 'experience',
    how: '무엇을 먼저 만들지 정하고 개발·디자인·사업 쪽 의견을 묶어 하나의 일정으로 끌고 갑니다.', income: '회사 연봉과 성과급이 중심이고, 성공한 서비스 경험이 쌓이면 보수가 크게 오릅니다.', caution: '여러 팀의 요청이 몰려서, 우선순위 기준을 글로 정해 두면 소모가 줄어듭니다.', path: '' });
  J('growth', '퍼포먼스·데이터 마케터', 'digital', { els: { 수: .4, 화: .4, 금: .2 }, cats: { sales: .6, research: .6, planning: .6 }, types: { biz: .6, tech: .5 }, env: { stab: 'change' }, exposes: ['competition', 'multitask'], barrier: 'experience',
    how: '광고와 유입 숫자를 매일 보며 무엇이 손님을 데려오는지 실험하고 예산을 옮깁니다.', income: '회사 연봉과 성과급, 대행·프리랜서 계약으로 수익을 만듭니다.', caution: '숫자가 매일 바뀌어 마음이 쉽게 흔들려서, 주 단위로 판단하는 규칙을 두는 편이 좋습니다.', path: '' });
  // 예술·공연
  J('musician', '음악·작곡·연주', 'art', { els: { 수: .4, 화: .4, 목: .2 }, cats: { creative: 1, communication: .4 }, types: { prod: 1, net: .3 }, env: { org: 'ind', team: 'solo', work: 'create' }, exposes: ['slowPayoff', 'competition', 'isolated'], barrier: 'experience',
    how: '곡을 만들거나 연주해 무대·음원·레슨으로 사람들에게 들려주며 이름을 쌓아 갑니다.', income: '공연료와 음원·저작권 수입, 레슨과 행사로 여러 갈래의 수입을 만듭니다.', caution: '수입이 고르지 않아서, 레슨처럼 매달 들어오는 수입을 한 줄 깔아 두는 편이 마음이 편합니다.', path: '' });
  J('actor', '배우·공연·방송 진행', 'art', { els: { 화: .6, 목: .2, 수: .2 }, cats: { creative: .8, communication: .8 }, types: { prod: .7, net: .6 }, env: { stab: 'change' }, exposes: ['competition', 'emotional', 'speculation'], barrier: 'experience',
    how: '역할이나 무대에 맞춰 나를 표현하고, 오디션과 현장 경험으로 이름을 알려 갑니다.', income: '출연료와 행사·진행비, 광고 수입으로 만들고 작품에 따라 수입 차이가 큽니다.', caution: '선택받는 일이 많아 마음이 쉽게 지치므로, 연습과 생활 수입을 따로 챙기는 편이 오래 갑니다.', path: '' });
  J('photo', '사진·영상 촬영 감독', 'art', { els: { 화: .4, 금: .3, 목: .3 }, cats: { creative: .9, technical: .5 }, types: { prod: .9, biz: .3 }, env: { org: 'ind' }, exposes: ['competition'], barrier: 'open',
    how: '빛과 구도를 잡아 장면을 남기고, 촬영부터 보정·편집까지 맡아 결과물을 넘깁니다.', income: '건당 촬영료와 패키지 상품, 사진·영상 판매로 수익을 만듭니다.', caution: '장비 비용이 계속 들어서, 장비를 사기 전에 그 장비로 벌 일감을 먼저 확인하는 편이 좋습니다.', path: '' });
  J('fineart', '미술 작가·공예', 'art', { els: { 목: .4, 화: .3, 토: .3 }, cats: { creative: 1, research: .3 }, types: { prod: 1 }, env: { team: 'solo', work: 'create' }, exposes: ['slowPayoff', 'isolated'], barrier: 'open',
    how: '나만의 재료와 표현으로 작품을 만들고, 전시·판매·수업으로 작품 세계를 알려 갑니다.', income: '작품 판매와 전시 지원금, 공방 수업과 주문 제작으로 수입을 만듭니다.', caution: '작업 기간에 비해 수입이 늦게 들어와서, 수업이나 주문 제작 같은 고정 수입을 함께 두는 편이 좋습니다.', path: '' });
  J('curator', '큐레이터·문화예술 기획', 'art', { els: { 목: .4, 화: .4, 토: .2 }, cats: { planning: .7, creative: .6, research: .5, public: .3 }, types: { edu: .5, org: .5, net: .5 }, env: { role: 'plan' }, exposes: ['slowPayoff'], barrier: 'experience',
    how: '작품과 작가를 조사해 하나의 이야기로 묶고, 전시·공연·행사로 관객 앞에 펼쳐 보입니다.', income: '미술관·재단 소속 급여나 기획료, 공공 지원 사업 예산으로 수입을 만듭니다.', caution: '예산과 공모 일정에 따라 일이 끊기기 쉬워서, 다음 기획을 미리 준비해 두는 편이 좋습니다.', path: '학예사 자격이나 관련 전공·기관 경력을 거치는 경로가 일반적입니다.' });
  J('translator', '통번역가', 'art', { els: { 수: .5, 목: .3, 금: .2 }, cats: { communication: .8, education: .4, research: .4 }, types: { edu: .7, tech: .5 }, env: { team: 'solo', org: 'ind' }, exposes: ['isolated', 'repetitive'], barrier: 'experience',
    how: '두 언어 사이에서 뜻과 분위기를 옮기고, 분야 용어를 익혀 믿고 맡길 수 있는 결과를 냅니다.', income: '건당·분량당 번역료와 통역 일당, 기업 전속 계약으로 수익을 만듭니다.', caution: '혼자 오래 일하고 마감이 몰리기 쉬워서, 하루 분량을 정해 두는 습관이 체력을 지킵니다.', path: '통번역 대학원이나 어학 자격과 분야 경력을 쌓는 경로가 일반적입니다.' });
  // 운송·물류
  J('scm', '물류·유통 관리(SCM)', 'trade', { els: { 수: .4, 토: .4, 금: .2 }, cats: { management: .8, organization: .6, planning: .5 }, types: { org: .8, biz: .4 }, env: { work: 'repeat', team: 'team' }, exposes: ['multitask'], barrier: 'experience',
    how: '물건이 언제 어디로 얼마나 움직일지 계획하고, 재고와 배송이 막히지 않게 조정합니다.', income: '회사 연봉과 직급 승진이 중심이고, 운영 경험이 쌓이면 물류 컨설팅으로 넓힙니다.', caution: '한 곳이 막히면 전체가 밀려서, 예비 경로와 재고 기준을 미리 정해 두는 편이 좋습니다.', path: '물류관리사 같은 자격이 있으면 일의 폭이 넓어집니다.' });
  J('delivery', '화물 운송·배송 사업', 'trade', { els: { 수: .4, 금: .3, 토: .3 }, cats: { business: .5, technical: .4, management: .3 }, types: { biz: .7, tech: .3 }, env: { org: 'ind', team: 'solo' }, exposes: ['repetitive', 'isolated'], barrier: 'license',
    how: '정해진 노선이나 주문에 맞춰 물건을 옮기고, 거래처를 늘리며 운송 일감을 쌓습니다.', income: '운송 건당 운임과 고정 거래처 계약으로 만들고, 차량을 늘리면 사업 규모가 커집니다.', caution: '오래 앉아 운전하는 일이라 허리와 수면 관리가 수입만큼 중요합니다.', path: '운전면허와 화물운송 종사 자격을 갖추는 경로가 일반적입니다.' });
  J('customs', '관세사·통관 대행', 'trade', { els: { 금: .4, 수: .4, 토: .2 }, cats: { technical: .6, business: .5, organization: .5 }, types: { tech: .8, biz: .4 }, env: { work: 'repeat', stab: 'stable' }, exposes: ['repetitive'], barrier: 'license',
    how: '수출입 물품의 서류와 세금을 규정에 맞게 처리해, 물건이 국경을 막힘 없이 넘게 돕습니다.', income: '통관 수수료와 자문료로 만들고, 거래처가 늘수록 수입이 안정됩니다.', caution: '규정이 자주 바뀌어서, 바뀐 내용을 정리하는 시간을 매주 따로 떼어 두는 편이 좋습니다.', path: '관세사 시험과 실무 수습을 거치는 경로가 일반적입니다.' });
  J('pilot', '항공·선박 운항', 'trade', { els: { 수: .4, 금: .4, 화: .2 }, cats: { technical: .9, organization: .5 }, types: { tech: .9, org: .5 }, env: { org: 'org', stab: 'stable' }, exposes: ['hierarchy', 'isolated'], barrier: 'license',
    how: '정해진 절차와 점검표대로 비행기나 배를 움직이며, 날씨와 상황에 맞춰 안전을 지킵니다.', income: '높은 연봉과 운항 수당이 중심이고, 경력과 기종·선급에 따라 보수가 오릅니다.', caution: '근무 일정이 불규칙해서 수면과 가족 시간을 미리 정해 두는 생활 규칙이 필요합니다.', path: '조종사·해기사 면허와 교육 과정을 거치는 경로가 일반적입니다.' });
  J('farm', '농업·스마트팜 창업', 'trade', { els: { 목: .5, 토: .4, 수: .1 }, cats: { technical: .5, business: .6, asset: .3 }, types: { prod: .8, biz: .6 }, env: { org: 'ind' }, exposes: ['slowPayoff'], barrier: 'open',
    how: '작물을 기르는 기술과 시설을 갖추고, 직거래·가공으로 판로를 넓혀 가며 농장을 키웁니다.', income: '작물 판매와 가공품·체험 수익, 공공 지원 사업으로 수입을 만듭니다.', caution: '첫 수확까지 시간이 걸리고 날씨에 흔들려서, 첫해 생활비를 따로 마련해 두는 편이 좋습니다.', path: '귀농·창업 교육과 지원 사업을 거치는 경로가 있습니다.' });
  // 기존 분류 보강
  J('doctor', '의사·한의사', 'pro', { els: { 수: .4, 목: .3, 금: .3 }, cats: { technical: .9, research: .7, public: .5 }, types: { tech: 1, biz: .3 }, env: { role: 'tech', stab: 'stable' }, exposes: ['emotional', 'multitask'], barrier: 'license',
    how: '증상과 검사를 보고 원인을 가려 치료 방향을 정하며, 환자와 오래 관계를 이어 갑니다.', income: '병원 급여나 개원 수익으로 만들고, 전문 분야와 지역에 따라 수입 폭이 큽니다.', caution: '책임과 업무량이 무거워서, 쉬는 날과 진료 시간을 스스로 지키는 습관이 중요합니다.', path: '의대·한의대 졸업과 국가시험, 수련 과정을 거치는 경로가 일반적입니다.' });
  J('lawyer', '변호사', 'pro', { els: { 금: .5, 수: .3, 화: .2 }, cats: { research: .7, communication: .7, public: .5 }, types: { tech: .9, biz: .4, net: .3 }, env: { org: 'mix' }, exposes: ['competition', 'multitask'], barrier: 'license',
    how: '사건의 사실과 법을 맞춰 보고, 의뢰인의 입장을 글과 말로 정리해 다툼을 풀어 갑니다.', income: '사무소 급여나 사건 수임료, 기업 자문 계약으로 수입을 만듭니다.', caution: '마감과 다툼이 겹쳐 긴장이 오래 가서, 사건을 내 일처럼 끌어안지 않는 선이 필요합니다.', path: '법학전문대학원 졸업과 변호사시험을 거치는 경로가 일반적입니다.' });
  J('librarian', '사서·기록 관리', 'edu', { els: { 수: .4, 목: .4, 토: .2 }, cats: { research: .6, organization: .6, education: .5 }, types: { edu: .7, org: .5 }, env: { stab: 'stable', work: 'repeat' }, exposes: ['repetitive', 'isolated'], barrier: 'license',
    how: '자료를 분류하고 찾기 쉽게 정리해, 필요한 사람에게 필요한 정보를 이어 줍니다.', income: '도서관·기관 소속 급여가 중심이고, 기록 관리·데이터 정리 분야로 넓힐 수 있습니다.', caution: '조용하고 반복적인 일이 많아서, 독서 모임 같은 기획 일을 함께 맡으면 활력이 생깁니다.', path: '문헌정보학 전공으로 사서 자격을 얻는 경로가 일반적입니다.' });
  J('editor', '편집자·출판 기획', 'creative', { els: { 목: .5, 수: .3, 화: .2 }, cats: { creative: .6, planning: .6, communication: .5 }, types: { prod: .6, edu: .5, org: .3 }, env: { work: 'create' }, exposes: ['slowPayoff'], barrier: 'experience',
    how: '원고를 고르고 다듬어 책이나 콘텐츠로 묶어 내며, 작가와 독자 사이를 잇습니다.', income: '출판사 급여나 외주 편집료, 기획 인세로 수입을 만듭니다.', caution: '한 권이 나오기까지 시간이 걸려서, 진행 중인 일을 단계별로 나눠 성과를 확인하는 편이 좋습니다.', path: '' });
  J('franchise', '프랜차이즈 가맹 운영', 'biz', { els: { 토: .5, 금: .3, 화: .2 }, cats: { business: .9, management: .6, sales: .5 }, types: { biz: 1, org: .4 }, env: { org: 'ind', work: 'repeat' }, exposes: ['competition', 'multitask'], barrier: 'open',
    how: '본사가 만든 방식과 메뉴를 받아 매장을 운영하고, 사람과 매출을 관리합니다.', income: '매장 매출에서 가맹비·임대료·인건비를 뺀 몫이 수입이 되고, 매장을 늘려 규모를 키웁니다.', caution: '본사 정책에 따라 비용이 바뀔 수 있어서, 계약서의 비용 조건과 위약 조항을 먼저 읽어 보는 편이 좋습니다.', path: '' });
  J('purchasing', '구매·조달 담당', 'org', { els: { 금: .4, 토: .4, 수: .2 }, cats: { organization: .7, business: .5, asset: .4 }, types: { org: .8, biz: .4 }, env: { org: 'org', stab: 'stable' }, exposes: ['hierarchy', 'repetitive'], barrier: 'experience',
    how: '필요한 물건과 서비스를 좋은 조건에 사 오도록 업체를 비교하고 협상합니다.', income: '회사 연봉과 직급 승진이 중심이고, 협상 경력은 영업·사업 쪽으로도 이어집니다.', caution: '업체와 가까워질수록 판단이 흐려질 수 있어서, 비교 기록과 결정 근거를 남겨 두는 편이 좋습니다.', path: '' });
  J('pr', '홍보·언론 대응', 'net', { els: { 화: .5, 수: .3, 목: .2 }, cats: { communication: .9, planning: .6 }, types: { net: .8, org: .4 }, env: { team: 'team', stab: 'change' }, exposes: ['emotional', 'multitask'], barrier: 'experience',
    how: '회사나 사람의 이야기를 알리는 글과 행사를 만들고, 기자·대중과의 관계를 관리합니다.', income: '회사 연봉이나 대행사 계약으로 만들고, 위기 대응 경력이 쌓이면 자문료가 붙습니다.', caution: '갑작스러운 이슈가 밤낮없이 생겨서, 대응 순서와 연락 범위를 미리 정해 두는 편이 좋습니다.', path: '' });
  J('auto', '자동차 정비·튜닝', 'tech', { els: { 금: .5, 화: .3, 토: .2 }, cats: { technical: 1, business: .3 }, types: { tech: 1, biz: .4 }, env: { role: 'tech' }, exposes: ['repetitive'], barrier: 'license',
    how: '차의 소리와 상태로 고장을 찾아내고 부품을 손봐, 다시 안전하게 달리게 만듭니다.', income: '정비소 급여와 기술 수당, 숙련 후 정비소 운영으로 수익을 만듭니다.', caution: '전기차처럼 새 기술이 빠르게 들어와서, 교육을 꾸준히 받는 것이 단가를 지키는 방법입니다.', path: '자동차정비기능사·산업기사 같은 국가기술자격과 현장 경력이 일반적인 경로입니다.' });
})(typeof window !== 'undefined' ? window : globalThis);
