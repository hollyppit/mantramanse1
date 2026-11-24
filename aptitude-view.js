/* 특기·적성 분석 — 화면 그리기 전용(만세력 '특기·적성' 탭). 계산은 aptitude.js, 문안은 aptitude-data.js. 2026-11-25
   · 순서: ① 종합 특기·적성 ② 특기 5영역 ③ 적성 6분야 ④ 운동·스포츠 상세 ⑤ 최종 추천
   · 핵심 요약은 바로 보이고, 근거·연결 해석·주의는 눌러서 펼친다(details).
   · 사용: MantraAptitudeView.html(Manse, ch, { esc, term }) — 결과가 없으면 안내 문단을 돌려준다. */
(function (G) {
  'use strict';
  var LV = { hi: 'good', mid: 'mid', lo: '' }, REC = { strong: 'good', interest: 'mid', pref: '' };
  var CSS = '.apt{scroll-margin-top:110px}.apt .apt-head{font-size:1.15rem;font-weight:700;margin:2px 0 8px;line-height:1.45}' +
    '.apt-base{display:flex;flex-wrap:wrap;gap:4px 6px;margin:0 0 10px}.apt-base span{font-size:.76rem;padding:2px 9px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}' +
    '.apt-lines{margin:0;padding-left:1.1em}.apt-lines li{margin:4px 0;line-height:1.6}' +
    '.apt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}' +
    '.apt-it{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:0}.apt-it>summary{list-style:none;cursor:pointer;padding:11px 13px;display:flex;flex-direction:column;gap:5px}.apt-it>summary::-webkit-details-marker{display:none}' +
    '.apt-n{display:flex;justify-content:space-between;gap:8px;align-items:center;font-weight:700}.apt-e{font-size:.78rem;color:var(--ink-3)}.apt-i{font-size:.88rem;line-height:1.6;color:var(--ink)}.apt-more{font-size:.72rem;color:var(--ink-3)}' +
    '.apt-it[open]>summary .apt-more{display:none}.apt-b{padding:0 13px 12px;font-size:.84rem;line-height:1.6}.apt-b h4{font-size:.78rem;margin:10px 0 4px;color:var(--ink-2)}.apt-b ul{margin:0;padding-left:1.1em}.apt-b p{margin:4px 0}' +
    '.apt-k{display:inline-block;font-size:.68rem;padding:0 6px;border-radius:6px;background:var(--surface-2);color:var(--ink-2);margin-right:4px}' +
    '.apt-acts{display:flex;flex-wrap:wrap;gap:4px}.apt-acts span{font-size:.76rem;padding:2px 9px;border-radius:999px;border:1px solid var(--line)}' +
    '.apt-dots{letter-spacing:2px;color:var(--accent);font-size:.8rem}' +
    '.apt-tr{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin:6px 0 12px}.apt-tr>div{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:.84rem;line-height:1.55}.apt-tr b{display:block;margin-bottom:2px}' +
    '.apt-ax{margin:6px 0 12px}.apt-axr{display:grid;grid-template-columns:5.2em 1fr 5.2em;gap:8px;align-items:center;margin:8px 0 2px;font-size:.8rem}.apt-axr .l{text-align:right}.apt-axr .on{font-weight:700;color:var(--ink)}' +
    '.apt-bar{position:relative;height:8px;border-radius:999px;background:var(--surface-2)}.apt-bar:after{content:"";position:absolute;left:50%;top:-2px;width:1px;height:12px;background:var(--line)}.apt-bar i{position:absolute;top:-3px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--accent);border:2px solid var(--surface)}' +
    '.apt-axt{font-size:.8rem;color:var(--ink-2);margin:0 0 4px;padding-left:calc(5.2em + 8px)}' +
    '.apt-sec{font-size:.86rem;font-weight:700;margin:14px 0 6px;color:var(--ink-2)}' +
    '.apt-rec{list-style:none;margin:0;padding:0}.apt-rec li{border:1px solid var(--line);border-radius:10px;padding:8px 11px;margin:6px 0;line-height:1.55}.apt-rec .from{font-size:.74rem;color:var(--ink-3)}' +
    '.apt-box{border-radius:12px;padding:10px 12px;margin:8px 0;background:var(--surface-2);line-height:1.6;font-size:.88rem}' +
    '@media(max-width:600px){.apt-axr{grid-template-columns:4.4em 1fr 4.4em}.apt-axt{padding-left:0}}';
  var injected = false;
  function inject() { if (injected || typeof document === 'undefined') return; injected = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }

  function html(M, ch, o) {
    inject();
    var esc = o.esc, term = o.term || function (t, l) { return esc(l || t); };
    var A = G.MantraAptitude, r;
    try { r = A.build(M, ch); } catch (e) { r = { ok: false, reason: '계산 중 문제가 생겼어요' }; }
    if (!r || !r.ok) return '<section class="card"><div class="card-h"><h2>특기·적성 분석</h2></div><p class="note">' + esc((r && r.reason) || '결과를 만들 수 없어요') + '</p></section>';
    var chip = function (t, c) { return '<span class="wc-chip ' + (c || '') + '">' + esc(t) + '</span>'; };
    var dots = function (lv) { return '<span class="apt-dots" aria-hidden="true">' + (lv === 'hi' ? '●●●' : lv === 'mid' ? '●●○' : '●○○') + '</span>'; };
    var basisUl = function (b) { return b.length ? '<ul>' + b.map(function (x) { return '<li><span class="apt-k">' + esc(x.kind) + '</span>' + esc(x.label) + '</li>'; }).join('') + '</ul>' : '<p class="muted">근거 없음</p>'; };
    var acts = function (a) { return a && a.length ? '<div class="apt-acts">' + a.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : ''; };
    var card = function (it) {
      if (!it.ok) return '<div class="apt-it"><summary><span class="apt-n">' + esc(it.name) + chip('근거 부족') + '</span><span class="apt-i">' + esc(it.interp) + '</span></summary></div>';
      return '<details class="apt-it"><summary><span class="apt-n"><span>' + esc(it.name) + '</span>' + chip(it.levelK, LV[it.level]) + '</span><span class="apt-e">' + esc(it.easy) + ' ' + dots(it.level) + '</span>' +
        '<span class="apt-i">' + esc(it.interp) + '</span><span class="apt-more">눌러서 근거·연결 해석·추천 활동 보기</span></summary><div class="apt-b">' +
        '<h4>명식 근거</h4>' + basisUl(it.basis) + (it.link ? '<h4>내 명식과의 연결</h4><p>' + esc(it.link) + '</p>' : '') +
        (it.acts.length ? '<h4>떠올려 볼 활동</h4>' + acts(it.acts) : '') + (it.care ? '<h4>함께 알아 둘 점</h4><p>' + esc(it.care) + '</p>' : '') +
        '<p class="small muted">' + esc(it.confK) + (r.hourKnown ? '' : ' · 시주 없이 계산') + '</p></div></details>';
    };
    var s = r.summary, sp = r.sport, f = r.final;
    // ⓪ 한눈에 보기(2026-11-25): 원국 한눈에 보기(natal-overview.js)와 같은 ov-* 카드. 칸마다 해당 구역으로 이동
    var ov = '';
    try {
      if (G.MantraNatalOverview && G.MantraNatalOverview.injectCss) G.MantraNatalOverview.injectCss();
      var go = function (id, label) { return '<button type="button" class="btn-link" data-apt-go="' + id + '">' + esc(label) + ' ›</button>'; };
      var blk = function (title, id, big, small, chips, easy) {
        return '<div class="ov-b"><div class="ov-h"><div class="ov-ht">' + esc(title) + '</div>' + go(id, '자세히') + '</div>' +
          '<div class="ov-big">' + esc(big) + (small ? '<small>' + esc(small) + '</small>' : '') + '</div>' + (chips ? '<div class="ov-chips">' + chips + '</div>' : '') + (easy ? '<p class="ov-easy">' + esc(easy) + '</p>' : '') + '</div>';
      };
      var oc = function (t, c) { return '<span class="ov-chip ' + (c || '') + '">' + esc(t) + '</span>'; };
      var bySc = function (a) { return a.filter(function (x) { return x.ok; }).slice().sort(function (x, y) { return (y.score - x.score) || (x.id < y.id ? -1 : 1); }); };
      var ts = bySc(r.talents), fs = bySc(r.fields), cs = sp.categories.filter(function (c) { return c.ok; }).sort(function (a, b) { return a.rank - b.rank; });
      var b1 = ts[0] ? blk('대표 특기', 'aptTalent', ts[0].name, ts[0].levelK, ts.slice(1, 3).map(function (t) { return oc(t.name + ' ' + t.levelK, LV[t.level]); }).join(''), ts[0].interp) : '';
      var b2 = fs[0] ? blk('대표 적성', 'aptField', fs[0].name, fs[0].levelK, fs.slice(1, 3).map(function (t) { return oc(t.name + ' ' + t.levelK, LV[t.level]); }).join(''), fs[0].interp) : '';
      var b3 = cs[0] ? blk('운동 · 먼저 볼 종목', 'aptSport', cs[0].name, cs[0].recK, cs.slice(1, 3).map(function (c) { return oc(c.name + ' · ' + c.recK, REC[c.rec]); }).join(''), cs[0].why) : '';
      var lean = sp.axes.filter(function (a) { return a.ok && a.side !== 'bal'; });
      var b4 = blk('활동 방식', 'aptSport', lean.length ? lean.slice().sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0].sideK + ' 쪽' : '균형형', lean.length ? lean.length + '개 축이 기울어 있음' : '',
        sp.axes.filter(function (a) { return a.ok; }).map(function (a) { return oc(a.side === 'bal' ? a.L + '·' + a.R + ' 균형' : a.sideK + (a.deg === 'clear' ? ' 뚜렷' : ' 조금'), a.side === 'bal' ? '' : 'mid'); }).join(''), '');
      var b5 = f.activities.length ? blk('먼저 해 볼 활동', 'aptFinal', f.activities[0].name, f.activities[0].recK, f.activities.slice(1).map(function (a) { return oc(a.name, REC[a.rec]); }).join(''), f.longTerm ? '오래 다듬어 볼 활동: ' + f.longTerm.name : '') : '';
      var b6 = '';
      if (o.career !== false && M.careerProfile) {
        var P = M.careerProfile(ch), top = (P && P.top) || [];
        if (top.length) b6 = blk('직업 · 강점 활용 분야', 'aptCareer', top[0].name, '조화도 ' + top[0].score, top.slice(1, 3).map(function (c) { return oc(c.name + ' ' + c.score); }).join(''), P.envSummary && P.envSummary.text ? P.envSummary.text : '');
      }
      ov = '<section class="card apt" id="aptOverview"><div class="card-h"><h2>한눈에 보기</h2><span class="note">칸을 누르면 자세한 풀이로 이동해요</span></div>' +
        '<div class="ov"><p class="ov-top">' + esc(s.head) + '</p><div class="ov-grid">' + b1 + b2 + b3 + b4 + b5 + b6 + '</div>' +
        '<p class="ov-note">' + esc(r.disclaimer) + '</p></div></section>';
    } catch (e) { ov = ''; }
    // ① 종합
    var h1 = '<section class="card apt" id="aptSummary"><div class="card-h"><h2>종합 특기·적성</h2><span class="note">명식으로 본 활동 성향 참고</span></div>' +
      '<p class="apt-head">' + esc(s.head) + '</p><div class="apt-base">' + s.base.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<ul class="apt-lines">' + s.lines.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<details class="apt-it" style="margin-top:10px"><summary><span class="apt-more">어떻게 봤나요?</span></summary><div class="apt-b"><ul>' + r.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></details></section>';
    // ② 특기 5영역
    var h2 = '<section class="card apt" id="aptTalent"><div class="card-h"><h2>특기 5영역</h2><span class="note">어떤 방식으로 힘을 쓰기 쉬운지</span></div><div class="apt-grid">' + r.talents.map(card).join('') + '</div></section>';
    // ③ 적성 6분야
    var h3 = '<section class="card apt" id="aptField"><div class="card-h"><h2>적성 6분야</h2><span class="note">어떤 활동 분야에 끌리기 쉬운지</span></div><div class="apt-grid">' + r.fields.map(card).join('') + '</div></section>';
    // ④ 운동·스포츠 상세
    var tr = '<div class="apt-tr">' + sp.traits.map(function (t) { return '<div><b>' + esc(t.name) + ' ' + (t.ok ? chip(t.levelK, t.bipolar ? '' : LV[t.level]) : chip('근거 부족')) + '</b>' + esc(t.interp) + '</div>'; }).join('') + '</div>';
    var ax = '<div class="apt-ax">' + sp.axes.map(function (a) {
      if (!a.ok) return '<p class="small muted">' + esc(a.name) + ' — ' + esc(a.text) + '</p>';
      var left = 50 - a.pos * 50;
      return '<div class="apt-axr"><span class="l' + (a.side === 'L' ? ' on' : '') + '">' + esc(a.L) + '</span><span class="apt-bar" role="img" aria-label="' + esc(a.name + ': ' + a.sideK + (a.side === 'bal' ? '' : ' ' + a.degK)) + '"><i style="left:' + left.toFixed(1) + '%"></i></span><span class="r' + (a.side === 'R' ? ' on' : '') + '">' + esc(a.R) + '</span></div><p class="apt-axt">' + esc(a.text) + '</p>';
    }).join('') + '<p class="small muted">상대적인 기울기예요. 한쪽이 맞고 다른 쪽이 틀린 것이 아니에요.</p></div>';
    var cats = sp.categories.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (c) {
      if (!c.ok) return '<div class="apt-it"><summary><span class="apt-n">' + esc(c.name) + chip('근거 부족') + '</span><span class="apt-i">' + esc(c.interp) + '</span></summary></div>';
      return '<details class="apt-it"><summary><span class="apt-n"><span>' + esc(c.name) + '</span>' + chip(c.recK, REC[c.rec]) + '</span><span class="apt-e">' + esc(c.ex.join(' · ')) + '</span>' +
        '<span class="apt-i"><b>탐색해 볼 이유</b> · ' + esc(c.why) + '</span><span class="apt-more">눌러서 활동 특성·명리 성향·고려할 점 보기</span></summary><div class="apt-b">' +
        '<h4>활동 특성</h4><p>' + esc(c.feature) + '</p><h4>관련 명리 성향</h4><p>' + esc(c.myeongri) + '</p>' +
        '<h4>내 명식과의 연결</h4><p>' + esc(c.link) + '</p>' + basisUl(c.basis) +
        '<h4>활동 방식에서 고려할 점</h4>' + c.consider.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
        '<p class="small muted">' + esc(c.confK) + '</p></div></details>';
    }).join('');
    var h4 = '<section class="card apt" id="aptSport"><div class="card-h"><h2>운동·스포츠 상세</h2><span class="note">성향 → 활동 방식 → 종목 순서로</span></div>' +
      '<div class="apt-sec">운동 성향 6가지</div>' + tr + '<div class="apt-sec">활동 방식 5가지 기울기</div>' + ax +
      '<div class="apt-sec">종목 6분야</div><div class="apt-grid">' + cats + '</div></section>';
    // ⑤ 최종 추천
    var h5 = '<section class="card apt" id="aptFinal"><div class="card-h"><h2>최종 추천</h2><span class="note">직접 해 보며 맞는지 확인해 보세요</span></div>' +
      '<div class="apt-sec">탐색해 볼 활동</div><ul class="apt-rec">' + f.activities.map(function (a) { return '<li><b>' + esc(a.name) + '</b> ' + chip(a.recK, REC[a.rec]) + ' <span class="from">' + esc(a.from) + '</span><br><span class="small">' + esc(a.why) + '</span></li>'; }).join('') + '</ul>' +
      (f.longTerm ? '<div class="apt-sec">오래 붙잡고 다듬어 볼 활동</div><div class="apt-box"><b>' + esc(f.longTerm.name) + '</b> <span class="small muted">' + esc(f.longTerm.from) + '</span><br>' + esc(f.longTerm.why) + '</div>' : '') +
      (f.complement ? '<div class="apt-sec">곁들이면 좋은 보완 성향</div><div class="apt-box"><b>' + esc(f.complement.name) + '</b> <span class="small muted">' + esc(f.complement.levelK) + '</span><br>' + esc(f.complement.text) + (f.yongNote ? '<br><span class="small muted">' + esc(f.yongNote) + '</span>' : '') + '</div>' : '') +
      '<p class="small muted" style="margin-top:6px">추천 수준: <b>적극 탐색 추천</b>(먼저 체험해 볼 만함) · <b>관심 가져볼 활동</b>(기회가 되면 시도) · <b>취향에 따라 선택</b>(주된 방향은 아니지만 고를 수 있음)</p>' +
      '<p class="note">' + esc(r.disclaimer) + '</p></section>';
    return ov + h1 + h2 + h3 + h4 + h5;
  }
  // 한눈에 보기 '자세히' → 해당 구역으로 스크롤(접힌 카드면 펼침)
  if (typeof document !== 'undefined') document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('[data-apt-go]'); if (!b) return;
    var el = document.getElementById(b.getAttribute('data-apt-go')); if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  var API = { html: html };
  G.MantraAptitudeView = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
