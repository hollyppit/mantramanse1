/* 관리자 v2: 시네마틱 연출 입력 폼 (클립 개별 연출 · 장면 종류별 기본 연출 공용).
   비워 두면 "기본값을 따름"이다(프리셋 → 기본 연출 → 내장 기본값 순). 값은 ReportV2.Cinema.clean 으로 걸러 저장하고, 서버(functions/_cinema.js)가 한 번 더 검증한다. */
(function () {
  var R = window.ReportV2, esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var KO = {
    sceneType: { INTRO: '인트로', CHARACTER: '캐릭터', QUESTION: '질문', MEMORY: '기억·회상', DAILY_LIFE: '일상 장면', EXPLANATION: '설명', CONFLICT: '갈등', COMPARISON: '비교', REVEAL: '발견', TURNING_POINT: '전환점', TIMELINE: '시간축', WARNING: '경고', OPPORTUNITY: '기회', ACTION: '행동', CLIMAX: '클라이맥스', ENDING: '엔딩' },
    preset: { CINEMATIC_INTRO: '시네마틱 인트로', CHARACTER_REVEAL: '캐릭터 공개', QUIET_REFLECTION: '조용한 성찰', DAILY_REALITY: '일상의 현실', REALITY_CHECK: '현실 점검', TENSION: '긴장', DISCOVERY: '발견', TURNING_POINT: '전환점', TIMELINE: '시간축', WARNING: '경고', OPPORTUNITY: '기회', EMOTIONAL: '감정', CLIMAX: '클라이맥스', ENDING: '엔딩' },
    pacing: { FAST: '빠름', MEDIUM: '보통', SLOW: '느림', PAUSE: '멈춤(정적 길게)' },
    motionIntensity: { 0: '0 · 정적', 1: '1 · 약함', 2: '2 · 일반', 3: '3 · 강조 (챕터당 2회까지)', 4: '4 · 클라이맥스 (전체에서 극히 제한)' },
    imageMotion: { none: '없음', 'slow-zoom-in': '천천히 다가감', 'slow-zoom-out': '천천히 물러남', 'pan-left': '왼쪽으로', 'pan-right': '오른쪽으로', 'pan-up': '위로', 'pan-down': '아래로', parallax: '시차(parallax)', drift: '살짝 떠다님', 'focus-pull': '초점 당기기' },
    transition: { fade: '페이드', crossfade: '크로스페이드', 'dip-black': '검정으로 (ACT·전환점)', 'dip-white': '흰색으로 (ACT·전환점)', blur: '블러 (ACT·전환점)', 'push-left': '왼쪽으로 밀기 (ACT·전환점)', 'push-right': '오른쪽으로 밀기 (ACT·전환점)', zoom: '줌 (ACT·전환점)', 'hard-cut': '하드컷', 'light-leak': '빛 번짐 (ACT·전환점)' },
    textAnimation: { fade: '페이드', 'fade-up': '아래서 떠오름', 'fade-down': '위에서 내려옴', 'slide-left': '왼쪽으로 밀며', 'slide-right': '오른쪽으로 밀며', 'zoom-in': '확대하며', 'zoom-out': '축소하며', 'blur-in': '흐리다 선명', 'focus-in': '초점 맞추기', 'word-reveal': '단어씩', 'line-reveal': '줄씩', typewriter: '타자기', 'cinematic-title': '영화 타이틀', impact: '임팩트', whisper: '속삭임', float: '둥실', 'parallax-text': '시차 글자' },
    textPosition: { top: '위', center: '가운데', bottom: '아래', 'lower-third': '아래 3분의 1' },
    textSize: { S: '작게', M: '보통', L: '크게', XL: '아주 크게' },
    textEmphasis: { soft: '약하게', normal: '보통', pause: '잠깐 멈춤', impact: '임팩트' },
    bgmMood: { cinematic: '시네마틱', minimal: '미니멀', ambient: '앰비언트', emotional: '감성', tension: '긴장', hopeful: '희망', reflective: '성찰' },
    mood: { calm: '고요', awe: '경외', reflective: '성찰', tense: '긴장', warm: '따뜻함', hopeful: '희망', lonely: '쓸쓸함', powerful: '힘' },
  };
  var LABEL = { sceneType: '장면 종류', preset: '연출 프리셋', pacing: '호흡(Pacing)', motionIntensity: '모션 강도', imageMotion: '이미지 모션', transition: '전환', textAnimation: '글자 애니메이션', textPosition: '글자 위치', textSize: '글자 크기', textEmphasis: '글자 강조', bgmMood: 'BGM 분위기', mood: '분위기' };
  var ORDER = ['sceneType', 'preset', 'pacing', 'motionIntensity', 'imageMotion', 'transition', 'textAnimation', 'textPosition', 'textSize', 'textEmphasis', 'bgmMood', 'mood'];

  function sel(prefix, k, v) {
    var o = '<option value="">(기본값 따름)</option>';
    Object.keys(KO[k]).forEach(function (x) { o += '<option value="' + esc(x) + '"' + (String(v) === String(x) ? ' selected' : '') + '>' + esc(KO[k][x]) + '</option>'; });
    return '<label>' + LABEL[k] + '<select data-cn="' + k + '">' + o + '</select></label>';
  }
  // 폼 HTML. val: 저장된 연출 객체(없으면 빈 칸)
  function fields(val) {
    val = val || {}; var fp = val.focalPoint || {};
    return '<div class="v2cn" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">' + ORDER.map(function (k) { return sel('', k, val[k]); }).join('') +
      '<label>오버레이 어둡기 (0~1)<input type="number" data-cn="overlayStrength" min="0" max="1" step="0.05" value="' + (val.overlayStrength == null ? '' : val.overlayStrength) + '" placeholder="기본"></label>' +
      '<label>초점 X % (0~100)<input type="number" data-cn="focalX" min="0" max="100" step="5" value="' + (fp.x == null ? '' : Math.round(fp.x * 100)) + '" placeholder="50"></label>' +
      '<label>초점 Y % (0~100)<input type="number" data-cn="focalY" min="0" max="100" step="5" value="' + (fp.y == null ? '' : Math.round(fp.y * 100)) + '" placeholder="50"></label>' +
      '<label>장면 뒤 정적 (ms)<input type="number" data-cn="pauseAfter" min="0" max="5000" step="100" value="' + (val.pauseAfter == null ? '' : val.pauseAfter) + '" placeholder="기본"></label></div>' +
      '<p class="muted" style="font-size:.78rem;margin:8px 0 0">프리셋만 골라도 나머지가 자동으로 채워집니다. 모션 강도 3 은 챕터당 2회, 4 는 전체 1회를 넘으면 자동으로 낮아집니다. 손님 기기에서 "동작 줄이기"를 켜면 카메라·큰 슬라이드·시차는 꺼지고 문장은 그대로 나옵니다.</p>';
  }
  // 폼에서 값 읽기 → 걸러서 반환(빈 칸은 제외)
  function read(root) {
    var o = {}; [].forEach.call(root.querySelectorAll('[data-cn]'), function (i) { var k = i.getAttribute('data-cn'), v = i.value; if (v === '' || v == null) return; o[k] = v; });
    if (o.focalX != null || o.focalY != null) { o.focalPoint = { x: (o.focalX != null ? +o.focalX : 50) / 100, y: (o.focalY != null ? +o.focalY : 50) / 100 }; }
    delete o.focalX; delete o.focalY; return R.Cinema.clean(o);
  }
  // 값 채우기(AI 추천 적용용)
  function write(root, val) {
    val = val || {}; [].forEach.call(root.querySelectorAll('[data-cn]'), function (i) {
      var k = i.getAttribute('data-cn'), v = k === 'focalX' ? (val.focalPoint ? Math.round(val.focalPoint.x * 100) : '') : k === 'focalY' ? (val.focalPoint ? Math.round(val.focalPoint.y * 100) : '') : val[k];
      i.value = v == null ? '' : v;
    });
  }
  // "AI 연출 추천" 버튼: 서버에는 이미 쓰인 문장과 장면 메타만 보낸다. 받은 값은 폼에 채울 뿐 저장은 관리자가 "적용"을 눌러야 한다.
  function bindAi(btn, root, getScene, api, toast) {
    btn.onclick = function () {
      var sc = getScene(); btn.disabled = true; var t = btn.textContent; btn.textContent = '추천 받는 중…';
      api('/api/direct', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scene: sc }) }).then(function (r) {
        write(root, r.suggestion); var n = root.querySelector('.v2cn-note'); if (n) n.textContent = (r.suggestion.narrativePurpose ? '장면의 역할: ' + r.suggestion.narrativePurpose : '') + (r.suggestion.visualConcept ? ' · 시각 컨셉: ' + r.suggestion.visualConcept : '');
        toast('AI 추천을 채웠습니다. 확인한 뒤 적용하세요.');
      }).catch(function (e) { toast(e.message, true); }).then(function () { btn.disabled = false; btn.textContent = t; });
    };
  }
  window.V2Cinema = { KO: KO, LABEL: LABEL, fields: fields, read: read, write: write, bindAi: bindAi };
})();
