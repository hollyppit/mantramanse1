/* 관리자 "무료 콘텐츠" — 타로(78장 카드별 문장 조각) · 오늘의 운세(문장 조각·CTA) + 결과 미리보기. 저장은 /api/free-content (KV 'free:content').
   기본 문구는 report/hub/free-core.js 에 있고, 여기서 고친 문장은 그 위에 덮어쓰기로만 저장된다(비워 두면 기본 문구). 점수·계산은 건드리지 않는다.
   index.html 의 showTab 이 V2Free.open('freec', 비밀번호) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, FC = window.FreeCore, T = window.MantraCore.Tarot;
  var PANE = null, $ = function (s, e) { return (e || PANE || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || PANE || document).querySelectorAll(s)); };
  var G = { ov: null, W: { tarot: { cards: {} }, daily: {} }, sub: 'tarot', sel: null, ori: 'up', cat: 'today', filter: 'all', q: '', dg: 'head', version: '' };
  var CATS = { today: '오늘', love: '연애', money: '재물', work: '일·사업', yesno: 'YES/NO' };
  var ARC = { all: '전체', M: '메이저', W: '완드', C: '컵', S: '소드', P: '펜타클' };
  var PH = ['기회기', '확장기', '수확기', '축적기'], TONE = { go: '순풍', steady: '보통', care: '주의·부담' }, LVK = { high: '높음', mid: '무난', low: '낮음' };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  var css = document.createElement('style');
  css.textContent = '.fc-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.fc-bar select,.fc-bar input{width:auto;min-width:110px}.fc-chip{border-radius:999px;padding:4px 12px;font-size:.82rem}.fc-chip.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.fc-row{display:grid;grid-template-columns:34px 38px minmax(0,1.3fr) minmax(0,1fr) 70px 78px;gap:8px;align-items:center;padding:7px 8px;border-bottom:1px solid var(--line);cursor:pointer;font-size:.84rem}.fc-row:hover{background:#12162a}.fc-row.h{color:var(--ink3);font-size:.75rem;cursor:default}.fc-row.h:hover{background:none}.fc-row small{display:block;color:var(--ink3)}' +
    '.fc-th{width:30px;height:46px;border-radius:4px;background:#000 center/cover;border:1px solid var(--line)}.fc-st{font-size:.72rem;padding:0 8px;border-radius:999px;border:1px solid var(--line)}.fc-st.ok{border-color:#62C2AE;color:#7FE0BC}.fc-st.mid{border-color:#B8742A;color:#FFC080}' +
    '.fc-sl{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:10px 0}.fc-sl textarea{min-height:64px}.fc-sl small{color:var(--ink3)}.fc-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:800px){.fc-g2{grid-template-columns:1fr}.fc-row{grid-template-columns:34px 1fr 70px}.fc-row>:nth-child(2),.fc-row>:nth-child(4),.fc-row>:nth-child(6){display:none}}' +
    '.fc-pv{background:#05060b;border:1px solid var(--line);border-radius:12px;padding:14px;max-width:460px}.fc-pv h4{margin:12px 0 2px;color:var(--gold);font-size:.74rem;letter-spacing:.16em;font-weight:500}.fc-pv p{margin:2px 0;line-height:1.7;font-size:.9rem}.fc-pv .big{font-family:"Noto Serif KR",serif;font-size:1.05rem;color:#F0D08A}.fc-pv ul{margin:2px 0 0 16px;padding:0}.fc-pv .sc{font-size:2rem;color:var(--gold);font-family:"Noto Serif KR",serif}.fc-pv .src{font-size:.7rem;color:var(--ink3)}';
  document.head.appendChild(css);

  function load() {
    return C.api('/api/free-content').then(function (d) { G.ov = d.content || {}; G.version = G.ov.version || ''; G.W = { tarot: clone(G.ov.tarot || { cards: {} }), daily: clone(G.ov.daily || {}) }; if (!G.W.tarot.cards) G.W.tarot.cards = {}; });
  }
  function open(tab, pw) { C.setPw(pw); PANE = document.getElementById('t-freec'); PANE.innerHTML = '<p class="muted">불러오는 중…</p>'; load().then(draw).catch(function (e) { PANE.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }); }
  function draw() {
    PANE.innerHTML = '<div class="fc-bar"><button class="fc-chip' + (G.sub === 'daily' ? ' on' : '') + '" data-s="daily">오늘의 운세</button><button class="fc-chip' + (G.sub === 'tarot' ? ' on' : '') + '" data-s="tarot">타로</button><span style="flex:1"></span><span class="muted" style="font-size:.8rem">콘텐츠 버전 ' + esc(G.version || '기본') + '</span><button class="pri" id="fcSave">변경사항 저장</button></div><div id="fcBody"></div>';
    $$('[data-s]').forEach(function (b) { b.onclick = function () { G.sub = b.dataset.s; G.sel = null; draw(); }; });
    $('#fcSave').onclick = function () {
      C.api('/api/free-content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tarot: G.W.tarot, daily: G.W.daily }) }).then(function (d) { G.version = d.version; toast('저장했습니다 · 버전 ' + d.version + ' (사용자 화면에 바로 반영됩니다)'); }).catch(function (e) { toast(e.message, true); });
    };
    if (G.sub === 'tarot') tarotView(); else dailyView();
  }

  /* ═════ 타로 ═════ */
  function auth(id, ori, cat, create) { var c = G.W.tarot.cards; if (!c[id]) { if (!create) return null; c[id] = {}; } if (!c[id][ori]) { if (!create) return null; c[id][ori] = {}; } if (!c[id][ori][cat]) { if (!create) return null; c[id][ori][cat] = {}; } return c[id][ori][cat]; }
  function comp(id) { return FC.tarotCompleteness({ tarot: G.W.tarot }, id); }
  var statusOf = function (p) { return p >= 90 ? ['완료', 'ok'] : p > 0 ? ['부족', 'mid'] : ['미작성', '']; };
  function tarotView() {
    var body = $('#fcBody');
    if (G.sel) return tarotEdit(body);
    var list = T.cards.filter(function (c) { return (G.filter === 'all' || c.suit === G.filter) && (!G.q || (c.nameKo + ' ' + c.nameEn).toLowerCase().indexOf(G.q.toLowerCase()) >= 0); });
    var done = T.cards.filter(function (c) { return comp(c.id).total >= 90; }).length;
    body.innerHTML = '<div class="card"><p class="muted" style="margin:0 0 6px">카드 78장의 분야별 문장을 직접 쓸 수 있습니다. 쓰지 않은 칸은 기본 문구(카드 점수·키워드 기반)로 자동 완성되어 사용자 화면은 항상 채워집니다. 직접 쓴 카드가 늘수록 같은 카드의 풀이가 더 정교해집니다. <b style="color:var(--gold)">작성 완료 ' + done + ' / 78</b></p>' +
      '<div class="fc-bar">' + Object.keys(ARC).map(function (k) { return '<button class="fc-chip' + (G.filter === k ? ' on' : '') + '" data-f="' + k + '">' + ARC[k] + '</button>'; }).join('') + '<input type="text" id="fcQ" placeholder="카드 검색" value="' + esc(G.q) + '"></div>' +
      '<div class="fc-row h"><span>번호</span><span>이미지</span><span>이름</span><span>Arcana</span><span>완성도</span><span>상태</span></div><div id="fcRows"></div></div>' + previewBox('tarot');
    $$('[data-f]', body).forEach(function (b) { b.onclick = function () { G.filter = b.dataset.f; tarotView(); }; });
    $('#fcQ', body).oninput = function () { G.q = this.value; rows(); }; rows();
    function rows() {
      var l = T.cards.filter(function (c) { return (G.filter === 'all' || c.suit === G.filter) && (!G.q || (c.nameKo + ' ' + c.nameEn).toLowerCase().indexOf(G.q.toLowerCase()) >= 0); });
      $('#fcRows', body).innerHTML = l.map(function (c) { var p = comp(c.id).total, st = statusOf(p); return '<div class="fc-row" data-id="' + c.id + '"><span>' + (c.number != null ? c.number : c.rank) + '</span><span><div class="fc-th" style="background-image:url(\'' + esc(c.imageUrl) + '\')"></div></span><span><b>' + esc(c.nameKo) + '</b><small>' + esc(c.nameEn) + '</small></span><span>' + ARC[c.suit] + '</span><span>' + p + '%</span><span><i class="fc-st ' + st[1] + '">' + st[0] + '</i></span></div>'; }).join('');
      $$('.fc-row[data-id]', body).forEach(function (r) { r.onclick = function () { G.sel = r.dataset.id; G.ori = 'up'; G.cat = 'today'; tarotView(); }; });
    }
    previewBind(body, 'tarot'); void list;
  }
  var SLOT_HINT = { headline: '핵심 메시지(짧고 강한 한 문장) — 여러 개를 쓰면 열 때마다 그중 하나', summary: '요약 한 문장', detail: '상세 해석 문단 — 2개가 골라져 나옵니다(5개 이상 권장)', currentFlow: '지금의 흐름', opportunity: '좋은 방향(이 카드가 권하는 행동)', caution: '조심할 것', action: '오늘 해볼 것 — 3개가 골라져 나옵니다(5개 이상 권장)', closingMessage: '오늘의 한마디' };
  function tarotEdit(body) {
    var c = T.byId[G.sel], p = comp(c.id), cur = auth(c.id, G.ori, G.cat, false) || {}, rev = G.ori === 'rev';
    var tone = FC.composeTarot(T, c.id, rev, G.cat, 'x', null).tone, def = FC.tarotDefaults(G.cat, tone);
    body.innerHTML = '<div class="fc-bar"><button id="fcBack">← 카드 목록</button><b style="color:var(--gold)">' + esc(c.nameEn) + ' · ' + esc(c.nameKo) + '</b><span class="muted">' + ARC[c.suit] + ' · 전체 ' + p.total + '%</span></div>' +
      '<div class="card"><div class="fc-bar" style="margin-top:0"><div class="fc-th" style="width:48px;height:76px;background-image:url(\'' + esc(c.imageUrl) + '\')"></div><div class="muted" style="font-size:.82rem">정방향 키워드: ' + esc(c.upright) + '<br>역방향 키워드: ' + esc(c.reversed) + '<br>카드 이미지: ' + esc(c.imageUrl) + ' <small>(카드 이름·키워드·이미지는 공용 카드 DB(shared-core.js)에 있어 여기서는 읽기 전용입니다)</small></div></div>' +
      '<div class="fc-bar"><button class="fc-chip' + (G.ori === 'up' ? ' on' : '') + '" data-o="up">정방향</button><button class="fc-chip' + (G.ori === 'rev' ? ' on' : '') + '" data-o="rev">역방향</button><span class="muted" style="font-size:.8rem">' + Object.keys(CATS).map(function (k) { return CATS[k] + ' ' + p[G.ori][k] + '%'; }).join(' · ') + '</span></div>' +
      '<div class="fc-bar">' + Object.keys(CATS).map(function (k) { return '<button class="fc-chip' + (G.cat === k ? ' on' : '') + '" data-c="' + k + '">' + CATS[k] + ' ' + p[G.ori][k] + '%</button>'; }).join('') + '</div>' +
      '<p class="muted" style="font-size:.8rem;margin:4px 0">한 줄에 문장 하나씩 씁니다. 비워 두면 기본 문구 ' + (tone === 'up' ? '(밝은 톤)' : tone === 'mix' ? '(조율 톤)' : '(신중 톤)') + '가 쓰입니다. 같은 칸에 여러 문장을 쓰면 열 때마다 그중에서 골라 보여 줍니다. <b>{kw}</b> 는 카드 키워드로, <b>{nm}</b> 은 카드 이름으로 바뀝니다.</p>' +
      FC.TAROT_SLOTS.map(function (s) { var v = (cur[s] || []).join('\n'); return '<label class="fc-sl"><b>' + FC.TAROT_SLOT_KO[s] + '</b><small>' + SLOT_HINT[s] + ' · 현재 ' + (cur[s] && cur[s].length ? '직접 작성 ' + cur[s].length + '개' : '기본 문구 ' + ((def[s] || []).length) + '개 사용 중') + '</small><textarea data-s="' + s + '" rows="3" placeholder="' + esc((def[s] || [])[0] || '') + '">' + esc(v) + '</textarea></label>'; }).join('') + '</div>' + previewBox('tarot', c.id);
    $('#fcBack', body).onclick = function () { G.sel = null; tarotView(); };
    $$('[data-o]', body).forEach(function (b) { b.onclick = function () { G.ori = b.dataset.o; tarotView(); }; }); $$('[data-c]', body).forEach(function (b) { b.onclick = function () { G.cat = b.dataset.c; tarotView(); }; });
    $$('textarea[data-s]', body).forEach(function (t) { t.oninput = function () { var lines = t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean), o = auth(c.id, G.ori, G.cat, lines.length > 0); if (!o) return; if (lines.length) o[t.dataset.s] = lines; else { delete o[t.dataset.s]; } }; });
    previewBind(body, 'tarot', c.id);
  }

  /* ═════ 오늘의 운세 ═════ */
  var GROUPS = { head: '헤드라인', core: '오늘의 핵심', summary2: '핵심 보충', act: '오늘 하면 좋은 것', avoid: '오늘 미루면 좋은 것', close: '오늘의 한 문장', money: '재물운', work: '일·사업운', love: '연애운', health: '컨디션', cta: 'CTA' };
  function leaves(group) { // [경로 배열, 이름]
    var D = FC.DAILY_DEFAULTS, out = [], k;
    if (group === 'head') PH.forEach(function (p) { Object.keys(TONE).forEach(function (t) { out.push([['head', p, t], p + ' · ' + TONE[t]]); }); });
    else if (group === 'core') PH.forEach(function (p) { Object.keys(TONE).forEach(function (t) { out.push([['core', p, t], p + ' · ' + TONE[t]]); }); });
    else if (group === 'summary2') Object.keys(TONE).forEach(function (t) { out.push([['summary2', t], TONE[t]]); });
    else if (group === 'act') PH.forEach(function (p) { out.push([['act', p], p]); });
    else if (group === 'avoid') Object.keys(TONE).forEach(function (t) { out.push([['avoid', t], TONE[t]]); });
    else if (group === 'close') PH.forEach(function (p) { out.push([['close', p], p]); });
    else if (D.fields[group]) { ['high', 'mid', 'low'].forEach(function (l) { [['detail', '해석 조각'], ['good', '좋은 행동'], ['caution', '주의 행동']].forEach(function (s) { out.push([['fields', group, l, s[0]], '등급 ' + LVK[l] + ' · ' + s[1]]); }); }); if (group === 'work') PH.forEach(function (p) { out.push([['workMode', p], '업무 흐름 · ' + p + ' (1줄: 업무 예시를 · 로 구분 / 2줄: 설명)']); }); }
    void k; return out;
  }
  function getP(o, p) { for (var i = 0; i < p.length && o != null; i++) o = o[p[i]]; return o; }
  function setP(o, p, v) { for (var i = 0; i < p.length - 1; i++) o = o[p[i]] = o[p[i]] || {}; if (v) o[p[p.length - 1]] = v; else delete o[p[p.length - 1]]; }
  function dailyView() {
    var body = $('#fcBody'), g = G.dg, D = FC.DAILY_DEFAULTS;
    var h = '<div class="card"><p class="muted" style="margin:0 0 6px">오늘의 운세의 문장 조각입니다. <b>점수·단계·등급은 엔진이 계산한 값</b>이고, 여기서는 그 등급(높음/무난/낮음)과 흐름(기회기·확장기·수확기·축적기)에 맞춰 보여 줄 문장만 관리합니다. 같은 칸에 여러 줄을 쓰면 날짜·사용자에 따라 고정으로 골라 쓰이고(같은 날 같은 사람은 같은 문장), 비워 두면 기본 문구입니다.</p>' +
      '<div class="fc-bar">' + Object.keys(GROUPS).map(function (k) { return '<button class="fc-chip' + (g === k ? ' on' : '') + '" data-g="' + k + '">' + GROUPS[k] + '</button>'; }).join('') + '</div>';
    if (g === 'cta') {
      h += '<p class="muted" style="font-size:.8rem">오늘 가장 두드러진 분야에 따라 하단에서 이어 줄 무료 콘텐츠입니다. 결제 화면으로 바로 보내지 않습니다.</p>' + ['work', 'money', 'love', 'life'].map(function (k) {
        var b = D.cta[k], o = (G.W.daily.cta || {})[k] || {}; return '<div class="fc-sl"><b>' + ({ work: '일·사업 흐름이 두드러질 때', money: '재물이 두드러질 때', love: '연애가 두드러질 때', life: '전체 흐름이 중요할 때' })[k] + '</b><div class="fc-g2"><label>질문<input type="text" data-cta="' + k + '.q" value="' + esc(o.q || '') + '" placeholder="' + esc(b.q) + '"></label><label>버튼 문구<input type="text" data-cta="' + k + '.btn" value="' + esc(o.btn || '') + '" placeholder="' + esc(b.btn) + '"></label></div>' +
          '<label>연결 경로<select data-cta="' + k + '.to"><option value="">기본(' + esc(b.to) + ')</option>' + ['#/go?to=career', '#/go?to=money', '#/go?to=love', '#/go?to=life', '#/go?to=marriage', '#/go?to=future', '#/my', '#/awaken', '#/tarot'].map(function (r) { return '<option' + (o.to === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label></div>'; }).join('');
    } else leaves(g).forEach(function (l) {
      var path = l[0], cur = getP(G.W.daily, path), def = getP(D, path); h += '<label class="fc-sl"><b>' + esc(l[1]) + '</b><small>' + (cur && cur.length ? '직접 작성 ' + cur.length + '줄' : '기본 문구 ' + (def || []).length + '줄 사용 중') + '</small><textarea data-p="' + path.join('.') + '" rows="3" placeholder="' + esc((def || []).join('\n')) + '">' + esc((cur || []).join('\n')) + '</textarea></label>';
    });
    body.innerHTML = h + '</div>' + previewBox('daily');
    $$('[data-g]', body).forEach(function (b) { b.onclick = function () { G.dg = b.dataset.g; dailyView(); }; });
    $$('textarea[data-p]', body).forEach(function (t) { t.oninput = function () { var lines = t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); setP(G.W.daily, t.dataset.p.split('.'), lines.length ? lines : null); }; });
    $$('[data-cta]', body).forEach(function (t) { t.oninput = t.onchange = function () { var p = t.dataset.cta.split('.'), d = G.W.daily; d.cta = d.cta || {}; d.cta[p[0]] = d.cta[p[0]] || {}; if (t.value.trim()) d.cta[p[0]][p[1]] = t.value.trim(); else delete d.cta[p[0]][p[1]]; }; });
    previewBind(body, 'daily');
  }

  /* ═════ 미리보기 ═════ */
  var PV = { date: '1990-05-15', time: '14:30', gender: 'M', day: new Date().toISOString().slice(0, 10), mode: 'money', ori: 'up', seed: 'preview', card: 'M9' };
  function previewBox(kind, cardId) {
    if (kind === 'tarot') return '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">타로 미리보기 (저장 전 작업본 반영)</b><div class="fc-bar"><label>카드<select id="pvCard">' + T.cards.map(function (c) { return '<option value="' + c.id + '"' + ((cardId || PV.card) === c.id ? ' selected' : '') + '>' + esc(c.nameEn + ' · ' + c.nameKo) + '</option>'; }).join('') + '</select></label><label>방향<select id="pvOri"><option value="up"' + (PV.ori === 'up' ? ' selected' : '') + '>정방향</option><option value="rev"' + (PV.ori === 'rev' ? ' selected' : '') + '>역방향</option></select></label><label>질문<select id="pvMode">' + Object.keys(CATS).map(function (k) { return '<option value="' + k + '"' + (PV.mode === k ? ' selected' : '') + '>' + CATS[k] + '</option>'; }).join('') + '</select></label><button class="pri" id="pvGo">결과 생성</button></div><div id="pvOut"></div></div>';
    return '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">오늘의 운세 미리보기 (저장 전 작업본 반영)</b><div class="fc-bar"><label>생년월일<input type="date" id="pvD" value="' + esc(PV.date) + '"></label><label>시간<input type="time" id="pvT" value="' + esc(PV.time) + '"></label><label>성별<select id="pvG"><option value="M"' + (PV.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (PV.gender === 'F' ? ' selected' : '') + '>여</option></select></label><label>날짜<input type="date" id="pvDay" value="' + esc(PV.day) + '"></label><button class="pri" id="pvGo">운세 생성</button></div><div id="pvOut"></div></div>';
  }
  function previewBind(body, kind) {
    var go = $('#pvGo', body); if (!go) return;
    go.onclick = function () {
      var out = $('#pvOut', body);
      if (kind === 'tarot') { PV.card = $('#pvCard', body).value; PV.ori = $('#pvOri', body).value; PV.mode = $('#pvMode', body).value; PV.seed = Math.random().toString(36).slice(2, 8); var r = FC.composeTarot(T, PV.card, PV.ori === 'rev', PV.mode, PV.seed, { tarot: G.W.tarot }); out.innerHTML = tarotCard(r); return; }
      PV.date = $('#pvD', body).value; PV.time = $('#pvT', body).value; PV.gender = $('#pvG', body).value; PV.day = $('#pvDay', body).value; out.innerHTML = '<p class="muted">계산 중…</p>';
      C.engine().then(function (M) {
        var d = PV.date.split('-').map(Number), t = (PV.time || '12:00').split(':').map(Number), dd = PV.day.split('-').map(Number);
        var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: PV.gender, city: '서울' });
        var td = FC.todayData(M, ch, Date.UTC(dd[0], dd[1] - 1, dd[2], 3), window.MantraCore.DAYMODE), r = FC.buildDaily(td, { seed: PV.date + PV.gender, overrides: { daily: G.W.daily } });
        out.innerHTML = dailyCard(r);
      }).catch(function (e) { out.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
    };
  }
  var li = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
  function tarotCard(r) {
    var s = r.source; var tag = function (k) { return s[k] === 'card' ? ' <span class="src">· 직접 작성</span>' : ''; };
    return '<div class="fc-pv"><p class="src">' + esc(r.card.nameEn) + ' · ' + (r.rev ? '역방향' : '정방향') + ' · ' + esc(r.category) + ' · 톤 ' + r.tone + '</p>' + (r.verdict ? '<p class="big">' + esc(r.verdictLabel) + '</p>' : '') + '<p class="big">“' + esc(r.headline) + '”' + tag('headline') + '</p><p>' + esc(r.summary) + '</p>' +
      '<h4>상세 해석</h4>' + r.detail.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<h4>지금의 흐름</h4><p>' + esc(r.currentFlow) + '</p><h4>좋은 방향</h4><p>' + esc(r.opportunity) + tag('opportunity') + '</p><h4>조심할 것</h4><p>' + esc(r.caution) + tag('caution') + '</p><h4>오늘 해볼 것</h4>' + li(r.actions) + '<h4>오늘의 한마디</h4><p class="big">“' + esc(r.closing) + '”</p></div>';
  }
  function dailyCard(r) {
    return '<div class="fc-pv"><p class="src">' + esc(r.date) + ' · ' + esc(r.gz) + '日</p><p class="sc">' + r.overallScore + '</p><p>' + esc(r.phase) + ' · ' + esc(r.cond) + '</p><p class="big">“' + esc(r.headline) + '”</p><h4>오늘의 핵심</h4><p>' + esc(r.summary) + '</p><p>' + esc(r.summary2) + '</p>' +
      r.order.map(function (k) { var f = r.fields[k]; return '<h4>' + esc(f.label) + ' · ' + esc(f.band) + ' (' + f.score + ')</h4><p>' + esc(f.summary) + '</p>' + f.detail.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + li(f.goodActions.map(function (x) { return '좋은 행동: ' + x; }).concat(f.cautions.map(function (x) { return '주의: ' + x; }))); }).join('') +
      '<h4>오늘의 행동 처방</h4><p>하면 좋은 것: ' + r.todayActions.map(function (x) { return '#' + esc(x); }).join(' ') + '</p><p>미루면 좋은 것: ' + r.avoidActions.map(function (x) { return '#' + esc(x); }).join(' ') + '</p><p class="big">“' + esc(r.closingMessage) + '”</p>' +
      '<h4>왜 이런 결과가 나왔나요?</h4>' + r.evidence.plain.map(function (x) { return '<p><b>' + esc(x.title) + '</b> ' + esc(x.body) + '</p>'; }).join('') + '<details><summary class="muted">전문 해석</summary>' + li(r.evidence.pro) + '</details>' +
      '<h4>다음 콘텐츠</h4><p>' + esc(r.next.q) + ' → [' + esc(r.next.btn) + '] ' + esc(r.next.to) + '</p></div>';
  }

  window.V2Free = { open: open };
})();
