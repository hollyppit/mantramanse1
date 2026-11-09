/* 관리자 v2: 일간·일주 소개 — 일간별(10×남·여=20)·일주별(60×남·여=120) 영상과 문구를 한 곳에서 보고 일괄 편집한다.
   같은 컴포넌트를 ① 상단 탭 "일간·일주 소개" ② 챕터 관리 맨 위 "도입" 항목 ③ 클립 라이브러리의 같은 이름 하위 탭에 붙인다(상태는 하나).
   저장은 /api/awakening 하나: { videos(일주 120), ilgan(일간 20), fallback, publicBase, textOnly }. 문구는 각 항목의 title·subtitle·keywords.
   문구를 비우면 기본 문구(ReportV2.IntroText: 일간 4줄·일주 4줄)가 나온다. 영상이 없어도 "영상 없으면 문구만 보여 주기"를 켜면 문구 화면이 나온다. */
(function () {
  var R = window.ReportV2, C = window.V2Content, A = window.V2Admin;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var STEMS = '갑을병정무기경신임계'.split(''), BRS = '자축인묘진사오미신유술해'.split('');
  var ELN = { '갑': '목', '을': '목', '병': '화', '정': '화', '무': '토', '기': '토', '경': '금', '신': '금', '임': '수', '계': '수' };
  var GK = { M: '남', F: '여' };
  var I = { ilgan: [], iju: [], fb: null, base: '', textOnly: false, loaded: false, dirty: false, mode: 'ilgan', f: { stem: '', branch: '', gender: '', status: '', q: '' }, sel: {}, root: null, pw: '', undo: null, busy: 0, thumbs: false };
  try { I.thumbs = localStorage.getItem('iv.thumbs') === '1'; } catch (e) { }

  // ───────── 데이터 ─────────
  var keyOf = function (kind, id, g) { return kind + '|' + id + '|' + g; };
  function rowsOf(kind) {
    var out = [];
    if (kind === 'ilgan') STEMS.forEach(function (s) { ['M', 'F'].forEach(function (g) { out.push({ kind: 'ilgan', id: s, stem: s, g: g }); }); });
    else STEMS.forEach(function (s, si) { BRS.forEach(function (b, bi) { if (si % 2 !== bi % 2) return; ['M', 'F'].forEach(function (g) { out.push({ kind: 'iju', id: s + b, stem: s, branch: b, g: g }); }); }); });
    return out;
  }
  function recOf(r) { var L = r.kind === 'ilgan' ? I.ilgan : I.iju; return L.filter(function (v) { return (r.kind === 'ilgan' ? v.stem === r.id : v.dayPillar === r.id) && v.gender === r.g; })[0] || null; }
  function ensure(r) {
    var v = recOf(r); if (v) return v;
    v = r.kind === 'ilgan' ? { stem: r.id, gender: r.g } : { dayPillar: r.id, gender: r.g };
    Object.assign(v, { videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: '', subtitle: '', keywords: [], enabled: true });
    (r.kind === 'ilgan' ? I.ilgan : I.iju).push(v); return v;
  }
  var hasVideo = function (v) { return !!(v && (v.videoUrl || v.videoWebm)); };
  var hasText = function (v) { return !!(v && (v.title || v.subtitle || (v.keywords || []).length)); };
  // 칸마다 "다른 일간/일주를 말하는가" 검사(report/v2/media.js 와 같은 규칙). 어긋나면 그 일간·일주 이름을 돌려준다
  var mmText = function (r, t) { return r.kind === 'ilgan' ? R.Media.ilganTextMismatch(r.id, t) : R.Media.ijuTextMismatch(r.id, t); };
  function badOf(r) { var v = recOf(r); return v ? (mmText(r, v.title || '') || mmText(r, v.subtitle || '') || mmText(r, (v.keywords || []).join(' '))) : ''; }
  function fixBad() { // 어긋난 칸을 비운다(기본 문구로 돌아간다)
    snapshot(); var n = 0;
    ['ilgan', 'iju'].forEach(function (k) { rowsOf(k).forEach(function (r) { var v = recOf(r); if (!v) return; if (mmText(r, v.title || '')) { v.title = ''; n++; } if (mmText(r, v.subtitle || '')) { v.subtitle = ''; n++; } if (mmText(r, (v.keywords || []).join(' '))) { v.keywords = []; n++; } }); });
    if (n) dirty(true); draw(true); C.toast(n ? n + '칸을 기본 문구로 되돌렸습니다 — 저장을 눌러 반영하세요' : '어긋난 문구가 없습니다');
  }
  function defLines(r) { var T = R.IntroText; if (!T) return []; return r.kind === 'ilgan' ? T.ilgan(r.id) : T.iju(r.id); }
  function defTitle(r) { return r.kind === 'ilgan' ? r.id + ELN[r.id] + '의 기질을 타고났다' : r.id + '일주'; }
  function dirty(on) { I.dirty = on !== false; var b = $('[data-ivsave]', I.root); if (b) b.disabled = !I.dirty; }
  function snapshot() { I.undo = JSON.stringify({ ilgan: I.ilgan, iju: I.iju }); var u = $('[data-ivundo]', I.root); if (u) u.disabled = false; }
  function statusOf(r) { var v = recOf(r); return !v ? 'empty' : v.enabled === false ? 'off' : hasVideo(v) ? (hasText(v) ? 'full' : 'video') : hasText(v) ? 'text' : 'empty'; }

  // ───────── 불러오기 · 저장 ─────────
  function load(force) {
    if (I.loaded && !force) return Promise.resolve();
    return C.api('/api/awakening?all=1').then(function (d) {
      I.iju = (d.videos || []).map(function (x) { return Object.assign({}, x); }); I.ilgan = (d.ilgan || []).map(function (x) { return Object.assign({}, x); });
      I.fb = d.fallback || { videoUrl: '', videoWebm: '', posterUrl: '', title: '' }; I.base = d.publicBase || ''; I.textOnly = !!d.textOnly; I.loaded = true; I.dirty = false; I.undo = null;
    });
  }
  function normalizeDefaults() {
    [['ilgan', I.ilgan], ['iju', I.iju]].forEach(function (p) { p[1].forEach(function (v) {
      var r = { kind: p[0], id: p[0] === 'ilgan' ? v.stem : v.dayPillar, g: v.gender }; if (!r.id) return;
      if (String(v.subtitle || '').trim() === defLines(r).join(String.fromCharCode(10)).trim()) v.subtitle = ''; if ((v.title || '').trim() === defTitle(r)) v.title = '';
    }); });
  }
  function prune(L) { return L.filter(function (v) { return hasVideo(v) || v.posterUrl || v.captionsUrl; }).map(function (v) { var o = Object.assign({}, v); delete o._new; o.title = ''; o.subtitle = ''; o.keywords = []; return o; }); } // 자막은 자동 생성이라 예전에 저장한 문구는 저장할 때 모두 지운다
  function save() {
    var b = $('[data-ivsave]', I.root); if (b) { b.disabled = true; b.textContent = '저장 중…'; }
    normalizeDefaults();
    return C.api('/api/awakening', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ videos: prune(I.iju), ilgan: prune(I.ilgan), fallback: I.fb, publicBase: I.base, textOnly: I.textOnly }) })
      .then(function (d) { I.dirty = false; C.toast('저장했습니다 (일주 ' + d.count + '개 · 일간 ' + d.ilgan + '개)'); }).catch(function (e) { C.toast(e.message, true); dirty(true); }).then(function () { if (b) b.textContent = '저장'; draw(true); });
  }

  // ───────── 화면 ─────────
  var STYLE = '.iv .ivbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}.iv table.ivt{width:100%;border-collapse:collapse;font-size:.84rem}.iv .ivt th{position:sticky;top:0;background:var(--panel,#16181f);text-align:left;padding:6px;font-weight:500;color:var(--ink2,#aaa);z-index:1}' +
    '.iv .ivt td{padding:4px 6px;border-top:1px solid var(--line,#2a2d38);vertical-align:top}.iv .ivt input[type=text],.iv .ivt textarea{width:100%;box-sizing:border-box;font:inherit;padding:4px 6px}.iv .ivt textarea{min-height:92px;resize:vertical}' +
    '.iv .ivt tr.off td{opacity:.45}.iv .chip{display:inline-block;padding:0 7px;border:1px solid var(--line,#444);border-radius:999px;font-size:.7rem;margin:1px;white-space:nowrap}.iv .chip.ok{color:#7FE0BC;border-color:#2e6e57}.iv .chip.no{color:#8a8d98}' +
    '.iv .bulk{position:sticky;top:0;z-index:3;border:1px solid var(--gold,#c9a86a);border-radius:10px;padding:10px 12px;margin:8px 0;background:var(--bg,#0f1115)}.iv .bulk textarea,.iv .bulk input[type=text]{width:100%;box-sizing:border-box;font:inherit;padding:4px 6px}.iv .grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}' +
    '.iv button.chip{background:none;font:inherit;font-size:.7rem;cursor:pointer;line-height:1.5}.iv button.chip.ok:hover{background:#173a2e}.iv .pvbtn{font-size:.72rem;padding:1px 8px;margin-left:2px}' +
    '.iv .pvth{width:34px;height:48px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:4px;background:#000;cursor:pointer;border:1px solid var(--line,#333)}.iv .pvth.bad{background:#4A1F1F;border-color:#FF8A78}' +
    '.iv .isdef{color:var(--ink3,#8a8d98)}.iv .vl{font-size:.74rem;color:var(--ink3,#888)}.iv .stat span{margin-right:14px}';
  function mount(root, pw, opts) {
    opts = opts || {}; I.root = root; I.pw = pw || I.pw; if (opts.mode) I.mode = opts.mode;
    if (!document.getElementById('ivstyle')) { var st = document.createElement('style'); st.id = 'ivstyle'; st.textContent = STYLE; document.head.appendChild(st); }
    if (!root._pvErr) { root._pvErr = 1; root.addEventListener('error', function (e) { var im = e.target; if (im && im.classList && im.classList.contains('pvth')) { im.classList.add('bad'); im.title = '포스터를 불러오지 못했습니다'; } }, true); }
    root.innerHTML = '<p class="muted">불러오는 중…</p>';
    load(!I.dirty).then(function () { draw(); }).catch(function (e) { root.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function draw(keepScroll) {
    var root = I.root; if (!root) return; var y = keepScroll ? window.scrollY : null;
    var rows = rowsOf(I.mode), f = I.f, q = f.q.trim();
    var list = rows.filter(function (r) {
      if (f.stem && r.stem !== f.stem) return false; if (f.branch && r.branch !== f.branch) return false; if (f.gender && r.g !== f.gender) return false;
      var st = statusOf(r); if (f.status === 'novideo' && hasVideo(recOf(r))) return false; if (f.status === 'notext' && hasText(recOf(r))) return false; if (f.status === 'off' && st !== 'off') return false; if (f.status === 'done' && st !== 'full') return false; if (f.status === 'bad' && !badOf(r)) return false;
      if (q) { var v = recOf(r) || {}, hay = (r.id + (GK[r.g]) + (v.title || '') + (v.subtitle || '') + (v.keywords || []).join(' ')); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
    var all = rows, nv = all.filter(function (r) { return hasVideo(recOf(r)); }).length, nt = all.filter(function (r) { return hasText(recOf(r)); }).length, ns = Object.keys(I.sel).filter(function (k) { return I.sel[k] && k.split('|')[0] === I.mode; }).length;
    var opt = function (arr, v, lbl) { return '<option value="">' + lbl + '</option>' + arr.map(function (x) { return '<option' + (v === x ? ' selected' : '') + '>' + x + '</option>'; }).join(''); };
    var h = '<div class="iv"><div class="card"><div class="ivbar"><b style="color:var(--gold)">일간·일주 영상</b><span class="muted">일간별 20개 · 일주별 120개의 변신 영상을 한 곳에서. 자막은 사용자 이름과 사주에 맞춰 자동으로 만들어져서 따로 관리하지 않습니다.</span><span style="flex:1"></span>' +
      '<button type="button" data-ivundo' + (I.undo ? '' : ' disabled') + '>되돌리기</button><button type="button" class="pri" data-ivsave' + (I.dirty ? '' : ' disabled') + '>저장</button></div>' +
      '<div class="ivbar"><div class="sub2" data-ivmode><button type="button" data-m="ilgan" class="' + (I.mode === 'ilgan' ? 'on' : '') + '">일간 소개 (10×2 = 20)</button><button type="button" data-m="iju" class="' + (I.mode === 'iju' ? 'on' : '') + '">일주 소개 (60×2 = 120)</button></div>' +
      '<span class="stat muted"><span>영상 <b>' + nv + ' / ' + all.length + '</b></span></span><label class="muted" style="display:flex;gap:4px;align-items:center;font-size:.8rem" title="화면에 보이는 행의 포스터만 불러옵니다"><input type="checkbox" data-ivthumbs' + (I.thumbs ? ' checked' : '') + '> 목록에 포스터 작게 보기</label><span style="flex:1"></span>' +
      '<label class="navbtn" style="cursor:pointer">영상·포스터 한꺼번에 올리기<input type="file" data-ivfiles multiple accept="video/mp4,video/webm,image/*,.vtt" hidden></label><button type="button" data-ivcsvout>CSV 내려받기</button><label class="navbtn" style="cursor:pointer">CSV 올리기<input type="file" data-ivcsvin accept=".csv,text/csv" hidden></label></div>' +
      '<p class="muted" style="margin:0 0 6px;font-size:.78rem">파일명 규칙: 일간 <code>경금_남.mp4</code> · <code>경_여_poster.webp</code> / 일주 <code>경오_남.mp4</code> · <code>庚午_F.webm</code> (한자·M/F 가능). 업로드한 파일은 이름에 맞는 항목에 자동 연결됩니다.</p>' +
      '<div id="ivq"></div>' +
      '<details data-ivset style="margin:6px 0"><summary class="muted" style="cursor:pointer">공통 설정 · 기본 영상 · 공개 주소</summary><div class="grid3" style="margin-top:8px">' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-ivtextonly' + (I.textOnly ? ' checked' : '') + '> 영상이 없어도 소개 카드만 보여 주기 (영상이 없는 일간은 이름·소개 문구만 몇 초 나옵니다)</label>' +
      '<label>공개 영상 기본 주소 (R2 도메인)<input type="text" data-ivbase value="' + esc(I.base) + '" placeholder="https://video.내도메인.com"></label>' +
      '<label>기본(fallback) 일주 영상 MP4<input type="text" data-ivfb="videoUrl" value="' + esc((I.fb || {}).videoUrl || '') + '"></label><label>fallback WebM<input type="text" data-ivfb="videoWebm" value="' + esc((I.fb || {}).videoWebm || '') + '"></label><label>fallback 포스터<input type="text" data-ivfb="posterUrl" value="' + esc((I.fb || {}).posterUrl || '') + '"></label><div><button type="button" data-pvfb>기본(fallback) 영상 미리보기</button></div></div></details>' +
      '<div class="ivbar"><select data-f="stem">' + opt(STEMS, f.stem, '일간 전체') + '</select>' + (I.mode === 'iju' ? '<select data-f="branch">' + opt(BRS, f.branch, '일지 전체') + '</select>' : '') +
      '<select data-f="gender"><option value="">남·여</option><option value="M"' + (f.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (f.gender === 'F' ? ' selected' : '') + '>여</option></select>' +
      '<select data-f="status"><option value="">상태 전체</option><option value="novideo"' + (f.status === 'novideo' ? ' selected' : '') + '>영상 없음</option><option value="done"' + (f.status === 'done' ? ' selected' : '') + '>영상 있음</option><option value="off"' + (f.status === 'off' ? ' selected' : '') + '>사용 안 함</option></select>' +
      '<input type="text" data-f="q" value="' + esc(f.q) + '" placeholder="문구·키 검색" style="width:150px"><span style="flex:1"></span><span class="muted">보이는 ' + list.length + '개</span>' +
      '<button type="button" data-ivsel="vis">보이는 것 모두 선택</button><button type="button" data-ivsel="m">남성만</button><button type="button" data-ivsel="f">여성만</button><button type="button" data-ivsel="none">선택 해제</button></div></div>';
    h += ns ? bulkHtml(ns) : '';
    h += '<div class="card" style="margin-top:10px;overflow:auto;max-height:70vh"><table class="ivt"><tr><th style="width:26px"></th><th style="width:84px">대상</th><th style="width:130px">영상</th><th style="width:46px">사용</th><th style="width:96px">영상 올리기</th></tr>';
    list.forEach(function (r) {
      var v = recOf(r) || {}, k = keyOf(r.kind, r.id, r.g), dl = defLines(r).join('\n');
      h += '<tr data-k="' + esc(k) + '"' + (v.enabled === false ? ' class="off"' : '') + '><td><input type="checkbox" data-sel' + (I.sel[k] ? ' checked' : '') + '></td><td><b>' + esc(r.id) + (r.kind === 'ilgan' ? ELN[r.id] : '') + '</b> <span class="vl">' + GK[r.g] + '</span>' + '</td>' +
        '<td data-vc>' + chips(v) + '</td>' +
        '<td><input type="checkbox" data-en' + (v.enabled !== false ? ' checked' : '') + '></td><td><label class="navbtn" style="cursor:pointer;font-size:.74rem">파일 선택<input type="file" data-up accept="video/mp4,video/webm,image/*" hidden></label></td></tr>';
    });
    root.innerHTML = h + '</table></div></div>';
    bind(root, list);
    if (y != null) window.scrollTo(0, y);
  }
  function chips(v) {
    var c = function (f, t) { var ok = !!(v && v[f]); return ok ? '<button type="button" class="chip ok" data-pv="' + f + '" title="' + t + ' 미리보기">' + t + ' ✓</button>' : '<span class="chip no">' + t + '</span>'; };
    var th = I.thumbs && v && v.posterUrl ? '<img class="pvth" loading="lazy" decoding="async" alt="" data-pv="posterUrl" src="' + esc(v.posterUrl) + '">' : ''; // 실패 표시는 mount 의 error 캡처가 맡는다
    return th + c('videoUrl', 'MP4') + c('videoWebm', 'WebM') + c('posterUrl', '포스터') + ' <button type="button" class="pvbtn" data-pv="">미리보기</button>';
  }

  function bulkHtml(n) {
    return '<div class="bulk"><b>선택한 ' + n + '개에 한꺼번에 적용</b>' +
      '<div class="ivbar"><button type="button" data-bact="on">사용</button><button type="button" data-bact="off">사용 안 함</button><button type="button" class="danger" data-bact="clearvideo">영상 연결 지우기</button><span style="flex:1"></span>' +
      '<label class="navbtn" style="cursor:pointer">파일 하나를 선택 항목 전부에 연결<input type="file" data-bfile accept="video/mp4,video/webm,image/*" hidden></label></div></div>';
  }

  // ───────── 이벤트 ─────────
  function bind(root, list) {
    var tbl = $('.ivt', root);
    root.onclick = function (e) {
      var t = e.target;
      var m = t.closest('[data-ivmode] button'); if (m) { I.mode = m.dataset.m; I.f.stem = I.f.branch = ''; draw(); return; }
      if (t.closest('[data-ivsave]')) { save(); return; }
      if (t.closest('[data-pvfb]')) { pvOpen([{ label: '기본(fallback) 영상', v: I.fb || {} }], 0, ''); return; }
      var pv = t.closest('[data-pv]'), ptr = pv && pv.closest('tr[data-k]');
      if (ptr) { var items = list.map(function (r) { return { r: r }; }), ix = 0; items.forEach(function (it, i) { if (keyOf(it.r.kind, it.r.id, it.r.g) === ptr.dataset.k) ix = i; }); pvOpen(items, ix, pv.dataset.pv); return; }

      if (t.closest('[data-ivundo]')) { if (I.undo) { var u = JSON.parse(I.undo); I.ilgan = u.ilgan; I.iju = u.iju; I.undo = null; dirty(true); draw(true); C.toast('되돌렸습니다'); } return; }
      var s = t.closest('[data-ivsel]'); if (s) { selectBy(s.dataset.ivsel, list); return; }
      if (t.closest('[data-ivcsvout]')) { csvOut(); return; }
      var b = t.closest('[data-bact]'); if (b) { bulk(b.dataset.bact, list); return; }
    };
    root.onchange = function (e) {
      var t = e.target, tr = t.closest('tr[data-k]');
      if (t.matches('[data-f]')) { I.f[t.dataset.f] = t.value; draw(); return; }
      if (t.matches('[data-ivthumbs]')) { I.thumbs = t.checked; try { localStorage.setItem('iv.thumbs', t.checked ? '1' : '0'); } catch (x) { } draw(true); return; }
      if (t.matches('[data-ivtextonly]')) { I.textOnly = t.checked; dirty(true); return; }
      if (t.matches('[data-ivbase]')) { I.base = t.value.trim(); dirty(true); return; }
      if (t.matches('[data-ivfb]')) { I.fb = I.fb || {}; I.fb[t.dataset.ivfb] = t.value.trim(); dirty(true); return; }
      if (t.matches('[data-ivfiles]')) { filesBulk(t.files); t.value = ''; return; }
      if (t.matches('[data-ivcsvin]')) { csvIn(t.files[0]); t.value = ''; return; }
      if (t.matches('[data-bfile]')) { oneForAll(t.files[0], list); t.value = ''; return; }
      if (!tr) return; var r = rowOfKey(tr.dataset.k);
      if (t.matches('[data-sel]')) { I.sel[tr.dataset.k] = t.checked; draw(true); return; }
      if (t.matches('[data-en]')) { ensure(r).enabled = t.checked; tr.classList.toggle('off', !t.checked); dirty(true); return; }
      if (t.matches('[data-up]')) { upOne(r, t.files[0], tr); t.value = ''; }
    };
    root.oninput = function (e) {
      var t = e.target, tr = t.closest('tr[data-k]'); if (!tr || !t.matches('[data-fld]')) return; var r = rowOfKey(tr.dataset.k), v = ensure(r), k = t.dataset.fld;
      t.classList.remove('isdef'); if (k === 'keywords') v.keywords = t.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8); else v[k] = t.value; dirty(true);
    };
  }
  function rowOfKey(k) { var p = k.split('|'); return rowsOf(p[0]).filter(function (r) { return r.id === p[1] && r.g === p[2]; })[0]; }
  function selectBy(how, list) {
    if (how === 'none') { Object.keys(I.sel).forEach(function (k) { if (k.split('|')[0] === I.mode) delete I.sel[k]; }); }
    else list.forEach(function (r) { if (how === 'm' && r.g !== 'M') return; if (how === 'f' && r.g !== 'F') return; I.sel[keyOf(r.kind, r.id, r.g)] = true; });
    draw(true);
  }
  function selected() { return rowsOf(I.mode).filter(function (r) { return I.sel[keyOf(r.kind, r.id, r.g)]; }); }

  // ───────── 일괄 편집 ─────────
  function fill(tpl, r) {
    var L = defLines(r), nm = r.kind === 'ilgan' ? r.id + ELN[r.id] : r.id;
    return String(tpl).replace(/\{(일간명|일간|오행|일주|성별|줄[1-4])\}/g, function (m, k) { return k === '일간명' ? r.stem + ELN[r.stem] : k === '일간' ? r.stem : k === '오행' ? ELN[r.stem] : k === '일주' ? (r.kind === 'iju' ? r.id : r.stem) : k === '성별' ? GK[r.g] : (L[+k.slice(1) - 1] || ''); }).replace(/\\n/g, '\n');
  }
  function bulk(act, list) {
    var rs = selected(); if (!rs.length) return; var box = $('.bulk', I.root), g = function (k) { var e = $('[data-b="' + k + '"]', box); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
    if (act === 'clearvideo' && !confirm('선택한 ' + rs.length + '개의 영상·포스터 연결을 지웁니다(파일은 보관소에 남습니다). 계속할까요?')) return;
    snapshot(); var n = 0, skip = 0;
    rs.forEach(function (r) {
      var v = ensure(r), M = recOf({ kind: r.kind, id: r.id, g: 'M' }), F = recOf({ kind: r.kind, id: r.id, g: 'F' });


      if (act === 'on' || act === 'off') { v.enabled = act === 'on'; n++; }

      else if (act === 'clearvideo') { v.videoUrl = v.videoWebm = v.posterUrl = v.captionsUrl = ''; n++; }

    });
    dirty(true); draw(true); if (skip) C.toast(skip + '칸은 다른 일간·일주를 말하는 문구라 건너뛰었습니다. 문구에 {일간명}·{줄1}~{줄4} 같은 변수를 쓰면 항목마다 알맞게 채워집니다.', true); else C.toast(n ? n + '개 항목에 적용했습니다 — 저장을 눌러 반영하세요' : '바꿀 내용이 없습니다 (이미 쓴 문구는 "덮어쓰기"를 켜야 바뀝니다)');
  }
  function setFile(v, kind, url) { v[kind] = url; }
  function oneForAll(file, list) {
    var rs = selected(); if (!file || !rs.length) return; var kind = A.parseName ? (A.parseName(file.name) || {}).kind : null; kind = kind || (/^image\//.test(file.type) ? 'posterUrl' : /webm/.test(file.type) ? 'videoWebm' : 'videoUrl');
    C.toast('올리는 중…'); (/^image\//.test(file.type) && A.shrinkImage ? A.shrinkImage(file) : Promise.resolve(file)).then(function (ff) { return A.upload(ff, ff.name, I.pw); }).then(function (u) {
      snapshot(); rs.forEach(function (r) { setFile(ensure(r), kind, u); }); dirty(true); draw(true); C.toast(rs.length + '개 항목에 연결했습니다 (' + kind + ') — 저장을 눌러 반영하세요');
    }).catch(function (e) { C.toast(e.message, true); });
  }
  function upOne(r, file, tr) {
    if (!file) return; var kind = (A.parseName(file.name) || {}).kind || (/^image\//.test(file.type) ? 'posterUrl' : /webm/.test(file.type) ? 'videoWebm' : 'videoUrl'), cell = $('[data-vc]', tr); cell.innerHTML = '<span class="vl">올리는 중…</span>';
    (/^image\//.test(file.type) && A.shrinkImage ? A.shrinkImage(file) : Promise.resolve(file)).then(function (ff) { return A.upload(ff, ff.name, I.pw); }).then(function (u) { ensure(r)[kind] = u; cell.innerHTML = chips(recOf(r)); dirty(true); }).catch(function (e) { cell.innerHTML = chips(recOf(r)); C.toast(e.message, true); });
  }
  // 파일명으로 자동 배정(일간·일주 모두): 이 화면에서 올린 것도 같은 규칙
  function filesBulk(files) {
    var q = $('#ivq', I.root), todo = [].slice.call(files), done = 0, bad = 0; if (!todo.length) return; snapshot();
    var next = function () {
      var f = todo.shift(); if (!f) { C.toast('올리기 끝 — 연결 ' + done + '개' + (bad ? ' · 해석 불가 ' + bad + '개' : '') + ' · 저장을 눌러 반영하세요'); draw(true); return; }
      var pn = A.parseName(f.name), row = document.createElement('div'); row.className = 'vl'; row.textContent = f.name + ' …'; q.appendChild(row);
      if (!pn) { row.textContent = f.name + ' — 파일명을 해석할 수 없습니다'; row.style.color = '#FF9C8C'; bad++; return next(); }
      (/^image\//.test(f.type) && A.shrinkImage ? A.shrinkImage(f) : Promise.resolve(f)).then(function (ff) { return A.upload(ff, ff.name, I.pw); }).then(function (u) {
        var r = pn.ilgan ? { kind: 'ilgan', id: pn.stem, g: pn.g } : { kind: 'iju', id: pn.p, g: pn.g }; ensure(r)[pn.kind] = u; done++; dirty(true); row.textContent = f.name + ' → ' + r.id + ' ' + GK[r.g] + ' (' + pn.kind + ')'; row.style.color = '#7FE0BC';
      }).catch(function (e) { row.textContent = f.name + ' — ' + e.message; row.style.color = '#FF9C8C'; }).then(next);
    }; next();
  }

  // ───────── 미리보기 ─────────
  // 행의 "미리보기"·배지를 누를 때만 그 한 항목의 포스터·MP4·WebM 을 불러온다(목록 전체를 미리 받지 않음). 이전/다음(←/→)으로 보이는 목록을 넘겨 본다.
  // 파일마다 앞 2바이트만 요청(Range)해 서버 응답 상태·크기·형식을 확인하고, 실제 재생/표시 결과(해상도·길이·실패 이유)를 함께 보여 준다.
  var PV = { dlg: null, items: [], i: 0, focus: '', pub: false };
  var PVF = [['posterUrl', '포스터', 'img'], ['videoUrl', 'MP4', 'video'], ['videoWebm', 'WebM', 'video']];
  function pvSrc(u) { var b = String(I.base || '').replace(/\/+$/, ''); return PV.pub && b ? String(u).replace(/^\/api\/clipfile\?k=([\w.-]{1,120})$/, function (m, k) { return b + '/' + k; }) : u; }
  var mb = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; };
  function probe(u) {
    if (!window.fetch) return Promise.resolve(null);
    return fetch(u, { headers: { range: 'bytes=0-1' }, cache: 'no-store' }).then(function (res) {
      var cr = res.headers.get('content-range') || '', m = /\/(\d+)$/.exec(cr), size = m ? +m[1] : res.status === 200 ? +(res.headers.get('content-length') || 0) : 0;
      if (res.body && res.body.cancel) res.body.cancel().catch(function () { });
      return { ok: res.ok, status: res.status, size: size, type: (res.headers.get('content-type') || '').split(';')[0] };
    }).catch(function () { return { ok: null }; }); // 다른 도메인(CORS) 등으로 확인할 수 없음
  }
  function pvItem() { var it = PV.items[PV.i]; if (!it) return null; return it.r ? { label: esc(it.r.id) + (it.r.kind === 'ilgan' ? ELN[it.r.id] : '') + ' ' + GK[it.r.g], v: recOf(it.r) || {} } : { label: esc(it.label), v: it.v || {} }; }
  function pvStop() { if (!PV.dlg) return; $$('video', PV.dlg).forEach(function (v) { try { v.pause(); } catch (e) { } v.removeAttribute('src'); v.load(); }); }
  function pvEnsure() {
    if (PV.dlg) return PV.dlg;
    var d = document.createElement('dialog'); d.className = 'wide pvdlg';
    var st = document.createElement('style'); st.textContent = '.pvdlg .pvw{padding:16px 18px;display:grid;gap:12px}.pvdlg .pvh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pvdlg .pvg{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}' +
      '.pvdlg .pvc{border:1px solid var(--line,#2a2d38);border-radius:10px;padding:10px;display:grid;gap:6px;align-content:start}.pvdlg .pvc.focus{border-color:var(--gold,#c9a86a)}.pvdlg .pvc video,.pvdlg .pvc img{display:block;width:100%;max-height:52vh;object-fit:contain;background:#000;border-radius:6px}' +
      '.pvdlg .pvs{font-size:.78rem}.pvdlg .pvs.ok{color:#7FE0BC}.pvdlg .pvs.bad{color:#FF9C8C}.pvdlg .pvs.wait{color:var(--ink3,#8a8d98)}.pvdlg .pvu{font-size:.7rem;color:var(--ink3,#8a8d98);word-break:break-all}.pvdlg .pvnone{padding:28px 8px;text-align:center;border:1px dashed var(--line,#444);border-radius:6px;color:var(--ink3,#8a8d98);font-size:.82rem}';
    d.appendChild(st); var w = document.createElement('div'); w.className = 'pvw'; d.appendChild(w); document.body.appendChild(d);
    d.addEventListener('close', pvStop);
    d.addEventListener('click', function (e) {
      if (e.target === d) { d.close(); return; } // 바깥(배경) 누르면 닫기
      var b = e.target.closest('[data-pvgo]'); if (b) { pvGo(+b.dataset.pvgo); return; }
      if (e.target.closest('[data-pvx]')) d.close();
    });
    d.addEventListener('change', function (e) { if (e.target.matches('[data-pvpub]')) { PV.pub = e.target.checked; pvDraw(); } });
    d.addEventListener('keydown', function (e) { if (/^(VIDEO|INPUT)$/.test(e.target.tagName)) return; if (e.key === 'ArrowLeft') { pvGo(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { pvGo(1); e.preventDefault(); } });
    return (PV.dlg = d);
  }
  function pvGo(n) { var j = PV.i + n; if (j < 0 || j >= PV.items.length) return; pvStop(); PV.i = j; PV.focus = ''; pvDraw(); }
  function pvOpen(items, i, focus) { var d = pvEnsure(); PV.items = items; PV.i = i; PV.focus = focus || ''; pvDraw(); if (!d.open) d.showModal(); }
  function pvDraw() {
    var d = PV.dlg, w = $('.pvw', d), it = pvItem(); if (!it) return; var v = it.v, n = PV.items.length;
    var h = '<div class="pvh"><b style="color:var(--gold);font-size:1.05rem">' + it.label + '</b>' + (n > 1 ? '<span class="muted">' + (PV.i + 1) + ' / ' + n + '</span>' : '') + (v.enabled === false ? '<span class="chip no">사용 안 함</span>' : '') + (I.dirty ? '<span class="muted" style="font-size:.76rem">저장 전 변경 있음 — 방금 올린 파일도 여기서 확인할 수 있습니다</span>' : '') + '<span style="flex:1"></span>' +
      (I.base ? '<label class="muted" style="display:flex;gap:4px;align-items:center;font-size:.8rem" title="방문자는 공개 기본 주소(R2)로 받습니다"><input type="checkbox" data-pvpub' + (PV.pub ? ' checked' : '') + '> 공개 주소로 확인</label>' : '') +
      (n > 1 ? '<button type="button" data-pvgo="-1"' + (PV.i ? '' : ' disabled') + '>‹ 이전</button><button type="button" data-pvgo="1"' + (PV.i < n - 1 ? '' : ' disabled') + '>다음 ›</button>' : '') + '<button type="button" data-pvx>닫기</button></div><div class="pvg">';
    PVF.forEach(function (f) {
      var u = v[f[0]];
      h += '<div class="pvc' + (PV.focus === f[0] ? ' focus' : '') + '" data-pvc="' + f[0] + '"><b>' + f[1] + '</b>';
      if (!u) h += '<div class="pvnone">올린 파일 없음</div>';
      else { var s = esc(pvSrc(u)); h += (f[2] === 'img' ? '<img alt="" src="' + s + '">' : '<video controls muted playsinline preload="metadata" src="' + s + '"></video>') + '<div class="pvs wait" data-pvs>불러오는 중…</div><div class="pvu">' + s + '</div>'; }
      h += '</div>';
    });
    w.innerHTML = h + '</div><p class="muted" style="margin:0;font-size:.76rem">←/→ 키로 이전·다음 항목, Esc 로 닫기. 영상은 이 창에서만 불러오고 닫으면 내려받기를 멈춥니다.</p>';
    PVF.forEach(function (f) {
      var c = $('[data-pvc="' + f[0] + '"]', w), el = c && $('img,video', c), st = c && $('[data-pvs]', c); if (!el) return;
      var url = el.getAttribute('src'), pr = probe(url), media = null, err = false;
      var show = function () {
        pr.then(function (p) {
          var info = p && p.ok ? mb(p.size) + (p.type ? ' · ' + p.type : '') : '';
          if (err) {
            var why = !p || p.ok === null ? '주소에 접근할 수 없습니다' : !p.ok ? (p.status === 404 ? '파일이 저장소에 없습니다 (404)' : '서버 응답 ' + p.status) : f[2] === 'img' ? '이미지 형식을 읽을 수 없습니다' : '이 브라우저에서 재생할 수 없는 형식입니다 (코덱 확인)';
            el.style.display = 'none'; st.className = 'pvs bad'; st.textContent = '✕ 불러오기 실패 — ' + why + (info ? ' · ' + info : '');
          } else if (media) { st.className = 'pvs ok'; st.textContent = '✓ ' + media + (info ? ' · ' + info : ''); }
        });
      };
      if (f[2] === 'img') { el.onload = function () { media = el.naturalWidth + '×' + el.naturalHeight; show(); }; el.onerror = function () { err = true; show(); }; if (el.complete && el.naturalWidth) el.onload(); }
      else { el.muted = true; el.onloadedmetadata = function () { media = (el.videoWidth ? el.videoWidth + '×' + el.videoHeight + ' · ' : '소리만 · ') + (isFinite(el.duration) ? el.duration.toFixed(1) + '초' : '길이 알 수 없음'); show(); }; el.onerror = function () { if (!el.getAttribute('src')) return; err = true; show(); }; }
    });
    var fc = PV.focus && $('[data-pvc="' + PV.focus + '"]', w); if (fc && fc.scrollIntoView) fc.scrollIntoView({ block: 'nearest' });
  }


  // ───────── CSV ─────────
  var HEAD = ['구분', '키', '성별', '제목', '부제', '키워드', '사용', 'MP4', 'WebM', '포스터'];
  function csvCell(s) { s = String(s == null ? '' : s).replace(/\n/g, '\\n'); return /[",\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csvOut() {
    var out = [HEAD.join(',')]; ['ilgan', 'iju'].forEach(function (kind) { rowsOf(kind).forEach(function (r) { var v = recOf(r) || {}; out.push([kind === 'ilgan' ? '일간' : '일주', r.id, GK[r.g], v.title || '', v.subtitle || '', (v.keywords || []).join(';'), v.enabled === false ? 'N' : 'Y', v.videoUrl || '', v.videoWebm || '', v.posterUrl || ''].map(csvCell).join(',')); }); });
    var blob = new Blob(['﻿' + out.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '일간일주_소개.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false; text = String(text).replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) { var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
    if (cur || row.length) { row.push(cur); rows.push(row); } return rows;
  }
  function csvIn(file) {
    if (!file) return; var rd = new FileReader(); rd.onload = function () {
      var rows = parseCsv(rd.result); if (rows.length < 2) { C.toast('내용이 없습니다', true); return; } var H = rows[0].map(function (x) { return x.trim(); }), ix = function (n) { return H.indexOf(n); }; if (ix('구분') < 0 || ix('키') < 0 || ix('성별') < 0) { C.toast('머리글(구분·키·성별 …)이 맞지 않습니다. "CSV 내려받기" 파일을 고쳐서 올려 주세요', true); return; }
      snapshot(); var n = 0, bad = 0, M = R.Media;
      rows.slice(1).forEach(function (c) {
        var kind = /일간/.test(c[ix('구분')] || '') ? 'ilgan' : /일주/.test(c[ix('구분')] || '') ? 'iju' : null, g = M.normGender(c[ix('성별')]), id = kind === 'ilgan' ? M.normStem(c[ix('키')]) : kind === 'iju' ? M.normPillar(c[ix('키')]) : null;
        if (!kind || !id || !g) { if (c.join('').trim()) bad++; return; } var v = ensure({ kind: kind, id: id, g: g }), get = function (name) { var i = ix(name); return i < 0 ? null : (c[i] || ''); };
        var T = get('제목'), S = get('부제'), K = get('키워드'), E = get('사용'), V1 = get('MP4'), V2 = get('WebM'), P = get('포스터');
        if (T != null) v.title = T.slice(0, 60); if (S != null) v.subtitle = S.replace(/\\n/g, '\n').slice(0, 200); if (K != null) v.keywords = K.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8);
        if (E) v.enabled = !/^(n|no|아니|0|false|해제)/i.test(E.trim()); if (V1) v.videoUrl = V1.trim(); if (V2) v.videoWebm = V2.trim(); if (P) v.posterUrl = P.trim(); n++;
      });
      dirty(true); draw(true); C.toast('CSV에서 ' + n + '개 항목을 읽었습니다' + (bad ? ' (해석 불가 ' + bad + '줄)' : '') + ' — 저장을 눌러 반영하세요');
    }; rd.readAsText(file, 'utf-8');
  }

(window.AdminDirty = window.AdminDirty || {})['일간·일주 소개'] = function () { return I.dirty; }; window.V2Intro = { mount: mount, reload: function () { I.loaded = false; }, isDirty: function () { return I.dirty; }, state: I };
})();
