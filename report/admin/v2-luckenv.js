/* 관리자 "운세 환경 문구" 탭 — ① 환경 해석 문구의 게시(체크 후 일괄 게시·수정 후 저장하고 게시·되돌리기) ② 통합 운세 시뮬레이터(해석 추적)
   API: /api/luck-phrases. 화면에서는 "게시" 한 번으로 끝나고(내부적으로 승인+게시), 게시한 문구만 사용자 화면에 반영된다. 수정하면 게시본에서 즉시 빠진다.
   시뮬레이터는 브라우저에서 engine.js·luck-interpret.js를 그대로 써서 사용자 화면과 같은 결과를 보여 주며, 서버에 아무것도 저장하지 않는다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, LI = window.MantraLuckInterpret, RG = window.MantraRegion;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var BASE = {};
  var S = { flags: null, items: {}, phrases: [], version: 0, f: { type: '', status: '', q: '' }, cur: null, sel: {} };
  var ST = { draft: '미게시', reviewed: '미게시', published: '게시됨' }, FST = { unpub: '미게시', published: '게시됨' }, TYPE = { core: '핵심 기운', scene: '상황', good: '유리 조건', bad: '불리 조건', act: '대응', sixHook: '시기 첫 문장', sixBody: '시기 설명', sixDo: '시기 할 일', sixTrap: '시기 함정' };
  var stOf = function (id) { return (S.items[id] && S.items[id].status) || 'draft'; };
  var txOf = function (p) { return (S.items[p.id] && S.items[p.id].text) || p.text; };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/luck-phrases' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#leMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) {
    return call('GET', '?all=1').then(function (d) {
      if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; }
      S.items = d.items || {}; S.phrases = d.phrases || []; S.version = d.version || 0;
      return fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (f) { S.flags = f; draw(); if (note) msg(note); });
    });
  }
  function counts() { var c = { published: 0, unpub: 0 }; S.phrases.forEach(function (p) { c[stOf(p.id) === 'published' ? 'published' : 'unpub']++; }); return c; }
  function visible() {
    var f = S.f;
    return S.phrases.filter(function (p) { var pub = stOf(p.id) === 'published'; return (!f.type || p.type === f.type) && (!f.status || (f.status === 'published' ? pub : !pub)) && (!f.q || (p.id + txOf(p)).indexOf(f.q) >= 0); });
  }
  var selIds = function () { return Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); };
  function bulk(ids, op) {
    if (!ids.length) return;
    var pubWord = op === 'publish';
    if (!confirm(ids.length + '건을 ' + (pubWord ? '게시' : '게시 취소') + '합니다.' + (pubWord ? '\n게시한 문구는 사용자 화면의 해석에 그대로 쓰입니다(운세 환경 해석 기능이 꺼져 있으면 아직 보이지 않습니다).\n내용을 확인하셨나요?' : '\n사용자 화면은 기본 문구로 돌아갑니다.'))) return;
    var chunks = [], i; for (i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
    var done = 0, skipped = 0, failed = [];
    chunks.reduce(function (p, ch) { return p.then(function () { return call('PUT', '', { action: 'bulk', ids: ch, op: op }).then(function (d) { if (!d._ok) failed.push({ id: '(요청)', error: d.error || '실패' }); else { done += d.done; skipped += d.skipped; failed = failed.concat(d.failed || []); } }); }); }, Promise.resolve())
      .then(function () { S.sel = {}; load((pubWord ? '게시 ' : '게시 취소 ') + done + '건' + (skipped ? ' · 이미 처리됨 ' + skipped + '건' : '') + (failed.length ? ' · 실패 ' + failed.length + '건: ' + failed.slice(0, 3).map(function (x) { return x.id + ' (' + x.error + ')'; }).join(', ') : '')); });
  }
  function draw() {
    var c = counts(), f = S.f, list = visible(), shown = list.slice(0, 200), n = selIds().length, allSel = shown.length && shown.every(function (p) { return S.sel[p.id]; });
    var fl = S.flags, on = fl && fl.interpret && fl.timeline && fl.region, part = fl && !on && (fl.interpret || fl.timeline || fl.region);
    var flagBox = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">운세 환경 신기능 공개 스위치</h3>' +
      '<p style="margin:0 0 8px">현재: <b style="color:' + (on ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '상태를 불러오지 못했습니다' : on ? '● 켜짐 — 모든 사용자에게 보입니다' : part ? '◐ 일부만 켜짐' : '○ 꺼짐 — 사용자에게 보이지 않습니다') + '</b>' + (fl && fl.at ? ' <span class="muted">(마지막 변경 ' + esc(fl.at.slice(0, 16).replace('T', ' ')) + (fl.by ? ' · ' + esc(fl.by) : '') + ')</span>' : '') + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leFOn">모두 켜기</button><button class="btn" id="leFOff">모두 끄기</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 환경 해석 카드·환경 변화 타임라인·나의 운명 지도가 <b>약 1분 안에</b> 모든 사용자의 운세 흐름 탭에 나타나고, 끄면 같은 방식으로 사라집니다(코드 배포 필요 없음). 아직 게시하지 않은 문구는 기본 문구로 보입니다. 큰 문제가 생기면 [모두 끄기]를 누르세요.</p>' +
      // 타임라인 카드 문안은 [모두 켜기]에 묶지 않고 따로 켠다(functions/api/luck-flags.js ALL_ON)
      '<hr style="border:0;border-top:1px solid rgba(255,255,255,.1);margin:12px 0"><p style="margin:0 0 8px"><b>운명의 타임라인 카드 문안</b> — 현재: <b style="color:' + (fl && fl.timelineCopy ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.timelineCopy ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leTC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.timelineCopy ? '타임라인 문안 끄기' : '타임라인 문안 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운명의 타임라인 카드(대운·세운·월운) 맨 위에 시기 첫 문장·설명·할 일·함정이 <b>약 1분 안에</b> 나타납니다. 아래 목록에서 유형 "시기 첫 문장 / 시기 설명 / 시기 할 일 / 시기 함정"으로 걸러 먼저 검수·게시하세요. [모두 켜기·끄기]와는 따로 움직입니다.</p>' +
      '<hr style="border:0;border-top:1px solid rgba(255,255,255,.1);margin:12px 0"><p style="margin:0 0 8px"><b>무빙툰 주제 심화 블록</b> — 현재: <b style="color:' + (fl && fl.topicDeep ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.topicDeep ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leTD"' + (fl ? '' : ' disabled') + '>' + (fl && fl.topicDeep ? '주제 심화 끄기' : '주제 심화 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 무빙툰 재물운·커리어운·인연운·개운법 장에 그래프 지표(횡재·사업·이직·결혼 등) 10년 그래프, 직업 TOP 10·업종·수익 유형 순위, 궁합(저장한 상대), 거주·사업장 방향과 지역 TOP 5, 우리 집 현공풍수, 소원성취 명당 순위가 <b>약 1분 안에</b> 붙습니다.</p></div>';
    // 운명의 타임라인 서사 엔진(report/v2/life-narrative.js) 스위치 — 따로 켜고 끈다. 사주별 미리보기·검수는 tools/life-narrative-preview.cjs
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운명의 타임라인 서사 엔진(59장)</b> — 현재: <b style="color:' + (fl && fl.lifeNarrative ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.lifeNarrative ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leLN"' + (fl ? '' : ' disabled') + '>' + (fl && fl.lifeNarrative ? '서사 엔진 끄기' : '서사 엔진 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 종합풀이 14장(기질·인생 흐름·최고와 최악·사용설명서·움직일 때·강점과 약점·맞는 업·인연운·배우자·재물운·재물 그릇·말년운·자식운·개운법), 재물운 심화 15장 전체, 인연운 심화 15장 전체, 커리어운 심화 15장 전체의 본문이 복합 규칙 서사(핵심 성향→생활→갈등→운의 변화→조언)로 바뀝니다. 맞는 규칙이 없는 사주는 기존 문안 그대로입니다. 끄면 약 1분 안에 원래대로 돌아갑니다(DB 변경 없음).</p></div>';
    // 운세 흐름 오행 흐름 상자(engine.js elementFlow) 스위치 — 따로 켜고 끈다. 표시 전용이라 점수는 바뀌지 않는다
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운세 흐름 오행 흐름 상자</b> — 현재: <b style="color:' + (fl && fl.elementFlow ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.elementFlow ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leEF"' + (fl ? '' : ' disabled') + '>' + (fl && fl.elementFlow ? '오행 흐름 끄기' : '오행 흐름 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운세 흐름 탭에서 대운·세운을 눌렀을 때 그 운의 오행이 원국과 어떻게 이어지는지(순생·통관·제압·극·설기·막힘·엇갈림) 한 줄 판정, 생(초록)·극(빨강) 화살표가 그려진 미니 오각형, 이 운이 만드는 구조(식신제살·군겁쟁재 등)가 <b>약 1분 안에</b> 나타납니다. 설명용이라 점수는 바뀌지 않고, 끄면 같은 방식으로 사라집니다.</p></div>';
    root.innerHTML = flagBox + '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">운세 환경 문구 게시</h3>' +
      '<div style="background:rgba(255,255,255,.05);border-radius:8px;padding:8px 12px;margin:0 0 8px;line-height:1.7"><b>사용법</b><br>① 목록의 문구를 읽어 봅니다.<br>② 괜찮으면 체크하고 <b>[선택 게시]</b>, 전부 괜찮으면 <b>[목록 전체 게시]</b>를 누릅니다.<br>③ 고치려면 문구를 눌러 본문을 수정한 뒤 <b>[저장하고 게시]</b>를 누릅니다.</div>' +
      '<p class="muted" style="margin:0 0 8px">게시한 문구만 사용자 화면에 반영되고, 수정하면 게시본에서 빠집니다(사용자에게는 기본 문구). 단정·반말 표현이나 같은 문구는 저장되지 않습니다. 운세 환경 해석 기능이 꺼져 있으면 게시해도 아직 사용자에게 보이지 않습니다. <b>전체 ' + S.phrases.length + '건 · 게시됨 ' + c.published + ' · 미게시 ' + c.unpub + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>유형 <select id="leT"><option value="">전체</option>' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="leS"><option value="">전체</option>' + Object.keys(FST).map(function (k) { return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + FST[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>검색 <input id="leQ" value="' + esc(f.q) + '" style="width:160px"></label></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><button class="btn" id="leBp"' + (n ? '' : ' disabled') + '>선택 게시 (' + n + ')</button><button class="btn" id="leBu"' + (n ? '' : ' disabled') + '>선택 게시 취소</button>' +
      '<button class="btn" id="leAp"' + (list.length ? '' : ' disabled') + '>목록 전체 게시 (' + Math.min(list.length, 200) + ')</button><button class="btn" id="leAu"' + (list.length ? '' : ' disabled') + '>목록 전체 게시 취소</button><span id="leMsg" class="muted"></span></div>' +
      '<div style="overflow:auto;max-height:340px;margin-top:8px"><table style="width:100%;font-size:.86rem"><thead><tr><th style="width:28px"><input type="checkbox" id="leAll"' + (allSel ? ' checked' : '') + ' aria-label="보이는 문구 전체 선택"></th><th>ID</th><th>유형</th><th>본문</th><th>상태</th></tr></thead><tbody>' +
      shown.map(function (p) { return '<tr data-id="' + esc(p.id) + '" style="cursor:pointer' + (S.cur === p.id ? ';background:rgba(255,255,255,.06)' : '') + '"><td><input type="checkbox" data-ck="' + esc(p.id) + '"' + (S.sel[p.id] ? ' checked' : '') + '></td><td>' + esc(p.id) + '</td><td>' + (TYPE[p.type] || '') + '</td><td>' + esc(txOf(p)) + '</td><td>' + ST[stOf(p.id)] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (list.length > 200 ? '<p class="muted">처음 200건만 표시합니다. 필터로 좁혀 주세요.</p>' : '') + '<div id="leEd" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">통합 운세 시뮬레이터</h3><div id="leSim"></div></div>';
    function setFlags(v) {
      if (v && !confirm('운세 환경 신기능(해석 카드·타임라인·나의 운명 지도)을 모든 사용자에게 공개합니다.\n지금 게시된 문구만 바뀐 문구로 보이고, 나머지는 기본 문구입니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ on: v }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '켰습니다(약 1분 안에 반영)' : '껐습니다(약 1분 안에 반영)'); });
    }
    $('#leFOn').onclick = function () { setFlags(true); }; $('#leFOff').onclick = function () { setFlags(false); };
    $('#leTD').onclick = function () {   // 무빙툰 주제 심화 블록 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.topicDeep);
      if (v && !confirm('무빙툰 주제 심화 블록(그래프 지표·직업 순위·궁합·풍수·명당)을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { topicDeep: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '주제 심화 블록을 켰습니다(약 1분 안에 반영)' : '주제 심화 블록을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leLN').onclick = function () {   // 타임라인 서사 엔진 스위치
      var v = !(S.flags && S.flags.lifeNarrative);
      if (v && !confirm('운명의 타임라인 서사 엔진(59장)을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { lifeNarrative: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '서사 엔진을 켰습니다(약 1분 안에 반영)' : '서사 엔진을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leEF').onclick = function () {   // 운세 흐름 오행 흐름 상자 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.elementFlow);
      if (v && !confirm('운세 흐름 오행 흐름 상자(판정·미니 오각형·구조 칩)를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { elementFlow: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '오행 흐름 상자를 켰습니다(약 1분 안에 반영)' : '오행 흐름 상자를 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leTC').onclick = function () {   // 타임라인 카드 문안 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.timelineCopy);
      if (v && !confirm('운명의 타임라인 카드 문안을 모든 사용자에게 공개합니다.\n게시한 문구는 게시본으로, 나머지는 기본 문구로 보입니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { timelineCopy: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '타임라인 문안을 켰습니다(약 1분 안에 반영)' : '타임라인 문안을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leT').onchange = function () { S.f.type = this.value; draw(); }; $('#leS').onchange = function () { S.f.status = this.value; draw(); };
    $('#leQ').onchange = function () { S.f.q = this.value.trim(); draw(); };
    $('#leAll').onchange = function () { var on = this.checked; shown.forEach(function (p) { S.sel[p.id] = on; }); draw(); };
    root.querySelectorAll('input[data-ck]').forEach(function (cb) { cb.onclick = function (e) { e.stopPropagation(); S.sel[cb.dataset.ck] = cb.checked; var m = selIds().length; $('#leBp').disabled = $('#leBu').disabled = !m; $('#leBp').textContent = '선택 게시 (' + m + ')'; }; });
    $('#leBp').onclick = function () { bulk(selIds(), 'publish'); }; $('#leBu').onclick = function () { bulk(selIds(), 'unpublish'); };
    $('#leAp').onclick = function () { bulk(shown.map(function (p) { return p.id; }), 'publish'); }; $('#leAu').onclick = function () { bulk(shown.map(function (p) { return p.id; }), 'unpublish'); };
    root.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.onclick = function () { S.cur = tr.dataset.id; draw(); }; });
    if (S.cur) editor(); drawSim();
  }
  function editor() {
    var p = S.phrases.filter(function (x) { return x.id === S.cur; })[0]; if (!p) return;
    var it = S.items[p.id], st = stOf(p.id), hist = (it && it.history || []).slice().reverse();
    $('#leEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + esc(p.id) + '</b> · ' + ST[st] + (it && it.by ? ' · 마지막 ' + esc(it.by) : '') +
      '<p class="muted" style="margin:4px 0">기본 문구: ' + esc(p.text) + '</p><textarea id="leTx" rows="3" maxlength="200" style="width:100%">' + esc(txOf(p)) + '</textarea>' +
      '<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><button class="btn" data-a="pub">' + (st === 'published' ? '수정해서 다시 게시' : '저장하고 게시') + '</button><button class="btn" data-a="save">수정만 저장(미게시)</button><button class="btn" data-a="unpublish"' + (st !== 'published' ? ' disabled' : '') + '>게시 취소</button></div>' +
      (hist.length ? '<details style="margin-top:8px"><summary>이력 ' + hist.length + '건</summary><ul style="margin:6px 0 0 18px">' + hist.map(function (h) { return '<li>v' + h.v + ' · ' + ST[h.status] + ' · ' + esc(h.at.slice(0, 16).replace('T', ' ')) + (h.by ? ' · ' + esc(h.by) : '') + ' — ' + esc(h.text) + ' <button class="btn" data-rs="' + h.v + '">이 본문으로</button></li>'; }).join('') + '</ul></details>' : '') + '</div>';
    var fail = function (d) { msg(d.error || '실패했습니다', true); };
    root.querySelectorAll('#leEd [data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.a, text = $('#leTx').value, changed = text.trim() !== txOf(p).trim();
        if (a === 'unpublish') return call('PUT', '', { id: p.id, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); });
        if (a === 'save') return call('PUT', '', { id: p.id, action: 'save', text: text }).then(function (d) { d._ok ? load('저장했습니다(미게시)') : fail(d); });
        // 저장하고 게시: 본문을 고쳤으면 저장 후, 아니면 바로 게시
        (changed || st === 'published' ? call('PUT', '', { id: p.id, action: 'save', text: text }) : Promise.resolve({ _ok: true })).then(function (d) { if (!d._ok) return fail(d); return call('PUT', '', { id: p.id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
    root.querySelectorAll('#leEd [data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { id: p.id, action: 'restore', v: +b.dataset.rs }).then(function (d) { if (!d._ok) return fail(d); load('되돌렸습니다(미게시) — 게시하려면 [저장하고 게시]를 누르세요'); }); }; });
  }

  // ── 시뮬레이터 ──
  var SIM = { year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', lon: 126.98, level: 'seun', Y: new Date().getFullYear(), m: 1, d: 1, region: '' };
  function drawSim() {
    var o = function (arr, v) { return arr.map(function (a) { return '<option value="' + a[0] + '"' + (String(a[0]) === String(v) ? ' selected' : '') + '>' + a[1] + '</option>'; }).join(''); };
    var num = function (id, v, w) { return '<input id="' + id + '" type="number" value="' + v + '" style="width:' + (w || 70) + 'px">'; };
    $('#leSim').innerHTML = '<p class="muted" style="margin:0 0 8px">테스트 사주와 기간을 넣으면 사용자 화면과 같은 해석, 적용·배제된 규칙, 선택된 문구를 보여 줍니다. 서버에 저장하지 않습니다.</p><div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">' +
      '<label>생년 ' + num('sY', SIM.year) + '</label><label>월 ' + num('sM', SIM.month, 50) + '</label><label>일 ' + num('sD', SIM.day, 50) + '</label><label>시 ' + num('sH', SIM.hour, 50) + '</label><label>분 ' + num('sMi', SIM.minute, 50) + '</label>' +
      '<label>성별 <select id="sG">' + o([['M', '남'], ['F', '여']], SIM.gender) + '</select></label><label>경도 ' + num('sL', SIM.lon, 80) + '</label>' +
      '<label>단계 <select id="sLv">' + o([['daeun', '대운'], ['seun', '세운'], ['wolun', '월운'], ['ilun', '일진']], SIM.level) + '</select></label><label>연도 ' + num('sPY', SIM.Y) + '</label><label>월 ' + num('sPM', SIM.m, 50) + '</label><label>일 ' + num('sPD', SIM.d, 50) + '</label>' +
      '<label>지역 <select id="sRg"><option value="">없음</option>' + RG.REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (SIM.region === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></label>' +
      '<label><input type="checkbox" id="sDraft" checked> 미게시 문구 포함</label><button class="btn" id="sGo">실행</button></div><div id="sOut" style="margin-top:10px"></div>';
    $('#sGo').onclick = run;
  }
  function ctxOf(ch, x, kind) {
    var c = {};
    if (kind === 'daeun') { var i = ch.daeun.list.indexOf(x); if (i > 0) c.prev = ch.daeun.list[i - 1]; }
    else if (kind === 'seun') { c.daeun = x.daeun; c.prev = M.seunRange(ch, x.year - 1, x.year - 1)[0]; }
    else if (kind === 'wolun') { var Y = M.yearPillarAt(x.startMs).sajuYear, wl = M.wolun(ch, Y), i2 = wl.findIndex(function (m) { return m.startMs === x.startMs; }); c.seun = M.seunRange(ch, Y, Y)[0]; c.daeun = M.daeunAt(ch, x.startMs); c.prev = i2 > 0 ? wl[i2 - 1] : M.wolun(ch, Y - 1)[11]; }
    else { var y = x.date[0], m = x.date[1], d = x.date[2], ms = Date.UTC(y, m - 1, d, 3), Y2 = M.yearPillarAt(ms).sajuYear, wm = null; M.wolun(ch, Y2).forEach(function (q) { if (q.startMs <= ms) wm = q; }); c.wolun = wm || M.wolun(ch, Y2 - 1)[11]; c.seun = M.seunRange(ch, Y2, Y2)[0]; c.daeun = M.daeunAt(ch, ms); if (d > 1) c.prev = M.ilun(ch, y, m)[d - 2]; }
    return c;
  }
  function run() {
    var g = function (id) { return $('#' + id).value; }, out = $('#sOut');
    try {
      SIM = { year: +g('sY'), month: +g('sM'), day: +g('sD'), hour: +g('sH'), minute: +g('sMi'), gender: g('sG'), lon: +g('sL'), level: g('sLv'), Y: +g('sPY'), m: +g('sPM'), d: +g('sPD'), region: g('sRg') };
      var ch = M.compute({ year: SIM.year, month: SIM.month, day: SIM.day, hour: SIM.hour, minute: SIM.minute, calendar: 'solar', leap: false, gender: SIM.gender, lon: SIM.lon, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' });
      var x;
      if (SIM.level === 'daeun') x = M.daeunAt(ch, Date.UTC(SIM.Y, Math.max(0, SIM.m - 1), SIM.d || 1, 3));
      else if (SIM.level === 'seun') x = M.seunRange(ch, SIM.Y, SIM.Y)[0];
      else if (SIM.level === 'wolun') { x = M.wolun(ch, SIM.Y)[Math.min(11, Math.max(0, SIM.m - 1))]; }
      else x = M.ilun(ch, SIM.Y, SIM.m)[SIM.d - 1];
      if (!x) throw new Error('해당 기간을 계산할 수 없습니다(범위를 확인하세요)');
      var withDraft = $('#sDraft').checked;
      LI.PHRASES.forEach(function (p) { if (!(p.id in BASE)) BASE[p.id] = p.text; var it = S.items[p.id]; p.text = withDraft && it && it.text ? it.text : BASE[p.id]; });
      var r = LI.build(M, ch, x, SIM.level, ctxOf(ch, x, SIM.level)), ev = r.evidence, list = function (a) { return a.length ? '<ul style="margin:2px 0 6px 18px">' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted">없음</p>'; };
      var h = '<p><b>원국</b> ' + esc(ev.natal.join(' · ')) + ' · 적합도 ' + esc(x.ev.condition) + '</p><h4 style="margin:6px 0 2px">' + esc(r.core.title) + '</h4><p>' + esc(r.core.text) + '</p><p>' + esc(r.relation) + '</p>' +
        '<p><b>영역</b> ' + r.areas.map(function (a) { return esc(a.name) + ' ' + a.level + '(' + a.value + ')'; }).join(' · ') + '</p>' +
        '<b>상황</b>' + list(r.scenes.map(function (s) { return s.name + ' — ' + s.text + ' [' + s.phraseId + ']'; })) + '<b>유리</b>' + list(r.good) + '<b>불리</b>' + list(r.bad) + '<b>연결</b>' + list(r.chain.map(function (c) { return c.text; }).concat(r.change ? [r.change] : [])) + '<b>대응</b>' + list(r.strategy);
      if (SIM.region) { var rgn = RG.get(SIM.region); h += '<b>지역 연결(' + esc(rgn.name) + ')</b>' + list(RG.link(rgn, r.topAreas, '이 기간').map(function (l) { return l.text; })); }
      h += '<details open><summary><b>해석 추적</b></summary><p><b>적용된 규칙</b> ' + esc(ev.rules.map(function (q) { return q.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ')) + '</p>' +
        '<p><b>선택된 문구</b> ' + ev.phraseIds.map(function (id) { return esc(id) + '(' + ST[stOf(id)] + ')'; }).join(', ') + '</p><p><b>배제된 규칙</b></p>' + list(ev.excluded.map(function (q) { return q.id + ' — ' + q.why; })) + '</details>';
      out.innerHTML = h;
    } catch (e) { out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
  }
  window.V2LuckEnv = { open: function (password) { pw = password; root = document.getElementById('t-luckenv'); if (!root || !M || !LI || !RG) return; load(); } };
})();
