// 뷰어 오류 수집 — 클라이언트. 설계: report/v2/ERROR_LOG_DESIGN.md · 서버: functions/api/errlog.js(기본 꺼짐, env.ERRLOG_ON=1 일 때만 저장)
// 개인정보를 보내지 않는다: 메시지는 scrub 로 날짜·숫자 열·이메일·URL 을 지우고 160자로 자른다(서버가 다시 한 번 정리한다).
// 이름·입력값·풀이 문장·localStorage·쿠키는 읽지도 보내지도 않는다. 사용자 에이전트는 "모바일 여부·브라우저 계열"로만 분류한다.
// 안전장치: 세션당 5건, 같은 서명 1회, 보고 중 오류 무시(재귀 방지), 응답을 기다리지 않음, 실패해도 사용자에게 아무것도 보이지 않음.
// 끄는 조건: 관리자 미리보기(?preview=1), 디버그(?debug=1 은 콘솔에만 출력), Do Not Track, 서버가 꺼짐(x-errlog: off)을 알린 세션.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var MAX_SESSION = 5, MAX_MSG = 160, URL = '/api/errlog', sent = 0, seen = {}, inReport = false, ctxFn = null, sender = null, installed = false;
  var OFF_KEY = 'mt_errlog_off';

  // functions/_errlog.js scrub 와 같은 규칙(tests/errlog-sim.js 가 두 구현의 결과가 같은지 확인한다)
  function scrub(s, max) {
    var t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ');
    t = t.replace(/https?:\/\/[^\s)"']+/gi, '<url>');
    t = t.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>');
    t = t.replace(/\d{4}\s*[-./년]\s*\d{1,2}\s*[-./월]\s*\d{1,2}(?:\s*일)?/g, '#');
    t = t.replace(/\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?/g, '#'); // 시각(출생 시각이 섞일 수 있다)
    t = t.replace(/\d{4,}/g, '#');
    t = t.replace(/(["'“‘「])([^"'”’」]{13,})(["'”’」])/g, function (m, a, b, c) { return a + b.slice(0, 12) + '…' + c; });
    t = t.replace(/[ㄱ-ㆎ가-힣一-鿿]+/g, '<ko>'); // 한글·한자 연속은 지운다: 이름 같은 사용자 값은 문장 속에서 모양으로 가려낼 수 없다(위치는 src:line·where 로 알 수 있다)
    t = t.replace(/\s+/g, ' ').trim();
    return t.length > (max || MAX_MSG) ? t.slice(0, max || MAX_MSG) : t;
  }
  function basename(u) { var s = String(u || '').split('?')[0].split('#')[0].split('/').pop(); return /^[\w.-]{1,40}$/.test(s) ? s : ''; }
  function envInfo() {
    var ua = (root.navigator && root.navigator.userAgent) || '', c = root.navigator && root.navigator.connection;
    var br = /Edg\//.test(ua) ? 'edge' : /Firefox\//.test(ua) ? 'firefox' : /Chrome\//.test(ua) || /CriOS\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other';
    return { mobile: /Mobi|Android|iPhone|iPad/i.test(ua), br: br, saveData: !!(c && c.saveData) };
  }
  function disabled() {
    try { if (root.sessionStorage && root.sessionStorage.getItem(OFF_KEY) === '1') return true; } catch (e) { }
    var q = (root.location && root.location.search) || '';
    if (/[?&]preview=1\b/.test(q) || /[?&]errlog=0\b/.test(q)) return true;
    if (root.navigator && (root.navigator.doNotTrack === '1' || root.doNotTrack === '1')) return true;
    return false;
  }
  function markOff() { try { root.sessionStorage.setItem(OFF_KEY, '1'); } catch (e) { } }
  function debug() { return /[?&]debug=1\b/.test((root.location && root.location.search) || ''); }

  // 서버로 한 건 보낸다. sender 를 주입할 수 있다(테스트).
  function send(rep) {
    if (sender) return sender(rep);
    var body = JSON.stringify(rep);
    try { if (root.navigator && root.navigator.sendBeacon && root.navigator.sendBeacon(URL, new Blob([body], { type: 'application/json' }))) return; } catch (e) { }
    try { if (root.fetch) root.fetch(URL, { method: 'POST', body: body, headers: { 'content-type': 'application/json' }, keepalive: true }).then(function (r) { if (r && r.headers && r.headers.get('x-errlog') === 'off') markOff(); }, function () { }); } catch (e) { }
  }

  // report('error'|'rejection'|'caught'|'asset', { where, msg, src, line })
  function report(kind, o) {
    if (inReport) return false; inReport = true;
    try {
      o = o || {}; if (disabled() && !debug()) return false;
      if (sent >= MAX_SESSION) return false;
      var c = {}; try { c = ctxFn ? (ctxFn() || {}) : {}; } catch (e) { c = {}; }
      var rep = { kind: kind, where: o.where || 'global', msg: kind === 'caught' || kind === 'asset' ? '' : scrub(o.msg), src: basename(o.src), line: o.line | 0,
        ch: c.ch || '', world: c.world || '', flow: c.flow || '', v: c.v || '', env: envInfo() };
      var sig = [rep.kind, rep.where, rep.src, rep.line, rep.msg.slice(0, 80)].join('|'); if (seen[sig]) return false; seen[sig] = 1; sent++;
      if (debug()) { if (root.console) console.log('[errlog]', rep); return true; }
      send(rep); return true;
    } catch (e) { return false; } finally { inReport = false; }
  }

  function install() {
    if (installed || !root.addEventListener) return; installed = true;
    root.addEventListener('error', function (e) {
      // 자원(img·video·script) 로드 실패는 error 이벤트가 window 까지 올라오지 않거나 target 이 요소다 — 여기서는 스크립트 오류만 본다
      if (e && e.target && e.target !== root && e.target.tagName) return;
      report('error', { where: 'window.error', msg: e && e.message, src: e && e.filename, line: e && e.lineno });
    });
    root.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason; report('rejection', { where: 'promise', msg: r && (r.message || String(r)) });
    });
  }
  // 컨텍스트(지금 보던 챕터·세계·흐름·콘텐츠 버전)를 돌려주는 함수를 뷰어가 등록한다.
  function setContext(fn) { ctxFn = typeof fn === 'function' ? fn : null; }

  R.ErrLog = { install: install, report: report, setContext: setContext, scrub: scrub, _setSender: function (f) { sender = f; }, _reset: function () { sent = 0; seen = {}; inReport = false; } };
  install();
})(typeof window !== 'undefined' ? window : globalThis);
