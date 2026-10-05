// BGM — 장면의 bgmMood(cinematic · minimal · ambient · emotional · tension · hopeful · reflective)에 맞는 배경 음악을 낮은 볼륨으로 깔고, 분위기가 바뀌면 크로스페이드한다.
// 동양 판타지·무협·신선 세계 같은 분위기가 중심이 되지 않도록, 음원은 관리자가 mood 별로 직접 올린다(report-content 의 bgm). 음원이 없으면 아무 소리도 내지 않는다.
// 브라우저 자동재생 정책: 사용자의 첫 터치(사주 입력 제출) 뒤에만 재생된다. 막히면 ♪ 버튼으로 켠다. 꺼 둔 선택은 이 세션 동안 유지된다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var MOODS = ['cinematic', 'minimal', 'ambient', 'emotional', 'tension', 'hopeful', 'reflective'], KEYS = ['default'].concat(MOODS), VOL = 0.28, FADE = 1400; // default: 분위기별 음원을 안 정한 장면에서 흐르는 기본 배경음악
  var blocked = false, armed = false, ducked = false, map = {}, cur = null, curMood = '', muted = false, btn = null, want = '', raf = 0;
  try { muted = sessionStorage.getItem('mt_bgm_off') === '1'; } catch (e) { }

  function has() { return KEYS.some(function (m) { return map[m]; }); }
  function fade(a, to, ms, done) {
    var from = a.volume, t0 = Date.now(); (function step() { var p = Math.min(1, (Date.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * p)); if (p < 1) setTimeout(step, 50); else if (done) done(); })();
  }
  function ui() { if (!btn) return; btn.hidden = !has(); btn.textContent = muted || blocked ? '♪ 소리 켜기' : '♪ 소리 끄기'; btn.setAttribute('aria-pressed', String(!muted && !blocked)); btn.classList.toggle('blocked', blocked && !muted); }
  function init(m) {
    map = {}; KEYS.forEach(function (k) { if (m && /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+)$/.test(m[k] || '')) map[k] = m[k]; });
    if (!root.document || btn) { ui(); return; }
    btn = root.document.createElement('button'); btn.type = 'button'; btn.id = 'bgmBtn'; btn.className = 'bgm-btn'; btn.hidden = true;
    btn.onclick = function () { if (blocked && !muted) { retry(); return; } setMuted(!muted); }; root.document.body.appendChild(btn); ui();
  }
  // 브라우저 자동재생 정책: 다른 페이지(온보딩)에서 넘어오면 사용자가 이 페이지를 한 번 건드리기 전에는 소리가 막힌다.
  // 막히면 ♪ 버튼을 강조하고, 첫 터치·클릭·키 입력에서 바로 다시 시작한다(일간 소개 화면에서 아무 데나 눌러도 시작된다).
  function attempt(a) {
    var pr; try { pr = a.play(); } catch (e) { pr = null; }
    if (pr && pr.then) pr.then(function () { if (blocked) { blocked = false; ui(); } fade(a, level(), FADE); }, function () { blocked = true; ui(); arm(); });
  }
  function retry() { if (muted || !cur) return; attempt(cur); }
  function arm() {
    if (armed || !root.document) return; armed = true; var d = root.document, ev = ['pointerdown', 'touchstart', 'keydown', 'click'];
    var go = function () { armed = false; ev.forEach(function (e) { d.removeEventListener(e, go, true); }); retry(); };
    ev.forEach(function (e) { d.addEventListener(e, go, true); });
  }
  var mixv = 1; // INTRO 연출: 음악을 끊거나(0) 서서히 올린다(→1). 장면 신호(bgmCut·bgmUp·bgmDrone)가 부른다
  var level = function () { return Math.min(1, (ducked ? 0.05 : VOL) * mixv); };
  function mix(m, ms) { mixv = Math.max(0, Math.min(1.6, +m)); if (cur) fade(cur, level(), ms == null ? 600 : ms); } // 영상 소리를 켜면 배경음악을 낮춘다
  function duck(on) { ducked = !!on; if (cur) fade(cur, level(), 400); }
  function play(mood) {
    want = mood || want; var url = map[want] || map['default'] || map.minimal || map.ambient || ''; /* 그 분위기 음원 → 기본 음원 → 미니멀 → 앰비언트 */ if (!root.Audio || !url || muted) { return; }
    if (cur && curMood === url) { if (cur.paused) attempt(cur); return; }
    var next = new Audio(url); next.loop = true; next.volume = 0; next.preload = 'auto'; var old = cur; cur = next; curMood = url;
    attempt(next);
    fade(next, level(), FADE); if (old) fade(old, 0, FADE, function () { try { old.pause(); } catch (e) { } });
  }
  function stop() { if (cur) { var o = cur; cur = null; curMood = ''; fade(o, 0, 600, function () { try { o.pause(); } catch (e) { } }); } }
  function setMuted(b) { muted = !!b; try { sessionStorage.setItem('mt_bgm_off', muted ? '1' : '0'); } catch (e) { } if (muted) stop(); else play(want); ui(); }
  R.Bgm = { mix: mix, isMuted: function () { return muted; }, retry: retry, blocked: function () { return blocked; }, duck: duck, init: init, play: play, stop: stop, setMuted: setMuted, has: has, MOODS: MOODS, KEYS: KEYS };
})(typeof window !== 'undefined' ? window : globalThis);
