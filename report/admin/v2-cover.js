/* 온보딩 커버 글자 편집 툴바: 미리보기에서 글자를 누르면(또는 아래 버튼을 고르면) 그 글자의 내용·글꼴·크기·굵기·색·자간·줄간격·정렬·위치·효과를 한 곳에서 고친다.
   값은 settings.cover 에 저장되고(PC/모바일 구분이 있는 항목은 미리보기 기기에 맞춰 자동 선택), 미리보기에서 글자를 끌면 위치가 바로 반영된다. */
(function () {
  'use strict';
  var SF = window.StoryFonts, H = null, sel = null, $ = function (s, e) { return (e || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var NAMES = { title: '브랜드명', sub: '서브 카피', button: '버튼', brand: '위쪽 이름' };
  var DEF = { title: { size: 17, weight: '400', color: '#E9E4D8', spacing: 4, line: 1.45, font: 'serif', inDelay: 0.2 }, sub: { size: 14, weight: '400', color: '#7C786C', spacing: 0.6, line: 1.8, font: 'sans', inDelay: 0.5 }, button: { size: 15, weight: '400', color: '#CDB27A', spacing: 4.5, line: 1.4, font: 'sans', inDelay: 0.8 } };
  var WEIGHTS = [['300', '가늘게'], ['400', '보통'], ['500', '약간 굵게'], ['600', '굵게'], ['700', '아주 굵게'], ['900', '가장 굵게']];

  function css() {
    var s = document.createElement('style');
    s.textContent = '#cvBox{margin:0 0 8px}.cvpick{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px}.cvpick button{border-radius:999px;padding:5px 12px;font-size:.82rem}.cvpick button.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
      '.cvp{border:1px solid var(--line);border-radius:10px;background:var(--bg);padding:10px 12px;max-height:46vh;overflow:auto}.cvp .g{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}.cvp .f{display:grid;gap:3px;font-size:.78rem;color:var(--ink2);margin:6px 0}.cvp .f.w{grid-column:1/-1}.cvp textarea{min-height:64px}' +
      '.cvp .r{display:flex;gap:6px;align-items:center}.cvp .r input[type=range]{flex:1;padding:0}.cvp .r input[type=number]{width:74px}.cvp .seg{display:flex;gap:4px}.cvp .seg button{flex:1;padding:5px 0;font-size:.8rem}.cvp .seg button.on{border-color:var(--gold);color:var(--gold)}' +
      '.cvp h4{margin:10px 0 2px;font-size:.78rem;color:var(--gold);letter-spacing:.1em}.cvp .dv{font-size:.74rem;color:var(--ink3);margin:0 0 4px}.cvp input[type=color]{width:38px;height:30px;padding:0;border:1px solid var(--line);background:none}';
    document.head.appendChild(s);
  }
  function mount() {
    if ($('#cvBox')) return; var form = document.getElementById('hmForm'); if (!form) return;
    var box = document.createElement('div'); box.id = 'cvBox';
    box.innerHTML = '<div class="cvpick"><span class="muted" style="font-size:.78rem">글자 편집</span>' + Object.keys(NAMES).map(function (k) { return '<button type="button" data-n="' + k + '">' + NAMES[k] + '</button>'; }).join('') + '</div><div id="cvPanel" class="cvp" hidden></div>';
    form.parentNode.insertBefore(box, form); css();
    box.querySelector('.cvpick').onclick = function (e) { var b = e.target.closest('[data-n]'); if (b) select(sel === b.dataset.n ? null : b.dataset.n, true); };
  }
  var cover = function () { var st = H.story; st.settings = st.settings || {}; st.settings.cover = st.settings.cover || {}; return st.settings.cover; };
  var mob = function () { return H.mode === 'mo'; };
  var plain = function (v) { return v && typeof v === 'object' ? (v.A != null ? v.A : '') : (v == null ? '' : v); }; // A/B 문구면 A 문구를 편집
  function put(k, v) { var cv = cover(); if (v === '' || v == null || (typeof v === 'number' && !isFinite(v))) delete cv[k]; else cv[k] = v; H.changed(); }
  function putText(n, v) { // 문구: A/B 객체면 A 만 바꾼다
    var cv = cover(), cur = cv[n]; if (cur && typeof cur === 'object') cur.A = v; else cv[n] = v; H.changed();
  }

  function select(n, fromBtn) {
    sel = n; mount(); if (!$('#cvBox')) return;
    $('#cvBox').querySelectorAll('[data-n]').forEach(function (b) { b.classList.toggle('on', b.dataset.n === n); });
    if (fromBtn && n && n !== 'brand') H.send({ t: 'st-tsel-set', n: n });
    render();
  }
  function num(id, label, key, o) { // 슬라이더+숫자
    var cv = cover(), k = key + (o.m && mob() ? 'M' : ''), cur = cv[k] != null && cv[k] !== '' ? cv[k] : (o.m && mob() && cv[key] != null ? cv[key] : o.def);
    return '<div class="f' + (o.w ? ' w' : '') + '"><label>' + label + '</label><div class="r"><input type="range" data-k="' + k + '" min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + cur + '"><input type="number" data-k="' + k + '" min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + cur + '"></div></div>';
  }
  function selectEl(label, k, opts, def, w) { var cv = cover(), cur = cv[k] != null && cv[k] !== '' ? cv[k] : def; return '<div class="f' + (w ? ' w' : '') + '"><label>' + label + '</label><select data-k="' + k + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>'; }

  function render() {
    var p = $('#cvPanel'); if (!p) return; if (!sel) { p.hidden = true; p.innerHTML = ''; return; } p.hidden = false;
    var cv = cover(), n = sel, M = mob();
    if (n === 'brand') {
      p.innerHTML = '<div class="dv">페이지 맨 위 가운데에 항상 보이는 이름입니다. Enter 로 줄바꿈할 수 있어요.</div><div class="f w"><label>위쪽 이름</label><textarea data-bn>' + esc((H.story.settings || {}).brandName || '') + '</textarea></div>';
      p.querySelector('[data-bn]').oninput = function (e) { H.story.settings = H.story.settings || {}; H.story.settings.brandName = e.target.value; H.changed(); }; return;
    }
    var d = DEF[n], fonts = SF.list, al = cv[n + 'Align' + (M ? 'M' : '')] || (M ? cv[n + 'Align'] : '') || 'center';
    var h = '<div class="dv">미리보기에서 글자를 <b>끌어서</b> 위치를 옮길 수 있어요 · 지금은 <b>' + (M ? '모바일' : 'PC') + '</b> 화면 값을 고치는 중 (크기·정렬·위치만 기기별, 나머지는 공통)</div>';
    h += '<div class="f w"><label>' + NAMES[n] + ' 내용 (Enter 로 줄바꿈 · *강조*)</label>' + (n === 'button' ? '<input type="text" data-tx value="' + esc(plain(cv[n])) + '">' : '<textarea data-tx>' + esc(plain(cv[n])) + '</textarea>') + '</div>';
    h += '<h4>글자 모양</h4><div class="g">' + selectEl('글꼴', n + 'Font', fonts, d.font, true) + selectEl('굵기', n + 'Weight', WEIGHTS, d.weight) +
      '<div class="f"><label>색</label><div class="r"><input type="color" data-c="' + n + 'Color" value="' + esc(/^#[0-9a-f]{6}$/i.test(cv[n + 'Color'] || '') ? cv[n + 'Color'] : d.color) + '"><input type="text" data-k="' + n + 'Color" value="' + esc(cv[n + 'Color'] || '') + '" placeholder="' + d.color + '"></div></div></div>' +
      '<div class="g">' + num('s', '크기 (px)', n + 'Size', { min: 8, max: n === 'title' ? 120 : 80, step: 1, def: d.size, m: true }) + num('sp', '자간 (px)', n + 'Spacing', { min: -3, max: 30, step: 0.5, def: d.spacing }) + (n !== 'button' ? num('ln', '줄 간격 (배)', n + 'Line', { min: 0.9, max: 2.6, step: 0.05, def: d.line }) : '') + '</div>';
    h += '<h4>위치</h4><div class="f"><label>정렬</label><div class="seg" data-al>' + [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']].map(function (a) { return '<button type="button" data-a="' + a[0] + '" class="' + (al === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="g">' + num('x', '가로 이동 (화면 %, 음수=왼쪽)', n + 'X', { min: -60, max: 60, step: 0.5, def: 0, m: true }) + num('y', '세로 이동 (화면 %, 음수=위)', n + 'Y', { min: -60, max: 60, step: 0.5, def: 0, m: true }) + '</div>';
    h += '<h4>효과</h4><div class="g">' + selectEl('등장 효과 (처음 나타날 때)', n + 'In', SF.IN, '') + num('is', '등장 속도 (초)', n + 'InSpeed', { min: 0.2, max: 4, step: 0.1, def: 0.9 }) + num('id', '등장 지연 (초)', n + 'InDelay', { min: 0, max: 6, step: 0.1, def: d.inDelay }) +
      (n !== 'button' ? selectEl('계속 움직이는 효과', n + 'Anim', SF.LOOP, '') + num('as', '움직임 주기 (초 · 클수록 느림)', 'textAnimSpeed', { min: 1, max: 20, step: 0.5, def: 6 }) : '') + '</div>';
    h += '<div class="r" style="margin-top:10px"><button type="button" data-reset>이 글자 설정 되돌리기</button></div>';
    p.innerHTML = h; bind(p, n);
  }
  function bind(p, n) {
    var tx = p.querySelector('[data-tx]'); tx.oninput = function (e) { putText(n, e.target.value); };
    p.oninput = p.onchange = function (e) {
      var t = e.target, k = t.getAttribute && t.getAttribute('data-k'), c = t.getAttribute && t.getAttribute('data-c');
      if (c) { put(c, t.value); var ti = p.querySelector('input[type=text][data-k="' + c + '"]'); if (ti) ti.value = t.value; return; }
      if (!k) return; var v = t.type === 'number' || t.type === 'range' ? (t.value === '' ? '' : +t.value) : t.value;
      put(k, v); p.querySelectorAll('[data-k="' + k + '"]').forEach(function (o) { if (o !== t && (o.type === 'number' || o.type === 'range')) o.value = t.value; });
    };
    p.onclick = function (e) {
      var a = e.target.closest('[data-a]'); if (a) { put(n + 'Align' + (mob() ? 'M' : ''), a.dataset.a); p.querySelectorAll('[data-a]').forEach(function (b) { b.classList.toggle('on', b === a); }); return; }
      if (e.target.closest('[data-reset]')) { var cv = cover(); Object.keys(cv).forEach(function (k) { if (k.indexOf(n) === 0 && k !== n) delete cv[k]; }); H.changed(); render(); }
    };
  }

  window.CoverBar = { select: function (n) { sel = n; mount(); select(n, false); }, refresh: function () { if (sel) render(); }, mount: function () { H = window.AdminHM; mount(); } };
  window.addEventListener('load', function () { H = window.AdminHM; mount(); });
})();
