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
  var CSS = '.wp{display:grid;gap:10px}.wp-ch .wp-pk{font-size:9px;font-weight:700;fill:#fff}.wp-pkl{margin:4px 0}.wp-pkn{display:inline-block;min-width:15px;height:15px;line-height:15px;border-radius:50%;background:var(--ink);color:var(--surface);text-align:center;font-size:.68rem;font-weight:700}.wp-ch .wp-qw{font-size:10px;fill:var(--ink-3)}.wp-ch .wp-qw.q-peak{fill:#1F8A52;font-weight:700}.wp-ch .wp-qw.q-push{fill:#C2491B;font-weight:700}.wp-ch .wp-qw.q-show{fill:var(--ink);font-weight:600}.wp-dpk{display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto;padding:4px 0;align-items:center}.wp-dp{flex:0 0 auto;border:1px solid var(--line);border-radius:999px;padding:2px 9px;font:inherit;font-size:.74rem;background:var(--surface);color:var(--ink-2);cursor:pointer}.wp-dp.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.wp-dp.wp-dnow{font-weight:700;border-color:var(--ink-2)}.wp-dpk>.wp-note{flex:0 0 auto;white-space:nowrap}.wp-ch .wp-mw{font-size:10px;fill:var(--ink-2)}.wp-ch .wp-fw{font-size:9px;fill:#fff;font-weight:700}.wp-bdr{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 6px!important}.wp-bd{border-radius:999px;padding:1px 8px;font-size:.74rem;border:1px solid var(--line);background:var(--surface-2)}.wp-bd.k-boost{background:var(--wi,#555);color:#fff;border-color:transparent}.wp-bd.u-good,.wp-bd.u-good2{border-color:#2f7bd6;color:#1d5aa6}.wp-bd.u-adj{border-color:#c9a227;color:#8a6d0f}.wp-bd.u-bad{border-color:#b04a8a;color:#8a2f68}.wp-bd.f-good{border-color:#2DB36B;color:#1d7a47}.wp-bd.f-care{border-color:#E8622C;color:#b2461a}.wp-bd.c{border-color:var(--wc,#888)}.wp-dlx{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:6px 0;font-size:.82rem}.wp-dlx dt{font-weight:700;color:var(--ink-3);white-space:nowrap}.wp-dlx dd{margin:0}.wp-tg{display:inline-block;border-radius:6px;padding:0 6px;margin:0 3px 3px 0;font-size:.74rem;border:1px solid var(--line)}.wp-tg.p{border-color:#2DB36B;color:#1d7a47}.wp-tg.m{border-color:#E8622C;color:#b2461a}.wp-tg.c{border-color:var(--wc,#888)}.wp-more{margin-top:6px}.wp-more>summary{cursor:pointer;padding:4px 0}.wp-rel{border-radius:6px;padding:0 5px;font-size:.7rem}.wp-rel.r-boost{background:var(--wi,#555);color:#fff}.wp-rel.r-fill{border:1px solid var(--wc,#888)}.wp-rel.r-shift{background:#f3e3c3;color:#7a5600}.wp-cross{border-top:1px dashed var(--line);padding-top:8px;margin-top:4px}.wp-tri{display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;margin:6px 0}.wp-tc{flex:1 1 150px;border:1px solid var(--line);border-radius:10px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;font-size:.82rem}.wp-tc.m{border-color:var(--wc,#888);background:color-mix(in srgb,var(--wc,#888) 10%,var(--surface,#fff))}.wp-arr{align-self:center;color:var(--ink-3)}.wp-fl{border-radius:6px;padding:0 5px;font-size:.7rem;font-weight:700;border:1px solid var(--line)}.wp-fl.review{border-color:#c0392b;color:#c0392b}.wp-fl.check{border-color:#c9a227;color:#8a6d0f}.wp-fl.note{color:var(--ink-3)}.wp-u{border-radius:6px;padding:1px 4px;font-size:.68rem;border:1px solid var(--line);color:var(--ink-2)}.wp-u.u-good,.wp-u.u-good2{border-color:#2f7bd6;color:#1d5aa6}.wp-u.u-adj{border-color:#c9a227;color:#8a6d0f}.wp-u.u-bad{border-color:#b04a8a;color:#8a2f68}.wp-mix{font-size:.86rem;font-weight:600;color:var(--ink);margin:2px 0 4px!important}.wp-act{font-size:.84rem;margin-top:4px!important;color:var(--ink)}.wp-core{font-size:.9rem;line-height:1.65;margin:2px 0 6px!important;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--wc,#888) 10%,var(--surface,#fff))}.wp-core b{color:var(--ink)}.wp-cb{border-top:1px solid var(--line);padding:6px 0 2px}.wp-ct{font-size:.78rem!important;font-weight:700;color:var(--ink-3);margin:0 0 2px!important}.wp-cn{display:inline-block;min-width:1.4em;color:var(--wi,var(--ink-2))}.wp-kind{border-radius:6px;padding:1px 6px;font-size:.78rem;background:var(--surface-2);color:var(--ink)}.wp-kind.k-boost{background:var(--wi,#555);color:#fff}.wp-kind.k-assist{border:1px solid var(--wc,#888);background:transparent}.wp-kind.k-limit{text-decoration:underline dotted}.wp-plan{font-size:.84rem;margin-top:4px!important;color:var(--ink)}.wp-det .wp-ev li{margin:1px 0}.wp p{margin:0;line-height:1.65}.wp-head{font-weight:800;font-size:1rem;line-height:1.55}' +
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
  function rankLabel(A, w, i) { var d = D(); if (w && w.link && A.status === 'dual') return '보조 역량'; return A.status === 'complex' ? '복합 후보' : A.status === 'undetermined' ? '유력 후보' : (i === 0 && A.label === '잠정 주무기') ? '잠정 주무기' : d.rank[i] || d.rank[1]; }
  function headOf(A) { var d = D(); if (A.status === 'dual' && A.weapons[1] && A.weapons[1].link && d.status.dualLink && A.label !== '잠정 주무기') return d.status.dualLink; if (A.label === '잠정 주무기' && A.status !== 'undetermined') return d.status.provisionalHead; return (A.label === '주무기 미확정' && A.status !== 'none' && A.status !== 'complex' ? '주무기 미확정 · ' : '') + (d.status[A.status] || ''); }
  // 십신 작용(기존 십성 작용 엔진 ten-god-roles.js 의 유형, 표시만)
  var _tgr = typeof WeakMap === 'function' ? new WeakMap() : null;
  function tgAct(M, ch, g) { var T = G.MantraTenGodRoles; if (!T || !T.analyze) return null; var r = _tgr && _tgr.get(ch); if (!r) { try { r = T.analyze(M, ch); } catch (e) { r = null; } if (_tgr && r) _tgr.set(ch, r); } var x = r && r.groups && r.groups[g]; return x && x.main ? x.main : null; }

  var GNV0 = ['비겁', '식상', '재성', '관성', '인성'], jo2 = function (w) { var c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0 ? '이' : '가'; };
  // 무기 한 개 카드 — part: 'origin'(원국: 형성 근거) | 'apt'(적성: 활용 방향)
  function item(A, w, i, o, part, M, ch) {
    var d = D(), E = o.E, dl = d.el[w.el], gl = d.group[w.group], ta = M && ch ? tgAct(M, ch, w.group) : null, yk = A.yong ? EL_K[A.yong.el] : '';
    var tags = (w.typeK ? '<span class="wp-tag cl" title="' + E(d.typeNote[w.type]) + '">' + E(w.typeK) + '</span>' : '') + '<span class="wp-tag cl">' + E(w.groupName) + ' · 세력 ' + w.pct + '%</span>' + (w.confidence ? '<span class="wp-tag" title="' + E(d.confidenceNote) + '">' + E(d.confidence[w.confidence]) + '</span>' : '') + (w.shaky ? '<span class="wp-tag">다듬어 쓰는 무기</span>' : '');
    var h = '<div class="wp-it wp-e' + w.el + '"><span class="wp-rk">' + E(rankLabel(A, w, i)) + '</span><div class="wp-n"><span class="wp-hj">' + EL_H[w.el] + '</span>' + E(title(w)) + '</div><div class="wp-n" style="font-weight:600">' + tags + '</div>' +
      '<div class="wp-kw">' + dl.strengths.map(function (k) { return '<span>' + E(k) + '</span>'; }).join('') + '</div>' +
      '<p><span class="wp-lb">발현 방식</span>' + E(EL_K[w.el] + ' + ' + w.groupName + ': ' + d.elGroup[w.el][w.group]) + '</p>' +
      (w.link ? '<p class="wp-s"><span class="wp-lb">보조 역량</span>' + E(EL_K[w.link.from] + '(' + GNV0[w.link.fromGroup] + ')' + jo2(EL_K[w.link.from]) + ' 낳는 힘을 이어 받는 쪽이에요(' + w.link.name + '). 따로 서는 무기라기보다 주무기의 결과를 현실로 옮기는 역량이에요.') + '</p>' : '') +
      (w.path === 'branch' ? '<p class="wp-s"><span class="wp-lb">지지 중심</span>' + E('천간에 드러나지 않았지만 월령과 지지에서 주도하는 힘이에요. 겉으로 내세우기보다 안에서 꾸준히 작동해요.' + ((w.sameBranches || []).length ? ' 지지에서 작용하는 십성: ' + w.sameBranches.map(function (b) { return b.ch + '(' + b.main + ' ' + b.mainTg + ')'; }).join(' · ') : '')) + '</p>' : '') +
      (w.tgs.length ? '<p class="wp-s"><span class="wp-lb">드러난 십성</span>' + E(w.tgs.map(function (t) { return t + ' — ' + d.tg[t]; }).join(' · ')) + '</p>' : '') +
      (ta ? '<p class="wp-s"><span class="wp-lb">십신 작용</span>' + E(w.groupName + ' — ' + ta.name + (ta.why ? '(' + ta.why + ')' : '')) + '</p>' : '') +
      (w.type ? '<p class="wp-note"><span class="wp-lb">유형</span>' + E(d.typeNote[w.type]) + '</p>' : '') +
      '';   // 3판: 용신과의 관계·제약은 'C · 능력의 활용 조건'에서
    if (part === 'apt') h += '<p class="wp-s"><span class="wp-lb">활용 방향</span>' + E(gl.scene) + '</p><p class="wp-note"><span class="wp-lb">과잉 시</span>' + E(dl.overLine + ' ' + gl.over) + '</p>';
    if (part === 'origin' && w.shaky) h += '<p class="wp-note">' + E(d.shaky) + '</p>';   // 과잉 주의는 'B · 능력의 발현 방식'에서
    h += '<details' + (part === 'origin' && i === 0 ? ' open' : '') + '><summary class="wp-note">형성 근거 (병존·간여지동·통근·투간)</summary><ul class="wp-ev">' + w.reasons.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') + '</ul></details></div>';
    return h;
  }
  // ── 3판: B · 능력의 발현 방식 / C · 능력의 활용 조건 (네 탭·유료 블록이 같은 analyze 결과를 읽는다) ──
  var pk = function (a, b) { return Math.min(a, b) + '-' + Math.max(a, b); };
  var GNV = ['비겁', '식상', '재성', '관성', '인성'];
  function secB(A, w, o) {
    var d = D(), E = o.E, g = w.group, ps = w.partners || [], dl = d.el[w.el], gl = d.group[g];
    var h = '<div class="wp-box wp-e' + w.el + '"><b>' + E(EL_K[w.el] + '(' + w.groupName + ')') + '</b> 기본 기능 — ' + E(d.fn[g]) + ' <span class="wp-note">(고정된 직업이 아니라 해석의 기본 요소예요)</span>';
    if (ps.length) {
      h += '<ul class="wp-ev" style="margin-top:6px">' + ps.map(function (p) { var P = d.pair[pk(g, p.group)]; if (!P) return ''; var bad = p.tone === 'bad' && P.tension; return '<li><b>' + E(w.groupName + ' + ' + GNV[p.group] + ' · ' + P.name) + '</b> <span class="wp-note">(' + E(d.pairBasis[p.basis] + (p.name ? ': ' + p.name : '')) + ')</span><br>' + E(bad ? P.tension : P.desc) + (bad ? '' : ' <span class="wp-note">활용 방향: ' + E(P.ways.join('·')) + '</span>') + '</li>'; }).join('') + '</ul>';
      var mainF = ps.map(function (p) { return d.forms[g][p.group]; }).filter(Boolean), other = Object.keys(d.forms[g]).filter(function (k) { return !ps.some(function (p) { return String(p.group) === k; }); }).map(function (k) { return d.forms[g][k]; });
      h += '<p class="wp-s" style="margin-top:6px"><span class="wp-lb">이 명식에서 주로 드러날 형태</span>' + E(mainF.join(' · ')) + (other.length ? ' <span class="wp-note">— 이 밖에 ' + E(other.join(' · ')) + '로도 드러날 수 있어요</span>' : '') + '</p>';
      var envs = ps.filter(function (p) { return p.tone !== 'bad'; }).map(function (p) { var P = d.pair[pk(g, p.group)]; return P && P.env; }).filter(Boolean);
      if (envs.length) h += '<p class="wp-s"><span class="wp-lb">강점이 드러나는 환경</span>' + E(envs.join(' · ')) + '</p>';
    } else h += '<p class="wp-note" style="margin-top:6px">' + E(d.noPartner) + '</p>';
    h += '<p class="wp-note"><span class="wp-lb">과잉 작용 시</span>' + E(dl.overLine + ' ' + gl.over) + '</p></div>';
    return h;
  }
  function secC(A, w, o) {
    var d = D(), E = o.E, yk = A.yong ? EL_K[A.yong.el] : '', P = { year: '년', month: '월', day: '일', hour: '시' }, sup = [], con = [];
    (w.structure || []).forEach(function (x) { sup.push(x.text); });
    (w.acts || []).forEach(function (x) { sup.push('실제 작용 ' + x.name + ' 성립'); });
    if (w.cond.deepRoot) sup.push('깊은 뿌리(정기·월지)'); if (w.cond.season) sup.push('태어난 달의 계절 힘(' + w.season + ')');
    if (/용신|희신/.test(w.role || '')) sup.push('균형에 필요한 쪽(' + w.role + ')');
    (w.stems || []).forEach(function (x) { var nm = x.bound.concat(x.clash); if (nm.length) con.push(P[x.pos] + '간 ' + x.ch + ' — ' + nm.join('·')); });
    (w.rootClash || []).forEach(function (r) { if (r.chung.length) con.push('뿌리 자리 ' + P[r.pos] + '지 충 — ' + r.chung.join('·')); });
    (w.breaks || []).forEach(function (t) { con.push('격국을 흔드는 쪽 — ' + t); });
    (w.actBad || []).forEach(function (x) { con.push('부담 작용 ' + x.name + ' 성립'); });
    if (/기신|구신/.test(w.role || '')) con.push('균형상 이미 많은 쪽(' + w.role + ')');
    if (A.provisional && A.hourKeep && A.hourKeep.keep < A.hourKeep.of) con.push('태어난 시간 모름 — 12시진 중 ' + A.hourKeep.keep + '개에서 같은 판정');
    return '<div class="wp-box wp-e' + w.el + '"><b>' + E(EL_K[w.el] + '(' + w.groupName + ')') + '</b>' + (w.role && d.roleUse[w.role] ? '<p class="wp-s" style="margin-top:4px"><span class="wp-lb">용신과의 관계</span>' + E(d.roleUse[w.role].replace('{y}', yk)) + '</p>' : '') +
      '<p class="wp-s"><span class="wp-lb">지원하는 요소</span>' + E(sup.length ? sup.join(' · ') : '두드러진 지원 요소 없음') + '</p>' +
      '<p class="wp-s"><span class="wp-lb">제약하는 요소</span>' + E(con.length ? con.join(' · ') : '두드러진 제약 없음') + '</p></div>';
  }
  function extraNotes(ch, A, o, part) {
    var d = D(), E = o.E, out = [];
    if (A.provisional) { var hk = A.hourKeep; out.push(A.weapons.length && hk ? (hk.keep >= hk.of ? d.statusNote.provisional : d.statusNote.provisionalSome.replace('{k}', hk.keep)) : d.statusNote.provisionalNone); }   // 시간 모름: 세 기둥 잠정 판정 + 12시진 유지 수
    if (d.statusNote[A.status]) out.push(d.statusNote[A.status]);
    if (A.label && d.labelNote[A.label] && A.status !== 'none') out.push(d.labelNote[A.label]);
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
  // 7판 세 탭 판정 연결 카드(원국·오행·강약·주무기) — weapon.js crossCheck 결과만 읽는다
  function crossCard(M, ch, A, o) {
    var Wm = W(), d = D(), C = d.cross; if (!Wm.crossCheck || !C) return '';
    var X = null; try { X = Wm.crossCheck(M, ch, A); } catch (e) { X = null; } if (!X || X.level === 'none' || X.main == null) return '';
    var E = o.E, GNs = ['비겁', '식상', '재성', '관성', '인성'], FN = (d.card && d.card.fn) || GNs, dEl = M.stemEl(ch.pillars.day.s);
    var nmE = function (el) { var g = mod5(el - dEl); return EL_K[el] + '(' + GNs[g] + ')'; };
    var J = function (t) { return fixJ5(t); };
    var mainW = A.weapons[0], wf = FN[mainW.group];
    var fill = function (t, m) { return J(String(t).replace(/\{(\w+)\}/g, function (_, k) { return m[k] == null ? '' : m[k]; })); };
    var tri = [];
    if (X.base) tri.push(['base', X.base.el, X.base.group, X.base.act]);
    tri.push(['main', mainW.el, mainW.group, '']);
    if (X.support) tri.push(['support', X.support.el, X.support.group, X.support.act]);
    var triH = '<div class="wp-tri">' + tri.map(function (t, i) { return (i ? '<span class="wp-arr">→</span>' : '') + '<div class="wp-tc wp-e' + t[1] + (t[0] === 'main' ? ' m' : '') + '"><span class="wp-lb">' + E(C.role[t[0]]) + '</span><b>' + E(nmE(t[1])) + '</b><span class="wp-note">' + E(fill(C.roleLine[t[0]], { X: nmE(t[1]), xf: FN[t[2]] })) + (t[3] ? ' (' + E(t[3]) + ')' : '') + '</span></div>'; }).join('') + '</div>';
    var lines = X.links.map(function (l) {
      var R = C.rel[l.kind], t;
      if (l.kind === 'zone') { var drain = mainW.group >= 1 && mainW.group <= 3; t = l.extra.weak ? (drain ? R.weakDrain : R.weakHelp) : l.extra.strong ? (drain ? R.strongDrain : R.strongHelp) : R.mid; return '<li><b>' + E(l.label) + '</b> — ' + E(fill(t, { p: l.label.replace(/^일간 강약 /, ''), wg: mainW.groupName })) + '</li>'; }
      t = R && R[l.rel]; if (!t) return '';
      var extra = l.kind === 'top' ? ' ' + l.extra.pct + '%' : '';
      return '<li><b>' + E(l.label + ': ' + nmE(l.el) + extra) + '</b> — ' + E(fill(t, { X: nmE(l.el), xf: FN[mod5(l.el - dEl)], wf: wf, p: l.label })) + '</li>';
    }).filter(Boolean);
    // '다듬어 쓰는 무기'(shaky) 참고는 접어 둔다(2026-11-26 사용자 요청) — 나머지 항목만 펼쳐 보이고, 그것도 없으면 '모순 없음'
    var li1 = function (f) { return '<li><span class="wp-fl ' + f.level + '">' + E(C.flagHead[f.level]) + '</span> ' + E(J(f.cause)) + '</li>'; };
    var open = X.flags.filter(function (f) { return f.k !== 'shaky'; }), folded = X.flags.filter(function (f) { return f.k === 'shaky'; });
    var fl = open.map(li1).join(''), fd = folded.length ? '<details class="wp-fold"><summary class="wp-note">참고 ' + folded.length + '개 보기 (다듬어 쓰는 무기)</summary><ul class="wp-ev wp-flags">' + folded.map(li1).join('') + '</ul></details>' : '';
    return '<div class="wp-cross"><p class="wp-sec">' + E(C.title) + '</p><p class="wp-note">' + E(C.lead) + '</p>' + triH +
      '<ul class="wp-ev">' + lines.join('') + '</ul>' + (fl ? '<ul class="wp-ev wp-flags">' + fl + '</ul>' : '<p class="wp-note">✓ ' + E(C.allOk) + '</p>') + fd + '</div>';
  }
  var mod5 = function (a) { return ((a % 5) + 5) % 5; };
  var RD5 = { '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계' };
  var fixJ5 = function (t) { var bt = function (ch) { ch = RD5[ch] || ch; var c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 ? c % 28 !== 0 : null; }; var pk = function (b, j) { return j[0] === '이' ? (b ? '이' : '가') : j[0] === '을' ? (b ? '을' : '를') : j[0] === '은' ? (b ? '은' : '는') : (b ? '과' : '와'); };
    return String(t).replace(/(.)(\([^()]*\))(이\(가\)|을\(를\)|은\(는\)|과\(와\))/g, function (m, ch, par, j) { var b = bt(ch); return b == null ? m : ch + par + pk(b, j); }).replace(/(.)(이\(가\)|을\(를\)|은\(는\)|과\(와\))/g, function (m, ch, j) { var b = bt(ch); return b == null ? m : ch + pk(b, j); }); };
  function wonguk(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, L = list(A);
    var body = L.length ? '<p class="wp-sec">A · 타고난 핵심 역량</p><div class="wp-list">' + L.map(function (w, i) { return item(A, w, i, o, 'origin', M, ch); }).join('') + '</div>' +
      '<p class="wp-sec">B · 능력의 발현 방식</p>' + L.map(function (w) { return secB(A, w, o); }).join('') +
      '<p class="wp-sec">C · 능력의 활용 조건</p>' + L.map(function (w) { return secC(A, w, o); }).join('') + crossCard(M, ch, A, o) : noneBody(A, E);
    var yl = yongLine(A);
    return '<section class="card wp" id="weapon-wonguk" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>나의 타고난 주무기</h2><span class="note">드러남 · 뿌리 · 세력 · 격국 구조로 본 힘</span></div>' +
      '<p class="wp-head">' + E(headOf(A)) + '</p>' + body + extraNotes(ch, A, o, 'origin') + (yl ? '<p class="wp-note">' + E(yl) + '</p>' : '') +
      '<p class="wp-note">' + o.L('ohaeng', '오행·강약에서 판정표 보기 ›') + ' ' + o.L('luck', '운에 따른 발현 환경은 운세 흐름에서 ›') + '</p></section>';
  }

  // ── 오행·강약 탭: 주무기 오행 분석 ──
  function ohaeng(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, T = o.T, d = D();
    var cand = A.candidates, mk = function (v, warn) { return v ? '<span class="wp-y">○</span>' : warn ? '<span class="wp-w">△</span>' : '<span class="wp-x">·</span>'; };
    var lab = function (f) { var i = cand.indexOf(f.el); if (i < 0) return f.cond.core ? '후보' : ''; return A.status === 'complex' ? '복합' : A.status === 'undetermined' ? '유력 후보' : d.rank[i]; };
    var rows = A.facts.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (f) {
      var c = f.cond, on = cand.indexOf(f.el) >= 0, bj = f.byeongjon.stem.length + f.byeongjon.branch.length;
      return '<tr class="wp-e' + f.el + (on ? ' on' : '') + '"><td>' + EL_H[f.el] + ' ' + EL_K[f.el] + ' <span class="wp-note">' + E(f.groupName) + '</span></td><td>' + f.pct + '%</td><td>' + f.surface.stem + '·' + f.surface.branch + '</td><td>' + mk(c.force) + '</td><td>' + mk(c.exposed) + '</td><td>' + mk(c.rooted) + '</td><td>' + mk(c.exposed && c.intact, c.exposed && !c.intact) + '</td><td>' + mk(c.season) + '</td><td>' + (bj ? '<span class="wp-y">' + bj + '</span>' : mk(false)) + '</td><td>' + mk(f.ganyeo.length) + '</td><td>' + mk(c.deepRoot) + '</td><td>' + mk(c.structure, f.breaks && f.breaks.length) + '</td><td><b>' + E(lab(f)) + '</b></td></tr>';
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
      '<div style="overflow-x:auto"><table class="wp-tb"><thead><tr><th>오행</th><th>세력</th><th title="지장간 빼고 천간·지지 겉글자만 센 개수">겉글자 간·지</th><th title="평균 몫 20% 이상">세력≥20%</th><th>' + T('투간', '투간') + '</th><th>' + T('통근', '통근') + '</th><th title="드러난 천간이 합·충으로 묶이지 않고 뿌리 자리가 충을 맞지 않음">온전함</th><th title="월령에서 왕·상">' + T('득령', '득령') + '</th><th>' + T('병존', '병존') + '</th><th>' + T('간여지동', '간여지동') + '</th><th title="정기 또는 월지 뿌리">깊은 뿌리</th><th title="월령 격국의 격 오행(성립·부분) 또는 켜진 상신">격국·상신</th><th>판정</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="wp-note">' + E(d.distinguish.numbers) + ' 판정 순서: ① 세력 20% 이상 · 천간에 드러남 · 지지에 뿌리, 또는 천간에 없어도 월령과 지지에서 주도하는 힘(지지 중심) — 후보(세력 10~20%라도 격국·상신 역할이 있으면 십신형 후보로 뒤에 둠) ② 합·충으로 묶이지 않은 후보 먼저 ③ 구조적 중요도: 월령(월지 정기)·격국이 가장 무겁고, 사령·실제 작용·세력 1위 다음, 병존·간여지동·깊은 뿌리는 가볍게(같은 사실은 한 번만, 투출 자체는 가점 없음) ④ 같으면 세력 % ⑤ 두 무기가 생으로 이어지면(예: 식신생재) 낳는 쪽을 주무기, 받는 쪽을 보조 역량으로.</p>' +
      crossCard(M, ch, A, o) +
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
    var cards = L.length ? '<div class="wp-list">' + L.map(function (w, i) { return item(A, w, i, o, 'apt', M, ch); }).join('') + '</div>' : noneBody(A, E);
    var lk = info.links.length ? '<p class="wp-s"><span class="wp-lb">적성과 연결</span>이 주무기가 근거 앞자리에 들어간 특기·적성: ' + info.links.map(function (t) { return '<b>' + E(t.name) + '</b>(' + E(t.levelK) + ')'; }).join(' · ') + '</p>' : '';
    var diff = A.weapons.length && info.first && !info.firstLinked ? '<p class="wp-note">' + E(d.aptDiff.replace('{apt}', info.first.name).replace('{basis}', info.firstBasis.join(' · '))) + '</p>' : '';
    return '<section class="card wp" id="weapon-apt" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>나의 주무기</h2><span class="note">특기·적성의 바탕이 되는 힘</span></div><p class="wp-head">' + E(headOf(A)) + '</p>' +
      cards + (L.length ? '<p class="wp-sec">능력의 발현 방식</p>' + L.map(function (w) { return secB(A, w, o); }).join('') : '') + lk + diff + (L.length ? '' : extraNotes(ch, A, o, 'apt')) + '<p class="wp-note">' + E(d.aptNotJob) + ' ' + o.L('wonguk', '원국 탭에서 형성 근거 보기 ›') + '</p></section>';
  }

  // ── 운세 흐름 탭: 주무기 발현 타이밍 ──
  // 활성도 실선 그래프(단계 이름만, 숫자 눈금 없음) + 유리도 보조 띠(엔진 등급 색). 점 색 = 그 시기 천간의 오행(주요 오행 색상 태그)
  // 2026-11-26: 흐름이 보이는 꺾은선(사용자 요청으로 막대 → 선). 눈금은 세 줄(강하게 발현·보조·강화·제약·조정)만, 흐름 띠 없음.
  //  점 색 = 그 시기 천간 오행, 흔들림은 점선 테두리, 지금 시기는 큰 점
  // 2026-11-27 바람·칼날 구간: 흐름 등급 = 바람(순풍·보통·역풍), 발현 강도 = 칼날. 두 값은 그대로 두고 조합 이름만(유료 상세풀이 '바람과 칼날'과 같은 규칙)
  function quad(a, fk) { var shp = /strong|on|shaky/.test(a.level); return shp ? (fk === 'good' ? ['전성기', '순풍 + 칼날 예리 — 바람과 칼날이 함께', 'peak'] : fk === 'care' ? ['돌파기', '역풍 + 칼날 예리 — 환경은 거칠지만 주무기는 먹힘, 실력이 크게 남는 구간', 'push'] : ['발휘기', '보통 바람 + 칼날 예리 — 환경보다 주무기가 먼저 섬', 'show']) : (fk === 'good' ? ['순항기', '순풍 + 칼날 쉼 — 환경은 받쳐 주나 주무기는 쉼, 날을 가는 구간', 'cruise'] : ['정비기', (fk === 'care' ? '역풍' : '보통 바람') + ' + 칼날 쉼 — 쉬며 정비하는 구간', 'tune']); }
  // 2026-11-28 전성기 순위: 지금·앞으로(80세 미만 시작) 대운 중 갈래 순서 전성기(칼날 섬+순풍) → 발휘기(칼날 섬+보통) → 순항기(칼날 쉼+순풍), 같은 갈래는 바람 점수 → 칼날 세기 → 이른 대운. 2개가 안 되면 보통 바람에서 채움. 점수 합산 없음
  function peakRank(rows, du, now) {
    var QO = { peak: 0, show: 1, cruise: 2, push: 3, tune: 4 }, PW = { strong: 3, on: 2, shaky: 1 };
    var c = rows.map(function (r, i) { if (!r || !r.best || !r.favor || !du[i]) return null; var end = du[i + 1] ? du[i + 1].startMs : Infinity; if (end <= now || du[i].startAge >= 80) return null; var q = quad(r.best, r.favor.k); return { i: i, q: QO[q[2]], name: q[0], v: Number.isFinite(r.favor.v) ? r.favor.v : 0, pw: PW[r.best.level] || 0, k: r.favor.k }; }).filter(Boolean)
      .sort(function (a, b) { return a.q - b.q || b.v - a.v || b.pw - a.pw || a.i - b.i; });
    var picks = c.filter(function (x) { return x.q <= 2; }).slice(0, 3); if (picks.length < 2) picks = c.filter(function (x) { return x.k !== 'care'; }).slice(0, Math.max(2, picks.length));
    return picks;
  }
  function chart(rows, labels, nowIdx, marks) {
    var n = rows.length; if (!n) return '';
    var CW = 44, LM = 52, H = 162, top = 22, step = 15, yOf = function (y) { return top + (4 - y) * step; }, yX = 104, yM = 122, yF = 136, yQ = 152;   // top 22: 전성기 순위 표시 자리
    var MW = ['추진', '표현', '전략', '관리', '연구'], FC = { good: '#2DB36B', ok: '#B5BDCB', care: '#E8622C' }, WN = { good: '순풍', ok: '보통', care: '역풍' }, BG = { good: 'rgba(45,179,107,.10)', ok: 'rgba(0,0,0,0)', care: 'rgba(232,98,44,.10)' };
    var wd = LM + n * CW, pts = [], dots = '', xl = '', mw = '', fw = '', dvd = '', bg = '', qw = '';
    rows.forEach(function (r, i) {
      var x = LM + i * CW + CW / 2, a = r && r.best; if (!a) return;
      if (r.daeunGz && i > 0 && rows[i - 1] && rows[i - 1].daeunGz !== r.daeunGz) dvd += '<line x1="' + (x - CW / 2) + '" x2="' + (x - CW / 2) + '" y1="2" y2="' + (yX - 10) + '" stroke="var(--ink-3)" stroke-dasharray="2 3"/><text class="lv" x="' + (x - CW / 2 + 3) + '" y="8" style="text-anchor:start">' + esc0(r.daeunGz) + ' 대운</text>';
      var y = yOf(a.y); pts.push(x + ',' + y);
      if (marks && marks[i]) dvd += '<circle cx="' + x + '" cy="' + (y - 13) + '" r="7" fill="' + (marks[i].q === 0 ? '#1F8A52' : marks[i].q === 1 ? 'var(--ink)' : '#8A94A6') + '"><title>' + esc0('전성기 ' + marks[i].rank + '위 · ' + marks[i].name) + '</title></circle><text x="' + x + '" y="' + (y - 10) + '" text-anchor="middle" class="wp-pk">' + marks[i].rank + '</text>';
      var col = a.y === 0 ? 'var(--ink-3,#999)' : EC[Math.floor((r.s == null ? 0 : r.s) / 2)];
      dots += '<circle cx="' + x + '" cy="' + y + '" r="' + (i === nowIdx ? 6 : 4.5) + '" fill="' + (a.level === 'shaky' ? 'var(--surface,#fff)' : col) + '" stroke="' + (i === nowIdx ? 'var(--ink)' : col) + '" stroke-width="2"' + (a.level === 'shaky' ? ' stroke-dasharray="2 2"' : '') + '><title>' + esc0(labels[i] + ' ' + r.gz + ' · 주무기 ' + a.levelK) + '</title></circle>';
      xl += '<text x="' + x + '" y="' + yX + '" text-anchor="middle"' + (i === nowIdx ? ' style="font-weight:700;fill:var(--ink)"' : '') + '>' + esc0(labels[i]) + '</text>';
      var g = a.use ? a.use.group : null, dim = a.y <= 1;   // 잠재·제약 시기는 방식 글자를 흐리게
      if (g != null) mw += '<text x="' + x + '" y="' + yM + '" text-anchor="middle" class="wp-mw" style="' + (dim ? 'opacity:.45' : 'font-weight:600') + '"><title>' + esc0(labels[i] + ' 주무기를 쓰는 결: ' + MW[g] + '(운 천간 ' + a.use.tg + ')') + '</title>' + MW[g] + '</text>';
      var f = r.favor; if (f) { bg += '<rect x="' + (x - CW / 2) + '" y="' + (top - 6) + '" width="' + CW + '" height="' + (yOf(0) - top + 12) + '" fill="' + (BG[f.k] || BG.ok) + '"/>';
        fw += '<rect x="' + (x - 15) + '" y="' + (yF - 9) + '" width="30" height="13" rx="6" fill="' + (FC[f.k] || FC.ok) + '" opacity=".9"><title>' + esc0('바람 ' + (WN[f.k] || f.n) + ' — ' + (f.metric || '흐름') + ' ' + f.n) + '</title></rect><text x="' + x + '" y="' + (yF + 1) + '" text-anchor="middle" class="wp-fw">' + esc0(WN[f.k] || f.n) + '</text>';
        var qn = quad(a, f.k); qw += '<text x="' + x + '" y="' + yQ + '" text-anchor="middle" class="wp-qw q-' + qn[2] + '"><title>' + esc0(labels[i] + ' ' + qn[0] + ': ' + qn[1]) + '</title>' + qn[0].slice(0, 2) + '</text>'; }
    });
    var area = pts.length > 1 ? '<polygon points="' + pts[0].split(',')[0] + ',' + yOf(0) + ' ' + pts.join(' ') + ' ' + pts[pts.length - 1].split(',')[0] + ',' + yOf(0) + '" fill="var(--wc,#888)" opacity=".08"/>' : '';
    var grid = [[4, '칼날 예리'], [2, '보조·강화'], [0, '눌림·조정']].map(function (g) { var y = yOf(g[0]); return '<line x1="' + LM + '" x2="' + wd + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"' + (g[0] === 2 ? ' stroke-dasharray="3 3"' : '') + '/><text class="lv" x="' + (LM - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + g[1] + '</text>'; }).join('');
    return '<div class="wp-ch"><svg viewBox="0 0 ' + wd + ' ' + H + '" style="min-width:' + Math.round(wd * 0.82) + 'px;max-width:' + Math.round(wd * 1.3) + 'px" role="img" aria-label="바람(운 흐름) 속 주무기 칼날 그래프">' + bg + grid + dvd + area +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--ink-2)" stroke-width="2"/>' + dots + xl +
      '<text class="lv" x="' + (LM - 4) + '" y="' + yM + '" text-anchor="end">방식</text>' + mw + '<text class="lv" x="' + (LM - 4) + '" y="' + (yF + 1) + '" text-anchor="end">바람</text>' + fw + '<text class="lv" x="' + (LM - 4) + '" y="' + yQ + '" text-anchor="end">구간</text>' + qw + '</svg></div>';
  }
  // 4판(2026-11-26) 상세 카드: ① 핵심 해석 ② 작용 유형 ③ 작용 근거 ④ 활용 방향 ⑤ 발현 지원 ⑥ 제약 ⑦ 운의 유불리
  //  판정은 MantraWeapon.luck 그대로(별도 판정 없음). 지원·제약은 근거가 있을 때만 그린다.
  var jo = function (w, a, b) { var c = String(w || '').charCodeAt(String(w || '').length - 1); var has = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : /[0-9LMNRlmnr]$/.test(w); return w + (has ? a : b); };
  var fillJ = function (t, m) { return String(t).replace(/\{(\w)\}(이\(가\)|을\(를\)|과\(와\))?/g, function (_, k, j) { var v = m[k] == null ? '' : m[k]; if (!j) return v; return j === '이(가)' ? jo(v, '이', '가') : j === '을(를)' ? jo(v, '을', '를') : jo(v, '과', '와'); }); };
  var GNV = ['비겁', '식상', '재성', '관성', '인성'];
  function relWord(we, e) { var d = (e - we + 5) % 5; return ['same', 'out', 'ctrled', 'ctrl', 'gen'][d]; }
  function detail(id, row, r, title, E, L, ch) {
    var d = D(), C = d.card, a = r.best; if (!a) return '';
    var w = (L || []).filter(function (x) { return x.el === a.el; })[0] || (L || [])[0]; if (!w || !C) return '';
    var tW = { d: '이 대운', s: '이 해', w: '이 달' }[row] || '이 시기', T = a.wType || 'element', kk = { boost: 'up', assist: 'sup', keep: 'keep', limit: 'limit' }[a.kind] || 'keep';
    var wName = EL_K[w.el] + '(' + EL_H[w.el] + ') ' + d.el[w.el].title, sW = d.el[w.el].strengths.slice(0, 2).join('·'), fW = (C.fn || [])[w.group] || d.group[w.group].way;
    var lvKey = a.level === 'quiet' && a.axis && a.axis.mixed ? 'quietMixed' : a.level;
    var head = fillJ(C.head[lvKey] || C.head.quiet, { w: wName, t: tW });
    var mixed = a.axis && a.axis.mixed;
    var feat = mixed ? fillJ(C.featMixed, { s: sW, f: fW }) : T === 'complex' ? fillJ(C.feat.complex[(a.axis && a.axis.rel) || 'quiet'] || '', { s: sW, f: fW }) : fillJ(C.feat[T][kk], { s: sW, f: fW });
    var li = function (arr) { return '<ul class="wp-ev">' + arr.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>'; };
    var sec = function (n, t, body) { return '<div class="wp-cb"><p class="wp-ct"><span class="wp-cn">' + n + '</span>' + E(t) + '</p>' + body + '</div>'; };
    var Ls = a.letters || {}, st = Ls.stem || {}, br = Ls.branch || {}, pct = (ch && ch.weights && ch.weights.pct) || [];
    var pctW = function (e) { var v = pct[e]; return v == null ? '' : ' 원국 ' + Math.round(v) + '%'; };
    // ② 작용 유형
    var kindB = '<p class="wp-s"><b class="wp-kind k-' + a.kind + '">' + E(a.kindK || '') + '</b> ' + E((mixed ? C.kind.keepMixed : C.kind[a.kind]) || '') + '</p>' +
      (T === 'complex' && a.axis ? '<p class="wp-note">오행 축 ' + E(C.axisName[a.axis.e] + (a.axis.eDown ? '·눌림' : '')) + ' · 십성 축 ' + E(C.axisName[a.axis.t] + (a.axis.tDown ? '·제어' : '')) + ' → ' + E(C.relName[a.axis.rel] || '') + '</p>' : '<p class="wp-note">' + E(T === 'element' ? '오행형 주무기 — 오행의 유입·뿌리·생극·합충으로 판정했어요' : '십신형 주무기 — 십신의 투출·통근·격국 역할·짝 작용으로 판정했어요(단순 출현은 보조까지)') + '</p>');
    // ③ 작용 근거(사실) — 오행 환경·십성·투간·통근·합충
    var ev = [];
    ev.push('오행 환경: 천간 ' + st.ch + '(' + EL_K[st.el] + ',' + pctW(st.el) + ') · 지지 ' + br.ch + '(' + EL_K[br.mainEl] + ',' + pctW(br.mainEl) + ') — 천간은 ' + C.letterRel[relWord(w.el, st.el)] + ', 지지는 ' + C.letterRel[relWord(w.el, br.mainEl)] + '이에요');
    ev.push('십성: 천간 ' + st.tg + '(' + GNV[st.group] + ') · 지지 정기 ' + br.tg + '(' + GNV[br.group] + ') — 주무기는 ' + w.groupName + (w.tgs && w.tgs.length ? '(' + w.tgs.join('·') + ')' : '') + (a.axis && a.axis.exact ? ', 운 천간이 원국에 드러난 십신과 같아요' : ''));
    ev.push('투간·통근: ' + (a.stemSame ? '운 천간에 주무기 오행이 드러나요' : '운 천간에 주무기 오행은 없어요') + ' · ' + (a.rootDepth ? '운 지지에 주무기 뿌리(' + a.rootDepth + ')가 있어요' : '운 지지에 주무기 뿌리는 없어요'));
    var refs = a.refs || [], acts = (a.relNames || []).filter(function (n) { return refs.indexOf(n) < 0; });
    ev.push('합충형파해: ' + (acts.length ? acts.join(' · ') + ' — 주무기 글자에 직접 작용해요(아래 지원·제약에 반영)' : '주무기 글자에 직접 작용하는 합충은 없어요') + (refs.length ? ' · ' + jo(refs.join('·'), '은', '는') + ' 길흉 판단 없이 참고만 해요' : ''));
    // ④ 활용 방향
    var P = a.partner && a.partner.tone !== 'bad' ? d.pair[pk(w.group, a.partner.group)] : null;
    var ability = T === 'element' ? sW + ' 능력' : T === 'tengod' ? w.groupName + '의 ' + fW + ' 기능' : sW + ' 능력과 ' + w.groupName + '의 ' + fW + ' 기능';
    // 5판: 활용 유리도(발현 강도와 별개, 합산 없음) — weapon.js useFavor 결과를 그대로 읽는다
    var U = a.useFav || { k: 'mid', n: '보통', why: [] }, CU = C.uf, eTag = EL_K[w.el] + '(' + EL_H[w.el] + ')';
    var ufLines = U.why.map(function (x) {
      if (x.k === 'role') return x.role ? fillJ(CU.role[x.role] || '', { e: eTag }) : '';
      if (x.k === 'zone') return !x.zone ? '' : x.used ? fillJ(CU.zoneUsed[x.v > 0 ? 'up' : x.v < 0 ? 'down' : 'flat'], { z: x.zone, g: GNV[w.group], h: CU.help[x.help ? 0 : 1] }) : fillJ(CU.zoneNote, { z: x.zone });
      if (x.k === 'badpair') return fillJ(CU.badpair, { p: x.name || '' });
      return CU[x.k] || '';
    }).filter(Boolean);
    var ufB = '<p class="wp-s"><b class="wp-u u-' + U.k + '">활용 ' + E(U.n) + '</b></p>' + li(ufLines) + '<p class="wp-note">발현 강도와 따로 판정해요. 강하게 켜져도 활용이 불리할 수 있고, 잠잠해도 유리한 힘일 수 있어요.</p>';
    // 활용 전략: 강도 × 유리도 + 강화할 능력 · 조절할 기능 + 활용 결·분야·전략 문장
    var hiK = a.kind === 'boost' ? 'hi' : a.kind === 'assist' ? 'mid' : 'lo', ufK = /good/.test(U.k) ? 'good' : U.k === 'mid' ? 'mid' : 'bad';
    var grow = ufK !== 'bad' ? fillJ(C.grow.self, { a: ability + (P ? ' + 짝 능력 ' + P.name + '(' + P.ways.join('·') + ')' : '') }) : (U.yong != null && U.yongGroup != null ? fillJ(C.grow.alt, { y: EL_K[U.yong] + '(' + EL_H[U.yong] + ')', f: GNV[U.yongGroup] + '의 ' + C.fn[U.yongGroup] + ' 기능' }) : fillJ(C.grow.self, { a: ability }));
    var badP = a.partner && a.partner.tone === 'bad' ? d.pair[pk(w.group, a.partner.group)] : null;
    var adjust = (ufK === 'bad' || (a.limits || []).some(function (x) { return x.k === 'over'; })) ? '조절할 기능: ' + C.over[w.group] : badP && badP.tension ? '조절할 기능: ' + badP.tension : C.adjustNone;
    var use = [grow, adjust,
      '활용 결: ' + C.profile[a.use.group] + ' — 운 천간 ' + a.use.tg + '(' + a.use.groupName + ')',
      '집중 분야: ' + C.fields[a.use.group],
    ];
    var pol = (C.polar || {})[a.use.tg], plan = (pol ? a.use.tg + '의 결이라 ' + pol + '이 맞아요. ' : '') + C.plan[w.group][a.use.group] + ' ' + (ufK === 'bad' && C.paceBad ? C.paceBad[a.kind] : C.pace[a.kind]);
    // 지원 · 제약 — 근거가 있을 때만
    var sups = (a.supports || []).map(function (x) { return x.x; });
    if (st.role && /용신|희신/.test(st.role)) sups.push('운 천간 ' + st.ch + '(' + EL_K[st.el] + ')은 이 명식에서 ' + st.role + '이라 쓰는 힘에 도움이 돼요');
    var lims = (a.limits || []).map(function (x) { return x.x; });   // 과잉 기능 설명은 ⑤ '조절할 기능'에 한 번만
    // 운의 흐름 등급 — 기존 흐름 등급 그대로 + 글자별 역할(이분화하지 않음)
    var f = r.favor, fk = f ? f.k : 'ok', roleTxt = function (x) { return x.role ? x.role + '(' + (C.roleWord[x.role] || '') + ')' : '역할 표시 없음'; };
    var fav = '<p class="wp-s"><span class="wp-f ' + (f ? f.k : '') + '">' + E((d.windLong || {})[fk] || '바람') + '</span> ' + E(((f && f.metric) || '흐름') + ' ' + (f ? f.n : '—')) + ' — 기존 운세 흐름 등급을 바람으로만 읽어요(칼날·활용 유리도와 합치지 않아요).</p>' +
      li(['천간 ' + st.ch + ' — ' + EL_K[st.el] + ' · ' + st.tg + ' · ' + roleTxt(st), '지지 ' + br.ch + ' — 정기 ' + br.main + '(' + EL_K[br.mainEl] + ') · ' + br.tg + ' · ' + roleTxt(br)]) +
      '<p class="wp-act">' + E(r.mText ? r.mText + ' ' : '') + E((C.act[a.kind] || C.act.keep)[fk] || '') + '</p>';
    // 상담자용: 명리 용어 그대로 ②~⑧ (2026-11-26 쉬운 풀이는 사용자 요청으로 되돌림). 첫 문장 아래 8판 '타고난 주무기 ↔ 이 시기 핵심 역량'
    // 2026-11-26 압축: 배지 한 줄 → 핵심 두 문장 → 근거 태그 네 줄(발현·활용·시기 역량·쓰는 법) → '자세히'에 기존 ②~⑧
    var tags = function (arr, cls) { return arr.filter(Boolean).map(function (t) { return '<span class="wp-tg ' + (cls || '') + '">' + E(t) + '</span>'; }).join(''); };
    var cut = function (t) { return String(t).split(' — ')[0]; };
    var plusT = (a.supports || []).map(function (x) { return x.k === 'stem' ? '천간 투출' : x.k === 'root' ? '지지 통근(' + (a.rootDepth || '') + ')' : x.k === 'gen' ? '생조 ' + EL_K[(w.el + 4) % 5] : x.k === 'out' ? '설기 ' + EL_K[(w.el + 1) % 5] : x.k === 'partner' ? '짝 ' + ((a.partner && a.partner.name) || '') : x.k === 'struct' ? '격국 역할' : cut(x.x); });
    var minusT = (a.limits || []).map(function (x) { return x.k === 'ctrl' ? '극 ' + (st.ch || '') : x.k === 'over' ? '과잉' : x.k === 'badpair' ? '부담 짝 ' + ((a.partner && a.partner.name) || '') : cut(x.x); });
    var ufT = [U.role || '', (U.why || []).some(function (x) { return x.k === 'release'; }) ? '설기 열림' : '', (U.why || []).some(function (x) { return x.k === 'jehwa'; }) ? '제화' : '', (U.why || []).some(function (x) { return x.k === 'overheat'; }) ? '과열' : '', (U.why || []).some(function (x) { return x.k === 'badpair'; }) ? '부담 조합' : ''];
    var cp = r.core && r.core.pick, CK = { natalRoot: '원국 정기 통근', natalRootS: '원국 통근', natalStem: '원국 천간 동기', selfRoot: '운 내 통근', pure: '간여지동형', hap: '합국', link: '생 연결', stemBlock: '합거·충(−)', branchClash: '지지 충(−)' };
    var coreT = cp ? [EL_K[cp.el] + '(' + cp.groupName + ') ' + cp.pts + '점 · ' + cp.relK].concat(cp.why.map(function (x) { return CK[x.k] || ''; })) : ['뚜렷하지 않음 — 타고난 주무기 중심'];
    var adjS = adjust !== C.adjustNone ? adjust.replace(/^조절할 기능: /, '') : '';
    var rowsH = '<dl class="wp-dlx">' +
      '<dt>칼날</dt><dd>' + tags(plusT, 'p') + tags(minusT, 'm') + (!plusT.length && !minusT.length ? '<span class="wp-note">주무기에 직접 닿는 작용 없음</span>' : '') + '</dd>' +
      '<dt>활용</dt><dd>' + tags(ufT, 'u') + '</dd>' +
      '<dt>시기 역량</dt><dd>' + tags(coreT, cp ? 'c' : '') + '</dd>' +
      '<dt>쓰는 법</dt><dd>' + E(grow) + (adjS ? '<br><span class="wp-note">조절: ' + E(adjS) + '</span>' : '') + '</dd></dl>';
    var badge = function (t, cls) { return '<span class="wp-bd ' + cls + '">' + E(t) + '</span>'; };
    // 2026-11-27 구간 성격: 흐름 등급 = 바람(환경), 발현 강도 = 칼날(주무기가 먹히는 정도). 두 값은 그대로 두고 조합 이름만(유료 상세풀이 '바람과 칼날'과 같은 규칙)
    var shp = /strong|on|shaky/.test(a.level), QN = quad(a, fk);
    if (shp && (U.k === 'adj' || U.k === 'bad')) QN[1] += ' · 활용 ' + U.n + (((U.n.charCodeAt(U.n.length - 1) - 0xAC00) % 28) ? '이라' : '라') + ' 과용 주의';
    rowsH = rowsH.replace('<dl class="wp-dlx">', '<dl class="wp-dlx"><dt>구간</dt><dd><b>' + E(QN[0]) + '</b> <span class="wp-note">' + E(QN[1]) + '</span></dd>');
    return '<div class="wp-det wp-e' + w.el + '" id="' + id + '" data-wpr="' + row + '"><h4>' + E(title + ' ' + r.gz) + '</h4>' +
      '<p class="wp-bdr">' + badge('바람 ' + ((d.wind || {})[fk] || '—') + (f ? '(' + ((f.metric) || '흐름') + ' ' + f.n + ')' : ''), 'f-' + fk) + badge('칼날 ' + a.levelK, 'k-' + a.kind) + badge('활용 ' + U.n, 'u-' + U.k) + (cp ? badge('시기 역량 ' + EL_K[cp.el] + '·' + cp.relK, 'c') : '') + badge(QN[0], 'q') + '</p>' +
      '<p class="wp-core"><b>' + E(head) + '</b> ' + E(C.mix[hiK][ufK]) + '</p>' + rowsH +
      '<details class="wp-more"><summary class="wp-note">자세히 (칼날=발현 강도·활용 유리도·작용 근거·시기 역량·바람=흐름 등급)</summary>' +
      coreBlock(r, L, E, tW, ch, G.Manse || null, false) +
      sec('②', '발현 강도', kindB) +
      sec('③', '활용 유리도', ufB) +
      sec('④', '작용 근거', li(ev)) +
      sec('⑤', '활용 전략', '<p class="wp-mix">' + E(C.mix[hiK][ufK]) + '</p>' + li(use) + '<p class="wp-plan">' + E(plan) + '</p>') +
      (sups.length ? sec('⑥', '발현 지원 요인', li(sups)) : '') +
      (lims.length ? sec('⑦', '제약 요인', li(lims)) : '') +
      sec(lims.length ? '⑧' : sups.length ? '⑦' : '⑥', '바람 — 운의 흐름(순풍·역풍)', fav) + '</details></div>';
  }
  // 8판: 타고난 주무기 ↔ 이 시기 핵심 역량(weapon.js periodCore 결과만 읽음)
  function coreBlock(r, L, E, tW, ch, M, short) {
    var d = D(), K = d.core, C = d.card, c = r && r.core; if (!K || !c || !L || !L.length) return '';
    var w = L[0], dEl = M.stemEl(ch.pillars.day.s), GNs = ['비겁', '식상', '재성', '관성', '인성'], FN = (C && C.fn) || GNs;
    var nm = function (x) { return EL_K[x.el] + '(' + EL_H[x.el] + ', ' + GNs[x.group] + ')'; }, wn = EL_K[w.el] + '(' + EL_H[w.el] + ') ' + d.el[w.el].title;
    var pk2 = c.pick, chips = '<div class="wp-tri"><div class="wp-tc"><span class="wp-lb">' + E(K.natal) + '</span><b>' + E(wn) + '</b><span class="wp-note">' + E(K.natalNote) + '</span></div><span class="wp-arr">↔</span>' +
      '<div class="wp-tc m"><span class="wp-lb">' + E(K.period) + (pk2 ? ' · <b class="wp-rel r-' + pk2.rel + '">' + E(pk2.relK) + '</b>' : '') + '</span><b>' + E(pk2 ? nm(pk2) : '뚜렷하지 않음') + '</b>' + (pk2 ? '<span class="wp-note">' + E(FN[pk2.group]) + '</span>' : '') + '</div></div>';
    if (!pk2) return '<div class="wp-cb wp-core2">' + (short ? '' : '<p class="wp-ct">' + E(K.title) + '</p>') + chips + '<p class="wp-s">' + E(K.none) + '</p></div>';
    var fx = function (t, m) { return fixJ5(String(t || '').replace(/\{(\w+)\}/g, function (_, k) { return m[k] == null ? '' : m[k]; })); };
    var relT = fx(K.rel[pk2.relRaw], { X: nm(pk2), xf: FN[pk2.group] });
    var whyL = pk2.why.slice().sort(function (a, b) { return b.v - a.v; }).map(function (x) { return fx(K.why[x.k], { at: (x.at || []).join('·'), name: x.name || '', names: (x.names || []).join('·') }); });
    var roleT = pk2.role ? fx(K.role[pk2.role], { X: nm(pk2) }) : '';
    var plan = C && C.plan ? C.plan[w.group][pk2.group] : '';
    return '<div class="wp-cb wp-core2">' + (short ? '' : '<p class="wp-ct">' + E(K.title) + '</p>') + chips + '<p class="wp-s"><b>' + E(relT) + '</b></p>' +
      '<p class="wp-note">' + E(fx(K.scoreNote, { p: pk2.pts })) + '</p><ul class="wp-ev">' + whyL.map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + (roleT ? '<li>' + E(roleT) + '</li>' : '') + (c.also ? '<li>' + E(fx(K.also, { X: nm(c.also) })) + '</li>' : '') + '</ul>' +
      (plan ? '<p class="wp-mix">' + E(K.planT) + ' — ' + E(plan) + '</p>' : '') + '</div>';
  }
  function cell(r, top, sub, isNow, id, row) {
    if (!r) return '';
    var E = esc0, a = r.best, f = r.favor;
    return '<button type="button" class="wp-c wp-e' + (a ? a.el : 0) + (isNow ? ' wp-now' : '') + '" data-wpd="' + id + '" data-wpr="' + row + '"><span class="t">' + E(top) + '</span><span class="g">' + E(r.gz) + '</span>' +
      (a ? '<span class="wp-a ' + a.key + '">' + E(a.levelK) + '</span>' : '<span class="wp-a qt">—</span>') + (sub ? '<span class="t">' + E(sub) + '</span>' : '') + '</button>';
  }
  function luck(M, ch, opt) {
    var A = get(M, ch); if (!A) return ''; var o = opts(opt), E = o.E, d = D(), Wm = W(); opt = opt || {};
    var L = list(A);
    var part = opt && opt.part || 'all';   // 'summary'(지금의 운 아래 요약) · 'daeun'·'seun'·'wolun'(각 그래프 카드 아래) · 'all'(예전 한 장)
    if (!L.length && part !== 'all' && part !== 'summary') return '';
    if (!L.length) return '<section class="card wp" id="weapon-luck" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>주무기 발현 타이밍</h2></div><p class="wp-head">' + E(headOf(A)) + '</p>' + extraNotes(ch, A, o, 'luck') + '<p class="wp-note">주무기로 서 있는 힘이 없어 운별 발현 타이밍은 그리지 않았어요. 위 흐름 그래프의 바람(순풍·역풍)만 참고하면 돼요.</p></section>';
    var now = opt.now || Date.now(), curY = opt.curY, wolY = opt.wolY || curY;
    // 2026-11-27 세운 범위: part 'seun' 은 opt.seunFrom~(seunYears) — 기본 지난 10년 + 앞으로 10년, 대운을 고르면 그 대운 10년(index.html 이 넘김)
    var sFrom = part === 'seun' && opt.seunFrom ? opt.seunFrom : curY, sYears = part === 'seun' && opt.seunYears ? opt.seunYears : 10;
    var tl = Wm.timeline(M, ch, { fromY: sFrom, years: sYears, wolY: wolY }); if (!tl) return '';
    // 그래프 지표(재물·직업·연애 등)를 고르면 띠·풀이를 그 지표에 맞춘다. 건강·사고수는 주무기와 잇지 않아 전체 흐름 그대로
    var mk = opt.metric && opt.metric !== 'flow' ? opt.metric : null, mName = opt.metricName || '', careM = mk === 'health' || mk === 'accident', mApplied = false;
    if (mk && !careM && typeof opt.favorOf === 'function') {
      var grp = d.metricGroup[mk] || 'general', LN = d.metricLens[grp], fillM = function (t) { return String(t || '').replace(/\{m\}/g, mName); };
      var cls = function (a) { return /strong|on|shaky/.test(a.level) ? 'on' : /sup|quiet/.test(a.level) ? 'prep' : 'guard'; };
      var apply = function (arr, src, kind) { arr.forEach(function (r, i) { if (!r || !r.best || !src[i]) return; var f = null; try { f = opt.favorOf(src[i], kind); } catch (e) { f = null; } if (!f) return; mApplied = true; r.favor = { k: f.k, n: f.n, metric: mName }; if (Wm.readPair) r.read = Wm.readPair(r.best, r.favor); r.mText = fillM(LN[cls(r.best)]) + ' ' + fillM(d.metricFavor[f.k]); }); };
      apply(tl.daeun, ch.daeun.list, 'daeun'); apply(tl.seun, M.seunRange(ch, sFrom, sFrom + sYears - 1) || [], 'seun'); apply(tl.wolun, M.wolun(ch, wolY) || [], 'wolun');
    }
    var bandName = mApplied ? mName + ' 등급' : '흐름 등급', mNote = careM ? '<p class="wp-note">' + E(d.metricCare) + '</p>' : '';
    var du = ch.daeun.list, curDi = -1; du.forEach(function (x, i) { if (x.startMs <= now) curDi = i; });
    var curWi = -1; tl.wolun.forEach(function (r, i) { if (r && r.startMs <= now) curWi = i; }); if (wolY !== curY) curWi = -1;
    var names = L.slice(0, 2).map(function (w) { return EL_H[w.el] + ' ' + D().el[w.el].title; }).join(' · ');
    var legend = '<p class="wp-note">바탕·바람 = 운 흐름(초록 순풍 · 회색 보통 · 주황 역풍) · 선 = 그 바람 속 주무기 칼날(얼마나 예리해지고 먹히는지) · 방식 = 칼날을 쓰는 결 · 구간 = 바람×칼날(전성·발휘·돌파·순항·정비). 칸을 누르면 풀이가 열려요.</p>';
    var dLab = du.map(function (x) { return x.startAge + '세'; }), sLab = tl.seun.map(function (r) { return String(r.year); }), wLab = tl.wolun.map(function (r) { return r.month + '월'; });
    // 대운 그래프: 전성기 1~3위(바람 = 이 탭 흐름 등급, 칼날 = 1순위 주무기 발현도)
    // 2026-11-28 유료 상세풀이 '내 인생의 전성기는 언제?'와 같은 계산: 같은 사주 데이터(SajuData) + 같은 고르기(PeakReading) + 같은 칼날 표(MantraWeapon.daeunBlades). 바람 = 인생 흐름 점수
    var pk = [], RV = G.ReportV2, same = false;
    if (RV && RV.SajuData && RV.PeakReading && Wm.daeunBlades) { try { var sdP = RV.SajuData.build(ch, { now: now }), bl = Wm.daeunBlades(M, ch), res = bl ? RV.PeakReading.build(sdP, '', { blades: bl }) : null, dt = res && res.readingVisualData && res.readingVisualData.peakRule === 'blade' ? res.readingVisualData.peakDetail : null;
      if (dt) { same = true; pk = dt.map(function (o) { var i = du.findIndex(function (x) { return x.startYear === o.y; }); return i < 0 ? null : { i: i, q: o.q, name: o.kind, n: o.n, tier: o.tier, levelK: o.levelK }; }).filter(Boolean); } } catch (e) { pk = []; same = false; } }
    if (!same) pk = peakRank(tl.daeun, du, now);
    var pkMarks = {}; pk.forEach(function (x, n) { pkMarks[x.i] = { rank: n + 1, q: x.q, name: x.name }; });
    var pkLine = pk.length ? '<p class="wp-note wp-pkl"><b>전성기 순위</b> ' + (same ? '(유료 상세풀이 전성기 장과 같은 계산 · 바람 = 인생 흐름 점수 · 칼날 = 1순위 주무기 ' + EL_H[L[0].el] + ' 발현도' + (L.length > 1 ? ', 위 선은 두 무기 중 더 켜지는 쪽' : '') + ') ' : '(바람 = 운 흐름 등급 · 칼날 = 주무기 발현도) ') + pk.map(function (x, n) { var dx = du[x.i]; return '<span class="wp-pkn">' + (n + 1) + '</span> ' + E(dx.startAge + '세 ' + M.gzName(dx) + '(' + dx.startYear + '~) ' + (same ? '바람 ' + x.n + '점 ' + x.tier + ' · 칼날 ' + x.levelK + ' → ' : '') + x.name); }).join(' · ') + '</p>' : '';
    var block = function (row, rows, labs, subs, nowIdx, secT) {
      return '<p class="wp-sec">' + E(secT) + '</p>' + chart(rows, labs, nowIdx, row === 'd' ? pkMarks : null) + (row === 'd' ? pkLine : '') + '<div class="wp-row">' + rows.map(function (r, i) { return cell(r, labs[i], subs[i], i === nowIdx, 'wpd-' + row + '-' + i, row); }).join('') + '</div>' +
        rows.map(function (r, i) { return r ? detail('wpd-' + row + '-' + i, row, r, labs[i], E, L, ch) : ''; }).join('');
    };
    // 그래프 카드 아래에 붙는 한 단위(대운·세운·월운) — 같은 판정, 같은 칸·상세 카드
    var short = '<p class="wp-note">바탕·바람 = 운 흐름(초록 순풍 · 회색 보통 · 주황 역풍, 위 그래프 등급과 같음) · 선 = 그 바람 속 주무기 칼날 · 방식 = 칼날을 쓰는 결 · 구간 = 바람×칼날(전성·발휘·돌파·순항·정비). 칸을 누르면 풀이가 열려요.</p>' + mNote;
    var PART = { daeun: ['d', tl.daeun, dLab, du.map(function (x) { return x.startYear + '~'; }), curDi, '대운별'], seun: ['s', tl.seun, sLab, tl.seun.map(function (r) { return r.age ? r.age + '세' : ''; }), tl.seun.findIndex(function (r) { return r.year === curY; }), opt.seunTitle || (sFrom + '~' + (sFrom + sYears - 1) + '년')], wolun: ['w', tl.wolun, wLab, tl.wolun.map(function (r) { return r.termName; }), curWi, wolY + '년 달별'] };
    var pickRow = part === 'seun' ? '<div class="wp-dpk"><span class="wp-note">대운 고르기</span><button type="button" class="wp-dp' + (opt.seunDaeun == null ? ' on' : '') + '" data-pick="seun:' + curY + '">지난 10년 + 앞 10년</button>' + du.map(function (x, i) { return '<button type="button" class="wp-dp' + (opt.seunDaeun === i ? ' on' : '') + (i === curDi ? ' wp-dnow' : '') + '" data-pick="daeun:' + i + '">' + E(x.startAge + '세 ' + M.gzName(x)) + '</button>'; }).join('') + '</div>' : '';
    if (PART[part]) { var p = PART[part]; return '<div class="wp wp-part wp-e' + L[0].el + '" id="weapon-luck-' + part + '" data-wp="' + E(sigOf(A)) + '" style="margin:10px 0 14px;padding:10px 0;border-top:1px dashed var(--line);border-bottom:1px dashed var(--line)"><h3 style="margin:0;font-size:.95rem">주무기 발현도 · ' + E(p[5]) + ' <span class="wp-note" style="font-weight:400">' + E(names) + '</span></h3>' + short + pickRow + block(p[0], p[1], p[2], p[3], p[4], '').replace('<p class="wp-sec"></p>', '') + '</div>'; }
    // 8판: 지금 대운·올해의 시기별 핵심 역량(타고난 주무기와 함께)
    var curS = tl.seun.filter(function (r) { return r && r.year === curY; })[0] || null, KK = d.core || {};
    var coreLine = function (when, r) { var c = r.core && r.core.pick, Lw = L[0]; if (!c) return '<li><span class="when">' + E(when) + '</span> — 시기 역량 뚜렷하지 않음 · 타고난 주무기 중심</li>'; var rel = (KK.rel || {})[c.relRaw] || ''; return '<li><span class="when">' + E(when) + '</span> — 시기 역량 <b>' + E(EL_K[c.el] + '(' + c.groupName + ')') + '</b> ' + c.pts + '점 · <b>' + E(c.relK) + '</b><br>' + E(fixJ5(rel.replace(/\{X\}/g, EL_K[c.el] + '(' + c.groupName + ')').replace(/\{xf\}/g, ((d.card && d.card.fn) || [])[c.group] || '')).split('. ')[0] + '.') + '</li>'; };
    var coreNow = KK.title ? '<p class="wp-sec">' + E(KK.title) + '</p><p class="wp-note">' + E(KK.sumLead) + '</p>' + '<ul class="wp-dl">' + (tl.daeun[curDi] ? coreLine('지금 대운 ' + tl.daeun[curDi].gz, tl.daeun[curDi]) : '') + (curS ? coreLine('올해 ' + curS.year + '년 ' + curS.gz, curS) : '') + '</ul>' : '';
    var cur = tl.daeun[curDi] || null, picks = tl.seun.filter(function (r) { return r && r.best && /strong|on|shaky/.test(r.best.level); }).slice(0, 3);
    var line = function (when, r) { var fk2 = r.favor ? r.favor.k : 'ok'; return '<li><span class="when">' + E(when) + '</span> — 바람 <b>' + E((d.wind || {})[fk2] || '—') + '</b> · 칼날 <b>' + E(r.best.levelK) + '</b> → ' + E(quad(r.best, fk2)[0]) + '<br>' + E(r.mText || (d.card && r.best.kind ? (d.card.act[r.best.kind] || {})[r.favor ? r.favor.k : 'ok'] : d.combo[r.read])) + '</li>'; };
    var lines = (cur ? [line('지금 대운 ' + cur.gz, cur)] : []).concat(picks.map(function (r) { return line(r.year + '년 ' + r.gz, r); }));
    if (part === 'summary') return '<section class="card wp" id="weapon-luck" data-wp="' + E(sigOf(A)) + '"><div class="card-h"><h2>주무기 발현 타이밍</h2><span class="note">' + E(names) + '</span></div>' +
      '<p class="wp-note">' + E(d.twoAxes) + (A.status === 'undetermined' ? ' 태어난 시간을 몰라 세 기둥 기준 후보로 봤어요.' : A.status === 'complex' ? ' 복합형이라 후보 중 가장 잘 켜지는 쪽을 보여 줘요.' : '') + ' 대운·세운·월운 그래프 카드마다 맨 아래에 그 단위의 주무기 줄이 있어요.</p>' + legend + coreNow +
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

  var api = { peakRank: peakRank, wonguk: wonguk, ohaeng: ohaeng, apt: apt, luck: luck, injectCss: injectCss, CSS: CSS, sigOf: sigOf };
  G.MantraWeaponView = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
