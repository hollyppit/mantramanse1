/* 관리자 "풀이 지식 시스템" — 풀이 지식 · 풀이 설계 · AI 규칙 · 풀이 실험실. 저장은 /api/ik (KV 'ik:' 키). 새 명리 계산은 없다(조건은 엔진이 실제로 주는 값만).
   비개발자용: JSON·SQL 을 보여 주지 않고 드롭다운·칩·체크로 입력한다. 탭: ikknow(풀이 지식+대시보드) · ikdesign · ikrules · iklab. index.html 의 showTab 이 V2IK.open(탭, 비밀번호) 를 부른다. */
(function () {
  'use strict';
  var R = window.ReportV2, C = window.V2Content, esc = C.esc, toast = C.toast;
  var PANE = null; // 기존 관리자와 id 가 겹치지 않도록(eTitle·ePri 등) 검색 범위를 현재 풀이 지식 패널로 제한한다
  var $ = function (s, e) { return (e || PANE || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || PANE || document).querySelectorAll(s)); };
  var PW = '', G = { meta: null, items: null, view: 'list', cur: null, f: { q: '', domain: '', status: '', reviewed: '', conf: '', dm: '', tag: '' }, design: null, dDomain: 'MONEY', lab: null, focus: null };
  var DOMAIN_ORDER = ['SELF', 'MONEY', 'CAREER', 'LOVE', 'MARRIAGE', 'RELATIONSHIP', 'TIMING', 'ACTION'];
  var DKO = { SELF: '성격', MONEY: '재물', CAREER: '직업', LOVE: '연애', MARRIAGE: '결혼', RELATIONSHIP: '관계', TIMING: '시기', ACTION: '행동/개운' };
  var STATUS_KO = { draft: '임시저장', review: '검수 대기', approved: '검수 완료', published: '게시', archived: '보관' };
  var CONF_KO = { high: '높음', mid: '보통', low: '낮음' }, LV = { weak: '약함', mid: '보통', strong: '강함' };
  var STEMS = '갑을병정무기경신임계'.split(''), BRANCHES = '자축인묘진사오미신유술해'.split(''), ELS = ['목', '화', '토', '금', '수'], GRPS = ['비겁', '식상', '재성', '관성', '인성'];
  var TENG = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'], SEAS = ['기회기', '확장기', '수확기', '축적기', '전환기', '방어기'];
  var PILLARS = (function () { var a = []; for (var i = 0; i < 60; i++) a.push(STEMS[i % 10] + BRANCHES[i % 12]); return a; })();
  var DOMAIN_SECTIONS = { MONEY: 1 };
  // 조건 필드: [이름, 종류, 선택지]  종류: opts(체크) | text(쉼표 입력) | map(강약)
  var F = {
    dayMaster: ['일간', 'opts', STEMS], dayPillar: ['일주', 'text', PILLARS], strength: ['신강/신약', 'opts', ['신강', '중화', '신약']], hasRoot: ['통근', 'opts', ['있음', '없음']],
    monthBranch: ['월령(월지)', 'opts', BRANCHES], season: ['태어난 계절', 'opts', ['봄', '여름', '가을', '겨울']], dayBranch: ['일지(배우자 자리)', 'opts', BRANCHES], yongEl: ['용신 오행', 'opts', ELS],
    pattern: ['격국·구조', 'text', ['관살혼잡', '상관견관', '상관패인', '군겁쟁재']], star: ['신살', 'text', ['천을귀인', '도화살', '역마살', '화개살', '괴강살', '현침살', '천덕귀인', '월덕귀인']], relation: ['합충형파해', 'text', ['육합', '방합', '삼합', '충', '형', '파', '해', '원진']],
    daewoonSeason: ['현재 대운 흐름', 'opts', SEAS], seunSeason: ['올해 세운 흐름', 'opts', SEAS], monthSeason: ['이달 월운 흐름', 'opts', SEAS], futureSeason3: ['앞으로 3년 중 포함', 'opts', SEAS], futureSeason5: ['앞으로 5년 중 포함', 'opts', SEAS],
    el: ['오행 강약', 'map', ELS], group: ['십성군 강약', 'map', GRPS], tenGod: ['십성 10종 강약', 'map', TENG]
  };
  var BASE_FIELDS = ['dayMaster', 'dayPillar', 'strength', 'hasRoot', 'el', 'group'];

  var css = document.createElement('style');
  css.textContent = '.ik-dash{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:12px}.ik-dash .n{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.ik-dash b{display:block;font-size:1.25rem;color:var(--gold)}.ik-dash span{font-size:.76rem;color:var(--ink3)}' +
    '.ik-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.ik-bar select,.ik-bar input{width:auto;min-width:110px}.ik-bar input.q{flex:1;min-width:200px}.ik-chipbtn{border-radius:999px;padding:4px 12px;font-size:.82rem}.ik-chipbtn.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.ik-row{display:grid;grid-template-columns:minmax(0,1.6fr) 90px minmax(0,1.4fr) 70px 70px 80px 84px;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer;font-size:.84rem}.ik-row:hover{background:#12162a}.ik-row.h{color:var(--ink3);font-size:.75rem;cursor:default}.ik-row.h:hover{background:none}.ik-row small{color:var(--ink3);display:block}@media(max-width:900px){.ik-row{grid-template-columns:1fr 70px 80px}.ik-row>:nth-child(3),.ik-row>:nth-child(4),.ik-row>:nth-child(7){display:none}}' +
    '.ik-st{display:inline-block;font-size:.72rem;padding:0 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink2)}.ik-st.published{border-color:#62C2AE;color:#7FE0BC}.ik-st.approved{border-color:var(--gold);color:var(--gold)}.ik-st.review{border-color:#B8742A;color:#FFC080}.ik-st.draft{color:var(--ink3)}.ik-st.archived{opacity:.5}.ik-ok{color:#7FE0BC}.ik-no{color:var(--ink3)}' +
    '.ik-sec{margin:18px 0 6px;font-family:"Noto Serif KR",serif;color:var(--gold);font-size:1rem}.ik-sec small{display:block;color:var(--ink3);font-family:inherit;font-size:.78rem;margin-top:2px}.ik-f{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.ik-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:700px){.ik-g2{grid-template-columns:1fr}}' +
    '.ik-cond{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0;background:var(--bg)}.ik-cond>.t{display:flex;justify-content:space-between;align-items:center;font-size:.82rem;color:var(--gold);margin-bottom:4px}.ik-cond .t button{padding:0 8px;font-size:.78rem}.ik-opts{display:flex;flex-wrap:wrap;gap:4px 10px}.ik-opts label{display:flex;gap:4px;align-items:center;font-size:.84rem;cursor:pointer}.ik-opts input{width:auto}.ik-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.ik-map label{display:flex;gap:6px;align-items:center;font-size:.84rem}.ik-map select{width:auto;padding:3px 6px}' +
    '.ik-mod{border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:#0e1120}.ik-foot{position:sticky;bottom:0;background:var(--bg2);border-top:1px solid var(--line);padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:18px;z-index:5}' +
    '.ik-dz{display:grid;grid-template-columns:24px minmax(0,1fr) 70px 70px 70px;gap:6px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);margin:4px 0;font-size:.86rem}.ik-dz.off{opacity:.5}.ik-dz.over{border-color:var(--gold)}.ik-dz .gr{cursor:grab;color:var(--ink3)}.ik-dz input[type=text]{padding:3px 8px}' +
    '.ik-lab{display:grid;grid-template-columns:240px minmax(0,1fr) minmax(0,1.2fr);gap:12px;align-items:start}@media(max-width:1250px){.ik-lab{grid-template-columns:220px minmax(0,1fr)}.ik-lab>:nth-child(3){grid-column:1/-1}}@media(max-width:800px){.ik-lab{grid-template-columns:1fr}}.ik-lab .card{padding:12px;max-height:80vh;overflow:auto}' +
    '.ik-k{border:1px solid var(--line);border-radius:8px;padding:7px 9px;margin:5px 0;font-size:.82rem;background:var(--bg)}.ik-k.off{opacity:.55}.ik-k b{color:var(--ink)}.ik-k .why{margin-top:3px;color:var(--ink3);font-size:.74rem}.ik-k.cf{border-color:#B8742A}.ik-kv{display:grid;grid-template-columns:78px 1fr;gap:2px 8px;font-size:.8rem;margin:2px 0}.ik-kv span{color:var(--ink3)}' +
    '.ik-p{padding:8px 10px;margin:4px 0;border-radius:8px;border:1px solid transparent;cursor:pointer;line-height:1.75;font-size:.9rem}.ik-p:hover{border-color:var(--gold-d);background:#12162a}.ik-p.sel{border-color:var(--gold);background:#1c1a12}.ik-p small{display:block;color:var(--ink3);font-size:.72rem;margin-top:2px}.ik-sh{margin:14px 0 2px;color:var(--gold);font-family:"Noto Serif KR",serif}.ik-ins{color:var(--ink3);font-size:.82rem;font-style:italic;padding:6px 10px}' +
    '.ik-q{padding:6px 10px;border-radius:8px;margin-bottom:8px;font-size:.82rem;border:1px solid var(--line)}.ik-q.PASS{border-color:#62C2AE;color:#7FE0BC}.ik-q.WARNING{border-color:#B8742A;color:#FFC080}.ik-q.FAIL{border-color:#FF8A78;color:#FF9C8C}.ik-q ul{margin:4px 0 0 18px;padding:0}' +
    '.ik-dr{position:fixed;right:0;top:0;bottom:0;width:min(440px,94vw);background:var(--bg2);border-left:1px solid var(--gold-d);z-index:60;overflow:auto;padding:16px;box-shadow:-8px 0 30px rgba(0,0,0,.5)}.ik-dr h4{margin:14px 0 4px;color:var(--gold);font-size:.85rem;letter-spacing:.08em}';
  document.head.appendChild(css);

  function api(path, opt) { return C.api(path, opt); }
  function post(a, body) { return api('/api/ik?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  function loadMeta() { return api('/api/ik?a=meta').then(function (m) { G.meta = m; G.design = JSON.parse(JSON.stringify(m.design || {})); return m; }); }
  function loadItems() { return api('/api/ik?a=list').then(function (d) { G.items = d.items; return d.items; }); }
  var tag = function (cls, t) { return '<span class="ik-st ' + cls + '">' + esc(t) + '</span>'; };
  var date = function (s) { return s ? String(s).slice(0, 10) : ''; };

  /* ───────── 조건 요약 텍스트 ───────── */
  function condText(c, max) {
    var out = []; Object.keys(c || {}).forEach(function (k) { var d = F[k]; if (!d) return; var v = c[k];
      if (d[1] === 'map') Object.keys(v).forEach(function (kk) { out.push(kk + ' ' + LV[v[kk]]); }); else out.push(d[0] === '일간' ? v.join('/') : (d[0] + ' ' + v.join('/'))); });
    return (max ? out.slice(0, max) : out).join(' · ') || '조건 없음(일반론)';
  }

  /* ───────── 조건 빌더(조건·제외·보정 공용) ───────── */
  function condBuilder(box, conds, defaults) {
    var show = {}; Object.keys(conds).forEach(function (k) { show[k] = 1; }); (defaults || []).forEach(function (k) { show[k] = 1; });
    function draw() {
      var html = Object.keys(F).filter(function (k) { return show[k]; }).map(function (k) { return fieldHtml(k); }).join('');
      var rest = Object.keys(F).filter(function (k) { return !show[k]; });
      html += rest.length ? '<div class="ik-bar"><select data-add><option value="">+ 조건 추가…</option>' + rest.map(function (k) { return '<option value="' + k + '">' + F[k][0] + '</option>'; }).join('') + '</select></div>' : '';
      box.innerHTML = html; bind();
    }
    function fieldHtml(k) {
      var d = F[k], v = conds[k], h = '<div class="ik-cond" data-k="' + k + '"><div class="t"><span>' + d[0] + '</span><button type="button" data-rm="' + k + '">조건 빼기</button></div>';
      if (d[1] === 'opts') h += '<div class="ik-opts">' + d[2].map(function (o) { return '<label><input type="checkbox" value="' + o + '"' + ((v || []).indexOf(o) >= 0 ? ' checked' : '') + '>' + o + '</label>'; }).join('') + '</div><div class="muted" style="font-size:.74rem;margin-top:3px">고른 값 중 하나라도 맞으면 통과 · 아무것도 안 고르면 이 조건은 없는 것으로 봅니다</div>';
      else if (d[1] === 'text') h += '<input type="text" data-txt placeholder="쉼표로 구분 (예: ' + d[2].slice(0, 3).join(', ') + ')" value="' + esc((v || []).join(', ')) + '" list="ikdl-' + k + '"><datalist id="ikdl-' + k + '">' + d[2].map(function (o) { return '<option value="' + o + '">'; }).join('') + '</datalist>';
      else h += '<div class="ik-map">' + d[2].map(function (o) { var cur = v && v[o] || ''; return '<label>' + o + '<select data-lv="' + o + '"><option value="">상관없음</option>' + Object.keys(LV).map(function (l) { return '<option value="' + l + '"' + (cur === l ? ' selected' : '') + '>' + LV[l] + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>';
      return h + '</div>';
    }
    function bind() {
      $$('.ik-cond', box).forEach(function (el) {
        var k = el.dataset.k, d = F[k];
        $('[data-rm]', el).onclick = function () { delete conds[k]; delete show[k]; draw(); };
        if (d[1] === 'opts') $$('input[type=checkbox]', el).forEach(function (cb) { cb.onchange = function () { var a = $$('input:checked', el).map(function (x) { return x.value; }); if (a.length) conds[k] = a; else delete conds[k]; }; });
        else if (d[1] === 'text') $('[data-txt]', el).oninput = function () { var a = this.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); if (a.length) conds[k] = a; else delete conds[k]; };
        else $$('select[data-lv]', el).forEach(function (s) { s.onchange = function () { var m = conds[k] || {}; if (s.value) m[s.dataset.lv] = s.value; else delete m[s.dataset.lv]; if (Object.keys(m).length) conds[k] = m; else delete conds[k]; }; });
      });
      var add = $('[data-add]', box); if (add) add.onchange = function () { if (add.value) { show[add.value] = 1; draw(); } };
    }
    draw();
  }

  /* ═════ ① 풀이 지식 ═════ */
  function knowOpen() {
    var box = document.getElementById('t-ikknow'); box.innerHTML = '<p class="muted">불러오는 중…</p>';
    Promise.all([G.meta ? 0 : loadMeta(), loadItems()]).then(function () { G.view = 'list'; drawList(); }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function dashboard() {
    var it = G.items, n = function (f) { return it.filter(f).length; }, m = G.meta;
    var cards = [['풀이 지식', it.length], ['게시', n(function (x) { return x.status === 'published'; })], ['검수 완료', n(function (x) { return x.reviewed; })], ['검수 대기', n(function (x) { return x.status === 'review' || (x.status === 'draft' && !x.reviewed); })], ['AI 초안', n(function (x) { return x.sourceType === 'AI_DRAFT'; })]];
    DOMAIN_ORDER.forEach(function (d) { cards.push([DKO[d], n(function (x) { return x.domain === d; })]); });
    var recent = it.slice().sort(function (a, b) { return (b.updatedAt || '') < (a.updatedAt || '') ? -1 : 1; }).slice(0, 5);
    return '<div class="ik-dash">' + cards.map(function (c) { return '<div class="n"><b>' + c[1] + '</b><span>' + esc(c[0]) + '</span></div>'; }).join('') + '</div>' +
      '<p class="muted" style="margin:0 0 8px;font-size:.8rem">버전 · 지식 ' + esc(m.meta.k) + ' / 설계 ' + esc(m.meta.d) + ' / 규칙 ' + esc(m.meta.r) + (recent.length ? ' · 최근 수정: ' + recent.map(function (r) { return '<a href="#" data-open="' + esc(r.id) + '">' + esc(r.title || r.id) + '</a>'; }).join(', ') : '') + '</p>';
  }
  function filtered() {
    var f = G.f, toks = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return G.items.filter(function (x) {
      if (f.domain && x.domain !== f.domain) return false; if (f.status && x.status !== f.status) return false;
      if (f.reviewed && String(!!x.reviewed) !== f.reviewed) return false; if (f.conf && x.confidence !== f.conf) return false;
      if (f.dm && !((x.conditions.dayMaster || []).indexOf(f.dm) >= 0 || (x.conditions.dayPillar || []).some(function (p) { return p[0] === f.dm; }))) return false;
      if (f.tag && (x.tags || []).join(' ').toLowerCase().indexOf(f.tag.toLowerCase()) < 0) return false;
      var hay = (x.id + ' ' + x.text + ' ' + DKO[x.domain] + ' ' + x.domain + ' ' + x.subDomain + ' ' + condText(x.conditions)).toLowerCase();
      return toks.every(function (t) { return hay.indexOf(t) >= 0; });
    }).sort(function (a, b) { return (b.updatedAt || '') < (a.updatedAt || '') ? -1 : 1; });
  }
  function drawList() {
    var box = document.getElementById('t-ikknow'), f = G.f;
    box.innerHTML = dashboard() + '<div class="card"><div class="ik-bar"><input type="text" class="q" id="ikQ" placeholder="자연어 검색 — 예: 경금 신약 관성 · 재물 비겁 · 경오 연애" value="' + esc(f.q) + '"><button class="pri" id="ikNew">+ 새 풀이 추가</button></div>' +
      '<div class="ik-bar"><button class="ik-chipbtn' + (!f.domain ? ' on' : '') + '" data-d="">전체</button>' + DOMAIN_ORDER.map(function (d) { return '<button class="ik-chipbtn' + (f.domain === d ? ' on' : '') + '" data-d="' + d + '">' + DKO[d] + '</button>'; }).join('') + '</div>' +
      '<div class="ik-bar"><select id="ikFs"><option value="">게시 상태 전체</option>' + Object.keys(STATUS_KO).map(function (s) { return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + STATUS_KO[s] + '</option>'; }).join('') + '</select>' +
      '<select id="ikFr"><option value="">검수 여부 전체</option><option value="true"' + (f.reviewed === 'true' ? ' selected' : '') + '>검수 완료</option><option value="false"' + (f.reviewed === 'false' ? ' selected' : '') + '>검수 전</option></select>' +
      '<select id="ikFc"><option value="">신뢰도 전체</option>' + Object.keys(CONF_KO).map(function (s) { return '<option value="' + s + '"' + (f.conf === s ? ' selected' : '') + '>신뢰도 ' + CONF_KO[s] + '</option>'; }).join('') + '</select>' +
      '<select id="ikFd"><option value="">일간 전체</option>' + STEMS.map(function (s) { return '<option' + (f.dm === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><input type="text" id="ikFt" placeholder="태그" value="' + esc(f.tag) + '" style="max-width:130px"></div>' +
      '<div id="ikRows"></div></div>';
    $('#ikNew', box).onclick = function () { G.cur = newItem(); G.view = 'edit'; G.isNew = true; drawEdit(); };
    $$('[data-d]', box).forEach(function (b) { b.onclick = function () { G.f.domain = b.dataset.d; drawList(); }; });
    $$('[data-open]', box).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); openItem(a.dataset.open); }; });
    $('#ikQ', box).oninput = function () { G.f.q = this.value; rows(); };
    [['#ikFs', 'status'], ['#ikFr', 'reviewed'], ['#ikFc', 'conf'], ['#ikFd', 'dm']].forEach(function (p) { $(p[0], box).onchange = function () { G.f[p[1]] = this.value; rows(); }; }); $('#ikFt', box).oninput = function () { G.f.tag = this.value; rows(); };
    rows();
    function rows() {
      var l = filtered(), el = $('#ikRows', box);
      el.innerHTML = '<div class="ik-row h"><span>풀이 · ID</span><span>분야</span><span>주요 조건</span><span>신뢰도</span><span>검수</span><span>상태</span><span>수정일</span></div>' + (l.length ? l.slice(0, 300).map(function (x) {
        return '<div class="ik-row" data-id="' + esc(x.id) + '"><span><b>' + esc(x.title || '(제목 없음)') + '</b><small>' + esc(x.id) + (x.hasMods ? ' · 보정 ' + x.hasMods : '') + '</small></span><span>' + DKO[x.domain] + '<small>' + esc(x.subDomain) + '</small></span><span class="muted">' + esc(condText(x.conditions, 4)) + '</span><span>' + CONF_KO[x.confidence] + '</span><span class="' + (x.reviewed ? 'ik-ok' : 'ik-no') + '">' + (x.reviewed ? '✓ 완료' : '검수 전') + '</span><span>' + tag(x.status, STATUS_KO[x.status]) + '</span><span class="muted">' + date(x.updatedAt) + '</span></div>'; }).join('') : '<p class="muted" style="padding:16px">조건에 맞는 풀이가 없습니다. “+ 새 풀이 추가”로 시작하세요.</p>') + (l.length > 300 ? '<p class="muted">상위 300개만 표시 — 검색·필터로 좁히세요 (전체 ' + l.length + '개)</p>' : '');
      $$('.ik-row[data-id]', el).forEach(function (r) { r.onclick = function () { openItem(r.dataset.id); }; });
    }
  }
  function openItem(id) {
    var s = G.items.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    api('/api/ik?a=get&domain=' + s.domain + '&id=' + encodeURIComponent(id)).then(function (d) { G.cur = d.item; G.view = 'edit'; G.isNew = false; drawEdit(); document.getElementById('t-ikknow').scrollIntoView(); }).catch(function (e) { toast(e.message, true); });
  }
  function nextId(domain) {
    var re = new RegExp('^' + domain + '-(\\d+)$'), mx = 0; G.items.forEach(function (x) { var m = re.exec(x.id); if (m) mx = Math.max(mx, +m[1]); });
    return domain + '-' + ('0000' + (mx + 1)).slice(-4);
  }
  function newItem(dom) {
    var d = dom || G.f.domain || 'MONEY';
    return { id: nextId(d), title: '', domain: d, subDomain: '', status: 'draft', priority: 10, stance: 'neutral', conditions: {}, modifiers: [], exclusions: {}, principle: '', interpretation: '', strengths: [], risks: [], behaviorPatterns: [], actions: [], realWorldExamples: { worker: '', business: '', freelance: '', love: '' },
      sourceType: 'internal', sourceReference: '', sourceMemo: '', confidence: 'mid', reviewed: false, reviewedAt: '', tags: [], version: 0 };
  }

  /* ───────── 편집 화면 ───────── */
  var lines = function (a) { return (a || []).join('\n'); }, fromLines = function (s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
  function sectionOptions(domain) {
    var dz = (G.design && G.design[domain] && G.design[domain].sections && G.design[domain].sections.length) ? G.design[domain] : G.meta.defaultDesign[domain];
    return dz.sections.map(function (s) { return '<option value="' + s.id + '">' + esc(s.title) + ' (' + s.id + ')</option>'; }).join('');
  }
  function drawEdit() {
    var box = document.getElementById('t-ikknow'), it = G.cur, ex = it.realWorldExamples || {};
    var sel = function (id, opts, cur) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    var secOpts = sectionOptions(it.domain);
    box.innerHTML = '<div class="ik-bar"><button id="ikBack">← 목록</button><b style="color:var(--gold)">' + (G.isNew ? '새 풀이 추가' : esc(it.id) + ' · 버전 ' + it.version) + '</b><span style="flex:1"></span>' + (G.isNew ? '' : '<button id="ikHist">변경 이력</button><button id="ikDup">복제</button>') + '</div>' +
      '<div class="card">' +
      '<div class="ik-sec">① 기본 정보</div><div class="ik-g2"><label class="ik-f">풀이 이름<input type="text" id="eTitle" value="' + esc(it.title) + '" placeholder="예: 경금 신강인데 재성이 약한 구조"></label><label class="ik-f">ID' + (G.isNew ? '<input type="text" id="eId" value="' + esc(it.id) + '">' : '<input type="text" value="' + esc(it.id) + '" disabled>') + '</label>' +
      '<label class="ik-f">분야' + sel('eDomain', DOMAIN_ORDER.map(function (d) { return [d, DKO[d] + ' (' + d + ')']; }), it.domain) + '</label><label class="ik-f">세부 분야(풀이 설계의 Section)<select id="eSub"><option value="">(선택)</option>' + secOpts + '</select></label>' +
      '<label class="ik-f">태그(쉼표)<input type="text" id="eTags" value="' + esc((it.tags || []).join(', ')) + '"></label><label class="ik-f">우선순위(0~100, 같은 조건이면 높은 쪽)<input type="number" id="ePri" min="0" max="100" value="' + it.priority + '"></label>' +
      '<label class="ik-f">이 풀이의 성격(충돌 감지용)' + sel('eStance', [['neutral', '중립·설명'], ['positive', '유리·확장 쪽'], ['caution', '주의·조심 쪽']], it.stance) + '</label></div>' +
      '<div class="ik-sec">② 언제 사용하는 풀이인가?<small>고른 조건이 모두 맞는 사주에만 쓰입니다. 조건이 구체적일수록 일반론보다 먼저 쓰입니다. 엔진이 실제로 계산하는 값만 고를 수 있습니다.</small></div><div id="eCond"></div>' +
      '<div class="ik-sec">③ 명리 원리<small>전문가용 설명 (사용자에게 그대로 보이지 않고 근거로 쓰입니다)</small></div><textarea id="ePrin" rows="3">' + esc(it.principle) + '</textarea>' +
      '<div class="ik-sec">④ 기본 해석<small>핵심 해석 문장</small></div><textarea id="eInterp" rows="4">' + esc(it.interpretation) + '</textarea>' +
      '<div class="ik-sec">⑤ 현실에서는 어떻게 나타나는가?<small>행동·상황으로 풀어 쓰기. 한 줄에 하나씩</small></div><textarea id="eBeh" rows="4">' + esc(lines(it.behaviorPatterns)) + '</textarea>' +
      '<div class="ik-g2"><div><div class="ik-sec">⑥ 장점<small>한 줄에 하나씩</small></div><textarea id="eStr" rows="4">' + esc(lines(it.strengths)) + '</textarea></div><div><div class="ik-sec">⑦ 주의점<small>한 줄에 하나씩</small></div><textarea id="eRisk" rows="4">' + esc(lines(it.risks)) + '</textarea></div></div>' +
      '<div class="ik-sec">⑧ 현실 사례<small>필요한 것만 입력하세요</small></div><div class="ik-g2"><label class="ik-f">직장인<textarea id="exW" rows="2">' + esc(ex.worker) + '</textarea></label><label class="ik-f">사업자<textarea id="exB" rows="2">' + esc(ex.business) + '</textarea></label><label class="ik-f">프리랜서<textarea id="exF" rows="2">' + esc(ex.freelance) + '</textarea></label><label class="ik-f">연애/관계<textarea id="exL" rows="2">' + esc(ex.love) + '</textarea></label></div>' +
      '<div class="ik-sec">행동 제안<small>한 줄에 하나씩</small></div><textarea id="eAct" rows="3">' + esc(lines(it.actions)) + '</textarea>' +
      '<div class="ik-sec">⑨ 보정 조건<small>기본 해석에 “이런 경우엔 강해지거나·약해지거나·달라진다”를 덧붙입니다. 맞는 보정만 적용됩니다.</small></div><div id="eMods"></div><button type="button" id="eModAdd">+ 보정 조건</button>' +
      '<div class="ik-sec">이 풀이를 쓰지 않을 조건 (예외)<small>아래 조건이 하나라도 …에 모두 맞으면 위 조건이 맞아도 제외됩니다.</small></div><details><summary class="muted">제외 조건 열기' + (Object.keys(it.exclusions || {}).length ? ' (' + condText(it.exclusions, 2) + ')' : '') + '</summary><div id="eExcl"></div></details>' +
      '<div class="ik-sec">⑩ 출처 및 검수</div><div class="ik-g2"><label class="ik-f">출처 유형' + sel('eSrc', [['expert', '전문가'], ['book', '서적'], ['internal', '내부 정리'], ['research', '연구'], ['AI_DRAFT', 'AI 초안(검수 전 서비스 제외)']], it.sourceType) + '</label><label class="ik-f">출처 이름<input type="text" id="eSrcRef" value="' + esc(it.sourceReference) + '"></label>' +
      '<label class="ik-f">신뢰도' + sel('eConf', [['high', '높음'], ['mid', '보통'], ['low', '낮음']], it.confidence) + '</label><label class="ik-f">상태' + sel('eStatus', Object.keys(STATUS_KO).map(function (s) { return [s, STATUS_KO[s]]; }), it.status) + '</label></div>' +
      '<label class="ik-f">메모<textarea id="eMemo" rows="2">' + esc(it.sourceMemo) + '</textarea></label><label class="chk2" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="eRev"' + (it.reviewed ? ' checked' : '') + ' style="width:auto"> 검수 완료 <span class="muted">' + (it.reviewedAt ? '(' + date(it.reviewedAt) + ')' : '') + ' — 검수 완료된 풀이만 서비스에 쓰입니다</span></label>' +
      '<div class="ik-foot"><button id="eDraft">임시저장</button><button id="eTest">풀이 테스트</button><button class="pri" id="ePub">게시</button><span class="muted" id="eMsg"></span></div></div>';
    $('#eSub', box).value = it.subDomain; if (it.subDomain && $('#eSub', box).value !== it.subDomain) { $('#eSub', box).insertAdjacentHTML('beforeend', '<option value="' + esc(it.subDomain) + '">' + esc(it.subDomain) + '</option>'); $('#eSub', box).value = it.subDomain; }
    $('#eDomain', box).onchange = function () { $('#eSub', box).innerHTML = '<option value="">(선택)</option>' + sectionOptions(this.value); };
    condBuilder($('#eCond', box), it.conditions, BASE_FIELDS); condBuilder($('#eExcl', box), it.exclusions, []);
    drawMods(); $('#eModAdd', box).onclick = function () { it.modifiers.push({ id: 'm' + (it.modifiers.length + 1), when: {}, effect: 'strengthen', text: '' }); drawMods(); };
    $('#ikBack', box).onclick = knowOpen;
    if (!G.isNew) { $('#ikHist', box).onclick = histDialog; $('#ikDup', box).onclick = function () { var c = JSON.parse(JSON.stringify(collect(true))); c.id = nextId(c.domain); c.title += ' (복사)'; c.status = 'draft'; c.reviewed = false; c.reviewedAt = ''; c.version = 0; G.cur = c; G.isNew = true; drawEdit(); toast('복제했습니다 — 저장하면 새 풀이가 됩니다'); }; }
    $('#eDraft', box).onclick = function () { save('draft'); }; $('#ePub', box).onclick = function () { save('published'); };
    $('#eTest', box).onclick = function () { G.focus = { item: collect(true) }; window.AdminShowTab('iklab'); };
  }
  function drawMods() {
    var box = $('#eMods'), mods = G.cur.modifiers;
    box.innerHTML = mods.map(function (m, i) { return '<div class="ik-mod" data-i="' + i + '"><div class="ik-bar" style="margin-top:0"><b style="color:var(--gold)">IF</b><span class="muted">아래 조건이 맞으면</span><span style="flex:1"></span><button type="button" data-del="' + i + '">삭제</button></div><div data-cb></div>' +
      '<div class="ik-g2"><label class="ik-f">효과<select data-eff><option value="strengthen"' + (m.effect === 'strengthen' ? ' selected' : '') + '>강화 — 해석에 덧붙임</option><option value="soften"' + (m.effect === 'soften' ? ' selected' : '') + '>완화 — “다만 이 경우에는”</option><option value="replace"' + (m.effect === 'replace' ? ' selected' : '') + '>대체 — 기본 해석을 이 문장으로 교체</option><option value="exception"' + (m.effect === 'exception' ? ' selected' : '') + '>예외 — “예외적으로”</option></select></label></div><label class="ik-f">THEN 해석<textarea data-txt rows="2">' + esc(m.text) + '</textarea></label></div>'; }).join('') || '<p class="muted" style="font-size:.8rem">보정 조건이 없습니다.</p>';
    $$('.ik-mod', box).forEach(function (el) { var m = mods[+el.dataset.i]; condBuilder($('[data-cb]', el), m.when, []); $('[data-eff]', el).onchange = function () { m.effect = this.value; }; $('[data-txt]', el).oninput = function () { m.text = this.value; }; $('[data-del]', el).onclick = function () { mods.splice(+el.dataset.i, 1); drawMods(); }; });
  }
  function collect(quiet) {
    var it = G.cur, v = function (id) { return $('#' + id).value; };
    it.title = v('eTitle').trim(); it.domain = v('eDomain'); it.subDomain = v('eSub'); it.tags = v('eTags').split(',').map(function (x) { return x.trim(); }).filter(Boolean); it.priority = +v('ePri') || 0; it.stance = v('eStance');
    if (G.isNew && $('#eId')) it.id = v('eId').trim();
    it.principle = v('ePrin'); it.interpretation = v('eInterp'); it.behaviorPatterns = fromLines(v('eBeh')); it.strengths = fromLines(v('eStr')); it.risks = fromLines(v('eRisk')); it.actions = fromLines(v('eAct'));
    it.realWorldExamples = { worker: v('exW'), business: v('exB'), freelance: v('exF'), love: v('exL') };
    it.sourceType = v('eSrc'); it.sourceReference = v('eSrcRef'); it.confidence = v('eConf'); it.sourceMemo = v('eMemo'); it.reviewed = $('#eRev').checked; it.status = v('eStatus');
    return it;
  }
  function save(want) {
    var it = collect(); if (!it.title) return toast('풀이 이름을 입력하세요', true);
    if (want === 'published') { if (!it.reviewed) return toast('게시하려면 “검수 완료”를 먼저 체크하세요 (검수 전 풀이는 서비스에 쓰이지 않습니다)', true); it.status = 'published'; }
    else if (want === 'draft' && it.status === 'published') { it.status = 'draft'; }
    $('#eMsg').textContent = '저장 중…';
    post('save', { item: it, isNew: G.isNew, expectVersion: it.version }).then(function (d) {
      G.cur = d.item; G.isNew = false; G.meta.meta = d.meta; toast('저장했습니다 · ' + STATUS_KO[d.item.status] + ' · 버전 ' + d.item.version); return loadItems();
    }).then(function () { drawEdit(); }).catch(function (e) { $('#eMsg').textContent = ''; toast(e.message, true); });
  }
  function histDialog() {
    api('/api/ik?a=hist&id=' + encodeURIComponent(G.cur.id)).then(function (d) {
      var h = d.history; var dlg = document.createElement('dialog'); dlg.innerHTML = '<form method="dialog"><h3>변경 이력</h3>' + (h.length ? h.map(function (x, i) { return '<div class="ik-k"><b>버전 ' + x.version + '</b> · ' + date(x.at) + (x.deleted ? ' · 삭제됨' : '') + '<div class="why">' + esc(x.item.title) + ' — ' + esc((x.item.interpretation || '').slice(0, 80)) + '</div><button type="button" data-r="' + i + '" style="margin-top:4px">이 버전으로 되돌려 편집</button></div>'; }).join('') : '<p class="muted">이전 버전이 없습니다.</p>') + '<button>닫기</button></form>';
      document.body.appendChild(dlg); dlg.showModal(); dlg.onclose = function () { dlg.remove(); };
      $$('[data-r]', dlg).forEach(function (b) { b.onclick = function () { var old = JSON.parse(JSON.stringify(h[+b.dataset.r].item)); old.version = G.cur.version; G.cur = old; dlg.close(); drawEdit(); toast('이전 내용을 불러왔습니다 — 저장하면 새 버전이 됩니다'); }; });
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ═════ ② 풀이 설계 ═════ */
  var ANALYSIS = ['일간 강약', '통근', '조후', '십성', '재성', '식상', '비겁', '관성', '인성', '신살', '합충', '용신', '대운', '세운', '월운'];
  function designOpen() {
    var box = document.getElementById('t-ikdesign'); box.innerHTML = '<p class="muted">불러오는 중…</p>';
    Promise.all([G.meta ? 0 : loadMeta(), loadItems()]).then(drawDesign).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function curDesign(d) { if (!G.design[d] || !G.design[d].sections || !G.design[d].sections.length) G.design[d] = JSON.parse(JSON.stringify(G.meta.defaultDesign[d])); return G.design[d]; }
  function drawDesign() {
    var box = document.getElementById('t-ikdesign'), d = G.dDomain, dz = curDesign(d), drag = null;
    var count = function (sid) { return G.items.filter(function (x) { return x.domain === d && x.subDomain === sid && x.status === 'published' && x.reviewed; }).length; };
    box.innerHTML = '<div class="card"><p class="muted" style="margin:0 0 10px">분야별로 “이 풀이에서 무엇을 분석하고, 어떤 항목(Section)을 보여 줄지” 정합니다. 풀이의 풍부함은 글자 수가 아니라 <b>답하는 질문의 수</b>로 정해지고, 근거가 되는 풀이 지식이 없는 항목은 억지로 채우지 않고 비워 둡니다.</p>' +
      '<div class="ik-bar">' + DOMAIN_ORDER.map(function (x) { return '<button class="ik-chipbtn' + (x === d ? ' on' : '') + '" data-d="' + x + '">' + DKO[x] + '</button>'; }).join('') + '</div>' +
      '<div class="ik-sec">분석 요소<small>필수는 이 풀이의 근거로 꼭 봐야 하는 계산값, 선택은 있으면 보는 값입니다 (안내용 · 항목 생성 여부는 풀이 지식의 조건이 결정합니다)</small></div><div class="ik-map">' +
      ANALYSIS.map(function (a) { var cur = dz.required.indexOf(a) >= 0 ? 'r' : dz.optional.indexOf(a) >= 0 ? 'o' : ''; return '<label>' + a + '<select data-an="' + a + '"><option value="">안 봄</option><option value="r"' + (cur === 'r' ? ' selected' : '') + '>필수</option><option value="o"' + (cur === 'o' ? ' selected' : '') + '>선택</option></select></label>'; }).join('') + '</div>' +
      '<div class="ik-sec">출력 Section<small>끌어서 순서를 바꾸고, 켜기/끄기·필수/선택을 정합니다. “게시 지식” 숫자가 0이면 그 Section 은 풀이에서 비워집니다.</small></div><div id="dzList"></div><div class="ik-bar"><button id="dzAdd">+ Section 추가</button><span style="flex:1"></span><button id="dzReset">기본값으로 되돌리기</button><button class="pri" id="dzSave">설계 저장</button></div></div>';
    $$('[data-d]', box).forEach(function (b) { b.onclick = function () { G.dDomain = b.dataset.d; drawDesign(); }; });
    $$('[data-an]', box).forEach(function (s) { s.onchange = function () { dz.required = dz.required.filter(function (x) { return x !== s.dataset.an; }); dz.optional = dz.optional.filter(function (x) { return x !== s.dataset.an; }); if (s.value === 'r') dz.required.push(s.dataset.an); if (s.value === 'o') dz.optional.push(s.dataset.an); }; });
    function list() {
      $('#dzList', box).innerHTML = dz.sections.map(function (s, i) { var n = count(s.id); return '<div class="ik-dz' + (s.enabled === false ? ' off' : '') + '" draggable="true" data-i="' + i + '"><span class="gr">⠿</span><span><input type="text" data-t value="' + esc(s.title) + '" style="width:100%"><small class="muted">' + esc(s.id) + ' · 게시 지식 <b style="color:' + (n ? 'var(--green)' : 'var(--red)') + '">' + n + '</b></small></span>' +
        '<label class="chk2"><input type="checkbox" data-en' + (s.enabled !== false ? ' checked' : '') + ' style="width:auto"> 사용</label><label class="chk2"><input type="checkbox" data-rq' + (s.required !== false ? ' checked' : '') + ' style="width:auto"> 필수</label><button type="button" data-x>삭제</button></div>'; }).join('');
      $$('.ik-dz', box).forEach(function (el) { var s = dz.sections[+el.dataset.i];
        $('[data-t]', el).oninput = function () { s.title = this.value; }; $('[data-en]', el).onchange = function () { s.enabled = this.checked; el.classList.toggle('off', !this.checked); }; $('[data-rq]', el).onchange = function () { s.required = this.checked; }; $('[data-x]', el).onclick = function () { dz.sections.splice(+el.dataset.i, 1); list(); };
        el.ondragstart = function (e) { drag = +el.dataset.i; e.dataTransfer.effectAllowed = 'move'; }; el.ondragover = function (e) { e.preventDefault(); el.classList.add('over'); }; el.ondragleave = function () { el.classList.remove('over'); };
        el.ondrop = function (e) { e.preventDefault(); var to = +el.dataset.i; if (drag == null || drag === to) return; var m = dz.sections.splice(drag, 1)[0]; dz.sections.splice(to, 0, m); drag = null; list(); };
      });
    }
    list();
    $('#dzAdd', box).onclick = function () { var id = prompt('Section ID (영문·숫자·_ 만, 예: monthlyCash). 풀이 지식의 “세부 분야”와 같은 값이어야 연결됩니다.'); if (!id) return; if (!/^[A-Za-z0-9_]{2,40}$/.test(id) || dz.sections.some(function (x) { return x.id === id; })) return toast('사용할 수 없는 ID 입니다', true); var t = prompt('화면에 보일 이름') || id; dz.sections.push({ id: id, title: t, enabled: true, required: false }); list(); };
    $('#dzReset', box).onclick = function () { if (!confirm(DKO[d] + ' 설계를 기본값으로 되돌릴까요? (저장 전까지는 화면에서만 바뀝니다)')) return; G.design[d] = JSON.parse(JSON.stringify(G.meta.defaultDesign[d])); drawDesign(); };
    $('#dzSave', box).onclick = function () { post('design', { design: G.design }).then(function (r) { G.design = JSON.parse(JSON.stringify(r.design)); G.meta.meta = r.meta; toast('풀이 설계를 저장했습니다'); drawDesign(); }).catch(function (e) { toast(e.message, true); }); };
  }

  /* ═════ ③ AI 규칙 ═════ */
  function rulesOpen() { var box = document.getElementById('t-ikrules'); box.innerHTML = '<p class="muted">불러오는 중…</p>'; (G.meta ? Promise.resolve() : loadMeta()).then(drawRules).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }); }
  function drawRules() {
    var box = document.getElementById('t-ikrules'), r = JSON.parse(JSON.stringify(G.meta.rules)), o = function (map, cur) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + map[k] + '</option>'; }).join(''); };
    box.innerHTML = '<div class="card"><p class="muted" style="margin:0">AI 는 이미 계산·검색·판정된 풀이 패키지를 “쉽고 풍부한 한국어로 옮겨 쓰는” 역할만 합니다. 아래 설정은 그 작성 방식입니다. AI 키가 없어도 같은 설정으로 규칙 기반 문장이 만들어집니다.</p>' +
      '<div class="ik-g2"><label class="ik-f">문체<select id="rTone">' + o({ easy: '쉬운 현실형', pro: '전문형', story: '스토리형' }, r.tone) + '</select></label><label class="ik-f">설명 깊이 (항목당 쓰는 풀이 지식 수)<select id="rDepth">' + o({ brief: '간략', standard: '표준', detailed: '상세', max: '매우 상세' }, r.depth) + '</select></label>' +
      '<label class="ik-f">현실 사례 (항목당)<select id="rEx">' + [0, 1, 2, 3].map(function (n) { return '<option' + (n === r.examples ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><label class="ik-f">전문용어<select id="rJ">' + o({ min: '최소', normal: '보통', rich: '상세' }, r.jargon) + '</select></label></div>' +
      '<label class="chk2" style="display:flex;gap:8px;margin:8px 0"><input type="checkbox" id="rBal" style="width:auto"' + (r.balance ? ' checked' : '') + '> 장점/리스크 균형 맞추기</label><label class="chk2" style="display:flex;gap:8px;margin:8px 0"><input type="checkbox" id="rAct" style="width:auto"' + (r.actions ? ' checked' : '') + '> 행동 제안 포함</label>' +
      '<label class="ik-f">추가 금지어 (쉼표) — 풀이에 나오면 품질 검사 FAIL<input type="text" id="rBan" value="' + esc((r.banned || []).join(', ')) + '"></label>' +
      '<div class="ik-sec">분야별 추가 규칙<small>해당 분야 풀이를 쓸 때만 AI 지시문에 덧붙습니다</small></div>' + DOMAIN_ORDER.map(function (d) { return '<label class="ik-f"><b style="color:var(--ink)">' + DKO[d] + ' (' + d + ')</b><textarea data-ov="' + d + '" rows="2" placeholder="예: 수입 증가와 돈이 남는 것을 구분한다.">' + esc((r.domainOverrides || {})[d] || '') + '</textarea></label>'; }).join('') +
      '<div class="ik-foot"><button class="pri" id="rSave">AI 규칙 저장</button></div></div>';
    $('#rSave', box).onclick = function () {
      var x = { tone: $('#rTone').value, depth: $('#rDepth').value, examples: +$('#rEx').value, jargon: $('#rJ').value, balance: $('#rBal').checked, actions: $('#rAct').checked, banned: $('#rBan').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean), domainOverrides: {} };
      $$('[data-ov]', box).forEach(function (t) { if (t.value.trim()) x.domainOverrides[t.dataset.ov] = t.value.trim(); });
      post('rules', { rules: x }).then(function (d) { G.meta.rules = d.rules; G.meta.meta = d.meta; toast('AI 규칙을 저장했습니다'); }).catch(function (e) { toast(e.message, true); });
    };
  }

  /* ═════ ④ 풀이 실험실 ═════ */
  var LK = 'mt_ik_lab', TSL = { date: '1990-05-15', time: '14:30', gender: 'M', domain: 'MONEY', draft: false, ai: false, profiles: [] };
  try { Object.assign(TSL, JSON.parse(localStorage.getItem(LK) || '{}')); } catch (e) { }
  var saveTSL = function () { try { localStorage.setItem(LK, JSON.stringify(TSL)); } catch (e) { } };
  function labOpen() { var box = document.getElementById('t-iklab'); box.innerHTML = '<p class="muted">불러오는 중…</p>'; Promise.all([G.meta ? 0 : loadMeta(), loadItems()]).then(drawLab).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }); }
  function drawLab() {
    var box = document.getElementById('t-iklab'), f = G.focus; if (f) { TSL.domain = f.item.domain; TSL.draft = true; }
    box.innerHTML = '<div class="card"><div class="ik-bar" style="margin-top:0;align-items:end"><label class="ik-f">생년월일<input type="date" id="lD" value="' + esc(TSL.date) + '"></label><label class="ik-f">출생 시간<input type="time" id="lT" value="' + esc(TSL.time) + '"></label><label class="ik-f">성별<select id="lG"><option value="M"' + (TSL.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TSL.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label class="ik-f">풀이 분야<select id="lDom">' + DOMAIN_ORDER.map(function (d) { return '<option value="' + d + '"' + (d === TSL.domain ? ' selected' : '') + '>' + DKO[d] + '</option>'; }).join('') + '</select></label>' +
      '<label class="chk2" style="display:flex;gap:6px;margin-bottom:8px"><input type="checkbox" id="lDr" style="width:auto"' + (TSL.draft ? ' checked' : '') + '> 초안·검수 전 포함</label><label class="chk2" style="display:flex;gap:6px;margin-bottom:8px" title="' + (G.meta.aiAvailable ? '' : 'AI 키가 설정되어 있지 않습니다') + '"><input type="checkbox" id="lAi" style="width:auto"' + (TSL.ai && G.meta.aiAvailable ? ' checked' : '') + (G.meta.aiAvailable ? '' : ' disabled') + '> AI 로 작성</label>' +
      '<button class="pri" id="lRun" style="margin-bottom:8px">사주 분석 실행</button>' + (TSL.profiles.length ? '<select id="lPf" style="width:auto;margin-bottom:8px"><option value="">테스트 프로필…</option>' + TSL.profiles.map(function (p, i) { return '<option value="' + i + '">' + esc(p.date + ' ' + p.time + ' ' + (p.gender === 'M' ? '남' : '여')) + '</option>'; }).join('') + '</select>' : '') + '<button id="lSv" style="margin-bottom:8px">프로필 저장</button></div>' +
      (f ? '<p class="muted" style="margin:8px 0 0">편집 중인 풀이 “' + esc(f.item.title || f.item.id) + '”를 이번 테스트에만 포함해 실행합니다(저장되지 않음). <button id="lNoF" type="button">빼기</button></p>' : '') + '</div><div id="lOut" style="margin-top:12px"></div>';
    var rd = function () { TSL.date = $('#lD').value || TSL.date; TSL.time = $('#lT').value || TSL.time; TSL.gender = $('#lG').value; TSL.domain = $('#lDom').value; TSL.draft = $('#lDr').checked; TSL.ai = $('#lAi').checked; saveTSL(); };
    $('#lRun', box).onclick = function () { rd(); run(); };
    $('#lSv', box).onclick = function () { rd(); TSL.profiles = [{ date: TSL.date, time: TSL.time, gender: TSL.gender }].concat(TSL.profiles.filter(function (p) { return !(p.date === TSL.date && p.time === TSL.time && p.gender === TSL.gender); })).slice(0, 10); saveTSL(); drawLab(); };
    var pf = $('#lPf', box); if (pf) pf.onchange = function () { var p = TSL.profiles[+pf.value]; if (p) { TSL.date = p.date; TSL.time = p.time; TSL.gender = p.gender; saveTSL(); drawLab(); } };
    var nf = $('#lNoF', box); if (nf) nf.onclick = function () { G.focus = null; drawLab(); };
    if (f) run();
  }
  function run(force) {
    var out = $('#lOut'); out.innerHTML = '<p class="muted">계산·검색 중…</p>';
    C.engine().then(function (M) {
      var d = TSL.date.split('-').map(Number), t = (TSL.time || '12:00').split(':').map(Number), now = Date.now();
      var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TSL.gender, city: '서울' }), sd = R.SajuData.build(ch, { now: now }), Y = sd.nowYear, ext = { future: [] };
      try { ext.future = M.seunRange(ch, Y, Y + 4).map(function (x, i) { return { year: Y + i, season: R.SajuData.seasonOf(x.ev) }; }); } catch (e) { }
      var body = { sd: sd, ext: ext, domain: TSL.domain, includeDraft: TSL.draft, compose: TSL.ai ? 'ai' : 'plain', force: !!force };
      if (G.focus) { body.focus = G.focus.item; }
      return post('lab', body).then(function (r) { G.lab = r; drawResult(r); });
    }).catch(function (e) { out.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  function drawResult(r) {
    var out = $('#lOut'), p = r.package, fa = p.facts, sel = null;
    var ok = p.matchedKnowledge, ex = p.excludedKnowledge, cfN = p.conflicts.length, unres = p.conflicts.filter(function (c) { return !c.resolved; }).length;
    var left = '<div class="card"><b style="color:var(--gold)">계산 결과</b>' + [['일주', fa.dayPillar], ['일간', fa.dayMaster], ['월령', fa.monthBranch + '월 · ' + fa.season], ['신강/신약', fa.strength], ['통근', (fa.hasRoot || '-') + (fa.rootLevel ? ' (' + fa.rootLevel + ')' : '')], ['용신', fa.yongEl || '-'], ['오행', fa.elements], ['십성군', fa.groups], ['격국', (fa.patterns || []).join(', ') || '-'], ['신살', (fa.stars || []).join(', ') || '-'], ['합충형파해', (fa.relations || []).join(', ') || '-'],
      ['현재 대운', fa.daewoonSeason || '-'], ['올해 세운', fa.seunSeason || '-'], ['이달 월운', fa.monthSeason || '-'], ['앞으로 5년', (fa.future || []).map(function (x) { return x.year + ' ' + x.season; }).join(' · ') || '-']].map(function (x) { return '<div class="ik-kv"><span>' + x[0] + '</span><div>' + esc(x[1]) + '</div></div>'; }).join('') +
      '<div class="ik-sec" style="font-size:.85rem">아직 지원하지 않는 조건 (TODO)</div><p class="muted" style="font-size:.76rem;margin:0">' + p.unsupported.map(esc).join(' · ') + '</p></div>';
    var mid = '<div class="card"><b style="color:var(--gold)">검색된 풀이 지식: ' + ok.length + '개</b><div class="ik-bar"><button class="ik-chipbtn on" data-kf="used">사용됨</button><button class="ik-chipbtn" data-kf="ex">제외됨 ' + ex.length + '</button><button class="ik-chipbtn" data-kf="cf">충돌 ' + cfN + (unres ? ' (미해결 ' + unres + ')' : '') + '</button></div><div id="kList"></div></div>';
    var right = '<div class="card"><div class="ik-q ' + r.quality.status + '"><b>품질 검사: ' + r.quality.status + '</b> · 신뢰도 ' + p.confidence + ' · ' + (r.mode === 'ai' ? 'AI 작성(' + esc(r.provider) + (r.cached ? ', 캐시' : '') + ')' : '규칙 기반 작성') + (r.aiError ? '<br>AI 실패 → 규칙 기반으로 대체: ' + esc(r.aiError) : '') + (r.quality.issues.length ? '<ul>' + r.quality.issues.slice(0, 12).map(function (i) { return '<li>[' + i.level + '] ' + esc(i.section) + ' — ' + esc(i.msg) + '</li>'; }).join('') + '</ul>' : '') + '</div>' +
      '<div class="ik-bar" style="margin-top:0"><b style="color:var(--gold)">최종 풀이 Preview</b><span class="muted" style="font-size:.76rem">문단을 누르면 근거를 봅니다</span><span style="flex:1"></span>' + (r.mode === 'ai' ? '<button id="lRe">다시 생성</button>' : '') + '</div>' +
      p.order.map(function (id) { var s = p.sections[id], paras = r.composed[id] || []; return '<div class="ik-sh">' + esc(s.title) + (s.required ? '' : ' <small class="muted">(선택)</small>') + '</div>' + (s.status !== 'ok' ? '<div class="ik-ins">근거가 되는 검수된 풀이 지식이 없어 비워 둠</div>' : paras.map(function (x, i) { return '<div class="ik-p" data-s="' + id + '" data-i="' + i + '">' + esc(x.text) + '<small>근거 ' + (x.refs.length ? x.refs.map(esc).join(', ') : '없음') + '</small></div>'; }).join('')); }).join('') +
      '<details style="margin-top:12px"><summary class="muted">Interpretation Package 원본 보기</summary><pre style="white-space:pre-wrap;font-size:.72rem;max-height:300px;overflow:auto">' + esc(JSON.stringify(p, null, 1).slice(0, 20000)) + '</pre></details></div>';
    out.innerHTML = '<div class="ik-lab">' + left + mid + right + '</div>';
    var kf = 'used';
    function klist() {
      var h = '';
      if (kf === 'used') h = ok.map(function (k) { return '<div class="ik-k' + (k.used ? '' : ' off') + '"><b>' + (k.used ? '✓ ' : '○ ') + esc(k.id) + '</b> ' + esc(k.title) + '<div class="why">' + esc(k.subDomain) + ' · 일치 점수 ' + k.score + ' · 신뢰도 ' + CONF_KO[k.confidence] + (k.used ? '' : ' · (Section 에 배정되지 않음)') + '<br>' + k.rows.filter(function (x) { return x.hit; }).map(function (x) { return esc(x.label) + ' = ' + esc(Array.isArray(x.have) ? x.have.join(',') : x.have); }).join(' · ') + (k.general ? '일반론(조건 없음)' : '') + '</div></div>'; }).join('') || '<p class="muted">검색된 풀이 지식이 없습니다. 풀이 지식을 게시하거나 “초안 포함”을 켜 보세요.</p>';
      else if (kf === 'ex') h = ex.map(function (k) { return '<div class="ik-k off"><b>' + esc(k.id) + '</b> ' + esc(k.title) + '<div class="why">' + ({ unmatched: '조건이 맞지 않음', excluded: '제외 조건에 해당', unsupported: '엔진이 아직 주지 않는 값이 필요함' }[k.reason]) + (k.missing && k.missing.length ? ' (' + esc(k.missing.join(', ')) + ')' : '') + '<br>' + k.rows.map(function (x) { return (x.hit ? '✓ ' : '✗ ') + esc(x.label) + ' (' + esc(x.want.join('/')) + ' ↔ ' + esc(x.have == null ? '값 없음' : Array.isArray(x.have) ? x.have.join(',') : x.have) + ')'; }).join('<br>') + '</div></div>'; }).join('') || '<p class="muted">조건 일부만 맞아 제외된 풀이가 없습니다.</p>';
      else h = p.conflicts.map(function (c) { return '<div class="ik-k cf"><b>' + esc(c.a) + ' ↔ ' + esc(c.b) + '</b><div class="why">' + esc(c.key) + ' · ' + esc(c.note) + '</div></div>'; }).join('') || '<p class="muted">충돌이 없습니다.</p>';
      $('#kList', out).innerHTML = h;
    }
    klist(); $$('[data-kf]', out).forEach(function (b) { b.onclick = function () { kf = b.dataset.kf; $$('[data-kf]', out).forEach(function (x) { x.classList.toggle('on', x === b); }); klist(); }; });
    $$('.ik-p', out).forEach(function (el) { el.onclick = function () { $$('.ik-p', out).forEach(function (x) { x.classList.remove('sel'); }); el.classList.add('sel'); trace(r, el.dataset.s, +el.dataset.i); }; });
    var re = $('#lRe', out); if (re) re.onclick = function () { run(true); };
  }
  function trace(r, sid, i) {
    var p = r.package, sec = p.sections[sid], para = r.composed[sid][i], old = document.querySelector('.ik-dr'); if (old) old.remove();
    var items = sec.items.filter(function (x) { return para.refs.indexOf(x.id) >= 0; }), dr = document.createElement('div'); dr.className = 'ik-dr';
    var fa = p.facts;
    dr.innerHTML = '<div class="ik-bar" style="margin-top:0"><b style="color:var(--gold)">왜 이런 풀이가 나왔나요?</b><span style="flex:1"></span><button id="drX">닫기</button></div><div class="ik-p sel" style="cursor:default">' + esc(para.text) + '</div>' +
      '<h4>계산 근거</h4>' + (items.length ? items.map(function (it) { return '<div class="ik-kv"><span>' + esc(it.id) + '</span><div>' + (it.why.length ? it.why.map(esc).join('<br>') : '일반론(조건 없음)') + '</div></div>'; }).join('') : '<p class="muted">근거로 연결된 풀이 지식이 없습니다.</p>') + '<div class="ik-kv"><span>일주</span><div>' + esc(fa.dayPillar) + ' · ' + esc(fa.strength) + '</div></div>' +
      '<h4>적용 Section</h4><p style="margin:0">' + esc(sec.title) + ' <span class="muted">(' + esc(sid) + ')</span></p>' +
      '<h4>사용된 풀이 지식</h4>' + (items.map(function (it) { return '<div class="ik-k"><b>' + esc(it.id) + '</b> ' + esc(it.title) + '<div class="why">신뢰도 ' + CONF_KO[it.confidence] + ' · 구체성 ' + it.spec + (it.principle ? '<br>원리: ' + esc(it.principle.slice(0, 140)) : '') + '</div><a href="#" data-edit="' + esc(it.id) + '">풀이 지식 열기 →</a></div>'; }).join('') || '<p class="muted">-</p>') +
      '<h4>보정 조건(Modifier)</h4>' + (items.some(function (it) { return it.modifiers.length; }) ? items.map(function (it) { return it.modifiers.map(function (m) { return '<div class="ik-k"><b>' + esc(it.id) + ' · ' + { strengthen: '강화', soften: '완화', replace: '대체', exception: '예외' }[m.effect] + '</b><div class="why">' + esc(m.text) + '</div></div>'; }).join(''); }).join('') : '<p class="muted">적용된 보정 없음</p>') +
      '<h4>충돌 처리</h4>' + (p.conflicts.length ? p.conflicts.map(function (c) { return '<div class="ik-k cf"><div class="why">' + esc(c.a) + ' ↔ ' + esc(c.b) + ' · ' + esc(c.note) + '</div></div>'; }).join('') : '<p class="muted">충돌 없음</p>') +
      '<h4>작성 방식</h4><p style="margin:0" class="muted">' + (para.kind === 'ai' ? 'AI 가 패키지를 근거로 작성' : '규칙 기반 합성 · 문단 종류 ' + esc(para.kind)) + ' · 지식 ' + esc((p.versions || {}).knowledge) + ' / 설계 ' + esc((p.versions || {}).design) + ' / 규칙 ' + esc((p.versions || {}).rules) + '</p>' +
      '<h4>패키지 신뢰도</h4><p style="margin:0">' + p.confidence + '</p>';
    document.body.appendChild(dr); $('#drX', dr).onclick = function () { dr.remove(); };
    $$('[data-edit]', dr).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); dr.remove(); window.AdminShowTab('ikknow'); setTimeout(function () { openItem(a.dataset.edit); }, 300); }; });
  }

  window.V2IK = { open: function (tab, pw) {
    PW = pw; C.setPw(pw); PANE = document.getElementById('t-' + tab);
    if (tab === 'ikknow') knowOpen(); else if (tab === 'ikdesign') designOpen(); else if (tab === 'ikrules') rulesOpen(); else if (tab === 'iklab') { labOpen(); }
    if (tab !== 'iklab') G.focus = null;
  }, _state: G };
})();
