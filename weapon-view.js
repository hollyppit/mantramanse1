/* 나의 주무기 — 화면 그리기 전용. 판정은 weapon.js(MantraWeapon), 문안은 weapon-data.js(MantraWeaponData). 2026-11-26
   · 네 곳이 같은 판정 결과 하나(MantraWeapon.analyze — 명식마다 한 번 계산해 캐시)를 읽는다. 각 블록 맨 바깥에 data-wp="상태:오행" 표시를 달아
     tests/weapon-sim.cjs 가 네 블록이 같은 결과를 보여 주는지 확인한다.
       원국 탭      wonguk()  — 나의 타고난 주무기(형성 근거만, 운·미래 해석 없음)
       오행·강약 탭 ohaeng()  — 주무기 오행 분석(오행 5개 조건표 · 십성 작용 · 과잉 주의 · 선정 기록) + 강약·주무기·용신 구분
       특기·적성 탭 apt()     — 맨 위 '나의 주무기'와 기존 적성 결과(MantraAptitude.build) 연결·차이 설명
       운세 흐름 탭 luck()    — 기존 그래프 아래 '주무기 발현 타이밍'(활성도 실선 그래프 + 유리도 보조 띠 + 선택형 카드)
   · 사용: MantraWeaponView.wonguk(M, ch, { esc, term, link }) 등. 스위치는 index.html 이 MANTRA_FLAGS.weapon 으로 본다. */
(function (G) {
  'use strict';
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  var POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var esc0 = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var W = function () { return G.MantraWeapon; }, D = function () { return G.MantraWeaponData; };
  var EC = ['var(--wood,#2FA866)', 'var(--fire,#E5533D)', 'var(--earth,#C99A3B)', 'var(--metal,#8E9AAF)', 'var(--water,#3B6FD8)'];
  var CSS = '.wp{display:grid;gap:10px}.wp p{margin:0;line-height:1.65}.wp-head{font-weight:800;font-size:1rem;line-height:1.55}' +
    '.wp-e0{--wc:var(--wood,#2FA866);--wi:var(--wood-ink,#17744B)}.wp-e1{--wc:var(--fire,#E5533D);--wi:var(--fire-ink,#B1321F)}.wp-e2{--wc:var(--earth,#C99A3B);--wi:var(--earth-ink,#8A6418)}.wp-e3{--wc:var(--metal,#8E9AAF);--wi:var(--metal-ink,#56627A)}.wp-e4{--wc:var(--water,#3B6FD8);--wi:var(--water-ink,#234A9A)}' +
    '.wp-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}' +
    '.wp-it{border:1px solid var(--line);border-left:4px solid var(--wc);border-radius:12px;padding:11px 13px;background:var(--surface);display:grid;gap:6px}' +
    '.wp-n{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:800}.wp-hj{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--wi);color:#fff;font-weight:800}' +
    '.wp-rk{font-size:.72rem;font-weight:700;color:var(--wi)}.wp-tag{font-size:.7rem;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}.wp-tag.cl{background:color-mix(in srgb,var(--wc) 18%,var(--surface));color:var(--wi)}' +
    '.wp-kw{display:flex;flex-wrap:wrap;gap:4px}.wp-kw span{font-size:.76rem;padding:1px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--wc) 45%,var(--line));color:var(--wi)}' +
    '.wp-s{font-size:.86rem;color:var(--ink-2)}.wp-ev{margin:0;padding-left:1.1em;font-size:.8rem;color:var(--ink-2);line-height:1.6}.wp-note{font-size:.8rem;color:var(--ink-3)}.wp-lb{font-size:.74rem;font-weight:700;color:var(--ink-3);margin-right:4px}' +
    '.wp-box{border:1px dashed var(--line);border-radius:10px;padding:9px 12px;font-size:.84rem;line-height:1.6;background:var(--surface-2)}.wp-box b{color:var(--ink)}' +
    '.wp-tb{width:100%;border-collapse:collapse;font-size:.8rem}.wp-tb th,.wp-tb td{border-bottom:1px solid var(--line);padding:6px 4px;text-align:center;white-space:nowrap}.wp-tb th:first-child,.wp-tb td:first-child{text-align:left}.wp-tb tr.on td{font-weight:700;background:color-mix(in srgb,var(--wc) 10%,transparent)}.wp-tb tr.on td:first-child{box-shadow:inset 3px 0 0 var(--wc)}.wp-y{color:var(--good,#2DB36B)}.wp-x{color:var(--ink-3)}.wp-w{color:var(--bad,#E8622C)}' +
    '.wp-tri{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.wp-tri>div{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:.82rem;line-height:1.55}.wp-tri b{display:block;margin-bottom:3px;font-size:.86rem}.wp-tri .v{font-weight:800;color:var(--ink)}' +
    '.wp-ch{overflow-x:auto}.wp-ch svg{display:block;width:100%}.wp-ch text{font-size:10px;fill:var(--ink-3)}.wp-ch .lv{font-size:9px}' +
    '.wp-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(70px,1fr);gap:6px;overflow-x:auto;padding-bottom:4px}' +
    '.wp-c{border:1px solid var(--line);border-radius:10px;padding:6px 6px 7px;font-size:.72rem;text-align:center;display:grid;gap:4px;background:var(--surface);cursor:pointer;font:inherit;font-size:.72rem;color:inherit}.wp-c.wp-now{outline:2px solid var(--accent);outline-offset:-1px}.wp-c.sel{background:color-mix(in srgb,var(--wc) 12%,var(--surface))}.wp-c .t{color:var(--ink-3)}.wp-c .g{font-weight:800;font-size:.86rem}' +
    '.wp-a{border-radius:6px;padding:1px 4px;font-weight:700}.wp-a.on2{background:var(--wi);color:#fff}.wp-a.on1{background:color-mix(in srgb,var(--wc) 30%,var(--surface));color:var(--wi)}.wp-a.shk{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--wc) 30%,var(--surface)) 0 4px,var(--surface-2) 4px 8px);color:var(--wi)}.wp-a.sup{border:1px solid var(--wc);color:var(--wi)}.wp-a.qt{color:var(--ink-3)}.wp-a.hit{background:var(--surface-2);color:var(--ink-2);text-decoration:line-through}.wp-a.trm{background:var(--surface-2);color:var(--ink-2);border:1px dashed var(--line)}' +
    '.wp-f{border-radius:6px;padding:1px 4px;font-size:.68rem;border:1px solid var(--line);color:var(--ink-2)}.wp-f.good{border-color:#2DB36B;color:#1d7a47}.wp-f.care{border-color:#E8622C;color:#b2461a}' +
    '.wp-leg{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:.72rem;color:var(--ink-3);align-items:center}.wp-sec{font-size:.86rem;font-weight:700;margin:8px 0 2px;color:var(--ink-2)}' +
    '.wp-det{display:none;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:.84rem;line-height:1.6;background:var(--surface)}.wp-det.on{display:block}.wp-det h4{margin:0 0 4px;font-size:.9rem}.wp-det ul{margin:4px 0 0;padding-left:1.1em}' +
    '.wp-dl{margin:0;padding:0;list-style:none;display:grid;gap:6px}.wp-dl li{border:1px solid var(--line);border-radius:10px;padding:8px 11px;font-size:.84rem;line-height:1.55}.wp-dl .when{font-weight:700}';
  var bound = false;
  function onClick(ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('.wp-c[data-wpd]') : null; if (!t) return;
    var sec = t.closest('.wp'); if (!sec) return;
    var id = t.getAttribute('data-wpd'), row = t.getAttribute('data-wpr'), was = t.classList.contains('sel');
    sec.querySelectorAll('.wp-det[data-wpr="' + row + '"]').forEach(function (d) { d.classList.remove('on'); });
    sec.querySelectorAll('.wp-c[data-wpr="' + row + '"]').forEach(function (c) { c.classList.remove('sel'); });
    if (!was) { var d = sec.querySelector('#' + id); if (d) d.classList.add('on'); t.classList.add('sel'); }
  }
  function injectCss(doc) {
    try { doc = doc || G.document; if (!doc) return; if (!doc.getElementById('wp-css')) { var s = doc.createElement('style'); s.id = 'wp-css'; s.textContent = CSS; doc.head.appendChild(s); } if (!bound) { doc.addEventListener('click', onClick); bound = true; } } catch (e) { }
  }
  function sigOf(A) { return A.status + ':' + A.candidates.join(','); }
  function opts(o) { o = o || {}; return { E: o.esc || esc0, T: o.term || function (k, l) { return (o.esc || esc0)(l || k); }, L: o.link || function () { return ''; } }; }
  function get(M, ch) { var w = W(); if (!w || !D()) return null; var A; try { A = w.analyze(M, ch); } catch (e) { return null; } return A && A.ok ? A : null; }
  function list(A) { return A.weapons.length ? A.weapons : A.complex; }
  function title(w) { return EL_K[w.el] + '(' + EL_H[w.el] + ') — ' + D().el[w.el].title; }
  function rankLabel(A, w, i) { var d = D(); return A.status === 'complex' ? '복합형 후보' : A.status === 'undetermined' ? '유력 후보' : d.rank[i] || d.rank[1]; }
  function headOf(A) { return D().status[A.status] || ''; }

  // 무기 한 개 카드 — part: 'origin'(원국: 형성 근거) | 'apt'(적성: 활용 방향)
  function item(A, w, i, o, part) {
    var d = D(), E = o.E, dl = d.el[w.el], gl = d.group[w.group];
    var tags = '<span class="wp-tag cl">' + E(w.groupName) + ' · 세력 ' + w.pct + '%</span>' + (w.confidence ? '<span class="wp-tag" title="' + E(d.confidenceNote) + '">' + E(d.confidence[w.confidence]) + '</span>' : '') + (w.shaky ? '<span class="wp-tag">다듬어 쓰는 무기</span>' : '');
    var h = '<div class="wp-it wp-e' + w.el + '"><span class="wp-rk">' + E(rankLabel(A, w, i)) + '</span><div class="wp-n"><span class="wp-hj">' + EL_H[w.el] + '</span>' + E(title(w)) + '</div><div class="wp-n" style="font-weight:600">' + tags + '</div>' +
      '<div class="wp-kw">' + dl.strengths.map(function (k) { return '<span>' + E(k) + '</span>'; }).join('') + '</div>' +
      '<p><span class="wp-lb">발현 방식</span>' + E(EL_K[w.el] + ' + ' + w.groupName + ': ' + d.elGroup[w.el][w.group]) + '</p>' +
      (w.tgs.length ? '<p class="wp-s"><span class="wp-lb">드러난 십성</span>' + E(w.tgs.map(function (t) { return t + ' — ' + d.tg[t]; }).join(' · ')) + '</p>' : '');
    if (part === 'apt') h += '<p class="wp-s"><span class="wp-lb">활용 방향</span>' + E(gl.scene) + '</p><p class="wp-note"><span class="wp-lb">과잉 시</span>' + E(dl.overLine + ' ' + gl.over) + '</p>';
    if (part === 'origin') h += '<p class="wp-note"><span class="wp-lb">과잉 시</span>' + E(dl.over) + '</p>' + (w.shaky ? '<p class="wp-note">' + E(d.shaky) + '</p>' : '');
    h += '<details' + (part === 'origin' && i === 0 ? ' open' : '') + '><summary class="wp-note">형성 근거 (병존·간여지동·통근·투간)</summary><ul class="wp-ev">' + w.reasons.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') + '</ul></details></div>';
    return h;
  }
  function extraNotes(ch, A, o, part) {
    var d = D(), E = o.E, out = [];
    if (A.provisional) { var hk = A.hourKeep; out.push(A.weapons.length && hk ? (hk.keep >= hk.of ? d.statusNote.provisional : d.statusNote.provisionalSome.replace('{k}', hk.keep)) : d.statusNote.provisionalNone); }   // 시간 모름: 세 기둥 잠정 판정 + 12시진 유지 수
    if (d.statusNote[A.status]) out.push(d.statusNote[A.status]);
    if (A.status === 'undetermined' && A.hourCheck) out.push('시진 12개를 넣어 보면 첫 후보가 주무기로 남는 경우가 ' + (A.hourCheck.keepFirst == null ? 0 : A.hourCheck.keepFirst) + '/' + A.hourCheck.variants + '이에요.');
    if (A.strongest && !A.strongest.isWeapon && A.weapons.length) out.push(d.strongestRel.replace('{top}', EL_K[A.strongest.el] + '(' + A.strongest.pct + '%)').replace('{why}', d.strongestWhy[A.strongest.why] || ''));
    if (A.near && A.near.length) out.push('그 뒤로 ' + A.near.map(function (e) { return EL_K[e]; }).join('·') + ' 기운도 같은 조건으로 서 있어요. 세력 %만으로 순서를 가르지 않아 보조 주무기는 두지 않았어요.');
    if (part !== 'apt' && A.dayPillar && A.dayPillar.ganyeo) out.push(d.dayGanyeo.replace('{gz}', A.dayPillar.gz).replace('{zone}', A.strength.zone));
    if (A.jong) out.push(d.jong);
    return out.map(function (t) { return '<p class="wp-note">' + E(t) + '</p>'; }).join('');
  }
  function yongLine(A) {
    var d = D(); if (!A.yong || !A.weapons.length) return '';
    return A.yong.isWeapon ? d.yongRel.same : /기신|구신/.test(A.weapons[0].role || '') ? d.yongRel.gisin : d.yongRel.other;
  }
  function noneBody(A, E) {
    var d = D(), hp = A.hiddenPow.map(function (e) { return EL_K[e]; }), th = A.thinEdge.map(function (e) { return EL_K[e]; });
    return (hp.length ? '<div class="wp-box"><b>숨은 힘: ' + E(hp.join('·')) + '</b><br>' + E(d.hidden) + '</div>' : '') + (th.length ? '<div class="wp-box"><b>가벼운 칼: ' + E(th.join('·')) + '</b><br>' + E(d.thin) + '</div>' : '');
  }

  // ── 원국 탭: 나의 타고난 주무기(형성 근거만) ──
  function wonguk(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, L = list(A);
    var body = L.length ? '<div class="wp-list">' + L.map(function (w, i) { return item(A, w, i, o, 'origin'); }).join('') + '</div>' : noneBody(A, E);
    var yl = yongLine(A);
    return '<section class="card wp" id="weapon-wonguk" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>나의 타고난 주무기</h2><span class="note">드러나 있고 · 뿌리 있고 · 세력이 실린 힘</span></div>' +
      '<p class="wp-head">' + E(headOf(A)) + '</p>' + body + extraNotes(ch, A, o, 'origin') + (yl ? '<p class="wp-note">' + E(yl) + '</p>' : '') +
      '<p class="wp-note">' + o.L('ohaeng', '오행·강약에서 판정표 보기 ›') + ' ' + o.L('apt', '특기·적성에서 활용 방향 보기 ›') + '</p></section>';
  }

  // ── 오행·강약 탭: 주무기 오행 분석 ──
  function ohaeng(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, T = o.T, d = D();
    var cand = A.candidates, mk = function (v, warn) { return v ? '<span class="wp-y">○</span>' : warn ? '<span class="wp-w">△</span>' : '<span class="wp-x">·</span>'; };
    var lab = function (f) { var i = cand.indexOf(f.el); if (i < 0) return f.cond.core ? '후보' : ''; return A.status === 'complex' ? '복합' : A.status === 'undetermined' ? '유력 후보' : d.rank[i]; };
    var rows = A.facts.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (f) {
      var c = f.cond, on = cand.indexOf(f.el) >= 0, bj = f.byeongjon.stem.length + f.byeongjon.branch.length;
      return '<tr class="wp-e' + f.el + (on ? ' on' : '') + '"><td>' + EL_H[f.el] + ' ' + EL_K[f.el] + ' <span class="wp-note">' + E(f.groupName) + '</span></td><td>' + f.pct + '%</td><td>' + f.surface.stem + '·' + f.surface.branch + '</td><td>' + mk(c.force) + '</td><td>' + mk(c.exposed) + '</td><td>' + mk(c.rooted) + '</td><td>' + mk(c.exposed && c.intact, c.exposed && !c.intact) + '</td><td>' + mk(c.season) + '</td><td>' + (bj ? '<span class="wp-y">' + bj + '</span>' : mk(false)) + '</td><td>' + mk(f.ganyeo.length) + '</td><td>' + mk(c.deepRoot) + '</td><td><b>' + E(lab(f)) + '</b></td></tr>';
    }).join('');
    var u = ch.unified || {}, wk = A.weapons.length ? A.weapons.map(function (w) { return EL_K[w.el]; }).join(' · ') : A.complex.length ? '복합형' : A.status === 'undetermined' ? '미확정' : '없음';
    var tri = '<div class="wp-tri"><div><b>오행 강약</b><span class="v">가장 큰 세력 ' + E(EL_K[A.strongest.el]) + ' ' + A.strongest.pct + '% · ' + E(A.strength.zone) + '</span><br>' + E(d.distinguish.strength) + '</div>' +
      '<div class="wp-e' + (A.weapons[0] ? A.weapons[0].el : 0) + '"><b>주무기</b><span class="v">' + E(wk) + '</span><br>' + E(d.distinguish.weapon) + '</div>' +
      '<div><b>용신</b><span class="v">' + E(u.yong != null ? EL_K[u.yong] + (u.primaryName ? ' (' + u.primaryName + ' 기준)' : '') : '—') + '</span><br>' + E(d.distinguish.yong) + '</div></div>';
    var sum = list(A).map(function (w, i) { var dl = d.el[w.el], gl = d.group[w.group]; return '<li class="wp-e' + w.el + '"><b>' + E(rankLabel(A, w, i) + ' ' + title(w)) + '</b> — 십성 작용: ' + E(w.groupName + '(' + gl.way + ')') + (w.tgs.length ? ', 드러난 ' + E(w.tgs.join('·')) : '') + '<br><span class="wp-note">과잉 시: ' + E(dl.overLine) + '</span></li>'; }).join('');
    var yl = yongLine(A);
    return '<section class="card wp" id="weapon-ohaeng" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>주무기 오행 분석</h2><span class="note">강약 · 주무기 · 용신은 서로 다른 질문이에요</span></div>' + tri +
      '<p class="wp-note">' + E(d.distinguish.notTop) + '</p>' + (yl ? '<p class="wp-note">' + E(yl) + '</p>' : '') +
      (sum ? '<ul class="wp-dl">' + sum + '</ul>' : noneBody(A, E)) +
      '<div style="overflow-x:auto"><table class="wp-tb"><thead><tr><th>오행</th><th>세력</th><th title="지장간 빼고 천간·지지 겉글자만 센 개수">겉글자 간·지</th><th title="평균 몫 20% 이상">세력≥20%</th><th>' + T('투간', '투간') + '</th><th>' + T('통근', '통근') + '</th><th title="드러난 천간이 합·충으로 묶이지 않고 뿌리 자리가 충을 맞지 않음">온전함</th><th title="월령에서 왕·상">' + T('득령', '득령') + '</th><th>' + T('병존', '병존') + '</th><th>' + T('간여지동', '간여지동') + '</th><th title="정기 또는 월지 뿌리">깊은 뿌리</th><th>판정</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="wp-note">' + E(d.distinguish.numbers) + ' 판정 순서: ① 세력 20% 이상 · 천간에 드러남 · 지지에 뿌리 — 셋 다 맞아야 후보 ② 합·충으로 묶이지 않은 후보 먼저 ③ 득령·병존/간여지동·깊은 뿌리·세력 1위를 같은 무게로 센 개수 ④ 같으면 세력 %(단, 2·3순위가 같은 개수면 보조 주무기를 두지 않아요). 가중치 점수는 쓰지 않아요.</p>' +
      '<details><summary class="wp-note">선정 기록 보기</summary><ul class="wp-ev">' + A.log.map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ul></details>' +
      extraNotes(ch, A, o, 'ohaeng') + '<p class="wp-note">' + E(d.disclaimer) + '</p></section>';
  }

  // ── 특기·적성 탭 맨 위 ──
  function aptInfo(M, ch, A) {
    var Ap = G.MantraAptitude; if (!Ap) return null;
    var r; try { r = Ap.build(M, ch); } catch (e) { return null; } if (!r || !r.ok) return null;
    var ids = {}; A.weapons.forEach(function (w) { ids['e' + w.el] = 1; ids['g' + w.group] = 1; w.tgs.forEach(function (t) { ids[t] = 1; }); });
    var all = (r.talents || []).concat(r.fields || []);
    // 적성 결과의 근거 중 기여가 큰 앞 두 개에 주무기(오행·십성 묶음·드러난 십성)가 들어간 항목만 — 점수 순 최대 4개
    var top2 = function (t) { return (t.basis || []).slice().sort(function (a, b) { return b.c - a.c; }).slice(0, 2); };
    var links = all.filter(function (t) { return t.ok && t.level !== 'lo' && top2(t).some(function (b) { return ids[b.id]; }); }).sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
    var first = (r.talents || []).filter(function (t) { return t.id === (r.summary && r.summary.topTalent); })[0];
    var firstLinked = first && links.indexOf(first) >= 0;
    return { links: links, first: first, firstLinked: firstLinked, firstBasis: first ? top2(first).map(function (b) { return b.label; }) : [] };
  }
  function apt(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, d = D(), L = list(A);
    var info = aptInfo(M, ch, A) || { links: [] };
    var cards = L.length ? '<div class="wp-list">' + L.map(function (w, i) { return item(A, w, i, o, 'apt'); }).join('') + '</div>' : noneBody(A, E);
    var lk = info.links.length ? '<p class="wp-s"><span class="wp-lb">적성과 연결</span>이 주무기가 근거 앞자리에 들어간 특기·적성: ' + info.links.map(function (t) { return '<b>' + E(t.name) + '</b>(' + E(t.levelK) + ')'; }).join(' · ') + '</p>' : '';
    var diff = A.weapons.length && info.first && !info.firstLinked ? '<p class="wp-note">' + E(d.aptDiff.replace('{apt}', info.first.name).replace('{basis}', info.firstBasis.join(' · '))) + '</p>' : '';
    return '<section class="card wp" id="weapon-apt" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>나의 주무기</h2><span class="note">특기·적성의 바탕이 되는 힘</span></div><p class="wp-head">' + E(headOf(A)) + '</p>' +
      cards + lk + diff + (L.length ? '' : extraNotes(ch, A, o, 'apt')) + '<p class="wp-note">' + E(d.aptNotJob) + ' ' + o.L('wonguk', '원국 탭에서 형성 근거 보기 ›') + '</p></section>';
  }

  // ── 운세 흐름 탭: 주무기 발현 타이밍 ──
  // 활성도 실선 그래프(단계 이름만, 숫자 눈금 없음) + 유리도 보조 띠(엔진 등급 색). 점 색 = 그 시기 천간의 오행(주요 오행 색상 태그)
  function chart(rows, labels, nowIdx, bandName) {
    var n = rows.length; if (!n) return '';
    var CW = 46, LM = 52, H = 118, top = 12, step = 15, yOf = function (y) { return top + (4 - y) * step; };
    var wd = LM + n * CW, pts = [], dots = '', fav = '', xl = '';
    rows.forEach(function (r, i) {
      var x = LM + i * CW + CW / 2, a = r && r.best; if (!a) return;
      var y = yOf(a.y); pts.push(x + ',' + y);
      var col = EC[Math.floor((r.s == null ? 0 : r.s) / 2)];
      dots += '<circle cx="' + x + '" cy="' + y + '" r="' + (i === nowIdx ? 6 : 4.5) + '" fill="' + (a.level === 'shaky' || a.level === 'trim' ? 'var(--surface,#fff)' : col) + '" stroke="' + col + '" stroke-width="2"' + (a.level === 'shaky' ? ' stroke-dasharray="2 2"' : '') + '><title>' + esc0(labels[i] + ' ' + r.gz + ' · ' + a.levelK) + '</title></circle>';
      var fc = r.favor ? (r.favor.k === 'good' ? '#2DB36B' : r.favor.k === 'care' ? '#E8622C' : '#B5BDCB') : 'transparent';
      fav += '<rect x="' + (x - CW / 2 + 4) + '" y="' + (yOf(0) + 16) + '" width="' + (CW - 8) + '" height="6" rx="3" fill="' + fc + '"><title>' + esc0((r.favor && r.favor.metric || '흐름') + ' ' + (r.favor ? r.favor.n : '')) + '</title></rect>';
      xl += '<text x="' + x + '" y="' + (H - 4) + '" text-anchor="middle"' + (i === nowIdx ? ' style="font-weight:700;fill:var(--ink)"' : '') + '>' + esc0(labels[i]) + '</text>';
    });
    var grid = [[4, '강하게 켜짐'], [3, '켜짐'], [2, '받쳐 줌'], [1, '조용함'], [0, '눌림·정리']].map(function (g) { var y = yOf(g[0]); return '<line x1="' + LM + '" x2="' + wd + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/><text class="lv" x="' + (LM - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + g[1] + '</text>'; }).join('');
    return '<div class="wp-ch"><svg viewBox="0 0 ' + wd + ' ' + H + '" style="min-width:' + Math.round(wd * 0.82) + 'px;max-width:' + Math.round(wd * 1.3) + 'px" role="img" aria-label="주무기 활성도 단계 그래프">' + grid +
      '<text class="lv" x="' + (LM - 4) + '" y="' + (yOf(0) + 22) + '" text-anchor="end">' + esc0(bandName || '흐름 등급') + '</text>' + fav +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--ink-2)" stroke-width="2"/>' + dots + xl + '</svg></div>';
  }
  function detail(id, row, r, title, E) {
    var d = D(), a = r.best; if (!a) return '';
    var w = a, typesTxt = w.types.map(function (t) { return t === 'adjust' && /기신|구신/.test(w.roles.weapon) ? d.type.adjustExcess : d.type[t]; });
    var roleTxt = (w.roles.stem || w.roles.branch) ? '운의 천간 오행은 ' + (w.roles.stem || '—') + ', 지지 오행은 ' + (w.roles.branch || '—') + ' (통합 용신 기준 역할)' : '';
    return '<div class="wp-det wp-e' + w.el + '" id="' + id + '" data-wpr="' + row + '"><h4>' + E(title + ' ' + r.gz) + ' — 활성도 ' + E(w.levelK) + ' · ' + E(r.favor && r.favor.metric || '흐름') + ' ' + E(r.favor ? r.favor.n : '—') + '</h4>' +
      '<p>' + E(r.mText || d.combo[r.read]) + '</p>' +
      (typesTxt.length ? '<p class="wp-s"><span class="wp-lb">작용 유형</span>' + E(typesTxt.join(' / ')) + '</p>' : '<p class="wp-s"><span class="wp-lb">작용 유형</span>주무기에 직접 닿는 작용이 없어요</p>') +
      '<p class="wp-s"><span class="wp-lb">활용 방향</span>운의 천간이 ' + E(w.use.tg) + '(' + E(w.use.groupName) + ')라 ' + E(d.use[w.use.group]) + ' 쓰기 쉬운 결이에요</p>' +
      (roleTxt ? '<p class="wp-s"><span class="wp-lb">발현 지원</span>' + E(roleTxt) + ' · 유리도는 ' + E(r.favor && r.favor.metric ? '위 그래프의 ' + r.favor.metric + ' 등급' : '기존 흐름 등급') + ' 그대로예요</p>' : '') +
      (w.signals.length ? '<ul class="wp-ev">' + w.signals.map(function (s) { return '<li>' + E(s.x) + '</li>'; }).join('') + '</ul>' : '') +
      (w.constraints.length ? '<p class="wp-s" style="margin-top:4px"><span class="wp-lb">제약 요인</span></p><ul class="wp-ev">' + w.constraints.map(function (s) { return '<li>' + E(s) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function cell(r, top, sub, isNow, id, row) {
    if (!r) return '';
    var E = esc0, a = r.best, f = r.favor;
    return '<button type="button" class="wp-c wp-e' + (a ? a.el : 0) + (isNow ? ' wp-now' : '') + '" data-wpd="' + id + '" data-wpr="' + row + '"><span class="t">' + E(top) + '</span><span class="g">' + E(r.gz) + '</span>' +
      (a ? '<span class="wp-a ' + a.key + '">' + E(a.levelK) + '</span>' : '<span class="wp-a qt">—</span>') + (f ? '<span class="wp-f ' + f.k + '">' + E(f.metric || '흐름') + ' ' + E(f.n) + '</span>' : '') + (sub ? '<span class="t">' + E(sub) + '</span>' : '') + '</button>';
  }
  function luck(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, d = D(), Wm = W(); opt = opt || {};
    var L = list(A);
    var part = opt && opt.part || 'all';   // 'summary'(지금의 운 아래 요약) · 'daeun'·'seun'·'wolun'(각 그래프 카드 아래) · 'all'(예전 한 장)
    if (!L.length && part !== 'all' && part !== 'summary') return '';
    if (!L.length) return '<section class="card wp" id="weapon-luck" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>주무기 발현 타이밍</h2></div><p class="wp-head">' + E(headOf(A)) + '</p>' + extraNotes(ch, A, o, 'luck') + '<p class="wp-note">주무기로 서 있는 힘이 없어 운별 발현 타이밍은 그리지 않았어요. 위 흐름 그래프의 좋음·무난·조심은 그대로 참고하면 돼요.</p></section>';
    var now = opt.now || Date.now(), curY = opt.curY, wolY = opt.wolY || curY;
    var tl = Wm.timeline(M, ch, { fromY: curY, years: 10, wolY: wolY }); if (!tl) return '';
    // 그래프 지표(재물·직업·연애 등)를 고르면 띠·풀이를 그 지표에 맞춘다. 건강·사고수는 주무기와 잇지 않아 전체 흐름 그대로
    var mk = opt.metric && opt.metric !== 'flow' ? opt.metric : null, mName = opt.metricName || '', careM = mk === 'health' || mk === 'accident', mApplied = false;
    if (mk && !careM && typeof opt.favorOf === 'function') {
      var grp = d.metricGroup[mk] || 'general', LN = d.metricLens[grp], fillM = function (t) { return String(t || '').replace(/\{m\}/g, mName); };
      var cls = function (a) { return /strong|on|shaky/.test(a.level) ? 'on' : /sup|quiet/.test(a.level) ? 'prep' : 'guard'; };
      var apply = function (arr, src, kind) { arr.forEach(function (r, i) { if (!r || !r.best || !src[i]) return; var f = null; try { f = opt.favorOf(src[i], kind); } catch (e) { f = null; } if (!f) return; mApplied = true; r.favor = { k: f.k, n: f.n, metric: mName }; if (Wm.readPair) r.read = Wm.readPair(r.best, r.favor); r.mText = fillM(LN[cls(r.best)]) + ' ' + fillM(d.metricFavor[f.k]); }); };
      apply(tl.daeun, ch.daeun.list, 'daeun'); apply(tl.seun, M.seunRange(ch, curY, curY + 9) || [], 'seun'); apply(tl.wolun, M.wolun(ch, wolY) || [], 'wolun');
    }
    var bandName = mApplied ? mName + ' 등급' : '흐름 등급', mNote = careM ? '<p class="wp-note">' + E(d.metricCare) + '</p>' : '';
    var du = ch.daeun.list, curDi = -1; du.forEach(function (x, i) { if (x.startMs <= now) curDi = i; });
    var curWi = -1; tl.wolun.forEach(function (r, i) { if (r && r.startMs <= now) curWi = i; }); if (wolY !== curY) curWi = -1;
    var names = L.slice(0, 2).map(function (w) { return EL_H[w.el] + ' ' + D().el[w.el].title; }).join(' · ');
    var legend = '<div class="wp-leg"><span><span class="wp-a on2">강하게 켜짐</span> 천간+뿌리</span><span><span class="wp-a on1">켜짐</span> 천간 또는 정기 뿌리</span><span><span class="wp-a shk">켜지되 흔들림</span></span><span><span class="wp-a sup">받쳐 줌</span> 생해 주거나 얕은 뿌리</span><span><span class="wp-a qt">조용함</span></span><span><span class="wp-a hit">눌림</span><span class="wp-a trm">정리</span> 극·합거·충(많은 힘이면 정리)</span><span>|</span><span><span class="wp-f good">흐름 좋음</span><span class="wp-f">무난</span><span class="wp-f care">조심</span> = 위 그래프와 같은 등급(보조 지표)</span></div>';
    var dLab = du.map(function (x) { return x.startAge + '세'; }), sLab = tl.seun.map(function (r) { return String(r.year); }), wLab = tl.wolun.map(function (r) { return r.month + '월'; });
    var block = function (row, rows, labs, subs, nowIdx, secT) {
      return '<p class="wp-sec">' + E(secT) + '</p>' + chart(rows, labs, nowIdx, bandName) + '<div class="wp-row">' + rows.map(function (r, i) { return cell(r, labs[i], subs[i], i === nowIdx, 'wpd-' + row + '-' + i, row); }).join('') + '</div>' +
        rows.map(function (r, i) { return r ? detail('wpd-' + row + '-' + i, row, r, labs[i], E) : ''; }).join('');
    };
    // 그래프 카드 아래에 붙는 한 단위(대운·세운·월운) — 같은 판정, 같은 칸·상세 카드
    var short = '<div class="wp-leg"><span><span class="wp-a on2">강하게 켜짐</span><span class="wp-a on1">켜짐</span><span class="wp-a sup">받쳐 줌</span><span class="wp-a qt">조용함</span><span class="wp-a hit">눌림</span><span class="wp-a trm">정리</span></span><span>점 줄 = 주무기 활성도 · 아래 띠 = 위 그래프와 같은 ' + E(bandName) + '(합치지 않아요) · 칸을 누르면 설명</span></div>' + mNote;
    var PART = { daeun: ['d', tl.daeun, dLab, du.map(function (x) { return x.startYear + '~'; }), curDi, '대운마다 주무기가 켜지는 정도'], seun: ['s', tl.seun, sLab, tl.seun.map(function (r) { return r.age ? r.age + '세' : ''; }), tl.seun.findIndex(function (r) { return r.year === curY; }), curY + '~' + (curY + 9) + '년 주무기가 켜지는 정도'], wolun: ['w', tl.wolun, wLab, tl.wolun.map(function (r) { return r.termName; }), curWi, wolY + '년 달마다 주무기가 켜지는 정도'] };
    if (PART[part]) { var p = PART[part]; return '<div class="wp wp-part wp-e' + L[0].el + '" id="weapon-luck-' + part + '" data-wp="' + E(sigOf(A)) + '" style="margin:10px 0 14px;padding:10px 0;border-top:1px dashed var(--line);border-bottom:1px dashed var(--line)"><h3 style="margin:0;font-size:.95rem">주무기 발현 · ' + E(p[5]) + ' <span class="wp-note" style="font-weight:400">' + E(names) + '</span></h3>' + short + block(p[0], p[1], p[2], p[3], p[4], '').replace('<p class="wp-sec"></p>', '') + '</div>'; }
    var cur = tl.daeun[curDi] || null, picks = tl.seun.filter(function (r) { return r && r.best && /strong|on|shaky/.test(r.best.level); }).slice(0, 3);
    var line = function (when, r) { return '<li><span class="when">' + E(when) + '</span> — 활성도 <b>' + E(r.best.levelK) + '</b> · ' + E(r.favor && r.favor.metric || '흐름') + ' ' + E(r.favor ? r.favor.n : '—') + '<br>' + E(r.mText || d.combo[r.read]) + '</li>'; };
    var lines = (cur ? [line('지금 대운 ' + cur.gz, cur)] : []).concat(picks.map(function (r) { return line(r.year + '년 ' + r.gz, r); }));
    if (part === 'summary') return '<section class="card wp" id="weapon-luck" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>주무기 발현 타이밍</h2><span class="note">' + E(names) + '</span></div>' +
      '<p class="wp-note">' + E(d.twoAxes) + (A.status === 'undetermined' ? ' 태어난 시간을 몰라 세 기둥 기준 후보로 봤어요.' : A.status === 'complex' ? ' 복합형이라 후보 중 가장 잘 켜지는 쪽을 보여 줘요.' : '') + ' 대운·세운·월운 그래프 카드마다 맨 아래에 그 단위의 주무기 줄이 있어요.</p>' + legend +
      (lines.length ? '<p class="wp-sec">가까운 시기 읽기</p><ul class="wp-dl">' + lines.join('') + '</ul>' : '') +
      '<p class="wp-note">' + E(d.disclaimer) + ' 특정 날짜의 성패를 예측하지 않아요.</p></section>';
    return '<section class="card wp" id="weapon-luck" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>주무기 발현 타이밍</h2><span class="note">' + E(names) + '</span></div>' +
      '<p class="wp-note">' + E(d.twoAxes) + (A.status === 'undetermined' ? ' 태어난 시간을 몰라 세 기둥 기준 후보로 봤어요.' : A.status === 'complex' ? ' 복합형이라 후보 중 가장 잘 켜지는 쪽을 보여 줘요.' : '') + ' 칸을 누르면 그 시기 설명이 열려요.</p>' + legend +
      block('d', tl.daeun, dLab, du.map(function (x) { return x.startYear + '~'; }), curDi, '대운 · 10년 발현 환경') +
      block('s', tl.seun, sLab, tl.seun.map(function (r) { return r.age ? r.age + '세' : ''; }), tl.seun.findIndex(function (r) { return r.year === curY; }), '세운 · ' + curY + '~' + (curY + 9)) +
      block('w', tl.wolun, wLab, tl.wolun.map(function (r) { return r.termName; }), curWi, wolY + '년 월운 · 단기 활용 환경') +
      (lines.length ? '<p class="wp-sec">가까운 시기 읽기</p><ul class="wp-dl">' + lines.join('') + '</ul>' : '') +
      '<p class="wp-note">' + E(d.disclaimer) + ' 특정 날짜의 성패를 예측하지 않아요.</p></section>';
  }

  var api = { wonguk: wonguk, ohaeng: ohaeng, apt: apt, luck: luck, injectCss: injectCss, CSS: CSS, sigOf: sigOf };
  G.MantraWeaponView = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
