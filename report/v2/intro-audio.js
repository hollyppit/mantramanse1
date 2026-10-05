// IntroAudio — INTRO 연출용 효과음: 북(둥)·깊은 북(두우우웅)·바람. 외부 음원 없이 Web Audio 로 그 자리에서 합성한다.
// 음성 해설(TTS)은 쓰지 않는다. 배경음악 스위치(R.Bgm 의 ♪ 소리 끄기)를 끄면 효과음도 나지 않는다. 자동재생 정책상 사용자의 첫 터치 뒤에만 소리가 난다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, ctx = null, Ctx = root.AudioContext || root.webkitAudioContext;
  function ac() {
    if (!Ctx || (R.Bgm && R.Bgm.isMuted && R.Bgm.isMuted())) return null;
    if (!ctx) { try { ctx = new Ctx(); } catch (e) { return null; } } if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { } } return ctx;
  }
  function noise(a, sec) { var n = Math.floor(a.sampleRate * sec), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; var s = a.createBufferSource(); s.buffer = b; return s; }
  function drum(deep) {
    var a = ac(); if (!a) return; var t = a.currentTime, dur = deep ? 1.5 : 0.55, f0 = deep ? 96 : 140, f1 = deep ? 34 : 52, v = deep ? 0.95 : 0.7;
    var o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    var n = noise(a, 0.12), nf = a.createBiquadFilter(), ng = a.createGain(); nf.type = 'lowpass'; nf.frequency.value = deep ? 260 : 420; ng.gain.setValueAtTime(deep ? 0.35 : 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); n.connect(nf); nf.connect(ng); ng.connect(a.destination); n.start(t); // 가죽 치는 소리
  }
  function wind(sec) {
    var a = ac(); if (!a) return; var t = a.currentTime, n = noise(a, sec || 2), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(620, t + (sec || 2)); f.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + (sec || 2)); n.connect(f); f.connect(g); g.connect(a.destination); n.start(t);
  }
  R.Sfx = { drum: function () { drum(false); }, deepDrum: function () { drum(true); }, wind: wind };
})(typeof window !== 'undefined' ? window : globalThis);
