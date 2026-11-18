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
      '<p class="cs-sum">' + (song.hero ? '주인공은 내 일주 ' + esc(song.hero.day) + '의 ' + esc(song.hero.nameKo) + ' ' + (song.hero.gender === 'F' ? '여성' : '남성') + ' 래퍼, 크루는 ' + esc(song.hero.crewKo.join('·')) + '. ' : '') + '3분 랩 한 곡 · 내 사주 값으로 고른 가사에 맞춰 장면이 넘어가고 자막이 흘러요.' + (o.locked ? ' 이 주제를 구매하면 들을 수 있어요.' : '') + '</p>' +
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
    el.innerHTML = '<div class="mv-stage"></div><div class="mv-top"><b>' + escH(preview.title) + '<small>내 사주 뮤직비디오 · ' + escH(preview.topicKo) + '</small></b><button type="button" class="mv-x" aria-label="닫기">✕</button></div>' +
      '<div class="mv-wait"><div class="mv-spin"></div><p>내 사주로 고른 가사로 노래를 만들고 있어요.<br>처음 한 번은 1~2분쯤 걸려요. 다음부터는 바로 열려요.</p>' + (preview.lyrics ? '<div class="mv-pre">' + escH(preview.lyrics.replace(/^\[.*\]$/gm, '').replace(/\n{3,}/g, '\n\n').trim()) + '</div>' : '') + '</div>';
    document.body.appendChild(el); document.documentElement.style.overflow = 'hidden';
    var stage = el.querySelector('.mv-stage'); stage.innerHTML = '<i class="on" style="background-image:' + bgFor(preview.sections[0], null).replace(/"/g, '&quot;') + '"></i>';
    el.querySelector('.mv-x').onclick = close;
    var alive = true, tries = 0; el._stop = function () { alive = false; };
    var track = o.track || function () { };
    track('mv_open', { topic: preview.topic });
    var body = JSON.stringify(ny ? { topic: 'newyear', birth: o.birth, year: o.year } : { sd: compactSd(o.sd), topic: preview.topic });
    (function req() {
      if (!alive) return;
      root.fetch('/api/music-video', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, (o.headers && o.headers()) || {}), body: body })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._s = r.status; return d; }); })
        .then(function (d) {
          if (!alive) return;
          if (d._s === 202 && d.pending && tries++ < 30) { setTimeout(req, 8000); return; }   // 같은 곡을 다른 기기에서 만드는 중
          if (d.ok && d.audio && d.song) { play(el, d, track); if (d.fill) fillPanels(el, d, body, o.headers); return; }
          if (d._s === 401 || d._s === 402) { close(); if (o.onLocked) o.onLocked(d.error === 'login' ? 'login' : 'purchase'); return; }
          fail(el, d._s === 429 ? '오늘 만들 수 있는 노래가 모두 찼어요. 내일 다시 열어 주세요.' : d._s === 403 ? '이 주제에서는 뮤직비디오를 열 수 없어요.' : d._s === 409 ? '이 괘의 풀이를 다듬는 중이에요. 준비되면 바로 들을 수 있어요.' + (d.detail ? '\n(' + d.detail + ')' : '') : '노래를 만들지 못했어요. 잠시 뒤 다시 열어 주세요.' + (d.detail ? '\n\n[관리자에게만 보임] ' + d.detail : ''), d._s >= 500);   // detail 은 서버가 관리자 요청에만 담는다
          track('mv_error', { topic: preview.topic, status: d._s });
        })
        .catch(function () { if (alive) fail(el, '연결이 끊겼어요. 잠시 뒤 다시 열어 주세요.', true); });
    })();
  }
  function fail(el, msg, retry) {
    var w = el.querySelector('.mv-wait'); if (w) w.remove();
    var e = document.createElement('div'); e.className = 'mv-err'; e.innerHTML = '<p style="white-space:pre-line;word-break:break-all">' + escH(msg) + '</p><button type="button">닫기</button>';
    e.querySelector('button').onclick = close; el.appendChild(e);
  }
  /* 빈 패널 채우기: 주인공(일주 동물 래퍼)·성별·주제마다 칸이 달라 미리 다 만들 수 없으니, 곡이 재생되는 동안 이 곡의 빈 칸을
     서버에 하나씩 만들어 달라고 한다(한 장 20~60초). 만들어지는 대로 화면에 바로 붙고, 같은 칸은 다음 사람부터 바로 보인다. */
  function fillPanels(el, d, body, headers) {
    var song = d.song, panels = d.panels || (d.panels = {}), want = [];
    song.sections.forEach(function (s) { if (!panels[s.panel] && want.indexOf(s.panel) < 0) want.push(s.panel); });
    var base = {}; try { base = JSON.parse(body); } catch (e) { return; }
    (function next() {
      if (!want.length || !document.body.contains(el)) return;
      var id = want.shift();
      root.fetch('/api/music-video', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, (headers && headers()) || {}), body: JSON.stringify(Object.assign({}, base, { fillPanel: id })) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { x._s = r.status; return x; }); })
        .then(function (x) {
          if (x.ok && x.panel && x.panel.url) {
            panels[id] = x.panel;
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
      if (si !== lastSec) { lastSec = si; stage.querySelectorAll('i').forEach(function (n) { n.classList.toggle('on', +n.dataset.i === si); }); secEl.textContent = cue.section.name; showVid(si); }
      var key = cue.line + '|' + cue.lineIndex + '|' + si;
      if (key !== lastLine) { lastLine = key; lineEl.textContent = cue.line; var nx = cue.next != null ? cue.next : (cue.section.lines[cue.lineIndex + 1] || ((song.sections[si + 1] || {}).lines || [])[0] || ''); nextEl.textContent = nx; }   // 쉬는 구간(전주·간주)에는 줄을 비우고 다음 줄만 미리 보여 준다
      var dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : song.totalMs;
      fill.style.width = Math.min(100, audio.currentTime * 1000 / dur * 100) + '%'; tEl.textContent = fmt(audio.currentTime * 1000) + ' / ' + fmt(dur);
      root.cancelAnimationFrame(raf); if (!audio.paused) raf = root.requestAnimationFrame(tick);
    }
    function setPP() { pp.textContent = audio.paused ? '▶' : '❚❚'; pp.setAttribute('aria-label', audio.paused ? '재생' : '일시정지'); }
    pp.onclick = function () { if (audio.paused) audio.play().catch(function () { }); else audio.pause(); };
    audio.addEventListener('play', function () { setPP(); root.cancelAnimationFrame(raf); raf = root.requestAnimationFrame(tick); });
    audio.addEventListener('pause', function () { setPP(); tick(); stage.querySelectorAll('video[data-v]').forEach(function (v) { v.pause(); }); });
    audio.addEventListener('playing', function () { if (lastSec >= 0) showVid(lastSec); });
    audio.addEventListener('timeupdate', tick); audio.addEventListener('seeked', tick);   // 탭이 뒤로 가 rAF 가 멈춰도 자막·패널이 따라온다
    audio.addEventListener('ended', function () { setPP(); if (!done) { done = true; track('mv_done', { topic: song.topic }); } });
    audio.addEventListener('error', function () { fail(el, '노래 파일을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.'); });
    function seek(x) { var r = bar.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width)); if (isFinite(audio.duration)) { audio.currentTime = f * audio.duration; tick(); } }
    bar.addEventListener('click', function (e) { seek(e.clientX); });
    bar.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') audio.currentTime += 5; else if (e.key === 'ArrowLeft') audio.currentTime -= 5; else return; tick(); });
    tick(); audio.play().catch(function () { setPP(); });   // 자동 재생이 막히면 ▶ 를 누르게 둔다
    track('mv_ready', { topic: song.topic });
  }
  function close() {
    var el = document.getElementById('mv-sheet'); if (!el) return;
    if (el._stop) el._stop(); if (el._audio) { try { el._audio.pause(); el._audio.src = ''; } catch (e) { } }
    el.parentNode.removeChild(el); document.documentElement.style.overflow = '';
  }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  if (root.document && root.fetch) { try { ready(); } catch (e) { } }
  R.MusicVideo = { WORLD_TOPIC: WORLD_TOPIC, ready: ready, localFlag: localFlag, cardHtml: cardHtml, open: open, close: close, compactSd: compactSd, topicOfWorld: function (w) { return WORLD_TOPIC[w] || null; } };
})(typeof window !== 'undefined' ? window : globalThis);
