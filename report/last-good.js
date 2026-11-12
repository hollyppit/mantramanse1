// 공개 설정 JSON(게시 목차 /api/reading-editorial, 기능 스위치 /api/luck-flags)을 "마지막으로 받은 값"과 함께 읽는다.
// 2026-11-12: 운영 /api/reading-editorial 응답이 1~30초로 들쭉날쭉한데 화면은 3.5초만 기다리고 실패하면 기본 목차(옛 107장 구성)로 그려,
//   같은 장을 새로 고칠 때마다 옛 버전·새 버전이 번갈아 보였다. 스위치(/api/luck-flags 4초 제한)도 같은 방식으로 꺼진 화면이 섞였다.
// 규칙: ① 응답을 기다린다(저장값이 있으면 timeout 기본 5초, 처음이면 coldTimeout 기본 15초) ② 받은 값은 이 기기에 저장한다
//   ③ 늦거나 실패하면 저장해 둔 마지막 값을 쓴다(늦게 온 응답도 저장해서 다음 방문부터 쓴다).
//   저장값도 없을 때만 null(호출한 쪽의 기본값)이다. 응답 모양이 맞는지는 호출한 쪽이 valid(d)로 판정한다(잘못된 값은 저장하지 않는다).
(function (root) {
  var PREFIX = 'mt_lastgood:';
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function saved(url, valid) {
    var s = store(); if (!s) return null;
    try { var o = JSON.parse(s.getItem(PREFIX + url) || 'null'); return o && o.d != null && (!valid || valid(o.d)) ? o.d : null; } catch (e) { return null; }
  }
  function save(url, d) { var s = store(); if (!s) return; try { s.setItem(PREFIX + url, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { } }
  // opts: { timeout(저장값 있을 때 ms, 기본 5000), coldTimeout(저장값 없을 때 ms, 기본 15000), valid(fn), fetch(테스트용) }. 결과: Promise<{ data, source: 'network'|'saved'|'none' }>
  function load(url, opts) {
    opts = opts || {};
    var valid = opts.valid, ms = saved(url, valid) != null ? (opts.timeout || 5000) : (opts.coldTimeout || 15000), f = opts.fetch || (typeof root.fetch === 'function' ? root.fetch.bind(root) : null);
    return new Promise(function (ok) {
      var done = false;
      function fallback() { if (done) return; done = true; var d = saved(url, valid); ok({ data: d, source: d == null ? 'none' : 'saved' }); }
      var timer = setTimeout(fallback, ms);
      if (!f) { clearTimeout(timer); fallback(); return; }
      try {
        Promise.resolve(f(url, { cache: 'no-store' })).then(function (r) { return r && r.ok ? r.json() : null; }).then(function (d) {
          if (d == null || valid && !valid(d)) { clearTimeout(timer); fallback(); return; }
          save(url, d); // 늦게 도착해도 다음 방문을 위해 저장한다
          if (done) return; done = true; clearTimeout(timer); ok({ data: d, source: 'network' });
        }, function () { clearTimeout(timer); fallback(); });
      } catch (e) { clearTimeout(timer); fallback(); }
    });
  }
  // 예전 getJson(u, ms) 자리에 바로 끼울 수 있는 모양: 값만 돌려준다.
  function json(url, ms, valid) { return load(url, { timeout: ms, coldTimeout: Math.max(ms || 0, 15000), valid: valid }).then(function (r) { return r.data; }); }
  var api = { load: load, json: json, saved: saved, PREFIX: PREFIX };
  root.MantraLastGood = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
