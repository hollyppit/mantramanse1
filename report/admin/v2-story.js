/* 관리자 "스토리 플로우" — 테스트 사주 + 관심 분야를 고르면 "이 사용자에게 실제로 어떤 순서로 무빙툰이 생성되는지"를 보여 준다.
   값은 전부 StoryDirector(엔진 값을 읽기만 함)에서 온다. 계산을 바꾸는 입력은 없다(순서·무료/잠금·근거 확인용).
   표시: ① 생성된 이야기 순서 ② 인생 지도(대운별 계절·분야 값) ③ 현재 위치와 근거 ④ 기존 챕터 → 질문 모듈 매핑 ⑤ 아직 없는 계산 모델(TODO) */
(function () {
  'use strict';
  var R = window.ReportV2, D = R.StoryDirector, C = window.V2Content, esc = C.esc;
  var KEY = 'mt_v2_story_ts', TS = { date: '1992-06-23', time: '01:30', gender: 'M', interest: 'money' };
  try { Object.assign(TS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var $ = function (s, e) { return (e || document).querySelector(s); };

  function table(head, rows) { return '<table style="width:100%;border-collapse:collapse;font-size:.84rem"><thead><tr>' + head.map(function (h) { return '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--gold);font-weight:500">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td style="padding:6px 8px;border-bottom:1px solid var(--line)">' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>'; }

  function draw(box, M) {
    var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = Date.now(), ch, sd, err = '';
    try { ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' }); sd = R.SajuData.build(ch, { now: now }); } catch (e) { err = (e && e.message) || '계산 실패'; }
    var form = '<div class="pvh" style="margin-bottom:12px"><label>생년월일<input type="date" id="stD" value="' + esc(TS.date) + '"></label><label>시각<input type="time" id="stT" value="' + esc(TS.time) + '"></label><label>성별<select id="stG"><option value="M"' + (TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label>관심 분야<select id="stI">' + D.INTERESTS.map(function (i) { return '<option value="' + i.id + '"' + (TS.interest === i.id ? ' selected' : '') + '>' + esc(i.name) + '</option>'; }).join('') + '</select></label><a class="btn" style="padding:8px 14px" target="_blank" id="stOpen">뷰어에서 보기 ↗</a></div>';
    var h = '<div class="card"><b style="color:var(--gold)">스토리 플로우 미리보기</b><p class="muted" style="margin:6px 0 12px">같은 사주라도 관심 분야(온보딩에서 고른 값)에 따라 <b>먼저 나오는 이야기</b>만 달라지고, 원국·대운·세운·점수는 그대로입니다. 뷰어 <code>/report/v2/</code> 가 이 흐름이 기본입니다(예전 20챕터 순서는 <code>?flow=classic</code>, 결제 잠금 시험은 <code>&amp;gate=1</code>).</p>' + form;
    if (err) { box.innerHTML = h + '<p class="muted">' + esc(err) + '</p></div>'; bind(box, M); return; }
    var it = D.INTERESTS.filter(function (x) { return x.id === TS.interest; })[0], pr = D.profile(M, ch, sd, { now: now, interest: TS.interest });
    var ol = R.LifeDoc.outline({ M: M, ch: ch, sd: sd, now: now, name: '', interest: TS.interest, soc: D.social(M, ch, sd, now), plan: null });
    h += '<div class="cap2">GENERATED SCROLL DOCUMENT · 관심 분야 ' + esc(it.name) + ' (한 편의 자동 스크롤 문서로 이어집니다 · 선택 화면 없음)</div>' + table(['#', 'ACT', '챕터', '구성'], ol.map(function (o) { return [String(o.no).padStart(2, '0'), esc(o.act || ''), '<b>' + esc(o.title) + '</b>', esc(o.kind) + (o.kind.indexOf('새 구성') === 0 ? ' · 장면 ' + o.scenes : '')]; }));
    var lm = D.lifeMap(M, ch, now);
    var soc = D.social(M, ch, sd, now); D.attachSocial(lm, soc, 'decade');
    h += '<div class="cap2">PROLOGUE · 인생 지도 (엔진 값 · 관계는 규칙 추정, 실제 화면에서는 AI 추정으로 대체)</div>' + table(['나이', '대운', '계절', '돈', '직업', '사랑', '관계(추정)', ''], lm.map(function (x) {
      if (x.pre) return [x.startAge + '~' + x.endAge + '세', '—', '대운 전(데이터 없음)', '', '', '', '', ''];
      var f = function (k) { return x.fields[k] ? x.fields[k].score + ' <span class="muted">' + esc(x.fields[k].band) + '</span>' : '-'; };
      return [x.startAge + '~' + x.endAge + '세', esc(x.ganzhi), esc(x.seasonName), f('money'), f('career'), f('love'), f('relation'), x.isCurrent ? '◀ 지금' : '']; }));
    var tm = D.timing(M, ch, sd, now, 'marriage', soc); h += '<div class="cap2">결혼(인연) 시기 · ' + (soc.source === 'ai' ? 'AI' : '규칙') + ' 추정</div><p class="muted" style="margin:4px 0">' + esc(tm.line) + '</p>';
    h += '<div class="cap2">ACT 1 · YOU ARE HERE</div><p style="margin:4px 0"><b>' + esc(pr.position.seasonName) + '</b> — ' + esc(pr.position.headline) + '</p><details><summary class="muted">왜 이렇게 나오나요? (근거 ' + pr.position.evidence.length + '항목)</summary>' + table(['항목', '값'], pr.position.evidence.map(function (e) { return [esc(e.k), esc(e.v)]; })) + '</details>';
    h += '<div class="cap2">FINAL · 버릴 것 / 지킬 것 / 시작할 것(예시)</div><p class="muted" style="margin:4px 0">버릴 것: ' + esc(pr.actions.drop.join(' / ')) + '<br>지킬 것: ' + esc(pr.actions.keep.join(' / ')) + '<br>시작할 것: ' + esc(pr.actions.start.join(' / ')) + '</p></div>';
    var cm = D.chapterMap();
    h += '<div class="card"><b style="color:var(--gold)">기존 챕터 → 질문 모듈 매핑표</b><p class="muted" style="margin:6px 0 10px">기존 챕터 내용·계산은 삭제하지 않고, 질문 모듈이 그대로 재사용합니다.</p>' + table(['기존 챕터', '재사용하는 질문 모듈'], R.Chapters.BASE.map(function (c) { return [esc(c.id + ' · ' + c.title), (cm[c.id] || []).map(function (id) { return esc(D.byId[id].title); }).join('<br>') || '<span class="muted">미배정</span>']; })) + '</div>';
    h += '<div class="card"><b style="color:var(--gold)">아직 없는 계산 모델 (가짜 값 대신 비활성)</b><ul class="muted" style="margin:8px 0 0 18px;line-height:1.7">' + D.FIELDS.filter(function (f) { return !f.available; }).map(function (f) { return '<li><b>' + esc(f.name) + '</b> 탭 — ' + esc(f.note) + '</li>'; }).join('') +
      D.MODULES.filter(function (m) { return m.proxy || m.status === 'merged'; }).map(function (m) { return '<li><b>' + esc(m.title) + '</b> — ' + esc(m.note) + '</li>'; }).join('') + '</ul></div>';
    box.innerHTML = h; bind(box, M);
  }
  function bind(box, M) {
    var go = function () { TS.date = $('#stD', box).value || TS.date; TS.time = $('#stT', box).value || TS.time; TS.gender = $('#stG', box).value; TS.interest = $('#stI', box).value; try { localStorage.setItem(KEY, JSON.stringify(TS)); } catch (e) { } draw(box, M); };
    ['#stD', '#stT', '#stG', '#stI'].forEach(function (s) { var e = $(s, box); if (e) e.onchange = go; });
    var o = $('#stOpen', box); if (o) o.href = '/report/v2/?qa=' + encodeURIComponent(TS.date + ',' + TS.time + ',' + TS.gender);
  }
  window.V2Story = { open: function () { var box = document.getElementById('t-v2story'); if (!box) return; box.innerHTML = '<p class="muted">엔진을 불러오는 중…</p>'; C.engine().then(function (M) { draw(box, M); }).catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; }); } };
})();
