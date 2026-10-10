/* 관리자 "서비스 점검" — 테스트 사주로 무빙툰 문서를 만들어 풀이 누락 의심·단정 표현·에셋 누락·세계 매핑을 한 화면에서 본다.
   계산값과 문장의 불일치·문장 중복은 "정합성 검사" 탭이 맡는다. 이 화면은 AI 를 호출하지 않고, 아무것도 저장·수정하지 않는다(읽기 전용).
   에셋 현황은 /api/asset-art(관리자 인증), 세계 정의는 /api/worlds 를 읽는다. */
(function () {
  'use strict';
  var R = window.ReportV2, Q = R.Quality, C = window.V2Content, esc = C.esc;
  var KEY = 'mt_v2_quality_ts', TS = { date: '1994-07-24', time: '12:00', gender: 'F', interest: '' };
  try { Object.assign(TS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var $ = function (s, e) { return (e || document).querySelector(s); };
  var LAST = null, GROUP_KO = { car: '차', career: '직업', spouse: '배우자 인상', past: '전생', place: '장소', style: '스타일', wealth: '재물', children: '자녀' };

  function badge(n, okText) { return n ? '<span class="chip" style="background:#4A1F1F;color:#FFB4A8">' + n + '건</span>' : '<span class="chip" style="background:#16301F;color:#9BE0B0">' + (okText || '이상 없음') + '</span>'; }
  function section(title, count, body, okText) { return '<div class="card"><b style="color:var(--gold)">' + title + '</b> ' + badge(count, okText) + '<div style="margin-top:8px">' + body + '</div></div>'; }
  function list(items, fn) { return items.length ? '<ul style="margin:0;padding-left:18px;display:grid;gap:4px;font-size:.84rem">' + items.map(function (x) { return '<li>' + fn(x) + '</li>'; }).join('') + '</ul>' : ''; }

  function render(box, st) {
    var a = st.audit, h = '';
    h += '<div class="card"><b style="color:var(--gold)">서비스 점검</b><p class="muted" style="margin:6px 0 10px">테스트 사주로 실제 무빙툰 문서를 만들어 아래 네 가지를 점검합니다. 읽기 전용이며 아무것도 바꾸지 않습니다. 계산값과 문장의 불일치·문장 중복은 <b>정합성 검사</b> 탭에서 보세요.</p>' +
      '<div class="pvh"><label>생년월일<input type="date" id="qaD" value="' + esc(TS.date) + '"></label><label>시각<input type="time" id="qaT" value="' + esc(TS.time) + '"></label><label>성별<select id="qaG"><option value="M"' + (TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label>관심 분야<select id="qaI">' + R.StoryDirector.INTERESTS.map(function (i) { return '<option value="' + i.id + '"' + (TS.interest === i.id ? ' selected' : '') + '>' + esc(i.name) + '</option>'; }).join('') + '</select></label><button type="button" id="qaGo" class="gold">점검 실행</button></div></div>';
    if (st.err) return h + '<div class="card"><p class="err">' + esc(st.err) + '</p></div>';
    if (!a) return h + '<div class="card"><p class="muted">"점검 실행"을 누르면 결과가 나옵니다.</p></div>';
    var s = a.summary;
    h += '<div class="card"><b>요약</b> · 챕터 ' + a.chapters + '개 · 풀이 누락 의심 ' + s.missing + ' · 단정 표현 검토 ' + s.absolute + ' · 에셋 누락 ' + (s.assetMissing == null ? '확인 못함' : s.assetMissing) + ' · 세계 매핑 대체 ' + (s.worldFallback == null ? '-' : s.worldFallback) + ' · 빈 세계 ' + (s.worldEmpty == null ? '-' : s.worldEmpty) + '</div>';
    h += section('풀이 누락 의심 (글자 수 ' + Q.MIN_LEN + '자 미만)', a.missing.length, list(a.missing, function (x) { return '<b>' + esc(x.title || x.id) + '</b> <span class="muted mono">' + esc(x.id) + ' · ' + x.len + '자</span>'; }));
    h += section('단정 표현 검토', a.absolute.length, list(a.absolute, function (x) { return '<b>' + esc(x.title || x.id) + '</b> — “' + esc(x.snippet) + '” <span class="muted">(' + esc(x.word) + ')</span>'; }) +
      (a.absolute.length ? '<p class="muted" style="font-size:.76rem;margin-top:6px">"~하지 않습니다" 같은 부정문·면책 문구도 걸릴 수 있습니다. 맥락을 보고 판단하세요.</p>' : ''));
    if (a.assets) {
      var g = Object.keys(a.assets.groups).map(function (k) { var x = a.assets.groups[k]; return '<tr><td>' + esc(GROUP_KO[k] || k) + '</td><td>' + x.image + ' / ' + x.total + '</td><td>' + x.video + '</td></tr>'; }).join('');
      h += section('에셋 누락 (이미지 ' + a.assets.image + ' / ' + a.assets.total + ' · 영상 ' + a.assets.video + ')', a.assets.missing.length,
        '<table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-bottom:8px"><thead><tr><th style="text-align:left">그룹</th><th style="text-align:left">이미지</th><th style="text-align:left">영상</th></tr></thead><tbody>' + g + '</tbody></table>' +
        list(a.assets.missing.slice(0, 60), function (x) { return esc(x.title) + ' <span class="muted mono">' + esc(x.id) + '</span>'; }) + (a.assets.missing.length > 60 ? '<p class="muted">외 ' + (a.assets.missing.length - 60) + '건</p>' : ''));
    } else h += '<div class="card"><b style="color:var(--gold)">에셋 누락</b> <span class="chip">확인 못함</span><p class="muted">' + esc(st.assetErr || '에셋 현황을 불러오지 못했습니다.') + '</p></div>';
    if (a.worlds) {
      h += section('세계 매핑', a.worlds.fallback.length + a.worlds.empty.length,
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + a.worlds.list.map(function (w) { return '<span class="chip"' + (w.enabled ? '' : ' style="opacity:.5"') + '>' + esc(w.name) + ' · 챕터 ' + w.count + (w.enabled ? '' : ' (사용 안 함)') + '</span>'; }).join('') + '</div>' +
        (a.worlds.fallback.length ? '<p class="muted">규칙에 맞지 않아 막(幕) 기준 대체 세계로 들어간 챕터 — 세계관 탭에서 연결 챕터에 직접 추가하세요.</p>' + list(a.worlds.fallback, function (x) { return esc(x.title) + ' <span class="muted mono">' + esc(x.id) + ' → ' + esc(x.world) + '</span>'; }) : '') +
        (a.worlds.empty.length ? '<p class="muted">챕터가 없어 지도에서 숨겨지는 세계: ' + a.worlds.empty.map(function (w) { return esc(w.name); }).join(', ') + '</p>' : '') +
        (a.worlds.hidden ? '<p class="muted">사용하지 않는 세계에 속해 지도에서 보이지 않는 챕터 ' + a.worlds.hidden + '개</p>' : ''));
    }
    return h + '<div class="card"><button type="button" id="qaMd">결과를 마크다운으로 내려받기</button></div>';
  }

  function md(a) {
    var L = ['# 서비스 점검 결과', '', '- 챕터 ' + a.chapters + '개 · 풀이 누락 의심 ' + a.summary.missing + ' · 단정 표현 검토 ' + a.summary.absolute + ' · 에셋 누락 ' + a.summary.assetMissing + ' · 세계 매핑 대체 ' + a.summary.worldFallback, ''];
    L.push('## 풀이 누락 의심'); a.missing.forEach(function (x) { L.push('- ' + (x.title || x.id) + ' (' + x.id + ', ' + x.len + '자)'); }); if (!a.missing.length) L.push('- 없음');
    L.push('', '## 단정 표현 검토'); a.absolute.forEach(function (x) { L.push('- ' + (x.title || x.id) + ': “' + x.snippet + '” (' + x.word + ')'); }); if (!a.absolute.length) L.push('- 없음');
    if (a.assets) { L.push('', '## 에셋 누락 (' + a.assets.image + '/' + a.assets.total + ')'); a.assets.missing.forEach(function (x) { L.push('- ' + x.title + ' (' + x.id + ')'); }); if (!a.assets.missing.length) L.push('- 없음'); }
    if (a.worlds) { L.push('', '## 세계 매핑'); a.worlds.list.forEach(function (w) { L.push('- ' + w.name + ': ' + w.count + '개' + (w.enabled ? '' : ' (사용 안 함)')); }); a.worlds.fallback.forEach(function (x) { L.push('- 대체 세계: ' + x.title + ' (' + x.id + ' → ' + x.world + ')'); }); }
    return L.join('\n');
  }

  function bind(box, st, M) {
    var go = $('#qaGo', box); if (go) go.onclick = function () {
      TS.date = $('#qaD', box).value; TS.time = $('#qaT', box).value; TS.gender = $('#qaG', box).value; TS.interest = $('#qaI', box).value; try { localStorage.setItem(KEY, JSON.stringify(TS)); } catch (e) { }
      st.err = ''; st.audit = null; go.disabled = true; go.textContent = '점검 중…';
      run(M, st).then(function () { draw(box, st, M); });
    };
    var mdb = $('#qaMd', box); if (mdb) mdb.onclick = function () {
      var blob = new Blob([md(st.audit)], { type: 'text/markdown;charset=utf-8' }), u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = 'service-quality.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    };
  }
  function draw(box, st, M) { box.innerHTML = render(box, st); bind(box, st, M); }

  function run(M, st) {
    var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = Date.now();
    return Promise.all([
      C.api('/api/asset-art').then(function (r) { return r.slots || []; }).catch(function (e) { st.assetErr = e.message; return null; }),
      C.api('/api/worlds').then(function (r) { return r.worlds || []; }).catch(function () { return []; }),
    ]).then(function (got) {
      try {
        var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' });
        var sd = R.SajuData.build(ch, { now: now }), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null), rep = R.Compose.build(sd, lib, cfg, { name: '테스트' });
        var doc = R.LifeDoc.build({ M: M, ch: ch, sd: sd, now: now, name: '테스트', interest: TS.interest, rep: rep, soc: R.StoryDirector.social(M, ch, sd, now), plan: (rep.chapters.find(function (c) { return c.plan; }) || {}).plan });
        var worlds = R.Explore ? R.Explore.mergeWorlds(got[1]) : null;
        st.audit = Q.audit({ doc: doc, worlds: worlds, slots: got[0] });
      } catch (e) { st.err = (e && e.message) || String(e); }
    });
  }

  window.V2Quality = { open: function () {
    var box = document.getElementById('t-v2quality'); if (!box) return; var st = { audit: null, err: '' };
    box.innerHTML = '<p class="muted">엔진을 불러오는 중…</p>';
    C.engine().then(function (M) { draw(box, st, M); }).catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; });
  } };
})();
