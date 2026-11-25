/* 특기·적성 분석 — 화면 그리기 전용(만세력 '특기·적성' 탭). 계산은 aptitude.js, 문안은 aptitude-data.js. 2026-11-25
   · 2026-11-26 세분화: 특기 카드에 결 3가지(typeBlock)·적성 카드에 앞선 세부 분야·추천에 결 활동, 세부 분야·축 수는 결과 길이대로
   · 흐름(2026-11-25 개편): 한눈에 보기(종합 흡수) → [활동·취미 | 직업·일] 전환
       활동·취미: 특기 5영역(방식) → 적성 6분야(분야, 이어진 특기) → 분야별 상세(6분야 선택, 기본은 대표 적성) → 추천
       직업·일: 직업·활동 적성(index.html renderCareer 결과를 opt.careerHtml 로 받아 그대로 넣음 — 계산 섞지 않음)
   · 전환·분야 선택은 다시 그리지 않고 화면에서만 바꾼다(선택은 localStorage 에 기억).
   · 사용: MantraAptitudeView.html(Manse, ch, { esc, term, careerHtml }) */
(function (G) {
  'use strict';
  var LV = { hi: 'good', mid: 'mid', lo: '' }, REC = { strong: 'good', interest: 'mid', pref: '' };
  var KEY_MODE = 'mt_apt_mode', KEY_FIELD = 'mt_apt_field';
  var CSS = '.apt{scroll-margin-top:110px}' +
    '.apt-base{display:flex;flex-wrap:wrap;gap:4px 6px;margin:0}.apt-base span{font-size:.74rem;padding:2px 9px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}' +
    '.apt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}' +
    '.apt-it{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:0}.apt-it>summary{list-style:none;cursor:pointer;padding:11px 13px;display:flex;flex-direction:column;gap:5px}.apt-it>summary::-webkit-details-marker{display:none}' +
    '.apt-n{display:flex;justify-content:space-between;gap:8px;align-items:center;font-weight:700}.apt-e{font-size:.78rem;color:var(--ink-3)}.apt-i{font-size:.88rem;line-height:1.6;color:var(--ink)}.apt-more{font-size:.72rem;color:var(--ink-3)}' +
    '.apt-it[open]>summary .apt-more{display:none}.apt-b{padding:0 13px 12px;font-size:.84rem;line-height:1.6}.apt-b h4{font-size:.78rem;margin:10px 0 4px;color:var(--ink-2)}.apt-b ul{margin:0;padding-left:1.1em}.apt-b p{margin:4px 0}' +
    '.apt-k{display:inline-block;font-size:.68rem;padding:0 6px;border-radius:6px;background:var(--surface-2);color:var(--ink-2);margin-right:4px}' +
    '.apt-acts{display:flex;flex-wrap:wrap;gap:4px}.apt-acts span{font-size:.76rem;padding:2px 9px;border-radius:999px;border:1px solid var(--line)}' +
    '.apt-dots{letter-spacing:2px;color:var(--accent);font-size:.8rem}.apt-lk{font-size:.74rem;color:var(--ink-3)}' +
    '.apt-tr{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin:6px 0 12px}.apt-tr>div{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:.84rem;line-height:1.55}.apt-tr b{display:block;margin-bottom:2px}' +
    '.apt-ax{margin:6px 0 12px}.apt-axr{display:grid;grid-template-columns:6.4em 1fr 6.4em;gap:8px;align-items:center;margin:8px 0 2px;font-size:.8rem}.apt-axr .l{text-align:right}.apt-axr .on{font-weight:700;color:var(--ink)}' +
    '.apt-bar{position:relative;height:8px;border-radius:999px;background:var(--surface-2)}.apt-bar:after{content:"";position:absolute;left:50%;top:-2px;width:1px;height:12px;background:var(--line)}.apt-bar i{position:absolute;top:-3px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--accent);border:2px solid var(--surface)}' +
    '.apt-axt{font-size:.8rem;color:var(--ink-2);margin:0 0 4px;padding-left:calc(6.4em + 8px)}' +
    '.apt-sec{font-size:.86rem;font-weight:700;margin:14px 0 6px;color:var(--ink-2)}' +
    '.apt-rec{list-style:none;margin:0;padding:0}.apt-rec li{border:1px solid var(--line);border-radius:10px;padding:8px 11px;margin:6px 0;line-height:1.55}.apt-rec .from{font-size:.74rem;color:var(--ink-3)}' +
    '.apt-box{border-radius:12px;padding:10px 12px;margin:8px 0;background:var(--surface-2);line-height:1.6;font-size:.88rem}' +
    '.apt-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:5px;border-radius:14px;background:var(--surface-2);margin:0 0 14px}.apt-seg button{border:0;border-radius:10px;padding:10px 8px;font-weight:700;font-size:.95rem;background:transparent;color:var(--ink-2);cursor:pointer}.apt-seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.08)}.apt-seg small{display:block;font-weight:500;font-size:.72rem;color:var(--ink-3);margin-top:2px}' +
    '.apt-fsel{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.apt-fsel button{border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-size:.82rem;background:var(--surface);color:var(--ink-2);cursor:pointer}.apt-fsel button.on{border-color:var(--accent);color:var(--ink);font-weight:700;background:color-mix(in srgb,var(--accent) 10%,var(--surface))}' +
    '.apt-intro{font-size:.88rem;color:var(--ink-2);margin:0 0 6px}.ov-grp{grid-column:1/-1;font-size:.78rem;font-weight:800;color:var(--ink-3);margin:4px 0 -2px}.ov-b.go{cursor:pointer}' +
    '#aptOverview .ov-grid{grid-template-columns:repeat(3,1fr)}@media(max-width:900px){#aptOverview .ov-grid{grid-template-columns:1fr 1fr}}@media(max-width:640px){#aptOverview .ov-grid{grid-template-columns:1fr}}' +
    '.apt-b ul.apt-ty{list-style:none;margin:4px 0 0;padding:0}.apt-ty li{border:1px solid var(--line);border-radius:10px;padding:7px 10px;margin:5px 0;line-height:1.55}.apt-ty li.apt-ty1{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 6%,var(--surface))}.apt-ty .rk{display:inline-block;margin-right:5px;font-size:.72rem;font-weight:800;color:var(--accent)}.apt-ty .bs{display:block;font-size:.74rem;color:var(--ink-3);margin-top:2px}' +
    '.apt-tyl{font-size:.8rem;color:var(--ink-2)}.apt-tyl b{color:var(--ink)}.apt-ts{font-size:.74rem;color:var(--ink-3)}' +
    '@media(max-width:600px){.apt-axr{grid-template-columns:5.6em 1fr 5.6em}.apt-axt{padding-left:0}}';
  var injected = false;
  function inject() { if (injected || typeof document === 'undefined') return; injected = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var save = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };

  function html(M, ch, o) {
    inject();
    var esc = o.esc, term = o.term || function (t, l) { return esc(l || t); };
    var A = G.MantraAptitude, r;
    try { r = A.build(M, ch); } catch (e) { r = { ok: false, reason: '계산 중 문제가 생겼어요' }; }
    if (!r || !r.ok) return '<section class="card"><div class="card-h"><h2>특기·적성 분석</h2></div><p class="note">' + esc((r && r.reason) || '결과를 만들 수 없어요') + '</p></section>' + (o.careerHtml || '');
    var chip = function (t, c) { return '<span class="wc-chip ' + (c || '') + '">' + esc(t) + '</span>'; };
    var dots = function (lv) { return '<span class="apt-dots" aria-hidden="true">' + (lv === 'hi' ? '●●●' : lv === 'mid' ? '●●○' : '●○○') + '</span>'; };
    var basisUl = function (b) { return b.length ? '<ul>' + b.map(function (x) { return '<li><span class="apt-k">' + esc(x.kind) + '</span>' + esc(x.label) + '</li>'; }).join('') + '</ul>' : '<p class="muted">근거 없음</p>'; };
    var acts = function (a) { return a && a.length ? '<div class="apt-acts">' + a.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : ''; };
    var linkLine = function (ls) { return ls && ls.length ? '<span class="apt-lk">이어진 특기: ' + ls.map(function (l) { return esc(l.name) + '(' + esc(l.levelK) + ')'; }).join(' · ') + '</span>' : ''; };
    var card = function (it) {
      if (!it.ok) return '<div class="apt-it"><summary><span class="apt-n">' + esc(it.name) + chip('근거 부족') + '</span><span class="apt-i">' + esc(it.interp) + '</span></summary></div>';
      return '<details class="apt-it"><summary><span class="apt-n"><span>' + esc(it.name) + '</span>' + chip(it.levelK, LV[it.level]) + '</span><span class="apt-e">' + esc(it.easy) + ' ' + dots(it.level) + '</span>' +
        (it.area === 'field' ? linkLine(it.links) : '') +
        (it.types ? '<span class="apt-tyl">가장 앞선 결 · <b>' + esc(it.types.topName) + '</b>' + (it.types.mix ? ' (' + esc(it.types.list.filter(function (x) { return x.id === it.types.second; })[0].name) + '도 비슷)' : '') + '</span>' : '') +
        (it.area === 'field' && it.topSubs && it.topSubs.length ? '<span class="apt-ts">이 분야에서 앞선 세부 분야: ' + it.topSubs.map(function (x) { return esc(x.name); }).join(' · ') + '</span>' : '') +
        '<span class="apt-i">' + esc(it.interp) + '</span><span class="apt-more">눌러서 ' + (it.types ? '결 3가지·' : '') + '근거·연결 해석·추천 활동 보기</span></summary><div class="apt-b">' +
        (it.types ? typeBlock(it.types) : '') +
        '<h4>명식 근거</h4>' + basisUl(it.basis) + (it.link ? '<h4>내 명식과의 연결</h4><p>' + esc(it.link) + '</p>' : '') +
        (it.acts.length ? '<h4>떠올려 볼 활동</h4>' + acts(it.acts) : '') + (it.care ? '<h4>함께 알아 둘 점</h4><p>' + esc(it.care) + '</p>' : '') +
        '<p class="small muted">' + esc(it.confK) + (r.hourKnown ? '' : ' · 시주 없이 계산') + '</p></div></details>';
    };
    var typeBlock = function (T) {
      var ord = T.list.filter(function (x) { return x.ok; }).sort(function (a, b) { return a.rank - b.rank; });
      return '<h4>힘을 쓰는 결 3가지</h4><p>' + esc(T.text) + '</p><ul class="apt-ty">' + ord.map(function (x) {
        return '<li class="' + (x.rank === 0 ? 'apt-ty1' : '') + '"><span class="rk">' + (x.rank + 1) + '위</span><b>' + esc(x.name) + '</b> ' + dots(x.level) + ' <span class="small muted">' + esc(x.easy) + '</span>' +
          (x.rank === 0 && !T.mix ? '' : '<br><span class="small">' + esc(x.txt) + '</span>') +
          '<span class="bs">근거: ' + esc(x.basis.map(function (b) { return b.label; }).join(' · ')) + '</span>' +
          (x.rank === 0 ? '<span class="bs">해 볼 만한 활동: ' + esc(x.acts.join(' · ')) + '</span>' : '') + '</li>';
      }).join('') + '</ul><p class="small muted">' + esc(G.MantraAptitudeData.TYPE_NOTE) + '</p>';
    };
    var s = r.summary, sp = r.sport, f = r.final, det = r.details;
    var bySc = function (a) { return a.filter(function (x) { return x.ok; }).slice().sort(function (x, y) { return (y.score - x.score) || (x.id < y.id ? -1 : 1); }); };
    var ts = bySc(r.talents), fs = bySc(r.fields);
    var mode = load(KEY_MODE) === 'work' && o.careerHtml ? 'work' : 'hobby';
    var fsel = load(KEY_FIELD); if (!det[fsel]) fsel = fs[0] ? fs[0].id : 'sport';

    // ── 한눈에 보기(종합 흡수): 활동·취미 3칸 + 직업·일 3칸 ──
    var ov = '';
    try {
      if (G.MantraNatalOverview && G.MantraNatalOverview.injectCss) G.MantraNatalOverview.injectCss();
      var oc = function (t, c) { return '<span class="ov-chip ' + (c || '') + '">' + esc(t) + '</span>'; };
      var blk = function (title, go, big, small, chips, easy) {
        return '<div class="ov-b go" data-apt-go="' + go + '" role="button" tabindex="0"><div class="ov-h"><div class="ov-ht">' + esc(title) + '</div><span class="btn-link">자세히 ›</span></div>' +
          '<div class="ov-big">' + esc(big) + (small ? '<small>' + esc(small) + '</small>' : '') + '</div>' + (chips ? '<div class="ov-chips">' + chips + '</div>' : '') + (easy ? '<p class="ov-easy">' + esc(easy) + '</p>' : '') + '</div>';
      };
      var b1 = ts[0] ? blk('대표 특기 · 힘 쓰는 방식', 'hobby:aptTalent', ts[0].name, ts[0].levelK + (ts[0].types ? ' · ' + ts[0].types.topName + ' 결' : ''), ts.slice(1, 3).map(function (t) { return oc(t.name + ' ' + t.levelK, LV[t.level]); }).join(''), ts[0].interp) : '';
      var b2 = fs[0] ? blk('대표 적성 · 끌리는 분야', 'hobby:aptField', fs[0].name, fs[0].levelK, fs.slice(1, 3).map(function (t) { return oc(t.name + ' ' + t.levelK, LV[t.level]); }).join(''), fs[0].interp) : '';
      var b3 = f.activities.length ? blk('먼저 해 볼 활동', 'hobby:aptFinal', f.activities[0].name, f.activities[0].recK, f.activities.slice(1).map(function (a) { return oc(a.name, REC[a.rec]); }).join(''), f.longTerm ? '오래 다듬어 볼 활동: ' + f.longTerm.name : '') : '';
      var w = '';
      if (o.careerHtml && M.careerProfile) {
        var P = M.careerProfile(ch), top = (P && P.top) || [], ws = P && P.workStyle, keys = M.CAREER_AXIS_KEYS || [];
        if (top.length) w += blk('직업 · 강점 활용 분야', 'work:aptCareer', top[0].name, '조화도 ' + top[0].score, top.slice(1, 3).map(function (c) { return oc(c.name + ' ' + c.score); }).join(''), '');
        if (ws && keys.length && M.careerPole) {
          var poles = keys.map(function (k) { var p = M.careerPole(k, ws[k].value); return { n: p[0], v: p[1] }; }).sort(function (a, b) { return b.v - a.v; });
          w += blk('일하는 방식', 'work:aptCareer', poles[0].n + ' 쪽', M.careerLevelWord ? M.careerLevelWord(poles[0].v) : '', poles.slice(1, 4).map(function (p) { return oc(p.n); }).join(''), '');
        }
        // envs 는 부담이 큰 순서 — 맞는 환경은 요약 문장, 부담 1순위는 주의 칩으로만
        if (P && P.envSummary && P.envSummary.text) w += blk('맞는 업무 환경', 'work:aptCareer', '추천 환경', '', (P.burdenEnvs || []).slice(0, 1).map(function (e) { return oc('부담 · ' + e.name, 'bad'); }).join(''), P.envSummary.text);
      }
      ov = '<section class="card apt" id="aptOverview"><div class="card-h"><h2>한눈에 보기</h2><span class="note">칸을 누르면 자세한 풀이로 이동해요</span></div>' +
        '<div class="ov"><p class="ov-top">' + esc(s.head) + '</p><div class="apt-base">' + s.base.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="ov-grid"><div class="ov-grp">활동·취미</div>' + b1 + b2 + b3 + (w ? '<div class="ov-grp">직업·일</div>' + w : '') + '</div>' +
        '<details class="apt-it"><summary><span class="apt-more">어떻게 봤나요?</span></summary><div class="apt-b"><ul>' + r.notes.concat([r.roleNote]).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></details>' +
        '<p class="ov-note">' + esc(r.disclaimer) + '</p></div></section>';
    } catch (e) { ov = ''; }

    // ── 두 갈래 전환 ──
    var seg = o.careerHtml ? '<div class="apt-seg" role="tablist"><button type="button" role="tab" data-apt-mode="hobby" class="' + (mode === 'hobby' ? 'on' : '') + '" aria-selected="' + (mode === 'hobby') + '">활동·취미<small>특기·적성·분야별 상세·추천</small></button>' +
      '<button type="button" role="tab" data-apt-mode="work" class="' + (mode === 'work' ? 'on' : '') + '" aria-selected="' + (mode === 'work') + '">직업·일<small>업무 방식·강점 분야·환경</small></button></div>' : '';

    // ── 활동·취미 ──
    var h2 = '<section class="card apt" id="aptTalent"><div class="card-h"><h2>특기 5영역</h2><span class="note">이렇게 힘을 써요(방식) · 영역마다 결 3가지</span></div><div class="apt-grid">' + r.talents.map(card).join('') + '</div></section>';
    var h3 = '<section class="card apt" id="aptField"><div class="card-h"><h2>적성 6분야</h2><span class="note">이런 분야에 끌려요(분야)</span></div><div class="apt-grid">' + r.fields.map(card).join('') + '</div></section>';
    var axBlock = function (axes) {
      return '<div class="apt-ax">' + axes.map(function (a) {
        if (!a.ok) return '<p class="small muted">' + esc(a.name) + ' — ' + esc(a.text) + '</p>';
        var left = 50 - a.pos * 50;
        return '<div class="apt-axr"><span class="l' + (a.side === 'L' ? ' on' : '') + '">' + esc(a.L) + '</span><span class="apt-bar" role="img" aria-label="' + esc(a.name + ': ' + a.sideK + (a.side === 'bal' ? '' : ' ' + a.degK)) + '"><i style="left:' + left.toFixed(1) + '%"></i></span><span class="r' + (a.side === 'R' ? ' on' : '') + '">' + esc(a.R) + '</span></div><p class="apt-axt">' + esc(a.text) + '</p>';
      }).join('') + '<p class="small muted">같은 명식 값을 이 분야의 말로 읽은 상대적인 기울기예요. 한쪽이 맞고 다른 쪽이 틀린 것이 아니에요.</p></div>';
    };
    var subCard = function (c) {
      if (!c.ok) return '<div class="apt-it"><summary><span class="apt-n">' + esc(c.name) + chip('근거 부족') + '</span><span class="apt-i">' + esc(c.interp) + '</span></summary></div>';
      return '<details class="apt-it"><summary><span class="apt-n"><span>' + esc(c.name) + '</span>' + chip(c.recK, REC[c.rec]) + '</span><span class="apt-e">' + esc(c.ex.join(' · ')) + '</span>' +
        '<span class="apt-i"><b>탐색해 볼 이유</b> · ' + esc(c.why) + '</span><span class="apt-more">눌러서 활동 특성·명리 성향·고려할 점 보기</span></summary><div class="apt-b">' +
        '<h4>활동 특성</h4><p>' + esc(c.feature) + '</p><h4>관련 명리 성향</h4><p>' + esc(c.myeongri) + '</p>' +
        '<h4>내 명식과의 연결</h4><p>' + esc(c.link) + '</p>' + basisUl(c.basis) +
        '<h4>활동 방식에서 고려할 점</h4>' + c.consider.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
        '<p class="small muted">' + esc(c.confK) + '</p></div></details>';
    };
    var order = r.fields.map(function (x) { return x.id; }).filter(function (id) { return det[id]; });
    var fbtn = '<div class="apt-fsel" role="tablist">' + order.map(function (id) { var fd = r.fields.filter(function (x) { return x.id === id; })[0]; return '<button type="button" role="tab" data-apt-field="' + id + '" class="' + (id === fsel ? 'on' : '') + '" aria-selected="' + (id === fsel) + '">' + esc(fd.name) + (fs[0] && fs[0].id === id ? ' ★' : '') + '</button>'; }).join('') + '</div>';
    var panes = order.map(function (id) {
      var d = det[id];
      var trs = d.traits ? '<div class="apt-sec">운동 성향 6가지</div><div class="apt-tr">' + d.traits.map(function (t) { return '<div><b>' + esc(t.name) + ' ' + (t.ok ? chip(t.levelK, t.bipolar ? '' : LV[t.level]) : chip('근거 부족')) + '</b>' + esc(t.interp) + '</div>'; }).join('') + '</div>' : '';
      return '<div class="apt-pane" data-apt-fpane="' + id + '"' + (id === fsel ? '' : ' hidden') + '><p class="apt-intro">' + esc(d.intro) + '</p>' +
        (d.links.length ? '<div class="apt-acts" style="margin-bottom:6px">' + d.links.map(function (l) { return '<span>이어진 특기 · ' + esc(l.name) + ' ' + esc(l.levelK) + '</span>'; }).join('') + '</div>' : '') + trs +
        '<div class="apt-sec">활동 방식 ' + d.axes.length + '가지 기울기</div>' + axBlock(d.axes) +
        '<div class="apt-sec">세부 분야 ' + d.subs.length + '가지</div><div class="apt-grid">' + d.subs.slice().sort(function (a, b) { return a.rank - b.rank; }).map(subCard).join('') + '</div></div>';
    }).join('');
    var h4 = '<section class="card apt" id="aptDetail"><div class="card-h"><h2>분야별 상세</h2><span class="note">분야를 골라 보세요 · ★ 대표 적성</span></div>' + fbtn + panes + '</section>';
    var h5 = '<section class="card apt" id="aptFinal"><div class="card-h"><h2>추천</h2><span class="note">직접 해 보며 맞는지 확인해 보세요</span></div>' +
      '<div class="apt-sec">탐색해 볼 활동</div><ul class="apt-rec">' + f.activities.map(function (a) { return '<li><b>' + esc(a.name) + '</b> ' + chip(a.recK, REC[a.rec]) + ' <span class="from">' + esc(a.from) + '</span><br><span class="small">' + esc(a.why) + '</span></li>'; }).join('') + '</ul>' +
      (f.typeActs && f.typeActs.length ? '<div class="apt-sec">내 특기 결로 골라 본 활동</div><ul class="apt-rec">' + f.typeActs.map(function (a) { return '<li><b>' + esc(a.acts.join(' · ')) + '</b> <span class="from">' + esc(a.talentName + ' · ' + a.typeName + ' 결(' + a.levelK + ')') + '</span></li>'; }).join('') + '</ul><p class="small muted">' + esc(f.typeNote) + '</p>' : '') +
      (f.longTerm ? '<div class="apt-sec">오래 붙잡고 다듬어 볼 활동</div><div class="apt-box"><b>' + esc(f.longTerm.name) + '</b> <span class="small muted">' + esc(f.longTerm.from) + '</span><br>' + esc(f.longTerm.why) + '</div>' : '') +
      (f.complement ? '<div class="apt-sec">곁들이면 좋은 보완 성향</div><div class="apt-box"><b>' + esc(f.complement.name) + '</b> <span class="small muted">' + esc(f.complement.levelK) + '</span><br>' + esc(f.complement.text) + (f.yongNote ? '<br><span class="small muted">' + esc(f.yongNote) + '</span>' : '') + '</div>' : '') +
      '<p class="small muted" style="margin-top:6px">추천 수준: <b>적극 탐색 추천</b>(먼저 체험해 볼 만함) · <b>관심 가져볼 활동</b>(기회가 되면 시도) · <b>취향에 따라 선택</b>(주된 방향은 아니지만 고를 수 있음)</p>' +
      '<p class="note">' + esc(r.disclaimer) + '</p></section>';
    var hobby = '<div data-apt-pane="hobby"' + (mode === 'hobby' ? '' : ' hidden') + '>' + h2 + h3 + h4 + h5 + '</div>';
    var work = o.careerHtml ? '<div data-apt-pane="work" id="aptCareer" class="apt"' + (mode === 'work' ? '' : ' hidden') + '>' + o.careerHtml + '</div>' : '';
    return ov + seg + hobby + work;
  }

  // ── 화면 안 전환(다시 그리지 않음) ──
  function setMode(m) {
    save(KEY_MODE, m);
    document.querySelectorAll('[data-apt-mode]').forEach(function (b) { var on = b.getAttribute('data-apt-mode') === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    document.querySelectorAll('[data-apt-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-apt-pane') !== m; });
  }
  function setField(id) {
    save(KEY_FIELD, id);
    document.querySelectorAll('[data-apt-field]').forEach(function (b) { var on = b.getAttribute('data-apt-field') === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    document.querySelectorAll('[data-apt-fpane]').forEach(function (p) { p.hidden = p.getAttribute('data-apt-fpane') !== id; });
  }
  function go(target) {   // 'hobby:aptTalent' 처럼 갈래:구역
    var p = String(target).split(':'), m = p[0], id = p[1];
    if (document.querySelector('[data-apt-pane="' + m + '"]')) setMode(m);
    var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest; if (!t) return;
      var m = ev.target.closest('[data-apt-mode]'); if (m) { setMode(m.getAttribute('data-apt-mode')); return; }
      var fb = ev.target.closest('[data-apt-field]'); if (fb) { setField(fb.getAttribute('data-apt-field')); return; }
      var g = ev.target.closest('[data-apt-go]'); if (g) go(g.getAttribute('data-apt-go'));
    });
    document.addEventListener('keydown', function (ev) { if (ev.key !== 'Enter' && ev.key !== ' ') return; var g = ev.target && ev.target.closest && ev.target.closest('[data-apt-go]'); if (g) { ev.preventDefault(); go(g.getAttribute('data-apt-go')); } });
  }
  var API = { html: html };
  G.MantraAptitudeView = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
