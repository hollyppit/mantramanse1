/* 좋은 신호·주의할 신호 글자 색(2026-11-18) — 만세력·운명의 타임라인 공용, 표시 전용
 *  그려진 화면의 문장 속 판정 말에만 색을 입힌다(계산·문장은 그대로).
 *   초록(좋은 신호): 용신 · 희신 · 순풍 · 도움 쪽 · 유리 · 꼭 필요한/도움 되는 기운
 *   빨강(주의할 신호): 기신 · 구신 · 맞바람 · 부담 쪽 · 불리 · 부담(이 되는) 기운
 *  빼는 곳: 좋고 나쁨을 판단하지 않는 '외부 환경' 칸(.le-s1·.lv-s1), 이미 색이 있는 칩·배지, 그림(svg), 입력칸, 용어 사전.
 *  사용: MantraSignalColors.paint(element) — 화면을 그린 뒤 부른다. 같은 곳을 두 번 칠하지 않는다.
 */
(function (root) {
  'use strict';
  var GOOD = { '용신': 1, '희신': 1, '순풍': 1, '도움 쪽': 1, '유리': 1, '꼭 필요한 기운': 1, '도움 되는 기운': 1, '좋은 신호': 1 }, BAD = { '기신': 1, '구신': 1, '맞바람': 1, '부담 쪽': 1, '불리': 1, '부담 기운': 1, '부담인 기운': 1, '부담이 되는 기운': 1, '주의 신호': 1 };
  // 유리·불리는 낱말 그대로일 때만(유리해요·불리해요·유불리는 건드리지 않는다)
  var RE = /(꼭 필요한 기운|도움 되는 기운|부담이 되는 기운|부담인 기운|부담 기운|좋은 신호|주의 신호|용신|희신|기신|구신|순풍|맞바람|도움 쪽|부담 쪽|(?:^|[^가-힣])(?:유리|불리)(?![가-힣]))/g;
  var SKIP = '.le-s1,.lv-s1,svg,input,select,option,textarea,script,style,.sg-skip,.sw-g,.sw-b,.chip,.wc-chip,.lv-chip,.tq-sgb,.sgb,.ib-g,.ib-b,.lv-up,.lv-down,.gl-list,.glossary,[data-gl]';
  function paint(el) {
    if (!el || !root.document) return 0;
    var doc = root.document, w = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */), list = [], n;
    while ((n = w.nextNode())) { var t = n.nodeValue; if (!t || t.length < 2) continue; RE.lastIndex = 0; if (!RE.test(t)) continue; var p = n.parentElement; if (!p || (p.closest && p.closest(SKIP))) continue; list.push(n); }
    list.forEach(function (node) {
      var t = node.nodeValue, frag = doc.createDocumentFragment(), last = 0, m; RE.lastIndex = 0;
      while ((m = RE.exec(t))) {
        var word = m[0], lead = '', s = m.index;
        if (!GOOD[word] && !BAD[word]) { lead = word.charAt(0); word = word.slice(1); if (!GOOD[word] && !BAD[word]) { lead = ''; word = m[0]; } }
        var st = s + lead.length;
        if (st > last) frag.appendChild(doc.createTextNode(t.slice(last, st)));
        var sp = doc.createElement('span'); sp.className = GOOD[word] ? 'sw-g' : 'sw-b'; sp.textContent = word; frag.appendChild(sp);
        last = st + word.length;
      }
      if (last < t.length) frag.appendChild(doc.createTextNode(t.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    return list.length;
  }
  var api = { paint: paint, GOOD: Object.keys(GOOD), BAD: Object.keys(BAD), RE: RE };
  root.MantraSignalColors = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
