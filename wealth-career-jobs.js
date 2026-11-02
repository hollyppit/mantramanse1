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
})(typeof window !== 'undefined' ? window : globalThis);
