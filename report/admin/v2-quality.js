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

  // 풀이 DB 근거 상태(저장된 모듈 + 시드 기준). 정책이 off 면 노출은 그대로이고 이 표시만 나온다.
  function evidenceSection(e) {
    var s = e.status, rc = e.refs, flagged = e.mismatch.length + e.unknownCond.length + e.staleText.length + e.ruleConflict.length + (rc ? rc.dangling.length + rc.lowGrade.length + rc.noReference.length : 0);
    var cats = e.categories.slice(0, 12).map(function (c) { return '<tr><td>' + esc(c.category) + '</td><td>' + c.total + '</td><td>' + c.approved + '</td><td>' + c.legacy + '</td><td>' + c.other + '</td><td>' + c.ratio + '%</td></tr>'; }).join('');
    return section('풀이 DB 근거 상태 · 정책 ' + esc(e.policy), flagged,
      '<p style="margin:0 0 8px;font-size:.84rem">모듈 ' + e.total + '개 — 승인 ' + s.approved + ' · 미검증(legacy) ' + s.legacy + ' · 근거 부족 ' + s.needs_evidence + ' · 초안 ' + s.draft + ' · 폐기 ' + s.retired + '<br>근거 종류: 계산 ' + e.basis.engine + ' · 전통 문헌 ' + e.basis.tradition + ' · 편집 원칙 ' + e.basis.editorial + ' · 미검증 ' + e.basis.legacy + (e.basis.none ? ' · 없음 ' + e.basis.none : '') +
      '<br>지금 정책에서 숨겨진 모듈 ' + e.hidden + '개' + (e.restored ? ' (폴백 복원 ' + e.restored + '개)' : '') + ' · 정책을 바꾸면 hide_unverified ' + e.wouldHide.hide_unverified + '개 / strict ' + e.wouldHide.strict + '개가 숨겨집니다(폴백 복원 전 수치).</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-bottom:8px"><thead><tr><th style="text-align:left">카테고리(승인 비율 낮은 순 12)</th><th style="text-align:left">전체</th><th style="text-align:left">승인</th><th style="text-align:left">legacy</th><th style="text-align:left">기타</th><th style="text-align:left">승인율</th></tr></thead><tbody>' + cats + '</tbody></table>' +
      list(e.mismatch, function (x) { return '<span class="mono">' + esc(x.id) + '</span> — ' + esc(x.reason); }) +
      list(e.unknownCond, function (x) { return '<span class="mono">' + esc(x.id) + '</span> — 알 수 없는 조건 키: ' + esc(x.keys.join(', ')); }) +
      (rc ? '<p class="muted" style="font-size:.8rem;margin:6px 0">출처 연결: 풀이 자료 ' + e.refDocs + '건 · 자료와 연결된 출처 ' + rc.linked + ' · 자유 입력 출처 ' + rc.free + '</p>' +
        list(rc.dangling, function (x) { return '<span class="mono">' + esc(x.id) + '</span> — 풀이 자료에 없는 출처 id: ' + esc(x.doc); }) +
        list(rc.lowGrade, function (x) { return '<span class="mono">' + esc(x.id) + '</span> — 승인 모듈의 출처 자료 등급이 낮음(' + esc(x.grade) + '): ' + esc(x.doc); }) +
        list(rc.noReference, function (x) { return '<span class="mono">' + esc(x.id) + '</span> — "참고 안 함" 정책인 자료를 출처로 씀: ' + esc(x.doc); }) : '<p class="muted" style="font-size:.8rem;margin:6px 0">출처 연결: 풀이 자료 목록을 불러오지 못해 확인 못함</p>') +
      list(e.ruleConflict, function (x) { return '<span class="mono">' + esc(x.id) + '</span> — 선택 조건이 제외 조건에 모두 들어 있어 선택되지 않습니다: ' + esc(x.keys.join(', ')); }) +
      list(e.staleText.map(function (id) { return { id: id }; }), function (x) { return '<span class="mono">' + esc(x.id) + '</span> — 승인 당시와 문장이 달라졌습니다(근거 재확인 필요)'; }), '문제 없음');
  }

  // 일주 각성 영상 매핑(120칸) + 일간 소개(20칸). 파일 연결 확인은 눌렀을 때만 한다(영상 파일에 Range 0-0 요청).
  function awakeningSection(st) {
    var a = st.awk; if (!a) return '<div class="card"><b style="color:var(--gold)">일주 각성 영상 매핑</b> <span class="chip">확인 못함</span><p class="muted">/api/awakening 을 불러오지 못했습니다.</p></div>';
    var p = a.pillars, bad = p.missing + p.error + p.disabled + p.posterOnly, pr = st.awkProbe;
    var body = '<p style="margin:0 0 8px;font-size:.84rem">일주 영상 <b>' + p.ok + ' / ' + p.of + '</b> (남 ' + p.male + ' · 여 ' + p.female + ') · 포스터만 ' + p.posterOnly + ' · 사용 안 함 ' + p.disabled + ' · 없음 ' + p.missing + (p.error ? ' · 주소 오류 ' + p.error : '') + (p.invalid ? ' · 형식 오류 ' + p.invalid : '') +
      '<br>일간 소개 영상 <b>' + a.ilgan.ok + ' / ' + a.ilgan.of + '</b> · 기본 영상 ' + (a.fallback ? '있음' : '없음') + ' · 문구만 보이기 ' + (a.textOnly ? '켜짐' : '꺼짐') + ' · 공개 주소 ' + (a.publicBase ? '설정됨' : '없음(함수 경유)') + '</p>';
    if (p.missingList.length) body += '<details><summary class="muted" style="font-size:.8rem">영상이 없거나 문제 있는 칸 ' + p.missingList.length + '개 보기</summary><p class="mono" style="font-size:.76rem;word-break:keep-all">' + esc(p.missingList.join('  ')) + '</p></details>';
    body += '<div style="margin-top:8px"><button type="button" id="awkProbe"' + (pr && pr.running ? ' disabled' : '') + '>저장된 영상 파일 연결 확인 (' + a.urls.length + '개)</button> <span class="muted" id="awkProbeMsg">' + (pr ? (pr.running ? '확인 중… ' + pr.done + ' / ' + pr.total : '확인 완료 · 정상 ' + pr.okN + ' · 파일 없음 ' + pr.bad.length + (pr.skipped ? ' · 확인 안 함 ' + pr.skipped : '')) : '') + '</span></div>';
    if (pr && pr.bad.length) body += list(pr.bad.slice(0, 40), function (x) { return esc(x.label) + ' <span class="muted mono">' + esc(x.url) + ' · ' + esc(String(x.status)) + '</span>'; }) + (pr.bad.length > 40 ? '<p class="muted">외 ' + (pr.bad.length - 40) + '건</p>' : '');
    return section('일주 각성 영상 매핑', bad + a.ilgan.missing + (pr ? pr.bad.length : 0), body, '이상 없음');
  }
  function probeAwakening(box, st, M) {
    var a = st.awk; if (!a || (st.awkProbe && st.awkProbe.running)) return;
    var pr = st.awkProbe = { running: true, done: 0, total: a.urls.length, okN: 0, bad: [], skipped: 0 }, q = a.urls.slice(), msg = function () { var m = $('#awkProbeMsg', box); if (m) m.textContent = '확인 중… ' + pr.done + ' / ' + pr.total; };
    var one = function (u) {
      var ctl = window.AbortController ? new AbortController() : null;
      return fetch(u.url, { headers: { range: 'bytes=0-0' }, signal: ctl && ctl.signal }).then(function (r) { if (ctl) ctl.abort(); if (r.status === 200 || r.status === 206) pr.okN++; else pr.bad.push({ label: u.label, url: u.url, status: r.status }); })
        .catch(function (e) { if (e && e.name === 'AbortError') { pr.okN++; return; } pr.bad.push({ label: u.label, url: u.url, status: '요청 실패' }); }).then(function () { pr.done++; msg(); });
    };
    var worker = function () { var u = q.shift(); return u ? one(u).then(worker) : null; };
    Promise.all([worker(), worker(), worker(), worker()]).then(function () { pr.running = false; draw(box, st, M); });
    msg();
  }

  function render(box, st) {
    var a = st.audit, h = '';
    h += '<div class="card"><b style="color:var(--gold)">서비스 점검</b><p class="muted" style="margin:6px 0 10px">테스트 사주로 실제 무빙툰 문서를 만들어 아래 네 가지를 점검합니다. 읽기 전용이며 아무것도 바꾸지 않습니다. 계산값과 문장의 불일치·문장 중복은 <b>정합성 검사</b> 탭에서 보세요.</p>' +
      '<div class="pvh"><label>생년월일<input type="date" id="qaD" value="' + esc(TS.date) + '"></label><label>시각<input type="time" id="qaT" value="' + esc(TS.time) + '"></label><label>성별<select id="qaG"><option value="M"' + (TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label>관심 분야<select id="qaI">' + R.StoryDirector.INTERESTS.map(function (i) { return '<option value="' + i.id + '"' + (TS.interest === i.id ? ' selected' : '') + '>' + esc(i.name) + '</option>'; }).join('') + '</select></label><button type="button" id="qaGo" class="gold">점검 실행</button></div></div>';
    if (st.err) return h + '<div class="card"><p class="err">' + esc(st.err) + '</p></div>';
    if (!a) return h + '<div class="card"><p class="muted">"점검 실행"을 누르면 결과가 나옵니다.</p></div>';
    var s = a.summary;
    h += '<div class="card"><b>요약</b> · 챕터 ' + a.chapters + '개 · 풀이 누락 의심 ' + s.missing + ' · 단정 표현 검토 ' + s.absolute + ' · 에셋 누락 ' + (s.assetMissing == null ? '확인 못함' : s.assetMissing) + ' · 세계 매핑 대체 ' + (s.worldFallback == null ? '-' : s.worldFallback) + ' · 빈 세계 ' + (s.worldEmpty == null ? '-' : s.worldEmpty) + '</div>';
    if (st.evidence) h += evidenceSection(st.evidence);
    h += awakeningSection(st);
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

  function md(a, st) {
    var L = ['# 서비스 점검 결과', '', '- 챕터 ' + a.chapters + '개 · 풀이 누락 의심 ' + a.summary.missing + ' · 단정 표현 검토 ' + a.summary.absolute + ' · 에셋 누락 ' + a.summary.assetMissing + ' · 세계 매핑 대체 ' + a.summary.worldFallback, ''];
    L.push('## 풀이 누락 의심'); a.missing.forEach(function (x) { L.push('- ' + (x.title || x.id) + ' (' + x.id + ', ' + x.len + '자)'); }); if (!a.missing.length) L.push('- 없음');
    L.push('', '## 단정 표현 검토'); a.absolute.forEach(function (x) { L.push('- ' + (x.title || x.id) + ': “' + x.snippet + '” (' + x.word + ')'); }); if (!a.absolute.length) L.push('- 없음');
    if (st && st.awk) { var w = st.awk; L.push('', '## 일주 각성 영상 매핑', '- 일주 영상 ' + w.pillars.ok + '/' + w.pillars.of + ' (남 ' + w.pillars.male + ' · 여 ' + w.pillars.female + ') · 포스터만 ' + w.pillars.posterOnly + ' · 사용 안 함 ' + w.pillars.disabled + ' · 없음 ' + w.pillars.missing + ' · 주소 오류 ' + w.pillars.error, '- 일간 소개 ' + w.ilgan.ok + '/' + w.ilgan.of + ' · 기본 영상 ' + (w.fallback ? '있음' : '없음')); if (w.pillars.missingList.length) L.push('- 문제 칸: ' + w.pillars.missingList.join(' ')); if (st.awkProbe && !st.awkProbe.running) { L.push('- 파일 연결 확인: 정상 ' + st.awkProbe.okN + ' · 파일 없음 ' + st.awkProbe.bad.length); st.awkProbe.bad.forEach(function (x) { L.push('  - ' + x.label + ' ' + x.url + ' (' + x.status + ')'); }); } }
    if (st && st.evidence) { var e = st.evidence; L.push('', '## 풀이 DB 근거 상태 (정책 ' + e.policy + ')', '- 모듈 ' + e.total + ' · 승인 ' + e.status.approved + ' · legacy ' + e.status.legacy + ' · 근거 부족 ' + e.status.needs_evidence + ' · 초안 ' + e.status.draft + ' · 폐기 ' + e.status.retired, '- 숨김 ' + e.hidden + ' · hide_unverified 시 ' + e.wouldHide.hide_unverified + ' · strict 시 ' + e.wouldHide.strict); e.mismatch.forEach(function (x) { L.push('- 불일치: ' + x.id + ' — ' + x.reason); }); e.unknownCond.forEach(function (x) { L.push('- 알 수 없는 조건 키: ' + x.id + ' (' + x.keys.join(', ') + ')'); }); e.ruleConflict.forEach(function (x) { L.push('- 선택 조건과 제외 조건 충돌: ' + x.id + ' (' + x.keys.join(', ') + ')'); }); e.staleText.forEach(function (id) { L.push('- 승인 후 문장 변경: ' + id); }); }
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
    var pb = $('#awkProbe', box); if (pb) pb.onclick = function () { pb.disabled = true; probeAwakening(box, st, M); };
    var mdb = $('#qaMd', box); if (mdb) mdb.onclick = function () {
      var blob = new Blob([md(st.audit, st)], { type: 'text/markdown;charset=utf-8' }), u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = 'service-quality.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    };
  }
  function draw(box, st, M) { box.innerHTML = render(box, st); bind(box, st, M); }

  function run(M, st) {
    var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = Date.now();
    return Promise.all([
      C.api('/api/asset-art').then(function (r) { return r.slots || []; }).catch(function (e) { st.assetErr = e.message; return null; }),
      C.api('/api/worlds').then(function (r) { return r.worlds || []; }).catch(function () { return []; }),
      C.load().then(function () { return C.ST.saved || {}; }).catch(function () { return {}; }),
      C.api('/api/src?a=list').then(function (r) { return r.docs || []; }).catch(function () { return null; }),
      C.api('/api/awakening?all=1').then(function (r) { return r || {}; }).catch(function () { return null; }),
    ]).then(function (got) {
      st.awk = got[4] ? Q.awakeningAudit(got[4]) : null; st.awkProbe = null;
      try {
        var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' });
        var sd = R.SajuData.build(ch, { now: now }), cfg = R.Chapters.forProject(null, 'full'), saved = got[2] || {}, lib = R.Compose.library({ modules: saved.modules, remedies: saved.remedies, evidencePolicy: saved.evidencePolicy }), rep = R.Compose.build(sd, lib, cfg, { name: '테스트' });
        st.evidence = Q.evidence(lib.all, { policy: lib.policy, hidden: lib.hidden.length, restored: lib.restored.length });
        st.evidence.refs = got[3] ? Q.refCheck(lib.all, got[3]) : null; st.evidence.refDocs = got[3] ? got[3].length : null;
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
