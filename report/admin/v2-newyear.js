/* 관리자 '신년운세' 화면: 연도별 공개 범위·맛보기·소개, 상품 상태, 토정 현대어·사주 문구 검수(수정·승인), 시험 사주 미리보기, 이력.
   서버: /api/newyear/admin (functions/api/newyear/admin.js). 가격·판매 여부는 '결제·상품' 화면의 tj2027 줄에서 바꾼다. */
(function () {
  'use strict';
  var pw = '', root = null;
  var S = { year: null, data: null, msg: '', err: false, filter: 'year', bfilter: 'all', gua: null, block: null, preview: null };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var who = function () { try { return localStorage.getItem('iching_reviewer') || ''; } catch (e) { return ''; } };
  var TONE = { good: '좋음', neutral: '보통', caution: '조심', burden: '버팀' };
  var VIS = { closed: ['비공개', '관리자만 볼 수 있어요(기본값).'], free: ['무료 공개', '누구나 전체를 무료로 봐요.'], paid: ['유료', '맛보기만 공개하고, 구매한 회원은 그해 전체를 반복해서 봐요.'] };
  var TEASER = [['open', '여는 장(괘 번호·첫 글귀)'], ['total.core', '총운 — 핵심 흐름'], ['total.tojeong', '총운 — 토정비결이 말하는 올해'], ['total.compare', '총운 — 두 풀이가 만나는 지점']];
  var MONTH = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  function api(method, q, body) {
    return fetch('/api/newyear/admin' + (q || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who()) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.message || d.error || ('오류 ' + r.status)); e.status = r.status; throw e; } return d; }); });
  }
  function msg(t, err) { S.msg = t; S.err = !!err; draw(); }
  function load() {
    return api('GET', '?year=' + (S.year || '')).then(function (d) { S.data = d; S.year = d.year; draw(); }).catch(function (e) { S.data = null; msg('불러오지 못했습니다: ' + e.message, true); });
  }
  function post(body, done) {
    body.rev = S.data && S.data.rev;
    return api('POST', '', body).then(function () { S.msg = done; S.err = false; return load(); }).then(function () { if (S.gua) openGua(S.gua.gua); if (S.block) openBlock(S.block.id); })
      .catch(function (e) { msg(e.status === 409 ? e.message : '저장하지 못했습니다: ' + e.message, true); if (e.status === 409) load(); });
  }

  // ── 그리기
  // 운명의 타임라인 '오늘 · 무료 콘텐츠' 칸의 입구 카드(서버 functions/_newyear.js entryOf, 공개 API /api/newyear/entry). 빈 칸은 기본 문구.
  var GZ = function (y) { return '갑을병정무기경신임계'[((y - 4) % 10 + 10) % 10] + '자축인묘진사오미신유술해'[((y - 4) % 12 + 12) % 12] + '년'; };
  function entryHtml(c, d) {
    var e = c.entry || { show: true }, paid = c.visibility === 'paid';
    var def = { kick: 'NEW YEAR · ' + d.year + ' ' + GZ(d.year) + (paid ? '' : ' · 무료'), title: d.year + ' 토정비결 신년운세', line: '토정비결 괘와 내 사주로 읽는 한 해 · 총운·재물·직업·연애·건강·12개월', go: '신년운세 보기' };
    var f = function (id, k, label, n) { return '<label style="display:block;margin:4px 0"><span class="muted" style="display:inline-block;width:92px">' + label + '</span><input id="' + id + '" maxlength="' + n + '" style="width:calc(100% - 100px)" value="' + esc(e[k] || '') + '" placeholder="' + esc(def[k]) + '"></label>'; };
    var state = c.visibility === 'closed' ? '숨김 — 공개 범위가 비공개라 카드가 나오지 않아요' : e.show === false ? '숨김 — 카드 보이기가 꺼져 있어요' : '보임' + (paid ? ' — 누르면 맛보기·구매 화면' : ' — 누르면 전체 무료 풀이');
    return '<div style="margin:12px 0;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:8px"><b>운명의 타임라인 입구 카드</b> <span class="muted" style="font-size:.85rem">· 지금 상태: ' + esc(state) + '</span>' +
      '<p class="muted" style="margin:4px 0 8px;font-size:.85rem">타임라인 맨 위 \'오늘 · 무료 콘텐츠\' 칸에 나오는 카드예요. 누르면 그 사람의 사주로 신년운세가 바로 열려요. 빈 칸은 회색 기본 문구가 쓰여요. 공개 설정 저장 뒤 1분 안에 반영돼요.</p>' +
      '<label style="display:block;margin:4px 0"><input type="checkbox" id="nyEntryShow"' + (e.show !== false ? ' checked' : '') + '> 타임라인에 카드 보이기</label>' +
      f('nyEntryKick', 'kick', '윗줄(작은 글씨)', 40) + f('nyEntryTitle', 'title', '제목', 40) + f('nyEntryLine', 'line', '설명', 120) + f('nyEntryGo', 'go', '버튼 글', 20) + '</div>';
  }
  function draw() {
    if (!root) return;
    var d = S.data;
    if (!d) { root.innerHTML = '<div class="card"><p class="muted">' + (S.msg ? esc(S.msg) : '불러오는 중…') + '</p></div>'; return; }
    var c = d.config, sm = d.summary, p = d.product;
    var h = '';
    h += '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">신년운세 · ' + esc(d.pack ? d.pack.name : d.year) + '</h3>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + d.years.map(function (y) { return '<button class="btn' + (y === d.year ? ' main' : '') + '" data-year="' + y + '">' + y + '</button>'; }).join('') +
      '<span class="muted" style="font-size:.82rem">연도 추가: report/newyear/years/YYYY/pack.js 를 만들고 서버 목록(functions/_newyear-runtime.js)에 넣으면 여기 나타나요.</span></div>' +
      (S.msg ? '<p style="margin:8px 0 0;color:' + (S.err ? '#FFB4A0' : 'var(--gold)') + '">' + esc(S.msg) + '</p>' : '') + '</div>';
    // 공개 범위
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px;color:var(--gold)">공개 범위·맛보기·소개</h3>' +
      Object.keys(VIS).map(function (k) { return '<label style="display:block;margin:4px 0"><input type="radio" name="nyVis" value="' + k + '"' + (c.visibility === k ? ' checked' : '') + '> <b>' + VIS[k][0] + '</b> <span class="muted">— ' + VIS[k][1] + '</span></label>'; }).join('') +
      '<p class="muted" style="margin:10px 0 4px">맛보기로 보여 줄 부분(유료일 때)</p>' +
      TEASER.map(function (t) { return '<label style="margin-right:12px"><input type="checkbox" name="nyTeaser" value="' + t[0] + '"' + (c.teaser.indexOf(t[0]) >= 0 ? ' checked' : '') + '> ' + t[1] + '</label>'; }).join('') +
      '<p class="muted" style="margin:10px 0 4px">화면 첫머리 소개(비우면 기본 소개)</p><textarea id="nyIntro" rows="3" style="width:100%" maxlength="600">' + esc(c.intro || '') + '</textarea>' +
      '<label style="display:block;margin:8px 0"><input type="checkbox" id="nyPreviewMode"' + (c.contentMode === 'preview' ? ' checked' : '') + '> 관리자 화면에서 검수 전 문구까지 보기(사용자에게는 영향 없음)</label>' +
      entryHtml(c, d) +
      '<button class="btn main" id="nySaveCfg">공개 설정 저장</button></div>';
    // 상품
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">상품</h3>' + (p ? '<p style="margin:0">' + esc(p.name) + ' · <b>' + (p.price > 0 ? won(p.price) : '가격 미정(판매 안 함)') + '</b> · ' + (p.onSale ? '✅ 판매 중' : '⬜ 판매 전') + '</p><p class="muted" style="margin:4px 0 0">가격·판매 여부는 <b>판매·타임라인 › 결제·상품</b> 화면의 ' + esc(p.id) + ' 줄에서 바꿔요. 주문·환불도 그 화면에서 확인해요.</p>' : '<p class="muted">상품 정보가 없습니다.</p>') + '</div>';
    // 검수 현황
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">검수 현황 <span class="muted" style="font-size:.85rem">저장 번호 ' + d.rev + (d.updatedAt ? ' · ' + esc(d.by || '') + ' ' + esc(d.updatedAt.slice(0, 16).replace('T', ' ')) : '') + '</span></h3>' +
      '<p style="margin:0">토정 현대어: 올해 나올 수 있는 괘 ' + sm.modern.inYear + '개 중 <b>' + sm.modern.reviewedInYear + '</b>개 승인 (전체 ' + sm.modern.total + '괘 중 ' + sm.modern.reviewed + ')<br>사주 문구 블록: ' + sm.blocks.total + '개 중 <b>' + sm.blocks.reviewed + '</b>개 승인</p>' +
      '<p class="muted" style="margin:6px 0 0">공개 화면에는 승인한 것만 나가요. 승인하지 않은 토정 괘는 원문만, 승인하지 않은 사주 블록은 빠져요. 승인 뒤 고치면 다시 검수 상태가 돼요.</p></div>';
    // 토정 현대어 목록
    var mods = d.modern.filter(function (m) { return S.filter === 'all' ? true : S.filter === 'todo' ? m.status !== 'reviewed' && m.inYear : m.inYear; });
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">토정비결 현대어 풀이</h3>' +
      '<div class="row" style="gap:6px;margin-bottom:6px">' + [['year', '올해 나오는 괘'], ['todo', '올해·미승인'], ['all', '전체 144']].map(function (f) { return '<button class="btn' + (S.filter === f[0] ? ' main' : '') + '" data-mfilter="' + f[0] + '">' + f[1] + '</button>'; }).join('') +
      '<button class="btn" id="nyBulkModern">보이는 괘 모두 승인</button></div>' +
      '<div style="max-height:320px;overflow:auto"><table style="width:100%"><tr><th>괘</th><th>방향</th><th>핵심</th><th>상태</th></tr>' +
      mods.map(function (m) { return '<tr data-gua="' + m.gua + '" style="cursor:pointer"><td>' + m.gua + (m.source !== 'kyu1077' ? ' <span class="muted">보충</span>' : '') + '</td><td>' + esc(TONE[m.tone] || m.tone) + '</td><td>' + esc(m.theme) + (m.edited ? ' <span class="muted">(수정)</span>' : '') + '</td><td>' + (m.status === 'reviewed' ? '✅ 승인' : '초안') + '</td></tr>'; }).join('') + '</table></div>' +
      (S.gua ? guaPanel() : '') + '</div>';
    // 사주 블록
    var sections = []; d.blocks.forEach(function (b) { if (sections.indexOf(b.section) < 0) sections.push(b.section); });
    var bl = d.blocks.filter(function (b) { return S.bfilter === 'all' || b.section === S.bfilter; });
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">사주 조건 문구</h3>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">' + ['all'].concat(sections).map(function (s) { return '<button class="btn' + (S.bfilter === s ? ' main' : '') + '" data-bfilter="' + s + '">' + (s === 'all' ? '전체' : s) + '</button>'; }).join('') +
      '<button class="btn" id="nyBulkBlocks">보이는 블록 모두 승인</button></div>' +
      '<div style="max-height:320px;overflow:auto"><table style="width:100%"><tr><th>id</th><th>첫 문장</th><th>상태</th></tr>' +
      bl.map(function (b) { return '<tr data-block="' + esc(b.id) + '" style="cursor:pointer"><td style="white-space:nowrap">' + esc(b.id) + '</td><td>' + esc(b.hook) + (b.edited ? ' <span class="muted">(수정)</span>' : '') + '</td><td>' + (b.status === 'reviewed' ? '✅' : '초안') + '</td></tr>'; }).join('') + '</table></div>' +
      (S.block ? blockPanel() : '') + '</div>';
    // 미리보기
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">시험 사주로 미리보기</h3>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><input id="nyPvDate" type="date" value="1990-05-15"> <input id="nyPvTime" type="time" value="14:30"> <select id="nyPvG"><option value="M">남</option><option value="F">여</option></select>' +
      '<select id="nyPvMode"><option value="public">공개 화면 그대로</option><option value="preview">검수 전 포함</option></select><button class="btn main" id="nyPv">미리보기</button>' +
      '<a class="btn" href="/report/newyear/?preview=1" target="_blank" rel="noopener">사용자 화면 새 창</a></div>' + (S.preview || '') + '</div>';
    // 이력
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">최근 변경</h3>' + (d.history.length ? '<ul style="margin:0;padding-left:18px">' + d.history.map(function (x) { return '<li class="muted">' + esc((x.at || '').slice(0, 16).replace('T', ' ')) + ' · ' + esc(x.by) + ' · ' + esc(x.kind) + ' ' + esc(x.target) + ' → ' + esc(x.action) + '</li>'; }).join('') + '</ul>' : '<p class="muted">아직 없음</p>') + '</div>';
    root.innerHTML = h;
  }
  function lines(a) { return (a || []).join('\n'); }
  function guaPanel() {
    var g = S.gua, m = g.merged, o = g.original, s = g.supplement;
    var orig = o ? '<p><b>' + esc(o.guaxiang.join(' ')) + '</b> · ' + esc(o.zhouyi) + ' · 註解 ' + esc(o.zhujie) + '</p><p class="muted">卦辭: ' + o.guaci.map(function (p) { return esc(p.join(' ')); }).join(' / ') + '</p>' +
      '<details><summary class="muted">월별 원문</summary>' + Object.keys(o.months).map(function (k) { return '<div class="muted">' + MONTH[k] + ': ' + o.months[k].map(function (p) { return esc(p.join(' ')); }).join(' / ') + '</div>'; }).join('') + '</details>'
      : s ? '<p class="muted">보충본(국립중앙도서관 필사본) 앞부분: ' + esc(s.front.join(' ')) + '<br>뒷부분: ' + esc(s.back.join(' ')) + '</p>' : '';
    var monthsEd = m.months ? Object.keys(m.months).map(function (k) { var x = m.months[k]; return '<div class="row" style="gap:4px;margin:2px 0"><span style="width:44px">' + k + '월</span><select data-mt="' + k + '">' + Object.keys(TONE).map(function (t) { return '<option value="' + t + '"' + (x.tone === t ? ' selected' : '') + '>' + TONE[t] + '</option>'; }).join('') + '</select><input data-mg="' + k + '" style="flex:1" value="' + esc(x.gist) + '"></div>'; }).join('') : '<p class="muted">' + esc(m.monthsNote || '월별 풀이 없음') + '</p>';
    return '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><h4 style="margin:0 0 6px">' + g.gua + '괘 · ' + (g.status === 'reviewed' ? '✅ 승인' : '초안') + (g.by ? ' <span class="muted">' + esc(g.by) + '</span>' : '') + '</h4>' + orig +
      '<div class="row" style="gap:6px"><label>방향 <select id="nyGTone">' + Object.keys(TONE).map(function (t) { return '<option value="' + t + '"' + (m.tone === t ? ' selected' : '') + '>' + TONE[t] + '</option>'; }).join('') + '</select></label><label style="flex:1">핵심 <input id="nyGTheme" style="width:100%" value="' + esc(m.theme) + '"></label></div>' +
      '<p class="muted" style="margin:6px 0 2px">개요(한 줄에 한 문장)</p><textarea id="nyGOv" rows="3" style="width:100%">' + esc(lines(m.overview)) + '</textarea>' +
      '<p class="muted" style="margin:6px 0 2px">좋은 점</p><textarea id="nyGGood" rows="2" style="width:100%">' + esc(lines(m.good)) + '</textarea>' +
      '<p class="muted" style="margin:6px 0 2px">조심할 점</p><textarea id="nyGCau" rows="2" style="width:100%">' + esc(lines(m.caution)) + '</textarea>' +
      '<p class="muted" style="margin:6px 0 2px">월별 요지</p>' + monthsEd + (m.refs ? '<p class="muted" style="font-size:.8rem">근거 구: ' + esc(m.refs) + '</p>' : '') +
      '<div class="row" style="gap:6px;margin-top:8px"><button class="btn" id="nyGSave">수정 저장(초안)</button><button class="btn main" id="nyGOk">' + (g.status === 'reviewed' ? '수정 저장 후 승인 유지' : '수정 저장 + 승인') + '</button>' +
      (g.status === 'reviewed' ? '<button class="btn" id="nyGUn">승인 취소</button>' : '') + (g.edits && Object.keys(g.edits).length ? '<button class="btn" id="nyGReset">수정 지우기(초안으로)</button>' : '') + '<button class="btn" id="nyGClose">닫기</button></div></div>';
  }
  function blockPanel() {
    var b = S.block, src = Object.assign({}, b.draft, b.edits || {}), fields = ['hook', 'situation', 'scene', 'advice', 'line'].filter(function (k) { return src[k] != null; });
    return '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><h4 style="margin:0 0 6px">' + esc(b.id) + ' · ' + (b.status === 'reviewed' ? '✅ 승인' : '초안') + '</h4>' +
      '<p class="muted" style="margin:0 0 6px">조건: ' + esc(JSON.stringify(b.draft.when || {})) + '</p>' +
      fields.map(function (k) { return '<p class="muted" style="margin:6px 0 2px">' + k + '</p><textarea data-bf="' + k + '" rows="2" style="width:100%">' + esc(src[k]) + '</textarea>'; }).join('') +
      (b.draft.alt && !(b.edits && Object.keys(b.edits).length) ? '<p class="muted" style="font-size:.8rem">다른 판(alt): ' + esc(b.draft.alt.hook || '') + ' — 본문을 고치면 고친 판만 쓰여요.</p>' : '') +
      '<div class="row" style="gap:6px;margin-top:8px"><button class="btn" id="nyBSave">수정 저장(초안)</button><button class="btn main" id="nyBOk">' + (b.status === 'reviewed' ? '승인 유지' : '승인') + '</button>' +
      (b.status === 'reviewed' ? '<button class="btn" id="nyBUn">승인 취소</button>' : '') + (b.edits && Object.keys(b.edits).length ? '<button class="btn" id="nyBReset">수정 지우기</button>' : '') + '<button class="btn" id="nyBClose">닫기</button></div></div>';
  }
  function openGua(g) { return api('GET', '?gua=' + g).then(function (d) { S.gua = d; draw(); }).catch(function (e) { msg(e.message, true); }); }
  function openBlock(id) { return api('GET', '?block=' + encodeURIComponent(id)).then(function (d) { S.block = d; draw(); }).catch(function (e) { msg(e.message, true); }); }
  function guaEdits() {
    var sp = function (id) { return root.querySelector('#' + id).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
    var e = { tone: root.querySelector('#nyGTone').value, theme: root.querySelector('#nyGTheme').value, overview: sp('nyGOv'), good: sp('nyGGood'), caution: sp('nyGCau') };
    var ms = root.querySelectorAll('[data-mg]'); if (ms.length) { e.months = {}; ms.forEach(function (i) { var k = i.dataset.mg; e.months[k] = { gist: i.value, tone: root.querySelector('[data-mt="' + k + '"]').value }; }); }
    return e;
  }
  function blockEdits() { var e = {}; root.querySelectorAll('[data-bf]').forEach(function (t) { e[t.dataset.bf] = t.value; }); return e; }
  function preview() {
    var dt = root.querySelector('#nyPvDate').value.split('-'), tm = root.querySelector('#nyPvTime').value.split(':');
    var birth = { year: +dt[0], month: +dt[1], day: +dt[2], hour: tm[0] === '' ? null : +tm[0], minute: +(tm[1] || 0), gender: root.querySelector('#nyPvG').value, calendar: 'solar' };
    S.preview = '<p class="muted">계산 중…</p>'; draw();
    fetch('/api/newyear/reading', { method: 'POST', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-content-mode': root.querySelector('#nyPvMode').value }, body: JSON.stringify({ birth: birth, year: S.year }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok || !d.reading) { S.preview = '<p style="color:#FFB4A0">미리보기 실패: ' + esc(d.message || d.error || '') + '</p>'; return draw(); }
        var r = d.reading, cnt = 0, empty = [];
        r.chapters.forEach(function (c) { var n = (c.paras || []).length + (c.sections || []).reduce(function (a, s) { return a + s.paras.length; }, 0) + (c.months || []).reduce(function (a, m) { return a + (m.paras || []).length; }, 0); cnt += n; if (n < 2) empty.push(c.title); });
        S.preview = '<p>' + r.tojeong.gua + '괘 · ' + esc(r.tojeong.zhouyi || '보충본') + ' · 모드 ' + esc(d.admin && d.admin.mode) + ' · 문단 ' + cnt + '개 · 토정 현대어 ' + (r.tojeong.modernShown ? '보임' : '숨김(미승인)') + '</p>' +
          (empty.length ? '<p style="color:#E2B25A">문단이 거의 없는 장: ' + esc(empty.join(', ')) + ' — 승인한 문구가 부족해요.</p>' : '') +
          '<details><summary class="muted">장별 첫 문장</summary>' + r.chapters.map(function (c) { var f = (c.paras || [])[0] || ((c.sections || [])[0] || {}).paras && c.sections[0].paras[0]; return '<div><b>' + esc(c.title) + '</b> ' + esc(f ? f.text : '(비어 있음)') + '</div>'; }).join('') + '</details>';
        draw();
      }).catch(function () { S.preview = '<p style="color:#FFB4A0">연결 실패</p>'; draw(); });
  }

  // ── 클릭
  function onClick(e) {
    var t = e.target; if (!root || !root.contains(t)) return;
    var q = function (sel) { return t.closest(sel); };
    if (q('[data-year]')) { S.year = +q('[data-year]').dataset.year; S.gua = S.block = null; return load(); }
    if (q('[data-mfilter]')) { S.filter = q('[data-mfilter]').dataset.mfilter; return draw(); }
    if (q('[data-bfilter]')) { S.bfilter = q('[data-bfilter]').dataset.bfilter; return draw(); }
    if (q('tr[data-gua]')) return openGua(+q('tr[data-gua]').dataset.gua);
    if (q('tr[data-block]')) return openBlock(q('tr[data-block]').dataset.block);
    var id = t.id;
    if (id === 'nySaveCfg') {
      var vis = (root.querySelector('input[name=nyVis]:checked') || {}).value, teaser = [].map.call(root.querySelectorAll('input[name=nyTeaser]:checked'), function (x) { return x.value; });
      if (vis === 'paid' && !(S.data.product && S.data.product.price > 0) && !confirm('가격이 0원이라 유료로 바꾸면 아무도 구매할 수 없어요. 그래도 저장할까요?')) return;
      if (vis !== 'closed' && S.data.summary.modern.reviewedInYear === 0 && !confirm('승인한 토정 현대어가 아직 없어요. 공개 화면에는 원문만 나가요. 그래도 공개할까요?')) return;
      return post({ action: 'config', year: S.year, visibility: vis, teaser: teaser, intro: root.querySelector('#nyIntro').value, contentMode: root.querySelector('#nyPreviewMode').checked ? 'preview' : 'public',
        entry: { show: root.querySelector('#nyEntryShow').checked, kick: root.querySelector('#nyEntryKick').value, title: root.querySelector('#nyEntryTitle').value, line: root.querySelector('#nyEntryLine').value, go: root.querySelector('#nyEntryGo').value } }, '공개 설정을 저장했어요.');
    }
    if (id === 'nyBulkModern' || id === 'nyBulkBlocks') {
      var kind = id === 'nyBulkModern' ? 'modern' : 'blocks';
      var ids = kind === 'modern' ? S.data.modern.filter(function (m) { return S.filter === 'all' || (S.filter === 'todo' ? m.status !== 'reviewed' && m.inYear : m.inYear); }).map(function (m) { return m.gua; })
        : S.data.blocks.filter(function (b) { return S.bfilter === 'all' || b.section === S.bfilter; }).map(function (b) { return b.id; });
      if (!confirm(ids.length + '개를 한꺼번에 승인할까요? 사람이 읽고 확인한 것만 승인해 주세요.')) return;
      return post({ action: 'bulk', kind: kind, ids: ids, status: 'reviewed' }, ids.length + '개를 승인했어요.');
    }
    if (id === 'nyGSave') return post({ action: 'modern', gua: S.gua.gua, edits: guaEdits() }, S.gua.gua + '괘 수정을 저장했어요(초안).');
    if (id === 'nyGOk') return post({ action: 'modern', gua: S.gua.gua, edits: guaEdits(), status: 'reviewed' }, S.gua.gua + '괘를 승인했어요.');
    if (id === 'nyGUn') return post({ action: 'modern', gua: S.gua.gua, status: 'draft' }, '승인을 취소했어요.');
    if (id === 'nyGReset') return post({ action: 'modern', gua: S.gua.gua, edits: null, status: 'draft' }, '수정을 지우고 초안으로 돌렸어요.');
    if (id === 'nyGClose') { S.gua = null; return draw(); }
    if (id === 'nyBSave') return post({ action: 'block', id: S.block.id, edits: blockEdits() }, '블록 수정을 저장했어요(초안).');
    if (id === 'nyBOk') return post({ action: 'block', id: S.block.id, edits: blockEdits(), status: 'reviewed' }, '블록을 승인했어요.');
    if (id === 'nyBUn') return post({ action: 'block', id: S.block.id, status: 'draft' }, '승인을 취소했어요.');
    if (id === 'nyBReset') return post({ action: 'block', id: S.block.id, edits: null, status: 'draft' }, '수정을 지웠어요.');
    if (id === 'nyBClose') { S.block = null; return draw(); }
    if (id === 'nyPv') return preview();
  }
  document.addEventListener('click', onClick);
  window.V2Newyear = { open: function (password) { pw = password; root = document.getElementById('t-newyear'); if (!root) return; S.msg = ''; draw(); load(); } };
})();
