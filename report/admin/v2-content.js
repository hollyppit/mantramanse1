/* 관리자 v2 콘텐츠: 해석 모듈 · 개운법 · 챕터 설정 · 조합 테스트(DEBUG) · 커버리지.
   V2Content.open('mod'|'rem'|'chap'|'v2test'|'v2cov', 비밀번호). 저장은 /api/report-content (보낸 항목만 교체, 저장 시 version 갱신 → 캐시 키 갱신).
   기본 시드(report/v2/*.js)는 코드에 있고, 여기서 고친 것은 id 기준으로 그 위에 덮어쓰기/추가된다. */
(function () {
  'use strict';
  var R = window.ReportV2, PW = '', $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var CATS_BASE = ['identity', 'elements', 'personality', 'talent', 'shadow', 'career', 'success', 'wealth', 'love', 'marriage', 'relationship', 'compatibility', 'family', 'pastLife', 'daewoon', 'currentCycle', 'sewoon', 'monthly', 'remedy', 'actionPlan'];
  var CATS = CATS_BASE.concat(window.ReportV2 && ReportV2.Topics ? ReportV2.Topics.CATS : []);
  var CAT_KO = Object.assign((window.ReportV2 && ReportV2.Topics ? ReportV2.Topics.CAT_NAME : {}), { identity: '일주', elements: '오행', personality: '성격', talent: '재능', shadow: '그림자', career: '직업', success: '성공 방식', wealth: '재물', love: '연애', marriage: '결혼', relationship: '대인관계', compatibility: '궁합 유형', family: '가족', pastLife: '전생', daewoon: '대운', currentCycle: '현재 대운', sewoon: '세운', monthly: '월운', remedy: '개운 소개', actionPlan: 'Action Plan' });
  var REM_TYPES = ['action', 'growth', 'people', 'place', 'environment', 'timing'], REM_KO = { action: '행동', growth: '성장/학습', people: '사람', place: '공간', environment: '환경', timing: '타이밍' };
  var SEASONS = ['opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense'];
  var SEASON_KO = R.SajuData.SEASONS;
  var COND = { // 조건 키 → [이름, 선택지 | null(직접 입력)]
    dayPillar: ['일주 (쉼표로 여러 개, 예: 갑자,을축)', null], dayMasterStem: ['일간', '갑을병정무기경신임계'.split('')], dayMasterEl: ['일간 오행', ['목', '화', '토', '금', '수']], gender: ['성별', ['남', '여']],
    dominantEl: ['가장 강한 오행', ['목', '화', '토', '금', '수']], lackEl: ['부족한 오행', ['목', '화', '토', '금', '수']], yongEl: ['용신 오행', ['목', '화', '토', '금', '수']],
    dominantGroup: ['가장 강한 십성군', ['비겁', '식상', '재성', '관성', '인성']], weakestGroup: ['가장 약한 십성군', ['비겁', '식상', '재성', '관성', '인성']], strength: ['신강약', ['신강', '중화', '신약']], hasRoot: ['원국 통근', ['있음', '없음']],
    pattern: ['격국·구조 (쉼표, 예: 관살혼잡)', null], star: ['신살 (쉼표, 예: 역마살)', null], career: ['직업 분야', ['creative', 'planning', 'research', 'education', 'business', 'sales', 'management', 'organization', 'technical', 'communication', 'asset', 'public']],
    project: ['프로젝트(상품)', ['full', 'love', 'wealth', 'newyear']], daewoonSeason: ['현재 대운 계절', SEASONS], seunSeason: ['올해 계절', SEASONS], monthSeason: ['이달 계절', SEASONS], needTag: ['필요 행동 태그 (쉼표)', null],
  };
  var LABELS = { full: '종합 운세', love: '애정운', wealth: '재물운', newyear: '신년운세' }; // 프로젝트 id → 이름(관리자 셸이 갱신)
  var ST = { key: 'v2:content', saved: null, loaded: false, eng: null, media: null };

  function api(path, opt) {
    opt = opt || {}; opt.headers = Object.assign({ authorization: 'Bearer ' + PW }, opt.headers || {});
    return fetch(path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ('오류 ' + r.status)); return d; }); });
  }
  function toast(msg, bad) {
    var t = document.createElement('div'); t.textContent = msg; t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;padding:10px 16px;border-radius:8px;background:' + (bad ? '#4A1F1F' : '#16301F') + ';color:#fff;border:1px solid ' + (bad ? '#FF8A78' : '#62C2AE') + ';max-width:90vw';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500);
  }
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var csv = function (s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); };

  var css = document.createElement('style');
  css.textContent = '.v2split{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:14px;align-items:start}@media(max-width:900px){.v2split{grid-template-columns:1fr}}' +
    '.v2list{max-height:72vh;overflow:auto;display:grid;gap:4px}.v2li{padding:7px 9px;border:1px solid var(--line);border-radius:7px;background:var(--bg);cursor:pointer;font-size:.82rem}.v2li.on{border-color:var(--gold)}.v2li.off{opacity:.5}.v2li b{display:block;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.v2li small{color:var(--ink3)}.cg{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 8px}.cg label{cursor:pointer}.cg input{display:none}.cg span{display:inline-block;padding:2px 9px;border-radius:999px;border:1px solid var(--line);font-size:.78rem;color:var(--ink2)}.cg input:checked+span{background:#2A2410;border-color:var(--gold);color:var(--gold)}' +
    '.fx{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.fx2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mono{font-family:ui-monospace,Consolas,monospace;font-size:.78rem}.hit{color:#7FE0BC}.miss{color:#FF9C8C}' +
    '.chrow{display:grid;grid-template-columns:34px 52px 1fr 70px 100px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}.dbgbox{background:#0c0f1a;border:1px solid var(--line);border-radius:6px;padding:8px;margin-top:6px;font-size:.76rem;color:var(--ink2)}';
  document.head.appendChild(css);

  function load() {
    if (ST.loaded) return Promise.resolve();
    return Promise.all([fetch('/api/report-content').then(function (r) { return r.json(); }).catch(function () { return {}; }), fetch('/api/media?all=1', { headers: { authorization: 'Bearer ' + PW } }).then(function (r) { return r.json(); }).catch(function () { return {}; })])
      .then(function (a) { ST.saved = a[0].content || {}; if (ST.saved.remedies) ST.saved.remedies = ST.saved.remedies.map(R.Remedy.normalize); ST.media = a[1].media || []; ST.loaded = true; });
  }
  function engine() {
    if (window.Manse) return Promise.resolve(window.Manse);
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/engine.js'; s.onload = function () { window.Manse ? ok(window.Manse) : bad(new Error('엔진 초기화 실패')); }; s.onerror = function () { bad(new Error('/engine.js 를 불러오지 못했습니다')); }; document.head.appendChild(s); });
  }
  function save(part, b) {
    return api('/api/report-content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(part) }).then(function (d) { ST.saved.version = d.version; toast('저장했습니다 · 콘텐츠 버전 ' + d.version); return d; });
  }
  // 기본 + 저장본 병합 (id 기준)
  function mix(base, extra) { var m = {}, order = []; base.forEach(function (x) { m[x.id] = clone(x); order.push(x.id); }); (extra || []).forEach(function (x) { if (!m[x.id]) order.push(x.id); m[x.id] = Object.assign(m[x.id] || {}, clone(x)); }); return order.map(function (id) { return m[id]; }); }
  var defIds = function (base) { var o = {}; base.forEach(function (x) { o[x.id] = x; }); return o; };

  /* 조건 편집기 */
  function condHtml(c) {
    c = c || {};
    return Object.keys(COND).map(function (k) {
      var def = COND[k], cur = c[k] || [];
      if (!def[1]) return '<div class="fx"><label>' + def[0] + '</label><input type="text" data-c="' + k + '" value="' + esc(cur.join(',')) + '"></div>';
      return '<div class="fx"><label>' + def[0] + '</label><div class="cg" data-cg="' + k + '">' + def[1].map(function (o) { return '<label><input type="checkbox" value="' + o + '"' + (cur.indexOf(o) >= 0 ? ' checked' : '') + '><span>' + (SEASON_KO[o] || LABELS[o] || o) + '</span></label>'; }).join('') + '</div></div>';
    }).join('');
  }
  function condRead(root) {
    var o = {};
    $$('input[data-c]', root).forEach(function (i) { var v = csv(i.value); if (v.length) o[i.dataset.c] = v; });
    $$('.cg[data-cg]', root).forEach(function (g) { var v = $$('input:checked', g).map(function (i) { return i.value; }); if (v.length) o[g.dataset.cg] = v; });
    return o;
  }
  var condText = function (c) { return Object.keys(c || {}).map(function (k) { return (COND[k] ? COND[k][0].split(' ')[0] : k) + '=' + c[k].map(function (x) { return SEASON_KO[x] || LABELS[x] || x; }).join('/'); }).join(' · ') || '조건 없음(폴백)'; };

  /* ═══ 공통 아이템 관리자 (해석 모듈 / 개운법) ═══ */
  function itemAdmin(root, o) { // o: {title, base[], key('modules'|'remedies'), cats, catLabel, fields(html builder), read(fn), blank(fn), summary(fn)}
    var S = { list: [], sel: null, q: '', cat: '', st: '', dirty: false };
    S.list = o.initial ? o.initial : mix(o.base, ST.saved[o.key]); S.dirty = !!o.initialDirty;
    var defs = defIds(o.base);
    root.innerHTML = '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><b style="color:var(--gold)">' + o.title + '</b><span class="muted">기본 시드 위에 덮어쓰기됩니다 · 비활성/삭제 가능</span><span style="flex:1"></span><button id="iNew">+ 새로 만들기</button><button class="pri" id="iSave" disabled>변경사항 저장</button></div>' +
      '<div class="v2split" style="margin-top:12px"><div><div class="row" style="margin-bottom:8px"><input type="text" id="iQ" placeholder="검색(제목·id·키워드)" style="flex:1">' + (o.lockCats ? '' : '<select id="iCat" style="width:auto"><option value="">' + o.catLabel + ' 전체</option>' + o.cats.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '</select>') + '</div><div class="muted" id="iCnt"></div><div class="v2list" id="iList"></div></div><div id="iEd"></div></div></div>';
    function filt() { var q = S.q.toLowerCase(); return S.list.filter(function (x) { return (!S.cat || x[o.catKey] === S.cat) && (!o.lockCats || o.lockCats.indexOf(x[o.catKey]) >= 0) && (!q || (o.title2(x) + ' ' + x.id + ' ' + (x.keywords || x.tags || []).join(' ')).toLowerCase().indexOf(q) >= 0); }); }
    function renderList() {
      var l = filt(); $('#iCnt', root).textContent = '전체 ' + S.list.length + ' · 표시 ' + l.length + (S.dirty ? ' · 저장 안 된 변경 있음' : '');
      $('#iSave', root).disabled = !S.dirty;
      $('#iList', root).innerHTML = l.map(function (x) { return '<div class="v2li' + (S.sel === x.id ? ' on' : '') + (x.enabled === false ? ' off' : '') + '" data-id="' + esc(x.id) + '"><b>' + esc(o.title2(x) || x.id) + '</b><small>' + esc(o.catName(x)) + ' · p' + (x.priority || 0) + (defs[x.id] ? '' : ' · 새로 만든 항목') + ' · ' + esc(condText(x.conditions)) + '</small></div>'; }).join('');
    }
    $('#iList', root).onclick = function (e) { var li = e.target.closest('.v2li'); if (li) { S.sel = li.dataset.id; renderList(); renderEd(); } };
    $('#iQ', root).oninput = function (e) { S.q = e.target.value; renderList(); }; if ($('#iCat', root)) $('#iCat', root).onchange = function (e) { S.cat = e.target.value; renderList(); };
    $('#iNew', root).onclick = function () { var n = o.blank(S.cat || (o.lockCats && o.lockCats[0]) || o.cats[0][0]); S.list.unshift(n); S.sel = n.id; S.dirty = true; renderList(); renderEd(); };
    function renderEd() {
      var x = S.list.filter(function (y) { return y.id === S.sel; })[0], box = $('#iEd', root); if (!x) { box.innerHTML = '<p class="muted">왼쪽에서 항목을 고르거나 새로 만드세요.</p>'; return; }
      box.innerHTML = '<div class="card"><div class="fx2"><div class="fx"><label>id (영문·숫자·_)</label><input type="text" id="eId" value="' + esc(x.id) + '"' + (defs[x.id] ? ' disabled' : '') + '></div><div class="fx"><label>우선순위 (0~100, 같은 조건이면 높은 쪽)</label><input type="number" id="ePri" min="0" max="100" value="' + (x.priority || 0) + '"></div></div>' + o.fields(x) +
        '<details open style="margin-top:8px"><summary><b>선택 조건</b> <span class="muted">비어 있으면 상관없음 · 구체적인 조건일수록 먼저 뽑힙니다</span></summary><div id="eCond">' + condHtml(x.conditions) + '</div></details>' +
        '<label style="display:flex;gap:6px;align-items:center;margin:8px 0"><input type="checkbox" id="eOn"' + (x.enabled !== false ? ' checked' : '') + '>사용</label>' +
        '<div class="row"><button class="pri" id="eApply">적용</button><button id="eTest">이 항목이 선택되는 비율 테스트</button>' + (defs[x.id] ? (S.edited(x) ? '<button id="eRevert">기본값으로 되돌리기</button>' : '') : '<button class="danger" id="eDel">삭제</button>') + '</div><div id="eOut" class="dbgbox" hidden></div></div>';
      $('#eApply', box).onclick = function () {
        var n = o.read(box, clone(x)); n.id = defs[x.id] ? x.id : ($('#eId', box).value.trim() || x.id); n.priority = Math.max(0, Math.min(100, +$('#ePri', box).value || 0)); n.conditions = condRead($('#eCond', box)); n.enabled = $('#eOn', box).checked;
        if (!/^[\w.\-가-힣]{1,80}$/.test(n.id)) return toast('id 는 영문·숫자·한글·_ . - 만 쓸 수 있습니다', true);
        if (n.id !== x.id && S.list.some(function (y) { return y.id === n.id; })) return toast('이미 있는 id 입니다', true);
        var i = S.list.indexOf(x); S.list[i] = n; S.sel = n.id; S.dirty = true; renderList(); renderEd(); o.onChange && o.onChange(S.list);
      };
      var rv = $('#eRevert', box); if (rv) rv.onclick = function () { S.list[S.list.indexOf(x)] = clone(defs[x.id]); S.dirty = true; renderList(); renderEd(); o.onChange && o.onChange(S.list); };
      var dl = $('#eDel', box); if (dl) dl.onclick = function () { if (confirm('삭제할까요?')) { S.list = S.list.filter(function (y) { return y !== x; }); S.sel = null; S.dirty = true; renderList(); renderEd(); } };
      $('#eTest', box).onclick = function () { condTest(clone(Object.assign({}, x, { conditions: condRead($('#eCond', box)) })), $('#eOut', box), o.key); };
    }
    S.edited = function (x) { return JSON.stringify(x) !== JSON.stringify(defs[x.id]); };
    $('#iSave', root).onclick = function () {
      var out = S.list.filter(function (x) { return !defs[x.id] || S.edited(x); }); var part = {}; part[o.key] = out;
      this.disabled = true; save(part).then(function () { ST.saved[o.key] = out; S.dirty = false; renderList(); o.onChange && o.onChange(S.list, true); }).catch(function (e) { toast(e.message, true); renderList(); });
    };
    renderList(); renderEd();
  }
  // "현재 어떤 사주 조건에서 이 항목이 선택되는가" — 무작위 사주 400개로 선택 비율을 잰다(실제 엔진 계산)
  function condTest(item, out, key) {
    out.hidden = false; out.textContent = '엔진 불러오는 중…';
    engine().then(function (M) {
      var n = 400, hit = 0, ex = [], seed = 11, rnd = function (k) { return (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % k; }, ev = R.Rules.evaluate;
      for (var i = 0; i < n; i++) {
        var ch = M.compute({ year: 1940 + rnd(80), month: 1 + rnd(12), day: 1 + rnd(28), hour: rnd(24), minute: 0, calendar: 'solar', leap: false, gender: rnd(2) ? 'M' : 'F', city: '서울' });
        var sd = R.SajuData.build(ch, { now: Date.now() + rnd(3000) * 86400e3 }), f = R.Rules.flatten(sd); f.needTag = R.Remedy.needs(sd).tags;
        if (ev(item, f).match) { hit++; if (ex.length < 4) ex.push(sd.dayPillar.ko + (sd.gender === 'M' ? '남' : '여') + ' ' + sd.strength.band + ' ' + sd.dominantGroup); }
      }
      out.innerHTML = '무작위 사주 ' + n + '개 중 <b>' + hit + '개(' + Math.round(hit / n * 100) + '%)</b>가 이 조건에 맞습니다.' + (hit === 0 ? ' <span class="miss">맞는 사주가 없습니다 — 조건이 너무 좁거나 모순일 수 있어요.</span>' : '') + (ex.length ? '<br>예: ' + esc(ex.join(' / ')) : '') + '<br><span class="muted">조건이 맞아도 같은 챕터의 다른 후보와 점수(구체성+우선순위)로 경쟁합니다.</span>';
    }).catch(function (e) { out.textContent = e.message; });
  }

  var tf = function (id, lbl, v, big) { return '<div class="fx"><label>' + lbl + '</label>' + (big ? '<textarea id="' + id + '">' + esc(v) + '</textarea>' : '<input type="text" id="' + id + '" value="' + esc(v) + '">') + '</div>'; };
  function modCfg() {
    return { title: '해석 모듈', base: R.Content.modules, key: 'modules', catKey: 'category', cats: CATS.map(function (c) { return [c, CAT_KO[c]]; }), catLabel: '카테고리', title2: function (x) { return x.headline; }, catName: function (x) { return CAT_KO[x.category] || x.category; },
      blank: function (cat) { return { id: 'mod_' + Date.now().toString(36), category: cat, conditions: {}, priority: 50, headline: '', summary: '', detail: '', keywords: [], imageTags: [], actionTags: [], extra: null, enabled: true }; },
      fields: function (x) { return '<div class="fx"><label>카테고리</label><select id="eCat">' + CATS.map(function (c) { return '<option value="' + c + '"' + (x.category === c ? ' selected' : '') + '>' + CAT_KO[c] + ' (' + c + ')</option>'; }).join('') + '</select></div>' + tf('eH', '핵심 문장 (headline, 1~2문장)', x.headline) + tf('eS', '짧은 설명 (summary)', x.summary, 1) + tf('eD', '상세 풀이 (detail, "자세히 보기"에 펼침)', x.detail, 1) +
        '<div class="fx2">' + tf('eK', '키워드 (쉼표)', (x.keywords || []).join(', ')) + tf('eI', '이미지 태그 imageTags (쉼표, 예: wood,growth,forest)', (x.imageTags || []).join(', ')) + '</div>' + tf('eA', '행동 태그 actionTags (쉼표)', (x.actionTags || []).join(', ')) +
        '<div class="fx"><label>구조화 보조 항목 extra (JSON, 선택) — 직업 환경·재물 항목 등</label><textarea id="eX" class="mono">' + esc(x.extra ? JSON.stringify(x.extra, null, 1) : '') + '</textarea></div><p class="muted">문장 속 {dayMasterEl} {yongEl} {el.인성} 같은 자리는 개인 사실로 치환됩니다. "반드시·무조건·확정" 표현은 쓰지 마세요.</p>'; },
      read: function (b, n) { n.category = $('#eCat', b).value; n.headline = $('#eH', b).value; n.summary = $('#eS', b).value; n.detail = $('#eD', b).value; n.keywords = csv($('#eK', b).value); n.imageTags = csv($('#eI', b).value); n.actionTags = csv($('#eA', b).value);
        var x = $('#eX', b).value.trim(); try { n.extra = x ? JSON.parse(x) : null; } catch (e) { toast('extra JSON 형식이 올바르지 않아 비웠습니다', true); n.extra = null; } if (/(반드시|무조건|확정)/.test(n.headline + n.summary + n.detail)) toast('단정 표현이 포함되어 있습니다. 문구를 확인하세요', true); return n; } };
  }
  function remCfg() {
    return { title: '개운법 라이브러리', base: R.Remedy.LIBRARY, key: 'remedies', catKey: 'type', cats: REM_TYPES.map(function (c) { return [c, REM_KO[c]]; }), catLabel: '유형', title2: function (x) { return x.title; }, catName: function (x) { return REM_KO[x.type] || x.type; },
      blank: function (t) { return { id: 'rem_' + Date.now().toString(36), type: t, title: '', summary: '', detail: '', tags: [], conditions: {}, priority: 50, enabled: true, extra: null, imageUrl: '' }; },
      fields: function (x) { return '<div class="g2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="fx"><label>유형</label><select id="eType">' + REM_TYPES.map(function (c) { return '<option value="' + c + '"' + (x.type === c ? ' selected' : '') + '>' + REM_KO[c] + ' (' + c + ')</option>'; }).join('') + '</select></div><div class="fx"><label>행동의 종류 (유형이 "행동"일 때)</label><select id="eKind"><option value=""' + (!(x.extra && x.extra.kind === 'exercise') ? ' selected' : '') + '>일반 행동</option><option value="exercise"' + (x.extra && x.extra.kind === 'exercise' ? ' selected' : '') + '>운동·활동 (건강 처방이 아닌 활동 추천)</option></select></div></div>' + tf('eT', '제목', x.title) + tf('eS', '요약', x.summary, 1) + tf('eD', '상세', x.detail, 1) + tf('eTg', '태그 (쉼표) — 필요 행동 태그와 겹칠수록 추천됩니다 (output, learning, recovery, connection …)', (x.tags || []).join(', ')) + tf('eImg', '이미지 주소 (선택)', x.imageUrl || '') +
        '<div class="fx"><label>extra (JSON, 선택) — 체크리스트 check, 주의 avoid, 운동·활동은 kind:"exercise" + energyTags/intensity 등</label><textarea id="eX" class="mono">' + esc(x.extra ? JSON.stringify(x.extra, null, 1) : '') + '</textarea></div>'; },
      read: function (b, n) { n.type = $('#eType', b).value; n.title = $('#eT', b).value; n.summary = $('#eS', b).value; n.detail = $('#eD', b).value; n.tags = csv($('#eTg', b).value); n.imageUrl = $('#eImg', b).value.trim(); var x = $('#eX', b).value.trim(); try { n.extra = x ? JSON.parse(x) : null; } catch (e) { toast('extra JSON 형식 오류 — 비웠습니다', true); n.extra = null; }
        var kd = $('#eKind', b) ? $('#eKind', b).value : ''; if (kd === 'exercise' && n.type === 'action') { n.extra = n.extra || {}; n.extra.kind = 'exercise'; } else if (n.extra && n.extra.kind) { delete n.extra.kind; if (!Object.keys(n.extra).length) n.extra = null; }
        return n; } };
  }

  /* ═══ 커버리지 (콘텐츠) ═══ */
  function covOpen(root) {
    load().then(function () {
      var pack = R.Compose.fromSaved(ST.saved, ST.media), mods = pack.lib.modules.filter(function (m) { return m.enabled !== false; }), rems = pack.lib.remedies.filter(function (m) { return m.enabled !== false; });
      var by = function (arr, f) { var o = {}; arr.forEach(function (x) { var k = f(x); o[k] = (o[k] || 0) + 1; }); return o; };
      var condCount = function (k, vals) { return vals.map(function (v) { var n = mods.filter(function (m) { return ((m.conditions || {})[k] || []).indexOf(v) >= 0; }).length; return '<span class="chip' + (n ? '' : ' gray') + '">' + (SEASON_KO[v] || v) + ' ' + n + '</span>'; }).join(''); };
      var ilju = R.Media.ILJU, withIlju = ilju.filter(function (p) { return mods.some(function (m) { return ((m.conditions || {}).dayPillar || []).map(R.Media.normPillar).indexOf(p) >= 0; }); });
      var cat = by(mods, function (m) { return m.category; }), rt = by(rems, function (m) { return m.type; });
      root.innerHTML = '<div class="card"><b style="color:var(--gold)">콘텐츠 커버리지</b> <span class="muted">조건이 있는 모듈이 각 사주 구조를 얼마나 덮는지 · 비면 기본 안내(폴백)가 보입니다</span>' +
        '<h4>카테고리별 모듈 수</h4><div>' + CATS.map(function (c) { return '<span class="chip' + ((cat[c] || 0) > 1 ? '' : ' gray') + '">' + CAT_KO[c] + ' ' + (cat[c] || 0) + '</span>'; }).join('') + '</div>' +
        '<h4>개운법 유형별</h4><div>' + REM_TYPES.map(function (c) { return '<span class="chip">' + REM_KO[c] + ' ' + (rt[c] || 0) + '</span>'; }).join('') + '</div>' +
        '<h4>조건별 모듈 수</h4><div class="muted">일간 오행</div>' + condCount('dayMasterEl', ['목', '화', '토', '금', '수']) + '<div class="muted">우세 오행·부족 오행</div>' + condCount('dominantEl', ['목', '화', '토', '금', '수']) + condCount('lackEl', ['목', '화', '토', '금', '수']) + '<div class="muted">십성군(우세)</div>' + condCount('dominantGroup', ['비겁', '식상', '재성', '관성', '인성']) + '<div class="muted">신강약</div>' + condCount('strength', ['신강', '중화', '신약']) +
        '<div class="muted">대운 계절 / 세운 계절 / 월운 계절</div>' + condCount('daewoonSeason', SEASONS) + '<br>' + condCount('seunSeason', SEASONS) + '<br>' + condCount('monthSeason', SEASONS) + '<div class="muted">직업 분야</div>' + condCount('career', COND.career[1]) +
        '<h4>일주별 전용 해석 ' + withIlju.length + ' / 60</h4><div class="muted">' + (withIlju.length ? '있음: ' + withIlju.join(' ') : '아직 일주 전용 모듈이 없습니다. 일간 오행 수준의 기본 해석이 대신 표시됩니다. 해석 모듈에서 "일주" 조건을 넣어 추가하세요.') + '</div>' +
        '<h4>빈 챕터 가능성 시뮬레이션</h4><div class="row"><button id="vSim">무작위 사주 500개로 점검</button></div><div id="vOut" class="dbgbox" hidden></div></div>';
      $('#vSim', root).onclick = function () {
        var o = $('#vOut', root); o.hidden = false; o.textContent = '계산 중…';
        engine().then(function (M) {
          var seed = 5, rnd = function (k) { return (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % k; }, fb = {}, noMedia = 0, n = 500, tot = 0;
          for (var i = 0; i < n; i++) {
            var sd = R.SajuData.build(M.compute({ year: 1940 + rnd(80), month: 1 + rnd(12), day: 1 + rnd(28), hour: rnd(24), minute: 0, calendar: 'solar', leap: false, gender: rnd(2) ? 'M' : 'F', city: '서울' }), { now: Date.now() + rnd(3000) * 86400e3 }), rep = R.Compose.build(sd, pack.lib, pack.cfg);
            rep.chapters.forEach(function (c) { tot++; if (/_fallback$/.test(c.modules[0] || '')) fb[c.id + ' ' + c.title] = (fb[c.id + ' ' + c.title] || 0) + 1; c.scenes.forEach(function (s) { if (!s.media && R.Scenes.SCENE_RULES[s.sceneType].media) noMedia++; }); });
          }
          var keys = Object.keys(fb).sort();
          o.innerHTML = '챕터 ' + tot + '개 중 기본 안내(폴백)로만 채워진 챕터: <b>' + keys.reduce(function (s, k) { return s + fb[k]; }, 0) + '개</b><br>' + (keys.length ? keys.map(function (k) { return esc(k) + ' — ' + fb[k] + '회 (' + Math.round(fb[k] / n * 100) + '%)'; }).join('<br>') : '<span class="hit">모든 챕터가 조건 있는 모듈로 채워졌습니다.</span>') + '<br>미디어가 없어 자리표시가 된 장면: <b>' + noMedia + '개</b> (사주 1명당 평균 ' + (noMedia / n).toFixed(1) + '개)';
        }).catch(function (e) { o.textContent = e.message; });
      };
    });
  }

  // 새 관리자 셸(v2-shell.js)이 쓰는 공용 부품
  // 영상 동작·감정 선택(Kling 프롬프트 뒤에 덧붙는 한 문장). 기본 프롬프트의 "가만히 서 있는" 지시보다 우선하도록 명시한다.
  var MOTIONS = [['', '기본 (영화적인 슬로우모션)', ''], ['smile', '살짝 미소', 'a gentle warm smile slowly forming on the face'], ['laugh', '소리 내어 웃음', 'laughing joyfully, mouth open, shoulders shaking lightly'], ['cry', '조용히 눈물', 'quietly tearing up, a tear rolling down the cheek, eyes glistening'], ['sad', '쓸쓸한 표정', 'a wistful, melancholic expression, gaze lowered, slow sigh'], ['surprise', '깜짝 놀람', 'eyes widening in surprise, a small gasp, slight lean back'], ['angry', '화난 표정', 'a tense angry expression, furrowed brows, jaw clenched'], ['talk', '이야기하며 손짓', 'talking naturally, lips moving, expressive hand gestures'], ['nod', '고개 끄덕임', 'nodding slowly in agreement, a soft smile'], ['look', '천천히 돌아봄', 'slowly turning the head to look toward the camera'], ['walk', '천천히 걸어감', 'walking slowly forward with a natural gait, clothes and hair swaying'], ['wind', '바람에 머리카락·옷자락', 'hair and clothes flowing softly in the wind, the character otherwise calm'], ['hug', '포옹 · 서로 기댐', 'leaning in close and embracing warmly']];
  function motionOptions() { return MOTIONS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join(''); }
  function motionText(v) { var m = MOTIONS.filter(function (x) { return x[0] === v; })[0]; return m && m[2] ? 'Motion and emotion (takes priority over any instruction above to stay still or keep the mouth closed): ' + m[2] + '.' : ''; }
  window.V2Content = { motionOptions: motionOptions, motionText: motionText, LABELS: LABELS, CATS: CATS, CAT_KO: CAT_KO, REM_TYPES: REM_TYPES, REM_KO: REM_KO, COND: COND, SEASONS: SEASONS, ST: ST, api: api, toast: toast, load: load, engine: engine, save: save, mix: mix, clone: clone, csv: csv, esc: esc, setPw: function (p) { PW = p; },
    itemAdmin: itemAdmin, modCfg: modCfg, remCfg: remCfg, covOpen: covOpen, condText: condText };
})();
