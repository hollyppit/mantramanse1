/* 내 사주 뮤직비디오 → SNS 업로드용 MP4(세로 9:16, 1080×1920, 30fps, H.264 + AAC) — 브라우저 안에서 만든다(서버 비용 없음)
   · 화면: 플레이어와 같은 패널(그림 또는 Kling 영상) + 천천히 확대(켄 번스) + 구간 바뀔 때 1초 겹쳐 넘기기 + SNS 안전 영역 배치(위쪽 띠에 색 상자 제목, 아래쪽 안전 경계 위에 글자 상자 가사, 오른쪽 버튼 자리 비움) + 만트라 포춘 표시.
   · 방법 ①(빠름): WebCodecs(VideoEncoder·AudioEncoder) + mp4-muxer — 실제 재생보다 빠르게 프레임을 하나씩 그려 인코딩한다.
     방법 ②(대신): ①이 안 되는 브라우저(일부 사파리 등)는 MediaRecorder 로 MP4 를 실시간 녹화한다(곡 길이만큼 걸림, 화면을 켜 둬야 함).
     둘 다 안 되면 지원하지 않는다고 알린다(웹엠 등 다른 형식은 만들지 않는다 — SNS 업로드용 MP4 로 통일).
   · 뮤직비디오 플레이어(music-video.js)가 곡을 끝까지 본 뒤 “MP4로 저장” 을 누르면 이 파일과 vendor/mp4-muxer 를 그때 불러온다.
   R.MusicVideoExport.make({ song, panels, audio, onProgress(0~1, 문구), signal:{cancel} }) → Promise<File>  */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var W = 1080, H = 1920, FPS = 30;
  var EL_BG = { 목: ['#17352a', '#3f7a52'], 화: ['#3a1416', '#a4462f'], 토: ['#33280f', '#9a7a3a'], 금: ['#25272c', '#8c929c'], 수: ['#0d1a2e', '#2f5d8c'] };
  var BRAND = '만트라 포춘';
  /* SNS 안전 영역(2026-11-21, 쇼츠·릴스·틱톡 공통): 위 260px 은 앱 머리줄, 아래 480px 은 설명·이름·음악 표시, 오른쪽 130px 은 좋아요·댓글 버튼이 덮는다.
     글자는 모두 이 안쪽에 둔다 — 제목은 위쪽 안전 띠에 색 상자, 가사는 아래쪽 안전 경계 위에 글자 상자(쇼츠 자막 스타일). 그림은 화면 전체를 채운다. */
  var SAFE = { top: 260, bottom: 1440, left: 90, right: 950 }, ACCENT = { 목: '#2f9e5f', 화: '#d64535', 토: '#c9922a', 금: '#5e6d82', 수: '#2f6fd6' };

  function fastOk() { return !!(root.VideoEncoder && root.AudioEncoder && root.VideoFrame && root.AudioData && root.Mp4Muxer); }
  function recMime() {
    if (!root.MediaRecorder || !root.MediaRecorder.isTypeSupported) return '';
    var c = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs="avc1.42E01E, mp4a.40.2"', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'];
    for (var i = 0; i < c.length; i++) if (root.MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }
  function canExport() { return !!((root.VideoEncoder && root.AudioEncoder) || recMime()); }

  /* ── 준비: 노래(디코딩)·패널 그림·패널 영상 */
  function fetchBlob(u) { return root.fetch(u, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('파일을 불러오지 못했습니다(' + r.status + ')'); return r.blob(); }); }
  function loadImg(u) { return fetchBlob(u).then(function (b) { return root.createImageBitmap ? root.createImageBitmap(b) : new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = URL.createObjectURL(b); }); }).catch(function () { return null; }); }
  function loadVid(u) {
    return fetchBlob(u).then(function (b) {
      return new Promise(function (ok) {
        var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.loop = true; v.preload = 'auto'; v.src = URL.createObjectURL(b);
        var t = setTimeout(function () { ok(null); }, 15000);
        v.addEventListener('loadeddata', function () { clearTimeout(t); ok(isFinite(v.duration) && v.duration > 0.3 ? v : null); }, { once: true });
        v.addEventListener('error', function () { clearTimeout(t); ok(null); }, { once: true });
      });
    }).catch(function () { return null; });
  }
  function prepare(o, progress) {
    var song = o.song, panels = o.panels || {}, secs = song.sections;
    var urls = secs.map(function (s) { var p = panels[s.panel] || panels[s.panelFallback]; return p || null; });
    progress(0.01, '노래와 장면을 불러오는 중…');
    var imgs = Promise.all(urls.map(function (p) { return p && p.url ? loadImg(p.url) : null; }));
    var vids = Promise.all(urls.map(function (p) { return p && p.video ? loadVid(p.video) : null; }));
    var audio = fetchBlob(o.audio).then(function (b) { return b.arrayBuffer(); }).then(function (ab) {
      var AC = root.AudioContext || root.webkitAudioContext, ac = new AC();
      return new Promise(function (ok, no) { var p = ac.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); }).then(function (buf) { try { ac.close(); } catch (e) { } return buf; });
    });
    var fonts = root.document && document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () { }) : null;
    return Promise.all([imgs, vids, audio, fonts]).then(function (r) { return { imgs: r[0], vids: r[1], buf: r[2] }; });
  }

  /* ── 한 프레임 그리기(두 방법 공통). st: 구간 전환 상태(프레임은 늘 앞으로만 간다) */
  function fontFamily() { try { return getComputedStyle(document.body).fontFamily || 'sans-serif'; } catch (e) { return 'sans-serif'; } }
  function wrap(ctx, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) lines.push(cur);
      cur = w; while (ctx.measureText(cur).width > maxW && cur.length > 1) { var k = cur.length - 1; while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--; lines.push(cur.slice(0, k)); cur = cur.slice(k); }
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
  function cover(ctx, src, sw, sh, scale, alpha) {
    var r = Math.max(W / sw, H / sh) * scale, dw = sw * r, dh = sh * r;
    ctx.globalAlpha = alpha; ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.globalAlpha = 1;
  }
  function makeDrawer(ctx, o, assets, durMs) {
    var song = o.song, secs = song.sections, lib = R.MusicVideoLyrics, ff = fontFamily(), st = { cur: -1, prev: -1, at: 0 };
    var toSong = function (t) { return song.timing && song.timing.length ? t : t / durMs * song.totalMs; };
    function bg(i, localMs, alpha, vidReady) {
      var s = secs[i], kb = 1.04 + 0.1 * Math.min(1, Math.max(0, localMs / Math.max(4000, s.durationMs)));
      var v = assets.vids[i], im = assets.imgs[i];
      if (v && vidReady !== false && v.readyState >= 2 && v.videoWidth) cover(ctx, v, v.videoWidth, v.videoHeight, kb, alpha);
      else if (im) cover(ctx, im, im.width, im.height, kb, alpha);
      else { var c = EL_BG[s.el] || EL_BG.토, g = ctx.createRadialGradient(W / 2, H * 0.2, 0, W / 2, H * 0.2, H); g.addColorStop(0, c[1]); g.addColorStop(0.7, c[0]); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
    return function draw(tMs, vidReady) {
      var sm = toSong(tMs), cue = lib.cueAt(song, sm), si = Math.max(0, secs.indexOf(cue.section));
      if (si !== st.cur) { st.prev = st.cur; st.cur = si; st.at = tMs; }
      ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
      var since = tMs - st.at, fade = Math.min(1, since / 1000);
      if (st.prev >= 0 && fade < 1) bg(st.prev, tMs - st.at + secs[st.prev].durationMs, 1, vidReady);
      bg(si, since, st.prev >= 0 ? fade : 1, vidReady);
      /* 위쪽(제목 띠)과 아래쪽(가사 띠) 어둡게 — 글자 상자 뒤 그림이 너무 밝아도 읽히게 */
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,.72)'); g.addColorStop(0.3, 'rgba(0,0,0,.25)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(0.58, 'rgba(0,0,0,.15)'); g.addColorStop(0.76, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;
      var accent = ACCENT[(secs[0] && secs[0].el) || '토'] || ACCENT.토, cx = (SAFE.left + SAFE.right) / 2, maxW = SAFE.right - SAFE.left;
      /* 글자 상자 하나(쇼츠 자막처럼 줄마다 꼭 맞는 상자) */
      function box(text, x, y, font, fg, bg, padX, h, align) {
        ctx.font = font; var w = ctx.measureText(text).width, left = align === 'left' ? x : x - w / 2 - padX;
        ctx.fillStyle = bg; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(left, y - h / 2, w + padX * 2, h, 10); else ctx.rect(left, y - h / 2, w + padX * 2, h); ctx.fill();
        ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.fillText(text, left + padX, y + 2);
      }
      /* 제목: 위쪽 안전 띠 시작점부터, 색 상자 위 흰 굵은 글씨(최대 2줄) + 작은 설명 줄 */
      ctx.font = '800 64px ' + ff;
      var tl = wrap(ctx, song.title, maxW - 44).slice(0, 2), ty = SAFE.top + 46;
      tl.forEach(function (l, i) { box(l, SAFE.left, ty + i * 92, '800 64px ' + ff, '#fff', accent, 22, 84, 'left'); });
      ctx.font = '600 30px ' + ff; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10;
      ctx.fillText(BRAND + ' · 내 사주 뮤직비디오 · ' + (song.topicKo || ''), SAFE.left + 4, ty + tl.length * 92 + 8);
      if (song.optKo) { ctx.font = '500 26px ' + ff; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(song.optKo, SAFE.left + 4, ty + tl.length * 92 + 50); }
      ctx.shadowBlur = 0;
      /* 가사: 아래쪽 안전 경계 위에 쌓는다(맨 아래 다음 줄 → 그 위 부르는 줄 → 그 위 구간 이름). 오른쪽 버튼 자리는 비운다 */
      var size = 62; ctx.font = '800 ' + size + 'px ' + ff; var lines = wrap(ctx, cue.line || '', maxW - 40);
      if (lines.length > 2) { size = 52; ctx.font = '800 ' + size + 'px ' + ff; lines = wrap(ctx, cue.line || '', maxW - 40); }
      var lh = Math.round(size * 1.42), nx = cue.next != null ? cue.next : (cue.section.lines[cue.lineIndex + 1] || ''), y = SAFE.bottom - 30;
      if (nx) { ctx.font = '500 34px ' + ff; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 12; ctx.fillText(wrap(ctx, nx, maxW)[0] || '', cx, y); ctx.shadowBlur = 0; y -= 70; }
      for (var li = lines.length - 1; li >= 0; li--) { box(lines[li], cx, y, '800 ' + size + 'px ' + ff, '#fff', 'rgba(0,0,0,.66)', 20, lh - 10, 'center'); y -= lh; }
      var name = cue.section.name || '';
      if (name) { box(name, cx, y - 6, '700 28px ' + ff, '#fff', accent, 18, 46, 'center'); }
      return si;
    };
  }
  function makeCanvas() {
    if (root.OffscreenCanvas) { try { var oc = new OffscreenCanvas(W, H), c2 = oc.getContext('2d'); if (c2) return { cv: oc, ctx: c2 }; } catch (e) { } }
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; return { cv: cv, ctx: cv.getContext('2d') };
  }
  function seekTo(v, t) {
    return new Promise(function (ok) {
      if (Math.abs(v.currentTime - t) < 0.02) return ok();
      var done = false, fin = function () { if (!done) { done = true; v.removeEventListener('seeked', fin); ok(); } };
      v.addEventListener('seeked', fin); setTimeout(fin, 400); v.currentTime = t;
    });
  }
  function waitFor(fn) { return new Promise(function (ok) { (function chk() { if (fn()) ok(); else setTimeout(chk, 5); })(); }); }
  function fileName(song) { return ('만트라_뮤직비디오_' + (song.topicKo || '') + '_' + (song.title || '')).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 80) + '.mp4'; }

  /* ── 방법 ①: WebCodecs 로 프레임 단위 인코딩(재생보다 빠름) */
  async function pickVideoCfg() {
    var cs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
    for (var i = 0; i < cs.length; i++) {
      var c = { codec: cs[i], width: W, height: H, bitrate: 5000000, bitrateMode: 'variable', framerate: FPS, avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(c)).supported) return c; } catch (e) { }
    }
    return null;
  }
  async function fast(o, a, progress, sig) {
    var vCfg = await pickVideoCfg(), buf = a.buf, sr = buf.sampleRate, ch = Math.min(2, buf.numberOfChannels);
    var aCfg = { codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: ch, bitrate: 160000 };
    var aOk = false; try { aOk = (await AudioEncoder.isConfigSupported(aCfg)).supported; } catch (e) { }
    if (!vCfg || !aOk) return null;   // 이 브라우저는 H.264/AAC 인코딩을 못 함 → 방법 ②
    var M = root.Mp4Muxer, muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: { codec: 'aac', sampleRate: sr, numberOfChannels: ch } });
    var err = null, fail = function (e) { err = err || e; };
    // 소리
    var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: fail }); aenc.configure(aCfg);
    var planes = []; for (var k = 0; k < ch; k++) planes.push(buf.getChannelData(k));
    for (var off = 0, N = 1024 * 16; off < buf.length && !err; off += N) {
      var n = Math.min(N, buf.length - off), data = new Float32Array(n * ch);
      for (k = 0; k < ch; k++) data.set(planes[k].subarray(off, off + n), k * n);
      var ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(off / sr * 1e6), data: data });
      aenc.encode(ad); ad.close();
      if (aenc.encodeQueueSize > 8) await waitFor(function () { return err || aenc.encodeQueueSize < 4; });
    }
    if (!err) await aenc.flush(); aenc.close();
    if (err) throw err;
    progress(0.05, '영상 그리는 중…');
    // 영상
    var cc = makeCanvas(), durMs = buf.duration * 1000, total = Math.ceil(buf.duration * FPS), draw = makeDrawer(cc.ctx, o, a, durMs);
    var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: fail }); venc.configure(vCfg);
    var lastVidAt = {};
    for (var f = 0; f < total && !err; f++) {
      if (sig.cancel) throw new Error('cancel');
      var t = f * 1000 / FPS, cue = R.MusicVideoLyrics.cueAt(o.song, o.song.timing && o.song.timing.length ? t : t / durMs * o.song.totalMs), si = Math.max(0, o.song.sections.indexOf(cue.section)), v = a.vids[si];
      if (v && (f % 2 === 0 || lastVidAt[si] == null)) { await seekTo(v, (t / 1000) % v.duration); lastVidAt[si] = f; }   // 영상 패널은 15fps 로 새 장면(시킹 비용을 줄인다)
      draw(t, true);
      var vf = new VideoFrame(cc.cv, { timestamp: Math.round(t * 1000), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      if (venc.encodeQueueSize > 6) await waitFor(function () { return err || venc.encodeQueueSize < 3; });
      if (f % 15 === 0) { progress(0.05 + 0.93 * f / total, 'MP4 만드는 중… ' + Math.round(100 * (0.05 + 0.93 * f / total)) + '%'); await new Promise(function (r) { setTimeout(r, 0); }); }
    }
    if (!err) await venc.flush(); venc.close();
    if (err) throw err;
    muxer.finalize();
    return new File([muxer.target.buffer], fileName(o.song), { type: 'video/mp4' });
  }

  /* ── 방법 ②: MediaRecorder 실시간 녹화(MP4 를 녹화할 수 있는 브라우저만) */
  function realtime(o, a, progress, sig) {
    var mime = recMime(); if (!mime) return Promise.reject(new Error('unsupported'));
    return new Promise(function (ok, no) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d');
      var AC = root.AudioContext || root.webkitAudioContext, ac = new AC(), src = ac.createBufferSource(), dest = ac.createMediaStreamDestination();
      src.buffer = a.buf; src.connect(dest);
      var stream = new MediaStream(cv.captureStream(FPS).getVideoTracks().concat(dest.stream.getAudioTracks()));
      var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000, audioBitsPerSecond: 160000 }), parts = [];
      var durMs = a.buf.duration * 1000, draw = makeDrawer(ctx, o, a, durMs), t0 = 0, raf = 0, last = -1, stopped = false;
      a.vids.forEach(function (v) { if (v) { v.currentTime = 0; } });
      function finish(e) { if (stopped) return; stopped = true; cancelAnimationFrame(raf); try { src.stop(); } catch (x) { } a.vids.forEach(function (v) { if (v) v.pause(); }); if (rec.state !== 'inactive') rec.stop(); if (e) { try { ac.close(); } catch (x) { } no(e); } }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () { try { ac.close(); } catch (x) { } if (sig.cancel) return no(new Error('cancel')); ok(new File(parts, fileName(o.song), { type: 'video/mp4' })); };
      function loop() {
        if (sig.cancel) return finish(new Error('cancel'));
        var t = (ac.currentTime - t0) * 1000; if (t >= durMs) { draw(durMs - 1); stopped = true; cancelAnimationFrame(raf); setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, 300); return; }
        var si = draw(Math.max(0, t));
        if (si !== last) { a.vids.forEach(function (v, i) { if (!v) return; if (i === si) { var p = v.play(); if (p && p.catch) p.catch(function () { }); } else v.pause(); }); last = si; }
        progress(t / durMs, '녹화 중… ' + Math.round(t / durMs * 100) + '% (곡 길이만큼 걸려요 · 화면을 켜 두세요)');
        raf = requestAnimationFrame(loop);
      }
      draw(0); rec.start(1000);
      (ac.resume ? ac.resume() : Promise.resolve()).then(function () { t0 = ac.currentTime + 0.05; src.start(t0); raf = requestAnimationFrame(loop); }).catch(finish);
    });
  }

  function make(o) {
    var progress = o.onProgress || function () { }, sig = o.signal || {};
    return prepare(o, progress).then(function (a) {
      if (sig.cancel) throw new Error('cancel');
      var go = fastOk() ? fast(o, a, progress, sig).catch(function (e) { if (e && e.message === 'cancel') throw e; return null; }) : Promise.resolve(null);
      return go.then(function (file) { if (file) return file; if (!recMime()) throw new Error('unsupported'); return realtime(o, a, progress, sig); })
        .then(function (file) { a.vids.forEach(function (v) { if (v) { try { URL.revokeObjectURL(v.src); } catch (e) { } } }); progress(1, '완성'); return file; });
    });
  }

  R.MusicVideoExport = { make: make, canExport: canExport, W: W, H: H, FPS: FPS };
})(typeof window !== 'undefined' ? window : globalThis);
