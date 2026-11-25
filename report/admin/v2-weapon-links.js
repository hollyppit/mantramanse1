/* 관리자 — 주무기 상세풀이 질문(장)별 연결(2026-11-26). 운세 환경 탭(v2-luckenv.js) 안의 카드 하나.
   · 전체 공개 스위치: /api/luck-flags weaponChapters(기본 꺼짐)
   · 질문별 설정: /api/weapon-links (KV weapon:links) — 장 ID·주제(해석 템플릿)·사용할 데이터 11가지. 장·질문·상품·결제는 건드리지 않는다.
   · 미리보기: 생년월일을 넣으면 사용자 화면과 같은 모듈(report/v2/weapon-chapters.js)로 그 설정의 블록을 그려 보여 준다. 주무기가 없거나 미확정이면 생략·안내가 그대로 보인다.
   · 사용: V2WeaponLinks.mount(el, { pw, flags, putFlags, msg }) */
(function (G) {
  'use strict';
  var DEPS = ['/luck-grade.js?v=20261125-strict', '/weapon-data.js?v=20261126-hr', '/weapon.js?v=20261126-hr', '/report/v2/weapon-chapters-data.js?v=20261126-cr', '/report/v2/weapon-chapters.js?v=20261126-cr'];
  var TOPIC_K = { self: '종합풀이', wealth: '재물운', career: '커리어운', love: '인연운', remedy: '개운법' };
  var USE_KEYS = ['first', 'second', 'power', 'overlap', 'rootExp', 'tenGod', 'daeun', 'seun', 'wolun', 'activation', 'favor'];
  var USE_S = { first: '1순위', second: '2순위', power: '세력', overlap: '병존·간여지동', rootExp: '통근·투간', tenGod: '십성', daeun: '대운', seun: '세운', wolun: '월운', activation: '활성도', favor: '유리도' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var depsP = null;
  function loadDeps() {
    if (depsP) return depsP;
    return (depsP = DEPS.reduce(function (p, src) { return p.then(function () { return new Promise(function (ok) { var s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = ok; document.head.appendChild(s); }); }); }, Promise.resolve()));
  }
  var WC = function () { return G.ReportV2 && G.ReportV2.WeaponChapters; };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  function mount(el, o) {
    var st = { rows: null, version: 0, saved: null, dirty: false };
    var fl = o.flags || null;
    function rowsHtml() {
      var ids = Object.keys(st.rows);
      return '<div style="overflow-x:auto"><table class="tbl" style="font-size:.82rem;min-width:1040px"><thead><tr><th>장 ID</th><th>주제(해석 템플릿)</th><th>형태</th><th>범위</th><th>사용</th>' + USE_KEYS.map(function (k) { return '<th>' + esc(USE_S[k]) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        ids.map(function (id) {
          var r = st.rows[id];
          return '<tr data-id="' + esc(id) + '"><td><code>' + esc(id) + '</code></td><td><select data-k="topic">' + Object.keys(TOPIC_K).map(function (t) { return '<option value="' + t + '"' + (r.topic === t ? ' selected' : '') + '>' + TOPIC_K[t] + '</option>'; }).join('') + '</select></td>' +
            '<td><select data-k="view"><option value="block"' + (r.view !== 'graph' ? ' selected' : '') + '>풀이</option><option value="graph"' + (r.view === 'graph' ? ' selected' : '') + '>발현 그래프</option></select></td>' +
            '<td>' + (r.view === 'graph' ? '<select data-k="scope">' + [['daeun', '대운'], ['seun', '세운 10년'], ['wolun', '월운 12달']].map(function (x) { return '<option value="' + x[0] + '"' + (r.scope === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' : '<span class="muted">—</span>') + '</td>' +
            '<td><input type="checkbox" data-k="on"' + (r.on ? ' checked' : '') + '></td>' + USE_KEYS.map(function (k) { return '<td style="text-align:center"><input type="checkbox" data-u="' + k + '"' + (r.use[k] ? ' checked' : '') + '></td>'; }).join('') +
            '<td><button class="btn" data-del="1">빼기</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    function draw() {
      var on = fl && fl.weaponChapters;
      el.innerHTML = '<p style="margin:0 0 8px"><b>운명의 타임라인 주무기 상세풀이 연결</b> — 현재: <b style="color:' + (on ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : on ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="wlFlag"' + (fl ? '' : ' disabled') + '>' + (on ? '주무기 블록 끄기' : '주무기 블록 켜기') + '</button><a class="btn" href="/report/v2/?mantraFlags=weaponChapters" target="_blank" rel="noopener">미리보기 주소</a></div>' +
        '<p class="muted" style="margin:8px 0">만세력 “나의 주무기”와 같은 판정을 유료 장 끝에 주제별 블록으로 붙입니다. 장을 새로 만들지 않고, 질문·상품·결제는 그대로예요. 건강·사고수·전생 장은 고를 수 없어요. 활성도와 유리도는 따로 보여 주고 합치지 않아요.</p>' +
        (st.rows ? rowsHtml() : '<p class="muted">설정을 불러오는 중…</p>') +
        '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><input id="wlNewId" placeholder="timeline_wealth_06" style="width:200px"><select id="wlNewTopic">' + Object.keys(TOPIC_K).map(function (t) { return '<option value="' + t + '">' + TOPIC_K[t] + '</option>'; }).join('') + '</select><button class="btn" id="wlAdd">질문 추가</button>' +
        '<button class="btn" id="wlSave">저장</button><button class="btn" id="wlReset">기본값으로</button><span class="muted" id="wlInfo">' + (st.version ? '저장본 v' + st.version : '저장본 없음 — 코드 기본값 사용 중') + (st.dirty ? ' · 저장 안 한 변경 있음' : '') + '</span></div>' +
        '<div style="margin-top:12px;border-top:1px solid var(--line,#333);padding-top:10px"><b>미리보기</b> <span class="muted">— 생년월일로 각 질문 블록을 사용자 화면과 같은 모듈로 그려 봐요</span>' +
        '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px"><input id="wlY" value="1990" style="width:70px">년 <input id="wlM" value="5" style="width:46px">월 <input id="wlD" value="17" style="width:46px">일 <input id="wlH" value="9" style="width:46px" placeholder="모름=빈칸">시 <select id="wlG"><option value="F">여</option><option value="M">남</option></select><select id="wlPick"></select><button class="btn" id="wlPrev">미리보기</button></div>' +
        '<div id="wlOut" style="margin-top:8px;padding:10px;border:1px dashed var(--line,#444);border-radius:8px;line-height:1.7;font-size:.9rem"></div></div>';
      var $ = function (s) { return el.querySelector(s); };
      var pick = $('#wlPick'); if (pick && st.rows) pick.innerHTML = Object.keys(st.rows).map(function (id) { return '<option value="' + esc(id) + '">' + esc(id + ' · ' + TOPIC_K[st.rows[id].topic] + (st.rows[id].view === 'graph' ? ' · 그래프' : '')) + '</option>'; }).join('');
      $('#wlFlag').onclick = function () {
        var v = !(fl && fl.weaponChapters);
        if (v && !confirm('운명의 타임라인 유료 장에 주무기 블록을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
        o.putFlags({ flags: { weaponChapters: v } }, v ? '주무기 블록을 켰습니다(약 1분 안에 반영)' : '주무기 블록을 껐습니다(약 1분 안에 반영)');
      };
      el.querySelectorAll('tr[data-id]').forEach(function (tr) {
        var id = tr.getAttribute('data-id');
        tr.querySelector('[data-k="topic"]').onchange = function (e) { st.rows[id].topic = e.target.value; st.dirty = true; draw(); };
        tr.querySelector('[data-k="view"]').onchange = function (e) { var r = st.rows[id]; if (e.target.value === 'graph') { r.view = 'graph'; r.scope = r.scope || 'seun'; r.use.activation = true; } else { delete r.view; delete r.scope; } st.dirty = true; draw(); };
        var sc = tr.querySelector('[data-k="scope"]'); if (sc) sc.onchange = function (e) { st.rows[id].scope = e.target.value; st.dirty = true; draw(); };
        tr.querySelector('[data-k="on"]').onchange = function (e) { st.rows[id].on = e.target.checked; st.dirty = true; draw(); };
        tr.querySelectorAll('[data-u]').forEach(function (c) { c.onchange = function (e) { st.rows[id].use[c.getAttribute('data-u')] = e.target.checked; st.dirty = true; draw(); }; });
        tr.querySelector('[data-del]').onclick = function () { delete st.rows[id]; st.dirty = true; draw(); };
      });
      $('#wlAdd').onclick = function () {
        var id = ($('#wlNewId').value || '').trim(), w = WC();
        if (!/^timeline_[a-z]+_[\w]{1,24}$/.test(id)) return o.msg('장 ID 형식이 아닙니다(예: timeline_wealth_06)', true);
        if (w && w.BLOCKED.test(id)) return o.msg('건강·사고수·전생 장에는 주무기를 연결하지 않습니다', true);
        var t = $('#wlNewTopic').value, base = w ? clone(w.DEFAULT_ROWS[Object.keys(w.DEFAULT_ROWS).filter(function (k) { return w.DEFAULT_ROWS[k].topic === t; })[0]].use) : {};
        st.rows[id] = { on: true, topic: t, use: base }; st.dirty = true; draw();
      };
      $('#wlReset').onclick = function () { var w = WC(); if (!w) return; st.rows = clone(w.DEFAULT_ROWS); st.dirty = true; draw(); };
      $('#wlSave').onclick = function () {
        var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
        fetch('/api/weapon-links', { method: 'PUT', headers: { authorization: 'Bearer ' + o.pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ rows: st.rows, expectVersion: st.version }) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
          .then(function (d) { if (!d._ok) return o.msg(d.error || '저장하지 못했습니다', true); st.version = d.version; st.rows = d.rows; st.dirty = false; draw(); o.msg('주무기 연결을 저장했습니다(약 1분 안에 반영)'); });
      };
      $('#wlPrev').onclick = function () {
        var w = WC(), M = G.Manse, out = $('#wlOut'); if (!w || !M) { out.textContent = '미리보기 모듈을 불러오지 못했어요'; return; }
        var hh = ($('#wlH').value || '').trim(), inp = { year: +$('#wlY').value, month: +$('#wlM').value, day: +$('#wlD').value, hour: hh === '' ? null : +hh, minute: 0, gender: $('#wlG').value, calendar: 'solar' };
        var ch; try { ch = M.compute(inp); } catch (e) { out.textContent = '명식을 계산하지 못했어요: ' + e.message; return; }
        var id = $('#wlPick').value, r = st.rows[id]; if (!r) { out.textContent = '미리 볼 질문을 고르세요'; return; }
        var h = w.previewRow ? w.previewRow({ M: M, ch: ch, now: Date.now(), name: '' }, r) : w.preview({ M: M, ch: ch, now: Date.now(), name: '' }, r.topic, r.use);
        out.innerHTML = '<p class="muted" style="margin:0 0 6px">' + esc(id + ' · ' + TOPIC_K[r.topic] + (r.on ? '' : ' · (꺼진 질문 — 사용자에겐 안 보임)')) + '</p>' + (h || '<p class="muted">이 명식은 주무기가 없거나 미확정이라 이 주제에서는 블록이 생략돼요.</p>');
      };
    }
    draw();
    loadDeps().then(function () {
      return fetch('/api/weapon-links', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }).then(function (d) {
      var w = WC(); st.version = d && d.version || 0;
      st.rows = d && d.rows && Object.keys(d.rows).length ? d.rows : (w ? clone(w.DEFAULT_ROWS) : {});
      draw();
    });
  }
  G.V2WeaponLinks = { mount: mount };
})(window);
