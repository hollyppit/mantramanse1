// 스토리 온보딩 화면 엔진.  문구·이미지는 content.js 에서 고칩니다 (여기는 보통 건드릴 필요가 없습니다).
//   · 블록 렌더러 (BLOCKS)   : content.js 의 type 하나당 함수 하나
//   · 기능 컴포넌트 (COMPONENTS): 사주 입력·무료 결과·운 흐름·잠금 목록·구매 — 기존 engine.js(Manse) 계산을 그대로 사용
//   · Analytics             : 분석 이벤트 함수 (GA4 등은 아래 track() 한 곳에서 연결)
//   · 사주 계산·결제 코드는 이 파일의 COMPONENTS 안에만 있고, 마케팅 문구와 섞이지 않습니다.
(function (root) {
  'use strict';

  var C = root.OnboardingContent || {};
  var DOC = typeof document !== 'undefined';
  var DEV = DOC && (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]dev=1\b/.test(location.search));
  var REDUCE = DOC && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────── 공통 도구 ─────────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // \n → <br>, *강조* → <em>
  function fmt(s) { return esc(s).replace(/\n/g, '<br>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>'); }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }

  // A/B 문구: { A: '…', B: '…' } 형태면 현재 variant 의 값을 쓴다 (?v=B 로 전환, 기본 A)
  var VARIANT = (function () {
    var v = 'A';
    try {
      var q = DOC && new URLSearchParams(location.search).get('v');
      if (q && /^[A-Za-z0-9]{1,8}$/.test(q)) { v = q; try { localStorage.setItem('mt_story_v', v); } catch (e) { } }
      else { var s = DOC && localStorage.getItem('mt_story_v'); if (s && /^[A-Za-z0-9]{1,8}$/.test(s)) v = s; }
    } catch (e) { }
    return v;
  })();
  function pick(x) { return x && typeof x === 'object' && !Array.isArray(x) && 'A' in x ? (x[VARIANT] != null ? x[VARIANT] : x.A) : x; }

  // 이미지·영상 주소: 상대경로면 imageBase 를 붙인다. 허용: 상대경로, /로 시작, https://
  function media(src) {
    src = String(pick(src) || '').trim();
    if (!src) return '';
    if (/^https:\/\//i.test(src) || /^\/(?!\/)/.test(src)) return src;
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.indexOf('..') >= 0 || src.indexOf('//') >= 0) return '';
    return ((C.settings && C.settings.imageBase) || '/report/story/img/') + src.replace(/^\.?\//, '');
  }
  function ratio(r, d) { r = String(r || d || ''); return /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(r) ? r.replace(/\s/g, '') : d || ''; }

  // ───────── 분석 이벤트 ─────────
  // 여기가 유일한 연결 지점: GA4(gtag)·dataLayer·사용자 이벤트(mantra:track)로 한꺼번에 내보낸다.
  // 이미 사이트에 분석 도구가 있으면 그대로 쓰고, 없으면 아무 일도 일어나지 않는다(개발 화면에서는 콘솔에 표시).
  //   onboarding_started · problem_section_viewed · movingtoon_preview_viewed · interest_selected · saju_input_started
  //   onboarding_block_viewed {index, type} (블록이 화면에 들어올 때 1회 — 이탈 지점 분석용, 개인정보 없음)
  //   saju_analysis_completed · free_result_viewed · flow_preview_viewed · paywall_viewed · purchase_clicked · purchase_completed(결제 연결 시)
  var sent = {};
  function track(name, props, once) {
    if (!name) return;
    if (once) { if (sent[name]) return; sent[name] = 1; }
    props = Object.assign({ variant: VARIANT }, props || {});
    try { if (typeof root.gtag === 'function') root.gtag('event', name, props); } catch (e) { }
    try { if (root.dataLayer && root.dataLayer.push) root.dataLayer.push(Object.assign({ event: name }, props)); } catch (e) { }
    try { if (DOC) root.dispatchEvent(new CustomEvent('mantra:track', { detail: { name: name, props: props } })); } catch (e) { }
    if (DEV && root.console) console.log('[track]', name, props);
  }

  // ───────── 주인공의 가장 큰 동력: 우세 십성군 → 이름 (매핑만, AI 없음) ─────────
  var GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'];
  var POTENTIAL = { 비겁: '스스로 길을 여는 힘', 식상: '생각을 형태로 만드는 힘', 재성: '기회를 알아보는 힘', 관성: '사람들이 믿고 따르게 만드는 힘', 인성: '깊이 이해하고 꿰뚫는 힘' };
  var POTENTIAL_LINE = "이 이야기의 주인공을 움직이는 가장 큰 동력은 '{potential}'이다. {group} 기운 {n}%, 평균의 {times}배다.";
  var EL_COLORS = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'];
  function potential(ch) { // 엔진이 이미 계산한 십성군 비중(ch.weights.groups, 일간 기준 비겁·식상·재성·관성·인성)만 읽는다
    var g = ch && ch.weights && ch.weights.groups; if (!g || g.length < 5) return null;
    var v = {}; GROUPS5.forEach(function (k, i) { v[k] = Math.round(g[i] * 10) / 10; });
    var dom = GROUPS5.slice().sort(function (a, b) { return v[b] - v[a]; })[0];
    return { group: dom, name: POTENTIAL[dom], pct: v[dom], n: Math.round(v[dom]), times: Math.round(v[dom] / 20 * 10) / 10 };
  }
  function potentialLine(ch, tpl) {
    var p = potential(ch); if (!p) return '';
    return String(tpl || POTENTIAL_LINE).replace(/\{potential\}/g, p.name).replace(/\{group\}/g, p.group).replace(/\{n\}/g, p.n).replace(/\{times\}/g, p.times);
  }

  // ───────── 상태 (마케팅 문구와 분리된 사용자 상태) ─────────
  // 개인 정보(생년월일 등)는 서버나 저장소에 보내지 않고 이 화면의 메모리에만 둔다.
  var S = { interest: null, name: '', chart: null, flowOpen: false, home: null };

  // ───────── 자리표시 ─────────
  function placeholder(todo, alt, style) {
    var inner = DEV && todo ? '<span class="ph-todo">TODO · ' + esc(todo) + '</span>' : '<span class="ph-t">이미지 준비 중</span>';
    return '<div class="ph" role="img" aria-label="' + esc(alt || '이미지 준비 중') + '"' + (style ? ' style="' + style + '"' : '') + '><i></i>' + inner + '</div>';
  }
  // 이미지 한 장 (비었거나 불러오기에 실패하면 자리표시). 크기는 aspect-ratio 로 미리 잡아 화면이 밀리지 않게 한다.
  function pic(o, opt) {
    opt = opt || {};
    var url = media(o.src), mob = media(o.srcMobile), ar = ratio(o.aspectRatio, opt.ar), fit = o.objectFit === 'contain' ? 'contain' : 'cover';
    var st = ar ? 'aspect-ratio:' + ar : '';
    if (!url) return '<div class="pic" style="' + st + '" data-empty="1">' + placeholder(o.todo, pick(o.alt), 'position:absolute;inset:0') + '</div>';
    var img = '<img class="sImg" src="' + esc(url) + '" alt="' + esc(pick(o.alt) || '') + '" loading="' + (opt.eager ? 'eager' : 'lazy') + '" decoding="async" style="object-fit:' + fit + '" data-todo="' + esc(o.todo || '') + '">';
    if (mob) img = '<picture><source media="(max-width:768px)" srcset="' + esc(mob) + '">' + img + '</picture>';
    return '<div class="pic" style="' + st + '">' + img + '</div>';
  }
  function hasMedia(o) { return !!media(o.src); }
  function hideEmpty(o) { return !DEV && C.settings && C.settings.hideEmptyMediaInProduction && !hasMedia(o); }

  // ───────── 블록 렌더러 ─────────
  // 각 함수는 HTML 문자열(바깥 래퍼 제외)을 돌려준다. 새 블록 종류를 만들 때는 BLOCKS 에 함수를 하나 추가하면 된다.
  function lines(html, how) { // 'lines': 줄마다 차례로 등장
    return how === 'lines' ? html.split('<br>').map(function (l, i) { return '<span class="ln" style="--i:' + i + '">' + l + '</span>'; }).join('') : html;
  }
  var BLOCKS = {
    headline: function (b) {
      // 인트로 커버가 켜져 있으면 첫 화면의 '둘러보기'가 자동 스크롤을 시작하므로, 저장본에 남아 있는 첫 문장의 시작 버튼·스크롤 안내는 그리지 않는다
      if (b.id === 'hero' && !(C.settings && C.settings.cover && C.settings.cover.show === false)) b = Object.assign({}, b, { startButton: '', scrollHint: false });
      var size = /^(xl|l|m)$/.test(b.size) ? b.size : 'l';
      return (b.kicker ? '<p class="kicker">' + fmt(pick(b.kicker)) + '</p>' : '') +
        '<h2 class="hl hl-' + size + '">' + lines(fmt(pick(b.title)), b.anim) + '</h2>' +
        (b.subtitle ? '<p class="sub">' + fmt(pick(b.subtitle)) + '</p>' : '') +
        (b.startButton ? '<button type="button" class="btn start" data-action="auto:start">' + esc(pick(b.startButton)) + '</button>' : '') +
        (b.scrollHint ? '<div class="scroll-hint" aria-hidden="true"><span>SCROLL</span><i></i></div>' : '');
    },
    text: function (b) {
      return (b.title ? '<h3 class="tt">' + fmt(pick(b.title)) + '</h3>' : '') + (b.subtitle ? '<p class="sub">' + fmt(pick(b.subtitle)) + '</p>' : '') +
        (b.body ? '<p class="body' + (b.emphasis ? ' emph' : '') + '">' + lines(fmt(pick(b.body)), b.anim) + '</p>' : '');
    },
    quote: function (b) { return '<blockquote class="quote"><p>' + lines(fmt(pick(b.text)), b.anim) + '</p>' + (b.cite ? '<cite>' + esc(pick(b.cite)) + '</cite>' : '') + '</blockquote>'; },
    image: function (b) {
      return '<figure class="fig w-' + (/^(narrow|wide|normal)$/.test(b.width) ? b.width : 'normal') + '">' + pic(b, { ar: '4/5' }) + (b.caption ? '<figcaption>' + fmt(pick(b.caption)) + '</figcaption>' : '') + '</figure>';
    },
    imageText: function (b) {
      var pos = /^(left|right|top|bottom)$/.test(b.imagePosition) ? b.imagePosition : 'left', stack = pos === 'top' || pos === 'bottom';
      var ar = ratio(b.aspectRatio, '4/5'), p = ar.split('/'), r = (+p[0]) / (+p[1]) || 0.8;
      var fig = b.mediaType === 'video'
        ? '<div class="vwrap" style="--r:' + r + '">' + BLOCKS.video(Object.assign({}, b, { width: 'wide', caption: '', aspectRatio: ar })) + '</div>'
        : '<figure class="fig" style="--r:' + r + '">' + pic(b, { ar: ar }) + '</figure>';
      var txt = '<div class="it-t">' + (b.title ? '<h3 class="tt big">' + lines(fmt(pick(b.title)), b.anim) + '</h3>' : '') + (b.body ? '<p class="body">' + fmt(pick(b.body)) + '</p>' : '') + '</div>';
      return '<div class="it p-' + pos + (stack ? ' stack' : '') + '">' + (pos === 'bottom' ? txt + fig : fig + txt) + '</div>';
    },
    fullImage: function (b) {
      return '<figure class="fig full" style="--h:' + esc(/^\d+(\.\d+)?(svh|vh|px|vw)$/.test(b.height) ? b.height : '70svh') + '">' + pic(Object.assign({}, b, { aspectRatio: '' }), {}) + (b.caption ? '<figcaption>' + fmt(pick(b.caption)) + '</figcaption>' : '') + '</figure>';
    },
    gallery: function (b) {
      var items = (b.items || []).slice(0, 4), cols = Math.min(4, Math.max(2, num(b.columns, items.length > 2 ? 2 : items.length || 2)));
      return '<div class="gal c' + cols + '">' + items.map(function (it) {
        return '<figure class="fig">' + pic(it, { ar: b.aspectRatio || '4/5' }) + (it.caption ? '<figcaption>' + fmt(pick(it.caption)) + '</figcaption>' : '') + '</figure>';
      }).join('') + '</div>';
    },
    video: function (b) {
      var url = media(b.src), ar = ratio(b.aspectRatio, '9/16'), st = 'aspect-ratio:' + ar;
      var auto = !!b.autoplay && !REDUCE, muted = auto || b.muted !== false;
      var inner = url
        ? '<video playsinline webkit-playsinline preload="none"' + (muted ? ' muted' : '') + (b.loop ? ' loop' : '') + (auto ? '' : ' controls') + (media(b.poster) ? ' poster="' + esc(media(b.poster)) + '"' : '') + ' data-src="' + esc(url) + '" data-auto="' + (auto ? 1 : 0) + '"></video>'
        : placeholder(b.todo, '무빙툰 미리보기 영상 준비 중', 'position:absolute;inset:0');
      return '<figure class="fig vid w-' + (/^(narrow|wide|normal)$/.test(b.width) ? b.width : 'narrow') + '"><div class="pic" style="' + st + '">' + inner + '</div>' + (b.caption ? '<figcaption>' + fmt(pick(b.caption)) + '</figcaption>' : '') + '</figure>';
    },
    chain: function (b) {
      var items = (b.items || []).map(function (x) { return '<span class="node">' + fmt(pick(x)) + '</span>'; });
      var sep = b.direction === 'row' ? '<span class="op" aria-hidden="true">×</span>' : '<span class="op dn" aria-hidden="true">↓</span>';
      return (b.title ? '<p class="kicker">' + fmt(pick(b.title)) + '</p>' : '') + '<div class="chain ' + (b.direction === 'row' ? 'row' : 'down') + '">' + items.join(sep) +
        (b.result ? '<span class="op dn" aria-hidden="true">↓</span><span class="node result">' + fmt(pick(b.result)) + '</span>' : '') + '</div>';
    },
    compare: function (b) {
      function col(c, cls) {
        c = c || {};
        return '<div class="cmp-c ' + cls + (c.highlight ? ' hi' : '') + '"><p class="cmp-l">' + esc(pick(c.label)) + '</p>' +
          (c.items || []).map(function (x, i) { return (i ? '<span class="op dn" aria-hidden="true">↓</span>' : '') + '<span class="node">' + fmt(pick(x)) + '</span>'; }).join('') + '</div>';
      }
      var ar = ratio(b.aspectRatio, '9/16'), pr = ar.split('/'), r = (+pr[0]) / (+pr[1]) || 0.56;
      return '<div class="cmp">' + col(b.left, 'l') + col(b.right, 'r') + '</div>' +
        (b.src || b.todo ? '<figure class="fig cmp-img" style="--r:' + r + '">' + pic(b, { ar: ar }) + (b.caption ? '<figcaption>' + fmt(pick(b.caption)) + '</figcaption>' : '') + '</figure>' : '') +
        (b.body ? '<p class="body" style="margin-top:26px">' + fmt(pick(b.body)) + '</p>' : '');
    },
    stickySteps: function (b) {
      var st = b.steps || [];
      return '<div class="ss"><div class="ss-media" aria-hidden="true">' + st.map(function (s, i) { return '<div class="ss-m' + (i ? '' : ' on') + '" data-i="' + i + '">' + pic(s, { ar: '4/5' }) + '</div>'; }).join('') + '</div>' +
        '<div class="ss-steps">' + st.map(function (s, i) {
          return '<div class="ss-s" data-i="' + i + '"><div class="ss-inline">' + pic(s, { ar: '4/5' }) + '</div><div class="ss-txt">' +
            (s.title ? '<h3 class="tt">' + fmt(pick(s.title)) + '</h3>' : '') + (s.text ? '<p class="body">' + fmt(pick(s.text)) + '</p>' : '') + '</div></div>';
        }).join('') + '</div></div>';
    },
    spacer: function (b) { return ''; }, // 크기는 래퍼 클래스로
    divider: function () { return '<div class="div" aria-hidden="true"><i></i></div>'; },
    cta: function (b) {
      return '<div class="cta">' + (b.headline ? '<h3 class="tt">' + fmt(pick(b.headline)) + '</h3>' : '') + (b.description ? '<p class="body">' + fmt(pick(b.description)) + '</p>' : '') +
        '<button type="button" class="btn ' + (b.variant === 'ghost' ? 'ghost' : '') + '" data-action="' + esc(b.action || '') + '">' + esc(pick(b.buttonText)) + '</button></div>';
    },
    interest: function (b) {
      return '<h2 class="hl hl-l">' + fmt(pick(b.title)) + '</h2>' + (b.hint ? '<p class="sub">' + fmt(pick(b.hint)) + '</p>' : '') +
        '<div class="int" role="group" aria-label="' + esc(String(pick(b.title)).replace(/\n/g, ' ')) + '">' + (C.interests || []).map(function (it) {
          return '<button type="button" class="int-c" data-interest="' + esc(it.key) + '" aria-pressed="false"><b aria-hidden="true">' + esc(it.icon || '') + '</b><span>' + esc(it.label) + '</span></button>';
        }).join('') + '</div>';
    },
    component: function (b) { var f = COMPONENTS[b.name]; return f ? f.render(b) : ''; },
  };

  // ───────── 기능 컴포넌트 (기존 서비스 연결부) ─────────
  var M = function () { return root.Manse; };
  var CITIES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['군산', 126.71], ['익산', 126.96], ['목포', 126.39], ['여수', 127.66], ['순천', 127.49], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['구미', 128.34], ['창원', 128.68], ['진주', 128.11], ['김해', 128.88], ['춘천', 127.73], ['원주', 127.95], ['강릉', 128.90], ['제주', 126.53], ['서귀포', 126.56], ['평양', 125.75]];
  var STORE = 'mantra-manse-v1'; // 만세력 앱이 저장해 둔 입력값 키 (읽기만 해서 입력 칸을 미리 채워 준다)

  function opts(from, to, sel, suffix) { var o = ''; for (var i = from; i <= to; i++) o += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + (suffix || '') + '</option>'; return o; }
  function interestText() { var it = (C.interests || []).filter(function (x) { return x.key === S.interest; })[0]; return it ? it.text : ''; }
  function withInterest(tpl) { var t = interestText(); return t ? String(tpl || '').replace('{interest}', t) : ''; }

  // 관리자에서 올린 클립 중 이 사주에 맞는 영상 한 편을 고른다 (조합 규칙은 관리자 "조합 테스트"와 같은 report/assemble.js).
  var clipData = null, clipLoading = null;
  function loadClips() {
    if (clipLoading) return clipLoading;
    clipLoading = fetch('/api/clips?public=1').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { clipData = d && d.clips ? d : { clips: [] }; }).catch(function () { clipData = { clips: [] }; });
    return clipLoading;
  }
  function factsOf(ch) {
    var m = M(), day = m.gzNameK(ch.pillars.day), month = m.gzNameK(ch.pillars.month), g = ch.weights.groups, names = ['비겁', '식상', '재성', '관성', '인성'], mi = 0;
    for (var i = 1; i < 5; i++) if (g[i] > g[mi]) mi = i;
    return { ilju: day, ilgan: day[0], ilji: day[1], wolji: month[1], strength: ch.strength.zone, yongEl: ch.yong && ch.yong.applicable ? m.EL_K[ch.yong.yong] : '', dominant: names[mi], gender: ch.gender === 'M' ? '남' : '여' };
  }
  function pickClip(ch) {
    if (!clipData || !clipData.clips.length || !root.Assemble) return null;
    try {
      var chs = (clipData.chapters || []).map(function (c) { return [c.id, c.name]; }), want = C.settings && C.settings.resultClipChapter;
      var rows = root.Assemble.assemble(clipData.clips, factsOf(ch), chs.length ? chs : undefined, clipData.folders || []);
      var row = want ? rows.filter(function (r) { return r.chapter === want; })[0] : rows.filter(function (r) { return r.pick; })[0];
      return row && row.pick ? row.pick : null;
    } catch (e) { return null; }
  }

  // 결과 아래 영상/이미지: 맞는 클립이 있으면 영상, 없으면 content.js 의 이미지(없으면 자리표시)
  function resultMedia(R, ch) {
    var clip = pickClip(ch);
    if (clip && media(clip.url)) {
      return BLOCKS.video({ src: clip.url, autoplay: true, muted: true, loop: true, aspectRatio: '9/16', width: 'narrow' });
    }
    return R.image ? '<figure class="fig w-narrow">' + pic(R.image, { ar: '1/1' }) + '</figure>' : '';
  }


  var FlowPreview; // COMPONENTS.FlowPreview (렌더·클릭 처리에서 서로 참조)
  var COMPONENTS = {
    // 사주 입력: 만세력 앱과 같은 입력값·같은 계산(Manse.compute)을 쓴다. 계산 로직은 건드리지 않는다.
    SajuInput: {
      render: function (b) {
        var saved = null, y = new Date().getFullYear();
        try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { }
        saved = saved || {};
        var sy = +saved.year || 1990, sm = +saved.month || 1, sd = +saved.day || 1, g = saved.gender === 'M' ? 'M' : saved.gender === 'F' ? 'F' : '';
        var minY = (M() && M().MIN_Y) || 1900;
        return '<h2 class="hl hl-l">' + fmt(pick(b.title)) + '</h2>' +
          '<form class="form" id="sajuForm" novalidate autocomplete="off">' +
          '<label class="f"><span>이름 (선택)</span><input type="text" name="name" maxlength="20" autocomplete="off" value="' + esc(saved.name || '') + '"></label>' +
          '<div class="f seg" role="radiogroup" aria-label="성별"><span>성별</span><label><input type="radio" name="gender" value="F"' + (g === 'F' ? ' checked' : '') + '><i>여</i></label><label><input type="radio" name="gender" value="M"' + (g === 'M' ? ' checked' : '') + '><i>남</i></label></div>' +
          '<div class="f seg" role="radiogroup" aria-label="달력"><span>달력</span><label><input type="radio" name="calendar" value="solar" checked><i>양력</i></label><label><input type="radio" name="calendar" value="lunar"><i>음력</i></label>' +
          '<label class="leap" hidden><input type="checkbox" name="leap"><i>윤달</i></label></div>' +
          '<div class="f row3"><span>생년월일</span><select name="year" aria-label="년">' + opts(minY, y, sy, '년') + '</select><select name="month" aria-label="월">' + opts(1, 12, sm, '월') + '</select><select name="day" aria-label="일">' + opts(1, 31, sd, '일') + '</select></div>' +
          '<div class="f"><span>태어난 시간</span><div class="inl"><input type="time" name="time" value="' + (saved.hourUnknown ? '' : esc(saved.hour != null ? ('0' + saved.hour).slice(-2) + ':' + ('0' + (saved.minute || 0)).slice(-2) : '')) + '" aria-label="태어난 시간"><label class="chk"><input type="checkbox" name="unknown"' + (saved.hourUnknown || saved.hour == null ? ' checked' : '') + '><i>시간을 몰라요</i></label></div></div>' +
          '<label class="f"><span>태어난 곳</span><select name="city">' + CITIES.map(function (c) { return '<option value="' + c[1] + '"' + (c[0] === (saved.city || '서울') ? ' selected' : '') + '>' + c[0] + '</option>'; }).join('') + '</select></label>' +
          '<p class="msg err" id="sajuMsg" role="alert"></p>' +
          '<button type="submit" class="btn big">' + esc(pick(b.ctaText)) + '</button>' +
          (b.hint ? '<p class="note">' + fmt(pick(b.hint)) + '</p>' : '') + '</form>';
      },
      mount: function (el) {
        var f = el.querySelector('form'); if (!f) return;
        var msg = el.querySelector('#sajuMsg');
        f.addEventListener('focusin', function () { track('saju_input_started', null, true); });
        function fix() { // 달력·시간 연동
          f.leap.parentElement.hidden = f.calendar.value !== 'lunar';
          f.time.disabled = f.unknown.checked;
        }
        f.addEventListener('change', fix); fix();
        f.addEventListener('submit', function (e) {
          e.preventDefault(); msg.textContent = '';
          if (!M()) { msg.textContent = '분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'; return; }
          var t = f.time.value, hasT = !f.unknown.checked && /^\d\d:\d\d$/.test(t);
          if (!f.gender.value) { msg.textContent = '성별을 선택해 주세요.'; return; }
          var inp = { year: +f.year.value, month: +f.month.value, day: +f.day.value, hour: hasT ? +t.slice(0, 2) : null, minute: hasT ? +t.slice(3) : 0, calendar: f.calendar.value, leap: f.calendar.value === 'lunar' && f.leap.checked, gender: f.gender.value, lon: +f.city.value, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
          var ch;
          try { ch = M().compute(inp); } catch (err) { msg.textContent = (err && err.message) || '입력을 확인해 주세요.'; return; }
          S.chart = ch; S.name = String(f.name.value || '').trim().slice(0, 20);
          track('saju_analysis_completed', { interest: S.interest || '', hour_known: hasT }); // 생년월일 등 개인정보는 보내지 않는다
          if (S.shared) track('shared_link_converted', { gender: inp.gender }, true); // 공유 링크로 들어온 사람이 입력을 마침
          // 새 20챕터 리포트(/report/v2/)로 이어가기: 입력값은 이 탭의 sessionStorage 로만 넘기고(서버 전송 없음) 이동한다. 설정이 꺼져 있거나 ?v2=0 이면 기존 화면을 그대로 쓴다.
          var v2 = C.settings && C.settings.v2;
          if (v2 && v2.handoff && !/[?&]v2=0\b/.test(location.search) && !PREVIEW && /^\/[\w\-./]*$/.test(v2.url || '/report/v2/')) {
            try { sessionStorage.setItem('mt_v2_input', JSON.stringify({ inp: inp, name: S.name, interest: S.interest || '' })); location.href = v2.url || '/report/v2/'; return; } catch (e) { /* 저장 불가면 기존 화면으로 */ }
          }
          loadClips().then(function () { paint('FreeResult'); });
          paint('FreeResult'); paint('FlowPreview'); paint('LockedContent'); paint('Paywall');
          gate(); scrollToId('freeResult'); Auto.continueAt('freeResult');
        });
      },
    },

    // 무료 결과: 실제 분석값(사주 네 기둥·일간·신강약·용신)만 보여 준다. 없는 값은 만들지 않는다.
    FreeResult: {
      render: function () {
        var ch = S.chart, m = M(); if (!ch || !m) return '';
        var R = C.result || {}, P = ch.pillars, d = P.day, el = m.EL_K[m.stemEl(d.s)], zone = (ch.strength && ch.strength.zone) || '';
        var nm = S.name;
        var zt = /강|왕/.test(zone) ? '신강' : /약/.test(zone) ? '신약' : '중화';
        var cell = function (k, lbl) { var p = P[k]; return '<div class="pl' + (k === 'day' ? ' me' : '') + '"><small>' + lbl + '</small><b>' + (p ? esc(m.gzName(p)) : '—') + '</b><span>' + (p ? esc(m.gzNameK(p)) : '시간 모름') + '</span></div>'; };
        var yong = ch.yong && ch.yong.applicable !== false && ch.yong.yong != null ? m.EL_K[ch.yong.yong] : '';
        var summary = esc(nm ? String(R.subject || '{name}님은').replace('{name}', nm) : (R.subjectNoName || '당신은')) + ' ' + esc(R.elementTrait && R.elementTrait[el] || '') + '입니다. ' + esc(R.zoneTrait && R.zoneTrait[zt] || '') + (yong ? ' 균형을 도와주는 기운은 <em>' + esc(yong) + '</em>입니다.' : '');
        var il = withInterest(R.interestLine);
        var pl = potentialLine(ch, R.potentialLine);
        var pct = (ch.weights && ch.weights.pct) || [], bars = m.EL_K.map(function (e, i) { var v = Math.round(pct[i] || 0); return '<div class="eb"><span>' + esc(e) + '</span><div class="eb-t"><i style="width:' + Math.max(2, Math.min(100, v * 2)) + '%;background:' + EL_COLORS[i] + '"></i></div><b>' + v + '%</b></div>'; }).join('');
        var balance = '<div class="eb-wrap" role="group" aria-label="오행 분포">' + bars + '</div>' + (pl ? '<p class="gd-pot">' + esc(pl) + '</p>' : '');
        return '<p class="kicker">FREE</p><h2 class="hl hl-l">' + esc(nm ? String(R.title || '{name}님의 기본 기질').replace('{name}', nm) : (R.titleNoName || '당신의 기본 기질')) + '</h2>' + balance +
          '<div class="pillars" aria-label="사주 네 기둥">' + cell('hour', '시주') + cell('day', '일주') + cell('month', '월주') + cell('year', '연주') + '</div>' +
          '<p class="me-line">나를 뜻하는 글자는 <b>' + esc(m.STEM_K[d.s]) + '(' + esc(m.STEM[d.s]) + ') · ' + esc(el) + '</b></p>' +
          '<p class="sum">' + summary + '</p>' + resultMedia(R, ch) +
          (il ? '<p class="note ctr">' + esc(il) + '</p>' : '') + (R.flowHint ? '<p class="body emph">' + fmt(R.flowHint) + '</p>' : '');
      },
    },

    // 운 흐름 미리보기: 만세력 앱 "월운 흐름" 그래프와 같은 계산(Manse.wolun)·같은 읽는 법.
    //   막대 높이 = 흐름 적합도(위로 길수록 유리, 아래로 내려가면 조심) · 색 = 주 흐름(기회·확장·수확·축적) · 변/방 = 변동·방어 신호
    FlowPreview: {
      render: function () {
        var ch = S.chart, m = M(); if (!ch || !m) return '';
        var F = C.flow || {}, now = Date.now(), Y, list, seun;
        try {
          Y = m.yearPillarAt(now).sajuYear; list = m.wolun(ch, Y); seun = m.seunRange(ch, Y, Y)[0];
        } catch (e) { return '<p class="note ctr">운 흐름을 불러오지 못했습니다.</p>'; }
        var cur = 0; list.forEach(function (x, i) { if (x.startMs <= now) cur = i; });
        var COL = { opportunity: '#1E9E57', expansion: '#0E9AA7', harvest: '#8A5CF6', accumulation: '#2F6BFF' };
        var DESC = F.flowDesc || {};
        var rows = list.map(function (x) {
          var f = x.ev.flow, fs0 = m.flowSummary(x.ev), k0 = fs0.indexOf('다. ');
          return { mo: new Date(x.startMs + 9 * 3600e3).getUTCMonth() + 1, fit: +x.ev.fitScore || 0, key: f.primaryFlow, name: m.flowName(f.primaryFlow), cond: f.condition.name,
            vol: !!f.overlays.volatility.active, def: !!f.overlays.defense.active, sum: k0 > 0 ? fs0.slice(0, k0 + 2) : fs0 };
        });
        var top = Math.max(50, Math.max.apply(null, rows.map(function (r) { return Math.abs(r.fit); })));
        var cols = rows.map(function (r, i) {
          var v = Math.max(-1, Math.min(1, r.fit / top)), h = Math.max(3, Math.abs(v) * 50);
          return '<button type="button" class="fc-col' + (i === cur ? ' now sel' : '') + '" data-i="' + i + '" style="--c:' + COL[r.key] + '" aria-label="' + r.mo + '월 ' + esc(r.name) + ' ' + esc(r.cond) + '">' +
            '<span class="fc-area">' + (r.vol || r.def ? '<u class="fc-ov" style="' + (v >= 0 ? 'bottom:calc(50% + ' + h + '% + 2px)' : 'top:calc(50% + ' + h + '% + 2px)') + '">' + (r.vol ? '변' : '') + (r.def ? '방' : '') + '</u>' : '') +
            '<b class="fc-bar' + (r.cond === '주의' || r.cond === '부담' ? ' warn' : '') + '" style="' + (v >= 0 ? 'bottom:50%' : 'top:50%') + ';height:' + h + '%"></b></span>' +
            '<em>' + r.mo + '월</em><small style="color:' + COL[r.key] + '">' + esc(r.name) + '</small>' + (i === cur ? '<i class="fc-now">' + esc(F.nowLabel || '지금') + '</i>' : '') + '</button>';
        }).join('');
        var legend = Object.keys(COL).map(function (k) { return '<span><i style="background:' + COL[k] + '"></i><b>' + esc(m.flowName(k)) + '</b>' + (DESC[k] ? ' <small>' + esc(DESC[k]) + '</small>' : '') + '</span>'; }).join('');
        FlowPreview.rows = rows; FlowPreview.desc = DESC;
        return '<p class="kicker">' + Y + '</p><h2 class="hl hl-l">' + fmt(F.title || '') + '</h2><p class="sub">' + fmt(F.lead || '') + '</p>' +
          '<p class="year-line">올해의 큰 흐름 <b>' + esc(m.flowLabel(seun.ev)) + '</b></p>' +
          '<div class="fc" role="group" aria-label="월별 운 흐름 그래프"><span class="fc-y t">' + esc(F.axisUp || '유리') + '</span><span class="fc-y b">' + esc(F.axisDown || '조심') + '</span><div class="fc-plot">' + cols + '</div></div>' +
          '<div class="fc-legend">' + legend + '</div>' +
          '<div class="fc-detail" id="fcDetail" aria-live="polite">' + FlowPreview.detail(cur) + '</div>' +
          (F.lockedNote ? '<p class="note ctr">🔒 ' + esc(F.lockedNote) + '</p>' : '');
      },
      detail: function (i) {
        var r = (FlowPreview.rows || [])[i]; if (!r) return '';
        var d = (FlowPreview.desc || {})[r.key];
        return '<b>' + r.mo + '월~ · ' + esc(r.name) + ' · ' + esc(r.cond) + '</b>' + (d ? '<span class="d">' + esc(d) + '</span>' : '') +
          (r.vol ? '<span class="d">변화가 크게 일어나기 쉬운 달이에요.</span>' : '') + (r.def ? '<span class="d">무리하지 말고 방어에 신경 쓸 달이에요.</span>' : '') + '<small>' + esc(r.sum) + '</small>';
      },
      mount: function (el) {
        var plot = el.querySelector('.fc-plot'); if (!plot) return;
        plot.addEventListener('click', function (e) {
          var c = e.target.closest && e.target.closest('.fc-col'); if (!c) return;
          plot.querySelectorAll('.fc-col.sel').forEach(function (x) { x.classList.remove('sel'); }); c.classList.add('sel');
          el.querySelector('#fcDetail').innerHTML = FlowPreview.detail(+c.getAttribute('data-i'));
        });
      },
    },

    LockedContent: {
      render: function () {
        var L = C.locked || {}, intr = S.interest;
        function row(it, locked, icon) {
          return '<li class="' + (locked ? 'lk' : 'ok') + '"><span class="ic" aria-hidden="true">' + icon + '</span><div><b>' + esc(it.label) + '</b>' + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + (locked && it.key && it.key === intr ? '<mark>' + esc(L.pickedBadge || '') + '</mark>' : '') + '</div></li>' +
            (it.image ? '<li class="img-li">' + pic(it.image, { ar: '16/9' }) + '</li>' : '');
        }
        return '<h2 class="hl hl-l">' + fmt(L.title || '') + '</h2><ul class="lst">' + (L.free || []).map(function (i) { return row(i, false, '✓'); }).join('') + (L.locked || []).map(function (i) { return row(i, true, '🔒'); }).join('') + '</ul>';
      },
    },

    // 구매: 결제 시스템이 아직 없어 기본은 출시 알림(/api/waitlist). settings.purchase.mode='link' + href 를 채우면 그 주소(결제 페이지)로 이동.
    Paywall: {
      render: function (b) {
        var P = C.purchase || {}, price = (C.settings && C.settings.priceText) || '', il = withInterest(P.interestLine);
        return '<div class="pay"><h2 class="hl hl-m">' + fmt(P.title || '') + '</h2><ul class="inc">' + (P.includes || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
          (il ? '<p class="note ctr">' + esc(il) + '</p>' : '') + (price ? '<p class="price">' + esc(price) + '</p>' : '') +
          '<button type="button" class="btn big" id="buyBtn">' + esc(pick(b.ctaText)) + '</button>' +
          '<form class="wl" id="wlForm" hidden novalidate><h3 class="tt">' + esc(P.waitlistTitle || '') + '</h3><p class="body">' + esc(P.waitlistText || '') + '</p>' +
          '<div class="inl"><input type="email" name="email" placeholder="이메일 주소" autocomplete="email" aria-label="이메일 주소"><button type="submit" class="btn">알림 받기</button></div>' +
          '<label class="chk"><input type="checkbox" name="consent"><i>' + esc(P.consent || '') + '</i></label><input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<p class="msg" id="wlMsg" role="status"></p></form></div>';
      },
      mount: function (el) {
        var btn = el.querySelector('#buyBtn'), f = el.querySelector('#wlForm'); if (!btn) return;
        var cfg = (C.settings && C.settings.purchase) || {};
        btn.addEventListener('click', function () {
          track('purchase_clicked', { interest: S.interest || '', mode: cfg.mode });
          if (cfg.mode === 'link' && /^(\/|https:\/\/)/.test(cfg.href || '')) { location.href = cfg.href; return; }
          f.hidden = false; btn.hidden = true; f.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' });
        });
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var msg = f.querySelector('#wlMsg'), email = f.email.value.trim(), sb = f.querySelector('button[type=submit]');
          var say = function (t, c) { msg.textContent = t; msg.className = 'msg ' + (c || ''); };
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return say('이메일 형식을 확인해 주세요', 'err');
          if (!f.consent.checked) return say('개인정보 수집·이용에 동의해 주세요', 'err');
          sb.disabled = true; say('신청 중입니다…');
          fetch('/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email, consent: true, website: f.website.value }) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (res) { if (res.ok) { say((C.purchase && C.purchase.done) || '신청되었습니다.', 'ok'); f.reset(); } else say(res.d.error || '신청에 실패했습니다. 잠시 후 다시 시도해 주세요', 'err'); })
            .catch(function () { say('네트워크 오류입니다. 잠시 후 다시 시도해 주세요', 'err'); })
            .then(function () { sb.disabled = false; });
        });
      },
    },
  };

  FlowPreview = COMPONENTS.FlowPreview;

  // ───────── 렌더링 ─────────
  var SPACE = { small: 'sp-s', medium: 'sp-m', large: 'sp-l', viewport: 'sp-v' };
  function wrap(b, i) {
    var anim = b.anim === 'lines' ? 'fade' : (/^(fade|fade-up|scale|reveal|none)$/.test(b.anim) ? b.anim : 'fade-up');
    var cls = ['blk', b.hide ? 'is-hidden' : '', 't-' + b.type, 'a-' + anim, b.align === 'left' ? 'al-l' : '', b.fullscreen ? 'fs' : '', b.type === 'spacer' ? (SPACE[b.size] || 'sp-m') : '', b.requires ? 'gated' : ''];
    if (b.anim === 'lines') cls.push('lines');
    var inner = BLOCKS[b.type] ? BLOCKS[b.type](b) : '';
    return '<section class="' + cls.filter(Boolean).join(' ') + '" data-i="' + i + '"' + (b.id ? ' id="' + esc(b.id) + '" data-id="' + esc(b.id) + '"' : '') + (b.requires ? ' data-req="' + esc(b.requires) + '" hidden' : '') +
      (b.track ? ' data-track="' + esc(b.track) + '"' : '') + (b.type === 'component' ? ' data-comp="' + esc(b.name) + '"' : '') + (b.type === 'spacer' ? ' aria-hidden="true"' : '') + '><div class="in-w">' + inner + '</div></section>';
  }
  function build(host) {
    var pairs = [];
    (C.blocks || []).forEach(function (b, i) {
      if (!b || !BLOCKS[b.type]) return;
      if (!PREVIEW && (b.hide || ((b.type === 'image' || b.type === 'fullImage' || b.type === 'video') && hideEmpty(b)))) return;
      pairs.push([b, i]);
    });
    host.innerHTML = pairs.map(function (p) { return wrap(p[0], p[1]); }).join('');
    pairs.forEach(function (p, k) { host.children[k]._b = p[0]; });
  }
  // 컴포넌트 다시 그리기 (분석 결과가 생긴 뒤)
  function paint(name) {
    var el = document.querySelector('[data-comp="' + name + '"]'); if (!el) return;
    var b = el._b; el.firstChild.innerHTML = BLOCKS.component(b); mountComp(el); observeAll(el);
  }
  function mountComp(el) { var c = COMPONENTS[el.getAttribute('data-comp')]; if (c && c.mount) c.mount(el); }

  // 열림 조건(requires) 반영
  function gate() {
    document.querySelectorAll('[data-req]').forEach(function (el) {
      var r = el.getAttribute('data-req'), ok = r === 'chart' ? !!S.chart : r === 'flowOpen' ? !!(S.chart && S.flowOpen) : true;
      el.hidden = !ok;
    });
  }
  function scrollToId(id) {
    var el = document.getElementById(id); if (!el || el.hidden) return;
    setTimeout(function () { el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' }); }, 60);
  }

  // ───────── 상호작용 ─────────
  function doAction(a, btn) {
    a = String(a || '');
    if (a.indexOf('scroll:') === 0) scrollToId(a.slice(7));
    else if (a.indexOf('href:') === 0) { var h = a.slice(5); if (/^(\/|https:\/\/)/.test(h)) location.href = h; }
    else if (a === 'auto:start') Auto.begin();
    else if (a === 'flow:open') {
      if (!S.chart) { scrollToId('sajuInput'); return; }
      S.flowOpen = true; gate(); paint('FlowPreview'); paint('LockedContent'); paint('Paywall'); // 관심사 반영을 위해 다시 그린다
      var host = btn && btn.closest('.blk'); if (host && host._b && host._b.hideAfterAction) host.hidden = true;
      scrollToId('flowPreview'); Auto.continueAt('flowPreview');
    } else if (a === 'purchase') { scrollToId('purchase'); }
  }
  function bind(host) {
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-action]'); if (b) { doAction(b.getAttribute('data-action'), b); return; }
      var c = e.target.closest && e.target.closest('[data-interest]');
      if (c) {
        S.interest = c.getAttribute('data-interest');
        host.querySelectorAll('[data-interest]').forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        track('interest_selected', { interest: S.interest });
        if (S.chart) { paint('FreeResult'); paint('LockedContent'); paint('Paywall'); } // 이미 분석했다면 문구만 갱신
        else setTimeout(function () { scrollToId('sajuInput'); }, 650);
      }
    });
    // 이미지 불러오기 실패 → 깨진 아이콘 대신 자리표시
    host.addEventListener('error', function (e) {
      var t = e.target; if (!t || t.tagName !== 'IMG' || !t.classList.contains('sImg')) return;
      var pc = t.closest('.pic'); if (pc) pc.innerHTML = placeholder(t.getAttribute('data-todo'), t.alt, 'position:absolute;inset:0');
    }, true);
  }

  // ───────── 스크롤 관찰 (등장 효과 · 영상 지연 로딩 · 고정 이미지 단계 · 조회 이벤트) ─────────
  var io, vio, sio, bio, seenBlk = {};
  function observeAll(scope) {
    scope = scope || document;
    if (!io) return;
    scope.querySelectorAll('.blk:not(.in)').forEach(function (el) { io.observe(el); });
    (scope.matches && scope.matches('.blk:not(.in)') ? [scope] : []).forEach(function (el) { io.observe(el); });
    scope.querySelectorAll('video[data-src]').forEach(function (v) { vio.observe(v); });
    if (bio) { scope.querySelectorAll('.blk').forEach(function (el) { bio.observe(el); }); if (scope.matches && scope.matches('.blk')) bio.observe(scope); }
    scope.querySelectorAll('.ss-s').forEach(function (s) { sio.observe(s); });
  }
  function setupObservers() {
    if (!('IntersectionObserver' in root) || REDUCE) { document.querySelectorAll('.blk').forEach(function (el) { el.classList.add('in'); }); }
    if (!('IntersectionObserver' in root)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in'); io.unobserve(e.target);
        var t = e.target.getAttribute('data-track'); if (t) track(t, null, true);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    bio = new IntersectionObserver(function (es) { // 블록이 화면에 들어올 때마다 1회: 어느 블록에서 이탈하는지 본다(index·type 만, 개인정보 없음)
      es.forEach(function (e) {
        var el = e.target, i = el.getAttribute('data-i'); if (!e.isIntersecting || seenBlk[i]) return;
        if (e.intersectionRatio < 0.35 && e.intersectionRect.height < root.innerHeight * 0.4) return; // 아주 긴 블록은 화면의 40% 이상 보일 때
        seenBlk[i] = 1; bio.unobserve(el);
        var m = /(?:^|\s)t-(\w+)/.exec(el.className), type = m ? m[1] : ''; if (type === 'spacer' || type === 'divider') return;
        if (type === 'component') type = 'component:' + (el.getAttribute('data-comp') || '');
        if (!PREVIEW) track('onboarding_block_viewed', { index: +i, type: type });
      });
    }, { threshold: [0.1, 0.35, 0.6] });
    vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) { v.src = v.getAttribute('data-src'); v.preload = 'metadata'; }
          if (v.getAttribute('data-auto') === '1') { var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = true; }); }
        } else if (v.src) v.pause();
      });
    }, { rootMargin: '300px 0px', threshold: 0.25 });
    sio = new IntersectionObserver(function (es) { // 화면 가운데에 온 단계의 그림을 고정 영역에 보여 준다
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var ss = e.target.closest('.ss'), i = e.target.getAttribute('data-i');
        ss.querySelectorAll('.ss-m').forEach(function (m) { m.classList.toggle('on', m.getAttribute('data-i') === i); });
        ss.querySelectorAll('.ss-s').forEach(function (m) { m.classList.toggle('cur', m === e.target); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    if (REDUCE) { document.querySelectorAll('.blk').forEach(function (el) { el.classList.add('in'); }); }
    observeAll(document);
  }

  // 위쪽 진행선 + 헤더
  function chrome() {
    var bar = document.getElementById('prog'), tick = false;
    if (!bar) return;
    root.addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { var h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')'; tick = false; });
    }, { passive: true });
  }
  // 인트로 커버 (스토리 맨 앞 한 화면). 관리자 settings.cover 로 이미지·문구·표시 여부를 바꾼다.
  // 배경·캐릭터: 화면에 고정된 층. 맨 처음에만 보이고 스크롤하면 서서히 사라진다.
  // 캐릭터는 여러 장: x=가로 가운데(화면 너비의 %), y=아래 여백(화면 높이의 %), size=높이(화면 높이의 %).
  // 관리자 미리보기(?preview=1)에서는 끌어서 옮기고, 오른쪽 위 네모를 끌어 크기를 바꾼다.
  var fxEl = null, fxFr = null, fxOn = false, fxSel = -1; // fxEl: 등불·글자 뒤 층 / fxFr: 등불·글자 앞 층
  function fxMake(id, z) { var e = document.createElement('div'); e.id = id; e.setAttribute('aria-hidden', 'true'); e.style.zIndex = z; return e; }
  function fxList(cv) { return (Array.isArray(cv.chars) ? cv.chars : []).map(function (c, i) { return { c: c || {}, i: i, url: media((c || {}).src) }; }).filter(function (o) { return o.url; }); }
  function fxImg(i) { return document.querySelector('.fx-ch[data-ci="' + i + '"]'); }
  function fxMob() { return root.innerWidth <= 700; } // 모바일 배치 기준 (CSS 의 700px 와 같음)
  function fxKeys(c) { return fxMob() && c.mobile ? ['mx', 'my', 'msize'] : ['x', 'y', 'size']; }
  function fxPlace(img, c) {
    var s = img.style, k = fxKeys(c);
    s.display = fxMob() && c.mhide ? 'none' : '';
    s.left = num(c[k[0]], num(c.x, 75)) + '%'; s.bottom = num(c[k[1]], num(c.y, 0)) + '%'; s.height = Math.max(3, num(c[k[2]], num(c.size, 60))) + 'svh';
    s.opacity = Math.min(1, Math.max(0, num(c.opacity, 1)));
    s.setProperty('--fl', c.flip ? -1 : 1);
    s.setProperty('--fa', Math.max(0, num(c.floatRange, 12)) + 'px'); s.setProperty('--fs', Math.max(1, num(c.floatSpeed, 7)) + 's'); s.setProperty('--ft', Math.max(0, num(c.tilt, 0.8)) + 'deg');
    s.animationDelay = '-' + ((img.getAttribute('data-ci') * 1.7) % 7) + 's';
    img.classList.toggle('fl', !!c.float);
  }
  function fxHandle() {
    var hd = fxFr && fxFr.querySelector('.fx-hd'); if (!hd) return;
    var img = fxSel >= 0 && fxImg(fxSel);
    if (!img) { hd.hidden = true; return; }
    var r = img.getBoundingClientRect(); hd.hidden = false; hd.style.left = (r.right - 7) + 'px'; hd.style.top = (r.top - 7) + 'px';
    document.querySelectorAll('.fx-ch').forEach(function (x) { x.classList.toggle('sel', x === img); });
  }
  function fxEdit(el) {
    if (el._edit) return; el._edit = true; el.classList.add('edit');
    var st = null;
    el.addEventListener('pointerdown', function (e) {
      var t = e.target, img = t.closest && t.closest('.fx-ch'), hd = t.closest && t.closest('.fx-hd');
      if (!img && !hd) return;
      var i = hd ? fxSel : +img.getAttribute('data-ci'), c = ((C.settings.cover || {}).chars || [])[i]; if (!c) return;
      fxSel = i; fxHandle();
      if (fxMob() && !c.mobile) { c.mobile = true; c.mx = num(c.x, 75); c.my = num(c.y, 0); c.msize = num(c.size, 60); } // 모바일 화면에서 만지면 모바일 따로 설정
      var k = fxKeys(c);
      st = { mode: hd ? 'size' : 'move', x: e.clientX, y: e.clientY, cx: num(c[k[0]], 75), cy: num(c[k[1]], 0), cs: num(c[k[2]], 60), c: c, i: i, k: k, m: fxMob() };
      try { t.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!st) return; var dx = (e.clientX - st.x) / root.innerWidth * 100, dy = (e.clientY - st.y) / root.innerHeight * 100;
      if (st.mode === 'move') { st.c[st.k[0]] = Math.round((st.cx + dx) * 10) / 10; st.c[st.k[1]] = Math.round((st.cy - dy) * 10) / 10; }
      else st.c[st.k[2]] = Math.max(3, Math.round((st.cs - dy) * 10) / 10);
      var img = fxImg(st.i); if (img) fxPlace(img, st.c); fxHandle();
    });
    function end() { if (!st) return; var c = st.c, i = st.i, st0 = st; st = null; try { parent.postMessage({ t: 'st-char', i: i, m: st0.m, x: c[st0.k[0]], y: c[st0.k[1]], size: c[st0.k[2]] }, location.origin); } catch (er) { } }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  function coverFx(cv) {
    var on = cv && cv.show !== false, bg = on ? media(cv.bgSrc) : '', list = on ? fxList(cv) : [];
    if (!bg && !list.length) { if (fxEl) { fxEl.hidden = true; fxFr.hidden = true; } fxOn = false; return; }
    if (!fxEl) {
      fxEl = fxMake('coverFx', 0); fxFr = fxMake('coverFxF', 2);
      document.body.insertBefore(fxEl, document.body.firstChild); document.body.appendChild(fxFr);
      if (PREVIEW) { fxEdit(fxEl); fxEdit(fxFr); document.addEventListener('pointerdown', function (e) { if (!e.target.closest || !e.target.closest('.fx-ch, .fx-hd')) { fxSel = -1; fxHandle(); } }); }
    }
    fxEl.hidden = fxFr.hidden = false;
    function tag(o) { return '<img class="fx-ch" data-ci="' + o.i + '" src="' + esc(o.url) + '" alt="" decoding="async" draggable="false">'; }
    fxEl.innerHTML = (bg ? '<div class="fx-bg" style="background-image:url(&quot;' + esc(bg) + '&quot;);opacity:' + Math.min(1, Math.max(0, num(cv.bgOpacity, 0.6))) + '"></div>' : '') + list.filter(function (o) { return !o.c.front; }).map(tag).join('');
    fxFr.innerHTML = list.filter(function (o) { return o.c.front; }).map(tag).join('') + (PREVIEW ? '<i class="fx-hd" hidden></i>' : '');
    list.forEach(function (o) { var img = fxImg(o.i); fxPlace(img, o.c); img.onload = fxHandle; });
    if (PREVIEW) fxHandle();
    fxOn = true; fxScroll();
    if (!coverFx.bound) { coverFx.bound = true; root.addEventListener('scroll', fxScroll, { passive: true }); root.addEventListener('resize', function () { fxScroll(); var cs = (C.settings.cover || {}).chars || []; document.querySelectorAll('.fx-ch').forEach(function (img) { var c = cs[+img.getAttribute('data-ci')]; if (c) fxPlace(img, c); }); fxHandle(); }); }
  }
  function fxScroll() {
    if (!fxEl || !fxOn) return;
    var o = Math.max(0, 1 - root.scrollY / (root.innerHeight * 0.75));
    [fxEl, fxFr].forEach(function (e) { e.style.opacity = o; e.style.visibility = o <= 0 ? 'hidden' : 'visible'; }); fxHandle();
  }
  // 커버 글(브랜드명·서브 카피·버튼)은 PC/모바일 값이 따로 있다. 모바일 값(이름 끝에 M)이 비어 있으면 PC 값을 쓴다.
  var CVN = { title: 't', sub: 's', button: 'b' }, ALIGN3 = { left: 'flex-start', center: 'center', right: 'flex-end' };
  function pv(cv, k) { var m = cv[k + 'M']; return fxMob() && m != null && m !== '' ? m : cv[k]; }
  function coverStyle(cv) {
    var SF = root.StoryFonts;
    function fnt(k) { if (k === 'sans') return 'var(--f-sans)'; if (k === 'serif') return 'var(--f-serif)'; var f = SF && SF.css(k); if (f) { SF.ensure(k); return f; } return ''; }
    function hex(v, d) { return /^#[0-9a-f]{3,8}$/i.test(String(v || '').trim()) ? String(v).trim() : d; }
    function px(v, d) { v = +v; return (isFinite(v) && v > 0 ? v : d) + 'px'; }
    function wt(v, d) { return /^[1-9]00$/.test(String(v)) ? String(v) : d; }
    function nm(v, d, lo, hi) { v = v === '' || v == null ? NaN : +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
    function al(n) { var v = pv(cv, n + 'Align'); return ALIGN3[v] ? v : 'center'; }
    var o = ['--cv-tf:' + (fnt(cv.titleFont) || 'var(--f-serif)'), '--cv-tw:' + wt(cv.titleWeight, '400'), '--cv-ts:' + px(pv(cv, 'titleSize'), 17), '--cv-tl:' + nm(cv.titleSpacing, 4, -5, 40) + 'px', '--cv-th:' + nm(cv.titleLine, 1.45, 0.8, 3),
      '--cv-tc:' + hex(cv.titleColor, '#E9E4D8'), '--cv-sc:' + hex(cv.subColor, '#7C786C'), '--cv-as:' + nm(cv.textAnimSpeed, 6, 1, 30) + 's',
      '--cv-sf:' + (fnt(cv.subFont) || 'var(--f-sans)'), '--cv-ss:' + px(pv(cv, 'subSize'), 14), '--cv-sw:' + wt(cv.subWeight, '400'), '--cv-sl:' + nm(cv.subSpacing, 0.6, -5, 40) + 'px', '--cv-sh:' + nm(cv.subLine, 1.8, 0.8, 3),
      '--cv-bf:' + (fnt(cv.buttonFont) || 'var(--f-sans)'), '--cv-bs:' + px(pv(cv, 'buttonSize'), 15), '--cv-bwt:' + wt(cv.buttonWeight, '400'), '--cv-bl:' + nm(cv.buttonSpacing, 4.5, -5, 40) + 'px', '--cv-bc:' + hex(cv.buttonColor, '#CDB27A'),
      '--cv-pt:' + Math.max(0, num(pv(cv, 'coverTop'), 0)) + 'svh', '--cv-pb:' + Math.max(0, num(pv(cv, 'coverBottom'), 0)) + 'svh'];
    Object.keys(CVN).forEach(function (n) { var c = CVN[n], a = al(n); o.push('--cv-' + c + 'x:' + num(pv(cv, n + 'X'), 0) + 'vw', '--cv-' + c + 'y:' + num(pv(cv, n + 'Y'), 0) + 'svh', '--cv-' + c + 'a:' + ALIGN3[a], '--cv-' + c + 'tx:' + a); });
    return o.join(';');
  }
  function coverEdit(el) { // 관리자 미리보기: 글·버튼을 끌어 옮긴다 (PC 화면이면 PC 값, 모바일 화면이면 모바일 값)
    if (el._edit) return; el._edit = true; var st = null;
    el.addEventListener('pointerdown', function (e) {
      var t = e.target.closest && e.target.closest('.cv-t, .cv-s, .cv-bw'); el.querySelectorAll('.cv-sel').forEach(function (x) { x.classList.remove('cv-sel'); });
      if (!t) { try { parent.postMessage({ t: 'st-tsel', n: null }, location.origin); } catch (er) { } return; } t.classList.add('cv-sel');
      var n = t.classList.contains('cv-t') ? 'title' : t.classList.contains('cv-s') ? 'sub' : 'button', cv = C.settings.cover, m = fxMob(), sx = m ? 'M' : '';
      if (m) ['X', 'Y'].forEach(function (k) { if (cv[n + k + 'M'] == null || cv[n + k + 'M'] === '') cv[n + k + 'M'] = num(cv[n + k], 0); });
      st = { n: n, m: m, kx: n + 'X' + sx, ky: n + 'Y' + sx, x: e.clientX, y: e.clientY, cx: num(cv[n + 'X' + sx], 0), cy: num(cv[n + 'Y' + sx], 0), cv: cv };
      try { parent.postMessage({ t: 'st-tsel', n: n, m: m }, location.origin); } catch (er) { } try { t.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!st) return; st.cv[st.kx] = Math.round((st.cx + (e.clientX - st.x) / root.innerWidth * 100) * 10) / 10; st.cv[st.ky] = Math.round((st.cy + (e.clientY - st.y) / root.innerHeight * 100) * 10) / 10;
      el.setAttribute('style', coverStyle(st.cv));
    });
    function end() { if (!st) return; var s = st; st = null; try { parent.postMessage({ t: 'st-text', n: s.n, m: s.m, x: s.cv[s.kx], y: s.cv[s.ky] }, location.origin); } catch (er) { } }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  // 글자를 "단어(줄바꿈 안 되는 묶음) > 글자" span 으로 나눠 하나씩 나타나게 한다. <br>·<em> 같은 태그 구조는 유지한다.
  function splitLetters(box) {
    var idx = 0, w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var frag = document.createDocumentFragment();
      String(t.nodeValue).split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var word = document.createElement('span'); word.className = 'w';
        part.split('').forEach(function (ch) { var s = document.createElement('span'); s.className = 'lt'; s.style.setProperty('--i', idx++); s.textContent = ch; word.appendChild(s); });
        frag.appendChild(word);
      });
      t.parentNode.replaceChild(frag, t);
    });
  }
  function cover() {
    var el = document.getElementById('cover'); if (!el) return;
    var cv = (C.settings && C.settings.cover) || {};
    coverFx(cv);
    if (!cv || cv.show === false) { el.hidden = true; el.innerHTML = ''; return; }
    var url = media(cv.src), alt = pick(cv.alt) || '';
    var img = url ? '<img class="cv-img" src="' + esc(url) + '" alt="' + esc(alt) + '" decoding="async" fetchpriority="high">' : '<div class="cv-glow" role="img" aria-label="' + esc(alt) + '"></div>';
    function an(v) { return /^(float|glow|both|pulse|sway|shimmer)$/.test(v) ? ' an-' + v : ''; }
    // 등장 효과: 안쪽 span(.cv-ti)에 걸어 바깥의 지속 효과(float·glow 등)와 겹치지 않게 한다
    function inner(n, html) {
      var k = cv[n + 'In'], ok = /^(fade|rise|drop|blur|zoom|wipe|letters)$/.test(k);
      var d = Math.min(6, Math.max(0.2, num(cv[n + 'InSpeed'], 0.9))), l = Math.min(10, Math.max(0, num(cv[n + 'InDelay'], n === 'title' ? 0.2 : n === 'sub' ? 0.5 : 0.8)));
      return '<span class="cv-ti' + (ok ? ' in-' + k : '') + '" style="--ci-d:' + d + 's;--ci-l:' + l + 's">' + html + '</span>';
    }
    el.setAttribute('style', coverStyle(cv));
    el.hidden = false;
    el.innerHTML = '<div class="cv-in"><div class="cv-lamp">' + img + '</div>' +
      (cv.title ? '<h1 class="cv-t' + an(cv.titleAnim) + '">' + inner('title', fmt(pick(cv.title))) + '</h1>' : '') + (cv.sub ? '<p class="cv-s' + an(cv.subAnim) + '">' + inner('sub', fmt(pick(cv.sub))) + '</p>' : '') +
      (cv.button ? '<div class="cv-bw"><button type="button" class="cv-btn" data-cover="go">' + inner('button', esc(pick(cv.button))) + '</button><span class="cv-arr" aria-hidden="true">↓</span></div>' : '') + '</div>';
    el.querySelectorAll('.cv-ti.in-letters').forEach(splitLetters);
    var i2 = el.querySelector('.cv-img'); if (i2) i2.onerror = function () { i2.outerHTML = '<div class="cv-glow"></div>'; };
    var go = el.querySelector('[data-cover]');
    if (go) go.onclick = function () {
      if (PREVIEW) return; // 미리보기에서는 끌어서 옮기는 용도
      track('cover_enter', null, true);
      Auto.begin(); // 첫 스토리 블록부터 자동으로 내려간다 (이미 시작했다면 이어서)
    };
    if (PREVIEW) coverEdit(el);
    if (!cover.bound) { cover.bound = true; root.addEventListener('resize', function () { var c = (C.settings && C.settings.cover) || {}; if (!el.hidden) el.setAttribute('style', coverStyle(c)); }); }
  }
  function meta() { // 이름·탭 제목·공유 설명
    var S1 = C.settings || {}, skip = document.getElementById('skipLink'), bn = document.getElementById('brandName');
    cover();
    if (bn) bn.innerHTML = esc(S1.brandName || '').split(String.fromCharCode(10)).join('<br>');
    if (root.Ambient) root.Ambient.apply(S1.ambient);
    if (skip) { var sl = S1.skipLink || {}; skip.textContent = sl.text || ''; skip.hidden = !sl.text; skip.onclick = function () { scrollToId(sl.target || 'sajuInput'); }; }
    if (S1.pageTitle) { document.title = S1.pageTitle; var t = document.querySelector('meta[property="og:title"]'); if (t) t.setAttribute('content', S1.pageTitle); }
    if (S1.pageDesc) { ['meta[name=description]', 'meta[property="og:description"]'].forEach(function (q) { var m = document.querySelector(q); if (m) m.setAttribute('content', S1.pageDesc); }); }
  }

  // ───────── 콘텐츠 점검 (개발·테스트용) ─────────
  // 알려지지 않은 type, alt 없는 이미지, 존재하지 않는 id 참조 등을 찾아 문자열 목록으로 돌려준다.
  function validate(content) {
    var c = content || C, out = [], ids = {}, blocks = c.blocks || [];
    var okAnim = /^(fade|fade-up|scale|reveal|lines|none)$/;
    blocks.forEach(function (b, i) { if (b && b.id) { if (ids[b.id]) out.push('#' + i + ': id 중복 "' + b.id + '"'); ids[b.id] = 1; } });
    blocks.forEach(function (b, i) {
      var w = '#' + i + ' (' + (b && b.type) + '): ';
      if (!b || !BLOCKS[b.type]) { out.push(w + '알 수 없는 type'); return; }
      if (b.anim && !okAnim.test(b.anim)) out.push(w + '알 수 없는 anim "' + b.anim + '"');
      if (b.requires && !/^(chart|flowOpen)$/.test(b.requires)) out.push(w + '알 수 없는 requires "' + b.requires + '"');
      if ((/^(image|fullImage)$/.test(b.type) || (b.type === 'imageText' && b.mediaType !== 'video') || (b.type === 'compare' && b.src)) && !b.alt) out.push(w + 'alt 없음');
      if (b.type === 'video' && b.src && !b.poster) out.push(w + 'poster 없음(권장)');
      if (b.type === 'gallery') { var n = (b.items || []).length; if (n < 2 || n > 4) out.push(w + '이미지는 2~4장'); (b.items || []).forEach(function (it, j) { if (!it.alt) out.push(w + 'items[' + j + '] alt 없음'); }); }
      if (b.type === 'stickySteps') (b.steps || []).forEach(function (s, j) { if (!s.alt) out.push(w + 'steps[' + j + '] alt 없음'); });
      if (b.type === 'component' && !COMPONENTS[b.name]) out.push(w + '알 수 없는 component "' + b.name + '"');
      if (b.type === 'cta') {
        var a = String(b.action || '');
        if (!/^(scroll:.+|href:.+|flow:open|purchase|auto:start)$/.test(a)) out.push(w + '알 수 없는 action "' + a + '"');
        if (a.indexOf('scroll:') === 0 && !ids[a.slice(7)]) out.push(w + 'scroll 대상 id 없음 "' + a.slice(7) + '"');
      }
      ['src', 'srcMobile', 'poster'].forEach(function (k) { if (b[k] && !media(b[k])) out.push(w + k + ' 주소 형식 오류'); });
    });
    ['sajuInput', 'freeResult', 'flowPreview', 'locked', 'purchase', 'interest'].forEach(function (id) { if (!ids[id]) out.push('필수 블록 id 없음: ' + id); });
    return out;
  }

  // ───────── 자동 스크롤 ─────────
  // 첫 화면의 시작 버튼(action 'auto:start')을 누르면 블록을 차례로 내려간다. 글 길이만큼 머문 뒤 다음으로 간다. 사주 입력·관심사 선택·버튼처럼 사용자가 해야 하는 곳에서는 멈추고,
  // 분석을 마치거나 "올해의 흐름 확인"을 누르면 이어서 내려간다. 화면을 만지거나 휠·키를 쓰면 즉시 멈춘다.
  var Auto = (function () {
    var started = false, wanted = false, running = false, finished = false, token = 0, cancelAnim = null;
    function btn() { return document.getElementById('autoBtn'); }
    function ui() {
      var b = btn(); if (!b) return;
      b.hidden = !started || (finished && !running);
      b.textContent = running ? '⏸ 멈추기' : '▶ 이어서 보기'; b.setAttribute('aria-label', running ? '자동 스크롤 멈추기' : '자동 스크롤 이어서 보기');
    }
    function units() {
      var out = [];
      document.querySelectorAll('#story > .blk').forEach(function (b) {
        if (b.hidden || b.classList.contains('t-spacer') || b.classList.contains('t-divider')) return;
        if (b.classList.contains('t-stickySteps')) b.querySelectorAll('.ss-s').forEach(function (s) { out.push(s); }); else out.push(b);
      });
      return out;
    }
    function isStop(u) {
      if (u.classList.contains('t-component') || u.classList.contains('t-interest')) return true;
      if (u.classList.contains('t-cta')) { var a = u.querySelector('[data-action]'); return !(a && /^scroll:/.test(a.getAttribute('data-action') || '')); }
      return false;
    }
    function targetY(u) { var r = u.getBoundingClientRect(), vh = root.innerHeight, top = r.top + root.scrollY; return Math.max(0, r.height < vh * 0.9 ? top - (vh - r.height) / 2 : top - 80); }
    // 속도 배율(관리자 "자동 스크롤 속도", 1=기본 · 2=두 배 빠르게 · 0.5=절반). 이동 시간과 머무는 시간에 함께 적용한다.
    function speed() { var v = +(C.settings && C.settings.autoSpeed); return v > 0 ? Math.min(4, Math.max(0.25, v)) : 1; }
    function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
    function dwell(u) { var n = (u.innerText || '').trim().length; return (n ? Math.min(7000, Math.max(1800, 1200 + n * 70)) : 2200) / speed(); }
    function firstAhead(us) { for (var i = 0; i < us.length; i++) if (us[i].getBoundingClientRect().bottom > root.innerHeight * 0.6) return i; return us.length; }
    function glide(y, my) {
      return new Promise(function (res) {
        var y0 = root.scrollY, d = y - y0, ms = Math.min(1800, Math.max(700, Math.abs(d) * 0.9)) / speed(), t0 = performance.now(), raf = 0, dead = false;
        if (REDUCE || Math.abs(d) < 3) { root.scrollTo({ top: y, behavior: 'instant' }); return res(); }
        cancelAnim = function () { dead = true; cancelAnimationFrame(raf); res(); };
        (function f(t) {
          if (dead || my !== token) return res();
          var k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          root.scrollTo({ top: y0 + d * e, behavior: 'instant' });
          if (k < 1) raf = requestAnimationFrame(f); else res();
        })(t0);
      });
    }
    async function run(from, pass) { // pass: 첫 블록이 멈춤 지점(기능 블록)이어도 멈추지 않고 지나간다
      var my = ++token; running = true; finished = false; ui();
      var us = units(), i = from ? us.indexOf(from) : -1, i0 = -1; if (i < 0) i = firstAhead(us); i0 = i;
      for (; i < us.length; i++) {
        var u = us[i];
        await glide(targetY(u), my); if (my !== token) return;
        await sleep(250 / speed()); if (my !== token) return;
        await sleep(isStop(u) ? 500 / speed() : dwell(u)); if (my !== token) return;
        if (isStop(u) && !(pass && i === i0)) { running = false; ui(); return; }
      }
      if (my === token) { running = false; finished = true; ui(); }
    }
    function interrupt() { if (!running) return; token++; running = false; if (cancelAnim) cancelAnim(); ui(); track('auto_interrupted'); }
    function begin() {
      if (started) { if (!running) { wanted = true; run(); } return; }
      started = true; wanted = true;
      document.querySelectorAll('.start').forEach(function (b) { b.hidden = true; });
      track('auto_started'); run();
    }
    function toggle() { if (running) { wanted = false; interrupt(); } else { wanted = true; run(); } }
    function continueAt(id) { // 분석 완료·흐름 열기 뒤에 이어서
      if (!wanted || running) return;
      setTimeout(function () { var el = document.getElementById(id); if (!el || el.hidden || running) return; finished = false; var us = units(); run(us.filter(function (u) { return u === el || el.contains(u); })[0], true); }, 1000);
    }
    function init() {
      var b = btn(); if (b) b.onclick = toggle;
      function user(e) { var t = e.target; if (t && t.closest && t.closest('#autoBtn')) return; interrupt(); }
      ['wheel', 'touchstart', 'pointerdown'].forEach(function (ev) { document.addEventListener(ev, user, { passive: true }); });
      document.addEventListener('keydown', function (e) { if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) interrupt(); });
    }
    return { begin: begin, init: init, continueAt: continueAt, ui: ui };
  })();

  // ───────── 시작 ─────────
  // 관리자가 저장한 내용(/api/story)이 있으면 content.js 의 기본 내용 위에 덮어 쓴다.
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function deepMerge(base, over) {
    if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
    var o = Object.assign({}, base); Object.keys(over).forEach(function (k) { o[k] = isObj(over[k]) && isObj(base[k]) ? deepMerge(base[k], over[k]) : over[k]; }); return o;
  }
  var DEFAULT_C = null;
  function applyStory(st) {
    if (!DEFAULT_C) DEFAULT_C = JSON.parse(JSON.stringify(C));
    var base = JSON.parse(JSON.stringify(DEFAULT_C)); delete base.copy;
    ['settings', 'result', 'flow', 'locked', 'purchase'].forEach(function (k) { if (st && isObj(st[k])) base[k] = deepMerge(base[k], st[k]); });
    ['blocks', 'interests'].forEach(function (k) { if (st && Array.isArray(st[k])) base[k] = st[k]; });
    Object.keys(base).forEach(function (k) { C[k] = base[k]; });
  }
  var PREVIEW = DOC && /[?&]preview=1\b/.test(location.search); // 관리자 미리보기: 보내 주는 내용으로 다시 그리고, 모든 단계를 펼쳐 보여 준다
  var host0 = null, started = false;
  function sample() { // 미리보기용 예시 사주 (분석 후 화면까지 보이도록)
    if (!M()) return; try { S.chart = M().compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 0, calendar: 'solar', gender: 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' }); S.flowOpen = true; S.name = '예시'; } catch (e) { }
    loadClips().then(function () { if (started) paint('FreeResult'); });
  }
  function render() {
    var host = host0, y = root.scrollY;
    build(host); bind0(host);
    host.querySelectorAll('[data-comp]').forEach(mountComp);
    gate(); meta(); setupObservers();
    if (PREVIEW) { host.querySelectorAll('.blk').forEach(function (el) { el.classList.add('in'); }); root.scrollTo(0, y); }
  }
  var bound = false;
  function bind0(host) { if (!bound) { bound = true; bind(host); } }
  function saveDataOn() { return !!(root.navigator && navigator.connection && navigator.connection.saveData); }
  function start() {
    if (started) return; started = true;
    render(); chrome(); Auto.init();
    document.documentElement.classList.add('ready');
    var problems = validate(); if (DEV && problems.length && root.console) console.warn('[story] 콘텐츠 점검:\n' + problems.join('\n'));
    if (!PREVIEW) track('onboarding_started', { dev: DEV ? 1 : 0 }, true);
  }
  function boot() {
    host0 = document.getElementById('story'); if (!host0) return;
    if (PREVIEW) {
      sample(); document.documentElement.classList.add('preview');
      var sel = -1;
      function mark() { host0.querySelectorAll('.blk.sel').forEach(function (x) { x.classList.remove('sel'); }); var el = host0.querySelector('.blk[data-i="' + sel + '"]'); if (el) el.classList.add('sel'); return el; }
      root.addEventListener('message', function (e) {
        if (e.origin !== location.origin) return; var d = e.data || {};
        if (d.t === 'st-content' && d.story) { applyStory(d.story); if (started) render(); else start(); mark(); }
        else if (d.t === 'st-tsel-set') { var cvEl = document.getElementById('cover'); if (cvEl) { cvEl.querySelectorAll('.cv-sel').forEach(function (x) { x.classList.remove('cv-sel'); }); var tt = cvEl.querySelector(d.n === 'title' ? '.cv-t' : d.n === 'sub' ? '.cv-s' : '.cv-bw'); if (tt) { tt.classList.add('cv-sel'); tt.scrollIntoView({ block: 'center' }); } } }
        else if (d.t === 'st-sel') { sel = +d.i; var el = mark(); if (el && d.scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      document.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a')) e.preventDefault();
        var el = e.target.closest && e.target.closest('.blk'); if (el) { sel = +el.getAttribute('data-i'); mark(); parent.postMessage({ t: 'st-pick', i: sel }, location.origin); }
      }, true);
      parent.postMessage({ t: 'st-ready' }, location.origin);
      return;
    }
    // 저장된 내용을 받아 그린다 (1.5초 안에 못 받으면 기본 내용). 받는 동안 화면은 숨겨 기본 문구가 번쩍이지 않게 한다.
    var timer = setTimeout(start, 1500);
    fetch('/api/story').then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) { clearTimeout(timer); if (d && d.story) applyStory(d.story); start(); })
      .catch(function () { clearTimeout(timer); start(); });
  }

  root.Story = { potential: potential, potentialLine: potentialLine, POTENTIAL: POTENTIAL, validate: validate, track: track, pick: pick, media: media, fmt: fmt, BLOCKS: BLOCKS, COMPONENTS: COMPONENTS, state: S };
  if (DOC) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); }
})(typeof window !== 'undefined' ? window : globalThis);
