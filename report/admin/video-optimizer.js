/* 관리자 영상 업로드 자동 압축 (브라우저 안에서, 서버 비용 없음)
   - mp4/mov(H.264·HEVC 등 브라우저가 디코딩할 수 있는 것) → 세로 720·가로 1280 이하 H.264 mp4, 바로 재생(faststart).
   - 소리(AAC)는 다시 인코딩하지 않고 그대로 옮긴다. AAC 가 아닌 소리가 있으면 원본을 올린다.
   - 3MB 미만이거나, 압축본이 원본보다 크거나, 브라우저가 WebCodecs 를 지원하지 않거나, 중간에 실패하면 원본을 그대로 올린다(업로드는 절대 막지 않는다).
   - 라이브러리: vendor/mp4box(BSD-3, 분리) · vendor/mp4-muxer(MIT, 합치기). 압축할 때만 불러온다.
   사용: AdminVideoOptimizer.prepare(file) → Promise<File> */
(function () {
  'use strict';
  var MIN_BYTES = 3 * 1024 * 1024, SHORT = 720, LONG = 1280, BPS_720 = 2200000;
  var BASE = (document.currentScript && document.currentScript.src || '/report/admin/video-optimizer.js').replace(/[^/]*$/, '');
  var libs = null;
  function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = BASE + src; s.onload = res; s.onerror = function () { rej(new Error('압축 라이브러리 불러오기 실패')); }; document.head.appendChild(s); }); }
  function loadLibs() { if (!libs) libs = Promise.all([window.MP4Box ? 0 : load('vendor/mp4box-0.5.2.min.js'), window.Mp4Muxer ? 0 : load('vendor/mp4-muxer-5.1.5.js')]).catch(function (e) { libs = null; throw e; }); return libs; }
  var supported = function () { return typeof VideoDecoder === 'function' && typeof VideoEncoder === 'function' && typeof VideoFrame === 'function' && typeof OffscreenCanvas === 'function'; };
  var isVideo = function (f) { return f && (/^video\/(mp4|quicktime|x-m4v)$/.test(f.type) || /\.(mp4|mov|m4v)$/i.test(f.name || '')); };

  /* 진행 표시(화면 아래 작은 배지) */
  var badge = null;
  function status(t) {
    if (!t) { if (badge) { badge.remove(); badge = null; } return; }
    if (!badge) { badge = document.createElement('div'); badge.setAttribute('role', 'status'); badge.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:100;padding:9px 14px;border-radius:8px;background:#16301F;color:#fff;border:1px solid #62C2AE;font:13px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35)'; document.body.appendChild(badge); }
    badge.textContent = t;
  }

  // 코덱 설정용 박스(avcC·hvcC 등) 바이트
  function boxBytes(entry) {
    var b = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C; if (!b) return undefined;
    var ds = new window.DataStream(undefined, 0, window.DataStream.BIG_ENDIAN); b.write(ds);
    return new Uint8Array(ds.buffer, 8); // 박스 헤더 8바이트 제외
  }
  function aacConfig(entry) {
    try { var d = entry.esds.esd.descs[0].descs[0]; return d && d.data ? new Uint8Array(d.data) : null; } catch (e) { return null; }
  }
  function demux(buf) {
    return new Promise(function (res, rej) {
      var f = window.MP4Box.createFile(), out = { v: null, a: null, vs: [], as: [] };
      f.onError = function (e) { rej(new Error('영상 분석 실패: ' + e)); };
      f.onReady = function (info) {
        var vt = info.videoTracks[0], at = info.audioTracks[0]; if (!vt) return rej(new Error('영상 트랙 없음'));
        out.v = { info: vt, entry: f.getTrackById(vt.id).mdia.minf.stbl.stsd.entries[0] };
        f.setExtractionOptions(vt.id, 'v', { nbSamples: 1e9 });
        if (at) { out.a = { info: at, entry: f.getTrackById(at.id).mdia.minf.stbl.stsd.entries[0] }; f.setExtractionOptions(at.id, 'a', { nbSamples: 1e9 }); }
        f.start();
      };
      f.onSamples = function (id, user, samples) { (user === 'v' ? out.vs : out.as).push.apply(user === 'v' ? out.vs : out.as, samples); };
      buf.fileStart = 0; f.appendBuffer(buf); f.flush();
      setTimeout(function () { out.v ? res(out) : rej(new Error('영상 분석 실패')); }, 0);
    });
  }
  var wait = function (fn) { return new Promise(function (r) { (function tick() { fn() ? r() : setTimeout(tick, 4); })(); }); };

  async function transcode(file) {
    await loadLibs();
    var src = await file.arrayBuffer(), dm = await demux(src), V = dm.v, A = dm.a;
    if (!dm.vs.length) throw new Error('영상 프레임 없음');
    var w0 = V.info.video ? V.info.video.width : V.info.track_width, h0 = V.info.video ? V.info.video.height : V.info.track_height;
    var s = Math.min(1, SHORT / Math.min(w0, h0), LONG / Math.max(w0, h0)), even = function (n) { return Math.max(2, Math.round(n / 2) * 2); };
    var W = even(w0 * s), Hh = even(h0 * s), bitrate = Math.round(BPS_720 * (W * Hh) / (720 * 1280));
    var aCfg = null;
    if (A) {
      if (!/^mp4a/.test(A.info.codec) || !(aCfg = aacConfig(A.entry))) throw new Error('AAC 가 아닌 소리');
    }
    var dCfg = { codec: V.info.codec, codedWidth: w0, codedHeight: h0, description: boxBytes(V.entry) };
    if (!(await VideoDecoder.isConfigSupported(dCfg)).supported) throw new Error('이 브라우저가 원본 코덱(' + V.info.codec + ')을 못 읽음');
    var eCfg = null;
    for (var c of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028']) {
      var t = { codec: c, width: W, height: Hh, bitrate: bitrate, bitrateMode: 'variable', framerate: 30, avc: { format: 'avc' } };
      if ((await VideoEncoder.isConfigSupported(t)).supported) { eCfg = t; break; }
    }
    if (!eCfg) throw new Error('H.264 인코더 없음');

    var muxer = new window.Mp4Muxer.Muxer({
      target: new window.Mp4Muxer.ArrayBufferTarget(), fastStart: 'in-memory', firstTimestampBehavior: 'offset',
      video: { codec: 'avc', width: W, height: Hh },
      audio: A ? { codec: 'aac', numberOfChannels: A.info.audio.channel_count, sampleRate: A.info.audio.sample_rate } : undefined
    });
    var err = null, fail = function (e) { err = err || e; };
    var enc = new VideoEncoder({ output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); }, error: fail });
    enc.configure(eCfg);
    var cv = new OffscreenCanvas(W, Hh), ctx = cv.getContext('2d'), n = 0, total = dm.vs.length, lastKey = -1e12;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    var dec = new VideoDecoder({
      output: function (frame) {
        try {
          ctx.drawImage(frame, 0, 0, W, Hh); var ts = frame.timestamp, du = frame.duration || undefined; frame.close();
          var vf = new VideoFrame(cv, { timestamp: ts, duration: du }), key = ts - lastKey >= 2e6; if (key) lastKey = ts;
          enc.encode(vf, { keyFrame: key }); vf.close(); n++;
          if (n % 15 === 0) status('영상 압축 중 ' + Math.round(n / total * 100) + '%');
        } catch (e) { fail(e); }
      }, error: fail
    });
    dec.configure(dCfg);
    var ts = V.info.timescale;
    for (var i = 0; i < dm.vs.length && !err; i++) {
      var sm = dm.vs[i];
      dec.decode(new EncodedVideoChunk({ type: sm.is_sync ? 'key' : 'delta', timestamp: Math.round(sm.cts * 1e6 / ts), duration: Math.round(sm.duration * 1e6 / ts), data: sm.data }));
      await wait(function () { return err || (dec.decodeQueueSize < 6 && enc.encodeQueueSize < 6); });
    }
    if (!err) await dec.flush(); if (!err) await enc.flush();
    dec.close(); enc.close();
    if (err) throw err;
    if (A) {
      var ats = A.info.timescale, meta = { decoderConfig: { codec: A.info.codec, numberOfChannels: A.info.audio.channel_count, sampleRate: A.info.audio.sample_rate, description: aCfg } };
      dm.as.forEach(function (a, j) { muxer.addAudioChunkRaw(new Uint8Array(a.data), 'key', Math.round(a.cts * 1e6 / ats), Math.round(a.duration * 1e6 / ats), j ? undefined : meta); });
    }
    muxer.finalize();
    return new File([muxer.target.buffer], (file.name || 'video').replace(/\.[^.]+$/, '') + '.mp4', { type: 'video/mp4' });
  }

  var MB = function (n) { return (n / 1048576).toFixed(1) + 'MB'; };
  async function prepare(file) {
    if (!isVideo(file) || file.size < MIN_BYTES) return file;
    if (!supported()) { console.warn('[영상 압축] 이 브라우저는 WebCodecs 를 지원하지 않아 원본을 올립니다'); return file; }
    status('영상 압축 준비 중…');
    try {
      var out = await transcode(file);
      if (out.size >= file.size * 0.9) { status('압축 효과가 작아 원본을 올립니다'); setTimeout(function () { status(''); }, 2500); return file; }
      status('영상 압축 완료 ' + MB(file.size) + ' → ' + MB(out.size)); setTimeout(function () { status(''); }, 3500);
      return out;
    } catch (e) {
      console.warn('[영상 압축] 원본을 올립니다:', e); status('압축하지 못해 원본을 올립니다 (' + (e && e.message || e) + ')'); setTimeout(function () { status(''); }, 4000);
      return file;
    }
  }
  window.AdminVideoOptimizer = { prepare: prepare, isVideo: isVideo, _transcode: transcode };
})();
