// 온보딩 커버 글꼴·효과 목록(스토리 페이지와 관리자가 함께 쓴다). 글꼴은 고른 것만 Google Fonts 에서 그때 불러온다(안 쓰는 글꼴은 내려받지 않음).
(function (root) {
  // 키 → [표시 이름, CSS font-family, Google Fonts 주소 조각(없으면 기본 글꼴)]
  var FONTS = {
    serif: ['명조 (Noto Serif KR · 기본)', 'var(--f-serif)'],
    sans: ['고딕 (Noto Sans KR · 기본)', 'var(--f-sans)'],
    nanummj: ['나눔명조', '"Nanum Myeongjo", "Noto Serif KR", serif', 'Nanum+Myeongjo:wght@400;700;800'],
    gowunb: ['고운바탕', '"Gowun Batang", "Noto Serif KR", serif', 'Gowun+Batang:wght@400;700'],
    hahmlet: ['함렛 (단정한 세리프)', '"Hahmlet", "Noto Serif KR", serif', 'Hahmlet:wght@300;500;700'],
    songmyung: ['송명 (붓 느낌 세리프)', '"Song Myung", "Noto Serif KR", serif', 'Song+Myung'],
    gowund: ['고운돋움 (부드러운 고딕)', '"Gowun Dodum", "Noto Sans KR", sans-serif', 'Gowun+Dodum'],
    blackhan: ['블랙한산스 (아주 굵은 제목)', '"Black Han Sans", "Noto Sans KR", sans-serif', 'Black+Han+Sans'],
    dohyeon: ['도현 (굵은 고딕)', '"Do Hyeon", "Noto Sans KR", sans-serif', 'Do+Hyeon'],
    jua: ['주아 (둥근 글꼴)', '"Jua", "Noto Sans KR", sans-serif', 'Jua'],
    pen: ['나눔펜 (손글씨)', '"Nanum Pen Script", cursive', 'Nanum+Pen+Script'],
    dokdo: ['동해독도 (붓글씨)', '"East Sea Dokdo", cursive', 'East+Sea+Dokdo'],
    gamja: ['감자꽃 (손글씨)', '"Gamja Flower", cursive', 'Gamja+Flower'],
    cinzel: ['Cinzel (영문 고전체)', '"Cinzel", "Noto Serif KR", serif', 'Cinzel:wght@400;600;700'],
    cormorant: ['Cormorant Garamond (영문 우아체)', '"Cormorant Garamond", "Noto Serif KR", serif', 'Cormorant+Garamond:wght@400;600'],
  };
  var done = {};
  function css(k) { var f = FONTS[k]; return f ? f[1] : ''; }
  function ensure(k) {
    var f = FONTS[k]; if (!f || !f[2] || done[k] || !root.document) return; done[k] = 1;
    var l = root.document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f[2] + '&display=swap'; root.document.head.appendChild(l);
  }
  // 등장 효과(처음 나타날 때 한 번) / 지속 효과(계속 움직임)
  var IN = [['', '없음'], ['fade', '서서히 나타나기'], ['rise', '아래에서 떠오르기'], ['drop', '위에서 내려오기'], ['blur', '흐릿하다가 선명해지기'], ['zoom', '살짝 커지며 나타나기'], ['wipe', '왼쪽에서 펼쳐지기'], ['letters', '글자가 하나씩 나타나기']];
  var LOOP = [['', '없음'], ['float', '둥실 떠다니기'], ['glow', '은은하게 빛나기'], ['both', '둥실 + 빛나기'], ['pulse', '숨쉬듯 커졌다 작아지기'], ['sway', '좌우로 살랑이기'], ['shimmer', '빛이 훑고 지나가기']];
  root.StoryFonts = { FONTS: FONTS, css: css, ensure: ensure, IN: IN, LOOP: LOOP, list: Object.keys(FONTS).map(function (k) { return [k, FONTS[k][0]]; }) };
})(typeof window !== 'undefined' ? window : globalThis);
