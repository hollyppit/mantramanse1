/* 운세 환경 해석·나의 운명 지도 기능 스위치.
   문제가 생기면 해당 값을 false로 바꿔 배포하면 그 기능만 화면에서 사라진다(기존 만세력·결제·무빙툰·관리자에는 영향 없음). 절차: docs/LUCK_ENV_ROLLBACK_2026-11-02.md */
window.MANTRA_FLAGS = Object.assign({ interpret: true, timeline: true, region: true }, window.MANTRA_FLAGS || {});
