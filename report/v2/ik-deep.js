// 풀이 지식(IK) → 서비스 연결. 관리자가 게시·검수한 풀이 지식으로 만든 "더 깊이 보기" 풀이를 /api/ik?a=deep 에서 받아 온다.
// 서비스에는 AI 호출 없이 검수된 문장만 실린다. 생년월일은 보내지 않고(간지·십성 요약 sd 만), 실패·지연·서비스 연결 OFF 이면 null 을 돌려 기존 리포트가 그대로 진행된다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var DOMAINS = ['SELF', 'MONEY', 'CAREER', 'LOVE', 'MARRIAGE', 'RELATIONSHIP', 'TIMING', 'ACTION'];
  // → Promise<{ MONEY: { title, sections: [{ id, title, paras: [] }] }, … } | null>
  function load(M, ch, sd, waitMs) {
    var sdx = {}; Object.keys(sd || {}).forEach(function (k) { if (k !== 'birth') sdx[k] = sd[k]; });
    var ext = { future: [] }; try { var Y = sd.nowYear; ext.future = M.seunRange(ch, Y, Y + 4).map(function (x, i) { return { year: Y + i, season: R.SajuData.seasonOf(x.ev) }; }); } catch (e) { }
    var ctl = root.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, waitMs || 6000);
    return fetch('/api/ik?a=deep', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sd: sdx, ext: ext, domains: DOMAINS }), signal: ctl && ctl.signal })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { return d && d.ok && d.enabled && d.domains && Object.keys(d.domains).length ? d.domains : null; }).catch(function () { return null; }).then(function (x) { clearTimeout(tm); return x; });
  }
  R.IKDeep = { load: load, DOMAINS: DOMAINS };
})(typeof window !== 'undefined' ? window : globalThis);
