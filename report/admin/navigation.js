/* 관리자 메뉴의 단일 기준: 영역·순서·표시명·담당 작업 */
(function(root){
  'use strict';
  // 2026-11-12 정리: 하는 일 기준 8개 영역(영역당 최대 7개). 옛 구성 화면은 지우지 않고 맨 끝 "옛 화면(보관)"으로 옮겼다
  //   (게시된 장이 원본 장 c00~c20 의 장면·문장을 재료로 쓰므로 고칠 곳은 남겨 둔다).
  var groups = [
    ['dash','현황',['dash']],
    ['sell','판매·타임라인',['commerce','v2world','v2proj']],
    ['media','첫 화면·영상',['onboard','freec','v2intro','v2clip','panelart']],
    ['copy','풀이 본문',['readinglibrary','editorial','narrative','luckenv','ichingreview','gyeokcheck']],
    ['map','운명 지도·환경',['wealthcareer','regionreading','regiondata','fengshui','wishspots']],
    ['ai','AI 풀이 엔진(고급)',['ikdoc','ikknow','ikdesign','ikrules','stylecfg','agentic','research']],
    ['qa','점검·운영',['v2quality','check','iklab','ops','v2set']],
    ['legacy','옛 화면(보관)',['v2chap','v2story','v2test']]
  ];
  var pages = {
    fengshui:{label:'공간·명당 풍수',hint:'현공비성·팔택·형세 풍수의 해석 문구와 계산 규칙(겸향·공망 기준)을 수정·게시하고 이전 버전으로 되돌립니다. 건물의 좌향과 건축 연도로 9궁 배치를 미리 확인하고, 공개 스위치로 사용자 화면의 ‘공간·명당’ 탭 노출을 제어합니다.'},
    wishspots:{label:'소원 성취 명당',hint:'나의 운명 지도의 소원 성취 명당에 쓸 장소를 출처·확인일과 함께 등록·검수·게시하고 이전 버전으로 되돌립니다. 사주·기준 지역·소원 분야를 넣어 점수 순위를 미리 보고, 공개 스위치로 사용자 화면 노출을 제어합니다.'},
    regionreading:{label:'지역 방위 해석',hint:'지역의 방위오행이 사주에 어떻게 작용하는지(월령·조후·억부·십성·상생상극) 풀어 주는 해석 규칙 수치와 사전 문구를 수정·게시하고 이전 버전으로 되돌립니다. 사주와 지역을 넣어 오행별 판정 근거와 적용된 문구 ID를 확인하고, 공개 스위치로 사용자 화면 반영을 제어합니다.'},
    wealthcareer:{label:'직업·돈 버는 방식',hint:'직업·활동 적성의 4개 섹션(돈 버는 방식·업무 환경·직업·약점)에 쓰이는 사전 문구·직업·수익 유형·취약점을 조건·우선순위와 함께 수정·게시하고 이전 버전으로 되돌립니다. 사주를 넣어 판정 근거와 적용된 문구 ID를 확인하고, 공개 스위치로 사용자 화면 노출을 제어합니다.'},
    narrative:{label:'타임라인 서사 규칙',hint:'운명의 타임라인 서사 엔진의 복합 규칙(조건·우선순위·근거·후킹·핵심 성향·생활 사례·갈등·조언)을 고치고 초안→게시→이력 되돌리기로 관리합니다. 사주를 넣어 시범 5장의 서사·대운 이야기·근거·중복 문장을 미리 보고, 300명 적용률을 점검합니다.'},
    commerce:{label:'결제·상품',hint:'무빙툰 상품 이름·가격·판매 여부를 정하고 최근 주문을 확인·취소합니다. 1:1 문의를 보고 답변 완료로 표시합니다. 세계를 유료로 바꾸는 곳은 주제·표지 설정입니다. 무료 사용자로 보기로 잠금 상태를 확인합니다.'},
    luckenv:{label:'운세 환경 문구',hint:'운세 환경 해석 문구를 수정·승인·게시하고 이전 본문으로 되돌립니다. 통합 시뮬레이터로 테스트 사주의 해석과 적용·배제된 규칙을 추적합니다.'},
    regiondata:{label:'지역 데이터',hint:'나의 운명 지도의 지역 환경 항목을 출처·기준일과 함께 등록하고 변경 이력에서 되돌립니다. 등록하지 않은 항목은 자료 부족으로 표시됩니다.'},
    ichingreview:{label:'주역 검수',hint:'주역 64괘 원문·현대어·분야 해석을 검수·수정·승인하고 게시본을 점검·롤백합니다. 승인한 문구만 게시되며 게시 전에는 사용자에게 보이지 않습니다.'},
    readinglibrary:{label:'검수 풀이 라이브러리',hint:'질문별 문장을 편집하고 가상 사주 적용·반례 검증 후 게시합니다. 기본 풀이 AI 호출은 0회입니다.'},
    agentic:{label:'AI 자동 연구',hint:'기존 지식의 승인·게시 상태를 보존하면서 근거·조건·중복·충돌을 진단하고 연구 과제를 준비합니다.'},
    research:{label:'문헌·명조 검수',hint:'합성 명조 32건의 원문 근거·유보 사유·문헌 비교를 읽기 전용으로 확인합니다.'},
    editorial:{label:'챕터 계약·현실 사례',hint:'7개 주제·84개 챕터의 질문·근거·중복 방지 규칙 및 현실 사례를 편집하고 검사 후 게시합니다.'},
    ops:{label:'운영 관리',hint:'영상120칸 연결, AI, 데이터 백업과 복구를 한곳에서 관리합니다.',related:['v2intro','v2quality','ikrules']},
    v2proj:{label:'타임라인 구성',hint:'운명의 타임라인 주제를 기준으로 실제 챕터와 공개 여부·제목·순서를 관리합니다.'},
    v2chap:{label:'주제별 챕터·해석',hint:'옛 화면(보관) — 사용자 화면에 그대로 나오지 않는 원본 재료입니다. 최종 장 구성은 "판매·타임라인 > 타임라인 구성"에서 바꾸세요. 타임라인과 같은 주제별 실제 목차에서 내용·원본 편집·프롤로그로 이동합니다.'},
    v2story:{label:'종합 스토리 흐름',hint:'옛 화면(보관) — 사용자 화면에 그대로 나오지 않는 원본 재료입니다. 최종 장 구성은 "판매·타임라인 > 타임라인 구성"에서 바꾸세요. 종합 풀이의 이야기 전개를 관리합니다. 주제별 목차는 타임라인 구성에서 관리합니다.'},
    v2world:{label:'주제·표지 설정',hint:'타임라인 주제의 이름·소개·표지·공개 여부와 순서를 관리합니다.'},
    v2clip:{label:'클립 라이브러리',hint:'챕터가 사용하는 공통 영상과 이미지를 등록하고 연결 상태를 확인합니다.'},
    v2intro:{label:'프롤로그·일간·일주 영상',hint:'일간·일주 소개와 프롤로그 영상을 관리합니다.'},
    ikdoc:{label:'풀이 자료',hint:'자료를 등록하고 추출된 지식 후보를 검수합니다. 승인한 지식의 서비스 게시 상태는 풀이 지식에서 관리합니다.',related:['ikknow','v2quality']},
    ikknow:{label:'풀이 지식',hint:'검수된 지식을 게시해야 실제 심화 풀이에 사용됩니다. 챕터의 기본 문장은 챕터·해석에서 관리합니다.',related:['ikdoc','ikdesign','ikrules','v2chap']},
    ikdesign:{label:'풀이 구성',hint:'분야별 풀이에 필요한 항목과 순서를 정합니다. 상품의 챕터·ACT 순서와는 별도로 적용됩니다.',related:['ikknow','iklab']},
    ikrules:{label:'AI·서비스 연결',hint:'지식 서비스 사용 여부, 본문 대체와 합성 깊이를 관리합니다. 표현 강도는 풀이 문체에서 관리합니다.',related:['stylecfg','iklab','v2quality']},
    stylecfg:{label:'풀이 문체',hint:'AI 풀이의 표현 강도를 분야별로 관리합니다. 화면 글꼴·크기·위치와 고정 문구는 조합 테스트에서 편집합니다.',related:['ikrules','iklab','v2test']},
    iklab:{label:'풀이 테스트',hint:'실제 계산 근거와 게시된 지식이 선택되는지 검사합니다. 화면·영상 조합은 조합 테스트에서 검사합니다.',related:['ikknow','v2test','v2quality']},
    v2test:{label:'조합·텍스트 편집',hint:'옛 화면(보관) — 사용자 화면에 그대로 나오지 않는 원본 재료입니다. 최종 장 구성은 "판매·타임라인 > 타임라인 구성"에서 바꾸세요. 챕터 문장과 영상, 글꼴·배치를 함께 확인하고 편집합니다. 개별 사주마다 바뀌는 문장 원문은 챕터·해석에서 수정합니다.',related:['v2chap','v2clip','stylecfg','v2quality']},
    v2quality:{label:'시스템·서비스 점검',hint:'저장된 상품 구성과 자료·지식·AI·문체 연결 상태를 점검합니다.',related:['v2test','iklab','onboard']},
    dash:{label:'현황',hint:'방문·결제·풀이 생성 현황을 한눈에 봅니다.'},
    freec:{label:'무료 콘텐츠',hint:'무료 타로·일진 캘린더 등 무료 콘텐츠의 문구와 이미지를 관리합니다.'},
    panelart:{label:'패널 이미지',hint:'무빙툰 장면 패널 이미지·영상을 만들고 연결합니다.'},
    gyeokcheck:{label:'격국 판정 확인',hint:'오행·강약 탭 사주 격국 분석 카드의 판정 근거(격 정하기·성립·안정성·특수격·오행 구조·십성 작용)를 사주별로 확인하고, 용신 계산용 격국과 비교하며, 300명 분포를 점검합니다. 공개 스위치로 카드 노출을 제어합니다. 표시 전용이라 점수·용신은 바뀌지 않습니다.'},
    check:{label:'정합성 검사',hint:'테스트 사주로 무빙툰 전체 문서를 만들어 계산값과 문장이 어긋나는 곳·중복 문장을 찾습니다(AI 호출 없음).'},
    v2set:{label:'설정',hint:'입장 인트로 등 화면 공통 설정을 관리합니다.'},
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
