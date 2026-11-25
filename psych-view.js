/* 심리 솔루션 — 화면 그리기 전용(만세력 '심리 솔루션' 탭). 계산은 psych.js, 문안은 psych-data.js. 2026-11-25
   · 순서: 한눈에 보기 → ① 마음의 상처 결(잠재적 트라우마) → ② 시기별 스트레스·심리 상태(대운 / 세운 3년 / 올해 월운) → ③ 심리 솔루션 → 도움 받을 곳
   · 사용: MantraPsychView.html(Manse, ch, { esc, term, now }) */
(function (G) {
  'use strict';
  var LVC = { hi: 'bad', mid: 'mid', lo: 'good' };
  var CSS = '.psy{scroll-margin-top:110px}.psy-intro{font-size:.9rem;color:var(--ink-2);line-height:1.65;margin:0 0 8px}' +
    '.psy-ov{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media(max-width:900px){.psy-ov{grid-template-columns:1fr 1fr}}@media(max-width:560px){.psy-ov{grid-template-columns:1fr}}' +
    '.psy-ov>a{display:block;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);color:inherit;text-decoration:none}.psy-ov small{display:block;font-size:.72rem;color:var(--ink-3);font-weight:700}.psy-ov b{display:block;font-size:.98rem;margin:3px 0}.psy-ov span{font-size:.8rem;color:var(--ink-2)}' +
    '.psy-pt{border:1px solid var(--line);border-radius:14px;background:var(--surface);margin:10px 0;padding:0}.psy-pt>summary{list-style:none;cursor:pointer;padding:13px 14px}.psy-pt>summary::-webkit-details-marker{display:none}' +
    '.psy-pt h3{margin:0 0 4px;font-size:1rem;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.psy-hook{margin:0;color:var(--bad);font-weight:700;font-size:.9rem;line-height:1.55}.psy-more{font-size:.72rem;color:var(--ink-3)}.psy-pt[open] .psy-more{display:none}' +
    '.psy-b{padding:0 14px 13px;font-size:.86rem;line-height:1.65}.psy-b h4{font-size:.78rem;margin:11px 0 4px;color:var(--ink-2)}.psy-b ul{margin:0;padding-left:1.1em}.psy-b p{margin:3px 0}' +
    '.psy-k{display:inline-block;font-size:.68rem;padding:0 6px;border-radius:6px;background:var(--surface-2);color:var(--ink-2);margin-right:4px}' +
    '.psy-seg{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.psy-seg button{border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:.84rem;background:var(--surface);color:var(--ink-2);cursor:pointer}.psy-seg button.on{border-color:var(--accent);color:var(--ink);font-weight:700}' +
    '.psy-pane[hidden]{display:none}.psy-row{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:7px 0;background:var(--surface)}.psy-row.psy-now{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}' +
    '.psy-rh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:700}.psy-rh .gz{font-weight:600;color:var(--ink-3);font-size:.82rem}.psy-row p{margin:4px 0;font-size:.85rem;line-height:1.6}.psy-row .lbl{font-size:.74rem;color:var(--ink-3);font-weight:700;margin-right:4px}' +
    '.psy-mo{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}@media(max-width:700px){.psy-mo{grid-template-columns:repeat(3,1fr)}}.psy-mo>div{border:1px solid var(--line);border-radius:10px;padding:7px 8px;font-size:.78rem;line-height:1.45;background:var(--surface)}.psy-mo>div.psy-now{border-color:var(--accent)}.psy-mo b{display:block;font-size:.8rem}' +
    '.psy-tl{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.psy-tool{border:1px solid var(--line);border-radius:12px;padding:11px 13px;background:var(--surface);font-size:.86rem;line-height:1.6}.psy-tool b{font-size:.95rem}.psy-tool ol{margin:6px 0 4px;padding-left:1.2em}.psy-why{font-size:.74rem;color:var(--ink-3)}' +
    '.psy-el{border-radius:12px;padding:11px 13px;background:var(--surface-2);font-size:.87rem;line-height:1.65}.psy-acts{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.psy-acts span{font-size:.78rem;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}' +
    '.psy-safe{border:1px solid var(--bad);border-radius:12px;padding:11px 13px;font-size:.86rem;line-height:1.6}.psy-safe ul{list-style:none;margin:6px 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px}.psy-safe a{font-weight:800;color:var(--bad)}';
  var injected = false;
  function inject() { if (injected || typeof document === 'undefined') return; injected = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  var KEY = 'mt_psy_span';
  var load = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var save = function (v) { try { localStorage.setItem(KEY, v); } catch (e) { } };

  function html(M, ch, o) {
    inject();
    var esc = o.esc, term = o.term || function (t, l) { return esc(l || t); };
    var P = G.MantraPsych, D = G.MantraPsychData, r;
    try { r = P.build(M, ch, { now: o.now }); } catch (e) { r = { ok: false, reason: '계산 중 문제가 생겼어요' }; }
    if (!r || !r.ok) return '<section class="card"><div class="card-h"><h2>심리 솔루션</h2></div><p class="note">' + esc((r && r.reason) || '결과를 만들 수 없어요') + '</p></section>';
    var chip = function (t, c) { return '<span class="wc-chip ' + (c || '') + '">' + esc(t) + '</span>'; };
    var TL = D.TOOLS, tname = function (id) { return TL[id] ? TL[id].name : ''; };
    var s = r.summary;

    // ── 한눈에 보기 ──
    var ov = '<section class="card psy" id="psyTop"><div class="card-h"><h2>한눈에 보기</h2><span class="note">칸을 누르면 그 풀이로 이동해요</span></div>' +
      '<p class="psy-intro">' + esc(r.intro) + '</p><div class="psy-ov">' +
      '<a href="#psyPat" data-psy-go="psyPat"><small>가장 깊은 마음의 결</small><b>' + esc(s.pattern || '두드러진 결 없음') + '</b><span>' + esc(r.patterns[0] ? r.patterns[0].heal : r.noPattern) + '</span></a>' +
      '<a href="#psyTime" data-psy-go="psyTime"><small>지금 대운' + (s.now ? ' · ' + s.now.age + '세~' : '') + '</small><b>' + (s.now ? esc(s.now.levelK) + (s.now.mood ? ' · ' + esc(s.now.mood) : '') : '—') + '</b><span>' + esc(s.heavyDaeun.length ? '마음이 무거운 대운: ' + s.heavyDaeun.join(', ') : '크게 무거운 대운은 보이지 않아요') + '</span></a>' +
      '<a href="#psyTime" data-psy-go="psyTime" data-psy-span="seun"><small>' + esc(String(r.year)) + '년</small><b>' + (s.year ? esc(s.year.levelK) : '—') + '</b><span>' + esc(s.nextHiYear ? s.nextHiYear + '년에 긴장이 높아져요' : '앞으로 3년 중 크게 긴장되는 해는 없어요') + '</span></a>' +
      '<a href="#psySol" data-psy-go="psySol"><small>먼저 해 볼 솔루션</small><b>' + esc(s.tool || '—') + '</b><span>' + esc(s.elem ? '명리 보완 기운: ' + s.elem : '') + '</span></a>' +
      '</div><p class="ov-note">' + esc(r.disclaimer) + (r.hourKnown ? '' : ' ' + esc(D.NO_HOUR)) + '</p></section>';

    // ── ① 마음의 상처 결 ──
    var pat = r.patterns.map(function (p, i) {
      return '<details class="psy-pt"' + (i === 0 ? ' open' : '') + '><summary><h3>' + esc(p.name) + chip(i === 0 ? '가장 깊은 결' : '함께 보이는 결', i === 0 ? 'bad' : '') + '</h3><p class="psy-hook">' + esc(p.hook) + '</p><span class="psy-more">눌러서 장면·명리 근거·회복 방향 보기</span></summary><div class="psy-b">' +
        '<h4>이런 장면이 익숙할 수 있어요</h4><ul>' + p.scenes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '<h4>명리로 보면</h4><p>' + esc(p.myeongri) + '</p>' +
        '<h4>명식 근거</h4><ul>' + p.basis.map(function (b) { return '<li><span class="psy-k">' + esc(b.kind) + '</span>' + esc(b.label) + '</li>'; }).join('') + '</ul>' +
        '<h4>마음이 스스로를 지키는 방식</h4><p>' + esc(p.guard) + '</p>' +
        '<h4>회복 방향</h4><p>' + esc(p.heal) + ' <span class="psy-why">추천 연습: ' + p.tools.map(function (id) { return esc(tname(id)); }).join(' · ') + '</span></p>' +
        '</div></details>';
    }).join('');
    var patSec = '<section class="card psy" id="psyPat"><div class="card-h"><h2>마음의 상처 결 <small class="muted">명리로 읽는 잠재적 트라우마</small></h2></div>' +
      (pat || '<p class="note">' + esc(r.noPattern) + '</p>') + '</section>';

    // ── ② 시기별 스트레스·심리 상태 ──
    var row = function (p, head) {
      return '<div class="psy-row' + (p.now ? ' psy-now' : '') + '"><div class="psy-rh">' + head + chip(p.levelK, LVC[p.level]) + (p.now ? chip('지금', 'mid') : '') + '</div>' +
        (p.stress.length ? '<p><span class="lbl">스트레스</span>' + esc(p.stress.slice(0, 3).join(' · ')) + '</p>' : '') +
        '<p><span class="lbl">마음 상태</span>' + esc(p.state) + (p.mood ? ' — <b>' + esc(p.mood.k) + '</b>: ' + esc(p.mood.t) : '') + '</p>' +
        (p.react.length ? '<p><span class="lbl">다시 건드려지는 결</span>' + esc(D.REACTIVATE.replace('{name}', p.react.map(function (x) { return x.name; }).join('", "'))) + '</p>' : '') +
        '<p><span class="lbl">이때 솔루션</span>' + esc(p.tools.map(tname).join(' · ')) + (p.level === 'hi' ? ' — ' + esc(p.levelNote) : '') + '</p></div>';
    };
    var span = load() === 'seun' ? 'seun' : load() === 'month' ? 'month' : 'daeun';
    var dPane = r.daeun.map(function (p) { return row(p, esc(p.startAge + '세~') + ' <span class="gz">' + esc(p.gz) + ' 대운 · ' + esc(p.stemTG + '/' + p.branchTG) + '</span>'); }).join('');
    var sPane = r.seun.map(function (p) { return row(p, esc(p.year + '년') + ' <span class="gz">' + esc(p.gz) + ' · ' + esc(p.stemTG + '/' + p.branchTG) + '</span>'); }).join('');
    var mPane = r.months.length ? '<div class="psy-mo">' + r.months.map(function (p) {
      var d = new Date(p.startMs + 9 * 3600000);
      return '<div class="' + (p.now ? 'psy-now' : '') + '"><b>' + (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '~ ' + esc(p.gz) + '</b>' + chip(p.levelK, LVC[p.level]) + '<br>' + esc(p.mood ? p.mood.k : '') + (p.react.length ? ' · 옛 결 자극' : '') + '</div>';
    }).join('') + '</div><p class="small muted">월운은 절기(입춘~) 기준이에요. 칸의 날짜는 그 달이 시작되는 절입일이에요.</p>' : '<p class="note">월운을 계산하지 못했어요.</p>';
    var timeSec = '<section class="card psy" id="psyTime"><div class="card-h"><h2>시기별 스트레스 · 마음 상태</h2></div>' +
      '<p class="psy-intro">운의 십성(어떤 일이 몰려오는지)과 ' + term('12운성', '12운성') + '(그때 마음의 온도), 운이 원국 자리를 건드리는지를 함께 봤어요. 긴장 높음은 나쁜 일이 생긴다는 뜻이 아니라, 마음이 쉽게 지치니 미리 챙기라는 신호예요.</p>' +
      '<div class="psy-seg" role="tablist">' + [['daeun', '대운 10년'], ['seun', r.year + '~' + (r.year + 2) + '년'], ['month', r.year + '년 월별']].map(function (a) { return '<button type="button" role="tab" data-psy-span="' + a[0] + '" class="' + (span === a[0] ? 'on' : '') + '">' + esc(a[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="psy-pane" data-psy-pane="daeun"' + (span === 'daeun' ? '' : ' hidden') + '>' + dPane + '</div>' +
      '<div class="psy-pane" data-psy-pane="seun"' + (span === 'seun' ? '' : ' hidden') + '>' + sPane + '</div>' +
      '<div class="psy-pane" data-psy-pane="month"' + (span === 'month' ? '' : ' hidden') + '>' + mPane + '</div></section>';

    // ── ③ 심리 솔루션 ──
    var tools = r.tools.map(function (t) {
      return '<div class="psy-tool"><b>' + esc(t.name) + '</b> <span class="psy-k">' + esc(t.from) + '</span><ol>' + t.how.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol><span class="psy-why">이 연습을 고른 이유: ' + esc(t.why.join(' · ')) + '</span></div>';
    }).join('');
    var el = r.elem ? '<h3 class="apt-sec">명리 솔루션 — ' + esc(r.elem.name) + ' 기운 곁들이기</h3><div class="psy-el"><p style="margin:0">' + esc(r.elem.mind) + '</p><div class="psy-acts">' + r.elem.acts.map(function (a) { return '<span>' + esc(a) + '</span>'; }).join('') + '</div><p style="margin:0">공간: ' + esc(r.elem.space) + '</p><p class="small muted" style="margin:4px 0 0">' + esc(r.elem.basis) + ' · ' + esc(r.elem.note) + '</p></div>' : '';
    var solSec = '<section class="card psy" id="psySol"><div class="card-h"><h2>심리 솔루션</h2></div>' +
      '<h3 class="apt-sec">현대 심리학 — 오늘부터 해 볼 연습</h3><div class="psy-tl">' + tools + '</div>' + el +
      '<p class="small muted">연습들은 일상에서 해 볼 수 있는 자기 돌봄 방법이에요. 상담이나 치료를 대신하지 않아요.</p></section>';

    // ── 도움 받을 곳 ──
    var sf = r.safety;
    var safeSec = '<section class="card psy"><div class="psy-safe"><b>' + esc(sf.head) + '</b><p style="margin:4px 0">' + esc(sf.body) + '</p><ul>' +
      sf.lines.map(function (l) { return '<li>' + esc(l.name) + ' <a href="tel:' + esc(l.tel) + '">' + esc(l.tel) + '</a></li>'; }).join('') + '</ul><p class="small muted" style="margin:0">' + esc(sf.tail) + '</p></div></section>';

    return ov + patSec + timeSec + solSec + safeSec;
  }

  // 화면 안 전환(다시 그리지 않음): 시기 단위 · 한눈에 보기 이동. 문서에 한 번만 건다(특기·적성 탭과 같은 방식)
  if (typeof document !== 'undefined' && !G.__psyBound) {
    G.__psyBound = true;
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-psy-span],[data-psy-go]'); if (!t) return;
      var sp = t.getAttribute('data-psy-span');
      if (sp) {
        save(sp);
        document.querySelectorAll('[data-psy-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-psy-pane') !== sp; });
        document.querySelectorAll('.psy-seg [data-psy-span]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-psy-span') === sp); });
      }
      var go = t.getAttribute('data-psy-go');
      if (go) { e.preventDefault(); var el = document.getElementById(go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  G.MantraPsychView = { html: html };
})(typeof window !== 'undefined' ? window : globalThis);
