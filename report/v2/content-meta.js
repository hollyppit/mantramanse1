// 해석 모듈 계층 메타(풀이 DB 계층화 2단계, report/v2/CONTENT_DB_DESIGN.md §6·§8).
// 기존 모듈의 문장·조건·우선순위는 건드리지 않고, 상태(status)와 근거(evidence) 표지만 id 기준으로 붙인다.
//  · 전부 status:'legacy'(이관 기본값 — 근거 미검증이지만 노출 가능).
//  · content-v3 가 문장을 다시 쓴 모듈(v3)은 evidence.basis:'editorial'(서비스 편집 원칙), 나머지는 'legacy'. 문헌 근거가 있다고 표시하지 않는다(refs 는 비어 있음).
// 이미 status 가 있는 모듈(관리자 저장본이 아니라 시드에 직접 적은 경우)은 덮어쓰지 않는다. 여러 번 실행해도 결과가 같다.
// 선택·조립 결과는 바뀌지 않는다: Rules.rank 는 status 를 읽지 않고(정책 off), Compose.view 는 이 필드를 출력하지 않는다. 검증: node tests/content-db-sim.js
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, C = R.Content;
  if (!C || !C.modules) return; // content.js 가 없으면 아무것도 하지 않는다
  var n = 0, editorial = 0;
  C.modules.forEach(function (m) {
    if (m.status) return;
    m.status = 'legacy';
    if (!m.evidence) m.evidence = { basis: m.v3 ? 'editorial' : 'legacy', refs: [], rev: 0 };
    n++; if (m.v3) editorial++;
  });
  C.meta = { version: 1, labeled: n, editorial: editorial };
})(typeof window !== 'undefined' ? window : globalThis);
