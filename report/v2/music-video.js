/* 내 사주 뮤직비디오 — 진입 카드 + 플레이어(노래 + 패널 이미지 + 가사 자막)
   · 가사: music-video-lyrics(-topics).js 가 사주 값으로 조합(미리 쓴 문안, AI 즉석 생성 없음). 노래: /api/music-video(일레븐랩스, 서버 키).
   · 주제: 종합풀이(w1)·연애운 심화(w3)·재물운 심화(w2)·커리어운 심화(w7)·토정비결 신년운세(연도 상품). 유료 주제 안에서만 보인다.
   · 공개 스위치: /api/luck-flags musicVideo(기본 꺼짐). 로컬·미리보기 주소에서는 ?mantraFlags=musicVideo 로 켠다.
   · 패널이 넘어가는 시점 = 가사 구간 시작(일레븐랩스 v2 는 구간 길이를 지킨다), 자막 = 구간 안에서 줄 수로 고르게 나눈 시점.
     실제 곡 길이가 3분과 조금 달라도 비율로 맞춘다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var WORLD_TOPIC = { w1: 'self', w2: 'wealth', w3: 'love', w7: 'career' };
  var EL_BG = { 목: ['#17352a', '#3f7a52'], 화: ['#3a1416', '#a4462f'], 토: ['#33280f', '#9a7a3a'], 금: ['#25272c', '#8c929c'], 수: ['#0d1a2e', '#2f5d8c'] };
  function L() { return R.MusicVideoLyrics; }
  // 이 파일이 있는 폴더(MP4 저장 모듈·mp4-muxer 를 필요할 때 같은 폴더에서 불러온다)
  var BASE = (function () { try { var c = root.document && document.currentScript; return c && c.src ? c.src.replace(/[^/]*(\?.*)?$/, '') : '/report/v2/'; } catch (e) { return '/report/v2/'; } })();

  /* ── 공개 스위치 */
  function localFlag() {
    try {
      var h = root.location.hostname;
      if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\bmusicVideo\b/.test(root.location.search || '');
    } catch (e) { }
    return false;
  }
  var readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (localFlag()) return (readyP = Promise.resolve(true));
    if (!root.fetch) return (readyP = Promise.resolve(false));
    var valid = function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); };
    var p = root.MantraLastGood ? root.MantraLastGood.json('/api/luck-flags', 5000, valid) : root.fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
    return (readyP = Promise.resolve(p).then(function (d) { return !!(d && d.musicVideo === true); }).catch(function () { return false; }));
  }

  /* 서버에 보내는 사주 값: 가사 조합에 쓰는 값 + 구매 확인 열쇠(네 기둥 한자·성별). 이름·생일은 보내지 않는다 */
  function compactSd(sd) {
    if (!sd) return null;
    var p = sd.pillars || {}, h = function (k) { return p[k] && p[k].hanja ? { hanja: p[k].hanja } : null; };
    var dw = sd.currentDaewoon || {}, sw = sd.sewoon || {};
    return {
      pillars: { year: h('year'), month: h('month'), day: h('day'), hour: h('hour') }, gender: sd.gender,
      dayMaster: sd.dayMaster && { stem: sd.dayMaster.stem, el: sd.dayMaster.el }, dayPillar: sd.dayPillar && { ko: sd.dayPillar.ko, key: sd.dayPillar.key },
      tenGods: sd.tenGods, twelveStages: sd.twelveStages && { day: sd.twelveStages.day }, strength: sd.strength && { zone: sd.strength.zone, band: sd.strength.band },
      dominantEl: sd.dominantEl, weakestEl: sd.weakestEl, lackEl: sd.lackEl, dominantGroup: sd.dominantGroup, weakestGroup: sd.weakestGroup,
      usefulElements: sd.usefulElements && { yong: sd.usefulElements.yong, hee: sd.usefulElements.hee },
      patterns: (sd.patterns || []).map(function (x) { return { name: x && x.name }; }), specialStars: (sd.specialStars || []).map(function (x) { return { name: x && x.name }; }),
      currentDaewoon: { season: dw.season, stemTG: dw.stemTG, condition: dw.condition },
      sewoon: { year: sw.year, season: sw.season, stemTG: sw.stemTG, love: sw.love && { band: sw.love.band }, wealth: sw.wealth && { band: sw.wealth.band } },
      annualLuck: (sd.annualLuck || []).map(function (a) { return { year: a.year, season: a.season, stemTG: a.stemTG }; }),
      nowYear: sd.nowYear, climate: sd.climate && { temp: sd.climate.temp },
      career: sd.career && { top: (sd.career.top || []).slice(0, 1).map(function (c) { return { category: c.category }; }) },
      clashes: (sd.clashes || []).map(function () { return 1; }), combinations: (sd.combinations || []).map(function () { return 1; })
    };
  }

  /* ── 진입 카드. o: { topic, sd, extra, locked, esc } */
  function cardHtml(o) {
    var lib = L(); if (!lib || !o) return '';
    var song = null;
    if (o.topic === 'newyear') song = { topic: 'newyear', topicKo: lib.TOPIC_KO.newyear, title: (o.year || '') + ' 토정비결 신년운세 랩' };   // 괘 풀이는 서버가 승인 문구로 조합
    else if (o.sd) { try { song = lib.compose(o.sd, o.topic); } catch (e) { song = null; } }
    if (!song) return '';
    if (root.document) injectCss();
    var esc = o.esc || function (s) { return String(s); };
    return '<div class="cs-card mv-card"><div><p class="cs-ct">내 사주 뮤직비디오 · ' + esc(song.topicKo) + '</p><h4>' + esc(song.title) + '</h4>' +
      '<p class="cs-sum">' + (song.hero ? '주인공은 내 일주 ' + esc(song.hero.day) + '의 기질을 닮은 ' + (song.hero.gender === 'F' ? '여성' : '남성') + ' 래퍼, 곁을 지키는 수호 동물은 ' + esc(song.hero.nameKo) + '. ' : '') + '3분 랩 한 곡 · 내 사주 값으로 고른 가사에 맞춰 장면이 넘어가고 자막이 흘러요.' + (o.locked ? ' 이 주제를 구매하면 들을 수 있어요.' : '') + '</p>' +
      '<button type="button" class="chipbtn" data-mvopen="' + esc(song.topic) + '">' + (o.locked ? '🔒 ' : '▶ ') + '뮤직비디오 보기</button></div></div>';
  }

  /* ── 플레이어 */
  var CSS = '.mv-sheet{position:fixed;inset:0;z-index:9999;background:#07080b;color:#fff;display:flex;flex-direction:column;font-family:inherit}' +
    '.mv-stage{position:absolute;inset:0;overflow:hidden}.mv-stage i{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.2s ease;transform:scale(1.04)}' +
    '.mv-stage i video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mv-stage i.on{opacity:1;animation:mvkb 22s linear forwards}@keyframes mvkb{from{transform:scale(1.04)}to{transform:scale(1.14)}}@media (prefers-reduced-motion:reduce){.mv-stage i.on{animation:none}}' +
    '.mv-stage:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55) 0,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 52%,rgba(0,0,0,.82) 100%)}' +
    '.mv-top{position:relative;display:flex;align-items:center;gap:10px;padding:14px 16px}.mv-top b{flex:1;font-size:15px;line-height:1.35}.mv-top small{display:block;font-weight:400;opacity:.75;font-size:12px}' +
    '.mv-x{background:rgba(255,255,255,.14);border:0;color:#fff;border-radius:999px;width:36px;height:36px;font-size:18px;cursor:pointer}' +
    '.mv-sub{position:relative;margin-top:auto;padding:0 20px 8px;text-align:center}.mv-sec{display:inline-block;font-size:11px;letter-spacing:.12em;padding:3px 10px;border:1px solid rgba(255,255,255,.4);border-radius:999px;margin-bottom:10px;opacity:.85}' +
    '.mv-line{font-size:clamp(19px,5.2vw,28px);font-weight:700;line-height:1.4;text-shadow:0 2px 12px rgba(0,0,0,.8);min-height:2.8em;transition:opacity .25s}.mv-next{font-size:14px;opacity:.6;margin-top:6px;min-height:1.4em}' +
    '.mv-ctl{position:relative;display:flex;align-items:center;gap:12px;padding:12px 16px 22px}.mv-pp{background:#fff;color:#111;border:0;border-radius:999px;width:46px;height:46px;font-size:18px;cursor:pointer;flex:none}' +
    '.mv-bar{flex:1;height:6px;background:rgba(255,255,255,.22);border-radius:6px;cursor:pointer;position:relative}.mv-bar span{position:absolute;left:0;top:0;bottom:0;background:#fff;border-radius:6px;width:0}.mv-t{font-size:12px;opacity:.8;min-width:78px;text-align:right;font-variant-numeric:tabular-nums}' +
    '.mv-wait{position:relative;margin:auto 0;padding:0 24px;text-align:center}.mv-wait p{opacity:.85;line-height:1.6}.mv-wait .mv-spin{width:34px;height:34px;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;margin:0 auto 14px;animation:mvsp 1s linear infinite}@keyframes mvsp{to{transform:rotate(360deg)}}' +
    '.mv-pre{max-height:38vh;overflow:auto;margin-top:16px;font-size:13px;opacity:.7;line-height:1.7;white-space:pre-line;text-align:left;background:rgba(255,255,255,.06);border-radius:12px;padding:12px 14px}' +
    '.mv-err{position:relative;margin:auto 0;padding:0 24px;text-align:center;line-height:1.6}.mv-err button{margin-top:14px;background:#fff;color:#111;border:0;border-radius:999px;padding:10px 18px;cursor:pointer}' +
    /* 신년운세 화면처럼 무빙툰 카드 스타일(cs-card)이 없는 곳 */
    '.ny-mv .mv-card{border:1px solid rgba(128,128,128,.35);border-radius:14px;padding:14px 16px;margin:18px 0}.ny-mv .cs-ct{font-size:12px;opacity:.7;margin:0 0 4px}.ny-mv h4{margin:0 0 6px;font-size:17px}.ny-mv .cs-sum{margin:0 0 12px;font-size:14px;opacity:.85;line-height:1.6}' +
    '.mv-pick{position:relative;margin:auto 0;padding:0 20px;max-height:calc(100% - 80px);overflow:auto}.mv-pick h5{margin:0 0 14px;font-size:20px;text-align:center}.mv-pick p.mv-pl{margin:14px 0 8px;font-size:13px;opacity:.75}' +
    '.mv-chips{display:flex;flex-wrap:wrap;gap:8px}.mv-chips button{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:9px 14px;font:inherit;font-size:14px;cursor:pointer}' +
    '.mv-chips button[aria-pressed="true"]{background:#fff;color:#111;border-color:#fff;font-weight:700}' +
    '.mv-go{display:block;width:100%;margin:22px 0 8px;background:#fff;color:#111;border:0;border-radius:999px;padding:14px;font:inherit;font-size:16px;font-weight:700;cursor:pointer}.mv-note{font-size:12px;opacity:.6;text-align:center;line-height:1.6;margin:0}' +
    '.mv-end{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:18px 18px 26px;background:linear-gradient(180deg,rgba(7,8,11,0),rgba(7,8,11,.92) 30%);display:flex;flex-direction:column;gap:10px}' +
    '.mv-end button,.mv-end a{display:block;text-align:center;text-decoration:none;border:0;border-radius:999px;padding:13px;font:inherit;font-size:15px;font-weight:700;cursor:pointer}.mv-end .mv-b1{background:#fff;color:#111}.mv-end .mv-b2{background:rgba(255,255,255,.14);color:#fff}' +
    '.mv-end .mv-prog{height:6px;background:rgba(255,255,255,.2);border-radius:6px;overflow:hidden}.mv-end .mv-prog span{display:block;height:100%;width:0;background:#fff;transition:width .3s}.mv-end small{opacity:.7;text-align:center;line-height:1.5}' +
    '.ny-mv .chipbtn{border:1px solid currentColor;background:transparent;color:inherit;border-radius:999px;padding:8px 16px;font:inherit;cursor:pointer}';
  function injectCss() { if (document.getElementById('mv-css')) return; var s = document.createElement('style'); s.id = 'mv-css'; s.textContent = CSS; document.head.appendChild(s); }
  function fmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function bgFor(sec, panels) {
    var p = panels && (panels[sec.panel] || panels[sec.panelFallback]); if (p && p.url) return 'url("' + String(p.url).replace(/"/g, '') + '")';
    var c = EL_BG[sec.el] || EL_BG.토; return 'radial-gradient(120% 90% at 50% 20%,' + c[1] + ' 0,' + c[0] + ' 70%)';
  }

  /* o: { sd, topic, headers: fn → 헤더, onLocked: fn(reason), track: fn(event, data) }
     신년운세는 { topic:'newyear', birth, year } — 괘·사주를 서버가 출생 정보로 계산하고 승인된 토정 문구만 쓴다(출생 정보는 저장하지 않음) */
  function open(o) {
    var lib = L(); if (!lib || !o) return;
    var ny = o.topic === 'newyear';
    var preview = ny ? (o.birth ? { topic: 'newyear', topicKo: lib.TOPIC_KO.newyear, title: (o.year || '') + ' 토정비결 신년운세 랩', lyrics: '', sections: [{ el: '토' }] } : null) : (o.sd ? lib.compose(o.sd, o.topic) : null);
    if (!preview) return;
    injectCss(); close();
    var el = document.createElement('div'); el.className = 'mv-sheet'; el.id = 'mv-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '내 사주 뮤직비디오');
    el.innerHTML = '<div class="mv-stage"></div><div class="mv-top"><b>' + escH(preview.title) + '<small>내 사주 뮤직비디오 · ' + escH(preview.topicKo) + '</small></b><button type="button" class="mv-x" aria-label="닫기">✕</button></div>';
    document.body.appendChild(el); document.documentElement.style.overflow = 'hidden';
    var stage = el.querySelector('.mv-stage'); stage.innerHTML = '<i class="on" style="background-image:' + bgFor(preview.sections[0], null).replace(/"/g, '&quot;') + '"></i>';
    el.querySelector('.mv-x').onclick = close;
    var alive = true, tries = 0; el._stop = function () { alive = false; };
    var track = o.track || function () { };
    track('mv_open', { topic: preview.topic });
    // 먼저 장르·분위기·보컬을 고른다(사용자 요청 2026-11-20). 고른 값은 이 기기에 기억해 다음에 미리 골라 둔다
    pick(el, preview, o, function (opts) {
      track('mv_opts', { topic: preview.topic, genre: opts.genre, mood: opts.mood, vocal: opts.vocal });
      var wait = document.createElement('div'); wait.className = 'mv-wait';
      wait.innerHTML = '<div class="mv-spin"></div><p>내 사주로 고른 가사로 노래를 만들고 있어요.<br>처음 만드는 조합은 1~2분쯤 걸려요. 같은 조합은 다음부터 바로 열려요.</p>' + (preview.lyrics ? '<div class="mv-pre">' + escH(preview.lyrics.replace(/^\[.*\]$/gm, '').replace(/\n{3,}/g, '\n\n').trim()) + '</div>' : '');
      el.appendChild(wait);
      request(JSON.stringify(ny ? { topic: 'newyear', birth: o.birth, year: o.year, opts: opts } : { sd: compactSd(o.sd), topic: preview.topic, opts: opts }));
    });
    function request(body) { el._body = body; el._reopen = function () { open(o); }; (function req() {
      if (!alive) return;
      root.fetch('/api/music-video', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, (o.headers && o.headers()) || {}), body: body })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._s = r.status; return d; }); })
        .then(function (d) {
          if (!alive) return;
          if (d._s === 202 && d.pending && tries++ < 30) { setTimeout(req, 8000); return; }   // 같은 곡을 다른 기기에서 만드는 중
          if (d.ok && d.audio && d.song) { play(el, d, track); if (d.fill) fillPanels(el, d, body, o.headers); else if (d.videosPending) pollVideos(el, d, body, o.headers); return; }
          if (d._s === 401 || d._s === 402) { close(); if (o.onLocked) o.onLocked(d.error === 'login' ? 'login' : 'purchase'); return; }
          fail(el, d._s === 429 && d.error === 'per-saju-limit' ? '오늘은 이 사주로 새 노래를 ' + (d.limit || 3) + '곡까지 만들 수 있어요.\n이미 만든 조합(장르·분위기·보컬)은 지금도 바로 열려요.' : d._s === 429 ? '오늘 만들 수 있는 노래가 모두 찼어요. 내일 다시 열어 주세요.' : d._s === 403 ? '이 주제에서는 뮤직비디오를 열 수 없어요.' : d._s === 409 ? '이 괘의 풀이를 다듬는 중이에요. 준비되면 바로 들을 수 있어요.' + (d.detail ? '\n(' + d.detail + ')' : '') : '노래를 만들지 못했어요. 잠시 뒤 다시 열어 주세요.' + (d.detail ? '\n\n[관리자에게만 보임] ' + d.detail : ''), d._s >= 500);   // detail 은 서버가 관리자 요청에만 담는다
          track('mv_error', { topic: preview.topic, status: d._s });
        })
        .catch(function () { if (alive) fail(el, '연결이 끊겼어요. 잠시 뒤 다시 열어 주세요.', true); });
    })(); }
  }
  /* 옵션 고르기 화면: 장르·분위기·보컬. 장르 '내 사주 추천' 은 일간 오행 장르, 보컬 '사주대로' 는 사주 성별 */
  var OPT_KEY = 'mv:opts';
  function pick(el, preview, o, go) {
    var lib = L(), O = lib.OPTIONS, saved = {}; try { saved = JSON.parse(root.localStorage.getItem(OPT_KEY) || '{}') || {}; } catch (e) { saved = {}; }
    var cur = lib.optsOf(o.opts || saved), el0 = preview.inputs && preview.inputs.el, g0 = preview.gender || (o.birth && o.birth.gender);
    var label = function (k, x) {
      if (k === 'genre' && x.id === 'auto' && el0) return '내 사주 추천 · ' + (O.genre.filter(function (y) { return y.id === lib.EL_GENRE[el0]; })[0] || {}).ko;
      if (k === 'vocal' && x.id === 'auto' && (g0 === 'F' || g0 === 'M')) return '사주대로 · ' + (g0 === 'F' ? '여성' : '남성');
      return x.ko;
    };
    var box = document.createElement('div'); box.className = 'mv-pick';
    var group = function (k, title) { return '<p class="mv-pl">' + title + '</p><div class="mv-chips" data-k="' + k + '">' + O[k].map(function (x) { return '<button type="button" data-v="' + x.id + '" aria-pressed="' + (cur[k] === x.id) + '">' + escH(label(k, x)) + '</button>'; }).join('') + '</div>'; };
    box.innerHTML = '<h5>어떤 느낌으로 만들까요?</h5>' + group('genre', '장르') + group('mood', '분위기') + group('vocal', '보컬') + group('tone', '목소리 톤') +
      '<button type="button" class="mv-go">이 느낌으로 뮤직비디오 만들기</button><p class="mv-note">가사는 내 사주 그대로예요. 같은 조합은 다음부터 바로 열리고,<br>새 조합은 하루에 몇 곡까지만 만들 수 있어요.</p>';
    box.querySelectorAll('.mv-chips').forEach(function (g) { g.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cur[g.dataset.k] = b.dataset.v; g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }); });
    box.querySelector('.mv-go').onclick = function () { try { root.localStorage.setItem(OPT_KEY, JSON.stringify(cur)); } catch (e) { } box.remove(); go(lib.optsOf(cur)); };
    el.appendChild(box);
  }
  function fail(el, msg, retry) {
    var w = el.querySelector('.mv-wait'); if (w) w.remove();
    var e = document.createElement('div'); e.className = 'mv-err'; e.innerHTML = '<p style="white-space:pre-line;word-break:break-all">' + escH(msg) + '</p><button type="button">닫기</button>';
    e.querySelector('button').onclick = close; el.appendChild(e);
  }
  /* 빈 패널 채우기: 주인공(일주 래퍼 + 수호 동물)·성별·주제마다 칸이 달라 미리 다 만들 수 없으니, 곡이 재생되는 동안 이 곡의 빈 칸을
     서버에 하나씩 만들어 달라고 한다(한 장 20~60초). 만들어지는 대로 화면에 바로 붙고, 같은 칸은 다음 사람부터 바로 보인다. */
  function fillPanels(el, d, body, headers) {
    var song = d.song, panels = d.panels || (d.panels = {}), want = [], videoAsked = false;
    song.sections.forEach(function (s) { if (!panels[s.panel] && want.indexOf(s.panel) < 0) want.push(s.panel); });
    var base = {}; try { base = JSON.parse(body); } catch (e) { return; }
    (function next() {
      if (!document.body.contains(el)) return;
      if (!want.length) { if (videoAsked || d.videosPending) pollVideos(el, d, body, headers); return; }
      var id = want.shift();
      root.fetch('/api/music-video', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, (headers && headers()) || {}), body: JSON.stringify(Object.assign({}, base, { fillPanel: id })) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { x._s = r.status; return x; }); })
        .then(function (x) {
          if (x.ok && x.panel && x.panel.url) {
            panels[id] = x.panel; if (x.videoPending) videoAsked = true;
            song.sections.forEach(function (s, i) { if (s.panel === id || (s.panelFallback === id && !panels[s.panel])) { var n = el.querySelector('.mv-stage i[data-i="' + i + '"]'); if (n) n.style.backgroundImage = bgFor(s, panels); } });
            next(); return;
          }
          if (x._s === 202) { want.push(id); setTimeout(next, 8000); return; }   // 다른 사람이 같은 칸을 만드는 중
          if (x._s === 429 || x._s === 501 || x._s === 401 || x._s === 402 || x._s === 403) return;   // 오늘 상한·키 없음·권한 없음이면 그만(오행 색으로 계속)
          next();
        })
        .catch(function () { next(); });
    })();
  }
  /* 패널 영상: 그림을 만든 뒤 서버가 Kling 영상을 자동으로 맡긴다(1~5분). 30초마다 곡 단위로 확인해, 끝난 칸은 그 구간 배경을 영상으로 바꾼다 */
  function stillMode() { try { return !!((root.navigator.connection && root.navigator.connection.saveData) || root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function attachVideos(el, song, panels) {
    if (stillMode()) return;
    song.sections.forEach(function (s, i) {
      var p = panels[s.panel] || panels[s.panelFallback], n = el.querySelector('.mv-stage i[data-i="' + i + '"]');
      if (!n || !p || !p.video || n.querySelector('video')) return;
      var v = document.createElement('video'); v.setAttribute('data-v', ''); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = el._sec === i ? 'auto' : 'none'; v.src = p.video;
      n.appendChild(v);
      if (el._sec === i && el._audio && !el._audio.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); }
    });
  }
  function pollVideos(el, d, body, headers) {
    if (el._polling) return; el._polling = true;
    var base = {}; try { base = JSON.parse(body); } catch (e) { return; }
    var tries = 0;
    (function tick() {
      if (!document.body.contains(el) || tries++ > 16) return;
      setTimeout(function () {
        if (!document.body.contains(el)) return;
        root.fetch('/api/music-video', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, (headers && headers()) || {}), body: JSON.stringify(Object.assign({}, base, { checkVideos: true })) })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (x) { if (!x || !x.ok) return; Object.keys(x.panels || {}).forEach(function (k) { d.panels[k] = x.panels[k]; }); attachVideos(el, d.song, d.panels); if (x.pending > 0) tick(); })
          .catch(function () { tick(); });
      }, 30000);
    })();
  }
  function play(el, d, track) {
    var song = d.song, panels = d.panels || {}, lib = L();
    var w = el.querySelector('.mv-wait'); if (w) w.remove();
    var tb = el.querySelector('.mv-top b'); if (tb && tb.firstChild) tb.firstChild.textContent = song.title;   // 신년운세는 서버가 정한 제목으로
    var stage = el.querySelector('.mv-stage');
    // 패널에 영상(Kling)이 있으면 그 구간 동안 소리 없이 반복 재생한다. 데이터 절약·움직임 줄이기 설정이면 이미지만
    var still = false; try { still = !!((root.navigator.connection && root.navigator.connection.saveData) || root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    stage.innerHTML = song.sections.map(function (s, i) {
      var p = panels[s.panel] || panels[s.panelFallback], vid = !still && p && p.video ? '<video data-v muted loop playsinline preload="' + (i === 0 ? 'auto' : 'none') + '" src="' + escH(p.video) + '"></video>' : '';
      return '<i data-i="' + i + '" style="background-image:' + bgFor(s, panels).replace(/"/g, '&quot;') + '"' + (i === 0 ? ' class="on"' : '') + '>' + vid + '</i>';
    }).join('');
    var showVid = function (si) { stage.querySelectorAll('video[data-v]').forEach(function (v) { var on = +v.parentNode.dataset.i === si; if (on) { v.preload = 'auto'; var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); } else if (!v.paused) v.pause(); }); };
    var ui = document.createElement('div'); ui.style.cssText = 'position:relative;display:flex;flex-direction:column;flex:1';
    ui.innerHTML = '<div class="mv-sub"><span class="mv-sec"></span><div class="mv-line" aria-live="polite"></div><div class="mv-next"></div></div>' +
      '<div class="mv-ctl"><button type="button" class="mv-pp" aria-label="재생">▶</button><div class="mv-bar" role="slider" aria-label="재생 위치" tabindex="0"><span></span></div><span class="mv-t">0:00 / ' + fmt(song.totalMs) + '</span></div>';
    el.appendChild(ui);
    var audio = new Audio(); audio.preload = 'auto'; audio.src = d.audio; el._audio = audio;
    var pp = ui.querySelector('.mv-pp'), bar = ui.querySelector('.mv-bar'), fill = bar.querySelector('span'), tEl = ui.querySelector('.mv-t'), secEl = ui.querySelector('.mv-sec'), lineEl = ui.querySelector('.mv-line'), nextEl = ui.querySelector('.mv-next');
    var lastSec = -1, lastLine = '', raf = 0, done = false;
    // 자막 시각(song.timing, 서버가 음성 인식으로 맞춘 실제 부르는 시각)이 있으면 재생 시각 그대로, 없으면 구간 길이를 실제 곡 길이에 비율로 맞춘다
    function songMs() { if (song.timing && song.timing.length) return audio.currentTime * 1000; var dur = audio.duration; return isFinite(dur) && dur > 0 ? (audio.currentTime / dur) * song.totalMs : audio.currentTime * 1000; }
    function tick() {
      var ms = songMs(), cue = lib.cueAt(song, ms), si = song.sections.indexOf(cue.section);
      if (si !== lastSec) { lastSec = si; stage.querySelectorAll('i').forEach(function (n) { n.classList.toggle('on', +n.dataset.i === si); }); secEl.textContent = cue.section.name; el._sec = si; showVid(si); }
      var key = cue.line + '|' + cue.lineIndex + '|' + si;
      if (key !== lastLine) { lastLine = key; lineEl.textContent = cue.line; var nx = cue.next != null ? cue.next : (cue.section.lines[cue.lineIndex + 1] || ((song.sections[si + 1] || {}).lines || [])[0] || ''); nextEl.textContent = nx; }   // 쉬는 구간(전주·간주)에는 줄을 비우고 다음 줄만 미리 보여 준다
      var dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : song.totalMs;
      fill.style.width = Math.min(100, audio.currentTime * 1000 / dur * 100) + '%'; tEl.textContent = fmt(audio.currentTime * 1000) + ' / ' + fmt(dur);
      root.cancelAnimationFrame(raf); if (!audio.paused) raf = root.requestAnimationFrame(tick);
    }
    function setPP() { pp.textContent = audio.paused ? '▶' : '❚❚'; pp.setAttribute('aria-label', audio.paused ? '재생' : '일시정지'); }
    pp.onclick = function () { if (audio.paused) audio.play().catch(function () { }); else audio.pause(); };
    audio.addEventListener('play', function () { var eb = el.querySelector('.mv-end'); if (eb && !eb._file && !eb.querySelector('[data-a="cancel"]')) eb.remove(); setPP(); root.cancelAnimationFrame(raf); raf = root.requestAnimationFrame(tick); });
    audio.addEventListener('pause', function () { setPP(); tick(); stage.querySelectorAll('video[data-v]').forEach(function (v) { v.pause(); }); });
    audio.addEventListener('playing', function () { if (lastSec >= 0) showVid(lastSec); });
    audio.addEventListener('timeupdate', tick); audio.addEventListener('seeked', tick);   // 탭이 뒤로 가 rAF 가 멈춰도 자막·패널이 따라온다
    audio.addEventListener('ended', function () { setPP(); if (!done) { done = true; track('mv_done', { topic: song.topic }); } endScreen(el, d, track, function () { audio.currentTime = 0; audio.play().catch(function () { }); }); });
    audio.addEventListener('error', function () { fail(el, '노래 파일을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.'); });
    function seek(x) { var r = bar.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width)); if (isFinite(audio.duration)) { audio.currentTime = f * audio.duration; tick(); } }
    bar.addEventListener('click', function (e) { seek(e.clientX); });
    bar.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') audio.currentTime += 5; else if (e.key === 'ArrowLeft') audio.currentTime -= 5; else return; tick(); });
    tick(); audio.play().catch(function () { setPP(); });   // 자동 재생이 막히면 ▶ 를 누르게 둔다
    track('mv_ready', { topic: song.topic });
  }
  /* 끝 화면(사용자 요청 2026-11-20): 끝까지 본 뒤에 SNS 업로드용 MP4(세로 9:16)를 저장할 수 있다. MP4 는 이 기기에서 만든다(music-video-export.js) */
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('스크립트를 불러오지 못했습니다')); }; document.head.appendChild(s); }); }
  var exportLibs = null;
  function loadExport() {
    if (!exportLibs) exportLibs = Promise.all([root.Mp4Muxer ? 0 : loadScript(BASE + 'vendor/mp4-muxer-5.1.5.js'), R.MusicVideoExport ? 0 : loadScript(BASE + 'music-video-export.js?v=20261120-mv')]).catch(function (e) { exportLibs = null; throw e; });
    return exportLibs;
  }
  function endScreen(el, d, track, replay) {
    if (el.querySelector('.mv-end')) return;
    var box = document.createElement('div'); box.className = 'mv-end';
    var base = function () {
      box.innerHTML = '<button type="button" class="mv-b1" data-a="mp4">⬇ MP4로 저장 (세로 9:16 · SNS용)</button>' +
        '<button type="button" class="mv-b2" data-a="again">↺ 처음부터 다시 보기</button><button type="button" class="mv-b2" data-a="opts">🎚 다른 느낌으로 다시 만들기</button>';
    };
    base(); el.appendChild(box);
    var sig = null;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a;
      if (a === 'again') { box.remove(); replay(); return; }
      if (a === 'opts') { if (el._reopen) el._reopen(); return; }
      if (a === 'cancel') { if (sig) sig.cancel = true; return; }
      if (a === 'mp4') {
        sig = { cancel: false };
        box.innerHTML = '<small class="mv-st">MP4 준비 중…</small><div class="mv-prog"><span></span></div><button type="button" class="mv-b2" data-a="cancel">그만두기</button>';
        var st = box.querySelector('.mv-st'), bar = box.querySelector('.mv-prog span');
        track('mv_export_start', { topic: d.song.topic });
        loadExport().then(function () {
          if (!R.MusicVideoExport.canExport()) throw new Error('unsupported');
          return R.MusicVideoExport.make({ song: d.song, panels: d.panels || {}, audio: d.audio, signal: sig, onProgress: function (p, msg) { bar.style.width = Math.round(p * 100) + '%'; st.textContent = msg; } });
        }).then(function (file) {
          track('mv_export_done', { topic: d.song.topic, mb: Math.round(file.size / 1048576) });
          var url = URL.createObjectURL(file), canShare = false; try { canShare = !!(root.navigator.canShare && root.navigator.canShare({ files: [file] })); } catch (x) { }
          box.innerHTML = '<a class="mv-b1" href="' + url + '" download="' + escH(file.name) + '">⬇ MP4 저장하기 (' + (file.size / 1048576).toFixed(1) + 'MB)</a>' +
            (canShare ? '<button type="button" class="mv-b2" data-a="share">↗ 바로 공유하기</button>' : '') +
            '<small>세로 9:16 · 1080×1920 — 인스타그램 릴스·틱톡·유튜브 쇼츠에 그대로 올릴 수 있어요.</small><button type="button" class="mv-b2" data-a="again">↺ 처음부터 다시 보기</button>';
          box._file = file;
        }).catch(function (err) {
          var m = err && err.message;
          if (m === 'cancel') { base(); return; }
          track('mv_export_fail', { topic: d.song.topic, reason: String(m || '').slice(0, 60) });
          box.innerHTML = '<small>' + (m === 'unsupported' ? '이 브라우저에서는 MP4를 만들 수 없어요. 크롬(PC·안드로이드) 또는 최신 사파리에서 다시 열어 주세요.' : 'MP4를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.') + '</small>';
          var again = document.createElement('div'); again.innerHTML = '<button type="button" class="mv-b2" data-a="again">↺ 처음부터 다시 보기</button>'; box.appendChild(again.firstChild);
        });
        return;
      }
      if (a === 'share' && box._file) { root.navigator.share({ files: [box._file], title: d.song.title }).catch(function () { }); }
    });
  }
  function close() {
    var el = document.getElementById('mv-sheet'); if (!el) return;
    var en = el.querySelector('.mv-end'); if (en && en.querySelector('[data-a="cancel"]')) en.querySelector('[data-a="cancel"]').click();   // 만들던 MP4 는 멈춘다
    if (el._stop) el._stop(); if (el._audio) { try { el._audio.pause(); el._audio.src = ''; } catch (e) { } }
    el.parentNode.removeChild(el); document.documentElement.style.overflow = '';
  }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  if (root.document && root.fetch) { try { ready(); } catch (e) { } }
  R.MusicVideo = { WORLD_TOPIC: WORLD_TOPIC, ready: ready, localFlag: localFlag, cardHtml: cardHtml, open: open, close: close, compactSd: compactSd, topicOfWorld: function (w) { return WORLD_TOPIC[w] || null; } };
})(typeof window !== 'undefined' ? window : globalThis);
