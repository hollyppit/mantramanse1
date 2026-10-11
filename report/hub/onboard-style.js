// 온보딩 글자 스타일 적용·편집 도우미. 방문자 화면(hub-onboard.js · hub-quest.js)은 attr() 로 style 속성을 만들고, 관리자(v2-onboard.js · v2-quest.js)는 row()·readMap() 으로 입력칸을 만든다.
//   저장 모양과 검증은 onboard-data.js 의 cleanStyle(서버와 같은 규칙). 글씨체 목록·구글 폰트 지연 로딩은 report/story/fonts.js(StoryFonts)를 그대로 쓴다 — 고른 글꼴만 내려받는다.
//   크기: 비우면 기본 디자인(반응형). PC 값만 넣으면 모바일에도 같은 크기, "모바일" 값을 넣으면 720px 이하에서 그 값을 쓴다.
(function (root) {
  'use strict';
  var O = root.Onboard, SF = root.StoryFonts;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var S = {};
  // 모바일 크기: 인라인 style 의 --tsm 변수를 좁은 화면에서 font-size 로 쓴다
  if (root.document && !root.document.getElementById('obStyleCss')) { var st = root.document.createElement('style'); st.id = 'obStyleCss'; st.textContent = '@media (max-width:720px){[style*="--tsm"]{font-size:var(--tsm)!important}}'; (root.document.head || root.document.documentElement).appendChild(st); }
  var FALLBACK = { serif: 'var(--f-serif)', sans: 'var(--f-sans)' };
  function family(k) { return (SF && SF.css(k)) || FALLBACK[k] || ''; }

  // 스타일 → CSS 선언 문자열(없으면 ''). 고른 글꼴은 이때 한 번 불러온다.
  S.css = function (s) {
    s = O.cleanStyle(s); var p = [];
    if (s.color) p.push('color:' + s.color);
    if (s.font) { if (SF) SF.ensure(s.font); var f = family(s.font); if (f) p.push('font-family:' + f); }
    if (s.weight) p.push('font-weight:' + s.weight);
    if (s.size) p.push('font-size:' + s.size + 'px');
    if (s.sizeM) p.push('--tsm:' + s.sizeM + 'px');
    return p.join(';');
  };
  // 요소의 시작 태그에 붙이는 ' style="…"' (스타일이 없으면 '')
  S.attr = function (s) { var c = S.css(s); return c ? ' style="' + esc(c) + '"' : ''; };

  /* ── 관리자 편집 칸 ── */
  var FONT_LIST = function () { return [['', '(기본)']].concat(SF ? SF.list : [['serif', '명조'], ['sans', '고딕']]); };
  var opt = function (list, cur) { return list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur || '') ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); };
  // 한 문구의 스타일 편집 줄. role: 'title' 같은 역할 이름, val: 저장된 스타일
  S.row = function (role, label, val) {
    val = O.cleanStyle(val); var n = 'sty_' + role + '_', on = Object.keys(val).length;
    return '<details class="ob-sty"' + (on ? ' open' : '') + '><summary>글자 스타일 · ' + esc(label) + (on ? ' <b class="ob-sty-on">적용 중</b>' : '') + '</summary><div class="ob-sty-g" data-role="' + esc(role) + '">' +
      '<label>글씨체<select name="' + n + 'font">' + opt(FONT_LIST(), val.font) + '</select></label>' +
      '<label>굵기<select name="' + n + 'weight">' + opt([['', '(기본)'], ['300', '가늘게'], ['400', '보통'], ['500', '중간'], ['600', '조금 굵게'], ['700', '굵게'], ['900', '아주 굵게']], val.weight) + '</select></label>' +
      '<label>크기 PC (px)<input type="number" name="' + n + 'size" min="8" max="120" step="0.5" placeholder="기본" value="' + esc(val.size || '') + '"></label>' +
      '<label>크기 모바일 (px)<input type="number" name="' + n + 'sizeM" min="8" max="120" step="0.5" placeholder="PC와 같음" value="' + esc(val.sizeM || '') + '"></label>' +
      '<label class="ob-sty-c">색<span><input type="color" value="' + esc(val.color || '#ffffff') + '" data-cp><input type="text" name="' + n + 'color" maxlength="7" placeholder="기본" value="' + esc(val.color || '') + '"></span></label>' +
      '<button type="button" class="ghost" data-styreset>이 문구 스타일 초기화</button></div></details>';
  };
  // 폼 안의 모든 스타일 줄을 { 역할: 스타일 } 로 읽는다
  S.readMap = function (form, roles) {
    var out = {}; if (!form) return out;
    roles.forEach(function (r) { var g = function (k) { var e = form.elements['sty_' + r + '_' + k]; return e ? e.value : ''; }; var c = O.cleanStyle({ font: g('font'), weight: g('weight'), size: g('size'), sizeM: g('sizeM'), color: g('color') }); if (Object.keys(c).length) out[r] = c; });
    return out;
  };
  // 색 선택기 ↔ 입력칸 연결, 초기화 버튼. 값이 바뀌면 input 이벤트를 내보내 "저장 안 됨" 표시와 미리보기가 따라가게 한다.
  S.bind = function (form) {
    if (!form) return; var fire = function (el) { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { } };
    [].forEach.call(form.querySelectorAll('.ob-sty-g'), function (g) {
      var cp = g.querySelector('[data-cp]'), tx = g.querySelector('input[type=text]'), rs = g.querySelector('[data-styreset]');
      cp.oninput = function () { tx.value = cp.value; fire(tx); };
      tx.oninput = function () { if (/^#[0-9a-f]{6}$/i.test(tx.value.trim())) cp.value = tx.value.trim(); };
      rs.onclick = function () { [].forEach.call(g.querySelectorAll('select,input[type=number],input[type=text]'), function (e) { e.value = ''; }); fire(tx); };
    });
  };
  S.FONT_LIST = FONT_LIST;
  root.ObStyle = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
