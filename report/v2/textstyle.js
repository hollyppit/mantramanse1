// 리포트 글자(자막) 스타일 — 장면 안의 글자마다 글씨체·크기·색·정렬·위치·등장/사라짐 효과·나타나는 시기·사라지는 시기를 덮어쓴다.
// 저장 모양: { all: { '역할': 스타일 }, chapters: { c05: { '역할': 스타일 } } }  (챕터별 값이 전체 값 위에 덮어쓴다)
// 스타일: { font, size, sizeM, weight, color, align, spacing, line, x, y, in, inSpeed, inDelay, hold, out, outSpeed, loop, loopSpeed }
//   text = 문장 직접 입력(줄바꿈 가능, 비우면 원래 문장) · seq = 줄마다 차례로 나타나기 · seqGap = 줄 사이 간격(초)
//   inDelay = 장면(또는 영상 단계)에 들어온 뒤 나타나기까지 초 · hold = 다 나타난 뒤 사라지기까지 초(0=사라지지 않음)
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  // 글자 역할 → 표시 이름. stage=true 는 영상 단계(캐릭터 소개)의 자막으로 챕터와 무관(전체 적용만)
  var ROLES = {
    'intro.no': ['챕터 번호'], 'intro.title': ['챕터 제목'], 'intro.headline': ['핵심 결론 문장'], 'intro.note': ['소개 문장'],
    'insight.fact': ['FACT 줄'], 'explain.lead': ['의미 문장'], 'end.quote': ['챕터 끝 문장'],
    // 서술 역할(소설체 ~다, 전지적 관찰자 시점) — 위의 UI 역할(합쇼체)과 따로 스타일을 정한다
    'scene.caption': ['서술 · 장면 자막'], 'insight.lead': ['서술 · 해석 문장'], 'choice.line': ['서술 · 선택 문장'],
    'ilgan.title': ['일간 소개 · 제목', 1], 'ilgan.sub': ['일간 소개 · 부제', 1], 'ilgan.kw': ['일간 소개 · 키워드', 1],
    'awk.title': ['일주 캐릭터 · 제목', 1], 'awk.sub': ['일주 캐릭터 · 부제', 1], 'awk.kw': ['일주 캐릭터 · 키워드', 1],
  };
  var NARR = ['scene.caption', 'insight.lead', 'choice.line']; // 서술 역할(관리자에서 UI 역할과 구분해 보여 준다)
  var IN = [['', '없음'], ['fade', '서서히 나타나기'], ['rise', '아래에서 떠오르기'], ['drop', '위에서 내려오기'], ['blur', '흐릿하다가 선명해지기'], ['zoom', '살짝 커지며 나타나기'], ['wipe', '왼쪽에서 펼쳐지기'], ['letters', '글자가 하나씩 나타나기']];
  var OUT = [['', '없음'], ['fade', '서서히 사라지기'], ['rise', '위로 떠오르며 사라지기'], ['drop', '아래로 내려가며 사라지기'], ['blur', '흐려지며 사라지기'], ['zoom', '작아지며 사라지기'], ['wipe', '오른쪽으로 접히며 사라지기']];
  var LOOP = [['', '없음'], ['float', '둥실 떠다니기'], ['glow', '은은하게 빛나기'], ['pulse', '숨쉬듯 커졌다 작아지기'], ['sway', '좌우로 살랑이기'], ['shimmer', '빛이 훑고 지나가기']];
  var WEIGHTS = [['300', '가늘게'], ['400', '보통'], ['500', '약간 굵게'], ['600', '굵게'], ['700', '아주 굵게'], ['900', '가장 굵게']];
  var ALIGN = ['left', 'center', 'right'];
  var has = function (list, v) { return list.some(function (x) { return x[0] === v; }); };
  var num = function (v, lo, hi) { v = v === '' || v == null ? NaN : +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined; };
  var HEX = /^#[0-9a-f]{6}$/i;

  // 값 정리: 허용 목록 밖·범위 밖 값은 버린다(서버 검증과 같은 규칙)
  function clean(s) {
    s = s || {}; var o = {}, FONTS = (root.StoryFonts && root.StoryFonts.FONTS) || {}, n;
    if (typeof s.font === 'string' && (FONTS[s.font] || /^(serif|sans)$/.test(s.font))) o.font = s.font;
    if ((n = num(s.size, 8, 160)) !== undefined) o.size = n; if ((n = num(s.sizeM, 8, 160)) !== undefined) o.sizeM = n;
    if (has(WEIGHTS, String(s.weight))) o.weight = String(s.weight);
    if (typeof s.color === 'string' && HEX.test(s.color)) o.color = s.color;
    if (ALIGN.indexOf(s.align) >= 0) o.align = s.align;
    if ((n = num(s.spacing, -3, 30)) !== undefined) o.spacing = n; if ((n = num(s.line, 0.8, 3)) !== undefined) o.line = n;
    if ((n = num(s.x, -80, 80)) !== undefined) o.x = n; if ((n = num(s.y, -80, 80)) !== undefined) o.y = n;
    if (s.in && has(IN, s.in)) o.in = s.in; if ((n = num(s.inSpeed, 0.2, 6)) !== undefined) o.inSpeed = n; if ((n = num(s.inDelay, 0, 30)) !== undefined) o.inDelay = n;
    if ((n = num(s.hold, 0, 120)) !== undefined && n > 0) o.hold = n;
    if (s.out && has(OUT, s.out)) o.out = s.out; if ((n = num(s.outSpeed, 0.2, 6)) !== undefined) o.outSpeed = n;
    if (s.loop && has(LOOP, s.loop)) o.loop = s.loop; if ((n = num(s.loopSpeed, 1, 30)) !== undefined) o.loopSpeed = n;
    if (typeof s.text === 'string') { var t = s.text.replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 600); if (t.trim()) o.text = t; }
    // 테두리(글자 외곽선)·그림자·빛번짐·배경 상자·상자 테두리·투명도
    var cs = function (k) { if (typeof s[k] === 'string' && HEX.test(s[k])) o[k] = s[k]; };
    if ((n = num(s.strokeW, 0, 12)) !== undefined && n > 0) o.strokeW = n; cs('strokeC');
    if ((n = num(s.shX, -40, 40)) !== undefined) o.shX = n; if ((n = num(s.shY, -40, 40)) !== undefined) o.shY = n; if ((n = num(s.shB, 0, 80)) !== undefined) o.shB = n; cs('shC');
    if ((n = num(s.glowB, 0, 100)) !== undefined && n > 0) o.glowB = n; cs('glowC');
    cs('bgC'); if ((n = num(s.bgA, 0, 1)) !== undefined) o.bgA = n; if ((n = num(s.padX, 0, 80)) !== undefined) o.padX = n; if ((n = num(s.padY, 0, 80)) !== undefined) o.padY = n; if ((n = num(s.radius, 0, 80)) !== undefined) o.radius = n;
    if ((n = num(s.bdW, 0, 12)) !== undefined && n > 0) o.bdW = n; cs('bdC'); if (['solid', 'dashed', 'dotted', 'double'].indexOf(s.bdS) >= 0) o.bdS = s.bdS;
    if ((n = num(s.opacity, 0.1, 1)) !== undefined && n < 1) o.opacity = n;
    if (s.seq === true) o.seq = true; if ((n = num(s.seqGap, 0.2, 10)) !== undefined) o.seqGap = n;
    return o;
  }
  // 역할의 최종 스타일 = 전체 값 위에 챕터 값
  function resolve(ts, cid, role) {
    ts = ts || {}; var a = (ts.all || {})[role] || {}, c = ((ts.chapters || {})[cid] || {})[role] || {};
    return Object.assign({}, a, c);
  }

  R.TextStyle = { ROLES: ROLES, NARR: NARR, IN: IN, OUT: OUT, LOOP: LOOP, WEIGHTS: WEIGHTS, clean: clean, resolve: resolve };
})(typeof window !== 'undefined' ? window : globalThis);
