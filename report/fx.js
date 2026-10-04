// 무빙툰 클립 연출 엔진 (관리자 미리보기와 이후 공개 뷰어가 함께 쓴다)
// clip.fx = { trans:{}, sub:{}, voice:{}, video:{}, cues:[{t,s,e}] } 중 지정한 값만 저장되고,
// 지정하지 않은 값은 "기본 연출(defaults)" → 내장 기본값 순으로 채워진다.
// 시간 단위는 모두 초. 자막 시각(s,e)은 앞부분 자르기(trimStart)를 반영한 "재생 시작 기준"이다.
(function (root) {
  var TR_IN = [['cut', '컷 (바로 시작)'], ['fade', '페이드 인'], ['dissolve', '블러 디졸브'], ['slide-left', '오른쪽에서 밀며 등장'], ['slide-right', '왼쪽에서 밀며 등장'], ['slide-up', '아래에서 올라옴'], ['zoom-in', '줌 인'], ['zoom-out', '줌 아웃'], ['wipe', '와이프'], ['flash', '섬광']];
  var TR_OUT = [['cut', '컷 (바로 끝)'], ['fade', '페이드 아웃'], ['dissolve', '블러 디졸브'], ['slide-left', '왼쪽으로 밀며 퇴장'], ['slide-up', '위로 밀며 퇴장'], ['zoom-in', '줌 인하며 사라짐'], ['wipe', '와이프'], ['flash', '섬광']];
  var SUB_POS = [['bottom', '아래'], ['middle', '가운데'], ['top', '위']];
  var SUB_SIZE = [['S', '작게'], ['M', '보통'], ['L', '크게']];
  var SUB_FONT = [['gothic', '고딕 (Noto Sans KR)'], ['pretty', '프리텐다드 (깔끔한 요즘 고딕)'], ['myeongjo', '명조 (Noto Serif KR)'], ['gowun', '고운바탕 (부드러운 명조)'], ['gowundodum', '고운돋움 (따뜻한 고딕)'], ['hanna', '블랙한산스 (굵은 제목체)'], ['dohyeon', '도현체 (굵은 고딕)'], ['bagel', '베이글팻원 (통통한 팝 제목체)'], ['jua', '주아체 (둥근 귀여움)'], ['dongle', '동글 (둥글고 작은 손글씨)'], ['gamja', '감자꽃 (말랑한 손글씨)'], ['hi', '하이멜로디 (귀여운 손글씨)'], ['single', '싱글데이 (일기장 손글씨)'], ['poor', '푸어스토리 (또박한 손글씨)'], ['pen', '나눔펜 (손글씨)'], ['gaegu', '개구체 (손글씨)'], ['dokdo', '동해독도 (거친 붓)'], ['brush', '나눔붓 (붓글씨)'], ['songmyung', '송명 (고전 서체)'], ['yeonsung', '연성 (붓펜 느낌)'], ['gugi', '구기 (레트로 게임풍)'], ['stylish', '스타일리시 (세련된 얇은 글씨)'], ['cute', '귀여운 폰트 (캐릭터풍)'], ['kirang', '기랑해랑 (장난스러운)'], ['sunflower', '해바라기 (선명한 고딕)']];
  var SUB_WEIGHT = [['400', '보통'], ['500', '중간'], ['700', '굵게'], ['900', '아주 굵게']];
  var SUB_ALIGN = [['center', '가운데'], ['left', '왼쪽'], ['right', '오른쪽']];
  var SUB_COLOR = [['ivory', '아이보리'], ['white', '흰색'], ['gold', '금색'], ['yellow', '노랑']];
  var SUB_BG = [['none', '없음 (글자 테두리)'], ['shade', '반투명 띠'], ['box', '진한 박스']];
  var SUB_ANIM = [['none', '없음'], ['fade', '페이드'], ['rise', '아래에서 떠오름'], ['pop', '팝'], ['type', '타자기']];
  var ON_OFF = [['off', '끄기'], ['on', '켜기']];
  var VOICE_MODE = [['cue', '자막 줄마다 (자막과 동기)'], ['whole', '전체를 한 번에']];
  var FIT = [['contain', '전체 보이게 (여백)'], ['cover', '화면 가득 (잘림)']];

  // 폼 구성용 명세: [키, 이름, 형식, 선택지 또는 {min,max,step}]
  // 서버(functions/api/clips.js)의 검증표와 같은 범위를 쓴다. 한쪽을 바꾸면 다른 쪽도 바꿀 것.
  var FIELDS = [
    { g: 'trans', title: '장면 전환', items: [['in', '들어올 때', 'sel', TR_IN], ['out', '나갈 때', 'sel', TR_OUT], ['dur', '전환 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }]] },
    { g: 'sub', title: '자막 모양', items: [['font', '글씨체', 'sel', SUB_FONT], ['weight', '굵기', 'sel', SUB_WEIGHT], ['size', '크기(간단)', 'sel', SUB_SIZE], ['fs', '크기(세부, 화면폭의 %)', 'num', { min: 2, max: 14, step: 0.1 }], ['color', '글자색', 'sel', SUB_COLOR], ['colorHex', '글자색 직접(예: #FFD27A)', 'text'], ['bg', '배경', 'sel', SUB_BG], ['anim', '나타나는 효과', 'sel', SUB_ANIM], ['align', '정렬', 'sel', SUB_ALIGN], ['lh', '줄 간격(배)', 'num', { min: 1, max: 2.5, step: 0.05 }], ['ls', '자간(글자 크기의 %)', 'num', { min: -5, max: 30, step: 1 }],
      ['pos', '위치(간단)', 'sel', SUB_POS], ['x', '가로 위치(왼쪽 끝 0 ~ 오른쪽 끝 100%)', 'num', { min: 0, max: 100, step: 1 }], ['y', '세로 위치(위 0 ~ 아래 100%), 지정하면 간단 위치 무시', 'num', { min: 0, max: 100, step: 1 }], ['w', '자막 폭(화면폭의 %)', 'num', { min: 20, max: 100, step: 1 }]] },
    { g: 'voice', title: '읽는 목소리 (브라우저 음성 합성)', items: [['on', '목소리 읽기', 'sel', ON_OFF], ['name', '목소리', 'voice'], ['mode', '읽는 방식', 'sel', VOICE_MODE], ['rate', '속도', 'num', { min: 0.5, max: 2, step: 0.1 }], ['pitch', '음높이', 'num', { min: 0.5, max: 2, step: 0.1 }], ['vol', '볼륨(0~1)', 'num', { min: 0, max: 1, step: 0.1 }], ['delay', '읽기 시작 지연(초)', 'num', { min: 0, max: 10, step: 0.1 }]] },
    { g: 'video', title: '영상 재생', items: [['speed', '재생 속도', 'num', { min: 0.25, max: 2, step: 0.05 }], ['vol', '영상 원음 볼륨(0~1)', 'num', { min: 0, max: 1, step: 0.1 }], ['fit', '화면 맞춤', 'sel', FIT], ['trimStart', '앞부분 자르기(초)', 'num', { min: 0, max: 600, step: 0.1 }], ['trimEnd', '끝 지점(초, 0=끝까지)', 'num', { min: 0, max: 600, step: 0.1 }], ['hold', '마지막 화면 유지(초)', 'num', { min: 0, max: 10, step: 0.1 }]] },
  ];

  var BUILTIN = {
    trans: { 'in': 'fade', out: 'fade', dur: 0.5 },
    sub: { font: 'gothic', weight: '700', size: 'M', fs: 0, color: 'ivory', colorHex: '', bg: 'shade', anim: 'fade', align: 'center', lh: 1.45, ls: 0, pos: 'bottom', x: 50, y: -1, w: 90 },
    voice: { on: 'off', name: '', mode: 'cue', rate: 1, pitch: 1, vol: 1, delay: 0.2 },
    video: { speed: 1, vol: 1, fit: 'contain', trimStart: 0, trimEnd: 0, hold: 0.5 },
  };
  function resolve(fx, defaults) {
    var out = {};
    Object.keys(BUILTIN).forEach(function (g) {
      out[g] = Object.assign({}, BUILTIN[g], (defaults && defaults[g]) || {}, (fx && fx[g]) || {});
    });
    return out;
  }
  function cuesOf(clip) {
    var c = clip.fx && clip.fx.cues;
    if (c && c.length) return c.map(function (x) { return { t: String(x.t || ''), s: +x.s || 0, e: +x.e || 0 }; }).filter(function (x) { return x.t && x.e > x.s; }).sort(function (a, b) { return a.s - b.s; });
    return clip.caption ? [{ t: clip.caption, s: 0, e: 1e9 }] : []; // 타임라인이 없으면 자막 전체를 내내 표시
  }

  var COLORS = { ivory: '#ECE7DB', white: '#FFFFFF', gold: '#F0D08A', yellow: '#FFE66B' };
  var SIZES = { S: 4, M: 5, L: 6.5 };
  var FONTS = {
    gothic: '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif',
    pretty: '"Pretendard","Noto Sans KR",sans-serif',
    myeongjo: '"Noto Serif KR","Nanum Myeongjo","Batang","Noto Sans KR",serif',
    gowun: '"Gowun Batang","Noto Sans KR",serif',
    gowundodum: '"Gowun Dodum","Noto Sans KR",sans-serif',
    hanna: '"Black Han Sans","Noto Sans KR",sans-serif',
    dohyeon: '"Do Hyeon","Noto Sans KR",sans-serif',
    bagel: '"Bagel Fat One","Noto Sans KR",sans-serif',
    jua: '"Jua","Noto Sans KR",sans-serif',
    dongle: '"Dongle","Noto Sans KR",sans-serif',
    gamja: '"Gamja Flower","Noto Sans KR",cursive',
    hi: '"Hi Melody","Noto Sans KR",cursive',
    single: '"Single Day","Noto Sans KR",cursive',
    poor: '"Poor Story","Noto Sans KR",cursive',
    pen: '"Nanum Pen Script","Noto Sans KR",cursive',
    gaegu: '"Gaegu","Noto Sans KR",cursive',
    dokdo: '"East Sea Dokdo","Noto Sans KR",cursive',
    brush: '"Nanum Brush Script","Noto Sans KR",cursive',
    songmyung: '"Song Myung","Noto Sans KR",serif',
    yeonsung: '"Yeon Sung","Noto Sans KR",cursive',
    gugi: '"Gugi","Noto Sans KR",sans-serif',
    stylish: '"Stylish","Noto Sans KR",sans-serif',
    cute: '"Cute Font","Noto Sans KR",cursive',
    kirang: '"Kirang Haerang","Noto Sans KR",cursive',
    sunflower: '"Sunflower","Noto Sans KR",sans-serif',
  };
  // 글자 자체가 작게 설계된 글씨체는 같은 크기로 보이도록 키운다
  var FONT_SCALE = { dongle: 1.6, pen: 1.4, brush: 1.4, cute: 1.25, dokdo: 1.3, gamja: 1.1, gaegu: 1.1 };
  var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@400;500;700;900&family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Nanum+Pen+Script&family=Gaegu:wght@400;700&family=Dongle:wght@400;700&family=Bagel+Fat+One&family=East+Sea+Dokdo&family=Gamja+Flower&family=Hi+Melody&family=Yeon+Sung&family=Single+Day&family=Gugi&family=Song+Myung&family=Sunflower:wght@500;700&family=Poor+Story&family=Stylish&family=Cute+Font&family=Kirang+Haerang&family=Nanum+Brush+Script&display=swap';
  var FONT_CSS2 = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css';
  var css = '.fx-wrap{position:absolute;inset:0;overflow:hidden;background:#000;container-type:inline-size}' +
    '.fx-stage{position:absolute;inset:0;animation-duration:var(--fxd,.5s);animation-fill-mode:both;animation-timing-function:ease}' +
    '.fx-stage video{width:100%;height:100%;background:#000;display:block}' +
    '.fx-pos{position:absolute;pointer-events:none}' +
    '.fx-pos[data-pos=top]{top:8%;transform:translateX(-50%)}.fx-pos[data-pos=middle]{top:50%;transform:translate(-50%,-50%)}.fx-pos[data-pos=bottom]{bottom:9%;transform:translateX(-50%)}' +
    '.fx-sub{display:inline-block;max-width:100%;font-weight:700;white-space:pre-wrap;word-break:keep-all;padding:.2em .6em;border-radius:.3em;animation-duration:.4s;animation-fill-mode:both}' +
    '.fx-bg-none{text-shadow:0 0 .15em #000,0 0 .15em #000,0 .06em .25em #000}.fx-bg-shade{background:rgba(0,0,0,.45);text-shadow:0 .05em .15em #000}.fx-bg-box{background:rgba(0,0,0,.82)}' +
    '@keyframes fx-i-fade{from{opacity:0}}@keyframes fx-i-dissolve{from{opacity:0;filter:blur(14px)}}' +
    '@keyframes fx-i-slide-left{from{transform:translateX(100%)}}@keyframes fx-i-slide-right{from{transform:translateX(-100%)}}@keyframes fx-i-slide-up{from{transform:translateY(100%)}}' +
    '@keyframes fx-i-zoom-in{from{opacity:0;transform:scale(.7)}}@keyframes fx-i-zoom-out{from{opacity:0;transform:scale(1.4)}}' +
    '@keyframes fx-i-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}@keyframes fx-i-flash{from{opacity:0;filter:brightness(5)}60%{filter:brightness(2.2)}}' +
    '@keyframes fx-o-fade{to{opacity:0}}@keyframes fx-o-dissolve{to{opacity:0;filter:blur(14px)}}' +
    '@keyframes fx-o-slide-left{to{transform:translateX(-100%)}}@keyframes fx-o-slide-up{to{transform:translateY(-100%)}}' +
    '@keyframes fx-o-zoom-in{to{opacity:0;transform:scale(1.4)}}@keyframes fx-o-wipe{from{clip-path:inset(0 0 0 0)}to{clip-path:inset(0 0 0 100%)}}' +
    '@keyframes fx-o-flash{40%{opacity:1;filter:brightness(4)}to{opacity:0;filter:brightness(4)}}' +
    '@keyframes fx-sa-fade{from{opacity:0}}@keyframes fx-sa-rise{from{opacity:0;transform:translateY(.7em)}}@keyframes fx-sa-pop{from{opacity:0;transform:scale(.8)}}';
  function injectCss() {
    if (typeof document === 'undefined' || document.getElementById('fx-css')) return;
    var s = document.createElement('style'); s.id = 'fx-css'; s.textContent = css; document.head.appendChild(s);
    [FONT_CSS, FONT_CSS2].forEach(function (u) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = u; document.head.appendChild(l); });
  }

  function voices() { try { return (root.speechSynthesis && root.speechSynthesis.getVoices()) || []; } catch (e) { return []; } }
  function pickVoice(name) {
    var all = voices(); if (!all.length) return null;
    var v = name && all.filter(function (x) { return x.name === name || x.voiceURI === name; })[0];
    return v || all.filter(function (x) { return /^ko/i.test(x.lang); })[0] || null;
  }

  // box 안에서 클립 하나를 재생한다. o = { clip, url, defaults, onend, onerror }. { stop } 반환.
  function play(box, o) {
    injectCss();
    var clip = o.clip, fx = resolve(clip.fx, o.defaults), cues = cuesOf(clip);
    var done = false, ended = false, raf = 0, timers = [], idx = -2, curCue = null, typed = -1;
    var wrap = document.createElement('div'); wrap.className = 'fx-wrap';
    var stage = document.createElement('div'); stage.className = 'fx-stage';
    var pos = document.createElement('div'); pos.className = 'fx-pos'; pos.style.left = fx.sub.x + '%'; pos.style.width = fx.sub.w + '%'; pos.style.textAlign = fx.sub.align;
    if (fx.sub.y >= 0) { pos.dataset.pos = 'custom'; pos.style.top = fx.sub.y + '%'; pos.style.transform = 'translate(-50%,-50%)'; } else pos.dataset.pos = fx.sub.pos;
    var v = null;
    if (o.url) { v = document.createElement('video'); v.playsInline = true; v.style.objectFit = fx.video.fit; stage.appendChild(v); }
    stage.appendChild(pos); wrap.appendChild(stage); box.innerHTML = ''; box.appendChild(wrap);
    wrap.style.setProperty('--fxd', fx.trans.dur + 's'); stage.style.setProperty('--fxd', fx.trans.dur + 's');
    if (fx.trans['in'] !== 'cut') stage.style.animationName = 'fx-i-' + fx.trans['in'];

    var speaking = fx.voice.on === 'on' && root.speechSynthesis;
    function speak(text) {
      if (!speaking || !text) return;
      try {
        var u = new SpeechSynthesisUtterance(text), vv = pickVoice(fx.voice.name);
        u.lang = vv ? vv.lang : 'ko-KR'; if (vv) u.voice = vv;
        u.rate = fx.voice.rate; u.pitch = fx.voice.pitch; u.volume = fx.voice.vol;
        root.speechSynthesis.speak(u);
      } catch (e) {}
    }
    function later(fn, sec) { timers.push(setTimeout(function () { if (!done) fn(); }, Math.max(0, sec) * 1000)); }

    function showCue(t) {
      var i = -1;
      for (var k = 0; k < cues.length; k++) if (cues[k].s <= t && t < cues[k].e) { i = k; break; }
      if (i !== idx) {
        idx = i; curCue = i >= 0 ? cues[i] : null; typed = -1; pos.innerHTML = '';
        if (!curCue) return;
        var el = document.createElement('div');
        el.className = 'fx-sub fx-bg-' + fx.sub.bg; el.style.color = /^#[0-9a-f]{3,8}$/i.test(fx.sub.colorHex) ? fx.sub.colorHex : (COLORS[fx.sub.color] || COLORS.ivory);
        el.style.fontSize = (fx.sub.fs > 0 ? fx.sub.fs : (SIZES[fx.sub.size] || 5)) * (FONT_SCALE[fx.sub.font] || 1) + 'cqw';
        el.style.fontFamily = FONTS[fx.sub.font] || FONTS.gothic; el.style.fontWeight = fx.sub.weight; el.style.lineHeight = fx.sub.lh; el.style.letterSpacing = (fx.sub.ls / 100) + 'em';
        if (fx.sub.anim !== 'none' && fx.sub.anim !== 'type') el.style.animationName = 'fx-sa-' + fx.sub.anim;
        if (fx.sub.anim !== 'type') el.textContent = curCue.t;
        pos.appendChild(el);
        if (fx.voice.mode === 'cue') { var txt = curCue.t; later(function () { try { root.speechSynthesis.cancel(); } catch (e) {} speak(txt); }, fx.voice.delay); }
      }
      if (curCue && fx.sub.anim === 'type') { // 초당 14자씩 드러낸다
        var n = Math.min(curCue.t.length, Math.floor((t - curCue.s) * 14) + 1);
        if (n !== typed) { typed = n; pos.firstChild.textContent = curCue.t.slice(0, n); }
      }
    }
    function finish() { if (done) return; done = true; clearInterval(raf); if (o.onend) o.onend(); }
    function endMedia() {
      if (ended) return; ended = true;
      if (v) v.pause();
      var d = fx.trans.dur, outCut = fx.trans.out === 'cut';
      if (!outCut) { stage.style.animationName = 'fx-o-' + fx.trans.out; }
      later(finish, Math.max(fx.video.hold, outCut ? 0 : d));
    }
    var t0 = 0, total = 0;
    function tick() {
      if (done) return;
      var t;
      if (v) { t = v.currentTime - fx.video.trimStart; if (!ended && (v.ended || (fx.video.trimEnd > 0 && v.currentTime >= fx.video.trimEnd))) endMedia(); }
      else { t = (performance.now() - t0) / 1000; if (!ended && t >= total) endMedia(); }
      if (!ended) showCue(t); else if (v) showCue(t);
      
    }
    function start() {
      if (fx.voice.mode === 'whole' && speaking) { var all = cues.map(function (c) { return c.t; }).join(' '); later(function () { speak(all); }, fx.voice.delay); }
      t0 = performance.now(); raf = setInterval(tick, 50);
    }
    if (v) {
      v.src = o.url; v.playbackRate = fx.video.speed; v.volume = fx.video.vol;
      v.onerror = function () { if (!done) { done = true; clearInterval(raf); box.innerHTML = '<div class="ph err" style="padding:24px;text-align:center;color:#FF8A78">영상을 불러오지 못했습니다</div>'; if (o.onerror) o.onerror(); } };
      v.onloadedmetadata = function () { if (fx.video.trimStart > 0) try { v.currentTime = fx.video.trimStart; } catch (e) {} };
      var go = v.play(); if (go && go.catch) go.catch(function () { v.muted = true; v.play().catch(function () {}); });
      start();
    } else {
      var last = cues.filter(function (c) { return c.e < 1e8; }).reduce(function (m, c) { return Math.max(m, c.e); }, 0);
      total = Math.max(last, 4); start();
    }
    return { stop: function () { done = true; clearInterval(raf); timers.forEach(clearTimeout); try { root.speechSynthesis.cancel(); } catch (e) {} if (v) v.pause(); } };
  }

  root.MovingFx = { FIELDS: FIELDS, BUILTIN: BUILTIN, resolve: resolve, cuesOf: cuesOf, play: play, voices: voices };
})(typeof window !== 'undefined' ? window : globalThis);
