// 용어 각주(2026-11-23): 상세풀이 본문의 명리 용어를 누르면 한두 문장짜리 뜻이 말풍선으로 뜬다.
//   mark(html, sd) → html   본문 HTML 의 글자 부분에서 용어를 찾아 <button class="tn"> 로 감싼다.
//     · 장(호출) 하나에서 같은 용어는 처음 나올 때만 단추로 만든다.
//     · "대운(10년 단위의 흐름)"처럼 용어 바로 뒤 괄호 뜻(숫자 없는 짧은 괄호)은 걷어내고, 그 자리는 늘 단추로 만든다(뜻을 말풍선으로 옮김).
//     · 제목(h2·h3)·단추·링크·펼침 제목·그림·표 머리 안은 건드리지 않는다.
//   뜻: term-notes-data.js(만세력 용어 사전 명리 분야, tools/build-term-notes.cjs 로 생성) + terms.js 의 "내 사주에서는" 한 줄(sd 값).
//   계산은 하지 않는다. 화면 전용이라 DB 게시본은 바뀌지 않는다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var data = function () { return root.MantraTermNotesData || {}; };
  var SKIP_TAGS = { h1: 1, h2: 1, h3: 1, h4: 1, button: 1, a: 1, summary: 1, figcaption: 1, figure: 1, svg: 1, script: 1, style: 1, textarea: 1, select: 1, label: 1, dt: 1, dd: 1, title: 1 };
  // 용어 뒤에 붙으면 동사·형용사·다른 낱말이라 용어로 보지 않는다(무관해요·관대한·지지해·상관없이·파격적·고지서·일원으로)
  var AFTER_SKIP = /^(?:하|해|한|할|합|했|함|없|적|서|으로)/;
  var NO_MARK = { '태세': 1, '일원': 1, '고지': 1, '극약': 1, '병존': 1, '일진': 1 };
  var re = null, reKeys = 0;
  function pattern() {
    var D = data(), keys = Object.keys(D).filter(function (k) { return k.length >= 2 && !NO_MARK[k]; });
    if (re && reKeys === keys.length) return re;
    keys.sort(function (a, b) { return b.length - a.length; });
    reKeys = keys.length; re = keys.length ? new RegExp(keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g') : null;
    return re;
  }
  var HANGUL = /[가-힣]/;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function btn(k, label) { return '<button type="button" class="tn" data-tn="' + esc(k) + '" aria-expanded="false" aria-haspopup="dialog">' + label + '</button>'; }
  // 글자 조각 하나 처리. seen: 이 장에서 이미 단추로 만든 용어
  // folded: 접힌 <details> 안. 거기서는 괄호 뜻을 걷은 자리만 단추로 만들고 '처음 나옴'으로 치지 않는다(펼친 본문에 단추가 남게)
  function markText(t, seen, folded) {
    var P = pattern(); if (!P) return t;
    var out = '', last = 0, m; P.lastIndex = 0;
    while ((m = P.exec(t))) {
      var k = m[0], s = m.index, e = s + k.length, prev = s > 0 ? t.charAt(s - 1) : '';
      if (prev && HANGUL.test(prev)) continue;                       // 열정인·현재성 같은 낱말 속
      var after = t.slice(e);
      if (AFTER_SKIP.test(after)) continue;
      if (k === '지지' && /^(?:를 받|를 해|가 있)/.test(after)) continue;
      // 걷는 괄호: 한글 뜻풀이만. 연도(2017)·범위(~)·비율(%)·점수처럼 이 사주의 값이 든 괄호는 남긴다
      var gloss = after.match(/^\(([^()%~]{1,40})\)/), strip = gloss && /[가-힣]/.test(gloss[1]) && !/\d{3,}|\d+\s*(?:점|세|살)/.test(gloss[1]) ? gloss[0].length : 0;
      if (!strip && (seen[k] || folded)) continue;
      if (!folded) seen[k] = 1;
      out += t.slice(last, s) + btn(k, t.slice(s, e)); last = e + strip; P.lastIndex = e + strip;
    }
    return out + t.slice(last);
  }
  function mark(html, sd) {
    if (sd) R.TermNotes.sd = sd;
    if (!html || !pattern()) return html;
    var parts = String(html).split(/(<[^>]+>)/), skip = [], seen = {}, folded = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; if (!p) continue;
      if (p.charAt(0) === '<') {
        var tm = p.match(/^<\/?([a-zA-Z0-9]+)/); if (!tm) continue; var tag = tm[1].toLowerCase();
        if (tag === 'details' && !/\bopen\b/.test(p)) { folded += p.charAt(1) === '/' ? -1 : 1; if (folded < 0) folded = 0; continue; }
        if (!SKIP_TAGS[tag]) continue;
        if (p.charAt(1) === '/') { var at = skip.lastIndexOf(tag); if (at >= 0) skip.splice(at, 1); }
        else if (!/\/>$/.test(p)) skip.push(tag);
        continue;
      }
      if (!skip.length) parts[i] = markText(p, seen, folded > 0);
    }
    return parts.join('');
  }
  function note(k, sd) {
    var d = data()[k]; if (!d) return null;
    var here = '';
    try { var x = R.Terms && R.Terms.explain(k, sd || R.TermNotes.sd || {}); here = x && x.here || ''; } catch (e) { here = ''; }
    return { term: k, easy: String(d.e || '').replace(/^["“]|["”]$/g, ''), plain: d.p || '', here: here };
  }

  // ── 말풍선(브라우저)
  var pop = null, owner = null, scrollAt = 0;
  function close(focusBack) {
    if (!pop) return; pop.remove(); pop = null;
    if (owner) { owner.setAttribute('aria-expanded', 'false'); if (focusBack) try { owner.focus({ preventScroll: true }); } catch (e) { } }
    owner = null;
  }
  function open(b) {
    var n = note(b.getAttribute('data-tn')); if (!n) return;
    close(false); owner = b; b.setAttribute('aria-expanded', 'true');
    pop = root.document.createElement('div'); pop.className = 'tn-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', n.term + ' 뜻');
    pop.innerHTML = '<div class="tn-pop-h"><b>' + esc(n.term) + '</b>' + (n.easy ? '<span>' + esc(n.easy) + '</span>' : '') + '</div>'
      + (n.plain ? '<p>' + esc(n.plain) + '</p>' : '')
      + (n.here ? '<p class="tn-here"><em>내 사주에서는</em> ' + esc(n.here.replace(/^여기서 /, '')) + '</p>' : '')
      + '<button type="button" class="tn-x" aria-label="닫기">닫기</button>';
    root.document.body.appendChild(pop);
    var r = b.getBoundingClientRect(), W = root.innerWidth, H = root.innerHeight, pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.max(12, Math.min(r.left, W - pw - 12)), top = r.bottom + 8;
    if (top + ph > H - 12 && r.top - ph - 8 > 12) top = r.top - ph - 8;
    pop.style.left = left + 'px'; pop.style.top = Math.max(12, top) + 'px';
    scrollAt = root.scrollY || 0;
    try { pop.querySelector('.tn-x').focus({ preventScroll: true }); } catch (e) { }
  }
  function install() {
    var doc = root.document; if (!doc || doc.__tnInstalled) return; doc.__tnInstalled = true;
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      var b = t.closest('button.tn');
      if (b) { e.preventDefault(); e.stopPropagation(); if (owner === b) close(true); else open(b); return; }
      if (pop && t.closest('.tn-x')) { e.preventDefault(); e.stopPropagation(); close(true); return; }
      if (pop && !t.closest('.tn-pop')) close(false);
    }, true);
    doc.addEventListener('keydown', function (e) { if (pop && e.key === 'Escape') close(true); });
    root.addEventListener('scroll', function () { if (pop && Math.abs((root.scrollY || 0) - scrollAt) > 40) close(false); }, { passive: true });
    doc.addEventListener('scroll', function (e) { if (pop && e.target !== doc && !(e.target.closest && e.target.closest('.tn-pop'))) close(false); }, { capture: true, passive: true });
    root.addEventListener('resize', function () { close(false); });
  }
  R.TermNotes = { mark: mark, markText: markText, note: note, close: close, sd: null };
  if (root.document) install();
  if (typeof module !== 'undefined' && module.exports) module.exports = R.TermNotes;
})(typeof window !== 'undefined' ? window : globalThis);
