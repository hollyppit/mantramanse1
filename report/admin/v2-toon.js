/* 관리자 "패널 이미지" 탭 아래쪽 "세계 무빙툰 컷 이미지" — 사용자 화면의 "무빙툰으로 감상하기"(세계 카드)에서 챕터마다 보여 줄 이미지를 고른다.
   · 지정하지 않으면 챕터 본문에 이미 붙은 삽화(패널·풀이 화면 이미지)를 쓴다. 삽화가 없는 챕터(대운·세운·월운 같은 그래프 챕터 등)는 앞 컷 이미지를 이어 쓴다.
   · 여기서 올린 이미지는 그 챕터의 컷을 "대체"한다(최대 3장, 컷 순서대로). 지우면 원래대로 돌아간다.
   저장: /api/worlds 의 세계별 cutImages { 챕터id: [주소…] }. 파일은 /api/clipfile(R2). 새 명리 계산·문장 생성 없음. */
(function () {
  'use strict';
  var R = window.ReportV2, X = R.Explore, C = window.V2Content, esc = C.esc, toast = C.toast;
  var BOX = null, T = { worlds: null, saved: null, chap: null, busy: false, err: '' };
  var MAX = 3, KEY = 'mt_v2_toon_ts', TS = { date: '1992-06-23', time: '01:30', gender: 'M' };
  try { Object.assign(TS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var $ = function (s, e) { return (e || BOX).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || BOX).querySelectorAll(s)); };

  // 관심 분야마다 달라질 수 있는 목차의 합집합(세계관 탭과 같은 방식)
  function loadChapters() {
    if (T.chap) return Promise.resolve(T.chap);
    return C.engine().then(function (M) {
      var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = Date.now(), seen = {}, out = [];
      var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' });
      var sd = R.SajuData.build(ch, { now: now }), soc = R.StoryDirector.social(M, ch, sd, now), ints = [''];
      (R.StoryDirector.INTERESTS || []).forEach(function (x) { if (x && x.id) ints.push(x.id); });
      ints.forEach(function (it) {
        try { R.LifeDoc.outline({ M: M, ch: ch, sd: sd, now: now, name: '', interest: it, soc: soc, plan: null }).forEach(function (o) { if (o.id && !seen[o.id]) { seen[o.id] = 1; out.push({ id: o.id, base: o.id, title: o.title || o.id }); } }); } catch (e) { }
      });
      T.chap = out; return out;
    });
  }
  function load() {
    return C.api('/api/worlds').then(function (d) {
      T.saved = Array.isArray(d.worlds) ? d.worlds : [];
      T.worlds = X.mergeWorlds(T.saved).map(function (w) { return Object.assign({}, w, { enabled: true }); });
    }).then(loadChapters);
  }
  function cutsOf(wid) { var s = (T.saved || []).filter(function (w) { return w.id === wid; })[0]; return (s && s.cutImages) || {}; }

  function draw() {
    if (!BOX) return;
    if (T.err) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">세계 무빙툰 컷 이미지</b><p class="err">' + esc(T.err) + '</p></div>'; return; }
    if (!T.worlds || !T.chap) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="muted">세계 무빙툰 컷 이미지를 불러오는 중…</p></div>'; return; }
    var by = {}; T.chap.forEach(function (c) { var id = X.worldFor(c, T.worlds, 'life'); (by[id] = by[id] || []).push(c); });
    var total = 0; T.worlds.forEach(function (w) { total += Object.keys(cutsOf(w.id)).length; });
    var h = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">세계 무빙툰 컷 이미지 · 지정 ' + total + '개 챕터</b>' +
      '<p class="muted" style="margin:6px 0 10px">사용자 화면 세계 카드의 <b>"무빙툰으로 감상하기"</b>에서 챕터마다 앞 3컷에 쓰이는 이미지입니다. <b>지정하지 않으면</b> 챕터 본문에 붙은 삽화를 쓰고, 삽화가 없는 챕터는 앞 컷 이미지를 이어 씁니다. ' +
      '여기서 올린 이미지는 그 챕터의 컷을 <b>대체</b>합니다(최대 ' + MAX + '장, 컷 순서대로). 이미지는 세로형(2:3)을 권장합니다.</p>';
    T.worlds.forEach(function (w) {
      var list = by[w.id] || [], cuts = cutsOf(w.id), n = Object.keys(cuts).length;
      h += '<details' + (n ? ' open' : '') + ' style="margin:8px 0"><summary><b>' + esc((w.icon ? w.icon + ' ' : '') + (w.name || w.id)) + '</b> <span class="muted">챕터 ' + list.length + '개 · 지정 ' + n + '개</span></summary>';
      if (!list.length) h += '<p class="muted" style="margin:6px 0">이 세계에 연결된 챕터가 없습니다.</p>';
      list.forEach(function (c) {
        var imgs = cuts[c.id] || [];
        h += '<div class="tn-row" data-w="' + esc(w.id) + '" data-c="' + esc(c.id) + '" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--line)">' +
          '<div style="min-width:170px;flex:1"><b>' + esc(c.title) + '</b><br><span class="muted mono" style="font-size:.74rem">' + esc(c.id) + '</span></div>' +
          '<div class="tn-th" style="display:flex;gap:6px;align-items:center">' + imgs.map(function (u, i) {
            return '<span style="position:relative"><img src="' + esc(u) + '" alt="" style="width:48px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--line);display:block">' +
              '<button type="button" data-rm="' + i + '" title="빼기" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:10px;padding:0;line-height:1">✕</button></span>';
          }).join('') + (imgs.length ? '' : '<span class="muted" style="font-size:.8rem">본문 삽화 사용</span>') + '</div>' +
          '<label class="btn" style="cursor:pointer' + (imgs.length >= MAX ? ';opacity:.5;pointer-events:none' : '') + '">이미지 올리기<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden></label>' +
          '<small class="muted tn-msg"></small></div>';
      });
      h += '</details>';
    });
    BOX.innerHTML = h + '</div>';
    $$('.tn-row').forEach(function (row) {
      var wid = row.dataset.w, cid = row.dataset.c;
      var fi = $('input[type=file]', row); if (fi) fi.onchange = function () { if (fi.files[0]) upload(row, wid, cid, fi.files[0]); };
      $$('button[data-rm]', row).forEach(function (b) { b.onclick = function () { var cur = (cutsOf(wid)[cid] || []).slice(); cur.splice(+b.dataset.rm, 1); save(wid, cid, cur, row); }; });
    });
  }

  // 한 세계의 cutImages 를 저장한다: 서버 저장본에 그 세계가 없으면 코드 기본값에서 만든 값으로 넣고, 다른 세계는 그대로 둔다(PUT 은 전체 교체).
  function save(wid, cid, list, row) {
    if (T.busy) return; T.busy = true;
    var worlds = (T.saved || []).map(function (w) { return Object.assign({}, w); }), cur = worlds.filter(function (w) { return w.id === wid; })[0];
    if (!cur) { var base = T.worlds.filter(function (w) { return w.id === wid; })[0]; if (!base) { T.busy = false; return; }
      cur = {}; ['id', 'name', 'line', 'desc', 'notice', 'enabled', 'order', 'access', 'color', 'accent', 'bgImage', 'bgVideo', 'introImage', 'introVideo', 'chapters'].forEach(function (k) { if (base[k] !== undefined) cur[k] = base[k]; }); worlds.push(cur); }
    var ci = Object.assign({}, cur.cutImages || {}); if (list.length) ci[cid] = list.slice(0, MAX); else delete ci[cid];
    cur.cutImages = ci;
    var m = row && $('.tn-msg', row); if (m) m.textContent = '저장 중…';
    return C.api('/api/worlds', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worlds: worlds }) })
      .then(function (r) { T.saved = r.worlds || worlds; T.busy = false; draw(); toast('컷 이미지를 저장했습니다'); })
      .catch(function (e) { T.busy = false; if (m) m.textContent = ''; toast(e.message, true); });
  }
  function upload(row, wid, cid, file) {
    if (T.busy) return; var m = $('.tn-msg', row);
    if (file.size > 8 * 1048576) { toast('이미지가 너무 큽니다(8MB 이하)', true); return; }
    T.busy = true; if (m) m.textContent = '올리는 중… (' + Math.round(file.size / 104857.6) / 10 + 'MB)';
    C.api('/api/clipfile?name=' + encodeURIComponent('toon-' + wid + '-' + cid + '-' + file.name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file })
      .then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); T.busy = false; var cur = (cutsOf(wid)[cid] || []).concat(['/api/clipfile?k=' + r.key]); return save(wid, cid, cur, row); })
      .catch(function (e) { T.busy = false; if (m) m.textContent = '실패: ' + e.message; toast(e.message, true); });
  }

  window.V2Toon = { open: function (box) {
    if (!box) return; BOX = box; T.err = ''; draw();
    load().then(draw).catch(function (e) { T.err = (e && e.message) || String(e); draw(); });
  } };
})();
