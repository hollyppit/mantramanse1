/* 운세 환경 해석·나의 운명 지도 기능 스위치.
   기본값은 모두 꺼짐(false)이다: 운영에서는 기존 화면 그대로이고, 코드와 API만 올라간다.
   켜는 방법
     · 미리보기·로컬 검증: 주소 뒤에 ?mantraFlags=interpret,timeline,region,wealth,regionRead (운영 도메인에서는 무시된다)
     · 운영 공개: 아래 기본값을 true로 바꿔 배포(문구 검수·스테이징 확인 후)
   끄는 방법: 값을 false로 되돌려 배포. 기존 만세력·결제·무빙툰·관리자에는 영향이 없다. 절차: docs/LUCK_ENV_ROLLBACK_2026-11-02.md */
(function (w) {
  var f = Object.assign({ interpret: false, timeline: false, region: false, wealth: false, regionRead: false, wishSpots: false, healthBody: true, accidentHint: true }, w.MANTRA_FLAGS || {});   // wealth: 직업·활동 적성 고도화(나의 돈 버는 방식·업무 환경·직업·약점). 관리자 화면 스위치로도 켠다(/api/wealth-career)
  try {
    var loc = w.location, host = loc && loc.hostname || '';
    // 운영 도메인(mantramanse.pages.dev 및 그 외 사용자 도메인)에서는 주소로 켤 수 없다. localhost와 *.mantramanse.pages.dev 미리보기만 허용.
    if (/^(localhost|127\.0\.0\.1)$/.test(host) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(host)) {
      var m = /[?&]mantraFlags=([A-Za-z,]*)/.exec(loc.search || '');
      if (m) m[1].split(',').forEach(function (k) { if (Object.prototype.hasOwnProperty.call(f, k)) f[k] = true; });
    }
  } catch (e) { }
  w.MANTRA_FLAGS = f;
})(typeof window !== 'undefined' ? window : globalThis);
