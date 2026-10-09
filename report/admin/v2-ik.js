/* 관리자 "풀이 지식" 4개 화면 — 풀이 지식 · 풀이 구성 · AI 작성 설정 · 풀이 테스트. 저장은 /api/ik (KV 'ik:' 키). 새 명리 계산은 없다(조건은 엔진이 실제로 주는 값만).
   비개발자용 원칙: JSON·SQL·내부 ID 를 첫 화면에 보이지 않는다 / 조건은 칩으로 고르고 자연어 문장으로 다시 보여 준다 / 풀이 테스트에서 바로 고쳐서 다시 분석한다.
   탭: ikknow · ikdesign · ikrules · iklab. index.html 의 showTab 이 V2IK.open(탭, 비밀번호) 를 부른다. */
(function () {
  'use strict';
  var R = window.ReportV2, C = window.V2Content, esc = C.esc, toast = C.toast;
  var PANE = null; // 기존 관리자와 id 가 겹치지 않도록(eTitle·ePri 등) 검색 범위를 현재 패널로 제한한다
  var $ = function (s, e) { return (e || PANE || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || PANE || document).querySelectorAll(s)); };
  var G = { meta: null, items: null, stats: null, f: { q: '', domain: '', status: '', reviewed: '', conf: '', open: '' }, covOpen: '', design: null, dDomain: 'MONEY', lab: null, labTab: 'final', focus: null, ack: {} };
  var DOM_ORDER = ['SELF', 'MONEY', 'CAREER', 'LOVE', 'MARRIAGE', 'RELATIONSHIP', 'TIMING', 'ACTION'];
  var dko = function (d) { return (G.meta && G.meta.domains[d]) || d; };
  var STATUS_KO = { draft: '임시저장', review: '검수 필요', approved: '검수 완료(비공개)', published: '공개 중', archived: '보관' };
  var CONF_KO = { high: '높음', mid: '보통', low: '낮음' }, LV = { weak: '약함', mid: '보통', strong: '강함' };
  var STEMS = '갑을병정무기경신임계'.split(''), BR = '자축인묘진사오미신유술해'.split(''), ELS = ['목', '화', '토', '금', '수'], GRPS = ['비겁', '식상', '재성', '관성', '인성'];
  var TENG = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'], SEAS = ['기회기', '확장기', '수확기', '축적기', '전환기', '방어기'];
  var STEM_EL = { 갑: '목', 을: '목', 병: '화', 정: '화', 무: '토', 기: '토', 경: '금', 신: '금', 임: '수', 계: '수' };
  var PILLARS = (function () { var a = []; for (var i = 0; i < 60; i++) a.push(STEMS[i % 10] + BR[i % 12]); return a; })();
  var EFFECT = { strengthen: '이 성향이 더 강해짐', soften: '이 성향이 완화됨', replace: '다른 해석으로 대체', exception: '예외로 본다' };
  var STANCE = { neutral: '설명·중립', positive: '유리한 쪽(확장·기회)', caution: '조심할 쪽(주의·점검)' };

  /* 조건 종류: [화면 이름, 입력 방식, 선택지, 고급 여부] — 입력 방식: opts(여러 개 중 고르기) | text(직접 입력) | map(항목별 강약) */
  var F = {
    dayMaster: ['일간', 'opts', STEMS, 0], dayPillar: ['일주', 'text', PILLARS, 0], strength: ['신강/신약', 'opts', ['신강', '중화', '신약'], 0], hasRoot: ['통근', 'opts', ['있음', '없음'], 0],
    el: ['오행 강약', 'map', ELS, 0], group: ['십성(비겁·식상·재성·관성·인성) 강약', 'map', GRPS, 0],
    monthBranch: ['태어난 달(월령)', 'opts', BR, 1], season: ['태어난 계절', 'opts', ['봄', '여름', '가을', '겨울'], 1], dayBranch: ['일지(배우자 자리)', 'opts', BR, 1], yongEl: ['용신 오행', 'opts', ELS, 1],
    pattern: ['격국·구조', 'text', ['관살혼잡', '상관견관', '상관패인', '군겁쟁재'], 1], star: ['신살', 'text', ['천을귀인', '도화살', '역마살', '화개살', '괴강살', '현침살', '천덕귀인', '월덕귀인'], 1], relation: ['합·충·형·파·해', 'text', ['육합', '방합', '삼합', '충', '형', '파', '해', '원진'], 1],
    daewoonSeason: ['현재 대운의 흐름', 'opts', SEAS, 1], seunSeason: ['올해(세운)의 흐름', 'opts', SEAS, 1], monthSeason: ['이달(월운)의 흐름', 'opts', SEAS, 1], futureSeason3: ['앞으로 3년에 포함되는 흐름', 'opts', SEAS, 1], futureSeason5: ['앞으로 5년에 포함되는 흐름', 'opts', SEAS, 1],
    tenGod: ['십성 10종 강약', 'map', TENG, 1]
  };
  var BASIC = Object.keys(F).filter(function (k) { return !F[k][3]; }), ADV = Object.keys(F).filter(function (k) { return F[k][3]; });

  var css = document.createElement('style');
  css.textContent = '.ik-dash{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:12px}.ik-dash .n{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 12px}.ik-dash b{display:block;font-size:1.3rem;color:var(--gold)}.ik-dash span{font-size:.76rem;color:var(--ink3)}' +
    '.ik-cov{display:grid;gap:6px;margin:8px 0}.ik-cr{display:grid;grid-template-columns:96px 1fr 150px;gap:10px;align-items:center;font-size:.84rem;cursor:pointer;padding:3px 4px;border-radius:6px}.ik-cr:hover{background:#12162a}.ik-cb{height:10px;border-radius:5px;background:#1b1f30;overflow:hidden}.ik-cb i{display:block;height:100%;background:var(--gold)}.ik-cb.bad i{background:#B8742A}.ik-cb.low i{background:#FF8A78}.ik-cr small{color:var(--ink3)}@media(max-width:600px){.ik-cr{grid-template-columns:70px 1fr}.ik-cr>:nth-child(3){grid-column:1/-1}}' +
    '.ik-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.ik-bar select,.ik-bar input{width:auto;min-width:110px}.ik-bar input.q{flex:1;min-width:200px}.ik-chipbtn{border-radius:999px;padding:4px 12px;font-size:.82rem}.ik-chipbtn.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.ik-row{display:grid;grid-template-columns:minmax(0,1.6fr) 90px minmax(0,1.6fr) 96px 84px 76px;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer;font-size:.84rem}.ik-row:hover{background:#12162a}.ik-row.h{color:var(--ink3);font-size:.75rem;cursor:default}.ik-row.h:hover{background:none}.ik-row small{color:var(--ink3);display:block}@media(max-width:900px){.ik-row{grid-template-columns:1fr 90px}.ik-row>:nth-child(3),.ik-row>:nth-child(5),.ik-row>:nth-child(6){display:none}}' +
    '.ik-st{display:inline-block;font-size:.72rem;padding:0 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink2);white-space:nowrap}.ik-st.published{border-color:#62C2AE;color:#7FE0BC}.ik-st.approved{border-color:var(--gold);color:var(--gold)}.ik-st.review{border-color:#B8742A;color:#FFC080}.ik-st.draft{color:var(--ink3)}.ik-st.archived{opacity:.5}.ik-ai{border-color:#9B7BFF;color:#C9B8FF}.ik-ok{color:#7FE0BC}.ik-no{color:var(--ink3)}' +
    '.ik-sec{margin:18px 0 6px;font-family:"Noto Serif KR",serif;color:var(--gold);font-size:1rem}.ik-sec small{display:block;color:var(--ink3);font-family:inherit;font-size:.78rem;margin-top:2px;font-weight:400}.ik-f{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.ik-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:700px){.ik-g2{grid-template-columns:1fr}}' +
    '.ik-steps{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 14px}.ik-steps button{border-radius:999px;padding:5px 14px;font-size:.84rem;color:var(--ink2)}.ik-steps button.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}.ik-steps button.done{color:#7FE0BC}' +
    '.ik-dc{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.ik-dc button{text-align:left;padding:10px 12px;border-radius:10px}.ik-dc button.on{border-color:var(--gold);background:#1c1a12;color:var(--gold)}' +
    '.ik-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.ik-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 4px 3px 12px;border-radius:999px;border:1px solid var(--gold-d);color:var(--gold);font-size:.84rem;background:#1c1a12}.ik-chip button{border:0;background:none;padding:0 8px;color:var(--ink3);font-size:1rem;line-height:1}.ik-chip.not{border-color:#FF8A78;color:#FF9C8C}' +
    '.ik-nl{padding:9px 12px;border-radius:8px;background:#0e1120;border:1px dashed var(--line);font-size:.9rem;line-height:1.7;margin:6px 0}.ik-nl b{color:var(--gold)}.ik-add{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);margin:8px 0}.ik-opts{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.ik-opts button{padding:3px 12px;border-radius:999px;font-size:.84rem}.ik-opts button.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.ik-li{display:flex;gap:6px;margin:4px 0}.ik-li input{flex:1}.ik-li button{padding:2px 10px}.ik-mod{border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:#0e1120}.ik-radio{display:flex;gap:8px 16px;flex-wrap:wrap;margin:6px 0}.ik-radio label{display:flex;gap:5px;align-items:center;font-size:.86rem;cursor:pointer}.ik-radio input{width:auto}' +
    '.ik-foot{position:sticky;bottom:0;background:var(--bg2);border-top:1px solid var(--line);padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:18px;z-index:5}' +
    '.ik-det h2{font-size:1.15rem;color:var(--ink);margin:4px 0}.ik-det .nl{color:var(--gold);margin:2px 0 10px}.ik-det h4{margin:14px 0 4px;color:var(--gold);font-size:.82rem;letter-spacing:.1em}.ik-det ul{margin:2px 0 0 18px;padding:0}.ik-det p{margin:3px 0;line-height:1.75}.ik-det blockquote{margin:4px 0;padding:6px 12px;border-left:3px solid var(--gold-d);color:var(--ink)}' +
    '.ik-dz{display:grid;grid-template-columns:24px 28px minmax(0,1fr) 170px 70px 70px 70px;gap:6px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);margin:4px 0;font-size:.86rem}.ik-dz.off{opacity:.5}.ik-dz.over{border-color:var(--gold)}.ik-dz .gr{cursor:grab;color:var(--ink3)}.ik-dz input[type=text]{padding:3px 8px}@media(max-width:800px){.ik-dz{grid-template-columns:24px 1fr 70px 70px}.ik-dz>:nth-child(2),.ik-dz>:nth-child(4),.ik-dz>:nth-child(7){display:none}}' +
    '.ik-labtabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:12px 0;overflow-x:auto;white-space:nowrap}.ik-labtabs button{border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--ink2);padding:8px 14px}.ik-labtabs button.on{color:var(--gold);border-color:var(--gold)}' +
    '.ik-k{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0;font-size:.84rem;background:var(--bg)}.ik-k.off{opacity:.6}.ik-k b{color:var(--ink)}.ik-k .why{margin-top:3px;color:var(--ink3);font-size:.78rem}.ik-k.cf{border-color:#B8742A}.ik-kv{display:grid;grid-template-columns:96px 1fr;gap:2px 8px;font-size:.84rem;margin:2px 0}.ik-kv span{color:var(--ink3)}' +
    '.ik-p{padding:6px 10px;margin:3px 0;line-height:1.8;font-size:.92rem}.ik-sh{display:flex;gap:8px;align-items:center;margin:16px 0 2px;color:var(--gold);font-family:"Noto Serif KR",serif}.ik-sh button{padding:1px 10px;font-size:.76rem}.ik-ins{color:var(--ink3);font-size:.84rem;padding:8px 10px;border:1px dashed var(--line);border-radius:8px}' +
    '.ik-q{padding:8px 12px;border-radius:8px;margin:8px 0;font-size:.84rem;border:1px solid var(--line)}.ik-q.PASS{border-color:#62C2AE}.ik-q.WARNING{border-color:#B8742A}.ik-q.FAIL{border-color:#FF8A78}.ik-diag{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:8px 0}.ik-diag div{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:.8rem;color:var(--ink3)}.ik-diag b{display:block;color:var(--gold);font-size:.95rem;margin-top:2px}.ik-diag small{display:block;font-size:.7rem;margin-top:2px}' +
    '.ik-dr{position:fixed;right:0;top:0;bottom:0;width:min(460px,100vw);background:var(--bg2);border-left:1px solid var(--gold-d);z-index:60;overflow:auto;padding:16px;box-shadow:-8px 0 30px rgba(0,0,0,.5)}.ik-dr h4{margin:14px 0 4px;color:var(--gold);font-size:.85rem;letter-spacing:.06em}dialog.ik-dlg{width:min(900px,96vw);max-height:94vh;overflow:auto;padding:16px}';
  document.head.appendChild(css);

  /* ───────── 통신 ───────── */
  var api = function (p, o) { return C.api(p, o); };
  var post = function (a, body) { return api('/api/ik?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); };
  function loadMeta() { return api('/api/ik?a=meta').then(function (m) { G.meta = m; G.design = JSON.parse(JSON.stringify(m.design || {})); return m; }); }
  function loadItems() { return Promise.all([api('/api/ik?a=list'), api('/api/ik?a=stats')]).then(function (a) { G.items = a[0].items; G.stats = a[1]; }); }
  var tag = function (cls, t) { return '<span class="ik-st ' + cls + '">' + esc(t) + '</span>'; };
  var date = function (s) { return s ? String(s).slice(0, 10) : ''; };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var isEmpty = function (o) { return !o || !Object.keys(o).length; };

  /* ───────── 조건 → 자연어 ───────── */
  function chipsOf(c) { // [{k, key?, text}]
    var out = []; Object.keys(F).forEach(function (k) {
      var v = c && c[k]; if (!v) return; var d = F[k];
      if (d[1] === 'map') Object.keys(v).forEach(function (kk) { out.push({ k: k, key: kk, text: kk + ' ' + LV[v[kk]] }); });
      else { var t = k === 'dayMaster' ? v.map(function (s) { return s + (STEM_EL[s] || ''); }).join('/') + ' 일간' : k === 'hasRoot' ? '통근 ' + v.join('/') : k === 'season' ? v.join('/') + '에 태어남' : k === 'monthBranch' ? '월령 ' + v.join('/') : k === 'dayPillar' ? v.join('/') + ' 일주' : k === 'strength' ? v.join('/') : d[0] + ' ' + v.join('/'); out.push({ k: k, text: t }); }
    }); return out;
  }
  var iga = function (w) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c % 28 !== 0 ? '이' : '가'; }; // 받침에 맞는 조사
  function sentence(c) {
    var parts = []; Object.keys(F).forEach(function (k) {
      var v = c && c[k]; if (!v) return;
      var or = function (a) { return a.join(' 또는 '); };
      if (F[k][1] === 'map') Object.keys(v).forEach(function (kk) { parts.push(kk + iga(kk) + ' ' + ({ weak: '약하고', mid: '보통이고', strong: '강하고' })[v[kk]]); });
      else if (k === 'dayMaster') parts.push(or(v.map(function (s) { return s + (STEM_EL[s] || ''); })) + ' 일간이고');
      else if (k === 'dayPillar') parts.push(or(v) + ' 일주이고');
      else if (k === 'strength') parts.push(v.length === 1 && v[0] !== '중화' ? v[0] + '하고' : or(v) + '이고');
      else if (k === 'hasRoot') parts.push(v[0] === '있음' ? '통근이 있고' : '통근이 없고');
      else if (k === 'monthBranch') parts.push(or(v) + '월(월지)에 태어났고'); else if (k === 'season') parts.push(or(v) + '에 태어났고');
      else if (k === 'dayBranch') parts.push('일지가 ' + or(v) + '이고'); else if (k === 'yongEl') parts.push('용신이 ' + or(v) + '이고');
      else if (k === 'pattern') parts.push(or(v) + ' 구조가 있고'); else if (k === 'star') parts.push(or(v) + '이(가) 있고'); else if (k === 'relation') parts.push(or(v) + ' 작용이 있고');
      else if (k === 'daewoonSeason') parts.push('현재 대운이 ' + or(v) + '이고'); else if (k === 'seunSeason') parts.push('올해가 ' + or(v) + '이고'); else if (k === 'monthSeason') parts.push('이달이 ' + or(v) + '이고');
      else if (k === 'futureSeason3') parts.push('앞으로 3년 안에 ' + or(v) + '이(가) 있고'); else if (k === 'futureSeason5') parts.push('앞으로 5년 안에 ' + or(v) + '이(가) 있고');
    });
    if (!parts.length) return '조건 없음 — 모든 사주에 적용되는 일반 풀이';
    var last = parts[parts.length - 1].replace(/하고$/, '한').replace(/이고$/, '인').replace(/있고$/, '있는').replace(/없고$/, '없는').replace(/났고$/, '난').replace(/고$/, '');
    parts[parts.length - 1] = last; return parts.join(' ') + ' 경우';
  }
  function shortConds(it, n) { var t = chipsOf(it.conditions).map(function (x) { return x.text; }); if ((it.alsoWhen || []).length) t.push('또는 …'); return t.length ? t.slice(0, n || 4).join(' · ') + (t.length > (n || 4) ? ' 외' : '') : '조건 없음(일반 풀이)'; }

  /* ───────── 조건 편집기(칩 + 자연어 미리보기) ───────── */
  // box 안에 그린다. conds 를 직접 고친다. o.exclude: 적용하지 않는 경우(칩 색 다름)
  function condEditor(box, conds, o) {
    o = o || {}; var pend = null;
    function draw() {
      var chips = chipsOf(conds);
      var h = '<div class="ik-chips">' + (chips.length ? chips.map(function (c, i) { return '<span class="ik-chip' + (o.exclude ? ' not' : '') + '">' + esc(c.text) + '<button type="button" data-rm="' + i + '" aria-label="조건 빼기">×</button></span>'; }).join('') : '<span class="muted" style="font-size:.84rem">' + (o.exclude ? '적용하지 않는 조건이 없습니다' : '아직 조건이 없습니다 — 조건 없이 저장하면 모든 사주에 쓰이는 일반 풀이가 됩니다') + '</span>') + '</div>';
      h += '<div class="ik-nl">' + (o.exclude ? '<b>다음 경우에는 이 풀이를 쓰지 않습니다 →</b> ' : '<b>이 풀이는</b> ') + esc(sentence(conds)) + (o.exclude ? '' : '에 사용됩니다.') + '</div>';
      h += '<div class="ik-add"><div class="ik-bar" style="margin:0"><select data-type><option value="">+ 조건 추가…</option>' + BASIC.map(function (k) { return '<option value="' + k + '">' + F[k][0] + '</option>'; }).join('') + '<optgroup label="고급 설정">' + ADV.map(function (k) { return '<option value="' + k + '">' + F[k][0] + '</option>'; }).join('') + '</optgroup></select></div><div data-val></div></div>';
      box.innerHTML = h; bind();
    }
    function bind() {
      $$('[data-rm]', box).forEach(function (b) { b.onclick = function () { var c = chipsOf(conds)[+b.dataset.rm]; if (c.key) { delete conds[c.k][c.key]; if (isEmpty(conds[c.k])) delete conds[c.k]; } else delete conds[c.k]; draw(); }; });
      var sel = $('[data-type]', box); sel.onchange = function () { pend = sel.value ? { k: sel.value, vals: (F[sel.value][1] === 'opts' && conds[sel.value]) ? conds[sel.value].slice() : [] } : null; val(); };
    }
    function val() {
      var v = $('[data-val]', box); if (!pend) { v.innerHTML = ''; return; } var d = F[pend.k], h = '<p class="muted" style="margin:6px 0 2px;font-size:.78rem">' + d[0] + (d[1] === 'opts' ? ' — 여러 개를 고르면 "또는" 으로 읽습니다' : d[1] === 'text' ? ' — 쉼표로 구분해 입력' : ' — 항목과 강약을 고르세요') + '</p>';
      if (d[1] === 'opts') h += '<div class="ik-opts">' + d[2].map(function (x) { return '<button type="button" data-o="' + x + '"' + (pend.vals.indexOf(x) >= 0 ? ' class="on"' : '') + '>' + x + '</button>'; }).join('') + '</div>';
      else if (d[1] === 'text') h += '<input type="text" data-txt placeholder="' + esc(d[2].slice(0, 3).join(', ')) + '" list="ikdl-' + pend.k + '"><datalist id="ikdl-' + pend.k + '">' + d[2].map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist>';
      else h += '<div class="ik-bar" style="margin:0"><select data-key>' + d[2].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select><select data-lv>' + Object.keys(LV).map(function (l) { return '<option value="' + l + '"' + (l === 'strong' ? ' selected' : '') + '>' + LV[l] + '</option>'; }).join('') + '</select></div>';
      v.innerHTML = h + '<div class="ik-bar"><button type="button" class="pri" data-ok>조건 넣기</button><button type="button" data-cancel>취소</button></div>';
      $$('[data-o]', v).forEach(function (b) { b.onclick = function () { var i = pend.vals.indexOf(b.dataset.o); if (i >= 0) pend.vals.splice(i, 1); else pend.vals.push(b.dataset.o); b.classList.toggle('on'); }; });
      $('[data-cancel]', v).onclick = function () { pend = null; draw(); };
      $('[data-ok]', v).onclick = function () {
        if (d[1] === 'opts') { if (!pend.vals.length) return toast('하나 이상 고르세요', true); conds[pend.k] = pend.vals.slice(); }
        else if (d[1] === 'text') { var a = $('[data-txt]', v).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); if (!a.length) return toast('값을 입력하세요', true); conds[pend.k] = a; }
        else { var m = conds[pend.k] || {}; m[$('[data-key]', v).value] = $('[data-lv]', v).value; conds[pend.k] = m; }
        pend = null; draw();
      };
    }
    draw();
  }

  /* ───────── 한 줄씩 목록 편집기 ───────── */
  function listEditor(box, arr, ph) {
    function draw() {
      box.innerHTML = arr.map(function (x, i) { return '<div class="ik-li"><input type="text" value="' + esc(x) + '" data-i="' + i + '" placeholder="' + esc(ph || '') + '"><button type="button" data-x="' + i + '" aria-label="삭제">✕</button></div>'; }).join('') + '<button type="button" data-add>+ 추가</button>';
      $$('input', box).forEach(function (inp) { inp.oninput = function () { arr[+inp.dataset.i] = inp.value; }; });
      $$('[data-x]', box).forEach(function (b) { b.onclick = function () { arr.splice(+b.dataset.x, 1); draw(); }; });
      $('[data-add]', box).onclick = function () { arr.push(''); draw(); var ins = $$('input', box); ins[ins.length - 1].focus(); };
    }
    if (!arr.length) arr.push(''); draw();
  }

  /* ═════ ① 풀이 지식 ═════ */
  // 다른 탭에서 풀이 지식 탭으로 넘어가 바로 무언가를 열 때(풀이 테스트 → 풀이 만들기 등): 목록이 그려진 뒤에 실행한다
  function goKnow(fn) { G.after = fn; window.AdminShowTab('ikknow'); }
  function knowOpen() {
    var box = document.getElementById('t-ikknow'); box.innerHTML = '<p class="muted">불러오는 중…</p>'; PANE = box;
    Promise.all([G.meta ? 0 : loadMeta(), loadItems()]).then(function () { drawList(); if (G.after) { var f = G.after; G.after = null; f(); } }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function covPanel() {
    var cv = G.stats.coverage, h = '<div class="ik-cov">';
    DOM_ORDER.forEach(function (d) {
      var c = cv[d], cls = c.pct >= 80 ? '' : c.pct >= 50 ? 'bad' : 'low';
      h += '<div class="ik-cr" data-cov="' + d + '"><b>' + esc(c.name) + '</b><div class="ik-cb ' + cls + '"><i style="width:' + c.pct + '%"></i></div><span>' + esc(c.label) + ' <small>(' + c.covered + '/' + c.total + '개 항목 · 풀이 ' + c.count + ')</small></span></div>';
      if (G.covOpen === d) h += '<div style="margin:2px 0 8px 106px">' + c.sections.map(function (s) { return '<div style="font-size:.82rem;padding:2px 0;color:' + (s.published ? 'var(--ink2)' : 'var(--ink)') + '">' + (s.published ? '✓ ' : '○ ') + esc(s.title) + ' <small class="muted">' + (s.published ? '공개 ' + s.published : '근거 없음') + (s.pending ? ' · 검수 필요 ' + s.pending : '') + '</small>' + (s.published ? '' : ' <button type="button" data-new="' + d + '|' + s.id + '" style="padding:0 8px;font-size:.74rem">+ 풀이 추가</button>') + '</div>'; }).join('') + '</div>';
    });
    return h + '</div><p class="muted" style="font-size:.76rem;margin:4px 0 0">커버리지 = 켜 둔 풀이 구성 항목 중 “공개 + 검수 완료”된 풀이 지식이 1개 이상 있는 항목의 비율입니다. 80% 이상 충분 · 50% 이상 보강 필요 · 미만 부족. 항목을 늘리거나 끄는 것은 “풀이 구성”에서 합니다.</p>';
  }
  function filtered() {
    var f = G.f, toks = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return G.items.filter(function (x) {
      if (f.domain && x.domain !== f.domain) return false; if (f.status && x.status !== f.status) return false;
      if (f.reviewed && String(!!x.reviewed) !== f.reviewed) return false; if (f.conf && x.confidence !== f.conf) return false;
      if (f.open === 'public' && x.status !== 'published') return false; if (f.open === 'private' && x.status === 'published') return false;
      var hay = (x.text + ' ' + dko(x.domain) + ' ' + x.subDomain + ' ' + shortConds(x, 20) + ' ' + (x.sourceType === 'AI_DRAFT' ? 'AI 초안' : '')).toLowerCase();
      return toks.every(function (t) { return hay.indexOf(t) >= 0; });
    }).sort(function (a, b) { return (b.updatedAt || '') < (a.updatedAt || '') ? -1 : 1; });
  }
  function drawList() {
    var box = document.getElementById('t-ikknow'), f = G.f, st = G.stats; PANE = box;
    box.innerHTML = '<div class="ik-dash"><div class="n"><b>' + st.total + '</b><span>풀이 지식</span></div><div class="n"><b>' + st.reviewed + '</b><span>검수 완료</span></div><div class="n"><b>' + st.needReview + '</b><span>검수 필요</span></div><div class="n"><b>' + st.published + '</b><span>공개 중(서비스에 쓰임)</span></div><div class="n"><b>' + st.aiDraft + '</b><span>AI 초안(검수 전)</span></div></div>' +
      '<details class="card" style="padding:10px 14px"' + (G.covOpen ? ' open' : '') + '><summary><b style="color:var(--gold)">풀이 지식 커버리지</b> <span class="muted" style="font-size:.8rem">— 어떤 분야가 부족한지 한눈에</span></summary>' + covPanel() + '</details>' +
      '<div class="card" style="margin-top:10px"><div class="ik-bar" style="margin-top:0"><input type="text" class="q" id="ikQ" placeholder="검색 — 예: 경금 신약 재물 · 비겁 강함 · 연애" value="' + esc(f.q) + '"><button class="pri" id="ikNew">+ 새 풀이 추가</button><button id="ikAI">AI로 풀이 초안 만들기</button><button id="ikImp" title="기존 해석 모듈을 검수 필요 초안으로 가져옵니다">기존 해석 가져오기</button></div>' +
      '<div class="ik-bar"><button class="ik-chipbtn' + (!f.domain ? ' on' : '') + '" data-d="">전체</button>' + DOM_ORDER.map(function (d) { return '<button class="ik-chipbtn' + (f.domain === d ? ' on' : '') + '" data-d="' + d + '">' + esc(dko(d)) + '</button>'; }).join('') + '</div>' +
      '<div class="ik-bar"><select id="ikFs"><option value="">진행 상태 전체</option>' + Object.keys(STATUS_KO).map(function (s) { return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + STATUS_KO[s] + '</option>'; }).join('') + '</select>' +
      '<select id="ikFo"><option value="">공개 여부 전체</option><option value="public"' + (f.open === 'public' ? ' selected' : '') + '>공개 중</option><option value="private"' + (f.open === 'private' ? ' selected' : '') + '>비공개</option></select>' +
      '<select id="ikFr"><option value="">검수 여부 전체</option><option value="true"' + (f.reviewed === 'true' ? ' selected' : '') + '>검수 완료</option><option value="false"' + (f.reviewed === 'false' ? ' selected' : '') + '>검수 필요</option></select>' +
      '<select id="ikFc"><option value="">신뢰도 전체</option>' + Object.keys(CONF_KO).map(function (s) { return '<option value="' + s + '"' + (f.conf === s ? ' selected' : '') + '>신뢰도 ' + CONF_KO[s] + '</option>'; }).join('') + '</select></div><div id="ikRows"></div></div>';
    if (window.V2Src && window.V2Src.mountBanner) window.V2Src.mountBanner(box, 'ikknow');
    $$('[data-cov]', box).forEach(function (r) { r.onclick = function () { G.covOpen = G.covOpen === r.dataset.cov ? '' : r.dataset.cov; drawList(); }; });
    $$('[data-new]', box).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var p = b.dataset.new.split('|'); startNew(p[0], p[1]); }; });
    $('#ikNew', box).onclick = function () { startNew(G.f.domain || 'MONEY', ''); }; $('#ikAI', box).onclick = aiDraftDialog; $('#ikImp', box).onclick = importLegacy;
    $$('[data-d]', box).forEach(function (b) { b.onclick = function () { G.f.domain = b.dataset.d; drawList(); }; });
    $('#ikQ', box).oninput = function () { G.f.q = this.value; rows(); };
    [['#ikFs', 'status'], ['#ikFo', 'open'], ['#ikFr', 'reviewed'], ['#ikFc', 'conf']].forEach(function (p) { $(p[0], box).onchange = function () { G.f[p[1]] = this.value; rows(); }; }); rows();
    function rows() {
      var l = filtered(), el = $('#ikRows', box);
      el.innerHTML = '<div class="ik-row h"><span>풀이</span><span>분야</span><span>적용 조건</span><span>검수</span><span>공개</span><span>최근 수정</span></div>' + (l.length ? l.slice(0, 300).map(function (x) {
        return '<div class="ik-row" data-id="' + esc(x.id) + '"><span><b>' + esc(x.title || '(제목 없음)') + '</b> ' + (x.sourceType === 'AI_DRAFT' && !x.reviewed ? '<span class="ik-st ik-ai">AI 초안</span>' : '') + '</span><span>' + esc(dko(x.domain)) + '</span><span class="muted">' + esc(shortConds(x)) + '</span><span class="' + (x.reviewed ? 'ik-ok' : 'ik-no') + '">' + (x.reviewed ? '✓ 검수 완료' : '검수 필요') + '</span><span>' + (x.status === 'published' ? tag('published', '공개 중') : tag(x.status === 'approved' ? 'approved' : x.status, x.status === 'approved' ? '비공개' : STATUS_KO[x.status])) + '</span><span class="muted">' + date(x.updatedAt) + '</span></div>'; }).join('') : '<p class="muted" style="padding:16px">조건에 맞는 풀이가 없습니다. “+ 새 풀이 추가”로 시작하세요.</p>') + (l.length > 300 ? '<p class="muted">상위 300개만 표시 — 검색·필터로 좁히세요 (전체 ' + l.length + '개)</p>' : '');
      $$('.ik-row[data-id]', el).forEach(function (r) { r.onclick = function () { openDetail(r.dataset.id); }; });
    }
  }
  function fetchItem(id) { var s = G.items.filter(function (x) { return x.id === id; })[0]; if (!s) return Promise.reject(new Error('없는 풀이입니다')); return api('/api/ik?a=get&domain=' + s.domain + '&id=' + encodeURIComponent(id)).then(function (d) { return d.item; }); }
  function openDetail(id) { var host = document.getElementById('t-ikknow'); PANE = host; (G.items ? Promise.resolve() : loadItems()).then(function () { return fetchItem(id); }).then(function (it) { detailView(host, it); host.scrollIntoView(); }).catch(function (e) { toast(e.message, true); }); }
  function nextId(domain) { var re = new RegExp('^' + domain + '-(\\d+)$'), mx = 0; G.items.forEach(function (x) { var m = re.exec(x.id); if (m) mx = Math.max(mx, +m[1]); }); return domain + '-' + ('0000' + (mx + 1)).slice(-4); }
  function blank(domain, sub, conds) {
    return { id: nextId(domain), title: '', domain: domain, subDomain: sub || '', status: 'draft', priority: 10, stance: 'neutral', conditions: conds ? clone(conds) : {}, alsoWhen: [], modifiers: [], exclusions: {}, principle: '', interpretation: '', strengths: [], risks: [], behaviorPatterns: [], actions: [], realWorldExamples: { worker: '', business: '', freelance: '', love: '' }, sourceType: 'internal', sourceReference: '', sourceMemo: '', confidence: 'mid', reviewed: false, reviewedAt: '', tags: [], version: 0 };
  }
  function startNew(domain, sub, conds) { var host = document.getElementById('t-ikknow'); PANE = host; (G.meta ? Promise.resolve() : loadMeta()).then(function () { return G.items ? 0 : loadItems(); }).then(function () { wizard(host, blank(domain, sub, conds), true); }); }

  /* ───────── 근거 자료(원문 추적) ───────── */
  var evLoc = function (e) { return (e.pageStart ? (e.pageEnd && e.pageEnd !== e.pageStart ? e.pageStart + '~' + e.pageEnd + '쪽' : e.pageStart + '쪽') : '') + (e.heading ? (e.pageStart ? ' · ' : '') + e.heading : ''); };
  function evList(a) { return (a || []).map(function (e) { return '<div class="ik-k" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span><b>' + esc(e.title || '자료') + '</b> <span class="muted">' + esc(evLoc(e)) + '</span>' + (e.quote ? '<div class="why">“' + esc(e.quote.slice(0, 90)) + (e.quote.length > 90 ? '…' : '') + '”</div>' : '') + '</span><button type="button" data-ev="' + esc(e.docId) + '|' + esc(e.chunkId) + '|' + esc((e.quote || '').slice(0, 60)) + '">원문 보기</button></div>'; }).join(''); }
  function bindEv(root) { [].slice.call(root.querySelectorAll('[data-ev]')).forEach(function (b) { b.onclick = function () { var p = b.dataset.ev.split('|'); if (window.V2Src) window.V2Src.viewChunk(p[0], p[1], p[2]); else toast('풀이 자료 화면이 불러와지지 않았습니다', true); }; }); }

  /* ───────── 상세(읽기) 화면 ───────── */
  function detailView(host, it) {
    var ul = function (a) { return a && a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="muted">없음</p>'; }, ex = it.realWorldExamples || {}, exs = [['직장인', ex.worker], ['사업자', ex.business], ['프리랜서', ex.freelance], ['연애/관계', ex.love]].filter(function (x) { return x[1]; });
    var secTitle = it.subDomain; try { var dz = (G.design[it.domain] && G.design[it.domain].sections && G.design[it.domain].sections.length ? G.design[it.domain] : G.meta.defaultDesign[it.domain]); secTitle = (dz.sections.filter(function (s) { return s.id === it.subDomain; })[0] || {}).title || it.subDomain; } catch (e) { }
    host.innerHTML = '<div class="ik-bar"><button id="dBack">← 목록</button><span style="flex:1"></span>' + (it.sourceType === 'AI_DRAFT' && !it.reviewed ? '<span class="ik-st ik-ai">AI 초안 — 검수 전</span>' : '') + (it.status === 'published' ? tag('published', '공개 중') : tag('approved', '비공개')) + '</div><div class="card ik-det"><h2>' + esc(it.title) + '</h2><p class="muted" style="margin:0">' + esc(dko(it.domain)) + (secTitle ? ' · ' + esc(secTitle) : '') + ' · 신뢰도 ' + CONF_KO[it.confidence] + ' · ' + (it.reviewed ? '검수 완료 ' + date(it.reviewedAt) : '검수 필요') + '</p>' +
      '<h4>적용되는 경우</h4><p class="nl">' + esc(sentence(it.conditions)) + '</p>' + (it.alsoWhen || []).map(function (g) { return '<p class="nl" style="margin-top:-6px">또는 ' + esc(sentence(g)) + '</p>'; }).join('') +
      '<h4>핵심 풀이</h4><blockquote>' + esc(it.interpretation || '(아직 작성 전)') + '</blockquote>' + '<h4>현실에서는</h4>' + ul(it.behaviorPatterns) + (exs.length ? exs.map(function (x) { return '<p><b>' + x[0] + '</b> ' + esc(x[1]) + '</p>'; }).join('') : '') +
      '<div class="ik-g2"><div><h4>장점</h4>' + ul(it.strengths) + '</div><div><h4>주의할 점</h4>' + ul(it.risks) + '</div></div>' + (it.actions.length ? '<h4>해볼 것</h4>' + ul(it.actions) : '') +
      '<h4>이 풀이가 달라지는 경우</h4>' + (it.modifiers.length ? '<ul>' + it.modifiers.map(function (m) { return '<li><b>' + esc(sentence(m.when)) + '</b> → ' + EFFECT[m.effect] + (m.text ? ': ' + esc(m.text) : '') + '</li>'; }).join('') + '</ul>' : '<p class="muted">없음</p>') +
      '<h4>적용하지 않는 경우</h4>' + (isEmpty(it.exclusions) ? '<p class="muted">없음</p>' : '<p>' + esc(sentence(it.exclusions)) + '</p>') + (it.principle ? '<details style="margin-top:12px"><summary class="muted">명리학적 근거 펼쳐보기</summary><p>' + esc(it.principle) + '</p></details>' : '') + (it.evidence && it.evidence.length ? '<h4>근거 자료 ' + it.evidence.length + '개</h4>' + evList(it.evidence) : '') + (it.sourceReference ? '<p class="muted" style="font-size:.78rem;margin-top:10px">출처: ' + esc(it.sourceReference) + (it.sourceMemo ? ' · ' + esc(it.sourceMemo) : '') + '</p>' : '') + '</div>' +
      '<div class="ik-foot"><button id="dTest">테스트</button><button id="dEdit" class="pri">수정</button><button id="dDup">복제</button><button id="dPub">' + (it.status === 'published' ? '비공개로 전환' : '게시') + '</button><button id="dHist">변경 이력</button></div>';
    bindEv(host); $('#dBack', host).onclick = knowOpen; $('#dEdit', host).onclick = function () { wizard(host, clone(it), false); };
    $('#dTest', host).onclick = function () { G.focus = { item: clone(it) }; window.AdminShowTab('iklab'); };
    $('#dDup', host).onclick = function () { var c = clone(it); c.id = nextId(c.domain); c.title += ' (복사)'; c.status = 'draft'; c.reviewed = false; c.reviewedAt = ''; c.version = 0; if (c.sourceType === 'AI_DRAFT') c.sourceType = 'internal'; wizard(host, c, true); toast('복제했습니다 — 저장하면 새 풀이가 됩니다'); };
    $('#dPub', host).onclick = function () {
      var want = it.status === 'published' ? (it.reviewed ? 'approved' : 'draft') : 'published';
      if (want === 'published' && !it.reviewed) return toast('게시하려면 먼저 수정 화면에서 “검수 완료”를 체크하세요(검수 전 풀이는 서비스에 쓰이지 않습니다)', true);
      post('status', { id: it.id, status: want, reviewed: it.reviewed }).then(function (d) { toast(want === 'published' ? '공개했습니다 — 이제 서비스 풀이에 쓰입니다' : '비공개로 전환했습니다 — 서비스에서 제외됩니다'); return loadItems().then(function () { detailView(host, d.item); }); }).catch(function (e) { toast(e.message, true); });
    };
    $('#dHist', host).onclick = function () { histDialog(it, function (old) { wizard(host, old, false); }); };
  }
  function histDialog(it, pick) {
    api('/api/ik?a=hist&id=' + encodeURIComponent(it.id)).then(function (d) {
      var h = d.history, dlg = document.createElement('dialog'); dlg.className = 'ik-dlg'; dlg.innerHTML = '<h3>변경 이력</h3>' + (h.length ? h.map(function (x, i) { return '<div class="ik-k"><b>' + date(x.at) + '</b> · 이전 버전' + (x.deleted ? ' · 삭제됨' : '') + '<div class="why">' + esc(x.item.title) + ' — ' + esc((x.item.interpretation || '').slice(0, 80)) + '</div><button type="button" data-r="' + i + '" style="margin-top:4px">이 내용으로 되돌려 수정</button></div>'; }).join('') : '<p class="muted">이전 버전이 없습니다.</p>') + '<div class="ik-bar"><button data-close>닫기</button></div>';
      document.body.appendChild(dlg); dlg.showModal(); dlg.onclose = function () { dlg.remove(); }; $('[data-close]', dlg).onclick = function () { (dlg.close(), dlg.remove()); };
      $$('[data-r]', dlg).forEach(function (b) { b.onclick = function () { var old = clone(h[+b.dataset.r].item); old.version = it.version; (dlg.close(), dlg.remove()); pick(old); toast('이전 내용을 불러왔습니다 — 저장하면 새 버전이 됩니다'); }; });
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ───────── 새 풀이 / 수정 마법사 (4단계) ───────── */
  var STEPS = ['① 무엇에 대한 풀이인가', '② 언제 사용하나', '③ 어떤 내용인가', '④ 달라지는 경우 · 검수'];
  function sectionList(domain) { var dz = (G.design[domain] && G.design[domain].sections && G.design[domain].sections.length) ? G.design[domain] : G.meta.defaultDesign[domain]; return dz.sections; }
  function wizard(host, it, isNew, done) {
    var base = blank(it.domain || 'MONEY', ''); Object.keys(base).forEach(function (k) { if (it[k] === undefined || it[k] === null) it[k] = base[k]; }); it.realWorldExamples = Object.assign({}, base.realWorldExamples, it.realWorldExamples); // 다른 화면(풀이 자료 검수 등)에서 온 초안에 빠진 칸을 채운다
    var step = 0, seen = {}, inModal = !!done;
    function draw() {
      host.innerHTML = (inModal ? '' : '<div class="ik-bar"><button id="wBack">← ' + (isNew ? '목록' : '상세') + '</button><b style="color:var(--gold)">' + (isNew ? '새 풀이 추가' : '풀이 수정') + '</b>' + (it.sourceType === 'AI_DRAFT' && !it.reviewed ? ' <span class="ik-st ik-ai">AI 초안 — 검수 전</span>' : '') + '</div>') +
        '<div class="ik-steps">' + STEPS.map(function (s, i) { return '<button type="button" data-s="' + i + '" class="' + (i === step ? 'on' : seen[i] ? 'done' : '') + '">' + s + '</button>'; }).join('') + '</div><div class="card" id="wBody"></div>' +
        '<div class="ik-foot">' + (step > 0 ? '<button id="wPrev">← 이전</button>' : '') + (step < 3 ? '<button id="wNext" class="pri">다음 →</button>' : '') + '<span style="flex:1"></span><button id="wDraft">임시저장</button>' + (inModal ? '' : '<button id="wTest">풀이 테스트</button>') + (step === 3 ? '<button id="wPub" class="pri">저장하고 공개</button>' : '') + '<span class="muted" id="wMsg"></span></div>';
      seen[step] = 1; body(); $$('[data-s]', host).forEach(function (b) { b.onclick = function () { step = +b.dataset.s; draw(); }; });
      var bk = $('#wBack', host); if (bk) bk.onclick = function () { if (isNew) knowOpen(); else detailView(host, it); };
      var pv = $('#wPrev', host); if (pv) pv.onclick = function () { step--; draw(); }; var nx = $('#wNext', host); if (nx) nx.onclick = function () { step++; draw(); };
      $('#wDraft', host).onclick = function () { save(false); }; var pb = $('#wPub', host); if (pb) pb.onclick = function () { save(true); };
      var tb = $('#wTest', host); if (tb) tb.onclick = function () { clean(); G.focus = { item: clone(it) }; window.AdminShowTab('iklab'); };
    }
    function body() {
      var b = $('#wBody', host);
      if (step === 0) {
        b.innerHTML = '<div class="ik-sec" style="margin-top:0">이 풀이는 무엇에 대한 것인가요?</div><div class="ik-dc">' + DOM_ORDER.map(function (d) { return '<button type="button" data-d="' + d + '" class="' + (it.domain === d ? 'on' : '') + '">' + esc(dko(d)) + '</button>'; }).join('') + '</div>' +
          '<label class="ik-f">세부 항목 <small class="muted">(풀이 구성의 항목 — 이 풀이가 최종 풀이의 어느 칸에 들어가는지)</small><select id="wSub"></select></label>' +
          '<label class="ik-f">풀이 이름 <small class="muted">(관리자가 알아보기 위한 이름)</small><input type="text" id="wTitle" value="' + esc(it.title) + '" placeholder="예: 경금 신약인데 관성이 강한 직장 스트레스"></label>' +
          '<label class="ik-f">이 풀이의 성격<select id="wStance">' + Object.keys(STANCE).map(function (k) { return '<option value="' + k + '"' + (it.stance === k ? ' selected' : '') + '>' + STANCE[k] + '</option>'; }).join('') + '</select><small class="muted">유리한 쪽과 조심할 쪽 풀이가 함께 나오면 충돌로 표시되고, 더 구체적인 조건의 풀이가 우선됩니다.</small></label>';
        subs(); $$('[data-d]', b).forEach(function (x) { x.onclick = function () { it.domain = x.dataset.d; it.subDomain = ''; body(); }; });
        $('#wSub', b).onchange = function () { it.subDomain = this.value; }; $('#wTitle', b).oninput = function () { it.title = this.value; }; $('#wStance', b).onchange = function () { it.stance = this.value; };
      } else if (step === 1) {
        b.innerHTML = '<div class="ik-sec" style="margin-top:0">언제 이 풀이를 사용할까요?<small>고른 조건이 모두 맞는 사주에만 쓰입니다. 조건이 구체적일수록 일반 풀이보다 먼저 쓰입니다. 엔진이 실제로 계산하는 값만 고를 수 있습니다.</small></div><div id="wCond"></div>' +
          '<div class="ik-sec">또는 이런 경우에도 쓴다<small>위 조건 대신, 아래 조건이 맞아도 이 풀이를 씁니다(각각 따로 계산).</small></div><div id="wAlso"></div><button type="button" id="wAlsoAdd">+ 다른 경우 추가</button>' +
          '<div class="ik-sec">이 풀이를 적용하지 않는 경우<small>아래 조건에 해당하면, 위 조건이 맞아도 이 풀이를 쓰지 않습니다.</small></div><div id="wExcl"></div>';
        condEditor($('#wCond', b), it.conditions); condEditor($('#wExcl', b), it.exclusions, { exclude: true });
        (function alsoDraw() { var w = $('#wAlso', b); w.innerHTML = it.alsoWhen.map(function (g, i) { return '<div class="ik-mod"><div class="ik-bar" style="margin-top:0"><b>또는</b><span style="flex:1"></span><button type="button" data-del="' + i + '">삭제</button></div><div data-g="' + i + '"></div></div>'; }).join('') || '<p class="muted" style="font-size:.82rem">없음</p>'; $$('[data-g]', w).forEach(function (el) { condEditor(el, it.alsoWhen[+el.dataset.g]); }); $$('[data-del]', w).forEach(function (x) { x.onclick = function () { it.alsoWhen.splice(+x.dataset.del, 1); alsoDraw(); }; }); })();
        $('#wAlsoAdd', b).onclick = function () { it.alsoWhen.push({}); body(); };
      } else if (step === 2) {
        var ex = it.realWorldExamples;
        b.innerHTML = '<div class="ik-sec" style="margin-top:0">핵심 풀이<small>이 조건은 어떤 의미인가요? 사용자에게 보여 줄 쉬운 말로 2~3문장.</small></div><textarea id="wInt" rows="4">' + esc(it.interpretation) + '</textarea>' +
          '<div class="ik-sec">현실에서는?<small>직장·사업·돈·연애·관계·생활에서 어떻게 나타날 수 있나요?</small></div><div id="wBeh"></div>' +
          '<div class="ik-g2"><div><div class="ik-sec">장점</div><div id="wStr"></div></div><div><div class="ik-sec">주의할 점</div><div id="wRisk"></div></div></div>' +
          '<div class="ik-sec">해볼 것(행동 조언)</div><div id="wAct"></div>' +
          '<details style="margin-top:14px"' + (ex.worker || ex.business || ex.freelance || ex.love ? ' open' : '') + '><summary class="ik-sec" style="display:inline-block;margin:0">현실 사례 추가</summary><div class="ik-g2"><label class="ik-f">직장인<textarea id="exW" rows="2">' + esc(ex.worker) + '</textarea></label><label class="ik-f">사업자<textarea id="exB" rows="2">' + esc(ex.business) + '</textarea></label><label class="ik-f">프리랜서<textarea id="exF" rows="2">' + esc(ex.freelance) + '</textarea></label><label class="ik-f">연애/관계<textarea id="exL" rows="2">' + esc(ex.love) + '</textarea></label></div></details>' +
          '<details style="margin-top:12px"' + (it.principle ? ' open' : '') + '><summary class="muted">명리학적 근거 펼쳐보기 <small>(전문가용 — 사용자에게 그대로 보이지 않고 근거로 쓰입니다)</small></summary><textarea id="wPrin" rows="3">' + esc(it.principle) + '</textarea></details>';
        $('#wInt', b).oninput = function () { it.interpretation = this.value; }; $('#wPrin', b).oninput = function () { it.principle = this.value; };
        [['#exW', 'worker'], ['#exB', 'business'], ['#exF', 'freelance'], ['#exL', 'love']].forEach(function (p) { $(p[0], b).oninput = function () { it.realWorldExamples[p[1]] = this.value; }; });
        listEditor($('#wBeh', b), it.behaviorPatterns, '예: 벌이가 늘어도 지출이 같이 늘어나는 장면이 반복될 수 있습니다.'); listEditor($('#wStr', b), it.strengths, '장점 한 가지'); listEditor($('#wRisk', b), it.risks, '주의할 점 한 가지'); listEditor($('#wAct', b), it.actions, '해볼 것 한 가지');
      } else {
        b.innerHTML = '<div class="ik-sec" style="margin-top:0">이 풀이가 달라지는 경우<small>기본 조건에 “이런 조건이 더해지면” 해석이 더 강해지거나 약해지거나 바뀝니다. 맞는 것만 적용됩니다.</small></div><div class="ik-nl"><b>기본</b> ' + esc(sentence(it.conditions)) + '</div><div id="wMods"></div><button type="button" id="wModAdd">+ 다른 조건 추가</button>' +
          '<div class="ik-sec">출처와 검수</div><div class="ik-g2"><label class="ik-f">출처 유형<select id="wSrc">' + [['expert', '전문가'], ['book', '서적'], ['internal', '내부 정리'], ['research', '연구'], ['AI_DRAFT', 'AI 초안(검수 전에는 서비스에 쓰이지 않음)']].map(function (o) { return '<option value="' + o[0] + '"' + (it.sourceType === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label><label class="ik-f">출처 이름<input type="text" id="wRef" value="' + esc(it.sourceReference) + '"></label>' +
          '<label class="ik-f">신뢰도<select id="wConf">' + Object.keys(CONF_KO).map(function (k) { return '<option value="' + k + '"' + (it.confidence === k ? ' selected' : '') + '>' + CONF_KO[k] + '</option>'; }).join('') + '</select></label><label class="ik-f">우선순위 <small class="muted">(같은 조건이면 숫자가 큰 쪽 먼저, 0~100)</small><input type="number" id="wPri" min="0" max="100" value="' + it.priority + '"></label></div>' +
          '<label class="ik-f">메모<textarea id="wMemo" rows="2">' + esc(it.sourceMemo) + '</textarea></label><label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" id="wRev" style="width:auto"' + (it.reviewed ? ' checked' : '') + '> <b>검수 완료</b> <span class="muted">' + (it.reviewedAt ? '(' + date(it.reviewedAt) + ')' : '') + ' — 검수 완료된 풀이만 서비스에 쓰일 수 있습니다</span></label>' +
          '<label class="ik-f">태그(쉼표)<input type="text" id="wTags" value="' + esc((it.tags || []).join(', ')) + '"></label>';
        mods(); $('#wModAdd', b).onclick = function () { it.modifiers.push({ id: 'm' + (it.modifiers.length + 1), when: {}, effect: 'strengthen', text: '' }); mods(); };
        $('#wSrc', b).onchange = function () { it.sourceType = this.value; }; $('#wRef', b).oninput = function () { it.sourceReference = this.value; }; $('#wConf', b).onchange = function () { it.confidence = this.value; }; $('#wPri', b).oninput = function () { it.priority = +this.value || 0; }; $('#wMemo', b).oninput = function () { it.sourceMemo = this.value; }; $('#wRev', b).onchange = function () { it.reviewed = this.checked; }; $('#wTags', b).oninput = function () { it.tags = this.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
      }
    }
    function subs() { var s = $('#wSub', host), l = sectionList(it.domain); s.innerHTML = '<option value="">(선택)</option>' + l.map(function (x) { return '<option value="' + x.id + '">' + esc(x.title) + '</option>'; }).join(''); if (it.subDomain && !l.some(function (x) { return x.id === it.subDomain; })) s.insertAdjacentHTML('beforeend', '<option value="' + esc(it.subDomain) + '">' + esc(it.subDomain) + '</option>'); s.value = it.subDomain; }
    function mods() {
      var w = $('#wMods', host); w.innerHTML = it.modifiers.map(function (m, i) { return '<div class="ik-mod"><div class="ik-bar" style="margin-top:0"><b style="color:var(--gold)">이런 조건이 추가되면?</b><span style="flex:1"></span><button type="button" data-del="' + i + '">삭제</button></div><div data-c="' + i + '"></div><div class="muted" style="font-size:.78rem">결과</div><div class="ik-radio">' + Object.keys(EFFECT).map(function (k) { return '<label><input type="radio" name="eff' + i + '" value="' + k + '"' + (m.effect === k ? ' checked' : '') + '>' + EFFECT[k] + '</label>'; }).join('') + '</div><label class="ik-f">설명<textarea data-t="' + i + '" rows="2" placeholder="이 경우 풀이가 어떻게 달라지는지">' + esc(m.text) + '</textarea></label></div>'; }).join('') || '<p class="muted" style="font-size:.82rem">없음</p>';
      $$('[data-c]', w).forEach(function (el) { condEditor(el, it.modifiers[+el.dataset.c].when); });
      $$('[data-t]', w).forEach(function (t) { t.oninput = function () { it.modifiers[+t.dataset.t].text = t.value; }; });
      $$('input[type=radio]', w).forEach(function (r) { r.onchange = function () { it.modifiers[+r.name.slice(3)].effect = r.value; }; });
      $$('[data-del]', w).forEach(function (x) { x.onclick = function () { it.modifiers.splice(+x.dataset.del, 1); mods(); }; });
    }
    function clean() {
      ['behaviorPatterns', 'strengths', 'risks', 'actions'].forEach(function (k) { it[k] = it[k].map(function (x) { return String(x).trim(); }).filter(Boolean); });
      it.alsoWhen = it.alsoWhen.filter(function (g) { return !isEmpty(g); }); it.modifiers = it.modifiers.filter(function (m) { return !isEmpty(m.when); });
    }
    function save(pub) {
      clean(); if (!it.title.trim()) { step = 0; draw(); return toast('풀이 이름을 입력하세요', true); }
      if (pub) { if (!it.reviewed) { step = 3; draw(); return toast('공개하려면 “검수 완료”를 체크하세요 — 검수 전 풀이는 서비스에 쓰이지 않습니다', true); } it.status = 'published'; }
      else if (it.status === 'published') it.status = it.reviewed ? 'approved' : 'draft'; // 임시저장은 공개 상태를 내린다(수정 중인 내용이 서비스에 나가지 않도록)
      var m = $('#wMsg', host); if (m) m.textContent = '저장 중…';
      post('save', { item: it, isNew: isNew, expectVersion: it.version }).then(function (d) {
        if (pub && d.item.status !== 'published') toast('저장은 했지만 공개되지 않았습니다 — 문장 안의 {…} 자리표시자 중 채울 수 없는 것이 있습니다. 지우거나 풀어 쓴 뒤 다시 공개하세요', true); else toast('저장했습니다 · ' + (d.item.status === 'published' ? '공개 중' : d.item.status === 'approved' ? '비공개(검수 완료)' : STATUS_KO[d.item.status])); G.meta.meta = d.meta;
        return loadItems().then(function () { if (done) done(d.item); else detailView(host, d.item); });
      }).catch(function (e) { if (m) m.textContent = ''; toast(e.message, true); });
    }
    draw();
  }

  /* ───────── AI 초안 · 기존 해석 가져오기 ───────── */
  function aiDraftDialog() {
    var dlg = document.createElement('dialog'); dlg.className = 'ik-dlg';
    dlg.innerHTML = '<h3>AI로 풀이 초안 만들기</h3><p class="muted" style="font-size:.84rem">명리 자료를 붙여 넣으면 AI가 분야·적용 조건·핵심 풀이·장점·주의점·달라지는 경우를 정리해 <b>“AI 초안”</b>으로 저장합니다. 자료에 없는 내용은 만들지 않게 지시하지만, 반드시 직접 검수하세요. 검수 완료 전에는 서비스에 쓰이지 않고 자동 공개되지 않습니다.</p><textarea id="aiT" rows="10" placeholder="여기에 전문 자료를 붙여 넣으세요"></textarea><div class="ik-bar"><button class="pri" id="aiGo">초안 만들기</button><button id="aiX">닫기</button><span class="muted" id="aiM"></span></div>';
    document.body.appendChild(dlg); dlg.showModal(); dlg.onclose = function () { dlg.remove(); }; $('#aiX', dlg).onclick = function () { (dlg.close(), dlg.remove()); };
    $('#aiGo', dlg).onclick = function () {
      var t = $('#aiT', dlg).value; if (t.trim().length < 30) return toast('자료를 30자 이상 붙여 넣어 주세요', true); $('#aiGo', dlg).disabled = true; $('#aiM', dlg).textContent = 'AI가 정리하는 중… (10~30초)';
      post('draft', { text: t }).then(function (d) { (dlg.close(), dlg.remove()); toast('AI 초안을 만들었습니다 — 내용을 검수하세요'); PANE = document.getElementById('t-ikknow'); return loadItems().then(function () { detailView(document.getElementById('t-ikknow'), d.item); }); }).catch(function (e) { $('#aiGo', dlg).disabled = false; $('#aiM', dlg).textContent = ''; toast(e.message, true); });
    };
  }
  function importLegacy() {
    if (!confirm('기존 해석 모듈(리포트에 쓰이던 문장들)을 “검수 필요” 초안으로 가져옵니다.\n· 공개되지 않고 서비스에도 쓰이지 않습니다\n· 이미 가져온 것은 건너뜁니다\n· 가져온 뒤 조건·장점·주의점을 보강하고 검수 완료해야 공개할 수 있습니다\n계속할까요?')) return;
    C.load().then(function () { var mods = R.Compose.library({ modules: (C.ST.saved || {}).modules, remedies: (C.ST.saved || {}).remedies }).modules; return post('import', { modules: mods }); })
      .then(function (d) { toast('가져왔습니다 — ' + d.imported + '개 (건너뜀 ' + d.skipped + ', 가져오지 않음 ' + d.unsupported + ')'); knowOpen(); }).catch(function (e) { toast(e.message, true); });
  }

  /* ═════ ② 풀이 구성 ═════ */
  var ANALYSIS = ['일간 강약', '통근', '조후', '십성', '재성', '식상', '비겁', '관성', '인성', '신살', '합충', '용신', '대운', '세운', '월운'];
  function designOpen() {
    var box = document.getElementById('t-ikdesign'); box.innerHTML = '<p class="muted">불러오는 중…</p>'; PANE = box;
    Promise.all([G.meta ? 0 : loadMeta(), loadItems()]).then(drawDesign).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function curDesign(d) { if (!G.design[d] || !G.design[d].sections || !G.design[d].sections.length) G.design[d] = clone(G.meta.defaultDesign[d]); return G.design[d]; }
  function drawDesign() {
    var box = document.getElementById('t-ikdesign'), d = G.dDomain, dz = curDesign(d), drag = null, cov = G.stats.coverage[d]; PANE = box;
    var count = function (sid) { return G.items.filter(function (x) { return x.domain === d && x.subDomain === sid && x.status === 'published' && x.reviewed; }).length; };
    box.innerHTML = '<div class="card"><p class="muted" style="margin:0 0 10px">분야별로 “이 풀이에서 무엇을 분석해 보여 줄지”를 정합니다. 풀이의 풍부함은 글자 수가 아니라 <b>답하는 항목의 수</b>로 정해지고, 근거가 되는 풀이 지식이 없는 항목은 억지로 채우지 않고 비워 둡니다.</p>' +
      '<div class="ik-bar">' + DOM_ORDER.map(function (x) { return '<button class="ik-chipbtn' + (x === d ? ' on' : '') + '" data-d="' + x + '">' + esc(dko(x)) + '</button>'; }).join('') + '</div>' +
      '<p style="margin:6px 0"><b style="color:var(--gold)">' + esc(dko(d)) + ' 풀이 커버리지 ' + cov.pct + '%</b> <span class="muted">(' + esc(cov.label) + ' · 켜 둔 ' + cov.total + '개 항목 중 ' + cov.covered + '개에 공개된 풀이 지식이 있음)</span></p>' +
      '<div class="ik-sec">풀이 항목<small>끌어서 순서를 바꾸고, 켜기/끄기·필수/선택을 정합니다. 숫자가 0인 항목은 풀이에서 비워집니다.</small></div><div id="dzList"></div><div class="ik-bar"><button id="dzAdd">+ 분석 항목 추가</button><span style="flex:1"></span><button id="dzReset">기본값으로 되돌리기</button><button class="pri" id="dzSave">구성 저장</button></div>' +
      '<details style="margin-top:14px"><summary class="muted">분석에 쓰는 명리 요소(안내용)</summary><div class="ik-opts" style="margin-top:8px">' + ANALYSIS.map(function (a) { var cur = dz.required.indexOf(a) >= 0 ? 'r' : dz.optional.indexOf(a) >= 0 ? 'o' : ''; return '<label style="font-size:.84rem">' + a + ' <select data-an="' + a + '" style="width:auto"><option value="">안 봄</option><option value="r"' + (cur === 'r' ? ' selected' : '') + '>필수</option><option value="o"' + (cur === 'o' ? ' selected' : '') + '>선택</option></select></label>'; }).join(' ') + '</div></details></div>';
    $$('[data-d]', box).forEach(function (b) { b.onclick = function () { G.dDomain = b.dataset.d; drawDesign(); }; });
    $$('[data-an]', box).forEach(function (s) { s.onchange = function () { dz.required = dz.required.filter(function (x) { return x !== s.dataset.an; }); dz.optional = dz.optional.filter(function (x) { return x !== s.dataset.an; }); if (s.value === 'r') dz.required.push(s.dataset.an); if (s.value === 'o') dz.optional.push(s.dataset.an); }; });
    function list() {
      $('#dzList', box).innerHTML = dz.sections.map(function (s, i) { var n = count(s.id), pend = G.items.filter(function (x) { return x.domain === d && x.subDomain === s.id && x.status !== 'archived' && !(x.status === 'published' && x.reviewed); }).length; return '<div class="ik-dz' + (s.enabled === false ? ' off' : '') + '" draggable="true" data-i="' + i + '"><span class="gr">⠿</span><span class="muted">' + (i + 1) + '</span><span><input type="text" data-t value="' + esc(s.title) + '" style="width:100%"></span><span style="font-size:.78rem">공개 <b style="color:' + (n ? 'var(--green)' : 'var(--red)') + '">' + n + '</b>' + (pend ? ' · 검수 필요 ' + pend : '') + (n ? '' : ' <button type="button" data-new="' + s.id + '" style="padding:0 8px;font-size:.74rem">+ 풀이</button>') + '</span>' +
        '<label class="chk2"><input type="checkbox" data-en' + (s.enabled !== false ? ' checked' : '') + ' style="width:auto"> 사용</label><label class="chk2"><input type="checkbox" data-rq' + (s.required !== false ? ' checked' : '') + ' style="width:auto"> 필수</label><button type="button" data-x>삭제</button></div>'; }).join('');
      $$('.ik-dz', box).forEach(function (el) { var s = dz.sections[+el.dataset.i];
        $('[data-t]', el).oninput = function () { s.title = this.value; }; $('[data-en]', el).onchange = function () { s.enabled = this.checked; el.classList.toggle('off', !this.checked); }; $('[data-rq]', el).onchange = function () { s.required = this.checked; }; $('[data-x]', el).onclick = function () { dz.sections.splice(+el.dataset.i, 1); list(); };
        var nw = $('[data-new]', el); if (nw) nw.onclick = function () { goKnow(function () { startNew(d, nw.dataset.new); }); };
        el.ondragstart = function (e) { drag = +el.dataset.i; e.dataTransfer.effectAllowed = 'move'; }; el.ondragover = function (e) { e.preventDefault(); el.classList.add('over'); }; el.ondragleave = function () { el.classList.remove('over'); };
        el.ondrop = function (e) { e.preventDefault(); var to = +el.dataset.i; if (drag == null || drag === to) return; var m = dz.sections.splice(drag, 1)[0]; dz.sections.splice(to, 0, m); drag = null; list(); };
      });
    }
    list();
    $('#dzAdd', box).onclick = function () { var t = prompt('새 분석 항목의 이름 (예: 부수입, 사업 확장 시기)'); if (!t) return; var id = 'x' + Date.now().toString(36); dz.sections.push({ id: id, title: t, enabled: true, required: false }); list(); toast('항목을 추가했습니다 — 저장한 뒤 풀이 지식의 “세부 항목”에서 이 항목을 고르면 연결됩니다'); };
    if (window.V2Src && window.V2Src.mountBanner) window.V2Src.mountBanner(box, 'ikdesign');
    $('#dzReset', box).onclick = function () { if (!confirm(dko(d) + ' 구성을 기본값으로 되돌릴까요? (저장 전까지는 화면에서만 바뀝니다)')) return; G.design[d] = clone(G.meta.defaultDesign[d]); drawDesign(); };
    $('#dzSave', box).onclick = function () { post('design', { design: G.design }).then(function (r) { G.design = clone(r.design); G.meta.meta = r.meta; toast('풀이 구성을 저장했습니다'); return loadItems().then(drawDesign); }).catch(function (e) { toast(e.message, true); }); };
  }

  /* ═════ ③ AI 작성 설정 ═════ */
  function rulesOpen() { var box = document.getElementById('t-ikrules'); box.innerHTML = '<p class="muted">불러오는 중…</p>'; PANE = box; (G.meta ? Promise.resolve() : loadMeta()).then(drawRules).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }); }
  function drawRules() {
    var box = document.getElementById('t-ikrules'), r = clone(G.meta.rules), cap = { brief: '항목 7개 이내 · 항목당 풀이 1개', standard: '항목 12개 이내 · 항목당 풀이 2개', detailed: '항목 18개 이내 · 항목당 풀이 4개', max: '근거가 있는 모든 항목 · 항목당 풀이 6개' }; PANE = box;
    var radio = function (name, opts, cur) { return '<div class="ik-radio">' + opts.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' checked' : '') + '>' + o[1] + '</label>'; }).join('') + '</div>'; };
    box.innerHTML = '<div class="card"><p class="muted" style="margin:0">AI는 이미 계산·검색·판정된 풀이를 “쉽고 풍부한 말로 옮겨 쓰는” 역할만 합니다. 여기서 문체와 깊이를 조절하세요. AI 키가 없어도 같은 설정으로 규칙 기반 문장이 만들어집니다.</p>' +
      '<div class="ik-sec">풀이 스타일</div>' + radio('tone', [['easy', '쉬운 말(현실형)'], ['story', '이야기하듯'], ['pro', '전문적인 말']], r.tone) +
      '<div class="ik-sec">풀이 깊이<small>글자 수가 아니라 “몇 개 항목을, 항목마다 풀이 몇 개로” 쓰는지가 달라집니다.</small></div><div class="ik-radio">' + ['brief', 'standard', 'detailed', 'max'].map(function (k) { return '<label><input type="radio" name="depth" value="' + k + '"' + (r.depth === k ? ' checked' : '') + '><b>' + ({ brief: '간단', standard: '기본', detailed: '상세', max: '매우 상세' })[k] + '</b> <small class="muted">' + cap[k] + '</small></label>'; }).join('') + '</div>' +
      '<div class="ik-sec">현실 사례</div>' + radio('ex', [[0, '쓰지 않음'], [1, '1개'], [2, '2개'], [3, '3개']], r.examples) + '<div class="ik-sec">전문용어</div>' + radio('jargon', [['min', '적게(쉬운 말로 풀어서)'], ['normal', '보통'], ['rich', '상세하게']], r.jargon) +
      '<div class="ik-sec">그 밖의 설정</div><label class="ik-radio"><span><input type="checkbox" id="rBal" style="width:auto"' + (r.balance ? ' checked' : '') + '> 장점과 주의점을 균형 있게</span></label><label class="ik-radio"><span><input type="checkbox" id="rAct" style="width:auto"' + (r.actions ? ' checked' : '') + '> 행동 조언 사용</span></label><label class="ik-radio"><span><input type="checkbox" id="rEv" style="width:auto"' + (r.showEvidence ? ' checked' : '') + '> 명리 근거를 상세 리포트에 표시</span></label>' +
      '<label class="ik-radio"><span><input type="checkbox" id="rSvc" style="width:auto"' + (r.serviceEnabled ? ' checked' : '') + '> <b>서비스(무빙툰·상세 리포트)에 풀이 지식 심화 풀이 포함</b> <small class="muted">— 끄면 공개된 풀이 지식이 있어도 사용자에게 나가지 않습니다</small></span></label>' +
      '<label class="ik-radio"><span><input type="checkbox" id="rSvcAi" style="width:auto"' + (r.serviceAi ? ' checked' : '') + '> <b>추가 DB 심화 챕터를 AI가 엮기</b> <small class="muted">— 전체 무빙툰 본문은 별도로 원국과 검수된 DB 근거를 함께 읽어 AI가 새로 풀이합니다. 이 옵션을 켜면 추가 "더 깊이" 챕터의 풀이 지식 문장을 AI가 이 사람의 사주에 맞게 자연스럽게 다듬습니다(근거 풀이 지식 밖의 내용은 쓰지 못합니다). 같은 사주는 30일간 저장본을 재사용하고, 첫 방문은 최대 12초만 기다린 뒤 DB 문장으로 보여 줍니다. 하루 AI 호출 상한 기본 300회.</small></span></label>' +
      '<label class="ik-radio"><span><input type="checkbox" id="rSvcBody" style="width:auto"' + (r.serviceBody ? ' checked' : '') + '> <b>무빙툰 본문을 풀이 지식 DB 풀이로 대체</b> <small class="muted">— 켜면 DB 풀이가 충분한 분야(구성 항목 2개 이상 채워짐)는 기존 모듈 문장 챕터 대신 DB 풀이가 본문이 됩니다. DB가 부족한 분야는 기존 문장이 그대로 나옵니다. 끄면 "더 깊이" 챕터로만 덧붙습니다.</small></span></label>' +
      '<div class="ik-sec">분야별 추가 지시<small>해당 분야 풀이를 쓸 때만 AI 지시문에 덧붙습니다</small></div>' + DOM_ORDER.map(function (d) { return '<label class="ik-f"><b style="color:var(--ink)">' + esc(dko(d)) + '</b><textarea data-ov="' + d + '" rows="2" placeholder="예: 수입 증가와 돈이 남는 것을 구분한다.">' + esc((r.domainOverrides || {})[d] || '') + '</textarea></label>'; }).join('') +
      '<details style="margin-top:14px"><summary class="muted">고급 설정</summary><label class="ik-f">금지어(쉼표) — 풀이에 나오면 품질 검사에서 걸립니다<input type="text" id="rBan" value="' + esc((r.banned || []).join(', ')) + '"></label><label class="ik-f">AI 추가 지시문(프롬프트 끝에 덧붙음 · 사실을 만들어 내는 지시는 무시됩니다)<textarea id="rExtra" rows="4">' + esc(r.extraPrompt || '') + '</textarea></label></details>' +
      '<div class="ik-foot"><button class="pri" id="rSave">저장</button></div></div>';
    $('#rSave', box).onclick = function () {
      var v = function (n) { var e = box.querySelector('input[name=' + n + ']:checked'); return e ? e.value : ''; };
      var x = { tone: v('tone'), depth: v('depth'), examples: +v('ex'), jargon: v('jargon'), balance: $('#rBal').checked, actions: $('#rAct').checked, showEvidence: $('#rEv').checked, serviceEnabled: $('#rSvc').checked, serviceAi: $('#rSvcAi').checked, serviceBody: $('#rSvcBody').checked, extraPrompt: $('#rExtra').value, banned: $('#rBan').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean), domainOverrides: {} };
      $$('[data-ov]', box).forEach(function (t) { if (t.value.trim()) x.domainOverrides[t.dataset.ov] = t.value.trim(); });
      post('rules', { rules: x }).then(function (d) { G.meta.rules = d.rules; G.meta.meta = d.meta; toast('AI 작성 설정을 저장했습니다'); }).catch(function (e) { toast(e.message, true); });
    };
  }

  /* ═════ ④ 풀이 테스트 ═════ */
  var LK = 'mt_ik_lab', TSL = { date: '1990-05-15', time: '14:30', gender: 'M', domain: 'MONEY', draft: false, ai: false, depth: '', profiles: [] };
  try { Object.assign(TSL, JSON.parse(localStorage.getItem(LK) || '{}')); } catch (e) { }
  var saveTSL = function () { try { localStorage.setItem(LK, JSON.stringify(TSL)); } catch (e) { } };
  function labOpen() { var box = document.getElementById('t-iklab'); box.innerHTML = '<p class="muted">불러오는 중…</p>'; PANE = box; Promise.all([G.meta ? 0 : loadMeta(), loadItems()]).then(drawLab).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }); }
  function drawLab() {
    var box = document.getElementById('t-iklab'), f = G.focus; PANE = box; if (f) { TSL.domain = f.item.domain; TSL.draft = true; }
    box.innerHTML = '<div class="card"><div class="ik-bar" style="margin-top:0;align-items:end"><label class="ik-f">생년월일<input type="date" id="lD" value="' + esc(TSL.date) + '"></label><label class="ik-f">출생 시간<input type="time" id="lT" value="' + esc(TSL.time) + '"></label><label class="ik-f">성별<select id="lG"><option value="M"' + (TSL.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TSL.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label class="ik-f">풀이 분야<select id="lDom">' + DOM_ORDER.map(function (d) { return '<option value="' + d + '"' + (d === TSL.domain ? ' selected' : '') + '>' + esc(dko(d)) + '</option>'; }).join('') + '</select></label><label class="ik-f">풀이 깊이<select id="lDepth"><option value="">설정값(' + ({ brief: '간단', standard: '기본', detailed: '상세', max: '매우 상세' })[G.meta.rules.depth] + ')</option>' + [['brief', '간단'], ['standard', '기본'], ['detailed', '상세'], ['max', '매우 상세']].map(function (o) { return '<option value="' + o[0] + '"' + (TSL.depth === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="chk2" style="display:flex;gap:6px;margin-bottom:8px"><input type="checkbox" id="lDr" style="width:auto"' + (TSL.draft ? ' checked' : '') + '> 공개 전 풀이도 포함</label><label class="chk2" style="display:flex;gap:6px;margin-bottom:8px" title="' + (G.meta.aiAvailable ? '' : 'AI 키가 설정되어 있지 않습니다') + '"><input type="checkbox" id="lAi" style="width:auto"' + (TSL.ai && G.meta.aiAvailable ? ' checked' : '') + (G.meta.aiAvailable ? '' : ' disabled') + '> AI 로 작성</label>' +
      '<button class="pri" id="lRun" style="margin-bottom:8px">분석 실행</button>' + (TSL.profiles.length ? '<select id="lPf" style="width:auto;margin-bottom:8px"><option value="">테스트 프로필…</option>' + TSL.profiles.map(function (p, i) { return '<option value="' + i + '">' + esc(p.date + ' ' + p.time + ' ' + (p.gender === 'M' ? '남' : '여')) + '</option>'; }).join('') + '</select>' : '') + '<button id="lSv" style="margin-bottom:8px">프로필 저장</button></div>' +
      (f ? '<p class="muted" style="margin:6px 0 0">편집 중인 풀이 “' + esc(f.item.title || '새 풀이') + '”를 이번 테스트에만 포함해 실행합니다(저장되지 않음). <button id="lNoF" type="button">빼기</button></p>' : '') + '</div><div id="lOut" style="margin-top:12px"></div>';
    var rd = function () { TSL.date = $('#lD').value || TSL.date; TSL.time = $('#lT').value || TSL.time; TSL.gender = $('#lG').value; TSL.domain = $('#lDom').value; TSL.draft = $('#lDr').checked; TSL.ai = $('#lAi').checked; TSL.depth = $('#lDepth').value; saveTSL(); };
    $('#lRun', box).onclick = function () { rd(); run(); };
    $('#lSv', box).onclick = function () { rd(); TSL.profiles = [{ date: TSL.date, time: TSL.time, gender: TSL.gender }].concat(TSL.profiles.filter(function (p) { return !(p.date === TSL.date && p.time === TSL.time && p.gender === TSL.gender); })).slice(0, 10); saveTSL(); drawLab(); };
    var pf = $('#lPf', box); if (pf) pf.onchange = function () { var p = TSL.profiles[+pf.value]; if (p) { TSL.date = p.date; TSL.time = p.time; TSL.gender = p.gender; saveTSL(); drawLab(); } };
    var nf = $('#lNoF', box); if (nf) nf.onclick = function () { G.focus = null; drawLab(); };
    if (f) run();
  }
  function run(force) {
    var out = document.querySelector('#t-iklab #lOut'); if (!out) return; PANE = document.getElementById('t-iklab'); out.innerHTML = '<p class="muted">계산·분석 중…</p>';
    C.engine().then(function (M) {
      var d = TSL.date.split('-').map(Number), t = (TSL.time || '12:00').split(':').map(Number), now = Date.now();
      var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TSL.gender, city: '서울' }), sd = R.SajuData.build(ch, { now: now }), Y = sd.nowYear, ext = { future: [] };
      try { ext.future = M.seunRange(ch, Y, Y + 4).map(function (x, i) { return { year: Y + i, season: R.SajuData.seasonOf(x.ev) }; }); } catch (e) { }
      var body = { sd: sd, ext: ext, domain: TSL.domain, includeDraft: TSL.draft, compose: TSL.ai ? 'ai' : 'plain', force: !!force, scan: true, depth: TSL.depth };
      if (G.focus) body.focus = G.focus.item;
      return post('lab', body).then(function (r) { G.lab = r; drawResult(); });
    }).catch(function (e) { out.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  var STAR = function (n) { return n == null ? '<b>측정 불가</b>' : '<b>' + '★★★★★'.slice(0, n) + '<span style="color:var(--line)">' + '★★★★★'.slice(n) + '</span></b>'; };
  function drawResult() {
    PANE = document.getElementById('t-iklab'); var out = $('#lOut'), r = G.lab, p = r.package, dg = r.diagnosis, cf = p.conflicts, unres = cf.filter(function (c) { return !c.resolved; }).length;
    var head = '<div class="ik-diag"><div>풀이 깊이' + STAR(dg.depth.stars) + '<small>' + dg.depth.done + '/' + dg.depth.total + '개 항목 완성</small></div><div>근거 충분도' + STAR(dg.evidence.stars) + '<small>' + (dg.evidence.avg == null ? '—' : '항목당 풀이 지식 ' + dg.evidence.avg + '개') + '</small></div><div>현실 사례' + STAR(dg.reality.stars) + '<small>' + (dg.reality.pct == null ? '—' : dg.reality.pct + '% 항목에 현실 장면') + '</small></div><div>문장 중복<b>' + dg.duplicates.level + '</b><small>같은 문장 ' + dg.duplicates.count + '회</small></div><div>해석 충돌<b>' + dg.conflicts.count + '건</b><small>미해결 ' + dg.conflicts.unresolved + '건</small></div><div>근거 부족 항목<b>' + (dg.lacking.required + dg.lacking.optional) + '개</b><small>필수 ' + dg.lacking.required + ' · 선택 ' + dg.lacking.optional + '</small></div></div>';
    var q = '<div class="ik-q ' + r.quality.status + '"><b>품질 검사 ' + ({ PASS: '통과', WARNING: '확인 필요', FAIL: '문제 있음' })[r.quality.status] + '</b> · ' + (r.mode === 'ai' ? 'AI 작성(' + esc(r.provider) + (r.cached ? ', 저장된 결과' : '') + ')' : '규칙 기반 작성') + (r.aiError ? ' — AI 실패로 규칙 기반 사용: ' + esc(r.aiError) : '') + (r.quality.issues.length ? '<ul style="margin:4px 0 0 18px">' + r.quality.issues.slice(0, 8).map(function (i) { return '<li>' + esc((p.sections[i.section] || {}).title || i.section) + ' — ' + esc(i.msg) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    var scan = r.scan ? '<details class="card" style="padding:10px 14px;margin:8px 0"><summary><b style="color:var(--gold)">이 사주로 본 분야별 풀이 지식 상태</b> <span class="muted" style="font-size:.8rem">— 분석 가능 / 근거 부족</span></summary><table style="margin-top:6px"><tbody>' + r.scan.map(function (s) { return '<tr><td>' + esc(s.name) + '</td><td>분석 가능 <b>' + s.ok + '</b></td><td>근거 부족 <b style="color:' + (s.lacking ? 'var(--red)' : 'inherit') + '">' + s.lacking + '</b></td><td class="muted" style="font-size:.78rem">' + esc(s.lackSections.slice(0, 3).map(function (x) { return x.title; }).join(', ')) + (s.lackSections.length > 3 ? ' 외' : '') + '</td></tr>'; }).join('') + '</tbody></table></details>' : '';
    out.innerHTML = head + q + scan + '<div class="ik-labtabs">' + [['final', '최종 풀이'], ['used', '사용된 풀이 지식'], ['why', '왜 이렇게 나왔나요?'], ['data', '계산 데이터']].map(function (t) { return '<button type="button" data-t="' + t[0] + '" class="' + (G.labTab === t[0] ? 'on' : '') + '">' + t[1] + (t[0] === 'used' && cf.length ? ' ⚠' + cf.length : '') + '</button>'; }).join('') + '</div><div id="labBody"></div>';
    $$('[data-t]', out).forEach(function (b) { b.onclick = function () { G.labTab = b.dataset.t; $$('[data-t]', out).forEach(function (x) { x.classList.toggle('on', x === b); }); tab(); }; });
    tab();
    function tab() { var b = $('#labBody', out); if (G.labTab === 'final') tabFinal(b, r, unres); else if (G.labTab === 'used') tabUsed(b, r); else if (G.labTab === 'why') tabWhy(b, r); else tabData(b, r); }
  }
  function tabFinal(b, r, unres) {
    var p = r.package, h = (p.conflicts.length ? '<div class="ik-k cf">⚠ 해석 충돌 ' + p.conflicts.length + '건' + (unres ? ' (미해결 ' + unres + ')' : ' — 모두 자동 판단됨') + ' <a href="#" data-goused>자세히 보기</a></div>' : '') +
      (r.mode === 'ai' ? '<div class="ik-bar"><button id="lRe">다시 생성</button></div>' : '');
    p.order.forEach(function (id) {
      var s = p.sections[id], paras = r.composed[id] || [];
      h += '<div class="ik-sh"><b>' + esc(s.title) + '</b>' + (s.required ? '' : '<small class="muted">(선택)</small>') + (s.status === 'ok' ? '<button type="button" data-why="' + id + '">근거 보기</button>' : '') + '</div>';
      if (s.status === 'skipped') h += '<div class="ik-ins">풀이 깊이 설정으로 이번에는 생략했습니다.</div>';
      else if (s.status !== 'ok') h += '<div class="ik-ins">근거가 되는 검수된 풀이 지식이 없어 비워 둡니다. <button type="button" data-make="' + id + '" style="margin-left:6px">이 풀이 만들기</button></div>';
      else h += paras.map(function (x) { return '<div class="ik-p">' + esc(x.text) + '</div>'; }).join('');
    });
    b.innerHTML = h;
    $$('[data-why]', b).forEach(function (x) { x.onclick = function () { evidence(r, x.dataset.why); }; });
    $$('[data-make]', b).forEach(function (x) { x.onclick = function () { makeMissing(r, x.dataset.make); }; });
    var g = $('[data-goused]', b); if (g) g.onclick = function (e) { e.preventDefault(); G.labTab = 'used'; $$('.ik-labtabs button', PANE).forEach(function (t) { t.classList.toggle('on', t.dataset.t === 'used'); }); tabUsed(b, r); };
    var re = $('#lRe', b); if (re) re.onclick = function () { run(true); };
  }
  function makeMissing(r, secId) { // 부족한 풀이 만들기: 분야·세부 항목·이 사주의 값에서 뽑은 조건을 미리 채운다
    var s = r.package.sections[secId]; toast('“' + s.title + '” 풀이를 만듭니다 — 조건은 이 사주의 값으로 미리 채웠으니 고쳐서 쓰세요');
    goKnow(function () { startNew(r.package.domain, secId, r.package.suggest); });
  }
  function wizardModal(item, isNew, done) { // 풀이 지식 편집기를 대화창으로 연다(풀이 테스트·풀이 자료 검수에서 공용). 저장하면 done(저장된 항목)
    (G.meta ? Promise.resolve() : loadMeta()).then(function () { return G.items ? 0 : loadItems(); }).then(function () {
      var dlg = document.createElement('dialog'); dlg.className = 'ik-dlg'; dlg.innerHTML = '<div class="ik-bar" style="margin-top:0"><b style="color:var(--gold)">' + (isNew ? '풀이 지식 확인·수정' : '풀이 수정') + '</b><span style="flex:1"></span><button data-close>닫기</button></div><div id="mHost"></div>';
      document.body.appendChild(dlg); dlg.showModal(); var saved = PANE, shut = function () { PANE = saved; try { (dlg.close(), dlg.remove()); } catch (e) { } dlg.remove(); }; dlg.onclose = function () { PANE = saved; dlg.remove(); }; dlg.querySelector('[data-close]').onclick = shut;
      PANE = dlg; wizard(dlg.querySelector('#mHost'), item, isNew, function (it) { shut(); done(it); });
    }).catch(function (e) { toast(e.message, true); });
  }
  function openEditModal(id, domain) { // 풀이 테스트 안에서 바로 수정 → 저장하면 다시 분석
    api('/api/ik?a=get&domain=' + domain + '&id=' + encodeURIComponent(id)).then(function (d) { wizardModal(d.item, false, function () { toast('저장했습니다 — 다시 분석합니다'); G.focus = null; run(); }); }).catch(function (e) { toast(e.message, true); });
  }
  function tabUsed(b, r) {
    var p = r.package, ok = p.matchedKnowledge, ex = p.excludedKnowledge, h = '';
    if (p.conflicts.length) h += '<div class="ik-sec" style="margin-top:0">⚠ 해석 충돌 ' + p.conflicts.length + '건</div>' + p.conflicts.map(function (c, i) {
      var A = ok.filter(function (k) { return k.id === c.a; })[0] || {}, B = ok.filter(function (k) { return k.id === c.b; })[0] || {};
      return '<div class="ik-k cf"><div class="ik-g2"><div><small class="muted">풀이 A (' + (A.stance === 'positive' ? '유리한 쪽' : '조심할 쪽') + ')</small><br><b>' + esc(A.title || c.a) + '</b></div><div><small class="muted">풀이 B (' + (B.stance === 'positive' ? '유리한 쪽' : '조심할 쪽') + ')</small><br><b>' + esc(B.title || c.b) + '</b></div></div><div class="why">왜 충돌했나요? 같은 항목에서 서로 반대 방향의 풀이가 함께 맞았습니다.</div><div class="why">시스템 판단: ' + (c.resolved ? '<b>' + esc((ok.filter(function (k) { return k.id === c.winner; })[0] || {}).title || c.winner) + '</b> 우선 — 이유: ' + esc(c.by) + '이(가) 더 높음' : '<b>해결할 수 없음</b> — 두 풀이의 조건·우선순위·신뢰도가 같습니다') + '</div><div class="ik-bar"><button type="button" data-keep="' + i + '">' + (G.ack[c.a + c.b] ? '✓ 판단 유지함' : '판단 유지') + '</button><button type="button" data-edit="' + esc(c.a) + '">A 수정</button><button type="button" data-edit="' + esc(c.b) + '">B 수정</button></div></div>'; }).join('');
    h += '<div class="ik-sec"' + (p.conflicts.length ? '' : ' style="margin-top:0"') + '>이번 풀이에 쓰인 풀이 지식 (' + ok.length + '개)</div>' + (ok.map(function (k) {
      return '<div class="ik-k' + (k.used ? '' : ' off') + '"><b>' + (k.used ? '✓ ' : '○ ') + esc(k.title) + '</b> ' + (k.general ? '<span class="ik-st">일반 풀이</span>' : '') + '<div class="why">' + esc(k.subDomain) + ' · 신뢰도 ' + CONF_KO[k.confidence] + (k.used ? '' : ' · (항목에 배정되지 않음: 같은 항목의 다른 풀이가 우선하거나 풀이 깊이 설정으로 생략)') + '<br>맞은 조건: ' + esc(k.rows.filter(function (x) { return x.hit; }).map(function (x) { return x.label + ' ' + (Array.isArray(x.have) ? x.have.join(',') : x.have); }).join(' · ') || '없음(일반 풀이)') + '</div><div class="ik-bar" style="margin:4px 0 0"><button type="button" data-edit="' + esc(k.id) + '">수정</button><button type="button" data-open="' + esc(k.id) + '">풀이 열기</button></div></div>'; }).join('') || '<p class="muted">검색된 풀이 지식이 없습니다. 풀이 지식을 공개하거나 “공개 전 풀이도 포함”을 켜 보세요.</p>');
    h += '<details style="margin-top:12px"><summary class="muted">쓰이지 않은 풀이 ' + ex.length + '개 (조건이 맞지 않거나 제외 조건에 해당)</summary>' + ex.slice(0, 60).map(function (k) { return '<div class="ik-k off"><b>' + esc(k.title) + '</b><div class="why">' + ({ unmatched: '조건이 맞지 않음', excluded: '“적용하지 않는 경우”에 해당', unsupported: '엔진이 아직 주지 않는 값이 필요함' }[k.reason]) + '</div></div>'; }).join('') + '</details>';
    b.innerHTML = h;
    $$('[data-edit]', b).forEach(function (x) { x.onclick = function () { openEditModal(x.dataset.edit, p.domain); }; });
    $$('[data-open]', b).forEach(function (x) { x.onclick = function () { goKnow(function () { openDetail(x.dataset.open); }); }; });
    $$('[data-keep]', b).forEach(function (x) { x.onclick = function () { var c = p.conflicts[+x.dataset.keep]; G.ack[c.a + c.b] = 1; x.textContent = '✓ 판단 유지함'; toast('시스템 판단을 유지합니다'); }; });
  }
  var tech = false;
  function tabWhy(b, r) {
    var p = r.package, h = '<label style="display:flex;gap:6px;align-items:center;font-size:.84rem"><input type="checkbox" id="lTech" style="width:auto"' + (tech ? ' checked' : '') + '> 기술 정보 보기(내부 ID·점수)</label>';
    p.order.forEach(function (id) {
      var s = p.sections[id]; if (s.status !== 'ok') return;
      h += '<details class="card" style="padding:8px 14px;margin:8px 0"><summary><b>' + esc(s.title) + '</b> <span class="muted" style="font-size:.8rem">· 풀이 지식 ' + s.items.length + '개 사용</span></summary>' + whyHtml(p, s) + '</details>';
    });
    b.innerHTML = h; bindEv(b); $('#lTech', b).onchange = function () { tech = this.checked; tabWhy(b, r); };
  }
  function whyHtml(p, s) {
    var facts = []; s.items.forEach(function (i) { i.why.forEach(function (w) { if (facts.indexOf(w) < 0) facts.push(w); }); });
    var h = '<h4 style="margin:8px 0 2px;color:var(--gold);font-size:.82rem">사주에서 확인된 특징</h4>' + (facts.length ? facts.map(function (x) { return '<div>✓ ' + esc(x) + '</div>'; }).join('') : '<div class="muted">조건 없는 일반 풀이입니다</div>');
    h += '<h4 style="margin:10px 0 2px;color:var(--gold);font-size:.82rem">사용된 풀이 지식</h4>' + s.items.map(function (i) { return '<div>✓ ' + esc(i.title) + (tech ? ' <small class="muted">[' + esc(i.id) + ' · 구체성 ' + i.spec + ']</small>' : '') + '</div>' + (i.evidence && i.evidence.length ? '<div style="margin:2px 0 6px 14px">' + evList(i.evidence) + '</div>' : ''); }).join('');
    var mods = []; s.items.forEach(function (i) { i.modifiers.forEach(function (m) { mods.push(m); }); });
    h += '<h4 style="margin:10px 0 2px;color:var(--gold);font-size:.82rem">해석을 바꾼 조건</h4>' + (mods.length ? mods.map(function (m) { return '<div>✓ ' + EFFECT[m.effect] + ' — ' + esc(m.text || '') + '</div>'; }).join('') : '<div class="muted">없음</div>');
    var conf = s.items.reduce(function (a, i) { return a + ({ high: 3, mid: 2, low: 1 })[i.confidence]; }, 0) / (s.items.length || 1);
    return h + '<h4 style="margin:10px 0 2px;color:var(--gold);font-size:.82rem">신뢰도</h4><div>' + (conf >= 2.5 ? '높음' : conf >= 1.8 ? '보통' : '낮음') + '</div>';
  }
  function evidence(r, secId) { // [근거 보기] 서랍
    var p = r.package, s = p.sections[secId], old = document.querySelector('.ik-dr'); if (old) old.remove();
    var dr = document.createElement('div'); dr.className = 'ik-dr';
    dr.innerHTML = '<div class="ik-bar" style="margin-top:0"><b style="color:var(--gold)">왜 이렇게 해석했나요?</b><span style="flex:1"></span><button id="drX">닫기</button></div><div class="ik-sh" style="margin-top:6px"><b>' + esc(s.title) + '</b></div>' + whyHtml(p, s) +
      '<h4>관련 풀이 지식 열기</h4>' + s.items.map(function (i) { return '<div class="ik-k"><b>' + esc(i.title) + '</b><div class="ik-bar" style="margin:4px 0 0"><button type="button" data-edit="' + esc(i.id) + '">수정</button><button type="button" data-open="' + esc(i.id) + '">풀이 열기</button></div></div>'; }).join('') +
      '<label style="display:flex;gap:6px;align-items:center;font-size:.8rem;margin-top:12px"><input type="checkbox" id="drT" style="width:auto"' + (tech ? ' checked' : '') + '> 기술 정보 보기</label>';
    document.body.appendChild(dr); bindEv(dr); dr.querySelector('#drX').onclick = function () { dr.remove(); };
    dr.querySelector('#drT').onchange = function () { tech = this.checked; evidence(r, secId); };
    [].slice.call(dr.querySelectorAll('[data-edit]')).forEach(function (a) { a.onclick = function () { dr.remove(); openEditModal(a.dataset.edit, p.domain); }; });
    [].slice.call(dr.querySelectorAll('[data-open]')).forEach(function (a) { a.onclick = function () { dr.remove(); goKnow(function () { openDetail(a.dataset.open); }); }; });
  }
  function tabData(b, r) {
    var fa = r.package.facts;
    b.innerHTML = '<div class="card">' + [['일주', fa.dayPillar], ['일간', fa.dayMaster], ['월령', fa.monthBranch + '월 · ' + fa.season], ['신강/신약', fa.strength], ['통근', (fa.hasRoot || '-') + (fa.rootLevel ? ' (' + fa.rootLevel + ')' : '')], ['용신', fa.yongEl || '-'], ['오행', fa.elements], ['십성', fa.groups], ['격국', (fa.patterns || []).join(', ') || '-'], ['신살', (fa.stars || []).join(', ') || '-'], ['합충형파해', (fa.relations || []).join(', ') || '-'], ['현재 대운', fa.daewoonSeason || '-'], ['올해 세운', fa.seunSeason || '-'], ['이달 월운', fa.monthSeason || '-'], ['앞으로 5년', (fa.future || []).map(function (x) { return x.year + ' ' + x.season; }).join(' · ') || '-']].map(function (x) { return '<div class="ik-kv"><span>' + x[0] + '</span><div>' + esc(x[1]) + '</div></div>'; }).join('') +
      '<h4 style="margin:14px 0 4px;color:var(--gold);font-size:.82rem">아직 조건으로 쓸 수 없는 값</h4><p class="muted" style="font-size:.8rem;margin:0">' + r.package.unsupported.map(esc).join(' · ') + '</p></div>';
  }

  window.V2IK = { open: function (tab, pw) {
    C.setPw(pw); PANE = document.getElementById('t-' + tab);
    if (tab === 'ikknow') knowOpen(); else if (tab === 'ikdesign') designOpen(); else if (tab === 'ikrules') rulesOpen(); else if (tab === 'iklab') labOpen();
    if (tab !== 'iklab') G.focus = null;
  }, _state: G, _sentence: sentence, wizardModal: wizardModal, testItem: function (it) { G.focus = { item: clone(it) }; window.AdminShowTab('iklab'); }, newFor: function (d, sub, conds) { goKnow(function () { startNew(d, sub, conds); }); }, openDetail: function (id) { goKnow(function () { openDetail(id); }); }, evList: evList };
})();
