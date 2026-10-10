/* 관리자 "세계관" 탭 — 운명 세계 지도의 세계(이름·설명·색·배경·입장 연출·무료/유료·연결 챕터·순서·활성화)를 코드 없이 편집한다.
   저장 위치: /api/worlds (GLOSSARY_KV 'worlds:config'). 저장본이 없으면 코드 기본값(R.Explore.DEFAULT_WORLDS)이 쓰인다.
   챕터 ID 를 직접 연결하면 그 세계는 기본 규칙 대신 연결한 챕터만 가진다. 어느 세계에도 안 맞는 챕터는 막(幕) 기준 대체 세계로 가므로 사라지지 않는다.
   미리보기는 테스트 사주로 실제 문서를 만들어 세계별 챕터 수를 보여 준다(계산 값은 읽기만 한다). */
(function () {
  'use strict';
  var R = window.ReportV2, X = R.Explore, C = window.V2Content, esc = C.esc, toast = C.toast;
  var W = { list: [], saved: false, dirty: false, busy: false, prev: null };
  var $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var KEY = 'mt_v2_world_ts', TS = { date: '1992-06-23', time: '01:30', gender: 'M' };
  try { Object.assign(TS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var FIELDS = ['id', 'name', 'line', 'desc', 'notice', 'enabled', 'order', 'access', 'color', 'accent', 'bgImage', 'bgVideo', 'introImage', 'introVideo', 'chapters'];
  var hex = function (v, d) { return /^#[0-9a-fA-F]{6}$/.test(v || '') ? v : d; };
  var dirty = function () { W.dirty = true; var b = $('#wdSave'); if (b) { b.disabled = false; b.textContent = '저장'; } var s = $('#wdState'); if (s) s.textContent = '저장하지 않은 변경이 있습니다'; };
  (window.AdminDirty = window.AdminDirty || {})['세계관'] = function () { return W.dirty; };

  function load(box) {
    box.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>';
    C.api('/api/worlds').then(function (d) {
      W.saved = !!(d.worlds && d.worlds.length); W.list = X.mergeWorlds(d.worlds || []).map(function (w) { return Object.assign({ line: '', desc: '', notice: '', bgImage: '', bgVideo: '', introImage: '', introVideo: '', color: '', accent: '', chapters: [] }, w); });
      W.dirty = false; draw(box);
    }).catch(function (e) { box.innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  }

  function mediaRow(i, k, label, kind) {
    var w = W.list[i], u = w[k] || '';
    var pv = u ? (kind === 'video' ? '<video src="' + esc(u) + '" muted playsinline preload="metadata" controls style="display:block;max-width:220px;margin:6px 0;border-radius:8px;background:#000"></video>' : '<img src="' + esc(u) + '" alt="" style="display:block;max-width:220px;max-height:120px;margin:6px 0;border-radius:8px">') : '';
    return '<div class="fx"><span>' + label + '</span>' + pv + '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input type="text" data-f="' + k + '" data-i="' + i + '" value="' + esc(u) + '" placeholder="/api/clipfile?k=… 또는 https:// 주소" style="flex:1;min-width:200px">' +
      '<input type="file" data-up="' + k + '" data-i="' + i + '" accept="' + (kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/avif') + '"><button type="button" data-clr="' + k + '" data-i="' + i + '"' + (u ? '' : ' disabled') + '>빼기</button></div>' +
      '<small class="muted" data-msg="' + k + i + '"></small></div>';
  }

  function card(w, i, n) {
    var c = hex(w.color, '#1B2347'), a = hex(w.accent, '#D5B97F');
    return '<div class="card wd" data-w="' + i + '" style="border-left:4px solid ' + c + '"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">' +
      '<b style="color:var(--gold)">' + (i + 1) + '. ' + esc(w.name || '(이름 없음)') + '</b><span class="muted mono">' + esc(w.id) + '</span>' +
      '<label class="muted" style="margin-left:auto;display:flex;gap:6px;align-items:center"><input type="checkbox" data-f="enabled" data-i="' + i + '"' + (w.enabled !== false ? ' checked' : '') + '> 사용</label>' +
      '<button type="button" data-mv="-1" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="위로">▲</button><button type="button" data-mv="1" data-i="' + i + '"' + (i === n - 1 ? ' disabled' : '') + ' aria-label="아래로">▼</button></div>' +
      (w.enabled === false ? '<p class="muted" style="margin:6px 0">사용하지 않는 세계입니다. 이 세계에 속한 챕터는 세계 지도에서 보이지 않습니다(전체 읽기 흐름에는 남아 있음).</p>' : '') +
      '<div class="fx2"><label class="fx"><span>이름</span><input type="text" data-f="name" data-i="' + i + '" value="' + esc(w.name) + '" maxlength="40"></label>' +
      '<label class="fx"><span>한 줄 소개</span><input type="text" data-f="line" data-i="' + i + '" value="' + esc(w.line) + '" maxlength="80"></label></div>' +
      '<label class="fx"><span>설명</span><textarea data-f="desc" data-i="' + i + '" rows="2" maxlength="300">' + esc(w.desc) + '</textarea></label>' +
      '<label class="fx"><span>안내 문구(예: 창작 콘텐츠 표시) — 세계 화면 위쪽에 표시. 비워도 기본 문구가 있으면 기본 문구가 쓰입니다</span><input type="text" data-f="notice" data-i="' + i + '" value="' + esc(w.notice) + '" maxlength="120"></label>' +
      '<div class="row" style="gap:14px;flex-wrap:wrap;align-items:flex-end"><label class="fx"><span>배경색</span><input type="color" data-f="color" data-i="' + i + '" value="' + c + '"></label>' +
      '<label class="fx"><span>강조색</span><input type="color" data-f="accent" data-i="' + i + '" value="' + a + '"></label>' +
      '<label class="fx"><span>이용 권한</span><select data-f="access" data-i="' + i + '"><option value="free"' + (w.access !== 'paid' ? ' selected' : '') + '>무료</option><option value="paid"' + (w.access === 'paid' ? ' selected' : '') + '>유료 표시</option></select></label></div>' +
      '<p class="muted" style="font-size:.76rem;margin:2px 0 6px">유료 표시는 지도에 "유료" 배지만 붙입니다. 결제·서버 권한 검증은 아직 연결되지 않았습니다.</p>' +
      mediaRow(i, 'bgImage', '배경 이미지', 'image') + mediaRow(i, 'introImage', '입장 연출 이미지 (영상이 없을 때 사용)', 'image') + mediaRow(i, 'introVideo', '입장 연출 영상 (3~5초 권장, 소리 없음)', 'video') +
      '<label class="fx"><span>연결 챕터 ID (쉼표로 구분 · 비우면 기본 규칙 사용)</span><textarea data-f="chapters" data-i="' + i + '" rows="2" class="mono" placeholder="예: c19, c20, life_actions">' + esc((w.chapters || []).join(', ')) + '</textarea></label>' +
      '<p class="muted" style="font-size:.76rem;margin:0">기본 규칙: ' + (w.match && w.match.length ? '<span class="mono">' + esc(w.match.join('  ')) + '</span>' : '없음(직접 연결만)') + '</p></div>';
  }

  function previewHtml() {
    if (!W.prev) return '<p class="muted">테스트 사주로 세계별 챕터 수를 확인합니다. "미리보기 만들기"를 누르세요.</p>';
    if (W.prev.err) return '<p class="err">' + esc(W.prev.err) + '</p>';
    return '<div style="display:grid;gap:8px">' + W.prev.model.map(function (g) {
      var w = g.world, c = hex(w.color, '#1B2347'), a = hex(w.accent, '#D5B97F');
      return '<div style="padding:12px;border-radius:12px;border:1px solid ' + a + '55;background:linear-gradient(135deg,' + c + ',#0b0e1a)"><b>' + esc(w.icon || '') + ' ' + esc(w.name) + '</b>' +
        (w.access === 'paid' ? ' <span style="background:#5B3A8C;color:#fff;border-radius:4px;padding:1px 6px;font-size:.7rem">유료</span>' : '') +
        '<div class="muted" style="font-size:.82rem">' + esc(w.line) + ' · 챕터 ' + g.total + '개</div><div class="muted" style="font-size:.74rem;margin-top:4px">' + g.items.map(function (x) { return esc(x.title); }).join(' · ') + '</div></div>';
    }).join('') + '</div>' + (W.prev.hidden ? '<p class="muted" style="margin-top:8px">사용하지 않는 세계에 속한 챕터 ' + W.prev.hidden + '개는 지도에 나오지 않습니다.</p>' : '');
  }

  function draw(box) {
    var n = W.list.length;
    box.innerHTML = '<div class="card"><b style="color:var(--gold)">세계관 (운명 세계 지도)</b><p class="muted" style="margin:6px 0 10px">사용자가 일주 각성 뒤에 도착하는 세계 지도의 세계들입니다. 이름·색·순서·배경·입장 연출·연결 챕터를 바꿀 수 있고, 저장하면 새로 여는 무빙툰부터 반영됩니다. 기존 챕터는 지워지지 않고 세계에 연결만 바뀝니다.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button type="button" id="wdSave" class="gold"' + (W.dirty ? '' : ' disabled') + '>저장</button><button type="button" id="wdAdd"' + (n >= 12 ? ' disabled' : '') + '>세계 추가</button><button type="button" id="wdReset"' + (W.saved ? '' : ' disabled') + '>기본값으로 되돌리기</button><span class="muted" id="wdState">' + (W.saved ? '저장된 설정을 쓰는 중' : '코드 기본값을 쓰는 중') + '</span></div></div>' +
      W.list.map(function (w, i) { return card(w, i, n); }).join('') +
      '<div class="card"><b style="color:var(--gold)">미리보기</b><div class="pvh" style="margin:8px 0"><label>생년월일<input type="date" id="wdD" value="' + esc(TS.date) + '"></label><label>시각<input type="time" id="wdT" value="' + esc(TS.time) + '"></label><label>성별<select id="wdG"><option value="M"' + (TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label><button type="button" id="wdPrev">미리보기 만들기</button></div><div id="wdPv">' + previewHtml() + '</div><p class="muted" style="font-size:.76rem;margin-top:8px">저장 전 변경도 이 미리보기에는 반영됩니다. 세계가 비어 있으면 사용자 지도에서 숨겨집니다.</p></div>';
    bind(box);
  }

  function bind(box) {
    $$('[data-f]', box).forEach(function (el) {
      var h = function () {
        var w = W.list[+el.dataset.i], k = el.dataset.f;
        if (k === 'enabled') { w.enabled = el.checked; draw(box); dirty(); return; }
        if (k === 'chapters') w.chapters = el.value.split(/[\s,]+/).filter(function (x) { return /^[\w-]{1,60}$/.test(x); });
        else w[k] = el.value;
        dirty();
      };
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'color' || el.type === 'checkbox' ? 'change' : 'input', h);
      if (el.dataset.f === 'name') el.addEventListener('change', function () { draw(box); });
    });
    $$('[data-mv]', box).forEach(function (b) { b.onclick = function () { var i = +b.dataset.i, j = i + +b.dataset.mv; if (j < 0 || j >= W.list.length) return; var t = W.list[i]; W.list[i] = W.list[j]; W.list[j] = t; draw(box); dirty(); }; });
    $$('[data-clr]', box).forEach(function (b) { b.onclick = function () { W.list[+b.dataset.i][b.dataset.clr] = ''; draw(box); dirty(); }; });
    $$('[data-up]', box).forEach(function (inp) { inp.onchange = function () { if (inp.files[0]) upload(box, +inp.dataset.i, inp.dataset.up, inp.files[0]); }; });
    $('#wdSave', box).onclick = function () { save(box); };
    $('#wdAdd', box).onclick = function () {
      var n = 1; while (W.list.some(function (w) { return w.id === 'w' + n; })) n++;
      W.list.push({ id: 'w' + n, name: '새 세계', line: '', desc: '', notice: '', enabled: true, order: W.list.length + 1, access: 'free', color: '#1B2347', accent: '#D5B97F', bgImage: '', bgVideo: '', introImage: '', introVideo: '', chapters: [], match: [], icon: '✦' });
      draw(box); dirty();
    };
    $('#wdReset', box).onclick = function () {
      if (!confirm('저장된 세계관 설정을 지우고 코드 기본값(6개 세계)으로 되돌립니다. 업로드한 이미지·영상 파일은 삭제되지 않습니다. 계속할까요?')) return;
      C.api('/api/worlds', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worlds: [] }) }).then(function () { toast('기본값으로 되돌렸습니다'); load(box); }).catch(function (e) { toast(e.message, true); });
    };
    $('#wdPrev', box).onclick = function () {
      TS.date = $('#wdD', box).value; TS.time = $('#wdT', box).value; TS.gender = $('#wdG', box).value; try { localStorage.setItem(KEY, JSON.stringify(TS)); } catch (e) { }
      var pv = $('#wdPv', box); pv.innerHTML = '<p class="muted">만드는 중…</p>';
      C.engine().then(function (M) {
        var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = Date.now();
        var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' });
        var sd = R.SajuData.build(ch, { now: now }), ol = R.LifeDoc.outline({ M: M, ch: ch, sd: sd, now: now, name: '', interest: '', soc: R.StoryDirector.social(M, ch, sd, now), plan: null });
        var chapters = ol.map(function (o) { return { id: o.id, base: o.id, title: o.title }; });
        var worlds = X.mergeWorlds(W.list.map(strip)), all = X.worldsModel(chapters, worlds.map(function (w) { return Object.assign({}, w, { enabled: true }); }), {}, -1);
        var offIds = worlds.filter(function (w) { return w.enabled === false; }).map(function (w) { return w.id; });
        var model = all.filter(function (g) { return offIds.indexOf(g.world.id) < 0; }), hidden = all.filter(function (g) { return offIds.indexOf(g.world.id) >= 0; }).reduce(function (s, g) { return s + g.total; }, 0);
        W.prev = { model: model, hidden: hidden }; pv.innerHTML = previewHtml();
      }).catch(function (e) { W.prev = { err: e.message || String(e) }; pv.innerHTML = previewHtml(); });
    };
  }

  function strip(w) { var o = {}; FIELDS.forEach(function (k) { if (w[k] !== undefined) o[k] = w[k]; }); return o; }
  function save(box) {
    if (W.busy) return; var ids = {}, bad = '';
    W.list.forEach(function (w, i) { w.order = i + 1; if (!w.name.trim()) bad = (i + 1) + '번째 세계의 이름이 비어 있습니다'; if (ids[w.id]) bad = '세계 ID 가 겹칩니다: ' + w.id; ids[w.id] = 1; });
    if (bad) { toast(bad, true); return; }
    if (!W.list.some(function (w) { return w.enabled !== false; }) && !confirm('사용 중인 세계가 하나도 없으면 사용자 지도가 비어 보입니다(전체 읽기 흐름은 그대로). 저장할까요?')) return;
    W.busy = true;
    C.api('/api/worlds', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worlds: W.list.map(strip) }) })
      .then(function () { W.busy = false; W.dirty = false; W.saved = true; toast('세계관을 저장했습니다'); load(box); })
      .catch(function (e) { W.busy = false; toast(e.message, true); });
  }
  function upload(box, i, k, file) {
    if (W.busy) return; var m = $('[data-msg="' + k + i + '"]', box); W.busy = true; if (m) m.textContent = '올리는 중… (' + Math.round(file.size / 1048576 * 10) / 10 + 'MB)';
    C.api('/api/clipfile?name=' + encodeURIComponent('world-' + W.list[i].id + '-' + k + '-' + file.name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file })
      .then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); W.list[i][k] = '/api/clipfile?k=' + r.key; W.busy = false; draw(box); dirty(); })
      .catch(function (e) { W.busy = false; if (m) m.textContent = '실패: ' + e.message; toast(e.message, true); });
  }

  window.V2World = { open: function () { var box = document.getElementById('t-v2world'); if (box) load(box); } };
})();
