/* 관리자 메뉴의 단일 기준: 영역·순서·표시명·담당 작업 */
(function(root){
  'use strict';
  var groups = [['dash','현황',['dash']],['make','무빙툰 제작',['v2proj','v2chap','v2story','v2world','editorial']],['media','영상·이미지',['v2clip','v2intro','panelart']],['content','콘텐츠·온보딩',['onboard','freec']],['ai','AI 풀이',['ikdoc','ikknow','ikdesign','ikrules','iklab','agentic','stylecfg']],['qa','점검·테스트',['research','v2quality','check','v2test']],['set','운영·설정',['ops','v2set']]];
  var pages = {
    agentic:{label:'AI 자동 연구',hint:'기존 지식의 승인·게시 상태를 보존하면서 근거·조건·중복·충돌을 진단하고 연구 과제를 준비합니다.'},
    research:{label:'문헌·명조 검수',hint:'합성 명조 32건의 원문 근거·유보 사유·문헌 비교를 읽기 전용으로 확인합니다.'},
    editorial:{label:'챕터 계약·현실 사례',hint:'7개 주제·84개 챕터의 질문·근거·중복 방지 규칙 및 현실 사례를 편집하고 검사 후 게시합니다.'},
    ops:{label:'운영 관리',hint:'영상120칸 연결, AI, 데이터 백업과 복구를 한곳에서 관리합니다.',related:['v2intro','v2quality','ikrules']},
    v2proj:{label:'타임라인 구성',hint:'운명의 타임라인 주제를 기준으로 실제 챕터와 공개 여부·제목·순서를 관리합니다.'},
    v2chap:{label:'주제별 챕터·해석',hint:'타임라인과 같은 주제별 실제 목차에서 내용·원본 편집·프롤로그로 이동합니다.'},
    v2story:{label:'종합 스토리 흐름',hint:'종합 풀이의 이야기 전개를 관리합니다. 주제별 목차는 타임라인 구성에서 관리합니다.'},
    v2world:{label:'주제·표지 설정',hint:'타임라인 주제의 이름·소개·표지·공개 여부와 순서를 관리합니다.'},
    v2clip:{label:'클립 라이브러리',hint:'챕터가 사용하는 공통 영상과 이미지를 등록하고 연결 상태를 확인합니다.'},
    v2intro:{label:'프롤로그·일간·일주 영상',hint:'일간·일주 소개와 프롤로그 영상을 관리합니다.'},
    ikdoc:{label:'풀이 자료',hint:'자료를 등록하고 추출된 지식 후보를 검수합니다. 승인한 지식의 서비스 게시 상태는 풀이 지식에서 관리합니다.',related:['ikknow','v2quality']},
    ikknow:{label:'풀이 지식',hint:'검수된 지식을 게시해야 실제 심화 풀이에 사용됩니다. 챕터의 기본 문장은 챕터·해석에서 관리합니다.',related:['ikdoc','ikdesign','ikrules','v2chap']},
    ikdesign:{label:'풀이 구성',hint:'분야별 풀이에 필요한 항목과 순서를 정합니다. 상품의 챕터·ACT 순서와는 별도로 적용됩니다.',related:['ikknow','iklab']},
    ikrules:{label:'AI·서비스 연결',hint:'지식 서비스 사용 여부, 본문 대체와 합성 깊이를 관리합니다. 표현 강도는 풀이 문체에서 관리합니다.',related:['stylecfg','iklab','v2quality']},
    stylecfg:{label:'풀이 문체',hint:'AI 풀이의 표현 강도를 분야별로 관리합니다. 화면 글꼴·크기·위치와 고정 문구는 조합 테스트에서 편집합니다.',related:['ikrules','iklab','v2test']},
    iklab:{label:'풀이 테스트',hint:'실제 계산 근거와 게시된 지식이 선택되는지 검사합니다. 화면·영상 조합은 조합 테스트에서 검사합니다.',related:['ikknow','v2test','v2quality']},
    v2test:{label:'조합·텍스트 편집',hint:'챕터 문장과 영상, 글꼴·배치를 함께 확인하고 편집합니다. 개별 사주마다 바뀌는 문장 원문은 챕터·해석에서 수정합니다.',related:['v2chap','v2clip','stylecfg','v2quality']},
    v2quality:{label:'시스템·서비스 점검',hint:'저장된 상품 구성과 자료·지식·AI·문체 연결 상태를 점검합니다.',related:['v2test','iklab','onboard']},
    onboard:{label:'온보딩',hint:'첫 화면부터 출생정보 입력, 각성, 결과까지 한 곳에서 초안을 편집하고 게시합니다.'}
  };
  var nav = {groups:groups,pages:pages,resolve:function(t,also){return t === 'home' || (t === 'v2set' && also === 'home') ? {tab:'onboard',also:'home'} : {tab:t,also:also};}};
  nav.dirtyTarget = function (name) {
    if (/풀이 문체/.test(name)) return 'stylecfg';
    if (/온보딩/.test(name)) return 'onboard';
    if (/풀이 구성/.test(name)) return 'ikdesign';
    if (/AI·서비스|후킹/.test(name)) return 'ikrules';
    if (/풀이 지식/.test(name)) return 'ikknow';
    if (/글자/.test(name)) return 'v2test';
    if (/챕터|프로젝트/.test(name)) return 'v2proj';
    if (/해석 모듈|개운법/.test(name)) return 'v2chap';
    return 'lib';
  };
  root.AdminNavigation = nav;
  if(typeof module !== 'undefined' && module.exports) module.exports=nav;
})(typeof window !== 'undefined' ? window : globalThis);
