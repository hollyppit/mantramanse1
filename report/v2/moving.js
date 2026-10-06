// 무빙 연출 설정(flow) 값의 범위 — 관리자 "설정 → 읽기 모드"가 저장하고(content.flow) 서버(functions/api/report-content.js cleanFlow)가 같은 범위로 거른다.
// 손님 화면은 report/v2/reader.js 가 읽는다. "차례로 나타나기"·px/초 자동 스크롤은 폐기했다: 예전 필드(enabled·anim·duration·distance·stagger·trigger·speed·resumeAfter·btnShow·btnPos)는
// 저장된 값을 지우지 않고(스키마 유지) 그대로 통과시키되 화면은 쓰지 않는다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var ANIMS = [['rise', '아래에서 떠오르기'], ['fade', '서서히 나타나기'], ['zoom', '살짝 커지며 나타나기'], ['blur', '흐릿하다가 선명해지기'], ['wipe', '왼쪽에서 펼쳐지기'], ['drop', '위에서 내려오기']];
  var POS = [['right', '오른쪽 아래'], ['center', '가운데 아래'], ['left', '왼쪽 아래']];
  var DEFAULTS = { enabled: true, anim: 'rise', duration: 0.8, distance: 28, stagger: 0.35, trigger: 88, auto: true, speed: 55, startDelay: 1.5, stopAtChoice: true, resumeAfter: 0, btnShow: true, btnPos: 'right',
    readSpeed: 6.5, bgMotion: 1, playbackRate: 1 }; // 아래 세 값이 읽기 모드 설정(초당 글자 수 · 배경 움직임 0/1/2 · 재생 속도)
  var RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  var num = function (v, lo, hi, d) { v = v === '' || v == null ? NaN : +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  var has = function (list, v) { return list.some(function (x) { return x[0] === v; }); };
  function clean(f) {
    f = f && typeof f === 'object' ? f : {}; var D = DEFAULTS;
    return { enabled: f.enabled !== false, anim: has(ANIMS, f.anim) ? f.anim : D.anim, duration: num(f.duration, 0.1, 4, D.duration), distance: num(f.distance, 0, 120, D.distance),
      stagger: num(f.stagger, 0, 2, D.stagger), trigger: num(f.trigger, 40, 100, D.trigger), auto: f.auto !== false, speed: num(f.speed, 10, 400, D.speed), startDelay: num(f.startDelay, 0, 10, D.startDelay),
      stopAtChoice: f.stopAtChoice !== false, resumeAfter: num(f.resumeAfter, 0, 60, D.resumeAfter), btnShow: f.btnShow !== false, btnPos: has(POS, f.btnPos) ? f.btnPos : D.btnPos,
      readSpeed: num(f.readSpeed, 3, 12, D.readSpeed), bgMotion: Math.round(num(f.bgMotion, 0, 2, D.bgMotion)), playbackRate: RATES.indexOf(+f.playbackRate) >= 0 ? +f.playbackRate : D.playbackRate };
  }
  R.Moving = { RATES: RATES, DEFAULTS: DEFAULTS, ANIMS: ANIMS, POS: POS, clean: clean };
})(typeof window !== 'undefined' ? window : globalThis);
