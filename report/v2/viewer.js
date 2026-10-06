/* 만트라 사주 무빙툰 v2 뷰어: 입력 → 계산(기존 Manse 엔진) → 단계형 로딩 → 캐릭터 소개 영상(있을 때) → 프롤로그 → ACT/챕터 스크롤 리포트 → 최종 화면.
   모든 장면(Scene)은 ReportV2.Compose.build 가 만든 데이터를 그리기만 한다. 입력한 생년월일은 서버로 보내지 않는다. */
(function () {
  'use strict';
  var R = window.ReportV2, T0 = R.Analytics.trackEvent, T = function (n, p) { if (!/[?&]preview=1/.test(location.search)) T0(n, p); }, SEA = R.SajuData.SEASONS;
  var $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var CITIES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수', 127.66], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['창원', 128.68], ['진주', 128.11], ['춘천', 127.73], ['강릉', 128.90], ['제주', 126.53]];
  var EL_COLOR = { wood: '#5E9E78', fire: '#D0634A', earth: '#BC9C62', metal: '#AEB9C6', water: '#4A7AB5' };
  var SEA_ICON = { opportunity: '◆', expansion: '▲', harvest: '●', accumulation: '■', transition: '◇', defense: '▽' }; // 색만으로 상태를 구분하지 않도록 글자·기호를 함께 쓴다
  var STAGES = ['타고난 명(命)을 읽고 있습니다', '기질과 힘의 방향을 가늠하고 있습니다', '10년마다 달라지는 운의 길을 이어 붙이고 있습니다', '움직일 때와 준비할 때를 가리고 있습니다', '한 편의 運路로 구성하고 있습니다'];
  var PREVIEW = /[?&]preview=1(&|$)/.test(location.search);
  var S = { bg: [], cur: false, sd: null, rep: null, pack: null, awk: null, idx: 0, visited: {}, ended: {}, scroll: {}, name: '', pdfUnlocked: false, started: false, media: [] };
  var view = function (v) { if (v !== 'reader' && S.mv) { S.mv.destroy(); S.mv = null; } $('#app').dataset.view = v; $$('.view').forEach(function (e) { e.hidden = e.id !== 'v-' + v; }); window.scrollTo(0, 0); };
  function toast(msg, ms) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 3200); }
  var sg = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, ss = function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } };

  /* ── 1. 입력 ──────────────────────────────────────────────────────────── */
  var F = $('#form');
  (function initForm() {
    var y = new Date().getFullYear(), minY = (window.Manse && window.Manse.MIN_Y) || 1900, o = function (a, b, sel, suf) { var h = ''; for (var i = a; i <= b; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + suf + '</option>'; return h; };
    F.year.innerHTML = o(minY, y, 1990, '년'); F.month.innerHTML = o(1, 12, 1, '월'); F.day.innerHTML = o(1, 31, 1, '일');
    F.city.innerHTML = CITIES.map(function (c) { return '<option value="' + c[1] + '">' + c[0] + '</option>'; }).join('');
    function fix() { F.querySelector('.leap').hidden = F.calendar.value !== 'lunar'; F.time.disabled = F.unknown.checked; }
    F.addEventListener('change', fix); fix();
  })();
  F.addEventListener('submit', function (e) {
    e.preventDefault(); var msg = $('#msg'); msg.textContent = '';
    if (!window.Manse) { msg.textContent = '분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'; return; }
    if (!F.gender.value) { msg.textContent = '성별을 선택해 주세요.'; return; }
    var t = F.time.value, hasT = !F.unknown.checked && /^\d\d:\d\d$/.test(t);
    var inp = { year: +F.year.value, month: +F.month.value, day: +F.day.value, hour: hasT ? +t.slice(0, 2) : null, minute: hasT ? +t.slice(3) : 0, calendar: F.calendar.value, leap: F.calendar.value === 'lunar' && F.leap.checked, gender: F.gender.value, lon: +F.city.value, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
    var ch; try { ch = window.Manse.compute(inp); } catch (err) { msg.textContent = (err && err.message) || '입력을 확인해 주세요.'; return; }
    S.name = String(F.name.value || '').trim().slice(0, 20); S.ch = ch; start(ch, inp.gender);
  });

  /* ── 2. 계산 결과 → 데이터 로딩(단계형 안내) → 리포트 구성 ───────────────── */
  // ?project=love 처럼 프로젝트(상품)를 고른다. 없거나 모르는 값이면 종합(full)
  function projectId() { var m = /[?&]project=([\w.-]{1,40})/.exec(location.search); return m ? m[1] : 'full'; }
  function getJson(u) { return fetch(u).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }); }
  function birthOf(ch) { // 만세력이 정한 양력 출생일시(시 모름이면 시각 없음) + 입력한 출생지 이름
    var s = ch.solar || {}, lon = ch.input && ch.input.lon, c = CITIES.filter(function (x) { return x[1] === lon; })[0];
    return { y: s.y, m: s.m, d: s.d, hour: ch.hourKnown ? s.h : null, minute: ch.hourKnown ? s.mi : 0, hourKnown: !!ch.hourKnown, place: c ? c[0] : '' };
  }
  function start(ch, gender) {
    view('load'); var tx = $('#loadText'), i = 0, tick;
    function show() { tx.style.opacity = 0; setTimeout(function () { tx.textContent = STAGES[Math.min(i, STAGES.length - 1)]; tx.style.opacity = 1; i++; }, 250); }
    show(); tick = setInterval(show, 1100);
    var sd; try { sd = R.SajuData.build(ch, { now: Date.now() }); } catch (e) { clearInterval(tick); view('input'); $('#msg').textContent = '계산 결과를 정리하지 못했습니다.'; return; }
    S.sd = sd; S.birth = birthOf(ch); var t0 = Date.now();
    // 서버 저장본(콘텐츠·미디어·일간 소개 영상)은 필요한 것만 요청한다. 실패해도 기본 시드로 계속 진행한다.
    Promise.all([getJson('/api/report-content'), getJson('/api/media'), getJson('/api/awakening?pillar=' + encodeURIComponent(sd.dayPillar.ko) + '&gender=' + sd.gender), getJson('/api/story')]).then(function (a) {
      var wait = Math.max(0, 2600 - (Date.now() - t0));
      return new Promise(function (ok) { setTimeout(function () { ok(a); }, wait); });
    }).then(function (a) {
      S.media = a[1].media || []; S.pack = R.Compose.fromSaved(a[0].content, S.media, projectId()); S.ts = S.pack.textStyles;
      S.rep = R.Compose.build(sd, S.pack.lib, S.pack.cfg, { name: S.name }); S.awk = { video: (a[2] && a[2].video) || null, ilgan: (a[2] && a[2].ilgan) || null, fallback: (a[2] && a[2].fallback) || null, textOnly: !!(a[2] && a[2].textOnly) }; S.story = a[3] && a[3].story; if (R.Bgm) R.Bgm.init(S.pack.bgm); // 배경 음악(있을 때만)
      return aiCompose().then(function () { return a; });
    }).then(function () {
      clearInterval(tick);
      try { localStorage.setItem('mt_v2_seen', '1'); } catch (e) { }
      T('report_started', { hourKnown: sd.birth.hourKnown, chapters: S.rep.chapters.length });
      startGate();
    }).catch(function () { clearInterval(tick); view('input'); $('#msg').textContent = '리포트를 구성하지 못했습니다. 잠시 후 다시 시도해 주세요.'; });
  }

  // AI 컴포저(선택): 최대 9초만 기다리고, 실패·시간 초과·응답 불량이면 원본 모듈 문장으로 그대로 진행한다. 같은 리포트 키는 기기에도 캐시한다.
  function aiCompose() {
    var rep = S.rep, key = 'mt_v2_ai_' + rep.meta.key, cached = null; try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
    if (cached) { R.Compose.applyResult(rep, cached, S.pack.lib); return Promise.resolve(); }
    var body = { payload: R.Compose.aiPayload(rep), media: R.Compose.mediaPayload(rep, S.pack.lib) }, ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch('/api/compose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl && ctl.signal }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok && d.result) { R.Compose.applyResult(rep, d.result, S.pack.lib); try { localStorage.setItem(key, JSON.stringify(d.result)); } catch (e) { } } })
      .catch(function () { }).then(function () { clearTimeout(timer); });
  }

  /* ── 3. 캐릭터 소개(영상이 있을 때만): ① 일간 소개(10일간×성별 20) → ② 일주 캐릭터(60일주×성별 120) 영상. ──
     음소거 자동재생·SKIP·소리 켜기·poster 대체. 영상이 없으면 이 단계는 건너뛰고, 끝나면 자동으로 프롤로그로 넘어간다. */
  function playStage(cfg) {
    view('awk'); var box = $('#awkMedia'), clip = cfg.clip || null, done = false;
    var cap = $('#awkCap'), start = $('#awkStart'), snd = $('#awkSound'), skip = $('#awkSkip');
    start.hidden = true; snd.hidden = true; skip.hidden = false;
    var title = cfg.title, sub = cfg.sub || '', kw = cfg.kw || [], poster = clip && clip.posterUrl || '', rp = cfg.kind === 'iju' ? 'awk' : 'ilgan', ev = cfg.kind === 'iju' ? 'iju' : 'ilgan';
    cap.innerHTML = '<div class="t" data-tx="' + rp + '.title">' + esc(title) + '</div>' + (sub ? '<div class="s" data-tx="' + rp + '.sub">' + esc(sub).replace(/\n/g, '<br>') + '</div>' : '') + (kw.length ? '<div class="k" data-tx="' + rp + '.kw">' + kw.map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>' : '');
    if (cfg.capHtml) cap.innerHTML = cfg.capHtml; if (cfg.noCap) cap.innerHTML = ''; cap.style.opacity = ''; cap.classList.remove('mcard'); var capT = cfg.capMs ? setTimeout(function () { cap.style.transition = 'opacity .6s'; cap.style.opacity = 0; }, cfg.capMs) : 0; // 소개 문구는 capMs 뒤에 사라진다(영상은 계속)
    function endCard(kind) { // 영상이 끝난 뒤 보여 주는 짧은 카드(일주 소개). 건너뛰기 하면 카드도 건너뛴다
      clearTimeout(capT); var cd = cfg.card; if (!cd || kind === 'skipped') { cfg.onDone(kind); return; }
      cap.style.transition = 'none'; cap.style.opacity = 1; cap.classList.add('mcard'); cap.innerHTML = cd.html; skip.hidden = false;
      var t = setTimeout(function () { cap.classList.remove('mcard'); cfg.onDone(kind); }, cd.ms); skip.onclick = function () { clearTimeout(t); cap.classList.remove('mcard'); cfg.onDone('skipped'); };
    }
    function finish(kind) {
      if (done) return; done = true; clearTimeout(capT); skip.hidden = true; snd.hidden = true; if (R.Bgm) R.Bgm.duck(false);
      if (kind === 'completed') T(ev + '_video_completed', {}); else if (kind === 'skipped') T(ev + '_video_skipped', {});
      endCard(kind);
    }
    function still() { if (done) return; done = true; endCard('missing'); } // 영상이 없거나 재생이 막힌 경우: 건너뜀
    txApply(cap, '_', true); // 자막 스타일(영상 단계)
    var url = clip && (clip.videoUrl || clip.videoWebm);
    if (cfg.cardOnly) { box.innerHTML = ''; still(); return; }
    if (!url && cfg.textOnly && (title || sub)) { // 영상이 없어도 문구 화면(설정 "영상 없어도 문구만 보여 주기"): 포스터가 있으면 배경으로, 몇 초 뒤 자동으로 넘어간다
      box.innerHTML = poster ? '<img alt="" src="' + esc(poster) + '" style="width:100%;height:100%;object-fit:cover">' : ''; var tm = setTimeout(function () { finish('completed'); }, cfg.capMs ? cfg.capMs + 600 : 7000);
      skip.onclick = function () { clearTimeout(tm); finish('skipped'); };
    }
    else if (!url || saveData && !poster) { still(); }
    else {
      var v = document.createElement('video'); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.autoplay = true; v.preload = 'auto'; v.setAttribute('aria-label', title + ' 영상'); if (poster) v.poster = poster;
      if (clip.videoWebm && v.canPlayType && v.canPlayType('video/webm')) { var s1 = document.createElement('source'); s1.src = clip.videoWebm; s1.type = 'video/webm'; v.appendChild(s1); }
      if (clip.videoUrl) { var s2 = document.createElement('source'); s2.src = clip.videoUrl; s2.type = /\.webm(\?|$)/.test(clip.videoUrl) ? 'video/webm' : 'video/mp4'; v.appendChild(s2); }
      box.innerHTML = ''; box.appendChild(v);
      v.addEventListener('playing', function once() { v.removeEventListener('playing', once); T(ev + '_video_started', {}); snd.hidden = false; });
      v.addEventListener('ended', function () { finish('completed'); });
      v.addEventListener('error', function () { if (!done) { v.remove(); still(); } }, true);
      var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = false; if (poster) v.load(); setTimeout(function () { if (v.paused && !done) { v.remove(); still(); } }, 1200); });
      snd.onclick = function () { v.muted = !v.muted; if (R.Bgm) R.Bgm.duck(!v.muted); snd.setAttribute('aria-pressed', String(!v.muted)); snd.textContent = v.muted ? '🔇 소리 켜기' : '🔊 소리 끄기'; };
      skip.onclick = function () { v.pause(); finish('skipped'); };
    }
  }
  // 영상에 관리자가 쓴 부제가 없으면 기본 설명(일간 4줄·일주 4줄)을 보여 준다
  function introLines(kind) { var T = R.IntroText, sd = S.sd; if (!T || !sd) return ''; return (kind === 'ilgan' ? T.ilgan(sd.dayMaster.stem) : T.iju(sd.dayPillar.ko)).join('\n'); }
  function ilganStage(next) { // 일간 소개: 3~5초 이내의 짧은 카드(庚金 · 경금 + 한 문장). 영상은 그대로 재생하고 문구만 4.5초 뒤 사라진다
    var ig = S.awk && S.awk.ilgan, sd = S.sd, tOnly = !!(S.awk && S.awk.textOnly);
    if (!ig || !(ig.videoUrl || ig.videoWebm || tOnly)) { next(); return; }
    var c = R.IntroText.ilganCard(sd.dayMaster.stem, S.name); if (!c) { next(); return; }
    var hh = function (t) { return esc(t).replace(/\n/g, '<br>'); };
    playStage({ textOnly: tOnly, clip: ig, title: c.title, sub: c.line, kw: [], capMs: 4500, capHtml: (c.name ? '<div class="ic-name">' + hh(c.name) + '</div>' : '') + '<div class="ic-film">' + hh(c.line) + '</div><div class="ic-ttl">' + esc(c.title) + '</div>', onDone: next });
  }
  /* ── 3b. 프롤로그 → 리포트. 사용자가 곧 이야기의 주인공이다. 결제·무료 결과 화면은 두지 않는다. ── */
  function ijuStage(next) { // 일주: 기존 변신(캐릭터) 영상은 설명 없이 재생 → 끝나면 주인공 소개 카드(이름 · 한 문장 · 庚午 · 경오일주 · 장점 1 + 약점 1) 약 7초
    var v = S.awk && S.awk.video, fb = S.awk && S.awk.fallback, sd = S.sd, clip = v || fb, hasClip = !!(clip && (clip.videoUrl || clip.videoWebm));
    var c = R.IntroText.ijuCard(sd.dayPillar.ko, S.name, sd.gender), br = function (t) { return esc(t).replace(/\n/g, '<br>'); };
    var card = c ? { ms: 7000, html: '<div class="ic-name">' + br(c.name) + '</div><div class="ic-film">' + br(c.film) + '</div><div class="ic-ttl">' + esc(c.title) + '</div><div class="ic-trait">' + br(c.trait) + '</div>' } : null;
    if (!hasClip && !card) { next(); return; }
    playStage({ kind: 'iju', clip: hasClip ? clip : null, noCap: true, cardOnly: !hasClip, card: card, onDone: next });
  }
  // 본편 연결: 일주 소개 직후 두 문장(약 6초) → 본편 인트로 또는 인생 지도
  function bridgeStage(next) {
    view('awk'); var box = $('#awkMedia'), cap = $('#awkCap'), skip = $('#awkSkip'), L = ['그렇다면 이런 기질을 타고난 사람은\n어떤 인생을 살아가게 될까요?', '당신의 인생 전체를\n먼저 펼쳐보겠습니다.'], i = 0, t, done = false;
    box.innerHTML = ''; $('#awkSound').hidden = true; $('#awkStart').hidden = true; skip.hidden = false; cap.className = 'awk-cap awk-mid'; cap.style.transition = 'opacity .5s'; cap.style.opacity = 0;
    function end() { if (done) return; done = true; clearTimeout(t); cap.className = 'awk-cap'; cap.style.opacity = ''; next(); }
    function show() { cap.style.opacity = 0; setTimeout(function () { if (done) return; cap.innerHTML = '<div class="s bs">' + esc(L[i]).replace(/\n/g, '<br>') + '</div>'; cap.style.opacity = 1; }, 400); t = setTimeout(function () { if (++i >= L.length) end(); else show(); }, 3000); }
    skip.onclick = end; show();
  }
  var withCopy = function (scenes) { return R.Translator.applyCopy(scenes, S.pack && S.pack.sceneCopy, R.Narrator.heroVars(S.sd, S.name)); }; // 관리자가 고친 문구·이름 강조(content.sceneCopy)
  // 탭해서 시작: 배경음악이 있으면 일간 소개 직전에 한 번 터치를 받는다(터치가 있어야 소리를 낼 수 있다). 음악이 없거나 꺼 둔 경우·미리보기에서는 바로 시작한다.
  function startGate() {
    if (PREVIEW || !R.Bgm || !R.Bgm.has() || R.Bgm.isMuted()) { intro(); return; }
    var nm = S.name; view('gate'); $('#gateName').innerHTML = nm ? esc(nm) + '에게는,<br>' + esc(nm) + '의 때가 있다.' : '모든 사람에게는,<br>각자의 때가 있다.';
    var b = $('#gateBtn'); b.onclick = function () { b.onclick = null; T('gate_tapped', {}); intro(); }; try { b.focus({ preventScroll: true }); } catch (e) { }
  }
  function intro() { if (R.Bgm) R.Bgm.play('cinematic'); ilganStage(function () { ijuStage(function () { bridgeStage(LIFE ? lifeBegin : prologue); }); }); } // 배경음악은 일간 인트로(첫 화면)부터 흐른다(입력 제출 = 사용자의 첫 터치)
  function cinemaMediaFor(used) { return function (sc) { if (sc.bg === 'black' || sc.phTone) return null; return R.Director.pickMedia(sc, (S.pack && S.pack.lib && S.pack.lib.media) || S.media, { usedIds: used }, sc.chapterId || 'c00'); }; }
  /* 재생 속도(관리자 설정 flow.playbackRate · 확인용 ?rate=3): INTRO 타임라인·본문 머묾·이동에 적용한다. 허용: 0.5 · 0.75 · 1 · 1.25 · 1.5 · 2 · 3 */
  var RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  function playbackRate() { var m = /[?&]rate=([\d.]+)/.exec(location.search), v = m ? +m[1] : +(S.pack && S.pack.flow && S.pack.flow.playbackRate); return RATES.indexOf(v) >= 0 ? v : 1; }
  // 저사양·동작 줄이기·데이터 절약: INTRO 의 ink/scale 연출을 fade 로 대신한다
  var lowFx = reduce || saveData || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
  // INTRO 는 배경음악 신호(끊기·올리기)만 쓴다. 효과음(SFX)·음성(TTS)은 없다 — 북·바람 신호(drum·deepDrum·sfx)는 데이터로만 남아 있고 재생하지 않는다.
  function introCue(c) {
    var k = c.cue || '', B = R.Bgm && R.Bgm.mix ? R.Bgm : null; if (!B) return;
    if (k === 'bgmCut') B.mix(0, 350); else if (k === 'bgmUp') B.mix(1, 2400); else if (k === 'full') B.mix(1.6, 1500); else if (k === 'bgmDrone') B.mix(0.45, 800);
  }
  // 글자 애니메이션은 INTRO(프롤로그)에서만 허용한다(allowTextAnimation). 엔딩·본문은 단순 fade 만.
  function playCinema(scenes, onEnd, label, skipLabel) {
    if (!R.CinemaRender || !scenes || !scenes.length) { onEnd('missing'); return; }
    view('cinema'); var stage = $('#cnStage'), used = [], introMode = label === '프롤로그';
    S.cn = R.CinemaRender.play(stage, scenes, { reduce: reduce, saveData: saveData, intro: introMode, lowFx: lowFx, rate: playbackRate(), mediaFor: cinemaMediaFor(used), layers: [], label: label, skipLabel: skipLabel, onScene: function (sc, c) { if (R.Bgm) R.Bgm.play(c.bgmMood); },
      onCue: introCue,
      onEnd: function (kind) { if (R.Bgm && R.Bgm.mix) R.Bgm.mix(1, 900); S.cn = null; onEnd(kind); } });
  }
  /* 프롤로그: "모든 사람에게는 각자의 이야기가 있다" → 주인공 이름 → 타이틀 → 캐릭터 프로필 → 영화로 비유하면 → CHAPTER 01 */
  function introOverride() { var m = /[?&]intro=(short|journey|epic|cinematic|minimal)(&|$)/.exec(location.search); return m ? { style: { short: 'EPIC_WUXIA_JOURNEY_SHORT', journey: 'EPIC_WUXIA_JOURNEY', epic: 'EPIC_WUXIA_PARODY', cinematic: 'CINEMATIC', minimal: 'MINIMAL' }[m[1]] } : {}; } // 확인용: ?intro=journey
  function prologueScenes() { // 실제 재생과 관리자 미리보기가 같은 장면을 만든다
    var sd = S.sd, E = Object.assign({}, R.EpicIntro && R.EpicIntro.DEFAULTS, (S.pack && S.pack.introEpic) || {}, introOverride());
    return { E: E, scenes: withCopy(R.Translator.prologue(sd, S.name, R.Narrator.heroVars(sd, S.name), { style: E.style, humor: E.humor, epicLevel: E.epicLevel, birth: S.birth, nowYear: sd.nowYear })) };
  }
  function prologue() {
    T('prologue_started', {}); var p = prologueScenes();
    if (/^EPIC_WUXIA_/.test(p.E.style) && R.Bgm && R.Bgm.mix) R.Bgm.mix(0.45, 300);
    playCinema(p.scenes, function (kind) { T(kind === 'skipped' ? 'prologue_skipped' : 'prologue_completed', {}); beginReader(); }, '프롤로그');
  }
  /* 엔딩: 사주는 결말을 적어 놓은 대본이 아니다 … 다음 장면을 만드는 사람은 결국 당신이다 */
  function endingCinema(then) {
    var sd = S.sd; S.scroll.doc = window.scrollY; T('ending_started', {});
    playCinema(withCopy(R.Translator.ending(sd, S.name, R.Narrator.heroVars(sd, S.name))), function () { then(); }, '엔딩');
  }
  var elKey = function (k) { return { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' }[k] || 'water'; };

  /* ── 4. 리포트(챕터·Scene) ──────────────────────────────────────────────── */
  /* ── 4a. 인생 지도 흐름(?flow=life): 기존 챕터는 그대로 두고, 이야기 순서만 StoryDirector 가 정한다 ── */
  var LIFE = /[?&]flow=life(&|$)/.test(location.search);
  function lifeChapters(bases) { var all = S.repAll.chapters, out = []; bases.forEach(function (b) { all.forEach(function (c) { if ((c.base || c.id) === b && out.indexOf(c) < 0) out.push(c); }); }); return out; }
  function lifePlay(bases, o) {
    var chs = lifeChapters(bases); if (!chs.length) { toast('이 이야기는 아직 준비 중입니다.'); if (o.onBack) o.onBack(); return; }
    S.rep = Object.assign({}, S.repAll, { acts: [{ id: 1, roman: o.kicker || 'DEEP DIVE', title: o.title || '', line: '', pdfDone: '' }], chapters: chs.map(function (c, i) { var x = Object.assign({}, c); x.act = 1; x.no = i + 1; x.actTransition = null; var rn = o.rename && o.rename[i]; if (rn) { x.title = rn.title || x.title; x.subtitle = rn.sub || x.subtitle; } return x; }) }); // rename: 전문용어 대신 사용자 질문을 제목으로, 명리 용어는 부제로
    S.lifeBack = function () { $('#lifeBack').hidden = true; if (S.mv) { S.mv.destroy(); S.mv = null; } o.onBack && o.onBack(); };
    S.visited = {}; S.ended = {}; view('reader'); $('#lifeBack').hidden = false; openDoc(0, { autoStart: !PREVIEW });
  }
  function lifeBegin() {
    S.repAll = S.rep; var plan = (S.repAll.chapters.filter(function (c) { return c.plan; })[0] || {}).plan || null;
    $('#lifeBack').onclick = function () { if (S.lifeBack) S.lifeBack(); };
    R.Life.begin({ M: window.Manse, ch: S.ch, sd: S.sd, now: Date.now(), name: S.name, interest: S.interest || '', plan: plan, gate: /[?&]gate=1(&|$)/.test(location.search), show: function () { view('life'); }, track: T, toast: toast, playChapters: lifePlay });
  }
  function beginReader() { view('reader'); openDoc(0, { autoStart: !PREVIEW }); }

  var seaChip = function (k, name) { var hj = R.Translator && R.Translator.SEASON[k]; return k ? '<span class="sea s-' + k + '"><b aria-hidden="true">' + SEA_ICON[k] + '</b>' + (hj ? '<i class="hj" aria-hidden="true">' + hj.h + '</i> ' : '') + esc(name || SEA[k]) + '</span>' : ''; };
  var list = function (a) { a = Array.isArray(a) ? a : (a ? [a] : []); return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
  var lines = function (t) { return esc(t).replace(/\n/g, '<br>'); };

  /* ── 시네마틱 장면: 챕터 오프닝·현실 장면(리더 안에서 화면에 들어오면 재생) ── */
  function layersOf(s) { return R.Director ? R.Director.layersFor(s, S.pack && S.pack.cinemaDefaults) : []; }
  // 시네마 장면(챕터 오프닝·현실 장면)은 문서 안의 정적 섹션이다. 문장 분절·강조는 그대로 쓰되 글자는 움직이지 않는다. 배경 미디어는 고정 배경이 맡는다.
  function cinemaHtml(c, s) {
    s = withCopy([s])[0];
    var b = R.Cinema.build(s, layersOf(s)), blocks = {}, nm = b.c.nameEmphasis !== 'NONE';
    b.segments.forEach(function (g) { (blocks[g.block] = blocks[g.block] || []).push(g); });
    var body = Object.keys(blocks).map(Number).sort(function (x, y) { return x - y; }).map(function (k) {
      return '<p class="rd-line" data-tx="scene.caption">' + blocks[k].map(function (g) { return '<span data-e="' + g.emphasis + '"' + (g.name && nm ? ' data-nm="1"' : '') + '>' + esc(g.text) + '</span>'; }).join(' ') + '</p>';
    }).join('');
    var kick = s.kind === 'opener' && s.hook ? '<div class="rd-kick">' + esc(s.hook.label) + '</div>' : '';
    return '<section class="scene rd-cin' + (s.kind === 'opener' ? ' rd-open' : '') + '" data-sc="' + esc(s.sceneId) + '">' + kick + body + '</section>';
  }
  var BG_BLACK = '-1', BG_PH = '-2';
  // 장면 → 읽기 섹션: rd-sec 클래스 · 소속 챕터 · 고정 배경(미디어 번호)을 붙인다. 배경이 없는 섹션은 앞 배경을 그대로 이어 쓴다.
  function secWrap(h, s, c, ci) {
    var m = h && /^<section ([^>]*)>/.exec(h); if (!m) return h;
    var attrs = m[1].replace(/\brv\b/g, '').replace(/class="/, 'class="rd-sec ').replace(/\s+/g, ' ') + ' data-ch="' + ci + '" data-layout="' + layoutOf(s) + '"';
    var bgv = s.bg === 'black' ? BG_BLACK : s.media ? String(S.bg.push(s.media) - 1) : (s.sceneType === 'chapterIntro' ? BG_PH : null);
    if (bgv != null) attrs += ' data-bg="' + bgv + '" data-pc="' + EL_COLOR[((s.intent && s.intent.desiredElements) || ['water'])[0]] + '"' + (s.sceneType === 'chapterIntro' && c.actTransition ? ' data-dip="1"' : '');
    return '<section ' + attrs + '>' + h.slice(m[0].length);
  }
  // 레이아웃 종류의 기준값(자동): TEXT · TEXT_MEDIA · HIGHLIGHT · DATA · TIMELINE · QUOTE · CHAPTER_HEADER
  function layoutOf(s) { var t = s.sceneType; return t === 'chapterIntro' ? 'CHAPTER_HEADER' : t === 'chart' || t === 'dataVisualization' ? 'DATA' : t === 'timeline' ? 'TIMELINE' : t === 'chapterEnding' ? 'QUOTE' : /^verdict/.test(t) ? 'HIGHLIGHT' : s.media ? 'TEXT_MEDIA' : 'TEXT'; }

  function sceneHtml(c, s, i) {
    var t = s.sceneType, id = 'data-sc="' + esc(s.sceneId) + '"';
    if (t === 'cinema') return cinemaHtml(c, s);
    if (t === 'chapterIntro') {
      var act = S.rep.acts.filter(function (a) { return a.id === c.act; })[0] || {};
      return '<section class="scene rd-head rd-chead" ' + id + '><div class="rd-rule" aria-hidden="true"></div><div class="no" data-tx="intro.no">' + esc(act.roman || '') + ' · ' + String(c.no).padStart(2, '0') + '</div><h2 data-tx="intro.title">' + esc(c.title) + '</h2><p class="hl" data-tx="intro.headline">' + lines(c.headline) + '</p>' + (c.introText || s.subtitle ? '<p class="intro" data-tx="intro.note">' + esc(c.introText || s.subtitle) + '</p>' : '') + '<div class="rd-rule" aria-hidden="true"></div></section>';
    }
    if (t === 'insight') return '<section class="scene rv" ' + id + '><div class="cap">풀이</div><span class="fact" data-tx="insight.fact">' + esc(s.fact || c.fact) + '</span><p class="lead' + (c.lead && /_fallback$/.test(c.lead.id || '') ? ' faint' : '') + '" data-tx="insight.lead">' + lines(s.body) + '</p>' + (c.choice ? '<p class="lead choice rd-hl" data-tx="choice.line">' + lines(c.choice) + '</p>' : '') + '' + '</section>';
    if (t === 'verdictFind') return '<section class="scene rv s-verdict" ' + id + '><div class="cap">' + esc(s.headline) + '</div><p class="lead rd-hl">' + lines(s.body) + '</p></section>';
    if (t === 'verdictBlock') return '<section class="scene rv s-verdict" ' + id + '><div class="cap">' + esc(s.headline) + '</div>' + (s.sub ? '<p class="lead" style="font-size:1.05rem">' + esc(s.sub) + '</p>' : '') + '<p style="color:var(--ink2)">' + lines(s.body) + '</p></section>';
    if (t === 'verdictEvidence') return '<section class="scene rv s-verdict" ' + id + '><div class="cap">' + esc(s.headline) + '</div><p class="lead">' + lines(s.body) + '</p><div class="vd" role="group" aria-label="맞는지 알려 주세요"><button type="button" class="btn" data-vd="yes">맞습니다</button><button type="button" class="btn" data-vd="no">아닙니다</button></div><p class="vd-reply faint" aria-live="polite" data-yes="' + esc((s.evidence || {}).yes) + '" data-no="' + esc((s.evidence || {}).no) + '"></p></section>';
    if (t === 'verdictAdvice') return '<section class="scene rv s-verdict" ' + id + '><div class="cap">' + esc(s.headline) + '</div><p class="lead" style="font-size:1.05rem">' + lines(s.body) + '</p><div class="cards"><div class="card">' + list(((s.bullets || [])[0] || {}).items || []) + '</div></div></section>';
    if (t === 'chart') { var ch = R.Charts.html(s.chart, S.sd, { chapter: s.chartBase }); return ch ? '<section class="scene rv" ' + id + '><div class="cap">만세력이 읽은 값</div>' + ch + '<p class="faint">이 값이 이어지는 풀이의 근거입니다.</p></section>' : ''; }
    if (t === 'topics') return '<section class="scene rv" ' + id + '><div class="cap">더 알아보기</div><div class="tps">' + (s.cards || []).map(function (k) {
      return '<article class="tp"><small>' + (k.hanja ? '<i class="hj" aria-hidden="true">' + esc(k.hanja) + '</i> ' : '') + esc(k.title) + '</small><h3>' + esc(k.headline) + '</h3><p>' + esc(k.summary) + '</p></article>'; }).join('') + '</div></section>';
    if (t === 'terms') return '<section class="scene rv" ' + id + '><div class="cap">쉬운 용어 풀이</div><div class="tms">' + (s.terms || []).map(function (k) {
      return '<article class="tm"><div class="tmh"><b>' + esc(k.term) + '</b>' + (k.hanja ? '<i aria-hidden="true">' + esc(k.hanja) + '</i>' : '') + '</div>' + (k.here ? '<p class="tmhere">' + esc(k.here) + '</p>' : '') + '<p>' + esc(k.plain) + '</p>' + (k.analogy ? '<p class="tmeg">' + esc(k.analogy) + '</p>' : '') + '</article>'; }).join('') + '</div></section>';
    if (t === 'explanation') {
      var det = (c.details || []).map(function (d) { return /_fallback$/.test(d.id || '') ? '<p class="faint">' + esc(d.summary) + '</p>' : '<div class="item"><b>' + esc(d.headline) + '</b><span>' + esc(d.summary) + '</span>' + (d.detail ? '<em class="tip">' + esc(d.detail) + '</em>' : '') + '</div>'; }).join('');
      var mt = String(c.meaning || ''), cut = mt.search(/[.!?]\s/), first = cut > 0 ? mt.slice(0, cut + 1) : mt, rest = cut > 0 ? mt.slice(cut + 1).trim() : '';
      var more = rest || det ? '<div class="more open"><div class="body"><div>' + (rest ? '<p>' + lines(rest) + '</p>' : '') + det + '</div></div></div>' : '';
      return '<section class="scene rv" ' + id + '>' + '' + '<div class="cap">풀이 · 더 깊이</div><p class="lead" data-tx="explain.lead">' + lines(first) + '</p>' + more + '</section>';
    }
    if (t === 'dataVisualization') return monthsHtml(c, s);
    if (t === 'timeline') return timelineHtml(c, s);
    if (t === 'recommendation') return recoHtml(c, s);
    if (t === 'warning') return '<section class="scene rv" ' + id + '>' + '' + '<div class="cards">' + (s.bullets || []).map(function (b, i) { return '<div class="card' + (i ? '' : ' warn') + '"><h3>' + esc(b.label) + '</h3>' + list(b.items) + '</div>'; }).join('') + '</div></section>';
    if (t === 'action') return actionHtml(c, s);
    if (t === 'chapterEnding') {
      var last = c === S.rep.chapters[S.rep.chapters.length - 1];
      return '<section class="scene s-end rv" ' + id + '>' + (c.disclaimer ? '<p class="disc" style="margin:0 0 26px">' + esc(c.disclaimer) + '</p>' : '') + (c.cta ? '<button type="button" class="btn" data-cta="' + esc(c.cta.action) + '" style="margin-bottom:26px">' + esc(c.cta.label) + '</button>' : '') +
        '<p class="q rd-hl" data-tx="end.quote">' + lines(c.headline) + '</p>' + (s.nextHook ? '<p class="nexthook"><small>다음 길 · ' + esc(s.nextHook.label) + '</small>' + lines(s.nextHook.line) + '</p>' : '') + (last ? '<button type="button" class="btn gold big" id="finishBtn">나의 이야기 마무리하기</button>' : '') + '</section>';
    }
    return '';
  }

  function monthsHtml(c, s) {
    var items = s.data || [];
    return '<section class="scene rv" data-sc="' + esc(s.sceneId) + '"><div class="cap">12 MONTHS</div><p class="lead" style="font-size:.95rem;color:var(--ink2)">좋고 나쁨이 아니라 달마다 어울리는 움직임이 다릅니다. 달을 눌러 보세요.</p><div class="months" role="group" aria-label="앞으로 12개월">' +
      items.map(function (m, i) { return '<button type="button" class="mo' + (m.isNow ? ' now' : '') + '" data-mo="' + i + '" aria-label="' + m.month + '월 ' + esc(m.seasonName || '') + '" style="background:var(--panel);color:inherit"><b>' + m.month + '월</b>' + seaChip(m.season, m.seasonName) + '</button>'; }).join('') + '</div><div class="card modetail" id="moDetail" aria-live="polite"></div></section>';
  }
  function moDetail(c, i) {
    var m = ((c.items || [])[i]) || {}, x = (m.module && m.module.extra) || {}, box = $('#moDetail'); if (!box) return;
    box.innerHTML = '<h3>' + m.month + '월 · ' + esc(m.seasonName || '') + '</h3><p style="color:var(--ink2)">' + esc((m.module && m.module.headline) || '') + (x.state ? ' — ' + esc(x.state) : '') + '</p>' +
      (x.dos && x.dos.length ? '<div class="cap" style="margin-top:12px">DO</div>' + list(x.dos) : '') + (x.cautions && x.cautions.length ? '<div class="cap" style="margin-top:8px">CAUTION</div>' + list(x.cautions) : '');
  }
  function timelineHtml(c, s) {
    return '<section class="scene rv" data-sc="' + esc(s.sceneId) + '"><div class="cap">10-YEAR SEASONS</div><div class="tl">' + (s.data || []).map(function (d) {
      return '<div class="tli' + (d.isCurrent ? ' cur' : '') + '"><div class="yr"><b>' + d.startAge + '세</b>' + d.startYear + '–' + String(d.endYear).slice(2) + '</div><div>' + seaChip(d.season, d.seasonName) + (d.isCurrent ? ' <span class="sea">지금</span>' : '') + '<small>' + esc(d.ganzhi) + ' 대운 · ' + esc((d.module && d.module.headline) || '') + '</small></div></div>'; }).join('') + '</div></section>';
  }
  function recoHtml(c, s) {
    var h = '<section class="scene rv" data-sc="' + esc(s.sceneId) + '">';
    if (c.kind === 'remedy') {
      var ch = (c.timing && c.timing.chain) || [];
      h += '<div class="cap">TIMING</div><div class="chain">' + ch.map(function (x, i) { return (i ? '<div class="ar" aria-hidden="true">↓</div>' : '') + '<div class="st"><small style="color:var(--ink3)">' + esc(x.level) + ' · ' + esc(x.ganzhi) + '</small><br>' + seaChip(x.season) + '</div>'; }).join('') + '<div class="ar" aria-hidden="true">↓</div></div>' +
        '<div class="strategy" aria-label="현재 전략">' + ((c.timing && c.timing.strategy) || []).map(function (x, i) { return (i ? '<i aria-hidden="true">→</i>' : '') + '<b>' + esc(x.label) + '</b>'; }).join('') + '</div><div class="cards">';
      var KO = { action: '행동', growth: '성장 · 학습', people: '사람', place: '공간', environment: '환경', timing: '타이밍' };
      ['action', 'growth', 'people', 'place', 'environment'].forEach(function (k) {
        var a = (c.remedy && c.remedy[k]) || []; if (!a.length) return;
        h += '<div class="card"><h3>' + KO[k] + '</h3>' + a.map(function (x) { return '<p style="margin-bottom:8px"><b style="font-weight:500">' + esc(x.title) + '</b>' + (x.kind === 'exercise' ? ' <span class="sea" style="padding:0 8px;font-size:.7rem">운동·활동</span>' : '') + '<br><span style="color:var(--ink2);font-size:.9rem">' + esc(x.summary) + '</span></p>'; }).join('') + '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="cards">' + (s.bullets || []).map(function (b) { return '<div class="card' + (b.label === '주의' || b.label === '위험 요소' || b.label === '갈등 패턴' ? ' warn' : '') + '"><h3>' + esc(b.label) + '</h3>' + list(b.items) + '</div>'; }).join('') + '</div>';
    }
    return h + '</section>';
  }
  var SUM = [['core', '나의 핵심'], ['strengths', '나의 강점'], ['weaknesses', '나의 약점'], ['work', '일'], ['money', '돈'], ['people', '사람'], ['love', '사랑'], ['growth', '성장'], ['body', '몸과 활동'], ['place', '공간'], ['daewoon', '현재 대운'], ['thisYear', '올해']];
  var chkKey = function (t) { return 'mt_v2_chk_' + t; };
  function actionHtml(c, s) {
    var h = '<section class="scene rv" data-sc="' + esc(s.sceneId) + '">';
    if (c.kind === 'summary' && c.plan) {
      var sm = S.rep.summary, p = c.plan, mo = sm.months || [];
      h += '<div class="cap">MY MANUAL</div><div class="cards">' + SUM.map(function (k) { return sm[k[0]] ? '<div class="card"><h3>' + k[1] + '</h3><p style="color:var(--ink)">' + esc(sm[k[0]]) + '</p></div>' : ''; }).join('') + (mo.length ? '<div class="card"><h3>앞으로 12개월</h3><p style="color:var(--ink2);font-size:.88rem">' + esc(mo.join(' · ')) + '</p></div>' : '') + '</div>' +
        '<div class="cap" style="margin-top:28px">STRATEGY</div><div class="strategy">' + p.strategy.map(function (x, i) { return (i ? '<i aria-hidden="true">→</i>' : '') + '<b>' + esc(x.label) + '</b>'; }).join('') + '</div>' +
        '<div class="cap">지금 해야 할 것</div><div class="check">' + p.checklist.map(function (x, i) { var k = chkKey(x), on = sg(k) === '1'; return '<label><input type="checkbox" data-chk="' + esc(k) + '"' + (on ? ' checked' : '') + '><span>' + esc(x) + '</span></label>'; }).join('') + '</div>' +
        (p.avoid.length ? '<div class="card warn" style="margin-top:14px"><h3>피해야 할 것</h3>' + list(p.avoid) + '</div>' : '');
    } else {
      var items = ((s.bullets || [])[0] || {}).items || [];
      var notes = ((s.bullets || [])[0] || {}).notes || [];
      h += '<div class="cap">ACTION</div><div class="cards"><div class="card"><ul>' + items.map(function (x, i) { return '<li>' + esc(x) + (notes[i] ? '<br><span class="faint" style="font-size:.8rem">' + esc(notes[i]) + '</span>' : '') + '</li>'; }).join('') + '</ul></div></div>';
    }
    return h + '</section>';
  }

  /* ── 문서(Reading Flow): 모든 챕터를 하나의 긴 문서로 이어 붙인다. 지나간 내용은 사라지지 않고, 챕터 사이에는 버튼 대신 넓은 여백과 헤더가 있다. ── */
  function actHeadHtml(c, ci) {
    var t = c.actTransition;
    return '<section class="scene rd-sec rd-head rd-act" data-ch="' + ci + '" data-layout="CHAPTER_HEADER" data-bg="' + BG_BLACK + '" data-dip="1"><div class="rd-rule" aria-hidden="true"></div><div class="no">' + esc(t.kicker) + '</div><h2>' + esc(t.headline) + '</h2><p class="hl">' + lines(t.body) + '</p><div class="rd-rule" aria-hidden="true"></div></section>';
  }
  function buildDoc() {
    var rep = S.rep, h = ''; S.bg = [];
    rep.chapters.forEach(function (c, ci) {
      if (c.actTransition) h += actHeadHtml(c, ci);
      h += '<article class="chap" id="ch-' + esc(c.id) + '" data-ch="' + ci + '" aria-label="' + esc(c.title) + '">' + c.scenes.map(function (s, k) { return secWrap(sceneHtml(c, s, k), s, c, ci); }).join('') + '</article>';
    });
    $('#chapter').innerHTML = h;
    rep.chapters.forEach(function (c) { if (c.kind === 'monthly') { var cur = (c.items || []).findIndex(function (x) { return x.isNow; }); moDetail(c, Math.max(0, cur)); } });
  }
  function openDoc(start, o) {
    o = o || {}; if (S.mv) { S.mv.destroy(); S.mv = null; } if (S.watch) { S.watch.destroy(); S.watch = null; }
    $('#barTot').textContent = S.rep.chapters.length; S.idx = start || 0; S.cur = false; buildDoc(); txApplyDoc(); document.title = '運路 · 만트라 사주 무빙툰';
    if (R.CinemaRender) S.watch = R.CinemaRender.watch($('#chapter'), { reduce: reduce }); // 그래프 막대가 처음 한 번만 짧게 자란다
    window.scrollTo(0, 0); mountReading(o.autoStart !== false); if (start > 0) gotoChapter(start, true);
  }
  function mountReading(auto) {
    S.mv = R.Reading.mount($('#chapter'), { flow: Object.assign({}, S.pack && S.pack.flow, { playbackRate: playbackRate() }), reduce: reduce, saveData: saveData, bgList: S.bg, autoStart: auto, bgm: R.Bgm && R.Bgm.has() ? R.Bgm : null, onSection: onSection, onEnd: onDocEnd,
      onProgress: function (fr) { $('#progFill').style.width = Math.round(fr * 1000) / 10 + '%'; $('#prog').setAttribute('aria-valuenow', String(Math.round(fr * 100))); } });
  }
  function resumeReader() { view('reader'); mountReading(false); window.scrollTo(0, S.scroll.doc || 0); if (S.mv) S.mv.measure(); }
  function gotoChapter(i, instant, resume) {
    var el = $('#chapter .chap[data-ch="' + i + '"]'); if (!el || !S.mv) return; var p = el.previousElementSibling; if (p && p.classList.contains('rd-act')) el = p; S.mv.gotoEl(el, instant, resume);
  }
  function onSection(sec) { // 현재 읽고 있는 섹션이 바뀔 때(자동 진행·직접 스크롤 모두)
    var ci = +sec.dataset.ch, c = S.rep.chapters[ci]; if (!c) return;
    if (ci !== S.idx || !S.cur) enterChapter(c, ci);
    if (sec.classList.contains('s-end') && !S.ended[c.id]) { S.ended[c.id] = 1; T('chapter_completed', { chapter: c.id }); checkUnlock(); }
  }
  function enterChapter(c, ci) {
    var rep = S.rep, n = rep.chapters.length, prev = S.cur ? rep.chapters[S.idx] : null, act = rep.acts.filter(function (a) { return a.id === c.act; })[0] || {}; S.idx = ci; S.cur = true;
    $('#barAct').textContent = act.roman || ''; $('#barTitle').textContent = act.title ? act.title + ' · ' + c.title : c.title; $('#barNo').textContent = String(c.no).padStart(2, '0'); $('#barTot').textContent = n;
    if (prev && prev.act !== c.act && !S.visited[c.id]) { T('act_completed', { act: prev.act }); var a = rep.acts.filter(function (x) { return x.id === prev.act; })[0]; if (a && a.pdfDone) toast(a.pdfDone, 3800); }
    if (!S.visited[c.id]) { S.visited[c.id] = 1; T('chapter_viewed', { chapter: c.id, act: c.act, no: c.no }); if ((c.base || c.id) === 'c19') T('remedy_viewed', {}); if (c.kind === 'summary') T('action_plan_viewed', {}); }
    if (R.Bgm && R.Bgm.has()) { var mo = c.scenes.filter(function (s) { return s.sceneType === 'insight' || s.sceneType === 'chapterIntro'; })[0]; R.Bgm.play(mo ? R.Cinema.resolve(mo, layersOf(mo)).bgmMood : 'minimal'); } // 챕터 분위기에 맞는 BGM
    checkUnlock(); ss('mt_v2_idx', String(ci));
  }
  function onDocEnd() { if (S.lifeBack) { var b = S.lifeBack; S.lifeBack = null; b(); return; } if (!PREVIEW) endingCinema(finalView); } // 끝까지 읽어 주면 엔딩 장면으로 이어진다
  // 문서 안 클릭·체크 처리(한 번만 등록). 어느 챕터의 것인지는 가장 가까운 .chap 에서 읽는다.
  (function () { var root = $('#chapter'), chOf = function (el) { var a = el.closest('.chap'); return S.rep.chapters[a ? +a.dataset.ch : S.idx]; };
    root.addEventListener('click', function (e) {
      var c = chOf(e.target);
      var mo = e.target.closest('[data-mo]'); if (mo) { $$('.mo.sel', root).forEach(function (x) { x.classList.remove('sel'); x.style.borderColor = ''; }); mo.style.borderColor = 'var(--gold)'; moDetail(c, +mo.dataset.mo); return; }
      var vd = e.target.closest('[data-vd]'); if (vd) { var rp = vd.closest('.scene').querySelector('.vd-reply'); $$('[data-vd]', vd.parentNode).forEach(function (x) { x.setAttribute('aria-pressed', String(x === vd)); x.style.borderColor = x === vd ? 'var(--gold)' : ''; }); if (rp) rp.textContent = rp.getAttribute('data-' + vd.dataset.vd) || ''; T('verdict_answer', { chapter: c.id, answer: vd.dataset.vd }); if (S.mv) S.mv.choiceMade(); return; }
      var cta = e.target.closest('[data-cta]'); if (cta) { T('compatibility_cta_clicked', { chapter: c.id }); toast('두 사람의 궁합은 곧 열립니다. 조금만 기다려 주세요.'); }
      if (e.target.id === 'finishBtn') { if (S.mv) S.mv.pause(); if (S.lifeBack) { onDocEnd(); return; } endingCinema(finalView); }
    });
    root.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-chk'); if (k) ss(k, e.target.checked ? '1' : '0'); });
  })();

  // PDF 해금: 관리자 requiredCompletionRate(챕터 방문 비율) 또는 기본값(최종 챕터 도달)
  function checkUnlock() {
    if (S.pdfUnlocked) return; var n = S.rep.chapters.length, rate = S.pack && S.pack.cfg && S.pack.cfg.project && S.pack.cfg.project.requiredCompletionRate; if (rate == null) rate = S.pack && S.pack.scoring && S.pack.scoring.requiredCompletionRate; var visited = Object.keys(S.visited).length;
    var ok = rate != null ? visited / n >= rate : !!S.visited[S.rep.chapters[n - 1].id];
    if (ok) { S.pdfUnlocked = true; T('pdf_unlocked', {}); }
  }

  /* ── 5. 최종 화면 ──────────────────────────────────────────────────────── */
  function finalView() {
    view('final'); T('report_completed', { viewed: Object.keys(S.visited).length }); checkUnlock();
    var rep = S.rep, a4 = rep.acts[rep.acts.length - 1], steps = rep.plan.strategy;
    $('#v-final').innerHTML = '<div class="fin"><p class="kicker">運路</p><h2>' + (S.name ? esc(S.name) + '에게는,<br>' + esc(S.name) + '의 때가 있다.' : '모든 사람에게는,<br>각자의 때가 있다.') + '</h2><p>' + rep.chapters.length + '개의 챕터를 지나왔다.<br>타고난 명부터 운의 흐름,<br>움직일 때를 위한 행동 전략까지.</p>' +
      '<div class="cap" style="margin-top:28px">다음 장면의 전략</div><div class="strategy">' + steps.map(function (x, i) { return (i ? '<i aria-hidden="true">→</i>' : '') + '<b>' + esc(x.label) + '</b>'; }).join('') + '</div>' +
      '<div class="btns"><button type="button" class="btn gold big" id="fPdf"' + (S.pdfUnlocked ? '' : ' disabled') + '>나의 종합 리포트 PDF 받기</button><button type="button" class="btn big" id="fShare">공유 카드 만들기</button><button type="button" class="btn" id="fCompat">궁합 볼 사람 추가하기</button><button type="button" class="btn" id="fBack">리포트 다시 보기</button></div>' + (S.pdfUnlocked ? '' : '<p class="lock">더 많은 챕터를 읽으면 PDF가 열립니다.</p>') + '<p class="fine">사주는 참고용 콘텐츠이며 미래를 단정하지 않습니다.</p></div>';
    $('#fBack').onclick = function () { resumeReader(); };
    $('#fCompat').onclick = function () { T('compatibility_cta_clicked', { chapter: 'final' }); toast('두 사람의 궁합은 곧 열립니다.'); };
    $('#fPdf').onclick = function () { var P = R.Pdf; if (P && P.generate) (toast('PDF를 만들고 있습니다…', 60000), P.generate(S.rep, S.sd, { name: S.name, onProgress: function (i, n) { toast('PDF를 만들고 있습니다 (' + i + ' / ' + n + '쪽)', 60000); } }).then(function () { T('pdf_downloaded', {}); toast('PDF가 준비되었습니다.'); })).catch(function (e) { toast(e.message || 'PDF를 만들지 못했습니다.'); }); else toast('PDF 생성은 곧 제공됩니다.'); };
    $('#fShare').onclick = function () { var C = R.ShareCard; if (C && C.create) { T('share_clicked', {}); C.create(S.rep, S.sd, S.awk).then(function () { T('share_card_created', {}); }).catch(function (e) { toast(e.message || '카드를 만들지 못했습니다.'); }); } else toast('공유 카드는 곧 제공됩니다.'); };
  }

  /* ── 6. 상단 바·챕터 목록·스와이프·키보드 ────────────────────────────────── */
  var dr = $('#drawer'), drPick = false;
  $('#barBtn').onclick = function () {
    var rep = S.rep, h = '', act = 0; drPick = false; S.drWas = !!(S.mv && S.mv.state() === 'PLAYING'); if (S.drWas) S.mv.pause();
    rep.chapters.forEach(function (c, i) { if (c.act !== act) { act = c.act; var a = rep.acts.filter(function (x) { return x.id === act; })[0] || {}; h += '<li class="act">' + esc(a.roman || '') + ' · ' + esc(a.title || '') + '</li>'; }
      h += '<li><button type="button" data-go="' + i + '"' + (i === S.idx ? ' class="cur" aria-current="true"' : '') + '><span>' + String(c.no).padStart(2, '0') + ' ' + esc(c.title) + '</span><small>' + (S.ended[c.id] ? '읽음' : '') + '</small></button></li>'; });
    $('#drList').innerHTML = h; dr.showModal();
  };
  $('#drList').onclick = function (e) { var b = e.target.closest('[data-go]'); if (!b) return; drPick = true; dr.close(); gotoChapter(+b.dataset.go, false, S.drWas); }; // 어느 챕터든 바로 갈 수 있다(모두 하나의 문서)
  $('#drClose').onclick = function () { dr.close(); };
  dr.addEventListener('click', function (e) { if (e.target === dr) dr.close(); });
  dr.addEventListener('close', function () { if (!drPick && S.drWas && S.mv) S.mv.play(); });

  /* QA 편의: ?qa=1990-05-15,14:30,M 로 입력 없이 바로 시작(개인정보를 서버로 보내지 않는다) */
  var qa = /[?&]qa=([^&]+)/.exec(location.search);
  if (qa) { var p = decodeURIComponent(qa[1]).split(','), d = (p[0] || '').split('-'); if (d.length === 3 && window.Manse) { F.year.value = +d[0]; F.month.value = +d[1]; F.day.value = +d[2]; if (p[1]) F.time.value = p[1]; F.gender.value = p[2] === 'F' ? 'F' : 'M'; setTimeout(function () { F.requestSubmit(); }, 50); } }

  /* /report/ 스토리 페이지에서 넘어온 입력(sessionStorage, 서버 전송 없음): 폼을 건너뛰고 바로 시작한다. 한 번 쓰면 지운다. */
  (function handoff() {
    var raw = sg('mt_v2_input'); if (!raw || !window.Manse) return; try { sessionStorage.removeItem('mt_v2_input'); } catch (e) { }
    try { var h = JSON.parse(raw), ch = window.Manse.compute(h.inp); S.ch = ch; S.name = String(h.name || '').slice(0, 20); S.interest = h.interest || ''; setTimeout(function () { start(ch, h.inp.gender); }, 0); } catch (e) { /* 입력이 올바르지 않으면 폼을 그대로 보여 준다 */ }
  })();

  /* ── 글자(자막) 스타일: [data-tx="역할"] 글자마다 글씨체·크기·색·정렬·위치·등장/사라짐 효과·나타나는/사라지는 시기를 적용한다 ──
     값은 관리자(조합 테스트 → 글자 편집)에서 정하고 content.textStyles 로 저장된다. 챕터별 값이 전체 값 위에 덮어쓴다. */
  var TSX = R.TextStyle, txTimers = [], txObs = null;
  S.ts = { all: {}, chapters: {} };
  function txClear() { txTimers.forEach(clearTimeout); txTimers = []; if (txObs) { txObs.disconnect(); txObs = null; } }
  function splitLettersTx(box) { // 글자를 단어(.w) > 글자(.lt) span 으로 쪼갠다(태그 구조 유지)
    var idx = 0, w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), nodes = [], n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var frag = document.createDocumentFragment();
      String(t.nodeValue).split(/(\s+)/).forEach(function (part) {
        if (!part) return; if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var word = document.createElement('span'); word.className = 'w';
        part.split('').forEach(function (ch) { var s = document.createElement('span'); s.className = 'lt'; s.style.setProperty('--i', idx++); s.textContent = ch; word.appendChild(s); });
        frag.appendChild(word);
      });
      t.parentNode.replaceChild(frag, t);
    });
  }
  function splitSeqTx(box) { // 줄바꿈(<br>)마다 한 줄씩 .sq 로 감싼다 → 줄이 차례로 나타난다. 줄이 하나뿐이면 0
    var parts = box.innerHTML.split(/<br\s*\/?>/i).filter(function (p) { return p.replace(/<[^>]*>|&nbsp;/g, '').trim(); });
    if (parts.length < 2) return 0;
    box.innerHTML = parts.map(function (p, i) { return '<span class="sq" style="--sq:' + i + '">' + p + '</span>'; }).join(''); return parts.length;
  }
  function txPlain(el) { // 지금 화면에 쓰인 원래 문장(관리자 편집창의 "현재 문장 가져오기"용)
    var d = document.createElement('div'); d.innerHTML = (el._orig != null ? el._orig : el.innerHTML).replace(/<br\s*\/?>/gi, '\n').replace(/<\/span>\s*<span/gi, '</span> <span'); return d.textContent.trim();
  }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function txDeco(el, inner, st) { // 글자 테두리·그림자·빛번짐·배경 상자·상자 테두리·투명도
    inner.style.cssText = ''; el.classList.remove('tx-box'); var hx = function (v, d) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d; }; // 입력 중인 불완전한 색은 기본색으로
    st = Object.assign({}, st, { strokeC: hx(st.strokeC, '#000000'), shC: hx(st.shC, '#000000'), glowC: hx(st.glowC, '#FFD27A'), bgC: hx(st.bgC, ''), bdC: hx(st.bdC, '#CDB27A') });
    if (st.strokeW) { el.style.webkitTextStroke = st.strokeW + 'px ' + st.strokeC; el.style.paintOrder = 'stroke fill'; }
    var sh = []; if (st.shX || st.shY || st.shB) sh.push((st.shX || 0) + 'px ' + (st.shY || 0) + 'px ' + (st.shB || 0) + 'px ' + st.shC);
    if (st.glowB) { var g = st.glowC; sh.push('0 0 ' + st.glowB + 'px ' + g, '0 0 ' + Math.round(st.glowB * 2) + 'px ' + g); }
    if (sh.length) el.style.textShadow = sh.join(', ');
    if (st.opacity) el.style.opacity = st.opacity;
    var box = st.bgC && (st.bgA == null || st.bgA > 0) || st.bdW; // 배경색이 있거나 상자 테두리가 있으면 상자를 만든다
    if (box) {
      el.classList.add('tx-box'); if (st.bgC) inner.style.background = rgba(st.bgC, st.bgA == null ? 0.6 : st.bgA);
      inner.style.padding = (st.padY != null ? st.padY : 8) + 'px ' + (st.padX != null ? st.padX : 16) + 'px'; if (st.radius) inner.style.borderRadius = st.radius + 'px';
      if (st.bdW) inner.style.border = st.bdW + 'px ' + (st.bdS || 'solid') + ' ' + st.bdC;
    }
  }
  // 글자는 움직이지 않는다(저장된 in·out·loop·seq·hold 값은 지우지 않고 그리기에서만 무시한다)
  var MOTION_KEYS = ['in', 'inSpeed', 'inDelay', 'hold', 'out', 'outSpeed', 'loop', 'loopSpeed', 'seq', 'seqGap'];
  function still(st) { var o = Object.assign({}, st || {}); MOTION_KEYS.forEach(function (k) { delete o[k]; }); return o; }
  var TX_PROPS = ['fontFamily', 'fontSize', 'color', 'fontWeight', 'textAlign', 'letterSpacing', 'lineHeight', 'position', 'left', 'top', 'webkitTextStroke', 'paintOrder', 'textShadow', 'opacity'];
  function txStyle(el, st, immediate) {
    var inner = el.querySelector(':scope > .tx-i');
    if (!inner) { el._orig = el.innerHTML; inner = document.createElement('span'); inner.className = 'tx-i'; inner.innerHTML = el._orig; el.innerHTML = ''; el.appendChild(inner); }
    else { inner.innerHTML = el._orig; inner.className = 'tx-i'; }
    el.className = el.className.split(/\s+/).filter(function (c) { return c.indexOf('tx-') !== 0 || c === 'tx-sel'; }).join(' ');
    TX_PROPS.forEach(function (p) { el.style[p] = ''; }); ['--tx-id', '--tx-il', '--tx-od', '--tx-ls', '--tx-sh'].forEach(function (v) { el.style.removeProperty(v); });
    el._txGo = null;
    st = still(st); var SF = window.StoryFonts;
    if (st.font) { var ff = st.font === 'sans' ? 'var(--f-sans)' : st.font === 'serif' ? 'var(--f-serif)' : (SF && SF.css(st.font)); if (ff) { if (SF) SF.ensure(st.font); el.style.fontFamily = ff; } }
    var size = window.innerWidth <= 700 && st.sizeM ? st.sizeM : st.size; if (size) el.style.fontSize = size + 'px';
    if (st.color) el.style.color = st.color; if (st.weight) el.style.fontWeight = st.weight; if (st.align) el.style.textAlign = st.align;
    if (st.spacing != null) el.style.letterSpacing = st.spacing + 'px'; if (st.line) el.style.lineHeight = st.line;
    if (st.x || st.y) { el.style.position = 'relative'; el.style.left = (st.x || 0) + 'vw'; el.style.top = (st.y || 0) + 'svh'; }
    txDeco(el, inner, st);
    if (st.loop) { el.classList.add('tx-an-' + st.loop); el.style.setProperty('--tx-ls', (st.loopSpeed || 6) + 's'); el.style.setProperty('--tx-sh', getComputedStyle(el).color); }
    if (st.text) inner.innerHTML = esc(st.text).replace(/\n/g, '<br>'); // 관리자가 직접 쓴 문장(줄바꿈 유지)
    var seqN = st.seq ? splitSeqTx(inner) : 0, gap = +st.seqGap || 1;
    if (seqN) { el.classList.add('tx-seq'); el.style.setProperty('--tx-gap', gap + 's'); }
    var inFx = seqN ? (st.in === 'letters' ? 'rise' : (st.in || 'fade')) : (st.in || (+st.inDelay > 0 ? 'fade' : '')), delay = +st.inDelay || 0, dur = st.inSpeed || (st.in ? 0.9 : 0.4), hold = +st.hold || 0, extra = seqN ? (seqN - 1) * gap : 0;
    el.style.setProperty('--tx-id', dur + 's'); el.style.setProperty('--tx-il', delay + 's'); el.style.setProperty('--tx-od', (st.outSpeed || 0.8) + 's');
    if (!inFx && !hold) return; // 효과·시기 설정이 없으면 그대로 보인다
    if (inFx) el.classList.add('tx-in-' + inFx); if (inFx === 'letters') splitLettersTx(inner);
    el.classList.add('tx-pend');
    el._txGo = function () { // 들어왔을 때 재생: 지연 → 나타남 → (hold 초 뒤) 사라짐
      el.classList.remove('tx-pend', 'tx-out'); [].slice.call(el.classList).forEach(function (c) { if (c.indexOf('tx-ot-') === 0) el.classList.remove(c); });
      void el.offsetWidth; el.classList.add('tx-go');
      if (hold > 0) txTimers.push(setTimeout(function () { el.classList.add('tx-out', 'tx-ot-' + (st.out || 'fade')); }, (delay + extra + dur + hold) * 1000));
    };
    if (immediate) txTimers.push(setTimeout(function () { el._txGo(); }, 30));
  }
  function txApply(scope, cid, immediate) {
    txClear(); var els = [].slice.call((scope || document).querySelectorAll('[data-tx]')), roles = [];
    els.forEach(function (el) { roles.push(el.getAttribute('data-tx')); txStyle(el, TSX.resolve(S.ts, cid, el.getAttribute('data-tx')), immediate); });
    if (!immediate) { // 화면에 들어오면 재생
      var pend = els.filter(function (e) { return e._txGo; });
      if (pend.length) { txObs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && e.target._txGo && !e.target.classList.contains('tx-go')) e.target._txGo(); }); }, { threshold: 0.3 }); pend.forEach(function (e) { txObs.observe(e); }); setTimeout(function () { pend.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0 && !e.classList.contains('tx-go') && e._txGo) e._txGo(); }); }, 120); }
    }
    if (PREVIEW && window.parent !== window) window.parent.postMessage({ type: 'mt-v2-txlist', cid: cid, roles: roles }, location.origin);
  }
  function txApplyDoc() { // 문서 전체: 챕터마다 그 챕터의 글자 스타일을 적용한다
    txClear(); var roles = {};
    $$('#chapter .chap').forEach(function (art) {
      var c = S.rep.chapters[+art.dataset.ch]; roles[c.id] = [];
      $$('[data-tx]', art).forEach(function (el) { var r = el.getAttribute('data-tx'); roles[c.id].push(r); txStyle(el, TSX.resolve(S.ts, c.id, r), true); });
    });
    if (PREVIEW && window.parent !== window) { var cid = txCid(); window.parent.postMessage({ type: 'mt-v2-txlist', cid: cid, roles: roles[cid] || [] }, location.origin); }
  }
  var txCid = function () { return S.rep && S.rep.chapters[S.idx] ? S.rep.chapters[S.idx].id : '_'; };
  function txReapply() { if ($('#app').dataset.view === 'awk') txApply($('#awkCap'), '_', true); else txApplyDoc(); }
  if (PREVIEW) { // 관리자 미리보기: 글자를 누르면 선택·끌어서 위치 이동, 관리자에서 값이 바뀌면 바로 반영
    var txDrag = null, txSel = null;
    var txPost = function (o) { if (window.parent !== window) window.parent.postMessage(o, location.origin); };
    var txSelect = function (el) { if (txSel) txSel.classList.remove('tx-sel'); txSel = el; if (el) { el.classList.add('tx-sel'); txPost({ type: 'mt-v2-tx', orig: txPlain(el), role: el.getAttribute('data-tx'), cid: $('#app').dataset.view === 'awk' ? '_' : txCid() }); } else txPost({ type: 'mt-v2-tx', role: null }); };
    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest && e.target.closest('[data-tx]');
      if (!el) { if (!(e.target.closest && e.target.closest('#bar, #drawer, button'))) txSelect(null); return; }
      txSelect(el); var cs = TSX.resolve(S.ts, $('#app').dataset.view === 'awk' ? '_' : txCid(), el.getAttribute('data-tx')); txDrag = { el: el, x: e.clientX, y: e.clientY, sx: cs.x || 0, sy: cs.y || 0, moved: false }; e.preventDefault();
    }, true);
    document.addEventListener('pointermove', function (e) {
      if (!txDrag) return; var dx = e.clientX - txDrag.x, dy = e.clientY - txDrag.y; if (!txDrag.moved && Math.abs(dx) + Math.abs(dy) < 5) return; txDrag.moved = true;
      txDrag.cx = Math.round((txDrag.sx + dx / innerWidth * 100) * 10) / 10; txDrag.cy = Math.round((txDrag.sy + dy / innerHeight * 100) * 10) / 10;
      txDrag.el.style.position = 'relative'; txDrag.el.style.left = txDrag.cx + 'vw'; txDrag.el.style.top = txDrag.cy + 'svh';
    }, true);
    document.addEventListener('pointerup', function () { if (txDrag && txDrag.moved) txPost({ type: 'mt-v2-txmove', role: txDrag.el.getAttribute('data-tx'), cid: $('#app').dataset.view === 'awk' ? '_' : txCid(), x: txDrag.cx, y: txDrag.cy }); txDrag = null; }, true);
    window.addEventListener('message', function (e) {
      var m = e.data; if (e.origin !== location.origin || !m) return;
      if (m.type === 'mt-v2-textstyle') { S.ts = m.ts || { all: {}, chapters: {} }; if (S.rep || $('#app').dataset.view === 'awk') { txReapply(); if (m.replay) $$('[data-tx]').forEach(function (el) { if (el._txGo) { el.classList.remove('tx-go', 'tx-out'); el.classList.add('tx-pend'); setTimeout(function () { el._txGo && el._txGo(); }, 60); } }); } }
      else if (m.type === 'mt-v2-txselect') { var el = document.querySelector('[data-tx="' + m.role + '"]'); if (el) { txSelect(el); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
    });
  }

  /* ── 관리자 미리보기(?preview=1): 저장 전 콘텐츠를 postMessage 로 받아 같은 화면 그대로 그린다. 추적·localStorage·AI 호출은 하지 않는다. ── */
  if (PREVIEW) {
    document.documentElement.classList.add('pv'); view('load'); $('#loadText').textContent = '미리보기를 기다리는 중…';
    window.addEventListener('message', function (e) {
      var m = e.data; if (e.origin !== location.origin || !m || m.type !== 'mt-v2-preview') return;
      try {
        var ch = window.Manse.compute(m.input); S.sd = R.SajuData.build(ch, { now: m.now || Date.now() }); S.name = m.name || ''; S.media = m.media || [];
        S.pack = R.Compose.fromSaved(m.content, S.media, m.project || 'full'); S.ts = S.pack.textStyles; S.rep = R.Compose.build(S.sd, S.pack.lib, S.pack.cfg, { name: S.name }); S.awk = { video: (m.awk && m.awk.video) || null, ilgan: (m.awk && m.awk.ilgan) || null, fallback: (m.awk && m.awk.fallback) || null, textOnly: !!(m.awk && m.awk.textOnly) }; S.visited = {}; S.ended = {};
        if (m.chapter === 'ilgan') { ilganStage(function () { }); return; }
        if (m.chapter === 'awakening') { ijuStage(function () { }); return; }
        if (m.chapter === 'prologue') { S.birth = birthOf(ch); playCinema(prologueScenes().scenes, function () { }, '프롤로그'); return; }
        if (m.chapter === 'ending') { playCinema(withCopy(R.Translator.ending(S.sd, S.name, R.Narrator.heroVars(S.sd, S.name))), function () { }, '엔딩'); return; }
        var i = Math.max(0, S.rep.chapters.map(function (c) { return c.id; }).indexOf(m.chapter)); view('reader');
        openDoc(i, { autoStart: false });
      } catch (err) { $('#loadText').textContent = '미리보기를 만들지 못했습니다: ' + (err && err.message); view('load'); }
    });
    // 관리자 미리보기 "멈춤": 영상·소리를 멈추고 CSS 애니메이션을 정지한다(다시 누르면 재생). 새로 그려진 영상도 멈춘 채로 둔다.
    var paused = false, pst = document.createElement('style'); pst.textContent = 'html.pv-paused *,html.pv-paused *::before,html.pv-paused *::after{animation-play-state:paused!important}';
    document.head.appendChild(pst);
    function applyPause() { [].forEach.call(document.querySelectorAll('video,audio'), function (v) { try { if (paused) v.pause(); else if (v.autoplay || v.loop) v.play().catch(function () { }); } catch (x) { } }); }
    new MutationObserver(function () { if (paused) applyPause(); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('play', function (e) { if (paused && e.target && e.target.pause) e.target.pause(); }, true);
    window.addEventListener('message', function (e) { var m = e.data; if (e.origin !== location.origin || !m || m.type !== 'mt-v2-pause') return; paused = !!m.on; document.documentElement.classList.toggle('pv-paused', paused); applyPause(); });
    if (window.parent !== window) window.parent.postMessage({ type: 'mt-v2-ready' }, location.origin);
  }

  window.MantraV2 = { state: S, gotoChapter: gotoChapter, T: T, intro: intro, prologue: prologue };
})();
