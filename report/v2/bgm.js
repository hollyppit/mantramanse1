// BGM — 장면의 bgmMood(cinematic · minimal · ambient · emotional · tension · hopeful · reflective)에 맞는 배경 음악을 낮은 볼륨으로 깔고, 분위기가 바뀌면 크로스페이드한다.
// 동양 판타지·무협·신선 세계 같은 분위기가 중심이 되지 않도록, 음원은 관리자가 mood 별로 직접 올린다(report-content 의 bgm). 음원이 없으면 아무 소리도 내지 않는다.
// 브라우저 자동재생 정책: 사용자의 첫 터치(사주 입력 제출) 뒤에만 재생된다. 막히면 ♪ 버튼으로 켠다. 꺼 둔 선택은 이 세션 동안 유지된다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var MOODS = ['cinematic', 'minimal', 'ambient', 'emotional', 'tension', 'hopeful', 'reflective'], VOL = 0.28, FADE = 1400;
  var map = {}, cur = null, curMood = '', muted = false, btn = null, want = '', raf = 0;
  try { muted = sessionStorage.getItem('mt_bgm_off') === '1'; } catch (e) { }

  function has() { return MOODS.some(function (m) { return map[m]; }); }
  function fade(a, to, ms, done) {
    var from = a.volume, t0 = Date.now(); (function step() { var p = Math.min(1, (Date.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * p)); if (p < 1) setTimeout(step, 50); else if (done) done(); })();
  }
  function ui() { if (!btn) return; btn.hidden = !has(); btn.textContent = muted ? '♪ 소리 켜기' : '♪ 소리 끄기'; btn.setAttribute('aria-pressed', String(!muted)); }
  function init(m) {
    map = {}; MOODS.forEach(function (k) { if (m && /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+)$/.test(m[k] || '')) map[k] = m[k]; });
    if (!root.document || btn) { ui(); return; }
    btn = root.document.createElement('button'); btn.type = 'button'; btn.id = 'bgmBtn'; btn.className = 'bgm-btn'; btn.hidden = true;
    btn.onclick = function () { setMuted(!muted); }; root.document.body.appendChild(btn); ui();
  }
  function play(mood) {
    want = mood || want; var url = map[want] || map.minimal || map.ambient || ''; if (!root.Audio || !url || muted) { return; }
    if (cur && curMood === url) { if (cur.paused) { var pr = cur.play(); if (pr && pr.catch) pr.catch(function () { }); } return; }
    var next = new Audio(url); next.loop = true; next.volume = 0; next.preload = 'auto'; var old = cur; cur = next; curMood = url;
    var p = next.play(); if (p && p.catch) p.catch(function () { /* 자동재생 차단: ♪ 버튼으로 켠다 */ });
    fade(next, VOL, FADE); if (old) fade(old, 0, FADE, function () { try { old.pause(); } catch (e) { } });
  }
  function stop() { if (cur) { var o = cur; cur = null; curMood = ''; fade(o, 0, 600, function () { try { o.pause(); } catch (e) { } }); } }
  function setMuted(b) { muted = !!b; try { sessionStorage.setItem('mt_bgm_off', muted ? '1' : '0'); } catch (e) { } if (muted) stop(); else play(want); ui(); }
  R.Bgm = { init: init, play: play, stop: stop, setMuted: setMuted, has: has, MOODS: MOODS };
})(typeof window !== 'undefined' ? window : globalThis);
